---
name: debug
description: Debug issues during manual testing or implementation by examining logs, state, and git history
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
---

# Debug

You are tasked with helping debug issues during manual testing or implementation. This command allows you to investigate problems by examining logs, state, and git history without editing files.

## Initial Response

When invoked WITH a context file:
```
I'll help debug issues with [file name]. Let me understand the current state.

What specific problem are you encountering?
- What were you trying to test/implement?
- What went wrong?
- Any error messages?

I'll investigate the logs, state, and git history to help figure out what's happening.
```

When invoked WITHOUT parameters:
```
I'll help debug your current issue.

Please describe what's going wrong:
- What are you working on?
- What specific problem occurred?
- When did it last work?

I can investigate logs, state, and recent changes to help identify the issue.
```

## Process Steps

### Step 1: Understand the Problem

1. **Read any provided context** (plan or ticket file)
2. **Quick state check**:
   - Current git branch and recent commits
   - Any uncommitted changes

### Step 2: Investigate the Issue

Spawn parallel Task agents:

```
Task 1 - Check Recent Logs:
Find and analyze logs for errors
Return: Key errors/warnings with timestamps
```

```
Task 2 - Application State:
Check the current application state
Return: Relevant state findings
```

```
Task 3 - Git and File State:
Understand what changed recently
Return: Git state and any file issues
```

### Step 3: Present Findings

```markdown
## Debug Report

### What's Wrong
[Clear statement of the issue]

### Evidence Found

**From Logs**:
- [Error/warning with timestamp]

**From Application State**:
- [Finding from state]

**From Git/Files**:
- [Recent changes that might be related]

### Root Cause
[Most likely explanation]

### Next Steps

1. **Try This First**:
   ```bash
   [Specific command or action]
   ```

2. **If That Doesn't Work**:
   - [Alternative approach]

### Can't Access?
Some issues might be outside my reach:
- Browser console errors
- External service state
- System-level issues

Would you like me to investigate something specific further?
```

## Important Notes

- **Focus on manual testing scenarios**
- **Always require problem description**
- **Read files completely**
- **Guide back to user** for things outside reach
- **No file editing** - Pure investigation only
