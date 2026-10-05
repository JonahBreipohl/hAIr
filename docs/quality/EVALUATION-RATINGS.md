# Declared human ratings and adjudication

**Version:** `hair-evaluation-ratings-v1`  
**Scope:** consistency of locked, declared rating metadata for every retained output. Synthetic evidence contains invented reviewers, scores, and artifact locks; it represents no people, portraits, credentials, viewing permissions, or actual judgments.

The implementation is [evaluation-ratings.ts](../../packages/ai/src/evaluation-ratings.ts), under [D-022](../DECISIONS.md). [SCORECARD.md](SCORECARD.md) supplies the seven score dimensions and controlled vocabulary; [EVAL-PROTOCOL.md](EVAL-PROTOCOL.md) supplies the review obligations. This profile neither contacts a provider nor resolves rationale or viewer artifacts.

## Exact input and population

`validateEvaluationRatingInput` and `evaluateEvaluationRatings` accept exactly:

```text
{bundle, bundle_sha256, locked_at_utc, scorecard_lock,
 assignments, assignments_sha256, ratings,
 observations, observations_sha256, adjudications}
```

The complete bundle passes [EVALUATION-RECORDS.md](EVALUATION-RECORDS.md), and its canonical digest must match `bundle_sha256`. The cutoff `locked_at_utc` covers the plan and all retained records. `scorecard_lock` contains `scorecard_id: "hair-scorecard-v1"` and an opaque artifact ID plus SHA-256 content hash. Digests check supplied integrity and linkage; they authenticate neither the records nor the referenced artifacts.

The population is **all retained output records**, including outputs with disposition `rejected`. Failed attempts without an output remain in the bound bundle; no rating is invented for them. This differs from [EVALUATION-SCHEDULING.md](EVALUATION-SCHEDULING.md), whose current rating scheduler orders candidates only. No candidate schedule is silently extended to rejected outputs. P1 rejected-output sampling and production viewer assignments require a later integration.

The assignment manifest has exactly:

```text
schema_version: "1.0.0"
ratings_version: "hair-evaluation-ratings-v1"
protocol_id: "hair-eval-v1"
scorecard_id: "hair-scorecard-v1"
run_id, frozen_at_utc, population_output_ids, assignments
```

Its population IDs equal the complete retained-output set. Each assignment contains `assignment_id`, `output_id`, `rater_id`, `rater_role`, and `assignment_position`. Version 1 requires exactly three primary assignments per output: two `licensed_stylist` roles and one `general` role, with three distinct opaque reviewer IDs. A reviewer has one declared primary role across the manifest, and each reviewer/position pair is unique. Position declarations do not prove scheduling, independence of actual people, or qualification.

## Raw ratings

A raw row contains exactly these fields:

```text
record_id, rating_id, protocol_id, scorecard_id, run_id
assignment_id, output_id, case_id, rater_id
viewer_artifact, started_at_utc, completed_at_utc, submitted_at_utc
rating_valid, invalid_reason
critical_fail_codes, major_artifact_codes, artifact_tags
confidence, rationale_artifact
identity_score, adherence_score, locality_score, boundary_score,
realism_score, color_score, consultation_usefulness_score
```

The assignment, output, case, reviewer, run, and scorecard must agree with the locked records. Each primary assignment accepts at most one immutable rating. Duplicate rows, changed-score replacements, corrections, and additional primary reviewers are rejected in v1. Missing rows are retained as incomplete evidence. A reviewed correction/replacement workflow requires a new accepted profile.

Valid rows require all seven integer scores from zero through five and `invalid_reason: null`. Invalid rows require all seven scores to be null and one controlled reason: `viewer_failure`, `source_corrupt`, `reference_mismatch`, `manifest_mismatch`, or `other_review_required`. They preserve observations and flags but do not supply score coverage. Confidence is `high`, `medium`, or `low`; it never weights scores.

Critical codes are `CF_IDENTITY`, `CF_LOCALITY`, `CF_ANATOMY`, `CF_SUBJECT`, `CF_REQUEST`, `CF_SAFETY`, `CF_PRIVACY`, and `CF_CORRUPT`. Major codes are `MA_IDENTITY`, `MA_ANATOMY`, `MA_HAIRLINE`, and `MA_BACKGROUND`. Artifact tags use the closed scorecard list. Arrays reject duplicate or unsupported codes.

