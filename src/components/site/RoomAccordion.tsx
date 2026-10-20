"use client";

import { LazyMotion, MotionConfig, m } from "framer-motion";
import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale } from "@/i18n/client";
import { getGalleryDictionary } from "@/i18n/gallery";
import { cx } from "@/lib/utils";

/* ห้องจากภาพของผู้พัฒนา (หน้าแรก) — accordion เปิดได้ทีละห้อง มีห้องเปิดอยู่เสมอ

   - ทุกห้องเป็นปุ่มใน <h3> (aria-expanded + aria-controls) — คลิก แตะ Enter/Space เปิดห้องนั้น
     ลูกศรซ้ายขวา/ขึ้นลง Home End ย้ายโฟกัสไปห้องถัดไปและเปิดห้องนั้น ไม่ใช่ hover อย่างเดียว
   - จอกว้าง: แถบเดียวสูง 400px — ห้องที่ปิดเป็นสันแคบ ชื่อห้องตั้งแนวตั้ง · ห้องที่เปิดแสดงภาพตามสัดส่วนจริง (ไม่ครอป เว้นแต่แถบกว้างเกินคอลัมน์ ดูตัวห่อห้อง)
     ความสูง 400px ทำให้ภาพส่วนใหญ่ไม่ถูกขยาย ยกเว้นห้องนั่งเล่น (ไฟล์สูงแค่ 309px ขยาย ~1.3 เท่า)
     ข้อความของห้องที่เปิดอยู่ใต้แถบ ชิดซ้ายของแถบ ไม่ทับภาพ และไม่คั่นกลางแถบ —
     ข้อความยังอยู่ใน region ของห้องนั้น (DOM เดิม) แต่วาง absolute ใต้แถบ ในช่องที่จองความสูงคงที่ไว้
     (ดูค่าด้านล่าง) สลับห้องแล้วของที่อยู่ใต้แถบไม่ขยับ
   - จอแคบ: เรียงลงแนวตั้ง ภาพสูงคงที่ 320px ทุกห้อง ข้อความใต้ภาพของห้องที่เปิด จองความสูงขั้นต่ำไว้
     ความสูงรวมของท่อนจึงไม่เปลี่ยนตอนสลับห้อง
   - ข้อความใต้ภาพ = สิ่งที่ผู้พัฒนาระบุ (data: note) ไม่ใช่ข้อความที่เราแต่ง · ป้าย "ภาพจากผู้พัฒนา" ทุกห้อง
   - §4: เปลี่ยนตามการกระทำเท่านั้น 0.2s · prefers-reduced-motion ตัดการเคลื่อนที่ เหลือแค่สลับทันที
     layout animation อยู่ที่ <h3> แต่ละตัว ไม่อยู่ที่ตัวห่อของห้อง — transform บนตัวห่อจะกลายเป็น
     containing block ของข้อความ absolute ทำให้ข้อความกระโดดระหว่างเลื่อน */

export type RoomImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  note: string;
};

/** ความสูงแถบบนจอกว้าง (px) — ต้องตรงกับ lg:h-[400px] ด้านล่าง ใช้คำนวณ sizes ของภาพ */
const ROW_PX = 400;

/* ช่องข้อความ (วัด 2026-10-02 ทุกห้อง ทั้งไทยและอังกฤษ):
   - จอกว้าง h-32 (128px) — กว้างสุด 60ch ข้อความทุกห้องลงบรรทัดเดียวต่อย่อหน้า สูง 98px ที่ 1024 และ 1440
     เผื่อคำบรรยายขึ้นบรรทัดที่สองได้อีกหนึ่งบรรทัด · group จองที่ด้วย mb-[9.5rem] = ระยะห่าง mt-6 (1.5rem) + h-32
     เปลี่ยนค่าหนึ่งต้องเปลี่ยนอีกค่า
   - จอแคบ min-h-44 (176px) — ห้องที่ยาวสุดสูง 172px ที่ 375 และ 414 ทั้งสองภาษา จึงไม่กระโดดตอนสลับห้อง
     (จอ 320 ภาษาอังกฤษยาวสุด 201px ยังขยับได้ ~25px) */

/* framer-motion แบบ LazyMotion (2026-10-02 งานความเร็ว): ตัว m เบา ส่วนเครื่องยนต์ animation + layout (domMax)
   โหลดแยกหลัง hydrate — JS ก้อนแรกของหน้าแรกไม่ต้องแบก framer-motion ทั้งก้อน (~40 KB gzip) เพื่อท่อนที่อยู่ใต้จอแรก */
const loadMotionFeatures = () => import("./motionFeatures").then((r) => r.default);

export function RoomAccordion({ rooms }: { rooms: RoomImage[] }) {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <Rooms rooms={rooms} />
    </LazyMotion>
  );
}

