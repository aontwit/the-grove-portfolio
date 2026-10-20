import type { Locale } from "./config";
import type { ProjectStatus, SalesStatus } from "@/lib/schemas";

/* คำของ UI ส่วน "หลายโครงการ" — แยกจาก th.ts / en.ts (คำของแบรนด์และหน้าเดิมอยู่ที่นั่น)
   type ของภาษาอังกฤษบังคับจากภาษาไทย ขาด key = type error เหมือน dictionary หลัก
   เสียงเจ้าของโครงการ (DESIGN-SPEC §6) · ช่องที่ยังไม่มีข้อมูลบอกว่ารอ ไม่เติมค่าที่ดูเหมือนจริง */

const th = {
  nav: "โครงการ",
  /** ป้ายกลางของโครงการที่ยังไม่มีชื่อจริง — ไม่ใช่ชื่อโครงการ */
  slot: (n: number) => `โครงการที่ ${n}`,
  status: {
    pending: "รอข้อมูลจริง",
    live: "ข้อมูลจริง",
  } satisfies Record<ProjectStatus, string>,
  sales: {
    selling: "เปิดขาย",
    upcoming: "ยังไม่เปิดขาย",
    soldOut: "ขายครบแล้ว",
  } satisfies Record<SalesStatus, string>,
  /** ต่อท้ายค่าที่มีอยู่แต่ยังไม่ได้ยืนยัน เช่น ทำเลของโครงการตัวอย่าง */
  unconfirmed: "ยังไม่ยืนยัน",
  labels: {
    location: "ทำเล",
    plots: "จำนวนแปลง",
    available: "แปลงที่ยังว่าง",
    houseTypes: "แบบบ้าน",
    price: "ราคา",
    sales: "สถานะการขาย",
    name: "ชื่อโครงการ",
    units: "จำนวนบ้าน",
    land: "พื้นที่โครงการ",
    started: "เริ่มสร้าง",
  },
  unitsValue: (n: number) => `${n} ยูนิต`,
  raiValue: (n: number) => `${n} ไร่`,
  /** ช่วงราคาตามประกาศของผู้พัฒนา หน่วยล้านบาท ("2.96") — ต้องมี priceNote ในหน้าเดียวกัน */
  priceRange: (lo: string, hi: string) => `${lo}–${hi} ล้านบาท*`,
  startedValue: (year: number) => `พ.ศ. ${year}`,
  plotsValue: (n: number) => `${n} แปลง`,
  availableValue: (a: number, total: number) => `${a} จาก ${total}`,
  typesValue: (n: number) => `${n} แบบ`,

  index: {
    title: "โครงการ",
    lead: (brand: string, n: number, open: number) =>
      `${brand} มี ${n} โครงการ เปิดให้ดูได้แล้ว ${open} โครงการ ที่เหลือรอข้อมูลจริง เราบอกว่ารอ ไม่เติมชื่อหรือราคาขึ้นมาเอง`,
    metaDescription: (brand: string, n: number) =>
      `${n} โครงการบ้านของ ${brand} ดูผัง แบบบ้าน และทำเลของแต่ละโครงการ`,
    pendingGroup: "โครงการที่รอข้อมูลจริง",
    pendingGroupLead: (n: number) =>
      `อีก ${n} โครงการกำลังรวบรวมข้อมูล ชื่อ ทำเล แบบบ้าน และราคาจะขึ้นที่นี่เมื่อยืนยันแล้ว`,
  },

  card: {
    open: (name: string) => `ดูโครงการ ${name}`,
    notify: "ลงทะเบียนรับข่าวโครงการนี้",
    stillAlt: (name: string) => `${name} จากโมเดล 3 มิติ บนผังแปลงตัวอย่าง`,
  },

  home: {
    /** ปลายฉากเปิดหน้าแรก — ตัวเลือกโครงการจริง (components/site/ProjectChooser.tsx) */
    chooserTitle: "เลือกโครงการ",
    /** แยกเป็นวลี — ขึ้นบรรทัดใหม่ระหว่างวลีเท่านั้น (components/site/Phrases.tsx) */
    chooserLead: [
      "ทุกโครงการเปิดดูผัง แบบบ้าน และโมเดล 3 มิติ",
      "จากหน้าจอได้แบบเดียวกัน",
      "ก่อนนัดมาดูของจริง",
    ] as readonly string[],
    /** บรรทัดเดียวของโครงการที่ยังรอข้อมูล — ไม่มีชื่อ ไม่มีตัวเลข */
    pendingLine: (n: number) =>
      `อีก ${n} โครงการกำลังรวบรวมข้อมูล ชื่อ ทำเล และราคาจะขึ้นเมื่อยืนยันแล้ว`,
    pendingCta: "ลงทะเบียนรับข่าวโครงการใหม่",
    seeAll: "ดูโครงการทั้งหมด",
    closingTitle: "ลงทะเบียนไว้ก่อน",
    closingLead:
      "บอกเราว่าสนใจโครงการไหน เมื่อข้อมูลจริงของโครงการนั้นพร้อม ทีมขายโทรกลับพร้อมราคาและเงื่อนไข",
  },

  project: {
    /** ที่มาของตัวเลขโครงการ — วางใต้ภาพนิ่งหลัก */
    sourceNote:
      "โครงการนี้เป็นโครงการสมมติของงานพอร์ต — ชื่อ ทำเล ตัวเลข แปลนบ้าน และผังแปลงเป็นข้อมูลตัวอย่างทั้งหมด",
    specsTitle: "สิ่งที่ผู้พัฒนาระบุ",
    specsLead: "รายการสเปกตัวอย่างของโครงการสมมติ ถามรายละเอียดของแต่ละข้อกับทีมขายได้",
    claimsLabel: "เฉพาะโครงการนี้",
    specsShared: "ทุกโครงการของผู้พัฒนา",
    seePlan: "เปิดผังโครงการ",
    seeTypes: (n: number) => `ดูแบบบ้านทั้ง ${n} แบบ`,
    register: "ลงทะเบียนรับข้อมูลโครงการนี้",
    planTitle: "ผังโครงการ",
    locationTitle: "อยู่ตรงไหน",
    locationPending: "ทำเลยังไม่ยืนยัน",
    backToProjects: "ดูโครงการทั้งหมด",
    metaDescription: (name: string, units: number, types: number, place: string | null) =>
      `${name}: บ้าน ${types} แบบ ${units} ยูนิต${place ? ` ที่${place}` : ""} ตัวเลขและราคาเริ่มต้นตามประกาศของผู้พัฒนา ดูแบบบ้าน ผัง และทำเล`,
    /** บรรทัดทำเลเมื่อยังไม่มีระยะทางที่ตรวจแล้ว — บอกแค่ชื่อสถานที่ใกล้เคียงตามแผนที่ของผู้พัฒนา */
    nearLead: (place: string, names: string) => `${place} · ใกล้${names}`,
    joinNames: (names: readonly string[]) => names.join(" "),
  },

  pending: {
    lead: "โครงการนี้ยังไม่มีข้อมูลจริง หน้านี้จะแสดงชื่อ ทำเล ผัง แบบบ้าน และราคา เมื่อข้อมูลได้รับการยืนยัน ระหว่างนี้เราไม่ใส่ตัวเลขหรือชื่อที่ยังไม่จริง",
    listTitle: "ข้อมูลที่จะขึ้นในหน้านี้",
    notifyTitle: "อยากรู้ทันทีที่ข้อมูลพร้อม",
    notifyLead: "ทิ้งเบอร์ไว้ ทีมขายโทรกลับเมื่อโครงการนี้มีราคาและผังจริง",
    metaDescription: (slot: string) => `${slot}: รอข้อมูลจริง ยังไม่มีชื่อ ทำเล หรือราคา`,
  },

  register: {
    projectLabel: "โครงการ",
    projectNone: "ยังไม่แน่ใจ",
    pendingNote: "โครงการนี้ยังไม่มีผังและราคาจริง ทีมขายจะโทรกลับเมื่อข้อมูลพร้อม",
  },

  notFound: {
    projects: "ดูโครงการทั้งหมด",
  },
};

