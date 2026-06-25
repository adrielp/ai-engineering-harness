# Explanation — authoring guide

**Explanation is a discussion** that you'd read away from the keyboard. It is
understanding-oriented: it deepens and contextualizes, and permits reflection. It
answers "Can you tell me about…?" / "Why is it like this?" The reader is studying, not
mid-task. It's the one doc type you could read in the bath.

## What explanation is and is not

- **Is:** background, context, design rationale, history, trade-offs, the bigger
  picture, weighing of alternatives. "About authentication," "Why we chose event
  sourcing."
- **Is not:** instruction (how-to), a lesson (tutorial), or fact-listing (reference).
  Its perspective is higher and wider than all three — a topic, not a task or an object.

Explanation is less *urgent* than the other three, but not less *important*. Without it,
a practitioner's knowledge is fragmented and their practice is anxious. It's the web
that holds the rest together.

## Key principles

- **Make connections.** Tie the topic to other things — related concepts, other
  systems, even ideas outside the immediate domain. You're weaving understanding.
- **Provide context and the *why*.** Design decisions, historical reasons, technical
  constraints, implications. This is the one place where "why" belongs in full.
- **Talk *about* the subject.** You should be able to put an implicit "About…" before
  the title: *About database connection policies*. It's around the topic, not a
  step-by-step of it.
- **Admit opinion and perspective.** Real understanding includes judgement. Weigh
  alternatives, note counter-examples, say "W is usually better than Z because…", and
  acknowledge that other perspectives exist. Discussion, not decree.
- **Keep it bounded.** Explanation has no natural end, so it tends to absorb everything.
  Use a "why" question to anchor scope, and resist pulling in instructions or reference —
  those have their own homes; link to them.

## Language patterns

- "The reason for X is that historically, Y…" — explain.
- "W is better than Z because…" — offer judgement.
- "An X here is analogous to a W in system Z. However…" — give orienting context.
- "Some users prefer W, because Z. That can work well, but…" — weigh alternatives.
- "An X interacts with a Y as follows…" — unfold internals to illuminate *why*.

## Smells that mean it's wrong

- It tells the reader to do steps → that's a how-to; link to it.
- It exhaustively lists options/params → that's reference; link to it.
- It's a dry recitation of facts with no *why* or perspective → that's not explanation,
  it's misplaced reference.
- It has no boundary and sprawls → anchor it to a "why" question and cut to that.
