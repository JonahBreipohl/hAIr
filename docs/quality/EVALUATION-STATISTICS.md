# Declared statistical evidence

**Version:** `hair-evaluation-statistics-v1`  
**Scope:** reproducible calculations over locked metadata under [D-024](../DECISIONS.md). Synthetic scores and declarations cannot establish real image quality, representative sampling, authenticated preregistration, or a release decision.

This profile extends [declared metrics](EVALUATION-METRICS.md) and [raw rating evidence](EVALUATION-RATINGS.md) for the [benchmark protocol](EVAL-PROTOCOL.md). Its first version covers global primary quality uncertainty and all seven raw agreement dimensions. Cohort, cost, latency, and agreement confidence intervals, practical-equivalence conclusions, multiple-comparison control, and full protocol inference remain `NOT_EVALUATED`. A consistent numerical report does not select a provider or clear T1/P1.

## Exact input and declared analysis lock

[evaluation-statistics.ts](../../packages/ai/src/evaluation-statistics.ts) accepts the exact input fields:

```text
schema_version: "1.0.0"
statistics_version: "hair-evaluation-statistics-v1"
locked_at_utc
metric_report, metric_report_sha256
analysis_manifest, analysis_manifest_sha256
```

The embedded `{input, result}` metric report is independently validated and recomputed before checking its canonical SHA-256. That process also recomputes the underlying coverage, cost, and rating reports. The separate analysis manifest has exactly these fields:

```text
schema_version: "1.0.0"
statistics_version: "hair-evaluation-statistics-v1"
method_id: "subject_case_percentile_ordinal_alpha_v1"
protocol_id: "hair-eval-v1"
run_id, plan_sha256, frozen_at_utc, seed
seed_stream: "sha256_xorshift32_rejection_v1"
replicates: 10000
lower_rank: 250
upper_rank: 9750
nominal_confidence: "95_percent"
endpoint_convention: "inverse_empirical_cdf_nearest_rank"
```

`seed` is an integer from zero through 4,294,967,295. The manifest must match the run and locked generation-plan hash. Its freeze timestamp must be at least the plan creation timestamp and **strictly earlier** than the first declared attempt start; equality with that start is rejected. All embedded timestamps ending in `_at_utc` must be canonical UTC and no later than the statistical input cutoff. The manifest hash binds fixed conventions and the declared chronology, without authenticating actual preregistration.

## Population and statistic

Each configuration reports both `primary_all_generated` and `primary_declared_gate_passed`. T1's relevant quality analog uses all retained generated primary outputs, including rejected outputs; P1's uses the latest declared gate-passed projection. The latter is conditional on a supplied gate declaration; it is not actual display or general generation performance. Reliability reruns never enlarge a primary denominator. Unknown classifications or unknown membership remain unknown rather than becoming zero or an exclusion.

For each dimension, first take the middle of each output's three valid raw scores, then the median of those output medians. Even-sized dataset medians use the exact mean of the two middle values. Rows `[0,0,5]` and `[4,4,4]` produce output medians zero and four, hence dataset median two. Pooling six raw scores would produce the wrong statistic. Rate statistics use summed success counts divided by summed eligible output counts, retaining the metric's denominator.

Single-configuration uncertainty resamples whole subjects with replacement. Each selected subject contributes every included output, preserving repetitions, variants, and related cases. Subjects with unequal numbers of outputs retain those contributions: ten outputs with nine successes plus two outputs with none give pooled rate `9/12`, not the average of two subject rates.

T1 comparisons draw paired case blocks, with the same sampled blocks used in both configurations and every reported dimension. All repetitions and siblings remain together. A paired subject-block sensitivity calculation additionally preserves correlations between multiple cases from one person. P1 comparisons use paired subject blocks. The exported direction is `A_minus_B`: configuration A's dataset statistic minus configuration B's, not a median or mean of per-case differences. For example, case medians `A=[0,5,5]` and `B=[0,0,5]` have a dataset-median difference of five; the median of their paired differences is zero.

The T1 case-block interval describes case resampling and does not account for correlation between different cases from the same subject. Read it alongside the subject-block sensitivity; neither authenticates the sampling process.

Paired comparisons independently expand the locked plan's case frame, which must exactly match preregistered primary membership and the required stage case count: every case with two repetitions and one variant for T1, or repetition zero and three variants for P1, in each configuration. Comparing two equally deficient declared slot lists cannot establish complete generated coverage. Missing configurations or failed requested slots cannot be silently removed by taking an intersection. Within that full matched frame, the declared-passed projection may exclude known rejected outputs. Sampling keeps the same full blocks on both sides, including a block that contributes zero selected outputs on one side. Matched-frame counts and contributing-population counts are distinct; conditioning on passage does not justify trimming mismatched outcomes. Any replicate with an undefined statistic, including a zero selected denominator, makes that interval unavailable.

