/* ค่าร่วมของ intro loader หน้าแรก — ไฟล์ธรรมดา (ไม่ใช่ "use client") server component จึง import ค่าเหล่านี้ได้ตรงๆ */

export const INTRO_LOADER_ID = "intro-loader";
/** sessionStorage key ที่บอกว่า session นี้เห็น intro แล้ว — e2e ตั้งค่านี้ล่วงหน้าเพื่อข้าม loader */
export const INTRO_SESSION_KEY = "grove:intro";

/** สคริปต์ inline วางต่อจาก element ของ loader ใน HTML — ทำงานระหว่างที่เบราว์เซอร์อ่าน HTML ก่อนวาดเฟรมแรก
    เปิด loader (data-on) เฉพาะเมื่อ: ไม่ขอ reduced motion · ไม่ใช่การกด back/forward · ยังไม่เคยเห็นใน session นี้
    ไม่มี JS (crawler) = ไม่มีอะไรเปิด loader · CSS ซ่อนไว้เป็นค่าตั้งต้น เนื้อหาของหน้าอยู่ใน HTML ครบ
    sessionStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเครื่อง) = ข้าม loader ไปเลย ไม่เสี่ยงโชว์ซ้ำทุกหน้า */
export const INTRO_SCRIPT = `(function(){try{var el=document.getElementById("${INTRO_LOADER_ID}");if(!el)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(n&&n.type==="back_forward")return;if(sessionStorage.getItem("${INTRO_SESSION_KEY}"))return;sessionStorage.setItem("${INTRO_SESSION_KEY}","1");el.setAttribute("data-on","")}catch(e){}})();`;
