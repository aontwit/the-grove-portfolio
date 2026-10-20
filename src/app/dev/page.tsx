import Link from "next/link";
import { Page } from "@/components/site/Shell";
import { projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import {
  PROJECTS_PATH,
  houseHref,
  houseTypesHref,
  locationHref,
  masterPlanHref,
  projectHref,
} from "@/lib/routes";

/* สารบัญหน้าทั้งหมดในโปรเจกต์ สำหรับเปิดดูตอนรีวิวกับลูกค้า — ไม่ได้ลิงก์จากเมนูหลัก */

export const metadata = { title: "สารบัญหน้า" };

type Entry = { href: string; title: string; note: string };

export default function DevIndexPage() {
  const projects = repo.listProjects();
  /* โครงการจริงลำดับแรกที่มีผัง — หน้าย่อยในสารบัญชี้เข้าโครงการนี้ */
  const demo = repo.listProjects().find((p) => p.plan);
  const slug = demo?.slug ?? "";
  const houses = demo ? repo.listHouseTypes(undefined, demo.id) : [];
  const plots = demo ? repo.listPlots(demo.id) : [];
  const pending = projects.find((p) => p.status === "pending");

  const publicPages: Entry[] = [
    {
      href: "/",
      title: "หน้าแรก",
      note: "หน้าแรกของแบรนด์ · ฉากโมเดล 3D จากโครงการแรก (แปลนตัวอย่าง) · รายการโครงการทั้งหมด",
    },
    {
      href: PROJECTS_PATH,
      title: "โครงการ",
      note: `${projects.length} โครงการ · ${projects.filter((p) => p.status === "pending").length} โครงการรอข้อมูลจริง`,
    },
    {
      href: projectHref(slug),
      title: `หน้าโครงการ ${demo ? projectLabel(demo, "th") : ""}`,
      note: "ภาพนิ่ง ตัวเลขตามประกาศของผู้พัฒนา แบบบ้าน ผังแปลงตัวอย่าง ทำเล แดด เดินดู สิ่งที่ผู้พัฒนาระบุ",
    },
    ...(pending
      ? [
          {
            href: projectHref(pending.slug),
            title: `หน้าโครงการที่รอข้อมูล (${projectLabel(pending, "th")})`,
            note: "สถานะรอข้อมูลจริง ไม่มีชื่อ ทำเล หรือราคาแต่งขึ้น · noindex",
          },
        ]
      : []),
    {
      href: houseTypesHref(slug),
      title: "แบบบ้าน",
      note: `${houses.length} แบบ พร้อมภาพแปลนย่อและราคาเริ่มต้นของแต่ละแบบ`,
    },
    ...houses.map((h) => ({
      href: houseHref(slug, h.slug),
      title: `แบบบ้าน ${h.name}`,
      note: `แปลน 2D ↔ Isometric ↔ เดินดูในบ้าน (แปลนตัวอย่าง) · ${h.areaSqm} ตร.ม. ตามประกาศ ${h.storeys} ชั้น`,
    })),
    {
      href: masterPlanHref(slug),
      title: "ผังโครงการ",
      note: `ผังแปลงตัวอย่าง ${plots.length} แปลง 2 แถว${demo?.plan ? ` ถนนกลาง ${demo.plan.roadY1 - demo.plan.roadY0} เมตร` : ""} · กรองตามสถานะ · สลับผัง 2D กับหมู่บ้าน Isometric`,
    },
    {
      href: "/gallery",
      title: "แกลเลอรี",
      note: "ช่องภาพที่ระบุมุมถ่ายและช่วงเวลาไว้แล้ว รอภาพจริงจากหน้างาน",
    },
    {
      href: locationHref(slug),
      title: "ทำเล",
      note: `${demo?.location ? `${demo.location.district} ${demo.location.province} · ` : ""}พิกัด วิธีเข้าโครงการ สถานที่ใกล้เคียง · ปุ่มเปิด Google Maps`,
    },
    {
      href: "/register",
      title: "ลงทะเบียน",
      note: "ฟอร์มรับลูกค้า รับพารามิเตอร์ ?project= ?plot= และ ?type= · ตอนนี้บันทึกลงเครื่องผู้ใช้ (ยังไม่ต่อหลังบ้าน)",
    },
  ];

  const devPages: Entry[] = [
    {
      href: "/design-system",
      title: "Design tokens",
      note: "สีทุก token พร้อมค่าจริง · ขนาดตัวอักษรทั้งสเกล · ปุ่ม chip ฟอร์ม ทั้งโหมดสว่างและมืด",
    },
    {
      href: "/plan",
      title: "แปลนเดี่ยว",
      note: "FloorPlan2D กับโมเดลของใบบัวแบบไม่มีหน้าเว็บห่อ มีปุ่มเปิดการหมุนเองสำหรับทดสอบ",
    },
    {
      href: "/furniture",
      title: "แคตตาล็อกเฟอร์นิเจอร์",
      note: "เฟอร์นิเจอร์ procedural ทั้ง 14 แบบในฉากเดียว",
    },
  ];

  const Section = ({ heading, note, items }: { heading: string; note: string; items: Entry[] }) => (
    <section className="pt-10">
      <h2 className="text-26">{heading}</h2>
      <p className="text-15 text-moss mt-1">{note}</p>
      <ul className="border-concrete mt-5 border-t">
        {items.map((e) => (
          <li key={e.href} className="border-concrete border-b">
            <Link href={e.href} className="block py-4">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-17 font-medium">{e.title}</span>
                <code className="font-display text-13 text-pine">{e.href}</code>
              </span>
              <span className="text-15 text-moss mt-1 block max-w-[70ch]">{e.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <Page title="สารบัญหน้า" lead="หน้านี้ไม่มีลิงก์จากเมนู ใช้เปิดดูตอนรีวิวว่ามีอะไรทำไปแล้วบ้าง">
      <Section
        heading="หน้าที่ลูกค้าเห็น"
        note={`${publicPages.length} หน้า — ทุกหน้าอยู่ในเมนูหลักหรือเข้าถึงได้จากในเว็บ`}
        items={publicPages}
      />

      <Section
        heading="หน้าสำหรับทีมทำงาน"
        note="ใช้ตรวจงาน ไม่ได้ตั้งใจให้ลูกค้าเข้า"
        items={devPages}
      />
    </Page>
  );
}
