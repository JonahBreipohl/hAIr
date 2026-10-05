import { createHash } from "node:crypto";
import { types } from "node:util";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import { serializeEvaluationStatisticReport, type EvaluationStatisticInput, type EvaluationStatisticResult } from "./evaluation-statistics";
import { ratingScoreFields, ratingCriticalCodes } from "./evaluation-ratings";
import { coverageTransformations } from "./evaluation-coverage";

/** Fixed v1 table contracts captured from REPORT-TEMPLATE.md. */
const reportLayouts={
  "T1": [
    {
      "heading": "## 1. Verdict",
      "tables": [
        {
          "columns": [
            "Field",
            "Value"
          ],
          "rows": [
            [
              "Report ID",
              "`null (INCOMPLETE)`"
            ],
            [
              "Run ID",
              "`null (INCOMPLETE)`"
            ],
            [
              "Run window (UTC)",
              "`null (INCOMPLETE)` to `null (INCOMPLETE)`"
            ],
            [
              "Protocol / template / scorecard",
              "`null (INCOMPLETE)` / `null (INCOMPLETE)` / `null (INCOMPLETE)`"
            ],
            [
              "Overall verdict",
              "`null (INCOMPLETE)`"
            ],
            [
              "Decision",
              "`null (INCOMPLETE)`"
            ],
            [
              "Selected configuration",
              "`null (INCOMPLETE)`"
            ],
            [
              "Decision owner and date",
              "`null (INCOMPLETE)`, `null (INCOMPLETE)`"
            ],
            [
              "One-sentence basis",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Blocking failures or missing evidence",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Status",
            "Evidence or missing item",
            "Required action"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 2. Run integrity and reproducibility",
      "tables": [
        {
          "columns": [
            "Item",
            "Recorded value",
            "Check"
          ],
          "rows": [
            [
              "Dataset version / asset-manifest hash",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Case-manifest hash",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Configuration-manifest hash",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Pricing-schedule hash/date",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Code revision / dependency-lock hash",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Harness / viewer versions",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Deterministic assignment seed",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Invocation-order verification",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Rating-order/blinding verification",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "H0 fake-provider preflight",
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`"
            ],
            [
              "Undeclared post-output exclusions",
              "`null (INCOMPLETE)`",
              "Must be `0`"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 3. Asset authorization and coverage",
      "tables": [
        {
          "columns": [
            "Provenance audit item",
            "Result",
            "Required"
          ],
          "rows": [
            [
              "Eligible distinct adult subjects",
              "null (INCOMPLETE)",
              "36"
            ],
            [
              "Synthetic / licensed / explicitly consented subjects",
              "null (INCOMPLETE)",
              "Report only"
            ],
            [
              "Core ST × HT cells represented",
              "null (INCOMPLETE) / 24",
              "24 / 24"
            ],
            [
              "Assets with active required provider permission",
              "null (INCOMPLETE) / null (INCOMPLETE)",
              "100%"
            ],
            [
              "Assets with active human-rating/derivative permission",
              "null (INCOMPLETE) / null (INCOMPLETE)",
              "100%"
            ],
            [
              "Missing/expired/withdrawn/deletion-pending assets",
              "null (INCOMPLETE)",
              "0"
            ],
            [
              "Hash/metadata-strip verification failures",
              "null (INCOMPLETE)",
              "0"
            ],
            [
              "Unauthorized parent/derivation links",
              "null (INCOMPLETE)",
              "0"
            ],
            [
              "Provenance audit approval",
              "`null (INCOMPLETE)`",
              "PASS"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Cohort and secondary-condition counts",
      "tables": [
        {
          "columns": [
            "Slice type",
            "Slice ID",
            "Distinct subjects",
            "Requested cases",
            "Target/requirement",
            "Status"
          ],
          "rows": [
            [
              "`tone_band`",
              "`ST1`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "represented",
              "null (INCOMPLETE)"
            ],
            [
              "`texture_group`",
              "`HT1`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "represented",
              "null (INCOMPLETE)"
            ],
            [
              "`primary_intersection`",
              "`ST1_HT1`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "≥1 subject",
              "null (INCOMPLETE)"
            ],
            [
              "`secondary_condition`",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "declared plan",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 4. Cases and comparison design",
      "tables": [
        {
          "columns": [
            "Design item",
            "Actual",
            "Required"
          ],
          "rows": [
            [
              "Locked subjects",
              "null (INCOMPLETE)",
              "36"
            ],
            [
              "Locked cases",
              "null (INCOMPLETE)",
              "72"
            ],
            [
              "Cases per subject",
              "null (INCOMPLETE)",
              "2 each"
            ],
            [
              "Independent repetitions per finalist",
              "null (INCOMPLETE)",
              "2"
            ],
            [
              "Finalist configurations",
              "null (INCOMPLETE)",
              "≤3 unless pre-registered"
            ],
            [
              "Reference-driven cases",
              "null (INCOMPLETE)",
              "24"
            ],
            [
              "Completed requested output slots",
              "null (INCOMPLETE) / null (INCOMPLETE)",
              "Report exact"
            ],
            [
              "Configuration/case pairing violations",
              "null (INCOMPLETE)",
              "0"
            ],
            [
              "Unplanned selective regenerations",
              "null (INCOMPLETE)",
              "0"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Transformation allocation",
      "tables": [
        {
          "columns": [
            "Transformation",
            "Locked cases",
            "Required cases",
            "Reference-driven subset",
            "Coverage status"
          ],
          "rows": [
            [
              "Color-only family/tone",
              "null (INCOMPLETE)",
              "9",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Shorter cut/silhouette",
              "null (INCOMPLETE)",
              "9",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Longer hair",
              "null (INCOMPLETE)",
              "9",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Fringe/bangs/part",
              "null (INCOMPLETE)",
              "8",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Fade/taper/very short",
              "null (INCOMPLETE)",
              "8",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Layers/volume/styling texture",
              "null (INCOMPLETE)",
              "9",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Highlights/balayage",
              "null (INCOMPLETE)",
              "9",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "High-texture/protective style",
              "null (INCOMPLETE)",
              "11",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "**Total**",
              "**null (INCOMPLETE)**",
              "**72**",
              "**24**",
              "**null (INCOMPLETE)**"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 5. Compared configurations",
      "tables": [
        {
          "columns": [
            "Config ID",
            "Provider / exact model",
            "Prompt hash",
            "Mask strategy",
            "Protected region",
            "Settings hash",
            "Seed support",
            "Calls / outputs",
            "Eligibility after screen"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 6. Human quality results",
      "tables": [
        {
          "columns": [
            "Config",
            "Valid outputs",
            "Identity median",
            "Identity 4–5",
            "Adherence median",
            "Adherence 4–5",
            "Locality 4–5",
            "Boundary 4–5",
            "Realism 4–5",
            "Color 4–5",
            "Usefulness 4–5",
            "Displayable pass",
            "Usable result"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Critical failures and artifacts",
      "tables": [
        {
          "columns": [
            "Config",
            "Any critical fail",
            "Identity",
            "Locality",
            "Anatomy",
            "Subject",
            "Request",
            "Safety",
            "Privacy",
            "Corrupt",
            "Severe identity/anatomy/background",
            "Major hairline/anatomy/background"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Cohort results",
      "tables": [
        {
          "columns": [
            "Config",
            "Slice type",
            "Slice ID",
            "Subjects",
            "Generated",
            "Displayed",
            "Identity 4–5",
            "Adherence 4–5",
            "Locality 4–5",
            "Realism 4–5",
            "Displayable pass",
            "Critical fail",
            "Overall gap (pp)",
            "Sampling status"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Transformation and input-mode results",
      "tables": [
        {
          "columns": [
            "Config",
            "Transformation",
            "Input mode",
            "Cases",
            "Valid outputs",
            "Identity 4–5",
            "Adherence 4–5",
            "Locality 4–5",
            "Realism 4–5",
            "Usable result",
            "Critical fail"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Repetition stability",
      "tables": [
        {
          "columns": [
            "Config",
            "Paired cases",
            "Identity absolute delta",
            "Adherence absolute delta",
            "Locality absolute delta",
            "Automated-signal delta",
            "One-pass/one-fail pairs",
            "Interpretation"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 7. Rater and adjudication quality",
      "tables": [
        {
          "columns": [
            "Item",
            "Result",
            "Requirement/status"
          ],
          "rows": [
            [
              "Licensed stylist raters",
              "null (INCOMPLETE)",
              "≥2 per output"
            ],
            [
              "General raters",
              "null (INCOMPLETE)",
              "≥1 per output"
            ],
            [
              "Calibration completion",
              "null (INCOMPLETE)",
              "100%"
            ],
            [
              "Outputs missing required rater mix",
              "null (INCOMPLETE)",
              "0"
            ],
            [
              "Exact / within-one agreement by dimension",
              "null (INCOMPLETE)",
              "Report"
            ],
            [
              "Weighted ordinal agreement by dimension",
              "null (INCOMPLETE)",
              "Report"
            ],
            [
              "Adjudication triggers / completed",
              "null (INCOMPLETE)",
              "100% completed"
            ],
            [
              "Invalid ratings / replaced",
              "null (INCOMPLETE)",
              "All justified and replaced"
            ],
            [
              "Suspected blinding leak",
              "null (INCOMPLETE)",
              "0 unresolved"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 8. Reliability, latency, usage, and cost",
      "tables": [
        {
          "columns": [
            "Config",
            "Requested slots",
            "First-attempt success",
            "Eventual completion",
            "Policy reject",
            "Technical failure",
            "Timeout",
            "Malformed",
            "Retry",
            "Auto reject",
            "p50 end-to-end",
            "p90",
            "p95",
            "Cost/attempt",
            "Cost/requested slot",
            "Cost/displayed",
            "Cost/usable result",
            "3-preview cost"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 9. Automated-signal calibration",
      "tables": [
        {
          "columns": [
            "Detector/signal ID",
            "Version",
            "Frozen threshold",
            "Calibration partition",
            "Flagged n/N",
            "Human-confirmed failures",
            "False positives",
            "False negatives",
            "Production-gate eligible?"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 10. Paired configuration comparison",
      "tables": [
        {
          "columns": [
            "Pair",
            "Metric",
            "Paired difference",
            "95% clustered/bootstrap interval",
            "Equivalence margin",
            "Conclusion"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)` vs `null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 11. Technical prototype gate",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Requirement",
            "Exact observed result",
            "Evidence",
            "Status"
          ],
          "rows": [
            [
              "`T1_IDENTITY_MEDIAN`",
              "Dataset identity median ≥4/5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_ADHERENCE_MEDIAN`",
              "Dataset adherence median ≥4/5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_SEVERE_ARTIFACT_RATE`",
              "Severe identity/anatomy/background artifacts ≤10% of valid generated outputs",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_LATENCY_P95`",
              "p95 end-to-end result time ≤120,000 ms",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_COST_CAP`",
              "Total measured cost below pre-approved cap",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_COHORT_USABILITY`",
              "No sufficiently sampled cohort is obviously unusable",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_COMPLETION_RATE`",
              "Requested-slot completion ≥90%, absent accepted exception",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_PROVENANCE`",
              "Asset authorization audit passes",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_INDEPENDENT_REVIEW`",
              "Independent prototype review completed",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`T1_OVERALL`",
              "Every required T1 gate passes for ≥1 configuration",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 12. Deviations, risks, and independent review",
      "tables": []
    },
    {
      "heading": "### Deviations",
      "tables": [
        {
          "columns": [
            "Deviation ID",
            "Declared time",
            "Description",
            "Affected cases/configs",
            "Denominator impact",
            "Decision-capable?",
            "Owner/action"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Residual risks",
      "tables": [
        {
          "columns": [
            "Risk",
            "Evidence in this run",
            "Severity",
            "Mitigation before next stage",
            "Owner"
          ],
          "rows": [
            [
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Independent review",
      "tables": [
        {
          "columns": [
            "Review area",
            "Reviewer",
            "Finding",
            "Blocking?",
            "Evidence/action"
          ],
          "rows": [
            [
              "Image quality and cohorts",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Privacy and provenance",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Cost and latency",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Security and failure handling",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Accessibility implications",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 13. Decision and next evidence",
      "tables": []
    }
  ],
  "P1": [
    {
      "heading": "## 1. Verdict",
      "tables": [
        {
          "columns": [
            "Field",
            "Value"
          ],
          "rows": [
            [
              "Report ID / run ID",
              "`null (INCOMPLETE)` / `null (INCOMPLETE)`"
            ],
            [
              "Run window (UTC)",
              "`null (INCOMPLETE)` to `null (INCOMPLETE)`"
            ],
            [
              "Protocol / template / scorecard",
              "`null (INCOMPLETE)` / `null (INCOMPLETE)` / `null (INCOMPLETE)`"
            ],
            [
              "Candidate release / code revision",
              "`null (INCOMPLETE)` / `null (INCOMPLETE)`"
            ],
            [
              "Selected configuration",
              "`null (INCOMPLETE)`"
            ],
            [
              "Overall pilot image-quality verdict",
              "`null (INCOMPLETE)`"
            ],
            [
              "Overall pilot release evidence status",
              "`null (INCOMPLETE)`"
            ],
            [
              "Decision",
              "`null (INCOMPLETE)`"
            ],
            [
              "Decision owner and date",
              "`null (INCOMPLETE)`, `null (INCOMPLETE)`"
            ],
            [
              "One-sentence basis",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Blocking failures or missing evidence",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Status",
            "Exact evidence or missing item",
            "Required action"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 2. Reproducibility and authorization",
      "tables": [
        {
          "columns": [
            "Item",
            "Actual",
            "Required",
            "Status"
          ],
          "rows": [
            [
              "Eligible distinct adult subjects",
              "null (INCOMPLETE)",
              "120",
              "null (INCOMPLETE)"
            ],
            [
              "Subjects per each of 24 ST × HT cells",
              "null (INCOMPLETE)",
              "5 each",
              "null (INCOMPLETE)"
            ],
            [
              "Consultation specs",
              "null (INCOMPLETE)",
              "240",
              "null (INCOMPLETE)"
            ],
            [
              "Production-path requested output slots",
              "null (INCOMPLETE)",
              "720",
              "null (INCOMPLETE)"
            ],
            [
              "Reliability rerun cases",
              "null (INCOMPLETE)",
              "24, separate from primary denominator",
              "null (INCOMPLETE)"
            ],
            [
              "Unauthorized/missing/expired/withdrawn assets",
              "null (INCOMPLETE)",
              "0",
              "null (INCOMPLETE)"
            ],
            [
              "Ineligible primary cohort cells",
              "null (INCOMPLETE)",
              "0",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 3. Production-path flow",
      "tables": [
        {
          "columns": [
            "Flow step",
            "Count",
            "Percent of 720 slots",
            "Cost included?"
          ],
          "rows": [
            [
              "Requested output slots",
              "720",
              "100%",
              "Yes"
            ],
            [
              "Total provider attempts",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "First-attempt valid generations",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Policy rejected",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Technical failure/timeout/malformed",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Automatically rejected before display",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Retried slots",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Eventual displayed outputs",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Missing/unfilled slots",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Yes"
            ],
            [
              "Human-rated displayed outputs",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "N/A"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Automated rejection audit",
      "tables": [
        {
          "columns": [
            "Rejection reason",
            "Rejected outputs",
            "Human-audited",
            "True reject",
            "False reject",
            "Audit sampling met?"
          ],
          "rows": [
            [
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "**Total**",
              "**null (INCOMPLETE)**",
              "**null (INCOMPLETE)**",
              "**null (INCOMPLETE)**",
              "**null (INCOMPLETE)**",
              "**null (INCOMPLETE)**"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 4. Human quality results",
      "tables": [
        {
          "columns": [
            "Metric",
            "Numerator",
            "Denominator",
            "Exact rate",
            "95% subject-clustered interval"
          ],
          "rows": [
            [
              "Identity median 4–5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Major adherence median 4–5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Locality median 4–5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Realism median 4–5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Displayable pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Usable result",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Major hairline/anatomy/background artifact",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Severe identity escape",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "### Cohort floor and gap audit",
      "tables": [
        {
          "columns": [
            "Slice type",
            "Slice ID",
            "Distinct subjects",
            "Displayed outputs",
            "Displayable-pass n/N",
            "Exact pass rate",
            "Overall rate",
            "Gap vs overall (pp)",
            "≥85%?",
            "Gap ≤5 pp?",
            "Sampling/gate status"
          ],
          "rows": [
            [
              "null (INCOMPLETE)",
              "`null (INCOMPLETE)`",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 5. Raters, adjudication, and reliability",
      "tables": [
        {
          "columns": [
            "Reliability item",
            "Result"
          ],
          "rows": [
            [
              "Stratified cases independently rerun",
              "null (INCOMPLETE) / 24"
            ],
            [
              "Rerun requested slots / valid outputs",
              "null (INCOMPLETE)"
            ],
            [
              "One primary pass / one rerun fail",
              "null (INCOMPLETE)"
            ],
            [
              "New critical fail in rerun",
              "null (INCOMPLETE)"
            ],
            [
              "Median/p95 score delta by dimension",
              "null (INCOMPLETE)"
            ],
            [
              "Operational latency/cost delta",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 6. Pilot stylist usefulness",
      "tables": [
        {
          "columns": [
            "Measure",
            "Numerator",
            "Denominator",
            "Rate",
            "95% interval",
            "Sampling notes"
          ],
          "rows": [
            [
              "Licensed-stylist output usefulness score 4–5",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Participating stylists answering yes: “Would you use this accepted result in a real consultation?”",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 7. Reliability, latency, usage, and unit economics",
      "tables": [
        {
          "columns": [
            "Unit-economics item",
            "Value",
            "Method/evidence"
          ],
          "rows": [
            [
              "Total provider charge, all failures/retries included",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Usable results",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Fully loaded cost per usable result",
              "null (INCOMPLETE)",
              "total provider charge / usable results"
            ],
            [
              "Cost per completed three-preview consultation",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "p50/p90/p95 generation latency",
              "null (INCOMPLETE)",
              "nearest-rank, all production-path jobs"
            ],
            [
              "p95 queue/preprocess/provider/postprocess breakdown",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Spend/concurrency cap behavior",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 8. Automated display gate",
      "tables": [
        {
          "columns": [
            "Measure",
            "Numerator",
            "Denominator",
            "Rate",
            "Requirement/status"
          ],
          "rows": [
            [
              "Human-confirmed critical failures caught before display",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Report"
            ],
            [
              "Human-confirmed severe identity failures displayed",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Must be 0"
            ],
            [
              "Human-confirmed major artifact outputs displayed",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Must be <1%"
            ],
            [
              "False rejection in audited rejected sample",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Report/operational review"
            ],
            [
              "Flagged outputs with unresolved adjudication",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "Must be 0"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 9. Dependent privacy, safety, and software release evidence",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Required evidence",
            "Evidence ID/link",
            "Date/revision",
            "Status"
          ],
          "rows": [
            [
              "`P1_CONSENT`",
              "Consent blocks transfer before acknowledgment and stores the versioned receipt",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_IMMEDIATE_DELETE`",
              "Immediate deletion cascade and verification pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_EXPIRY`",
              "Original/output/share expiry and orphan cleanup pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_TENANT_ISOLATION`",
              "Cross-tenant access is denied in application, storage, and job paths",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_MODERATION`",
              "Disallowed requests/assets and provider/local disagreement paths pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_OUTPUT_LABEL`",
              "Displayed/shared/downloaded output carries required AI visualization label",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_FAILURE_HANDLING`",
              "Timeout, retry, partial, cancel, late callback, and provider outage paths pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_ACCESSIBILITY`",
              "Relevant WCAG 2.2 AA and target-device checks pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_SECURITY_PRIVACY`",
              "No unresolved critical/high privacy or security issue",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_MONITOR_ROLLBACK`",
              "Monitoring, spend/concurrency limits, kill switch, rollback behavior exist",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_UNIT_SUITE`",
              "Required unit suite in `QUALITY.md` passes at the candidate revision",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_INTEGRATION_SUITE`",
              "Required component/integration suite in `QUALITY.md` passes",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_E2E_SUITE`",
              "Fake-provider consent-to-delete, partial/retry, cancel, expiry, accessibility, and responsive E2E suite passes",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_NONFUNCTIONAL_SUITE`",
              "Required accessibility, browser/device, poor-network, adversarial, outage, load/cost, and recovery checks applicable to pilot pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 10. Pilot image-quality gate",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Requirement",
            "Exact observed result",
            "Evidence",
            "Status"
          ],
          "rows": [
            [
              "`P1_IDENTITY_4_5`",
              "≥95% of displayed outputs score 4–5 for identity",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_IDENTITY_ESCAPE`",
              "0 known severe identity failures displayed",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_ADHERENCE_4_5`",
              "≥85% of displayed outputs score 4–5 for major adherence",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_REALISM_4_5`",
              "≥90% of displayed outputs score 4–5 for realism",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_LOCALITY_4_5`",
              "≥90% of displayed outputs score 4–5 for edit locality",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_MAJOR_ARTIFACT`",
              "Major hairline/anatomy/background artifact rate <1% after rejection/retry",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_COHORT_FLOOR`",
              "Every sufficiently sampled cohort displayable-pass rate ≥85%",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_COHORT_GAP`",
              "No sufficiently sampled cohort trails overall by >5 percentage points",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_STYLIST_USEFUL`",
              "≥80% of pilot stylists say accepted result is useful",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_LATENCY_P95`",
              "p95 generation latency <90,000 ms; report 60,000 ms stretch",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_COST_USABLE`",
              "Fully loaded cost per usable result <$0.20 or accepted pre-verdict revised cap",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_REQUIRED_TESTS`",
              "Consent, immediate deletion, expiry, tenant isolation, moderation all pass completely",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_PROVENANCE`",
              "P1 asset authorization and 6 × 4 coverage audit passes",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_INDEPENDENT_REVIEW`",
              "Independent pilot review completed with no unresolved blocker",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`P1_IMAGE_QUALITY_OVERALL`",
              "Every P1 image-quality gate passes",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 11. Pilot release gate",
      "tables": [
        {
          "columns": [
            "Gate ID",
            "Requirement from `QUALITY.md`",
            "Evidence",
            "Status"
          ],
          "rows": [
            [
              "`REL_REQUIRED_CHECKS`",
              "Required software checks and relevant image-quality delta pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_PRIVACY_SECURITY`",
              "No unresolved critical/high privacy or security issue",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_DB_COMPATIBILITY`",
              "Database changes compatible with running version",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_DATA_CONTROLS`",
              "Consent, retention, deletion, output label, and access boundaries work",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_OPERATIONS`",
              "Monitoring, spend/concurrency limits, rollback, provider-failure behavior exist",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_COPY`",
              "Product copy does not imply a guaranteed service outcome",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "`REL_OVERALL`",
              "All required release gates pass",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    },
    {
      "heading": "## 12. Deviations, independent review, and decision",
      "tables": []
    },
    {
      "heading": "## Final sign-off",
      "tables": [
        {
          "columns": [
            "Role",
            "Pseudonymous reviewer",
            "Verdict",
            "Date (UTC)",
            "Evidence/signature reference"
          ],
          "rows": [
            [
              "Evaluation owner",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Licensed-stylist lead",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Privacy/data steward",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Independent gate reviewer",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ],
            [
              "Release owner",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)",
              "null (INCOMPLETE)"
            ]
          ]
        }
      ]
    }
  ]
} as const;

export const evaluationReportBundleVersion="hair-evaluation-report-bundle-v1";
export const evaluationReportTemplateId="hair-eval-report-v1";
export const reportBundleFilenames=Object.freeze(["report.md","summary.json","configurations.csv","overall-metrics.csv","cohort-metrics.csv","transformation-metrics.csv","operational-metrics.csv","automated-signals.csv","rater-metrics.csv","critical-failures.csv","deviations.json","provenance-audit.json"] as const);
export const reportBundleBounds=Object.freeze({input_nodes:14000000,report_nodes:28000000,depth:64,array_length:20000,input_string_length:128,file_bytes:8388608,total_file_bytes:33554432,rows_per_file:20000});
export const reportMetricColumns=Object.freeze(["schema_version","report_id","run_id","stage","configuration_id","metric_id","numerator","denominator","value","unit","ci95_low","ci95_high","calculation_version","row_id","population","population_n","status","evidence_status","known_numerator","known_denominator","source_ref","source_sha256","ci_source_ref","ci_source_sha256","calculation_ref"] as const);
export const reportCsvColumns=Object.freeze({
  "configurations.csv":Object.freeze([...reportMetricColumns,"configuration_sha256","configuration_json","protocol_id","record_id","created_at_utc","provider_id","api_region","model_snapshot","moderation_policy","prompt_template","descriptor_conversion","preprocessing","generation_parameters","mask_strategy","segmentation","dilation_px","feather_px","manual_mask_edit","protected_region_definition","output","preview_count","timeout_ms","retry_policy","max_attempts","concurrency","idempotency","seed","seed_unsupported","pricing_schedule_id","terms_snapshot","terms_snapshot_at_utc"]),
  "overall-metrics.csv":Object.freeze([...reportMetricColumns,"partition","configuration_b_id","direction"]),
  "cohort-metrics.csv":Object.freeze([...reportMetricColumns,"slice_type","slice_id","generated_sufficiency","projected_sufficiency","distinct_subject_count"]),
  "transformation-metrics.csv":Object.freeze([...reportMetricColumns,"transformation","input_mode","requested_cases"]),
  "operational-metrics.csv":Object.freeze([...reportMetricColumns,"cost_channel","unknown_attempt_count","cost_scope","denominator_scope","attempt_id","record_id","revision","outcome","usage_status","latest_attempt_sha256","invoice_state"]),
  "automated-signals.csv":Object.freeze([...reportMetricColumns,"detector_id","detector_version","frozen_threshold","calibration_partition","production_gate_eligible","embedding_execution"]),
  "rater-metrics.csv":Object.freeze([...reportMetricColumns,"dimension","complete_triple_count","unknown_triple_count"]),
  "critical-failures.csv":Object.freeze([...reportMetricColumns,"output_id","case_id","partition","actual_displayed","latest_declared_gate_passed","code","review_round_sha256s"]),
});
type StatisticalReport={readonly input:EvaluationStatisticInput;readonly result:EvaluationStatisticResult};
export interface EvaluationReportBundleInput {
  readonly schema_version:"1.0.0";readonly report_bundle_version:typeof evaluationReportBundleVersion;readonly report_id:string;readonly locked_at_utc:string;
  readonly declared_code_revision:string|null;readonly statistical_report:StatisticalReport;readonly statistical_report_sha256:string;
}
export interface EvaluationReportFile {readonly filename:typeof reportBundleFilenames[number];readonly media_type:"text/markdown"|"application/json"|"text/csv";readonly content:string;readonly byte_length:number;readonly content_sha256:string;}
export interface EvaluationReportBundleResult {
  readonly report_bundle_version:typeof evaluationReportBundleVersion;readonly template_id:typeof evaluationReportTemplateId;readonly report_id:string;readonly run_id:string;readonly stage:"T1"|"P1";
  readonly input_sha256:string;readonly statistical_report_sha256:string;readonly bundle_sha256:string;readonly status:"COMPLETE_METADATA_EXPORT";
  readonly verdict:"INCOMPLETE";readonly decision:"none";readonly selected_configuration_id:null;readonly files:readonly EvaluationReportFile[];
  readonly live_quality_gate:"NOT_EVALUATED";readonly release_gate:"NOT_EVALUATED";readonly provider_selection:"NOT_EVALUATED";readonly spending_authorization:"NOT_EVALUATED";
}
const denial="Evaluation report bundle rejected.";
function ensure(value:unknown):asserts value {if(!value)throw new TypeError(denial);}
function safe<T>(action:()=>T):T {try{return action();}catch{throw new TypeError(denial);}}
function object(value:unknown,fields:readonly string[]):Record<string,unknown> {ensure(value!==null&&typeof value==="object"&&!Array.isArray(value));const keys=Object.keys(value);ensure(keys.length===fields.length&&keys.every(key=>fields.includes(key)));return value as Record<string,unknown>;}
function preflight(value:unknown,report=false):void {
  let nodes=0;const parents=new Set<object>(),limit=report?reportBundleBounds.report_nodes:reportBundleBounds.input_nodes;
  const visit=(value:unknown,depth:number):void=>{ensure(++nodes<=limit&&depth<=64&&!types.isProxy(value));if(typeof value==="string"){ensure(value.length<=(report?reportBundleBounds.total_file_bytes:128));return;}if(value===null||typeof value==="boolean")return;if(typeof value==="number"){ensure(Number.isFinite(value));return;}ensure(typeof value==="object"&&!parents.has(value));const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);ensure(prototype===(array?Array.prototype:Object.prototype)||(!array&&prototype===null));const keys=Reflect.ownKeys(value);ensure(keys.every(key=>typeof key==="string"&&key.length<=64));if(array){const length=Object.getOwnPropertyDescriptor(value,"length")!.value as number;ensure(length<=20000&&keys.length===length+1);for(let i=0;i<length;i++)ensure(Object.getOwnPropertyDescriptor(value,String(i))?.enumerable===true);}else ensure(keys.length<=64);parents.add(value);for(const key of keys){if(array&&key==="length")continue;const descriptor=Object.getOwnPropertyDescriptor(value,key);ensure(descriptor?.enumerable===true&&"value" in descriptor);visit(descriptor.value,depth+1);}parents.delete(value);};visit(value,0);
}
function instant(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);}
function ordered(a:string,b:string):number {return a<b?-1:a>b?1:0;}
function exact(actual:unknown,expected:unknown):void {if(Array.isArray(expected)){ensure(Array.isArray(actual)&&actual.length===expected.length);actual.forEach((value,index)=>exact(value,expected[index]));}else if(expected!==null&&typeof expected==="object"){const ref=expected as Record<string,unknown>,raw=object(actual,Object.keys(ref));Object.keys(ref).forEach(key=>exact(raw[key],ref[key]));}else ensure(actual===expected);}
export function validateEvaluationReportBundleInput(value:unknown):EvaluationReportBundleInput {
  return safe(()=>{preflight(value);const raw=object(value,["schema_version","report_bundle_version","report_id","locked_at_utc","declared_code_revision","statistical_report","statistical_report_sha256"]);ensure(raw.schema_version==="1.0.0"&&raw.report_bundle_version===evaluationReportBundleVersion&&typeof raw.report_id==="string"&&/^rpt_[a-f0-9]{16}$/.test(raw.report_id));instant(raw.locked_at_utc);ensure(raw.declared_code_revision===null||(typeof raw.declared_code_revision==="string"&&/^[a-f0-9]{40}$/.test(raw.declared_code_revision)));const report=JSON.parse(serializeEvaluationStatisticReport(raw.statistical_report)) as StatisticalReport;ensure(raw.statistical_report_sha256===sha256EvaluationManifest(report));const stage=report.input.metric_report.result.stage;ensure(stage==="T1"||stage==="P1");const cutoff=(value:unknown):void=>{if(Array.isArray(value)){value.forEach(cutoff);return;}if(value===null||typeof value!=="object")return;for(const [key,entry] of Object.entries(value)){if(key.endsWith("_at_utc")){instant(entry);ensure(entry<=raw.locked_at_utc!);}cutoff(entry);}};cutoff(report);return JSON.parse(canonicalEvaluationJson({...raw,statistical_report:report})) as EvaluationReportBundleInput;});
}
type Cell=string|number|boolean|null;
type Row=Record<string,Cell>;
/** Quoted RFC4180 cells plus a closed typed grammar. Quoting is not treated as
 * formula protection: text prefixes =,+,-,@ and controls are denied. Signed
 * integers/decimals are emitted only through the numeric grammar; rational
 * display text begins with the fixed non-formula prefix `rational:`. */
function csvCell(value:Cell):string {let text:string;if(value===null)text="null";else if(typeof value==="number"){ensure(Number.isFinite(value));text=String(value);ensure(/^-?(?:\d+(?:\.\d+)?|\d+(?:\.\d+)?e[+-]?\d+)$/.test(text));}else if(typeof value==="boolean")text=value?"true":"false";else{ensure(!/[\x00-\x1f\x7f]/.test(value)&&(!/^\s*[=+@-]/.test(value)||/^-\d+$/.test(value)));text=value;}return `"${text.replace(/"/g,'""')}"`;}
function csv(columns:readonly string[],rows:readonly Row[]):string {ensure(rows.length<=20000);return [columns.map(csvCell).join(","),...rows.map(row=>columns.map(column=>csvCell(row[column]??null)).join(","))].join("\r\n")+"\r\n";}
function rational(value:{readonly numerator:number|string;readonly denominator:number|string}|null|undefined):string|null {return value?`rational:${value.numerator}/${value.denominator}`:null;}
/** Presentation only. Decisions retain exact source ratios; e.g. 1/101 and
 * 1/100 both display 1.0%, without sharing their strict-boundary decision. */
function percentage(numerator:Cell,denominator:Cell):string {
  if(numerator===null||denominator===null)return "null";const n=String(numerator),d=String(denominator);if(!/^\d+$/.test(n)||!/^\d+$/.test(d)||BigInt(d)===BigInt(0))return "null";
  const units=(BigInt(n)*BigInt(2000)+BigInt(d))/(BigInt(2)*BigInt(d));return `${units/BigInt(10)}.${units%BigInt(10)}%`;
}
function integerCell(value:number|string|null):Cell {if(value===null||typeof value==="number")return value;ensure(/^-?\d+$/.test(value));/* Positive BigInt strings remain exact text; negative exact strings are
 * retained through the strict numeric-string grammar without a Number cast. */return value;}
function byteHash(content:string):string {return createHash("sha256").update(content,"utf8").digest("hex");}
function bytes(content:string):number {return new TextEncoder().encode(content).length;}
interface Gate {gate_id:string;configuration_id:string|null;status:"INCOMPLETE";numerator:null;denominator:null;observed:null;operator:string|null;threshold:number|null;unit:string|null;evidence_ref:string;declared_observation_ref:string|null;}
const gateThresholds:Readonly<Record<string,readonly [string,number,string]>>=Object.freeze({T1_IDENTITY_MEDIAN:[">=",4,"score_0_5"],T1_ADHERENCE_MEDIAN:[">=",4,"score_0_5"],T1_SEVERE_ARTIFACT_RATE:["<=",0.1,"ratio"],T1_LATENCY_P95:["<=",120000,"milliseconds"],T1_COMPLETION_RATE:[">=",0.9,"ratio"],P1_IDENTITY_4_5:[">=",0.95,"ratio"],P1_IDENTITY_ESCAPE:["=",0,"count"],P1_ADHERENCE_4_5:[">=",0.85,"ratio"],P1_REALISM_4_5:[">=",0.9,"ratio"],P1_LOCALITY_4_5:[">=",0.9,"ratio"],P1_MAJOR_ARTIFACT:["<",0.01,"ratio"],P1_COHORT_FLOOR:[">=",0.85,"ratio"],P1_COHORT_GAP:["<=",5,"percentage_points"],P1_STYLIST_USEFUL:[">=",0.8,"ratio"],P1_LATENCY_P95:["<",90000,"milliseconds"],P1_COST_USABLE:["<",0.2,"USD"]});

export function exportEvaluationReportBundle(value:unknown):{input:EvaluationReportBundleInput;result:EvaluationReportBundleResult} {
  return safe(()=>{
    const input=validateEvaluationReportBundleInput(value),stats=input.statistical_report,metric=stats.input.metric_report,coverage=metric.input.coverage_report,cost=metric.input.cost_report,rating=metric.input.rating_report,bundle=cost.input.bundle,plan=bundle.plan,stage=plan.stage as "T1"|"P1";
    const configIds=plan.configurations.map(row=>row.configuration_id).sort(ordered),tables=new Map<string,Row[]>();let rowCounter=0;
    for(const filename of reportBundleFilenames)if(filename.endsWith(".csv"))tables.set(filename,[]);
    const sources={statistics:input.statistical_report_sha256,metrics:stats.input.metric_report_sha256,coverage:metric.input.coverage_report_sha256,costs:metric.input.cost_report_sha256,ratings:metric.input.rating_report_sha256,plan:bundle.plan_sha256};
    const emit=(file:string,configurationId:string|null,metricId:string,population:string,numerator:number|string|null,denominator:number|string|null,unit:string,source:"statistics"|"metrics"|"coverage"|"costs"|"ratings"|"plan",pointer:string,options:{known_numerator?:number|string|null;known_denominator?:number|string|null;population_n?:number|null;status?:string;ci95_low?:number|null;ci95_high?:number|null;ci_source_ref?:string|null;extra?:Row}={}):Row=>{
      const row:Row={schema_version:"1.0.0",report_id:input.report_id,run_id:plan.run_id,stage,configuration_id:configurationId,metric_id:metricId,numerator:integerCell(numerator),denominator:integerCell(denominator),value:numerator!==null&&denominator!==null&&BigInt(denominator)!==BigInt(0)?`rational:${numerator}/${denominator}`:null,unit,ci95_low:options.ci95_low??null,ci95_high:options.ci95_high??null,calculation_version:evaluationReportBundleVersion,row_id:`row-${(++rowCounter).toString().padStart(8,"0")}`,population,population_n:options.population_n??null,status:options.status??(numerator===null||denominator===null?"INCOMPLETE":BigInt(denominator)===BigInt(0)?"EMPTY_POPULATION":"DECLARED_DIAGNOSTIC"),evidence_status:"DECLARED_METADATA_ONLY",known_numerator:integerCell(options.known_numerator===undefined?numerator:options.known_numerator),known_denominator:integerCell(options.known_denominator===undefined?denominator:options.known_denominator),source_ref:`${source}:${pointer}`,source_sha256:sources[source],ci_source_ref:options.ci_source_ref??null,ci_source_sha256:options.ci_source_ref?sources.statistics:null,calculation_ref:`${evaluationReportBundleVersion}#${metricId}`,...options.extra};tables.get(file)!.push(row);return row;
    };
    type Projection=typeof metric.result.configurations[number]["partitions"][number]["all_generated"];
    const projection=(file:string,id:string,projection:Projection,population:string,pointer:string,extra:Row={},ci=false):void=>{
      const configured=ci?stats.result.populations.find(row=>row.configuration_id===id&&row.population===(projection.scope==="all_retained_generated_outputs"?"primary_all_generated":"primary_declared_gate_passed")):undefined;
      const write=(metricId:string,n:number|null,d:number|null,unit:string,suffix:string,knownN:number|null,knownD:number|null)=>{const observationIndex=configured?.observations.findIndex(row=>row.functional===metricId),statIndex=configured?stats.result.populations.indexOf(configured):-1,interval=configured?.observations.find(row=>row.functional===metricId)?.interval;return emit(file,id,metricId,population,n,d,unit,"metrics",`${pointer}/${suffix}`,{known_numerator:knownN,known_denominator:knownD,population_n:projection.output_count,ci95_low:interval?.lower??null,ci95_high:interval?.upper??null,ci_source_ref:configured&&observationIndex!==undefined&&observationIndex>=0?`statistics:/result/populations/${statIndex}/observations/${observationIndex}`:null,extra:file==="cohort-metrics.csv"?{...extra,distinct_subject_count:projection.distinct_subject_count}:extra});};
      for(const field of ratingScoreFields){const median=projection.median_of_output_medians[field];write(`median:${field}`,median.value?.numerator??null,median.value?.denominator??null,"score_0_5",`median_of_output_medians/${field}`,null,null);const count=projection.score_4_5[field];write(`score_4_5:${field}`,count.numerator,count.denominator,"ratio",`score_4_5/${field}`,count.known_numerator,count.known_denominator);}
      for(const [key,metricId] of [["displayable","displayable_rate"],["usable","usable_rate"],["critical_fail_any","critical_rate"],["t1_severe","t1_severe_rate"],["p1_major","p1_major_rate"],["major_artifact_any","major_artifact_rate"]] as const){const count=projection[key];write(metricId,count.numerator,count.denominator,"ratio",key,count.known_numerator,count.known_denominator);}
      for(const code of ratingCriticalCodes){const count=projection.critical_fail_codes[code]!;write(`critical_code:${code}`,count.numerator,count.denominator,"ratio",`critical_fail_codes/${code}`,count.known_numerator,count.known_denominator);}
    };
    for(const id of configIds){const configIndex=plan.configurations.findIndex(row=>row.configuration_id===id),config=plan.configurations[configIndex]!,cmIndex=metric.result.configurations.findIndex(row=>row.configuration_id===id),cm=metric.result.configurations[cmIndex]!,base=`/result/configurations/${cmIndex}`;
      const configRow=emit("configurations.csv",id,"configuration_lock","locked_configuration",null,null,"metadata","plan",`/configurations/${configIndex}`,{extra:{configuration_sha256:sha256EvaluationManifest(config),configuration_json:canonicalEvaluationJson(config)}});for(const [key,entry] of Object.entries(config))configRow[key]=entry!==null&&typeof entry==="object"?canonicalEvaluationJson(entry):entry as Cell;
      for(let index=0;index<cm.partitions.length;index++){const partition=cm.partitions[index]!,pointer=`${base}/partitions/${index}`;
        for(const key of ["all_generated","declared_gate_passed"] as const)projection("overall-metrics.csv",id,partition[key],`${partition.partition}:${key}`,`${pointer}/${key}`,{partition:partition.partition},partition.partition==="primary");
        for(const [key,metricId] of [["first_attempt_success","first_attempt_success"],["eventual_success","eventual_completion"],["historical_raw_identity_passage","suspected_raw_identity_passage"],["historical_adjudicated_review_escape","adjudicated_review_escape"]] as const){const count=partition[key];emit("operational-metrics.csv",id,metricId,partition.partition,count.numerator,count.denominator,"ratio","metrics",`${pointer}/${key}`,{known_numerator:count.known_numerator,known_denominator:count.known_denominator});}
        for(const key of ["requested_slot_count","logical_attempt_count","attempt_record_count","usage_revision_count","generated_slot_count","retry_attempt_count"] as const)emit("operational-metrics.csv",id,key,partition.partition,partition[key],1,"count","metrics",`${pointer}/${key}`);
        for(const outcome of Object.keys(partition.attempt_outcomes).sort(ordered))emit("operational-metrics.csv",id,`attempt_outcome:${outcome}`,partition.partition,partition.attempt_outcomes[outcome]!,partition.logical_attempt_count||null,"ratio","metrics",`${pointer}/attempt_outcomes/${outcome}`);
        for(const channel of ["formula_estimate","declared_charges"] as const){const spend=partition.partition_spend[channel];emit("operational-metrics.csv",id,`total_provider_cost:${channel}`,`${partition.partition}:all_attempts`,spend.total?.numerator??null,spend.total?.denominator??null,"micro_usd","metrics",`${pointer}/partition_spend/${channel}`,{known_numerator:spend.known_subtotal.numerator,known_denominator:spend.known_subtotal.denominator,extra:{cost_channel:channel,unknown_attempt_count:spend.unknown_attempt_count}});}
      }
      for(let index=0;index<cm.primary_cohorts.length;index++){const cohort=cm.primary_cohorts[index]!,extra={slice_type:cohort.kind,slice_id:cohort.label,generated_sufficiency:cohort.generated_sufficiency,projected_sufficiency:cohort.projected_sufficiency};for(const key of ["all_generated","declared_gate_passed"] as const)projection("cohort-metrics.csv",id,cohort[key],`primary:${key}`,`${base}/primary_cohorts/${index}/${key}`,extra);}
      for(const channel of ["formula_estimate","declared_charges"] as const){const value=cm.primary_projected_cost_per_declared_usable[channel];emit("operational-metrics.csv",id,`modeled_provider_cost_per_declared_usable:${channel}`,"all_requested_cost_over_primary_declared_gate_passed_usable",value?.numerator??null,value?.denominator??null,"micro_usd","metrics",`${base}/primary_projected_cost_per_declared_usable/${channel}`,{extra:{cost_channel:channel,cost_scope:cm.primary_projected_cost_per_declared_usable.cost_scope,denominator_scope:cm.primary_projected_cost_per_declared_usable.denominator_scope}});}
      for(const metricId of ["end_to_end_latency_p50","end_to_end_latency_p90","end_to_end_latency_p95","queue_latency_p95","preprocessing_latency_p95","postprocessing_latency_p95","actual_display_count","fully_loaded_cost_per_usable","three_preview_consultation_cost"]){emit("operational-metrics.csv",id,metricId,"live_production_path",null,null,metricId.includes("latency")?"milliseconds":metricId.includes("cost")?"USD":"count","metrics","/result/latency_gate");}
      emit("automated-signals.csv",id,"detector_calibration","live_detector_population",null,null,"ratio","ratings","/result/calibration",{extra:{detector_id:null,detector_version:null,frozen_threshold:null,calibration_partition:null,production_gate_eligible:null,embedding_execution:"NOT_EVALUATED"}});
    }
    // Every immutable usage correction remains exportable; current attempt cost
    // rows count each logical invocation exactly once, including failed retries.
    bundle.attempts.forEach((attempt,index)=>{for(const field of ["image_input_units","image_output_units","text_input_units"] as const)emit("operational-metrics.csv",attempt.configuration_id,`usage_revision:${field}`,"all_attempt_record_history",attempt.usage[field],1,"locked_usage_units","costs",`/input/bundle/attempts/${index}/usage/${field}`,{extra:{attempt_id:attempt.attempt_id,record_id:attempt.record_id,revision:attempt.revision,outcome:attempt.outcome,usage_status:attempt.usage.status}});emit("operational-metrics.csv",attempt.configuration_id,"declared_provider_attempt_duration","all_attempt_record_history",attempt.duration_ms,1,"milliseconds","costs",`/input/bundle/attempts/${index}/duration_ms`,{extra:{attempt_id:attempt.attempt_id,record_id:attempt.record_id,revision:attempt.revision,outcome:attempt.outcome}});});
    cost.result.attempts.forEach((attempt,index)=>{for(const channel of ["formula_estimate","declared_charge"] as const){const value=attempt[channel];emit("operational-metrics.csv",attempt.configuration_id,`logical_attempt_provider_cost:${channel}`,"current_logical_attempt",value?.numerator??null,value?.denominator??null,"micro_usd","costs",`/result/attempts/${index}/${channel}`,{extra:{attempt_id:attempt.attempt_id,latest_attempt_sha256:attempt.latest_attempt_sha256,revision:attempt.latest_usage_revision,outcome:attempt.outcome,cost_channel:channel,invoice_state:attempt.invoice_state}});}});
    stats.result.raw_agreement.forEach((row,index)=>{for(const key of ["exact_agreement","within_one_agreement","ordinal_alpha","observed_disagreement","expected_disagreement"] as const){const value=row[key],counts=key==="exact_agreement"?[row.known_exact_pair_count,row.pair_denominator]:key==="within_one_agreement"?[row.known_within_one_pair_count,row.pair_denominator]:null;emit("rater-metrics.csv",row.configuration_id,`${key}:${row.dimension}`,row.population,counts&&value?counts[0]!:value?.numerator??null,counts&&value?counts[1]!:value?.denominator??null,key.includes("disagreement")?"ordinal_squared_distance":key==="ordinal_alpha"?"ordinal_alpha":"ratio","statistics",`/result/raw_agreement/${index}/${key}`,{known_numerator:counts?.[0]??null,known_denominator:counts?.[1]??null,population_n:row.output_count,status:row.status,extra:{dimension:row.dimension,complete_triple_count:row.complete_triple_count,unknown_triple_count:row.unknown_triple_count}});}});
    for(const id of configIds){const outputs=new Set(metric.result.outputs.filter(row=>row.configuration_id===id).map(row=>row.output_id)),assignments=rating.input.assignments.assignments.filter(row=>outputs.has(row.output_id));for(const role of ["licensed_stylist","general"] as const)emit("rater-metrics.csv",id,`declared_distinct_raters:${role}`,"all_retained_assignments",new Set(assignments.filter(row=>row.rater_role===role).map(row=>row.rater_id)).size,1,"count","ratings","/input/assignments/assignments");for(const key of ["raw_rating_count","adjudication_record_count"] as const)emit("rater-metrics.csv",id,key,"all_retained_configuration",key==="raw_rating_count"?rating.input.ratings.filter(row=>outputs.has(row.output_id)).length:rating.input.adjudications.filter(row=>outputs.has(row.output_id)).length,1,"count","ratings",key==="raw_rating_count"?"/input/ratings":"/input/adjudications");for(const missing of ["calibrated_rater_count","actual_licensed_rater_count","replacement_count","unresolved_blinding_leak_count","pilot_stylist_yes_rate"])emit("rater-metrics.csv",id,missing,"trusted_human_evidence",null,null,"count","ratings","/result/calibration");}
    metric.result.outputs.forEach((output,index)=>{const pointer=`/result/outputs/${index}`,common={output_id:output.output_id,case_id:output.case_id,partition:output.partition,actual_displayed:null,latest_declared_gate_passed:output.declared_gate_passed};for(const [scope,codes] of [["raw_critical",output.raw_critical_fail_codes],["current_declared_critical",output.critical_fail_codes],["raw_major",output.raw_major_artifact_codes],["current_declared_major",output.major_artifact_codes]] as const){if(codes===null)emit("critical-failures.csv",output.configuration_id,scope,"retained_output",null,null,"classification","metrics",pointer,{extra:{...common,code:null}});else for(const code of codes)emit("critical-failures.csv",output.configuration_id,scope,"retained_output",1,1,"classification","metrics",pointer,{extra:{...common,code}});}for(const key of ["historical_raw_identity_flagged_gate_passage","historical_adjudicated_identity_gate_passage"] as const){const flag=output[key];emit("critical-failures.csv",output.configuration_id,key,"all_retained_history",flag===null?null:flag?1:0,1,"declared_observation","metrics",`${pointer}/${key}`,{extra:{...common,code:"CF_IDENTITY",review_round_sha256s:canonicalEvaluationJson(output.adjudicated_review_escape_sha256s)}});}});
    // Exact case/input-mode join; no cohort pooling or additional inference.
    for(const id of configIds)for(const transformation of coverageTransformations)for(const mode of ["structured","reference"] as const){const cases=plan.cases.filter(row=>row.transformation===transformation&&(row.reference_asset_id===null?"structured":"reference")===mode),ids=new Set(cases.map(row=>row.case_id));for(const projected of [false,true]){const full=metric.result.outputs.filter(row=>row.configuration_id===id&&row.partition==="primary"&&ids.has(row.case_id)),selected=projected?full.filter(row=>row.declared_gate_passed===true):full,unknown=(projected&&full.some(row=>row.declared_gate_passed===null))||selected.some(row=>row.status!=="COMPLETE_DECLARED_CLASSIFICATION"),extra={transformation,input_mode:mode,requested_cases:cases.length};for(const field of ratingScoreFields){const known=selected.filter(row=>row.declared_raw_medians!==null),good=known.filter(row=>row.declared_raw_medians![field]>=4).length;emit("transformation-metrics.csv",id,`score_4_5:${field}`,`primary:${projected?"declared_gate_passed":"all_generated"}`,unknown||!selected.length?null:good,unknown||!selected.length?null:selected.length,"ratio","metrics","/result/outputs",{known_numerator:good,known_denominator:known.length,population_n:unknown?null:selected.length,extra});}for(const [key,label] of [["declared_usable_pass","usable_rate"],["critical_fail_codes","critical_rate"]] as const){const known=selected.filter(row=>row[key]!==null),good=known.filter(row=>key==="critical_fail_codes"?row.critical_fail_codes!.length>0:row.declared_usable_pass).length;emit("transformation-metrics.csv",id,label,`primary:${projected?"declared_gate_passed":"all_generated"}`,unknown||!selected.length?null:good,unknown||!selected.length?null:selected.length,"ratio","metrics","/result/outputs",{known_numerator:good,known_denominator:known.length,population_n:unknown?null:selected.length,extra});}}}
    stats.result.comparisons.forEach((pair,index)=>pair.observations.forEach((row,metricIndex)=>emit("overall-metrics.csv",pair.configuration_a_id,`paired:${row.functional}`,`${pair.population}:${pair.unit}`,row.point?.numerator??null,row.point?.denominator??null,row.functional.startsWith("median:")?"score_difference":"ratio_difference","statistics",`/result/comparisons/${index}/observations/${metricIndex}`,{status:row.status,ci95_low:row.interval?.lower??null,ci95_high:row.interval?.upper??null,ci_source_ref:`statistics:/result/comparisons/${index}/observations/${metricIndex}`,extra:{configuration_b_id:pair.configuration_b_id,direction:pair.direction}})));
    const layouts=reportLayouts[stage],gateIds=[...new Set(layouts.flatMap(node=>node.tables.flatMap(table=>table.rows.map(row=>row[0]?.replace(/`/g,"")).filter((id):id is string=>!!id&&/^(T1_|P1_|REL_)/.test(id)))))];

    const gateDiagnostic=(gateId:string,id:string|null):string|null=>{if(id===null)return null;const quality=stage==='T1'?'primary:all_generated':'primary:declared_gate_passed',mapping:Record<string,readonly [string,string,string]>={T1_IDENTITY_MEDIAN:['overall-metrics.csv','median:identity_score',quality],T1_ADHERENCE_MEDIAN:['overall-metrics.csv','median:adherence_score',quality],T1_SEVERE_ARTIFACT_RATE:['overall-metrics.csv','t1_severe_rate',quality],T1_COMPLETION_RATE:['operational-metrics.csv','eventual_completion','primary'],T1_COST_CAP:['operational-metrics.csv','total_provider_cost:declared_charges','all_requested:all_attempts'],P1_IDENTITY_4_5:['overall-metrics.csv','score_4_5:identity_score',quality],P1_IDENTITY_ESCAPE:['operational-metrics.csv','adjudicated_review_escape','all_requested'],P1_ADHERENCE_4_5:['overall-metrics.csv','score_4_5:adherence_score',quality],P1_REALISM_4_5:['overall-metrics.csv','score_4_5:realism_score',quality],P1_LOCALITY_4_5:['overall-metrics.csv','score_4_5:locality_score',quality],P1_MAJOR_ARTIFACT:['overall-metrics.csv','p1_major_rate',quality],P1_COST_USABLE:['operational-metrics.csv','modeled_provider_cost_per_declared_usable:declared_charges','all_requested_cost_over_primary_declared_gate_passed_usable']};const definition=mapping[gateId];if(!definition)return null;const [file,metricId,population]=definition,row=tables.get(file)!.find(row=>row.configuration_id===id&&row.metric_id===metricId&&row.population===population);return row?file+'#'+row.row_id:null;};
    const gates:Gate[]=gateIds.flatMap(gateId=>{const global=gateId.startsWith("REL_")||gateId.endsWith("OVERALL")||gateId.startsWith("P1_")&&["CONSENT","IMMEDIATE_DELETE","EXPIRY","TENANT_ISOLATION","MODERATION","OUTPUT_LABEL","FAILURE_HANDLING","ACCESSIBILITY","SECURITY_PRIVACY","MONITOR_ROLLBACK","UNIT_SUITE","INTEGRATION_SUITE","E2E_SUITE","NONFUNCTIONAL_SUITE"].some(suffix=>gateId===`P1_${suffix}`);return (global?[null]:configIds).map(id=>({gate_id:gateId,configuration_id:id,status:"INCOMPLETE" as const,numerator:null,denominator:null,observed:null,operator:gateThresholds[gateId]?.[0]??null,threshold:gateThresholds[gateId]?.[1]??null,unit:gateThresholds[gateId]?.[2]??null,evidence_ref:"summary.json#missing_evidence",declared_observation_ref:gateDiagnostic(gateId,id)}));});
    const missing=["AUTHENTIC_CODE_EXECUTION","DEPENDENCY_LOCK_ATTESTATION","LIVE_PROVENANCE","TRUSTED_VIEWER","RATER_QUALIFICATION","CALIBRATION","BLINDING_AND_ORDER","H0_LEDGER","LIVE_DETECTORS_AND_EMBEDDING_EXECUTION","END_TO_END_LATENCY","BILLING_AND_FULLY_LOADED_ECONOMICS","COMPLETE_DEVIATION_HISTORY","FULL_INFERENCE","INDEPENDENT_REVIEW","PRIVACY_SOFTWARE_RELEASE_EVIDENCE","SIGN_OFF"];
    const summary={schema_version:"1.0.0",template_id:evaluationReportTemplateId,protocol_id:plan.protocol_id,scorecard_id:"hair-scorecard-v1",report_id:input.report_id,run_id:plan.run_id,stage,verdict:"INCOMPLETE",decision:"none",selected_configuration_id:null,dataset_manifest_sha256:sha256EvaluationManifest(plan.assets),case_manifest_sha256:sha256EvaluationManifest(plan.cases),configuration_manifest_sha256:sha256EvaluationManifest(plan.configurations),code_revision:input.declared_code_revision,code_revision_evidence:"INCOMPLETE",declared_plan_code_revision_sha256:plan.code_revision_sha256,gates,created_at_utc:input.locked_at_utc,source_hashes:sources,missing_evidence:missing,metadata_export_status:"COMPLETE_METADATA_EXPORT",metric_references:[...tables.entries()].flatMap(([filename,rows])=>rows.map(row=>({metric_id:row.metric_id,configuration_id:row.configuration_id,population:row.population,evidence_ref:`${filename}#${row.row_id}`}))),actual_display_evidence:"NOT_EVALUATED",full_inference:"NOT_EVALUATED",spending_authorization:"NOT_EVALUATED",deviation_history_completeness:"INCOMPLETE"};
    const deviations={schema_version:"1.0.0",report_id:input.report_id,run_id:plan.run_id,scope:"retained_declared_coverage_restrictions_only",completeness:"INCOMPLETE",absence_of_execution_deviations:"NOT_EVALUATED",records:[...coverage.input.preregistration.unsupported_blocks.map(row=>({kind:"unsupported_block",declaration:row})),...coverage.input.preregistration.physical_inapplicability.map(row=>({kind:"physical_inapplicability",declaration:row})),...(coverage.input.preregistration.finalist_limit_override?[{kind:"finalist_limit_override",declaration:coverage.input.preregistration.finalist_limit_override}]:[])],comparison:coverage.input.preregistration.comparison,changed_factor:coverage.input.preregistration.changed_factor,coverage_findings:coverage.result.findings,decision_capable:false,source_ref:"coverage:/input/preregistration",source_sha256:sources.coverage};
    const provenance={schema_version:"1.0.0",report_id:input.report_id,run_id:plan.run_id,stage,status:"INCOMPLETE",approval:null,eligible_adult_subject_count:null,active_provider_permission_count:null,active_human_rating_permission_count:null,withdrawn_or_expired_count:null,verified_metadata_strip_failures:null,source_asset_manifest_sha256:sha256EvaluationManifest(plan.assets),declared_metadata_sha256:sha256EvaluationManifest(coverage.input.metadata),declared_subject_count:coverage.result.primary_subject_count,registry_manifest_sha256s:[...new Set(plan.assets.map(row=>row.registry_manifest_sha256))].sort(ordered),declared_portrait_provenance_counts:coverage.input.metadata.reduce<Record<string,number>>((counts,row)=>{counts[row.provenance]=(counts[row.provenance]??0)+1;return counts;},{}),coverage_status:coverage.result.coverage_status,coverage_findings:coverage.result.findings,media_authorization:"NOT_EVALUATED",sampling_authority:"NOT_EVALUATED",source_ref:"coverage:/input/metadata",source_sha256:sources.coverage};
    const content=new Map<string,string>([["summary.json",canonicalEvaluationJson(summary)+"\n"],["deviations.json",canonicalEvaluationJson(deviations)+"\n"],["provenance-audit.json",canonicalEvaluationJson(provenance)+"\n"]]);
    for(const [filename,rows] of tables)content.set(filename,csv(reportCsvColumns[filename as keyof typeof reportCsvColumns],rows));
    content.set("report.md",renderReport(input,summary,layouts,tables));
    const files=reportBundleFilenames.map(filename=>{const text=content.get(filename)!;ensure(typeof text==="string"&&!text.includes("{{"));const length=bytes(text);ensure(length<=reportBundleBounds.file_bytes);return {filename,media_type:filename.endsWith(".json")?"application/json" as const:filename.endsWith(".csv")?"text/csv" as const:"text/markdown" as const,content:text,byte_length:length,content_sha256:byteHash(text)};});ensure(files.reduce((total,file)=>total+file.byte_length,0)<=reportBundleBounds.total_file_bytes);
    const bundleHash=sha256EvaluationManifest({domain:"hair-evaluation-report-bundle-file-manifest",report_bundle_version:evaluationReportBundleVersion,report_id:input.report_id,run_id:plan.run_id,stage,files:files.map(({filename,media_type,byte_length,content_sha256})=>({filename,media_type,byte_length,content_sha256}))});
    return {input,result:{report_bundle_version:evaluationReportBundleVersion,template_id:evaluationReportTemplateId,report_id:input.report_id,run_id:plan.run_id,stage,input_sha256:sha256EvaluationManifest(input),statistical_report_sha256:input.statistical_report_sha256,bundle_sha256:bundleHash,status:"COMPLETE_METADATA_EXPORT",verdict:"INCOMPLETE",decision:"none",selected_configuration_id:null,files,live_quality_gate:"NOT_EVALUATED",release_gate:"NOT_EVALUATED",provider_selection:"NOT_EVALUATED",spending_authorization:"NOT_EVALUATED"}};
  });
}
type Layout=typeof reportLayouts.T1|typeof reportLayouts.P1;
function renderReport(input:EvaluationReportBundleInput,summary:{report_id:string;run_id:string;stage:string;gates:Gate[];missing_evidence:string[]},layout:Layout,tables:Map<string,Row[]>):string {
  const metric=input.statistical_report.input.metric_report,plan=metric.input.cost_report.input.bundle.plan,title=summary.stage==="T1"?"# T1 technical prototype confirmation report":"# P1 pilot release confirmation report";
  const lines=[title,"",`Template ID: ${evaluationReportTemplateId}. Protocol: hair-eval-v1. Scorecard: hair-scorecard-v1.`,"","INCOMPLETE. This export contains declared metadata diagnostics. No provider is selected, no live benchmark is cleared, and no spending is authorized. Actual viewing, qualification, execution, sampling and delivery remain unevaluated.","","All null cells indicate unavailable evidence. Declared rates and pointwise intervals are supplemental diagnostics; they do not establish the template gate requirements.",""];
  const table=(columns:readonly string[],rows:readonly (readonly string[])[])=>{lines.push(`| ${columns.join(" | ")} |`,`| ${columns.map(()=>"---").join(" | ")} |`,...rows.map(row=>`| ${row.join(" | ")} |`),"");};
  const common=(name:string)=>reportLayouts.T1.find(node=>node.heading.includes(name)&&node.tables.length>0)!.tables;
  for(const node of layout){lines.push(node.heading,"");const inherited=summary.stage==="P1"?node.heading.startsWith("## 2.")?[...common("Run integrity"),...common("Asset authorization")]:node.heading.startsWith("## 4.")?[...common("Human quality"),...common("Critical failures"),...common("Cohort results"),...common("Transformation and")]:node.heading.startsWith("## 5.")?common("Rater and adjudication"):node.heading.startsWith("## 7.")?common("Reliability, latency"):node.heading.startsWith("## 8.")?common("Automated-signal"):node.heading.startsWith("## 12.")?[...common("Deviations"),...common("Residual risks"),...common("Independent review")]:[]:[];
    for(const contract of [...inherited,...node.tables]){
      if(node.heading.includes("Blocking failures")){table(contract.columns,summary.gates.map(gate=>[`${gate.gate_id}${gate.configuration_id?` / ${gate.configuration_id}`:""}`,"INCOMPLETE","Trusted live authority or required evidence is missing.","Obtain trusted evidence and independent review before a decision."]));continue;}
      const rows=contract.rows.map(raw=>raw.map((value,index)=>{if(index===0)return value;if(contract.columns[index]==="Status"||(contract.columns[index]==="Check"&&value.includes("null (INCOMPLETE)")))return "INCOMPLETE";const label=raw[0]?.replace(/`/g,"")??"";if(index===1&&label==="Report ID")return input.report_id;if(index===1&&label==="Run ID")return plan.run_id;if(index===1&&label==="Report ID / run ID")return `${input.report_id} / ${plan.run_id}`;if(index===1&&label.startsWith("Overall"))return "INCOMPLETE";if(index===1&&label==="One-sentence basis")return "Trusted live provenance, execution, human review and release evidence remain incomplete.";if(index===1&&label==="Decision")return "none";if(index===1&&label==="Selected configuration")return "none";if(index===1&&label==="Code revision / dependency-lock hash")return `${input.declared_code_revision??"null"} / null (INCOMPLETE)`;if(index===1&&label==="Protocol / template / scorecard")return `hair-eval-v1 / ${evaluationReportTemplateId} / hair-scorecard-v1`;return value.includes("null (INCOMPLETE)")?"null (INCOMPLETE)":value;}));
      if(summary.stage==="T1"&&node.heading.startsWith("## 11.")){for(const config of plan.configurations){lines.push(`### Configuration ${config.configuration_id}`,"");table(contract.columns,rows.filter(row=>!row[0]!.includes("T1_OVERALL")));}table(contract.columns,rows.filter(row=>row[0]!.includes("T1_OVERALL")));}else table(contract.columns,rows.length?rows:[contract.columns.map(()=>"null (INCOMPLETE)")]);
    }
    if(node.heading.includes("Residual risks")||(summary.stage==="P1"&&node.heading.startsWith("## 12.")))table(["Risk","Evidence in this run","Severity","Mitigation before next stage","Owner"],["Missed identity drift","Weak cohorts","Unachievable service outcome","Mask growth or seams","Lighting and color uncertainty","Provider policy price or retention change","Removed screenshot labels","Unauthorized uploads"].map(risk=>[risk,"INCOMPLETE","null","Obtain trusted evidence before next stage","null"]));
    if(node.heading.includes("Decision and next evidence")||node.heading.startsWith("## 12.")&&summary.stage==="P1")lines.push("Decision: none. Selected configuration: none. Unsupported claims: live quality, production display, authenticated billing, complete inference and release readiness. Next evidence: complete trusted provenance, viewer/rater controls, software and independent review before any live decision.","");
  }
  lines.push("## Declared numerical diagnostics","","The following diagnostics retain their exact source scopes. Primary and reliability reruns remain separate. Provider cost includes all failures, retries and reruns; it is not verified fully loaded economics. Declared gate-passed output counts are not actual displayed counts.","");
  table(["Config","Population","Metric","Numerator","Denominator","Exact value","Declared percentage","95% pointwise interval (source units)","Declared status","Evidence"],tables.get("overall-metrics.csv")!.filter(row=>String(row.population).startsWith("primary:")).map(row=>[String(row.configuration_id),String(row.population),String(row.metric_id),String(row.numerator),String(row.denominator),String(row.value),row.unit==="ratio"?percentage(row.numerator??null,row.denominator??null):"null",row.ci95_low===null?"null":`${row.ci95_low}, ${row.ci95_high}`,String(row.status),`overall-metrics.csv#${row.row_id}`]));
  lines.push("Embedding execution: NOT_EVALUATED. Complete deviation history: INCOMPLETE. No source-controlled metadata proves absence of selective reruns, exclusions or blinding leaks.","","Missing evidence: "+summary.missing_evidence.join(", ")+".","");return lines.join("\n");
}
export function serializeEvaluationReportBundle(value:unknown):string {return safe(()=>{preflight(value,true);const raw=object(value,["input","result"]),rebuilt=exportEvaluationReportBundle(raw.input);exact(raw.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});}
