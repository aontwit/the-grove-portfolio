"use client";

import { useEffect, useRef, useState } from "react";
import { ToggleGroup } from "@/components/site/ToggleGroup";
import { buttonClass } from "@/components/site/ButtonLink";
import { useDemo, useLivePlots } from "@/lib/demo";
import type { HouseType, Plot, PlotStatus } from "@/lib/schemas";
import { STATUSES, STATUS_TH } from "@/lib/status";
import { baht, cx } from "@/lib/utils";
import { PriceField, StatusPicker, TEXT_BUTTON } from "./fields";

/* ตารางแก้สถานะ/ราคาแปลง — ทุกการแก้เขียนลง lib/demo ซึ่งผังฝั่งลูกค้าอ่านอยู่ จึงเปลี่ยนทันที
   ไม่ใช้ <table> เพราะบนมือถือแถวต้องพับเป็นสองบรรทัดได้ — ใช้ list + หัวคอลัมน์ที่ซ่อนจากโปรแกรมอ่านจอ
   (แต่ละช่องมี label ของตัวเองครบอยู่แล้ว) */

type Filter = PlotStatus | "all" | "edited";

/** โครงการสำหรับตัวกรองและคอลัมน์ — label = ชื่อจริงหรือ "โครงการที่ n" (projectLabel) */
export type AdminProject = { id: string; label: string };

/* คอลัมน์เต็มใช้ได้เมื่อพื้นที่เนื้อหา (หลังหัก sidebar) กว้างพอ ต่ำกว่านั้นแถวพับเป็นสองบรรทัด */
/* ราคา 13rem: placeholder "ราคาแบบ 3,200,000" ไม่ถูกตัด */
const GRID = "xl:grid xl:grid-cols-[minmax(8rem,1fr)_5rem_19rem_13rem_7rem] xl:gap-x-6";

export function PlotRow({
  plot,
  original,
  houseName,
  housePriceFrom,
  projectName,
  className,
  onEdit,
  staleNote,
}: {
  plot: Plot;
  original: Plot;
  houseName: string;
  /** ราคาเริ่มต้นของแบบบ้าน — แปลงที่ยังไม่มีราคารายแปลงแสดงค่านี้เป็นคำแนะนำในช่องราคา */
  housePriceFrom?: number;
  /** ชื่อโครงการของแปลง — ไม่ส่ง = ไม่แสดง (หน้าที่มีโครงการเดียวอยู่แล้ว) */
  projectName?: string;
  className?: string;
  /** เรียกทุกครั้งที่แถวนี้ถูกแก้ — ตารางใช้จำว่าแถวไหนต้องค้างไว้แม้ไม่ตรงตัวกรองแล้ว */
  onEdit?: () => void;
  /** แถวค้างอยู่เพราะเพิ่งแก้ แต่ไม่ตรงตัวกรองที่เลือกแล้ว */
  staleNote?: string;
}) {
  const editPlot = useDemo((s) => s.editPlot);
  const resetPlot = useDemo((s) => s.resetPlot);
  const edited = plot.status !== original.status || plot.price !== original.price;
  const edit = (patch: Parameters<typeof editPlot>[1]) => {
    onEdit?.();
    editPlot(original, patch);
  };

  return (
    <div
      data-plot-row={plot.number}
      className={cx(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3",
        GRID,
        className,
      )}
    >
      <div className="pt-1">
        <p className="font-display text-21 leading-tight font-medium">
          แปลง {plot.number}
          {/* แถวที่แก้แล้วต้องเห็นได้ตอนกวาดตาทั้งรายการ — ไม่ต้องจำว่าแก้แปลงไหนไป */}
          {edited && (
            <span className="text-13 text-pine ml-2 font-sans font-semibold">แก้แล้ว</span>
          )}
        </p>
        <p className="text-13 text-moss">
          {houseName}
          {projectName && ` · ${projectName}`}
          {plot.status !== original.status && ` · สถานะเดิม ${STATUS_TH[original.status]}`}
        </p>
      </div>
      <p className="text-15 font-display pt-2 text-right font-medium tabular-nums xl:text-left">
        {plot.landSqw} <span className="text-13 text-moss font-sans font-normal">ตร.ว.</span>
      </p>
      <div className="col-span-2 xl:col-span-1 xl:pt-0.5">
        <StatusPicker
          name={`status-${plot.id}`}
          label={`สถานะแปลง ${plot.number}`}
          value={plot.status}
          onChange={(status) => edit({ status })}
        />
      </div>
      <PriceField
        label={`ราคาแปลง ${plot.number}`}
        value={plot.price}
        original={original.price}
        onCommit={(price) => edit({ price })}
        emptyHint={
          housePriceFrom === undefined ? "ยังไม่มีราคารายแปลง" : `ราคาแบบ ${baht(housePriceFrom)}`
        }
      />
      <div>
        {edited && (
          <button
            type="button"
            onClick={() => {
              onEdit?.();
              resetPlot(plot.id);
            }}
            className={TEXT_BUTTON}
          >
            คืนค่าเดิม
          </button>
        )}
      </div>
      {staleNote && <p className="text-13 text-moss col-span-full -mt-1">{staleNote}</p>}
    </div>
  );
}

