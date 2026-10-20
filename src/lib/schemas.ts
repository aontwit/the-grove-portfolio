import { z } from "zod";
/* path ตรง + .ts ไม่ใช่ "@/…" — scripts/geometry-check.mjs รันไฟล์นี้ด้วย node ตรงๆ ซึ่งไม่รู้จัก alias */
import { LOCALES } from "../i18n/config.ts";

/* CSP ของ production ไม่มี 'unsafe-eval' (next.config.ts) — zod v4 ตั้งต้นจะลอง new Function() เพื่อคอมไพล์
   ตัวตรวจ object ให้เร็วขึ้น ซึ่งเบราว์เซอร์บล็อกและรายงานเป็น CSP violation (ฟอร์ม /register ตรวจฝั่ง client)
   ปิด JIT ที่นี่ — ทุก schema ของโครงการสร้างในไฟล์นี้ บรรทัดนี้จึงรันก่อน schema ตัวแรกเสมอ
   ทั้งฝั่ง server และ client · zod ยังตรวจครบเหมือนเดิม แค่ไม่คอมไพล์เป็นโค้ด */
z.config({ jitless: true });

/* คำแปลของข้อความใน data — ทุก object ที่มีข้อความให้คนอ่านมีคู่ en และ zh บังคับ รูปร่างเดียวกัน (ขาด = build พัง)
   repo แทนค่าไทยด้วยค่าในภาษานั้นให้หน้า /en/... /zh/... เอง (lib/localize.ts) · ชื่อแบบบ้านเป็นชื่อเฉพาะ ใช้การถอดเสียง */
const enText = z.string().min(1);
/** คู่คำแปลทุกภาษานอกจากไทย — { en, zh } ด้วย schema เดียวกัน */
const tr = <T extends z.ZodType>(schema: T) => ({ en: schema, zh: schema });

/* ระบบพิกัด: เมตร · origin อยู่กลางกรอบบ้าน · x = กว้าง, z = ลึก
   ขอบห้องต้องชนกันสนิท — ตัวตรวจอยู่ที่ src/geometry/validate.ts */

export const roomSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    x0: z.number(),
    z0: z.number(),
    x1: z.number(),
    z1: z.number(),
    desc: z.string(),
    ...tr(z.object({ name: enText, desc: z.string() })),
    /* true = อยู่นอกกรอบบ้าน (ระเบียง) — ไม่นับในผลรวมพื้นที่และไม่ต้องตรวจการเดินถึง */
    outdoor: z.boolean().default(false),
    /* ชั้นที่ห้องนี้อยู่ — แต่ละชั้นต้องปูเต็มกรอบบ้านของตัวเอง */
    floor: z.number().int().min(1).max(3).default(1),
    /* true = ห้องที่มีบันไดขึ้น-ลง ใช้เป็นจุดตั้งต้นของการเดินถึงบนชั้นที่ไม่มีทางเข้าบ้าน */
    stair: z.boolean().default(false),
  })
  .refine((r) => r.x1 > r.x0 && r.z1 > r.z0, {
    message: "x1 ต้องมากกว่า x0 และ z1 ต้องมากกว่า z0",
  });

/* ช่องเปิดบนผนัง — wallAxis คือแนวที่ผนังทอดตัว
   'x' = ผนังขนานแกน x ที่พิกัด z = at, ช่องกินระยะ from..to บนแกน x
   'z' = ผนังขนานแกน z ที่พิกัด x = at, ช่องกินระยะ from..to บนแกน z */
export const openingSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["door", "entry", "window"]),
    wallAxis: z.enum(["x", "z"]),
    at: z.number(),
    from: z.number(),
    to: z.number(),
    floor: z.number().int().min(1).max(3).default(1),
    /** ระดับล่าง/บนเฉพาะช่องนี้ (เมตร) — ไม่ใส่ = ค่าตามชนิด (geometry OPENING_V) */
    sill: z.number().min(0).optional(),
    head: z.number().positive().max(3).optional(),
    /** ที่มาของช่องเปิด เช่น "ตามภาพหน้าบ้านจริง" (แปลนยังเป็นตัวอย่าง) — ไม่แสดงบนเว็บ */
    note: z.string().optional(),
  })
  .refine((o) => o.to > o.from, { message: "to ต้องมากกว่า from" })
  .refine((o) => (o.head ?? 3) > (o.sill ?? 0), { message: "head ต้องสูงกว่า sill" });

/* ภาษาภายนอกของแบบบ้าน (geometry/exterior.ts) — บ้านจั่วโมเดิร์นของ The Grove
   single-gable = บ้านเดี่ยวจั่วเดียวหันหน้าถนน + หลังคาปั้นหยาเตี้ยส่วนที่เหลือ + โรงจอดหลังคาแบนฝั่งตรงข้ามจั่ว
   twin = บ้านแฝดสองชั้น จั่วฝั่งนอก ผนังร่วมฝั่งตรงข้าม ระเบียงชั้นบน + ช่องลมบล็อกขาวชิดผนังร่วม โรงจอดหน้าบ้าน */
