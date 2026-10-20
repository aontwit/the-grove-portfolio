import { getProjectsDictionary } from "@/i18n/projects";
import type { Locale } from "@/i18n/config";
import type { Project } from "@/lib/schemas";
import { cx } from "@/lib/utils";

/* ป้ายสถานะข้อมูลของโครงการ — pending = รอข้อมูลจริง · live ไม่มีป้าย
   (ส่วนที่ยังเป็นตัวอย่างในโครงการจริง เช่นแปลนบ้านและผังแปลง ใช้ SampleNote ตรงจุดนั้นแทน)
   เป็นคำเสมอ ไม่ใช่สีอย่างเดียว · วางต่อท้ายชื่อหรือใต้ย่อหน้านำ ไม่วางเหนือหัวข้อ (§7 badge เหนือ headline) */

const TONE = {
  light: "border-moss text-moss",
  ink: "border-ash text-ash",
} as const;

export function ProjectTag({
  project,
  lang,
  tone = "light",
  className,
}: {
  project: Pick<Project, "status">;
  lang: Locale;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  if (project.status === "live") return null;
  return (
    <span
      className={cx(
        "rounded-pill text-13 inline-flex h-7 shrink-0 items-center border px-2.5 align-middle font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {getProjectsDictionary(lang).status[project.status]}
    </span>
  );
}
