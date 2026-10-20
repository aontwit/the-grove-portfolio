"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/site/ButtonLink";
import { FactList } from "@/components/site/FactList";
import { useDict, useLocale } from "@/i18n/client";
import { localePath } from "@/i18n/config";
import { sqmText, metres, plotFacts, plotPriceText, sqw } from "@/lib/format";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";
import { useGrove } from "@/lib/store";
import { houseHref, plotHref, registerHref } from "@/lib/routes";
import { STATUS_CHIP, isOpen } from "@/lib/status";
import { useLivePlots } from "@/lib/demo";
import { cx } from "@/lib/utils";

/* รายละเอียดแปลงที่เลือก — ตัวเลขทุกตัวมาจาก plots.json (+ ค่าที่ admin แก้ในโหมดเดโม) ไม่มีค่าใดพิมพ์ซ้ำ
   จอแคบ panel นี้อยู่ในแผ่นล่างจอ (MasterPlanViewer) ซึ่งเริ่มแบบย่อ: เลขแปลง สถานะ แบบบ้าน ราคา ปุ่มหลัก
   ที่เหลือโผล่เมื่อกางแผ่น · จอกว้างเห็นครบเสมอ */

/** id หัวข้อของ panel — แผ่นล่างจอใช้เป็นชื่อ dialog และย้ายโฟกัสมาที่นี่ตอนเปิด */
export const PLOT_PANEL_TITLE = "plot-panel-title";

/* ทีมขายส่งแปลงให้ลูกค้าทาง LINE — กดแล้วได้ลิงก์ที่เปิดมาเจอแปลงนี้พร้อมแผงรายละเอียด
   คลิปบอร์ดถูกปฏิเสธได้ (http, iframe, สิทธิ์เบราว์เซอร์) — ตอนนั้นโชว์ลิงก์ในช่องให้คัดลอกเอง ไม่เงียบหาย */
async function copyText(text: string): Promise<boolean> {
  /* บางเบราว์เซอร์ (webview ในแอปแชต, iframe) ถามสิทธิ์แล้วค้าง promise ไว้ไม่จบ — รอไม่เกิน 1 วินาที */
  const viaApi = navigator.clipboard
    ? Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1000)),
      ]).catch(() => false)
    : Promise.resolve(false);
  if (await viaApi) return true;
  /* ทางเก่าที่ยังใช้ได้เกือบทุกที่ — ต้องอยู่ในช่วงที่ยังนับเป็นการกดของผู้ใช้ */
  const back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    back?.focus({ preventScroll: true });
  }
}

function CopyPlotLink({ plot, projectSlug }: { plot: Plot; projectSlug: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const lang = useLocale();
  const t = useDict().plotPanel;

  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  const copy = async () => {
    /* ลิงก์อยู่ในภาษาของหน้าที่กดคัดลอก — คนที่ได้ลิงก์ภาษาอังกฤษเปิดมาเจอหน้าภาษาอังกฤษ */
    const href = new URL(localePath(lang, plotHref(projectSlug, plot.id)), window.location.origin)
      .href;
    setUrl(href);
    setState((await copyText(href)) ? "copied" : "manual");
  };

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="text-15 text-pine inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        {t.copy}
      </button>
      <p role="status" className="text-13 text-moss">
        {state === "copied" && t.copied(plot.number)}
        {state === "manual" && t.manual}
      </p>
      {state === "manual" && (
        <input
          ref={field}
          readOnly
          value={url}
          aria-label={t.linkLabel(plot.number)}
          onFocus={(e) => e.currentTarget.select()}
          className="border-concrete bg-canvas rounded-control text-15 mt-2 h-11 w-full border px-3"
        />
      )}
    </div>
  );
}

