"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from "three";
import { hash01 } from "@/geometry/exterior";
import { M3D, ROUGH } from "../materials";
import type { OutdoorKit } from "../surfaces";

/* ต้นไม้และไม้พุ่ม procedural — ทั้งฉากคือ InstancedMesh สามก้อน (ใบ ลำต้น ไม้ค้ำ) ไม่ว่าจะกี่ต้น
   พุ่มใบเป็น icosahedron ที่ผิวขรุขระแบบกำหนดได้ (ไม่สุ่มตอน render) สีแต่ละพุ่มแกว่งรอบ token ใบไม้
   ต้นไม้หนุ่มค้ำไม้สามขา · ต้นใหญ่ริมถนนและในสวนกลางทรงพุ่มกว้างกว่า */

export type TreeSpot = {
  x: number;
  /** ระดับดินใต้โคนต้น */
  y: number;
  z: number;
  h: number;
  seed: number;
  staked: boolean;
  mature?: boolean;
};
export type ShrubSpot = { x: number; y: number; z: number; r: number; seed: number };

/* geometry ใช้ร่วมทั้งแอป — สร้างครั้งแรกที่ใช้ ไม่ทิ้งระหว่างฉาก (เล็กมาก) */
let blobGeo: BufferGeometry | null = null;
function blob(): BufferGeometry {
  if (blobGeo) return blobGeo;
  const g = new IcosahedronGeometry(1, 2);
  const p = g.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    /* ขรุขระตามทิศของจุด — จุดซ้ำที่ตะเข็บได้ค่าเดียวกัน ผิวจึงไม่แตก */
    const k =
      (Math.round(v.x * 97) * 73856093) ^
      (Math.round(v.y * 97) * 19349663) ^
      (Math.round(v.z * 97) * 83492791);
    const s = 0.84 + hash01(k) * 0.3;
    p.setXYZ(i, v.x * s, v.y * s * 0.92, v.z * s);
  }
  g.computeVertexNormals();
  blobGeo = g;
  return g;
}
let trunkGeo: BufferGeometry | null = null;
function trunk(): BufferGeometry {
  if (trunkGeo) return trunkGeo;
  const g = new CylinderGeometry(0.7, 1, 1, 7, 1);
  g.translate(0, 0.5, 0);
  trunkGeo = g;
  return g;
}
let foliageMat: MeshStandardMaterial | null = null;
function foliage(): MeshStandardMaterial {
  foliageMat ??= new MeshStandardMaterial({
    color: "#ffffff",
    roughness: ROUGH.foliage,
    metalness: 0,
  });
  return foliageMat;
}

const q = new Quaternion();
const e = new Euler();
const pos = new Vector3();
const scl = new Vector3();
const mat4 = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rx = 0,
  ry = 0,
  rz = 0,
) =>
  new Matrix4().compose(pos.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), scl.set(sx, sy, sz));

const UP = new Vector3(0, 1, 0);
const dir = new Vector3();
/** ทรงกระบอกจากจุดหนึ่งชี้ไปตามทิศ (dx, dy, dz) ยาว len */
const along = (x: number, y: number, z: number, r: number, dx: number, dy: number, dz: number) => {
  const len = Math.hypot(dx, dy, dz);
  q.setFromUnitVectors(UP, dir.set(dx / len, dy / len, dz / len));
  return new Matrix4().compose(pos.set(x, y, z), q, scl.set(r, len, r));
};

type Built = { leaves: Matrix4[]; colors: Color[]; trunks: Matrix4[]; stakes: Matrix4[] };

