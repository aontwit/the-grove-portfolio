"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { splitLocale } from "@/i18n/config";
import { useCompact } from "@/lib/media";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/* Inertia scroll (Lenis) ใช้เฉพาะหน้าที่มีฉากผูกกับตำแหน่ง scroll โดยตรง
   ตอนนี้มีหน้าเดียว: ฉากเปิดหน้าแรก (HeroDiorama) ที่แยกชิ้นบ้านตามระยะเลื่อน —
   ถ้าตำแหน่งกระโดดเป็นขั้นตามล้อเมาส์ ภาพก็กระตุกตาม ไม่ว่าจะ interpolate ฝั่ง 3D ดีแค่ไหน
   หน้าอื่นใช้ scroll ของเบราว์เซอร์ตามปกติ: ไม่มี rAF loop ค้างทุกหน้า และไม่ไปแย่งการเลื่อน
   ของม้วนภาพแนวนอน (แกลเลอรี) หรือผังโครงการ
   ปิดทั้งหมดเมื่อผู้ใช้ขอ reduced motion และบนจอสัมผัส/จอแคบ (§4: มือถือห้ามดักการเลื่อน — เลื่อนแบบ native ล้วน) */

/** path ที่มีฉาก scroll-scrub (§4 อนุญาตเฉพาะท่อนที่ระบุชื่อ) — เพิ่มหน้าใหม่ที่นี่ที่เดียว */
const SCRUB_ROUTES: ReadonlySet<string> = new Set(["/"]);

/* ผู้ฟังการเลื่อนของ Lenis — ฉากที่ผูกกับ scroll อ่านตำแหน่งใหม่ทุกครั้งที่ Lenis ขยับ
   (นอกจาก scroll event ของเบราว์เซอร์) ไม่ต้องรู้ว่า Lenis เปิดอยู่หรือไม่ */
const listeners = new Set<() => void>();

/** ฟังการเลื่อนของ Lenis — คืนฟังก์ชันเลิกฟัง */
export function onSmoothScroll(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** ปุ่มที่เบราว์เซอร์กระโดดเองโดยไม่ผ่าน Lenis */
const JUMP_KEYS: ReadonlySet<string> = new Set(["Home", "End", "PageUp", "PageDown"]);

export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  /* path ไม่มี prefix ภาษา — หน้าแรกภาษาอังกฤษ (/en) ก็มีฉากเดียวกัน */
  const { path } = splitLocale(usePathname());
  const enabled = !reduced && !compact && SCRUB_ROUTES.has(path);

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    const off = lenis.on("scroll", () => listeners.forEach((fn) => fn()));
    let frame = requestAnimationFrame(function loop(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });

    /* กระโดดที่ไม่ได้มาจากล้อเมาส์ (Home/End, ลิงก์ #ในหน้า, ปุ่ม back) ระหว่างที่ Lenis ยังไหลไปเป้าเดิม
       Lenis ไม่ฟัง scroll ของเบราว์เซอร์ตอนกำลังไหล แล้วลากหน้ากลับไปเป้าเก่าในเฟรมถัดไป
       หยุดการไหลก่อน ให้ตำแหน่งใหม่ของเบราว์เซอร์เป็นจุดตั้งต้น (stop/start = reset ภายในของ Lenis) */
    const settle = () => {
      if (lenis.isScrolling !== "smooth") return;
      lenis.stop();
      lenis.start();
    };
    const onKey = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.key)) settle();
    };
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (a?.getAttribute("href")?.startsWith("#")) settle();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", settle);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", settle);
      off();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
