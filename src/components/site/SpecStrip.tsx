import { cx } from "@/lib/utils";

/* แถบค่าจริงพาดเต็มความกว้าง — ยืมรูปแบบมาจาก title block ของแบบเขียน:
   ป้ายเล็กบน ค่าใหญ่ล่าง เรียงเป็นช่อง น้ำหนักเท่ากันทุกช่อง
   ไม่มีช่องไหนเป็นพระเอก ไม่มีสีเน้น — ต่างจาก hero-metric ที่ §7 ห้าม ตรงที่นี่คือตารางค่า ไม่ใช่การอวดตัวเลข
   คั่นช่องด้วยช่องไฟ ไม่ใช่เส้น เส้นในกริดที่ตัดบรรทัดจะวิ่งผิดที่เสมอตอนจอแคบ */

/* หน่วยต้องติดกับตัวเลขตัวสุดท้ายเสมอ — "8.91 ล้าน" ห้ามตัดเหลือ "ล้าน" ลอยบรรทัดใหม่
   จึงเปลี่ยนช่องว่างสุดท้ายเป็น no-break space ช่วงตัวเลขยังตัดหลังขีด "–" ได้ถ้าจอแคบจริง */
const keepUnit = (value: string) => value.replace(/ (?=\S+$)/, "\u00A0");

/** ป้ายใช้สีข้อความรองของพื้นนั้นตาม §1 — ash บนหมึก, moss บนพื้นสว่าง */
const LABEL = { ink: "text-ash", light: "text-moss" } as const;

export function SpecStrip({
  items,
  tone = "ink",
  className,
}: {
  items: readonly { label: string; value: string }[];
  tone?: keyof typeof LABEL;
  className?: string;
}) {
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-10 gap-y-8 border-y border-current/20 py-8 md:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className={cx("text-13 font-medium", LABEL[tone])}>{item.label}</dt>
          <dd className="font-display text-21 md:text-26 mt-2 font-medium tabular-nums">
            {keepUnit(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
