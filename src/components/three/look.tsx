"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { SMAAPreset, ToneMappingMode } from "postprocessing";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  FrontSide,
  MeshDepthMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  NeutralToneMapping,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Camera,
  type Group,
  type Material,
  type Object3D,
  type Scene,
  type Side,
  type Texture,
  type WebGLRenderer,
  type WebGLRendererParameters,
} from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { LIGHT, M3D } from "./materials";

/* ชุดแสงและคุณภาพภาพที่ทุก Canvas ในโปรเจกต์ใช้ร่วมกัน (DESIGN-SPEC §5)
   - เงา PCF + radius: three r186 ตัด PCFSoftShadowMap ทิ้ง `shadows="soft"` จึงถอยไปเป็นเงาแข็ง
   - แสงอ้อมจาก HDRI ฟ้า CC0 ไฟล์ในโปรเจกต์ (public/hdri) ไม่ใช้ preset ของ drei (preset โหลดจาก CDN)
   - N8AO + SMAA แล้วจบด้วย NeutralToneMapping — สี token ออกมาตรงกว่า ACES */

/** มือถือหรือจอเล็ก — ลด DPR, ขนาดเงา, AO ครึ่งความละเอียด
    อ่านครั้งเดียวตอน mount: ทุกฉากที่ใช้ตัวนี้โหลดฝั่ง client เท่านั้น จึงไม่มีปัญหา hydration */
export function useLowPower(): boolean {
  const [low] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  });
  return low;
}

/* ค่าคงที่ระดับ module — R3F เทียบ prop shadows ทุก render ถ้าส่ง object ใหม่ทุกครั้ง
   shadow map จะถูกสั่งคอมไพล์ใหม่ไม่หยุด */
export const SHADOW_MAP = { enabled: true, type: PCFShadowMap } as const;

const GL: WebGLRendererParameters & {
  toneMapping: typeof NeutralToneMapping;
  toneMappingExposure: number;
  outputColorSpace: typeof SRGBColorSpace;
} = {
  /* AA มาจาก SMAA ใน composer — MSAA ของ canvas หลักเปลืองเปล่าเพราะภาพถูกวาดลง buffer อื่น */
  antialias: false,
  stencil: false,
  powerPreference: "high-performance",
  /* tone mapping จริงอยู่ท้าย composer · ค่านี้คือทางสำรองถ้า composer ไม่ทำงาน */
  toneMapping: NeutralToneMapping,
  toneMappingExposure: LIGHT.exposure,
  outputColorSpace: SRGBColorSpace,
};
/** gl ของ Canvas ทุกตัว */
export const glProps = GL;

/** ช่วง DPR: มือถือหยุดที่ 1.5 — จอ 3x วาดเกินตาเห็นแต่กินแบตเต็มๆ */
const DPR_LOW: [number, number] = [1, 1.5];
const DPR_HIGH: [number, number] = [1, 2];
export const dprFor = (low: boolean): [number, number] => (low ? DPR_LOW : DPR_HIGH);

/* แสงอ้อมในบ้าน (โหมดเดินดู) — กล่อง Lightformer ล้อมรอบทุกด้าน (ไม่มีมุมไหนของท้องฟ้าดำ)
   แล้วเพิ่มแผงสว่างฝั่งเดียวเป็นแสงหลักนุ่ม ผนังสองด้านจึงสว่างไม่เท่ากัน
   - ผนังกล่องใช้สี ceramic (ขาวเกือบกลาง) — แสงอ้อมต้องไม่ย้อมสีวัสดุ ไม่งั้นผนัง #F3EDE2 ออกมาเป็นเบจหม่น
   - พื้นนอกบ้านคือสนาม (hemiGround เขียวหม่น) · ในบ้านเป็น ceramic กลางๆ — ตัวนี้แหละที่ทำให้ฝ้าไม่ดำ
     (ลองสีอุ่นแล้ว ผนังกับฝ้าออกครีมทั้งห้อง)
   ทุกสีมาจาก token §5 · วาดลง cube map ครั้งเดียว (frames=1) */
/* ขอบฟ้าสี่ด้าน [นอกบ้าน, ในบ้าน] — ในบ้านไม่เท่ากันทุกด้าน ผนังแต่ละด้านจึงได้ค่าความสว่างต่างกัน
   (ภาพเดินดูเดิม "ผนังเบจแบน" เพราะทุกด้านสว่างเท่ากันหมด) */
