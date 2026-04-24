# Open Editor Extension Implementation Plan

## Overview

Add a pi extension to the AI Engineering Harness that lets the user open
files from the current working directory in their default terminal editor.
The extension exposes two user-facing entry points:

- **`/edit [path]`** slash command (with path argument tab-completion)
- **`ctrl+e`** keyboard shortcut (opens a file picker)

Editor resolution follows the standard Unix convention: `$VISUAL` →
`$EDITOR` → `vi`. Terminal editors (nvim, vim, nano, helix, emacs, etc.)
run with the pi TUI suspended (`stdio: "inherit"`, blocking) so the user
edits inline and returns to pi on exit. GUI editors (`code`, `cursor`,
`subl`, `mate`, `atom`, `gedit`, `kate`) are detached and pi keeps
running.

This is strictly a user-facing convenience; no LLM-callable tool is
registered.

## Current State Analysis

- The harness already ships project-local pi extensions under
  `pi/extensions/` (e.g. `bifrost.ts`, `subagent/`). Both are picked up
  automatically by pi's `.pi/extensions/*.ts` and `.pi/extensions/*/index.ts`
  auto-discovery. `pi/extensions/` is the canonical location for this repo.
- There is no existing "open in editor" affordance. Users who want to view
  or edit a file today must shell out with `!nvim path` using pi's
  `interactive-shell` pattern (if installed) or drop pi entirely.
- The pi distribution (at
  `~/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/`)
  provides a reference implementation for suspending the TUI and running
  blocking interactive commands in
  `examples/extensions/interactive-shell.ts`. That example is the model
  for the terminal-editor branch of this extension.
- `ctrl+e` is bound to `tui.editor.cursorLineEnd` by pi defaults
  (`docs/keybindings.md` line 36). Registering `ctrl+e` as an extension
  shortcut will shadow that default inside pi's input editor. Decision
  (per user): accept the override; `end` still moves to line end.

## Desired End State

A single extension file at `pi/extensions/open-editor.ts` (or a
directory `pi/extensions/open-editor/index.ts` if it grows) that, once
the harness is installed and pi is launched in a project:

1. Registers `/edit [path]` with tab-completion against files in `cwd`.
2. Registers `ctrl+e` to open an interactive file picker.
3. Resolves the editor from `$VISUAL` → `$EDITOR` → `vi`.
4. Detects GUI editors by binary name and launches them detached
   without suspending pi.
5. For terminal editors, suspends pi's TUI, runs the editor with full
   terminal control, and resumes pi with a clean redraw afterwards.
6. Surfaces failures (missing file, unknown editor, non-zero exit) via
   `ctx.ui.notify`, not as agent messages.

### Verification

- `EDITOR=nvim pi`, then `/edit AGENTS.md` → nvim opens full-screen, exit
  returns to pi with prompt intact.
- `EDITOR=code pi`, then `ctrl+e` → file picker appears, pick a file →
  VS Code window opens, pi prompt remains responsive immediately.
- `/edit` with a bogus path → red notify toast, no crash.
- `unset EDITOR VISUAL; pi`, then `/edit README.md` → `vi` opens.

## What We're NOT Doing

- No LLM-callable tool (agents already have `read`/`edit` built in).
- No buffer-backed in-TUI editor — we spawn the user's real editor.
- No support for remote / SSH sessions beyond whatever their editor
  already handles.
- No `.gitignore`-aware recursive indexer. The file picker uses
  `git ls-files` when available and falls back to a simple walk that
  excludes `node_modules`, `.git`, `dist`, `build`, `.next`, `target`.
- No Windows-specific handling beyond what `spawnSync` gives us; the
  harness is macOS/Linux-first.
- No `--wait` injection for GUI editors. If a user wants blocking
  behavior from VS Code they set `EDITOR="code --wait"` themselves.
- No file creation if the path does not exist. `/edit missing.txt`
  reports an error. (Future enhancement: honor `/edit -c` to create.)

## Implementation Approach

Single-file extension that:

1. Defines a `resolveEditor()` helper returning
   `{ command: string; argv: string[]; isGui: boolean }` derived from
   `$VISUAL` / `$EDITOR` / `"vi"`. Shell-split the env string (simple
   whitespace split is sufficient; we do not need full POSIX quoting —
   document the limitation).
2. Defines a `GUI_EDITORS` set: `code`, `code-insiders`, `cursor`,
   `windsurf`, `subl`, `mate`, `atom`, `gedit`, `kate`, `zed`.
   `isGui` is true when the resolved command's basename is in the set.
3. Defines a `listFiles(cwd)` helper: run `git ls-files -co
   --exclude-standard` via `pi.exec`; on non-zero exit fall back to a
   bounded recursive walk (cap 5000 entries) using `node:fs` with the
   excluded-dir set above.
