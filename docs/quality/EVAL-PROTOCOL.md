# Image evaluation protocol

**Protocol ID:** `hair-eval-v1`\
**Status:** implementation contract for DISC-003\
**Applies to:** provider, model, prompt, mask, protected-region, and generation-quality decisions\
**Authority:** this document operationalizes the benchmark and gates in [`../QUALITY.md`](../QUALITY.md). If the two conflict, `QUALITY.md` controls until the conflict is resolved through a recorded decision.

Implementation coverage and remaining runner gaps are tracked in [`HARNESS-IMPLEMENTATION.md`](HARNESS-IMPLEMENTATION.md). A passing AI-package H0 preflight is prerequisite evidence only; it does not authorize assets, clear T1/P1, or replace the service-level failure probes required below.

## Purpose

This protocol determines whether generated hairstyle previews preserve the client, follow the requested hair change, remain local to the intended area, look plausible, and are useful in a real salon consultation. It also measures latency, failures, retries, and cost.

The protocol is designed for a deterministic harness. A rerun with the same locked manifests, harness version, and supported seeds must select the same cases, assignments, output order, calculations, and report structure. Model outputs may still vary when a provider does not support deterministic generation; repeated runs quantify that variation.

This protocol does not authorize benchmark assets, replace consent, prove that a chemical service is achievable, or permit a provider to retain or train on portraits. Asset eligibility is governed by [`ASSET-PROVENANCE.md`](ASSET-PROVENANCE.md).

## Evaluation units and required records

Use these terms consistently:

| Unit | Definition |
|---|---|
| Asset | One source portrait, optional reference image, or derived mask with a stable opaque ID. |
| Subject | One consented adult represented by one or more source assets. Synthetic people receive synthetic subject IDs. |
| Case | A locked source asset, optional reference asset, structured hair specification, prompt inputs, mask inputs, and expected transformation class. |
| Consultation spec | A user-level requested direction. One spec normally asks for three preview variants. |
| Configuration | A complete provider/model, prompt version, mask strategy, protected-region strategy, settings, moderation policy, and output-resolution tuple. |
| Attempt | One billable or provider-visible invocation, including timeout, rejection, malformed response, and retry. |
| Output | One decoded generated image tied to exactly one attempt and variant slot. |
| Displayed output | An output that the production output gate would show to the stylist/client. Rejected outputs remain in attempted-output metrics. |
| Usable result | A displayed output with no critical fail and median scores of at least 4 for identity, adherence, locality, realism, and consultation usefulness. |

The future harness must write append-only, schema-versioned records for:

- `asset-manifest`: opaque asset and consent/license facts, never portrait bytes or personal identifiers;
- `case-manifest`: case assignment and input asset IDs;
- `config-manifest`: every variable that can affect generation;
- `run-event`: timestamps, state transitions, usage, cost inputs, failures, retries, and output IDs;
- `automated-signal`: detector version, raw value, threshold, and flag;
- `rating`: blinded human scorecard rows;
- `adjudication`: disagreement decisions without overwriting raw ratings;
- `report`: calculated denominators, confidence intervals, gate results, and deviations.

Every record includes `schema_version`, `protocol_id`, `run_id`, `created_at_utc`, and a stable ID. Every manifest is canonicalized and SHA-256 hashed before the first live call. The run report records those hashes and the exact code revision. Image bytes, raw prompts, names, provider URLs, and secrets are prohibited from reports and routine logs.

## Staged datasets and run sizes

The stages form a funnel. Screening can eliminate clearly inferior configurations, but a release decision may use only the applicable confirmation stage.

