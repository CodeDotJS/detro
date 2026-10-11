export type StationAccess = {
  board: boolean
  alight: boolean
  transfer: boolean
  pass: boolean
}

export type NoteInterchange = "available" | "unavailable" | "silent"

export const openAccess: StationAccess = { board: true, alight: true, transfer: true, pass: true }

export function classifyNote(note: string | null | undefined): NoteInterchange {
  const text = (note ?? "").replace(/\s+/g, " ").trim()
  if (!text) return "silent"
  if (/will not be available/i.test(text) && /interchange/i.test(text)) return "unavailable"
  if (/interchange facility is available/i.test(text)) return "available"
  return "silent"
}

export function accessFor(phrase: string | null | undefined, note: string | null | undefined): StationAccess {
  if ((phrase ?? "").trim() !== "Station Closed") return openAccess
  const interchange = classifyNote(note)
  return {
    board: false,
    alight: false,
    transfer: interchange === "available",
    pass: true,
  }
}

export function mergeNotes(notes: Array<string | null | undefined>): NoteInterchange {
  const kinds = notes.map((note) => classifyNote(note))
  if (kinds.includes("unavailable")) return "unavailable"
  if (kinds.includes("available")) return "available"
  return "silent"
}
