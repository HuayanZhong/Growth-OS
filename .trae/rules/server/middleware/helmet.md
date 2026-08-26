---
alwaysApply: false
description: Helmet rule (Express + helmet): CSP/COEP enabled in production HTTPS, disabled in dev/Electron; registration before routes; helmet adds X-Content-Type-Options, X-Frame-Options, etc. Use when modifying security headers or CSP policy.
---

# Helmet (Security Headers)

**When to use**: when modifying security headers, CSP policy, or debugging Electron compatibility issues.

**Key points**:

1. **Environment strategy**:
   - **Production (HTTPS)**: CSP enabled (`default-src 'self'`, `scriptSrc 'self'`, `styleSrc 'self' 'unsafe-inline'`); COEP enabled. Prevents XSS and side-channel attacks.
   - **Dev / Electron (file://)**: CSP and COEP disabled. Electron's preload scripts and inline styles break under CSP.
2. **Registration order**: `app.use(helmetMiddleware())` must come before route registration in `main.ts`.
3. **Default headers**: Helmet adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, etc. These are always active regardless of CSP setting.
4. **CSP customization**: when adding new inline scripts/styles (e.g. Swagger UI), update the CSP directives rather than disabling CSP entirely.

**Example**:

```ts
export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: isProd
      ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"] } }
      : false,
    crossOriginEmbedderPolicy: isProd,
  })
}
```

**Verification**:

```bash
# Response contains security headers
curl -I http://localhost:4000/api/v1/health/liveness
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
```
