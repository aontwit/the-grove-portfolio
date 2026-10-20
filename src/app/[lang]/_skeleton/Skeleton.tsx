import type { ReactNode } from "react";
import { Shell } from "@/components/site/Shell";
import { cx } from "@/lib/utils";

/* ชิ้นส่วนของหน้าโหลด (loading.tsx) ใต้ [lang]
   - ทุกชิ้นสูงเท่าของจริง: แท่งข้อความสูง 1lh ของขนาดตัวอักษรเดียวกับหน้า กรอบภาพ/แปลนใช้สัดส่วนเดียวกับของจริง
     ของจริงมาแทนแล้วเนื้อหาด้านล่างไม่กระโดด
   - นิ่งสนิท: ไม่มี shimmer (§1 ห้าม gradient) ไม่มี pulse (§4/§7) — สีพื้นต่างระดับอย่างเดียว
   - พื้นสว่างใช้ concrete · บนแถบหมึกใช้ slate (§1 พื้นยกระดับบนแถบเข้ม) */

const TONE = { light: "bg-concrete", ink: "bg-slate" } as const;

/** แท่งแทนข้อความ — className ต้องมีขนาดตัวอักษร (text-17, text-34 …) และ leading ถ้าเป็นหัวเรื่อง
    บรรทัดสุดท้ายสั้นกว่า (last) ให้ดูเป็นย่อหน้า ไม่ใช่กล่องทึบ */
export function Lines({
  className,
  lines = 1,
  last = "60%",
  tone = "light",
}: {
  className?: string;
  lines?: number;
  last?: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex h-[1lh] items-center">
          <div
            className={cx(TONE[tone], "rounded-control h-[0.6lh]")}
            style={{ width: i === lines - 1 ? last : "100%" }}
          />
        </div>
      ))}
    </div>
  );
}

/** กรอบแทนปุ่มสูง 48px (§3) */
export function ButtonBox({ className }: { className?: string }) {
  return <div className={cx("border-concrete rounded-control h-12 border", className)} />;
}

/** หัวหน้าเนื้อหา: h1 + ย่อหน้านำ — ระยะเดียวกับ Page ใน Shell.tsx */
export function PageHead({ lead = 1 }: { lead?: number }) {
  return (
    <>
      <Lines className="text-34 w-48 leading-[1.2]" last="100%" />
      <Lines className="text-17 mt-2 max-w-[70ch]" lines={lead} last="70%" />
    </>
  );
}

/** โครงหน้าเนื้อหา (คอนเทนเนอร์เดียวกับ Page) + ประกาศสถานะให้โปรแกรมอ่านจอ ส่วนภาพซ่อนจาก AT */
export function PageSkeleton({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Shell className="py-10">
      <div role="status">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true">{children}</div>
      </div>
    </Shell>
  );
}
