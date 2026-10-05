# Executable locked synthetic evaluation runner

**Version:** `hair-locked-fake-runner-v2`  
**Updated:** 2026-10-02  
**Scope:** `synthetic_locked_fake_execution`; scoped PROTO-006 evidence only

`packages/ai/src/locked-fake-runner.ts` connects the [locked evaluation record contracts](EVALUATION-RECORDS.md) to actual calls of the existing `FakeHairstyleImageProvider`. It accepts no provider object, callback, clock, reader, path, URL, credential, arbitrary descriptor, or live image. The only provider is constructed internally for each attempt. The runner has no image I/O or network path.

## Locked input and preflight

The exact input is `{ plan, plan_sha256, registry }`. The plan must pass the existing exact schema/reconciliation validator, bind its canonical SHA-256, use stage `H0`, and match the fixed simulation-version fingerprint. `code_revision_sha256` is deliberately a fingerprint of `{ runner: "hair-locked-fake-runner-v2", provider: "deterministic-v1" }` in this scoped fixture. It is **not** a Git commit or verified source checkout. External/live execution will require real code-revision attestation.

The registry is an exact array of `{ artifact_id, content }` records. All IDs use opaque hexadecimal namespaces. Every asset/case/configuration artifact must exist and reproduce its canonical content hash before the first provider call. Duplicate, missing, unused, wrong-kind, unknown-field, private, accessor, hidden, symbol, sparse-array, or custom-prototype records are denied generically. A registry contains only these closed recipes:

| Recipe | Permitted content and binding |
|---|---|
| Synthetic asset | `opaque_metadata_v1` plus locked source/reference asset ID, role, subject ID, and empty parent list; asset content and synthetic registry-manifest hashes are verified |
| Specification | One of the eight protocol transformation classes plus SHA-256 of the **entire expanded compiled HairSpecification**, including defaults and preserve attributes |
| Prompt inputs | The same expanded specification hash plus exact source/reference IDs and fixed prompt version, strategy, and quality |
| Generation parameters | A fixed enum selecting success, partial, rejection, timeout, rate limit, provider error, timeout-then-success, or rate-limit-then-success |
| Model, policy, prompt, conversion, preprocessing, terms | A fixed kind/value pair for the one supported simulation profile |

Synthetic asset hashes cover JSON metadata recipes, not portraits, decoded media, or licensed bytes. Their registry-manifest hashes do not imply provenance authorization. Compiled specification templates contain only safe predefined hair attributes. Callers cannot supply raw prompts or customer descriptors. Imported domain defaults are detached privately at module initialization, and every request, expanded specification, and preserve array is frozen before invocation. Specification and prompt locks bind their expanded values before execution; the request hash is computed before `edit` and retained in the receipt. Mutation of external defaults or the request across asynchronous calls cannot alter later requests.

## Supported configuration

Every complete configuration field is resolved or checked before invocation. This version accepts exactly:

- the fixed opaque fake-provider and synthetic pricing IDs, `local` region, `deterministic-v1` model;
- synthetic-only moderation, compiled-attribute conversion, prompt, metadata preprocessing, and no-transfer/no-spend terms recipes;
- `prompt_only` with no segmentation, masks, protected regions, dilation, feather, or manual edits;
- metadata output profile 512 × 512, PNG, medium quality, opaque background, and compression 100;
- three previews, 100 ms virtual timeout, transient-only retries, maximum two attempts, concurrency one, and one opaque key per attempt;
- unsupported seed explicitly recorded as null; fixed terms snapshot date `2026-10-02T00:00:00.000Z`.

Other values fail closed, even if someone recomputes the plan/artifact hashes. Output size/format/compression, moderation, terms, and preprocessing are explicit **simulation profile constraints**; the current provider request interface cannot implement actual media processing for them. Unsupported mask/protected-region configurations are refused because the fake provider does not implement those operations. This module does not claim general provider configuration replay.

## Executable evidence

Each locked slot runs through the invocation scheduler: case blocks are sorted by opaque case ID, groups within each block use the protocol SHA-256 key, and previews use numeric variant order. Stored plan-array order does not control execution. Retries finish with their logical slot before the next slot starts. Invocation identity derives from plan hash, slot ID, and attempt index; every attempt receives unique opaque attempt/idempotency/record IDs. The actual provider request includes its locked source/reference, expanded specification, strategy, quality, prompt version, and a variant-bound fake idempotency key. Each invocation receipt binds request/configuration hashes, scenario, fake model/provider, and virtual timing.

Success responses require exact fields, request correlation, fixed provider/model/provenance/duration, a fake handle, and exact synthetic usage units. Unknown fields, malformed usage, mismatched outcome/scenario, and nonprovider errors cannot enter output. Failure code and retryability require own data properties and are snapshotted once; no error message, stack, or raw exception is exported. Only declared provider failure/rate limit/timeout conditions retry. Policy rejection and success settle the slot. Every failed attempt remains in append order before its retry.

