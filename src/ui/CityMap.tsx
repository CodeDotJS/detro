import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ArrowRight, ArrowRightLeft, ArrowUpDown, Bookmark, ChevronDown, DoorOpen, List, Share2, X } from "lucide-react"
import type { Copy } from "../i18n/copy"
import coordinatesFile from "../../data/en/coordinates.json"
import { inkOn, legColor } from "../lib/transit/legStyle"
import { lineThreads, ridePath, type LatLng } from "../lib/transit/cityLines"
import type { LineSequence } from "../lib/transit/route"
import { routeStops } from "../lib/transit/routeMap"
import type { Journey, Lang } from "../lib/transit/types"
import { measureSwap, playSwap, type SwapDelta } from "./flipSwap"
import { Notice } from "./Notice"
import { JourneyStats, ServiceTimes, TripMeta } from "./PlanView"

const coordinates = coordinatesFile.stations as Record<string, LatLng>
const CLEAR_TILE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

type CityStation = {
  code: string
  name: string
  lat: number
  lng: number
  color: string
  lineNames: string[]
}

function connectedRide(
  parts: Array<{ color: string; points: [number, number][]; dashed: boolean }>,
): Array<{ color: string; points: [number, number][]; dashed: boolean }> {
  const joined: Array<{ color: string; points: [number, number][]; dashed: boolean }> = []
  for (const part of parts) {
    const last = joined[joined.length - 1]
    const continues =
      last &&
      !last.dashed &&
      !part.dashed &&
      last.color === part.color &&
      last.points[last.points.length - 1][0] === part.points[0][0] &&
      last.points[last.points.length - 1][1] === part.points[0][1]
    if (continues) last.points.push(part.points[1])
    else joined.push({ color: part.color, dashed: part.dashed, points: [...part.points] })
  }
  return joined
}

function routeTerminals(
  from: { code: string; name: string } | null,
  to: { code: string; name: string } | null,
  stops: Array<{ code: string; dot: string }>,
): Array<{ code: string; role: "start" | "end"; color: string }> {
  const ends: Array<{ code: string; role: "start" | "end"; color: string }> = []
  if (from) ends.push({ code: from.code, role: "start", color: stops[0]?.dot || "#16181d" })
  if (to && to.code !== from?.code) {
    const last = stops[stops.length - 1]
    ends.push({ code: to.code, role: "end", color: last?.dot || "#16181d" })
  }
  return ends
}

function rideHasGap(journey: Journey, lines: LineSequence[], lang: Lang) {
  return ridePath(routeStops(journey, lines, lang), coordinates).some((part) => part.dashed)
}

function stationsFor(lines: LineSequence[], lang: Lang): CityStation[] {
  const byCode = new Map<string, CityStation>()
  for (const line of lines) {
    if (!line.show) continue
    const lineName = line.label[lang].colorName || line.label.en.colorName
    for (const station of line.stations) {
      const point = coordinates[station.code]
      if (!point) continue
      const name = station.names[lang] ?? station.names.en ?? station.code
      const existing = byCode.get(station.code)
      if (existing) {
        existing.lineNames.push(lineName)
        continue
      }
      byCode.set(station.code, {
        code: station.code,
        name,
        lat: point.lat,
        lng: point.lng,
        color: line.label.en.color,
        lineNames: [lineName],
      })
    }
  }
  return [...byCode.values()]
}

