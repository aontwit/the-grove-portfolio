import type { Dictionary, StatusCounts } from "./th";

/* English UI copy — same keys as th.ts (a missing key is a type error)
   Voice per DESIGN-SPEC §6: the owner walking you through the house. Short sentences, real numbers,
   no sales adjectives. Every number comes from data, never typed here.
   House names are proper nouns (Bai Bua, Rom Mai, Lom Yen) — data/*.json carries the romanisation */

/** "Bed 2 and Main bed" — room names from data are short plan labels, kept as written */
function joinRoomsEn(names: readonly string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "2 available, 18 status to be confirmed, 4 sold" — only statuses that have plots */
function countsEn(c: StatusCounts) {
  return (
    [
      [c.available, "available"],
      [c.unconfirmed, "status to be confirmed"],
      [c.reserved, "reserved"],
      [c.sold, "sold"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, w]) => `${n} ${w}`)
    .join(", ");
}

export const en: Dictionary = {
  languageName: "English",
  dateLocale: "en-GB",

  common: {
    skipToContent: "Skip to content",
    close: "Close",
    pending: "Awaiting confirmed details",
    noAvailable: "Sold out",
    samplePlan: "Sample layout, awaiting the developer's plans",
    samplePlanNote:
      "The rooms and room sizes in the plan, the 3D model and walk mode are a sample layout, not the real house. The floor area, bedrooms, bathrooms, land and price are the developer's published figures.",
    sampleSite: "Sample site plan, awaiting the real one",
    sampleSiteNote:
      "Plot positions on this plan are not the real ones yet. Each plot is sized to the land of its house type as published by the developer, and plot-by-plot status is waiting for the developer to confirm.",
    developerSays: "Developer's description",
    unspecified: "Not specified",
    openPlan: "Open the site plan",
    seeAllTypes: (n) => `See all ${n} house types`,
    backHome: "Back to the home page",
    newTab: " (opens in a new tab)",
    plot: (n) => `Plot ${n}`,
    floor: (n) => `Floor ${n}`,
    registerPlot: "Register for this plot",
    seeType: (name) => `See the ${name} house`,
    labels: {
      area: "Floor area",
      price: "Price",
      house: "House type",
      land: "Land",
      storeys: "Floors",
      beds: "Bedrooms",
      baths: "Bathrooms",
      parking: "Parking",
    },
    parkingValue: (n) => `${n} ${n === 1 ? "car" : "cars"}`,
    kindValue: (kind, storeys) =>
      `${storeys === 1 ? "Single-storey" : storeys === 2 ? "Two-storey" : `${storeys}-storey`} ${kind === "twin" ? "semi-detached" : "detached"} house`,
  },

  nav: {
    label: "Main menu",
    houseTypes: "Houses",
    masterPlan: "Site plan",
    gallery: "Gallery",
    location: "Location",
    register: "Register",
    language: "Language",
  },

  units: {
    sqm: "sq. m",
    sqw: "sq. wa",
    m: "m",
    metres: "metres",
    km: "km",
  },

  status: {
    available: "Available",
    unconfirmed: "Status to be confirmed",
    reserved: "Reserved",
    sold: "Sold",
  },
  statusShort: {
    available: "Available",
    unconfirmed: "To confirm",
    reserved: "Reserved",
    sold: "Sold",
  },

  format: {
    priceFrom: (m) => `From THB ${m} million*`,
    priceExact: (b) => `THB ${b}`,
    priceFromExact: (b) => `From THB ${b}*`,
    priceNote:
      "*Starting prices as published by the developer. There are no plot-by-plot prices yet. Prices and terms can change. Confirm them with the sales team before you sign.",
    plotPriceNote: "Prices and terms can change. Confirm them with the sales team before you sign.",
    sqwNote: "Land in Thailand is measured in square wa: 1 sq. wa = 4 sq. m.",
    sqmText: (n) => `${n} sq. m`,
    millionBaht: (m) => `THB ${m} million`,
    budget: (lo, hi) => `THB ${lo}–${hi} million`,
    compass8: [
      "north",
      "north-east",
      "east",
      "south-east",
      "south",
      "south-west",
      "west",
      "north-west",
    ],
    facing: (compass, deg) => `Faces ${compass} (${deg}°)`,
    siting: {
      noonFront: "Midday sun on the front of the plot",
      noonBack: "Midday sun at the back of the plot",
      nextTo: (amenity) => `Next to the ${amenity.toLowerCase()}`,
      roadEnd: (side) => `End of the road, no neighbour on the ${side} side`,
      roadStart: (side) => `First plot on the road, no neighbour on the ${side} side`,
      awayFrom: (amenity, distance) => `${distance} from the ${amenity.toLowerCase()}`,
    },
    sitingNote:
      "Direction is the side that faces the road. Sun uses the same sun path as the 3D model and ignores shade from neighbouring houses, trees and the seasons. Distances are measured on the site plan.",
  },

  lead: {
    channel: { phone: "Phone call", line: "LINE" },
    time: {
      morning: "Morning, before noon",
      afternoon: "Afternoon, noon–17:00",
      evening: "After 17:00",
      any: "Any time",
    },
    timePhrase: {
      morning: "in the morning",
      afternoon: "in the afternoon",
      evening: "after 17:00",
      any: "",
    },
  },

  meta: {
    siteTitle: (name, units, types) => `${name} · ${units} houses, ${types} house types`,
    siteDescription: (f) =>
      `${f.units} houses in ${f.types} house types across ${f.projects} projects${f.place ? ` in ${f.place}` : ""}, with floor areas of ${f.areaLow} to ${f.areaHigh} sq. m as published by the developer. See each project's house types, site plan and location before you visit.`,
    place: (district, province) => `${district}, ${province}`,
    ogImageAlt: (project, brand, plots) =>
      `${project} by ${brand}: ${plots} plots on both sides of a central road, from the 3D model on a sample site plan`,
    houseImageAlt: (name) => `The ${name} house type, from the project's 3D model`,
    houseListing: (house, project) => `${house} house type · ${project}`,
    notFound: "Page not found",
  },

  notFound: {
    title: "This page doesn't exist",
  },

  error: {
    title: "This page didn't load",
    lead: "Try again. If it still doesn't load, refresh the page or start again from the home page.",
    retry: "Try again",
  },

  loading: {
    gallery: "Opening the gallery",
    masterPlan: "Opening the site plan",
    location: "Opening the location page",
    houseType: "Opening the house type",
  },

  footer: {
    tagline: "Home, under the trees",
    developer: "Developer",
    address: "Company address",
    contactTitle: "Contact the sales team",
    phone: "Phone",
    email: "Email",
    lineOa: "LINE OA",
    facebook: "Facebook",
    salesHours: "Sales office hours",
    legalTitle: "Project documents",
    licence: "Land allocation licence",
    deeds: "Title deeds",
    commonFee: "Common fee",
    commonFeeValue: (b) => `THB ${b} per sq. wa per month`,
    disclaimer:
      "Starting prices, floor areas and room counts are as published by the developer. Prices and terms can change. The house plans and site plans on this website are still samples. Pictures of the houses and the village are renders of the 3D model. Pictures labelled “Images from the developer” are brand mood pictures, not the projects' house types.",
    policiesNav: "Policies and terms",
    privacy: "Privacy policy",
    terms: "Terms and prices",
    demoNote:
      "The admin panel and the registration form are still a demo system. What you enter is kept in your own browser only.",
    tryAdmin: "Try the admin panel (Thai only)",
  },

  doc: {
    draftTitle: "Draft, awaiting legal review",
    draftBefore:
      "This text describes what the website actually does, but the project's lawyer has not reviewed it yet. The English version is a translation of the Thai draft. Anything marked ",
    draftAfter: " is information we don't yet have documents for.",
    version: "Version",
    effective: "In effect from",
  },

  home: {
    promise: [
      "Look through the house room by room on this screen first,",
      "then come and see the real one.",
    ],
    brandFacts: (f) => [
      `${f.units} houses in ${f.types} house types across ${f.projects} projects${f.place ? ` in ${f.place}` : ""},`,
      `with ${f.areaLow}–${f.areaHigh} sq. m of floor area.`,
    ],
    seeProjects: "See the projects",
    heroModel: (house, project) => `Model: ${house} at ${project}`,
    skipToProjects: "Skip to the projects",
    heroCue: (rooms, house, project) =>
      `Scroll to take ${house} at ${project} apart, room by room (${rooms} rooms)`,
    headline: (types, plots, place) => `${types} house types, ${plots} plots in ${place}`,
    lead: "Walk through every room on screen before you book a visit, then pick the plot you want.",
    facts: {
      available: "Plots available",
      availableValue: (a, total) => `${a} of ${total}`,
      price: "Price, available plots",
      area: "Floor area",
      areaValue: (lo, hi) => `${lo}–${hi} sq. m`,
      land: "Land size",
      landValue: (lo, hi) => `${lo}–${hi} sq. wa`,
    },
    compareTitle: { lead: (n) => `How the ${n} types`, tail: "differ" },
    compareLead:
      "Size, rooms, land and starting price as published by the developer. The ground floors shown are a sample layout drawn at the same scale, awaiting the developer's plans.",
    whereTitle: "Where it is",
    whereLead: (place, mins) => `${place} · the nearest place is about ${mins} minutes away`,
    seeLocation: "See the full location",
    sunTitle: "Where the sun comes in",
    sunLead: (name) =>
      `The sun's direction through the day on the ${name} plan. It uses the same calculation as the 3D model on the house page, where you can step through the day half an hour at a time.`,
    sunCta: "Move the sun in the 3D model",
    walkTitle: "Walk through the house",
    walkLead:
      "On each house page you can walk through at eye level, full screen. Use the arrow keys on a computer or the on-screen joystick on a phone.",
    walkFacts: {
      rooms: "Every room",
      roomsValue: (n, name) => `${n} rooms in the ${name} sample layout`,
      floors: "Floors",
      floorsMulti: (n) => `${n} floors, choose which to walk`,
      floorsSingle: "Single storey, walk the whole house",
      light: "Light",
      lightValue: "Set the time, 06:00–18:00",
      eye: "Eye height",
      eyeValue: "1.60 m, a real person's",
    },
    walkCta: "Walk through",
    voicesTitle: "From people who live here",
    voicesLead:
      "We are still selling and nobody has moved in yet. These are the questions we plan to ask, and we will publish the answers once people live here.",
    nextTitle: { lead: "What happens", tail: "next" },
    nextLead: "Four steps. You pay nothing before you have seen the real thing.",
    steps: [
      {
        title: "Pick a plot on the plan",
        detail: "See the land size, house type and price of that plot straight away.",
      },
      {
        title: "Walk through the house",
        detail: "Walk through that plot's house type at eye level before you book a visit.",
      },
      {
        title: "Register",
        detail:
          "Leave your number. The sales team calls back with the price and terms for that plot.",
      },
      {
        title: "Visit the site",
        detail: "See the land and the show house in person, then decide.",
      },
    ],
    pickTitle: "Choose your plot",
    pickLead: (c) =>
      `The site plan is still a sample and plot-by-plot status is waiting for the developer to confirm. Right now: ${countsEn(c)}. Register and the sales team will confirm which plots are still open.`,
    registerCta: "Register for details",
  },

  voices: {
    planned: [
      {
        who: "The first buyer in the project",
        ask: "Why that plot, and what did they look at before deciding?",
      },
      {
        who: "A family one rainy season after moving in",
        ask: "Sun, wind, noise from the central road and water in heavy rain: is it what they expected?",
      },
      {
        who: "An older resident in a single-storey house",
        ask: "Can they really get through the whole day without using the stairs?",
      },
    ],
    waiting: "Waiting for residents",
  },

  fit: {
    planLabel: (name, w, d) =>
      `Ground floor plan of ${name}, ${w} metres wide and ${d} metres deep`,
    size: "House size",
    sizeValue: (storeys, beds, baths) =>
      `${storeys} ${storeys === 1 ? "floor" : "floors"} · ${beds} bed · ${baths} bath`,
  },

  houseCard: {
    bedsBaths: "Bedrooms / bathrooms",
    cta: (name) => `See the ${name} plan`,
  },

  daylight: {
    notes: { 8: "Morning sun", 12: "Midday sun", 17: "Evening sun" },
    compass4: ["north", "east", "south", "west"],
    rooms: joinRoomsEn,
    hits: (note, rooms) => `${note}: ${rooms}`,
    side: (side) => `(${side} side)`,
    none: (note) => `${note}: no ground-floor window faces the sun`,
    figureLabel: (name, times) =>
      `Ground floor plan of ${name} with the sun's direction at ${times}`,
    caption: (name) =>
      `Ground floor of ${name} · the number in each circle is the time, the arrow points from the sun towards the house`,
  },

  intro: {
    loading: "Preparing the house model",
    progress: "House model loading progress",
    skip: "Skip",
  },

  hero: {
    region: "Model of a house in the project",
    views: {
      label: "Model view",
      house: "Whole house",
      rooms: "Room by room",
    },
    failureWebgl: (name) =>
      `This browser can't open the 3D model. This picture is taken from the same model. The room-by-room plan of ${name} is on its house page.`,
    failureLoad:
      "The 3D model didn't load. The connection may have dropped. This picture is taken from the same model.",
    retry: "Load the model again",
    stillAlt: (name) => `Isometric view of the ${name} house, a still from the project's 3D model`,
    canvasLabel: (name) =>
      `Isometric model of the ${name} house. Scroll down and the rooms drop into place one by one until the whole house stands.`,
    zones: { living: "Living", sleep: "Bedrooms", bath: "Bathrooms" },
    whole: "The whole house",
    wholeFacts: (area, beds, baths) =>
      `${area} m² of floor area, ${beds} bedrooms, ${baths} bathrooms, as published by the developer`,
  },

  board: {
    title: "Which plots are left",
    lead: (plots, road) =>
      `A sample site plan: ${plots} plots in two rows either side of a ${road}-metre central road. Each plot is sized to the land of its house type as published by the developer. Plot positions are waiting for the real plan.`,
    hint: (c) => `Tap a plot to see its house type and price · ${countsEn(c)}`,
    viewOnPlan: "See this plot on the site plan",
  },

  houseTypes: {
    title: "House types",
    lead: (n) =>
      `${n} house types. Floor area, rooms, land and starting price are as published by the developer. The room-by-room plans and 3D models are still a sample layout.`,
    metaDescription: (list, n) =>
      `${n} house types: ${list}. Figures as published by the developer.`,
    metaItem: (name, area) => `${name}, ${area} sq. m`,
    availability: (c, total) => `Sample site plan, ${total} plots: ${countsEn(c)}.`,
    areaNote: "Floor areas as published by the developer.",
  },

  house: {
    metaTitle: (name) => `${name} house type`,
    metaDescription: (highlight) =>
      `${highlight} Figures as published by the developer. The plan and 3D model on this page are a sample layout, awaiting the developer's plans.`,
    roomsTitle: "All rooms",
    roomsTitleSample: "Rooms in the sample layout",
    th: { floor: "Floor", room: "Room", size: "Width × depth", area: "Area" },
    outdoor: " · outside the house",
    dims: (w, d) => `${w} × ${d} m`,
    total: "Total, all floors",
    totalSample: "Total, all floors of the sample layout",
    measureNote: "Measured to the centre of the walls. The usable inside area is slightly smaller.",
    measureNoteSample: (area) =>
      `The room sizes in this table belong to the sample layout, not the real house. The developer's published floor area is ${area} sq. m.`,
    plotsTitle: "Plots with this house",
    plotsCount: (n, name, open) =>
      `The sample site plan has ${n} ${name} plots.${open > 0 ? ` You can register interest in ${open} of them. Plot-by-plot status is waiting for the developer to confirm.` : " The developer lists this type as sold out."}`,
    pickFromPlan: "Pick a plot on the plan",
    registerType: "Register for this house type",
  },

  room: {
    emptyTitle: "No room selected",
    emptyBody:
      "Tap a room on the plan, or Tab to a room and press Enter, to see its size and details.",
    area: "Area",
    size: "Width × depth",
    outdoor: "This room is outside the house",
  },

  planViewer: {
    modes: { "2d": "2D plan", "3d": "Isometric", walk: "Walk through" },
    viewGroup: "Choose a view",
    autoRotate: (on) => `Auto-rotate ${on ? "on" : "off"}`,
    floorGroup: "Choose a floor",
    sunLabel: "Sun at",
    sunSlider: "Time of day, moves the sun",
    isoLabel: (name, floor) =>
      `Isometric model of the ${name} house, floor ${floor}. Drag to turn.`,
    help: "Drag to turn · left and right arrows turn 45 degrees · pinch or scroll to zoom · tap a room to select it · in walk mode use WASD on a computer and the joystick on a phone",
    stillAlt: (name, floor) => `${name}, floor ${floor}, a still from the 3D model`,
    fallbackWebgl:
      "This browser can't open the 3D model. This picture is taken from the same model. The 2D plan has every room size.",
    fallbackLoad:
      "The 3D model didn't load. The connection may have dropped. This picture is taken from the same model.",
    retry: "Try loading again",
    see2d: "See the 2D plan",
  },

  masterPlan: {
    title: "Site plan",
    lead: (plots, rai, road) =>
      `A sample site plan: ${plots} plots on the project's ${rai} rai, with a ${road}-metre central road. Plots are sized to the land of each house type as published by the developer. Plot positions and plot-by-plot status are waiting for the developer to confirm.`,
    metaDescription: (plots, rai) =>
      `A sample site plan of ${plots} plots on ${rai} rai. Tap a plot to see its land size, starting price and house type. Plot positions are waiting for the developer's real plan.`,
    plotMeta: {
      status: (n, status) => `Plot ${n}, ${status.toLowerCase()}`,
      house: (name, storeys, beds, baths) =>
        `${name} house type, ${storeys} ${storeys === 1 ? "floor" : "floors"}, ${beds} bedrooms, ${baths} bathrooms`,
      land: (sqw) => `land ${sqw}`,
      title: (n, name) => `Plot ${n}, ${name} house type`,
      description: (facts) =>
        `${facts}. Open the link to see where it is on the site plan, its price and the house plan.`,
    },
    modes: { "2d": "2D plan", "3d": "3D" },
    view: "View",
    viewGroup: "Choose a view",
    filter: "Filter",
    filterGroup: "Filter plots by status",
    all: "All",
    failed3d:
      "The 3D village didn't load. The connection may have dropped. The 2D plan below has the same plot information.",
    retry3d: "Load 3D again",
    slow: "Slow connection… use the 2D plan for now",
    loading: "Loading the 3D village…",
    see2d: "See the 2D plan",
    lawnLegend: "Plot edge colour in the 3D village",
    hint: "Tap a plot to see its house type and price · the filter and the selected plot are shared by the 2D plan, the 3D view and the list",
    collapse: "Show less",
    expand: "Show all details",
    villageLabel: "The whole project in 3D",
  },

  plotList: {
    caption: (n) => `${n} plots · tap a plot number to see it on the plan`,
    plot: "Plot",
    typeLand: "House type · land",
    siting: "Direction and position",
    price: "Price (THB)",
    priceStatus: " · status",
    status: "Status",
    landLine: (sqw, frontage) => `Land ${sqw} · frontage ${frontage} m`,
    noRoad: "Not on the road",
  },

  plotPanel: {
    copy: "Copy a link to this plot",
    copied: (n) => `Link to plot ${n} copied. Paste it into a LINE chat.`,
    manual:
      "This browser won't copy automatically. The link is in the box below, select it and copy it.",
    linkLabel: (n) => `Link to plot ${n}`,
    emptyTitle: "No plot selected",
    emptyBody: "Tap a plot on the plan or in the list to see its house type, size and price.",
    facing: (f) => `Front ${f.charAt(0).toLowerCase()}${f.slice(1)}`,
    noRoad: "This plot does not face the road",
    frontageDepth: "Frontage × depth",
    dims: (w, d) => `${w} × ${d} m`,
    fromEntry: "From the project entrance",
    fromEntryValue: (m) => `${m} along the road`,
    sold: "This plot is sold.",
    reserved: "This plot is reserved.",
    unconfirmed:
      "The status of this plot is waiting for the developer to confirm. You can register, and the sales team will confirm it when they call back.",
    siblingsSame: " These plots with the same house type are still open.",
    siblingsOther: " Other house types still have open plots on the plan.",
    otherAvailable: (name) => `Other open ${name} plots`,
  },

  location: {
    title: "Location",
    metaDescription: (place, pending) =>
      `${place}.${pending ? " The project's exact position is still to be confirmed." : ""} This page gives the coordinates, how to get in and nearby places as described by the developer, with a link to Google Maps.`,
    lead: (name) =>
      `Where ${name} is, from the coordinates the developer published. Open the map to get directions from wherever you are.`,
    sectionTitle: "How far things are",
    sectionLead: "Travel times depend on the time of day.",
    coords: "Coordinates",
    directionsTitle: "How to get in",
    directionsLead: "As described by the developer",
    landmarksTitle: "Nearby",
    landmarksLead:
      "Place names from the location map in the developer's listing. We don't have checked distances or travel times yet, so we leave the numbers out.",
    openMap: "Open in Google Maps",
    pendingNote: "The project's exact position is still to be confirmed",
    approxPin: "The map pin is an approximate point",
  },

  travel: {
    approx: "approx.",
    minutes: (n) => `${n} min`,
    caption:
      "Travel time in minutes, distance in kilometres, measured from the middle of the project · approximate values",
  },

  register: {
    metaTitle: "Register",
    ogTitle: (name) => `Register for details · ${name}`,
    metaDescription: (projects) =>
      `Leave your number and the sales team will contact you by phone or LINE with the price and terms of the house type or plot you're interested in. Choose from ${projects} projects.`,
    title: "Register for details",
    lead: (phone) =>
      `Leave your number and the sales team will contact you by phone or LINE, whichever you choose, with the price and terms of the plot you're interested in. Or call us on ${phone}.`,
    preparing: "Preparing the form…",
  },

  form: {
    landValue: (n) => `${n} sq. wa`,
    areaValue: (n) => `${n} sq. m`,
    priceValue: (b) => `THB ${b}*`,
    fromValue: (m) => `From THB ${m} million*`,
    priceNote: "* Price on the date shown on the website, subject to change.",
    priceTerms: "See price terms",
    selPlotBefore: "You are registering for ",
    selHouse: (name) => `You're interested in ${name}`,
    selPlotLine: (house, price, land) =>
      `${house ? `${house} · ` : ""}${price} · land ${land} sq. wa`,
    selHouseLine: (m, n) => `From THB ${m} million* · ${n} open`,
    selNone:
      "The developer lists this house type as sold out. You can still send the form and the sales team will tell you if a plot comes up.",
    notFound: (id) => `Plot “${id}” not found`,
    unusable:
      "This plot can no longer be registered. Choose another open plot from the list in the form, or open the site plan to see the plots next to it.",
    unknown:
      "This link doesn't match any plot in the project. Choose an open plot from the list in the form.",
    emptyTitle: "No plot selected",
    emptyBody:
      "You can send this form as it is, or choose a plot from the list first so the sales team can prepare its price for you.",
    houseLegend: "The house you're interested in",
    houseLabel: "House type",
    optional: "(optional)",
    optionalText: "(optional)",
    houseNone: "Not sure yet, let the sales team suggest one",
    availableN: (n) => `${n} open`,
    plotLabel: "Plot",
    plotCount: (n, house) => `(${n} open${house ? ` for ${house}` : ""})`,
    plotNone: "None yet, let the sales team suggest one",
    plotGroup: (name) => name,
    plotOption: (n, name, m, from) => `${n} · ${name} · ${from ? "from " : ""}THB ${m} million`,
    budgetLabel: "Budget",
    budgetNone: "Not sure yet",
    contactLegend: "How should we contact you?",
    name: "Full name",
    phone: "Phone number",
    channel: "Contact me by",
    lineIdHint: "(optional, the sales team will try to find you by phone number)",
    time: "Best time",
    email: "Email",
    message: "Anything else you'd like to ask?",
    consentLegend: "Consent for personal data",
    ackBefore: "I have read and understood the ",
    ackLink: "privacy policy",
    ackAfter: ".",
    ackNote: "The sales team uses this only to get back to you about what you asked.",
    marketing: "Send me project news and promotions",
    marketingHint: "(optional, unsubscribe any time)",
    sending: "Sending…",
    submit: "Send to the sales team",
    failed: (phone) =>
      `It didn't send. Everything you entered is still here. Press send again, or call ${phone}.`,
    errorCount: (n) =>
      `Can't send yet: ${n} ${n === 1 ? "field needs" : "fields need"} fixing above.`,
    errors: {
      name: "Enter your full name, at least 2 characters.",
      phone: "Enter a Thai phone number: 9–10 digits starting with 0, no spaces.",
      email: "An email address needs an @ and a domain name.",
      lineId: "LINE ID is longer than 40 characters. Check nothing else was pasted in with it.",
      message: "The message is longer than 500 characters.",
      privacyAck: "Tick this box to confirm you've read the privacy policy before sending.",
    },
    talkNow: "Prefer to talk now?",
    phoneShort: "Phone",
    line: "LINE",
    facebook: "Facebook",
    salesHours: "Sales office hours",
    done: {
      title: (name) => `Thank you, ${name}. We have your details.`,
      duplicate: (plot) =>
        `This number is already registered${plot ? ` for plot ${plot}` : ""}, no need to send it again. `,
      next: (viaLine, when, what) =>
        `The sales team will ${viaLine ? "message you on LINE" : "call you"}${when ? ` ${when}` : ""} with the price and terms ${what}. If you'd like to visit the project, arrange a day with them.`,
      whatThisPlot: "for this plot",
      whatPlot: (n) => `for plot ${n}`,
      whatAny: "for the plot you're interested in",
      notBooking:
        "Registering is not a reservation. The plot is yours only once you sign a reservation agreement with the sales team.",
      phone: "Your number",
      channel: "Contact by",
      time: "Best time",
      plot: "Plot",
      budget: "Budget",
      marketing: "Project news",
      yes: "Yes",
      no: "No",
      replyWithin: "The sales team replies within",
      callBefore: "If nobody has contacted you, call ",
      callAfter: ".",
      chatAlso: "Or message us on",
      demo: "This demo keeps your details on your own device only. Nothing is sent anywhere.",
      seeType: (name) => `See the ${name} house`,
    },
  },

  scene: {
    planLabel: (name, w, d) => `Plan of the ${name} house, ${w} metres wide and ${d} metres deep`,
    sitePlanLabel: (n, w, d) => `Site plan, ${n} plots, ${w} metres wide and ${d} metres deep`,
    entry: "Entry",
    front: "Front",
    north: "North",
    walk: {
      rooms: (floor) => `Rooms on floor ${floor}`,
      here: (name) => `Now in: ${name}`,
      hide: "Hide",
      all: "All rooms",
      joystick: "Joystick for walking",
      exit: "Leave walk mode",
      desktopHint: "Click to start · WASD or arrow keys to walk · mouse to look · Esc to leave",
      touchHint: "Drag the screen to look around",
    },
  },

  privacy: {
    metaTitle: "Privacy policy",
    metaDescription: (name) =>
      `What ${name} collects from the registration form, what it is used for, how long it is kept, and how you can see, correct or delete it.`,
    title: { lead: "Privacy", tail: "policy" },
    lead: "This page explains what we collect from the registration form, what we use it for, how long we keep it, and how you can ask to see, correct or delete it.",
    controller: {
      title: "Who looks after your data",
      body: (name) =>
        `The data controller is the company developing ${name}. If you have questions or want to use any of the rights below, contact our data protection officer (DPO) directly.`,
      company: "Company name",
      address: "Address",
      dpoEmail: "DPO email",
      dpoPhone: "DPO phone",
    },
    collected: {
      title: "What we collect",
      intro: "Only what you enter in the registration form.",
      items: [
        "Your full name and phone number",
        "Your email and LINE ID, if you enter them",
        "The house type, plot and budget range you're interested in, if you choose them",
        "How and when you'd like us to contact you",
        "Any message you write to the sales team",
        "When you pressed send, which version of this policy you acknowledged and whether you want project news, kept as a record that we informed you",
      ],
      note: "The form does not ask for your ID card number, income or any sensitive data. This website has no advertising cookies and no usage tracking.",
    },
    purpose: {
      title: "What we use it for",
      items: [
        {
          what: "Getting back to you, sending the price and terms of the plot you asked about, arranging a site visit",
          basis:
            "Legal basis: taking steps at your request before entering into a contract. No separate consent is needed.",
        },
        {
          what: "Keeping a record of which version of this policy you acknowledged, and when",
          basis: "Legal basis: legitimate interest, so we can show that we informed you.",
        },
        {
          what: "Sending project news and promotions",
          basis:
            "Legal basis: consent. Only to people who ticked the news box, which is not ticked in advance.",
        },
      ],
      note: "You can send the form without ticking the news box. The sales team still gets back to you about what you asked.",
    },
    retention: {
      title: "How long we keep it",
      row: "Registration details",
      withdraw:
        "You can withdraw consent to project news at any time. Tell the sales team or the DPO, by any channel.",
      demo: "In this demo, what you enter is kept only in your own browser. Nothing goes to a server. Clearing this site's data in your browser deletes it all.",
    },
    recipients: {
      title: "Who sees it",
      body: "The project's sales team sees it in order to contact you. We do not sell or rent our contact list.",
      processors: "Service providers who process data for us",
      crossBorder: "Transfer or storage outside Thailand",
    },
    rights: {
      title: "Your rights",
      items: [
        "See and get a copy of your data",
        "Correct data that is wrong or incomplete",
        "Have your data deleted, or its use paused",
        "Object to how we use it, including asking us to stop sending news",
        "Receive your data in a format you can pass on to someone else",
        "Withdraw consent you have given",
      ],
      body: "Contact the DPO by the email or phone number in the first section. If you think we are using your data differently from what is written here, you can complain to the Personal Data Protection Committee office.",
    },
    changes: {
      title: "When this policy changes",
      body: "When we change the text, the version number above changes. The registration form records which version you acknowledged, so we know who hasn't seen the new one.",
      termsBefore: "For how prices, areas and pictures on this website work, see the ",
      termsLink: "terms and prices",
      termsAfter: ".",
    },
  },

  terms: {
    metaTitle: "Terms and prices",
    metaDescription: (name) =>
      `The limits of the prices, plot status, areas, pictures and distances on the ${name} website, and which documents are actually binding.`,
    title: "Terms and prices",
    lead: "The numbers on this website help you choose a plot and a house type before you visit. What is binding is the quotation and the contract. This page explains the limits of each kind of number.",
    price: {
      title: "Prices",
      body: "Prices marked with an asterisk (*) are prices on the date shown on the website and can change. The price, discounts and terms that actually apply are the ones written in the quotation and the sale agreement.",
      range: (lo, hi) =>
        `There are no plot-by-plot prices yet. The price next to a plot number and on each house-type card is that type's starting price as published by the developer, currently THB ${lo} to ${hi} million. The real price of a given plot may be higher.`,
      includes: "What is and isn't included in the price",
      commonFee: "Common fee",
    },
    status: {
      title: "Plot status",
      updates:
        "Available, reserved and sold are updated by the sales team and may lag behind a little. Before you decide, call the sales team to check. “Status to be confirmed” means the developer has not given us the status of that plot yet. It does not mean available. When the developer lists a house type as sold out, every plot of that type shows as sold.",
      notBooking:
        "Registering on the website is not a reservation. A plot is yours only once you sign a reservation agreement with the sales team.",
    },
    area: {
      title: "Areas and sizes",
      body: "The floor area, bedrooms, bathrooms and parking of each house type are the developer's published figures. The 2D plan, 3D model and walk mode currently show a sample layout, so the room sizes and dimension lines in them are not those of the real house. We are waiting for the developer's plans.",
      land: "Land sizes (sq. wa) for each house type come from the developer's listing. The site plan on this website is a sample. The final figure is the one on the title deed after the survey.",
    },
    images: {
      title: "Pictures on this website",
      renders:
        "Pictures of the houses and the village are renders from this website's 3D model. There are no photos of the real project yet. Furniture, trees and lighting are there to show scale and atmosphere.",
      samples:
        "Pictures labelled “Images from the developer” (on the home page and in the gallery) come from the developer's own advertising. They are brand mood pictures: the house in them is not one of the projects' house types, and we do not know whether they are photos or renders.",
    },
    location: {
      title: "Location and distances",
      body: "Project coordinates are as published by the developer. How to get in and nearby places are the developer's own description. Real travel times depend on traffic and the time of day.",
    },
    documents: {
      title: "Project documents",
      body: "The same information as at the bottom of every page. Anything we don't yet have documents for is marked as awaiting confirmed details.",
      developer: "Developer",
      address: "Company address",
      licence: "Land allocation licence",
      deeds: "Title deeds",
      privacyBefore: "For the personal data you enter in the form, see the ",
      privacyLink: "privacy policy",
      privacyAfter: ".",
    },
    demo: "The admin panel and the registration form are still a demo system. What you enter is kept in your own browser only.",
  },
};
