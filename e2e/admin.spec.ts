import { expect, test, type Page } from "@playwright/test";
import { masterPlanHref, registerHref } from "../src/lib/routes";
import { MAIN_SLUG } from "./routes";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* S7 acceptance — admin แก้แล้วเว็บฝั่งลูกค้าเปลี่ยนทันที · ฟอร์มหน้าเว็บโผล่ในหลังบ้าน */

/* route หลังบ้านถูกคอมไพล์ครั้งแรกตอนเทสต์เปิดใน dev — เผื่อเวลาเฉพาะการรอเปลี่ยนหน้า */
const NAV_WAIT = { timeout: 20_000 };

/* แถบเดโม (AdminNav DemoBanner) — role=note ที่บอกว่าเป็นโหมดเดโมและข้อมูลไม่บันทึกจริง
   หาจากความหมาย ไม่ผูกกับเครื่องหมายวรรคตอนของประโยค (§6 เลิกใช้ em-dash ในประโยคนี้แล้ว) */
const demoBanner = (page: Page) =>
  page.getByRole("note").filter({ hasText: /โหมดเดโม\s*ข้อมูลไม่บันทึกจริง/ });

/* จอแคบ เมนูหลังบ้านอยู่ในลิ้นชัก — เปิดก่อนแตะเมนูหรือปุ่มออกจากระบบ · จอกว้างเห็นอยู่แล้ว */
const openMenu = async (page: Page) => {
  if ((page.viewportSize()?.width ?? 0) >= 1024) return; // lg: sidebar ค้างอยู่ตลอด
  const trigger = page.getByRole("button", { name: "สลับแถบเมนู" });
  // ดู aria-expanded ไม่ใช่ isVisible — ลิ้นชักที่กำลังเลื่อนปิด (0.2s) ยังนับว่ามองเห็น
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
};

test("ยังไม่ login เข้า /admin ไม่ได้ · login แล้วกลับหน้าที่ตั้งใจ · ออกแล้วเข้าไม่ได้อีก", async ({
  page,
}) => {
  test.slow();
  await page.goto("/admin/plots");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fplots$/, NAV_WAIT);
  await expect(demoBanner(page)).toBeVisible();

  // ?next= ชี้ออกนอก /admin ต้องไม่พาออกไป
  await page.goto("/admin/login?next=https://example.com");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/admin$/, NAV_WAIT);
  await openMenu(page);
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/, NAV_WAIT);

  await page.goto("/admin/plots");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/plots$/, NAV_WAIT);

  // login อยู่แล้วเปิดหน้า login → เข้าหลังบ้านเลย
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin$/, NAV_WAIT);

  const nav = page.getByRole("navigation", { name: "เมนูหลังบ้าน" });
  for (const label of ["แปลง", "แบบบ้าน", "แกลเลอรี", "ผู้ลงทะเบียน", "ภาพรวม"] as const) {
    await openMenu(page);
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator("h1")).toHaveText(label, NAV_WAIT);
    await expect(demoBanner(page)).toBeVisible();
  }

  await openMenu(page);
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/, NAV_WAIT);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/, NAV_WAIT);
});

test("footer โหมดเดโมมีทางเข้าหลังบ้าน", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByRole("link", { name: "ลองเข้าหลังบ้าน" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/, NAV_WAIT);
});

