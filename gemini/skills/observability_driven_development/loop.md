# The ODD Inner Loop

```
Write Code → Instrument (OTel spans) → Run Locally → OTel Collector → Aspire → Observe → [repeat]
```

> Every code change produces a trace. Every trace answers a question.
> No guessing. — *OTel Me More: ODD in the AI Era*

## Step-By-Step

### 1. Write Code

Implement the smallest unit that moves the narrative forward. Don't write the
whole feature; write the next span.

### 2. Instrument

Add the span as designed in the narrative. Use the SDK patterns from
`otel_instrumentation` for your language. The span name comes from the
narrative; the attributes come from the narrative. You are not designing here,
you are transcribing.

### 3. Run Locally

Trigger the code path. HTTP request, CLI invocation, message publish — whatever
exercises the new span. The local stack must be running (see
[local-setup.md](local-setup.md)).

### 4. OTel Collector → Aspire

The SDK exports OTLP to the Collector or directly to the Aspire dashboard.
Aspire indexes the spans and exposes them in the UI at
`http://localhost:18888`.

### 5. Observe

Open the trace in the dashboard. Three questions, in order:

1. **Does the trace exist?** If not, the SDK isn't exporting. Check
   `OTEL_EXPORTER_OTLP_ENDPOINT` (must be `http://localhost:4317` for gRPC or
   `http://localhost:4318` for HTTP — the Aspire docker mapping is
   `4317→18889`, `4318→18890`). Check the dashboard logs for receive errors.
2. **Does it match the narrative?** Span name, kind, parent, attributes.
3. **Is anything surprising?** Unexpected spans, retry storms, duplicate
   work, missing context propagation across async boundaries — all of these
   are bugs in the code, not the instrumentation.

### 6. Repeat

Each cycle is seconds, not hours.

## Worked Example: Instrumenting an AI Agent

From the talk's `slides/inner-loop.md`, an agent traced through retrieval and
tool execution:

```python
# Root span: the entire agent turn
with tracer.start_as_current_span("create_agent") as root:

    # Tool selection span
    with tracer.start_as_current_span("retrieval") as ts:
        ts.set_attribute("gen_ai.prompt.tokens", 4200)
        ts.set_attribute("gen_ai.reasoning.steps", 3)
        tool = select_tool(context)

    # Tool invocation span
    with tracer.start_as_current_span(f"execute_tool {tool.name}") as ti:
        ti.set_attribute("gen_ai.tool.name", tool.name)
        result = tool.execute(args)
```

The narrative for this might read:

```
create_agent                              [INTERNAL]
├── retrieval                              [INTERNAL]
│   └── (gen_ai.prompt.tokens, gen_ai.reasoning.steps)
└── execute_tool {name}                    [INTERNAL]
    └── (gen_ai.tool.name)
```

After the first cycle, the dashboard shows the root span. After the second,
the retrieval child appears with `gen_ai.prompt.tokens` populated. After the
third, the tool execution. If the agent loops on tool selection, you see it
immediately as a fan of `execute_tool` siblings — that's a bug the narrative
didn't anticipate, and the loop is what surfaces it.

## Common Pitfalls

| Symptom | Likely cause |
|---|---|
| No traces appear | Wrong OTLP endpoint or wrong protocol (gRPC vs HTTP) |
| Spans appear but no parent/child | Context not propagated across async boundary |
| Attributes missing | Set on wrong scope (resource vs span vs metric) |
| Trace ends mid-flow | Span never ended (missing `try/finally` or `with`) |
| Cardinality explodes | IDs in span name or metric attributes |

For each, route to `otel_instrumentation` for the language-specific fix.
