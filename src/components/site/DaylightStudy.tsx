"use client";

import { mm, walls } from "@/geometry";
import { HouseOutline, Y, type OutlineDrawing } from "@/components/three/HouseOutline";
import type { HouseType } from "@/lib/schemas";
import { sunPosition } from "@/components/three/materials";
import { useDict } from "@/i18n/client";
import type { Dictionary } from "@/i18n";

/* การศึกษาแสงของวัน — เขียนแบบสถาปนิกเรียกว่า sun path diagram
   ทิศแดดในภาพคำนวณจาก sunPosition() ตัวเดียวกับที่ฉาก 3D ใช้ ไม่ใช่ลูกศรที่วาดเอาเอง
   สิ่งที่คนซื้อบ้านได้จากตรงนี้คือรู้ว่าห้องด้านไหนได้แดดเช้า ด้านไหนโดนแดดบ่าย
   ก่อนจะไปเลื่อนเวลาดูของจริงในโมเดล

   แปลนเดียว ลูกศรสามเวลา — สามภาพแยกที่ผนังเหมือนกันทุกภาพ ต่างกันแค่ลูกศร คือภาพเดิมซ้ำสามครั้ง
   (มือถือยาว ~1,200px) วางลูกศรทั้งสามบนผังเดียวจึงเห็นการเคลื่อนของแดดในครั้งเดียว */

/* คำของแต่ละเวลา ("แดดเช้า") อยู่ใน i18n (daylight.notes) */
const HOURS = [
  { hour: 8, label: "08:00", short: "08" },
  { hour: 12, label: "12:00", short: "12" },
  { hour: 17, label: "17:00", short: "17" },
] as const;

/** ทิศแดดบนระนาบพื้น (x, z) ความยาว 1 — ชี้จากบ้านไปหาดวงอาทิตย์ */
function sunDir(hour: number, northDeg: number) {
  const [x, , z] = sunPosition(hour, 1, northDeg);
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
}

type Facing = "+x" | "-x" | "+z" | "-z";
/* มุมของด้านผนังในแปลน (+z = 0 ตามเข็มนาฬิกา) ลบ northDeg = ทิศจริง ปัดเป็นทิศหลักที่ใกล้สุด */
const FACING_DEG: Record<Facing, number> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };
/** ทิศหลักที่ผนังหันไป — คำของทิศอยู่ใน i18n (daylight.compass4: เหนือ ตะวันออก ใต้ ตะวันตก) */
const compass = (f: Facing, northDeg: number, words: readonly string[]) =>
  words[Math.round((((FACING_DEG[f] - northDeg) % 360) + 360) / 90) % 4] ?? "";

/* กฎว่าแดดเข้าห้องไหน (ตั้งใจให้ง่ายและตรวจได้):
   1. แดดเข้าห้องได้ทางหน้าต่างเท่านั้น — นับเฉพาะหน้าต่างชั้นล่างบนผนังที่อีกฝั่งเป็นนอกบ้านหรือระเบียง
   2. หน้าต่างได้แดดเมื่อผนังหันเข้าหาดวงอาทิตย์ (normal ของผนัง · ทิศแดด > 0)
      คะแนน = ความกว้างหน้าต่าง × ค่า dot นั้น (แดดตั้งฉากผนังได้เต็ม แดดเฉียงได้น้อย)
   3. รวมคะแนนต่อห้อง ห้องคะแนนสูงสุดคือห้องที่แดดเข้า ห้องที่สองนับด้วยถ้าได้ ≥ 60% ของห้องแรก
   4. "ฝั่ง" คือทิศของผนังที่ให้คะแนนมากที่สุดของห้องแรก
   ไม่คิดชายคา ต้นไม้ หรือบ้านข้างเคียง — บอกทิศ ไม่ได้อ้างว่าเป็นการจำลองแสงเต็มรูปแบบ */
