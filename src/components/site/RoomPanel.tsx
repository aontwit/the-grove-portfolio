"use client";

import { roomArea, roomDepth, roomWidth } from "@/geometry";
import type { HouseType } from "@/lib/schemas";
import { useDict } from "@/i18n/client";
import { useGrove } from "@/lib/store";
import { SampleNote } from "@/components/site/SampleNote";

/* ตัวเลขทุกตัวในแผงนี้มาจาก src/geometry — ไม่มีค่าใดพิมพ์มือ
   แปลนตัวอย่าง (samplePlan) = ขนาดห้องไม่ใช่ของบ้านจริง ติดป้ายในแผงด้วย (แผงนี้ถูกอ่านแยกจากตัวแปลนได้) */

export function RoomPanel({ house }: { house: HouseType }) {
  const selectedRoom = useGrove((s) => s.selectedRoom);
  const room = house.rooms.find((r) => r.id === selectedRoom);
  const t = useDict();

  if (!room) {
    return (
      <aside className="border-concrete rounded-card border p-5">
        <h2 className="text-21 mb-2">{t.room.emptyTitle}</h2>
        <p className="text-15 text-moss">{t.room.emptyBody}</p>
      </aside>
    );
  }

  const rows: [string, string][] = [
    [t.room.area, `${roomArea(room).toFixed(2)} ${t.units.sqm}`],
    [t.room.size, t.house.dims(roomWidth(room).toFixed(2), roomDepth(room).toFixed(2))],
  ];

  return (
    <aside className="border-concrete rounded-card border p-5">
      <h2 className="text-26 mb-4">{room.name}</h2>
      {house.samplePlan && <SampleNote kind="plan" className="mb-4" />}
      <dl className="mb-4 flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-15 text-moss">{label}</dt>
            <dd className="font-display text-17 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-17 text-moss max-w-[70ch]">{room.desc}</p>
      {room.outdoor && <p className="text-13 text-moss mt-3">{t.room.outdoor}</p>}
    </aside>
  );
}
