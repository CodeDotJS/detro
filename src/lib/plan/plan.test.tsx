import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { copy } from "../../i18n/copy"
import { normalizeJourney } from "../dmrc/normalize"
import firstLastRiKg from "../../../tests/fixtures/dmrc/first-last-ri-kg.json"
import routeFareRemoved from "../../../tests/fixtures/dmrc/route-ri-kg.fare-removed.json"
import routeRiKg from "../../../tests/fixtures/dmrc/route-ri-kg.json"
import routeRiRck from "../../../tests/fixtures/dmrc/route-ri-rck.json"
import { journeySteps } from "../transit/present"
import { HelpView } from "../../ui/HelpView"
import { PlanView } from "../../ui/PlanView"
import { createPlanState, planReducer, routeBlockReason } from "./state"

describe("station selection", () => {
  it("stores the chosen station code and ignores an unknown one", () => {
    let state = planReducer(createPlanState(), { type: "focus", field: "from" })
    state = planReducer(state, { type: "type", field: "from", query: "Rith" })
    state = planReducer(state, {
      type: "suggestions",
      field: "from",
      stations: [
        { code: "RI", name: "RITHALA", lines: [] },
        { code: "RCK", name: "RAJIV CHOWK", lines: [] },
      ],
    })
    const missed = planReducer(state, { type: "select", field: "from", code: "RITHALA" })
    expect(missed.from).toBeNull()
    const selected = planReducer(state, { type: "select", field: "from", code: "RI" })
    expect(selected.from).toEqual({ code: "RI", name: "RITHALA" })
    const edited = planReducer(selected, { type: "type", field: "from", query: "RITHAL" })
    expect(edited.from).toBeNull()
  })

  it("swaps origin and destination without dropping codes", () => {
    let state = planReducer(createPlanState(), { type: "focus", field: "from" })
    state = planReducer(state, {
      type: "suggestions",
      field: "from",
      stations: [{ code: "RI", name: "RITHALA", lines: [] }],
    })
    state = planReducer(state, { type: "select", field: "from", code: "RI" })
    state = planReducer(state, { type: "focus", field: "to" })
    state = planReducer(state, {
      type: "suggestions",
      field: "to",
      stations: [{ code: "KG", name: "KASHMERE GATE", lines: [] }],
    })
    state = planReducer(state, { type: "select", field: "to", code: "KG" })
    const swapped = planReducer(state, { type: "swap" })
    expect(swapped.from).toEqual({ code: "KG", name: "KASHMERE GATE" })
    expect(swapped.to).toEqual({ code: "RI", name: "RITHALA" })
    const cleared = planReducer(swapped, { type: "clear" })
    expect(cleared).toEqual(createPlanState())
  })

  it("highlights a suggestion whose code matches the typed text", () => {
    let state = planReducer(createPlanState(), { type: "focus", field: "from" })
    state = planReducer(state, { type: "type", field: "from", query: "gnpk" })
    state = planReducer(state, {
      type: "suggestions",
      field: "from",
      stations: [
        { code: "GNPK", name: "GREEN PARK", lines: [] },
        { code: "XX", name: "SOME GNPK PLACE", lines: [] },
      ],
    })
    expect(state.highlight).toBe(0)
  })

  it("ignores suggestions for a field that is no longer active", () => {
    let state = planReducer(createPlanState(), { type: "focus", field: "from" })
    state = planReducer(state, { type: "focus", field: "to" })
    state = planReducer(state, {
      type: "suggestions",
      field: "from",
      stations: [{ code: "RI", name: "RITHALA", lines: [] }],
    })
    expect(state.suggestions).toEqual([])
    expect(state.suggestionStatus).toBe("idle")
  })

  it("asks for two different stations before a request", () => {
    const from = { code: "RI", name: "RITHALA" }
    expect(routeBlockReason(from, null, copy.en)).toBe(copy.en.needBoth)
    expect(routeBlockReason(from, from, copy.en)).toBe(copy.en.sameStation)
    expect(routeBlockReason(from, { code: "KG", name: "KASHMERE GATE" }, copy.en)).toBeNull()
  })
})

