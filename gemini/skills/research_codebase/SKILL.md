---
name: research_codebase
description: Conduct comprehensive codebase research by delegating to parallel sub-agents and synthesizing findings using Gemini CLI tools.
disable-model-invocation: true
allowed-tools: read_file, write_file, run_shell_command, search_file_content, glob, write_todos, delegate_to_agent, google_web_search, web_fetch
---

# Research Codebase

You are tasked with conducting comprehensive research across the codebase to answer user questions by spawning parallel sub-agents and synthesizing their findings.

## Initial Setup:

When this command is invoked, respond with:
```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

## Steps to follow after receiving the research query:

1. **Read any directly mentioned files first:**
   - If the user mentions specific files, read them FULLY first
   - Read these files yourself before spawning sub-tasks

2. **Analyze and decompose the research question:**
   - Break down the query into composable research areas
   - Create a research plan using TodoWrite

3. **Spawn parallel sub-agent tasks:**
   
   **For codebase research:**
   - Use `codebase_locator` to find WHERE files and components live
   - Use `codebase_investigator` to understand HOW specific code works
   - Use `codebase_pattern_finder` for examples of similar implementations

   **For thoughts directory:**
   - Use `thoughts_locator` to discover what documents exist
   - Use `thoughts_analyzer` to extract key insights from documents

   **For web research (only if explicitly asked):**
   - Use `web_search_researcher` for external documentation

4. **Wait for all sub-agents to complete and synthesize findings**

5. **Generate research document** at `thoughts/research/YYYY-MM-DD_topic.md`:

```markdown
---
date: [ISO date with timezone]
researcher: [Your name]
topic: "[Research Question]"
tags: [research, relevant-tags]
status: complete
---

# Research: [Topic]

## Research Question
[Original user query]

## Summary
[High-level findings]

## Detailed Findings

### [Component/Area 1]
- Finding with reference (`file.ext:line`)
- Implementation details

## Code References
- `path/to/file.py:123` - Description

## Architecture Insights
[Patterns and design decisions discovered]

## Historical Context (from thoughts/)
[Relevant insights from thought documents]

## Open Questions
[Areas needing further investigation]
```

6. **Present findings to the user**

## Important notes:
- Always delegate to parallel sub-agents for efficiency
- Always run fresh codebase research
- Focus on finding concrete file paths and line numbers
- Read files FULLY before spawning sub-tasks
- Wait for ALL sub-agents before synthesizing
