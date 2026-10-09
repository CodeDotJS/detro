export type Copy = {
  appName: string
  independent: string
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
  landmarkPlay: (name: string) => string
  landmarkPause: (name: string) => string
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
  appName: "DETRO",
  independent: "An independent guide. Not an official DMRC app.",
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
  landmarkPlay: (name) => `Play ${name}`,
  landmarkPause: (name) => `Pause ${name}`,
  chooseOnMap: "Choose on the map",
  routeDetails: "Route details",
  onRoute: "On this route",
  offlineHelp: (date) => `Search, both maps, fares, saved journeys, and Play use the ${date} snapshot. They still work when the signal is cut.`,
  offlineRoute: "You are offline, and this pair was not in the saved journeys. The route is calculated from the station lists. Fare and timing are unavailable.",
  freshnessTitle: "Saved information",
  networkSaved: (date) => `Lines and stations were saved on ${date}.`,
  journeysSaved: (when) => `Downloaded journeys use the Delhi Metro planner result for ${when}, not a live departure.`,
  offlineLimit: "Offline, search, both maps, saved journeys, and all four games still work, including the fare, platform, and first and last train. A pair that was never saved is calculated from the station lists, and then the fare and timing stay unavailable.",
} satisfies Copy
