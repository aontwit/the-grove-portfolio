"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Group } from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, MeshStandardMaterial, type BufferGeometry, type Mesh } from "three";
import {
  WALL_H,
  WALL_LOW_H,
  WALL_M,
  houseBounds,
  openingCenter,
  roomArea,
  walls,
  type WallSegment,
} from "@/geometry";
import {
  BOARD_LIP,
  PLINTH_H,
  houseSiting,
  mirrorHouse,
  mirrorLayout,
  partyLine,
  typicalPlot,
  type PlotSize,
} from "@/geometry/exterior";
import type { Furniture, HouseType } from "@/lib/schemas";
import { useGrove, useMood } from "@/lib/store";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useTokenColor } from "@/lib/useTokenColor";
import { LIGHT, M3D } from "./materials";
import { capOf, dropOf, heroScript } from "./heroTimeline";
import { PIECES } from "./furniture";
import { GroundShadow, useLowPower } from "./look";
import { WALL_BEVEL, extrudeWall, wallShapes } from "./wallShapes";
import { useIndoorKit, useOutdoorKit, type IndoorKit, type OutdoorKit } from "./surfaces";
import {
  Builder,
  buildCarport,
  buildOpeningTrim,
  buildRoof,
  buildShell,
  buildSite,
  metricBox,
} from "./house/build";
import { PartsMeshes, useParts } from "./house/Parts";
import {
  MoodPins,
  MoodStudioProvider,
  Picker,
  clothSurface,
  pinSpots,
  useStudioMaterials,
  useStudioPaint,
  type PickFn,
} from "./MoodRig";
import type { MoodSurface } from "./materials";
import { Vegetation } from "./house/Vegetation";

/** ผิวบนของพื้นห้อง — เฟอร์นิเจอร์ทุกชิ้นวางฐานที่ระดับนี้ */
const FLOOR_TOP = 0.04;

/* ยกของที่วางบนพื้นขึ้น 2 มม. — ผิวที่อยู่ระนาบเดียวกันเป๊ะๆ สองชิ้นจะแย่งค่าความลึกกัน
   แล้วขึ้นเป็นเส้นวิบวับตอนหมุนกล้อง (z-fighting) ระยะนี้เล็กกว่าหนึ่งพิกเซลในทุกระดับซูม */
const Z_EPS = 0.002;

/* วางเฟอร์นิเจอร์หนึ่งชิ้นตามกล่องใน data · เงาเปิดให้ทั้งชิ้นในที่เดียว
   แตะหรือชี้ที่เฟอร์นิเจอร์ = ทำงานกับห้องที่มันอยู่ ไม่ใช่เป็นจุดตาย */
function Placed({
  item,
  interactive,
  onPick,
  onHover,
  wallNormal,
  closedRef,
  cloth,
}: {
  item: Furniture;
  interactive: boolean;
  /** mood studio: ผ้าผืนหลักของโซฟา/เตียง/พรม เป็น material ของฉากที่เปลี่ยนสีได้ */
  cloth?: MeshStandardMaterial | undefined;
  onPick: () => void;
  onHover: (roomId: string | null) => void;
  /** ของที่แขวนบนผนังนอก (กรอบรูป) — ทิศที่ผนังนั้นหันออก
      ผนังถูกลดเป็นผนังเตี้ยเมื่อหันเข้ากล้อง ของบนผนังต้องหายไปด้วย ไม่งั้นลอยกลางอากาศ */
  wallNormal?: { x: number; z: number };
  closedRef?: RefObject<number>;
}) {
  const ref = useRef<Group>(null);
  const Piece = PIECES[item.kind];

  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g || !wallNormal) return;
    const len = Math.hypot(camera.position.x, camera.position.z) || 1;
    const dot = (wallNormal.x * camera.position.x + wallNormal.z * camera.position.z) / len;
    g.visible = (closedRef?.current ?? 0) > 0.5 || dot < 0;
  });

  useEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [item]);

  return (
    <group
      ref={ref}
      position={[item.x, FLOOR_TOP + Z_EPS, item.z]}
      userData={cloth ? { surface: clothSurface(item.kind) } : undefined}
      {...(interactive && {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPick();
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(item.roomId);
        },
        onPointerOut: () => onHover(null),
      })}
    >
      <Piece w={item.w} d={item.d} h={item.h} facing={item.facing} tone={item.tone} cloth={cloth} />
    </group>
  );
}

