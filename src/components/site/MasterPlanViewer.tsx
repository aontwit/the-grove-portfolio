"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";
import { useGrove, type PlanMode, type StatusFilter } from "@/lib/store";
import { MasterPlan2D, useMediaQuery, usePortraitPlan } from "@/components/three/MasterPlan2D";
import { MasterPlan3D } from "@/components/site/MasterPlan3D";
import { PlotList } from "@/components/site/PlotList";
import { PLOT_PANEL_TITLE } from "@/components/site/PlotPanel";
import { ToggleGroup } from "@/components/site/ToggleGroup";
import { useDict } from "@/i18n/client";
import { useLivePlots } from "@/lib/demo";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { PLOT_LAWN } from "@/components/three/materials";
import { SampleNote } from "@/components/site/SampleNote";
import { STATUSES } from "@/lib/status";

/* ผังโครงการ 2D ↔ 3D — ทั้งสองมุมมองอ่านแปลงที่เลือกและตัวกรองสถานะจาก store เดียวกัน */

const MODES = ["2d", "3d"] as const;

/** 3D ยังไม่พร้อมหลังจากนี้ = เน็ตช้า บอกทางออกไปผัง 2D แทนการปล่อยให้รอเปล่า */
const SLOW_3D_MS = 12_000;

/** ระยะเว้นจากขอบจอบนและขอบแผ่นล่าง ตอนเลื่อนผังให้เห็นแปลงที่เลือก */
const SCROLL_GAP = 16;

const SECONDARY_BUTTON =
  "border-ironwood text-ironwood rounded-control text-15 inline-flex min-h-11 shrink-0 items-center border-[1.5px] px-4 font-medium";

