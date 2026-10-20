/* ภาพนิ่งของ mood studio หน้าแรก → public/studio/
   - poster.webp: ภาพแรกของหน้าแรกก่อนโมเดลพร้อม (ชุดอบอุ่น 17:30)
   - morning / midday / evening / night .webp: ภาพห้องเดียวกันสี่ช่วงเวลา ใช้ในแผง "แสงของวัน"
   ถ่ายจากฉากจริงบนหน้าแรก (ซ่อนแผงด้วยปุ่มลัด /) — ไม่ใช่ภาพที่ทำแยก
   pnpm dev (อีกหน้าต่าง) แล้ว BASE_URL=http://localhost:3000 node scripts/studio-shots.mjs */

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next/package.json")] }));

const browser = await chromium.launch({
  args: [
    process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=gl",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForSelector("[data-studio]");
await page.waitForTimeout(9000);
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
mkdirSync("public/studio", { recursive: true });

const stage = page.locator("#studio canvas").first();
/** ปุ่มเวลาในแผงแสง (มีทั้งจอกว้างและแผ่นล่างจอ — ใช้ตัวที่มองเห็น) */
const pickTime = (name) =>
  page.getByRole("button", { name }).filter({ visible: true }).first().click();
const shoot = async (file, width) => {
  await page.locator("h1").click();
  await page.keyboard.press("/");
  await page.waitForTimeout(2500);
  const png = await stage.screenshot();
  /* การ์ดเวลา: ตัดเฉพาะกลางเวที (ตัวห้อง) ไม่เอาแผงและฉากหลังที่ว่าง · poster เต็มเวที */
  const img = sharp(png);
  const { width: W = 1600, height: H = 1000 } = await img.metadata();
  const crop =
    width < 800
      ? img.extract({
          left: Math.round(W * 0.3),
          top: Math.round(H * 0.1),
          width: Math.round(W * 0.5),
          height: Math.round(H * 0.8),
        })
      : img;
  await crop.resize(width).webp({ quality: 78 }).toFile(`public/studio/${file}.webp`);
  await page.keyboard.press("/");
  console.log("✓", file);
};

await page.locator("h1").click();
await page.keyboard.press("1");
await page.waitForTimeout(2500);
await shoot("poster", 1600);
for (const [file, name] of [
  ["morning", /^เช้า/],
  ["midday", /^เที่ยง/],
  ["evening", /^เย็น/],
  ["night", /^กลางคืน/],
]) {
  await pickTime(name);
  await page.waitForTimeout(2500);
  await shoot(file, 320);
}
await browser.close();
