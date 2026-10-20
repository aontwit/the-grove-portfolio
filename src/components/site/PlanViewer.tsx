"use client";

import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { dioramaBox } from "@/geometry/exterior";
import type { HouseType, RenderShot } from "@/lib/schemas";
import { useGrove, useMood } from "@/lib/store";
import { FloorPlan2D } from "@/components/three/FloorPlan2D";
import { SampleNote } from "@/components/site/SampleNote";
import { ToggleGroup } from "@/components/site/ToggleGroup";
import { buttonClass } from "@/components/site/ButtonLink";
import { SceneBoundary, freshLazy, useWebGL } from "@/components/site/SceneBoundary";
import type { IsoCanvas as IsoCanvasType } from "@/components/three/IsoCanvas";
import type { WalkthroughScene as WalkthroughSceneType } from "@/components/three/WalkthroughScene";
import type { PickFn } from "@/components/three/MoodRig";
import { MoodStudio, useStudioDrop } from "@/components/site/MoodStudio";
import { Link, useDict, useLocale } from "@/i18n/client";
import { getStudioDictionary } from "@/i18n/studio";
import { cx } from "@/lib/utils";

/* สลับ 2D ↔ 3D — ทั้งสองมุมมองอ่านห้องที่เลือกจาก store เดียวกัน
   §4: crossfade 0.25s และหยุดเคลื่อนไหวทั้งหมดเมื่อผู้ใช้ขอ reduced motion
   แปลนตัวอย่าง (samplePlan): ป้ายเหนือกรอบครอบทั้ง 2D และ isometric · โหมดเดินดูเต็มจอมีป้ายซ้ำในกรอบ */

const MODES = ["2d", "3d", "walk"] as const;

/* โหลด three.js เมื่อผู้ใช้เปิดโหมด 3D เท่านั้น — lazy ตัวใหม่ทุกครั้งที่ mount (SceneBoundary)
   ล้มแล้วกดลองใหม่ = remount ด้วย key = ขอไฟล์ใหม่จริง ไม่ได้ error เดิมที่ React.lazy จำไว้ */
/* วางโมเดลให้อยู่ช่องว่างระหว่างแผง studio — ค่าคงที่ระดับ module (IsoCanvas: frame)
   จอกว้าง: แผงซ้าย/ขวาบน ถาดล่าง → ย่อแล้วยกขึ้นเล็กน้อย · มือถือ: แผ่นล่างจอกินครึ่งล่าง → ยกขึ้นมากกว่า */
const STUDIO_FRAME = { scale: 0.86, shift: [0.02, -0.05] } as const;
const STUDIO_FRAME_SHEET = { scale: 1.08, shift: [0, -0.18] } as const;

function IsoView({
  house,
  floor,
  studio,
  ...iso
}: Omit<ComponentProps<typeof IsoCanvasType>, "children"> & {
  house: HouseType;
  floor: number;
  studio?: { pickRef: RefObject<PickFn | null>; lampsMax: number } | undefined;
}) {
  const [C] = useState(() => ({
    IsoCanvas: freshLazy(() => import("@/components/three/IsoCanvas").then((m) => m.IsoCanvas)),
    FloorPlanScene: freshLazy(() =>
      import("@/components/three/FloorPlanScene").then((m) => m.FloorPlanScene),
    ),
  }));
  return (
    <Suspense fallback={null}>
      <C.IsoCanvas {...iso}>
        <C.FloorPlanScene house={house} floor={floor} studio={studio} />
      </C.IsoCanvas>
    </Suspense>
  );
}

function WalkView(props: ComponentProps<typeof WalkthroughSceneType>) {
  const [Walk] = useState(() =>
    freshLazy(() => import("@/components/three/WalkthroughScene").then((m) => m.WalkthroughScene)),
  );
  return (
    <Suspense fallback={null}>
      <Walk {...props} />
    </Suspense>
  );
}

/** ภาพนิ่งของชั้นนี้จากฉากเดียวกัน — ภาพพื้นหมึกก่อน แล้วแดดใกล้ค่าตั้งต้นของตัวดู (15:00) ที่สุด
    ภาพพื้นหมึกวางบน bg-ink ซึ่งค่าคงที่ทั้งสองโหมด (§1) จึงไม่มีขอบรอยต่อทั้งโหมดสว่างและมืด
    ส่วนภาพพื้น paper (ขาวล้วนในไฟล์) กลายเป็นกล่องขาวกลางหน้าเมื่อผู้ใช้เปิดโหมดมืด
    ทุกชั้นของทุกแบบมีภาพพื้นหมึก (renders.json) ภาพพื้น paper จึงเป็นแค่ทางสำรอง */
function stillFor(stills: readonly RenderShot[], floor: number) {
  return [...stills]
    .filter((r) => r.view === "iso" && r.floor === floor)
    .sort(
      (a, b) => Number(b.dark) - Number(a.dark) || Math.abs(a.hour - 15) - Math.abs(b.hour - 15),
    )[0];
}

