---
feature: <feature-name>
created: <YYYY-MM-DD>
status: draft | implemented | validated
related-ticket: thoughts/shared/tickets/<file>.md
related-plan: thoughts/shared/plans/<file>.md
---

# <Feature> Telemetry Narrative

## Behaviour Under Observation

<One paragraph: what does this feature do, from the request entering the system
to the response leaving it? Write the prose first — the trace shape will fall
out of it.>

## Target Trace Shape

<Tree of expected spans. Indent for parent/child. Mark span kind in [brackets].>

```
GET /api/orders/{id}                       [SERVER]
├── auth.verify                             [INTERNAL]
├── orders.lookup                           [INTERNAL]
│   └── SELECT orders                       [CLIENT]
└── enrich.customer                         [INTERNAL]
    └── GET customer-service                [CLIENT]
```

## Required Span Attributes

| Span | Attribute | Source | Why |
|---|---|---|---|
| `GET /api/orders/{id}` | `http.route` | route template | low-cardinality grouping |
| `orders.lookup` | `order.id` | path param | needed for production debugging |

## Required Metrics

| Instrument | Name | Unit | Attributes |
|---|---|---|---|
| Histogram | `http.server.request.duration` | `s` | `http.route`, `http.response.status_code` |

## Out of Scope (Will Not Be Instrumented)

- <Sensitive fields, internal helpers below the noise threshold, etc.>

## Validation

Run `/validate_telemetry thoughts/shared/telemetry/<this-file>.md` after the
feature lands locally. Expected outcome: every span and attribute above is
present in the local Aspire dashboard for at least one captured trace.
