# Image benchmark report templates

**Template ID:** `hair-eval-report-v1`\
**Protocol:** [`EVAL-PROTOCOL.md`](EVAL-PROTOCOL.md)\
**Scorecard:** [`SCORECARD.md`](SCORECARD.md)\
**Asset policy:** [`ASSET-PROVENANCE.md`](ASSET-PROVENANCE.md)

## How to use this template

Generate one report for each T1 technical prototype confirmation and each P1 pilot release confirmation. Preserve the headings, gate IDs, table columns, units, and status values so reports remain comparable and can be produced by the deterministic harness.

Allowed gate statuses are:

- `PASS`: the exact requirement is met with complete evidence;
- `FAIL`: the exact requirement is contradicted by complete evidence;
- `INCOMPLETE`: required evidence, sample, rating, provenance, or dependent software check is missing;
- `NOT_APPLICABLE`: permitted only for a template row explicitly outside the report stage.

Do not call a run passed when any required gate is `FAIL` or `INCOMPLETE`. Do not round a threshold into a pass. Percentages display to one decimal place but decisions use exact integer counts and unrounded calculations.

Replace every `{{placeholder}}`; use `none` when the value is truly empty. Never include portrait/reference/output images, filenames, names, raw prompts, storage paths, signed URLs, provider secrets, or contact details in the report bundle. Visual examples require a separate restricted review surface and retain opaque output IDs only.

## Stable report bundle

Each run produces:

| File | Required content |
|---|---|
| `report.md` | Human-readable report using the applicable template below |
| `summary.json` | Stable machine-readable header, verdict, gate rows, selected configuration, and metric references |
| `configurations.csv` | Complete non-secret configuration fields and hashes |
| `overall-metrics.csv` | One row per configuration and metric |
| `cohort-metrics.csv` | One row per configuration, slice type, slice ID, and metric |
| `transformation-metrics.csv` | One row per configuration, transform, input mode, and metric |
| `operational-metrics.csv` | Completion, failure, retry, rejection, latency, usage, and cost metrics |
| `automated-signals.csv` | Detector versions, thresholds, flags, calibration status, and aggregate results |
| `rater-metrics.csv` | Rater counts, calibration status, agreement, and adjudication counts |
| `critical-failures.csv` | Opaque output/case IDs, adjudicated code, display status, and configuration ID |
| `deviations.json` | Declared deviations and decision-capability impact; empty array when none |
| `provenance-audit.json` | Aggregate eligibility audit, manifest hash, and approval; no restricted locators or receipt data |

Every metric row includes `schema_version`, `report_id`, `run_id`, `stage`, `configuration_id`, `metric_id`, `numerator`, `denominator`, `value`, `unit`, `ci95_low`, `ci95_high`, and `calculation_version`. Use `null`, not zero, when a field is unavailable. Latency rows state the population and use milliseconds; costs state currency and whether billed or estimated.

The minimum `summary.json` shape is:

```json
{
  "schema_version": "1.0.0",
  "template_id": "hair-eval-report-v1",
  "protocol_id": "hair-eval-v1",
  "scorecard_id": "hair-scorecard-v1",
  "report_id": "rpt_<opaque>",
  "run_id": "run_<opaque>",
  "stage": "T1",
  "verdict": "INCOMPLETE",
  "decision": "none",
  "selected_configuration_id": null,
  "dataset_manifest_sha256": "<64-lowercase-hex>",
  "case_manifest_sha256": "<64-lowercase-hex>",
  "configuration_manifest_sha256": "<64-lowercase-hex>",
  "code_revision": "<git-commit>",
  "gates": [
    {
      "gate_id": "T1_IDENTITY_MEDIAN",
      "status": "INCOMPLETE",
      "numerator": null,
      "denominator": null,
      "observed": null,
      "operator": ">=",
      "threshold": 4,
      "unit": "score_0_5",
      "evidence_ref": "overall-metrics.csv#..."
    }
  ],
  "created_at_utc": "<ISO-8601>"
}
```

Gate IDs and meanings in this document are stable. Additive schema changes require a minor version; changed definitions, thresholds, or denominators require a new major version and a recorded decision.

## `QUALITY.md` traceability

