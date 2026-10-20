"use client";

import { useEffect, useId, useMemo, useState, type DragEvent, type RefObject } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Video,
} from "lucide-react";
import {
  DAYLIGHT_KEYS,
  MOODS,
  MOOD_IDS,
  MOOD_SURFACES,
  SURFACE_FAMILIES,
  SWATCHES,
  moodMix,
  type MoodId,
  type MoodSurface,
  type SwatchFamily,
  type SwatchId,
} from "@/components/three/materials";
import type { PickFn } from "@/components/three/MoodRig";
import { useLocale } from "@/i18n/client";
import { TIME_PRESETS, getStudioDictionary, timeOf } from "@/i18n/studio";
import { HOUR_MAX, HOUR_MIN, useMood } from "@/lib/store";
import { cx } from "@/lib/utils";

/* Mood studio ฝั่ง DOM — แผงลอยบนเวทีโมเดล (จอ md ขึ้นไป) / แผ่นล่างจอ (มือถือ)
   ซ้ายบน: ชุดบรรยากาศ + มาตรวัด + ประโยคบอกว่าห้องออกไปทางไหน · ซ้าย: วัสดุทุกผิวในห้อง
   ขวา: แสงของวัน 4 ช่วง + แถบเลื่อนเวลา · ล่าง: ถาดวัสดุแยกแท็บ (แตะ = ใช้ · ลากไปวางบนห้อง · ชี้ = ดูก่อน)
   ปุ่มลัด 1–3 ชุดบรรยากาศ · [ ] เวลา · / ซ่อนแผง — สถานะทั้งหมดอยู่ใน useMood ฉาก 3D อ่านชุดเดียวกัน
   แผงเป็นพื้นหมึกทึบเกือบเต็ม (ไม่เบลอฉากข้างหลัง — §7 ห้าม glassmorphism) */

const PANEL = "rounded-card border-chalk/10 bg-ink/90 text-chalk border";
const TIMES = ["morning", "midday", "evening", "night"] as const;
const TIME_ICON = { morning: Sunrise, midday: Sun, evening: Sunset, night: Moon } as const;
/* ภาพนิ่งของบ้านหลังนี้ย้อมตามช่วงเวลา — การ์ดเวลาเห็นบ้านจริง ไม่ใช่ไอคอนลอยๆ */
const TIME_FILTER = {
  morning: "sepia(0.25) saturate(1.15) brightness(1.05) hue-rotate(-8deg)",
  midday: "saturate(1.05) brightness(1.08)",
  evening: "sepia(0.55) saturate(1.4) brightness(0.9) hue-rotate(-14deg)",
  night: "brightness(0.42) saturate(0.7) hue-rotate(180deg)",
} as const;

const fmt = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const fits = (surface: MoodSurface, swatch: SwatchId) =>
  (SURFACE_FAMILIES[surface] as readonly SwatchFamily[]).includes(SWATCHES[swatch].family);
const FAMILIES: SwatchFamily[] = ["wood", "stone", "fabric", "paint"];

/** วัสดุที่กำลังลากจากถาด — dragover อ่าน dataTransfer ไม่ได้ (เบราว์เซอร์ให้อ่านตอน drop เท่านั้น) */
let dragging: SwatchId | null = null;

/** ตัวรับวัสดุที่ลากมาวางบนเวที — กระจายลง div ที่ครอบ canvas (แผง studio เป็น pointer-events: none) */
export function useStudioDrop(pickRef: RefObject<PickFn | null>) {
  const setPreview = useMood((s) => s.setPreview);
  const apply = useMood((s) => s.apply);
  const hit = (e: DragEvent) => {
    const surface = pickRef.current?.(e.clientX, e.clientY) ?? null;
    return dragging && surface && fits(surface, dragging) ? surface : null;
  };
  return {
    onDragOver: (e: DragEvent) => {
      if (!dragging) return;
      const surface = hit(e);
      e.preventDefault();
      e.dataTransfer.dropEffect = surface ? "copy" : "none";
      const p = useMood.getState().preview;
      if (surface && (p?.surface !== surface || p.swatch !== dragging))
        setPreview({ surface, swatch: dragging });
      else if (!surface && p) setPreview(null);
    },
    onDragLeave: () => setPreview(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const surface = hit(e);
      if (surface && dragging) apply(surface, dragging);
      else setPreview(null);
      dragging = null;
    },
  };
}

function useStudio() {
  const lang = useLocale();
  return getStudioDictionary(lang);
}

