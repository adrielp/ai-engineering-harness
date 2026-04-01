---
name: otel_instrumentation
description: >
  Application-side OpenTelemetry SDK setup — traces, metrics, structured
  logging across Node.js, Go, Python, Java, .NET, Ruby. Prescriptive
  guidance for resource attributes, span design, metric instrument selection,
  sensitive data handling, and validation.
disable-model-invocation: true
allowed-tools: read_file, run_shell_command, search_file_content, glob, replace, write_file
---

# OpenTelemetry Application Instrumentation

You are an expert OpenTelemetry instrumentation engineer. Produce prescriptive, opinionated guidance — not tutorials. Every recommendation must be production-grade.

## Entrypoint: Detect → Scope → Act

### 1. Detect Language/Framework

| File | Language | Check for frameworks |
|---|---|---|
| `package.json` | Node.js | express, fastify, nestjs, next |
| `go.mod` | Go | gin, echo, fiber, net/http |
| `requirements.txt` / `pyproject.toml` | Python | flask, django, fastapi |
| `pom.xml` / `build.gradle` | Java | spring-boot, quarkus, micronaut |
| `*.csproj` | .NET | Microsoft.AspNetCore |
| `Gemfile` | Ruby | rails, sinatra |

### 2. Determine Scope

| Situation | Action |
|---|---|
| No OTel deps | Full SDK setup (§7) + all signals |
| SDK present, no custom instrumentation | Add custom spans/metrics/logs (§3–5) |
| Partial instrumentation | Audit, fill gaps, fix anti-patterns |
| Broken setup | Diagnose via validation checklist (§8) |

---

## 1. Resource Attributes (CRITICAL)

Resource attributes identify your service. This is the single highest-impact configuration for observability.

### Required

| Attribute | Source | Strategy |
|---|---|---|
| `service.name` | Package manifest or env var | `OTEL_SERVICE_NAME`. Never accept `unknown_service`. |
| `service.version` | Git | `git describe --tags --always` at build time. Never hardcode. |
| `deployment.environment.name` | Env var | `NODE_ENV`, `RAILS_ENV`, `FLASK_ENV`, `ASPNETCORE_ENVIRONMENT` |
| `service.instance.id` | Generated | UUID v4 at startup. Never use hostname (not unique in k8s). |
| `service.namespace` | Convention | Logical grouping: `payments`, `auth`, `catalog` |

### Environment Variables

```bash
OTEL_SERVICE_NAME=order-service
OTEL_RESOURCE_ATTRIBUTES=service.namespace=commerce,deployment.environment.name=production
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

### Kubernetes: Use Downward API

```yaml
env:
  - name: OTEL_SERVICE_NAME
    value: "order-service"
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: >-
      k8s.pod.name=$(POD_NAME),
      k8s.namespace.name=$(POD_NAMESPACE),
      k8s.node.name=$(NODE_NAME),
      service.namespace=commerce,
      deployment.environment.name=production