export const facadeSchema = z.object({
  style: z.enum(["single-gable", "twin"]),
  /** จั่วคร่อมห้องหน้าริมด้านไหนของแปลน (x- = ซ้ายเมื่อมองจากถนน) */
  gable: z.enum(["x-", "x+"]),
  /** รั้วหน้าแปลง — null = ไม่มีรั้ว (สนามเปิด) */
  fence: z.enum(["breeze-block"]).nullable().default(null),
  /** ผิวลานหน้าบ้านฝั่งจั่ว */
  yard: z.enum(["lawn", "gravel"]).default("lawn"),
  /* สัดส่วนตั้งต้นของสตูดิโอ (ดู DESIGN-SPEC §5) ค่าเริ่มคือค่าที่วัดได้ */
  /** หน้ากว้างจั่วสูงสุด (เมตร ระหว่างเสากรอบจั่ว) — จั่วกว้างเท่าห้องใต้จั่วแต่ไม่เกินค่านี้ */
  gableWidthMax: z.number().min(2.5).max(6).default(4.2),
  /** ความชันจั่วหน้า (องศา) */
  gablePitch: z.number().min(30).max(60).default(42),
  /** ความลึกสูงสุดของหลังคาจั่วจากผนังหน้า (เมตร) — ที่เหลือเป็นปั้นหยาเตี้ย */
  gableDepth: z.number().min(2.5).max(8).default(4.5),
  /** ผนังใต้จั่วยกสูงกว่าชายคาปั้นหยาอย่างน้อยเท่านี้ (เมตร) — ภาพอ้างอิง: ก้อนจั่วสูงกว่าส่วนอื่น */
  gableWallLift: z.number().min(0).max(2).default(1),
  /** ความชันหลังคาปั้นหยาส่วนที่เหลือ (องศา) — เตี้ย ไม่แย่งจั่ว */
  mainRoofPitch: z.number().min(10).max(30).default(17),
  /** front = หลังคาแบนคลุมหน้าบ้านฝั่งตรงข้ามจั่ว ยื่นออกข้างแปลงถ้ามีที่ (ภาพอ้างอิง) · side = ข้างบ้านอย่างเดียว (แบบเดิม) */
  carportMode: z.enum(["front", "side"]).default("front"),
  /** ที่มาของค่าสัดส่วน (ไม่แสดงบนเว็บ) */
  note: z.string().optional(),
});

export const furnitureKindSchema = z.enum([
  "sofa",
  "bed",
  "wardrobe",
  "counter",
  "diningSet",
  "desk",
  "toilet",
  "sink",
  "showerTray",
  "rug",
  "plant",
  "floorLamp",
  "frame",
  "tree",
]);

/* เฟอร์นิเจอร์หนึ่งชิ้น — x,z คือจุดกึ่งกลาง, w,d คือขนาดกล่องตามแกนโลก (เมตร)
   ตัวตรวจใน geometry/validate.ts บังคับว่ากล่องต้องอยู่ในห้องตัวเองและไม่ขวางช่องเปิด */
export const furnitureSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  kind: furnitureKindSchema,
  x: z.number(),
  z: z.number(),
  w: z.number().positive(),
  d: z.number().positive(),
  h: z.number().positive().optional(),
  facing: z.enum(["x+", "x-", "z+", "z-"]).optional(),
  tone: z
    .enum(["woodDark", "woodLight", "fabricSage", "fabricWarm", "ceramic", "wallInner"])
    .optional(),
});

export const houseTypeSchema = z.object({
  id: z.string().min(1),
  /** โครงการที่ขายแบบนี้ (projects.json → id) */
  projectId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["detached", "twin"]),
  storeys: z.number().int().min(1).max(3),
  /** พื้นที่ใช้สอยตามที่ผู้พัฒนาประกาศ — ตัวเลขพื้นที่ที่แสดงทุกจุดในเว็บ
      เมื่อ samplePlan = true ห้องใน rooms เป็นแปลนตัวอย่าง ผลรวมพื้นที่ห้องจึงไม่เท่าค่านี้ และห้ามแสดงแทนค่านี้ */
  areaSqm: z.number().positive(),
  beds: z.number().int().min(0),
  baths: z.number().int().min(0),
  /** ที่จอดรถตามที่ผู้พัฒนาประกาศ */
  parking: z.number().int().min(0),
  /** ขนาดที่ดินของแบบนี้ตามที่ผู้พัฒนาประกาศ (ตร.ว.) */
  landSqw: z.number().positive(),
  /** ราคาเริ่มต้นตามที่ผู้พัฒนาประกาศ */
  priceFrom: z.number().int().positive(),
  /** true = ผู้พัฒนาประกาศว่าแบบนี้ขายหมดแล้ว */
  soldOut: z.boolean().default(false),
  /** true = rooms / openings / furniture เป็นแปลนตัวอย่าง (ยังไม่มีแปลนจริงจากผู้พัฒนา)
      ทุกจุดที่แสดงห้อง (แปลน 2D, 3D, เดินดู, ตารางห้อง) ต้องติดป้ายแปลนตัวอย่าง (components/site/SampleNote.tsx) */
  samplePlan: z.boolean(),
  images: z.array(z.string()),
  rooms: z.array(roomSchema).min(1),
  openings: z.array(openingSchema).min(1),
  highlight: z.string(),
  ...tr(z.object({ name: enText, highlight: z.string() })),
  /* ทิศเหนือบนแปลนของแบบบ้านนี้ องศาตามเข็มนาฬิกาจากแนวตั้งของภาพ
     (ทิศจริงรายแปลงมาตอนทำผังโครงการ Stage 5) */
  northDeg: z.number().min(0).max(359),
  furniture: z.array(furnitureSchema).default([]),
  /** ภาษาภายนอกตามภาพบ้านจริง — ไม่ใส่ = single-gable จั่วซ้าย ไม่มีรั้ว */
  facade: facadeSchema.optional(),
});

