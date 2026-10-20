/* ภาษาภายนอกของบ้าน The Grove: บ้านจั่วโมเดิร์นชั้นเดียว/บ้านแฝดสองชั้น ขอบจั่วเทา ระแนงไม้ ผนังขาว
   — ไม่ใช่บ้านในแบนเนอร์ (จั่วคู่ระแนงไม้ ระเบียงราวขาว) ซึ่งไม่ใช่แบบที่ขายจริง
   คำนวณจากห้องและช่องเปิดชุดเดียวกับแปลน + ฟิลด์ facade ของแบบบ้าน ไม่มีพิกัดใดเก็บซ้ำใน data:
   หลังคา จั่ว โรงจอดรถ รั้ว ทางเดิน แนวพุ่มไม้ ล้วนได้มาจากกรอบห้องกับขนาดแปลง
   แปลน 2D, diorama, โหมดเดินดู และหมู่บ้าน จึงยังเป็นมุมมองของก้อนเดียวกัน

   แกนเดียวกับแปลนบ้าน: x ซ้าย→ขวา, z หน้า→หลัง — ด้านหน้าบ้าน (ด้านที่ติดถนน) คือ z น้อยสุด
   y = 0 คือผิวพื้นในบ้าน · สนามอยู่ต่ำกว่าเท่าความสูงฐานบ้าน (PLINTH_H)

   โมดูลนี้ไม่พึ่ง three — node (pnpm geometry:check) เรียกได้ตรงๆ */

import {
  WALL_H,
  WALL_M,
  mm,
  openingV,
  type Box2,
  type GeomFurniture,
  type GeomOpening,
  type GeomRoom,
} from "./index.ts";

/** ฐานบ้านยกจากสนาม (เมตร) — แถบปูนเทาเข้มใต้ผนังในภาพอ้างอิง */
export const PLINTH_H = 0.35;
/** ระยะพื้นถึงพื้นของบ้านสองชั้น */
export const STOREY_H = WALL_H + 0.3;
/** กรอบจั่วเทาเข้ม: หน้ากว้างของโปรไฟล์ (≈ 30 ซม. ทั้งบ้านเดี่ยวและบ้านแฝด) และระยะที่ยื่นพ้นผนังหน้า (ด้านในกรุไม้) */
export const FRAME_T = 0.3;
export const FRAME_PROUD = 0.45;
/** ชายคายื่นด้านนอกของปั้นหยา */
export const EAVE_OH = 0.45;
/** หลังคาจั่วยื่นพ้นผิวนอกของกรอบจั่วด้านข้าง */
export const CAP_OH = 0.12;
/** ความหนาแผ่นหลังคาจั่ว / ปั้นหยา */
export const GABLE_ROOF_T = 0.14;
export const HIP_ROOF_T = 0.12;
/** โรงจอดรถหลังคาแบน: แผ่นขาวบาง + แถบขอบเทาเข้ม (ภาพอ้างอิง) */
export const CARPORT_SLAB = 0.3;
const CARPORT_MAX_W = 3.4;
const CARPORT_MIN_W = 2.4;
const CARPORT_L = 5.6;
/** หลังคาโรงจอดหน้าบ้านลึกน้อยกว่านี้ = ไม่ทำ (หน้าบ้านตื้นเกิน) */
const CARPORT_MIN_D = 1.6;
/** ระยะห่างเสาโรงจอดด้านหน้าสูงสุด */
const CARPORT_SPAN = 5.5;
const POST = 0.2;
/** รั้วหน้าบ้านบล็อกช่องลม (ภาพอ้างอิง) */
export const FENCE_H = 1.25;
export const FENCE_T = 0.14;
/** ระเบียงชั้นบนบ้านแฝด: ลึกจากผนังหน้า */
export const BALCONY_D = 0.9;
/** แถบขอบแปลงที่ไม่มีอะไรตั้งทับ — หมู่บ้านวาดสีสถานะของแปลงลงแถบนี้ (เว้นด้านผนังร่วมของบ้านแฝด) */
export const EDGE = 0.45;
/** ความลึกแปลงมาตรฐานของ diorama เมื่อไม่ได้วางบนแปลงจริง (= plotDepthM ของผังตัวอย่าง) */
export const TYPICAL_PLOT_DEPTH = 15;

const half = WALL_M / 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Rect = { x0: number; z0: number; x1: number; z1: number };
type Side = "x-" | "x+";

/* ── ภาษาภายนอกต่อแบบบ้าน (house-types.json → facade) ──────────────── */

export type Facade = {
  /** single-gable = บ้านเดี่ยวจั่วเดียว (ใบบัว ร่มไม้ เนินไผ่) · twin = บ้านแฝดสองชั้นจั่วฝั่งนอก (ลมเย็น) */
  style: "single-gable" | "twin";
  /** จั่วคร่อมห้องหน้าริมด้านไหน — บ้านแฝด: ด้านนี้คือฝั่งนอก ผนังร่วมอยู่ฝั่งตรงข้าม */
  gable: Side;
  fence: "breeze-block" | null;
  yard: "lawn" | "gravel";
  /* สัดส่วนตามภาพอ้างอิง (ความหมายดู lib/schemas.ts facadeSchema) */
  gableWidthMax: number;
  gablePitch: number;
  gableDepth: number;
  gableWallLift: number;
  mainRoofPitch: number;
  carportMode: "front" | "side";
  note?: string | undefined;
};

/** สัดส่วนตั้งต้นที่สตูดิโอเลือก: กรอบจั่วนอก ≈ 4.2-4.8 ม. · ลาดจั่ว ≈ 40-42° ·
    ผนังใต้จั่วสูงกว่าชายคาส่วนอื่น ≈ 1 ม. · ปั้นหยาเตี้ย · ตรงกับค่าเริ่มของ facadeSchema */
export const DEFAULT_FACADE: Facade = {
  style: "single-gable",
  gable: "x-",
  fence: null,
  yard: "lawn",
  gableWidthMax: 4.2,
  gablePitch: 42,
  gableDepth: 4.5,
  gableWallLift: 1,
  mainRoofPitch: 17,
  carportMode: "front",
};

export type HouseGeom = {
  rooms: readonly GeomRoom[];
  openings: readonly GeomOpening[];
  /** ค่าที่ไม่ใส่ใช้ DEFAULT_FACADE (data ผ่าน zod มาครบอยู่แล้ว) */
  facade?: Partial<Facade> | undefined;
};

export const facadeOf = (h: HouseGeom): Facade => ({ ...DEFAULT_FACADE, ...h.facade });

const flip = (s: Side): Side => (s === "x-" ? "x+" : "x-");

/** สะท้อนบ้านกลับซ้าย-ขวารอบเส้น x = p (บ้านแฝดหลังข้างเคียง / ผังที่ตั้งแบบสะท้อน) — ห้อง ช่องเปิด และด้านจั่ว */
export function mirrorHouse<H extends HouseGeom>(h: H, p = 0): H {
  const f = facadeOf(h);
  return {
    ...h,
    rooms: h.rooms.map((r) => ({ ...r, x0: mm(2 * p - r.x1), x1: mm(2 * p - r.x0) })),
    openings: h.openings.map((o) =>
      o.wallAxis === "z"
        ? { ...o, at: mm(2 * p - o.at) }
        : { ...o, from: mm(2 * p - o.to), to: mm(2 * p - o.from) },
    ),
    facade: { ...f, gable: flip(f.gable) },
  };
}

