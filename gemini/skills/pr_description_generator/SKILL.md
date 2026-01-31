---
name: pr_description_generator
description: Generates comprehensive pull request descriptions following repository templates. Utilizes Gemini CLI tools including `run_shell_command` for `git` and `gh` commands.
allowed-tools: read_file, run_shell_command, search_file_content, glob, replace, write_file
---

# PR Description Generator

## When to Use This Skill

Activate this skill when the user:
- Asks to "create a PR description" or "describe this PR"
- Says "generate PR description" or "write PR description"
- Mentions "pull request" in context of documenting changes
- Asks to "update PR description" for an existing PR

## Core Process

### Step 1: Locate the PR Description Template

**Check for template in standard locations**:
```bash
# Project-specific template
test -f thoughts/shared/pr_description.md && echo "Found"

# Alternative locations
test -f .github/pull_request_template.md && echo "Found"
test -f docs/pr_template.md && echo "Found"
```

**If no template exists**, offer to use a standard format or create one.

### Step 2: Identify the Pull Request

**Check current branch for associated PR**:
```bash
gh pr view --json url,number,title,state 2>/dev/null
```

**If no PR exists**, offer to describe changes for a new PR or list open PRs.

### Step 3: Gather Comprehensive PR Information

**Collect all PR context**:
```bash
# Full diff of changes
gh pr diff {number}

# Commit history
gh pr view {number} --json commits

# Metadata
gh pr view {number} --json url,title,number,state
```

**For new PRs (not yet created)**:
```bash
git diff main...HEAD
git log main..HEAD --oneline
git diff --name-only main...HEAD
```

### Step 4: Analyze Changes Thoroughly

**Deep analysis required** - Think carefully about:

1. **Code changes**: Read the entire diff, understand purpose and impact
2. **User-facing impact**: What will users notice? Breaking changes?
3. **Implementation details**: Technical approach and decisions
4. **Migration requirements**: Data migration, deployment steps

### Step 5: Handle Verification Requirements

**Process checklist items from template**:

1. **Identify automated checks**: `npm test`, `make build`, etc.
2. **Run what you can** and mark results
3. **Document what couldn't be completed**

### Step 6: Generate the Description

**Fill out each section from the template**:

```markdown
## Summary
[2-3 sentence overview of what this PR does and why]

## Problem
[What problem does this solve? Why is it needed?]

## Solution
[How does this PR solve the problem? Technical approach]

## Changes
- [Key change 1]
- [Key change 2]

## Breaking Changes
[List any breaking changes, or "None"]

## How to Verify It

### Automated Checks
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [ ] Manual: UI verification required

### Manual Testing
1. [Specific step to verify feature]
2. [Another verification step]

## Changelog Entry
`Added: [concise description for changelog]`
```

### Step 7: Save and Update PR

**Save the description**:
```bash
mkdir -p thoughts/shared/prs/
# Write to thoughts/shared/prs/{number}_description.md
```

**Apply to PR**:
```bash
gh pr edit {number} --body-file thoughts/shared/prs/{number}_description.md
```

## Quality Guidelines

### Be Thorough But Concise

**Good**:
```
Adds Redis-based rate limiting to all API endpoints to prevent abuse. 
Implements sliding window algorithm with configurable limits per user tier.
```

**Bad** (too vague):
```
Updates the API stuff to make it better.
```

### Focus on Why, Not Just What

**Good**:
```
Problem: Users reported inconsistent rate limiting across multiple API servers.

Solution: Migrated from in-memory to Redis-backed rate limiting to ensure 
consistent limits across all instances in the cluster.
```

### Highlight Breaking Changes

**Always explicitly call out breaking changes**:
```
## Breaking Changes

The `/auth/login` endpoint now requires the `client_id` parameter. 
Existing API clients must be updated to include this field.
```

### Include Verification Details

**Automated checks** (you can verify):
```
- [x] Unit tests pass: `npm test` (42 tests, 0 failures)
- [x] Build succeeds: `npm run build`
- [ ] Linting has warnings: `npm run lint` (3 warnings - non-blocking)
```

**Manual checks** (require human verification):
```
- [ ] Login form displays correctly in Chrome, Firefox, Safari
- [ ] Error messages are clear and user-friendly
```

## Common Patterns

### New Feature PR
```markdown
## Summary
Adds social authentication (Google, GitHub) to user login flow.

## Problem
Users requested faster login without creating new accounts.

## Solution
Implement's OAuth 2.0 integration with Google and GitHub.

## How to Verify
- [x] Tests pass: `npm test`
- [ ] Manual: Test Google login flow in browser
```

### Bug Fix PR
```markdown
## Summary
Fixes race condition causing duplicate webhook deliveries.

## Problem
Under high load, webhooks were occasionally delivered twice.

## Solution
Added distributed lock using Redis to ensure only one worker processes each event.
```

## Notes

- This skill adapts to any repository's PR template structure
- It preserves the thoughts/ directory pattern for saved descriptions
- Automated verification helps catch issues before review
- All PR operations use the GitHub CLI (`gh`) for consistency
