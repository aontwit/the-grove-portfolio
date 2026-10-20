"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/client";
import { getDictionary } from "@/i18n";
import { getGalleryDictionary } from "@/i18n/gallery";
import type { GallerySource } from "@/lib/schemas";
import { cx } from "@/lib/utils";

/* แกลเลอรี — ภาพปกกรอบโค้ง + ตัวกรอง + ตารางภาพแบบ masonry + ตัวดูภาพเต็มจอ

   - ตัวกรองเป็น radio ของเบราว์เซอร์ (ลูกศรเลื่อนและเลือกในกลุ่มเดียว Tab เข้าออกครั้งเดียว) ตัวเลขในชิปนับจากภาพจริง
     กรองเฉพาะตารางภาพด้านล่าง ภาพปกอยู่นอกตัวกรอง
   - masonry ด้วย CSS columns: ภาพคงสัดส่วนจริง ไม่ครอป · คอลัมน์ไม่กว้างเกิน ~340px บนจอกว้าง
     ภาพจากผู้พัฒนาบางภาพกว้างแค่ 340px ภาพจึงไม่ถูกขยายเกินขนาดไฟล์จริง
   - ตัวดูภาพ = <dialog> modal ของเบราว์เซอร์ (กักโฟกัสและทำให้หน้าหลัง inert ให้เอง) · Esc / ปุ่มปิด / ลูกศร / ปัด
     ภาพที่เปิดบินออกจากตำแหน่งเดิมด้วย layoutId (§4 ตัวดูภาพ: เปิด / ปิด / เลื่อนภาพ 0.3s) และบินกลับตอนปิด
     เลื่อนภาพแล้วเป็นการ crossfade · ปิดแล้วโฟกัสกลับไปที่ภาพที่ดูอยู่ล่าสุดในตาราง
   - prefers-reduced-motion: MotionConfig "user" ตัดการเคลื่อนที่ทั้งหมด เหลือเปลี่ยนความทึบอย่างเดียว */

export type GalleryItem = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  source: GallerySource;
  /** ป้ายที่มาเต็ม เช่น "ภาพจากโมเดล 3D · แปลนตัวอย่าง" */
  sourceLabel: string;
  projectId: string | null;
  projectName: string | null;
};

export type GalleryProjectChip = { id: string; label: string };

type Filter = "all" | GallerySource | `project:${string}`;

/** กรอบภาพปก: โค้งครึ่งวงกลมด้านบน(เจ้าของอนุมัติ 2026-10-02 · ใช้ที่ภาพปกแกลเลอรีภาพเดียว)
    รัศมีบน = ครึ่งความกว้างกรอบ (50cqw ของ @container) · ขอบล่าง 12px ตาม §3
    ยกเลิกกรอบโค้ง = เปลี่ยนบรรทัดนี้เป็น "rounded-card" */
const HERO_FRAME = "[border-radius:50cqw_50cqw_12px_12px]";

const DURATION = 0.3;
const EASE = [0.22, 1, 0.36, 1] as const;

const matches = (f: Filter, item: GalleryItem) =>
  f === "all" ||
  f === item.source ||
  (f.startsWith("project:") && item.projectId === f.slice("project:".length));

/** ปุ่มบนแถบหมึกของตัวดูภาพ (§1: บนพื้นเข้มใช้ chalk/ash/citron) */
const DARK_BTN =
  "border-ash text-chalk rounded-control text-15 inline-flex h-12 items-center border-[1.5px] px-5 font-medium focus-visible:outline-citron";

