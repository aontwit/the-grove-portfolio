"use client";

import { Html } from "@react-three/drei";
import { IsoCanvas } from "@/components/three/IsoCanvas";
import { M3D } from "@/components/three/materials";
import { PIECES, PIECE_LABELS } from "@/components/three/furniture";
import type { FurnitureKind } from "@/lib/schemas";

/* หน้า dev — แคตตาล็อกเฟอร์นิเจอร์ procedural ทุกชิ้นในฉากเดียว
   ขนาดที่โชว์คือขนาดตัวแทน ของจริงรับขนาดจาก data รายชิ้น */

const CATALOG: { kind: FurnitureKind; w: number; d: number }[] = [
  { kind: "sofa", w: 2.0, d: 0.9 },
  { kind: "bed", w: 1.6, d: 2.0 },
  { kind: "wardrobe", w: 1.4, d: 0.6 },
  { kind: "counter", w: 2.0, d: 0.65 },
  { kind: "diningSet", w: 1.6, d: 1.0 },
  { kind: "desk", w: 1.2, d: 0.6 },
  { kind: "toilet", w: 0.45, d: 0.6 },
  { kind: "sink", w: 0.6, d: 0.45 },
  { kind: "showerTray", w: 0.9, d: 0.9 },
  { kind: "rug", w: 1.8, d: 1.2 },
  { kind: "plant", w: 0.5, d: 0.5 },
  { kind: "floorLamp", w: 0.35, d: 0.35 },
  { kind: "frame", w: 0.9, d: 0.08 },
  { kind: "tree", w: 0.9, d: 0.9 },
];

const COLS = 5;
const STEP = 3.4;

export default function FurniturePage() {
  const rows = Math.ceil(CATALOG.length / COLS);
  const width = COLS * STEP;
  const depth = rows * STEP;

  return (
    <main className="px-6 py-10">
      <h1 className="text-34">เฟอร์นิเจอร์</h1>
      <p className="text-17 text-moss mt-2 max-w-[70ch]">
        ทุกชิ้นสร้างจาก primitive ตามพาเลตต์ DESIGN-SPEC §5 ไม่มีไฟล์โมเดลภายนอก — {CATALOG.length}{" "}
        แบบ
      </p>

      <div className="border-concrete rounded-card mt-8 h-[36rem] overflow-hidden border">
        <IsoCanvas
          box={{ w: width + 1, d: depth + 1, h: 2.6, cx: 0, cz: 0 }}
          label="แคตตาล็อกเฟอร์นิเจอร์ ลากเพื่อหมุน"
        >
          <mesh position={[0, -0.02, 0]} receiveShadow>
            <boxGeometry args={[width + 1, 0.04, depth + 1]} />
            <meshStandardMaterial color={M3D.woodLight} roughness={0.92} metalness={0} />
          </mesh>

          {CATALOG.map((item, i) => {
            const Piece = PIECES[item.kind];
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = (col - (COLS - 1) / 2) * STEP;
            const z = (row - (rows - 1) / 2) * STEP;
            return (
              <group key={item.kind} position={[x, 0, z]}>
                <Piece w={item.w} d={item.d} facing="z-" />
                {/* ป้ายวางเยื้องมาทางกล้องและต่ำกว่าระดับพื้น จึงตกใต้ชิ้นงานเสมอ ไม่ทับตัวโมเดล */}
                <Html
                  position={[-STEP * 0.3, -0.45, -STEP * 0.3]}
                  center
                  style={{ pointerEvents: "none" }}
                >
                  <span className="text-13 text-moss font-sans whitespace-nowrap">
                    {PIECE_LABELS[item.kind]}
                  </span>
                </Html>
              </group>
            );
          })}
        </IsoCanvas>
      </div>
    </main>
  );
}
