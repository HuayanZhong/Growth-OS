# Agent Note: Supabase connection mode

Status: implemented

## Problem

The MikroORM backend needs a Postgres connection string for Supabase. Three connection modes exist, and picking wrong breaks the app: direct connection (`db.<ref>.supabase.co:5432`), session pooler (`aws-<region>.pooler.supabase.com:5432`), and transaction pooler (`aws-<region>.pooler.supabase.com:6543`).

## Decision/Proposal

Use the **session pooler** string in `DATABASE_URL`. The app is a long-lived NestJS process, not serverless; MikroORM's pg driver relies on prepared statements and full session semantics, which session mode preserves.

## Alternatives considered

- **Direct connection** (`db.<ref>.supabase.co:5432`): the official recommendation for persistent backends, and migrations run over it. Rejected as the default: the free tier exposes direct only over IPv6, and the development machine has no IPv6 route (`getaddrinfo ENOTFOUND`). Revisit if deployment hosts gain IPv6.
- **Transaction pooler** (`:6543`): designed for serverless/edge workloads. Rejected: each transaction can land on a different upstream connection, breaking MikroORM prepared statements (`prepared statement "s0" does not exist`).

## Consequences

- `DATABASE_URL` must be a session pooler string; documented in [database.md](../../docs/server/database.md).
- Migrations and runtime share the same connection string — no separate `DIRECT_URL`/`DATABASE_URL` split (that pattern targets serverless runtimes).
- If a deployment host is IPv4-only without the IPv4 add-on, session pooler remains the correct choice; direct is preferred only once IPv6 is available.