const indoor = (rooms: readonly GeomRoom[], floor: number) =>
  rooms.filter((r) => !r.outdoor && (r.floor ?? 1) === floor);

function boundsOf(rooms: readonly Rect[]): Rect {
  const first = rooms[0];
  if (!first) throw new Error("exterior: ไม่มีห้อง");
  return rooms.reduce<Rect>(
    (b, r) => ({
      x0: Math.min(b.x0, r.x0),
      z0: Math.min(b.z0, r.z0),
      x1: Math.max(b.x1, r.x1),
      z1: Math.max(b.z1, r.z1),
    }),
    { x0: first.x0, z0: first.z0, x1: first.x1, z1: first.z1 },
  );
}

const floorsOf = (rooms: readonly GeomRoom[]) =>
  [...new Set(rooms.filter((r) => !r.outdoor).map((r) => r.floor ?? 1))].sort((a, b) => a - b);

/* ── หลังคา ───────────────────────────────────────────────────── */

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * ก้อนจั่วหน้า (ภาพอ้างอิง): หน้ากว้างตามห้องใต้จั่วแต่ไม่เกิน facade.gableWidthMax · ลึกจากผนังหน้า ≤ facade.gableDepth
 * ผนังใต้จั่วยกสูงกว่าชายคาปั้นหยา (knee) แล้วจึงเป็นหลังคาจั่วชัน — ยอดจั่วจึงเด่นกว่าหลังคาส่วนอื่นทั้งหลัง
 * x0..x1 = ระหว่างเสากรอบจั่ว (กรอบเทาหนา FRAME_T อยู่นอกช่วงนี้) · z0 = ผนังหน้า · z1 = ท้ายก้อนจั่ว
 */
export type GableWing = Rect & {
  /** ระดับบนของผนังใต้จั่ว (ชายคาจั่ว) — สูงกว่าชายคาปั้นหยาเสมอ */
  knee: number;
  /** สูงจาก knee ถึงสันจั่ว */
  rise: number;
  /** ระดับสันจั่ว (ผิวในของกรอบ) */
  apex: number;
  /** ความชันจั่ว (องศา) */
  pitch: number;
  /** ขอบจั่วที่ตรงกับขอบบ้าน (บ้านแฝด: ฝั่งนอก) */
  outerX0: boolean;
  outerX1: boolean;
};

/**
 * หลังคาปั้นหยาเตี้ยคลุมทั้งกรอบชั้นบนสุด สันขนานถนน — ก้อนจั่วตั้งทับด้านหน้า (build ตัดส่วนที่อยู่ในก้อนจั่วออก)
 * x0..z1 = กรอบผนัง (กลางผนัง) · ชายคายื่นตาม oh
 */
export type HipRoof = Rect & {
  /** ระดับผิวหลังคาที่ขอบชายคา */
  eave: number;
  /** สูงจากชายคาถึงสัน */
  rise: number;
  /** ความชัน (องศา) */
  pitch: number;
  /** ชายคายื่นพ้นกรอบผนัง: หน้า-หลัง และปลายสองข้าง (ปลายผนังร่วม = ผิวนอกผนัง) */
  oh: { z: number; x0: number; x1: number };
  /** ปลายที่ลาดลงเป็นปั้นหยา — false = ปลายผนังร่วมของบ้านแฝด (ตัดตรง ต่อกับหลังข้างเคียง) */
  hipX0: boolean;
  hipX1: boolean;
};

export type RoofPlan = {
  /** ชั้นบนสุด — หลังคาวางบนกรอบของชั้นนี้ */
  floor: number;
  /** ระดับบนสุดของผนังชั้นบน (ชายคาปั้นหยา) */
  eaveY: number;
  /** กรอบของชั้นบนสุด */
  bounds: Rect;
  gable: GableWing;
  hip: HipRoof;
  style: Facade["style"];
  /** ด้านผนังร่วมของบ้านแฝด (ฝั่งตรงข้ามจั่ว) — null = บ้านเดี่ยว */
  party: Side | null;
};

/** กรอบชายคาของปั้นหยา (ขอบนอกสุดของแผ่นหลังคา) */
export function hipOutline(h: HipRoof): Rect {
  return { x0: h.x0 - h.oh.x0, z0: h.z0 - h.oh.z, x1: h.x1 + h.oh.x1, z1: h.z1 + h.oh.z };
}

/** ช่วงสันปั้นหยา (แนว x ที่กลางความลึก) — สั้นกว่าศูนย์ = หลังคาทรงปิรามิด ยุบเป็นจุดกลาง */
export function hipRidge(h: HipRoof): { x0: number; x1: number; z: number; y: number } {
  const o = hipOutline(h);
  const hd = (o.z1 - o.z0) / 2;
  let x0 = h.hipX0 ? o.x0 + hd : o.x0;
  let x1 = h.hipX1 ? o.x1 - hd : o.x1;
  if (x0 > x1) x0 = x1 = (x0 + x1) / 2;
  return { x0, x1, z: (o.z0 + o.z1) / 2, y: hipY(h, x0, (o.z0 + o.z1) / 2) };
}

/** ระดับผิวบนของปั้นหยาที่จุด (x, z) — นอกชายคา = -Infinity */
export function hipY(h: HipRoof, x: number, z: number): number {
  const o = hipOutline(h);
  if (x < o.x0 - 1e-9 || x > o.x1 + 1e-9 || z < o.z0 - 1e-9 || z > o.z1 + 1e-9) return -Infinity;
  const d = Math.min(
    z - o.z0,
    o.z1 - z,
    h.hipX0 ? x - o.x0 : Infinity,
    h.hipX1 ? o.x1 - x : Infinity,
  );
  return h.eave + d * Math.tan(rad(h.pitch));
}

/** ยกผิวหลังคาจั่วขึ้นเท่าครึ่งหน้ากรอบ — ผิวหลังคาทับขอบบนของกรอบเทาพอดี */
export const capLift = (pitch: number) => (FRAME_T * 0.5) / Math.cos(rad(pitch));

/** ท้ายหลังคาจั่วยื่นพ้นผนังท้ายก้อนจั่ว */
export const CAP_BACK_OH = 0.35;

/**
 * จั่วหน้า 1 ก้อน (ภาพอ้างอิงทั้งสองโครงการ) + ปั้นหยาเตี้ยคลุมทั้งหลัง สันขนานถนน
 * - จั่ว: คร่อมห้องหน้าริมด้าน facade.gable กว้างตามห้องแต่ไม่เกิน gableWidthMax
 *   บ้านเดี่ยว: วางกลางช่องเปิดหน้าบ้านของห้องนั้น (ประตูกระจก/บานสูงอยู่ใต้จั่วตามภาพ) · บ้านแฝด: ชิดฝั่งนอก
 * - knee = ชายคาปั้นหยา + gableWallLift · ก้อนจั่วลึก gableDepth แล้วชนปั้นหยา (รางตะเข้เกิดเองจากผิวที่ตัดกัน)
 * - ปั้นหยา: บ้านเดี่ยวลาดลงทั้งสองปลาย · บ้านแฝดปลายผนังร่วมตัดตรง (ต่อกับหลังข้างเคียงเป็นผืนเดียว)
 */
