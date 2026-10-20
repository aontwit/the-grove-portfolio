"use client";

import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/i18n/config";
import type { HouseType, Plot } from "./schemas";

/* ชั้นข้อมูลของโหมดเดโม — admin แก้ค่าที่นี่ เว็บฝั่งลูกค้าอ่านค่าที่นี่ทับข้อมูลจาก repo
   เก็บเฉพาะ "ส่วนที่แก้" ไว้ใน localStorage ของเบราว์เซอร์นี้ ไม่แตะไฟล์ใน src/data
   ponytail: ทั้งไฟล์นี้หายไปใน B3 — Server Actions เขียน DB แล้ว repo คืนค่าที่แก้แล้วมาเอง */

export type PlotEdit = Partial<Pick<Plot, "status" | "price">>;
export type HouseEdit = Partial<Pick<HouseType, "name" | "priceFrom" | "highlight">>;
/** รูปที่อัปโหลดเข้าช่องภาพที่วางแผนไว้ — object URL อยู่ได้แค่ในแท็บนี้ จึงไม่บันทึกลง storage */
export type ShotImage = { src: string; fileName: string; alt: string };

type DemoState = {
  plots: Record<string, PlotEdit>;
  houses: Record<string, HouseEdit>;
  shots: Record<string, ShotImage>;
  /** เก็บเฉพาะค่าที่ต่างจากต้นฉบับ — แก้กลับเป็นค่าเดิมเมื่อไหร่ แถวนั้นก็ไม่นับว่า "แก้แล้ว" */
  editPlot: (original: Plot, patch: PlotEdit) => void;
  resetPlot: (id: string) => void;
  editHouse: (original: HouseType, patch: HouseEdit) => void;
  resetHouse: (id: string) => void;
  setShot: (id: string, image: ShotImage | null) => void;
  resetAll: () => void;
};

export const useDemo = create<DemoState>()(
  persist(
    (set) => ({
      plots: {},
      houses: {},
      shots: {},
      editPlot: (o, patch) => set((s) => ({ plots: put(s.plots, o, patch) })),
      resetPlot: (id) => set((s) => ({ plots: omit(s.plots, id) })),
      editHouse: (o, patch) => set((s) => ({ houses: put(s.houses, o, patch) })),
      resetHouse: (id) => set((s) => ({ houses: omit(s.houses, id) })),
      setShot: (id, image) =>
        set((s) => ({ shots: image ? { ...s.shots, [id]: image } : omit(s.shots, id) })),
      resetAll: () => set({ plots: {}, houses: {} }),
    }),
    {
      name: "grove.admin",
      partialize: (s) => ({ plots: s.plots, houses: s.houses }),
      /* อ่าน storage หลัง hydrate เท่านั้น — HTML จาก server กับรอบแรกของ client ต้องตรงกัน */
      skipHydration: true,
    },
  ),
);

function put<T extends Record<string, unknown>>(
  rec: Record<string, T>,
  original: { id: string },
  patch: T,
): Record<string, T> {
  const merged: Record<string, unknown> = { ...rec[original.id], ...patch };
  const source: Record<string, unknown> = { ...original };
  for (const k of Object.keys(merged)) if (merged[k] === source[k]) delete merged[k];
  return Object.keys(merged).length
    ? { ...rec, [original.id]: merged as T }
    : omit(rec, original.id);
}

function omit<T>(rec: Record<string, T>, id: string) {
  const next = { ...rec };
  delete next[id];
  return next;
}

/** โหลดค่าที่แก้ไว้หลัง mount และตามค่าที่แท็บ admin อีกแท็บเพิ่งบันทึก */
function useDemoSync() {
  useEffect(() => {
    void useDemo.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "grove.admin") void useDemo.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}

/** แปลงจาก repo + สถานะ/ราคาที่ admin แก้ — ทุก component ที่วาดแปลงฝั่งลูกค้าอ่านผ่านตัวนี้ */
export function useLivePlots(plots: Plot[]) {
  useDemoSync();
  const edits = useDemo((s) => s.plots);
  return useMemo(() => plots.map((p) => ({ ...p, ...edits[p.id] })), [plots, edits]);
}

/** แบบบ้านจาก repo + ค่าที่ admin แก้ · หลังบ้านแก้ชื่อและจุดเด่นเป็นภาษาไทยเท่านั้น
    หน้าภาษาอังกฤษ (lang "en") จึงรับเฉพาะตัวเลข ไม่เอาข้อความไทยมาทับชื่อภาษาอังกฤษ */
export function useLiveHouses(houses: HouseType[], lang: Locale = "th") {
  useDemoSync();
  const edits = useDemo((s) => s.houses);
  return useMemo(
    () =>
      houses.map((h) => {
        const e = edits[h.id];
        if (!e) return h;
        return lang === "th" ? { ...h, ...e } : { ...h, ...pickNumbers(e) };
      }),
    [houses, edits, lang],
  );
}

function pickNumbers(e: HouseEdit): HouseEdit {
  return e.priceFrom === undefined ? {} : { priceFrom: e.priceFrom };
}
