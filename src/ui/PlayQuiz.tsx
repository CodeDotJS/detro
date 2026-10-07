import { useRef, useState, type CSSProperties } from "react"
import { Check, Sparkles, X, Zap } from "lucide-react"
import { playCopy as text } from "../i18n/play"
import { finishRound, recordAnswer, type PlayProgress } from "../lib/play/progress"
import type { ModeId, QuizQuestion } from "../lib/play/quiz"
import { CLEAN_POINTS, multiplier, QUICK_MS, QUICK_POINTS, RIDE_TOKENS, stopPoints } from "../lib/play/ride"
import { inkOn } from "../lib/transit/legStyle"
import { useAutoAdvance, useCountUp, useDoorsShut } from "./playHooks"
import { chipState, MISS_MS, RIGHT_MS } from "./playMark"
import { Burst, Doors, Dots, LeaveRow, Tokens, WaitBar } from "./PlayParts"

type Phase = "ask" | "answered" | "done"
type Gain = { id: number; value: number; quick: boolean }

export type Mastery = { learned: number; total: number; label: (count: number, total: number) => string }

export function PlayQuiz({
  mode,
  title,
  hue,
  questions,
  progress,
  mastery,
  onProgress,
  onAgain,
  onPassport,
}: {
  mode: ModeId
  title: string
  hue: string
  questions: QuizQuestion[]
  progress: PlayProgress
  mastery?: Mastery
  onProgress: (update: (current: PlayProgress) => PlayProgress) => void
  onAgain: () => void
  onPassport: () => void
}) {
  const total = questions.length
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("ask")
  const [picked, setPicked] = useState<string | null>(null)
  const [tokens, setTokens] = useState(RIDE_TOKENS)
  const [combo, setCombo] = useState(0)
  const [points, setPoints] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [fresh, setFresh] = useState(0)
  const [gain, setGain] = useState<Gain | null>(null)
  const [finalPoints, setFinalPoints] = useState(0)
  const prevBest = useRef(progress.modes[mode]?.best ?? 0)
  const askedAt = useRef(Date.now())
  const question = questions[index]
  const right = phase === "answered" && picked === question.answer
  const rich = Boolean(question.legs?.length || question.board?.length)
  const waitMs = right ? RIGHT_MS + (rich ? 500 : 0) : MISS_MS + (rich ? 800 : 0)
  const doorsShut = useDoorsShut(phase === "ask", index)
  useAutoAdvance(phase === "answered", waitMs, `${index}`, advance)

  function pick(id: string) {
    if (phase !== "ask") return
    const ok = id === question.answer
    setPicked(id)
    setPhase("answered")
    setResults((current) => [...current, ok])
    if (ok) {
      const nextCombo = combo + 1
      const quick = Date.now() - askedAt.current < QUICK_MS
      const earned = stopPoints(nextCombo) + (quick ? QUICK_POINTS : 0)
      setCombo(nextCombo)
      setPoints((current) => current + earned)
      setGain({ id: index, value: earned, quick })
      if (mastery && !(progress.learned[mode] ?? []).includes(question.key)) setFresh((current) => current + 1)
    } else {
      setCombo(0)
      setTokens((current) => current - 1)
    }
    if (mastery) onProgress((current) => recordAnswer(current, mode, question.key, ok))
  }

  function advance() {
    if (phase !== "answered") return
    if (tokens === 0 || index >= total - 1) {
      const clean = tokens === RIDE_TOKENS
      const final = points + (clean ? CLEAN_POINTS : 0)
      setFinalPoints(final)
      setPhase("done")
      onProgress((current) => finishRound(current, mode, final))
      return
    }
    setIndex(index + 1)
    setPicked(null)
    askedAt.current = Date.now()
    setPhase("ask")
  }

  const style = { "--hue": hue, "--hue-ink": inkOn(hue) } as CSSProperties
  const times = multiplier(combo)
  const mine = gain?.id === index ? gain : null

  return (
    <main className="sheet play-page play-ride play-quiz" style={style}>
      <header className="play-hud">
        <div className="play-hud-top">
          <h1 className="play-line-pill">{title}</h1>
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
          {phase !== "done" ? <span className="play-left">{text.questionsLeft(Math.max(1, total - results.length))}</span> : null}
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
        <QuizDone
          results={results}
          tokens={tokens}
          fresh={fresh}
          finalPoints={finalPoints}
          prevBest={prevBest.current}
          hue={hue}
          mastery={mastery}
          onAgain={onAgain}
          onPassport={onPassport}
        />
      ) : (
        <section
          className={phase === "answered" ? "play-question play-question-done" : "play-question"}
          aria-live="polite"
          onClick={() => phase === "answered" && advance()}
        >
          <h2>{question.prompt}</h2>
          {phase === "ask" ? <Doors key={`doors-${index}`} step={index} shut={doorsShut} /> : null}
          <ul
            key={`choices-${index}`}
            className={
              question.choices.every((choice) => choice.label.includes(" → "))
                ? "play-choices play-choices-trips"
                : question.choices.length === 2
                  ? "play-choices play-choices-two"
                  : "play-choices"
            }
          >
            {question.choices.map((choice) => {
              const state = chipState(choice.id, picked, question.answer)
              return (
                <li key={choice.id}>
                  <button
                    type="button"
                    className={`play-chip${choice.hue ? " play-chip-line" : ""}${state ? ` play-chip-${state}` : ""}`}
                    style={choice.hue ? ({ "--hue": choice.hue } as CSSProperties) : undefined}
                    disabled={phase !== "ask"}
                    onClick={() => pick(choice.id)}
                  >
                    {choice.hue ? <span className="play-swatch" aria-hidden="true" /> : null}
                    {state === "right" ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
                    {state === "wrong" ? <X aria-hidden="true" size={16} strokeWidth={3} /> : null}
                    <ChoiceLabel label={choice.label} />
                  </button>
                </li>
              )
            })}
          </ul>
          {phase === "answered" ? (
            <div className="play-feedback">
              <p className={right ? "play-say play-say-right" : "play-say play-say-wrong"}>
                {right
                  ? text.rightPlain((mine?.value ?? 0) - (mine?.quick ? QUICK_POINTS : 0))
                  : text.wrongPlain(question.choices.find((choice) => choice.id === question.answer)?.label ?? question.answer)}
                {right && mine?.quick ? (
                  <span className="play-quick-tag">
                    <Zap aria-hidden="true" size={13} strokeWidth={2.5} />
                    {text.quick(QUICK_POINTS)}
                  </span>
                ) : null}
              </p>
              {question.explain.map((line) => (
                <p key={line} className="play-hint">
                  {line}
                </p>
              ))}
              {question.legs ? <LegList legs={question.legs} /> : null}
              {question.board ? <Board station={question.kicker} rows={question.board} /> : null}
            </div>
          ) : null}
          {phase === "answered" ? <WaitBar key={`wait-${index}`} id={`wait-${index}`} ms={waitMs} right={right} /> : null}
        </section>
      )}
      {phase !== "done" ? <LeaveRow onLeave={onPassport} /> : null}
    </main>
  )
}

