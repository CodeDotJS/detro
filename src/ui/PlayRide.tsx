import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowDown, Award, Check, IndianRupee, Sparkles, TrainFront, X, Zap } from "lucide-react"
import { playCopy as text } from "../i18n/play"
import { savedJourneys, savedWeekdayFares } from "../lib/offline/saved"
import { otherLinesAt, stationName, type GameLine, type GameNetwork } from "../lib/play/network"
import { finishRide, isStamped, recordStop, stampedOn, stampedTotal, type PlayProgress } from "../lib/play/progress"
import {
  BONUS_POINTS,
  bonusQuestion,
  CLEAN_POINTS,
  FARE_POINTS,
  fareQuestion,
  interchangesOn,
  multiplier,
  QUICK_MS,
  QUICK_POINTS,
  rankFor,
  RIDE_TOKENS,
  stopPoints,
  stopQuestion,
  wantsBonus,
  type BonusQuestion,
  type FareQuestion,
  type Ride,
  type StopQuestion,
} from "../lib/play/ride"
import { inkOn } from "../lib/transit/legStyle"
import type { Journey } from "../lib/transit/types"
import { useAutoAdvance, useCountUp, useDoorsShut } from "./playHooks"
import { chipState, MISS_MS, RIGHT_MS } from "./playMark"
import { Burst, Doors, Dots, LeaveRow, RankLine, Tokens, WaitBar } from "./PlayParts"

type Phase = "ask" | "answered" | "bonus" | "bonus-answered" | "fare" | "fare-answered" | "done"

export type RideEnd = { lineCode: string; code: string; towardsCode: string }

type Gain = { id: number; value: number; quick: boolean }

