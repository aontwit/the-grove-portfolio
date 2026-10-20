"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Color,
  MeshStandardMaterial,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  type Object3D,
  type PointLight,
} from "three";
import { WALL_H, roomArea, type WallSegment } from "@/geometry";
import type { Furniture, HouseType } from "@/lib/schemas";
import { useMood } from "@/lib/store";
import { useLocale } from "@/i18n/client";
import { getStudioDictionary } from "@/i18n/studio";
import { cx } from "@/lib/utils";
import {
  DAYLIGHT_KEYS,
  LAMP,
  ROUGH,
  SWATCHES,
  TEX_TILE,
  type MoodSurface,
  type StudioTex,
  type SwatchId,
} from "./materials";
import type { IndoorKit, OutdoorKit } from "./surfaces";

/* Mood studio ฝั่งฉาก (หน้าแบบบ้าน โหมด Isometric)
   - วัสดุของพื้น ผนัง ผนังเด่น โซฟา เตียง พรม เป็น material ของฉากนี้เอง (ไม่แตะ material กลางที่ฉากอื่นใช้)
   - ทุกเฟรมไล่สี/ความหยาบเข้าหาวัสดุที่เลือก (หรือที่กำลังชี้/ลากค้าง) แล้วหยุดวาดเมื่อถึง — frameloop demand
   - ไฟในบ้านติดตามความมืดของเวลา (DAYLIGHT_KEYS.night) · จุด pin ลอยเหนือผิวบอกว่าผิวไหนใช้วัสดุอะไร
   ทุกรูปทรงยังมาจาก src/geometry ชุดเดียวกับแปลน 2D — ที่นี่เปลี่ยนแค่ผิว */

/** วัสดุของผิวที่ผู้ชมเลือก — ผิวที่ผนังลงทะเบียนเข้ามาเอง (ผนังแต่ละชิ้นมี material ของตัวเองเพราะจางเองได้) */
type PaintEntry = { mat: MeshStandardMaterial; surface: MoodSurface; detail: boolean };
type Registry = { add: (e: PaintEntry) => () => void };
const StudioCtx = createContext<Registry | null>(null);

/** ผนังใน studio ลงทะเบียน material ของตัวเอง — นอก studio คืน undefined ไม่ทำอะไร */
export function useStudioPaint(
  surface: MoodSurface,
  mats: readonly MeshStandardMaterial[],
  detail: boolean,
) {
  const reg = useContext(StudioCtx);
  useEffect(() => {
    if (!reg) return;
    const offs = mats.map((mat) => reg.add({ mat, surface, detail }));
    return () => offs.forEach((off) => off());
  }, [reg, mats, surface, detail]);
}

/** โซฟา เตียง พรม: ผ้าผืนหลักของชิ้นนั้น (ผ้ารองอื่นๆ ยังเป็นสีชุดเดิม) */
export type ClothMats = Partial<Record<"sofa" | "bed" | "rug", MeshStandardMaterial>>;
/** เก้าอี้เดี่ยวหุ้มผ้าชุดเดียวกับโซฟา */
export const clothSurface = (kind: Furniture["kind"]): "sofa" | "bed" | "rug" | null =>
  kind === "armchair" ? "sofa" : kind === "sofa" || kind === "bed" || kind === "rug" ? kind : null;

export type PickFn = (clientX: number, clientY: number) => MoodSurface | null;

const effective = (s: MoodSurface): SwatchId => {
  const st = useMood.getState();
  return st.preview?.surface === s ? st.preview.swatch : st.finish[s];
};

const target = new Color();
const linear = (hex: string, gain: number) => target.set(hex).multiplyScalar(gain);

/** ไล่ค่าเข้าหาเป้า — คืน true ถ้ายังไม่ถึง */
function ease(mat: MeshStandardMaterial, color: Color, rough: number, k: number) {
  const c = mat.color;
  const d = Math.abs(c.r - color.r) + Math.abs(c.g - color.g) + Math.abs(c.b - color.b);
  const dr = Math.abs(mat.roughness - rough);
  if (d < 0.002 && dr < 0.002) {
    c.copy(color);
    mat.roughness = rough;
    return false;
  }
  c.lerp(color, k);
  mat.roughness += (rough - mat.roughness) * k;
  return true;
}

