# Release checks

Checked **2026-09-30**. These are notes from passes that were actually run. They are not a claim that the app is ready to ship.

## Journey samples

`npm run smoke` reads saved `least-distance` files. It is not part of `npm test`. Missing files are pending, not failures.

| Sample | Pair | Result on 2026-09-30 |
| --- | --- | --- |
| Direct | en `RI` → `KG` | Pass. 0 changes, fare 43, 1 leg |
| Interchange | en `RI` → `RCK` | Pass. 1 change, fare 43, 2 legs |
| Blue Line branch | en `YB` → `VASI` | Pending. File not downloaded yet |
| Airport Express | en `NDI` → `IICC` | Pending. File not downloaded yet |
| Hindi | hi `RI` → `KG` | Pending. Hindi route files come later in the download |

These files are the planner responses for 2026-09-30 at 12:00. They were not compared again in a browser against the official website during this pass.

## Layout

With text set to 22px, in the browser on 2026-09-30 after the night-platform restyle:

- At 753px wide, the page did not scroll sideways.
- A 358px column inside that page had no overflowing children on the plan screen.
- Plan, a Rithala → Kashmere Gate ticket, the map line banner, a station detail, and Help were opened. The browser panel was short, so the fixed tab bar covered the lower part of each screen until scrolled.

## Contrast

From the stylesheet colors used by the app:

| Pair | Ratio |
| --- | --- |
| Ink `#16181d` on white | 17.8:1 |
| Muted `#3e4654` on white | 9.5:1 |
| Cream `#fffdf8` on red `#c0282c` | 5.8:1 |
| Ink `#16181d` on yellow `#f6d71a` | 12.4:1 |

## Route on the map

Opening Rithala → Kashmere Gate and choosing “View route on map” switched to the Red Line and marked 14 stations with the words “On this route.” Those words are in the station button name, so the highlight is not color alone. Station codes that are not in the saved network are left off the map.

## Focus and screen reader

Controls are native buttons, inputs, and a line select, with visible names, in document order. The diagram is hidden from the accessibility tree; the station list is the keyboard path. A 3px ink outline is set for `:focus-visible`. Sending Tab through the browser tool did not move focus into the page, so a full keyboard walk and a VoiceOver or NVDA pass were not completed.

## Not done

- Screen reader pass with VoiceOver or NVDA.
- Usability sessions with a child, an older adult, and a first-time rider.
- The three pending smoke samples above.