function MoodCards() {
  const s = useStudio();
  const finish = useMood((st) => st.finish);
  const hour = useMood((st) => st.hour);
  const applyMood = useMood((st) => st.applyMood);
  const mix = moodMix(finish, hour);
  const top = MOOD_IDS.reduce((a, b) => (mix[b] > mix[a] ? b : a));
  const time = timeOf(hour);
  return (
    <div>
      <div role="group" aria-label={s.moodGroup} className="grid grid-cols-3 gap-2">
        {MOOD_IDS.map((id, i) => {
          const m = MOODS[id];
          const on = id === top;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => applyMood(id)}
              className={cx(
                "rounded-control flex min-h-11 flex-col gap-1.5 border p-2 text-left transition-colors duration-150",
                on ? "bg-chalk text-ink border-chalk" : "border-chalk/15 hover:border-chalk/40",
              )}
            >
              <span aria-hidden className="rounded-control flex h-2.5 overflow-hidden">
                {(["floor", "walls", "sofa", "rug"] as const).map((k) => (
                  <span
                    key={k}
                    className="flex-1"
                    style={{ background: SWATCHES[m.finish[k]].chip }}
                  />
                ))}
              </span>
              <span className="text-15 leading-none font-medium">{s.moods[id].name}</span>
              <span className={cx("text-13 leading-none", on ? "text-slate" : "text-ash")}>
                {s.moods[id].sub}
              </span>
            </button>
          );
        })}
      </div>
      <p className="sr-only">{s.meter}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {MOOD_IDS.map((id) => (
          <div key={id} className="rounded-control border-chalk/10 border px-2 py-1.5">
            <dt className="text-13 text-ash">{s.moods[id].name}</dt>
            <dd className={cx("font-display text-17 tabular-nums", id === top && "text-citron")}>
              {mix[id]}%
            </dd>
            <span aria-hidden className="bg-chalk/10 mt-1 block h-0.5 overflow-hidden rounded-full">
              <span
                className={cx(
                  "block h-full transition-[width] duration-250",
                  id === top ? "bg-citron" : "bg-ash/60",
                )}
                style={{ width: `${mix[id]}%` }}
              />
            </span>
          </div>
        ))}
      </dl>
      <p className="text-13 text-ash mt-3" aria-live="polite">
        {s.reads(
          s.swatches[finish.walls],
          s.swatches[finish.floor],
          s.timePhrase[time],
          s.moods[top].name,
        )}
      </p>
    </div>
  );
}

