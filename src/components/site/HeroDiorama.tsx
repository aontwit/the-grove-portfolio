"use client";

import { getImageProps } from "next/image";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { HouseType } from "@/lib/schemas";
import { HouseOutline } from "@/components/three/HouseOutline";
import type { IsoCanvas as IsoCanvasType } from "@/components/three/IsoCanvas";
import { buttonClass } from "@/components/site/ButtonLink";
import { SceneBoundary, freshLazy, useWebGL } from "@/components/site/SceneBoundary";
import { Shell } from "@/components/site/Shell";
import { onSmoothScroll } from "@/components/site/SmoothScroll";
import { introProgress } from "@/components/site/introProgress";
import type { HeroStage } from "@/components/site/heroStage";
import { useDict } from "@/i18n/client";
import { useCompact } from "@/lib/media";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { cx } from "@/lib/utils";
import { heroScript, type HeroStep } from "@/components/three/heroTimeline";
import { roomArea, roomDepth, roomWidth } from "@/geometry";

/* โมเมนต์เดียวของเว็บที่เป็นการแสดง ไม่ใช่เครื่องมือ — และเป็นเทคเดียวไม่มีตัด
   เฟรมแรก: ชื่อแบรนด์ ประโยคเดียว ตัวเลขจริง และปุ่มไปที่โครงการ อยู่บนพื้นหมึกข้างบ้านหลังเดียว
   เลื่อนหน้าลง (แบบ animejs.com): บ้านติดจอฝั่งขวา เริ่มจากแปลงเปล่า · ข้อความฝั่งซ้ายเปลี่ยนทีละจังหวะ —
   หัวข้อโซนตัวใหญ่ซ้อนทับฉาก → ห้องในโซนลงมาเข้าที่ทีละห้องพร้อมชื่อ ขนาด และคำอธิบายจาก data → … → หลังคาลง
   จบที่บ้านทั้งหลัง → ฉากปล่อยมือ ตัวเลือกโครงการจริงเลื่อนขึ้นมาต่อ (ไม่ต่อเป็นหมู่บ้าน — ผังอยู่หน้าผังโครงการ)
   ลำดับและช่วงของทุกจังหวะมาจาก heroTimeline.ts ชุดเดียวกับที่ 3D ใช้

   เรื่องนี้เล่าได้เพราะทุกมุมมองในเว็บมาจาก geometry ชุดเดียวกัน — แปลน 2D, diorama,
   โหมดเดินดู และผังโครงการ คือสี่วิธีมองของก้อนเดียวกัน ไม่ใช่ภาพ render สี่ใบที่วาดแยก

   มุมก้มล็อกที่ 35 องศาตาม §5 ตลอดทาง

   ความลื่นมาจากสามอย่าง ไม่ใช่ easing อย่างเดียว:
   1. scroll ของหน้ามี inertia (Lenis) ตำแหน่งจึงไม่กระโดดเป็นขั้นตามล้อเมาส์
   2. ความคืบหน้าอยู่ใน ref ไม่ใช่ state — เลื่อนหน้าไม่ทำให้ React render ใหม่สักครั้ง
   3. canvas วาดต่อเนื่องเฉพาะตอนฉากอยู่ในจอ นอกจอกลับไป frameloop demand

   §4: หยุดหมุนเองทันทีที่ผู้ใช้เริ่มเลื่อน · reduced motion = ไม่ขยับเลย ไม่มีทางวิ่ง (ภาพนิ่งหนึ่งหน้าจอแล้วต่อด้วยโครงการ) */

/* จอกว้าง: บ้านอยู่คอลัมน์ขวาตลอดฉาก (.hero-intro ใน globals.css · --hero-k ค้างที่ 0) ข้อความอยู่คอลัมน์ซ้าย 40%
   transform อย่างเดียว ไม่เปลี่ยน layout — ภาพนิ่ง LCP กับ canvas อยู่ในกล่องเดียวกัน จึงทับกันพอดี · จอ compact ไม่มี transform */

/** จอกว้างที่มีทางวิ่ง — media เดียวกับ variant wide + motion-safe · ภาพนิ่งแปลงเปล่าใช้เฉพาะที่นี่ */
const SCRUB_MEDIA =
  "(min-width: 64rem) and (not (pointer: coarse)) and (prefers-reduced-motion: no-preference)";

