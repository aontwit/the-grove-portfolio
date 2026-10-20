import type { Locale } from "./config";

/* คำของ UI ภาพในแกลเลอรีและภาพจากผู้พัฒนาบนหน้าแรก — แยกจาก th.ts / en.ts แบบเดียวกับ projects.ts
   type ของภาษาอังกฤษบังคับจากภาษาไทย ขาด key = type error
   ทุกภาพต้องบอกที่มา: "ภาพจากผู้พัฒนา" (ภาพบรรยากาศของแบรนด์ บ้านในภาพไม่ใช่แบบบ้านของโครงการ)
   หรือ "ภาพจากโมเดล 3D" (บ้านและผังของโครงการจริงบนแปลน/ผังตัวอย่าง) */

const th = {
  source: {
    /** ป้ายที่มาของภาพจากสื่อโฆษณาของผู้พัฒนา — ติดทุกจุดที่ภาพนี้ปรากฏ */
    developer: "ภาพจากผู้พัฒนา",
    model3d: "ภาพจากโมเดล 3D",
    /** ต่อท้ายป้ายภาพจากโมเดล 3D เมื่อห้องในภาพเป็นแปลนตัวอย่าง */
    samplePlan: "แปลนตัวอย่าง",
    /** ต่อท้ายป้ายภาพหมู่บ้านเมื่อผังแปลงเป็นผังตัวอย่าง */
    sampleSite: "ผังแปลงตัวอย่าง",
    /** บ้านในภาพของผู้พัฒนาไม่ตรงกับแบบบ้านของโครงการไหน */
    developerNote: "ภาพบรรยากาศของแบรนด์ ไม่ใช่แบบบ้านในโครงการ",
  },

  gallery: {
    title: "แกลเลอรี",
    metaDescription: (model: number) =>
      `ภาพจากโมเดล 3D ของโครงการ ${model} ภาพ ถ่ายจากฉากเดียวกับแปลนและผังบนเว็บ`,
    intro: "ทุกภาพในหน้านี้ถ่ายจากโมเดล 3D ของโครงการ — ฉากเดียวกับแปลน 2D และโหมดเดินดูบนเว็บ",
    /** คำอธิบายที่มาสองแบบใต้คำนำ — ตัวเลขนับจากภาพจริงในหน้า */
    sources: {
      developer:
        "ภาพบรรยากาศจากสื่อโฆษณาของแบรนด์ บ้านในภาพไม่ใช่แบบบ้านของโครงการไหน และเราไม่ทราบว่าเป็นภาพถ่ายหรือภาพจำลอง",
      model3d:
        "บ้านและหมู่บ้านของโครงการ สร้างจาก geometry ชุดเดียวกับแปลน บนแปลนและผังแปลงตัวอย่าง",
    },
    count: (n: number) => `${n} ภาพ`,
    filterLabel: "เลือกภาพที่จะดู",
    filter: {
      all: "ทั้งหมด",
      developer: "ภาพจากผู้พัฒนา",
      model3d: "โมเดล 3D",
    },
    /** จำนวนภาพหลังเลือกตัวกรอง — อ่านให้ screen reader ฟังเมื่อเปลี่ยน */
    showing: (n: number) => `แสดง ${n} ภาพ`,
    project: (name: string) => `โครงการ ${name}`,
    openFull: (title: string) => `เปิดภาพเต็มจอ: ${title}`,
    dialog: "ภาพเต็มจอ",
    prev: "ภาพก่อน",
    next: "ภาพถัดไป",
    counter: (i: number, n: number) => `ภาพที่ ${i} จาก ${n}`,
    swipeHint: "ปัดซ้ายขวาเพื่อเลื่อนภาพ",
  },

  rooms: {
    title: "ข้างในบ้าน จากภาพของผู้พัฒนา",
    lead: "สี่มุมจากภาพโฆษณาของผู้พัฒนา บ้านในภาพเป็นภาพบรรยากาศของแบรนด์ ไม่ใช่แบบบ้านของโครงการไหน ข้อความคู่กับแต่ละภาพคือสิ่งที่ผู้พัฒนาระบุไว้ในประกาศของทั้งสองโครงการ",
    /** ชื่อกลุ่มปุ่มห้อง (screen reader) */
    label: "ห้องในภาพของผู้พัฒนา",
    hint: "เลือกห้องเพื่อดูภาพ ใช้ปุ่มลูกศรเลื่อนระหว่างห้องได้",
    seeGallery: "ดูภาพทั้งหมดในแกลเลอรี",
  },
};