function ChoiceLabel({ label }: { label: string }) {
  const parts = label.split(" → ")
  if (parts.length !== 2) return <span>{label}</span>
  return (
    <span className="play-trip-name">
      <span>{parts[0]}</span>
      <span>
        <span aria-hidden="true">→ </span>
        {parts[1]}
      </span>
    </span>
  )
}

function LegList({ legs }: { legs: NonNullable<QuizQuestion["legs"]> }) {
  return (
    <ol className="play-legs">
      {legs.map((leg, index) => (
        <li key={`${leg.line}-${index}`} style={{ "--hue": leg.hue } as CSSProperties}>
          <span className="play-leg-pill" style={{ background: leg.hue, color: inkOn(leg.hue) }}>
            {leg.line}
          </span>
          <span className="play-leg-text">
            {leg.from} → {leg.to}
            <small>
              {[leg.towards ? text.legTowards(leg.towards) : null, leg.platform, leg.stops ? text.legStops(leg.stops) : null]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </span>
        </li>
      ))}
    </ol>
  )
}

function Board({ station, rows }: { station: string; rows: NonNullable<QuizQuestion["board"]> }) {
  return (
    <div className="play-board-list">
      <p className="play-board-title">{text.boardTitle(station)}</p>
      <ul>
        {rows.map((row) => (
          <li key={`${row.platform}-${row.line}-${row.towards}`} className={row.answer ? "play-board-answer" : undefined}>
            <strong>{row.platform}</strong>
            <span className="play-leg-pill" style={{ background: row.hue, color: inkOn(row.hue) }}>
              {row.line}
            </span>
            <span>{text.legTowards(row.towards)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuizDone({
  results,
  tokens,
  fresh,
  finalPoints,
  prevBest,
  hue,
  mastery,
  onAgain,
  onPassport,
}: {
  results: boolean[]
  tokens: number
  fresh: number
  finalPoints: number
  prevBest: number
  hue: string
  mastery?: Mastery
  onAgain: () => void
  onPassport: () => void
}) {
  const shown = useCountUp(finalPoints)
  const out = tokens === 0
  const clean = tokens === RIDE_TOKENS
  const newBest = finalPoints > 0 && finalPoints > prevBest
  const right = results.filter(Boolean).length
  return (
    <section className={out ? "play-done play-done-out" : "play-done"}>
      {newBest || clean ? <Burst colors={[hue, "#f5b301", "#16a34a", "#e11d48"]} /> : null}
      <p className="play-done-kicker">{out ? text.outTitle : text.roundDone}</p>
      <p className="play-done-points">{text.points(shown)}</p>
      <div className="play-badges">
        {newBest ? (
          <p className="play-best-badge">
            <Sparkles aria-hidden="true" size={16} strokeWidth={2.2} />
            {text.newBestRound}
          </p>
        ) : null}
      </div>
      <ul className="play-done-list">
        <li>{text.doneAnswers(right, results.length)}</li>
        {fresh > 0 ? <li className="play-stamp-line">{text.newLearned(fresh)}</li> : null}
        {clean ? <li>{text.cleanRound(CLEAN_POINTS)}</li> : null}
      </ul>
      {mastery ? (
        <div className="play-mastery">
          <span className="play-line-count">{mastery.label(mastery.learned, mastery.total)}</span>
          <span className="play-bar" aria-hidden="true">
            <i style={{ width: `${Math.round((mastery.learned / Math.max(1, mastery.total)) * 100)}%` }} />
          </span>
        </div>
      ) : null}
      <div className="play-actions">
        <button type="button" className="primary" onClick={onAgain}>
          {text.playAgain}
        </button>
        <button type="button" className="play-secondary" onClick={onPassport}>
          {text.passport}
        </button>
      </div>
    </section>
  )
}
