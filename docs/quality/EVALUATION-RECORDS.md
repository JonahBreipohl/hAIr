# Locked evaluation metadata records

**Version:** `hair-evaluation-records-v1`  
**Protocol:** `hair-eval-v1`  
**Scope:** `PROTO-005`, offline metadata integrity and reference completeness only

`packages/ai/src/evaluation-records.ts` validates a locked plan plus the retained terminal attempt history and output metadata. It makes no H0/T1/P1, price, image-quality, display-safety, or live-provider authorization claim. A successful validation returns a detached metadata copy; it is not a release verdict.

## Exact boundary

Every record has exactly `schema_version: 1.0.0`, `protocol_id: hair-eval-v1`, `run_id`, `record_id`, and canonical millisecond `created_at_utc`. Required nullable fields must appear explicitly as null. Objects must contain only their declared enumerable data properties. Unknown, missing, symbol, hidden, accessor, custom-prototype, undefined, coercible, nonfinite, sparse-array, and extra-array-property input is denied. All public validation/serialization failures use the fixed message `Evaluation records rejected.` and never echo the rejected field or value.

Identifiers use a type prefix and exactly 16 lowercase hexadecimal characters: `run-`, `record-`, `ast_`, `sub_`, `case-`, `config-`, `artifact-`, `provider-`, `pricing-`, `slot-`, `attempt-`, `output-`, or `idempotency-`. Asset/subject prefixes preserve the existing asset-eligibility registry namespaces; this sidecar currently accepts their 16-hex subset. Production registries must issue random opaque suffixes; the deterministic fixture suffixes represent no person. Content and manifest hashes are exactly 64 lowercase hexadecimal characters. This grammar excludes human-readable names, filenames, paths, URLs, raw prompts, and common credential shapes. It cannot prove that an opaque identifier/hash was issued honestly or prevent someone deliberately encoding private information in a permitted opaque field; trusted registry issuance remains required.

No record accepts portrait bytes, private locators, raw provider messages, free-form settings, hair descriptors, public-figure names, participant names, prompt text, or secrets. Numeric fields have explicit integer bounds. Arrays contain at most 10,000 records; configuration preview counts are 1–3, maximum attempts 1–10, output dimensions 1–16,384 pixels, and timeout is 1–3,600,000 milliseconds. Unsupported provider regions/parameters require a schema extension before use, rather than an arbitrary metadata field.

## Locked plan

The plan envelope also carries `records_version`, stage (`H0`, `T0`, `T1`, `R0`, `P1`), `code_revision_sha256`, `assets`, `cases`, `configurations`, and explicit `slots`.

| Record | Required metadata beyond envelope |
|---|---|
| Asset lock | Asset ID, role, nullable subject ID, media content hash, full restricted registry manifest hash, parent asset IDs |
| Case | Case/subject/source IDs, nullable reference ID, specification and prompt-input artifact locks, transformation enum, per-configuration mask/protected-region asset assignments |
| Configuration | Configuration/provider IDs, API region, exact model snapshot, moderation policy, prompt template, descriptor conversion, preprocessing, and provider-specific generation-parameter artifact locks |
| Mask configuration | Strategy, segmentation lock or null, dilation/feather values, manual-edit flag, protected-region-definition lock or null |
| Generation output | Size, format, quality, background, compression percentage |
| Invocation controls | Preview count, timeout, retry policy, maximum attempts, concurrency, one-key-per-attempt idempotency policy, seed or null and explicit unsupported flag |
| Terms/cost identity | Pricing schedule ID, terms snapshot artifact lock and snapshot date; no price formula or cost claims |
| Slot | Stable slot ID, case/configuration IDs, repetition, and variant index |

An artifact lock is exactly `{ artifact_id, content_sha256 }`. Case specification and prompt inputs bind the full structured request by content hash; they do not export its text. The model snapshot, prompt template, conversion/preprocessing, policy, generation parameters, segmentation, protected-region definitions, and terms are likewise immutable registry artifacts. A repeated artifact ID must resolve to the same hash throughout the plan.

The restricted registry must resolve those artifacts, validate their actual contents, reproduce canonical hashes, verify the code revision, and enforce the complete configuration before execution. This metadata validator does not resolve artifacts, attest their semantic correctness, ensure a mask was computed with the declared segmentation recipe, or replay a provider request. The generation-parameter lock includes every other provider parameter capable of changing generation; a future adapter must reject undeclared or changed parameters. Source/reference preprocessing and mask recipes must be verified in that integration.

All records bind to one run, have unique stable record IDs, and are created no later than plan freeze. Asset, case, configuration, and slot IDs are unique. Source roles/subject IDs and reference roles must agree; parents must exist and be acyclic. Masks and protected regions must directly cite the locked source as a parent. A prompt-only configuration has no masks, segmentation, protected-region definition, dilation, feather, or manual edit. Masked strategies require their corresponding asset and configuration definitions.

Each case has exactly one mask assignment for every configuration selected for that case. Every selected case/configuration/repetition group has all requested preview indices exactly once. Unknown/orphan records, unused assets/configurations, duplicate slot tuples, missing assignments, and invalid variant indices are denied. The explicit plan declares which case/configuration/repetition groups are requested. Validation does not infer an omitted group or enforce stage sizes, balanced coverage, identical-case comparison cohorts, pre-registered exclusions, or required repetition counts; the future run-plan/stage validator must check those protocol constraints before authorization.

