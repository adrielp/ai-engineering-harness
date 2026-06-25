---
name: diataxis-docs
description: >-
  Write, refactor, restructure, edit, or audit technical documentation using the
  Diátaxis framework (tutorials, how-to guides, reference, explanation). Produces
  clear, concise, scannable docs and fights the default tendency toward bloated,
  over-explained AI prose. Use this skill for ANY documentation work — README and
  CONTRIBUTING files, API/reference docs, runbooks, guides, getting-started pages,
  conceptual write-ups, docs-site content, or doc reviews — even when the user just
  says "document this," "write docs for X," "clean up these docs," "explain how this
  works in the docs," or "what's missing from our documentation." If the deliverable
  is documentation, reach for this skill rather than writing prose freehand.
---

# Diátaxis documentation

Documentation fails for two reasons this skill fixes: it mixes incompatible jobs in
one blob (teaching + instructing + describing + explaining), and it drowns the reader
in words. Diátaxis solves the first by separating documentation into four types, each
serving one need. The conciseness discipline below solves the second.

The whole approach is grounded in one idea: **the reader has a specific need right
now**, and a document serves exactly one of them well or several badly.

## The four types

| Type | Serves | Reader's question | Reader's situation |
|------|--------|-------------------|--------------------|
| **Tutorial** | Learning | "Teach me by doing" | Studying — a beginner, wants a guided lesson |
| **How-to guide** | A task | "How do I solve X?" | Working — competent, has a goal right now |
| **Reference** | Looking things up | "What exactly is X?" | Working — needs a fact, fast and certain |
| **Explanation** | Understanding | "Why / tell me about X" | Reflecting — away from the task, wants context |

## Step 1 — Pick the type with the compass

Before writing anything, run the compass. Ask two questions about the content:

1. Does it inform **action** (doing) or **cognition** (thinking)?
2. Does it serve the user's **acquisition** of skill (study) or **application** of skill (work)?

| Informs… | …serves… | → Type |
|----------|----------|--------|
| action | acquisition (study) | **Tutorial** |
| action | application (work) | **How-to guide** |
| cognition | application (work) | **Reference** |
| cognition | acquisition (study) | **Explanation** |

If you can't name the type, you can't write it well yet. The most common failure is
writing a how-to that keeps stopping to teach and explain — that's three documents
fighting in one. Name the type, then commit to it.

When you've picked the type, read the matching reference file for its authoring rules
and language patterns — don't write from memory:

- `references/tutorials.md`
- `references/how-to-guides.md`
- `references/reference.md`
- `references/explanation.md`

## Step 2 — One type per document

A document does one job. Don't fold explanation into a how-to, or reference into a
tutorial. When the reader needs another type, **link to it** instead of inlining it.
A how-to that needs to justify a choice says "we use HTTPS because it's more secure
(see [About transport security])" — one clause, then a link, not three paragraphs.

**When a file must combine types** (a README, a getting-started page, a single doc
the user can't split): split it into clearly separated sections, each a clean single
type, with headings that signal the type. Push toward real separation — propose
breaking a sprawling README into a short overview plus linked tutorial / how-to /
reference / explanation pages whenever the project is big enough to warrant it. Adapt
inside one file only when splitting isn't an option.

## Step 3 — Write it tight

This is where AI documentation usually goes wrong: it's correct but bloated, and the
reader has to mine three sentences to find the one fact they came for. Every extra
word is a tax on a reader who is mid-task and scanning. Terseness isn't a stylistic
preference here — it's what makes the document usable.

Write the draft, then do a dedicated cutting pass. Concrete tactics:

- **Lead with the answer.** Cut warm-up. Delete "In this section we will…", "It's
  worth noting that…", "As you may know…". Start with the fact or the first step.
- **One idea per sentence.** Short sentences scan. Break compound sentences apart.
- **Kill filler phrases.** "in order to" → "to". "is able to" → "can". "due to the
  fact that" → "because". "at this point in time" → "now". "a number of" → the number.
- **Cut empty hedges and intensifiers:** *simply, just, basically, actually, very,
  really, quite, of course, please note.* They add length and subtract authority.
- **Don't restate the heading.** If the heading is "Install the CLI," the first
  sentence is not "This section explains how to install the CLI."
- **Show, don't praise.** A command example beats a paragraph describing the command.
  Don't tell the reader something is "easy," "powerful," or "flexible" — show it.
- **Say it once.** No "as mentioned above," no summarizing what you just said.
- **Prefer imperative** for any instruction: "Run `x`." not "You'll want to run `x`."
- **Use the right shape.** Enumerable facts (flags, options, fields, errors) go in a
  table or list, not flowing prose. Steps go in a numbered list.

Rule of thumb: after the cutting pass, if removing a word doesn't lose meaning, it was
noise. Aim to cut 30–50% from a first AI draft and lose nothing.

## Step 4 — Markdown & repo conventions

Docs live in Markdown in repos and docs sites. So:

- **Title says exactly what the doc is.** "How to integrate APM" (not "Integrating
  APM," which hides whether it's *how* or *whether*; not "APM," which hides everything).
  Tutorials and how-tos start with a verb. Reference titles name the thing. Explanation
  titles read naturally with an implicit "About…" in front.
- **One `#` H1 per file**, matching the title. Use `##`/`###` for structure.
- **Code in fenced blocks** with a language tag. Inline code for identifiers, paths,
  flags, commands.
- **Real, runnable examples** over invented placeholders where you can manage it.
- When editing an existing file, **match its surrounding conventions** (heading style,
  voice, formatting) unless they're the thing you're fixing.

## Working modes

**Create a new doc** → compass → read the type's reference file → draft → cut → check.

**Refactor / audit existing docs** → first classify what's there: which paragraphs are
tutorial, how-to, reference, explanation? Name the mixing problems out loud. Then
propose a structure (usually: split by type into separate sections or files) before
rewriting. Show the reader the plan, then execute.

**Edit / tighten a doc** → identify its intended type, flag anything that belongs to a
different type (offer to move or link it out), then run the Step 3 cutting pass.

## Before you finish — self-check

- Can you name this document's single type? If not, it's still mixed.
- Did any other type sneak in? Move it out or link to it.
- Did you run the cutting pass? Re-read the first sentence of each section — is it
  doing work, or warming up?
- Does the title say exactly what the doc is and does?
- Could a reader mid-task find what they need by scanning, without reading prose?
