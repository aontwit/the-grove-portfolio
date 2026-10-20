"use client";

import { useEffect, useRef, useState } from "react";
import { WALL_M, houseBounds, openingCenter, roomArea, solidRuns, walls } from "@/geometry";
import type { HouseType } from "@/lib/schemas";
import { useDict } from "@/i18n/client";
import { useGrove } from "@/lib/store";
import { DimensionLine } from "./DimensionLine";

/* แปลน 2D วาดจาก src/geometry เท่านั้น — ไม่มีพิกัดใดเขียนไว้ในไฟล์นี้
   แกน z ของบ้านชี้เข้าหลังบ้าน แปลนพลิกเป็นแกน y ของ SVG ด้วย Y(z) = -z (หน้าบ้านอยู่ล่าง)

   ขนาดตัวอักษร: หน่วยใน SVG คือเมตร ถ้าใส่ค่าคงที่ ตัวอักษรจะเล็กลงตามจอ (บนมือถือเหลือ ~7px)
   จึงวัดความกว้างจริงแล้วแปลง px → เมตร เพื่อให้ทุก label อยู่บน type scale §2 เสมอทุกจอ */

const Y = (z: number) => -z;
const half = WALL_M / 2;
const PAD = { left: 2.6, right: 1.6, top: 1.4, bottom: 2.6 };
const FALLBACK_PX = 900;