/* unconfirmed = ยังไม่รู้สถานะจริงของแปลงนี้ (ผู้พัฒนายังไม่ได้ให้สถานะรายแปลง) — ไม่ใช่ "ว่าง"
   ลงทะเบียนสนใจได้ ทีมขายยืนยันสถานะตอนโทรกลับ (lib/status.ts isOpen) */
export const plotStatusSchema = z.enum(["available", "unconfirmed", "reserved", "sold"]);

export const plotSchema = z.object({
  id: z.string().min(1),
  /** โครงการที่แปลงนี้อยู่ (projects.json → id) — ผังของแปลงคือ plan ของโครงการนั้น */
  projectId: z.string().min(1),
  number: z.string().min(1),
  houseTypeId: z.string().min(1),
  landSqw: z.number().positive(),
  /** ราคาขายของแปลงนี้ · null = ยังไม่มีราคารายแปลง หน้าเว็บแสดงราคาเริ่มต้นของแบบบ้านพร้อมดอกจัน
      (lib/format.ts plotPrice) ห้ามเติมราคารายแปลงที่ผู้พัฒนาไม่ได้ให้มา */
  price: z.number().int().positive().nullable(),
  status: plotStatusSchema,
  /* จุดกึ่งกลางแปลงบนผังโครงการ หน่วยเมตร (origin มุมซ้ายบนของผัง)
     ความกว้างแปลงคำนวณจาก landSqw กับความลึกมาตรฐานใน plan ของโครงการ ไม่เก็บซ้ำ */
  px: z.number().min(0),
  py: z.number().min(0),
});

/* ภาพในแกลเลอรี (gallery.json) — ทุกภาพบอกที่มาเสมอ
   - developer = ภาพจากสื่อโฆษณาของผู้พัฒนา (public/brand) เป็นภาพบรรยากาศของแบรนด์
     บ้านในภาพไม่ตรงกับแบบบ้านของโครงการไหน จึงห้ามผูกกับโครงการ
     และห้ามใช้ในหน้า /projects/** — ใช้ได้แค่หน้าแรกกับแกลเลอรี
   - model3d = ภาพนิ่งจากโมเดล 3D ของโครงการ · ภาพนิ่งชุดหลักมาจาก renders.json (repo.listRenders)
   width/height = ขนาดไฟล์จริง (พิกเซล) — หน้าเว็บใช้คงสัดส่วนภาพและกันไม่ให้ขยายเกินขนาดจริง
   feature = ตำแหน่งพิเศษนอกตารางภาพ: ภาพปกแกลเลอรี · แถบภาพหน้าแรก · ห้องในท่อนห้องของหน้าแรก (เรียงตามลำดับในไฟล์) */
export const gallerySourceSchema = z.enum(["developer", "model3d"]);
export const galleryFeatureSchema = z.enum(["gallery-hero", "home-band", "home-room"]);

export const galleryImageSchema = z
  .object({
    id: z.string().min(1),
    src: z.string().min(1),
    source: gallerySourceSchema,
    projectId: z.string().min(1).nullable(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    feature: galleryFeatureSchema.nullable().default(null),
    /** ชื่อสั้นของภาพ (ชื่อห้อง/มุม) */
    title: z.string().min(1),
    /** หนึ่งประโยคบอกว่าในภาพมีอะไร */
    caption: z.string().min(1),
    alt: z.string().min(1),
    /** ข้อความใต้ภาพในท่อนห้องของหน้าแรก — สิ่งที่ผู้พัฒนาระบุไว้เท่านั้น ห้ามแต่งคุณสมบัติเพิ่ม */
    note: z.string().min(1).optional(),
    ...tr(
      z.object({
        title: enText,
        caption: enText,
        alt: enText,
        note: enText.optional(),
      }),
    ),
  })
  .refine((g) => g.source !== "developer" || g.projectId === null, {
    message: "ภาพจากผู้พัฒนาเป็นภาพบรรยากาศของแบรนด์ ห้ามผูกกับโครงการ (projectId ต้องเป็น null)",
    path: ["projectId"],
  })
  .refine((g) => g.feature !== "home-room" || g.note !== undefined, {
    message: "ภาพห้องของหน้าแรกต้องมี note (สิ่งที่ผู้พัฒนาระบุ)",
    path: ["note"],
  });

/* ภาพนิ่งจากฉาก 3D — ไฟล์อยู่ที่ public/renders/{id}.png สร้างด้วย pnpm render:stills
   รายการนี้คือรายการถ่ายของสคริปต์และรายการภาพของหน้าแกลเลอรีในเวลาเดียวกัน */
export const renderSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  view: z.enum(["iso", "walk", "village"]),
  hour: z.number().min(6).max(18),
  floor: z.number().int().min(1).max(3),
  /** true = บ้านปิดหลังคา (ภาพภายนอกของแบบ) — บ้านแฝดถ่ายคู่กับหลังข้างเคียง */
  closed: z.boolean().default(false),
  /** true = แปลงเปล่า ยังไม่มีห้อง — เฟรมแรกของฉากเปิดหน้าแรกบนจอกว้าง (ไม่ใช่ภาพของแบบบ้าน ไม่ขึ้นแกลเลอรี) */
  empty: z.boolean().default(false),
  /** true = อยู่ในม้วนภาพหน้าแกลเลอรี */
  reel: z.boolean(),
  /** true = ถ่ายบนพื้นหมึก (ม้วนแกลเลอรีอยู่บนแถบหมึก) · false = พื้น paper สำหรับวางบนการ์ด */
  dark: z.boolean().default(false),
  title: z.string().min(1),
  note: z.string().min(1),
  ...tr(z.object({ title: enText, note: enText })),
});
export const rendersFileSchema = z.array(renderSchema);