/** แสงของเวลาหนึ่ง (ไล่เส้นตรงระหว่างจุดใน DAYLIGHT_KEYS) */
export function daylightAt(hour: number) {
  const keys = DAYLIGHT_KEYS;
  let i = 0;
  while (i < keys.length - 2 && hour > (keys[i + 1]?.h ?? 0)) i++;
  const a = keys[i] ?? keys[0];
  const b = keys[i + 1] ?? a;
  const t = b.h === a.h ? 0 : Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    sun: new Color(a.sun).lerp(new Color(b.sun), t),
    sunI: mix(a.sunI, b.sunI),
    hemi: mix(a.hemi, b.hemi),
    env: mix(a.env, b.env),
    night: mix(a.night, b.night),
  };
}

/* ── ภาพผิวของ studio ─────────────────────────────────────────────
   โหลดเมื่อผิวไหนถูกเลือกใช้ครั้งแรกเท่านั้น (ไม่ใช่ทั้งแคตตาล็อก) — เดสก์ท็อป 1k · มือถือ 512
   ยังโหลดไม่เสร็จ = ผิวคงภาพเดิมไว้ก่อน (ไม่ขึ้นดำ) แล้วสลับเมื่อพร้อม */
const texCache = new Map<string, { tex: Texture; ready: boolean }>();
let onTexReady: (() => void) | null = null;
function studioTex(name: StudioTex, low: boolean): Texture | null {
  const url = `/textures/studio_${name}_${low ? "512" : "1k"}.webp`;
  let e = texCache.get(url);
  if (!e) {
    const entry = { tex: new Texture(), ready: false };
    entry.tex = new TextureLoader().load(url, () => {
      entry.ready = true;
      onTexReady?.();
    });
    entry.tex.wrapS = RepeatWrapping;
    entry.tex.wrapT = RepeatWrapping;
    entry.tex.colorSpace = SRGBColorSpace;
    entry.tex.anisotropy = 8;
    entry.tex.repeat.set(1 / TEX_TILE[name], 1 / TEX_TILE[name]);
    texCache.set(url, entry);
    e = entry;
  }
  return e.ready ? e.tex : null;
}

type Maps = { map: Texture | null; normal: Texture | null };

/** ภาพผิว + normal ของผิวหนึ่ง — normal ยืมจากชุด Poly Haven ที่มีอยู่ (ไม้พื้น ปูน ผิวฉาบ) · ผ้าไม่มี normal */
function mapsFor(swatch: SwatchId, inner: IndoorKit, kit: OutdoorKit, low: boolean): Maps | null {
  const sw = SWATCHES[swatch];
  const map = studioTex(sw.tex, low);
  if (!map) return null;
  const normal =
    sw.family === "wood"
      ? inner.floor.normalMap
      : sw.family === "stone"
        ? kit.concrete.normalMap
        : sw.family === "paint"
          ? inner.plaster.normalMap
          : null;
  return { map, normal };
}

function setMaps(mat: MeshStandardMaterial, m: Maps | null) {
  if (!m || (mat.map === m.map && mat.normalMap === m.normal)) return;
  /* มี/ไม่มี map เปลี่ยน = shader คนละรุ่น ต้องคอมไพล์ใหม่ (ครั้งแรกที่สลับเท่านั้น) */
  const recompile = !!mat.map !== !!m.map || !!mat.normalMap !== !!m.normal;
  mat.map = m.map;
  mat.normalMap = m.normal;
  if (recompile) mat.needsUpdate = true;
}

/** วัสดุของฉาก studio — สร้างครั้งเดียวต่อฉาก */
export function useStudioMaterials(inner: IndoorKit) {
  return useMemo(() => {
    const floor = inner.floor.clone();
    const cloth = () => new MeshStandardMaterial({ roughness: ROUGH.fabric, metalness: 0 });
    return { floor, cloth: { sofa: cloth(), bed: cloth(), rug: cloth() } satisfies ClothMats };
  }, [inner]);
}