export function roofPlan(house: HouseGeom): RoofPlan {
  const f = facadeOf(house);
  const floors = floorsOf(house.rooms);
  const top = floors[floors.length - 1] ?? 1;
  const own = indoor(house.rooms, top);
  const b = boundsOf(own);
  const eaveY = mm((top - 1) * STOREY_H + WALL_H);
  const tanG = Math.tan(rad(f.gablePitch));
  const front = own.filter((r) => mm(r.z0) === mm(b.z0)).sort((p, q) => p.x0 - q.x0);
  const room = f.gable === "x-" ? front[0] : front[front.length - 1];
  const twin = f.style === "twin";
  const party = twin ? flip(f.gable) : null;
  const rx0 = room ? room.x0 : b.x0;
  const rx1 = room ? room.x1 : b.x1;
  const width = Math.min(rx1 - rx0, f.gableWidthMax);
  let gx0: number;
  if (twin) gx0 = f.gable === "x-" ? rx0 : rx1 - width;
  else {
    /* กลางช่องเปิดของห้องนี้บนผนังหน้า (ภาพอ้างอิง: ประตูกระจกบานสูงอยู่กลางจั่ว) */
    const holes = house.openings.filter(
      (o) =>
        o.wallAxis === "x" &&
        mm(o.at) === mm(b.z0) &&
        (o.floor ?? 1) === top &&
        o.to > rx0 &&
        o.from < rx1,
    );
    const c =
      holes.length > 0
        ? (Math.min(...holes.map((o) => o.from)) + Math.max(...holes.map((o) => o.to))) / 2
        : (rx0 + rx1) / 2;
    gx0 = clamp(c - width / 2, rx0, rx1 - width);
  }
  const gx1 = gx0 + width;
  const roomD = room ? room.z1 - b.z0 : b.z1 - b.z0;
  const depth = Math.min(f.gableDepth, Math.max(roomD, Math.min(3, b.z1 - b.z0)), b.z1 - b.z0);
  const outerX0 = mm(gx0) === mm(b.x0);
  const outerX1 = mm(gx1) === mm(b.x1);

  const tanH = Math.tan(rad(f.mainRoofPitch));
  /* ปลายปั้นหยาด้านที่ก้อนจั่วชนขอบบ้าน: ชายคายื่นเท่ากรอบจั่ว (แนวเดียวกับผนังข้างก้อนจั่ว) */
  const endOh = (side: Side, touches: boolean) =>
    party === side ? half : touches ? FRAME_T : EAVE_OH;
  const hip: HipRoof = {
    ...b,
    eave: mm(eaveY + 0.06 - EAVE_OH * tanH),
    rise: 0,
    pitch: f.mainRoofPitch,
    oh: { z: EAVE_OH, x0: endOh("x-", outerX0), x1: endOh("x+", outerX1) },
    hipX0: party !== "x-",
    hipX1: party !== "x+",
  };
  hip.rise = mm(hipRidge(hip).y - hip.eave);

  /* knee = ชายคาปั้นหยา + gableWallLift (ภาพอ้างอิง: ก้อนจั่วสูงกว่าส่วนอื่นราว 1 ม.)
     ปั้นหยาที่สูงกว่าหลังคาจั่วช่วงท้ายก้อนจั่วโผล่เป็นรางตะเข้ตามจริง — ส่วนที่ต่ำกว่าอยู่ในก้อนจั่ว มองไม่เห็น */
  const knee = mm(eaveY + f.gableWallLift);
  const rise = mm((width / 2) * tanG);
  const gable: GableWing = {
    x0: mm(gx0),
    x1: mm(gx1),
    z0: b.z0,
    z1: mm(b.z0 + depth),
    knee,
    rise,
    apex: mm(knee + rise),
    pitch: f.gablePitch,
    outerX0,
    outerX1,
  };
  return { floor: top, eaveY, bounds: b, gable, hip, style: f.style, party };
}

/* ── ที่ตั้งบนแปลง ─────────────────────────────────────────────── */

export type PlotSize = { width: number; depth: number };

export type Tree = { x: number; z: number; h: number; seed: number; staked: boolean };
export type Shrub = { x: number; z: number; r: number; seed: number };

export type Carport = Rect & {
  /** ระดับผิวบนหลังคา (พิกัดบ้าน: 0 = พื้นในบ้าน) */
  top: number;
  /** ด้านที่ชนตัวบ้าน — ไม่มีเสาด้านนี้ หลังคาฝากผนัง */
  wall: "x-" | "x+" | "z+";
  /** ด้านผนังร่วมของบ้านแฝด — เสาครึ่งต้นชิดเส้นแปลง (อีกครึ่งเป็นของหลังข้างเคียง) */
  party: Side | null;
  /** เสาขาว (กรอบเสาบนผัง) — คำนวณที่นี่ ตัวสร้าง 3D และตัวตรวจใช้ชุดเดียวกัน */
  posts: Rect[];
};

export type FenceRun = { x0: number; x1: number; kind: "pier" | "breeze" | "gate" };
export type Fence = { z0: number; z1: number; runs: FenceRun[] };

export type SiteLayout = {
  /** กรอบแปลงในพิกัดบ้าน — z0 คือด้านติดถนน */
  plot: Rect;
  /** ฐานบ้าน (ปูนเทา) = กรอบชั้นล่าง */
  plinth: Rect;
  /** ลานหน้าประตูที่ระดับพื้นบ้าน — ระเบียงใน data หรือชานที่คำนวณให้บ้านที่ไม่มีระเบียง */
  porch: Rect;
  /** ขั้นบันไดลงสนาม */
  steps: Rect;
  carport: Carport | null;
  /** ทางรถจากหน้าแปลงถึงท้ายโรงจอด */
  driveway: Rect | null;
  /** แผ่นหินทางเดินจากขั้นบันไดถึงหน้าแปลง */
  stones: Rect[];
  /** แนวกรวดขาวใต้ทางเดิน */
  gravel: Rect;
  /** ลานกรวดดำหน้าบ้าน (ภาพอ้างอิง) — null = สนามหญ้า */
  yard: Rect | null;
  /** รั้วหน้าบล็อกช่องลม + ประตูระแนง — null = ไม่มีรั้ว */
  fence: Fence | null;
  /** แนวพุ่มไม้ตัดแต่งริมแปลง */
  hedges: Rect[];
  /** กำแพงเตี้ยหลังแปลง */
  rearWall: Rect;
  shrubs: Shrub[];
  trees: Tree[];
  /** ด้านผนังร่วมของบ้านแฝด — บ้านชิดเส้นแปลงด้านนี้ ไม่มีแถบขอบแปลง */
  party: Side | null;
};

/** แปลงมาตรฐานของแบบบ้าน — ใช้กับ diorama หน้าแบบบ้านที่ไม่ได้ผูกกับแปลงจริง */
export function typicalPlot(house: HouseGeom): PlotSize {
  const b = boundsOf(indoor(house.rooms, 1));
  const all = boundsOf(house.rooms.filter((r) => (r.floor ?? 1) === 1));
  const twin = facadeOf(house).style === "twin";
  return {
    /* บ้านแฝด: ชิดผนังร่วม เหลือข้างฝั่งนอก 1.2 ม. (แปลงลมเย็น กว้าง ≈ 10.2 ม.) */
    width: mm(b.x1 - b.x0 + (twin ? half + 1.2 : CARPORT_MAX_W + 1.1)),
    depth: Math.max(TYPICAL_PLOT_DEPTH, mm(all.z1 - all.z0 + 4.8)),
  };
}

/** ระยะกันรอบกรอบบ้าน (ทุกชั้น) ที่หลังคาคลุม: ชายคายื่น EAVE_OH + กรอบจั่วยื่นหน้า FRAME_PROUD + หน้ากรอบ FRAME_T */
export const ROOF_CLEAR = mm(Math.max(EAVE_OH, FRAME_PROUD) + FRAME_T);

