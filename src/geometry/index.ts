/* แหล่งเรขาคณิตกลางของโปรเจกต์ — แปลน 2D, isometric และ walkthrough อ่านจากที่นี่ที่เดียว
   โมดูลนี้ไม่พึ่ง dependency ใดเลย เพื่อให้ทั้ง Next และ node (pnpm geometry:check) เรียกได้เหมือนกัน */

export type Axis = "x" | "z";

export type GeomRoom = {
  id: string;
  name: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  outdoor: boolean;
  /** ชั้นที่ห้องอยู่ — ตัวตรวจและมุมมองทั้งหมดทำงานทีละชั้น */
  floor?: number;
  /** ห้องที่มีบันได ใช้เป็นจุดตั้งต้นการเดินถึงบนชั้นที่ไม่มีทางเข้าบ้าน */
  stair?: boolean;
};

export type GeomOpening = {
  id: string;
  kind: "door" | "entry" | "window";
  wallAxis: Axis;
  at: number;
  from: number;
  to: number;
  /** ชั้นของช่องเปิด (ไม่ใส่ = ชั้น 1) — ภายนอกบ้าน (exterior.ts) ต้องรู้ว่าหน้าต่างอยู่ชั้นไหน */
  floor?: number;
  /** ระดับล่าง/บนเฉพาะช่องนี้ (เมตร) — ไม่ใส่ = ค่าตามชนิดใน OPENING_V
      ใช้กับบานกระจกสูงจากพื้นตามภาพหน้าบ้านจริง (ประตูกระจกใต้จั่ว) */
  sill?: number;
  head?: number;
};

export type WallSegment = {
  id: string;
  /** แนวที่ผนังทอดตัว: 'x' = ผนังนอนที่ z คงที่, 'z' = ผนังตั้งที่ x คงที่ */
  axis: Axis;
  /** พิกัดคงที่ของผนัง (z เมื่อ axis='x', x เมื่อ axis='z') */
  at: number;
  from: number;
  to: number;
  kind: "exterior" | "interior";
  /** id ห้องฝั่งพิกัดน้อย / ฝั่งพิกัดมาก — null คือด้านนอกบ้าน */
  roomMinus: string | null;
  roomPlus: string | null;
  openings: GeomOpening[];
};

export type Bounds = { x0: number; z0: number; x1: number; z1: number };

/** ปัดเป็นมิลลิเมตร — กันเศษ floating point ตอนเทียบขอบห้อง */
export const mm = (n: number): number => Math.round(n * 1000) / 1000;

export const roomWidth = (r: GeomRoom): number => mm(r.x1 - r.x0);
export const roomDepth = (r: GeomRoom): number => mm(r.z1 - r.z0);
export const roomArea = (r: GeomRoom): number =>
  Math.round((r.x1 - r.x0) * (r.z1 - r.z0) * 100) / 100;

/** ความหนาผนัง (เมตร) — ผนังคร่อมเส้นขอบห้องข้างละครึ่ง */
export const WALL_M = 0.12;

/** ความสูงผนัง (เมตร) — ผนังเต็ม และผนังเตี้ยด้านที่ถูกตัดเปิดให้มองเห็นในบ้าน */
export const WALL_H = 2.6;
export const WALL_LOW_H = 0.35;

/** ระยะที่ต้องเว้นหน้าประตูให้เดินผ่านได้ (เมตร) — เฟอร์นิเจอร์ห้ามล้ำเข้ามา */
export const DOOR_CLEARANCE_M = 0.6;

/** ระดับล่าง-บนของช่องเปิดแต่ละชนิด (เมตร) — 2D, 3D และ walkthrough ใช้ชุดเดียวกัน */
export const OPENING_V: Record<GeomOpening["kind"], { sill: number; head: number }> = {
  door: { sill: 0, head: 2.1 },
  entry: { sill: 0, head: 2.2 },
  window: { sill: 0.9, head: 2.1 },
};

/** ระดับล่าง-บนจริงของช่องเปิดหนึ่งช่อง — ค่าเฉพาะช่อง (sill/head ใน data) ก่อน แล้วค่อยค่าตามชนิด
    ทุกมุมมอง (ผนัง 2D/3D เดินดู ภายนอก) ต้องอ่านผ่านตัวนี้ ไม่อ่าน OPENING_V ตรงๆ */
export function openingV(o: Pick<GeomOpening, "kind" | "sill" | "head">): {
  sill: number;
  head: number;
} {
  const v = OPENING_V[o.kind];
  return { sill: o.sill ?? v.sill, head: o.head ?? v.head };
}

