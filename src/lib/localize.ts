import type { Locale } from "@/i18n/config";
import type { GalleryImage, HouseType, RenderShot, SiteSettings } from "./schemas";

/* แทนข้อความไทยใน data ด้วยคู่ภาษาของหน้า (ช่อง en / zh ที่ schemas.ts บังคับ) — repo เรียกใช้ที่เดียว
   รูปร่าง object ไม่เปลี่ยน UI จึงอ่าน house.name / room.name / site.brandName ได้เหมือนเดิมทุกภาษา
   ภาษาไทยคืน object เดิมทั้งก้อน (ไม่ copy) · ช่องตัวเลข เรขาคณิต และ id ไม่ถูกแตะ */

export function localizeHouse(h: HouseType, lang: Locale): HouseType {
  if (lang === "th") return h;
  return {
    ...h,
    name: h[lang].name,
    highlight: h[lang].highlight,
    rooms: h.rooms.map((r) => ({ ...r, name: r[lang].name, desc: r[lang].desc })),
  };
}

export function localizeRender(r: RenderShot, lang: Locale): RenderShot {
  return lang === "th" ? r : { ...r, title: r[lang].title, note: r[lang].note };
}

export function localizeGalleryImage(g: GalleryImage, lang: Locale): GalleryImage {
  if (lang === "th") return g;
  const t = g[lang];
  return { ...g, title: t.title, caption: t.caption, alt: t.alt, note: t.note };
}

export function localizeSite(s: SiteSettings, lang: Locale): SiteSettings {
  if (lang === "th") return s;
  const t = s[lang];
  return {
    ...s,
    brandName: t.brandName,
    salesHours: t.salesHours,
    replyTime: t.replyTime,
    developer: t.developer,
    legal: { ...s.legal, ...t.legal },
    privacy: { ...s.privacy, ...t.privacy },
    terms: { ...s.terms, ...t.terms },
    developerSpecs: s.developerSpecs.map((c) => ({ ...c, text: c[lang].text })),
    plannedShots: s.plannedShots.map((p) => ({ ...p, title: p[lang].title, note: p[lang].note })),
  };
}
