import type { Locale } from "@/i18n/config";
import { repo } from "@/lib/repo";
import type { HouseType } from "@/lib/schemas";

/* ชื่อแบบบ้าน — หน้าภาษาอังกฤษใช้ชื่ออังกฤษ ("Bai Bua") แล้ววางชื่อไทยต่อท้ายสีรอง
   (ชื่อที่เหมือนกันทั้งสองภาษา เช่น "ลมเย็น" ไม่ต่อซ้ำ)
   คนที่โทรหาทีมขายหรือมาดูหน้างานจะได้เรียกชื่อเดียวกับป้ายในโครงการ · ภาษาไทยแสดงชื่อเดียว
   house = แบบบ้านของภาษาหน้า (repo.getHouseType(slug, lang)) · ชื่อไทยอ่านจาก repo ไม่ใส่ซ้ำใน data */
export function HouseName({ house, lang }: { house: HouseType; lang: Locale }) {
  if (lang === "th") return <>{house.name}</>;
  const thai = repo.getHouseType(house.slug)?.name;
  return (
    <>
      {house.name}
      {thai && thai !== house.name && (
        <>
          {" "}
          <span lang="th" className="text-moss">
            {thai}
          </span>
        </>
      )}
    </>
  );
}