type Lamp = { id: string; at: readonly [number, number, number]; reach: number };

export function MoodStudioProvider({
  children,
  floor,
  cloth,
  inner,
  kit,
  rooms,
  furniture,
  lampsMax,
  low,
}: {
  children: React.ReactNode;
  floor: MeshStandardMaterial;
  cloth: Required<ClothMats>;
  inner: IndoorKit;
  kit: OutdoorKit;
  rooms: HouseType["rooms"];
  furniture: readonly Furniture[];
  /** จำนวนไฟในบ้านสูงสุด — เครื่องแรงต่ำได้น้อยกว่า */
  lampsMax: number;
  low: boolean;
}) {
  const entries = useRef(new Set<PaintEntry>());
  const reg = useMemo<Registry>(
    () => ({
      add: (e) => {
        entries.current.add(e);
        return () => entries.current.delete(e);
      },
    }),
    [],
  );
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  /* frameloop demand: เลือกวัสดุ/เวลาจากแผง DOM = ขอเฟรม แล้ว useFrame ด้านล่างไล่ค่าต่อเอง */
  useEffect(() => useMood.subscribe(() => invalidate()), [invalidate]);
  useEffect(() => {
    onTexReady = () => invalidate();
    return () => {
      onTexReady = null;
    };
  }, [invalidate]);

  /* ไฟในบ้าน: ทุกโคมตั้งพื้น (ระดับโป๊ะ) แล้วเติมกลางห้องใหญ่ที่ยังไม่มีโคมจนครบ N ดวง · ไม่ทอดเงา (เงาจุดแพงเกินบนมือถือ)
     mount ไว้ตลอดที่ intensity 0 ตอนกลางวัน — จำนวนไฟเปลี่ยน = three คอมไพล์ shader ทุกตัวใหม่ */
  const lamps = useMemo(() => {
    const standing = furniture.filter((f) => f.kind === "floorLamp");
    const out: Lamp[] = standing.map((f) => ({ id: f.id, at: [f.x, 1.5, f.z], reach: 4.2 }));
    const lit = new Set(standing.map((f) => f.roomId));
    const big = rooms
      .filter((r) => !r.outdoor && !lit.has(r.id) && roomArea(r) >= 8)
      .sort((a, b) => roomArea(b) - roomArea(a));
    for (const r of big)
      out.push({
        id: r.id,
        at: [(r.x0 + r.x1) / 2, 2.2, (r.z0 + r.z1) / 2],
        reach: Math.hypot(r.x1 - r.x0, r.z1 - r.z0) * 0.9 + 1,
      });
    return out.slice(0, lampsMax);
  }, [rooms, furniture, lampsMax]);
  const lampRefs = useRef<(PointLight | null)[]>([]);
  const lampColor = useMemo(() => new Color(LAMP.color), []);
  const shown = useRef<number | null>(null);

  /* วัสดุที่เรืองแสงได้ (โป๊ะโคม จอคอม — furniture ติด userData.glow) สว่างขึ้นตอนค่ำ ให้ bloom จับ */
  const glows = useRef<MeshStandardMaterial[]>([]);
  useEffect(() => {
    const found = new Set<MeshStandardMaterial>();
    scene.traverse((o) => {
      const m = (o as { material?: MeshStandardMaterial }).material;
      if (m?.userData?.glow) found.add(m);
    });
    glows.current = [...found];
    invalidate();
  }, [scene, furniture, invalidate]);

  useFrame(({ invalidate }) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = reduced ? 1 : 0.14;
    let moving = false;

    const s = effective("floor");
    setMaps(floor, mapsFor(s, inner, kit, low));
    moving = ease(floor, linear(SWATCHES[s].tint, 1), SWATCHES[s].rough, k) || moving;

    for (const e of entries.current) {
      const id = effective(e.surface);
      const sw = SWATCHES[id];
      setMaps(e.mat, mapsFor(id, inner, kit, low));
      moving = ease(e.mat, linear(sw.tint, 1), sw.rough, k) || moving;
    }

    for (const key of ["sofa", "bed", "rug"] as const) {
      const id = effective(key);
      const sw = SWATCHES[id];
      setMaps(cloth[key], mapsFor(id, inner, kit, low));
      moving = ease(cloth[key], linear(sw.tint, 1), sw.rough, k) || moving;
    }

    /* ไฟในบ้านตามเวลา — ไล่ชั่วโมงที่แสดงตามชั่วโมงที่เลือกแบบเดียวกับแดด (IsoCanvas) */
    const want = useMood.getState().hour;
    const prev = shown.current ?? want;
    const h = Math.abs(want - prev) < 0.01 ? want : prev + (want - prev) * (reduced ? 1 : 0.1);
    if (h !== want) moving = true;
    shown.current = h;
    const night = daylightAt(h).night;
    for (const l of lampRefs.current) {
      if (!l) continue;
      l.intensity = LAMP.intensity * night;
      l.visible = night > 0.01;
    }
    for (const m of glows.current) {
      const base = (m.userData.glowBase as number | undefined) ?? 0.3;
      m.emissiveIntensity = base + night * ((m.userData.glowNight as number | undefined) ?? 2.4);
    }

    if (moving) invalidate();
  });

  return (
    <StudioCtx.Provider value={reg}>
      {lamps.map((l, i) => (
        <pointLight
          key={l.id}
          ref={(el) => {
            lampRefs.current[i] = el;
          }}
          position={l.at}
          color={lampColor}
          intensity={0}
          distance={l.reach}
          decay={1.6}
        />
      ))}
      {children}
    </StudioCtx.Provider>
  );
}

