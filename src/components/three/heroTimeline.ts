/* ไทม์ไลน์ของฉากหน้าแรก — 3D (FloorPlanScene) และข้อความข้างบ้าน (HeroDiorama) อ่านจากไฟล์นี้ไฟล์เดียว

   แบบร่วงทีละโซน (ทดลอง 2026-10-03 · local เท่านั้น): เริ่มที่แปลงเปล่า กล้องนิ่งมุมเดียว
   หนึ่งจอต่อหนึ่งโซน — ห้องทั้งโซนร่วงลงมาเข้าที่พร้อมกันแบบเหลื่อมนิดๆ (ท่าเดียวกับหลังคาที่เจ้าของชอบ)
   ข้อความซ้ายบอกทุกห้องในโซน · ห้องครบแล้วหลังคาร่วงลงปิด
   (เจ้าของไม่ชอบกล้องหมุนซ้ายขวา · แบบทีละห้องเลื่อนนานเกิน · แบบไฟส่องโซนนิ่งเกิน)

   หน่วยของช่วงคือ "จอ" */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);

export type Zone = "living" | "sleep" | "bath";
const ZONES: readonly Zone[] = ["living", "sleep", "bath"];

/* ponytail: โซนอ่านจาก id ห้อง (bed* = นอน · bath* = น้ำ · ที่เหลือ = นั่งเล่น) — ทุกแบบใน data ตอนนี้ตั้ง id แบบนี้
   ถ้ามีแบบที่ id ไม่ตามนี้ ให้เพิ่มฟิลด์ zone ในห้องของ house-types.json แทน */
export const zoneOf = (id: string): Zone =>
  /bed/.test(id) ? "sleep" : /bath/.test(id) ? "bath" : "living";

/** ความยาวแต่ละจังหวะเป็นจอ — เฟรมแรก (ชื่อแบรนด์) · หนึ่งโซน · หลังคาลงแล้วค้าง */
const LEN = { intro: 1, zone: 1, done: 1.2 } as const;
/** ในช่วงของโซน: ห้องแรกเริ่มร่วงที่ 5% · ห้องสุดท้ายเริ่มที่ 35% · แต่ละห้องใช้เวลาร่วง 25% ของช่วง */
const DROP = { first: 0.05, spread: 0.3, fall: 0.25 } as const;

export type HeroStep =
  | { kind: "zone"; zone: Zone; ids: string[]; a: number; b: number }
  | { kind: "done"; a: number; b: number };

type RoomLike = { id: string; floor?: number | undefined };

/** ลำดับของฉากจากห้องชั้นล่างของแบบ — a/b เป็นสัดส่วน 0-1 ของทางวิ่ง */
export function heroScript(rooms: readonly RoomLike[]) {
  const ground = rooms.filter((r) => (r.floor ?? 1) === 1);
  const raw: HeroStep[] = [];
  let s = LEN.intro;
  for (const zone of ZONES) {
    const ids = ground.filter((r) => zoneOf(r.id) === zone).map((r) => r.id);
    if (ids.length === 0) continue;
    raw.push({ kind: "zone", zone, ids, a: s, b: s + LEN.zone });
    s += LEN.zone;
  }
  raw.push({ kind: "done", a: s, b: s + LEN.done });
  s += LEN.done;
  const steps = raw.map((x) => ({ ...x, a: x.a / s, b: x.b / s }));
  /* ช่วงร่วงของแต่ละห้อง — ห้องในโซนเดียวกันเหลื่อมกันตามลำดับใน data */
  const drops = new Map<string, readonly [number, number]>();
  for (const st of steps) {
    if (st.kind !== "zone") continue;
    const len = st.b - st.a;
    st.ids.forEach((id, i) => {
      const k = st.ids.length > 1 ? i / (st.ids.length - 1) : 0;
      const a = st.a + len * (DROP.first + DROP.spread * k);
      drops.set(id, [a, a + len * DROP.fall]);
    });
  }
  const done = steps[steps.length - 1]!;
  const len = done.b - done.a;
  return {
    steps,
    drops,
    /** จำนวนจอของทางวิ่งทั้งหมด */
    screens: s,
    /** หลังคาลง — กล้องถอยในช่วงเดียวกันให้จั่วอยู่ในกรอบ */
    cap: [done.a + len * 0.1, done.a + len * 0.6] as const,
  };
}

/** ห้องร่วงลงเข้าที่แค่ไหน 0 = ยังไม่มา · 1 = เข้าที่แล้ว */
export const dropOf = (span: readonly [number, number], p: number) =>
  smooth(seg(p, span[0], span[1]));

export const capOf = (cap: readonly [number, number], p: number) => seg(p, cap[0], cap[1]);
