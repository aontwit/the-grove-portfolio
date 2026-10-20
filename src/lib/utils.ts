/** ต่อ class เข้าด้วยกัน ข้ามค่าที่เป็น false/undefined — ไม่ต้องมี tailwind-merge
    เพราะไม่มี component ไหนในเว็บนี้ให้ผู้เรียกทับ utility ที่ชนกันเอง */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** คั่นหลักพันของจำนวนเงิน — ทุกที่ที่แสดงราคาใช้ตัวนี้ ไม่ต้องเขียน regex ซ้ำ */
export function baht(n: number) {
  return n.toLocaleString("en-US");
}
