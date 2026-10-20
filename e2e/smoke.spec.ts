import { expect, test } from "@playwright/test";
import { houseHref, masterPlanHref, registerHref } from "../src/lib/routes";
import plotsData from "../src/data/plots.json";
import { MAIN_PLOT_ID, MAIN_PLOT_NUMBER, MAIN_SLUG, THAI_ROUTES } from "./routes";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* ฉาก 3D ทุกฉากโหลด three.js ทีหลังแล้วคอมไพล์ shader ครั้งแรก ซึ่งกิน main thread หลายวินาที
   บน dev server ที่หลายเทสต์ใช้ GPU เครื่องเดียวกันพร้อมกัน — รอได้นานกว่าค่าเริ่ม 5 วินาที
   ใช้กับ assertion ที่รอฉาก 3D เท่านั้น ส่วนอื่นยังต้องเร็วตามค่าเริ่ม */
const SCENE_WAIT = { timeout: 30_000 };
/* เทสต์ที่รอฉาก 3D พร้อมจริง — วิ่งใน project *-webgl ทีละเทสต์หลังเทสต์อื่นจบ (playwright.config.ts)
   คอมไพล์ shader หลายเบราว์เซอร์พร้อมกันบน GPU เดียว ช้าลงเกือบสิบเท่า (วัดจริง: 1 ตัว 8 วิ · 3 ตัว 50 วิ) */
const WEBGL = { tag: "@webgl" };

test("/design-system โหลดได้ และใช้ฟอนต์ตาม DESIGN-SPEC §2 จริง", async ({ page }) => {
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { name: "Design tokens" })).toBeVisible();

  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    /* display = Noto Serif Display (ละติน) ต่อด้วย Noto Serif Thai (ไทย) — ส่งข้อความของแต่ละ subset ให้ check
       เพราะแต่ละไฟล์ครอบเฉพาะ unicode-range ของตัวเอง */
    return {
      display: document.fonts.check('400 26px "Noto Serif Display"', "Designed"),
      displayThai: document.fonts.check('400 26px "Noto Serif Thai"', "บ้าน"),
      body: document.fonts.check('400 17px "Anuphan"', "บ้าน"),
    };
  });
  expect(fonts.display).toBe(true);
  expect(fonts.displayThai).toBe(true);
  expect(fonts.body).toBe(true);
});

test("token สี: ชุดมืด Dusk Clay ชุดเดียว — .light .dark ได้ค่าเดียวกัน", async ({ page }) => {
  await page.goto("/design-system");
  const [light, dark] = await page.evaluate(() =>
    [".light", ".dark"].map((sel) =>
      getComputedStyle(document.querySelector(sel) as Element)
        .getPropertyValue("--canvas")
        .trim(),
    ),
  );
  expect(light).toBe("#17130f");
  expect(dark).toBe(light);
});

test("แปลน 2D: พื้นที่บน SVG ตรงกับ geometry และช่องเปิดครบตาม data", async ({ page }) => {
  await page.goto("/plan");
  const rooms = page.locator('svg [role="button"]');
  await expect(rooms.first()).toBeVisible();

  // ตัวเลขพื้นที่ที่ตาเห็น ต้องตรงกับค่าที่ component คำนวณจาก roomArea
  for (const g of await rooms.all()) {
    const area = await g.getAttribute("data-area");
    await expect(g.locator("text").nth(1)).toHaveText(`${area} ตร.ม.`);
  }

  // ช่องเปิดบน SVG = ช่องเปิดใน data ของแบบแรก (แปลนตัวอย่างชั้นเดียว)
  await expect(page.locator("[data-opening]")).toHaveCount(17);

  // เดิน Tab จนถึงห้องแรกบนแปลน แล้วกด Enter เลือกได้จริง
  for (let i = 0; i < 8; i++) {
    const onRoom = await page.evaluate(
      () =>
        document.activeElement?.closest("svg") !== null &&
        document.activeElement?.getAttribute("role") === "button",
    );
    if (onRoom) break;
    await page.keyboard.press("Tab");
  }
  await page.keyboard.press("Enter");
  await expect(page.locator("aside h2")).not.toHaveText("ยังไม่ได้เลือกห้อง");
});