export function MasterPlanViewer({
  plots: source,
  houseTypes,
  plan,
  side,
  syncUrl = false,
  sample = false,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  /** panel รายละเอียดแปลง — วางในคอลัมน์ขวา ขอบบนเสมอกับกรอบผัง ไม่ใช่ลอยสูงกว่าเพราะแถบปุ่ม */
  side?: ReactNode;
  /** เก็บแปลงที่เลือกไว้ใน ?plot= ให้ส่งลิงก์ต่อได้และรีเฟรชแล้วยังอยู่ — ใช้เฉพาะหน้าผังโครงการ */
  syncUrl?: boolean;
  /** ผังแปลงตัวอย่าง (project.pending.plots) — ติดป้ายเหนือผังและในภาพผัง */
  sample?: boolean;
}) {
  const plots = useLivePlots(source);
  const planMode = useGrove((s) => s.planMode);
  const setPlanMode = useGrove((s) => s.setPlanMode);
  const statusFilter = useGrove((s) => s.statusFilter);
  const setStatusFilter = useGrove((s) => s.setStatusFilter);
  const mode = planMode === "walk" ? "3d" : planMode;
  const selectedPlot = useGrove((s) => s.selectedPlot);
  const selectPlot = useGrove((s) => s.selectPlot);
  const expanded = useGrove((s) => s.plotSheetExpanded);
  const setExpanded = useGrove((s) => s.setPlotSheetExpanded);
  const reduced = usePrefersReducedMotion();
  const t = useDict();

  const [ready3d, setReady3d] = useState(false);
  const [slow3d, setSlow3d] = useState(false);
  const [failed3d, setFailed3d] = useState(false);
  /* เลขรอบโหลด 3D — เปลี่ยนแล้ว key เปลี่ยน ก้อน 3D mount ใหม่และขอไฟล์ใหม่ */
  const [attempt, setAttempt] = useState(0);

  /* จอแคบกว่า 640px: ผังแนวตั้ง · แคบกว่า 1360px: panel กลายเป็นแผ่นล่างจอ */
  const portrait = usePortraitPlan();
  const narrow = useMediaQuery("(max-width: 1359px)");
  const sheetOpen = narrow && side !== undefined && plots.some((p) => p.id === selectedPlot);

  const planRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const [sheetH, setSheetH] = useState(0);

  const chooseMode = (m: PlanMode) => {
    setReady3d(false);
    setSlow3d(false);
    setPlanMode(m);
  };

  /* 3D ล้ม: กลับไปผัง 2D ที่ข้อมูลครบเท่ากัน แล้วบอกตรงๆ ว่าลองใหม่ได้ */
  const on3dError = () => {
    setFailed3d(true);
    chooseMode("2d");
  };
  const retry3d = () => {
    setFailed3d(false);
    setAttempt((a) => a + 1);
    chooseMode("3d");
  };

  useEffect(() => {
    if (mode !== "3d" || ready3d) return;
    const t = window.setTimeout(() => setSlow3d(true), SLOW_3D_MS);
    return () => window.clearTimeout(t);
  }, [mode, ready3d, attempt]);

  /* ?plot= ↔ store — store ยังเป็นตัวจริง (ผังหน้าแรกก็เลือกแปลงได้) URL แค่สะท้อนค่า
     รอบแรกอ่านจาก URL ก่อน ค่าที่ไม่ตรงแปลงไหนเลยปล่อยผ่านเงียบๆ */
  const urlRead = useRef(false);
  useEffect(() => {
    if (!syncUrl) return;
    if (!urlRead.current) {
      urlRead.current = true;
      const fromUrl = new URLSearchParams(window.location.search).get("plot");
      if (fromUrl && fromUrl !== selectedPlot && source.some((p) => p.id === fromUrl)) {
        selectPlot(fromUrl);
        return;
      }
    }
    const url = new URL(window.location.href);
    if (selectedPlot) url.searchParams.set("plot", selectedPlot);
    else url.searchParams.delete("plot");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [syncUrl, selectedPlot, selectPlot, source]);

  /* ความสูงแผ่นล่างจอ — ใช้เว้นท้ายหน้าให้แถวสุดท้ายเลื่อนพ้นแผ่นได้ */
  useEffect(() => {
    if (!sheet) return;
    const ro = new ResizeObserver(() => setSheetH(sheet.offsetHeight));
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [sheet]);

  /* เลือกแปลงบนจอแคบ: เลื่อนผังให้แปลงนั้นอยู่เหนือแผ่นล่างจอ ไม่ถูกแผ่นทับ
     วัดจาก offsetHeight ไม่ใช่ getBoundingClientRect — แผ่นยังเลื่อนขึ้นอยู่ (translate) ตอนนี้ */
  useEffect(() => {
    if (!sheetOpen || !sheet || !selectedPlot) return;
    const frame = window.requestAnimationFrame(() => {
      const target =
        (mode === "2d" &&
          planRef.current?.querySelector<SVGGElement>(`[data-plot-id="${selectedPlot}"]`)) ||
        planRef.current;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const top = SCROLL_GAP;
      const bottom = window.innerHeight - sheet.offsetHeight - SCROLL_GAP;
      const behavior = reduced ? "instant" : "smooth";
      if (r.top < top || r.bottom > bottom) {
        /* กล่องสูงกว่าที่ว่าง (ฉาก 3D ทั้งกรอบ) = ชิดขอบบน · ไม่งั้นวางกลางที่ว่าง */
        const delta =
          r.height > bottom - top ? r.top - top : (r.top + r.bottom) / 2 - (top + bottom) / 2;
        window.scrollBy({ top: delta, behavior });
      }
      /* ผังแนวนอน (640-1359px) กว้างกว่าจอ เลื่อนข้างในกรอบให้แปลงอยู่กลางด้วย */
      const scroller = scrollerRef.current;
      if (scroller && target !== planRef.current) {
        const c = scroller.getBoundingClientRect();
        if (r.left < c.left || r.right > c.right) {
          scroller.scrollBy({ left: (r.left + r.right) / 2 - (c.left + c.right) / 2, behavior });
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
    // เลื่อนเฉพาะตอนเปิดหรือเปลี่ยนแปลง — กาง/ย่อแผ่นไม่ควรพาผังวิ่ง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, selectedPlot, sheet]);

  /* โฟกัส: เปิดแผ่น = ไปที่หัวแผ่น · ปิดแผ่น = กลับไปที่แปลงหรือแถวที่กดเปิด */
  const trigger = useRef<Element | null>(null);
  const lastPlot = useRef<string | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (sheetOpen) {
      if (!wasOpen.current) trigger.current = document.activeElement;
      wasOpen.current = true;
      lastPlot.current = selectedPlot;
      document.getElementById(PLOT_PANEL_TITLE)?.focus({ preventScroll: true });
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    /* โฟกัสยังอยู่ที่อื่นที่ผู้ใช้เลือกเอง (เช่นแตะแปลงซ้ำเพื่อปิด) ไม่ต้องดึงกลับ */
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const t = trigger.current;
    const back =
      t instanceof HTMLElement || t instanceof SVGElement
        ? t.isConnected && t !== document.body
          ? t
          : null
        : null;
    const cell = planRef.current?.querySelector<SVGGElement>(
      `[data-plot-id="${lastPlot.current}"]`,
    );
    (back ?? cell)?.focus({ preventScroll: true });
  }, [sheetOpen, selectedPlot]);

  /* Esc ปิดแผ่นล่างจอ — แผ่นไม่ได้ modal ผู้ใช้ยังแตะผังข้างบนได้ จึงฟังทั้งหน้า */
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectPlot(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, selectPlot]);

  const count = (f: StatusFilter) =>
    f === "all" ? plots.length : plots.filter((p) => p.status === f).length;
  /* ตัวกรองและ legend มีเฉพาะสถานะที่มีแปลงอยู่จริง (ตามค่าที่ admin แก้ด้วย) — ไม่โชว์ "ว่าง 0" ให้งง */
  const present = STATUSES.filter((s) => count(s) > 0);
  const filters: StatusFilter[] = ["all", ...present];

  const box = { w: plan.widthM + 6, d: plan.depthM + 6, h: 9, cx: 0, cz: 0 };

  return (
    <div style={sheetOpen && sheetH > 0 ? { paddingBottom: sheetH } : undefined}>
      {/* มุมมองกับตัวกรองอยู่แถวเดียว แต่มีชื่อกลุ่มกำกับ — ปุ่มที่เลือกอยู่เป็นสี pine ทั้งคู่ */}
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-13 text-moss">
            {t.masterPlan.view}
          </span>
          <ToggleGroup
            label={t.masterPlan.viewGroup}
            options={MODES.map((id) => ({ id, label: t.masterPlan.modes[id] }))}
            value={mode}
            onSelect={chooseMode}
          />
        </div>

        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-13 text-moss">
            {t.masterPlan.filter}
          </span>
          <ToggleGroup
            label={t.masterPlan.filterGroup}
            size="pill"
            options={filters.map((f) => ({
              id: f,
              label: `${f === "all" ? t.masterPlan.all : t.status[f]} ${count(f)}`,
            }))}
            value={statusFilter}
            onSelect={setStatusFilter}
          />
        </div>
      </div>

      {sample && <SampleNote kind="site" detail className="mb-4" />}

      {failed3d && mode === "2d" && (
        <div
          role="status"
          className="border-concrete rounded-card bg-paper mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 border p-4"
        >
          <p className="text-15 max-w-[60ch]">{t.masterPlan.failed3d}</p>
          <button type="button" onClick={retry3d} className={SECONDARY_BUTTON}>
            {t.masterPlan.retry3d}
          </button>
        </div>
      )}

      {/* ผังต้องการความกว้างอย่างน้อย 900px · panel 21rem + ช่องไฟ = อีก 368px
          จอที่แคบกว่า 1360px จึงวางสองคอลัมน์ไม่ได้โดยไม่บีบผังจนต้องเลื่อนแนวนอน */}
      <div className="grid grid-cols-1 items-start gap-6 min-[1360px]:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <div
            ref={planRef}
            className="border-concrete rounded-card relative isolate overflow-hidden border"
          >
            <div
              ref={scrollerRef}
              className={`overflow-x-auto transition-opacity duration-250 motion-reduce:transition-none ${
                mode === "2d" ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={mode !== "2d"}
            >
              <MasterPlan2D
                plots={plots}
                plan={plan}
                houseTypes={houseTypes}
                portrait={portrait}
                sample={sample}
              />
            </div>

            <div
              className={`absolute inset-0 transition-opacity duration-250 motion-reduce:transition-none ${
                mode === "3d" ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={mode !== "3d"}
            >
              {mode === "3d" && (
                <MasterPlan3D
                  key={attempt}
                  plots={plots}
                  houseTypes={houseTypes}
                  plan={plan}
                  box={box}
                  onReady={() => setReady3d(true)}
                  onError={on3dError}
                />
              )}
              {/* สถานะโหลด — three.js มาทีหลังเป็นก้อนใหญ่ บนมือถือ 4G กล่องขาวเปล่าหลายวินาทีดูเหมือนพัง
                  เกิน 12 วินาทีบอกทางออกไปผัง 2D */}
              {mode === "3d" && !ready3d && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                  <p role="status" className="text-15 text-moss">
                    {slow3d ? t.masterPlan.slow : t.masterPlan.loading}
                  </p>
                  {slow3d && (
                    <button
                      type="button"
                      onClick={() => chooseMode("2d")}
                      className={SECONDARY_BUTTON}
                    >
                      {t.masterPlan.see2d}
                    </button>
                  )}
                </div>
              )}
              {/* สีสนามใน 3D คือสีวัสดุ ไม่ใช่สี chip — ต้องมีคำกำกับคู่ทุกสี
                  กรองสถานะอยู่ = บอกเฉพาะสีที่ยังเห็นในฉาก */}
              <ul
                className="bg-paper text-13 text-ironwood rounded-control absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 font-medium"
                aria-label={t.masterPlan.lawnLegend}
              >
                {present
                  .filter((s) => statusFilter === "all" || statusFilter === s)
                  .map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="border-moss size-3 border"
                        style={{ background: PLOT_LAWN[s] }}
                      />
                      {t.status[s]}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <p className="text-13 text-moss mt-3 max-w-[70ch]">{t.masterPlan.hint}</p>
          <div className="mt-10">
            <PlotList plots={source} houseTypes={houseTypes} plan={plan} />
          </div>
        </div>

        {/* จอใหญ่: คอลัมน์ขวาค้างตาม · จอเล็กเมื่อเลือกแปลง: แผ่นล่างจอในระยะนิ้วโป้ง
            เริ่มแบบย่อ (~40svh) ไม่ทับผังจนหาแปลงที่เลือกไม่เจอ กางดูที่เหลือได้
            key ตามแปลงให้แผ่นเลื่อนขึ้นใหม่ทุกครั้งที่เปลี่ยนแปลง (§4 panel slide 0.2s) */}
        {side && (
          <div
            key={selectedPlot ?? "none"}
            ref={setSheet}
            role={sheetOpen ? "dialog" : undefined}
            aria-modal={sheetOpen ? false : undefined}
            aria-labelledby={sheetOpen ? PLOT_PANEL_TITLE : undefined}
            className={cx(
              "min-[1360px]:sticky min-[1360px]:top-8",
              !sheetOpen && "max-[1359px]:hidden",
              sheetOpen &&
                "bg-paper border-concrete fixed inset-x-0 bottom-0 z-30 overflow-y-auto overscroll-contain border-t px-3 pb-3 transition-transform duration-200 starting:translate-y-full motion-reduce:transition-none",
              sheetOpen && (expanded ? "max-h-[85svh]" : "max-h-[40svh]"),
            )}
          >
            {sheetOpen && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="text-13 text-moss hover:text-ironwood flex min-h-11 w-full flex-col items-center justify-center gap-1.5 pt-2 font-medium"
              >
                <span aria-hidden="true" className="bg-concrete rounded-control h-1 w-10" />
                {expanded ? t.masterPlan.collapse : t.masterPlan.expand}
              </button>
            )}
            {side}
          </div>
        )}
      </div>
    </div>
  );
}
