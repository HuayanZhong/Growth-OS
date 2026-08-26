---
alwaysApply: false
description: Compression rule (Express + compression): threshold 1KB; SSE endpoints excluded via Content-Type check (includes, not ===); compression.filter is the default fallback. Use when modifying compression or SSE behavior.
---

# Compression Middleware

**When to use**: when modifying compression behavior, debugging SSE buffering, or adding new middleware.

**Key points**:

1. **Threshold 1024 bytes**: only compresses responses ≥1KB. Smaller responses compress poorly (gzip header overhead ~200 bytes).
2. **SSE exclusion**: `filter` callback checks `res.getHeader('Content-Type')` for `text/event-stream` (uses `includes`, not `===`). Browser Accept headers are `text/event-stream, text/plain` — exact match never works. Content-Type is checked first (the actual response type); Accept is the fallback (controller hasn't written headers yet).
3. **`compression.filter` fallback**: if the request is not SSE, delegate to the default `compression.filter` (respects `Cache-Control: no-transform`, etc.).
4. **Registration order**: `app.use(compressionMiddleware())` must come before route registration in `main.ts`, otherwise middleware won't intercept requests.
5. **Return type**: `ReturnType<typeof compression>` — explicit annotation needed to avoid TS2883 (portable type inference error with Express types).

**Example**:

```ts
// main.ts
app.use(compressionMiddleware())  // before routes

// middleware
export function compressionMiddleware(): ReturnType<typeof compression> {
  return compression({
    threshold: 1024,
    filter: (req, res) => {
      const resHeader = res.getHeader('Content-Type')
      if (typeof resHeader === 'string' && resHeader.includes('text/event-stream')) return false
      const accept = req.headers.accept
      if (typeof accept === 'string' && accept.includes('text/event-stream')) return false
      return compression.filter(req, res)
    },
  })
}
```

**Verification**:

```bash
# Compressed response has Content-Encoding: gzip
curl -H "Accept-Encoding: gzip" http://localhost:4000/api/v1/health/liveness -v
# SSE endpoint has no Content-Encoding
curl -H "Accept: text/event-stream" http://localhost:4000/api/v1/ai/chat -v
```
