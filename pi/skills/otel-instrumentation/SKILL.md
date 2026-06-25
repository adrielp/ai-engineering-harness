---
name: otel-instrumentation
description: "Application-side OpenTelemetry SDK setup — traces, metrics, structured logging across Node.js, Go, Python, Java, .NET, Ruby. Use for instrumenting app code with the OTel SDK."
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---

# OpenTelemetry Application Instrumentation

You are an expert OpenTelemetry instrumentation engineer. Produce prescriptive, opinionated guidance — not tutorials. Every recommendation must be production-grade.

## Entrypoint: Detect → Scope → Act

### 1. Detect Language/Framework

| File | Language | Check for frameworks |
|---|---|---|
| `package.json` | Node.js | express, fastify, nestjs, next |
| `go.mod` | Go | gin, echo, fiber, net/http |
| `requirements.txt` / `pyproject.toml` | Python | flask, django, fastapi |
| `pom.xml` / `build.gradle` | Java | spring-boot, quarkus, micronaut |
| `*.csproj` | .NET | Microsoft.AspNetCore |
| `Gemfile` | Ruby | rails, sinatra |

### 2. Determine Scope

| Situation | Action |
|---|---|
| No OTel deps | Full SDK setup (§7) + all signals |
| SDK present, no custom instrumentation | Add custom spans/metrics/logs (§3–5) |
| Partial instrumentation | Audit, fill gaps, fix anti-patterns |
| Broken setup | Diagnose via validation checklist (§8) |

---

## 1. Resource Attributes (CRITICAL)

Resource attributes identify your service. This is the single highest-impact configuration for observability.

### Required

| Attribute | Source | Strategy |
|---|---|---|
| `service.name` | Package manifest or env var | `OTEL_SERVICE_NAME`. Never accept `unknown_service`. |
| `service.version` | Git | `git describe --tags --always` at build time. Never hardcode. |
| `deployment.environment.name` | Env var | `NODE_ENV`, `RAILS_ENV`, `FLASK_ENV`, `ASPNETCORE_ENVIRONMENT` |
| `service.instance.id` | Generated | UUID v4 at startup. Never use hostname (not unique in k8s). |
| `service.namespace` | Convention | Logical grouping: `payments`, `auth`, `catalog` |

### Environment Variables

```bash
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=service.namespace=commerce,deployment.environment.name=production
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

### Kubernetes: Use Downward API

```yaml
env:
  - name: OTEL_SERVICE_NAME
    value: "order-service"
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: >-
      k8s.pod.name=$(POD_NAME),
      k8s.namespace.name=$(POD_NAMESPACE),
      k8s.node.name=$(NODE_NAME),
      service.namespace=commerce,
      deployment.environment.name=production
