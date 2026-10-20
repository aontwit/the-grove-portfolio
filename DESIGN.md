---
name: เดอะ โกรฟ (The Grove)
description: โครงการบ้านจัดสรร 18 แปลง — โมเดลไม้อุ่น บนแท่นแกลเลอรีขาว
colors:
  paper: "#FFFFFF"
  canvas: "#F4F6F1"
  concrete: "#E1E5DC"
  slate: "#39433B"
  ink: "#0E1310"
  ironwood: "#161C18"
  moss: "#525C55"
  chalk: "#ECEFE8"
  ash: "#9AA69D"
  pine: "#1E6A46"
  citron: "#D6F25B"
  marigold: "#C28214"
  marigold-deep: "#8A5A08"
  st-available: "#1F6B48"
  st-available-bg: "#E3EFE8"
  st-reserved-bg: "#FBF0DC"
  st-sold: "#4F4C46"
  st-sold-bg: "#ECEAE6"
  dark-canvas: "#0E1310"
  dark-paper: "#1A211C"
  dark-concrete: "#2E3730"
  dark-ironwood: "#ECEFE8"
  dark-moss: "#9AA69D"
  dark-pine: "#5FA184"
  dark-slate: "#232C25"
typography:
  display:
    fontFamily: "Bai Jamjuree"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Bai Jamjuree"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Anuphan"
    fontWeight: 400
    fontSize: "17px"
    lineHeight: 1.65
  label:
    fontFamily: "Anuphan"
    fontWeight: 500
    fontSize: "13px"
    letterSpacing: "normal"
  numeric:
    fontFamily: "Bai Jamjuree"
    fontWeight: 600
    fontFeature: "tabular-nums"
rounded:
  surface: "12px"
  control: "6px"
  pill: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "#FFFFFF"
  button-on-ink:
    backgroundColor: "{colors.citron}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ironwood}"
    rounded: "{rounded.control}"
    height: "48px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ironwood}"
    rounded: "{rounded.surface}"
  input:
    backgroundColor: "{colors.concrete}"
    textColor: "{colors.ironwood}"
    rounded: "{rounded.control}"
  chip-available:
    backgroundColor: "{colors.st-available-bg}"
    textColor: "{colors.st-available}"
    rounded: "{rounded.pill}"
  chip-reserved:
    backgroundColor: "{colors.st-reserved-bg}"
    textColor: "{colors.marigold-deep}"
    rounded: "{rounded.pill}"
  chip-sold:
    backgroundColor: "{colors.st-sold-bg}"
    textColor: "{colors.st-sold}"
    rounded: "{rounded.pill}"
---

<!-- SYNCED FROM DESIGN-SPEC.md — ทิศทางเดียว. DESIGN-SPEC.md คือ source of truth และ IMMUTABLE.
     ห้ามแก้ไฟล์นี้แล้วคาดว่า spec จะตาม; ถ้าจะเปลี่ยนระบบภาพ ต้องคุยกับเจ้าของโปรเจกต์เพื่อแก้ spec ก่อน
     แล้วจึง re-sync ไฟล์นี้. อ้างอิง: DESIGN-SPEC.md §0-§7 -->

# Design System: เดอะ โกรฟ

## Overview

**Creative North Star: "โมเดลไม้อุ่น บนแท่นแกลเลอรีขาว"**

3D diorama คือพระเอกหนึ่งเดียวของเว็บนี้ — ไม้อุ่น แสงบ่าย มีเงาจริง มีของใช้ในบ้าน
UI ทุกอย่างรอบตัวมันคือแกลเลอรีสถาปนิก: ขาวปูน สะอาด แม่นยำ เงียบ และตั้งใจไม่แย่งซีน
ถ้า UI ชิ้นไหนเริ่มน่าสนใจกว่าโมเดล แปลว่าชิ้นนั้นผิด

ภาษาภาพของ UI ยืมมาจากแบบเขียนสถาปนิก — เส้นบอกระยะ (dimension line) สเกลบาร์ ทิศเหนือ —
แต่ยืมมาในฐานะ**ข้อมูลจริง** ใช้เฉพาะหน้าแปลน/ผัง/สเปกเท่านั้น ไม่ใช่ลายตกแต่งโรยทั่วเว็บ
เส้นบอกระยะที่ไม่ได้บอกระยะอะไรเลยคือของปลอม

