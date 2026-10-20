"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SITE_NORTH_DEG, plotRect } from "@/geometry";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";
import { useLivePlots } from "@/lib/demo";
import { useGrove } from "@/lib/store";
import { useDict } from "@/i18n/client";
import { DimensionLine } from "./DimensionLine";

/* ผังโครงการ 2D — ทุกรูปทรงมาจาก plots.json + plan ของโครงการ (เมตรทั้งหมด)
   ขอบเขตโครงการ = กรอบผังพอดี (หลังแปลงคือแนวกำแพงโครงการ) เหมือนหมู่บ้าน 3D
   sample = ผังแปลงตัวอย่าง: ป้าย "ผังแปลงตัวอย่าง รอผังจริง" อยู่ในภาพผังเอง ทุกที่ที่วางผังจึงติดป้ายเสมอ
   ขนาดแปลงคำนวณจาก landSqw ไม่ได้เก็บความกว้างซ้ำไว้ใน data
   ขนาดตัวอักษรแปลงจาก px จริงเหมือนแปลนบ้าน เพื่อให้คงอยู่บน type scale §2 ทุกจอ */

const PAD = { left: 7, right: 12, top: 9, bottom: 13 };

/** กรอบ viewBox ของผัง (เมตร) — ฉากหน้าแรกใช้หาจุดกลางผังเพื่อวางทับหมู่บ้าน 3D */
export function planViewBox(plan: SitePlan) {
  return {
    x: -PAD.left,
    y: -PAD.top,
    w: plan.widthM + PAD.left + PAD.right,
    h: plan.depthM + PAD.top + PAD.bottom,
  };
}
const FALLBACK_PX = 900;

/** แปลงแคบสุดต้องกว้างบนจอไม่น้อยกว่านี้ ป้ายสามบรรทัดในกล่องแปลงจึงไม่ล้นไปทับแปลงข้างๆ */
const MIN_PLOT_PX = 64;

/** ความกว้างขั้นต่ำของผังแนวนอน — อย่างน้อย 900px หรือกว้างพอให้แปลงแคบสุดได้ MIN_PLOT_PX
    (ผังยาวกว่าจอได้ ผู้ใช้ปัดดูในกรอบ) */
function minWidthPx(plan: SitePlan, plots: readonly Plot[]) {
  const narrowest = Math.min(...plots.map((p) => plotRect(p, plan.plotDepthM).width));
  const vb = planViewBox(plan);
  return Number.isFinite(narrowest)
    ? Math.max(900, Math.ceil((MIN_PLOT_PX * vb.w) / narrowest))
    : 900;
}

/** media query ที่ตามจอจริง — SSR และรอบ hydrate ได้ false ก่อน แล้วสลับเองไม่ต้อง setState ใน effect */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** จอแคบกว่า 640px: ผังแนวตั้ง — ทุกที่ที่วางผังเต็มกว้างใช้เกณฑ์เดียวกัน */
export function usePortraitPlan() {
  return useMediaQuery("(max-width: 639px)");
}

const FILL: Record<
  Plot["status"],
  { fill: string; opacity: number; stroke: string; text: string; dash?: string }
> = {
  available: {
    fill: "var(--st-available-bg)",
    opacity: 1,
    stroke: "var(--st-available)",
    text: "var(--st-available)",
  },
  /* พื้นทึบตามคู่ §1 — เดิมเป็น marigold โปร่ง 14% ทับ paper ซึ่งในโหมดมืดกลายเป็นพื้นเข้ม
     ตัวอักษร marigold-deep เหลือ 2.28:1 · พื้นทึบได้ 5.24:1 ทั้งสองโหมด */
  reserved: {
    fill: "var(--st-reserved-bg)",
    opacity: 1,
    stroke: "var(--marigold)",
    text: "var(--marigold-deep)",
  },
  sold: { fill: "var(--st-sold-bg)", opacity: 1, stroke: "var(--st-sold)", text: "var(--st-sold)" },
  /* ยังไม่รู้สถานะ — พื้น chalk ขอบเส้นประ ตัวอักษร st-label-muted (5.86:1) คงที่ทั้งสองโหมด */
  unconfirmed: {
    fill: "var(--st-unconfirmed-bg)",
    opacity: 1,
    stroke: "var(--st-unconfirmed)",
    text: "var(--st-unconfirmed)",
    dash: "0.8 0.5",
  },
};

