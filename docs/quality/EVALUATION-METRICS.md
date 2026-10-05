# Declared quality metrics

**Version:** `hair-evaluation-metrics-v1`  
**Scope:** exact calculations over locked, declared metadata. Synthetic scores, labels, observations, and charges establish no real image quality, display, billing, or release authority.

[evaluation-metrics.ts](../../packages/ai/src/evaluation-metrics.ts) implements [D-023](../DECISIONS.md) using [EVAL-PROTOCOL.md](EVAL-PROTOCOL.md). It derives metrics from recomputed [coverage](EVALUATION-COVERAGE.md), [cost](EVALUATION-COSTS.md), and [rating](EVALUATION-RATINGS.md) reports. It does not read images, notes, invoices, provider responses, credentials, or artifact contents.

## Exact input and integrity

`validateEvaluationMetricInput` and `evaluateEvaluationMetrics` accept exactly:

```text
schema_version: "1.0.0"
metrics_version: "hair-evaluation-metrics-v1"
locked_at_utc
coverage_report, coverage_report_sha256
cost_report, cost_report_sha256
rating_report, rating_report_sha256
```

Each embedded `{input, result}` report is independently revalidated and recomputed by its own serializer before its canonical SHA-256 is checked. The coverage plan must equal the cost bundle's locked plan; cost and rating bundles must be identical. This binds run, configurations, requested slots, retained outputs, subjects, failed attempts, retries, and usage corrections together.

Every supplied timestamp ending in `_at_utc`, including embedded report cutoffs, must be a canonical UTC timestamp no later than the metric cutoff. Repeated artifact IDs across the reports must retain their hash and role. Invoice, rationale, viewer, scorecard, and annotation artifacts cannot be substituted for one another or for other locked artifacts.

Hashes prove internal integrity of supplied declarations. They do not prove historical execution, authenticated human judgment, consent, authorized annotations, invoices, or the truth of artifact contents.

## Populations and reliability

Each configuration and the overall diagnostic aggregate report four partitions:

| Partition | Requested-slot membership |
|---|---|
| `all_requested` | Every declared requested slot, including reliability reruns. |
| `primary` | Preregistered primary cases; for P1, repetition zero only. Other stages retain their declared primary repetitions. |
| `reliability_rerun` | P1 repetition one for a preregistered reliability-rerun case. |
| `unclassified` | Slots that do not fit those rules; they remain visible and make overall metric inputs incomplete. |

P1's 720 primary slots and 72 reliability-rerun slots remain separate. A rerun cannot enlarge a primary quality denominator. Per-configuration numerical observations use the primary population; pooled overall partitions are diagnostics, not a provider verdict.

Requested slots, logical attempts, stored attempt records, usage revisions, generated outputs, and distinct subjects are separate counts. Usage revisions count as retained records, not new attempts. Every outcome (`succeeded`, `failed`, `rejected`, `timed_out`, `canceled`, `malformed_output`, `output_rejected`) remains in attempt accounting. Retries add attempts and spend, but not requested slots.

First-attempt success counts slots whose index-one attempt is `succeeded`; eventual success counts slots whose final logical attempt is `succeeded`. Both use requested slots as their denominator. An output-rejected attempt produces a retained generated record but does not become a successful slot. The validated source bundle requires complete slot histories and permits retries only through its declared transient-failure path.

Two output populations are reported independently inside each partition and cohort:

- `all_retained_generated_outputs`: all retained outputs, including rejected outputs.
- `latest_declared_gate_passed_outputs`: outputs whose latest analytical automated-gate observation declares `passed`.

The second is a projection, **not actual display**. Candidate disposition does not prove passage, and passage declarations do not prove that an image was shown. Unknown latest gate observations create unknown membership, not rejection. T1 score/severe-artifact analogs use primary all-generated outputs; P1 display analogs use the primary declared-passed projection. Invalid-input exclusions remain unapplied under the rating profile; unresolved records are not silently removed to improve rates.

## Scores and declared classification

Publish all seven dimensions separately. First calculate each output's middle score from its three valid primary raw ratings. Then calculate the median of those output medians for the named population. Even-sized dataset medians use an exact fraction: output medians three and four yield `7/2`. Do not pool raw reviewers: rows `[0,0,5]` and `[4,4,4]` yield output medians zero and four, hence dataset median two; pooling all six raw scores incorrectly yields four.

An output requires complete declared rating evidence before its classifications are available. Diagnostic raw medians may exist in the rating report while review is unresolved; this does not make the metric classification complete. Current adjudication supplies final critical/major codes when present; otherwise the raw declared codes are retained. Raw flags and adjudication hashes remain separately inspectable.

Declared formulas are:

- Displayable: no final critical code, identity/adherence/locality/realism medians all at least four, and no current adjudicator displayability veto.
- Usable: displayable plus consultation-usefulness median at least four.
- T1 severe: critical identity/anatomy, or major identity/anatomy/hairline/background.
- P1 major: critical anatomy, or major anatomy/hairline/background.

