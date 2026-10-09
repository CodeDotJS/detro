# Decisions

Date: 2026-09-30. These are defaults so implementation can start without another product question.

## This pass stops before the app

`prompt.md` says to implement the first slice immediately after API discovery. The request for this pass says to stop after preparation and review. Preparation is the whole of this pass. The next pass starts at Phase 1 in `docs/IMPLEMENTATION_PLAN.md`.

## Stack

The repo had no app code. Use React, TypeScript, Vite, CSS custom properties, Zod, and Vitest. Package name: `delhi-metro-simple`. Product title: Delhi Metro Simple. No Tailwind, component library, font CDN, router, or PWA plugin until a later phase needs it. Vendored font files are allowed.

## Language default

The interface is English only. Do not add Hindi chrome, theme names, or a language control. Hindi snapshot files may stay on this machine. The app does not load them. Station names come from the English snapshot.

## Journey request

Online routes call `station_route` with `least-distance` and an Asia/Kolkata timestamp without an offset. The on-screen label is “Least distance.” A “fewer changes” control waits until `minimum-interchange` returns a different journey from `least-distance`. One `RI`→`RCK` pair did not.

## Fare

Show a rupee amount because the official client renders `fare` with `₹`, while the JSON has no currency field. Show weekday and weekend only from `new_fare_with_route`. A missing fare stays “Fare unavailable.” Do not copy the official `fare || 0` fallback.

## Platforms and names

Show `platform_name` from the journey leg when it is non-empty. Search names come from `station_by_line` / keyword results. Step names come from the journey `path`. Do not merge “ROHINI EAST” with “ROHINI” by hand.

## Access

Requests that presented the official site as `Origin` received JSON. Other origins received a Cloudflare 403 or a failed browser fetch. The app will call the API as itself. It will not pretend to be `delhimetrorail.com`. If that call is blocked, fixtures and an honest error are the milestone 1 result.

## No env file

No secret or environment-specific URL is required yet. The base URL is the documented backend host. `.env.example` stays absent until a real setting exists.

## Visual direction

The route result opens with a colored diagram of the ride, then the timeline: fare, stops, changes, each train’s line color and name, direction, and platform when present. A second option appears when the fewest-changes ride visits different stations from the saved journey. Type is IBM Plex Sans from `@fontsource`. Icons are `lucide-react`. Both are bundled. There is no font or icon CDN. The independent notice and the snapshot date are on Help, not on the plan screen. Metro Thogoli and the Delhi Metro journey screen were references for scanning a trip. Their branding and ads are not used. Station coordinates are not in the snapshot, so the map is still one line at a time.

## Questions not asked

No blocking product choice is open. Paid services, deployment, and origin spoofing are out. Airport Express and Rapid Metro stay out of the first route results until their own journeys are verified.