export function MasterPlan2D({
  plots: source,
  plan,
  houseTypes,
  portrait = false,
  sample = false,
}: {
  plots: Plot[];
  plan: SitePlan;
  /** ส่งมาเมื่ออยากให้ป้ายแปลงบอกชื่อแบบบ้าน (ไม่ส่ง = บอกขนาดที่ดินแทน) */
  houseTypes?: HouseType[];
  /** จอแคบ: หมุนผังตั้ง 90° ให้แนวยาวของผังวิ่งลงตามจอ — geometry เดิม ตัวหนังสือหมุนกลับให้ตั้งตรง */
  portrait?: boolean;
  /** ผังแปลงตัวอย่าง (project.pending.plots) — แสดงป้ายในภาพผัง */
  sample?: boolean;
}) {
  const t = useDict();
  /* อ่านผ่าน overlay เดโมที่นี่ — ผังทุกที่ (หน้าแรก ผังโครงการ ภาพรวม admin) ตามสถานะที่แก้ทันที */
  const plots = useLivePlots(source);
  const svgRef = useRef<SVGSVGElement>(null);
  const [widthPx, setWidthPx] = useState(FALLBACK_PX);
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedPlot = useGrove((s) => s.selectedPlot);
  const selectPlot = useGrove((s) => s.selectPlot);
  const statusFilter = useGrove((s) => s.statusFilter);

  const vb = planViewBox(plan);
  const houseById = houseTypes ? new Map(houseTypes.map((h) => [h.id, h] as const)) : null;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    /* ตอน layer ถูกซ่อน contentRect.width = 0 ซึ่งทำให้ขนาดตัวอักษรกลายเป็น Infinity
       เก็บค่าล่าสุดที่ใช้ได้ไว้แทน */
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0;
      if (w > 0) setWidthPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* portrait: rotate(90) พา (x,y) ไป (-y,x) — viewBox จึงสลับแกนและกลับด้าน y */
  const view = portrait ? { x: -(vb.y + vb.h), y: vb.x, w: vb.h, h: vb.w } : vb;
  const px = (n: number) => (n * view.w) / widthPx;
  /** หมุนตัวหนังสือกลับรอบจุดวางของมันเอง ให้อ่านตั้งตรงในผังแนวตั้ง */
  const upright = (x: number, y: number) => (portrait ? `rotate(-90 ${x} ${y})` : undefined);
  /** ป้ายที่ซ้อนหลายบรรทัด: dy คือระยะลงตามจอ — แนวตั้ง "ลงจอ" คือแกน +x ของผัง ไม่ใช่ +y */
  const lab = (x: number, y: number, dy: number) =>
    portrait
      ? { x: x + dy, y, transform: upright(x + dy, y) }
      : { x, y: y + dy, transform: undefined };
  const dimY = plan.depthM + 4.5;
  const footerY = plan.depthM + 9.5;

  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      /* แนวนอน: ผังกว้าง 180 ม. บีบลงจอแคบแล้วป้ายทับกัน — คงสเกลขั้นต่ำไว้ให้ปัดดู
         แนวตั้ง: เต็มความกว้างจอ เลื่อนลงตามหน้าปกติ */
      className="bg-canvas w-full"
      style={portrait ? undefined : { minWidth: minWidthPx(plan, plots) }}
      aria-label={`${sample ? `${t.common.sampleSite} · ` : ""}${t.scene.sitePlanLabel(plots.length, plan.widthM, plan.depthM)}`}
    >
      <g transform={portrait ? "rotate(90)" : undefined}>
        {/* ขอบเขตโครงการ = กำแพงโครงการ ชิดหลังแปลงทั้งสองแถว */}
        <rect
          x={0}
          y={0}
          width={plan.widthM}
          height={plan.depthM}
          fill="var(--paper)"
          stroke="var(--moss)"
          strokeWidth={0.3}
        />
        {/* แนวตั้งไม่มีที่ว่างเหนือผัง — MasterPlanViewer ติดป้ายเดียวกันไว้นอกภาพแทน */}
        {sample && !portrait && (
          <text
            x={0}
            y={-px(10)}
            className="fill-moss font-sans"
            fontSize={px(13)}
            fontWeight={500}
          >
            {t.common.sampleSite}
          </text>
        )}

        {/* ถนนกลาง */}
        <rect
          x={0}
          y={plan.roadY0}
          width={plan.widthM}
          height={plan.roadY1 - plan.roadY0}
          fill="var(--concrete)"
        />
        <line
          x1={0}
          y1={(plan.roadY0 + plan.roadY1) / 2}
          x2={plan.widthM}
          y2={(plan.roadY0 + plan.roadY1) / 2}
          stroke="var(--moss)"
          strokeWidth={0.18}
          strokeDasharray="2.4 2"
        />

        {/* ส่วนกลาง */}
        {plan.amenities.map((a) => (
          <g key={a.id}>
            <rect
              x={a.x0}
              y={a.y0}
              width={a.x1 - a.x0}
              height={a.y1 - a.y0}
              fill="var(--canvas)"
              stroke="var(--concrete)"
              strokeWidth={0.25}
            />
            <text
              {...lab((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2, px(5))}
              textAnchor="middle"
              className="fill-moss font-sans"
              fontSize={px(13)}
              fontWeight={500}
            >
              {a.name}
            </text>
          </g>
        ))}

        {/* แปลง */}
        {plots.map((p) => {
          const r = plotRect(p, plan.plotDepthM);
          const selected = p.id === selectedPlot;
          const dimmed = statusFilter !== "all" && statusFilter !== p.status;
          const style = FILL[p.status];
          return (
            <g
              key={p.id}
              tabIndex={dimmed ? -1 : 0}
              role="button"
              aria-pressed={selected}
              aria-hidden={dimmed}
              aria-labelledby={`${p.id}-no ${p.id}-land ${p.id}-status`}
              data-plot={p.number}
              data-plot-id={p.id}
              data-status={p.status}
              className={`focus:outline-none [&:focus-visible>rect]:stroke-pine [&:focus-visible>rect]:[stroke-width:0.8] ${
                dimmed ? "pointer-events-none opacity-25" : "cursor-pointer"
              }`}
              onClick={() => selectPlot(selected ? null : p.id)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                selectPlot(selected ? null : p.id);
              }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
            >
              <rect
                x={r.x0}
                y={r.y0}
                width={r.width}
                height={r.depth}
                fill={style.fill}
                fillOpacity={style.opacity}
                strokeDasharray={selected ? undefined : style.dash}
                /* แปลงที่เลือกใช้เส้น ironwood หนา — marigold คือสีของสถานะ "จอง" อยู่แล้ว ใช้ซ้ำแล้วแยกไม่ออก */
                stroke={selected ? "var(--st-label)" : style.stroke}
                strokeWidth={selected ? 0.75 : hovered === p.id ? 0.5 : 0.25}
                /* §4 สถานะเปลี่ยน = สี lerp — เห็นตอน admin แก้สถานะแล้วผังเปลี่ยนตาม */
                className="transition-[fill,fill-opacity,stroke] duration-250 motion-reduce:transition-none"
              />
              <text
                id={`${p.id}-no`}
                {...lab(p.px, p.py, -px(8))}
                textAnchor="middle"
                /* พื้นแปลงเป็นสีสถานะที่คงที่ทั้งสองโหมด — ใช้ ironwood ในโหมดมืดแล้วได้ 1.02:1 */
                className="fill-st-label font-display pointer-events-none"
                fontSize={px(17)}
                fontWeight={600}
              >
                {p.number}
              </text>
              <text
                id={`${p.id}-land`}
                {...lab(p.px, p.py, px(9))}
                textAnchor="middle"
                className="fill-st-label-muted font-display pointer-events-none"
                fontSize={px(13)}
                fontWeight={600}
              >
                {houseById?.get(p.houseTypeId)?.name ?? `${p.landSqw} ${t.units.sqw}`}
              </text>
              {/* §1: สถานะต้องมี label เสมอ ห้ามสื่อด้วยสีอย่างเดียว */}
              {/* คำเต็มสำหรับ screen reader — ในภาพใช้คำสั้นเพราะแปลงแคบสุดกว้างราว 64px */}
              <title id={`${p.id}-status`}>{t.status[p.status]}</title>
              <text
                aria-hidden="true"
                {...lab(p.px, p.py, px(24))}
                textAnchor="middle"
                className="font-sans pointer-events-none"
                fill={style.text}
                fontSize={px(13)}
                fontWeight={500}
              >
                {t.statusShort[p.status]}
              </text>
            </g>
          );
        })}

        {/* ทางเข้าโครงการ */}
        <g className="pointer-events-none">
          <polygon
            points={`${-1.2},${plan.entryY} ${-5.2},${plan.entryY - 2} ${-5.2},${plan.entryY + 2}`}
            className="fill-pine"
          />
          <text
            {...(portrait ? lab(-5.2, plan.entryY, -px(12)) : { x: -3.2, y: plan.entryY - 3 })}
            textAnchor="middle"
            className="fill-pine font-sans"
            fontSize={px(13)}
            fontWeight={600}
          >
            {t.scene.entry}
          </text>
        </g>

        {/* เส้นบอกระยะรวมและสเกลบาร์ */}
        <g className="pointer-events-none">
          <DimensionLine
            x1={0}
            y1={dimY}
            x2={plan.widthM}
            y2={dimY}
            label={`${plan.widthM.toFixed(1)} ${t.units.m}`}
            fontSize={px(13)}
            tick={1.4}
            frameDeg={portrait ? 90 : 0}
          />
          <DimensionLine
            x1={plan.widthM + 5.5}
            y1={0}
            x2={plan.widthM + 5.5}
            y2={plan.depthM}
            label={`${plan.depthM.toFixed(1)} ${t.units.m}`}
            fontSize={px(13)}
            tick={1.4}
            frameDeg={portrait ? 90 : 0}
          />
          <g className="stroke-ironwood fill-ironwood" strokeWidth={0.18}>
            <line x1={plan.widthM - 10} y1={footerY} x2={plan.widthM} y2={footerY} />
            <line
              x1={plan.widthM - 10}
              y1={footerY - 0.9}
              x2={plan.widthM - 10}
              y2={footerY + 0.9}
            />
            <line x1={plan.widthM} y1={footerY - 0.9} x2={plan.widthM} y2={footerY + 0.9} />
            <text
              /* แนวตั้ง: สเกลบาร์ตั้งชิดขอบซ้ายจอ — ป้ายไปอยู่ขวาของเส้น ไม่งั้นล้นขอบจอ */
              {...(portrait
                ? {
                    x: plan.widthM - 5,
                    y: footerY - px(8),
                    transform: upright(plan.widthM - 5, footerY - px(8)),
                    textAnchor: "start" as const,
                    dominantBaseline: "middle" as const,
                  }
                : {
                    x: plan.widthM - 10 - px(8),
                    y: footerY + px(4.5),
                    textAnchor: "end" as const,
                  })}
              className="fill-moss font-display"
              fontSize={px(13)}
              fontWeight={600}
              stroke="none"
            >
              10 {t.units.m}
            </text>
          </g>
        </g>

        {/* ทิศเหนือของผัง — ค่ากลางตัวเดียวกับที่รายการแปลงใช้บอกทิศ (geometry SITE_NORTH_DEG)
            ลูกศรตั้งต้นชี้ขึ้น (−y) · SITE_NORTH_DEG = 180 คือเหนือขึ้นจอ หมุนตามเข็ม 180° − northDeg */}
        <g
          className="pointer-events-none"
          transform={`translate(${plan.widthM - 27} ${footerY})`}
          role="img"
          aria-label={t.scene.north}
        >
          <polygon
            points="0,-9 5,7 0,3.5 -5,7"
            transform={`rotate(${180 - SITE_NORTH_DEG}) scale(${px(1)})`}
            className="fill-ironwood"
          />
          <text
            {...lab(px(10), 0, 0)}
            textAnchor={portrait ? "middle" : "start"}
            dominantBaseline="central"
            className="font-display fill-moss"
            fontSize={px(13)}
            fontWeight={700}
          >
            N
          </text>
        </g>
      </g>
    </svg>
  );
}
