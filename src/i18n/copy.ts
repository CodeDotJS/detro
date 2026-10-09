export type Copy = {
  appName: string
  independent: string
  reviewNote: string
  language: string
  english: string
  hindi: string
  heading: string
  lede: string
  from: string
  to: string
  swap: string
  showRoute: string
  loadingRoute: string
  searching: string
  searchStation: string
  noResults: string
  searchError: string
  snapshotNote: (date: string) => string
  leastDistance: string
  fewestChanges: string
  routeOptions: string
  fareLabel: string
  stopsLabel: string
  changesLabel: string
  firstTrain: string
  lastTrain: string
  trainRun: (depart: string, arrive: string) => string
  arrivesAt: (time: string) => string
  scheduled: string
  serviceTimesNote: string
  stopCount: (count: number) => string
  towards: (name: string) => string
  changeFor: (line: string) => string
  snapshotJourney: string
  savedJourney: string
  noSnapshotRoute: string
  noChanges: string
  changeCount: (count: number) => string
  fareUnavailable: string
  fareUntyped: (amount: number) => string
  fareUntypedNote: string
  weekdayFare: string
  weekendFare: string
  timingUnavailable: string
  aboutMinutes: (minutes: number) => string
  durationNote: string
  retrieved: string
  goTo: (name: string) => string
  takeTowards: (line: string, towards: string) => string
  takeLine: (line: string) => string
  platform: (platform: string) => string
  travelStops: (count: number) => string
  changeAt: (name: string) => string
  getOff: (name: string) => string
  stationsOnTrain: string
  placedFrom: (name: string) => string
  placedTo: (name: string) => string
  placedRoute: (from: string, to: string) => string
  needBoth: string
  sameStation: string
  serviceError: string
  planError: string
  navLabel: string
  plan: string
  map: string
  help: string
  saved: string
  onlineStatus: string
  offlineStatus: string
  lineLabel: string
  findOnLine: string
  zoomIn: string
  zoomOut: string
  zoomReset: string
  startHere: string
  goHere: string
  stationDetails: string
  listedFacilities: string
  liftsHeading: string
  notLiveLift: string
  listedWorking: string
  listedNotWorking: string
  gates: string
  gatesMissing: string
  notVerified: string
  stepFree: string
  howToUse: string
  howStep1: string
  howStep2: string
  howStep3: string
  textSize: string
  textSmall: string
  textNormal: string
  textLarger: string
  theme: string
  themeName: { day: string; night: string; contrast: string }
  themeSwitch: (name: string) => string
  clearData: string
  cleared: string
  snapshotHelp: (date: string) => string
  sources: string
  noBrief: string
  savedTrips: string
  savedLead: string
  savedEmpty: string
  saveTrip: string
  removeTrip: string
  removeSaved: (label: string) => string
  mapLead: string
  mapOnRoute: string
  tripSaved: string
  shareRoute: string
  linkCopied: string
  viewOnMap: string
  clearRoute: string
  routeMap: string
  changeHere: string
  lineMap: string
  cityMap: string
  mapKind: string
  cityMapNote: (count: number) => string
  allLines: string
  cityGap: string
  close: string
  chooseOnMap: string
  routeDetails: string
  onRoute: string
  offlineHelp: (date: string) => string
  offlineRoute: string
  freshnessTitle: string
  networkSaved: (date: string) => string
  journeysSaved: (when: string) => string
  offlineLimit: string
}

