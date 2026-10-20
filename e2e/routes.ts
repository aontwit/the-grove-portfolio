import houseTypes from "../src/data/house-types.json";
import plots from "../src/data/plots.json";
import projects from "../src/data/projects.json";
import { LEGACY_HOUSE_SLUGS, LEGACY_TARGET_SLUG } from "../src/lib/legacy";
import {
  PROJECTS_PATH,
  houseHref,
  houseTypesHref,
  locationHref,
  masterPlanHref,
  plotHref,
  projectHref,
} from "../src/lib/routes";

/* route สาธารณะทั้งหมด — slug โครงการ แบบบ้าน และ id แปลงอ่านจาก data ชุดเดียวกับที่เว็บใช้ ไม่พิมพ์ซ้ำ
   URL สร้างด้วย lib/routes.ts ตัวเดียวกับเว็บ · เพิ่มโครงการหรือแบบบ้านใน data แล้ว a11y gate ครอบหน้าใหม่ให้เอง
   ทุกหน้ามีสองภาษา: ไทยที่ URL เดิม อังกฤษใต้ /en (src/i18n/config.ts) */

/** โครงการจริงที่มีข้อมูล (status "live") เรียงตาม slot */
const live = projects.filter((p) => p.status === "live").sort((a, b) => a.slot - b.slot);
if (live.length === 0) throw new Error("projects.json ไม่มีโครงการ status live");

/** โครงการแรก = ปลายทางของ URL เก่า (lib/legacy.ts) */
const main = live.find((p) => p.slug === LEGACY_TARGET_SLUG);
if (!main) throw new Error(`ไม่พบโครงการปลายทางของ URL เก่า "${LEGACY_TARGET_SLUG}"`);
export const MAIN_SLUG: string = main.slug;

/** โครงการที่ยังรอข้อมูลจริง (ตัวแรก) */
const waiting = projects.find((p) => p.status === "pending");
if (!waiting) throw new Error("projects.json ไม่มีโครงการ status pending ให้ทดสอบหน้ารอข้อมูล");
export const PENDING_SLUG: string = waiting.slug;

const housesOf = (projectId: string) => houseTypes.filter((h) => h.projectId === projectId);
const firstPlot = plots.find((p) => p.projectId === main.id);
if (!firstPlot) throw new Error("โครงการหลักไม่มีแปลง — ไม่มีแปลงให้เปิด ?plot=");
export const MAIN_PLOT_ID: string = firstPlot.id;
export const MAIN_PLOT_NUMBER: string = firstPlot.number;

/** แบบบ้านแรกของโครงการหลัก (ใช้ทดสอบ ?type= และหน้าแบบบ้าน) */
const mainHouse = housesOf(main.id)[0];
if (!mainHouse) throw new Error("โครงการหลักไม่มีแบบบ้าน");
export const MAIN_HOUSE_SLUG: string = mainHouse.slug;

export const THAI_ROUTES: readonly string[] = [
  "/",
  PROJECTS_PATH,
  ...projects.map((p) => projectHref(p.slug)),
  ...live.flatMap((p) => [
    houseTypesHref(p.slug),
    ...housesOf(p.id).map((h) => houseHref(p.slug, h.slug)),
    masterPlanHref(p.slug),
    locationHref(p.slug),
  ]),
  plotHref(main.slug, firstPlot.id),
  "/gallery",
  "/register",
  "/privacy",
  "/terms",
];

/** "/" → "/en" · "/gallery" → "/en/gallery" */
export const toEnglish = (route: string) => (route === "/" ? "/en" : `/en${route}`);

export const ENGLISH_ROUTES: readonly string[] = THAI_ROUTES.map(toEnglish);

/** "/" → "/zh" · "/gallery" → "/zh/gallery" */
export const toChinese = (route: string) => (route === "/" ? "/zh" : `/zh${route}`);

export const CHINESE_ROUTES: readonly string[] = THAI_ROUTES.map(toChinese);

export const PUBLIC_ROUTES: readonly string[] = [
  ...THAI_ROUTES,
  ...ENGLISH_ROUTES,
  ...CHINESE_ROUTES,
];

export const HOUSE_SLUGS: readonly string[] = houseTypes.map((h) => h.slug);

/** URL เก่า → URL ใหม่ใต้โครงการหลัก — 308 (next.config.ts + middleware ผ่าน lib/legacy.ts)
    ?plot= ที่เป็นแปลงของโครงการหลักคงไว้ · ?plot= ของผังตัวอย่างเดิม (ไม่มีแล้ว) ตัดทิ้ง */
export const LEGACY_REDIRECTS: readonly (readonly [string, string])[] = [
  ["/master-plan", masterPlanHref(main.slug)],
  [`/master-plan?plot=${firstPlot.id}`, plotHref(main.slug, firstPlot.id)],
  ["/master-plan?plot=plot-a-07", masterPlanHref(main.slug)],
  ["/house-types", houseTypesHref(main.slug)],
  ...Object.entries(LEGACY_HOUSE_SLUGS).map(
    ([old, now]) => [`/house-types/${old}`, houseHref(main.slug, now)] as const,
  ),
  ["/location", locationHref(main.slug)],
  ["/projects/the-grove", projectHref(main.slug)],
  ["/projects/the-grove/master-plan?plot=plot-b-01", masterPlanHref(main.slug)],
  [`/projects/the-grove/master-plan?plot=${firstPlot.id}`, plotHref(main.slug, firstPlot.id)],
  ["/projects/the-grove/house-types/baibua", houseHref(main.slug, "baibua")],
  ["/projects/the-grove/location", locationHref(main.slug)],
];
