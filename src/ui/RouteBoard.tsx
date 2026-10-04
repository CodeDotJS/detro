import type { CSSProperties } from "react"
import { legColor } from "../lib/transit/legStyle"
import type { LineSequence } from "../lib/transit/route"
import type { Journey, Lang } from "../lib/transit/types"

export function RouteBoard({
  journey,
  lines,
  lang,
}: {
  journey: Journey
  lines: LineSequence[]
  lang: Lang
}) {
  if (journey.legs.length === 0) return null
  const colors = journey.legs.map((leg) => legColor(leg, lines, lang))
  const weights = journey.legs.map((leg) => Math.max(1, leg.rideStops ?? 1))
  const names = [journey.legs[0].startName, ...journey.legs.map((leg) => leg.endName)]
  const routeKey = `${journey.criterion}:${names.join(">")}`

  return (
    <div className="board" aria-hidden="true">
      <div className="board-line" key={routeKey}>
        {names.map((name, index) => (
          <div key={`${name}-${index}`} className="board-stop">
            {index > 0 ? (
              <span
                className="board-seg"
                style={{
                  flexGrow: weights[index - 1],
                  "--seg": colors[index - 1],
                  "--delay": `${(index - 1) * 0.12}s`,
                } as CSSProperties}
              />
            ) : null}
            <span className="board-joint">
              <span className="board-dot" style={{ background: colors[Math.min(index, colors.length - 1)] }} />
              <span className="board-name">{name}</span>
            </span>
          </div>
        ))}
      </div>
      <ol className="board-names">
        {names.map((name, index) => (
          <li key={`${name}-${index}`}>{name}</li>
        ))}
      </ol>
    </div>
  )
}
