"use client";

import { ButtonLink } from "@/components/site/ButtonLink";
import { Shell } from "@/components/site/Shell";
import { MasterPlan2D, planViewBox } from "@/components/three/MasterPlan2D";
import { SampleNote } from "@/components/site/SampleNote";
import { useLivePlots } from "@/lib/demo";
import type { HouseType, Plot, SitePlan } from "@/lib/schemas";
import { useGrove } from "@/lib/store";
import { useDict, useLocale } from "@/i18n/client";
import { masterPlanHref, plotHref, registerHref } from "@/lib/routes";
import { plotPriceText } from "@/lib/format";
import { STATUS_CHIP, isOpen, statusCounts } from "@/lib/status";
import { cx } from "@/lib/utils";

/* กระดานแปลงว่างบนหน้าแรก — ปลายทางของฉากเปิด หมู่บ้าน 3D ราบลงมาเป็นผังนี้ (HeroDiorama)
   ผังคือ MasterPlan2D ตัวเดียวกับหน้าผังโครงการ แตะแปลงแล้วแถบล่างบอกแบบ ขนาด ราคา ทันที
   แปลงที่เลือกอยู่ใน store กลาง กด "ดูบนผังโครงการ" แล้วหน้านั้นเปิดมาที่แปลงเดิม

   ทุกอย่างนอกจากตัวผังติด data-chrome — ฉากเปิดจางมันเข้ามาหลังผังราบลงแล้ว
   ส่วนตัวผังติด data-plan-flip ให้ฉากเปิดจับไปวางทับหมู่บ้าน 3D ก่อนราบลง */

export function PlotBoard({
  plots: source,
  houseTypes,
  plan,
  projectSlug,
  sample = false,
  className,
}: {
  plots: Plot[];
  houseTypes: HouseType[];
  plan: SitePlan;
  /** โครงการของผังนี้ — ลิงก์ไปผังโครงการและฟอร์มลงทะเบียนของโครงการนั้น */
  projectSlug: string;
  /** ผังแปลงตัวอย่าง (project.pending.plots) */
  sample?: boolean;
  className?: string;
}) {
  const plots = useLivePlots(source);
  const selectedPlot = useGrove((s) => s.selectedPlot);
  const plot = plots.find((p) => p.id === selectedPlot);
  const house = plot && houseTypes.find((h) => h.id === plot.houseTypeId);
  const t = useDict();
  const lang = useLocale();
  const vb = planViewBox(plan);
  const open = plot ? isOpen(plot.status) : false;

  return (
    <div className={cx("text-chalk flex min-h-full flex-col justify-center py-10", className)}>
      <Shell>
        <div data-chrome className="flex flex-wrap items-end justify-between gap-x-12 gap-y-3">
          <h2 className="text-34 lg:text-46 text-balance">{t.board.title}</h2>
          <p className="text-17 text-ash max-w-[44ch]">
            {t.board.lead(plots.length, plan.roadY1 - plan.roadY0)}
          </p>
        </div>
        {sample && <SampleNote kind="site" tone="ink" className="mt-4" />}
      </Shell>

      {/* ผังคงขนาดขั้นต่ำ (MasterPlan2D) แล้วให้ปัดดูบนจอแคบ
          จอใหญ่จำกัดความกว้างตามความสูงจอ ทั้งกระดานจะได้อยู่ในหนึ่งหน้าจอพอดี
          สัดส่วนมาจาก viewBox ของผังโครงการนั้น (รวมขอบ) · 22rem = หัวเรื่องกับแถบล่าง */}
      <div data-plan-flip className="mt-6 overflow-x-auto">
        <div
          className="mx-auto w-full px-6"
          style={{ maxWidth: `min(84rem, calc((100svh - 22rem) * ${(vb.w / vb.h).toFixed(3)}))` }}
        >
          <MasterPlan2D plots={source} plan={plan} houseTypes={houseTypes} sample={sample} />
        </div>
      </div>

      <Shell>
        <div
          data-chrome
          className="mt-6 flex min-h-12 flex-wrap items-center justify-between gap-x-8 gap-y-4"
          aria-live="polite"
        >
          {plot ? (
            <p className="text-17 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-display text-21 font-medium">{t.common.plot(plot.number)}</span>
              <span
                className={`rounded-pill text-13 px-3 py-1 font-medium ${STATUS_CHIP[plot.status]}`}
              >
                {t.status[plot.status]}
              </span>
              <span className="text-ash">
                {house?.name ?? "—"} · {plot.landSqw} {t.units.sqw} ·{" "}
                <span className="tabular-nums">{plotPriceText(plot, houseTypes, lang)}</span>
              </span>
            </p>
          ) : (
            <p className="text-17 text-ash">{t.board.hint(statusCounts(plots))}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {plot && open && (
              <ButtonLink
                href={registerHref({ project: projectSlug, plot: plot.id })}
                variant="onInk"
              >
                {t.common.registerPlot}
              </ButtonLink>
            )}
            <ButtonLink
              href={plot ? plotHref(projectSlug, plot.id) : masterPlanHref(projectSlug)}
              variant={open ? "onInkQuiet" : "onInk"}
            >
              {plot ? t.board.viewOnPlan : t.common.openPlan}
            </ButtonLink>
          </div>
        </div>
      </Shell>
    </div>
  );
}
