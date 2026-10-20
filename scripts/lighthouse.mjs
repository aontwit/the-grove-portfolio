/* Lighthouse mobile ของทุกหน้าหลัก → docs/qa/lighthouse/*.json + docs/qa/lighthouse.md
   ไม่มี dependency ใหม่: เรียก Lighthouse ผ่าน `pnpm dlx` (เวอร์ชันล็อกไว้ด้านล่าง) และใช้ Chromium ของ Playwright

   วัดกับ production server เท่านั้น — dev server ไม่ minify, มี HMR, compile ตอนเปิดหน้า ค่าที่ได้ไม่มีความหมาย
     1. ปิด dev server ก่อน (next build กับ next dev เขียน .next ที่เดียวกัน)
     2. pnpm build
     3. pnpm start --port 3100          (อีกหน้าต่าง)
     4. pnpm lighthouse

   ตัวแปร: LH_BASE_URL (ค่าเริ่ม http://localhost:3100) · LH_RUNS (รอบต่อหน้า ค่าเริ่ม 3 เลือกรอบที่ Perf เป็นค่ากลาง)
           LH_ROUTES ("/,/register" วัดเฉพาะบางหน้า) · CHROME_PATH (ค่าเริ่ม = Chromium ของ Playwright)
   exit 1 เมื่อมีหน้าที่ต่ำกว่าเป้า (Perf ≥85 · A11y ≥95 ตาม docs/qa-s9.md) — ไฟล์ผลยังเขียนครบ */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const LIGHTHOUSE = "lighthouse@13.5.0";
const BASE = (process.env.LH_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3) || 3);
const TARGET = { performance: 85, accessibility: 95 };
const OUT_DIR = "docs/qa/lighthouse";
const SUMMARY = "docs/qa/lighthouse.md";

const houseTypes = JSON.parse(
  readFileSync(new URL("../src/data/house-types.json", import.meta.url), "utf8"),
);
const plots = JSON.parse(readFileSync(new URL("../src/data/plots.json", import.meta.url), "utf8"));
const projects = JSON.parse(
  readFileSync(new URL("../src/data/projects.json", import.meta.url), "utf8"),
);
/* หน้าโครงการวัดจากโครงการแรกที่มีข้อมูล (ตอนนี้คือชุดตัวอย่าง) + หน้าโครงการที่รอข้อมูลหนึ่งหน้า */
const shown = projects.find((p) => p.status !== "pending");
const waiting = projects.find((p) => p.status === "pending");
const base = shown ? `/projects/${shown.slug}` : null;
const ROUTES = process.env.LH_ROUTES
  ? process.env.LH_ROUTES.split(",").map((r) => r.trim())
  : [
      "/",
      "/projects",
      ...(base
        ? [
            base,
            `${base}/house-types`,
            ...houseTypes
              .filter((h) => h.projectId === shown.id)
              .map((h) => `${base}/house-types/${h.slug}`),
            `${base}/master-plan`,
            `${base}/master-plan?plot=${plots.find((p) => p.projectId === shown.id)?.id ?? ""}`,
            `${base}/location`,
          ]
        : []),
      ...(waiting ? [`/projects/${waiting.slug}`] : []),
      "/gallery",
      "/register",
      "/privacy",
      "/terms",
    ];

/* กันวัดผิดเครื่อง: หน้าแรกต้องเปิดได้ และ /render/<slug> (มีเฉพาะ dev) ต้องเป็น 404 */
async function assertProduction() {
  let home;
  try {
    home = await fetch(`${BASE}/`);
  } catch {
    throw new Error(
      `เปิด ${BASE} ไม่ได้ — รัน \`pnpm build\` แล้ว \`pnpm start --port 3100\` ก่อน`,
    );
  }
  if (!home.ok) throw new Error(`${BASE}/ ตอบ ${home.status}`);
  const devOnly = await fetch(`${BASE}/render/${houseTypes[0].slug}`);
  if (devOnly.status !== 404) {
    throw new Error(
      `${BASE} เป็น dev server (/render ตอบ ${devOnly.status}) — Lighthouse ต้องวัดบน next start เท่านั้น`,
    );
  }
}

const slugOf = (route) =>
  route === "/" ? "home" : route.replace(/^\//, "").replace(/[/?=&]+/g, "-");

function runOnce(url, out) {
  const chromeFlags = "--headless=new";
  const args = [
    "dlx",
    LIGHTHOUSE,
    url,
    "--output=json",
    `--output-path=${out}`,
    "--only-categories=performance,accessibility,best-practices,seo",
    `--chrome-flags=${chromeFlags}`,
    "--quiet",
  ];
  const res = spawnSync("pnpm", args, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32",
    env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? chromium.executablePath() },
  });
  if (res.status !== 0) throw new Error(`lighthouse ล้มที่ ${url} (exit ${res.status})`);
  return JSON.parse(readFileSync(out, "utf8"));
}

