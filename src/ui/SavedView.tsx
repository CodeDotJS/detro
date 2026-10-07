import type { CSSProperties } from "react"
import { ArrowRight } from "lucide-react"
import type { Copy } from "../i18n/copy"
import { legColor } from "../lib/transit/legStyle"
import { planRoute, type LineSequence } from "../lib/transit/route"
import type { Journey, Lang } from "../lib/transit/types"

type Trip = {
  fromCode: string
  toCode: string
  fromName: string
  toName: string
}

export function SavedView({
  copy,
  trips,
  lines,
  lang,
  landed = null,
  onOpenTrip,
  onRemoveTrip,
}: {
  copy: Copy
  trips: Trip[]
  lines: LineSequence[]
  lang: Lang
  landed?: { fromCode: string; toCode: string } | null
  onOpenTrip: (fromCode: string, toCode: string) => void
  onRemoveTrip: (fromCode: string, toCode: string) => void
}) {
  return (
    <main className="sheet saved-page">
      <div className="saved-head">
        <h1>{copy.saved}</h1>
        {trips.length > 0 ? <span className="saved-count">{trips.length}</span> : null}
      </div>
      <p className="lede">{copy.savedLead}</p>
      {trips.length === 0 ? (
        <section className="saved-empty">
          <span className="saved-track" aria-hidden="true">
            <i />
          </span>
          <p>{copy.savedEmpty}</p>
        </section>
      ) : (
        <ul className="saved-list">
          {trips.map((trip) => {
            const label = `${trip.fromName} → ${trip.toName}`
            const journey = planRoute(lines, trip.fromCode, trip.toCode, lang, "")
            const fresh = landed?.fromCode === trip.fromCode && landed.toCode === trip.toCode
            return (
              <li key={`${trip.fromCode}-${trip.toCode}`} className={fresh ? "saved-card is-fresh" : "saved-card"}>
                <button type="button" className="saved-open" onClick={() => onOpenTrip(trip.fromCode, trip.toCode)}>
                  <Track journey={journey} lines={lines} lang={lang} />
                  <span className="saved-pair">
                    <span className="sr-only">{copy.from} </span>
                    <span className="saved-from">{trip.fromName}</span>
                    <ArrowRight className="saved-arrow" aria-hidden="true" size={16} strokeWidth={2} />
                    <span className="sr-only"> {copy.to} </span>
                    <span className="saved-to">{trip.toName}</span>
                  </span>
                  {journey ? <span className="saved-meta">{routeNote(journey, copy)}</span> : null}
                </button>
                <button
                  type="button"
                  className="remove"
                  aria-label={copy.removeSaved(label)}
                  onClick={() => onRemoveTrip(trip.fromCode, trip.toCode)}
                >
                  {copy.removeTrip}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function Track({ journey, lines, lang }: { journey: Journey | null; lines: LineSequence[]; lang: Lang }) {
  const legs = journey?.legs ?? []
  return (
    <span className="saved-track" aria-hidden="true">
      {legs.length === 0 ? (
        <i />
      ) : (
        legs.map((leg, index) => (
          <i
            key={`${leg.lineCode ?? leg.lineName}-${index}`}
            style={
              {
                "--seg": legColor(leg, lines, lang),
                "--w": Math.max(1, leg.rideStops ?? 1),
              } as CSSProperties
            }
          />
        ))
      )}
    </span>
  )
}

function routeNote(journey: Journey, copy: Copy): string {
  const names: string[] = []
  for (const leg of journey.legs) {
    const name = leg.lineName.replace(/ \(LN\d+\)$/, "")
    if (names[names.length - 1] !== name) names.push(name)
  }
  const stops = journey.legs.reduce((sum, leg) => sum + (leg.rideStops ?? 0), 0)
  const changes = journey.changes === 0 ? copy.noChanges : copy.changeCount(journey.changes)
  return `${names.join(" · ")} · ${copy.stopCount(stops)} · ${changes}`
}
