import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  ExtrudeGeometry,
  Matrix4,
  PlaneGeometry,
  Shape,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  OPENING_V,
  WALL_H,
  WALL_M,
  houseBounds,
  mm,
  openingV,
  type GeomRoom,
  type WallSegment,
} from "@/geometry";
import {
  BALCONY_D,
  CAP_BACK_OH,
  CAP_OH,
  CARPORT_SLAB,
  FENCE_H,
  FRAME_PROUD,
  FRAME_T,
  GABLE_ROOF_T,
  HIP_ROOF_T,
  PLINTH_H,
  STOREY_H,
  capLift,
  facadeOf,
  hipOutline,
  hipRidge,
  roofPlan,
  type Carport,
  type HouseGeom,
  type SiteLayout,
  type WindowSeat,
} from "@/geometry/exterior";
import type { MatKey } from "../surfaces";

/* ประกอบบ้านภายนอกแบบ The Grove จากข้อมูลใน src/geometry/exterior.ts เป็น geometry ก้อนเดียวต่อวัสดุ
   - UV ทุกหน้าเป็นเมตร (texture ตัวเดียวใช้ได้ทั้งฉาก ดู surfaces.ts)
   - ชิ้นเล็กจำนวนมาก (ระแนง ไม้ผนัง ลูกกรง) รวมเป็น draw call เดียวต่อวัสดุ
   - ไม่มีตัวเลขขนาดบ้านในไฟล์นี้: ทุกพิกัดมาจากห้อง ช่องเปิด และผังที่ตั้ง */

type V3 = [number, number, number];
export type Parts<K extends string = MatKey> = Map<K, BufferGeometry>;

const half = WALL_M / 2;

const v3 = (p: V3) => new Vector3(p[0], p[1], p[2]);

/** กล่องตามแกนแบบ non-indexed ที่ UV เป็นเมตร — null ถ้ากล่องแบน */
export function metricBox(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): BufferGeometry | null {
  const sx = x1 - x0;
  const sy = y1 - y0;
  const sz = z1 - z0;
  if (sx <= 1e-4 || sy <= 1e-4 || sz <= 1e-4) return null;
  const g = new BoxGeometry(sx, sy, sz);
  const uv = g.getAttribute("uv");
  /* ลำดับหน้า BoxGeometry: +x −x +y −y +z −z (หน้าละ 4 จุด) */
  const face: [number, number, number, number][] = [
    [sz, sy, z0, y0],
    [sz, sy, z0, y0],
    [sx, sz, x0, z0],
    [sx, sz, x0, z0],
    [sx, sy, x0, y0],
    [sx, sy, x0, y0],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv, ou, ov] = face[f] ?? [1, 1, 0, 0];
    for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const flat = g.toNonIndexed();
  g.dispose();
  return flat;
}

/**
 * เบาะผ้าทรงนุ่ม: กล่องลบมุมรัศมี r ทุกขอบ (ไม่ใช่กล่องคม) + หน้าบวมขึ้น crown เมตรตรงกลางของหน้าตามแกน crownAxis
 * (เบาะนั่ง = หน้าบน-ล่าง "y" · หมอนพิง = หน้า-หลัง "z") · ขนาด w × h × d รอบจุดกำเนิด
 * normal เรียบต่อเนื่อง (รวมจุดซ้ำก่อนคำนวณ) ขอบจึงรับแสงเป็นโค้ง · UV เป็นเมตรแบบ box แกนเด่น ลายผ้าไม่ยืด
 */
