"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, buttonClass } from "@/components/site/ButtonLink";
import { FactList } from "@/components/site/FactList";
import { OrPending } from "@/components/site/Pending";
import { Link, useDict, useLocale } from "@/i18n/client";
import { getProjectsDictionary } from "@/i18n/projects";
import { useLiveHouses, useLivePlots } from "@/lib/demo";
import { submitLead } from "@/lib/leads";
import { budgetBrackets, budgetLabel, million } from "@/lib/lead";
import {
  contactChannelSchema,
  contactTimeSchema,
  leadFormSchema,
  type ContactChannel,
  type ContactTime,
  type HouseType,
  type Lead,
  type Plot,
  type Project,
  type SiteSettings,
} from "@/lib/schemas";
import { hasContent, projectLabel } from "@/lib/projects";
import { PROJECTS_PATH, houseHref, masterPlanHref } from "@/lib/routes";
import { facebookHref, lineHref, telHref } from "@/lib/contact";
import { lowestOpen, plotPrice } from "@/lib/format";
import { STATUS_CHIP, isOpen } from "@/lib/status";
import { baht, cx } from "@/lib/utils";

/* ฟอร์มลงทะเบียน — ตรวจด้วย zod ชุดเดียวกับที่เก็บจริง
   phase นี้บันทึกลง localStorage ผ่าน lib/leads (admin อ่านจากที่เดียวกัน) phase หลังเปลี่ยนเป็น API โดยไม่ต้องแก้ฟอร์ม
   PDPA: รับทราบนโยบาย (บังคับ) กับรับข่าวสาร (ไม่บังคับ ไม่ติ๊กไว้ก่อน) เป็นสองช่องแยกกัน
   lead ทุกแถวเก็บเวลาที่กดส่ง + เลขฉบับนโยบายที่รับทราบ + คำตอบเรื่องข่าวสาร
   คำทั้งหมดอยู่ใน i18n (form.*) · ข้อความ error เลือกตามชื่อช่อง (form.errors) ไม่ได้ใช้ข้อความไทยใน schema ตรงๆ
   ภาษาไทยของ form.errors ตรงกับ leadFormSchema ทุกตัวอักษร */

/** ช่องที่มีข้อความ error ได้ เรียงตามลำดับในหน้า — ใช้หาช่องแรกที่ต้องแก้ตอนกดส่ง */
const FIELDS = ["name", "phone", "lineId", "email", "message", "privacyAck"] as const;
type FieldName = (typeof FIELDS)[number];
type Errors = Partial<Record<FieldName, string>>;
type Done = {
  name: string;
  phone: string;
  channel: ContactChannel;
  lineId: string;
  contactTime: ContactTime;
  budget: string;
  marketing: boolean;
  plot?: Plot;
  house?: HouseType;
  project?: Project;
  duplicate: boolean;
};

/** ปุ่ม "ไปดูผัง" ของโครงการที่เลือก — โครงการที่ยังไม่มีผัง พาไปรายการโครงการแทน ไม่พาไปผังของโครงการอื่น
    ยังไม่ได้เลือกโครงการ = ผังของโครงการแรกที่มีผัง */
function planTarget(project: Project | undefined, projects: readonly Project[]) {
  const target = project ? (project.plan ? project : undefined) : projects.find((x) => x.plan);
  return target
    ? { href: masterPlanHref(target.slug), plan: true }
    : { href: PROJECTS_PATH, plan: false };
}

/* พื้น paper (งาช้าง) ขอบ moss — ช่องกรอกแยกจากพื้น canvas ด้วยเส้นขอบ ไม่ใช่พื้นทึบ (§1)
   error = ขอบ teak แบบเดียวกับช่องกรอกหลังบ้าน (components/admin/fields.tsx)
   ตัวอักษร 17px ทุกจอ — ต่ำกว่า 16px แล้ว Safari บน iPhone/iPad ซูมหน้าทุกครั้งที่แตะช่อง */
const FIELD =
  "bg-paper text-ironwood border-moss rounded-control text-17 w-full border px-3.5 aria-[invalid=true]:border-teak";
