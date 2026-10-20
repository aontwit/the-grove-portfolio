import { dioramaBox } from "@/geometry/exterior";
import type { HouseType } from "@/lib/schemas";

/* กรอบกล้องของฉากเปิดหน้าแรก — คำนวณบน server (page.tsx) แล้วส่งเป็นตัวเลขให้ HeroDiorama
   ย้ายออกจาก component 2026-10-02 (งานความเร็ว): dioramaBox() ต้องคำนวณรูปทรงภายนอกบ้านทั้งหลัง
   (geometry/exterior ~1,000 บรรทัด) ถ้าทำใน client มันติดไปกับ JS ก้อนแรกของหน้าแรกและกิน main thread ~90 ms
   บนมือถือระหว่าง hydrate ทั้งที่ค่าไม่เปลี่ยนเลยตั้งแต่ build · ค่ายังมาจาก src/geometry ชุดเดียวกับทุกมุมมอง */

export type HeroBox = { w: number; d: number; h: number; cx: number; cz: number };

export type HeroStage = {
  /** กล่องเดียวกับหน้าแบบบ้านและภาพนิ่ง (dioramaFrame) — ภาพนิ่ง LCP ทับโมเดลพอดี */
  box: HeroBox;
  /** กล่องปลายทาง = บ้านเดิมปิดหลังคา (สูงถึงยอดจั่ว) — กล้องถอยแค่ให้หลังคาอยู่ในกรอบ */
  wideBox: HeroBox;
};

export function heroStage(house: HouseType): HeroStage {
  return { box: dioramaBox(house, 1), wideBox: dioramaBox(house, 1, undefined, { closed: true }) };
}
