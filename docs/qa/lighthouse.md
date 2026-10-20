# Lighthouse mobile

วันที่วัด: 2026-10-02 · เป้าหมาย: `http://localhost:3100` (production — `pnpm build` + `pnpm start --port 3100`)
Lighthouse 13.5.0 · โปรไฟล์ mobile ค่าเริ่มของ Lighthouse (Moto G Power, slow 4G จำลอง) · 3 รอบต่อหน้า เก็บรอบที่ Perf เป็นค่ากลาง
เบราว์เซอร์: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36

เป้า: Perf ≥85 · A11y ≥95 (ตัวหนา = ต่ำกว่าเป้า)

| route | Perf (ทุกรอบ) | A11y | Best practices | SEO | FCP ms | LCP ms | TBT ms | CLS |
|---|---|---|---|---|---|---|---|---|
| `/house-types/baibua` | **81** (74 / 81 / 82) | 100 | 100 | 100 | 1963 | 4140 | 222 | 0.000 |
| `/house-types/rommai` | **76** (72 / 76 / 82) | 100 | 100 | 100 | 1961 | 3133 | 629 | 0.000 |
| `/house-types/lomyen` | **81** (76 / 81 / 83) | 100 | 100 | 100 | 1960 | 4151 | 208 | 0.000 |
| `/gallery` | 86 (85 / 86 / 91) | 100 | 100 | 100 | 1962 | 4006 | 65 | 0.000 |
| `/location` | 93 (87 / 93 / 94) | 100 | 100 | 100 | 1961 | 2865 | 71 | 0.001 |

## audit a11y ที่ตก

ไม่มี

ไฟล์ผลเต็มต่อหน้า: `docs/qa/lighthouse/<route>.json` (เปิดดูได้ที่ https://googlechrome.github.io/lighthouse/viewer/)
