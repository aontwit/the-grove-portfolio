"use client";

import { useEffect, useState } from "react";
import { leadSchema, type Lead } from "./schemas";

/* ผู้ลงทะเบียนในโหมดเดโม — แยกจาก demo.ts (2026-10-02 งานความเร็ว): leadSchema ลาก zod (~95 KB) ทั้งก้อน
   เข้า JS ของทุกหน้าที่วาดแปลง (useLivePlots) รวมหน้าแรก · ไฟล์นี้ import เฉพาะหน้าลงทะเบียนกับหลังบ้าน
   ponytail: หายไปพร้อม demo.ts ใน B3 */

/* ── ผู้ลงทะเบียน ─────────────────────────────────────────────────────────────
   รูปแบบที่ฟอร์ม /register บันทึกจริง (ฟอร์ม + เวลา + หลักฐานความยินยอม) อยู่ที่ leadSchema
   แถวที่อ่านไม่ผ่านถูกข้าม ไม่ทำให้หน้าพัง · แถวเก่าที่ส่งก่อนมีช่องใหม่ได้ค่า default จาก schema */

const LEADS_KEY = "grove.leads";

export const storedLeadSchema = leadSchema;
export type StoredLead = Lead;

function readLeads(): StoredLead[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(LEADS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((r) => {
      const parsed = storedLeadSchema.safeParse(r);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

/** บันทึก lead · คืน duplicate = เบอร์เดิม + แปลงเดิมเคยบันทึกไว้แล้วในเครื่องนี้ (ไม่บันทึกซ้ำ)
    เป็น async ไว้ก่อน — phase หลังเปลี่ยนเป็นเรียก API โดยฟอร์มไม่ต้องแก้ */
export async function submitLead(lead: StoredLead): Promise<{ duplicate: boolean }> {
  const leads = readLeads();
  const duplicate = leads.some((l) => l.phone === lead.phone && l.plotId === lead.plotId);
  if (duplicate) return { duplicate };
  try {
    window.localStorage.setItem(LEADS_KEY, JSON.stringify([...leads, lead]));
    /* แท็บเดียวกันไม่ได้รับ storage event — แจ้งเองให้ useLeads ในแท็บนี้อ่านใหม่ */
    window.dispatchEvent(new StorageEvent("storage", { key: LEADS_KEY }));
  } catch {
    /* เบราว์เซอร์ปิด storage อยู่ — ยังถือว่าส่งสำเร็จในโหมดตัวอย่าง */
  }
  return { duplicate };
}

/** ใหม่สุดก่อน · null = ยังไม่ได้อ่าน storage (รอบ render จาก server) */
export function useLeads() {
  const [leads, setLeads] = useState<StoredLead[] | null>(null);
  useEffect(() => {
    const load = () => setLeads(readLeads().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LEADS_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return leads;
}