| `QUALITY.md` contract area | Operational evidence |
|---|---|
| Allowed product use | Critical-fail taxonomy, moderation/configuration record, `P1_MODERATION`, and independent review |
| Consent and privacy gate | `ASSET-PROVENANCE.md` for benchmark consent; `P1_CONSENT`, `P1_IMMEDIATE_DELETE`, `P1_EXPIRY`, `P1_TENANT_ISOLATION`, and `P1_OUTPUT_LABEL` for product behavior |
| Dataset stages and cohort coverage | `EVAL-PROTOCOL.md` H0/T0/T1/R0/P1 design and provenance/coverage tables in each report |
| Blinded human rubric | `SCORECARD.md`, rater/adjudication tables, and human-quality result tables |
| Automated regression signals | Automated-signal calibration and display-gate tables |
| Technical prototype gate | Stable `T1_*` gate table |
| Pilot image-quality gate | Stable `P1_*` image-quality gate table |
| Unit test strategy | `P1_UNIT_SUITE` and `REL_REQUIRED_CHECKS` evidence references |
| Component/integration strategy | `P1_INTEGRATION_SUITE` and `REL_REQUIRED_CHECKS` evidence references |
| End-to-end strategy | `P1_E2E_SUITE`, dependent consent/deletion/expiry evidence, and `REL_REQUIRED_CHECKS` |
| Non-functional/adversarial strategy | `P1_NONFUNCTIONAL_SUITE`, accessibility/security/failure evidence, and independent review |
| Pilot release gates | Stable `REL_*` gate table |
| General-availability additions | Outside T1/P1 verdicts; explicitly not implied by a pilot pass and must receive a later GA report/checklist |
| Residual risks | Required residual-risk table in T1 and P1 |

---

# T1 technical prototype confirmation report

## 1. Verdict

| Field | Value |
|---|---|
| Report ID | `{{report_id}}` |
| Run ID | `{{run_id}}` |
| Run window (UTC) | `{{started_at}}` to `{{completed_at}}` |
| Protocol / template / scorecard | `{{protocol_id}}` / `{{template_id}}` / `{{scorecard_id}}` |
| Overall verdict | `{{PASS / FAIL / INCOMPLETE}}` |
| Decision | `{{continue / narrow / change_approach / stop / none}}` |
| Selected configuration | `{{configuration_id or none}}` |
| Decision owner and date | `{{pseudonymous_role_or_id}}`, `{{date}}` |
| One-sentence basis | {{Exact reason tied to gates; no marketing language.}} |

### Blocking failures or missing evidence

| Gate ID | Status | Evidence or missing item | Required action |
|---|---|---|---|
| `{{gate_id}}` | `{{FAIL / INCOMPLETE}}` | {{result}} | {{next action}} |

## 2. Run integrity and reproducibility

| Item | Recorded value | Check |
|---|---|---|
| Dataset version / asset-manifest hash | `{{value}}` | `{{PASS/FAIL}}` |
| Case-manifest hash | `{{value}}` | `{{PASS/FAIL}}` |
| Configuration-manifest hash | `{{value}}` | `{{PASS/FAIL}}` |
| Pricing-schedule hash/date | `{{value}}` | `{{PASS/FAIL}}` |
| Code revision / dependency-lock hash | `{{value}}` | `{{PASS/FAIL}}` |
| Harness / viewer versions | `{{value}}` | `{{PASS/FAIL}}` |
| Deterministic assignment seed | `{{value}}` | `{{PASS/FAIL}}` |
| Invocation-order verification | `{{value}}` | `{{PASS/FAIL}}` |
| Rating-order/blinding verification | `{{value}}` | `{{PASS/FAIL}}` |
| H0 fake-provider preflight | `{{evidence_ref}}` | `{{PASS/FAIL}}` |
| Undeclared post-output exclusions | `{{count}}` | Must be `0` |

## 3. Asset authorization and coverage

| Provenance audit item | Result | Required |
|---|---:|---:|
| Eligible distinct adult subjects | {{n}} | 36 |
| Synthetic / licensed / explicitly consented subjects | {{n / n / n}} | Report only |
| Core ST × HT cells represented | {{n}} / 24 | 24 / 24 |
| Assets with active required provider permission | {{n}} / {{N}} | 100% |
| Assets with active human-rating/derivative permission | {{n}} / {{N}} | 100% |
| Missing/expired/withdrawn/deletion-pending assets | {{n}} | 0 |
| Hash/metadata-strip verification failures | {{n}} | 0 |
| Unauthorized parent/derivation links | {{n}} | 0 |
| Provenance audit approval | `{{evidence_ref}}` | PASS |

### Cohort and secondary-condition counts

