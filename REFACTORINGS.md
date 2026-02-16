# Refactoring Backlog (Maintainability + Adapter Authoring)

## Audit baseline

- Date: 2026-02-16.
- Current quality gates are green: `pnpm test`, `pnpm typecheck`, `pnpm lint`.
- Core behavior is mostly correct, but maintainability risk is concentrated in adapter code paths and docs consistency.
- Manual runtime check (Next App Router playground) shows semantically valid but confusing duplicate `Vary` header lines (`vary: ...` plus `vary: Accept`) due middleware and endpoint/header layering.

## Refactoring goals

- Keep adapters thin, predictable, and easy to copy for unsupported frameworks.
- Eliminate duplicated logic across adapters.
- Make Next integration behavior explicit and configurable.
- Align docs/playgrounds with the actual supported integration patterns.
- Add runtime-level smoke coverage so integration regressions are caught before release.

## P0 (do first)

### P0.1 Extract shared adapter primitives

Problem:

- Path matching and normalization logic is duplicated in:
  - `packages/adapters/express/src/index.ts`
  - `packages/adapters/next/src/shared.ts`
- `TransformFetchResponseOptions` projection is duplicated in:
  - `packages/adapters/next/src/internal.ts`
  - `packages/adapters/next/src/route-handler.ts`
  - `packages/adapters/express/src/index.ts`

Refactor:

- Add a shared internal package/module (for example `@web-markdown/adapter-kit`) with:
  - path pattern matching (`string | RegExp | fn`, glob support, include/exclude policy),
  - request/response header bridging helpers,
  - one `toTransformOptions` helper.

Acceptance criteria:

- No duplicated `normalizePathname`/`globToRegExp` implementations across adapters.
- Adapters depend on shared helpers, not copy-pasted utilities.
- Shared helper test suite covers include/exclude/glob behavior once.

### P0.2 Split Express adapter into composable units

Problem:

- `packages/adapters/express/src/index.ts` combines path filtering, header conversion, stream capture, transform orchestration, and final response writeback in one file (~400 lines).

Refactor:

- Break into focused files:
  - `path-filter.ts`,
  - `headers.ts`,
  - `capture.ts`,
  - `middleware.ts`.
- Keep exported API unchanged.

Acceptance criteria:

- Public entrypoint remains `createExpressMarkdownMiddleware`.
- Stream-capture behavior remains identical under tests.
- New modules have targeted unit tests (not only end-to-end middleware tests).

### P0.3 Clarify and formalize Next rewrite strategy

Problem:

- Next integration currently mixes two concerns:
  - markdown transformation routing,
  - vary-safe passthrough routing for non-markdown requests.
- This behavior is correct but hard to reason about and currently shows duplicate `Vary` header lines in real responses.

Refactor:

- Introduce explicit routing strategy option (for example `rewriteMode`):
  - `markdown-only` (rewrite only when `Accept: text/markdown`),
  - `document-all` (current vary-safe behavior).
- Keep default behavior documented and justified.
- Normalize `Vary` header behavior as much as Next allows, and document what remains framework-controlled.

Acceptance criteria:

- Shared tests cover both rewrite modes.
- Playgrounds declare which rewrite mode they use.
- README explains why a user might pick one mode over the other.

### P0.4 Fix docs to match actual Pages Router integration

Problem:

- Root docs still describe a Pages Router `getServerSideProps` bridge page, while playground uses an API route bridge.
- This mismatch creates avoidable confusion for adopters.

Refactor:

- Update `README.md` to show the actual maintained Pages Router API route pattern.
- Keep one canonical snippet per router type and link directly to playground files.

Acceptance criteria:

- No contradictory Next setup guidance between root README and playground READMEs.
- Copy-paste snippets run against current playgrounds without structural changes.

### P0.5 Add an adapter-authoring contract document

Problem:

- There is no single “how to build your own adapter” contract; users must infer behavior from existing adapters.

Refactor:

- Add `docs/adapter-authoring.md` with:
  - required HTTP semantics checklist,
  - request/response mapping rules,
  - header handling rules (`Vary`, `Content-Length`, `ETag`, `Set-Cookie`),
  - buffering/oversize/stream fallback requirements,
  - observability reason mapping.

Acceptance criteria:

- All shipped adapters can be validated against the checklist.
- README links this doc as the starting point for third-party adapters.

### P0.6 Add runtime smoke tests for playground behavior

Problem:

- Unit tests pass, but framework-runtime integration regressions can still slip through.
- Recent issues (dev loop, content decoding behavior concerns, header layering confusion) were only discovered manually.

Refactor:

- Add smoke test scripts that:
  - start each playground,
  - run `curl` probes for key routes (`/`, markdown path, excluded path, non-HTML, redirect),
  - assert status/content-type/transform headers/vary behavior.
- Run in CI for at least Express + one Next mode.

Acceptance criteria:

- Smoke tests fail on regressions in negotiation behavior.
- Smoke tests are documented and runnable locally.

## P1 (after P0)

### P1.1 Clean converter public type surface

Problem:

- `packages/converters/src/types.ts` exposes types/options that are not part of the real runtime extension surface (`PreparedDocument`, `ConverterRuntimeContext`, `defaultStripSelectors`).

Refactor:

- Remove or internalize unused types/options.
- Keep only stable extension points in exported types.

Acceptance criteria:

- Public API docs match exported types exactly.
- No dead exported converter types remain.

### P1.2 Stabilize converter metadata/version reporting

Problem:

- Converter version is hardcoded in code (`"0.1.0"`), which can drift from package version.

Refactor:

- Inject package version at build time or read once from package metadata in build output.

Acceptance criteria:

- `X-Markdown-Converter` always matches package version in release artifacts.

### P1.3 Improve converter performance ergonomics

Problem:

- `NodeHtmlMarkdown` is instantiated per conversion call.

Refactor:

- Construct converter engine once per `DefaultHtmlToMarkdownConverter` instance.

Acceptance criteria:

- Output snapshots remain unchanged.
- Simple benchmark shows no regression and expected allocation reduction.

### P1.4 Improve observability parity for streamed Express fallbacks

Problem:

- Express early-flush passthrough currently bypasses `transformFetchResponse`, so fallback reason telemetry is weaker than fetch-path behavior.

Refactor:

- Emit adapter-level observation events for stream bypass paths with reason aligned to `streamed-unsupported`.

Acceptance criteria:

- Stream bypass scenarios are observable with explicit fallback reason.

## P2 (follow-up hardening)

### P2.1 Improve workspace dev/build ergonomics

Problem:

- Package runtime exports target `dist/*`, while tests compile against `src/*`; this can create stale-artifact confusion during local development across workspace packages.

Refactor:

- Adopt one clear policy:
  - source-first dev exports with conditional exports, or
  - mandatory pre-dev build hooks for playgrounds.
- Document the chosen policy.

Acceptance criteria:

- No manual “rebuild package first” surprises during normal playground development.

### P2.2 Package-level documentation completeness

Problem:

- Root README is dense; package-specific adapter/core docs are thin.

Refactor:

- Add short README per package with:
  - purpose,
  - API reference link,
  - minimal example,
  - gotchas.

Acceptance criteria:

- A user can understand one package without reading all repo docs.

## Recommended execution order

1. P0.1 shared adapter primitives.
2. P0.2 express split using shared primitives.
3. P0.3 next rewrite strategy formalization.
4. P0.4 docs alignment.
5. P0.5 adapter-authoring contract.
6. P0.6 smoke tests.
7. P1 and P2 items.

## Definition of done for this backlog

- Adapters read as thin glue around shared primitives plus framework bridge code.
- Third-party adapter authors have one clear contract and checklist.
- Next behavior tradeoffs are explicit and intentionally configurable.
- Documentation and playgrounds are consistent with each other.
- Runtime smoke tests complement unit tests to catch integration regressions early.