test("3D: ช่องเปิดทุกช่องเป็นรูจริงบนผนัง และเลือกห้องร่วมกับ 2D", WEBGL, async ({ page }) => {
  // ดัก hook มาตรฐานของ three เพื่ออ่าน scene graph จริง
  await page.addInitScript(() => {
    const w = window as unknown as { __THREE_DEVTOOLS__?: EventTarget; __seen?: unknown[] };
    w.__seen = [];
    const bus = new EventTarget();
    bus.addEventListener("observe", (e) => w.__seen?.push((e as CustomEvent).detail));
    w.__THREE_DEVTOOLS__ = bus;
  });

  await page.goto("/plan");
  await page.locator('svg [role="button"]').nth(6).click();
  const picked = await page.locator("aside h2").innerText();

  await page.getByRole("button", { name: "Isometric" }).click();
  await expect(page.locator("canvas")).toBeVisible(SCENE_WAIT);
  await expect(page.locator("aside h2")).toHaveText(picked); // ห้องเดิมยังถูกเลือกหลังสลับมุมมอง

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const seen = (window as unknown as { __seen: { isScene?: boolean }[] }).__seen ?? [];
          const scene = seen.find((o) => o?.isScene) as
            | { traverse: (cb: (o: { userData?: { openings?: string[] } }) => void) => void }
            | undefined;
          if (!scene) return -1;
          const ids = new Set<string>();
          scene.traverse((o) => o.userData?.openings?.forEach((id) => ids.add(id)));
          return ids.size;
        }),
      SCENE_WAIT,
    )
    .toBe(17);
});

test("หน้าแรก: studio เต็มจอแรก — h1 แบรนด์ ตัวเลขจริง และปุ่มไปที่ตัวเลือกโครงการ", async ({
  page,
}) => {
  await page.goto("/");
  // h1 เป็นหัวข้อแรกของหน้า และอยู่ในจอแรก
  const firstHeading = page.locator("h1, h2, h3").first();
  await expect(firstHeading).toHaveJSProperty("tagName", "H1");
  await expect(page.locator("h1")).toHaveText("เดอะ โกรฟ");
  await expect(page.locator("h1")).toBeInViewport();
  // เวที studio พอดีจอแรก ไม่ล้นลงไปใต้ขอบจอ
  const stage = page.locator("[data-hero]");
  const fit = await stage.evaluate(
    (el) => el.getBoundingClientRect().bottom <= window.innerHeight + 1,
  );
  expect(fit).toBe(true);
  // ตัวเลขจาก data (จอกว้าง — มือถือเหลือชื่อกับทางไปต่อ)
  if (await page.locator("[data-hero] p").first().isVisible()) {
    await expect(stage).toContainText("บ้าน 27 ยูนิต 5 แบบ ใน 2 โครงการที่นครนายก");
    await expect(stage).toContainText("พื้นที่ใช้สอย 104–155 ตร.ม.");
  }

  const cta = page.getByRole("link", { name: "ดูโครงการ", exact: true });
  await expect(cta).toBeInViewport();
  await cta.click();
  await expect(page.locator("#projects")).toBeInViewport();

  // skip link ของหน้า (Tab แรก) ข้ามเวทีไปลงที่ตัวเลือกโครงการ และย้าย focus ไปที่นั่นจริง
  await page.goto("/");
  await page.keyboard.press("Tab");
  const pageSkip = page.getByRole("link", { name: "ข้ามไปที่เนื้อหา" });
  await expect(pageSkip).toBeFocused();
  await expect(pageSkip).toHaveAttribute("href", "#projects");
  await page.keyboard.press("Enter");
  await expect(page.locator("#projects")).toBeFocused();
});

