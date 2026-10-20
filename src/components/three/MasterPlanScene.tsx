"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Camera,
  type Group,
  type InstancedMesh,
  type Object3D,
} from "three";
import { plotRect, type GeomOpening, type GeomRoom } from "@/geometry";
import {
  EDGE,
  PLINTH_H,
  SITE_WALL_H,
  SITE_WALL_T,
  VILLAGE_LIP as LIP,
  hash01,
  houseSiting,
  mirrorHouse,
  partyLine,
  twinPairs,
  typicalPlot,
  type SiteLayout,
} from "@/geometry/exterior";
import type { HouseType, Plot, PlotStatus, SitePlan } from "@/lib/schemas";
import { useGrove } from "@/lib/store";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useTokenColor } from "@/lib/useTokenColor";
import { useDict } from "@/i18n/client";
import { STATUSES, STATUS_CHIP } from "@/lib/status";
import { PLOT_LAWN, ROUGH } from "./materials";
import { GroundShadow, useLowPower } from "./look";
import { useOutdoorKit } from "./surfaces";
import {
  Builder,
  applyPoint,
  buildRoof,
  buildShell,
  buildSite,
  plotMatrix,
  type Parts,
} from "./house/build";
import { InstancedParts, PartsMeshes, useParts } from "./house/Parts";
import { Vegetation, type ShrubSpot, type TreeSpot } from "./house/Vegetation";

/* หมู่บ้าน Isometric — ตำแหน่งและขนาดแปลงมาจาก plots.json เหมือนผัง 2D ทุกตัวเลข
   บ้านทุกหลังคือบ้าน The Grove เต็มรูปจากห้องจริงของแบบนั้น (house/build.ts: ผนัง หน้าต่าง จั่ว หลังคา)
   แต่ละแปลงมีสวนของตัวเอง: ทางรถ โรงจอด ทางเดินหิน ไม้พุ่ม ต้นไม้ค้ำ (geometry/exterior.ts houseSiting)
   ถนนมีคันหิน ทางเท้า แนวปลูกต้นไม้ เสาไฟ · ซุ้มทางเข้า และส่วนกลางเท่าที่ผังของโครงการมี (คลับเฮาส์ สวนกลาง)
   ขอบเขตโครงการ = กรอบผังพอดี: กำแพงโครงการตั้งชิดหลังแปลงทั้งสองแถว (ด้านนอกเส้นเขต) ไม่มีแนวต้นไม้หรือทางวิ่งนอกแถว
   (ตัดสิน 2026-10-02 เจ้าของโครงการให้ตัดแถบนอกแนวหลังแปลงทิ้ง — ผัง 2D ใช้ขอบเขตเดียวกัน)

   หน้าบ้านทุกหลังหันหาถนน: แถวเหนือถนน (แถว A) หมุน 180° · แถวใต้ถนน (แถว B) ไม่หมุน
   บ้านแฝด (ลมเย็น): แปลงแฝดสองแปลงที่ขอบชนกัน = อาคารเดียวสะท้อนกัน ผนังร่วมที่เส้นแปลง (exterior.ts twinPairs)
   หลังหนึ่งตามทิศใน data อีกหลังสะท้อน — วาดเป็น geometry "คู่" ก้อนเดียววางที่แปลงตามทิศ data
   สถานะแปลง = แถบสีรอบขอบแปลง (แถบ EDGE ที่ siting เว้นไว้) + legend คำกำกับนอก canvas

   ประสิทธิภาพ: บ้านเป็น InstancedMesh ต่อ (แบบ × วัสดุ) · ต้นไม้ทั้งโครงการ 3 InstancedMesh
   พื้น ถนน สวน และส่วนกลางทั้งหมดรวมเป็น geometry ก้อนเดียวต่อวัสดุ — ทั้งฉากราว 40 draw call */

const BOARD_H = 1.1;
/* เงาสัมผัสใต้ฐาน (§5): อบเฉพาะชั้นบางๆ ใต้ฐานไม้ (SHADOW_FAR) — ของอื่นในฉาก (บ้านพระเอกหน้าแรก) ไม่ถูกอบติดมา
   ระนาบเงา = ฐาน + ระยะที่ blur กระจายไปถึงเท่านั้น (blur ของ drei คิดเป็นสัดส่วนของด้านระนาบ ~5.6 เท่าของ blur/256)
   เงาจึงเป็นขอบนุ่มบางๆ รอบฐานตรงกลาง ไม่ใช่แถบดำยาวนอกกำแพง */
const SHADOW_FAR = 0.3;
const SHADOW_BLUR = 0.8;
const shadowSpread = (len: number) => (5.6 * SHADOW_BLUR * len) / 256 + 0.3;
/** ป้ายแปลงลอยเหนือยอดบ้านจริง (กล่อง geometry ที่วาด) เท่านี้ — ไม่มีวันจมในหลังคา */
const LABEL_LIFT = 1.4;
const CARRIAGEWAY = 7;
const KERB = 0.15;
const SIDEWALK = 1.3;

type Sited = {
  plot: Plot;
  house: HouseType;
  layout: SiteLayout;
  matrix: Matrix4;
  rect: ReturnType<typeof plotRect>;
  rot: number;
  /** บ้านแฝดหลังที่สะท้อนจากทิศใน data */
  mirrored: boolean;
  /** แปลงคู่แฝดที่ผนังร่วมชนกัน (id) — null = บ้านเดี่ยวหรือแฝดที่ยังไม่มีคู่ */
  partner: string | null;
};

