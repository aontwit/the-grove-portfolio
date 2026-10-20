import { ButtonLink } from "@/components/site/ButtonLink";
import { FactList } from "@/components/site/FactList";
import { HouseName } from "@/components/site/HouseName";
import { HouseOutline } from "@/components/three/HouseOutline";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { SampleNote } from "@/components/site/SampleNote";
import { lowestOpen, priceFrom, sqmText } from "@/lib/format";
import { houseHref } from "@/lib/routes";
import type { HouseType, Plot } from "@/lib/schemas";

/* ราคาบนการ์ดคือแปลงที่ยังเปิดอยู่ที่ถูกที่สุดของแบบนี้ (lowestOpen) — ยังไม่มีราคารายแปลง
   จึงเท่ากับราคาเริ่มต้นที่ผู้พัฒนาประกาศ · ทุกแปลงปิดแล้ว (แบบขายหมด) = "ขายหมดแล้ว"
   หน้าที่วางการ์ดต้องมีเชิงอรรถ PRICE_NOTE (lib/format) เพราะค่ามีเครื่องหมาย *
   ผังย่อเป็นแปลนตัวอย่างเมื่อ samplePlan — ติดป้ายใต้ผังเสมอ */
export function HouseCard({
  house,
  plots,
  lang,
  headingLevel = "h3",
  frameSize,
  projectSlug,
}: {
  /** โครงการของแบบบ้านนี้ — ลิงก์ไปหน้าแบบบ้านใต้โครงการ */
  projectSlug: string;
  /** แบบบ้านของภาษาหน้า (repo.listHouseTypes(lang)) */
  house: HouseType;
  lang: Locale;
  /** แปลงทั้งโครงการ — ใช้หาราคาเริ่มต้นของแปลงที่ยังว่าง */
  plots: readonly Plot[];
  /** กรอบร่วมของภาพแปลนย่อ — ส่งมาเมื่อการ์ดถูกวางเรียงเทียบกัน */
  frameSize?: { w: number; d: number };
  /* หน้าแบบบ้านมี h1 แล้วตามด้วยการ์ดเลย จึงต้องเป็น h2 — หน้าแรกการ์ดอยู่ใต้ h2 จึงเป็น h3 */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const from = lowestOpen(plots, [house], house.id);
  const t = getDictionary(lang);
  return (
    <article className="border-concrete rounded-card flex flex-col border p-5">
      <div className="bg-canvas rounded-control mb-4 p-4">
        <HouseOutline house={house} frameSize={frameSize} />
        {house.samplePlan && <SampleNote kind="plan" className="mt-3" />}
      </div>
      <Heading className="text-26">
        <HouseName house={house} lang={lang} />
      </Heading>
      <p className="text-15 text-moss mt-1 mb-4">{house.highlight}</p>
      <FactList
        className="mb-5"
        rows={[
          [t.common.labels.area, sqmText(house.areaSqm, lang)],
          [t.houseCard.bedsBaths, `${house.beds} / ${house.baths}`],
          [t.common.labels.land, `${house.landSqw} ${t.units.sqw}`],
          [t.common.labels.price, from === null ? t.common.noAvailable : priceFrom(from, lang)],
        ]}
      />
      <ButtonLink href={houseHref(projectSlug, house.slug)} variant="secondary" className="mt-auto">
        {t.houseCard.cta(house.name)}
      </ButtonLink>
    </article>
  );
}
