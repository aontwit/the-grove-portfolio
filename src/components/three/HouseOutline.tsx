"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  WALL_M,
  houseBounds,
  roomArea,
  solidRuns,
  walls,
  type Bounds,
  type GeomRoom,
} from "@/geometry";
import type { HouseType } from "@/lib/schemas";
import { useDict } from "@/i18n/client";
import { DimensionLine } from "./DimensionLine";

/* ภาพย่อของแบบบ้าน — ผนังจริงจาก walls() ย่อส่วน
   วาดเฉพาะชั้นล่าง = รูปที่บ้านวางลงบนดินจริง ถ้าซ้อนทุกชั้นรวมกัน รูปจะไม่ใช่ทั้งผังและทั้งเงา

   ค่าเริ่มต้นคือภาพเปล่า (การ์ดแบบบ้าน, ภาพรอโหลดของฉากแรก) ไม่มี label
   annotate = แบบเขียนจริง: ชื่อห้อง + พื้นที่ เส้นบอกระยะรวม และทิศเหนือ (§0 — ข้อมูลจริงบนผัง)

   ทิศ: northDeg = 0 แกน z ของบ้านชี้ไปทิศเหนือ (+z) และ x ชี้ตะวันออก (+x) — ค่าอื่นหมุนตามเข็มนาฬิกา ตรงกับ sunPosition()
   (เช้าดวงอาทิตย์อยู่ +x เที่ยงอยู่ −z) และตรงกับชื่อหน้าต่างใน data (w-living-south อยู่ที่ z ต่ำสุด)
   แปลนพลิก z เป็นแกน y ของ SVG ด้วย Y(z) = −z +z จึงอยู่บนจอ (เหนือ เมื่อ northDeg = 0)

   ตัวอักษร: หน่วยใน SVG คือเมตร ถ้าใส่ขนาดคงที่ตัวอักษรจะย่อตามจอ จึงวัดความกว้างจริงแล้วแปลง px → เมตร
   ป้ายทั้งหมดอยู่บนสเกล 13px ของ §2 ทุกจอ ห้องไหนแคบกว่าข้อความที่วัดได้จริงจะไม่ใส่ป้าย (ไม่ย่อให้จิ๋ว)
   ส่วน annotation วาดเลยขอบ viewBox ออกไปในช่องว่างรอบรูป (overflow visible) ขนาดของรูปบ้าน
   จึงขึ้นกับกรอบร่วมอย่างเดียว ป้ายที่โผล่หลังวัดขนาดไม่ทำให้ layout ขยับ */

export const Y = (z: number) => -z;
const half = WALL_M / 2;
const LABEL_PX = 13;
const LINE_PX = 16;
const INSET_PX = 4;

/** สิ่งที่ overlay ของผู้เรียกได้รับ — วาดลงพิกัดเมตรเดียวกับผนัง */
export type OutlineDrawing = {
  /** px บนจอ → เมตรใน viewBox */
  px: (n: number) => number;
  /** กรอบห้องในบ้านชั้นล่าง */
  frame: Bounds;
  rooms: readonly GeomRoom[];
};

type Side = { top: number; right: number; bottom: number; left: number };
type Corner = "top-right" | "top-left" | "bottom-left" | "bottom-right";

export type OutlineAnnotation = {
  /** ด้านที่วางเส้นบอกระยะความกว้าง (แกน x) และความลึก (แกน z) */
  dims?: { x: "top" | "bottom"; z: "left" | "right" };
  /** มุมที่วางลูกศรทิศเหนือ (นอกกรอบรูป) */
  north?: Corner;
  /** ช่องว่างรอบรูปเป็น px — ต้องพอให้ annotation และ overlay ของผู้เรียก */
  pad?: Partial<Side>;
};

const DEFAULT_PAD: Side = { top: 28, right: 16, bottom: 34, left: 44 };

const roundM = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

let ctx2d: CanvasRenderingContext2D | null = null;
/** วัดความกว้างข้อความจริงด้วยฟอนต์ที่หน้าใช้อยู่ — ไม่เดาจากจำนวนตัวอักษร */
function textWidth(text: string, font: string): number {
  ctx2d ??= document.createElement("canvas").getContext("2d");
  if (!ctx2d) return Infinity;
  ctx2d.font = font;
  return ctx2d.measureText(text).width;
}