test("หน้าแรก: studio ชุดบรรยากาศ ปุ่มลัด และการ์ดเวลาเป็นภาพห้องจริง", WEBGL, async ({ page }) => {
  await page.goto("/");
  const studio = page.locator("[data-studio]");
  await expect(page.locator("[data-hero] canvas")).toBeVisible(SCENE_WAIT);
  const moods = studio.getByRole("group", { name: "ชุดบรรยากาศ" }).first();
  await page.locator("h1").click();
  await page.keyboard.press("3");
  await expect(moods.getByRole("button", { name: /ลึก/ })).toHaveAttribute("aria-pressed", "true");
  /* การ์ดเวลาใช้ภาพห้องเดียวกันที่ถ่ายจากฉาก (public/studio) */
  const thumbs = await studio
    .getByRole("region", { name: "แสงของวัน" })
    .locator("[style*='/studio/']")
    .count();
  expect(thumbs).toBe(4);
});

/* §4: มือถือ/จอสัมผัสห้ามดักการเลื่อน — เวทีไม่เกินหนึ่งหน้าจอ แตะลากบนห้องแล้วหน้าเลื่อนได้ (canvas ไม่รับ pointer)
   ควบคุมผ่านแผ่นล่างจอแทน · โครงการแรกอยู่ภายในสองหน้าจอของการเลื่อนปกติ */
test("หน้าแรก จอ compact: ไม่ดักการเลื่อน และโครงการแรกอยู่ภายในสองหน้าจอ", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "เฉพาะจอสัมผัส");
  await page.goto("/");
  const stage = page.locator("[data-hero]");
  await expect(page.locator("h1")).toBeVisible();
  const layout = await stage.evaluate((el) => {
    const all = [el, ...el.querySelectorAll<HTMLElement>("*")];
    const live = (n: Element) => getComputedStyle(n).pointerEvents !== "none";
    return {
      height: (el as HTMLElement).offsetHeight,
      vh: window.innerHeight,
      sticky: all.filter((n) => {
        const pos = getComputedStyle(n).position;
        return pos === "sticky" || pos === "fixed";
      }).length,
      blockedTouch: all.filter((n) => live(n) && getComputedStyle(n).touchAction === "none").length,
      firstCard: Math.round(
        document.querySelector("#projects h3")!.getBoundingClientRect().top + window.scrollY,
      ),
    };
  });
  expect(layout.height).toBeLessThanOrEqual(layout.vh);
  expect(layout.sticky).toBe(0);
  expect(layout.blockedTouch).toBe(0);
  expect(layout.firstCard).toBeLessThanOrEqual(2 * layout.vh);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  // แผ่นล่างจอ: แท็บแสง → การ์ดเวลา
  await page.getByRole("button", { name: "แสง", exact: true }).click();
  await expect(page.getByRole("button", { name: /^กลางคืน/ }).first()).toBeVisible();
});

test("ผังโครงการ: จำนวนและสถานะแปลงบนจอตรงกับ data และตัวกรองทำงาน", async ({ page }) => {
  /* เนินไผ่: แบบ 3 นอนขายหมด (ขายแล้ว) ที่เหลือยังไม่รู้สถานะรายแปลง (รอยืนยันสถานะ) — ค่าจาก plots.json */
  const own = plotsData.filter((p) => p.projectId === "project-2");
  const expected = (s: string) => own.filter((p) => p.status === s).length;
  await page.goto(masterPlanHref("noen-phai"));
  const plots = page.locator('svg [role="button"]');
  await expect(plots).toHaveCount(own.length);
  await expect(page.locator("main")).toContainText("ผังแปลงตัวอย่าง รอผังจริง");

  // นับรายสถานะจากสถานะที่ component เอามาจาก data
  const statuses = await plots.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-status") ?? ""),
  );
  const count = (s: string) => statuses.filter((x) => x === s).length;
  expect(count("unconfirmed")).toBe(expected("unconfirmed"));
  expect(count("sold")).toBe(expected("sold"));
  expect(count("available")).toBe(0);

  // ตัวกรองมีเฉพาะสถานะที่มีแปลงจริง — ไม่มี "ว่าง 0"
  await expect(page.getByRole("button", { name: /^ว่าง/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^รอยืนยันสถานะ/ }).click();
  await expect(page.locator('svg [role="button"]:not(.opacity-25)')).toHaveCount(
    expected("unconfirmed"),
  );

  // แปลงที่รอยืนยันสถานะลงทะเบียนได้ ราคาเป็นราคาเริ่มต้นของแบบพร้อมดอกจัน
  await page.locator('svg [role="button"]:not(.opacity-25)').first().click();
  await expect(page.getByRole("link", { name: "ลงทะเบียนสนใจแปลงนี้" })).toBeVisible();
  await expect(page.getByText("เริ่มต้น 2,790,000 บาท*").first()).toBeVisible();

  // แปลงที่ขายแล้วลงทะเบียนไม่ได้
  await page.getByRole("button", { name: /^ขายแล้ว/ }).click();
  await page.locator('svg [role="button"]:not(.opacity-25)').first().click();
  await expect(page.getByRole("link", { name: "ลงทะเบียนสนใจแปลงนี้" })).toHaveCount(0);
});