| Stage | Locked subjects | Cases and repetitions | Human review | Decision supported |
|---|---:|---|---|---|
| H0 — harness dry run | 8 synthetic subjects | 32 fake-provider cases; deterministic success, failure, timeout, partial, and rejection fixtures | None required | Schema, calculation, redaction, and report correctness only |
| T0 — live configuration screen | 12 subjects sampled from the technical set | 24 cases × 1 output per candidate configuration | One trained stylist screen plus automated signals; every suspected critical fail reviewed | Eliminate unsafe or clearly dominated candidates; cannot clear a gate |
| T1 — technical prototype confirmation | 36 adults from the 30–50-person technical spike set | 72 locked cases × 2 independent repetitions per finalist configuration; maximum three finalists unless pre-registered otherwise | At least two licensed stylists and one general rater per output | Select a configuration and decide the technical prototype gate |
| R0 — controlled regression smoke | 12 locked sentinel cases drawn from T1 | 1 output per case and affected configuration, plus required fake-provider checks | Targeted review of flags and a four-case random sample | Detect obvious regression; cannot replace T1 or P1 |
| P1 — pilot release confirmation | 120 adults | 2 consultation specs per subject × 3 production-path preview slots = 720 output slots for the selected configuration; 24 stratified cases receive one additional reliability rerun | At least two licensed stylists and one general rater per displayed output; stratified human audit of rejected outputs | Decide the pilot image-quality gate |

The T1 corpus is fixed at 36 subjects for version 1 so runs are comparable and remain inside the 30–50-person range in `QUALITY.md`. More subjects may be added through a new dataset version; do not silently substitute assets inside a version.

The P1 denominator includes all 720 requested output slots. A failed, rejected, or missing slot counts in reliability and cost metrics. Human quality-rate denominators state whether they use valid generated outputs or displayed outputs, as specified under **Gate calculations**. The 24 P1 reliability reruns are reported separately and never used to improve the primary 720-slot result.

## Cohort design

### Primary 120-person balance

The pilot core contains five distinct adults in every cell of a six-band visible skin-tone coverage scheme and four broad source-hair-texture groups:

| Pilot allocation | HT1 straight | HT2 wavy | HT3 curly | HT4 coily | Row total |
|---|---:|---:|---:|---:|---:|
| ST1 | 5 | 5 | 5 | 5 | 20 |
| ST2 | 5 | 5 | 5 | 5 | 20 |
| ST3 | 5 | 5 | 5 | 5 | 20 |
| ST4 | 5 | 5 | 5 | 5 | 20 |
| ST5 | 5 | 5 | 5 | 5 | 20 |
| ST6 | 5 | 5 | 5 | 5 | 20 |
| Column total | 30 | 30 | 30 | 30 | 120 |

`ST1`–`ST6` are evaluation coverage bands tied to a versioned set of neutral reference swatches, not ethnicity or a medical phototype. `HT1`–`HT4` are broad visual texture groups used only to check model performance. The participant may self-describe these fields; otherwise a trained data steward assigns them from the approved intake image. Record the assignment method and scheme version. Never infer or use these labels in the product.

If shaved, bald, covered, or protective styling obscures source texture, use an explicitly supplied self-description. If none exists, keep the asset in a supplemental challenge set and do not force it into the core 6 × 4 matrix.

The technical set contains at least one subject in each of the 24 primary cells. Its other 12 slots deliberately increase coverage of historically difficult or operationally important conditions.

### Secondary coverage

Secondary tags may overlap. They describe visible test conditions or participant-supplied facts, not inferred protected traits. P1 should include at least:

| Condition | Minimum distinct subjects | Notes |
|---|---:|---|
| Gray/white or mixed gray hair | 18 | Include light and dark starting hair and varied texture. |
| Visibly low-density/thinning hair | 12 | No diagnosis or treatment claim. |
| Very short, shaved, or bald starting look | 12 | Include hairline-sensitive requests; self-described texture is required for core matrix placement. |
| Braids, locs, twists, or another protective style | 20 | Distribute across relevant texture and tone cells. |
| Long hair below shoulders | 18 | Include shoulder/clothing overlap. |
| Glasses or visible hair accessories | 18 | Accessories should remain stable unless removal is requested. |
| Head covering or partial occlusion challenge | 8 | Supplemental unless the requested change is visible and consented. |
| Non-studio or mixed lighting | 24 | Include backlight, warm indoor, and uneven light without using unusable captures. |
| Side/three-quarter head angle within capture guidance | 24 | Frontal view remains represented; extreme poses are excluded. |

Declared adult age bands and optional self-described presentation may be collected only under the provenance policy. Coverage reporting must not become demographic inference. These fields are not performance slices unless at least five distinct subjects and 20 displayed outputs support the slice.