const SIDES: { p: [number, number, number]; k: [number, number] }[] = [
  { p: [10, 0, 0], k: [0.85, 0.55] },
  { p: [-10, 0, 0], k: [0.85, 1.15] },
  { p: [0, 0, 10], k: [0.85, 0.8] },
  { p: [0, 0, -10], k: [0.85, 0.45] },
];
export function StudioEnvironment({
  low,
  intensity = LIGHT.envIntensity,
  interior = false,
}: {
  low: boolean;
  intensity?: number;
  /** ในบ้าน: แสงสะท้อนจากพื้นเป็นสีกลาง ไม่ใช่สนามหญ้า · ขอบฟ้าแต่ละด้านไม่เท่ากัน */
  interior?: boolean;
}) {
  return (
    <Environment resolution={low ? 64 : 128} frames={1} environmentIntensity={intensity}>
      {/* ฟ้า */}
      <Lightformer
        form="rect"
        color={M3D.ceramic}
        intensity={1.1}
        scale={[20, 20, 1]}
        position={[0, 10, 0]}
      />
      {/* ขอบฟ้าสี่ด้าน */}
      {SIDES.map(({ p, k }) => (
        <Lightformer
          key={p.join()}
          form="rect"
          color={M3D.ceramic}
          intensity={interior ? k[1] : k[0]}
          scale={[20, 20, 1]}
          position={p}
        />
      ))}
      {/* พื้น: สนามหรือพื้นไม้ */}
      <Lightformer
        form="rect"
        color={interior ? M3D.ceramic : LIGHT.hemiGround}
        intensity={interior ? 0.7 : 0.6}
        scale={[20, 20, 1]}
        position={[0, -10, 0]}
      />
      {/* แสงหลักนุ่ม: หน้าต่างบานใหญ่ฝั่งเดียว อุ่นตามสีแดด */}
      <Lightformer
        form="rect"
        color={LIGHT.sun}
        intensity={2.4}
        scale={[9, 5, 1]}
        position={[-9.5, 3, 5]}
      />
    </Environment>
  );
}

/* แสงอ้อมจากฟ้าจริง: HDRI CC0 "Kloofendal 48d Partly Cloudy (Pure Sky)" จาก Poly Haven
   ย่อเหลือ 512×256 (มือถือ 256×128) ตัดดวงอาทิตย์ออก (ค่าสว่างถูกหนีบที่ percentile 99.7)
   และแทนครึ่งล่างด้วยสีดินกลางๆ — ดวงอาทิตย์ในฉากมีดวงเดียวคือ directional light ที่หมุนตามเวลา
   ฟ้าเป็นพื้นหลังได้ (โหมดเดินดู: เห็นฟ้านอกหน้าต่าง) · diorama ใช้พื้นหลังเป็นสี token ตามเดิม */
/** ไฟล์ HDRI ฟ้าและความกว้างของภาพ (px) — ความกว้างกำหนดขนาด PMREM ที่ warmPmrem ต้องเตรียม shader ให้ตรง */
const SKY = {
  low: { file: "/hdri/sky_256.hdr", width: 256 },
  high: { file: "/hdri/sky_512.hdr", width: 512 },
} as const;
export const skyFor = (low: boolean) => (low ? SKY.low : SKY.high);

export function SkyEnvironment({
  low,
  intensity = LIGHT.envIntensity,
  background = false,
}: {
  low: boolean;
  intensity?: number;
  /** true = ฟ้าเป็นพื้นหลังด้วย · "only" = เป็นพื้นหลังอย่างเดียว (ในบ้านใช้แสงอ้อมอุ่นของ StudioEnvironment)
      ฟ้าฟ้าล้วนเป็นแสงอ้อมในห้องทำให้ผนังขาวกลายเป็นเทาอมฟ้า ฝ้ามืด — ลองแล้ว 2026-10-02 */
  background?: boolean | "only";
}) {
  return (
    <Environment
      files={skyFor(low).file}
      environmentIntensity={intensity}
      background={background}
      backgroundBlurriness={background ? 0.04 : 0}
      backgroundIntensity={1.7}
    />
  );
}

/* Khronos PBR Neutral แบบเดียวกับ shader ของ three (tonemapping_pars_fragment) */
function neutral(c: [number, number, number]): [number, number, number] {
  const start = 0.8 - 0.04;
  const desat = 0.15;
  const e = LIGHT.exposure;
  let [r, g, b] = [c[0] * e, c[1] * e, c[2] * e];
  const x = Math.min(r, g, b);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= offset;
  g -= offset;
  b -= offset;
  const peak = Math.max(r, g, b);
  if (peak < start) return [r, g, b];
  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  const k = newPeak / peak;
  const t = 1 - 1 / (desat * (peak - newPeak) + 1);
  return [
    r * k * (1 - t) + newPeak * t,
    g * k * (1 - t) + newPeak * t,
    b * k * (1 - t) + newPeak * t,
  ];
}

type V3 = [number, number, number];
const at = (v: readonly number[], k: number) => v[k] ?? 0;
const det3 = (m: readonly (readonly number[])[]) => {
  const g = (i: number, j: number) => at(m[i] ?? [], j);
  return (
    g(0, 0) * (g(1, 1) * g(2, 2) - g(1, 2) * g(2, 1)) -
    g(0, 1) * (g(1, 0) * g(2, 2) - g(1, 2) * g(2, 0)) +
    g(0, 2) * (g(1, 0) * g(2, 1) - g(1, 1) * g(2, 0))
  );
};
const err = (t: V3, c: V3) => {
  const f = neutral(c);
  return Math.max(Math.abs(t[0] - f[0]), Math.abs(t[1] - f[1]), Math.abs(t[2] - f[2]));
};
const bump = (c: V3, k: number, h: number): V3 => [
  c[0] + (k === 0 ? h : 0),
  c[1] + (k === 1 ? h : 0),
  c[2] + (k === 2 ? h : 0),
];

