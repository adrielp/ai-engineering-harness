# Ruby Setup Guide

## Install

```bash
gem install opentelemetry-sdk opentelemetry-exporter-otlp opentelemetry-instrumentation-all
```

## SDK Bootstrap

```ruby
OpenTelemetry::SDK.configure do |c|
  c.service_name = ENV.fetch('OTEL_SERVICE_NAME', 'my-service')
  c.service_version = ENV.fetch('SERVICE_VERSION', 'unknown')
  c.use_all
end
```