export function PlanViewer({
  house,
  stills = [],
  devControls = false,
}: {
  house: HouseType;
  /** ภาพนิ่ง iso ของแบบนี้ (repo.listRenders) — ใช้แทนโมเดลเมื่อ 3D เปิดไม่ได้ */
  stills?: readonly RenderShot[];
  devControls?: boolean;
}) {
  const planMode = useGrove((s) => s.planMode);
  const setPlanMode = useGrove((s) => s.setPlanMode);
  const mode = planMode;
  const [autoRotate, setAutoRotate] = useState(false);
  const [floor, setFloor] = useState(1);
  /* เวลาของวันอยู่ใน store ของ mood studio (06:00-22:00) — โหมดเดินดูใช้ช่วงกลางวัน 06:00-18:00 */
  const hour = useMood((s) => s.hour);
  const setHour = useMood((s) => s.setHour);
  const cinematic = useMood((s) => s.cinematic);
  const walkHour = Math.min(18, hour);
  const pickRef = useRef<PickFn | null>(null);
  const drop = useStudioDrop(pickRef);
  /* แผ่นล่างจอ (มือถือ) กับแผงลอย (md+) วางโมเดลคนละกรอบ · จอสัมผัสได้ไฟในบ้านน้อยกว่า */
  const [sheetLayout, setSheetLayout] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 47.98rem)");
    const on = () => setSheetLayout(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  const studio = useMemo(() => ({ pickRef, lampsMax: sheetLayout ? 3 : 6 }), [sheetLayout]);
  const boxRef = useRef<HTMLDivElement>(null);
  /* null = ยังไม่รู้ (SSR / ยังไม่ได้ตรวจ) · false = เครื่องนี้ไม่มี WebGL
     ตรวจเมื่อออกจากแปลน 2D เท่านั้น — คนที่ดูแค่แปลนไม่ต้องจ่ายค่าสร้าง WebGL context */
  const webgl = useWebGL(mode !== "2d");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = useDict();
  const studioDict = getStudioDictionary(useLocale());

  const floors = [...new Set(house.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);

  /* โหมดเดินดูเปิดเต็มจอ — ขอ fullscreen ตอนกดปุ่ม (ต้องมาจากการกดของผู้ใช้เท่านั้น) */
  const enterWalk = () => {
    setPlanMode("walk");
    boxRef.current?.requestFullscreen?.().catch(() => {
      /* เบราว์เซอร์ปฏิเสธ — เดินดูในกรอบเดิมได้ตามปกติ */
    });
  };

  /* 3D ล้มระหว่างเดินดูเต็มจอ — ออกจากเต็มจอก่อน ภาพนิ่งกับข้อความจะได้อยู่ในกรอบปกติ */
  const on3dError = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setFailed(true);
    if (planMode === "walk") setPlanMode("3d");
  };
  const retry3d = () => {
    setFailed(false);
    setAttempt((a) => a + 1);
  };

  const exitWalk = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setPlanMode("3d");
  }, [setPlanMode]);

  /* ออกจากเต็มจอ (เช่นกด Esc) = ออกจากโหมดเดินไปด้วย */
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && planMode === "walk") setPlanMode("3d");
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [planMode, setPlanMode]);

  /* ชั้นล่าง = ทั้งแปลงมาตรฐาน (บ้าน สวน โรงจอดรถ) · ชั้นบน = ตัวบ้านชั้นนั้น — กล่องเดียวกับภาพนิ่ง */
  const box = dioramaBox(house, floor);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToggleGroup
          label={t.planViewer.viewGroup}
          options={MODES.map((id) => ({ id, label: t.planViewer.modes[id] }))}
          value={mode}
          onSelect={(id) => (id === "walk" ? enterWalk() : setPlanMode(id))}
        />
        {devControls && mode === "3d" && (
          <button
            type="button"
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
            className="border-concrete text-moss rounded-control text-15 ml-auto h-12 border px-4 font-medium"
          >
            {t.planViewer.autoRotate(autoRotate)}
          </button>
        )}
      </div>

      {floors.length > 1 && (
        <ToggleGroup
          label={t.planViewer.floorGroup}
          size="pill"
          className="mb-3"
          options={floors.map((f) => ({ id: String(f), label: t.common.floor(f) }))}
          value={String(floor)}
          onSelect={(id) => setFloor(Number(id))}
        />
      )}

      {/* โหมด Isometric มีแถบเวลาในแผง studio · โหมดเดินดูใช้แถบนี้ (กลางวัน) */}
      {mode === "walk" && (
        <label className="mb-3 flex max-w-sm flex-wrap items-center gap-3">
          <span className="text-13 text-moss font-medium">{t.planViewer.sunLabel}</span>
          <span className="font-display text-15 font-semibold tabular-nums">
            {String(Math.floor(walkHour)).padStart(2, "0")}:{walkHour % 1 === 0 ? "00" : "30"}
          </span>
          <input
            type="range"
            min={6}
            max={18}
            step={0.5}
            value={walkHour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="accent-pine h-6 flex-1"
            aria-label={t.planViewer.sunSlider}
          />
        </label>
      )}

      {house.samplePlan && <SampleNote kind="plan" detail className="mb-3" />}
      {mode === "3d" && (
        <Link
          href="/#studio"
          className="text-pine text-15 mb-3 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
        >
          {studioDict.openStudio}
        </Link>
      )}

      <div
        ref={boxRef}
        className={cx(
          "border-concrete rounded-card relative isolate overflow-hidden border",
          /* Isometric = เวทีมืดของ mood studio สูงพอให้แผงลอยรอบโมเดล */
          mode === "3d" ? "bg-ink h-[min(86svh,50rem)]" : "bg-canvas",
        )}
      >
        <div
          className={cx(
            "transition-opacity duration-250 motion-reduce:transition-none",
            mode === "2d" ? "opacity-100" : "pointer-events-none opacity-0",
            /* เวที studio สูงคงที่ — แปลน 2D ที่ซ่อนอยู่ไม่กำหนดความสูงกรอบ */
            mode === "3d" && "absolute inset-0 overflow-hidden",
          )}
          aria-hidden={mode !== "2d"}
          /* ซ่อนอยู่ = กดหรือ Tab เข้าไม่ได้ด้วย (ห้องบนแปลน 2D เป็นปุ่ม) */
          inert={mode !== "2d"}
        >
          <FloorPlan2D house={house} floor={floor} />
        </div>

        <div
          className={`absolute inset-0 transition-opacity duration-250 motion-reduce:transition-none ${
            mode === "3d" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={mode !== "3d"}
          inert={mode !== "3d"}
          {...(mode === "3d" && drop)}
        >
          {mode === "3d" && webgl && !failed && (
            <SceneBoundary key={attempt} onError={on3dError}>
              <IsoView
                house={house}
                floor={floor}
                box={box}
                autoRotate={autoRotate}
                sunHour={hour}
                northDeg={house.northDeg}
                label={t.planViewer.isoLabel(house.name, floor)}
                studio={studio}
                daylight
                cinematic={cinematic}
                backgroundToken="--ink"
                frame={sheetLayout ? STUDIO_FRAME_SHEET : STUDIO_FRAME}
              />
            </SceneBoundary>
          )}
          {mode === "3d" && webgl && !failed && (
            <MoodStudio
              thumb={stillFor(stills, floor) && `/renders/${stillFor(stills, floor)?.id}.png`}
            />
          )}
        </div>

        {/* โหมดเดินดู mount เฉพาะตอนใช้งาน — กินทรัพยากรและจับ pointer lock */}
        {mode === "walk" && webgl && !failed && (
          <div className="absolute inset-0">
            <SceneBoundary key={attempt} onError={on3dError}>
              <WalkView house={house} floor={floor} sunHour={walkHour} onExit={exitWalk} />
            </SceneBoundary>
            {/* ใต้ปุ่มออกจากโหมดเดิน — ไม่ทับรายการห้อง (ซ้ายบน) จอยสติ๊ก (ซ้ายล่าง) หรือคำแนะนำ (ขวาล่าง) */}
            {house.samplePlan && (
              <div className="bg-paper rounded-control pointer-events-none absolute top-16 right-4 px-1 py-1">
                <SampleNote kind="plan" />
              </div>
            )}
          </div>
        )}

        {/* 3D เปิดไม่ได้: ภาพนิ่งจากโมเดลเดียวกันค้างไว้ในกรอบ ข้อความอยู่แถบล่าง ไม่ทับภาพ
            แปลน 2D มีข้อมูลห้องครบเท่ากัน จึงเป็นทางออกหลัก */}
        {mode !== "2d" && (webgl === false || failed) && (
          <ThreeFallback
            still={stillFor(stills, floor)}
            houseName={house.name}
            reason={webgl === false ? "webgl" : "load"}
            onRetry={retry3d}
            onPlan={() => setPlanMode("2d")}
          />
        )}
      </div>

      <p className="text-13 text-moss mt-3">{t.planViewer.help}</p>
    </div>
  );
}

function ThreeFallback({
  still,
  houseName,
  reason,
  onRetry,
  onPlan,
}: {
  still: RenderShot | undefined;
  houseName: string;
  reason: "webgl" | "load";
  onRetry: () => void;
  onPlan: () => void;
}) {
  const t = useDict().planViewer;
  return (
    <div className="bg-paper absolute inset-0 flex flex-col">
      <div className={cx("relative min-h-0 flex-1", still?.dark ? "bg-ink" : "bg-paper")}>
        {still && (
          <Image
            src={`/renders/${still.id}.png`}
            alt={t.stillAlt(houseName, still.floor)}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-contain"
          />
        )}
      </div>
      <div
        role="status"
        className="border-concrete flex flex-wrap items-center gap-x-6 gap-y-3 border-t p-4"
      >
        <p className="text-15 max-w-[52ch]">
          {reason === "webgl" ? t.fallbackWebgl : t.fallbackLoad}
        </p>
        <div className="flex flex-wrap gap-3">
          {reason === "load" && (
            <button type="button" onClick={onRetry} className={buttonClass("primary")}>
              {t.retry}
            </button>
          )}
          <button type="button" onClick={onPlan} className={buttonClass("secondary")}>
            {t.see2d}
          </button>
        </div>
      </div>
    </div>
  );
}
