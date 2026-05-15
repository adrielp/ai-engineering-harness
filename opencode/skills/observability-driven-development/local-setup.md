# Local OTel Stack — Aspire Dashboard

The fastest local setup is the standalone Aspire dashboard via Docker. It
embeds an OTel-compatible OTLP receiver and a UI for traces, metrics, and
logs at `http://localhost:18888`.

## Quick Start

```bash
docker run --rm -it -d \
  --name aspire-dashboard \
  -p 18888:18888 \
  -p 4317:18889 \
  -p 4318:18890 \
  -p 18891:18891 \
  -e ASPNETCORE_URLS=http://0.0.0.0:18888 \
  -e ASPIRE_DASHBOARD_MCP_ENDPOINT_URL=http://0.0.0.0:18891 \
  -e DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true \
  -e DASHBOARD__TELEMETRYLIMITS__MAXLOGCOUNT=1000 \
  -e DASHBOARD__TELEMETRYLIMITS__MAXTRACECOUNT=1000 \
  -e DASHBOARD__TELEMETRYLIMITS__MAXMETRICSCOUNT=1000 \
  mcr.microsoft.com/dotnet/aspire-dashboard:latest
```

> **Why `0.0.0.0` and not `+`?** `+` is a Kestrel binding wildcard and works
> for binding the listener, but it isn't a valid URI host. The dashboard's
> deep-link builder (`Aspire.Dashboard.Model.Assistant.AIHelpers.GetDashboardUrl`)
> parses `ASPNETCORE_URLS` / `ASPIRE_DASHBOARD_MCP_ENDPOINT_URL` as URIs, so a
> `+` host throws `UriFormatException` on every MCP `tools/call` even though
> the dashboard UI loads fine. Use `0.0.0.0` (bind on all interfaces) or
> `localhost` (loopback only). Also note: `DOTNET_DASHBOARD_MCP_ENDPOINT_URL`
> is silently ignored on recent Aspire images — only
> `ASPIRE_DASHBOARD_MCP_ENDPOINT_URL` is honoured for the MCP endpoint, while
> the unsecured-anonymous flag uses the `DOTNET_` prefix.

| Port mapping | What it is |
|---|---|
| `18888:18888` | Dashboard UI (browse to `http://localhost:18888`) |
| `4317:18889` | OTLP/gRPC receiver (point your SDK here) |
| `4318:18890` | OTLP/HTTP receiver |
| `18891:18891` | MCP endpoint (see caveat below) |

Stop the dashboard with `docker stop aspire-dashboard`.

## Pointing Your SDK At It

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
# Or HTTP:
# export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

For language-specific SDK setup (resource attributes, batching, log/metric
exporters), route to **`otel_instrumentation`**.

## Aspire MCP Integration (Preferred When Working)

When the Aspire MCP endpoint is reachable, an AI agent can query traces and
metrics directly via MCP tool calls instead of scraping the UI.

Default endpoint: `http://localhost:18891`. Auth in dev: unsecured (we set
`DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` above).

The harness ships a disabled-by-default `aspire-dashboard` MCP entry in
`claude/.mcp.json` and `opencode/opencode.json`. Enable it after starting the
dashboard:

```jsonc
// claude/.mcp.json
{
  "mcpServers": {
    "aspire-dashboard": {
      "type": "http",
      "url": "http://localhost:18891",
      "disabled": false   // flip from true
    }
  }
}
```

### Known Bug — Standalone Docker MCP

Historically [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733)
reported the MCP icon showing in the UI but the endpoint failing with
`fetch failed` against the standalone Docker image. On recent images the
real symptom is `UriFormatException` thrown from
`Aspire.Dashboard.Model.Assistant.AIHelpers.GetDashboardUrl` on every MCP
`tools/call` — the deep-link builder rejects the `+` Kestrel wildcard host.
The Quick Start command above sets both `ASPNETCORE_URLS` and
`ASPIRE_DASHBOARD_MCP_ENDPOINT_URL` to `http://0.0.0.0:...`, which fixes the
deep-link builder and makes the MCP reliable against the bare Docker image.

If you still see MCP failures after applying the env vars above, fall back
to the alternatives below.

**Fallback strategy when MCP is broken:**

1. Use the dashboard UI directly (`http://localhost:18888`) — copy traceIDs,
   inspect span trees, eyeball attributes.
2. Capture OTLP HTTP exports by running a parallel collector that mirrors
   exports to a JSON file (route to `otel_collector` for the
   `file` exporter recipe).
3. Use the dashboard's REST API for trace listing if the version exposes one
   (varies by image tag).

`/validate_telemetry` will detect when MCP is unreachable and degrade to the
fallbacks automatically. Validation logic lives in the ODD `SKILL.md`
Validation section.

## Alternative Local Stacks

| Stack | When to prefer |
|---|---|
| Aspire dashboard (recommended) | Single-binary, agent-friendly, MCP path |
| Jaeger + Prometheus + Grafana | Already running, want long retention |
| SigNoz / OpenObserve / Tempo | Production-mirror in dev |

The ODD loop works against any of them; only the inspection commands change.
For non-Aspire stacks, route the receiver/exporter wiring to
**`otel_collector`**.

## DevContainer Tip

For repeatable team setup, add a `docker-compose.yml` service for the Aspire
dashboard alongside your app, with the same port mapping above. The harness
does not ship this file — projects own their compose surface.
