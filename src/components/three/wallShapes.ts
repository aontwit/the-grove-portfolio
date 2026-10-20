import { ExtrudeGeometry, Path, Shape } from "three";
import { WALL_M, openingV, type WallSegment } from "@/geometry";

/* สร้างรูปตัดของผนังหนึ่ง segment ในระนาบ (u = ความยาวผนัง, y = ความสูง)
   ช่องเปิดเป็นรูจริงในรูปทรงเดียว ไม่ใช่กล่องวางทับกัน:
   - ช่องที่ตัดผนังทั้งความสูง (ประตูบนผนังเตี้ย) → ตัดผนังขาดเป็นสองชิ้น
   - ช่องที่ติดพื้น (ประตู) → เว้าขึ้นจากขอบล่างของรูปทรง
   - ช่องที่ลอยกลางผนัง (หน้าต่าง) → เป็นรูในรูปทรง */

export type WallShapes = { shapes: Shape[]; openingIds: string[] };

const EPS = 0.02;

export function wallShapes(seg: WallSegment, height: number): WallShapes {
  const len = seg.to - seg.from;
  const used: string[] = [];

  type Local = { id: string; u0: number; u1: number; sill: number; head: number };
  const locals: Local[] = [];
  const fullCuts: Local[] = [];

  for (const o of seg.openings) {
    const v = openingV(o);
    const u0 = Math.max(0, o.from - seg.from);
    const u1 = Math.min(len, o.to - seg.from);
    if (u1 - u0 <= 0) continue;
    if (v.sill >= height) continue; // ช่องอยู่สูงกว่าผนังชิ้นนี้ทั้งช่อง
    const local = { id: o.id, u0, u1, sill: v.sill, head: Math.min(v.head, height) };
    used.push(o.id);
    if (local.sill <= 0 && local.head >= height) fullCuts.push(local);
    else locals.push(local);
  }

  // ตัดผนังเป็นช่วงย่อยตามช่องที่ตัดขาดทั้งความสูง
  const spans: { a: number; b: number }[] = [];
  let cursor = 0;
  for (const c of [...fullCuts].sort((p, q) => p.u0 - q.u0)) {
    if (c.u0 > cursor) spans.push({ a: cursor, b: c.u0 });
    cursor = Math.max(cursor, c.u1);
  }
  if (cursor < len) spans.push({ a: cursor, b: len });

  const shapes: Shape[] = [];
  for (const span of spans) {
    const inSpan = locals
      .filter((l) => l.u0 >= span.a - 1e-6 && l.u1 <= span.b + 1e-6)
      .sort((p, q) => p.u0 - q.u0);
    const notches = inSpan.filter((l) => l.sill <= 0);
    const holes = inSpan.filter((l) => l.sill > 0);

    const s = new Shape();
    s.moveTo(span.a, 0);
    for (const n of notches) {
      s.lineTo(n.u0, 0);
      s.lineTo(n.u0, n.head);
      s.lineTo(n.u1, n.head);
      s.lineTo(n.u1, 0);
    }
    s.lineTo(span.b, 0);
    s.lineTo(span.b, height);
    s.lineTo(span.a, height);
    s.closePath();

    for (const h of holes) {
      // กันขอบรูชนขอบบนของผนัง ซึ่งทำให้ triangulation เพี้ยน
      const top = Math.min(h.head, height - EPS);
      if (top <= h.sill) continue;
      const p = new Path();
      p.moveTo(h.u0, h.sill);
      p.lineTo(h.u1, h.sill);
      p.lineTo(h.u1, top);
      p.lineTo(h.u0, top);
      p.closePath();
      s.holes.push(p);
    }

    shapes.push(s);
  }

  return { shapes, openingIds: used };
}

/** ลบมุมขอบผนังในฉาก maquette (เมตร) — 6 มม. พอให้สันผนังรับแสงเป็นเส้น ไม่ทำให้ช่องเปิดแคบลงจนสังเกตได้ */
export const WALL_BEVEL = 0.006;

/**
 * extrude รูปตัดผนังให้หนา WALL_M พอดี (z ∈ [0, WALL_M])
 * bevel > 0: ลบมุมสันทุกด้าน โดยขอบนอกสุดยังตรงกับรูปตัดเดิม (bevelOffset ชดเชย)
 * ขนาดผนังจึงไม่เปลี่ยน — 2D, iso และ walkthrough ยังวัดได้ตัวเลขเดียวกัน
 */
export function extrudeWall(shapes: Shape[], bevel = 0): ExtrudeGeometry {
  if (bevel <= 0) return new ExtrudeGeometry(shapes, { depth: WALL_M, bevelEnabled: false });
  const g = new ExtrudeGeometry(shapes, {
    depth: WALL_M - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
  });
  g.translate(0, 0, bevel);
  return g;
}
