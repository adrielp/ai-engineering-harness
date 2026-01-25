# Validate Plan

You are tasked with validating that an implementation plan was correctly executed, verifying all success criteria and identifying any deviations or issues.

## Initial Setup

When invoked:
1. **Determine context** - Are you in an existing conversation or starting fresh?
2. **Locate the plan** - Use provided path or search `thoughts/plans/`
3. **Gather implementation evidence** via git history

## Validation Process

### Step 1: Context Discovery

1. **Read the implementation plan** completely
2. **Identify what should have changed**
3. **Spawn parallel research tasks** using:
   - **codebase-analyzer**: Verify implementation details
   - **codebase-locator**: Find modified files
   - **explore**: Check test coverage

### Step 2: Systematic Validation

For each phase:
1. **Check completion status** - Look for checkmarks
2. **Run automated verification** - Execute success criteria commands
3. **Assess manual criteria** - List what needs manual testing
4. **Think about edge cases**

### Step 3: Generate Validation Report

```markdown
## Validation Report: [Plan Name]

### Implementation Status
- Phase 1: [Name] - Fully implemented
- Phase 2: [Name] - Partially implemented (see issues)

### Automated Verification Results
- Build passes: `npm run build`
- Tests pass: `npm test`
- Linting issues: `npm run lint` (X warnings)

### Code Review Findings

#### Matches Plan:
- [What was implemented correctly]

#### Deviations from Plan:
- [What differs from plan]

#### Potential Issues:
- [Concerns discovered]

### Manual Testing Required:
1. [ ] Verify [feature] works
2. [ ] Test error states

### Recommendations:
- [Actionable next steps]
```

## Relationship to Other Commands

Recommended workflow:
1. `/create_plan` - Create implementation plan
2. `/implement_plan` - Execute the implementation
3. `/commit` - Create atomic commits
4. `/validate_plan` - Verify implementation correctness
5. Create PR

## Key Principles

1. **Understand Before Validating** - Read the entire plan first
2. **Be Objective and Critical** - Validate functionality, not just presence
3. **Verify Comprehensively** - Run all automated checks
4. **Communicate Clearly** - Provide specific file references
5. **Think Long-term** - Consider maintainability
