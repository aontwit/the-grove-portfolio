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

test(
  "หน้าแรก: สกรอลล์บนโมเดลแล้วหน้าเลื่อน ไม่ถูกดูดไปซูม และบ้านแยกชิ้นตาม scroll",
  WEBGL,
  async ({ page, isMobile }) => {
    // ทางวิ่งของ scroll มีเฉพาะจอกว้าง (§4: มือถือ/จอสัมผัสห้ามดักการเลื่อน) — มือถือตรวจในเทสต์ "จอ compact" ด้านล่าง
    test.skip(isMobile, "จอสัมผัสไม่มีฉาก scrub");
    await page.goto("/");
    const stage = page.locator("[data-hero]");
    // ภาพนิ่งของโมเดลเดียวกันขึ้นทันทีเป็น LCP ไม่ต้องรอ three.js (HeroDiorama)
    const still = stage.getByRole("img", { name: /ภาพนิ่งจากโมเดล 3D/ });
    await expect(still).toBeVisible();

    // ฉาก 3D เริ่มโหลดเองทันทีหลัง hydrate (intro loader ต้องโชว์ความคืบหน้าจริง · เจ้าของสั่ง 2026-10-02) ไม่ต้องรอผู้ชมสะกิด
    await expect(page.locator("canvas")).toHaveCount(1, SCENE_WAIT);

    // สะกิดแล้ว canvas ขึ้น และจางทับภาพนิ่งเมื่อของในฉากวาดลงจอแล้วจริง (IsoCanvas: SceneReady)
    // สร้างฉากครั้งแรก (โหลด three.js, คอมไพล์ shader, อบเงา) main thread ไม่ว่างหลายวินาที จึงรอนานกว่าค่าเริ่ม
    // พร้อมแล้วภาพนิ่งถูกซ่อนจาก accessibility tree (aria-hidden) เหลือโมเดลตัวเดียว ไม่อ่านซ้ำสองรอบ
    await expect(page.locator("canvas")).toBeVisible(SCENE_WAIT);
    await expect(stage.getByRole("img", { name: /ห้องจะลงมาเข้าที่ทีละห้อง/ })).toBeVisible();
    await expect(still).toHaveCount(0, SCENE_WAIT);

    // ชี้เมาส์กลางโมเดลแล้วสกรอลล์ — หน้าต้องเลื่อน ไม่ใช่ canvas ดูดไปซูมแล้วหน้าค้าง
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, 600);
    // ถ้า canvas ดูดสกรอลล์ไปซูม ค่านี้จะค้างที่ 0 ตลอด (ระยะจริงต่างกันตามขนาดจอกับ inertia)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    // ฉากต้องมีทางวิ่งจริง — ค่า explode ของโมเดลผูกกับระยะนี้ ถ้าไม่มี บ้านก็ไม่มีวันแยกชิ้น
    // หาฉากจากชื่อ landmark ไม่ใช่ตำแหน่งใน DOM — โครง <main id="content"> ของ layout เปลี่ยนได้โดยเทสต์ไม่พัง
    const runway = await stage.evaluate(
      (el) => (el as HTMLElement).offsetHeight - window.innerHeight,
    );
    expect(runway).toBeGreaterThan(300);
  },
);

/* critique 2026-10-02 [P1]: เลื่อนลึกแล้วกด Home (หรือ scrollTo(0) / ปุ่ม back) เคยได้พื้นมะกอกว่าง
   เพราะกล้องค้างท่าถอยไกลจนกว่าล้อเมาส์จะขยับอีกครั้ง — ฉากต้องกลับเฟรมแรกเองทั้งค่าที่อ่านจาก scroll (data-progress)
   ท่าที่กล้องวาดจริง (data-pose) และข้อความของจังหวะ (--hero-p) */
/* ปุ่ม Home ของ Chrome เลื่อนแบบนุ่มตามเฟรม — ด้วย WebGL ซอฟต์แวร์ (SwiftShader ค่าเริ่มของ headless) ฉากหมู่บ้านกิน
   main thread จนการเลื่อนของปุ่มไม่เดินเลย (วัด 2026-10-02: ค้าง 30 วินาที · ด้วย GPU ผ่าน ANGLE ถึงบนสุดใน ~170 ms ทุกรอบ)
   เทสต์นี้ตรวจพฤติกรรมของหน้า ไม่ใช่ความเร็วของ SwiftShader จึงเปิดเบราว์เซอร์ของตัวเองที่ใช้ GPU (Windows) */
const GPU_ARGS =
  process.platform === "win32"
    ? ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"]
    : [];

