import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildH0CasePlan,
  canonicalEvaluationJson,
  deterministicInvocationOrder,
  deterministicRatingOrder,
  nearestRankPercentile,
  runH0AiPreflight,
  sha256EvaluationManifest,
} from "./benchmark";

describe("evaluation reproducibility primitives", () => {
  it("canonicalizes object keys before hashing", () => {
    const left = { z: [3, 2, 1], a: { enabled: true, value: "safe" } } as const;
    const right = { a: { value: "safe", enabled: true }, z: [3, 2, 1] } as const;

    expect(canonicalEvaluationJson(left)).toBe(
      '{"a":{"enabled":true,"value":"safe"},"z":[3,2,1]}',
    );
    expect(sha256EvaluationManifest(left)).toBe(sha256EvaluationManifest(right));
    expect(sha256EvaluationManifest(left)).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    { unsafe: { value: Number.NaN }, message: /non-finite/ },
    { unsafe: { value: undefined }, message: /undefined/ },
    { unsafe: new Date("2026-01-01T00:00:00.000Z"), message: /plain JSON/ },
  ])("refuses a non-canonical manifest value", ({ unsafe, message }) => {
    expect(() => canonicalEvaluationJson(unsafe as never)).toThrow(message);
  });

  it("uses deterministic protocol ordering without mutating inputs", () => {
    const inputs = [
      { caseId: "case-003", configurationId: "config-a", repetition: 1 },
      { caseId: "case-001", configurationId: "config-a", repetition: 0 },
      { caseId: "case-002", configurationId: "config-b", repetition: 0 },
    ] as const;

    const first = deterministicInvocationOrder("run-001", inputs);
    const second = deterministicInvocationOrder("run-001", inputs);

    expect(first).toEqual(second);
    expect(inputs.map((item) => item.caseId)).toEqual(["case-003", "case-001", "case-002"]);
    expect(new Set(first.map((item) => item.caseId))).toEqual(
      new Set(inputs.map((item) => item.caseId)),
    );
  });

  it("makes blinded rating order stable per pseudonymous rater", () => {
    const outputs = [
      { outputId: "output-003" },
      { outputId: "output-001" },
      { outputId: "output-002" },
    ];

    expect(deterministicRatingOrder("run-001", "rater-001", outputs)).toEqual(
      deterministicRatingOrder("run-001", "rater-001", outputs),
    );
    expect(deterministicRatingOrder("run-001", "rater-001", outputs)).not.toEqual(
      deterministicRatingOrder("run-001", "rater-002", outputs),
    );
  });

  it("calculates nearest-rank percentiles without interpolation", () => {
    const values = [9, 1, 4, 2, 7];
    expect(nearestRankPercentile(values, 0.5)).toBe(4);
    expect(nearestRankPercentile(values, 0.9)).toBe(9);
    expect(nearestRankPercentile([], 0.95)).toBeNull();
    expect(() => nearestRankPercentile(values, 0)).toThrow(/Percentile/);
    expect(() => nearestRankPercentile([1, -1], 0.5)).toThrow(/non-negative/);
  });
});

describe("H0 AI evaluation preflight", () => {
  const input = {
    runId: "h0-run-001",
    createdAtUtc: "2026-10-01T00:00:00.000Z",
  } as const;

  it("builds 32 cases across eight synthetic subjects and every fake scenario", () => {
    const plan = buildH0CasePlan(input.runId);

    expect(plan).toHaveLength(32);
    expect(new Set(plan.map((item) => item.subjectId))).toHaveLength(8);
    expect(new Set(plan.map((item) => item.scenario))).toEqual(
      new Set([
        "success",
        "partial",
        "policy_rejection",
        "timeout",
        "rate_limited",
        "provider_error",
      ]),
    );
    for (const subjectId of new Set(plan.map((item) => item.subjectId))) {
      expect(plan.filter((item) => item.subjectId === subjectId)).toHaveLength(4);
    }
  });

  it("produces a deterministic, content-free aggregate report", async () => {
    const first = await runH0AiPreflight(input);
    const second = await runH0AiPreflight(input);
    const golden = JSON.parse(
      readFileSync(
        new URL("../../../tests/evals/h0-ai-preflight.golden.json", import.meta.url),
        "utf8",
      ),
    ) as unknown;

    expect(first).toEqual(second);
    expect(first).toEqual(golden);
    expect(first).toMatchObject({
      scope: "ai_evaluation_harness",
      stage: "H0",
      case_count: 32,
      subject_count: 8,
      outcome_counts: {
        succeeded: 12,
        failed: 12,
        rejected: 4,
        timed_out: 4,
      },
      requested_slots: 32,
      completed_slots: 12,
      completion_rate: 0.375,
      latency_ms: { p50: 30, p90: 32, p95: 32 },
      total_estimated_cost_usd: 0,
      verdict: "PASS",
    });
    expect(first.checks.every((check) => check.status === "PASS")).toBe(true);
    expect(first.plan_sha256).toMatch(/^[a-f0-9]{64}$/);

    const serialized = canonicalEvaluationJson(first);
    expect(serialized).not.toMatch(
      /(?:https?:\/\/|file:|[A-Za-z]:[\\/]|signed|portrait\.(?:jpg|png)|api[_-]?key)/i,
    );
  });
});