| Slice type | Slice ID | Distinct subjects | Requested cases | Target/requirement | Status |
|---|---|---:|---:|---|---|
| `tone_band` | `ST1` | {{n}} | {{n}} | represented | {{status}} |
| `texture_group` | `HT1` | {{n}} | {{n}} | represented | {{status}} |
| `primary_intersection` | `ST1_HT1` | {{n}} | {{n}} | ≥1 subject | {{status}} |
| `secondary_condition` | `{{tag}}` | {{n}} | {{n}} | declared plan | {{status}} |

Include all six tone bands, four texture groups, 24 primary intersections, and each planned secondary condition as separate rows.

## 4. Cases and comparison design

| Design item | Actual | Required |
|---|---:|---:|
| Locked subjects | {{n}} | 36 |
| Locked cases | {{n}} | 72 |
| Cases per subject | {{distribution}} | 2 each |
| Independent repetitions per finalist | {{n}} | 2 |
| Finalist configurations | {{n}} | ≤3 unless pre-registered |
| Reference-driven cases | {{n}} | 24 |
| Completed requested output slots | {{n}} / {{N}} | Report exact |
| Configuration/case pairing violations | {{n}} | 0 |
| Unplanned selective regenerations | {{n}} | 0 |

### Transformation allocation

| Transformation | Locked cases | Required cases | Reference-driven subset | Coverage status |
|---|---:|---:|---:|---|
| Color-only family/tone | {{n}} | 9 | {{n}} | {{status}} |
| Shorter cut/silhouette | {{n}} | 9 | {{n}} | {{status}} |
| Longer hair | {{n}} | 9 | {{n}} | {{status}} |
| Fringe/bangs/part | {{n}} | 8 | {{n}} | {{status}} |
| Fade/taper/very short | {{n}} | 8 | {{n}} | {{status}} |
| Layers/volume/styling texture | {{n}} | 9 | {{n}} | {{status}} |
| Highlights/balayage | {{n}} | 9 | {{n}} | {{status}} |
| High-texture/protective style | {{n}} | 11 | {{n}} | {{status}} |
| **Total** | **{{n}}** | **72** | **24** | **{{status}}** |

## 5. Compared configurations

| Config ID | Provider / exact model | Prompt hash | Mask strategy | Protected region | Settings hash | Seed support | Calls / outputs | Eligibility after screen |
|---|---|---|---|---|---|---|---:|---|
| `{{id}}` | {{provider/model}} | `{{hash}}` | {{strategy}} | {{version}} | `{{hash}}` | {{yes/no}} | {{n/n}} | {{eligible/eliminated + reason}} |

State whether Sunburst, Flare, and a serious challenger were tested as required by D-005 when access permitted. List unsupported strategies and bundled/confounded comparisons. Do not imply a one-factor causal result for a bundled configuration.

## 6. Human quality results

Report output-level medians across three valid ratings. Every rate needs `n/N`, percent, and 95% interval.

| Config | Valid outputs | Identity median | Identity 4–5 | Adherence median | Adherence 4–5 | Locality 4–5 | Boundary 4–5 | Realism 4–5 | Color 4–5 | Usefulness 4–5 | Displayable pass | Usable result |
|---|---:|---:|---|---:|---|---|---|---|---|---|---|---|
| `{{id}}` | {{n}} | {{x}} | {{n/N, %, CI}} | {{x}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} | {{n/N, %, CI}} |

### Critical failures and artifacts

| Config | Any critical fail | Identity | Locality | Anatomy | Subject | Request | Safety | Privacy | Corrupt | Severe identity/anatomy/background | Major hairline/anatomy/background |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `{{id}}` | {{n/N, %}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n/N, %}} | {{n/N, %}} |

### Cohort results

| Config | Slice type | Slice ID | Subjects | Generated | Displayed | Identity 4–5 | Adherence 4–5 | Locality 4–5 | Realism 4–5 | Displayable pass | Critical fail | Overall gap (pp) | Sampling status |
|---|---|---|---:|---:|---:|---|---|---|---|---|---|---:|---|
| `{{id}}` | {{tone/texture/intersection/challenge}} | `{{slice}}` | {{n}} | {{n}} | {{n}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{x}} | {{sufficient/insufficient}} |

Include every declared slice even when insufficiently sampled. Never omit a weak cohort.

### Transformation and input-mode results