A positive adjudication vote cannot compensate for a low score or critical code. A negative displayability vote is an explicit veto. Identity failures also have separate zero-count observations; they are not hidden inside the P1 major-artifact percentage. All critical-code rates and all seven score-4–5 rates retain their own counts.

Count observations publish known numerator, known denominator, unknown classification count, and unknown membership count. Complete numerator/rate are null when classification is unknown; denominator is also null when membership is unknown. Known subtotals remain visible. Median observations likewise preserve known/unknown output counts but leave the complete value null when any applicable score or membership is unknown. Empty populations have no fabricated rate or median.

## Cohorts and threshold observations

Primary cohorts are generated per configuration for transformations, six tone bands, four texture groups, 24 tone/texture intersections, and nine controlled secondary challenge tags. Each output joins annotations through its exact case's `source_asset_id`; the annotation must match that source asset's subject, content hash, and registry-manifest hash. Subject IDs deduplicate contributors; they do not replace a photo-specific join for lighting, glasses, covering, or other challenge tags. Cohort labels come from the coverage metadata, not inferred traits. Missing applicable annotations create unknown membership; repeated outputs never increase distinct-subject counts. Sampling needs both **at least five distinct contributing subjects and at least 20 outputs in the same named population**. Four subjects with 100 outputs, or five subjects with 19 outputs, are insufficient. Five subjects with 20 outputs meet the declared count requirement, but do not prove representative sampling.

Every threshold observation exposes its operator, exact threshold fraction, observed fraction, and `DECLARED_SATISFIED`, `DECLARED_NOT_SATISFIED`, or `INCOMPLETE`. It is a numerical observation, not a T1/P1 gate decision.

| Observation | Exact comparison |
|---|---|
| T1 primary identity/adherence dataset medians | `>= 4` individually. |
| T1 primary severe-artifact rate | `<= 10/100` of all-generated outputs. |
| Primary requested-slot eventual completion | `>= 90/100`. |
| P1 primary projected identity / adherence / realism / locality 4–5 rates | `>= 95/100`, `>= 85/100`, `>= 90/100`, `>= 90/100`. |
| P1 primary projected major-artifact rate | Strictly `< 1/100`. |
| P1 current projected critical-identity count | `= 0`; an empty or unresolved population cannot establish it. |
| All-requested historical adjudicated review-escape count, per configuration | `= 0`, using all retained outputs including reliability reruns; empty/incomplete history cannot establish absence. |
| Sufficient projected cohort displayable rate | `>= 85/100`. |
| Sufficient projected cohort shortfall from its configuration's overall primary projected displayable rate | `<= 5/100`. |
| Sufficient T1 all-generated cohort identity/adherence medians, critical rate, displayable rate | `>= 3`, `>= 3`, `<= 25/100`, `>= 60/100`. |
| Theoretical declared charge per primary projected usable result | Strictly `< 200000` microUSD. |

Comparisons use exact integer cross-products. One major artifact out of 100 fails the strict one-percent observation; one out of 101 satisfies it. Seven out of 720 satisfies it; eight does not. One out of ten satisfies inclusive ten percent; one out of nine does not. Rates must not be rounded into satisfaction.

Cohort shortfall is the nonnegative, one-sided difference `max(0, overall_rate - cohort_rate)`, retaining an exact fraction. Overall `90/100` and cohort `17/20` differ by exactly five percentage points and satisfy the inclusive comparison. Overall `95/100` and cohort `17/20` differ by ten points and do not, even though the cohort meets its absolute 85-percent floor. Insufficient or unknown cohort sampling leaves its threshold observations incomplete; it does not become a vacuous pass.

## Spend and the usable denominator

Partition spend diagnostics preserve formula estimates and declared charges separately, including known subtotal, unknown-attempt count, and complete total or null. Monetary numerators use decimal strings and exact rational microUSD arithmetic from the cost profile.

For each configuration, `primary_projected_cost_per_declared_usable` deliberately uses **all requested attempt spend**, including failures, retries, and reliability reruns, divided by the complete primary declared-passed usable count. It reports the cost and denominator scopes explicitly. Partition-only spend must not quietly replace this numerator. Missing attempt costs, incomplete usable classification/membership, or zero usable results leave the corresponding ratio null.

The formula-estimate channel remains a list-rate estimate even when supplied usage is marked billed. Declared charges remain unauthenticated observations. Exactly 400,000 microUSD over two usable results equals the 200,000 boundary and does not satisfy strict `<`; 399,999 over two does. No ratio authorizes spending or establishes fully loaded economics, which also needs authentic billing and any charges outside this closed profile.

## Historical identity evidence

Each output retains all raw-rating, gate-observation, and adjudication hashes. `historical_raw_identity_flagged_gate_passage` is a suspected association: a retained raw identity flag and a gate-passed declaration exist. It does not authenticate a severe escape or assert a complete temporal delivery event.

