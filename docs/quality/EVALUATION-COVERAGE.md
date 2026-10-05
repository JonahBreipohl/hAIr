# Preregistered benchmark coverage

**Version:** `hair-evaluation-coverage-v1`  
**Protocol:** `hair-eval-v1`  
**Scope:** `PROTO-007`, declared metadata counts and comparison populations

`packages/ai/src/evaluation-coverage.ts` checks planned benchmark subjects, cases, transformations, references, repetitions, and requested output slots. It does not inspect images, infer personal traits, execute generation, authenticate registry records, measure delivered image quality, or grant permission to transfer media.

`declared_counts_status: COMPLETE` means the supplied declared populations and supported metadata satisfy the implemented count/comparison rules. `coverage_status: COMPLETE_SYNTHETIC_METADATA` applies only to synthetic metadata declarations; it does not attest synthetic origin or require a trusted synthetic registry. Unverified registry projections always produce `coverage_status: INCOMPLETE`, even when their count arithmetic is complete. Every result records `media_authorization: NOT_EVALUATED`, `image_quality_gate: NOT_EVALUATED`, and `live_evidence_present: false`. These results are not an authorized-run readiness or release verdict.

## Exact schema and locks

Input has exactly `plan`, `preregistration`, `metadata`, and nullable `parent_plan`. Plans use the [locked evaluation contracts](EVALUATION-RECORDS.md). Unknown/missing fields, non-enumerable/symbol/accessor properties, custom prototypes, sparse/augmented arrays, invalid enums, coercible primitives, unsafe IDs/hashes, and noncanonical UTC times are rejected before reporting. Denials always say `Evaluation coverage rejected.`; rejected values never enter exception text or the safe export. Arrays are bounded to 10,000 elements. Expected slot cardinality is calculated before tuple materialization; declarations above the locked-plan 10,000-slot limit remain incomplete without expanding that set.

Preregistration contains the versioned protocol/run/record/time envelope plus:

- locked `plan_sha256`, canonical `metadata_sha256`, and nullable `parent_plan_sha256`;
- dataset ID and fixed assignment seed;
- explicit primary case IDs, separate reliability rerun case IDs, and nullable H0 repetition count;
- exact unsupported configuration/case blocks with fixed reason and evidence artifact;
- declared physical-inapplicability cohort/transform entries with evidence artifacts;
- optional preregistered T1 finalist-limit extension; and
- `single_factor` or `bundled_configuration` comparison and a controlled named changed factor.

Preregistration must occur after its case/configuration/asset and annotation records exist and no later than plan freeze. It binds the full selected parent corpus, annotations, and plan, so those records cannot drift while retaining the same registration. This checks internal timestamp relationships; authentic preregistration, immutable storage, and generation start clocks are future service responsibilities. Dataset ID and assignment seed freeze the declaration but do not prove that a statistical sampling algorithm ran.

Metadata records have the common envelope, exact source asset/subject IDs, source content and full registry-manifest hashes, and an annotation artifact. They contain only controlled provenance/adult state, scheme, `ST1`–`ST6`, `HT1`–`HT4`, assignment methods, texture-obscured and visible-consented-edit flags, and the fixed secondary tags below. Null/missing coverage evidence is represented explicitly and cannot support a complete required cohort. Source/subject/content/registry bindings must match the locked plan; conflicting subject labels or identical portrait content hashes attributed to different subjects cause incomplete coverage. Multiple photos do not increase distinct subject counts.

Distinct subject counting depends on trusted canonical subject issuance. The checker can detect identical source bytes assigned to different subjects, but it cannot recognize that different pictures, crops, or recompressed files depict the same person. It performs no face recognition. A future steward/registry must reconcile those aliases before projection; caller IDs and content hashes alone cannot prove distinct real adults.

The annotation artifact content hash is SHA-256 of canonical JSON for the entire metadata record **except `annotation_artifact`**. This non-circular payload includes its envelope, asset/subject/registry bindings, declared authority, assignment methods, and every label/tag/flag. The registry or steward must issue random opaque IDs and validate the actual annotation source independently. Hashes prove consistency, not truth, signatures, adult status, permitted use, or an authentic participant/steward assertion. A caller's `verified_adult`, `visible_consented_edit`, or evidence hash never authorizes media.

