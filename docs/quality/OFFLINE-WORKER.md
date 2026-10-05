# Closed offline worker preflight

**Version:** `hair-offline-worker-v1`  
**Scope:** `PROTO-008`, executable synthetic worker lifecycle and bounded output decoding  
**Image-quality and release gates:** `NOT_EVALUATED`

`packages/service/src/offline-generation-worker.ts` connects an internally
constructed deterministic fake provider to the private service simulator and a
private, in-memory byte store. It accepts only controlled fixture choices,
preview counts, and local attempt indices. It accepts no caller image, provider,
URL, identifier, raw prompt, actor, or clock. It never contacts an external
service, writes an image file, or displays a result.

This is a closed offline execution profile, not a production worker, registry,
queue, image gate, or implementation of the complete protocol H0. It does not
integrate real locked benchmark assets or replace the earlier H0 ledger and
locked fake-runner evidence.

## Execution and control barriers

The worker creates its own synthetic consultation and records the existing
client-control consent contract before accepting a source. A source is a
generated 64 × 64 color tile, with no portrait or personal information. The
service still authorizes input handles and records actual domain variants.

`request`, `invoke`, `receive`, `beginDecode`, `finishDecode`, and `publish`
expose deterministic barriers for testing. `invoke` calls a newly constructed
`FakeHairstyleImageProvider.edit`; the fake handle is not an image. The closed
adapter then generates a separate synthetic output encoding and hashes its exact
bytes before decode. This establishes actual local encoding integrity, not
external provider-media provenance. The worker requires the decoded encoding's
hash, size, PNG format, and 64 × 64 dimensions to match before calling the
service's ready callback.

The fixed profile supports up to three previews per request. Provider failure
and timeout are explicit deterministic scenarios, with no billed usage or
wall-clock latency claim. Failed attempts remain in history; a service-authorized
retry receives a new attempt identity. Ready siblings cannot be retried or
replaced through redelivery.

Publication is claimed before authorization awaits, so concurrent redelivery
cannot create duplicate sidecars. The service may return `ok(current)` for an
ignored callback: the worker counts publication only when the returned attempt,
ready state, and output ID all match. The duplicate-callback probe requires an
already accepted output and uses a fresh command context; it cannot originate
publication or bypass decoding.

## Cancellation, deletion, expiry, and cleanup

The new `generation.cancel` service command is available only to explicitly
assigned active salon members or a matching live client-control capability.
Unassigned administrators, foreign/removed members, and generation workers
cannot invoke it. It marks queued/running variants canceled, removes provider
jobs and worker scopes, and purges the transient source/reference/normalized/mask
package. Ready siblings remain available. Failed records remain for accounting,
but cancellation ends their source retry authorization, including an all-failed
job. This follows the existing deletion contract.

The worker rechecks authoritative access after provider/decode awaits and before
publication. Cancellation, deletion, expiry, or timeout prevents late publication;
received late buffers are wiped and discarded. A late provider result for a
deleted consultation never starts image decoding. A decode already in progress
is drained without resurrecting a result. Historical attempts match by both
variant and attempt ID, so canceling a retry cannot rewrite its original failure.

Worker-owned source, transient, and output buffers are distinct from the
simulator's asset metadata. Purge fills owned buffers with zero before removing
them. A controlled one-time cleanup outage leaves a visible pending obligation
until `retryCleanup` succeeds; access denial does not conceal that pending work.
Accepted output buffers are purged on deletion/expiry, while completed siblings
survive generation cancellation.

Reports separately expose `storage.pendingCleanup`, `cleanup.pendingProvider`,
and `cleanup.pendingDecode`. Provider/decode continuations must be explicitly
drained even if the visible byte store is already empty. A simulator's verified
deletion receipt cannot attest those separate worker obligations.
`no_pending_offline_obligations` concerns only recorded local continuations,
transient buffers, and cleanup failures; it is not a claim that retained outputs
are deleted or that native/internal provider memory has been erased.

## Bounded decoding