| Config | Transformation | Input mode | Cases | Valid outputs | Identity 4–5 | Adherence 4–5 | Locality 4–5 | Realism 4–5 | Usable result | Critical fail |
|---|---|---|---:|---:|---|---|---|---|---|---|
| `{{id}}` | {{transform}} | {{structured/reference}} | {{n}} | {{n}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} | {{n/N, %}} |

### Repetition stability

| Config | Paired cases | Identity absolute delta | Adherence absolute delta | Locality absolute delta | Automated-signal delta | One-pass/one-fail pairs | Interpretation |
|---|---:|---:|---:|---:|---:|---:|---|
| `{{id}}` | {{n}} | {{median / p95}} | {{median / p95}} | {{median / p95}} | {{summary}} | {{n/N, %}} | {{finding}} |

## 7. Rater and adjudication quality

| Item | Result | Requirement/status |
|---|---|---|
| Licensed stylist raters | {{n}} | ≥2 per output |
| General raters | {{n}} | ≥1 per output |
| Calibration completion | {{n/N}} | 100% |
| Outputs missing required rater mix | {{n}} | 0 |
| Exact / within-one agreement by dimension | {{table_ref}} | Report |
| Weighted ordinal agreement by dimension | {{table_ref}} | Report |
| Adjudication triggers / completed | {{n/N}} | 100% completed |
| Invalid ratings / replaced | {{n/n}} | All justified and replaced |
| Suspected blinding leak | {{n and finding}} | 0 unresolved |

## 8. Reliability, latency, usage, and cost

| Config | Requested slots | First-attempt success | Eventual completion | Policy reject | Technical failure | Timeout | Malformed | Retry | Auto reject | p50 end-to-end | p90 | p95 | Cost/attempt | Cost/requested slot | Cost/displayed | Cost/usable result | 3-preview cost |
|---|---:|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `{{id}}` | {{N}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{n/N,%}} | {{ms}} | {{ms}} | {{ms}} | {{currency}} | {{currency}} | {{currency}} | {{currency}} | {{currency}} |

State whether cost is billed or estimated, the currency, provider pricing date, and whether every failed attempt/retry is included. Explain queue, preprocessing, provider, and postprocessing latency separately.

## 9. Automated-signal calibration

| Detector/signal ID | Version | Frozen threshold | Calibration partition | Flagged n/N | Human-confirmed failures | False positives | False negatives | Production-gate eligible? |
|---|---|---:|---|---|---|---|---|---|
| `{{id}}` | {{version}} | {{value/unit}} | {{dataset/hash}} | {{n/N}} | {{n}} | {{n}} | {{n}} | {{yes/no + reason}} |

Explicitly state whether facial-similarity embeddings were used. If yes, cite the separate consent scope, isolation evidence, and verified deletion; otherwise state `not used`.

## 10. Paired configuration comparison

| Pair | Metric | Paired difference | 95% clustered/bootstrap interval | Equivalence margin | Conclusion |
|---|---|---:|---|---:|---|
| `{{A}}` vs `{{B}}` | {{metric}} | {{value}} | {{low, high}} | {{margin}} | {{superior/equivalent/inconclusive}} |

Explain selection in protocol priority order: policy/critical fails, identity/locality, adherence, realism/usefulness, then latency/cost. Include the bootstrap seed and replicate count. A cost advantage cannot override identity/locality ineligibility.

## 11. Technical prototype gate

Complete one table per finalist configuration, then one final selection row.

| Gate ID | Requirement | Exact observed result | Evidence | Status |
|---|---|---|---|---|
| `T1_IDENTITY_MEDIAN` | Dataset identity median ≥4/5 | {{value, n}} | {{ref}} | {{status}} |
| `T1_ADHERENCE_MEDIAN` | Dataset adherence median ≥4/5 | {{value, n}} | {{ref}} | {{status}} |
| `T1_SEVERE_ARTIFACT_RATE` | Severe identity/anatomy/background artifacts ≤10% of valid generated outputs | {{n/N, exact %}} | {{ref}} | {{status}} |
| `T1_LATENCY_P95` | p95 end-to-end result time ≤120,000 ms | {{value ms, N}} | {{ref}} | {{status}} |
| `T1_COST_CAP` | Total measured cost below pre-approved cap | {{value vs cap, currency}} | {{ref}} | {{status}} |
| `T1_COHORT_USABILITY` | No sufficiently sampled cohort is obviously unusable | {{worst cohort/results}} | {{ref}} | {{status}} |
| `T1_COMPLETION_RATE` | Requested-slot completion ≥90%, absent accepted exception | {{n/N, exact %}} | {{ref}} | {{status}} |
| `T1_PROVENANCE` | Asset authorization audit passes | {{audit}} | {{ref}} | {{status}} |
| `T1_INDEPENDENT_REVIEW` | Independent prototype review completed | {{decision}} | {{ref}} | {{status}} |
| `T1_OVERALL` | Every required T1 gate passes for ≥1 configuration | {{config/verdict}} | {{ref}} | {{status}} |