export const amenitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ...tr(z.object({ name: enText })),
  x0: z.number(),
  y0: z.number(),
  x1: z.number(),
  y1: z.number(),
});

/* ผังโครงการ หน่วยเมตรทั้งหมด — 2D และ 3D อ่านจากชุดเดียวกัน */
export const sitePlanSchema = z.object({
  widthM: z.number().positive(),
  depthM: z.number().positive(),
  plotDepthM: z.number().positive(),
  roadY0: z.number(),
  roadY1: z.number(),
  entryY: z.number(),
  amenities: z.array(amenitySchema),
});

export const nearbyPlaceSchema = z.object({
  name: z.string().min(1),
  ...tr(z.object({ name: enText })),
  km: z.number().positive(),
  mins: z.number().int().positive(),
});

/** ข้อความหนึ่งบรรทัดตามคำของผู้พัฒนา (ไม่ใช่ข้อเท็จจริงที่เราตรวจเอง) — หน้าเว็บกำกับว่าผู้พัฒนาระบุ */
export const claimSchema = z.object({
  text: z.string().min(1),
  ...tr(z.object({ text: enText })),
});

/* ทำเล — ระยะทางและเวลาเป็นค่าโดยประมาณ ต้องกำกับคำว่า "ประมาณ" ทุกจุดที่แสดงผล
   nearby (มีระยะและเวลา) ว่างได้ — ห้ามแต่งระยะทางขึ้นเอง มีแค่ชื่อสถานที่ใกล้เคียงให้ใส่ landmarks
   directions = วิธีเข้าโครงการตามคำของผู้พัฒนา */
export const locationSchema = z.object({
  district: z.string().min(1),
  province: z.string().min(1),
  ...tr(z.object({ district: enText, province: enText })),
  lat: z.number(),
  lng: z.number(),
  approximate: z.boolean(),
  nearby: z.array(nearbyPlaceSchema).default([]),
  landmarks: z
    .array(z.object({ name: z.string().min(1), ...tr(z.object({ name: enText })) }))
    .default([]),
  directions: z.array(claimSchema).default([]),
});

/* ภาพที่วางแผนจะถ่าย — หน้าแกลเลอรีใช้สร้างช่องว่างที่ออกแบบไว้แล้ว ไม่ใช่กล่องเทา */
export const plannedShotSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  note: z.string().min(1),
  ...tr(z.object({ title: enText, note: enText })),
  ratio: z.enum(["4:3", "3:4", "16:9"]),
});

/* ฟอร์มลงทะเบียน — ข้อความ error บอกวิธีแก้ ไม่ขอโทษ (DESIGN-SPEC §6) */
export const contactChannelSchema = z.enum(["phone", "line"]);
export const contactTimeSchema = z.enum(["morning", "afternoon", "evening", "any"]);
/** ช่วงงบเป็นล้านบาท "6-7" — ช่วงคำนวณจากราคาแปลงจริงใน lib/lead.ts ไม่ได้ตั้งเอง · "" = ไม่ระบุ */
export const budgetSchema = z.union([z.literal(""), z.string().regex(/^\d+-\d+$/)]);

export const leadFormSchema = z.object({
  name: z.string().trim().min(2, "กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร"),
  phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{8,9}$/, "เบอร์โทรขึ้นต้นด้วย 0 และมี 9-10 หลัก ไม่ต้องเว้นวรรค"),
  email: z.union([z.string().trim().email("อีเมลต้องมี @ และชื่อโดเมน"), z.literal("")]),
  /** โครงการที่สนใจ (projects.json → id) · "" = ยังไม่ได้เลือก */
  projectId: z.string(),
  plotId: z.string(),
  houseTypeSlug: z.string(),
  budget: budgetSchema,
  channel: contactChannelSchema,
  lineId: z.string().trim().max(40, "LINE ID ยาวเกิน 40 ตัวอักษร ตรวจว่าไม่ได้วางข้อความอื่นติดมา"),
  contactTime: contactTimeSchema,
  message: z.string().max(500, "ข้อความยาวเกิน 500 ตัวอักษร"),
  /* PDPA: รับทราบนโยบายเป็นเงื่อนไขของการส่ง · รับข่าวสารแยกช่อง ไม่บังคับ ไม่ติ๊กไว้ก่อน */
  privacyAck: z.literal(true, {
    error: "ติ๊กช่องนี้เพื่อยืนยันว่ารับทราบนโยบายความเป็นส่วนตัวแล้ว จึงจะส่งได้",
  }),
  marketingOptIn: z.boolean(),
});

