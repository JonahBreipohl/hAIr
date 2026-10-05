# Declared benchmark report bundle

**Version:** `hair-evaluation-report-bundle-v1`  
**Template:** [hair-eval-report-v1](REPORT-TEMPLATE.md)  
**Scope:** deterministic, metadata-only exports for T1 and P1. Complete export files do not establish complete benchmark evidence.

The bundle implements [D-025](../DECISIONS.md) in [evaluation-report-bundle.ts](../../packages/ai/src/evaluation-report-bundle.ts). It presents recomputed [statistics](EVALUATION-STATISTICS.md), [metrics](EVALUATION-METRICS.md), [ratings](EVALUATION-RATINGS.md), [costs](EVALUATION-COSTS.md), and [coverage](EVALUATION-COVERAGE.md) in the twelve files required by the protocol template. It never reads media, notes, artifact contents, invoices, credentials, repository history, or deployed software. Existing source declarations retain their original scope and limitations.

## Exact input and integrity

`validateEvaluationReportBundleInput` and `exportEvaluationReportBundle` accept exactly these fields:

```text
schema_version: "1.0.0"
report_bundle_version: "hair-evaluation-report-bundle-v1"
report_id: rpt_<16 lowercase hexadecimal characters>
locked_at_utc
declared_code_revision: <40 lowercase hexadecimal characters> or null
statistical_report: {input, result}
statistical_report_sha256
```

The statistics report is recomputed before its canonical SHA-256 is accepted. This transitively revalidates metrics, coverage, costs, ratings, the locked generation plan, retained outputs, failures, retries, and corrections. The export uses those reconciled sources rather than independently supplied table values. All embedded timestamps ending in `_at_utc` must be canonical UTC and no later than the bundle cutoff. Only T1 and P1 are supported. A declared revision is an unauthenticated label; null remains null, and the exporter cannot infer a Git revision, dependency-lock hash, candidate release, or build identity from its environment.

## Twelve fixed files

| File | Retained source and unavailable evidence |
|---|---|
| `report.md` | Applicable T1/P1 headings, columns, gate IDs, and requirements; unavailable cells are explicit. |
| `summary.json` | Bound header, metric references, gates, declared revision, and completeness limitations. Verdict is `INCOMPLETE`, decision is `none`, and selected configuration is null. |
| `configurations.csv` | Non-secret locked settings and artifact identities/hashes. An opaque model-snapshot artifact is not an exact model name or inspected settings payload. |
| `overall-metrics.csv` | Per-configuration primary counts, medians, rates, and matching available statistical intervals, retaining all-generated versus declared-passed scopes. |
| `cohort-metrics.csv` | Declared slices, counts, sufficiency, and numerical observations, including weak or unknown slices. Cohort intervals and sampling authority remain unavailable. |
| `transformation-metrics.csv` | Transformation/input-mode scope tied to exact cases. A combined transformation rate cannot be copied into both input modes. |
| `operational-metrics.csv` | Requested slots, attempts, retries, outcomes, usage, and separate cost channels. Actual display, end-to-end latency, event breakdown, and fully loaded economics remain unavailable. |
| `automated-signals.csv` | Explicit unavailable detector/calibration evidence; analytical gate declarations cannot substitute for executed detector versions, thresholds, or a calibrated display gate. |
| `rater-metrics.csv` | Declared rater mix, raw agreement, and adjudication history. Credentials, calibration, blinding, replacements, and trusted viewing remain unavailable. |
| `critical-failures.csv` | Opaque case/output/configuration links and separately scoped declared diagnoses and historical evidence. Actual displayed status is unavailable. |
| `deviations.json` | Retained declared restrictions and their documented scope; no invented owners, explanations, execution events, or decision authority. |
| `provenance-audit.json` | Locked manifest/count diagnostics and explicit missing permission/approval evidence, without restricted locators or receipts. |

Every file is emitted even when the necessary source evidence is unavailable. Missing categories must remain visible rather than becoming empty tables that imply clearance. Coverage labels and consistent asset hashes cannot authenticate adult eligibility, consent, active provider permission, verified metadata stripping, withdrawal checks, or an approved provenance audit.

The three JSON files retain distinct contracts:

