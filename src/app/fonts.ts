import { Anuphan, Noto_Serif_Display, Noto_Serif_Thai } from "next/font/google";

/* ฟอนต์ §2 (ชุด The Grove) — ทุกหน้าใช้ชุดเดียว (หน้าเว็บสองภาษา หลังบ้าน หน้าเครื่องมือ) ผ่าน <HtmlDocument>

   Display = สองไฟล์ที่ออกแบบมาเป็นครอบครัวเดียวกัน ต่อกันใน font-family เดียว (globals.css --font-display)
   - Noto Serif Display โหลดเฉพาะ subset latin: ตัวละติน ตัวเลข เว้นวรรค วรรคตอน มาจากไฟล์นี้
     serif คอนทราสต์สูงเส้นบาง สำหรับหัวข้อละติน
   - Noto Serif Thai โหลดเฉพาะ subset thai: ไฟล์ละตินไม่มีตัวไทย เบราว์เซอร์จึงตกมาที่ไฟล์นี้เฉพาะตัวไทย
     ไทยมีหัว เส้นหนาบางตามแบบ serif ไทย สัดส่วน x-height เข้ากับตัวละตินของครอบครัวเดียวกัน
     หัวข้อที่ผสมเลขกับไทย ("บ้าน 3 แบบ") จึงไม่โดดขนาดกัน
   ทั้งคู่เป็น variable font (แกน wght) ไฟล์เดียวต่อ subset ใช้ได้ 400/500/600 ตาม §2 โดยไม่ต้องโหลดหลายไฟล์

   Body/UI = Anuphan คงเดิม — sans ไทยไม่มีหัว อ่านง่ายบนมือถือ 
   และ NavLinks.tsx วัดจุดเปลี่ยนแถวของเมนูจากความกว้าง Anuphan ไว้แล้ว (CLS 320–412px) เปลี่ยนฟอนต์ body ต้องวัดใหม่

   display "swap" คงไว้: ตัวหนังสือต้องขึ้นทันที ("optional" บนเน็ตช้าอาจไม่ขึ้นฟอนต์จริงเลยทั้งหน้า ซึ่งขัด §2)
   adjustFontFallback (ค่าเริ่มต้น เขียนไว้ให้เห็น) ปรับ metric ของ fallback ละติน (Times New Roman / Arial)
   ให้ใกล้ฟอนต์จริง — ตัวไทยระหว่างรอฟอนต์ไปตกที่ฟอนต์ไทยของระบบ หัวข้อเป็น block ไม่มีอะไรวางต่อแถว
   ความกว้างที่ต่างกันจึงไม่ดันแถวอื่น · CLS ก้อนใหญ่ของเมนูแก้ที่ NavLinks.tsx (ไม่เกี่ยวกับฟอนต์หัวข้อ) */
const serifDisplay = Noto_Serif_Display({
  subsets: ["latin"],
  variable: "--font-serif-display",
  display: "swap",
  adjustFontFallback: true,
});

const serifThai = Noto_Serif_Thai({
  subsets: ["thai"],
  variable: "--font-serif-thai",
  display: "swap",
  adjustFontFallback: true,
});

const anuphan = Anuphan({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  variable: "--font-anuphan",
  display: "swap",
  adjustFontFallback: true,
});

export const FONT_VARIABLES = `${serifDisplay.variable} ${serifThai.variable} ${anuphan.variable}`;

/* ฟอนต์จีน (Noto Sans SC / Noto Serif SC) อยู่ที่ _meta/CjkFonts.tsx — โหลดเฉพาะหน้า /zh
   ห้ามย้ายกลับมาไฟล์นี้: CSS ของมัน ~190 KB บล็อกการวาดทุกหน้าทุกภาษา (ดูเหตุผลในไฟล์นั้น) */
