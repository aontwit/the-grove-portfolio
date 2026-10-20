"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/site/BrandMark";
import { buttonClass } from "@/components/site/ButtonLink";
import { INTRO_LOADER_ID } from "@/components/site/intro";
import { introProgress } from "@/components/site/introProgress";
import { useDict } from "@/i18n/client";
import { COMPACT_QUERY } from "@/lib/media";

/* intro loader หน้าแรก (DESIGN-SPEC §4 ฉบับแก้ 2026-10-02) — แบบ Seijaku: พื้นหมึก โลโก้ ความคืบหน้า แล้วเปิดม่าน
   - ความคืบหน้าจริงของฉาก 3D เท่านั้น (introProgress: ไฟล์ JS ของฉาก · texture/HDRI · เฟรมแรก) ไม่มีตัวจับเวลาปลอม
   - เปิดม่าน ≤ 0.6 s: ม่านเลื่อนขึ้นด้วย transform อย่างเดียว ไม่ขยับ layout
   - ไม่ขังผู้ชม: รอนานสุด 3.5 s (มือถือ/จอสัมผัส) / 5 s (จอกว้าง) นับจากเริ่มโหลดหน้า แล้วเปิดพร้อมภาพนิ่ง ฉากโหลดต่อข้างหลัง
     · ปุ่มข้ามขึ้นหลัง 1 s · ครั้งเดียวต่อ session · ไม่มีเลยเมื่อ reduced motion หรือกด back (ตัดสินใน INTRO_SCRIPT)
   - HTML จาก server มี element นี้แต่ซ่อนไว้ (CSS) — สคริปต์ inline เปิดก่อนวาดเฟรมแรก ไม่มี JS = ไม่มี loader
     และถ้า JS พังกลางทาง CSS ซ่อน loader เองหลัง 7 s (intro-failsafe ใน globals.css) */

const MAX_WAIT = { compact: 3500, wide: 5000 } as const;
const SKIP_AFTER = 1000;
/** ความยาวการเปิดม่าน (§4: ≤ 0.6 s) */
const REVEAL_MS = 550;

type Phase = "off" | "on" | "gone";

/** ม่านเลื่อนขึ้น — transform อย่างเดียว เบราว์เซอร์รันบน compositor ได้แม้ main thread ไม่ว่าง */
const CURTAIN: Keyframe[] = [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }];
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function IntroLoader() {
  const t = useDict().intro;
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("off");
  const [value, setValue] = useState(0);
  const [skippable, setSkippable] = useState(false);
  const revealRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    /* สคริปต์ inline ไม่ได้เปิด (เคยเห็นแล้ว / reduced motion / back) — ไม่มีอะไรต้องทำ */
    if (!el?.hasAttribute("data-on")) {
      setPhase("gone");
      return;
    }
    setPhase("on");
    const root = document.documentElement;
    const before = root.style.overflow;
    /* ล็อกการเลื่อนหลัง hydrate เท่านั้น — ถ้า JS ไม่มา หน้ายังเลื่อนได้เสมอ */
    root.style.overflow = "hidden";

    /* เส้นตายจองไว้ตั้งแต่ตอนนี้เป็น animation ที่หน่วงเวลาไว้ ไม่ใช่ setTimeout:
       ตอนฉากคอมไพล์ shader main thread ไม่ว่างหลายวินาที ตัวจับเวลาของ JS จะช้าไปด้วย (วัดได้ 7.4 s แทน 5 s)
       animation ของ transform เดินบน compositor จึงเปิดม่านตรงเวลาแม้ main thread ไม่ว่าง
       นับจากเริ่มโหลดหน้า (performance.now) ไม่ใช่จากตอน hydrate */
    const now = performance.now();
    const limit = window.matchMedia(COMPACT_QUERY).matches ? MAX_WAIT.compact : MAX_WAIT.wide;
    const delay = Math.max(0, limit - now);
    const curtain = el.animate(CURTAIN, {
      duration: REVEAL_MS,
      delay,
      easing: EASE_OUT,
      fill: "forwards",
    });
    let open = false;
    const release = () => {
      root.style.overflow = before;
    };
    curtain.onfinish = () => {
      release();
      setPhase("gone");
    };
    /* ฉากพร้อม / พัง / กดข้าม: ข้ามช่วงหน่วง ม่านเริ่มเปิดเดี๋ยวนี้ */
    const reveal = () => {
      if (open) return;
      open = true;
      release();
      if (curtain.currentTime !== null && Number(curtain.currentTime) < delay) {
        curtain.currentTime = delay;
      }
    };
    revealRef.current = reveal;
    let shown = 0;
    const update = () => {
      /* แถบไม่ถอยหลัง — DefaultLoadingManager นับ total ใหม่เมื่อมีไฟล์เพิ่มกลางทาง */
      shown = Math.max(shown, introProgress.value());
      setValue(shown);
      if (introProgress.done()) reveal();
    };
    update();
    const off = introProgress.subscribe(update);
    const skipTimer = window.setTimeout(() => setSkippable(true), Math.max(0, SKIP_AFTER - now));
    return () => {
      off();
      window.clearTimeout(skipTimer);
      curtain.cancel();
      release();
    };
  }, []);

  if (phase === "gone") return null;
  const percent = Math.round(value * 100);

  return (
    <div
      ref={ref}
      id={INTRO_LOADER_ID}
      data-intro-loader=""
      data-on={phase === "off" ? undefined : ""}
      /* สคริปต์ inline เติม data-on ก่อน hydrate — ไม่ใช่ความต่างที่ต้องเตือน */
      suppressHydrationWarning
      className="bg-ink text-chalk fixed inset-0 z-[70] flex-col items-center justify-center will-change-transform"
    >
      <div className="flex w-[min(20rem,78vw)] flex-col items-center">
        <Wordmark symbolClassName="text-citron" />
        <div
          role="progressbar"
          aria-label={t.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-10 h-px w-full bg-current/20"
        >
          <div
            className="bg-citron h-px origin-left transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${value})` }}
          />
        </div>
        <div className="text-13 mt-3 flex w-full items-baseline justify-between gap-4">
          <span className="text-ash">{t.loading}</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
      </div>
      {skippable && (
        <button
          type="button"
          onClick={() => revealRef.current()}
          className={buttonClass("onInkQuiet", "absolute right-6 bottom-6")}
        >
          {t.skip}
        </button>
      )}
    </div>
  );
}
