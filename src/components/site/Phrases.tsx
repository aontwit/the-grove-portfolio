import { Fragment } from "react";

/* ขึ้นบรรทัดใหม่ระหว่างวลี ไม่ใช่กลางวลีหรือกลางชื่อ
   ภาษาไทย (และจีน) ไม่เว้นวรรคระหว่างคำ ตัวตัดบรรทัดของเบราว์เซอร์จึงตัดที่ขอบคำไหนก็ได้ — เคยตัด "@ชา|กบก" กลางชื่อโครงการ
   และ "หน้าจอนี้ | ก่อน แล้วค่อย…" กลางประโยค · แต่ละวลีเป็น inline-block: ย้ายลงบรรทัดใหม่ทั้งก้อน
   และยังตัดข้างในได้เมื่อวลียาวกว่าทั้งบรรทัด (จอแคบไม่ล้นแนวนอน ต่างจาก whitespace-nowrap) */

/** วลีต่อกันเป็นประโยค — joiner คือสิ่งที่คั่นระหว่างวลี (ไทย/อังกฤษ = เว้นวรรค · จีน = ไม่มี) */
export function Phrases({ parts, joiner = " " }: { parts: readonly string[]; joiner?: string }) {
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && joiner}
      <span className="inline-block">{part}</span>
    </Fragment>
  ));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** ประโยคเดียวที่มีชื่อเฉพาะอยู่ข้างใน (ชื่อแบบบ้าน ชื่อโครงการ) — ชื่อไม่ถูกตัดกลาง */
export function KeepNames({ text, names }: { text: string; names: readonly string[] }) {
  const keep = names.filter(Boolean);
  if (keep.length === 0) return text;
  const pattern = new RegExp(`(${keep.map(escape).join("|")})`);
  return text.split(pattern).map((piece, i) =>
    keep.includes(piece) ? (
      <span key={i} className="inline-block">
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}
