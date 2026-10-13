# detro-status-ping

Cloudflare Worker cron that `POST`s GitHub `workflow_dispatch` for `.github/workflows/status-bake.yml` at 08:00 / 14:00 / 20:00 Asia/Kolkata (`30 2,8,14 * * *` UTC).

GitHub Actions `schedule` never registered on this repo. The bake job itself still runs in Actions.

## Setup

```bash
cd workers/status-ping
npm install
npx wrangler login   # once
npx wrangler deploy
# Put the same classic PAT used as the repo secret STATUS_BAKE_TOKEN:
# printf '%s' "$STATUS_BAKE_TOKEN" | npx wrangler secret put STATUS_BAKE_TOKEN
```

Manual test after deploy (needs a workers.dev route or a custom route — enable `workers_dev` temporarily if needed):

```bash
curl -X POST "https://detro-status-ping.<account>.workers.dev" \
  -H "Authorization: Bearer $STATUS_BAKE_TOKEN"
```

Expect HTTP 204 and a Status run with event `workflow_dispatch` on GitHub.
