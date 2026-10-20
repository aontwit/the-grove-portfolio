import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, PORT, PROD } from "./e2e/env";

/* สองเป้าหมาย (e2e/env.ts):
   - dev (ค่าเริ่ม): ใช้ dev server ที่เปิดค้างอยู่ที่ :3000 ถ้ามี — ไม่เปิดตัวที่สองมาแย่งพอร์ต
   - E2E_TARGET=prod: `next start` ที่ :3100 จาก build ล่าสุด แยกพอร์ตจาก dev จะได้ไม่ไปใช้ dev server โดยไม่รู้ตัว
     ต้อง `pnpm build` ก่อน และห้าม build ขณะ dev server เปิดอยู่ (ทั้งคู่เขียน .next ที่เดียวกัน) */

export default defineConfig({
  testDir: "./e2e",
  /* dev: คอมไพล์ทุก route ทีละหน้าก่อนเทสต์ขนาน — กัน .next/prerender-manifest.json พัง (e2e/warmup.ts) */
  globalSetup: "./e2e/warmup.ts",
  fullyParallel: true,
  reporter: "list",
  /* เส้นทางที่มี three.js ใช้เวลา compile รอบแรกบน dev server เกิน 30 วินาทีได้จริง
     ตอนหลายเทสต์วิ่งพร้อมกัน — ค่านี้คือเวลารอ ไม่ใช่เวลาที่ทดสอบจริงต้องใช้ */
  timeout: 60_000,
  expect: {
    /* visual regression (e2e/visual.spec.ts) — ปิด animation/caret และถ่ายที่สเกล CSS
       ให้ภาพไม่ขึ้นกับ deviceScaleFactor · ยอมให้ต่างได้เล็กน้อยจาก anti-aliasing ของฟอนต์ */
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: BASE_URL,
  },
  /* เทสต์ที่ติดแท็ก @webgl รอฉาก 3D พร้อมจริง (คอมไพล์ shader + เฟรมแรก) — แยกไปวิ่งทีละเทสต์หลังเทสต์อื่นจบ
     หลายเบราว์เซอร์คอมไพล์ shader พร้อมกันบน GPU เดียว ช้าลงเกือบสิบเท่า (วัด 2026-10-02: 1 ตัว ~8 วิ · 3 ตัว ~50 วิ)
     จนเทสต์หมดเวลาทั้งที่แอปไม่ได้ผิด · ภาพนิ่ง render-* ของ visual.spec.ts ก็อยู่ใน desktop-webgl ด้วย
     ถ้า desktop/mobile มีเทสต์ตก project *-webgl จะถูกข้าม (dependencies) — แก้ตัวที่ตกก่อน */
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@webgl/ },
    /* a11y.spec.ts กำหนดขนาดจอเอง (เดสก์ท็อป + 375px) วิ่งใน project desktop รอบเดียวพอ */
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: /a11y\.spec\.ts$/,
      grepInvert: /@webgl/,
    },
    {
      name: "desktop-webgl",
      use: { ...devices["Desktop Chrome"] },
      grep: /@webgl/,
      workers: 1,
      dependencies: ["desktop", "mobile"],
    },
    {
      name: "mobile-webgl",
      use: { ...devices["Pixel 7"] },
      testIgnore: /a11y\.spec\.ts$/,
      grep: /@webgl/,
      workers: 1,
      dependencies: ["desktop-webgl"],
    },
  ],
  /* E2E_BASE_URL = ชี้ไป server ที่เปิดเองแล้ว (เช่น prod build ใน scratch worktree) — ห้าม spawn อะไรเพิ่ม
     เดิม spawn `pnpm dev` ตัวที่สองใน repo → เขียน .next ที่เดียวกับ dev server :3000 จนพัง (2026-10-03) */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: PROD ? `pnpm start --port ${PORT}` : "pnpm dev",
        url: PROD ? `${BASE_URL}/` : `${BASE_URL}/design-system`,
        /* dev server ที่เปิดค้างอยู่ถูกใช้ต่อเสมอ (นอก CI) — ไม่ spawn ตัวใหม่มาชนพอร์ต 3000 */
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
