import { BASE_URL, PROD } from "./env";
import { HOUSE_SLUGS, PUBLIC_ROUTES } from "./routes";

/* globalSetup — dev เท่านั้น: เปิดทุก route ทีละหน้าก่อนเทสต์ขนานเริ่ม
   next dev คอมไพล์ route ครั้งแรกตอนมีคนขอ ถ้าหลาย worker ขอ route ที่ยังไม่คอมไพล์พร้อมกัน
   Next 15 บน Windows เขียน .next/prerender-manifest.json ชนกันจนไฟล์พัง แล้วทุกหน้าตอบ 500
   จนกว่าจะเปิด dev server ใหม่ (เจอจริง 2026-10-02) · คอมไพล์ครบก่อนแล้ว worker แค่อ่าน
   production (E2E_TARGET=prod) คอมไพล์ไว้แล้วตอน build จึงข้าม */

const DEV_ONLY = [
  "/design-system",
  "/plan",
  "/admin/login",
  "/admin",
  "/admin/plots",
  "/admin/house-types",
  "/admin/gallery",
  "/admin/leads",
  ...HOUSE_SLUGS.map((s) => `/render/${s}`),
];

export default async function warmup() {
  if (PROD) return;
  for (const route of [...PUBLIC_ROUTES, ...DEV_ONLY]) {
    /* ผลไม่สำคัญ (หลังบ้าน redirect ไป login) — ต้องการแค่ให้ dev server คอมไพล์ route นี้เสร็จ */
    await fetch(`${BASE_URL}${route}`, { redirect: "manual" }).catch(() => undefined);
  }
}
