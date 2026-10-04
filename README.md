<p align="center">
  <img src="public/attractions/metro-people.svg" width="72" alt="DETRO" />
</p>

<h1 align="center">DETRO</h1>

<p align="center">
  A free, ad-free Delhi Metro planner.<br />
  Independent of DMRC.
</p>

The network, the fares, the platforms, and the first and last trains come from a snapshot saved on 30 September 2026. The page plans a trip from that snapshot. It does not sell tickets and it does not show live arrivals.

---

## What you get

| | |
| --- | --- |
| Plan | Origin, destination, swap, and one ride. A second ride appears when fewer changes visits different stations. Search accepts the station name or the station code. |
| Ride | Line, direction, stop count, platform when the saved journey includes one, and weekday and weekend fare when it includes them. |
| Map | One line at a time, with the stations on that line. Start here and Go here set the trip. Station details list the facilities saved for that station. |
| City | 154 stations with a saved latitude and longitude, on street tiles kept in this repo. The ride is drawn between the ends that have positions. |
| Offline | After this browser has loaded the app once, the snapshot still plans the trip with the network off. |
| Saved trips | Stored on this device. A shared link carries the two station codes. |
| Help | Usage, text size, and the snapshot date. |

254 stations are in the snapshot. The city map omits the ones with no saved position. The plan and the line map still include them.

## What you run

| Piece | Where | Job |
| --- | --- | --- |
| App | `src/` | Plan, map, city, and help. |
| Snapshot | `data/en/` | Lines, stations, briefs, coordinates, and one journey file per origin. |
| Street tiles | `public/map-tiles/` | Metro area, zoom 9 through 14. |

No server. `npm run dev` serves the app on port 5173.

---

## You need

- Node 22 or newer
- npm

---

## Install locally

```bash
git clone https://github.com/CodeDotJS/detro.git
cd detro
npm install
npm test
npm run dev
```

Open `http://127.0.0.1:5173`.

`npm run build` typechecks and writes `dist`.

---

## Production

The public site is the `dist` folder on Cloudflare Pages: [detro.pages.dev](https://detro.pages.dev).

GitHub Actions installs, tests, and builds. Wrangler then uploads `dist`. A pull request from this repository is a preview deployment. A push to `main` is production. Pages does not build the repository itself.

The file limits, the API token, and the order of steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## After it is up

1. Choose the two stations. The ride shows the line, the direction, and the stops.
2. When that pair is in the snapshot, the fare, the platform, and the first and last train are on the same screen.
3. Save the trip on this device, or share a link that carries the two station codes.
4. The line map and the city map open from the same trip. Help holds text size and the snapshot date.
5. With the network off, a browser that has loaded the app once still opens that trip.

| Kind | Where | How long |
| --- | --- | --- |
| Lines, stations, fares, platforms | The snapshot in this repo | Saved 30 September 2026 |
| Street map | `public/map-tiles/` | Zoom 9 through 14 |
| Saved trips, text size | This browser | Until cleared on Help |

The product scope is [`docs/PRODUCT.md`](docs/PRODUCT.md). The upstream API record is [`docs/DMRC_API.md`](docs/DMRC_API.md).

---

## Credits

<p align="center">
  <img src="public/share/cover.jpg" width="550" alt="The Great Wave off Kanagawa, a woodblock print by Katsushika Hokusai" />
</p>

The landmark drawings are from [SVG Repo](https://www.svgrepo.com/).

Lines, stations, fares, platforms, and first and last trains come from the public site of the [Delhi Metro Rail Corporation](https://delhimetrorail.com/). DETRO is not an official DMRC app.

The cover image is [The Great Wave off Kanagawa](https://en.wikipedia.org/wiki/The_Great_Wave_off_Kanagawa) by Katsushika Hokusai.

---

<br>

<div align="center">

<p align="center">
  <img src="public/attractions/metro-people.svg" width="128" alt="DETRO" />
</p>

__License__

<br>

Copyright © 2026 [Rishi Giri](https://rishi.rest)

<br>

DETRO is released under the [MIT License](LICENSE)

</div>
