---
name: experimental_pr_workflow
description: Handles experimental features that lack proper ticketing by retroactively creating Linear tickets and PRs from commits. Utilizes `git` and `gh` commands via Gemini CLI's `run_shell_command` to formalize experimental work.
allowed-tools: read_file, run_shell_command, search_file_content, glob, write_file
---

# Experimental PR Workflow

## When to Use This Skill

Activate this skill when:
- User mentions "founder mode" or references rapid experimentation
- User has made commits without associated tickets
- User asks to "formalize experimental work" or "create ticket for this"
- You detect commits on a feature branch without ticket references
- User asks to "clean up" or "properly document" exploratory work

This skill helps transition from rapid prototyping to proper workflow hygiene.

## The Problem This Solves

Sometimes you need to move fast and experiment without the overhead of creating tickets and planning docs first. This is great for exploration, but eventually you need to:
1. Document what you built and why
2. Create a proper ticket for tracking
3. Get the work into a reviewable PR
4. Follow the team's standard workflow

This skill handles that transition retroactively.

## Core Process

### Step 1: Verify Commit Exists

**Check recent commits**:
```bash
git log --oneline -5
```

**If no recent commits**, help create one first or review current changes.

### Step 2: Understand What Was Built

**Gather context from the commit**:
```bash
git show --stat HEAD
git show HEAD
```

**Analyze the changes**:
- What files were modified?
- What functionality was added/changed?
- What problem does this solve?
- What technical decisions were made?

### Step 3: Create Ticket (if using a ticket system)

Create a ticket describing the work:

```markdown
## Problem to Solve
[Describe the user need or pain point from a user perspective]

## Proposed Solution
[Describe what you implemented]
[Explain the technical approach taken]

## Implementation Notes
- [Key file/component modified]
- [Technical decision made]

## References
- Commit: [SHA]
- Branch: [current branch name]
```

**Important**: You MUST gather a "Problem to Solve" - don't just document implementation.

### Step 4: Create Proper Git Branch

**Ensure you're on main first**:
```bash
git checkout main
```

**Create the new branch with proper naming**:
```bash
git checkout -b [TICKET-ID]-[description]
```

**Cherry-pick your experimental commit(s)**:
```bash
git cherry-pick [COMMIT_SHA]
```

### Step 5: Push and Create PR

**Push the branch to remote**:
```bash
git push -u origin [BRANCH_NAME]
```

**Create the pull request**:
```bash
gh pr create --fill
```

### Step 6: Generate PR Description

Hand off to the `pr-description-generator` skill to create a comprehensive PR description.

## Key Principles

### 1. Problem-First Thinking
Even though the solution is already implemented, focus on articulating the problem clearly.

**Bad**:
```
Problem: Need Redis caching
Solution: Added Redis caching
```

**Good**:
```
Problem: Dashboard loads take 3-5 seconds due to repeated database queries. 
Users report slow experience especially during peak hours.

Solution: Implemented Redis-based caching for frequently accessed dashboard 
data with 5-minute TTL. Reduces response times to under 500ms.
```

### 2. Preserve Git History
Always use `cherry-pick` to move commits to the new branch, never rewrite history with rebase unless absolutely necessary.

### 3. Clean Transition
The goal is to make it look like proper process was followed:
- Ticket exists and is tracked
- Branch name follows convention
- PR has comprehensive description
- All verification steps are documented

### 4. Don't Skip Understanding
Even if the code is already written, take time to understand:
- What problem it solves
- Why this approach
- What the tradeoffs are
- How it impacts users

## Variations and Edge Cases

### Multiple Experimental Commits
```bash
git log main..HEAD --oneline
git checkout main
git checkout -b [BRANCH_NAME]
git cherry-pick [FIRST_SHA]^..[LAST_SHA]
```

### Already on Feature Branch (poorly named)
```bash
git checkout main
git checkout -b [NEW_BRANCH_NAME]
git cherry-pick main..[OLD_BRANCH_NAME]
git push -u origin [NEW_BRANCH_NAME]
```

### No Ticket System
Skip ticket creation, focus on proper branch naming and PR description.

## Success Criteria

You've succeeded when:
- Ticket exists with clear problem statement (if using ticket system)
- Branch name follows team convention
- PR is created and linked to ticket
- PR has comprehensive description
- Commit history is preserved correctly
- Everything is pushed to remote

## Notes

- This skill enables fast iteration while maintaining eventual consistency with process
- It's a "get out of jail free" card for exploratory work
- Don't abuse it - proper planning upfront is still better when possible
- The skill automates the tedious cleanup work of formalizing experiments
