import {
  canonicalEvaluationJson,
  evaluationProtocolId,
  h0HarnessVersion,
  sha256EvaluationManifest,
  type H0PreflightReport,
} from "./benchmark";

export const h0LedgerVersion = "hair-h0-ledger-v2";

export const h0CheckDefinitions = [
  { check_id: "AI_RUNNER_PREFLIGHT", scope: "ai_runner" },
  { check_id: "SERVICE_IDEMPOTENCY", scope: "service_job" },
  { check_id: "SERVICE_DUPLICATE_CALLBACK", scope: "service_job" },
  { check_id: "SERVICE_LATE_CALLBACK", scope: "service_job" },
  { check_id: "JOB_CANCELLATION_TRANSITION", scope: "job_contract" },
  { check_id: "SERVICE_PARTIAL_SUCCESS", scope: "service_job" },
  { check_id: "SERVICE_RETRY", scope: "service_job" },
  { check_id: "SERVICE_EXPIRY", scope: "service_retention" },
  { check_id: "SERVICE_VERIFIED_DELETION", scope: "service_retention" },
] as const;

export type H0CheckId = (typeof h0CheckDefinitions)[number]["check_id"];
export type H0CheckScope = (typeof h0CheckDefinitions)[number]["scope"];

export interface H0CheckEvidence {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly ledger_version: typeof h0LedgerVersion;
  readonly run_id: string;
  readonly check_id: H0CheckId;
  readonly scope: H0CheckScope;
  readonly fixture_id: string;
  readonly executed_at_utc: string;
  readonly status: "PASS" | "FAIL";
  readonly observations: Readonly<Record<string, ObservationValue>>;
  readonly evidence_sha256: string;
}

export interface H0CheckLedger {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly ledger_version: typeof h0LedgerVersion;
  readonly harness_version: typeof h0HarnessVersion;
  readonly scope: "credential_free_content_free_h0";
  readonly ledger_id: string;
  readonly run_id: string;
  readonly created_at_utc: string;
  readonly inputs_sha256: string;
  readonly verdict: "H0_PASS" | "H0_FAIL";
  readonly technical_image_gate_status: "NOT_EVALUATED";
  readonly live_evidence_present: false;
  readonly excluded_evidence: readonly [
    "live_provider",
    "image_quality",
    "asset_registry_enforcement",
    "provider_spend",
  ];
  readonly checks: readonly H0CheckEvidence[];
  readonly missing_check_ids: readonly H0CheckId[];
  readonly invalid_check_ids: readonly H0CheckId[];
}

type ObservationValue = boolean | number | string;

const safeId = /^[a-z0-9][a-z0-9._-]{2,95}$/i;
const canonicalInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const hash = /^[a-f0-9]{64}$/;
const evidenceKeys = new Set([
  "schema_version", "protocol_id", "ledger_version", "run_id", "check_id", "scope",
  "fixture_id", "executed_at_utc", "status", "observations", "evidence_sha256",
]);
const aiPreflightCheckIds = new Set([
  "H0_CASE_COUNT", "H0_SUBJECT_COUNT", "H0_REQUIRED_SCENARIOS", "H0_EXPECTED_OUTCOMES",
  "H0_INVOCATION_ORDER", "H0_RATING_ORDER", "H0_MANIFEST_LINKAGE",
]);

function isCanonicalInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!canonicalInstant.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

