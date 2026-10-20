"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WALL_H, houseBounds } from "@/geometry";
import type { HouseType } from "@/lib/schemas";
import { useMood } from "@/lib/store";
import { MoodStudio, useStudioDrop, type StudioThumbs } from "@/components/site/MoodStudio";
import { SceneBoundary, freshLazy, useWebGL } from "@/components/site/SceneBoundary";
import type { PickFn } from "@/components/three/MoodRig";
import { cx } from "@/lib/utils";

/* หน้าแรก = mood studio เต็มจอ (2026-10-21 แทนฉากเปิดหมู่บ้านเดิม)
   ห้องชุดเดียว (ชั้นล่างของแบบแรก) ผ่าครึ่งบนฐานมืด เต็มกรอบ ฉากหลังเมืองยามพลบ — geometry ชุดเดียวกับแปลน 2D
   ภาพนิ่งจากฉากเดียวกัน (public/studio/poster.webp) ค้างไว้จนโมเดลพร้อม แล้ว crossfade · ไม่มี WebGL = ภาพนิ่งตลอด */

/* วางห้องให้อยู่ช่องว่างระหว่างแผง — จอกว้าง: แผงซ้าย/ขวา ถาดล่าง · มือถือ: แผ่นล่างจอกินครึ่งล่าง (ค่าคงที่ระดับ module) */
const FRAME_WIDE = { scale: 0.86, shift: [0.04, 0.01] } as const;
const FRAME_SHEET = { scale: 1.12, shift: [0, -0.16] } as const;

export function StudioHero({
  house,
  head,
  poster,
  thumbs,
  label,
}: {
  house: HouseType;
  /** ชื่อแบรนด์ (h1) ประโยคเดียว ตัวเลข และทางไปต่อ — server วาดมา */
  head: ReactNode;
  poster?: string | undefined;
  thumbs?: StudioThumbs | undefined;
  label: string;
}) {
  const [C] = useState(() => ({
    IsoCanvas: freshLazy(() => import("@/components/three/IsoCanvas").then((m) => m.IsoCanvas)),
    FloorPlanScene: freshLazy(() =>
      import("@/components/three/FloorPlanScene").then((m) => m.FloorPlanScene),
    ),
  }));
  const webgl = useWebGL(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const hour = useMood((s) => s.hour);
  const cinematic = useMood((s) => s.cinematic);
  const pickRef = useRef<PickFn | null>(null);
  const drop = useStudioDrop(pickRef);

  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 47.98rem)");
    const on = () => setSheet(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  const studio = useMemo(
    () => ({ pickRef, lampsMax: sheet ? 3 : 6, stage: "flat" as const }),
    [sheet],
  );
  /* กล่องของกล้อง = ตัวบ้านชั้นล่าง + ขอบฐาน (ไม่มีสวน) */
  const box = useMemo(() => {
    const b = houseBounds(
      house.rooms.filter((r) => (r.floor ?? 1) === 1),
      true,
    );
    return {
      w: b.x1 - b.x0 + 0.9,
      d: b.z1 - b.z0 + 0.9,
      h: WALL_H,
      cx: (b.x0 + b.x1) / 2,
      cz: (b.z0 + b.z1) / 2,
    };
  }, [house]);

  const live = webgl && !failed;
  return (
    <section
      id="studio"
      data-hero
      aria-label={label}
      /* หัวเว็บ: มือถือสองแถว (~7.4rem) · จอกว้างแถวเดียว (4.5rem) — เวทีพอดีจอแรกทั้งคู่ */
      className="bg-ink relative isolate h-[calc(100svh-7.4rem)] min-h-[34rem] overflow-hidden md:h-[calc(100svh-4.5rem)] md:min-h-[38rem]"
    >
      {poster && (
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cx(
            "object-cover transition-opacity duration-500 motion-reduce:transition-none",
            ready && live && "opacity-0",
          )}
        />
      )}
      {live && (
        <div className="absolute inset-0" {...drop}>
          <SceneBoundary onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <C.IsoCanvas
                box={box}
                sunHour={hour}
                northDeg={house.northDeg}
                label={label}
                daylight
                cinematic={cinematic}
                backgroundToken={null}
                /* จอสัมผัส: canvas ไม่รับนิ้ว (เลื่อนหน้าผ่านเวทีได้ §4) — ควบคุมผ่านแผ่นล่างจอ */
                interactive={!sheet}
                rotatable={!sheet}
                zoomable={!sheet}
                frame={sheet ? FRAME_SHEET : FRAME_WIDE}
                onReady={() => setReady(true)}
              >
                <C.FloorPlanScene house={house} floor={1} studio={studio} />
              </C.IsoCanvas>
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <MoodStudio thumbs={thumbs} head={head} />
    </section>
  );
}