ความหนาแน่นของหน้าเป็นแบบแกลเลอรี: ที่ว่างเยอะ ชั้นน้อย ของน้อยชิ้นแต่ละชิ้นชัด
ไม่มีเงา ไม่มี gradient ไม่มีอะไรเรืองแสง ความลึกมาจากขอบเส้นและระดับพื้นเท่านั้น

**Key Characteristics:**
- หน้ามีสองพื้น: แผ่นแบบสว่าง `canvas #F4F6F1` (ขาวปูนอมเขียว ไม่ใช่ครีมไม่ใช่เบจ) สลับกับแถบหมึก `ink #0E1310`
- สี interactive: `pine #1E6A46` บนพื้นสว่าง · `citron #D6F25B` บนพื้นเข้ม
- Radius มีสองค่า 12px / 6px จบ
- ไม่มี box-shadow ใน UI เลย — เงามีได้เฉพาะใน 3D canvas
- ทั้งเว็บมีของที่เคลื่อนไหวเองแค่หนึ่งชิ้น: diorama บน hero
- จัดชิดซ้ายทั้งเว็บ ตัวเลขเรียงคอลัมน์เป็น tabular-nums

## Colors

พาเลตต์คือห้องแกลเลอรีสีปูนที่มีไม้สนเข้มหนึ่งจุดและทองเรืองหนึ่งจุด — นอกนั้นคือเฉดกลางทั้งหมด

### Primary
- **Pine (`#1E6A46`)** — เขียวสนเข้ม สี interactive บนพื้นสว่าง: ปุ่มหลัก ลิงก์ วงแหวน focus และเป็นพื้นของ section ได้
- **Citron (`#D6F25B`)** — สี interactive บนแถบหมึก ใช้บน `ink`/`slate` เท่านั้น
  และเส้น dimension ในหน้าแปลน ห้ามใช้เป็นพื้นตกแต่งของ section

### Secondary
- **Marigold (`#C28214`)** — ทองดาวเรือง ไฮไลต์เชิงความหมายเท่านั้น: แปลง/ห้องที่กำลังถูกเลือก
  marker บนผัง และสถานะ "จอง" ถ้าไม่ได้สื่อว่า "อันนี้แหละที่คุณเลือกอยู่" ห้ามใช้

### Neutral
- **Canvas (`#F4F6F1`)** — ขาวปูนอมเขียวจางๆ พื้นหลังหลักของหน้า
- **Ink (`#0E1310`)** — แถบเข้มเต็มจอ และเป็นเวทีของ 3D canvas บนหน้าแรก
- **Paper (`#FFFFFF`)** — ขาวสะอาด surface ที่ยกระดับขึ้นมา: การ์ด panel ตาราง admin
- **Concrete (`#E1E5DC`)** — เทาปูน เส้นขอบ divider และพื้น input ทุกช่อง
- **Ironwood (`#161C18`)** — ดำอมเขียว ข้อความหลักบนพื้นสว่าง
- **Chalk (`#ECEFE8`) / Ash (`#9AA69D`)** — ข้อความหลัก/รองบนแถบหมึก
- **Moss (`#525C55`)** — เทาอมเขียว ข้อความรอง คำอธิบาย หน่วย

### สถานะแปลง
- **ว่าง — `#1F6B48` บนพื้น `#E3EFE8`**
- **จอง — `marigold-deep #8A5A08` บนพื้น `#FBF0DC`**
- **ขายแล้ว — `#4F4C46` บนพื้น `#ECEAE6`**

### Dark mode
ออกแบบแยก ไม่ invert: canvas → `#0E1310` · paper `#1A211C` · concrete `#2E3730` · slate `#232C25` ·
ironwood → `#ECEFE8` · moss → `#9AA69D` · pine → `#5FA184`
`ink` `chalk` `ash` `citron` คงค่าเดิมทั้งสองโหมด

