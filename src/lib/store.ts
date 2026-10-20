import { create } from "zustand";
import type { PlotStatus } from "./schemas";
import {
  MOODS,
  SURFACE_FAMILIES,
  type Finish,
  type MoodId,
  type MoodSurface,
  type SwatchFamily,
  type SwatchId,
} from "@/components/three/materials";

export type PlanMode = "2d" | "3d" | "walk";
export type StatusFilter = PlotStatus | "all";

type GroveState = {
  selectedRoom: string | null;
  selectedPlot: string | null;
  /** แผ่นล่างจอของแปลงที่เลือก (จอแคบ) กางเต็มหรือยัง — เปลี่ยนแปลงแล้วกลับไปแบบย่อทุกครั้ง */
  plotSheetExpanded: boolean;
  planMode: PlanMode;
  statusFilter: StatusFilter;
  selectRoom: (id: string | null) => void;
  selectPlot: (id: string | null) => void;
  setPlotSheetExpanded: (expanded: boolean) => void;
  setPlanMode: (mode: PlanMode) => void;
  setStatusFilter: (filter: StatusFilter) => void;
};

export const useGrove = create<GroveState>((set) => ({
  selectedRoom: null,
  selectedPlot: null,
  plotSheetExpanded: false,
  planMode: "2d",
  statusFilter: "all",
  selectRoom: (id) => set({ selectedRoom: id }),
  selectPlot: (id) => set({ selectedPlot: id, plotSheetExpanded: false }),
  setPlotSheetExpanded: (expanded) => set({ plotSheetExpanded: expanded }),
  setPlanMode: (mode) => set({ planMode: mode }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));

/* ── Mood studio ของหน้าแบบบ้าน (โหมด Isometric) ─────────────────────────────
   แผงฝั่ง DOM เขียน · ฉาก 3D อ่านใน useFrame ผ่าน getState() (ไม่ re-render ฉากทุกครั้งที่เลือกวัสดุ)
   preview = วัสดุที่กำลังชี้/ลากค้างอยู่ ยังไม่เลือกจริง — ฉากแสดงตัวนี้ก่อน finish */
type MoodState = {
  hour: number;
  finish: Finish;
  target: MoodSurface;
  tab: SwatchFamily;
  preview: { surface: MoodSurface; swatch: SwatchId } | null;
  uiHidden: boolean;
  cinematic: boolean;
  applyMood: (id: MoodId) => void;
  setHour: (hour: number) => void;
  setTarget: (surface: MoodSurface) => void;
  setTab: (family: SwatchFamily) => void;
  apply: (surface: MoodSurface, swatch: SwatchId) => void;
  setPreview: (p: MoodState["preview"]) => void;
  toggleUi: () => void;
  toggleCinematic: () => void;
};

export const HOUR_MIN = 6;
export const HOUR_MAX = 22;
const clampHour = (h: number) => Math.min(HOUR_MAX, Math.max(HOUR_MIN, h));

export const useMood = create<MoodState>((set) => ({
  hour: MOODS.cozy.hour,
  finish: { ...MOODS.cozy.finish },
  target: "floor",
  tab: "wood",
  preview: null,
  uiHidden: false,
  cinematic: false,
  applyMood: (id) => set({ hour: MOODS[id].hour, finish: { ...MOODS[id].finish }, preview: null }),
  setHour: (hour) => set({ hour: clampHour(hour) }),
  setTarget: (target) =>
    set((s) => ({
      target,
      tab: (SURFACE_FAMILIES[target] as readonly SwatchFamily[]).includes(s.tab)
        ? s.tab
        : SURFACE_FAMILIES[target][0],
    })),
  /* แท็บที่ผิวปัจจุบันรับไม่ได้ → ย้ายเป้าไปผิวแรกที่รับวัสดุชนิดนั้น */
  setTab: (tab) =>
    set((s) => {
      const fits = (m: MoodSurface) =>
        (SURFACE_FAMILIES[m] as readonly SwatchFamily[]).includes(tab);
      if (fits(s.target)) return { tab };
      const target = (Object.keys(SURFACE_FAMILIES) as MoodSurface[]).find(fits) ?? s.target;
      return { tab, target };
    }),
  apply: (surface, swatch) =>
    set((s) => ({ finish: { ...s.finish, [surface]: swatch }, preview: null, target: surface })),
  setPreview: (preview) => set({ preview }),
  toggleUi: () => set((s) => ({ uiHidden: !s.uiHidden })),
  toggleCinematic: () => set((s) => ({ cinematic: !s.cinematic })),
}));
