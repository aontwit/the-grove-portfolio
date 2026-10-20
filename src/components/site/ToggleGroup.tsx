"use client";

import { cx } from "@/lib/utils";

/* แถวปุ่มเลือกค่าเดียวจากหลายค่า — ใช้กับสลับมุมมอง เลือกชั้น และกรองสถานะ
   aria-pressed อยู่ที่นี่ที่เดียว จะได้ไม่มีแถวไหนลืมใส่ */

const SIZE = {
  /* ปุ่มหลักของการควบคุมมุมมอง — สูง 48px ตาม §3 */
  control: {
    base: "rounded-control text-15 h-12 px-5 font-medium",
    on: "bg-pine text-on-pine",
    off: "border-ironwood text-ironwood border-[1.5px] bg-transparent",
  },
  /* chip กรอง/เลือกชั้น — เล็กกว่า รองจากปุ่มมุมมอง */
  pill: {
    /* §3: pill ใช้กับ chip สถานะเท่านั้น — ปุ่มกรองเป็นปุ่ม จึงใช้ radius ของ control */
    base: "rounded-control text-13 inline-flex min-h-11 items-center border px-4 font-medium",
    on: "bg-pine text-on-pine border-pine",
    off: "border-concrete text-moss bg-transparent",
  },
} as const;

export function ToggleGroup<T extends string>({
  label,
  size = "control",
  options,
  value,
  onSelect,
  className,
}: {
  label: string;
  size?: keyof typeof SIZE;
  options: readonly { id: T; label: string }[];
  value: T;
  onSelect: (id: T) => void;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <div role="group" aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(o.id)}
            className={cx(s.base, active ? s.on : s.off)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
