"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FactList } from "@/components/site/FactList";
import { MasterPlan2D, usePortraitPlan } from "@/components/three/MasterPlan2D";
import { useLivePlots } from "@/lib/demo";
import { useLeads } from "@/lib/leads";
import type { HouseType, Plot, PlotStatus, SitePlan } from "@/lib/schemas";
import { STATUSES, STATUS_TH } from "@/lib/status";
import { useGrove } from "@/lib/store";
import { baht, cx } from "@/lib/utils";
import { interest, leadProjectId } from "./LeadTable";
import { PlotRow } from "./PlotTable";

/* ภาพรวม — คำถามแรกของเจ้าของโครงการคือ "เหลือกี่แปลง แปลงไหน ใครโทรมาบ้าง"
   ผังย่อคือของจริงชุดเดียวกับหน้าเว็บ แตะแปลงแล้วแก้สถานะได้ใต้ผังเลย */

const BAR: Record<PlotStatus, string> = {
  available: "bg-st-available",
  /* ยังไม่รู้สถานะ — คู่ §1 (พื้น chalk + ขอบเส้นประ) แบบเดียวกับผังหน้าเว็บ แยกจากเทาเข้มของ "ขายแล้ว" ชัด */
  unconfirmed: "bg-st-unconfirmed-bg border border-dashed border-st-unconfirmed",
  reserved: "bg-marigold",
  sold: "bg-st-sold",
};

export function Overview({
  plots,
  houseTypes,
  plan,
  sample = false,
  unassigned = false,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  /** ผังแปลงตัวอย่าง (project.pending.plots) */
  sample?: boolean;
  /** รวมคนที่ลงทะเบียนโดยไม่ระบุโครงการไว้ในท่อนนี้ด้วย (ท่อนแรกของหน้าภาพรวม) */
  unassigned?: boolean;
}) {
  const live = useLivePlots(plots);
  /* ลงทะเบียนล่าสุดเฉพาะของโครงการนี้ — หน้าภาพรวมวาดทีละโครงการ คนเดียวกันจึงไม่ขึ้นซ้ำทุกท่อน */
  const allLeads = useLeads();
  const projectId = plots[0]?.projectId;
  const leads =
    allLeads &&
    allLeads.filter((l) => {
      const id = leadProjectId(l, plots);
      return id === projectId || (unassigned && id === "");
    });
  const selected = useGrove((s) => s.selectedPlot);
  const setStatusFilter = useGrove((s) => s.setStatusFilter);
  /* มือถือ: ผังแนวตั้งแบบเดียวกับหน้าผังโครงการ ไม่ต้องปัดข้างดูผังกว้าง 900px */
  const portrait = usePortraitPlan();

  /* ตัวกรองสถานะใช้ store เดียวกับหน้าเว็บ — ผังในหลังบ้านต้องเห็นครบทุกแปลงเสมอ */
  useEffect(() => setStatusFilter("all"), [setStatusFilter]);

  const by = (s: PlotStatus) => live.filter((p) => p.status === s);
  /* ผลรวมราคาบอกได้เมื่อทุกแปลงในกลุ่มมีราคารายแปลงแล้วเท่านั้น — ไม่เอาราคาเริ่มต้นของแบบมาบวกแทน */
  const sum = (ps: Plot[]) =>
    ps.every((p) => p.price !== null)
      ? ` · ${baht(ps.reduce((n, p) => n + (p.price ?? 0), 0))} บาท`
      : ps.length > 0
        ? " · ยังไม่มีราคารายแปลง"
        : "";
  const present = STATUSES.filter((s) => by(s).length > 0);
  const pick = live.find((p) => p.id === selected);
  const pickOriginal = plots.find((p) => p.id === selected);
  const houseName = (id: string) => houseTypes.find((h) => h.id === id)?.name ?? "ไม่ระบุ";

  /* แตะแปลงบนผังแนวตั้ง (มือถือ) แล้วแถวแก้ไขอยู่ใต้ผังยาว — เลื่อนให้เห็นพอดี ไม่เลื่อนถ้าเห็นอยู่แล้ว */
  const editor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pick) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    editor.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [pick?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- เลื่อนเมื่อเปลี่ยนแปลงเท่านั้น ไม่ใช่ทุกครั้งที่แก้ค่า

  return (
    <div className="grid grid-cols-1 items-start gap-10 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="ov-plan">
        <h2 id="ov-plan" className="text-21 mb-4">
          ผังโครงการตอนนี้
        </h2>
        <div className="bg-paper border-concrete rounded-card overflow-hidden border">
          <div className="overflow-x-auto">
            <MasterPlan2D plots={plots} plan={plan} portrait={portrait} sample={sample} />
          </div>
          <div ref={editor} className="border-concrete scroll-mb-4 border-t px-5 py-4">
            {/* key = แปลงที่เลือก: เปลี่ยนแปลงแล้วแถวใหม่จางเข้า 0.25s เท่าการสลับ 2D↔3D (§4) */}
            {pick && pickOriginal ? (
              <PlotRow
                key={pick.id}
                className="ease-settle transition-opacity duration-250 starting:opacity-0 motion-reduce:transition-none"
                plot={pick}
                original={pickOriginal}
                houseName={houseName(pick.houseTypeId)}
              />
            ) : (
              <p className="text-15 text-moss">
                แตะแปลงบนผังเพื่อแก้สถานะหรือราคาตรงนี้ได้เลย ไม่ต้องไปหน้าตารางแปลง
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-10">
        <section aria-labelledby="ov-status">
          <h2 id="ov-status" className="text-21 mb-4">
            สถานะ {live.length} แปลง
          </h2>
          {/* แถบสัดส่วนจริง — ความยาวแต่ละช่องคือจำนวนแปลง ไม่ใช่กราฟประดับ */}
          <div className="rounded-control mb-5 flex h-3 gap-0.5 overflow-hidden" aria-hidden>
            {present.map((s) => (
              <span
                key={s}
                className={cx(
                  BAR[s],
                  "ease-settle transition-[flex-grow] duration-250 motion-reduce:transition-none",
                )}
                style={{ flexGrow: by(s).length }}
              />
            ))}
          </div>
          <FactList
            divided
            rows={present.map((s) => [STATUS_TH[s], `${by(s).length} แปลง${sum(by(s))}`])}
          />
        </section>

        <section aria-labelledby="ov-leads">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="ov-leads" className="text-21">
              ลงทะเบียนล่าสุด
            </h2>
            {leads && leads.length > 0 && (
              <Link
                href="/admin/leads"
                className="text-15 text-pine font-medium underline-offset-4 hover:underline"
              >
                ดูทั้งหมด {leads.length} คน
              </Link>
            )}
          </div>
          {leads === null ? (
            <div className="min-h-32" aria-busy />
          ) : leads.length === 0 ? (
            <p className="text-15 text-moss">
              ยังไม่มีใครส่งฟอร์ม · พอมีคนลงทะเบียน ชื่อกับเบอร์จะขึ้นตรงนี้
            </p>
          ) : (
            <ul className="flex flex-col">
              {leads.slice(0, 5).map((l) => (
                <li
                  key={l.createdAt + l.phone}
                  className="border-concrete flex items-baseline justify-between gap-4 border-b py-3"
                >
                  <div className="min-w-0">
                    <p className="text-15 truncate font-medium">{l.name}</p>
                    <p className="text-13 text-moss">{interest(l, live, houseTypes)}</p>
                  </div>
                  <a
                    href={`tel:${l.phone}`}
                    className="text-15 text-pine shrink-0 font-medium tabular-nums underline-offset-4 hover:underline"
                  >
                    {l.phone}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
