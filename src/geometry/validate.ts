import {
  WALL_M,
  boundsArea,
  boxesOverlap,
  clearanceBox,
  doorGraph,
  furnitureBox,
  houseBounds,
  mm,
  plotRect,
  plotSiting,
  roomArea,
  roomDepth,
  roomWidth,
  walls,
  type GeomFurniture,
  type GeomOpening,
  type GeomPlot,
  type GeomRoom,
} from "./index.ts";
import {
  CAP_BACK_OH,
  CAP_OH,
  EDGE,
  FRAME_PROUD,
  FRAME_T,
  REAR_CLEAR,
  ROOF_CLEAR,
  SITE_WALL_T,
  VILLAGE_LIP,
  crownRadius,
  facadeOf,
  hipOutline,
  hipRidge,
  houseSiting,
  mirrorHouse,
  roofPlan,
  typicalPlot,
  windowSeat,
  type HouseGeom,
  type PlotSize,
} from "./exterior.ts";

export type SitePlanLike = {
  widthM: number;
  depthM: number;
  plotDepthM: number;
  roadY0: number;
  roadY1: number;
  amenities: readonly {
    id: string;
    name: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }[];
};

export type CheckCode =
  | "overlap"
  | "gap"
  | "area"
  | "opening"
  | "reach"
  | "furniture"
  | "plots"
  | "plotPlace"
  | "plotFront"
  | "exterior"
  | "siteWall";

export type Issue = { code: CheckCode; message: string };

export type CheckResult = { code: CheckCode; label: string; issues: Issue[] };

export type RoomRow = {
  name: string;
  width: number;
  depth: number;
  area: number;
  outdoor: boolean;
};

export const DOOR_MIN_M = 0.8;
export const DOOR_MAX_M = 1.2;

export function roomTable(rooms: readonly GeomRoom[]): RoomRow[] {
  return rooms.map((r) => ({
    name: r.name,
    width: roomWidth(r),
    depth: roomDepth(r),
    area: roomArea(r),
    outdoor: r.outdoor,
  }));
}

/** ตาราง cell จากเส้นขอบห้องทุกใบ — ใช้หาทั้งการซ้อนและช่องว่าง */
function gridCells(rooms: readonly GeomRoom[]) {
  const xs = [...new Set(rooms.flatMap((r) => [mm(r.x0), mm(r.x1)]))].sort((a, b) => a - b);
  const zs = [...new Set(rooms.flatMap((r) => [mm(r.z0), mm(r.z1)]))].sort((a, b) => a - b);
  const cells: { x0: number; z0: number; x1: number; z1: number; rooms: GeomRoom[] }[] = [];

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const z0 = zs[j];
      const z1 = zs[j + 1];
      if (x0 === undefined || x1 === undefined || z0 === undefined || z1 === undefined) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      cells.push({
        x0,
        z0,
        x1,
        z1,
        rooms: rooms.filter((r) => r.x0 < cx && cx < r.x1 && r.z0 < cz && cz < r.z1),
      });
    }
  }
  return cells;
}

const at = (x0: number, z0: number, x1: number, z1: number) => `x ${x0}…${x1} · z ${z0}…${z1}`;

