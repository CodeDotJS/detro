import type { Copy } from "../../i18n/copy"
import type { StationPick, Suggestion } from "../transit/types"

export type PlanState = {
  fromQuery: string
  toQuery: string
  from: StationPick | null
  to: StationPick | null
  activeField: "from" | "to" | null
  suggestions: Suggestion[]
  suggestionStatus: "idle" | "loading" | "ready" | "empty" | "error"
  highlight: number
}

type Field = "from" | "to"

export type PlanAction =
  | { type: "focus"; field: Field }
  | { type: "type"; field: Field; query: string }
  | { type: "loading"; field: Field }
  | { type: "suggestions"; field: Field; stations: Suggestion[] }
  | { type: "search-error"; field: Field }
  | { type: "select"; field: Field; code: string }
  | { type: "highlight"; index: number }
  | { type: "swap" }
  | { type: "clear" }
  | { type: "attach-lines"; index: Map<string, Suggestion["lines"]> }
  | { type: "apply-language"; names: Map<string, string> }
  | { type: "set-station"; field: Field; pick: StationPick }

export function createPlanState(): PlanState {
  return {
    fromQuery: "",
    toQuery: "",
    from: null,
    to: null,
    activeField: null,
    suggestions: [],
    suggestionStatus: "idle",
    highlight: -1,
  }
}

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case "focus":
      return {
        ...state,
        activeField: action.field,
        suggestions: [],
        suggestionStatus: "idle",
        highlight: -1,
      }
    case "type": {
      const cleared = {
        suggestions: [] as Suggestion[],
        highlight: -1,
        suggestionStatus: action.query.trim() ? state.suggestionStatus : ("idle" as const),
      }
      if (action.field === "from") {
        return { ...state, ...cleared, activeField: "from", fromQuery: action.query, from: null }
      }
      return { ...state, ...cleared, activeField: "to", toQuery: action.query, to: null }
    }
    case "loading":
      if (state.activeField !== action.field) return state
      return { ...state, suggestionStatus: "loading", highlight: -1 }
    case "suggestions": {
      if (state.activeField !== action.field) return state
      if (action.stations.length === 0) {
        return { ...state, suggestions: [], suggestionStatus: "empty", highlight: -1 }
      }
      const query = (action.field === "from" ? state.fromQuery : state.toQuery).trim().toLocaleLowerCase()
      const exact = action.stations.findIndex((station) => station.code.toLocaleLowerCase() === query)
      return { ...state, suggestions: action.stations, suggestionStatus: "ready", highlight: exact }
    }
    case "search-error":
      if (state.activeField !== action.field) return state
      return { ...state, suggestions: [], suggestionStatus: "error", highlight: -1 }
    case "select": {
      if (state.activeField !== action.field) return state
      const station = state.suggestions.find((item) => item.code === action.code)
      if (!station) return state
      const pick = { code: station.code, name: station.name }
      const cleared = { suggestions: [], suggestionStatus: "idle" as const, highlight: -1 }
      if (action.field === "from") {
        return { ...state, ...cleared, from: pick, fromQuery: station.name }
      }
      return { ...state, ...cleared, to: pick, toQuery: station.name }
    }
    case "highlight": {
      if (state.suggestions.length === 0) return { ...state, highlight: -1 }
      const index = Math.max(-1, Math.min(action.index, state.suggestions.length - 1))
      return { ...state, highlight: index }
    }
    case "clear":
      return createPlanState()
    case "swap":
      return {
        ...state,
        from: state.to,
        to: state.from,
        fromQuery: state.toQuery,
        toQuery: state.fromQuery,
        suggestions: [],
        suggestionStatus: "idle",
        highlight: -1,
        activeField: null,
      }
    case "attach-lines":
      return {
        ...state,
        suggestions: state.suggestions.map((station) => ({
          ...station,
          lines: action.index.get(station.code) ?? station.lines,
        })),
      }
    case "set-station": {
      const cleared = { suggestions: [] as Suggestion[], suggestionStatus: "idle" as const, highlight: -1 }
      if (action.field === "from") {
        return { ...state, ...cleared, from: action.pick, fromQuery: action.pick.name }
      }
      return { ...state, ...cleared, to: action.pick, toQuery: action.pick.name }
    }
    case "apply-language": {
      const rename = (pick: StationPick | null) => {
        if (!pick) return null
        return { code: pick.code, name: action.names.get(pick.code) ?? pick.name }
      }
      const from = rename(state.from)
      const to = rename(state.to)
      return {
        ...state,
        from,
        to,
        fromQuery: from ? from.name : state.fromQuery,
        toQuery: to ? to.name : state.toQuery,
        suggestions: [],
        suggestionStatus: "idle",
        highlight: -1,
      }
    }
    default:
      return state
  }
}

export function routeBlockReason(
  from: StationPick | null,
  to: StationPick | null,
  text: Copy,
): string | null {
  if (!from || !to) return text.needBoth
  if (from.code === to.code) return text.sameStation
  return null
}
