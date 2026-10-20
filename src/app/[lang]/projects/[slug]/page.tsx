import type { Metadata } from "next";
import Image from "next/image";
import { JsonLd, projectJsonLd } from "@/app/_meta/jsonld";
import { houseBounds } from "@/geometry";
import { AudienceFit } from "@/components/site/AudienceFit";
import { ButtonLink } from "@/components/site/ButtonLink";
import { DaylightStudy } from "@/components/site/DaylightStudy";
import { DeveloperSpecs } from "@/components/site/DeveloperSpecs";
import { OpeningStatement } from "@/components/site/OpeningStatement";
import { InfoList } from "@/components/site/Pending";
import { PlotBoard } from "@/components/site/PlotBoard";
import { ProjectTag } from "@/components/site/ProjectTag";
import { projectFactRows, projectNumbers, projectPlace } from "@/components/site/ProjectsOverview";
import { SampleNote } from "@/components/site/SampleNote";
import { Band, Page, Section, Shell } from "@/components/site/Shell";
import { TravelTimes } from "@/components/site/TravelTimes";
import { VoicesPending } from "@/components/site/VoicesPending";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import { priceNote } from "@/lib/format";
import { hasContent, projectLabel } from "@/lib/projects";
import {
  PROJECTS_PATH,
  houseHref,
  houseTypesHref,
  locationHref,
  masterPlanHref,
  projectHref,
  registerHref,
} from "@/lib/routes";
import type { Project } from "@/lib/schemas";
import { statusCounts } from "@/lib/status";
import { projectMetadata, projectOf, projectSlugs, type ProjectParams } from "../_project";

/* หน้าแรกของโครงการ — ภาพนิ่ง → ตัวเลขตามประกาศของผู้พัฒนา → แบบบ้าน → ผัง → ทำเล → แดด → เดินดู
   → สิ่งที่ผู้พัฒนาระบุ → ลงทะเบียน
   ตัวเลขโครงการ (จำนวนบ้าน ไร่ ช่วงราคา ปีที่เริ่มสร้าง) มาจาก project.facts ไม่ได้นับจากแปลงในผัง
   ส่วนที่ยังเป็นตัวอย่าง (แปลนบ้าน ผังแปลง) ติดป้าย SampleNote ทุกจุดที่แสดง
   โครงการที่ยังรอข้อมูล (pending) ได้หน้าบอกสถานะตามจริงแทน ไม่มีตัวเลขหรือชื่อแต่งขึ้น */

/* slug ที่ไม่อยู่ในรายการ (รวมโครงการที่ยังรอข้อมูลสำหรับหน้าย่อย) = 404 จริง ไม่ใช่หน้า not-found ที่ตอบ 200 ใต้ loading */
export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs();
}

export async function generateMetadata({ params }: { params: ProjectParams }): Promise<Metadata> {
  const { lang, project } = await projectOf(params);
  const p = getProjectsDictionary(lang);
  const name = projectLabel(project, lang);
  const path = projectHref(project.slug);
  if (!hasContent(project)) {
    return projectMetadata(project, {
      lang,
      title: name,
      path,
      description: p.pending.metaDescription(name),
    });
  }
  const n = projectNumbers(project, lang);
  return projectMetadata(project, {
    lang,
    title: name,
    path,
    description: p.project.metaDescription(
      name,
      project.facts?.units ?? n.plots.length,
      n.houses.length,
      projectPlace(project, lang),
    ),
    image: project.heroStill ? { url: project.heroStill, alt: p.card.stillAlt(name) } : undefined,
  });
}

export default async function ProjectPage({ params }: { params: ProjectParams }) {
  const { lang, project } = await projectOf(params);
  const ld = projectJsonLd(project, lang);
  return (
    <>
      {ld && <JsonLd data={ld} />}
      {hasContent(project) ? (
        <ProjectHome project={project} lang={lang} />
      ) : (
        <PendingProject project={project} lang={lang} />
      )}
    </>
  );
}

/** โครงการที่ยังไม่มีข้อมูลจริง — บอกว่าหน้านี้จะมีอะไร และทุกช่องยังรออยู่ ไม่ใช่หน้าว่างหรือ lorem */
function PendingProject({ project, lang }: { project: Project; lang: Locale }) {
  const p = getProjectsDictionary(lang);
  const name = projectLabel(project, lang);
  const l = p.labels;
  return (
    <Page title={name} lead={p.pending.lead} width="narrow">
      <ProjectTag project={project} lang={lang} className="mt-4" />
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
        <section aria-labelledby="pending-list">
          <h2 id="pending-list" className="text-21">
            {p.pending.listTitle}
          </h2>
          <InfoList
            className="mt-5"
            lang={lang}
            rows={[
              { label: l.name, value: project.name },
              { label: l.location, value: project.location },
              { label: l.plots, value: null },
              { label: l.houseTypes, value: null },
              { label: l.price, value: null },
              { label: l.sales, value: project.salesStatus },
            ]}
          />
        </section>
        <section
          aria-labelledby="pending-notify"
          className="border-concrete rounded-card self-start border p-5"
        >
          <h2 id="pending-notify" className="text-21">
            {p.pending.notifyTitle}
          </h2>
          <p className="text-15 text-moss mt-2">{p.pending.notifyLead}</p>
          <div className="mt-5 flex flex-col gap-3">
            <ButtonLink href={registerHref({ project: project.slug })}>{p.card.notify}</ButtonLink>
            <ButtonLink href={PROJECTS_PATH} variant="secondary">
              {p.project.backToProjects}
            </ButtonLink>
          </div>
        </section>
      </div>
    </Page>
  );
}

