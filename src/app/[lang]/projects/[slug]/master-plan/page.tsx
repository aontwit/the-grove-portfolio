import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MasterPlanViewer } from "@/components/site/MasterPlanViewer";
import { PlotPanel } from "@/components/site/PlotPanel";
import { ProjectContext } from "@/components/site/ProjectContext";
import { Page } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { plotFacts, sqw } from "@/lib/format";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { masterPlanHref, plotHref } from "@/lib/routes";
import { houseImage } from "@/app/_meta/jsonld";
import { projectMetadata, projectOf, projectSlugs, type ProjectParams } from "../../_project";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/* slug ที่ไม่อยู่ในรายการ (รวมโครงการที่ยังรอข้อมูลสำหรับหน้าย่อย) = 404 จริง ไม่ใช่หน้า not-found ที่ตอบ 200 ใต้ loading */
export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs({ content: true });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ProjectParams;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { lang, project } = await projectOf(params, { content: true });
  const plan = project.plan;
  if (!plan) return {};
  const t = getDictionary(lang);
  const plots = repo.listPlots(project.id);
  const name = projectLabel(project, lang);

  /* ลิงก์ของแปลงที่ทีมขายส่งทาง LINE (plotHref) — ตัวอย่างลิงก์ต้องบอกว่าเป็นแปลงไหน ไม่ใช่คำอธิบายผังทั้งโครงการ
     ไม่ใส่ราคา — ราคาในเว็บต้องมาคู่เชิงอรรถเสมอ ซึ่งข้อความที่ถูกแชร์ออกไปพาไปด้วยไม่ได้ (เหมือนหน้าแบบบ้าน)
     ?plot= ที่ไม่มีอยู่จริงหรือเป็นแปลงของโครงการอื่น ได้ metadata ของผังทั้งโครงการตามปกติ
     canonical และ hreflang คง ?plot= ไว้ทั้งสองภาษา
     ตัดสิน 2026-10-02: ลิงก์รายแปลง noindex — ผังแปลงและสถานะรายแปลงยังเป็นตัวอย่าง (pending.plots)
     หน้าผังทั้งโครงการยัง index ได้ (มีป้ายผังแปลงตัวอย่าง) · follow เปิดไว้ */
  const { plot: param } = await searchParams;
  const plot = typeof param === "string" ? plots.find((p) => p.id === param) : undefined;
  const house =
    plot && repo.listHouseTypes(lang, project.id).find((h) => h.id === plot.houseTypeId);
  if (plot && house) {
    const { facing } = plotFacts(plot, plots, plan, lang);
    const m = t.masterPlan.plotMeta;
    const facts = [
      m.status(plot.number, t.status[plot.status]),
      m.house(house.name, house.storeys, house.beds, house.baths),
      m.land(sqw(plot.landSqw, lang)),
      facing,
    ].filter(Boolean);
    const image = houseImage(house);
    const meta = projectMetadata(project, {
      lang,
      title: `${m.title(plot.number, house.name)} · ${name}`,
      path: plotHref(project.slug, plot.id),
      description: m.description(facts.join(" · ")),
      image: image ? { url: image, alt: t.meta.houseImageAlt(house.name) } : undefined,
    });
    return project.pending.plots ? { ...meta, robots: { index: false, follow: true } } : meta;
  }

  return projectMetadata(project, {
    lang,
    title: `${t.masterPlan.title} · ${name}`,
    path: masterPlanHref(project.slug),
    description: t.masterPlan.metaDescription(plots.length, project.facts?.landRai ?? 0),
  });
}

export default async function MasterPlanPage({ params }: { params: ProjectParams }) {
  const { lang, project } = await projectOf(params, { content: true });
  const plan = project.plan;
  if (!plan) notFound();
  const t = getDictionary(lang).masterPlan;
  const plots = repo.listPlots(project.id);
  const houseTypes = repo.listHouseTypes(lang, project.id);
  return (
    <Page
      title={t.title}
      lead={t.lead(plots.length, project.facts?.landRai ?? 0, plan.roadY1 - plan.roadY0)}
    >
      <ProjectContext project={project} lang={lang} />
      <div className="mt-8">
        <MasterPlanViewer
          plots={plots}
          houseTypes={houseTypes}
          plan={plan}
          syncUrl
          sample={project.pending.plots}
          /* element ที่สร้างฝั่ง server แล้วส่งเป็น prop เข้า client component — React 19 dev
             เตือน "unique key" ถ้าไม่มี key (ไม่ได้อยู่ใน list จริง) */
          side={
            <PlotPanel
              key="plot-panel"
              plots={plots}
              houseTypes={houseTypes}
              plan={plan}
              projectSlug={project.slug}
            />
          }
        />
      </div>
    </Page>
  );
}