```

Set attributes at SDK level — do NOT rely solely on the Collector's `k8sattributes` processor.

---

## 2. Traces / Spans

### Naming: `{VERB} {OBJECT}`, Low Cardinality

| Protocol | Pattern | Example |
|---|---|---|
| HTTP server | `{METHOD} {route}` | `GET /api/users/{id}` |
| HTTP client | `{METHOD} {host}` | `GET api.stripe.com` |
| Database | `{OPERATION} {table}` | `SELECT orders` |
| Messaging producer | `{destination} publish` | `orders.created publish` |
| Messaging consumer | `{destination} process` | `orders.created process` |
| RPC | `{service}/{method}` | `UserService/GetUser` |
| Internal | `{component}.{action}` | `cache.lookup` |

**Never include IDs, query params, or request bodies in span names.**

### Span Kind

| Kind | When | Example |
|---|---|---|
| `SERVER` | Handling incoming remote request | HTTP handler, gRPC server |
| `CLIENT` | Making outgoing remote request | HTTP client, DB query, gRPC client |
| `PRODUCER` | Creating async message | Enqueue to Kafka/SQS |
| `CONSUMER` | Processing async message | Dequeue handler |
| `INTERNAL` | In-process, no remote I/O | Cache lookup, business logic |

### Status Code Rules

| Situation | Status | Set it? |
|---|---|---|
| Server 2xx/4xx | `UNSET` | No — 4xx is client error, not server error |
| Server 5xx | `ERROR` | Yes |
| Client receives 4xx/5xx | `ERROR` | Yes — your call failed |
| Unhandled exception | `ERROR` | Yes, with error details |
| Success | `UNSET` | No — **never set `OK`** |

### Exception Recording

Record exceptions in **logs with trace context**, not span events. The Span Event API is being phased out.

```javascript
// BAD: span.recordException(error);
// GOOD: Log with trace context
logger.error('Payment failed', {
  error: error.message,
  'error.stack': error.stack,
  'order.id': orderId,
});
```

### Span Hygiene

1. **No CLIENT root spans** — wrap outgoing calls in a SERVER or INTERNAL parent
2. **No orphan spans** — propagate context across async boundaries
3. **Limit INTERNAL spans to ~10/trace** — only business-significant operations
4. **Limit sub-1ms spans to ~20/trace** — rarely add diagnostic value
5. **Always use `AlwaysOn` sampler at SDK** — defer sampling to the Collector (see `otel_collector`)

---

## 3. Metrics

### Instrument Selection

| Measuring | Instrument | Unit | Example |
|---|---|---|---|
| Monotonic count | `Counter` | `{request}`, `{error}` | Requests, errors |
| Up-and-down count | `UpDownCounter` | `{connection}` | Active connections, queue depth |
| Value distribution | `Histogram` | `s`, `By` | Duration, response size |
| Point-in-time snapshot | `Gauge` | `%`, `{thread}` | CPU usage, memory |

### Naming

1. Check `otel_semantic_conventions` first
2. Dot-separated namespaces: `http.server.request.duration`
3. Never include unit in name (`duration` not `duration_seconds`)
4. UCUM units: `s`, `ms`, `By`, `{request}`

### Cardinality Management (CRITICAL)

Every unique attribute combination = a new time series. This is the #1 cost driver.

| Series/metric | Zone | Action |
|---|---|---|
| < 100 | Safe | — |
| 100–1K | Caution | Review attributes |
| 1K–10K | Danger | Remove high-cardinality attrs |
| > 10K | Critical | Immediate fix |

**Hard rules:**
- Never use user IDs, request IDs, or trace IDs as metric attributes
- Never use unbounded strings (URLs, error messages) as metric attributes
- Limit enum attrs to <20 values; use `_OTHER` for long tail
- Use `url.template` not `url.path` on metrics

### RED Pattern

One `Histogram` with these attributes covers Rate, Errors, and Duration:
- `http.request.method`, `http.response.status_code`, `url.template`, `error.type`

---

## 4. Structured Logging

### Rules

1. **Structured key-value pairs only** — never string interpolation
2. **Inject trace context** — `trace_id` + `span_id` in every log line
3. **stdout only** — let infrastructure route logs
4. **Single-line JSON** for machine parsing

### Trace Correlation

```javascript
// Node.js (pino)
const logger = pino({
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    return { trace_id: ctx.traceId, span_id: ctx.spanId, trace_flags: ctx.traceFlags };
  },
});
```

```go
// Go (slog)
func LogWithTrace(ctx context.Context, logger *slog.Logger, msg string, attrs ...slog.Attr) {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        attrs = append(attrs,
            slog.String("trace_id", span.SpanContext().TraceID().String()),
            slog.String("span_id", span.SpanContext().SpanID().String()),
        )
    }
    logger.LogAttrs(ctx, slog.LevelInfo, msg, attrs...)
}
```

```python
# Python (structlog)
def add_trace_context(logger, method_name, event_dict):
    span = trace.get_current_span()
    if span.get_span_context().is_valid:
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict
```

### Severity Levels

| Level | Use when |
|---|---|
| `DEBUG` | Developer diagnostics |
| `INFO` | Normal operation, business milestones |
| `WARN` | Unexpected but recoverable |
| `ERROR` | Failed operations needing attention |
| `FATAL` | About to crash |

### Stack Traces

Always single-line JSON — never multi-line:

```javascript
logger.error('Operation failed', {
  'exception.type': error.constructor.name,
  'exception.message': error.message,
  'exception.stacktrace': error.stack.replace(/\n/g, '\\n'),
});
```

---

## 5. Sensitive Data Prevention (CRITICAL)

### Never-Instrument List

| Category | Examples |
|---|---|
| Credentials | Passwords, API keys, tokens, secrets, private keys |
| Financial | Credit card numbers, bank accounts, CVVs |
| Government IDs | SSN, passport, driver's license |
| Health records | Diagnoses, medications, test results |
| Authentication | Session tokens, JWTs, OAuth tokens |

### Sanitization Rules

- **URLs**: Strip query params. Use `url.path` + `url.scheme` + `server.address`, not `http.url`
- **DB statements**: Parameterized form only: `SELECT * FROM users WHERE id = ?`
- **Headers**: Never capture `authorization`, `cookie`, `set-cookie`

### SpanProcessor Redaction (Safety Net)

```javascript
class RedactingSpanProcessor {
  onEnd(span) {
    const sensitive = ['password', 'token', 'secret', 'authorization', 'cookie', 'credit_card'];
    for (const [key, value] of Object.entries(span.attributes)) {
      if (sensitive.some(k => key.toLowerCase().includes(k))) {
        span.attributes[key] = '[REDACTED]';
      }
    }
  }
  onStart() {}
  shutdown() { return Promise.resolve(); }
  forceFlush() { return Promise.resolve(); }
}
```

For Collector-side redaction as defence-in-depth, see `otel_ottl`.

---

## 6. Language Setup Guides

### Node.js

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc @opentelemetry/exporter-metrics-otlp-grpc \
  @opentelemetry/exporter-logs-otlp-grpc @opentelemetry/resources @opentelemetry/semantic-conventions
```

