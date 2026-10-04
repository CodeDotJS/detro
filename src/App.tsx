import { useEffect, useReducer, useRef, useState } from "react"
import { copy } from "./i18n/copy"
import { createDebouncedSearch, type DebouncedSearch } from "./lib/dmrc/debounce"
import { DmrcError } from "./lib/dmrc/errors"
import { loadSnapshot, namesFor, searchCatalog } from "./lib/dmrc/snapshot"
import { SAVED_JOURNEY_AT } from "./lib/offline/source"
import { journeySteps } from "./lib/transit/present"
import { bestLineForCodes, codesOnMap, journeyStationCodes } from "./lib/transit/highlight"
import { savedJourneys } from "./lib/offline/saved"
import { alternateRide, planRoute, sameRide } from "./lib/transit/route"
import { startLineCode } from "./lib/transit/routeMap"
import { readSelection, writeSelection } from "./lib/plan/selection"
import { createPlanState, planReducer, routeBlockReason } from "./lib/plan/state"
import { clearTrips, readTripQuery, readTrips, removeTrip, saveTrip, tripQuery, type SavedTrip } from "./lib/plan/trips"
import type { Journey, Lang, Suggestion } from "./lib/transit/types"
import { HelpView } from "./ui/HelpView"
import { MapView } from "./ui/MapView"
import { PlanView } from "./ui/PlanView"
import { CityMap } from "./ui/CityMap"
import { pathForTab, tabFromPath } from "./lib/nav"
import { TabBar, type Tab } from "./ui/TabBar"

const snapshot = loadSnapshot()
const snapshotDate = snapshot.fetchedAt.slice(0, 10)
const interchangeCodes = new Set(
  snapshot.stations.filter((station) => station.lines.en.length > 1).map((station) => station.code),
)
const knownStationCodes = new Set(snapshot.lines.flatMap((line) => line.stations.map((station) => station.code)))