/** สี (linear) ที่ผ่าน NeutralToneMapping แล้วออกมาเป็น hex นี้พอดี — ใช้กับพื้นหลังที่ต้องกลืนกับหน้า
    สีเข้ม: แก้ตรงจากสูตร offset · สีสว่าง: Newton 3 มิติ (ช่องสีผูกกันผ่าน offset/peak)
    แล้วไล่ทีละช่องต่อถ้ายังไม่ถึง — ขาวสนิทไม่มีค่าที่แมปถึง 1.0 จึงเล็งที่ 0.9995 (ยังปัดเป็น 255) */
export function untoneNeutral(hex: string): Color {
  const src = new Color(hex);
  const t: V3 = [Math.min(src.r, 0.9995), Math.min(src.g, 0.9995), Math.min(src.b, 0.9995)];
  const tmin = Math.min(...t);
  const m = tmin < 0.04 ? Math.sqrt(tmin / 6.25) : tmin + 0.04;
  let c: V3 = [t[0] + m - tmin, t[1] + m - tmin, t[2] + m - tmin];

  for (let i = 0; i < 60 && err(t, c) > 1e-7; i++) {
    const f = neutral(c);
    const r = [t[0] - f[0], t[1] - f[1], t[2] - f[2]];
    /* J[j][k] = ∂f_j/∂c_k */
    const cols = [0, 1, 2].map((k) => {
      const h = Math.max(1e-6, at(c, k) * 1e-4);
      const fp = neutral(bump(c, k, h));
      return [0, 1, 2].map((j) => (at(fp, j) - at(f, j)) / h);
    });
    const J = [0, 1, 2].map((j) => [0, 1, 2].map((k) => at(cols[k] ?? [], j)));
    const D = det3(J);
    if (Math.abs(D) < 1e-12) break;
    const dx = [0, 1, 2].map(
      (k) => det3(J.map((row, j) => row.map((v, q) => (q === k ? at(r, j) : v)))) / D,
    );
    const before = err(t, c);
    let step = 1;
    let moved = false;
    while (step > 1e-3 && !moved) {
      const n: V3 = [
        Math.max(0, c[0] + step * at(dx, 0)),
        Math.max(0, c[1] + step * at(dx, 1)),
        Math.max(0, c[2] + step * at(dx, 2)),
      ];
      if (err(t, n) < before) {
        c = n;
        moved = true;
      } else step /= 2;
    }
    if (!moved) break;
  }

  /* ขาวและสีใกล้ขาว: ความชันแบนจน Newton หยุด — ไล่ทีละช่องจนสุด */
  for (let i = 0; i < 200 && err(t, c) > 1e-5; i++) {
    const f = neutral(c);
    const next = [0, 1, 2].map((k) => {
      const h = Math.max(1e-5, at(c, k) * 1e-3);
      const slope = (at(neutral(bump(c, k, h)), k) - at(f, k)) / h;
      return Math.min(4000, Math.max(0, at(c, k) + (at(t, k) - at(f, k)) / Math.max(slope, 1e-6)));
    });
    c = [at(next, 0), at(next, 1), at(next, 2)];
  }
  return new Color(c[0], c[1], c[2]);
}

type AoRef = {
  autoDetectTransparency: boolean;
  configuration: { gammaCorrection: boolean; transparencyAware: boolean };
};

/* ตั้งค่า N8AO ตอนตัว pass ถูกสร้าง (callback ref) — เร็วกว่า layout effect ของ PostFX ซึ่งไม่ได้รันซ้ำตอน composer สร้าง pass ทีหลัง
   (เดิมเฟรมแรกๆ จึงวาดด้วยค่าเริ่มของ N8AO ก่อนค่าที่ตั้งจะมีผล)
   - gammaCorrection ปิด: ในสาย postprocessing ภาพจะถูกแปลง sRGB ซ้ำสองรอบแล้วซีด
   - transparencyAware ปิด: ค่าเริ่มไล่ทั้งฉากทุกเฟรมหาวัสดุ transparent แล้วถ้าเจอ (เงาสัมผัสพื้น · ผนังที่กำลังจาง)
     วาดทั้งฉากเพิ่มอีกสองรอบต่อเฟรม — ราคาเกือบครึ่งของเฟรม · ของโปร่งในฉากเหล่านี้ไม่เขียน depth
     (AO คำนวณจาก depth ของของทึบอยู่แล้ว) วัดภาพนิ่งเทียบก่อนแก้ 2026-10-03: ต่างกัน 0 พิกเซล */
function configureAo(inst: AoRef | null) {
  if (!inst) return;
  inst.configuration.gammaCorrection = false;
  /* ค่าเริ่ม transparencyAware เป็น false อยู่แล้วแต่ "ตรวจเอง" เปิดอยู่ — ต้องปิดตัวตรวจตรงๆ (setter ของ N8AO ปิดให้เฉพาะตอนค่าเปลี่ยน) */
  inst.autoDetectTransparency = false;
  inst.configuration.transparencyAware = false;
}