/* ── คลับเฮาส์: บ้าน The Grove ขยายใหญ่ ใช้ builder ตัวเดียวกับบ้าน ── */
const CLUB_ROOMS: GeomRoom[] = [
  { id: "c-lounge", name: "lounge", x0: -6.5, z0: -4, x1: -1.5, z1: 4, outdoor: false },
  { id: "c-hall", name: "hall", x0: -1.5, z0: -4, x1: 1.5, z1: 4, outdoor: false },
  { id: "c-gym", name: "gym", x0: 1.5, z0: -4, x1: 6.5, z1: 4, outdoor: false },
];
const CLUB_OPENINGS: GeomOpening[] = [
  { id: "c-entry", kind: "entry", wallAxis: "x", at: -4, from: -0.55, to: 0.55 },
  { id: "c-w1", kind: "window", wallAxis: "x", at: -4, from: -5.9, to: -3.6 },
  { id: "c-w2", kind: "window", wallAxis: "x", at: -4, from: 3.2, to: 4.4 },
  { id: "c-w3", kind: "window", wallAxis: "z", at: -6.5, from: -2.6, to: -0.2 },
  { id: "c-w4", kind: "window", wallAxis: "z", at: 6.5, from: -2.4, to: -1.2 },
  { id: "c-w5", kind: "window", wallAxis: "z", at: 6.5, from: 0.6, to: 1.8 },
];

/** ซุ้มประตูรูปบ้าน (โลโก้แบรนด์คือกรอบบ้าน) — กรอบเทาหนาคร่อมถนนทางเข้า ในระนาบ x คงที่ */
function portal(b: Builder, x: number, z0: number, z1: number, eave: number, pitchDeg: number) {
  const t = 0.4;
  const tan = Math.tan((pitchDeg * Math.PI) / 180);
  const cos = Math.cos((pitchDeg * Math.PI) / 180);
  const cz = (z0 + z1) / 2;
  const rise = ((z1 - z0) / 2) * tan;
  const off = t / cos;
  b.plate(
    "fascia",
    [
      [x, 0, z0 - t],
      [x, 0, z0],
      [x, eave, z0],
      [x, eave + rise, cz],
      [x, eave, z1],
      [x, 0, z1],
      [x, 0, z1 + t],
      [x, eave - t * tan + off, z1 + t],
      [x, eave + rise + off, cz],
      [x, eave - t * tan + off, z0 - t],
    ],
    0.6,
    [-1, 0, 0],
  );
}

/* ── กำแพงโครงการ ──
   ตั้งนอกเส้นเขตพอดี (ผังคือขอบเขตโครงการ) — แถบขอบแปลงด้านหลังจึงไม่ถูกกำแพงบัง · เว้นช่องทางเข้า
   บ้าน ชายคา และเรือนยอดต้นไม้ถอยจากเส้นนี้ ≥ REAR_CLEAR (geometry:check ข้อ ฐ — ตรวจเส้นเขต ไม่ขึ้นกับความสูง)
   ด้านที่หันเข้ากล้องลดเหลือกำแพงเตี้ย SITE_WALL_LOW_H (cutaway แบบผนังหน้าของ diorama — เจ้าของสั่ง 2026-10-03):
   กำแพงเต็มสูง 1.86 ม. ด้านหน้าบังช่องว่างระหว่างบ้านแถว B กับเขตโครงการ บ้านเลยดูชิดกำแพง
   ด้านไกลยังเต็มสูงเป็นฉากหลัง · ด้านไหนหันเข้ากล้องคิดใน world space ทุกเฟรม (หน้าแรกหมุนทั้งหมู่บ้านและกล้องกวาด 90°) */
const SITE_WALL_LOW_H = 0.6;
/** ฐานกำแพงจมใต้สนามเท่านี้ — กำแพงเตี้ยย่อจากระดับนี้ ตีนกำแพงจึงไม่ลอยพ้นสนาม */
const WALL_FOOT = 0.05;
type WallSide = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  normal: { x: number; z: number };
};

function perimeterWalls(plan: SitePlan): WallSide[] {
  const W = plan.widthM;
  const D = plan.depthM;
  const X = (px: number) => px - W / 2;
  const Z = (py: number) => py - D / 2;
  const WT = SITE_WALL_T;
  const side = (x0: number, y0: number, x1: number, y1: number, nx: number, nz: number) => ({
    x0: X(x0),
    z0: Z(y0),
    x1: X(x1),
    z1: Z(y1),
    normal: { x: nx, z: nz },
  });
  return [
    side(-WT, -WT, W + WT, 0, 0, -1),
    side(-WT, D, W + WT, D + WT, 0, 1),
    side(W, 0, W + WT, D, 1, 0),
    side(-WT, 0, 0, plan.roadY0 - 1.6, -1, 0),
    side(-WT, plan.roadY1 + 1.6, 0, D, -1, 0),
  ];
}

const wallSmooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const towardCam = new Vector3();
const wallNormal = new Vector3();

