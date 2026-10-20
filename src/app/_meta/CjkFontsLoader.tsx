"use client";

import dynamic from "next/dynamic";

/* ตัวห่อฝั่ง client ของ CjkFonts — next/dynamic ต้องเรียกใน client component ถึงจะแยก CSS ของฟอนต์จีน
   ออกเป็นไฟล์ที่ใส่เฉพาะหน้าที่ render ตัวนี้ (ดูเหตุผลใน CjkFonts.tsx) · ssr คงเดิม: <style> ของตัวแปรฟอนต์อยู่ใน HTML ตั้งแต่แรก */
export const CjkFontsLoader = dynamic(() => import("./CjkFonts"));
