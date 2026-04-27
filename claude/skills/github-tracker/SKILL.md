---
name: github-tracker
description: >
  Query GitHub for pull requests, issues, notifications, and project boards using the gh CLI.
  Use this skill whenever the user asks about their GitHub activity, PRs needing review, open issues,
  project board status, or wants to summarize GitHub conversations. Trigger on phrases like: "what PRs
  need my attention", "show my open issues", "what's happening in [repo]", "summarize this PR",
  "check my GitHub notifications", "what's on my project board", "issues I own", "PRs I need to review",
  "what needs my attention on GitHub", "GitHub status", "show me PRs for [component]", "open issues
  in [org/repo]", or any reference to pull requests, issues, reviews, or GitHub project boards.
  Also trigger when the user wants to feed GitHub items into Todoist or another task manager — this
  skill surfaces the data, then the user can hand off to the Todoist skill.
---
 
# GitHub Tracker
 
Surface GitHub pull requests, issues, notifications, and project board items that need attention using the `gh` CLI.
 
## Read-Only Safety Constraint
 
This skill is strictly read-only. NEVER execute any `gh` command that creates, modifies, or deletes GitHub resources. This means:
 
**Allowed:** `gh search`, `gh pr view`, `gh issue view`, `gh pr checks`, `gh api` (GET requests), `gh api graphql` (queries only), `gh repo list`, `gh pr list`, `gh issue list`, `gh notification list`
 
**Forbidden:** `gh pr create`, `gh pr merge`, `gh pr close`, `gh pr edit`, `gh pr review`, `gh issue create`, `gh issue close`, `gh issue edit`, `gh pr comment`, `gh issue comment`, `gh api -X POST/PUT/PATCH/DELETE` (any mutating HTTP method), any GraphQL mutations, or any other command that writes data to GitHub.
 
If the user asks you to take an action on GitHub (merge a PR, comment on an issue, close something), tell them this skill is read-only and they should do it themselves in the GitHub UI or CLI.
 
## Prerequisites
 
The `gh` CLI must be installed and authenticated (`gh auth status` should succeed). All commands use `gh` — never raw `curl` with tokens.
 
Before running any commands, verify gh is available:
```bash
gh auth status
```
If this fails, tell the user to install and authenticate gh: https://cli.github.com/
 
## Getting the Current User
 
Never hardcode a username. Always resolve it dynamically:
```bash
gh api user --jq '.login'
```
Cache the result in a variable for the session.
 
## Core Workflows
 
### 1. PRs Needing My Attention
 
This is the most common ask. "Attention" means multiple things — combine these signals:
 
**a) Review requests (highest priority):**
```bash
gh search prs --review-requested=@me --state=open --json repository,title,number,url,updatedAt,labels --limit 50
```
 
**b) PRs where I'm mentioned or assigned:**
```bash
gh search prs --mentions=@me --state=open --json repository,title,number,url,updatedAt --limit 30
gh search prs --assignee=@me --state=open --json repository,title,number,url,updatedAt --limit 30
```
 
**c) My own PRs that have new activity (review comments, CI failures):**
```bash
gh search prs --author=@me --state=open --json repository,title,number,url,updatedAt,reviewDecision --limit 30
```
For these, `reviewDecision` tells you if changes were requested or if it's approved and ready to merge.
 
**d) GitHub notifications (catches things the above might miss):**
```bash
gh api notifications --jq '[.[] | select(.reason == "review_requested" or .reason == "mention" or .reason == "assign" or .reason == "ci_activity")] | sort_by(.updated_at) | reverse'
```
 