/** กรอบบ้าน = ขอบเขตของห้องที่อยู่ในกรอบ (ไม่นับระเบียง เว้นแต่สั่ง includeOutdoor) */
export function houseBounds(rooms: readonly GeomRoom[], includeOutdoor = false): Bounds {
  const inner = includeOutdoor ? [...rooms] : rooms.filter((r) => !r.outdoor);
  const source = inner.length > 0 ? inner : rooms;
  const first = source[0];
  if (!first) throw new Error("houseBounds: ไม่มีห้องให้คำนวณ");
  return source.reduce<Bounds>(
    (b, r) => ({
      x0: Math.min(b.x0, r.x0),
      z0: Math.min(b.z0, r.z0),
      x1: Math.max(b.x1, r.x1),
      z1: Math.max(b.z1, r.z1),
    }),
    { x0: first.x0, z0: first.z0, x1: first.x1, z1: first.z1 },
  );
}

export const boundsArea = (b: Bounds): number =>
  Math.round((b.x1 - b.x0) * (b.z1 - b.z0) * 100) / 100;

type Edge = { at: number; from: number; to: number; room: string; side: -1 | 1 };

function edgesOf(rooms: readonly GeomRoom[], axis: Axis): Map<number, Edge[]> {
  const byLine = new Map<number, Edge[]>();
  const push = (at: number, e: Edge) => {
    const key = mm(at);
    const list = byLine.get(key);
    if (list) list.push(e);
    else byLine.set(key, [e]);
  };

  for (const r of rooms) {
    if (axis === "z") {
      // ผนังตั้ง: เส้น x คงที่ ห้องกินระยะ z0..z1
      push(r.x0, { at: mm(r.x0), from: mm(r.z0), to: mm(r.z1), room: r.id, side: 1 });
      push(r.x1, { at: mm(r.x1), from: mm(r.z0), to: mm(r.z1), room: r.id, side: -1 });
    } else {
      // ผนังนอน: เส้น z คงที่ ห้องกินระยะ x0..x1
      push(r.z0, { at: mm(r.z0), from: mm(r.x0), to: mm(r.x1), room: r.id, side: 1 });
      push(r.z1, { at: mm(r.z1), from: mm(r.x0), to: mm(r.x1), room: r.id, side: -1 });
    }
  }
  return byLine;
}

/**
 * ผนังทั้งหมดของบ้าน พร้อมช่องเปิดที่อยู่บนผนังนั้น
 * แบ่งเส้นผนังเป็นช่วงย่อยตามจุดตัดของห้องทุกใบ แล้วรวมช่วงติดกันที่มีห้องสองข้างเหมือนกัน
 */
export function walls(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[] = [],
): WallSegment[] {
  const out: WallSegment[] = [];

  for (const axis of ["z", "x"] as const) {
    for (const [at, edges] of edgesOf(rooms, axis)) {
      const cuts = [...new Set(edges.flatMap((e) => [e.from, e.to]))].sort((a, b) => a - b);

      type Span = { from: number; to: number; minus: string | null; plus: string | null };
      const spans: Span[] = [];

      for (let i = 0; i < cuts.length - 1; i++) {
        const from = cuts[i];
        const to = cuts[i + 1];
        if (from === undefined || to === undefined || to <= from) continue;
        const covering = edges.filter((e) => e.from <= from && e.to >= to);
        const plus = covering.find((e) => e.side === 1)?.room ?? null;
        const minus = covering.find((e) => e.side === -1)?.room ?? null;
        if (plus === null && minus === null) continue;

        const last = spans[spans.length - 1];
        if (last && last.to === from && last.minus === minus && last.plus === plus) last.to = to;
        else spans.push({ from, to, minus, plus });
      }

      for (const s of spans) {
        const both = s.minus !== null && s.plus !== null;
        out.push({
          id: `${axis}@${at}:${s.from}-${s.to}`,
          axis,
          at,
          from: s.from,
          to: s.to,
          kind: both ? "interior" : "exterior",
          roomMinus: s.minus,
          roomPlus: s.plus,
          openings: openings.filter(
            (o) =>
              o.wallAxis === axis && mm(o.at) === at && mm(o.from) >= s.from && mm(o.to) <= s.to,
          ),
        });
      }
    }
  }

  return out;
}

/** 1 ตารางวา = 4 ตารางเมตร */
export const SQM_PER_SQW = 4;