export function cushionGeometry(
  w: number,
  h: number,
  d: number,
  r: number,
  crown: number,
  crownAxis: "y" | "z",
): BufferGeometry {
  const seg = (n: number) => Math.max(4, Math.round(n / 0.03));
  const box = new BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  box.deleteAttribute("normal");
  box.deleteAttribute("uv");
  const g = mergeVertices(box);
  box.dispose();
  const p = g.getAttribute("position");
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const ix = Math.max(hx - r, 0);
  const iy = Math.max(hy - r, 0);
  const iz = Math.max(hz - r, 0);
  const v = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    /* จุดบนกล่องใน (หดเข้าข้างละ r) ที่ใกล้ที่สุด → ดันออกไปรัศมี r = ขอบโค้งทุกด้าน */
    c.set(
      Math.min(Math.max(v.x, -ix), ix),
      Math.min(Math.max(v.y, -iy), iy),
      Math.min(Math.max(v.z, -iz), iz),
    );
    const off = v.clone().sub(c);
    const len = off.length();
    if (len > 1e-9) v.copy(c).addScaledVector(off, r / len);
    /* หน้าบวม: มากสุดกลางหน้า เป็นศูนย์ที่ขอบ */
    const fx = 1 - Math.min(1, (v.x / hx) ** 2);
    if (crownAxis === "y") {
      const fz = 1 - Math.min(1, (v.z / hz) ** 2);
      v.y += Math.sign(v.y) * crown * fx * fz * Math.min(1, Math.abs(v.y) / hy);
    } else {
      const fy = 1 - Math.min(1, (v.y / hy) ** 2);
      v.z += Math.sign(v.z) * crown * fx * fy * Math.min(1, Math.abs(v.z) / hz);
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const flat = g.toNonIndexed();
  g.dispose();
  /* UV เมตรตามแกนที่ normal หันไปมากสุด */
  const fp = flat.getAttribute("position");
  const fn = flat.getAttribute("normal");
  const uv = new Float32Array(fp.count * 2);
  for (let i = 0; i < fp.count; i++) {
    const ax = Math.abs(fn.getX(i));
    const ay = Math.abs(fn.getY(i));
    const az = Math.abs(fn.getZ(i));
    const [a, b] =
      ay >= ax && ay >= az
        ? [fp.getX(i), fp.getZ(i)]
        : ax >= az
          ? [fp.getZ(i), fp.getY(i)]
          : [fp.getX(i), fp.getY(i)];
    uv[i * 2] = a;
    uv[i * 2 + 1] = b;
  }
  flat.setAttribute("uv", new BufferAttribute(uv, 2));
  return flat;
}

/** หมอนข้างทรงกระบอกปลายมน (bolster) ยาว len รัศมี r วางตามแกน z รอบจุดกำเนิด */
export function bolsterGeometry(len: number, r: number): BufferGeometry {
  const g = new CapsuleGeometry(r, Math.max(len - 2 * r, 0.01), 6, 16);
  g.rotateX(Math.PI / 2);
  const flat = g.toNonIndexed();
  g.dispose();
  return flat;
}

export class Builder<K extends string = MatKey> {
  private bins = new Map<K, BufferGeometry[]>();

  constructor(private base: Matrix4 | null = null) {}

  /** เปลี่ยนเมทริกซ์ที่ใช้กับชิ้นถัดไป (วางหลายแปลงลง builder เดียวกัน) */
  at(m: Matrix4 | null): this {
    this.base = m;
    return this;
  }

  private push(k: K, g: BufferGeometry) {
    if (this.base) g.applyMatrix4(this.base);
    const list = this.bins.get(k);
    if (list) list.push(g);
    else this.bins.set(k, [g]);
  }

  /** กล่องตามแกน — UV เป็นเมตรและเลื่อนตามตำแหน่งจริง ชิ้นติดกันลายจึงไม่ซ้ำกันเป๊ะ */
  box(k: K, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const g = metricBox(x0, y0, z0, x1, y1, z1);
    if (g) this.push(k, g);
  }

  /**
   * แผ่นหนาจากรูปหลายเหลี่ยมระนาบเดียวในพื้นที่ 3 มิติ — ผิวที่กำหนดคือผิวนอก เนื้อหนาลึกเข้าด้านใน
   * out = ทิศที่ผิวนอกหันไป (ใช้แค่ตัดสินด้าน) · ขอบแรก (p0→p1) คือแกน u ของ texture
   */
  plate(k: K, pts: V3[], thick: number, out: V3) {
    if (pts.length < 3) return;
    const P = pts.map(v3);
    const p0 = P[0] as Vector3;
    const n = new Vector3();
    for (let i = 0; i < P.length; i++) {
      const a = P[i] as Vector3;
      const b = P[(i + 1) % P.length] as Vector3;
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    if (n.lengthSq() < 1e-12) return;
    n.normalize();
    if (n.dot(v3(out)) < 0) n.negate();
    const u = (P[1] as Vector3).clone().sub(p0).normalize();
    const v = new Vector3().crossVectors(n, u);
    const flat = P.map((p) => {
      const d = p.clone().sub(p0);
      return new Vector2(d.dot(u), d.dot(v));
    });
    if (Math.abs(ShapeUtils.area(flat)) < 1e-5) return;
    const g = new ExtrudeGeometry(new Shape(flat), { depth: thick, bevelEnabled: false });
    const m = new Matrix4().makeBasis(u, v, n);
    m.setPosition(p0.clone().addScaledVector(n, -thick));
    g.applyMatrix4(m);
    const clean = new BufferGeometry();
    clean.setAttribute("position", g.getAttribute("position"));
    clean.setAttribute("normal", g.getAttribute("normal"));
    clean.setAttribute("uv", g.getAttribute("uv"));
    g.dispose();
    this.push(k, clean);
  }

  /** geometry สำเร็จรูป (เช่น cushionGeometry) วางด้วยเมทริกซ์ m — ต้องเป็น non-indexed ที่มี position/normal/uv */
  mesh(k: K, g: BufferGeometry, m: Matrix4) {
    g.applyMatrix4(m);
    this.push(k, g);
  }

  /** รวมทุกชิ้นเป็น geometry ก้อนเดียวต่อวัสดุ */
  build(): Parts<K> {
    const out: Parts<K> = new Map();
    for (const [k, list] of this.bins) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (merged) {
        merged.computeBoundingSphere();
        out.set(k, merged);
      }
    }
    this.bins.clear();
    return out;
  }
}

/* ── ตัวบ้าน ───────────────────────────────────────────────── */

type HouseShape = HouseGeom;

const floorsOf = (rooms: readonly GeomRoom[]) =>
  [...new Set(rooms.filter((r) => !r.outdoor).map((r) => r.floor ?? 1))].sort((a, b) => a - b);

type Hole = { from: number; to: number; sill: number; head: number };

/** ช่องเปิดบนผนังนอกหน้าบ้าน (z น้อยสุด) ของทุกชั้น — ระดับ y จริง */
function frontOpenings(house: HouseShape, z: number): Hole[] {
  return house.openings
    .filter((o) => o.wallAxis === "x" && mm(o.at) === mm(z))
    .map((o) => {
      const y0 = ((o.floor ?? 1) - 1) * STOREY_H;
      const v = openingV(o);
      return { from: o.from, to: o.to, sill: y0 + v.sill, head: y0 + v.head };
    });
}

/** ตัดช่วง [a, b] ด้วยช่องเปิดที่คร่อมแนว x นี้ */
function verticalRuns(x0: number, x1: number, a: number, b: number, holes: readonly Hole[]) {
  let runs = [{ a, b }];
  for (const h of holes) {
    if (x1 <= h.from - 0.04 || x0 >= h.to + 0.04) continue;
    runs = runs.flatMap((r) => {
      const out: { a: number; b: number }[] = [];
      if (h.sill - 0.04 > r.a) out.push({ a: r.a, b: Math.min(r.b, h.sill - 0.04) });
      if (h.head + 0.04 < r.b) out.push({ a: Math.max(r.a, h.head + 0.04), b: r.b });
      return out.filter((q) => q.b - q.a > 0.05);
    });
  }
  return runs;
}

/**
 * ผนังทึบของบ้านทั้งหลัง (บ้านที่ปิดแล้ว: หมู่บ้าน) + กระจกกรอบดำ (ภาพอ้างอิงทุกโครงการ) ประตูไม้
 * single-gable: ประตูทางเข้าเป็นประตูกระจกบานสูงใต้จั่ว · twin: ประตูไม้ข้างประตูกระจก
 * diorama ไม่ใช้ส่วนนี้ — มันมีผนังผ่าครึ่งของตัวเองจาก walls()
 */
export function buildShell(b: Builder, house: HouseShape, minFloor = 1) {
  const floors = floorsOf(house.rooms).filter((f) => f >= minFloor);
  const plan = roofPlan(house);
  const glazedEntry = facadeOf(house).style === "single-gable";
  for (const f of floors) {
    const own = house.rooms.filter((r) => !r.outdoor && (r.floor ?? 1) === f);
    const B = houseBounds(own);
    const y0 = (f - 1) * STOREY_H;
    const y1 = f === plan.floor ? plan.eaveY : f * STOREY_H;
    /* ชั้นบนที่วางทับ diorama (ผนังชั้นล่างสูงแค่ WALL_H): ลากลงปิดช่องพื้นชั้นบน */
    const yLow = f > 1 && f === minFloor ? (f - 1) * STOREY_H - (STOREY_H - WALL_H) : y0;
    b.box("render", B.x0 - half, yLow, B.z0 - half, B.x1 + half, y1, B.z1 + half);
    /* แถบฐานเทาเข้มใต้ผนัง (ภาพอ้างอิง) — ชั้นล่างเท่านั้น */
    if (f === 1)
      b.box(
        "fascia",
        B.x0 - half - 0.01,
        0,
        B.z0 - half - 0.01,
        B.x1 + half + 0.01,
        0.12,
        B.z1 + half + 0.01,
      );
    for (const o of house.openings.filter((q) => (q.floor ?? 1) === f && q.kind !== "door")) {
      const v = openingV(o);
      const s = y0 + v.sill;
      const h = y0 + v.head;
      const onX = o.wallAxis === "x" && (mm(o.at) === mm(B.z0) || mm(o.at) === mm(B.z1));
      const onZ = o.wallAxis === "z" && (mm(o.at) === mm(B.x0) || mm(o.at) === mm(B.x1));
      if (!onX && !onZ) continue;
      const sign = onX ? (mm(o.at) === mm(B.z0) ? -1 : 1) : mm(o.at) === mm(B.x0) ? -1 : 1;
      const face = o.at + sign * half;
      /* ชิ้นแบนบนหน้าผนัง: d0..d1 คือระยะออกจากผนัง */
      const put = (
        k: MatKey,
        u0: number,
        u1: number,
        yA: number,
        yB: number,
        d0: number,
        d1: number,
      ) => {
        const a = face + sign * d0;
        const c = face + sign * d1;
        if (onX) b.box(k, u0, yA, Math.min(a, c), u1, yB, Math.max(a, c));
        else b.box(k, Math.min(a, c), yA, u0, Math.max(a, c), yB, u1);
      };
      const fw = 0.06;
      const frame = () => {
        put("frameDark", o.from, o.from + fw, s, h, -0.01, 0.05);
        put("frameDark", o.to - fw, o.to, s, h, -0.01, 0.05);
        put("frameDark", o.from, o.to, h - fw, h, -0.01, 0.05);
        put("frameDark", o.from, o.to, s, s + (v.sill > 0 ? fw : 0.04), -0.01, 0.05);
      };
      if (o.kind === "entry" && !glazedEntry) {
        put("oakDark", o.from + 0.05, o.to - 0.05, s, h - 0.05, -0.02, 0.01);
        frame();
        continue;
      }
      put("glass", o.from, o.to, s, h, -0.02, 0.008);
      frame();
      if (o.to - o.from > 0.95) {
        const m = (o.from + o.to) / 2;
        put("frameDark", m - 0.025, m + 0.025, s, h, -0.01, 0.04);
      }
      /* บานสูงจากพื้น: คานขวางแบ่งช่องแสงบน (ภาพอ้างอิง) */
      if (h - s > 1.9) put("frameDark", o.from, o.to, h - 0.5, h - 0.45, -0.01, 0.04);
    }
  }
}

/** แผ่นสามเหลี่ยมกระจก + กรอบดำรอบทุกขอบ (หน้าต่างบนหน้าจั่ว) — pts เรียงรอบรูป ระนาบ z คงที่ */
function glassTriangle(b: Builder, pts: [number, number][], z: number, mullionX: number | null) {
  const fw = 0.06;
  b.plate(
    "glass",
    pts.map(([x, y]) => [x, y, z] as V3),
    0.02,
    [0, 0, -1],
  );
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i] ?? [0, 0];
    const [bx, by] = pts[(i + 1) % pts.length] ?? [0, 0];
    const [cx, cy] = pts.reduce(
      ([sx, sy], [x, y]) => [sx + x / pts.length, sy + y / pts.length],
      [0, 0],
    );
    const len = Math.hypot(bx - ax, by - ay) || 1;
    /* ขอบกรอบหนา fw หันเข้ากลางรูป */
    let nx = -(by - ay) / len;
    let ny = (bx - ax) / len;
    if ((cx - ax) * nx + (cy - ay) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    b.plate(
      "frameDark",
      [
        [ax, ay, z - 0.04],
        [bx, by, z - 0.04],
        [bx + nx * fw, by + ny * fw, z - 0.04],
        [ax + nx * fw, ay + ny * fw, z - 0.04],
      ],
      0.06,
      [0, 0, -1],
    );
  }
  if (mullionX !== null) {
    const ys = pts.map(([, y]) => y);
    const yb = Math.min(...ys);
    /* สูงของรูปที่ x นี้ — ใช้ขอบบนของสามเหลี่ยม */
    const top = Math.max(...ys);
    b.box("frameDark", mullionX - 0.025, yb, z - 0.04, mullionX + 0.025, top - 0.05, z + 0.02);
  }
}