/** ท่าเฟรมแรกของจอกว้าง = .hero-intro ตอน --hero-k 0 (ย่อ --intro-s 0.6 · เลื่อน --intro-x 20vw · --intro-y 3svh)
    กล้องทำแทน CSS (IsoCanvas: frame) — ค่าต้องตรงกับ class ของ section ด้านล่าง ภาพนิ่งกับโมเดลจึงทับกันพอดี */
const HERO_FRAME = { scale: 0.6, shift: [0.2, 0.03] } as const;

/** ปุ่มจังหวะบนจอ compact — ขยับกล้องในที่เดิมแทนการเลื่อน (§4: มือถือห้ามดักการเลื่อน)
    rooms = ห้องครบก่อนหลังคาลง (เฟรมแรกของจอที่ไม่มีทางวิ่ง) · house = บ้านปิดหลังคา */
type Beat = "rooms" | "house";

/** ข้อความของแต่ละจังหวะจางเข้า/ออกในระยะเท่านี้ (หน่วยจอ) — CSS .hero-step อ่าน --a --b --f */
const FADE_SCREENS = 0.22;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** รอภาพนิ่ง (LCP) นานสุดเท่านี้ก่อนเริ่มโหลด 3D — เน็ตช้ามากก็ไม่ปล่อยให้ฉากรอไม่สิ้นสุด */
const STILL_WAIT_MS = 2500;

/* โหลด three.js เมื่อผู้ชมเริ่มใช้หน้า (ดู awake) — หน้าแรกได้ภาพนิ่งของโมเดลเดียวกันเป็น LCP ก่อน แล้ว canvas ค่อยจางทับ
   ชิ้น 3D ทุกชิ้นเป็น lazy ที่สร้างใหม่ทุกครั้งที่ฉาก mount (SceneBoundary) — ปุ่มลองใหม่จึงขอไฟล์ใหม่จริง
*/
type IsoProps = Omit<ComponentProps<typeof IsoCanvasType>, "children">;

function HeroScene({
  iso,
  house,
  progressRef,
}: {
  iso: IsoProps;
  house: HouseType;
  progressRef: React.RefObject<number> | undefined;
}) {
  const [C] = useState(() => ({
    /* รายงานความคืบหน้าจริงให้ intro loader: ไฟล์ JS ของฉากโหลดเสร็จ + texture/HDRI ผ่าน DefaultLoadingManager */
    IsoCanvas: freshLazy(() =>
      import("@/components/three/IsoCanvas").then((m) => {
        introProgress.chunk("iso");
        m.watchAssetLoading(introProgress.assets);
        return m.IsoCanvas;
      }),
    ),
    FloorPlanScene: freshLazy(() =>
      import("@/components/three/FloorPlanScene").then((m) => {
        introProgress.chunk("plan");
        return m.FloorPlanScene;
      }),
    ),
  }));
  return (
    <Suspense fallback={null}>
      <C.IsoCanvas {...iso}>
        {/* ฉากโชว์: ไม่รับคลิกห้อง/แปลงทุกจังหวะ (เจ้าของสั่ง 2026-10-02) — เลือกห้องได้ในหน้าแบบบ้าน เลือกแปลงได้ในหน้าผัง */}
        <C.FloorPlanScene house={house} progressRef={progressRef} interactive={false} />
      </C.IsoCanvas>
    </Suspense>
  );
}