Time is a serial virtual clock starting at plan freeze: success/failure/rejection use 25 ms, and timeout uses the full configured 100 ms. No wall-clock latency claim is made. Success usage units are estimated synthetic values; failure usage is unavailable. The fake provider's zero-dollar field is checked for implementation consistency but not exported as pricing/spend evidence. No billed-usage correction is fabricated; the record-contract module retains support for later genuine append-only corrections.

Success emits an output sidecar whose `content_sha256` hashes a synthetic metadata object containing the fake handle and request/configuration hashes. It is explicitly **not an image-byte hash**. Geometry/format are simulated profile metadata, and `candidate` remains the existing unevaluated output disposition. No output is decoded, displayed, moderated, rated, or declared usable here.

The finished bundle is revalidated against the locked plan, all attempts/retries, and all outputs. Report fields explicitly state `timing: virtual_serial`, `output_hash_basis: synthetic_metadata_not_image_bytes`, `live_evidence_present: false`, and `technical_image_gate_status: NOT_EVALUATED`, with fixed image-decoding, image-quality, live-authority, registry-authorization, pricing, and release-gate exclusions.

`validateLockedFakeRunReport` and `serializeLockedFakeRunReport` revalidate the safe input, rerun the fixed internal fake execution, and compare every report field against that execution. Static assertions alone do not suffice: validation executes a new fake run and accepts only a report exactly matching its evidence. A precomputed identical report can pass; replay proves validation-time fake execution, not the report's historical origin. Modified sidecars/receipts/flags or private unknown fields are denied, including when their hashes are recalculated. Validation is asynchronous because it executes the fake provider again. This is trusted local test-runner provenance, not a cryptographic signature or protection against hostile code replacing classes/modules inside the same process.

## Deterministic fixture and checks

`tests/evals/build-locked-fake-fixture.mjs` reproduces the metadata-only input fixture without an image or provider call. The fixture covers eight transformation cases, eight synthetic subjects, an optional shared reference recipe, and all eight supported scenario recipes. It declares 24 slots. Executable tests produce 40 invocations, retain 16 retries, and emit 11 synthetic output sidecars: 11 success, 17 failed, nine timeout, and three rejection attempts. These counts are scoped exercises, **not the protocol's complete 32-case H0 stage**.

`locked-fake-runner.golden.json` locks input, plan, complete bundle, and report hashes plus those counts. The tests execute actual fake calls and compare the generated evidence to the golden; the golden contains no private image, prompt, or media locator. Adversarial checks cover registry and configuration drift, recomputed semantically invalid locks, pre-call denial with zero invocations, hostile JSON shapes, compiled-input drift, attempted request mutation, malformed provider evidence, failure getters, edited reports, and safe replay serialization.

```text
node tests/evals/build-locked-fake-fixture.mjs
node node_modules/vitest/vitest.mjs run packages/ai/src/locked-fake-runner.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
node scripts/check-repository-safety.mjs
```

The first command rewrites only the synthetic input fixture; tests never refresh the golden automatically. Intentional runner/profile changes require review of regenerated evidence and updating its version/locks where appropriate.

Remaining gates include full stage/comparison/cohort coverage; real source-revision and registry authorization; actual image/mask/preprocessing/output decoding; full worker cancellation and malformed-output processing; qualified blinded-viewer assignments; pricing and spend controls; blinded ratings/adjudication; calibrated signals and gate calculations; approved adult assets and live provider adapters. This runner makes no release decision.

## Reviewed checkpoint — 2026-10-02

Review hardened full compiled-input locks, immutable requests across asynchronous calls, and failure-property snapshots. Independent adversarial verification passed all 49 focused tests and reported no outstanding P1/P2 after repair and the provenance wording clarification above. Root verification passed all 253 repository tests, AI/service-integration/web TypeScript checks, and the repository safety scan; the fixture builder reproduced identical bytes. Browser evidence remains the earlier 76-check checkpoint because this change has no browser-facing behavior.

## Scheduled execution checkpoint — 2026-10-02

Version 2 consumes the deterministic invocation schedule before calls start.
Its simulation fingerprint, reproducible input fixture, and golden hashes were
regenerated; version 1 locks are rejected. Independent review passed all 51
runner tests, including actual provider-call ordering with multiple configuration
and repetition groups after plan-array reversal. Retries remain attached to their
logical slot, and all receipts bind the current plan hash. No material P1/P2
remains in this integration. The integrated checkpoint passed 375 repository
tests and domain/AI/service/web TypeScript checks. Scope still excludes real
media, provider authorization, billing, human ratings, and release clearance.
