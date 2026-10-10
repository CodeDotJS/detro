---
name: deploy-detro
description: Runs the DETRO Pages deploy cycle after the user has said to deploy. Opens a pull request, waits for the check job, walks the preview routes, and merges to main for production. Use when the user says deploy, ship, publish, or asks to open a pull request that should go live.
---

# Deploy DETRO

The always-on deployment rule is the gate. This skill is the playbook. Run the helper from the repo root. It waits for CI and merges. It does not walk the preview, and it does not merge until you call `merge`.

Requires `gh`, authenticated to this repository.

## Stop unless they said deploy

Do not push, open a pull request, or merge until the user has used the change locally and said to deploy. Opening a pull request uploads a preview. Merging to `main` uploads production. Both are a deploy.

## Product or nit

- Product change, or Help / product-copy: walk the preview after `check` is green.
- A nit that cannot change the site stays local until the next product change. If they ask to ship that nit now, wait for `check` and merge. Do not run the app. Do not open the preview.
- Do not treat a Help or product-copy edit as a nit.

Do not add `docs/DMRC_DOWNLOAD.md`, `data/hi/`, pair downloads, or other paths from the local-files rule.

## Cycle

```
- [ ] Branch and commit if needed
- [ ] Push and open the pull request
- [ ] Wait for check
- [ ] Walk preview (product only)
- [ ] Merge
- [ ] Confirm production CI
```

1. Branch from `main` if the work is still on `main`. Commit with `type(scope): description`. One commit is one change.
2. Push the branch. Open a pull request in this repository with `gh pr create`.
3. `bash .cursor/skills/deploy-detro/scripts/cycle.sh wait`  
   If it fails, stop and report the check and the URL. Do not merge.
4. `bash .cursor/skills/deploy-detro/scripts/cycle.sh preview-url`  
   For a product change, open that host and confirm `/`, `/map`, `/city`, `/saved`, `/play`, and `/help` load.
5. Only after that walk (or after a green check on a nit they asked to ship), `bash .cursor/skills/deploy-detro/scripts/cycle.sh merge`.
6. `bash .cursor/skills/deploy-detro/scripts/cycle.sh watch-main`  
   Production is `https://detro.pages.dev`. Fast-forward local `main`. CI deletes the feature branch after a successful production upload. Do not delete `main`. If production upload fails, the branch stays.

Never upload with Wrangler from this machine. Never print `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`. Do not create a second Pages project.

Pass an optional pull-request number after any subcommand when the current branch has no PR.
