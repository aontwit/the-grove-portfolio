import type { MetadataRoute } from "next";
import { absolute } from "@/app/_meta/site";
import { LOCALES, localePath } from "@/i18n/config";
import { indexable } from "@/lib/projects";
import { repo } from "@/lib/repo";
import {
  PROJECTS_PATH,
  houseHref,
  houseTypesHref,
  locationHref,
  masterPlanHref,
  projectHref,
} from "@/lib/routes";

/* หน้าสาธารณะระดับแบรนด์ + หน้าของโครงการที่เป็นข้อมูลจริง (status "live") จาก repo
   โครงการ pending (ไม่มีเนื้อหา) ไม่อยู่ใน sitemap และหน้าของมันตั้ง noindex · ลิงก์รายแปลง (?plot=) ไม่อยู่ใน sitemap
   และตั้ง noindex เพราะผังแปลงยังเป็นตัวอย่าง (ตัดสิน 2026-10-02 ดู lib/projects.ts indexable)
   (lib/projects.ts indexable) — URL เก่าสมัยโครงการเดียว (/master-plan ฯลฯ) เป็น 308 จึงไม่อยู่ที่นี่
   ทุกหน้ามีสองภาษา: หนึ่งแถวต่อภาษา แต่ละแถวบอกคู่ภาษาของมัน (hreflang ใน sitemap) · x-default = ไทย
   ไม่ใส่ lastModified / priority — ไม่มีวันที่แก้ไขจริงของแต่ละหน้า และไม่แต่งตัวเลขขึ้นมาเอง */
const PAGES = ["/", PROJECTS_PATH, "/gallery", "/register", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = repo.listProjects().filter(indexable);
  const projectPages = projects.flatMap((p) => [
    projectHref(p.slug),
    ...(p.plan ? [masterPlanHref(p.slug)] : []),
    houseTypesHref(p.slug),
    ...repo.listHouseTypes(undefined, p.id).map((h) => houseHref(p.slug, h.slug)),
    ...(p.location ? [locationHref(p.slug)] : []),
  ]);
  return [...PAGES, ...projectPages].flatMap((path) => {
    const languages = {
      ...Object.fromEntries(LOCALES.map((l) => [l, absolute(localePath(l, path))])),
      "x-default": absolute(localePath("th", path)),
    };
    return LOCALES.map((lang) => ({
      url: absolute(localePath(lang, path)),
      alternates: { languages },
    }));
  });
}