export function validateHouse(
  rooms: readonly GeomRoom[],
  openings: readonly GeomOpening[],
  furniture: readonly GeomFurniture[] = [],
): CheckResult[] {
  const inner = rooms.filter((r) => !r.outdoor);
  const bounds = houseBounds(rooms);
  const cells = gridCells(inner);

  // (ก) ห้องในกรอบห้ามซ้อนกัน
  const overlap: Issue[] = cells
    .filter((c) => c.rooms.length > 1)
    .map((c) => ({
      code: "overlap" as const,
      message: `${c.rooms.map((r) => r.name).join(" ซ้อน ")} ที่ ${at(c.x0, c.z0, c.x1, c.z1)}`,
    }));

  // (ข) ห้ามมีช่องว่างในกรอบบ้าน
  const gap: Issue[] = cells
    .filter((c) => c.rooms.length === 0)
    .map((c) => ({
      code: "gap" as const,
      message: `ช่องว่างในกรอบที่ ${at(c.x0, c.z0, c.x1, c.z1)}`,
    }));

  // (ค) ผลรวมพื้นที่ห้องในกรอบ = พื้นที่กรอบบ้านเป๊ะ
  const sum = Math.round(inner.reduce((s, r) => s + roomArea(r), 0) * 100) / 100;
  const frame = boundsArea(bounds);
  const area: Issue[] =
    sum === frame
      ? []
      : [
          {
            code: "area",
            message: `ผลรวมพื้นที่ห้อง ${sum.toFixed(2)} ตร.ม. ไม่เท่ากับกรอบบ้าน ${frame.toFixed(2)} ตร.ม. (ต่าง ${(sum - frame).toFixed(2)})`,
          },
        ];

  // (ง) ทุก opening อยู่บนผนังจริง และประตูกว้าง 0.8–1.2 ม.
  const segments = walls(rooms, openings);
  const opening: Issue[] = [];
  for (const o of openings) {
    const onWall = segments.some((s) => s.openings.some((so) => so.id === o.id));
    if (!onWall) {
      opening.push({
        code: "opening",
        message: `${o.id} ไม่ได้อยู่บนผนังจริง (แนว ${o.wallAxis} ที่ ${o.at} ช่วง ${o.from}…${o.to})`,
      });
    }
    const width = mm(o.to - o.from);
    if (width < DOOR_MIN_M || width > DOOR_MAX_M) {
      opening.push({
        code: "opening",
        message: `${o.id} กว้าง ${width.toFixed(2)} ม. นอกช่วง ${DOOR_MIN_M}–${DOOR_MAX_M} ม.`,
      });
    }
  }

  // (จ) ทุกห้องในกรอบเดินถึงทางเข้าได้ผ่าน opening
  const reach: Issue[] = [];
  const entries = openings.filter((o) => o.kind === "entry");
  const stairs = rooms.filter((r) => r.stair);
  if (entries.length === 0 && stairs.length === 0) {
    reach.push({
      code: "reach",
      message: "ชั้นนี้ไม่มีทั้งทางเข้าบ้านและห้องบันได — หาจุดตั้งต้นไม่ได้",
    });
  } else {
    /* ชั้นล่างตั้งต้นที่ทางเข้าบ้าน ชั้นบนตั้งต้นที่หัวบันได */
    const start = new Set<string>(entries.length === 0 ? stairs.map((r) => r.id) : []);
    for (const e of entries) {
      for (const s of segments) {
        if (!s.openings.some((o) => o.id === e.id)) continue;
        if (s.roomMinus) start.add(s.roomMinus);
        if (s.roomPlus) start.add(s.roomPlus);
      }
    }
    const graph = doorGraph(rooms, openings);
    const seen = new Set<string>(start);
    const queue = [...start];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) break;
      for (const next of graph.get(id) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    for (const r of inner) {
      if (!seen.has(r.id)) {
        reach.push({ code: "reach", message: `${r.name} เดินถึงทางเข้าไม่ได้` });
      }
    }
  }

  /* (ฉ-ช) เฟอร์นิเจอร์ต้องอยู่ในห้องตัวเอง (ไม่จมผนัง) และไม่ขวางช่องเปิด */
  const furnitureIssues: Issue[] = [];
  const inset = WALL_M / 2;
  for (const f of furniture) {
    const room = rooms.find((r) => r.id === f.roomId);
    if (!room) {
      furnitureIssues.push({
        code: "furniture",
        message: `${f.id} อ้างห้อง "${f.roomId}" ที่ไม่มีอยู่`,
      });
      continue;
    }
    const box = furnitureBox(f);
    const limit = {
      x0: mm(room.x0 + inset),
      z0: mm(room.z0 + inset),
      x1: mm(room.x1 - inset),
      z1: mm(room.z1 - inset),
    };
    if (box.x0 < limit.x0 || box.z0 < limit.z0 || box.x1 > limit.x1 || box.z1 > limit.z1) {
      furnitureIssues.push({
        code: "furniture",
        message:
          `${f.id} ล้นออกนอกห้อง ${room.name} — กล่อง x ${box.x0}…${box.x1} z ${box.z0}…${box.z1} ` +
          `แต่ขอบในห้องคือ x ${limit.x0}…${limit.x1} z ${limit.z0}…${limit.z1}`,
      });
    }
    for (const o of openings) {
      if (o.kind === "window") continue;
      const clear = clearanceBox(room, o);
      if (clear && boxesOverlap(box, clear)) {
        furnitureIssues.push({
          code: "furniture",
          message: `${f.id} ขวางทางเข้าออกของ ${o.id} ในห้อง ${room.name}`,
        });
      }
    }
  }

  return [
    { code: "overlap", label: "(ก) ห้องในกรอบไม่ซ้อนกัน", issues: overlap },
    { code: "gap", label: "(ข) ไม่มีช่องว่างในกรอบบ้าน", issues: gap },
    { code: "area", label: `(ค) ผลรวมพื้นที่ = กรอบบ้าน ${frame.toFixed(1)} ตร.ม.`, issues: area },
    { code: "opening", label: "(ง) opening อยู่บนผนังจริง และกว้าง 0.8–1.2 ม.", issues: opening },
    { code: "reach", label: "(จ) ทุกห้องเดินถึงทางเข้าได้", issues: reach },
    {
      code: "furniture",
      label: `(ฉ) เฟอร์นิเจอร์อยู่ในห้องตัวเองและไม่ขวางประตู (${furniture.length} ชิ้น)`,
      issues: furnitureIssues,
    },
  ];
}

