# Evaluation harness implementation coverage

**Updated:** 2026-10-03 (UTC checkpoint)
**Protocol:** `hair-eval-v1`  
**Implemented preflight scope:** `ai_evaluation_harness`

This companion records what the repository can prove offline before provider access or benchmark portraits exist. It prevents a deterministic fake-provider check from being mistaken for the live image-quality gate.

## Implemented offline foundation

`packages/ai/src/benchmark.ts` now provides:

- canonical JSON serialization and SHA-256 hashing for content-free manifests;
- deterministic invocation ordering using `SHA-256(protocol_id | run_id | case_id | config_id | repetition)`;
- deterministic blinded-rating ordering using `SHA-256(run_id | rater_pseudonym | output_id)`;
- nearest-rank percentiles for non-negative latency fixtures;
- a 32-case H0 AI preflight covering eight opaque synthetic subjects and deterministic success, partial, policy-rejection, timeout, rate-limit, and provider-failure behavior;
- aggregate requested-slot completion, outcome, latency, and estimated-cost evidence; and
- an explicit `scope` field so this check cannot be presented as the complete H0 or a T1/P1 verdict.

`packages/ai/src/asset-eligibility.ts` now provides a fail-closed, metadata-only authorization decision for both run planning and the immediate pre-transfer recheck. It validates:

- exact manifest and technical-verification fields, safe opaque identifiers, normalized content hashes, decoded properties, metadata stripping, subject count, duplicate, malware, content-safety, and source-consistency results;
- class-specific synthetic, licensed, or separately consented-adult proof, adult status, active rights, retention through adjudication, withdrawal/deletion state, and T1/P1 second-person review;
- requested scopes, exact provider and processing-region permission, territory, disabled provider training, provider-retention bounds, and the P1-specific scope;
- the complete parent graph for missing records, cycles, invalid parent IDs, permission expansion, and retention expansion; and
- rejection of customer/celebrity/path/contact-like content, unattested wildcard provider grants, unsupported identity purposes, uncontrolled cohort tags, and incomplete core coverage evidence.

Every request field is checked at runtime against an exact key, type, and enum contract before policy evaluation. Unsafe request or asset identifiers are represented only by deterministic redactions in findings and decision evidence. A trusted-server-clock contract binds `evaluated_at_utc`; pre-transfer decisions may lead a planned call by at most five minutes, run-plan decisions by at most seven days, and technical verification may be at most 24 hours old. These bounds are versioned as `hair-asset-freshness-v1` and cannot be widened by request data.

The pure eligibility output contains only validated opaque asset IDs or deterministic redactions, reason codes, and a canonical graph hash. It never includes restricted locators, consent/license records, source text, or media. It is not live authorization: a future trusted service must supply the clock and signed verification snapshot, and a future adapter must enforce the resulting pre-transfer denial or approval.

`packages/ai/src/h0-ledger.ts` reconciles the scoped AI-runner preflight with executable service and job-contract evidence under `hair-h0-ledger-v2`. Its fixed ledger requires exactly one passing record for AI runner behavior, command idempotency, duplicate and late callbacks, cancellation transitions, partial success, retry, expiry, and verified deletion. The AI source report must contain each required check exactly once. Service observations use exact per-check field, primitive-type, and enum allowlists; raw text and arbitrary observation fields are rejected.

Every record exports its safe source observations and a SHA-256 digest binding the complete versioned envelope, run, fixture, execution time, scope, status, and observations. The ledger recomputes that digest before accepting a record. Missing, duplicated, failed, cross-run, or digest-mismatched evidence forces `H0_FAIL`. Malformed schemas, wrong scopes, nonprimitive observations, coercible nonboolean pass flags, and unsafe fields are rejected with generic errors before ledger output exists. Serialization revalidates the full ledger and its digest linkage, preventing malformed deserialized records from being exported even as failed evidence. The v2 format invalidates the earlier v1 ledger artifacts.

This is a trusted local executable-runner boundary. A digest proves integrity of a supplied record, not that its assertions ran or are true. The service records must originate from the executable fixture, and the AI record links to its runner report by hash; the golden and source-controlled tests preserve that provenance. A fabricated record with a recomputed hash cannot be distinguished cryptographically from honest runner output. External evidence ingestion, signatures, registry enforcement, and provider authorization remain outside this scoped ledger.

The only success label is `H0_PASS`. Every ledger also records `technical_image_gate_status: NOT_EVALUATED`, `live_evidence_present: false`, and exclusions for live-provider, image-quality, registry-enforcement, and spend evidence. It cannot be used as a T1/P1 or release verdict.

