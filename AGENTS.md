# AGENTS

## Purpose
This repository builds a framework-agnostic HTML-to-Markdown negotiation toolchain.

## Collaboration Rules
- Keep framework connectors thin. Shared negotiation and response gating belong in `@web-markdown/core` and `@web-markdown/transform-fetch`.
- Preserve HTTP semantics first: status codes, caching headers, and `Vary: Accept` behavior are non-negotiable.
- Keep converter behavior deterministic so snapshots remain stable.
- Prefer typed public APIs and small composable functions over framework-specific logic.

## Package Ownership
- `packages/core`: Accept negotiation, vary merging, shared types.
- `packages/transform-fetch`: Request/Response transformer with gating + buffering limits.
- `packages/converters`: Default HTML->Markdown converter and hooks.
- `packages/adapters/*`: Thin adapters only.
- `playground/*`: Minimal runnable demos.

## Quality Gates
- Add/maintain unit tests for HTTP semantics and conversion behavior.
- Snapshot tests must be intentional and reviewable.
- Avoid breaking existing HTML behavior for non-markdown requests.
