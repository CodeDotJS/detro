import type { Fare, Journey, Leg, ServiceTimes, ServiceTrain } from "../transit/types"
import { fareSchema, journeySchema, serviceSchema } from "./schemas"

export type NormalizeResult =
  | { ok: true; journey: Journey }
  | { ok: false; reason: "invalid" | "empty-route" }

export function normalizeJourney(
  routePayload: unknown,
  farePayload: unknown | null,
  fetchedAt: string,
  servicePayload: unknown | null = null,
  criterion: Journey["criterion"] = "least-distance",
): NormalizeResult {
  const parsed = journeySchema.safeParse(routePayload)
  if (!parsed.success) return { ok: false, reason: "invalid" }
  const route = parsed.data.route
  if (!route || route.length === 0) return { ok: false, reason: "empty-route" }

  const legs: Leg[] = route.map((leg) => {
    const names = leg.path.map((stop) => stop.name)
    const rideStops = names.length >= 2 ? names.length - 1 : null
    return {
      lineCode: null,
      lineName: leg.line,
      towards: blankToNull(leg.towards_station),
      platform: blankToNull(leg.platform_name),
      rideStops,
      startName: leg.start || names[0] || "",
      endName: leg.end || names[names.length - 1] || "",
      intermediateNames: names.slice(1, -1),
      stationCodes: codesFromMapPath(leg["map-path"]),
    }
  })

  return {
    ok: true,
    journey: {
      fetchedAt,
      criterion,
      originName: parsed.data.from || legs[0].startName,
      destinationName: parsed.data.to || legs[legs.length - 1].endName,
      changes: legs.length - 1,
      durationMinutes: durationMinutes(parsed.data.total_time),
      fare: combineFare(parsed.data.fare, farePayload),
      trains: normalizeServiceTimes(servicePayload),
      legs,
    },
  }
}

export function durationMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  return Math.round(seconds / 60)
}

const CLOCK = /^\d{2}:[0-5]\d:[0-5]\d$/

export function normalizeServiceTimes(payload: unknown | null): ServiceTimes {
  const parsed = payload == null ? null : serviceSchema.safeParse(payload)
  if (!parsed?.success) return { first: null, last: null }
  return {
    first: oneTrain(
      parsed.data.first_train?.endstation_from_first_train_estimated_time,
      parsed.data.first_train?.first_train_route_detail,
    ),
    last: oneTrain(
      parsed.data.last_train?.endstation_from_last_train_estimated_time,
      parsed.data.last_train?.last_train_route_detail,
    ),
  }
}

function oneTrain(
  estimated: string | undefined,
  details: Array<{ start_time?: string; end_time?: string }> | undefined,
): ServiceTrain | null {
  const depart = clock(details?.[0]?.start_time)
  const arrive = clock(estimated) ?? clock(details?.at(-1)?.end_time)
  if (!depart || !arrive) return null
  return { depart, arrive }
}

function clock(value: string | undefined): string | null {
  if (!value || !CLOCK.test(value)) return null
  return value
}

function combineFare(routeFare: number | null | undefined, farePayload: unknown | null): Fare {
  const detail = farePayload === null ? null : fareSchema.safeParse(farePayload)
  if (detail?.success) {
    const weekday = detail.data.weekday_fare
    const weekend = detail.data.weekend_fare
    if (typeof weekday === "number" && typeof weekend === "number") {
      return { kind: "weekday-weekend", weekday, weekend }
    }
  }
  if (typeof routeFare === "number") return { kind: "untyped", amount: routeFare }
  return { kind: "unavailable" }
}

export function codesFromMapPath(hops: string[] | undefined): string[] {
  if (!hops || hops.length === 0) return []
  const codes: string[] = []
  for (const hop of hops) {
    const [start, end] = hop.split("-")
    if (!start || !end) continue
    if (codes.length === 0) codes.push(start)
    if (codes[codes.length - 1] !== end) codes.push(end)
  }
  return codes
}

function blankToNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null
  return value
}
