import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import houseTypes from "../src/data/house-types.json";
import projects from "../src/data/projects.json";
import renders from "../src/data/renders.json";
import { skipIntro } from "./intro";

/* intro loader ของหน้าแรกตรวจแยกใน intro.spec.ts — ที่นี่ข้ามไป */
test.beforeEach(({ page }) => skipIntro(page));

/* แกลเลอรี (ตัวกรอง + ตัวดูภาพเต็มจอ) — งานพอร์ต: ทุกภาพเป็นภาพนิ่งจากโมเดล 3D (ไม่มีภาพจากผู้พัฒนา)
   ตัวเลขที่คาดไว้คำนวณจาก data ชุดเดียวกับเว็บ (ภาพนิ่ง 3D นับเฉพาะไฟล์ที่มีอยู่จริง เหมือน gallery/items.ts) */

const reel = renders.filter((r) => r.reel && existsSync(`public/renders/${r.id}.png`));
const projectOf = (slug: string) => houseTypes.find((h) => h.slug === slug)?.projectId;
const live = projects.filter((p) => p.status === "live");
const shortName = (name: string | null) => (name ? name.slice(name.indexOf("@")) : "");

/** ชิปตัวกรอง = radio ชื่อ "<ป้าย> <จำนวน>" */
const chip = (page: Page, label: string) =>
  page.getByRole("radio", {
    name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\d+$`),
  });

/** เลือกชิปแบบที่คนทำ: กดที่ป้าย (radio จริงซ่อนแบบ sr-only อยู่ในป้าย) */
const pick = async (page: Page, label: string) => {
  await page
    .locator("label")
    .filter({ has: chip(page, label) })
    .click();
  await expect(chip(page, label)).toBeChecked();
};

test.describe("แกลเลอรี", () => {
  test("ชิปตัวกรองนับภาพตรงกับ data และกรองตารางภาพจริง", async ({ page }) => {
    await page.goto("/gallery");
    const grid = page.getByTestId("gallery-grid");

    await expect(chip(page, "ทั้งหมด")).toHaveAccessibleName(`ทั้งหมด ${reel.length}`);
    await expect(chip(page, "ทั้งหมด")).toBeChecked();
    await expect(grid.locator("li")).toHaveCount(reel.length);
    await expect(grid.locator('li[data-source="developer"]')).toHaveCount(0);

    /* ชิปต่อโครงการจริง — ป้ายเป็นชื่อสั้นตั้งแต่ @ */
    for (const p of live) {
      const label = shortName(p.name);
      const n = reel.filter((r) => projectOf(r.slug) === p.id).length;
      await expect(chip(page, label)).toHaveAccessibleName(`${label} ${n}`);
      if (n > 0) {
        await pick(page, label);
        await expect(grid.locator("li")).toHaveCount(n);
      }
    }
  });

  test("ตัวกรองใช้ลูกศรได้ (radio group)", async ({ page }) => {
    await page.goto("/gallery");
    await chip(page, "ทั้งหมด").focus();
    await page.keyboard.press("ArrowRight");
    const next = shortName(live[0]?.name ?? null);
    await expect(chip(page, next)).toBeChecked();
    await expect(chip(page, next)).toBeFocused();
  });

  test("ตัวดูภาพ: เปิด เลื่อนด้วยลูกศร ปิดด้วย Esc แล้วโฟกัสกลับที่ภาพ", async ({ page }) => {
    await page.goto("/gallery");
    const first = page.getByTestId("gallery-grid").getByRole("button").first();
    await first.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "ปิด" })).toBeFocused();
    const title = dialog.getByRole("heading", { level: 2 });
    const before = await title.textContent();
    await expect(dialog).toContainText("ภาพจากโมเดล 3D");

    await page.keyboard.press("ArrowRight");
    await expect(title).not.toHaveText(before ?? "");
    await page.keyboard.press("ArrowLeft");
    await expect(title).toHaveText(before ?? "");

    /* โฟกัสถูกกักใน dialog — Tab วนอยู่ในปุ่มของตัวดูภาพ */
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("ตัวดูภาพ: ปุ่มถัดไป/ก่อน และปัดเลื่อนภาพ", async ({ page }) => {
    await page.goto("/gallery");
    await page.getByTestId("gallery-grid").getByRole("button").first().click();
    const dialog = page.getByRole("dialog");
    const title = dialog.getByRole("heading", { level: 2 });
    const start = await title.textContent();

    await dialog.getByRole("button", { name: "ภาพถัดไป" }).click();
    await expect(title).not.toHaveText(start ?? "");
    await dialog.getByRole("button", { name: "ภาพก่อน" }).click();
    await expect(title).toHaveText(start ?? "");

    /* ปัดซ้าย = ภาพถัดไป */
    /* รอให้ภาพเก่า crossfade ออกจนเหลือภาพเดียว */
    await expect(dialog.getByTestId("lightbox-image")).toHaveCount(1);
    const box = await dialog.getByTestId("lightbox-image").boundingBox();
    if (!box) throw new Error("ไม่พบภาพในตัวดูภาพ");
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
    await page.mouse.up();
    await expect(title).not.toHaveText(start ?? "");

    await dialog.getByRole("button", { name: "ปิด" }).click();
    await expect(dialog).toBeHidden();
  });
});

test("ไม่มีภาพจากสื่อเดิมของผู้พัฒนา (public/brand) ในหน้าใด", async ({ page }) => {
  for (const path of ["/", "/gallery", ...live.map((p) => `/projects/${p.slug}`)]) {
    await page.goto(path);
    await expect(page.locator('img[src*="brand%2F"], img[src*="/brand/"]')).toHaveCount(0);
  }
});