type ObservationRule = "boolean" | "count" | "hash" | readonly string[];
const observationSchemas: Readonly<Record<H0CheckId, Readonly<Record<string, ObservationRule>>>> = {
  AI_RUNNER_PREFLIGHT: {
    report_sha256: "hash", plan_sha256: "hash", case_count: "count", subject_count: "count",
    requested_slots: "count", completed_slots: "count",
    h0_case_count: "boolean", h0_subject_count: "boolean", h0_required_scenarios: "boolean",
    h0_expected_outcomes: "boolean", h0_invocation_order: "boolean", h0_rating_order: "boolean",
    h0_manifest_linkage: "boolean",
  },
  SERVICE_IDEMPOTENCY: { replay_equal: "boolean", requested_variants: "count" },
  SERVICE_DUPLICATE_CALLBACK: {
    replay_equal: "boolean", terminal_state: ["ready", "failed", "rejected", "canceled"],
    assets_unchanged: "boolean", jobs_unchanged: "boolean", variant_unchanged: "boolean",
  },
  SERVICE_LATE_CALLBACK: { denied: "boolean", remaining_assets: "count" },
  JOB_CANCELLATION_TRANSITION: { running_to_canceled: "boolean", canceled_to_retry: "boolean" },
  SERVICE_PARTIAL_SUCCESS: { ready_count: "count", failed_count: "count" },
  SERVICE_RETRY: { attempt_number: "count", retry_state: ["running", "queued", "failed"] },
  SERVICE_EXPIRY: {
    access_denied: "boolean", receipt_state: ["verified", "pending", "failed"], remaining_assets: "count",
  },
  SERVICE_VERIFIED_DELETION: {
    receipt_state: ["verified", "pending", "failed"], verified_components: "count", remaining_assets: "count",
  },
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
    Reflect.ownKeys(value).every((key) => typeof key === "string" &&
      Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
      "value" in (Object.getOwnPropertyDescriptor(value, key) ?? {}));
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isPlainRecord(value) && Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && safeId.test(value) && !value.includes("..") &&
    !/\.(?:jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif|svg|mp4|mov|mp3|wav)$/i.test(value);
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && hash.test(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function observationsAreValid(checkId: H0CheckId, value: unknown): value is Readonly<Record<string, ObservationValue>> {
  const schema = observationSchemas[checkId];
  return hasExactKeys(value, Object.keys(schema)) && Object.entries(schema).every(([key, rule]) => {
    const observed = value[key];
    if (rule === "boolean") return typeof observed === "boolean";
    if (rule === "count") return isCount(observed);
    if (rule === "hash") return isHash(observed);
    return typeof observed === "string" && rule.includes(observed);
  });
}

function evidenceDigest(record: Omit<H0CheckEvidence, "evidence_sha256">): string {
  return sha256EvaluationManifest(record);
}

function definition(checkId: H0CheckId) {
  return h0CheckDefinitions.find((item) => item.check_id === checkId);
}

function assertCommon(input: {
  readonly run_id: string;
  readonly fixture_id: string;
  readonly executed_at_utc: string;
}): void {
  if (!isSafeId(input.run_id) || !isSafeId(input.fixture_id)) {
    throw new TypeError("H0 evidence identifiers must be bounded opaque identifiers.");
  }
  if (
    !isCanonicalInstant(input.executed_at_utc)
  ) {
    throw new TypeError("H0 evidence time must be a canonical UTC instant.");
  }
}

export function createH0CheckEvidence(input: {
  readonly run_id: string;
  readonly check_id: Exclude<H0CheckId, "AI_RUNNER_PREFLIGHT">;
  readonly fixture_id: string;
  readonly executed_at_utc: string;
  readonly passed: boolean;
  readonly observations: Readonly<Record<string, ObservationValue>>;
}): H0CheckEvidence {
  if (!hasExactKeys(input, ["run_id", "check_id", "fixture_id", "executed_at_utc", "passed", "observations"])) {
    throw new TypeError("Invalid H0 evidence input.");
  }
  assertCommon(input);
  const expected = definition(input.check_id);
  if (expected === undefined || input.check_id === ("AI_RUNNER_PREFLIGHT" as string)) {
    throw new TypeError("Unknown service H0 check ID.");
  }
  if (typeof input.passed !== "boolean" || !observationsAreValid(input.check_id, input.observations)) {
    throw new TypeError("H0 observations must be bounded, content-free primitives.");
  }
  const envelope: Omit<H0CheckEvidence, "evidence_sha256"> = {
    schema_version: "1.0.0",
    protocol_id: evaluationProtocolId,
    ledger_version: h0LedgerVersion,
    run_id: input.run_id,
    check_id: input.check_id,
    scope: expected.scope,
    fixture_id: input.fixture_id,
    executed_at_utc: input.executed_at_utc,
    status: input.passed ? "PASS" : "FAIL",
    observations: { ...input.observations },
  };
  return { ...envelope, evidence_sha256: evidenceDigest(envelope) };
}

export function createAiRunnerH0Evidence(
  report: H0PreflightReport,
  fixtureId: string,
): H0CheckEvidence {
  const reportKeys = [
    "schema_version", "protocol_id", "harness_version", "scope", "stage", "report_id", "run_id",
    "created_at_utc", "plan_sha256", "case_count", "subject_count", "outcome_counts", "requested_slots",
    "completed_slots", "completion_rate", "latency_ms", "total_estimated_cost_usd", "checks", "verdict",
  ];
  const observedPatterns: Readonly<Record<string, RegExp>> = {
    H0_CASE_COUNT: /^\d{1,4}\/32 cases$/,
    H0_SUBJECT_COUNT: /^\d{1,4}\/8 synthetic subjects$/,
    H0_REQUIRED_SCENARIOS: /^\d{1,4}\/6 fake scenarios$/,
    H0_EXPECTED_OUTCOMES: /^\d{1,4} outcome mismatches$/,
    H0_INVOCATION_ORDER: /^SHA-256 [a-f0-9]{64}$/,
    H0_RATING_ORDER: /^\d{1,4} opaque outputs ordered$/,
    H0_MANIFEST_LINKAGE: /^\d{1,4}\/\d{1,4} manifests linked$/,
  };
  if (
    !hasExactKeys(report, reportKeys) || report.schema_version !== "1.0.0" ||
    report.protocol_id !== evaluationProtocolId || report.harness_version !== h0HarnessVersion ||
    report.scope !== "ai_evaluation_harness" || report.stage !== "H0" || !isSafeId(report.report_id) ||
    !isHash(report.plan_sha256) || !isCount(report.case_count) || !isCount(report.subject_count) ||
    !isCount(report.requested_slots) || !isCount(report.completed_slots) ||
    typeof report.completion_rate !== "number" || !Number.isFinite(report.completion_rate) ||
    report.completion_rate < 0 || report.completion_rate > 1 ||
    typeof report.total_estimated_cost_usd !== "number" || !Number.isFinite(report.total_estimated_cost_usd) ||
    report.total_estimated_cost_usd < 0 ||
    !hasExactKeys(report.outcome_counts, ["succeeded", "failed", "rejected", "timed_out"]) ||
    !Object.values(report.outcome_counts).every(isCount) ||
    !hasExactKeys(report.latency_ms, ["p50", "p90", "p95"]) ||
    !Object.values(report.latency_ms).every((value) => value === null ||
      (typeof value === "number" && Number.isFinite(value) && value >= 0)) ||
    !Array.isArray(report.checks) || report.checks.length > aiPreflightCheckIds.size ||
    Object.keys(report.checks).length !== report.checks.length ||
    !Array.from(report.checks).every((item) =>
      hasExactKeys(item, ["check_id", "status", "observed"]) &&
      typeof item.check_id === "string" && aiPreflightCheckIds.has(item.check_id) &&
      (item.status === "PASS" || item.status === "FAIL") && typeof item.observed === "string" &&
      observedPatterns[item.check_id]?.test(item.observed) === true) ||
    (report.verdict !== "PASS" && report.verdict !== "FAIL")
  ) throw new TypeError("Invalid content-free H0 AI report.");
  assertCommon({
    run_id: report.run_id,
    fixture_id: fixtureId,
    executed_at_utc: report.created_at_utc,
  });
  const observations: Record<string, ObservationValue> = {
    report_sha256: sha256EvaluationManifest(report), plan_sha256: report.plan_sha256,
    case_count: report.case_count, subject_count: report.subject_count,
    requested_slots: report.requested_slots, completed_slots: report.completed_slots,
  };
  for (const checkId of aiPreflightCheckIds) {
    const matches = report.checks.filter((item) => item.check_id === checkId);
    observations[checkId.toLowerCase()] = matches.length === 1 && matches[0]?.status === "PASS";
  }
  const envelope: Omit<H0CheckEvidence, "evidence_sha256"> = {
    schema_version: "1.0.0",
    protocol_id: evaluationProtocolId,
    ledger_version: h0LedgerVersion,
    run_id: report.run_id,
    check_id: "AI_RUNNER_PREFLIGHT",
    scope: "ai_runner",
    fixture_id: fixtureId,
    executed_at_utc: report.created_at_utc,
    status:
      report.protocol_id === evaluationProtocolId &&
      report.harness_version === h0HarnessVersion &&
      report.scope === "ai_evaluation_harness" &&
      report.stage === "H0" &&
      report.verdict === "PASS" &&
      report.case_count === 32 &&
      report.subject_count === 8 &&
      report.requested_slots === 32 &&
      report.completed_slots === report.outcome_counts.succeeded &&
      report.completed_slots <= report.requested_slots &&
      Object.values(report.outcome_counts).reduce((sum, count) => sum + count, 0) === report.case_count &&
      report.completion_rate === report.completed_slots / report.requested_slots &&
      report.checks.length === aiPreflightCheckIds.size &&
      [...aiPreflightCheckIds].every((checkId) => observations[checkId.toLowerCase()] === true)
        ? "PASS"
        : "FAIL",
    observations,
  };
  return { ...envelope, evidence_sha256: evidenceDigest(envelope) };
}

function assertEvidenceSchema(value: unknown): asserts value is H0CheckEvidence {
  if (!hasExactKeys(value, [...evidenceKeys])) throw new TypeError("Invalid content-free H0 evidence.");
  const checkId = value.check_id as H0CheckId;
  const expected = definition(checkId);
  if (
    value.schema_version !== "1.0.0" || value.protocol_id !== evaluationProtocolId ||
    value.ledger_version !== h0LedgerVersion || !isSafeId(value.run_id) || expected === undefined ||
    value.scope !== expected.scope || !isSafeId(value.fixture_id) ||
    !isCanonicalInstant(value.executed_at_utc) || !isHash(value.evidence_sha256) ||
    (value.status !== "PASS" && value.status !== "FAIL") || !observationsAreValid(checkId, value.observations)
  ) throw new TypeError("Invalid content-free H0 evidence.");
}

function evidenceIsValid(record: H0CheckEvidence, runId: string): boolean {
  const expected = definition(record.check_id);
  const { evidence_sha256: digest, ...envelope } = record;
  return (
    typeof record === "object" &&
    record !== null &&
    Reflect.ownKeys(record).length === evidenceKeys.size &&
    Reflect.ownKeys(record).every((key) => typeof key === "string" && evidenceKeys.has(key)) &&
    record.schema_version === "1.0.0" &&
    record.protocol_id === evaluationProtocolId &&
    record.ledger_version === h0LedgerVersion &&
    record.run_id === runId &&
    expected !== undefined &&
    record.scope === expected.scope &&
    safeId.test(record.fixture_id) &&
    isCanonicalInstant(record.executed_at_utc) &&
    digest === evidenceDigest(envelope) &&
    (record.status === "PASS" || record.status === "FAIL")
  );
}

export function buildH0CheckLedger(input: {
  readonly run_id: string;
  readonly created_at_utc: string;
  readonly evidence: readonly H0CheckEvidence[];
}): H0CheckLedger {
  if (!hasExactKeys(input, ["run_id", "created_at_utc", "evidence"]) ||
    !Array.isArray(input.evidence) || input.evidence.length > h0CheckDefinitions.length * 2 ||
    Object.keys(input.evidence).length !== input.evidence.length) {
    throw new TypeError("Invalid content-free H0 ledger input.");
  }
  assertCommon({
    run_id: input.run_id,
    fixture_id: "h0-ledger-fixture",
    executed_at_utc: input.created_at_utc,
  });
  Array.from(input.evidence).forEach(assertEvidenceSchema);
  const counts = new Map<H0CheckId, number>();
  input.evidence.forEach((item) => counts.set(item.check_id, (counts.get(item.check_id) ?? 0) + 1));
  const missingCheckIds = h0CheckDefinitions
    .filter((item) => (counts.get(item.check_id) ?? 0) === 0)
    .map((item) => item.check_id);
  const invalidCheckIds = h0CheckDefinitions
    .filter((item) => {
      const matches = input.evidence.filter((record) => record.check_id === item.check_id);
      return (
        matches.length !== 1 ||
        !evidenceIsValid(matches[0] as H0CheckEvidence, input.run_id) ||
        matches[0]?.status !== "PASS"
      );
    })
    .map((item) => item.check_id);
  const checks = input.evidence.map((item) => ({ ...item, observations: { ...item.observations } })).sort((left, right) =>
    left.check_id < right.check_id ? -1 : left.check_id > right.check_id ? 1 : 0,
  );
  const inputsSha256 = sha256EvaluationManifest(checks);
  const verdict =
    missingCheckIds.length === 0 &&
    invalidCheckIds.length === 0 &&
    checks.length === h0CheckDefinitions.length
      ? "H0_PASS"
      : "H0_FAIL";

  return {
    schema_version: "1.0.0",
    protocol_id: evaluationProtocolId,
    ledger_version: h0LedgerVersion,
    harness_version: h0HarnessVersion,
    scope: "credential_free_content_free_h0",
    ledger_id: `h0-ledger-${inputsSha256.slice(0, 16)}`,
    run_id: input.run_id,
    created_at_utc: input.created_at_utc,
    inputs_sha256: inputsSha256,
    verdict,
    technical_image_gate_status: "NOT_EVALUATED",
    live_evidence_present: false,
    excluded_evidence: [
      "live_provider",
      "image_quality",
      "asset_registry_enforcement",
      "provider_spend",
    ],
    checks,
    missing_check_ids: missingCheckIds,
    invalid_check_ids: invalidCheckIds,
  };
}

export function serializeH0Ledger(ledger: H0CheckLedger): string {
  const keys = [
    "schema_version", "protocol_id", "ledger_version", "harness_version", "scope", "ledger_id", "run_id",
    "created_at_utc", "inputs_sha256", "verdict", "technical_image_gate_status", "live_evidence_present",
    "excluded_evidence", "checks", "missing_check_ids", "invalid_check_ids",
  ];
  const safeCheckList = (value: unknown): boolean => Array.isArray(value) &&
    value.length <= h0CheckDefinitions.length && Object.keys(value).length === value.length &&
    Array.from(value).every((id) => typeof id === "string" && h0CheckDefinitions.some((item) => item.check_id === id));
  if (!hasExactKeys(ledger, keys) || ledger.schema_version !== "1.0.0" ||
    ledger.protocol_id !== evaluationProtocolId || ledger.ledger_version !== h0LedgerVersion ||
    ledger.harness_version !== h0HarnessVersion || ledger.scope !== "credential_free_content_free_h0" ||
    typeof ledger.ledger_id !== "string" || !/^h0-ledger-[a-f0-9]{16}$/.test(ledger.ledger_id) ||
    !isHash(ledger.inputs_sha256) || (ledger.verdict !== "H0_PASS" && ledger.verdict !== "H0_FAIL") ||
    ledger.technical_image_gate_status !== "NOT_EVALUATED" || ledger.live_evidence_present !== false ||
    !Array.isArray(ledger.excluded_evidence) || Object.keys(ledger.excluded_evidence).length !== 4 ||
    ledger.excluded_evidence.length !== 4 ||
    !["live_provider", "image_quality", "asset_registry_enforcement", "provider_spend"]
      .every((value, index) => ledger.excluded_evidence[index] === value) ||
    !safeCheckList(ledger.missing_check_ids) || !safeCheckList(ledger.invalid_check_ids)) {
    throw new TypeError("Invalid content-free H0 ledger.");
  }
  const rebuilt = buildH0CheckLedger({
    run_id: ledger.run_id, created_at_utc: ledger.created_at_utc, evidence: ledger.checks,
  });
  if (canonicalEvaluationJson(ledger) !== canonicalEvaluationJson(rebuilt)) {
    throw new TypeError("H0 ledger integrity mismatch.");
  }
  return canonicalEvaluationJson(rebuilt);
}
