import type { Metadata } from "next";
import { languageAlternates, siteFacts } from "@/app/_meta/site";
import Image from "next/image";
import { ButtonLink, buttonClass } from "@/components/site/ButtonLink";
import { HeroDiorama } from "@/components/site/HeroDiorama";
import { INTRO_SCRIPT } from "@/components/site/intro";
import { IntroLoader } from "@/components/site/IntroLoader";
import { heroStage } from "@/components/site/heroStage";
import { CHOOSER_ID, ProjectChooser } from "@/components/site/ProjectChooser";
import { RoomAccordion, type RoomImage } from "@/components/site/RoomAccordion";
import { KeepNames, Phrases } from "@/components/site/Phrases";
import { SampleNote } from "@/components/site/SampleNote";
import { Band, Section, Shell } from "@/components/site/Shell";
import { getDictionary } from "@/i18n";
import { getGalleryDictionary } from "@/i18n/gallery";
import { getProjectsDictionary } from "@/i18n/projects";
import { langOf, type LangParams } from "@/i18n/server";
import { hasContent, projectLabel } from "@/lib/projects";
import { repo } from "@/lib/repo";
import { PROJECTS_PATH, registerHref } from "@/lib/routes";

/* หน้าแรกของแบรนด์ — เฟรมแรก (ชื่อ ประโยคเดียว ตัวเลขจริง ปุ่มไปที่โครงการ) บนฉากโมเดล 3D →
   ฉากเลื่อน: ห้อง → หมู่บ้าน → ตัวเลือกโครงการจริงสองโครงการ → ห้องจากภาพผู้พัฒนา → ขั้นตอน → ลงทะเบียน
   (critique 2026-10-02 [P1]: เดิมชื่อแบรนด์อยู่ลึก 5.4 จอ และโครงการแรกอยู่ 7.4 จอบนมือถือ หลังผัง 2D ตัวอย่าง)
   เนื้อหาเจาะโครงการ (ตัวเลขแปลง แบบบ้าน ทำเล แดด เดินดู ผังแปลง) อยู่ที่หน้า /projects/[slug]
   ฉากเปิดใช้โครงการแรกที่มีผัง (เดอะ โกรฟ @ริมสวน) และติดป้ายตัวอย่างป้ายเดียวที่ขอบล่างของฉาก
   title / description / OG ของหน้าแรกคือค่าตั้งต้นของ [lang]/layout · ที่นี่เพิ่ม canonical + hreflang */
export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const lang = await langOf(params);
  return {
    alternates: languageAlternates("/", lang),
  };
}

