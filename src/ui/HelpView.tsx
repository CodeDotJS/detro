import type { Copy } from "../i18n/copy"
import { Notice } from "./Notice"

export function HelpView({
  copy,
  textSize,
  snapshotDate,
  notice,
  journeyAt,
  onTextSize,
  onClear,
  onDismissNotice,
}: {
  copy: Copy
  textSize: "small" | "normal" | "large"
  snapshotDate: string
  notice: string | null
  journeyAt: string
  onTextSize: (size: "small" | "normal" | "large") => void
  onClear: () => void
  onDismissNotice: () => void
}) {
  return (
    <main className="sheet">
      <h1>{copy.help}</h1>
      <section>
        <h2>{copy.howToUse}</h2>
        <ol className="steps">
          <li>{copy.howStep1}</li>
          <li>{copy.howStep2}</li>
          <li>{copy.howStep3}</li>
        </ol>
      </section>
      <section>
        <h2>{copy.textSize}</h2>
        <div className="languages" role="group" aria-label={copy.textSize}>
          <button type="button" aria-pressed={textSize === "small"} onClick={() => onTextSize("small")}>
            {copy.textSmall}
          </button>
          <button type="button" aria-pressed={textSize === "normal"} onClick={() => onTextSize("normal")}>
            {copy.textNormal}
          </button>
          <button type="button" aria-pressed={textSize === "large"} onClick={() => onTextSize("large")}>
            {copy.textLarger}
          </button>
        </div>
      </section>
      <section>
        <h2>{copy.freshnessTitle}</h2>
        <p>{copy.networkSaved(snapshotDate)}</p>
        <p>{copy.offlineHelp(snapshotDate)}</p>
        <p>{copy.snapshotNote(snapshotDate)}</p>
        <p>{copy.journeysSaved(journeyAt)}</p>
        <p>{copy.offlineLimit}</p>
        <p>{copy.independent}</p>
      </section>
      <button type="button" className="primary" onClick={onClear}>
        {copy.clearData}
      </button>
      {notice ? <Notice message={notice} closeLabel={copy.close} onClose={onDismissNotice} /> : null}
      <p className="credit">
        © {new Date().getFullYear()} Delhi Metro Simple. Built by <a href="https://rishi.rest">Rishi Giri</a>.
      </p>
    </main>
  )
}
