import { NotFoundView } from "@/components/site/NotFoundView";
import { getDictionary } from "@/i18n";
import { repo } from "@/lib/repo";

export const metadata = { title: getDictionary("th").meta.notFound };

/* ใช้ทั้งกับ notFound() ในหน้าใต้ [lang] และ URL ที่ไม่มีอยู่จริง ([...missing]/page.tsx · app/not-found.tsx)
   ไฟล์นี้ไม่ได้รับ params — ภาษามาจาก LocaleProvider ของ [lang]/layout ผ่าน NotFoundView */
export default function SiteNotFound() {
  return <NotFoundView brandName={repo.getSite("en").brandName} />;
}
