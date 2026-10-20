/* พาเลตต์วัสดุ 3D — DESIGN-SPEC §5 เท่านั้น
   นี่คือไฟล์เดียวในโปรเจกต์ที่มี hex ของโลก 3D ได้ (สี UI ยังอยู่ที่ globals.css ที่เดียวเหมือนเดิม)
   ทุกค่าในไฟล์นี้มีชื่อและค่าเดียวกันอยู่ในตาราง §5 — แก้ที่นี่ต้องแก้ที่ spec ด้วย */

export const M3D = {
  woodDark: "#8A6F52",
  woodLight: "#C9A06B",
  wallInner: "#F3EDE2",
  wallAccent: "#7FA68F",
  fabricSage: "#7D9D77",
  fabricWarm: "#D9A45B",
  ceramic: "#F7F5EF",
  /** สีที่เงาสัมผัสพื้นและ AO ไล่เข้าหา — ดำอมเขียวเป็นกลาง ไม่ผูกกับ ink ของ UI อีกแล้ว
      (ink เปลี่ยนเป็นมะกอกเข้มตอนรีแบรนด์ — AO สีมะกอกจะย้อมเงาทั้งฉากเป็นเขียว) */
  shade: "#0E1310",

  /* ── ภายนอกบ้าน The Grove (เพิ่ม 2026-10-02) ──
     ค่าที่ใช้คู่กับ texture รายละเอียด (ไฟล์ *_color ที่เป็นภาพขาวดำ) คือสีจริงของผิว
     ส่วน oak/floor เป็นสีคูณบนภาพไม้จริง จึงเกือบขาว */
  /** ผนังฉาบภายนอกสีขาว */
  render: "#F4F2EC",
  /** กรอบจั่ว ครอบสัน รางน้ำ ขอบหลังคาโรงจอด แถบฐานบ้าน เสาไฟ — เทาเข้มแบบภาพบ้านจริง */
  fascia: "#5E6365",
  /** วงกบหน้าต่าง/ประตูกระจก อะลูมิเนียมสีดำ (ภาพบ้านจริงทุกโครงการ) */
  frameDark: "#2B2E2F",
  /** กระเบื้องหลังคาคอนกรีตเทากลาง (ภาพอ้างอิง: เทากลางไม่ใช่เกือบดำ — หลังคาไม่แย่งจั่ว) */
  roofTile: "#8E9091",
  /** วงกบอะลูมิเนียม ราวกันตก เสาโรงจอดรถ */
  frameWhite: "#F1F0EB",
  /** กระจก (ทึบ ใช้กับบ้านที่ปิดหลังคาแล้ว) */
  glass: "#2F3D3C",
  /** ฐานบ้าน ขั้นบันได แผ่นหินทางเดิน ขอบคันหิน */
  concrete: "#B6B2A8",
  /** ทางเท้าและทางรถในแปลง */
  paving: "#CFCAC0",
  asphalt: "#575B5B",
  /** กรวดขาวข้างทางเดิน */
  gravel: "#E6E1D5",
  /** ลานกรวดดำหน้าบ้าน (ภาพอ้างอิง) */
  gravelDark: "#4E5052",
  /** สนามหญ้า — เขียวมะกอกสดตามโทนแบรนด์ */
  lawn: "#7A9450",
  /** พุ่มไม้ตัดแต่งริมแปลง */
  hedge: "#4E6A33",
  /** ใบไม้สามโทน: ใบปกติ ใบเข้ม และต้นใบเหลือง */
  foliage: "#7FA04F",
  foliageDeep: "#5B7838",
  foliageGold: "#C9A53E",
  bark: "#6E5A46",
  /** สีคูณบนภาพไม้โอ๊ก (ระแนง ไม้ผนัง บิวท์อิน) และไม้พื้น */
  oakTint: "#FFF3E2",
  floorTint: "#FFF7EC",
  /** สระน้ำคลับเฮาส์ */
  water: "#6F9C98",
  /** แถบสถานะรอบแปลงในหมู่บ้าน — ต้องตัดกับสนามเขียว: ว่าง = ครีมสว่าง · จอง = ไม้ส้ม · ขายแล้ว = เทาเข้ม */
  plotAvailable: "#F3EFE2",
  plotReserved: "#C98A3E",
  plotSold: "#5C5F60",
  /** ผ้าม่านโปร่ง / แสงทะลุผ้า / กระจกบานในบ้าน */
  sheer: "#FBF8F2",
  sheerGlow: "#FFF4E2",
  pane: "#DDE6E4",
} as const;

