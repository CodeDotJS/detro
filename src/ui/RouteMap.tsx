import type { Copy } from "../i18n/copy"
import type { LineSequence } from "../lib/transit/route"
import { routeStops } from "../lib/transit/routeMap"
import type { Journey, Lang } from "../lib/transit/types"

export function RouteMap({
  copy,
  journey,
  lines,
  lang,
  closedCodes = new Set(),
}: {
  copy: Copy
  journey: Journey
  lines: LineSequence[]
  lang: Lang
  closedCodes?: Set<string>
}) {
  const stops = routeStops(journey, lines, lang)
  if (stops.length === 0) return null
  return (
    <section className="route-map" aria-label={copy.routeMap}>
      <h2>{copy.routeMap}</h2>
      <ol>
        {stops.map((stop, index) => (
          <li key={`${stop.code || stop.name}-${index}`}>
            <span className="route-rail" aria-hidden="true">
              <span className="route-dot" style={{ background: stop.dot }} />
              {stop.stem ? <span className="route-stem" style={{ background: stop.stem }} /> : null}
            </span>
            <span className="route-stop">
              {stop.name}
              {stop.code && closedCodes.has(stop.code) ? <span className="status-mark">{copy.gatesClosed}</span> : null}
              {stop.change ? <span className="route-change">{copy.changeHere}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
