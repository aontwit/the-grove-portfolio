import type { Page } from "@playwright/test";
import { INTRO_SESSION_KEY } from "../src/components/site/intro";

/* intro loader ของหน้าแรกโผล่ครั้งแรกของทุก session — context ใหม่ของ Playwright คือ session ใหม่ทุกเทสต์
   เทสต์ที่ไม่ได้ตรวจ loader เรียก test.beforeEach(({ page }) => skipIntro(page)) ตั้งค่า "เห็นแล้ว" ไว้ก่อนหน้าโหลด
   จะได้ไม่ต้องรอม่านเปิดทุกครั้ง · ตัว loader เองตรวจใน e2e/intro.spec.ts */
export function skipIntro(page: Page) {
  return page.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage ใช้ไม่ได้ = INTRO_SCRIPT ข้าม loader เองอยู่แล้ว */
    }
  }, INTRO_SESSION_KEY);
}