## Bootstrap convention and unavailable intervals

The locked profile uses 10,000 deterministic replicates. Each replicate draws as many units as the original population contains, with replacement, and recomputes the named statistic. Sorted replicate values have nominal two-sided 95-percent percentile endpoints at positions **250 and 9,750**, counting from one. This is inverse empirical-CDF nearest rank, without interpolation. Exact point fractions remain separate from floating-point interval endpoints; neither an endpoint nor a rounded percentage supplies a gate verdict.

Each draw updates a shared histogram vector for nineteen functionals: seven dataset medians, seven score-4–5 rates, and displayable, usable, critical, T1-severe, and P1-major rates. Shared block draws apply across these functionals. Counts and point fractions are exact; exported interval arithmetic is identified as `IEEE754_FLOAT64`. Rate differences are fractions of one: `0.03` means three percentage points. Median differences use score points on the zero-to-five scale.

Global intervals require at least ten distinct contributing subjects and twenty outputs. Paired comparisons require those contributing minima on both sides; paired case intervals additionally require twenty jointly contributing cases. These are project guards, not evidence of independent sampling or calibrated coverage. Each population must have complete applicable classification, membership, and score evidence. Keep available point evidence when an interval cannot be reported.

For supported T1/P1 global populations, omitted primary cases or incomplete required stage/case/slot/repetition/preview coverage emits `INCOMPLETE_PRIMARY_FRAME` and blocks intervals, even when the retained outputs themselves are complete. Their exact points remain diagnostics. Thus removing the same cases or slots on both sides cannot turn a partial benchmark into a complete global interval.

An interval remains unavailable for insufficient units, boundary binary rates at zero or one, any undefined replicate, a constant bootstrap distribution, or coincident percentile endpoints. A paired rate interval also remains unavailable when either component rate is at a boundary, even if its point difference exists. Identical configurations can have a known difference of zero and a degenerate replicate distribution; that is not a zero-width confidence claim. Zero observed failures do not establish zero risk. No independent-output binomial interval is substituted for clustered uncertainty.

These intervals are pointwise and nominal. Shared draws preserve dependence within the declared comparison; they do not provide simultaneous coverage, adjust for selecting among many dimensions, or establish practical equivalence.

## Exact seed stream

Configurations and block IDs are sorted by their opaque string values. Each analysis derives `seed_sha256` from canonical JSON containing exactly:

```text
statistics_version, seed_stream, seed, plan_sha256, run_id,
configuration_a_id, configuration_b_id, population, unit
```

For a single configuration, `configuration_b_id` is null and `unit` is `subject`. Pair IDs follow sorted configuration order; units are `paired_case`, `paired_subject_sensitivity`, or `paired_subject`. The hash separates each population and resampling unit while sharing one stream across its nineteen functionals.

Initialize the state from the first eight hexadecimal hash characters as an unsigned 32-bit integer; zero uses the fixed fallback `0x6d2b79f5`. For each candidate, perform the versioned xorshift32 operations in order:

```text
state ^= state << 13
state ^= state >>> 17
state ^= state << 5
candidate = unsigned32(state) − 1
range = 4294967295
limit = floor(range / block_count) × block_count
accept candidate only when candidate < limit
selected_block_index = candidate modulo block_count
```

The shifts use JavaScript 32-bit bitwise semantics; `>>>` is the unsigned right shift. Rejected candidates advance the stream again. Subtracting one accounts for xorshift32's nonzero state range; rejection avoids unequal residue counts in the integer mapping. With initial state one and ten blocks, the first accepted indices are `8,8,0,4,2,3`. This deterministic pseudorandom stream is neither a cryptographic primitive nor evidence of authentic sampling.

## Immutable raw agreement

Agreement uses `primary_all_retained_generated_raw_triples`, including rejected primary outputs, independently of the passed projection and later adjudication. Current adjudication uncertainty does not suppress agreement when all three raw ratings are valid. An invalid or missing raw triple leaves complete agreement unavailable; available counts remain diagnostic. Adjudication never replaces a raw score to manufacture consensus. Reviewer identities may vary across outputs.

For each of the seven dimensions, exact and within-one-point agreement use the three unordered pairs in each triple:

```text
exact = number of pairs with a = b / (3 × output count)
within_one = number of pairs with |a − b| ≤ 1 / (3 × output count)
```