export type LeadForm = z.infer<typeof leadFormSchema>;
export type ContactChannel = z.infer<typeof contactChannelSchema>;
export type ContactTime = z.infer<typeof contactTimeSchema>;

/* หลักฐานความยินยอม — เก็บคู่กับ lead ทุกแถว: กดส่งเมื่อไร รับทราบนโยบายฉบับไหน รับข่าวสารหรือไม่ */
export const leadConsentSchema = z.object({
  privacyVersion: z.string().min(1),
  /** ISO timestamp ตอนกดส่ง */
  at: z.string().min(1),
  marketing: z.boolean(),
});

/* แถว lead ที่บันทึกจริง — ช่องที่เพิ่มทีหลังมีค่า default ให้แถวเก่าที่ส่งก่อนมีช่องนั้นยังอ่านได้
   consent = null คือแถวที่ส่งก่อนฟอร์มมีช่องยินยอม (admin แสดงว่าไม่มีบันทึก)
   locale = ภาษาของหน้าฟอร์มที่กดส่ง ทีมขายโทรกลับเป็นภาษานั้น · null = แถวที่ส่งก่อนเริ่มบันทึกภาษา */
export const leadSchema = leadFormSchema.omit({ privacyAck: true, marketingOptIn: true }).extend({
  /* แถวที่ส่งก่อนเว็บมีหลายโครงการ = "" · หลังบ้านหาโครงการจากแปลงที่เลือกแทน */
  projectId: z.string().default(""),
  budget: budgetSchema.default(""),
  channel: contactChannelSchema.default("phone"),
  lineId: z.string().default(""),
  contactTime: contactTimeSchema.default("any"),
  consent: leadConsentSchema.nullable().default(null),
  locale: z.enum(LOCALES).nullable().default(null),
  createdAt: z.string().min(1),
});

/* ค่าที่เจ้าของโครงการยังไม่ได้ให้มา = null แล้วหน้าเว็บแสดง "รอข้อมูลจริง"
   ห้ามเติมค่าที่ดูเหมือนจริงแทน (CLAUDE.md ข้อ 6) — ใส่ค่าจริงใน site.json แล้วทุกหน้าเปลี่ยนเอง */
const pendingText = z.string().trim().min(1).nullable();

/* เอกสารกฎหมาย — เลขฉบับเก็บลง lead ตอนกดส่ง · draft = ยังไม่ผ่านทนาย */
export const legalDocSchema = z.object({
  version: z.string().min(1),
  draft: z.boolean(),
  /** วันที่มีผล YYYY-MM-DD · null = ยังไม่ประกาศใช้ */
  effectiveDate: z.iso.date().nullable(),
});

export const privacyNoticeSchema = legalDocSchema.extend({
  dpoEmail: z.email().nullable(),
  dpoPhone: pendingText,
  /** ระยะเวลาเก็บข้อมูลลงทะเบียน เช่น "2 ปีนับจากวันที่ลงทะเบียน" */
  retention: pendingText,
  /** ผู้ให้บริการที่ประมวลผลข้อมูลแทนโครงการ (ระบบเก็บข้อมูล ระบบส่งข้อความ) */
  processors: pendingText,
  /** ส่งหรือเก็บข้อมูลนอกประเทศไทยหรือไม่ ที่ไหน */
  crossBorder: pendingText,
});

export const termsSchema = legalDocSchema.extend({
  /** สิ่งที่รวมและไม่รวมในราคาขาย (ค่าโอน ค่าส่วนกลางล่วงหน้า มิเตอร์) */
  priceIncludes: pendingText,
});

export const developerSchema = z.object({
  name: pendingText,
  address: pendingText,
});

/* ข้อมูลที่ประกาศ สคบ. ให้แสดงในโฆษณาที่ดินจัดสรร — ทนายของเจ้าของโครงการยืนยันรายการสุดท้าย */
export const projectLegalSchema = z.object({
  /** เลขที่ใบอนุญาตจัดสรรที่ดิน */
  allocationLicence: pendingText,
  /** เลขโฉนดที่ดินแปลงแม่ */
  titleDeeds: pendingText,
  /** ค่าส่วนกลาง บาท/ตร.ว./เดือน */
  commonFeePerSqwMonth: z.number().positive().nullable(),
});

/* ข้อความโครงการภาษาอังกฤษ — ช่องที่ยังรอ (null) ในภาษาไทยก็ null ที่นี่ได้
   แต่เมื่อใส่ค่าจริงในภาษาไทยแล้ว ต้องมีคู่ภาษาอังกฤษด้วย (siteSettingsSchema ตรวจ) */
