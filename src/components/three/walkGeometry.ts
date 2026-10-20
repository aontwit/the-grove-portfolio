import {
  WALL_M,
  houseBounds,
  openingCenter,
  solidRuns,
  walls,
  type GeomOpening,
  type GeomRoom,
  type WallSegment,
} from "../../geometry/index.ts";

/* ข้อมูลที่โหมดเดินดูต้องใช้ — ได้มาจาก walls() ชุดเดียวกับแปลน 2D และ diorama
   ไม่มีการสร้างผนังชุดใหม่ที่ไหนเลย */

export type WallRect = { x0: number; z0: number; x1: number; z1: number };

const half = WALL_M / 2;

/** segment ที่ต้องวาดเป็นผนังจริง (มีห้องในกรอบอย่างน้อยหนึ่งข้าง) */
export function houseWallSegments(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[],
): WallSegment[] {
  const outdoorIds = new Set(rooms.filter((r) => r.outdoor).map((r) => r.id));
  const isIndoor = (id: string | null) => id !== null && !outdoorIds.has(id);
  return walls(rooms, openings).filter((s) => isIndoor(s.roomMinus) || isIndoor(s.roomPlus));
}

/**
 * กล่องชนของผนัง — ตัดเฉพาะช่องที่เดินผ่านได้จริง (ประตูและทางเข้า)
 * หน้าต่างมีขอบล่างสูง 0.9 ม. จึงยังเป็นผนังสำหรับคนเดิน
 */
export function wallColliders(segments: readonly WallSegment[]): WallRect[] {
  const out: WallRect[] = [];
  for (const seg of segments) {
    const walkable = { ...seg, openings: seg.openings.filter((o) => o.kind !== "window") };
    for (const run of solidRuns(walkable)) {
      out.push(
        seg.axis === "z"
          ? { x0: seg.at - half, x1: seg.at + half, z0: run.from, z1: run.to }
          : { x0: run.from, x1: run.to, z0: seg.at - half, z1: seg.at + half },
      );
    }
  }
  return out;
}

export type Stand = { x: number; z: number; yaw: number };

/** กล่องสิ่งกีดขวางบนพื้น (เฟอร์นิเจอร์) — จุดยืนต้องไม่อยู่ในกล่องเหล่านี้ */
export type Obstacle = { x0: number; z0: number; x1: number; z1: number };

/** ห่างจากเฟอร์นิเจอร์อย่างน้อยเท่านี้ ไม่งั้นภาพแรกคือขอบเตียงเต็มจอ */
const CLEAR = 0.45;
const free = (x: number, z: number, obstacles: readonly Obstacle[]) =>
  !obstacles.some(
    (o) => x > o.x0 - CLEAR && x < o.x1 + CLEAR && z > o.z0 - CLEAR && z < o.z1 + CLEAR,
  );

/** yaw ของกล้อง (วัดจากแกน -z ตามแบบของ three) ที่มองไปตามทิศ (dx, dz) */
const yawOf = (dx: number, dz: number) => Math.atan2(-dx, -dz);

const inside = (r: GeomRoom, x: number, z: number) =>
  x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** ห้องที่จุด (x, z) อยู่ — ห้องในบ้านก่อนระเบียง เพราะขอบที่ชนกันนับได้ทั้งสองห้อง */
export function roomAt(rooms: readonly GeomRoom[], x: number, z: number): GeomRoom | null {
  return (
    rooms.find((r) => !r.outdoor && inside(r, x, z)) ??
    rooms.find((r) => r.outdoor && inside(r, x, z)) ??
    null
  );
}

/** ช่องเปิดที่เดินผ่านได้บนขอบห้อง พร้อมทิศที่ชี้เข้าห้อง */
function doorsOf(room: GeomRoom, openings: readonly GeomOpening[]) {
  const out: { o: GeomOpening; inward: { x: number; z: number } }[] = [];
  for (const o of openings) {
    if (o.kind === "window") continue;
    const c = openingCenter(o);
    if (o.wallAxis === "x" && c.x > room.x0 && c.x < room.x1) {
      if (Math.abs(o.at - room.z0) < 1e-6) out.push({ o, inward: { x: 0, z: 1 } });
      else if (Math.abs(o.at - room.z1) < 1e-6) out.push({ o, inward: { x: 0, z: -1 } });
    } else if (o.wallAxis === "z" && c.z > room.z0 && c.z < room.z1) {
      if (Math.abs(o.at - room.x0) < 1e-6) out.push({ o, inward: { x: 1, z: 0 } });
      else if (Math.abs(o.at - room.x1) < 1e-6) out.push({ o, inward: { x: -1, z: 0 } });
    }
  }
  return out;
}

/**
 * มุมมองแบบช่างภาพสถาปัตย์: ยืนในห้องถัดจากประตู แล้วหันเฉียง (perspective สองจุด ห้องดูกว้างกว่ามองตรงเข้าผนัง)
 * ถ้ามีหน้าต่างของห้องนี้อยู่ไม่เกิน 80° จากทิศตรง — หันให้หน้าต่างไปอยู่ริมกรอบภาพ (ห่างแกนกลาง 28°)
 * แสงจะเข้าทางข้างภาพและพาดผ่านพื้น · ไม่มีหน้าต่างให้ใช้ = เบี่ยงครึ่งทางเข้าหามุมไกลของห้อง
 */
