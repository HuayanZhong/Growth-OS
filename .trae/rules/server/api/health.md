---
alwaysApply: false
description: Health probe rule (NestJS + K8s): liveness (no deps, 200), readiness (DB ping, 503 on failure); readiness throws ServiceUnavailableException; DB ping has 5s timeout; probes skip auth and throttle. Use when adding health endpoints or modifying probe behavior.
---

# Health Probes (Liveness + Readiness)

**When to use**: when adding health endpoints, modifying probe behavior, or debugging K8s deployment issues.

**Key points**:

1. **Liveness** (`GET /api/v1/health/liveness`): no external dependencies, always returns 200. K8s restarts the Pod if this fails. Never add DB/network checks here.
2. **Readiness** (`GET /api/v1/health/readiness`): validates DB connectivity via `HealthService.checkDatabase()` (SELECT 1). On failure, throws `ServiceUnavailableException` → HTTP 503. K8s stops routing traffic to this Pod.
3. **Why 503, not 200 + error body**: K8s readiness probe checks only HTTP status codes (2xx = ready, 5xx = not ready). Returning 200 with `{ status: 'error' }` means the Pod still receives traffic — the probe is useless.
4. **DB ping timeout**: `Promise.race` with 5s `setTimeout`. If DB hangs (TCP half-open, connection pool exhausted), the probe returns in 5s instead of hanging forever. Timer is cleaned up in `finally` block.
5. **`@Public()` + `@SkipThrottle()`**: health probes are exempt from JWT auth and rate limiting (K8s/load balancers don't carry Bearer tokens; probes are polled every few seconds).
6. **`autoLogging.ignore`**: `/api/v1/health` is excluded from pino request logs (probes are high-frequency and would flood logs).
7. **Backward compatibility**: `GET /api/v1/health` maps to `readiness()` (same behavior).

**Example**:

```ts
@Get('readiness')
async readiness() {
  const db = await this.healthService.checkDatabase()
  if (db.status === 'disconnected') {
    throw new ServiceUnavailableException({
      code: 'SERVICE_UNAVAILABLE',
      message: '数据库连接异常',
    })
  }
  return { status: 'ok', db: 'connected', latencyMs: db.latencyMs }
}
```

**Verification**:

```bash
# Liveness always 200
curl http://localhost:4000/api/v1/health/liveness
# Readiness: 200 if DB up, 503 if down
curl http://localhost:4000/api/v1/health/readiness
```
