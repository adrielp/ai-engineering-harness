# OTTL Function Reference

## Editors (Mutate Data)

| Function | Purpose |
|---|---|
| `set(target, value)` | Set value |
| `delete_key(map, key)` | Remove key |
| `delete_matching_keys(map, pattern)` | Remove keys by glob |
| `keep_keys(map, keys...)` | Keep only listed keys |
| `truncate_all(map, limit)` | Truncate all string values |
| `limit(map, count)` | Cap key count |
| `replace_match(target, glob, replacement)` | Glob replace |
| `replace_pattern(target, regex, replacement)` | Regex replace |
| `replace_all_matches(map, glob, replacement)` | Glob replace all values |
| `replace_all_patterns(map, mode, regex, replacement)` | Regex replace all values |
| `merge_maps(target, source, strategy)` | Merge maps (upsert/insert/update) |
| `flatten(target)` | Flatten nested map |
| `copy(target, source)` | Copy value |

## Converters — Type

| Function | Returns |
|---|---|
| `IsString`, `IsInt`, `IsDouble`, `IsBool`, `IsMap` | bool |
| `IsMatch(target, pattern)` | bool (regex) |
| `HasAttrKeyOnDatapoint(key)` | bool |
| `Int`, `Double`, `String`, `Bool` | Converted type |

## Converters — String

| Function | Purpose |
|---|---|
| `Concat(values[], delim)` | Join |
| `Split(target, delim)` | Split |
| `Substring(target, start, len)` | Extract |
| `ConvertCase(target, case)` | lower/upper/snake/camel |
| `Trim`, `TrimLeft`, `TrimRight` | Whitespace |

## Converters — Hashing

`SHA1`, `SHA256`, `FNV`, `MD5` — use for PII-free correlation:
```yaml
- set(attributes["user.hash"], SHA256(attributes["user.email"])) where attributes["user.email"] != nil
- delete_key(attributes, "user.email")
```

## Converters — Parsing

| Function | Purpose |
|---|---|
| `ParseJSON(value)` | JSON string → map |
| `ParseCSV(target, header)` | CSV → map |
| `ParseKeyValue(target)` | key=value → map |
| `ExtractPatterns(target, regex)` | Named groups |
| `SpanID(bytes)`, `TraceID(bytes)` | ID conversion |

## Converters — Time

`Now()`, `UnixNano()`, `Duration("5m")`, `Time(string, layout)`, `TruncateTime(time, duration)`

## Converters — Collections

`Len(value)`, `append(target, values...)`, `Slice(target, start, end)`