/** รัศมีเรือนยอดสูงสุดของต้นไม้สูง h (เมตร, มองจากบน) — ขอบบนของทรงที่ house/Vegetation.tsx grow() สร้าง:
    กิ่งยื่นไกลสุด (reach × 1.1) + พุ่มใบที่ปลายกิ่งเหวี่ยงออก (±1.2 ใบ) + ขนาดพุ่มใหญ่สุด (1.3 ใบ)
    แก้สัดส่วนต้นไม้ที่นั่น ต้องแก้ที่นี่ด้วย — การวางต้นไม้ไม่ให้เรือนยอดทับหลังคาอ่านค่านี้ */
export function crownRadius(h: number, mature = false): number {
  const reach = h * (mature ? 0.3 : 0.22) * 1.1;
  const leaf = mature ? h * 0.085 : 0.25;
  return mm(reach + leaf * 2.5);
}

const expand = (r: Rect, d: number): Rect => ({
  x0: r.x0 - d,
  z0: r.z0 - d,
  x1: r.x1 + d,
  z1: r.z1 + d,
});

/** วงกลม (เรือนยอด) ทับสี่เหลี่ยมหรือไม่ */
function circleHitsRect(x: number, z: number, r: number, b: Rect): boolean {
  const dx = Math.max(b.x0 - x, 0, x - b.x1);
  const dz = Math.max(b.z0 - z, 0, z - b.z1);
  return dx * dx + dz * dz < r * r;
}

