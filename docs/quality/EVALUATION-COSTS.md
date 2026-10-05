# Declared pricing and attempt costs

**Version:** `hair-evaluation-costs-v1`  
**Scope:** locked monetary metadata and exact arithmetic. The fixtures contain invented rates and charges. They are not current provider prices, invoices, or permission to spend.

The implementation is [evaluation-costs.ts](../../packages/ai/src/evaluation-costs.ts). It accepts no provider, clock, callback, URL, invoice text, credentials, or raw prompt. It adds no paid call and does not change an approved budget. `pricing_authority`, `invoice_authenticity`, `spending_authorization`, and `quality_gate` always remain `NOT_EVALUATED`.

## Exact input and locks

`evaluateEvaluationCosts` and `validateEvaluationCostInput` accept exactly:

```text
{bundle, bundle_sha256, pricing, pricing_sha256, charges, budget}
```

The full record bundle is validated under [EVALUATION-RECORDS.md](EVALUATION-RECORDS.md), including every slot, failure, retry, output, and retained usage correction. Its canonical digest must match `bundle_sha256`. No correction is counted as another provider attempt: the highest validated revision for each logical attempt supplies its current usage, while the original and subsequent records remain in the input.

The pricing manifest has exactly these fields:

```text
schema_version: "1.0.0"
costs_version: "hair-evaluation-costs-v1"
protocol_id, run_id
frozen_at_utc
currency: "USD"
micro_usd_denominator: integer from 1 through 1,000,000
formula: "additive_four_rates"
rounding: "none"
usage_basis: "locked_attempt_usage_units"
schedules: one row for every configuration
```

The full manifest must match `pricing_sha256`. Each row binds the configuration ID and canonical configuration digest, its pricing schedule ID, provider ID, model snapshot artifact lock, and terms snapshot artifact lock. Binding the full configuration also binds its output dimensions, quality, strategy, parameters, and other applicability metadata. Its identities must exactly match the configuration in the bundle.

The declared chronology must satisfy both `configuration.created_at_utc <= pricing.frozen_at_utc <= plan.created_at_utc` and `terms_snapshot_at_utc <= pricing.frozen_at_utc`. These are checks on supplied records, not authenticated proof that a real quote was available or frozen before execution.

Each schedule also has `availability: "available" | "unavailable"` and `rates`. Available rates contain exactly four nonnegative integer numerators, each at most 1,000,000,000:

```text
per_attempt
image_input_unit
image_output_unit
text_input_unit
```

Unavailable pricing has `rates: null`. Every configuration still needs its explicit row; empty or selective schedules fail closed. The named usage quantities are the three fields in the locked attempt record. This profile does not reinterpret them as pixels, tokens, images, or another provider billing unit. A future adapter must establish the conversion and price applicability separately. Mixed currencies, unsupported formulas or units, tiering, discounts, floating-point rates, and other rounding policies are rejected in v1.

## Arithmetic and bounded amounts

All formula values use **micro-USD**, where one micro-USD is one millionth of a dollar. If `D` is the shared manifest denominator, the exact estimate for one logical attempt is:

```text
(per_attempt
 + image_input_units × image_input_unit
 + image_output_units × image_output_unit
 + text_input_units × text_input_unit) / D
```

Multiplication and addition use `BigInt` from the outset. JSON exports use `{numerator: decimal_string, denominator: integer}`. There is **no rounding** at component, attempt, run, or ratio level. Fractions are intentionally not reduced, preserving their calculation basis. A presentation layer may format an amount, but rounded text must not replace exact decision inputs.

The common denominator prevents denominator growth when schedules are summed. Existing usage quantities remain bounded safe integers, including `Number.MAX_SAFE_INTEGER`. At the maximum three quantities and four rate bounds, one attempt's numerator is at most `27021597764222974000000000`; 10,000 logical attempts sum to at most `270215977642229740000000000000`. Exported numerators must be nonnegative and strictly below `10^32`. The denominator is at most `10^6`, or `10^10` after multiplying by at most 10,000 requested slots. Invalid integers, coerced strings, unsafe quantities, excess rates, or out-of-bound results are rejected.

Unavailable usage leaves the attempt estimate unknown **even when all rates are zero**. Likewise, unavailable pricing does not turn known usage into a zero estimate. Each channel reports the known subtotal, missing attempt IDs, and a null complete total and ratio when any required amount is unknown.

## Charges and invoice declarations

`charges` contains exactly one current observation per logical attempt. Every row binds `attempt_id` and the latest usage-record digest in `latest_attempt_sha256`. A correction requires that binding to be refreshed; a stale charge-to-attempt lock is rejected. These rows are a **current declared snapshot**, not complete append-only invoice history or authenticated financial evidence.

A row has exactly:

