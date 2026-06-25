# Deployment — Full Configs

| Pattern | Role | K8s Kind |
|---|---|---|
| Sidecar | Per-pod | Pod sidecar |
| DaemonSet | Node-level (hostmetrics, filelog) | DaemonSet |
| Gateway | Centralized processing | Deployment + HPA |
| Two-tier | Load balance + tail sample | DaemonSet (T1) + Deployment (T2) |

## Helm

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install otel-collector open-telemetry/opentelemetry-collector --set mode=deployment --values values.yaml
```

## OpenTelemetry Operator

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