No single subject supplies more than one slot in a primary matrix cell. Multiple photos of the same person do not increase subject counts.

## Transformation matrix

Each subject receives two pre-authored consultation specs. Assignment is stratified so every primary cohort sees every transformation class where physically applicable. The case manifest records any pre-registered eligibility restriction before outputs exist.

| Primary transformation class | T1 cases | P1 cases | Required checks |
|---|---:|---:|---|
| Color-only family/tone | 9 | 30 | Face/skin/background stability; requested tone; starting-color plausibility |
| Shorter cut/silhouette | 9 | 30 | Hairline, ears, neck, removed-hair region, identity |
| Longer hair | 9 | 30 | New growth outside source silhouette, shoulders/clothing, seams |
| Fringe/bangs/part change | 8 | 24 | Forehead, brows, glasses, hairline, occlusion |
| Fade/taper/very short style | 8 | 24 | Ear/temple/neck boundaries, scalp plausibility, head shape |
| Layers/volume/styling texture | 9 | 30 | Silhouette, lighting, texture adherence, locality |
| Highlights/balayage/multitone color | 9 | 30 | Strand continuity, color distribution, lighting plausibility |
| High-texture or protective style | 11 | 42 | Requested construction, cultural specificity, scalp/parting, boundaries |
| **Total** | **72** | **240** | Two specs per subject |

Reference-driven input mode is an orthogonal factor, not a ninth transformation bucket. It is applied to 24 T1 cases and 72 P1 cases, spread across all transformation classes and primary cohorts. The same approved reference asset, crop, and attribute description are used for every compared configuration. Names of public figures or characters are converted to confirmed hair attributes before the case is frozen; their faces are never evaluation targets.

Within a subject, the two specs must represent different primary transformation classes. Case assignment is generated from a fixed seed before generation and checked for the following:

- each tone band and texture group receives every transformation class;
- reference-driven cases are not concentrated in one cohort or transform;
- difficult secondary conditions are distributed across rather than confined to one transformation;
- no configuration receives a different case, source, reference, structured request, mask version, or resolution.

## Configuration and comparison controls

A configuration ID is immutable and resolves to all of the following:

- provider and API region;
- exact model name or snapshot;
- provider safety/moderation configuration;
- prompt template ID and content hash;
- descriptor-conversion version;
- mask strategy: `prompt_only`, `hair_mask`, or `hair_mask_plus_protected_region`;
- segmentation model/version, dilation or feather parameters, and manual-edit flag;
- protected-region definition/version;
- source/reference preprocessing version;
- output size, format, quality, background, compression, and other generation parameters;
- requested preview count, timeout, retry policy, concurrency, and idempotency behavior;
- seed when supported, and an explicit `seed_unsupported` flag otherwise;
- provider pricing schedule ID and terms snapshot date.

The initial bake-off follows decisions D-005 and D-006: compare Sunburst, Flare, and at least one serious challenger when access permits, and compare prompt-only, mask, and mask-plus-protected-region approaches. A provider that cannot express a strategy is marked unsupported; it is not assigned a fabricated equivalent.

Use controlled comparisons:

1. Pre-register all configurations and the screening/elimination rules before the first output is viewed.
2. Change one named factor at a time when making a causal comparison. If provider capabilities force multiple changes, label the result a bundled configuration comparison.
3. Use identical locked cases and preprocessing for every applicable configuration.
4. Randomize invocation order within case blocks using `SHA-256(protocol_id | run_id | case_id | config_id | repetition)` as the ordering key. Keep concurrency and timeout policy fixed.
5. Use two independent T1 repetitions. When seeds are supported, derive each seed from the same run key and repetition index. When they are not, record that fact and rely on the repetitions to expose variance.
6. Do not selectively regenerate an unattractive output. Only the declared production retry policy may retry, and every attempt remains in cost, failure, and reliability metrics.
7. If a verified provider incident invalidates a run block, retain the original events, document the incident, and rerun the whole affected pre-declared block across configurations.
8. Freeze ratings before unblinding configuration identities.