### Named Rules
**The Two Grounds Rule.** หน้ามีสองพื้น — แผ่นแบบสว่างสำหรับข้อมูลและภาพเขียนแบบ สลับกับแถบหมึกสำหรับโมเดลและประโยคหนัก
บนแถบหมึกใช้ได้เฉพาะ `chalk` `ash` `citron` · บนพื้นสว่างใช้ `ironwood` `moss` `pine`

**The One Interactive Color Per Ground Rule.** พื้นสว่างกดได้ด้วย `pine` · พื้นเข้มกดได้ด้วย `citron` ไม่มีสีที่สาม

**The Meaning-Only Gold Rule.** `marigold` ไม่ใช่สีเน้นความสวย มันแปลว่า "สิ่งนี้ถูกเลือกอยู่" หรือ "จองแล้ว" เท่านั้น

**The No Stray Hex Rule.** สีที่ไม่อยู่ในตารางนี้คือบั๊ก รวมถึงใน placeholder, ใน SVG, ใน chart และใน admin
ยกเว้นพาเลตต์วัสดุของ 3D (DESIGN-SPEC §5) ซึ่งอยู่ในโลกของฉาก 3D ไม่ใช่ของ UI

**The Never Color-Only Rule.** สถานะทุกอย่างต้องมี label ข้อความเสมอ ห้ามสื่อด้วยสีอย่างเดียว
contrast ข้อความ ≥ 4.5:1 (≥24px ยอม 3:1)

## Typography

**Display Font:** Bai Jamjuree (600, 700)
**Body/UI Font:** Anuphan (400, 500, 600)

**Character:** Bai Jamjuree เหลี่ยมและมีสันแบบตัวอักษรบนงานเขียนแบบ — ใช้กับ h1-h3 เลขราคา เลขแปลง
Anuphan กลมและเงียบกว่า อ่านยาวสบาย — ใช้กับเนื้อหา ปุ่ม ฟอร์ม และ admin ทั้งหมด
คู่นี้ตั้งใจให้ "หัวเรื่องคือป้ายบนแบบแปลน เนื้อหาคือคนอธิบาย"

### Scale
13 / 15 / 17 / 21 / 26 / 34 / 46 / 60 — ไม่มีขนาดอื่น
line-height: เนื้อหา 1.65 · หัวเรื่อง 1.2

### Hierarchy
- **Display** (Bai Jamjuree 700, 46-60px, 1.2) — h1 ของหน้าหลักและหน้าแบบบ้าน
- **Headline** (Bai Jamjuree 600, 26-34px, 1.2) — h2/h3 หัวข้อ section
- **Numeric** (Bai Jamjuree 600, `tabular-nums`) — ราคา เลขแปลง พื้นที่ ตร.ม./ตร.ว.
- **Body** (Anuphan 400, 17px, 1.65) — เนื้อหา ≤ 70 ตัวอักษรต่อบรรทัด
- **UI/Label** (Anuphan 500, 13-15px) — ปุ่ม ฟอร์ม หัวคอลัมน์ตาราง หน่วย

### Named Rules
**The Left-Aligned Rule.** จัดชิดซ้ายทั้งเว็บ ห้าม justified ห้าม center ยกเว้น element เดี่ยวสั้นๆ

**The Tabular Number Rule.** ตัวเลขที่เรียงกันเป็นคอลัมน์ต้อง `font-variant-numeric: tabular-nums` เสมอ
— ราคา 18 แปลงที่เลื่อนไปมาตอนสแกนสายตาคือความผิดพลาดที่มองไม่เห็นแต่รู้สึกได้

**The No Eyebrow Rule.** ห้ามมี label/eyebrow ตัวพิมพ์ใหญ่ลอยอยู่เหนือ heading ห้าม badge เหนือ headline
หัวเรื่องเริ่มที่หัวเรื่อง

**ห้ามใช้:** Inter, Roboto, Arial, Kanit, Prompt, Sarabun · serif เอียงเป็น display · ฟอนต์เดียวทั้งเว็บ ·
all-caps ในเนื้อหา · letter-spacing ถ่างบน body · ข้อความลงท้ายด้วย "→"

## Layout