export const siteEnSchema = z.object({
  brandName: enText,
  salesHours: pendingText,
  replyTime: pendingText,
  developer: developerSchema,
  legal: z.object({ allocationLicence: pendingText, titleDeeds: pendingText }),
  privacy: z.object({ retention: pendingText, processors: pendingText, crossBorder: pendingText }),
  terms: z.object({ priceIncludes: pendingText }),
});

export const siteSettingsSchema = z
  .object({
    /** ชื่อแบรนด์ผู้ขาย (หัวเว็บ ท้ายเว็บ metadata JSON-LD Organization) — ต่างจาก projectName ซึ่งเป็นชื่อโครงการ */
    brandName: z.string().min(1),
    ...tr(siteEnSchema),
    /** เบอร์ทีมขาย — รูปแบบที่คนอ่าน ลิงก์ tel: สร้างจากตัวเลขในนี้ */
    contactPhone: z.string().regex(/^0\d{1,2}-\d{3}-\d{4}$/, "เบอร์โทรต้องเป็นรูปแบบ 0XX-XXX-XXXX"),
    /** อีเมลทีมขาย — null = ยังไม่มี */
    contactEmail: z.string().email().nullable(),
    /** LINE OA ของแบรนด์ (ขึ้นต้นด้วย @) · null = ยังไม่มีบัญชี */
    lineId: z
      .string()
      .regex(/^@[a-z0-9._-]+$/, "LINE OA ต้องขึ้นต้นด้วย @ ตามด้วยตัวพิมพ์เล็ก ตัวเลข . _ -")
      .nullable(),
    /** ชื่อเพจ Facebook (facebook.com/<ชื่อนี้>) ไม่มี @ · null = ยังไม่มี */
    facebook: z
      .string()
      .regex(/^[A-Za-z0-9.]+$/, "ชื่อเพจ Facebook ใช้ได้เฉพาะตัวอักษรละติน ตัวเลข และจุด")
      .nullable(),
    /** เวลาทำการสำนักงานขาย */
    salesHours: pendingText,
    /** ทีมขายติดต่อกลับภายในเท่าไร — ข้อความหลังส่งฟอร์มใช้ค่านี้ ห้ามสัญญาเกินนี้ */
    replyTime: pendingText,
    developer: developerSchema,
    legal: projectLegalSchema,
    privacy: privacyNoticeSchema,
    terms: termsSchema,
    /** หลังบ้านและฟอร์มลงทะเบียนยังเป็นระบบตัวอย่าง (ข้อมูลเก็บในเบราว์เซอร์) — ข้อมูลโครงการเป็นของจริงแล้ว */
    demo: z.boolean(),
    /** จุดขายที่ผู้พัฒนาลงเหมือนกันทุกโครงการ (คำของผู้พัฒนา) — หน้าเว็บกำกับ "ผู้พัฒนาระบุ" เสมอ */
    developerSpecs: z.array(claimSchema),
    /** ที่มาของข้อมูลผู้พัฒนา และวันที่คัดลอกมา · null = ข้อมูลสมมติของงานพอร์ต ไม่มีต้นทาง */
    developerSource: z.object({ url: z.url(), fetched: z.iso.date() }).nullable(),
    plannedShots: z.array(plannedShotSchema),
  })
  .superRefine((s, ctx) => {
    const paths = [
      "salesHours",
      "replyTime",
      "developer.name",
      "developer.address",
      "legal.allocationLicence",
      "legal.titleDeeds",
      "privacy.retention",
      "privacy.processors",
      "privacy.crossBorder",
      "terms.priceIncludes",
    ];
    const at = (o: unknown, path: string): unknown =>
      path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | null)?.[k], o);
    for (const lang of ["en", "zh"] as const) {
      for (const path of paths) {
        if (at(s, path) !== null && at(s[lang], path) === null) {
          ctx.addIssue({
            code: "custom",
            path: [lang, ...path.split(".")],
            message: `มีค่า ${path} ภาษาไทยแล้ว ต้องใส่ ${lang}.${path} ด้วย`,
          });
        }
      }
    }
  });

export type Furniture = z.infer<typeof furnitureSchema>;
export type FurnitureKind = z.infer<typeof furnitureKindSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type HouseType = z.infer<typeof houseTypeSchema>;
export type PlotStatus = z.infer<typeof plotStatusSchema>;
export type Plot = z.infer<typeof plotSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type GallerySource = z.infer<typeof gallerySourceSchema>;
export type RenderShot = z.infer<typeof renderSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type LeadConsent = z.infer<typeof leadConsentSchema>;
export type SitePlan = z.infer<typeof sitePlanSchema>;
export type SiteLocation = z.infer<typeof locationSchema>;
export type PlannedShot = z.infer<typeof plannedShotSchema>;
export type Amenity = z.infer<typeof amenitySchema>;
export type Claim = z.infer<typeof claimSchema>;
export type ProjectFacts = z.infer<typeof projectFactsSchema>;

export const houseTypesFileSchema = z.array(houseTypeSchema).min(1);
export const plotsFileSchema = z.array(plotSchema).min(1);
export const galleryFileSchema = z.array(galleryImageSchema);

