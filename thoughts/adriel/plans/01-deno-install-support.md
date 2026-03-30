# Deno-Native Installer Implementation Plan

## Overview

Add a Deno-native installer (`install.ts`) as the default installation path for
`ai-engineering-harness`. Users run a single `deno run` command — no git clone,
no GNU Stow — and files are copied as real files into the tool's target
directory. The existing `setup.sh` + stow flow is preserved as `--mode=repo` for
power users.

## Current State Analysis

- `setup.sh` (324 lines) uses GNU Stow to symlink `claude/`, `opencode/`,
  `gemini/` to their respective target dirs (`~/.claude`, `~/.config/opencode`,
  `~/.gemini`)
- No `manifest.json`, `deno.json`, or `deno.lock` exists at repo root
- Per-tool file structure:
  - `claude/`: `settings.json`, `.mcp.json`, `agents/*.md`, `skills/*/SKILL.md`
  - `opencode/`: `opencode.json`, `agents/*.md`, `commands/*.md`, `skills/*/SKILL.md`
  - `gemini/`: `agents/*.md`, `commands/*.toml`, `skills/*/SKILL.md`
- README leads with stow as the only install path

## Desired End State

1. `install.ts` exists at repo root; runnable via `deno run` against a raw GitHub URL
2. `manifest.json` at repo root enumerates all installable components per tool
3. Installer supports:
   - `--tool=<claude|opencode|gemini|all>` (required)
   - `--skill=<name>[,<name>]` for selective install
   - `--interactive` checkbox picker
   - `--dry-run` preview
   - `--yes` skip confirmation
   - `--mode=repo` to fall back to stow
   - `--dest=<path>` for repo mode clone target
4. On file conflict (existing file differs from source), installer shows a diff
   and prompts for confirmation unless `--yes` is passed
5. README Quick Start leads with the Deno install one-liner; stow docs moved to
   "Advanced" section

## What We're NOT Doing

- Not publishing to npm or any registry
- Not managing Deno itself (user installs Deno separately or uses `npx deno`)
- Not replacing `setup.sh` (it stays for repo/stow mode)
- Not adding rollback / `.bak` files (git recovers originals)
- Not auto-detecting repo mode from `--dest` (explicit `--mode=repo` required)
- Not implementing auto-updating or version pinning beyond SHA in the install URL
- Not adding `deno.json` / `deno.lock` at this time (import stability handled
  via JSR version pins in `install.ts` itself)

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Skill discovery | Static `manifest.json` | No extra API dependency; works in air-gapped / private repos; maintainable |
| Interactive UX | `@cliffy/prompt` from JSR | Full-featured, Deno-native, well-maintained on JSR |
| Default (no `--skill`) | Install all components for the tool | Safest, most intuitive default |
| Diff library | `@std/diff` from JSR | Part of Deno std, minimal footprint |
| Conflict strategy | Prompt per-file (skip with `--yes`) | Shows diff; user decides per file |
| Rollback | None | Git handles recovery; `.bak` files add noise |
| Repo mode trigger | Explicit `--mode=repo` | Clear; avoids surprising behavior |
| SHA pinning UX | README shows pinned URL; separate `install-latest.sh` one-liner | Balances safety and convenience |

## Implementation Approach

Three files change:

1. **`manifest.json`** — static index of all installable components, structured
   by tool → component name → file list with `src`/`dest` pairs
2. **`install.ts`** — Deno script: parse args → load manifest → resolve
   components → copy with diff/confirm
3. **`README.md`** — restructure Quick Start; stow moves to Advanced section

---

## Phase 1: manifest.json

### Overview

Create a static manifest that describes every installable file, grouped by tool
and component. This is the source of truth for the installer — never derived
dynamically.

### Changes Required

#### 1. `manifest.json` (new file at repo root)

**File**: `manifest.json`

**Structure**:

```json
{
  "version": "1",
  "tools": {
    "claude": {
      "target": "~/.claude",
      "components": {
        "settings": {
          "description": "Claude Code global settings and MCP configuration",
          "files": [
            { "src": "claude/settings.json", "dest": "settings.json" },
            { "src": "claude/.mcp.json",     "dest": ".mcp.json"     }
          ]
        },
        "agents": {
          "description": "Specialized subagents for Claude Code",
          "files": [
            { "src": "claude/agents/codebase_analyzer.md",     "dest": "agents/codebase_analyzer.md"     },
            { "src": "claude/agents/codebase_locator.md",      "dest": "agents/codebase_locator.md"      },
            { "src": "claude/agents/codebase_pattern_finder.md","dest": "agents/codebase_pattern_finder.md"},
            { "src": "claude/agents/thoughts_analyzer.md",     "dest": "agents/thoughts_analyzer.md"     },
            { "src": "claude/agents/thoughts_locator.md",      "dest": "agents/thoughts_locator.md"      },
            { "src": "claude/agents/web_search_researcher.md", "dest": "agents/web_search_researcher.md" }
          ]
        },
        "skill/commit":                   { "description": "Git commit workflow skill",              "files": [{ "src": "claude/skills/commit/SKILL.md",                    "dest": "skills/commit/SKILL.md"                    }] },
        "skill/create_plan":              { "description": "Create implementation plans skill",     "files": [{ "src": "claude/skills/create_plan/SKILL.md",               "dest": "skills/create_plan/SKILL.md"               }] },
        "skill/debug":                    { "description": "Debugging investigation skill",         "files": [{ "src": "claude/skills/debug/SKILL.md",                     "dest": "skills/debug/SKILL.md"                     }] },
        "skill/debug-k8s":                { "description": "Kubernetes cluster debugging skill",    "files": [{ "src": "claude/skills/debug-k8s/SKILL.md",                 "dest": "skills/debug-k8s/SKILL.md"                 }] },
        "skill/experimental-pr-workflow": { "description": "Experimental PR workflow skill",        "files": [{ "src": "claude/skills/experimental-pr-workflow/SKILL.md",  "dest": "skills/experimental-pr-workflow/SKILL.md"  }] },
        "skill/git-commit-helper":        { "description": "Auto-triggered git commit helper",      "files": [{ "src": "claude/skills/git-commit-helper/SKILL.md",         "dest": "skills/git-commit-helper/SKILL.md"         }] },
        "skill/implement_plan":           { "description": "Execute an approved plan skill",        "files": [{ "src": "claude/skills/implement_plan/SKILL.md",            "dest": "skills/implement_plan/SKILL.md"            }] },
        "skill/init_harness":             { "description": "Initialize harness in new repo skill",  "files": [{ "src": "claude/skills/init_harness/SKILL.md",              "dest": "skills/init_harness/SKILL.md"              }] },
        "skill/pr-description-generator":{ "description": "PR description generator skill",        "files": [{ "src": "claude/skills/pr-description-generator/SKILL.md",  "dest": "skills/pr-description-generator/SKILL.md"  }] },
        "skill/research_codebase":        { "description": "Comprehensive codebase research skill", "files": [{ "src": "claude/skills/research_codebase/SKILL.md",         "dest": "skills/research_codebase/SKILL.md"         }] },
        "skill/validate_plan":            { "description": "Validate implementation skill",         "files": [{ "src": "claude/skills/validate_plan/SKILL.md",             "dest": "skills/validate_plan/SKILL.md"             }] }
      }
    },
    "opencode": { "...": "similar structure for opencode" },
    "gemini":   { "...": "similar structure for gemini" }
  }
}
```

### Success Criteria

- [x] `manifest.json` parses as valid JSON
- [x] Every `src` path in the manifest corresponds to a real file in the repo
- [x] All three tools (`claude`, `opencode`, `gemini`) are represented
- [x] Component names for skills follow the `skill/<name>` convention

---

## Phase 2: install.ts

### Overview

Deno entry point that reads the manifest, resolves which components to install,
and copies files with diff-on-conflict and optional interactive selection.

### Changes Required

#### 1. `install.ts` (new file at repo root)

**File**: `install.ts`

**Core logic**:

```
parseArgs()
  → load manifest (local file or fetch from GitHub raw URL)
  → resolveComponents(tool, skill flags, interactive)
  → for each component → for each file:
      expandDest(~/ → home dir)
      if destExists AND content differs → showDiff → promptConfirm (or --yes)
      if --dry-run → print what would happen, skip write
      else → mkdirp + copyFile
  → print summary
```

**Imports** (JSR, version-pinned):

```typescript
import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { difference } from "jsr:@std/diff@1";
import { Checkbox } from "jsr:@cliffy/prompt@1/checkbox";
import { expandGlob } from "jsr:@std/fs@1/expand-glob";
import { ensureDir } from "jsr:@std/fs@1/ensure-dir";
```

**Key implementation details**:

- `expandHome(path: string)`: replaces leading `~/` with `Deno.env.get("HOME")`
  (on Windows: `USERPROFILE`). Cross-platform safe.
- Manifest loading: when running from a raw GitHub URL, the script infers
  the base URL and fetches `manifest.json` from the same SHA. When running
  locally, reads from `./manifest.json`.
- Diff display: uses `@std/diff` to produce a unified-like diff, printed to
  stderr before prompting.
- `--mode=repo`: prints instructions to clone and run `setup.sh` (does not
  invoke stow itself — Deno would need `--allow-run` and that adds friction).
- Permissions required: `--allow-read --allow-write --allow-net --allow-env`
  - `--allow-net` only needed for remote URL invocation
  - `--allow-env` for `HOME`/`USERPROFILE` expansion

**Arg parsing**:

```typescript
const args = parseArgs(Deno.args, {
  string: ["tool", "skill", "dest"],
  boolean: ["interactive", "dry-run", "yes", "help"],
  alias: { h: "help", n: "dry-run", y: "yes", i: "interactive" },
});
```

**`--tool=all`**: expands to all three tools, runs sequentially.

**Interactive mode** (cliffy Checkbox):

```typescript
const selected = await Checkbox.prompt({
  message: "Select components to install",
  options: components.map(c => ({ name: c.description, value: c.name })),
});
```

### Success Criteria

#### Manual Verification:
- [ ] `deno run --allow-read --allow-write --allow-env install.ts --tool=claude --dry-run` prints a list of files that would be copied, exits 0
- [ ] `deno run ... install.ts --tool=claude --skill=git-commit-helper --dry-run` prints only the git-commit-helper SKILL.md entry
- [ ] `deno run ... install.ts --tool=claude --yes` copies all claude files to `~/.claude/`; re-running is idempotent
- [ ] When a destination file differs, installer shows a diff and prompts (without `--yes`)
- [ ] `--tool=all` installs claude, opencode, and gemini sequentially
- [ ] `~/` paths expand correctly on macOS/Linux
- [ ] `--help` prints usage

---

## Phase 3: README.md Update

### Overview

Restructure Quick Start to lead with the Deno one-liner. Move stow instructions
to a new "Advanced: Repo / Stow Mode" section.

### Changes Required

#### 1. `README.md`

**Restructure**:

```
## Quick Start

### Prerequisites
- Deno (install via `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`)
- **Private repo:** Authenticate with `gh auth login` before running the installer.

### Install (Deno — recommended)
# Install all Claude Code configs
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<SHA>/install.ts \
  --tool=claude

# Preview without writing
... --dry-run

# Install a single skill
... --skill=git-commit-helper

# Interactive picker
... --interactive

# Install all tools
... --tool=all

### Advanced: Repo / Power-User Mode (GNU Stow)
[existing stow instructions moved here, unchanged]
```

**SHA pinning note**: Replace `<SHA>` with the latest commit SHA. Check the
latest SHA at: `https://github.com/adrielp/ai-engineering-harness/commits/main`

Remove the "Why Stow?" section or demote it to the Advanced section.

### Success Criteria

- [ ] Quick Start section leads with Deno install
- [ ] Stow instructions still present under Advanced section
- [ ] Private repo callout (`gh auth login`) is present
- [ ] `--dry-run` and selective `--skill` examples are shown

---

## Testing Strategy

All testing is manual (no test framework added — this is a single-file Deno
script, not a library):

1. **Dry run**: run with `--dry-run` and verify output lists expected files
2. **Fresh install**: remove `~/.claude/skills/git-commit-helper/SKILL.md`,
   run with `--skill=git-commit-helper`, verify file is created
3. **Idempotent install**: run twice; second run should report no-op or
   re-confirm with no diff
4. **Conflict prompt**: modify a dest file, run without `--yes`; verify diff is
   shown and prompt appears
5. **All-tools install**: `--tool=all --dry-run`; verify all three tools listed
6. **Interactive**: `--interactive`; verify checkbox picker appears and only
   selected components are installed

---

## References

- Original ticket: `thoughts/adriel/tickets/01-deno-install-support.md`
- Current installer: `setup.sh`
- Deno std diff: https://jsr.io/@std/diff
- Deno std fs: https://jsr.io/@std/fs
- Cliffy prompt: https://jsr.io/@cliffy/prompt
- Deno permissions: https://docs.deno.com/runtime/fundamentals/security/