export function PlotTable({
  plots,
  houseTypes,
  projects,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  /** โครงการที่มีแปลง — ตัวกรองโครงการโผล่เมื่อมีมากกว่าหนึ่ง */
  projects: AdminProject[];
}) {
  const [project, setProjectState] = useState<string>("all");
  const scoped = project === "all" ? plots : plots.filter((p) => p.projectId === project);
  const live = useLivePlots(scoped);
  const edits = useDemo((s) => s.plots);
  const resetPlot = useDemo((s) => s.resetPlot);
  const [filter, setFilterState] = useState<Filter>("all");
  /* แถวที่แก้ระหว่างดูตัวกรองนี้ — ค้างไว้จนกว่าจะเปลี่ยนตัวกรอง แถวจะได้ไม่หายไปกลางมือ */
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const keep = (id: string) => setKept((k) => (k.has(id) ? k : new Set(k).add(id)));
  const setFilter = (f: Filter) => {
    setFilterState(f);
    setKept(new Set());
  };

  /* คืนค่าเดิมทั้งหมด = สองจังหวะ กดครั้งแรกถามยืนยันในที่เดิม (ไม่ใช้ window.confirm) */
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (returnFocus.current) triggerRef.current?.focus();
    returnFocus.current = false;
  }, [confirming]);

  const houseName = (id: string) => houseTypes.find((h) => h.id === id)?.name ?? "—";
  const projectName = (id: string) => projects.find((x) => x.id === id)?.label ?? id;
  const setProject = (id: string) => {
    setProjectState(id);
    setKept(new Set());
  };
  /* แปลงที่แก้แล้วนับเฉพาะโครงการที่กรองอยู่ — ปุ่มคืนค่าทั้งหมดคืนเฉพาะที่เห็น */
  const editedIds = Object.keys(edits).filter((id) => scoped.some((p) => p.id === id));
  const editedCount = editedIds.length;
  /* ไม่มีอะไรให้คืนแล้ว (เช่นคืนทีละแถวจนหมด) — ปิดคำถามยืนยันที่ค้างอยู่ */
  if (confirming && editedCount === 0) setConfirming(false);
  const cancel = () => {
    returnFocus.current = true;
    setConfirming(false);
  };
  /* คืนเฉพาะแปลง — ค่าแบบบ้านที่แก้ไว้ไม่เกี่ยวกับปุ่มในหน้านี้ (resetAll ของ demo ล้างแบบบ้านด้วย)
     ไม่ค้างแถว: ผู้ใช้ยืนยันแล้วว่าต้องการล้างทั้งหมด ตารางกลับไปตามตัวกรองตรงๆ */
  const resetAllPlots = () => {
    editedIds.forEach(resetPlot);
    setKept(new Set());
    setConfirming(false);
  };
  const count = (f: Filter) =>
    f === "all"
      ? live.length
      : f === "edited"
        ? editedCount
        : live.filter((p) => p.status === f).length;
  const matches = (p: Plot) =>
    filter === "all" ? true : filter === "edited" ? p.id in edits : p.status === filter;
  const shown = live.filter((p) => matches(p) || kept.has(p.id));
  const filterLabel = (f: Filter) =>
    f === "all" ? "ทั้งหมด" : f === "edited" ? "แก้แล้ว" : STATUS_TH[f];

  const filters: Filter[] = ["all", ...STATUSES, "edited"];

  return (
    <div>
      {projects.length > 1 && (
        <ToggleGroup
          className="mb-3"
          label="กรองตามโครงการ"
          size="pill"
          options={[
            { id: "all", label: `ทุกโครงการ ${plots.length}` },
            ...projects.map((x) => ({
              id: x.id,
              label: `${x.label} ${plots.filter((p) => p.projectId === x.id).length}`,
            })),
          ]}
          value={project}
          onSelect={setProject}
        />
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          label="กรองแปลง"
          size="pill"
          options={filters.map((f) => ({
            id: f,
            label: `${filterLabel(f)} ${count(f)}`,
          }))}
          value={filter}
          onSelect={setFilter}
        />
        {editedCount > 0 &&
          (confirming ? (
            <div
              role="group"
              aria-label="ยืนยันคืนค่าเดิมทั้งหมด"
              className="ease-settle flex flex-wrap items-center gap-x-4 gap-y-2 transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none"
              onKeyDown={(e) => e.key === "Escape" && cancel()}
            >
              <p className="text-15 text-moss">
                สถานะและราคาที่แก้ไว้ {editedCount} แปลงจะกลับเป็นค่าเดิม
              </p>
              <button type="button" onClick={resetAllPlots} className={buttonClass("primary")}>
                ยืนยันคืนค่า {editedCount} แปลง
              </button>
              <button type="button" ref={cancelRef} onClick={cancel} className={TEXT_BUTTON}>
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setConfirming(true)}
              className={buttonClass("secondary")}
            >
              คืนค่าเดิมทั้งหมด
            </button>
          ))}
      </div>

      <div className="bg-paper border-concrete rounded-card border">
        <div
          aria-hidden
          className={cx("text-13 text-moss border-concrete hidden border-b px-5 py-3", GRID)}
        >
          <span>แปลง · แบบบ้าน · โครงการ</span>
          <span>ที่ดิน</span>
          <span>สถานะ</span>
          <span className="text-right">ราคา</span>
          <span />
        </div>
        <ul aria-label="รายการแปลง">
          {shown.map((p) => {
            const original = plots.find((o) => o.id === p.id) ?? p;
            return (
              <li
                key={p.id}
                className={cx(
                  "border-concrete border-b px-5 py-4 last:border-b-0",
                  /* §4 สถานะเปลี่ยน (สี lerp) — แถวที่แก้แล้วลงพื้นต่างระดับ (canvas) แทนการใช้สีเน้น */
                  "ease-settle transition-colors duration-200 motion-reduce:transition-none",
                  p.id in edits && "bg-canvas",
                )}
              >
                <PlotRow
                  plot={p}
                  original={original}
                  houseName={houseName(p.houseTypeId)}
                  housePriceFrom={houseTypes.find((h) => h.id === p.houseTypeId)?.priceFrom}
                  projectName={projectName(p.projectId)}
                  onEdit={() => keep(p.id)}
                  staleNote={
                    matches(p)
                      ? undefined
                      : `ไม่ตรงกับตัวกรอง "${filterLabel(filter)}" · แถวนี้จะหายไปเมื่อเปลี่ยนตัวกรอง`
                  }
                />
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && (
          <p className="text-15 text-moss px-5 py-8">
            {filter === "edited"
              ? "ยังไม่มีแปลงที่แก้ค่า เปลี่ยนสถานะหรือราคาแปลงไหนก็ได้ แล้วแปลงนั้นจะมาอยู่ในกลุ่มนี้"
              : `ตอนนี้ไม่มีแปลงสถานะ${filter === "all" ? "ใด" : STATUS_TH[filter]}`}
          </p>
        )}
      </div>
    </div>
  );
}
