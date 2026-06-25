# Sampling — Full Configs

## Head Sampling (Simple, Uniform)

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10
```

No access to full trace — cannot selectively keep errors or slow traces.

## Tail Sampling (Two-Tier Architecture)

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

## CRITICAL: Materialize RED Metrics BEFORE Sampling

Sampling discards data. Place `signaltometrics` before the sampler:

```yaml
traces/pre-sampling:
  receivers: [otlp]
  processors: [memory_limiter]
  exporters: [signaltometrics, loadbalancing]  # Metrics from ALL traces
```
