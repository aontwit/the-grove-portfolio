"use client";

import { usePathname } from "next/navigation";
import { splitLocale } from "@/i18n/config";

/* ลิงก์แรกของหน้าสำหรับคนใช้คีย์บอร์ด/โปรแกรมอ่านจอ (WCAG 2.4.1) — ซ่อนจนกว่าจะได้ focus · สไตล์ .skip-link ใน globals.css
   หน้าทั่วไปลงที่ <main id="content"> · หน้าแรกข้ามฉากโมเดลที่ยาวหลายจอไปลงที่ตัวเลือกโครงการ (ProjectChooser)
   เป็น client component เพราะ layout ไม่รู้ว่ากำลังวาดหน้าไหน — usePathname ได้ค่าตั้งแต่ตอน render บน server
   (path ไม่มี prefix ภาษา: /en และ /zh ก็เป็นหน้าแรก) HTML แรกจึงชี้ถูกที่ก่อน hydrate */

/** id ของปลายทางบนหน้าแรก — ตรงกับ CHOOSER_ID ใน ProjectChooser.tsx */
const HOME_TARGET = "projects";

export function SkipLink({ label }: { label: string }) {
  const { path } = splitLocale(usePathname());
  return (
    <a href={path === "/" ? `#${HOME_TARGET}` : "#content"} className="skip-link">
      {label}
    </a>
  );
}
