export type LocationReason = "unsupported" | "insecure" | "denied" | "missing" | "timeout"

export type LocationResult = { ok: true; lat: number; lng: number } | { ok: false; reason: LocationReason }

export type Coordinate = { lat: number; lng: number }

type LocationCopy = {
  locationUnavailable: string
  locationInsecure: string
  locationDenied: string
  locationMissing: string
  locationTimeout: string
}

let memory: Coordinate | null = null

export function rememberedLocation(): Coordinate | null {
  return memory
}

export function resetLocationMemory() {
  memory = null
}

export function locationReason(input: { geo: boolean; secure: boolean; code?: number }): LocationReason {
  if (!input.geo) return "unsupported"
  if (!input.secure) return "insecure"
  if (input.code === 1) return "denied"
  if (input.code === 3) return "timeout"
  return "missing"
}

export function locationCopy(reason: LocationReason, copy: LocationCopy): string {
  if (reason === "unsupported") return copy.locationUnavailable
  if (reason === "insecure") return copy.locationInsecure
  if (reason === "denied") return copy.locationDenied
  if (reason === "timeout") return copy.locationTimeout
  return copy.locationMissing
}

export function readLocation(
  geo: Geolocation | undefined,
  secure: boolean,
  last?: Coordinate | null,
): Promise<LocationResult> {
  if (last) {
    memory = last
    return Promise.resolve({ ok: true, lat: last.lat, lng: last.lng })
  }
  if (memory) return Promise.resolve({ ok: true, lat: memory.lat, lng: memory.lng })
  const blocked = locationReason({ geo: Boolean(geo), secure })
  if (blocked === "unsupported" || blocked === "insecure") {
    return Promise.resolve({ ok: false, reason: blocked })
  }

  return new Promise((resolve) => {
    let settled = false
    let watchId: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let leftover = typeof geo!.watchPosition === "function" ? 2 : 1

    const finish = (result: LocationResult) => {
      if (settled) return
      settled = true
      if (timer !== undefined) clearTimeout(timer)
      if (watchId !== undefined) {
        try {
          geo!.clearWatch(watchId)
        } catch {
          // The watch is already gone.
        }
      }
      if (result.ok) memory = { lat: result.lat, lng: result.lng }
      resolve(result)
    }

    const onOk = (position: GeolocationPosition) => {
      finish({ ok: true, lat: position.coords.latitude, lng: position.coords.longitude })
    }

    const onErr = (error: GeolocationPositionError) => {
      const reason = locationReason({ geo: true, secure: true, code: error.code })
      if (reason === "denied") {
        finish({ ok: false, reason })
        return
      }
      leftover -= 1
      if (leftover <= 0) finish({ ok: false, reason })
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      maximumAge: Number.POSITIVE_INFINITY,
      timeout: 20_000,
    }

    try {
      geo!.getCurrentPosition(onOk, onErr, options)
    } catch {
      finish({ ok: false, reason: "missing" })
      return
    }

    if (typeof geo!.watchPosition === "function") {
      try {
        watchId = geo!.watchPosition(onOk, onErr, options)
      } catch {
        leftover = 1
      }
    }

    timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), 21_000)
  })
}