test(
  "หน้าแรก: เลื่อนลึกแล้วกด Home ฉากกลับเฟรมแรกทันที",
  WEBGL,
  async ({ playwright, baseURL }, testInfo) => {
    test.skip(
      !!testInfo.project.use.isMobile,
      "จอสัมผัสไม่มีฉาก scrub — ความคืบหน้ามาจากปุ่มจังหวะ",
    );
    const browser = await playwright.chromium.launch({ args: GPU_ARGS });
    const { viewport, isMobile, hasTouch, deviceScaleFactor, userAgent } = testInfo.project.use;
    const context = await browser.newContext({
      baseURL,
      viewport,
      isMobile,
      hasTouch,
      deviceScaleFactor,
      userAgent,
    });
    const page = await context.newPage();
    await skipIntro(page);
    try {
      await page.goto("/");
      const stage = page.locator("[data-hero]");
      await expect(page.locator("canvas")).toHaveCount(1, SCENE_WAIT);
      await expect(stage.getByRole("img", { name: /ภาพนิ่งจากโมเดล 3D/ })).toHaveCount(
        0,
        SCENE_WAIT,
      );

      // ลงไปกลางฉาก (ช่วงกล้องถอย) แล้วรอให้กล้องวาดท่านั้นจริง
      await stage.evaluate((el) => {
        const runway = (el as HTMLElement).offsetHeight - window.innerHeight;
        window.scrollTo(0, (el as HTMLElement).offsetTop + runway * 0.75);
      });
      const pose = async () => Number((await stage.getAttribute("data-pose")) ?? 0);
      await expect
        .poll(async () => Number(await stage.getAttribute("data-progress")), SCENE_WAIT)
        .toBeGreaterThan(0.5);
      await expect.poll(pose, SCENE_WAIT).toBeGreaterThan(0.5);

      // Home ของเบราว์เซอร์เป็นการเลื่อนแบบนุ่มที่เดินตามเฟรม — บนเครื่องเทสต์ที่วาด WebGL ด้วยซอฟต์แวร์ (SwiftShader)
      // ฉากหมู่บ้านได้ราวเฟรมละวินาที จึงรอนานเท่าฉาก 3D ไม่ใช่ค่าเริ่ม 5 วินาที
      await page.keyboard.press("Home");
      await expect.poll(() => page.evaluate(() => window.scrollY), SCENE_WAIT).toBe(0);
      await expect(stage).toHaveAttribute("data-progress", "0.000");
      await expect(stage).toHaveAttribute("data-pose", "0.000", SCENE_WAIT);
      expect(
        await stage.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--hero-p")),
      ).toBe("0.0000");
      // เฟรมแรกครบ: ชื่อแบรนด์ (h1) อยู่บนจอ
      await expect(page.locator("h1")).toBeInViewport();

      // scrollTo จากโค้ด (ทางเดียวกับการคืนตำแหน่งของปุ่ม back) ก็ต้องกลับเหมือนกัน
      await stage.evaluate((el) => {
        const runway = (el as HTMLElement).offsetHeight - window.innerHeight;
        window.scrollTo(0, (el as HTMLElement).offsetTop + runway * 0.5);
      });
      await expect.poll(pose, SCENE_WAIT).toBeGreaterThan(0.3);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(stage).toHaveAttribute("data-pose", "0.000", SCENE_WAIT);
    } finally {
      await browser.close();
    }
  },
);

test("หน้าแรก: เฟรมแรกมีชื่อแบรนด์ ตัวเลขจริง และปุ่มไปที่ตัวเลือกโครงการ", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  // h1 เป็นหัวข้อแรกของหน้า และอยู่ในจอแรก
  const firstHeading = page.locator("h1, h2, h3").first();
  await expect(firstHeading).toHaveJSProperty("tagName", "H1");
  await expect(page.locator("h1")).toHaveText("เดอะ โกรฟ");
  await expect(page.locator("h1")).toBeInViewport();
  // ตัวเลขจาก data: 2 โครงการที่มีข้อมูล 18 + 9 ยูนิต แบบบ้าน 5 แบบ
  await expect(page.locator("[data-hero]")).toContainText(
    "บ้าน 27 ยูนิต 5 แบบ ใน 2 โครงการที่นครนายก",
  );
  await expect(page.locator("[data-hero]")).toContainText("พื้นที่ใช้สอย 104–155 ตร.ม.");
  // ป้ายตัวอย่างป้ายเดียวในฉาก
  await expect(page.locator("[data-hero] [data-sample]")).toHaveCount(1);

  const cta = page.getByRole("link", { name: "ดูโครงการ", exact: true });
  await expect(cta).toBeInViewport();
  await cta.click();
  await expect(page.locator("#projects")).toBeInViewport();

  // ทางลัดข้ามฉากกดได้ด้วยคีย์บอร์ด — มีเฉพาะจอกว้างที่มีทางวิ่ง (จอ compact โครงการอยู่ถัดจากโมเดลทันที)
  if (!isMobile) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const skip = page.getByRole("link", { name: "ข้ามไปดูโครงการ" });
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#projects")).toBeInViewport();
  }

  // skip link ของหน้า (Tab แรก) ข้ามฉากโมเดลทั้งหมดไปลงที่ตัวเลือกโครงการ และย้าย focus ไปที่นั่นจริง
  await page.goto("/");
  await page.keyboard.press("Tab");
  const pageSkip = page.getByRole("link", { name: "ข้ามไปที่เนื้อหา" });
  await expect(pageSkip).toBeFocused();
  await expect(pageSkip).toHaveAttribute("href", "#projects");
  await page.keyboard.press("Enter");
  await expect(page.locator("#projects")).toBeFocused();
});

