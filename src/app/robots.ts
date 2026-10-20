import type { MetadataRoute } from "next";
import { absolute } from "@/app/_meta/site";

/* หน้าหลังบ้านกับหน้าเครื่องมือตอน dev ไม่ใช่ของคนซื้อบ้าน — ปิดไม่ให้เครื่องมือค้นหาเก็บ
   หน้า dev พวกนี้ยังตอบ 404 ใน production อีกชั้น (ดู layout.tsx ของแต่ละโฟลเดอร์) */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/render", "/dev", "/design-system", "/furniture", "/plan"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
