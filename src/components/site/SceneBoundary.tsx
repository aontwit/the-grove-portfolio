"use client";

import {
  Component,
  lazy,
  useCallback,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";

/* ด่านกันล้มของฉาก 3D — hero หน้าแรกและตัวดูแบบบ้านใช้ร่วมกัน (หมู่บ้านในหน้าผังมีของตัวเองใน MasterPlan3D)
   three.js มาทีหลังเป็นก้อนใหญ่: บน 4G chunk หลุดได้จริง (ChunkLoadError) และบางเครื่องไม่มี WebGL เลย
   ทั้งสองกรณีต้องไม่พาหน้าล่มตาม — ภาพนิ่งของโมเดลเดียวกันยังอยู่ แล้วบอกตรงๆ ว่าเกิดอะไร */

export class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** lazy ตัวใหม่ทุกครั้งที่เรียก — React.lazy จำ promise ที่ล้มไว้ตลอดอายุ ปุ่มลองใหม่ต้องได้ตัวใหม่ถึงจะขอไฟล์ใหม่
    เรียกใน useState(() => …) ของ component ที่ remount ด้วย key ตอนลองใหม่ */
export function freshLazy<P extends object>(load: () => Promise<ComponentType<P>>) {
  return lazy(async () => ({ default: await load() }));
}

let webglCache: boolean | undefined;
let probeQueued = false;
const listeners = new Set<() => void>();

function probeWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    /* คืน context ทันที — เบราว์เซอร์จำกัดจำนวน context ต่อหน้า ตัวทดสอบห้ามไปกินโควตาของฉากจริง */
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/* ตรวจใน Web Worker (OffscreenCanvas) ก่อน — การสร้าง WebGL context ครั้งแรกของหน้าต้องปลุก GPU process
   ซึ่งบล็อก thread ที่เรียกเป็นร้อย ms (วัด 2026-10-03 ใน Lighthouse: 250 ms = long task ใหญ่สุดของหน้าแรก)
   ให้ worker รับภาระนั้นแทน main thread · พอ GPU ตื่นแล้ว context ของฉากจริงบน main thread สร้างได้ใน ~3 ms
   worker บอกไม่ได้ (ไม่มี OffscreenCanvas / WebGL ใน worker ไม่ได้ เช่น Safari รุ่นเก่า / ถูกบล็อก) = ตรวจบน main thread
   ตอนเบราว์เซอร์ว่างแบบเดิม — ห้ามสรุปว่า "ไม่มี WebGL" จาก worker อย่างเดียว */
const WORKER_PROBE = `onmessage=function(){var ok=false;try{var c=new OffscreenCanvas(1,1);var g=c.getContext("webgl2")||c.getContext("webgl");ok=!!g;if(g){var x=g.getExtension("WEBGL_lose_context");if(x)x.loseContext();}}catch(e){}postMessage(ok)}`;

function probeInWorker(): Promise<boolean> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let url = "";
    let worker: Worker | null = null;
    const done = (ok: boolean) => {
      window.clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      worker = null;
      resolve(ok);
    };
    const timer = window.setTimeout(() => done(false), 3000);
    try {
      url = URL.createObjectURL(new Blob([WORKER_PROBE], { type: "text/javascript" }));
      worker = new Worker(url);
      worker.onmessage = (e: MessageEvent<unknown>) => done(e.data === true);
      worker.onerror = () => done(false);
      worker.postMessage(0);
    } catch {
      done(false);
    }
  });
}

function queueProbe() {
  if (webglCache !== undefined || probeQueued) return;
  probeQueued = true;
  const settle = (ok: boolean) => {
    webglCache = ok;
    listeners.forEach((l) => l());
  };
  /* ตรวจบน main thread ตอนเบราว์เซอร์ว่าง ไม่ใช่ระหว่าง hydrate — ไม่ไปต่อท้าย task ที่ทำให้หน้ากดได้ */
  const onMain = () => {
    if (typeof window.requestIdleCallback === "function")
      window.requestIdleCallback(() => settle(probeWebGL()), { timeout: 1000 });
    else window.setTimeout(() => settle(probeWebGL()), 1);
  };
  void probeInWorker().then((ok) => (ok ? settle(true) : onMain()));
}

/** true/false เมื่อรู้แล้ว · null = ยังไม่รู้ (SSR, รอบ hydrate, รอตรวจ) จึงยังไม่ mount ฉาก
    wanted = false: ยังไม่ต้องการฉากตอนนี้ (เช่นแปลนยังเป็น 2D) — ไม่ตรวจ แต่ถ้าเคยตรวจแล้วคืนค่าที่รู้ */
export function useWebGL(wanted = true): boolean | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      if (wanted) queueProbe();
      return () => {
        listeners.delete(onChange);
      };
    },
    [wanted],
  );
  return useSyncExternalStore(
    subscribe,
    () => webglCache ?? null,
    () => null,
  );
}