test.describe("หลัง login", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "grove.session", value: "demo", url: baseURL! }]);
  });

  test("แก้สถานะแปลงใน admin → ผังโครงการที่เปิดอยู่อีกแท็บเปลี่ยนสีทันที", async ({
    page,
    context,
  }) => {
    const site = await context.newPage();
    await site.goto(masterPlanHref(MAIN_SLUG));
    const plot = site.locator('svg [data-plot="A-07"]');
    /* ผู้พัฒนายังไม่ให้สถานะรายแปลง — ค่าใน data คือ "รอยืนยันสถานะ" */
    await expect(plot).toHaveAttribute("data-status", "unconfirmed");

    await page.goto("/admin/plots");
    const row = page.locator('[data-plot-row="A-07"]');
    await row.getByText("ขายแล้ว", { exact: true }).click();
    await expect(row.getByRole("radio", { name: "ขายแล้ว" })).toBeChecked();

    // แท็บเว็บไม่ได้ reload — สีและป้ายต้องตามมาเองจาก storage event
    await expect(plot).toHaveAttribute("data-status", "sold");
    await expect(plot.locator("rect")).toHaveAttribute("fill", "var(--st-sold-bg)");
    await expect(site.getByRole("button", { name: /^ขายแล้ว 1/ })).toBeVisible();

    // ราคาแก้แล้วขึ้นใน panel แปลงฝั่งลูกค้า
    const price = row.getByLabel("ราคาแปลง A-07");
    await price.fill("4,500,000");
    await price.press("Enter");
    await expect(row.getByText(/^เดิม /)).toBeVisible();
    await site.reload();
    // รอค่าที่แก้ใน admin (localStorage) ถูกอ่านหลัง hydrate ก่อนแตะ — ไม่งั้นแตะโดนผังที่ยังไม่ hydrate
    await expect(site.locator('svg [data-plot="A-07"]')).toHaveAttribute("data-status", "sold");
    await site.locator('svg [data-plot="A-07"]').click();
    // แผงแปลง = <aside> ที่มีหัวข้อ #plot-panel-title — จอแคบกว่า 1360px อยู่ในแผ่นล่างจอ (role=dialog)
    // จึงหาจากหัวข้อของแผง ไม่พึ่ง role complementary ที่เปลี่ยนตามตำแหน่งใน landmark
    const panel = site.locator("aside").filter({ has: site.locator("#plot-panel-title") });
    await expect(panel).toContainText("4,500,000 บาท");

    // คืนค่าเดิม → เว็บกลับเป็นข้อมูลจาก data
    await row.getByRole("button", { name: "คืนค่าเดิม" }).click();
    await expect(site.locator('svg [data-plot="A-07"]')).toHaveAttribute(
      "data-status",
      "unconfirmed",
    );
  });

  test("ส่งฟอร์มลงทะเบียนหน้าเว็บ → โผล่ในหน้าผู้ลงทะเบียน", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page.getByRole("heading", { name: "ยังไม่มีใครลงทะเบียน" })).toBeVisible();

    await page.goto(registerHref({ plot: "rs-a-03" }));
    await page.fill('input[name="name"]', "วิภา ทดสอบ");
    await page.fill('input[name="phone"]', "0898765432");
    await page.fill('textarea[name="message"]', "ขอดูบ้านตัวอย่างวันเสาร์");
    // PDPA: รับทราบนโยบายบังคับ · รับข่าวสารเลือกเอง (ติ๊กไว้ เพื่อดูว่าหลังบ้านเห็นค่า "ยินยอม")
    await page.locator('input[name="privacyAck"]').check();
    await page.locator('input[name="marketingOptIn"]').check();
    await page.getByRole("button", { name: "ส่งข้อมูลให้ทีมขาย" }).click();
    await expect(
      page.getByRole("heading", { name: "ได้รับข้อมูลแล้ว คุณวิภา ทดสอบ" }),
    ).toBeVisible();

    await page.goto("/admin/leads");
    const row = page.getByRole("row", { name: /วิภา ทดสอบ/ });
    await expect(row).toContainText("แปลง A-03");
    // lead บันทึกโครงการ — คอลัมน์โครงการบอกชื่อ และตัวกรองโครงการนับถูก
    await expect(row).toContainText("เดอะ โกรฟ @ริมสวน");
    await expect(page.getByRole("button", { name: /^เดอะ โกรฟ @ริมสวน 1/ })).toBeVisible();
    // หลักฐานความยินยอมตาม PDPA ต้องมาถึงหลังบ้านครบ
    await expect(row).toContainText(/รับข่าวสาร\s*ยินยอม/);
    await expect(row).toContainText("รับทราบนโยบายฉบับ");
    // ภาษาของหน้าฟอร์มที่กดส่ง — ทีมขายโทรกลับเป็นภาษานั้น
    await expect(row.getByRole("cell", { name: "ไทย", exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: "0898765432" })).toHaveAttribute(
      "href",
      "tel:0898765432",
    );

    // ภาพรวมเห็นคนล่าสุดด้วย
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "ดูทั้งหมด 1 คน" })).toBeVisible();
  });

  test("หน้า admin ไม่มี horizontal scroll และมี h1 เดียว", async ({ page }) => {
    test.slow();
    for (const route of [
      "/admin/login",
      "/admin",
      "/admin/plots",
      "/admin/house-types",
      "/admin/gallery",
      "/admin/leads",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, route).toBe(0);
    }
  });
});
