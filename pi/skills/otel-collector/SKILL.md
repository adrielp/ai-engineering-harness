---
name: otel-collector
description: "OpenTelemetry Collector configuration — receivers, processors, exporters, pipelines, sampling, deployment. Use for Collector/OTLP/Prometheus config tasks."
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---

# OpenTelemetry Collector Configuration

You are an expert Collector configuration engineer. Produce production-grade YAML — never toy configs. Every pipeline must start with `memory_limiter`.

**Scope:** Collector YAML and deployment manifests only. For SDK setup, see `otel_instrumentation`.

---

## 1. Receivers

- **OTLP** — default ingest. Always configure BOTH `grpc` (4317) and `http` (4318). Never bind `localhost` in containers (other pods can't reach `127.0.0.1`).
- **Prometheus** — scrape existing Prom endpoints / pod annotations.
- **Filelog** — container logs. Always `start_at: end` in prod (`beginning` replays history).
- **Hostmetrics** — node CPU/mem/disk/net; deploy as DaemonSet. Omit `process` scraper (high cardinality).

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
```

Full receiver configs (Prometheus, filelog, hostmetrics, TLS): [references/receivers.md](references/receivers.md)

---

## 2. Processors (CRITICAL)

**Mandatory order:** `memory_limiter → resourcedetection → k8sattributes → resource → redaction → other transforms`

- **memory_limiter** — REQUIRED, always first. `limit_mib` = 80% of container limit, `spike_limit_mib` = 25% of that.
- **Do NOT use the batch processor** — use exporter `sending_queue` + `file_storage` for persistence across restarts.
- **resourcedetection** — add env/cloud/host attributes; `override: false` to preserve SDK attributes.
- **k8sattributes** — enrich with pod/namespace/node/deployment. Needs ClusterRole (get/watch/list on pods, namespaces, nodes, replicasets, deployments).
- **filter** — drop unwanted telemetry (health checks, deprecated metrics).

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
```

Full processor configs: [references/processors.md](references/processors.md)

---

## 3. Exporters

- **otlp (gRPC)** — default. Enable `compression: gzip`, `retry_on_failure`, and `sending_queue` with `file_storage`.
- **otlphttp** — use when gRPC is blocked by proxies/firewalls.
- **debug** — development only, NEVER in production.

```yaml
exporters:
  otlp:
    endpoint: otel-backend:4317
    compression: gzip
    retry_on_failure: { enabled: true }
    sending_queue: { enabled: true, storage: file_storage/queue }
```

Full exporter configs: [references/exporters.md](references/exporters.md)

---

## 4. Pipelines

1. **Separate pipelines per signal** — never mix traces, metrics, logs.
2. **Processor order matters** — executes in listed order (start with `memory_limiter`).
3. **Fan-out** to multiple backends: `exporters: [otlp/backend1, otlp/backend2]`.
4. Use the **signaltometrics connector** to derive RED metrics from traces.
5. Monitor self-metrics: `otelcol_exporter_send_failed_spans`, `otelcol_processor_dropped_spans`, `otelcol_receiver_accepted_spans`.

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, resource, filter]
      exporters: [otlp]
```

Full pipeline configs (standard, signaltometrics): [references/pipelines.md](references/pipelines.md)

---

## 5. Sampling

- **Head sampling** (`probabilistic_sampler`) — simple, uniform, cheap. Can't selectively keep errors/slow traces (no full-trace context).
- **Tail sampling** (`tail_sampling`) — keeps errors + slow traces. Needs two-tier architecture: Tier 1 `loadbalancing` (route by trace ID) → Tier 2 sampler, so all spans of a trace land on the same instance.
- **CRITICAL:** sampling discards data. Materialize RED metrics with `signaltometrics` BEFORE the sampler so metrics reflect ALL traces.

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10
```

Full sampling configs (tail policies, two-tier): [references/sampling.md](references/sampling.md)

---

## 6. Deployment

| Pattern | Role | K8s Kind |
|---|---|---|
| Sidecar | Per-pod | Pod sidecar |
| DaemonSet | Node-level (hostmetrics, filelog) | DaemonSet |
| Gateway | Centralized processing | Deployment + HPA |
| Two-tier | Load balance + tail sample | DaemonSet (T1) + Deployment (T2) |

Prefer the **OpenTelemetry Operator** (`kind: OpenTelemetryCollector`, `mode: deployment|daemonset|sidecar|statefulset`) or the **Helm** chart over hand-rolled manifests.

Full deployment configs (Helm, Operator manifest): [references/deployment.md](references/deployment.md)

---

## Cross-References

- SDK setup → `otel_instrumentation`
- OTTL expressions → `otel_ottl`
- Attribute naming → `otel_semantic_conventions`
