import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react"
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  DoorOpen,
  IndianRupee,
  List,
  Map,
  Share2,
  X,
  Shuffle,
  Signpost,
  Sunrise,
  Sunset,
} from "lucide-react"
import type { Copy } from "../i18n/copy"
import type { PlanState } from "../lib/plan/state"
import { formatClock } from "../lib/transit/clock"
import { inkOn, legColor } from "../lib/transit/legStyle"
import type { LineSequence } from "../lib/transit/route"
import type { Journey, Lang, ServiceTrain } from "../lib/transit/types"
import { measureSwap, playSwap, type SwapDelta } from "./flipSwap"
import { MetroScene } from "./MetroScene"
import { Notice } from "./Notice"
import { RouteBoard } from "./RouteBoard"

type Field = "from" | "to"

type Props = {
  copy: Copy
  lang: Lang
  state: PlanState
  phase: "idle" | "loading" | "ready" | "error"
  message: string | null
  journey: Journey | null
  alternate?: Journey | null
  placedField?: Field | null
  onType: (field: Field, query: string) => void
  onFocus: (field: Field) => void
  onSelect: (field: Field, code: string) => void
  onHighlight: (index: number) => void
  onSwap: () => void
  onSubmit: () => void
  onSave?: () => void
  saved?: boolean
  onShare?: (journey: Journey) => void
  onViewMap?: (journey: Journey) => void
  onClearRoute?: () => void
  onDismissMessage?: () => void
  lines?: LineSequence[]
}

export function PlanView({
  copy,
  lang,
  state,
  phase,
  message,
  journey,
  alternate = null,
  placedField = null,
  onType,
  onFocus,
  onSelect,
  onHighlight,
  onSwap,
  onSubmit,
  onSave,
  saved = false,
  onShare,
  onViewMap,
  onClearRoute,
  onDismissMessage = () => undefined,
  lines = [],
}: Props) {
  const [picked, setPicked] = useState<"primary" | "alternate">("primary")
  const [swapTurn, setSwapTurn] = useState(0)
  const swapMove = useRef<{ fields: SwapDelta | null; dots: SwapDelta | null } | null>(null)
  useLayoutEffect(() => {
    const move = swapMove.current
    if (!move) return
    swapMove.current = null
    playSwap(document.getElementById("from"), document.getElementById("to"), move.fields)
    playSwap(
      document.querySelector("#from")?.closest(".field")?.querySelector(".line-dots") ?? null,
      document.querySelector("#to")?.closest(".field")?.querySelector(".line-dots") ?? null,
      move.dots,
    )
  }, [swapTurn])
  useEffect(() => {
    setPicked("primary")
  }, [journey, alternate])
  const shown = picked === "alternate" && alternate ? alternate : journey
  useEffect(() => {
    if (!placedField) return
    document.querySelector(".notice")?.scrollIntoView({ block: "start" })
  }, [placedField, message])

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  const result =
    shown && phase !== "error" ? (
      <div className="result" aria-live="polite">
        {alternate && journey ? (
          <div className="choices" role="group" aria-label={copy.routeOptions}>
            <Choice
              pressed={picked === "primary"}
              label={journey.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance}
              detail={choiceDetail(journey, copy)}
              onPick={() => setPicked("primary")}
            />
            <Choice
              pressed={picked === "alternate"}
              label={alternate.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance}
              detail={choiceDetail(alternate, copy)}
              onPick={() => setPicked("alternate")}
            />
          </div>
        ) : null}
        <div className="zoom-row">
          <SaveTripButton copy={copy} saved={saved} onSave={onSave} />
          <button type="button" onClick={() => onShare?.(shown)}>
            <Share2 aria-hidden="true" size={18} strokeWidth={2} />
            {copy.shareRoute}
          </button>
          <button type="button" onClick={() => onViewMap?.(shown)}>
            <Map aria-hidden="true" size={18} strokeWidth={2} />
            {copy.viewOnMap}
          </button>
          <button type="button" onClick={onClearRoute}>
            <X aria-hidden="true" size={18} strokeWidth={2} />
            {copy.clearRoute}
          </button>
        </div>
        <JourneyCard copy={copy} journey={shown} lines={lines} lang={lang} />
      </div>
    ) : null

  return (
    <main className="sheet split">
      <div className="pane">
      {message ? <Notice message={message} closeLabel={copy.close} onClose={onDismissMessage} /> : null}
      <form className="planner" onSubmit={submit}>
        <h1>{copy.heading}</h1>
        <p className="lede">{copy.lede}</p>
        <StationField
          field="from"
          placed={placedField === "from"}
          copy={copy}
          state={state}
          lines={lines}
          lang={lang}
          onType={onType}
          onFocus={onFocus}
          onSelect={onSelect}
          onHighlight={onHighlight}
        />
        <div className="swap-row">
          <button
            type="button"
            className="swap"
            onClick={() => {
              swapMove.current = {
                fields: measureSwap(document.getElementById("from"), document.getElementById("to")),
                dots: measureSwap(
                  document.querySelector("#from")?.closest(".field")?.querySelector(".line-dots") ?? null,
                  document.querySelector("#to")?.closest(".field")?.querySelector(".line-dots") ?? null,
                ),
              }
              setSwapTurn((turn) => turn + 1)
              onSwap()
            }}
          >
            <ArrowUpDown aria-hidden="true" size={18} strokeWidth={1.75} style={{ transform: `rotate(${swapTurn * 180}deg)` }} />
            {copy.swap}
          </button>
        </div>
        <StationField
          field="to"
          placed={placedField === "to"}
          copy={copy}
          state={state}
          lines={lines}
          lang={lang}
          onType={onType}
          onFocus={onFocus}
          onSelect={onSelect}
          onHighlight={onHighlight}
        />
        <button type="submit" className="primary" disabled={phase === "loading"}>
          {phase === "loading" ? copy.loadingRoute : copy.showRoute}
        </button>
      </form>
      </div>
      <div className="pane pane-stage">
        {result ?? <RideStage />}
      </div>
      <Landmarks copy={copy} />
    </main>
  )
}

