"use client";

import { useLivePlots } from "@/lib/demo";
import { useDict, useLocale } from "@/i18n/client";
import { plotFacts, plotPriceNote, plotPriceText, priceNote, sitingNote, sqw } from "@/lib/format";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";
import { useGrove } from "@/lib/store";
import { STATUS_CHIP } from "@/lib/status";
import { cx } from "@/lib/utils";

/* รายการแปลงใต้ผัง — อ่านแบบสมุดนำร่อง (pilot book): แต่ละแถวบอกว่าแปลงอยู่ตรงไหน หันทางไหน ใหญ่แค่ไหน
   และมีประโยคข้อเท็จจริงหนึ่งบรรทัดที่คำนวณจากผัง (plotFacts) ไม่ใช่คำโฆษณาที่พิมพ์เอง
   ใช้ตัวกรองสถานะและแปลงที่เลือกชุดเดียวกับผัง (store กลาง) แตะแถว = แตะแปลงบนผัง
   สถานะเป็นคำเสมอ สีของ chip เป็นตัวช่วย ไม่ใช่ตัวบอก (§1) */

function StatusChip({ status }: { status: Plot["status"] }) {
  const t = useDict();
  return (
    <span
      className={`rounded-pill text-13 inline-block px-2.5 py-1 font-medium whitespace-nowrap ${STATUS_CHIP[status]}`}
    >
      {t.status[status]}
    </span>
  );
}

export function PlotList({
  plots: source,
  houseTypes,
  plan,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
}) {
  const plots = useLivePlots(source);
  const selectedPlot = useGrove((s) => s.selectedPlot);
  const selectPlot = useGrove((s) => s.selectPlot);
  const statusFilter = useGrove((s) => s.statusFilter);
  const houseName = new Map(houseTypes.map((h) => [h.id, h.name] as const));
  const rows = plots.filter((p) => statusFilter === "all" || p.status === statusFilter);
  const lang = useLocale();
  const t = useDict();

  return (
    <div>
      <table className="text-15 w-full border-collapse">
        <caption className="text-13 text-moss mb-2 text-left">
          {t.plotList.caption(rows.length)}
        </caption>
        <thead>
          <tr className="border-concrete text-13 text-moss border-b text-left align-bottom">
            <th scope="col" className="py-2 pr-3 font-medium">
              {t.plotList.plot}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {t.plotList.typeLand}
            </th>
            <th scope="col" className="hidden py-2 pr-3 font-medium md:table-cell">
              {t.plotList.siting}
            </th>
            {/* จอแคบ: สถานะย้ายไปอยู่ใต้ราคา คอลัมน์แบบบ้านจะได้กว้างพอให้บรรทัดทิศไม่ตัดถี่ */}
            <th scope="col" className="py-2 text-right font-medium sm:pr-3">
              {t.plotList.price}
              <span className="sm:hidden">{t.plotList.priceStatus}</span>
            </th>
            <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">
              {t.plotList.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const selected = p.id === selectedPlot;
            const f = plotFacts(p, plots, plan, lang);
            return (
              <tr
                key={p.id}
                className={cx(
                  "border-concrete border-b align-top",
                  selected ? "bg-paper" : "hover:bg-paper",
                )}
              >
                <th scope="row" className="p-0 text-left font-normal">
                  {/* ปุ่มเต็มเซลล์แรก — แถวตารางเป็นปุ่มเองไม่ได้ทาง a11y จึงให้เลขแปลงเป็นตัวกด */}
                  <button
                    type="button"
                    onClick={() => selectPlot(selected ? null : p.id)}
                    aria-pressed={selected}
                    className={cx(
                      "font-display inline-flex min-h-11 w-full items-center pt-1.5 pr-3 text-left font-medium whitespace-nowrap",
                      selected && "underline decoration-2 underline-offset-4",
                    )}
                  >
                    {p.number}
                  </button>
                </th>
                <td className="py-3 pr-3">
                  {houseName.get(p.houseTypeId) ?? t.common.unspecified}
                  <span className="text-13 text-moss block tabular-nums">
                    {t.plotList.landLine(sqw(p.landSqw, lang), f.frontageM.toFixed(1))}
                  </span>
                  {/* จอแคบไม่มีคอลัมน์ทิศ — ย้ายมาเป็นบรรทัดล่างของแบบบ้าน */}
                  <span className="text-13 text-moss block md:hidden">
                    {[f.facing, f.note].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td className="hidden py-3 pr-3 md:table-cell">
                  <span className="tabular-nums">{f.facing ?? t.plotList.noRoad}</span>
                  <span className="text-13 text-moss block">{f.note}</span>
                </td>
                <td className="py-3 text-right sm:pr-3">
                  <span className="font-display font-medium whitespace-nowrap tabular-nums">
                    {plotPriceText(p, houseTypes, lang)}
                  </span>
                  <span className="mt-1.5 block sm:hidden">
                    <StatusChip status={p.status} />
                  </span>
                </td>
                <td className="hidden py-3 text-right sm:table-cell">
                  <StatusChip status={p.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-13 text-moss mt-3 max-w-[70ch]">
        {sitingNote(lang)} ·{" "}
        {/* แปลงที่ยังไม่มีราคารายแปลงแสดง "เริ่มต้น …*" ของแบบบ้าน — ต้องมีเชิงอรรถดอกจัน */}
        {plots.some((p) => p.price === null) ? priceNote(lang) : plotPriceNote(lang)}
        {t.format.sqwNote && ` ${t.format.sqwNote}`}
      </p>
    </div>
  );
}