describe("readable steps", () => {
  it("writes a direct journey with a platform", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    expect(journeySteps(result.journey, copy.en)).toEqual([
      "Go to RITHALA.",
      "Take the Red Line towards SHAHEED STHAL ( NEW BUS ADDA). Platform: Platform No. 2.",
      "Travel 13 stops.",
      "Get off at KASHMERE GATE.",
    ])
  })

  it("writes the change on a two-leg journey", () => {
    const result = normalizeJourney(routeRiRck, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const steps = journeySteps(result.journey, copy.en)
    expect(steps).toContain("Change at KASHMERE GATE.")
    expect(steps).toContain(
      "Take the Yellow Line towards MILLENNIUM CITY CENTRE GURUGRAM. Platform: Platform No. 1.",
    )
    expect(steps.at(-1)).toBe("Get off at RAJIV CHOWK.")
  })

  it("omits a platform line when the leg has none", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const journey = {
      ...result.journey,
      legs: result.journey.legs.map((leg) => ({ ...leg, platform: null })),
    }
    expect(journeySteps(journey, copy.en).some((step) => step.includes("Platform"))).toBe(false)
  })
})

describe("plan screen", () => {
  const handlers = {
    onLang: () => undefined,
    onType: () => undefined,
    onFocus: () => undefined,
    onSelect: () => undefined,
    onHighlight: () => undefined,
    onSwap: () => undefined,
    onSubmit: () => undefined,
  }

  it("shows the English planning controls", () => {
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="idle"
        message={null}
        journey={null}
        {...handlers}
      />,
    )
    expect(html).toContain("Where do you want to go?")
    expect(html).toContain("From")
    expect(html).toContain("To")
    expect(html).toContain("Swap stations")
    expect(html).toContain("Show my route")
    expect(html).not.toContain("Not an official DMRC app")
    expect(html).not.toContain("not been reviewed")
    expect(html).not.toContain("not a live planner")
  })

  it("shows the selected station line color beside From and To", () => {
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={{
          ...createPlanState(),
          from: { code: "SAKT", name: "SAKET" },
          fromQuery: "SAKET",
          to: { code: "RI", name: "RITHALA" },
          toQuery: "RITHALA",
        }}
        phase="idle"
        message={null}
        journey={null}
        lines={[
          {
            code: "LN2",
            show: true,
            label: { en: { name: "Line 2", colorName: "Yellow Line", color: "#f6d71a" }, hi: { name: "Line 2", colorName: "Yellow Line", color: "#f6d71a" } },
            stations: [{ code: "SAKT", names: { en: "SAKET" } }],
          },
          {
            code: "LN1",
            show: true,
            label: { en: { name: "Line 1", colorName: "Red Line", color: "#c0282c" }, hi: { name: "Line 1", colorName: "Red Line", color: "#c0282c" } },
            stations: [{ code: "RI", names: { en: "RITHALA" } }],
          },
        ]}
        {...handlers}
      />,
    )
    expect(html).toContain("#f6d71a")
    expect(html).toContain("#c0282c")
    expect(html.indexOf("#f6d71a")).toBeLessThan(html.indexOf("#c0282c"))
  })

  it("keeps the independent notice and snapshot note on Help", () => {
    const html = renderToStaticMarkup(
      <HelpView
        copy={copy.en}
        textSize={16}
        snapshotDate="2026-09-30"
        notice={null}
        journeyAt="2026-09-30T12:00:00.000"
        onTextSize={() => undefined}
        onClear={() => undefined}
        onDismissNotice={() => undefined}
      />,
    )
    expect(html).toContain("Not an official DMRC app")
    expect(html).not.toContain("हिन्दी")
    expect(html).toContain("not a live planner")
  })

  it("names a control that removes one saved trip", () => {
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="idle"
        message={null}
        journey={null}
        trips={[{ fromCode: "RI", toCode: "KG", label: "RITHALA → KASHMERE GATE" }]}
        {...handlers}
      />,
    )
    expect(html).toContain('aria-label="Remove RITHALA → KASHMERE GATE"')
  })

  it("marks the field filled from the map", () => {
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="idle"
        message="SHAHEED STHAL is where you start. Now choose where you are going."
        journey={null}
        placedField="from"
        {...handlers}
      />,
    )
    expect(html).toContain("field-placed")
    expect(html).toContain("SHAHEED STHAL is where you start")
  })

  it("shows an unavailable fare instead of a number", () => {
    const result = normalizeJourney(routeFareRemoved, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        {...handlers}
      />,
    )
    expect(html).toContain("Fare unavailable")
    expect(html).toContain("Least distance")
    expect(html).toContain("About 26 minutes")
    expect(html).not.toContain("₹0")
  })

  it("shows the line, direction, and platform on the timeline", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        {...handlers}
      />,
    )
    expect(html).toContain("Red Line")
    expect(html).toContain("Towards SHAHEED STHAL ( NEW BUS ADDA)")
    expect(html).toContain("Platform No. 2")
    expect(html).toContain("13 stops")
    expect(html).toContain("Stations on this train")
    expect(html).toContain("stops-chevron")
    expect(html).not.toContain("stops in between")
    expect(html).not.toContain("Take the")
  })

  it("shows fewest changes beside least distance when the second ride differs", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        alternate={{ ...result.journey, criterion: "fewest-changes", changes: 1, durationMinutes: 44 }}
        {...handlers}
      />,
    )
    expect(html).toContain("Least distance")
    expect(html).toContain("Fewest changes")
    expect(html).toContain("1 change")
    expect(html).toContain("About 44 minutes")
  })

  it("shows where to change on a two-line journey", () => {
    const result = normalizeJourney(routeRiRck, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        {...handlers}
      />,
    )
    expect(html).toContain("Change here for the Yellow Line")
    expect(html).toContain("change-note")
  })

  it("shows first and last trains from the saved pair", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z", firstLastRiKg)
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        {...handlers}
      />,
    )
    expect(html.indexOf("Red Line")).toBeGreaterThan(-1)
    expect(html.indexOf("Red Line")).toBeLessThan(html.indexOf("Scheduled"))
    expect(html.indexOf("Fare")).toBeLessThan(html.indexOf("Scheduled"))
    expect(html).toContain("First train")
    expect(html).toContain("6:00")
    expect(html).toContain("am")
    expect(html).toContain("6:34")
    expect(html).toContain("Last train")
    expect(html).toContain("11:00")
    expect(html).toContain("pm")
    expect(html).toContain("11:25")
    expect(html).toContain("Scheduled")
    expect(html).not.toContain("06:00:02")
    expect(html).not.toContain("Leaves 06:00:02")
    expect(html).toContain("not a live departure")
  })

  it("omits first and last trains when the saved pair has none", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    if (!result.ok) throw new Error("expected journey")
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="ready"
        message={null}
        journey={result.journey}
        {...handlers}
      />,
    )
    expect(html).not.toContain("First train")
    expect(html).not.toContain("Last train")
  })

  it("shows a friendly no-results state", () => {
    const state = {
      ...createPlanState(),
      activeField: "from" as const,
      fromQuery: "zzzz",
      suggestionStatus: "empty" as const,
    }
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={state}
        phase="idle"
        message={null}
        journey={null}
        {...handlers}
      />,
    )
    expect(html).toContain("No stations match that name")
  })

  it("shows an error without a sample journey", () => {
    const html = renderToStaticMarkup(
      <PlanView
        copy={copy.en}
        lang="en"
        state={createPlanState()}
        phase="error"
        message={copy.en.serviceError}
        journey={null}
        {...handlers}
      />,
    )
    expect(html).toContain(copy.en.serviceError)
    expect(html).not.toContain("Take the")
  })
})
