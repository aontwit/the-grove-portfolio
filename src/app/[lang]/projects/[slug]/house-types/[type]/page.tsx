import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, houseImage, houseJsonLd } from "@/app/_meta/jsonld";
import { roomArea, roomDepth, roomWidth } from "@/geometry";
import { ButtonLink } from "@/components/site/ButtonLink";
import { HouseName } from "@/components/site/HouseName";
import { PlanLayout } from "@/components/site/PlanLayout";
import { PlanViewer } from "@/components/site/PlanViewer";
import { RoomPanel } from "@/components/site/RoomPanel";
import { ProjectContext } from "@/components/site/ProjectContext";
import { Page, Section } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { SampleNote } from "@/components/site/SampleNote";
import { lowestOpen, priceFrom, priceNote, sqmText, sqw } from "@/lib/format";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { houseHref, masterPlanHref, registerHref } from "@/lib/routes";
import { isOpen } from "@/lib/status";
import { projectMetadata, projectOf } from "../../../_project";

type Params = Promise<{ lang: string; slug: string; type: string }>;

/* lang มาจาก generateStaticParams ของ [lang]/layout — ที่นี่คืนคู่ โครงการ × แบบบ้าน ของทุกโครงการที่มีข้อมูล */
/* slug ที่ไม่อยู่ในรายการ (รวมโครงการที่ยังรอข้อมูลสำหรับหน้าย่อย) = 404 จริง ไม่ใช่หน้า not-found ที่ตอบ 200 ใต้ loading */
export const dynamicParams = false;

export function generateStaticParams() {
  return repo
    .listProjects()
    .flatMap((project) =>
      repo.listHouseTypes(undefined, project.id).map((h) => ({ slug: project.slug, type: h.slug })),
    );
}

/** แบบบ้านของโครงการนี้เท่านั้น — slug ของแบบบ้านโครงการอื่นใต้ URL โครงการนี้ = 404 */
async function houseOf(params: Params) {
  const { lang, project } = await projectOf(params, { content: true });
  const { type } = await params;
  const house = repo.listHouseTypes(lang, project.id).find((h) => h.slug === type);
  return { lang, project, house };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, project, house } = await houseOf(params);
  if (!house) return {};
  const t = getDictionary(lang);
  const image = houseImage(house);
  /* ไม่ใส่ราคาในคำอธิบาย — ราคาในเว็บต้องมาคู่เชิงอรรถ priceNote เสมอ ซึ่งข้อความที่ถูกแชร์ออกไปพาไปด้วยไม่ได้ */
  return projectMetadata(project, {
    lang,
    title: `${t.house.metaTitle(house.name)} · ${projectLabel(project, lang)}`,
    path: houseHref(project.slug, house.slug),
    description: house.samplePlan ? t.house.metaDescription(house.highlight) : house.highlight,
    image: image ? { url: image, alt: t.meta.houseImageAlt(house.name) } : undefined,
  });
}