const landmarks = [
  ["taj-mahal", "Taj Mahal"],
  ["eiffel-tower", "Eiffel Tower"],
  ["statue-of-liberty", "Statue of Liberty"],
  ["colosseum", "Colosseum"],
  ["big-ben", "Big Ben"],
  ["sydney-opera-house", "Sydney Opera House"],
  ["christ-the-redeemer", "Christ the Redeemer"],
  ["great-wall", "Great Wall"],
  ["pyramid", "Pyramid"],
  ["sphinx", "Sphinx"],
  ["parthenon", "Parthenon"],
  ["burj-al-arab", "Burj Al Arab"],
  ["mount-fuji", "Mount Fuji"],
  ["stonehenge", "Stonehenge"],
  ["arc-de-triomphe", "Arc de Triomphe"],
  ["leaning-tower-of-pisa", "Leaning Tower of Pisa"],
  ["london-bridge", "London Bridge"],
  ["japanese-shrine", "Japanese shrine"],
  ["easter-island", "Easter Island"],
  ["pearl-of-the-orient", "Pearl of the Orient"],
] as const

function Landmarks({ copy }: { copy: Copy }) {
  const [playing, setPlaying] = useState<ReadonlySet<string>>(() => new Set())
  function toggle(file: string) {
    setPlaying((current) => {
      const next = new Set(current)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }
  return (
    <section className="landmarks" aria-label="Famous places">
      <ul>
        {landmarks.map(([file, name]) => {
          const on = playing.has(file)
          return (
            <li key={file}>
              <button
                type="button"
                className={on ? "landmark is-playing" : "landmark"}
                aria-pressed={on}
                aria-label={on ? copy.landmarkPause(name) : copy.landmarkPlay(name)}
                onClick={() => toggle(file)}
              >
                <img src={`/attractions/${file}.svg`} alt="" width={36} height={36} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RideStage() {
  return (
    <section className="ride-stage">
      <p className="ride-line">Two stations. One ride.</p>
      <MetroScene />
    </section>
  )
}

function lineColors(code: string, lines: LineSequence[], lang: Lang): Array<{ color: string; colorName: string }> {
  const seen = new Set<string>()
  const dots: Array<{ color: string; colorName: string }> = []
  for (const line of lines) {
    if (!line.show || !line.stations.some((station) => station.code === code)) continue
    const label = line.label[lang] ?? line.label.en
    if (!label.color || seen.has(label.color)) continue
    seen.add(label.color)
    dots.push({ color: label.color, colorName: label.colorName })
  }
  return dots
}

function choiceDetail(journey: Journey, copy: Copy): string {
  const changes = journey.changes === 0 ? copy.noChanges : copy.changeCount(journey.changes)
  if (journey.durationMinutes === null) return changes
  return `${copy.aboutMinutes(journey.durationMinutes)} · ${changes}`
}

function Choice({
  pressed,
  label,
  detail,
  onPick,
}: {
  pressed: boolean
  label: string
  detail: string | null
  onPick: () => void
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onPick}>
      <span>{label}</span>
      {detail ? <span className="choice-detail">{detail}</span> : null}
    </button>
  )
}

function StationField({
  field,
  placed = false,
  copy,
  state,
  lines,
  lang,
  onType,
  onFocus,
  onSelect,
  onHighlight,
}: {
  field: Field
  placed?: boolean
  copy: Copy
  state: PlanState
  lines: LineSequence[]
  lang: Lang
  onType: (field: Field, query: string) => void
  onFocus: (field: Field) => void
  onSelect: (field: Field, code: string) => void
  onHighlight: (index: number) => void
}) {
  const active = state.activeField === field
  const listId = `${field}-suggestions`
  const query = field === "from" ? state.fromQuery : state.toQuery
  const pick = field === "from" ? state.from : state.to
  const stationLines = pick ? lineColors(pick.code, lines, lang) : []
  const open = active && (state.suggestionStatus === "ready" || state.suggestionStatus === "empty" || state.suggestionStatus === "loading" || state.suggestionStatus === "error")

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!active) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      onHighlight(state.highlight + 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      onHighlight(state.highlight < 0 ? 0 : state.highlight - 1)
    } else if (event.key === "Enter" && state.highlight >= 0 && state.suggestions[state.highlight]) {
      event.preventDefault()
      onSelect(field, state.suggestions[state.highlight].code)
    } else if (event.key === "Escape") {
      onHighlight(-1)
    }
  }

  return (
    <div className={placed ? "field field-placed" : "field"}>
      <label htmlFor={field}>
        <span>{field === "from" ? copy.from : copy.to}</span>
        {stationLines.length > 0 ? (
          <span className="line-dots" aria-hidden="true">
            {stationLines.map((line) => (
              <span key={line.color} className="line-dot" style={{ background: line.color }} title={line.colorName} />
            ))}
          </span>
        ) : null}
      </label>
      <input
        id={field}
        name={field}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && state.suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={
          active && state.highlight >= 0 ? `${field}-option-${state.highlight}` : undefined
        }
        value={query}
        placeholder={copy.searchStation}
        onFocus={() => onFocus(field)}
        onChange={(event) => onType(field, event.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && state.suggestionStatus === "loading" ? <p className="hint">{copy.searching}</p> : null}
      {open && state.suggestionStatus === "empty" ? <p className="hint">{copy.noResults}</p> : null}
      {open && state.suggestionStatus === "error" ? <p className="hint">{copy.searchError}</p> : null}
      {open && state.suggestions.length > 0 ? (
        <ul id={listId} role="listbox">
          {state.suggestions.map((station, index) => (
            <li key={station.code} role="presentation">
              <button
                type="button"
                id={`${field}-option-${index}`}
                role="option"
                aria-selected={index === state.highlight}
                className={index === state.highlight ? "option active" : "option"}
                onMouseEnter={() => onHighlight(index)}
                onClick={() => onSelect(field, station.code)}
              >
                <span className="station-name">
                  {station.name}
                  <span className="station-code">{station.code}</span>
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

function Clock() {
  return (
    <svg className="clock" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" fill="var(--shade)" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="12" x2="9.1" y2="9.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <g className="clock-minute">
        <line x1="12" y1="12.6" x2="12" y2="5.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  )
}

export function TripMeta({ copy, journey }: { copy: Copy; journey: Journey }) {
  const label = journey.criterion === "fewest-changes" ? copy.fewestChanges : copy.leastDistance
  return (
    <p className="criterion">
      <span className="criterion-kind">{label}</span>
      {journey.durationMinutes !== null ? (
        <span className="sr-only">, </span>
      ) : null}
      {journey.durationMinutes !== null ? (
        <span className="criterion-time">
          <Clock />
          {copy.aboutMinutes(journey.durationMinutes)}
        </span>
      ) : null}
    </p>
  )
}

export function JourneyCard({
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
    <article className="itinerary">
      <RouteBoard journey={journey} lines={lines} lang={lang} />
      <h2>
        <span className="sr-only">{copy.from} </span>
        <span className="place-name">{journey.originName}</span>
        <span aria-hidden="true"> → </span>
        <span className="sr-only"> {copy.to} </span>
        <span className="place-name">{journey.destinationName}</span>
      </h2>
      <TripMeta copy={copy} journey={journey} />
      <JourneyStats copy={copy} journey={journey} />
      <ol className="timeline">
        {journey.legs.map((leg, index) => {
          const color = legColor(leg, lines, lang)
          const next = journey.legs[index + 1]
          return (
            <li key={`${leg.lineName}-${leg.startName}-${index}`} className="ride" style={{ "--leg": color } as CSSProperties}>
              <p className="stop-name">{leg.startName}</p>
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
                <p className="stop-name arrive">{leg.endName}</p>
              )}
            </li>
          )
        })}
      </ol>
      <ServiceTimes copy={copy} journey={journey} />
    </article>
  )
}

export function ServiceTimes({ copy, journey, compact = false }: { copy: Copy; journey: Journey; compact?: boolean }) {
  const first = face(journey.trains.first)
  const last = face(journey.trains.last)
  if (!first && !last) return null
  if (compact) {
    return (
      <p className="departures-strip">
        <span className="sr-only">{copy.serviceTimesNote}</span>
        {first ? <TrainStrip copy={copy} label={copy.firstTrain} train={first} icon={Sunrise} /> : null}
        {last ? <TrainStrip copy={copy} label={copy.lastTrain} train={last} icon={Sunset} /> : null}
      </p>
    )
  }
  return (
    <section className="departures" aria-label={copy.scheduled}>
      <p className="sr-only">{copy.serviceTimesNote}</p>
      <p className="depart-kicker">{copy.scheduled}</p>
      <div className={first && last ? "depart-pair" : "depart-pair depart-single"}>
        {first ? <TrainFace copy={copy} label={copy.firstTrain} train={first} icon={Sunrise} /> : null}
        {first && last ? <span className="depart-rule" aria-hidden="true" /> : null}
        {last ? <TrainFace copy={copy} label={copy.lastTrain} train={last} icon={Sunset} /> : null}
      </div>
    </section>
  )
}

function face(train: ServiceTrain | null): { depart: string; arrive: string; time: string; period: string } | null {
  if (!train) return null
  const depart = formatClock(train.depart)
  const arrive = formatClock(train.arrive)
  if (!depart || !arrive) return null
  const [time, period] = depart.split(" ")
  if (!time || !period) return null
  return { depart, arrive, time, period }
}

function TrainFace({
  copy,
  label,
  train,
  icon: Icon,
}: {
  copy: Copy
  label: string
  train: { time: string; period: string; arrive: string }
  icon: typeof Sunrise
}) {
  return (
    <div>
      <p className="depart-label">
        <Icon aria-hidden="true" size={16} strokeWidth={2} />
        {label}
      </p>
      <p className="depart-clock">
        <span>{train.time}</span> <span className="meridiem">{train.period}</span>
      </p>
      <p className="depart-arrive">{copy.arrivesAt(train.arrive)}</p>
    </div>
  )
}

function TrainStrip({
  copy,
  label,
  train,
  icon: Icon,
}: {
  copy: Copy
  label: string
  train: { depart: string; arrive: string }
  icon: typeof Sunrise
}) {
  return (
    <span>
      <span className="depart-label">
        <Icon aria-hidden="true" size={16} strokeWidth={2} />
        {label}
      </span>{" "}
      <strong>{train.depart}</strong> <span className="depart-arrive">{copy.arrivesAt(train.arrive)}</span>
    </span>
  )
}

export function SaveTripButton({
  copy,
  saved,
  onSave,
}: {
  copy: Copy
  saved: boolean
  onSave?: () => void
}) {
  const [pop, setPop] = useState(false)
  const previous = useRef(saved)
  useEffect(() => {
    if (saved && !previous.current) {
      setPop(true)
      const id = window.setTimeout(() => setPop(false), 420)
      previous.current = true
      return () => window.clearTimeout(id)
    }
    previous.current = saved
  }, [saved])
  const tone = pop ? "save-trip is-saved is-pop" : saved ? "save-trip is-saved" : "save-trip"
  return (
    <button type="button" className={tone} aria-pressed={saved} onClick={onSave}>
      <Bookmark aria-hidden="true" size={18} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
      {saved ? copy.saved : copy.saveTrip}
    </button>
  )
}

function totalStops(journey: Journey): number | null {
  if (journey.legs.some((leg) => leg.rideStops === null)) return null
  return journey.legs.reduce((sum, leg) => sum + (leg.rideStops ?? 0), 0)
}

export function JourneyStats({ copy, journey }: { copy: Copy; journey: Journey }) {
  const stops = totalStops(journey)
  return (
    <div className="stat-row">
      <dl className="stats fare-stats">
        <FareTiles copy={copy} journey={journey} />
      </dl>
      <dl className="stats count-stats">
        <div className="stat-stops">
          <dt>
            <span className="stat-icon">
              <Signpost aria-hidden="true" size={16} strokeWidth={2} />
            </span>
            <span>{copy.stopsLabel}</span>
          </dt>
          <dd>{stops === null ? copy.timingUnavailable : copy.stopCount(stops)}</dd>
        </div>
        <div className="stat-changes">
          <dt>
            <span className="stat-icon">
              <Shuffle aria-hidden="true" size={16} strokeWidth={2} />
            </span>
            <span>{copy.changesLabel}</span>
          </dt>
          <dd>{journey.changes === 0 ? copy.noChanges : copy.changeCount(journey.changes)}</dd>
        </div>
      </dl>
    </div>
  )
}

function FareTiles({ copy, journey }: { copy: Copy; journey: Journey }) {
  if (journey.fare.kind === "weekday-weekend") {
    return (
      <>
        <div className="stat-fare stat-weekday">
          <dt>
            <span className="stat-icon">
              <IndianRupee aria-hidden="true" size={16} strokeWidth={2} />
            </span>
            <span>{copy.weekdayFare}</span>
          </dt>
          <dd>₹{journey.fare.weekday}</dd>
        </div>
        <div className="stat-fare stat-weekend">
          <dt>
            <span className="stat-icon">
              <IndianRupee aria-hidden="true" size={16} strokeWidth={2} />
            </span>
            <span>{copy.weekendFare}</span>
          </dt>
          <dd>₹{journey.fare.weekend}</dd>
        </div>
      </>
    )
  }
  const value = journey.fare.kind === "untyped" ? `₹${journey.fare.amount}` : copy.fareUnavailable
  return (
    <div className="stat-fare fare-single">
      <dt>
        <span className="stat-icon">
          <IndianRupee aria-hidden="true" size={16} strokeWidth={2} />
        </span>
        <span>{copy.fareLabel}</span>
      </dt>
      <dd>{value}</dd>
    </div>
  )
}
