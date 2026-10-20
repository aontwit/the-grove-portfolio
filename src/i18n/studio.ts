import type { MoodId, MoodSurface, SwatchFamily, SwatchId } from "@/components/three/materials";
import type { Locale } from "./config";

/* คำของ mood studio (หน้าแบบบ้าน โหมด Isometric) — แยกไฟล์แบบเดียวกับ gallery.ts
   type ของภาษาอังกฤษ/จีนบังคับจากภาษาไทย ขาด key = type error · ชื่อวัสดุครบทุก SwatchId */

type Time = "morning" | "midday" | "evening" | "night";

const th = {
  caps: "SET THE MOOD",
  title: "ตั้งบรรยากาศ",
  stageLabel: (house: string, project: string) =>
    `โมเดล 3D ห้องชุดผ่าครึ่ง แบบ${house} โครงการ ${project} เปลี่ยนวัสดุ บรรยากาศ และเวลาได้ ลากเพื่อหมุน`,
  openStudio: "เปิด studio เต็มจอ",
  lead: "เลือกชุดบรรยากาศ ลากวัสดุไปวางบนพื้น ผนัง โซฟา หรือเตียง แล้วเลื่อนเวลาให้แดดเดิน",
  moodGroup: "ชุดบรรยากาศ",
  moods: {
    cozy: { name: "อบอุ่น", sub: "แดดเย็น" },
    bright: { name: "สว่าง", sub: "แดดสาย" },
    moody: { name: "ลึก", sub: "หลังค่ำ" },
  } satisfies Record<MoodId, { name: string; sub: string }>,
  meter: "ห้องตอนนี้ใกล้ชุดไหน",
  reads: (walls: string, floor: string, time: string, mood: string) =>
    `ผนัง${walls} พื้น${floor} กับ${time} — ห้องนี้ออกไปทาง${mood}`,
  timePhrase: {
    morning: "แดดเช้าอ่อน",
    midday: "แดดกลางวันเต็มห้อง",
    evening: "แดดเย็นสีทองต่ำ",
    night: "ไฟในบ้านตอนกลางคืน",
  } satisfies Record<Time, string>,
  surfaces: {
    floor: "พื้น",
    walls: "ผนัง",
    feature: "ผนังเด่น",
    sofa: "โซฟา",
    bed: "เตียง",
    rug: "พรม",
  } satisfies Record<MoodSurface, string>,
  families: {
    wood: "ไม้",
    stone: "หิน",
    fabric: "ผ้า",
    paint: "สีทา",
  } satisfies Record<SwatchFamily, string>,
  swatches: {
    "white-oak": "โอ๊กขาว",
    "honey-oak": "โอ๊กน้ำผึ้ง",
    walnut: "วอลนัต",
    "smoked-oak": "โอ๊กรมควัน",
    "black-ash": "แอชดำ",
    travertine: "ทราเวอร์ทีน",
    terrazzo: "หินขัด",
    "polished-concrete": "ปูนขัดมัน",
    slate: "หินชนวน",
    "warm-white": "ขาวอุ่น",
    "sand-limewash": "ปูนทรายลายมือ",
    sage: "เขียวเสจ",
    clay: "ดินเผา",
    mist: "ฟ้าหมอก",
    charcoal: "เทาถ่าน",
    "ink-blue": "น้ำเงินหมึก",
    boucle: "บูเคล่",
    "oat-knit": "ไหมพรมสีข้าวโอ๊ต",
    linen: "ลินิน",
    moss: "เขียวมอส",
    ochre: "เหลืองดินเผา",
    rust: "สนิมส้ม",
    "navy-velvet": "กำมะหยี่กรม",
    graphite: "เทากราไฟต์",
  } satisfies Record<SwatchId, string>,
  board: "วัสดุในห้อง",
  boardHint: "แตะผิวเพื่อเลือก",
  trayLabel: "เลือกชนิดวัสดุ",
  applyTo: (surface: string) => `ใช้กับ${surface}`,
  dragHint: "แตะเพื่อใช้ · ลากไปวางบนห้องได้",
  dropOn: (surface: string) => `ปล่อยเพื่อใช้กับ${surface}`,
  applied: (surface: string, swatch: string) => `${surface}: ${swatch}`,
  daylight: "แสงของวัน",
  times: {
    morning: "เช้า",
    midday: "เที่ยง",
    evening: "เย็น",
    night: "กลางคืน",
  } satisfies Record<Time, string>,
  timeSlider: "เวลาของวัน",
  hideUi: "ซ่อนแผง",
  showUi: "แสดงแผง",
  cinematic: "กล้องหมุนช้า",
  shortcuts: "ปุ่มลัด 1–3 ชุดบรรยากาศ · [ ] เลื่อนเวลา · / ซ่อนแผง",
  sheet: { mood: "บรรยากาศ", light: "แสง", materials: "วัสดุ" },
  sheetGroup: "แผงควบคุม",
  expand: "ขยายแผง",
  collapse: "ย่อแผง",
};