- `summary.json` binds schema/template/protocol/scorecard/report/run/stage identities; verdict, decision, selection; projected manifest hashes; optional `code_revision` with `code_revision_evidence: INCOMPLETE`; the plan's separate revision commitment; gate rows; cutoff-derived creation time; source hashes; missing-evidence codes; metadata export status; metric references; and explicit unevaluated display, inference, spending, and deviation-history authority. Gate observations remain null, while fixed operators/thresholds/units remain visible where defined. `declared_observation_ref` links only an appropriate diagnostic metric and population; a control with no counterpart stays null.
- `deviations.json` uses `scope: retained_declared_coverage_restrictions_only`, `completeness: INCOMPLETE`, and `absence_of_execution_deviations: NOT_EVALUATED`. `records` retains unsupported blocks, physical inapplicability, and a declared finalist-limit override when present. Comparison type, changed factor, coverage findings, source reference/hash, and `decision_capable: false` remain explicit. Empty `records` means no retained declaration, not a complete audit of historical deviations.
- `provenance-audit.json` retains locked asset and metadata hashes, distinct registry-manifest hashes, declared subject/portrait-provenance counts, and coverage findings. Approval, eligible adult count, active provider/human-rating permission counts, withdrawn/expired count, and metadata-strip failure count are null. Status remains `INCOMPLETE`; media and sampling authorization remain `NOT_EVALUATED`.

## Populations, values, and references

All requested slots, logical attempts, usage revisions, retained generated outputs, and declared-passed projections retain separate meanings. Failed attempts and retries cannot disappear from accounting; reliability reruns stay outside primary quality denominators. A declared-passed output is not an authenticated displayed output. Raw ratings and historical review evidence remain separate from current adjudication, and a later cleared diagnosis cannot erase an earlier supported passage.

Operational rows retain every immutable usage revision, while current logical-attempt costs count each invocation once. A correction can repeat the attempt's declared duration without representing another execution. Declared attempt durations do not establish end-to-end result latency or queue/preprocess/provider/postprocess breakdown; those required metrics remain unavailable.

The template's thirteen required metric columns are:

```text
schema_version, report_id, run_id, stage, configuration_id, metric_id,
numerator, denominator, value, unit, ci95_low, ci95_high, calculation_version
```

The export adds `row_id`, `population`, `population_n`, `status`, `evidence_status`, `known_numerator`, `known_denominator`, `source_ref`, `source_sha256`, `ci_source_ref`, `ci_source_sha256`, and `calculation_ref`. These 25 common columns distinguish complete values from known subtotals and identify the bound calculation. `population_n` keeps population size separate from an arithmetic fraction's denominator. Interval references separately identify the recomputed statistics observation; the point's metric reference cannot silently stand in for its uncertainty method. Unavailable values remain null rather than zero; a source hash establishes integrity, not the truth of the supplied declaration. Evidence is explicitly `DECLARED_METADATA_ONLY`.

`reportCsvColumns` freezes every file's full header, including extra columns even when no rows use them. Per-file additions are:

| CSV | Extra columns after the common schema |
|---|---|
| `configurations.csv` | `configuration_sha256`, `configuration_json`, and every non-secret locked configuration field not already common. Artifact/settings locks serialize as canonical JSON. |
| `overall-metrics.csv` | `partition`, `configuration_b_id`, `direction` |
| `cohort-metrics.csv` | `slice_type`, `slice_id`, `generated_sufficiency`, `projected_sufficiency`, `distinct_subject_count` |
| `transformation-metrics.csv` | `transformation`, `input_mode`, `requested_cases` |
| `operational-metrics.csv` | `cost_channel`, `unknown_attempt_count`, `cost_scope`, `denominator_scope`, `attempt_id`, `record_id`, `revision`, `outcome`, `usage_status`, `latest_attempt_sha256`, `invoice_state` |
| `automated-signals.csv` | `detector_id`, `detector_version`, `frozen_threshold`, `calibration_partition`, `production_gate_eligible`, `embedding_execution` |
| `rater-metrics.csv` | `dimension`, `complete_triple_count`, `unknown_triple_count` |
| `critical-failures.csv` | `output_id`, `case_id`, `partition`, `actual_displayed`, `latest_declared_gate_passed`, `code`, `review_round_sha256s` |

Configurations sort by opaque ID. Partitions, metric families, transformations, and input modes follow versioned fixed order; retained source arrays keep their bound order. A global emission counter assigns `row-<eight decimal digits>` IDs, so a single file's IDs need not be consecutive. `source_ref` uses a namespace (`statistics`, `metrics`, `coverage`, `costs`, `ratings`, or `plan`) plus a source JSON pointer. `calculation_ref` identifies this export version and metric. Repeating the same validated input reproduces the same references, rows, and bytes.

