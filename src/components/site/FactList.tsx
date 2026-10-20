import { cx } from "@/lib/utils";

/* ตารางค่าจริงของ object หนึ่งตัว (แปลง / แบบบ้าน / โครงการ) — ป้ายซ้าย ค่าขวา
   ตัวเลขทุกตัวเป็น tabular-nums ตาม §2 จะได้เรียงตรงหลักกันเวลาอ่านไล่ลงมา */

const SIZE = {
  md: { label: "text-15", value: "text-17" },
  /* lg ใช้ตอนรายการนี้คือเนื้อหาหลักของ section ไม่ใช่ข้อมูลประกอบในการ์ด */
  lg: { label: "text-17", value: "text-21" },
} as const;

/** สีป้ายและเส้นคั่นตามพื้น (§1) — moss/concrete บนพื้นสว่าง · ash บนแถบหมึก (เส้นคั่นเป็นสีตัวอักษรจาง) */
const TONE = {
  light: { label: "text-moss", rule: "border-concrete" },
  ink: { label: "text-ash", rule: "border-current/20" },
} as const;

export function FactList({
  rows,
  divided = false,
  size = "md",
  tone = "light",
  className,
}: {
  rows: readonly (readonly [string, string])[];
  /** มีเส้นคั่นรายแถว — ใช้เมื่อรายการยาวและต้องกวาดสายตาข้ามคอลัมน์ */
  divided?: boolean;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  const s = SIZE[size];
  const c = TONE[tone];
  return (
    <dl className={cx(s.label, "flex flex-col", divided ? "gap-3" : "gap-1.5", className)}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className={cx(
            "flex items-baseline justify-between gap-4",
            divided && cx(c.rule, "border-b pb-3"),
          )}
        >
          <dt className={c.label}>{label}</dt>
          <dd className={cx("font-display font-medium tabular-nums", s.value)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