/** ตะแกรงบล็อกช่องลมขาว (ภาพอ้างอิงทั้งสองโครงการ) ในระนาบ z คงที่ — ช่องสี่เหลี่ยมตาราง cell เมตร
    ทำเป็น geometry (ไม่ใช่ texture) รวมเป็นก้อนเดียวกับชิ้นขาวอื่น ไม่เพิ่ม draw call */
function breezeBlock(
  b: Builder,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  zf: number,
  zb: number,
  cell = 0.2,
) {
  const bar = 0.06;
  const nx = Math.max(1, Math.round((x1 - x0) / cell));
  const ny = Math.max(1, Math.round((y1 - y0) / cell));
  const sx = (x1 - x0) / nx;
  const sy = (y1 - y0) / ny;
  for (let i = 0; i <= nx; i++) {
    const x = x0 + i * sx;
    const w = i === 0 || i === nx ? bar : bar / 2;
    b.box("white", Math.max(x0, x - w), y0, zf, Math.min(x1, x + w), y1, zb);
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + j * sy;
    const w = j === 0 || j === ny ? bar : bar / 2;
    b.box("white", x0, Math.max(y0, y - w), zf, x1, Math.min(y1, y + w), zb);
  }
}

/** ราวกันตกขาวบางแบบภาพอ้างอิง (ระเบียงชั้นบนบ้านแฝด): ราวบน ราวล่าง เสาห่าง ~1.2 ม. ราวนอนสองเส้น */
function railing(b: Builder, alongX: boolean, a: number, c: number, at: number, y: number) {
  const len = c - a;
  if (len < 0.2) return;
  const put = (u0: number, u1: number, y0: number, y1: number, d: number) =>
    alongX
      ? b.box("white", u0, y0, at - d, u1, y1, at + d)
      : b.box("white", at - d, y0, u0, at + d, y1, u1);
  put(a, c, y + 0.96, y + 1.02, 0.03);
  for (const k of [0.12, 0.42, 0.72]) put(a, c, y + k, y + k + 0.025, 0.012);
  const posts = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= posts; i++) {
    const u = a + (len * i) / posts;
    put(Math.max(a, u - 0.025), Math.min(c, u + 0.025), y, y + 0.96, 0.025);
  }
}

/* ── ตัดรูปหลายเหลี่ยมหลังคา ───────────────────────────────────── */

/** Sutherland–Hodgman: ตัดรูปหลายเหลี่ยมนูน (ระนาบใดก็ได้) ด้วยระนาบตั้ง axis = v เก็บด้านน้อยกว่า/มากกว่า
    จุดตัดเลื่อนตามขอบ — รูปที่ได้ยังอยู่บนระนาบเดิม */
function clipPoly(pts: readonly V3[], axis: 0 | 2, v: number, keepLess: boolean): V3[] {
  const out: V3[] = [];
  const inside = (p: V3) => (keepLess ? p[axis] <= v + 1e-9 : p[axis] >= v - 1e-9);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as V3;
    const c = pts[(i + 1) % pts.length] as V3;
    const ia = inside(a);
    if (ia) out.push(a);
    if (ia !== inside(c)) {
      const t = (v - a[axis]) / (c[axis] - a[axis]);
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]);
    }
  }
  return out.filter((p, i) => {
    const q = out[(i + 1) % out.length] as V3;
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-4;
  });
}

type Notch = { x0: number; x1: number; z1: number };

/** รูปนูนลบช่องก้อนจั่ว (x0..x1 ตั้งแต่หน้าสุดถึง z1) บนผัง → ชิ้นนูนไม่ซ้อนกัน (ซ้าย · ขวา · หลังก้อนจั่ว) */
function minusNotch(pts: readonly V3[], n: Notch): V3[][] {
  const left = clipPoly(pts, 0, n.x0, true);
  const right = clipPoly(pts, 0, n.x1, false);
  const back = clipPoly(clipPoly(clipPoly(pts, 0, n.x0, false), 0, n.x1, true), 2, n.z1, false);
  return [left, right, back].filter((p) => p.length >= 3);
}

