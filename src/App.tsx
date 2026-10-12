import { useEffect, useReducer, useRef, useState } from "react"
import { useTheme } from "./lib/plan/theme-context"
import { copy } from "./i18n/copy"
import { createDebouncedSearch, type DebouncedSearch } from "./lib/dmrc/debounce"
import { DmrcError } from "./lib/dmrc/errors"
import { loadSnapshot, namesFor, searchCatalog } from "./lib/dmrc/snapshot"
import { SAVED_JOURNEY_AT } from "./lib/offline/source"
import { journeySteps } from "./lib/transit/present"
import { bestLineForCodes, codesOnMap, journeyStationCodes } from "./lib/transit/highlight"
import { savedJourneys } from "./lib/offline/saved"
import { alternateRide, journeyAllowed, planRoute, sameRide } from "./lib/transit/route"
import { startLineCode } from "./lib/transit/routeMap"
import { readSelection, writeSelection } from "./lib/plan/selection"
import { defaultTheme, themeStorageKey } from "./lib/plan/theme"
import { readTextSize, textDefault, textStorageKey } from "./lib/plan/textSize"
import { createPlanState, planReducer, routeBlockReason } from "./lib/plan/state"
import {
  clearPlayProgress,
  emptyPlayProgress,
  readPlayProgress,
  writePlayProgress,
  type PlayProgress,
} from "./lib/play/progress"
import { clearTrips, readTripQuery, readTrips, removeTrip, toggleTrip, tripQuery, type SavedTrip } from "./lib/plan/trips"
import type { Journey, Lang, Suggestion } from "./lib/transit/types"
import coordinatesFile from "../data/en/coordinates.json"
import { accessByCode } from "./lib/status/pack"
import { loadStatus, loadStatusHistory, statusClock } from "./lib/status/load"
import { locationCopy, readLocation, rememberedLocation, resetLocationMemory, type LocationResult } from "./lib/status/location"
import { nearestBoardable, nearestStation, type Coordinate } from "./lib/status/nearest"
import { allowSelectedEnds, substituteOpen } from "./lib/status/substitute"
import { HelpView } from "./ui/HelpView"
import { MapView } from "./ui/MapView"
import { PlanView, type BypassSwap, type GateOffer } from "./ui/PlanView"
import { PlayView } from "./ui/PlayView"
import { SavedView } from "./ui/SavedView"
import { StatusView } from "./ui/StatusView"
import { CityMap } from "./ui/CityMap"
import { pathForTab, tabFromPath } from "./lib/nav"
import { SignalMark, TabBar, type Tab } from "./ui/TabBar"
import { ThemeChrome, ThemeCycle } from "./ui/ThemeCycle"

const snapshot = loadSnapshot()
const statusPack = loadStatus()
const statusHistory = loadStatusHistory()
const snapshotDate = snapshot.fetchedAt.slice(0, 10)
const interchangeCodes = new Set(
  snapshot.stations.filter((station) => station.lines.en.length > 1).map((station) => station.code),
)
const knownStationCodes = new Set(snapshot.lines.flatMap((line) => line.stations.map((station) => station.code)))
const coordinates = coordinatesFile.stations as Record<string, Coordinate>
const closedCodes = new Set(Object.keys(statusPack.stations))
const accessOf = (code: string) => accessByCode(statusPack, code)

function pageMeta(tab: Tab): { title: string; description: string } {
  if (tab === "lines") {
    return {
      title: "Lines · DETRO",
      description: "Browse the Delhi Metro line by line in DETRO. Pick a station and start a trip. Free, ad-free, and independent of DMRC.",
    }
  }
  if (tab === "city") {
    return {
      title: "City map · DETRO",
      description: "See a Delhi Metro ride on the city map in DETRO. Choose a start and a destination and follow the line between them.",
    }
  }
  if (tab === "saved") {
    return {
      title: "Saved trips · DETRO",
      description: "Open a saved Delhi Metro trip in DETRO. Trips stay on this phone. Free, ad-free, and independent of DMRC.",
    }
  }
  if (tab === "status") {
    return {
      title: "Status · DETRO",
      description: "See which Delhi Metro gates are closed in DETRO. Trains may still run through. Free, ad-free, and independent of DMRC.",
    }
  }
  if (tab === "play") {
    return {
      title: "Play · DETRO",
      description: "Delhi Metro games in DETRO. Name the next stop, find where to change, pick the right platform, and compare trip times and fares. Free, ad-free, and independent of DMRC.",
    }
  }
  if (tab === "help") {
    return {
      title: "Help · DETRO",
      description: "How to plan a Delhi Metro trip in DETRO. An independent guide, not an official DMRC app.",
    }
  }
  return {
    title: "DETRO — Delhi Metro Simple",
    description: "DETRO plans a Delhi Metro trip. Pick two stations and see the train, where to change, and the fare. Free, ad-free, and independent of DMRC.",
  }
}

function setMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement("meta")
    if (property) tag.setAttribute("property", name)
    else tag.setAttribute("name", name)
    document.head.appendChild(tag)
  }
  tag.setAttribute("content", content)
}

export function App() {
  const lang = "en" as const
  const [state, dispatch] = useReducer(planReducer, undefined, initialPlan)
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [placedField, setPlacedField] = useState<"from" | "to" | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [alternate, setAlternate] = useState<Journey | null>(null)
  const [tab, setTab] = useState<Tab>(() => tabFromPath(window.location.pathname) ?? "plan")
  useEffect(() => {
    const known = tabFromPath(window.location.pathname)
    const canonical = pathForTab(known ?? "plan")
    const current = window.location.pathname.replace(/\/+$/, "") || "/"
    if (current !== canonical) {
      history.replaceState(null, "", canonical + window.location.search)
    }
    const onPop = () => setTab(tabFromPath(window.location.pathname) ?? "plan")
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"
  }, [])
  useEffect(() => {
    const page = pageMeta(tab)
    document.title = page.title
    setMeta("description", page.description)
    const canonical = `${window.location.origin}${pathForTab(tab)}`
    const cover = `${window.location.origin}/share/cover.jpg`
    setMeta("og:title", page.title, true)
    setMeta("og:description", page.description, true)
    setMeta("og:url", canonical, true)
    setMeta("og:image", cover, true)
    setMeta("twitter:card", "summary_large_image")
    setMeta("twitter:title", page.title)
    setMeta("twitter:description", page.description)
    setMeta("twitter:image", cover)
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "canonical"
      document.head.appendChild(link)
    }
    link.href = canonical
    window.scrollTo(0, 0)
  }, [tab])
  const [mapFocus, setMapFocus] = useState<{ line: string | null; token: number }>({ line: null, token: 0 })
  const [cityFrom, setCityFrom] = useState<{ code: string; name: string } | null>(null)
  const [cityTo, setCityTo] = useState<{ code: string; name: string } | null>(null)
  const [cityJourney, setCityJourney] = useState<Journey | null>(null)
  const [cityAlternate, setCityAlternate] = useState<Journey | null>(null)
  const [cityPhase, setCityPhase] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [cityMessage, setCityMessage] = useState<string | null>(null)
  const [routeOpen, setRouteOpen] = useState(false)
  const cityRequest = useRef(0)
  const [textSize, setTextSize] = useState(readTextSize)
  const [helpNotice, setHelpNotice] = useState<string | null>(null)
  const [trips, setTrips] = useState<SavedTrip[]>(readStoredTrips)
  const [savedMark, setSavedMark] = useState<{ n: number; fromCode: string; toCode: string } | null>(null)
  useEffect(() => {
    if (tab !== "saved" || savedMark === null) return
    const id = window.setTimeout(() => setSavedMark(null), 1100)
    return () => window.clearTimeout(id)
  }, [tab, savedMark])

  function flipTrip(fromCode: string, toCode: string): boolean {
    try {
      const next = toggleTrip(localStorage, { fromCode, toCode })
      setTrips(next.trips)
      if (next.saved) setSavedMark((current) => ({ n: (current?.n ?? 0) + 1, fromCode, toCode }))
      return next.saved
    } catch {
      const kept = trips.some((trip) => trip.fromCode === fromCode && trip.toCode === toCode)
      if (kept) {
        setTrips((current) => current.filter((trip) => trip.fromCode !== fromCode || trip.toCode !== toCode))
        return false
      }
      setTrips((current) => [{ fromCode, toCode }, ...current.filter((trip) => trip.fromCode !== fromCode || trip.toCode !== toCode)])
      setSavedMark((current) => ({ n: (current?.n ?? 0) + 1, fromCode, toCode }))
      return true
    }
  }
  const [playProgress, setPlayProgress] = useState(readStoredPlayProgress)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [here, setHere] = useState<Coordinate | null>(() => rememberedLocation())
  const [locating, setLocating] = useState(false)
  const [locateNote, setLocateNote] = useState<string | null>(null)
  const [bypass, setBypass] = useState<Journey | null>(null)
  const [bypassVia, setBypassVia] = useState<string | null>(null)
  const [bypassSwap, setBypassSwap] = useState<BypassSwap | null>(null)
  const [preferBypass, setPreferBypass] = useState(false)
  const [gateOffer, setGateOffer] = useState<{
    from: { code: string; name: string }
    to: { code: string; name: string }
    closed: GateOffer["closed"]
  } | null>(null)
  const { setTheme } = useTheme()
  const searchRef = useRef<DebouncedSearch<Suggestion> | null>(null)
  const requestId = useRef(0)
  const locateWait = useRef<Promise<LocationResult> | null>(null)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.style.fontSize = `${textSize}px`
    try {
      localStorage.removeItem("dms-lang")
      localStorage.removeItem("dms-text")
      localStorage.setItem(textStorageKey, String(textSize))
    } catch {
      // The planner still works when storage is blocked.
    }
  }, [textSize])

  useEffect(() => {
    const markOnline = () => setOnline(true)
    const markOffline = () => setOnline(false)
    window.addEventListener("online", markOnline)
    window.addEventListener("offline", markOffline)
    return () => {
      window.removeEventListener("online", markOnline)
      window.removeEventListener("offline", markOffline)
    }
  }, [])

  useEffect(() => {
    const debounced = createDebouncedSearch<Suggestion>(300, async (query) => {
      return searchCatalog(snapshot.stations, lang, query)
    })
    searchRef.current = debounced
    return () => debounced.cancel()
  }, [lang])

  useEffect(() => {
    try {
      writeSelection(localStorage, {
        fromCode: state.from?.code ?? null,
        toCode: state.to?.code ?? null,
      })
    } catch {
      // The planner still works when storage is blocked.
    }
  }, [state.from, state.to])

  useEffect(() => {
    const routeLang = lang
    const shared = readTripQuery(window.location.search)
    if (shared) {
      const names = namesFor(snapshot.stations, routeLang)
      const fromName = names.get(shared.fromCode)
      const toName = names.get(shared.toCode)
      if (!fromName || !toName) return
      dispatch({ type: "set-station", field: "from", pick: { code: shared.fromCode, name: fromName } })
      dispatch({ type: "set-station", field: "to", pick: { code: shared.toCode, name: toName } })
      offerOrShow({ code: shared.fromCode, name: fromName }, { code: shared.toCode, name: toName })
      return
    }
    if (state.from && state.to) offerOrShow(state.from, state.to)
    // Restore a shared link, or the stations saved on this device, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearRoute() {
    dispatch({ type: "clear" })
    setPlacedField(null)
    clearResult()
    if (window.location.search) history.replaceState(null, "", window.location.pathname)
  }

  function clearResult() {
    requestId.current += 1
    setJourney(null)
    setAlternate(null)
    setPhase("idle")
    setMessage(null)
    setBypass(null)
    setBypassVia(null)
    setBypassSwap(null)
    setGateOffer(null)
  }

  function publish(next: Journey | null, other: Journey | null) {
    setJourney(next)
    setAlternate(next && other && !sameRide(next, other) ? other : null)
  }

  function onType(field: "from" | "to", query: string) {
    dispatch({ type: "type", field, query })
    setPlacedField(null)
    clearResult()
    if (window.location.search) history.replaceState(null, "", window.location.pathname)
    if (!query.trim()) {
      searchRef.current?.cancel()
      return
    }
    dispatch({ type: "loading", field })
    searchRef.current?.push(query, (result) => {
      if ("error" in result) {
        if (result.error instanceof DmrcError && result.error.kind === "aborted") return
        dispatch({ type: "search-error", field })
        return
      }
      dispatch({ type: "suggestions", field, stations: result.stations })
    })
  }

  function stationLabel(code: string): string {
    return namesFor(snapshot.stations, lang).get(code) ?? code
  }

  function nearestOpenName(code: string): string | null {
    const point = coordinates[code]
    if (!point) return null
    const next = nearestBoardable(point, statusPack, coordinates, code)
    return next ? stationLabel(next.code) : null
  }

  function closedMessage(fromCode: string, toCode: string): string | null {
    if (!accessOf(fromCode).board) return copy.closedStart(stationLabel(fromCode), nearestOpenName(fromCode))
    if (!accessOf(toCode).alight) return copy.closedEnd(stationLabel(toCode), nearestOpenName(toCode))
    return null
  }

  function closedGate(from: { code: string; name: string }, to: { code: string; name: string }) {
    const swap = substituteOpen(from.code, to.code, statusPack, coordinates, accessOf)
    if (!swap) return null
    const closed: GateOffer["closed"] = []
    if (swap.replacedFrom) {
      const row = statusPack.stations[from.code]
      closed.push({
        name: from.name,
        openName: stationLabel(swap.from),
        note: row?.note ?? null,
        phrase: row?.phrase ?? null,
        title: row?.title ?? null,
      })
    }
    if (swap.replacedTo) {
      const row = statusPack.stations[to.code]
      closed.push({
        name: to.name,
        openName: stationLabel(swap.to),
        note: row?.note ?? null,
        phrase: row?.phrase ?? null,
        title: row?.title ?? null,
      })
    }
    return closed.length > 0 ? { from, to, closed } : null
  }

  function offerOrShow(from: { code: string; name: string }, to: { code: string; name: string }) {
    const offer = closedGate(from, to)
    if (offer) {
      requestId.current += 1
      setJourney(null)
      setAlternate(null)
      setPhase("idle")
      setMessage(null)
      setBypass(null)
      setBypassVia(null)
      setBypassSwap(null)
      setGateOffer(offer)
      return true
    }
    setGateOffer(null)
    setPreferBypass(false)
    showRoute(from.code, to.code, lang)
    return false
  }

  function acceptGate() {
    if (!gateOffer) return
    const { from, to } = gateOffer
    setGateOffer(null)
    setPreferBypass(true)
    showRoute(from.code, to.code, lang)
  }

  function keepGate() {
    if (!gateOffer) return
    const { from, to } = gateOffer
    setGateOffer(null)
    setPreferBypass(false)
    showRoute(from.code, to.code, lang)
  }

  function readHere(then: (point: Coordinate) => void, onFail: (text: string) => void) {
    const known = here ?? rememberedLocation()
    if (known) {
      setHere(known)
      setLocateNote(null)
      then(known)
      return
    }
    if (locateWait.current) {
      setLocating(true)
      void locateWait.current.then((result) => finishHere(result, then, onFail))
      return
    }
    const pending = readLocation(navigator.geolocation, window.isSecureContext)
    locateWait.current = pending
    setLocating(true)
    void pending.then((result) => {
      locateWait.current = null
      finishHere(result, then, onFail)
    })
  }

  function finishHere(
    result: LocationResult,
    then: (point: Coordinate) => void,
    onFail: (text: string) => void,
  ) {
    setLocating(false)
    if (!result.ok) {
      onFail(locationCopy(result.reason, copy))
      return
    }
    const point = { lat: result.lat, lng: result.lng }
    setHere(point)
    setLocateNote(null)
    then(point)
  }

  function locateOnPlan() {
    readHere(
      (point) => {
        const stand = nearestStation(point, coordinates)
        if (!stand) {
          setMessage(copy.locationNone)
          return
        }
        const name = stationLabel(stand.code)
        dispatch({ type: "set-station", field: "from", pick: { code: stand.code, name } })
        if (!accessOf(stand.code).board) {
          setMessage(copy.closedStart(name, nearestOpenName(stand.code)))
          return
        }
        setMessage(copy.locationNear(name))
      },
      (text) => setMessage(text),
    )
  }

  function showRoute(fromCode: string, toCode: string, routeLang: Lang) {
    const id = ++requestId.current
    setPhase("loading")
    setMessage(null)
    setBypass(null)
    setBypassVia(null)
    setBypassSwap(null)
    const names = namesFor(snapshot.stations, "en")
    const askedAccess = allowSelectedEnds(fromCode, toCode, accessOf)
    const swap = substituteOpen(fromCode, toCode, statusPack, coordinates, accessOf)
    const calculated = (start: string, end: string, access = accessOf) =>
      planRoute(snapshot.lines, start, end, routeLang, snapshot.fetchedAt, access)
    void Promise.all([
      savedJourneys(fromCode, toCode, names, snapshot.fetchedAt),
      swap ? savedJourneys(swap.from, swap.to, names, snapshot.fetchedAt) : Promise.resolve({ distance: null, changes: null }),
    ]).then(([asked, alt]) => {
      if (id !== requestId.current) return
      const askedKept = asked.distance && journeyAllowed(asked.distance, askedAccess) ? asked.distance : null
      const askedRide = askedKept ?? calculated(fromCode, toCode, askedAccess)
      const askedOther = asked.changes && journeyAllowed(asked.changes, askedAccess) ? asked.changes : null
      let bypassRide: Journey | null = null
      if (swap) {
        const altKept = alt.distance && journeyAllowed(alt.distance, accessOf) ? alt.distance : null
        bypassRide = altKept ?? calculated(swap.from, swap.to, accessOf)
        if (bypassRide && askedRide && sameRide(askedRide, bypassRide)) bypassRide = null
      }
      if (!askedRide && !bypassRide) {
        setJourney(null)
        setAlternate(null)
        setBypass(null)
        setBypassSwap(null)
        setPhase("error")
        setMessage(copy.noSnapshotRoute)
        return
      }
      const swapNote: BypassSwap | null = swap
        ? {
            askedFrom: stationLabel(fromCode),
            askedTo: stationLabel(toCode),
            rideFrom: stationLabel(swap.from),
            rideTo: stationLabel(swap.to),
            replacedFrom: swap.replacedFrom,
            replacedTo: swap.replacedTo,
          }
        : null
      if (askedRide) {
        publish(askedRide, alternateRide(askedRide, askedOther))
        setBypass(bypassRide)
        setBypassVia(
          swap
            ? copy.alternativeVia(
                swap.replacedFrom ? stationLabel(swap.from) : null,
                swap.replacedTo ? stationLabel(swap.to) : null,
              )
            : null,
        )
        setBypassSwap(bypassRide ? swapNote : null)
      } else {
        publish(bypassRide, null)
        setBypass(null)
        setBypassVia(null)
        setBypassSwap(null)
        if (swap?.replacedFrom) setMessage(copy.closedStart(stationLabel(fromCode), stationLabel(swap.from)))
        else if (swap?.replacedTo) setMessage(copy.closedEnd(stationLabel(toCode), stationLabel(swap.to)))
      }
      setPhase("ready")
      if (!askedKept && !navigator.onLine) setMessage(copy.offlineRoute)
    })
  }

  function stationFromCode(query: string): { code: string; name: string } | null {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return null
    const station = snapshot.stations.find((item) => item.code.toLocaleLowerCase() === needle)
    if (!station) return null
    const name = namesFor(snapshot.stations, lang).get(station.code)
    if (!name) return null
    return { code: station.code, name }
  }

  function onSubmit() {
    let from = state.from
    let to = state.to
    if (!from) {
      const picked = stationFromCode(state.fromQuery)
      if (picked) {
        from = picked
        dispatch({ type: "set-station", field: "from", pick: picked })
      }
    }
    if (!to) {
      const picked = stationFromCode(state.toQuery)
      if (picked) {
        to = picked
        dispatch({ type: "set-station", field: "to", pick: picked })
      }
    }
    const reason = routeBlockReason(from, to, copy)
    if (reason || !from || !to) {
      requestId.current += 1
      setJourney(null)
      setAlternate(null)
      setBypass(null)
      setBypassVia(null)
      setBypassSwap(null)
      setPhase("error")
      setMessage(reason ?? copy.needBoth)
      return
    }
    offerOrShow(from, to)
  }

  function openTab(next: Tab) {
    const target = pathForTab(next)
    const current = window.location.pathname.replace(/\/+$/, "") || "/"
    if (current !== target) history.pushState(null, "", target + window.location.search)
    setTab(next)
  }

  function openTrip(fromCode: string, toCode: string) {
    const names = namesFor(snapshot.stations, lang)
    const fromName = names.get(fromCode)
    const toName = names.get(toCode)
    if (!fromName || !toName) return
    dispatch({ type: "set-station", field: "from", pick: { code: fromCode, name: fromName } })
    dispatch({ type: "set-station", field: "to", pick: { code: toCode, name: toName } })
    openTab("plan")
    offerOrShow({ code: fromCode, name: fromName }, { code: toCode, name: toName })
  }

  function clearCityRoute() {
    cityRequest.current += 1
    setCityJourney(null)
    setCityAlternate(null)
    setCityPhase("idle")
    setRouteOpen(false)
  }

  function showCityRoute(fromCode: string, toCode: string) {
    const id = ++cityRequest.current
    setCityJourney(null)
    setCityAlternate(null)
    setCityPhase("loading")
    setCityMessage(null)
    const names = namesFor(snapshot.stations, "en")
    const blocked = closedMessage(fromCode, toCode)
    if (blocked) {
      setCityPhase("error")
      setCityMessage(blocked)
      return
    }
    const calculated = () => planRoute(snapshot.lines, fromCode, toCode, lang, snapshot.fetchedAt, accessOf)
    void savedJourneys(fromCode, toCode, names, snapshot.fetchedAt).then(({ distance, changes }) => {
      if (id !== cityRequest.current) return
      const kept = distance && journeyAllowed(distance, accessOf) ? distance : null
      const next = kept ?? calculated()
      if (!next) {
        setCityPhase("error")
        setCityMessage(copy.noSnapshotRoute)
        return
      }
      const other = changes && journeyAllowed(changes, accessOf) ? changes : null
      setCityJourney(next)
      setCityAlternate(other && !sameRide(next, other) ? other : null)
      setCityPhase("ready")
      if (!kept && !navigator.onLine) setCityMessage(copy.offlineRoute)
    })
  }

  function placeOnCity(field: "from" | "to", code: string, name: string) {
    const pick = { code, name }
    if (field === "from") {
      setCityFrom(pick)
      setCityTo(null)
      clearCityRoute()
      setCityMessage(copy.placedFrom(name))
      return
    }
    setCityTo(pick)
    if (!cityFrom || cityFrom.code === code) {
      clearCityRoute()
      setCityMessage(cityFrom && cityFrom.code === code ? copy.sameStation : copy.placedTo(name))
      return
    }
    showCityRoute(cityFrom.code, code)
    setRouteOpen(true)
  }

  function swapOnCity() {
    if (!cityFrom || !cityTo) return
    const nextFrom = cityTo
    const nextTo = cityFrom
    setCityFrom(nextFrom)
    setCityTo(nextTo)
    showCityRoute(nextFrom.code, nextTo.code)
    setRouteOpen(true)
  }

  function updatePlayProgress(update: (current: PlayProgress) => PlayProgress) {
    setPlayProgress((current) => {
      const next = update(current)
      try {
        writePlayProgress(localStorage, next)
      } catch {
        // The passport still updates on screen.
      }
      return next
    })
  }

  function clearSavedData() {
    try {
      localStorage.removeItem("dms-text")
      localStorage.removeItem(textStorageKey)
      localStorage.removeItem(themeStorageKey)
      clearTrips(localStorage)
      clearPlayProgress(localStorage)
    } catch {
      // The controls still reset on screen.
    }
    setTheme(defaultTheme)
    setTextSize(textDefault)
    setTrips([])
    setPlayProgress(emptyPlayProgress())
    dispatch({ type: "apply-language", names: namesFor(snapshot.stations, "en") })
    clearResult()
    setHelpNotice(copy.cleared)
  }

  function viewRouteOnMap(shown: Journey) {
    const codes = codesOnMap(journeyStationCodes(shown), knownStationCodes)
    const line = bestLineForCodes(snapshot.lines, codes, startLineCode(snapshot.lines, shown))
    const first = shown.legs[0]
    const last = shown.legs[shown.legs.length - 1]
    const fromCode = first?.stationCodes[0]
    const toCode = last?.stationCodes[last.stationCodes.length - 1]
    setMapFocus((current) => ({ line, token: current.token + 1 }))
    if (fromCode && toCode) {
      setCityFrom({ code: fromCode, name: shown.originName })
      setCityTo({ code: toCode, name: shown.destinationName })
      setCityJourney(shown)
      setCityAlternate(null)
      setCityPhase("ready")
      setCityMessage(null)
      setRouteOpen(true)
    }
    openTab("city")
  }

  function dismissCityTrip() {
    cityRequest.current += 1
    setCityFrom(null)
    setCityTo(null)
    setCityJourney(null)
    setCityAlternate(null)
    setCityPhase("idle")
    setCityMessage(null)
    setRouteOpen(false)
  }

  return (
    <div className="app">
    <ThemeChrome />
    <header className="app-bar">
      <a
        className="mark"
        href="/"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          openTab("plan")
        }}
      >
        <img className="mark-logo" src="/attractions/metro-people.svg" alt="" width="32" height="32" />
        <span className="mark-name">DETRO</span>
        <span className="mark-tag">Delhi Metro Simple</span>
      </a>
      <TabBar
        copy={copy}
        tab={tab}
        onTab={openTab}
        savedLand={savedMark?.n ?? 0}
        savedCount={trips.length}
      />
      <div className="chrome-tools">
        <SignalMark copy={copy} online={online} />
        <ThemeCycle copy={copy} />
      </div>
    </header>
    {tab === "plan" ? (
    <PlanView
      copy={copy}
      lang={lang}
      state={state}
      phase={phase}
      message={message}
      journey={journey}
      alternate={alternate}
      placedField={placedField}
      onType={onType}
      onFocus={(field) => dispatch({ type: "focus", field })}
      onSelect={(field, code) => {
        dispatch({ type: "select", field, code })
        setPlacedField(null)
        clearResult()
        if (field === "from") {
          requestAnimationFrame(() => document.getElementById("to")?.focus())
        }
      }}
      onHighlight={(index) => dispatch({ type: "highlight", index })}
      onSwap={() => {
        const nextFrom = state.to
        const nextTo = state.from
        dispatch({ type: "swap" })
        setPlacedField(null)
        if (window.location.search) history.replaceState(null, "", window.location.pathname)
        if (nextFrom && nextTo && nextFrom.code !== nextTo.code) {
          offerOrShow(nextFrom, nextTo)
          return
        }
        clearResult()
      }}
      onSubmit={onSubmit}
      saved={pairSaved(trips, state.from, state.to)}
      onSave={() => {
        if (!state.from || !state.to) return
        const stored = flipTrip(state.from.code, state.to.code)
        setMessage(stored ? copy.tripSaved : null)
      }}
      onViewMap={viewRouteOnMap}
      onClearRoute={clearRoute}
      onDismissMessage={() => setMessage(null)}
      lines={snapshot.lines}
      closedCodes={closedCodes}
      onLocate={locateOnPlan}
      locating={locating}
      bypass={bypass}
      bypassVia={bypassVia}
      bypassSwap={bypassSwap}
      preferBypass={preferBypass}
      gateOffer={gateOffer ? { closed: gateOffer.closed } : null}
      onAcceptGate={acceptGate}
      onKeepGate={keepGate}
      onShare={(shown) => {
        if (!state.from || !state.to) return
        const url = `${window.location.origin}${pathForTab("plan")}${tripQuery(state.from.code, state.to.code)}`
        const text = `${journeySteps(shown, copy).join("\n")}\n${url}`
        void shareOrCopy(url, text, copy.appName).then((copied) => {
          if (copied) setMessage(copy.linkCopied)
        })
      }}
    />
    ) : null}
    {tab === "saved" ? (
      <SavedView
        copy={copy}
        lines={snapshot.lines}
        lang={lang}
        landed={savedMark}
        trips={trips.map((trip) => ({
          fromCode: trip.fromCode,
          toCode: trip.toCode,
          fromName: namesFor(snapshot.stations, lang).get(trip.fromCode) ?? trip.fromCode,
          toName: namesFor(snapshot.stations, lang).get(trip.toCode) ?? trip.toCode,
        }))}
        onOpenTrip={openTrip}
        access={accessOf}
        onRemoveTrip={(fromCode, toCode) => {
          try {
            setTrips(removeTrip(localStorage, { fromCode, toCode }))
          } catch {
            setTrips((current) => current.filter((trip) => trip.fromCode !== fromCode || trip.toCode !== toCode))
          }
        }}
      />
    ) : null}
    {tab === "status" ? (
      <StatusView
        copy={copy}
        pack={statusPack}
        history={statusHistory}
        names={namesFor(snapshot.stations, lang)}
        stations={snapshot.stations}
        lines={snapshot.lines}
        coordinates={coordinates}
        here={here}
        locating={locating}
        locateNote={locateNote}
        onLocate={() =>
          readHere(
            () => undefined,
            (text) => setLocateNote(text),
          )
        }
        onPlan={(from, to) => openTrip(from.code, to.code)}
        onClear={() => {
          resetLocationMemory()
          setHere(null)
          setLocateNote(null)
        }}
      />
    ) : null}
    {tab === "play" ? (
      <PlayView
        lines={snapshot.lines}
        fetchedAt={snapshot.fetchedAt}
        progress={playProgress}
        onProgress={updatePlayProgress}
        homeCodes={trips.flatMap((trip) => [trip.fromCode, trip.toCode])}
      />
    ) : null}
    {tab === "lines" ? (
      <MapView
        copy={copy}
        lang={lang}
        lines={snapshot.lines}
        interchangeCodes={interchangeCodes}
        highlightCodes={
          new Set(journey ? codesOnMap(journeyStationCodes(journey), knownStationCodes) : [])
        }
        focusLineCode={mapFocus.line}
        focusToken={mapFocus.token}
        closedCodes={closedCodes}
      />
    ) : null}
    {tab === "city" ? (
      <CityMap
        copy={copy}
        lines={snapshot.lines}
        lang={lang}
        from={cityFrom}
        to={cityTo}
        phase={cityPhase}
        message={cityMessage}
        journey={cityJourney}
        alternate={cityAlternate}
        routeOpen={routeOpen}
        onStart={(code, name) => placeOnCity("from", code, name)}
        onGo={(code, name) => placeOnCity("to", code, name)}
        onSwap={swapOnCity}
        onOpenRoute={() => setRouteOpen(true)}
        onCloseRoute={() => setRouteOpen(false)}
        onDismiss={dismissCityTrip}
        onDismissMessage={() => setCityMessage(null)}
        saved={pairSaved(trips, cityFrom, cityTo)}
        onSave={() => {
          if (!cityFrom || !cityTo) return
          const stored = flipTrip(cityFrom.code, cityTo.code)
          setCityMessage(stored ? copy.tripSaved : null)
        }}
        closedCodes={closedCodes}
        onShare={(shown) => {
          if (!cityFrom || !cityTo) return
          const url = `${window.location.origin}${pathForTab("plan")}${tripQuery(cityFrom.code, cityTo.code)}`
          const text = `${journeySteps(shown, copy).join("\n")}\n${url}`
          void shareOrCopy(url, text, copy.appName).then((copied) => {
            if (copied) setCityMessage(copy.linkCopied)
          })
        }}
      />
    ) : null}
    {tab === "help" ? (
      <HelpView
        copy={copy}
        textSize={textSize}
        snapshotDate={snapshotDate}
        notice={helpNotice}
        journeyAt={SAVED_JOURNEY_AT.replace("T", " ").slice(0, 16)}
        statusAt={statusClock(statusPack.fetchedAt)}
        onTextSize={setTextSize}
        onClear={clearSavedData}
        onDismissNotice={() => setHelpNotice(null)}
      />
    ) : null}
    </div>
  )
}

