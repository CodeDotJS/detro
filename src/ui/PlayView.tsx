import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import {
  ArrowLeftRight,
  CloudCheck,
  CloudDownload,
  Coins,
  DoorClosed,
  Scale,
  Signpost,
  TrainFront,
  Zap,
} from "lucide-react"
import coordinatesFile from "../../data/en/coordinates.json"
import platformsFile from "../../data/en/platforms.json"
import { playCopy as text } from "../i18n/play"
import { cachedJourneyOrigins, savedOriginPack } from "../lib/offline/saved"
import { changeQuestions } from "../lib/play/change"
import { compareQuestions } from "../lib/play/compare"
import { buildGameNetwork, type GameNetwork, type Point } from "../lib/play/network"
import { askablePlatformFacts, platformQuestions, type PlatformTable } from "../lib/play/platform"
import { stampedTotal, type PlayProgress } from "../lib/play/progress"
import { interchanges, pickWeighted, type ModeId, type QuizQuestion } from "../lib/play/quiz"
import { planRide, type Ride } from "../lib/play/ride"
import { mulberry32 } from "../lib/play/rng"
import type { LineSequence } from "../lib/transit/route"
import { RankLine } from "./PlayParts"
import { PlayQuiz, type Mastery } from "./PlayQuiz"
import { PlayRide } from "./PlayRide"

const coords = (coordinatesFile as { stations: Record<string, Point> }).stations
const platforms = (platformsFile as { stations: PlatformTable }).stations

const MODE_HUE: Record<ModeId, string> = { change: "#0e7490", platform: "#b45309", compare: "#be123c" }
const MODE_TITLE: Record<ModeId, string> = { change: text.modeChange, platform: text.modePlatform, compare: text.modeCompare }
const MIN_QUESTIONS = 4

type Game =
  | { kind: "ride"; ride: Ride }
  | { kind: "quiz"; mode: ModeId; questions: QuizQuestion[] }
  | { kind: "loading"; mode: ModeId }
  | { kind: "missing"; mode: ModeId }

export function PlayView({
  lines,
  fetchedAt,
  progress,
  onProgress,
  homeCodes = [],
  seed,
  startRide,
}: {
  lines: LineSequence[]
  fetchedAt: string
  progress: PlayProgress
  onProgress: (update: (current: PlayProgress) => PlayProgress) => void
  homeCodes?: string[]
  seed?: number
  startRide?: Ride
}) {
  const network = useMemo(() => buildGameNetwork(lines, coords), [lines])
  const hubs = useMemo(() => interchanges(network), [network])
  const platformTotal = useMemo(() => new Set(askablePlatformFacts(network, platforms).map((fact) => fact.key)).size, [network])
  const rng = useRef(mulberry32(seed ?? Date.now() % 1_000_000))
  const [game, setGame] = useState<Game | null>(startRide ? { kind: "ride", ride: startRide } : null)
  const [gameKey, setGameKey] = useState(0)
  const request = useRef(0)
  const savedStations = useSavedStations(game === null, network.stationCount)

  function show(next: Game | null) {
    setGame(next)
    setGameKey((key) => key + 1)
    window.scrollTo?.({ top: 0 })
  }

  function ride(next: Ride | null) {
    if (next) show({ kind: "ride", ride: next })
  }

  async function quiz(mode: ModeId) {
    const ticket = (request.current += 1)
    if (mode === "platform") {
      const questions = platformQuestions(network, platforms, rng.current, progress.learned.platform, progress.missed.platform)
      show(questions.length >= MIN_QUESTIONS ? { kind: "quiz", mode, questions } : { kind: "missing", mode })
      return
    }
    show({ kind: "loading", mode })
    const cached = await cachedJourneyOrigins()
    if (ticket !== request.current) return
    const known = [...network.names.keys()]
    const ready = cached && cached.size > 0 ? known.filter((code) => cached.has(code)) : navigator.onLine ? known : []
    const origins = pickWeighted(
      ready.map((code) => ({
        item: code,
        weight: homeCodes.includes(code) ? 8 : hubs.has(code) ? 2 : 1,
      })),
      5,
      rng.current,
    )
    for (const origin of origins) {
      const pack = await savedOriginPack(origin).catch(() => null)
      if (ticket !== request.current) return
      if (!pack) continue
      const questions =
        mode === "change"
          ? changeQuestions(network, origin, pack, rng.current, progress.learned.change)
          : compareQuestions(network, origin, pack, rng.current)
      if (questions.length >= MIN_QUESTIONS) {
        show({ kind: "quiz", mode, questions })
        return
      }
    }
    if (ticket === request.current) show({ kind: "missing", mode })
  }

  function home() {
    request.current += 1
    show(null)
  }

  const mastery: Partial<Record<ModeId, Mastery>> = {
    platform: { learned: progress.learned.platform?.length ?? 0, total: platformTotal, label: text.learnedPlatforms },
    change: {
      learned: (progress.learned.change ?? []).filter((code) => hubs.has(code)).length,
      total: hubs.size,
      label: text.learnedChanges,
    },
  }

  if (game?.kind === "ride") {
    return (
      <PlayRide
        key={gameKey}
        network={network}
        ride={game.ride}
        progress={progress}
        fetchedAt={fetchedAt}
        rng={rng.current}
        onProgress={onProgress}
        onRideOn={(end) =>
          ride(planRide(network, progress, rng.current, end.lineCode, { code: end.code, towardsCode: end.towardsCode }))
        }
        onPassport={home}
      />
    )
  }

  if (game?.kind === "quiz") {
    return (
      <PlayQuiz
        key={gameKey}
        mode={game.mode}
        title={MODE_TITLE[game.mode]}
        hue={MODE_HUE[game.mode]}
        questions={game.questions}
        progress={progress}
        mastery={mastery[game.mode]}
        onProgress={onProgress}
        onAgain={() => void quiz(game.mode)}
        onPassport={home}
      />
    )
  }

  if (game) {
    return (
      <main className="sheet play-page play-wait-page" style={{ "--hue": MODE_HUE[game.mode] } as CSSProperties}>
        <h1 className="play-line-pill">{MODE_TITLE[game.mode]}</h1>
        <p>{game.kind === "loading" ? text.loading : text.needsPack}</p>
        {game.kind === "missing" ? (
          <button type="button" className="play-secondary" onClick={home}>
            {text.passport}
          </button>
        ) : null}
      </main>
    )
  }

  return (
    <Passport
      network={network}
      progress={progress}
      mastery={mastery}
      savedStations={savedStations}
      onQuick={() => ride(planRide(network, progress, rng.current))}
      onMode={(mode) => void quiz(mode)}
    />
  )
}

