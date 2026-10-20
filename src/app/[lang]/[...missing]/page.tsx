import { notFound } from "next/navigation";

/* URL ที่ไม่ตรงกับหน้าไหนใต้ [lang] (เช่น /en/xyz หรือ /xyz ที่ middleware rewrite เป็น /th/xyz)
   ตอบ 404 ด้วย [lang]/not-found.tsx ภายใน layout ของภาษานั้น — มีเมนูและ footer ภาษาเดียวกับ URL */
export default function Missing() {
  notFound();
}