function PerimeterWall({ side, kit }: { side: WallSide; kit: ReturnType<typeof useOutdoorKit> }) {
  const reduced = usePrefersReducedMotion();
  const body = useParts(() => {
    const b = new Builder();
    b.box("render", side.x0, -WALL_FOOT, side.z0, side.x1, SITE_WALL_H, side.z1);
    return b.build();
  }, [side]);
  const cap = useParts(() => {
    const b = new Builder();
    b.box(
      "concrete",
      side.x0 - 0.03,
      SITE_WALL_H,
      side.z0 - 0.03,
      side.x1 + 0.03,
      SITE_WALL_H + 0.06,
      side.z1 + 0.03,
    );
    return b.build();
  }, [side]);
  const scaled = useRef<Group>(null);
  const top = useRef<Group>(null);
  /** สัดส่วนความสูงตัวกำแพง (เหนือ WALL_FOOT) · null = ยังไม่วาดเฟรมแรก → วางที่เป้าหมายเลย */
  const k = useRef<number | null>(null);
  const lowK = (SITE_WALL_LOW_H + WALL_FOOT) / (SITE_WALL_H + WALL_FOOT);

  useFrame(({ camera, invalidate }) => {
    const g = scaled.current;
    const c = top.current;
    if (!g || !c) return;
    /* ทิศที่กำแพงหันออก (world) เทียบทิศจากฉากไปหากล้อง — คิดเฉพาะแนวราบ */
    wallNormal.set(side.normal.x, 0, side.normal.z).transformDirection(g.matrixWorld);
    camera.getWorldDirection(towardCam).negate();
    towardCam.y = 0;
    wallNormal.y = 0;
    const len = towardCam.length() * wallNormal.length() || 1;
    const dot = towardCam.dot(wallNormal) / len;
    const target = lowK + (1 - lowK) * (1 - wallSmooth(-0.2, 0.2, dot));
    const prev = k.current ?? target;
    const next = reduced ? target : prev + (target - prev) * 0.15;
    const moving = Math.abs(target - next) > 0.002;
    k.current = moving ? next : target;
    g.scale.y = k.current;
    c.position.y = (SITE_WALL_H + WALL_FOOT) * (k.current - 1);
    if (moving) invalidate();
  });

  return (
    <>
      <group ref={scaled} position={[0, -WALL_FOOT, 0]}>
        <group position={[0, WALL_FOOT, 0]}>
          <PartsMeshes parts={body} kit={kit} />
        </group>
      </group>
      <group ref={top}>
        <PartsMeshes parts={cap} kit={kit} />
      </group>
    </>
  );
}

