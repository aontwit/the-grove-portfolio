import { planBearing, plotSiting, SITE_NORTH_DEG, type SitePlanGeom } from "@/geometry";
import { sunPosition } from "@/components/three/materials";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { HouseType, Plot } from "./schemas";
import { isOpen } from "./status";
import { baht } from "./utils";

/* รูปแบบตัวเลขแบบที่ผู้ซื้อบ้านไทยคุ้น — ทุกหน้าที่แสดงราคา พื้นที่ ระยะ ใช้ชุดนี้ชุดเดียว
   - สรุป/การ์ด: "เริ่มต้น 2.96 ล้านบาท*" + เชิงอรรถ PRICE_NOTE ในหน้าเดียวกันเสมอ
   - แปลงที่ระบุตัว: ราคาเต็มหลักบาท "2,960,000 บาท" · แปลงที่ยังไม่มีราคารายแปลง (price null)
     แสดงราคาเริ่มต้นของแบบบ้าน "เริ่มต้น 2,960,000 บาท*" ห้ามแต่งราคารายแปลงขึ้นเอง
   - พื้นที่ใช้สอยวัดถึงกึ่งกลางผนัง จึงกำกับ "ประมาณ" · ที่ดินเป็นตัวเลขตามแปลง ไม่กำกับ
   - ระยะทางเป็น กม. และเวลาเดินทางกำกับ "ประมาณ" (schemas.ts: ค่าทำเลเป็นค่าโดยประมาณ)
   ทุกตัวรับ lang (ไม่ใส่ = ไทย) — คำและหน่วยมาจาก i18n/th.ts · en.ts ("From THB 6.21 million*", "sq. wa")
   ตัวเลขชุดเดียวกันทุกภาษา */

/** "6.21" — หน่วยล้าน ทศนิยมสองตำแหน่ง */
export const millions = (n: number) => (n / 1_000_000).toFixed(2);

/** ราคาสรุปของกลุ่มแปลง — ต้องมี priceNote อยู่ในหน้าเดียวกัน */
export const priceFrom = (n: number, lang: Locale = "th") =>
  getDictionary(lang).format.priceFrom(millions(n));

/** ราคาของแปลงที่ระบุตัว — เต็มหลักบาท */
export const priceExact = (n: number, lang: Locale = "th") =>
  getDictionary(lang).format.priceExact(baht(n));

/** เชิงอรรถของ "เริ่มต้น … ล้านบาท*" */
export const priceNote = (lang: Locale = "th") => getDictionary(lang).format.priceNote;
export const PRICE_NOTE = priceNote("th");

/** แปลงที่ระบุตัวก็ยังต้องบอกว่าราคาเปลี่ยนได้ — แต่ไม่ใช่ "ราคาเริ่มต้น" จึงแยกประโยค */
export const plotPriceNote = (lang: Locale = "th") => getDictionary(lang).format.plotPriceNote;
export const PLOT_PRICE_NOTE = plotPriceNote("th");

type PriceHouse = Pick<HouseType, "id" | "priceFrom">;

/** ราคาที่ใช้คิดของแปลง — ราคารายแปลงถ้ามี ไม่มีก็ราคาเริ่มต้นของแบบบ้าน (from = true ต้องกำกับ "เริ่มต้น") */
export function plotPrice(
  plot: Pick<Plot, "price" | "houseTypeId">,
  houses: readonly PriceHouse[],
): { amount: number; from: boolean } | null {
  if (plot.price !== null) return { amount: plot.price, from: false };
  const house = houses.find((h) => h.id === plot.houseTypeId);
  return house ? { amount: house.priceFrom, from: true } : null;
}

/** ราคาของแปลงที่ระบุตัวเป็นข้อความ: "2,960,000 บาท" หรือ "เริ่มต้น 2,960,000 บาท*" */
export function plotPriceText(
  plot: Pick<Plot, "price" | "houseTypeId">,
  houses: readonly PriceHouse[],
  lang: Locale = "th",
): string {
  const p = plotPrice(plot, houses);
  const f = getDictionary(lang).format;
  if (!p) return getDictionary(lang).common.unspecified;
  return p.from ? f.priceFromExact(baht(p.amount)) : f.priceExact(baht(p.amount));
}

/** ราคาต่ำสุดของแปลงที่ยังเปิดอยู่ (ว่าง หรือรอยืนยันสถานะ) เฉพาะแบบบ้านที่ระบุ — ไม่มีแปลงเปิด = null
    แปลงที่ยังไม่มีราคารายแปลงคิดจากราคาเริ่มต้นของแบบบ้าน */
