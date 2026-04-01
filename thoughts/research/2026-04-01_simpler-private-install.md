---
date: 2026-04-01T00:00:00-04:00
researcher: claude
topic: "Simplifying private repo installation UX"
tags: [research, installer, ux, private-repos]
status: complete
---

# Research: Simplifying Private Repo Installation

## Research Question
How can we make installation simpler and easier? The `deno run` approach makes sense, but copying huge commands is painful — especially for private repos.

## Summary

The current remote install command is 3 lines long and requires a tag/SHA. For private repos it's completely broken. The best solution depends on the audience:

1. **Already-authenticated `gh` users (primary audience):** A shell bootstrap script fetched via `gh api` — one short command
2. **CI/automation:** `GITHUB_TOKEN` env var + shell script
3. **Public repo fallback:** Keep the `deno run` approach but with a shorter URL

## The Core Problem

```bash
# Current: 4 lines, requires knowing a SHA, doesn't work for private repos
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG>/install.ts \
  --tool=claude
```

For private repos, this becomes even worse — Deno can't even fetch the script.

## Options Analyzed

### Option A: Shell Bootstrap Script via `gh` CLI

Add an `install.sh` that wraps clone → deno run → cleanup:

```bash
# User runs (one line):
bash <(gh api repos/adrielp/ai-engineering-harness/contents/install.sh -H 'Accept:application/vnd.github.raw' --jq '.')

# Or shorter with a gh alias:
gh harness install claude
```

**Pros:** Works with private repos, `gh` handles auth, no token management
**Cons:** Requires `gh` CLI, the `gh api` command is still longish

### Option B: Clone-and-Run Wrapper Script

Ship an `install.sh` in the repo root:

```bash
#!/bin/bash
# Clone to temp, run installer, cleanup
TMPDIR=$(mktemp -d)
gh repo clone adrielp/ai-engineering-harness "$TMPDIR" -- --depth=1 --quiet
deno run --allow-read --allow-write --allow-env "$TMPDIR/install.ts" "$@"
rm -rf "$TMPDIR"
```

User runs:
```bash
bash <(gh api repos/adrielp/ai-engineering-harness/contents/install.sh -H 'Accept:application/vnd.github.raw') --tool=claude
```

**Pros:** Full local mode (no auth issues for content), single file to maintain
**Cons:** Still a long `gh api` command unless shortened

### Option C: Publish to JSR (Deno Registry)

```bash
# Dream UX:
deno run -A jsr:@adrielp/ai-harness --tool=claude
```

**Pros:** Shortest possible command, Deno handles everything
**Cons:** JSR is public — can't publish private repo content there. Would need a separate public installer package that fetches private content with a token.

### Option D: npm Package (npx)

```bash
npx @adrielp/ai-engineering-harness --tool=claude
```

**Pros:** Familiar to JS devs, short command
**Cons:** Requires npm publish pipeline, maintaining a Node wrapper around the Deno installer, GitHub Packages auth setup for private packages

### Option E: GitHub Release Binary + Shell Script

Publish the installer + manifest as a GitHub Release asset. Short install script:

```bash
curl -fsSL https://github.com/adrielp/ai-engineering-harness/releases/latest/download/install.sh | bash -s -- --tool=claude
```

For private repos:
```bash
gh release download --repo adrielp/ai-engineering-harness --pattern 'install.sh' -O - | bash -s -- --tool=claude
```

**Pros:** Standard pattern, works with gh auth, clean UX
**Cons:** Requires release automation to bundle installer + manifest + all source files into release assets

## Recommendation

**Option B (clone-and-run wrapper) is the best fit** for this project:

1. **Simplest to implement** — one shell script, no registry publishing
2. **Works for private repos** — `gh` handles auth transparently
3. **No token management** — user just needs `gh auth login` once
4. **Falls back to Deno** — if public, the `deno run <url>` approach still works
5. **Content is always fresh** — clones HEAD (or a specific ref)

### Proposed UX

```bash
# Private repo (gh authenticated):
bash <(gh api repos/adrielp/ai-engineering-harness/contents/install.sh \
  -H 'Accept:application/vnd.github.raw') --tool=claude

# OR with clone shorthand:
gh repo clone adrielp/ai-engineering-harness /tmp/aih -- --depth=1 -q && \
  deno run -A /tmp/aih/install.ts --tool=claude && rm -rf /tmp/aih

# Public repo (unchanged):
deno run -A https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts --tool=claude
```

### Further Simplification: `gh` Alias

Users can create a one-time alias:
```bash
gh alias set harness-install 'repo clone adrielp/ai-engineering-harness /tmp/aih -- --depth=1 -q && deno run -A /tmp/aih/install.ts "$@" && rm -rf /tmp/aih'

# Then forever after:
gh harness-install --tool=claude
```

## Architecture Impact

- Add `install.sh` (shell bootstrap) to repo root
- Modify `install.ts` to accept `--token` flag for authenticated fetch (handles the case where user runs deno directly with a token)
- Update README with simplified install commands
- Add `--ref` flag to install.sh for pinning to tags/SHAs

## Open Questions

1. Should the bootstrap script require Deno, or should it fall back to curl-based file downloads when Deno isn't available?
2. Is the `gh api` one-liner acceptable length, or should we host the bootstrap script at a shorter URL?
3. Should the release pipeline bundle everything into a self-contained archive?