export type GeomPlot = {
  id: string;
  number: string;
  landSqw: number;
  px: number;
  py: number;
};

/** กรอบแปลงบนผังโครงการ — กว้างมาจาก landSqw หารด้วยความลึกมาตรฐาน ไม่เก็บค่าซ้ำใน data */
export function plotRect(plot: GeomPlot, plotDepthM: number) {
  const width = mm((plot.landSqw * SQM_PER_SQW) / plotDepthM);
  return {
    width,
    depth: plotDepthM,
    x0: mm(plot.px - width / 2),
    y0: mm(plot.py - plotDepthM / 2),
    x1: mm(plot.px + width / 2),
    y1: mm(plot.py + plotDepthM / 2),
  };
}

export type GeomFurniture = {
  id: string;
  roomId: string;
  x: number;
  z: number;
  w: number;
  d: number;
};

export type Box2 = { x0: number; z0: number; x1: number; z1: number };

/** กล่องวางของในพิกัดบ้าน */
export const furnitureBox = (f: GeomFurniture): Box2 => ({
  x0: mm(f.x - f.w / 2),
  z0: mm(f.z - f.d / 2),
  x1: mm(f.x + f.w / 2),
  z1: mm(f.z + f.d / 2),
});

export const boxesOverlap = (a: Box2, b: Box2): boolean =>
  a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;

/**
 * พื้นที่ว่างที่ต้องกันไว้หน้าช่องเปิด มองจากในห้องที่ระบุ
 * คืน null ถ้าช่องเปิดนั้นไม่ได้อยู่บนผนังของห้องนี้
 */
export function clearanceBox(
  room: GeomRoom,
  opening: GeomOpening,
  depth: number = DOOR_CLEARANCE_M,
): Box2 | null {
  if (opening.wallAxis === "z") {
    const onMinus = mm(opening.at) === mm(room.x0);
    const onPlus = mm(opening.at) === mm(room.x1);
    if (!onMinus && !onPlus) return null;
    return {
      x0: onMinus ? room.x0 : room.x1 - depth,
      x1: onMinus ? room.x0 + depth : room.x1,
      z0: Math.max(room.z0, opening.from),
      z1: Math.min(room.z1, opening.to),
    };
  }
  const onMinus = mm(opening.at) === mm(room.z0);
  const onPlus = mm(opening.at) === mm(room.z1);
  if (!onMinus && !onPlus) return null;
  return {
    z0: onMinus ? room.z0 : room.z1 - depth,
    z1: onMinus ? room.z0 + depth : room.z1,
    x0: Math.max(room.x0, opening.from),
    x1: Math.min(room.x1, opening.to),
  };
}

/** ช่วงผนังทึบของ segment หนึ่ง = ช่วงเต็มลบด้วยช่องเปิดทุกช่อง */
export function solidRuns(seg: WallSegment): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  let cursor = seg.from;
  for (const o of [...seg.openings].sort((a, b) => a.from - b.from)) {
    if (o.from > cursor) runs.push({ from: cursor, to: o.from });
    cursor = Math.max(cursor, o.to);
  }
  if (cursor < seg.to) runs.push({ from: cursor, to: seg.to });
  return runs;
}

/** จุดกึ่งกลางของช่องเปิดในพิกัดบ้าน */
export function openingCenter(o: GeomOpening): { x: number; z: number } {
  const mid = (o.from + o.to) / 2;
  return o.wallAxis === "x" ? { x: mid, z: o.at } : { x: o.at, z: mid };
}

/** ห้องที่ติดกันผ่านช่องเปิดชนิดเดินผ่านได้ (door/entry) — ใช้ตรวจการเดินถึงและทำ walkthrough */
export function doorGraph(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[],
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>(rooms.map((r) => [r.id, new Set<string>()]));
  for (const seg of walls(rooms, openings)) {
    const { roomMinus, roomPlus } = seg;
    if (roomMinus === null || roomPlus === null) continue;
    if (!seg.openings.some((o) => o.kind !== "window")) continue;
    graph.get(roomMinus)?.add(roomPlus);
    graph.get(roomPlus)?.add(roomMinus);
  }
  return graph;
}