/* ลำดับ: AO → tone mapping → SMAA */
export function PostFX({
  low,
  aoRadius,
  aoIntensity = 2.4,
  composerRef,
  studio = false,
}: {
  /** mood studio: bloom บางๆ ให้โป๊ะโคม จอคอม และเส้นขอบฐานเรือง + ACES (ภาพออกฟิล์มกว่า Neutral) */
  studio?: boolean;
  low: boolean;
  /** รัศมี AO เป็นเมตร — ราว 1/30 ของด้านยาวฉาก */
  aoRadius: number;
  aoIntensity?: number;
  /** ตัว EffectComposer — IsoCanvas ใช้คอมไพล์ shader ของทุก pass ล่วงหน้า (warmPasses) ก่อนเฟรมแรก */
  composerRef?: RefObject<ComposerLike | null>;
}) {
  return (
    <EffectComposer
      ref={composerRef as ComponentProps<typeof EffectComposer>["ref"]}
      multisampling={0}
      stencilBuffer={false}
    >
      <N8AO
        ref={configureAo as unknown as ComponentProps<typeof N8AO>["ref"]}
        aoRadius={aoRadius}
        distanceFalloff={1}
        intensity={aoIntensity}
        color={M3D.shade}
        halfRes={low}
        quality={low ? "performance" : "high"}
      />
      {studio ? (
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.55} />
      ) : (
        <></>
      )}
      <ToneMapping mode={studio ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.NEUTRAL} />
      <SMAA preset={low ? SMAAPreset.MEDIUM : SMAAPreset.HIGH} />
    </EffectComposer>
  );
}

/* ── อุ่นเครื่องก่อนวาดเฟรมแรก ─────────────────────────────────────
   ค่าใช้จ่ายใหญ่สุดของฉาก 3D บน main thread ไม่ใช่การสร้าง mesh แต่คือการรอ GPU คอมไพล์ shader
   (MeshStandardMaterial หนึ่งโปรแกรม ≈ 100 KB ของ GLSL · บน Windows/ANGLE ใช้ 100-500 ms ต่อโปรแกรม)
   three คอมไพล์ตอนวาดครั้งแรกแล้วถามผลแบบรอ (getProgramInfoLog) — ทั้งหมดกลายเป็น long task ก้อนเดียวหลายวินาที
   ตัวนี้สั่งคอมไพล์ทุกวัสดุในฉากล่วงหน้า แล้วถามสถานะแบบไม่รอผ่าน KHR_parallel_shader_compile (วนเช็กทุก 10 ms)
   GPU คอมไพล์ขนานกันข้างหลัง main thread ว่างให้ intro loader และหน้าเว็บตลอด
   texture อัปโหลดทีละไฟล์คนละ task ก่อน — ไม่รวมเป็นก้อนเดียวกับเฟรมแรก */

type ProgramState = {
  currentProgram?: { isReady(): boolean; getUniforms(): unknown; getAttributes(): unknown };
};

/** คืน task ให้เบราว์เซอร์หนึ่งครั้ง — scheduler.yield ถ้ามี (ได้คิวต่อก่อนงานอื่นที่มาทีหลัง) ไม่งั้น setTimeout */
function yieldTask(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((r) => setTimeout(r, 0));
}

/** อัปโหลด texture + คอมไพล์ทุกวัสดุใน `root` (รวม mesh ที่ซ่อนอยู่ — three.compile ไล่ทุกชิ้น)
    toTarget: ฉากวาดลง render target ของ EffectComposer — ตัวแปรของ shader (tone mapping / color space)
    ต้องตรงกับตอนวาดจริง ไม่งั้นได้โปรแกรมผิดชุดแล้วต้องคอมไพล์ใหม่ตอนเฟรมแรกอยู่ดี
    onProgress 0-1 = สัดส่วนวัสดุที่คอมไพล์เสร็จ · resolve เมื่อเสร็จทุกชิ้น */
