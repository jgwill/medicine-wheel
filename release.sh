#!/usr/bin/env bash
#
# release.sh — Full Medicine Wheel release pipeline (one command, end to end).
#
# Bumps every version, publishes every workspace package + the MCP server,
# reinstalls so the app resolves the new versions, publishes the root app,
# builds + pushes the Docker image (tagged :app AND :<version>), then commits.
#
# Usage:
#   ./release.sh [patch|minor|major]      # default: patch
#
# Flags (env vars):
#   DRY_RUN=1      Validate only — no bump, no publish, no push, no commit.
#                  Runs `npm publish --dry-run` + `docker build` to prove the
#                  pipeline packs and builds cleanly without mutating anything.
#   SKIP_DOCKER=1  Skip the docker build/push step.
#   SKIP_MCP=1     Don't bump/publish @medicine-wheel/mcp.
#   MCP_MAJOR=4    @medicine-wheel/mcp keeps its own major but tracks the
#                  lockstep minor.patch — e.g. lockstep 0.2.5 → mcp 4.2.5.
#
# Why this exists: every package's local version equals what's on npm, so a bare
# `npm publish` fails with "cannot publish over previously published version".
# Publishing REQUIRES a version bump first — this script bumps, then publishes,
# and skips any version that already exists so a failed run resumes cleanly.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BUMP="${1:-patch}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_DOCKER="${SKIP_DOCKER:-0}"
SKIP_MCP="${SKIP_MCP:-0}"
MCP_MAJOR="${MCP_MAJOR:-4}"

IMAGE="jgwill/medicine-wheel"

case "$BUMP" in
  patch|minor|major) ;;
  *) echo "❌ bump must be patch|minor|major (got: $BUMP)"; exit 1 ;;
esac

STEP=0
step() { STEP=$((STEP + 1)); printf '\n\033[1;36m━━ [%d] %s\033[0m\n' "$STEP" "$1"; }
die()  { printf '\n\033[1;31m❌ %s\033[0m\n' "$1" >&2; exit 1; }

trap 'printf "\n\033[1;31m💥 release.sh failed at step %s.\033[0m\nFix the cause and re-run: ./release.sh %s — already-published packages are skipped, so it resumes.\n" "$STEP" "$BUMP"' ERR

# ── [1] Preflight ─────────────────────────────────────────────────────────
step "Preflight checks"
[ "$(node -p "require('./package.json').name")" = "@medicine-wheel/app" ] \
  || die "Not in the medicine-wheel repo root."
echo "✓ repo root"
if [ "$DRY_RUN" = "1" ]; then
  echo "🧪 DRY_RUN — no version bump, no publish, no push, no commit."
else
  npm whoami >/dev/null 2>&1 || die "Not logged in to npm. Run: npm login"
  echo "✓ npm user: $(npm whoami)"
fi
if [ "$SKIP_DOCKER" != "1" ] && [ "$DRY_RUN" != "1" ]; then
  docker info >/dev/null 2>&1 || die "Docker daemon not reachable."
  echo "✓ docker daemon reachable"
fi

