# Node.js Setup Guide

## Install

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc @opentelemetry/exporter-metrics-otlp-grpc \
  @opentelemetry/exporter-logs-otlp-grpc @opentelemetry/resources @opentelemetry/semantic-conventions
```

## SDK Bootstrap

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

## Custom Spans

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

## Custom Metrics

```typescript
import { metrics } from '@opentelemetry/api';
const meter = metrics.getMeter('my-service');

const requestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'Duration of HTTP server requests',
  unit: 's',
});
```
