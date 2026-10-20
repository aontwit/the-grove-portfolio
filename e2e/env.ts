/* เป้าหมายที่เทสต์วิ่งใส่ — ค่าเริ่มคือ dev server ที่เปิดค้างไว้ (http://localhost:3000)
   E2E_TARGET=prod → `next start` ที่พอร์ต 3100 (ต้อง `pnpm build` ก่อน · ดู docs/qa.md)
   หน้า /render/<slug> มีเฉพาะตอน dev — production ตอบ 404 เทสต์ที่พึ่งหน้านี้จึงข้ามเมื่อเป็น prod */

export const PROD = process.env.E2E_TARGET === "prod";
export const PORT = PROD ? 3100 : 3000;
export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