Synthetic fixture labels use assignment `synthetic_fixture`. Real projections use only `participant_confirmed` or `trained_steward`; `missing` is explicit missing evidence. If source texture is obscured by very short/shaved/bald, protective, or covered styling, a real core projection must use participant-confirmed texture. Covered/occluded core annotations also require a visible, consented requested edit; otherwise they cannot clear core coverage. These are supplied research metadata, not outputs of an inference system. No age band, ethnicity, gender, attractiveness, medical diagnosis, or face embedding is accepted.

| Controlled tag | P1 minimum distinct subjects |
|---|---:|
| `gray_or_white` | 18 |
| `low_density_or_thinning` | 12 |
| `very_short_shaved_or_bald` | 12 |
| `protective_style` | 20 |
| `long_below_shoulders` | 18 |
| `glasses_or_accessories` | 18 |
| `head_covering_or_partial_occlusion` | 8 |
| `mixed_or_nonstudio_lighting` | 24 |
| `side_or_three_quarter` | 24 |

This annotation vocabulary implements the protocol's test conditions. It does not broaden the existing asset-eligibility validator's permitted rights or tag schema. Existing light-condition annotations (mixed, backlit, uneven) must be grouped into the one lighting condition without counting a subject more than once. Protective style, long-below-shoulder, and side/three-quarter require their own steward/participant annotation record; they cannot be inferred from texture group, tone, or another label. A future trusted projection must resolve the attestation and align approved registry vocabulary. Until that integration exists, real projections remain explicitly incomplete.

## Stage rules

| Stage | Primary sample | Per supported configuration | Parent/extra conditions |
|---|---|---|---|
| H0 | 8 synthetic subjects, 32 cases | Declared 1–3 previews and preregistered repetitions | A case is not an output slot; the fixture demonstrates 32 cases × 3 previews × 2 repetitions = 192 slots |
| T0 | 12 distinct subjects, 24 cases, two different transform specs per subject | One output/case | Exact case population sampled from a locked 36-subject/72-case T1 corpus |
| T1 | 36 distinct subjects, 72 cases, two different transform specs per subject | Two repetitions, one output/case/repetition | At most three configurations unless explicitly preregistered otherwise |
| R0 | 12 sentinel cases | One output/case | Exact subset of locked T1; the protocol does not prescribe 12 distinct subjects |
| P1 | 120 distinct subjects, 240 cases, two different transform specs per subject | One selected configuration, three outputs/case = 720 primary slots | 24 separate stratified case reruns × three outputs = 72 additional slots; none enters the primary denominator |

T0/R0 parent checks bind full corpus hashes, stage, 36 distinct subjects/72 cases, chronology, source/reference asset content and registry-manifest hashes, subject ID, specification/prompt-input artifacts, transformation, and compatible preprocessing. They do not prove parent generation, human approval, statistical sampling, or a passed parent quality gate. A missing parent or changed input fails coverage. Parent stage/cohort quality and registry authorization are separate evidence.

T1/P1 implement the exact eight-transform totals from `EVAL-PROTOCOL.md`: T1 `[9,9,9,8,8,9,9,11]`; P1 `[30,30,30,24,24,30,30,42]`. T1 includes at least one subject in every 6 × 4 cell; P1 has exactly five distinct subjects per cell. Every tone **band** and texture **group** must receive all eight transformations. Intersections are counted for subject allocation; demanding all eight transforms in all 24 T1 intersections would contradict its 72-case size.

Reference mode is counted independently: exactly 24 T1 or 72 P1 cases, covering all eight transforms, six tone bands, four texture groups, and all 24 primary cells. The operational nonconcentration minimum is one reference-driven case per cell; the synthetic fixtures use one/cell for T1 and three/cell for P1. Secondary conditions must appear across at least two transformations, tone bands, and texture groups. T1 has at least 12 annotated challenge subjects; P1 implements all nine minima above. The P1 rerun interpretation is one case per primary cell, representation of all eight transforms, and both reference-driven and attribute-only input modes; no fixed ratio is imposed. The fixture further balances three reruns/transform and 12 cases of each input mode. These are count rules on declarations, not judgments of physical feasibility.