# ── [2-4] Bump + sync + reinstall (skipped in dry-run) ─────────────────────
if [ "$DRY_RUN" != "1" ]; then
  step "Bump lockstep package versions ($BUMP)"
  node scripts/bump-versions.mjs "$BUMP"

  if [ "$SKIP_MCP" != "1" ]; then
    # mcp keeps its own major line but tracks lockstep minor.patch:
    #   lockstep 0.2.5  →  mcp 4.2.5
    LOCKSTEP_VER="$(node -p "require('./src/ontology-core/package.json').version")"
    MCP_VER="${MCP_MAJOR}.${LOCKSTEP_VER#*.}"
    step "Align @medicine-wheel/mcp → $MCP_VER (tracks lockstep $LOCKSTEP_VER)"
    npm version "$MCP_VER" --workspace mcp --no-git-tag-version --allow-same-version
  fi

  step "Sync inter-package dependency versions"
  node scripts/sync-versions.mjs

  step "Reinstall so the app resolves the new versions"
  rm -rf node_modules src/*/node_modules mcp/node_modules package-lock.json
  npm install --legacy-peer-deps
else
  step "DRY_RUN: skipping bump / sync / reinstall"
fi

VERSION="$(node -p "require('./package.json').version")"
echo "📌 Release version: v$VERSION"

# ── [5] Build packages + CLI ───────────────────────────────────────────────
step "Build all packages + CLI"
npm run build:packages
npm run build:cli

# ── publish helper: skip anything already on npm (makes the run resumable) ──
publish_pkg() {
  local name="$1" version="$2"; shift 2
  if [ "$DRY_RUN" = "1" ]; then
    echo "  📦 [dry-run] $name@$version"
    npm publish "$@" --access public --dry-run
    return
  fi
  if npm view "$name@$version" version >/dev/null 2>&1; then
    echo "  ⏭  $name@$version already on npm — skipping"
    return
  fi
  echo "  📦 publishing $name@$version"
  npm publish "$@" --access public
}

# ── [6] Publish every workspace package (lockstep + mcp) ───────────────────
step "Publish workspace packages"
while IFS=$'\t' read -r name version wspath; do
  [ -z "$name" ] && continue
  if [ "$SKIP_MCP" = "1" ] && [ "$name" = "@medicine-wheel/mcp" ]; then
    echo "  ⏭  $name skipped (SKIP_MCP=1)"; continue
  fi
  publish_pkg "$name" "$version" --workspace "$wspath"
done < <(node -e "import('./scripts/workspace-packages.mjs').then(m=>{for(const w of m.getWorkspacePackages())process.stdout.write([w.packageName,w.version,w.workspacePath].join('\t')+'\n')})")

# ── [7] Publish the root app ───────────────────────────────────────────────
step "Publish root app (@medicine-wheel/app@$VERSION)"
publish_pkg "@medicine-wheel/app" "$VERSION" --ignore-scripts

# ── [8] Docker build + push (:app AND :<version>) ──────────────────────────
if [ "$SKIP_DOCKER" = "1" ]; then
  step "Docker: skipped (SKIP_DOCKER=1)"
else
  step "Docker build → $IMAGE:app + $IMAGE:$VERSION"
  docker build -t "$IMAGE:app" -t "$IMAGE:$VERSION" .
  if [ "$DRY_RUN" = "1" ]; then
    echo "  🧪 dry-run: image built, not pushed"
  else
    step "Docker push"
    docker push "$IMAGE:app"
    docker push "$IMAGE:$VERSION"
  fi
fi

# ── [9] Commit (skipped in dry-run) ────────────────────────────────────────
if [ "$DRY_RUN" = "1" ]; then
  step "DRY_RUN: skipping commit"
else
  step "Commit release v$VERSION"
  # Stage everything the release touched: root + each workspace package.json AND
  # package-lock.json (npm install regenerates the per-workspace lockfiles too),
  # plus this release tool itself — so a release never leaves uncommitted work.
  mapfile -t REL_FILES < <(node -e "
    import('./scripts/workspace-packages.mjs').then((m) => {
      const fs = require('fs');
      for (const w of m.getWorkspacePackages()) {
        process.stdout.write(w.workspacePath + '/package.json\n');
        const lock = w.workspacePath + '/package-lock.json';
        if (fs.existsSync(lock)) process.stdout.write(lock + '\n');
      }
    });
  ")
  git add -- package.json package-lock.json release.sh "${REL_FILES[@]}"
  if git diff --cached --quiet; then
    echo "  (no release changes staged — nothing to commit)"
  else
    git commit -m "chore: release v$VERSION"
    git tag -a "v$VERSION" -m "release v$VERSION" 2>/dev/null || echo "  (tag v$VERSION already exists)"
    echo "  ✅ committed + tagged v$VERSION"
    echo "  ↪ push manually: git push && git push --tags"
  fi

  # Safety net: a release must leave a clean tree of tracked files.
  LEFTOVER="$(git status --porcelain --untracked-files=no)"
  if [ -n "$LEFTOVER" ]; then
    printf '\n  ⚠ release left uncommitted tracked changes:\n%s\n' "$LEFTOVER"
  fi
fi

trap - ERR
printf '\n\033[1;32m✅ Release complete — v%s\033[0m\n' "$VERSION"
if [ "$DRY_RUN" = "1" ]; then
  echo "   (dry-run — nothing was published, pushed, or committed)"
else
  echo "   npm: all @medicine-wheel/* packages @ $VERSION (mcp @ its own line)"
  [ "$SKIP_DOCKER" = "1" ] || echo "   docker: $IMAGE:app and $IMAGE:$VERSION pushed"
fi