`historical_adjudicated_identity_gate_passage` requires a resolved round with valid input, `CF_IDENTITY`, and a known passed gate observation in the prefix that round actually reviewed. A round is resolved for this historical check only when it has a final vote, declares valid input, and its major identity/anatomy codes have corresponding critical codes. `adjudicated_review_escape_sha256s` identifies the contributing positive rounds. An early critical diagnosis while the gate was rejected, followed by a cleared diagnosis and only then a passed observation, cannot become an invented adjudicated historical escape. Later rejection or clearing does not erase a historical passage already supported by a critical round's reviewed prefix.

A later complete classification cannot manufacture historical absence. Without a confirmed positive, an older unresolved round whose reviewed prefix contains a passed **or unknown** gate leaves the history null. This conservatively includes unresolved splits, invalid-input decisions, and contradictory major/critical classifications; it does not presume the unresolved diagnosis was harmless. A resolved identity-critical round with an unknown gate in its reviewed prefix and no known passage also leaves absence null. For the raw-suspicion channel, a raw identity flag with unknown gate history and no known passed observation likewise remains null. Confirmed positives take precedence over unresolved absence.

Each partition reports `historical_raw_identity_passage` and `historical_adjudicated_review_escape` count observations over its **all retained outputs**, independent of the latest passed projection. A supported positive stays known even if later evidence is incomplete; unsupported absence becomes null while current or relevant historical evidence is unresolved. Known positive counts do not manufacture a complete total. Current classification and historical completeness are independent: a cleared current output may have complete current scores while the metric report records `HISTORICAL_IDENTITY_EVIDENCE_INCOMPLETE`. The per-configuration `all_requested_historical_adjudicated_review_escape_count` zero observation includes reruns and is separate from the current primary projected identity count. Thus clearing a current diagnosis or rejecting an output now cannot silently clear a historical review-escape observation. Empty or incomplete populations do not prove zero. Neither history channel replaces authenticated output-delivery telemetry or proves there were no actual escapes.

## Bounds, serialization, and limits

The profile is bounded to 1,024 retained outputs and eight configurations. Descriptor-only preflight permits up to 3,000,000 input traversal nodes, 6,000,000 nodes for the whole serialized report, depth 64, arrays of 10,000 entries, strings of 128 characters, and up to 64 fields with key lengths at most 64. Source reports retain their own stricter bounds. Proxies, accessors, sparse arrays, hidden/symbol properties, cycles, non-JSON values, and custom prototypes are rejected before inherited serializers execute them; null-prototype data objects are permitted. Exported policy/bound objects are frozen.

`serializeEvaluationMetricReport` checks `{input, result}`, recomputes every embedded report and derived result, requires exact equality, and emits canonical JSON. It rejects forged fractions, thresholds, histories, counts, gate states, and extra private fields. Validation returns detached data. Errors use only `Evaluation metrics rejected.`

`COMPLETE_DECLARED_METRIC_INPUTS` means that declared metadata inputs have no recorded completeness findings; it does not mean every numerical observation is satisfied or every cohort is sufficient. Coverage findings remain visible. Unverified real annotations do not gain authority through mathematically consistent counts.

The report always leaves actual display, media authorization, reviewer identity/qualification, blinding, annotation authority, cohort sampling, billing authenticity, confidence intervals, inter-rater agreement, live stylist usefulness, latency gates, T1/P1 quality gates, release, provider selection, fully loaded economics, and spending authority `NOT_EVALUATED`. In particular, score-4–5 usefulness assessments cannot substitute for the pilot's separate 80-percent stylist yes/no measure. Confidence intervals, ordinal agreement, representative sampling, genuine viewing, and independent release review remain required external evidence.

## Reproducible synthetic evidence

[evaluation-metrics.test-fixtures.ts](../../packages/ai/src/evaluation-metrics.test-fixtures.ts) builds safe declared metadata. [evaluation-metrics.test.ts](../../packages/ai/src/evaluation-metrics.test.ts) checks populations, medians, exact boundary operators, incomplete evidence, history, spend, and serializer tampering. The [golden report](../../tests/evals/evaluation-metrics.golden.json) contains synthetic metadata only.

Run focused verification from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-metrics.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
```

Repository status records the integrated verification checkpoint. These checks do not validate actual hairstyle quality or clear a release gate.

## Reviewed checkpoint — 2026-10-03

Twenty-eight focused metrics tests pass. An independent review reproduced and
verified repairs for historical false-zero counts after later cleared decisions,
and checked an independently valid mismatched source report. No outstanding
P1/P2 remains in this metadata scope. Thirty-one coverage tests preserve the
existing golden after runtime policy freezing and removal of its overwrite hook.

The integrated suite passes 455 tests in 18 files, all five TypeScript projects
and a fresh production build. A separate root calculation verified output
medians zero and four aggregate to two rather than the pooled raw median four;
one declared usable primary result retains all 192 requested-attempt charges.
Repository safety and the task graph pass. Browser-facing behavior did not
change, so prior browser evidence was retained without a new browser run.
Real media, provider use, human review and release gates remain unevaluated.
