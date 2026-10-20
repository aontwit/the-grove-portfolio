import { AdminHeader } from "@/components/admin/AdminNav";
import { LeadTable } from "@/components/admin/LeadTable";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";

export const metadata = { title: "ผู้ลงทะเบียน · หลังบ้าน" };

export default function AdminLeadsPage() {
  return (
    <>
      <AdminHeader
        title="ผู้ลงทะเบียน"
        lead="คนที่ส่งฟอร์มหน้าลงทะเบียน ใหม่สุดอยู่บน · แตะเบอร์เพื่อโทรกลับจากมือถือได้เลย"
      />
      <LeadTable
        plots={repo.listPlots()}
        houseTypes={repo.listHouseTypes()}
        projects={repo.listProjects().map((x) => ({ id: x.id, label: projectLabel(x, "th") }))}
      />
    </>
  );
}
