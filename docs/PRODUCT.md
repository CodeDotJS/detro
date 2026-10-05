# Product

Working name: **Delhi Metro Simple**. Branding stays easy to change. The app is an independent companion and must not look or read like an official DMRC product.

## Promise

Tell the rider where to start, which train to take, where to change, and where to get off. The first result answers the train, the change, and the fare when a verified payload includes a fare.

## Look

The first screen asks where you are going. A result opens with a colored diagram of that ride, then the timeline. When the saved journey and the fewest-changes ride visit different stations, both are offered. Each ride has the line name on that line’s color, the direction, the platform when the payload includes one, and the stops in between. A change is its own line of text. Fare, stop count, and changes sit above the timeline. Missing fare or time stays missing.

The page is light. Type is vendored IBM Plex Sans. Icons are from Lucide, bundled with the app. Nothing is loaded from a font or icon CDN. The independent-app notice and the snapshot date live on Help. The line map is one line at a time. The city map draws stations that have a saved latitude and longitude.

## People

A child with an adult, an older adult, a first-time visitor, and someone unfamiliar with phones should be able to plan a trip without an account, tutorial, or install.

## Destinations

1. **Plan a trip** — origin, destination, swap, and “Show my route.” On a wide screen the route sits beside the form.
2. **Map** — one line at a time, with a sentence that says to pick a line and then a station. Start here and Go here sit with the chosen station. On a wide screen the line diagram sits beside the list.
3. **City** — stations with a saved coordinate on street tiles. The ride is drawn between the ends that have positions.
4. **Saved** — trips stored on this device. Open one to see the ride, or remove it.
5. **Help** — how to use the app, verified contacts, text size, offline status, privacy, and sources.

Plan, Map, City, Saved, and Help live in a top bar. The bar does not cover the page.

Station details open from search, the map, and journey results. They are not a top-level destination.

## Home

The first screen shows “Where do you want to go?”, From, To, swap, and one primary route button. “Use my location” is secondary. Saved trips live under Saved, not on Plan.

Search supports English and Hindi names, aliases, and spelling variants. Suggestions show the line when membership is known. Similar names stay distinct. A fuzzy match is never selected silently.

## Journey result

Show one recommended route. Summary: origin, destination, duration when present, number of changes, and fare when present. Then plain steps: go to the origin, take a named line towards the returned service destination, travel the stop count, change where the legs change, and get off.

Offer at most one secondary alternative, such as fewer changes. “Least distance” is not labeled “Fastest.”

Secondary actions: edit, save locally, share by station code, copy text, and view on the map.

## Map and stations

The schematic uses the same network data as local routing, once that data exists. Until then, the map is not a routing source. Station pages show lines, and facilities only when a response includes them. Missing items are omitted or marked “Not verified.”

## Help and privacy

Help includes a short usage note, official contacts after they are verified, text-size controls, data freshness, a way to clear local data, sources, and the independent-app notice. There is no analytics, advertising, or account.

## Explicitly out of v1

Ticket sales, payments, subscriptions, ads, accounts, chatbots, social feeds, promotional content, live arrivals, and live lift status.
