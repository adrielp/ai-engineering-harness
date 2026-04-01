---
name: otel_semantic_conventions
description: >
  OpenTelemetry semantic conventions — attribute naming, placement across
  telemetry levels, stability/versioning, legacy→current migration,
  and registry namespace reference.
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
---

# OpenTelemetry Semantic Conventions

You are an expert on OpenTelemetry attribute standards. Always recommend registry attributes before custom ones. Every custom attribute is technical debt.

---

## 1. Placement Rules

### Five Principles

1. **Registry first** — check semconv registry before inventing attributes
2. **Minimize custom attributes** — prefer standard names
3. **Cardinality balance** — useful for filtering without unbounded series
4. **Correct placement** — right telemetry level (resource vs span vs metric)
5. **Consistent placement** — same concept → same level across services

### Placement Decision

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

## 2. Common Attributes

### HTTP

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `http.request.method` | string | Yes | Normalize unknown → `_OTHER` |
| `http.response.status_code` | int | If available | |
| `url.path` | string | Yes | Parameterized: `/api/users/{id}` |
| `url.scheme` | string | Yes | `https` |
| `url.template` | string | Recommended | `/api/users/{id}` — use on metrics |
| `server.address` | string | Yes | |
| `server.port` | int | If non-default | |
| `error.type` | string | If error | Exception class or status code |
| `url.query` | string | No | **Strip by default** — sanitize if kept |
| `user_agent.original` | string | No | Truncate to 256 chars |
| `network.protocol.version` | string | No | `1.1`, `2` |

Known methods: `CONNECT DELETE GET HEAD OPTIONS PATCH POST PUT TRACE`. Everything else → `_OTHER`.

### Database

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `db.system.name` | string | Yes | `postgresql`, `mysql`, `redis`, `mongodb` |
| `db.operation.name` | string | Yes | `SELECT`, `INSERT`, `findOne` |
| `db.collection.name` | string | If applicable | Table/collection name |
| `db.namespace` | string | Yes | Database name |
| `db.query.text` | string | Opt-in | **Parameterized only — no values** |

### Messaging

| Attribute | Type | Required |
|---|---|---|
| `messaging.system` | string | Yes |
| `messaging.operation.type` | string | Yes |
| `messaging.destination.name` | string | Yes |
| `messaging.message.id` | string | If available |
| `messaging.consumer.group.name` | string | If applicable |
| `messaging.batch.message_count` | int | If batched |

### RPC

| Attribute | Type | Required |
|---|---|---|
| `rpc.system` | string | Yes |
| `rpc.service` | string | Yes |
| `rpc.method` | string | Yes |
| `rpc.grpc.status_code` | int | If gRPC |
| `server.address` | string | Yes |

### General

| Attribute | Context | Notes |
|---|---|---|
| `error.type` | Any errored operation | Exception class or HTTP status |
| `code.function.name` | Source-level tracing | |
| `enduser.id` | User-scoped ops | **Hashed/opaque ID only** |

---

## 3. Migration: Legacy → Current

| Deprecated | Current | Status |
|---|---|---|
| `http.method` | `http.request.method` | Stable |
| `http.status_code` | `http.response.status_code` | Stable |
| `http.url` | `url.full` | Stable |
| `http.target` | `url.path` + `url.query` | Stable |
| `http.scheme` | `url.scheme` | Stable |
| `http.host` | `server.address` + `server.port` | Stable |
| `http.request_content_length` | `http.request.body.size` | Stable |
| `http.response_content_length` | `http.response.body.size` | Stable |
| `http.flavor` | `network.protocol.version` | Stable |
| `http.user_agent` | `user_agent.original` | Stable |
| `net.peer.name` / `net.host.name` | `server.address` | Stable |
| `net.peer.port` / `net.host.port` | `server.port` | Stable |
| `net.transport` | `network.transport` | Stable |
| `net.sock.peer.addr` | `network.peer.address` | Stable |
| `db.system` | `db.system.name` | Stable |
| `db.name` | `db.namespace` | Stable |
| `db.statement` | `db.query.text` | Stable |
| `db.operation` | `db.operation.name` | Stable |
| `db.sql.table` / `db.mongodb.collection` / `db.cassandra.table` | `db.collection.name` | Stable |
| `messaging.destination` | `messaging.destination.name` | Stable |
| `messaging.kafka.consumer_group` | `messaging.consumer.group.name` | Stable |

### Stability Levels

| Level | Meaning |
|---|---|
| **Stable** | Won't change. Safe for production. |
| **Experimental** | May break. Check each release. |
| **Deprecated** | Being removed. Migrate to replacement. |

### `_OTHER` Normalization

For enum-like attributes, map unknown values to `_OTHER` to prevent cardinality explosion:

```javascript
const KNOWN = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']);
const normalize = (m) => KNOWN.has(m.toUpperCase()) ? m.toUpperCase() : '_OTHER';
```

Apply to: `http.request.method`, `rpc.grpc.status_code`, `error.type` grouping.

---

## 4. Registry Namespaces

Check these before creating custom attributes:

**Infrastructure:** `cloud`, `container`, `deployment`, `device`, `disk`, `dns`, `host`, `hw`, `k8s`, `network`, `os`, `process`, `system`
**Compute:** `faas`, `service`, `telemetry`, `thread`, `webengine`
**Protocols:** `http`, `rpc`, `graphql`, `grpc`, `db`, `messaging`
**Cloud:** `aws`, `azure`, `gcp`
**Client:** `browser`, `client`, `session`, `user_agent`
**Observability:** `error`, `event`, `exception`, `feature_flag`, `log`, `otel`, `span`, `trace`
**Domain:** `code`, `enduser`, `gen_ai`, `peer`, `pool`, `server`, `source`, `url`, `vcs`

### Custom Attribute Naming

When no standard exists:

```
# BAD
order_id           # No namespace
orderId            # camelCase

# GOOD
order.id           # Namespaced, snake_case
acme.order.status  # Org-prefixed for company-specific
```

Rules: dot-separated namespaces, snake_case segments, org prefix for company-specific, document in team registry.

---

## Cross-References

- Application instrumentation → `otel_instrumentation`
- Collector configuration → `otel_collector`
- OTTL attribute manipulation → `otel_ottl`
