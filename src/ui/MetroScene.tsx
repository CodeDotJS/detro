import { useReducedMotion } from "motion/react"

const lines = ["#c0282c", "#f6d71a", "#3b76c0", "#54ab55", "#8115ff", "#ed91c9", "#f300f3", "#f46808"]
const tile = 720

export function MetroScene() {
  const run = !useReducedMotion()
  return (
    <svg className="metro-scene" viewBox="0 0 720 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <clipPath id="metro-route-clip">
        <rect x="80" y="8" width="560" height="8" rx="4" />
      </clipPath>
      <g clipPath="url(#metro-route-clip)">
        {lines.map((color, index) => (
          <rect key={color} x={80 + index * 70} y="8" width="70" height="8" fill={color} />
        ))}
      </g>
      <g className={run ? "metro-track" : undefined}>
        <Track />
        <Track dx={tile} />
      </g>
      <Train run={run} />
    </svg>
  )
}

function Track({ dx = 0 }: { dx?: number }) {
  const hangers = [60, 180, 300, 420, 540, 660]
  const ties = Array.from({ length: 15 }, (_, index) => 24 + index * 48)
  const dashes = Array.from({ length: 10 }, (_, index) => 22 + index * 72)
  return (
    <g transform={`translate(${dx} 0)`}>
      {hangers.map((x) => (
        <line key={x} x1={x} y1="16" x2={x} y2="46" stroke="#16181d" strokeWidth="1.25" />
      ))}
      <line x1="0" y1="46" x2={tile} y2="46" stroke="#16181d" strokeWidth="1.25" />
      <rect y="186" width={tile} height="6" fill="#f6d71a" />
      {ties.map((x) => (
        <line key={x} x1={x} y1="174" x2={x} y2="184" stroke="#16181d" strokeWidth="2" />
      ))}
      <line x1="0" y1="180" x2={tile} y2="180" stroke="#16181d" strokeWidth="2" />
      {dashes.map((x) => (
        <line key={x} x1={x} y1="204" x2={x + 28} y2="204" stroke="#d5dbe3" strokeWidth="1.5" />
      ))}
    </g>
  )
}

function Train({ run }: { run: boolean }) {
  return (
    <g transform="translate(118 0)">
      <Car wheels={run} />
      <rect x="152" y="118" width="12" height="8" rx="2" fill="#16181d" />
      <Car x={164} wheels={run} doors />
      <rect x="316" y="118" width="12" height="8" rx="2" fill="#16181d" />
      <Car x={328} wheels={run} cab />
      <Pantograph />
    </g>
  )
}

function Car({ x = 0, wheels, doors = false, cab = false }: { x?: number; wheels: boolean; doors?: boolean; cab?: boolean }) {
  const windows = doors ? [14, 112] : [14, 56, 98]
  return (
    <g transform={`translate(${x} 0)`}>
      <rect y="72" width="156" height="90" rx={cab ? 16 : 10} fill="#fff" stroke="#16181d" strokeWidth="2" />
      <rect x="12" y="144" width="132" height="6" fill="#f6d71a" />
      {windows.map((wx) => (
        <g key={wx}>
          <rect x={wx} y="86" width="30" height="36" rx="3" fill="#1c2430" />
          <rect x={wx + 4} y="90" width="22" height="3" rx="1" fill="#fff" opacity="0.45" />
        </g>
      ))}
      {cab ? <circle cx="144" cy="108" r="4.5" fill="#f6d71a" stroke="#16181d" strokeWidth="1.5" /> : null}
      {doors ? (
        <g>
          <rect x="58" y="84" width="16" height="64" rx="2" fill="#16181d" />
          <rect x="62" y="90" width="8" height="16" rx="1" fill="#f6d71a" />
          <rect x="82" y="84" width="16" height="64" rx="2" fill="#16181d" />
          <rect x="86" y="90" width="8" height="16" rx="1" fill="#f6d71a" />
        </g>
      ) : null}
      <Wheel cx={34} cy={170} run={wheels} />
      <Wheel cx={122} cy={170} run={wheels} />
    </g>
  )
}

function Wheel({ cx, cy, run }: { cx: number; cy: number; run: boolean }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g className={run ? "metro-wheel" : undefined}>
        <circle r="10" fill="#16181d" />
        <circle r="3.5" fill="#fff" />
      </g>
    </g>
  )
}

function Pantograph() {
  return (
    <g fill="none" stroke="#16181d" strokeWidth="1.75" strokeLinecap="round">
      <path d="M230 72 L242 46 H258 L270 72" />
      <path d="M236 46 H264" />
    </g>
  )
}