/** เรียงจุดให้ขอบแรกยาวสุดตามแกนที่ต้องการ — ลายกระเบื้องเรียงตามชายคา */
function alignFirst(pts: readonly V3[], axis: 0 | 2): V3[] {
  let best = 0;
  let len = -1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as V3;
    const c = pts[(i + 1) % pts.length] as V3;
    const d = Math.abs(c[axis] - a[axis]);
    if (d > len + 1e-6) {
      len = d;
      best = i;
    }
  }
  return [...pts.slice(best), ...pts.slice(0, best)];
}

/** กล่องตามแกนลบช่องก้อนจั่ว */
function boxMinusNotch(
  b: Builder,
  k: MatKey,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  n: Notch,
) {
  if (z0 >= n.z1 || x1 <= n.x0 || x0 >= n.x1) {
    b.box(k, x0, y0, z0, x1, y1, z1);
    return;
  }
  b.box(k, x0, y0, z0, Math.min(x1, n.x0), y1, z1);
  b.box(k, Math.max(x0, n.x1), y0, z0, x1, y1, z1);
  b.box(k, Math.max(x0, n.x0), y0, Math.max(z0, n.z1), Math.min(x1, n.x1), y1, z1);
}

/**
 * หลังคาและหน้าบ้านตามภาพอ้างอิง (สัดส่วนจาก facade ของแบบบ้าน — ดู geometry/exterior.ts roofPlan):
 * - ก้อนจั่วหน้า: ผนังใต้จั่วยกสูงกว่าชายคาปั้นหยา (knee) + หลังคาจั่วชัน · ลึกแค่ช่วงหน้า (gableDepth) แล้วชนปั้นหยา
 *   กรอบจั่วเทาเข้มหนารูปบ้านคว่ำลงถึงดิน ด้านในกรุไม้ · ผนังข้างก้อนจั่วแนวเดียวกับผิวนอกกรอบ
 * - single-gable: หน้าต่างกระจกห้าเหลี่ยมใต้ยอดจั่ว (เสากลาง) · ใต้จั่วเป็นกระจกบานสูงจาก data
 *   + ผนังไม้ตั้งข้างจั่วฝั่งโรงจอด
 * - twin: ครึ่งนอกของจั่วชั้นบนเป็นผนังไม้ ครึ่งในหน้าต่างสูง + หน้าต่างสามเหลี่ยมยอด · บัวขาวระดับพื้นชั้นสอง
 *   เสาในของกรอบจั่วเริ่มที่หลังคาโรงจอด (ภาพอ้างอิง) · ระเบียงชั้นบนราวขาว + ผนังบล็อกช่องลมขาวชิดผนังร่วม
 * - ปั้นหยาเตี้ยคลุมทั้งหลัง ตัดแถบชายคาหน้าก้อนจั่วออก (ส่วนที่อยู่ในก้อนจั่วมองไม่เห็น ส่วนที่สูงกว่าเป็นรางตะเข้)
 *   บ้านแฝดปลายผนังร่วมตัดตรง (ต่อกับหลังข้างเคียง)
 */
