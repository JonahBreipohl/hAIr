import { describe, expect, it } from "vitest";

import { runH0AiPreflight, sha256EvaluationManifest, type H0PreflightReport } from "./benchmark";
import {
  buildH0CheckLedger,
  createAiRunnerH0Evidence,
  createH0CheckEvidence,
  h0CheckDefinitions,
  serializeH0Ledger,
  type H0CheckEvidence,
  type H0CheckId,
} from "./h0-ledger";

const runId = "h0-ledger-run-001";
const createdAt = "2026-10-01T08:00:00.000Z";
const serviceObservations = {
  SERVICE_IDEMPOTENCY: { replay_equal: true, requested_variants: 2 },
  SERVICE_DUPLICATE_CALLBACK: { replay_equal: true, terminal_state: "ready", assets_unchanged: true, jobs_unchanged: true, variant_unchanged: true },
  SERVICE_LATE_CALLBACK: { denied: true, remaining_assets: 0 },
  JOB_CANCELLATION_TRANSITION: { running_to_canceled: true, canceled_to_retry: true },
  SERVICE_PARTIAL_SUCCESS: { ready_count: 1, failed_count: 1 },
  SERVICE_RETRY: { attempt_number: 2, retry_state: "running" },
  SERVICE_EXPIRY: { access_denied: true, receipt_state: "verified", remaining_assets: 0 },
  SERVICE_VERIFIED_DELETION: { receipt_state: "verified", verified_components: 10, remaining_assets: 0 },
} as const;

async function completeEvidence(): Promise<readonly H0CheckEvidence[]> {
  const report = await runH0AiPreflight({ runId, createdAtUtc: createdAt });
  return [
    createAiRunnerH0Evidence(report, "h0-ai-fixture-v1"),
    ...h0CheckDefinitions
      .filter((item) => item.check_id !== "AI_RUNNER_PREFLIGHT")
      .map((item) =>
        createH0CheckEvidence({
          run_id: runId,
          check_id: item.check_id as Exclude<H0CheckId, "AI_RUNNER_PREFLIGHT">,
          fixture_id: "service-simulator-v1",
          executed_at_utc: createdAt,
          passed: true,
          observations: serviceObservations[item.check_id as keyof typeof serviceObservations],
        }),
      ),
  ];
}

