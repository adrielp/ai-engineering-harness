---
name: otel_ottl
description: >
  OTTL (OpenTelemetry Transformation Language) reference — syntax, contexts,
  common patterns (redaction, normalization, enrichment, filtering), error
  handling, and complete function reference for Collector processors.
disable-model-invocation: true
allowed-tools: read_file, run_shell_command, search_file_content, glob, replace, write_file
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
          # Headers
          - delete_key(attributes, "http.request.header.authorization")
          - delete_key(attributes, "http.request.header.cookie")
          - delete_key(attributes, "http.request.header.set-cookie")
          - delete_key(attributes, "http.request.header.x-api-key")
          # DB queries — strip parameter values
          - replace_pattern(attributes["db.query.text"], "'[^']*'", "'?'") where attributes["db.query.text"] != nil
          # URL query params
          - replace_pattern(attributes["url.query"], "(?i)(token|key|secret|password|auth)=[^&]*", "$1=[REDACTED]") where attributes["url.query"] != nil
          # Credit cards
          - replace_pattern(attributes["payment.card"], "\\d{12,19}", "[REDACTED]")
          # Emails
          - replace_pattern(attributes["user.email"], "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED]")
          # Generic secrets in values
          - replace_pattern(attributes["config"], "(?i)(password|secret|token|api_key)\\s*[=:]\\s*\\S+", "$1=[REDACTED]")
    log_statements:
      - context: log
        statements:
          - replace_pattern(body, "(?i)(password|secret|token|api[_-]?key|authorization)\\s*[=:]\\s*\\S+", "$1=[REDACTED]")
          - replace_pattern(body, "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b", "[CARD-REDACTED]")
          - replace_pattern(body, "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[EMAIL-REDACTED]")
```

### Drop Telemetry

```yaml
processors:
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/readyz"'
        - 'IsMatch(name, "grpc.reflection.*")'
    metrics:
      metric:
        - 'name == "http.server.duration"'
      datapoint:
        - 'resource.attributes["service.namespace"] == "internal"'
        - 'time_unix_nano < (UnixNano() - Duration("10m"))'  # stale data
    logs:
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO and resource.attributes["deployment.environment.name"] == "production"'
```

### Normalize High-Cardinality

```yaml
- replace_pattern(attributes["url.path"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{id}") where attributes["url.path"] != nil
- replace_pattern(attributes["url.path"], "/\\d+", "/{id}") where attributes["url.path"] != nil
- replace_pattern(attributes["client.address"], "(\\d+\\.\\d+\\.\\d+\\.)\\d+", "${1}0")  # mask IP
```

### Limit Attributes

```yaml
- truncate_all(attributes, 512)
- limit(attributes, 64)
```

### Enrich

```yaml
- context: resource
  statements:
    - set(attributes["k8s.cluster.name"], "prod-us-east-1") where attributes["k8s.cluster.name"] == nil
```

### Route

```yaml
connectors:
  routing:
    default_pipelines: [traces/default]
    table:
      - statement: route() where attributes["priority"] == "high"
        pipelines: [traces/priority]
      - statement: route() where resource.attributes["deployment.environment.name"] == "staging"
        pipelines: [traces/staging]
```

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

### Editors (Mutate Data)

| Function | Purpose |
|---|---|
| `set(target, value)` | Set value |
| `delete_key(map, key)` | Remove key |
| `delete_matching_keys(map, pattern)` | Remove keys by glob |
| `keep_keys(map, keys...)` | Keep only listed keys |
| `truncate_all(map, limit)` | Truncate all string values |
| `limit(map, count)` | Cap key count |
| `replace_match(target, glob, replacement)` | Glob replace |
| `replace_pattern(target, regex, replacement)` | Regex replace |
| `replace_all_matches(map, glob, replacement)` | Glob replace all values |
| `replace_all_patterns(map, mode, regex, replacement)` | Regex replace all values |
| `merge_maps(target, source, strategy)` | Merge maps (upsert/insert/update) |
| `flatten(target)` | Flatten nested map |
| `copy(target, source)` | Copy value |

### Converters — Type

| Function | Returns |
|---|---|
| `IsString`, `IsInt`, `IsDouble`, `IsBool`, `IsMap` | bool |
| `IsMatch(target, pattern)` | bool (regex) |
| `HasAttrKeyOnDatapoint(key)` | bool |
| `Int`, `Double`, `String`, `Bool` | Converted type |

### Converters — String

| Function | Purpose |
|---|---|
| `Concat(values[], delim)` | Join |
| `Split(target, delim)` | Split |
| `Substring(target, start, len)` | Extract |
| `ConvertCase(target, case)` | lower/upper/snake/camel |
| `Trim`, `TrimLeft`, `TrimRight` | Whitespace |

### Converters — Hashing

`SHA1`, `SHA256`, `FNV`, `MD5` — use for PII-free correlation:
```yaml
- set(attributes["user.hash"], SHA256(attributes["user.email"])) where attributes["user.email"] != nil
- delete_key(attributes, "user.email")
```

### Converters — Parsing

| Function | Purpose |
|---|---|
| `ParseJSON(value)` | JSON string → map |
| `ParseCSV(target, header)` | CSV → map |
| `ParseKeyValue(target)` | key=value → map |
| `ExtractPatterns(target, regex)` | Named groups |
| `SpanID(bytes)`, `TraceID(bytes)` | ID conversion |

### Converters — Time

`Now()`, `UnixNano()`, `Duration("5m")`, `Time(string, layout)`, `TruncateTime(time, duration)`

### Converters — Collections

`Len(value)`, `append(target, values...)`, `Slice(target, start, end)`

---

## Cross-References

- SDK-side sensitive data prevention → `otel_instrumentation`
- Collector pipelines → `otel_collector`
- Attribute naming → `otel_semantic_conventions`
