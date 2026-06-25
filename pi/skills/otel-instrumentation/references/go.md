# Go Setup Guide

## Install

```bash
go get go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk go.opentelemetry.io/otel/sdk/metric \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc \
  go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

## SDK Bootstrap

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

## Custom Spans

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
