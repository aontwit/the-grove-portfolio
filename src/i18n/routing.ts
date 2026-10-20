import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./config";

/* เส้นทางภาษาของ next-intl — รายชื่อภาษาอ่านจาก config.ts ที่เดียว
   - as-needed: ไทย (ภาษาหลัก) ไม่มี prefix · /th/... redirect ไป URL ที่ไม่มี prefix · /en /zh มี prefix
   - ไม่เดาภาษาจาก Accept-Language หรือ cookie: URL เดียวได้หน้าเดียวเสมอ (เครื่องมือค้นหาและลิงก์ที่แชร์ต่อเห็นเหมือนกัน)
     ผู้ใช้เปลี่ยนภาษาเองด้วยปุ่มสลับภาษา
   - ไม่ให้ middleware ใส่ header Link hreflang เอง — metadata ของแต่ละหน้า (_meta/site.ts) ทำแล้ว */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});
