#!/usr/bin/env bash
# One entry point for the everyday tasks on this repo.
#
#   ./app.sh run              start the dev server (installs on first run)
#   ./app.sh test             production build + end-to-end checks
#   ./app.sh pull             get the latest from GitHub (keeps local edits)
#   ./app.sh push [message]   commit everything and push to GitHub
#   ./app.sh deploy           build and publish to Vercel (production)
#   ./app.sh ship [message]   test, push, deploy — in that order, stop on failure
#
# Nothing here force-pushes, rewrites history, or deletes tracked files.
set -euo pipefail
cd "$(dirname "$0")"

bold=$'\e[1m'; dim=$'\e[2m'; red=$'\e[31m'; green=$'\e[32m'; off=$'\e[0m'
say()  { printf '%s▸ %s%s\n' "$bold" "$*" "$off"; }
ok()   { printf '%s✓ %s%s\n' "$green" "$*" "$off"; }
die()  { printf '%s✗ %s%s\n' "$red" "$*" "$off" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not installed. $2"; }

# ── prerequisites ────────────────────────────────────────────
ensure_tools() {
  need node "Install Node 20+ from https://nodejs.org or: brew install node"
  need npm  "npm ships with Node."
  need git  "xcode-select --install"
  local major; major=$(node -p 'process.versions.node.split(".")[0]')
  (( major >= 20 )) || die "Node $major found; this project needs Node 20 or newer."
}

ensure_deps() {
  if [[ ! -d node_modules || package.json -nt node_modules/.package-lock.json ]]; then
    say "Installing dependencies"
    npm install --no-audit --no-fund
  fi
}

# git lock files can be left behind by a crashed or sandboxed git; they are
# never valid to keep, and their presence blocks every other git command.
clear_git_locks() {
  local n=0
  for f in .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock .git/refs/heads/*.lock .git/objects/*/tmp_obj_*; do
    [[ -e $f ]] && { rm -f "$f"; n=$((n+1)); }
  done
  (( n == 0 )) || ok "Removed $n stale git lock file(s)"
}

# ── commands ─────────────────────────────────────────────────
cmd_run() {
  ensure_tools; ensure_deps
  say "Starting dev server — Ctrl-C to stop"
  npm run dev
}

cmd_test() {
  ensure_tools; ensure_deps
  say "Type-check"; npx tsc -b
  say "Production build + end-to-end checks"
  npm test
  ok "All checks passed"
}

cmd_pull() {
  ensure_tools; clear_git_locks
  local branch; branch=$(git rev-parse --abbrev-ref HEAD)
  local stashed=0
  if [[ -n $(git status --porcelain) ]]; then
    say "Setting local edits aside while pulling"
    git stash push -u -q -m "app.sh pull $(date '+%Y-%m-%d %H:%M')"; stashed=1
  fi
  say "Pulling $branch from origin"
  git pull --rebase origin "$branch"
  if (( stashed )); then
    say "Restoring local edits"
    git stash pop -q || die "Your local edits conflict with what was pulled — resolve the files git lists, then: git stash drop"
  fi
  ensure_deps
  ok "Up to date with $(git remote get-url origin) — $(git log --oneline -1)"
}

cmd_push() {
  ensure_tools; clear_git_locks
  local msg="${1:-Update $(date '+%Y-%m-%d %H:%M')}"
  local branch; branch=$(git rev-parse --abbrev-ref HEAD)

  if [[ -n $(git status --porcelain) ]]; then
    say "Committing changes on $branch"
    git add -A
    git status --short
    git commit -q -m "$msg"
    ok "Committed: $msg"
  else
    ok "Nothing to commit"
  fi

  say "Pushing $branch to origin"
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    git push
  else
    git push -u origin "$branch"
  fi
  ok "Pushed — $(git remote get-url origin)"
}

cmd_deploy() {
  ensure_tools; ensure_deps
  if ! command -v vercel >/dev/null 2>&1; then
    say "Installing the Vercel CLI (one time)"
    npm install -g vercel
  fi
  if ! vercel whoami >/dev/null 2>&1; then
    say "Log in to Vercel (one time; opens a browser)"
    vercel login
  fi
  # The CLI names a new project after the folder, and "Inventory" fails
  # Vercel's lowercase rule, so the project is named explicitly and linked
  # once; the link is remembered in .vercel/ (gitignored).
  local project="${VERCEL_PROJECT:-discovery-and-inventory}"
  if [[ ! -f .vercel/project.json ]]; then
    say "Linking this folder to Vercel project '$project' (created if new)"
    vercel link --yes --project "$project"
  fi
  say "Production build"
  npm run build
  say "Deploying to Vercel production as '$project'"
  vercel --prod --yes
  ok "Deployed"
}

cmd_ship() {
  cmd_test
  cmd_push "${1:-}"
  cmd_deploy
}

# ── dispatch ─────────────────────────────────────────────────
case "${1:-}" in
  run)     cmd_run ;;
  test)    cmd_test ;;
  pull)    cmd_pull ;;
  push)    shift; cmd_push "${1:-}" ;;
  deploy)  cmd_deploy ;;
  ship)    shift; cmd_ship "${1:-}" ;;
  *)
    sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
    printf '\n%sfirst time:%s  ./app.sh run\n' "$dim" "$off"
    exit 2 ;;
esac
