/* ภาพก่อน/หลังของงานพอร์ต → docs/screenshots/portfolio/<tag>-*.png (หน้าแรก + mood studio ของแบบใบบัว)
   pnpm dev (อีกหน้าต่าง) แล้ว node scripts/portfolio-shots.mjs after */
import { chromium } from "@playwright/test";
const [tag] = process.argv.slice(2);
const b = await chromium.launch({
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const out = (n) => `docs/screenshots/portfolio/${tag}-${n}.png`;
for (const [vw, vh, suf] of [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  const ctx = await b.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: suf === "mobile" ? 2 : 1,
    isMobile: suf === "mobile",
    hasTouch: suf === "mobile",
  });
  await ctx.addInitScript(() => sessionStorage.setItem("grove:intro", "1"));
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/");
  await p.waitForTimeout(9000);
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await p.screenshot({ path: out(`home-${suf}`) });
  await p.goto("http://localhost:3000/projects/rim-suan/house-types/baibua");
  await p
    .getByRole("radio", { name: "Isometric" })
    .or(p.getByRole("button", { name: "Isometric" }))
    .first()
    .click();
  await p.waitForTimeout(10000);
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const box = p.locator("[data-studio], [role=application]").first();
  await box.evaluate((e) => (e.closest(".isolate") ?? e).scrollIntoView({ block: "start" }));
  await p.evaluate(() => window.scrollBy(0, -16));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out(`iso-${suf}`), fullPage: false });
  if (tag === "after") {
    await p.keyboard.press("3");
    await p.waitForTimeout(3500);
    await p.screenshot({ path: out(`iso-moody-${suf}`), fullPage: false });
    await p.keyboard.press("2");
    await p.waitForTimeout(3500);
    await p.screenshot({ path: out(`iso-bright-${suf}`), fullPage: false });
  }
  await ctx.close();
}
await b.close();
