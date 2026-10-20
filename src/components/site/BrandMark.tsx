import { cx } from "@/lib/utils";

/* โลโก้ The Grove (แบรนด์สมมติของงานพอร์ต) — เส้นเดียวกันทั้งชุด
   - สัญลักษณ์: ต้นไม้สามต้นสูงต่ำ (ดงไม้ = grove) บนเส้นดิน
   - ตัวอักษร: "THE" sans ตัวเล็กถ่างกว้าง (§2 tracking-caps) เหนือ "GROVE" serif display ตัวพิมพ์ใหญ่ น้ำหนัก 600
     (เส้นบางของ Noto Serif Display ที่ 21px หายบนจอ 1x ถ้าเบากว่านี้ — §2 ยกเว้นให้โลโก้)
   สีมาจาก currentColor ทั้งหมด — ผู้เรียกกำหนดด้วย class token (text-pine บนพื้นสว่าง, text-citron บนแถบเข้ม)
   ชุดเส้นเดียวกันนี้คัดลอกไว้ใน app/icon.svg (favicon ต้องเป็นไฟล์ SVG ล้วน) — แก้ที่หนึ่งต้องแก้อีกที่ */

/** path ของสัญลักษณ์ใน viewBox 0 0 28 32 — ใช้ร่วมกับ icon.svg (แปลงพิกัดด้วย transform ที่นั่น) */
const GROUND = "M2 29h24";
const TRUNKS = "M14 29V15M6.5 29v-6.5M21.5 29v-5";
const CROWN_TALL = "M14 15a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z";
const CROWN_LEFT = "M6.5 22.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z";
const CROWN_RIGHT = "M21.5 24a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z";

/** สัญลักษณ์อย่างเดียว — ตกแต่ง (aria-hidden) ชื่อแบรนด์ต้องมาจากข้อความข้างๆ หรือ label ของลิงก์ */
export function BrandSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={GROUND} />
      <path d={TRUNKS} />
      <path d={CROWN_TALL} />
      <path d={CROWN_LEFT} />
      <path d={CROWN_RIGHT} />
    </svg>
  );
}

/** สัญลักษณ์ + ตัวอักษร — ข้อความเป็น HTML จริง (lang="en") ชื่อที่โปรแกรมอ่านจอได้ยินจึงตรงกับที่ตาเห็น
    ความสูงรวม 36px พอดีแถวหัวเว็บ (min-h-11) ไม่ดันความสูง header */
export function Wordmark({
  className,
  symbolClassName = "text-pine",
}: {
  className?: string;
  /** สีของสัญลักษณ์ — ตัวอักษรใช้สีของตัวแม่ */
  symbolClassName?: string;
}) {
  return (
    <span lang="en" className={cx("inline-flex items-center gap-2.5", className)}>
      <BrandSymbol className={cx("h-9 w-auto shrink-0", symbolClassName)} />
      <span className="flex flex-col items-center leading-none">
        <span className="text-13 tracking-caps mb-1 pl-[0.24em] font-medium">THE</span>
        <span className="font-display text-21 tracking-mark font-semibold">GROVE</span>
      </span>
    </span>
  );
}