/** ไฟล์ *_color ของผิวที่ไม่มีสีในตัว (สนาม หลังคา ปูน ถนน) เก็บเป็นความสว่างเชิงเส้นเฉลี่ย 0.75
    สีของวัสดุจึงคูณกลับ 1/0.75 ให้ค่าเฉลี่ยบนจอตรงกับ token */
export const DETAIL_GAIN = 1 / 0.75;

/** ความหยาบของผิวแต่ละชนิด (§5 ตาราง material) — metalness 0 ทุกชนิด
    ผนังและผ้าด้านสนิท · ไม้พื้นต่ำลงให้รับเงาสะท้อนของแสงรอบตัว (แก้ "พื้นส้มแบน")
    เซรามิกเคลือบต่ำสุดเพื่อให้สุขภัณฑ์อ่านออกว่าเป็นของเคลือบ ไม่ใช่ดินน้ำมัน */
export const ROUGH = {
  plaster: 0.92,
  fabric: 0.96,
  timber: 0.74,
  timberFloor: 0.6,
  ceramic: 0.34,
  board: 0.86,
  foliage: 0.9,
} as const;

/* สีแถบสถานะรอบแปลงในหมู่บ้าน 3D — ต้องมี legend คำกำกับคู่เสมอ (§1 ห้ามสื่อด้วยสีอย่างเดียว)
   (ชื่อ PLOT_LAWN คงไว้เพราะ legend ฝั่ง DOM import ชื่อนี้ — ตอนนี้สนามเป็นหญ้าจริงทุกแปลง สถานะอยู่ที่แถบขอบแปลง)
   อยู่ที่นี่ไม่ใช่ใน MasterPlanScene เพราะ legend ฝั่ง DOM ต้อง import ได้โดยไม่ลาก three มาด้วย */
export const PLOT_LAWN = {
  available: M3D.plotAvailable,
  /** รอยืนยันสถานะ — ปูนเทาอ่อน (สีปูนในฉากที่มีอยู่แล้ว ไม่ใช่สีใหม่) ไม่ปนกับครีมของ "ว่าง" หรือเทาเข้มของ "ขายแล้ว" */
  unconfirmed: M3D.concrete,
  reserved: M3D.plotReserved,
  sold: M3D.plotSold,
} as const;

/* แสง §5 — สีคงเดิม ความเข้มปรับใหม่เมื่อเพิ่มแสงอ้อมจาก Environment (2026-10-02)
   hemisphere ลดลงเพราะ env รับหน้าที่แสงรอบตัวแทน · แดดแรงขึ้นให้เงาอ่านออก */
export const LIGHT = {
  hemiSky: "#FFF3E0",
  hemiGround: "#9AA78C",
  hemiIntensity: 0.15,
  sun: "#FFE9C4",
  sunIntensity: 2.1,
  windowSpot: "#FFB870",
  windowSpotIntensity: 0.4,
  /** ความแรงของแสงอ้อมจาก HDRI ฟ้า (scene.environmentIntensity) — ดวงอาทิตย์ถูกตัดออกจากไฟล์แล้ว
      ดวงเดียวในฉากคือ directional light ที่หมุนตามเวลา */
  envIntensity: 1,
  /** exposure ของ NeutralToneMapping */
  exposure: 1,
} as const;

/** เงาจากแดด — PCF + radius (three r186 ตัด PCFSoft ทิ้งแล้ว ความนุ่มมาจาก radius แทน)
    blurSamples มีผลเฉพาะ VSM แต่ตั้งไว้ให้ค่าครบถ้าวันหนึ่งสลับชนิดเงา */
export const SHADOW = {
  radius: 3.5,
  blurSamples: 12,
  normalBias: 0.025,
  mapDesktop: 2048,
  mapMobile: 1024,
} as const;

/* ตำแหน่งดวงอาทิตย์ตามเวลา 06:00-18:00
   §5 ล็อกสีของแสงไว้ — ตัวนี้เปลี่ยนแค่ "ทิศ" ซึ่ง spec ไม่ได้กำหนด
   northDeg = 0: ขึ้นทางตะวันออก (+x) ผ่านทิศใต้ (-z) ตอนเที่ยง ตกทางตะวันตก (-x)
   northDeg ของแบบบ้าน (องศาตามเข็มนาฬิกาจากด้านบนของแปลน = +z) หมุนทิศทั้งชุดตาม
   แปลน 2D ฉาก 3D โหมดเดินดู และแผนภาพแดด จึงชี้ทิศเดียวกันเสมอ */