## 12. Deviations, risks, and independent review

### Deviations

| Deviation ID | Declared time | Description | Affected cases/configs | Denominator impact | Decision-capable? | Owner/action |
|---|---|---|---|---|---|---|
| `{{id}}` | {{time}} | {{description}} | {{scope}} | {{impact}} | {{yes/no}} | {{action}} |

### Residual risks

Address at minimum: missed identity drift, weak cohorts, physically/chemically unachievable looks, mask growth/seams, lighting/color uncertainty, provider policy/price/retention change, removed screenshot labels, and unauthorized uploads.

| Risk | Evidence in this run | Severity | Mitigation before next stage | Owner |
|---|---|---|---|---|
| {{risk}} | {{finding}} | {{severity}} | {{action}} | {{role}} |

### Independent review

| Review area | Reviewer | Finding | Blocking? | Evidence/action |
|---|---|---|---|---|
| Image quality and cohorts | {{id/role}} | {{finding}} | {{yes/no}} | {{ref}} |
| Privacy and provenance | {{id/role}} | {{finding}} | {{yes/no}} | {{ref}} |
| Cost and latency | {{id/role}} | {{finding}} | {{yes/no}} | {{ref}} |
| Security and failure handling | {{id/role}} | {{finding}} | {{yes/no}} | {{ref}} |
| Accessibility implications | {{id/role}} | {{finding}} | {{yes/no}} | {{ref}} |

## 13. Decision and next evidence

Record one decision: `continue`, `narrow`, `change_approach`, or `stop`. State the selected configuration, unsupported claims, the next full rerun trigger, and exact unresolved evidence. A failed T1 means the full product build does not proceed until capture, masks, prompts, models, or scope changes and a new T1 passes.

---

# P1 pilot release confirmation report

## 1. Verdict

| Field | Value |
|---|---|
| Report ID / run ID | `{{report_id}}` / `{{run_id}}` |
| Run window (UTC) | `{{started_at}}` to `{{completed_at}}` |
| Protocol / template / scorecard | `{{protocol_id}}` / `{{template_id}}` / `{{scorecard_id}}` |
| Candidate release / code revision | `{{release_id}}` / `{{git_commit}}` |
| Selected configuration | `{{configuration_id}}` |
| Overall pilot image-quality verdict | `{{PASS / FAIL / INCOMPLETE}}` |
| Overall pilot release evidence status | `{{PASS / FAIL / INCOMPLETE}}` |
| Decision | `{{release_to_pilot / narrow / remediate_and_rerun / stop / none}}` |
| Decision owner and date | `{{pseudonymous_role_or_id}}`, `{{date}}` |
| One-sentence basis | {{Exact reason tied to gates.}} |

### Blocking failures or missing evidence

| Gate ID | Status | Exact evidence or missing item | Required action |
|---|---|---|---|
| `{{gate_id}}` | `{{FAIL / INCOMPLETE}}` | {{result}} | {{next action}} |

## 2. Reproducibility and authorization

Use the T1 **Run integrity and reproducibility** and **Asset authorization and coverage** tables unchanged. Additionally report:

| Item | Actual | Required | Status |
|---|---:|---:|---|
| Eligible distinct adult subjects | {{n}} | 120 | {{status}} |
| Subjects per each of 24 ST × HT cells | {{distribution}} | 5 each | {{status}} |
| Consultation specs | {{n}} | 240 | {{status}} |
| Production-path requested output slots | {{n}} | 720 | {{status}} |
| Reliability rerun cases | {{n}} | 24, separate from primary denominator | {{status}} |
| Unauthorized/missing/expired/withdrawn assets | {{n}} | 0 | {{status}} |
| Ineligible primary cohort cells | {{n}} | 0 | {{status}} |

Include the complete 6 × 4 subject allocation and all secondary-coverage counts from `ASSET-PROVENANCE.md`/`EVAL-PROTOCOL.md`.

## 3. Production-path flow

Every requested preview slot must resolve through this reconciliation:

