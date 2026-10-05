# Blinded hairstyle-preview scorecard

**Scorecard ID:** `hair-scorecard-v1`\
**Applies to:** T1 technical prototype confirmation and P1 pilot release confirmation\
**Related protocol:** [`EVAL-PROTOCOL.md`](EVAL-PROTOCOL.md)

## Rater task

Decide how well one generated image serves the stated hairstyle consultation while preserving the source person and everything outside the requested hair change. Rate what is visible, not what you think the model intended.

The evaluation viewer presents:

- the normalized source portrait;
- the structured requested hair change;
- the approved hairstyle reference or confirmed visible hair attributes when applicable;
- one generated output at a matched viewing size;
- zoom and side-by-side comparison controls.

It does not show provider, model, prompt, mask, cost, latency, filename, cohort labels, automated flags, other outputs from the same case, or other raters' answers.

Do not score attractiveness, personal taste, face shape, perceived race/ethnicity, gender, health, personality, or whether the client “should” choose a style. Do not diagnose hair or scalp conditions. A result may be attractive and still fail because it changes the person or ignores the request.

For every valid item:

1. inspect the source face, skin, hairline, ears, neck, shoulders, clothing, accessories, pose, and background;
2. read the requested hair attributes and inspect the reference only for those attributes;
3. mark every applicable critical-fail code before scoring;
4. assign all seven scores independently from 0 through 5 using the anchors below;
5. select controlled artifact tags and add a short factual note only when needed;
6. submit before moving to the next item.

Do not use `N/A`. For a non-color request, color plausibility measures whether the source color was preserved plausibly. If a viewer or manifest error makes the item impossible to rate, mark it invalid instead of giving a low model score.

## Critical-fail checklist

Mark all that apply. Any checked code makes the output non-displayable pending adjudication.

| Code | Check when |
|---|---|
| `CF_IDENTITY` | The face/person is materially different; apparent age, skin tone, identity-bearing features, or marks change materially. |
| `CF_LOCALITY` | The face, skin, body, clothing, accessories, pose, or background changes materially without being requested. |
| `CF_ANATOMY` | Major malformed/duplicated/missing anatomy or severe hairline, scalp, ear, neck, shoulder, or fused-region defect is visible. |
| `CF_SUBJECT` | The client disappears, an extra person appears, identities merge, or the output adopts the reference person's face. |
| `CF_REQUEST` | The major direction is ignored/reversed or the output changes a prohibited attribute. |
| `CF_SAFETY` | The result is sexualized, humiliating, deceptive, or otherwise outside the allowed-use policy. |
| `CF_PRIVACY` | Personal data, hidden source content, account marks, or an unauthorized likeness appears. |
| `CF_CORRUPT` | The image cannot be inspected because it is corrupt, truncated, or the wrong media. |

Use critical codes for severe failures, not every score below 4. A severe identity change receives `CF_IDENTITY` even when the hairstyle is excellent. The detailed critical-fail definitions in `EVAL-PROTOCOL.md` control adjudication.

## Score anchors

### 1. Identity and face preservation

Judge whether the generated result still depicts the same person, including facial geometry/features, skin tone, apparent age, identity-bearing marks, and natural expression. Ordinary render or compression differences are not identity drift.

| Score | Anchor |
|---:|---|
| 5 | Clearly the same person; face, skin tone, apparent age, expression, and identity-bearing details are stable even on close comparison. |
| 4 | Clearly the same person with only small non-identity rendering differences; suitable to show without an identity caveat. |
| 3 | Still recognizable, but one or more noticeable face/skin/age details drift enough to reduce trust. |
| 2 | Substantial drift in facial structure, skin tone, apparent age, expression, or distinctive features. |
| 1 | Barely resembles the source person. |
| 0 | Different/missing person, reference face copied, or identity cannot be evaluated. |

### 2. Requested hairstyle adherence

Judge the confirmed structured request: length, silhouette, cut, fringe/part, texture/styling, volume, fade/taper, color family/tone, highlights, or protective-style construction. Reference images contribute hair attributes only.

| Score | Anchor |
|---:|---|
| 5 | All major and nearly all minor requested attributes are clearly and coherently present. |
| 4 | The major direction and attributes are present; only minor detail or intensity differs. |
| 3 | The broad direction is visible, but at least one material requested attribute is weak, ambiguous, or missing. |
| 2 | Partial match with major contradictions or multiple missing attributes. |
| 1 | Barely related to the request. |
| 0 | Request is ignored/reversed, or a prohibited non-hair transformation replaces it. |

### 3. Edit locality outside the intended hair region

Judge whether unrequested regions stay stable. Expected hair occlusion or newly lengthened hair may cover part of the forehead, ears, neck, shoulders, or background, but the underlying scene must not be needlessly redrawn.