export function sunPosition(hour: number, radius = 20, northDeg = 0): [number, number, number] {
  const t = Math.min(1, Math.max(0, (hour - 6) / 12));
  const az = ((90 + 180 * t + northDeg) * Math.PI) / 180;
  const el = ((6 + 58 * Math.sin(Math.PI * t)) * Math.PI) / 180;
  return [
    radius * Math.cos(el) * Math.sin(az),
    radius * Math.sin(el),
    radius * Math.cos(el) * Math.cos(az),
  ];
}

/** กล้อง isometric ตาม §5: azimuth 45°, elevation ~35° (ค่าเริ่มต้นมองจากหน้าบ้านฝั่งซ้าย) */
export const CAMERA = {
  azimuthDeg: 225,
  elevationDeg: 35,
  radius: 40,
} as const;

/** กล้องเดินดู (§5): สายตา 1.60 ม. กล้องได้ระดับ
    จอแนวนอนใช้มุมแนวตั้ง 48° (≈ เลนส์ 27 มม. full-frame) · จอแนวตั้งตรึงมุมแนวนอนไว้ 62°
    แล้วคำนวณมุมแนวตั้งกลับ โดยไม่เกิน 80° · lensShift เลื่อนกรอบลงแทนการก้มกล้อง เส้นตั้งจึงยังตั้งตรง */
export const WALK_LENS = {
  eyeH: 1.6,
  vfovLandscape: 48,
  hfovPortrait: 62,
  vfovMax: 80,
  lensShift: 0.08,
} as const;

/** มุมแนวตั้งของกล้องเดินดูตามสัดส่วนจอ */
export function walkVfov(aspect: number): number {
  const landscape = WALK_LENS.vfovLandscape;
  const rad = Math.PI / 180;
  /* มุมแนวนอนที่ได้จาก 48° บนจอนี้ — ถ้ายังกว้างกว่ามุมที่ตรึงไว้ แปลว่าจอกว้างพอ ใช้ 48° ตรงๆ */
  const h = 2 * Math.atan(Math.tan((landscape * rad) / 2) * aspect);
  if (h / rad >= WALK_LENS.hfovPortrait) return landscape;
  const v = (2 * Math.atan(Math.tan((WALK_LENS.hfovPortrait * rad) / 2) / aspect)) / rad;
  return Math.min(WALK_LENS.vfovMax, Math.max(landscape, v));
}

/** zoom (px ต่อเมตร) ที่ทำให้กล่องหนึ่งพอดีกรอบในมุม isometric จริง — ไม่ใช่เดาจากด้านที่ยาวที่สุด
    กว้างบนจอ = (W+D)·cos45 · สูงบนจอ = (W+D)·cos45·sin(el) + ความสูงกล่อง
    อยู่ที่นี่เพราะฉากหน้าแรกฝั่ง DOM ต้องคำนวณค่าเดียวกันเพื่อวางผัง 2D ให้ทับหมู่บ้าน 3D พอดี */
export function isoFitZoom(
  box: { w: number; d: number; h: number },
  width: number,
  height: number,
): number {
  const el = (CAMERA.elevationDeg * Math.PI) / 180;
  const spread = (box.w + box.d) * Math.cos(Math.PI / 4);
  return 0.96 * Math.min(width / spread, height / (spread * Math.sin(el) + box.h));
}

/* ── Mood studio (หน้าแบบบ้าน โหมด Isometric — 2026-10-20) ─────────────────────
   แคตตาล็อกวัสดุที่ผู้ชมสลับได้บนพื้น ผนัง ผนังเด่น โซฟา เตียง พรม + ชุดบรรยากาศ 3 ชุด + แสงตามเวลา
   ไฟล์นี้ไม่ import three — ฝั่ง DOM (แผงเลือกวัสดุ) import ค่าชุดเดียวกับฉากได้
   chip = สีที่ตาเห็นบนจอ (ใช้วาดชิปในแผง) · tint = สีคูณบน texture (ไม้/หิน) หรือสีจริง (สี/ผ้า) · gain = ตัวคูณความสว่างของ tint */

