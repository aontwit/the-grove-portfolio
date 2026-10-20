"use client";

import { useDict } from "@/i18n/client";
import type { Dictionary } from "@/i18n";

/* ข้อความ "กำลังเปิด…" ของหน้าโหลด — loading.tsx ไม่ได้รับ params ภาษาจึงอ่านจาก LocaleProvider ที่นี่ */
export function LoadingLabel({ id }: { id: keyof Dictionary["loading"] }) {
  return <>{useDict().loading[id]}</>;
}
