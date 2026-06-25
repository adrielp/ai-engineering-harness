# Exporters — Full Configs

## OTLP/gRPC (Default)

```yaml
exporters:
  otlp:
    endpoint: otel-backend:4317
    compression: gzip
    headers:
      Authorization: "Bearer ${env:OTEL_EXPORTER_AUTH_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage/queue
```

## OTLP/HTTP (When gRPC Blocked)

```yaml
exporters:
  otlphttp:
    endpoint: https://otel-backend:4318
    compression: gzip
```

## Debug (Development Only — Never in Production)

```yaml
exporters:
  debug:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200
```
