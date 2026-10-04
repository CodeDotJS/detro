export type Lang = "en" | "hi"

export type LineChip = {
  code: string
  name: string
  colorName: string
  color: string
}

export type StationPick = {
  code: string
  name: string
}

export type Suggestion = StationPick & {
  lines: LineChip[]
}

export type Fare =
  | { kind: "weekday-weekend"; weekday: number; weekend: number }
  | { kind: "untyped"; amount: number }
  | { kind: "unavailable" }

export type Leg = {
  lineCode: string | null
  lineName: string
  towards: string | null
  platform: string | null
  rideStops: number | null
  startName: string
  endName: string
  intermediateNames: string[]
  stationCodes: string[]
}

export type ServiceTrain = {
  depart: string
  arrive: string
}

export type ServiceTimes = {
  first: ServiceTrain | null
  last: ServiceTrain | null
}

export type Journey = {
  fetchedAt: string
  criterion: "least-distance" | "fewest-changes"
  originName: string
  destinationName: string
  changes: number
  durationMinutes: number | null
  fare: Fare
  trains: ServiceTimes
  legs: Leg[]
}