/** ทุกอย่างที่ไม่ขยับ: ฐาน สนาม ถนน ทางเท้า สวนของแต่ละแปลง ส่วนกลาง ซุ้มทางเข้า */
function buildVillage(
  b: Builder,
  plan: SitePlan,
  sited: readonly Sited[],
  skipPlotId: string | undefined,
  trees: TreeSpot[],
  shrubs: ShrubSpot[],
) {
  const W = plan.widthM;
  const D = plan.depthM;
  const ox = W / 2;
  const oz = D / 2;
  const X = (px: number) => px - ox;
  const Z = (py: number) => py - oz;

  /* ฐานไม้หนาเห็นขอบ + สนามหญ้าทั้งผืน */
  b.box("board", X(-LIP), -BOARD_H, Z(-LIP), X(W + LIP), -0.07, Z(D + LIP));
  b.box("lawn", X(-LIP), -0.07, Z(-LIP), X(W + LIP), -0.03, Z(D + LIP));

  /* ถนน: ผิวแอสฟัลต์ 7 ม. กลางเขตทาง · คันหินสองข้าง · แนวปลูกต้นไม้ · ทางเท้า */
  const rc = (plan.roadY0 + plan.roadY1) / 2;
  const cw = Math.min(CARRIAGEWAY, plan.roadY1 - plan.roadY0 - 2 * (SIDEWALK + KERB + 0.6));
  const roadEnd = W - 2.5;
  const r0 = rc - cw / 2;
  const r1 = rc + cw / 2;
  b.box("asphalt", X(-LIP), -0.06, Z(r0), X(roadEnd), 0.0, Z(r1));
  b.box("concrete", X(-LIP), -0.06, Z(r0 - KERB), X(roadEnd), 0.13, Z(r0));
  b.box("concrete", X(-LIP), -0.06, Z(r1), X(roadEnd), 0.13, Z(r1 + KERB));
  b.box("concrete", X(roadEnd), -0.06, Z(r0 - KERB), X(roadEnd + KERB), 0.13, Z(r1 + KERB));
  for (let x = 3; x < roadEnd - 2; x += 6)
    b.box("white", X(x), 0, Z(rc - 0.06), X(x + 2.6), 0.008, Z(rc + 0.06));
  b.box("paving", X(0), -0.06, Z(plan.roadY0), X(roadEnd + KERB), 0.05, Z(plan.roadY0 + SIDEWALK));
  b.box("paving", X(0), -0.06, Z(plan.roadY1 - SIDEWALK), X(roadEnd + KERB), 0.05, Z(plan.roadY1));
  const strips = [
    { a: plan.roadY0 + SIDEWALK, b: r0 - KERB },
    { a: r1 + KERB, b: plan.roadY1 - SIDEWALK },
  ];

  /* แปลง: สวน ทางรถ โรงจอด ต้นไม้ — วางด้วยเมทริกซ์ของแปลงเอง (หมุนหน้าเข้าหาถนน) */
  const crossings: { x0: number; x1: number }[] = [];
  for (const s of sited) {
    /* แปลงที่ diorama หน้าแรกยืนแทน: ไม่วาดสวนและต้นไม้ในแปลง แต่ทางรถข้ามทางเท้ายังเป็นของแปลงนี้
       (ไม่งั้นต้นไม้ริมถนนถูกปลูกขวางหน้าโรงจอดของบ้านพระเอก) */
    if (s.plot.id !== skipPlotId) {
      b.at(s.matrix);
      buildSite(b, s.layout, { lawn: true, deck: true });
      b.at(null);
      for (const t of s.layout.trees) {
        const [x, y, z] = applyPoint(s.matrix, t.x, -PLINTH_H, t.z);
        trees.push({ ...t, x, y, z });
      }
      for (const sh of s.layout.shrubs) {
        const [x, y, z] = applyPoint(s.matrix, sh.x, -PLINTH_H, sh.z);
        shrubs.push({ ...sh, x, y, z });
      }
    }
    const d = s.layout.driveway;
    if (d) {
      const [ax, , az] = applyPoint(s.matrix, d.x0, 0, d.z0);
      const [bx] = applyPoint(s.matrix, d.x1, 0, d.z0);
      const xa = Math.min(ax, bx);
      const xb = Math.max(ax, bx);
      crossings.push({ x0: xa + ox, x1: xb + ox });
      /* ทางรถข้ามทางเท้าและแนวปลูกถึงคันหิน */
      const towardRoad = az + oz < rc;
      const za = towardRoad ? plan.roadY0 : r1 + KERB;
      const zb = towardRoad ? r0 - KERB : plan.roadY1;
      b.box("paving", xa, -0.06, Z(za), xb, 0.055, Z(zb));
    }
  }

  /* เสาไฟเทาทุก 24 ม. สลับฝั่ง · ต้นไม้ริมถนนในแนวปลูกทุก 12 ม. เลี่ยงทางรถ */
  const clear = (x: number, pad: number) =>
    crossings.every((c) => x < c.x0 - pad || x > c.x1 + pad);
  strips.forEach((st, side) => {
    const zc = (st.a + st.b) / 2;
    for (let x = side ? 18 : 6; x < roadEnd - 2; x += 24) {
      if (!clear(x, 0.4)) continue;
      const z = Z(zc);
      const dir = side ? -1 : 1;
      b.box("fascia", X(x) - 0.07, 0, z - 0.07, X(x) + 0.07, 4.6, z + 0.07);
      b.box(
        "fascia",
        X(x) - 0.05,
        4.48,
        Math.min(z, z + dir * 1.3),
        X(x) + 0.05,
        4.58,
        Math.max(z, z + dir * 1.3),
      );
      b.box("white", X(x) - 0.16, 4.38, z + dir * 1.3 - 0.3, X(x) + 0.16, 4.5, z + dir * 1.3 + 0.3);
    }
    for (let x = side ? 12 : 3; x < roadEnd - 3; x += 12) {
      if (!clear(x, 1.6)) continue;
      trees.push({
        x: X(x),
        y: -0.03,
        z: Z(zc),
        h: 6.2 + hash01(x * 7 + side) * 1.2,
        seed: 9000 + x * 3 + side,
        staked: false,
        mature: true,
      });
    }
  });

  /* กำแพงรอบโครงการอยู่ใน PerimeterWalls (ด้านที่หันเข้ากล้องลดเป็นกำแพงเตี้ย) — ไม่รวมในก้อนนี้ */

  /* ซุ้มทางเข้า: เสาปูนบุไม้สองข้าง + กรอบบ้านเทาคร่อมถนน */
  for (const [za, zb] of [
    [plan.roadY0 - 1.6, plan.roadY0 - 0.2],
    [plan.roadY1 + 0.2, plan.roadY1 + 1.6],
  ] as const) {
    b.box("render", X(0), -0.05, Z(za), X(1.2), 2.8, Z(zb));
    b.box("oak", X(-0.04), 0.3, Z(za) + 0.15, X(0), 2.5, Z(zb) - 0.15);
    b.box("fascia", X(-0.1), 2.8, Z(za) - 0.1, X(1.3), 2.98, Z(zb) + 0.1);
  }
  portal(b, X(0.3), Z(plan.roadY0 - 0.2), Z(plan.roadY1 + 0.2), 4.6, 26);

  /* ส่วนกลาง */
  for (const a of plan.amenities) {
    const cx = (a.x0 + a.x1) / 2;
    const cy = (a.y0 + a.y1) / 2;
    const north = cy < plan.roadY0;
    if (a.id === "clubhouse") {
      /* ตัวอาคารชิดด้านหลัง หน้าอาคารหันหาถนน · ลานไม้ + สระว่ายน้ำระหว่างอาคารกับทางเท้า */
      const front = north ? a.y1 : a.y0;
      const dir = north ? -1 : 1;
      const by = front + dir * (SIDEWALK * 0 + 7.2);
      const m = new Matrix4()
        .makeTranslation(X(cx), PLINTH_H, Z(by))
        .multiply(new Matrix4().makeRotationY(north ? Math.PI : 0));
      b.at(m);
      b.box("concrete", -6.6, -PLINTH_H - 0.02, -4.1, 6.6, -0.004, 4.1);
      b.box("concrete", -6.6, -PLINTH_H - 0.02, -6.4, 6.6, -0.05, -4.1);
      b.box("oak", -6.55, -0.05, -6.35, 6.55, 0, -4.1);
      buildShell(b, { rooms: CLUB_ROOMS, openings: CLUB_OPENINGS });
      buildRoof(b, { rooms: CLUB_ROOMS, openings: CLUB_OPENINGS });
      b.at(null);
      const pz = front - dir * 1.4;
      const pz0 = Math.min(pz, pz - dir * 2.6);
      const pz1 = Math.max(pz, pz - dir * 2.6);
      b.box("concrete", X(cx - 5.4), -0.06, Z(pz0 - 0.35), X(cx + 5.4), 0.08, Z(pz1 + 0.35));
      b.box("water", X(cx - 5), -0.06, Z(pz0), X(cx + 5), 0.03, Z(pz1));
      for (const tx of [a.x0 + 1.5, a.x1 - 1.5]) {
        trees.push({
          x: X(tx),
          y: -0.03,
          z: Z(front - dir * 1.2),
          h: 5.5,
          seed: Math.round(tx * 17),
          staked: false,
          mature: true,
        });
      }
    } else {
      /* สวนกลาง: ทางเดินวงรี ศาลาไม้ระแนงตรงกลาง ม้านั่ง ต้นไม้ใหญ่รอบวง ทางเชื่อมทางเท้า */
      const rx = (a.x1 - a.x0) / 2 - 2.2;
      const rz = (a.y1 - a.y0) / 2 - 2;
      const seg = 56;
      for (let i = 0; i < seg; i++) {
        const t0 = (i / seg) * Math.PI * 2;
        const t1 = ((i + 1) / seg) * Math.PI * 2;
        const pt = (t: number, k: number): [number, number, number] => [
          X(cx + Math.cos(t) * (rx + k)),
          0.045,
          Z(cy + Math.sin(t) * (rz + k)),
        ];
        b.plate(
          "paving",
          [pt(t0, -0.75), pt(t1, -0.75), pt(t1, 0.75), pt(t0, 0.75)],
          0.1,
          [0, 1, 0],
        );
      }
      const edge = north ? a.y1 : a.y0;
      const ringEdge = north ? cy + rz : cy - rz;
      b.box(
        "paving",
        X(cx - 0.8),
        -0.06,
        Z(Math.min(edge, ringEdge)),
        X(cx + 0.8),
        0.04,
        Z(Math.max(edge, ringEdge)),
      );
      /* ศาลา: เสาขาว คานและระแนงไม้ (ภาษาเดียวกับโรงจอดรถ) */
      const s = 1.7;
      for (const [dx, dz] of [
        [-s, -s],
        [s, -s],
        [-s, s],
        [s, s],
      ] as const) {
        b.box(
          "white",
          X(cx + dx) - 0.1,
          0,
          Z(cy + dz) - 0.1,
          X(cx + dx) + 0.1,
          2.7,
          Z(cy + dz) + 0.1,
        );
      }
      b.box(
        "concrete",
        X(cx - s - 0.4),
        -0.06,
        Z(cy - s - 0.4),
        X(cx + s + 0.4),
        0.12,
        Z(cy + s + 0.4),
      );
      b.box("white", X(cx - s - 0.3), 2.7, Z(cy - s - 0.3), X(cx + s + 0.3), 2.9, Z(cy + s + 0.3));
      for (let k = -s; k <= s + 1e-6; k += 0.3) {
        b.box(
          "oak",
          X(cx + k) - 0.03,
          2.9,
          Z(cy - s - 0.3),
          X(cx + k) + 0.03,
          3.02,
          Z(cy + s + 0.3),
        );
      }
      for (const [dx, dz, along] of [
        [0, -rz + 1.4, true],
        [0, rz - 1.4, true],
        [-rx + 1.4, 0, false],
        [rx - 1.4, 0, false],
      ] as const) {
        const hx = along ? 0.8 : 0.22;
        const hz = along ? 0.22 : 0.8;
        b.box(
          "oak",
          X(cx + dx - hx),
          0.38,
          Z(cy + dz - hz),
          X(cx + dx + hx),
          0.45,
          Z(cy + dz + hz),
        );
        b.box(
          "concrete",
          X(cx + dx - hx + 0.1),
          -0.03,
          Z(cy + dz - hz + 0.05),
          X(cx + dx + hx - 0.1),
          0.38,
          Z(cy + dz + hz - 0.05),
        );
      }
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * Math.PI * 2 + 0.3;
        const k = 2.2 + hash01(i * 3) * 0.6;
        trees.push({
          x: X(cx + Math.cos(t) * (rx + k)),
          y: -0.03,
          z: Z(cy + Math.sin(t) * (rz + k * 0.6)),
          h: 6 + hash01(i) * 2.5,
          seed: 6100 + i,
          staked: false,
          mature: true,
        });
      }
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * Math.PI * 2;
        const r = hash01(i * 17 + 3);
        shrubs.push({
          x: X(cx + Math.cos(t) * (rx - 1.6)),
          y: -0.03,
          z: Z(cy + Math.sin(t) * (rz - 1.6)),
          r: 0.35 + r * 0.2,
          seed: 6500 + i,
        });
      }
    }
  }

  /* ปลายถนนฝั่งตะวันออก: แนวต้นไม้ปิดท้าย */
  const xs = sited.map((s) => s.rect.x1);
  const eastEdge = Math.max(...xs);
  if (W - eastEdge > 3) {
    for (let y = 4; y < D - 3; y += 7) {
      if (y > plan.roadY0 - 1 && y < plan.roadY1 + 1) continue;
      trees.push({
        x: X((eastEdge + W) / 2),
        y: -0.03,
        z: Z(y),
        h: 6 + hash01(y) * 2,
        seed: 6900 + y,
        staked: false,
        mature: true,
      });
    }
  }
}