export async function warmUp(
  gl: WebGLRenderer,
  root: Object3D,
  camera: Camera,
  {
    scene,
    toTarget,
    onProgress,
    alive = () => true,
  }: {
    scene?: Scene;
    toTarget: boolean;
    onProgress?: (fraction: number) => void;
    alive?: () => boolean;
  },
): Promise<void> {
  const textures = new Set<Texture>();
  root.traverse((o) => {
    const m = (o as { material?: Material | Material[] }).material;
    for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
      for (const v of Object.values(mat)) {
        if ((v as Texture | null)?.isTexture && !(v as Texture).isRenderTargetTexture) {
          textures.add(v as Texture);
        }
      }
    }
  });
  for (const t of textures) {
    if (!alive()) return;
    gl.initTexture(t);
    await yieldTask();
  }
  if (!alive()) return;

  /* คอมไพล์ทีละ "ตัวแทน" หนึ่งชิ้นต่อ (วัสดุ × ชนิด mesh) แล้วคืน task ระหว่างชิ้น
     gl.compile ทั้งฉากรวดเดียวคือ long task หลายร้อย ms (ประกอบ GLSL ~100 KB ต่อโปรแกรม + คีย์ของทุกชิ้น)
     ชิ้นที่ใช้วัสดุเดียวกันได้โปรแกรมเดียวกัน — ชนิด mesh (instanced / instance color) เปลี่ยนตัวแปรของ shader จึงแยกตัวแทน */
  const reps = new Map<string, Object3D>();
  root.traverse((o) => {
    const m = (o as { material?: Material | Material[] }).material;
    if (!m) return;
    const inst = o as { isInstancedMesh?: boolean; instanceColor?: unknown };
    const kind = inst.isInstancedMesh ? (inst.instanceColor ? "ic" : "i") : o.type;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const key = `${mat.uuid}|${kind}`;
      if (!reps.has(key)) reps.set(key, o);
    }
  });
  const target = scene ?? (root as Scene);
  const probe = toTarget ? new WebGLRenderTarget(1, 1) : null;
  const pending = new Set<Material>();
  let total = 0;
  for (const o of reps.values()) {
    if (!alive()) break;
    const before = gl.getRenderTarget();
    gl.setRenderTarget(probe);
    /* compile ไล่ลูกของ o ด้วย — mesh ในฉากนี้ไม่มีลูกที่เป็น mesh อยู่แล้ว ซ้ำได้ไม่เสียหาย */
    for (const m of gl.compile(o, camera, target)) {
      if (!pending.has(m)) total++;
      pending.add(m);
    }
    gl.setRenderTarget(before);
    await yieldTask();
  }
  /* เงาจากแดด: three วาดทุกชิ้นที่ทอดเงาด้วย MeshDepthMaterial ตัวกลางของมันเอง (ไม่อยู่ใน scene จึงไม่โดน compile)
     สร้างวัสดุ depth ที่ค่าตรงกับที่ WebGLShadowMap จะตั้ง (map · alpha · ด้านกลับ) แล้วคอมไพล์กับชิ้นตัวแทน
     โปรแกรมที่ได้มี key เดียวกับของ shadow pass — three หยิบไปใช้ได้เลยในเฟรมแรก */
  if (gl.shadowMap.enabled) {
    const done = new Set<string>();
    for (const o of reps.values()) {
      if (!alive()) break;
      const mat = (o as { material?: Material | Material[] }).material;
      if (!o.castShadow || !mat || Array.isArray(mat)) continue;
      const inst = o as { isInstancedMesh?: boolean; instanceColor?: unknown };
      const dm = depthVariant(mat);
      const key = `${dm.uuid}|${inst.isInstancedMesh ? (inst.instanceColor ? "ic" : "i") : o.type}`;
      if (done.has(key)) continue;
      done.add(key);
      const mesh = o as Object3D & { material: Material };
      const saved = mesh.material;
      mesh.material = dm;
      const before = gl.getRenderTarget();
      gl.setRenderTarget(probe);
      try {
        for (const m of gl.compile(o, camera, target)) {
          if (!pending.has(m)) total++;
          pending.add(m);
        }
      } finally {
        gl.setRenderTarget(before);
        mesh.material = saved;
      }
      await yieldTask();
    }
  }
  /* เงาสัมผัสพื้น (GroundShadow): วาดทั้งฉากด้วยวัสดุ depth ตัวเดียวแทนวัสดุจริง (overrideMaterial) แล้วเบลอสองแนว */
  const contacts: ContactParts[] = [];
  root.traverse((o) => {
    const c = o.userData.groveContact as ContactParts | undefined;
    if (c) contacts.push(c);
  });
  for (const c of contacts) {
    const kinds = new Set<string>();
    /* [ชิ้น, วัสดุ, ฉากที่ให้แสง] — เบลอวาดแผ่นเดียวลำพัง (ไม่มีแสง) · depth วาดทั้งฉาก (แสงของฉากอยู่ใน key ของโปรแกรม) */
    const jobs: [Object3D, Material, Scene | null][] = [
      [c.blurPlane, c.hBlur, null],
      [c.blurPlane, c.vBlur, null],
    ];
    for (const o of reps.values()) {
      const inst = o as { isInstancedMesh?: boolean; instanceColor?: unknown };
      const kind = inst.isInstancedMesh ? (inst.instanceColor ? "ic" : "i") : o.type;
      if (kinds.has(kind)) continue;
      kinds.add(kind);
      jobs.push([o, c.depth, target]);
    }
    for (const [o, m, lit] of jobs) {
      if (!alive()) break;
      const mesh = o as Object3D & { material: Material };
      const saved = mesh.material;
      mesh.material = m;
      const before = gl.getRenderTarget();
      gl.setRenderTarget(probe ?? c.target);
      try {
        for (const x of gl.compile(o, camera, lit)) {
          if (!pending.has(x)) total++;
          pending.add(x);
        }
      } finally {
        gl.setRenderTarget(before);
        mesh.material = saved;
      }
      await yieldTask();
    }
  }
  probe?.dispose();
  total = Math.max(1, total);

  await settle(gl, pending, total, alive, onProgress);

  /* อบเงาสัมผัสพื้นตอนนี้ คนละ task กับเฟรมแรก — เฟรมแรกจะได้ไม่ต้องวาดทั้งฉากสองรอบใน task เดียว
     (รอบนี้ยังอัปโหลด geometry ทั้งฉากขึ้น GPU ไปด้วย เฟรมแรกเบาลงอีก) */
  for (const c of contacts) {
    if (!alive()) return;
    await yieldTask();
    c.bake();
  }
}