/** How many starting stations already have a saved journey. Rechecks while that copy is still filling. */
function useSavedStations(active: boolean, total: number): number | null {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    if (!active) return
    let live = true
    let timer = 0
    const check = async () => {
      const cached = await cachedJourneyOrigins()
      if (!live) return
      setCount(cached ? cached.size : null)
      if (cached && cached.size < total) timer = window.setTimeout(check, 4000)
    }
    void check()
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [active, total])
  return count
}

function Passport({
  network,
  progress,
  mastery,
  savedStations,
  onQuick,
  onMode,
}: {
  network: GameNetwork
  progress: PlayProgress
  mastery: Partial<Record<ModeId, Mastery>>
  savedStations: number | null
  onQuick: () => void
  onMode: (mode: ModeId) => void
}) {
  const total = stampedTotal(progress, network.lines)
  const share = network.stationCount > 0 ? total / network.stationCount : 0
  if (network.lines.length === 0) {
    return (
      <main className="sheet play-page">
        <h1>{text.tab}</h1>
        <p>{text.empty}</p>
      </main>
    )
  }
  const masteryLine = (mode: ModeId) => {
    const item = mastery[mode]
    return item ? item.label(item.learned, item.total) : null
  }
  return (
    <main className="sheet play-page play-passport">
      <div className="play-intro">
        <h1>{text.tab}</h1>
        <p className="lede">{text.lead}</p>
        <section className="play-stats" aria-label={text.passport}>
          <p className="play-stats-main">{text.stamped(total, network.stationCount)}</p>
          <span className="play-bar" aria-hidden="true">
            <i style={{ width: `${Math.round(share * 100)}%` }} />
          </span>
          <RankLine stamped={total} total={network.stationCount} />
        </section>
        <h2 className="play-games-title">{text.games}</h2>
        <ul className="play-modes">
          <ModeCard
            hue="#16181d"
            icon={<TrainFront aria-hidden="true" size={20} strokeWidth={2} />}
            title={text.modeNext}
            note={text.modeNextNote}
            stat={text.modeBest(progress.best)}
            onPick={onQuick}
          />
          <ModeCard
            hue={MODE_HUE.change}
            icon={<ArrowLeftRight aria-hidden="true" size={20} strokeWidth={2} />}
            title={text.modeChange}
            note={text.modeChangeNote}
            stat={text.modeBest(progress.modes.change?.best ?? 0)}
            extra={masteryLine("change")}
            onPick={() => onMode("change")}
          />
          <ModeCard
            hue={MODE_HUE.platform}
            icon={<Signpost aria-hidden="true" size={20} strokeWidth={2} />}
            title={text.modePlatform}
            note={text.modePlatformNote}
            stat={text.modeBest(progress.modes.platform?.best ?? 0)}
            extra={masteryLine("platform")}
            onPick={() => onMode("platform")}
          />
          <ModeCard
            hue={MODE_HUE.compare}
            icon={<Scale aria-hidden="true" size={20} strokeWidth={2} />}
            title={text.modeCompare}
            note={text.modeCompareNote}
            stat={text.modeBest(progress.modes.compare?.best ?? 0)}
            onPick={() => onMode("compare")}
          />
        </ul>
        {savedStations !== null ? (
          <p className="play-offline">
            {savedStations >= network.stationCount ? (
              <CloudCheck aria-hidden="true" size={16} strokeWidth={2} />
            ) : (
              <CloudDownload aria-hidden="true" size={16} strokeWidth={2} />
            )}
            {savedStations >= network.stationCount
              ? text.offlineAll
              : text.offlineSome(savedStations, network.stationCount)}
          </p>
        ) : null}
        <ul className="play-rules">
          <li>
            <Coins aria-hidden="true" size={16} strokeWidth={2} />
            {text.ruleTokens}
          </li>
          <li>
            <Zap aria-hidden="true" size={16} strokeWidth={2} />
            {text.ruleExpress}
          </li>
          <li>
            <DoorClosed aria-hidden="true" size={16} strokeWidth={2} />
            {text.ruleDoors}
          </li>
        </ul>
      </div>
    </main>
  )
}

function ModeCard({
  hue,
  icon,
  title,
  note,
  stat,
  extra,
  onPick,
}: {
  hue: string
  icon: ReactNode
  title: string
  note: string
  stat: string
  extra?: string | null
  onPick: () => void
}) {
  return (
    <li>
      <button type="button" className="play-mode" style={{ "--hue": hue } as CSSProperties} onClick={onPick}>
        <span className="play-mode-icon">{icon}</span>
        <span className="play-mode-body">
          <span className="play-mode-title">{title}</span>
          <span className="play-mode-note">{note}</span>
          <span className="play-mode-stat">{extra ? `${stat} · ${extra}` : stat}</span>
        </span>
      </button>
    </li>
  )
}
