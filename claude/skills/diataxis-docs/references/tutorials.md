# Tutorials — authoring guide

**A tutorial is a lesson.** It is learning-oriented: a guided, practical experience
through which a beginner learns by doing. Its success is measured by what the learner
*gains*, not by what they produce. The reader is studying, not working.

## What a tutorial is and is not

- **Is:** a complete, end-to-end, hand-held journey that works every single time.
- **Is not:** a how-to guide. A how-to serves a competent user trying to get a real
  job done; a tutorial serves a beginner who needs to build confidence and familiarity.
  Conflating the two is the single most common documentation mistake.

The teacher carries almost all the responsibility. The learner's only job is to follow
along. So the experience must be *meaningful* (a sense of achievement), *successful*
(they can actually complete it), *logical* (the path makes sense), and *complete enough*
that they meet every tool and concept they need to become familiar with.

## Key principles

- **Don't try to teach — let learning happen.** Give the learner things to *do*. They
  learn from the activity, not from your explanations.
- **Show the destination up front.** "In this tutorial we'll build and deploy a small
  web app." Not the presumptuous "you will learn…".
- **Visible results early and often.** Every step should produce something the learner
  can see and recognize as progress. That's how they connect cause to effect.
- **Narrate expectations.** "After a few seconds, the server responds with…" and "If you
  don't see X, you probably skipped Y." This reassures them they're on the right path.
- **Ruthlessly minimise explanation.** This is the hardest discipline. The learner is
  focused on doing; explanation breaks the spell. One clause is enough: "We use HTTPS
  because it's more secure." Then link to the full explanation. Don't expand on it here.
- **Stay concrete.** *This* step, *this* command, *this* result. The general patterns
  will emerge in the learner's mind on their own — your job is the concrete path.
- **Ignore options and alternatives.** No "you could also…". Pick the one path that
  reaches the goal and stick to it. This keeps the tutorial short and the learner calm.
- **Aspire to perfect reliability.** You're absent when they run it, so it must work for
  everyone, every time. Test it on real beginners; that's the only way to find the gaps.

## Language patterns

- "We…" — first person plural; you're in it together.
- "First, do X. Now do Y. Now that Y is done, do Z." — no ambiguity.
- "The output should look something like…" — set expectations.
- "Notice that…", "Remember that…" — point out what they should observe.
- "You've now built a working X." — name what they accomplished.

## Smells that mean it's not a tutorial (or is doing it wrong)

- It explains *why* at length → that's explanation; link out instead.
- It offers choices and alternatives → that's a how-to or reference mindset.
- It assumes competence or skips steps → it's actually a how-to guide.
- It's not reproducible end-to-end → it will destroy the beginner's confidence.