/* วัสดุ depth หนึ่งตัวต่อชุดค่าที่เปลี่ยนโปรแกรม — เก็บไว้ตลอด (เล็กมาก) เพราะถ้าทิ้ง three จะลบโปรแกรมที่อุ่นไว้ */
const SHADOW_SIDE: Record<Side, Side> = {
  [FrontSide]: BackSide,
  [BackSide]: FrontSide,
  [DoubleSide]: DoubleSide,
};
const depthCache = new Map<string, MeshDepthMaterial>();
function depthVariant(m: Material): MeshDepthMaterial {
  const src = m as Material & { map?: Texture | null; alphaMap?: Texture | null };
  const side = m.shadowSide ?? SHADOW_SIDE[m.side];
  const map = src.map ?? null;
  const alphaMap = src.alphaMap ?? null;
  const key = `${map?.uuid ?? ""}|${alphaMap?.uuid ?? ""}|${m.alphaTest}|${side}`;
  let dm = depthCache.get(key);
  if (!dm) {
    dm = new MeshDepthMaterial();
    dm.map = map;
    dm.alphaMap = alphaMap;
    dm.alphaTest = m.alphaTest;
    dm.side = side;
    depthCache.set(key, dm);
  }
  return dm;
}

/** รอให้ GPU คอมไพล์โปรแกรมของวัสดุทุกตัวเสร็จ — ถามแบบไม่รอ (isReady = COMPLETION_STATUS_KHR) ทุก 10 ms
    แล้ว "ใช้ครั้งแรก" ให้ทีละไม่กี่ตัวต่อ task: three ถาม log ของ shader + ตำแหน่ง uniform/attribute ตอนใช้ครั้งแรก
    เป็นคำถามแบบรอคำตอบจาก GPU process ทีละโปรแกรม — ถ้าปล่อยไว้จะไปกองรวมกันในเฟรมแรก */
async function settle(
  gl: WebGLRenderer,
  pending: Set<Material>,
  total: number,
  alive: () => boolean,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const programOf = (m: Material) =>
    (gl.properties.get(m) as ProgramState | undefined)?.currentProgram;
  const programs = new Set([...pending].map(programOf));
  await new Promise<void>((resolve) => {
    const check = () => {
      if (!alive()) return resolve();
      for (const m of pending) {
        const p = programOf(m);
        if (!p || p.isReady()) pending.delete(m);
      }
      onProgress?.(1 - pending.size / Math.max(1, total));
      if (pending.size === 0) resolve();
      else setTimeout(check, 10);
    };
    check();
  });
  let start = performance.now();
  for (const p of programs) {
    if (!alive()) return;
    if (!p) continue;
    p.getUniforms();
    p.getAttributes();
    if (performance.now() - start > 12) {
      await yieldTask();
      start = performance.now();
    }
  }
}

const FLAT_CAMERA = new OrthographicCamera();

/** mesh ชั่วคราวสำหรับสั่งคอมไพล์ — ต้องมี position: three r186 นับ "geometry มี position" เป็นส่วนหนึ่งของ key ของโปรแกรม
    (BufferGeometry เปล่าได้ key คนละตัวกับตอนวาดจริง แล้วต้องคอมไพล์ซ้ำ) */
function compileMesh(material: Material): Mesh {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
  return new Mesh(g, material);
}

/* ── shader ของ EffectComposer (N8AO · SMAA · tone mapping) ──
   ไม่อยู่ใน scene จึงไม่โดน gl.compile ของฉาก — เดิมคอมไพล์แบบบล็อกในเฟรมแรก (~10 โปรแกรม)
   ไล่หา mesh เต็มจอของทุก pass (ลึกไม่เกิน 4 ชั้น ไม่เข้า scene/กล้อง/texture/render target) แล้วสั่งคอมไพล์ด้วย mesh ตัวนั้นเอง
   (geometry ตรงกับตอนวาดจริง) ลง render target — pass สุดท้ายที่วาดลงจอสั่งแบบลงจอด้วย
   ตัวที่ key ไม่ตรง (ไส้ในของไลบรารีเปลี่ยน) แค่กลับไปคอมไพล์ตอนวาดแบบเดิม */
type PassLike = { renderToScreen?: boolean };
/** ส่วนของ EffectComposer (postprocessing) ที่ warmPasses ใช้ */
export type ComposerLike = { passes: readonly PassLike[] };
export function warmPasses(
  gl: WebGLRenderer,
  passes: readonly PassLike[],
  alive: () => boolean,
): Promise<void> {
  const visited = new Set<object>();
  const collect = (v: unknown, depth: number, out: Set<Mesh>) => {
    if (!v || typeof v !== "object" || depth > 4 || visited.has(v)) return;
    visited.add(v);
    if (ArrayBuffer.isView(v)) return;
    const o = v as {
      isMesh?: boolean;
      isObject3D?: boolean;
      isTexture?: boolean;
      isRenderTarget?: boolean;
      isMaterial?: boolean;
      isBufferGeometry?: boolean;
      isWebGLRenderer?: boolean;
    };
    if (o.isMesh) {
      out.add(v as Mesh);
      return;
    }
    if (
      o.isObject3D ||
      o.isTexture ||
      o.isRenderTarget ||
      o.isMaterial ||
      o.isBufferGeometry ||
      o.isWebGLRenderer
    )
      return;
    for (const x of Object.values(v)) collect(x, depth + 1, out);
  };
  const probe = new WebGLRenderTarget(1, 1);
  const pending = new Set<Material>();
  const before = gl.getRenderTarget();
  try {
    for (const pass of passes) {
      const meshes = new Set<Mesh>();
      collect(pass, 0, meshes);
      for (const mesh of meshes) {
        for (const t of pass.renderToScreen ? [probe, null] : [probe]) {
          gl.setRenderTarget(t);
          for (const m of gl.compile(mesh, FLAT_CAMERA)) pending.add(m);
        }
      }
    }
  } catch {
    /* ไส้ในของ pass ไม่ตรงที่คาด — ข้าม */
  } finally {
    gl.setRenderTarget(before);
    probe.dispose();
  }
  return settle(gl, pending, pending.size, alive);
}

