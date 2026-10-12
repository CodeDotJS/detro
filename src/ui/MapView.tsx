import { useEffect, useRef, useState } from "react"
import type { Copy } from "../i18n/copy"
import type { StationBrief } from "../lib/station/brief"
import { stationBrief } from "../lib/station/briefs"
import type { LineSequence } from "../lib/transit/route"
import type { Lang } from "../lib/transit/types"
import { MapMaze } from "./MapMaze"

export function MapView({
  copy,
  lang,
  lines,
  interchangeCodes,
  highlightCodes,
  focusLineCode,
  focusToken,
  closedCodes = new Set(),
}: {
  copy: Copy
  lang: Lang
  lines: LineSequence[]
  interchangeCodes: Set<string>
  highlightCodes: Set<string>
  focusLineCode: string | null
  focusToken: number
  closedCodes?: Set<string>
}) {
  const visible = lines.filter((line) => line.show && line.stations.length > 0)
  const [lineCode, setLineCode] = useState(focusLineCode ?? visible[0]?.code ?? "")
  /** null = every line colored on the maze; a code greys the rest. */
  const [mazeFocus, setMazeFocus] = useState<string | null>(focusLineCode)
  /** Bumped on swatch click so the maze rebuilds; mount builds once at 0. */
  const [mazeRebuild, setMazeRebuild] = useState(0)
  useEffect(() => {
    if (focusToken > 0 && focusLineCode) {
      setLineCode(focusLineCode)
      setMazeFocus(focusLineCode)
    }
  }, [focusToken, focusLineCode])
  const [selected, setSelected] = useState<string | null>(null)
  const [brief, setBrief] = useState<StationBrief | null>(null)
  const [briefState, setBriefState] = useState<"idle" | "missing" | "ready">("idle")
  const chartRef = useRef<HTMLOListElement>(null)
  const scrolledFocus = useRef(0)

  const line = visible.find((item) => item.code === lineCode) ?? visible[0]
  const stations = line?.stations ?? []
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
    if (!stations.some((station) => station.code === selected)) {
      setSelected(null)
      setBrief(null)
      setBriefState("idle")
      return
    }
    const parsed = stationBrief(selected)
    setBrief(parsed)
    setBriefState(parsed ? "ready" : "missing")
  }, [selected, stations])

  useEffect(() => {
    if (focusToken <= 0 || focusToken === scrolledFocus.current) return
    scrolledFocus.current = focusToken
    const list = chartRef.current
    if (!list) return
    const index = stations.findIndex((station) => highlightCodes.has(station.code))
    if (index < 0) return
    const row = list.children[index] as HTMLElement | undefined
    if (!row) return
    list.scrollTop = Math.max(0, row.offsetTop - 16)
  }, [focusToken, stations, highlightCodes])

  if (!line) {
    return (
      <main className="sheet">
        <h1>{copy.lines}</h1>
      </main>
    )
  }

  const label = line.label[lang].colorName || line.label.en.colorName
  const color = line.label.en.color

  return (
    <main className="sheet split map-split">
      <div className="map-pane">
        <h1>{copy.lines}</h1>
        <p>{highlightCodes.size > 0 ? copy.mapOnRoute : copy.mapLead}</p>
        <div className="map-line-swatches" role="group" aria-label={copy.lineLabel}>
          {visible.map((item) => {
            const name = item.label[lang].colorName || item.label.en.colorName
            const swatch = item.label.en.color
            const pressed = mazeFocus === item.code
            return (
              <button
                key={item.code}
                type="button"
                className="map-line-swatch"
                aria-label={name}
                aria-pressed={pressed}
                title={name}
                onClick={() => {
                  if (mazeFocus === item.code) setMazeFocus(null)
                  else setMazeFocus(item.code)
                  setMazeRebuild((n) => n + 1)
                  setLineCode(item.code)
                  setSelected(null)
                  if (chartRef.current) chartRef.current.scrollTop = 0
                }}
              >
                <span className="map-line-swatch-face" style={{ background: swatch }} />
              </button>
            )
          })}
        </div>
        <p className="line-banner" style={{ background: color }}>
          <span className="line-banner-name">
            {label} ({line.code})
          </span>
        </p>
        <ol className="map-line-chart" ref={chartRef} style={{ ["--line-color" as string]: color }}>
          {stations.map((station, index) => {
            const name = station.names[lang] ?? station.names.en ?? station.code
            const hub = interchangeCodes.has(station.code)
            const closed = closedCodes.has(station.code)
            const onRoute = highlightCodes.has(station.code)
            const pressed = selected === station.code
            return (
              <li key={station.code}>
                <button type="button" aria-pressed={pressed} onClick={() => setSelected(station.code)}>
                  <span className="map-rail" aria-hidden="true">
                    <span
                      className={hub ? "map-dot is-hub" : "map-dot"}
                      style={{
                        background: closed
                          ? "var(--card)"
                          : onRoute || pressed
                            ? color
                            : "var(--halo)",
                      }}
                    />
                    {index < stations.length - 1 ? <span className="map-stem" /> : null}
                  </span>
                  <span className="map-stop">
                    <span className="map-stop-name">{name}</span>
                    <span className={closed ? "status-mark" : "status-mark is-open"}>
                      {closed ? copy.gatesClosed : copy.statusOpen}
                    </span>
                    {onRoute ? <span className="quiet"> {copy.onRoute}</span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="map-detail">
        {selectedStation ? (
          <section className="map-station">
            <h2>
              {selectedName}
              <span
                className={
                  closedCodes.has(selectedStation.code) ? "status-mark" : "status-mark is-open"
                }
              >
                {closedCodes.has(selectedStation.code) ? copy.gatesClosed : copy.statusOpen}
              </span>
            </h2>
            {briefState === "missing" ? <p>{copy.noBrief}</p> : null}
            {briefState === "ready" && brief ? <BriefDetails copy={copy} brief={brief} /> : null}
          </section>
        ) : (
          <div className="map-detail-stage">
            <MapMaze
              lines={visible.map((item) => ({
                code: item.code,
                color: item.label.en.color,
                stations: item.stations.length,
              }))}
              focusedLineCode={mazeFocus}
              rebuildKey={mazeRebuild}
              label={copy.mapPickStation}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function BriefDetails({ copy, brief }: { copy: Copy; brief: StationBrief }) {
  return (
    <>
      <ul className="line-row">
        {brief.lines.map((item) => (
          <li key={item.code} className="line-chip">
            <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
            {item.colorName} ({item.code})
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