/* เจ้าของสั่ง 2026-10-02: ฉากโชว์หน้าแรกไม่รับคลิกห้อง/แปลงทุกจังหวะ ทุกขนาดจอ
   (เลือกห้องได้ในหน้าแบบบ้าน — เทสต์ "3D: ช่องเปิดทุกช่อง…" ด้านบนยังตรวจอยู่) */
test("หน้าแรก: คลิกหรือแตะห้องในโมเดลไม่เกิดอะไรขึ้น", WEBGL, async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-hero]");
  const canvas = stage.locator("canvas");
  await expect(canvas).toBeVisible(SCENE_WAIT);
  await expect(stage.getByRole("img", { name: /ภาพนิ่งจากโมเดล 3D/ })).toHaveCount(0, SCENE_WAIT);
  // canvas ไม่รับ pointer เลย — แตะผ่านไปที่หน้า (เลื่อนหน้าได้ ปุ่มกล้องกดได้)
  expect(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");

  const pressed = () => page.locator('[aria-pressed="true"]').allTextContents();
  const before = {
    url: page.url(),
    pressed: await pressed(),
    y: await page.evaluate(() => scrollY),
  };
  const box = (await canvas.boundingBox())!;
  // กลางบ้าน (ห้องนั่งเล่น) และจุดรอบๆ — ทุกจุดต้องไม่เปลี่ยนอะไร
  for (const [fx, fy] of [
    [0.5, 0.55],
    [0.42, 0.5],
    [0.6, 0.62],
  ] as const) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  }
  await page.waitForTimeout(500);
  expect(page.url()).toBe(before.url);
  expect(await pressed()).toEqual(before.pressed);
  expect(await page.evaluate(() => scrollY)).toBe(before.y);
  await expect(
    page.locator('[aria-selected="true"], [role="dialog"], #plot-panel-title, aside h2'),
  ).toHaveCount(0);
});

/* §4 (แก้ 2026-10-02): มือถือ/จอสัมผัสห้ามดักการเลื่อน — ไม่ pin ไม่ scrub ไม่ smooth-scroll
   ฉากเปิดเป็นท่อนปกติไม่เกินหนึ่งหน้าจอ และโครงการแรกอยู่ภายในสองหน้าจอของการเลื่อนปกติ */
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
    return {
      height: (el as HTMLElement).offsetHeight,
      vh: window.innerHeight,
      sticky: all.filter((n) => {
        const pos = getComputedStyle(n).position;
        return pos === "sticky" || pos === "fixed";
      }).length,
      blockedTouch: all.filter((n) => getComputedStyle(n).touchAction === "none").length,
      firstCard: Math.round(
        document.querySelector("#projects h3")!.getBoundingClientRect().top + window.scrollY,
      ),
    };
  });
  // ไม่มีทางวิ่ง: ท่อนแรกสูงไม่เกินหนึ่งหน้าจอ ไม่มีชิ้นไหนติดจอ ไม่มีอะไรห้ามนิ้วเลื่อนหน้า
  expect(layout.height).toBeLessThanOrEqual(layout.vh);
  expect(layout.sticky).toBe(0);
  expect(layout.blockedTouch).toBe(0);
  expect(layout.firstCard).toBeLessThanOrEqual(2 * layout.vh);
  // Lenis (smooth scroll) ไม่ทำงานบนจอสัมผัส — เลื่อนแบบ native ล้วน
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  // ปุ่มขยับกล้องในที่เดิมแทนการเลื่อน — กดแล้วหน้าไม่เลื่อน
  // reduced motion = กระโดดถึงทันที ไม่ต้องรอเฟรมของ tween (WebGL ซอฟต์แวร์บนเครื่องเทสต์ได้ไม่กี่เฟรมต่อวินาที)
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "ทีละห้อง" }).click();
  await expect(page.getByRole("button", { name: "ทีละห้อง" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // ทีละห้อง = ห้องครบก่อนหลังคาลง (heroTimeline: cap[0]) — ไม่ใช่แปลงเปล่า เพราะจอนี้ไม่มีการเลื่อนมาเติมห้อง
  const rooms = Number(await stage.getAttribute("data-progress"));
  expect(rooms).toBeGreaterThan(0.5);
  expect(rooms).toBeLessThan(1);
  await page.getByRole("button", { name: "ทั้งหลัง" }).click();
  await expect.poll(() => stage.getAttribute("data-progress")).toBe("1.000");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
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