export function PlayRide({
  network,
  ride,
  progress,
  fetchedAt,
  rng,
  onProgress,
  onRideOn,
  onPassport,
}: {
  network: GameNetwork
  ride: Ride
  progress: PlayProgress
  fetchedAt: string
  rng: () => number
  onProgress: (update: (current: PlayProgress) => PlayProgress) => void
  onRideOn: (end: RideEnd) => void
  onPassport: () => void
}) {
  const line = network.byCode.get(ride.lineCode)!
  const total = ride.codes.length - 1
  const [step, setStep] = useState(1)
  const [phase, setPhase] = useState<Phase>("ask")
  const [question, setQuestion] = useState<StopQuestion>(() => stopQuestion(network, ride, 1, rng))
  const [picked, setPicked] = useState<string | null>(null)
  const [bonus, setBonus] = useState<BonusQuestion | null>(null)
  const [bonusPicked, setBonusPicked] = useState<string | null>(null)
  const [bonusesAsked, setBonusesAsked] = useState(0)
  const [fare, setFare] = useState<FareQuestion | null>(null)
  const [farePicked, setFarePicked] = useState<number | null>(null)
  const [tokens, setTokens] = useState(RIDE_TOKENS)
  const [combo, setCombo] = useState(0)
  const [points, setPoints] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [fresh, setFresh] = useState(0)
  const [gain, setGain] = useState<Gain | null>(null)
  const [finalPoints, setFinalPoints] = useState(0)
  const prevBest = useRef(progress.best)
  const prevStamped = useRef(stampedTotal(progress, network.lines))
  const askedAt = useRef(Date.now())

  const startCode = ride.codes[0]
  const endCode = ride.codes[total]
  useEffect(() => {
    let live = true
    Promise.all([savedJourneys(startCode, endCode, network.names, fetchedAt), savedWeekdayFares(startCode)])
      .then(([found, pool]) => {
        const trip = found.distance ?? found.changes
        if (!live || trip?.fare.kind !== "weekday-weekend") return
        setFare(fareQuestion(trip.fare.weekday, pool, rng))
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [startCode, endCode, network.names, fetchedAt, rng])

  const stopRight = phase === "answered" && picked === question.answer
  const bonusRight = phase === "bonus-answered" && bonus !== null && bonusPicked === bonus.answer
  const fareRight = phase === "fare-answered" && fare !== null && farePicked === fare.answer

  const doorsShut = useDoorsShut(phase === "ask", step)
  const answered = phase === "answered" || phase === "bonus-answered" || phase === "fare-answered"
  const gotIt = stopRight || bonusRight || fareRight
  const waitMs = gotIt ? RIGHT_MS : MISS_MS
  useAutoAdvance(answered, waitMs, `${phase}-${step}`, advance)

  function skipWait() {
    if (answered) advance()
  }

  function pickStop(code: string) {
    if (phase !== "ask") return
    const station = question.answer
    const ok = code === station
    setPicked(code)
    setPhase("answered")
    setResults((current) => [...current, ok])
    if (ok) {
      const nextCombo = combo + 1
      const quick = Date.now() - askedAt.current < QUICK_MS
      const earned = stopPoints(nextCombo) + (quick ? QUICK_POINTS : 0)
      setCombo(nextCombo)
      setPoints((current) => current + earned)
      setGain({ id: step, value: earned, quick })
      if (!isStamped(progress, line.code, station)) setFresh((current) => current + 1)
    } else {
      setCombo(0)
      setTokens((current) => current - 1)
    }
    onProgress((current) => recordStop(current, line.code, station, ok))
  }

  function pickBonus(code: string) {
    if (phase !== "bonus" || !bonus) return
    setBonusPicked(code)
    setPhase("bonus-answered")
    if (code === bonus.answer) {
      setPoints((current) => current + BONUS_POINTS)
      setGain({ id: 1000 + step, value: BONUS_POINTS, quick: false })
    }
  }

  function pickFare(value: number) {
    if (phase !== "fare" || !fare) return
    setFarePicked(value)
    setPhase("fare-answered")
    if (value === fare.answer) {
      setPoints((current) => current + FARE_POINTS)
      setGain({ id: 2000, value: FARE_POINTS, quick: false })
    }
  }

  function finish(extra = 0) {
    const clean = tokens === RIDE_TOKENS && step >= total
    const final = points + extra + (clean ? CLEAN_POINTS : 0)
    setFinalPoints(final)
    setPhase("done")
    onProgress((current) => finishRide(current, final))
  }

  function advance() {
    if (phase === "fare-answered") {
      finish()
      return
    }
    if (phase === "answered" && tokens > 0) {
      const asked = bonusQuestion(network, ride.codes[step], line.code, rng)
      if (asked && wantsBonus(bonusesAsked, rng)) {
        setBonus(asked)
        setBonusPicked(null)
        setBonusesAsked((current) => current + 1)
        setPhase("bonus")
        return
      }
    }
    if (tokens > 0 && step >= total && fare) {
      setPhase("fare")
      return
    }
    if (tokens === 0 || step >= total) {
      finish()
      return
    }
    const next = step + 1
    setStep(next)
    setQuestion(stopQuestion(network, ride, next, rng))
    setPicked(null)
    setBonus(null)
    setBonusPicked(null)
    askedAt.current = Date.now()
    setPhase("ask")
  }

  const style = { "--hue": line.color, "--hue-ink": inkOn(line.color) } as CSSProperties
  const times = multiplier(combo)
  const left = total - results.length
  const towardsName = stationName(network, ride.towardsCode)

  return (
    <main className="sheet play-page play-ride" style={style}>
      <header className="play-hud">
        <div className="play-hud-top">
          <h1 className="play-line-pill">{line.name}</h1>
          <span className="play-towards">
            <ArrowDown aria-hidden="true" size={14} strokeWidth={2.6} />
            {text.towards(towardsName)}
          </span>
          {times > 1 && phase !== "done" ? (
            <span className="play-express" key={times}>
              <Zap aria-hidden="true" size={14} strokeWidth={2.5} />
              {text.express(times)}
            </span>
          ) : null}
        </div>
        <div className="play-hud-stats">
          <Tokens tokens={tokens} />
          <Dots total={total} results={results} asking={phase === "ask"} />
          {phase !== "done" ? <span className="play-left">{text.stopsLeft(Math.max(1, left))}</span> : null}
          <span className="play-points">
            {text.points(phase === "done" ? finalPoints : points)}
            {gain && phase !== "done" ? (
              <span key={gain.id} className="play-gain" aria-hidden="true">
                +{gain.value}
              </span>
            ) : null}
          </span>
        </div>
      </header>

      {phase === "done" ? (
        <DoneCard
          network={network}
          line={line}
          ride={ride}
          reached={step}
          tokens={tokens}
          results={results}
          fresh={fresh}
          finalPoints={finalPoints}
          fareRight={farePicked !== null && farePicked === fare?.answer}
          prevBest={prevBest.current}
          prevStamped={prevStamped.current}
          progress={progress}
          fetchedAt={fetchedAt}
          onRideOn={() => onRideOn({ lineCode: line.code, code: ride.codes[step], towardsCode: ride.towardsCode })}
          onPassport={onPassport}
        />
      ) : (
        <div className="play-board">
          <Track network={network} ride={ride} step={step} phase={phase} results={results} />
          <section
            className={answered ? "play-question play-question-done" : "play-question"}
            aria-live="polite"
            onClick={skipWait}
          >
            {phase === "ask" || phase === "answered" ? (
              <>
                <h2 className="play-ask-stop">{text.nextStopTowards(towardsName)}</h2>
                {phase === "ask" ? <Doors key={`doors-${step}`} step={step} shut={doorsShut} /> : null}
                <ul className={`play-choices${phase === "answered" && !stopRight ? " play-choices-miss" : ""}`} key={`choices-${step}`}>
                  {question.choices.map((code) => {
                    const state = chipState(code, picked, question.answer)
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          className={state ? `play-chip play-chip-${state}` : "play-chip"}
                          disabled={phase !== "ask"}
                          onClick={() => pickStop(code)}
                        >
                          {state === "right" ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
                          {state === "wrong" ? <X aria-hidden="true" size={16} strokeWidth={3} /> : null}
                          <span>{stationName(network, code)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {phase === "answered" ? (
                  <StopFeedback network={network} ride={ride} step={step} question={question} picked={picked} gain={gain} />
                ) : null}
              </>
            ) : null}
            {(phase === "bonus" || phase === "bonus-answered") && bonus ? (
              <>
                <p className="play-bonus-label">
                  <Sparkles aria-hidden="true" size={15} strokeWidth={2.2} />
                  {text.bonusLabel}
                </p>
                <h2>{text.bonusAsk(stationName(network, bonus.station))}</h2>
                <ul className="play-choices">
                  {bonus.choices.map((code) => {
                    const choice = network.byCode.get(code)
                    if (!choice) return null
                    const state = chipState(code, bonusPicked, bonus.answer)
                    const fill = state === "right" ? { background: choice.color, color: inkOn(choice.color), borderColor: choice.color } : undefined
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          className={`play-chip play-chip-line${state ? ` play-chip-${state}` : ""}`}
                          style={{ ...fill, "--hue": choice.color } as CSSProperties}
                          disabled={phase !== "bonus"}
                          onClick={() => pickBonus(code)}
                        >
                          <span className="play-swatch" aria-hidden="true" />
                          <span>{choice.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {phase === "bonus-answered" ? (
                  <div className="play-feedback">
                    <p className={bonusRight ? "play-say play-say-right" : "play-say play-say-wrong"}>
                      {bonusRight
                        ? text.bonusRight(BONUS_POINTS)
                        : text.bonusWrong(network.byCode.get(bonus.answer)?.name ?? "")}
                    </p>
                    <ChangeChips lines={otherLinesAt(network, bonus.station, line.code)} />
                  </div>
                ) : null}
              </>
            ) : null}
            {(phase === "fare" || phase === "fare-answered") && fare ? (
              <>
                <p className="play-bonus-label play-bonus-fare">
                  <IndianRupee aria-hidden="true" size={15} strokeWidth={2.2} />
                  {text.fareLabel}
                </p>
                <h2>{text.fareAsk(stationName(network, startCode), stationName(network, endCode))}</h2>
                <ul className="play-choices play-choices-fare">
                  {fare.choices.map((value) => {
                    const state = chipState(String(value), farePicked === null ? null : String(farePicked), String(fare.answer))
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          className={state ? `play-chip play-chip-fare play-chip-${state}` : "play-chip play-chip-fare"}
                          disabled={phase !== "fare"}
                          onClick={() => pickFare(value)}
                        >
                          <span>{text.rupees(value)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {phase === "fare-answered" ? (
                  <div className="play-feedback">
                    <p className={fareRight ? "play-say play-say-right" : "play-say play-say-wrong"}>
                      {fareRight ? text.fareRight(FARE_POINTS) : text.fareWrong(fare.answer)}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            {answered ? <WaitBar key={`wait-${phase}-${step}`} id={`wait-${phase}-${step}`} ms={waitMs} right={gotIt} /> : null}
          </section>
        </div>
      )}
      {phase !== "done" ? <LeaveRow onLeave={onPassport} /> : null}
    </main>
  )
}

function Track({
  network,
  ride,
  step,
  phase,
  results,
}: {
  network: GameNetwork
  ride: Ride
  step: number
  phase: Phase
  results: boolean[]
}) {
  const asking = phase === "ask"
  const arrived = asking ? step - 1 : step
  const first = Math.max(0, arrived - 2)
  const more = ride.codes.length - 1 - arrived - (asking ? 1 : 0)
  const hideHere = phase === "answered" || phase === "bonus"
  const rows: Array<{ code: string; index: number }> = []
  for (let index = first; index <= arrived; index += 1) rows.push({ code: ride.codes[index], index })
  const behind = first === 0 && ride.behindCode ? ride.behindCode : null
  return (
    <ol className="play-track" aria-hidden="true">
      {first > 0 ? <li className="play-stop play-stop-gap" /> : null}
      {behind ? (
        <li className={arrived > 0 ? "play-stop play-stop-behind play-stop-older" : "play-stop play-stop-behind"}>
          <span className="play-rail">
            <span className="play-node" />
          </span>
          <span className="play-stop-name">{stationName(network, behind)}</span>
          <span className="play-stop-tag">{text.cameFrom}</span>
        </li>
      ) : null}
      {rows.map(({ code, index }) => {
        const here = index === arrived
        const mark = index === 0 ? null : results[index - 1]
        const others = here && hideHere ? [] : otherLinesAt(network, code, ride.lineCode)
        return (
          <li
            key={`${code}-${index}`}
            className={here ? "play-stop play-stop-here" : index < arrived - 1 ? "play-stop play-stop-past play-stop-older" : "play-stop play-stop-past"}
          >
            <span className="play-rail">
              <span className="play-node">{here ? <TrainFront size={14} strokeWidth={2.4} /> : null}</span>
            </span>
            <span className="play-stop-name">{stationName(network, code)}</span>
            {others.length > 0 ? (
              <span className="play-stop-lines">
                {others.map((other) => (
                  <i key={other.code} style={{ background: other.color }} />
                ))}
              </span>
            ) : null}
            {mark === true ? <Check className="play-mark play-mark-right" size={15} strokeWidth={3} /> : null}
            {mark === false ? <X className="play-mark play-mark-wrong" size={15} strokeWidth={3} /> : null}
          </li>
        )
      })}
      {asking ? (
        <li className="play-stop play-stop-next">
          <span className="play-rail">
            <span className="play-node">?</span>
          </span>
          <span className="play-stop-name">{text.nextStop}</span>
        </li>
      ) : null}
      {more > 0 ? (
        <li className="play-stop play-stop-more">
          <span className="play-rail" />
          <span className="play-stop-name">{text.moreStops(more)}</span>
        </li>
      ) : null}
    </ol>
  )
}

function StopFeedback({
  network,
  ride,
  step,
  question,
  picked,
  gain,
}: {
  network: GameNetwork
  ride: Ride
  step: number
  question: StopQuestion
  picked: string | null
  gain: Gain | null
}) {
  if (!picked) return null
  if (picked === question.answer) {
    const mine = gain?.id === step ? gain : null
    return (
      <div className="play-feedback">
        <p className="play-say play-say-right">
          {text.right((mine?.value ?? 0) - (mine?.quick ? QUICK_POINTS : 0))}
          {mine?.quick ? (
            <span className="play-quick-tag">
              <Zap aria-hidden="true" size={13} strokeWidth={2.5} />
              {text.quick(QUICK_POINTS)}
            </span>
          ) : null}
        </p>
      </div>
    )
  }
  const trap = question.traps[picked]
  const current = ride.codes[step - 1]
  const branch =
    trap === "branch" ? otherLinesAt(network, current, ride.lineCode).find((other) => other.codes.includes(picked)) : undefined
  const codes = network.byCode.get(ride.lineCode)?.codes ?? []
  const dir = codes.indexOf(question.answer) - codes.indexOf(current)
  const behind = codes.includes(picked) && (codes.indexOf(picked) - codes.indexOf(current)) * dir < 0
  const hint =
    trap === "skip"
      ? text.trapSkip
      : branch
        ? text.trapBranch(branch.name)
        : trap === "near"
          ? text.trapNear
          : behind
            ? text.trapBehind
            : null
  return (
    <div className="play-feedback">
      <p className="play-say play-say-wrong">{text.miss(stationName(network, question.answer))}</p>
      {hint ? <p className="play-hint">{hint}</p> : null}
    </div>
  )
}

function ChangeChips({ lines }: { lines: GameLine[] }) {
  if (lines.length === 0) return null
  return (
    <p className="play-change">
      <span>{text.changeHere}</span>
      {lines.map((other) => (
        <span key={other.code} className="play-change-chip" style={{ background: other.color, color: inkOn(other.color) }}>
          {other.name}
        </span>
      ))}
    </p>
  )
}

function DoneCard({
  network,
  line,
  ride,
  reached,
  tokens,
  results,
  fresh,
  finalPoints,
  fareRight,
  prevBest,
  prevStamped,
  progress,
  fetchedAt,
  onRideOn,
  onPassport,
}: {
  network: GameNetwork
  line: GameLine
  ride: Ride
  reached: number
  tokens: number
  results: boolean[]
  fresh: number
  finalPoints: number
  fareRight: boolean
  prevBest: number
  prevStamped: number
  progress: PlayProgress
  fetchedAt: string
  onRideOn: () => void
  onPassport: () => void
}) {
  const [trip, setTrip] = useState<Journey | null>(null)
  const fromCode = ride.codes[0]
  const toCode = ride.codes[reached]
  useEffect(() => {
    let live = true
    savedJourneys(fromCode, toCode, network.names, fetchedAt)
      .then((found) => {
        if (live) setTrip(found.distance ?? found.changes)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [fromCode, toCode, network.names, fetchedAt])

  const shown = useCountUp(finalPoints)
  const out = tokens === 0
  const right = results.filter(Boolean).length
  const clean = tokens === RIDE_TOKENS && !out
  const newBest = finalPoints > 0 && finalPoints > prevBest
  const stamped = stampedOn(progress, line)
  const goal = line.codes.length
  const lineDone = fresh > 0 && stamped >= goal
  const totalStamped = stampedTotal(progress, network.lines)
  const rank = rankFor(totalStamped, network.stationCount)
  const rankUp = rank.title !== rankFor(prevStamped, network.stationCount).title
  const party = newBest || clean || lineDone || rankUp
  const sameName = network.lines.filter((other) => other.name === line.name)
  const branch = sameName.length > 1 && sameName.some((other) => other.codes.length > goal)
  const lineFact = (branch ? text.factBranch : text.factLine)(
    line.name,
    goal,
    stationName(network, line.codes[0]),
    stationName(network, line.codes[goal - 1]),
  )
  const changes = interchangesOn(network, { ...ride, codes: ride.codes.slice(0, reached + 1) })
  const fromName = stationName(network, fromCode)
  const toName = stationName(network, toCode)

  return (
    <section className={out ? "play-done play-done-out" : "play-done"}>
      {party ? <Burst colors={[line.color, "#f5b301", "#16a34a", "#e11d48"]} /> : null}
      <p className="play-done-kicker">{out ? text.outTitle : text.doneTitle}</p>
      <p className="play-done-points">{text.points(shown)}</p>
      <div className="play-badges">
        {newBest ? (
          <p className="play-best-badge">
            <Sparkles aria-hidden="true" size={16} strokeWidth={2.2} />
            {text.newBest}
          </p>
        ) : null}
        {lineDone ? (
          <p className="play-best-badge play-badge-line">
            <Check aria-hidden="true" size={16} strokeWidth={3} />
            {text.lineComplete(line.name)}
          </p>
        ) : null}
        {rankUp ? (
          <p className="play-best-badge play-badge-rank">
            <Award aria-hidden="true" size={16} strokeWidth={2.2} />
            {text.rankUp(rank.title)}
          </p>
        ) : null}
      </div>
      <ul className="play-done-list">
        <li>{text.doneStops(right, results.length)}</li>
        {fresh > 0 ? <li className="play-stamp-line">{text.newStamps(fresh)}</li> : null}
        {clean ? <li>{text.clean(CLEAN_POINTS)}</li> : null}
        {fareRight ? <li>{text.fareRight(FARE_POINTS)}</li> : null}
      </ul>
      <div className="play-mastery">
        <span className="play-line-head">
          <span className="play-line-name">{line.name}</span>
          <span className="play-line-count">{text.mastery(stamped, goal)}</span>
        </span>
        <span className="play-bar" aria-hidden="true">
          <i style={{ width: `${Math.round((stamped / goal) * 100)}%` }} />
        </span>
        <RankLine stamped={totalStamped} total={network.stationCount} />
      </div>
      <section className="play-facts">
        <h2>{text.factsTitle}</h2>
        <ul>
          <li>{lineFact}</li>
          {trip?.durationMinutes != null ? <li>{text.factTrip(fromName, toName, trip.durationMinutes)}</li> : null}
          {trip?.fare.kind === "weekday-weekend" ? <li>{text.factFare(trip.fare.weekday, trip.fare.weekend)}</li> : null}
          {trip?.fare.kind === "untyped" ? <li>{text.factFareOne(trip.fare.amount)}</li> : null}
          {changes.map((item) => (
            <li key={item.code}>
              {text.factChange(stationName(network, item.code), item.lines.map((other) => other.name).join(", "))}
            </li>
          ))}
        </ul>
        <p className="play-note">{text.factNote(fetchedAt.slice(0, 10))}</p>
      </section>
      <div className="play-actions">
        <button type="button" className="primary" onClick={onRideOn}>
          <TrainFront aria-hidden="true" size={18} strokeWidth={2} />
          {text.rideOn}
        </button>
        <button type="button" className="play-secondary" onClick={onPassport}>
          {text.passport}
        </button>
      </div>
    </section>
  )
}