/* ทุกหน้าสาธารณะภาษาไทย (e2e/routes.ts) — รวมหน้ารายการโครงการ หน้าโครงการทุกโครงการ และหน้าย่อยของโครงการตัวอย่าง */
for (const route of THAI_ROUTES) {
  test(`หน้า ${route} เปิดได้ มี h1 เดียว และไม่มี horizontal scroll`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

test("ฟอร์มลงทะเบียน: รับ ?plot= บอก error ที่แก้ได้ และบันทึกเมื่อกรอกถูก", async ({ page }) => {
  await page.goto(registerHref({ plot: MAIN_PLOT_ID }));
  // การ์ดสรุปข้างฟอร์ม (section ที่มีหัวข้อเป็นชื่อ) ต้องอ่านแปลงจาก ?plot= ได้จริง
  await expect(
    page
      .getByRole("region", { name: `คุณกำลังลงทะเบียนแปลง ${MAIN_PLOT_NUMBER}` })
      .getByRole("heading"),
  ).toBeVisible();

  const submit = page.getByRole("button", { name: "ส่งข้อมูลให้ทีมขาย" });
  const summary = page.getByRole("status").filter({ hasText: "ยังส่งไม่ได้" });
  const privacy = page.locator('input[name="privacyAck"]');
  const marketing = page.locator('input[name="marketingOptIn"]');

  // PDPA: ทั้งสองช่องต้องไม่ถูกติ๊กไว้ให้ก่อน
  await expect(privacy).not.toBeChecked();
  await expect(marketing).not.toBeChecked();

  // ฟอร์มว่าง: error ทุกช่องบังคับ (ชื่อ เบอร์ รับทราบนโยบาย) และโฟกัสไปช่องแรกที่ต้องแก้
  await submit.click();
  await expect(page.getByText("กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร")).toBeVisible();
  await expect(page.locator('input[name="name"]')).toBeFocused();
  await expect(page.locator('input[name="name"]')).toHaveAttribute("aria-invalid", "true");
  await expect(summary).toContainText("3 ช่อง");

  await page.fill('input[name="name"]', "สมชาย ใจดี");
  await page.fill('input[name="phone"]', "08123");
  await submit.click();
  await expect(page.getByText(/เบอร์โทรขึ้นต้นด้วย 0/)).toBeVisible();
  await expect(page.locator('input[name="phone"]')).toBeFocused();

  // ชื่อกับเบอร์ถูกแล้ว แต่ยังไม่ติ๊กรับทราบนโยบาย → ส่งไม่ได้ โฟกัสไปที่ช่องติ๊ก และไม่มีอะไรถูกบันทึก
  await page.fill('input[name="phone"]', "0812345678");
  await submit.click();
  await expect(
    page.getByText(/ติ๊กช่องนี้เพื่อยืนยันว่ารับทราบนโยบายความเป็นส่วนตัว/),
  ).toBeVisible();
  await expect(privacy).toBeFocused();
  await expect(privacy).toHaveAttribute("aria-invalid", "true");
  await expect(summary).toContainText("1 ช่อง");
  expect(await page.evaluate(() => window.localStorage.getItem("grove.leads"))).toBeNull();

  // ติ๊กแล้ว error หายทันที ไม่ต้องรอกดส่ง · ข่าวสารไม่ติ๊ก (ไม่บังคับ) ก็ส่งได้
  await privacy.check();
  await expect(page.getByText(/ติ๊กช่องนี้เพื่อยืนยัน/)).toHaveCount(0);
  await submit.click();

  // ส่งสำเร็จ: ฟอร์มหาย หัวข้อยืนยันได้โฟกัส (คนใช้ screen reader ได้ยินทันที)
  const done = page.getByRole("heading", { name: "ได้รับข้อมูลแล้ว คุณสมชาย ใจดี" });
  await expect(done).toBeVisible();
  await expect(done).toBeFocused();
  await expect(submit).toHaveCount(0);
  await expect(page.getByRole("region", { name: /ได้รับข้อมูลแล้ว/ })).toContainText(
    /รับข่าวโครงการ\s*ไม่รับ/,
  );

  type SavedLead = {
    projectId: string;
    plotId: string;
    locale: string;
    consent: { marketing: boolean; privacyVersion: string };
  };
  const saved = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem("grove.leads") ?? "[]") as SavedLead[],
  );
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    // ?plot= อย่างเดียวก็รู้โครงการ — lead บันทึกโครงการของแปลงนั้น
    projectId: "project-1",
    plotId: MAIN_PLOT_ID,
    locale: "th",
    consent: { marketing: false },
  });
  expect(saved[0]?.consent.privacyVersion).toBeTruthy();
});

