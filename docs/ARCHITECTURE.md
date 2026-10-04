# Architecture

Milestone 1 lives in `src/`. Map, Help, and offline routing are still later phases.

## App

- Vite + React + TypeScript.
- Plain CSS custom properties. No component library. Fonts are vendored (`@fontsource`) and bundled. No font CDN.
- Three destinations later: Plan, Map, Help. Milestone 1 is Plan only, so it does not need a router.
- The language choice is stored locally. Text size is a later phase. Dictionaries hold UI chrome. Station and line names come from the API response for `en` or `hi`.

## Data flow

```text
Plan screen
  -> station search (keyword, then cached line membership)
  -> journey request
  -> src/lib/dmrc validate + normalize
  -> src/lib/transit types
  -> readable result
```

Adapter files:

```text
src/lib/dmrc/client.ts
src/lib/dmrc/schemas.ts
src/lib/dmrc/normalize.ts
src/lib/dmrc/errors.ts
src/lib/dmrc/cache.ts
src/lib/transit/types.ts
tests/fixtures/dmrc/
```

Internal models cover stations, lines, journeys, legs, fares, and provenance. Fields exist only when a real response has supported them.

## Online and offline

Online planning uses the verified journey endpoint. Local graph routing is a later engine, separate from the UI, and only after a verified topology exists.

The result screen must be able to say which of these it is showing:

- Journey retrieved from DMRC
- Offline journey from a dated snapshot
- Previously saved journey

Milestone 1 only produces the first of these, or an honest failure.

## Server adapter

Do not add one in the scaffold. Add a small same-origin adapter only if a browser request from this app cannot read a response. Allowed behavior is listed in `AGENTS.md`. Spoofing `https://delhimetrorail.com` as `Origin` is not allowed.

## Cache

Cache line lists and per-line station lists. Do not download every station pair. Keep the last valid payload if a later response fails validation. Record `fetchedAt` separately from any source update time. The current responses do not include a source update timestamp.