```text
attempt_id, latest_attempt_sha256
status: "reported" | "unavailable"
amount_micro_usd: integer or null
invoice_state: "not_provided" | "pending" | "declared_reconciled"
invoice_artifact: {artifact_id, content_sha256} or null
```

Reported amounts are integers from zero through `10^12` micro-USD. Their totals also use `BigInt` and decimal-string exports. An unavailable charge requires a null amount, `not_provided`, and no artifact. `not_provided` always requires no artifact; pending may carry a declared snapshot; `declared_reconciled` requires a reported amount and an artifact lock.

One invoice lock may cover several attempts if its hash is consistent. The same artifact ID with different content hashes is rejected. Invoice IDs may not alias any case or configuration artifact role, even with the same hash. These checks establish record-role consistency only; the artifact is not opened, its invoice contents are not interpreted, and reconciliation is not verified.

Formula estimates and declared charge amounts remain separate. Multiplying list rates by usage labeled `billed` still yields a **formula estimate**. A reported charge may be known when usage is unavailable, and its amount may differ from the estimate. Neither circumstance is denied or silently reconciled. `COMPLETE_DECLARED_RECONCILIATION` means every current charge row declares reconciliation; invoice authenticity remains unevaluated.

## Denominators, comparisons, and budget observations

The run aggregate includes every logical attempt across every configuration. Per-configuration aggregates partition those same attempts and corrections by bound configuration, using only that configuration's requested slots as its ratio denominator. Failed, rejected, canceled, malformed, timed-out, and retry attempts are retained. Retries add costs, but do not add requested slots. Usage revisions replace current quantities, but do not add another attempt's cost.

The denominator scope is explicitly `all_declared_requested_slots_including_reruns`. P1's reliability reruns remain included in these accounting totals and ratios; this module does not claim a primary-only or displayed-output denominator. A zero denominator cannot yield a fabricated ratio. `cost_per_displayed_output` and `cost_per_usable_result` always remain null, with their evidence `NOT_EVALUATED`; candidate records are insufficient to establish those populations.

`budget` is null or a USD cap declaration with `cap_micro_usd` from zero through `10^12` and `declared_at_utc` no later than the plan freeze. The cap is only a supplied metadata observation. Separate formula-estimate and declared-charge comparisons report:

| Observation | Meaning |
|---|---|
| `NOT_DECLARED` | No cap declaration was supplied. |
| `DECLARED_EXCEEDS_CAP` | The known exact subtotal alone is greater than the declared cap, even if other amounts remain unknown. |
| `DECLARED_WITHIN_CAP` | Every amount in that channel is known and the exact total is less than or equal to the cap. Equality counts as within for this observation. |
| `INDETERMINATE` | At least one amount is unknown and the known subtotal has not already exceeded the cap. |

Comparisons multiply the cap by the rational denominator using `BigInt`. They do not authorize spending, prove that a cap was approved, or implement the strict live quality/cost gate. An incomplete subtotal below a cap cannot produce a within-cap statement.

## Safe exports and verification

All input schemas are exact. Opaque identifiers, bounded integers, valid UTC timestamps, full populations, artifact roles, and configuration/usage locks are checked before calculation. Accessors, custom prototypes, sparse arrays, unknown fields, unsupported invoice states, and proxies at the new cost boundary are rejected. Errors always say `Evaluation costs rejected.` without reproducing supplied content.

`serializeEvaluationCostReport` validates the input again, recomputes every calculation, and requires exact report equality before exporting. Caller assertions cannot replace totals, completeness, invoice authenticity, displayed/usable ratios, or spending permission.

The synthetic fixture and [golden](../../tests/evals/evaluation-costs.golden.json) bind exact input and report hashes. [Focused tests](../../packages/ai/src/evaluation-costs.test.ts) exercise all attempt outcomes, retry and correction accounting, unknown quantities, independent charge evidence, exact thirds and halves, maximum safe arithmetic, scoped denominators, partial overages, identity/chronology locks, invoice roles, and serializer tampering. No current quote or real bill is represented by this evidence.

## Reviewed checkpoint — 2026-10-03 UTC

Independent review passed all 22 focused cost tests with no outstanding material
P1/P2 after chronology, invoice-state, artifact-identity, and role-separation
checks. A separate arithmetic review verified the maximum supported numerator
and exact fraction/cap oracles. The integrated suite passed 397 tests in 16 files;
domain, AI, service/integration, web, and end-to-end TypeScript checks pass.

The web compiler initially rejected two BigInt literals under its existing
ES2017 target. Equivalent BigInt constructor calls repaired compilation while
retaining exact arithmetic and the same golden outputs. The production build
and one desktop-Chromium synthetic consultation/deletion smoke at a 390-pixel
viewport passed. The local smoke server required verified-process cleanup after
its assertions finished; the browser command then exited successfully. Earlier
76-check emulated browser evidence remains a separate checkpoint. No live photo,
provider price, bill, spending authority, image-quality, or release claim follows.