When presenting results, deduplicate across these sources and prioritize:
1. Review requests (someone is blocked on you)
2. Changes requested on your PRs (you're blocked)
3. Mentions and assignments
4. Other notifications
 
### 2. Issues by Component or Area
 
For large repos (like opentelemetry-collector-contrib), issues are often scoped to components via labels or file paths.
 
**By label (most reliable for OTel):**
```bash
gh search issues --repo=<org/repo> --label="<label>" --state=open --json title,number,url,updatedAt,labels,assignees --limit 50
```
In OpenTelemetry, component labels typically follow patterns like `receiver/github`, `receiver/gitlab`, `cmd/opampsupervisor`, etc.
 
**By text search (when labels aren't reliable):**
```bash
gh search issues --repo=<org/repo> --match=title,body "<search terms>" --state=open --json title,number,url,updatedAt,labels --limit 30
```
 
**Across multiple repos in an org:**
```bash
gh search issues --owner=<org> "<search terms>" --state=open --json repository,title,number,url,updatedAt --limit 50
```
 
When the user mentions components they own, search across relevant repos. If the user says "my components" without specifying, ask which components or repos they mean — don't guess.
 
### 3. GitHub Projects (v2)
 
GitHub Projects v2 uses GraphQL. Here's how to query a project by number within an org:
 
**Get project items with status:**
```bash
gh api graphql -f query='
query {
  organization(login: "<org>") {
    projectV2(number: <project_number>) {
      title
      items(first: 50) {
        nodes {
          id
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          content {
            ... on Issue {
              title
              number
              url
              state
              repository { nameWithOwner }
              assignees(first: 5) { nodes { login } }
            }
            ... on PullRequest {
              title
              number
              url
              state
              repository { nameWithOwner }
              assignees(first: 5) { nodes { login } }
            }
          }
        }
      }
    }
  }
}'
```
 
For pagination (>50 items), use the `after` cursor:
```bash
# Add to items(): after: "<endCursor>"
# And request: pageInfo { hasNextPage endCursor }
```
 
Group results by status column when presenting them to the user.
 
### 4. Summarizing PRs and Issues
 
When the user asks to summarize a specific PR or issue, fetch the full conversation:
 
**PR with all comments and reviews:**
```bash
gh pr view <number> --repo <org/repo> --json title,body,comments,reviews,reviewDecision,state,additions,deletions,files,labels,assignees,author
```
 
**Issue with comments:**
```bash
gh issue view <number> --repo <org/repo> --json title,body,comments,state,labels,assignees,author
```
 
When summarizing, focus on:
- What the PR/issue is about (from title + body)
- Key decisions or disagreements in the conversation
- Current status and blockers
- Action items (who needs to do what next)
- If it's a PR: scope of changes (files changed, additions/deletions)
 
Keep summaries concise and action-oriented. The user often wants to know "what do I need to do about this?" not a full replay of the conversation.
 
### 5. Cross-Repo Activity Dashboard
 
When the user wants a broad status check ("what's going on in OTel for me"), combine multiple queries:
 
1. Notifications (unread first)
2. PRs needing review
3. My open PRs and their review status
4. Recent activity on issues in areas I care about
 
Present as a structured overview, grouped by urgency. This is where the output becomes especially useful for Todoist handoff — the user can scan and say "put items 2, 5, and 7 in my Todoist."
 
## Output Formatting
 
Structure output for quick scanning and easy Todoist handoff:
 
- Group by category (review requests, my PRs, issues, project items)
- Within each group, sort by urgency/recency
- For each item include: repo, title, number, URL, and why it needs attention
- Use numbered lists so the user can reference items by number ("put 1-3 in Todoist")
- At the end, suggest which items seem most actionable
 
When the user says something like "add these to Todoist" or "track these in my tasks," acknowledge the items they selected and present them clearly. The Todoist skill will handle the actual task creation — this skill's job is to surface the right data in a clean format.
 
## Common Patterns
 
**Filtering by date range:**
Add `--updated=>YYYY-MM-DD` to `gh search` commands to limit to recent activity.
 
**Checking CI status on a PR:**
```bash
gh pr checks <number> --repo <org/repo>
```
 
**Listing repos in an org (useful for discovery):**
```bash
gh repo list <org> --limit 100 --json name,description
```
 
## Error Handling
 
- If `gh` is not found, tell the user to install it and link to https://cli.github.com
- If auth fails, suggest `gh auth login`
- If a repo is not found, double-check the org/repo format
- If rate-limited, inform the user and suggest waiting or reducing query scope
- GraphQL errors often mean a field name is wrong — check the GitHub GraphQL API docs
 