/** สุ่มแบบกำหนดได้ — server กับ client และภาพนิ่งทุกรอบได้ผลเดียวกัน */
export function hash01(seed: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** สะท้อนผังที่ตั้งทั้งชุดรอบเส้น x = p */
export function mirrorLayout(s: SiteLayout, p = 0): SiteLayout {
  const fx = (x: number) => mm(2 * p - x);
  const fr = <T extends Rect>(r: T): T => ({ ...r, x0: fx(r.x1), x1: fx(r.x0) });
  const flipWall = (w: Carport["wall"]): Carport["wall"] => (w === "z+" ? w : flip(w));
  return {
    plot: fr(s.plot),
    plinth: fr(s.plinth),
    porch: fr(s.porch),
    steps: fr(s.steps),
    carport: s.carport
      ? {
          ...fr(s.carport),
          wall: flipWall(s.carport.wall),
          party: s.carport.party ? flip(s.carport.party) : null,
          posts: s.carport.posts.map(fr),
        }
      : null,
    driveway: s.driveway ? fr(s.driveway) : null,
    stones: s.stones.map(fr),
    gravel: fr(s.gravel),
    yard: s.yard ? fr(s.yard) : null,
    fence: s.fence
      ? {
          ...s.fence,
          runs: s.fence.runs.map((r) => ({ ...r, x0: fx(r.x1), x1: fx(r.x0) })).reverse(),
        }
      : null,
    hedges: s.hedges.map(fr),
    rearWall: fr(s.rearWall),
    shrubs: s.shrubs.map((sh) => ({ ...sh, x: fx(sh.x) })),
    trees: s.trees.map((t) => ({ ...t, x: fx(t.x) })),
    party: s.party ? flip(s.party) : null,
  };
}

/**
 * วางบ้านลงแปลง — คิดในทิศมาตรฐาน (จั่วฝั่ง x+) แล้วสะท้อนกลับถ้าแบบนั้นจั่วอยู่ฝั่ง x-
 * บ้านเดี่ยว: โรงจอดหลังคาแบนคลุมหน้าบ้านฝั่งตรงข้ามจั่ว ยื่นออกข้างแปลงถ้ามีที่ (ภาพอ้างอิง) · หน้าบ้านตื้นเกิน = ลานจอดเปิด
 * บ้านแฝด: บ้านชิดเส้นแปลงด้านผนังร่วม · โรงจอดแผ่นเดียวเต็มหน้าระหว่างก้อนจั่ว สูงระดับพื้นชั้นสอง เสากลางต้นเดียวที่ผนังร่วม
 * ระยะถอยหลัง 30% ของที่เหลือ (0.9-2.5 ม.) · ทางเดินหินจากขั้นบันไดหน้าประตูถึงหน้าแปลง
 */
export function houseSiting(house: HouseGeom, size: PlotSize): SiteLayout {
  const f = facadeOf(house);
  if (f.gable === "x-") return mirrorLayout(sitingRight(mirrorHouse(house), size, f));
  return sitingRight(house, size, f);
}

/** ผังที่ตั้งในทิศมาตรฐาน: จั่วฝั่ง x+ · โรงจอด/ผนังร่วมฝั่ง x- */
function sitingRight(house: HouseGeom, size: PlotSize, f: Facade): SiteLayout {
  const { rooms, openings } = house;
  const twin = f.style === "twin";
  const ground = rooms.filter((r) => (r.floor ?? 1) === 1);
  const b = boundsOf(indoor(rooms, 1));
  const all = boundsOf(ground);
  const gable = roofPlan(house).gable;
  const seedBase = Math.round((size.width * 31 + size.depth * 7 + (b.x1 - b.x0) * 13) * 100);

  /* ขั้นต่ำ: ชายคาหลัง (EAVE_OH) ต้องพ้นแถบขอบแปลงที่ติดกำแพงโครงการ (REAR_CLEAR) = 0.9 ม. */
  const rear = clamp((size.depth - (all.z1 - all.z0)) * 0.3, EAVE_OH + REAR_CLEAR, 2.5);
  const pz1 = mm(all.z1 + rear);
  const pz0 = mm(pz1 - size.depth);

  /* ชานหน้าประตู: ระเบียงใน data ถ้าประตูเปิดออกระเบียง ไม่งั้นทำชานหน้าประตูให้เอง */
  const entry = openings.find((o) => o.kind === "entry" && (o.floor ?? 1) === 1);
  const ex = entry ? (entry.from + entry.to) / 2 : (gable.x0 + gable.x1) / 2;
  const terrace = ground.find((r) => r.outdoor && mm(r.z1) === mm(b.z0) && ex > r.x0 && ex < r.x1);
  const porch: Rect = terrace
    ? { x0: terrace.x0, z0: terrace.z0, x1: terrace.x1, z1: terrace.z1 }
    : {
        x0: mm(Math.max(gable.x0 + 0.1, ex - 1.3)),
        z0: mm(b.z0 - 1.2),
        x1: mm(Math.min(gable.x1 - 0.1, ex + 1.3)),
        z1: b.z0,
      };
  const stepW = 1.4;
  const sx0 = mm(clamp(ex - stepW / 2, porch.x0, porch.x1 - stepW));
  const steps = { x0: sx0, z0: mm(porch.z0 - 0.75), x1: mm(sx0 + stepW), z1: porch.z0 };
  const face = mm(b.z0 - half);
  /* ช่องรถหน้ารั้ว/ขอบแปลง ถึงหลังคาโรงจอดด้านหน้า */
  const frontStop = mm(pz0 + EDGE + (f.fence ? FENCE_T + 0.25 : 0.1));

  let plot: Rect;
  let slab: (Rect & { top: number; wall: Carport["wall"]; party: Side | null }) | null = null;
  let driveway: Rect | null = null;
  if (twin) {
    /* ผนังร่วม: ผิวนอกของผนังข้างนี้ทับเส้นแปลงพอดี — หลังข้างเคียงสะท้อนมาชนกันที่เส้นเดียวกัน
       โรงจอด (ภาพอ้างอิง): แผ่นเดียวต่อเนื่องเต็มหน้าระหว่างก้อนจั่วสองหลัง สูงระดับพื้นชั้นสอง
       ยื่นเลยเสาในของกรอบจั่วเข้าไปเหนือหน้าห้องใต้จั่ว · เสากลางต้นเดียวที่เส้นผนังร่วม (ครึ่งต้นต่อหลัง) */
    const px0 = mm(b.x0 - half);
    plot = { x0: px0, z0: pz0, x1: mm(px0 + size.width), z1: pz1 };
    const cz0 = mm(Math.max(frontStop, face - CARPORT_L));
    const cx1 = mm(gable.x0 - FRAME_T - 0.1);
    if (face - cz0 >= 2.5 && cx1 - px0 >= CARPORT_MIN_W) {
      slab = {
        x0: px0,
        z0: cz0,
        x1: mm(Math.min(gable.x0 + 0.6, (gable.x0 + gable.x1) / 2)),
        z1: face,
        top: mm(STOREY_H - 0.05),
        wall: "z+",
        party: "x-",
      };
      driveway = { x0: px0, z0: mm(plot.z0 + EDGE), x1: cx1, z1: face };
    }
  } else {
    /* ฝั่งจั่ว (x+) เหลือที่ให้กรอบจั่วเทาที่ยื่นข้างบ้านไม่ล้ำแถบขอบแปลง · ฝั่ง x- เผื่อที่จอดข้างบ้านถ้าแปลงกว้างพอ */
    const spare = size.width - (b.x1 - b.x0);
    const minRight = EDGE + FRAME_T + 0.08;
    const rightIfCarport = clamp((spare - CARPORT_MAX_W - half - EDGE - 0.4) / 2, minRight, 1.5);
    const sideRoom = spare - rightIfCarport - half - EDGE - 0.1;
    const side = sideRoom >= CARPORT_MIN_W;
    const right = side ? rightIfCarport : spare / 2;
    const px1 = mm(Math.max(b.x1, all.x1) + right);
    plot = { x0: mm(px1 - size.width), z0: pz0, x1: px1, z1: pz1 };
    const roomL = b.x0 - half - (plot.x0 + EDGE + 0.1);
    const hip = roofPlan(house).hip;
    if (f.carportMode === "front") {
      /* ภาพอ้างอิง: หลังคาแบนผืนใหญ่คลุมหน้าบ้านฝั่งตรงข้ามจั่ว (หน้าผนังไม้) จากเสากรอบจั่ว
         ยื่นออกข้างแปลงถ้ามีที่ ไม่งั้นจบที่ชายคาข้างบ้าน · ลึกจากชายคาปั้นหยาออกมาทางหน้าแปลงถึงรั้ว (≤ 5.6 ม.)
         แปลงแคบ (เนินไผ่ 2 นอน 13 ม.) จึงยังมีโรงจอดคลุมระยะถอยหน้า · ผิวบนเสมอชายคาปั้นหยา */
      const z1 = mm(hip.z0 - hip.oh.z);
      const z0 = mm(Math.max(frontStop, z1 - CARPORT_L));
      const x0 = side
        ? mm(b.x0 - half - Math.min(CARPORT_MAX_W, roomL))
        : mm(Math.max(plot.x0 + EDGE + 0.05, b.x0 - hip.oh.x0));
      const x1 = mm(gable.x0 - FRAME_T - 0.08);
      if (z1 - z0 >= CARPORT_MIN_D && x1 - x0 >= CARPORT_MIN_W) {
        slab = { x0, z0, x1, z1, top: hip.eave, wall: "z+", party: null };
        /* ทางรถ: ข้างบ้านถ้ามีที่ ไม่งั้นหน้าบ้านปลายฝั่ง x- กว้าง ≤ 3.2 ม. หยุดก่อนชาน/บันได */
        const dx0 = side ? mm(x0 - 0.05) : x0;
        let dx1 = side ? mm(b.x0 - half) : mm(Math.min(x0 + 3.2, x1));
        for (const r of [porch, steps]) if (r.x0 < dx1 && dx0 < r.x1) dx1 = mm(r.x0 - 0.3);
        if (dx1 - dx0 >= 2) driveway = { x0: dx0, z0: mm(plot.z0 + EDGE), x1: dx1, z1 };
      }
    }
    if (!slab && side) {
      /* แบบเดิม: โรงจอดข้างบ้านฝากผนังฝั่ง x- */
      const cx1 = mm(b.x0 - half);
      const w = Math.min(CARPORT_MAX_W, roomL);
      const cz0 = mm(Math.max(plot.z0 + EDGE + 0.4, b.z0 - 1.6));
      const cz1 = mm(Math.min(plot.z1 - EDGE - 0.4, cz0 + CARPORT_L));
      slab = { x0: mm(cx1 - w), z0: cz0, x1: cx1, z1: cz1, top: hip.eave, wall: "x+", party: null };
      driveway = { x0: mm(slab.x0 - 0.05), z0: mm(plot.z0 + EDGE), x1: cx1, z1: cz1 };
    }
    if (!slab) {
      /* ลานจอดเปิดหน้าบ้าน ชิดขอบแปลงฝั่ง x- — หยุดก่อนชานและขั้นบันไดถ้าอยู่แนวเดียวกัน
         หน้าบ้านตื้นจนลานจอดลึกไม่ถึง 1 ม. = ไม่วาดลานจอด (บ้านเต็มแปลง) */
      const x0 = mm(plot.x0 + EDGE + 0.2);
      const x1 = mm(x0 + CARPORT_MIN_W + 0.2);
      const across = (r: Rect) => r.x0 < x1 && x0 < r.x1;
      const z1 = Math.min(
        all.z0 - 0.8,
        plot.z0 + EDGE + CARPORT_L,
        across(porch) ? porch.z0 - 0.2 : Infinity,
        across(steps) ? steps.z0 - 0.1 : Infinity,
      );
      const z0 = mm(plot.z0 + EDGE);
      driveway = z1 - z0 >= 1 ? { x0, z0, x1, z1: mm(z1) } : null;
    }
  }

  /* ทางเดิน: ตรงออกจากขั้นบันได กว้างเท่าขั้นบันได (เจ้าของสั่ง 2026-10-02 — เส้นข้างบันไดต้องต่อเป็นขอบทางเดินพอดี)
     แนวกรวดขาว x = ขั้นบันไดเป๊ะ จากหน้าขั้นล่างสุดถึงรั้ว/ขอบแปลง ไม่มีช่องว่าง
     แผ่นหิน 0.9 × 0.45 ห่าง 0.72 ม. กลางแกนบันได ขอบซ้ายขวาเท่ากัน ไม่โค้ง · แผ่นแรกชิดขั้นล่างสุด
     ประตูรั้ว (ถ้ามี) อยู่แกนเดียวกัน กว้างเท่าทางเดิน */
  const fenceZ1 = f.fence ? mm(plot.z0 + EDGE + FENCE_T) : mm(plot.z0 + EDGE);
  const px = mm((steps.x0 + steps.x1) / 2);
  const gravel = { x0: steps.x0, z0: fenceZ1, x1: steps.x1, z1: steps.z0 };
  const stones: Rect[] = [];
  const stoneW = Math.min(0.9, steps.x1 - steps.x0 - 0.3);
  for (let zc = steps.z0 - 0.06 - 0.22; zc - 0.22 >= fenceZ1 + 0.08; zc -= 0.72) {
    stones.push({
      x0: mm(px - stoneW / 2),
      z0: mm(zc - 0.22),
      x1: mm(px + stoneW / 2),
      z1: mm(zc + 0.22),
    });
  }

  /* รั้วหน้าบล็อกช่องลม (ภาพอ้างอิง): เสาทึบ + แผงบล็อกไม่เกิน 2 ม. + ประตูระแนงตรงทางเดิน
     เว้นช่องทางรถ · อยู่ในแปลงถัดจากแถบขอบแปลง */
  let fence: Fence | null = null;
  if (f.fence) {
    const fx0 = twin ? plot.x0 : plot.x0 + EDGE;
    const fx1 = plot.x1 - EDGE;
    const spans: [number, number][] = driveway
      ? [
          [fx0, driveway.x0 - 0.05],
          [driveway.x1 + 0.05, fx1],
        ]
      : [[fx0, fx1]];
    const runs: FenceRun[] = [];
    const g0 = gravel.x0;
    const g1 = gravel.x1;
    const wall = (a: number, c: number) => {
      if (c - a < 0.3) {
        if (c - a > 0.05) runs.push({ x0: mm(a), x1: mm(c), kind: "pier" });
        return;
      }
      const p = 0.24;
      const inner = c - a - 2 * p;
      const panels = Math.max(1, Math.ceil(inner / 2));
      const pw = (inner - (panels - 1) * p) / panels;
      let x = a;
      runs.push({ x0: mm(x), x1: mm(x + p), kind: "pier" });
      x += p;
      for (let i = 0; i < panels; i++) {
        runs.push({ x0: mm(x), x1: mm(x + pw), kind: "breeze" });
        x += pw;
        runs.push({ x0: mm(x), x1: mm(x + p), kind: "pier" });
        x += p;
      }
    };
    for (const [a, c] of spans) {
      if (c - a < 0.1) continue;
      if (g0 > a + 0.2 && g1 < c - 0.2) {
        wall(a, g0);
        runs.push({ x0: g0, x1: g1, kind: "gate" });
        wall(g1, c);
      } else wall(a, c);
    }
    fence = { z0: mm(plot.z0 + EDGE), z1: fenceZ1, runs };
  }

  /* เสาโรงจอดขาวเรียว (ภาพอ้างอิง): ด้านหน้าห่างไม่เกิน CARPORT_SPAN · ไม่ตั้งบนทางเดิน บันได ชาน หรือกลางทางรถ
     บ้านแฝด: เสาครึ่งต้นต้นเดียวที่เส้นผนังร่วม (อีกครึ่งเป็นของหลังข้างเคียง = เสากลางต้นเดียวของทั้งคู่) */
  let carport: Carport | null = null;
  if (slab) {
    const posts: Rect[] = [];
    const post = (x: number, z: number, w = POST) =>
      posts.push({ x0: mm(x), z0: mm(z), x1: mm(x + w), z1: mm(z + POST) });
    const pz = slab.z0 + 0.15;
    if (slab.party) post(slab.x0, pz, POST / 2);
    else if (slab.wall === "x+") {
      post(slab.x0 + 0.1, pz);
      post(slab.x0 + 0.1, slab.z1 - 0.15 - POST);
    } else {
      const span = (a: number, c: number): [number, number] => [a, c];
      const keep = [
        span(gravel.x0 - 0.12, gravel.x1 + 0.12),
        ...[porch, steps]
          .filter((r) => r.z0 < pz + POST && pz < r.z1)
          .map((r) => span(r.x0 - 0.12, r.x1 + 0.12)),
        ...(driveway ? [span(driveway.x0 + 0.45, driveway.x1 - 0.45)] : []),
      ].filter(([a, c]) => c > a);
      const lo = slab.x0 + 0.1;
      const hi = slab.x1 - 0.1 - POST;
      const n = Math.max(1, Math.ceil((hi - lo) / CARPORT_SPAN));
      const xs: number[] = [];
      for (let i = 0; i <= n; i++) {
        let x = lo + ((hi - lo) * i) / n;
        for (const [a, c] of keep) {
          if (x + POST <= a || x >= c) continue;
          const left = a - POST;
          x = left >= lo && (x - left < c - x || c > hi) ? left : c;
        }
        if (x < lo - 1e-6 || x > hi + 1e-6) continue;
        if (keep.some(([a, c]) => x + POST > a && x < c)) continue;
        if (xs.some((q) => Math.abs(q - x) < 0.8)) continue;
        xs.push(x);
      }
      for (const x of xs) post(x, pz);
      /* ส่วนที่ยื่นเลยข้างบ้านไม่มีผนังรับ — เสาหลังที่มุมนอก */
      if (slab.x0 < b.x0 - half - 0.6) post(slab.x0 + 0.1, slab.z1 - 0.1 - POST);
    }
    carport = { ...slab, posts };
  }

  /* ลานกรวดดำหน้าบ้านฝั่งจั่ว (ภาพอ้างอิง) จากรั้วถึงฐานบ้าน เว้นทางรถ */
  const yard: Rect | null =
    f.yard === "gravel"
      ? {
          x0: mm(driveway ? driveway.x1 + 0.1 : plot.x0 + EDGE),
          z0: fenceZ1,
          x1: mm(plot.x1 - EDGE),
          z1: mm(b.z0 - half),
        }
      : null;

  /* พุ่มไม้ริมแปลง (ด้านข้างและหลัง) ถอยจากเส้นเขตแปลง EDGE — แถบขอบแปลงเว้นไว้ให้ป้ายสถานะในหมู่บ้าน
     ข้างที่มีทางรถเว้นช่วงหน้าโรงจอด · ด้านผนังร่วมของบ้านแฝดไม่มีพุ่มไม้ */
  const hw = 0.45;
  const hedgeZ0 = (f.fence ? fenceZ1 : plot.z0) + 0.9;
  const rightGap = plot.x1 - EDGE - Math.max(b.x1, all.x1) - FRAME_T;
  const hedges: Rect[] = [
    ...(rightGap >= hw + 0.15
      ? [{ x0: plot.x1 - EDGE - hw, z0: hedgeZ0, x1: plot.x1 - EDGE, z1: plot.z1 - EDGE - 0.2 }]
      : []),
    ...(twin
      ? []
      : [
          {
            x0: plot.x0 + EDGE,
            z0: driveway ? driveway.z1 + 0.2 : hedgeZ0,
            x1: plot.x0 + EDGE + hw,
            z1: plot.z1 - EDGE - 0.2,
          },
        ]),
  ].filter((h) => h.z1 - h.z0 > 0.6);
  const rearWall = {
    x0: twin ? plot.x0 : plot.x0 + EDGE,
    z0: plot.z1 - EDGE - 0.2,
    x1: plot.x1 - EDGE,
    z1: plot.z1 - EDGE,
  };

  /* ไม้พุ่มหน้าบ้าน: แถวเดียวชิดฐานบ้าน เว้นชาน ทางรถ และใต้หลังคาโรงจอด */
  const shrubs: Shrub[] = [];
  let k = 0;
  const avoid = (x: number, z: number) =>
    (x > porch.x0 - 0.35 && x < porch.x1 + 0.35 && z > porch.z0 - 0.9) ||
    (driveway !== null && x < driveway.x1 + 0.3 && x > driveway.x0 - 0.3) ||
    (carport !== null && x > carport.x0 - 0.3 && x < carport.x1 + 0.3 && z < carport.z1 + 0.3) ||
    Math.abs(x - gable.x0 + FRAME_T / 2) < 0.4 ||
    Math.abs(x - gable.x1 - FRAME_T / 2) < 0.4;
  for (let x = b.x0 + 0.35; x <= b.x1 - 0.3; x += 0.75) {
    const z = b.z0 - FRAME_PROUD - 0.3;
    if (avoid(x, z)) continue;
    const s = seedBase + ++k * 17;
    shrubs.push({
      x: mm(x + (hash01(s) - 0.5) * 0.2),
      z: mm(z),
      r: mm(0.28 + hash01(s + 1) * 0.14),
      seed: s,
    });
  }

  /* ต้นไม้หนุ่มค้ำไม้สามขา: สองต้นหน้าบ้านคร่อมทางเดิน + หนึ่งต้นในสวน (หลังบ้านหรือข้างบ้าน)
     กฎ: เรือนยอดทั้งวง (crownRadius) ต้องอยู่ในแปลงตัวเอง และไม่ทับหลังคา + ชายคา + กรอบจั่ว (ROOF_CLEAR)
     หลังคาโรงจอด หรือรั้วหน้า · โคนต้นไม่ตั้งบนชาน บันได ทางรถ หรือแนวกรวด
     ลงไม่ได้ = ลดความสูง (เรือนยอดเล็กลง) ก่อน แล้วค่อยตัดทิ้ง — ไม่มีต้นไหนยื่นเข้าหลังคาบ้านตัวเองหรือบ้านข้างเคียง */
  const roofOut = expand(boundsOf(rooms.filter((r) => !r.outdoor)), ROOF_CLEAR);
  const crownOut = [roofOut, ...(carport ? [expand(carport, 0.3)] : [])];
  const trunkOut = [
    porch,
    steps,
    gravel,
    ...(driveway ? [driveway] : []),
    ...(fence ? [{ x0: plot.x0, z0: fence.z0, x1: plot.x1, z1: fence.z1 }] : []),
  ].map((r) => expand(r, 0.3));
  const fits = (x: number, z: number, h: number) => {
    const cr = crownRadius(h);
    return (
      x - cr >= plot.x0 &&
      x + cr <= plot.x1 &&
      z - cr >= plot.z0 &&
      z + cr <= plot.z1 - REAR_CLEAR &&
      crownOut.every((r) => !circleHitsRect(x, z, cr, r)) &&
      trunkOut.every((r) => !(x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1))
    );
  };

  /* หน้าก้อนจั่วต้องโล่ง (ภาพ iso เดิม: ต้นไม้หน้าชานบังจั่ว) — ต้นหน้าบ้านห้ามมีเรือนยอดในแนว x ของกรอบจั่ว */
  const gableBand = { x0: gable.x0 - FRAME_T - 0.3, x1: gable.x1 + FRAME_T + 0.3 };
  const clearOfGable = (x: number, h: number) => {
    const cr = crownRadius(h);
    return x + cr <= gableBand.x0 || x - cr >= gableBand.x1;
  };
  /** ความสูงแรกในรายการที่ลงที่ตำแหน่งนี้ได้ — null = ไม่มีความสูงไหนลงได้ */
  const frontHeight = (x: number, z: number, heights: readonly number[]) =>
    heights.find((h) => fits(x, z, h) && clearOfGable(x, h)) ?? null;

  const trees: Tree[] = [];
  const yardD = porch.z0 - fenceZ1;
  if (yardD > 2.2) {
    const zt = mm(fenceZ1 + yardD * 0.45);
    const leftX = driveway ? (driveway.x1 + Math.min(porch.x0, ex - 1)) / 2 : (plot.x0 + ex) / 2;
    const rightX = (Math.max(porch.x1, ex + 1, gableBand.x1) + plot.x1) / 2;
    const hl = Math.abs(leftX - ex) > 1.4 ? frontHeight(leftX, zt, [3.4, 3, 2.6]) : null;
    if (hl !== null) trees.push({ x: mm(leftX), z: zt, h: hl, seed: seedBase + 1, staked: true });
    const hr =
      Math.abs(rightX - ex) > 1.4 ? frontHeight(rightX, zt + 0.4, [3.9, 3.4, 3, 2.6]) : null;
    if (hr !== null)
      trees.push({ x: mm(rightX), z: mm(zt + 0.4), h: hr, seed: seedBase + 2, staked: true });
  }
  /* ต้นในสวน: ไล่หาจุดจากหลังแปลงมาหน้าแปลง (ตาราง 0.5 ม.) ต้นสูงก่อน — ได้จุดแรกที่ลงได้ */
  garden: for (const h of [4.4, 3.8, 3.2]) {
    const cr = crownRadius(h);
    for (let z = plot.z1 - REAR_CLEAR - cr; z >= plot.z0 + cr; z -= 0.5) {
      for (const x of [plot.x1 - cr, plot.x0 + cr]) {
        if (!fits(x, z, h)) continue;
        if (z - cr < b.z0 && !clearOfGable(x, h)) continue;
        if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < crownRadius(t.h) + cr)) continue;
        trees.push({ x: mm(x), z: mm(z), h, seed: seedBase + 3, staked: false });
        break garden;
      }
    }
  }

  return {
    plot,
    plinth: { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 },
    porch,
    steps,
    carport,
    driveway,
    stones,
    gravel,
    yard,
    fence,
    hedges,
    rearWall,
    shrubs,
    trees,
    party: twin ? "x-" : null,
  };
}