Counts retain their original denominator. A reduced rate `1/2` must not erase its source count `10/20`. A median's rational denominator is arithmetic and must not be mistaken for a population size. Monetary values retain their units and formula-estimate versus declared-charge scope; billed usage at list rates is still an estimate. The inherited all-requested spend divided by primary declared usable outputs is not authenticated fully loaded economics or permission to spend.

The Markdown presentation uses exact integer half-up rounding for one-decimal percentages while authoritative comparisons retain source arithmetic. Both `1/101` and `1/100` display as `1.0%`, but only the former satisfies a strict one-percent comparison. Similarly, `7/720` displays `1.0%` while satisfying it; `8/720` does not. Rate intervals remain in their source proportion units: `0.2–0.8` corresponds to `20.0–80.0%`. Paired rate differences use fractions of one; `0.03` means three percentage points. Median differences use score points, alpha is dimensionless, and its disagreement channels use pooled-frequency ordinal squared-distance units. No rounded percentage, interval endpoint, or formatting choice can turn a declared numerical observation into a gate pass.

## Template and gate meanings

The exporter preserves the applicable report's full headings and table columns. T1 includes verdict, run integrity, asset authorization, case/comparison design, configurations, quality, raters, operations, automated calibration, paired comparisons, technical gates, deviations/review, and decision sections. P1 includes its reused T1 tables, production-path flow, rejection audit, cohort floor/gap audit, reliability, stylist usefulness, dependent software/privacy evidence, image-quality gates, release gates, and final sign-off.

The protocol's gate statuses remain unchanged: `PASS` requires complete evidence meeting the exact requirement; `FAIL` requires complete evidence contradicting it; `INCOMPLETE` records missing evidence; `NOT_APPLICABLE` is permitted only for a row explicitly outside that report stage. This version emits template gates as `INCOMPLETE`. It preserves numerical declaration results as diagnostics and cannot promote `DECLARED_SATISFIED` into a live `PASS`. Fixed requirements such as required zero, required audit `PASS`, and “Must be zero” remain intact even when the observed evidence is unknown. Thresholds are not weakened to accommodate available metadata.

`P1_IDENTITY_ESCAPE` links the all-requested `adjudicated_review_escape` diagnostic in `operational-metrics.csv`, preserving retained history including reruns. A latest projected critical-identity count of zero cannot clear an earlier supported reviewed passage after rejection or a cleared diagnosis. This diagnostic remains declared review history, not authenticated actual display; the live gate still remains `INCOMPLETE`.

Unknown fields must not be filled with `none`: that word is reserved for a truly empty declaration or selection. No selected provider, release decision, reviewer signature, code provenance, independent approval, or next-stage authorization is invented. The report cannot authenticate detector use or assert that facial-similarity embeddings were absent merely because no such execution record is supplied. Missing execution/deviation logs cannot establish zero selective regeneration, exclusions, blinding leaks, late callbacks, or duplicate deliveries.

## File envelope and hashes

`exportEvaluationReportBundle` returns `{input, result}`. The result's `COMPLETE_METADATA_EXPORT` status describes file production only; `verdict` remains `INCOMPLETE`. Its twelve `files` entries use the reserved order above and contain `filename`, `media_type`, `content`, `byte_length`, and `content_sha256`. Media types are `text/markdown`, `application/json`, and `text/csv`.

Per-file SHA-256 covers the exact UTF-8 content, and byte length counts encoded bytes rather than JavaScript string characters. The aggregate `bundle_sha256` hashes canonical metadata with domain `hair-evaluation-report-bundle-file-manifest`, bundle version, report/run IDs, stage, and the ordered file metadata without content. `summary.json` does not contain its own file hash, avoiding a circular hash definition. A consistent digest binds emitted bytes and declarations; it cannot establish origin or truth.

The summary's dataset, case, and configuration manifest hashes cover canonical `plan.assets`, `plan.cases`, and `plan.configurations` respectively. In particular, the dataset hash is a locked asset-list projection, not an authenticated permission registry audit. Source hashes remain separately available for the full recomputed reports and locked plan. The provenance audit retains distinct per-asset registry-manifest hashes and labels provenance counts as declared portrait metadata, not all-asset authorization counts.

## CSV protection and bounds

