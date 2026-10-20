/* ภาษาของเว็บฝั่งผู้ซื้อ — ไทย อังกฤษ จีนตัวย่อ
   ตัดสิน 2026-10-02 (เจ้าของสั่ง): เพิ่มภาษาจีน และเปลี่ยนกลไกเส้นทางภาษาไปใช้ next-intl (i18n/routing.ts)
   - ไทยเป็นภาษาหลัก อยู่ที่ URL เดิมไม่มี prefix (/master-plan) — middleware ของ next-intl rewrite ไป /th/... ภายใน
   - อังกฤษอยู่ใต้ /en/... จีนอยู่ใต้ /zh/... · /th/... จากภายนอก redirect กลับไป URL ที่ไม่มี prefix
   - หลังบ้าน /admin, หน้าเครื่องมือ dev และ /render เป็นไทยอย่างเดียว ไม่ผ่าน [lang]
   ไฟล์นี้ไม่มี dependency และไม่มี "use client" — ใช้ได้ทั้ง middleware, server, client และสคริปต์ node (schemas.ts) */

export const LOCALES = ["th", "en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
/** ภาษาที่มีคำแปลคู่ใน data (ช่อง en / zh ที่ schemas.ts บังคับ) — ไทยคือค่าหลักของ data เอง */
export type TranslatedLocale = Exclude<Locale, "th">;

export const DEFAULT_LOCALE: Locale = "th";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** ภาษาอื่นทั้งหมดนอกจากภาษาของหน้า — og:locale:alternate และปุ่มสลับภาษา */
export const otherLocales = (lang: Locale): Locale[] => LOCALES.filter((l) => l !== lang);

/** og:locale ตามรูปแบบ language_TERRITORY ของ Open Graph */
export const OG_LOCALE: Record<Locale, string> = { th: "th_TH", en: "en_US", zh: "zh_CN" };

/** ค่า <html lang> / hreflang — จีนระบุชุดตัวอักษร (ตัวย่อ) ให้เบราว์เซอร์เลือกรูปอักษรถูกชุด */
export const HTML_LANG: Record<Locale, string> = { th: "th", en: "en", zh: "zh-Hans" };

/** prefix ของ URL — ไทยไม่มี prefix */
const PREFIX: Record<Locale, string> = { th: "", en: "/en", zh: "/zh" };

/** path ภายในเว็บ (ไม่มี prefix ภาษา) → path ของภาษานั้น · รับ query string ได้ "/master-plan?plot=x"
    path ที่ไม่ได้ขึ้นต้นด้วย "/" (ลิงก์ภายนอก, mailto:, tel:, #anchor) และ path ไทยอย่างเดียวคืนค่าเดิม */
export function localePath(lang: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || isThaiOnlyPath(path)) return path;
  const prefix = PREFIX[lang];
  if (!prefix) return path;
  if (path === "/") return prefix;
  if (path.startsWith("/?") || path.startsWith("/#")) return `${prefix}${path.slice(1)}`;
  return `${prefix}${path}`;
}

/** path จากแถบที่อยู่ (usePathname) → ภาษา + path ที่ไม่มี prefix · "/en/gallery" → { en, "/gallery" } */
export function splitLocale(pathname: string): { lang: Locale; path: string } {
  const m = /^\/(th|en|zh)(?=\/|$)/.exec(pathname);
  if (!m) return { lang: DEFAULT_LOCALE, path: pathname || "/" };
  const rest = pathname.slice(m[0].length);
  return { lang: m[1] as Locale, path: rest || "/" };
}

/** path ที่เป็นไทยอย่างเดียว ไม่มีฉบับภาษาอื่น — ลิงก์ไปที่นี่ห้ามเติม prefix ภาษา */
const THAI_ONLY = /^\/(admin|render|dev|design-system|furniture|plan)(\/|$)/;
export const isThaiOnlyPath = (path: string) => THAI_ONLY.test(path);