/* ฉาก isometric — extrude จาก walls() ชุดเดียวกับแปลน 2D
   ไม่มีพิกัดผนัง/ประตูเขียนไว้ในไฟล์นี้ ทุกอย่างมาจาก src/geometry */

const half = WALL_M / 2;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type WallInfo = {
  seg: WallSegment;
  /** ห้องที่ผนังชิ้นนี้เป็นของ — ตอนแยกชิ้น ผนังต้องลอยไปกับห้องของมัน ไม่ใช่ค้างกลางอากาศ
      ผนังในที่กั้นสองห้อง ยกให้ฝั่ง roomMinus ฝั่งเดียว อีกห้องจะเปิดด้านนั้นออก
      ซึ่งเป็นธรรมเนียมของภาพ exploded axonometric อยู่แล้ว */
  roomId: string;
  exterior: boolean;
  /** ทิศที่ผนังหันออกนอกบ้าน (เฉพาะผนังนอก) */
  normal: { x: number; z: number };
  accent: boolean;
};

function buildGeometry(seg: WallSegment, height: number) {
  const { shapes, openingIds } = wallShapes(seg, height);
  if (shapes.length === 0) return null;
  /* สันผนังลบมุม 6 มม. — เส้นแสงบนสันคือสิ่งที่แยกโมเดลสถาปนิกออกจากกล่องเกม */
  const geometry: BufferGeometry = extrudeWall(shapes, WALL_BEVEL);
  return { geometry, openingIds };
}