หน้าเป็นแกลเลอรี: คอลัมน์เดียวชิดซ้าย ที่ว่างรอบของเยอะ ไม่อัดของให้เต็มความกว้าง
บรรทัดเนื้อหาไม่เกิน 70 ตัวอักษร ถึงจอจะกว้างแค่ไหนก็ตาม

มือถือคือสนามจริง (PRODUCT.md §Operating Context) — ตัดสิน layout จากจอแคบก่อนเสมอ
แล้วค่อยปล่อยให้กว้างขึ้น ไม่ใช่บีบ desktop ลงมา

จังหวะ spacing: `DESIGN-SPEC.md` ไม่ได้กำหนด scale ของ spacing ไว้ →
ใช้ scale ของ Tailwind v4 ตามค่าเริ่มต้น (ขั้นละ 4px) ไม่สร้าง scale ใหม่ขึ้นมาเอง
**เปิดค้าง:** ถ้าเจ้าของโปรเจกต์ต้องการ spacing token เฉพาะของโครงการ ต้องแก้ใน DESIGN-SPEC ก่อนแล้ว re-sync

### Named Rules
**The Uneven Rhythm Rule.** ระยะห่างที่เท่ากันหมดทุกจุดคือหน้าที่ไม่มีลำดับ — ระยะระหว่าง section
ต้องมากกว่าระยะภายใน section ชัดเจน (Slop Ban List §7)

## Elevation & Depth

**ไม่มีเงาใน UI เลย — ไม่มีข้อยกเว้น** ความลึกทั้งหมดมาจากสองอย่าง:
(1) เส้นขอบ `concrete #E1E5DC` และ (2) การต่างระดับของพื้น (`ink` → `slate` → `canvas` → `paper`)

เงามีได้ที่เดียวคือใน 3D canvas ซึ่งเป็นเงาจริงจากไฟจริง (DESIGN-SPEC §5) ไม่ใช่ `box-shadow`

### Named Rules
**The Zero Shadow Rule.** `box-shadow` ใน CSS ของ UI = บั๊ก ตรวจด้วย grep ทุก stage
รวมถึง shadow ที่มาพร้อม shadcn/ui default ต้องถอดออก

**The Border-or-Level Rule.** อยากแยกของสองชิ้นออกจากกัน มีสองวิธีเท่านั้น: ขอบ `concrete` หรือเปลี่ยนพื้น
ไม่มีวิธีที่สาม

## Shapes

รูปทรงมี **สองค่า**: `12px` สำหรับพื้นผิวใหญ่ (การ์ด panel ภาพ) และ `6px` สำหรับตัวควบคุม (ปุ่ม input chip)
pill (`9999px`) ใช้ได้ที่เดียวคือ chip สถานะ

ขอบเส้นเป็น 1px `concrete` ทุกจุด ยกเว้นปุ่มรองที่ใช้ 1.5px `ironwood` เพื่อให้หนักพอจะเป็นปุ่ม

### Named Rules
**The Two Radius Rule.** มี 12 กับ 6 เท่านั้น radius ค่าอื่น (8, 10, 16, 24, full บนการ์ด) คือบั๊ก
ข้อยกเว้นเดียว: ภาพที่พาดสุดขอบจอ (full-bleed) ใช้ radius 0

## Components

### Buttons
- **Shape:** มุมโค้งเล็ก (6px) สูง 48px
- **Primary:** พื้น `pine #22573F` ตัวหนังสือขาว Anuphan 500
- **Secondary:** พื้นใส ขอบ 1.5px `ironwood` ตัวหนังสือ `ironwood`
- **Focus:** วงแหวน `pine` มองเห็นชัดทั้งสองโหมด — ห้ามถอด outline โดยไม่ใส่ของแทน
- **ข้อความบนปุ่มคือการกระทำตรงตัว** ("เลือกแปลงจากผัง") ไม่ใช่คำเชิญชวน

### Chips (สถานะแปลง)
- **Style:** pill เตี้ย Anuphan 500 13px มี label ข้อความเสมอ
- **ว่าง:** ตัวอักษร `#2E6B4E` พื้น `#E5EFE9` · **จอง:** `marigold` · **ขายแล้ว:** `#6E6A63` พื้น `#ECEAE6`

