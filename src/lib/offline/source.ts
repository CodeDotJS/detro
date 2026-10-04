export const SAVED_JOURNEY_AT = "2026-09-30T12:00:00.000"

export type RouteSource = "saved" | "calculated" | "offline"

export function routeSource(online: boolean, savedFile: boolean): RouteSource {
  if (!online) return "offline"
  if (savedFile) return "saved"
  return "calculated"
}
