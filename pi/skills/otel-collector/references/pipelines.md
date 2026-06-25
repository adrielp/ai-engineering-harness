# Pipelines — Full Configs

Rules: separate pipelines per signal (never mix traces/metrics/logs); processor order = listed order; fan-out via `exporters: [otlp/backend1, otlp/backend2]`.

## Standard Pipeline

```yaml
service:
  extensions: [health_check, file_storage/queue]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, resource, filter]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, resource]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, resource]
      exporters: [otlp]
  telemetry:
    metrics:
      address: 0.0.0.0:8888
    logs:
      level: info
```

## signaltometrics Connector (Derive Metrics from Traces)

```yaml
connectors:
  signaltometrics:
    spans:
      - name: http.server.request.duration
        unit: s
        histogram:
          value: duration
        attributes:
          - key: http.request.method
          - key: http.response.status_code
          - key: url.template
          - key: error.type
          - key: service.name
        conditions:
          - 'kind == SPAN_KIND_SERVER'

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter]
      exporters: [otlp, signaltometrics]
    metrics/derived:
      receivers: [signaltometrics]
      processors: [memory_limiter]
      exporters: [otlp]
```

## Collector Self-Metrics to Monitor

- `otelcol_exporter_sent_spans` / `send_failed_spans` — export health
- `otelcol_processor_dropped_spans` — data loss
- `otelcol_receiver_accepted_spans` — ingestion rate
