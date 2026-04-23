# Add Pi Tool Support to AI Engineering Harness

## Overview
Add Pi (pi-coding-agent) as a fourth supported agentic tool in the harness, alongside Claude Code, OpenCode, and Gemini CLI. This includes creating the `pi/` directory with all agents, skills, prompts, and the subagent extension, then updating all harness infrastructure (`setup.sh`, `manifest.json`, `install.ts`, `AGENTS.md`, `README.md`).

## Current State Analysis
- The harness supports 3 tools: Claude Code, OpenCode, Gemini CLI
- Pi configuration lives at `~/.pi/agent/` with:
  - 6 shared agents (kebab-case) + 4 subagent-extension agents (`planner`, `reviewer`, `scout`, `worker`)
  - 15 skills as `skills/*/SKILL.md`
  - 13 prompts (Pi's equivalent of commands), 9 harness-specific + 3 subagent-extension + 1 duplicate (`otel_instrument` is both prompt and skill)
  - 1 extension: `subagent/` (2 TypeScript files: `index.ts`, `agents.ts`)
- All Pi content has diverged from other tools' versions (different frontmatter format, Pi-specific adjustments)
- Pi uses kebab-case naming (vs snake_case in other tools)
- Stow target: `~/.pi/agent/` (unique — other tools target `~/.claude/`, `~/.config/opencode/`, `~/.gemini/`)

## Desired End State
- `pi/` directory in the harness containing all Pi-specific configuration
- `./setup.sh pi` symlinks `pi/` → `~/.pi/agent/`
- `ai-harness --tool=pi` installs Pi config via the Deno installer
- All documentation reflects 4 supported tools
- Subagent extension included so multi-agent workflows work out of the box

### Verification
- `./setup.sh pi --dry-run` shows correct symlink targets
- `find pi/ -type f | wc -l` matches expected file count
- `manifest.json` is valid JSON with a `pi` tool entry
- `grep -c "pi" AGENTS.md README.md` shows Pi referenced throughout

## What We're NOT Doing
- ❌ `settings.json` — personal preferences (defaultProvider, defaultModel, etc.)
- ❌ `bifrost.ts` extension — deployment-specific custom provider
- ❌ Backporting Pi-unique agents/prompts to other tools
- ❌ Normalizing content across tools — each tool keeps its own diverged versions
- ❌ Adding MCP configuration for Pi (Pi doesn't use `.mcp.json`)

## Implementation Approach
Copy files from `~/.pi/agent/` into `pi/` directory, structured for GNU Stow to symlink into `~/.pi/agent/`. Include the subagent extension as real files (not symlinks). Update all harness infrastructure files.

---

## Phase 1: Create `pi/` Directory Structure

### Overview
Create the `pi/` directory with all agents, skills, prompts, and the subagent extension.

### Changes Required:

#### 1. Agents — `pi/agents/`
Copy 6 shared agents from `~/.pi/agent/agents/`:
- `codebase-analyzer.md`
- `codebase-locator.md`
- `codebase-pattern-finder.md`
- `thoughts-analyzer.md`
- `thoughts-locator.md`
- `web-search-researcher.md`

**Note**: The 4 subagent-extension agents (`planner.md`, `reviewer.md`, `scout.md`, `worker.md`) are NOT placed here — they ship with the subagent extension (Phase 1.4).

#### 2. Skills — `pi/skills/`
Copy 15 skills from `~/.pi/agent/skills/`:
- `codebase-analyzer/SKILL.md`
- `codebase-locator/SKILL.md`
- `codebase-pattern-finder/SKILL.md`
- `experimental-pr-workflow/SKILL.md`
- `git-commit-helper/SKILL.md`
- `init-harness/SKILL.md`
- `otel-collector/SKILL.md`
- `otel-instrument/SKILL.md`
- `otel-instrumentation/SKILL.md`
- `otel-ottl/SKILL.md`
- `otel-semantic-conventions/SKILL.md`
- `pr-description-generator/SKILL.md`
- `thoughts-analyzer/SKILL.md`
- `thoughts-locator/SKILL.md`
- `web-search-researcher/SKILL.md`

#### 3. Prompts — `pi/prompts/`
Copy 9 harness-specific prompts from `~/.pi/agent/prompts/`:
- `commit.md`
- `create_plan.md`
- `debug.md`
- `debug-k8s.md`
- `implement_plan.md`
- `init_harness.md`
- `otel_instrument.md`
- `research_codebase.md`
- `validate_plan.md`
- `worktree.md`

**Note**: The 3 subagent-extension prompts (`implement.md`, `implement-and-review.md`, `scout-and-plan.md`) are NOT placed here — they ship with the subagent extension (Phase 1.4).

#### 4. Subagent Extension — `pi/extensions/subagent/`
Copy the subagent extension as real files (not symlinks):
- `pi/extensions/subagent/index.ts` — Extension entry point (registers the `subagent` tool)
- `pi/extensions/subagent/agents.ts` — Agent discovery and configuration
- `pi/extensions/subagent/agents/planner.md` — Creates implementation plans
- `pi/extensions/subagent/agents/reviewer.md` — Code review specialist
- `pi/extensions/subagent/agents/scout.md` — Fast codebase recon
- `pi/extensions/subagent/agents/worker.md` — General-purpose subagent
- `pi/extensions/subagent/prompts/implement.md` — Full implementation workflow
- `pi/extensions/subagent/prompts/implement-and-review.md` — Worker implements, reviewer reviews
- `pi/extensions/subagent/prompts/scout-and-plan.md` — Scout + planner workflow

**Source**: Read from Pi npm package examples at `/Users/adriel/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/subagent/` (following the symlinks).

### Success Criteria:

#### Automated Verification:
- [x] `find pi/ -type f | wc -l` = 40 files (6 agents + 15 skills + 10 prompts + 9 extension files)
- [x] All files are real files, not symlinks: `find pi/ -type l | wc -l` = 0
- [x] Directory structure matches: `ls pi/` shows `agents/ extensions/ prompts/ skills/`

#### Manual Verification:
- [x] Spot-check a few files match their `~/.pi/agent/` counterparts

---

## Phase 2: Update `setup.sh`

### Overview
Add `pi` as a supported tool targeting `~/.pi/agent/`.

### Changes Required:
#### 1. `setup.sh`
**Changes**:
- Add `pi` case to `get_target_dir()` returning `$HOME/.pi/agent`
- Add `pi` to the `print_usage()` tool list
- Add `pi` to the `main()` case match: `opencode|claude|gemini|pi|all`
- Add `pi` to the `all` loop: `for t in opencode claude gemini pi`
- Add `pi` to the success message `all` loop

### Success Criteria:

#### Automated Verification:
- [x] `./setup.sh pi --dry-run` runs without error
- [x] `./setup.sh --help` shows `pi` in usage

#### Manual Verification:
- [x] `./setup.sh pi` targets correct directory `~/.pi/agent/`

---

## Phase 3: Update `manifest.json`

### Overview
Add the `pi` tool entry so the Deno installer (`install.ts`) can install Pi config.

### Changes Required:
#### 1. `manifest.json`
**Changes**: Add `"pi"` tool with:
- `"target": "~/.pi/agent"`
- Components for all agents, skills, prompts, and subagent extension files

### Success Criteria:

#### Automated Verification:
- [x] `cat manifest.json | python3 -m json.tool` validates JSON
- [x] `cat manifest.json | python3 -c "import json,sys; m=json.load(sys.stdin); assert 'pi' in m['tools']"`

---

## Phase 4: Update `install.ts`

### Overview
Add `pi` to the Deno installer's tool list.

### Changes Required:
#### 1. `install.ts`
**Changes**: Add `pi` wherever the other tool names are listed (help text, validation, `all` handling). The installer is manifest-driven, so the main work is in `manifest.json` (Phase 3).

### Success Criteria:

#### Automated Verification:
- [x] `grep -c '"pi"' install.ts` shows Pi referenced
- [x] `deno check install.ts` passes (if Deno available)

---

## Phase 5: Update Documentation

### Overview
Update `AGENTS.md`, `README.md`, and `CLAUDE.md` to reflect Pi as a fourth supported tool.

### Changes Required:

#### 1. `AGENTS.md`
**Changes**:
- Update supported tools list to include Pi
- Add `pi/` to repository structure
- Add Pi columns to Commands & Skills table
- Add Pi columns to Agents table
- Add Pi to MCP Configuration table (or note N/A)
- Add Pi tool-specific notes section
- Update setup command references

#### 2. `README.md`
**Changes**:
- Add Pi to Supported Tools list
- Add `ai-harness --tool=pi` to install examples
- Add Pi to `setup.sh` examples
- Add Pi row to Agents table
- Note Pi-specific concepts (prompts = commands, extensions, subagent)
- Add Pi to "Adding Agents" / "Adding Commands & Skills" customization sections

#### 3. `CLAUDE.md`
**Changes**: Update any references to "3 tools" or tool lists to include Pi

### Success Criteria:

#### Automated Verification:
- [x] `grep -i "pi" AGENTS.md | wc -l` > 10
- [x] `grep -i "pi" README.md | wc -l` > 10

#### Manual Verification:
- [x] Tables are properly formatted with Pi columns
- [x] No stale "3 tools" references remain

---

## Testing Strategy

### Stow Install Test
```bash
./setup.sh pi --dry-run    # Verify symlink targets
./setup.sh pi              # Actually install
ls -la ~/.pi/agent/agents/codebase-analyzer.md  # Should be symlink to repo
ls -la ~/.pi/agent/extensions/subagent/index.ts  # Should be symlink to repo
```

### Deno Installer Test
```bash
deno run -A install.ts --tool=pi --dry-run
```

### Manifest Validation
```bash
python3 -c "import json; json.load(open('manifest.json'))"
```

## References
- Pi documentation: `/Users/adriel/.nvm/versions/node/v23.11.0/lib/node_modules/@mariozechner/pi-coding-agent/README.md`
- Pi config location: `~/.pi/agent/`
- Subagent extension source: Pi npm package `examples/extensions/subagent/`
