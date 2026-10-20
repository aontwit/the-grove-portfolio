import { Wordmark } from "@/components/site/BrandMark";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { NavLinks } from "@/components/site/NavLinks";
import { Shell } from "@/components/site/Shell";
import { Link } from "@/i18n/client";

/* หัวเว็บ: โลโก้แบรนด์ The Grove · เมนูหลัก · ปุ่มสลับภาษา
   จอแคบกว่า 768px (md) ปุ่มภาษาอยู่ขวาสุดของแถวโลโก้ (แถวสูง 44px อยู่แล้ว) เมนูอยู่แถวล่างเต็มความกว้าง
   md ขึ้นไปโลโก้กับเมนูอยู่แถวเดียว: เนื้อที่ 720px พอสำหรับโลโก้ ~156px (ฟอนต์ fallback) + เมนู 6 รายการ 402px + ปุ่มภาษา
   เหลือราว 10% — ที่ 640px (sm) เมนูได้แค่ ~384px ไทยตัดสองแถวตามฟอนต์ = CLS จึงไม่ใช้ sm
   จอกว้าง ปุ่มภาษาต่อท้ายเมนู — วาดสองที่แล้วซ่อนที่หนึ่งด้วย display:none (ไม่อยู่ในลำดับ Tab ซ้ำ)
   ลำดับ Tab จึงตรงกับที่ตาเห็นทุกขนาดจอ */
export function SiteHeader() {
  return (
    <header className="border-concrete border-b">
      <Shell className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          {/* โลโก้แบรนด์ (กว้าง/สูงคงที่ ไม่ขึ้นกับฟอนต์ไทย) — ชื่อของลิงก์คือ "The Grove" ที่ตาเห็น */}
          <Link href="/" className="inline-flex min-h-11 items-center self-start">
            <Wordmark />
          </Link>
          <LanguageSwitcher className="-mr-1.5 inline-flex md:hidden" />
        </div>
        {/* จอแคบเป็น block ให้เมนู (grid 3 คอลัมน์) กว้างเต็มแถวเหมือนเดิม */}
        <div className="md:flex md:items-center md:gap-x-4">
          <NavLinks />
          <LanguageSwitcher className="hidden md:inline-flex" />
        </div>
      </Shell>
    </header>
  );
}
