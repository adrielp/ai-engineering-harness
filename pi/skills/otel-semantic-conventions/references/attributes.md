# Common Attributes

## HTTP

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `http.request.method` | string | Yes | Normalize unknown → `_OTHER` |
| `http.response.status_code` | int | If available | |
| `url.path` | string | Yes | Parameterized: `/api/users/{id}` |
| `url.scheme` | string | Yes | `https` |
| `url.template` | string | Recommended | `/api/users/{id}` — use on metrics |
| `server.address` | string | Yes | |
| `server.port` | int | If non-default | |
| `error.type` | string | If error | Exception class or status code |
| `url.query` | string | No | **Strip by default** — sanitize if kept |
| `user_agent.original` | string | No | Truncate to 256 chars |
| `network.protocol.version` | string | No | `1.1`, `2` |

Known methods: `CONNECT DELETE GET HEAD OPTIONS PATCH POST PUT TRACE`. Everything else → `_OTHER`.

## Database

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `db.system.name` | string | Yes | `postgresql`, `mysql`, `redis`, `mongodb` |
| `db.operation.name` | string | Yes | `SELECT`, `INSERT`, `findOne` |
| `db.collection.name` | string | If applicable | Table/collection name |
| `db.namespace` | string | Yes | Database name |
| `db.query.text` | string | Opt-in | **Parameterized only — no values** |

## Messaging

| Attribute | Type | Required |
|---|---|---|
| `messaging.system` | string | Yes |
| `messaging.operation.type` | string | Yes |
| `messaging.destination.name` | string | Yes |
| `messaging.message.id` | string | If available |
| `messaging.consumer.group.name` | string | If applicable |
| `messaging.batch.message_count` | int | If batched |

## RPC

| Attribute | Type | Required |
|---|---|---|
| `rpc.system` | string | Yes |
| `rpc.service` | string | Yes |
| `rpc.method` | string | Yes |
| `rpc.grpc.status_code` | int | If gRPC |
| `server.address` | string | Yes |

## General

| Attribute | Context | Notes |
|---|---|---|
| `error.type` | Any errored operation | Exception class or HTTP status |
| `code.function.name` | Source-level tracing | |
| `enduser.id` | User-scoped ops | **Hashed/opaque ID only** |