export default async function HouseTypePage({ params }: { params: Params }) {
  const { lang, project, house } = await houseOf(params);
  if (!house) notFound();
  const t = getDictionary(lang);
  const l = t.common.labels;

  const plots = repo.listPlots(project.id);
  const onThisType = plots.filter((p) => p.houseTypeId === house.id);
  const openHere = onThisType.filter((p) => isOpen(p.status));
  const indoor = house.rooms.filter((r) => !r.outdoor);
  /* ราคาเริ่มต้นของแปลงที่ยังเปิดอยู่ของแบบนี้ (ยังไม่มีราคารายแปลง = ราคาเริ่มต้นที่ผู้พัฒนาประกาศ) */
  const from = lowestOpen(plots, [house], house.id);
  const stills = repo
    .listRenders(lang)
    .filter((r) => r.slug === house.slug && r.view === "iso" && !r.empty);

  return (
    <Page title={<HouseName house={house} lang={lang} />} lead={house.highlight}>
      <ProjectContext project={project} lang={lang} />
      <JsonLd data={houseJsonLd(house, lang, project)} />
      <dl className="text-15 mt-6 flex flex-wrap gap-x-8 gap-y-3">
        {(
          [
            [l.area, sqmText(house.areaSqm, lang)],
            [l.storeys, `${house.storeys}`],
            [l.beds, `${house.beds}`],
            [l.baths, `${house.baths}`],
            [l.parking, t.common.parkingValue(house.parking)],
            [l.land, sqw(house.landSqw, lang)],
            [l.price, from === null ? t.common.noAvailable : priceFrom(from, lang)],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-moss">{label}</dt>
            <dd className="font-display text-17 font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-13 text-moss mt-3 max-w-[70ch]">{priceNote(lang)}</p>

      {/* panel ห้องอยู่ขอบบนเสมอกับกรอบแปลน และ sticky ไว้ เลือกห้องแล้วเห็นรายละเอียดทันที */}
      <PlanLayout
        viewer={<PlanViewer house={house} stills={stills} />}
        panel={<RoomPanel house={house} />}
      />

      {/* ตารางห้องกับการ์ดชวนไปเลือกแปลงอยู่แถวเดียวกัน — ไม่ปล่อยตารางแคบๆ ลอยอยู่ครึ่งหน้า */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Section title={house.samplePlan ? t.house.roomsTitleSample : t.house.roomsTitle}>
          {house.samplePlan && <SampleNote kind="plan" className="mt-3" />}
          <table className="text-15 mt-5 w-full">
            <thead>
              <tr className="border-concrete text-moss border-b text-left">
                {house.storeys > 1 && <th className="py-2 font-medium">{t.house.th.floor}</th>}
                <th className="py-2 font-medium">{t.house.th.room}</th>
                <th className="py-2 font-medium">{t.house.th.size}</th>
                <th className="py-2 text-right font-medium">{t.house.th.area}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {house.rooms.map((r) => (
                <tr key={r.id} className="border-concrete border-b">
                  {house.storeys > 1 && <td className="py-2.5">{r.floor}</td>}
                  <td className="py-2.5">
                    {r.name}
                    {r.outdoor && <span className="text-13 text-moss">{t.house.outdoor}</span>}
                  </td>
                  <td className="font-display py-2.5 font-medium">
                    {t.house.dims(roomWidth(r).toFixed(2), roomDepth(r).toFixed(2))}
                  </td>
                  <td className="font-display py-2.5 text-right font-medium">
                    {roomArea(r).toFixed(2)} {t.units.sqm}
                  </td>
                </tr>
              ))}
              <tr>
                {house.storeys > 1 && <td />}
                <td className="text-moss py-2.5">
                  {house.samplePlan ? t.house.totalSample : t.house.total}
                </td>
                <td />
                <td className="font-display py-2.5 text-right font-medium">
                  {indoor.reduce((s, r) => s + roomArea(r), 0).toFixed(2)} {t.units.sqm}
                </td>
              </tr>
            </tbody>
          </table>
          {/* ขอบห้องในข้อมูลคือเส้นกึ่งกลางผนัง (geometry: ผนังคร่อมเส้นขอบข้างละครึ่ง) — จึงกำกับ "ประมาณ" ด้านบน */}
          <p className="text-13 text-moss mt-3">
            {house.samplePlan ? t.house.measureNoteSample(house.areaSqm) : t.house.measureNote}
          </p>
        </Section>

        <Section title={t.house.plotsTitle}>
          <div className="border-concrete rounded-card mt-5 border p-5">
            <p className="text-15 text-moss">
              {t.house.plotsCount(onThisType.length, house.name, openHere.length)}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <ButtonLink href={masterPlanHref(project.slug)}>{t.house.pickFromPlan}</ButtonLink>
              <ButtonLink
                href={registerHref({ project: project.slug, type: house.slug })}
                variant="secondary"
              >
                {t.house.registerType}
              </ButtonLink>
            </div>
          </div>
        </Section>
      </div>
    </Page>
  );
}
