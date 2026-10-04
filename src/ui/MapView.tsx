import { useEffect, useMemo, useState } from "react"
import type { Copy } from "../i18n/copy"
import type { StationBrief } from "../lib/station/brief"
import { stationBrief } from "../lib/station/briefs"
import { legColor, matchingLine } from "../lib/transit/legStyle"
import type { LineSequence } from "../lib/transit/route"
import type { Journey, Lang } from "../lib/transit/types"
import { RouteBoard } from "./RouteBoard"
import { RouteMap } from "./RouteMap"
import { ServiceTimes } from "./PlanView"

export function MapView({
  copy,
  lang,
  lines,
  interchangeCodes,
  highlightCodes,
  journey = null,
  focusLineCode,
  focusToken,
  onStart,
  onGo,
}: {
  copy: Copy
  lang: Lang
  lines: LineSequence[]
  interchangeCodes: Set<string>
  highlightCodes: Set<string>
  journey?: Journey | null
  focusLineCode: string | null
  focusToken: number
  onStart: (code: string, name: string) => void
  onGo: (code: string, name: string) => void
}) {
  const visible = lines.filter((line) => line.show && line.stations.length > 0)
  const [lineCode, setLineCode] = useState(focusLineCode ?? visible[0]?.code ?? "")
  useEffect(() => {
    if (focusToken > 0 && focusLineCode) setLineCode(focusLineCode)
  }, [focusToken, focusLineCode])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [brief, setBrief] = useState<StationBrief | null>(null)
  const [briefState, setBriefState] = useState<"idle" | "loading" | "missing" | "ready">("idle")
  const line = visible.find((item) => item.code === lineCode) ?? visible[0]
  const stations = line?.stations ?? []
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return stations
    return stations.filter((station) => {
      const name = station.names[lang] ?? station.names.en ?? station.code
      return name.toLocaleLowerCase().includes(needle) || station.code.toLocaleLowerCase().includes(needle)
    })
  }, [stations, query, lang])
  const selectedStation = stations.find((station) => station.code === selected) ?? null
  const selectedName = selectedStation
    ? (selectedStation.names[lang] ?? selectedStation.names.en ?? selectedStation.code)
    : ""

  useEffect(() => {
    if (!selected) {
      setBrief(null)
      setBriefState("idle")
      return
    }
    const parsed = stationBrief(selected)
    setBrief(parsed)
    setBriefState(parsed ? "ready" : "missing")
  }, [selected])

  useEffect(() => {
    const frame = document.querySelector(".map-frame")
    if (!frame) return
    const index = stations.findIndex((station) => highlightCodes.has(station.code))
    if (index < 0) return
    frame.scrollTop = Math.max(0, index * 64 * scale - 48)
  }, [lineCode, focusToken, scale, stations, highlightCodes])

  if (!line) {
    return (
      <main className="sheet">
        <h1>{copy.map}</h1>
      </main>
    )
  }

  const label = line.label[lang].colorName || line.label.en.colorName
  const gap = 64
  const height = Math.max(stations.length, 1) * gap

  return (
    <main className={journey ? "sheet split map-split has-route" : "sheet split map-split"}>
      <div className="map-intro">
      <h1>{copy.map}</h1>
      <p>{highlightCodes.size > 0 ? copy.mapOnRoute : copy.mapLead}</p>
      <label htmlFor="map-line">{copy.lineLabel}</label>
      <select
        id="map-line"
        value={line.code}
        onChange={(event) => {
          setLineCode(event.target.value)
          setSelected(null)
          setQuery("")
        }}
      >
        {visible.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label[lang].colorName || item.label.en.colorName} ({item.code})
          </option>
        ))}
      </select>
      </div>
      <div className="map-stage">
      {journey && journey.legs.length > 0 ? <RouteMap copy={copy} journey={journey} lines={lines} lang={lang} /> : null}
      {journey && journey.legs.length > 0 ? (
        <div className="route-on-map">
          <p className="map-route-title">
            <span className="place-name">{journey.originName}</span>
            <span aria-hidden="true"> → </span>
            <span className="place-name">{journey.destinationName}</span>
          </p>
          <RouteBoard journey={journey} lines={lines} lang={lang} />
          <div className="route-lines">
            {journey.legs.map((leg, index) => {
              const match = matchingLine(leg, lines, lang)
              const color = legColor(leg, lines, lang)
              if (!match) return null
              return (
                <button
                  key={`${match.code}-${index}`}
                  type="button"
                  aria-pressed={line.code === match.code}
                  onClick={() => {
                    setLineCode(match.code)
                    setSelected(null)
                    setQuery("")
                  }}
                >
                  <span className="swatch" style={{ background: color }} aria-hidden="true" />
                  {match.label[lang].colorName || match.label.en.colorName}
                </button>
              )
            })}
          </div>
          <ServiceTimes copy={copy} journey={journey} compact />
        </div>
      ) : null}
      <p className="line-banner" style={{ background: line.label.en.color }}>
        <span className="line-banner-name">
          {label} ({line.code})
        </span>
      </p>
      <div className="zoom-row">
        <button type="button" onClick={() => setScale((value) => Math.min(2.4, value + 0.2))}>
          {copy.zoomIn}
        </button>
        <button type="button" onClick={() => setScale((value) => Math.max(0.8, value - 0.2))}>
          {copy.zoomOut}
        </button>
        <button type="button" onClick={() => setScale(1)}>
          {copy.zoomReset}
        </button>
      </div>
      <div className="map-frame" aria-hidden="true">
        <svg
          className="schematic"
          viewBox={`0 0 420 ${height}`}
          style={{ height: `${height * scale}px` }}
          role="img"
        >
          <line x1="36" y1="32" x2="36" y2={height - 32} stroke={line.label.en.color} strokeWidth="8" />
          {stations.map((station, index) => {
            const y = 32 + index * gap
            const name = station.names[lang] ?? station.names.en ?? station.code
            return (
              <g key={station.code} transform={`translate(0 ${y})`}>
                <circle
                  cx="36"
                  cy="0"
                  r={interchangeCodes.has(station.code) ? 11 : 7}
                  fill={
                    highlightCodes.has(station.code)
                      ? line.label.en.color
                      : selected === station.code
                        ? "#1c1915"
                        : "#fffdf8"
                  }
                  stroke="#1c1915"
                  strokeWidth="3"
                />
                <text x="60" y="6" fill="#1c1915" fontSize="18">
                  {name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      </div>
      <div className="map-list">
      <label htmlFor="map-find">{copy.findOnLine}</label>
      <input id="map-find" value={query} onChange={(event) => setQuery(event.target.value)} />
      {selectedStation ? (
        <div className="station-actions">
          <button type="button" onClick={() => onStart(selectedStation.code, selectedName)}>
            {copy.startHere}
          </button>
          <button type="button" onClick={() => onGo(selectedStation.code, selectedName)}>
            {copy.goHere}
          </button>
        </div>
      ) : null}
      {selectedStation ? (
        <section className="ticket">
          <h2>{selectedName}</h2>
          {briefState === "missing" ? <p>{copy.noBrief}</p> : null}
          {briefState === "ready" && brief ? <BriefDetails copy={copy} brief={brief} /> : null}
        </section>
      ) : null}
      <ul className="station-list">
        {filtered.map((station) => {
          const name = station.names[lang] ?? station.names.en ?? station.code
          return (
            <li key={station.code}>
              <button
                type="button"
                aria-pressed={selected === station.code}
                onClick={() => setSelected(station.code)}
              >
                {name}
                {highlightCodes.has(station.code) ? <span className="quiet"> {copy.onRoute}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
      </div>
    </main>
  )
}

function BriefDetails({ copy, brief }: { copy: Copy; brief: StationBrief }) {
  return (
    <>
      <ul className="line-row">
        {brief.lines.map((line) => (
          <li key={line.code} className="line-chip">
            <span className="swatch" style={{ background: line.color }} aria-hidden="true" />
            {line.colorName} ({line.code})
          </li>
        ))}
      </ul>
      <h3>{copy.gates}</h3>
      {brief.gateCodes.length > 0 ? (
        <ul>
          {brief.gateCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      ) : (
        <p>{copy.gatesMissing}</p>
      )}
      <h3>{copy.listedFacilities}</h3>
      {brief.facilities.length > 0 ? (
        <ul>
          {brief.facilities.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : (
        <p>{copy.notVerified}</p>
      )}
      <h3>{copy.liftsHeading}</h3>
      <p className="quiet">{copy.notLiveLift}</p>
      {brief.lifts.length > 0 ? (
        <ul>
          {brief.lifts.map((lift) => (
            <li key={`${lift.type}-${lift.name}-${lift.location}`}>
              {lift.name || lift.type}. {lift.location}.{" "}
              {lift.listedWorking === null
                ? copy.notVerified
                : lift.listedWorking
                  ? copy.listedWorking
                  : copy.listedNotWorking}
              {lift.lastUpdate ? ` (${lift.lastUpdate})` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>{copy.notVerified}</p>
      )}
      <h3>{copy.stepFree}</h3>
      <p>{copy.notVerified}</p>
    </>
  )
}
