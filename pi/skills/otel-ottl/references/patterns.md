# OTTL Pattern Catalog

## Redact Sensitive Data (full)

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

## Drop Telemetry (full)

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

## Normalize High-Cardinality

```yaml
- replace_pattern(attributes["url.path"], "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{id}") where attributes["url.path"] != nil
- replace_pattern(attributes["url.path"], "/\\d+", "/{id}") where attributes["url.path"] != nil
- replace_pattern(attributes["client.address"], "(\\d+\\.\\d+\\.\\d+\\.)\\d+", "${1}0")  # mask IP
```

## Limit Attributes

```yaml
- truncate_all(attributes, 512)
- limit(attributes, 64)
```

## Enrich

```yaml
- context: resource
  statements:
    - set(attributes["k8s.cluster.name"], "prod-us-east-1") where attributes["k8s.cluster.name"] == nil
```

## Route

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