| Score | Anchor |
|---:|---|
| 5 | Change is confined to hair and physically necessary hair occlusion; protected regions are stable. |
| 4 | Tiny boundary or rendering differences outside hair are visible only on close inspection and do not alter meaning. |
| 3 | Noticeable unrequested change outside hair, but the source scene and person remain broadly intact. |
| 2 | Material change to face, skin, clothing, accessories, pose, or background. |
| 1 | Widespread redraw outside the requested region. |
| 0 | Scene/person is replaced or locality cannot be meaningfully compared. |

### 4. Hairline and boundary quality

Inspect hairline, forehead, scalp/parts, ears, neck, shoulders, glasses, accessories, and the outer silhouette for halos, seams, melting, clipping, duplication, or impossible overlaps.

| Score | Anchor |
|---:|---|
| 5 | Clean, natural boundaries throughout; fine strands and occlusions remain coherent. |
| 4 | One or two minor artifacts visible on close inspection but not distracting at consultation size. |
| 3 | Visible boundary flaw that reduces polish but does not make the result unusable. |
| 2 | Multiple or major flaws around hairline/anatomy/occlusion that could mislead the consultation. |
| 1 | Severe seams, melting, clipping, or anatomical corruption across important boundaries. |
| 0 | Boundary/anatomy failure makes the image unusable or impossible to interpret. |

### 5. Physical and lighting realism

Judge hair structure, strand/lock/braid behavior, gravity, density, scalp attachment, shadows, highlights, camera grain, and consistency with the source lighting and perspective.

| Score | Anchor |
|---:|---|
| 5 | Photographically convincing and physically coherent at full inspection. |
| 4 | Credible for consultation with only small synthetic cues. |
| 3 | Plausible at a glance, but obvious texture, lighting, density, or geometry issues appear on inspection. |
| 2 | Clearly synthetic or physically doubtful in several material ways. |
| 1 | Severe visual inconsistency or implausibility. |
| 0 | Impossible, corrupt, or not meaningfully judgeable as hair. |

### 6. Color plausibility

For color requests, judge whether hue, level, tone, highlights, and root/strand distribution match the requested family and sit plausibly under the source lighting. This is a visualization rating, not a chemical-achievability promise. For non-color requests, judge preservation of the source color.

| Score | Anchor |
|---:|---|
| 5 | Requested/preserved color is coherent across strands, roots, shadows, and highlights and does not spill to skin or scene. |
| 4 | Color reads correctly and plausibly; minor tone or distribution differences do not change the intended direction. |
| 3 | General family is present, but tone, level, lighting, roots, or placement is noticeably inconsistent. |
| 2 | Major mismatch, patchiness, spill, or implausible response to light. |
| 1 | Barely resembles the requested/source color behavior. |
| 0 | Opposite/absent color direction, pervasive spill, or impossible/corrupt result. |

### 7. Usefulness in a real consultation

Judge whether a stylist and client could use this image to discuss a direction while understanding that actual results vary. Consider identity trust, request clarity, visible artifacts, and whether the result would help or mislead.

| Score | Anchor |
|---:|---|
| 5 | Ready to use as a clear, trustworthy discussion aid; supports a concrete service-direction conversation. |
| 4 | Useful with a minor caveat a stylist can explain; the intended direction remains clear. |
| 3 | Useful only as loose inspiration; material caveats would need explicit discussion. |
| 2 | More likely to confuse or create unrealistic expectations than to help. |
| 1 | Provides almost no consultation value. |
| 0 | Harmful, deceptive, unsafe, or wholly unusable for consultation. |

## Controlled artifact tags

Select all observed tags; tags do not replace scores or critical flags.

`face_drift`, `skin_tone_shift`, `age_shift`, `expression_shift`, `hairline`, `scalp_or_part`, `ear`, `forehead_or_brow`, `glasses`, `accessory`, `neck`, `shoulder`, `clothing`, `background`, `pose`, `extra_or_missing_subject`, `reference_face_transfer`, `halo_or_seam`, `melt_or_fusion`, `duplicate_feature`, `strand_or_texture`, `braid_loc_twist_structure`, `density`, `gravity_or_geometry`, `lighting_or_shadow`, `color_spill`, `color_mismatch`, `request_miss`, `watermark_or_text`, `other`.

An `other` tag requires a short factual note. Comments must not contain a name, guess at identity/demographics, or repeat private prompt text.

## Per-item form

Use this order in the UI and exported schema:

1. `critical_fail_codes[]`
2. `identity_score`
3. `adherence_score`
4. `locality_score`
5. `boundary_score`
6. `realism_score`
7. `color_score`
8. `consultation_usefulness_score`
9. `artifact_tags[]`
10. `confidence`: `high`, `medium`, or `low`
11. `comment` (optional unless required by a critical/other flag)
12. `rating_valid`: boolean
13. `invalid_reason`: required only when false

All seven scores are required when `rating_valid=true`. A critical flag requires a comment that identifies the visible evidence in one or two sentences. `confidence` is diagnostic and never weights the rating.

## Machine-readable rating row

The export contains no rater name or media location:

| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | Exact scorecard schema version |
| `scorecard_id` | string | `hair-scorecard-v1` |
| `rating_id` | opaque string | Unique and immutable |
| `run_id`, `output_id`, `case_id` | opaque strings | Must resolve in restricted run manifests |
| `rater_id` | pseudonymous string | Identity/credential stored separately |
| `rater_role` | enum | `licensed_stylist`, `general`, or `adjudicator` |
| `assignment_position` | integer | Deterministic randomized position |
| `viewer_version` | string | Viewer code/config version |
| `started_at_utc`, `completed_at_utc` | timestamp | Used for audit/fatigue checks, not score weighting |
| seven `*_score` fields | integer 0–5 | Required for a valid rating |
| `critical_fail_codes` | enum array | Empty or one/more approved codes |
| `artifact_tags` | enum array | Empty or one/more approved tags |
| `confidence` | enum | `high`, `medium`, `low` |
| `comment` | string | Length-limited and content-filtered |
| `rating_valid` | boolean | False only for viewer/input/assignment defect |
| `invalid_reason` | enum/null | `viewer_failure`, `source_corrupt`, `reference_mismatch`, `manifest_mismatch`, `other_review_required` |
| `submitted_at_utc` | timestamp | Locks row |

Configuration identity and automated flags are joined only after rating lock. Raw rows are append-only; a correction creates a superseding row with reason and reviewer rather than editing history.

The offline source-controlled profile in [`EVALUATION-RATINGS.md`](EVALUATION-RATINGS.md)
implements a bounded subset of this restricted-viewer contract under D-022.
It stores opaque rationale artifact locks instead of factual comments, declares
exactly three primary assignments, and rejects raw-rating replacements in its
first version. Missing or invalid primary ratings remain incomplete. Trusted
corrections, replacement raters, restricted comment access, qualification, and
blinding must be implemented separately before a live gate can use the export.

## Rater qualification and calibration

Each production output needs independent ratings from at least two currently practicing or recently practicing licensed/credentialed stylists and one trained general rater. Credential verification remains outside the run export.

Before rating a run, each reviewer completes a 12-item calibration set that spans identity drift, request miss, locality drift, boundary artifacts, realistic high quality, and ambiguous mid-scale cases. Qualification requires:

- every seeded critical fail detected;
- at least 80% of dimension scores within one point of the adjudicated calibration answer;
- no tendency to convert attractiveness/taste into quality scores;
- correct handling of reference hair attributes and non-color color-preservation cases.

Failure leads to retraining and a fresh calibration set. Calibration images cannot appear in the rated confirmation partition.

Reviewers rate independently and must disclose prior knowledge of a case. A reviewer does not rate their own portrait, an asset they collected, or an output whose configuration they can identify. Keep sessions to at most 60 items before a break and monitor median rating time, repeated identical responses, and missing zoom/source inspection as quality signals. Suspected low-effort work is reviewed before exclusion; exclusion rules cannot depend on which configuration benefits.

## Randomization and blinding checks

Before release to raters, the coordinator verifies:

- opaque output IDs and identical viewer chrome;
- no provider/model/watermark/filename metadata visible;
- per-rater order generated by the protocol hash key;
- repetitions and sibling variants separated where the pool permits;
- each output assigned to the required rater-role mix;
- raters cannot access one another's scores or configuration results;
- the configuration lookup remains sealed until ratings and adjudications are locked.

A rater who correctly guesses a configuration may continue only if the guess came from image characteristics rather than leaked metadata. Record suspected leakage and investigate before unblinding.

## Adjudication form

Adjudication never erases disagreement. The adjudication record contains:

- `adjudication_id`, `run_id`, `output_id`, and trigger code(s);
- raw rating IDs reviewed;
- pseudonymous IDs and roles of two adjudicators and optional tie-breaker;
- `input_valid`: yes/no and an allowed invalid reason;
- final `critical_fail_codes[]` and `major_artifact_codes[]`;
- `production_displayable`: yes/no;
- false-positive/false-negative result for the automated display gate;
- concise visual rationale;
- completion time and scorecard/protocol version.

The gate uses medians of valid raw scores and the adjudicated critical/validity classification. Adjudicators do not invent replacement 0–5 scores. If a raw rating is invalidated, the reason must be independent of model quality; assign a replacement blinded rater before calculating the median.

## Derived fields

The harness calculates but never asks raters to enter:

- `identity_4_5`, `adherence_4_5`, `locality_4_5`, `realism_4_5`, `usefulness_4_5`;
- `displayable_pass`: identity, adherence, locality, and realism medians ≥4 and no adjudicated critical fail;
- `usable_result_pass`: displayable pass plus consultation-usefulness median ≥4;
- `major_artifact`: adjudicated major hairline, anatomy, or background artifact;
- `critical_fail_any` and one boolean per critical code;
- median and range for each dimension;
- disagreement/adjudication trigger flags.

Scores remain separate in every report. `displayable_pass` and `usable_result_pass` help apply gates; they are not substitutes for publishing all seven dimensions.
