"use client";

import type { ReactNode } from "react";
import { useGrove } from "@/lib/store";
import { cx } from "@/lib/utils";

/* แถวตัวดูแปลน + panel ห้อง — โหมด Isometric (mood studio) ขยายเต็มความกว้าง แผงลอยรอบโมเดลต้องมีที่
   panel ห้องซ่อนระหว่างนั้น (ห้องที่เลือกยังไฮไลต์บนโมเดล) แล้วกลับมาเมื่อสลับเป็นแปลน 2D */
export function PlanLayout({ viewer, panel }: { viewer: ReactNode; panel: ReactNode }) {
  const wide = useGrove((s) => s.planMode === "3d");
  return (
    <div
      className={cx(
        "mt-10 grid grid-cols-1 items-start gap-8",
        !wide && "lg:grid-cols-[minmax(0,1fr)_20rem]",
      )}
    >
      {viewer}
      <div className={cx("lg:sticky lg:top-8", wide && "hidden")}>{panel}</div>
    </div>
  );
}