/* ── โครงการ (projects.json) ────────────────────────────────────────────────────
   เว็บของบริษัทมีหลายโครงการ แต่ละโครงการมีผัง แปลง และแบบบ้านของตัวเอง
   แปลงกับแบบบ้านอ้างโครงการด้วย projectId (plots.json / house-types.json) ไม่ซ้อนอยู่ในไฟล์นี้
   status: pending = ยังไม่มีข้อมูลจริงเลย (ช่องข้อมูลเป็น null ทั้งหมด หน้าเว็บแสดงสถานะรอข้อมูล ไม่ index)
           live    = ข้อมูลจริงจากผู้พัฒนา (ชื่อ ทำเล ตัวเลขโครงการ แบบบ้าน ราคาเริ่มต้น)
                     ส่วนที่ยังเป็นตัวอย่างติดป้ายเฉพาะจุดนั้น: แปลนบ้าน (houseType.samplePlan)
                     และผังแปลง (pending.plots = ผังแปลงตัวอย่าง สถานะรายแปลงยังไม่ยืนยัน)
   pending.<ช่อง> = true คือค่านั้นยังไม่ได้รับการยืนยันจากเจ้าของโครงการ (null หรือค่าตัวอย่าง)
   ห้ามเติมชื่อ ทำเล ราคา ที่ดูเหมือนจริงแทนค่าที่ยังไม่มา (CLAUDE.md ข้อ 6) */

export const projectStatusSchema = z.enum(["pending", "live"]);
export const salesStatusSchema = z.enum(["selling", "upcoming", "soldOut"]);

export const projectPendingSchema = z.object({
  name: z.boolean(),
  summary: z.boolean(),
  salesStatus: z.boolean(),
  location: z.boolean(),
  mapUrl: z.boolean(),
  heroStill: z.boolean(),
  plots: z.boolean(),
  prices: z.boolean(),
});

/* ตัวเลขระดับโครงการตามประกาศของผู้พัฒนา — ไม่ได้นับจากแปลงในผัง (ผังแปลงยังเป็นตัวอย่าง) */
export const projectFactsSchema = z.object({
  units: z.number().int().positive(),
  landRai: z.number().positive(),
  /** ปีที่เริ่มสร้าง ค.ศ. — หน้าไทยแสดงเป็น พ.ศ. */
  startedYear: z.number().int().min(1990).max(2100),
  priceLow: z.number().int().positive(),
  priceHigh: z.number().int().positive(),
});

export const projectSchema = z
  .object({
    id: z.string().min(1),
    /** ส่วนของ URL /projects/{slug} — ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น */
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug ใช้ a-z 0-9 และ - เท่านั้น"),
    /** ลำดับที่แสดง และเลขในป้าย "โครงการที่ n" ระหว่างที่ยังไม่มีชื่อ */
    slot: z.number().int().positive(),
    status: projectStatusSchema,
    name: pendingText,
    /** คำอธิบายสั้นหนึ่งถึงสองประโยค */
    summary: pendingText,
    ...tr(z.object({ name: pendingText, summary: pendingText })),
    salesStatus: salesStatusSchema.nullable(),
    /** ลิงก์แผนที่ที่เจ้าของโครงการให้มา · null = ใช้พิกัดใน location (ถ้ามี) */
    mapUrl: z.url().nullable(),
    /** ภาพนิ่งหลักของโครงการ path ใน public เช่น "/renders/village.png" */
    heroStill: z
      .string()
      .regex(/^\/[^/]/, "path ต้องขึ้นต้นด้วย / (ไฟล์ใน public)")
      .nullable(),
    /** ผังโครงการ — null = ยังไม่มีผัง (แปลงของโครงการนี้ต้องไม่มี) */
    plan: sitePlanSchema.nullable(),
    location: locationSchema.nullable(),
    facts: projectFactsSchema.nullable(),
    /** คำของผู้พัฒนาเฉพาะโครงการนี้ (เช่น สมาร์ทโฮมทุกหลัง) — หน้าเว็บกำกับว่าผู้พัฒนาระบุ */
    claims: z.array(claimSchema).default([]),
    /** หน้าประกาศต้นทางของข้อมูลโครงการ และวันที่คัดลอกมา */
    source: z.object({ url: z.url(), fetched: z.iso.date() }).nullable(),
    pending: projectPendingSchema,
  })
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    for (const key of ["name", "summary"] as const) {
      if (p[key] !== null && p.en[key] === null)
        issue(["en", key], `มี ${key} ภาษาไทยแล้ว ต้องใส่ en.${key} ด้วย`);
      if (p[key] === null && !p.pending[key])
        issue(["pending", key], `${key} เป็น null ต้องตั้ง pending.${key} = true`);
    }
    /* mapUrl ว่างได้เมื่อมีพิกัด — ลิงก์แผนที่สร้างจากพิกัด (lib/projects.ts projectMapUrl) */
    const nullable = {
      salesStatus: p.salesStatus,
      location: p.location,
      mapUrl: p.location ? "from-location" : p.mapUrl,
      heroStill: p.heroStill,
    };
    for (const [key, value] of Object.entries(nullable) as [keyof typeof nullable, unknown][]) {
      if (value === null && !p.pending[key])
        issue(["pending", key], `${key} เป็น null ต้องตั้ง pending.${key} = true`);
    }
    if (p.status === "pending") {
      const filled = (
        [
          "name",
          "summary",
          "salesStatus",
          "mapUrl",
          "heroStill",
          "plan",
          "location",
          "facts",
          "source",
        ] as const
      ).filter((k) => p[k] !== null);
      if (filled.length > 0)
        issue(
          ["status"],
          `status "pending" ต้องไม่มีข้อมูล แต่มี ${filled.join(", ")} — เปลี่ยนเป็น "live" เมื่อได้ข้อมูลจริง`,
        );
    }
    if (p.status === "live" && p.name === null)
      issue(["name"], `status "live" ต้องมีชื่อโครงการจริง`);
    if (p.facts && p.facts.priceLow > p.facts.priceHigh)
      issue(["facts", "priceLow"], "priceLow ต้องไม่เกิน priceHigh");
  });