| Flow step | Count | Percent of 720 slots | Cost included? |
|---|---:|---:|---|
| Requested output slots | 720 | 100% | Yes |
| Total provider attempts | {{n}} | {{attempts/slot}} | Yes |
| First-attempt valid generations | {{n}} | {{%}} | Yes |
| Policy rejected | {{n}} | {{%}} | Yes |
| Technical failure/timeout/malformed | {{n}} | {{%}} | Yes |
| Automatically rejected before display | {{n}} | {{%}} | Yes |
| Retried slots | {{n}} | {{%}} | Yes |
| Eventual displayed outputs | {{n}} | {{%}} | Yes |
| Missing/unfilled slots | {{n}} | {{%}} | Yes |
| Human-rated displayed outputs | {{n}} | {{% of displayed}} | N/A |

The counts must reconcile with `run-event` state transitions. Report late callbacks, duplicate deliveries, and cancellation separately even when they do not change the slot outcome.

### Automated rejection audit

| Rejection reason | Rejected outputs | Human-audited | True reject | False reject | Audit sampling met? |
|---|---:|---:|---:|---:|---|
| `{{reason}}` | {{n}} | {{n}} | {{n}} | {{n}} | {{yes/no}} |
| **Total** | **{{N}}** | **{{n; max(ceil(20% × N), min(30, N))}}** | **{{n}}** | **{{n}}** | **{{status}}** |

Any displayed output later adjudicated a critical fail is an automated-gate false-negative escape and appears in the critical-failure table.

## 4. Human quality results

Use the T1 **Human quality results**, **Critical failures and artifacts**, **Cohort results**, and **Transformation and input-mode results** tables unchanged for the selected configuration. The primary denominators are displayed outputs after the production rejection/retry path.

Also include:

| Metric | Numerator | Denominator | Exact rate | 95% subject-clustered interval |
|---|---:|---:|---:|---|
| Identity median 4–5 | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Major adherence median 4–5 | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Locality median 4–5 | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Realism median 4–5 | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Displayable pass | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Usable result | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Major hairline/anatomy/background artifact | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |
| Severe identity escape | {{n}} | {{N displayed}} | {{%}} | {{low–high}} |

### Cohort floor and gap audit

| Slice type | Slice ID | Distinct subjects | Displayed outputs | Displayable-pass n/N | Exact pass rate | Overall rate | Gap vs overall (pp) | ≥85%? | Gap ≤5 pp? | Sampling/gate status |
|---|---|---:|---:|---|---:|---:|---:|---|---|---|
| {{type}} | `{{slice}}` | {{n}} | {{N}} | {{n/N}} | {{%}} | {{%}} | {{pp}} | {{yes/no}} | {{yes/no}} | {{status}} |

List every tone band, texture group, 24 primary intersections, transformation, and sufficiently sampled secondary condition. Keep insufficient slices visible and make P1 `INCOMPLETE` when a required primary slice lacks five subjects or 20 displayed outputs.

## 5. Raters, adjudication, and reliability

Use the T1 **Rater and adjudication quality** table. Add:

| Reliability item | Result |
|---|---|
| Stratified cases independently rerun | {{n}} / 24 |
| Rerun requested slots / valid outputs | {{n / n}} |
| One primary pass / one rerun fail | {{n/N, %}} |
| New critical fail in rerun | {{n/N, % and IDs}} |
| Median/p95 score delta by dimension | {{table_ref}} |
| Operational latency/cost delta | {{table_ref}} |

Reruns remain outside the primary 720-slot gate denominator and cannot replace failed primary outputs.

## 6. Pilot stylist usefulness

| Measure | Numerator | Denominator | Rate | 95% interval | Sampling notes |
|---|---:|---:|---:|---|---|
| Licensed-stylist output usefulness score 4–5 | {{n}} | {{N ratings}} | {{%}} | {{low–high}} | {{raters/outputs}} |
| Participating stylists answering yes: “Would you use this accepted result in a real consultation?” | {{n}} | {{N distinct stylists}} | {{%}} | {{low–high}} | {{salons/sessions}} |

Report distinct stylists, salons, sessions, and the distribution of reviews per stylist. Do not substitute repeated ratings from one stylist for the pilot-stylist percentage.

## 7. Reliability, latency, usage, and unit economics

Use the T1 operational table for the selected configuration, using all attempts for the 720 primary slots. Add:

