---
name: otel-ottl
description: "OTTL (OpenTelemetry Transformation Language) reference — syntax, contexts, patterns (redaction, normalization, enrichment, filtering), functions. Use for OTTL in Collector processors."
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---

# OpenTelemetry Transformation Language (OTTL)

You are an OTTL expert. Produce production-grade expressions with `error_mode: ignore` and proper `where` guards. Always use the transform processor for mutations and filter processor for drops.

---

## 1. Where OTTL Is Used

| Component | Type | OTTL Role |
|---|---|---|
| `transform` | Processor | Statements with conditions |
| `filter` | Processor | Drop conditions |
| `routing` | Processor/Connector | Routing conditions |
| `signaltometrics` | Connector | Attribute expressions, conditions |

---

## 2. Syntax

### Contexts

| Context | Key Paths | Signal |
|---|---|---|
| `resource` | `resource.attributes[...]` | All |
| `scope` | `scope.name`, `scope.version`, `scope.attributes[...]` | All |
| `span` | `name`, `kind`, `status.code`, `status.message`, `attributes[...]`, `duration`, `start_time_unix_nano` | Traces |
| `spanevent` | `name`, `attributes[...]`, `timestamp` | Traces |
| `metric` | `name`, `description`, `unit`, `type` | Metrics |
| `datapoint` | `value_int`, `value_double`, `attributes[...]`, `time_unix_nano` | Metrics |
| `log` | `body`, `severity_number`, `severity_text`, `attributes[...]`, `trace_id`, `span_id` | Logs |

### Operators

`==`, `!=`, `>`, `<`, `>=`, `<=`, `and`, `or`, `not`

### Enumerations

```
SPAN_KIND_INTERNAL | SPAN_KIND_SERVER | SPAN_KIND_CLIENT | SPAN_KIND_PRODUCER | SPAN_KIND_CONSUMER
STATUS_CODE_UNSET | STATUS_CODE_OK | STATUS_CODE_ERROR
SEVERITY_NUMBER_TRACE=1 | DEBUG=5 | INFO=9 | WARN=13 | ERROR=17 | FATAL=21
```

---

## 3. Common Patterns

### Set Attributes

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["processed_by"], "collector-v1")
          - set(attributes["env"], resource.attributes["deployment.environment.name"])
          - set(attributes["is_error"], true) where status.code == STATUS_CODE_ERROR
```

### Redact Sensitive Data

```yaml
processors:
  transform:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "http.request.header.authorization")
          - replace_pattern(attributes["db.query.text"], "'[^']*'", "'?'") where attributes["db.query.text"] != nil
          - replace_pattern(attributes["user.email"], "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED]")
```

### Drop Telemetry

```yaml
processors:
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'IsMatch(name, "grpc.reflection.*")'
```

### Normalize High-Cardinality

```yaml
- replace_pattern(attributes["url.path"], "/\\d+", "/{id}") where attributes["url.path"] != nil
- truncate_all(attributes, 512)
- limit(attributes, 64)
```

More patterns (full redaction/drop catalog, enrich, route): [references/patterns.md](references/patterns.md)

---

## 4. Error Handling

| Mode | Behavior | When |
|---|---|---|
| `propagate` | Stop pipeline | Dev/test |
| `ignore` | Log + skip + continue | **Production (default)** |
| `silent` | Skip silently | Expected errors |

Always use `where` guards to prevent nil access:
```yaml
- set(attributes["parsed"], ParseJSON(attributes["raw"])) where attributes["raw"] != nil
```

---

## 5. Function Reference

Full function reference: [references/functions.md](references/functions.md)

Most-used: `set`, `delete_key`, `keep_keys`, `truncate_all`, `limit`, `replace_pattern`, `merge_maps`, `IsMatch`, `SHA256`, `ParseJSON`, `Duration`.

---

## Cross-References

- SDK-side sensitive data prevention → `otel_instrumentation`
- Collector pipelines → `otel_collector`
- Attribute naming → `otel_semantic_conventions`
