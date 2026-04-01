# Simplify Installation with `deno install`

## Overview

Replace the multi-line `deno run https://raw.githubusercontent.com/...` install command with a two-step experience: a one-time `deno install` to register a named CLI command, then a short `ai-harness --tool=claude` forever after. Also add `GITHUB_TOKEN`/`DENO_AUTH_TOKENS` support for private/enterprise repos.

## Current State

- `install.ts` works but requires a 3-line command with a long `raw.githubusercontent.com` URL
- No auth support — private repos fail completely
- README documents the long command, which is copy-paste unfriendly
- Local mode (`deno run install.ts --tool=claude`) works fine

## Desired End State

```bash
# One-time setup (public repo):
deno install -Agf -n ai-harness \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts

# One-time setup (private/enterprise repo):
DENO_AUTH_TOKENS="$(gh auth token)@raw.githubusercontent.com" \
  deno install -Agf -n ai-harness \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts

# Then forever:
ai-harness --tool=claude
ai-harness --tool=all --interactive
ai-harness --tool=opencode --skill=agents
```

## What We're NOT Doing

- Not publishing to JSR, npm, or any package registry
- Not changing the Deno installer logic (manifest, components, diff, etc.)
- Not removing the direct `deno run <url>` approach (still works)
- Not removing GNU Stow / `setup.sh` (power user path stays)

## Phase 1: Add Auth Support to `install.ts`

### Changes Required

#### 1. Add `fetchWithAuth` helper
**File**: `install.ts`

Add a helper that wraps `fetch()` with an `Authorization` header when a token is available:

```typescript
function resolveToken(): string | null {
  // 1. GITHUB_TOKEN env var (CI-friendly, standard convention)
  const envToken = Deno.env.get("GITHUB_TOKEN") ?? Deno.env.get("GH_TOKEN");
  if (envToken) return envToken;
  // 2. No token — unauthenticated (works for public repos)
  return null;
}

function fetchWithAuth(url: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}
```

#### 2. Thread token through fetch calls
**File**: `install.ts`

- Call `resolveToken()` once at startup, store in `InstallOptions`
- Replace `fetch(manifestUrl)` in `loadManifest()` with `fetchWithAuth(manifestUrl, token)`
- Replace `fetch(url)` in `fetchRemoteFile()` with `fetchWithAuth(url, token)`
- Add better error message on 403/404 suggesting auth setup

#### 3. Update help text
**File**: `install.ts`

Add `deno install` instructions and private repo auth examples to the `printHelp()` output.

### Success Criteria

- [x] `deno check install.ts` passes
- [x] `deno run --allow-read --allow-write --allow-env install.ts --tool=claude` still works locally
- [x] `--help` shows `deno install` usage and auth instructions
- [x] `GITHUB_TOKEN` env var is used for authenticated fetches when set

## Phase 2: Restructure and Optimize README

The current README has significant duplication: agents listed 3x, workflow examples repeated 3x, and OTel skills listed in every tool section. Fix all of this alongside the install simplification.

### Changes Required

#### 1. Rewrite Quick Start around `deno install`
**File**: `README.md`

Replace the current 4-block `deno run` section with:

```markdown
## Quick Start

### Prerequisites
- [Deno](https://deno.com/) (or use `npx deno` as a zero-install fallback)

### Install

# Register the CLI (one-time):
deno install -Agf -n ai-harness \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG>/install.ts

# Then install configs:
ai-harness --tool=claude          # Claude Code
ai-harness --tool=opencode        # OpenCode
ai-harness --tool=gemini          # Gemini CLI
ai-harness --tool=all             # All three

# More options:
ai-harness --tool=claude --dry-run        # Preview
ai-harness --tool=claude --interactive    # Pick components
ai-harness --tool=claude --skill=agents   # Specific component
ai-harness --help                         # Full usage
```

#### 2. Add Private/Enterprise section
**File**: `README.md`

```markdown
### Private & Enterprise Repos

Add to `~/.zshrc` or `~/.bashrc` (one-time):
export DENO_AUTH_TOKENS="$(gh auth token)@raw.githubusercontent.com"
export GITHUB_TOKEN="$(gh auth token)"

Then use the same install commands above.
```

#### 3. Keep alternative install methods but compress
- Move `deno run <url>` to a collapsed/brief "Direct Run" subsection
- Keep GNU Stow section but tighten (remove per-tool repetition, show `./setup.sh <tool>` once with a table of tool→target mappings)

#### 4. Deduplicate "What's Included" section
**Current problem**: Agents listed 3x (identical), commands/skills listed per-tool with 80% overlap, OTel skills listed in every section.

**New structure**:
```markdown
## What's Included

### Agents (All Tools)
Shared across Claude Code, OpenCode, and Gemini CLI:
- `codebase_analyzer` - Analyzes implementation details and traces data flow
- `codebase_locator` - Finds files and components by feature/topic
- [etc.]

### Commands & Skills
| Capability | Claude Code | OpenCode | Gemini CLI |
|---|---|---|---|
| `/commit` | skill | command + skill | command + skill |
| `/create_plan` | skill | command + skill | command + skill |
| [etc.] | | | |

### OpenTelemetry Skills (All Tools)
Auto-triggered orchestrator (`otel_instrument`) routes to:
- `otel_instrumentation` — SDK setup, traces, metrics, logs
- `otel_collector` — Collector YAML configuration
- `otel_semantic_conventions` — Attribute naming and migration
- `otel_ottl` — OTTL expressions for transforms/redaction
```

#### 5. Consolidate workflow examples
**Current problem**: Same workflow shown 3 times (OpenCode, Claude Code, Gemini CLI) with only the tool name different.

**New structure**: Show workflow once, note that commands are identical across tools. Only mention per-tool differences where they exist (`/init_harness` creates different files).

#### 6. Compress Customization section
Combine "Adding Agents (OpenCode)" and "Adding Subagents (Claude Code)" into one section since the format is identical.

### Success Criteria

- [x] README shows `deno install` as primary method
- [x] Private repo instructions are clear and concise  
- [x] Agents listed only once (not 3x)
- [x] OTel skills listed only once (not 3x)
- [x] Workflow example shown once (not 3x)
- [x] Command reference table kept and up-to-date
- [x] Direct `deno run` and GNU Stow still documented as alternatives
- [x] Overall README length reduced by ~40% (461 → 243 lines, 47% reduction)

## Implementation Notes

### Why `DENO_AUTH_TOKENS` + `GITHUB_TOKEN` (two env vars)?

- `DENO_AUTH_TOKENS` — Deno's built-in mechanism for authenticating module imports. Required so `deno install`/`deno run` can fetch `install.ts` from private `raw.githubusercontent.com`. Format: `token@hostname`.
- `GITHUB_TOKEN` — Used by our `install.ts` code for authenticated `fetch()` calls to download manifest.json and file contents. Standard GitHub convention, works in CI.

Both are needed for private repos. Users set them once in their shell profile.

### `deno install` flags explained

- `-A` — Allow all permissions (the installer needs read, write, net, env)
- `-g` — Global install (places binary in `~/.deno/bin/`)
- `-f` — Force overwrite if already installed
- `-n ai-harness` — Name of the CLI command

## References

- Research: `thoughts/research/2026-04-01_simpler-private-install.md`
- Previous plan (superseded): `thoughts/plans/private-repo-installer.md`
- Deno install docs: https://docs.deno.com/runtime/reference/cli/install/
- DENO_AUTH_TOKENS: https://docs.deno.com/runtime/reference/cli/environment_variables/#deno_auth_tokens