| Unit-economics item | Value | Method/evidence |
|---|---:|---|
| Total provider charge, all failures/retries included | {{currency}} | {{billed/estimated + ref}} |
| Usable results | {{n}} | {{rating ref}} |
| Fully loaded cost per usable result | {{currency}} | total provider charge / usable results |
| Cost per completed three-preview consultation | {{currency}} | {{formula}} |
| p50/p90/p95 generation latency | {{ms/ms/ms}} | nearest-rank, all production-path jobs |
| p95 queue/preprocess/provider/postprocess breakdown | {{ms/ms/ms/ms}} | {{event ref}} |
| Spend/concurrency cap behavior | {{result}} | {{test ref}} |

State whether billing was reconciled to provider invoices. If not, label all cost gates `INCOMPLETE` unless the report is explicitly pre-pilot planning rather than a release verdict.

## 8. Automated display gate

Use the T1 automated-signal table, then add:

| Measure | Numerator | Denominator | Rate | Requirement/status |
|---|---:|---:|---:|---|
| Human-confirmed critical failures caught before display | {{n}} | {{N confirmed}} | {{%}} | Report |
| Human-confirmed severe identity failures displayed | {{n}} | {{N displayed}} | {{%}} | Must be 0 |
| Human-confirmed major artifact outputs displayed | {{n}} | {{N displayed}} | {{%}} | Must be <1% |
| False rejection in audited rejected sample | {{n}} | {{N audited}} | {{%}} | Report/operational review |
| Flagged outputs with unresolved adjudication | {{n}} | {{N flagged}} | {{%}} | Must be 0 |

## 9. Dependent privacy, safety, and software release evidence

Image quality alone does not clear the pilot. Link the authoritative current run for each requirement; do not restate an unverified claim.

| Gate ID | Required evidence | Evidence ID/link | Date/revision | Status |
|---|---|---|---|---|
| `P1_CONSENT` | Consent blocks transfer before acknowledgment and stores the versioned receipt | {{ref}} | {{value}} | {{status}} |
| `P1_IMMEDIATE_DELETE` | Immediate deletion cascade and verification pass | {{ref}} | {{value}} | {{status}} |
| `P1_EXPIRY` | Original/output/share expiry and orphan cleanup pass | {{ref}} | {{value}} | {{status}} |
| `P1_TENANT_ISOLATION` | Cross-tenant access is denied in application, storage, and job paths | {{ref}} | {{value}} | {{status}} |
| `P1_MODERATION` | Disallowed requests/assets and provider/local disagreement paths pass | {{ref}} | {{value}} | {{status}} |
| `P1_OUTPUT_LABEL` | Displayed/shared/downloaded output carries required AI visualization label | {{ref}} | {{value}} | {{status}} |
| `P1_FAILURE_HANDLING` | Timeout, retry, partial, cancel, late callback, and provider outage paths pass | {{ref}} | {{value}} | {{status}} |
| `P1_ACCESSIBILITY` | Relevant WCAG 2.2 AA and target-device checks pass | {{ref}} | {{value}} | {{status}} |
| `P1_SECURITY_PRIVACY` | No unresolved critical/high privacy or security issue | {{ref}} | {{value}} | {{status}} |
| `P1_MONITOR_ROLLBACK` | Monitoring, spend/concurrency limits, kill switch, rollback behavior exist | {{ref}} | {{value}} | {{status}} |
| `P1_UNIT_SUITE` | Required unit suite in `QUALITY.md` passes at the candidate revision | {{ref}} | {{value}} | {{status}} |
| `P1_INTEGRATION_SUITE` | Required component/integration suite in `QUALITY.md` passes | {{ref}} | {{value}} | {{status}} |
| `P1_E2E_SUITE` | Fake-provider consent-to-delete, partial/retry, cancel, expiry, accessibility, and responsive E2E suite passes | {{ref}} | {{value}} | {{status}} |
| `P1_NONFUNCTIONAL_SUITE` | Required accessibility, browser/device, poor-network, adversarial, outage, load/cost, and recovery checks applicable to pilot pass | {{ref}} | {{value}} | {{status}} |

## 10. Pilot image-quality gate

