# Reference — authoring guide

**Reference is a map.** It is information-oriented: an austere, neutral, authoritative
description of the machinery. The reader is working and needs a fact fast, with total
certainty. They *consult* reference; they don't *read* it. Its structure is dictated by
the product, not by the reader's journey.

## What reference is and is not

- **Is:** technical description — APIs, classes, functions, commands, flags, options,
  config keys, error messages, limits. Facts about how the thing is and behaves.
- **Is not:** instruction (how-to) or discussion (explanation). The temptation to add
  these is strong, because pure description feels too thin to be useful. Resist it and
  link out instead.

Reference gives users firm ground to stand on. Auto-generated API docs are reference,
but auto-generation alone is not "all the documentation a project needs."

## Key principles

- **Describe and only describe.** Neutral, objective, factual. No instruction, no
  opinion, no explanation of *why*. This is unnatural to write — most writing wants to
  instruct or opine — so it takes deliberate restraint.
- **Be austere and consistent.** Reference is not the place to show off vocabulary or
  vary your style. Sameness is a feature: the reader finds what they need because it's
  always in the expected place, in the expected format.
- **Mirror the structure of the machinery.** The doc's organization should match the
  product's structure, so the reader can navigate both in parallel. Don't force an
  unnatural shape — follow the code's real logical arrangement.
- **Provide examples.** A short usage example illustrates without sliding into teaching
  or explaining. It's the safest way to add clarity to bare description.
- **Be complete and exact.** Accuracy, precision, completeness, clarity. A reference
  that's wrong or has gaps is worse than none — the reader trusted it.

## Language patterns

- "X is available as `module.X` and defined in `path/to/x`." — state facts plainly.
- "Sub-commands are: a, b, c, d." — list options, flags, features, errors exhaustively.
- "You must use A. You must not apply B unless C." — warnings, stated flatly.

## Form

- Tables and definition lists for parameters, options, fields, return values, errors.
- Consistent ordering and headings across similar entries (every function documented
  the same way: signature, parameters, returns, raises, example).
- Inline code for every identifier, path, flag, and value.

## Smells that mean it's wrong

- It explains *why* a design is the way it is → that's explanation; link to it.
- It walks the reader through a task → that's a how-to; link to it.
- Entries are formatted inconsistently → reference's whole value is predictability.
- It editorializes ("this handy method") → strip the adjectives; just describe.