function pairSaved(
  trips: SavedTrip[],
  from: { code: string } | null,
  to: { code: string } | null,
): boolean {
  if (!from || !to) return false
  return trips.some((trip) => trip.fromCode === from.code && trip.toCode === to.code)
}

function readStoredTrips(): SavedTrip[] {
  try {
    return readTrips(localStorage)
  } catch {
    return []
  }
}

function readStoredPlayProgress() {
  try {
    return readPlayProgress(localStorage)
  } catch {
    return emptyPlayProgress()
  }
}

async function shareOrCopy(url: string, text: string, title: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    share?: (data: { title: string; text: string; url: string }) => Promise<void>
  }
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title, text, url })
      return false
    } catch {
      // The share sheet was dismissed, or this browser cannot share.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

function initialPlan() {
  let next = createPlanState()
  try {
    const saved = readSelection(localStorage)
    const names = namesFor(snapshot.stations, "en")
    if (saved.fromCode) {
      const name = names.get(saved.fromCode)
      if (name) next = planReducer(next, { type: "set-station", field: "from", pick: { code: saved.fromCode, name } })
    }
    if (saved.toCode) {
      const name = names.get(saved.toCode)
      if (name) next = planReducer(next, { type: "set-station", field: "to", pick: { code: saved.toCode, name } })
    }
  } catch {
    return createPlanState()
  }
  return next
}