```typescript
// instrumentation.ts — load BEFORE application code via --require or --import
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { randomUUID } from 'crypto';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'my-service',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || 'unknown',
    'service.instance.id': randomUUID(),
    'deployment.environment.name': process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 60_000,
  }),
  logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter()),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown().then(() => process.exit(0)).catch(() => process.exit(1)));
```

```bash
node --require ./instrumentation.ts src/index.ts
# ESM: node --import ./instrumentation.ts src/index.ts
```

**Custom spans:**
```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer('my-service');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('process order', async (span) => {
    try {
      span.setAttribute('order.id', orderId);
      return await doWork();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Custom metrics:**
```typescript
import { metrics } from '@opentelemetry/api';
const meter = metrics.getMeter('my-service');

const requestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'Duration of HTTP server requests',
  unit: 's',
});
```

### Go

```bash
go get go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk go.opentelemetry.io/otel/sdk/metric \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc \
  go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

```go
func Setup(ctx context.Context) (func(context.Context) error, error) {
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(os.Getenv("OTEL_SERVICE_NAME")),
            semconv.ServiceVersion(os.Getenv("SERVICE_VERSION")),
            semconv.DeploymentEnvironmentName(os.Getenv("ENVIRONMENT")),
            semconv.ServiceInstanceID(uuid.New().String()),
        ),
    )
    if err != nil { return nil, err }

    traceExp, _ := otlptracegrpc.New(ctx)
    tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(traceExp), sdktrace.WithResource(res))
    otel.SetTracerProvider(tp)

    metricExp, _ := otlpmetricgrpc.New(ctx)
    mp := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(metricExp, metric.WithInterval(60*time.Second))),
        metric.WithResource(res),
    )
    otel.SetMeterProvider(mp)

    return func(ctx context.Context) error {
        if err := tp.Shutdown(ctx); err != nil { return err }
        return mp.Shutdown(ctx)
    }, nil
}
```

