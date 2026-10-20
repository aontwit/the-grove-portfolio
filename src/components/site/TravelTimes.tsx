import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { km } from "@/lib/format";
import { cx } from "@/lib/utils";

/* แถบเวลาเดินทาง — ความยาวแถบคือจำนวนนาทีจริงจาก site.location.nearby ไม่ใช่ภาพประกอบ
   data มีแค่ระยะกับเวลา ไม่มีทิศ จึงวาดเป็นไม้บรรทัดเวลา ไม่วาดเป็นแผนที่ที่ต้องเดาทิศเอง
   สเกลล็อกทุก 10 นาที เส้นแบ่งชุดเดียวกันทุกแถว เทียบกันได้ด้วยตา
   ค่าทำเลเป็นค่าโดยประมาณ (schemas.ts) — กำกับ "ประมาณ" ทุกแถว ไม่ใช่แค่ท้ายภาพ */

type Place = { name: string; km: number; mins: number };

export function TravelTimes({
  places,
  lang,
  className,
}: {
  /** สถานที่ของภาษาหน้า (repo.getSite(lang).location.nearby) */
  places: Place[];
  lang: Locale;
  className?: string;
}) {
  const t = getDictionary(lang).travel;
  const sorted = [...places].sort((a, b) => a.mins - b.mins);
  const max = Math.ceil(Math.max(...sorted.map((p) => p.mins)) / 10) * 10;
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);

  return (
    <figure className={className}>
      <ol className="flex flex-col gap-5">
        {sorted.map((p) => (
          <li key={p.name}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-17">{p.name}</span>
              <span className="font-display text-17 shrink-0 font-medium tabular-nums">
                <span className="text-moss text-15 mr-1.5 font-normal">{t.approx}</span>
                {t.minutes(p.mins)}
                <span className="text-moss text-15 ml-2 font-normal">{km(p.km, lang)}</span>
              </span>
            </div>
            <div className="bg-concrete relative mt-2 h-2" aria-hidden="true">
              <div
                className="bg-pine absolute inset-y-0 left-0"
                style={{ width: `${(p.mins / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      {/* สเกลบาร์เวลา — §0 ภาษาแบบเขียน ใช้เป็นข้อมูลจริงของแผนภาพนี้ */}
      <div className="relative mt-4 h-5" aria-hidden="true">
        {ticks.map((t) => (
          <span
            key={t}
            className={cx(
              "text-13 text-moss font-display absolute top-0 font-medium tabular-nums",
              t === 0 ? "" : t === max ? "-translate-x-full" : "-translate-x-1/2",
            )}
            style={{ left: `${(t / max) * 100}%` }}
          >
            {t}
          </span>
        ))}
      </div>
      <figcaption className="text-13 text-moss mt-1">{t.caption}</figcaption>
    </figure>
  );
}
