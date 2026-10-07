import type { Copy } from "../i18n/copy"
import { playCopy } from "../i18n/play"
import { textMax, textMin } from "../lib/plan/textSize"
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
  textSize: number
  snapshotDate: string
  notice: string | null
  journeyAt: string
  onTextSize: (size: number) => void
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
          <li>{playCopy.howTo}</li>
        </ol>
      </section>
      <section>
        <h2>{copy.textSize}</h2>
        <div className="text-size">
          <span className="text-size-end">{copy.textSmall}</span>
          <input
            type="range"
            min={textMin}
            max={textMax}
            step={1}
            value={textSize}
            aria-label={copy.textSize}
            aria-valuemin={textMin}
            aria-valuemax={textMax}
            aria-valuenow={textSize}
            onChange={(event) => onTextSize(Number(event.target.value))}
          />
          <span className="text-size-end">{copy.textLarger}</span>
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
