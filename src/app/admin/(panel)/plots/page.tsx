import { AdminHeader } from "@/components/admin/AdminNav";
import { PlotTable } from "@/components/admin/PlotTable";
import { ButtonLink } from "@/components/site/ButtonLink";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { PROJECTS_PATH } from "@/lib/routes";

export const metadata = { title: "แปลง · หลังบ้าน" };

export default function AdminPlotsPage() {
  const plots = repo.listPlots();
  /* เฉพาะโครงการที่มีแปลง — โครงการที่รอข้อมูลยังไม่มีแปลงให้แก้ */
  const projects = repo
    .listProjects()
    .filter((x) => plots.some((p) => p.projectId === x.id))
    .map((x) => ({ id: x.id, label: projectLabel(x, "th") }));
  return (
    <>
      <AdminHeader
        title="แปลง"
        lead={`${plots.length} แปลง · เปลี่ยนสถานะหรือราคาแล้วผังโครงการบนเว็บเปลี่ยนตามทันที ราคาบันทึกเมื่อออกจากช่องหรือกด Enter`}
        actions={
          <ButtonLink href={PROJECTS_PATH} variant="secondary">
            เปิดหน้าโครงการบนเว็บ
          </ButtonLink>
        }
      />
      <PlotTable plots={plots} houseTypes={repo.listHouseTypes()} projects={projects} />
    </>
  );
}