export function FloorPlan2D({ house, floor = 1 }: { house: HouseType; floor?: number }) {
  const t = useDict();
  const svgRef = useRef<SVGSVGElement>(null);
  const [widthPx, setWidthPx] = useState(FALLBACK_PX);
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedRoom = useGrove((s) => s.selectedRoom);
  const selectRoom = useGrove((s) => s.selectRoom);

  /* ทำงานทีละชั้น — ห้องและช่องเปิดของชั้นอื่นไม่เกี่ยวกับภาพนี้ */
  const rooms = house.rooms.filter((r) => (r.floor ?? 1) === floor);
  const openings = house.openings.filter((o) => (o.floor ?? 1) === floor);
  const frame = houseBounds(rooms);
  const content = houseBounds(rooms, true);

  /* ผนังหนาวาดเฉพาะ segment ที่มีห้องในกรอบอยู่อย่างน้อยหนึ่งข้าง —
     ขอบของพื้นที่นอกกรอบ (ระเบียง) เป็นขอบพื้น ไม่ใช่ผนัง จึงใช้เส้นประของตัวห้องแทน */
  const outdoorIds = new Set(rooms.filter((r) => r.outdoor).map((r) => r.id));
  const isIndoor = (id: string | null) => id !== null && !outdoorIds.has(id);
  const segments = walls(rooms, openings).filter(
    (s) => isIndoor(s.roomMinus) || isIndoor(s.roomPlus),
  );

  const vb = {
    x: content.x0 - PAD.left,
    y: Y(content.z1) - PAD.top,
    w: content.x1 - content.x0 + PAD.left + PAD.right,
    h: content.z1 - content.z0 + PAD.top + PAD.bottom,
  };

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

  /* px บนจอ → หน่วยเมตรใน viewBox */
  const px = (n: number) => (n * vb.w) / widthPx;
  const roomy = widthPx >= 760;
  const nameSize = px(roomy ? 17 : 15);
  const metaSize = px(13);

  const dimY = Y(content.z0) + 0.95;
  const footerY = Y(content.z0) + 2.0;
  const entry = openings.find((o) => o.kind === "entry");

  const roomFill = (id: string, outdoor: boolean) => {
    if (id === selectedRoom) return { fill: "var(--marigold)", fillOpacity: 0.12 };
    if (id === hovered) return { fill: "var(--concrete)", fillOpacity: 0.6 };
    return { fill: outdoor ? "var(--canvas)" : "var(--paper)", fillOpacity: 1 };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className="bg-canvas w-full"
      aria-label={t.scene.planLabel(
        house.name,
        roundM(frame.x1 - frame.x0),
        roundM(frame.z1 - frame.z0),
      )}
    >
      {/* ห้อง — แตะหรือกด Enter เพื่อเลือก */}
      <g>
        {rooms.map((r) => {
          const area = roomArea(r);
          const selected = r.id === selectedRoom;
          return (
            <g
              key={r.id}
              tabIndex={0}
              role="button"
              aria-pressed={selected}
              aria-labelledby={`${r.id}-name ${r.id}-area`}
              data-room={r.id}
              data-area={area.toFixed(2)}
              className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-pine [&:focus-visible>rect]:[stroke-width:0.08]"
              onClick={() => selectRoom(selected ? null : r.id)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                selectRoom(selected ? null : r.id);
              }}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered((h) => (h === r.id ? null : h))}
            >
              <rect
                x={r.x0}
                y={Y(r.z1)}
                width={r.x1 - r.x0}
                height={r.z1 - r.z0}
                {...roomFill(r.id, r.outdoor)}
                stroke={selected ? "var(--marigold)" : "var(--concrete)"}
                strokeWidth={selected ? 0.07 : 0.02}
                strokeDasharray={r.outdoor ? "0.18 0.12" : undefined}
              />
              <text
                id={`${r.id}-name`}
                x={(r.x0 + r.x1) / 2}
                y={Y((r.z0 + r.z1) / 2) - px(4)}
                textAnchor="middle"
                className="fill-ironwood font-sans pointer-events-none"
                fontSize={nameSize}
                fontWeight={500}
              >
                {r.name}
              </text>
              <text
                id={`${r.id}-area`}
                x={(r.x0 + r.x1) / 2}
                y={Y((r.z0 + r.z1) / 2) + px(15)}
                textAnchor="middle"
                className="fill-moss font-display pointer-events-none"
                fontSize={metaSize}
                fontWeight={600}
              >
                {area.toFixed(2)} {t.units.sqm}
              </text>
            </g>
          );
        })}
      </g>

      {/* ผนัง — เว้นช่องตามช่องเปิดจริง */}
      <g className="fill-ironwood pointer-events-none">
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

      {/* ช่องเปิด: ขีดวงกบสองข้างทุกช่อง · หน้าต่างเพิ่มเส้นกระจกตรงกลางช่อง */}
      <g className="stroke-ironwood pointer-events-none" strokeWidth={0.025}>
        {openings.map((o) => {
          const jamb = (p: number) =>
            o.wallAxis === "z" ? (
              <line key={p} x1={o.at - half} y1={Y(p)} x2={o.at + half} y2={Y(p)} />
            ) : (
              <line key={p} x1={p} y1={Y(o.at) - half} x2={p} y2={Y(o.at) + half} />
            );
          return (
            <g key={o.id} data-opening={o.id} data-kind={o.kind}>
              {jamb(o.from)}
              {jamb(o.to)}
              {o.kind === "window" &&
                (o.wallAxis === "z" ? (
                  <line x1={o.at} y1={Y(o.from)} x2={o.at} y2={Y(o.to)} />
                ) : (
                  <line x1={o.from} y1={Y(o.at)} x2={o.to} y2={Y(o.at)} />
                ))}
            </g>
          );
        })}
      </g>

      {/* เส้นบอกระยะ สเกลบาร์ ทิศเหนือ ป้ายหน้าบ้าน */}
      <g className="pointer-events-none">
        <DimensionLine
          x1={frame.x0}
          y1={dimY}
          x2={frame.x1}
          y2={dimY}
          label={`${roundM(frame.x1 - frame.x0)} ${t.units.m}`}
          fontSize={metaSize}
        />
        <DimensionLine
          x1={frame.x0 - 1.3}
          y1={Y(frame.z0)}
          x2={frame.x0 - 1.3}
          y2={Y(frame.z1)}
          label={`${roundM(frame.z1 - frame.z0)} ${t.units.m}`}
          fontSize={metaSize}
        />

        {entry && (
          <text
            x={openingCenter(entry).x}
            y={Y(openingCenter(entry).z) - px(10)}
            textAnchor="middle"
            className="fill-pine font-sans"
            fontSize={metaSize}
            fontWeight={600}
          >
            {t.scene.entry}
          </text>
        )}

        <text
          x={frame.x0}
          y={footerY}
          className="fill-moss font-sans"
          fontSize={metaSize}
          fontWeight={500}
        >
          {t.scene.front}
        </text>

        {/* สเกลบาร์ 1 เมตร */}
        <g className="stroke-ironwood fill-ironwood" strokeWidth={0.025}>
          <line x1={frame.x1 - 1} y1={footerY - 0.1} x2={frame.x1} y2={footerY - 0.1} />
          <line x1={frame.x1 - 1} y1={footerY - 0.22} x2={frame.x1 - 1} y2={footerY + 0.02} />
          <line x1={frame.x1} y1={footerY - 0.22} x2={frame.x1} y2={footerY + 0.02} />
          <text
            x={frame.x1 - 1 - px(8)}
            y={footerY - 0.1 + px(4.5)}
            textAnchor="end"
            className="fill-moss font-display"
            fontSize={metaSize}
            fontWeight={600}
            stroke="none"
          >
            1 {t.units.m}
          </text>
        </g>

        {/* ทิศเหนือ — มุมหมุนมาจาก data (northDeg) */}
        <g
          transform={`translate(${frame.x1 + 0.75} ${Y(frame.z1) + 0.5}) rotate(${house.northDeg})`}
        >
          <polygon points="0,-0.5 0.2,0.18 0,0.02 -0.2,0.18" className="fill-ironwood" />
          <text
            x={0}
            y={0.3 + px(14)}
            textAnchor="middle"
            className="fill-moss font-display"
            fontSize={metaSize}
            fontWeight={700}
          >
            N
          </text>
        </g>
      </g>
    </svg>
  );
}

const roundM = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
