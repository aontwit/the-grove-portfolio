import { expect, test, type Page } from "@playwright/test";
import renders from "../src/data/renders.json";
import { PROD } from "./env";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* Visual regression — เฉพาะพื้นผิวที่ภาพออกมาเหมือนเดิมทุกครั้ง (ไม่มี WebGL, ไม่มีเวลา, ไม่มี animation)
   ผัง 2D (SVG ล้วน) · footer · ฟอร์มลงทะเบียนตอนว่าง · และภาพนิ่ง /render/<slug> (dev เท่านั้น)

   baseline ยังไม่ได้สร้าง — รอบแรกที่ app นิ่งแล้ว:
     pnpm test:visual:update      (สร้าง/อัปเดต e2e/visual.spec.ts-snapshots/)
     pnpm test:visual             (เทียบกับ baseline)
   baseline ผูกกับ OS + ฟอนต์ + เบราว์เซอร์ของเครื่องที่สร้าง (ชื่อไฟล์มี -win32 / -linux) อย่าเทียบข้ามเครื่อง

   ตั้งค่าร่วม (playwright.config.ts → expect.toHaveScreenshot): animations ปิด · caret ซ่อน · scale css */

test.use({ reducedMotion: "reduce" });

/** badge ของ dev server ลอยทับมุมล่างซ้าย — ไม่ใช่ส่วนหนึ่งของหน้า (production ไม่มี) */
const HIDE_CHROME = "nextjs-portal{display:none!important}";

async function ready(page: Page, route: string) {
  const res = await page.goto(route);
  expect(res?.status(), route).toBe(200);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: HIDE_CHROME });
}

test("ผังโครงการ 2D (MasterPlan2D)", async ({ page }) => {
  await ready(page, "/projects/rim-suan/master-plan");
  const svg = page.locator('svg[aria-label*="ผังโครงการ"]');
  await expect(svg.locator('[role="button"]')).toHaveCount(18);
  await expect(svg).toHaveScreenshot("master-plan-2d.png");
});

test("footer", async ({ page }) => {
  await ready(page, "/projects/rim-suan/location");
  const footer = page.locator("footer").last();
  await footer.scrollIntoViewIfNeeded();
  // © ปี มาจากนาฬิกาตอน render — ปิดไว้ ภาพจะไม่พังทุกต้นปี
  await expect(footer).toHaveScreenshot("footer.png", { mask: [footer.getByText(/^©/)] });
});

test("ฟอร์มลงทะเบียน ตอนยังไม่กรอก", async ({ page }) => {
  await ready(page, "/register");
  const form = page.locator("form").filter({ has: page.locator('input[name="privacyAck"]') });
  await expect(form).toBeVisible();
  await expect(form).toHaveScreenshot("register-form-empty.png");
  await expect(page.getByRole("region", { name: "ยังไม่ได้เลือกแปลง" })).toHaveScreenshot(
    "register-selection-empty.png",
  );
});

/* ภาพนิ่งจากฉาก 3D — หน้า /render มีเฉพาะ dev (production ตอบ 404) จึงข้ามเมื่อ E2E_TARGET=prod
   ภาพผ่าน WebGL ขึ้นกับ GPU/driver: baseline ใช้ได้กับเครื่องที่สร้างเท่านั้น และยอมให้ต่างได้มากกว่าหน้า DOM
   ถ่ายเฉพาะมุม iso/village ใน renders.json (walk ต้องเดินกล้อง ไม่ใช่ภาพนิ่ง) · desktop project เดียวพอ */
const STILLS = renders.filter((r) => r.view !== "walk");

test.describe("ภาพนิ่ง /render (dev เท่านั้น)", () => {
  test.skip(PROD, "/render/<slug> เป็นหน้า dev — production ตอบ 404");
  test.use({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });

  for (const r of STILLS) {
    /* @webgl: วิ่งใน project desktop-webgl ทีละภาพ ไม่แย่ง GPU กับเทสต์อื่น (playwright.config.ts) */
    test(r.id, { tag: "@webgl" }, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-webgl", "ภาพนิ่งถ่ายขนาดเดียว ไม่ต้องซ้ำใน mobile");
      test.slow();
      const q = `view=${r.view}&hour=${r.hour}&floor=${r.floor}${r.dark ? "&bg=ink" : ""}`;
      await page.goto(`/render/${r.slug}?${q}`);
      await page.waitForSelector('[data-still][data-ready="true"] canvas', { timeout: 120_000 });
      // ซ่อนทุกอย่างที่ไม่ใช่ภาพ แบบเดียวกับ scripts/render-stills.mjs
      await page.addStyleTag({
        content: `nextjs-portal{display:none!important}
          [data-still] *:not(canvas):not(:has(canvas)){visibility:hidden!important}`,
      });
      // เงา / env map / AO ต้องการหลายเฟรมกว่าจะเข้าที่ — ระยะเดียวกับสคริปต์ถ่ายภาพนิ่ง
      await page.waitForTimeout(5000);
      await expect(page.locator("canvas").first()).toHaveScreenshot(`render-${r.id}.png`, {
        maxDiffPixelRatio: 0.03,
        timeout: 30_000,
      });
    });
  }
});
