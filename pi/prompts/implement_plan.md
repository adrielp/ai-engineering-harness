---
description: Implement Plan
---
# Implement Plan

You are tasked with implementing an approved technical plan from `thoughts/plans/`. These plans contain phases with specific changes and success criteria.

**Directory Structure:**
- `thoughts/tickets/` - Original feature requests and task descriptions
- `thoughts/plans/` - Implementation plans (the files you'll be executing)
- `thoughts/research/` - Supporting research and investigation notes

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Implementation Philosophy

Follow the plan's intent while adapting to reality: implement each phase fully before the next, verify your work fits the broader codebase, update checkboxes as you go, and don't get stuck on minor details.

If you encounter a mismatch:
- STOP and present the issue clearly:
  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Verification Approach

After implementing a phase:

### 1. Run Success Criteria Checks

Use technology-appropriate commands:

**Node.js/JavaScript**: `npm test`, `npm run lint`, `npm run build`
**Python**: `pytest`, `black --check .`, `mypy .`
**Go**: `go test ./...`, `golangci-lint run`, `go build`
**Rust**: `cargo test`, `cargo clippy`, `cargo build`
**Make-based**: `make test`, `make lint`, `make build`

### 2. Fix Issues and Update Progress

- Address any failures before moving to the next phase
- Update checkboxes in the plan file using the Edit tool
- Update your TodoWrite list

## If You Get Stuck

1. **Investigate First** - Read all relevant code completely
2. **Use Sub-tasks** for targeted help:
   - **codebase-locator**: Find specific files
   - **codebase-analyzer**: Understand how code works
   - **codebase-pattern-finder**: Find similar implementations
3. **Present Issues Clearly** - Don't guess, ask for clarification

## Resuming Work

If the plan has existing checkmarks:
- Trust that completed work is done correctly
- Pick up from the first unchecked item
- Verify previous work only if something seems off
