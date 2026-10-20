import { ButtonLink } from "@/components/site/ButtonLink";
import { FactList } from "@/components/site/FactList";
import { projectFactRows, projectNumbers, projectPlace } from "@/components/site/ProjectsOverview";
import { Phrases } from "@/components/site/Phrases";
import { Shell } from "@/components/site/Shell";
import { Link } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import { priceNote } from "@/lib/format";
import { hasContent, projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { projectHref, registerHref } from "@/lib/routes";

/* ปลายฉากเปิดหน้าแรก — ฉากจบที่หมู่บ้าน แล้วท่อนนี้เลื่อนขึ้นมาบนพื้นหมึกเดียวกัน (ไม่มีรอยต่อสว่าง/มืด)
   ตอบคำถามแรกหลังดูบ้านจบ: "มีโครงการไหน อยู่ที่ไหน กี่หลัง ราคาเท่าไร" ด้วยตัวเลขตามประกาศของผู้พัฒนา (project.facts)
   ไม่มีภาพ: เพิ่งเห็นหมู่บ้าน 3D มาเต็มจอ ท่อนนี้คือการตัดสินใจ ไม่ใช่ภาพชุดที่สอง
   โครงการที่ยังรอข้อมูลเหลือบรรทัดเดียวกับลิงก์ลงทะเบียนลิงก์เดียว — ไม่มีชื่อ ไม่มีตัวเลขแต่งขึ้น
   id="projects" เป็นปลายทางของปุ่ม "ดูโครงการ" ทางลัดข้ามฉาก และ skip link ของหน้าแรก (SkipLink)
   tabIndex -1: กระโดดมาแล้ว focus ย้ายมาที่นี่จริง ปุ่ม Tab ถัดไปจึงเริ่มที่โครงการแรก */

export const CHOOSER_ID = "projects";

export function ProjectChooser({ lang }: { lang: Locale }) {
  const p = getProjectsDictionary(lang);
  const projects = repo.listProjects(lang);
  const open = projects.filter(hasContent);
  const waiting = projects.length - open.length;

  return (
    <section
      id={CHOOSER_ID}
      tabIndex={-1}
      aria-labelledby="projects-title"
      className="bg-ink text-chalk outline-none"
    >
      <Shell className="pt-24 pb-28">
        <h2 id="projects-title" className="text-34 lg:text-46">
          {p.home.chooserTitle}
        </h2>
        <p className="text-17 lg:text-21 text-ash mt-4 max-w-[46ch]">
          <Phrases parts={p.home.chooserLead} joiner={lang === "zh" ? "" : " "} />
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-2">
          {open.map((project) => {
            const name = projectLabel(project, lang);
            const place = projectPlace(project, lang);
            const houses = projectNumbers(project, lang).houses;
            const [units, land, price] = projectFactRows(project, lang);
            const rows = [
              units,
              land,
              houses.length > 0
                ? ([p.labels.houseTypes, p.typesValue(houses.length)] as const)
                : undefined,
              price,
            ].flatMap((row) => (row ? [row] : []));
            return (
              <li key={project.id} className="flex flex-col border-t border-current/20 pt-8">
                <h3 className="text-26 lg:text-34">{name}</h3>
                {place && <p className="text-15 text-ash mt-2">{place}</p>}
                <FactList tone="ink" divided className="mt-6" rows={rows} />
                <ButtonLink
                  href={projectHref(project.slug)}
                  variant="onInk"
                  className="mt-8 self-start"
                >
                  {p.card.open(name)}
                </ButtonLink>
              </li>
            );
          })}
        </ul>

        {/* ช่วงราคามีดอกจัน — เชิงอรรถอยู่ใต้รายการที่เดียว */}
        {open.some((x) => x.facts) && (
          <p className="text-13 text-ash mt-8 max-w-[70ch]">{priceNote(lang)}</p>
        )}

        {waiting > 0 && (
          <p className="text-15 text-ash mt-12 max-w-[70ch]">
            {p.home.pendingLine(waiting)}{" "}
            <Link
              href={registerHref()}
              className="text-chalk decoration-citron font-medium underline underline-offset-4"
            >
              {p.home.pendingCta}
            </Link>
          </p>
        )}
      </Shell>
    </section>
  );
}