The golden evidence fixtures are `tests/evals/h0-ai-preflight.golden.json`, `tests/evals/asset-eligibility.golden.json`, and `tests/evals/h0-check-ledger.golden.json`. Tests rerun locked metadata-only inputs, compare them byte-semantically with the golden decisions, exercise fail-closed paths, and scan aggregate evidence for obvious private locator, filename, URL, and secret patterns. `tests/integration/h0-ledger.test.ts` creates the service evidence by executing the simulator; it does not trust static claims about service behavior. Its duplicate callback uses a fresh command context, verifies unchanged variant/output state and asset/job counts, and therefore exercises callback handling separately from command-cache replay. Adversarial tests cover missing/duplicate AI checks, malformed records and serializers, strict primitive validation, source copying, and envelope/observation tampering.

Run the focused verification with:

```text
pnpm exec vitest run packages/ai/src/benchmark.test.ts
pnpm exec vitest run packages/ai/src/asset-eligibility.test.ts
pnpm exec vitest run packages/ai/src/h0-ledger.test.ts tests/integration/h0-ledger.test.ts
pnpm --filter @hair/ai typecheck
```

## Audit gaps that still block a live bake-off

`PROTO-014` supplies `packages/ai/src/evaluation-report-bundle.ts`. Recomputed
transitive source reports produce all twelve fixed template files, exact scoped
diagnostics, source/interval references, fixed CSV columns and UTF-8 file hashes
in an outer manifest. Both stages preserve headings, inherited tables, gate IDs
and required criteria. Empty populations keep counts without fabricating rates;
retained historical escapes remain visible after later clear decisions.
Every live/template gate stays incomplete, decision is none and selection is
null. Missing provenance, execution, code evidence, detector calibration,
viewing, real display, billing, full inference and release authority cannot be
supplied by a complete export. Scope and verification are documented in
[`EVALUATION-REPORT-BUNDLE.md`](EVALUATION-REPORT-BUNDLE.md).

`PROTO-013` supplies `packages/ai/src/evaluation-statistics.ts`. The accepted
D-024 profile locks source metrics and pre-invocation method declarations before
10,000 deterministic replicates. Global primary populations resample whole
subjects; T1 comparisons retain the full required paired case frame and a paired
subject sensitivity analysis. All seven raw ordinal-alpha dimensions and exact
and within-one-point agreement retain negative, missing and undefined evidence.
Unknown classifications, shortened frames, insufficient populations, boundary
rates, degenerate distributions and undefined replicates cannot produce a usable
interval. Exact diagnostic points remain separate from nominal pointwise
uncertainty. Cohort, cost, latency and agreement intervals, equivalence,
multiplicity, calibrated coverage and full protocol inference remain
`NOT_EVALUATED`. Hashes do not authenticate actual preregistration, human viewing
or sampling. Scope, methods and limitations are documented in
[`EVALUATION-STATISTICS.md`](EVALUATION-STATISTICS.md).

`PROTO-012` supplies `packages/ai/src/evaluation-metrics.ts`. Recomputed coverage,
cost and rating reports bind the same complete run before exact quality arithmetic.
All seven median-of-three dimensions, retained versus declared-gate-passed
populations, primary versus reliability partitions, cohort sufficiency and
threshold observations remain explicit. Failed attempts and retries remain in
cost-per-usable accounting; historical identity review escapes retain their own
observation lineage. Missing classifications, labels, charges or membership
cannot become zero risk. Runtime-frozen coverage vocabularies and read-only
golden checks preserve the shared policy. These are synthetic numerical
declarations; confidence intervals, agreement, authentic viewing, sampling,
billing and live T1/P1 verdicts remain separate controls. Scope and verification
are documented in [`EVALUATION-METRICS.md`](EVALUATION-METRICS.md).

`PROTO-011` supplies `packages/ai/src/evaluation-ratings.ts`.
The bounded D-022 profile locks all retained outputs, including rejected outputs,
to exactly three declared primary assignments (two stylist roles and one general
role). Raw scores remain immutable; missing or invalid coverage stays incomplete.
Append-only control observations and adjudication rounds preserve disagreement
and display-escape lineage. Restricted factual rationale is represented only by
opaque artifact locks. The profile reports declared raw medians but cannot
authenticate people, credentials, calibration, blinding, viewing permission,
input exclusions, usable denominators, or image quality. The candidate-only
PROTO-009 order is not a certified assignment order for this larger population.
Verification and limitations are documented in
[`EVALUATION-RATINGS.md`](EVALUATION-RATINGS.md).