/* shader ของ PMREM (แปลง HDRI เป็นแสงอ้อม) — three สร้างตอนวัสดุชิ้นแรกถูกใช้ แล้วรอ GPU คอมไพล์ GGX filter แบบบล็อก
   (วัด 2026-10-03: 400-550 ms บน Windows/ANGLE) · ตัวนี้สั่งคอมไพล์ shader ชุดเดียวกันตั้งแต่ canvas เกิด ระหว่างที่ไฟล์ HDRI ยังโหลดอยู่
   GPU คอมไพล์ขนานไปก่อน — พอ three ขอใช้จริง โปรแกรมที่ key ตรงกันพร้อมแล้วในแคชของ renderer ไม่ต้องรอ
   ใช้ไส้ในของ PMREMGenerator (_setSize / _allocateTargets / _ggxMaterial) ตามที่ three r186 ตั้งชื่อ — ถ้า three เปลี่ยนชื่อ
   ฟังก์ชันนี้ไม่ทำอะไร (try/catch) ผลคือกลับไปคอมไพล์ตอนใช้แบบเดิม ไม่ใช่ภาพพัง
   คืนฟังก์ชันทิ้ง — ต้องถือไว้จนกว่า PMREM จริงสร้างเสร็จ (ทิ้งก่อน = โปรแกรมถูกลบ ต้องคอมไพล์ใหม่) จึงทิ้งตอน canvas ถูกถอด */
type PmremInternals = {
  _setSize(cubeSize: number): void;
  _allocateTargets(): WebGLRenderTarget;
  _ggxMaterial: Material | null;
  _equirectMaterial: Material | null;
};
export function warmPmrem(gl: WebGLRenderer, equirectWidth: number): () => void {
  const pm = new PMREMGenerator(gl);
  const inner = pm as unknown as PmremInternals;
  const before = gl.getRenderTarget();
  let target: WebGLRenderTarget | null = null;
  try {
    inner._setSize(equirectWidth / 4);
    target = inner._allocateTargets();
    /* PMREM วาดลง render target เสมอ — ตัวแปรของ shader (tone mapping / color space) ต้องคิดแบบเดียวกัน */
    gl.setRenderTarget(target);
    /* สร้างวัสดุ equirect (ไส้ใน three คอมไพล์ด้วย geometry เปล่า = key ผิด) แล้วสั่งซ้ำด้วย mesh ที่มี position */
    pm.compileEquirectangularShader();
    if (inner._equirectMaterial) gl.compile(compileMesh(inner._equirectMaterial), FLAT_CAMERA);
    if (inner._ggxMaterial) {
      gl.compile(compileMesh(inner._ggxMaterial), FLAT_CAMERA);
    }
  } catch {
    /* ไส้ในเปลี่ยน — ข้าม */
  } finally {
    gl.setRenderTarget(before);
  }
  return () => {
    target?.dispose();
    pm.dispose();
  };
}

/** มองเห็นจริงไหม — ไล่ขึ้นไปทุกชั้น เพราะ three ไม่วาดลูกของ group ที่ถูกซ่อน */
function seen(o: Object3D | null): boolean {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

/* เงาสัมผัสพื้นแบบอบครั้งเดียว — วิธีเดียวกับ ContactShadows ของ drei ทุกขั้น (frames=1 · smooth):
   วาดฉากจากใต้พื้นด้วย MeshDepthMaterial ที่ย้อมสี → เบลอแนวนอน/แนวตั้งสองรอบ → แผ่นโปร่งแปะ texture
   ยกมาเขียนเองเพราะต้องเข้าถึงวัสดุข้างใน: การคอมไพล์ล่วงหน้า (warmUp) หาเจอผ่าน userData.groveContact
   แล้วคอมไพล์ shader ของมันก่อนเฟรมแรก (ของ drei ซ่อนไว้ข้างใน — คอมไพล์แบบบล็อกในเฟรมแรกทุกครั้ง)
   - อบในเฟรมแรก แล้วอบใหม่ทุกครั้งที่กลับมามองเห็น (หมู่บ้านที่โผล่ขึ้นตาม scroll — เฟรมแรกซ่อนอยู่ เงาจะว่าง)
     ของเดิมอบใหม่ด้วยการ remount ContactShadows ทั้งตัว = render target + วัสดุใหม่ + คอมไพล์ใหม่ทุกครั้ง
   - เงาอยู่ใน group เดียวกับวัตถุ ขยับทั้งก้อนไปไหนเงาก็ยังถูกที่ ไม่ต้องอบซ้ำ */
type ContactParts = {
  /** อบเงาเดี๋ยวนี้ (นอกเฟรม) — warmUp เรียกเป็น task แยกก่อนเฟรมแรก · false = ยังอบไม่ได้ (ซ่อนอยู่ / ยังไม่ mount) */
  bake: () => boolean;
  target: WebGLRenderTarget;
  blurTarget: WebGLRenderTarget;
  plane: PlaneGeometry;
  blurPlane: Mesh;
  depth: MeshDepthMaterial;
  hBlur: ShaderMaterial;
  vBlur: ShaderMaterial;
};

function makeContactParts(
  resolution: number,
  width: number,
  depth: number,
  color: string,
): ContactParts {
  const target = new WebGLRenderTarget(resolution, resolution);
  const blurTarget = new WebGLRenderTarget(resolution, resolution);
  target.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false;
  const plane = new PlaneGeometry(width, depth).rotateX(Math.PI / 2);
  const blurPlane = new Mesh(plane);
  const depthMat = new MeshDepthMaterial();
  depthMat.depthTest = depthMat.depthWrite = false;
  const ucolor = new Color(color);
  depthMat.onBeforeCompile = (shader) => {
    shader.uniforms = { ...shader.uniforms, ucolor: { value: ucolor } };
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "uniform vec3 ucolor;\nvoid main() {\n",
    );
    /* ย้อมสีเงาและไล่ความเข้มตามระยะ — กลางเงาเข้มกว่าขอบ (สูตรเดียวกับ drei) */
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );",
    );
  };
  const hBlur = new ShaderMaterial(HorizontalBlurShader);
  const vBlur = new ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;
  return {
    bake: () => false,
    target,
    blurTarget,
    plane,
    blurPlane,
    depth: depthMat,
    hBlur,
    vBlur,
  };
}

