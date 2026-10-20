import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import {
  HTML_LANG,
  LOCALES,
  OG_LOCALE,
  localePath,
  otherLocales,
  type Locale,
} from "@/i18n/config";
import { hasContent } from "@/lib/projects";
import { repo } from "@/lib/repo";

/* ค่ากลางของ metadata ทั้งเว็บ (title, description, OG, sitemap, robots, JSON-LD) อยู่ที่ไฟล์นี้ที่เดียว
   โฟลเดอร์ขึ้นต้นด้วย _ = Next ไม่นับเป็น route
   ทุกฟังก์ชันรับ lang — path ที่ส่งเข้ามาเป็น path ไม่มี prefix ภาษา ("/master-plan") เสมอ */

/** โดเมนจริงของเว็บ — ลิงก์ใน OG / sitemap / canonical / hreflang สร้างจากค่านี้ทั้งหมด
    ลำดับ: NEXT_PUBLIC_SITE_URL → โดเมน production ของ Vercel (VERCEL_PROJECT_PRODUCTION_URL)
    → URL ของ preview (VERCEL_URL) → localhost ตอน dev เท่านั้น
    ยังไม่มีโดเมนของเจ้าของโครงการ (2026-10-02) — ใช้ the-grove-ochre.vercel.app ไปก่อน ได้โดเมนจริงแก้ env ที่เดียว */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
);

/* production บน Vercel ห้ามได้ localhost — OG ที่แชร์ใน LINE จะไม่มีภาพ และ canonical ชี้ไป host ที่เข้าไม่ได้ */
if (process.env.VERCEL_ENV === "production" && SITE_URL.hostname === "localhost") {
  throw new Error("SITE_URL resolved to localhost in a Vercel production build");
}

/** URL เต็มของ path ในเว็บ — JSON-LD กับ sitemap ต้องเป็น absolute URL */
export const absolute = (path: string) => new URL(path, SITE_URL).toString();

/* ค่าสีที่ต้องเขียนเป็นตัวอักษรนอก CSS ได้ทางเดียว (theme-color ของแถบเบราว์เซอร์, manifest)
   ค่าเท่ากับ token §1 ใน globals.css — เว็บมืดชุดเดียว (Dusk Clay) ทั้งสองค่าจึงเท่ากัน — แก้ที่นั่นต้องแก้ที่นี่ด้วย */
export const BROWSER_COLOR = {
  canvas: "#17130F",
  canvasDark: "#17130F",
} as const;

/** ตัวเลขจริงจาก repo ที่ copy ของ metadata ใช้ร่วมกัน — นับจากประกาศของผู้พัฒนา (project.facts)
    ไม่ได้นับจากแปลงในผัง (ผังแปลงยังเป็นตัวอย่าง) */
export function siteFacts(lang: Locale = "th") {
  const site = repo.getSite(lang);
  const houses = repo.listHouseTypes(lang);
  const open = repo.listProjects(lang).filter(hasContent);
  const areas = houses.map((h) => h.areaSqm);
  /* จังหวัดเดียวกันทุกโครงการที่ยืนยันทำเลแล้ว = บอกจังหวัด · ไม่งั้นไม่บอกที่ */
  const provinces = new Set(
    open.flatMap((p) => (p.location && !p.pending.location ? [p.location.province] : [])),
  );
  return {
    /** ชื่อแบรนด์ (title template, siteName, manifest) — ไม่ใช่ชื่อโครงการ */
    name: site.brandName,
    units: open.reduce((n, p) => n + (p.facts?.units ?? 0), 0),
    projects: open.length,
    houseTypes: houses.length,
    areaLow: Math.min(...areas),
    areaHigh: Math.max(...areas),
    place: provinces.size === 1 ? ([...provinces][0] ?? null) : null,
  };
}

/** คำอธิบายหลักของเว็บ — เสียงเจ้าของโครงการ ตัวเลขจาก data ทั้งหมด (§6) */
export function siteDescription(lang: Locale = "th") {
  const f = siteFacts(lang);
  return getDictionary(lang).meta.siteDescription({
    units: f.units,
    projects: f.projects,
    place: f.place,
    types: f.houseTypes,
    areaLow: f.areaLow,
    areaHigh: f.areaHigh,
  });
}

/** ภาพ OG ตั้งต้น = src/app/opengraph-image.png (ผังหมู่บ้านจากภาพนิ่ง 3D · scripts/meta-images.mjs)
    หน้าไหนตั้ง openGraph เอง Next จะไม่สืบภาพของ root ให้ — pageMetadata จึงใส่ภาพนี้แทนทุกครั้งที่หน้าไม่มีภาพของตัวเอง
    ข้อความ alt ภาษาไทยตรงกับ opengraph-image.alt.txt ที่สคริปต์เขียน */
export function defaultOgImage(lang: Locale = "th") {
  const site = repo.getSite(lang);
  /* ภาพตั้งต้นถ่ายจากหมู่บ้านของโครงการแรกที่มีผัง (scripts/meta-images.mjs เลือกแบบเดียวกัน) */
  const showcase = repo.listProjects(lang).find((p) => hasContent(p) && p.plan);
  const plots = showcase ? repo.listPlots(showcase.id).length : 0;
  return {
    url: "/opengraph-image.png",
    width: 1200,
    height: 630,
    alt: getDictionary(lang).meta.ogImageAlt(
      showcase?.name ?? site.brandName,
      site.brandName,
      plots,
    ),
  };
}

/** canonical + hreflang ของ path หนึ่ง — ทุกภาษาชี้หากันเสมอ · x-default = ไทย (URL ไม่มี prefix) */
export function languageAlternates(
  path: string,
  lang: Locale,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localePath(lang, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], localePath(l, path)])),
      "x-default": localePath("th", path),
    },
  };
}

/** metadata ของหน้าเนื้อหา: title (ต่อท้ายชื่อแบรนด์ด้วย template ของ [lang]/layout), description,
    canonical + hreflang และ OG ชุดเต็ม — openGraph ของหน้าลูกทับของ layout ทั้งก้อน จึงต้องใส่ siteName/locale ซ้ำทุกครั้ง */
export function pageMetadata({
  lang,
  title,
  description,
  path,
  image,
  ogTitle,
}: {
  lang: Locale;
  title: string;
  description: string;
  /** path ไม่มี prefix ภาษา */
  path: string;
  image?: { url: string; alt: string; width?: number; height?: number };
  /** หัวข้อ OG ถ้าต่างจาก "title · ชื่อแบรนด์" */
  ogTitle?: string;
}): Metadata {
  const name = repo.getSite(lang).brandName;
  return {
    title,
    description,
    alternates: languageAlternates(path, lang),
    openGraph: {
      type: "website",
      locale: OG_LOCALE[lang],
      alternateLocale: otherLocales(lang).map((l) => OG_LOCALE[l]),
      siteName: name,
      title: ogTitle ?? `${title} · ${name}`,
      description,
      url: localePath(lang, path),
      images: [image ?? defaultOgImage(lang)],
    },
  };
}
