"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { SITE_NORTH_DEG } from "@/geometry";
import { dioramaBox, villageBox } from "@/geometry/exterior";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";

const IsoCanvas = dynamic(() => import("@/components/three/IsoCanvas").then((m) => m.IsoCanvas), {
  ssr: false,
});
const FloorPlanScene = dynamic(
  () => import("@/components/three/FloorPlanScene").then((m) => m.FloorPlanScene),
  { ssr: false },
);
const MasterPlanScene = dynamic(
  () => import("@/components/three/MasterPlanScene").then((m) => m.MasterPlanScene),
  { ssr: false },
);
const WalkthroughScene = dynamic(
  () => import("@/components/three/WalkthroughScene").then((m) => m.WalkthroughScene),
  { ssr: false },
);

export function RenderStill({
  house,
  view,
  hour,
  floor,
  dark,
  closed = false,
  empty = false,
  village,
}: {
  house: HouseType;
  view: "iso" | "walk" | "village";
  hour: number;
  floor: number;
  dark: boolean;
  /** บ้านปิดหลังคาแล้ว (ท่าเดียวกับกลางฉากเปิดหน้าแรก) — ภาพภายนอกของแบบ */
  closed?: boolean;
  /** แปลงเปล่า ยังไม่มีห้อง — เฟรมแรกของฉากเปิดหน้าแรกบนจอกว้าง */
  empty?: boolean;
  village: { plots: Plot[]; houseTypes: HouseType[]; plan: SitePlan };
}) {
  const [ready, setReady] = useState(false);
  /* ท่าคงที่บนไทม์ไลน์ของฉากเปิดหน้าแรก (heroTimeline): 0 = แปลงเปล่า · 1 = ห้องครบ หลังคาลงแล้ว */
  const emptyRef = useRef(0);
  const closedRef = useRef(1);
  /* กล่องเดียวกับหน้าแบบบ้าน (PlanViewer) — ชั้นล่างคือทั้งแปลงมาตรฐานของแบบ
     ภาพภายนอก (closed) ของบ้านแฝด: รวมหลังข้างเคียงที่สะท้อนกัน ให้อ่านเป็นบ้านแฝดตามภาพอ้างอิง */
  const pair = closed && floor === 1 && house.facade?.style === "twin";
  const box = dioramaBox(house, floor, undefined, { pair, closed });

  return (
    <main data-still data-ready={view === "walk" || ready} className="h-svh w-full">
      {view === "walk" ? (
        <WalkthroughScene house={house} floor={floor} sunHour={hour} />
      ) : view === "village" ? (
        <IsoCanvas
          northDeg={SITE_NORTH_DEG}
          box={villageBox(village.plan)}
          rotatable={false}
          zoomable={false}
          sunHour={hour}
          backgroundToken={dark ? "--ink" : "--paper"}
          onReady={() => setReady(true)}
          label="หมู่บ้านทั้งโครงการ"
        >
          <MasterPlanScene {...village} />
        </IsoCanvas>
      ) : (
        <IsoCanvas
          box={box}
          rotatable={false}
          zoomable={false}
          sunHour={hour}
          northDeg={house.northDeg}
          backgroundToken={dark ? "--ink" : "--paper"}
          onReady={() => setReady(true)}
          label={`โมเดลบ้าน ${house.name}`}
        >
          <FloorPlanScene
            house={house}
            floor={floor}
            progressRef={closed ? closedRef : empty ? emptyRef : undefined}
            neighbour={pair}
          />
        </IsoCanvas>
      )}
    </main>
  );
}