4. Defines `openFile(ctx, relPath)` which:
   - Validates the path exists (`fs.statSync`) relative to `ctx.cwd`.
   - Resolves editor.
   - If GUI: `spawn(command, [...argv, absPath], { detached: true, stdio: "ignore" }).unref()` and notify.
   - If terminal: use the `ctx.ui.custom` / `tui.stop()` / `spawnSync` pattern from `interactive-shell.ts`, then `tui.start()` and `tui.requestRender(true)`.
5. Registers `/edit` with `getArgumentCompletions(prefix)` returning
   files from `listFiles` whose path starts with `prefix`.
6. Registers `ctrl+e` shortcut that runs `ctx.ui.select(...)` over
   `listFiles` and then calls `openFile`.

Everything else (error toasts, fallbacks) is localized in `openFile`.

---

## Phase 1: Extension Skeleton and Editor Resolution

### Overview

Create the extension file, wire it into the harness, and land the
core editor-resolution + spawn logic without UI bindings yet. Verified
by a temporary `session_start` hook that opens a hardcoded file on
load (removed at end of phase).

### Changes Required

#### 1. New extension file
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- Default-export factory `function (pi: ExtensionAPI) { ... }`.
- `resolveEditor()` — reads `process.env.VISUAL || process.env.EDITOR || "vi"`, whitespace-splits, returns `{ command, argv, isGui }`.
- `GUI_EDITORS` constant set as listed above.
- `openFile(ctx, relPath)` implementing both GUI-detached and terminal-blocking branches, modeled on `examples/extensions/interactive-shell.ts` (`tui.stop()` → `spawnSync(command, [...argv, absPath], { stdio: "inherit", env: process.env })` → `tui.start()` + `tui.requestRender(true)`).
- Error paths all route through `ctx.ui.notify(msg, "error")`.

#### 2. Install manifest (sanity check only)
**File**: `manifest.json` / `install.ts`
**Changes**: None expected — `pi/extensions/` is already copied/linked by the installer. Verify by reading `install.ts` once before shipping; if `pi/extensions/*.ts` is not picked up, add `open-editor.ts` to whatever enumeration exists.

### Success Criteria

#### Automated Verification
- [x] Repo has no local tsconfig; extensions are jiti-loaded. Smoke test: `pi -e pi/extensions/open-editor.ts -p "ping"` exits cleanly.
- [x] `pi -e pi/extensions/open-editor.ts` starts without error.

#### Manual Verification
- [ ] With `EDITOR=nvim`, running `/edit AGENTS.md` in an interactive pi session opens nvim full-screen; quitting nvim returns to a redrawn pi prompt. *(Requires interactive terminal — deferred to user.)*
- [ ] With `EDITOR=code`, `/edit AGENTS.md` opens VS Code and pi stays interactive. *(Deferred to user.)*
- [ ] With `EDITOR` unset, `vi` opens. *(Deferred to user.)*
- [x] No dev-only hook introduced — implemented directly via `/edit` and `ctrl+e`.

---

## Phase 2: `/edit` Slash Command with Path Completion

### Overview

Expose the `openFile` logic as `/edit [path]`. No argument → show
picker (same implementation used in Phase 3). Tab-completion over
files in cwd.

### Changes Required

#### 1. File listing helper
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- Add `listFiles(cwd: string): Promise<string[]>` using `pi.exec("git", ["ls-files", "-co", "--exclude-standard"], { timeout: 2000 })`.
- On non-zero exit or no git: fall back to a sync recursive walk (`readdirSync` with `withFileTypes: true`) that skips `node_modules`, `.git`, `dist`, `build`, `.next`, `target`, `.venv`, `venv`, capped at 5000 entries.
- Cache the result for 2 seconds per `cwd` to avoid thrashing during tab-completion keystrokes.

#### 2. Command registration
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- `pi.registerCommand("edit", { description, getArgumentCompletions, handler })`.
- `getArgumentCompletions(prefix)`:
  - Call `listFiles(ctx.cwd)` synchronously from cache (populate lazily on first invocation — acceptable that the very first tab press may return `null`).
  - Filter entries where `entry.startsWith(prefix)`.
  - Map to `AutocompleteItem { value: entry, label: entry }`.
  - Return the first 50 matches, or `null` if empty.
- `handler(args, ctx)`:
  - Trim `args`. If empty, fall through to the picker (reuse the function built in Phase 3; for Phase 2 this is a TODO that currently notifies "usage: /edit <path>").
  - Otherwise call `openFile(ctx, args.trim())`.

### Success Criteria

#### Automated Verification
- [x] `pi -e pi/extensions/open-editor.ts -p "/edit nope_xyz.txt"` runs cleanly (file-not-found handled via notify; no crash).