const LABEL = "text-15 font-medium";
const OPTIONAL = "text-moss font-normal";

/* ตัวเลือกแบบปุ่ม (radio จริง ลูกศรเปลี่ยนค่าได้) — สูง 48px · ที่เลือกอยู่ = ขอบ pine หนา + ตัวหนา ไม่พึ่งสีอย่างเดียว */
const CHOICE =
  "rounded-control text-15 flex min-h-12 cursor-pointer items-center justify-center border px-3 text-center " +
  "has-[:focus-visible]:outline-pine has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 " +
  "transition-colors duration-200 motion-reduce:transition-none " +
  "border-moss has-[:checked]:border-pine has-[:checked]:bg-paper has-[:checked]:text-pine has-[:checked]:font-semibold has-[:checked]:border-[1.5px]";

/* ช่องทางติดต่อกดได้ทันทีบนมือถือ — พื้นที่กดสูง 44px แบบเดียวกับ footer */
const CONTACT_LINK =
  "text-pine inline-flex min-h-11 items-center font-medium tabular-nums underline-offset-4 hover:underline";

export function RegisterForm({
  projects,
  plots,
  houseTypes,
  site,
}: {
  /** ทุกโครงการของภาษาหน้า (repo.listProjects(lang)) — ช่องแรกของฟอร์ม */
  projects: Project[];
  /** แปลงและแบบบ้านของทุกโครงการ — ฟอร์มกรองตามโครงการที่เลือก */
  plots: Plot[];
  houseTypes: HouseType[];
  site: SiteSettings;
}) {
  const params = useSearchParams();
  const lang = useLocale();
  const t = useDict();
  const f = t.form;
  const livePlots = useLivePlots(plots);
  const liveHouses = useLiveHouses(houseTypes, lang);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  /* มาจากแผงแปลง (/register?plot=…) หรือหน้าแบบบ้าน (/register?type=…) — เติมให้ ไม่ต้องเลือกซ้ำ */
  const paramPlot = params.get("plot") ?? "";
  const typeSlug = params.get("type") ?? "";
  /* ?project=<slug> จากหน้าโครงการ · แปลงหรือแบบบ้านที่ส่งมาด้วยบอกโครงการได้เองอยู่แล้ว (แปลงมาก่อน) */
  const paramProject = params.get("project") ?? "";
  const [projectChoice, setProjectChoice] = useState(
    () =>
      plots.find((x) => x.id === paramPlot)?.projectId ??
      projects.find((x) => x.slug === paramProject)?.id ??
      houseTypes.find((h) => h.slug === typeSlug)?.projectId ??
      "",
  );
  const project = projects.find((x) => x.id === projectChoice);
  const pj = getProjectsDictionary(lang);
  /** โครงการที่เลือกยังไม่มีข้อมูล — ไม่มีแบบบ้าน แปลง หรืองบให้เลือก */
  const waiting = project !== undefined && !hasContent(project);
  const inProject = (x: { projectId: string }) => !project || x.projectId === project.id;
  const [plotChoice, setPlotChoice] = useState(paramPlot);
  const [houseChoice, setHouseChoice] = useState(typeSlug);
  const [channel, setChannel] = useState<ContactChannel>("phone");
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  /* เลือกได้เฉพาะแปลงที่ยังเปิดอยู่ (ว่าง หรือรอยืนยันสถานะ) — จอง/ขายแล้วเลือกไม่ได้
     สถานะอ่านผ่าน useLivePlots จะได้ตรงกับที่ admin เพิ่งแก้ */
  const available = livePlots.filter((p) => isOpen(p.status) && inProject(p));
  const projectHouses = liveHouses.filter(inProject);
  const plot = available.find((p) => p.id === plotChoice);
  const house = plot
    ? liveHouses.find((h) => h.id === plot.houseTypeId)
    : projectHouses.find((h) => h.slug === houseChoice);
  /* ช่วงงบคิดจากราคาจริงของโครงการที่เลือก (ราคารายแปลง หรือราคาเริ่มต้นของแบบที่ผู้พัฒนาประกาศ) */
  const brackets = budgetBrackets(livePlots.filter(inProject), liveHouses, lang);
  const plan = planTarget(project, projects);

  /* ?plot= ที่ใช้ไม่ได้ — บอกตรงๆ ในการ์ดสรุป แทนที่จะเงียบแล้วส่งฟอร์มโดยไม่มีแปลง */
  const linked = livePlots.find((p) => p.id === paramPlot);
  const unusable = !plot && paramPlot !== "" && (!linked || !isOpen(linked.status));

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  /* ค่าในฟอร์มตอนนี้ → รูปที่ leadFormSchema ตรวจ */
  const read = (form: HTMLFormElement) => {
    const f = new FormData(form);
    const text = (k: string) => String(f.get(k) ?? "");
    const ch = contactChannelSchema.safeParse(text("channel"));
    const time = contactTimeSchema.safeParse(text("contactTime"));
    const picked = ch.success ? ch.data : "phone";
    return {
      name: text("name"),
      phone: text("phone"),
      email: text("email"),
      projectId: project?.id ?? plot?.projectId ?? house?.projectId ?? "",
      plotId: plot?.id ?? "",
      houseTypeSlug: house?.slug ?? "",
      budget: text("budget"),
      channel: picked,
      /* LINE ID ใช้เฉพาะตอนเลือกติดต่อทาง LINE — เปลี่ยนใจกลับเป็นโทร ไม่เก็บค่าที่พิมพ์ค้างไว้ */
      lineId: picked === "line" ? text("lineId") : "",
      contactTime: time.success ? time.data : "any",
      message: text("message"),
      privacyAck: f.get("privacyAck") === "on",
      marketingOptIn: f.get("marketingOptIn") === "on",
    };
  };

  const issues = (form: HTMLFormElement): Errors => {
    const parsed = leadFormSchema.safeParse(read(form));
    const next: Errors = {};
    if (parsed.success) return next;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && isField(key) && !next[key]) next[key] = f.errors[key];
    }
    return next;
  };

  /* ตรวจทีละช่อง: ออกจากช่องที่กรอกแล้ว → ตรวจ · ช่องที่ขึ้น error อยู่ → ตรวจใหม่ทุกครั้งที่พิมพ์
     ข้อความหายทันทีที่แก้ถูก ไม่ต้องรอกดส่ง · ช่องว่างที่แค่กดผ่านไม่โดนเตือน */
  const check = (name: FieldName, force: boolean) => {
    const form = formRef.current;
    if (!form || (!force && !errors[name])) return;
    const message = issues(form)[name];
    if (message !== errors[name]) setErrors((prev) => ({ ...prev, [name]: message }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const next = issues(form);
    setErrors(next);
    setFailed(false);

    const first = FIELDS.find((f) => next[f]);
    if (first) {
      /* พาไปช่องแรกที่ต้องแก้ — คนใช้ screen reader ได้ยินข้อความ error ผ่าน aria-describedby */
      const el = form.elements.namedItem(first);
      if (el instanceof HTMLElement) el.focus();
      return;
    }

    const parsed = leadFormSchema.safeParse(read(form));
    if (!parsed.success) return;
    const v = parsed.data;
    const now = new Date().toISOString();
    const lead: Lead = {
      name: v.name,
      phone: v.phone,
      email: v.email,
      projectId: v.projectId,
      plotId: v.plotId,
      houseTypeSlug: v.houseTypeSlug,
      budget: v.budget,
      channel: v.channel,
      lineId: v.lineId,
      contactTime: v.contactTime,
      message: v.message,
      createdAt: now,
      consent: { privacyVersion: site.privacy.version, at: now, marketing: v.marketingOptIn },
      locale: lang,
    };

    setPending(true);
    try {
      const { duplicate } = await submitLead(lead);
      setDone({
        name: v.name,
        phone: v.phone,
        channel: v.channel,
        lineId: v.lineId,
        contactTime: v.contactTime,
        budget: v.budget,
        marketing: v.marketingOptIn,
        plot,
        house,
        project: projects.find((x) => x.id === v.projectId),
        duplicate,
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  /* ช่องกรอก 1 ช่อง: label + input + ข้อความ error ที่ผูกด้วย aria-describedby */
  const fieldProps = (name: FieldName) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
    onChange: () => check(name, false),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      check(name, e.currentTarget.value.trim() !== ""),
  });
  const errorText = (name: FieldName) =>
    errors[name] && (
      <p id={`${id}-${name}-error`} className="text-15 text-teak font-medium">
        {errors[name]}
      </p>
    );
  const errorCount = FIELDS.filter((f) => errors[f]).length;

  /* ราคาเริ่มต้นของแบบบ้าน = แปลงที่ยังเปิดอยู่ที่ถูกที่สุดของแบบนั้น — ยังไม่มีราคารายแปลง
     จึงเท่ากับราคาเริ่มต้นที่ผู้พัฒนาประกาศ · ไม่มีแปลงเปิด (แบบขายหมด) = null */
  const availableOf = (h: HouseType) => available.filter((p) => p.houseTypeId === h.id);
  const fromPrice = (h: HouseType) => lowestOpen(available, liveHouses, h.id);
  /** ราคาของแปลงที่เลือก: ราคารายแปลง "x บาท*" หรือราคาเริ่มต้นของแบบ "เริ่มต้น x บาท*" */
  const plotPriceLabel = (p: Plot) => {
    const price = plotPrice(p, liveHouses);
    if (!price) return t.common.unspecified;
    return price.from
      ? t.format.priceFromExact(baht(price.amount))
      : f.priceValue(baht(price.amount));
  };
  const houseFrom = house ? fromPrice(house) : null;

  const details = (p: Plot | undefined, h: HouseType | undefined): [string, string][] => {
    const rows: [string, string][] = [];
    const l = t.common.labels;
    if (p) rows.push([l.land, f.landValue(p.landSqw)]);
    if (h) rows.push([l.house, h.name], [l.area, f.areaValue(h.areaSqm.toFixed(1))]);
    if (p) rows.push([l.price, plotPriceLabel(p)]);
    else if (h) {
      const from = fromPrice(h);
      rows.push([l.price, from ? f.fromValue(million(from)) : t.common.noAvailable]);
    }
    return rows;
  };

  /* แปลงว่างจัดกลุ่มตามแบบบ้าน — เลือกแบบไว้แล้วเหลือเฉพาะแปลงของแบบนั้น
     ชื่อแบบอยู่ในตัวเลือกด้วย เพราะ select บนมือถือบางเครื่องไม่โชว์หัวกลุ่ม */
  const filterHouse = projectHouses.find((h) => h.slug === houseChoice);
  const groups = projectHouses
    .filter((h) => !filterHouse || h.id === filterHouse.id)
    .map((h) => ({ house: h, plots: available.filter((p) => p.houseTypeId === h.id) }))
    .filter((g) => g.plots.length > 0);
  const plotCount = groups.reduce((n, g) => n + g.plots.length, 0);

  const onHouse = (slug: string) => {
    setHouseChoice(slug);
    const h = projectHouses.find((x) => x.slug === slug);
    /* เปลี่ยนแบบ (รวมถึงกลับไป "ยังไม่แน่ใจ") แล้วแปลงที่เลือกไว้ไม่ใช่แบบนั้น → ล้างแปลง ไม่ให้ช่องแบบเด้งกลับ */
    if (plot && plot.houseTypeId !== h?.id) setPlotChoice("");
  };
  const onPlot = (plotId: string) => {
    setPlotChoice(plotId);
    const p = available.find((x) => x.id === plotId);
    const h = p && liveHouses.find((x) => x.id === p.houseTypeId);
    if (h) setHouseChoice(h.slug);
    if (p) setProjectChoice(p.projectId);
  };
  /* เปลี่ยนโครงการ → ล้างแบบบ้านและแปลงที่ไม่ใช่ของโครงการนั้น */
  const onProject = (projectId: string) => {
    setProjectChoice(projectId);
    if (plot && projectId && plot.projectId !== projectId) setPlotChoice("");
    if (house && projectId && house.projectId !== projectId) setHouseChoice("");
  };

  const priceNote = (
    <p className="text-13 text-moss mt-4">
      {f.priceNote}{" "}
      <Link href="/terms" className="text-pine font-medium underline underline-offset-4">
        {f.priceTerms}
      </Link>
    </p>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,34rem)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-8">
      {/* สิ่งที่เลือกไว้มาก่อนช่องกรอกบนมือถือ — คนกรอกเห็นตั้งแต่แรกว่ากำลังลงทะเบียนให้แปลงไหน */}
      {!done && (
        <section
          aria-labelledby={`${id}-sel`}
          className="border-concrete rounded-card border p-5 lg:col-start-2 lg:row-start-1"
        >
          {plot || house ? (
            <>
              <h2 id={`${id}-sel`} className="text-21 tabular-nums">
                {plot ? (
                  <>
                    {f.selPlotBefore}
                    <span className="whitespace-nowrap">{t.common.plot(plot.number)}</span>
                  </>
                ) : (
                  f.selHouse(house?.name ?? "")
                )}
              </h2>
              {/* มือถือ: บรรทัดเดียวพอ ไม่ดันช่องกรอกลงไปไกล · จอใหญ่มีที่ให้ตารางเต็ม */}
              <p className="text-15 text-moss mt-1 tabular-nums lg:hidden">
                {plot
                  ? f.selPlotLine(house ? house.name : null, plotPriceLabel(plot), plot.landSqw)
                  : house && houseFrom
                    ? f.selHouseLine(million(houseFrom), availableOf(house).length)
                    : f.selNone}
              </p>
              <FactList className="mt-4 hidden lg:flex" rows={details(plot, house)} />
              {(plot || houseFrom) && priceNote}
            </>
          ) : unusable ? (
            <div role="status">
              {linked ? (
                <h2 id={`${id}-sel`} className="text-21 flex flex-wrap items-center gap-2">
                  {t.common.plot(linked.number)}
                  <span
                    className={cx(
                      "rounded-pill text-13 inline-flex h-7 items-center px-2.5 font-medium",
                      STATUS_CHIP[linked.status],
                    )}
                  >
                    {t.status[linked.status]}
                  </span>
                </h2>
              ) : (
                <h2 id={`${id}-sel`} className="text-21 break-all">
                  {f.notFound(paramPlot)}
                </h2>
              )}
              <p className="text-15 text-moss mt-2">{linked ? f.unusable : f.unknown}</p>
              <ButtonLink href={plan.href} variant="secondary" className="mt-4 w-full">
                {plan.plan ? t.common.openPlan : pj.home.seeAll}
              </ButtonLink>
            </div>
          ) : (
            <>
              <h2 id={`${id}-sel`} className="text-21">
                {project ? projectLabel(project, lang) : f.emptyTitle}
              </h2>
              <p className="text-15 text-moss mt-2">
                {waiting ? pj.register.pendingNote : f.emptyBody}
              </p>
              <ButtonLink href={plan.href} variant="secondary" className="mt-4 w-full">
                {plan.plan ? t.common.openPlan : pj.home.seeAll}
              </ButtonLink>
            </>
          )}
        </section>
      )}

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {done ? (
          <Confirmation
            done={done}
            site={site}
            plan={planTarget(done.project, projects)}
            headingRef={doneRef}
          />
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending}>
            <fieldset className="flex flex-col gap-5">
              <legend className="font-display text-21 mb-5 font-medium">{f.houseLegend}</legend>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-project`} className={LABEL}>
                  {pj.register.projectLabel} <span className={OPTIONAL}>{f.optional}</span>
                </label>
                <select
                  id={`${id}-project`}
                  name="project"
                  value={project?.id ?? ""}
                  onChange={(e) => onProject(e.target.value)}
                  className={cx(FIELD, "h-12")}
                >
                  <option value="">{pj.register.projectNone}</option>
                  {projects.map((x) => (
                    <option key={x.id} value={x.id}>
                      {projectLabel(x, lang)}
                      {x.status !== "live" && ` · ${pj.status[x.status]}`}
                    </option>
                  ))}
                </select>
              </div>

              {!waiting && (
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-house`} className={LABEL}>
                      {f.houseLabel} <span className={OPTIONAL}>{f.optional}</span>
                    </label>
                    <select
                      id={`${id}-house`}
                      name="house"
                      value={house?.slug ?? ""}
                      onChange={(e) => onHouse(e.target.value)}
                      className={cx(FIELD, "h-12")}
                    >
                      <option value="">{f.houseNone}</option>
                      {projectHouses.map((h) => {
                        const n = availableOf(h).length;
                        return (
                          <option key={h.id} value={h.slug}>
                            {h.name} · {n > 0 ? f.availableN(n) : t.common.noAvailable}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-plot`} className={LABEL}>
                      {f.plotLabel}{" "}
                      <span className={OPTIONAL}>
                        {f.plotCount(plotCount, filterHouse ? filterHouse.name : null)}
                      </span>
                    </label>
                    <select
                      id={`${id}-plot`}
                      name="plot"
                      value={plot?.id ?? ""}
                      onChange={(e) => onPlot(e.target.value)}
                      className={cx(FIELD, "h-12 tabular-nums")}
                    >
                      <option value="">{f.plotNone}</option>
                      {groups.map((g) => (
                        <optgroup key={g.house.id} label={f.plotGroup(g.house.name)}>
                          {g.plots.map((p) => {
                            const price = plotPrice(p, liveHouses);
                            return (
                              <option key={p.id} value={p.id}>
                                {f.plotOption(
                                  p.number,
                                  g.house.name,
                                  million(price?.amount ?? g.house.priceFrom),
                                  price?.from ?? true,
                                )}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {brackets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-budget`} className={LABEL}>
                    {f.budgetLabel} <span className={OPTIONAL}>{f.optional}</span>
                  </label>
                  <select
                    id={`${id}-budget`}
                    name="budget"
                    defaultValue=""
                    className={cx(FIELD, "h-12 tabular-nums")}
                  >
                    <option value="">{f.budgetNone}</option>
                    {brackets.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label} ·{" "}
                        {b.available > 0 ? f.availableN(b.available) : t.common.noAvailable}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </fieldset>

            <fieldset className="mt-10 flex flex-col gap-5">
              <legend className="font-display text-21 mb-5 font-medium">{f.contactLegend}</legend>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-name`} className={LABEL}>
                  {f.name}
                </label>
                <input
                  {...fieldProps("name")}
                  type="text"
                  autoComplete="name"
                  className={cx(FIELD, "h-12")}
                />
                {errorText("name")}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-phone`} className={LABEL}>
                  {f.phone}
                </label>
                <input
                  {...fieldProps("phone")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className={cx(FIELD, "h-12 tabular-nums")}
                />
                {errorText("phone")}
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className={cx(LABEL, "mb-2")}>{f.channel}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {contactChannelSchema.options.map((c) => (
                    <label key={c} className={CHOICE}>
                      <input
                        type="radio"
                        name="channel"
                        value={c}
                        checked={channel === c}
                        onChange={() => setChannel(c)}
                        className="sr-only"
                      />
                      {t.lead.channel[c]}
                    </label>
                  ))}
                </div>
              </fieldset>

              {channel === "line" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-lineId`} className={LABEL}>
                    LINE ID <span className={OPTIONAL}>{f.lineIdHint}</span>
                  </label>
                  <input
                    {...fieldProps("lineId")}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={cx(FIELD, "h-12")}
                  />
                  {errorText("lineId")}
                </div>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className={cx(LABEL, "mb-2")}>{f.time}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {contactTimeSchema.options.map((time) => (
                    <label key={time} className={CHOICE}>
                      <input
                        type="radio"
                        name="contactTime"
                        value={time}
                        defaultChecked={time === "any"}
                        className="sr-only"
                      />
                      {t.lead.time[time]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-email`} className={LABEL}>
                  {f.email} <span className={OPTIONAL}>{f.optionalText}</span>
                </label>
                <input
                  {...fieldProps("email")}
                  type="email"
                  autoComplete="email"
                  className={cx(FIELD, "h-12")}
                />
                {errorText("email")}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-message`} className={LABEL}>
                  {f.message} <span className={OPTIONAL}>{f.optionalText}</span>
                </label>
                <textarea {...fieldProps("message")} rows={4} className={cx(FIELD, "py-3")} />
                {errorText("message")}
              </div>
            </fieldset>

            {/* PDPA — สองช่องแยกกัน ไม่ติ๊กไว้ให้ก่อนทั้งคู่ · ไม่รับข่าวสารก็ส่งฟอร์มได้ตามปกติ */}
            <fieldset className="border-concrete mt-10 flex flex-col gap-3 border-t pt-6">
              <legend className="sr-only">{f.consentLegend}</legend>
              <div className="flex flex-col gap-1">
                <label className="text-15 flex min-h-11 cursor-pointer items-start gap-3 py-1">
                  <input
                    id={`${id}-privacyAck`}
                    name="privacyAck"
                    type="checkbox"
                    aria-invalid={errors.privacyAck ? true : undefined}
                    aria-describedby={cx(
                      `${id}-privacyAck-note`,
                      errors.privacyAck && `${id}-privacyAck-error`,
                    )}
                    onChange={() => check("privacyAck", Boolean(errors.privacyAck))}
                    className="accent-pine mt-0.5 size-6 shrink-0 cursor-pointer"
                  />
                  <span>
                    {f.ackBefore}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-pine font-medium underline underline-offset-4"
                    >
                      {f.ackLink}
                      <span className="sr-only">{t.common.newTab}</span>
                    </Link>
                    {f.ackAfter}
                    <span id={`${id}-privacyAck-note`} className="text-moss block">
                      {f.ackNote}
                    </span>
                  </span>
                </label>
                <div className="pl-9">{errorText("privacyAck")}</div>
              </div>
              <label className="text-15 flex min-h-11 cursor-pointer items-start gap-3 py-1">
                <input
                  name="marketingOptIn"
                  type="checkbox"
                  className="accent-pine mt-0.5 size-6 shrink-0 cursor-pointer"
                />
                <span>
                  {f.marketing} <span className={OPTIONAL}>{f.marketingHint}</span>
                </span>
              </label>
            </fieldset>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="submit"
                disabled={pending}
                className={buttonClass("primary", "w-full sm:w-auto sm:self-start")}
              >
                {pending ? f.sending : f.submit}
              </button>
              <p role="status" className="text-15 text-teak font-medium empty:hidden">
                {failed
                  ? f.failed(site.contactPhone)
                  : errorCount > 0
                    ? f.errorCount(errorCount)
                    : ""}
              </p>
            </div>
          </form>
        )}
      </div>

      <section
        aria-labelledby={`${id}-contact`}
        className="border-concrete rounded-card border p-5 lg:col-start-2 lg:row-start-2"
      >
        <h2 id={`${id}-contact`} className="text-15 font-medium">
          {f.talkNow}
        </h2>
        <dl className="text-15 mt-2 flex flex-col">
          <ContactRow label={f.phoneShort}>
            <a href={telHref(site.contactPhone)} className={CONTACT_LINK}>
              {site.contactPhone}
            </a>
          </ContactRow>
          <ContactRow label={f.line}>
            {site.lineId ? (
              <a href={lineHref(site.lineId)} className={CONTACT_LINK}>
                {site.lineId}
              </a>
            ) : (
              <OrPending value={null} lang={lang} />
            )}
          </ContactRow>
          <ContactRow label={f.facebook}>
            {site.facebook ? (
              <a href={facebookHref(site.facebook)} className={CONTACT_LINK}>
                @{site.facebook}
              </a>
            ) : (
              <OrPending value={null} lang={lang} />
            )}
          </ContactRow>
          <ContactRow label={f.email}>
            {site.contactEmail ? (
              <a href={`mailto:${site.contactEmail}`} className={cx(CONTACT_LINK, "break-all")}>
                {site.contactEmail}
              </a>
            ) : (
              <OrPending value={null} lang={lang} />
            )}
          </ContactRow>
          <ContactRow label={f.salesHours}>
            <OrPending value={site.salesHours} lang={lang} />
          </ContactRow>
        </dl>
      </section>
    </div>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <dt className="text-moss">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function isField(key: string): key is FieldName {
  return (FIELDS as readonly string[]).includes(key);
}

/** หลังส่งสำเร็จ ฟอร์มหายไปทั้งก้อน — กดส่งซ้ำไม่ได้ และเห็นชัดว่าส่งอะไรไปแล้ว ต่อไปจะเกิดอะไร */
function Confirmation({
  done,
  site,
  plan,
  headingRef,
}: {
  done: Done;
  site: SiteSettings;
  /** ปุ่มไปผังของโครงการที่เลือก (planTarget) */
  plan: { href: string; plan: boolean };
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const lang = useLocale();
  const t = useDict();
  const d = t.form.done;
  const { plot, house, project } = done;
  const pj = getProjectsDictionary(lang);
  const viaLine = done.channel === "line";
  const rows: [string, string][] = [
    [d.phone, done.phone],
    [d.channel, viaLine ? `LINE${done.lineId ? ` ${done.lineId}` : ""}` : t.lead.channel.phone],
    [d.time, t.lead.time[done.contactTime]],
  ];
  if (plot) {
    const price = plotPrice(plot, house ? [house] : []);
    rows.push([d.plot, plot.number]);
    if (price)
      rows.push([
        t.common.labels.price,
        price.from
          ? t.format.priceFromExact(baht(price.amount))
          : t.form.priceValue(baht(price.amount)),
      ]);
  }
  if (project) rows.push([pj.register.projectLabel, projectLabel(project, lang)]);
  if (house) rows.push([t.common.labels.house, house.name]);
  if (done.budget) rows.push([d.budget, budgetLabel(done.budget, lang)]);
  rows.push([d.marketing, done.marketing ? d.yes : d.no]);

  const when = t.lead.timePhrase[done.contactTime];
  const what = plot ? (done.duplicate ? d.whatThisPlot : d.whatPlot(plot.number)) : d.whatAny;

  return (
    <section className="bg-paper rounded-card p-6" aria-labelledby="register-done">
      <h2
        id="register-done"
        ref={headingRef}
        tabIndex={-1}
        className="text-26 focus-visible:outline-none"
      >
        {d.title(done.name)}
      </h2>
      <p className="text-17 mt-2 max-w-[60ch]">
        {done.duplicate ? d.duplicate(plot ? plot.number : null) : ""}
        {d.next(viaLine, when, what)}
      </p>
      <p className="text-15 text-moss mt-3 max-w-[60ch]">{d.notBooking}</p>

      <FactList className="mt-5" divided rows={rows} />
      {plot && <p className="text-13 text-moss mt-3">{t.form.priceNote}</p>}

      <dl className="text-15 mt-5 flex flex-col gap-1">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-moss">{d.replyWithin}</dt>
          <dd>
            <OrPending value={site.replyTime} lang={lang} />
          </dd>
        </div>
      </dl>
      <p className="text-15 mt-1">
        {d.callBefore}
        <a
          href={telHref(site.contactPhone)}
          className="text-pine font-medium tabular-nums underline underline-offset-4"
        >
          {site.contactPhone}
        </a>
        {d.callAfter}
      </p>
      {(site.lineId || site.facebook) && (
        <p className="text-15 mt-1">
          {d.chatAlso}{" "}
          {site.lineId && (
            <a
              href={lineHref(site.lineId)}
              className="text-pine font-medium whitespace-nowrap underline underline-offset-4"
            >
              LINE {site.lineId}
            </a>
          )}
          {site.lineId && site.facebook && " · "}
          {site.facebook && (
            <a
              href={facebookHref(site.facebook)}
              className="text-pine font-medium whitespace-nowrap underline underline-offset-4"
            >
              Facebook @{site.facebook}
            </a>
          )}
        </p>
      )}

      {site.demo && <p className="text-13 text-moss mt-4">{d.demo}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {house && project && (
          <ButtonLink href={houseHref(project.slug, house.slug)}>
            {d.seeType(house.name)}
          </ButtonLink>
        )}
        <ButtonLink href={plan.href} variant={house ? "secondary" : "primary"}>
          {plan.plan ? t.common.openPlan : pj.home.seeAll}
        </ButtonLink>
      </div>
    </section>
  );
}