function pageMeta(tab: Tab): { title: string; description: string } {
  if (tab === "map") {
    return {
      title: "Line map · DETRO",
      description: "Browse the Delhi Metro line by line in DETRO. Pick a station and start a trip. Free, ad-free, and independent of DMRC.",
    }
  }
  if (tab === "city") {
    return {
      title: "City map · DETRO",
      description: "See a Delhi Metro ride on the city map in DETRO. Choose a start and a destination and follow the line between them.",
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
    setMeta("og:title", page.title, true)
    setMeta("og:description", page.description, true)
    setMeta("twitter:title", page.title)
    setMeta("twitter:description", page.description)
    const canonical = `${window.location.origin}${pathForTab(tab)}`
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
  const [mapJourney, setMapJourney] = useState<Journey | null>(null)
  const [cityFrom, setCityFrom] = useState<{ code: string; name: string } | null>(null)
  const [cityTo, setCityTo] = useState<{ code: string; name: string } | null>(null)
  const [cityJourney, setCityJourney] = useState<Journey | null>(null)
  const [cityAlternate, setCityAlternate] = useState<Journey | null>(null)
  const [cityPhase, setCityPhase] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [cityMessage, setCityMessage] = useState<string | null>(null)
  const [routeOpen, setRouteOpen] = useState(false)
  const cityRequest = useRef(0)
  const [textSize, setTextSize] = useState<"small" | "normal" | "large">(readTextSize)
  const [helpNotice, setHelpNotice] = useState<string | null>(null)
  const [trips, setTrips] = useState<SavedTrip[]>(readStoredTrips)
  const [online, setOnline] = useState(() => navigator.onLine)
  const searchRef = useRef<DebouncedSearch<Suggestion> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.style.fontSize =
      textSize === "large" ? "22px" : textSize === "normal" ? "18px" : "14px"
    try {
      localStorage.removeItem("dms-lang")
      localStorage.setItem("dms-text", textSize)
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
      showRoute(shared.fromCode, shared.toCode, routeLang)
      return
    }
    if (state.from && state.to) showRoute(state.from.code, state.to.code, routeLang)
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

  function showRoute(fromCode: string, toCode: string, routeLang: Lang) {
    const id = ++requestId.current
    setMapJourney(null)
    setPhase("loading")
    setMessage(null)
    const names = namesFor(snapshot.stations, "en")
    const calculated = () => planRoute(snapshot.lines, fromCode, toCode, routeLang, snapshot.fetchedAt)
    void savedJourneys(fromCode, toCode, names, snapshot.fetchedAt).then(({ distance, changes }) => {
      if (id !== requestId.current) return
      const next = distance ?? calculated()
      if (!next) {
        setJourney(null)
        setAlternate(null)
        setPhase("error")
        setMessage(copy[routeLang].noSnapshotRoute)
        return
      }
      publish(next, alternateRide(next, changes))
      setPhase("ready")
      if (!distance && !navigator.onLine) setMessage(copy[routeLang].offlineRoute)
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
    const reason = routeBlockReason(from, to, copy[lang])
    if (reason || !from || !to) {
      requestId.current += 1
      setJourney(null)
      setAlternate(null)
      setPhase("error")
      setMessage(reason ?? copy[lang].needBoth)
      return
    }
    showRoute(from.code, to.code, lang)
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
    showRoute(fromCode, toCode, lang)
  }

  function placeStation(field: "from" | "to", code: string, name: string) {
    dispatch({ type: "set-station", field, pick: { code, name } })
    openTab("plan")
    setPlacedField(field)
    const from = field === "from" ? { code, name } : state.from
    const to = field === "to" ? { code, name } : state.to
    if (from && to && from.code !== to.code) {
      showRoute(from.code, to.code, lang)
      setMessage(copy[lang].placedRoute(from.name, to.name))
      return
    }
    clearResult()
    setPlacedField(field)
    setMessage(field === "from" ? copy[lang].placedFrom(name) : copy[lang].placedTo(name))
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
    const calculated = () => planRoute(snapshot.lines, fromCode, toCode, lang, snapshot.fetchedAt)
    void savedJourneys(fromCode, toCode, names, snapshot.fetchedAt).then(({ distance, changes }) => {
      if (id !== cityRequest.current) return
      const next = distance ?? calculated()
      if (!next) {
        setCityPhase("error")
        setCityMessage(copy[lang].noSnapshotRoute)
        return
      }
      setCityJourney(next)
      setCityAlternate(changes && !sameRide(next, changes) ? changes : null)
      setCityPhase("ready")
      if (!distance && !navigator.onLine) setCityMessage(copy[lang].offlineRoute)
    })
  }

  function placeOnCity(field: "from" | "to", code: string, name: string) {
    const pick = { code, name }
    if (field === "from") {
      setCityFrom(pick)
      setCityTo(null)
      clearCityRoute()
      setCityMessage(copy[lang].placedFrom(name))
      return
    }
    setCityTo(pick)
    if (!cityFrom || cityFrom.code === code) {
      clearCityRoute()
      setCityMessage(cityFrom && cityFrom.code === code ? copy[lang].sameStation : copy[lang].placedTo(name))
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

  function clearSavedData() {
    try {
      localStorage.removeItem("dms-text")
      clearTrips(localStorage)
    } catch {
      // The controls still reset on screen.
    }
    setTextSize("small")
    setTrips([])
    dispatch({ type: "apply-language", names: namesFor(snapshot.stations, "en") })
    clearResult()
    setHelpNotice(copy.en.cleared)
  }

  function viewRouteOnMap(shown: Journey) {
    const codes = codesOnMap(journeyStationCodes(shown), knownStationCodes)
    const line = bestLineForCodes(snapshot.lines, codes, startLineCode(snapshot.lines, shown))
    const first = shown.legs[0]
    const last = shown.legs[shown.legs.length - 1]
    const fromCode = first?.stationCodes[0]
    const toCode = last?.stationCodes[last.stationCodes.length - 1]
    setMapJourney(shown)
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
    {online ? null : (
      <p className="offline-banner" role="status">
        {copy[lang].offlineBanner(snapshotDate)}
      </p>
    )}
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
      <TabBar copy={copy.en} tab={tab} onTab={openTab} />
    </header>
    {tab === "plan" ? (
    <PlanView
      copy={copy[lang]}
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
      }}
      onHighlight={(index) => dispatch({ type: "highlight", index })}
      onSwap={() => {
        const nextFrom = state.to
        const nextTo = state.from
        dispatch({ type: "swap" })
        setPlacedField(null)
        if (window.location.search) history.replaceState(null, "", window.location.pathname)
        if (nextFrom && nextTo && nextFrom.code !== nextTo.code) {
          showRoute(nextFrom.code, nextTo.code, lang)
          return
        }
        clearResult()
      }}
      onSubmit={onSubmit}
      trips={trips.map((trip) => ({
        fromCode: trip.fromCode,
        toCode: trip.toCode,
        label: `${namesFor(snapshot.stations, lang).get(trip.fromCode) ?? trip.fromCode} → ${namesFor(snapshot.stations, lang).get(trip.toCode) ?? trip.toCode}`,
      }))}
      onOpenTrip={openTrip}
      onRemoveTrip={(fromCode, toCode) => {
        try {
          setTrips(removeTrip(localStorage, { fromCode, toCode }))
        } catch {
          setTrips((current) => current.filter((trip) => trip.fromCode !== fromCode || trip.toCode !== toCode))
        }
      }}
      onSave={() => {
        if (!state.from || !state.to) return
        setTrips(saveTrip(localStorage, { fromCode: state.from.code, toCode: state.to.code }))
        setMessage(copy[lang].tripSaved)
      }}
      onViewMap={viewRouteOnMap}
      onClearRoute={clearRoute}
      onDismissMessage={() => setMessage(null)}
      lines={snapshot.lines}
      onShare={(shown) => {
        if (!state.from || !state.to) return
        const url = `${window.location.origin}${pathForTab("plan")}${tripQuery(state.from.code, state.to.code)}`
        const text = `${journeySteps(shown, copy[lang]).join("\n")}\n${url}`
        void shareOrCopy(url, text, copy[lang].appName).then((copied) => {
          if (copied) setMessage(copy[lang].linkCopied)
        })
      }}
    />
    ) : null}
    {tab === "map" ? (
      <MapView
        copy={copy[lang]}
        lang={lang}
        lines={snapshot.lines}
        interchangeCodes={interchangeCodes}
        journey={mapJourney ?? journey}
        highlightCodes={
          new Set(
            (mapJourney ?? journey)
              ? codesOnMap(journeyStationCodes((mapJourney ?? journey)!), knownStationCodes)
              : [],
          )
        }
        focusLineCode={mapFocus.line}
        focusToken={mapFocus.token}
        onStart={(code, name) => placeStation("from", code, name)}
        onGo={(code, name) => placeStation("to", code, name)}
      />
    ) : null}
    {tab === "city" ? (
      <CityMap
        copy={copy[lang]}
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
        onSave={() => {
          if (!cityFrom || !cityTo) return
          setTrips(saveTrip(localStorage, { fromCode: cityFrom.code, toCode: cityTo.code }))
          setCityMessage(copy[lang].tripSaved)
        }}
        onShare={(shown) => {
          if (!cityFrom || !cityTo) return
          const url = `${window.location.origin}${pathForTab("plan")}${tripQuery(cityFrom.code, cityTo.code)}`
          const text = `${journeySteps(shown, copy[lang]).join("\n")}\n${url}`
          void shareOrCopy(url, text, copy[lang].appName).then((copied) => {
            if (copied) setCityMessage(copy[lang].linkCopied)
          })
        }}
      />
    ) : null}
    {tab === "help" ? (
      <HelpView
        copy={copy.en}
        textSize={textSize}
        snapshotDate={snapshotDate}
        notice={helpNotice}
        journeyAt={SAVED_JOURNEY_AT.replace("T", " ").slice(0, 16)}
        onTextSize={setTextSize}
        onClear={clearSavedData}
        onDismissNotice={() => setHelpNotice(null)}
      />
    ) : null}
    </div>
  )
}

function readTextSize(): "small" | "normal" | "large" {
  try {
    const saved = localStorage.getItem("dms-text")
    if (saved === "large" || saved === "normal" || saved === "small") return saved
    return "small"
  } catch {
    return "small"
  }
}

function readStoredTrips(): SavedTrip[] {
  try {
    return readTrips(localStorage)
  } catch {
    return []
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


