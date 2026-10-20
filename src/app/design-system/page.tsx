"use client";

import { useEffect, useRef, useState } from "react";

/* หน้า dev สำหรับตรวจ token — ไม่ใช่หน้าของผู้ใช้
   ค่าสีทั้งหมดอ่านสดจาก CSS custom property ตอน runtime
   จึงไม่มี hex เขียนซ้ำไว้ในไฟล์นี้ (DESIGN-SPEC §1: hex อยู่ได้ที่ globals.css ที่เดียว) */

const COLOR_TOKENS = [
  { token: "canvas", on: "ironwood", use: "พื้นหลังหลัก (ครีม)" },
  { token: "paper", on: "ironwood", use: "surface ยกระดับ: การ์ด panel ตาราง admin (งาช้าง)" },
  { token: "concrete", on: "ironwood", use: "เส้นขอบ divider (ช่องกรอกใช้พื้น paper)" },
  { token: "ironwood", on: "canvas", use: "ข้อความหลัก (มะกอกเข้ม)" },
  { token: "moss", on: "paper", use: "ข้อความรอง" },
  {
    token: "pine",
    on: "on-pine",
    use: "สี interactive บนพื้นสว่าง: ปุ่ม ลิงก์ focus เส้น dimension (เขียวมะกอก)",
  },
  { token: "teak", on: "canvas", use: "ข้อความ error / ขอบช่องที่กรอกผิด (สลับตามโหมด)" },
  { token: "marigold", on: "on-marigold", use: "ไฮไลต์เชิงความหมาย: ที่เลือกอยู่ (ไม้อุ่น)" },
  { token: "ink", on: "chalk", use: "แถบมะกอกเข้มเต็มจอ เวทีโมเดล 3D" },
  { token: "slate", on: "chalk", use: "พื้นยกระดับบนแถบเข้ม" },
  { token: "citron", on: "on-citron", use: "สี interactive บนแถบเข้ม (ใบอ่อน)" },
  { token: "st-available", on: "st-available-bg", use: "สถานะว่าง" },
  { token: "st-reserved", on: "st-reserved-bg", use: "สถานะจอง" },
  { token: "st-sold", on: "st-sold-bg", use: "สถานะขายแล้ว (เทาขอบหลังคา)" },
] as const;

const TYPE_SCALE = [
  {
    cls: "text-60",
    label: "60 · Noto Serif Display/Thai 400",
    display: true,
    weight: "font-normal",
  },
  {
    cls: "text-46",
    label: "46 · Noto Serif Display/Thai 400",
    display: true,
    weight: "font-normal",
  },
  {
    cls: "text-34",
    label: "34 · Noto Serif Display/Thai 400",
    display: true,
    weight: "font-normal",
  },
  {
    cls: "text-26",
    label: "26 · Noto Serif Display/Thai 500",
    display: true,
    weight: "font-medium",
  },
  {
    cls: "text-21",
    label: "21 · Noto Serif Display/Thai 500",
    display: true,
    weight: "font-medium",
  },
  { cls: "text-17", label: "17 · Anuphan 400 · เนื้อหา", display: false, weight: "font-normal" },
  { cls: "text-15", label: "15 · Anuphan 500 · ปุ่ม ฟอร์ม", display: false, weight: "font-medium" },
  {
    cls: "text-13",
    label: "13 · Anuphan 500 · label หน่วย",
    display: false,
    weight: "font-medium",
  },
] as const;

const SAMPLE = "เดอะ โกรฟ กลับบ้านมาใต้ร่มไม้ 02-000-0000 · Home, under the trees";

function useTokenValues(scopeRef: React.RefObject<HTMLElement | null>) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const node = scopeRef.current;
    if (!node) return;
    const styles = getComputedStyle(node);
    const next: Record<string, string> = {};
    for (const { token } of COLOR_TOKENS) {
      next[token] = styles.getPropertyValue(`--${token}`).trim().toUpperCase();
    }
    setValues(next);
  }, [scopeRef]);

  return values;
}

function TokenSheet({ mode }: { mode: "light" | "dark" }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const values = useTokenValues(rootRef);

  return (
    <div ref={rootRef} className={`${mode} bg-canvas text-ironwood px-6 py-10`}>
      <h2 className="text-26 mb-1">{mode === "light" ? "โหมดสว่าง" : "โหมดมืด"}</h2>
      <p className="text-15 text-moss mb-10">
        ค่าทุกช่องอ่านสดจาก CSS variable ของกล่องนี้ — ถ้าค่าไม่ตรง spec แปลว่า token ผิด
      </p>

      <section className="mb-14">
        <h3 className="text-21 mb-5">สี</h3>
        <ul className="flex flex-col gap-3">
          {COLOR_TOKENS.map(({ token, on, use }) => (
            <li key={token} className="border-concrete rounded-card border p-4">
              <div
                className="rounded-control mb-3 px-4 py-6"
                style={{ backgroundColor: `var(--${token})`, color: `var(--${on})` }}
              >
                <span className="text-17">{SAMPLE}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-15 font-medium">{token}</span>
                <span className="font-display text-15 text-moss tabular-nums">
                  {values[token] ?? "…"}
                </span>
                <span className="text-13 text-moss">{use}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14">
        <h3 className="text-21 mb-5">ขนาดตัวอักษร</h3>
        <ul className="flex flex-col gap-6">
          {TYPE_SCALE.map(({ cls, label, display, weight }) => (
            <li key={cls}>
              <div className="text-13 text-moss mb-1 tabular-nums">{label}</div>
              <p className={`${cls} ${weight} ${display ? "font-display" : "font-sans"}`}>
                {SAMPLE}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14">
        <h3 className="text-21 mb-5">ปุ่ม</h3>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="bg-pine text-on-pine rounded-control text-15 h-12 px-6 font-medium"
          >
            เลือกแปลงจากผัง
          </button>
          <button
            type="button"
            className="border-ironwood text-ironwood rounded-control text-15 h-12 border-[1.5px] px-6 font-medium"
          >
            ดูแปลนบ้าน
          </button>
        </div>
      </section>

      <section className="mb-14">
        <h3 className="text-21 mb-5">สถานะแปลง</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-st-available-bg text-st-available rounded-pill text-13 px-3 py-1.5 font-medium">
            ว่าง
          </span>
          <span className="bg-st-reserved-bg text-st-reserved border-st-reserved rounded-pill text-13 border px-3 py-1.5 font-medium">
            จอง
          </span>
          <span className="bg-st-sold-bg text-st-sold rounded-pill text-13 px-3 py-1.5 font-medium">
            ขายแล้ว
          </span>
        </div>
      </section>

      <section>
        <h3 className="text-21 mb-5">ฟอร์ม</h3>
        <label className="flex max-w-sm flex-col gap-2">
          <span className="text-13 text-moss font-medium">ชื่อ-นามสกุล</span>
          <input
            type="text"
            placeholder="สมชาย ใจดี"
            className="bg-paper text-ironwood border-moss rounded-control text-15 placeholder:text-moss h-12 border px-3.5"
          />
        </label>
      </section>
    </div>
  );
}

export default function StylePage() {
  return (
    <main>
      <div className="bg-canvas px-6 pt-10">
        <h1 className="text-34">Design tokens</h1>
        <p className="text-17 text-moss mt-2 max-w-[70ch]">
          หน้าตรวจ token ของ DESIGN-SPEC §1-§3 สำหรับงานพัฒนา ไม่ใช่หน้าของผู้ใช้
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <TokenSheet mode="light" />
        <TokenSheet mode="dark" />
      </div>
    </main>
  );
}
