import { expect, test, type Page } from "@playwright/test";
import { houseHref, masterPlanHref, registerHref } from "../src/lib/routes";
import {
  CHINESE_ROUTES,
  ENGLISH_ROUTES,
  MAIN_HOUSE_SLUG,
  MAIN_PLOT_ID,
  MAIN_PLOT_NUMBER,
  MAIN_SLUG,
} from "./routes";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* ทุก URL สร้างจาก data + lib/routes.ts (e2e/routes.ts) — ไม่พิมพ์ slug หรือ id แปลงซ้ำในเทสต์ */
const PLAN = masterPlanHref(MAIN_SLUG);
const PLOT_Q = `?plot=${MAIN_PLOT_ID}`;
const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* สามภาษา (src/i18n/config.ts + routing.ts ของ next-intl) — ไทยอยู่ที่ URL เดิม อังกฤษใต้ /en จีนใต้ /zh
   ตรวจ: <html lang>, hreflang, ปุ่มสลับภาษาพา query ไปด้วย, /th redirect, ฟอร์มภาษาอังกฤษส่งได้,
   และหน้า /en /zh ไม่มีตัวอักษรไทยหลุดมาในเนื้อหา นอกจากที่ตั้งใจ (ชื่อภาษา "ไทย" บนปุ่มสลับ และชื่อแบบบ้านภาษาไทย) */

const THAI = /[฀-๿]/;

/** ปุ่มสลับภาษาที่มองเห็นอยู่ (หัวเว็บวาดสองที่ ซ่อนที่หนึ่งตามขนาดจอ) */
const switcher = (page: Page, lang: "th" | "en" | "zh-Hans") =>
  page.locator(`header a[hreflang="${lang}"]:visible`);