describe("content-free H0 check ledger", () => {
  it("reconciles each required scoped check without implying a live gate", async () => {
    const ledger = buildH0CheckLedger({
      run_id: runId,
      created_at_utc: createdAt,
      evidence: await completeEvidence(),
    });

    expect(ledger.verdict).toBe("H0_PASS");
    expect(ledger.checks).toHaveLength(9);
    expect(ledger.missing_check_ids).toEqual([]);
    expect(ledger.invalid_check_ids).toEqual([]);
    expect(ledger.technical_image_gate_status).toBe("NOT_EVALUATED");
    expect(ledger.live_evidence_present).toBe(false);
    expect(ledger.excluded_evidence).toEqual([
      "live_provider",
      "image_quality",
      "asset_registry_enforcement",
      "provider_spend",
    ]);
    expect(ledger.inputs_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(serializeH0Ledger(ledger)).not.toMatch(
      /(?:https?:\/\/|file:|[A-Za-z]:[\\/]|portrait\.(?:jpg|png)|api[_-]?key)/i,
    );
  });

  it("fails closed on absent, duplicate, failed, or cross-run evidence", async () => {
    const evidence = await completeEvidence();
    const withoutDeletion = evidence.filter(
      (item) => item.check_id !== "SERVICE_VERIFIED_DELETION",
    );
    const failedRetry = evidence.map((item) =>
      item.check_id === "SERVICE_RETRY" ? { ...item, status: "FAIL" as const } : item,
    );
    const crossRunExpiry = evidence.map((item) =>
      item.check_id === "SERVICE_EXPIRY" ? { ...item, run_id: "other-run-001" } : item,
    );
    const duplicateCancellation = [
      ...evidence,
      evidence.find((item) => item.check_id === "JOB_CANCELLATION_TRANSITION") as H0CheckEvidence,
    ];

    for (const candidate of [withoutDeletion, failedRetry, crossRunExpiry, duplicateCancellation]) {
      expect(
        buildH0CheckLedger({
          run_id: runId,
          created_at_utc: createdAt,
          evidence: candidate,
        }).verdict,
      ).toBe("H0_FAIL");
    }
  });

  it("rejects content-bearing or unbounded observations", () => {
    expect(() =>
      createH0CheckEvidence({
        run_id: runId,
        check_id: "SERVICE_IDEMPOTENCY",
        fixture_id: "service-simulator-v1",
        executed_at_utc: createdAt,
        passed: true,
        observations: { locator: "https://private.example/signed" },
      }),
    ).toThrow(/content-free/);
  });

  it("requires every AI check exactly once and validates the report before hashing", async () => {
    const report = await runH0AiPreflight({ runId, createdAtUtc: createdAt });
    const duplicated = { ...report, checks: report.checks.map(() => report.checks[0]!) };
    const missing = { ...report, checks: report.checks.slice(1) };
    for (const candidate of [duplicated, missing]) {
      expect(createAiRunnerH0Evidence(candidate, "h0-ai-fixture-v1").status).toBe("FAIL");
    }
    for (const candidate of [
      { ...report, raw_prompt: "private sentinel" },
      { ...report, schema_version: "wrong" },
      { ...report, completed_slots: "12" },
      { ...report, checks: [{ check_id: "unknown", status: "PASS", observed: "private sentinel" }] },
      { ...report, checks: [{ ...report.checks[0], observed: "private sentinel" }] },
      { ...report, outcome_counts: { ...report.outcome_counts, name: "private sentinel" } },
    ]) {
      expect(() => createAiRunnerH0Evidence(candidate as unknown as H0PreflightReport, "h0-ai-fixture-v1"))
        .toThrow("Invalid content-free H0 AI report.");
    }
  });

  it("rejects unsafe runtime primitives, identifiers, observation fields, and coercion", () => {
    const base = {
      run_id: runId, check_id: "SERVICE_IDEMPOTENCY" as const, fixture_id: "service-simulator-v1",
      executed_at_utc: createdAt, passed: true, observations: serviceObservations.SERVICE_IDEMPOTENCY,
    };
    const candidates: unknown[] = [
      { ...base, passed: "false" }, { ...base, run_id: [runId] },
      { ...base, run_id: "client-jane.jpg" }, { ...base, fixture_id: "fixture..private" },
      { ...base, fixture_id: "client-jane@salon.example" },
      { ...base, fixture_id: ["service-simulator-v1"] }, { ...base, extra: "private sentinel" },
      { ...base, observations: null }, { ...base, observations: [true] },
      ...[null, {}, [], "client-jane.jpg", Infinity, NaN, -1, 1.5].map((value) =>
        ({ ...base, observations: { replay_equal: true, requested_variants: value } })),
      { ...base, observations: { ...base.observations, name: "private sentinel" } },
    ];
    for (const candidate of candidates) {
      expect(() => createH0CheckEvidence(candidate as typeof base)).toThrow(TypeError);
    }
  });

  it("rejects malformed evidence before it can reach a failed ledger or serializer", async () => {
    const evidence = await completeEvidence();
    for (const record of [
      null, "private sentinel", [], { ...evidence[0], raw_prompt: "private sentinel" },
      { ...evidence[0], check_id: "private sentinel" },
      { ...evidence[0], observations: { private_sentinel: "client-jane.jpg" } },
    ]) {
      expect(() => buildH0CheckLedger({ run_id: runId, created_at_utc: createdAt,
        evidence: [record, ...evidence.slice(1)] as readonly H0CheckEvidence[] }))
        .toThrow("Invalid content-free H0 evidence.");
    }
    const ledger = buildH0CheckLedger({ run_id: runId, created_at_utc: createdAt, evidence });
    expect(() => serializeH0Ledger({ ...ledger, raw_prompt: "private sentinel" } as typeof ledger))
      .toThrow("Invalid content-free H0 ledger.");
    expect(() => serializeH0Ledger({ ...ledger, checks: [{ ...ledger.checks[0]!, raw_prompt: "private sentinel" }, ...ledger.checks.slice(1)] } as typeof ledger))
      .toThrow("Invalid content-free H0 evidence.");
    expect(() => serializeH0Ledger({ ...ledger, verdict: "H0_FAIL" }))
      .toThrow("H0 ledger integrity mismatch.");
  });

  it("binds the full envelope and source observations, fails on tampering, and copies sources", async () => {
    const evidence = await completeEvidence();
    for (const record of evidence) {
      const { evidence_sha256, ...source } = record;
      expect(sha256EvaluationManifest(source)).toBe(evidence_sha256);
    }
    const original = evidence.find((item) => item.check_id === "SERVICE_IDEMPOTENCY")!;
    for (const changed of [
      { ...original, run_id: "other-run-001" }, { ...original, status: "FAIL" as const },
      { ...original, executed_at_utc: "2026-10-01T08:01:00.000Z" },
      { ...original, fixture_id: "other-fixture-v1" },
      { ...original, observations: { replay_equal: false, requested_variants: 2 } },
    ]) {
      expect(buildH0CheckLedger({ run_id: runId, created_at_utc: createdAt,
        evidence: evidence.map((item) => item.check_id === original.check_id ? changed : item) }).verdict)
        .toBe("H0_FAIL");
    }
    const failed = createH0CheckEvidence({ run_id: runId, check_id: "SERVICE_IDEMPOTENCY",
      fixture_id: "service-simulator-v1", executed_at_utc: createdAt, passed: false,
      observations: serviceObservations.SERVICE_IDEMPOTENCY });
    expect(buildH0CheckLedger({ run_id: runId, created_at_utc: createdAt,
      evidence: evidence.map((item) => item.check_id === failed.check_id ? { ...failed, status: "PASS" } : item) }).verdict)
      .toBe("H0_FAIL");
    const ledger = buildH0CheckLedger({ run_id: runId, created_at_utc: createdAt, evidence });
    const serialized = serializeH0Ledger(ledger);
    (original.observations as Record<string, unknown>).replay_equal = false;
    expect(serializeH0Ledger(ledger)).toBe(serialized);
  });
});