export default async function HomePage({ params }: { params: LangParams }) {
  const lang = await langOf(params);
  const t = getDictionary(lang);
  const p = getProjectsDictionary(lang);
  const gd = getGalleryDictionary(lang);
  const site = repo.getSite(lang);
  /* ตัวเลขของเฟรมแรก: ยูนิต แบบ โครงการ จังหวัด และช่วงพื้นที่ใช้สอย — นับจาก repo ชุดเดียวกับ metadata */
  const facts = siteFacts(lang);
  /* ไทยกับอังกฤษคั่นวลีด้วยเว้นวรรค · จีนไม่เว้น */
  const joiner = lang === "zh" ? "" : " ";
  const open = repo.listProjects(lang).filter(hasContent);
  const showcase = open.find((x) => x.plan && repo.listHouseTypes(lang, x.id).length > 0);
  const houses = showcase ? repo.listHouseTypes(lang, showcase.id) : [];
  const hero = houses[0];
  /* ภาพนิ่งที่ hero แสดงก่อน canvas พร้อม — ต้องเป็นมุมเดียวกับฉากเปิด: iso ชั้นล่าง พื้นหมึก
     เลือกชั่วโมงที่ใกล้แดดตั้งต้นของฉาก (15:00) ที่สุด ภาพจะได้เปลี่ยนเป็นโมเดลจริงโดยแทบไม่สะดุด */
  const heroShots = hero
    ? repo
        .listRenders(lang)
        .filter(
          (r) => r.slug === hero.slug && r.view === "iso" && r.floor === 1 && r.dark && !r.closed,
        )
        .sort((a, b) => Math.abs(a.hour - 15) - Math.abs(b.hour - 15))
    : [];
  /* ห้องครบ (จอ compact / reduced motion / 3D ล้ม) · แปลงเปล่า (เฟรมแรกของจอกว้างที่มีทางวิ่ง) */
  const heroStill = heroShots.find((r) => !r.empty);
  const heroFirst = heroShots.find((r) => r.empty);

  /* ภาพจากผู้พัฒนา (gallery.json) — ภาพบรรยากาศของแบรนด์ ใช้ได้แค่หน้าแรกกับแกลเลอรี ติดป้ายทุกภาพ
     ตำแหน่งบนหน้ามาจาก feature ใน data ไม่ได้เลือกด้วย id ในโค้ด */
  const brandImages = repo.listGallery(lang).filter((g) => g.source === "developer");
  const band = brandImages.find((g) => g.feature === "home-band");
  const rooms: RoomImage[] = brandImages.flatMap((g) =>
    g.feature === "home-room" && g.note
      ? [
          {
            id: g.id,
            src: g.src,
            width: g.width,
            height: g.height,
            alt: g.alt,
            title: g.title,
            caption: g.caption,
            note: g.note,
          },
        ]
      : [],
  );

  return (
    <div>
      {/* intro loader ครั้งแรกของ session: element ซ่อนไว้ใน HTML · สคริปต์ inline ถัดไปเปิดก่อนวาดเฟรมแรก (intro.ts)
          React ไม่รันสคริปต์นี้ตอนเปลี่ยนหน้าฝั่ง client — เข้าหน้าแรกจากหน้าอื่นในเว็บจึงไม่มี loader */}
      <IntroLoader />
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      {showcase?.plan && hero && (
        <HeroDiorama
          house={hero}
          stage={heroStage(hero)}
          still={
            heroStill && {
              full: `/renders/${heroStill.id}.png`,
              first: heroFirst && `/renders/${heroFirst.id}.png`,
            }
          }
          labelledBy="home-title"
          intro={
            /* เฟรมแรก (แบบ Seijaku): ชื่อ ประโยคเดียว ตัวเลขจริง และทางไปต่อ — ไม่มีป้ายเหนือหัวข้อ ไม่มีแถบตัวเลขโต
               server วาดเสร็จมาใน HTML แรก ไม่มีสถานะเริ่มต้นที่ซ่อนไว้ */
            <Shell className="pt-6 lg:pt-16">
              {/* .hero-text: บนจอกว้างกว้างไม่เกินคอลัมน์ที่จองไว้ (globals.css) — บ้านไม่มีวันทับข้อความ */}
              <div className="hero-text">
                <h1 id="home-title" className="text-34 lg:text-60">
                  {site.brandName}
                </h1>
                <p className="text-17 lg:text-21 mt-3 lg:mt-5">
                  <Phrases parts={t.home.promise} joiner={joiner} />
                </p>
                {/* ตัวเลขนับจาก repo (siteFacts) — ชุดเดียวกับ title/description/OG ของเว็บ */}
                <p className="text-15 lg:text-17 text-ash mt-3">
                  <Phrases
                    parts={t.home.brandFacts({ ...facts, types: facts.houseTypes })}
                    joiner={joiner}
                  />
                </p>
                <a href={`#${CHOOSER_ID}`} className={buttonClass("onInk", "mt-6 lg:mt-8")}>
                  {t.home.seeProjects}
                </a>
                {/* บอกว่าเลื่อนแล้วจะเห็นอะไร — มีเฉพาะจอกว้างที่มีทางวิ่ง (จอ compact ใช้ปุ่มจังหวะใต้โมเดลแทน) */}
                <p className="text-13 text-ash compact:hidden mt-4 max-w-[52ch]">
                  <KeepNames
                    text={t.home.heroCue(
                      hero.rooms.filter((r) => !r.outdoor).length,
                      hero.name,
                      projectLabel(showcase, lang),
                    )}
                    names={[hero.name, projectLabel(showcase, lang)]}
                  />
                </p>
              </div>
            </Shell>
          }
          /* ป้ายตัวอย่างของฉาก: ฉากมีบ้านหลังเดียว ไม่มีผังแปลง — บอกเฉพาะแปลนตัวอย่าง */
          note={hero.samplePlan && <SampleNote kind="plan" detail tone="ink" />}
          skip={{ href: `#${CHOOSER_ID}`, label: t.home.skipToProjects }}
          caption={t.home.heroModel(hero.name, projectLabel(showcase, lang))}
        />
      )}

      {/* ปลายฉาก: ตัวเลือกโครงการจริง (ตัวเลขตามประกาศของผู้พัฒนา) + โครงการที่รอข้อมูลบรรทัดเดียว */}
      <ProjectChooser lang={lang} />

      {/* ภาพบรรยากาศของแบรนด์ต่อท้ายแถบหมึก — พักสายตาก่อนเข้าเนื้อหา ไม่มีข้อความทับภาพ
          ไฟล์กว้าง 1672px: พาดเต็มจอถึง 1672px แล้วหยุด ไม่ขยายเกินขนาดจริง · จอแคบครอปเข้าหาจั่วสองหลัง */}
      {band && (
        <figure className="bg-ink">
          <div className="relative mx-auto aspect-[16/10] w-full max-w-[1672px] overflow-hidden md:aspect-[1672/490]">
            <Image
              src={band.src}
              alt={band.alt}
              fill
              sizes="(min-width: 1672px) 1672px, 100vw"
              className="object-cover object-[68%_50%] md:object-center"
            />
          </div>
          <figcaption className="bg-canvas">
            <Shell className="pt-3">
              <p className="text-13 text-moss max-w-[70ch]">
                {band.caption} · {gd.source.developer} · {gd.source.developerNote}
              </p>
            </Shell>
          </figcaption>
        </figure>
      )}

      <Shell>
        {rooms.length > 0 && (
          <Section scale="lg" title={gd.rooms.title} lead={gd.rooms.lead}>
            <div className="mt-10">
              <RoomAccordion rooms={rooms} />
            </div>
            <ButtonLink href="/gallery" variant="secondary" className="mt-10">
              {gd.rooms.seeGallery}
            </ButtonLink>
          </Section>
        )}

        <Section
          scale="lg"
          /* ห้ามตัดกลางคำไทย แต่ทั้งประโยคยาวเกินคอลัมน์ 22rem ที่ 46px — ให้ขึ้นบรรทัดได้จุดเดียวระหว่างสองวลี */
          title={
            <>
              <span className="whitespace-nowrap">{t.home.nextTitle.lead}</span>
              {/* ไทยและจีนไม่เว้นวรรคระหว่างคำ ตัดบรรทัดได้ที่ <wbr> · ภาษาอังกฤษมีช่องว่างระหว่างคำอยู่แล้ว */}
              {lang === "en" ? " " : <wbr />}
              <span className="whitespace-nowrap">{t.home.nextTitle.tail}</span>
            </>
          }
          layout="split"
          lead={t.home.nextLead}
        >
          <ol className="border-concrete mt-8 grid grid-cols-1 border-t md:grid-cols-4">
            {t.home.steps.map(({ title, detail }, i) => (
              <li
                key={title}
                className="border-concrete border-b py-6 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0"
              >
                <p className="font-display text-21 text-moss font-medium tabular-nums">{i + 1}</p>
                <h3 className="text-17 mt-2 font-medium">{title}</h3>
                <p className="text-15 text-moss mt-2">{detail}</p>
              </li>
            ))}
          </ol>
        </Section>
      </Shell>

      <Band tone="ink" className="mt-28 py-28">
        <Shell>
          <h2 className="text-34 lg:text-60 max-w-[16ch] text-balance">{p.home.closingTitle}</h2>
          <p className="text-21 text-ash mt-6 max-w-[46ch]">{p.home.closingLead}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={registerHref()} variant="onInk">
              {t.home.registerCta}
            </ButtonLink>
            <ButtonLink href={PROJECTS_PATH} variant="onInkQuiet">
              {p.home.seeAll}
            </ButtonLink>
          </div>
        </Shell>
      </Band>
    </div>
  );
}
