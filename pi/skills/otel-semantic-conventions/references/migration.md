# Migration: Legacy → Current

| Deprecated | Current | Status |
|---|---|---|
| `http.method` | `http.request.method` | Stable |
| `http.status_code` | `http.response.status_code` | Stable |
| `http.url` | `url.full` | Stable |
| `http.target` | `url.path` + `url.query` | Stable |
| `http.scheme` | `url.scheme` | Stable |
| `http.host` | `server.address` + `server.port` | Stable |
| `http.request_content_length` | `http.request.body.size` | Stable |
| `http.response_content_length` | `http.response.body.size` | Stable |
| `http.flavor` | `network.protocol.version` | Stable |
| `http.user_agent` | `user_agent.original` | Stable |
| `net.peer.name` / `net.host.name` | `server.address` | Stable |
| `net.peer.port` / `net.host.port` | `server.port` | Stable |
| `net.transport` | `network.transport` | Stable |
| `net.sock.peer.addr` | `network.peer.address` | Stable |
| `db.system` | `db.system.name` | Stable |
| `db.name` | `db.namespace` | Stable |
| `db.statement` | `db.query.text` | Stable |
| `db.operation` | `db.operation.name` | Stable |
| `db.sql.table` / `db.mongodb.collection` / `db.cassandra.table` | `db.collection.name` | Stable |
| `messaging.destination` | `messaging.destination.name` | Stable |
| `messaging.kafka.consumer_group` | `messaging.consumer.group.name` | Stable |

## Stability Levels

| Level | Meaning |
|---|---|
| **Stable** | Won't change. Safe for production. |
| **Experimental** | May break. Check each release. |
| **Deprecated** | Being removed. Migrate to replacement. |

## `_OTHER` Normalization

For enum-like attributes, map unknown values to `_OTHER` to prevent cardinality explosion:

```javascript
const KNOWN = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']);
const normalize = (m) => KNOWN.has(m.toUpperCase()) ? m.toUpperCase() : '_OTHER';
```

Apply to: `http.request.method`, `rpc.grpc.status_code`, `error.type` grouping.
