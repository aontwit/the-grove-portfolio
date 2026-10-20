import { HtmlDocument } from "@/app/_meta/document";
import { SiteChrome } from "@/components/site/SiteChrome";
import { getDictionary } from "@/i18n";
import SiteNotFound from "./[lang]/not-found";

export const metadata = { title: getDictionary("th").meta.notFound };

/* URL ที่ไม่ผ่าน [lang] และไม่ตรง route ไหน (เช่นหน้าย่อยที่ไม่มีของ /render) หรือ notFound() จาก layout
   ของหน้าเครื่องมือตอน production — root layout ผ่านเฉยๆ ไฟล์นี้จึงวาดเอกสารเอง เป็นภาษาไทย
   ห่อโครงหน้าเดียวกับเว็บผู้ซื้อ คนที่หลงมายังเห็น header footer และเดินต่อได้ */
export default function NotFound() {
  return (
    <HtmlDocument lang="th">
      <SiteChrome lang="th">
        <SiteNotFound />
      </SiteChrome>
    </HtmlDocument>
  );
}