Select a winner in this order: policy and critical-fail eligibility; identity and locality; instruction adherence; realism and consultation usefulness; then latency and cost. A lower-cost configuration cannot compensate for a material identity or locality regression. Report paired differences and uncertainty; do not pick a winner from a tiny difference whose confidence interval spans the pre-registered practical-equivalence margin.

Default practical-equivalence margins are 0.25 points on a 0–5 dimension, 3 percentage points on a pass rate, 10 seconds on p95 latency, and 10% on cost per usable result. A run may replace these only before generation and must explain why.

## Run procedure

### 1. Freeze and authorize

- Validate every asset against `ASSET-PROVENANCE.md`, including adult status, permitted provider transfer, evaluation use, human review, expiry, and withdrawal state.
- Confirm the provider's current terms and data controls are compatible with the manifest.
- Freeze and hash the asset, case, configuration, pricing, detector, and rating-form manifests.
- Pre-register hypotheses, equivalence margins, exclusion rules, planned denominators, spend cap, and concurrency.
- Confirm the generated run plan has the required cohort/transform coverage.

### 2. Preflight without live portraits

- Run the fake provider through success, policy rejection, malformed output, partial success, timeout, duplicate callback, retry, cancellation, and late callback cases.
- Prove that run logs and reports contain no portrait bytes, filenames, raw prompts, names, signed URLs, or secrets.
- Verify deterministic case assignment, rating order, aggregation, nearest-rank percentile, and report generation against fixtures.

### 3. Generate

- Copy approved inputs into a restricted, run-scoped workspace.
- Strip metadata through the approved preprocessing pipeline and verify the output hash.
- Invoke configurations in deterministic randomized blocks.
- Persist state transitions and timing before invoking retries.
- Quarantine outputs from human rating until decoding, moderation state, subject-count check, and manifest linkage pass.
- Keep rejected and failed attempts visible to the evaluator through opaque IDs and failure metadata.

### 4. Rate while blinded

Every generated output is rated using [`SCORECARD.md`](SCORECARD.md). Each item shows the source portrait, the structured requested change, the optional approved hairstyle reference or its confirmed attributes, and one generated output in the same neutral viewer. The viewer hides provider, model, prompt, mask, filename, cost, latency, automated flags, other raters' scores, and whether the item is a repeat.

At least two licensed stylists and one general rater independently score every T1 output and every P1 displayed output. Reviewers must pass calibration before production rating. Rating assignment and order are deterministic per reviewer but differ across reviewers. The ordering key is `SHA-256(run_id | rater_pseudonym | output_id)`. The scheduler prevents outputs from the same case, configuration, or repetition from appearing consecutively where the pool permits.

Raters score before entering comments and cannot revise a score after seeing another output from the same case. They may flag an unusable viewer or corrupted source; this creates an invalid-rating review, not a low model score. Raters never see cohort labels.

For P1, all automatically rejected outputs receive automated accounting. Human-review a stratified rejected-output sample of size `max(ceil(0.20 × N_rejected), min(30, N_rejected))`, including every rejection reason, to estimate false rejection. In addition, all outputs that an automated gate would display but any rater marks as a critical fail are false-negative escapes and trigger adjudication.

### 5. Adjudicate disagreements

Adjudication is required when:

- any rater marks a critical fail;
- a critical dimension (identity, locality, or adherence) has a three-point or greater rater range;
- the median on a critical dimension is exactly at the pass boundary and another rater scores 0–2;
- raters disagree about whether the source, reference, or viewer was valid;
- an output passes the automated display gate but a rater identifies a major identity, anatomy, hairline, or background artifact;
- a configuration decision changes when disputed rows are included or excluded.

Two adjudicators who did not rate the item—at least one licensed stylist and one evaluation/safety lead—review it together while configuration identity remains hidden. A third independent adjudicator resolves a split. They record artifact codes, critical-fail status, displayability, and rationale. They do not overwrite raw scores. Gate dimension metrics use the median of valid raw ratings; adjudicated critical-fail and validity decisions control critical-fail/exclusion counts.

