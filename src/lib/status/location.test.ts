import { beforeEach, describe, expect, it } from "vitest"
import { locationCopy, locationReason, readLocation, resetLocationMemory } from "./location"

const copy = {
  locationUnavailable: "no api",
  locationInsecure: "not secure",
  locationDenied: "blocked",
  locationMissing: "missing",
  locationTimeout: "slow",
}

function fix(lat: number, lng: number) {
  return {
    coords: { latitude: lat, longitude: lng, accuracy: 40 },
  } as GeolocationPosition
}

function fail(code: number) {
  return { code, message: "err", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError
}

beforeEach(() => {
  resetLocationMemory()
})

describe("location request", () => {
  it("maps a missing API and an insecure page before asking", () => {
    expect(locationReason({ geo: false, secure: true })).toBe("unsupported")
    expect(locationReason({ geo: true, secure: false })).toBe("insecure")
    expect(locationCopy("unsupported", copy)).toBe("no api")
    expect(locationCopy("insecure", copy)).toBe("not secure")
  })

  it("maps each geolocation error", () => {
    expect(locationReason({ geo: true, secure: true, code: 1 })).toBe("denied")
    expect(locationReason({ geo: true, secure: true, code: 2 })).toBe("missing")
    expect(locationReason({ geo: true, secure: true, code: 3 })).toBe("timeout")
    expect(locationCopy("denied", copy)).toBe("blocked")
    expect(locationCopy("missing", copy)).toBe("missing")
    expect(locationCopy("timeout", copy)).toBe("slow")
  })

  it("starts the browser lookup in the same turn as the tap", async () => {
    let started = false
    const geo = {
      getCurrentPosition(success: PositionCallback) {
        started = true
        success(fix(28.6565, 77.2303))
      },
    }
    const pending = readLocation(geo as unknown as Geolocation, true)
    expect(started).toBe(true)
    await expect(pending).resolves.toEqual({ ok: true, lat: 28.6565, lng: 77.2303 })
  })

  it("returns a denied reason when the browser blocks the lookup", async () => {
    const geo = {
      getCurrentPosition(_success: PositionCallback, error?: PositionErrorCallback) {
        error?.(fail(1))
      },
    }
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({ ok: false, reason: "denied" })
  })

  it("reuses the last fix instead of asking the browser again", async () => {
    let calls = 0
    const geo = {
      getCurrentPosition() {
        calls += 1
      },
    }
    await expect(readLocation(geo as unknown as Geolocation, true, { lat: 28.61, lng: 77.21 })).resolves.toEqual({
      ok: true,
      lat: 28.61,
      lng: 77.21,
    })
    expect(calls).toBe(0)
  })

  it("remembers a fix so a later tap does not ask the browser again", async () => {
    let calls = 0
    const geo = {
      getCurrentPosition(success: PositionCallback) {
        calls += 1
        success(fix(28.61, 77.21))
      },
    }
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({ ok: true, lat: 28.61, lng: 77.21 })
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({ ok: true, lat: 28.61, lng: 77.21 })
    expect(calls).toBe(1)
  })

  it("asks the browser again after a timeout", async () => {
    let calls = 0
    const geo = {
      getCurrentPosition(_success: PositionCallback, error?: PositionErrorCallback) {
        calls += 1
        error?.(fail(3))
      },
    }
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({ ok: false, reason: "timeout" })
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({ ok: false, reason: "timeout" })
    expect(calls).toBe(2)
  })

  it("uses a watch fix when getCurrentPosition times out", async () => {
    const geo = {
      getCurrentPosition(_success: PositionCallback, error?: PositionErrorCallback) {
        error?.(fail(3))
      },
      watchPosition(success: PositionCallback) {
        success(fix(28.63, 77.22))
        return 7
      },
      clearWatch() {
        return undefined
      },
    }
    await expect(readLocation(geo as unknown as Geolocation, true)).resolves.toEqual({
      ok: true,
      lat: 28.63,
      lng: 77.22,
    })
  })
})