export type ProjectsDictionary = typeof th;

const en: ProjectsDictionary = {
  nav: "Projects",
  slot: (n: number) => `Project ${n}`,
  status: {
    pending: "Awaiting confirmed details",
    live: "Confirmed details",
  },
  sales: {
    selling: "On sale",
    upcoming: "Not yet on sale",
    soldOut: "Sold out",
  },
  unconfirmed: "not yet confirmed",
  labels: {
    location: "Location",
    plots: "Plots",
    available: "Plots still available",
    houseTypes: "House types",
    price: "Price",
    sales: "Sales status",
    name: "Project name",
    units: "Houses",
    land: "Project land",
    started: "Construction started",
  },
  unitsValue: (n: number) => `${n} units`,
  raiValue: (n: number) => `${n} rai`,
  priceRange: (lo: string, hi: string) => `THB ${lo}–${hi} million*`,
  startedValue: (year: number) => `${year}`,
  plotsValue: (n: number) => `${n} plots`,
  availableValue: (a: number, total: number) => `${a} of ${total}`,
  typesValue: (n: number) => `${n} ${n === 1 ? "type" : "types"}`,

  index: {
    title: "Projects",
    lead: (brand: string, n: number, open: number) =>
      `${brand} has ${n} projects. ${open} can be viewed now. The rest are awaiting confirmed details, and we say so rather than fill in names or prices ourselves.`,
    metaDescription: (brand: string, n: number) =>
      `${n} housing projects by ${brand}. See the site plan, house types and location of each one.`,
    pendingGroup: "Projects awaiting confirmed details",
    pendingGroupLead: (n: number) =>
      `${n} more projects are being prepared. Their names, locations, house types and prices will appear here once confirmed.`,
  },

  card: {
    open: (name: string) => `View ${name}`,
    notify: "Register for news on this project",
    stillAlt: (name: string) => `${name} from the 3D model, on a sample site plan`,
  },

  home: {
    chooserTitle: "Choose a project",
    chooserLead: [
      "Every project lets you look through the site plan, house types and 3D models on screen in the same way,",
      "before you visit in person.",
    ],
    pendingLine: (n: number) =>
      `${n} more projects are still being put together. Their names, locations and prices will appear here once confirmed.`,
    pendingCta: "Register for news of new projects",
    seeAll: "See all projects",
    closingTitle: "Register ahead",
    closingLead:
      "Tell us which project you are interested in. When its details are confirmed, the sales team will call you back with prices and terms.",
  },

  project: {
    sourceNote:
      "This is a fictional portfolio project — the name, location, figures, house plans and site plan are all sample data.",
    specsTitle: "What the developer says",
    specsLead: "A sample spec list for a fictional project. Ask the sales team about any of them.",
    claimsLabel: "This project",
    specsShared: "All of the developer's projects",
    seePlan: "Open the site plan",
    seeTypes: (n: number) => `See all ${n} house types`,
    register: "Register for this project",
    planTitle: "Site plan",
    locationTitle: "Where it is",
    locationPending: "Location not yet confirmed",
    backToProjects: "See all projects",
    metaDescription: (name: string, units: number, types: number, place: string | null) =>
      `${name}: ${units} houses in ${types} house types${place ? ` in ${place}` : ""}. Figures and starting prices as published by the developer. See the house types, site plan and location.`,
    nearLead: (place: string, names: string) => `${place} · near ${names}`,
    joinNames: (names: readonly string[]) => names.join(", "),
  },

  pending: {
    lead: "This project has no confirmed details yet. This page will show its name, location, site plan, house types and prices once they are confirmed. Until then we leave out any name or figure that is not real.",
    listTitle: "What this page will show",
    notifyTitle: "Hear as soon as the details are ready",
    notifyLead:
      "Leave your number and the sales team will call you back once this project has a real site plan and prices.",
    metaDescription: (slot: string) =>
      `${slot}: awaiting confirmed details. No name, location or prices yet.`,
  },

  register: {
    projectLabel: "Project",
    projectNone: "Not sure yet",
    pendingNote:
      "This project does not have a real site plan or prices yet. The sales team will call you back once they are ready.",
  },

  notFound: {
    projects: "See all projects",
  },
};

