"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  House,
  Images,
  LayoutDashboard,
  LogOut,
  MapPinned,
  PanelLeft,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandSymbol } from "@/components/site/BrandMark";
import { useLeads } from "@/lib/leads";
import { cx } from "@/lib/utils";
import { SignOutButton } from "./LoginForm";

/* เปลือกหลังบ้านทรง sidebar ของ shadcn — ไม่ได้ลง component ของ shadcn (ต้องเพิ่ม radix หลายตัว)
   วาดเองด้วย token เดิม: กลุ่มเมนู + ไอคอน · จอกว้างยุบเป็นแถบไอคอนได้ (จำไว้ในเบราว์เซอร์นี้)
   · จอแคบเป็นลิ้นชักเลื่อนจากซ้าย (§4 เปิด panel slide 0.2s) · ตอนยุบ ชื่อเมนูยังอยู่เป็น sr-only + title */

type Item = { href: string; label: string; icon: LucideIcon; badge?: "leads" };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "การขาย",
    items: [
      { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
      { href: "/admin/plots", label: "แปลง", icon: MapPinned },
      { href: "/admin/leads", label: "ผู้ลงทะเบียน", icon: Users, badge: "leads" },
    ],
  },
  {
    label: "เนื้อหาบนเว็บ",
    items: [
      { href: "/admin/house-types", label: "แบบบ้าน", icon: House },
      { href: "/admin/gallery", label: "แกลเลอรี", icon: Images },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const isActive = (href: string, path: string) =>
  href === "/admin" ? path === "/admin" : path.startsWith(href);

const COLLAPSE_KEY = "grove.admin.sidebar";
/* จอแคบสูง 44px (นิ้วโป้งมือเดียว) · จอกว้างกระชับ 36px · สี hover/active lerp 150ms */
const ROW =
  "rounded-control text-15 flex h-11 w-full items-center gap-3 px-2.5 font-medium hover:bg-canvas hover:text-ironwood lg:h-9 transition-colors duration-150 motion-reduce:transition-none";
const ICON = "size-[18px] shrink-0";

export function AdminShell({
  brandName,
  email,
  children,
}: {
  brandName: string;
  email: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const leads = useLeads();
  const [open, setOpen] = useState(false); // ลิ้นชักจอแคบ
  const [collapsed, setCollapsed] = useState(false); // แถบไอคอนจอกว้าง
  const [desktop, setDesktop] = useState(false); // lg ขึ้นไป — ปุ่มเดียวทำคนละอย่างตามขนาดจอ
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = matchMedia("(min-width: 64rem)");
    const sync = () => {
      setDesktop(mq.matches);
      if (mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    // เปิดลิ้นชักแล้วโฟกัสย้ายเข้าไปในลิ้นชัก (เนื้อหาด้านหลังเป็น inert อยู่) — Tab ไม่หลุดไปหลังม่าน
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // ปุ่มเปิดยัง inert อยู่จนกว่าจะ render รอบถัดไป — โฟกัสคืนในเฟรมถัดไป
      requestAnimationFrame(() => trigger.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ปุ่มเดียวแบบ SidebarTrigger: จอแคบเปิดลิ้นชัก · จอกว้างยุบ/ขยาย
  const toggle = () => {
    if (!desktop) return setOpen(true);
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
  };

  const close = () => setOpen(false);
  const label = cx(collapsed && "lg:sr-only");
  const tip = (text: string) => (collapsed ? text : undefined);
  const current = ALL.find((i) => isActive(i.href, path));

  return (
    <div className="lg:flex lg:min-h-dvh">
      {/* ม่านหลังลิ้นชัก — จางพร้อมลิ้นชักเลื่อน 0.2s (§4 เปิด panel) · พื้น canvas โปร่ง ทึบลงทั้งโหมดสว่างและมืด */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cx(
          "bg-canvas/80 fixed inset-0 z-40 transition-[opacity,visibility] duration-200 motion-reduce:transition-none lg:hidden",
          open ? "ease-settle visible opacity-100" : "invisible opacity-0",
        )}
      />

      <aside
        id="admin-sidebar"
        aria-label="แถบเมนูหลังบ้าน"
        className={cx(
          "bg-paper border-concrete fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r",
          "ease-settle transition-[translate,visibility] duration-200 motion-reduce:transition-none",
          /* ยุบ/ขยายบนจอกว้างสลับทันที ไม่ไล่ความกว้าง — ไล่ width ทำให้เนื้อหาข้างๆ ตัดบรรทัดใหม่ทุกเฟรม (§4 ห้าม layout ขยับ) */
          "lg:visible lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "invisible -translate-x-full",
          collapsed ? "lg:w-14" : "lg:w-60",
        )}
      >
        <div className="flex h-14 items-center gap-2 px-2">
          <Link
            href="/admin"
            onClick={close}
            title={tip(brandName)}
            className="rounded-control flex min-w-0 flex-1 items-center gap-2.5 p-1"
          >
            <span className="bg-pine text-on-pine rounded-control grid size-8 shrink-0 place-items-center">
              <BrandSymbol className="h-5" />
            </span>
            <span className={cx("min-w-0 leading-tight", label)}>
              <span className="text-15 block truncate font-semibold">{brandName}</span>
              <span className="text-13 text-moss block">หลังบ้าน</span>
            </span>
          </Link>
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="ปิดเมนู"
            className="text-moss hover:text-ironwood rounded-control grid size-9 place-items-center lg:hidden"
          >
            <X className={ICON} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="เมนูหลังบ้าน" className="flex-1 overflow-y-auto px-2 py-2">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {/* ตอนยุบ หัวกลุ่มกลายเป็นเส้นคั่น */}
              <p
                className={cx(
                  "text-13 text-moss px-2.5 pb-1.5",
                  collapsed && "lg:border-concrete lg:mx-2.5 lg:mb-2 lg:border-t lg:p-0",
                )}
              >
                <span className={label}>{group.label}</span>
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, path);
                  const count = item.badge === "leads" ? leads?.length : undefined;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        title={tip(item.label)}
                        className={cx(ROW, active ? "bg-canvas text-pine" : "text-moss")}
                      >
                        <item.icon className={ICON} aria-hidden="true" />
                        <span className={cx("flex-1 truncate", label)}>{item.label}</span>
                        {!!count && (
                          <span
                            aria-hidden="true"
                            className={cx("text-13 tabular-nums", collapsed && "lg:hidden")}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-concrete flex flex-col gap-0.5 border-t px-2 py-3">
          <Link href="/" title={tip("เปิดหน้าเว็บ")} className={cx(ROW, "text-moss")}>
            <ExternalLink className={ICON} aria-hidden="true" />
            <span className={label}>เปิดหน้าเว็บ</span>
          </Link>
          <SignOutButton
            className={cx(ROW, "text-moss")}
            icon={<LogOut className={ICON} aria-hidden="true" />}
            labelClassName={label}
          />
          {/* โหมดเดโมมีบัญชีเดียว — B2 เปลี่ยนเป็นผู้ใช้จาก session */}
          <div className={cx("mt-2 flex items-center gap-2.5 px-1", collapsed && "lg:hidden")}>
            <span className="bg-canvas text-moss rounded-control grid size-8 shrink-0 place-items-center">
              <UserRound className={ICON} aria-hidden="true" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="text-13 block font-medium">ผู้ดูแล (เดโม)</span>
              {email && <span className="text-13 text-moss block truncate">{email}</span>}
            </span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1" inert={open || undefined}>
        <header className="bg-canvas border-concrete sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 lg:px-6">
          <button
            ref={trigger}
            type="button"
            onClick={toggle}
            aria-label="สลับแถบเมนู"
            aria-controls="admin-sidebar"
            aria-expanded={desktop ? !collapsed : open}
            className="text-moss hover:text-ironwood hover:bg-paper rounded-control -ml-1.5 grid size-9 place-items-center"
          >
            <PanelLeft className={ICON} aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="bg-concrete h-5 w-px" />
          <nav aria-label="ตำแหน่งปัจจุบัน" className="text-15 min-w-0">
            <ol className="flex items-center gap-2">
              <li className="text-moss">หลังบ้าน</li>
              {current && current.href !== "/admin" && (
                <>
                  <li aria-hidden="true" className="text-moss">
                    /
                  </li>
                  <li aria-current="page" className="truncate font-medium">
                    {current.label}
                  </li>
                </>
              )}
            </ol>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

/** หัวหน้าทุกหน้าในหลังบ้าน — h1 + ประโยคบอกว่าหน้านี้ทำอะไรได้ · actions ชิดขวาบนจอกว้าง */
export function AdminHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-34">{title}</h1>
        <p className="text-15 text-moss mt-2 max-w-[70ch]">{lead}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** แถบเดโม — ข้อความตาม PROMPTS S7 · พื้นกลาง (paper + ขอบ concrete) ไม่ใช้ marigold
    เพราะ marigold สงวนไว้ให้ความหมายจริง (แปลงที่เลือก/สถานะจอง §1) ไม่ใช่ป้ายเตือนทั่วไป */
export function DemoBanner() {
  return (
    <p role="note" className="bg-paper border-concrete text-15 text-moss border-b px-6 py-2.5">
      <strong className="text-ironwood font-semibold">โหมดเดโม</strong> ข้อมูลไม่บันทึกจริง ·
      ค่าที่แก้เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
    </p>
  );
}
