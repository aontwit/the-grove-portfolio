import { notFound } from "next/navigation";
import { HtmlDocument } from "@/app/_meta/document";

/* หน้าเครื่องมือตอน dev — production ตอบ 404 และห้ามเครื่องมือค้นหาเก็บ
   (แบบเดียวกับ src/app/render/[slug]/page.tsx) · guard อยู่ที่ layout เพราะ page บางหน้าเป็น client component */
export const metadata = { robots: { index: false, follow: false } };

export default function DevOnlyLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  /* root layout ผ่านเฉยๆ — เอกสาร html ของหน้าเครื่องมือ (ไทยอย่างเดียว) วาดที่นี่ */
  return <HtmlDocument lang="th">{children}</HtmlDocument>;
}