function Wall({
  info,
  reduced,
  closedRef,
  kit,
  inner,
  studio = false,
}: {
  info: WallInfo;
  reduced: boolean;
  /** mood studio: ผนังรับสีที่เลือก (ลงทะเบียน material กับ MoodStudioProvider) และให้ Picker จับได้ */
  studio?: boolean;
  /** >0.5 = บ้านปิดตัวแล้ว ผนังด้านหน้าต้องกลับมาเต็มความสูง
      ตอนกล้องถอยไปอยู่ระดับหมู่บ้าน บ้านหลังนี้ต้องดูเหมือนบ้านทั้งหลังเท่ากับเพื่อนบ้าน
      ไม่ใช่หลังเดียวที่ยังผ่าครึ่งอยู่ */
  closedRef?: RefObject<number>;
  kit: OutdoorKit;
  inner: IndoorKit;
}) {
  const { seg, exterior, normal, accent } = info;
  const fullRef = useRef<Mesh>(null);
  const lowRef = useRef<Mesh>(null);
  const trimRef = useRef<Group>(null);
  /** null = ยังไม่วาดเฟรมแรก — เฟรมแรกวางที่ค่าเป้าหมายเลย ไม่ไล่จากผนังเต็มสูงลงมา (ช่วงนั้นอยู่ใต้ intro loader อยู่แล้ว) */
  const amount = useRef<number | null>(null);

  const full = useMemo(() => buildGeometry(seg, WALL_H), [seg]);
  const low = useMemo(() => (exterior ? buildGeometry(seg, WALL_LOW_H) : null), [seg, exterior]);

  /* ผนังนอก = ปูนฉาบขาวภายนอก · ผนังใน = ปูนทาสีใน · ผนัง accent เขียวหม่นสีเรียบ
     ผนังแต่ละชิ้นจางเองได้ จึงต้องมี material ของตัวเอง (clone ใช้ texture ตัวเดิม ไม่โหลดซ้ำ) */
  const make = useMemo(
    () => () => {
      const m = accent
        ? new MeshStandardMaterial({
            color: M3D.wallAccent,
            roughness: inner.plaster.roughness,
            metalness: 0,
          })
        : (exterior ? kit.render : inner.plaster).clone();
      m.side = DoubleSide;
      return m;
    },
    [accent, exterior, kit, inner],
  );
  const fullMat = useMemo(() => make(), [make]);
  /* ผนังเตี้ยเริ่มที่สถานะ "โปร่ง" ตามที่เฟรมแรกจะตั้งให้ (ผนังเต็มสูงทึบ) — การคอมไพล์ล่วงหน้า (IsoCanvas: Precompile)
     จึงได้ shader ทั้งรุ่นทึบและรุ่นโปร่งของผนังนอกตั้งแต่ก่อนเฟรมแรก ไม่ต้องคอมไพล์ใหม่ตอนผนังเริ่มจางกลางการหมุน */
  const lowMat = useMemo(() => {
    const m = make();
    if (exterior) {
      m.transparent = true;
      m.opacity = 0;
      m.depthWrite = false;
    }
    return m;
  }, [make, exterior]);

  /* วงกบอะลูมิเนียมดำรอบหน้าต่างของผนังนอก (ภาพบ้านจริง) — โผล่เฉพาะตอนผนังเต็มสูง (ผนังเตี้ยไม่มีหน้าต่างให้ใส่) */
  const trim = useParts(() => {
    const b = new Builder<"frameDark">();
    if (exterior) buildOpeningTrim(b, seg, { frame: "frameDark" });
    return b.build();
  }, [seg, exterior]);
  const trimKit = useMemo(() => ({ frameDark: kit.frameDark }), [kit]);

  const paintMats = useMemo(() => [fullMat, lowMat], [fullMat, lowMat]);
  useStudioPaint(accent ? "feature" : "walls", paintMats, exterior);
  /* นอก studio ผนังไม่รับ raycast (ประหยัด) · ใน studio ต้องจับได้ตอนลากวัสดุมาวาง */
  const surface: MoodSurface | undefined = studio ? (accent ? "feature" : "walls") : undefined;
  const pick = studio ? {} : { raycast: () => null };

  useEffect(() => {
    return () => {
      full?.geometry.dispose();
      low?.geometry.dispose();
      fullMat.dispose();
      lowMat.dispose();
    };
  }, [full, low, fullMat, lowMat]);

  useFrame(({ camera, invalidate }) => {
    if (!exterior) return;
    const len = Math.hypot(camera.position.x, camera.position.z) || 1;
    const dot = (normal.x * camera.position.x + normal.z * camera.position.z) / len;
    /* ผนังที่หันเข้าหากล้องบังห้องอยู่ → ไล่ไปเป็นผนังเตี้ย */
    const target = (closedRef?.current ?? 0) > 0.5 ? 1 : 1 - smoothstep(-0.2, 0.2, dot);
    const prev = amount.current ?? target;
    const next = reduced ? target : prev + (target - prev) * 0.15;
    const moving = Math.abs(target - next) > 0.002;
    amount.current = moving ? next : target;

    const a = amount.current;
    fullMat.opacity = a;
    fullMat.transparent = a < 0.999;
    lowMat.opacity = 1 - a;
    lowMat.transparent = a > 0.001;
    /* ระหว่างไล่สลับ ผนังสองชิ้นซ้อนที่เดียวกันและโปร่งใสทั้งคู่ — ถ้ายังเขียน depth buffer
       ชิ้นที่วาดก่อนจะตัดชิ้นหลังทิ้งเป็นเส้นตามรอยต่อ ปิด depthWrite เฉพาะช่วงที่โปร่ง */
    fullMat.depthWrite = !fullMat.transparent;
    lowMat.depthWrite = !lowMat.transparent;
    if (fullRef.current) fullRef.current.visible = a > 0.01;
    if (lowRef.current) lowRef.current.visible = a < 0.99;
    if (trimRef.current) trimRef.current.visible = a > 0.6;
    if (moving) invalidate();
  });

  // ผนังแนว z (x คงที่) หมุนให้ความยาวไปตามแกน z, ความหนาคร่อมเส้น
  const place =
    seg.axis === "z"
      ? { position: [seg.at + half, 0, seg.from] as const, rotation: [0, -Math.PI / 2, 0] as const }
      : { position: [seg.from, 0, seg.at - half] as const, rotation: [0, 0, 0] as const };

  return (
    <>
      {full && (
        <mesh
          ref={fullRef}
          geometry={full.geometry}
          material={fullMat}
          position={place.position}
          rotation={place.rotation}
          castShadow
          receiveShadow
          userData={{ wall: seg.id, openings: full.openingIds, surface }}
          {...pick}
        />
      )}
      {low && (
        <mesh
          ref={lowRef}
          geometry={low.geometry}
          material={lowMat}
          position={place.position}
          rotation={place.rotation}
          castShadow
          receiveShadow
          userData={{ wall: `${seg.id}:low`, openings: low.openingIds, surface }}
          {...pick}
        />
      )}
      {trim.size > 0 && (
        <group ref={trimRef}>
          <PartsMeshes parts={trim} kit={trimKit} />
        </group>
      )}
    </>
  );
}

/* โรงจอดรถของ diorama — ด้านที่หันเข้ากล้องย่อลงเป็นตอเตี้ยแบบเดียวกับผนัง (ไม่งั้นหลังคาบังห้องนั่งเล่น)
   บ้านปิดตัวแล้ว (ฉากเปิดหน้าแรก) กลับเต็มสูง */
