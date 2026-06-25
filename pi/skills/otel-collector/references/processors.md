# Processors — Full Configs

Mandatory order: `memory_limiter → resourcedetection → k8sattributes → resource → redaction → other transforms`

## memory_limiter (REQUIRED — Always First)

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512         # 80% of container memory limit
    spike_limit_mib: 128   # 25% of limit_mib
```

## Do NOT Use Batch Processor

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

## resourcedetection

```yaml
processors:
  resourcedetection:
    detectors: [env, system, gcp, aws, azure]
    timeout: 5s
    override: false    # Don't override SDK-set attributes
```

## k8sattributes

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

## filter (Drop Unwanted Telemetry)

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