Every required case/configuration/repetition/variant tuple must exist exactly once. Missing or extra repeats, invalid primary/rerun registrations, incomplete preview groups, extra primary cases, and absent configuration populations prevent completeness. Aggregate totals cannot hide a missing subgroup or slot.

## Comparison and unsupported controls

The shared case rows freeze source, reference, specification, and prompt inputs across configurations. Supported configurations use the same declared case/repetition populations, preview count, preprocessing, timeout, retry budget, concurrency, and idempotency policy. Resolution and output format remain fixed. Named single-factor comparisons reject other tuple changes; bundled comparisons explicitly disclose parameter confounding while retaining population/input controls. Provider/model, prompt/conversion, full mask recipe, generation settings/seed, output quality, and moderation are controlled factor groups.

The mask factor includes segmentation/version, dilation/feather, manual edits, strategy, and protected-region definitions. Configurations sharing the **same complete recipe** must use identical mask/protected input IDs for each case. All recipe peers are compared, including later peers after a prompt-only baseline. Separately derived masks are allowed when the declared factor or bundled comparison actually changes the recipe. Recipe artifact resolution and actual mask generation are outside this checker.

Unsupported blocks bind fixed configuration/case sets before freeze. Declared absent blocks can be reconciled as `comparison_status: DECLARED_UNSUPPORTED`, but they keep coverage incomplete and cannot shrink stage denominators, replace missing P1 primary slots, or waive cohort requirements. An opaque physical-inapplicability evidence pointer is similarly unresolved: it always adds `PHYSICAL_RESTRICTION_UNRESOLVED` and keeps coverage incomplete. No tone-based physical assumption or unvalidated attestation can produce a complete result.

## Reproducible evidence and remaining gates

`packages/ai/src/evaluation-coverage.test-fixtures.ts` constructs deterministic metadata-only H0/T0/T1/R0/P1 inputs. It uses fixed seeded quota allocation and a deterministic integer flow to preserve exact transform, reference, and rerun counts. Allocation search or flow failure throws rather than relaxing requirements. The T1/P1 mathematical allocation was independently checked before integration. `tests/evals/evaluation-coverage.golden.json` locks each input/result digest, stage counts, and explicit unevaluated image-quality status.

Tests reconstruct the five complete synthetic shapes and challenge missing populations/repetitions, separate rerun denominators, changed source/reference/spec/prompt contents, immutable annotation/parent locks, duplicated portrait subject inflation, insufficient labels/tags, unverified real authority, unchecked waivers, mask recipe peers, confounding, unsafe schema input, and forged exports. `serializeEvaluationCoverageReport` validates input and recomputes every result before accepting a deserialized report; callers cannot insert a pass, change counts, or export unknown fields.

```text
node node_modules/vitest/vitest.mjs run packages/ai/src/evaluation-coverage.test.ts
node node_modules/typescript/bin/tsc -p packages/ai/tsconfig.json --noEmit
node scripts/check-repository-safety.mjs
```

Golden updates require explicitly setting `HAIR_UPDATE_COVERAGE_GOLDEN=1` for that test command, inspecting the changed evidence, then rerunning normally. Ordinary runs never rewrite the golden.

This task leaves real registry/projection attestation, sampling execution, authorized media, provider controls and spend authority, worker/decode preflight, invocation/rating scheduling, calibrated image signals, human ratings/adjudication, pricing, delivered-output cohort sufficiency, and image-quality/release gate calculations unevaluated. A complete synthetic declared shape cannot substitute for those gates.

## Reviewed checkpoint — 2026-10-02

All 30 focused tests and all 283 repository tests pass, with AI/service-integration/web TypeScript checks and the repository safety scan. Independent review verified annotation and parent locks, duplicate-content subject checks, unresolved physical restrictions, complete mask-recipe peer comparisons, both P1 rerun input modes, supported real assignment methods, and bounded tuple expansion. The original all-reference rerun and nonexistent unsupported-ID expansion reproductions now return `INCOMPLETE`; the latter does not expand 96,000 expected tuples. No outstanding P1/P2 remains within this declared metadata coverage scope. Live authority, media, and image-quality gates remain unevaluated.
