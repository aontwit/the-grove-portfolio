"use client";

import { useDict } from "@/i18n/client";
import { cx } from "@/lib/utils";

/* ป้ายของส่วนที่ยังเป็นตัวอย่าง — ข้อมูลโครงการเป็นของจริงแล้ว แต่สองอย่างยังไม่ใช่:
   plan = แปลนบ้าน (houseType.samplePlan) ทุกจุดที่แสดงห้อง: แปลน 2D, isometric, เดินดู, ตารางห้อง, ผังย่อ, แผนภาพแดด
   site = ผังแปลง (project.pending.plots): ผัง 2D, หมู่บ้าน 3D, กระดานแปลง
   scene = ฉากเปิดหน้าแรก ซึ่งมีทั้งสองอย่างในฉากเดียว — ป้ายเดียวแทนการติดสองสามป้ายซ้อนกัน
   เป็นคำเสมอ (ไม่ใช่ไอคอนหรือสีอย่างเดียว) · ขอบเส้นประแบบเดียวกับ chip "รอยืนยันสถานะ" — ของที่ยังไม่ยืนยันหน้าตาเดียวกันทั้งเว็บ
   วางใต้หัวข้อหรือเหนือภาพ ไม่วางเหนือ headline (§7 badge เหนือ headline)
   ใช้ได้ทั้งใน server และ client component (ภาษามาจาก LocaleProvider ของ [lang]/layout) */

const TONE = {
  light: "outline-moss text-moss",
  ink: "outline-ash text-ash",
} as const;

export function SampleNote({
  kind,
  detail = false,
  tone = "light",
  className,
}: {
  kind: "plan" | "site";
  /** ต่อประโยคอธิบายว่าอะไรจริง อะไรเป็นตัวอย่าง */
  detail?: boolean;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  const t = useDict().common;
  const { label, note } = {
    plan: { label: t.samplePlan, note: t.samplePlanNote },
    site: { label: t.sampleSite, note: t.sampleSiteNote },
  }[kind];
  return (
    <p
      data-sample={kind}
      className={cx(
        "text-13 flex max-w-[70ch] flex-wrap items-baseline gap-x-3 gap-y-1",
        className,
      )}
    >
      <span
        className={cx(
          "rounded-control inline-flex min-h-7 shrink-0 items-center px-2.5 font-medium outline-1 -outline-offset-1 outline-dashed",
          TONE[tone],
        )}
      >
        {label}
      </span>
      {detail && <span className={tone === "ink" ? "text-ash" : "text-moss"}>{note}</span>}
    </p>
  );
}