### Cards / Containers
- **Corner:** 12px · **Background:** `paper` บนพื้น `plaster` · **Border:** 1px `concrete` · **Shadow:** ไม่มี
- **ใช้เมื่อเป็น object จริงเท่านั้น** — แบบบ้านหนึ่งใบ แปลงหนึ่งแถว
  ห้ามห่อทุก section เป็นการ์ด ห้ามการ์ดซ้อนการ์ด

### Inputs / Fields
- **Style:** พื้น `concrete` ขอบ 1px `concrete` มุม 6px Anuphan 400
- **Focus:** ขอบและวงแหวนเปลี่ยนเป็น `pine`
- **Error:** ข้อความบอกวิธีแก้ ไม่ขอโทษ ไม่สื่อด้วยสีแดงอย่างเดียว

### Dimension Line (signature component)
เส้น + หัวลูกศรสองข้าง + ตัวเลขระยะ สี `pine` — เป็น component จริงที่รับค่าระยะจาก geometry
ใช้ได้เฉพาะหน้าแปลน หน้าผัง และหน้าสเปก **ห้ามใช้เป็นลายตกแต่ง**

### Motion
ทั้งเว็บมีโมเมนต์ที่เคลื่อนไหวเองแค่หนึ่ง: diorama บน hero หมุน 8°/นาที หยุดทันทีที่ผู้ใช้แตะ
ที่เหลือเคลื่อนไหวเฉพาะตอบการกระทำ — สลับ 2D↔3D crossfade 0.25s · เปิด panel slide 0.2s · สถานะเปลี่ยน lerp สี
scrub ตามการเลื่อนได้เฉพาะฉากเปิดหน้าแรก แถบเวลาเดินทาง และลำดับภาพหน้าแกลเลอรี (อ่านได้ครบตั้งแต่ต้น เลื่อนย้อนก็ย้อน)
คลิปเดินดูเล่นเองได้หนึ่งจุด ปิดเสียง มีปุ่มหยุด · ตัวดูภาพเต็มจอ เปิด/ปิด/เลื่อนภาพ 0.3s
เคารพ `prefers-reduced-motion` ทุกจุด รวมถึงหยุดการหมุนของ diorama

## Do's and Don'ts

### Do:
- **Do** ใช้สีจากตาราง §1 เท่านั้น — ทุก hex ที่ไม่ได้อยู่ในนั้นคือบั๊ก
- **Do** แยกชั้นด้วยขอบ `concrete` หรือพื้นต่างระดับ
- **Do** ใส่ `tabular-nums` กับตัวเลขทุกชุดที่เรียงเป็นคอลัมน์
- **Do** ให้สถานะมี label ข้อความคู่กับสีเสมอ
- **Do** เขียน copy ด้วยเสียงเจ้าของโครงการ ประโยคสั้น ตัวเลขจริงแทนคำคุณศัพท์ (DESIGN-SPEC §6)
- **Do** ปิดทุก stage ด้วยการไล่ Slop Ban List §7 ทีละหมวด

### Don't:
- **Don't** ใช้ `box-shadow` กับ UI ทุกจุด
- **Don't** ใช้ gradient ทุกชนิด, glow, radial halo, spotlight หลัง content, gradient text
- **Don't** ใช้สีครีม/เบจ — `plaster` เป็นขาวอมเขียว ไม่ใช่ขาวอมเหลือง
- **Don't** ใส่ scroll-reveal ทุก section, hover ยกการ์ด, รูปขยายตอน hover, pulsing dot, marquee, bounce easing
- **Don't** ใส่ grid-line ตกแต่งพื้นหลัง, glassmorphism, border accent บนมุมโค้ง, เลข section ตัวจิ๋ว
- **Don't** ใช้ radius นอก 12/6, ขนาดฟอนต์นอก scale, หรือฟอนต์นอก Bai Jamjuree/Anuphan
- **Don't** ใช้ dimension line / สเกลบาร์ / ทิศเหนือ เป็นของตกแต่งนอกหน้าแปลนและผัง
- **Don't** เขียนคำโฆษณาลอย ("เหนือระดับ", "ทำเลศักยภาพ", "ตอบโจทย์ทุกไลฟ์สไตล์") หรือ em-dash พร่ำเพรื่อ
