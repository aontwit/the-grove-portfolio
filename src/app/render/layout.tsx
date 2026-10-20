import { HtmlDocument } from "@/app/_meta/document";

/* หน้าถ่ายภาพนิ่ง (dev เท่านั้น) — ไทยอย่างเดียว ไม่อยู่ใต้ [lang] เอกสาร html จึงวาดที่นี่ */
export default function RenderDocument({ children }: { children: React.ReactNode }) {
  return <HtmlDocument lang="th">{children}</HtmlDocument>;
}
