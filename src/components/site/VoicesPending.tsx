import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cx } from "@/lib/utils";

/* ที่สำหรับเสียงของผู้อยู่จริง — ยังไม่มีใครย้ายเข้า จึงยังไม่มีอะไรให้ยกมา
   ใช้วิธีเดียวกับหน้าแกลเลอรี: บอกให้ชัดว่าช่องนี้จะเก็บอะไร แล้วรอของจริง
   ดีกว่าแต่งคำชมขึ้นมาเอง ซึ่งคือการปลอมหลักฐาน ไม่ใช่การออกแบบ (§6) */

/* คำถามที่ตั้งใจจะถามอยู่ใน i18n (voices.planned) */
export function VoicesPending({ lang, className }: { lang: Locale; className?: string }) {
  const t = getDictionary(lang).voices;
  return (
    <ul className={cx("grid grid-cols-1 gap-5 md:grid-cols-3", className)}>
      {t.planned.map((item) => (
        <li
          key={item.who}
          className="border-concrete rounded-card bg-canvas flex flex-col justify-between border p-5"
        >
          <div>
            <h3 className="text-17 font-medium">{item.who}</h3>
            <p className="text-15 text-moss mt-2">{item.ask}</p>
          </div>
          <p className="text-13 text-moss mt-8">{t.waiting}</p>
        </li>
      ))}
    </ul>
  );
}
