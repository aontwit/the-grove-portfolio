# Benchmark: production-grade real-estate / housing-project websites (2023–2026)

Scope: patterns from award-recognised residential sites and Thai premium developers, to inform "The Grove" (18 plots, 3 house types, 2D/3D master plan, walkthrough, registration form). Research date: 2026-10-02. About 16 tool calls; some Thai developer sites (lh.co.th, scasset.com) render client-side and returned little content to the fetch tool. Those gaps are noted below.

## 1. Award-recognised residential sites: hero, storytelling, imagery, type, unit presentation, lead capture

### Takeaway
Recent award winners (Awwwards SOTD/SOTM 2025–2026) tell the story in a fixed order: one cinematic hero line, then three value propositions, then product tiers given as m² ranges, then place and amenities, then a calm enquiry step. What makes them feel "real" is sober operational detail: construction status, named developer/architect/sales agent, reply-time promise, display-suite address, and disclaimers.

### Cited Findings
- Awwwards' Real Estate category currently lists residential winners including **ERA Residence** (Developer Award + Site of the Month, Aug 2026, studio The First The Last, era-residence.com), **Sobha Privy Collection** (Developer Award + SOTD, 23 Sep 2026, Vide Infra), **LIKOVA** (Developer + SOTD, 19 Aug 2026, Vide Infra), plus **Loam House** (residences.loamhouse.com.au, FrontageDigital), **Quinta D. Amália** (DEMARCA) and **Mr. C Residences Boca Raton** — [Awwwards Real Estate](https://www.awwwards.com/websites/real-estate/)
- Search-result summaries name further 2025 SOTDs: **111 West 57th / "Above the Clouds"** (SOTD + Developer Award, 15 May 2025; full-bleed aerial photography above the cloud line; residences $7.75M–$66M) and **Silver Pinewood Residences** (SOTD, 9 Oct 2025). This comes from an aggregated search snippet and was not verified on the individual Awwwards pages — [Awwwards search results](https://www.awwwards.com/websites/real-estate/)
- **ERA Residence (Estepona, Spain):** full-screen hero with a **day/night toggle** of the gated community. The tagline is "A place to return to", with a "Scroll" cue and a CTA to apartment selection. Three value propositions follow ("Real-Life Location", "Built to stay", "Boutique concept") and a repeated motif, "Designed as a community, not a complex". — [era-residence.com](https://era-residence.com/)
- ERA's `/apartments` section groups units by type, each with bedroom count and m² range: "Ground + basement" (3 bed, 178–202 m²), "Ground floor" (2 bed, 97–104 m²), "Penthouse duplex" (2–3 bed, 124–243 m²). Floorplans are static. There is no embedded 3D. — [era-residence.com](https://era-residence.com/)
- ERA's lead capture is a "Book a call" modal with Name, Email, Phone, Message and a privacy-policy checkbox. The confirmation copy reads: "Our sales manager will review your message and respond personally. We typically reply within one business day." — [era-residence.com](https://era-residence.com/)
- ERA's trust content: a construction-status line ("Currently under construction. The first phase of construction is underway…"), credits for developer (Swiss Technology S.L.), sales & marketing (Unreal Estate Group) and architects (Schiemann Weyers / OCWA), a completion target of 2026, a phone number, a street address, and Privacy Policy + Terms of Use links. — [era-residence.com](https://era-residence.com/)
- **Loam House (Melbourne bayside):** sunset hero image with the line "House-sized. Bayside living." Six chapters follow: Proposition → Size → Storage → Finishes → Precinct → Place. Each chapter pairs a headline with an italic sub-line, e.g. "A rare final release" / "Leave the upkeep. *Keep the life.*" — [Loam House](https://residences.loamhouse.com.au/)
- Loam House shows three product tiers with internal m² ranges: Garden 112–156 m², Lifestyle 103–162 m², Penthouse 246.5–275 m². There are two separate CTA flows: a multi-step registration (name, email, phone, preferred contact method, enquiry type) and a short brochure-download form. The footer carries the display-suite address, developer attribution ("Final release by Auyin"), named sales agents with direct numbers, and privacy/disclaimer links. — [Loam House](https://residences.loamhouse.com.au/)

### Inferences
- The "award feel" comes from restraint (one tagline, large headings, minimal body copy) combined with operational specificity (status line, named people, reply SLA). Mocks usually have the first and lack the second.
- Product tiers are always presented as **ranges with units** (m², bed count), never adjectives. This fits The Grove's 3 house types: give usable area, plot-size range, bed/bath and price-from.
- A day/night or time-of-day toggle on the hero or model is an award-winning differentiator. The Grove's DaylightStudy component already points in this direction.
- Offering two CTA weights (a heavy "register/book a visit" and a light "download brochure / get price list") is a common conversion pattern.

### Gaps
- I did not open Sobha Privy, LIKOVA, 111 W 57th or Silver Pinewood pages directly, so their specific interactions are not described.
- No CSSDA/FWA/Webby real-estate winners were collected in this pass.
- Motion and typography details (font families, scroll choreography) were not extractable from text fetches.

## 2. Thai premium developer conventions (house types, availability, pricing, location, registration)

### Takeaway
Thai developer project pages follow a strict information template: "starting price X ล้านบาท*" with an asterisk, a spec block of approximate project/plot/house sizes, unit count, storeys and parking, house types each with per-floor plans, an icon-list of facilities, nearby places with distances in km/m, a gallery, and a registration form with budget plus LINE contact. Public interactive plot-availability maps are not standard on Thai developer sites, so The Grove's interactive plot picker would exceed local convention.

### Cited Findings
- **Sansiri, Setthasiri Kohkaew Retreat (Phuket):** price is shown as "12.59 Million baht*". The spec block reads Project Area "Approximately 54,400 Sq.m.", Plot Size "Approximately 224.8 – 505.2 Sq.m.", House Size "Approximately 204 – 323 Sq.m.", "2 Storeys", "110 Houses", Parking "2 – 3 Cars". — [Sansiri project page](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/)
- On the same page, four named house types (Glory, Victory, Mastery, Majesty) each show bed/bath counts, separate 1st- and 2nd-floor plans as clickable galleries, and amenity lists. Facilities are icon-labelled ("Salt-water swimming pool", "Sansiri Backyard", "Fitness", "Playground"). — [Sansiri project page](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/)
- The Sansiri page lists nearby places with distances: "British International School 800m", "Villa Market Laguna Phuket 3.9km", "Robinson Lifestyle Thalang 5.8km", "Phuket International Airport 25km". It has a static downloadable map plus a Google Maps embed. **No interactive master plan or plot status** is shown. — [Sansiri project page](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/)
- The Sansiri registration form asks for First Name, Last Name, Email, Phone, country/region, a **budget dropdown**, and a preferred messenger (LINE / WeChat / WhatsApp). The consent checkbox reads "I agree to receive newsletter from Sansiri". — [Sansiri project page](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/)
- Sansiri house-type sub-pages list the room programme exhaustively. Setthasiri Onnut-Srinakarindra's "Inzare" type: 284 sq.m, 4 bed, 4 bath, 1 living, 2 leisure rooms, dining, Thai kitchen, pantry, 2 parking, 1 maid's room with bathroom. — [Sansiri housetype page](https://www.sansiri.com/singlehouse/setthasiri_onnut_srinakarindra/en/housetype/housetype_04_inzare.aspx)
- **AP Thailand** project cards use the price wordings "เริ่มต้น 9.9 ล้านบาท" or a range "ราคา 13.9 - 25 ล้านบาท". Location is given as distance to a road or transit ("ใกล้ถ.สุขุมวิท 1.4 กม.", "BTS สนามบินน้ำ 1.4 กม."). Cards carry status labels ("โครงการใหม่") and a style label ("บ้านสไตล์โมเดิร์น"). Filters cover location, price/brand, status, and a "Display Map" toggle. The CTA "ดูข้อมูลโครงการ" sits next to a LINE icon. — [AP single-detached house listing](https://www.apthai.com/th/single-detached-house)
- **SC Asset** homepage offers AI search ("ค้นหาด้วย ai"), "ใกล้ฉัน" (near me) location search, and a "SC บ้านพร้อมอยู่" move-in-ready category. Campaign pages exist, e.g. `/th/property/campaign/venue-stylish-eco-living/`. — [SC Asset](https://www.scasset.com/th/)

### Inferences
- Thai buyers expect: price-from in ล้านบาท with an asterisk, "ประมาณ"/approx. on every area figure, area in ตร.ม. **and** land in ตร.ว. (land-size convention; not directly cited here), Thai kitchen / maid's room listed in the room programme, distance in km to named landmarks (BTS/MRT, expressway, schools, malls, hospitals), and a LINE contact option.
- The Grove's 18-plot picker with live status therefore over-delivers versus Sansiri and AP pages. It must still show the conventional spec block and "เริ่มต้น … ล้านบาท*" pricing, or it will feel foreign.
- A budget field in the registration form is standard in Thai lead forms.

### Gaps
- Land & Houses (lh.co.th) and SC Asset project pages render client-side, so the fetch returned no content. Their project-page section order, Ananda, Origin, Noble and Raimon Land were not verified.
- I found no source confirming whether any Thai developer publishes live plot status (แปลงว่าง/จองแล้ว) publicly. Treat this as unverified, not as absent.
- Sales-office hours and construction progress sections were not observed on the Sansiri page fetched ("New project coming soon").

## 3. Interactive master plan / plot picker best practices

### Takeaway
Vendor guidance converges on three core statuses (available / reserved / sold), a detail panel with price, plan and views, filters by bedroom count and budget, a shareable no-install URL that works on phones (WhatsApp/LINE link), and status fields kept editable after launch.

### Cited Findings
- An interactive masterplan has five components: a navigable 3D model, a **live inventory layer with unit status**, a per-unit layer (floor plans, finishes, views), a distribution layer (browser URL, sales gallery hardware), and an analytics layer. — [R2U 2026 guide](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Units display "which units are available, reserved, or sold, with price and floor plan". Inventory must sync with the CRM because manual updates "collapse on launch weekend". — [R2U](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Sales teams "filter down to the units that match the buyer's bedroom count and budget". Unit panels include floor plan, **sunlight simulation by time of day**, and real views. — [R2U](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Mobile and distribution: the plan is "a URL that works on any browser, on phone or tablet, with no app to install". Brokers send "the masterplan link via WhatsApp". The 3D viewer "loads in under 2 seconds". — [R2U](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Analytics captured: dwell time per unit, selections per session, and which units a buyer revisited from home. — [R2U](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Vendor claim (cites a Matterport study of 143,575 listings): homes with 3D tours "sell up to 31 percent faster and at 4 to 9 percent higher prices". This is a vendor marketing statistic; treat it with caution. — [R2U](https://r2u.io/en/blog/interactive-masterplan-real-estate-guide/)
- Plot-map build checklist: start with a clean layout and **a stable plot naming convention**; define fields editable after launch (status, price band, facing, notes, CTA owner); choose drone views that support the sale rather than "generic aerial glamour"; **design mobile first**. — [Search summary of realhorizons.ai / mapme / visengine articles](https://realhorizons.ai/blog/interactive-plot-maps-for-land-sales/)
- Interactive maps present each lot's availability, price, size and usage clearly. — [Mapme](https://mapme.com/blog/create-interactive-site-plans-for-real-estate-development-projects/)

### Inferences
- For The Grove, plot detail panels should include plot number, status, land size (ตร.ว.), house type, usable area, facing/orientation (important in Thailand for sun/heat), price-from, and CTA buttons ("นัดชมแปลงนี้" / "ลงทะเบียนรับราคา").
- Status should never be conveyed by colour alone (add a label/pattern for accessibility). A three-state model (ว่าง / จองแล้ว / ขายแล้ว) matches industry practice.
- Filters for 18 plots should be minimal (house type, status). A list view alongside the map aids mobile use; the repo already has `PlotList.tsx`.
- A deep link per plot (shareable URL) mirrors the "send via WhatsApp" pattern, which in Thailand means LINE.

### Gaps
- Spacesprinter, Zonda/Envisio and other unit-selector vendors were not fetched. I have no concrete colour conventions from them.
- No Baymard/NN/g research specific to real-estate listing pages or plot pickers was retrieved.

## 4. Trust content production sites include that mocks lack

### Takeaway
Real sites carry legal and operational ballast: developer identity, licence and title information, construction status and completion dates, "ภาพจำลอง"/approx. disclaimers on prices and areas, privacy/terms links, named contacts with addresses, and reply-time promises. Thai consumer-protection rules make several of these disclosures mandatory in property ads.

### Cited Findings
- Under Thai OCPB rules for condominium ads, the ad must state: the business operator's name and address (plus registered capital and manager if corporate), land location, **title deed number** ("เลขที่ของโฉนดที่ดิน"), land area with site plan, whether a construction permit has been obtained, intention to register as a condominium, **whether encumbrances exist** ("ไม่มีหรือมีภาระผูกพัน"), number of floors/units, residential vs office use, construction start/completion dates, and fees and taxes. — [home.co.th hometips](https://www.home.co.th/hometips/topic-24697)
- The OCPB advertising notice for land allocation requires ads to state the name and address of the allocator, the land-right holder and the business operator, plus other product details. — [Search summary of ocpb.go.th / vtlandlawoffice](https://www.ocpb.go.th/news_view.php?nid=9759)
- Land allocation (จัดสรรที่ดิน) is governed by พ.ร.บ.การจัดสรรที่ดิน พ.ศ. 2543. Allocated land must be in the applicant's name and free of encumbrances other than mortgage. — [ASA PDF of the Act](https://download.asa.or.th/03media/04law/lsa/lsa43-upd02.pdf); [bangkokbiznews on ใบอนุญาตจัดสรรที่ดิน](https://www.bangkokbiznews.com/blogs/columnist/124718)
- Award-level international sites show construction status, completion year, developer/architect/sales-agency credits, a physical sales address and phone, and privacy + terms links (ERA Residence). Loam House adds display-suite address, named agents and a disclaimer link. — [era-residence.com](https://era-residence.com/); [Loam House](https://residences.loamhouse.com.au/)
- Sansiri marks prices with an asterisk ("12.59 Million baht*") and prefixes all areas with "Approximately". — [Sansiri](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/)

### Inferences
- A mock The Grove footer or legal page should carry: developer company name and address, ใบอนุญาตจัดสรรที่ดิน number (marked as mock), title deed (โฉนด) number, total land area (ไร่-งาน-ตร.ว.), encumbrance statement, construction start/finish dates, common-area fee (ค่าส่วนกลาง) per ตร.ว./month, "ภาพทั้งหมดเป็นภาพจำลอง" image disclaimer, a "ราคาและเงื่อนไขอาจเปลี่ยนแปลง" price disclaimer, sales-office hours, phone, LINE OA, map, privacy policy and cookie notice.
- An FAQ (bank loan pre-approval, transfer fees, deposit/down payment schedule, warranty) and construction-progress updates are common trust builders. They were not directly verified in this pass, so treat them as recommendations.

### Gaps
- The exact OCPB notice text for land allocation (บ้านจัดสรร) could not be retrieved: the vtlandlawoffice page has an expired certificate, and the OCPB page was not fetched. The cited list above is the condominium version and needs verification for housing estates.
- No direct evidence was gathered on payment-terms tables or EIA disclosures on Thai housing-estate sites. EIA generally applies to larger allocations, but this was not verified.

## 5. Conversion: registration / lead form patterns, CTA placement, Thai PDPA

### Takeaway
Effective forms are short (name, phone, email, plus budget, house-type interest and preferred contact channel). They are reached from a persistent CTA and in-context CTAs (per house type and per plot), and confirm with a human reply-time promise. In Thailand, PDPA requires marketing consent as a separate, unticked, optional checkbox with a linked privacy notice, and consent records must be retained.

### Cited Findings
- ERA uses a "Book a call" modal with 4 fields + privacy checkbox + a reply-within-one-business-day confirmation. Its hero CTA goes straight to apartment selection. — [era-residence.com](https://era-residence.com/)
- Loam House runs a multi-step registration (contact method + enquiry type) and a separate brochure-download form. — [Loam House](https://residences.loamhouse.com.au/)
- Sansiri asks for budget and a messenger choice (LINE/WeChat/WhatsApp), with a separate opt-in "I agree to receive newsletter from Sansiri". AP places a LINE icon next to "ดูข้อมูลโครงการ" on every card. — [Sansiri](https://www.sansiri.com/singlehouse/setthasiri-kohkaew-retreat/en/); [AP](https://www.apthai.com/th/single-detached-house)
- PDPC consent and notice guidelines (published 7 Sep 2022) require consent before or at the time of collection, given by a **clear affirmative act**, **separate from other terms**, in clear plain language. The notice must cover purposes, legal basis, cross-border transfers and controller contact. A hyperlinked privacy policy is acceptable. — [Tilleke & Gibbins](https://www.tilleke.com/insights/thailand-issues-guidelines-on-pdpa-consent-and-notification-requirements/18/)
- Marketing consent must be kept separate and not bundled. Pre-ticked boxes are invalid. Declining marketing must not block the service. Keep dated records of what the person was told and accepted. Every marketing message needs a working opt-out. Fines go up to THB 5 million per violation. The PDPC published draft marketing guidance for consultation on 7 Jul 2026 (not yet binding). — [Lex Bangkok](https://lexbangkok.com/direct-marketing-thailand-pdpa/)
- Capture consent with timestamp, purpose and privacy-policy version at the time of submission. — [Search summary of DevProp PDPA guide](https://guide.devprop.io/en/docs/pdpa/)

### Inferences
- A recommended The Grove form: ชื่อ-นามสกุล, เบอร์โทร (required), อีเมล (optional), แบบบ้านที่สนใจ (pre-filled when opened from a plot/house panel), งบประมาณ (range), ช่องทางติดต่อกลับ (โทร/LINE), วันที่สะดวกเข้าชม (optional). Then two checkboxes: (1) a required acknowledgement of the privacy notice with a link, and (2) an **optional, unticked** consent to receive news/promotions. Success copy should name who will call and within what time.
- CTA placement: a sticky header CTA ("ลงทะเบียน" / "นัดชมโครงการ"), a CTA at the end of each house-type section, one in the plot panel, a footer form, and a mobile sticky bottom bar with call + LINE + register.

### Gaps
- No Baymard/NN/g quantitative data on optimal field count for real-estate lead forms was retrieved.
- Whether Thai developers pre-tick or bundle consent in practice was not systematically checked beyond Sansiri's separate newsletter opt-in.
