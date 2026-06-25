# How-to guides — authoring guide

**A how-to guide is a recipe.** It is goal-oriented: it guides a competent user through
the actions needed to solve a specific real-world problem. The reader is working, knows
what they want, and can follow instructions. Your job is to get them there.

## What a how-to guide is and is not

- **Is:** directions for achieving a specific goal — "How to configure reconnection
  back-off," "How to add a column with profit margin."
- **Is not:** a tutorial (that teaches a beginner) and not a tour of a tool's features.
  "How to build a web application" is too open-ended to be a how-to — that's a whole
  field of skill, not a goal.

**Write from the user's goal, not the machinery's motions.** "To deploy the config,
select options and press Deploy" is useless — it just narrates buttons. What the user
actually needs is "which config options match which real-world needs." A how-to answers
to a human project, not to a feature list.

## Key principles

- **Maintain focus on the goal.** Action and only action. No teaching, no digression,
  no explaining for completeness. If something matters but isn't action, link to it.
- **Assume competence.** The reader knows what they want and can follow you. You don't
  need to explain the power switch.
- **Omit the unnecessary; usability beats completeness.** Unlike a tutorial, a how-to
  doesn't have to be end-to-end. Start and end at sensible points and let the reader
  join it to their own work.
- **Address real-world complexity.** A guide that works only for one narrow case is
  rarely useful. Leave room for the reader to adapt — conditional branches, judgement
  calls. Solving a real problem isn't always a clean linear procedure.
- **Describe a logical sequence.** Order steps by necessity (Y needs X first) and by
  what sets up the reader's thinking best.
- **Seek flow.** Ground the sequence in how the user actually works and thinks. Avoid
  needless context-switching. The best how-to anticipates the user — the next tool is
  already in their hand.
- **Name it for exactly what it does.** "How to integrate APM" — starts with "How to,"
  names the goal. Not "Integrating APM" (is it *how* or *whether*?), not "APM" (what
  even is this doc?).

## Language patterns

- "This guide shows you how to…" — state the problem the guide solves.
- "If you want X, do Y. To achieve W, do Z." — conditional imperatives for branches.
- "For the full list of options, see the [X reference]." — link out; don't inline
  reference material.

## Smells that mean it's wrong

- It stops to teach or explain → strip it; link to tutorial/explanation.
- It lists every option exhaustively → that's reference; link to it.
- It narrates the machinery ("press the button") → reframe around the user's purpose.
- The title hides what it delivers → rename it to start with the concrete goal.
