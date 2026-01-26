# Initialize Harness

Initialize the AI Engineering Harness in this repository.

## What This Command Does

1. Runs the built-in `/init` command to generate `AGENTS.md`
2. Creates the `thoughts/` directory structure for context engineering
3. Adds a ticket template for consistent ticket creation
4. Provides guidance on next steps

## Instructions

Load and follow the `init-harness` skill for detailed instructions on how to:

1. Check the current state of the repository
2. Run `/init` to generate AGENTS.md (the built-in codebase analysis command)
3. Create the thoughts/ directory structure
4. Add the ticket template
5. Optionally create a personal thoughts directory
6. Present next steps to the user

**Important**: The `/init` command is OpenCode's built-in command that analyzes the codebase and generates AGENTS.md. This `/init-harness` command wraps that functionality and adds the context engineering setup.

## Quick Reference

After running this command, the repository will have:

```
AGENTS.md                           # Codebase context (from /init)
thoughts/
├── shared/
│   ├── tickets/                    # Feature requests, bugs, tasks
│   │   └── ticket-template.md      # Template for new tickets
│   ├── plans/                      # Implementation plans
│   └── research/                   # Research documents
└── global/                         # Cross-repository concerns
```

## Workflow After Initialization

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```