function sunRooms(house: HouseType, hour: number, compass4: readonly string[]) {
  const rooms = house.rooms.filter((r) => (r.floor ?? 1) === 1);
  const openings = house.openings.filter((o) => (o.floor ?? 1) === 1);
  const outside = (id: string | null) => id === null || rooms.some((r) => r.id === id && r.outdoor);
  const sun = sunDir(hour, house.northDeg);
  const score = new Map<string, { total: number; byFacing: Map<Facing, number> }>();

  for (const seg of walls(rooms, openings)) {
    const minusOut = outside(seg.roomMinus);
    const plusOut = outside(seg.roomPlus);
    if (minusOut === plusOut) continue;
    const room = minusOut ? seg.roomPlus : seg.roomMinus;
    if (room === null) continue;
    /* ห้องอยู่ฝั่งพิกัดมาก → ด้านนอกอยู่ฝั่งพิกัดน้อย ผนังจึงหันไปทางลบของแกนที่ตั้งฉาก */
    const sign = minusOut ? -1 : 1;
    const normalAxis = seg.axis === "z" ? "x" : "z";
    const facing: Facing = `${sign > 0 ? "+" : "-"}${normalAxis}`;
    const dot = sign * (normalAxis === "x" ? sun.x : sun.z);
    if (dot <= 0) continue;
    const glass = seg.openings
      .filter((o) => o.kind === "window")
      .reduce((s, o) => s + mm(o.to - o.from), 0);
    if (glass === 0) continue;
    const entry = score.get(room) ?? { total: 0, byFacing: new Map<Facing, number>() };
    entry.total += glass * dot;
    entry.byFacing.set(facing, (entry.byFacing.get(facing) ?? 0) + glass * dot);
    score.set(room, entry);
  }

  const ranked = [...score.entries()].sort((a, b) => b[1].total - a[1].total);
  const first = ranked[0];
  if (!first) return null;
  const picked = ranked.filter(([, s]) => s.total >= first[1].total * 0.6).slice(0, 2);
  /* ชื่อห้องตาม data ของภาษาหน้า — การต่อเป็นประโยค ("ห้องนอน 2 กับห้องนอนใหญ่") อยู่ใน i18n (daylight.rooms) */
  const names = picked.map(([id]) => rooms.find((r) => r.id === id)?.name ?? id);
  const side = [...first[1].byFacing.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { names, side: side ? compass(side, house.northDeg, compass4) : null };
}

/* ลูกศรแดดชี้เข้าหาบ้าน — ต้นลูกศร (วงกลมบอกเวลา) อยู่ฝั่งที่ดวงอาทิตย์อยู่จริงในฉาก
   แปลงพิกัดด้วย Y() ตัวเดียวกับผนัง: แดดเที่ยงอยู่ −z = ใต้ = ล่างของแปลน
   หัวลูกศรหยุดก่อนถึงผนังด้านที่มีเส้นบอกระยะ ลูกศรจึงไม่ทับตัวเลขขนาดบ้าน */
const ARROW_PX = 18;
const BADGE_PX = 11;

function SunArrows({ px, frame, northDeg }: OutlineDrawing & { northDeg: number }) {
  const cx = (frame.x0 + frame.x1) / 2;
  const cz = (frame.z0 + frame.z1) / 2;
  /* ระยะเผื่อจากผนัง: ฝั่งที่มีเส้นบอกระยะ (บน/ซ้าย) ต้องพ้นเส้นและตัวเลขก่อน */
  const gap = { "+x": px(8), "-x": px(48), "+z": px(48), "-z": px(8) };
  return (
    <g>
      {HOURS.map(({ hour, short }) => {
        const d = sunDir(hour, northDeg);
        const hw = (frame.x1 - frame.x0) / 2 + (d.x >= 0 ? gap["+x"] : gap["-x"]);
        const hd = (frame.z1 - frame.z0) / 2 + (d.z >= 0 ? gap["+z"] : gap["-z"]);
        const t = Math.min(
          Math.abs(d.x) > 1e-6 ? hw / Math.abs(d.x) : Infinity,
          Math.abs(d.z) > 1e-6 ? hd / Math.abs(d.z) : Infinity,
        );
        const at = (k: number) => ({ x: cx + d.x * k, y: Y(cz + d.z * k) });
        const head = at(t);
        const tail = at(t + px(ARROW_PX));
        const badge = at(t + px(ARROW_PX + BADGE_PX));
        const ux = (head.x - tail.x) / px(ARROW_PX);
        const uy = (head.y - tail.y) / px(ARROW_PX);
        const wing = px(5);
        const back = px(9);
        return (
          <g key={hour} data-sun={hour}>
            <g className="stroke-marigold [&_line]:[stroke-width:2px] [&_line]:[vector-effect:non-scaling-stroke]">
              <line x1={tail.x} y1={tail.y} x2={head.x - ux * back} y2={head.y - uy * back} />
            </g>
            <polygon
              className="fill-marigold"
              points={[
                `${head.x},${head.y}`,
                `${head.x - ux * back - uy * wing},${head.y - uy * back + ux * wing}`,
                `${head.x - ux * back + uy * wing},${head.y - uy * back - ux * wing}`,
              ].join(" ")}
            />
            <circle cx={badge.x} cy={badge.y} r={px(BADGE_PX)} className="fill-marigold" />
            <text
              x={badge.x}
              y={badge.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-display fill-ironwood tabular-nums"
              fontSize={px(13)}
              fontWeight={700}
            >
              {short}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function DaylightStudy({
  house,
  frameSize,
}: {
  house: HouseType;
  frameSize?: { w: number; d: number };
}) {
  const t: Dictionary["daylight"] = useDict().daylight;
  return (
    <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_17rem]">
      {/* มือถือไม่มีกรอบ — ทุก px ของความกว้างให้ตัวผัง ป้ายห้องจะได้พอดีห้องมากขึ้น */}
      <figure className="sm:border-concrete sm:rounded-card sm:bg-paper sm:border sm:p-6">
        <HouseOutline
          house={house}
          frameSize={frameSize}
          annotate={{
            /* เส้นบอกระยะอยู่ฝั่งเหนือกับตะวันตก — ฝั่งเหนือไม่มีแดด ฝั่งตะวันตกลูกศรหยุดก่อนถึงเส้น */
            dims: { x: "top", z: "left" },
            north: "bottom-left",
            /* รอบรูปต้องพอให้ลูกศรแดด 18px + วงเวลา 22px นอกระยะเผื่อจากผนัง */
            pad: { top: 40, right: 44, bottom: 50, left: 86 },
          }}
          overlay={(d) => <SunArrows {...d} northDeg={house.northDeg} />}
          label={t.figureLabel(house.name, HOURS.map((h) => h.label).join(" "))}
        />
        <figcaption className="text-13 text-moss mt-3">{t.caption(house.name)}</figcaption>
      </figure>
      <ol className="flex flex-col">
        {HOURS.map(({ hour, label }) => {
          const hit = sunRooms(house, hour, t.compass4);
          const note = t.notes[hour] ?? label;
          return (
            <li key={hour} className="border-concrete border-b py-5 first:pt-0">
              <p className="font-display text-21 font-medium tabular-nums">{label}</p>
              <p className="text-15 text-moss mt-1">
                {hit ? (
                  <>
                    {t.hits(note, t.rooms(hit.names))}
                    {hit.side && (
                      <>
                        {" "}
                        <span className="whitespace-nowrap">{t.side(hit.side)}</span>
                      </>
                    )}
                  </>
                ) : (
                  t.none(note)
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
