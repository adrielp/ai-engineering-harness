# Git Worktree Manager

## Conventions

**Branch naming**:
- Ticket path → strip dir + `.md`, prefix `feature/`: `thoughts/shared/tickets/add-auth.md` → `feature/add-auth`
- Plain name → prefix `feature/` unless already prefixed (`fix/`, `chore/`, etc.)

**Worktree location**: `<repo-root>/../<repo-name>-worktrees/<branch-name>` (sibling dir, outside main repo)

**Default branch detection** — never hardcode `main`:
```bash
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||') || DEFAULT_BRANCH="main"
```

## Subcommand Dispatch

Parse the first argument. If none provided, print:

```
/worktree create <name|ticket-path>  — Create worktree + branch
/worktree list                       — All worktrees with dirty status
/worktree status                     — Detailed view (commits, ahead/behind)
/worktree remove <name>              — Remove with safety checks

Examples:
  /worktree create auth-refactor
  /worktree create thoughts/shared/tickets/add-auth.md
```

---

## `create`

1. **Resolve branch name** using naming conventions above. If argument is a ticket path, read the ticket for context.

2. **Check conflicts** — run in parallel:
   ```bash
   git branch --list "<branch-name>"
   git worktree list
   ```
   If branch exists but has no worktree → offer `git worktree add <path> <existing-branch>` (no `-b`).
   If worktree already exists at path → show its location, ask if user wants to `cd` there instead.

3. **Create**:
   ```bash
   REPO_ROOT=$(git rev-parse --show-toplevel)
   REPO_NAME=$(basename "$REPO_ROOT")
   WORKTREE_PATH="$REPO_ROOT/../${REPO_NAME}-worktrees/<branch-name>"
   mkdir -p "$(dirname "$WORKTREE_PATH")"
   git worktree add "$WORKTREE_PATH" -b <branch-name>
   ```

4. **Output**: Branch, path, base ref, `cd` command. If from ticket, include ticket path.

---

## `list`

Quick overview of all worktrees.

```bash
git worktree list --porcelain
```

**Porcelain format** — each worktree is a block separated by blank lines:
```
worktree /path/to/dir
HEAD <sha>
branch refs/heads/<name>
```

For each worktree, also check: `git -C <path> status --porcelain`

Present as a compact table: **Path | Branch | Status** (clean / N modified / N untracked).
Proactively flag any worktree with uncommitted work.

---

## `status`

Extended `list` — for each worktree, additionally gather:
- Last commit: `git -C <path> log --oneline -1`
- Ahead/behind: `git -C <path> rev-list --left-right --count $DEFAULT_BRANCH...<branch>`

Present per-worktree blocks with all fields.

---

## `remove`

1. **Match worktree** by name — fuzzy match against branch names (strip `feature/`, `fix/`, etc. prefixes when matching user input).

2. **Check dirty state**: `git -C <path> status --porcelain`
   - If dirty → show the file list, warn changes will be LOST, require explicit confirmation.
   - **Never pass `--force`** without user consent.

3. **Remove**:
   ```bash
   git worktree remove <path>
   git worktree prune  # clean stale metadata
   ```

4. **Branch cleanup** — check `git branch --merged $DEFAULT_BRANCH | grep <branch>`:
   - Merged → offer `git branch -d <branch>`
   - Not merged → inform user the branch is retained
