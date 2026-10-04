import { describe, expect, it } from "vitest"
import rithala from "../../../data/en/journeys/RI.json"
import { journeyFromPack, type PackRide } from "./pack"

describe("packed offline journey", () => {
  const names = new Map([
    ["RI", "RITHALA"],
    ["KG", "KASHMERE GATE"],
  ])

  it("keeps the fare, platform, and first and last train", () => {
    const journey = journeyFromPack(
      {
        m: 26,
        w: 30,
        e: 20,
        f: ["06:05:00", "06:31:00"],
        l: ["23:10:00", "23:36:00"],
        g: [{ n: "Red Line", t: "SHAHEED STHAL ( NEW BUS ADDA)", p: "Platform No. 1", c: ["RI", "KG"] }],
      },
      names,
      "2026-09-30T03:31:59+05:30",
      "least-distance",
    )
    expect(journey).toMatchObject({
      originName: "RITHALA",
      destinationName: "KASHMERE GATE",
      changes: 0,
      durationMinutes: 26,
      fare: { kind: "weekday-weekend", weekday: 30, weekend: 20 },
      trains: {
        first: { depart: "06:05:00", arrive: "06:31:00" },
        last: { depart: "23:10:00", arrive: "23:36:00" },
      },
      legs: [
        {
          lineName: "Red Line",
          towards: "SHAHEED STHAL ( NEW BUS ADDA)",
          platform: "Platform No. 1",
          stationCodes: ["RI", "KG"],
        },
      ],
    })
  })

  it("reads the saved Rithala to Welcome fare", () => {
    const ride = (rithala as unknown as Record<string, { d?: PackRide }>).WC?.d
    const journey = ride
      ? journeyFromPack(
          ride,
          new Map([
            ["RI", "RITHALA"],
            ["WC", "WELCOME"],
          ]),
          "2026-09-30T03:31:59+05:30",
          "least-distance",
        )
      : null
    expect(journey).toMatchObject({
      originName: "RITHALA",
      destinationName: "WELCOME",
      durationMinutes: 34,
      fare: { kind: "weekday-weekend", weekday: 43, weekend: 32 },
      legs: [{ lineName: "Red Line", platform: "Platform No. 2" }],
    })
  })
})