export type StudioDictionary = typeof th;

const en: StudioDictionary = {
  caps: "SET THE MOOD",
  title: "Set the mood",
  stageLabel: (house, project) =>
    `3D model of the ${house} house at ${project}, cut open. Change the materials, mood and time of day. Drag to turn it.`,
  openStudio: "Open the full-screen studio",
  lead: "Pick a mood, drag a material onto the floor, walls, sofa or bed, and slide the time to move the sun.",
  moodGroup: "Moods",
  moods: {
    cozy: { name: "Cozy", sub: "golden hour" },
    bright: { name: "Bright", sub: "late morning" },
    moody: { name: "Moody", sub: "after dark" },
  },
  meter: "How the room reads now",
  reads: (walls, floor, time, mood) =>
    `${walls} walls, ${floor} floor and ${time}. It reads ${mood}.`,
  timePhrase: {
    morning: "a soft morning sun",
    midday: "full midday light",
    evening: "a low gold sun",
    night: "the lamps on at night",
  },
  surfaces: {
    floor: "Floor",
    walls: "Walls",
    feature: "Feature wall",
    sofa: "Sofa",
    bed: "Bed",
    rug: "Rug",
  },
  families: { wood: "Wood", stone: "Stone", fabric: "Fabric", paint: "Paint" },
  swatches: {
    "white-oak": "White oak",
    "honey-oak": "Honey oak",
    walnut: "Walnut",
    "smoked-oak": "Smoked oak",
    "black-ash": "Black ash",
    travertine: "Travertine",
    terrazzo: "Terrazzo",
    "polished-concrete": "Polished concrete",
    slate: "Slate",
    "warm-white": "Warm white",
    "sand-limewash": "Sand limewash",
    sage: "Sage",
    clay: "Clay",
    mist: "Mist",
    charcoal: "Charcoal",
    "ink-blue": "Ink blue",
    boucle: "Bouclé",
    "oat-knit": "Oat knit",
    linen: "Linen",
    moss: "Moss",
    ochre: "Ochre",
    rust: "Rust",
    "navy-velvet": "Navy velvet",
    graphite: "Graphite",
  },
  board: "In this room",
  boardHint: "Tap a surface to pick it",
  trayLabel: "Material type",
  applyTo: (surface) => `On the ${surface.toLowerCase()}`,
  dragHint: "Tap to use · or drag it onto the room",
  dropOn: (surface) => `Drop to use on the ${surface.toLowerCase()}`,
  applied: (surface, swatch) => `${surface}: ${swatch}`,
  daylight: "Daylight",
  times: { morning: "Morning", midday: "Midday", evening: "Evening", night: "Night" },
  timeSlider: "Time of day",
  hideUi: "Hide panels",
  showUi: "Show panels",
  cinematic: "Slow camera",
  shortcuts: "Shortcuts: 1–3 moods · [ ] time · / hide panels",
  sheet: { mood: "Mood", light: "Light", materials: "Materials" },
  sheetGroup: "Controls",
  expand: "Expand panel",
  collapse: "Collapse panel",
};