/* ── ตำแหน่งและทิศของแปลงบนผังโครงการ ─────────────────────────────────────────
   ผังโครงการกับฉากหมู่บ้าน 3D ใช้แกนชุดเดียวกัน: x ของผัง = x ของฉาก, y ของผัง = z ของฉาก
   ตั้งเหนือขึ้นบนจอตามธรรมเนียมผังทั่วไป: −y ของผัง (ขึ้นจอ) = ทิศเหนือ → SITE_NORTH_DEG = 180
   ฉากหมู่บ้านส่งค่าเดียวกันเข้า IsoCanvas (northDeg) แดดจึงมาจากทิศเดียวกับที่ผัง 2D บอก
   ค่าทิศของทั้งโครงการอยู่ที่ค่าคงที่ตัวเดียวนี้ — ผังรังวัดจริงมาเมื่อไรแก้ที่นี่ที่เดียว */

/** ทิศเหนือของผังโครงการ องศาตามเข็มนาฬิกา (ความหมายเดียวกับ northDeg ของแบบบ้าน) */
export const SITE_NORTH_DEG = 180;

/** มุมทิศ 0-359 (0 = เหนือ, 90 = ตะวันออก) ของเวกเตอร์ (dx, dy) บนผังโครงการ */
export function planBearing(dx: number, dy: number, northDeg: number = SITE_NORTH_DEG): number {
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI - northDeg;
  return Math.round(((deg % 360) + 360) % 360) % 360;
}

export type SitePlanGeom = {
  widthM: number;
  plotDepthM: number;
  roadY0: number;
  roadY1: number;
  amenities: readonly {
    id: string;
    name: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }[];
};

export type PlotSiting = {
  /** หน้ากว้างของแปลง (ด้านที่ติดถนน) และความลึก — เมตร */
  frontageM: number;
  depthM: number;
  /** เวกเตอร์หน่วยบนผังที่ชี้จากแปลงออกไปหาถนน — null = แปลงไม่ได้ติดถนน */
  front: { dx: number; dy: number } | null;
  /** ทิศของด้านที่ติดถนน 0-359 */
  frontBearing: number | null;
  /** ระยะตามแนวถนนจากทางเข้าโครงการ (ขอบผังฝั่ง x = 0) ถึงกึ่งกลางหน้าแปลง */
  fromEntryM: number;
  /** ส่วนกลางที่ใกล้ที่สุด วัดขอบถึงขอบเป็นเส้นตรง */
  nearestAmenity: { id: string; name: string; gapM: number } | null;
  /** ไม่มีแปลงอื่นติดกันทางด้านนั้น (ห่างเกิน 0.5 ม.) */
  openSide: { west: boolean; east: boolean };
};

const rectGap = (
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
) => {
  const dx = Math.max(b.x0 - a.x1, a.x0 - b.x1, 0);
  const dy = Math.max(b.y0 - a.y1, a.y0 - b.y1, 0);
  return Math.hypot(dx, dy);
};

/**
 * ข้อเท็จจริงเชิงตำแหน่งของแปลงหนึ่งแปลง — คำนวณจาก plotRect() กับผังโครงการเท่านั้น
 * ไม่มีค่าใดเก็บซ้ำใน data: แก้ px/py/landSqw แล้วทิศ ระยะ และหน้ากว้างเปลี่ยนตามเอง
 */
export function plotSiting(
  plot: GeomPlot,
  all: readonly GeomPlot[],
  plan: SitePlanGeom,
): PlotSiting {
  const r = plotRect(plot, plan.plotDepthM);
  const eps = 0.01;
  const front =
    r.y1 <= plan.roadY0 + eps
      ? { dx: 0, dy: 1 }
      : r.y0 >= plan.roadY1 - eps
        ? { dx: 0, dy: -1 }
        : null;

  const rects = all.filter((p) => p.id !== plot.id).map((p) => plotRect(p, plan.plotDepthM));
  const sameRow = rects.filter((o) => o.y0 < r.y1 && r.y0 < o.y1);
  const touches = (gap: (o: (typeof rects)[number]) => number) =>
    sameRow.some((o) => gap(o) >= -eps && gap(o) <= 0.5);

  const nearest = plan.amenities
    .map((a) => ({ id: a.id, name: a.name, gapM: mm(rectGap(r, a)) }))
    .sort((a, b) => a.gapM - b.gapM)[0];

  return {
    frontageM: r.width,
    depthM: r.depth,
    front,
    frontBearing: front ? planBearing(front.dx, front.dy) : null,
    fromEntryM: mm(plot.px),
    nearestAmenity: nearest ?? null,
    openSide: {
      west: !touches((o) => r.x0 - o.x1),
      east: !touches((o) => o.x0 - r.x1),
    },
  };
}