`offline-output-decoder.ts` takes a private snapshot before its first await and
accepts only a static, noninterlaced, 8-bit RGB/RGBA PNG profile containing
IHDR/IDAT/IEND chunks. Encodings are limited to 1 MiB, 128 chunks, 1,024 pixels
per edge, and 1,048,576 total pixels. Signature, complete framing, chunk order,
CRCs, channels, and end-of-file are checked before native decoding. Ancillary
metadata, animation, other formats, and trailing payload are rejected.

Bounded Node zlib inflation checks exact compressed-stream consumption and
scanline byte count. Full Sharp raw-pixel decoding then checks the actual
dimensions, channels, format, and pixel length; header metadata alone cannot
pass. Tests include CRC-valid corrupt filters and incomplete rows that Sharp's
metadata reader accepts, plus unused data/concatenated streams inside IDAT.
Owned encoded, compressed, scanline, and raw pixel buffers are cleared in
`finally`; native pipelines are destroyed. The returned frozen facts contain
only an encoding hash, dimensions, format, and size.

Sharp uses strict warnings, pixel/channel limits, enabled safety features, and a
two-second processing timeout. Its timeout excludes time waiting for a libuv
thread; it is not an operating-system sandbox or an end-to-end wall-clock bound.
Native allocator copies and cryptographic memory erasure are not attested by
this profile. Production decoding still requires reviewed isolation and
resource limits. [Sharp constructor controls](https://sharp.pixelplumbing.com/api-constructor/),
[Sharp processing timeout](https://sharp.pixelplumbing.com/api-output/#timeout).

## Safe evidence and reproducibility

Reports contain fixed versions, opaque handles, controlled events/failures,
counts, and encoding facts. Attempt `lastObservedState` is a historical worker
projection, not the current persisted service state after deletion or expiry.
Reports are detached from worker state. No media, specification, raw prompt,
provider error body, capability, locator, price, or latency is exported.
Live authorization, moderation, expected subject count, image quality, and
release clearance always remain `NOT_EVALUATED`.

`tests/evals/offline-worker-evidence.ts` executes six representative lifecycle
sequences. Its golden locks safe control metadata and counts for three previews,
partial cancellation, deletion during decode, timeout/retry, malformed output
followed by expiry, and a cleanup outage followed by retry. Control hashes
exclude native encoder hashes and encoded sizes, which can vary across
platforms; runtime sidecars still validate those exact local bytes. The golden
does not prove historical origin or a real image benchmark.

```text
node node_modules/vitest/vitest.mjs run packages/service/src/offline-output-decoder.test.ts tests/integration/offline-generation-worker.test.ts tests/integration/offline-worker-evidence.test.ts tests/integration/service-simulator.test.ts
node node_modules/typescript/bin/tsc -p packages/service/tsconfig.tests.json --noEmit
node scripts/check-repository-safety.mjs
```

Golden regeneration requires explicitly setting `HAIR_UPDATE_WORKER_GOLDEN=1`
for its evidence test, inspecting the changed control evidence, and rerunning
normally. Routine tests do not rewrite it. Sharp is pinned at 0.35.4 in the
service manifest and existing lockfile package graph. The current local native
module runs successfully. A fresh offline install could not be verified because
the supplied pnpm launcher cannot resolve the project's pnpm 10.33.2 in its
offline package mirror; verification used existing installed dependencies.

Remaining gates include trusted registry/media authorization, metadata stripping
and preprocessing for permitted real inputs, durable queue/outbox and provider
abort/cleanup, isolated decoding, moderation and subject checks, stage-driven
benchmark execution/scheduling, calibrated signals, human ratings/adjudication,
pricing/spend control, and image-quality/release calculations. No live portrait
or provider transfer is enabled by this checkpoint.

## Reviewed checkpoint — 2026-10-02

Root verification passed all 352 repository tests across 14 files, plus domain,
AI, service/integration, and web TypeScript checks and the repository safety scan.
Independent review passed 84 targeted tests: 31 decoder, 34 worker, 18 service,
and one golden-evidence test. It verified repairs for the premature duplicate
callback decode bypass, cancellation source access, historical attempt identity,
concurrent publication, terminal decoder draining, and unused compressed payload.
No material P1/P2 remains in the reviewed offline scope or its documentation.
Browser evidence remains the earlier 76-check checkpoint; no browser code changed.
