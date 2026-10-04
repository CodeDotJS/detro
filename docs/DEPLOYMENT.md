# Deployment

Checked 2026-10-04. The app is a static site. It does not need a server, a database, or a paid add-on.

Production is live at `https://detro.pages.dev`. The Pages project `detro` is Direct Upload, and it is not connected to Git. The first upload was the local `dist` built from `94e3b40`.

GitHub Actions runs `.github/workflows/ci.yml`. The job uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not print the token and do not commit it. A push to `main` publishes production. A pull request from this repository publishes a preview. Do not connect Pages to Git.

## Procedure

1. Confirm `data/en/journeys/` is present and `public/map-tiles/` has the street tiles. Confirm `data/en/routes/`, `data/en/fares/`, and `data/en/first-last/` are gitignored.
2. Split the journey pack out of the single script bundle so each origin is its own file under the published site. Stop if that split is not done. The packed journeys are about 39 MB and will not pass the 25 MiB file limit as one bundle.
3. Run `npm ci`, `npm test`, and `npm run build` locally. Stop if any command fails.
4. Count the files in `dist` and measure the largest file. Stop above 20,000 files or above 25 MiB.
5. Create the Cloudflare Pages project `detro` as Direct Upload, not a Git-connected build. The production branch is `main`. The public URL is `https://detro.pages.dev`.
6. Create a Cloudflare API token that can edit that Pages project only. Store it as the GitHub secret `CLOUDFLARE_API_TOKEN`, and store the account id as `CLOUDFLARE_ACCOUNT_ID`. Do not print the token and do not commit it.
7. Add `.github/workflows/ci.yml` as specified below. Require that check on `main` before a merge.
8. Open a pull request and confirm the preview URL loads `/`, `/map`, `/city`, and `/help`.
9. Merge to `main` and open `https://detro.pages.dev` on a phone. Turn the network off and reload. Search, a saved fare, a station brief, the line map, and the city map must still open.

Stop at the first failed step and report it. Do not retry a deploy by connecting Pages to Git.

## Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Pages file limits
        run: |
          node --input-type=module -e "
          import { readdirSync, statSync } from 'node:fs'
          import { join } from 'node:path'
          const files = []
          const walk = (dir) => {
            for (const name of readdirSync(dir)) {
              const path = join(dir, name)
              if (statSync(path).isDirectory()) walk(path)
              else files.push(path)
            }
          }
          walk('dist')
          const limit = 25 * 1024 * 1024
          const tooBig = files.filter((file) => statSync(file).size > limit)
          if (files.length > 20000 || tooBig.length > 0) {
            console.error({ files: files.length, tooBig })
            process.exit(1)
          }
          "
      - name: Deploy
        if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository)
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=detro
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

A push to `main` publishes production. Any other branch from this repository publishes a preview at `https://<branch>.detro.pages.dev`. A pull request from a fork does not receive the secrets, so the deploy step must not run for it. `npm run smoke` is not in this job.

Production traffic goes to Cloudflare Pages. Pages does not meter static bandwidth and does not bill overage. GitHub Actions runs the tests and uploads the built site. Vercel is not part of this pipeline.

## Why Cloudflare only

Pages already gives a production URL and a separate preview URL for every other branch. A second host would publish the same files again, split search ranking, and give the offline copy two homes. Vercel Hobby also pauses after 100 GB or 1,000,000 requests. Leaving it out removes that pause.

The public address is `https://detro.pages.dev` once that project name is claimed. A domain you already control can be attached in Cloudflare DNS at no charge. Do not buy a domain for this.

## CI/CD

Two free steps, and a deploy cannot start unless the tests pass.

1. GitHub Actions checks out the repository, runs `npm ci`, `npm test`, and `npm run build`. `npm run smoke` stays out of this job. It calls the live DMRC backend and depends on local scripts that are not in Git.
2. The same job counts the files in `dist` and measures the largest file. It fails at 20,000 files or at a file over 25 MiB, which are the Pages free limits.
3. On a pull request from this repository, the job uploads `dist` with Wrangler as a Pages preview. The address looks like `https://<branch>.detro.pages.dev`.
4. On a push to `main`, after the same tests, the job uploads `dist` as production.

Cloudflare Pages is a Direct Upload project. It does not also build from Git. A Git-connected build would deploy even when the tests failed, and it would spend the 500 builds a month. A Wrangler upload does not use that build quota. GitHub-hosted runners are free for a public repository, and a private repository includes 2,000 minutes a month, which this test-and-build job will not use up.

The workflow needs two GitHub secrets, both free to create: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token only needs permission to edit this Pages project. Branch protection on `main` requires the test job, so a red check cannot be merged.

Sources: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## What must not be turned on

These are the switches that turn a free static site into a quota or a bill.

- A second Git connection inside Cloudflare Pages, which would build again and deploy without the test job
- Vercel Analytics, Speed Insights, and Image Optimization, if a Vercel project is ever added
- Cloudflare Web Analytics, Zaraz, and Pages Functions
- Workers, R2, KV, and D1
- A server, a cron job, or a live call to the DMRC backend from the host

The installed app already contains the station lists, the journey pack, the station briefs, and the street tiles. The host only has to serve files.

## Fit the file limits before the first production deploy

Cloudflare Pages rejects a single file over 25 MiB and a site over 20,000 files.

The raw pair download is about 1.5 GB and hundreds of thousands of files. It stays on the machine and out of Git. The packed journeys in `data/en/journeys/` are about 39 MB across 254 files. The street tiles in `public/map-tiles/` are 1,219 files and about 9.5 MB. Together with the app shell, that is far under 20,000 files.

Each origin is its own file at `dist/snapshot/en/journeys/`. The first production build had 1,781 files. The largest file was the app script, 1.58 MiB. Station briefs stay in the script bundle. Do not upload `data/en/routes/`, `data/en/fares/`, or `data/en/first-last/`.

## Build settings

GitHub Actions runs the build. Pages only receives the finished `dist` folder.

```text
Node: 22 or newer
Install: npm ci
Test: npm test
Build: npm run build
Deploy: npx wrangler pages deploy dist --project-name=detro
```

No app environment variables. No install of private packages.

`npm run build` runs the type check and then Vite. The route, fare, and first/last directories are gitignored, so the runner never has them.

## Addresses inside the app

The app uses `/`, `/map`, `/city`, and `/help`. Pages must serve `index.html` for those paths when a file of that name does not exist. `public/_redirects` contains:

```text
/*    /index.html   200
```

Existing files, including the tiles and the script bundles, win over that fallback.

## Cache

Hashed files under `/assets/` can be cached for a long time. `index.html` and `sw.js` must be revalidated so a new deploy can replace the service worker. Do not add a Pages Function to set those headers. Cloudflare’s default static caching is enough if HTML is not given a year-long edge cache.

## After the first deploy

Open the Cloudflare URL on a phone, turn the network off, and reload. Search, a saved fare, a station brief, the line map, and the city map should still open. The street picture is the saved tile set, through zoom 14. Closer zoom uses that same picture, scaled up. Stations with no saved position stay off the city map.
