"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Object3D, type PerspectiveCamera } from "three";
import {
  WALL_H,
  WALL_M,
  boxesOverlap,
  clearanceBox,
  houseBounds,
  openingV,
  solidRuns,
  type GeomOpening,
  type GeomRoom,
  type WallSegment,
} from "@/geometry";
import { PLINTH_H, STOREY_H, houseSiting, typicalPlot, windowSeat } from "@/geometry/exterior";
import { useDict } from "@/i18n/client";
import type { HouseType } from "@/lib/schemas";
import { LIGHT, SHADOW, WALK_LENS, sunPosition, walkVfov } from "./materials";
import { PIECES } from "./furniture";
import {
  PostFX,
  SHADOW_MAP,
  SkyEnvironment,
  StudioEnvironment,
  dprFor,
  glProps,
  useLowPower,
} from "./look";
import { extrudeWall, wallShapes } from "./wallShapes";
import {
  useFabricKit,
  useIndoorKit,
  useOutdoorKit,
  type FabricKit,
  type IndoorKit,
} from "./surfaces";
import {
  Builder,
  buildCarport,
  buildOpeningTrim,
  buildSite,
  buildWindowSeat,
  curtainGeometry,
  metricBox,
} from "./house/build";
import { PartsMeshes, useParts } from "./house/Parts";
import { Vegetation } from "./house/Vegetation";
import {
  entryStand,
  houseWallSegments,
  roomAt,
  roomStand,
  wallColliders,
  type Obstacle,
  type Stand,
} from "./walkGeometry";

/* โหมดเดินดูในบ้าน — ผนัง ประตู หน้าต่าง และเฟอร์นิเจอร์ มาจาก geometry ชุดเดียวกับ 2D/Isometric
   ต่างกันแค่: ผนังเต็มสูงทุกด้าน มีฝ้า และกล้องเป็น Perspective ที่ระดับสายตา 1.6 ม.

   แสง (§5): แดดดวงเดียวส่องผ่านช่องหน้าต่างจริง (ฝ้าบังแดด) + แสงอ้อมจาก Lightformer + AO
   ไม่มีไฟจุดใต้ฝ้าอีกแล้ว — ตัวนั้นคือวงสว่างกลางเพดานในภาพเดิม
   frameloop="demand": ยืนนิ่ง = ไม่วาด · ขยับเมื่อไรค่อยวาดต่อเนื่อง */

const EYE_H = WALK_LENS.eyeH;
/** แสงอ้อมในบ้าน (Lightformer) — ค่าที่จูนไว้เดิม 0.85 × 1.3 ไม่ผูกกับแสงอ้อมนอกบ้าน */
const INTERIOR_ENV = 1.1;
const SPEED = 1.5; // เมตรต่อวินาที
const BODY_R = 0.28;
const LOOK_SENSITIVITY = 0.0022;
/** มองขึ้นลงได้ไม่เกิน ~40° — เกินนี้ภาพกลายเป็นเพดานหรือพื้นล้วน ไม่ได้ข้อมูลห้องเพิ่ม */
const PITCH_LIMIT = 0.7;
const FLOOR_TOP = 0.04;
const SKIRT_H = 0.08;
const SKIRT_T = 0.012;

type Move = { x: number; z: number };
type Look = { yaw: number; pitch: number };

/* ── กล้อง ─────────────────────────────────────────────────── */

/* เลนส์: 48° แนวตั้งบนจอแนวนอน (≈ 27 มม.) · จอแนวตั้งตรึงมุมแนวนอน (walkVfov)
   lens shift เลื่อนกรอบภาพลง 8% แทนการก้มกล้อง — เส้นตั้งของผนังยังตั้งตรง พื้นได้พื้นที่มากกว่าฝ้า */