Ordinal Krippendorff alpha uses pooled category frequencies. For complete triples let `n_uc` count category `c` in output `u`, `n_c = Σ_u n_uc`, and `n = 3 × output count`. Sum over ordered category pairs `(c,k)`:

```text
B_ck = Σ_u n_uc × (n_uk − indicator(c = k))
q_ck = (2 × Σ_(g=min(c,k)..max(c,k)) n_g − n_c − n_k)²
q_cc = 0
alpha = 1 − (n − 1) × Σ_(c,k)(B_ck × q_ck)
                / (2 × Σ_(c,k)(n_c × n_k × q_ck))
```

The exported disagreements use ordinal distance `q/4`:

```text
observed_disagreement = Σ_(u,r<s) q_(score_ur,score_us) / (4 × n)
expected_disagreement = 2 × Σ_(c<k)(n_c × n_k × q_ck)
                        / (4 × n × (n − 1))
```

Disagreements use squared pooled-frequency distance units; squared numerical score gaps would instead give interval alpha. Alpha is dimensionless. Zero expected disagreement leaves it undefined; negative alpha remains valid. Constant-score consensus does not establish alpha. Agreement confidence intervals are unevaluated.

Small independent arithmetic references are:

| Raw triples | Ordinal alpha | Exact agreement | Within one |
|---|---:|---:|---:|
| `[0,0,5]`, `[0,5,5]` | `−1/9` | `2/6` | `2/6` |
| `[0,1,2]`, `[0,1,2]` | `−1/4` | `0/6` | `4/6` |
| `[0,0,5]`, `[4,4,4]` | `−1/8` | `4/6` | `4/6` |
| `[0,0,0]`, `[5,5,5]` | `1` | `6/6` | `6/6` |
| `[4,4,4]`, `[4,4,4]` | undefined | `6/6` | `6/6` |

## Method sources and project decisions

