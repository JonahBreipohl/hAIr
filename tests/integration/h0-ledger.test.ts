import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildH0CheckLedger,
  createAiRunnerH0Evidence,
  createH0CheckEvidence,
  runH0AiPreflight,
  type H0CheckEvidence,
} from "../../packages/ai/src/index";
import {
  canTransitionGenerationJob,
  currentConsentContractVersions,
  defaultHairSpecification,
  parseOpaqueId,
  type Actor,
  type AssetId,
  type CapabilityId,
  type Clock,
  type CommandContext,
  type ConsultationRecord,
  type OpaqueId,
  type OpaqueIdKind,
  type ServiceResponse,
  type Variant,
} from "@hair/domain";
import {
  InMemoryPrivateApplicationService,
  type OpaqueIdFactory,
} from "@hair/service";

const runId = "h0-ledger-run-001";
const executedAt = "2026-10-01T08:00:00.000Z";
const fixtureId = "service-simulator-h0-v1";

const prefixByKind = {
  actor: "act",
  asset: "ast",
  attempt: "atm",
  capability: "cap",
  consentReceipt: "csr",
  consultation: "con",
  deletionRequest: "del",
  fingerprint: "fpr",
  idempotency: "key",
  privacyRequest: "prq",
  request: "req",
  result: "res",
  saveReceipt: "svr",
  session: "ses",
  share: "shr",
  tenant: "ten",
  variant: "var",
} as const satisfies Readonly<Record<OpaqueIdKind, string>>;

class SequentialOpaqueIds implements OpaqueIdFactory {
  private sequence = 0;
  private readonly latestByKind = new Map<OpaqueIdKind, OpaqueId<OpaqueIdKind>>();

  next<Kind extends OpaqueIdKind>(kind: Kind): OpaqueId<Kind> {
    this.sequence += 1;
    const id = parseOpaqueId(
      kind,
      `${prefixByKind[kind]}_H0LEDGER${String(this.sequence).padStart(12, "0")}`,
    );
    this.latestByKind.set(kind, id);
    return id;
  }

  latest<Kind extends OpaqueIdKind>(kind: Kind): OpaqueId<Kind> {
    const id = this.latestByKind.get(kind);
    if (id === undefined) throw new Error(`Missing ${kind} fixture ID.`);
    return id as OpaqueId<Kind>;
  }
}

class MutableClock implements Clock {
  constructor(private value: string) {}
  now(): Date { return new Date(this.value); }
  set(value: string): void { this.value = value; }
}

const tenant = parseOpaqueId("tenant", "ten_H0LEDGERTENANT001");
const stylist: Actor = {
  kind: "tenant_member",
  actorId: parseOpaqueId("actor", "act_H0LEDGERSTYLIST01"),
  tenantId: tenant,
  role: "stylist",
  membership: "active",
};
const generationWorker: Actor = {
  kind: "service",
  actorId: parseOpaqueId("actor", "act_H0LEDGERGENWORK1"),
  role: "generation_worker",
};
const retentionWorker: Actor = {
  kind: "service",
  actorId: parseOpaqueId("actor", "act_H0LEDGERRETENT01"),
  role: "retention_worker",
};
const specification = { ...defaultHairSpecification, silhouette: "layered shape" };

function context(actor: Actor, ids: OpaqueIdFactory): CommandContext {
  return {
    actor,
    requestId: ids.next("request"),
    idempotencyKey: ids.next("idempotency"),
    fingerprint: ids.next("fingerprint"),
  };
}

function valueOf<Value>(response: ServiceResponse<Value>): Value {
  if (!response.ok) throw new Error(`Expected fixture success, received ${response.code}.`);
  return response.value;
}