function Rooms({ rooms }: { rooms: RoomImage[] }) {
  const g = getGalleryDictionary(useLocale());
  const base = useId();
  const [active, setActive] = useState(0);
  /* ห้องที่เปิดอยู่ตอนโหลดหน้าแสดงทันทีจาก HTML (ไม่เริ่มที่ opacity 0 รอ hydrate) — จางเข้าเฉพาะห้องที่ผู้ชมสลับไปเปิด */
  const [switched, setSwitched] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const choose = (n: number) => {
    setSwitched(true);
    setActive(n);
  };

  const go = (i: number) => {
    const n = (i + rooms.length) % rooms.length;
    choose(n);
    buttons.current[n]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const map: Record<string, () => void> = {
      ArrowRight: () => go(i + 1),
      ArrowDown: () => go(i + 1),
      ArrowLeft: () => go(i - 1),
      ArrowUp: () => go(i - 1),
      Home: () => go(0),
      End: () => go(rooms.length - 1),
    };
    const fn = map[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: "easeOut" }}>
      <div
        role="group"
        aria-label={g.rooms.label}
        aria-describedby={`${base}-hint`}
        className="flex flex-col gap-2 lg:relative lg:mb-[9.5rem] lg:h-[400px] lg:flex-row lg:gap-3"
        data-testid="room-accordion"
      >
        {rooms.map((r, i) => {
          const open = i === active;
          const btnId = `${base}-btn-${i}`;
          const panelId = `${base}-panel-${i}`;
          return (
            <div
              key={r.id}
              /* ห้องที่เปิดหดได้เมื่อแถบกว้างเกินคอลัมน์ (เช่นห้องนั่งเล่นภาพกว้างที่จอ 1024) — ภาพครอปข้างเล็กน้อย
                 ไม่ล้นออกขวา · สันของห้องที่ปิดไม่หด */
              className={cx("flex flex-col lg:flex-row lg:gap-3", open && "lg:min-w-0")}
            >
              <m.h3 layout="position" className="lg:h-full lg:shrink-0">
                <button
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  id={btnId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => choose(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={cx(
                    "rounded-control flex h-14 w-full items-center gap-4 border px-4 text-left transition-colors duration-200 motion-reduce:transition-none",
                    "lg:h-full lg:w-16 lg:flex-col lg:justify-between lg:px-0 lg:py-5",
                    open
                      ? "bg-pine border-pine text-on-pine"
                      : "bg-paper border-concrete text-ironwood hover:border-moss",
                  )}
                >
                  <span
                    className={cx(
                      "font-display text-15 font-medium tabular-nums",
                      open ? "text-on-pine" : "text-moss",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* จอกว้าง: ชื่อห้องตั้งแนวตั้ง อ่านจากล่างขึ้นบน · จอแคบ: แนวนอนปกติ */}
                  <span className="text-15 font-medium whitespace-nowrap lg:rotate-180 lg:[writing-mode:vertical-rl]">
                    {r.title}
                  </span>
                </button>
              </m.h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                hidden={!open}
                className="mt-2 lg:mt-0 lg:h-full lg:min-w-0"
              >
                {open && (
                  <>
                    <m.div
                      initial={switched ? { opacity: 0 } : false}
                      animate={{ opacity: 1 }}
                      className="rounded-card bg-concrete relative h-80 w-full overflow-hidden lg:h-full lg:w-auto lg:max-w-full"
                      style={{ aspectRatio: `${r.width} / ${r.height}` }}
                    >
                      <Image
                        src={r.src}
                        alt={r.alt}
                        fill
                        sizes={`(min-width: 1024px) ${Math.round((ROW_PX * r.width) / r.height)}px, calc(100vw - 48px)`}
                        className="object-cover"
                      />
                    </m.div>
                    {/* จอแคบ: ใต้ภาพของห้องนี้ · จอกว้าง: ใต้แถบทั้งแถบ ชิดซ้ายของแถบ (absolute เทียบกับ group) */}
                    <m.div
                      initial={switched ? { opacity: 0 } : false}
                      animate={{ opacity: 1 }}
                      data-testid="room-text"
                      className="mt-4 flex min-h-44 max-w-[60ch] flex-col lg:absolute lg:top-full lg:left-0 lg:mt-6 lg:h-32 lg:min-h-0"
                    >
                      <p className="text-17">{r.note}</p>
                      <p className="text-15 text-moss mt-2">{r.caption}</p>
                      <p className="text-13 text-moss mt-4">
                        {g.source.developer} · {g.source.developerNote}
                      </p>
                    </m.div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* วิธีใช้คีย์บอร์ด — อยู่ใต้ข้อความของห้อง ไม่ลอยเหนือหัวข้อ (§7) */}
      <p id={`${base}-hint`} className="text-13 text-moss mt-4">
        {g.rooms.hint}
      </p>
    </MotionConfig>
  );
}
