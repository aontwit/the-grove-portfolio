/* ลิงก์ช่องทางติดต่อของแบรนด์ — footer หน้าลงทะเบียน และ JSON-LD สร้างจากที่นี่ที่เดียว
   ค่าใน site.json ผ่าน zod (schemas.ts) แล้ว: เบอร์เป็น 0XX-XXX-XXXX, LINE ขึ้นต้น @, เพจ Facebook ไม่มี @
   จึงต่อเข้า URL ได้ตรงๆ ไม่ต้อง encode (ลิงก์ LINE ต้องคง @ ไว้ตามรูปแบบที่ LINE กำหนด) */

/** tel: ที่โทรออกได้ทั้งในไทยและจากต่างประเทศ — เก็บเลขในประเทศไว้ตามที่พิมพ์ใน site.json */
export const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

/** เบอร์รูปแบบสากล (+66) สำหรับ structured data */
export const intlPhone = (phone: string) => `+66${phone.replace(/[^0-9]/g, "").replace(/^0/, "")}`;

/** เปิดหน้าเพิ่มเพื่อนของ LINE OA — บนมือถือเด้งเข้าแอป LINE */
export const lineHref = (id: string) => `https://line.me/R/ti/p/${id}`;

export const facebookHref = (page: string) => `https://www.facebook.com/${page}`;
