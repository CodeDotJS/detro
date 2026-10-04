import { DmrcError } from "./errors"

const MAX_BODY = 1_000_000

export async function parseDmrcResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  const type = response.headers.get("content-type") ?? ""
  if (type.includes("html") || looksLikeHtml(text)) {
    throw new DmrcError("html", "The planner returned a page instead of route data.", response.status)
  }
  if (!response.ok) {
    throw new DmrcError("http", "The planner returned an error.", response.status)
  }
  if (text.length > MAX_BODY) {
    throw new DmrcError("json", "The planner response was too large.", response.status)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new DmrcError("json", "The planner response was not valid JSON.", response.status)
  }
}

function looksLikeHtml(text: string): boolean {
  const start = text.trimStart().slice(0, 24).toLowerCase()
  return start.startsWith("<!doctype html") || start.startsWith("<html") || start.startsWith("<head")
}
