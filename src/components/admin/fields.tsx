"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { PlotStatus } from "@/lib/schemas";
import { STATUSES, STATUS_CHIP, STATUS_SHORT_TH, STATUS_TH } from "@/lib/status";
import { baht, cx } from "@/lib/utils";

/* ช่องกรอกของหลังบ้าน — หน้าตาเดียวกับฟอร์มลงทะเบียนหน้าเว็บ
   บันทึกตอนออกจากช่องหรือกด Enter ไม่ต้องมีปุ่มบันทึกแยก (ค่าเดิมดูได้จากป้าย "เดิม …") */

export const FIELD =
  "bg-paper text-ironwood border-moss rounded-control text-15 w-full border px-3.5 aria-[invalid=true]:border-teak";

/** ปุ่มข้อความ สำหรับการกระทำรองในแถว (คืนค่า เอาออก) */
export const TEXT_BUTTON =
  "text-15 text-pine rounded-control -mx-2 inline-flex h-10 items-center px-2 font-medium underline-offset-4 hover:underline";

/* chip ที่เลือกอยู่ต้องเด่นกว่า chip ที่ไม่ได้เลือก — พื้นคู่สถานะ + ขอบสีตัวอักษรของสถานะนั้น + ตัวหนาขึ้น */
const SELECTED_BORDER: Record<PlotStatus, string> = {
  available: "border-st-available",
  unconfirmed: "border-st-unconfirmed border-dashed",
  reserved: "border-st-reserved",
  sold: "border-st-sold",
};

/** เลือกสถานะแปลง — radio จริง (ลูกศรซ้าย-ขวาเปลี่ยนค่าได้) แสดงเป็น chip สีเดียวกับหน้าเว็บ */
export function StatusPicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: PlotStatus;
  onChange: (s: PlotStatus) => void;
}) {
  return (
    <fieldset className="flex gap-1.5">
      <legend className="sr-only">{label}</legend>
      {STATUSES.map((s) => (
        <label
          key={s}
          className={cx(
            "rounded-pill text-13 has-[:focus-visible]:outline-pine flex h-9 cursor-pointer items-center border-[1.5px] px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
            /* transition = §4 "สถานะเปลี่ยน (สี lerp)" */
            "transition-colors duration-200 motion-reduce:transition-none",
            value === s
              ? cx(STATUS_CHIP[s], SELECTED_BORDER[s], "font-semibold")
              : "border-concrete text-moss hover:text-ironwood font-medium",
          )}
        >
          <input
            type="radio"
            name={name}
            value={s}
            checked={value === s}
            onChange={() => onChange(s)}
            className="sr-only"
          />
          {/* คำสั้นบน chip (แถวแคบ) — คำเต็มให้โปรแกรมอ่านจอ · คำเดียวกันอยู่แล้วไม่ซ้ำสองชิ้น */}
          {STATUS_SHORT_TH[s] === STATUS_TH[s] ? (
            STATUS_TH[s]
          ) : (
            <>
              <span aria-hidden>{STATUS_SHORT_TH[s]}</span>
              <span className="sr-only">{STATUS_TH[s]}</span>
            </>
          )}
        </label>
      ))}
    </fieldset>
  );
}

const show = (n: number | null) => (n === null ? "" : baht(n));

/** ช่องราคา — พิมพ์มีจุลภาคหรือไม่มีก็ได้ · error บอกวิธีแก้ (§6)
    emptyHint = เว้นว่างได้ (แปลงที่ยังไม่มีราคารายแปลง) แสดงคำนี้เป็น placeholder และบันทึกเป็น null */
export function PriceField({
  label,
  value,
  original,
  onCommit,
  emptyHint,
  className,
}: {
  label: string;
  value: number | null;
  original: number | null;
  onCommit: (n: number | null) => void;
  emptyHint?: string;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(show(value));
  const [error, setError] = useState<string | null>(null);
  /* ยืนยันว่าบันทึกแล้ว — เครื่องหมายถูกในกรอบจางเข้า 150ms ออก 200ms (§4 ตอบการกระทำ) ไม่ดันความสูงแถว
     หายเองหลัง 3 วินาทีหรือเมื่อเริ่มพิมพ์ใหม่ · คำ "บันทึกแล้ว" อยู่ใน note แบบ sr-only ให้โปรแกรมอ่านจอ */
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(show(value)), [value]);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const commit = () => {
    const raw = draft.replace(/[,\s]/g, "");
    if (raw === "" && emptyHint !== undefined) {
      setError(null);
      if (value !== null) {
        onCommit(null);
        setSaved(true);
      }
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      setError("ใส่ราคาเป็นตัวเลขเต็มบาท เช่น 4,290,000");
      setSaved(false);
      return;
    }
    setError(null);
    setDraft(baht(n));
    if (n !== value) {
      onCommit(n);
      setSaved(true);
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {/* หน่วยวางข้างช่องในกรอบเดียวกัน ไม่ซ้อนทับ input */}
      <div
        className={cx(
          FIELD,
          "has-[:focus-visible]:outline-pine flex h-10 items-center gap-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[[aria-invalid=true]]:border-teak",
        )}
      >
        <input
          id={id}
          inputMode="numeric"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          onBlur={commit}
          placeholder={emptyHint}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-invalid={error !== null}
          aria-describedby={`${id}-note`}
          className="font-display min-w-0 flex-1 bg-transparent text-right font-medium tabular-nums focus-visible:outline-none"
        />
        <Check
          aria-hidden="true"
          className={cx(
            "text-pine size-4 shrink-0 transition-opacity motion-reduce:transition-none",
            saved ? "ease-settle opacity-100 duration-150" : "opacity-0 duration-200",
          )}
        />
        <span className="text-13 text-moss">บาท</span>
      </div>
      {/* aria-live: โปรแกรมอ่านจอบอก "บันทึกแล้ว" และ error โดยไม่ต้องย้ายโฟกัส */}
      <p id={`${id}-note`} aria-live="polite" className="text-13 mt-1 min-h-[1.65em]">
        {error ? (
          <span className="text-teak font-medium">{error}</span>
        ) : (
          <>
            {saved && <span className="sr-only">บันทึกแล้ว </span>}
            {value !== original && (
              <span className="text-moss tabular-nums">
                เดิม {original === null ? (emptyHint ?? "ไม่มี") : baht(original)}
              </span>
            )}
          </>
        )}
      </p>
    </div>
  );
}

/** ช่องข้อความที่ห้ามว่าง (ชื่อแบบบ้าน จุดเด่น คำอธิบายรูป) */
export function TextField({
  label,
  value,
  onCommit,
  emptyError,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onCommit: (s: string) => void;
  emptyError: string;
  multiline?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setError(emptyError);
      return;
    }
    setError(null);
    if (next !== value) onCommit(next);
  };

  const shared = {
    id,
    value: draft,
    onBlur: commit,
    "aria-invalid": error !== null,
    "aria-describedby": `${id}-note`,
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-15 font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          className={cx(FIELD, "py-3")}
        />
      ) : (
        <input
          {...shared}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={cx(FIELD, "h-12")}
        />
      )}
      {(error || hint) && (
        <p id={`${id}-note`} className="text-13">
          {error ? (
            <span className="text-teak font-medium">{error}</span>
          ) : (
            <span className="text-moss">{hint}</span>
          )}
        </p>
      )}
    </div>
  );
}
