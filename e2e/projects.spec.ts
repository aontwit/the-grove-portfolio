import { expect, test } from "@playwright/test";
import projects from "../src/data/projects.json";
import {
  PROJECTS_PATH,
  houseHref,
  masterPlanHref,
  plotHref,
  projectHref,
  registerHref,
} from "../src/lib/routes";
import { LEGACY_REDIRECTS, MAIN_PLOT_ID, MAIN_SLUG, PENDING_SLUG, toEnglish } from "./routes";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* หลายโครงการ (src/data/projects.json) — รายการโครงการ หน้าโครงการจริง หน้าโครงการที่รอข้อมูล
   URL เก่า (สมัยโครงการเดียว และโครงการตัวอย่าง the-grove) redirect 308 ไปโครงการจริงลำดับแรก
   ฟอร์มลงทะเบียนรับ ?project= · ส่วนที่ยังเป็นตัวอย่าง (แปลนบ้าน ผังแปลง) ติดป้ายตัวอย่าง */

const LIVE = projects.filter((p) => p.status === "live");
const PENDING = projects.filter((p) => p.status === "pending");
const PENDING_PROJECT = projects.find((p) => p.slug === PENDING_SLUG);
const PRICE = /ล้านบาท|บาท|THB|million/;

test("/projects แสดงครบทุกโครงการ · โครงการจริงมีตัวเลขตามประกาศ · โครงการที่รอข้อมูลไม่มีชื่อหรือราคาแต่งขึ้น", async ({
  page,
}) => {
  const res = await page.goto(PROJECTS_PATH);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("โครงการ");

  for (const p of LIVE) {
    const name = p.name ?? "";
    const card = page.locator("article").filter({ hasText: name });
    await expect(card).toContainText(`${p.facts?.units} ยูนิต`);
    await expect(card).toContainText(`${p.facts?.landRai} ไร่`);
    /* ภาพนิ่งหมู่บ้านอยู่บนผังแปลงตัวอย่าง — ติดป้าย */
    await expect(card).toContainText("ผังแปลงตัวอย่าง รอผังจริง");
    await expect(card).not.toContainText("ข้อมูลตัวอย่าง");
    await expect(card.getByRole("link", { name: `ดูโครงการ ${name}` })).toHaveAttribute(
      "href",
      projectHref(p.slug),
    );
  }
  await expect(page.locator("main")).toContainText("3.19–3.59 ล้านบาท*");
  await expect(page.locator("main")).toContainText("2.79–3.39 ล้านบาท*");

  // โครงการที่รอข้อมูล: ป้ายกลาง "โครงการที่ n" เท่านั้น ติดป้ายรอข้อมูลจริง ไม่มีราคา
  for (const p of PENDING) {
    const row = page.locator("li").filter({
      has: page.getByRole("link", { name: `โครงการที่ ${p.slot}`, exact: true }),
    });
    await expect(row).toContainText("รอข้อมูลจริง");
    await expect(row).not.toContainText(PRICE);
    await expect(row.getByRole("link", { name: "ลงทะเบียนรับข่าวโครงการนี้" })).toHaveAttribute(
      "href",
      registerHref({ project: p.slug }),
    );
  }

  // หัวเว็บมีเมนู "โครงการ" และบอกว่าอยู่หน้านี้
  await expect(
    page.locator("header nav").getByRole("link", { name: "โครงการ", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

/* ปลายฉากเปิดหน้าแรกคือตัวเลือกโครงการจริง — โครงการที่รอข้อมูลเหลือบรรทัดเดียวกับลิงก์ลงทะเบียนลิงก์เดียว
   (รายการเต็มทุกโครงการอยู่ที่ /projects) */
test("หน้าแรก: ตัวเลือกโครงการมีโครงการจริงครบ และโครงการที่รอข้อมูลเหลือบรรทัดเดียว", async ({
  page,
}) => {
  await page.goto("/");
  const chooser = page.locator("#projects");
  await expect(chooser.getByRole("heading", { name: "เลือกโครงการ", level: 2 })).toBeVisible();
  for (const p of LIVE) {
    await expect(chooser.getByRole("heading", { name: p.name ?? "", level: 3 })).toBeVisible();
    await expect(chooser.getByRole("link", { name: `ดูโครงการ ${p.name}` })).toBeVisible();
    await expect(chooser).toContainText(`${p.facts?.units} ยูนิต`);
  }
  await expect(chooser).toContainText(`อีก ${PENDING.length} โครงการกำลังรวบรวมข้อมูล`);
  await expect(chooser.getByRole("link", { name: "ลงทะเบียนรับข่าวโครงการใหม่" })).toHaveCount(1);
  // ผังแปลงตัวอย่างไม่อยู่บนหน้าแรกแล้ว — อยู่ที่หน้าผังของแต่ละโครงการ
  await expect(page.getByRole("heading", { name: "ยังเหลือแปลงไหนบ้าง" })).toHaveCount(0);
});

test("หน้าโครงการที่รอข้อมูล: บอกสถานะตามจริง noindex และหน้าย่อยไม่มี", async ({ page }) => {
  const res = await page.goto(projectHref(PENDING_SLUG));
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText(`โครงการที่ ${PENDING_PROJECT?.slot}`);
  await expect(page.locator("main")).toContainText("รอข้อมูลจริง");
  await expect(page.locator("main")).not.toContainText(PRICE);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: "ลงทะเบียนรับข่าวโครงการนี้" })).toHaveAttribute(
    "href",
    registerHref({ project: PENDING_SLUG }),
  );

  // ภาษาอังกฤษใช้ป้ายกลางภาษาอังกฤษ
  await page.goto(toEnglish(projectHref(PENDING_SLUG)));
  await expect(page.locator("h1")).toHaveText(`Project ${PENDING_PROJECT?.slot}`);
  await expect(page.locator("main")).toContainText("Awaiting confirmed details");

  // ยังไม่มีผัง → หน้าผังของโครงการนี้ไม่มี (ไม่พาไปผังของโครงการอื่น)
  // dev ตอบเป็น not-found ที่ stream มาใต้ loading (status 200) · production (dynamicParams=false) ตอบ 404 จริง
  await page.goto(masterPlanHref(PENDING_SLUG));
  await expect(page.locator("h1")).toHaveText("ไม่มีหน้านี้ในเว็บ");
});

test("หน้าโครงการจริง: index ได้ ตัวเลขตามประกาศ ติดป้ายแปลน/ผังตัวอย่าง ลิงก์ทุกตัวอยู่ใต้โครงการ", async ({
  page,
}) => {
  const res = await page.goto(projectHref(MAIN_SLUG));
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("เดอะ โกรฟ @ริมสวน");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const main = page.locator("main");
  await expect(main).toContainText("18 ยูนิต");
  await expect(main).toContainText("พ.ศ. 2568");
  await expect(main).toContainText("แปลนตัวอย่าง รอแปลนจริงจากผู้พัฒนา");
  await expect(main).toContainText("ผังแปลงตัวอย่าง รอผังจริง");
  await expect(main).toContainText("ผู้พัฒนาระบุ");
  await expect(main).toContainText("โครงการสมมติของงานพอร์ต");

  /* JSON-LD: RealEstateListing + AggregateOffer ช่วงราคาจริงตามประกาศ */
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((s) => s.map((x) => JSON.parse(x.textContent ?? "{}") as Record<string, unknown>));
  const listing = ld.find((x) => x["@type"] === "RealEstateListing");
  expect(listing).toMatchObject({
    name: "เดอะ โกรฟ @ริมสวน",
    offers: { "@type": "AggregateOffer", lowPrice: 3190000, highPrice: 3590000, offerCount: 18 },
  });

  await expect(page.getByRole("link", { name: "เปิดผังโครงการ" }).first()).toHaveAttribute(
    "href",
    masterPlanHref(MAIN_SLUG),
  );
  await expect(page.getByRole("link", { name: "ลงทะเบียนรับข้อมูลโครงการนี้" })).toHaveAttribute(
    "href",
    registerHref({ project: MAIN_SLUG }),
  );

  // ไม่มีลิงก์ไหนชี้ไป URL เก่าที่ต้อง redirect อีกทอด
  const hrefs = await page
    .locator("main a[href^='/']")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  for (const href of hrefs) expect(href, href).not.toMatch(/^\/(master-plan|house-types|location)/);
});

test("หน้าแบบบ้านจริง: ตัวเลขตามประกาศ · ตารางห้องติดป้ายแปลนตัวอย่าง · Offer ราคาเริ่มต้นจริง", async ({
  page,
}) => {
  await page.goto(houseHref(MAIN_SLUG, "rommai"));
  const main = page.locator("main");
  await expect(main).toContainText("155 ตร.ม.");
  await expect(main).toContainText("59.5 ตร.ว.");
  await expect(main).toContainText("เริ่มต้น 3.59 ล้านบาท*");
  await expect(main).toContainText("ห้องในแปลนตัวอย่าง");
  await expect(main).toContainText("พื้นที่ใช้สอยที่ผู้พัฒนาประกาศคือ 155 ตร.ม.");
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((s) => s.map((x) => JSON.parse(x.textContent ?? "{}") as Record<string, unknown>));
  expect(ld.find((x) => x["@type"] === "RealEstateListing")).toMatchObject({
    offers: { "@type": "Offer", price: 3590000, priceCurrency: "THB" },
  });

  // แบบที่ผู้พัฒนาแจ้งว่าขายหมด
  await page.goto(houseHref("noen-phai", "noen-phai-3-bed"));
  await expect(page.locator("main")).toContainText("ขายหมดแล้ว");
});

test("ลิงก์รายแปลงตั้ง noindex (ผังแปลงยังเป็นตัวอย่าง) แต่หน้าผังทั้งโครงการ index ได้", async ({
  page,
}) => {
  await page.goto(plotHref(MAIN_SLUG, MAIN_PLOT_ID));
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(masterPlanHref(MAIN_SLUG));
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("แผงแปลงคัดลอกลิงก์แปลงเป็น URL ใต้โครงการ", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(plotHref(MAIN_SLUG, MAIN_PLOT_ID));
  await page.getByRole("button", { name: "คัดลอกลิงก์แปลงนี้" }).first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(copied).pathname + new URL(copied).search).toBe(plotHref(MAIN_SLUG, MAIN_PLOT_ID));
});

for (const [from, to] of LEGACY_REDIRECTS) {
  for (const [src, dst] of [
    [from, to],
    [toEnglish(from), toEnglish(to)],
  ] as const) {
    test(`URL เก่า ${src} → 308 ${dst}`, async ({ request }) => {
      const res = await request.get(src, { maxRedirects: 0 });
      expect(res.status()).toBe(308);
      const location = new URL(res.headers().location ?? "", "http://x");
      expect(location.pathname + location.search).toBe(dst);
    });
  }
}

test("URL เก่าที่มี ?plot= ของโครงการปลายทางเปิดแผงแปลงเดิมหลัง redirect", async ({ page }) => {
  await page.goto(`/master-plan?plot=${MAIN_PLOT_ID}`);
  expect(new URL(page.url()).pathname).toBe(masterPlanHref(MAIN_SLUG));
  expect(new URL(page.url()).search).toBe(`?plot=${MAIN_PLOT_ID}`);
  await expect(page.locator("#plot-panel-title")).toBeVisible();
});

test("ลงทะเบียน ?project= เลือกโครงการไว้ให้ · โครงการที่รอข้อมูลไม่มีช่องแปลง · lead เก็บ projectId", async ({
  page,
}) => {
  await page.goto(registerHref({ project: PENDING_SLUG }));
  const select = page.locator('select[name="project"]');
  await expect(select).toHaveValue(PENDING_PROJECT?.id ?? "");
  await expect(page.locator('select[name="plot"]')).toHaveCount(0);
  await expect(page.getByText("ทีมขายจะโทรกลับเมื่อข้อมูลพร้อม").first()).toBeVisible();

  await page.fill('input[name="name"]', "ทดสอบ รอโครงการ");
  await page.fill('input[name="phone"]', "0800000000");
  await page.locator('input[name="privacyAck"]').check();
  await page.getByRole("button", { name: "ส่งข้อมูลให้ทีมขาย" }).click();
  await expect(page.getByRole("heading", { name: /ได้รับข้อมูลแล้ว/ })).toBeVisible();
  const saved = await page.evaluate(
    () =>
      JSON.parse(window.localStorage.getItem("grove.leads") ?? "[]") as {
        projectId: string;
        plotId: string;
      }[],
  );
  expect(saved.at(-1)).toMatchObject({ projectId: PENDING_PROJECT?.id, plotId: "" });

  // โครงการจริง → ช่องแบบบ้าน แปลง และงบ มาจากแบบและราคาจริงของโครงการนั้น
  await page.goto(registerHref({ project: MAIN_SLUG }));
  await expect(page.locator('select[name="project"]')).toHaveValue("project-1");
  const houseOptions = await page.locator('select[name="house"] option').allTextContents();
  expect(houseOptions.slice(1).map((o) => o.split(" · ")[0])).toEqual([
    "ใบบัว",
    "ลมเย็น",
    "ร่มไม้",
  ]);
  await expect(page.locator('select[name="plot"] option')).toHaveCount(19);
  const budgets = await page.locator('select[name="budget"] option').allTextContents();
  /* ช่วงงบมาจากราคาเริ่มต้นของแบบ (3.19–3.59 ล้าน) — ตัดจำนวนแปลงท้ายตัวเลือกออกก่อนเทียบ */
  expect(budgets.slice(1).map((b) => b.split(" · ")[0])).toEqual(["3–4 ล้านบาท"]);

  // เนินไผ่: แบบ 3 นอนขายหมด — แปลงของแบบนั้นไม่อยู่ในรายการ
  await page.locator('select[name="project"]').selectOption("project-2");
  await expect(page.locator('select[name="house"]')).toContainText("ชั้นเดียว 3 นอน · ขายหมดแล้ว");
  await expect(page.locator('select[name="plot"] option')).toHaveCount(6);

  await page.locator('select[name="project"]').selectOption("project-3");
  await expect(page.locator('select[name="plot"]')).toHaveCount(0);
});

test("sitemap มีหน้าโครงการจริง ไม่มีโครงการที่รอข้อมูลและไม่มีลิงก์รายแปลง", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/projects</loc>");
  expect(xml).toContain(`/projects/${MAIN_SLUG}</loc>`);
  expect(xml).toContain(`/projects/${MAIN_SLUG}/master-plan</loc>`);
  expect(xml).not.toContain(`/projects/${PENDING_SLUG}`);
  expect(xml).not.toContain("?plot=");
  expect(xml).not.toContain("the-grove");
  /* URL เก่าสมัยโครงการเดียว (/master-plan ฯลฯ ที่โดเมนตรง) เป็น 308 จึงไม่อยู่ใน sitemap */
  expect(xml).not.toMatch(
    /<loc>https?:\/\/[^/<]+(\/en)?\/(master-plan|house-types|location)<\/loc>/,
  );
});
