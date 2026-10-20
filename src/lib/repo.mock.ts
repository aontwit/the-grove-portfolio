import galleryJson from "@/data/gallery.json";
import houseTypesJson from "@/data/house-types.json";
import plotsJson from "@/data/plots.json";
import projectsJson from "@/data/projects.json";
import rendersJson from "@/data/renders.json";
import siteJson from "@/data/site.json";
import { LOCALES, type Locale } from "@/i18n/config";
import {
  galleryFileSchema,
  houseTypesFileSchema,
  plotsFileSchema,
  projectLinkIssues,
  projectsFileSchema,
  rendersFileSchema,
  siteSettingsSchema,
} from "./schemas";
import { localizeGalleryImage, localizeHouse, localizeRender, localizeSite } from "./localize";
import { localizeProject } from "./projects";
import type { Repo } from "./repo";

/* zod ตรวจ data ตอน import — พังตั้งแต่ build ถ้าไฟล์ใน src/data ผิด (รวมถึงขาดคู่ภาษาอังกฤษ) */
const houseTypes = houseTypesFileSchema.parse(houseTypesJson);
const plots = plotsFileSchema.parse(plotsJson);
const gallery = galleryFileSchema.parse(galleryJson);
const site = siteSettingsSchema.parse(siteJson);
const renders = rendersFileSchema.parse(rendersJson);
const projects = projectsFileSchema.parse(projectsJson).sort((a, b) => a.slot - b.slot);

/* แปลง/แบบบ้านต้องอ้างโครงการที่มีจริง — ตัวตรวจเดียวกับ geometry:check */
const linkIssues = projectLinkIssues(projects, houseTypes, plots);
if (linkIssues.length > 0) {
  throw new Error(`projects.json ไม่ตรงกับแปลง/แบบบ้าน:\n${linkIssues.join("\n")}`);
}

/* แปลภาษาครั้งเดียวตอนโหลด — ทุกการเรียกได้ object ชุดเดิม (เทียบ === ได้ เหมือนก่อนมีหลายภาษา) */
function perLocale<T>(make: (lang: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(LOCALES.map((l) => [l, make(l)])) as Record<Locale, T>;
}
const HOUSES = perLocale((l) => houseTypes.map((h) => localizeHouse(h, l)));
const GALLERY = perLocale((l) => gallery.map((g) => localizeGalleryImage(g, l)));
const RENDERS = perLocale((l) => renders.map((r) => localizeRender(r, l)));
const SITE = perLocale((l) => localizeSite(site, l));
const PROJECTS = perLocale((l) => projects.map((p) => localizeProject(p, l)));

/* กรองครั้งเดียว — ทุกการเรียกได้ array ชุดเดิม (useLivePlots ใช้เป็น dependency ของ useMemo) */
const PLOTS_BY_PROJECT = new Map(
  projects.map((p) => [p.id, plots.filter((x) => x.projectId === p.id)] as const),
);
const HOUSES_BY_PROJECT = perLocale(
  (l) =>
    new Map(projects.map((p) => [p.id, HOUSES[l].filter((h) => h.projectId === p.id)] as const)),
);

export const mockRepo: Repo = {
  listProjects: (lang = "th") => PROJECTS[lang],
  getProject: (slug, lang = "th") => PROJECTS[lang].find((p) => p.slug === slug),
  getProjectById: (id, lang = "th") => PROJECTS[lang].find((p) => p.id === id),
  listHouseTypes: (lang = "th", projectId) =>
    projectId ? (HOUSES_BY_PROJECT[lang].get(projectId) ?? []) : HOUSES[lang],
  getHouseType: (slug, lang = "th") => HOUSES[lang].find((h) => h.slug === slug),
  listPlots: (projectId) => (projectId ? (PLOTS_BY_PROJECT.get(projectId) ?? []) : plots),
  getPlot: (id) => plots.find((p) => p.id === id),
  listGallery: (lang = "th") => GALLERY[lang],
  listRenders: (lang = "th") => RENDERS[lang],
  getSite: (lang = "th") => SITE[lang],
};