const CARPORT_LOW = 0.15;
function Cutaway({
  normal,
  closedRef,
  reduced,
  children,
  top,
}: {
  normal: { x: number; z: number };
  closedRef?: RefObject<number>;
  reduced: boolean;
  children: React.ReactNode;
  /** ส่วนบน (หลังคา) — หายไปทั้งชิ้นเมื่อย่อลง ไม่บีบเป็นแผ่นบาง */
  top?: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  const topRef = useRef<Group>(null);
  const k = useRef(1);
  useFrame(({ camera, invalidate }) => {
    const g = ref.current;
    if (!g) return;
    const len = Math.hypot(camera.position.x, camera.position.z) || 1;
    const dot = (normal.x * camera.position.x + normal.z * camera.position.z) / len;
    const target =
      (closedRef?.current ?? 0) > 0.5
        ? 1
        : CARPORT_LOW + (1 - CARPORT_LOW) * (1 - smoothstep(-0.1, 0.3, dot));
    const next = reduced ? target : k.current + (target - k.current) * 0.15;
    const moving = Math.abs(target - next) > 0.002;
    k.current = moving ? next : target;
    g.scale.y = k.current;
    if (topRef.current) topRef.current.visible = k.current > 0.97;
    if (moving) invalidate();
  });
  return (
    <>
      <group ref={ref} position={[0, -PLINTH_H, 0]}>
        <group position={[0, PLINTH_H, 0]}>{children}</group>
      </group>
      <group ref={topRef}>{top}</group>
    </>
  );
}

/** ห้องเริ่มลอยอยู่เหนือที่ของมันเท่านี้ แล้วร่วงลงเข้าที่ตามช่วงของโซนในฉากหน้าแรก (heroTimeline) */
const ROOM_DROP_M = 4;
/** หลังคาเริ่มลอยอยู่สูงกว่าตำแหน่งจริงเท่านี้ก่อนจะร่วงลงมาปิด */
const ROOF_DROP_M = 6;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const smootherstep = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/* พื้นห้อง: ไม้ลามิเนตโอ๊กอ่อน (texture CC0) ผิวบนที่ FLOOR_TOP — กล่องนี้รับการคลิกเลือกห้อง
   ระเบียงเป็นไม้สีเข้ม */
function RoomFloor({
  room,
  material,
  interactive,
  surface,
  onClick,
  onOver,
  onOut,
}: {
  room: HouseType["rooms"][number];
  interactive: boolean;
  material: MeshStandardMaterial;
  /** mood studio: พื้นในร่มเป็นผิว "floor" ที่ Picker จับได้ */
  surface?: MoodSurface | undefined;
  onClick: () => void;
  onOver: () => void;
  onOut: () => void;
}) {
  const geometry = useMemo(
    () => metricBox(room.x0, 0, room.z0, room.x1, FLOOR_TOP, room.z1),
    [room.x0, room.z0, room.x1, room.z1],
  );
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh
      geometry={geometry}
      material={material}
      receiveShadow
      userData={{ roomId: room.id, ...(surface && { surface }) }}
      /* ไม่ใส่ handler เลยเมื่อไม่รับคลิก — R3F ข้ามการ raycast ของ mesh ที่ไม่มี handler */
      {...(interactive && {
        onClick: (ev: ThreeEvent<MouseEvent>) => {
          ev.stopPropagation();
          onClick();
        },
        onPointerOver: (ev: ThreeEvent<PointerEvent>) => {
          ev.stopPropagation();
          onOver();
        },
        onPointerOut: onOut,
      })}
    />
  );
}