function Lens() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.fov = walkVfov(size.width / size.height);
    camera.setViewOffset(
      size.width,
      size.height,
      0,
      size.height * WALK_LENS.lensShift,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

function Controller({
  rooms,
  openings,
  move,
  look,
  teleport,
  onRoom,
  pump,
}: {
  rooms: GeomRoom[];
  openings: GeomOpening[];
  move: RefObject<Move>;
  look: RefObject<Look>;
  teleport: RefObject<Stand | null>;
  onRoom: (id: string | null) => void;
  pump: RefObject<() => void>;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const colliders = useMemo(
    () => wallColliders(houseWallSegments(rooms, openings)),
    [rooms, openings],
  );
  const limits = useMemo(() => {
    const b = houseBounds(rooms, true);
    return { x0: b.x0 - 0.3, z0: b.z0 - 0.3, x1: b.x1 + 0.3, z1: b.z1 + 0.3 };
  }, [rooms]);
  const lastRoom = useRef<string | null | undefined>(undefined);

  /* ให้ input ฝั่ง DOM ปลุกการวาดได้ — frameloop demand ไม่วาดเองถ้าไม่มีใครขอ */
  useEffect(() => {
    pump.current = invalidate;
  }, [pump, invalidate]);

  const blocked = (x: number, z: number) =>
    colliders.some(
      (r) => x > r.x0 - BODY_R && x < r.x1 + BODY_R && z > r.z0 - BODY_R && z < r.z1 + BODY_R,
    );

  useFrame((_, delta) => {
    const jump = teleport.current;
    if (jump) {
      camera.position.set(jump.x, EYE_H, jump.z);
      look.current.yaw = jump.yaw;
      look.current.pitch = 0;
      teleport.current = null;
    }

    const l = look.current;
    /* ตั้งทั้งสามแกนพร้อมกัน — กัน roll ค้างจากค่าเดิมของกล้อง */
    camera.rotation.set(l.pitch, l.yaw, 0, "YXZ");

    const m = move.current;
    const len = Math.hypot(m.x, m.z);
    if (len >= 0.01) {
      const step = Math.min(delta, 0.05) * SPEED;
      const nx = m.x / len;
      const nz = m.z / len;
      /* ที่ yaw ปัจจุบัน: หน้า = (-sin, -cos) · ขวา = (cos, -sin)
         W ให้ nz = -1 จึงต้องคูณหน้าด้วย -nz ไม่ใช่ nz */
      const sin = Math.sin(l.yaw);
      const cos = Math.cos(l.yaw);
      const dx = (nx * cos + nz * sin) * step;
      const dz = (-nx * sin + nz * cos) * step;

      const tryX = camera.position.x + dx;
      if (!blocked(tryX, camera.position.z) && tryX > limits.x0 && tryX < limits.x1) {
        camera.position.x = tryX;
      }
      const tryZ = camera.position.z + dz;
      if (!blocked(camera.position.x, tryZ) && tryZ > limits.z0 && tryZ < limits.z1) {
        camera.position.z = tryZ;
      }
      /* ยังเดินอยู่ = ขอเฟรมถัดไป */
      invalidate();
    }
    camera.position.y = EYE_H;

    const here = roomAt(rooms, camera.position.x, camera.position.z)?.id ?? null;
    if (here !== lastRoom.current) {
      lastRoom.current = here;
      onRoom(here);
    }
  });

  return null;
}

/* ── แสง ───────────────────────────────────────────────────── */

/* แดดดวงเดียว กรอบเงาแคบพอดีบ้านชั้นนี้ (เมตรต่อ texel ต่ำ = ขอบเงานุ่มแต่คม) */
function Sun({
  rooms,
  hour,
  northDeg,
  low,
  reach,
}: {
  rooms: GeomRoom[];
  hour: number;
  northDeg: number;
  low: boolean;
  /** กรอบที่ต้องมีเงา (ทั้งแปลง: ต้นไม้นอกบ้านทอดเงาผ่านหน้าต่างเข้ามา) */
  reach?: { x0: number; z0: number; x1: number; z1: number };
}) {
  const b = reach ?? houseBounds(rooms, true);
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const span = Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2 + 1;
  const [dx, dy, dz] = sunPosition(hour, 1, northDeg);
  const dist = span + 12;
  const target = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    target.position.set(cx, 0, cz);
    target.updateMatrixWorld();
  }, [target, cx, cz]);
  const map = low ? SHADOW.mapMobile : SHADOW.mapDesktop;
  return (
    <directionalLight
      color={LIGHT.sun}
      intensity={LIGHT.sunIntensity * 1.4}
      position={[cx + dx * dist, dy * dist, cz + dz * dist]}
      target={target}
      castShadow
      shadow-mapSize-width={map}
      shadow-mapSize-height={map}
      shadow-camera-near={0.5}
      shadow-camera-far={dist + span + 6}
      shadow-camera-left={-span}
      shadow-camera-right={span}
      shadow-camera-top={span}
      shadow-camera-bottom={-span}
      shadow-radius={SHADOW.radius}
      shadow-blurSamples={SHADOW.blurSamples}
      shadow-normalBias={SHADOW.normalBias}
    />
  );
}