| Gate ID | Requirement | Exact observed result | Evidence | Status |
|---|---|---|---|---|
| `P1_IDENTITY_4_5` | ≥95% of displayed outputs score 4–5 for identity | {{n/N, exact %}} | {{ref}} | {{status}} |
| `P1_IDENTITY_ESCAPE` | 0 known severe identity failures displayed | {{n/N}} | {{ref}} | {{status}} |
| `P1_ADHERENCE_4_5` | ≥85% of displayed outputs score 4–5 for major adherence | {{n/N, exact %}} | {{ref}} | {{status}} |
| `P1_REALISM_4_5` | ≥90% of displayed outputs score 4–5 for realism | {{n/N, exact %}} | {{ref}} | {{status}} |
| `P1_LOCALITY_4_5` | ≥90% of displayed outputs score 4–5 for edit locality | {{n/N, exact %}} | {{ref}} | {{status}} |
| `P1_MAJOR_ARTIFACT` | Major hairline/anatomy/background artifact rate <1% after rejection/retry | {{n/N, exact %}} | {{ref}} | {{status}} |
| `P1_COHORT_FLOOR` | Every sufficiently sampled cohort displayable-pass rate ≥85% | {{worst slice, n/N, %}} | {{ref}} | {{status}} |
| `P1_COHORT_GAP` | No sufficiently sampled cohort trails overall by >5 percentage points | {{worst slice and gap}} | {{ref}} | {{status}} |
| `P1_STYLIST_USEFUL` | ≥80% of pilot stylists say accepted result is useful | {{n/N distinct stylists, exact %}} | {{ref}} | {{status}} |
| `P1_LATENCY_P95` | p95 generation latency <90,000 ms; report 60,000 ms stretch | {{value ms, N; stretch yes/no}} | {{ref}} | {{status}} |
| `P1_COST_USABLE` | Fully loaded cost per usable result <$0.20 or accepted pre-verdict revised cap | {{cost/cap/currency}} | {{ref}} | {{status}} |
| `P1_REQUIRED_TESTS` | Consent, immediate deletion, expiry, tenant isolation, moderation all pass completely | {{five statuses}} | {{ref}} | {{status}} |
| `P1_PROVENANCE` | P1 asset authorization and 6 × 4 coverage audit passes | {{audit}} | {{ref}} | {{status}} |
| `P1_INDEPENDENT_REVIEW` | Independent pilot review completed with no unresolved blocker | {{decision}} | {{ref}} | {{status}} |
| `P1_IMAGE_QUALITY_OVERALL` | Every P1 image-quality gate passes | {{verdict}} | {{ref}} | {{status}} |

## 11. Pilot release gate

| Gate ID | Requirement from `QUALITY.md` | Evidence | Status |
|---|---|---|---|
| `REL_REQUIRED_CHECKS` | Required software checks and relevant image-quality delta pass | {{ref}} | {{status}} |
| `REL_PRIVACY_SECURITY` | No unresolved critical/high privacy or security issue | {{ref}} | {{status}} |
| `REL_DB_COMPATIBILITY` | Database changes compatible with running version | {{ref}} | {{status}} |
| `REL_DATA_CONTROLS` | Consent, retention, deletion, output label, and access boundaries work | {{ref}} | {{status}} |
| `REL_OPERATIONS` | Monitoring, spend/concurrency limits, rollback, provider-failure behavior exist | {{ref}} | {{status}} |
| `REL_COPY` | Product copy does not imply a guaranteed service outcome | {{ref}} | {{status}} |
| `REL_OVERALL` | All required release gates pass | {{verdict}} | {{status}} |

## 12. Deviations, independent review, and decision

Use the T1 **Deviations**, **Residual risks**, and **Independent review** tables, updated for P1. The independent pass must explicitly challenge image quality, cohort gaps, privacy/provenance, cost, security, accessibility, failure handling, and the automated display gate.

Record one decision: `release_to_pilot`, `narrow`, `remediate_and_rerun`, or `stop`. A scope restriction must identify affected cohorts/transforms, user-facing behavior, new evidence required, and why it remains inside the accepted product policy. It cannot hide a required core-cohort failure or weaken a threshold merely to ship.

## Final sign-off

| Role | Pseudonymous reviewer | Verdict | Date (UTC) | Evidence/signature reference |
|---|---|---|---|---|
| Evaluation owner | {{id}} | {{status}} | {{date}} | {{ref}} |
| Licensed-stylist lead | {{id}} | {{status}} | {{date}} | {{ref}} |
| Privacy/data steward | {{id}} | {{status}} | {{date}} | {{ref}} |
| Independent gate reviewer | {{id}} | {{status}} | {{date}} | {{ref}} |
| Release owner | {{id}} | {{status}} | {{date}} | {{ref}} |