**Custom spans:**
```go
tracer := otel.Tracer("my-service")

func ProcessOrder(ctx context.Context, orderID string) error {
    ctx, span := tracer.Start(ctx, "process order")
    defer span.End()
    span.SetAttributes(attribute.String("order.id", orderID))

    if err := doWork(ctx); err != nil {
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    return nil
}
```

### Python

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # Auto-detect instrumentations
```

```python
resource = Resource.create({
    "service.name": os.getenv("OTEL_SERVICE_NAME", "my-service"),
    "service.version": os.getenv("SERVICE_VERSION", "unknown"),
    "service.instance.id": str(uuid.uuid4()),
    "deployment.environment.name": os.getenv("ENVIRONMENT", "development"),
})

tp = TracerProvider(resource=resource)
tp.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(tp)

reader = PeriodicExportingMetricReader(OTLPMetricExporter(), export_interval_millis=60000)
mp = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(mp)
```

**Or zero-code:** `opentelemetry-instrument python app.py`

**Custom spans:**
```python
tracer = trace.get_tracer("my-service")

@tracer.start_as_current_span("process order")
def process_order(order_id: str):
    span = trace.get_current_span()
    span.set_attribute("order.id", order_id)
```

### Java

**Recommended: Java agent (zero-code):**
```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=my-service \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
  -jar my-app.jar
```

**Custom spans:**
```java
Tracer tracer = GlobalOpenTelemetry.getTracer("my-service");
Span span = tracer.spanBuilder("process order").startSpan();
try (Scope scope = span.makeCurrent()) {
    span.setAttribute("order.id", orderId);
    doWork();
} catch (Exception e) {
    span.setStatus(StatusCode.ERROR, e.getMessage());
    throw e;
} finally {
    span.end();
}
```

### .NET

```bash
dotnet add package OpenTelemetry.Extensions.Hosting OpenTelemetry.Instrumentation.AspNetCore OpenTelemetry.Exporter.OpenTelemetryProtocol
```

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService(
        serviceName: builder.Configuration["OTEL_SERVICE_NAME"] ?? "my-service",
        serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString()))
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter());
```

### Ruby

```bash
gem install opentelemetry-sdk opentelemetry-exporter-otlp opentelemetry-instrumentation-all
```

```ruby
OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch('OTEL_SERVICE_NAME', 'my-service')
  c.service_version = ENV.fetch('SERVICE_VERSION', 'unknown')
  c.use_all
end
```

---

## 7. Validation Checklist

### Pre-Flight

```bash
env | grep OTEL_
curl -sf http://otel-collector:4317 || echo "Collector unreachable (gRPC)"
curl -sf http://otel-collector:4318/v1/traces || echo "Collector unreachable (HTTP)"
# Protocol must match: grpc→:4317, http/protobuf→:4318
```

### Backend Checks

| Check | Expected |
|---|---|
| Service discovered | Correct `service.name` visible |
| Resource attributes | All 5 required attrs present |
| Span names | Low-cardinality `{verb} {object}` |
| Trace-log correlation | Logs appear with matching `trace_id` |
| Metrics visible | `http.server.request.duration` with correct attrs |

### Signal Validation

**Traces:** correct `kind`, no orphans, `ERROR` only on failures, parameterized names
**Metrics:** bounded cardinality (<1K series/metric), correct units, no duplicate names
**Logs:** `trace_id`+`span_id` present, structured JSON, correct severity, no sensitive data

---

## Cross-References

- Attribute naming → `otel_semantic_conventions`
- Collector config → `otel_collector`
- Collector-side transforms/redaction → `otel_ottl`