test("สลับภาษาไปกลับ คง ?plot= และเปิดแผงแปลงเดิมทั้งสองภาษา", async ({ page }) => {
  await page.goto(`${PLAN}${PLOT_Q}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.locator("#plot-panel-title")).toHaveText(`แปลง ${MAIN_PLOT_NUMBER}`);

  const toEn = switcher(page, "en");
  await expect(toEn).toHaveAttribute("href", `/en${PLAN}${PLOT_Q}`);
  await expect(toEn).toHaveAttribute("lang", "en");
  await toEn.click();
  await expect(page).toHaveURL(new RegExp(`${escape(`/en${PLAN}${PLOT_Q}`)}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#plot-panel-title")).toHaveText(`Plot ${MAIN_PLOT_NUMBER}`);

  const toTh = switcher(page, "th");
  await expect(toTh).toHaveAttribute("href", `${PLAN}${PLOT_Q}`);
  await toTh.click();
  await expect(page).toHaveURL(new RegExp(`${escape(`${PLAN}${PLOT_Q}`)}$`));
  expect(new URL(page.url()).pathname).toBe(PLAN);
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.locator("#plot-panel-title")).toHaveText(`แปลง ${MAIN_PLOT_NUMBER}`);

  const toZh = switcher(page, "zh-Hans");
  await expect(toZh).toHaveAttribute("href", `/zh${PLAN}${PLOT_Q}`);
  await toZh.click();
  await expect(page).toHaveURL(new RegExp(`${escape(`/zh${PLAN}${PLOT_Q}`)}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.locator("#plot-panel-title")).toHaveText(`${MAIN_PLOT_NUMBER}号地块`);
  // ภาษาปัจจุบันไม่เป็นลิงก์ บอกด้วย aria-current
  await expect(page.locator('header [aria-current="true"][lang="zh-Hans"]:visible')).toHaveText(
    "中文",
  );
});

test("ลิงก์ภายในหน้าอังกฤษอยู่ใน /en · คัดลอกลิงก์แปลงได้ลิงก์ภาษาอังกฤษ", async ({ page }) => {
  await page.goto(`/en${houseHref(MAIN_SLUG, MAIN_HOUSE_SLUG)}`);
  const internal = await page
    .locator("main a[href^='/'], header nav a[href^='/']")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(internal.length).toBeGreaterThan(3);
  for (const href of internal) expect(href, href).toMatch(/^\/en(\/|$|\?)/);
  await expect(page.getByRole("link", { name: "Register for this house type" })).toHaveAttribute(
    "href",
    `/en${registerHref({ project: MAIN_SLUG, type: MAIN_HOUSE_SLUG })}`,
  );
});

test("<html lang> และ hreflang ถูกทุกภาษา", async ({ page }) => {
  const OG = { th: "th_TH", en: "en_US", "zh-Hans": "zh_CN" } as const;
  for (const [path, lang, canonical] of [
    ["/gallery", "th", "/gallery"],
    ["/en/gallery", "en", "/en/gallery"],
    ["/zh/gallery", "zh-Hans", "/zh/gallery"],
    ["/", "th", "/"],
    ["/en", "en", "/en"],
    ["/zh", "zh-Hans", "/zh"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    /* Next 15 ส่ง metadata ตามมาทีหลังใน stream — รอให้ canonical มาก่อนค่อยอ่าน */
    const tags = page.locator("link[rel=alternate][hreflang], link[rel=canonical]");
    await expect(page.locator("link[rel=canonical]")).toHaveCount(1);
    const links = await tags.evaluateAll((ls) =>
      ls.map((l) => [
        l.getAttribute("rel"),
        l.getAttribute("hreflang"),
        new URL(l.getAttribute("href") ?? "").pathname,
      ]),
    );
    const th = path.replace(/^\/(en|zh)(?=\/|$)/, "") || "/";
    const en = th === "/" ? "/en" : `/en${th}`;
    const zh = th === "/" ? "/zh" : `/zh${th}`;
    expect(links).toContainEqual(["canonical", null, canonical]);
    expect(links).toContainEqual(["alternate", "th", th]);
    expect(links).toContainEqual(["alternate", "en", en]);
    expect(links).toContainEqual(["alternate", "zh-Hans", zh]);
    expect(links).toContainEqual(["alternate", "x-default", th]);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", OG[lang]);
  }
});

test("/th/... redirect ไป URL ไทยที่ไม่มี prefix พร้อม query", async ({ page }) => {
  await page.goto(`/th${PLAN}${PLOT_Q}`);
  expect(new URL(page.url()).pathname).toBe(PLAN);
  expect(new URL(page.url()).search).toBe(PLOT_Q);
  await page.goto("/th");
  expect(new URL(page.url()).pathname).toBe("/");
});

test("หน้าที่ไม่มีอยู่ใต้ /en ตอบ 404 เป็นภาษาอังกฤษ · หลังบ้านไม่มีฉบับ /en", async ({ page }) => {
  const res = await page.goto("/en/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  expect((await page.goto("/en/admin"))?.status()).toBe(404);
});

test("ฟอร์มลงทะเบียนภาษาอังกฤษ: error เป็นภาษาอังกฤษ และส่งได้", async ({ page }) => {
  await page.goto("/en/register?type=lomyen");
  const submit = page.getByRole("button", { name: "Send to the sales team" });
  await expect(page.getByRole("heading", { name: "You're interested in Lom Yen" })).toBeVisible();

  await submit.click();
  await expect(page.getByText("Enter your full name, at least 2 characters.")).toBeVisible();
  await expect(page.locator('input[name="name"]')).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Can't send yet" })).toContainText(
    "3 fields",
  );

  /* ค่าปลอมที่เห็นชัดว่าไม่ใช่คนจริง */
  await page.fill('input[name="name"]', "Test Person");
  await page.fill('input[name="phone"]', "0800000000");
  await page.locator('input[name="privacyAck"]').check();
  await submit.click();

  const done = page.getByRole("heading", { name: "Thank you, Test Person. We have your details." });
  await expect(done).toBeVisible();
  await expect(done).toBeFocused();
  type SavedLead = { houseTypeSlug: string; locale: string; consent: { marketing: boolean } };
  const saved = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem("grove.leads") ?? "[]") as SavedLead[],
  );
  expect(saved.at(-1)).toMatchObject({
    houseTypeSlug: "lomyen",
    locale: "en",
    consent: { marketing: false },
  });
});

for (const [route, lang] of [
  ...ENGLISH_ROUTES.map((r) => [r, "en"] as const),
  ...CHINESE_ROUTES.map((r) => [r, "zh-Hans"] as const),
]) {
  test(`${route}: ไม่มีข้อความไทยหลุดในหน้า ${lang}`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("h1")).toHaveCount(1);
    /* ตัวอักษรไทยที่ตั้งใจ: element ที่ติด lang="th" (ชื่อแบบบ้านภาษาไทย ปุ่มสลับภาษา) — ตัดออกก่อนตรวจ */
    const leaks = await page.evaluate((pattern) => {
      const re = new RegExp(pattern);
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || el.closest('[lang="th"], script, style, noscript')) continue;
        if (re.test(n.textContent ?? "")) out.push((n.textContent ?? "").trim().slice(0, 80));
      }
      for (const el of document.body.querySelectorAll("[aria-label], [alt], [title]")) {
        if (el.closest('[lang="th"]')) continue;
        for (const a of ["aria-label", "alt", "title"]) {
          const v = el.getAttribute(a);
          if (v && re.test(v)) out.push(`${a}: ${v.slice(0, 80)}`);
        }
      }
      return out;
    }, THAI.source);
    expect(leaks).toEqual([]);
  });
}
