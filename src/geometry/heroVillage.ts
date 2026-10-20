import { PLINTH_H, houseSiting, type HouseGeom, type PlotSize } from "./exterior.ts";
import { mm, plotRect, type GeomPlot } from "./index.ts";

/* ฉากเปิดหน้าแรก: บ้านใน diorama ยืนนิ่ง แล้วหมู่บ้านทั้งโครงการมาประกอบรอบตัวมัน
   หมู่บ้าน (MasterPlanScene) วางบ้านแต่ละหลังด้วย plotMatrix (components/three/house/build.ts):
     T(px − W/2, PLINTH_H, py − D/2) · R_y(หมุน) · T(−กลางแปลงในพิกัดบ้าน)   โดยแปลงในพิกัดบ้าน = houseSiting(บ้าน, ขนาดแปลงจริง)
   กลุ่มหมู่บ้านในฉากจึงต้องใช้เมทริกซ์ผกผัน — บ้านใน diorama (พิกัดบ้าน) ทับจุดที่หมู่บ้านจะวางบ้านหลังนี้พอดี
   ทั้งตำแหน่ง ทิศ ระยะถอย โรงจอด และต้นไม้ (ตรวจใน geometry:check ข้อ hero-village)
   ไฟล์นี้ไม่ import three — server (heroStage.ts) และสคริปต์ตรวจใช้ได้ตรงๆ
   บ้านแฝด: หมู่บ้านสะท้อนหลังหนึ่งของคู่ (twinPairs) — ยังไม่รองรับที่นี่ เลือกแปลงทิศ data (ไม่สะท้อน) ให้บ้านพระเอกเสมอ */

export type HeroVillagePlacement = {
  /** ตำแหน่งของกลุ่มหมู่บ้านในฉาก diorama (เมตร) */
  offset: [number, number, number];
  /** หมุนกลุ่มหมู่บ้านรอบแกนตั้ง (เรเดียน) */
  rotation: number;
  /** ขนาดแปลงจริง — FloorPlanScene ใช้สร้างสวน/โรงจอด/ต้นไม้ของแปลงนี้ด้วย houseSiting ตัวเดียวกัน */
  plotSize: PlotSize;
};

/** หมุนจุด (x, z) รอบแกน Y แบบเดียวกับ three.js (Matrix4.makeRotationY) */
function rotY(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

/** แถว A (เหนือถนน) หมุน 180° ให้หน้าบ้านหันหาถนน — ค่าเดียวกับ rotOf ใน MasterPlanScene */
export const plotRotation = (plot: { py: number }, plan: { roadY0: number }) =>
  plot.py < plan.roadY0 ? Math.PI : 0;

export function heroVillagePlacement(
  house: HouseGeom,
  plot: GeomPlot,
  plan: { widthM: number; depthM: number; plotDepthM: number; roadY0: number },
): HeroVillagePlacement {
  const rect = plotRect(plot, plan.plotDepthM);
  const plotSize = { width: rect.width, depth: rect.depth };
  const site = houseSiting(house, plotSize).plot;
  const pcx = (site.x0 + site.x1) / 2;
  const pcz = (site.z0 + site.z1) / 2;
  const rot = plotRotation(plot, plan);
  const wx = plot.px - plan.widthM / 2;
  const wz = plot.py - plan.depthM / 2;
  /* ผกผันของ T(w)·R(rot)·T(−pc) = T(pc)·R(−rot)·T(−w) → ตำแหน่ง pc − R(−rot)·w · หมุน −rot
     ระดับ: หมู่บ้านยกบ้านขึ้น PLINTH_H (สนามหมู่บ้าน y = 0) ส่วน diorama สนามอยู่ที่ −PLINTH_H จึงลดหมู่บ้านลงเท่านั้น */
  const [rx, rz] = rotY(wx, wz, -rot);
  return { offset: [mm(pcx - rx), -PLINTH_H, mm(pcz - rz)], rotation: -rot, plotSize };
}