export type GalleryDictionary = typeof th;

const en: GalleryDictionary = {
  source: {
    developer: "Images from the developer",
    model3d: "From the 3D model",
    samplePlan: "sample layout",
    sampleSite: "sample site plan",
    developerNote: "A brand mood picture, not one of the projects' house types",
  },

  gallery: {
    title: "Gallery",
    metaDescription: (model) =>
      `${model} pictures from the projects' 3D models, rendered from the same scene as the plans on this site.`,
    intro:
      "Every picture here is rendered from the projects' 3D models — the same scene as the 2D plans and the walkthrough.",
    sources: {
      developer:
        "Brand mood pictures from the developer's own advertising. The house in them is not one of the projects' house types, and we do not know whether they are photos or renders.",
      model3d:
        "The projects' houses and villages, built from the same geometry as the plans, on sample layouts and site plans.",
    },
    count: (n) => `${n} ${n === 1 ? "picture" : "pictures"}`,
    filterLabel: "Show pictures",
    filter: {
      all: "All",
      developer: "From the developer",
      model3d: "3D model",
    },
    showing: (n) => `Showing ${n} ${n === 1 ? "picture" : "pictures"}`,
    project: (name) => `Project: ${name}`,
    openFull: (title) => `Open full screen: ${title}`,
    dialog: "Full-screen picture",
    prev: "Previous",
    next: "Next",
    counter: (i, n) => `Picture ${i} of ${n}`,
    swipeHint: "Swipe left or right to move between pictures",
  },

  rooms: {
    title: "Inside, from the developer's images",
    lead: "Four corners from the developer's own advertising. The house in them is a brand mood picture, not one of the projects' house types. Alongside each one is what the developer lists for both projects.",
    label: "Rooms in the developer's images",
    hint: "Choose a room to see it. The arrow keys move between rooms.",
    seeGallery: "See every picture in the gallery",
  },
};

const zh: GalleryDictionary = {
  source: {
    developer: "开发商提供的图片",
    model3d: "取自3D模型",
    samplePlan: "示例平面图",
    sampleSite: "示例总平面图",
    developerNote: "品牌氛围图，并非项目中的户型",
  },

  gallery: {
    title: "图库",
    metaDescription: (model) => `${model}张项目3D模型图片，与网站上的平面图来自同一场景。`,
    intro: "这里的每张图片都由项目的3D模型渲染——与2D平面图和漫游模式是同一个场景。",
    sources: {
      developer:
        "来自开发商自己广告的品牌氛围图。图中的房子并非项目中的户型，我们也不知道它们是照片还是渲染图。",
      model3d: "项目的房屋和社区，用与平面图相同的几何数据建成，放在示例平面图和示例总平面图上。",
    },
    count: (n) => `${n}张`,
    filterLabel: "显示图片",
    filter: {
      all: "全部",
      developer: "开发商提供",
      model3d: "3D模型",
    },
    showing: (n) => `显示${n}张图片`,
    project: (name) => `项目：${name}`,
    openFull: (title) => `全屏打开：${title}`,
    dialog: "全屏图片",
    prev: "上一张",
    next: "下一张",
    counter: (i, n) => `第${i}张，共${n}张`,
    swipeHint: "左右滑动切换图片",
  },

  rooms: {
    title: "室内，取自开发商的图片",
    lead: "四个视角，取自开发商自己的广告。图中的房子是品牌氛围图，并非项目中的户型。每张图旁边是开发商为两个项目列出的内容。",
    label: "开发商图片中的房间",
    hint: "选择一个房间查看图片，方向键可在房间之间切换。",
    seeGallery: "在图库中查看全部图片",
  },
};

const DICTS: Record<Locale, GalleryDictionary> = { th, en, zh };

export function getGalleryDictionary(lang: Locale): GalleryDictionary {
  return DICTS[lang];
}
