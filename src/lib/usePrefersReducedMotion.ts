"use client";

import { useEffect, useState } from "react";

/* DESIGN-SPEC §4 — เคารพ prefers-reduced-motion ทุกจุด รวมถึงปิดการหมุน diorama */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}
