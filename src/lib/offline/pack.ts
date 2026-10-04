import type { Fare, Journey, Leg, ServiceTrain } from "../transit/types"

export type PackLeg = {
  n: string
  t?: string | null
  p?: string | null
  c?: string[]
  s?: string[]
}

export type PackRide = {
  m?: number | null
  w?: number | null
  e?: number | null
  a?: number | null
  f?: [string, string] | null
  l?: [string, string] | null
  g?: PackLeg[]
}

export function journeyFromPack(
  ride: PackRide,
  names: Map<string, string>,
  fetchedAt: string,
  criterion: Journey["criterion"],
): Journey | null {
  const legs = (ride.g ?? []).map((leg) => legFromPack(leg, names)).filter((leg) => leg.startName && leg.endName)
  if (legs.length === 0) return null
  return {
    fetchedAt,
    criterion,
    originName: legs[0].startName,
    destinationName: legs[legs.length - 1].endName,
    changes: legs.length - 1,
    durationMinutes: typeof ride.m === "number" ? ride.m : null,
    fare: fareFromPack(ride),
    trains: {
      first: trainFromPack(ride.f),
      last: trainFromPack(ride.l),
    },
    legs,
  }
}

function legFromPack(leg: PackLeg, names: Map<string, string>): Leg {
  const codes = Array.isArray(leg.c) ? leg.c.filter((code) => code.length > 0) : []
  const stored = Array.isArray(leg.s) ? leg.s.filter((name) => name.length > 0) : []
  const labels = codes.length >= 2 ? codes.map((code) => names.get(code) ?? code) : stored
  return {
    lineCode: null,
    lineName: leg.n,
    towards: blank(leg.t),
    platform: blank(leg.p),
    rideStops: labels.length >= 2 ? labels.length - 1 : null,
    startName: labels[0] ?? "",
    endName: labels[labels.length - 1] ?? "",
    intermediateNames: labels.slice(1, -1),
    stationCodes: codes,
  }
}

function fareFromPack(ride: PackRide): Fare {
  if (typeof ride.w === "number" && typeof ride.e === "number") {
    return { kind: "weekday-weekend", weekday: ride.w, weekend: ride.e }
  }
  if (typeof ride.a === "number") return { kind: "untyped", amount: ride.a }
  return { kind: "unavailable" }
}

function trainFromPack(pair: [string, string] | null | undefined): ServiceTrain | null {
  if (!pair || pair.length < 2) return null
  const [depart, arrive] = pair
  if (!depart || !arrive) return null
  return { depart, arrive }
}

function blank(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null
  return value
}
