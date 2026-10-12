import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Radio, X } from "lucide-react"
import type { Copy } from "../i18n/copy"
import type { LineChip } from "../lib/transit/types"
import {
  chartSeries,
  formatHistoryDate,
  historyRangeOptions,
  type HistoryDay,
  type HistoryRange,
  type HistoryRangeOption,
  type StatusHistory,
} from "../lib/status/history"
import { statusClock } from "../lib/status/load"

export function StatusHistoryPanel({
  copy,
  history,
  lineByCode,
}: {
  copy: Copy
  history: StatusHistory
  lineByCode: Map<string, LineChip[]>
}) {
  const options = useMemo(() => historyRangeOptions(history), [history])
  const [range, setRange] = useState<HistoryRange>(() => options[0]?.value ?? "all")
  const [picked, setPicked] = useState<string | null>(null)
  const series = useMemo(() => chartSeries(history, range), [history, range])
  const max = Math.max(1, ...series.map((row) => row.count))
  const ticks = useMemo(() => plotTicks(max), [max])
  const selected: HistoryDay | null = useMemo(() => {
    if (!picked) return null
    return history.days.find((day) => day.date === picked) ?? null
  }, [history.days, picked])

  useEffect(() => {
    if (!options.some((item) => item.value === range)) {
      setRange(options[0]?.value ?? "all")
      setPicked(null)
    }
  }, [options, range])

  if (history.days.length === 0) return null

  return (
    <section className="status-history" aria-label={copy.statusHistoryTitle}>
      <div className="status-history-head">
        <div>
          <p className="status-kicker">{copy.statusHistoryTitle}</p>
          <h2>{copy.statusHistoryLead}</h2>
        </div>
        {options.length > 0 ? (
          <HistoryRangeMenu
            copy={copy}
            options={options}
            value={range}
            onChange={(next) => {
              setPicked(null)
              setRange(next)
            }}
          />
        ) : null}
      </div>
      <div
        className={series.length <= 4 ? "status-plot is-few" : "status-plot"}
        role="img"
        aria-label={copy.statusHistoryTitle}
      >
        <div className="status-plot-frame">
          <span className="status-plot-y-title">{copy.statusHistoryAxisClosed}</span>
          <div className="status-plot-y" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="status-plot-pane">
            <div className="status-plot-cols">
              {series.map((row) => {
                const height = row.count === 0 ? 4 : Math.max(8, Math.round((row.count / max) * 100))
                const active = picked === row.date
                const dayLabel = copy.statusHistoryDay(formatHistoryDate(row.date), row.count)
                return (
                  <button
                    key={row.date}
                    type="button"
                    className={active ? "status-plot-col is-active" : "status-plot-col"}
                    aria-pressed={active}
                    aria-label={dayLabel}
                    onClick={() => setPicked(row.date)}
                  >
                    <span className="status-plot-tip" aria-hidden="true">
                      {dayLabel}
                    </span>
                    <span className="status-plot-track" aria-hidden="true">
                      <span className="status-plot-fill" style={{ height: `${height}%` }} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="status-plot-x">
            <div className="status-plot-x-row" aria-hidden="true">
              {series.map((row) => (
                <span
                  key={row.date}
                  className={picked === row.date ? "status-plot-date is-active" : "status-plot-date"}
                >
                  {formatHistoryDate(row.date)}
                </span>
              ))}
            </div>
            <p className="status-plot-x-title">{copy.statusHistoryAxisDate}</p>
          </div>
        </div>
      </div>
      <p className="quiet status-history-hint">{copy.statusHistoryHint}</p>
      {selected ? (
        <StatusDayDialog copy={copy} day={selected} lineByCode={lineByCode} onClose={() => setPicked(null)} />
      ) : null}
    </section>
  )
}

function HistoryRangeMenu({
  copy,
  options,
  value,
  onChange,
}: {
  copy: Copy
  options: HistoryRangeOption[]
  value: HistoryRange
  onChange: (next: HistoryRange) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = "status-history-range-list"
  const current = options.find((item) => sameRange(item.value, value)) ?? options[0]
  const label = current ? optionLabel(copy, current) : copy.statusHistoryAll

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onPointer)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onPointer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className={open ? "status-history-range is-open" : "status-history-range"} ref={root}>
      <span className="sr-only" id="status-history-range-label">
        {copy.statusHistoryRange}
      </span>
      <button
        type="button"
        className="status-history-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby="status-history-range-label"
        onClick={() => setOpen((was) => !was)}
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2.25} className="status-history-caret" />
      </button>
      {open ? (
        <ul id={listId} className="status-history-menu" role="listbox" aria-labelledby="status-history-range-label">
          {options.map((item) => {
            const selected = sameRange(item.value, value)
            return (
              <li key={optionKey(item)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? "status-history-option is-selected" : "status-history-option"}
                  onClick={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  <span className="status-history-check" aria-hidden="true">
                    {selected ? <Check size={15} strokeWidth={2.5} /> : null}
                  </span>
                  <span>{optionLabel(copy, item)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function StatusDayDialog({
  copy,
  day,
  lineByCode,
  onClose,
}: {
  copy: Copy
  day: HistoryDay
  lineByCode: Map<string, LineChip[]>
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const title = copy.statusHistoryDay(formatHistoryDate(day.date), day.count)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    box.current?.querySelector("button")?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="gate-layer status-day-layer">
      <button type="button" className="gate-dismiss" aria-label={copy.statusHistoryClose} onClick={onClose} />
      <div
        ref={box}
        className="gate-dialog status-day-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-day-title"
      >
        <div className="status-day-head">
          <div>
            <p className="status-kicker">{copy.statusHistoryTitle}</p>
            <h3 id="status-day-title">{title}</h3>
          </div>
          <button type="button" className="status-day-close" onClick={onClose} aria-label={copy.statusHistoryClose}>
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </div>
        {day.stations.length === 0 ? (
          <p className="quiet">{copy.statusHistoryNone}</p>
        ) : (
          <ol className="status-day-list">
            {day.stations.map((stop, index) => {
              const lines = lineByCode.get(stop.code) ?? []
              const accent = lines[0]?.color
              return (
                <li
                  key={stop.code}
                  style={accent ? { borderRightColor: accent } : undefined}
                >
                  <span className="status-day-index">{index + 1}</span>
                  <span className="status-day-main">
                    <LineDots lines={lines} />
                    <span className="status-day-name">{stop.name}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>,
    document.body,
  )
}

function LineDots({ lines }: { lines: LineChip[] }) {
  if (lines.length === 0) return null
  return (
    <span className="line-dots" aria-hidden="true">
      {lines.map((line) => (
        <span key={line.code} className="line-dot" style={{ background: line.color }} title={line.colorName} />
      ))}
    </span>
  )
}

export function StatusServiceUpdate({
  copy,
  title,
  text,
  dated,
  fetchedAt,
}: {
  copy: Copy
  title: string
  text: string
  dated: string | null
  fetchedAt: string
}) {
  const heading = title.trim()
  const sameTitle = heading.toLowerCase() === copy.statusServiceTitle.toLowerCase()
  const clock = fetchedAt ? statusClock(fetchedAt) : ""
  const packed = clock.slice(-8, -3) || clock
  return (
    <section className="status-service" aria-label={copy.statusServiceTitle}>
      <p className="status-kicker">{copy.statusServiceTitle}</p>
      <h2>{!sameTitle && heading ? heading : copy.statusServiceNotice}</h2>
      <div className="status-service-chips">
        <span className="status-service-chip is-live" title={copy.statusServiceLive}>
          <Radio aria-hidden="true" size={12} strokeWidth={2.25} />
          {copy.statusServiceLive}
        </span>
        {dated ? (
          <span className="status-service-chip" title={dated}>
            {copy.statusServiceDated(dated)}
          </span>
        ) : null}
        {packed ? (
          <span className="status-service-chip is-soft" title={clock || packed}>
            {copy.statusServiceFetched(packed)}
          </span>
        ) : null}
      </div>
      <div className="status-service-body">
        {text.split("\n").map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
        ))}
      </div>
      <p className="status-service-source">{copy.statusServiceSource}</p>
    </section>
  )
}

function plotTicks(max: number): number[] {
  if (max <= 0) return [0]
  if (max <= 4) return [max, 0]
  const mid = Math.round(max / 2)
  if (mid === 0 || mid === max) return [max, 0]
  return [max, mid, 0]
}

function optionKey(item: HistoryRangeOption): string {
  return typeof item.value === "number" ? `y-${item.value}` : item.value
}

function sameRange(a: HistoryRange, b: HistoryRange): boolean {
  return a === b
}

function optionLabel(copy: Copy, item: HistoryRangeOption): string {
  if (item.labelKey === "all") return copy.statusHistoryAll
  if (item.labelKey === "week") return copy.statusHistoryWeek
  if (item.labelKey === "month") return copy.statusHistoryMonth
  if (item.labelKey === "year") return copy.statusHistoryYear
  return String(item.year)
}
