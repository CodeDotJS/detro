import { useState, type CSSProperties } from "react"
import { Award, DoorOpen } from "lucide-react"
import { playCopy as text } from "../i18n/play"
import { QUICK_POINTS, rankFor, RIDE_TOKENS } from "../lib/play/ride"

export function Doors({ step, shut }: { step: number; shut: boolean }) {
  const label = shut ? text.doorsShut : text.doors(QUICK_POINTS)
  return (
    <div className={shut ? "play-doors play-doors-shut" : "play-doors"} key={`doors-${step}`} role="img" aria-label={label}>
      <span className="play-doors-bar">
        <i />
      </span>
      <span className="play-doors-text">{label}</span>
    </div>
  )
}

export function WaitBar({ id, ms, right }: { id: string; ms: number; right: boolean }) {
  return (
    <span
      key={id}
      className={right ? "play-wait play-wait-right" : "play-wait"}
      style={{ "--wait": `${ms}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <i />
    </span>
  )
}

export function Tokens({ tokens }: { tokens: number }) {
  return (
    <span className="play-tokens" role="img" aria-label={text.tokens(tokens)}>
      {Array.from({ length: RIDE_TOKENS }, (_, index) => (
        <i key={index} className={index < tokens ? "on" : index === tokens ? "lost" : undefined} />
      ))}
    </span>
  )
}

export function Dots({ total, results, asking }: { total: number; results: boolean[]; asking: boolean }) {
  return (
    <ol className="play-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          className={
            index < results.length
              ? results[index]
                ? "right"
                : "wrong"
              : index === results.length && asking
                ? "now"
                : undefined
          }
        />
      ))}
    </ol>
  )
}

export function LeaveRow({ onLeave }: { onLeave: () => void }) {
  const [leaving, setLeaving] = useState(false)
  return (
    <div className={leaving ? "play-leave-row play-leave-ask" : "play-leave-row"}>
      {leaving ? (
        <>
          <p>{text.leaveAsk}</p>
          <button type="button" className="play-leave play-leave-yes" onClick={onLeave}>
            <DoorOpen aria-hidden="true" size={17} strokeWidth={2.2} />
            {text.leaveYes}
          </button>
          <button type="button" className="play-leave" onClick={() => setLeaving(false)}>
            {text.leaveNo}
          </button>
        </>
      ) : (
        <button type="button" className="play-leave" onClick={() => setLeaving(true)}>
          <DoorOpen aria-hidden="true" size={17} strokeWidth={2.2} />
          {text.leave}
        </button>
      )}
    </div>
  )
}

export function RankLine({ stamped, total }: { stamped: number; total: number }) {
  const rank = rankFor(stamped, total)
  return (
    <p className="play-rank">
      <Award aria-hidden="true" size={15} strokeWidth={2.2} />
      <strong>{text.rank(rank.title)}</strong>
      <span>{rank.next ? text.rankNext(rank.next.at - stamped, rank.next.title) : text.rankTop}</span>
    </p>
  )
}

export function Burst({ colors }: { colors: string[] }) {
  return (
    <span className="play-burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <i
          key={index}
          style={
            {
              "--a": `${(index * 360) / 18}deg`,
              "--d": `${70 + (index % 4) * 22}px`,
              background: colors[index % colors.length],
              animationDelay: `${(index % 3) * 40}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
