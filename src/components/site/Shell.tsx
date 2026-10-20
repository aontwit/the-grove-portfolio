import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/* โครงหน้าของทั้งเว็บอยู่ในไฟล์นี้ไฟล์เดียว — ความกว้างคอนเทนเนอร์ จังหวะเว้นบน
   และรูปแบบหัวเรื่อง ห้ามมี max-w หรือ px ของคอนเทนเนอร์ไปโผล่ในไฟล์หน้า
   แก้ที่นี่ = เปลี่ยนพร้อมกันทั้ง header footer และทุกหน้า */

/** ความกว้างสูงสุดของเนื้อหา — ผังโครงการ (ผัง 900px + panel 21rem) เป็นตัวกำหนดค่านี้ */
const CONTAINER = "mx-auto w-full max-w-[88rem] px-6";

/** narrow ใช้กับหน้าที่เนื้อหาเป็นข้อความหรือฟอร์ม ซึ่งยืดเต็มความกว้างแล้วอ่านยากขึ้น
    จำกัดแค่ความกว้างของเนื้อหาด้านใน ขอบซ้ายยังตรงกับ header/footer ไม่ลอยมาอยู่กลางจอ */
const WIDTH = { full: undefined, narrow: "max-w-[61rem]" } as const;

export function Shell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx(CONTAINER, className)}>{children}</div>;
}

/** หน้าเนื้อหาปกติ: h1 + ย่อหน้านำ แล้วตามด้วยเนื้อหา — ทุกหน้าใช้จังหวะเดียวกัน
    เป็น <div> ไม่ใช่ <main> — landmark <main id="content"> อยู่ที่ (site)/layout.tsx ที่เดียว */
export function Page({
  title,
  lead,
  width = "full",
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  return (
    <div className={cx(CONTAINER, "py-10")}>
      <div className={WIDTH[width]}>
        <h1 className="text-34">{title}</h1>
        {lead && <p className="text-17 text-moss mt-2 max-w-[70ch]">{lead}</p>}
        {children}
      </div>
    </div>
  );
}

/* ส่วนย่อยในหน้า: h2 + ย่อหน้านำ
   md = หน้าเนื้อหา · lg = หน้าแรก ซึ่งหัวเรื่องต้องมีน้ำหนักพอจะเป็นจุดพักสายตาเองได้
   §2 มีสเกลถึง 60 อยู่แล้ว ความต่างระหว่างหัวเรื่องกับเนื้อหาจึงไม่ควรหยุดที่ 26/17 */
const SECTION = {
  md: { gap: "pt-20", title: "text-26", lead: "text-17 mt-2" },
  lg: { gap: "pt-28", title: "text-34 lg:text-46 max-w-[20ch] text-balance", lead: "text-21 mt-5" },
} as const;

export function Section({
  title,
  lead,
  scale = "md",
  layout = "stack",
  className,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  scale?: keyof typeof SECTION;
  /** split = หัวเรื่องอยู่คอลัมน์ซ้ายและค้างไว้ขณะอ่านเนื้อหาทางขวา
      วางแบบไม่สมมาตรทำให้หน้าไม่ใช่กองบล็อกที่หัวเรื่องลอยอยู่ข้างบนทุกอันเท่ากัน */
  layout?: "stack" | "split";
  className?: string;
  children: ReactNode;
}) {
  const s = SECTION[scale];
  const head = (
    <>
      <h2 className={s.title}>{title}</h2>
      {lead && <p className={cx(s.lead, "text-moss max-w-[46ch]")}>{lead}</p>}
    </>
  );
  if (layout === "split") {
    return (
      <section className={cx(s.gap, className)}>
        <div className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-10 lg:self-start">{head}</div>
          <div>{children}</div>
        </div>
      </section>
    );
  }
  return (
    <section className={cx(s.gap, className)}>
      {head}
      {children}
    </section>
  );
}

/* แถบเต็มขอบจอ — §1 ใหม่ให้หน้ามีสองพื้น แถบหมึกคือจังหวะเข้มที่คั่นแผ่นแบบสว่าง
   ข้อความบนแถบ ink ต้องเป็น chalk / ash / citron เท่านั้น */
const BAND = {
  paper: "bg-paper border-concrete border-y",
  canvas: "bg-canvas border-concrete border-y",
  ink: "bg-ink text-chalk",
} as const;

export function Band({
  tone = "paper",
  className,
  children,
}: {
  tone?: keyof typeof BAND;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx(BAND[tone], className)}>{children}</div>;
}