async function consultationWithSource(
  service: InMemoryPrivateApplicationService,
  ids: SequentialOpaqueIds,
): Promise<{ consultation: ConsultationRecord; sourceAssetId: AssetId }> {
  const consultation = valueOf(
    await service.execute({
      operation: "consultation.create",
      context: context(stylist, ids),
      tenantId: tenant,
    }),
  ) as ConsultationRecord;
  const client: Actor = {
    kind: "consultation_control",
    tenantId: tenant,
    consultationId: consultation.id,
    capabilityId: ids.latest("capability") as CapabilityId,
    expiresAt: consultation.retention.accessExpiresAt,
    revokedAt: null,
  };
  valueOf(
    await service.execute({
      operation: "consent.record",
      context: context(client, ids),
      consultationId: consultation.id,
      receiptId: ids.next("consentReceipt"),
      sessionId: ids.next("session"),
      policyVersion: currentConsentContractVersions.policy,
      retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
      providerDisclosureVersion: currentConsentContractVersions.providerDisclosure,
      acknowledgementMethod: "client_explicit_tap",
      adultConfirmed: true,
      referenceRightsConfirmed: false,
      scopes: ["portrait_processing", "ai_hairstyle_generation"],
    }),
  );
  const sourceAssetId = ids.next("asset");
  valueOf(
    await service.execute({
      operation: "asset.accept",
      context: context(stylist, ids),
      consultationId: consultation.id,
      assetId: sourceAssetId,
      assetClass: "source_portrait",
      parentAssetIds: [],
    }),
  );
  return { consultation, sourceAssetId };
}

