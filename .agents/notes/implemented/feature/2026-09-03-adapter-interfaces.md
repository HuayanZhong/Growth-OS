# Agent Note: Capability adapter interfaces (2.1)

Status: implemented

## Problem

Iteration plan 2.1 called for four capability adapter interfaces (LLM/Storage/Auth/Shell) in `packages/types/src/adapters/` as the only coupling point between implementors and callers. The plan's LLM sketch referenced an undefined `LLMChunk` and omitted two domain-critical semantics: chat cancellation and the sign-up-with-email-confirmation flow (null session is not an error, per the auth flows rule).

## Decision

- Four type-only contract files, reusing established vocabulary instead of inventing parallel terms: `LLMMessage = Message` (the 2.3 four-role projection), `ShellAdapter.checkForUpdates` returns the existing `UpdateCheckResult` IPC type. Zero runtime code in the adapters — interfaces only, matching the 2.6 contract pattern.
- `LLMChatParams.signal?: AbortSignal` added beyond the sketch: the stop button is standard in chat UIs and apiFetch already threads signals; without it a streaming/chat call cannot be cancelled.
- `signUpWithPassword` returns `AuthSession | null`: null means "awaiting email confirmation" (a success path in the auth flows rule), not a failure — a boolean-or-throw design would misrepresent it.
- `StorageAdapter` content is `Uint8Array` (not Buffer): the types package is consumed by the renderer (DOM context) and Node alike.
- `ShellAdapter` carries an `isElectron` flag plus the IpcChannelMap surface, so callers branch "in shell vs web preview" through the adapter instead of probing `window.desktop` directly.
- Deliberately absent: error class hierarchies (implementors reject with their own errors; keeping the adapters runtime-free), streaming tool-call deltas (expressible via `chat` until a real need arrives).

## Alternatives considered

- Buffer for storage content: rejected — unusable in the DOM-context renderer without shims.
- A standalone `LLMMessage` type as sketched: rejected — identical shape to `Message`; two vocabularies for one concept is exactly the drift 2.3 eliminated.
- Runtime error types in the contract: rejected for now — error taxonomy belongs to implementations until callers demonstrate a cross-adapter branching need.

## Consequences

Callers and implementors both import only `@growth-os/types`. Swapping a provider (e.g. DeepSeek → OpenAI-compatible gateway) touches registration only. Adapter errors are not contractually shaped — callers catch `Error` generically until a need for typed errors emerges. Streaming tool calls remain out of contract scope.
