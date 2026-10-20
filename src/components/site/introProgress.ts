/* ความคืบหน้าจริงของการโหลดฉาก 3D หน้าแรก — ตัวกลางระหว่าง HeroDiorama (ผู้รายงาน) กับ IntroLoader (ผู้แสดง)
   ไฟล์นี้ไม่ import three — อยู่ใน JS ก้อนแรกได้โดยไม่ลาก three.js ตามมา
   ที่มาของตัวเลข (ไม่มีตัวจับเวลาปลอม):
   - chunk: ไฟล์ JS ของฉาก (IsoCanvas + FloorPlanScene) โหลดเสร็จ — dynamic import resolve จริง
   - assets: texture และ HDRI ผ่าน THREE.DefaultLoadingManager (drei useProgress) — loaded / total จริง
   - compile: สัดส่วนวัสดุที่ GPU คอมไพล์ shader เสร็จแล้ว (IsoCanvas: Precompile) — ก่อนเฟรมแรก
   - ready: เฟรมแรกที่มีของในฉากขึ้นจอแล้ว (IsoCanvas: SceneReady)
   - failed: เครื่องนี้เปิด WebGL ไม่ได้ หรือโหลดฉากไม่สำเร็จ — ผู้แสดงเปิดหน้าทันทีพร้อมภาพนิ่ง */

/** ไฟล์ JS ของฉากที่ต้องรอ — ชื่อตรงกับที่ HeroScene รายงาน */
const CHUNKS = ["iso", "plan"] as const;
type Chunk = (typeof CHUNKS)[number];

const state = {
  chunks: new Set<Chunk>(),
  loaded: 0,
  total: 0,
  compiled: 0,
  ready: false,
  failed: false,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/* น้ำหนักของแต่ละขั้น: JS ของฉาก (three.js ราว 1.6 MB) หนักสุดบนเน็ตมือถือ · texture/HDRI รองลงมา ·
   คอมไพล์ shader (วัดได้จริงทีละวัสดุ) · ส่วนที่เหลือคือวาดเฟรมแรก ซึ่งรู้ได้แค่ว่า "เสร็จแล้ว" (ready) */
const W_CHUNKS = 0.4;
const W_ASSETS = 0.3;
const W_COMPILE = 0.25;

export const introProgress = {
  /** 0–1 · 1 = ฉากพร้อม หรือพัง (ไม่ต้องรอแล้วทั้งคู่) */
  value() {
    if (state.ready || state.failed) return 1;
    const chunks = (state.chunks.size / CHUNKS.length) * W_CHUNKS;
    const assets = state.total > 0 ? (state.loaded / state.total) * W_ASSETS : 0;
    return Math.min(0.97, chunks + assets + state.compiled * W_COMPILE);
  },
  done() {
    return state.ready || state.failed;
  },
  chunk(name: Chunk) {
    if (state.chunks.has(name)) return;
    state.chunks.add(name);
    emit();
  },
  assets(loaded: number, total: number) {
    state.loaded = loaded;
    state.total = total;
    emit();
  },
  compile(fraction: number) {
    if (fraction <= state.compiled) return;
    state.compiled = Math.min(1, fraction);
    emit();
  },
  ready() {
    state.ready = true;
    emit();
  },
  fail() {
    state.failed = true;
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