`PROTO-010` adds `packages/ai/src/evaluation-costs.ts`: full locked bundles, pricing manifests, configuration/model/terms identities, latest logical usage revisions, and complete declared charge populations are reconciled before exact rational micro-USD calculation. Failed, rejected, timed-out, canceled, malformed, and retried attempts remain in run and per-configuration totals. Unknown costs keep complete totals and ratios null; known subtotals and missing attempt IDs remain explicit. Formula estimates, reported charges, and invoice-reconciliation assertions stay separate. Invoice artifact identities cannot conflict or alias plan artifacts. Inclusive declared-cap observations do not implement the strict quality gate or authorize spending. Displayed/usable-result denominators, genuine pricing/invoices, live budget enforcement, and release gates remain unevaluated. Scope and verification are in [`EVALUATION-COSTS.md`](EVALUATION-COSTS.md).

`PROTO-009` supplies exact locked invocation and candidate-rating schedules in `packages/ai/src/evaluation-scheduling.ts`. Invocation order keeps case blocks and uses protocol hash priorities with explicit group/preview ties; the v2 locked fake runner now executes that order. Rating inputs bind the full record bundle and every candidate output, preserving failed/rejected accounting. A bounded deterministic search minimizes the sum of repeated adjacent fields, with zero-cost, global lower-bound, or exhaustive tiny-pool certificates; unresolved searches retain all candidates and report `INCOMPLETE`. The representative 792-output P1 fixture reaches its sound bound. Qualified raters, viewer permission, actual blinding, live execution, and image quality remain separate gates. Proof scope and limits are in [`EVALUATION-SCHEDULING.md`](EVALUATION-SCHEDULING.md).

`PROTO-008` supplies a closed executable offline worker in `packages/service/src/offline-generation-worker.ts`. Internally constructed fake calls, generated color-tile buffers, bounded full Sharp decoding, and actual service callbacks exercise cancellation, deletion, expiry, timeout, late-result cleanup, duplicate callbacks, retry accounting, and partial-result preservation. The new authorized `generation.cancel` operation ends source-package access even when failed siblings remain. Worker reports distinguish owned-buffer purge failures and unresolved provider/decoder drains from simulator metadata receipts. Six executable control scenarios have golden evidence; native encoding hashes are verified at runtime and deliberately excluded from the cross-platform control digest. Scope and remaining production/native-memory/authority limitations are in [`OFFLINE-WORKER.md`](OFFLINE-WORKER.md). This is prerequisite offline evidence, not complete protocol H0 or a live release gate.

`PROTO-007` adds `packages/ai/src/evaluation-coverage.ts`: exact preregistration locks the plan, annotation array, and parent corpus; stage sizes, distinct subjects, source-content duplication, transformations, references, repetitions, preview groups, P1 reruns, and controlled comparison populations are reconciled. Metadata-only T1/P1 allocations and five stage golden digests reproduce the declared shapes. Unverified real annotation authority, unresolved physical restrictions, unsupported blocks, and missing coverage remain incomplete. Even `COMPLETE_SYNTHETIC_METADATA` leaves media authorization and image-quality gates `NOT_EVALUATED`. The exact schema, count interpretations, mask recipe controls, annotation vocabulary, and remaining trusted-registry/sampling obligations are in [`EVALUATION-COVERAGE.md`](EVALUATION-COVERAGE.md).

`PROTO-006` connects the locked metadata contracts to executable internal fake-provider calls through `packages/ai/src/locked-fake-runner.ts`. An exact synthetic recipe registry resolves every locked artifact and verifies content hashes before invocation. Expanded compiled specification and prompt-input hashes bind actual safe request inputs. Only one closed local prompt-only simulation profile is accepted; unsupported settings/masks and semantically invalid recomputed locks fail closed. Frozen requests preserve inputs across asynchronous calls. The runner retains all failures and retries, emits reconciled attempt/output sidecars and request/configuration receipts, and replays the internal fake execution before accepting deserialized report exports. Its fixture/golden covers 24 requested slots, 40 actual fake calls, 16 retries, and 11 synthetic output sidecars. Virtual timing and metadata output hashes are explicitly not actual latency or image evidence. Scope, configuration support, provenance limitations, and verification are documented in [`LOCKED-FAKE-RUNNER.md`](LOCKED-FAKE-RUNNER.md).