export function buildRoof(b: Builder, house: HouseShape) {
  const plan = roofPlan(house);
  const yE = plan.eaveY;
  const B = plan.bounds;
  const g = plan.gable;
  const twin = plan.style === "twin";
  const holes = frontOpenings(house, B.z0);
  const tanG = Math.tan((g.pitch * Math.PI) / 180);
  const cosG = Math.cos((g.pitch * Math.PI) / 180);
  const lift = capLift(g.pitch);
  const zFace = B.z0 - half;
  const t = FRAME_T;
  const cx = (g.x0 + g.x1) / 2;
  const K = g.knee;
  const yR = g.apex + lift;
  const oh = t + CAP_OH;
  const zF = g.z0 - FRAME_PROUD + 0.02;
  const zBack = g.z1 + half;
  const zB = zBack + CAP_BACK_OH;
  const eC = K + lift - oh * tanG;
  const innerLine = (x: number) => g.apex - Math.abs(x - cx) * tanG;
  /* ช่องที่ตัดออกจากปั้นหยา: แถบชายคาหน้าที่พาดผ่านหน้าก้อนจั่ว — หลังผนังหน้าปั้นหยาวิ่งเข้าไปในก้อนจั่วเอง */
  const notch: Notch = { x0: g.x0 - t, x1: g.x1 + t, z1: zFace };
  /* ฝั่งโรงจอด/ปั้นหยา (ตรงข้ามด้านจั่วของ facade) */
  const s = facadeOf(house).gable === "x-" ? 1 : -1;
  const J = s === 1 ? g.x1 : g.x0;
  const outerX = s === 1 ? B.x1 : B.x0;

  /* ── ก้อนจั่ว: ผนังปูนจากชายคาปั้นหยาถึง knee (ผนังข้างแนวผิวนอกกรอบจั่ว) ── */
  b.box("render", g.x0 - t, yE - 0.15, zFace, g.x1 + t, K, zBack);

  /* หลังคาจั่วสองแผง (ขอบแรกตามแนวชายคา) ชายคายื่นพ้นกรอบทั้งสองข้าง */
  b.plate(
    "roof",
    [
      [g.x0 - oh, eC, zF],
      [g.x0 - oh, eC, zB],
      [cx, yR, zB],
      [cx, yR, zF],
    ],
    GABLE_ROOF_T,
    [0, 1, 0],
  );
  b.plate(
    "roof",
    [
      [g.x1 + oh, eC, zB],
      [g.x1 + oh, eC, zF],
      [cx, yR, zF],
      [cx, yR, zB],
    ],
    GABLE_ROOF_T,
    [0, 1, 0],
  );
  b.box("fascia", cx - 0.11, yR - 0.03, zF, cx + 0.11, yR + 0.07, zB);
  b.box("fascia", g.x0 - oh - 0.05, eC - 0.2, zF, g.x0 - oh + 0.02, eC + 0.02, zB);
  b.box("fascia", g.x1 + oh - 0.02, eC - 0.2, zF, g.x1 + oh + 0.05, eC + 0.02, zB);

  /* กรอบจั่วเทาเข้ม: รูปบ้านคว่ำยื่นพ้นผนังหน้า เสาลงถึงสนาม
     บ้านแฝด: เสาฝั่งในเริ่มที่หลังคาโรงจอดระดับพื้นชั้นสอง (ภาพอ้างอิง) */
  const ground = -PLINTH_H;
  const innerFoot = STOREY_H - 0.06;
  const foot0 = twin && !g.outerX0 ? innerFoot : ground;
  const foot1 = twin && !g.outerX1 ? innerFoot : ground;
  const off = t / cosG;
  const zP = g.z0 - FRAME_PROUD;
  b.plate(
    "fascia",
    [
      [g.x0 - t, foot0, zP],
      [g.x0, foot0, zP],
      [g.x0, K, zP],
      [cx, g.apex, zP],
      [g.x1, K, zP],
      [g.x1, foot1, zP],
      [g.x1 + t, foot1, zP],
      [g.x1 + t, K - t * tanG + off, zP],
      [cx, g.apex + off, zP],
      [g.x0 - t, K - t * tanG + off, zP],
    ],
    FRAME_PROUD + 0.12,
    [0, 0, -1],
  );
  /* ด้านในกรอบกรุไม้ (ภาพอ้างอิง: ไม้ใต้ปีกจั่วและข้างเสา) — แผ่นบางห่างผิวกรอบ 5 มม. */
  const lin = 0.005;
  const zA = zP + 0.01;
  const zC = zFace - 0.005;
  b.box("oak", g.x0 + lin, Math.max(0, foot0), zA, g.x0 + lin + 0.02, K, zC);
  b.box("oak", g.x1 - lin - 0.02, Math.max(0, foot1), zA, g.x1 - lin, K, zC);
  const dn = lin / cosG;
  b.plate(
    "oak",
    [
      [g.x0 + lin, K - dn, zA],
      [cx, g.apex - dn, zA],
      [cx, g.apex - dn, zC],
      [g.x0 + lin, K - dn, zC],
    ],
    0.02,
    [0.7, -0.7, 0],
  );
  b.plate(
    "oak",
    [
      [cx, g.apex - dn, zA],
      [g.x1 - lin, K - dn, zA],
      [g.x1 - lin, K - dn, zC],
      [cx, g.apex - dn, zC],
    ],
    0.02,
    [-0.7, -0.7, 0],
  );

  /* หน้าจั่วหน้า/ท้ายก้อนจั่ว: ปูนขาว (ผนัง yE..knee คือหน้ากล่องด้านบน) */
  b.plate(
    "render",
    [
      [g.x0 - t, K, zFace],
      [g.x1 + t, K, zFace],
      [cx, g.apex + off, zFace],
    ],
    0.1,
    [0, 0, -1],
  );
  b.plate(
    "render",
    [
      [g.x1 + t, K, zBack],
      [g.x0 - t, K, zBack],
      [cx, g.apex + off, zBack],
    ],
    0.1,
    [0, 0, 1],
  );

  const zWin = zFace - 0.02;
  const underCap = holes.filter((h) => h.to > g.x0 && h.from < g.x1);
  const headTop = Math.max(yE - 0.4, ...underCap.map((h) => h.head));
  if (!twin) {
    /* หน้าต่างกระจกห้าเหลี่ยมใต้ยอดจั่ว: ข้างตั้ง + ขอบบนขนานปีกจั่ว เว้นจากปีก 0.28 ม. + เสากลาง
       (ภาพอ้างอิง: ขอบล่างสูงกว่าวงกบประตูกระจก ≈ 0.6 ม. กว้างเกือบเต็มหน้าจั่ว) */
    const inset = 0.28 / cosG;
    const base = Math.max(headTop + 0.5, K - 0.7);
    const top = g.apex - inset;
    const yAt = (u: number) => top - u * tanG;
    const hw = Math.min(((g.x1 - g.x0) / 2) * 0.8, (top - base - 0.3) / tanG);
    if (top - base > 0.6 && hw > 0.4)
      glassTriangle(
        b,
        [
          [cx - hw, base],
          [cx + hw, base],
          [cx + hw, yAt(hw)],
          [cx, top],
          [cx - hw, yAt(hw)],
        ],
        zWin,
        cx,
      );
  } else {
    /* บ้านแฝด: บัวขาวระดับพื้นชั้นสองตลอดหน้าจั่ว */
    const yL = STOREY_H;
    b.box("white", g.x0, yL - 0.06, zFace - 0.14, g.x1, yL + 0.1, zFace);
    /* ครึ่งนอกของจั่วชั้นบนเป็นผนังไม้ตั้ง จากบัวถึงขอบจั่ว เว้นช่องหน้าต่าง */
    const width = g.x1 - g.x0;
    const outerRight = g.outerX1 || !g.outerX0;
    const cA = outerRight ? g.x0 + width * 0.52 : g.x0;
    const cB = outerRight ? g.x1 : g.x0 + width * 0.48;
    const bw = 0.13;
    const gap = 0.014;
    const lineAt = (x: number) => Math.min(innerLine(x), K + Math.min(x - g.x0, g.x1 - x) * tanG);
    for (let x = cA; x < cB - 0.02; x += bw + gap) {
      const xa = x;
      const xb = Math.min(cB, x + bw);
      const tops = [lineAt(xa), lineAt(xb)];
      const hasPeak = xa < cx && xb > cx;
      for (const r of verticalRuns(xa, xb, yL + 0.1, Math.max(...tops), holes)) {
        const lowTop = Math.min(...tops);
        if (r.b < lowTop - 1e-3) {
          b.box("oak", xa, r.a, zFace - 0.04, xb, r.b, zFace);
        } else {
          const pts: V3[] = [
            [xa, r.a, zFace - 0.04],
            [xb, r.a, zFace - 0.04],
            [xb, Math.max(r.a + 0.01, tops[1] ?? r.b), zFace - 0.04],
          ];
          if (hasPeak) pts.push([cx, g.apex, zFace - 0.04]);
          pts.push([xa, Math.max(r.a + 0.01, tops[0] ?? r.b), zFace - 0.04]);
          b.plate("oak", pts, 0.04, [0, 0, -1]);
        }
      }
    }
    /* หน้าต่างสามเหลี่ยมฝั่งใน (ภาพอ้างอิง): ขอบล่างใต้ knee เล็กน้อย ด้านตั้งชิดผนังไม้ ด้านเอียงขนานปีกจั่ว */
    const inset = 0.3 / cosG;
    const dir = outerRight ? 1 : -1;
    const start = outerRight ? g.x0 : g.x1;
    const X = (u: number) => start + dir * u;
    const slopeAt = (u: number) => K + u * tanG - inset;
    const base = Math.max(headTop + 0.2, K - 0.3);
    const uEdge = Math.abs((outerRight ? cA : cB) - start) - 0.12;
    const u0 = Math.max(0.25, (base + 0.05 - K + inset) / tanG);
    const yt = Math.min(innerLine(X(uEdge)) - inset, slopeAt(uEdge));
    if (yt - base > 0.35 && uEdge - u0 > 0.4) {
      const pts: [number, number][] = [
        [X(u0), base],
        [X(uEdge), base],
        [X(uEdge), yt],
      ];
      if (slopeAt(u0) > base + 0.06) pts.push([X(u0), slopeAt(u0)]);
      glassTriangle(b, pts, zWin, null);
    }
  }

  /* ── ปั้นหยาเตี้ยคลุมทั้งหลัง สันขนานถนน · ตัดแถบหน้าก้อนจั่วออก ── */
  const H = plan.hip;
  const O = hipOutline(H);
  const R = hipRidge(H);
  const e = H.eave;
  const up: V3 = [0, 1, 0];
  const faces: { pts: V3[]; axis: 0 | 2 }[] = [
    {
      pts: [
        [O.x0, e, O.z0],
        [O.x1, e, O.z0],
        [R.x1, R.y, R.z],
        [R.x0, R.y, R.z],
      ],
      axis: 0,
    },
    {
      pts: [
        [O.x1, e, O.z1],
        [O.x0, e, O.z1],
        [R.x0, R.y, R.z],
        [R.x1, R.y, R.z],
      ],
      axis: 0,
    },
  ];
  if (H.hipX0)
    faces.push({
      pts: [
        [O.x0, e, O.z1],
        [O.x0, e, O.z0],
        [R.x0, R.y, R.z],
      ],
      axis: 2,
    });
  if (H.hipX1)
    faces.push({
      pts: [
        [O.x1, e, O.z0],
        [O.x1, e, O.z1],
        [R.x1, R.y, R.z],
      ],
      axis: 2,
    });
  for (const f of faces) {
    const clean = f.pts.filter((p, i) => {
      const q = f.pts[(i + 1) % f.pts.length] as V3;
      return Math.hypot(p[0] - q[0], p[2] - q[2]) > 1e-4;
    });
    for (const piece of minusNotch(clean, notch))
      b.plate("roof", alignFirst(piece, f.axis), HIP_ROOF_T, up);
  }
  /* ปลายผนังร่วม: หน้าจั่วปูนปิด (หลังข้างเคียงบังอยู่) */
  for (const [open, X] of [
    [!H.hipX0, O.x0],
    [!H.hipX1, O.x1],
  ] as const) {
    if (!open) continue;
    b.plate(
      "render",
      [
        [X, yE, B.z0 - half],
        [X, yE, B.z1 + half],
        [X, R.y - 0.1, R.z],
      ],
      0.1,
      [X > (O.x0 + O.x1) / 2 ? 1 : -1, 0, 0],
    );
  }
  /* ครอบสัน + รางน้ำเทาเข้ม */
  boxMinusNotch(b, "fascia", R.x0, R.y - 0.03, R.z - 0.09, R.x1, R.y + 0.06, R.z + 0.09, notch);
  boxMinusNotch(b, "fascia", O.x0, e - 0.2, O.z0 - 0.05, O.x1, e + 0.02, O.z0 + 0.02, notch);
  boxMinusNotch(b, "fascia", O.x0, e - 0.2, O.z1 - 0.02, O.x1, e + 0.02, O.z1 + 0.05, notch);
  if (H.hipX0)
    boxMinusNotch(b, "fascia", O.x0 - 0.05, e - 0.2, O.z0, O.x0 + 0.02, e + 0.02, O.z1, notch);
  if (H.hipX1)
    boxMinusNotch(b, "fascia", O.x1 - 0.02, e - 0.2, O.z0, O.x1 + 0.05, e + 0.02, O.z1, notch);

  if (!twin) {
    /* ผนังไม้ตั้งข้างจั่วฝั่งโรงจอด (ภาพอ้างอิง) กว้างถึง 3.2 ม. จากเสากรอบจั่ว เว้นช่องหน้าต่าง */
    const ca = J + s * t;
    const cb = J + s * Math.min(3.2, Math.abs(outerX - J) - 0.4);
    const lo2 = Math.min(ca, cb);
    const hi2 = Math.max(ca, cb);
    const bw = 0.13;
    const gap = 0.014;
    for (let x = lo2; x < hi2 - 0.02; x += bw + gap) {
      const xb = Math.min(hi2, x + bw);
      for (const r of verticalRuns(x, xb, 0.12, Math.min(WALL_H, yE) - 0.02, holes)) {
        b.box("oak", x, r.a, zFace - 0.035, xb, r.b, zFace);
      }
    }
  } else {
    /* ระเบียงชั้นบน + ผนังบล็อกช่องลมชิดผนังร่วม (ภาพอ้างอิง) */
    const yF = STOREY_H;
    const zr = B.z0 - half - BALCONY_D;
    const ra = J + s * (t + 0.05);
    const party = outerX + s * half;
    const scr = party - s * 1.3;
    b.box("concrete", Math.min(J, party), yF - 0.05, zr, Math.max(J, party), yF, B.z0 - half);
    railing(b, true, Math.min(ra, scr), Math.max(ra, scr), zr + 0.03, yF);
    railing(b, false, zr + 0.03, B.z0 - half, ra, yF);
    breezeBlock(b, Math.min(scr, party), Math.max(scr, party), yF, yE, zr - 0.06, zr + 0.08);
  }
}

