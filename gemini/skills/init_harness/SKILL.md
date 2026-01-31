---
name: init_harness
description: Initialize the AI Engineering Harness in a repository by creating the `thoughts/` directory structure for Gemini CLI.
disable-model-invocation: true
allowed-tools: read_file, write_file, run_shell_command
---

# Initialize Harness

Initialize the AI Engineering Harness in this repository.

## What This Command Does

1. Creates the `thoughts/` directory structure for context engineering.
2. Adds a ticket template for consistent ticket creation.
3. Provides guidance on next steps.

## Instructions

Follow these steps to initialize the harness:

1. **Check the current state of the repository**
    - Verify if thoughts/ directory exists

2. **Create the thoughts/ directory structure**:
    ```bash
    mkdir -p thoughts/shared/{tickets,plans,research}
    mkdir -p thoughts/global
    ```

3. **Add the ticket template** to `thoughts/shared/tickets/ticket-template.md`

4. **Optionally create a personal thoughts directory**:
    - Check if personal directory exists
    - Check if all directories within personal exist (tickets, plans, research)
    ```bash
    mkdir -p thoughts/$(whoami)/{tickets,plans,research}
    ```

5. **Present next steps to the user**



## Quick Reference

After running this command, the repository will have:

```
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
