"use client";

import type { ComponentType, ReactNode } from "react";
import {
  DoubleSide,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Shape,
  type BufferGeometry,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Furniture, FurnitureKind } from "@/lib/schemas";
import { M3D, ROUGH } from "../materials";

/* เฟอร์นิเจอร์ procedural ทั้งหมด — primitive + กล่องลบมุม (roundedBox) เท่านั้น ไม่มี asset ภายนอก (DESIGN-SPEC §5)
   ทุกชิ้นสร้างตัวเองให้พอดีกล่อง w × d ที่ data กำหนด วางฐานไว้ที่ y = 0
   ขนาดกล่องคือสิ่งที่ geometry:check ตรวจว่าไม่ทะลุผนังและไม่ขวางประตู

   ทิศทางแบบ maquette (§5): ทุกชิ้นประกอบจากหลายส่วนจริง เว้นร่อง 5-10 มม. ระหว่างส่วน
   ให้ AO กับเงาสัมผัสวาดเส้นแบ่งเอง · ขอบที่แสงโดนลบมุมด้วย roundedBox
   ชิ้นงานสร้างในท่าเดียว (หน้า = +z, ความกว้างตามแกน x) แล้วหมุนทั้งก้อนตาม facing */

export type PieceProps = {
  w: number;
  d: number;
  h?: number;
  facing?: Furniture["facing"];
  tone?: Furniture["tone"];
  /** mood studio: ผ้าผืนหลัก (โซฟา เบาะ · เตียง ผ้าคลุม · พรม ผืนบน) — ไม่ส่ง = สีตาม tone */
  cloth?: MeshStandardMaterial | undefined;
};

type V3 = [number, number, number];

/* วัสดุใช้ร่วมกันทั้งฉาก — สีกับความหยาบเดียวกันคือ material ตัวเดียว
   ห้ามแก้ค่าใน material ที่ได้จากที่นี่ (ฉากอื่นใช้ตัวเดียวกันอยู่) */
