# Fix Deno Installer Review Issues

## Overview

Address the issues identified in the PR #2 code review. The fixes target four
areas: broken diff rendering, fragile stdin handling, risky default config
overwrites, and graceful handling of unknown skill names.

## Current State Analysis

- `renderDiff` compares lines by index — an insertion at line 1 causes every
  subsequent line to appear changed. Produces misleading output on real conflicts.
- `promptConfirm` reads a 1-byte buffer, leaving the newline in stdin. On
  multi-file conflicts the leftover newline auto-answers the next prompt.
- `interactivePicker` reads into a fixed 1024-byte buffer with similar leftover
  issues and no TTY detection.
- `settings.json` and `.mcp.json` are in the default "settings" component — a
  fresh install silently overwrites a user's existing Claude/OpenCode config.
- Unknown `--skill` values cause an immediate `Deno.exit(1)`, aborting the
  entire install even if other requested skills are valid.
- The plan doc (`01-deno-install-support.md`) references `@std/diff` and
  `@cliffy/prompt` but neither was used in the implementation.

## Desired End State

1. Diffs shown during conflict resolution are correct (LCS-based).
2. Stdin prompts consume full lines, no leftover bytes bleed into subsequent
   reads.
3. `settings.json` / `.mcp.json` are excluded from default installs; users must
   opt in via `--skill=settings` or `--yes`.
4. Unknown skill names produce a warning but don't abort — valid skills still
   install.
5. Plan doc updated to reflect the actual implementation.

## What We're NOT Doing

- Not adding `@cliffy/prompt` — the simple number-picker UX is fine.
- Not adding `deno.json` / `deno.lock`.
- Not adding automated tests (matches the existing testing strategy).
- Not changing the README (the `...` shorthand examples are acceptable as
  human-readable pseudocode).

## Implementation Approach

All changes are in `install.ts` (plus a plan doc update). Four targeted fixes,
each independently verifiable.

---

## Phase 1: Fix diff rendering with LCS algorithm

### Overview

Replace the naive index-based diff with a proper LCS (longest common
subsequence) diff. Use `jsr:@std/diff` which is already referenced in the plan
and is a zero-cost Deno std import.

### Changes Required

#### 1. Add import

**File**: `install.ts`

Add at the top imports:
```typescript
import { diffLines } from "jsr:@std/diff@1/diff-lines";
```

#### 2. Replace `renderDiff`

**File**: `install.ts` (lines 110-123)

Replace the current implementation with one that uses `diffLines`:

```typescript
function renderDiff(oldText: string, newText: string): string {
  const result = diffLines(oldText, newText);
  const lines: string[] = [];
  for (const part of result) {
    const prefix = part.type === "added" ? "+" : part.type === "removed" ? "-" : " ";
    for (const line of part.details ?? []) {
      lines.push(`${prefix} ${line.value}`);
    }
  }
  return lines.join("");
}
```

If `diffLines` API shape differs from expected, fall back to importing
`diff` from `jsr:@std/diff@1` and using the token-level API with
line-split input.

### Success Criteria

#### Manual Verification:
- [x] Modify a dest file by inserting a line at the top; run installer without `--yes`; diff correctly shows only the inserted line, not every subsequent line as changed
- [x] Modify a dest file by deleting a line from the middle; diff shows the deletion correctly

---

## Phase 2: Fix stdin handling in promptConfirm and interactivePicker

### Overview

Read full lines from stdin instead of fixed-byte buffers. This prevents leftover
newlines from bleeding into subsequent prompts.

### Changes Required

#### 1. Add a line-reading helper

**File**: `install.ts`

Add a helper that reads a full line from stdin:

```typescript
async function readLine(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(1);
  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;
    if (buf[0] === 10) break; // newline
    chunks.push(buf.slice());
  }
  return decoder.decode(new Uint8Array(chunks.flatMap((c) => [...c]))).trim();
}
```

#### 2. Update `promptConfirm`

**File**: `install.ts` (lines 125-130)

```typescript
async function promptConfirm(message: string): Promise<boolean> {
  Deno.stdout.writeSync(new TextEncoder().encode(`${message} [y/N] `));
  const input = await readLine();
  return input === "y" || input === "Y";
}
```

#### 3. Update `interactivePicker`

**File**: `install.ts` (lines 206-225)

Replace the 1024-byte buffer read with `readLine()`:

```typescript
async function interactivePicker(components: Array<{ name: string; description: string }>): Promise<string[]> {
  console.log("\nAvailable components (enter numbers separated by spaces, or 'all'):\n");
  components.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${c.name}] ${c.description}`);
  });
  console.log();

  Deno.stdout.writeSync(new TextEncoder().encode("Select (e.g. 1 3 5, or 'all'): "));
  const input = await readLine();

  if (input.toLowerCase() === "all") {
    return components.map((c) => c.name);
  }

  const indices = input.split(/\s+/).map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= components.length);
  return indices.map((i) => components[i - 1].name);
}
```

### Success Criteria

#### Manual Verification:
- [x] Create two conflicting files; run installer without `--yes`; answering `n` to the first prompt does NOT auto-answer the second prompt
- [x] Interactive picker accepts input and returns correct selection
- [x] Piped input (`echo "1 3" | deno run ...`) works correctly

---

## Phase 3: Protect user-specific config files from silent overwrite

### Overview

The `settings` component contains `settings.json` and `.mcp.json` which are
highly user-specific. Default installs should warn about these files and require
explicit opt-in.

### Changes Required

#### 1. Add a warning for the settings component

**File**: `install.ts`, in `installTool` function

When installing the `settings` component and `--yes` is not set and no explicit
`--skill` filter was provided, print a warning and prompt before proceeding:

```typescript
// Before processing files for a component, check if it's the settings component
if (comp.name === "settings" && !opts.yes && opts.skills.length === 0) {
  console.log(`\n  ⚠ The "settings" component contains tool-specific config files`);
  console.log(`    (settings.json, .mcp.json) that may overwrite your existing settings.`);
  if (!opts.dryRun) {
    const ok = await promptConfirm(`  Install settings component?`);
    if (!ok) {
      console.log("  Skipped settings component.");
      skipped += comp.files.length;
      continue;
    }
  }
}
```

This approach:
- Still installs settings if explicitly requested via `--skill=settings`
- Still installs settings with `--yes` (user opted in to everything)
- Warns and prompts in the default "install all" flow

### Success Criteria

#### Manual Verification:
- [x] `--tool=claude` (no --skill, no --yes) prompts before installing settings component
- [x] `--tool=claude --skill=settings` installs settings without the extra prompt
- [x] `--tool=claude --yes` installs settings without the extra prompt
- [x] `--tool=claude --dry-run` shows the warning but skips the prompt

---

## Phase 4: Graceful handling of unknown skill names

### Overview

When a user provides `--skill=typo,valid-skill`, the installer should warn about
`typo` but still install `valid-skill` instead of aborting entirely.

### Changes Required

#### 1. Change error to warning in `installTool`

**File**: `install.ts` (lines 258-263)

Replace the `Deno.exit(1)` block:

```typescript
if (opts.skills.length > 0) {
  selectedComponents = allComponents.filter((c) => opts.skills.includes(c.name));
  const unknown = opts.skills.filter((s) => !allComponents.find((c) => c.name === s));
  if (unknown.length > 0) {
    console.warn(`  Warning: unknown components for ${toolName}: ${unknown.join(", ")}`);
    console.warn(`  Available: ${allComponents.map((c) => c.name).join(", ")}`);
  }
  if (selectedComponents.length === 0) {
    console.error(`  No valid components matched. Skipping ${toolName}.`);
    return;
  }
}
```

### Success Criteria

#### Manual Verification:
- [x] `--skill=typo` warns and skips (no crash)
- [x] `--skill=typo,agents` warns about `typo` but installs `agents`
- [x] `--skill=agents` installs normally with no warning

---

## Phase 5: Update plan doc to reflect actual implementation

### Overview

The original plan (`01-deno-install-support.md`) references `@cliffy/prompt`
and `@std/diff` as imports, but the implementation used a custom picker and
naive diff. Update to reflect what was actually built (plus the `@std/diff`
addition from Phase 1).

### Changes Required

#### 1. Update design decisions table

**File**: `thoughts/adriel/plans/01-deno-install-support.md`

- Change "Interactive UX" row from `@cliffy/prompt` to
  "Custom number-picker via stdin (no external dependency)"
- Change "Diff library" row from `@std/diff` to
  "`@std/diff` (diffLines) — added in follow-up fix"

#### 2. Update imports section

Same file — update the listed imports to match actual `install.ts` imports.

### Success Criteria

- [x] Plan doc accurately describes what is implemented

---

## Testing Strategy

All testing is manual (consistent with the project's existing approach):

1. **Diff correctness**: Insert/delete lines in a dest file, verify diff output
2. **Stdin safety**: Multiple conflicts in sequence, verify no auto-answering
3. **Settings protection**: Default install prompts for settings component
4. **Unknown skills**: Typo in --skill flag warns but doesn't crash
5. **Regression**: Full `--tool=claude --dry-run` still works end-to-end

## References

- PR: https://github.com/adrielp/ai-engineering-harness/pull/2
- Original plan: `thoughts/adriel/plans/01-deno-install-support.md`
- `@std/diff` API: https://jsr.io/@std/diff
