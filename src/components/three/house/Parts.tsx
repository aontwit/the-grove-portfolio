"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type DependencyList } from "react";
import type { BufferGeometry, InstancedMesh, Material, Matrix4 } from "three";
import type { OutdoorKit } from "../surfaces";
import type { Parts } from "./build";

/** สร้างชุด geometry ด้วย useMemo แล้วทิ้ง (dispose) เมื่อค่าเปลี่ยนหรือ unmount */
export function useParts<K extends string>(make: () => Parts<K>, deps: DependencyList): Parts<K> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parts = useMemo(make, deps);
  useEffect(() => () => parts.forEach((g) => g.dispose()), [parts]);
  return parts;
}

/** หนึ่ง mesh ต่อหนึ่งวัสดุ — ไม่รับการคลิก (ฉากรับการเลือกที่พื้นห้อง/กล่องแปลงแทน) */
export function PartsMeshes<K extends string>({
  parts,
  kit,
  shadows = true,
}: {
  parts: Parts<K>;
  kit: Record<K, Material>;
  shadows?: boolean;
}) {
  return (
    <>
      {[...parts].map(([k, g]) => (
        <mesh
          key={k}
          geometry={g}
          material={kit[k]}
          castShadow={shadows && !NO_CAST.has(k)}
          receiveShadow
          raycast={() => null}
        />
      ))}
    </>
  );
}

/* ผิวพื้นราบไม่ต้องทอดเงา — ประหยัด shadow pass */
const NO_CAST = new Set<string>(["lawn", "gravel", "gravelDark", "paving", "asphalt", "pane"]);

function InstancedOne({
  geometry,
  material,
  matrices,
}: {
  geometry: BufferGeometry;
  material: Material;
  matrices: readonly Matrix4[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((x, i) => m.setMatrixAt(i, x));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices]);
  if (matrices.length === 0) return null;
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, material, matrices.length]}
      castShadow
      receiveShadow
      raycast={() => null}
    />
  );
}

/** ชุด geometry เดียวกันวางหลายที่ (บ้านแบบเดียวกันหลายแปลง) — draw call เดียวต่อวัสดุ */
export function InstancedParts({
  parts,
  kit,
  matrices,
}: {
  parts: Parts;
  kit: OutdoorKit;
  matrices: readonly Matrix4[];
}) {
  return (
    <>
      {[...parts].map(([k, g]) => (
        <InstancedOne key={k} geometry={g} material={kit[k]} matrices={matrices} />
      ))}
    </>
  );
}
