import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  galleryFileSchema,
  houseTypesFileSchema,
  plotsFileSchema,
  projectLinkIssues,
  projectsFileSchema,
  siteSettingsSchema,
} from "../src/lib/schemas.ts";
import { houseBounds, boundsArea, openingCenter, solidRuns } from "../src/geometry/index.ts";
import {
  roomTable,
  validateExterior,
  validateHouse,
  validateSite,
  validateSiteWall,
} from "../src/geometry/validate.ts";
import { plotRect } from "../src/geometry/index.ts";
import { houseWallSegments, wallColliders } from "../src/components/three/walkGeometry.ts";
import { Matrix4, Vector3 } from "three";
import { PLINTH_H, facadeOf, houseSiting } from "../src/geometry/exterior.ts";
import { heroVillagePlacement } from "../src/geometry/heroVillage.ts";

/* (ฌ) โหมดเดินดู — ใช้ collider ชุดเดียวกับที่ WalkthroughScene ใช้จริง
   เดินทีละ 5 ซม. แบบเลื่อนทีละแกน เหมือนใน Controller */
const BODY_R = 0.28;

/** ชั้นทั้งหมดที่บ้านหลังนี้มี เรียงจากล่างขึ้นบน */
const floorsOf = (house) =>
  [...new Set(house.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);
const onFloor = (house, f) => ({
  rooms: house.rooms.filter((r) => (r.floor ?? 1) === f),
  openings: house.openings.filter((o) => (o.floor ?? 1) === f),
  furniture: house.furniture.filter((x) =>
    house.rooms.some((r) => r.id === x.roomId && (r.floor ?? 1) === f),
  ),
});

function walkReport(house) {
  const segments = houseWallSegments(house.rooms, house.openings);
  const colliders = wallColliders(segments);
  const blocked = (x, z) =>
    colliders.some(
      (r) => x > r.x0 - BODY_R && x < r.x1 + BODY_R && z > r.z0 - BODY_R && z < r.z1 + BODY_R,
    );
  const walk = (from, to, steps = 200) => {
    let x = from.x;
    let z = from.z;
    for (let i = 0; i < steps; i++) {
      const dx = Math.sign(to.x - x) * Math.min(0.05, Math.abs(to.x - x));
      const dz = Math.sign(to.z - z) * Math.min(0.05, Math.abs(to.z - z));
      if (!blocked(x + dx, z)) x += dx;
      if (!blocked(x, z + dz)) z += dz;
      if (Math.hypot(to.x - x, to.z - z) < 0.06) return true;
    }
    return false;
  };

  const issues = [];
  let doors = 0;
  for (const o of house.openings) {
    if (o.kind === "window") continue;
    doors++;
    const c = openingCenter(o);
    const n = o.wallAxis === "x" ? { x: 0, z: 1 } : { x: 1, z: 0 };
    const a = { x: c.x - n.x * 0.9, z: c.z - n.z * 0.9 };
    const b = { x: c.x + n.x * 0.9, z: c.z + n.z * 0.9 };
    if (!walk(a, b) || !walk(b, a)) issues.push("เดินผ่าน " + o.id + " ไม่ได้");
  }

  let pierced = 0;
  let runs = 0;
  for (const seg of segments) {
    const walkable = { ...seg, openings: seg.openings.filter((o) => o.kind !== "window") };
    for (const run of solidRuns(walkable)) {
      if (run.to - run.from < 0.7) continue;
      runs++;
      const mid = (run.from + run.to) / 2;
      const p = seg.axis === "z" ? { x: seg.at - 1.2, z: mid } : { x: mid, z: seg.at - 1.2 };
      const q = seg.axis === "z" ? { x: seg.at + 1.2, z: mid } : { x: mid, z: seg.at + 1.2 };
      if (walk(p, q, 80) || walk(q, p, 80)) pierced++;
    }
  }
  if (pierced > 0) issues.push("เดินทะลุผนังได้ " + pierced + " จุด");

  return { issues, doors, runs };
}

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (name) => JSON.parse(readFileSync(root + "src/data/" + name, "utf8"));

/* zod ตรวจ data ทุกไฟล์ก่อน — สคริปต์นี้รันนำหน้า next build (ดู package.json) */
const houses = houseTypesFileSchema.parse(read("house-types.json"));
const plots = plotsFileSchema.parse(read("plots.json"));
const gallery = galleryFileSchema.parse(read("gallery.json"));
siteSettingsSchema.parse(read("site.json"));

const projects = projectsFileSchema.parse(read("projects.json")).sort((a, b) => a.slot - b.slot);

/* แปลง/แบบบ้านอ้างโครงการที่มีจริง และแปลงใช้แบบบ้านของโครงการเดียวกัน — ตัวตรวจเดียวกับ repo */
const linkIssues = projectLinkIssues(projects, houses, plots);
if (linkIssues.length > 0) {
  for (const m of linkIssues) console.error(m);
  process.exit(1);
}

const byStatus = plots.reduce((a, p) => ({ ...a, [p.status]: (a[p.status] ?? 0) + 1 }), {});
console.log(
  `data ผ่าน zod: ${houses.length} แบบบ้าน · ${plots.length} แปลง ` +
    `(ว่าง ${byStatus.available ?? 0} รอยืนยัน ${byStatus.unconfirmed ?? 0} จอง ${byStatus.reserved ?? 0} ขายแล้ว ${byStatus.sold ?? 0}) · ` +
    `${gallery.length} รูป · ${projects.length} โครงการ ` +
    `(${projects.map((p) => `${p.slot}:${p.status}`).join(" ")})`,
);

const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - [...String(s)].length));
let failed = 0;

