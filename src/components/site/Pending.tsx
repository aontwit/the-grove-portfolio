import type { ReactNode } from "react";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cx } from "@/lib/utils";

/* ค่าที่เจ้าของโครงการยังไม่ได้ให้มา (null ใน site.json) — แสดงตรงๆ ว่ารออยู่ ไม่เติมเลขที่ดูเหมือนจริง
   footer, หน้านโยบาย, หน้าเงื่อนไข และฟอร์มลงทะเบียนใช้คำเดียวกันจากที่นี่
   ไฟล์นี้ใช้ได้ทั้ง server และ client — ภาษาส่งเข้ามาทาง prop lang (ไม่ใส่ = ไทย) */

export const PENDING = getDictionary("th").common.pending;

/** ค่าจริงถ้ามี ไม่มีก็ "รอข้อมูลจริง" สีรอง — อ่านออกทันทีว่ายังไม่ใช่ข้อมูล */
export function OrPending({
  value,
  children,
  lang = "th",
}: {
  value: unknown;
  children?: ReactNode;
  lang?: Locale;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-moss">{getDictionary(lang).common.pending}</span>;
  }
  return <>{children ?? String(value)}</>;
}

/** รายการ ป้าย–ค่า ของข้อมูลโครงการ/เอกสาร · ป้ายบน ค่าล่าง เพราะป้ายภาษาไทยยาว
    ("ใบอนุญาตจัดสรรที่ดิน") ถ้าวางข้างกันบนมือถือค่าจะเหลือที่แคบ */
export function InfoList({
  rows,
  className,
  lang = "th",
}: {
  rows: readonly { label: string; value: unknown; display?: ReactNode }[];
  className?: string;
  lang?: Locale;
}) {
  return (
    <dl className={cx("text-15 flex flex-col gap-3", className)}>
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="font-medium">{r.label}</dt>
          <dd className="tabular-nums">
            <OrPending value={r.value} lang={lang}>
              {r.display}
            </OrPending>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** หัวข้อหนึ่งในเอกสารกฎหมาย (นโยบายความเป็นส่วนตัว / เงื่อนไข) — เว้นบนมากกว่าล่าง บรรทัดไม่เกิน 65 ตัวอักษร */
export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2 id={id} className="text-26">
        {title}
      </h2>
      <div className="text-17 mt-4 flex max-w-[65ch] flex-col gap-4">{children}</div>
    </section>
  );
}

/** หัวเอกสารกฎหมาย: สถานะร่าง + เลขฉบับ + วันที่มีผล */
export function DocStatus({
  doc,
  lang = "th",
}: {
  doc: { version: string; draft: boolean; effectiveDate: string | null };
  lang?: Locale;
}) {
  const t = getDictionary(lang);
  return (
    <div className="border-concrete rounded-card mt-8 border p-5">
      {doc.draft && (
        <>
          <p className="font-display text-17 font-medium">{t.doc.draftTitle}</p>
          <p className="text-15 text-moss mt-1 max-w-[62ch]">
            {t.doc.draftBefore}
            <span className="whitespace-nowrap">“{t.common.pending}”</span>
            {t.doc.draftAfter}
          </p>
        </>
      )}
      <dl
        className={cx(
          "text-15 flex flex-wrap gap-x-8 gap-y-1 tabular-nums",
          doc.draft && "border-concrete mt-4 border-t pt-4",
        )}
      >
        <div className="flex gap-2">
          <dt className="text-moss">{t.doc.version}</dt>
          <dd>{doc.version}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-moss">{t.doc.effective}</dt>
          <dd>
            <OrPending value={doc.effectiveDate} lang={lang}>
              {doc.effectiveDate && formatDate(doc.effectiveDate, lang)}
            </OrPending>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** "2026-10-02" → "2 ตุลาคม 2569" / "2 October 2026" (เขตเวลากรุงเทพฯ) */
export function formatDate(iso: string, lang: Locale = "th") {
  return new Intl.DateTimeFormat(getDictionary(lang).dateLocale, {
    dateStyle: "long",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${iso}T00:00:00+07:00`));
}
