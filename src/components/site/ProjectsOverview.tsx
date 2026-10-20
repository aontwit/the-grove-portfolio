import Image from "next/image";
import { ButtonLink } from "@/components/site/ButtonLink";
import { FactList } from "@/components/site/FactList";
import { ProjectTag } from "@/components/site/ProjectTag";
import { SampleNote } from "@/components/site/SampleNote";
import { getDictionary } from "@/i18n";
import { Link } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import { lowestOpen, priceNote } from "@/lib/format";
import { million } from "@/lib/lead";
import { displayYear, hasContent, projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { projectHref, registerHref } from "@/lib/routes";
import type { Project } from "@/lib/schemas";
import { isOpen } from "@/lib/status";

/* รายการโครงการทั้งหมด — หน้าแรกและหน้า /projects ใช้ตัวเดียวกัน
   โครงการที่มีข้อมูล (live) เป็นแถวใหญ่มีภาพนิ่งกับตัวเลขตามประกาศของผู้พัฒนา (project.facts)
   ภาพนิ่งคือหมู่บ้านบนผังแปลงตัวอย่าง — ติดป้ายใต้ภาพ
   โครงการที่รอข้อมูลเป็นแถวรายการกลุ่มเดียว ไม่มีช่องรูปว่าง ไม่มีชื่อหรือตัวเลขแต่งขึ้น บอกตรงๆ ว่ารออะไร
   น้ำหนักต่างกันโดยตั้งใจ — ไม่ใช่ grid การ์ดหน้าตาเดียวกันห้าใบ (§7) */

type Level = "h2" | "h3";
type CardLevel = Level | "h4";

/** แปลง แบบบ้าน และราคาเริ่มต้นของแปลงที่ยังเปิดอยู่ (ว่างหรือรอยืนยันสถานะ) ของโครงการ
    low = null เมื่อไม่มีแปลงเปิดเลย · ราคาที่ยังไม่มีรายแปลงคิดจากราคาเริ่มต้นของแบบ (lowestOpen) */
export function projectNumbers(project: Project, lang: Locale) {
  const plots = repo.listPlots(project.id);
  const houses = repo.listHouseTypes(lang, project.id);
  const open = plots.filter((p) => isOpen(p.status));
  return { plots, houses, open, low: lowestOpen(plots, houses) };
}

/** แถวตัวเลขโครงการตามประกาศของผู้พัฒนา — การ์ดในรายการโครงการและท่อนเปิดของหน้าโครงการใช้ชุดเดียวกัน */
export function projectFactRows(project: Project, lang: Locale): [string, string][] {
  const p = getProjectsDictionary(lang);
  const f = project.facts;
  const rows: [string, string][] = [];
  if (f) {
    rows.push([p.labels.units, p.unitsValue(f.units)]);
    rows.push([p.labels.land, p.raiValue(f.landRai)]);
    rows.push([p.labels.price, p.priceRange(million(f.priceLow), million(f.priceHigh))]);
    rows.push([p.labels.started, p.startedValue(displayYear(f.startedYear, lang))]);
  }
  return rows;
}

/** "หางดง เชียงใหม่ (ยังไม่ยืนยัน)" — null ถ้ายังไม่มีทำเล */
export function projectPlace(project: Project, lang: Locale) {
  if (!project.location) return null;
  const place = getDictionary(lang).meta.place(
    project.location.district,
    project.location.province,
  );
  return project.pending.location ? `${place} (${getProjectsDictionary(lang).unconfirmed})` : place;
}

function FeatureProject({
  project,
  lang,
  level,
}: {
  project: Project;
  lang: Locale;
  level: Level;
}) {
  const p = getProjectsDictionary(lang);
  const t = getDictionary(lang);
  const Heading = level;
  const name = projectLabel(project, lang);
  const n = projectNumbers(project, lang);
  const place = projectPlace(project, lang);
  const rows: [string, string][] = [];
  if (place) rows.push([p.labels.location, place]);
  const facts = projectFactRows(project, lang);
  rows.push(...facts.slice(0, 2));
  if (n.houses.length > 0) rows.push([p.labels.houseTypes, p.typesValue(n.houses.length)]);
  rows.push(...facts.slice(2));
  if (project.salesStatus) rows.push([p.labels.sales, p.sales[project.salesStatus]]);

  return (
    <article className="border-concrete rounded-card grid grid-cols-1 overflow-hidden border lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {project.heroStill && (
        <figure className="bg-ink flex flex-col">
          <Image
            src={project.heroStill}
            alt={p.card.stillAlt(name)}
            width={2560}
            height={1440}
            sizes="(min-width: 1024px) 50rem, 100vw"
            className="bg-ink h-full w-full object-cover"
          />
          {project.pending.plots && (
            <figcaption className="px-4 py-3">
              <SampleNote kind="site" tone="ink" />
            </figcaption>
          )}
        </figure>
      )}
      <div className="flex flex-col p-6 lg:p-8">
        <Heading className="text-26 lg:text-34 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href={projectHref(project.slug)} className="hover:underline">
            {name}
          </Link>
          <ProjectTag project={project} lang={lang} />
        </Heading>
        {project.summary && (
          <p className="text-15 text-moss mt-3 max-w-[52ch]">{project.summary}</p>
        )}
        <FactList className="mt-6" divided rows={rows} />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-auto lg:pt-8">
          <ButtonLink href={projectHref(project.slug)}>{p.card.open(name)}</ButtonLink>
          <ButtonLink href={registerHref({ project: project.slug })} variant="secondary">
            {t.home.registerCta}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

function PendingProject({
  project,
  lang,
  level,
}: {
  project: Project;
  lang: Locale;
  level: CardLevel;
}) {
  const p = getProjectsDictionary(lang);
  const Heading = level;
  return (
    <li className="border-concrete flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Heading className="text-21">
          <Link
            href={projectHref(project.slug)}
            className="inline-flex min-h-11 items-center hover:underline"
          >
            {projectLabel(project, lang)}
          </Link>
        </Heading>
        <ProjectTag project={project} lang={lang} />
      </div>
      <Link
        href={registerHref({ project: project.slug })}
        className="text-15 text-pine inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        {p.card.notify}
      </Link>
    </li>
  );
}

export function ProjectsOverview({
  lang,
  level = "h3",
  className,
}: {
  lang: Locale;
  /** ระดับหัวข้อของแต่ละโครงการ — h2 ใต้ h1 ของหน้า /projects · h3 ใต้หัวข้อ section บนหน้าแรก */
  level?: Level;
  className?: string;
}) {
  const p = getProjectsDictionary(lang);
  const projects = repo.listProjects(lang);
  const open = projects.filter(hasContent);
  const waiting = projects.filter((x) => !hasContent(x));
  /* หัวกลุ่มอยู่ระดับเดียวกับโครงการใหญ่ การ์ดในกลุ่มลงไปอีกขั้น — ไม่ข้ามระดับหัวข้อ */
  const Group = level;
  const cardLevel: CardLevel = level === "h2" ? "h3" : "h4";

  return (
    <div className={className}>
      <div className="flex flex-col gap-8">
        {open.map((project) => (
          <FeatureProject key={project.id} project={project} lang={lang} level={level} />
        ))}
      </div>
      {/* ช่วงราคาบนการ์ดมีดอกจัน — เชิงอรรถอยู่ใต้รายการที่เดียว */}
      {open.some((x) => x.facts) && (
        <p className="text-13 text-moss mt-4 max-w-[70ch]">{priceNote(lang)}</p>
      )}
      {waiting.length > 0 && (
        <section className="mt-14" aria-labelledby="projects-waiting">
          <Group id="projects-waiting" className="text-26">
            {p.index.pendingGroup}
          </Group>
          <p className="text-15 text-moss mt-2 max-w-[60ch]">
            {p.index.pendingGroupLead(waiting.length)}
          </p>
          {/* แถวรายการ ไม่ใช่การ์ด — ยังไม่มีอะไรต่างกันให้การ์ดสี่ใบแสดง นอกจากเลขโครงการ */}
          <ul className="border-concrete mt-6 grid grid-cols-1 border-t lg:grid-cols-2 lg:gap-x-12">
            {waiting.map((project) => (
              <PendingProject key={project.id} project={project} lang={lang} level={cardLevel} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