function Board({ compact = false }: { compact?: boolean }) {
  const s = useStudio();
  const finish = useMood((st) => st.finish);
  const target = useMood((st) => st.target);
  const setTarget = useMood((st) => st.setTarget);
  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-15 font-medium">{s.board}</h3>
          <span className="text-13 text-ash">{s.boardHint}</span>
        </div>
      )}
      <ul className={cx("grid gap-2", compact ? "grid-cols-6" : "grid-cols-3")}>
        {MOOD_SURFACES.map((surface) => {
          const id = finish[surface];
          const on = surface === target;
          return (
            <li key={surface}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setTarget(surface)}
                className={cx(
                  "rounded-control flex w-full flex-col items-center gap-1 border p-1.5 text-center",
                  on ? "border-citron" : "border-transparent hover:border-chalk/25",
                )}
              >
                <span
                  aria-hidden
                  className="rounded-control border-chalk/15 aspect-square w-full border"
                  style={{ background: SWATCHES[id].chip }}
                />
                <span className="text-13 text-ash leading-tight">{s.surfaces[surface]}</span>
                {!compact && <span className="text-13 leading-tight">{s.swatches[id]}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Daylight({ thumb, compact = false }: { thumb?: string | undefined; compact?: boolean }) {
  const s = useStudio();
  const hour = useMood((st) => st.hour);
  const setHour = useMood((st) => st.setHour);
  const now = timeOf(hour);
  const id = useId();
  /* แถบเลื่อนวาดสีแสงจริงของแต่ละชั่วโมง (DAYLIGHT_KEYS ชุดเดียวกับฉาก) */
  const track = useMemo(() => {
    const span = HOUR_MAX - HOUR_MIN;
    const stops = DAYLIGHT_KEYS.map(
      (k) => `${k.sun} ${(((k.h - HOUR_MIN) / span) * 100).toFixed(1)}%`,
    );
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, []);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-15 font-medium">{s.daylight}</h3>
        <span className="font-display text-17 tabular-nums" aria-hidden>
          {fmt(hour)}
        </span>
      </div>
      <ul className={cx("grid gap-1.5", compact ? "grid-cols-4" : "grid-cols-1")}>
        {TIMES.map((t) => {
          const Icon = TIME_ICON[t];
          const on = t === now;
          return (
            <li key={t}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setHour(TIME_PRESETS[t])}
                className={cx(
                  "rounded-control flex w-full items-center gap-2 border p-1.5 text-left",
                  compact && "flex-col",
                  on ? "border-chalk/40 bg-slate" : "border-transparent hover:border-chalk/20",
                )}
              >
                {!compact && <Icon aria-hidden className="text-ash size-4 shrink-0" />}
                <span
                  aria-hidden
                  className="rounded-control bg-slate relative h-10 w-16 shrink-0 overflow-hidden bg-cover bg-center"
                  style={
                    thumb ? { backgroundImage: `url(${thumb})`, filter: TIME_FILTER[t] } : undefined
                  }
                >
                  {compact && <Icon className="text-chalk absolute right-1 bottom-1 size-3.5" />}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-15 font-medium">{s.times[t]}</span>
                  <span className="text-13 text-ash tabular-nums">{fmt(TIME_PRESETS[t])}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <label htmlFor={id} className="sr-only">
        {s.timeSlider}
      </label>
      <input
        id={id}
        type="range"
        min={HOUR_MIN}
        max={HOUR_MAX}
        step={0.25}
        value={hour}
        aria-valuetext={fmt(hour)}
        aria-keyshortcuts="[ ]"
        onChange={(e) => setHour(Number(e.target.value))}
        className="studio-range mt-3 h-6 w-full"
        style={{ "--track": track } as React.CSSProperties}
      />
    </div>
  );
}

function Tray({ compact = false }: { compact?: boolean }) {
  const s = useStudio();
  const tab = useMood((st) => st.tab);
  const target = useMood((st) => st.target);
  const finish = useMood((st) => st.finish);
  const setTab = useMood((st) => st.setTab);
  const apply = useMood((st) => st.apply);
  const setPreview = useMood((st) => st.setPreview);
  const [said, setSaid] = useState("");
  const list = (Object.keys(SWATCHES) as SwatchId[]).filter((id) => SWATCHES[id].family === tab);
  const used = new Set(Object.values(finish));
  const pick = (id: SwatchId) => {
    apply(target, id);
    setSaid(s.applied(s.surfaces[target], s.swatches[id]));
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label={s.trayLabel} className="flex gap-1">
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={f === tab}
              onClick={() => setTab(f)}
              className={cx(
                "rounded-control text-15 min-h-11 px-3 font-medium",
                f === tab ? "bg-chalk text-ink" : "text-ash hover:text-chalk",
              )}
            >
              {s.families[f]}
            </button>
          ))}
        </div>
        <p className="text-13 text-ash">
          <span className="text-citron font-medium">{s.applyTo(s.surfaces[target])}</span>
          {!compact && <> · {s.dragHint}</>}
        </p>
      </div>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {list.map((id) => (
          <li key={id} className="shrink-0">
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                dragging = id;
                e.dataTransfer.setData("text/plain", id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onDragEnd={() => {
                dragging = null;
                setPreview(null);
              }}
              onClick={() => pick(id)}
              onPointerEnter={(e) =>
                e.pointerType === "mouse" && setPreview({ surface: target, swatch: id })
              }
              onPointerLeave={() => setPreview(null)}
              onFocus={() => setPreview({ surface: target, swatch: id })}
              onBlur={() => setPreview(null)}
              aria-pressed={finish[target] === id}
              className="group flex w-[4.5rem] flex-col items-center gap-1 text-center"
            >
              <span
                aria-hidden
                className={cx(
                  "rounded-control block size-14 border transition-transform duration-150 group-hover:-translate-y-0.5",
                  finish[target] === id ? "border-citron border-2" : "border-chalk/15",
                )}
                style={{ background: SWATCHES[id].chip }}
              />
              <span className="text-13 leading-tight">
                {used.has(id) && (
                  <span className="text-citron" aria-hidden>
                    •{" "}
                  </span>
                )}
                {s.swatches[id]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

/** ปุ่มลัดของ studio — ไม่ทำงานตอนพิมพ์ในช่องกรอก หรือกดคู่กับปุ่ม modifier */
function useShortcuts() {
  const applyMood = useMood((s) => s.applyMood);
  const toggleUi = useMood((s) => s.toggleUi);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= MOOD_IDS.length) applyMood(MOOD_IDS[n - 1] as MoodId);
      else if (e.key === "[" || e.key === "]") {
        const { hour, setHour } = useMood.getState();
        setHour(hour + (e.key === "]" ? 0.5 : -0.5));
      } else if (e.key === "/") toggleUi();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMood, toggleUi]);
}

export function MoodStudio({ thumb }: { thumb?: string | undefined }) {
  const s = useStudio();
  const hidden = useMood((st) => st.uiHidden);
  const toggleUi = useMood((st) => st.toggleUi);
  const cinematic = useMood((st) => st.cinematic);
  const toggleCinematic = useMood((st) => st.toggleCinematic);
  const [sheet, setSheet] = useState<"mood" | "light" | "materials">("mood");
  const [open, setOpen] = useState(true);
  useShortcuts();
  const fade = cx(
    "transition-opacity duration-250 motion-reduce:transition-none",
    hidden && "pointer-events-none opacity-0",
  );

  return (
    <div data-studio className="pointer-events-none absolute inset-0 z-10">
      {/* แถบเครื่องมือขวาบน — ปุ่มซ่อนแผงอยู่นอกส่วนที่ซ่อน กดเรียกกลับได้เสมอ */}
      <div className="pointer-events-auto absolute top-3 right-3 flex gap-1.5">
        <button
          type="button"
          aria-pressed={cinematic}
          onClick={toggleCinematic}
          className={cx(
            PANEL,
            "grid size-11 place-items-center",
            cinematic && "bg-chalk text-ink",
            fade,
          )}
          title={s.cinematic}
        >
          <Video aria-hidden className="size-4" />
          <span className="sr-only">{s.cinematic}</span>
        </button>
        <button
          type="button"
          aria-pressed={hidden}
          aria-keyshortcuts="/"
          onClick={toggleUi}
          className={cx(PANEL, "grid size-11 place-items-center")}
          title={hidden ? s.showUi : s.hideUi}
        >
          {hidden ? (
            <Eye aria-hidden className="size-4" />
          ) : (
            <EyeOff aria-hidden className="size-4" />
          )}
          <span className="sr-only">{hidden ? s.showUi : s.hideUi}</span>
        </button>
      </div>

      {/* ── จอ md ขึ้นไป: แผงลอยรอบโมเดล ─────────────────────────────── */}
      <div className={cx("hidden md:block", fade)}>
        <section
          aria-labelledby="studio-title"
          className="pointer-events-auto absolute top-3 left-3 flex max-h-[calc(100%-1.5rem)] w-[17rem] flex-col gap-3 overflow-y-auto"
        >
          <div className={cx(PANEL, "p-3")}>
            <p className="text-13 tracking-caps text-ash font-medium">{s.caps}</p>
            <h2 id="studio-title" className="font-display text-26 text-chalk mt-1 leading-none">
              {s.title}
            </h2>
            <p className="text-13 text-ash mt-2 mb-3">{s.lead}</p>
            <MoodCards />
          </div>
          <div className={cx(PANEL, "p-3")}>
            <Board />
          </div>
        </section>

        <section
          aria-label={s.daylight}
          className={cx(PANEL, "pointer-events-auto absolute top-16 right-3 w-[14rem] p-3")}
        >
          <Daylight thumb={thumb} />
        </section>

        <section
          aria-label={s.trayLabel}
          className={cx(
            PANEL,
            "pointer-events-auto absolute right-3 bottom-3 left-[18.5rem] p-3 lg:right-[15.5rem]",
          )}
        >
          <Tray />
          <p className="text-13 text-ash mt-2 hidden lg:block">{s.shortcuts}</p>
        </section>
      </div>

      {/* ── มือถือ: แผ่นล่างจอ แท็บ บรรยากาศ · แสง · วัสดุ ─────────────────── */}
      <div
        className={cx(
          PANEL,
          "pointer-events-auto absolute inset-x-2 bottom-2 flex max-h-[62%] flex-col md:hidden",
          fade,
        )}
      >
        <div className="flex items-center gap-1 p-2">
          <div role="group" aria-label={s.sheetGroup} className="flex flex-1 gap-1">
            {(["mood", "light", "materials"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={open && sheet === k}
                onClick={() => {
                  setSheet(k);
                  setOpen(true);
                }}
                className={cx(
                  "rounded-control text-15 min-h-11 flex-1 px-2 font-medium",
                  open && sheet === k ? "bg-chalk text-ink" : "text-ash",
                )}
              >
                {s.sheet[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-ash grid size-11 place-items-center"
          >
            {open ? (
              <ChevronDown aria-hidden className="size-5" />
            ) : (
              <ChevronUp aria-hidden className="size-5" />
            )}
            <span className="sr-only">{open ? s.collapse : s.expand}</span>
          </button>
        </div>
        {open && (
          <div className="overflow-y-auto px-3 pb-3">
            {sheet === "mood" && <MoodCards />}
            {sheet === "light" && <Daylight thumb={thumb} compact />}
            {sheet === "materials" && (
              <div className="flex flex-col gap-3">
                <Board compact />
                <Tray compact />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