Whole-cluster resampling follows the dependence considerations in [Field and Welsh, *Bootstrapping clustered data* (2007)](https://rss.onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9868.2007.00593.x). Repeated observations do not become independent participants; the [Cochrane Handbook's unit-of-analysis guidance](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-06) supports keeping that distinction explicit. Neither source establishes coverage for this particular salon benchmark.

The pooled-frequency ordinal distance and observed-versus-expected disagreement formulation follow [Krippendorff's author algorithm](https://www.asc.upenn.edu/sites/default/files/2021-03/Computing%20Krippendorff%27s%20Alpha-Reliability.pdf). The displayed triple-specific integer rearrangement is independently derived for this profile; it does not change ordinal alpha into interval alpha.

Boundary suppression responds to the coverage failure of percentile proportion intervals described in [Wang, *A note on bootstrap confidence intervals for proportions* (2013)](https://www.sciencedirect.com/science/article/pii/S0167715213002940). The chosen replicate count, nearest-rank convention, minimum populations, and conservative suppression rules are project decisions. They are reproducibility and failure-handling conventions, not claims that percentile intervals are optimal or have calibrated coverage here.

## Bounds and safe metadata

The profile accepts at most three configurations and 1,024 retained outputs; required paired tuple expansion is capped at 10,000 tuples per configuration. The shared histogram calculation bounds bootstrap work to 10,000,000 unit draws; nineteen functionals do not each receive a separate resampling loop. Input preflight permits at most 7,000,000 traversal nodes and whole-report preflight at most 14,000,000, depth 64, arrays of 10,000 entries, strings of 128 characters, and objects of 64 fields with key lengths at most 64. Embedded reports retain their own bounds.

A full P1 pair would require `240 cases × 3 variants × 2 configurations = 1,440` primary outputs, exceeding this version's retained-output cap before reruns. The protocol's normative P1 uses one finalist. Paired-subject P1 methods and guards are defined, but any admitted P1 pair under the current cap lacks full generated coverage and remains incomplete. Informative full-frame P1 pairs are outside this v1 bound and are not claimed as demonstrated evidence.

`planned_unit_draws` sums each analysis's block count multiplied by 10,000, including analyses whose evidence is insufficient. If that sum exceeds the cap, no bootstrap analysis executes and `WORKLOAD_BOUND_EXCEEDED` keeps intervals incomplete; exact point and raw-agreement calculations remain available. `resampling_executed` indicates whether at least one eligible analysis actually ran, rather than treating planned work as completed work.

Descriptor-only preflight rejects proxies, accessors, cycles, sparse arrays, hidden or symbol properties, custom prototypes, and non-JSON values before source serializers run. Null-prototype data objects are permitted. Validation returns detached data; exported methods, bounds, and functional vocabularies are frozen. Rejection errors use only `Evaluation statistics rejected.` These metadata checks cannot grant access to image or invoice artifacts.

## Result and canonical serialization

`evaluateEvaluationStatistics` returns `{input, result}`. Each population records output count, distinct contributing subjects, unknown membership, incomplete classifications, its seed hash, and nineteen observations. Comparisons also expose separate required `expected_tuple_count_a/b` and actual `declared_tuple_count_a/b`, complete tuple coverage, matched and jointly contributing case counts, both selected output/subject counts, and `A_minus_B` direction. T1 emits paired-case and paired-subject-sensitivity comparisons; P1 emits paired-subject comparisons. Other stages cannot establish a supported pair comparison.

Observations retain exact reduced fractions with signed decimal-string numerators and positive decimal-string denominators. `point` and `interval` are independently nullable. `component_a_point` and `component_b_point` expose the underlying exact statistics; for binary rates, `component_a_rate_counts` and `component_b_rate_counts` also retain the unreduced success numerator and output denominator. Single-configuration observations have no B component. `defined_replicates` reports the number with defined statistics. Status is `INFORMATIVE_DECLARED_INTERVAL`, `INCOMPLETE`, `INSUFFICIENT_POPULATION`, or `NON_INFORMATIVE`; findings identify unknown classifications, projection membership, unmatched tuples, incomplete primary frames, minimum-population failures, workload, boundary components, undefined replicates, and degeneracy. A complete point does not imply an available interval.

Raw agreement publishes retained-output and complete/unknown-triple counts, all raw-rating hashes, six pooled category frequencies, known pair counts, and the full-population pair denominator. Complete pair fractions remain null when any applicable triple is unavailable. Its status is `COMPLETE_DECLARED_RAW_AGREEMENT`, `INCOMPLETE`, or `UNDEFINED_ALPHA`.

The result preserves `source_metric_findings` separately. `COMPLETE_DECLARED_STATISTICAL_INPUTS` means no statistical-input incompleteness finding; insufficient populations and undefined alpha can still exist, and source findings do not disappear. It is not a full benchmark or confidence requirement pass.

`serializeEvaluationStatisticReport` validates the whole report, recomputes the embedded metrics and statistical result, requires exact equality with the supplied result, and emits canonical JSON. Forged points, intervals, directions, counts, alpha, seeds, and extra fields cannot be accepted merely because the supplied report hash is consistent.

## Evidence limits

Analysis locks and canonical digests bind declarations; they cannot authenticate historical preregistration, real sampling, reviewers, blinding, qualified viewing, consent, artifact contents, or actual execution. Declared gate passage does not establish actual display. Authentic billing, fully loaded economics, live stylist yes/no usefulness, live T1/P1 quality, release authority, and provider selection remain external evidence. A nominal interval over invented fixture scores carries no claim about hairstyle quality.

## Reproducible synthetic evidence

[evaluation-statistics.test-fixtures.ts](../../packages/ai/src/evaluation-statistics.test-fixtures.ts) builds declared synthetic populations and relocks recomputed source reports. [evaluation-statistics.test.ts](../../packages/ai/src/evaluation-statistics.test.ts) checks repeatability, weighted populations, paired functionals, independent frame guards, missing evidence, raw ordinal arithmetic, chronology, bounds, and serializer tampering. The [golden report](../../tests/evals/evaluation-statistics.golden.json) contains invented metadata and is read-only during verification. No portraits, human identities, viewing sessions, or provider calls are evidence for this profile.

Run focused verification from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-statistics.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
```

Repository status records the integrated verification checkpoint separately from these arithmetic examples. Synthetic reproducibility does not prove nominal interval coverage or real hairstyle quality.

### Integrated checkpoint — 2026-10-03

Independent review reran all 27 focused tests with no outstanding P1/P2 after
repairs to equal shortened repetition sets and an omitted preregistered case.
Both repaired reproductions now deny complete paired evidence. Five independently
computed ordinal alpha examples matched, including negative and undefined alpha.
The seed-5 projected subject comparison has exactly 9,999 defined replicates;
the remaining empty draw keeps the whole interval unavailable.

Root independently checked ten synthetic subjects with two equally scored
outputs each: the rate point is `1/2` with percentile endpoints `0.2` and `0.8`,
and the median point is `2` with endpoints `0` and `4`. Exact binomial counts
independently locate these clustered resampling quantiles; output count is not
used as the number of independent subjects.

Integrated verification passed 482 tests in 19 files, all five TypeScript
projects, a fresh production build, repository safety and the task graph.
The golden was read during verification. No browser behavior changed; prior
browser evidence was preserved without rerunning it. These checks establish
synthetic reproducibility and guarded software behavior within D-024, not
nominal coverage, full protocol inference or live hairstyle quality.
