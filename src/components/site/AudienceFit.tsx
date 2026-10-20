import Image from "next/image";
import { houseBounds } from "@/geometry";
import { FactList } from "@/components/site/FactList";
import { HouseName } from "@/components/site/HouseName";
import { SampleNote } from "@/components/site/SampleNote";
import { HouseOutline } from "@/components/three/HouseOutline";
import { getDictionary } from "@/i18n";
import { Link as LocaleLink } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { lowestOpen, priceFrom, sqmText, sqw } from "@/lib/format";
import { houseHref } from "@/lib/routes";
import type { HouseType, Plot } from "@/lib/schemas";

/* เทียบแบบบ้านในโครงการ — ตัวเลขทุกตัว (ขนาด ห้อง ที่ดิน จอดรถ ราคาเริ่มต้น) ตามประกาศของผู้พัฒนา
   ผังชั้นล่างย่อมาจาก rooms ของแบบนั้น ซึ่งตอนนี้เป็นแปลนตัวอย่าง (samplePlan) — ติดป้ายใต้ผังทุกใบ
   ยังไม่เขียนว่าแบบไหน "เหมาะกับใคร": เหตุผลแบบนั้นต้องชี้กลับไปที่ห้องจริงได้ ซึ่งรอแปลนจริงก่อน (§6) */

/** คำอธิบายผังสำหรับ screen reader — ขนาดจาก houseBounds() ชุดเดียวกับเส้นบอกระยะในภาพ */
function planLabel(house: HouseType, lang: Locale) {
  const b = houseBounds(house.rooms.filter((r) => (r.floor ?? 1) === 1));
  const label = getDictionary(lang).fit.planLabel(
    house.name,
    (b.x1 - b.x0).toFixed(2),
    (b.z1 - b.z0).toFixed(2),
  );
  return house.samplePlan ? `${label} · ${getDictionary(lang).common.samplePlan}` : label;
}

export function AudienceFit({
  houses,
  plots,
  frameSize,
  lang,
  projectSlug,
}: {
  /** โครงการของแบบบ้านชุดนี้ — ลิงก์ท้ายการ์ดชี้เข้าหน้าแบบบ้านใต้โครงการ */
  projectSlug: string;
  /** แบบบ้านของภาษาหน้า (repo.listHouseTypes(lang)) */
  houses: HouseType[];
  lang: Locale;
  /** ราคาที่โชว์คือแปลงที่ยังเปิดอยู่ที่ถูกที่สุดของแบบนั้น (lowestOpen) แบบเดียวกับ HouseCard
      รูป "เริ่มต้น … ล้านบาท*" — เชิงอรรถ PRICE_NOTE อยู่ในหน้าโครงการแล้ว (แถบหมึกใต้ท่อนเปิด) */
  plots: Plot[];
  /** กรอบร่วมของผังย่อ — ทุกแบบวาดที่สเกลเดียวกัน */
  frameSize: { w: number; d: number };
}) {
  const t = getDictionary(lang);
  return (
    <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
      {houses.map((house) => {
        const from = lowestOpen(plots, [house], house.id);
        return (
          <li key={house.id}>
            <HouseOutline
              house={house}
              frameSize={frameSize}
              annotate
              className="bg-paper rounded-card border-concrete border"
              label={planLabel(house, lang)}
            />
            {house.samplePlan && <SampleNote kind="plan" className="mt-3" />}
            <h3 className="font-display text-26 text-pine mt-6 font-medium">
              <HouseName house={house} lang={lang} />
            </h3>
            <p className="text-15 text-moss mt-2">
              {t.common.kindValue(house.kind, house.storeys)}
            </p>
            <FactList
              className="mt-5"
              rows={[
                [t.fit.size, t.fit.sizeValue(house.storeys, house.beds, house.baths)],
                [t.common.labels.area, sqmText(house.areaSqm, lang)],
                [t.common.labels.land, sqw(house.landSqw, lang)],
                [t.common.labels.parking, t.common.parkingValue(house.parking)],
                [
                  t.common.labels.price,
                  from === null ? t.common.noAvailable : priceFrom(from, lang),
                ],
              ]}
            />
            {/* ภาพนิ่งจากโมเดล 3D ของแบบนี้ (scripts/render-stills.mjs) — ทั้งแถวคือลิงก์ แตะง่ายเกิน 44px */}
            <LocaleLink
              href={houseHref(projectSlug, house.slug)}
              className="text-15 text-pine mt-6 flex min-h-11 items-center gap-4 font-medium"
            >
              <Image
                src={`/renders/${house.slug}-iso.png`}
                alt=""
                width={1440}
                height={1080}
                sizes="8rem"
                className="rounded-card border-concrete bg-paper w-32 shrink-0 border"
              />
              <span className="underline underline-offset-4">{t.common.seeType(house.name)}</span>
            </LocaleLink>
          </li>
        );
      })}
    </ul>
  );
}
