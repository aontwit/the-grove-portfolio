import plots from "../data/plots.json";
import projects from "../data/projects.json";

/* URL เก่าสมัยเว็บมีโครงการเดียว — ทุกตัวส่ง 308 ไปหน้าเดียวกันของโครงการลำดับแรก (เดอะ โกรฟ @ริมสวน)
   1. สมัยเว็บมีโครงการเดียว: /master-plan /house-types /house-types/{แบบ} /location
   2. สมัยมีโครงการตัวอย่าง: /projects/the-grove/...
   ทั้งไทย (ไม่มี prefix) และ /en · next.config.ts สร้างกฎ redirect จากไฟล์นี้
   ?plot= ที่เป็นแปลงของโครงการปลายทางคงไว้ (Next ส่ง query ต่อให้เอง)
   ?plot= ที่ไม่มีอยู่จริงในโครงการปลายทาง (เช่นแปลงของผังตัวอย่างเดิม) redirect ของ next.config ตัด query ทิ้งไม่ได้
   middleware จึงรับช่วงนั้น (legacyPlanTarget) แล้วส่งไปผังโครงการแบบไม่มี ?plot=
   ไฟล์นี้ไม่มี "use client" และไม่ import alias "@/…" — next.config.ts โหลดไฟล์นี้ตรงๆ */

/** slug โครงการปลายทางของ URL เก่า */
export const LEGACY_TARGET_SLUG = "rim-suan";

/** slug ของโครงการตัวอย่างที่เอาออกไปแล้ว */
export const LEGACY_PROJECT_SLUGS = ["the-grove"] as const;

/** แบบบ้านตัวอย่างเดิม → แบบบ้านของโครงการปลายทาง · ชื่อเดิมยังอยู่ (ใบบัว ลมเย็น ร่มไม้) กฎ keepTypes ส่งต่อเอง */
export const LEGACY_HOUSE_SLUGS: Record<string, string> = {};

const target = projects.find((p) => p.slug === LEGACY_TARGET_SLUG);
if (!target) throw new Error(`legacy: ไม่พบโครงการ "${LEGACY_TARGET_SLUG}" ใน projects.json`);

/** id แปลงทั้งหมดของโครงการปลายทาง — ?plot= ที่ตรงตัวใดตัวหนึ่งคงไว้ตอน redirect */
export const LEGACY_TARGET_PLOT_IDS: readonly string[] = plots
  .filter((p) => p.projectId === target.id)
  .map((p) => p.id);

/** prefix ของ URL เก่า (ไม่รวมภาษา) — "" = สมัยโครงการเดียว */
export const LEGACY_BASES = ["", ...LEGACY_PROJECT_SLUGS.map((s) => `/projects/${s}`)];

const LANGS = ["", "/en"] as const;

/** path ผังโครงการเก่าทุกแบบ เช่น /master-plan, /en/projects/the-grove/master-plan */
const LEGACY_PLAN_PATHS = new Set(
  LANGS.flatMap((lang) => LEGACY_BASES.map((base) => `${lang}${base}/master-plan`)),
);

/** ผังโครงการเก่าที่ยังมี ?plot= เหลือถึง middleware (= แปลงที่ไม่มีในโครงการปลายทาง)
    คืน path ปลายทางที่ไม่มี query · null = ไม่ใช่ URL เก่า */
export function legacyPlanTarget(pathname: string): string | null {
  if (!LEGACY_PLAN_PATHS.has(pathname)) return null;
  const lang = pathname.startsWith("/en/") ? "/en" : "";
  return `${lang}/projects/${LEGACY_TARGET_SLUG}/master-plan`;
}

type Redirect = {
  source: string;
  destination: string;
  permanent: true;
  has?: { type: "query"; key: string; value?: string }[];
  missing?: { type: "query"; key: string; value?: string }[];
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** กฎ redirect ของ next.config.ts — เรียงจากเจาะจงไปกว้าง (Next ใช้กฎแรกที่ตรง) */
export function legacyRedirects(currentHouseSlugs: readonly string[]): Redirect[] {
  const plotIds = `^(${LEGACY_TARGET_PLOT_IDS.map(escape).join("|")})$`;
  const keepTypes = currentHouseSlugs.map(escape).join("|");
  return LANGS.flatMap((lang) => {
    const to = (sub = "") => `${lang}/projects/${LEGACY_TARGET_SLUG}${sub}`;
    return LEGACY_BASES.flatMap((base): Redirect[] => {
      const from = (sub: string) => `${lang}${base}${sub}`;
      return [
        ...(base ? [{ source: from(""), destination: to(), permanent: true as const }] : []),
        /* ผังโครงการ: ไม่มี ?plot= หรือ ?plot= เป็นแปลงที่มีอยู่จริง · ที่เหลือ middleware รับ */
        {
          source: from("/master-plan"),
          destination: to("/master-plan"),
          permanent: true,
          missing: [{ type: "query", key: "plot" }],
        },
        {
          source: from("/master-plan"),
          destination: to("/master-plan"),
          permanent: true,
          has: [{ type: "query", key: "plot", value: plotIds }],
        },
        { source: from("/house-types"), destination: to("/house-types"), permanent: true },
        ...Object.entries(LEGACY_HOUSE_SLUGS).map(([old, now]) => ({
          source: from(`/house-types/${old}`),
          destination: to(`/house-types/${now}`),
          permanent: true as const,
        })),
        ...(keepTypes
          ? [
              {
                source: from(`/house-types/:type(${keepTypes})`),
                destination: to("/house-types/:type"),
                permanent: true as const,
              },
            ]
          : []),
        /* แบบบ้านที่ไม่มีคู่ในโครงการปลายทาง → หน้ารวมแบบบ้าน */
        { source: from("/house-types/:type"), destination: to("/house-types"), permanent: true },
        { source: from("/location"), destination: to("/location"), permanent: true },
      ];
    });
  });
}
