# Python Setup Guide

## Install

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # Auto-detect instrumentations
```

## SDK Bootstrap

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

## Custom Spans

```python
tracer = trace.get_tracer("my-service")

@tracer.start_as_current_span("process order")
def process_order(order_id: str):
    span = trace.get_current_span()
    span.set_attribute("order.id", order_id)
```
