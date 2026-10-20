import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getProjectsDictionary } from "@/i18n/projects";
import { repo } from "@/lib/repo";
import type { Project } from "@/lib/schemas";
import { cx } from "@/lib/utils";

/* "สิ่งที่ผู้พัฒนาระบุ" — สเปกตัวอย่างของโครงการสมมติ
   กำกับ "ผู้พัฒนาระบุ" ที่หัวรายการ และบอกว่าเป็นข้อมูลสมมติ · ไม่แต่งคำคุณศัพท์เพิ่ม (§6)
   ของเฉพาะโครงการ (project.claims เช่น สมาร์ทโฮมทุกหลัง) แยกกลุ่มจากรายการที่ลงเหมือนกันทุกโครงการ (site.developerSpecs) */

function ClaimList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-17 font-medium">{title}</h3>
      <ul className="border-concrete text-15 mt-3 grid grid-cols-1 border-t sm:grid-cols-2 sm:gap-x-10">
        {items.map((text) => (
          <li key={text} className="border-concrete border-b py-2.5">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeveloperSpecs({
  project,
  lang,
  className,
}: {
  project: Project;
  lang: Locale;
  className?: string;
}) {
  const p = getProjectsDictionary(lang);
  const t = getDictionary(lang);
  const site = repo.getSite(lang);
  return (
    <div className={cx("flex flex-col gap-8", className)}>
      <p className="text-13 text-moss">
        <span className="rounded-control outline-moss text-moss mr-3 inline-flex min-h-7 items-center px-2.5 font-medium outline-1 -outline-offset-1 outline-dashed">
          {t.common.developerSays}
        </span>
        {p.project.sourceNote}
      </p>
      {project.claims.length > 0 && (
        <ClaimList title={p.project.claimsLabel} items={project.claims.map((c) => c.text)} />
      )}
      {site.developerSpecs.length > 0 && (
        <ClaimList title={p.project.specsShared} items={site.developerSpecs.map((c) => c.text)} />
      )}
    </div>
  );
}