/** "3.20" 百万 → "320" 万（与 zh.ts 相同的换算） */
function wan(m: string) {
  const n = Number(m);
  if (m.trim() === "" || Number.isNaN(n)) return m;
  return String(Number((n * 100).toFixed(2)));
}

const zh: ProjectsDictionary = {
  nav: "项目",
  slot: (n: number) => `项目${n}`,
  status: {
    pending: "待开发商提供",
    live: "已确认信息",
  },
  sales: {
    selling: "在售",
    upcoming: "尚未开售",
    soldOut: "已售罄",
  },
  unconfirmed: "尚未确认",
  labels: {
    location: "位置",
    plots: "地块数",
    available: "可售地块",
    houseTypes: "户型",
    price: "价格",
    sales: "销售状态",
    name: "项目名称",
    units: "住宅数量",
    land: "项目占地",
    started: "开工时间",
  },
  unitsValue: (n: number) => `${n}套`,
  raiValue: (n: number) => `${n}莱`,
  priceRange: (lo: string, hi: string) => `${wan(lo)}–${wan(hi)}万泰铢*`,
  startedValue: (year: number) => `${year}年`,
  plotsValue: (n: number) => `${n}块`,
  availableValue: (a: number, total: number) => `${a}块（共${total}块）`,
  typesValue: (n: number) => `${n}种`,

  index: {
    title: "项目",
    lead: (brand: string, n: number, open: number) =>
      `${brand} 共有${n}个项目，其中${open}个现在可以查看。其余项目的信息待开发商提供，我们如实标明，不自行填写名称或价格。`,
    metaDescription: (brand: string, n: number) =>
      `${brand} 的${n}个住宅项目。查看每个项目的总平面图、户型和位置。`,
    pendingGroup: "信息待开发商提供的项目",
    pendingGroupLead: (n: number) =>
      `另有${n}个项目正在整理中。名称、位置、户型和价格确认后会在这里显示。`,
  },

  card: {
    open: (name: string) => `查看 ${name}`,
    notify: "登记接收此项目的消息",
    stillAlt: (name: string) => `${name}，取自示例总平面图上的3D模型`,
  },

  home: {
    chooserTitle: "选择项目",
    chooserLead: [
      "每个项目都可以用同样的方式，",
      "先在屏幕上查看总平面图、户型和3D模型，",
      "再实地看房。",
    ],
    pendingLine: (n: number) => `另有${n}个项目仍在整理资料，名称、位置和价格确认后会显示在这里。`,
    pendingCta: "登记接收新项目消息",
    seeAll: "查看全部项目",
    closingTitle: "提前登记",
    closingLead: "告诉我们您对哪个项目感兴趣。该项目信息确认后，销售团队会回电告知价格和条款。",
  },

  project: {
    sourceNote: "这是作品集中的虚构项目——名称、位置、数字、户型平面图和总平面图均为示例数据。",
    specsTitle: "开发商的描述",
    specsLead: "以下为虚构项目的示例规格清单。任何一项都可以向销售团队询问。",
    claimsLabel: "本项目",
    specsShared: "开发商的所有项目",
    seePlan: "打开总平面图",
    seeTypes: (n: number) => `查看全部${n}种户型`,
    register: "登记此项目",
    planTitle: "总平面图",
    locationTitle: "位置",
    locationPending: "位置尚未确认",
    backToProjects: "查看全部项目",
    metaDescription: (name: string, units: number, types: number, place: string | null) =>
      `${name}：${place ? `位于${place}，` : ""}${types}种户型共${units}套住宅。数据和起价以开发商公布为准。查看户型、总平面图和位置。`,
    nearLead: (place: string, names: string) => `${place} · 靠近${names}`,
    joinNames: (names: readonly string[]) => names.join("、"),
  },

  pending: {
    lead: "此项目还没有确认信息。信息确认后，本页将显示名称、位置、总平面图、户型和价格。在此之前，我们不放任何不真实的名称或数字。",
    listTitle: "本页将显示的内容",
    notifyTitle: "信息就绪时第一时间通知您",
    notifyLead: "留下电话号码，此项目有了实际总平面图和价格后，销售团队会回电。",
    metaDescription: (slot: string) => `${slot}：信息待开发商提供。尚无名称、位置或价格。`,
  },

  register: {
    projectLabel: "项目",
    projectNone: "还不确定",
    pendingNote: "此项目还没有实际总平面图或价格。信息就绪后，销售团队会回电。",
  },

  notFound: {
    projects: "查看全部项目",
  },
};

const DICTS: Record<Locale, ProjectsDictionary> = { th, en, zh };

export function getProjectsDictionary(lang: Locale): ProjectsDictionary {
  return DICTS[lang];
}
