/* session ของหลังบ้านโหมดเดโม — cookie เดียว ไม่มีผู้ใช้จริง ไม่ตรวจรหัสผ่าน
   middleware กับ server action อ่านชื่อจากที่นี่ที่เดียว
   ponytail: B2 แทนที่ทั้งไฟล์นี้ด้วย Auth.js session (credentials + argon2) */

export const SESSION_COOKIE = "grove.session";

/** ปลายทางหลัง login ต้องอยู่ใต้ /admin เท่านั้น — กันลิงก์ ?next= พาออกไปเว็บอื่น */
export function safeNext(next: unknown) {
  return typeof next === "string" && /^\/admin(\/[\w-]*)*$/.test(next) && next !== "/admin/login"
    ? next
    : "/admin";
}