const zh: StudioDictionary = {
  caps: "SET THE MOOD",
  title: "营造氛围",
  stageLabel: (house, project) =>
    `${project} ${house} 户型的剖切 3D 模型，可更换材质、氛围和时间，拖动可旋转。`,
  openStudio: "打开全屏工作室",
  lead: "选一种氛围，把材质拖到地板、墙面、沙发或床上，再拖动时间让阳光移动。",
  moodGroup: "氛围",
  moods: {
    cozy: { name: "温暖", sub: "黄昏" },
    bright: { name: "明亮", sub: "上午" },
    moody: { name: "深沉", sub: "入夜" },
  },
  meter: "房间现在更接近哪种氛围",
  reads: (walls, floor, time, mood) => `${walls}墙面、${floor}地板，加上${time}——整体偏${mood}。`,
  timePhrase: {
    morning: "柔和的晨光",
    midday: "满室的正午阳光",
    evening: "低垂的金色夕阳",
    night: "夜里亮起的灯",
  },
  surfaces: {
    floor: "地板",
    walls: "墙面",
    feature: "主题墙",
    sofa: "沙发",
    bed: "床",
    rug: "地毯",
  },
  families: { wood: "木材", stone: "石材", fabric: "织物", paint: "涂料" },
  swatches: {
    "white-oak": "白橡木",
    "honey-oak": "蜜色橡木",
    walnut: "胡桃木",
    "smoked-oak": "烟熏橡木",
    "black-ash": "黑白蜡木",
    travertine: "洞石",
    terrazzo: "水磨石",
    "polished-concrete": "抛光水泥",
    slate: "板岩",
    "warm-white": "暖白",
    "sand-limewash": "沙色石灰涂料",
    sage: "鼠尾草绿",
    clay: "陶土色",
    mist: "雾蓝",
    charcoal: "炭灰",
    "ink-blue": "墨蓝",
    boucle: "圈圈绒",
    "oat-knit": "燕麦色针织",
    linen: "亚麻",
    moss: "苔绿",
    ochre: "赭黄",
    rust: "铁锈橙",
    "navy-velvet": "藏青丝绒",
    graphite: "石墨灰",
  },
  board: "房间里的材质",
  boardHint: "点选一个表面",
  trayLabel: "材质类型",
  applyTo: (surface) => `用于${surface}`,
  dragHint: "点按使用 · 也可拖到房间里",
  dropOn: (surface) => `松开以用于${surface}`,
  applied: (surface, swatch) => `${surface}：${swatch}`,
  daylight: "日光",
  times: { morning: "早晨", midday: "正午", evening: "傍晚", night: "夜晚" },
  timeSlider: "一天中的时间",
  hideUi: "隐藏面板",
  showUi: "显示面板",
  cinematic: "慢速镜头",
  shortcuts: "快捷键：1–3 切换氛围 · [ ] 调整时间 · / 隐藏面板",
  sheet: { mood: "氛围", light: "光线", materials: "材质" },
  sheetGroup: "控制面板",
  expand: "展开面板",
  collapse: "收起面板",
};

const DICTS: Record<Locale, StudioDictionary> = { th, en, zh };

export function getStudioDictionary(lang: Locale): StudioDictionary {
  return DICTS[lang];
}

/** ช่วงเวลาของชั่วโมง — ใช้เลือกคำในประโยคและไฮไลต์การ์ดเวลา */
export function timeOf(hour: number): Time {
  if (hour < 10) return "morning";
  if (hour < 16) return "midday";
  if (hour < 19) return "evening";
  return "night";
}

export const TIME_PRESETS: Record<Time, number> = {
  morning: 8,
  midday: 12.5,
  evening: 17.5,
  night: 20.5,
};