async function serviceEvidence(): Promise<readonly H0CheckEvidence[]> {
  const ids = new SequentialOpaqueIds();
  const clock = new MutableClock(executedAt);
  const service = new InMemoryPrivateApplicationService(clock, ids);
  const { consultation, sourceAssetId } = await consultationWithSource(service, ids);
  const generationCommand = {
    operation: "generation.request" as const,
    context: context(stylist, ids),
    consultationId: consultation.id,
    sourceAssetId,
    referenceAssetId: null,
    specification,
    promptVersion: "hair-h0-v1",
    previewCount: 2,
  };
  const firstGeneration = await service.execute(generationCommand);
  const replayedGeneration = await service.execute(generationCommand);
  const variants = valueOf(firstGeneration) as readonly Variant[];
  const readyCandidate = variants[0];
  const failedCandidate = variants[1];
  if (readyCandidate === undefined || failedCandidate === undefined) {
    throw new Error("Expected two H0 variants.");
  }

  const outputAssetId = ids.next("asset");
  const publishReady = {
    operation: "variant.publish" as const,
    context: context(generationWorker, ids),
    consultationId: consultation.id,
    variantId: readyCandidate.id,
    callback: {
      attemptId: readyCandidate.attemptId,
      outcome: "ready" as const,
      outputAssetId,
    },
  };
  const firstReady = await service.execute(publishReady);
  const beforeDuplicate = service.snapshot();
  const duplicateReady = await service.execute({
    ...publishReady,
    context: context(generationWorker, ids),
  });
  const afterDuplicate = service.snapshot();
  const ready = valueOf(firstReady) as Variant;
  const failed = valueOf(
    await service.execute({
      operation: "variant.publish",
      context: context(generationWorker, ids),
      consultationId: consultation.id,
      variantId: failedCandidate.id,
      callback: {
        attemptId: failedCandidate.attemptId,
        outcome: "failed",
        safeFailureCode: "provider_timeout",
      },
    }),
  ) as Variant;
  const retried = valueOf(
    await service.execute({
      operation: "variant.retry",
      context: context(stylist, ids),
      consultationId: consultation.id,
      variantId: failed.id,
      nextAttemptId: ids.next("attempt"),
    }),
  ) as Variant;

  const deletion = valueOf(
    await service.execute({
      operation: "deletion.request",
      context: context(stylist, ids),
      consultationId: consultation.id,
      deletionRequestId: ids.next("deletionRequest"),
      statusCapabilityId: ids.next("capability"),
      reason: "user_request",
    }),
  );
  if (!("components" in deletion)) throw new Error("Expected H0 deletion receipt.");
  const lateCallback = await service.execute({
    operation: "variant.publish",
    context: context(generationWorker, ids),
    consultationId: consultation.id,
    variantId: retried.id,
    callback: {
      attemptId: retried.attemptId,
      outcome: "ready",
      outputAssetId: ids.next("asset"),
    },
  });

  const expiryIds = new SequentialOpaqueIds();
  const expiryClock = new MutableClock(executedAt);
  const expiryService = new InMemoryPrivateApplicationService(expiryClock, expiryIds);
  const expiryFixture = await consultationWithSource(expiryService, expiryIds);
  expiryClock.set("2026-10-02T08:00:00.000Z");
  const expiredRead = await expiryService.query({
    operation: "consultation.read",
    context: { actor: stylist, requestId: expiryIds.next("request") },
    consultationId: expiryFixture.consultation.id,
  });
  const expiryReceipt = valueOf(
    await expiryService.execute({
      operation: "retention.expire",
      context: context(retentionWorker, expiryIds),
      consultationId: expiryFixture.consultation.id,
      deletionRequestId: expiryIds.next("deletionRequest"),
      statusCapabilityId: expiryIds.next("capability"),
    }),
  );
  if (!("reason" in expiryReceipt)) throw new Error("Expected H0 expiry receipt.");

  const evidence = (
    check_id: Parameters<typeof createH0CheckEvidence>[0]["check_id"],
    passed: boolean,
    observations: Parameters<typeof createH0CheckEvidence>[0]["observations"],
  ) =>
    createH0CheckEvidence({
      run_id: runId,
      check_id,
      fixture_id: fixtureId,
      executed_at_utc: executedAt,
      passed,
      observations,
    });

  return [
    evidence("SERVICE_IDEMPOTENCY", JSON.stringify(firstGeneration) === JSON.stringify(replayedGeneration) && variants.length === 2, {
      replay_equal: JSON.stringify(firstGeneration) === JSON.stringify(replayedGeneration),
      requested_variants: variants.length,
    }),
    evidence("SERVICE_DUPLICATE_CALLBACK", JSON.stringify(firstReady) === JSON.stringify(duplicateReady) && ready.state === "ready" && beforeDuplicate.assets === afterDuplicate.assets && beforeDuplicate.providerJobs === afterDuplicate.providerJobs, {
      replay_equal: JSON.stringify(firstReady) === JSON.stringify(duplicateReady),
      terminal_state: ready.state,
      assets_unchanged: beforeDuplicate.assets === afterDuplicate.assets,
      jobs_unchanged: beforeDuplicate.providerJobs === afterDuplicate.providerJobs,
      variant_unchanged: JSON.stringify(firstReady) === JSON.stringify(duplicateReady),
    }),
    evidence("SERVICE_LATE_CALLBACK", !lateCallback.ok && service.snapshot().assets === 0, {
      denied: !lateCallback.ok,
      remaining_assets: service.snapshot().assets,
    }),
    evidence("JOB_CANCELLATION_TRANSITION", canTransitionGenerationJob("running", "canceled") && canTransitionGenerationJob("canceled", "queued"), {
      running_to_canceled: canTransitionGenerationJob("running", "canceled"),
      canceled_to_retry: canTransitionGenerationJob("canceled", "queued"),
    }),
    evidence("SERVICE_PARTIAL_SUCCESS", ready.state === "ready" && failed.state === "failed", {
      ready_count: ready.state === "ready" ? 1 : 0,
      failed_count: failed.state === "failed" ? 1 : 0,
    }),
    evidence("SERVICE_RETRY", retried.state === "running" && retried.attemptNumber === 2, {
      attempt_number: retried.attemptNumber,
      retry_state: retried.state,
    }),
    evidence("SERVICE_EXPIRY", !expiredRead.ok && expiryReceipt.reason === "expiry" && expiryReceipt.state === "verified" && expiryService.snapshot().assets === 0, {
      access_denied: !expiredRead.ok,
      receipt_state: expiryReceipt.state,
      remaining_assets: expiryService.snapshot().assets,
    }),
    evidence("SERVICE_VERIFIED_DELETION", deletion.state === "verified" && deletion.components.every((item) => item.status === "verified_absent") && service.snapshot().assets === 0 && service.snapshot().providerJobs === 0, {
      receipt_state: deletion.state,
      verified_components: deletion.components.filter((item) => item.status === "verified_absent").length,
      remaining_assets: service.snapshot().assets,
    }),
  ];
}

describe("integrated content-free H0 ledger", () => {
  it("reconciles executable AI and service/job evidence against a golden ledger", async () => {
    const aiReport = await runH0AiPreflight({ runId, createdAtUtc: executedAt });
    const ledger = buildH0CheckLedger({
      run_id: runId,
      created_at_utc: executedAt,
      evidence: [
        createAiRunnerH0Evidence(aiReport, "h0-ai-fixture-v1"),
        ...(await serviceEvidence()),
      ],
    });
    const golden = JSON.parse(
      readFileSync(
        new URL("../evals/h0-check-ledger.golden.json", import.meta.url),
        "utf8",
      ),
    ) as unknown;

    expect(ledger).toEqual(golden);
    expect(ledger.verdict).toBe("H0_PASS");
    expect(ledger.technical_image_gate_status).toBe("NOT_EVALUATED");
    expect(ledger.live_evidence_present).toBe(false);
  });
});