export function HeroDiorama({
  house,
  stage,
  still,
  intro,
  labelledBy,
  note,
  skip,
  caption,
}: {
  house: HouseType;
  /** กรอบกล้อง — คำนวณบน server จาก src/geometry (heroStage.ts) */
  stage: HeroStage;
  /** ภาพนิ่งของบ้านหลังนี้จากฉากเดียวกัน (public/renders, พื้นหมึก) — แสดงทันทีก่อน canvas พร้อม
      และค้างไว้ถ้า 3D เปิดไม่ได้ · ไม่มี = แปลนเส้นแทน
      first = แปลงเปล่า (เฟรมแรกของจอกว้างที่มีทางวิ่ง) · full = ห้องครบ (จอ compact / reduced motion / 3D ล้ม) */
  still?: { full: string; first?: string | undefined };
  /** เฟรมแรก: ชื่อแบรนด์ (h1) ประโยคเดียว ตัวเลขจริง ปุ่มไปที่โครงการ — server วาดมาเสร็จ อ่านได้ก่อน hydrate */
  intro: ReactNode;
  /** id ของ h1 ใน intro — เป็นชื่อของ section นี้ */
  labelledBy: string;
  /** ป้ายบอกว่าอะไรในฉากเป็นตัวอย่าง — ป้ายเดียวของทั้งฉาก ค้างอยู่ขอบล่างตลอดทางวิ่ง */
  note: ReactNode;
  /** ทางลัดข้ามฉากไปที่ตัวเลือกโครงการ — กดได้ทุกจังหวะของฉาก ทั้งคีย์บอร์ดและนิ้ว (จอกว้างที่มีทางวิ่ง) */
  skip: { href: string; label: string };
  /** จอ compact: บ้านในฉากคือแบบไหนของโครงการไหน — แทนบรรทัด "เลื่อนลงเพื่อ…" ที่ไม่มีความหมายเมื่อไม่มีทางวิ่ง */
  caption: string;
}) {
  const dict = useDict();
  const t = dict.hero;
  const script = useMemo(() => heroScript(house.rooms), [house]);
  /** ความคืบหน้าของปุ่ม "ทีละห้อง" — ห้องครบแล้ว หลังคายังไม่ลง */
  const roomsAt = script.cap[0];
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [started, setStarted] = useState(false);
  const progress = useRef(0);
  /* canvas เติมฟังก์ชันนี้เมื่อพร้อม (IsoCanvas: ExposeInvalidate) — ก่อนนั้นเป็น null (ช่วงภาพนิ่ง) */
  const invalidateRef = useRef<(() => void) | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  /* จอสัมผัส/จอแคบ: ไม่มีทางวิ่ง ไม่ pin ไม่ scrub — ความคืบหน้ามาจากปุ่มจังหวะ (goTo) ไม่ใช่จาก scroll */
  const compact = useCompact();
  const [beat, setBeat] = useState<Beat>("rooms");
  const tween = useRef(0);
  /* จังหวะตัวหนังสือ (GSAP) — ไทม์ไลน์ยาว 1 หน่วย = ทางวิ่งทั้งหมด เลื่อนหน้าแล้วตั้ง progress ตรงๆ ไม่มี ScrollTrigger */
  const textTl = useRef<{ progress: (p: number) => unknown } | null>(null);
  /* โมเดล 3D เริ่มโหลดทันทีที่ภาพนิ่งขึ้นจอ (เจ้าของสั่ง 2026-10-02 พร้อม intro loader ตาม §4 ฉบับแก้)
     เดิมรอ load + idle + ผู้ชมสะกิด เพื่อให้ Lighthouse สวย — แต่ intro loader ต้องโชว์ความคืบหน้าจริงของฉากตั้งแต่เข้าหน้า
     ภาพนิ่ง (LCP) มาก่อนเสมอ: อยู่ใน HTML แรกพร้อม fetchpriority=high · three.js ยังไม่อยู่ใน JS ก้อนแรก (lazy)
     และไม่ขอไฟล์ 3D จนกว่าภาพนิ่งโหลด + วาดเสร็จ — ไฟล์ three.js หลายร้อย KB ไม่แย่งเน็ตกับภาพ LCP บนมือถือ
     (ภาพมาไม่ถึงใน STILL_WAIT_MS / โหลดพัง / ไม่มีภาพนิ่ง = เริ่มเลย ไม่ค้างฉากไว้)
     มือถือ/จอสัมผัสได้ทางเบา (useLowPower: texture 512 · HDRI 256 · DPR ≤1.5 · AO ครึ่งความละเอียด) */
  const [awake, setAwake] = useState(false);
  const [stillShown, setStillShown] = useState(!still);
  useEffect(() => {
    if (stillShown) {
      setAwake(true);
      return;
    }
    const t = window.setTimeout(() => setStillShown(true), STILL_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [stillShown]);
  /* onLoad ของ next/image มาหลัง decode — รออีกหนึ่งเฟรมให้ภาพถูกวาดจริงก่อนเริ่มงานหนัก */
  const onStill = () =>
    requestAnimationFrame(() => window.setTimeout(() => setStillShown(true), 0));
  /* null = ยังไม่รู้ (SSR / ยังไม่ตื่น / รอตรวจ) · false = เครื่องนี้ไม่มี WebGL */
  const probed = useWebGL(awake);
  const webgl = awake ? probed : null;
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failure = webgl === false ? "webgl" : loadFailed ? "load" : null;
  /* 3D เปิดไม่ได้ = intro loader ไม่ต้องรอ เปิดหน้าพร้อมภาพนิ่งทันที */
  useEffect(() => {
    if (failure) introProgress.fail();
  }, [failure]);
  /* ฉากเลื่อนต่อเนื่องทำงานเมื่อมีโมเดลจริงเท่านั้น — 3D ล้ม = ภาพนิ่งหนึ่งหน้าจอแบบเดียวกับ reduced motion */
  const still3d = reduced || failure !== null;
  /* ฉากผูกกับการเลื่อนเฉพาะจอกว้าง (§4) — CSS ตัดทางวิ่งด้วย variant wide + motion-safe ตั้งแต่ HTML แรก */
  const scrub = !still3d && !compact;
  const retry = () => {
    setReady(false);
    setLoadFailed(false);
    setAttempt((a) => a + 1);
  };

  /* ความคืบหน้าของฉาก 0→1 คำนวณใหม่จากตำแหน่งจริงของ section ทุกครั้งที่หน้าขยับ ไม่ว่าจะขยับด้วยอะไร:
     Lenis (ล้อเมาส์/นิ้ว) · scroll/scrollend ของเบราว์เซอร์ (Home, End, scrollTo, ลิงก์ #) ·
     popstate/pageshow (ปุ่ม back/forward และหน้าที่กลับมาจาก bfcache — เบราว์เซอร์คืนตำแหน่งเลื่อนหลัง event เล็กน้อย จึงอ่านซ้ำ)
     ทำงานตั้งแต่ช่วงภาพนิ่งก่อนมี canvas: --hero-p (ข้อความแต่ละจังหวะ) กับ data-progress ถูกต้องเสมอ
     บนสุดของหน้า (< 2px) = เฟรมแรกพอดี ไม่ค้างเศษทศนิยมจากหาง inertia · ปลายทางวิ่ง = 1 พอดี
     ค่าเปลี่ยนแล้วขอเฟรมจาก canvas (invalidate) — ตอนฉากวาดแบบ demand ภาพจะได้ไม่ค้างท่าเก่า
     เขียนลง ref / style / data-* เท่านั้น — state ที่เปลี่ยนตามมามีแค่ "เริ่มเลื่อนแล้ว" ซึ่งเกิดครั้งเดียว */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let frame = 0;
    let last = Number.NaN;
    const read = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      /* ไม่มีทางวิ่ง (compact / reduced motion / 3D ล้ม): ความคืบหน้าเป็นของปุ่มจังหวะ
         เฟรมแรก = ห้องครบ (ไม่ใช่แปลงเปล่า — ไม่มีการเลื่อนมาเติมห้องให้) จนกว่าจะกดปุ่ม */
      if (!scrub) {
        if (progress.current === 0) {
          progress.current = roomsAt;
          el.dataset.progress = roomsAt.toFixed(3);
          invalidateRef.current?.();
        }
        return;
      }
      const vh = window.innerHeight;
      const atTop = window.scrollY < 2;
      const runway = el.offsetHeight - vh;
      const raw = runway > 0 ? -el.getBoundingClientRect().top / runway : 0;
      const p = atTop ? 0 : raw >= 0.998 ? 1 : clamp01(raw);
      el.style.setProperty("--hero-p", p.toFixed(4));
      el.dataset.progress = p.toFixed(3);
      progress.current = p;
      textTl.current?.progress(p);
      if (p !== last) {
        last = p;
        invalidateRef.current?.();
      }
      if (p > 0) setStarted(true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    let late = 0;
    const restore = () => {
      read();
      schedule();
      window.clearTimeout(late);
      late = window.setTimeout(read, 150);
    };
    read();
    const offLenis = onSmoothScroll(read);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scrollend", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(late);
      offLenis();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("scrollend", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, [scrub, roomsAt]);

  /* ปุ่มจังหวะบนจอ compact: กล้องเดินไปจังหวะนั้นในที่เดิม (smoothstep ~1-1.8 วินาทีตามระยะทาง)
     ผ่านไทม์ไลน์เดียวกับฉากเลื่อน ทีละห้อง → ทั้งหลังจึงเห็นห้องไหลกลับเข้าที่ระหว่างทางเหมือนบนจอกว้าง
     reduced motion = กระโดดถึงทันที · แตะปุ่ม = ผู้ชมเริ่มใช้หน้าแล้ว ปลุกฉาก 3D ได้เลย */
  const goTo = (next: Beat) => {
    const el = stageRef.current;
    const target = next === "house" ? 1 : roomsAt;
    setBeat(next);
    setAwake(true);
    setStarted(true);
    cancelAnimationFrame(tween.current);
    const write = (p: number) => {
      progress.current = p;
      if (el) el.dataset.progress = p.toFixed(3);
      invalidateRef.current?.();
    };
    const from = progress.current;
    if (reduced || from === target) {
      write(target);
      return;
    }
    const duration = 1000 + Math.abs(target - from) * 800;
    const t0 = performance.now();
    const step = (now: number) => {
      const x = clamp01((now - t0) / duration);
      write(from + (target - from) * x * x * (3 - 2 * x));
      if (x < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  /* ตัวหนังสือของแต่ละจังหวะ: หัวข้อโผล่ทีละคำ (ลอยขึ้น + จางเข้า ไม่ใช้ mask: สระบน/วรรณยุกต์ไทยสูงเกินกรอบคำ โดนตัดแล้วลอยมาก่อนตัวอักษร) · รายการห้องโผล่ตามจังหวะที่ห้องนั้นร่วงลงมา
     ภาษาไทยไม่มีเว้นวรรค — ตัดคำด้วย Intl.Segmenter ก่อนให้ SplitText (ตัดทีละตัวอักษรจะแยกสระ/วรรณยุกต์หลุดจากพยัญชนะ)
     โหลด gsap ตอนมีทางวิ่งเท่านั้น ไม่อยู่ใน JS ก้อนแรกของหน้า · ไม่มี JS = ข้อความยังจางเข้าออกด้วย CSS (.hero-step) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !scrub) return;
    let live = true;
    let undo = () => {};
    void Promise.all([import("gsap"), import("gsap/SplitText")]).then(
      ([{ gsap }, { SplitText }]) => {
        if (!live) return;
        gsap.registerPlugin(SplitText);
        const seg = new Intl.Segmenter(dict.dateLocale, { granularity: "word" });
        const tl = gsap.timeline({ paused: true });
        tl.set({}, {}, 1);
        const splits: InstanceType<typeof SplitText>[] = [];
        for (const st of script.steps) {
          const root = el.querySelector<HTMLElement>(`[data-step="${st.a}"]`);
          const head = root?.querySelector("h2");
          if (!root || !head) continue;
          const len = st.b - st.a;
          const split = SplitText.create(head, {
            type: "words",
            wordDelimiter: { delimiter: /\u200B/, replaceWith: "" },
            prepareText: (text) => [...seg.segment(text)].map((x) => x.segment).join("\u200B"),
          });
          splits.push(split);
          tl.fromTo(
            split.words,
            { yPercent: 45, autoAlpha: 0 },
            {
              yPercent: 0,
              autoAlpha: 1,
              duration: len * 0.18,
              stagger: len * 0.05,
              ease: "power3.out",
            },
            st.a,
          );
          for (const item of root.querySelectorAll<HTMLElement>("[data-room]")) {
            const span = script.drops.get(item.dataset.room ?? "");
            if (!span) continue;
            tl.fromTo(
              item,
              { y: 28, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: span[1] - span[0], ease: "power2.out" },
              span[0],
            );
          }
          if (st.kind === "zone")
            tl.to(
              split.words,
              {
                yPercent: -45,
                autoAlpha: 0,
                duration: len * 0.12,
                stagger: len * 0.02,
                ease: "power2.in",
              },
              st.b - len * 0.14,
            );
        }
        tl.progress(progress.current);
        textTl.current = tl;
        undo = () => {
          textTl.current = null;
          tl.kill();
          for (const sp of splits) sp.revert();
        };
      },
    );
    return () => {
      live = false;
      undo();
    };
  }, [scrub, script, dict.dateLocale]);

  /* วาดต่อเนื่องเฉพาะตอนฉากอยู่ในจอ — เลื่อนพ้นไปแล้วไม่มีเหตุให้ GPU ทำงานต่อ */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !scrub) return;
    const io = new IntersectionObserver(([entry]) => setLive(entry?.isIntersecting ?? false));
    io.observe(el);
    return () => io.disconnect();
  }, [scrub]);

  /* กล่องกล้อง diorama → บ้านปิดหลังคา (heroStage.ts คำนวณบน server) */
  const { box, wideBox } = stage;

  /* ข้อความบอกตรงๆ ว่าทำไมเห็นภาพนิ่ง — ไม่ขอโทษ บอกว่ายังทำอะไรได้ (§6) */
  const failureText = failure === "webgl" ? t.failureWebgl(house.name) : t.failureLoad;

  return (
    /* จอกว้าง: ทางวิ่งของ scroll = จำนวนจอของ heroScript (หนึ่งจอต่อจังหวะโดยประมาณ) — ฉากติดจอ ส่วนที่เลื่อนคือห้องลงทีละห้อง แล้วปล่อยมือ
       จอ compact: หน้าจอปกติหนึ่งท่อน (ชื่อแบรนด์ → โมเดล → ปุ่มจังหวะ) เลื่อนแบบ native แล้วถึงโครงการทันที
       reduced motion (CSS ตั้งแต่ HTML แรก ไม่รอ hydrate) หรือ 3D เปิดไม่ได้: ไม่มีทางวิ่ง ฉากเป็นภาพนิ่ง */
    <section
      ref={stageRef}
      data-hero=""
      data-progress="0"
      aria-labelledby={labelledBy}
      className={cx(
        "bg-ink text-chalk relative flex flex-col [--hero-k:0] [--hero-p:0]",
        /* บ้าน: มือถืออยู่ใต้ข้อความ · จอกว้างย่ออยู่คอลัมน์ขวาตลอดฉาก */
        /* คอลัมน์ข้อความ 40% ของจอ: กรอบฉากย่อเหลือ 0.6 แล้วเลื่อนขวา 20vw → เริ่มที่ 40vw พอดี (.hero-intro ใน globals.css) */
        "[--intro-col:0.4] [--intro-s:0.6] [--intro-x:20vw] [--intro-y:3svh]",
        still3d ? "" : "wide:motion-safe:h-[calc(var(--hero-screens)*100svh)]",
      )}
      style={{ "--hero-screens": script.screens + 1 } as CSSProperties}
    >
      {/* เฟรมแรก — อยู่ก่อนฉากใน DOM (h1 เป็นหัวข้อแรกของหน้า) วางทับขอบบนของฉาก
          ไม่ติดจอ: เลื่อนพ้นไปตามหน้าเองโดยไม่ต้องจางหรือรอ JS */}
      <div className="compact:relative absolute inset-x-0 top-0 z-10">{intro}</div>

      <div className="compact:relative compact:top-auto compact:h-[36svh] compact:min-h-64 sticky top-0 h-[100svh] overflow-hidden">
        <div className="hero-intro absolute inset-0">
          {/* ภาพนิ่ง = LCP ของหน้า: กล่องเดียวกับ canvas ภาพถ่ายจากกล่องบ้านเดียวกัน (RenderStill)
              object-contain วางกลางเหมือนกล้อง isoFitZoom ภาพกับโมเดลจึงทับกันพอดี ไม่มี layout shift
              canvas พร้อมแล้วจางออก (crossfade 0.5s · reduced motion ตัดทันที) · 3D ล้ม = ค้างไว้ */}
          <div
            className={cx(
              "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
              ready && !failure ? "opacity-0" : "opacity-100",
            )}
            aria-hidden={ready && !failure ? true : undefined}
          >
            {still ? (
              <HeroStill
                still={still}
                /* 3D ล้มบนจอกว้าง: ภาพค้างถาวร ต้องเป็นบ้านที่มีห้องครบ ไม่ใช่แปลงเปล่า */
                /* 3D ล้มบนจอกว้าง: ภาพค้างถาวร ต้องเป็นบ้านที่มีห้องครบ ไม่ใช่แปลงเปล่า */
                first={failure ? undefined : still.first}
                alt={t.stillAlt(house.name)}
                onDone={onStill}
              />
            ) : (
              <div className="grid h-full place-items-center p-10">
                <div className="w-full max-w-md opacity-40">
                  <HouseOutline house={house} />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* canvas เต็มกรอบ ไม่ย่อด้วย CSS — ภาพย่อ/เลื่อนไปคอลัมน์ขวาด้วยกล้อง (frame) ให้ทับภาพนิ่งพอดี
            ซูมเข้าโซนแล้วของล้นถึงขอบจอ ไม่โดนตัดเป็นกรอบกลางจอ */}
        {webgl && !loadFailed && (
          <div
            className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            <SceneBoundary key={attempt} onError={() => setLoadFailed(true)}>
              <HeroScene
                house={house}
                /* reduced motion: ไม่มีทางวิ่ง ค่าคงที่ 0 — ขยับเฉพาะเมื่อกดปุ่มจังหวะ (กระโดดถึงทันที) */
                progressRef={progress}
                iso={{
                  box,
                  autoRotate: !started,
                  rotatable: false,
                  zoomable: false,
                  interactive: false,
                  backgroundToken: "--ink",
                  scroll: {
                    progressRef: progress,
                    /* กล้องนิ่งมุมเดียวตลอดฉาก (เจ้าของไม่ชอบการหมุน 2026-10-03) — ขยับแค่ถอยตอนหลังคาลง */
                    sweepDeg: 0,
                    wideBox,
                    range: script.cap,
                    live: live && scrub,
                    invalidateRef,
                    onPose: (p) => {
                      if (stageRef.current) stageRef.current.dataset.pose = p.toFixed(3);
                    },
                  },
                  onReady: () => {
                    setReady(true);
                    introProgress.ready();
                  },
                  onCompile: introProgress.compile,
                  label: t.canvasLabel(house.name),
                  frame: compact ? undefined : HERO_FRAME,
                }}
              />
            </SceneBoundary>
          </div>
        )}
        {/* ข้อความของแต่ละจังหวะ ซ้อนบนฉาก — เฉพาะจอกว้างที่มีทางวิ่ง (CSS ตั้งแต่ HTML แรก) · ความทึบอ่าน --hero-p (.hero-step) */}
        {!failure && (
          <div className="wide:motion-safe:block pointer-events-none absolute inset-0 z-10 hidden">
            <Shell className="relative h-full">
              {script.steps.map((st) => (
                <StepText
                  key={st.kind === "zone" ? st.zone : "done"}
                  step={st}
                  house={house}
                  fade={FADE_SCREENS / script.screens}
                  dict={dict}
                />
              ))}
            </Shell>
          </div>
        )}
      </div>

      {/* ขอบล่างของฉาก: ป้ายตัวอย่างป้ายเดียว + ทางลัดไปที่โครงการ — ติดขอบล่างของจอตลอดทางวิ่ง
          (sticky bottom ในตัว section) แล้วเลื่อนออกไปพร้อมปลายฉาก · พื้นหมึกทึบ ข้อความไม่ทับโมเดล */}
      <div className="bg-ink compact:static sticky bottom-0 z-10 mt-auto">
        <Shell className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 py-3">
          {/* จอ compact: ปุ่มขยับกล้องในที่เดิม แทนทางวิ่งของ scroll — กดได้ด้วยนิ้วและคีย์บอร์ด (aria-pressed)
              ไม่แสดงเมื่อ 3D เปิดไม่ได้ (ไม่มีอะไรให้ขยับ) */}
          {!failure && (
            <div className="compact:flex hidden w-full flex-col gap-2 pb-1">
              <p className="text-13 text-ash">{caption}</p>
              <div role="group" aria-label={t.views.label} className="flex flex-wrap gap-2">
                {(["rooms", "house"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={beat === key}
                    onClick={() => goTo(key)}
                    className={cx(
                      "rounded-control text-15 inline-flex h-11 items-center border-[1.5px] px-4 font-medium",
                      beat === key
                        ? "border-citron bg-citron text-on-citron"
                        : "border-ash text-chalk",
                    )}
                  >
                    {t.views[key]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 3D เปิดไม่ได้: บอกตรงๆ ว่าทำไมเห็นภาพนิ่ง ไม่ขอโทษ บอกว่ายังทำอะไรได้ (§6) */}
          {failure && (
            <div role="status" className="flex w-full flex-wrap items-center gap-x-8 gap-y-3 pb-2">
              <p className="text-15 text-chalk max-w-[56ch]">{failureText}</p>
              {failure === "load" && (
                <button type="button" onClick={retry} className={buttonClass("onInkQuiet")}>
                  {t.retry}
                </button>
              )}
            </div>
          )}
          <div className="max-w-[70ch]">{note}</div>
          <a
            href={skip.href}
            className="text-15 text-chalk decoration-citron compact:hidden inline-flex min-h-11 items-center font-medium underline underline-offset-4"
          >
            {skip.label}
          </a>
        </Shell>
      </div>
    </section>
  );
}

/* ภาพนิ่งเฟรมแรก — <picture> ให้เบราว์เซอร์เลือกเองตั้งแต่ HTML แรก ไม่รอ hydrate:
   จอกว้างที่มีทางวิ่ง = แปลงเปล่า (ฉากเริ่มจากแปลงเปล่า) · ที่เหลือ = ห้องครบ */
function HeroStill({
  still,
  first,
  alt,
  onDone,
}: {
  still: { full: string };
  first: string | undefined;
  alt: string;
  onDone: () => void;
}) {
  const common = { alt, fill: true, sizes: "100vw" } as const;
  const { props: full } = getImageProps({ ...common, src: still.full, priority: true });
  const firstSet = first ? getImageProps({ ...common, src: first }).props.srcSet : undefined;
  return (
    <picture>
      {firstSet && <source media={SCRUB_MEDIA} srcSet={firstSet} sizes="100vw" />}
      <img
        {...full}
        alt={alt}
        fetchPriority="high"
        onLoad={onDone}
        onError={onDone}
        className="object-contain"
      />
    </picture>
  );
}

/** ข้อความหนึ่งจังหวะ — ตัวเลขทุกตัวมาจาก data (ขนาดห้องจาก src/geometry · พื้นที่/ห้องตามประกาศผู้พัฒนา) */
function StepText({
  step,
  house,
  fade,
  dict,
}: {
  step: HeroStep;
  house: HouseType;
  fade: number;
  dict: ReturnType<typeof useDict>;
}) {
  const t = dict.hero;
  /* จังหวะสุดท้ายไม่จางออกที่ปลายทางวิ่ง — ค้างไว้จนฉากเลื่อนพ้นจอ */
  const b = step.kind === "done" ? 1 + fade : step.b;
  const style = { "--a": step.a, "--b": b, "--f": fade } as CSSProperties;
  const ground = house.rooms.filter((r) => (r.floor ?? 1) === 1);
  if (step.kind === "zone") {
    const rooms = ground.filter((r) => step.ids.includes(r.id));
    return (
      <div
        className="hero-step absolute inset-0 flex items-center"
        style={style}
        data-step={step.a}
      >
        <div className="hero-text">
          <h2 className="text-60">{t.zones[step.zone]}</h2>
          <dl className="mt-6 flex flex-col gap-4">
            {rooms.map((room) => (
              <div key={room.id} data-room={room.id}>
                <dt className="text-21">{room.name}</dt>
                <dd className="text-15 text-ash mt-1 tabular-nums">
                  {dict.house.dims(roomWidth(room).toFixed(2), roomDepth(room).toFixed(2))} ·{" "}
                  {roomArea(room).toFixed(2)} {dict.units.sqm} · {room.desc}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }
  return (
    <div className="hero-step absolute inset-0 flex items-center" style={style} data-step={step.a}>
      <div className="hero-text">
        <h2 className="text-60">{t.whole}</h2>
        <p className="text-21 mt-4">{house.name}</p>
        <p className="text-17 text-ash mt-3 tabular-nums">
          {t.wholeFacts(house.areaSqm, house.beds, house.baths)}
        </p>
      </div>
    </div>
  );
}
