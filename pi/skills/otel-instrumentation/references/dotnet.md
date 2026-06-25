# .NET Setup Guide

## Install

```bash
dotnet add package OpenTelemetry.Extensions.Hosting OpenTelemetry.Instrumentation.AspNetCore OpenTelemetry.Exporter.OpenTelemetryProtocol
```

## SDK Bootstrap

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService(
        serviceName: builder.Configuration["OTEL_SERVICE_NAME"] ?? "my-service",
        serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString()))
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter());
```
