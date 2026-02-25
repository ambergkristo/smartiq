# Legacy Cards Endpoint Migration Guide

## Goal

Move all consumers to:

- `GET /api/cards/nextRandom?language=&gameId=&topic=`

Production note:

- Since `2026-02-25`, `/api/cards/next` and `/api/cards/random` return `410 Gone` in `prod`.

## Endpoint Mapping

| Legacy endpoint | Canonical replacement | Notes |
| --- | --- | --- |
| `/api/cards/next?topicId=&topic=&difficulty=&sessionId=&lang=&v=` | `/api/cards/nextRandom?language=&gameId=&topic=` | `difficulty` and `v` are not used by canonical API. |
| `/api/cards/random?topic=` | `/api/cards/nextRandom?language=&gameId=&topic=` | Set explicit `language` and stable `gameId`. |

Parameter mapping:

- `topicId` or `topic` -> `topic` (optional).
- `sessionId` -> `gameId` (required).
- `lang` -> `language` (required; `en` or `et` when enabled).

## Request Examples

Legacy (dev/local migration testing only):

```bash
curl.exe -s "http://localhost:8081/api/cards/next?topicId=History&difficulty=1&sessionId=demo-1&lang=en&v=2"
curl.exe -s "http://localhost:8081/api/cards/random?topic=History"
```

Canonical:

```bash
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=en&gameId=demo-1&topic=History"
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=en&gameId=demo-2"
```

## Response Contract Notes

`/api/cards/nextRandom` returns deck contract fields:

- `cardId`
- `category`
- `topic`
- `language`
- `question`
- `options`
- `correct`
- `source`
- `explanation`

Clients relying on legacy `v=1` or `v=2` payload variants must adapt to this canonical shape.

## Error Handling

Expected API errors use the unified `/api/**` error contract (JSON object with status metadata).

Common migration-time errors:

- `400`: missing required params (`language`, `gameId`)
- `404`: no card available for requested filter
- `429`: rate limit exceeded

## Validation Checklist

- Run app flow using only `/api/cards/nextRandom`.
- Verify no legacy endpoint calls in browser/network logs.
- Run release gate before merge:
  - `npm run release:check`