export const copy = {
  en: {
    appName: "DETRO",
    independent: "An independent guide. Not an official DMRC app.",
    reviewNote: "Hindi wording in this app has not been reviewed by a fluent speaker.",
    language: "Language",
    english: "English",
    hindi: "हिन्दी",
    heading: "Where do you want to go?",
    lede: "Plan a Delhi Metro ride. See the train, where to change, and the fare.",
    from: "From",
    to: "To",
    swap: "Swap stations",
    showRoute: "Show my route",
    loadingRoute: "Looking up the route…",
    searching: "Searching stations…",
    searchStation: "Search station",
    noResults: "No stations match that name. Try another spelling.",
    searchError: "Station search did not answer. Try again.",
    snapshotNote: (date) =>
      `Stations and routes use a saved snapshot (${date}). This is not a live planner.`,
    leastDistance: "Least distance",
    fewestChanges: "Fewest changes",
    routeOptions: "Route options",
    fareLabel: "Fare",
    stopsLabel: "Stops",
    changesLabel: "Changes",
    firstTrain: "First train",
    lastTrain: "Last train",
    trainRun: (depart, arrive) => `Leaves ${depart}. Arrives ${arrive}.`,
    arrivesAt: (time) => `Arrives ${time}`,
    scheduled: "Scheduled",
    serviceTimesNote: "Schedule times from the saved snapshot, not a live departure.",
    stopCount: (count) => (count === 1 ? "1 stop" : `${count} stops`),
    towards: (name) => `Towards ${name}`,
    changeFor: (line) => `Change here for the ${line}`,
    snapshotJourney: "Calculated from the saved network snapshot. Not a live Delhi Metro journey.",
    savedJourney: "Saved Delhi Metro journey from the snapshot. Not a live arrival.",
    noSnapshotRoute: "These stations are not connected in the saved network.",
    noChanges: "No changes",
    changeCount: (count) => (count === 1 ? "1 change" : `${count} changes`),
    fareUnavailable: "Fare unavailable",
    fareUntyped: (amount) => `Fare: ₹${amount}`,
    fareUntypedNote: "This journey result did not include a fare type.",
    weekdayFare: "Weekday fare",
    weekendFare: "Weekend fare",
    timingUnavailable: "Timing unavailable",
    aboutMinutes: (minutes) => `About ${minutes} minutes`,
    durationNote: "This time is from the journey result. Waiting and walking can change it. It is not a live arrival.",
    retrieved: "Journey retrieved from Delhi Metro’s planner.",
    goTo: (name) => `Go to ${name}.`,
    takeTowards: (line, towards) => `Take the ${line} towards ${towards}.`,
    takeLine: (line) => `Take the ${line}.`,
    platform: (platform) => `Platform: ${platform}.`,
    travelStops: (count) => (count === 1 ? "Travel 1 stop." : `Travel ${count} stops.`),
    changeAt: (name) => `Change at ${name}.`,
    getOff: (name) => `Get off at ${name}.`,
    stationsOnTrain: "Stations on this train",
    placedFrom: (name) => `${name} is where you start. Now choose where you are going.`,
    placedTo: (name) => `${name} is where you are going. Now choose where you start.`,
    placedRoute: (from, to) => `From ${from} to ${to}.`,
    needBoth: "Choose a From station and a To station.",
    sameStation: "Choose two different stations.",
    serviceError: "The route service did not answer. Check your connection and try again.",
    planError: "Delhi Metro’s planner did not return a route for these stations.",
    navLabel: "Primary",
    plan: "Plan",
    map: "Map",
    help: "Help",
    saved: "Saved",
    onlineStatus: "Online",
    offlineStatus: "Offline",
    lineLabel: "Line",
    findOnLine: "Find a station on this line",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomReset: "Reset zoom",
    startHere: "Start here",
    goHere: "Go here",
    stationDetails: "Station details",
    listedFacilities: "Listed facilities",
    liftsHeading: "Lifts and escalators",
    notLiveLift: "A listed lift is not a live check that it is working now.",
    listedWorking: "Listed as working",
    listedNotWorking: "Listed as not working",
    gates: "Gates",
    gatesMissing: "This saved station record has no gate list, and it does not say where a gate comes out.",
    notVerified: "Not verified",
    stepFree: "Step-free route",
    howToUse: "How to use this app",
    howStep1: "Choose where you start and where you are going.",
    howStep2: "Read which train to take and where to change.",
    howStep3: "Open the map to look at a line or pick a station.",
    textSize: "Text size",
    textSmall: "Small text",
    textNormal: "Normal text",
    textLarger: "Larger text",
    theme: "Theme",
    themeName: { day: "Day", night: "Night", contrast: "Contrast" },
    themeSwitch: (name) => `Theme: ${name}. Switch theme.`,
    clearData: "Clear saved data on this device",
    cleared: "Saved text size, theme, trips, and Play passport were cleared.",
    snapshotHelp: (date) => `Station and line information was saved on ${date}.`,
    sources: "Data comes from the Delhi Metro website backend. This app is independent.",
    noBrief: "More detail for this station is not in the saved snapshot yet.",
    savedTrips: "Saved trips",
    savedLead: "Trips you save stay on this phone.",
    savedEmpty: "Save a trip from Plan after you have a route.",
    saveTrip: "Save trip",
    removeTrip: "Remove",
    removeSaved: (label) => `Remove ${label}`,
    mapLead: "Pick a line, then a station. You can start a trip there, or set it as where you are going.",
    mapOnRoute: "Filled stations are on the route you just planned. Pick one to start there or go there.",
    tripSaved: "Trip saved on this device.",
    shareRoute: "Share route",
    linkCopied: "Route link copied.",
    viewOnMap: "View on map",
    clearRoute: "Clear route",
    routeMap: "This ride",
    changeHere: "Change",
    lineMap: "Line",
    cityMap: "City",
    mapKind: "Map type",
    cityMapNote: (count) =>
      `${count} stations with a saved coordinate. OpenStreetMap. Not a live train map.`,
    allLines: "All lines",
    cityGap: "A dashed stretch means a station on this ride has no saved coordinate.",
    close: "Close",
    chooseOnMap: "Choose on the map",
    routeDetails: "Route details",
    onRoute: "On this route",
    offlineHelp: (date) => `Search, both maps, fares, saved journeys, and Play use the ${date} snapshot. They still work when the signal is cut.`,
    offlineRoute: "You are offline, and this pair was not in the saved journeys. The route is calculated from the station lists. Fare and timing are unavailable.",
    freshnessTitle: "Saved information",
    networkSaved: (date) => `Lines and stations were saved on ${date}.`,
    journeysSaved: (when) => `Downloaded journeys use the Delhi Metro planner result for ${when}, not a live departure.`,
    offlineLimit: "Offline, search, both maps, saved journeys, and all four games still work, including the fare, platform, and first and last train. A pair that was never saved is calculated from the station lists, and then the fare and timing stay unavailable.",
  },
  hi: {
    appName: "दिल्ली मेट्रो सरल",
    independent: "यह एक स्वतंत्र मार्गदर्शिका है। यह डीएमआरसी की आधिकारिक ऐप नहीं है।",
    reviewNote: "इस ऐप की हिन्दी अभी किसी भाषा-भाषी ने जाँची नहीं है।",
    language: "भाषा",
    english: "English",
    hindi: "हिन्दी",
    heading: "आप कहाँ जाना चाहते हैं?",
    lede: "दिल्ली मेट्रो की यात्रा प्लान करें। ट्रेन, बदलाव और किराया देखें।",
    from: "कहाँ से",
    to: "कहाँ तक",
    swap: "स्टेशन बदलें",
    showRoute: "रास्ता दिखाएँ",
    loadingRoute: "रास्ता देखा जा रहा है…",
    searching: "स्टेशन खोजे जा रहे हैं…",
    searchStation: "स्टेशन खोजें",
    noResults: "इस नाम का कोई स्टेशन नहीं मिला। दूसरी वर्तनी आज़माएँ।",
    searchError: "स्टेशन खोज का जवाब नहीं आया। फिर कोशिश करें।",
    snapshotNote: (date) =>
      `स्टेशन और रास्ते सेव की गई सूची (${date}) से हैं। यह लाइव प्लानर नहीं है।`,
    leastDistance: "सबसे कम दूरी",
    fewestChanges: "सबसे कम बदलाव",
    routeOptions: "रास्ते के विकल्प",
    fareLabel: "किराया",
    stopsLabel: "स्टॉप",
    changesLabel: "बदलाव",
    firstTrain: "पहली ट्रेन",
    lastTrain: "आखिरी ट्रेन",
    trainRun: (depart, arrive) => `${depart} पर चले। ${arrive} पर पहुँचे।`,
    arrivesAt: (time) => `${time} पर पहुँच`,
    scheduled: "निर्धारित",
    serviceTimesNote: "ये सेव की गई सूची के समय हैं, लाइव प्रस्थान नहीं।",
    stopCount: (count) => (count === 1 ? "1 स्टॉप" : `${count} स्टॉप`),
    towards: (name) => `${name} की ओर`,
    changeFor: (line) => `${line} के लिए यहाँ बदलें`,
    snapshotJourney: "यह रास्ता सेव किए गए नेटवर्क से गिना गया है। यह दिल्ली मेट्रो की लाइव यात्रा नहीं है।",
    savedJourney: "यह दिल्ली मेट्रो की सेव की गई यात्रा है। यह लाइव आगमन नहीं है।",
    noSnapshotRoute: "सेव किए गए नेटवर्क में ये स्टेशन जुड़े हुए नहीं हैं।",
    noChanges: "कोई बदलाव नहीं",
    changeCount: (count) => (count === 1 ? "1 बदलाव" : `${count} बदलाव`),
    fareUnavailable: "किराया उपलब्ध नहीं",
    fareUntyped: (amount) => `किराया: ₹${amount}`,
    fareUntypedNote: "इस यात्रा के नतीजे में किराये का प्रकार नहीं था।",
    weekdayFare: "कार्यदिवस का किराया",
    weekendFare: "सप्ताहांत का किराया",
    timingUnavailable: "समय उपलब्ध नहीं",
    aboutMinutes: (minutes) => `लगभग ${minutes} मिनट`,
    durationNote: "यह समय यात्रा के नतीजे से है। इंतज़ार और पैदल चलने से यह बदल सकता है। यह लाइव आगमन नहीं है।",
    retrieved: "यात्रा दिल्ली मेट्रो के प्लानर से ली गई है।",
    goTo: (name) => `${name} जाएँ।`,
    takeTowards: (line, towards) => `${line} पर ${towards} की ओर चलें।`,
    takeLine: (line) => `${line} लें।`,
    platform: (platform) => `प्लेटफॉर्म: ${platform}`,
    travelStops: (count) => (count === 1 ? "1 स्टॉप यात्रा करें।" : `${count} स्टॉप यात्रा करें।`),
    changeAt: (name) => `${name} पर बदलें।`,
    getOff: (name) => `${name} पर उतरें।`,
    stationsOnTrain: "इस ट्रेन के स्टेशन",
    placedFrom: (name) => `${name} आपकी शुरुआत है। अब मंज़िल चुनें।`,
    placedTo: (name) => `${name} आपकी मंज़िल है। अब शुरुआत चुनें।`,
    placedRoute: (from, to) => `${from} से ${to} तक।`,
    needBoth: "कहाँ से और कहाँ तक, दोनों स्टेशन चुनें।",
    sameStation: "दो अलग स्टेशन चुनें।",
    serviceError: "रास्ते की सेवा ने जवाब नहीं दिया। कनेक्शन जाँचकर फिर कोशिश करें।",
    planError: "दिल्ली मेट्रो के प्लानर ने इन स्टेशनों का रास्ता नहीं दिया।",
    navLabel: "मुख्य",
    plan: "योजना",
    map: "नक्शा",
    help: "सहायता",
    saved: "सेव",
    onlineStatus: "ऑनलाइन",
    offlineStatus: "ऑफ़लाइन",
    lineLabel: "लाइन",
    findOnLine: "इस लाइन पर स्टेशन खोजें",
    zoomIn: "बड़ा करें",
    zoomOut: "छोटा करें",
    zoomReset: "ज़ूम रीसेट",
    startHere: "यहाँ से शुरू",
    goHere: "यहाँ जाएँ",
    stationDetails: "स्टेशन विवरण",
    listedFacilities: "दी गई सुविधाएँ",
    liftsHeading: "लिफ्ट और एस्केलेटर",
    notLiveLift: "लिस्ट में लिफ्ट होना यह नहीं बताता कि वह अभी चल रही है।",
    listedWorking: "लिस्ट में चालू लिखा है",
    listedNotWorking: "लिस्ट में बंद लिखा है",
    gates: "गेट",
    gatesMissing: "इस सेव रिकॉर्ड में गेटों की सूची नहीं है, और यह नहीं बताता कि गेट बाहर कहाँ खुलता है।",
    notVerified: "जाँचा नहीं गया",
    stepFree: "बिना सीढ़ी का रास्ता",
    howToUse: "इस ऐप का उपयोग",
    howStep1: "शुरुआत और मंज़िल चुनें।",
    howStep2: "पढ़ें कि कौन सी ट्रेन लें और कहाँ बदलें।",
    howStep3: "नक्शा खोलकर लाइन देखें या स्टेशन चुनें।",
    textSize: "अक्षर का आकार",
    textSmall: "छोटे अक्षर",
    textNormal: "सामान्य अक्षर",
    textLarger: "बड़े अक्षर",
    theme: "थीम",
    themeName: { day: "दिन", night: "रात", contrast: "कंट्रास्ट" },
    themeSwitch: (name) => `थीम: ${name}। थीम बदलें।`,
    clearData: "इस डिवाइस का सेव डेटा मिटाएँ",
    cleared: "सेव की गई भाषा, अक्षर आकार, थीम और यात्राएँ मिट गईं।",
    snapshotHelp: (date) => `स्टेशन और लाइन की जानकारी ${date} को सेव की गई थी।`,
    sources: "डेटा दिल्ली मेट्रो वेबसाइट के बैकएंड से है। यह ऐप स्वतंत्र है।",
    noBrief: "इस स्टेशन का और विवरण सेव की गई सूची में अभी नहीं है।",
    savedTrips: "सेव यात्राएँ",
    savedLead: "सेव की गई यात्राएँ इस फ़ोन पर रहती हैं।",
    savedEmpty: "रास्ता दिखने के बाद योजना से यात्रा सेव करें।",
    saveTrip: "यात्रा सेव करें",
    removeTrip: "हटाएँ",
    removeSaved: (label) => `${label} हटाएँ`,
    mapLead: "एक लाइन चुनें, फिर एक स्टेशन। वहाँ से यात्रा शुरू करें, या उसे मंज़िल बनाएँ।",
    mapOnRoute: "भरे हुए स्टेशन अभी के रास्ते पर हैं। एक चुनकर वहाँ से शुरू करें या वहाँ जाएँ।",
    tripSaved: "यात्रा इस डिवाइस पर सेव हो गई।",
    shareRoute: "रास्ता साझा करें",
    linkCopied: "रास्ते की लिंक कॉपी हो गई।",
    viewOnMap: "नक्शे पर देखें",
    clearRoute: "रास्ता मिटाएँ",
    routeMap: "यह सवारी",
    changeHere: "बदलें",
    lineMap: "लाइन",
    cityMap: "शहर",
    mapKind: "नक्शे का प्रकार",
    cityMapNote: (count) =>
      `${count} स्टेशन, जहाँ सेव निर्देशांक कोड से मेल खाता है। OpenStreetMap। लाइव ट्रेन नक्शा नहीं।`,
    allLines: "सभी लाइनें",
    cityGap: "डैश का मतलब है कि इस सवारी के किसी स्टेशन का निर्देशांक सेव नहीं है।",
    close: "बंद करें",
    chooseOnMap: "नक्शे पर चुनें",
    routeDetails: "रास्ते का विवरण",
    onRoute: "इस रास्ते पर",
    offlineHelp: (date) => `खोज, दोनों नक्शे, किराया, और सेव की हुई यात्राएँ ${date} की सूची से हैं। सिग्नल कटने पर भी वे इस फ़ोन पर रहती हैं।`,
    offlineRoute: "आप ऑफ़लाइन हैं, और यह जोड़ी सेव यात्राओं में नहीं थी। रास्ता स्टेशन सूची से गिना गया है। किराया और समय उपलब्ध नहीं हैं।",
    freshnessTitle: "सेव की गई जानकारी",
    networkSaved: (date) => `लाइन और स्टेशन ${date} को सेव हुए।`,
    journeysSaved: (when) => `डाउनलोड की गई यात्राएँ दिल्ली मेट्रो के ${when} के नतीजे से हैं, लाइव प्रस्थान से नहीं।`,
    offlineLimit: "ऑफ़लाइन खोज, दोनों नक्शे, और सेव की हुई यात्राएँ चलती हैं, किराया, प्लेटफॉर्म, और पहली और आखिरी ट्रेन के साथ। जो जोड़ी सेव नहीं है, वह स्टेशन सूची से गिनी जाती है, और तब किराया और समय उपलब्ध नहीं रहते।",
  },
} satisfies { en: Copy; hi: Copy }
