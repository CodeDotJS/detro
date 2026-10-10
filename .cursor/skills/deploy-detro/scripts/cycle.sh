#!/usr/bin/env bash
# Mechanical DETRO deploy steps. The agent still walks the preview
# and only runs merge after that walk (or after a nit they asked to ship).
set -euo pipefail

usage() {
  echo "Usage: cycle.sh wait|preview-url|merge|watch-main [pr]" >&2
  exit 2
}

need_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh is required" >&2
    exit 1
  fi
}

pr_number() {
  if [ -n "${1:-}" ]; then
    echo "$1"
    return
  fi
  local n
  n=$(gh pr view --json number --jq .number 2>/dev/null || true)
  if [ -z "${n}" ]; then
    echo "No pull request for this branch. Open one first, or pass the number." >&2
    exit 1
  fi
  echo "${n}"
}

check_state() {
  local n=$1
  # First column is the job name, second is pass|fail|pending.
  gh pr checks "${n}" 2>/dev/null | awk '$1 == "check" { print $2; found=1 } END { if (!found) exit 1 }'
}

need_gh

cmd=${1:-}
[ -n "${cmd}" ] || usage
shift || true

case "${cmd}" in
  wait)
    n=$(pr_number "${1:-}")
    echo "Waiting for check on PR ${n}" >&2
    gh pr checks "${n}" --watch
    ;;
  preview-url)
    n=$(pr_number "${1:-}")
    branch=$(gh pr view "${n}" --json headRefName --jq .headRefName)
    slug=${branch//\//-}
    echo "https://${slug}.detro.pages.dev"
    ;;
  merge)
    n=$(pr_number "${1:-}")
    pr_state=$(gh pr view "${n}" --json state --jq .state)
    if [ "${pr_state}" != "OPEN" ]; then
      echo "Refusing to merge PR ${n}: it is ${pr_state}, not OPEN." >&2
      exit 1
    fi
    state=$(check_state "${n}" || true)
    if [ "${state}" != "pass" ]; then
      echo "Refusing to merge PR ${n}: check is '${state:-missing}', not pass." >&2
      exit 1
    fi
    gh pr merge "${n}" --merge
    echo "Merged PR ${n}" >&2
    ;;
  watch-main)
    echo "Waiting for the main CI run" >&2
    since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    id=""
    status=""
    created=""
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
      read -r id status created < <(gh run list --branch main --workflow CI --limit 1 --json databaseId,status,createdAt --jq '.[0] | "\(.databaseId) \(.status) \(.createdAt)"')
      if [ -z "${id}" ]; then
        sleep 3
        continue
      fi
      if [ "${status}" = "in_progress" ] || [ "${status}" = "queued" ] || [ "${status}" = "waiting" ] || [ "${status}" = "requested" ]; then
        break
      fi
      if [ "${status}" = "completed" ] && [ "${created}" \> "${since}" ]; then
        break
      fi
      sleep 3
    done
    if [ -z "${id}" ]; then
      echo "No CI run on main yet." >&2
      exit 1
    fi
    if [ "${status}" = "completed" ] && [ "${created}" \< "${since}" ]; then
      echo "No new main CI run after ${since}. Newest is ${id} (${status}, ${created})." >&2
      exit 1
    fi
    gh run watch "${id}"
    ;;
  *)
    usage
    ;;
esac