test("โหมดเดินดู: เข้า-ออกได้ และห้องที่เลือกไว้ไม่หาย", WEBGL, async ({ page }) => {
  await page.goto(houseHref(MAIN_SLUG, "baibua"));
  await page.locator('svg [role="button"]').nth(6).click();
  const picked = await page.locator("aside h2").innerText();

  await page.getByRole("button", { name: "เดินดูในบ้าน" }).click();
  await expect(page.getByRole("button", { name: "ออกจากโหมดเดิน" })).toBeVisible(SCENE_WAIT);
  await expect(page.locator("canvas")).toHaveCount(1, SCENE_WAIT); // mount เฉพาะ canvas ของโหมดที่เลือก

  await page.getByRole("button", { name: "ออกจากโหมดเดิน" }).click();
  await expect(page.getByRole("button", { name: "ออกจากโหมดเดิน" })).toHaveCount(0);
  await expect(page.locator("aside h2")).toHaveText(picked);
});

test(
  "mood studio (Isometric): ชุดบรรยากาศ ปุ่มลัด ถาดวัสดุ และซ่อนแผง",
  WEBGL,
  async ({ page }) => {
    await page.goto(houseHref(MAIN_SLUG, "baibua"));
    await page.getByRole("button", { name: "Isometric" }).click();
    const studio = page.locator("[data-studio]");
    await expect(studio).toBeVisible(SCENE_WAIT);
    await expect(page.locator("canvas")).toHaveCount(1, SCENE_WAIT);
    const moods = studio.getByRole("group", { name: "ชุดบรรยากาศ" }).first();

    await moods.getByRole("button", { name: /สว่าง/ }).click();
    await expect(moods.getByRole("button", { name: /สว่าง/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    /* ปุ่มลัด 3 = ชุด "ลึก" (หลังค่ำ 20:30) */
    await page.locator("h1").click();
    await page.keyboard.press("3");
    await expect(moods.getByRole("button", { name: /ลึก/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(studio.getByRole("button", { name: /กลางคืน/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    /* ถาดวัสดุ: แท็บหิน → เป้าเป็นพื้น · แตะหินขัด → พื้นในแผงวัสดุเปลี่ยนตาม */
    const tray = studio.getByRole("region", { name: "เลือกชนิดวัสดุ" });
    await tray.getByRole("button", { name: "หิน", exact: true }).click();
    await expect(tray).toContainText("ใช้กับพื้น");
    await tray.getByRole("button", { name: /หินขัด/ }).click();
    await expect(studio.getByRole("button", { name: /พื้น\s*หินขัด/ }).first()).toBeVisible();

    /* / ซ่อนแผง (ปุ่มเรียกกลับยังอยู่) */
    await page.keyboard.press("/");
    await expect(studio.getByRole("button", { name: "แสดงแผง" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.keyboard.press("/");
    await expect(studio.getByRole("button", { name: "ซ่อนแผง" })).toBeVisible();
  },
);
