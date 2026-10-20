import NextLink from "next/link";
import type { ReactNode } from "react";
import { getDictionary } from "@/i18n";
import { Link } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { SiteSettings } from "@/lib/schemas";
import { Wordmark } from "@/components/site/BrandMark";
import { OrPending } from "@/components/site/Pending";
import { Shell } from "@/components/site/Shell";
import { facebookHref, lineHref, telHref } from "@/lib/contact";
import { baht } from "@/lib/utils";

/* ท้ายหน้า = แบรนด์ The Grove + ข้อมูลที่ผู้ซื้อใช้ตรวจว่าโครงการมีตัวตนจริง (ผู้พัฒนา ใบอนุญาตจัดสรร โฉนด ค่าส่วนกลาง)
   ทุกค่ามาจาก site.json · โทร Facebook LINE เป็นข้อมูลสมมติของงานพอร์ต
   ค่าที่ยังไม่มีเอกสารแสดง "รอข้อมูลจริง" ไม่แต่งเลขให้ดูเหมือนจริง (CLAUDE.md ข้อ 6) */

/* ช่องทางติดต่อกดได้ทันทีบนมือถือ — พื้นที่กดสูง 44px
   -my ดึงระยะที่เห็นกลับเท่าบรรทัดข้อความ แถวลิงก์กับแถวข้อความจึงห่างเท่ากัน แต่พื้นที่กดยังครบ 44px */
const NAV_LINK = "inline-flex min-h-11 items-center underline-offset-4 hover:underline";
const LINK =
  "-my-2.5 inline-flex min-h-11 items-center tabular-nums underline-offset-4 hover:underline";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {/* ป้ายเข้ม ค่าธรรมดา — ค่าที่ยังรอ (สีรอง) จึงต่างจากป้ายชัด ไม่จมเป็นสีเดียวกัน */}
      <dt className="font-medium">{label}</dt>
      <dd className="max-w-[40ch]">{children}</dd>
    </div>
  );
}

/** site = ข้อมูลโครงการของภาษานั้น (repo.getSite(lang)) */
export function SiteFooter({ site, lang }: { site: SiteSettings; lang: Locale }) {
  const { developer, legal } = site;
  const t = getDictionary(lang).footer;
  /* หน้าเว็บ render ตอน build — ปีเปลี่ยนเมื่อ build ใหม่ ซึ่งเกิดทุกครั้งที่แก้ข้อมูลอยู่แล้ว */
  const year = new Date().getFullYear();

  return (
    <footer className="border-concrete border-t">
      <Shell className="grid grid-cols-1 gap-x-10 gap-y-10 pt-12 pb-10 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-1">
          <Wordmark />
          <p className="font-display text-21 mt-5">{t.tagline}</p>
          <dl className="text-15 mt-5 flex flex-col gap-3">
            <Row label={t.developer}>
              <OrPending value={developer.name} lang={lang} />
            </Row>
            <Row label={t.address}>
              <OrPending value={developer.address} lang={lang} />
            </Row>
          </dl>
        </div>

        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact" className="text-17">
            {t.contactTitle}
          </h2>
          <dl className="text-15 mt-3 flex flex-col gap-3">
            <Row label={t.phone}>
              <a href={telHref(site.contactPhone)} className={LINK}>
                {site.contactPhone}
              </a>
            </Row>
            <Row label={t.lineOa}>
              {site.lineId ? (
                <a href={lineHref(site.lineId)} className={LINK}>
                  {site.lineId}
                </a>
              ) : (
                <OrPending value={null} lang={lang} />
              )}
            </Row>
            <Row label={t.facebook}>
              {site.facebook ? (
                <a href={facebookHref(site.facebook)} className={LINK}>
                  @{site.facebook}
                </a>
              ) : (
                <OrPending value={null} lang={lang} />
              )}
            </Row>
            <Row label={t.email}>
              {site.contactEmail ? (
                <a href={`mailto:${site.contactEmail}`} className={`${LINK} break-all`}>
                  {site.contactEmail}
                </a>
              ) : (
                <OrPending value={null} lang={lang} />
              )}
            </Row>
            <Row label={t.salesHours}>
              <OrPending value={site.salesHours} lang={lang} />
            </Row>
          </dl>
        </section>

        <section aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="text-17">
            {t.legalTitle}
          </h2>
          <dl className="text-15 mt-3 flex flex-col gap-3 tabular-nums">
            <Row label={t.licence}>
              <OrPending value={legal.allocationLicence} lang={lang} />
            </Row>
            <Row label={t.deeds}>
              <OrPending value={legal.titleDeeds} lang={lang} />
            </Row>
            <Row label={t.commonFee}>
              <OrPending value={legal.commonFeePerSqwMonth} lang={lang}>
                {legal.commonFeePerSqwMonth !== null &&
                  t.commonFeeValue(baht(legal.commonFeePerSqwMonth))}
              </OrPending>
            </Row>
          </dl>
        </section>
      </Shell>

      <Shell>
        <div className="border-concrete flex flex-col gap-x-8 gap-y-2 border-t py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-13 text-moss max-w-[70ch]">{t.disclaimer}</p>
          <nav aria-label={t.policiesNav} className="shrink-0">
            <ul className="text-15 flex flex-wrap gap-x-6">
              <li>
                <Link href="/privacy" className={NAV_LINK}>
                  {t.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={NAV_LINK}>
                  {t.terms}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <p className="text-13 text-moss pb-6 tabular-nums">
          © {year} {developer.name ?? site.brandName}
        </p>
      </Shell>

      {site.demo && (
        <Shell>
          {/* ข้อความกับลิงก์อยู่คนละบล็อก — เดิมลิงก์ตกบรรทัดเดี่ยวต่อจาก "·" ที่ค้างท้ายบรรทัด */}
          <div className="border-concrete flex flex-wrap items-center justify-between gap-x-8 border-t py-2">
            <p className="text-13 text-moss max-w-[70ch] py-2">{t.demoNote}</p>
            {/* ทางเข้าหลังบ้านโชว์เฉพาะโหมดเดโม ให้คนดูงานลองแก้ข้อมูลเองได้ — เว็บจริงไม่มีลิงก์นี้
                หลังบ้านเป็นภาษาไทยอย่างเดียว: ลิงก์ next/link ตรงๆ ไม่ผ่านตัวเติมภาษา และบอกไว้ในข้อความ (หน้าอังกฤษ) */}
            <NextLink
              href="/admin/login"
              hrefLang="th"
              className="text-pine text-13 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
            >
              {t.tryAdmin}
            </NextLink>
          </div>
        </Shell>
      )}
    </footer>
  );
}