CSV records use CRLF, including a final record terminator. Every cell is double-quoted; embedded quotes are doubled. A null field is the quoted literal `null`, not an empty field or zero. Exact rational display text uses `rational:<numerator>/<denominator>`. Signed integer strings remain exact decimal text, without conversion to an IEEE-754 number; a strict negative-integer grammar permits legitimate signed alpha numerators while rejecting formula expressions. Ordinary finite signed numeric cells also pass a strict numeric grammar. Other text cells reject control characters and leading spreadsheet formula operators, including whitespace-prefixed operators. Quoting is not the formula-injection defense. JSON and Markdown files use LF; JSON is canonical and ends with a newline.

Input traversal is bounded to 14,000,000 nodes and whole-report traversal to 28,000,000, depth 64, arrays of 20,000 entries, objects of 64 fields, and key lengths of 64. Input strings have a 128-character cap. Embedded profiles retain their own bounds, including the statistics profile's three configurations, 1,024 outputs, and 10,000,000 planned unit draws. Each file is at most 8,388,608 UTF-8 bytes; all twelve together are at most 33,554,432 bytes. Each CSV permits at most 20,000 data rows.

Descriptor-only preflight rejects proxies, getters, hidden/symbol properties, cycles, sparse arrays, custom prototypes, and non-JSON values before source serializers run. Null-prototype data objects are permitted. Validation returns detached data. Rejection errors use only `Evaluation report bundle rejected.`

`serializeEvaluationReportBundle` revalidates the source and regenerates every file, then requires exact equality with the asserted result before emitting canonical JSON. Altered content cannot be accepted by merely recomputing its asserted file or aggregate hash. File order, byte counts, schemas, references, and incomplete authority remain part of the reproducible result.

## Privacy and decision limits

The twelve reserved bundle filenames and internal calculation references identify export artifacts; they are not customer-media filenames or storage locations. Closed schemas exclude raw notes, prompts, names, locators, contact details, media, secrets, and arbitrary decision text. Visual examples remain outside the bundle on a separately authorized restricted surface.

Producing all twelve files establishes a reproducible presentation of the supplied declarations. It does not authenticate sampling, images, permissions, reviewer qualification, viewing, display, billing, latency, independent review, deployed software, or practical equivalence. T1/P1 image-quality gates, pilot release, provider selection, and paid calls remain unauthorized by this export.

## Reproducible synthetic evidence

[evaluation-report-bundle.test-fixtures.ts](../../packages/ai/src/evaluation-report-bundle.test-fixtures.ts) constructs invented, bounded T1/P1 declarations. [evaluation-report-bundle.test.ts](../../packages/ai/src/evaluation-report-bundle.test.ts) checks all twelve files, byte hashes, fixed headers, template requirements, source/interval references, gate diagnostic mappings, exact accounting, safe signed arithmetic, missing evidence, tampering, and deterministic reproduction. The [golden bundle](../../tests/evals/evaluation-report-bundle.golden.json) is invented metadata and read-only during verification. No portraits or live decisions are evidence for these exports.

Run focused verification from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-report-bundle.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
```

Repository status records the integrated verification checkpoint. A reproducible synthetic bundle does not complete a real benchmark or authorize its verdict.

## Integrated checkpoint — 2026-10-04

Independent review reran all 19 focused exporter tests with no outstanding
P1/P2. Repaired data-dependent headers, requirement preservation, semantic gate
links, interval source joins, undefined empty rates and historical escape links.
Both T1 and P1 keep all 1,520 tested denominator-zero rows' values and intervals
null, retaining counts and `EMPTY_POPULATION`. A later rejected observation and
clear decision still leave a historical adjudicated escape of `1/2` available
through the P1 identity-escape diagnostic reference.

Root independently checked each stage's twelve files, exact UTF-8 bytes and
hashes, literal template headings, stable gate IDs and incomplete verdicts.
An additional ten-subject, twenty-output population preserved exact `10/20`
counts and interval endpoints `0.2` and `0.8`; its explicit interval pointer and
hash resolved to the matching statistical observation. This tests a populated
interval separately from the tiny golden's unavailable intervals.

Integrated verification passed 501 tests in 20 files, all five TypeScript
projects, a fresh production build, repository safety and the task graph.
Example files were materialized under ignored `tmp/report-bundle-T1/` and
`tmp/report-bundle-P1/`. Goldens were read during normal verification. Prior
browser evidence was preserved without rerunning it for this metadata-only
change. These checks establish declared metadata export integrity; all template
and live-quality/release/provider/spend authority remains incomplete or
unevaluated.
