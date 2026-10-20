import type { ReactNode } from "react";
import { Link } from "@/i18n/client";
import { cx } from "@/lib/utils";

/* ปุ่มลิงก์ตาม DESIGN-SPEC §3 — สูง 48px, radius 6px, หลัก = พื้น pine, รอง = ขอบ 1.5px ironwood
   ทุกปุ่มในเว็บมาจากที่นี่ ไม่มีสตริง class ของปุ่มเขียนซ้ำในไฟล์หน้า
   href ภายในเว็บเขียนแบบไม่มี prefix ภาษา ("/master-plan") — Link ของ i18n เติม /en ให้เองบนหน้าภาษาอังกฤษ */

const BASE =
  "rounded-control text-15 inline-flex h-12 items-center justify-center px-6 font-medium";

const VARIANT = {
  primary: "bg-pine text-on-pine",
  secondary: "border-ironwood text-ironwood border-[1.5px]",
  /* บนแถบหมึก — pine บน ink มืดเกินจะอ่านออก ใช้ citron ตาม §1 */
  onInk: "bg-citron text-on-citron",
  onInkQuiet: "border-ash text-chalk border-[1.5px]",
} as const;

/** class ของปุ่มชุดเดียวกัน สำหรับ <button> จริง (ฟอร์ม, การกระทำใน admin) */
export function buttonClass(variant: keyof typeof VARIANT = "primary", className?: string) {
  return cx(BASE, VARIANT[variant], "disabled:opacity-50", className);
}

export function ButtonLink({
  href,
  variant = "primary",
  external = false,
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANT;
  /** ลิงก์ออกนอกเว็บ — ใช้ <a> ธรรมดา ไม่ต้องให้ router prefetch */
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = cx(BASE, VARIANT[variant], className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