export function CityMap({
  copy,
  lines,
  lang,
  from,
  to,
  phase,
  message,
  journey,
  alternate,
  routeOpen,
  onStart,
  onGo,
  onSwap,
  onOpenRoute,
  onCloseRoute,
  onDismiss,
  onDismissMessage,
  onSave,
  onShare,
}: {
  copy: Copy
  lines: LineSequence[]
  lang: Lang
  from: { code: string; name: string } | null
  to: { code: string; name: string } | null
  phase: "idle" | "loading" | "ready" | "error"
  message: string | null
  journey: Journey | null
  alternate: Journey | null
  routeOpen: boolean
  onStart: (code: string, name: string) => void
  onGo: (code: string, name: string) => void
  onSwap: () => void
  onOpenRoute: () => void
  onCloseRoute: () => void
  onDismiss: () => void
  onDismissMessage: () => void
  onSave: () => void
  onShare: (journey: Journey) => void
}) {
  const stations = useMemo(() => stationsFor(lines, lang), [lines, lang])
  const visibleLines = useMemo(() => lines.filter((line) => line.show), [lines])
  const [picked, setPicked] = useState<"primary" | "alternate">("primary")
  const shown = picked === "alternate" && alternate ? alternate : journey
  const routeKey = shown ? shown.legs.map((leg) => leg.stationCodes.join(",")).join("|") : ""
  const [filter, setFilter] = useState<string>(shown ? "ride" : "all")
  const [selected, setSelected] = useState<string | null>(null)
  const node = useRef<HTMLDivElement>(null)
  const citySwap = useRef<SwapDelta | null>(null)
  useLayoutEffect(() => {
    const delta = citySwap.current
    if (!delta) return
    citySwap.current = null
    const pair = document.querySelector(".pick-pair")
    playSwap(
      pair?.querySelector<HTMLElement>("[data-swap=from]") ?? null,
      pair?.querySelector<HTMLElement>("[data-swap=to]") ?? null,
      delta,
    )
  })
  const chosen = stations.find((station) => station.code === selected) ?? null
  const suggest = !from ? "from" : !to ? "to" : null

  useEffect(() => {
    setPicked("primary")
  }, [journey, alternate])

  useEffect(() => {
    setFilter(shown ? "ride" : "all")
  }, [routeKey, shown])

  useEffect(() => {
    const element = node.current
    if (!element) return
    const map = L.map(element, { zoomControl: false })
    L.control.zoom({ position: "topright" }).addTo(map)
    L.tileLayer("/map-tiles/{z}/{x}/{y}.png", {
      maxZoom: 18,
      maxNativeZoom: 14,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      errorTileUrl: CLEAR_TILE,
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    const bounds: [number, number][] = []
    const threads = lineThreads(
      visibleLines.map((line) => ({
        code: line.code,
        show: line.show,
        color: line.label.en.color,
        stationCodes: line.stations.map((station) => station.code),
      })),
      coordinates,
    )
    for (const thread of threads) {
      const focused = filter === "all" || filter === thread.code
      const faded = filter === "ride" || (filter !== "all" && filter !== thread.code)
      L.polyline(thread.points, {
        color: thread.color,
        weight: focused && filter === thread.code ? 7 : 4,
        opacity: faded ? 0.07 : 0.9,
      }).addTo(layer)
      if (filter === thread.code) bounds.push(...thread.points)
    }

    const stops = shown ? routeStops(shown, lines, lang) : []
    const onRoute = new Set(stops.map((stop) => stop.code))
    const ride = shown ? connectedRide(ridePath(stops, coordinates)) : []
    const terminals = routeTerminals(from, to, stops)
    if (shown && (filter === "ride" || filter === "all")) {
      for (const segment of ride) {
        L.polyline(segment.points, {
          color: "#fffdf8",
          weight: 10,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer)
        L.polyline(segment.points, {
          color: segment.color,
          weight: 6,
          opacity: 1,
          dashArray: segment.dashed ? "8 6" : undefined,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer)
        if (filter === "ride") bounds.push(...segment.points)
      }
    }

    const visibleStations = stations.filter((station) => {
      if (filter === "ride") return onRoute.has(station.code)
      if (filter === "all") return true
      return lines.some(
        (line) => line.show && line.code === filter && line.stations.some((item) => item.code === station.code),
      )
    })
    for (const station of visibleStations) {
      if (terminals.some((end) => end.code === station.code && coordinates[end.code])) continue
      const marked = onRoute.has(station.code)
      const size = marked ? 14 : 11
      const marker = L.marker([station.lat, station.lng], {
        title: station.name,
        zIndexOffset: marked ? 600 : 0,
        icon: L.divIcon({
          className: marked ? "city-marker city-marker-route" : "city-marker",
          html: `<span style="background:${station.color};width:${size}px;height:${size}px"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      })
      marker.on("click", () => setSelected(station.code))
      marker.addTo(layer)
      if (filter === "all" || filter === "ride") bounds.push([station.lat, station.lng])
    }
    for (const end of terminals) {
      const point = coordinates[end.code]
      if (!point) continue
      const size = 22
      L.marker([point.lat, point.lng], {
        title: end.code === from?.code ? from.name : to?.name,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: "city-marker",
          html: `<span class="city-terminal city-terminal-${end.role}" style="--c:${end.color}"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      }).on("click", () => setSelected(end.code)).addTo(layer)
      bounds.push([point.lat, point.lng])
    }

    let fitted = false
    let lastHeight = 0
    let timer = 0
    const fit = () => {
      if (bounds.length > 0) {
        map.fitBounds(bounds, {
          paddingTopLeft: [16, 48],
          paddingBottomRight: [20, 36],
          maxZoom: filter === "all" ? 12 : 14,
        })
      } else map.setView([28.6139, 77.209], 11)
    }
    const place = () => {
      const height = element.clientHeight
      map.invalidateSize()
      if (height === 0) return
      if (!fitted) {
        fitted = true
        lastHeight = height
        fit()
        return
      }
      if (Math.abs(height - lastHeight) < 48) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        lastHeight = element.clientHeight
        fit()
      }, 240)
    }
    const observer = new ResizeObserver(place)
    observer.observe(element)
    place()
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      map.remove()
    }
  }, [stations, visibleLines, lines, lang, shown, routeKey, filter, from, to])

  return (
    <main className={routeOpen ? "city-page city-split" : "city-page"}>
      <div className={shown && filter === "ride" ? "city-map-pane has-ride" : "city-map-pane"}>
      <div className="city-canvas">
        <div ref={node} className="city-leaflet" />
      </div>
      <div className="city-dock">
        <div className="line-filters" role="group" aria-label={copy.mapKind}>
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            {copy.allLines}
          </button>
          {shown ? (
            <button type="button" aria-pressed={filter === "ride"} onClick={() => setFilter("ride")}>
              {copy.routeMap}
            </button>
          ) : null}
          {visibleLines.map((line) => {
            const name = line.label[lang].colorName || line.label.en.colorName
            const shared =
              visibleLines.filter((item) => (item.label[lang].colorName || item.label.en.colorName) === name).length > 1
            const pressed = filter === line.code
            return (
              <button
                key={line.code}
                type="button"
                aria-pressed={pressed}
                onClick={() => setFilter(line.code)}
                style={pressed ? { background: line.label.en.color, color: inkOn(line.label.en.color) } : undefined}
              >
                <span className="swatch" style={{ background: line.label.en.color }} aria-hidden="true" />
                {shared ? `${name} (${line.code})` : name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="city-sheets">
        {chosen ? (
          <article className="city-card">
            <p className="city-ride-title">{chosen.name}</p>
            <p className="quiet">{chosen.lineNames.join(" · ")}</p>
            <div className="station-actions">
              <button
                type="button"
                className={suggest === "to" ? "secondary" : undefined}
                onClick={() => {
                  setSelected(null)
                  onStart(chosen.code, chosen.name)
                }}
              >
                {copy.startHere}
              </button>
              <button
                type="button"
                className={suggest === "from" ? "secondary" : undefined}
                onClick={() => {
                  setSelected(null)
                  onGo(chosen.code, chosen.name)
                }}
              >
                {copy.goHere}
              </button>
            </div>
          </article>
        ) : null}
        {(from || to) && !routeOpen ? (
          <article className="city-picks">
            <div className="city-picks-top">
            <div className="pick-pair">
              <p>
                <span>{copy.from}</span>
                <strong data-swap="from">{from?.name ?? copy.chooseOnMap}</strong>
              </p>
              <button
                type="button"
                className="swap"
                onClick={(event) => {
                  const pair = event.currentTarget.closest(".pick-pair")
                  citySwap.current = measureSwap(
                    pair?.querySelector<HTMLElement>("[data-swap=from]") ?? null,
                    pair?.querySelector<HTMLElement>("[data-swap=to]") ?? null,
                  )
                  onSwap()
                }}
                disabled={!from || !to}
              >
                <ArrowUpDown aria-hidden="true" size={18} strokeWidth={1.75} />
                <span className="sr-only">{copy.swap}</span>
              </button>
              <p>
                <span>{copy.to}</span>
                <strong data-swap="to">{to?.name ?? copy.chooseOnMap}</strong>
              </p>
            </div>
            <button type="button" className="city-picks-close" aria-label={copy.close} onClick={onDismiss}>
              <X aria-hidden="true" size={14} strokeWidth={2.25} />
            </button>
            </div>
            {message ? <Notice message={message} closeLabel={copy.close} onClose={onDismissMessage} /> : null}
            {shown && phase === "ready" ? (
              <>
                <p>
                  {shown.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance}
                  {shown.durationMinutes !== null ? ` · ${copy.aboutMinutes(shown.durationMinutes)}` : ""}
                  {` · ${shown.changes === 0 ? copy.noChanges : copy.changeCount(shown.changes)}`}
                </p>
                <div className="zoom-row">
                  <button type="button" onClick={onSave}>
                    <Bookmark aria-hidden="true" size={18} strokeWidth={2} />
                    {copy.saveTrip}
                  </button>
                  <button type="button" onClick={() => onShare(shown)}>
                    <Share2 aria-hidden="true" size={18} strokeWidth={2} />
                    {copy.shareRoute}
                  </button>
                </div>
                <button type="button" className="primary" onClick={onOpenRoute}>
                  {copy.routeDetails}
                </button>
              </>
            ) : null}
          </article>
        ) : null}
      </div>
      </div>
      <aside className="city-route-pane" aria-hidden={!routeOpen}>
        {routeOpen ? (
          <>
            <div className="city-route-bar">
              <h2 id="city-route-title">
                {shown ? (
                  <>
                    <span className="place-name">{shown.originName}</span>
                    <span aria-hidden="true"> → </span>
                    <span className="place-name">{shown.destinationName}</span>
                  </>
                ) : (
                  copy.loadingRoute
                )}
              </h2>
              <button type="button" className="route-dialog-close" onClick={onCloseRoute}>
                {copy.close}
              </button>
            </div>
            <div className="city-route-body">
              {phase === "loading" ? <p role="status">{copy.loadingRoute}</p> : null}
              {phase === "error" && message ? (
                <Notice message={message} closeLabel={copy.close} onClose={onDismissMessage} />
              ) : null}
              {phase === "ready" && shown ? (
                <>
                  {alternate && journey ? (
                    <div className="choices" role="group" aria-label={copy.routeOptions}>
                      <button type="button" aria-pressed={picked === "primary"} onClick={() => setPicked("primary")}>
                        <span>{journey.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance}</span>
                        <span className="choice-detail">{choiceDetail(journey, copy)}</span>
                      </button>
                      <button type="button" aria-pressed={picked === "alternate"} onClick={() => setPicked("alternate")}>
                        <span>{alternate.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance}</span>
                        <span className="choice-detail">{choiceDetail(alternate, copy)}</span>
                      </button>
                    </div>
                  ) : null}
                  {message ? <Notice message={message} closeLabel={copy.close} onClose={onDismissMessage} /> : null}
                  <div className="zoom-row">
                    <button type="button" onClick={onSave}>
                      <Bookmark aria-hidden="true" size={18} strokeWidth={2} />
                      {copy.saveTrip}
                    </button>
                    <button type="button" onClick={() => onShare(shown)}>
                      <Share2 aria-hidden="true" size={18} strokeWidth={2} />
                      {copy.shareRoute}
                    </button>
                    <button type="button" onClick={onSwap}>
                      <ArrowUpDown aria-hidden="true" size={18} strokeWidth={2} />
                      {copy.swap}
                    </button>
                  </div>
                  <CityRide copy={copy} journey={shown} lines={lines} lang={lang} />
                  {rideHasGap(shown, lines, lang) ? <p className="quiet">{copy.cityGap}</p> : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </main>
  )
}

function CityRide({
  copy,
  journey,
  lines,
  lang,
}: {
  copy: Copy
  journey: Journey
  lines: LineSequence[]
  lang: Lang
}) {
  return (
    <div className="city-ride-sheet">
      <TripMeta copy={copy} journey={journey} />
      <JourneyStats copy={copy} journey={journey} />
      <ol className="city-legs">
        {journey.legs.map((leg, index) => {
          const color = legColor(leg, lines, lang)
          const next = journey.legs[index + 1]
          return (
            <li key={`${leg.lineName}-${leg.startName}-${index}`} className="city-leg" style={{ "--leg": color } as CSSProperties}>
              <p className="city-leg-stop">{leg.startName}</p>
              <div className="ride-facts">
                <span className="line-pill" style={{ background: color, color: inkOn(color) }}>
                  {leg.lineName}
                </span>
                {leg.towards ? (
                  <p className="fact">
                    <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
                    {copy.towards(leg.towards)}
                  </p>
                ) : null}
                {leg.platform ? (
                  <p className="fact">
                    <DoorOpen aria-hidden="true" size={18} strokeWidth={2} />
                    {leg.platform}
                  </p>
                ) : null}
              </div>
              {leg.intermediateNames.length > 0 ? (
                <details className="stops-toggle">
                  <summary>
                    <span className="stops-label">
                      <List aria-hidden="true" size={18} strokeWidth={2} />
                      {copy.stationsOnTrain}
                      <span className="stops-count">{leg.intermediateNames.length}</span>
                    </span>
                    <ChevronDown className="stops-chevron" aria-hidden="true" size={18} strokeWidth={2} />
                  </summary>
                  <ol className="between">
                    {leg.intermediateNames.map((name, stopIndex) => (
                      <li key={`${name}-${stopIndex}`}>{name}</li>
                    ))}
                  </ol>
                </details>
              ) : null}
              {next ? (
                <p className="change-note">
                  <ArrowRightLeft aria-hidden="true" size={18} strokeWidth={2} />
                  {copy.changeFor(next.lineName)}
                </p>
              ) : (
                <p className="city-leg-stop city-leg-end">{leg.endName}</p>
              )}
            </li>
          )
        })}
      </ol>
      <ServiceTimes copy={copy} journey={journey} compact />
    </div>
  )
}

function choiceDetail(journey: Journey, copy: Copy): string {
  const changes = journey.changes === 0 ? copy.noChanges : copy.changeCount(journey.changes)
  if (journey.durationMinutes === null) return changes
  return `${copy.aboutMinutes(journey.durationMinutes)} · ${changes}`
}
