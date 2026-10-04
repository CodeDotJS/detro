# Acceptance criteria

Milestone 1 is the only gate for the next implementation pass. Later items wait until their phase in `docs/IMPLEMENTATION_PLAN.md`.

## Milestone 1

- The first screen asks “Where do you want to go?” and has labeled From, To, swap, and “Show my route.”
- Search calls `station_by_keyword/all/{keyword}` only after a short pause, and an older request cannot overwrite a newer one.
- Choosing a suggestion stores that row’s `station_code`. The app never auto-picks a fuzzy match.
- Empty search shows a friendly no-results state.
- “Show my route” calls `station_route` with those codes, mode `least-distance`, and an Asia/Kolkata timestamp in the verified format.
- The result shows origin, destination, change count from the legs, duration when `total_time` is present, and fare when `fare` is a number.
- Steps use each leg’s line name, `towards_station`, and stop count. A platform line appears only when `platform_name` is non-empty.
- Missing fare or duration renders as unavailable, not zero.
- HTTP 500, HTML, invalid JSON, and a blocked request render an error. They do not show a demo journey.
- Swap exchanges the two stations and keeps their codes.
- English and Hindi UI chrome both exist. Hindi station names come from `lang=hi` results. Hindi chrome is labeled as not human-reviewed.
- Keyboard users can search, select, swap, and show a route.
- Touch targets on this screen are at least 48×48 CSS pixels, with visible labels.
- Fixture tests cover a direct `RI`→`KG` shape, a two-leg `RI`→`RCK` shape, a missing fare, and an HTML error body. Fixtures are copied from real sanitized responses.
- A live call from the app origin is reported separately from fixture tests.

## Later product checks

- Map selection can set start and destination and highlight a route whose ids exist on the map.
- Station details mark unverified gates, toilets, and access.
- Saved trips survive a reload and can be cleared.
- A shared link restores a trip from station codes.
- Text size and language persist.
- Offline mode is described accurately: cached map and saved trips before a verified graph; local routing only after that graph is tested.
- Opt-in smoke checks, not default CI: one direct journey, one interchange, one branch-sensitive journey, one Airport Express journey, and English plus Hindi, compared with the official site for the same inputs.
- Manual notes exist for screen reader, focus, contrast, 200% text, and narrow, large-phone, and desktop widths.

## Usability script

When real people are available, ask a child with an adult, an older adult, and a first-time rider to find a route, point to the change, and reopen the map. Record what they could do. Do not claim universal usability from that script existing.