Valid exclusions are limited to corrupt or mismatched source/reference input, viewer failure that prevented inspection, wrong manifest linkage, or a documented provider-wide incident covered by the block-rerun rule. Poor generation, moderation rejection, timeout, and missing output are outcomes, not exclusions.

### 6. Unblind, analyze, and review

- Lock raw ratings and adjudications, then reveal configuration IDs.
- Calculate the metrics below overall, by configuration, transformation, tone band, texture group, sufficiently sampled primary intersection, and sufficiently sampled secondary challenge tag.
- Report distinct subjects as well as outputs so repeated outputs from one person cannot masquerade as independent coverage.
- Use paired case-level bootstrap intervals for configuration differences and cluster by subject for pilot confidence intervals. Record the bootstrap seed and replicate count; default is 10,000 replicates.
- Complete an independent prototype or pilot gate review that challenges image quality, privacy, cost, security, accessibility, and failure handling.
- Publish the appropriate stable report from [`REPORT-TEMPLATE.md`](REPORT-TEMPLATE.md), including deviations and failed gates.

## Critical-fail rules

Any of the following makes an output non-displayable regardless of attractive hair or average score:

| Code | Critical failure |
|---|---|
| `CF_IDENTITY` | The person is no longer recognizably the same, or facial geometry/features, apparent age, skin tone, or identity-bearing marks materially change. |
| `CF_LOCALITY` | An unrequested material change affects the face, skin, body, clothing, accessories, pose, or background. |
| `CF_ANATOMY` | Major malformed anatomy, duplicated/missing features, fused hair/body regions, impossible ear/eye/neck/shoulder geometry, or severe hairline/scalp defect. |
| `CF_SUBJECT` | The subject is missing, a second person appears, identities merge, or the output depicts the reference person's face. |
| `CF_REQUEST` | The result reverses or ignores the major requested direction, or changes a prohibited attribute. |
| `CF_SAFETY` | The output is disallowed, sexualized, humiliating, deceptive, or otherwise violates the allowed-use policy. |
| `CF_PRIVACY` | The output exposes hidden source content, personal data, watermarks/account identifiers, or another person's likeness not authorized for output. |
| `CF_CORRUPT` | The image cannot be decoded, is materially truncated, or is not the requested media. This is also an operational failure. |

A `major artifact` for the prototype and pilot thresholds includes `CF_ANATOMY` plus severe hairline, scalp, ear, neck, shoulder, or background corruption that would make the preview misleading or unusable. `CF_IDENTITY` is counted separately and also counts as severe artifact. A critical fail cannot be averaged away, hidden by retry, or reclassified merely because a rater likes the hairstyle.

## Human score calculations

For each dimension, calculate the median of the three valid 0–5 ratings for each output. Then calculate:

- **dimension median:** median output-level score;
- **4–5 rate:** outputs whose median is 4 or 5 divided by the stated output denominator;
- **displayable pass:** no critical fail and median identity, adherence, locality, and realism scores are all at least 4;
- **usable-result pass:** displayable pass plus median consultation usefulness at least 4;
- **critical-fail rate:** adjudicated critical-fail outputs divided by generated outputs, with types also shown separately;
- **cohort pass rate:** displayable-pass outputs in a cohort divided by displayed outputs in that cohort;
- **stylist usefulness rate:** licensed-stylist assessments of 4–5, and in a live pilot the percentage of participating stylists who answer yes to “Would you use this accepted result in a real consultation?”

Always publish numerator, denominator, point estimate, and 95% interval. Do not calculate a cohort gate for fewer than five distinct subjects or 20 displayed outputs; label it `insufficiently_sampled`, show the observations, and treat a concerning result as a risk requiring more data. Primary P1 matrix cells are designed to exceed that threshold.

Report inter-rater agreement for every dimension using weighted agreement suitable for ordinal scores, plus raw exact and within-one-point agreement. Low agreement does not make a gate pass; it triggers rubric recalibration or additional review.

## Gate calculations

### Technical prototype gate (T1)

One finalist configuration clears T1 only when all conditions hold:

- dataset-level median output score is at least 4 for identity and requested-style adherence;
- adjudicated severe identity, anatomy, or background artifacts occur in no more than 10% of valid generated outputs;
- p95 end-to-end result time is no more than 120 seconds using all completed production-equivalent attempts, with timeouts counted at their timeout duration;
- total measured cost stays below the cap approved and recorded before the run;
- no sufficiently sampled tone, texture, transform, or challenge cohort is obviously unusable.

For T1, `obviously unusable` means a cohort has either median identity or adherence below 3, more than 25% critical failures, or fewer than 60% displayable passes. Because the technical set is small, the independent gate review may fail a cohort on documented repeated severe behavior even when it lacks 20 outputs; it may not pass a numerical failure by appeal to sample size.

Generation failure, provider rejection, or missing output does not enter the human-score median, but it remains in requested-slot success rate, end-to-end latency, and cost reporting. A configuration with less than 90% requested-slot completion cannot clear T1 without a recorded decision explaining why its production retry path makes the observed failure non-representative.

### Pilot release gate (P1)

Apply the production rejection/retry path first and preserve every attempt. Then require all of the following exactly as established in `QUALITY.md`:

- at least 95% of displayed outputs have median identity scores of 4–5;
- zero known severe identity failures escape the output gate and reach the displayed set;
- at least 85% of displayed outputs have median major-hairstyle-adherence scores of 4–5;
- at least 90% of displayed outputs have median realism scores of 4–5;
- at least 90% of displayed outputs have median edit-locality scores of 4–5;
- fewer than 1% of displayed outputs contain an adjudicated major hairline, anatomy, or background artifact after automatic rejection/retry;
- every sufficiently sampled tone, texture, primary intersection, transformation, and declared challenge cohort has a displayable-pass rate of at least 85% and trails the overall displayable-pass rate by no more than five percentage points;
- at least 80% of pilot stylists find the accepted result useful in a real consultation;
- p95 generation latency is below 90 seconds, with 60 seconds reported as the stretch target;
- fully loaded cost per usable result is below $0.20, or a revised cap is supported by unit economics and an accepted decision made before the release verdict;
- consent, immediate deletion, expiry, tenant isolation, and moderation tests pass completely in their authoritative software/security suites.

If a displayed output has a known severe identity failure, P1 fails even if the percentage thresholds pass. If a required cohort is insufficiently sampled because of failed/rejected output slots or manifest defects, P1 is incomplete rather than passed.

Thresholds cannot be rounded into a pass. Use exact counts, then display percentages to one decimal place. “Fewer than 1%” means a strict computed rate below 0.01.

## Latency, reliability, usage, and cost capture

Record monotonic durations plus UTC timestamps for these events when applicable:

1. job accepted;
2. queue entered and worker claimed;
3. preprocessing started/completed;
4. provider request sent/acknowledged;
5. first output byte or provider completion event;
6. output downloaded, validated, stored, and marked ready;
7. output displayed or rejected;
8. cancellation, timeout, retry scheduling, and terminal failure.

Required derived timings are queue wait, preprocessing, provider service, postprocessing, and end-to-end `job accepted → result ready`. Use nearest-rank p50, p90, and p95 over requested output slots or consultation jobs as labeled. A timeout is included at the configured timeout duration; do not discard it from latency.

For every attempt, record the provider's non-content request/response IDs in restricted telemetry, model snapshot, billed input/output units, image count and dimensions, token counts if supplied, retry reason, and pricing schedule. Calculate:

- requested-slot completion and display rates;
- first-attempt and eventual success rates;
- policy rejection, technical failure, timeout, malformed-output, automated rejection, retry, and cancellation rates;
- cost per attempt;
- cost per requested output slot;
- cost per displayed output;
- fully loaded cost per usable result = all provider charges for the run, including failed attempts and retries, divided by usable results;
- consultation cost for the default three-preview flow;
- variation in score, latency, and automated signals between repetitions.

If the provider does not expose final billed usage, mark cost `estimated`, preserve the pricing formula and currency, and reconcile it to an invoice before a paid pilot decision. Do not mix list-price estimates and billed costs without separate columns.

## Automated regression signals

Automated signals triage and gate production display only after calibration against blinded human ratings. They do not prove safety or replace human quality gates.