export type SwatchFamily = "wood" | "stone" | "paint" | "fabric";
export type Swatch = {
  family: SwatchFamily;
  chip: string;
  tint: string;
  gain: number;
  rough: number;
};

export const SWATCHES = {
  /* ไม้ — คูณบนภาพไม้พื้น (floor) / ไม้โอ๊ก (ผนังเด่น) */
  "white-oak": { family: "wood", chip: "#D9C3A0", tint: "#FFFFFF", gain: 1.22, rough: 0.6 },
  "honey-oak": { family: "wood", chip: "#C4935C", tint: "#FFE7C6", gain: 1, rough: 0.58 },
  walnut: { family: "wood", chip: "#7A5236", tint: "#A7744E", gain: 1, rough: 0.55 },
  "smoked-oak": { family: "wood", chip: "#5B4737", tint: "#7E6553", gain: 1, rough: 0.6 },
  "black-ash": { family: "wood", chip: "#3A332D", tint: "#4E4640", gain: 1, rough: 0.62 },
  /* หิน — คูณบนภาพปูน (concrete) ที่ค่าเฉลี่ย 0.75 จึงคูณ DETAIL_GAIN กลับ */
  travertine: { family: "stone", chip: "#D8C9AE", tint: "#E9DBC1", gain: 1.333, rough: 0.5 },
  terrazzo: { family: "stone", chip: "#E3DFD6", tint: "#EFEBE3", gain: 1.333, rough: 0.42 },
  "polished-concrete": {
    family: "stone",
    chip: "#A9A59D",
    tint: "#B4B0A8",
    gain: 1.333,
    rough: 0.38,
  },
  slate: { family: "stone", chip: "#5F6364", tint: "#6A6E70", gain: 1.333, rough: 0.55 },
  /* สีทาผนัง — สีเรียบ */
  "warm-white": { family: "paint", chip: "#F3EDE2", tint: "#F3EDE2", gain: 1, rough: 0.92 },
  "sand-limewash": { family: "paint", chip: "#E2CFAF", tint: "#E2CFAF", gain: 1, rough: 0.94 },
  sage: { family: "paint", chip: "#8FA88E", tint: "#8FA88E", gain: 1, rough: 0.92 },
  clay: { family: "paint", chip: "#BF8463", tint: "#BF8463", gain: 1, rough: 0.94 },
  mist: { family: "paint", chip: "#B5C4CB", tint: "#B5C4CB", gain: 1, rough: 0.92 },
  charcoal: { family: "paint", chip: "#45494A", tint: "#45494A", gain: 1, rough: 0.9 },
  "ink-blue": { family: "paint", chip: "#2F3B52", tint: "#2F3B52", gain: 1, rough: 0.9 },
  /* ผ้า */
  boucle: { family: "fabric", chip: "#DDD3C1", tint: "#DDD3C1", gain: 1, rough: 0.98 },
  linen: { family: "fabric", chip: "#EEE9DF", tint: "#EEE9DF", gain: 1, rough: 0.96 },
  moss: { family: "fabric", chip: "#7D9D77", tint: "#7D9D77", gain: 1, rough: 0.96 },
  ochre: { family: "fabric", chip: "#D9A45B", tint: "#D9A45B", gain: 1, rough: 0.96 },
  rust: { family: "fabric", chip: "#B5583A", tint: "#B5583A", gain: 1, rough: 0.96 },
  "navy-velvet": { family: "fabric", chip: "#2F3F5C", tint: "#2F3F5C", gain: 1, rough: 0.82 },
  graphite: { family: "fabric", chip: "#3E4143", tint: "#3E4143", gain: 1, rough: 0.94 },
} as const satisfies Record<string, Swatch>;

export type SwatchId = keyof typeof SWATCHES;

/** ผิวที่เปลี่ยนวัสดุได้ และชนิดวัสดุที่แต่ละผิวรับ (ตัวแรก = แท็บที่เปิดเมื่อเลือกผิวนั้น) */
export const SURFACE_FAMILIES = {
  floor: ["wood", "stone"],
  walls: ["paint"],
  feature: ["paint", "wood"],
  sofa: ["fabric"],
  bed: ["fabric"],
  rug: ["fabric"],
} as const satisfies Record<string, readonly SwatchFamily[]>;