/**
 * ตรวจผังโครงการ — แปลงห้ามซ้อนกัน ห้ามล้นผัง ห้ามทับถนนหรือพื้นที่ส่วนกลาง
 * (ผังใช้พิกัด x,y เป็นเมตร คนละระบบกับ x,z ของแปลนบ้าน)
 */
export function validateSite(plots: readonly GeomPlot[], plan: SitePlanLike): CheckResult[] {
  const rects = plots.map((p) => ({ plot: p, box: plotRect(p, plan.plotDepthM) }));
  const toBox = (r: { x0: number; y0: number; x1: number; y1: number }) => ({
    x0: r.x0,
    z0: r.y0,
    x1: r.x1,
    z1: r.y1,
  });

  const overlaps: Issue[] = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (!a || !b) continue;
      if (boxesOverlap(toBox(a.box), toBox(b.box))) {
        overlaps.push({
          code: "plots",
          message: `แปลง ${a.plot.number} ซ้อนกับ ${b.plot.number}`,
        });
      }
    }
  }

  const road = { x0: 0, z0: plan.roadY0, x1: plan.widthM, z1: plan.roadY1 };
  const place: Issue[] = [];
  for (const { plot, box } of rects) {
    if (box.x0 < 0 || box.y0 < 0 || box.x1 > plan.widthM || box.y1 > plan.depthM) {
      place.push({
        code: "plotPlace",
        message: `แปลง ${plot.number} ล้นออกนอกผัง (x ${box.x0}…${box.x1} y ${box.y0}…${box.y1} · ผัง ${plan.widthM}×${plan.depthM})`,
      });
    }
    if (boxesOverlap(toBox(box), road)) {
      place.push({ code: "plotPlace", message: `แปลง ${plot.number} ทับถนน` });
    }
    for (const a of plan.amenities) {
      if (boxesOverlap(toBox(box), toBox(a))) {
        place.push({ code: "plotPlace", message: `แปลง ${plot.number} ทับ${a.name}` });
      }
    }
  }

  return [
    { code: "plots", label: `(ช) แปลงไม่ซ้อนกัน (${plots.length} แปลง)`, issues: overlaps },
    { code: "plotPlace", label: "(ซ) แปลงอยู่ในผัง ไม่ทับถนนและส่วนกลาง", issues: place },
    /* รายการแปลงบอกทิศจากด้านที่ติดถนน — แปลงที่ไม่ติดถนนจะไม่มีทิศให้บอก */
    {
      code: "plotFront",
      label: "(ฎ) ทุกแปลงติดถนน บอกทิศหน้าแปลนได้",
      issues: plots
        .filter((p) => plotSiting(p, plots, plan).front === null)
        .map((p) => ({
          code: "plotFront" as const,
          message: `แปลง ${p.number} ไม่มีด้านไหนติดถนน`,
        })),
    },
  ];
}