function aimInto(
  room: GeomRoom,
  x: number,
  z: number,
  inward: { x: number; z: number },
  openings: readonly GeomOpening[],
): number {
  const ang = (dx: number, dz: number) => Math.atan2(dz, dx);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const toYaw = (a: number) => yawOf(Math.cos(a), Math.sin(a));
  const straight = ang(inward.x, inward.z);
  const deg = Math.PI / 180;

  const windows = openings
    .filter((o) => o.kind === "window")
    .map((o) => openingCenter(o))
    .filter(
      (w) =>
        w.x >= room.x0 - 1e-6 &&
        w.x <= room.x1 + 1e-6 &&
        w.z >= room.z0 - 1e-6 &&
        w.z <= room.z1 + 1e-6,
    )
    .map((w) => wrap(ang(w.x - x, w.z - z) - straight))
    .filter((d) => Math.abs(d) < 80 * deg)
    .sort((p, q) => Math.abs(p) - Math.abs(q));
  const win = windows[0];
  if (win !== undefined) {
    const off = Math.abs(win) > 28 * deg ? win - Math.sign(win) * 28 * deg : 0;
    return toYaw(straight + off);
  }

  const farX = inward.x > 0 ? room.x1 : inward.x < 0 ? room.x0 : null;
  const farZ = inward.z > 0 ? room.z1 : inward.z < 0 ? room.z0 : null;
  const corners =
    farZ !== null
      ? [
          { cx: room.x0, cz: farZ },
          { cx: room.x1, cz: farZ },
        ]
      : [
          { cx: farX ?? room.x0, cz: room.z0 },
          { cx: farX ?? room.x0, cz: room.z1 },
        ];
  const far = corners.reduce((p, q) =>
    Math.hypot(q.cx - x, q.cz - z) > Math.hypot(p.cx - x, p.cz - z) ? q : p,
  );
  return toYaw(straight + wrap(ang(far.cx - x, far.cz - z) - straight) * 0.5);
}

/** จุดยืนเริ่มต้น: ในบ้านถัดจากทางเข้า หันเฉียงเข้าห้องแรก */
export function entryStand(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[],
  obstacles: readonly Obstacle[] = [],
  stepIn = 0.9,
): Stand {
  const entry = openings.find((o) => o.kind === "entry");
  const bounds = houseBounds(rooms);
  if (!entry) {
    /* ชั้นบนไม่มีทางเข้าบ้าน — เริ่มที่ห้องบันได ถ้าไม่มีก็กลางบ้าน */
    const stair = rooms.find((r) => r.stair);
    if (stair) return roomStand(stair, openings, obstacles);
    return { x: (bounds.x0 + bounds.x1) / 2, z: (bounds.z0 + bounds.z1) / 2, yaw: 0 };
  }
  const c = openingCenter(entry);
  const inward =
    entry.wallAxis === "x"
      ? { x: 0, z: c.z < (bounds.z0 + bounds.z1) / 2 ? 1 : -1 }
      : { x: c.x < (bounds.x0 + bounds.x1) / 2 ? 1 : -1, z: 0 };
  const step =
    [stepIn, stepIn * 0.66, stepIn * 0.33].find((k) =>
      free(c.x + inward.x * k, c.z + inward.z * k, obstacles),
    ) ?? stepIn;
  const x = c.x + inward.x * step;
  const z = c.z + inward.z * step;
  const room = roomAt(rooms, x, z);
  return { x, z, yaw: room ? aimInto(room, x, z, inward, openings) : yawOf(inward.x, inward.z) };
}

/**
 * จุดยืนเมื่อเลือกห้องจากรายการห้อง: ก้าวเข้าประตูของห้องนั้น 0.8 ม. แล้วหันเฉียงเข้าห้อง
 * ห้องที่มีหลายประตูเลือกบานที่มองเข้าไปได้ลึกที่สุด · ไม่มีประตูเลย = ยืนกลางห้อง
 */
export function roomStand(
  room: GeomRoom,
  openings: readonly GeomOpening[],
  obstacles: readonly Obstacle[] = [],
): Stand {
  const doors = doorsOf(room, openings);
  const first = doors[0];
  if (!first) {
    return { x: (room.x0 + room.x1) / 2, z: (room.z0 + room.z1) / 2, yaw: 0 };
  }
  const depth = (d: (typeof doors)[number]) =>
    d.inward.x !== 0 ? room.x1 - room.x0 : room.z1 - room.z0;
  /* ประตูที่มองเข้าไปได้ลึกก่อน · ก้าวเข้าห้อง 0.9 → 0.3 ม. เอาจุดแรกที่ไม่ชิดเฟอร์นิเจอร์
     ไม่มีจุดไหนว่างเลย = ยืนชิดวงกบ (0.3 ม.) ซึ่งยังเห็นทั้งห้อง */
  const ranked = [...doors].sort((a, b) => depth(b) - depth(a));
  const steps = [0.9, 0.6, 0.3];
  let pick: { d: (typeof doors)[number]; step: number } | null = null;
  for (const d of ranked) {
    const c = openingCenter(d.o);
    const s = steps.find(
      (k) => k < depth(d) / 2 && free(c.x + d.inward.x * k, c.z + d.inward.z * k, obstacles),
    );
    if (s !== undefined) {
      pick = { d, step: s };
      break;
    }
  }
  const chosen = pick ?? { d: ranked[0] ?? first, step: 0.3 };
  const c = openingCenter(chosen.d.o);
  const x = c.x + chosen.d.inward.x * chosen.step;
  const z = c.z + chosen.d.inward.z * chosen.step;
  return { x, z, yaw: aimInto(room, x, z, chosen.d.inward, openings) };
}
