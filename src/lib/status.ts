import { getDictionary } from "@/i18n";
import type { PlotStatus } from "./schemas";

/* คำไทยของสถานะแปลง (หลังบ้าน) — หน้าเว็บสองภาษาอ่าน dictionary.status ของภาษานั้น
   อยู่ในไฟล์กลางที่ไม่ใช่ "use client"
   เพราะ server component ที่ import ค่าจากไฟล์ client จะได้ placeholder ว่างแทนค่าจริง */
export const STATUS_TH: Record<PlotStatus, string> = getDictionary("th").status;
/** คำสั้น (รอยืนยัน) สำหรับที่แคบ: chip เลือกสถานะในหลังบ้าน กล่องแปลงบนผัง */
export const STATUS_SHORT_TH: Record<PlotStatus, string> = getDictionary("th").statusShort;

/** ลำดับสถานะทุกที่ที่แสดงเป็นรายการ (ตัวกรอง legend เมนูในหลังบ้าน) */
export const STATUSES: readonly PlotStatus[] = ["available", "unconfirmed", "reserved", "sold"];

/** จำนวนแปลงแยกตามสถานะ — ส่งเข้าประโยคสรุปสถานะใน i18n (StatusCounts) */
export function statusCounts(plots: readonly { status: PlotStatus }[]): Record<PlotStatus, number> {
  const out: Record<PlotStatus, number> = { available: 0, unconfirmed: 0, reserved: 0, sold: 0 };
  for (const p of plots) out[p.status]++;
  return out;
}

/** แปลงที่ยังลงทะเบียนสนใจได้: ว่าง หรือยังไม่รู้สถานะ (ทีมขายยืนยันตอนโทรกลับ) — จอง/ขายแล้วไม่ได้ */
export const isOpen = (status: PlotStatus) => status === "available" || status === "unconfirmed";

/* chip สถานะ — สีกับ label มาคู่กันเสมอ (§1 ห้ามสื่อสถานะด้วยสีอย่างเดียว)
   คู่ตัวอักษร/พื้นตาม §1 วัดแล้ว: ว่าง 6.51:1 · จอง 6.13:1 · ขายแล้ว 6.07:1
   รอยืนยัน: st-label-muted บน chalk 5.86:1 + ขอบเส้นประ (ไม่ใช่สีใหม่ globals.css)
   พื้น chip ไม่เปลี่ยนตามโหมดมืด ตัวอักษรจึงคงที่เช่นกัน — ห้ามใช้ text-ironwood/text-moss บน chip */
export const STATUS_CHIP: Record<PlotStatus, string> = {
  available: "bg-st-available-bg text-st-available",
  unconfirmed:
    "bg-st-unconfirmed-bg text-st-unconfirmed outline-st-unconfirmed outline-1 -outline-offset-1 outline-dashed",
  reserved: "bg-st-reserved-bg text-st-reserved",
  sold: "bg-st-sold-bg text-st-sold",
};
/* ลิงก์ถาวรของแปลง (plotHref) ย้ายไป lib/routes.ts พร้อม URL อื่นของโครงการ */