/** พื้นหลังของเวที: ภาพเมืองยามพลบเบลอ (public/backdrop) ตัดแบบ cover ตามสัดส่วน canvas
    ความสว่างตามเวลา — กลางวันสว่างกว่า กลางคืนเหลือแสงไฟเมือง */
const BACKDROP_ASPECT = 1.5;
export function Backdrop({ low }: { low: boolean }) {
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const tex = useMemo(() => {
    const t = new TextureLoader().load(
      low ? "/backdrop/dusk-bokeh_768.webp" : "/backdrop/dusk-bokeh.webp",
      () => invalidate(),
    );
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [low, invalidate]);
  useEffect(() => {
    const a = size.width / Math.max(1, size.height);
    if (a > BACKDROP_ASPECT) {
      tex.repeat.set(1, BACKDROP_ASPECT / a);
      tex.offset.set(0, (1 - BACKDROP_ASPECT / a) / 2);
    } else {
      tex.repeat.set(a / BACKDROP_ASPECT, 1);
      tex.offset.set((1 - a / BACKDROP_ASPECT) / 2, 0);
    }
    const prev = scene.background;
    scene.background = tex;
    invalidate();
    return () => {
      scene.background = prev;
    };
  }, [scene, tex, size, invalidate]);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame(() => {
    scene.backgroundIntensity = 0.85 - daylightAt(useMood.getState().hour).night * 0.45;
  });
  return null;
}

/** จับผิวใต้นิ้ว/เมาส์จากพิกัดหน้าจอ (ลากวัสดุจากแผง DOM มาวาง) — เดินขึ้นหา userData.surface */
export function Picker({ pickRef }: { pickRef: RefObject<PickFn | null> }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const ray = new Raycaster();
    const p = new Vector2();
    pickRef.current = (x, y) => {
      const r = gl.domElement.getBoundingClientRect();
      p.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(p, camera);
      for (const hit of ray.intersectObjects(scene.children, true)) {
        if (!hit.object.visible) continue;
        let o: Object3D | null = hit.object;
        while (o && !o.userData.surface) o = o.parent;
        if (o) return o.userData.surface as MoodSurface;
      }
      return null;
    };
    return () => {
      pickRef.current = null;
    };
  }, [gl, camera, scene, pickRef]);
  return null;
}

