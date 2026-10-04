export type DmrcErrorKind =
  | "html"
  | "http"
  | "json"
  | "schema"
  | "timeout"
  | "network"
  | "aborted"

export class DmrcError extends Error {
  readonly kind: DmrcErrorKind
  readonly status: number | null

  constructor(kind: DmrcErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = "DmrcError"
    this.kind = kind
    this.status = status
  }
}
