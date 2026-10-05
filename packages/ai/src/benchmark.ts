import { createHash } from "node:crypto";

import { defaultHairSpecification } from "@hair/domain";

import { runEvaluation } from "./evaluation";
import {
  FakeHairstyleImageProvider,
  type FakeProviderScenario,
} from "./fake-provider";
import type { EditStrategy, EvaluationRunManifest } from "./provider";

export const evaluationProtocolId = "hair-eval-v1";
export const h0HarnessVersion = "hair-h0-ai-v1";

function canonicalize(value: unknown, location = "$"): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${location} must not contain a non-finite number.`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => canonicalize(item, `${location}[${index}]`)).join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${location} must contain only plain JSON objects.`);
    }
    if (Reflect.ownKeys(value).length !== Object.keys(value).length) {
      throw new TypeError(`${location} must not contain symbol or hidden properties.`);
    }
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries
      .map(([key, item]) => {
        if (item === undefined) {
          throw new TypeError(`${location}.${key} must not be undefined.`);
        }
        return `${JSON.stringify(key)}:${canonicalize(item, `${location}.${key}`)}`;
      })
      .join(",")}}`;
  }
  throw new TypeError(`${location} must contain only JSON values.`);
}

/** Canonical JSON used for immutable evaluation-manifest hashes. */
export function canonicalEvaluationJson(value: unknown): string {
  return canonicalize(value);
}

export function sha256EvaluationManifest(value: unknown): string {
  return createHash("sha256").update(canonicalEvaluationJson(value)).digest("hex");
}

export function evaluationOrderingKey(parts: readonly string[]): string {
  if (parts.length === 0 || parts.some((part) => part.length === 0 || part.includes("|"))) {
    throw new TypeError("Evaluation ordering parts must be non-empty and cannot contain '|'.");
  }
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function nearestRankPercentile(
  values: readonly number[],
  percentile: number,
): number | null {
  if (values.length === 0) return null;
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 1) {
    throw new RangeError("Percentile must be greater than 0 and no greater than 1.");
  }
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError("Percentile values must be finite and non-negative.");
  }
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentile * ordered.length) - 1;
  return ordered[index] ?? null;
}

export interface InvocationOrderItem {
  readonly caseId: string;
  readonly configurationId: string;
  readonly repetition: number;
}

export function deterministicInvocationOrder<T extends InvocationOrderItem>(
  runId: string,
  items: readonly T[],
): readonly T[] {
  const identities = items.map((item) => {
    if (!Number.isInteger(item.repetition) || item.repetition < 0) {
      throw new TypeError("Evaluation repetition must be a non-negative integer.");
    }
    return `${item.caseId}|${item.configurationId}|${item.repetition}`;
  });
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("Invocation order contains a duplicate case/configuration/repetition tuple.");
  }
  return [...items].sort((left, right) => {
    const leftKey = evaluationOrderingKey([
      evaluationProtocolId,
      runId,
      left.caseId,
      left.configurationId,
      String(left.repetition),
    ]);
    const rightKey = evaluationOrderingKey([
      evaluationProtocolId,
      runId,
      right.caseId,
      right.configurationId,
      String(right.repetition),
    ]);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : left.caseId < right.caseId ? -1 : 1;
  });
}

export interface RatingOrderItem {
  readonly outputId: string;
}

export function deterministicRatingOrder<T extends RatingOrderItem>(
  runId: string,
  raterPseudonym: string,
  items: readonly T[],
): readonly T[] {
  if (new Set(items.map((item) => item.outputId)).size !== items.length) {
    throw new TypeError("Rating order contains a duplicate output ID.");
  }
  return [...items].sort((left, right) => {
    const leftKey = evaluationOrderingKey([runId, raterPseudonym, left.outputId]);
    const rightKey = evaluationOrderingKey([runId, raterPseudonym, right.outputId]);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : left.outputId < right.outputId ? -1 : 1;
  });
}

type H0ExpectedOutcome = EvaluationRunManifest["outcome"];

export interface H0CasePlan extends InvocationOrderItem {
  readonly subjectId: string;
  readonly sourceAssetId: string;
  readonly requestId: string;
  readonly variantIndex: number;
  readonly scenario: FakeProviderScenario;
  readonly expectedOutcome: H0ExpectedOutcome;
  readonly strategy: EditStrategy;
}

const scenarios: readonly FakeProviderScenario[] = [
  "partial",
  "partial",
  "partial",
  "success",
  "policy_rejection",
  "timeout",
  "provider_error",
  "rate_limited",
];
const strategies: readonly EditStrategy[] = [
  "prompt-only",
  "hair-mask",
  "protected-composite",
];

function expectedOutcome(
  scenario: FakeProviderScenario,
  variantIndex: number,
): H0ExpectedOutcome {
  if (scenario === "success" || (scenario === "partial" && variantIndex !== 2)) {
    return "succeeded";
  }
  if (scenario === "policy_rejection") return "rejected";
  if (scenario === "timeout") return "timed_out";
  return "failed";
}

/** Eight synthetic subjects and 32 deterministic, content-free H0 cases. */
export function buildH0CasePlan(runId: string): readonly H0CasePlan[] {
  const cases = Array.from({ length: 32 }, (_, index) => {
    const subjectIndex = Math.floor(index / 4) + 1;
    const variantIndex = index < 3 ? index : index % 3;
    const scenario = scenarios[index % scenarios.length] ?? "success";
    const serial = String(index + 1).padStart(3, "0");
    const subjectSerial = String(subjectIndex).padStart(3, "0");
    return {
      caseId: `h0-case-${serial}`,
      configurationId: `h0-fake-${scenario.replaceAll("_", "-")}`,
      repetition: 0,
      subjectId: `h0-subject-${subjectSerial}`,
      sourceAssetId: `synthetic-adult-${subjectSerial}`,
      requestId: `h0-request-${serial}`,
      variantIndex,
      scenario,
      expectedOutcome: expectedOutcome(scenario, variantIndex),
      strategy: strategies[index % strategies.length] ?? "prompt-only",
    } satisfies H0CasePlan;
  });
  return deterministicInvocationOrder(runId, cases);
}

export interface H0Check {
  readonly check_id: string;
  readonly status: "PASS" | "FAIL";
  readonly observed: string;
}

export interface H0PreflightReport {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly harness_version: typeof h0HarnessVersion;
  readonly scope: "ai_evaluation_harness";
  readonly stage: "H0";
  readonly report_id: string;
  readonly run_id: string;
  readonly created_at_utc: string;
  readonly plan_sha256: string;
  readonly case_count: number;
  readonly subject_count: number;
  readonly outcome_counts: Readonly<Record<H0ExpectedOutcome, number>>;
  readonly requested_slots: number;
  readonly completed_slots: number;
  readonly completion_rate: number;
  readonly latency_ms: Readonly<{ p50: number | null; p90: number | null; p95: number | null }>;
  readonly total_estimated_cost_usd: number;
  readonly checks: readonly H0Check[];
  readonly verdict: "PASS" | "FAIL";
}

function countOutcomes(
  manifests: readonly EvaluationRunManifest[],
): Record<H0ExpectedOutcome, number> {
  const counts: Record<H0ExpectedOutcome, number> = {
    succeeded: 0,
    failed: 0,
    rejected: 0,
    timed_out: 0,
  };
  manifests.forEach((manifest) => {
    counts[manifest.outcome] += 1;
  });
  return counts;
}

function check(checkId: string, passed: boolean, observed: string): H0Check {
  return { check_id: checkId, status: passed ? "PASS" : "FAIL", observed };
}

/**
 * Runs the AI-package portion of H0. Service-level duplicate callback,
 * cancellation, retry, and late-callback checks remain separate evidence.
 */
export async function runH0AiPreflight(input: {
  readonly runId: string;
  readonly createdAtUtc: string;
}): Promise<H0PreflightReport> {
  const plan = buildH0CasePlan(input.runId);
  const planSha256 = sha256EvaluationManifest(plan);
  const manifests: EvaluationRunManifest[] = [];

  for (const item of plan) {
    let clockReads = 0;
    const failureDuration = 30 + item.variantIndex;
    const manifest = await runEvaluation({
      runId: input.runId,
      caseId: item.caseId,
      request: {
        requestId: item.requestId,
        sourceAssetId: item.sourceAssetId,
        specification: defaultHairSpecification,
        strategy: item.strategy,
        quality: "medium",
        promptVersion: "hair-h0-v1",
        idempotencyKey: `${item.caseId}:${item.variantIndex}:hair-h0-v1`,
      },
      provider: new FakeHairstyleImageProvider(item.scenario, 25 + item.variantIndex),
      providerModel: "deterministic-v1",
      providerSettings: { fixtureScenario: item.scenario, seed: item.variantIndex },
      startedAt: input.createdAtUtc,
      now: () => (clockReads++ === 0 ? 0 : failureDuration),
    });
    manifests.push(manifest);
  }

  const subjectCount = new Set(plan.map((item) => item.subjectId)).size;
  const outcomeCounts = countOutcomes(manifests);
  const outcomeMismatches = manifests.filter(
    (manifest) =>
      manifest.outcome !== plan.find((item) => item.caseId === manifest.caseId)?.expectedOutcome,
  );
  const completedSlots = outcomeCounts.succeeded;
  const durations = manifests.map((manifest) => manifest.durationMs);
  const totalEstimatedCostUsd = manifests.reduce(
    (sum, manifest) => sum + (manifest.usage?.estimatedCostUsd ?? 0),
    0,
  );
  const ratingOutputs = manifests
    .filter((manifest) => manifest.outputAssetId !== undefined)
    .map((manifest) => ({ outputId: manifest.outputAssetId as string }));
  const ratingOrder = deterministicRatingOrder(input.runId, "rater-h0-001", ratingOutputs);
  const checks = [
    check("H0_CASE_COUNT", plan.length === 32, `${plan.length}/32 cases`),
    check("H0_SUBJECT_COUNT", subjectCount === 8, `${subjectCount}/8 synthetic subjects`),
    check(
      "H0_REQUIRED_SCENARIOS",
      new Set(plan.map((item) => item.scenario)).size === new Set(scenarios).size,
      `${new Set(plan.map((item) => item.scenario)).size}/${new Set(scenarios).size} fake scenarios`,
    ),
    check(
      "H0_EXPECTED_OUTCOMES",
      outcomeMismatches.length === 0,
      `${outcomeMismatches.length} outcome mismatches`,
    ),
    check(
      "H0_INVOCATION_ORDER",
      canonicalEvaluationJson(plan) === canonicalEvaluationJson(buildH0CasePlan(input.runId)),
      `SHA-256 ${planSha256}`,
    ),
    check(
      "H0_RATING_ORDER",
      canonicalEvaluationJson(ratingOrder) ===
        canonicalEvaluationJson(
          deterministicRatingOrder(input.runId, "rater-h0-001", ratingOutputs),
        ),
      `${ratingOrder.length} opaque outputs ordered`,
    ),
    check(
      "H0_MANIFEST_LINKAGE",
      manifests.every((manifest) => plan.some((item) => item.caseId === manifest.caseId)),
      `${manifests.length}/${plan.length} manifests linked`,
    ),
  ] as const;
  const verdict = checks.every((item) => item.status === "PASS") ? "PASS" : "FAIL";

  return {
    schema_version: "1.0.0",
    protocol_id: evaluationProtocolId,
    harness_version: h0HarnessVersion,
    scope: "ai_evaluation_harness",
    stage: "H0",
    report_id: `h0-report-${planSha256.slice(0, 16)}`,
    run_id: input.runId,
    created_at_utc: input.createdAtUtc,
    plan_sha256: planSha256,
    case_count: plan.length,
    subject_count: subjectCount,
    outcome_counts: outcomeCounts,
    requested_slots: plan.length,
    completed_slots: completedSlots,
    completion_rate: completedSlots / plan.length,
    latency_ms: {
      p50: nearestRankPercentile(durations, 0.5),
      p90: nearestRankPercentile(durations, 0.9),
      p95: nearestRankPercentile(durations, 0.95),
    },
    total_estimated_cost_usd: totalEstimatedCostUsd,
    checks,
    verdict,
  };
}
