import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react"
import { ArrowRight, LocateFixed, X } from "lucide-react"
import type { Copy } from "../i18n/copy"
import { lineIndexFor, searchCatalog, type CatalogStation } from "../lib/dmrc/snapshot"
import { statusClock } from "../lib/status/load"
import { nearestOpen } from "../lib/status/gates"
import { nearestStation, type Coordinate } from "../lib/status/nearest"
import type { StatusPack } from "../lib/status/pack"
import type { LineSequence } from "../lib/transit/route"
import type { Suggestion } from "../lib/transit/types"

type Stop = { code: string; name: string }

export function StatusView({
  copy,
  pack,
  names,
  stations,
  lines,
  coordinates,
  here,
  locating,
  locateNote,
  onLocate,
  onPlan,
  onClear,
  initialFrom = null,
  initialDest = null,
}: {
  copy: Copy
  pack: StatusPack
  names: Map<string, string>
  stations: CatalogStation[]
  lines: LineSequence[]
  coordinates: Record<string, Coordinate>
  here: Coordinate | null
  locating: boolean
  locateNote: string | null
  onLocate: () => void
  onPlan: (from: Stop, to: Stop) => void
  onClear: () => void
  initialFrom?: string | null
  initialDest?: string | null
}) {
  const [from, setFrom] = useState<Stop | null>(() => named(initialFrom, names))
  const [dest, setDest] = useState<Stop | null>(() => named(initialDest, names))
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(-1)
  const [searchOpen, setSearchOpen] = useState(false)
  const [looked, setLooked] = useState<Stop | null>(() => named(initialFrom, names) ?? named(initialDest, names))
  const [openLine, setOpenLine] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const closedCount = Object.keys(pack.stations).length
  const openCount = Math.max(0, names.size - closedCount)
  const clock = pack.fetchedAt ? statusClock(pack.fetchedAt) : ""
  const stand = here ? nearestStation(here, coordinates) : null
  const standName = stand ? (names.get(stand.code) ?? stand.code) : null
  const fromClosed = Boolean(from && pack.stations[from.code])
  const destClosed = Boolean(dest && pack.stations[dest.code])
  const shown = looked ?? (stand && standName ? { code: stand.code, name: standName } : null)
  const shownClosed = Boolean(shown && pack.stations[shown.code])
  const shownPack = shown ? (pack.stations[shown.code] ?? null) : null
  const shownLines = shown ? (lineIndexFor(stations, "en").get(shown.code) ?? []) : []
  const fromHere = Boolean(stand && shown && shown.code === stand.code)
  const shownAlt =
    shown && shownClosed ? oneOpen(shown.code, pack, names, coordinates, lines, fromHere ? here : null) : null
  const shownAltLines = shownAlt ? (lineIndexFor(stations, "en").get(shownAlt.code) ?? []) : []
  const startOpen = oneOpen(
    from && fromClosed ? from.code : null,
    pack,
    names,
    coordinates,
    lines,
    from && stand && from.code === stand.code ? here : null,
  )
  const destOpen = dest && destClosed ? oneOpen(dest.code, pack, names, coordinates, lines, null) : null
  const openFrom = from && !fromClosed ? from : startOpen
  const openTo = dest && !destClosed ? dest : destOpen
  const ready = Boolean(openFrom && openTo && openFrom.code !== openTo.code)
  const picked = Boolean(from || dest)
  const tracks = useMemo(() => closedByLine(pack, lines, names), [pack, lines, names])
  const suggestions = useMemo(() => (query.trim() ? searchCatalog(stations, "en", query).slice(0, 8) : []), [query, stations])
  const listOpen = searchOpen && query.trim().length > 0

  function lookAt(stop: Stop, lineCode?: string | null) {
    setLooked(stop)
    setQuery("")
    setSearchOpen(false)
    setHighlight(-1)
    const onTrack = lineCode ? tracks.find((item) => item.code === lineCode) : null
    const line =
      onTrack && onTrack.stations.some((station) => station.code === stop.code)
        ? onTrack
        : tracks.find((item) => item.stations.some((station) => station.code === stop.code))
    if (line) {
      setOpenLine(line.code)
      setFocus(`${line.code}:${stop.code}`)
    } else {
      setFocus(null)
    }
  }

  function pickStart(stop: Stop) {
    const next = pack.stations[stop.code]
      ? oneOpen(
          stop.code,
          pack,
          names,
          coordinates,
          lines,
          stand && stop.code === stand.code ? here : null,
        )
      : stop
    setFrom(next ?? stop)
  }

  function pickGo(stop: Stop) {
    const next = pack.stations[stop.code]
      ? oneOpen(stop.code, pack, names, coordinates, lines, null)
      : stop
    setDest(next ?? stop)
  }

  function clearAll() {
    setFrom(null)
    setDest(null)
    setLooked(null)
    setQuery("")
    setSearchOpen(false)
    setHighlight(-1)
    setOpenLine(null)
    setFocus(null)
    onClear()
  }

  return (
    <main className="sheet split status-split">
      <div className="pane">
        <section className="status-trip">
          <p className="status-kicker">{copy.status}</p>
          <h1>{copy.statusLead}</h1>
          <div className="status-stats">
            <p>
              <strong>{closedCount}</strong>
              <span>{copy.statusClosedLabel}</span>
            </p>
            <p>
              <strong>{openCount}</strong>
              <span>{copy.statusOpenLabel}</span>
            </p>
            {clock ? (
              <p title={copy.statusFresh(clock)}>
                <strong>{clock.slice(-8, -3) || clock}</strong>
                <span>{copy.statusCheckedLabel}</span>
              </p>
            ) : null}
          </div>
          <StatusSearch
            copy={copy}
            query={query}
            suggestions={suggestions}
            highlight={highlight}
            open={listOpen}
            closedCodes={new Set(Object.keys(pack.stations))}
            onFocus={() => setSearchOpen(true)}
            onType={(value) => {
              setQuery(value)
              setSearchOpen(true)
              setHighlight(-1)
            }}
            onHighlight={setHighlight}
            onSelect={(item) => lookAt({ code: item.code, name: item.name })}
          />
          <button
            type="button"
            className="locate status-locate"
            onClick={() => {
              setLooked(null)
              onLocate()
            }}
            aria-busy={locating}
          >
            <LocateFixed aria-hidden="true" size={18} strokeWidth={2} />
            {locating ? copy.locating : copy.useLocation}
          </button>
          {locateNote ? <p className="hint">{locateNote}</p> : null}
          {shown ? (
            <article className={shownClosed ? "status-look is-closed" : "status-look"} aria-live="polite">
              <div className="status-look-head">
                <div className="status-look-who">
                  {stand && shown.code === stand.code ? <p className="status-kicker">{copy.statusNearYou}</p> : null}
                  <p className="status-look-name">
                    <LineDots lines={shownLines} />
                    <span>{shown.name}</span>
                    <span className={shownClosed ? "status-mark" : "status-mark is-open"}>
                      {shownClosed ? copy.gatesClosed : copy.statusOpen}
                    </span>
                  </p>
                </div>
                {stand && shown.code === stand.code ? <span className="status-km">{copy.statusKm(stand.km)}</span> : null}
              </div>
              {shownPack ? (
                <OfficialCopy
                  phrase={shownPack.phrase}
                  title={shownPack.title}
                  note={shownPack.note}
                  noteLabel={copy.statusNoteLabel}
                />
              ) : null}
              {shownAlt ? (
                <button
                  type="button"
                  className="status-alt"
                  onClick={() => lookAt(shownAlt)}
                  aria-label={
                    shownAlt.km == null
                      ? `${copy.statusNearestLabel}: ${shownAlt.name}`
                      : copy.statusNearest(shownAlt.name, shownAlt.km)
                  }
                >
                  <span className="status-kicker">{copy.statusNearestLabel}</span>
                  <span className="status-alt-name">
                    <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
                    <LineDots lines={shownAltLines} />
                    <span>{shownAlt.name}</span>
                    <span className="status-mark is-open">{copy.statusOpen}</span>
                    {shownAlt.km != null ? <span className="status-km">{copy.statusKm(shownAlt.km)}</span> : null}
                  </span>
                </button>
              ) : null}
              <div className="status-acts">
                <button type="button" className="status-act" onClick={() => pickStart(shown)}>
                  {copy.startHere}
                </button>
                <button type="button" className="status-act" onClick={() => pickGo(shown)}>
                  {shownAlt ? copy.statusGetOff : copy.goHere}
                </button>
              </div>
            </article>
          ) : null}
          {from || dest ? (
            <div className="status-picks">
              {from ? (
                <StopChip copy={copy} label={copy.from} stop={from} closed={fromClosed} onClear={() => setFrom(null)} />
              ) : null}
              {dest ? (
                <StopChip copy={copy} label={copy.to} stop={dest} closed={destClosed} onClear={() => setDest(null)} />
              ) : null}
            </div>
          ) : null}
          {ready || picked ? (
            <div className="zoom-row">
              {ready ? (
                <button type="button" className="primary" onClick={() => onPlan(openFrom!, openTo!)}>
                  {copy.statusShowRoute}
                </button>
              ) : null}
              <button type="button" onClick={clearAll}>
                <X aria-hidden="true" size={18} strokeWidth={2} />
                {copy.clearRoute}
              </button>
            </div>
          ) : null}
        </section>
      </div>
      <div className="pane pane-stage">
        <section className={tracks.length === 0 ? "status-board is-empty" : "status-board"}>
          <h2>{copy.statusCount(closedCount)}</h2>
          {tracks.length === 0 ? <p className="quiet">{copy.statusEmpty}</p> : null}
          <ul className="status-tracks" hidden={tracks.length === 0}>
            {tracks.map((line) => {
              const open = openLine === line.code
              return (
                <li key={line.code} className={open ? "status-track is-open" : "status-track"} style={{ "--rail": line.color } as CSSProperties}>
                  <button
                    type="button"
                    className="status-line-btn"
                    aria-expanded={open}
                    onClick={() => {
                      setOpenLine(open ? null : line.code)
                      setFocus(null)
                    }}
                  >
                    <span className="status-line-bar" aria-hidden="true" />
                    <span className="status-line-name">{line.name}</span>
                    <span className="status-line-rail" aria-hidden="true" />
                    <span className="status-group-count">{copy.statusLineClosed(line.stations.length)}</span>
                  </button>
                  <ol className="status-stops" hidden={!open}>
                    {line.stations.map((stop) => {
                      const key = `${line.code}:${stop.code}`
                      const pickedStop = focus === key
                      return (
                        <li key={stop.code}>
                          <button
                            type="button"
                            aria-pressed={pickedStop}
                            onClick={() => lookAt({ code: stop.code, name: stop.name }, line.code)}
                          >
                            {stop.name}
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}

function StatusSearch({
  copy,
  query,
  suggestions,
  highlight,
  open,
  closedCodes,
  onFocus,
  onType,
  onHighlight,
  onSelect,
}: {
  copy: Copy
  query: string
  suggestions: Suggestion[]
  highlight: number
  open: boolean
  closedCodes: Set<string>
  onFocus: () => void
  onType: (query: string) => void
  onHighlight: (index: number) => void
  onSelect: (station: Suggestion) => void
}) {
  const listId = "status-suggestions"
  const shown = open && (suggestions.length > 0 || query.trim().length > 0)

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      onHighlight(highlight + 1 >= suggestions.length ? 0 : highlight + 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      onHighlight(highlight <= 0 ? suggestions.length - 1 : highlight - 1)
    } else if (event.key === "Enter" && highlight >= 0 && suggestions[highlight]) {
      event.preventDefault()
      onSelect(suggestions[highlight])
    } else if (event.key === "Escape") {
      onHighlight(-1)
    }
  }

  return (
    <div className="field">
      <label htmlFor="status-find">{copy.findClosed}</label>
      <input
        id="status-find"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={highlight >= 0 ? `status-option-${highlight}` : undefined}
        value={query}
        placeholder={copy.searchStation}
        onFocus={onFocus}
        onChange={(event) => onType(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {shown && suggestions.length === 0 ? <p className="hint">{copy.noResults}</p> : null}
      {shown && suggestions.length > 0 ? (
        <ul id={listId} role="listbox">
          {suggestions.map((station, index) => (
            <li key={station.code} role="presentation">
              <button
                type="button"
                id={`status-option-${index}`}
                role="option"
                aria-selected={index === highlight}
                className={index === highlight ? "option active" : "option"}
                onMouseEnter={() => onHighlight(index)}
                onClick={() => onSelect(station)}
              >
                <span className="station-name">
                  {station.name}
                  <span className="station-code">{station.code}</span>
                  {closedCodes.has(station.code) ? <span className="status-mark">{copy.gatesClosed}</span> : null}
                </span>
                {station.lines.length > 0 ? (
                  <span className="line-row">
                    {station.lines.map((line) => (
                      <span key={line.code} className="line-chip">
                        <span className="swatch" style={{ background: line.color }} aria-hidden="true" />
                        {line.colorName} ({line.code})
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function StopChip({
  copy,
  label,
  stop,
  closed,
  onClear,
}: {
  copy: Copy
  label: string
  stop: Stop
  closed: boolean
  onClear: () => void
}) {
  return (
    <div className="status-chip">
      <p>
        <span className="status-kicker">{label}</span>
        <span className="status-chip-name">{stop.name}</span>
        <span className={closed ? "status-mark" : "status-mark is-open"}>{closed ? copy.gatesClosed : copy.statusOpen}</span>
      </p>
      <button type="button" className="status-act" onClick={onClear}>
        {copy.statusChangeStop}
      </button>
    </div>
  )
}

function OfficialCopy({
  phrase,
  title,
  note,
  noteLabel,
}: {
  phrase: string | null
  title: string | null
  note: string | null
  noteLabel: string
}) {
  const extraPhrase = phrase && phrase !== "Station Closed" ? phrase : null
  if (!extraPhrase && !title && !note) return null
  return (
    <div className="status-official">
      {title ? <p className="status-kicker">{title}</p> : note ? <p className="status-kicker">{noteLabel}</p> : null}
      {extraPhrase ? <p>{extraPhrase}</p> : null}
      {note ? <p>{note}</p> : null}
    </div>
  )
}

function LineDots({ lines }: { lines: { code: string; color: string; colorName: string }[] }) {
  if (lines.length === 0) return null
  return (
    <span className="line-dots" aria-hidden="true">
      {lines.map((line) => (
        <span key={line.code} className="line-dot" style={{ background: line.color }} title={line.colorName} />
      ))}
    </span>
  )
}

function named(code: string | null | undefined, names: Map<string, string>): Stop | null {
  if (!code) return null
  const name = names.get(code)
  return name ? { code, name } : { code, name: code }
}

function oneOpen(
  code: string | null,
  pack: StatusPack,
  names: Map<string, string>,
  coordinates: Record<string, Coordinate>,
  lines: LineSequence[],
  here: Coordinate | null,
): (Stop & { km: number | null }) | null {
  if (!code) return null
  const next = nearestOpen(code, pack, lines, coordinates, here)
  if (!next) return null
  return { code: next.code, name: names.get(next.code) ?? next.code, km: next.km }
}

function closedByLine(pack: StatusPack, lines: LineSequence[], names: Map<string, string>) {
  return lines
    .filter((line) => line.show)
    .map((line) => {
      const seen = new Set<string>()
      const stations = []
      for (const stop of line.stations) {
        if (!pack.stations[stop.code] || seen.has(stop.code)) continue
        seen.add(stop.code)
        stations.push({
          code: stop.code,
          name: names.get(stop.code) ?? stop.names.en ?? stop.code,
        })
      }
      return {
        code: line.code,
        name: line.label.en.colorName || line.label.en.name,
        color: line.label.en.color || "#5c6570",
        stations,
      }
    })
    .filter((line) => line.stations.length > 0)
}