export type MoodSurface = keyof typeof SURFACE_FAMILIES;
export const MOOD_SURFACES = Object.keys(SURFACE_FAMILIES) as MoodSurface[];
export type Finish = Record<MoodSurface, SwatchId>;

/** ชุดบรรยากาศ — วัสดุทุกผิว + เวลา · palette = 4 สีบนการ์ด */
export const MOODS = {
  cozy: {
    hour: 17.5,
    finish: {
      floor: "honey-oak",
      walls: "sand-limewash",
      feature: "walnut",
      sofa: "boucle",
      bed: "ochre",
      rug: "rust",
    },
  },
  bright: {
    hour: 11,
    finish: {
      floor: "white-oak",
      walls: "warm-white",
      feature: "sage",
      sofa: "linen",
      bed: "linen",
      rug: "boucle",
    },
  },
  moody: {
    hour: 20.5,
    finish: {
      floor: "smoked-oak",
      walls: "charcoal",
      feature: "ink-blue",
      sofa: "navy-velvet",
      bed: "graphite",
      rug: "ochre",
    },
  },
} as const satisfies Record<string, { hour: number; finish: Finish }>;

export type MoodId = keyof typeof MOODS;
export const MOOD_IDS = Object.keys(MOODS) as MoodId[];

/** ความใกล้ของห้องตอนนี้กับแต่ละชุด (รวม = 100) — วัสดุที่ตรงชุดผิวละ 1 แต้ม + เวลาใกล้ชุดได้ถึง 2 แต้ม */
export function moodMix(finish: Finish, hour: number): Record<MoodId, number> {
  const raw = MOOD_IDS.map((id) => {
    const m = MOODS[id];
    const same = MOOD_SURFACES.filter((s) => finish[s] === m.finish[s]).length;
    const near = 2 * Math.max(0, 1 - Math.abs(hour - m.hour) / 5);
    return same + near + 0.25;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const pct = raw.map((r) => Math.round((r / sum) * 100));
  /* ปัดแล้วต้องรวมได้ 100 พอดี — เศษไปลงตัวที่มากที่สุด */
  const top = pct.indexOf(Math.max(...pct));
  pct[top] = (pct[top] ?? 0) + 100 - pct.reduce((a, b) => a + b, 0);
  return Object.fromEntries(MOOD_IDS.map((id, i) => [id, pct[i] ?? 0])) as Record<MoodId, number>;
}

/** แสงของวัน 06:00-22:00 — หลัง 18:30 เป็นกลางคืน: แดดหรี่เป็นแสงจันทร์ฟ้า และไฟในบ้านติด (night)
    ค่าระหว่างจุดคือการไล่เส้นตรง · hex ของแดด/จันทร์อยู่ที่นี่ที่เดียว แถบเลื่อนเวลาฝั่ง DOM วาดสีจากชุดนี้ด้วย */
export const DAYLIGHT_KEYS = [
  { h: 6, sun: "#FFB27A", sunI: 0.7, hemi: 0.1, env: 0.55, night: 0.3 },
  { h: 8, sun: "#FFD6A0", sunI: 1.7, hemi: 0.14, env: 0.85, night: 0 },
  { h: 12, sun: "#FFF4E2", sunI: 2.4, hemi: 0.16, env: 1, night: 0 },
  { h: 16, sun: "#FFE4BC", sunI: 2.1, hemi: 0.15, env: 0.95, night: 0 },
  { h: 17.5, sun: "#FFB46E", sunI: 1.7, hemi: 0.13, env: 0.75, night: 0.1 },
  { h: 18.5, sun: "#E8834F", sunI: 0.7, hemi: 0.1, env: 0.45, night: 0.5 },
  { h: 19.5, sun: "#7E92D0", sunI: 0.28, hemi: 0.06, env: 0.2, night: 0.92 },
  { h: 22, sun: "#6578B8", sunI: 0.22, hemi: 0.05, env: 0.16, night: 1 },
] as const;

/** ไฟในบ้านตอนกลางคืน — หลอดอุ่น */
export const LAMP = { color: "#FFC27D", intensity: 5.5 } as const;

/** เวลาที่ใช้หาทิศของแสง — กลางคืนแสงจันทร์มาจากมุมสูงฝั่งตะวันออก (ไม่ใช่แดดต่ำค้างที่ 18:00) */
export const lightHour = (hour: number) => (hour <= 18.5 ? hour : 18.5 - (hour - 18.5) * 2.4);