export function MasterPlanScene({
  plots,
  houseTypes,
  plan,
  skipPlotId,
  labels = false,
  interactive = true,
}: {
  /** false = ฉากโชว์ (หมู่บ้านในฉากเปิดหน้าแรก): ไม่มีกล่องรับคลิกแปลง ไม่แสดงแปลงที่เลือกค้างจากหน้าอื่น
      หน้าผังโครงการยังเลือกแปลงได้ตามเดิม */
  interactive?: boolean;
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  /** ป้ายเลขแปลงสีตามสถานะทุกแปลง (หน้าผังโครงการบนจอกว้าง) — จอแคบป้ายจะทับกันจึงไม่แสดง */
  labels?: boolean;
  /** ไม่ต้องวาดบ้านและสวนบนแปลงนี้ — ใช้ตอนหน้าแรกเอา diorama ของบ้านหลังนั้นมายืนแทนอยู่แล้ว */
  skipPlotId?: string;
}) {
  const t = useDict();
  const storePlot = useGrove((s) => s.selectedPlot);
  const selectedPlot = interactive ? storePlot : null;
  const selectPlot = useGrove((s) => s.selectPlot);
  const statusFilter = useGrove((s) => s.statusFilter);
  const marigold = useTokenColor("--marigold");
  const low = useLowPower();
  const kit = useOutdoorKit(low);

  const ox = plan.widthM / 2;
  const oz = plan.depthM / 2;

  /* ทุกแปลง: ผังที่ตั้งของบ้านบนแปลงจริง (ความกว้างต่างกันตาม landSqw) และเมทริกซ์ที่หมุนหน้าเข้าหาถนน
     บ้านแฝด: จับคู่แปลงติดกันก่อน — หลังที่ผนังร่วมอยู่ฝั่ง x+ ของตัวเองใช้ทิศ data อีกหลังสะท้อน */
  const sited = useMemo<Sited[]>(() => {
    const byId = new Map(houseTypes.map((h) => [h.id, h] as const));
    const rotOf = (p: Plot) => (p.py < plan.roadY0 ? Math.PI : 0);
    const twinRects = plots
      .filter((p) => byId.get(p.houseTypeId)?.facade?.style === "twin")
      .map((p) => ({ ...plotRect(p, plan.plotDepthM), id: p.id, plot: p }));
    const partner = new Map<string, string>();
    const mirrored = new Set<string>();
    for (const [a, b] of twinPairs(twinRects)) {
      if (!b || a.plot.houseTypeId !== b.plot.houseTypeId) continue;
      partner.set(a.id, b.id);
      partner.set(b.id, a.id);
      /* หมุน 0: ซ้ายบนจอ (x น้อย) มีคู่ทาง +x ของตัวเอง = ทิศ data · หมุน 180°: กลับกัน */
      mirrored.add(rotOf(a.plot) === 0 ? b.id : a.id);
    }
    return plots.flatMap((p) => {
      const house = byId.get(p.houseTypeId);
      if (!house) return [];
      const rect = plotRect(p, plan.plotDepthM);
      const m = mirrored.has(p.id);
      const layout = houseSiting(m ? mirrorHouse(house) : house, {
        width: rect.width,
        depth: rect.depth,
      });
      const rot = rotOf(p);
      return [
        {
          plot: p,
          house,
          layout,
          rect,
          rot,
          mirrored: m,
          partner: partner.get(p.id) ?? null,
          matrix: plotMatrix(layout, p.px - ox, p.py - oz, rot),
        },
      ];
    });
  }, [plots, houseTypes, plan.plotDepthM, plan.roadY0, ox, oz]);

  /* พื้นและส่วนกลางทั้งโครงการ + รายชื่อต้นไม้ — สร้างครั้งเดียว */
  const village = useMemo(() => {
    const trees: TreeSpot[] = [];
    const shrubs: ShrubSpot[] = [];
    const b = new Builder();
    buildVillage(b, plan, sited, skipPlotId, trees, shrubs);
    return { parts: b.build(), trees, shrubs };
  }, [plan, sited, skipPlotId]);
  useEffect(() => () => village.parts.forEach((g) => g.dispose()), [village]);
  const walls = useMemo(() => perimeterWalls(plan), [plan]);

  /* บ้านหนึ่งชุด geometry ต่อแบบ แล้ววางเป็น instance ทุกแปลงที่ใช้แบบนั้น
     แบบแฝดมีสามชุด: ทิศ data · สะท้อน (หลังเดี่ยวที่คู่ถูกซ่อน) · คู่ (ทั้งอาคาร วางที่แปลงทิศ data) */
  const houseParts = useMemo(
    () =>
      new Map<string, Parts>(
        houseTypes.flatMap((h) => {
          const one = (shape: HouseType) => {
            const b = new Builder();
            buildShell(b, shape);
            buildRoof(b, shape);
            return b;
          };
          if (h.facade?.style !== "twin") return [[h.id, one(h).build()] as const];
          const P = partyLine(houseSiting(h, typicalPlot(h)));
          const pair = one(h);
          if (P !== null) {
            const nb = mirrorHouse(h, P);
            buildShell(pair, nb);
            buildRoof(pair, nb);
          }
          return [
            [h.id, one(h).build()] as const,
            [`${h.id}:m`, one(mirrorHouse(h)).build()] as const,
            [`${h.id}:pair`, pair.build()] as const,
          ];
        }),
      ),
    [houseTypes],
  );
  useEffect(() => () => houseParts.forEach((p) => p.forEach((g) => g.dispose())), [houseParts]);

  /* ยอดสูงสุดของบ้านแต่ละแบบ (ม. เหนือพื้นในบ้าน) จาก geometry ที่วาดจริง — ป้ายแปลงลอยเหนือค่านี้ */
  const topOf = useMemo(() => {
    const out = new Map<string, number>();
    const box = new Box3();
    for (const [id, parts] of houseParts) {
      const key = id.split(":")[0] ?? id;
      let top = out.get(key) ?? 0;
      for (const g of parts.values()) {
        if (!g.boundingBox) g.computeBoundingBox();
        if (g.boundingBox) top = Math.max(top, box.copy(g.boundingBox).max.y);
      }
      out.set(key, top);
    }
    return out;
  }, [houseParts]);
  /** จุดยึดป้าย: กลางแปลง เหนือยอดบ้านหลังนั้น (แปลงที่ไม่ได้วาดบ้าน = เหนือพื้น) */
  const labelAt = (s: Sited): [number, number, number] => [
    s.plot.px - ox,
    (s.plot.id === skipPlotId ? 0 : PLINTH_H + (topOf.get(s.house.id) ?? 0)) + LABEL_LIFT,
    s.plot.py - oz,
  ];

  const shown = useMemo(
    () => sited.filter((s) => statusFilter === "all" || statusFilter === s.plot.status),
    [sited, statusFilter],
  );
  const matricesByType = useMemo(() => {
    const out = new Map<string, Matrix4[]>();
    const visible = new Set(shown.filter((s) => s.plot.id !== skipPlotId).map((s) => s.plot.id));
    const add = (k: string, m: Matrix4) => {
      const list = out.get(k);
      if (list) list.push(m);
      else out.set(k, [m]);
    };
    for (const s of shown) {
      if (!visible.has(s.plot.id)) continue;
      const both = s.partner !== null && visible.has(s.partner);
      /* คู่แฝดที่เห็นทั้งสองหลัง: วางอาคารคู่ครั้งเดียวที่หลังทิศ data */
      if (both) {
        if (!s.mirrored) add(`${s.house.id}:pair`, s.matrix);
        continue;
      }
      add(s.mirrored ? `${s.house.id}:m` : s.house.id, s.matrix);
    }
    return out;
  }, [shown, skipPlotId]);

  /* แถบสถานะ: builder ละสถานะ — วัสดุสีเรียบตาม PLOT_LAWN (legend ฝั่ง DOM ใช้ค่าเดียวกัน) */
  const rings = useParts(() => {
    const out = new Builder<PlotStatus>();
    for (const s of shown) {
      if (s.plot.id === skipPlotId) continue;
      /* แถบ EDGE ที่ houseSiting เว้นว่างไว้ (ไม่มีพุ่มไม้หรือกำแพงทับ) */
      const w = EDGE - 0.06;
      const x0 = s.rect.x0 - ox;
      const x1 = s.rect.x1 - ox;
      const z0 = s.rect.y0 - oz;
      const z1 = s.rect.y1 - oz;
      const k = s.plot.status;
      /* ด้านผนังร่วมของบ้านแฝดไม่มีแถบ — ตัวบ้านและทางรถต่อกันข้ามเส้นแปลง */
      const partyEast = s.layout.party !== null && (s.layout.party === "x+") === (s.rot === 0);
      const partyWest = s.layout.party !== null && !partyEast;
      out.box(k, x0, -0.03, z0, x1, 0.045, z0 + w);
      out.box(k, x0, -0.03, z1 - w, x1, 0.045, z1);
      if (!partyWest) out.box(k, x0, -0.03, z0 + w, x0 + w, 0.045, z1 - w);
      if (!partyEast) out.box(k, x1 - w, -0.03, z0 + w, x1, 0.045, z1 - w);
    }
    return out.build();
  }, [shown, skipPlotId, ox, oz]);
  const ringMats = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((st) => [
          st,
          new MeshStandardMaterial({ color: PLOT_LAWN[st], roughness: ROUGH.board, metalness: 0 }),
        ]),
      ) as Record<PlotStatus, MeshStandardMaterial>,
    [],
  );
  useEffect(() => () => Object.values(ringMats).forEach((m) => m.dispose()), [ringMats]);

  const pick = (id: string) => selectPlot(id === selectedPlot ? null : id);
  const selected = plots.find((p) => p.id === selectedPlot);
  const selectedVisible =
    selected && (statusFilter === "all" || statusFilter === selected.status) ? selected : null;
  const selRect = selectedVisible ? plotRect(selectedVisible, plan.plotDepthM) : null;
  const selectedSited = selectedVisible
    ? sited.find((s) => s.plot.id === selectedVisible.id)
    : undefined;
  const boardW = plan.widthM + LIP * 2;
  const boardD = plan.depthM + LIP * 2;

  return (
    <group>
      <PartsMeshes parts={village.parts} kit={kit} />
      {walls.map((w, i) => (
        <PerimeterWall key={i} side={w} kit={kit} />
      ))}
      <GroundShadow
        position={[0, -BOARD_H - 0.01, 0]}
        width={boardW + 2 * shadowSpread(boardW)}
        depth={boardD + 2 * shadowSpread(boardD)}
        far={SHADOW_FAR}
        opacity={0.35}
        blur={SHADOW_BLUR}
        low={low}
      />
      {[...houseParts].map(([id, parts]) => (
        <InstancedParts key={id} parts={parts} kit={kit} matrices={matricesByType.get(id) ?? []} />
      ))}
      <PartsMeshes parts={rings} kit={ringMats} shadows={false} />
      <Vegetation trees={village.trees} shrubs={village.shrubs} kit={kit} />
      {interactive && (
        <PickBoxes sited={shown} skipPlotId={skipPlotId} ox={ox} oz={oz} onPick={pick} />
      )}

      {labels &&
        !low &&
        shown.map((s) =>
          s.plot.id === selectedVisible?.id ? null : (
            <PlotLabel key={s.plot.id} position={labelAt(s)} z={20}>
              <span
                className={`rounded-pill text-13 inline-block px-1.5 font-medium whitespace-nowrap tabular-nums ${STATUS_CHIP[s.plot.status]}`}
              >
                {s.plot.number}
              </span>
            </PlotLabel>
          ),
        )}

      {selectedVisible && selRect && (
        <group position={[selectedVisible.px - ox, 0, selectedVisible.py - oz]}>
          {marigold && (
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[selRect.width - 0.1, selRect.depth - 0.1]} />
              <meshBasicMaterial color={marigold} transparent opacity={0.3} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
      {/* ป้ายเต็มของแปลงที่เลือก — ลอยเหนือยอดบ้าน และอยู่บนป้ายเลขแปลงอื่นเสมอ
          สีแถบขอบแปลงมี legend คำกำกับอยู่นอก canvas (MasterPlanViewer) */}
      {selectedSited && (
        <PlotLabel position={labelAt(selectedSited)} z={30}>
          <span
            className={`rounded-pill text-13 inline-block px-2 py-0.5 font-medium whitespace-nowrap ${STATUS_CHIP[selectedSited.plot.status]}`}
          >
            {selectedSited.plot.number} · {t.status[selectedSited.plot.status]}
          </span>
        </PlotLabel>
      )}
    </group>
  );
}

/* ป้ายแปลงเป็น DOM ซ้อนบน canvas (ไม่มี occlude) — ตัวหนังสือไม่มีวันถูกหลังคาหรือของในฉากบัง
   - z-index คงที่ ไม่ไล่ตามระยะกล้อง: กล้อง ortho ของเรามี near ติดลบ ค่าที่ drei คำนวณตามระยะจึงเพี้ยน/ติดลบได้
     (ป้ายตกไปใต้ canvas หรือป้ายเลขแปลงข้างเคียงทับป้ายแปลงที่เลือก) · ป้ายแปลงที่เลือกสูงกว่าป้ายเลขแปลงเสมอ
   - ไม่ซ่อนป้ายที่ "อยู่หลังกล้อง": กล้อง ortho วางห่างจุดเล็ง 40 ม. แต่หมู่บ้านยาวกว่า 130 ม.
     ปลายฝั่งใกล้กล้องจึงถูก drei นับว่าอยู่หลังกล้องทั้งที่ยังวาดอยู่บนจอ
   - หนีบจุดกลางป้ายให้ทั้งป้ายอยู่ในกรอบ canvas (วัดขนาดป้ายจริง) — หมุน/ซูม/จอแคบ ป้ายไม่หลุดขอบ */
const LABEL_PAD = 6;
const projected = new Vector3();
function PlotLabel({
  position,
  z,
  children,
}: {
  position: [number, number, number];
  z: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const place = (el: Object3D, camera: Camera, size: { width: number; height: number }) => {
    projected.setFromMatrixPosition(el.matrixWorld).project(camera);
    const x = (projected.x + 1) * (size.width / 2);
    const y = (1 - projected.y) * (size.height / 2);
    const node = box.current;
    const hw = (node?.offsetWidth ?? 0) / 2 + LABEL_PAD;
    const hh = (node?.offsetHeight ?? 0) / 2 + LABEL_PAD;
    const clamp = (v: number, lo: number, hi: number) =>
      hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
    return [clamp(x, hw, size.width - hw), clamp(y, hh, size.height - hh)];
  };
  return (
    <Html
      position={position}
      center
      zIndexRange={[z, z]}
      calculatePosition={place}
      eps={-1}
      onOcclude={() => undefined}
      pointerEvents="none"
    >
      <div ref={box}>{children}</div>
    </Html>
  );
}

/* กล่องรับการคลิกต่อแปลง (มองไม่เห็น สูงคลุมหลังคา) — คลิกบ้าน สวน หรือแถบสถานะ ก็ได้แปลงนั้น */
const hidden = new MeshBasicMaterial({ visible: false });
function PickBoxes({
  sited,
  skipPlotId,
  ox,
  oz,
  onPick,
}: {
  sited: readonly Sited[];
  skipPlotId: string | undefined;
  ox: number;
  oz: number;
  onPick: (id: string) => void;
}) {
  const items = useMemo(() => sited.filter((s) => s.plot.id !== skipPlotId), [sited, skipPlotId]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new Matrix4();
    items.forEach((s, i) => {
      mat.makeScale(s.rect.width, 8, s.rect.depth);
      mat.setPosition(s.plot.px - ox, 4, s.plot.py - oz);
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, ox, oz]);
  if (items.length === 0) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[undefined, hidden, items.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const id = e.instanceId === undefined ? null : items[e.instanceId]?.plot.id;
        if (!id) return;
        e.stopPropagation();
        onPick(id);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}