/**
 * (ฏ) ภายนอกบ้าน (exterior.ts) — จั่วกว้างพอ และทุกแปลงที่ใช้แบบนี้วางบ้าน โรงจอด ชาน ทางเดิน รั้ว ลงในแปลงได้จริง
 * แปลง = ขนาดแปลงจริงจากผัง (หรือแปลงมาตรฐานของ diorama เมื่อไม่ส่ง)
 * บ้านแฝด: ด้านผนังร่วมชิดเส้นแปลงได้ (ไม่มีแถบขอบแปลงด้านนั้น)
 */
export function validateExterior(
  house: HouseGeom & { furniture: readonly GeomFurniture[] },
  plots: readonly (PlotSize & { label: string })[],
): CheckResult[] {
  const { rooms, openings, furniture } = house;
  const issues: Issue[] = [];
  const plan = roofPlan(house);
  const f = facadeOf(house);
  const w = plan.gable;
  const gw = mm(w.x1 - w.x0);
  if (gw < 2.5) issues.push({ code: "exterior", message: `จั่ว x ${w.x0}…${w.x1} แคบกว่า 2.5 ม.` });
  /* สัดส่วนตามภาพอ้างอิง: จั่วไม่กว้างเกิน gableWidthMax · ยอดจั่วเด่น — สันปั้นหยาต่ำกว่ายอดจั่ว ≥ 1 ม. และต่ำกว่าเชิงจั่ว + 0.6 ม. */
  if (gw > f.gableWidthMax + 1e-6)
    issues.push({
      code: "exterior",
      message: `จั่วกว้าง ${gw} ม. เกิน gableWidthMax ${f.gableWidthMax} ม.`,
    });
  const ridge = hipRidge(plan.hip).y;
  if (ridge > w.apex - 1)
    issues.push({
      code: "exterior",
      message: `สันปั้นหยา ${mm(ridge)} ม. ไม่ต่ำกว่ายอดจั่ว ${w.apex} ม. ถึง 1 ม.`,
    });
  if (ridge > w.knee + 0.6)
    issues.push({
      code: "exterior",
      message: `สันปั้นหยา ${mm(ridge)} ม. สูงกว่าเชิงจั่ว ${w.knee} ม. เกิน 0.6 ม. (หลังคาหลักแย่งจั่ว)`,
    });
  /* เสากรอบจั่วไม่บังช่องเปิดผนังหน้า (บ้านแฝด: เสาฝั่งในเริ่มที่ระดับพื้นชั้นสอง) */
  for (const o of openings) {
    if (o.wallAxis !== "x" || mm(o.at) !== mm(plan.bounds.z0)) continue;
    const legs = [
      { x0: w.x0 - FRAME_T, x1: w.x0, inner: !w.outerX0 },
      { x0: w.x1, x1: w.x1 + FRAME_T, inner: !w.outerX1 },
    ];
    for (const l of legs) {
      if (plan.style === "twin" && l.inner && (o.floor ?? 1) === 1) continue;
      if (o.from < l.x1 - 1e-6 && l.x0 < o.to - 1e-6)
        issues.push({
          code: "exterior",
          message: `เสากรอบจั่ว x ${mm(l.x0)}…${mm(l.x1)} บัง ${o.id}`,
        });
    }
  }
  const sizes = plots.length > 0 ? plots : [{ ...typicalPlot(house), label: "แปลงมาตรฐาน" }];
  for (const p of sizes) {
    const s = houseSiting(house, p);
    const inner = {
      x0: s.plot.x0 + (s.party === "x-" ? 0 : EDGE) - 1e-6,
      z0: s.plot.z0 + EDGE - 1e-6,
      x1: s.plot.x1 - (s.party === "x+" ? 0 : EDGE) + 1e-6,
      z1: s.plot.z1 - EDGE + 1e-6,
    };
    const inside = (r: { x0: number; z0: number; x1: number; z1: number }) =>
      r.x0 >= inner.x0 && r.z0 >= inner.z0 && r.x1 <= inner.x1 && r.z1 <= inner.z1;
    const parts: [string, { x0: number; z0: number; x1: number; z1: number } | null][] = [
      ["ตัวบ้าน", s.plinth],
      ["ชาน", s.porch],
      ["ขั้นบันได", s.steps],
      ["โรงจอดรถ", s.carport],
      ["ทางรถ", s.driveway],
      ["ลานกรวด", s.yard],
      ...s.stones.map((r, i) => [`หินทางเดิน ${i + 1}`, r] as [string, typeof r]),
      ...(s.fence?.runs ?? []).map(
        (r, i) =>
          [`รั้ว ${i + 1}`, { x0: r.x0, z0: s.fence?.z0 ?? 0, x1: r.x1, z1: s.fence?.z1 ?? 0 }] as [
            string,
            { x0: number; z0: number; x1: number; z1: number },
          ],
      ),
    ];
    for (const [name, r] of parts) {
      if (r && !inside(r))
        issues.push({ code: "exterior", message: `${p.label}: ${name} ล้นแถบขอบแปลง` });
    }
    /* ทางเดินตรงออกจากขั้นบันได กว้างเท่าบันได: แนวกรวด x = บันได (±1 ซม.) ต่อจากหน้าขั้นล่างสุด
       แผ่นหินทุกแผ่นกลางแกนบันได (±1 ซม.) · ประตูรั้วแกนเดียวกัน กว้างเท่าทางเดิน */
    {
      const sc = (s.steps.x0 + s.steps.x1) / 2;
      const off = (a: number, b: number) => Math.abs(a - b) > 0.01;
      if (
        off(s.gravel.x0, s.steps.x0) ||
        off(s.gravel.x1, s.steps.x1) ||
        off(s.gravel.z1, s.steps.z0)
      )
        issues.push({ code: "exterior", message: `${p.label}: แนวกรวดทางเดินไม่ตรงขอบขั้นบันได` });
      for (const r of s.stones)
        if (off((r.x0 + r.x1) / 2, sc))
          issues.push({
            code: "exterior",
            message: `${p.label}: แผ่นหินที่ z ${r.z0} ไม่อยู่กลางแกนบันได (${mm(sc)})`,
          });
      const gate = s.fence?.runs.find((r) => r.kind === "gate");
      if (gate && (off(gate.x0, s.steps.x0) || off(gate.x1, s.steps.x1)))
        issues.push({ code: "exterior", message: `${p.label}: ประตูรั้วไม่ตรงทางเดิน` });
    }
    if (s.carport && boxesOverlap(s.carport, s.plinth))
      issues.push({ code: "exterior", message: `${p.label}: โรงจอดรถทับตัวบ้าน` });
    /* โรงจอด: อยู่ในแปลง (ด้านข้าง) หรือในระยะถอยหน้า (หน้าผนังบ้าน) · ไม่ทับกรอบจั่ว · เสาไม่ตั้งบนทางเดิน บันได ชาน */
    if (s.carport) {
      const c = s.carport;
      const beside = c.x1 <= s.plinth.x0 + 1e-6 || c.x0 >= s.plinth.x1 - 1e-6;
      const front = c.z1 <= s.plinth.z0 - WALL_M / 2 + 1e-6;
      if (!beside && !front)
        issues.push({
          code: "exterior",
          message: `${p.label}: โรงจอดไม่อยู่ข้างบ้านหรือระยะถอยหน้า`,
        });
      /* กรอบจั่ว: บ้านเดี่ยวห้ามทับ · บ้านแฝด (ภาพอ้างอิง) แผ่นยื่นเลยเสาในของกรอบได้ ≤ 1 ม. (เสาในเริ่มเหนือแผ่น) */
      const fx0 = w.x0 - FRAME_T;
      const fx1 = w.x1 + FRAME_T;
      const over = Math.min(c.x1, fx1) - Math.max(c.x0, fx0);
      if (over > (plan.style === "twin" ? FRAME_T + 1 : 0) + 1e-6)
        issues.push({
          code: "exterior",
          message: `${p.label}: หลังคาโรงจอดทับกรอบจั่ว ${mm(over)} ม.`,
        });
      if (c.posts.length === 0)
        issues.push({ code: "exterior", message: `${p.label}: โรงจอดไม่มีเสา` });
      for (const post of c.posts) {
        if (!inside(post))
          issues.push({ code: "exterior", message: `${p.label}: เสาโรงจอดล้นแถบขอบแปลง` });
        for (const [name, r] of [
          ["ทางเดิน", s.gravel],
          ["ขั้นบันได", s.steps],
          ["ชาน", s.porch],
        ] as const)
          if (boxesOverlap(post, r))
            issues.push({
              code: "exterior",
              message: `${p.label}: เสาโรงจอดที่ x ${post.x0} ตั้งบน${name}`,
            });
      }
    }
    if (s.fence && s.driveway) {
      const d = s.driveway;
      if (s.fence.runs.some((r) => r.x0 < d.x1 && d.x0 < r.x1))
        issues.push({ code: "exterior", message: `${p.label}: รั้วขวางทางรถ` });
    }
    /* เรือนยอดต้นไม้ต้องไม่ทับหลังคา (กรอบบ้านทุกชั้น + ชายคา/กรอบจั่ว) และไม่ล้นแปลงไปทับบ้านข้างเคียง */
    const roof = houseBounds(rooms);
    for (const t of s.trees) {
      const cr = crownRadius(t.h);
      const dx = Math.max(roof.x0 - ROOF_CLEAR - t.x, 0, t.x - roof.x1 - ROOF_CLEAR);
      const dz = Math.max(roof.z0 - ROOF_CLEAR - t.z, 0, t.z - roof.z1 - ROOF_CLEAR);
      if (dx * dx + dz * dz < cr * cr)
        issues.push({
          code: "exterior",
          message: `${p.label}: เรือนยอดต้นไม้ที่ x ${t.x} z ${t.z} ทับหลังคา`,
        });
      if (
        t.x - cr < s.plot.x0 - 1e-6 ||
        t.x + cr > s.plot.x1 + 1e-6 ||
        t.z - cr < s.plot.z0 - 1e-6 ||
        t.z + cr > s.plot.z1 + 1e-6
      )
        issues.push({
          code: "exterior",
          message: `${p.label}: เรือนยอดต้นไม้ที่ x ${t.x} z ${t.z} ล้นแปลง`,
        });
    }
    if (s.driveway && (boxesOverlap(s.driveway, s.porch) || boxesOverlap(s.driveway, s.steps)))
      issues.push({ code: "exterior", message: `${p.label}: ทางรถทับชานหน้าบ้าน` });
  }
  const seat = windowSeat(rooms, openings, furniture, boxesOverlap, clearanceBox);
  const carports = sizes.filter((p) => houseSiting(house, p).carport !== null).length;
  return [
    {
      code: "exterior",
      label:
        `(ฏ) ภายนอก (${plan.style}): จั่วหน้า ${gw} ม. (≤ ${f.gableWidthMax}) ${w.pitch}° ลึก ${mm(w.z1 - w.z0)} ม. ` +
        `เชิงจั่ว ${w.knee} ยอด ${w.apex} · ปั้นหยา ${plan.hip.pitch}° สัน ${mm(ridge)} ม.` +
        `${plan.party ? ` · ผนังร่วม ${plan.party}` : ""} · ` +
        `ลงแปลงได้ ${sizes.length} แปลง (มีโรงจอด ${carports})` +
        (seat ? ` · ที่นั่งริมหน้าต่างที่ ${seat.windowId}` : ""),
      issues,
    },
  ];
}

