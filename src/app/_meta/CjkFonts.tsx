"use client";

import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

/* ฟอนต์จีน (เพิ่ม 2026-10-02 พร้อมหน้า /zh) — Anuphan กับ Noto Serif Thai ไม่มีอักษรจีน
   - Noto Serif SC ต่อท้าย stack ของหัวข้อ: ครอบครัว Noto Serif เดียวกับตัวละติน/ไทย เส้นหนาบางไปทางเดียวกัน
   - Noto Sans SC ต่อท้าย stack ของเนื้อหา: ละตินและตัวเลขยังมาจาก Anuphan เหมือนทุกภาษา เฉพาะอักษรจีนตกมาที่นี่
   preload: false — ไฟล์จีนแบ่งเป็นหลายช่วง unicode-range เบราว์เซอร์โหลดเฉพาะช่วงที่หน้าใช้จริง

   แยกไฟล์นี้ออกจาก app/fonts.ts (2026-10-02, งานความเร็ว): CSS @font-face ของสองฟอนต์นี้มี ~600 ช่วง unicode-range
   รวม ~190 KB (gzip) และเป็น CSS ที่บล็อกการวาดหน้า — ถ้า import จาก fonts.ts มันติดไปกับ layout ทุกหน้าทุกภาษา
   (หน้าไทยวาดช้าลง ~2 วินาทีบนมือถือ, Lighthouse render-blocking) ไฟล์นี้ถูกโหลดผ่าน next/dynamic
   จาก <HtmlDocument> เฉพาะ lang "zh" — Next ใส่ <link> CSS ของมันเฉพาะหน้าที่ render ตัวนี้จริง

   ค่าตัวแปรตั้งที่ :root (ไม่ใช่ class บน <html> แบบฟอนต์อื่น) เพราะ server component ของเอกสาร import ไฟล์นี้ตรงๆ ไม่ได้
   (import = CSS ติดทุกหน้าอีก) · --font-display / --font-sans ใน globals.css อ่าน var(--font-*-sc) ที่ :root อยู่แล้ว */
const sansSc = Noto_Sans_SC({
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const serifSc = Noto_Serif_SC({
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export default function CjkFonts() {
  return (
    <style href="cjk-font-vars" precedence="default">
      {`:root{--font-sans-sc:${sansSc.style.fontFamily};--font-serif-sc:${serifSc.style.fontFamily}}`}
    </style>
  );
}
