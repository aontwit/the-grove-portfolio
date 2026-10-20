import type { Locale, TranslatedLocale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import type { Claim, Project } from "./schemas";

const claimIn =
  (lang: TranslatedLocale) =>
  (c: Claim): Claim => ({ ...c, text: c[lang].text });

/* โครงการในภาษาที่ขอ — repo เรียกครั้งเดียวตอนโหลด (แบบเดียวกับ lib/localize.ts)
   ช่องที่ยังรอ (null) คง null ทั้งสองภาษา · ตัวเลข พิกัด และผังไม่ถูกแตะ นอกจากชื่อส่วนกลาง ชื่อสถานที่ และคำของผู้พัฒนา */
export function localizeProject(p: Project, lang: Locale): Project {
  if (lang === "th") return p;
  const claim = claimIn(lang);
  return {
    ...p,
    name: p[lang].name,
    summary: p[lang].summary,
    plan: p.plan && {
      ...p.plan,
      amenities: p.plan.amenities.map((a) => ({ ...a, name: a[lang].name })),
    },
    location: p.location && {
      ...p.location,
      district: p.location[lang].district,
      province: p.location[lang].province,
      nearby: p.location.nearby.map((n) => ({ ...n, name: n[lang].name })),
      landmarks: p.location.landmarks.map((n) => ({ ...n, name: n[lang].name })),
      directions: p.location.directions.map(claim),
    },
    claims: p.claims.map(claim),
  };
}

/** ลิงก์แผนที่ของโครงการ — ลิงก์ที่เจ้าของโครงการให้มาก่อน ไม่มีก็สร้างจากพิกัด ไม่มีทั้งคู่ = null */
export function projectMapUrl(p: Project): string | null {
  if (p.mapUrl) return p.mapUrl;
  if (!p.location) return null;
  return `https://www.google.com/maps/search/?api=1&query=${p.location.lat},${p.location.lng}`;
}

/** โครงการที่มีหน้าเนื้อหา (ผัง แบบบ้าน ทำเล) — pending ยังไม่มี จึงมีแค่หน้ารอข้อมูล */
export const hasContent = (p: Project) => p.status !== "pending";

/** หน้าของโครงการนี้ควรเข้า index ของเครื่องมือค้นหาหรือไม่ — ตัดสิน 2026-10-02:
    live = index หน้าโครงการ แบบบ้าน ผัง และทำเล (ชื่อ ทำเล ตัวเลข ราคาเริ่มต้นเป็นของจริงจากผู้พัฒนา
    ส่วนที่เป็นตัวอย่างมีป้ายกำกับในหน้า) · ลิงก์รายแปลง (?plot=) noindex เพราะผังแปลงและสถานะรายแปลง
    ยังไม่ใช่ของจริง (master-plan/page.tsx) · pending ไม่มีเนื้อหา → noindex */
export const indexable = (p: Project) => p.status === "live";

/** ชื่อที่แสดง — ชื่อจริงถ้ามี ไม่มีก็ป้ายกลาง "โครงการที่ n" (ไม่ใช่ชื่อโครงการ หน้าเว็บติดป้ายรอข้อมูลคู่เสมอ)
    project = โครงการของภาษานั้น (repo.getProject(slug, lang)) */
export const projectLabel = (p: Project, lang: Locale) =>
  p.name ?? getProjectsDictionary(lang).slot(p.slot);

/** ปีที่แสดง — ไทยเป็น พ.ศ. อังกฤษและจีนเป็น ค.ศ. */
export const displayYear = (ce: number, lang: Locale) => (lang === "th" ? ce + 543 : ce);