`PROTO-005` now supplies exact locked plan, asset-lock, case, configuration, terminal-attempt/correction, and output metadata schemas through `packages/ai/src/evaluation-records.ts`. It reconciles explicit requested slots with every retained logical attempt/output, verifies mask/source/subject linkage and acyclic asset parents, enforces configured retry budgets and chronology, and prevents usage corrections from rewriting original invocation facts. Canonical plan/record hashes and a metadata-only fixture/golden preserve deterministic integrity evidence. Exact unknown-input validation and generic denial also apply before serialization. The complete boundary, restricted artifact-resolution requirements, and limitations are in [`EVALUATION-RECORDS.md`](EVALUATION-RECORDS.md). These records have no image-quality or release verdict.

| Protocol requirement | Current state | Required next implementation |
|---|---|---|
| Schema-versioned asset, case, configuration, pricing, detector, rating, adjudication, and run-event records | Exact locked records, declared pricing/charge/rating/adjudication evidence, synthetic execution sidecars, and preregistered stage/comparison coverage now exist | Resolve/attest restricted real artifacts, pricing, ratings and coverage projections; add detector and full worker run-event schemas |
| Asset eligibility and chain of custody | Deterministic manifest-graph validation and run-plan/pre-transfer authorization are implemented and golden-tested | Integrate the pure decision into a future restricted registry, require a fresh signed technical-verification snapshot, and make every live adapter refuse calls without a passing pre-transfer decision |
| Credential-free H0 service/job ledger | Complete for PROTO-004: scoped AI evidence is reconciled with executable idempotency, duplicate/late callback, cancellation-transition, partial/retry, expiry, and deletion evidence | Preserve the golden ledger and rerun it after harness, job, retention, or deletion-contract changes |
| Full protocol H0 worker and malformed-output preflight | PROTO-008 now exercises actual offline worker callbacks, late cleanup, explicit pending drains, and bounded full decoding of generated synthetic tiles; existing ledgers remain separately scoped | Integrate permitted restricted media, preprocessing, durable queue/outbox, process isolation, provider abort/cleanup and display gates before claiming complete protocol H0 |
| Deterministic scheduling constraints | PROTO-009 binds complete populations, certifies the additive adjacency minimum when proven, and keeps unresolved searches incomplete; the v2 fake runner executes the case-block schedule | Preserve evidence and integrate into future restricted live execution and qualified viewer assignments; schedule completion grants no media or rater authority |
| Pricing and spend accounting | PROTO-010 locks USD pricing/formulas and complete current charge observations, keeps usage revisions and retries, separates estimates/charges, and reports exact bounded rational totals with missing-cost handling | Integrate trusted real pricing/usage/invoice ingestion and live spend enforcement; require validated display/rating denominators before cost-per-usable or paid-pilot decisions |
| Blinded viewer and assignments | Deterministic candidate order and declared three-primary assignment-role checks exist | Integrate full-population scheduling, calibration qualification, neutral viewer, blinding-leak audit, and a trusted replacement-rater workflow |
| Human ratings and adjudication | PROTO-011 locks immutable raw rows and append-only analytical/adjudication history; exact score, validity, trigger, role and declared completeness checks pass | Authenticate actual reviewers, qualifications, notes, calibration and blinding; implement trusted correction/replacement and exclusion controls before live use |
| Gate calculations | PROTO-012 binds exact declared medians, classification counts, cohort sufficiency and cost per declared usable result; PROTO-013 adds global primary pointwise uncertainty, paired T1 comparisons and raw ordinal agreement | Add omitted cohort/cost/latency/agreement inference and full protocol controls; trusted populations, real display, billing, calibrated coverage and authoritative T1/P1 verdicts remain work |
| Stable report bundle | PROTO-014 generates all twelve files with fixed schemas, scoped diagnostics, source/interval joins and independent UTF-8 hashes; synthetic golden and review pass | Add trusted missing evidence under a new accepted authority profile before any real verdict; all current template/live gates remain `INCOMPLETE` |
| Automated image signals | Closed synthetic PNG full decoding exists; no identity, locality, realism, subject or moderation detector exists | Add versioned, calibrated detectors only after permitted assets exist; facial similarity remains disabled without its separate explicit consent path |
| Live provider comparison | No adapter or credential is present | After provenance and run-plan gates pass, implement restricted adapters and compare the pre-registered provider/model/prompt/mask configurations |

## Interpretation

A passing `hair-h0-ai-v1` report means the content-free AI runner foundations reproduced their locked fixture. It does not mean the full H0 preflight passed, an asset is eligible, a provider is authorized, an image is safe to display, or PROTO-002 is complete. The first live call remains blocked until the provenance audit, machine schemas, full job-state preflight, approved provider controls, permitted portraits, and spend cap are all in place.
