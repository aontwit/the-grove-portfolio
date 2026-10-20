import { HtmlDocument } from "@/app/_meta/document";

/* หลังบ้านเป็นภาษาไทยอย่างเดียว ไม่อยู่ใต้ [lang] — root layout ผ่านเฉยๆ เอกสาร html จึงวาดที่นี่
   (หน้า login กับกลุ่ม (panel) ใช้ร่วมกัน) */
export default function AdminDocument({ children }: { children: React.ReactNode }) {
  return <HtmlDocument lang="th">{children}</HtmlDocument>;
}
