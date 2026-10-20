import type { Dictionary, StatusCounts } from "./th";

/* 简体中文 UI 文案 — 与 th.ts 同一组 key（缺 key 即类型错误）
   语气按 DESIGN-SPEC §6：项目主人带你看房。句子短，用真实数字，不用销售形容词。数字都来自 data，不在此手写。
   品牌 The Grove、项目名、户型名（Bai Bua、Rom Mai、Lom Yen）、泰国地名保持拉丁拼写 */

/** "3.20" 百万 → "320" 万 · 预算区间 "6" → "600" · 非数字原样返回 */
function wan(m: string) {
  const n = Number(m);
  if (m.trim() === "" || Number.isNaN(n)) return m;
  return String(Number((n * 100).toFixed(2)));
}

/** "卧室2、厨房和主卧" — 房间名来自 data 的短标签，原样使用 */
function joinRoomsZh(names: readonly string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join("、")}和${names[names.length - 1]}`;
}

/** "可售2块，状态待确认18块，已售4块" — 只列出有地块的状态 */
function countsZh(c: StatusCounts) {
  return (
    [
      [c.available, "可售"],
      [c.unconfirmed, "状态待确认"],
      [c.reserved, "已预订"],
      [c.sold, "已售"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, w]) => `${w}${n}块`)
    .join("，");
}

export const zh: Dictionary = {
  languageName: "中文",
  dateLocale: "zh-CN",

  common: {
    skipToContent: "跳到主要内容",
    close: "关闭",
    pending: "待开发商提供",
    noAvailable: "已售罄",
    samplePlan: "示例平面图，待开发商提供实际图纸",
    samplePlanNote:
      "平面图、3D模型和漫游模式中的房间及房间尺寸是示例平面，并非实际房屋。使用面积、卧室、卫生间、土地和价格是开发商公布的数据。",
    sampleSite: "示例总平面图，待实际规划图",
    sampleSiteNote:
      "图中的地块位置还不是实际位置。每块地的大小按开发商公布的对应户型土地面积确定，各地块状态待开发商确认。",
    developerSays: "开发商的描述",
    unspecified: "未注明",
    openPlan: "打开总平面图",
    seeAllTypes: (n) => `查看全部${n}种户型`,
    backHome: "返回首页",
    newTab: "（在新标签页中打开）",
    plot: (n) => `${n}号地块`,
    floor: (n) => `${n}层`,
    registerPlot: "登记此地块",
    seeType: (name) => `查看 ${name} 户型`,
    labels: {
      area: "使用面积",
      price: "价格",
      house: "户型",
      land: "土地",
      storeys: "楼层",
      beds: "卧室",
      baths: "卫生间",
      parking: "停车位",
    },
    parkingValue: (n) => `${n}个`,
    kindValue: (kind, storeys) =>
      `${storeys === 1 ? "单层" : storeys === 2 ? "两层" : `${storeys}层`}${kind === "twin" ? "双拼住宅" : "独栋住宅"}`,
  },

  nav: {
    label: "主菜单",
    houseTypes: "户型",
    masterPlan: "总平面图",
    gallery: "图库",
    location: "位置",
    register: "登记",
    language: "语言",
  },

  units: {
    sqm: "平方米",
    sqw: "平方哇",
    m: "米",
    metres: "米",
    km: "公里",
  },

  status: {
    available: "可售",
    unconfirmed: "状态待确认",
    reserved: "已预订",
    sold: "已售",
  },
  statusShort: {
    available: "可售",
    unconfirmed: "待确认",
    reserved: "已预订",
    sold: "已售",
  },

  format: {
    priceFrom: (m) => `${wan(m)}万泰铢起*`,
    priceExact: (b) => `${b}泰铢`,
    priceFromExact: (b) => `${b}泰铢起*`,
    priceNote:
      "*起价以开发商公布为准。目前还没有逐块地的价格。价格和条款可能变动，签约前请与销售团队确认。",
    plotPriceNote: "价格和条款可能变动，签约前请与销售团队确认。",
    sqwNote: "泰国土地以平方哇计：1平方哇 = 4平方米。",
    sqmText: (n) => `${n}平方米`,
    millionBaht: (m) => `${wan(m)}万泰铢`,
    budget: (lo, hi) => `${wan(lo)}–${wan(hi)}万泰铢`,
    compass8: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"],
    facing: (compass, deg) => `朝${compass}（${deg}°）`,
    siting: {
      noonFront: "正午阳光照在地块正面",
      noonBack: "正午阳光在地块后方",
      nextTo: (amenity) => `紧邻${amenity}`,
      roadEnd: (side) => `道路尽头的地块，${side}侧没有相邻房屋`,
      roadStart: (side) => `道路起点的第一块地，${side}侧没有相邻房屋`,
      awayFrom: (amenity, distance) => `距${amenity}${distance}`,
    },
    sitingNote:
      "朝向指临路的一面。阳光采用与3D模型相同的太阳轨迹，不计相邻房屋、树木的遮挡和季节变化。距离在总平面图上测量。",
  },

  lead: {
    channel: { phone: "电话", line: "LINE" },
    time: {
      morning: "上午，中午之前",
      afternoon: "下午，中午至17:00",
      evening: "17:00以后",
      any: "任何时间",
    },
    timePhrase: {
      morning: "上午",
      afternoon: "下午",
      evening: "17:00以后",
      any: "",
    },
  },

  meta: {
    siteTitle: (name, units, types) => `${name} · ${units}套住宅，${types}种户型`,
    siteDescription: (f) =>
      `${f.projects}个项目${f.place ? `（位于${f.place}）` : ""}共${f.units}套住宅、${f.types}种户型，开发商公布的使用面积为${f.areaLow}至${f.areaHigh}平方米。看房前可先了解每个项目的户型、总平面图和位置。`,
    place: (district, province) => `${district}, ${province}`,
    ogImageAlt: (project, brand, plots) =>
      `${brand} 的 ${project}：中央道路两侧共${plots}块地，取自示例总平面图上的3D模型`,
    houseImageAlt: (name) => `${name} 户型，取自项目的3D模型`,
    houseListing: (house, project) => `${house} 户型 · ${project}`,
    notFound: "页面未找到",
  },

  notFound: {
    title: "此页面不存在",
  },

  error: {
    title: "此页面未能加载",
    lead: "请重试。如果仍无法加载，请刷新页面，或回到首页重新开始。",
    retry: "重试",
  },

  loading: {
    gallery: "正在打开图库",
    masterPlan: "正在打开总平面图",
    location: "正在打开位置页面",
    houseType: "正在打开户型",
  },

  footer: {
    tagline: "树荫下的家",
    developer: "开发商",
    address: "公司地址",
    contactTitle: "联系销售团队",
    phone: "电话",
    email: "电子邮箱",
    lineOa: "LINE OA",
    facebook: "Facebook",
    salesHours: "售楼处开放时间",
    legalTitle: "项目文件",
    licence: "土地分配许可证",
    deeds: "土地产权证",
    commonFee: "物业费",
    commonFeeValue: (b) => `每月每平方哇${b}泰铢`,
    disclaimer:
      "起价、使用面积和房间数以开发商公布为准。价格和条款可能变动。本网站上的户型平面图和总平面图仍为示例。房屋和社区的图片是3D模型的渲染图。标有“开发商提供的图片”的是品牌氛围图，并非项目中的户型。",
    policiesNav: "政策与条款",
    privacy: "隐私政策",
    terms: "条款与价格",
    demoNote: "后台和登记表目前仍是演示系统。您填写的内容只保存在您自己的浏览器中。",
    tryAdmin: "试用后台（仅泰语）",
  },

  doc: {
    draftTitle: "草稿，待律师审核",
    draftBefore: "本文按网站的实际运作撰写，但项目律师尚未审核。中文版译自泰文草稿。标为",
    draftAfter: "的内容，是我们尚无文件证明的信息。",
    version: "版本",
    effective: "生效日期",
  },

  home: {
    promise: ["先在屏幕上逐个房间看清这栋房子，", "再来实地看房。"],
    brandFacts: (f) => [
      `${f.projects}个项目${f.place ? `（位于${f.place}）` : ""}共${f.units}套住宅、${f.types}种户型，`,
      `使用面积${f.areaLow}–${f.areaHigh}平方米。`,
    ],
    seeProjects: "查看项目",
    heroModel: (house, project) => `模型：${project} 的 ${house}`,
    skipToProjects: "跳到项目",
    heroCue: (rooms, house, project) =>
      `向下滚动，逐个房间拆开来看：${project} 的 ${house}（${rooms}个房间）`,
    headline: (types, plots, place) => `${place}，${types}种户型，${plots}块地`,
    lead: "预约看房前，先在屏幕上走遍每个房间，再挑选想要的地块。",
    facts: {
      available: "可售地块",
      availableValue: (a, total) => `${a}块（共${total}块）`,
      price: "可售地块价格",
      area: "使用面积",
      areaValue: (lo, hi) => `${lo}–${hi}平方米`,
      land: "土地面积",
      landValue: (lo, hi) => `${lo}–${hi}平方哇`,
    },
    compareTitle: { lead: (n) => `${n}种户型`, tail: "有何不同" },
    compareLead:
      "面积、房间、土地和起价以开发商公布为准。图中的首层按同一比例绘制，为示例平面，待开发商提供实际图纸。",
    whereTitle: "位置",
    whereLead: (place, mins) => `${place} · 最近的地点约${mins}分钟`,
    seeLocation: "查看完整位置信息",
    sunTitle: "阳光从哪边照进来",
    sunLead: (name) =>
      `${name} 平面图上全天的太阳方位。计算方式与户型页面的3D模型相同，在那里可以每半小时逐步查看。`,
    sunCta: "在3D模型中移动太阳",
    walkTitle: "在房子里走一走",
    walkLead: "每个户型页面都可以全屏、以视线高度走进房子。电脑上用方向键，手机上用屏幕摇杆。",
    walkFacts: {
      rooms: "每个房间",
      roomsValue: (n, name) => `${name} 示例平面中的${n}个房间`,
      floors: "楼层",
      floorsMulti: (n) => `${n}层，可选择要走的楼层`,
      floorsSingle: "单层，可走遍整栋房子",
      light: "光线",
      lightValue: "可调时间，06:00–18:00",
      eye: "视线高度",
      eyeValue: "1.60米，真人的高度",
    },
    walkCta: "进去走走",
    voicesTitle: "住户的声音",
    voicesLead: "项目仍在销售，还没有人入住。以下是我们打算询问的问题，等有人入住后会公布答案。",
    nextTitle: { lead: "接下来", tail: "怎么做" },
    nextLead: "四个步骤。在看到实物之前，您无需支付任何费用。",
    steps: [
      {
        title: "在总平面图上选地块",
        detail: "立即查看该地块的土地面积、户型和价格。",
      },
      {
        title: "在房子里走一走",
        detail: "预约看房前，以视线高度走进该地块的户型。",
      },
      {
        title: "登记",
        detail: "留下电话号码。销售团队会回电告知该地块的价格和条款。",
      },
      {
        title: "实地看房",
        detail: "亲自查看土地和样板房，再做决定。",
      },
    ],
    pickTitle: "选择您的地块",
    pickLead: (c) =>
      `总平面图仍为示例，各地块状态待开发商确认。目前：${countsZh(c)}。登记后，销售团队会确认哪些地块仍开放。`,
    registerCta: "登记获取详情",
  },

  voices: {
    planned: [
      {
        who: "项目的第一位买家",
        ask: "为什么选那块地？决定之前看了哪些方面？",
      },
      {
        who: "入住满一个雨季的家庭",
        ask: "阳光、风、中央道路的噪音、暴雨时的积水，是否和预想的一样？",
      },
      {
        who: "住在单层住宅的年长住户",
        ask: "真的可以一整天不上下楼梯吗？",
      },
    ],
    waiting: "等待住户",
  },

  fit: {
    planLabel: (name, w, d) => `${name} 首层平面图，宽${w}米，深${d}米`,
    size: "房屋规模",
    sizeValue: (storeys, beds, baths) => `${storeys}层 · ${beds}卧 · ${baths}卫`,
  },

  houseCard: {
    bedsBaths: "卧室 / 卫生间",
    cta: (name) => `查看 ${name} 平面图`,
  },

  daylight: {
    notes: { 8: "早晨阳光", 12: "正午阳光", 17: "傍晚阳光" },
    compass4: ["北", "东", "南", "西"],
    rooms: joinRoomsZh,
    hits: (note, rooms) => `${note}：${rooms}`,
    side: (side) => `（${side}侧）`,
    none: (note) => `${note}：首层没有朝向阳光的窗户`,
    figureLabel: (name, times) => `${name} 首层平面图，标出${times}的太阳方位`,
    caption: (name) => `${name} 首层 · 圆圈中的数字是时间，箭头从太阳指向房子`,
  },

  intro: {
    loading: "正在准备房屋模型",
    progress: "房屋模型加载进度",
    skip: "跳过",
  },

  hero: {
    region: "项目中一栋房子的模型",
    views: { label: "模型视角", house: "整栋房子", rooms: "逐个房间" },
    failureWebgl: (name) =>
      `此浏览器无法打开3D模型。这张图片取自同一模型。${name} 的逐间平面图在其户型页面上。`,
    failureLoad: "3D模型未能加载，可能是网络连接中断。这张图片取自同一模型。",
    retry: "重新加载模型",
    stillAlt: (name) => `${name} 房屋的等轴测视图，取自项目3D模型的静态图`,
    canvasLabel: (name) => `${name} 房屋的等轴测模型。向下滚动，房间会逐个落位，直到组成整栋房子。`,
    zones: { living: "起居区", sleep: "卧室区", bath: "卫生间" },
    whole: "整栋房子",
    wholeFacts: (area, beds, baths) =>
      `使用面积 ${area} 平方米，${beds} 间卧室，${baths} 间卫生间，以开发商公布为准`,
  },

  board: {
    title: "还剩哪些地块",
    lead: (plots, road) =>
      `示例总平面图：${plots}块地分两排，位于${road}米宽的中央道路两侧。每块地的大小按开发商公布的对应户型土地面积确定。地块位置待实际规划图。`,
    hint: (c) => `点击地块查看户型和价格 · ${countsZh(c)}`,
    viewOnPlan: "在总平面图上查看此地块",
  },

  houseTypes: {
    title: "户型",
    lead: (n) =>
      `${n}种户型。使用面积、房间、土地和起价以开发商公布为准。逐间平面图和3D模型仍为示例平面。`,
    metaDescription: (list, n) => `${n}种户型：${list}。数据以开发商公布为准。`,
    metaItem: (name, area) => `${name}，${area}平方米`,
    availability: (c, total) => `示例总平面图，共${total}块地：${countsZh(c)}。`,
    areaNote: "使用面积以开发商公布为准。",
  },

  house: {
    metaTitle: (name) => `${name} 户型`,
    metaDescription: (highlight) =>
      `${highlight} 数据以开发商公布为准。本页的平面图和3D模型为示例平面，待开发商提供实际图纸。`,
    roomsTitle: "全部房间",
    roomsTitleSample: "示例平面中的房间",
    th: { floor: "楼层", room: "房间", size: "宽 × 深", area: "面积" },
    outdoor: " · 室外",
    dims: (w, d) => `${w} × ${d}米`,
    total: "所有楼层合计",
    totalSample: "示例平面所有楼层合计",
    measureNote: "尺寸量至墙体中线，实际室内可用面积略小。",
    measureNoteSample: (area) =>
      `本表中的房间尺寸属于示例平面，并非实际房屋。开发商公布的使用面积为${area}平方米。`,
    plotsTitle: "采用此户型的地块",
    plotsCount: (n, name, open) =>
      `示例总平面图中有${n}块 ${name} 户型的地块。${open > 0 ? `其中${open}块可以登记意向。各地块状态待开发商确认。` : "开发商表示此户型已售罄。"}`,
    pickFromPlan: "在总平面图上选地块",
    registerType: "登记此户型",
  },

  room: {
    emptyTitle: "未选择房间",
    emptyBody: "点击平面图上的房间，或用 Tab 键移到房间再按 Enter，即可查看尺寸和详情。",
    area: "面积",
    size: "宽 × 深",
    outdoor: "此房间位于房屋外部",
  },

  planViewer: {
    modes: { "2d": "2D平面图", "3d": "等轴测", walk: "漫游" },
    viewGroup: "选择视图",
    autoRotate: (on) => `自动旋转：${on ? "开" : "关"}`,
    floorGroup: "选择楼层",
    sunLabel: "阳光时间",
    sunSlider: "一天中的时间，用于移动太阳",
    isoLabel: (name, floor) => `${name} 房屋${floor}层的等轴测模型。拖动可旋转。`,
    help: "拖动旋转 · 左右方向键每次旋转45度 · 双指捏合或滚动缩放 · 点击房间即可选中 · 漫游模式下电脑用 WASD，手机用摇杆",
    stillAlt: (name, floor) => `${name}，${floor}层，3D模型静态图`,
    fallbackWebgl: "此浏览器无法打开3D模型。这张图片取自同一模型。2D平面图中有每个房间的尺寸。",
    fallbackLoad: "3D模型未能加载，可能是网络连接中断。这张图片取自同一模型。",
    retry: "再次加载",
    see2d: "查看2D平面图",
  },

  masterPlan: {
    title: "总平面图",
    lead: (plots, rai, road) =>
      `示例总平面图：项目${rai}莱土地上共${plots}块地，中央道路宽${road}米。地块大小按开发商公布的各户型土地面积确定。地块位置和各地块状态待开发商确认。`,
    metaDescription: (plots, rai) =>
      `示例总平面图：${rai}莱土地上共${plots}块地。点击地块可查看土地面积、起价和户型。地块位置待开发商提供实际规划图。`,
    plotMeta: {
      status: (n, status) => `${n}号地块，${status}`,
      house: (name, storeys, beds, baths) =>
        `${name} 户型，${storeys}层，${beds}间卧室，${baths}间卫生间`,
      land: (sqw) => `土地${sqw}`,
      title: (n, name) => `${n}号地块，${name} 户型`,
      description: (facts) => `${facts}。打开链接可查看它在总平面图上的位置、价格和户型平面图。`,
    },
    modes: { "2d": "2D平面图", "3d": "3D" },
    view: "视图",
    viewGroup: "选择视图",
    filter: "筛选",
    filterGroup: "按状态筛选地块",
    all: "全部",
    failed3d: "3D社区未能加载，可能是网络连接中断。下方的2D平面图包含相同的地块信息。",
    retry3d: "重新加载3D",
    slow: "网络较慢……可先使用2D平面图",
    loading: "正在加载3D社区……",
    see2d: "查看2D平面图",
    lawnLegend: "3D社区中地块边缘的颜色",
    hint: "点击地块查看户型和价格 · 2D平面图、3D视图和列表共用同一筛选条件和所选地块",
    collapse: "收起",
    expand: "查看全部详情",
    villageLabel: "整个项目的3D视图",
  },

  plotList: {
    caption: (n) => `${n}块地 · 点击地块编号可在总平面图上查看`,
    plot: "地块",
    typeLand: "户型 · 土地",
    siting: "朝向与位置",
    price: "价格（泰铢）",
    priceStatus: " · 状态",
    status: "状态",
    landLine: (sqw, frontage) => `土地${sqw} · 面宽${frontage}米`,
    noRoad: "不临路",
  },

  plotPanel: {
    copy: "复制此地块的链接",
    copied: (n) => `已复制${n}号地块的链接，可以粘贴到 LINE 聊天中。`,
    manual: "此浏览器无法自动复制。链接在下方的框中，请选中后复制。",
    linkLabel: (n) => `${n}号地块的链接`,
    emptyTitle: "未选择地块",
    emptyBody: "点击总平面图或列表中的地块，查看其户型、面积和价格。",
    facing: (f) => `正面${f}`,
    noRoad: "此地块不临路",
    frontageDepth: "面宽 × 进深",
    dims: (w, d) => `${w} × ${d}米`,
    fromEntry: "距项目入口",
    fromEntryValue: (m) => `沿道路${m}`,
    sold: "此地块已售。",
    reserved: "此地块已被预订。",
    unconfirmed: "此地块的状态待开发商确认。您可以先登记，销售团队回电时会确认。",
    siblingsSame: "同户型仍开放的地块如下。",
    siblingsOther: "总平面图上其他户型仍有开放的地块。",
    otherAvailable: (name) => `其他仍开放的 ${name} 地块`,
  },

  location: {
    title: "位置",
    metaDescription: (place, pending) =>
      `${place}。${pending ? "项目的确切位置仍待确认。" : ""}本页提供坐标、进入方式以及开发商描述的周边地点，并附 Google Maps 链接。`,
    lead: (name) => `${name} 的位置，依据开发商公布的坐标。打开地图即可从您所在的地方获取路线。`,
    sectionTitle: "各地距离",
    sectionLead: "行程时间因时段而异。",
    coords: "坐标",
    directionsTitle: "如何进入",
    directionsLead: "依据开发商的描述",
    landmarksTitle: "附近",
    landmarksLead:
      "地点名称来自开发商房源信息中的位置图。我们还没有核实过的距离或行程时间，因此不列出数字。",
    openMap: "在 Google Maps 中打开",
    pendingNote: "项目的确切位置仍待确认",
    approxPin: "地图标记为大致位置",
  },

  travel: {
    approx: "约",
    minutes: (n) => `${n}分钟`,
    caption: "行程时间单位为分钟，距离单位为公里，从项目中心起算 · 均为近似值",
  },

  register: {
    metaTitle: "登记",
    ogTitle: (name) => `登记获取详情 · ${name}`,
    metaDescription: (projects) =>
      `留下电话号码，销售团队会通过电话或 LINE 联系您，告知您感兴趣的户型或地块的价格和条款。可从${projects}个项目中选择。`,
    title: "登记获取详情",
    lead: (phone) =>
      `留下电话号码，销售团队会按您选择的方式，通过电话或 LINE 联系您，告知您感兴趣地块的价格和条款。也可以直接致电${phone}。`,
    preparing: "正在准备表单……",
  },

  form: {
    landValue: (n) => `${n}平方哇`,
    areaValue: (n) => `${n}平方米`,
    priceValue: (b) => `${b}泰铢*`,
    fromValue: (m) => `${wan(m)}万泰铢起*`,
    priceNote: "* 价格以网站显示日期为准，可能变动。",
    priceTerms: "查看价格条款",
    selPlotBefore: "您正在登记",
    selHouse: (name) => `您感兴趣的是 ${name}`,
    selPlotLine: (house, price, land) =>
      `${house ? `${house} · ` : ""}${price} · 土地${land}平方哇`,
    selHouseLine: (m, n) => `${wan(m)}万泰铢起* · ${n}块开放`,
    selNone: "开发商表示此户型已售罄。您仍可提交表单，如有地块空出，销售团队会通知您。",
    notFound: (id) => `未找到地块“${id}”`,
    unusable: "此地块已无法登记。请从表单列表中选择其他开放的地块，或打开总平面图查看相邻地块。",
    unknown: "此链接与项目中的任何地块都不匹配。请从表单列表中选择一个开放的地块。",
    emptyTitle: "未选择地块",
    emptyBody: "您可以直接提交此表单，也可以先从列表中选择地块，方便销售团队为您准备该地块的价格。",
    houseLegend: "您感兴趣的房子",
    houseLabel: "户型",
    optional: "（可不选）",
    optionalText: "（选填）",
    houseNone: "还不确定，请销售团队推荐",
    availableN: (n) => `${n}块开放`,
    plotLabel: "地块",
    plotCount: (n, house) => `（${house ? `${house} 户型有` : "有"}${n}块开放）`,
    plotNone: "暂不选择，请销售团队推荐",
    plotGroup: (name) => name,
    plotOption: (n, name, m, from) => `${n} · ${name} · ${wan(m)}万泰铢${from ? "起" : ""}`,
    budgetLabel: "预算",
    budgetNone: "还不确定",
    contactLegend: "我们该如何联系您？",
    name: "姓名",
    phone: "电话号码",
    channel: "联系方式",
    lineIdHint: "（选填，销售团队会尝试用电话号码查找您）",
    time: "方便的时间",
    email: "电子邮箱",
    message: "还有其他想问的吗？",
    consentLegend: "个人数据同意",
    ackBefore: "我已阅读并了解",
    ackLink: "隐私政策",
    ackAfter: "。",
    ackNote: "销售团队仅将这些信息用于回复您的询问。",
    marketing: "向我发送项目消息和优惠信息",
    marketingHint: "（选填，可随时退订）",
    sending: "正在发送……",
    submit: "发送给销售团队",
    failed: (phone) => `未能发送。您填写的内容都还在。请再按一次发送，或致电${phone}。`,
    errorCount: (n) => `暂时无法发送：上方有${n}个栏目需要修改。`,
    errors: {
      name: "请填写姓名，至少2个字符。",
      phone: "请填写泰国电话号码：以0开头的9–10位数字，不要加空格。",
      email: "电子邮箱地址需要包含 @ 和域名。",
      lineId: "LINE ID 超过40个字符。请检查是否一并粘贴了其他内容。",
      message: "留言超过500个字符。",
      privacyAck: "请勾选此框，确认您已阅读隐私政策后再发送。",
    },
    talkNow: "想直接沟通？",
    phoneShort: "电话",
    line: "LINE",
    facebook: "Facebook",
    salesHours: "售楼处开放时间",
    done: {
      title: (name) => `谢谢您，${name}。我们已收到您的信息。`,
      duplicate: (plot) => `此号码已${plot ? `为${plot}号地块` : ""}登记过，无需重复发送。`,
      next: (viaLine, when, what) =>
        `销售团队会${when ? `在${when}` : ""}${viaLine ? "通过 LINE 联系您" : "致电您"}，告知${what}的价格和条款。如果想参观项目，可以和他们约个时间。`,
      whatThisPlot: "此地块",
      whatPlot: (n) => `${n}号地块`,
      whatAny: "您感兴趣的地块",
      notBooking: "登记不等于预订。只有与销售团队签订预订协议后，地块才归您所有。",
      phone: "您的号码",
      channel: "联系方式",
      time: "方便的时间",
      plot: "地块",
      budget: "预算",
      marketing: "项目消息",
      yes: "是",
      no: "否",
      replyWithin: "销售团队回复时限",
      callBefore: "如果没有人联系您，请致电",
      callAfter: "。",
      chatAlso: "也可以在这里给我们留言：",
      demo: "此演示仅将您的信息保存在您自己的设备上，不会发送到任何地方。",
      seeType: (name) => `查看 ${name} 户型`,
    },
  },

  scene: {
    planLabel: (name, w, d) => `${name} 房屋平面图，宽${w}米，深${d}米`,
    sitePlanLabel: (n, w, d) => `总平面图，${n}块地，宽${w}米，深${d}米`,
    entry: "入口",
    front: "正面",
    north: "北",
    walk: {
      rooms: (floor) => `${floor}层的房间`,
      here: (name) => `当前位置：${name}`,
      hide: "隐藏",
      all: "全部房间",
      joystick: "行走摇杆",
      exit: "退出漫游模式",
      desktopHint: "点击开始 · WASD 或方向键行走 · 鼠标环视 · Esc 退出",
      touchHint: "拖动屏幕环视四周",
    },
  },

  privacy: {
    metaTitle: "隐私政策",
    metaDescription: (name) =>
      `${name} 从登记表收集哪些信息、用于什么、保存多久，以及您如何查看、更正或删除这些信息。`,
    title: { lead: "隐私", tail: "政策" },
    lead: "本页说明我们从登记表收集哪些信息、用于什么、保存多久，以及您如何要求查看、更正或删除。",
    controller: {
      title: "谁负责管理您的数据",
      body: (name) =>
        `数据控制者是开发 ${name} 的公司。如有疑问，或想行使下列任何权利，请直接联系我们的数据保护官（DPO）。`,
      company: "公司名称",
      address: "地址",
      dpoEmail: "DPO 电子邮箱",
      dpoPhone: "DPO 电话",
    },
    collected: {
      title: "我们收集什么",
      intro: "仅限您在登记表中填写的内容。",
      items: [
        "您的姓名和电话号码",
        "您的电子邮箱和 LINE ID（如有填写）",
        "您感兴趣的户型、地块和预算范围（如有选择）",
        "您希望我们联系您的方式和时间",
        "您写给销售团队的留言",
        "您按下发送的时间、您确认的本政策版本，以及您是否希望接收项目消息，作为我们已告知您的记录",
      ],
      note: "表单不会询问您的身份证号码、收入或任何敏感数据。本网站没有广告 Cookie，也不做使用追踪。",
    },
    purpose: {
      title: "用于什么",
      items: [
        {
          what: "回复您、发送您所询问地块的价格和条款、安排实地看房",
          basis: "法律依据：应您的要求在签订合同前采取的步骤，无需另行征得同意。",
        },
        {
          what: "记录您确认了本政策的哪个版本及确认时间",
          basis: "法律依据：正当利益，以便我们能证明已告知您。",
        },
        {
          what: "发送项目消息和优惠信息",
          basis: "法律依据：同意。仅发送给勾选了消息选项的人，该选项默认不勾选。",
        },
      ],
      note: "不勾选消息选项也可以提交表单，销售团队仍会就您的询问回复您。",
    },
    retention: {
      title: "保存多久",
      row: "登记信息",
      withdraw: "您可以随时撤回接收项目消息的同意，通过任何渠道告知销售团队或 DPO 即可。",
      demo: "在此演示中，您填写的内容只保存在您自己的浏览器中，不会发送到服务器。在浏览器中清除本网站的数据即可全部删除。",
    },
    recipients: {
      title: "谁能看到",
      body: "项目销售团队会看到这些信息，以便联系您。我们不出售或出租联系人名单。",
      processors: "代我们处理数据的服务提供商",
      crossBorder: "在泰国境外传输或存储",
    },
    rights: {
      title: "您的权利",
      items: [
        "查看并获取您的数据副本",
        "更正错误或不完整的数据",
        "删除您的数据，或暂停使用",
        "反对我们使用您的数据，包括要求停止发送消息",
        "以可转交他人的格式获取您的数据",
        "撤回您已给予的同意",
      ],
      body: "请通过第一部分中的 DPO 电子邮箱或电话联系。如果您认为我们使用您数据的方式与此处所述不同，可以向泰国个人数据保护委员会办公室投诉。",
    },
    changes: {
      title: "本政策变更时",
      body: "修改内容时，上方的版本号会随之更改。登记表会记录您确认的版本，因此我们知道谁还没有看到新版本。",
      termsBefore: "关于本网站上价格、面积和图片的说明，请参阅",
      termsLink: "条款与价格",
      termsAfter: "。",
    },
  },

  terms: {
    metaTitle: "条款与价格",
    metaDescription: (name) =>
      `${name} 网站上价格、地块状态、面积、图片和距离的局限，以及哪些文件真正具有约束力。`,
    title: "条款与价格",
    lead: "本网站上的数字帮助您在看房前选择地块和户型。具有约束力的是报价单和合同。本页说明每类数字的局限。",
    price: {
      title: "价格",
      body: "标有星号（*）的价格为网站显示日期的价格，可能变动。实际适用的价格、折扣和条款以报价单和买卖协议为准。",
      range: (lo, hi) =>
        `目前还没有逐块地的价格。地块编号旁和每张户型卡片上的价格，是开发商公布的该户型起价，目前为${wan(lo)}万至${wan(hi)}万泰铢。具体地块的实际价格可能更高。`,
      includes: "价格包含和不包含的内容",
      commonFee: "物业费",
    },
    status: {
      title: "地块状态",
      updates:
        "可售、已预订和已售由销售团队更新，可能略有滞后。做决定前，请致电销售团队核实。“状态待确认”表示开发商尚未提供该地块的状态，并不代表可售。开发商表示某户型已售罄时，该户型的所有地块都显示为已售。",
      notBooking: "在网站上登记不等于预订。只有与销售团队签订预订协议后，地块才归您所有。",
    },
    area: {
      title: "面积与尺寸",
      body: "各户型的使用面积、卧室、卫生间和停车位是开发商公布的数据。2D平面图、3D模型和漫游模式目前显示的是示例平面，因此其中的房间尺寸和尺寸标注并非实际房屋的数据。我们正在等待开发商提供图纸。",
      land: "各户型的土地面积（平方哇）来自开发商的房源信息。本网站上的总平面图为示例。最终数字以测量后的土地产权证为准。",
    },
    images: {
      title: "本网站上的图片",
      renders:
        "房屋和社区的图片是本网站3D模型的渲染图。目前还没有实际项目的照片。家具、树木和光线用于展示比例和氛围。",
      samples:
        "标有“开发商提供的图片”的图片（首页和图库中）来自开发商自己的广告。它们是品牌氛围图：图中的房子并非项目中的户型，我们也不知道它们是照片还是渲染图。",
    },
    location: {
      title: "位置与距离",
      body: "项目坐标以开发商公布为准。进入方式和周边地点是开发商自己的描述。实际行程时间取决于交通状况和时段。",
    },
    documents: {
      title: "项目文件",
      body: "与每页底部的信息相同。尚无文件证明的内容标为“待开发商提供”。",
      developer: "开发商",
      address: "公司地址",
      licence: "土地分配许可证",
      deeds: "土地产权证",
      privacyBefore: "关于您在表单中填写的个人数据，请参阅",
      privacyLink: "隐私政策",
      privacyAfter: "。",
    },
    demo: "后台和登记表目前仍是演示系统。您填写的内容只保存在您自己的浏览器中。",
  },
};