/* ── สถาปัตยกรรม ───────────────────────────────────────────── */

function Walls({ segments, inner }: { segments: WallSegment[]; inner: IndoorKit }) {
  const meshes = useMemo(
    () =>
      segments.flatMap((seg) => {
        const { shapes } = wallShapes(seg, WALL_H);
        if (shapes.length === 0) return [];
        const geometry = extrudeWall(shapes);
        const place =
          seg.axis === "z"
            ? { position: [seg.at + WALL_M / 2, 0, seg.from] as const, rotY: -Math.PI / 2 }
            : { position: [seg.from, 0, seg.at - WALL_M / 2] as const, rotY: 0 };
        return [{ id: seg.id, geometry, place }];
      }),
    [segments],
  );

  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  /* ปูนทาสีขาวอุ่นมีผิวฉาบบางๆ (normal map) — ทั้งสองหน้าผนัง */
  return (
    <group>
      {meshes.map((m) => (
        <mesh
          key={m.id}
          geometry={m.geometry}
          material={inner.plaster}
          position={m.place.position}
          rotation={[0, m.place.rotY, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

/* บัวเชิงผนังไม้โอ๊ก: วิ่งตามช่วงผนังทึบ (solidRuns ของ geometry) เว้นช่องประตู ติดเฉพาะด้านที่เป็นห้องในบ้าน
   วงกบอะลูมิเนียมขาว + กระจกบาง รอบหน้าต่างและประตูทางเข้า (buildOpeningTrim — ตัวเดียวกับ diorama)
   ขอบหน้าต่างหินขาว · ม่านโปร่งสองผืนข้างหน้าต่างทุกบานของผนังนอก */
type TrimKey = "oak" | "frame" | "pane" | "sill";
function Trim({
  segments,
  rooms,
  inner,
  fabric,
  white,
}: {
  segments: WallSegment[];
  rooms: GeomRoom[];
  inner: IndoorKit;
  fabric: FabricKit;
  white: IndoorKit["ceiling"];
}) {
  const indoor = useMemo(() => new Set(rooms.filter((r) => !r.outdoor).map((r) => r.id)), [rooms]);
  const parts = useParts(() => {
    const b = new Builder<TrimKey>();
    const y0 = FLOOR_TOP;
    for (const seg of segments) {
      buildOpeningTrim(b, seg, { frame: "frame", pane: "pane" });
      const walkable = { ...seg, openings: seg.openings.filter((o) => o.kind !== "window") };
      const off = WALL_M / 2;
      for (const run of solidRuns(walkable)) {
        for (const side of [-1, 1] as const) {
          const room = side < 0 ? seg.roomMinus : seg.roomPlus;
          if (!room || !indoor.has(room)) continue;
          const a = seg.at + side * off;
          const c = seg.at + side * (off + SKIRT_T);
          if (seg.axis === "x")
            b.box("oak", run.from, y0, Math.min(a, c), run.to, y0 + SKIRT_H, Math.max(a, c));
          else b.box("oak", Math.min(a, c), y0, run.from, Math.max(a, c), y0 + SKIRT_H, run.to);
        }
      }
      for (const o of seg.openings) {
        if (o.kind !== "window") continue;
        const sill = openingV(o).sill;
        /* บานกระจกสูงจากพื้นไม่มีบัวหน้าต่าง */
        if (sill < 0.3) continue;
        const d = WALL_M / 2 + 0.05;
        if (seg.axis === "x")
          b.box("sill", o.from - 0.05, sill - 0.03, seg.at - d, o.to + 0.05, sill, seg.at + d);
        else b.box("sill", seg.at - d, sill - 0.03, o.from - 0.05, seg.at + d, sill, o.to + 0.05);
      }
    }
    return b.build();
  }, [segments, indoor]);
  const curtains = useMemo(() => curtainGeometry(segments, indoor), [segments, indoor]);
  useEffect(
    () => () => {
      curtains.cloth?.dispose();
      curtains.rods.forEach((g) => g.dispose());
    },
    [curtains],
  );
  const mats = useMemo(
    () => ({ oak: inner.oak, frame: white, pane: fabric.pane, sill: white }),
    [inner, fabric, white],
  );
  const rodMats = useMemo(() => ({ rod: white }), [white]);
  return (
    <group>
      <PartsMeshes parts={parts} kit={mats} />
      <PartsMeshes parts={curtains.rods} kit={rodMats} />
      {curtains.cloth && (
        <mesh geometry={curtains.cloth} material={fabric.sheer} receiveShadow castShadow={false} />
      )}
    </group>
  );
}

function Ceiling({ rooms, material }: { rooms: GeomRoom[]; material: IndoorKit["ceiling"] }) {
  /* ฝ้าเป็นกล่องหนา ไม่ใช่ระนาบ — ต้องบังแดดจริง แดดจึงเข้าบ้านได้ทางหน้าต่างเท่านั้น */
  const b = houseBounds(rooms);
  return (
    <mesh
      position={[(b.x0 + b.x1) / 2, WALL_H + 0.06, (b.z0 + b.z1) / 2]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[b.x1 - b.x0 + 0.3, 0.12, b.z1 - b.z0 + 0.3]} />
    </mesh>
  );
}

/* สวนรอบบ้านที่เห็นผ่านหน้าต่าง — ผังที่ตั้งเดียวกับ diorama (แปลงมาตรฐานของแบบ)
   ชั้นบนมองลงไปเห็นสวนต่ำลงไปหนึ่งชั้น */
function Garden({ house, floor, low }: { house: HouseType; floor: number; low: boolean }) {
  const kit = useOutdoorKit(low);
  const site = useMemo(() => houseSiting(house, typicalPlot(house)), [house]);
  const parts = useParts(() => {
    const b = new Builder();
    buildSite(b, site, { lawn: true, deck: true });
    if (site.carport) buildCarport(b, site.carport);
    const p = site.plot;
    /* สนามนอกแปลง: เพื่อนบ้านไกลๆ เป็นพื้นหญ้าต่อเนื่องถึงขอบฟ้า ไม่ใช่ขอบโต๊ะ */
    b.box("lawn", p.x0 - 40, -PLINTH_H - 0.12, p.z0 - 40, p.x1 + 40, -PLINTH_H - 0.065, p.z1 + 40);
    return b.build();
  }, [site]);
  const plants = useMemo(
    () => ({
      trees: site.trees.map((t) => ({ ...t, y: -PLINTH_H })),
      shrubs: site.shrubs.map((sh) => ({ ...sh, y: -PLINTH_H })),
    }),
    [site],
  );
  return (
    <group position={[0, -(floor - 1) * STOREY_H, 0]}>
      <PartsMeshes parts={parts} kit={kit} />
      <Vegetation trees={plants.trees} shrubs={plants.shrubs} kit={kit} />
    </group>
  );
}

/* พื้นห้อง: ไม้ลามิเนตโอ๊กอ่อน (texture) — แผ่นเดียวต่อห้อง UV เป็นเมตร ลายแผ่นไม้ต่อเนื่องข้ามห้อง */
function Floors({ rooms, inner }: { rooms: GeomRoom[]; inner: IndoorKit }) {
  const geos = useMemo(
    () =>
      rooms.flatMap((r) => {
        const g = metricBox(r.x0, 0, r.z0, r.x1, FLOOR_TOP, r.z1);
        return g ? [{ id: r.id, g, outdoor: r.outdoor }] : [];
      }),
    [rooms],
  );
  useEffect(() => () => geos.forEach((x) => x.g.dispose()), [geos]);
  return (
    <group>
      {geos.map((x) => (
        <mesh
          key={x.id}
          geometry={x.g}
          material={x.outdoor ? inner.oak : inner.floor}
          receiveShadow
        />
      ))}
    </group>
  );
}

/* ที่นั่งริมหน้าต่างบิวท์อิน — ตำแหน่งจาก windowSeat() (geometry) */
function Seat({
  seat,
  inner,
  fabric,
}: {
  seat: NonNullable<ReturnType<typeof windowSeat>>;
  inner: IndoorKit;
  fabric: FabricKit;
}) {
  const parts = useParts(() => {
    const b = new Builder<"wood" | "cushion">();
    buildWindowSeat(b, seat, { wood: "wood", cushion: "cushion" });
    return b.build();
  }, [seat]);
  const mats = useMemo(() => ({ wood: inner.oak, cushion: fabric.cushion }), [inner, fabric]);
  return <PartsMeshes parts={parts} kit={mats} />;
}

/* ทุกอย่างที่ต้องรอ texture — อยู่ใน Suspense ของตัวเอง แผงควบคุมกับกล้องทำงานได้ก่อน */
function Interior({
  house,
  floor,
  rooms,
  segments,
  seat,
  low,
}: {
  house: HouseType;
  floor: number;
  rooms: GeomRoom[];
  segments: WallSegment[];
  seat: ReturnType<typeof windowSeat>;
  low: boolean;
}) {
  const inner = useIndoorKit(low);
  const fabric = useFabricKit(low);
  const furniture = useMemo(
    () => house.furniture.filter((f) => rooms.some((r) => r.id === f.roomId)),
    [house.furniture, rooms],
  );
  return (
    <group>
      <Walls segments={segments} inner={inner} />
      <Ceiling rooms={rooms} material={inner.ceiling} />
      <Floors rooms={rooms} inner={inner} />
      <Trim segments={segments} rooms={rooms} inner={inner} fabric={fabric} white={inner.ceiling} />
      {seat && <Seat seat={seat} inner={inner} fabric={fabric} />}
      {furniture.map((f) => {
        const Piece = PIECES[f.kind];
        return (
          <group key={f.id} position={[f.x, FLOOR_TOP, f.z]}>
            <Piece w={f.w} d={f.d} h={f.h} facing={f.facing} tone={f.tone} />
          </group>
        );
      })}
      <Garden house={house} floor={floor} low={low} />
    </group>
  );
}

/* ── ป้ายบอกทาง ────────────────────────────────────────────── */

/* รายการห้องของชั้นนี้ (ชื่อจาก data ของแบบบ้าน) — ไฮไลต์ห้องที่ยืนอยู่
   กดชื่อห้อง = ไปยืนที่ประตูห้องนั้น · ประกาศชื่อห้องใหม่ให้ screen reader ทุกครั้งที่เดินข้ามห้อง
   มือถือย่อเหลือชื่อห้องปัจจุบันบรรทัดเดียว กดเพื่อกางรายการ */
function RoomRail({
  rooms,
  current,
  floor,
  compact,
  onGo,
}: {
  rooms: GeomRoom[];
  current: string | null;
  floor: number;
  compact: boolean;
  onGo: (room: GeomRoom) => void;
}) {
  const [open, setOpen] = useState(!compact);
  const here = rooms.find((r) => r.id === current) ?? null;
  const listId = `walk-rooms-${floor}`;
  const t = useDict();
  return (
    <nav
      aria-label={t.scene.walk.rooms(floor)}
      className="border-concrete bg-paper rounded-card absolute top-4 left-4 w-48 border p-2"
    >
      <p className="sr-only" aria-live="polite">
        {here ? t.scene.walk.here(here.name) : ""}
      </p>
      {compact && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="rounded-control text-15 text-ironwood focus-visible:outline-pine flex h-10 w-full items-center justify-between px-2 font-medium focus-visible:outline-2"
        >
          <span>{here?.name ?? t.common.floor(floor)}</span>
          <span className="text-13 text-moss">{open ? t.scene.walk.hide : t.scene.walk.all}</span>
        </button>
      )}
      {!compact && <p className="text-13 text-moss px-2 pt-1 pb-1.5">{t.common.floor(floor)}</p>}
      <ol id={listId} hidden={!open} className="flex flex-col">
        {rooms.map((r) => {
          const on = r.id === current;
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-current={on ? "location" : undefined}
                onClick={() => onGo(r)}
                className={`rounded-control text-15 focus-visible:outline-pine flex min-h-9 w-full items-center gap-2 px-2 text-left focus-visible:outline-2 ${
                  on ? "text-ironwood bg-canvas font-semibold" : "text-moss hover:text-ironwood"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 ${on ? "bg-marigold" : "bg-concrete"}`}
                />
                {r.name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Joystick({ move, pump }: { move: RefObject<Move>; pump: RefObject<() => void> }) {
  const t = useDict();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.min(Math.hypot(dx, dy), max) || 0;
    const ux = len === 0 ? 0 : (dx / Math.hypot(dx, dy)) * (len / max);
    const uy = len === 0 ? 0 : (dy / Math.hypot(dx, dy)) * (len / max);
    setKnob({ x: ux * max * 0.6, y: uy * max * 0.6 });
    move.current = { x: ux, z: uy };
    pump.current();
  };

  const reset = () => {
    setKnob({ x: 0, y: 0 });
    move.current = { x: 0, z: 0 };
  };

  return (
    <div
      ref={base}
      aria-label={t.scene.walk.joystick}
      className="border-concrete bg-paper/80 absolute bottom-5 left-5 h-28 w-28 touch-none rounded-full border"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div
        className="bg-pine absolute top-1/2 left-1/2 h-12 w-12 rounded-full"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

export function WalkthroughScene({
  house,
  floor = 1,
  sunHour = 15,
  onExit,
}: {
  house: HouseType;
  floor?: number;
  sunHour?: number;
  onExit?: () => void;
}) {
  const t = useDict();
  const low = useLowPower();
  /* เดินดูทีละชั้น — ขึ้นชั้นด้วยปุ่มเลือกชั้น ไม่ได้เดินขึ้นบันไดจริง */
  const rooms = useMemo(
    () => house.rooms.filter((r) => (r.floor ?? 1) === floor),
    [house.rooms, floor],
  );
  const openings = useMemo(
    () => house.openings.filter((o) => (o.floor ?? 1) === floor),
    [house.openings, floor],
  );
  const furniture = useMemo(
    () => house.furniture.filter((f) => rooms.some((r) => r.id === f.roomId)),
    [house.furniture, rooms],
  );
  const segments = useMemo(() => houseWallSegments(rooms, openings), [rooms, openings]);
  /* ที่นั่งริมหน้าต่าง (ชั้นล่าง) — คำนวณจากหน้าต่างจริง ไม่ทับเฟอร์นิเจอร์ ไม่ขวางประตู */
  const seat = useMemo(
    () =>
      floor === 1
        ? windowSeat(house.rooms, house.openings, house.furniture, boxesOverlap, clearanceBox)
        : null,
    [floor, house.rooms, house.openings, house.furniture],
  );
  /* สิ่งที่ยืนทับไม่ได้ — เฟอร์นิเจอร์ (ยกเว้นพรมกับกรอบรูป) และที่นั่งริมหน้าต่าง */
  const obstacles = useMemo<Obstacle[]>(
    () => [
      ...furniture
        .filter((f) => f.kind !== "rug" && f.kind !== "frame")
        .map((f) => ({
          x0: f.x - f.w / 2,
          x1: f.x + f.w / 2,
          z0: f.z - f.d / 2,
          z1: f.z + f.d / 2,
        })),
      ...(seat ? [{ x0: seat.x0, z0: seat.z0, x1: seat.x1, z1: seat.z1 }] : []),
    ],
    [furniture, seat],
  );
  const plotReach = useMemo(() => houseSiting(house, typicalPlot(house)).plot, [house]);
  const start = useMemo(() => entryStand(rooms, openings, obstacles), [rooms, openings, obstacles]);
  const move = useRef<Move>({ x: 0, z: 0 });
  const look = useRef<Look>({ yaw: start.yaw, pitch: 0 });
  const teleport = useRef<Stand | null>(null);
  const pump = useRef<() => void>(() => {});
  const [here, setHere] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [coarse, setCoarse] = useState(false);
  /* กรอบเตี้ย (หน้าแบบบ้านบนจอโน้ตบุ๊ก) รายการห้องเต็มชุดจะบังภาพครึ่งซ้าย — ย่อเหลือบรรทัดเดียว */
  const [short, setShort] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setShort(el.clientHeight < 600);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => setCoarse(window.matchMedia("(pointer: coarse)").matches), []);

  useEffect(() => {
    const keys = new Map<string, [number, number]>([
      ["KeyW", [0, -1]],
      ["ArrowUp", [0, -1]],
      ["KeyS", [0, 1]],
      ["ArrowDown", [0, 1]],
      ["KeyA", [-1, 0]],
      ["ArrowLeft", [-1, 0]],
      ["KeyD", [1, 0]],
      ["ArrowRight", [1, 0]],
    ]);
    const held = new Set<string>();
    const apply = () => {
      let x = 0;
      let z = 0;
      for (const code of held) {
        const v = keys.get(code);
        if (v) {
          x += v[0];
          z += v[1];
        }
      }
      move.current = { x, z };
      pump.current();
    };
    const down = (e: KeyboardEvent) => {
      if (!keys.has(e.code)) return;
      /* ปุ่มในรายการห้องและปุ่มออกใช้ลูกศร/Enter ของมันเอง ไม่ใช่สั่งเดิน */
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input")) return;
      held.add(e.code);
      apply();
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
      apply();
    };
    const onLock = () => setLocked(document.pointerLockElement !== null);
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement === null) return;
      look.current.yaw -= e.movementX * LOOK_SENSITIVITY;
      look.current.pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, look.current.pitch - e.movementY * LOOK_SENSITIVITY),
      );
      pump.current();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMouse);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMouse);
    };
  }, []);

  const goTo = (room: GeomRoom) => {
    teleport.current = roomStand(room, openings, obstacles);
    pump.current();
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none">
      <Canvas
        frameloop="demand"
        shadows={SHADOW_MAP}
        dpr={dprFor(low)}
        gl={glProps}
        camera={{
          position: [start.x, EYE_H, start.z],
          fov: WALK_LENS.vfovLandscape,
          near: 0.05,
          far: 120,
        }}
        onPointerDown={(e) => {
          if (coarse) {
            dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            return;
          }
          /* Chrome คืน Promise ที่ล้มได้ (iframe, เอกสารไม่ active) — ไม่ได้ล็อกก็ยังลากมองได้ */
          void (e.target as HTMLCanvasElement).requestPointerLock?.()?.catch(() => {});
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!coarse || !d || d.id !== e.pointerId) return;
          look.current.yaw -= (e.clientX - d.x) * LOOK_SENSITIVITY * 1.6;
          look.current.pitch = Math.max(
            -PITCH_LIMIT,
            Math.min(PITCH_LIMIT, look.current.pitch - (e.clientY - d.y) * LOOK_SENSITIVITY * 1.6),
          );
          dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          pump.current();
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
      >
        <Lens />

        {/* §5 — แสงอ้อมในบ้านจาก Lightformer อุ่น (แรงกว่า iso เพราะแดดเข้าได้แค่ทางหน้าต่าง)
            ฟ้า HDRI เป็นพื้นหลังอย่างเดียว: เห็นฟ้าจริงนอกหน้าต่าง โหมดมืดของหน้าไม่ทำให้หน้าต่างดำ
            + hemisphere + แดดดวงเดียว ทอดเงาต้นไม้ในสวนผ่านหน้าต่างเข้ามา */}
        <StudioEnvironment low={low} intensity={INTERIOR_ENV} interior />
        <hemisphereLight
          color={LIGHT.hemiSky}
          groundColor={LIGHT.hemiSky}
          intensity={LIGHT.hemiIntensity}
        />
        <Sun rooms={rooms} hour={sunHour} northDeg={house.northDeg} low={low} reach={plotReach} />

        <Suspense fallback={null}>
          <SkyEnvironment low={low} background="only" />
          <Interior
            house={house}
            floor={floor}
            rooms={rooms}
            segments={segments}
            seat={seat}
            low={low}
          />
        </Suspense>

        <PostFX low={low} aoRadius={0.5} aoIntensity={2.2} />

        <Controller
          rooms={rooms}
          openings={openings}
          move={move}
          look={look}
          teleport={teleport}
          onRoom={setHere}
          pump={pump}
        />
      </Canvas>

      <RoomRail
        key={`${floor}-${coarse || short}`}
        rooms={rooms}
        current={here}
        floor={floor}
        compact={coarse || short}
        onGo={goTo}
      />

      {/* ทางออกที่ไม่ต้องพึ่ง Esc — มือถือไม่มีปุ่มนี้อยู่แล้ว */}
      {onExit && (
        <button
          type="button"
          onClick={() => {
            document.exitPointerLock?.();
            onExit();
          }}
          className="border-concrete bg-paper text-ironwood rounded-control text-13 absolute top-4 right-4 h-10 px-4 font-medium"
        >
          {t.scene.walk.exit}
        </button>
      )}

      {coarse ? (
        <Joystick move={move} pump={pump} />
      ) : (
        !locked && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="border-concrete bg-paper rounded-card text-15 border px-5 py-3 font-medium">
              {t.scene.walk.desktopHint}
            </p>
          </div>
        )
      )}
      {coarse && (
        <p className="text-13 text-moss bg-paper/85 rounded-control absolute right-4 bottom-5 px-3 py-2">
          {t.scene.walk.touchHint}
        </p>
      )}
    </div>
  );
}
