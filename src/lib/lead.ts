import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { plotPrice } from "./format";
import type { ContactChannel, ContactTime, HouseType, Plot } from "./schemas";
import { isOpen } from "./status";

/* คำและตัวเลขของฟอร์มลงทะเบียนที่ฟอร์ม (หน้าเว็บ) กับตารางผู้ลงทะเบียน (หลังบ้าน) ต้องพูดตรงกัน
   ค่าคงที่ _TH คือชุดภาษาไทยของ i18n/th.ts (หลังบ้านเป็นไทยอย่างเดียว) · ฟอร์มสองภาษาอ่านจาก dictionary */

export const CHANNEL_TH: Record<ContactChannel, string> = getDictionary("th").lead.channel;

export const TIME_TH: Record<ContactTime, string> = getDictionary("th").lead.time;

/** ท่อนต่อท้ายประโยค "ทีมขายจะโทรหาคุณ…" */
export const TIME_PHRASE: Record<ContactTime, string> = getDictionary("th").lead.timePhrase;

/** 2,960,000 → "2.96" ตามรูปแบบ "x.xx ล้านบาท" ที่ตลาดบ้านไทยใช้ */
export function million(n: number) {
  return (n / 1_000_000).toFixed(2);
}

/** "6-7" → "6–7 ล้านบาท" / "THB 6–7 million" */
export function budgetLabel(value: string, lang: Locale = "th") {
  const [lo = "", hi = ""] = value.split("-");
  return getDictionary(lang).format.budget(lo, hi);
}

export type BudgetBracket = { value: string; label: string; available: number };

/** ช่วงงบทีละ 1 ล้าน ครอบราคาจริงของแปลงในโครงการ ไม่ได้ตั้งช่วงขึ้นเอง — แปลงที่ยังไม่มีราคารายแปลง
    คิดจากราคาเริ่มต้นของแบบบ้านที่ผู้พัฒนาประกาศ (ตอนนี้ 2.68–3.29 ล้าน → 2–3 / 3–4)
    available = จำนวนแปลงที่ยังเปิดลงทะเบียนได้ (ว่าง หรือรอยืนยันสถานะ) ในช่วงนั้น */
export function budgetBrackets(
  all: Plot[],
  houses: readonly HouseType[],
  lang: Locale = "th",
): BudgetBracket[] {
  const priced = all.flatMap((p) => {
    const price = plotPrice(p, houses);
    return price ? [{ plot: p, amount: price.amount }] : [];
  });
  if (priced.length === 0) return [];
  const prices = priced.map((x) => x.amount / 1_000_000);
  const lo = Math.floor(Math.min(...prices));
  const hi = Math.floor(Math.max(...prices)) + 1;
  const out: BudgetBracket[] = [];
  for (let m = lo; m < hi; m++) {
    const value = `${m}-${m + 1}`;
    const n = priced.filter(
      (x) => isOpen(x.plot.status) && x.amount >= m * 1_000_000 && x.amount < (m + 1) * 1_000_000,
    ).length;
    out.push({ value, label: budgetLabel(value, lang), available: n });
  }
  return out;
}
