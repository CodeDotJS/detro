import { ArrowRight } from "lucide-react"
import type { Copy } from "../i18n/copy"

type Trip = {
  fromCode: string
  toCode: string
  fromName: string
  toName: string
}

export function SavedView({
  copy,
  trips,
  onOpenTrip,
  onRemoveTrip,
}: {
  copy: Copy
  trips: Trip[]
  onOpenTrip: (fromCode: string, toCode: string) => void
  onRemoveTrip: (fromCode: string, toCode: string) => void
}) {
  return (
    <main className="sheet saved-page">
      <h1>{copy.saved}</h1>
      <p className="lede">{copy.savedLead}</p>
      {trips.length === 0 ? (
        <section>
          <p>{copy.savedEmpty}</p>
        </section>
      ) : (
        <ul className="saved-list">
          {trips.map((trip) => {
            const label = `${trip.fromName} → ${trip.toName}`
            return (
              <li key={`${trip.fromCode}-${trip.toCode}`}>
                <button type="button" className="saved-open" onClick={() => onOpenTrip(trip.fromCode, trip.toCode)}>
                  <span className="saved-from">{trip.fromName}</span>
                  <ArrowRight className="saved-arrow" aria-hidden="true" size={18} strokeWidth={2} />
                  <span className="saved-to">{trip.toName}</span>
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
