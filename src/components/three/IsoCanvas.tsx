"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import {
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
  type OrthographicCamera,
} from "three";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useTokenColor } from "@/lib/useTokenColor";
import { CAMERA, LIGHT, SHADOW, isoFitZoom, lightHour, sunPosition } from "./materials";
import { daylightAt } from "./MoodRig";
import {
  PostFX,
  SHADOW_MAP,
  SkyEnvironment,
  dprFor,
  glProps,
  skyFor,
  untoneNeutral,
  useLowPower,
  warmPasses,
  warmPmrem,
  warmUp,
  type ComposerLike,
} from "./look";

/* กล้อง Orthographic isometric + แสงตาม DESIGN-SPEC §5 (ค่าตามสเปกทุกตัว)
   frameloop="demand" — วาดเฉพาะตอนมีอะไรเปลี่ยน ไม่กินเครื่องตอนนิ่ง */

const rad = (deg: number) => (deg * Math.PI) / 180;
const el = rad(CAMERA.elevationDeg);
const az = rad(CAMERA.azimuthDeg);
const INITIAL_POSITION: [number, number, number] = [
  CAMERA.radius * Math.cos(el) * Math.sin(az),
  CAMERA.radius * Math.sin(el),
  CAMERA.radius * Math.cos(el) * Math.cos(az),
];

/* พื้นหลัง canvas = token ของหน้า (§5) — ไม่มี halo ไม่มี spotlight รอบ diorama
   ทุกพิกเซลในฉากผ่าน tone mapping ท้าย composer: ส่งสี token ตรงๆ ขาว #FFFFFF จะออกมาเทาอ่อน
   แล้วเห็นขอบกรอบ canvas บนหน้า — จึงส่งค่าที่ tone mapping แล้วได้สี token พอดี */
/** บอกว่าฉากพร้อมเมื่อของในฉากวาดลงจอแล้วจริง ไม่ใช่แค่ได้ WebGL context
    อยู่ใน Suspense เดียวกับ children — ชิ้น lazy ยังโหลดไม่เสร็จ ตัวนี้ก็ยังไม่ mount
    useFrame ทำงานก่อนวาดเฟรมนั้น · รอ rAF ถัดไปจึงแน่ใจว่าเฟรมแรกที่มีของขึ้นจอแล้ว
    ผู้เรียกใช้สัญญาณนี้ crossfade จากภาพนิ่ง — ถ้าส่งเร็วกว่านี้จะเห็นพื้นว่างระหว่างภาพนิ่งจางกับโมเดลมา */
function SceneReady({ onReady }: { onReady: (() => void) | undefined }) {
  const invalidate = useThree((s) => s.invalidate);
  const sent = useRef(false);
  const cb = useRef(onReady);
  cb.current = onReady;
  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    requestAnimationFrame(() => cb.current?.());
  });
  /* frameloop demand ไม่วาดเองถ้าไม่มีใครขอ */
  useEffect(() => invalidate(), [invalidate]);
  return null;
}

/** คอมไพล์ shader ทุกตัวของฉากล่วงหน้าแบบไม่บล็อก (look.tsx: warmUp) — ระหว่างนี้ canvas ยังไม่วาดสักเฟรม (frameloop "never")
    อยู่ใน Suspense เดียวกับฉาก จึงเริ่มเมื่อชิ้น lazy · texture · HDRI (PMREM ใน scene.environment) พร้อมครบ
    ไม่จบใน PRECOMPILE_MAX_MS (driver ค้าง / context หาย) = ปล่อยให้วาดเลย คอมไพล์ตอนวาดแบบเดิม ไม่ค้างฉากไว้ */
