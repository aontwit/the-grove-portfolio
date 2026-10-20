"use client";

import { useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Texture,
} from "three";
import { DETAIL_GAIN, M3D, ROUGH } from "./materials";

/* texture ผิววัสดุ CC0 จาก Poly Haven (public/textures/CREDITS.md) — WebP 1k / 512
   โหลดเมื่อฉาก 3D ถูก mount เท่านั้น (useLoader suspend อยู่ใน Suspense ของ canvas — ภาพนิ่งยังเป็น LCP)
   มือถือได้ 512 ทุกไฟล์ · ผิวที่เห็นไกลเสมอ (ถนน ทางเท้า กรวด ปูน) มีแค่ 512

   UV ของ geometry ทุกชิ้นในโปรเจกต์เป็นเมตร (house/build.ts) — repeat = 1 / ขนาดลายจริงเป็นเมตร
   texture ตัวเดียวจึงใช้ได้กับทุกชิ้นโดยไม่ต้อง clone */

type Surface = {
  /** ขนาดลายหนึ่งรอบเป็นเมตร */
  tile: number;
  /** มีไฟล์ 1k ให้เดสก์ท็อป */
  hi: boolean;
  /** มีไฟล์ *_color (ผ้ามีแค่ normal) */
  color: boolean;
};

const SURFACES = {
  lawn: { tile: 2.6, hi: true, color: true },
  roof: { tile: 2.4, hi: true, color: true },
  render: { tile: 2.2, hi: true, color: true },
  oak: { tile: 1.1, hi: true, color: true },
  floor: { tile: 2.4, hi: true, color: true },
  linen: { tile: 0.5, hi: true, color: false },
  asphalt: { tile: 4, hi: false, color: true },
  paving: { tile: 2.4, hi: false, color: true },
  concrete: { tile: 1.8, hi: false, color: true },
  gravel: { tile: 1.4, hi: false, color: true },
} as const satisfies Record<string, Surface>;

export type SurfaceKey = keyof typeof SURFACES;
export type SurfaceMaps = { map: Texture | null; normal: Texture };

const urlOf = (key: SurfaceKey, kind: "color" | "normal", low: boolean) =>
  `/textures/${key}_${kind}_${!low && SURFACES[key].hi ? "1k" : "512"}.webp`;

/** โหลดชุดผิวที่ฉากต้องใช้ — ส่งเฉพาะที่ใช้จริง ฉากหมู่บ้านไม่ต้องโหลดพื้นไม้ในบ้าน */
export function useSurfaces<K extends SurfaceKey>(
  keys: readonly K[],
  low: boolean,
): Record<K, SurfaceMaps> {
  const urls = keys.flatMap((k) => [
    ...(SURFACES[k].color ? [urlOf(k, "color", low)] : []),
    urlOf(k, "normal", low),
  ]);
  const textures = useLoader(TextureLoader, urls);
  const gl = useThree((s) => s.gl);
  return useMemo(() => {
    const aniso = Math.min(low ? 4 : 8, gl.capabilities.getMaxAnisotropy());
    const out = {} as Record<K, SurfaceMaps>;
    let i = 0;
    for (const k of keys) {
      const s = SURFACES[k];
      const take = (srgb: boolean) => {
        const t = textures[i++];
        if (!t) throw new Error(`texture ${k} หาย`);
        /* ตั้งครั้งเดียวต่อ texture — useLoader แคชตัวเดิมให้ทุกฉาก */
        if (!t.userData.grove) {
          t.wrapS = RepeatWrapping;
          t.wrapT = RepeatWrapping;
          t.repeat.set(1 / s.tile, 1 / s.tile);
          t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
          t.anisotropy = aniso;
          t.userData.grove = true;
          t.needsUpdate = true;
        }
        return t;
      };
      const map = s.color ? take(true) : null;
      out[k] = { map, normal: take(false) };
    }
    return out;
    // keys เป็นค่าคงที่ของผู้เรียกแต่ละที่ — เทียบด้วย textures พอ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textures, gl, low]);
}

/* ── ชุดวัสดุ ─────────────────────────────────────────────────── */

const gain = (hex: string) => new Color(hex).multiplyScalar(DETAIL_GAIN);

function surfaceMat(
  s: SurfaceMaps,
  color: Color | string,
  roughness: number,
  normalScale = 1,
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    map: s.map,
    normalMap: s.normal,
    normalScale: new Vector2(normalScale, normalScale),
    roughness,
    metalness: 0,
  });
}

const flat = (color: string, roughness: number) =>
  new MeshStandardMaterial({ color, roughness, metalness: 0 });

export const OUTDOOR_SURFACES = [
  "lawn",
  "roof",
  "render",
  "oak",
  "asphalt",
  "paving",
  "concrete",
  "gravel",
] as const;

export type OutdoorKit = ReturnType<typeof makeOutdoorKit>;