A critical flag, major flag, or `other` artifact tag requires an opaque `rationale_artifact` lock. Free-text comments and notes are not accepted. Rationale, viewer, scorecard, and bundle artifact roles cannot share an artifact identity across roles; repeated IDs within a role must retain the same content hash. The validator cannot inspect a rationale, verify its factual content, or prove privacy compliance of bytes held elsewhere.

## Observations and triggers

Each output needs at least one control observation. Each record contains `record_id`, `output_id`, `revision`, `previous_record_sha256`, `recorded_at_utc`, `automated_display_gate`, and `configuration_decision_sensitivity`. The gate declaration is `passed`, `rejected`, or `unknown`; sensitivity is `changed`, `unchanged`, or `unknown`. The entire ordered observation array must match `observations_sha256`.

Observation revisions start at zero with a null predecessor; later revisions increment by one and bind the prior record hash. They retain previous evidence. Unknown latest observations remain incomplete. A known current sensitivity observation must be recorded at or after every submitted raw rating for the output; an earlier declaration is stale. Early automated observations may remain in history.

Triggers are recomputed from the raw rows and retained observation history:

| Trigger | Declared condition |
|---|---|
| `CRITICAL_FAIL` | Any raw row has a critical code, including an invalid row. |
| `CRITICAL_RANGE` | Valid identity, locality, or adherence scores have a range of at least three; two valid rows can establish this trigger. |
| `BOUNDARY_LOW_SCORE` | Exactly three valid rows have a critical-dimension median of four and at least one score from zero through two. |
| `INVALID_OBSERVATION` | Any primary row is invalid, including unanimous invalidity. |
| `VALIDITY_DISAGREEMENT` | Rows differ in validity or controlled invalid reason. |
| `AUTOMATED_GATE_ESCAPE` | An observation in history declares gate passage and a raw row marks a major artifact or `CF_IDENTITY`/`CF_ANATOMY`. |
| `CONFIGURATION_DECISION_CHANGED` | Any retained observation declares changed decision sensitivity. |

For critical dimensions, `[2,4,4]` triggers the boundary rule despite a range of only two; `[2,4,5]` triggers both numeric rules; `[1,3,4]` triggers range only. `[3,4,5]`, `[2,3,4]`, and `[0,2,2]` trigger neither. These numeric rules do not apply to boundary, realism, color, or usefulness scores. Critical flags require review even when every score is five.

A later `rejected` or `unchanged` observation cannot erase historical escape or decision-change triggers. These declarations do not attest a detector, actual display, or a configuration analysis.

## Independent adjudication and chronology

An adjudication record contains exactly:

```text
record_id, adjudication_id, protocol_id, scorecard_id, run_id, output_id
revision, previous_record_sha256
reviewed_rating_sha256s, observation_record_sha256, trigger_codes
started_at_utc, completed_at_utc, votes
```

A round binds every raw rating for its output submitted by the round's start, the reviewed observation and its revision history, and exactly the recomputed trigger set. It cannot omit inconvenient submitted ratings. Later raw submissions or a newer observation make an older round stale; resolving the current evidence requires a new linked round. Revisions retain the same adjudication/output identity, increment by one, and hash the prior record.

Each vote contains reviewer ID and process role, start/end timestamps, `input_valid`, `invalid_reason`, critical and major code arrays, `production_displayable`, and a required rationale artifact. The first two reviewers have distinct IDs and collectively declare `licensed_stylist` and `evaluation_safety_lead` roles. Neither can be a primary assignee for that output, including an assignee who has not submitted a rating.

Compare substantive decisions as sets of codes plus validity/reason/displayability; differing rationale hashes do not create a split. Matching decisions use two votes. A split with only two votes remains incomplete. A resolving third vote must use a third distinct ID, be independent of every primary assignee, declare process role `independent_resolver`, and begin after both initial votes complete. This role describes the round, not real credentials. The third decision may combine diagnoses rather than copy either initial vote.

The required supplied chronology is:

- All output records exist before assignment freeze; the freeze falls between plan creation and the report cutoff.
- Rating start follows assignment freeze; start ≤ completion ≤ submission ≤ cutoff. The raw array follows nondecreasing submission time.
- Observations follow their output's creation; revisions have nondecreasing observation time and remain within cutoff.
- Adjudication starts after the assignment freeze and its reviewed observation. Reviewed ratings have already been submitted. Vote intervals fall inside the round; a subsequent round starts after the previous round completes.

These timestamps are consistency checks on declarations, not authenticated proof of sequence or blinding.

