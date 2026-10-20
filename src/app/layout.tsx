import type { Metadata, Viewport } from "next";
import { BROWSER_COLOR, SITE_URL, siteDescription, siteFacts } from "@/app/_meta/site";
import { getDictionary } from "@/i18n";
import "./globals.css";

/* root layout ผ่านเฉยๆ — <html lang> ต้องตามภาษาของ URL ซึ่ง layout ชั้นนี้มองไม่เห็น
   เอกสาร (html body ฟอนต์) จึงวาดที่ <HtmlDocument> ใน layout ชั้นถัดไป (ดู app/_meta/document.tsx)
   metadata ที่นี่เป็นค่าตั้งต้นภาษาไทยของหลังบ้านและหน้าเครื่องมือ — หน้าเว็บผู้ซื้อทับด้วย [lang]/layout.tsx */

export function generateMetadata(): Metadata {
  const f = siteFacts("th");
  const description = siteDescription("th");
  const title = getDictionary("th").meta.siteTitle(f.name, f.units, f.houseTypes);
  return {
    metadataBase: SITE_URL,
    title: { default: title, template: `%s · ${f.name}` },
    description,
    applicationName: f.name,
    formatDetection: { telephone: false, email: false, address: false },
  };
}

/* แถบเบราว์เซอร์บนมือถือใช้สีพื้นหลักของหน้า (canvas) ตามโหมดสว่าง/มืดของเครื่อง */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BROWSER_COLOR.canvas },
    { media: "(prefers-color-scheme: dark)", color: BROWSER_COLOR.canvasDark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