function makeOutdoorKit(s: Record<(typeof OUTDOOR_SURFACES)[number], SurfaceMaps>) {
  return {
    render: surfaceMat(s.render, gain(M3D.render), ROUGH.plaster, 0.55),
    fascia: flat(M3D.fascia, 0.55),
    /* กระเบื้องด้าน: สะท้อนฟ้าน้อย — ไม่งั้นมองไกล (หมู่บ้าน) หลังคาเทากลายเป็นน้ำเงิน */
    roof: (() => {
      const m = surfaceMat(s.roof, gain(M3D.roofTile), 0.95, 1.1);
      m.envMapIntensity = 0.45;
      return m;
    })(),
    oak: surfaceMat(s.oak, M3D.oakTint, ROUGH.timber, 0.6),
    oakDark: surfaceMat(s.oak, M3D.woodDark, ROUGH.timber, 0.6),
    white: flat(M3D.frameWhite, 0.42),
    frameDark: flat(M3D.frameDark, 0.42),
    glass: new MeshStandardMaterial({
      color: M3D.glass,
      roughness: 0.06,
      metalness: 0,
      envMapIntensity: 1.6,
    }),
    concrete: surfaceMat(s.concrete, gain(M3D.concrete), ROUGH.board, 0.8),
    paving: surfaceMat(s.paving, gain(M3D.paving), ROUGH.board, 0.9),
    asphalt: surfaceMat(s.asphalt, gain(M3D.asphalt), 0.9, 0.9),
    gravel: surfaceMat(s.gravel, gain(M3D.gravel), 0.95, 1),
    gravelDark: surfaceMat(s.gravel, gain(M3D.gravelDark), 0.95, 1.2),
    lawn: surfaceMat(s.lawn, gain(M3D.lawn), 0.96, 1),
    hedge: surfaceMat(s.lawn, gain(M3D.hedge), ROUGH.foliage, 2.2),
    water: new MeshStandardMaterial({ color: M3D.water, roughness: 0.08, metalness: 0 }),
    board: flat(M3D.woodDark, ROUGH.timber),
    bark: flat(M3D.bark, 0.9),
  };
}

export type MatKey = keyof OutdoorKit;

/* วัสดุเป็นของกลางของทั้งแอป: สีกับ texture เดียวกันคือ material ตัวเดียว (three คอมไพล์ shader ครั้งเดียว)
   ห้ามแก้ค่าใน material ที่ได้จากที่นี่ — ฉากอื่นใช้ตัวเดียวกันอยู่ */
const outdoorCache = new Map<boolean, { src: unknown; kit: OutdoorKit }>();

export function useOutdoorKit(low: boolean): OutdoorKit {
  const s = useSurfaces(OUTDOOR_SURFACES, low);
  const hit = outdoorCache.get(low);
  if (hit && hit.src === s.lawn.normal) return hit.kit;
  const kit = makeOutdoorKit(s);
  outdoorCache.set(low, { src: s.lawn.normal, kit });
  return kit;
}

export const INDOOR_SURFACES = ["floor", "render", "oak"] as const;

export type IndoorKit = ReturnType<typeof makeIndoorKit>;

function makeIndoorKit(s: Record<(typeof INDOOR_SURFACES)[number], SurfaceMaps>) {
  return {
    floor: surfaceMat(s.floor, M3D.floorTint, ROUGH.timberFloor, 0.5),
    plaster: (() => {
      /* ในบ้านมองใกล้: สีเรียบ (ไม่ใช้ลายสีของปูนนอกบ้าน) เหลือแค่ผิวฉาบบางๆ จาก normal map */
      const m = surfaceMat(s.render, M3D.wallInner, ROUGH.plaster, 0.12);
      m.map = null;
      m.side = DoubleSide;
      return m;
    })(),
    oak: surfaceMat(s.oak, M3D.oakTint, ROUGH.timber, 0.5),
    ceiling: flat(M3D.ceramic, ROUGH.plaster),
  };
}

const indoorCache = new Map<boolean, { src: unknown; kit: IndoorKit }>();

export function useIndoorKit(low: boolean): IndoorKit {
  const s = useSurfaces(INDOOR_SURFACES, low);
  const hit = indoorCache.get(low);
  if (hit && hit.src === s.floor.normal) return hit.kit;
  const kit = makeIndoorKit(s);
  indoorCache.set(low, { src: s.floor.normal, kit });
  return kit;
}

export type FabricKit = ReturnType<typeof makeFabricKit>;

function makeFabricKit(s: Record<"linen", SurfaceMaps>) {
  return {
    /* ผ้าม่านโปร่ง: แสงทะลุได้ — emissive อ่อนแทนการกระเจิงแสงจริง (transmission แพงเกินบนมือถือ) */
    sheer: new MeshStandardMaterial({
      color: M3D.sheer,
      emissive: new Color(M3D.sheerGlow),
      emissiveIntensity: 0.22,
      normalMap: s.linen.normal,
      normalScale: new Vector2(0.6, 0.6),
      roughness: ROUGH.fabric,
      metalness: 0,
      transparent: true,
      opacity: 0.62,
      side: DoubleSide,
      depthWrite: false,
    }),
    cushion: surfaceMat(s.linen, M3D.wallInner, ROUGH.fabric, 0.8),
    /* กระจกบานในบ้าน: โปร่งแทบทั้งบาน เห็นสวนข้างนอก มีแค่เงาสะท้อนฟ้าบางๆ */
    pane: new MeshStandardMaterial({
      color: M3D.pane,
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.12,
      envMapIntensity: 1.2,
      depthWrite: false,
    }),
  };
}

const FABRIC = ["linen"] as const;
const fabricCache = new Map<boolean, { src: unknown; kit: FabricKit }>();

/** ผ้าม่าน เบาะ และกระจกในบ้าน — โหมดเดินดูเท่านั้น (diorama มองไม่เห็นผ้าใกล้พอให้คุ้มไฟล์) */
export function useFabricKit(low: boolean): FabricKit {
  const s = useSurfaces(FABRIC, low);
  const hit = fabricCache.get(low);
  if (hit && hit.src === s.linen.normal) return hit.kit;
  const kit = makeFabricKit(s);
  fabricCache.set(low, { src: s.linen.normal, kit });
  return kit;
}