export function GalleryView({
  intro,
  hero,
  items,
  projects,
}: {
  intro: ReactNode;
  hero: GalleryItem | undefined;
  items: GalleryItem[];
  projects: GalleryProjectChip[];
}) {
  const lang = useLocale();
  const g = getGalleryDictionary(lang);
  const t = getDictionary(lang);
  const name = useId();

  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => items.filter((i) => matches(filter, i)), [items, filter]);
  /** ลำดับในตัวดูภาพ = ภาพปก + ภาพที่ตัวกรองแสดงอยู่ */
  const sequence = useMemo(() => (hero ? [hero, ...visible] : visible), [hero, visible]);

  const chips: { value: Filter; label: string }[] = [
    { value: "all", label: g.gallery.filter.all },
    /* ชิปแยกที่มามีความหมายเฉพาะเมื่อมีภาพสองแหล่ง */
    ...(items.some((i) => i.source === "developer")
      ? [
          { value: "developer" as const, label: g.gallery.filter.developer },
          { value: "model3d" as const, label: g.gallery.filter.model3d },
        ]
      : []),
    ...projects.map((p) => ({ value: `project:${p.id}` as const, label: p.label })),
  ];

  /* ── ตัวดูภาพ ─────────────────────────────────────────────────────────── */
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  const swipe = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  /** ภาพที่บินออกจากตาราง — หลังเลื่อนภาพแล้วไม่บินกลับ (ภาพอื่นอาจอยู่นอกจอ) */
  const [flyId, setFlyId] = useState<string | null>(null);
  const shown = index === null ? undefined : sequence[index];
  /** id ของภาพล่าสุดที่ดู — ใช้คืนโฟกัสหลังปิด */
  const lastId = useRef<string | null>(null);

  const open = (id: string) => {
    const i = sequence.findIndex((s) => s.id === id);
    if (i < 0) return;
    /* เปิด dialog ก่อน render ภาพ — framer วัดตำแหน่งภาพใน dialog ได้ตั้งแต่เฟรมแรก */
    dialogRef.current?.showModal();
    lastId.current = id;
    setFlyId(id);
    setIndex(i);
  };

  const close = () => setIndex(null);

  /** นับทุกครั้งที่เลื่อนภาพ — key ของภาพในตัวดู กลับมาภาพเดิมเร็วๆ (ถัดไป→ก่อน) ระหว่างภาพเก่ายังจางออก
      ได้ element ใหม่ ไม่ชน key กับตัวที่กำลังออก (เดิมภาพหายเหลือกรอบว่าง) */
  const [hop, setHop] = useState(0);
  const step = (dir: 1 | -1) => {
    setHop((h) => h + 1);
    setIndex((i) => {
      if (i === null) return i;
      const next = (i + dir + sequence.length) % sequence.length;
      lastId.current = sequence[next]?.id ?? null;
      setFlyId(null);
      return next;
    });
  };

  useEffect(() => {
    if (index !== null) closeRef.current?.focus();
  }, [index !== null]); // eslint-disable-line react-hooks/exhaustive-deps -- โฟกัสครั้งเดียวตอนเปิด

  /* หลังภาพบินกลับเสร็จ: ปิด dialog แล้วคืนโฟกัสให้ภาพล่าสุดที่ดู */
  const onExitComplete = () => {
    const d = dialogRef.current;
    if (d?.open) d.close();
    const id = lastId.current;
    if (id) thumbs.current.get(id)?.focus({ preventScroll: false });
  };

  const thumbProps = (item: GalleryItem) => ({
    ref: (el: HTMLButtonElement | null) => {
      if (el) thumbs.current.set(item.id, el);
      else thumbs.current.delete(item.id);
    },
    type: "button" as const,
    onClick: () => open(item.id),
    "aria-label": g.gallery.openFull(item.title),
    "aria-haspopup": "dialog" as const,
  });

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={filter}>
        {/* จอกว้าง: หัวเรื่องบนซ้าย · ชิปตัวกรองล่างซ้ายชิดแนวล่างของภาพปก · ภาพปกขวาเต็มสองแถว
            จอแคบ: หัวเรื่อง → ภาพปก → ชิป (ชิปอยู่ติดตารางภาพที่มันกรอง) */}
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:grid-rows-[auto_1fr]">
          <div className="lg:col-start-1 lg:row-start-1">{intro}</div>

          {hero && (
            <figure className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="@container">
                <motion.button
                  {...thumbProps(hero)}
                  layoutId={`g-${hero.id}`}
                  className={cx(
                    "bg-concrete relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden focus-visible:outline-offset-4",
                    HERO_FRAME,
                  )}
                >
                  <Image
                    src={hero.src}
                    alt={hero.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 416px, calc(100vw - 48px)"
                    className="object-cover"
                  />
                </motion.button>
              </div>
              <figcaption className="mt-4">
                <span className="text-15 block font-medium">{hero.title}</span>
                <span className="text-15 text-moss mt-1 block">{hero.caption}</span>
                <span className="text-13 text-moss mt-2 block">
                  {hero.sourceLabel} · {g.source.developerNote}
                </span>
              </figcaption>
            </figure>
          )}

          <fieldset className="lg:col-start-1 lg:row-start-2 lg:self-end">
            <legend className="sr-only">{g.gallery.filterLabel}</legend>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => {
                const count = items.filter((i) => matches(c.value, i)).length;
                const checked = filter === c.value;
                return (
                  <label
                    key={c.value}
                    className={cx(
                      "rounded-control text-15 inline-flex h-11 cursor-pointer items-center gap-2 border px-4 font-medium transition-colors duration-200 motion-reduce:transition-none",
                      "has-[:focus-visible]:outline-pine has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                      "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                      checked
                        ? "bg-pine border-pine text-on-pine"
                        : "border-concrete bg-paper text-ironwood hover:border-moss",
                    )}
                  >
                    <input
                      type="radio"
                      name={name}
                      value={c.value}
                      checked={checked}
                      disabled={count === 0}
                      onChange={() => setFilter(c.value)}
                      className="sr-only"
                    />
                    {c.label}{" "}
                    <span
                      className={cx(
                        "font-display text-13 tabular-nums",
                        checked ? "text-on-pine" : "text-moss",
                      )}
                    >
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
        <p role="status" className="sr-only">
          {g.gallery.showing(visible.length)}
        </p>

        <motion.ul
          key={filter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-12 columns-1 gap-6 md:columns-2 lg:columns-3 xl:columns-4"
          data-testid="gallery-grid"
        >
          {visible.map((item) => (
            <li key={item.id} className="mb-8 break-inside-avoid" data-source={item.source}>
              <figure>
                <motion.button
                  {...thumbProps(item)}
                  layoutId={`g-${item.id}`}
                  style={{ aspectRatio: `${item.width} / ${item.height}`, borderRadius: 12 }}
                  className="bg-concrete relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-offset-4"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1280px) 330px, (min-width: 1024px) 310px, (min-width: 768px) 350px, calc(100vw - 48px)"
                    className="object-cover"
                  />
                </motion.button>
                <figcaption className="mt-3">
                  <span className="text-15 block font-medium">{item.title}</span>
                  <span className="text-13 text-moss mt-1 block">
                    {item.sourceLabel}
                    {item.projectName && ` · ${item.projectName}`}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </motion.ul>

        <dialog
          ref={dialogRef}
          aria-label={g.gallery.dialog}
          data-lenis-prevent
          onCancel={(e) => {
            /* Esc — ปิดผ่าน state เพื่อให้ภาพบินกลับก่อน dialog ปิดจริง */
            e.preventDefault();
            close();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
          className="text-chalk m-0 h-svh max-h-none w-screen max-w-none overflow-hidden overscroll-contain bg-transparent p-0 backdrop:bg-transparent"
        >
          <AnimatePresence onExitComplete={onExitComplete}>
            {shown && (
              <motion.div
                key="lightbox"
                className="relative flex h-full flex-col"
                initial="hidden"
                animate="shown"
                exit="hidden"
              >
                <motion.div
                  aria-hidden="true"
                  className="bg-ink absolute inset-0"
                  variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
                  transition={{ duration: DURATION, ease: EASE }}
                />

                <motion.div
                  className="relative mx-auto flex w-full max-w-[88rem] items-center justify-between gap-4 px-6 py-4"
                  variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
                  transition={{ duration: DURATION, ease: EASE }}
                >
                  <p
                    className="font-display text-15 text-ash font-medium tabular-nums"
                    aria-label={g.gallery.counter((index ?? 0) + 1, sequence.length)}
                  >
                    {String((index ?? 0) + 1).padStart(2, "0")} / {sequence.length}
                  </p>
                  <button ref={closeRef} type="button" onClick={close} className={DARK_BTN}>
                    {t.common.close}
                  </button>
                </motion.div>

                <div
                  className="relative mx-auto min-h-0 w-full max-w-[88rem] flex-1 touch-pan-y px-6 [container-type:size]"
                  onPointerDown={(e) => (swipe.current = e.clientX)}
                  onPointerUp={(e) => {
                    const from = swipe.current;
                    swipe.current = null;
                    if (from === null) return;
                    const dx = e.clientX - from;
                    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
                  }}
                  onPointerCancel={() => (swipe.current = null)}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.div
                        key={`${shown.id}:${hop}`}
                        layoutId={flyId === shown.id ? `g-${shown.id}` : undefined}
                        initial={flyId === shown.id ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: DURATION, ease: EASE }}
                        className="relative overflow-hidden"
                        style={{
                          aspectRatio: `${shown.width} / ${shown.height}`,
                          /* พอดีกรอบทั้งกว้างและสูง และไม่ขยายเกินขนาดไฟล์จริง (ภาพจากผู้พัฒนาความละเอียดต่ำ) */
                          width: `min(100cqw, ${shown.width}px, calc(100cqh * ${(shown.width / shown.height).toFixed(4)}))`,
                          borderRadius: 12,
                        }}
                        data-testid="lightbox-image"
                      >
                        <Image
                          src={shown.src}
                          alt={shown.alt}
                          fill
                          sizes={`min(100vw, ${shown.width}px)`}
                          /* ลากเมาส์บนภาพ = ปัดเลื่อน ไม่ใช่ลากไฟล์ภาพของเบราว์เซอร์ (ซึ่งยกเลิก pointer event) */
                          draggable={false}
                          className="object-cover"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <motion.div
                  className="relative mx-auto flex w-full max-w-[88rem] flex-wrap items-end justify-between gap-x-8 gap-y-4 px-6 py-6"
                  variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
                  transition={{ duration: DURATION, ease: EASE }}
                >
                  <div className="max-w-[60ch]" aria-live="polite">
                    <h2 className="text-21">{shown.title}</h2>
                    <p className="text-15 text-ash mt-1">{shown.caption}</p>
                    <p className="text-13 text-ash mt-2">
                      {shown.sourceLabel}
                      {shown.source === "developer" && ` · ${g.source.developerNote}`}
                      {shown.projectName && ` · ${g.gallery.project(shown.projectName)}`}
                    </p>
                  </div>
                  {sequence.length > 1 && (
                    <div className="flex gap-3">
                      <button type="button" onClick={() => step(-1)} className={DARK_BTN}>
                        {g.gallery.prev}
                      </button>
                      <button
                        type="button"
                        onClick={() => step(1)}
                        className="bg-citron text-on-citron rounded-control text-15 focus-visible:outline-citron inline-flex h-12 items-center px-5 font-medium"
                      >
                        {g.gallery.next}
                      </button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </dialog>
      </LayoutGroup>
    </MotionConfig>
  );
}
