import { expect, test } from "@playwright/test";

/* intro loader หน้าแรก (DESIGN-SPEC §4 ฉบับแก้ 2026-10-02) — ครั้งแรกของ session เท่านั้น
   ข้อจำกัดที่ต้องไม่หลุด: ความคืบหน้าจริง · ปุ่มข้ามหลัง ~1 s · รอนานสุด 3.5 s (จอสัมผัส) / 5 s (จอกว้าง) ·
   ไม่มีเมื่อ reduced motion / เห็นแล้วใน session / ไม่มี JS · เนื้อหาของหน้าอยู่ใน HTML จาก server ครบ */

const loader = "#intro-loader";

test("ครั้งแรกของ session: loader ขึ้นพร้อมความคืบหน้า ข้ามได้ แล้วไม่ขึ้นอีก", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "commit" });
  const el = page.locator(`${loader}[data-on]`);
  await expect(el).toBeVisible();
  const bar = el.getByRole("progressbar", { name: "ความคืบหน้าการโหลดโมเดลบ้าน" });
  await expect(bar).toHaveAttribute("aria-valuenow", /^\d+$/);

  // ปุ่มข้ามขึ้นหลังราว 1 วินาทีนับจากเริ่มโหลดหน้า — กดแล้วม่านเปิด (≤ 0.6 s) และหน้าเลื่อนได้อีกครั้ง
  // ฉาก 3D อาจพร้อมก่อนปุ่มข้ามขึ้น (เครื่องเร็ว) — กรณีนั้นม่านเปิดเองไปแล้ว ก็ถือว่าผ่าน
  const skip = page.getByRole("button", { name: "ข้าม", exact: true });
  await Promise.race([
    skip.waitFor({ timeout: 10_000 }).then(() => skip.click({ timeout: 2_000 }).catch(() => {})),
    page.locator(loader).waitFor({ state: "detached", timeout: 10_000 }),
  ]);
  await expect(page.locator(loader)).toHaveCount(0, { timeout: 2_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  await expect(page.locator("h1")).toBeVisible();

  // reload ใน session เดียวกัน: ไม่มี loader
  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(`${loader}[data-on]`)).toHaveCount(0);
});

test("รอนานสุดตามเพดาน แม้ฉาก 3D ยังโหลดไม่เสร็จ", async ({ page, isMobile }) => {
  // ถือไฟล์ texture/HDRI ไว้ไม่ปล่อย — ความคืบหน้าค้าง loader ต้องเปิดเองตามเพดานเวลา ไม่ค้างตลอดไป
  await page.route(/\/(textures|hdri)\//, () => {});
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator(`${loader}[data-on]`)).toBeVisible();
  const limit = isMobile ? 3_500 : 5_000;
  // ขอบเผื่อสำหรับ dev server (compile/hydrate ช้า) — วัดจากเวลาที่หน้าเริ่มโหลดจริง
  await expect(page.locator(loader)).toHaveCount(0, { timeout: limit + 4_000 });
  const t = await page.evaluate(() => performance.now());
  expect(t).toBeGreaterThan(limit - 500);
  await expect(page.locator("h1")).toBeInViewport();
});

test("reduced motion: ไม่มี loader เลย", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(`${loader}[data-on]`)).toHaveCount(0);
  await context.close();
});

test("ไม่มี JS: ไม่มี loader และเนื้อหาของหน้าอยู่ใน HTML ครบ", async ({ browser, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("เดอะ โกรฟ");
  expect(html).toContain("เลือกโครงการ");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(loader)).toBeHidden();
  await context.close();
});