/* ── วงกบหน้าต่าง/ประตูทางเข้า ─────────────────────────────────── */

/**
 * วงกบรอบช่องเปิดจริงของผนังหนึ่ง segment (เต็มความหนาผนัง + 1 ซม. ต่อข้าง) — ภาพอ้างอิงเป็นอะลูมิเนียมสีดำ
 * ไม่ใส่ประตูภายใน · pane = ใส่กระจกบางกลางผนัง (โหมดเดินดู)
 */
export function buildOpeningTrim<K extends string>(
  b: Builder<K>,
  seg: WallSegment,
  keys: { frame: K; pane?: K },
) {
  const d = half + 0.012;
  const fw = 0.05;
  const put = (k: K, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) =>
    seg.axis === "x"
      ? b.box(k, u0, y0, seg.at + d0, u1, y1, seg.at + d1)
      : b.box(k, seg.at + d0, y0, u0, seg.at + d1, y1, u1);
  for (const o of seg.openings) {
    if (o.kind === "door") continue;
    const v = openingV(o);
    const top = Math.min(v.head, WALL_H - 0.02);
    const bottom = v.sill > 0 ? v.sill : 0.04;
    put(keys.frame, o.from, o.from + fw, bottom, top, -d, d);
    put(keys.frame, o.to - fw, o.to, bottom, top, -d, d);
    put(keys.frame, o.from + fw, o.to - fw, top - fw, top, -d, d);
    if (o.kind !== "window") continue;
    put(keys.frame, o.from + fw, o.to - fw, bottom, bottom + fw, -d, d);
    const mid = (o.from + o.to) / 2;
    if (o.to - o.from > 0.9)
      put(keys.frame, mid - 0.022, mid + 0.022, bottom + fw, top - fw, -0.035, 0.035);
    if (keys.pane) put(keys.pane, o.from + fw, o.to - fw, bottom + fw, top - fw, -0.004, 0.004);
  }
}

/* ── ที่ตั้ง: ฐาน ชาน ทางเดิน รั้ว ลานกรวด โรงจอดรถ พุ่มไม้ ─────────────────── */