/**
 * จับคู่บ้านแฝด: แปลงแฝดสองแปลงติดกันในแถวเดียว (ขอบชนกัน) = หนึ่งอาคารสะท้อนกัน ผนังร่วมที่เส้นแปลง
 * ไล่จากซ้ายไปขวาทีละคู่ · แปลงที่เหลือเดี่ยว (จำนวนคี่ หรือคู่ถูกซ่อน) คืนเป็นคู่ที่มีตัวเดียว
 */
export function twinPairs<T extends { id: string; x0: number; x1: number; y0: number }>(
  rects: readonly T[],
): [T, T | null][] {
  const rows = new Map<number, T[]>();
  for (const r of rects) {
    const key = mm(r.y0);
    const row = rows.get(key);
    if (row) row.push(r);
    else rows.set(key, [r]);
  }
  const out: [T, T | null][] = [];
  for (const row of rows.values()) {
    const sorted = [...row].sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (!a) continue;
      if (b && Math.abs(b.x0 - a.x1) < 0.05) {
        out.push([a, b]);
        i++;
      } else out.push([a, null]);
    }
  }
  return out;
}

/* ── ที่นั่งริมหน้าต่างบิวท์อิน (ห้องนั่งเล่น) ─────────────── */

export type WindowSeat = Box2 & {
  roomId: string;
  windowId: string;
  /** ทิศที่คนนั่งหันเข้าห้อง (แกนโลก) */
  facing: "x+" | "x-" | "z+" | "z-";
  /** ความสูงที่นั่ง — ต่ำกว่าขอบล่างหน้าต่างเสมอ */
  seatH: number;
};

