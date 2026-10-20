import { useSyncExternalStore } from "react";

/** จอสัมผัสหรือจอแคบกว่า 1024px — ไม่มีการดักการเลื่อน (DESIGN-SPEC §4) · ตรงกับ @custom-variant compact ใน globals.css */
export const COMPACT_QUERY = "(pointer: coarse), (max-width: 1023.98px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** true บนจอ compact — server และ hydrate รอบแรกได้ false (layout ตัดสินด้วย CSS variant compact อยู่แล้ว ไม่มี layout shift) */
export function useCompact() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}