export function buildSite(
  b: Builder,
  s: SiteLayout,
  opts: {
    /** วาดสนามของแปลงด้วย (diorama ใช่ · หมู่บ้านมีสนามของแปลงเอง) */
    lawn: boolean;
    /** ระเบียงที่เป็นห้องใน data มีพื้นของมันเองใน diorama แล้ว — ไม่ต้องปูซ้ำ */
    deck: boolean;
  },
) {
  const g = -PLINTH_H;
  const p = s.plot;
  if (opts.lawn) b.box("lawn", p.x0, g - 0.06, p.z0, p.x1, g, p.z1);

  const pl = s.plinth;
  b.box(
    "concrete",
    pl.x0 - half - 0.04,
    g - 0.02,
    pl.z0 - half - 0.04,
    pl.x1 + half + 0.04,
    -0.004,
    pl.z1 + half + 0.04,
  );
  const po = s.porch;
  b.box("concrete", po.x0, g - 0.02, po.z0, po.x1, opts.deck ? -0.045 : -0.004, po.z1);
  if (opts.deck) b.box("oak", po.x0 + 0.02, -0.045, po.z0 + 0.02, po.x1 - 0.02, 0, po.z1);

  /* ขั้นบันไดสองขั้น */
  const st = s.steps;
  const mid = (st.z0 + st.z1) / 2;
  b.box("concrete", st.x0, g - 0.02, st.z0, st.x1, g + PLINTH_H / 3, st.z1);
  b.box("concrete", st.x0, g - 0.02, mid, st.x1, g + (PLINTH_H * 2) / 3, st.z1);

  if (s.driveway) {
    const d = s.driveway;
    b.box("paving", d.x0, g - 0.02, d.z0, d.x1, g + 0.018, d.z1);
  }
  if (s.carport) buildCarport(b, s.carport);

  if (s.yard) {
    const y = s.yard;
    b.box("gravelDark", y.x0, g - 0.02, y.z0, y.x1, g + 0.014, y.z1);
  }
  /* แนวกรวดขาวของทางเดิน กว้างเท่าขั้นบันได — วางทับลานกรวดดำได้ */
  b.box("gravel", s.gravel.x0, g - 0.02, s.gravel.z0, s.gravel.x1, g + 0.02, s.gravel.z1);
  for (const r of s.stones) b.box("concrete", r.x0, g - 0.02, r.z0, r.x1, g + 0.035, r.z1);
  for (const h of s.hedges) {
    b.box("hedge", h.x0, g, h.z0, h.x1, g + 0.82, h.z1);
    b.box("hedge", h.x0 + 0.06, g + 0.82, h.z0 + 0.06, h.x1 - 0.06, g + 0.9, h.z1 - 0.06);
  }
  const rw = s.rearWall;
  b.box("render", rw.x0, g - 0.02, rw.z0, rw.x1, g + 1.35, rw.z1);
  b.box("concrete", rw.x0 - 0.02, g + 1.35, rw.z0 - 0.02, rw.x1 + 0.02, g + 1.4, rw.z1 + 0.02);

  /* รั้วหน้าบล็อกช่องลมขาว + ประตูระแนงขาว (ภาพอ้างอิง) */
  if (s.fence) {
    const { z0, z1, runs } = s.fence;
    const top = g + FENCE_H;
    for (const r of runs) {
      if (r.kind === "pier") {
        b.box("render", r.x0, g - 0.02, z0 - 0.02, r.x1, top + 0.06, z1 + 0.02);
      } else if (r.kind === "breeze") {
        b.box("render", r.x0, g - 0.02, z0, r.x1, g + 0.2, z1);
        breezeBlock(b, r.x0, r.x1, g + 0.2, top, z0, z1);
      } else {
        /* ประตูรั้วระแนงตั้งขาว */
        b.box("white", r.x0 + 0.03, g + 0.06, z0 + 0.03, r.x1 - 0.03, g + 0.12, z1 - 0.03);
        b.box("white", r.x0 + 0.03, top - 0.12, z0 + 0.03, r.x1 - 0.03, top - 0.06, z1 - 0.03);
        for (let x = r.x0 + 0.06; x < r.x1 - 0.05; x += 0.1)
          b.box("white", x, g + 0.06, z0 + 0.04, x + 0.035, top - 0.06, z1 - 0.04);
      }
    }
  }
}

/** โรงจอดรถหลังคาแบน: แผ่นขาวบาง แถบขอบเทาเข้มด้านที่เปิด เสาขาวเรียวตามผังที่ตั้ง (ภาพอ้างอิง) */
export function buildCarport(b: Builder, c: Carport, part: "all" | "posts" | "roof" = "all") {
  const g = -PLINTH_H;
  const yTop = c.top;
  const yBot = yTop - CARPORT_SLAB;
  if (part !== "roof") for (const p of c.posts) b.box("white", p.x0, g, p.z0, p.x1, yBot, p.z1);
  if (part === "posts") return;
  /* แผ่นหลังคา = กรอบในผัง พอดี (ตัวตรวจเช็กกรอบนี้กับแปลง) · แถบขอบเทาเข้ม 5 ซม. ด้านที่เปิด (ไม่ชนบ้าน/ผนังร่วม) */
  const ft = 0.05;
  const open = {
    x0: c.party !== "x-" && c.wall !== "x-",
    x1: c.party !== "x+" && c.wall !== "x+",
    z1: c.wall !== "z+",
  };
  const ix0 = open.x0 ? c.x0 + ft : c.x0;
  const ix1 = open.x1 ? c.x1 - ft : c.x1;
  const iz1 = open.z1 ? c.z1 - ft : c.z1;
  b.box("white", ix0, yBot, c.z0 + ft, ix1, yTop - 0.02, iz1);
  b.box("fascia", c.x0, yBot - 0.02, c.z0, c.x1, yTop, c.z0 + ft);
  if (open.z1) b.box("fascia", c.x0, yBot - 0.02, iz1, c.x1, yTop, c.z1);
  if (open.x0) b.box("fascia", c.x0, yBot - 0.02, c.z0 + ft, ix0, yTop, iz1);
  if (open.x1) b.box("fascia", ix1, yBot - 0.02, c.z0 + ft, c.x1, yTop, iz1);
}

/* ── ตำแหน่งของแปลงในโลก ─────────────────────────────────────── */

/** เมทริกซ์จากพิกัดบ้านไปพิกัดฉาก: กลางแปลงในฉาก (wx, wz) หมุน rot แล้วยกพื้นบ้านขึ้นเหนือสนาม */
export function plotMatrix(s: SiteLayout, wx: number, wz: number, rot: number, groundY = 0) {
  const pcx = (s.plot.x0 + s.plot.x1) / 2;
  const pcz = (s.plot.z0 + s.plot.z1) / 2;
  return new Matrix4()
    .makeTranslation(wx, groundY + PLINTH_H, wz)
    .multiply(new Matrix4().makeRotationY(rot))
    .multiply(new Matrix4().makeTranslation(-pcx, 0, -pcz));
}

/** จุดในพิกัดบ้าน → ฉาก (ใช้กับต้นไม้ที่เป็น instance) */
export function applyPoint(m: Matrix4, x: number, y: number, z: number): V3 {
  const p = new Vector3(x, y, z).applyMatrix4(m);
  return [p.x, p.y, p.z];
}

/* ── บิวท์อินที่นั่งริมหน้าต่าง (ห้องนั่งเล่น) ───────────────── */

/**
 * ที่นั่งไม้โอ๊กใต้หน้าต่าง ลิ้นชักด้านหน้า เบาะผ้า + กรอบไม้รอบช่องหน้าต่างเป็นซุ้ม
 * ตำแหน่งจาก windowSeat() ใน geometry — เป็นสถาปัตยกรรมที่คำนวณจากหน้าต่างจริง ไม่ใช่เฟอร์นิเจอร์ใน data
 */
