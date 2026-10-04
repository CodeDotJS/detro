import { z } from "zod"

const briefSchema = z.looseObject({
  station_code: z.string(),
  station_name: z.string(),
  metro_lines: z
    .array(
      z.looseObject({
        line_code: z.string(),
        line_color: z.string(),
        primary_color_code: z.string(),
        status: z.string().optional(),
      }),
    )
    .optional(),
  station_facility: z.array(z.looseObject({ name: z.string() })).optional(),
  lifts: z
    .array(
      z.looseObject({
        lift_type: z.string().optional(),
        name: z.string().optional(),
        description_location: z.string().optional(),
        status: z.boolean().nullable().optional(),
        last_update: z.string().nullable().optional(),
        divyang_friendly: z.boolean().nullable().optional(),
        from_gate_code: z.array(z.string()).optional(),
        to_gate_code: z.array(z.string()).optional(),
      }),
    )
    .optional(),
})

export type StationBrief = {
  code: string
  name: string
  lines: Array<{ code: string; colorName: string; color: string; status: string | null }>
  facilities: string[]
  lifts: Array<{
    type: string
    name: string
    location: string
    listedWorking: boolean | null
    lastUpdate: string | null
  }>
  gateCodes: string[]
}

export function parseStationBrief(payload: unknown): StationBrief | null {
  const parsed = briefSchema.safeParse(payload)
  if (!parsed.success) return null
  const brief = parsed.data
  const gateCodes = new Set<string>()
  for (const lift of brief.lifts ?? []) {
    for (const code of [...(lift.from_gate_code ?? []), ...(lift.to_gate_code ?? [])]) {
      if (code.trim()) gateCodes.add(code)
    }
  }
  return {
    code: brief.station_code,
    name: brief.station_name,
    lines: (brief.metro_lines ?? []).map((line) => ({
      code: line.line_code,
      colorName: line.line_color,
      color: line.primary_color_code,
      status: line.status ?? null,
    })),
    facilities: (brief.station_facility ?? []).map((item) => item.name),
    lifts: (brief.lifts ?? []).map((lift) => ({
      type: lift.lift_type ?? "",
      name: lift.name ?? "",
      location: (lift.description_location ?? "").trim(),
      listedWorking: lift.status ?? null,
      lastUpdate: lift.last_update ?? null,
    })),
    gateCodes: [...gateCodes],
  }
}