function ProjectHome({ project, lang }: { project: Project; lang: Locale }) {
  const t = getDictionary(lang);
  const p = getProjectsDictionary(lang);
  const name = projectLabel(project, lang);
  const { plots, houses } = projectNumbers(project, lang);
  const hero = houses[0];
  const place = projectPlace(project, lang);
  const loc = project.location;
  const plan = project.plan;
  /* กรอบร่วมของภาพแปลนย่อ — บ้านหลังใหญ่สุดเป็นตัวกำหนด ทุกภาพจึงอยู่ที่สเกลเดียวกัน */
  const bounds = houses.map((h) => houseBounds(h.rooms));
  const outlineFrame = {
    w: Math.max(...bounds.map((b) => b.x1 - b.x0)),
    d: Math.max(...bounds.map((b) => b.z1 - b.z0)),
  };
  const indoorRooms = hero ? hero.rooms.filter((r) => !r.outdoor).length : 0;
  const areas = houses.map((h) => h.areaSqm);
  /* แถบตัวเลขใต้ชื่อ: จำนวนบ้าน · ไร่ · ช่วงราคา · ปีที่เริ่มสร้าง (ประกาศของผู้พัฒนา) + แบบบ้านและพื้นที่ใช้สอย */
  const [units, land, price, started] = projectFactRows(project, lang);
  const facts = [
    units,
    houses.length > 0 ? ([p.labels.houseTypes, p.typesValue(houses.length)] as const) : undefined,
    houses.length > 0
      ? ([
          t.home.facts.area,
          t.home.facts.areaValue(Math.min(...areas), Math.max(...areas)),
        ] as const)
      : undefined,
    land,
    price,
    started,
  ].flatMap((row) => (row ? [{ label: row[0], value: row[1] }] : []));

  /* ทำเล: ระยะทางที่ตรวจแล้ว (nearby) ถ้ามี · ไม่มีก็บอกชื่อสถานที่ใกล้เคียงตามแผนที่ของผู้พัฒนา ไม่ใส่ตัวเลข */
  const whereLead = loc
    ? loc.nearby.length > 0
      ? t.home.whereLead(
          t.meta.place(loc.district, loc.province),
          Math.min(...loc.nearby.map((x) => x.mins)),
        )
      : loc.landmarks.length > 0
        ? p.project.nearLead(
            t.meta.place(loc.district, loc.province),
            p.project.joinNames(loc.landmarks.map((x) => x.name)),
          )
        : t.meta.place(loc.district, loc.province)
    : null;

  return (
    <div>
      <OpeningStatement
        headline={name}
        lead={project.summary ?? (place && t.home.headline(houses.length, plots.length, place))}
        facts={facts}
        actions={
          <>
            {plan && (
              <ButtonLink href={masterPlanHref(project.slug)} variant="onInk">
                {p.project.seePlan}
              </ButtonLink>
            )}
            {houses.length > 0 && (
              <ButtonLink href={houseTypesHref(project.slug)} variant="onInkQuiet">
                {p.project.seeTypes(houses.length)}
              </ButtonLink>
            )}
          </>
        }
      />
      {/* ภาพนิ่งหลัก (หมู่บ้านบนผังแปลงตัวอย่าง) + เชิงอรรถราคา — แถบหมึกเดียวกับท่อนเปิด ต่อกันไม่มีรอยต่อ */}
      <Band tone="ink" className="-mt-10 pb-12">
        <Shell>
          {project.heroStill && (
            <Image
              src={project.heroStill}
              alt={p.card.stillAlt(name)}
              width={2560}
              height={1440}
              sizes="(min-width: 88rem) 84rem, 100vw"
              priority
              className="rounded-card mt-8 h-auto w-full"
            />
          )}
          {project.pending.plots && <SampleNote kind="site" detail tone="ink" className="mt-4" />}
          <p className="text-13 text-ash mt-4 max-w-[70ch]">
            {priceNote(lang)}
            {t.format.sqwNote && ` ${t.format.sqwNote}`}
          </p>
        </Shell>
      </Band>

      {houses.length > 0 && (
        <Shell>
          <Section
            scale="lg"
            title={
              <>
                {t.home.compareTitle.lead(houses.length)}{" "}
                <span className="whitespace-nowrap">{t.home.compareTitle.tail}</span>
              </>
            }
            lead={t.home.compareLead}
          >
            <AudienceFit
              houses={houses}
              plots={plots}
              frameSize={outlineFrame}
              lang={lang}
              projectSlug={project.slug}
            />
          </Section>
        </Shell>
      )}

      {plan && plots.length > 0 && (
        <Band tone="ink" className="mt-28">
          <PlotBoard
            plots={plots}
            houseTypes={houses}
            plan={plan}
            projectSlug={project.slug}
            sample={project.pending.plots}
          />
        </Band>
      )}

      <Shell>
        {loc && (
          <Section
            scale="lg"
            title={t.home.whereTitle}
            layout="split"
            lead={
              <>
                {whereLead}
                {project.pending.location && ` · ${p.project.locationPending}`}
              </>
            }
          >
            <div className="mt-8 grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              {loc.nearby.length > 0 ? <TravelTimes places={loc.nearby} lang={lang} /> : <div />}
              <ButtonLink href={locationHref(project.slug)} variant="secondary" className="w-full">
                {t.home.seeLocation}
              </ButtonLink>
            </div>
          </Section>
        )}

        {/* แสงตลอดวัน — ทิศแดดคำนวณจาก sunPosition ตัวเดียวกับฉาก 3D บนแปลนของแบบแรก (แปลนตัวอย่าง) */}
        {hero && (
          <Section
            scale="lg"
            title={t.home.sunTitle}
            layout="split"
            lead={t.home.sunLead(hero.name)}
          >
            <DaylightStudy house={hero} frameSize={outlineFrame} />
            {hero.samplePlan && <SampleNote kind="plan" className="mt-4" />}
            <div className="mt-8">
              <ButtonLink href={houseHref(project.slug, hero.slug)} variant="secondary">
                {t.home.sunCta}
              </ButtonLink>
            </div>
          </Section>
        )}
      </Shell>

      {hero && (
        <Band tone="ink" className="mt-28 py-28">
          <Shell>
            <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div>
                <h2 className="text-34 lg:text-46 max-w-[20ch] text-balance">{t.home.walkTitle}</h2>
                <p className="text-21 text-ash mt-5 max-w-[46ch]">{t.home.walkLead}</p>
                {hero.samplePlan && <SampleNote kind="plan" tone="ink" className="mt-5" />}
              </div>
              <div>
                <dl className="text-17 flex flex-col">
                  {(
                    [
                      [t.home.walkFacts.rooms, t.home.walkFacts.roomsValue(indoorRooms, hero.name)],
                      [
                        t.home.walkFacts.floors,
                        hero.storeys > 1
                          ? t.home.walkFacts.floorsMulti(hero.storeys)
                          : t.home.walkFacts.floorsSingle,
                      ],
                      [t.home.walkFacts.light, t.home.walkFacts.lightValue],
                      [t.home.walkFacts.eye, t.home.walkFacts.eyeValue],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 border-b border-current/20 py-4"
                    >
                      <dt className="text-ash">{label}</dt>
                      <dd className="font-display text-21 font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <ButtonLink
                  href={houseHref(project.slug, hero.slug)}
                  variant="onInk"
                  className="mt-8"
                >
                  {t.home.walkCta}
                </ButtonLink>
              </div>
            </div>
          </Shell>
        </Band>
      )}

      <Shell>
        <Section scale="lg" title={p.project.specsTitle} lead={p.project.specsLead}>
          <DeveloperSpecs project={project} lang={lang} className="mt-8" />
        </Section>

        {/* ยังไม่มีใครย้ายเข้า จึงยังไม่มีคำชมให้ยกมา — บอกตามนั้น ไม่แต่งขึ้นมาเอง */}
        <Section scale="lg" title={t.home.voicesTitle} lead={t.home.voicesLead}>
          <VoicesPending className="mt-8" lang={lang} />
        </Section>
      </Shell>

      <Band tone="ink" className="mt-28 py-28">
        <Shell>
          <h2 className="text-34 lg:text-60 max-w-[16ch] text-balance">{t.home.pickTitle}</h2>
          <p className="text-21 text-ash mt-6 max-w-[46ch]">
            {t.home.pickLead(statusCounts(plots))}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {plan && (
              <ButtonLink href={masterPlanHref(project.slug)} variant="onInk">
                {t.common.openPlan}
              </ButtonLink>
            )}
            <ButtonLink href={registerHref({ project: project.slug })} variant="onInkQuiet">
              {p.project.register}
            </ButtonLink>
          </div>
        </Shell>
      </Band>
    </div>
  );
}
