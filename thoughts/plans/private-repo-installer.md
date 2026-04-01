# Private Repository Installer Support

## Overview

Enable the Deno-based installer (`install.ts`) to work with private GitHub repositories. Currently, remote installs fail because (1) Deno can't fetch the script itself from a private `raw.githubusercontent.com` URL, and (2) the installer's internal `fetch()` calls send no auth headers.

## Current State Analysis

- `install.ts` uses `raw.githubusercontent.com` URLs derived from `import.meta.url`
- All `fetch()` calls are unauthenticated — works for public repos only
- Two fetch points: `loadManifest()` (line 78) and `fetchRemoteFile()` (line 99)
- Local mode (`deno run install.ts`) works fine — no fetch needed
- Deno supports `DENO_AUTH_TOKENS` env var for authenticating module imports

## Desired End State

A user with `gh` CLI authenticated can install from a private repo with:

```bash
# One-liner: sets DENO_AUTH_TOKENS for script fetch, GITHUB_TOKEN for content fetches
GITHUB_TOKEN=$(gh auth token) DENO_AUTH_TOKENS="$(gh auth token)@raw.githubusercontent.com" \
  deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG>/install.ts \
  --tool=claude
```

Or more simply, with the convenience wrapper:

```bash
# Reads token from: --token flag → GITHUB_TOKEN env → `gh auth token` (auto-detect)
deno run ... install.ts --token=$(gh auth token) --tool=claude
```

## What We're NOT Doing

- Not switching away from `raw.githubusercontent.com` to the GitHub API (unnecessary complexity)
- Not bundling `gh` CLI as a dependency — token is user-provided
- Not handling GitHub App tokens or fine-grained PATs differently — all Bearer tokens work the same

## Phase 1: Add Token Support to install.ts

### Changes Required

#### 1. Parse `--token` flag and resolve token
**File**: `install.ts`
**Changes**:
- Add `token` to `parseArgs` string options
- Add token resolution function: `--token` flag → `GITHUB_TOKEN` env → `gh auth token` subprocess (in that priority order)
- Store resolved token in `InstallOptions`

#### 2. Pass auth headers on all fetch calls
**File**: `install.ts`
**Changes**:
- Create a `fetchWithAuth(url: string, token?: string)` helper that wraps `fetch()` with `Authorization: Bearer <token>` header when token is present
- Replace `fetch(manifestUrl)` in `loadManifest()` with `fetchWithAuth(manifestUrl, token)`
- Replace `fetch(url)` in `fetchRemoteFile()` with `fetchWithAuth(url, token)`
- Thread `token` through `loadManifest()` and `fetchRemoteFile()` signatures

#### 3. Update help text and docs
**File**: `install.ts`
**Changes**:
- Add `--token` to the header comment and `printHelp()` output
- Add private repo example to help text

**File**: `README.md`
**Changes**:
- Add "Private Repositories" section under Quick Start with the one-liner
- Document the `DENO_AUTH_TOKENS` requirement for Deno to fetch the script itself

### Success Criteria

#### Automated Verification:
- [ ] `deno check install.ts` passes (type check)
- [ ] `deno run --allow-read --allow-write --allow-env install.ts --tool=claude` still works locally (no regression)
- [ ] `--help` shows `--token` flag

#### Manual Verification:
- [ ] Remote install with `GITHUB_TOKEN` + `DENO_AUTH_TOKENS` works against private repo
- [ ] `--token` flag works
- [ ] Auto-detection via `gh auth token` works when no explicit token given
- [ ] Graceful error message when token is needed but not provided (403/404 from GitHub)

## Implementation Details

### Token Resolution Priority

```
1. --token=<value>        (explicit flag)
2. GITHUB_TOKEN env var   (CI-friendly, standard GitHub convention)
3. gh auth token          (auto-detect from gh CLI — subprocess call)
4. null                   (unauthenticated — works for public repos)
```

The `gh auth token` auto-detection should:
- Only attempt if running remotely (baseUrl is not null)
- Catch subprocess errors silently (gh not installed, not logged in)
- Not require `--allow-run` permission — use `new Deno.Command()` with `DENO_PERMISSIONS` check

Note: `gh auth token` auto-detection requires `--allow-run` Deno permission. Add this to the documented `deno run` flags.

### fetchWithAuth Helper

```typescript
function fetchWithAuth(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}
```

### Error Handling

When a fetch returns 404 or 403 and no token was provided, print:

```
Error: Failed to fetch (403 Forbidden). If this is a private repository, provide a token:

  GITHUB_TOKEN=$(gh auth token) DENO_AUTH_TOKENS="$(gh auth token)@raw.githubusercontent.com" \
    deno run --allow-read --allow-write --allow-net --allow-env --allow-run \
    <url> --tool=claude

Or pass --token explicitly:
    ... --token=$(gh auth token) --tool=claude
```

## References

- Deno auth tokens: https://docs.deno.com/runtime/reference/cli/environment_variables/#deno_auth_tokens
- GitHub raw content auth: Bearer token in Authorization header on raw.githubusercontent.com
- Current installer: `install.ts`