function grow(trees: readonly TreeSpot[], shrubs: readonly ShrubSpot[]): Built {
  const out: Built = { leaves: [], colors: [], trunks: [], stakes: [] };
  const tone = (seed: number, gold: boolean) => {
    return new Color(
      gold ? M3D.foliageGold : hash01(seed + 5) < 0.4 ? M3D.foliageDeep : M3D.foliage,
    );
  };
  for (const t of trees) {
    const r = (k: number) => hash01(t.seed * 131 + k);
    const gold = !t.mature && t.staked && r(1) < 0.18;
    const base = tone(t.seed, gold);
    /* ลำต้น → กิ่ง 3-5 กิ่งเฉียงขึ้น → ปลายกิ่งแต่ละกิ่งมีพุ่มใบเล็กหลายก้อนเกาะกลุ่ม
       เรือนยอดจึงโปร่ง เห็นกิ่ง แบบต้นไม้ปลูกใหม่ ไม่ใช่ลูกบอลซ้อนกัน */
    const trunkH = t.h * (t.mature ? 0.42 : 0.5);
    const tr = t.mature ? 0.1 + t.h * 0.012 : 0.05;
    out.trunks.push(mat4(t.x, t.y, t.z, tr, trunkH + 0.1, tr));
    const branches = t.mature ? 5 : 4;
    const reach = t.h * (t.mature ? 0.3 : 0.22);
    const leaf = t.mature ? t.h * 0.085 : 0.25;
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2 + r(10 + i) * 1.1;
      const up = t.h * (0.22 + r(20 + i) * 0.26);
      const out1 = reach * (0.6 + r(30 + i) * 0.5);
      const by = t.y + trunkH * (0.82 + r(35 + i) * 0.18);
      const ex = t.x + Math.cos(a) * out1;
      const ez = t.z + Math.sin(a) * out1;
      const ey = by + up;
      /* กิ่ง: ทรงกระบอกจากจุดแตกกิ่งถึงปลาย */
      out.trunks.push(along(t.x, by, t.z, tr * 0.45, ex - t.x, ey - by, ez - t.z));
      const n = t.mature ? 7 : 6;
      for (let j = 0; j < n; j++) {
        const k = 100 + i * 10 + j;
        const s1 = leaf * (0.7 + r(k) * 0.6);
        const jx = (r(k + 1) - 0.5) * leaf * 2.4;
        const jy = (r(k + 2) - 0.35) * leaf * 1.6;
        const jz = (r(k + 3) - 0.5) * leaf * 2.4;
        out.leaves.push(mat4(ex + jx, ey + jy, ez + jz, s1, s1 * 0.82, s1, 0, r(k + 4) * 6, 0));
        out.colors.push(base.clone().multiplyScalar(0.82 + r(k + 5) * 0.34));
      }
    }
    /* ยอดกลาง */
    for (let j = 0; j < (t.mature ? 5 : 3); j++) {
      const k = 300 + j;
      const s1 = leaf * (0.8 + r(k) * 0.5);
      out.leaves.push(
        mat4(
          t.x + (r(k + 1) - 0.5) * leaf * 2,
          t.y + t.h - s1 * 0.8 - r(k + 2) * leaf,
          t.z + (r(k + 3) - 0.5) * leaf * 2,
          s1,
          s1 * 0.85,
          s1,
        ),
      );
      out.colors.push(base.clone().multiplyScalar(0.9 + r(k + 4) * 0.25));
    }
    if (t.staked) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + r(60);
        const lean = 0.2;
        const dx = Math.cos(a) * 0.32;
        const dz = Math.sin(a) * 0.32;
        /* เอียงยอดเข้าหาลำต้น */
        out.stakes.push(
          mat4(
            t.x + dx,
            t.y - 0.05,
            t.z + dz,
            0.022,
            1.55,
            0.022,
            -Math.sin(a) * lean,
            0,
            Math.cos(a) * lean,
          ),
        );
      }
    }
  }
  for (const s of shrubs) {
    const r = (k: number) => hash01(s.seed * 977 + k);
    const base = new Color(r(1) < 0.5 ? M3D.foliageDeep : M3D.hedge);
    const n = 2;
    for (let i = 0; i < n; i++) {
      const rr = s.r * (i === 0 ? 1 : 0.7);
      const ox = i === 0 ? 0 : (r(2) - 0.5) * s.r;
      const oz = i === 0 ? 0 : (r(3) - 0.5) * s.r;
      out.leaves.push(
        mat4(s.x + ox, s.y + rr * 0.62, s.z + oz, rr, rr * 0.8, rr, 0, r(4 + i) * 6, 0),
      );
      out.colors.push(base.clone().multiplyScalar(0.85 + r(6 + i) * 0.3));
    }
  }
  return out;
}

function Instanced({
  geometry,
  material,
  matrices,
  colors,
}: {
  geometry: BufferGeometry;
  material: Material;
  matrices: Matrix4[];
  colors?: Color[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((x, i) => m.setMatrixAt(i, x));
    colors?.forEach((c, i) => m.setColorAt(i, c));
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices, colors]);
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

export function Vegetation({
  trees,
  shrubs,
  kit,
}: {
  trees: readonly TreeSpot[];
  shrubs: readonly ShrubSpot[];
  kit: OutdoorKit;
}) {
  const built = useMemo(() => grow(trees, shrubs), [trees, shrubs]);
  return (
    <group>
      <Instanced
        geometry={blob()}
        material={foliage()}
        matrices={built.leaves}
        colors={built.colors}
      />
      <Instanced geometry={trunk()} material={kit.bark} matrices={built.trunks} />
      <Instanced geometry={trunk()} material={kit.oak} matrices={built.stakes} />
    </group>
  );
}
