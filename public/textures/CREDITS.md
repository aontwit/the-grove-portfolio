# Texture และ HDRI ของฉาก 3D

ทุกไฟล์ในโฟลเดอร์นี้และใน `public/hdri/` มาจาก [Poly Haven](https://polyhaven.com) สัญญาอนุญาต **CC0 1.0** (สาธารณสมบัติ ใช้เชิงพาณิชย์ได้ ไม่ต้องให้เครดิต — ลงไว้เพื่อตรวจย้อนได้)
ดาวน์โหลดผ่าน API สาธารณะ `https://api.polyhaven.com/files/<id>` ไฟล์ JPG 1k เมื่อ 2026-10-02

## การแปลงไฟล์

- ทุกภาพเป็น WebP ขนาด 1024² (`_1k`, เดสก์ท็อป) และ 512² (`_512`, มือถือ และผิวที่เห็นไกลเสมอ) · normal map แบบ OpenGL (`nor_gl`)
- `*_color` ของสนาม หลังคา ปูนฉาบ ถนน ทางเท้า ปูน กรวด ถูกแปลงเป็น **ภาพความสว่างไร้สี** (ค่าเฉลี่ยเชิงเส้น 0.75)
  สีจริงมาจาก token 3D ใน `src/components/three/materials.ts` (DESIGN-SPEC §5) — texture ให้แค่ลายผิว
- ไม้ (`oak`, `floor`) คงสีจริงของภาพ คูณด้วยสีอ่อน `oakTint` / `floorTint`
- HDRI: ไฟล์ .hdr 1k ย่อเป็น 512×256 (`sky_512.hdr`) และ 256×128 (`sky_256.hdr`, มือถือ)
  หนีบความสว่างที่ percentile 99.7 (ตัดดวงอาทิตย์ออก — ดวงอาทิตย์ในฉากคือ directional light ที่หมุนตามเวลา)
  แทนครึ่งล่างใต้ขอบฟ้าด้วยสีดินกลางๆ และลดความอิ่มสีฟ้าลง 80% (คูณอุ่น 1.04 / 1.00 / 0.92)

## รายการ

| ไฟล์ | Poly Haven asset | URL | สัญญาอนุญาต |
|---|---|---|---|
| `lawn_*` | Leafy Grass (`leafy_grass`) | https://polyhaven.com/a/leafy_grass | CC0 |
| `roof_*` | Grey Roof Tiles (`grey_roof_tiles`) | https://polyhaven.com/a/grey_roof_tiles | CC0 |
| `render_*` | White Stucco (`white_stucco`) | https://polyhaven.com/a/white_stucco | CC0 |
| `oak_*` | Oak Veneer 01 (`oak_veneer_01`) | https://polyhaven.com/a/oak_veneer_01 | CC0 |
| `floor_*` | Laminate Floor 02 (`laminate_floor_02`) | https://polyhaven.com/a/laminate_floor_02 | CC0 |
| `linen_normal_*` | Rough Linen (`rough_linen`) | https://polyhaven.com/a/rough_linen | CC0 |
| `asphalt_*` | Asphalt 02 (`asphalt_02`) | https://polyhaven.com/a/asphalt_02 | CC0 |
| `paving_*` | Concrete Pavement (`concrete_pavement`) | https://polyhaven.com/a/concrete_pavement | CC0 |
| `concrete_*` | Concrete Floor 02 (`concrete_floor_02`) | https://polyhaven.com/a/concrete_floor_02 | CC0 |
| `gravel_*` | Sandy Gravel (`sandy_gravel`) | https://polyhaven.com/a/sandy_gravel | CC0 |
| `../hdri/sky_*.hdr` | Kloofendal 48d Partly Cloudy (Pure Sky) (`kloofendal_48d_partly_cloudy_puresky`) | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 |

## ขนาดที่โหลดจริง

| ชุด | ขนาด |
|---|---|
| เดสก์ท็อป (ทุกไฟล์ที่ฉากใดฉากหนึ่งอาจโหลด: `_1k` + ผิว 512 ที่ไม่มี 1k + `sky_512.hdr`) | ≈ 3.4 MB |
| มือถือ (`_512` ทั้งหมด + `sky_256.hdr`) | ≈ 1.2 MB |

ฉากหมู่บ้านไม่โหลดพื้นไม้และผ้า · diorama ไม่โหลดผ้า · ผ้าโหลดเฉพาะโหมดเดินดู