export function HouseOutline({
  house,
  frameSize,
  annotate,
  overlay,
  className,
  label,
}: {
  house: HouseType;
  /** กรอบร่วมเป็นเมตร — ใส่ค่านี้เมื่อวางหลายแบบเทียบกัน ทุกภาพจะได้อยู่ที่สเกลเดียวกัน
      ขนาดที่ตาเห็นจึงเป็นขนาดจริงที่ต่างกัน ไม่ใช่ทุกหลังถูกย่อให้พอดีกรอบของตัวเอง */
  frameSize?: { w: number; d: number };
  /** เปิดชื่อห้อง พื้นที่ เส้นบอกระยะ ทิศเหนือ — ไม่ใส่ = ภาพเปล่าแบบเดิม */
  annotate?: OutlineAnnotation | true;
  /** ของที่ผู้เรียกวาดทับในพิกัดเดียวกัน (เช่นลูกศรแดด) */
  overlay?: (d: OutlineDrawing) => ReactNode;
  className?: string;
  /** คำอธิบายสำหรับ screen reader — ไม่ใส่ = ภาพตกแต่ง (aria-hidden) */
  label?: string;
}) {
  const t = useDict();
  const rooms = house.rooms.filter((r) => (r.floor ?? 1) === 1);
  const openings = house.openings.filter((o) => (o.floor ?? 1) === 1);
  const frame = houseBounds(rooms);
  const outdoorIds = new Set(rooms.filter((r) => r.outdoor).map((r) => r.id));
  const isIndoor = (id: string | null) => id !== null && !outdoorIds.has(id);
  const segments = walls(rooms, openings).filter(
    (s) => isIndoor(s.roomMinus) || isIndoor(s.roomPlus),
  );
  const indoor = rooms.filter((r) => !r.outdoor);
  const vbPad = 0.4;
  const vw = (frameSize?.w ?? frame.x1 - frame.x0) + vbPad * 2;
  const vh = (frameSize?.d ?? frame.z1 - frame.z0) + vbPad * 2;
  const vx = (frame.x0 + frame.x1) / 2 - vw / 2;
  const vy = Y((frame.z0 + frame.z1) / 2) - vh / 2;

  const opts: OutlineAnnotation | null = annotate === true ? {} : (annotate ?? null);
  const drawn = opts !== null || overlay !== undefined;
  const pad: Side = opts
    ? { ...DEFAULT_PAD, ...opts.pad }
    : { top: 0, right: 0, bottom: 0, left: 0 };

  const svgRef = useRef<SVGSVGElement>(null);
  /* ความกว้างจริงของรูป (px) + ฟอนต์ที่โหลดแล้ว — ก่อน mount ยังไม่รู้ จึงยังไม่วาด annotation */
  const [measure, setMeasure] = useState<{ widthPx: number; font: string } | null>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !drawn) return;
    let alive = true;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!alive || w <= 0) return;
      setMeasure({ widthPx: w, font: getComputedStyle(el).fontFamily });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    /* ความกว้างข้อความต้องวัดด้วยฟอนต์จริง ไม่ใช่ fallback ที่ยังโหลดไม่เสร็จ */
    void document.fonts.ready.then(update);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [drawn]);

  const px = (n: number) => (measure ? (n * vw) / measure.widthPx : 0);
  const fits = (text: string, weight: number, maxPx: number) =>
    measure !== null &&
    textWidth(text, `${weight} ${LABEL_PX}px ${measure.font}`) + INSET_PX * 2 <= maxPx;

  const style: CSSProperties | undefined = opts
    ? { padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px` }
    : undefined;

  const dims = opts?.dims ?? { x: "bottom", z: "left" };
  const dimGap = 22;

  return (
    <div className={className} style={style}>
      <svg
        ref={svgRef}
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        overflow="visible"
        className="font-sans block w-full"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {indoor.map((r) => (
          <rect
            key={r.id}
            x={r.x0}
            y={Y(r.z1)}
            width={r.x1 - r.x0}
            height={r.z1 - r.z0}
            fill="var(--paper)"
          />
        ))}
        <g className="fill-ironwood">
          {segments.flatMap((seg) =>
            solidRuns(seg).map((run, i) =>
              seg.axis === "z" ? (
                <rect
                  key={`${seg.id}-${i}`}
                  x={seg.at - half}
                  y={Y(run.to)}
                  width={WALL_M}
                  height={run.to - run.from}
                />
              ) : (
                <rect
                  key={`${seg.id}-${i}`}
                  x={run.from}
                  y={Y(seg.at) - half}
                  width={run.to - run.from}
                  height={WALL_M}
                />
              ),
            ),
          )}
        </g>

        {opts && measure && (
          <>
            {/* ชื่อห้อง + พื้นที่ — ใส่เมื่อข้อความที่วัดได้พอดีห้องที่ขนาดบนจอจริง
                ห้องแคบลงมาเหลือแค่ชื่อ แคบกว่านั้นไม่มีป้าย ดีกว่าป้ายล้นผนัง */}
            <g className="fill-moss" fontSize={px(LABEL_PX)}>
              {indoor.map((r) => {
                const wPx = (r.x1 - r.x0 - WALL_M) / px(1);
                const hPx = (r.z1 - r.z0 - WALL_M) / px(1);
                const area = `${roomArea(r).toFixed(2)} ${t.units.sqm}`;
                const nameFits = fits(r.name, 500, wPx) && hPx >= LINE_PX + INSET_PX * 2;
                const areaFits =
                  nameFits && fits(area, 400, wPx) && hPx >= LINE_PX * 2 + INSET_PX * 2;
                if (!nameFits) return null;
                const cx = (r.x0 + r.x1) / 2;
                const cy = Y((r.z0 + r.z1) / 2);
                return (
                  <text key={r.id} x={cx} textAnchor="middle" data-room-label={r.id}>
                    <tspan
                      x={cx}
                      y={areaFits ? cy - px(LINE_PX / 2) : cy}
                      dominantBaseline="central"
                      fontWeight={500}
                    >
                      {r.name}
                    </tspan>
                    {areaFits && (
                      <tspan
                        x={cx}
                        y={cy + px(LINE_PX / 2)}
                        dominantBaseline="central"
                        className="tabular-nums"
                      >
                        {area}
                      </tspan>
                    )}
                  </text>
                );
              })}
            </g>

            {/* เส้นบอกระยะรวมของตัวบ้าน — ค่ามาจาก houseBounds() ไม่ได้พิมพ์มือ
                เส้นกว้าง 1px บนจอทุกสเกล (non-scaling) ไม่บางจนหายเมื่อรูปเล็ก */}
            <g className="[&_line]:[stroke-width:1px] [&_line]:[vector-effect:non-scaling-stroke]">
              {(() => {
                const y = dims.x === "bottom" ? Y(frame.z0) + px(dimGap) : Y(frame.z1) - px(dimGap);
                /* วาดจากขวาไปซ้าย ตัวเลขของ DimensionLine จึงอยู่เหนือเส้น ไม่ทับเส้น */
                return (
                  <DimensionLine
                    x1={frame.x1}
                    y1={y}
                    x2={frame.x0}
                    y2={y}
                    tick={px(5)}
                    fontSize={px(LABEL_PX)}
                    label={`${roundM(frame.x1 - frame.x0)} ${t.units.m}`}
                  />
                );
              })()}
              {(() => {
                const x = dims.z === "left" ? frame.x0 - px(dimGap) : frame.x1 + px(dimGap);
                const my = Y((frame.z0 + frame.z1) / 2);
                /* แนวตั้ง: ตัวเลขของ DimensionLine จะคร่อมเส้นเมื่อรูปเล็ก จึงวางตัวเลขเองนอกเส้น */
                const tx = dims.z === "left" ? x - px(5) : x + px(5);
                return (
                  <>
                    <DimensionLine
                      x1={x}
                      y1={Y(frame.z0)}
                      x2={x}
                      y2={Y(frame.z1)}
                      tick={px(5)}
                      fontSize={px(LABEL_PX)}
                      label=""
                    />
                    <text
                      x={tx}
                      y={my}
                      transform={`rotate(${dims.z === "left" ? -90 : 90} ${tx} ${my})`}
                      textAnchor="middle"
                      className="font-display fill-pine"
                      fontSize={px(LABEL_PX)}
                      fontWeight={600}
                    >
                      {roundM(frame.z1 - frame.z0)} {t.units.m}
                    </text>
                  </>
                );
              })()}
            </g>

            {/* ทิศเหนือ — northDeg = 0 ชี้ขึ้นบนจอ (+z) ค่าอื่นหมุนตาม (ดูหัวไฟล์) */}
            {(() => {
              const corner = opts.north ?? "top-right";
              const right = corner.endsWith("right");
              const top = corner.startsWith("top");
              const ax = right ? vx + vw - px(10) : vx - px(pad.left - 10);
              const ay = top ? vy - px(pad.top / 2) : vy + vh + px(pad.bottom / 2);
              return (
                <g
                  transform={`translate(${ax} ${ay}) scale(${px(1)})`}
                  aria-label={t.scene.north}
                  role="img"
                >
                  {/* ลูกศรหมุนตาม northDeg ของแบบบ้าน (ตามเข็มนาฬิกาจากด้านบนแปลน) — ตัว N ตั้งตรงเสมอ */}
                  <polygon
                    points="0,-9 5,7 0,3.5 -5,7"
                    transform={`rotate(${house.northDeg})`}
                    className="fill-ironwood"
                  />
                  <text
                    x={right ? -9 : 9}
                    y={0}
                    textAnchor={right ? "end" : "start"}
                    dominantBaseline="central"
                    className="font-display fill-moss"
                    fontSize={LABEL_PX}
                    fontWeight={700}
                  >
                    N
                  </text>
                </g>
              );
            })()}
          </>
        )}

        {overlay && measure && overlay({ px, frame, rooms })}
      </svg>
    </div>
  );
}