export function FloorPlanScene({
  house,
  floor = 1,
  progressRef,
  plot,
  neighbour = false,
  interactive = true,
  studio,
}: {
  /** mood studio ของหน้าแบบบ้าน (โหมด Isometric): วัสดุเปลี่ยนได้ ไฟในบ้านตามเวลา หมุดวัสดุ และจุดรับวัสดุที่ลากมาวาง */
  studio?: { pickRef: RefObject<PickFn | null>; lampsMax: number } | undefined;
  house: HouseType;
  /** false = ฉากโชว์ (หน้าแรก): ไม่รับคลิก/hover ห้อง ไม่ไฮไลต์ห้องที่เลือกค้างจากหน้าอื่น
      หน้าแบบบ้าน (PlanViewer) และโหมดเดินดูยังเลือกห้องได้ตามเดิม */
  interactive?: boolean;
  floor?: number;
  /** บ้านแฝด: วางหลังข้างเคียงที่สะท้อนรอบผนังร่วมแบบปิด (ภาพภายนอกของแบบ — ให้อ่านเป็นบ้านแฝดตามภาพอ้างอิง) */
  neighbour?: boolean;
  /** ขนาดแปลงจริงที่บ้านยืน (ฉากเปิดหน้าแรก) — ไม่ส่ง = แปลงมาตรฐานของแบบ (typicalPlot) */
  plot?: PlotSize;
  /** ความคืบหน้า 0-1 ของฉาก scroll — อ่านทุกเฟรมใน useFrame ไม่ผ่าน state
      จะได้ไม่ re-render React ทุกครั้งที่เลื่อนหน้า ไม่มีให้มา = บ้านประกอบอยู่เฉยๆ */
  progressRef?: RefObject<number>;
}) {
  const storeRoom = useGrove((s) => s.selectedRoom);
  const selectedRoom = interactive ? storeRoom : null;
  const selectRoom = useGrove((s) => s.selectRoom);
  const reduced = usePrefersReducedMotion();
  const low = useLowPower();
  const accentColor = useTokenColor("--marigold");
  const [hovered, setHovered] = useState<string | null>(null);
  const kit = useOutdoorKit(low);
  const inner = useIndoorKit(low);
  const smats = useStudioMaterials(inner);
  const setTarget = useMood((s) => s.setTarget);

  /* diorama แสดงทีละชั้น
     memo ตาม house/floor — เดิม filter ใหม่ทุก render แล้ว wallInfos (และ seg ของผนังทุกชิ้น) เปลี่ยน identity ตาม
     ผนังทุกชิ้นจึง extrude geometry ใหม่และ dispose วัสดุของตัวเองทุกครั้งที่ฉาก render ซ้ำ (setState ตอนโหลด ฯลฯ)
     วัสดุที่ถูก dispose ทั้งที่ยังใช้อยู่ = three ทิ้งโปรแกรม shader แล้วคอมไพล์ใหม่ (วัด 2026-10-03: ซ้ำ 12 จาก 39 โปรแกรม) */
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
  const all = useMemo(() => houseBounds(rooms, true), [rooms]);

  const wallInfos = useMemo<WallInfo[]>(() => {
    const outdoorIds = new Set(rooms.filter((r) => r.outdoor).map((r) => r.id));
    const isIndoor = (id: string | null) => id !== null && !outdoorIds.has(id);
    const segs = walls(rooms, openings).filter(
      (s) => isIndoor(s.roomMinus) || isIndoor(s.roomPlus),
    );

    /* ผนัง accent เขียวหม่นด้านเดียวตาม §5 — ผนังในที่ยาวที่สุดของห้องที่ใหญ่ที่สุด */
    const largest = [...rooms]
      .filter((r) => !r.outdoor)
      .sort((a, b) => roomArea(b) - roomArea(a))[0];
    const accentId = segs
      .filter(
        (s) =>
          isIndoor(s.roomMinus) &&
          isIndoor(s.roomPlus) &&
          (s.roomMinus === largest?.id || s.roomPlus === largest?.id),
      )
      .sort((a, b) => b.to - b.from - (a.to - a.from))[0]?.id;

    return segs.map((seg) => {
      const minusIndoor = isIndoor(seg.roomMinus);
      const plusIndoor = isIndoor(seg.roomPlus);
      const exterior = minusIndoor !== plusIndoor;
      const outward = minusIndoor ? 1 : -1;
      return {
        seg,
        roomId: (minusIndoor ? seg.roomMinus : seg.roomPlus) as string,
        exterior,
        normal: seg.axis === "z" ? { x: outward, z: 0 } : { x: 0, z: outward },
        accent: seg.id === accentId,
      };
    });
  }, [rooms, openings]);

  /* กรอบรูปหันหน้าทาง facing จึงแขวนบนผนังฝั่งตรงข้าม — ถ้าผนังนั้นเป็นผนังนอก คืนทิศที่มันหันออก */
  const mountedOn = (f: Furniture) => {
    if (f.kind !== "frame" || !f.facing) return undefined;
    const back =
      f.facing === "x+"
        ? { x: -1, z: 0 }
        : f.facing === "x-"
          ? { x: 1, z: 0 }
          : f.facing === "z+"
            ? { x: 0, z: -1 }
            : { x: 0, z: 1 };
    const hit = wallInfos.find(
      (w) =>
        w.exterior &&
        w.roomId === f.roomId &&
        w.normal.x === back.x &&
        w.normal.z === back.z &&
        Math.abs((w.seg.axis === "z" ? f.x : f.z) - w.seg.at) < 0.3,
    );
    return hit ? back : undefined;
  };

  /* ฉากหน้าแรก: ช่วงร่วงของห้องและหลังคา — ชุดเดียวกับข้อความข้างบ้าน (heroTimeline) */
  const script = useMemo(
    () => (progressRef ? heroScript(house.rooms) : null),
    [progressRef, house],
  );

  /* ที่ตั้งบนแปลง (ชั้นล่างเท่านั้น): สนาม ฐานบ้าน ชาน ราว ทางเดิน โรงจอดรถ พุ่มไม้ — คำนวณจากห้องชุดเดียวกัน */
  const site = useMemo(
    () => (floor === 1 ? houseSiting(house, plot ?? typicalPlot(house)) : null),
    [floor, house, plot],
  );
  /* หลังข้างเคียงของบ้านแฝด: บ้าน + สวนสะท้อนรอบเส้นผนังร่วม ปิดหลังคา (geometry ชุดเดียวกัน ไม่ใช่ชุดแยก) */
  const twinParts = useParts(() => {
    const b = new Builder();
    const P = neighbour && site ? partyLine(site) : null;
    if (site && P !== null) {
      const nb = mirrorHouse(house, P);
      buildSite(b, mirrorLayout(site, P), { lawn: true, deck: true });
      buildShell(b, nb, 1);
      buildRoof(b, nb);
      const p = mirrorLayout(site, P).plot;
      b.box(
        "board",
        p.x0 - BOARD_LIP,
        -PLINTH_H - 0.55,
        p.z0 - BOARD_LIP,
        p.x1 + BOARD_LIP,
        -PLINTH_H - 0.06,
        p.z1 + BOARD_LIP,
      );
    }
    return b.build();
  }, [neighbour, site, house]);
  const twinPlants = useMemo(() => {
    const P = neighbour && site ? partyLine(site) : null;
    if (!site || P === null) return null;
    const m = mirrorLayout(site, P);
    return {
      trees: m.trees.map((t) => ({ ...t, y: -PLINTH_H })),
      shrubs: m.shrubs.map((sh) => ({ ...sh, y: -PLINTH_H })),
    };
  }, [neighbour, site]);
  /* ด้านที่โรงจอดหันออก (ตรงข้ามผนังที่มันฝาก) — ย่อลงเมื่อด้านนั้นหันเข้ากล้อง */
  const carportNormal = useMemo(() => {
    const w = site?.carport?.wall;
    return w === "x+" ? { x: -1, z: 0 } : w === "x-" ? { x: 1, z: 0 } : { x: 0, z: -1 };
  }, [site]);
  const terraceIds = useMemo(
    () => new Set(rooms.filter((r) => r.outdoor).map((r) => r.id)),
    [rooms],
  );
  const ground = useParts(() => {
    const b = new Builder();
    if (site) {
      const porchIsRoom = house.rooms.some(
        (r) => r.outdoor && r.x0 === site.porch.x0 && r.z0 === site.porch.z0,
      );
      buildSite(b, { ...site, carport: null }, { lawn: true, deck: !porchIsRoom });
      const p = site.plot;
      b.box(
        "board",
        p.x0 - BOARD_LIP,
        -PLINTH_H - 0.55,
        p.z0 - BOARD_LIP,
        p.x1 + BOARD_LIP,
        -PLINTH_H - 0.06,
        p.z1 + BOARD_LIP,
      );
    } else {
      b.box("board", all.x0 - 0.45, -0.4, all.z0 - 0.45, all.x1 + 0.45, -0.002, all.z1 + 0.45);
    }
    return b.build();
  }, [site, all.x0, all.x1, all.z0, all.z1]);
  /* โรงจอดรถแยก builder — ย่อเป็นตอเตี้ยเมื่อหันเข้ากล้อง */
  const carport = useParts(() => {
    const b = new Builder();
    if (site?.carport) buildCarport(b, site.carport, "posts");
    return b.build();
  }, [site]);
  const carportRoof = useParts(() => {
    const b = new Builder();
    if (site?.carport) buildCarport(b, site.carport, "roof");
    return b.build();
  }, [site]);
  const plants = useMemo(
    () => ({
      trees: (site?.trees ?? []).map((t) => ({ ...t, y: -PLINTH_H })),
      shrubs: (site?.shrubs ?? []).map((sh) => ({ ...sh, y: -PLINTH_H })),
    }),
    [site],
  );
  const roofParts = useParts(() => {
    const b = new Builder();
    if (progressRef) {
      /* ชั้นบน (ถ้ามี) เป็นกล่องปิดพร้อมหน้าต่าง ลงมาพร้อมหลังคา — diorama ผ่าครึ่งแค่ชั้นที่กำลังดู */
      buildShell(b, house, floor + 1);
      buildRoof(b, house);
    }
    return b.build();
  }, [progressRef, house]);

  /* ขยับทุกอย่างในเฟรมเดียว อ่านค่าจาก ref ตรงๆ ไม่แตะ React เลยระหว่างเลื่อน */
  const groups = useRef(new Map<string, Group>());
  const roof = useRef<Group>(null);
  const closed = useRef(0);
  useFrame(() => {
    if (!progressRef || !script) return;
    const p = progressRef.current;
    const cap = capOf(script.cap, p);
    closed.current = cap;
    /* หลังคาจริง (จั่ว กรอบเทา ระแนง) ร่วงลงมาปิดบ้านหลังห้องครบ — จากบ้านผ่าครึ่งกลายเป็นบ้านทั้งหลัง */
    const g = roof.current;
    if (g) {
      const t = smootherstep(cap);
      g.visible = t > 0.001;
      g.position.y = ROOF_DROP_M * (1 - t);
    }
    /* ห้องที่ยังไม่ถึงคิวซ่อนไว้ (แปลงเปล่า) · ถึงคิวแล้วร่วงลงตรงๆ เข้าที่ของมันเอง — ทั้งโซนเหลื่อมกันนิดๆ */
    for (const [id, span] of script.drops) {
      const g = groups.current.get(id);
      if (!g) continue;
      const t = dropOf(span, p);
      g.visible = t > 0.001;
      g.position.y = ROOM_DROP_M * (1 - t);
    }
  });

  const P = neighbour && site ? partyLine(site) : null;
  const frame = site
    ? {
        ...site.plot,
        ...(P !== null && {
          x0: Math.min(site.plot.x0, 2 * P - site.plot.x1),
          x1: Math.max(site.plot.x1, 2 * P - site.plot.x0),
        }),
        y: -PLINTH_H - 0.55,
      }
    : { x0: all.x0 - 0.45, z0: all.z0 - 0.45, x1: all.x1 + 0.45, z1: all.z1 + 0.45, y: -0.4 };

  /* §5 — spot หน้าต่างจุดเดียว: วางนอกหน้าต่างบานแรก ส่องเข้าหากลางบ้าน
     decay 0 เพื่อให้ค่า intensity ตรงตามสเปก ไม่ถูกกฎ inverse-square ของ three กลืน */
  const spot = useMemo(() => {
    const w = openings.find((o) => o.kind === "window");
    if (!w) return null;
    const c = openingCenter(w);
    const len = Math.hypot(c.x, c.z) || 1;
    return [c.x + (c.x / len) * 1.8, 2.2, c.z + (c.z / len) * 1.8] as const;
  }, [openings]);

  /* mood studio: ผ้าผืนหลักของชิ้นแรกในแต่ละชนิด (โซฟา เตียง พรม) ใช้ material ที่เปลี่ยนสีได้ */
  const clothOf = (f: Furniture) => {
    const surface = clothSurface(f.kind);
    return surface ? smats.cloth[surface] : undefined;
  };
  const spots = useMemo(
    () => (studio ? pinSpots(rooms, furniture, wallInfos) : []),
    [studio, rooms, furniture, wallInfos],
  );

  const scene = (
    <group>
      {spot && (
        <spotLight
          color={LIGHT.windowSpot}
          intensity={LIGHT.windowSpotIntensity}
          position={spot}
          angle={0.7}
          penumbra={0.8}
          distance={0}
          decay={0}
        />
      )}

      {/* แปลงทั้งแปลงบนฐานไม้หนา: สนาม ฐานบ้าน ชาน ทางเดินหิน พุ่มไม้ ต้นไม้ค้ำ */}
      <group>
        <PartsMeshes parts={ground} kit={kit} />
        <Vegetation trees={plants.trees} shrubs={plants.shrubs} kit={kit} />
        {site?.carport && (
          <Cutaway
            normal={carportNormal}
            closedRef={progressRef ? closed : undefined}
            reduced={reduced}
            top={<PartsMeshes parts={carportRoof} kit={kit} />}
          >
            <PartsMeshes parts={carport} kit={kit} />
          </Cutaway>
        )}
      </group>
      {twinParts.size > 0 && (
        <group>
          <PartsMeshes parts={twinParts} kit={kit} />
          {twinPlants && (
            <Vegetation trees={twinPlants.trees} shrubs={twinPlants.shrubs} kit={kit} />
          )}
        </group>
      )}
      {/* เงาสัมผัสใต้ฐาน — โมเดลวางอยู่บนโต๊ะจริง ไม่ได้ลอยกลางจอ
          อบเฉพาะแผ่นฐานไม้ (far 0.3 แบบเดียวกับหมู่บ้าน) — เดิม 1.2 ม. เก็บกำแพงรั้วริมแปลงไปด้วย
          แล้วเบลอเป็นแถบมืดลอยนอกฐาน (เจ้าของแจ้ง 2026-10-03) */}
      <group>
        <GroundShadow
          position={[(frame.x0 + frame.x1) / 2, frame.y - Z_EPS * 2, (frame.z0 + frame.z1) / 2]}
          width={frame.x1 - frame.x0 + 4}
          depth={frame.z1 - frame.z0 + 4}
          far={0.3}
          opacity={0.6}
          blur={5}
          low={low}
        />
      </group>

      {/* หลังคาจริงของแบบนี้ — มีเฉพาะตอนฉากถูกขับด้วย scroll ของหน้าแรก
         มุมมองแปลนกับ diorama ปกติต้องเป็นบ้านผ่าครึ่งเสมอ ไม่งั้นมองไม่เห็นห้อง */}
      {progressRef && (
        <group ref={roof} visible={false}>
          <PartsMeshes parts={roofParts} kit={kit} />
        </group>
      )}

      {/* หนึ่ง group ต่อหนึ่งห้อง — พื้น ผนังของห้องนั้น และเฟอร์นิเจอร์ในห้อง ลอยออกไปด้วยกัน */}
      {rooms.map((r) => {
        const cx = (r.x0 + r.x1) / 2;
        const cz = (r.z0 + r.z1) / 2;
        const w = r.x1 - r.x0;
        const d = r.z1 - r.z0;
        const selected = r.id === selectedRoom;
        return (
          <group
            key={r.id}
            ref={(g) => {
              if (g) groups.current.set(r.id, g);
              else groups.current.delete(r.id);
            }}
          >
            <RoomFloor
              room={r}
              material={terraceIds.has(r.id) ? kit.oakDark : studio ? smats.floor : inner.floor}
              interactive={interactive}
              surface={studio && !terraceIds.has(r.id) ? "floor" : undefined}
              onClick={() => {
                selectRoom(selected ? null : r.id);
                if (studio && !terraceIds.has(r.id)) setTarget("floor");
              }}
              onOver={() => setHovered(r.id)}
              onOut={() => setHovered((h) => (h === r.id ? null : h))}
            />
            {accentColor && (selected || hovered === r.id) && (
              <mesh position={[cx, 0.045, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                <planeGeometry args={[w - 0.08, d - 0.08]} />
                <meshBasicMaterial
                  color={accentColor}
                  transparent
                  opacity={selected ? 0.24 : 0.08}
                />
              </mesh>
            )}

            {wallInfos
              .filter((info) => info.roomId === r.id)
              .map((info) => (
                <Wall
                  key={info.seg.id}
                  info={info}
                  reduced={reduced}
                  closedRef={progressRef ? closed : undefined}
                  kit={kit}
                  inner={inner}
                  studio={!!studio}
                />
              ))}

            {furniture
              .filter((f) => f.roomId === r.id)
              .map((f) => (
                <Placed
                  key={f.id}
                  item={f}
                  wallNormal={mountedOn(f)}
                  closedRef={progressRef ? closed : undefined}
                  interactive={interactive}
                  cloth={studio ? clothOf(f) : undefined}
                  onPick={() => {
                    selectRoom(f.roomId === selectedRoom ? null : f.roomId);
                    const surface = clothSurface(f.kind);
                    if (studio && surface) setTarget(surface);
                  }}
                  onHover={setHovered}
                />
              ))}
          </group>
        );
      })}
    </group>
  );

  return studio ? (
    <MoodStudioProvider
      floor={smats.floor}
      cloth={smats.cloth}
      inner={inner}
      kit={kit}
      rooms={rooms}
      lampsMax={studio.lampsMax}
    >
      {scene}
      <Picker pickRef={studio.pickRef} />
      <MoodPins spots={spots} />
    </MoodStudioProvider>
  ) : (
    scene
  );
}