/**
 * (ฐ) กำแพงโครงการ — กำแพงตั้งบนเส้นเขตผัง ด้านนอกแปลง (เส้นเขต → เส้นเขต + SITE_WALL_T) บนฐานหมู่บ้าน
 * ตัวบ้าน ชายคาปั้นหยา หลังคา/กรอบจั่ว โรงจอด และเรือนยอดต้นไม้ของทุกแปลง (houseSiting ตัวเดียวกับฉาก 3D)
 * ต้องอยู่ในเขตผังหักระยะ max(REAR_CLEAR, SITE_WALL_T) ทุกด้าน — ไม่มีชิ้นไหนแตะหรือทะลุกำแพง
 * แปลงแถวเหนือถนนหมุน 180° แบบ MasterPlanScene · บ้านแฝดตรวจทั้งทิศ data และทิศสะท้อน
 */
export function validateSiteWall(
  plots: readonly (GeomPlot & { houseTypeId: string })[],
  houses: readonly (HouseGeom & { id: string })[],
  plan: SitePlanLike,
): CheckResult[] {
  const issues: Issue[] = [];
  const clear = Math.max(REAR_CLEAR, SITE_WALL_T);
  if (SITE_WALL_T >= VILLAGE_LIP)
    issues.push({
      code: "siteWall",
      message: `กำแพงหนา ${SITE_WALL_T} ม. ไม่พอดีบนฐานที่ยื่น ${VILLAGE_LIP} ม.`,
    });
  let checked = 0;
  for (const p of plots) {
    const house = houses.find((h) => h.id === p.houseTypeId);
    if (!house) continue;
    const r = plotRect(p, plan.plotDepthM);
    const k = p.py < plan.roadY0 ? -1 : 1;
    const shapes = facadeOf(house).style === "twin" ? [house, mirrorHouse(house)] : [house];
    for (const h of shapes) {
      const s = houseSiting(h, { width: r.width, depth: r.depth });
      const roof = roofPlan(h);
      const g = roof.gable;
      const pcx = (s.plot.x0 + s.plot.x1) / 2;
      const pcz = (s.plot.z0 + s.plot.z1) / 2;
      const parts: [string, { x0: number; z0: number; x1: number; z1: number } | null][] = [
        ["ตัวบ้าน", s.plinth],
        ["ชายคาปั้นหยา", hipOutline(roof.hip)],
        [
          "หลังคาจั่ว",
          {
            x0: g.x0 - FRAME_T - CAP_OH,
            z0: g.z0 - FRAME_PROUD - FRAME_T,
            x1: g.x1 + FRAME_T + CAP_OH,
            z1: g.z1 + CAP_BACK_OH,
          },
        ],
        ["โรงจอดรถ", s.carport],
        ...s.trees.map((t): [string, { x0: number; z0: number; x1: number; z1: number }] => {
          const cr = crownRadius(t.h);
          return [
            `เรือนยอดต้นไม้ที่ x ${t.x} z ${t.z}`,
            { x0: t.x - cr, z0: t.z - cr, x1: t.x + cr, z1: t.z + cr },
          ];
        }),
      ];
      for (const [name, q] of parts) {
        if (!q) continue;
        checked++;
        const xs = [p.px + k * (q.x0 - pcx), p.px + k * (q.x1 - pcx)];
        const ys = [p.py + k * (q.z0 - pcz), p.py + k * (q.z1 - pcz)];
        const gap = Math.min(
          Math.min(...xs),
          Math.min(...ys),
          plan.widthM - Math.max(...xs),
          plan.depthM - Math.max(...ys),
        );
        if (
          gap < clear - 1e-6 &&
          !issues.some((i) => i.message.startsWith(`แปลง ${p.number}: ${name} `))
        )
          issues.push({
            code: "siteWall",
            message: `แปลง ${p.number}: ${name} ห่างเส้นเขต/กำแพงโครงการ ${mm(gap)} ม. (ต้อง ≥ ${clear})`,
          });
      }
    }
  }
  return [
    {
      code: "siteWall",
      label: `(ฐ) ไม่มีบ้าน ชายคา หลังคา โรงจอด หรือเรือนยอดต้นไม้แตะกำแพงโครงการ — ห่างเส้นเขต ≥ ${clear} ม. (${checked} ชิ้น)`,
      issues,
    },
  ];
}