export const SEAT_DEPTH = 0.55;

/**
 * บิวท์อินใต้หน้าต่างบานที่กว้างที่สุดของห้องใหญ่สุดชั้นล่าง — เป็นสถาปัตยกรรม ไม่ใช่เฟอร์นิเจอร์ใน data
 * วางเมื่อไม่ทับเฟอร์นิเจอร์และไม่ขวางระยะหน้าประตูเท่านั้น (ไม่งั้นคืน null)
 */
export function windowSeat(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[],
  furniture: readonly GeomFurniture[],
  overlap: (a: Box2, b: Box2) => boolean,
  clearance: (room: GeomRoom, o: GeomOpening) => Box2 | null,
): WindowSeat | null {
  const room = [...indoor(rooms, 1)].sort(
    (a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0),
  )[0];
  if (!room) return null;
  const onRoomWall = (o: GeomOpening) =>
    o.wallAxis === "z"
      ? (mm(o.at) === mm(room.x0) || mm(o.at) === mm(room.x1)) &&
        o.from >= room.z0 &&
        o.to <= room.z1
      : (mm(o.at) === mm(room.z0) || mm(o.at) === mm(room.z1)) &&
        o.from >= room.x0 &&
        o.to <= room.x1;
  const windows = openings
    .filter(
      (o) =>
        o.kind === "window" && (o.floor ?? 1) === 1 && onRoomWall(o) && openingV(o).sill >= 0.6,
    )
    .sort((a, b) => b.to - b.from - (a.to - a.from));
  const half = WALL_M / 2;
  for (const w of windows) {
    const lo = w.from - 0.35;
    const hi = w.to + 0.35;
    let box: Box2;
    let facing: WindowSeat["facing"];
    if (w.wallAxis === "z") {
      const atMin = mm(w.at) === mm(room.x0);
      const x = atMin ? room.x0 + half : room.x1 - half - SEAT_DEPTH;
      box = {
        x0: mm(x),
        x1: mm(x + SEAT_DEPTH),
        z0: mm(Math.max(room.z0 + half, lo)),
        z1: mm(Math.min(room.z1 - half, hi)),
      };
      facing = atMin ? "x+" : "x-";
    } else {
      const atMin = mm(w.at) === mm(room.z0);
      const z = atMin ? room.z0 + half : room.z1 - half - SEAT_DEPTH;
      box = {
        z0: mm(z),
        z1: mm(z + SEAT_DEPTH),
        x0: mm(Math.max(room.x0 + half, lo)),
        x1: mm(Math.min(room.x1 - half, hi)),
      };
      facing = atMin ? "z+" : "z-";
    }
    const blocked =
      furniture.some(
        (f) =>
          f.roomId === room.id &&
          overlap(box, {
            x0: f.x - f.w / 2,
            z0: f.z - f.d / 2,
            x1: f.x + f.w / 2,
            z1: f.z + f.d / 2,
          }),
      ) ||
      openings.some((o) => {
        if (o.kind === "window" || (o.floor ?? 1) !== 1) return false;
        const c = clearance(room, o);
        return c !== null && overlap(box, c);
      });
    if (blocked) continue;
    return {
      ...box,
      roomId: room.id,
      windowId: w.id,
      facing,
      seatH: Math.min(0.45, openingV(w).sill - 0.05),
    };
  }
  return null;
}

