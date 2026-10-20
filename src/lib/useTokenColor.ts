"use client";

import { useEffect, useState } from "react";

/* อ่านค่าสี token จาก CSS ตอน runtime — ให้ 3D ใช้สีเดียวกับ UI ได้โดยไม่ต้องคัดลอก hex
   (DESIGN-SPEC §1: hex ของ UI อยู่ที่ globals.css ที่เดียว) */
export function useTokenColor(name: string) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || null);
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, [name]);

  return value;
}