## Incompleteness and classification

Missing/invalid primary ratings, unknown/stale observations, required missing adjudication, stale rounds, unresolved splits, and unresolved validity leave the output `INCOMPLETE`. A structurally valid contradictory final classification is retained as incomplete: `MA_IDENTITY` requires `CF_IDENTITY`, and `MA_ANATOMY` requires `CF_ANATOMY`. The module does not infer additional critical mappings from hairline/background major codes.

A vote cannot declare displayability with invalid input or any critical code. Declared input exclusions are preserved but remain unapplied; v1 supplies no exclusion or replacement authority. `other_review_required` remains unresolved. Generated corruption stays critical/operational evidence: a raw `CF_CORRUPT` plus an input-exclusion decision produces a conflict finding rather than removing the failure.

Adjudication never supplies replacement numeric scores. Declared medians use the middle of three valid raw scores; they may be reported alongside other incomplete findings, and are null when coverage is missing/invalid or the current final vote excludes the input. Clearing a flag by declaration retains both the original raw flag and `raw_flags_cleared_by_declaration` lineage.

The run is `COMPLETE_DECLARED_RATINGS` only when every retained output has complete declared metadata. An empty retained population is explicitly marked `empty_population`; it establishes no stage or quality denominator.

## Bounds, serialization, and evidence limits

The current profile accepts at most 1,024 retained outputs, three assignments per output, and positions from zero through 1,023. General rating/observation/assignment collections are capped at 8,192; adjudication collections at 1,024; observation and adjudication revisions at 1,023. Descriptor-only preflight limits arrays to 10,000 entries, input traversal to 1,000,000 nodes and depth 64, strings to 128 characters, and object keys to 64 characters with at most 64 fields. Whole-report serialization allows 2,000,000 traversal nodes for the combined input/result. Nested proxies, accessors, hidden/symbol properties, sparse arrays, cycles, non-JSON types, and custom prototypes are rejected before inherited validators can execute them. Null-prototype data objects are accepted. Exported score/code/tag tuples are frozen at runtime so callers cannot widen the policy lists.

`serializeEvaluationRatingReport` validates the complete `{input, result}`, recomputes the result, requires exact equality, and emits canonical JSON. Modified counts, findings, classification, medians, gate states, or extra private fields cannot be serialized as verified output. Errors use the generic text `Evaluation ratings rejected.` without echoing supplied values. Validation returns detached data.

Every report keeps `media_authorization`, `reviewer_qualification`, `reviewer_identity`, `calibration`, `blinding`, `assignment_order`, `full_stage_coverage`, `usable_result_denominator`, `quality_gate`, and `release_gate` at `NOT_EVALUATED`. Qualified raters, an authorized neutral viewer, verified scheduling, actual notes, trusted artifact resolution, correction/replacement and exclusion policies, P1 sampling, displayed/usable denominators, live billing, and release decisions remain separate work. No role, rationale hash, or completion label grants that authority.

## Reproducible synthetic evidence

[evaluation-ratings.test-fixtures.ts](../../packages/ai/src/evaluation-ratings.test-fixtures.ts) constructs invented rows and linked rounds from the safe [record fixture](../../tests/evals/evaluation-records.fixture.json). [evaluation-ratings.test.ts](../../packages/ai/src/evaluation-ratings.test.ts) checks score boundaries, invalidity, roles, chronology, history, linkage, adversarial input, and serializer tampering. The [golden report](../../tests/evals/evaluation-ratings.golden.json) records synthetic metadata only.

Run the focused verification from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-ratings.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
```

Passing these checks verifies the declared metadata profile, not actual human review or image quality. Repository status records the integrated verification checkpoint.

## Reviewed checkpoint — 2026-10-03

Independent review passed all 29 focused tests after repairs for mutable policy
lists, report-cutoff coverage, stale sensitivity observations, split-process
roles and contradictory final diagnoses. The cutoff regression first validates
an appended usage correction through the inherited bundle validator, then
confirms the rating boundary refuses evidence beyond its cutoff. No outstanding
material P1/P2 remains in the reviewed metadata scope.

The integrated checkpoint passed 426 tests in 17 files, five TypeScript projects
and a fresh production build. A separate root enumeration exercised all 216
score triplets across all seven dimensions (1,512 evaluations); the numeric
triggers appeared only in identity, adherence and locality. Browser behavior
did not change, so prior browser evidence was retained without rerunning it.
All fixture reviewers and judgments remain invented metadata.
