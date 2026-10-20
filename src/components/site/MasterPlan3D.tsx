"use client";

import { SITE_NORTH_DEG } from "@/geometry";
import { villageBox } from "@/geometry/exterior";
import { Component, lazy, Suspense, useState, type ComponentProps, type ReactNode } from "react";
import type { IsoCanvas } from "@/components/three/IsoCanvas";
import { useDict } from "@/i18n/client";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";

/* หมู่บ้าน 3D ของหน้าผังโครงการ — three.js โหลดหลัง hydration เป็นก้อนใหญ่
   บน 4G ก้อน chunk หลุดได้จริง (ChunkLoadError) ต้องไม่พาทั้งหน้าล่มตาม */

type Props = {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  box: ComponentProps<typeof IsoCanvas>["box"];
  onReady: () => void;
};

/* สร้าง lazy ใหม่ทุกครั้งที่ mount — React.lazy จำ promise ที่ล้มไว้ตลอดอายุของมัน
   ถ้าใช้ตัวเดียวระดับ module ปุ่มลองใหม่จะได้ error เดิมกลับมาโดยไม่ขอไฟล์ใหม่เลย */
function loadVillage() {
  return lazy(async () => {
    const [{ IsoCanvas }, { MasterPlanScene }] = await Promise.all([
      import("@/components/three/IsoCanvas"),
      import("@/components/three/MasterPlanScene"),
    ]);
    function Village({ plots, houseTypes, plan, onReady }: Props) {
      const t = useDict();
      return (
        <IsoCanvas
          /* กล่องแน่นตามฐานหมู่บ้านจริง (villageBox) — ไม่ใช่กรอบที่หน้าผังส่งมาเผื่อขอบว่าง */
          box={villageBox(plan)}
          rotatable={false}
          northDeg={SITE_NORTH_DEG}
          onReady={onReady}
          label={t.masterPlan.villageLabel}
        >
          <MasterPlanScene plots={plots} houseTypes={houseTypes} plan={plan} labels />
        </IsoCanvas>
      );
    }
    return { default: Village };
  });
}

class Boundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** ล้มเมื่อไร (โหลดไฟล์ไม่ได้ หรือ WebGL พัง) แจ้ง onError ให้หน้ากลับไปผัง 2D — remount ด้วย key เพื่อลองใหม่ */
export function MasterPlan3D({ onError, ...props }: Props & { onError: () => void }) {
  const [Village] = useState(loadVillage);
  return (
    <Boundary onError={onError}>
      <Suspense fallback={null}>
        <Village {...props} />
      </Suspense>
    </Boundary>
  );
}