const PRECOMPILE_MAX_MS = 10_000;
function Precompile({
  onDone,
  onProgress,
  composer,
}: {
  onDone: () => void;
  onProgress: ((fraction: number) => void) | undefined;
  /** EffectComposer ของ canvas (PostFX) — shader ของทุก pass คอมไพล์ขนานไปพร้อมฉาก */
  composer: RefObject<ComposerLike | null>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const cb = useRef({ onDone, onProgress });
  cb.current = { onDone, onProgress };
  useEffect(() => {
    let live = true;
    const finish = () => {
      if (!live) return;
      live = false;
      window.clearTimeout(timer);
      cb.current.onProgress?.(1);
      cb.current.onDone();
    };
    const timer = window.setTimeout(finish, PRECOMPILE_MAX_MS);
    /* ฉากทุกตัวที่ใช้ IsoCanvas วาดผ่าน EffectComposer (PostFX) — คอมไพล์ให้ตรงกับการวาดลง render target */
    /* composer สร้างเสร็จตั้งแต่ canvas เกิด (ก่อนฉากโหลดครบหลายวินาที) — ตอนนี้ pass ครบแล้ว */
    const passes = composer.current?.passes ?? [];
    Promise.all([
      warmUp(gl, scene, camera, {
        toTarget: true,
        onProgress: (f) => cb.current.onProgress?.(f),
        alive: () => live,
      }),
      warmPasses(gl, passes, () => live),
    ]).then(finish, finish);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [gl, scene, camera, composer]);
  return null;
}

/** เริ่มคอมไพล์ shader ของ PMREM ทันทีที่มี renderer — ระหว่างรอไฟล์ HDRI (look.tsx: warmPmrem) */
function PmremWarm({ low }: { low: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => warmPmrem(gl, skyFor(low).width), [gl, low]);
  return null;
}

/** frameloop "never" → "demand" ไม่วาดเองจนกว่าจะมีคนขอ — ขอเฟรมแรกทันทีที่ปลดล็อก */
function Kick({ on }: { on: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const frameloop = useThree((s) => s.frameloop);
  useEffect(() => {
    if (on && frameloop !== "never") invalidate();
  }, [on, frameloop, invalidate]);
  return null;
}

function Background({ token }: { token: string }) {
  const bg = useTokenColor(token);
  const c = useMemo(() => (bg ? untoneNeutral(bg) : null), [bg]);
  return c ? <color attach="background" args={[c.r, c.g, c.b]} /> : null;
}

/** องศาต่อวินาทีของการหมุนเอง — §4: 8 องศา/นาที */
const AUTO_ROTATE_RAD_PER_SEC = rad(8 / 60);
/** กล้องหมุนช้าของ mood studio (ผู้ชมกดเปิดเอง ไม่ใช่การหมุนเองตอนเปิดหน้า) — รอบละ 2 นาที */
const CINEMATIC_RAD_PER_SEC = rad(3);

type Controls = ComponentRef<typeof OrbitControls>;

/* ตั้ง zoom จากขนาดเงาฉายของกล่องบ้านในมุม isometric จริง ไม่ใช่เดาจากด้านที่ยาวที่สุด
   กว้างบนจอ = (W+D)·cos45 · สูงบนจอ = (W+D)·cos45·sin(el) + ความสูงบ้าน */
type Box = { w: number; d: number; h: number; cx: number; cz: number };

/** วางภาพในกรอบ canvas: ย่อ scale เท่า แล้วเลื่อนจุดกลางภาพไป shift (สัดส่วนของกว้าง/สูง)
    แทนการย่อทั้ง canvas ด้วย CSS — ซูมเข้าแล้วของล้นถึงขอบจอจริง ไม่โดนตัดเป็นกรอบสี่เหลี่ยมกลางจอ */
export type CanvasFrame = { scale: number; shift: readonly [number, number] };

function Rig({
  box,
  wideBox,
  frame,
  onFit,
}: {
  box: Box;
  wideBox?: Box;
  frame?: CanvasFrame | undefined;
  onFit: (near: number, wide: number) => void;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const k = frame?.scale ?? 1;
    const fit = isoFitZoom(box, size.width, size.height) * k;
    camera.zoom = fit;
    onFit(fit, wideBox ? isoFitZoom(wideBox, size.width, size.height) * k : fit);
    if (frame) {
      const { width: w, height: h } = size;
      camera.setViewOffset(w, h, -frame.shift[0] * w, -frame.shift[1] * h, w, h);
    } else camera.clearViewOffset();
    /* กล้อง ortho: ฉากที่กว้างกว่าระยะกล้องจะมีมุมใกล้ตกหลังระนาบ near แล้วโดนตัดขวาง
       เปิดกรอบลึกให้คลุมฉากที่ใหญ่ที่สุดที่จะถูกวาดเสมอ (ortho รับ near ติดลบได้) */
    const far = wideBox ?? box;
    const reach = Math.hypot(far.w, far.d) + far.h + CAMERA.radius;
    camera.near = -reach;
    camera.far = reach * 3;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, box, wideBox, frame, invalidate, onFit]);

  return null;
}

/* frameloop="demand" วาดเฟรมเดียวต่อหนึ่ง event — damping ของ OrbitControls จึงไม่มีเฟรมให้ไหลต่อ
   ทำให้ซูมและหมุนกระตุกเป็นขั้น ตัวนี้ต่อลมหายใจให้อีก 450 ms หลัง event สุดท้าย แล้วค่อยปล่อยให้นิ่ง */
function KeepAlive({ controls }: { controls: Controls | null }) {
  const until = useRef(0);
  useEffect(() => {
    if (!controls) return;
    const onChange = () => {
      until.current = performance.now() + 450;
    };
    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controls]);
  useFrame(({ invalidate }) => {
    if (performance.now() < until.current) invalidate();
  });
  return null;
}

/* ปล่อยมือแล้วหมุนเข้าหามุมมุมหนึ่งใน 4 มุมทแยง (45° 135° 225° 315°)
   ไม่ใช่ทุกๆ 45° — ที่ 0/90/180/270 ผนังนอกสองด้านจะตั้งฉากกับกล้องพอดี
   ค่า dot เป็น 0 ทั้งคู่ ผนังเลยค้างโปร่งใสครึ่งเดียวทั้งสองด้าน แล้วขึ้นเป็นเส้นแปลกๆ ทะลุห้อง */
function SnapAzimuth({
  controls,
  step,
  instant,
}: {
  controls: Controls | null;
  step: number;
  instant: boolean;
}) {
  const target = useRef<number | null>(null);
  useEffect(() => {
    if (!controls || step <= 0) return;
    const onEnd = () => {
      const s = (step * Math.PI) / 180;
      const off = s / 2;
      target.current = Math.round((controls.getAzimuthalAngle() - off) / s) * s + off;
    };
    controls.addEventListener("end", onEnd);
    return () => controls.removeEventListener("end", onEnd);
  }, [controls, step]);

  useFrame(({ invalidate }) => {
    const goal = target.current;
    if (goal === null || !controls) return;
    const now = controls.getAzimuthalAngle();
    const diff = goal - now;
    if (instant || Math.abs(diff) < 0.003) {
      controls.setAzimuthalAngle(goal);
      target.current = null;
    } else {
      controls.setAzimuthalAngle(now + diff * 0.2);
    }
    controls.update();
    invalidate();
  });
  return null;
}

/* กล้องถูกขับด้วยความคืบหน้าของ scroll — อ่าน ref ทุกเฟรม ไม่ใช่รับเป็น prop
   เพราะ prop ที่เปลี่ยนทุกเฟรมแปลว่า React ต้อง render ใหม่ทุกเฟรมที่เลื่อนหน้า
   มุมฐานถูกจำไว้ตราบที่ยังไม่เริ่มเลื่อน ตอนสลับจากหมุนเองมาเป็น scroll ภาพจึงไม่กระโดด */
function ScrollCamera({
  controls,
  progressRef,
  sweepDeg,
  nearFit,
  wideFit,
  box,
  wideBox,
  range,
  onPose,
}: {
  controls: Controls | null;
  progressRef: RefObject<number>;
  sweepDeg: number;
  nearFit: number;
  wideFit: number;
  box: Box;
  wideBox?: Box;
  range: readonly [number, number];
  /** ความคืบหน้าที่กล้องวาดล่าสุด — ส่งเฉพาะตอนค่าเปลี่ยน (HeroDiorama เขียนลง data-pose ให้เทสต์อ่าน) */
  onPose?: (p: number) => void;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  /* มุมฐาน = มุมที่หมุนเองค้างไว้ตอนเริ่มเลื่อนครั้งแรก — จำครั้งเดียว แล้วใช้เป็นท่าแรกของฉากตลอดไป */
  const base = useRef<number | null>(null);
  const posed = useRef(Number.NaN);

  useFrame(() => {
    if (!controls || nearFit <= 0) return;
    const p = Math.min(1, Math.max(0, progressRef.current));
    /* ยังไม่เคยเลื่อน: ปล่อยให้หมุนเอง (AutoRotate) และจำมุมล่าสุดไว้เป็นมุมฐาน
       เคยเลื่อนแล้วกลับมาที่ 0 (กด Home, scrollTo(0), ย้อนหน้าด้วยปุ่ม back) ต้องวางกล้องกลับท่าแรกจริง
       เดิมคืนค่าออกไปเฉยๆ ตรงนี้ — กล้องค้างท่าถอยไกลจากเฟรมก่อน ภาพบนสุดของหน้าเลยเป็นพื้นมะกอกว่าง
       จนกว่าล้อเมาส์จะขยับอีกครั้ง (critique 2026-10-02 [P1]) */
    if (base.current === null) {
      if (p <= 0) return;
      base.current = controls.getAzimuthalAngle();
    }
    if (posed.current !== p) {
      posed.current = p;
      onPose?.(p);
    }
    /* ease ทั้งเส้นทาง ไม่ใช่ linear — ออกตัวและเข้าจอดนุ่ม เหมือนกล้องที่มีคนถือ */
    const t = p * p * (3 - 2 * p);
    controls.setAzimuthalAngle(base.current + rad(sweepDeg) * t);

    /* ถอยกล้องจากกล่องใกล้ไปกล่องไกล — zoom เป็นสเกลคูณ จึง lerp บน log ไม่ใช่เส้นตรง
       ไม่งั้นช่วงต้นของการถอยจะพรวดแล้วช่วงท้ายคลาน */
    const [a, b] = range;
    const q = Math.min(1, Math.max(0, (p - a) / (b - a)));
    const z = q * q * (3 - 2 * q);
    const zoom = Math.exp(Math.log(nearFit) * (1 - z) + Math.log(wideFit) * z);
    const far = wideBox ?? box;
    /* จุดเล็งเลื่อนตามความกว้างของกรอบภาพ (1/zoom) ไม่ใช่ตาม z ตรงๆ
       ถ้าเลื่อนตาม z กลางทางกล้องยังใกล้อยู่แต่เล็งไปกลางหมู่บ้านแล้ว — ภาพเลยเป็นหลังคาหลังอื่นเต็มจอ
       แบบนี้บ้านพระเอกยังอยู่ในกรอบจนกรอบกว้างพอจะเห็นทั้งโครงการ */
    const span = 1 / zoom - 1 / nearFit;
    const w = Math.abs(1 / wideFit - 1 / nearFit) > 1e-9 ? span / (1 / wideFit - 1 / nearFit) : z;
    controls.target.set(
      box.cx + (far.cx - box.cx) * w,
      box.h / 2.6 + (far.h / 2.6 - box.h / 2.6) * w,
      box.cz + (far.cz - box.cz) * w,
    );
    controls.update();
    if (Math.abs(camera.zoom - zoom) > 0.0005) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** ส่ง invalidate() ของ canvas ออกไปให้ผู้ขับ scroll ที่อยู่นอก canvas — frameloop demand ไม่วาดเองถ้าไม่มีใครขอ
    ความคืบหน้าเปลี่ยนตอนฉากยังวาดแบบ demand (เช่นกระโดดกลับบนสุดจากข้างล่าง ก่อน IntersectionObserver รายงานว่าฉากกลับเข้าจอ)
    จึงต้องขอเฟรมเองทุกครั้ง ไม่งั้นภาพค้างท่าเดิม */
function ExposeInvalidate({ target }: { target: RefObject<(() => void) | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    target.current = () => invalidate();
    return () => {
      target.current = null;
    };
  }, [invalidate, target]);
  return null;
}

function AutoRotate({
  controls,
  active,
  speed,
}: {
  controls: Controls | null;
  active: boolean;
  speed: number;
}) {
  useFrame(({ invalidate }, delta) => {
    if (!active || !controls) return;
    /* delta ของเฟรมแรกหลังนิ่งนาน (frameloop demand) ยาวเป็นวินาที — ตัดไว้ไม่ให้กล้องกระโดด */
    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + speed * Math.min(delta, 0.05));
    controls.update();
    invalidate();
  });
  return null;
}

/* แดดหนึ่งดวงที่กรอบเงาตามกรอบภาพ — กรอบเงาแคบ = เงาคมและนุ่มสม่ำเสมอทุกระดับซูม
   ของเดิมกางกรอบคลุมทั้งหมู่บ้าน 180 ม. ตลอด บ้านพระเอกเลยได้เงาจาก texel ขนาดฝ่ามือ
   ขนาดกรอบปัดเป็นขั้น 1/8 ออกเทฟ และจุดเล็งปัดตาม texel — กันเงาสั่นตอนกล้องเดิน */
const ORIGIN = new Vector3();
function Sun({
  hour,
  northDeg,
  maxSpan,
  margin,
  mapSize,
  daylight = false,
  hemi,
}: {
  hour: number;
  /** mood studio: สีและความแรงของแดด/แสงอ้อมตามเวลา (DAYLIGHT_KEYS) และแดดค่อยๆ เดินไปเวลาใหม่
      ไม่ส่ง = สีและความเข้มคงที่ตาม §5 แบบเดิม */
  daylight?: boolean;
  hemi?: RefObject<HemisphereLight | null>;
  northDeg: number;
  /** ครึ่งกว้างสูงสุดของกรอบเงา — ทั้งฉากที่ใหญ่ที่สุดที่จะถูกวาด */
  maxSpan: number;
  /** เผื่อขอบให้ของสูงนอกภาพที่ทอดเงาเข้ามาในภาพ */
  margin: number;
  mapSize: number;
}) {
  const light = useRef<DirectionalLight>(null);
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as { target: Vector3 } | null;
  const last = useRef({ span: 0, x: Number.NaN, y: Number.NaN, z: Number.NaN, hour: -1 });
  const scene = useThree((s) => s.scene);
  const invalidateNow = useThree((s) => s.invalidate);
  /** ชั่วโมงที่แดดอยู่ตอนนี้ — studio ไล่เข้าหาชั่วโมงที่เลือก (แดดเดิน ไม่กระโดด) */
  const shown = useRef(hour);
  useEffect(() => invalidateNow(), [hour, invalidateNow]);

  useFrame(({ invalidate }) => {
    const l = light.current;
    if (!l || camera.zoom <= 0) return;
    let h = hour;
    if (daylight) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const prev = shown.current;
      h = reduced || Math.abs(hour - prev) < 0.01 ? hour : prev + (hour - prev) * 0.1;
      shown.current = h;
      if (h !== hour) invalidate();
      const d = daylightAt(h);
      l.color.copy(d.sun);
      l.intensity = d.sunI;
      if (hemi?.current) hemi.current.intensity = d.hemi;
      scene.environmentIntensity = d.env;
      h = lightHour(h);
    }
    const el = rad(CAMERA.elevationDeg);
    const visW = size.width / camera.zoom;
    const visD = size.height / camera.zoom / Math.sin(el);
    const want = Math.min(maxSpan, 0.5 * Math.hypot(visW, visD) + margin);
    const span = 2 ** (Math.ceil(Math.log2(want) * 8) / 8);
    const texel = (span * 2) / mapSize;
    const t = controls?.target ?? ORIGIN;
    const x = Math.round(t.x / texel) * texel;
    const y = Math.round(t.y / texel) * texel;
    const z = Math.round(t.z / texel) * texel;
    const p = last.current;
    if (p.span === span && p.x === x && p.y === y && p.z === z && p.hour === h) return;
    last.current = { span, x, y, z, hour: h };

    const [dx, dy, dz] = sunPosition(h, 1, northDeg);
    const dist = span * 2 + 10;
    l.target.position.set(x, y, z);
    l.target.updateMatrixWorld();
    l.position.set(x + dx * dist, y + dy * dist, z + dz * dist);
    /* normalBias ตามขนาด texel — กรอบกว้างระดับหมู่บ้าน texel ใหญ่เป็นสิบเซนติเมตร
       ค่าคงที่เดิมเอาไม่อยู่ หลังคาเลยขึ้นลายจุด (shadow acne) */
    l.shadow.normalBias = Math.max(SHADOW.normalBias, texel * 1.5);
    const cam = l.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 0.5;
    cam.far = dist + span * 2 + 10;
    cam.updateProjectionMatrix();
    invalidate();
  });

  return (
    <directionalLight
      ref={light}
      color={LIGHT.sun}
      intensity={LIGHT.sunIntensity}
      castShadow
      shadow-mapSize-width={mapSize}
      shadow-mapSize-height={mapSize}
      shadow-radius={SHADOW.radius}
      shadow-blurSamples={SHADOW.blurSamples}
      shadow-normalBias={SHADOW.normalBias}
    />
  );
}

/** ความคืบหน้าจริงของ texture/HDRI ที่โหลดผ่าน THREE.DefaultLoadingManager (drei useProgress)
    อยู่ในไฟล์นี้เพราะไฟล์นี้อยู่ในก้อน three.js อยู่แล้ว — ผู้เรียกฝั่งหน้าแรก (intro loader) ไม่ต้อง import drei เอง
    คืนฟังก์ชันเลิกฟัง */
export function watchAssetLoading(fn: (loaded: number, total: number) => void) {
  const send = ({ loaded, total }: { loaded: number; total: number }) => fn(loaded, total);
  send(useProgress.getState());
  return useProgress.subscribe(send);
}

export function IsoCanvas({
  children,
  box,
  autoRotate = false,
  rotatable = true,
  zoomable = true,
  backgroundToken = "--canvas",
  scroll,
  active = true,
  interactive = true,
  onReady,
  sunHour = 15,
  northDeg = 0,
  snapDeg = 45,
  label,
  aoRadius,
  onCompile,
  frame,
  daylight = false,
  cinematic = false,
}: {
  children: ReactNode;
  /** mood studio: แสงเปลี่ยนสีและความแรงตามเวลา 06:00-22:00 (กลางคืน = แสงจันทร์) — ดู Sun */
  daylight?: boolean;
  /** mood studio: กล้องหมุนช้ารอบบ้านจนกว่าผู้ชมจะแตะ (ผู้ชมกดเปิดเอง) */
  cinematic?: boolean;
  /** กล่องครอบวัตถุเป็นเมตร (กว้าง ลึก สูง) ใช้ตั้ง zoom ให้พอดีกรอบ */
  box: { w: number; d: number; h: number; cx: number; cz: number };
  autoRotate?: boolean;
  /** false = ตรึงมุมมองไว้ที่มุม isometric มาตรฐาน ผู้ใช้ลากหมุนไม่ได้ */
  rotatable?: boolean;
  /** false = สกรอลล์เมาส์ผ่าน canvas แล้วหน้าเว็บเลื่อนตามปกติ ไม่ถูกดูดไปซูมโมเดล */
  zoomable?: boolean;
  /** token พื้นหลังของฉาก — §5 กำหนดให้ตรงกับพื้นของหน้า ถ้า section เป็นแถบหมึกก็ส่ง --ink */
  backgroundToken?: string;
  /** ให้ scroll ของหน้าเป็นคนขับกล้อง — ref ความคืบหน้า 0-1 กับปลายทางของการกวาดและการถอย
      wideBox คือกล่องของฉากที่ใหญ่กว่า กล้องจะเดินทางจาก box ไป wideBox ภายใน range
      live = true ให้ canvas วาดต่อเนื่อง (frameloop always) เพื่อให้ไหลลื่นจริง */
  scroll?: {
    progressRef: RefObject<number>;
    sweepDeg: number;
    wideBox: Box;
    range: readonly [number, number];
    live: boolean;
    /** canvas เติม invalidate() ของมันลงที่นี่ — ผู้ขับ scroll เรียกเมื่อความคืบหน้าเปลี่ยน */
    invalidateRef?: RefObject<(() => void) | null>;
    /** ความคืบหน้าที่กล้องวาดจริง (ไม่ใช่ค่าที่อ่านจาก scroll) */
    onPose?: (p: number) => void;
  };
  /** false เมื่อ canvas ถูกซ่อนอยู่ใต้มุมมองอื่น — ต้องไม่ดักคลิกและไม่รับโฟกัส
      (R3F ใส่ pointer-events: auto ที่ div ของ Canvas เอง จึงต้องปิดที่ตัวมันตรงๆ) */
  active?: boolean;
  /** false = canvas ไม่รับ pointer event เลย (ฉากโชว์หน้าแรก) — แตะ/คลิกผ่านไปที่หน้า เลื่อนหน้าได้เสมอ
      ไม่มีการ raycast เลือกห้อง/แปลง · ต่างจาก active ตรงที่ canvas ยังมองเห็นและเป็นฉากหลัก */
  interactive?: boolean;
  /** เรียกเมื่อ canvas พร้อมวาดแล้ว ใช้ไล่ poster ออก */
  onReady?: () => void;
  /** เวลาของวัน 6-18 — เปลี่ยนทิศแดด (สีและความเข้มคงที่ตาม §5) */
  sunHour?: number;
  /** ทิศเหนือของแบบบ้านในฉาก (house.northDeg) — ฉากหมู่บ้านใช้ 0 ตามผังโครงการ */
  northDeg?: number;
  /** ปล่อยมือแล้วเข้าหามุมมาตรฐานทุกกี่องศา — 0 = ไม่ snap */
  snapDeg?: number;
  label: string;
  /** รัศมี AO เป็นเมตร — ไม่ส่ง = 1/30 ของด้านยาวของ box */
  aoRadius?: number;
  /** ความคืบหน้าการคอมไพล์ shader 0-1 (ก่อนเฟรมแรก) — intro loader หน้าแรกแสดงเป็นความคืบหน้าจริง */
  onCompile?: (fraction: number) => void;
  /** ย่อและเลื่อนภาพในกรอบ (Rig) — ค่าคงที่ระดับ module เท่านั้น object ใหม่ทุก render = ตั้งกล้องใหม่ทุก render */
  frame?: CanvasFrame | undefined;
}) {
  const low = useLowPower();
  const controlsRef = useRef<Controls>(null);
  const [controls, setControls] = useState<Controls | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [fitZoom, setFitZoom] = useState(0);
  const [wideFit, setWideFit] = useState(0);
  const onFit = useCallback((near: number, wide: number) => {
    setFitZoom(near);
    setWideFit(wide);
  }, []);
  const reduced = usePrefersReducedMotion();
  /* ยังไม่วาดสักเฟรมจนกว่า shader ทั้งฉากคอมไพล์เสร็จ (Precompile) — เฟรมแรกจึงไม่มีการคอมไพล์ค้าง main thread */
  const [compiled, setCompiled] = useState(false);
  const onCompiled = useCallback(() => setCompiled(true), []);
  const composer = useRef<ComposerLike | null>(null);

  /* กรอบเงาสูงสุดต้องคลุมทั้งฉาก — ฉากใหญ่อย่างผังโครงการกว้างกว่า 180 ม.
     ตอนกล้องเดินทางไปฉากใหญ่ ต้องคลุมปลายทางด้วย ไม่งั้นบ้านนอกกรอบจะไม่มีเงาเลย
     กรอบจริงแคบลงตามกรอบภาพ (Sun) */
  const shadowBox = scroll?.wideBox ?? box;
  const shadowSpan = Math.max(shadowBox.w, shadowBox.d) * 0.75 + shadowBox.h;
  const ao = aoRadius ?? Math.min(3, Math.max(0.35, Math.max(box.w, box.d) / 30));

  /* §4: หยุดหมุนทันทีที่ผู้ใช้แตะ และไม่หมุนเลยเมื่อผู้ใช้ขอ reduced motion */
  const spinning = (autoRotate || cinematic) && !interacted && !reduced;
  /* เปิดกล้องหมุนช้าใหม่หลังเคยแตะฉาก = เริ่มหมุนอีกรอบ */
  useEffect(() => {
    if (cinematic) setInteracted(false);
  }, [cinematic]);
  const hemi = useRef<HemisphereLight>(null);

  const nudge = (key: string) => {
    const c = controlsRef.current;
    if (!c || !rotatable) return false;
    const step = rad(snapDeg > 0 ? snapDeg : 5);
    if (key === "ArrowLeft") c.setAzimuthalAngle(c.getAzimuthalAngle() - step);
    else if (key === "ArrowRight") c.setAzimuthalAngle(c.getAzimuthalAngle() + step);
    else return false;
    c.update();
    return true;
  };

  return (
    <div
      tabIndex={active && rotatable ? 0 : -1}
      role={rotatable ? "application" : "img"}
      aria-label={label}
      className={`focus-visible:outline-pine h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 ${
        rotatable || zoomable ? "touch-none" : ""
      }`}
      onKeyDown={(e) => {
        if (!nudge(e.key)) return;
        e.preventDefault();
        setInteracted(true);
      }}
      onPointerDown={() => setInteracted(true)}
    >
      <Canvas
        style={{ pointerEvents: active && interactive ? "auto" : "none" }}
        frameloop={!compiled ? "never" : scroll?.live ? "always" : "demand"}
        /* ฉากที่ scroll ขับ (หน้าแรก) อยู่ในกรอบที่ย่อด้วย CSS transform ตอนเฟรมแรก (HeroDiorama: intro)
           วัดขนาดจาก offsetWidth/Height ไม่ใช่ getBoundingClientRect ที่รวม transform แล้ว
           และไม่วัดใหม่ตอนเลื่อนหน้า — ไม่งั้น canvas ถูก resize ทุกครั้งที่ transform เปลี่ยนตาม scroll */
        resize={scroll ? { offsetSize: true, scroll: false } : undefined}
        shadows={SHADOW_MAP}
        dpr={dprFor(low)}
        orthographic
        camera={{ position: INITIAL_POSITION, near: 0.1, far: 200, zoom: 40 }}
        gl={glProps}
      >
        <PmremWarm low={low} />
        <Background token={backgroundToken} />
        <Rig box={box} wideBox={scroll?.wideBox} frame={frame} onFit={onFit} />

        {/* §5 — แสงอ้อมจาก HDRI ฟ้า (ไม่มีดวงอาทิตย์ในไฟล์ · โหลดใน Suspense เดียวกับฉาก ด้านล่าง)
            + hemisphere อุ่น/เขียวหม่น + แดดอุ่นดวงเดียว เงา PCF นุ่ม */}
        <hemisphereLight
          ref={hemi}
          color={LIGHT.hemiSky}
          groundColor={LIGHT.hemiGround}
          intensity={LIGHT.hemiIntensity}
        />
        <Sun
          hour={sunHour}
          northDeg={northDeg}
          maxSpan={shadowSpan}
          margin={box.h * 1.5 + 1}
          mapSize={low ? SHADOW.mapMobile : SHADOW.mapDesktop}
          daylight={daylight}
          hemi={hemi}
        />

        {/* Suspense ของฉากเอง — ชิ้น lazy ใน children ยังโหลดอยู่ canvas ไม่ถูกซ่อนทั้งก้อน (R3F ส่ง suspend ขึ้นไปหา
            Suspense ฝั่ง DOM ถ้าข้างในไม่มี) และ onReady รอจนชิ้นเหล่านั้นขึ้นจอจริง */}
        <Suspense fallback={null}>
          <SkyEnvironment low={low} />
          {children}
          <Precompile onDone={onCompiled} onProgress={onCompile} composer={composer} />
          <SceneReady onReady={onReady} />
        </Suspense>
        <Kick on={compiled} />

        <PostFX low={low} aoRadius={ao} composerRef={composer} />

        <OrbitControls
          ref={controlsRef}
          onUpdate={(self: Controls) => setControls(self)}
          makeDefault
          enableRotate={rotatable}
          enableZoom={zoomable}
          enablePan={false}
          enableDamping={!reduced}
          dampingFactor={0.08}
          target={[box.cx, box.h / 2.6, box.cz]}
          /* ล็อกมุมก้มไว้ที่ 35 องศาตาม §5 — แกนนี้ไม่ได้ให้ข้อมูลอะไรเพิ่ม
             ปล่อยให้ก้มเงยอิสระมีแต่ทำให้ผู้ใช้หลุดกรอบอ้างอิงของภาพ Isometric */
          minPolarAngle={rad(90 - CAMERA.elevationDeg)}
          maxPolarAngle={rad(90 - CAMERA.elevationDeg)}
          zoomSpeed={0.55}
          /* OrbitControls.update() หนีบ camera.zoom เข้าช่วงนี้ทุกเฟรม — ตอนกล้องเดินทาง
             ไปฉากที่ใหญ่กว่า 14 เท่า ช่วงต้องเปิดให้ถึง ไม่งั้นการถอยถูกดึงกลับทันที */
          minZoom={fitZoom > 0 ? Math.min(fitZoom, wideFit || fitZoom) * 0.75 : 12}
          maxZoom={fitZoom > 0 ? fitZoom * 2.4 : 160}
        />
        <KeepAlive controls={controls} />
        <SnapAzimuth controls={controls} step={rotatable ? snapDeg : 0} instant={reduced} />
        <AutoRotate
          controls={controls}
          active={spinning}
          speed={cinematic ? CINEMATIC_RAD_PER_SEC : AUTO_ROTATE_RAD_PER_SEC}
        />
        {scroll && (
          <ScrollCamera
            controls={controls}
            progressRef={scroll.progressRef}
            sweepDeg={scroll.sweepDeg}
            nearFit={fitZoom}
            wideFit={wideFit}
            box={box}
            wideBox={scroll.wideBox}
            range={scroll.range}
            onPose={scroll.onPose}
          />
        )}
        {scroll?.invalidateRef && <ExposeInvalidate target={scroll.invalidateRef} />}
      </Canvas>
    </div>
  );
}