/** ตำแหน่งหมุด: พื้นห้องใหญ่สุด · ผนังนอกยาวสุดฝั่งไกลกล้อง · ผนังเด่น · ชิ้นแรกของโซฟา/เตียง/พรม */
export function pinSpots(
  rooms: HouseType["rooms"],
  furniture: readonly Furniture[],
  walls: readonly {
    seg: WallSegment;
    exterior: boolean;
    accent: boolean;
    normal: { x: number; z: number };
  }[],
): { surface: MoodSurface; at: [number, number, number] }[] {
  const out: { surface: MoodSurface; at: [number, number, number] }[] = [];
  /* หมุดพื้นที่มุมหน้าของห้องใหญ่สุด (ฝั่งกล้อง -x -z) — ห่างจากหมุดโซฟา/เตียง/พรมที่อยู่กลางห้องและชิดผนังหลัง */
  const big = [...rooms].filter((r) => !r.outdoor).sort((a, b) => roomArea(b) - roomArea(a))[0];
  if (big) out.push({ surface: "floor", at: [big.x0 + 0.9, 0.05, big.z0 + 0.9] });
  const mid = (s: WallSegment): [number, number, number] => {
    const m = (s.from + s.to) / 2;
    return s.axis === "z" ? [s.at, WALL_H, m] : [m, WALL_H, s.at];
  };
  /* กล้องเริ่มที่ azimuth 225° (ฝั่ง -x -z) — ผนังนอกที่หันออก +x/+z คือผนังหลังที่เห็นด้านใน */
  const back = walls
    .filter((w) => w.exterior && !w.accent && (w.normal.x > 0 || w.normal.z > 0))
    .sort((a, b) => b.seg.to - b.seg.from - (a.seg.to - a.seg.from))[0];
  if (back) out.push({ surface: "walls", at: mid(back.seg) });
  const accent = walls.find((w) => w.accent);
  if (accent) out.push({ surface: "feature", at: mid(accent.seg) });
  for (const kind of ["sofa", "bed", "rug"] as const) {
    const f = furniture.find((x) => x.kind === kind);
    if (f) out.push({ surface: kind, at: [f.x, kind === "rug" ? 0.08 : 0.75, f.z] });
  }
  return out;
}

/** หมุดวัสดุลอยเหนือห้อง — ชิปสี + ชื่อผิว + ชื่อวัสดุ เส้นบางลงไปถึงผิว กดแล้วเลือกผิวนั้นในแผง */
export function MoodPins({ spots }: { spots: ReturnType<typeof pinSpots> }) {
  const lang = useLocale();
  const s = getStudioDictionary(lang);
  const finish = useMood((st) => st.finish);
  const preview = useMood((st) => st.preview);
  const targetSurface = useMood((st) => st.target);
  const hidden = useMood((st) => st.uiHidden);
  const setTarget = useMood((st) => st.setTarget);
  return (
    <>
      {spots.map(({ surface, at }, i) => {
        const id = preview?.surface === surface ? preview.swatch : finish[surface];
        const on = targetSurface === surface;
        return (
          <Html
            key={surface}
            position={at}
            zIndexRange={[30, 10]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className={cx(
                "pointer-events-none hidden -translate-x-1/2 -translate-y-full flex-col items-center transition-opacity duration-250 md:flex motion-reduce:transition-none",
                hidden && "opacity-0",
              )}
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setTarget(surface)}
                className={cx(
                  "rounded-control bg-ink/90 text-chalk pointer-events-auto flex items-center gap-2 border py-1 pr-3 pl-1 text-left whitespace-nowrap",
                  on ? "border-citron" : "border-chalk/15",
                  hidden && "pointer-events-none",
                )}
              >
                <span
                  aria-hidden
                  className="rounded-control size-7 shrink-0"
                  style={{ background: SWATCHES[id].chip }}
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-13 text-ash">{s.surfaces[surface]}</span>
                  <span className="text-13 font-medium">{s.swatches[id]}</span>
                </span>
              </button>
              {/* เส้นยาวสลับกัน หมุดใกล้กันจึงไม่ซ้อน */}
              <span aria-hidden className={cx("bg-chalk/50 w-px", i % 2 ? "h-16" : "h-8")} />
              <span aria-hidden className="bg-chalk size-1.5 rounded-full" />
            </div>
          </Html>
        );
      })}
    </>
  );
}