## Terminal attempts and append-only corrections

Every invocation has its own attempt and idempotency IDs, exact slot/case/configuration/plan-hash references, 1-based attempt index, nullable retry predecessor, start/end timestamps, monotonic duration, terminal outcome, fixed failure code, nullable output ID, bounded usage metadata, and correction lineage.

Outcomes are `succeeded`, `failed`, `rejected`, `timed_out`, `canceled`, `malformed_output`, and `output_rejected`. Success requires `none`; failure requires `provider_failure` or `rate_limit`; the other outcomes require their specific fixed codes. Only success and output rejection reference an output. Usage is either `unavailable` with all units null, or `estimated`/`billed` with integer image-input/image-output/text-input units. Monetary records, invoice reconciliation, and provider request/response IDs are outside this record boundary.

For each requested slot, at least one terminal attempt must be retained. Attempt indices are consecutive, remain within the configuration budget, and retries require `transient_only` plus a predecessor failure or timeout. A retry's original predecessor record must already appear in append order and be recorded no later than the retry starts. The retry also starts no earlier than predecessor completion. Success, policy rejection, cancellation, malformed output, and display rejection cannot be retried under this version's policy; extending that policy requires a new schema/accepted contract. Attempts start after plan freeze, finish after starting, and are recorded after completion. Duration must not exceed configured timeout; timeout observations use the full configured duration. UTC and monotonic readings are validated separately and are not assumed to be identical clock measurements.

Revision zero has no predecessor hash/correction reason. A correction has a new record ID, consecutive revision, `supersedes_record_sha256` binding the complete preceding record, and reason `usage_reconciliation`. It may change only usage and the correction envelope timestamp/ID. Original slot, attempt, outcome, timing, retry, output, plan, and idempotency data are immutable. Usage must change and its status may progress from unavailable to estimated to billed, never regress. All earlier records remain present; branches, overwritten/missing originals, revision gaps, empty corrections, and broken hashes are denied. A late billing correction to a predecessor is valid after its retry has finished; it does not rewrite invocation chronology.

Each output is linked to exactly one logical attempt and slot, with unique output ID, content hash, expected dimensions/format, timestamp, and `candidate`/`rejected` disposition. Every output-bearing attempt has exactly one output record; orphaned/missing/duplicated media references and mismatched geometry/disposition are denied. `candidate` is metadata for further evaluation, not approval to display. Actual decoding, media hash verification, duplicate-image triage, moderation, and calibrated quality processing remain separate work.

## Integrity and verification

`hashEvaluationPlan` validates the exact plan before canonical hashing. `hashEvaluationAttempt` validates a record before hashing. `serializeEvaluationRecordBundle` revalidates every supplied field and reconciles history before canonical export, including when the input was deserialized or modified. Canonical object-key order is deterministic; array order is retained because it freezes the requested plan and append history. Hashes detect drift but do not authenticate evidence or prove any provider was invoked. A trusted writer/registry and future signatures are still required.

`tests/evals/evaluation-records.fixture.json` is entirely metadata-only. It contains seven slots, all seven terminal outcomes, one declared timeout retry, three output records, and a retained billed-usage correction: eight logical invocations and nine attempt records. The corresponding golden file fixes the plan and bundle SHA-256 values and explicitly records `quality_gate_status: NOT_EVALUATED`. Tests validate the golden, safe copies, key-order invariance, missing/duplicate/cross-run references, asset graph and mask compatibility, output geometry, outcome/error consistency, retry budgets and chronology, correction immutability, private-input denial, coercion, and hostile JSON shapes. They also verify a late predecessor billing correction remains accepted.

Run without invoking a package-manager auto-install path:

```text
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-records.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
node scripts/check-repository-safety.mjs
```

Remaining dependencies include restricted artifact/registry resolution and provenance authorization; signed run plans; complete worker run events and cancellation/decode preflight; qualified blinded assignments and restricted execution integration; trusted pricing/billing ingestion, ratings, adjudication and automated signals; stage coverage, denominators and gate calculations; provider access, authorized adult media and spend authority. Nothing in this module clears those dependencies.

## Reviewed checkpoint — 2026-10-01

Independent adversarial review found one P2 retry chronology gap. The repaired boundary requires the original predecessor record to appear before the retry and to be recorded before its start, while allowing later usage corrections. The reviewer rechecked all 73 focused tests and reported no outstanding P1/P2 in this scope. Root verification passed all 204 repository tests, AI/service-integration/web TypeScript checks, and the repository safety scan. Browser checks remain the earlier 76-check checkpoint; this change has no browser-facing behavior.

The fixture/golden establishes metadata integrity, not an execution receipt for those static attempts. `PROTO-006` now connects these contracts to the [executable fake runner](LOCKED-FAKE-RUNNER.md) and verifies synthetic artifact resolution before invocation. Its replay validation executes new fake calls; it does not authenticate historical report origin. Actual provider, media, and release gates remain excluded.


PROTO-009 now provides the [locked deterministic scheduling boundary](EVALUATION-SCHEDULING.md), and the version 2 fake runner executes its invocation order. Scheduling preserves metadata integrity and proof scope; it grants no media or rater authority.


PROTO-010 now adds [declared pricing and attempt-cost evidence](EVALUATION-COSTS.md), with exact rational calculations, full logical-attempt accounting, and explicit missing totals. Actual pricing, invoices, spend authority, and displayed/usable cost denominators remain unevaluated.