#### Manual Verification
- [ ] `/edit AG<Tab>` completes to `AGENTS.md`. *(Deferred — interactive.)*
- [ ] `/edit thoughts/<Tab>` cycles through files under `thoughts/`. *(Deferred.)*
- [ ] `/edit AGENTS.md` opens the file in the resolved editor. *(Deferred.)*
- [ ] `/edit nope.txt` shows an error toast and no editor launches. *(Deferred — notify is no-op in print mode.)*
- [x] `/edit` with no arg falls through to picker directly (Phase 3 wired in same commit — no placeholder stage).

---

## Phase 3: `ctrl+e` Shortcut and File Picker

### Overview

Bind `ctrl+e` to open a file picker backed by `listFiles`, wire the
same picker into the zero-arg `/edit` path, and finalize UX.

### Changes Required

#### 1. Picker helper
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- Add `pickAndOpen(ctx)` using `ctx.ui.select("Open file", files)` where `files` comes from `listFiles(ctx.cwd)`.
- On cancel (`null`/`undefined` return), no-op.
- On selection, call `openFile(ctx, selection)`.
- If `files` is empty, `ctx.ui.notify("No files found", "warn")`.

#### 2. Shortcut registration
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- `pi.registerShortcut("ctrl+e", { description: "Open file in $EDITOR", handler: (ctx) => pickAndOpen(ctx) })`.
- Inline comment documenting that this shadows `tui.editor.cursorLineEnd`; users who want the default back can remap via `~/.pi/agent/keybindings.json` and this extension will then only be reachable via `/edit`.

#### 3. Wire `/edit` no-arg
**File**: `pi/extensions/open-editor.ts`
**Changes**:
- Replace the Phase-2 placeholder: when `args` is empty, call `pickAndOpen(ctx)`.

#### 4. README / docs
**File**: `README.md` (top-level harness README) or `pi/extensions/README.md` if such a file exists
**Changes**: Add a short subsection documenting `/edit` and `ctrl+e`, the `$VISUAL`/`$EDITOR` resolution order, and the `ctrl+e` shadowing note.

### Success Criteria

#### Automated Verification
- [x] Extension registers both `edit` command and `ctrl+e` shortcut at load time — verified by clean startup under `pi -e`.
- [x] `manifest.json` updated with `extension/open-editor` entry so the installer ships the extension.

#### Manual Verification
- [ ] `ctrl+e` opens the file picker; picking a file launches the editor. *(Deferred.)*
- [ ] Escape / ctrl+c cancels the picker cleanly, returns to prompt. *(Deferred.)*
- [ ] `/edit` (no arg) opens the same picker. *(Deferred.)*
- [ ] Inside pi, pressing `ctrl+e` while typing in the editor no longer jumps to line-end (documented tradeoff); `end` still works. *(Deferred.)*
- [ ] Picker content matches `git ls-files` output inside this repo. *(Deferred.)*
- [ ] In a non-git directory (e.g. `/tmp/x`), the fallback walk produces a reasonable list and excludes `node_modules`. *(Deferred.)*

---

## Testing Strategy

### Unit-level
Extensions are small and heavily I/O-bound, so no dedicated test
harness is added. The logic that is worth isolating is
`resolveEditor` and the GUI-detection predicate — both are pure
functions. If a quick assertion is desired, export them and drop a
one-off `node --test` script under `pi/extensions/open-editor.test.ts`;
otherwise manual verification is sufficient.

### Integration / Manual
Matrix to run before merge:

| $VISUAL | $EDITOR | Expected |
|---|---|---|
| unset | unset | `vi` opens (terminal, blocking) |
| unset | `nvim` | nvim opens (terminal, blocking) |
| `nvim` | `code` | nvim wins (terminal, blocking) |
| unset | `code` | code opens (GUI, detached) |
| unset | `cursor` | cursor opens (GUI, detached) |
| unset | `nvim -R` | nvim read-only (terminal, blocking) — verifies argv splitting |
| unset | `bogus-editor-xyz` | error toast, pi still responsive |

Plus for each: run `/edit AGENTS.md`, `ctrl+e` → picker, and `/edit`
with no arg → picker.

### Regression
- Verify `bifrost.ts` and `subagent/` extensions still load alongside
  the new one (pi logs extension load failures at startup).
- Verify `pi/extensions/` auto-discovery picks up the new file with no
  manifest changes.

## References

- Pattern model: `~/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/interactive-shell.ts` (TUI suspend/spawn/resume)
- Extension API docs: `~/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`
  - `registerCommand` + `getArgumentCompletions`
  - `registerShortcut`
  - `ctx.ui.custom`, `ctx.ui.select`, `ctx.ui.notify`
- Keybindings conflict reference: `~/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/keybindings.md` (line 36, `tui.editor.cursorLineEnd`)
- Existing harness extensions for placement conventions: `pi/extensions/bifrost.ts`, `pi/extensions/subagent/`
