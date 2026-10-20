import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* a11y gate — axe-core ตามแท็ก WCAG 2.0/2.1/2.2 ระดับ A+AA ทุก route สาธารณะ (ไทย + /en) × 2 ขนาดจอ
   ตกเฉพาะ violation ระดับ serious/critical · ระดับ minor/moderate แนบเป็น JSON ในผลเทสต์ให้ไล่ดูเอง
   reduced motion: หน้าแรกเป็นภาพนิ่ง และไม่มีอะไรค้างกลาง transition (opacity ครึ่งทางทำให้ contrast เพี้ยน)
   ขนาดจอกำหนดในไฟล์นี้เอง (1280 และ 375) — project "mobile" ใน playwright.config.ts จึงข้ามไฟล์นี้ ไม่วิ่งซ้ำ */

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const BLOCKING = new Set(["serious", "critical"]);

const VIEWPORTS = [
  { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  {
    name: "mobile-375",
    use: {
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
] as const;

/** รอให้หน้านิ่งก่อนตรวจ: ฟอนต์ครบ ฟอร์ม client (Suspense) ขึ้นแล้ว และไม่มี request ค้าง */
async function settle(page: Page, route: string) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  if (route.startsWith("/register") || route.startsWith("/en/register")) {
    await expect(
      page.getByRole("button", { name: /^(ส่งข้อมูลให้ทีมขาย|Send to the sales team)$/ }),
    ).toBeVisible();
  }
  if (route.includes("?plot=")) {
    await expect(page.locator("#plot-panel-title")).toBeVisible();
  }
}

test.describe("a11y: axe WCAG 2.2 AA", () => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use(vp.use);

      for (const route of PUBLIC_ROUTES) {
        test(`${route} ไม่มี violation ระดับ serious/critical`, async ({ page }, info) => {
          const res = await page.goto(route);
          expect(res?.status(), route).toBe(200);
          await settle(page, route);

          const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
          await info.attach("axe-results.json", {
            body: JSON.stringify(results, null, 2),
            contentType: "application/json",
          });

          const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ""));
          const report = blocking.map(
            (v) =>
              `[${v.impact}] ${v.id}: ${v.help}\n` +
              v.nodes
                .slice(0, 5)
                .map((n) => `    ${n.target.join(" ")}`)
                .join("\n") +
              (v.nodes.length > 5 ? `\n    …อีก ${v.nodes.length - 5} จุด` : ""),
          );
          expect(blocking, `${route} @ ${vp.name}\n${report.join("\n")}`).toEqual([]);
        });
      }
    });
  }
});

/* สถานะที่เปิดจากการกระทำ — ตัวดูภาพเต็มจอของแกลเลอรี และ mood studio ของหน้าแบบบ้าน (โหมด Isometric)
   (หน้าเริ่มต้นตรวจในลูปด้านบนแล้ว ตรงนี้ตรวจสิ่งที่โผล่หลังกด) */
test.describe("a11y: สถานะหลังกด", () => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use(vp.use);

      for (const [route, open] of [
        ["/gallery", "lightbox"],
        ["/en/gallery", "lightbox"],
        ["/projects/rim-suan/house-types/baibua", "studio"],
        ["/en/projects/rim-suan/house-types/baibua", "studio"],
      ] as const) {
        test(`${route} (${open}) ไม่มี violation ระดับ serious/critical`, async ({ page }) => {
          await page.goto(route);
          await settle(page, route);
          if (open === "lightbox") {
            await page.getByTestId("gallery-grid").getByRole("button").first().click();
            await expect(page.getByRole("dialog")).toBeVisible();
          } else {
            await page.getByRole("button", { name: "Isometric" }).click();
            await expect(page.locator("[data-studio]")).toBeVisible({ timeout: 45_000 });
          }
          await page.waitForTimeout(400);
          const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
          const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ""));
          expect(
            blocking.map(
              (v) => `[${v.impact}] ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
            ),
          ).toEqual([]);
        });
      }
    });
  }
});