```

Set attributes at SDK level — do NOT rely solely on the Collector's `k8sattributes` processor.

---

## 2. Traces / Spans

### Naming: `{VERB} {OBJECT}`, Low Cardinality

| Protocol | Pattern | Example |
|---|---|---|
| HTTP server | `{METHOD} {route}` | `GET /api/users/{id}` |
| HTTP client | `{METHOD} {host}` | `GET api.stripe.com` |
| Database | `{OPERATION} {table}` | `SELECT orders` |
| Messaging producer | `{destination} publish` | `orders.created publish` |
| Messaging consumer | `{destination} process` | `orders.created process` |
| RPC | `{service}/{method}` | `UserService/GetUser` |
| Internal | `{component}.{action}` | `cache.lookup` |

**Never include IDs, query params, or request bodies in span names.**

### Span Kind

| Kind | When | Example |
|---|---|---|
| `SERVER` | Handling incoming remote request | HTTP handler, gRPC server |
| `CLIENT` | Making outgoing remote request | HTTP client, DB query, gRPC client |
| `PRODUCER` | Creating async message | Enqueue to Kafka/SQS |
| `CONSUMER` | Processing async message | Dequeue handler |
| `INTERNAL` | In-process, no remote I/O | Cache lookup, business logic |

### Status Code Rules

| Situation | Status | Set it? |
|---|---|---|
| Server 2xx/4xx | `UNSET` | No — 4xx is client error, not server error |
| Server 5xx | `ERROR` | Yes |
| Client receives 4xx/5xx | `ERROR` | Yes — your call failed |
| Unhandled exception | `ERROR` | Yes, with error details |
| Success | `UNSET` | No — **never set `OK`** |

### Exception Recording

Record exceptions in **logs with trace context** (a structured `logger.error` carrying `error.message`, `error.stack`, and relevant business IDs), not `span.recordException`. The Span Event API is being phased out.

### Span Hygiene

1. **No CLIENT root spans** — wrap outgoing calls in a SERVER or INTERNAL parent
2. **No orphan spans** — propagate context across async boundaries
3. **Limit INTERNAL spans to ~10/trace** — only business-significant operations
4. **Limit sub-1ms spans to ~20/trace** — rarely add diagnostic value
5. **Always use `AlwaysOn` sampler at SDK** — defer sampling to the Collector (see `otel_collector`)

---

## 3. Metrics

### Instrument Selection

| Measuring | Instrument | Unit | Example |
|---|---|---|---|
| Monotonic count | `Counter` | `{request}`, `{error}` | Requests, errors |
| Up-and-down count | `UpDownCounter` | `{connection}` | Active connections, queue depth |
| Value distribution | `Histogram` | `s`, `By` | Duration, response size |
| Point-in-time snapshot | `Gauge` | `%`, `{thread}` | CPU usage, memory |

### Naming

1. Check `otel_semantic_conventions` first
2. Dot-separated namespaces: `http.server.request.duration`
3. Never include unit in name (`duration` not `duration_seconds`)
4. UCUM units: `s`, `ms`, `By`, `{request}`

### Cardinality Management (CRITICAL)

Every unique attribute combination = a new time series. This is the #1 cost driver.

| Series/metric | Zone | Action |
|---|---|---|
| < 100 | Safe | — |
| 100–1K | Caution | Review attributes |
| 1K–10K | Danger | Remove high-cardinality attrs |
| > 10K | Critical | Immediate fix |

**Hard rules:**
- Never use user IDs, request IDs, or trace IDs as metric attributes
- Never use unbounded strings (URLs, error messages) as metric attributes
- Limit enum attrs to <20 values; use `_OTHER` for long tail
- Use `url.template` not `url.path` on metrics

### RED Pattern

One `Histogram` with these attributes covers Rate, Errors, and Duration:
- `http.request.method`, `http.response.status_code`, `url.template`, `error.type`

---

## 4. Structured Logging

### Rules

1. **Structured key-value pairs only** — never string interpolation
2. **Inject trace context** — `trace_id` + `span_id` in every log line
3. **stdout only** — let infrastructure route logs
4. **Single-line JSON** for machine parsing

### Trace Correlation

Hook the logger to pull `trace_id`/`span_id` from the active span on every line. Same pattern in every language: read the current span, if its context is valid, emit `trace_id` (32 hex) and `span_id` (16 hex).

```javascript
// Node.js (pino) — same idea via slog (Go) / structlog (Python) processors
const logger = pino({
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    return { trace_id: ctx.traceId, span_id: ctx.spanId, trace_flags: ctx.traceFlags };
  },
});
```

### Severity Levels

| Level | Use when |
|---|---|
| `DEBUG` | Developer diagnostics |
| `INFO` | Normal operation, business milestones |
| `WARN` | Unexpected but recoverable |
| `ERROR` | Failed operations needing attention |
| `FATAL` | About to crash |

### Stack Traces

Always single-line JSON — never multi-line. Emit `exception.type`, `exception.message`, and `exception.stacktrace` (with newlines escaped to `\\n`) as structured fields.

---

## 5. Sensitive Data Prevention (CRITICAL)

### Never-Instrument List

| Category | Examples |
|---|---|
| Credentials | Passwords, API keys, tokens, secrets, private keys |
| Financial | Credit card numbers, bank accounts, CVVs |
| Government IDs | SSN, passport, driver's license |
| Health records | Diagnoses, medications, test results |
| Authentication | Session tokens, JWTs, OAuth tokens |

### Sanitization Rules

- **URLs**: Strip query params. Use `url.path` + `url.scheme` + `server.address`, not `http.url`
- **DB statements**: Parameterized form only: `SELECT * FROM users WHERE id = ?`
- **Headers**: Never capture `authorization`, `cookie`, `set-cookie`

### SpanProcessor Redaction (Safety Net)

Add a custom SpanProcessor whose `onEnd` scans every attribute key for a denylist (`password`, `token`, `secret`, `authorization`, `cookie`, `credit_card`) and overwrites matching values with `[REDACTED]`. This is a last-resort net — sanitize at the source first. For Collector-side redaction as defence-in-depth, see `otel_ottl`.

---

## 6. Language Setup Guides

Detect the language (§ Entrypoint table), then load the matching guide for install commands, SDK bootstrap, and custom-span snippets:

[Node.js](references/nodejs.md) · [Go](references/go.md) · [Python](references/python.md) · [Java](references/java.md) · [.NET](references/dotnet.md) · [Ruby](references/ruby.md)

Generic rules (apply regardless of language): set the five required resource attributes at SDK level (§1), use `AlwaysOn` sampler and OTLP exporters, batch spans/logs, export metrics on a 60s periodic reader, and register a graceful shutdown hook.

---

## 7. Validation Checklist

### Pre-Flight

```bash
env | grep OTEL_
curl -sf http://otel-collector:4317 || echo "Collector unreachable (gRPC)"
curl -sf http://otel-collector:4318/v1/traces || echo "Collector unreachable (HTTP)"
# Protocol must match: grpc→:4317, http/protobuf→:4318
```

### Backend Checks

| Check | Expected |
|---|---|
| Service discovered | Correct `service.name` visible |
| Resource attributes | All 5 required attrs present |
| Span names | Low-cardinality `{verb} {object}` |
| Trace-log correlation | Logs appear with matching `trace_id` |
| Metrics visible | `http.server.request.duration` with correct attrs |

### Signal Validation

**Traces:** correct `kind`, no orphans, `ERROR` only on failures, parameterized names
**Metrics:** bounded cardinality (<1K series/metric), correct units, no duplicate names
**Logs:** `trace_id`+`span_id` present, structured JSON, correct severity, no sensitive data

---

## Cross-References

- Attribute naming → `otel_semantic_conventions`
- Collector config → `otel_collector`
- Collector-side transforms/redaction → `otel_ottl`