export function PlotPanel({
  plots: source,
  houseTypes,
  plan,
  projectSlug,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  /** โครงการของผังนี้ — ลิงก์คัดลอก ลงทะเบียน และแบบบ้านชี้เข้าโครงการนี้ */
  projectSlug: string;
}) {
  const plots = useLivePlots(source);
  const selectedPlot = useGrove((s) => s.selectedPlot);
  const selectPlot = useGrove((s) => s.selectPlot);
  const expanded = useGrove((s) => s.plotSheetExpanded);
  /* ซ่อนเฉพาะตอนแผ่นล่างจอย่ออยู่ — จอกว้างไม่มีแผ่น จึงไม่โดน */
  const extra = cx(!expanded && "max-[1359px]:hidden");
  const plot = plots.find((p) => p.id === selectedPlot);
  const lang = useLocale();
  const t = useDict();

  if (!plot) {
    return (
      /* จอแคบไม่มีอะไรให้ทำกับการ์ดนี้ (อยู่ใต้รายการ 18 แถว) — แผ่นล่างจอขึ้นเองเมื่อแตะแปลง */
      <aside className="border-concrete rounded-card border p-5 max-[1359px]:hidden">
        <h2 className="text-21 mb-2">{t.plotPanel.emptyTitle}</h2>
        <p className="text-15 text-moss">{t.plotPanel.emptyBody}</p>
      </aside>
    );
  }

  const house = houseTypes.find((h) => h.id === plot.houseTypeId);
  const facts = plotFacts(plot, plots, plan, lang);
  /* แปลงอื่นที่ยังเปิดอยู่ (ว่าง/รอยืนยัน) ของแบบเดียวกัน — ทางไปต่อเมื่อแปลงที่เลือกปิดแล้ว หรืออยากเทียบขนาดที่ดิน */
  const siblings = plots.filter(
    (p) => p.id !== plot.id && p.houseTypeId === plot.houseTypeId && isOpen(p.status),
  );
  const open = isOpen(plot.status);

  return (
    /* จอใหญ่เป็นการ์ดในคอลัมน์ขวา · จอเล็กอยู่ในแผ่นล่างจอซึ่งมีขอบของมันเองแล้ว ไม่ซ้อนการ์ดในกรอบ */
    <aside className="min-[1360px]:border-concrete min-[1360px]:rounded-card p-2 min-[1360px]:border min-[1360px]:p-5">
      <div className="mb-4 flex items-center gap-3">
        <h2 id={PLOT_PANEL_TITLE} tabIndex={-1} className="text-26 focus:outline-none">
          {t.common.plot(plot.number)}
        </h2>
        <span
          className={`rounded-pill text-13 px-3 py-1.5 font-medium ${STATUS_CHIP[plot.status]}`}
        >
          {t.status[plot.status]}
        </span>
        <button
          type="button"
          onClick={() => selectPlot(null)}
          className="text-15 text-moss hover:text-ironwood -mr-2 ml-auto inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-medium"
        >
          {t.common.close}
        </button>
      </div>

      <FactList
        rows={[
          [t.common.labels.house, house?.name ?? t.common.unspecified],
          [t.common.labels.price, plotPriceText(plot, houseTypes, lang)],
        ]}
      />
      {/* บรรทัดข้อเท็จจริงจากผัง — อยู่ในแผ่นย่อด้วย เพราะตอบคำถามแรกของคนดูแปลง: หันทางไหน อยู่ตรงไหน
          เชิงอรรถว่าคิดทิศ/แดด/ราคาอย่างไรอยู่ใต้รายการแปลง (PlotList) ที่เดียว ไม่พิมพ์ซ้ำในหน้าเดียวกัน */}
      <p className="text-15 mt-3">
        {facts.facing ? t.plotPanel.facing(facts.facing) : t.plotPanel.noRoad}
        <span className="text-moss block">{facts.note}</span>
      </p>
      <FactList
        className={cx("mt-4", extra)}
        rows={[
          [t.common.labels.land, sqw(plot.landSqw, lang)],
          [
            t.plotPanel.frontageDepth,
            t.plotPanel.dims(facts.frontageM.toFixed(1), facts.depthM.toFixed(1)),
          ],
          [t.common.labels.area, house ? sqmText(house.areaSqm, lang) : t.common.unspecified],
          [t.plotPanel.fromEntry, t.plotPanel.fromEntryValue(metres(facts.fromEntryM, lang))],
        ]}
      />
      <div className="mt-2">
        <CopyPlotLink key={plot.id} plot={plot} projectSlug={projectSlug} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {plot.status === "unconfirmed" && (
          <p className="text-15 text-moss">{t.plotPanel.unconfirmed}</p>
        )}
        {open ? (
          <ButtonLink
            href={registerHref({ project: projectSlug, plot: plot.id })}
            className="w-full"
          >
            {t.common.registerPlot}
          </ButtonLink>
        ) : (
          <p className="text-15 text-moss">
            {plot.status === "sold" ? t.plotPanel.sold : t.plotPanel.reserved}
            {siblings.length > 0 ? t.plotPanel.siblingsSame : t.plotPanel.siblingsOther}
          </p>
        )}
        {/* แปลงไม่ว่าง: รายการนี้คือทางไปต่อหลัก จึงอยู่ในแผ่นย่อด้วย */}
        {siblings.length > 0 && (
          <div className={cx(open && extra)}>
            {open && (
              <p className="text-13 text-moss mb-2">
                {t.plotPanel.otherAvailable(house?.name ?? "")}
              </p>
            )}
            <ul className="flex flex-wrap gap-2">
              {siblings.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPlot(p.id)}
                    className="border-concrete rounded-control text-15 hover:border-ironwood inline-flex min-h-11 items-center gap-2 border px-3 font-medium"
                  >
                    {p.number}
                    <span className="text-moss text-13 font-normal">
                      {p.landSqw} {t.units.sqw}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {house && (
          <ButtonLink
            href={houseHref(projectSlug, house.slug)}
            variant="secondary"
            className={cx("w-full", extra)}
          >
            {t.common.seeType(house.name)}
          </ButtonLink>
        )}
      </div>
    </aside>
  );
}
