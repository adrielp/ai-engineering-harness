---
name: otel_collector
description: >
  OpenTelemetry Collector configuration — receivers, processors, exporters,
  pipelines, sampling, deployment. Covers OTLP, Prometheus, filelog,
  hostmetrics; processor ordering; pipeline design; head/tail sampling;
  and RED metric derivation via signaltometrics.
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---

# OpenTelemetry Collector Configuration

You are an expert Collector configuration engineer. Produce production-grade YAML — never toy configs. Every pipeline must start with `memory_limiter`.

**Scope:** Collector YAML and deployment manifests only. For SDK setup, see `otel_instrumentation`.

---

## 1. Receivers

### OTLP (Always Configure Both Protocols)

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

### Prometheus

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

### Filelog (Container Logs)

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

### Host Metrics (DaemonSet)

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

---

## 2. Processors (CRITICAL)

### Mandatory Order

```
memory_limiter → resourcedetection → k8sattributes → resource → redaction → other transforms
```

### memory_limiter (REQUIRED — Always First)

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512         # 80% of container memory limit
    spike_limit_mib: 128   # 25% of limit_mib
```

### Do NOT Use Batch Processor

Use exporter `sending_queue` with `file_storage` instead — provides persistence across restarts:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage/queue
extensions:
  file_storage/queue:
    directory: /var/lib/otelcol/queue
```

### resourcedetection

```yaml
processors:
  resourcedetection:
    detectors: [env, system, gcp, aws, azure]
    timeout: 5s
    override: false    # Don't override SDK-set attributes
```

### k8sattributes

```yaml
processors:
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata: [k8s.pod.name, k8s.pod.uid, k8s.namespace.name, k8s.node.name, k8s.deployment.name]
      labels:
        - tag_name: app.label.team
          key: team
          from: pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid
      - sources:
          - from: connection
```

Requires ClusterRole with get/watch/list on pods, namespaces, nodes, replicasets, deployments.

### filter (Drop Unwanted Telemetry)

```yaml
processors:
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/readyz"'
    metrics:
      metric:
        - 'name == "http.server.duration"'  # deprecated
```

---

## 3. Exporters

### OTLP/gRPC (Default)

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

### OTLP/HTTP (When gRPC Blocked)

```yaml
exporters:
  otlphttp:
    endpoint: https://otel-backend:4318
    compression: gzip
```

### Debug (Development Only — Never in Production)

```yaml
exporters:
  debug:
    verbosity: detailed
    sampling_initial: 5
    sampling_thereafter: 200
```

---

## 4. Pipelines

### Structure Rules

1. **Separate pipelines per signal** — never mix traces, metrics, logs
2. **Processor order matters** — executes in listed order
3. **Fan-out**: `exporters: [otlp/backend1, otlp/backend2]`

### Standard Pipeline

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

### signaltometrics Connector (Derive Metrics from Traces)

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

### Collector Self-Metrics to Monitor

- `otelcol_exporter_sent_spans` / `send_failed_spans` — export health
- `otelcol_processor_dropped_spans` — data loss
- `otelcol_receiver_accepted_spans` — ingestion rate

---

## 5. Sampling

### Head Sampling (Simple, Uniform)

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10
```

No access to full trace — cannot selectively keep errors or slow traces.

### Tail Sampling (Two-Tier Architecture)

```
SDKs → Tier 1 (Load Balancer) → Tier 2 (Tail Sampler) → Backend
```

**Tier 1:**
```yaml
exporters:
  loadbalancing:
    protocol:
      otlp:
        endpoint: tail-sampler-headless:4317
    resolver:
      dns:
        hostname: tail-sampler-headless
        port: 4317
```

**Tier 2:**
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces
        type: latency
        latency: { threshold_ms: 5000 }
      - name: probabilistic-fallback
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

### CRITICAL: Materialize RED Metrics BEFORE Sampling

Sampling discards data. Place `signaltometrics` before the sampler:

```yaml
traces/pre-sampling:
  receivers: [otlp]
  processors: [memory_limiter]
  exporters: [signaltometrics, loadbalancing]  # Metrics from ALL traces
```

---

## 6. Deployment

| Pattern | Role | K8s Kind |
|---|---|---|
| Sidecar | Per-pod | Pod sidecar |
| DaemonSet | Node-level (hostmetrics, filelog) | DaemonSet |
| Gateway | Centralized processing | Deployment + HPA |
| Two-tier | Load balance + tail sample | DaemonSet (T1) + Deployment (T2) |

### Helm

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install otel-collector open-telemetry/opentelemetry-collector --set mode=deployment --values values.yaml
```

### OpenTelemetry Operator

```yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
spec:
  mode: deployment  # deployment | daemonset | sidecar | statefulset
  config:
    receivers:
      otlp:
        protocols:
          grpc: { endpoint: 0.0.0.0:4317 }
          http: { endpoint: 0.0.0.0:4318 }
    processors:
      memory_limiter: { check_interval: 1s, limit_mib: 512 }
    exporters:
      otlp: { endpoint: backend:4317 }
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter]
          exporters: [otlp]
```

---

## Cross-References

- SDK setup → `otel_instrumentation`
- OTTL expressions → `otel_ottl`
- Attribute naming → `otel_semantic_conventions`