/** กล่องกล้อง isometric ของ diorama (กว้าง ลึก สูง จุดกลาง) — ส่งเข้า IsoCanvas box
    pair = บ้านแฝดพร้อมหลังข้างเคียงที่สะท้อนกัน · closed = บ้านปิดหลังคา สูงถึงสันจั่ว (ภาพภายนอกของแบบ) */
export function dioramaBox(
  house: HouseGeom,
  floor: number,
  plot?: PlotSize,
  opts: { pair?: boolean; closed?: boolean } = {},
) {
  const f = dioramaFrame(house, floor, plot, opts);
  const roof = roofPlan(house);
  return {
    w: mm(f.x1 - f.x0),
    d: mm(f.z1 - f.z0),
    h: opts.closed ? mm(roof.gable.apex + 0.6) : WALL_H + 0.6,
    cx: mm((f.x0 + f.x1) / 2),
    cz: mm((f.z0 + f.z1) / 2),
  };
}

/* ── กรอบภาพของ diorama ─────────────────────────────────────── */

/** ขอบฐาน diorama ยื่นพ้นแปลง (ชั้นล่าง) หรือพ้นตัวบ้าน (ชั้นบน) */
export const BOARD_LIP = 0.15;
const UPPER_LIP = 0.45;

/** เส้นผนังร่วมของบ้านแฝดในพิกัดบ้าน (= เส้นแปลงด้านผนังร่วม) — null = บ้านเดี่ยว */
export function partyLine(s: SiteLayout): number | null {
  return s.party === "x+" ? s.plot.x1 : s.party === "x-" ? s.plot.x0 : null;
}

/**
 * กรอบที่กล้อง diorama ต้องคลุม — ชั้นล่างคือทั้งแปลง (บ้าน + สวน + โรงจอด) ชั้นบนคือตัวบ้านชั้นนั้น
 * pair: บ้านแฝดรวมแปลงของหลังข้างเคียง (สะท้อนรอบผนังร่วม)
 * ฉากเปิดหน้าแรก หน้าแบบบ้าน และภาพนิ่ง ใช้ตัวเดียวกัน ภาพนิ่งจึงทับโมเดลพอดี
 */
export function dioramaFrame(
  house: HouseGeom,
  floor: number,
  plot?: PlotSize,
  opts: { pair?: boolean } = {},
): Rect {
  if (floor === 1) {
    const s = houseSiting(house, plot ?? typicalPlot(house));
    const p = s.plot;
    const P = opts.pair ? partyLine(s) : null;
    const x0 = P === null ? p.x0 : Math.min(p.x0, 2 * P - p.x1);
    const x1 = P === null ? p.x1 : Math.max(p.x1, 2 * P - p.x0);
    return { x0: x0 - BOARD_LIP, z0: p.z0 - BOARD_LIP, x1: x1 + BOARD_LIP, z1: p.z1 + BOARD_LIP };
  }
  const b = boundsOf(house.rooms.filter((r) => (r.floor ?? 1) === floor));
  return { x0: b.x0 - UPPER_LIP, z0: b.z0 - UPPER_LIP, x1: b.x1 + UPPER_LIP, z1: b.z1 + UPPER_LIP };
}

/** ฐานหมู่บ้านยื่นพ้นผังโครงการ (เมตร) — แคบพอให้ภาพเต็มไปด้วยหมู่บ้าน ไม่ใช่กรอบว่าง */
export const VILLAGE_LIP = 1.2;

/** กำแพงโครงการ: ตั้งบนเส้นเขตผัง ด้านนอกแปลง (เส้นเขต → เส้นเขต + SITE_WALL_T) บนฐานที่ยื่น VILLAGE_LIP */
export const SITE_WALL_T = 0.2;
export const SITE_WALL_H = 1.8;
/** หลังแปลงติดกำแพงโครงการ: บ้าน ชายคา หลังคา และเรือนยอดต้นไม้ต้องถอยจากเส้นแปลงด้านหลังอย่างน้อยเท่านี้
    = แถบขอบแปลง EDGE (≥ ความหนากำแพง) — geometry:check ข้อ (ฐ) ตรวจทุกแปลงในผัง */
export const REAR_CLEAR = EDGE;

/** กล่องกล้องของหมู่บ้านทั้งโครงการ (กลางผังอยู่ที่ origin ของฉากหมู่บ้าน) */
export function villageBox(plan: { widthM: number; depthM: number }) {
  return { w: plan.widthM + VILLAGE_LIP * 2, d: plan.depthM + VILLAGE_LIP * 2, h: 8, cx: 0, cz: 0 };
}