export const projectsFileSchema = z
  .array(projectSchema)
  .min(1)
  .superRefine((list, ctx) => {
    for (const key of ["id", "slug", "slot"] as const) {
      const seen = new Set<unknown>();
      list.forEach((p, i) => {
        if (seen.has(p[key]))
          ctx.addIssue({
            code: "custom",
            path: [i, key],
            message: `${key} ซ้ำ: ${String(p[key])}`,
          });
        seen.add(p[key]);
      });
    }
  });

export type Project = z.infer<typeof projectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type SalesStatus = z.infer<typeof salesStatusSchema>;

/** แปลงและแบบบ้านต้องอ้างโครงการที่มีอยู่จริง แปลงต้องใช้แบบบ้านของโครงการเดียวกัน
    และโครงการที่มีแปลงต้องมีผัง — repo (ตอน build) และ geometry:check เรียกตัวเดียวกันนี้
    คืนรายการปัญหา ว่าง = ผ่าน */
export function projectLinkIssues(
  projects: readonly Project[],
  houseTypes: readonly Pick<HouseType, "id" | "slug" | "projectId" | "landSqw" | "soldOut">[],
  plots: readonly Pick<Plot, "number" | "projectId" | "houseTypeId" | "landSqw" | "status">[],
): string[] {
  const out: string[] = [];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const houseProject = new Map(houseTypes.map((h) => [h.id, h.projectId]));
  const houseById = new Map(houseTypes.map((h) => [h.id, h]));
  /* slug แบบบ้านห้ามซ้ำแม้ต่างโครงการ — ภาพนิ่ง (renders.json, public/renders) อ้างแบบบ้านด้วย slug */
  const slugs = new Set<string>();
  for (const h of houseTypes) {
    if (slugs.has(h.slug))
      out.push(`slug แบบบ้าน "${h.slug}" ซ้ำ — ภาพนิ่งอ้างด้วย slug จึงต้องไม่ซ้ำทั้งเว็บ`);
    slugs.add(h.slug);
  }
  for (const h of houseTypes) {
    const project = byId.get(h.projectId);
    if (!project)
      out.push(`แบบบ้าน ${h.slug} อ้าง projectId "${h.projectId}" ที่ไม่มีใน projects.json`);
    else if (project.status === "pending")
      out.push(
        `แบบบ้าน ${h.slug} อยู่ในโครงการ ${project.id} ที่ยังเป็น pending — เปลี่ยน status ก่อน`,
      );
  }
  for (const p of plots) {
    const project = byId.get(p.projectId);
    if (!project) {
      out.push(`แปลง ${p.number} อ้าง projectId "${p.projectId}" ที่ไม่มีใน projects.json`);
      continue;
    }
    if (project.plan === null)
      out.push(`แปลง ${p.number} อยู่ในโครงการ ${project.id} ซึ่งยังไม่มี plan`);
    const owner = houseProject.get(p.houseTypeId);
    if (owner === undefined)
      out.push(`แปลง ${p.number} อ้าง houseTypeId "${p.houseTypeId}" ที่ไม่มีอยู่จริง`);
    else if (owner !== p.projectId)
      out.push(`แปลง ${p.number} (${p.projectId}) ใช้แบบบ้าน ${p.houseTypeId} ของโครงการ ${owner}`);
    /* ผังแปลงยังเป็นตัวอย่าง แต่ขนาดที่ดินต้องเป็นของจริงของแบบนั้น และแบบที่ขายหมดต้องไม่มีแปลงที่ยังเปิดอยู่ */
    const house = houseById.get(p.houseTypeId);
    if (house && house.landSqw !== p.landSqw)
      out.push(
        `แปลง ${p.number} ที่ดิน ${p.landSqw} ตร.ว. ไม่ตรงกับแบบ ${house.slug} (${house.landSqw} ตร.ว.)`,
      );
    if (house?.soldOut && p.status !== "sold")
      out.push(`แปลง ${p.number} ใช้แบบ ${house.slug} ที่ขายหมดแล้ว สถานะต้องเป็น sold`);
  }
  return out;
}