| Signal family | Minimum recorded output | Intended use |
|---|---|---|
| Decode/integrity | MIME, dimensions, channels, alpha, byte size, content hash, corruption flag | Reject malformed or duplicate media |
| Subject count/presence | detector/version, expected/observed count, confidence | Flag missing or extra people |
| Protected-region change | alignment version, region definition, perceptual and structural difference values | Flag face/skin/body changes |
| Outside-edit locality | hair/growth mask version, changed-pixel or perceptual-change ratio outside allowed region | Flag background, clothing, pose, or anatomy drift |
| Color behavior | color-space/version, requested and observed hair-region deltas, protected skin-region delta | Check color adherence without accepting skin-tone shifts |
| Boundary quality | hairline/ear/forehead/neck/shoulder region scores | Find halos, seams, melted boundaries, and scalp artifacts |
| Background/clothing/pose stability | detector/version and raw change values | Triage unrequested scene changes |
| Moderation/policy | policy version, category states, provider and local decisions | Enforce allowed use and diagnose disagreement |
| Operational | state transition validity, latency, usage, retry, failure class, cost | Reliability and unit economics |
| Stochastic stability | paired repetition deltas by case/configuration | Detect fragile configurations |

Detector thresholds, versions, calibration corpus, false-negative rate, and false-positive rate are part of the configuration manifest. Thresholds may be tuned on a calibration partition but must be frozen before the confirmation partition is scored. Never tune against the same outputs used to claim a gate.

Facial-similarity embeddings are prohibited by default. An offline evaluation may use them only with explicit evaluation consent, isolated processing, no production integration, no identity search, and verified deletion after scoring as required by `QUALITY.md`. Automated systems must not infer race, ethnicity, gender, attractiveness, health, or other protected/sensitive traits.

A regression alert fires when a locked sentinel set shows any new critical-fail escape, a pre-registered human or calibrated automated metric crosses its gate, or a paired result worsens beyond the practical-equivalence margin. A clean R0 smoke allows the full representative rerun to proceed; it never waives that rerun.

## Change-triggered reruns

| Change | Minimum evidence before merge/release |
|---|---|
| Harness/report-only change | H0 deterministic fixtures and golden report comparison |
| Provider adapter with no generation-setting change | Fake-provider integration plus R0 if live behavior could change |
| Prompt, descriptor conversion, preprocessing, mask, protected-region, output quality, safety setting, provider, or model change | R0 followed by full paired T1 before selection |
| Selected configuration change for pilot | Passing T1 and full P1 before pilot release |
| Automated display threshold change | Calibration evidence, false-negative review, R0, and applicable T1/P1 rerun |
| Cohort scheme or benchmark-asset replacement | New dataset version, provenance audit, coverage report, and a parallel bridge run on old/new sets where assets remain authorized |

An emergency provider change may be deployed only under the future incident/kill-switch policy; it does not inherit the previous provider's quality clearance.

## Protocol deviations and auditability

Deviations are declared before unblinding whenever possible. Each deviation records owner, timestamp, reason, affected cases/configurations, impact on denominators, and whether the run remains decision-capable. Post hoc exclusions, changed score anchors, changed retry policy, or missing provenance make the affected gate incomplete.

Keep a machine-readable report bundle with manifest hashes, code revision, environment, dependency lock hash, rating/adjudication exports, formulas, and generated aggregate tables. Keep images in restricted storage under their authorized retention; a report must remain interpretable after image deletion through opaque IDs and aggregate evidence.

## Completion checklist

A benchmark report is valid only if:

- all assets pass the provenance and consent manifest rules;
- dataset size, cohort balance, transformations, references, and repetitions match the declared stage;
- compared configurations use identical locked cases and disclose confounding;
- invocation and rating order were deterministically randomized;
- at least two licensed stylists and one general rater completed valid blinded scorecards where required;
- disagreements and critical fails were adjudicated without overwriting raw ratings;
- every requested output slot, failure, retry, rejection, latency, usage unit, and cost is accounted for;
- automated signals include detector versions, raw values, thresholds, and calibration status;
- reports use the stable template and give exact gate verdicts with evidence;
- independent gate review is recorded at prototype and pilot milestones.
