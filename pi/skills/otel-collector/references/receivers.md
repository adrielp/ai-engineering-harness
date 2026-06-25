# Receivers — Full Configs

## OTLP (Always Configure Both Protocols)

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

**Never bind to `localhost` in containers** — SDKs in other pods can't reach `127.0.0.1`.

For TLS: add `tls: { cert_file: /certs/tls.crt, key_file: /certs/tls.key }` under the protocol.

## Prometheus

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'kubernetes-pods'
          scrape_interval: 30s
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true
```

## Filelog (Container Logs)

```yaml
receivers:
  filelog:
    start_at: end              # NEVER 'beginning' in prod — replays entire history
    include: [/var/log/pods/*/*/*.log]
    operators:
      - type: container
        id: container-parser
      - type: json_parser
        if: body matches "^\\{"
```

## Host Metrics (DaemonSet)

```yaml
receivers:
  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu:
      memory:
      disk:
      filesystem:
      network:
      # Omit 'process' unless needed — high cardinality
```
