"use client";

import { useState } from "react";
import { ToggleGroup } from "@/components/site/ToggleGroup";
import { useLeads, type StoredLead } from "@/lib/leads";
import type { HouseType, Plot } from "@/lib/schemas";
import type { Locale } from "@/i18n/config";
import { ButtonLink } from "@/components/site/ButtonLink";
import { budgetLabel, CHANNEL_TH, TIME_TH } from "@/lib/lead";

/* ผู้ลงทะเบียนจากฟอร์ม /register — อ่านจากที่เดียวกับที่ฟอร์มบันทึก (lib/leads)
   คอลัมน์ความยินยอมคือหลักฐานตาม PDPA: รับทราบนโยบายฉบับไหน เมื่อไร และรับข่าวสารหรือไม่
   ก่อนส่งข่าวโปรโมชันให้ใคร ดูช่อง "รับข่าวสาร" ของคนนั้นก่อนทุกครั้ง */

/** ภาษาของหน้าฟอร์มที่คนนั้นกดส่ง — โทรกลับเป็นภาษานั้น */
const LOCALE_TH: Record<Locale, string> = { th: "ไทย", en: "อังกฤษ", zh: "จีน" };

const DATE = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export function interest(lead: StoredLead, plots: Plot[], houseTypes: HouseType[]) {
  const plot = plots.find((p) => p.id === lead.plotId);
  const house =
    houseTypes.find((h) => h.slug === lead.houseTypeSlug) ??
    (plot ? houseTypes.find((h) => h.id === plot.houseTypeId) : undefined);
  return [plot && `แปลง ${plot.number}`, house?.name].filter(Boolean).join(" · ") || "ไม่ได้ระบุ";
}

/** โครงการของ lead — แถวที่ส่งก่อนมีหลายโครงการ (projectId "") หาจากแปลงที่เลือก · "" = ไม่ได้ระบุ */
export function leadProjectId(lead: StoredLead, plots: Plot[]) {
  return lead.projectId || plots.find((p) => p.id === lead.plotId)?.projectId || "";
}

export function LeadEmpty() {
  return (
    <div className="bg-paper border-concrete rounded-card border p-6">
      <h2 className="text-21">ยังไม่มีใครลงทะเบียน</h2>
      <p className="text-15 text-moss mt-2 max-w-[60ch]">
        ทุกครั้งที่มีคนส่งฟอร์มหน้าลงทะเบียน ชื่อกับเบอร์จะขึ้นที่นี่ทันที พร้อมแปลงที่เขาเลือกมา
        ลองส่งฟอร์มเองสักครั้งเพื่อดูว่าข้อมูลมาถึงหน้าตาแบบไหน
      </p>
      <ButtonLink href="/register" variant="secondary" className="mt-5">
        เปิดฟอร์มลงทะเบียน
      </ButtonLink>
    </div>
  );
}

export function LeadTable({
  plots,
  houseTypes,
  projects,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  /** ทุกโครงการ (รวมที่รอข้อมูล — คนลงทะเบียนรอข่าวโครงการนั้นได้) */
  projects: { id: string; label: string }[];
}) {
  const leads = useLeads();
  const [project, setProject] = useState<string>("all");

  if (leads === null) return <div className="min-h-64" aria-busy />;
  if (leads.length === 0) return <LeadEmpty />;

  const projectOf = (l: StoredLead) => leadProjectId(l, plots);
  const projectName = (id: string) =>
    projects.find((x) => x.id === id)?.label ?? (id === "" ? "ไม่ได้ระบุ" : id);
  const shown = project === "all" ? leads : leads.filter((l) => projectOf(l) === project);
  const options = [
    { id: "all", label: `ทุกโครงการ ${leads.length}` },
    ...projects.map((x) => ({
      id: x.id,
      label: `${x.label} ${leads.filter((l) => projectOf(l) === x.id).length}`,
    })),
    { id: "", label: `ไม่ได้ระบุ ${leads.filter((l) => projectOf(l) === "").length}` },
  ];

  return (
    <div>
      <ToggleGroup
        className="mb-5"
        label="กรองตามโครงการ"
        size="pill"
        options={options}
        value={project}
        onSelect={setProject}
      />
      <div className="bg-paper border-concrete rounded-card overflow-x-auto border">
        <table className="text-15 w-full min-w-[66rem] text-left">
          <caption className="sr-only">ผู้ลงทะเบียน {shown.length} คน ใหม่สุดอยู่บน</caption>
          <thead className="text-13 text-moss border-concrete border-b">
            <tr>
              <th scope="col" className="px-5 py-3 font-normal">
                ส่งเมื่อ
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                ชื่อ
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                ติดต่อกลับ
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                ภาษา
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                โครงการ
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                สนใจ
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                ความยินยอม
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                ข้อความ
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr
                key={l.createdAt + l.phone}
                className="border-concrete border-b align-top last:border-b-0"
              >
                <td className="text-moss px-5 py-4 whitespace-nowrap tabular-nums">
                  {DATE.format(new Date(l.createdAt))}
                </td>
                <td className="px-5 py-4 font-medium">
                  {l.name}
                  {l.email && (
                    <span className="text-13 text-moss block font-normal">{l.email}</span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <a
                    href={`tel:${l.phone}`}
                    className="text-pine font-medium tabular-nums underline-offset-4 hover:underline"
                  >
                    {l.phone}
                  </a>
                  <span className="text-13 text-moss block">
                    {CHANNEL_TH[l.channel]}
                    {l.channel === "line" && l.lineId && ` ${l.lineId}`} · {TIME_TH[l.contactTime]}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {l.locale ? (
                    LOCALE_TH[l.locale]
                  ) : (
                    <span className="text-13 text-moss">ไม่มีบันทึก</span>
                  )}
                </td>
                <td className="px-5 py-4">{projectName(projectOf(l))}</td>
                <td className="px-5 py-4">
                  {interest(l, plots, houseTypes)}
                  {l.budget && (
                    <span className="text-13 text-moss block tabular-nums">
                      งบ {budgetLabel(l.budget)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {l.consent ? (
                    <>
                      <span className="block">
                        รับข่าวสาร{" "}
                        <span className="font-medium">
                          {l.consent.marketing ? "ยินยอม" : "ไม่ยินยอม"}
                        </span>
                      </span>
                      <span className="text-13 text-moss block tabular-nums">
                        รับทราบนโยบายฉบับ {l.consent.privacyVersion}
                      </span>
                    </>
                  ) : (
                    <span className="text-13 text-moss">ไม่มีบันทึก ส่งก่อนมีช่องยินยอม</span>
                  )}
                </td>
                <td className="text-moss max-w-[32ch] px-5 py-4">{l.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="text-15 text-moss px-5 py-8">ยังไม่มีคนลงทะเบียนในโครงการนี้</p>
        )}
      </div>
    </div>
  );
}
