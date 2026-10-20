"use client";

import Link from "next/link";
import { FactList } from "@/components/site/FactList";
import { useDemo, useLiveHouses } from "@/lib/demo";
import type { HouseType, Plot } from "@/lib/schemas";
import { PriceField, TEXT_BUTTON, TextField } from "./fields";

/* แบบบ้าน — แก้ได้เฉพาะข้อความกับราคา
   ห้อง ผนัง ประตู มาจาก geometry ชุดเดียวกับแปลน 2D / 3D / โหมดเดินดู จึงไม่เปิดให้แก้ตรงนี้ */

const KIND = { detached: "บ้านเดี่ยว", twin: "บ้านแฝด" } as const;

export function HouseTypeEditor({
  houses,
  plots,
  links,
}: {
  houses: HouseType[];
  plots: Plot[];
  /** id แบบบ้าน → path หน้าแบบบ้านบนเว็บ (ใต้โครงการของแบบนั้น) */
  links: Record<string, string>;
}) {
  const live = useLiveHouses(houses);
  const editHouse = useDemo((s) => s.editHouse);
  const resetHouse = useDemo((s) => s.resetHouse);
  const edits = useDemo((s) => s.houses);

  return (
    <ul className="flex flex-col gap-6">
      {live.map((h) => {
        const original = houses.find((o) => o.id === h.id) ?? h;
        const onPlots = plots.filter((p) => p.houseTypeId === h.id).length;
        return (
          <li key={h.id}>
            <article
              aria-labelledby={`${h.id}-name`}
              className="bg-paper border-concrete rounded-card grid grid-cols-1 gap-8 border p-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id={`${h.id}-name`} className="text-26">
                    {h.name}
                  </h2>
                  <div className="flex gap-4">
                    {h.id in edits && (
                      <button
                        type="button"
                        onClick={() => resetHouse(h.id)}
                        className={TEXT_BUTTON}
                      >
                        คืนค่าเดิม
                      </button>
                    )}
                    <Link href={links[h.id] ?? "/projects"} className={TEXT_BUTTON}>
                      ดูหน้าแบบบ้าน
                    </Link>
                  </div>
                </div>

                <TextField
                  label="ชื่อแบบบ้าน"
                  value={h.name}
                  onCommit={(name) => editHouse(original, { name })}
                  emptyError="ใส่ชื่อแบบบ้าน ลูกค้าใช้ชื่อนี้เรียกตอนโทรมาถาม"
                />
                <div className="flex flex-col gap-2">
                  <span className="text-15 font-medium" id={`${h.id}-price`}>
                    ราคาเริ่มต้น
                  </span>
                  <PriceField
                    className="max-w-[16rem]"
                    label={`ราคาเริ่มต้น ${h.name}`}
                    value={h.priceFrom}
                    original={original.priceFrom}
                    onCommit={(priceFrom) =>
                      priceFrom !== null && editHouse(original, { priceFrom })
                    }
                  />
                </div>
                <TextField
                  multiline
                  label="จุดเด่น (ขึ้นบนการ์ดแบบบ้าน)"
                  value={h.highlight}
                  onCommit={(highlight) => editHouse(original, { highlight })}
                  emptyError="เขียนจุดเด่นสักประโยค เช่น ขนาดห้องหรือทิศที่แดดเข้า"
                  hint="ประโยคเดียว บอกเป็นตัวเลขหรือของจริง เช่น ห้องนั่งเล่นกว้าง 4.2 เมตร"
                />
              </div>

              <div className="border-concrete border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                <h3 className="text-17 mb-3">ขนาดจากแบบ</h3>
                <FactList
                  divided
                  rows={[
                    ["ประเภท", `${KIND[h.kind]} ${h.storeys} ชั้น`],
                    ["พื้นที่ใช้สอย", `${h.areaSqm.toFixed(1)} ตร.ม.`],
                    ["ห้องนอน / ห้องน้ำ", `${h.beds} / ${h.baths}`],
                    ["อยู่บนผัง", `${onPlots} แปลง`],
                  ]}
                />
                <p className="text-13 text-moss mt-4">
                  ห้องและผนังมาจากข้อมูลแบบชุดเดียวกับแปลน 3D และโหมดเดินดู แก้จากหน้านี้ไม่ได้
                  เพื่อไม่ให้สามมุมมองเพี้ยนกัน
                </p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