export function lowestOpen(
  plots: readonly Plot[],
  houses: readonly PriceHouse[],
  houseTypeId?: string,
): number | null {
  const prices = plots
    .filter((p) => isOpen(p.status) && (!houseTypeId || p.houseTypeId === houseTypeId))
    .flatMap((p) => plotPrice(p, houses)?.amount ?? []);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** พื้นที่ใช้สอยตามที่ผู้พัฒนาประกาศ — ตัวเลขเต็มตามประกาศ ไม่กำกับ "ประมาณ" (ไม่ได้คำนวณจากแปลนตัวอย่าง) */
export const sqmText = (n: number, lang: Locale = "th") =>
  getDictionary(lang).format.sqmText(Number.isInteger(n) ? String(n) : n.toFixed(1));

/* หน่วยติดกับตัวเลขด้วย no-break space — "14.0" กับ "ม." ห้ามแยกบรรทัดบนจอแคบ */
const NBSP = " ";
export const sqw = (n: number, lang: Locale = "th") =>
  `${n}${NBSP}${getDictionary(lang).units.sqw}`;
export const km = (n: number, lang: Locale = "th") => `${n}${NBSP}${getDictionary(lang).units.km}`;
export const metres = (n: number, lang: Locale = "th") =>
  `${Math.round(n)}${NBSP}${getDictionary(lang).units.m}`;

/* ── ทิศ ─────────────────────────────────────────────────────────────────── */

/** คำของทิศ 8 ทิศที่ใกล้มุมนั้นที่สุด */
export const compass = (deg: number, lang: Locale = "th") => {
  const words = getDictionary(lang).format.compass8;
  return words[Math.round(deg / 45) % 8] ?? words[0] ?? "";
};
export const compassTh = (deg: number) => compass(deg, "th");

/** "หันทิศเหนือ 0°" / "faces north (0°)" */
export const facing = (deg: number, lang: Locale = "th") =>
  getDictionary(lang).format.facing(compass(deg, lang), deg);
export const facingTh = (deg: number) => facing(deg, "th");

/* ── บรรทัดข้อเท็จจริงของแปลง ────────────────────────────────────────────── */

/** ระยะที่ถือว่า "ติด" ส่วนกลาง — เส้นแบ่งแปลงกับส่วนกลางบนผังห่างกันแค่ทางเท้า */
const ADJACENT_M = 3;

export type PlotFacts = ReturnType<typeof plotFacts>;

/**
 * ข้อเท็จจริงของแปลงสำหรับรายการแปลงและแผงรายละเอียด — ทุกคำมาจาก geometry กับผังโครงการ
 * แดด: ใช้ sunPosition() ตัวเดียวกับฉาก 3D และแผนภาพแดด ดูว่าเที่ยงวันแดดอยู่ด้านหน้าหรือหลังแปลง
 * (แบบจำลองนี้ไม่คิดเงาบ้านข้างเคียง ต้นไม้ หรือฤดูกาล — หน้าที่ใช้ต้องบอกไว้)
 * ชื่อส่วนกลางมาจาก plan ที่ส่งเข้ามา — ส่ง plan ของโครงการในภาษาเดียวกับ lang (repo.getProject(slug, lang))
 */
export function plotFacts(
  plot: Plot,
  all: readonly Plot[],
  plan: SitePlanGeom,
  lang: Locale = "th",
) {
  const t = getDictionary(lang).format.siting;
  const s = plotSiting(plot, all, plan);
  const [sx, , sz] = sunPosition(12, 1, SITE_NORTH_DEG);
  const noonOnFront = s.front ? sx * s.front.dx + sz * s.front.dy > 0 : null;

  const sun = noonOnFront === null ? null : noonOnFront ? t.noonFront : t.noonBack;

  const a = s.nearestAmenity;
  const sideWord = (dx: number) => compass(planBearing(dx, 0), lang);
  let place: string | null = null;
  if (a && a.gapM <= ADJACENT_M) place = t.nextTo(a.name);
  else if (s.openSide.east) place = t.roadEnd(sideWord(1));
  else if (s.openSide.west) place = t.roadStart(sideWord(-1));
  else if (a) place = t.awayFrom(a.name, metres(a.gapM, lang));

  return {
    ...s,
    facing: s.frontBearing === null ? null : facing(s.frontBearing, lang),
    note: [sun, place].filter(Boolean).join(" · "),
  };
}

/** เชิงอรรถของบรรทัดข้อเท็จจริง — วางใต้รายการหรือแผงที่แสดง plotFacts().note */
export const sitingNote = (lang: Locale = "th") => getDictionary(lang).format.sitingNote;
export const SITING_NOTE = sitingNote("th");