const score = (lhr, id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
const ms = (lhr, id) => Math.round(lhr.audits[id]?.numericValue ?? NaN);

await assertProduction();
mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  const slug = slugOf(route);
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const tmp = join(OUT_DIR, `${slug}.run${i}.json`);
    console.log(`[${route}] รอบ ${i + 1}/${RUNS}`);
    runs.push({ lhr: runOnce(url, tmp), tmp });
  }
  /* เก็บรอบที่ Perf เป็นค่ากลางไว้เป็นไฟล์หลักของหน้านั้น — รอบอื่นลบทิ้ง */
  runs.sort((a, b) => score(a.lhr, "performance") - score(b.lhr, "performance"));
  const median = runs[Math.floor(runs.length / 2)];
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(median.lhr, null, 2));
  for (const r of runs) rmSync(r.tmp, { force: true });

  const lhr = median.lhr;
  const failedA11y = Object.values(lhr.audits)
    .filter(
      (a) =>
        a.score === 0 &&
        lhr.categories.accessibility?.auditRefs.some((ref) => ref.id === a.id && ref.weight > 0),
    )
    .map((a) => a.id);
  rows.push({
    route,
    slug,
    perf: score(lhr, "performance"),
    a11y: score(lhr, "accessibility"),
    bp: score(lhr, "best-practices"),
    seo: score(lhr, "seo"),
    fcp: ms(lhr, "first-contentful-paint"),
    lcp: ms(lhr, "largest-contentful-paint"),
    tbt: ms(lhr, "total-blocking-time"),
    cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? NaN,
    perfRange: runs.map((r) => score(r.lhr, "performance")),
    failedA11y,
    version: lhr.lighthouseVersion,
    ua: lhr.environment?.hostUserAgent ?? "",
  });
}

const below = rows.filter((r) => r.perf < TARGET.performance || r.a11y < TARGET.accessibility);
const bold = (n, target) => (target !== undefined && n < target ? `**${n}**` : `${n}`);
const today = new Date().toISOString().slice(0, 10);

const md = [
  "# Lighthouse mobile",
  "",
  `วันที่วัด: ${today} · เป้าหมาย: \`${BASE}\` (production — \`pnpm build\` + \`pnpm start --port 3100\`)`,
  `Lighthouse ${rows[0]?.version ?? "?"} · โปรไฟล์ mobile ค่าเริ่มของ Lighthouse (Moto G Power, slow 4G จำลอง) · ${RUNS} รอบต่อหน้า เก็บรอบที่ Perf เป็นค่ากลาง`,
  `เบราว์เซอร์: ${rows[0]?.ua ?? "?"}`,
  "",
  `เป้า: Perf ≥${TARGET.performance} · A11y ≥${TARGET.accessibility} (ตัวหนา = ต่ำกว่าเป้า)`,
  "",
  "| route | Perf (ทุกรอบ) | A11y | Best practices | SEO | FCP ms | LCP ms | TBT ms | CLS |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| \`${r.route}\` | ${bold(r.perf, TARGET.performance)} (${r.perfRange.join(" / ")}) | ${bold(r.a11y, TARGET.accessibility)} | ${r.bp} | ${r.seo} | ${r.fcp} | ${r.lcp} | ${r.tbt} | ${r.cls.toFixed(3)} |`,
  ),
  "",
  "## audit a11y ที่ตก",
  "",
  ...(rows.some((r) => r.failedA11y.length)
    ? rows
        .filter((r) => r.failedA11y.length)
        .map((r) => `- \`${r.route}\`: ${r.failedA11y.map((id) => `\`${id}\``).join(", ")}`)
    : ["ไม่มี"]),
  "",
  `ไฟล์ผลเต็มต่อหน้า: \`${OUT_DIR}/<route>.json\` (เปิดดูได้ที่ https://googlechrome.github.io/lighthouse/viewer/)`,
  "",
];
writeFileSync(SUMMARY, md.join("\n"));
/* ไฟล์ JSON อยู่ใต้ prettier --check ของ `pnpm check` — จัดรูปให้ตรงตั้งแต่ตอนเขียน */
spawnSync("pnpm", ["exec", "prettier", "--write", "--log-level=warn", OUT_DIR], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
console.log(`\nเขียน ${SUMMARY} และ ${OUT_DIR}/*.json แล้ว`);

if (below.length) {
  console.error(`ต่ำกว่าเป้า ${below.length} หน้า: ${below.map((r) => r.route).join(", ")}`);
  process.exit(1);
}
