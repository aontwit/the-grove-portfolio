import { DemoBanner } from "@/components/admin/AdminNav";
import { LoginForm } from "@/components/admin/LoginForm";
import { repo } from "@/lib/repo";
import { safeNext } from "@/lib/session";

export const metadata = { title: "เข้าสู่ระบบหลังบ้าน", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const site = repo.getSite();
  const { next } = await searchParams;
  return (
    <>
      <DemoBanner />
      <main className="mx-auto w-full max-w-[26rem] px-6 pt-[12vh] pb-16">
        <p className="font-display text-21 font-medium">{site.brandName}</p>
        <h1 className="text-34 mt-6">เข้าสู่ระบบหลังบ้าน</h1>
        <p className="text-15 text-moss mt-2">
          แก้สถานะแปลง ราคา รูป และดูรายชื่อคนที่ลงทะเบียน · เดโมนี้กดเข้าได้เลย ไม่ตรวจรหัสผ่าน
        </p>
        <LoginForm email={site.contactEmail ?? ""} next={safeNext(next)} />
      </main>
    </>
  );
}