const cache = new Map<string, MeshStandardMaterial>();
function mat(color: string, roughness: number, extra?: "facet" | "glow" | "both-sides" | "screen") {
  const key = `${color}|${roughness}|${extra ?? ""}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness, metalness: 0 });
    if (extra === "facet") m.flatShading = true;
    if (extra === "glow") {
      m.side = DoubleSide;
      m.emissive.set(color);
      m.emissiveIntensity = 0.3;
      /* mood studio ไล่ความสว่างตามความมืดของเวลา (MoodRig) — ฉากอื่นคงค่านี้ */
      m.userData = { glow: true, glowBase: 0.3, glowNight: 2.6 };
    }
    if (extra === "screen") {
      m.emissive.set(color);
      m.emissiveIntensity = 0.7;
      m.userData = { glow: true, glowBase: 0.7, glowNight: 1.6 };
    }
    if (extra === "both-sides") m.side = DoubleSide;
    cache.set(key, m);
  }
  return m;
}

const fabric = (c: string) => mat(c, ROUGH.fabric);
const timber = (c: string) => mat(c, ROUGH.timber);
const glazed = () => mat(M3D.ceramic, ROUGH.ceramic);

/* กล่องลบมุม — รูปทรงเดียวกับ RoundedBox ของ drei ทุกค่า (shape · extrude · center · creased normals 0.4 rad)
   แต่สร้างครั้งเดียวต่อขนาดแล้วใช้ร่วม และสร้างตอน render ไม่ใช่ใน useLayoutEffect
   ของเดิมสร้าง + คำนวณ normal ใหม่ทุกชิ้นใน layout effect — layout effect ของทั้งฉากรันรวดเดียวใน commit เดียว
   เป็น long task ก้อนใหญ่สุดก่อนเฟรมแรก (วัด 2026-10-03: ~1.7 s บนโปรไฟล์มือถือ CPU ×4)
   ตอน render React แบ่งงานเป็นช่วงสั้นๆ ระหว่าง component ได้ · geometry ใช้ร่วมทั้งแอป ไม่ dispose (เล็ก) */
const RB_EPS = 0.00001;
const roundedCache = new Map<string, BufferGeometry>();
function roundedBox([w, h, d]: V3, radius: number, smoothness: number): BufferGeometry {
  const key = `${w}|${h}|${d}|${radius}|${smoothness}`;
  const hit = roundedCache.get(key);
  if (hit) return hit;
  const shape = new Shape();
  const r = radius - RB_EPS;
  shape.absarc(RB_EPS, RB_EPS, RB_EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(RB_EPS, h - r * 2, RB_EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(w - r * 2, h - r * 2, RB_EPS, Math.PI / 2, 0, true);
  shape.absarc(w - r * 2, RB_EPS, RB_EPS, 0, -Math.PI / 2, true);
  const g = new ExtrudeGeometry(shape, {
    depth: d - radius * 2,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: radius - RB_EPS,
    bevelThickness: radius,
    curveSegments: smoothness,
  });
  g.center();
  const out = toCreasedNormals(g, 0.4);
  roundedCache.set(key, out);
  return out;
}

/** กล่องหนึ่งชิ้น — r > 0 ลบมุม (ใช้เฉพาะชิ้นที่ขอบรับแสงจริง ราคา vertex สูงกว่า) */
function Box({
  size,
  at,
  m,
  r = 0,
  rot,
}: {
  size: V3;
  at: V3;
  m: MeshStandardMaterial;
  r?: number;
  rot?: V3;
}) {
  if (r > 0) {
    return (
      <mesh
        geometry={roundedBox(size, Math.min(r, ...size.map((s) => s / 2 - 1e-4)), 3)}
        position={at}
        rotation={rot}
        material={m}
        castShadow
        receiveShadow
      />
    );
  }
  return (
    <mesh position={at} rotation={rot} material={m} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Cyl({
  r0,
  r1 = r0,
  h,
  at,
  m,
  seg = 20,
  open = false,
}: {
  r0: number;
  r1?: number;
  h: number;
  at: V3;
  m: MeshStandardMaterial;
  seg?: number;
  open?: boolean;
}) {
  return (
    <mesh position={at} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[r0, r1, h, seg, 1, open]} />
    </mesh>
  );
}

/** กลุ่มใบไม้แบบเหลี่ยม (icosahedron flat shading) — อ่านเป็นโมเดลกระดาษ ไม่ใช่ลูกบอลยาง */
function Leaves({ r, at, detail = 1 }: { r: number; at: V3; detail?: number }) {
  return (
    <mesh
      position={at}
      material={mat(M3D.fabricSage, ROUGH.foliage, "facet")}
      castShadow
      receiveShadow
    >
      <icosahedronGeometry args={[r, detail]} />
    </mesh>
  );
}

/** หมุนชิ้นงานจากท่ามาตรฐาน (หน้า +z) ไปตาม facing · คืนขนาดในท่ามาตรฐาน */
function oriented(w: number, d: number, facing: Furniture["facing"] = "z+") {
  const side = facing === "x+" || facing === "x-";
  const rotY =
    facing === "x+" ? Math.PI / 2 : facing === "x-" ? -Math.PI / 2 : facing === "z-" ? Math.PI : 0;
  return { W: side ? d : w, D: side ? w : d, rotY };
}

function Turn({ rotY, children }: { rotY: number; children: ReactNode }) {
  return <group rotation={[0, rotY, 0]}>{children}</group>;
}

const toneColor = (tone: Furniture["tone"], fallback: string) => (tone ? M3D[tone] : fallback);

/* ── ห้องนั่งเล่น ───────────────────────────────────────────── */

function Sofa({ w, d, facing, tone, cloth: studioCloth }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const cloth = studioCloth ?? fabric(toneColor(tone, M3D.fabricSage));
  const accent = fabric(tone === "fabricWarm" ? M3D.fabricSage : M3D.fabricWarm);
  const legH = 0.09;
  const baseTop = legH + 0.16;
  const arm = 0.15;
  const back = 0.18;
  const inner = W - arm * 2;
  const n = inner > 1.6 ? 3 : 2;
  const gap = 0.012;
  const cw = (inner - gap * (n - 1)) / n;
  const seatD = D - back - 0.02;
  return (
    <Turn rotY={rotY}>
      {/* ขาไม้สี่ขา — โซฟาลอยจากพื้น เงาสัมผัสจึงเป็นเงาจริงไม่ใช่ก้อนทึบ */}
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz]) => (
        <Cyl
          key={`${sx}${sz}`}
          r0={0.022}
          r1={0.016}
          h={legH}
          at={[sx * (W / 2 - 0.07), legH / 2, sz * (D / 2 - 0.07)]}
          m={timber(M3D.woodDark)}
          seg={10}
        />
      ))}
      <Box size={[W, 0.16, D]} at={[0, legH + 0.08, 0]} m={cloth} r={0.03} />
      {/* แขนสองข้าง */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          size={[arm, 0.4, D]}
          at={[s * (W / 2 - arm / 2), baseTop + 0.2 - 0.02, 0]}
          m={cloth}
          r={0.05}
        />
      ))}
      {/* พนักพิง */}
      <Box
        size={[inner, 0.46, back]}
        at={[0, baseTop + 0.23, -D / 2 + back / 2]}
        m={cloth}
        r={0.05}
      />
      {/* เบาะนั่งแยกลูก เว้นร่อง */}
      {Array.from({ length: n }, (_, i) => (
        <Box
          key={`s${i}`}
          size={[cw, 0.15, seatD]}
          at={[-inner / 2 + cw / 2 + i * (cw + gap), baseTop + 0.075, D / 2 - seatD / 2]}
          m={cloth}
          r={0.05}
        />
      ))}
      {/* หมอนพิงเอนไปข้างหลังเล็กน้อย */}
      {Array.from({ length: n }, (_, i) => (
        <Box
          key={`b${i}`}
          size={[cw - 0.02, 0.38, 0.13]}
          at={[-inner / 2 + cw / 2 + i * (cw + gap), baseTop + 0.15 + 0.19, -D / 2 + back + 0.07]}
          rot={[-0.16, 0, 0]}
          m={cloth}
          r={0.06}
        />
      ))}
      {/* หมอนอิงใบเดียวคนละสี — ของที่บอกว่ามีคนใช้ */}
      <Box
        size={[0.38, 0.36, 0.11]}
        at={[inner / 2 - 0.26, baseTop + 0.15 + 0.17, -D / 2 + back + 0.17]}
        rot={[-0.28, -0.25, 0.06]}
        m={accent}
        r={0.05}
      />
    </Turn>
  );
}

function Rug({ w, d, tone, cloth }: PieceProps) {
  return (
    <group>
      <Box size={[w, 0.01, d]} at={[0, 0.005, 0]} m={fabric(M3D.ceramic)} r={0.004} />
      <Box
        size={[w - 0.14, 0.012, d - 0.14]}
        at={[0, 0.007, 0]}
        m={cloth ?? fabric(toneColor(tone, M3D.fabricSage))}
        r={0.005}
      />
    </group>
  );
}

function Plant({ w, d }: PieceProps) {
  const r = Math.min(w, d) / 2;
  const potH = Math.max(0.24, r * 0.9);
  return (
    <group>
      <Cyl r0={r * 0.7} r1={r * 0.52} h={potH} at={[0, potH / 2, 0]} m={glazed()} seg={24} />
      <Cyl r0={r * 0.64} h={0.01} at={[0, potH - 0.015, 0]} m={timber(M3D.woodDark)} seg={24} />
      <Leaves r={r * 0.78} at={[0, potH + r * 0.62, 0]} />
      <Leaves r={r * 0.56} at={[r * 0.34, potH + r * 1.18, -r * 0.16]} />
      <Leaves r={r * 0.46} at={[-r * 0.3, potH + r * 1.05, r * 0.24]} />
    </group>
  );
}

function FloorLamp({ w, d }: PieceProps) {
  const r = Math.min(w, d) / 2;
  return (
    <group>
      <Cyl r0={r * 0.82} h={0.03} at={[0, 0.015, 0]} m={timber(M3D.woodDark)} seg={28} />
      <Cyl r0={0.013} h={1.48} at={[0, 0.77, 0]} m={timber(M3D.woodDark)} seg={10} />
      <Cyl
        r0={r * 0.72}
        r1={r * 0.95}
        h={0.32}
        at={[0, 1.62, 0]}
        m={mat(M3D.fabricWarm, ROUGH.fabric, "glow")}
        seg={28}
        open
      />
    </group>
  );
}

function Frame({ w, d, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const fw = W;
  const fh = Math.min(0.62, W * 0.72);
  return (
    <Turn rotY={rotY}>
      <group position={[0, 1.5, -D / 2 + 0.02]}>
        <Box size={[fw, fh, 0.035]} at={[0, 0, 0]} m={timber(M3D.woodDark)} r={0.006} />
        <Box size={[fw - 0.06, fh - 0.06, 0.01]} at={[0, 0, 0.018]} m={fabric(M3D.ceramic)} />
        {/* งานภาพนามธรรมสองระนาบ — สีจากพาเลตต์ 3D เท่านั้น */}
        <Box
          size={[fw * 0.5, fh * 0.56, 0.006]}
          at={[-fw * 0.08, -fh * 0.04, 0.025]}
          m={fabric(M3D.wallAccent)}
        />
        <Box
          size={[fw * 0.16, fh * 0.16, 0.006]}
          at={[fw * 0.22, fh * 0.16, 0.025]}
          m={fabric(M3D.fabricWarm)}
        />
      </group>
    </Turn>
  );
}

/* ── ห้องนอน ───────────────────────────────────────────────── */

function Bed({ w, d, facing, tone, cloth }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const cover = cloth ?? fabric(toneColor(tone, M3D.fabricWarm));
  const throwM = fabric(tone === "fabricSage" ? M3D.fabricWarm : M3D.fabricSage);
  const linen = fabric(M3D.ceramic);
  const frameTop = 0.3;
  const matH = 0.2;
  const top = frameTop + matH;
  const head = 0.07;
  const bodyD = D - head;
  const cz = head / 2;
  return (
    <Turn rotY={rotY}>
      {/* ฐานร่นเข้าไป เตียงจึงดูลอย มีเงาใต้ขอบ */}
      <Box size={[W - 0.14, 0.1, bodyD - 0.14]} at={[0, 0.05, cz]} m={timber(M3D.woodDark)} />
      <Box size={[W, 0.2, bodyD]} at={[0, 0.2, cz]} m={timber(M3D.woodLight)} r={0.015} />
      <Box
        size={[W - 0.06, matH, bodyD - 0.06]}
        at={[0, frameTop + matH / 2, cz]}
        m={linen}
        r={0.06}
      />
      {/* ผ้าห่มคลุมสองในสามด้านปลายเตียง พับขอบบนเห็นสีผ้าปูด้านใน */}
      <Box
        size={[W - 0.02, 0.05, bodyD * 0.66]}
        at={[0, top + 0.02, D / 2 - (bodyD * 0.66) / 2 - 0.01]}
        m={cover}
        r={0.025}
      />
      <Box
        size={[W - 0.02, 0.06, 0.2]}
        at={[0, top + 0.035, D / 2 - bodyD * 0.66 - 0.06]}
        m={linen}
        r={0.03}
      />
      <Box size={[W - 0.01, 0.025, 0.42]} at={[0, top + 0.06, D / 2 - 0.3]} m={throwM} r={0.012} />
      {/* หมอนสองใบ เอียงพิงหัวเตียง */}
      {(W > 1.2 ? [-1, 1] : [0]).map((s) => (
        <Box
          key={s}
          size={[W > 1.2 ? W * 0.42 : W * 0.8, 0.13, 0.36]}
          at={[s * W * 0.23, top + 0.08, -D / 2 + head + 0.24]}
          rot={[0.22, 0, 0]}
          m={linen}
          r={0.06}
        />
      ))}
      {/* หัวเตียงบุผ้า */}
      <Box
        size={[W + 0.04, 1.0, head]}
        at={[0, 0.5, -D / 2 + head / 2]}
        m={timber(M3D.woodDark)}
        r={0.02}
      />
      <Box size={[W - 0.08, 0.5, 0.04]} at={[0, 0.78, -D / 2 + head + 0.015]} m={cover} r={0.02} />
    </Turn>
  );
}

function Wardrobe({ w, d, h = 1.9, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const plinth = 0.08;
  const n = W > 1.25 ? 3 : 2;
  const gap = 0.008;
  const pw = (W - 0.02 - gap * (n - 1)) / n;
  const doorH = h - plinth - 0.03;
  return (
    <Turn rotY={rotY}>
      <Box
        size={[W - 0.04, plinth, D - 0.06]}
        at={[0, plinth / 2, -0.02]}
        m={timber(M3D.woodDark)}
      />
      <Box
        size={[W, h - plinth, D - 0.025]}
        at={[0, plinth + (h - plinth) / 2, -0.0125]}
        m={timber(M3D.woodDark)}
        r={0.01}
      />
      {Array.from({ length: n }, (_, i) => {
        const x = -W / 2 + 0.01 + pw / 2 + i * (pw + gap);
        /* มือจับอยู่ฝั่งที่ชนบานข้างๆ */
        const hx = x + (i < n / 2 ? pw / 2 - 0.05 : -pw / 2 + 0.05);
        return (
          <group key={i}>
            <Box
              size={[pw, doorH, 0.02]}
              at={[x, plinth + 0.015 + doorH / 2, D / 2 - 0.01]}
              m={timber(M3D.woodLight)}
              r={0.004}
            />
            <Box
              size={[0.018, 0.34, 0.025]}
              at={[hx, 1.05, D / 2 + 0.008]}
              m={timber(M3D.woodDark)}
              r={0.006}
            />
          </group>
        );
      })}
    </Turn>
  );
}

function Desk({ w, d, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const top = 0.74;
  return (
    <Turn rotY={rotY}>
      <Box size={[W, 0.035, D]} at={[0, top - 0.0175, 0]} m={timber(M3D.woodLight)} r={0.01} />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          size={[0.035, top - 0.035, D - 0.06]}
          at={[s * (W / 2 - 0.05), (top - 0.035) / 2, 0]}
          m={timber(M3D.woodDark)}
          r={0.006}
        />
      ))}
      <Box
        size={[W - 0.14, 0.12, 0.018]}
        at={[0, top - 0.1, -D / 2 + 0.06]}
        m={timber(M3D.woodDark)}
      />
      {/* จอคอมบนขาตั้ง (จอเรืองแสง — ค่ำแล้วเห็นเป็นจุดแสงเย็นกลางห้อง) · คีย์บอร์ด · โคมโต๊ะ */}
      <Box
        size={[0.2, 0.012, 0.14]}
        at={[-W * 0.08, top + 0.006, -D / 2 + 0.16]}
        m={timber(M3D.frameDark)}
      />
      <Box
        size={[0.03, 0.2, 0.03]}
        at={[-W * 0.08, top + 0.1, -D / 2 + 0.14]}
        m={timber(M3D.frameDark)}
      />
      <Box
        size={[0.56, 0.34, 0.025]}
        at={[-W * 0.08, top + 0.33, -D / 2 + 0.16]}
        m={timber(M3D.frameDark)}
        r={0.006}
      />
      <Box
        size={[0.52, 0.3, 0.004]}
        at={[-W * 0.08, top + 0.33, -D / 2 + 0.175]}
        m={mat(M3D.screen, 0.2, "screen")}
      />
      <Box size={[0.42, 0.015, 0.13]} at={[-W * 0.08, top + 0.008, 0.08]} m={glazed()} r={0.004} />
      <Cyl
        r0={0.06}
        h={0.015}
        at={[W * 0.34, top + 0.008, -D / 2 + 0.14]}
        m={timber(M3D.frameDark)}
      />
      <Cyl
        r0={0.008}
        h={0.36}
        at={[W * 0.34, top + 0.19, -D / 2 + 0.14]}
        m={timber(M3D.frameDark)}
      />
      <Cyl
        r0={0.05}
        r1={0.09}
        h={0.1}
        at={[W * 0.34, top + 0.4, -D / 2 + 0.14]}
        m={mat(M3D.fabricWarm, ROUGH.fabric, "glow")}
        open
      />
      {/* เก้าอี้ทำงานหน้าโต๊ะ */}
      <Box
        size={[0.46, 0.06, 0.44]}
        at={[-W * 0.08, 0.46, D / 2 + 0.22]}
        m={fabric(M3D.frameDark)}
        r={0.02}
      />
      <Box
        size={[0.44, 0.42, 0.05]}
        at={[-W * 0.08, 0.72, D / 2 + 0.44]}
        m={fabric(M3D.frameDark)}
        r={0.02}
      />
      <Cyl r0={0.025} h={0.42} at={[-W * 0.08, 0.22, D / 2 + 0.22]} m={timber(M3D.frameDark)} />
      <Cyl
        r0={0.22}
        h={0.03}
        at={[-W * 0.08, 0.03, D / 2 + 0.22]}
        m={timber(M3D.frameDark)}
        seg={5}
      />
      <Cyl r0={0.04} h={0.09} at={[W * 0.22, top + 0.045, 0.06]} m={glazed()} seg={16} />
      <Box
        size={[0.22, 0.03, 0.16]}
        at={[W * 0.3, top + 0.015, -0.12]}
        rot={[0, 0.2, 0]}
        m={fabric(M3D.wallAccent)}
        r={0.004}
      />
      <Box
        size={[0.2, 0.025, 0.15]}
        at={[W * 0.3, top + 0.0425, -0.12]}
        rot={[0, 0.08, 0]}
        m={fabric(M3D.fabricWarm)}
        r={0.004}
      />
    </Turn>
  );
}

/* ── ครัวและโต๊ะกินข้าว ─────────────────────────────────────── */

function Counter({ w, d, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const plinth = 0.1;
  const body = 0.78;
  const top = plinth + body + 0.04;
  const n = Math.max(2, Math.round(W / 0.6));
  const gap = 0.006;
  const fw = (W - gap * (n + 1)) / n;
  return (
    <Turn rotY={rotY}>
      <Box
        size={[W - 0.02, plinth, D - 0.08]}
        at={[0, plinth / 2, -0.04]}
        m={timber(M3D.woodDark)}
      />
      <Box
        size={[W, body, D - 0.03]}
        at={[0, plinth + body / 2, -0.015]}
        m={timber(M3D.woodLight)}
      />
      {/* หน้าบานแยกแผ่น เว้นร่อง — ร่องคือสิ่งที่ทำให้อ่านว่าเป็นตู้ ไม่ใช่ก้อนไม้ */}
      {Array.from({ length: n }, (_, i) => (
        <Box
          key={i}
          size={[fw, body - 0.012, 0.018]}
          at={[-W / 2 + gap + fw / 2 + i * (fw + gap), plinth + body / 2, D / 2 - 0.009]}
          m={mat(M3D.wallAccent, ROUGH.timber)}
          r={0.004}
        />
      ))}
      <Box size={[W + 0.02, 0.04, D + 0.01]} at={[0, top - 0.02, 0]} m={glazed()} r={0.008} />
      {/* ผนังกันเปื้อนหลังเคาน์เตอร์ */}
      <Box size={[W, 0.55, 0.012]} at={[0, top + 0.275, -D / 2 + 0.006]} m={glazed()} />
      {/* อ่างล้าง (ขอบเข้ม) · ก๊อก · เขียงไม้ · ชามเซรามิก */}
      <Box
        size={[0.52, 0.006, 0.36]}
        at={[-W * 0.22, top + 0.003, 0.02]}
        m={timber(M3D.woodDark)}
        r={0.002}
      />
      <Cyl
        r0={0.012}
        h={0.26}
        at={[-W * 0.22, top + 0.13, -D / 2 + 0.07]}
        m={timber(M3D.woodDark)}
        seg={10}
      />
      <Box
        size={[0.012, 0.012, 0.16]}
        at={[-W * 0.22, top + 0.255, -D / 2 + 0.14]}
        m={timber(M3D.woodDark)}
      />
      <Box
        size={[0.4, 0.02, 0.26]}
        at={[W * 0.18, top + 0.01, 0.02]}
        rot={[0, -0.08, 0]}
        m={timber(M3D.woodLight)}
        r={0.006}
      />
      <Cyl r0={0.11} r1={0.06} h={0.07} at={[W * 0.36, top + 0.035, -0.04]} m={glazed()} seg={24} />
    </Turn>
  );
}

function Chair({ at, rotY }: { at: V3; rotY: number }) {
  const seat = 0.45;
  return (
    <group position={at} rotation={[0, rotY, 0]}>
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz]) => (
        <Box
          key={`${sx}${sz}`}
          size={[0.03, seat, 0.03]}
          at={[sx * 0.17, seat / 2, sz * 0.17]}
          m={timber(M3D.woodDark)}
        />
      ))}
      <Box
        size={[0.42, 0.035, 0.42]}
        at={[0, seat + 0.0175, 0]}
        m={timber(M3D.woodLight)}
        r={0.01}
      />
      <Box
        size={[0.4, 0.05, 0.38]}
        at={[0, seat + 0.06, 0.01]}
        m={fabric(M3D.fabricWarm)}
        r={0.02}
      />
      <Box
        size={[0.4, 0.3, 0.025]}
        at={[0, seat + 0.3, -0.2]}
        rot={[-0.08, 0, 0]}
        m={timber(M3D.woodLight)}
        r={0.01}
      />
    </group>
  );
}

function DiningSet({ w, d }: PieceProps) {
  const tw = w * 0.9;
  const td = Math.min(d * 0.58, 0.9);
  const top = 0.74;
  const per = w >= 1.4 ? 2 : 1;
  const xs = per === 2 ? [-tw / 4, tw / 4] : [0];
  const chairZ = Math.min(d / 2 - 0.23, td / 2 + 0.02);
  return (
    <group>
      <Box size={[tw, 0.04, td]} at={[0, top - 0.02, 0]} m={timber(M3D.woodLight)} r={0.012} />
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz]) => (
        <Box
          key={`${sx}${sz}`}
          size={[0.05, top - 0.04, 0.05]}
          at={[sx * (tw / 2 - 0.07), (top - 0.04) / 2, sz * (td / 2 - 0.07)]}
          m={timber(M3D.woodDark)}
        />
      ))}
      {xs.map((x) => (
        <group key={x}>
          <Chair at={[x, 0, chairZ]} rotY={Math.PI} />
          <Chair at={[x, 0, -chairZ]} rotY={0} />
        </group>
      ))}
      {/* แจกันกลางโต๊ะ */}
      <Cyl r0={0.05} r1={0.07} h={0.16} at={[0, top + 0.08, 0]} m={glazed()} seg={18} />
      <Leaves r={0.09} at={[0, top + 0.22, 0]} detail={0} />
    </group>
  );
}

/* ── ห้องน้ำ ──────────────────────────────────────────────── */

function Toilet({ w, d, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  return (
    <Turn rotY={rotY}>
      <Cyl r0={W * 0.4} r1={W * 0.3} h={0.38} at={[0, 0.19, D * 0.08]} m={glazed()} seg={28} />
      <Box size={[W * 0.86, 0.045, D * 0.66]} at={[0, 0.405, D * 0.1]} m={glazed()} r={0.02} />
      <Box size={[W * 0.9, 0.42, 0.18]} at={[0, 0.58, -D / 2 + 0.09]} m={glazed()} r={0.03} />
      <Box size={[W * 0.94, 0.03, 0.2]} at={[0, 0.805, -D / 2 + 0.1]} m={glazed()} r={0.012} />
    </Turn>
  );
}

function Sink({ w, d, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  return (
    <Turn rotY={rotY}>
      <Box size={[W, 0.5, D - 0.04]} at={[0, 0.5, -0.02]} m={timber(M3D.woodLight)} r={0.01} />
      <Box
        size={[W * 0.96, 0.4, 0.016]}
        at={[0, 0.49, D / 2 - 0.05]}
        m={mat(M3D.wallAccent, ROUGH.timber)}
        r={0.004}
      />
      <Box size={[W, 0.03, D]} at={[0, 0.765, 0]} m={glazed()} r={0.01} />
      <Box size={[W * 0.7, 0.12, D * 0.62]} at={[0, 0.84, 0.03]} m={glazed()} r={0.05} />
      <Cyl r0={0.012} h={0.2} at={[0, 0.88, -D / 2 + 0.05]} m={timber(M3D.woodDark)} seg={10} />
      <Box size={[0.012, 0.012, 0.12]} at={[0, 0.975, -D / 2 + 0.1]} m={timber(M3D.woodDark)} />
      {/* กระจกเหนืออ่าง */}
      <Box
        size={[W * 0.8, 0.6, 0.02]}
        at={[0, 1.45, -D / 2 + 0.01]}
        m={timber(M3D.woodDark)}
        r={0.01}
      />
      <Box
        size={[W * 0.74, 0.54, 0.006]}
        at={[0, 1.45, -D / 2 + 0.023]}
        m={mat(M3D.ceramic, 0.12)}
      />
    </Turn>
  );
}

function ShowerTray({ w, d }: PieceProps) {
  return (
    <group>
      <Box size={[w, 0.06, d]} at={[0, 0.03, 0]} m={glazed()} r={0.02} />
      <Cyl r0={0.04} h={0.004} at={[w * 0.3, 0.062, d * 0.3]} m={timber(M3D.woodDark)} seg={16} />
      {/* ฉากกั้นอาบน้ำด้านเดียว — ทึบ ไม่ใช่กรอบลอย */}
      <Box
        size={[w, 1.85, 0.04]}
        at={[0, 0.06 + 0.925, -d / 2 + 0.02]}
        m={mat(M3D.wallInner, ROUGH.ceramic)}
        r={0.008}
      />
      <Cyl r0={0.012} h={0.9} at={[0, 1.6, d / 2 - 0.06]} m={timber(M3D.woodDark)} seg={10} />
      <Cyl
        r0={0.07}
        r1={0.05}
        h={0.02}
        at={[0, 2.06, d / 2 - 0.06]}
        m={timber(M3D.woodDark)}
        seg={18}
      />
    </group>
  );
}

/* ── นอกบ้าน ─────────────────────────────────────────────── */

function Tree({ w, d }: PieceProps) {
  const r = Math.min(w, d) / 2;
  return (
    <group>
      <Cyl r0={0.06} r1={0.1} h={1.3} at={[0, 0.65, 0]} m={timber(M3D.woodDark)} seg={10} />
      <Leaves r={r} at={[0, 1.55, 0]} />
      <Leaves r={r * 0.7} at={[r * 0.4, 1.98, r * 0.18]} />
      <Leaves r={r * 0.62} at={[-r * 0.36, 1.86, -r * 0.24]} />
    </group>
  );
}

/* ── ชั้นหนังสือ โต๊ะกลาง เก้าอี้เดี่ยว (เพิ่ม 2026-10-21 · mood studio) ─────────── */

/** สีปกหนังสือ — จากสีวัสดุที่มีในชุดอยู่แล้ว */
const BOOKS = [
  M3D.fabricWarm,
  M3D.wallAccent,
  M3D.ceramic,
  M3D.frameDark,
  M3D.fabricSage,
  M3D.woodDark,
];

function Bookshelf({ w, d, h = 1.9, facing }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const levels = 5;
  const gap = (h - 0.06) / levels;
  const wood = timber(M3D.woodDark);
  return (
    <Turn rotY={rotY}>
      {[-1, 1].map((sx) => (
        <Box key={sx} size={[0.03, h, D]} at={[sx * (W / 2 - 0.015), h / 2, 0]} m={wood} />
      ))}
      <Box size={[W, h, 0.015]} at={[0, h / 2, -D / 2 + 0.0075]} m={wood} />
      {Array.from({ length: levels + 1 }, (_, i) => (
        <Box key={i} size={[W - 0.06, 0.025, D - 0.02]} at={[0, 0.03 + i * gap, 0.01]} m={wood} />
      ))}
      {/* หนังสือ: สูง/หนาเปลี่ยนตามลำดับ (ไม่สุ่ม — ภาพนิ่งทุกครั้งเหมือนกัน) ชั้นเว้นชั้นเหลือที่วางกระถาง */}
      {Array.from({ length: levels }, (_, lv) => {
        const books: ReactNode[] = [];
        let x = -W / 2 + 0.06;
        const end = lv % 2 ? W / 2 - 0.3 : W / 2 - 0.06;
        for (let i = 0; x < end; i++) {
          const t = 0.03 + ((i * 7 + lv * 3) % 5) * 0.008;
          const bh = gap * (0.62 + ((i * 5 + lv) % 4) * 0.07);
          books.push(
            <Box
              key={i}
              size={[t, bh, D * 0.72]}
              at={[x + t / 2, 0.045 + lv * gap + bh / 2, 0.02]}
              m={fabric(BOOKS[(i + lv * 2) % BOOKS.length] ?? M3D.woodDark)}
            />,
          );
          x += t + 0.004;
        }
        if (lv % 2)
          books.push(
            <Cyl
              key="pot"
              r0={0.07}
              r1={0.055}
              h={0.13}
              at={[W / 2 - 0.16, 0.11 + lv * gap, 0.02]}
              m={glazed()}
            />,
          );
        return <group key={lv}>{books}</group>;
      })}
      <Leaves r={0.13} at={[W / 2 - 0.16, 0.26 + gap, 0.02]} detail={0} />
    </Turn>
  );
}

function CoffeeTable({ w, d }: PieceProps) {
  const r = Math.min(w, d) / 2;
  return (
    <group>
      <Cyl r0={r} h={0.035} at={[0, 0.4, 0]} m={timber(M3D.woodDark)} seg={36} />
      <Cyl r0={r * 0.18} r1={r * 0.3} h={0.38} at={[0, 0.19, 0]} m={timber(M3D.woodDark)} />
      <Box
        size={[0.24, 0.035, 0.18]}
        at={[-r * 0.3, 0.435, 0]}
        rot={[0, 0.3, 0]}
        m={fabric(M3D.ceramic)}
        r={0.004}
      />
      <Box
        size={[0.22, 0.03, 0.16]}
        at={[-r * 0.3, 0.468, 0]}
        rot={[0, 0.15, 0]}
        m={fabric(M3D.frameDark)}
        r={0.004}
      />
      <Cyl
        r0={0.035}
        h={0.08}
        at={[r * 0.35, 0.458, r * 0.2]}
        m={mat(M3D.sheerGlow, 0.6, "glow")}
        seg={14}
      />
      <Cyl r0={0.06} r1={0.05} h={0.1} at={[r * 0.2, 0.468, -r * 0.4]} m={glazed()} seg={16} />
      <Leaves r={0.09} at={[r * 0.2, 0.58, -r * 0.4]} detail={0} />
    </group>
  );
}

function Armchair({ w, d, facing, cloth }: PieceProps) {
  const { W, D, rotY } = oriented(w, d, facing);
  const seat = cloth ?? fabric(M3D.fabricWarm);
  const wood = timber(M3D.woodDark);
  return (
    <Turn rotY={rotY}>
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz]) => (
        <Box
          key={`${sx}${sz}`}
          size={[0.04, 0.2, 0.04]}
          at={[sx * (W / 2 - 0.06), 0.1, sz * (D / 2 - 0.06)]}
          m={wood}
        />
      ))}
      <Box size={[W, 0.06, D]} at={[0, 0.22, 0]} m={wood} r={0.01} />
      <Box size={[W - 0.12, 0.14, D - 0.16]} at={[0, 0.32, 0.04]} m={seat} r={0.05} />
      <Box
        size={[W - 0.12, 0.42, 0.14]}
        at={[0, 0.56, -D / 2 + 0.09]}
        rot={[-0.12, 0, 0]}
        m={seat}
        r={0.05}
      />
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          size={[0.07, 0.26, D - 0.08]}
          at={[sx * (W / 2 - 0.035), 0.38, 0]}
          m={wood}
          r={0.015}
        />
      ))}
      <Box
        size={[0.32, 0.26, 0.1]}
        at={[0.05, 0.5, -D / 2 + 0.2]}
        rot={[-0.2, 0.15, 0]}
        m={fabric(M3D.wallAccent)}
        r={0.04}
      />
    </Turn>
  );
}

export const PIECES: Record<FurnitureKind, ComponentType<PieceProps>> = {
  sofa: Sofa,
  bed: Bed,
  wardrobe: Wardrobe,
  counter: Counter,
  diningSet: DiningSet,
  desk: Desk,
  toilet: Toilet,
  sink: Sink,
  showerTray: ShowerTray,
  rug: Rug,
  plant: Plant,
  floorLamp: FloorLamp,
  frame: Frame,
  tree: Tree,
  bookshelf: Bookshelf,
  coffeeTable: CoffeeTable,
  armchair: Armchair,
};

export const PIECE_LABELS: Record<FurnitureKind, string> = {
  sofa: "โซฟา",
  bed: "เตียง",
  wardrobe: "ตู้เสื้อผ้า",
  counter: "เคาน์เตอร์ครัว",
  diningSet: "ชุดโต๊ะกินข้าว",
  desk: "โต๊ะทำงาน",
  toilet: "สุขภัณฑ์",
  sink: "อ่างล้างหน้า",
  showerTray: "ที่อาบน้ำ",
  rug: "พรม",
  plant: "ต้นไม้ในกระถาง",
  floorLamp: "โคมไฟตั้งพื้น",
  frame: "กรอบรูป",
  tree: "ต้นไม้",
  bookshelf: "ชั้นหนังสือ",
  coffeeTable: "โต๊ะกลาง",
  armchair: "เก้าอี้เดี่ยว",
};
