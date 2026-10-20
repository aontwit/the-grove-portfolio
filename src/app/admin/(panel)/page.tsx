import { AdminHeader } from "@/components/admin/AdminNav";
import { Overview } from "@/components/admin/Overview";
import { ButtonLink } from "@/components/site/ButtonLink";
import { hasContent, projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";

export const metadata = { title: "ภาพรวม · หลังบ้าน" };

/* ภาพรวมวาดผังทีละโครงการที่มีผัง เรียงลงมา — โครงการที่รอข้อมูลยังไม่มีผังหรือแปลง
   ผังแปลงของโครงการจริงตอนนี้ยังเป็นผังตัวอย่าง (pending.plots) ผังจึงติดป้ายตัวอย่าง */
export default function AdminHomePage() {
  const projects = repo.listProjects();
  const withPlan = projects.filter((p) => p.plan);
  const waiting = projects.filter((p) => !hasContent(p)).length;
  return (
    <>
      <AdminHeader
        title="ภาพรวม"
        lead={`${projects.length} โครงการ · รอข้อมูลจริง ${waiting} · ทุกตัวเลขในหน้านี้ตรงกับที่ลูกค้าเห็นบนเว็บตอนนี้`}
        actions={<ButtonLink href="/admin/plots">แก้สถานะและราคาแปลง</ButtonLink>}
      />
      {withPlan.map((p, i) =>
        p.plan ? (
          <section key={p.id} aria-label={projectLabel(p, "th")} className="mb-12">
            {withPlan.length > 1 && <h2 className="text-26 mb-4">{projectLabel(p, "th")}</h2>}
            <Overview
              plots={repo.listPlots(p.id)}
              houseTypes={repo.listHouseTypes(undefined, p.id)}
              plan={p.plan}
              sample={p.pending.plots}
              unassigned={i === 0}
            />
          </section>
        ) : null,
      )}
    </>
  );
}