export function buildWindowSeat<K extends string>(
  b: Builder<K>,
  seat: WindowSeat,
  keys: { wood: K; cushion: K },
) {
  const alongZ = seat.facing === "x+" || seat.facing === "x-";
  const u0 = alongZ ? seat.z0 : seat.x0;
  const u1 = alongZ ? seat.z1 : seat.x1;
  /* v วัดจากผนังเข้าห้อง 0..depth */
  const wall =
    seat.facing === "x+"
      ? seat.x0
      : seat.facing === "x-"
        ? seat.x1
        : seat.facing === "z+"
          ? seat.z0
          : seat.z1;
  const dir = seat.facing === "x+" || seat.facing === "z+" ? 1 : -1;
  const depth = alongZ ? seat.x1 - seat.x0 : seat.z1 - seat.z0;
  const put = (k: K, a0: number, a1: number, v0: number, v1: number, y0: number, y1: number) => {
    const p = wall + dir * v0;
    const q = wall + dir * v1;
    if (alongZ) b.box(k, Math.min(p, q), y0, a0, Math.max(p, q), y1, a1);
    else b.box(k, a0, y0, Math.min(p, q), a1, y1, Math.max(p, q));
  };
  const h = seat.seatH;
  const head = OPENING_V.window.head;
  /* ซุ้มไม้: แผงข้างสองแผง + แผงบน */
  put(keys.wood, u0, u0 + 0.04, 0, depth, 0.04, head + 0.32);
  put(keys.wood, u1 - 0.04, u1, 0, depth, 0.04, head + 0.32);
  put(keys.wood, u0, u1, 0, depth, head + 0.24, head + 0.32);
  /* ตัวที่นั่ง: โครง + หน้าลิ้นชักสามช่อง + แผ่นท็อป */
  put(keys.wood, u0 + 0.04, u1 - 0.04, 0, depth - 0.02, 0.04, h - 0.04);
  const n = 3;
  const span = (u1 - u0 - 0.08) / n;
  for (let i = 0; i < n; i++) {
    const a = u0 + 0.04 + i * span;
    put(keys.wood, a + 0.006, a + span - 0.006, depth - 0.02, depth, 0.1, h - 0.08);
  }
  put(keys.wood, u0 + 0.04, u1 - 0.04, 0, depth + 0.02, h - 0.04, h);

  /* ผ้า: เบาะนั่งนุ่มผืนเดียว + หมอนพิง 2-3 ใบเอนพิงผนัง + หมอนข้างทรงกระบอกสองปลาย
     กรอบพิกัดเฉพาะของที่นั่ง: แกน a ตามแนวยาวที่นั่ง · แกน v จากผนังเข้าห้อง · y ขึ้น
     ev คือทิศ v ในโลก · ea = ey × ev ให้ฐานเป็นมือขวา (ผิวไม่กลับด้าน) — ของทุกชิ้นสมมาตรตามแกน a */
  const ey = new Vector3(0, 1, 0);
  const ev = alongZ ? new Vector3(dir, 0, 0) : new Vector3(0, 0, dir);
  const ea = new Vector3().crossVectors(ey, ev);
  const at = (a: number, y: number, v: number, tilt = 0) => {
    const pos = alongZ ? new Vector3(wall + dir * v, y, a) : new Vector3(a, y, wall + dir * v);
    return new Matrix4()
      .makeBasis(ea, ey, ev)
      .setPosition(pos)
      .multiply(new Matrix4().makeRotationX(tilt));
  };
  const a0 = u0 + 0.05;
  const a1 = u1 - 0.05;
  const mid = (a0 + a1) / 2;
  const pad = 0.1;
  b.mesh(
    keys.cushion,
    cushionGeometry(a1 - a0, pad, depth - 0.05, 0.035, 0.018, "y"),
    at(mid, h + pad / 2, 0.02 + (depth - 0.05) / 2),
  );
  const top = h + pad;
  /* หมอนข้าง: วางตามความลึกชิดแผงข้างทั้งสองปลาย */
  const br = 0.09;
  const bolsters = a1 - a0 >= 1.2;
  if (bolsters) {
    for (const a of [a0 + br + 0.01, a1 - br - 0.01]) {
      b.mesh(keys.cushion, bolsterGeometry(depth - 0.12, br), at(a, top + br - 0.01, depth / 2));
    }
  }
  /* หมอนพิง: แบ่งช่วงกลางเท่าๆ กัน เว้นช่องเล็กระหว่างใบ เอนหลังเข้าหาผนัง */
  const inner0 = bolsters ? a0 + 2 * br + 0.04 : a0;
  const inner1 = bolsters ? a1 - 2 * br - 0.04 : a1;
  const pillows = inner1 - inner0 >= 1.5 ? 3 : 2;
  const gap = 0.04;
  const cw = Math.min(0.55, (inner1 - inner0 - gap * (pillows - 1)) / pillows);
  const run = cw * pillows + gap * (pillows - 1);
  const ch = 0.38;
  const ct = 0.14;
  const tilt = -0.2;
  for (let i = 0; i < pillows; i++) {
    const a = (inner0 + inner1) / 2 - run / 2 + cw / 2 + i * (cw + gap);
    b.mesh(
      keys.cushion,
      cushionGeometry(cw, ch, ct, 0.05, 0.03, "z"),
      at(
        a,
        top + (ch / 2) * Math.cos(tilt) - 0.01,
        0.04 + ct / 2 + (ch / 2) * Math.sin(-tilt),
        tilt,
      ),
    );
  }
}

/* ── ผ้าม่านโปร่ง ─────────────────────────────────────────────── */

/**
 * ม่านสองผืนรูดไว้ข้างหน้าต่างทุกบานของผนังนอก ฝั่งในห้อง + ราวม่าน
 * ผืนผ้าเป็นแผ่นพับคลื่น (ไม่ใช่กล่อง) แสงทะลุได้ — วัสดุ sheer ใน surfaces.ts
 */
export function curtainGeometry(
  segments: readonly WallSegment[],
  indoor: ReadonlySet<string>,
): { cloth: BufferGeometry | null; rods: Parts<"rod"> } {
  const panels: BufferGeometry[] = [];
  const rods = new Builder<"rod">();
  for (const seg of segments) {
    const minusIn = seg.roomMinus !== null && indoor.has(seg.roomMinus);
    const plusIn = seg.roomPlus !== null && indoor.has(seg.roomPlus);
    if (minusIn === plusIn) continue;
    const side = minusIn ? -1 : 1;
    const off = seg.at + side * (half + 0.1);
    for (const o of seg.openings) {
      if (o.kind !== "window") continue;
      const top = Math.min(openingV(o).head + 0.24, WALL_H - 0.04);
      const lo = Math.max(seg.from + 0.05, o.from - 0.32);
      const hi = Math.min(seg.to - 0.05, o.to + 0.32);
      for (const [a, c] of [
        [lo, o.from + 0.16],
        [o.to - 0.16, hi],
      ] as const) {
        const w = c - a;
        if (w < 0.2) continue;
        const g = new PlaneGeometry(w, top - 0.06, 18, 1);
        const p = g.getAttribute("position");
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          p.setZ(
            i,
            0.035 * Math.sin(((x + w / 2) / w) * Math.PI * 2 * Math.max(2, Math.round(w / 0.16))),
          );
        }
        g.computeVertexNormals();
        const mid = (a + c) / 2;
        const y = 0.06 + (top - 0.06) / 2;
        if (seg.axis === "x") g.translate(mid, y, off);
        else {
          g.rotateY(Math.PI / 2);
          g.translate(off, y, mid);
        }
        panels.push(g.toNonIndexed());
        g.dispose();
      }
      const ra = o.from - 0.4;
      const rb = o.to + 0.4;
      if (seg.axis === "x") rods.box("rod", ra, top, off - 0.012, rb, top + 0.025, off + 0.012);
      else rods.box("rod", off - 0.012, top, ra, off + 0.012, top + 0.025, rb);
    }
  }
  const cloth = panels.length > 0 ? mergeGeometries(panels, false) : null;
  panels.forEach((g) => g.dispose());
  return { cloth, rods: rods.build() };
}