for (const house of houses) {
  const floors = floorsOf(house);
  console.log(
    `\n■ ${house.name} (${house.slug}) — ${floors.length} ชั้น` +
      (house.samplePlan ? " · แปลนตัวอย่าง รอแปลนจริงจากผู้พัฒนา" : ""),
  );

  for (const f of floors) {
    const part = onFloor(house, f);
    const bounds = houseBounds(part.rooms);
    const frameW = (bounds.x1 - bounds.x0).toFixed(1);
    const frameD = (bounds.z1 - bounds.z0).toFixed(1);

    console.log(`\n  — ชั้น ${f} · กรอบ ${frameW}×${frameD} ม.`);
    console.log(`  ${pad("ห้อง", 16)}${pad("กว้าง×ลึก", 16)}${pad("พื้นที่", 10)}`);

    let inFrame = 0;
    for (const row of roomTable(part.rooms)) {
      const size = `${row.width.toFixed(2)} × ${row.depth.toFixed(2)}`;
      const note = row.outdoor ? "  (นอกกรอบ)" : "";
      console.log(`  ${pad(row.name, 16)}${pad(size, 16)}${pad(row.area.toFixed(2), 10)}${note}`);
      if (!row.outdoor) inFrame += row.area;
    }
    console.log(
      `  ${pad("รวมในกรอบ", 16)}${pad("", 16)}${pad((Math.round(inFrame * 100) / 100).toFixed(2), 10)}` +
        `  (กรอบ ${boundsArea(bounds).toFixed(2)})`,
    );

    if (part.furniture.length > 0) {
      const LIFE = new Set(["rug", "plant", "floorLamp", "frame", "tree"]);
      console.log(`  ${pad("ห้อง", 16)}${pad("ของทั้งหมด", 14)}${pad("ของมีชีวิต", 14)}รายการ`);
      for (const r of part.rooms) {
        const items = part.furniture.filter((x) => x.roomId === r.id);
        const life = items.filter((x) => LIFE.has(x.kind));
        const flag = items.length >= 2 && life.length >= 2 ? " " : "!";
        console.log(
          `${flag} ${pad(r.name, 16)}${pad(items.length, 14)}${pad(life.length, 14)}${items.map((x) => x.kind).join(", ")}`,
        );
      }
    }

    for (const check of validateHouse(part.rooms, part.openings, part.furniture)) {
      const ok = check.issues.length === 0;
      if (!ok) failed++;
      console.log(`  ${ok ? "✓" : "✗"} ${check.label}`);
      for (const issue of check.issues) console.log(`      → ${issue.message}`);
    }

    const walkRes = walkReport({ rooms: part.rooms, openings: part.openings });
    if (walkRes.issues.length > 0) failed++;
    console.log(
      `  ${walkRes.issues.length === 0 ? "✓" : "✗"} (ฌ) เดินดู: ผ่านประตู ${walkRes.doors} บาน ` +
        `ชนผนัง ${walkRes.runs} ชิ้น`,
    );
    for (const m of walkRes.issues) console.log(`      → ${m}`);
  }

  /* (ฏ) ภายนอกแบบ The Grove — ทุกแปลงจริงที่ใช้แบบนี้ + แปลงมาตรฐานของ diorama */
  {
    const sizes = plots
      .filter((p) => p.houseTypeId === house.id)
      .flatMap((p) => {
        const project = projects.find((q) => q.id === p.projectId);
        if (!project?.plan) return [];
        const r = plotRect(p, project.plan.plotDepthM);
        return [{ width: r.width, depth: r.depth, label: `แปลง ${p.number}` }];
      });
    for (const check of [...validateExterior(house, sizes), ...validateExterior(house, [])]) {
      const ok = check.issues.length === 0;
      if (!ok) failed++;
      console.log(`  ${ok ? "✓" : "✗"} ${check.label}`);
      for (const issue of check.issues) console.log(`      → ${issue.message}`);
    }
  }

  const totalArea = house.rooms
    .filter((r) => !r.outdoor)
    .reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0);
  console.log(
    `\n  รวมทุกชั้น ${(Math.round(totalArea * 100) / 100).toFixed(2)} ตร.ม.` +
      /* แปลนตัวอย่าง: areaSqm คือพื้นที่ที่ผู้พัฒนาประกาศ ไม่ได้มาจากห้องชุดนี้ — ไม่เอามาเทียบกัน
         หน้าเว็บแสดงเฉพาะ areaSqm และติดป้ายแปลนตัวอย่างทุกจุดที่แสดงห้อง */
      (house.samplePlan
        ? ` ของแปลนตัวอย่าง (พื้นที่ที่ผู้พัฒนาประกาศ ${house.areaSqm.toFixed(2)} ไม่ได้มาจากห้องชุดนี้ จึงไม่เทียบกัน)`
        : ` (areaSqm ใน data ${house.areaSqm.toFixed(2)})`),
  );
}

