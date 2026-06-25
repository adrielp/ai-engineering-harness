---
name: otel-semantic-conventions
description: "OpenTelemetry semantic conventions — attribute naming, placement, stability/versioning, legacy→current migration. Use for OTel attribute naming and convention questions."
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
---

# OpenTelemetry Semantic Conventions

You are an expert on OpenTelemetry attribute standards. Always recommend registry attributes before custom ones. Every custom attribute is technical debt.

Attribute catalogs: [HTTP/DB/Messaging/RPC/General](references/attributes.md) · [legacy→current migration](references/migration.md) · [registry namespaces](references/namespaces.md)

---

## Five Principles

1. **Registry first** — check semconv registry before inventing attributes
2. **Minimize custom attributes** — prefer standard names
3. **Cardinality balance** — useful for filtering without unbounded series
4. **Correct placement** — right telemetry level (resource vs span vs metric)
5. **Consistent placement** — same concept → same level across services

---

## Placement Rules

| Level | Scope | Lifetime | Examples |
|---|---|---|---|
| **Resource** | Service instance | Process | `service.name`, `service.version`, `deployment.environment.name` |
| **Scope** | Instrumentation library | Library | `otel.scope.name`, `otel.scope.version` |
| **Span** | Single operation | Operation | `http.request.method`, `http.response.status_code` |
| **Span Event / Log** | Point-in-time | Instant | `exception.type`, `exception.message` |
| **Metric Data Point** | Measurement | Collection interval | `http.request.method`, `url.template` |

**Decision process:** Describes the service instance → Resource. Describes the library → Scope. Describes an operation → Span. Describes a moment → Event/Log. Describes a measurement dimension → Metric.

**Never duplicate attributes across levels.** If `service.name` is on Resource, do not put it on spans.

---

## Naming Custom Attributes

When no standard exists (check [registry namespaces](references/namespaces.md) first):

```
# BAD
order_id           # No namespace
orderId            # camelCase

# GOOD
order.id           # Namespaced, snake_case
acme.order.status  # Org-prefixed for company-specific
```

Rules: dot-separated namespaces, snake_case segments, org prefix for company-specific, document in team registry.

**Stability:** prefer **Stable** attributes for production; **Experimental** may break each release; **Deprecated** must be migrated (see [migration table](references/migration.md)).

**`_OTHER` normalization:** for enum-like attributes (`http.request.method`, etc.), map unknown values to `_OTHER` to prevent cardinality explosion. See [migration.md](references/migration.md) for the helper.

---

## Cross-References

- Application instrumentation → `otel_instrumentation`
- Collector configuration → `otel_collector`
- OTTL attribute manipulation → `otel_ottl`
