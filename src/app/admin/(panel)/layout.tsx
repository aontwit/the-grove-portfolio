import { AdminShell, DemoBanner } from "@/components/admin/AdminNav";
import { repo } from "@/lib/repo";

export const metadata = { title: "หลังบ้าน", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const site = repo.getSite();
  return (
    <AdminShell brandName={site.brandName} email={site.contactEmail ?? ""}>
      <DemoBanner />
      <main className="mx-auto w-full max-w-[80rem] px-6 py-10">{children}</main>
    </AdminShell>
  );
}
