import type { ReactNode } from "react";
import { CjkFontsLoader } from "@/app/_meta/CjkFontsLoader";
import { FONT_VARIABLES } from "@/app/fonts";
import { HTML_LANG, type Locale } from "@/i18n/config";

/* <html> กับ <body> ของทุกหน้า — app/layout.tsx เป็น layout ผ่านเฉยๆ (ส่ง children ต่อ) เพราะ lang ของ <html>
   ต้องรู้จาก [lang] ซึ่ง root layout มองไม่เห็น จึงย้ายเอกสารมาวาดที่ layout ชั้นถัดไปแต่ละกลุ่ม:
   - app/[lang]/layout.tsx — หน้าเว็บผู้ซื้อ lang ตาม URL
   - layout ของ /admin /render และหน้าเครื่องมือ dev — ไทยอย่างเดียว
   - app/not-found.tsx, app/error.tsx — URL ที่ไม่ผ่าน layout ไหนเลย
   ฟอนต์จีน: render <CjkFontsLoader> เฉพาะหน้าภาษาจีน — CSS ของมันจึงมากับหน้า /zh เท่านั้น */
export function HtmlDocument({ lang, children }: { lang: Locale; children: ReactNode }) {
  return (
    <html lang={HTML_LANG[lang]} className={FONT_VARIABLES}>
      <body>
        {lang === "zh" && <CjkFontsLoader />}
        {children}
      </body>
    </html>
  );
}