/* ผังตรวจทีละโครงการ — โครงการที่ยังไม่มีผัง (pending) ข้าม และต้องไม่มีแปลง (projectLinkIssues ตรวจแล้ว) */
for (const project of projects) {
  const label = project.name ?? `โครงการที่ ${project.slot}`;
  if (!project.plan) {
    console.log(`\n■ ${label} (${project.slug}, ${project.status}) — ยังไม่มีผัง ข้าม`);
    continue;
  }
  const plan = project.plan;
  const own = plots.filter((p) => p.projectId === project.id);
  console.log(
    `\n■ ผังโครงการ ${label} (${project.slug}, ${project.status}) — ${plan.widthM}×${plan.depthM} ม.`,
  );
  const byStatusLine = own.reduce((a, p) => ({ ...a, [p.status]: (a[p.status] ?? 0) + 1 }), {});
  console.log(
    `  แปลงทั้งหมด ${own.length}${project.pending.plots ? " (ผังแปลงตัวอย่าง)" : ""} — ว่าง ${byStatusLine.available ?? 0}` +
      ` · รอยืนยัน ${byStatusLine.unconfirmed ?? 0} · จอง ${byStatusLine.reserved ?? 0} · ขายแล้ว ${byStatusLine.sold ?? 0}`,
  );
  for (const check of [...validateSite(own, plan), ...validateSiteWall(own, houses, plan)]) {
    const ok = check.issues.length === 0;
    if (!ok) failed++;
    console.log("  " + (ok ? "✓" : "✗") + " " + check.label);
    for (const issue of check.issues) console.log("      → " + issue.message);
  }
  /* (hero-village) ฉากเปิดหน้าแรก: บ้านใน diorama ต้องทับจุดที่หมู่บ้านวางบ้านหลังนั้นพอดี
     เมทริกซ์หมู่บ้านสร้างแบบเดียวกับ plotMatrix (components/three/house/build.ts) — ประกอบกับกลุ่มผกผัน (heroVillage.ts)
     แล้วทุกจุดของแปลงและโรงจอดในพิกัดบ้านต้องกลับมาที่เดิม (คลาดได้ ≤ 2 มม.) · บ้านแฝดไม่ใช้เป็นบ้านพระเอก ข้าม */
  const heroIssues = [];
  for (const p of own) {
    const house = houses.find((h) => h.id === p.houseTypeId);
    if (!house || facadeOf(house).style === "twin") continue;
    const place = heroVillagePlacement(house, p, plan);
    const s = houseSiting(house, place.plotSize);
    const pcx = (s.plot.x0 + s.plot.x1) / 2;
    const pcz = (s.plot.z0 + s.plot.z1) / 2;
    const rot = p.py < plan.roadY0 ? Math.PI : 0;
    const village = new Matrix4()
      .makeTranslation(p.px - plan.widthM / 2, PLINTH_H, p.py - plan.depthM / 2)
      .multiply(new Matrix4().makeRotationY(rot))
      .multiply(new Matrix4().makeTranslation(-pcx, 0, -pcz));
    const group = new Matrix4()
      .makeTranslation(...place.offset)
      .multiply(new Matrix4().makeRotationY(place.rotation));
    const full = group.multiply(village);
    const pts = [
      [s.plot.x0, s.plot.z0],
      [s.plot.x1, s.plot.z1],
      ...(s.carport
        ? [
            [s.carport.x0, s.carport.z0],
            [s.carport.x1, s.carport.z1],
          ]
        : []),
    ];
    for (const [x, z] of pts) {
      const v = new Vector3(x, 0, z).applyMatrix4(full);
      if (Math.hypot(v.x - x, v.z - z) > 0.002 || Math.abs(v.y) > 0.002)
        heroIssues.push(
          `แปลง ${p.number}: จุด (${x}, ${z}) ในพิกัดบ้านไปอยู่ที่ (${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`,
        );
    }
  }
  if (heroIssues.length) failed++;
  console.log(
    `  ${heroIssues.length ? "✗" : "✓"} ฉากเปิดหน้าแรก: บ้านใน diorama ทับตำแหน่งที่หมู่บ้านวางบ้านหลังนั้นพอดีทุกแปลง`,
  );
  for (const m of heroIssues.slice(0, 5)) console.log("      → " + m);
}

if (failed > 0) {
  console.error(`\ngeometry:check ไม่ผ่าน — ${failed} ข้อ`);
  process.exit(1);
}
console.log("\ngeometry:check ผ่านครบทุกข้อ");