export function GroundShadow({
  position,
  width,
  depth,
  far,
  opacity = 0.55,
  blur = 2.2,
  low,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  /** ระยะเหนือระนาบที่นับเป็นของที่ "แตะพื้น" */
  far: number;
  opacity?: number;
  blur?: number;
  low: boolean;
}) {
  const ref = useRef<Group>(null);
  const plate = useRef<Group>(null);
  const cam = useRef<OrthographicCamera>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const size = Math.max(width, depth);
  const resolution = low ? 512 : size > 60 ? 2048 : 1024;
  const parts = useMemo(
    () => makeContactParts(resolution, width, depth, M3D.shade),
    [resolution, width, depth],
  );
  useEffect(
    () => () => {
      parts.target.dispose();
      parts.blurTarget.dispose();
      parts.plane.dispose();
      parts.depth.dispose();
      parts.hBlur.dispose();
      parts.vBlur.dispose();
    },
    [parts],
  );

  /* นับเฟรมถอยหลังถึงการอบ: 1 = อบเฟรมนี้ · 2 = เฟรมหน้า (เพิ่งกลับมาเห็น — ให้ทุกอย่างในฉากขยับเข้าที่ก่อนหนึ่งเฟรม) */
  const due = useRef(1);
  const was = useRef(true);
  useEffect(() => {
    due.current = 1;
    invalidate();
  }, [parts, invalidate]);

  const blurPass = (amount: number) => {
    const c = cam.current;
    if (!c) return;
    const { blurPlane, hBlur, vBlur, target, blurTarget } = parts;
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hBlur.uniforms.tDiffuse!.value = target.texture;
    hBlur.uniforms.h!.value = amount / 256;
    gl.setRenderTarget(blurTarget);
    gl.render(blurPlane, c);
    blurPlane.material = vBlur;
    vBlur.uniforms.tDiffuse!.value = blurTarget.texture;
    vBlur.uniforms.v!.value = amount / 256;
    gl.setRenderTarget(target);
    gl.render(blurPlane, c);
    blurPlane.visible = false;
  };

  const bake = () => {
    const g = plate.current;
    const c = cam.current;
    if (!g || !c || !seen(ref.current)) return false;
    const background = scene.background;
    const override = scene.overrideMaterial;
    /* วัสดุ depth ไม่สนแสงและเงา — ข้ามการวาด shadow map ของแดดในรอบนี้ (ตอนวาดภาพจริงยังวาดตามปกติ) */
    const autoShadow = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    g.visible = false;
    scene.background = null;
    scene.overrideMaterial = parts.depth;
    gl.setRenderTarget(parts.target);
    gl.render(scene, c);
    blurPass(blur);
    blurPass(blur * 0.4);
    gl.setRenderTarget(null);
    g.visible = true;
    scene.overrideMaterial = override;
    scene.background = background;
    gl.shadowMap.autoUpdate = autoShadow;
    due.current = 0;
    return true;
  };
  /* ให้ warmUp เรียกได้ — effect ของ GroundShadow รันก่อน Precompile (ลูกก่อนพี่น้องที่อยู่ท้าย) */
  useEffect(() => {
    parts.bake = bake;
  });

  useFrame(() => {
    const now = seen(ref.current);
    if (now && !was.current) {
      due.current = 2;
      invalidate();
    }
    was.current = now;
    if (due.current === 0) return;
    due.current -= 1;
    if (due.current === 0) bake();
  });

  return (
    <group ref={ref}>
      <group
        ref={plate}
        rotation-x={Math.PI / 2}
        position={position}
        userData={{ groveContact: parts }}
      >
        <mesh geometry={parts.plane} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            transparent
            map={parts.target.texture}
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
        <orthographicCamera
          ref={cam}
          args={[-width / 2, width / 2, depth / 2, -depth / 2, 0, far]}
        />
      </group>
    </group>
  );
}
