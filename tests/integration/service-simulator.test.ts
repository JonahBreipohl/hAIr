import { describe, expect, it } from "vitest";

import {
  defaultRetentionPolicy,
  defaultHairSpecification,
  currentConsentContractVersions,
  currentSaveDisclosureVersion,
  parseOpaqueId,
  type Actor,
  type ApplicationCommand,
  type AssetId,
  type CapabilityId,
  type Clock,
  type CommandContext,
  type ConsultationRecord,
  type OpaqueId,
  type OpaqueIdKind,
  type PrivateShare,
  type QueryContext,
  type SaveReceipt,
  type ServiceResponse,
  type SharedConsultationBrief,
  type TenantId,
  type Variant,
} from "@hair/domain";
import {
  InMemoryPrivateApplicationService,
  type OpaqueIdFactory,
} from "@hair/service";

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

  public next<Kind extends OpaqueIdKind>(kind: Kind): OpaqueId<Kind> {
    this.sequence += 1;
    const id = parseOpaqueId(
      kind,
      `${prefixByKind[kind]}_SIMULATED${String(this.sequence).padStart(12, "0")}`,
    );
    this.latestByKind.set(kind, id);
    return id;
  }

  public latest<Kind extends OpaqueIdKind>(kind: Kind): OpaqueId<Kind> {
    const id = this.latestByKind.get(kind);
    if (id === undefined) {
      throw new Error(`No ${kind} identifier has been issued.`);
    }
    return id as OpaqueId<Kind>;
  }
}

class MutableClock implements Clock {
  public constructor(private instant: string) {}

  public now(): Date {
    return new Date(this.instant);
  }

  public set(instant: string): void {
    this.instant = instant;
  }
}

const tenantA = parseOpaqueId("tenant", "ten_SIMULATEDTENANT001");
const tenantB = parseOpaqueId("tenant", "ten_SIMULATEDTENANT002");
const stylistA: Actor = {
  kind: "tenant_member",
  actorId: parseOpaqueId("actor", "act_SIMULATEDSTYLIST01"),
  tenantId: tenantA,
  role: "stylist",
  membership: "active",
};
const stylistB: Actor = {
  kind: "tenant_member",
  actorId: parseOpaqueId("actor", "act_SIMULATEDSTYLIST02"),
  tenantId: tenantB,
  role: "stylist",
  membership: "active",
};
const unassignedStylistA: Actor = {
  kind: "tenant_member",
  actorId: parseOpaqueId("actor", "act_SIMULATEDSTYLIST03"),
  tenantId: tenantA,
  role: "stylist",
  membership: "active",
};
const unassignedAdminA: Actor = {
  kind: "tenant_member",
  actorId: parseOpaqueId("actor", "act_SIMULATEDADMIN0001"),
  tenantId: tenantA,
  role: "salon_admin",
  membership: "active",
};
const removedStylistA: Actor = {
  ...stylistA,
  membership: "removed",
};
const generationWorker: Actor = {
  kind: "service",
  actorId: parseOpaqueId("actor", "act_SIMULATEDGENWORKER1"),
  role: "generation_worker",
};
const retentionWorker: Actor = {
  kind: "service",
  actorId: parseOpaqueId("actor", "act_SIMULATEDRETENTION01"),
  role: "retention_worker",
};

const specification = {
  ...defaultHairSpecification,
  silhouette: "balanced layered shape",
};

const clientAuthorities = new Map<ConsultationRecord["id"], Actor>();

function commandContext(
  actor: Actor,
  ids: OpaqueIdFactory,
): CommandContext {
  return {
    actor,
    requestId: ids.next("request"),
    idempotencyKey: ids.next("idempotency"),
    fingerprint: ids.next("fingerprint"),
  };
}

function queryContext(actor: Actor, ids: OpaqueIdFactory): QueryContext {
  return { actor, requestId: ids.next("request") };
}

function valueOf<Value>(response: ServiceResponse<Value>): Value {
  expect(response.ok).toBe(true);
  if (!response.ok) {
    throw new Error(`Expected success, received ${response.code}.`);
  }
  return response.value;
}

function expectGenericDenial(response: ServiceResponse<unknown>): void {
  expect(response).toEqual({
    ok: false,
    code: "not_found_or_unauthorized",
    retryable: false,
  });
}

async function createConsultation(
  service: InMemoryPrivateApplicationService,
  ids: SequentialOpaqueIds,
  actor: Actor = stylistA,
  tenantId: TenantId = tenantA,
): Promise<ConsultationRecord> {
  const consultation = valueOf(
    await service.execute({
      operation: "consultation.create",
      context: commandContext(actor, ids),
      tenantId,
    }),
  ) as ConsultationRecord;
  clientAuthorities.set(consultation.id, {
    kind: "consultation_control",
    tenantId: consultation.tenantId,
    consultationId: consultation.id,
    capabilityId: ids.latest("capability") as CapabilityId,
    expiresAt: consultation.retention.accessExpiresAt,
    revokedAt: null,
  });
  return consultation;
}

function clientAuthorityFor(consultation: ConsultationRecord): Actor {
  const actor = clientAuthorities.get(consultation.id);
  if (actor === undefined) {
    throw new Error("Expected a client authority for the consultation.");
  }
  return actor;
}

async function consentAndAcceptSource(
  service: InMemoryPrivateApplicationService,
  ids: OpaqueIdFactory,
  consultation: ConsultationRecord,
): Promise<AssetId> {
  valueOf(
    await service.execute({
      operation: "consent.record",
      context: commandContext(clientAuthorityFor(consultation), ids),
      consultationId: consultation.id,
      receiptId: ids.next("consentReceipt"),
      sessionId: ids.next("session"),
      policyVersion: currentConsentContractVersions.policy,
      retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
      providerDisclosureVersion:
        currentConsentContractVersions.providerDisclosure,
      acknowledgementMethod: "client_explicit_tap",
      adultConfirmed: true,
      referenceRightsConfirmed: false,
      scopes: [
        "portrait_processing",
        "ai_hairstyle_generation",
        "private_result_sharing",
      ],
    }),
  );
  const sourceAssetId = ids.next("asset");
  valueOf(
    await service.execute({
      operation: "asset.accept",
      context: commandContext(stylistA, ids),
      consultationId: consultation.id,
      assetId: sourceAssetId,
      assetClass: "source_portrait",
      parentAssetIds: [],
    }),
  );
  return sourceAssetId;
}

async function generateReadyVariant(
  service: InMemoryPrivateApplicationService,
  ids: OpaqueIdFactory,
  consultation: ConsultationRecord,
  sourceAssetId: AssetId,
): Promise<{ variant: Variant; outputAssetId: AssetId }> {
  const variants = valueOf(
    await service.execute({
      operation: "generation.request",
      context: commandContext(stylistA, ids),
      consultationId: consultation.id,
      sourceAssetId,
      referenceAssetId: null,
      specification,
      promptVersion: "hair-v1",
      previewCount: 1,
    }),
  ) as readonly Variant[];
  const running = variants[0];
  if (running === undefined) {
    throw new Error("Expected one simulated variant.");
  }
  const outputAssetId = ids.next("asset");
  const ready = valueOf(
    await service.execute({
      operation: "variant.publish",
      context: commandContext(generationWorker, ids),
      consultationId: consultation.id,
      variantId: running.id,
      callback: {
        attemptId: running.attemptId,
        outcome: "ready",
        outputAssetId,
      },
    }),
  ) as Variant;
  return { variant: ready, outputAssetId };
}

async function createShare(
  service: InMemoryPrivateApplicationService,
  ids: OpaqueIdFactory,
  consultation: ConsultationRecord,
  variant: Variant,
): Promise<PrivateShare> {
  valueOf(
    await service.execute({
      operation: "consultation.agree",
      context: commandContext(stylistA, ids),
      consultationId: consultation.id,
      variantId: variant.id,
      feasibility: "feasible-now",
      serviceNotes: "Keep the perimeter balanced.",
      maintenanceNotes: "Review the shape in eight weeks.",
    }),
  );
  return valueOf(
    await service.execute({
      operation: "share.create",
      context: commandContext(stylistA, ids),
      consultationId: consultation.id,
      shareId: ids.next("share"),
      capabilityId: ids.next("capability"),
      variantIds: [variant.id],
    }),
  ) as PrivateShare;
}

describe("secure in-memory application service", () => {
  it("cancels unfinished previews, preserves ready siblings, and rejects late publication with fresh contexts", async () => {
    const ids = new SequentialOpaqueIds();
    const service = new InMemoryPrivateApplicationService(new MutableClock("2026-10-02T12:00:00.000Z"), ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(service, ids, consultation);
    const variants = valueOf(await service.execute({
      operation: "generation.request", context: commandContext(stylistA, ids),
      consultationId: consultation.id, sourceAssetId, referenceAssetId: null,
      specification, promptVersion: "hair-v1", previewCount: 3,
    })) as readonly Variant[];
    const outputAssetId = ids.next("asset");
    valueOf(await service.execute({
      operation: "variant.publish", context: commandContext(generationWorker, ids),
      consultationId: consultation.id, variantId: variants[0]!.id,
      callback: { attemptId: variants[0]!.attemptId, outcome: "ready", outputAssetId },
    }));
    const command: ApplicationCommand = {
      operation: "generation.cancel", context: commandContext(clientAuthorityFor(consultation), ids), consultationId: consultation.id,
    };
    const canceled = valueOf(await service.execute(command)) as readonly Variant[];
    expect(canceled.map((variant) => variant.state)).toEqual(["ready", "canceled", "canceled"]);
    const settled = service.snapshot();
    expect(settled).toMatchObject({ assets: 1, providerJobs: 0, workerTemporaryScopes: 0 });
    expect(await service.execute(command)).toEqual({ ok: true, value: canceled });
    for (const variant of variants.slice(1)) {
      const result = valueOf(await service.execute({
        operation: "variant.publish", context: commandContext(generationWorker, ids),
        consultationId: consultation.id, variantId: variant.id,
        callback: { attemptId: variant.attemptId, outcome: "ready", outputAssetId: ids.next("asset") },
      })) as Variant;
      expect(result.state).toBe("canceled");
      expect(result.outputAssetId).toBeNull();
    }
    expect(service.snapshot()).toMatchObject({ assets: 1, providerJobs: 0, workerTemporaryScopes: 0 });
    expect(valueOf(await service.query({ operation: "media.authorize", context: queryContext(stylistA, ids), consultationId: consultation.id, assetId: outputAssetId }))).toHaveProperty("assetId", outputAssetId);
    expectGenericDenial(await service.query({ operation: "media.authorize", context: queryContext(stylistA, ids), consultationId: consultation.id, assetId: sourceAssetId }));
    valueOf(await service.execute({ operation: "deletion.request", context: commandContext(stylistA, ids), consultationId: consultation.id, deletionRequestId: ids.next("deletionRequest"), statusCapabilityId: ids.next("capability"), reason: "user_request" }));
    expect(service.snapshot()).toMatchObject({ assets: 0, contentBearingIdempotencyResponses: 0 });
  });

  it("ends failed-source retry authorization on cancellation, including an all-failed job", async () => {
    const ids = new SequentialOpaqueIds();
    const service = new InMemoryPrivateApplicationService(new MutableClock("2026-10-02T12:00:00.000Z"), ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(service, ids, consultation);
    const variants = valueOf(await service.execute({ operation: "generation.request", context: commandContext(stylistA, ids), consultationId: consultation.id, sourceAssetId, referenceAssetId: null, specification, promptVersion: "hair-v1", previewCount: 1 })) as readonly Variant[];
    const failed = valueOf(await service.execute({ operation: "variant.publish", context: commandContext(generationWorker, ids), consultationId: consultation.id, variantId: variants[0]!.id, callback: { attemptId: variants[0]!.attemptId, outcome: "failed", safeFailureCode: "provider_timeout" } })) as Variant;
    expect(service.snapshot().assets).toBe(1);
    const canceled = valueOf(await service.execute({ operation: "generation.cancel", context: commandContext(stylistA, ids), consultationId: consultation.id })) as readonly Variant[];
    expect(canceled[0]).toEqual(failed);
    expect(service.snapshot()).toMatchObject({ assets: 0, providerJobs: 0, workerTemporaryScopes: 0 });
    expect(await service.execute({ operation: "variant.retry", context: commandContext(stylistA, ids), consultationId: consultation.id, variantId: failed.id, nextAttemptId: ids.next("attempt") })).toEqual({ ok: false, code: "invalid_state", retryable: false });
  });

  it("restricts generation cancellation to assigned salon or live client authority", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-10-02T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(service, ids, consultation);
    valueOf(await service.execute({ operation: "generation.request", context: commandContext(stylistA, ids), consultationId: consultation.id, sourceAssetId, referenceAssetId: null, specification, promptVersion: "hair-v1", previewCount: 1 }));
    for (const actor of [stylistB, unassignedStylistA, unassignedAdminA, removedStylistA, generationWorker]) {
      expectGenericDenial(await service.execute({ operation: "generation.cancel", context: commandContext(actor, ids), consultationId: consultation.id }));
    }
    expect(service.snapshot()).toMatchObject({ assets: 1, providerJobs: 1, workerTemporaryScopes: 1 });
    const expiredControl = { ...clientAuthorityFor(consultation), expiresAt: "2026-10-01T12:00:00.000Z" } as Actor;
    expectGenericDenial(await service.execute({ operation: "generation.cancel", context: commandContext(expiredControl, ids), consultationId: consultation.id }));
    clock.set(consultation.retention.accessExpiresAt);
    expectGenericDenial(await service.execute({ operation: "generation.cancel", context: commandContext(stylistA, ids), consultationId: consultation.id }));
  });

  it("accepts consent only from client authority using current contracts and an explicit tap", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const input = {
      operation: "consent.record" as const,
      consultationId: consultation.id,
      receiptId: ids.next("consentReceipt"),
      sessionId: ids.next("session"),
      policyVersion: currentConsentContractVersions.policy,
      retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
      providerDisclosureVersion:
        currentConsentContractVersions.providerDisclosure,
      acknowledgementMethod: "client_explicit_tap" as const,
      adultConfirmed: true,
      referenceRightsConfirmed: false,
      scopes: ["portrait_processing", "ai_hairstyle_generation"] as const,
    };

    for (const actor of [stylistA, unassignedAdminA]) {
      expectGenericDenial(
        await service.execute({
          ...input,
          context: commandContext(actor, ids),
        }),
      );
    }
    for (const outdatedVersion of [
      { policyVersion: "consent-v0" },
      { retentionNoticeVersion: "retention-v0" },
      { providerDisclosureVersion: "provider-v0" },
    ]) {
      expect(
        await service.execute({
          ...input,
          ...outdatedVersion,
          context: commandContext(clientAuthorityFor(consultation), ids),
        }),
      ).toEqual({ ok: false, code: "invalid_request", retryable: false });
    }
    expect(
      await service.execute({
        ...input,
        context: commandContext(clientAuthorityFor(consultation), ids),
        acknowledgementMethod: "staff_checkbox" as never,
      }),
    ).toEqual({ ok: false, code: "invalid_request", retryable: false });
    expect(service.snapshot().consentReceipts).toBe(0);

    expect(
      valueOf(
        await service.execute({
          ...input,
          context: commandContext(clientAuthorityFor(consultation), ids),
        }),
      ),
    ).toMatchObject({
      policyVersion: currentConsentContractVersions.policy,
      acknowledgementMethod: "client_explicit_tap",
    });
    expect(service.snapshot().consentReceipts).toBe(1);
  });

  it("rejects asset acceptance before consent and replays an accepted handle idempotently", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = ids.next("asset");
    const firstContext = commandContext(stylistA, ids);
    const beforeConsent = await service.execute({
      operation: "asset.accept",
      context: firstContext,
      consultationId: consultation.id,
      assetId: sourceAssetId,
      assetClass: "source_portrait",
      parentAssetIds: [],
    });

    expect(beforeConsent).toEqual({
      ok: false,
      code: "invalid_state",
      retryable: false,
    });
    expect(service.snapshot().assets).toBe(0);

    const invalidConsentContext = commandContext(
      clientAuthorityFor(consultation),
      ids,
    );
    const invalidConsent: ApplicationCommand = {
      operation: "consent.record",
      context: invalidConsentContext,
      consultationId: consultation.id,
      receiptId: ids.next("consentReceipt"),
      sessionId: ids.next("session"),
      policyVersion: "consent-v1",
      retentionNoticeVersion: "retention-v1",
      providerDisclosureVersion: "provider-v1",
      acknowledgementMethod: "client_explicit_tap",
      adultConfirmed: false,
      referenceRightsConfirmed: false,
      scopes: ["portrait_processing", "ai_hairstyle_generation"],
    };
    const rejectedConsent = await service.execute(invalidConsent);
    expect(rejectedConsent).toEqual({
      ok: false,
      code: "invalid_request",
      retryable: false,
    });
    expect(await service.execute(invalidConsent)).toEqual(rejectedConsent);
    expect(service.snapshot().consentReceipts).toBe(0);

    valueOf(
      await service.execute({
        operation: "consent.record",
        context: commandContext(clientAuthorityFor(consultation), ids),
        consultationId: consultation.id,
        receiptId: ids.next("consentReceipt"),
        sessionId: ids.next("session"),
        policyVersion: "consent-v1",
        retentionNoticeVersion: "retention-v1",
        providerDisclosureVersion: "provider-v1",
        acknowledgementMethod: "client_explicit_tap",
        adultConfirmed: true,
        referenceRightsConfirmed: false,
        scopes: ["portrait_processing", "ai_hairstyle_generation"],
      }),
    );

    const acceptedContext = commandContext(stylistA, ids);
    const acceptCommand: ApplicationCommand = {
      operation: "asset.accept",
      context: acceptedContext,
      consultationId: consultation.id,
      assetId: sourceAssetId,
      assetClass: "source_portrait",
      parentAssetIds: [],
    };
    const accepted = await service.execute(acceptCommand);
    const replayed = await service.execute(acceptCommand);
    expect(accepted).toEqual(replayed);
    expect(service.snapshot().assets).toBe(1);

    const conflict = await service.execute({
      ...acceptCommand,
      context: {
        ...acceptedContext,
        fingerprint: ids.next("fingerprint"),
      },
    });
    expect(conflict).toEqual({
      ok: false,
      code: "idempotency_conflict",
      retryable: false,
    });
  });

  it("denies unassigned same-tenant members and preserves non-disclosing failures", async () => {
    const ids = new SequentialOpaqueIds();
    const service = new InMemoryPrivateApplicationService(
      new MutableClock("2026-09-28T12:00:00.000Z"),
      ids,
    );
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );

    const foreign = await service.query({
      operation: "consultation.read",
      context: queryContext(stylistB, ids),
      consultationId: consultation.id,
    });
    const unassigned = await service.query({
      operation: "consultation.read",
      context: queryContext(unassignedStylistA, ids),
      consultationId: consultation.id,
    });
    const admin = await service.query({
      operation: "consultation.read",
      context: queryContext(unassignedAdminA, ids),
      consultationId: consultation.id,
    });
    const adminPortrait = await service.query({
      operation: "media.authorize",
      context: queryContext(unassignedAdminA, ids),
      consultationId: consultation.id,
      assetId: sourceAssetId,
    });
    const removed = await service.query({
      operation: "consultation.read",
      context: queryContext(removedStylistA, ids),
      consultationId: consultation.id,
    });
    const unknown = await service.query({
      operation: "consultation.read",
      context: queryContext(stylistB, ids),
      consultationId: ids.next("consultation"),
    });
    const foreignDelete = await service.execute({
      operation: "deletion.request",
      context: commandContext(stylistB, ids),
      consultationId: consultation.id,
      deletionRequestId: ids.next("deletionRequest"),
      statusCapabilityId: ids.next("capability"),
      reason: "user_request",
    });
    const unassignedDelete = await service.execute({
      operation: "deletion.request",
      context: commandContext(unassignedStylistA, ids),
      consultationId: consultation.id,
      deletionRequestId: ids.next("deletionRequest"),
      statusCapabilityId: ids.next("capability"),
      reason: "user_request",
    });
    const adminDelete = await service.execute({
      operation: "deletion.request",
      context: commandContext(unassignedAdminA, ids),
      consultationId: consultation.id,
      deletionRequestId: ids.next("deletionRequest"),
      statusCapabilityId: ids.next("capability"),
      reason: "user_request",
    });

    expectGenericDenial(foreign);
    expect(unassigned).toEqual(foreign);
    expect(admin).toEqual(foreign);
    expect(adminPortrait).toEqual(foreign);
    expect(removed).toEqual(foreign);
    expect(unknown).toEqual(foreign);
    expect(foreignDelete).toEqual(foreign);
    expect(unassignedDelete).toEqual(foreign);
    expect(adminDelete).toEqual(foreign);
    expect(service.snapshot().deletionReceipts).toBe(0);

    const adminOwned = await createConsultation(
      service,
      ids,
      unassignedAdminA,
      tenantA,
    );
    expect(
      valueOf(
        await service.query({
          operation: "consultation.read",
          context: queryContext(unassignedAdminA, ids),
          consultationId: adminOwned.id,
        }),
      ),
    ).toEqual(adminOwned);

    const adminDeletionRequestId = ids.next("deletionRequest");
    const adminDeletion = valueOf(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(unassignedAdminA, ids),
        consultationId: adminOwned.id,
        deletionRequestId: adminDeletionRequestId,
        statusCapabilityId: ids.next("capability"),
        reason: "user_request",
      }),
    );
    expectGenericDenial(
      await service.query({
        operation: "deletion.status.read",
        context: queryContext(unassignedStylistA, ids),
        deletionRequestId: adminDeletionRequestId,
      }),
    );
    expect(
      valueOf(
        await service.query({
          operation: "deletion.status.read",
          context: queryContext(unassignedAdminA, ids),
          deletionRequestId: adminDeletionRequestId,
        }),
      ),
    ).toEqual(adminDeletion);
  });

  it("binds a verified privacy request to its intended consultation and deletion status", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const intended = await createConsultation(service, ids);
    const other = await createConsultation(service, ids);
    const privacyRequestId = ids.next("privacyRequest");
    const deletionRequestId = ids.next("deletionRequest");
    const statusCapabilityId = ids.next("capability");
    const privacyOperator: Actor = {
      kind: "privacy_operator",
      actorId: ids.next("actor"),
      tenantId: tenantA,
      privacyRequestId,
      targetConsultationId: intended.id,
      targetDeletionRequestId: deletionRequestId,
      requestVerified: true,
    };

    expectGenericDenial(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(privacyOperator, ids),
        consultationId: other.id,
        deletionRequestId: ids.next("deletionRequest"),
        statusCapabilityId: ids.next("capability"),
        reason: "privacy_request",
      }),
    );
    const receipt = valueOf(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(privacyOperator, ids),
        consultationId: intended.id,
        deletionRequestId,
        statusCapabilityId,
        reason: "privacy_request",
      }),
    );
    if (!("state" in receipt)) {
      throw new Error("Expected a deletion receipt.");
    }
    expect(receipt.state).toBe("verified");
    expect(
      valueOf(
        await service.query({
          operation: "deletion.status.read",
          context: queryContext(privacyOperator, ids),
          deletionRequestId,
        }),
      ),
    ).toEqual(receipt);

    const wrongDeletionActor: Actor = {
      ...privacyOperator,
      targetDeletionRequestId: ids.next("deletionRequest"),
    };
    expectGenericDenial(
      await service.query({
        operation: "deletion.status.read",
        context: queryContext(wrongDeletionActor, ids),
        deletionRequestId,
      }),
    );
  });

  it("replays generation callbacks and ignores stale or conflicting terminal callbacks", async () => {
    const ids = new SequentialOpaqueIds();
    const service = new InMemoryPrivateApplicationService(
      new MutableClock("2026-09-28T12:00:00.000Z"),
      ids,
    );
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const variants = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(clientAuthorityFor(consultation), ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId: null,
        specification,
        promptVersion: "hair-v1",
        previewCount: 1,
      }),
    ) as readonly Variant[];
    const running = variants[0];
    if (running === undefined) {
      throw new Error("Expected one simulated variant.");
    }

    const outputAssetId = ids.next("asset");
    const callbackContext = commandContext(generationWorker, ids);
    const publishCommand: ApplicationCommand = {
      operation: "variant.publish",
      context: callbackContext,
      consultationId: consultation.id,
      variantId: running.id,
      callback: {
        attemptId: running.attemptId,
        outcome: "ready",
        outputAssetId,
      },
    };
    const first = await service.execute(publishCommand);
    const exactReplay = await service.execute(publishCommand);
    expect(exactReplay).toEqual(first);

    const conflictingTerminal = valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: running.id,
        callback: {
          attemptId: running.attemptId,
          outcome: "failed",
          safeFailureCode: "provider_timeout",
        },
      }),
    ) as Variant;
    expect(conflictingTerminal.state).toBe("ready");
    expect(conflictingTerminal.outputAssetId).toBe(outputAssetId);

    const staleOutputId = ids.next("asset");
    const stale = valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: running.id,
        callback: {
          attemptId: ids.next("attempt"),
          outcome: "ready",
          outputAssetId: staleOutputId,
        },
      }),
    ) as Variant;
    expect(stale.outputAssetId).toBe(outputAssetId);
    expect(service.snapshot()).toMatchObject({
      assets: 1,
      providerJobs: 0,
      workerTemporaryScopes: 0,
    });
  });

  it("purges source and reference assets with their grants after the final variant settles", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);

    valueOf(
      await service.execute({
        operation: "consent.record",
        context: commandContext(clientAuthorityFor(consultation), ids),
        consultationId: consultation.id,
        receiptId: ids.next("consentReceipt"),
        sessionId: ids.next("session"),
        policyVersion: currentConsentContractVersions.policy,
        retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
        providerDisclosureVersion:
          currentConsentContractVersions.providerDisclosure,
        acknowledgementMethod: "client_explicit_tap",
        adultConfirmed: true,
        referenceRightsConfirmed: true,
        scopes: [
          "portrait_processing",
          "ai_hairstyle_generation",
          "reference_image_processing",
        ],
      }),
    );
    const sourceAssetId = ids.next("asset");
    const referenceAssetId = ids.next("asset");
    for (const [assetId, assetClass] of [
      [sourceAssetId, "source_portrait"],
      [referenceAssetId, "inspiration_reference"],
    ] as const) {
      valueOf(
        await service.execute({
          operation: "asset.accept",
          context: commandContext(stylistA, ids),
          consultationId: consultation.id,
          assetId,
          assetClass,
          parentAssetIds: [],
        }),
      );
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId,
        }),
      );
    }
    expect(service.snapshot()).toMatchObject({ assets: 2, mediaGrants: 2 });

    const [running] = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId,
        specification,
        promptVersion: "hair-v1",
        previewCount: 1,
      }),
    ) as readonly Variant[];
    if (running === undefined) {
      throw new Error("Expected one simulated variant.");
    }
    const outputAssetId = ids.next("asset");
    valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: running.id,
        callback: {
          attemptId: running.attemptId,
          outcome: "ready",
          outputAssetId,
        },
      }),
    );

    expect(service.snapshot()).toMatchObject({ assets: 1, mediaGrants: 0 });
    for (const assetId of [sourceAssetId, referenceAssetId]) {
      expectGenericDenial(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId,
        }),
      );
    }
  });

  it("expires orphaned work and ignores late publication after its recorded input is purged", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids, {
      ...defaultRetentionPolicy,
      sourceAssetMaximumMs: 60 * 60 * 1_000,
    });
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const [running] = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId: null,
        specification,
        promptVersion: "hair-v1",
        previewCount: 1,
      }),
    ) as readonly Variant[];
    if (running === undefined) {
      throw new Error("Expected one simulated variant.");
    }

    clock.set("2026-09-28T12:30:00.000Z");
    const unrelatedSourceAssetId = ids.next("asset");
    valueOf(
      await service.execute({
        operation: "asset.accept",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        assetId: unrelatedSourceAssetId,
        assetClass: "source_portrait",
        parentAssetIds: [],
      }),
    );

    clock.set("2026-09-28T13:01:00.000Z");
    const lateOutputAssetId = ids.next("asset");
    const lateReady: ApplicationCommand = {
      operation: "variant.publish",
      context: commandContext(generationWorker, ids),
      consultationId: consultation.id,
      variantId: running.id,
      callback: {
        attemptId: running.attemptId,
        outcome: "ready",
        outputAssetId: lateOutputAssetId,
      },
    };
    const ignored = await service.execute(lateReady);
    expect(valueOf(ignored)).toMatchObject({
      id: running.id,
      state: "expired",
      outputAssetId: null,
    });
    expect(await service.execute(lateReady)).toEqual(ignored);
    expect(
      valueOf(
        await service.execute({
          operation: "variant.publish",
          context: commandContext(generationWorker, ids),
          consultationId: consultation.id,
          variantId: running.id,
          callback: {
            attemptId: running.attemptId,
            outcome: "failed",
            safeFailureCode: "provider_timeout",
          },
        }),
      ),
    ).toMatchObject({ state: "expired", outputAssetId: null });
    expect(service.snapshot()).toMatchObject({
      assets: 1,
      variants: 1,
      providerJobs: 0,
      workerTemporaryScopes: 0,
    });
    expect(
      valueOf(
        await service.query({
          operation: "consultation.read",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
        }),
      ),
    ).toMatchObject({ status: "ready" });
    expect(
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId: unrelatedSourceAssetId,
        }),
      ),
    ).toMatchObject({ assetId: unrelatedSourceAssetId });
  });

  it("keeps a usable partial result and settles remaining work when its input is purged", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids, {
      ...defaultRetentionPolicy,
      sourceAssetMaximumMs: 2 * 60 * 60 * 1_000,
    });
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const running = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId: null,
        specification,
        promptVersion: "hair-v1",
        previewCount: 2,
      }),
    ) as readonly Variant[];
    const readyCandidate = running[0];
    const pendingCandidate = running[1];
    if (readyCandidate === undefined || pendingCandidate === undefined) {
      throw new Error("Expected two simulated variants.");
    }

    clock.set("2026-09-28T13:00:00.000Z");
    const outputAssetId = ids.next("asset");
    valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: readyCandidate.id,
        callback: {
          attemptId: readyCandidate.attemptId,
          outcome: "ready",
          outputAssetId,
        },
      }),
    );
    expect(service.snapshot()).toMatchObject({
      assets: 2,
      providerJobs: 1,
      workerTemporaryScopes: 1,
    });

    clock.set("2026-09-28T14:01:00.000Z");
    expect(service.sweepExpiredAssets()).toEqual({
      assetsPurged: 1,
      mediaGrantsPurged: 0,
    });
    expect(service.snapshot()).toMatchObject({
      assets: 1,
      variants: 2,
      providerJobs: 0,
      workerTemporaryScopes: 0,
    });
    expect(
      valueOf(
        await service.query({
          operation: "consultation.read",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
        }),
      ),
    ).toMatchObject({ status: "reviewing" });
    expect(
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId: outputAssetId,
        }),
      ),
    ).toMatchObject({ assetId: outputAssetId });

    const lateOutputAssetId = ids.next("asset");
    expect(
      valueOf(
        await service.execute({
          operation: "variant.publish",
          context: commandContext(generationWorker, ids),
          consultationId: consultation.id,
          variantId: pendingCandidate.id,
          callback: {
            attemptId: pendingCandidate.attemptId,
            outcome: "ready",
            outputAssetId: lateOutputAssetId,
          },
        }),
      ),
    ).toMatchObject({ state: "expired", outputAssetId: null });
    expect(service.snapshot()).toMatchObject({
      assets: 1,
      providerJobs: 0,
      workerTemporaryScopes: 0,
    });
  });

  it("lets the retention scheduler purge expired assets without product traffic", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids, {
      ...defaultRetentionPolicy,
      sourceAssetMaximumMs: 60 * 60 * 1_000,
    });
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    valueOf(
      await service.query({
        operation: "media.authorize",
        context: queryContext(stylistA, ids),
        consultationId: consultation.id,
        assetId: sourceAssetId,
      }),
    );
    expect(service.snapshot()).toMatchObject({ assets: 1, mediaGrants: 1 });

    clock.set("2026-09-28T13:01:00.000Z");
    expect(service.sweepExpiredAssets()).toEqual({
      assetsPurged: 1,
      mediaGrantsPurged: 1,
    });
    expect(service.snapshot()).toMatchObject({ assets: 0, mediaGrants: 0 });
    expect(service.sweepExpiredAssets()).toEqual({
      assetsPurged: 0,
      mediaGrantsPurged: 0,
    });
  });

  it("keeps generation inputs for a failed retry, then blocks access and purges them at their short deadline", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const running = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId: null,
        specification,
        promptVersion: "hair-v1",
        previewCount: 2,
      }),
    ) as readonly Variant[];
    const readyCandidate = running[0];
    const failedCandidate = running[1];
    if (readyCandidate === undefined || failedCandidate === undefined) {
      throw new Error("Expected two simulated variants.");
    }

    const outputAssetId = ids.next("asset");
    const ready = valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: readyCandidate.id,
        callback: {
          attemptId: readyCandidate.attemptId,
          outcome: "ready",
          outputAssetId,
        },
      }),
    ) as Variant;
    valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: failedCandidate.id,
        callback: {
          attemptId: failedCandidate.attemptId,
          outcome: "failed",
          safeFailureCode: "provider_timeout",
        },
      }),
    );
    expect(service.snapshot().assets).toBe(2);

    const retried = valueOf(
      await service.execute({
        operation: "variant.retry",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: failedCandidate.id,
        nextAttemptId: ids.next("attempt"),
      }),
    ) as Variant;
    valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: retried.id,
        callback: {
          attemptId: retried.attemptId,
          outcome: "failed",
          safeFailureCode: "provider_timeout",
        },
      }),
    );
    valueOf(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: ready.id,
        feasibility: "feasible-now",
        serviceNotes: "Keep the perimeter balanced.",
        maintenanceNotes: "Review the shape in eight weeks.",
      }),
    );
    valueOf(
      await service.execute({
        operation: "consultation.save",
        context: commandContext(clientAuthorityFor(consultation), ids),
        consultationId: consultation.id,
        receiptId: ids.next("saveReceipt"),
        disclosureVersion: currentSaveDisclosureVersion,
        saveChoice: "save_30_days",
        acknowledgementMethod: "client_explicit_tap",
      }),
    );

    clock.set("2026-09-29T11:50:00.000Z");
    expect(
      await service.execute({
        operation: "variant.retry",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: failedCandidate.id,
        nextAttemptId: ids.next("attempt"),
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });
    expect(service.snapshot().assets).toBe(2);

    clock.set("2026-09-29T12:01:00.000Z");
    expect(
      await service.execute({
        operation: "variant.retry",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: failedCandidate.id,
        nextAttemptId: ids.next("attempt"),
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });
    expect(service.snapshot().assets).toBe(1);
    expect(
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId: outputAssetId,
        }),
      ),
    ).toMatchObject({ assetId: outputAssetId });
  });

  it("keeps shares read-only and limits their media scope to selected generated results", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const { variant, outputAssetId } = await generateReadyVariant(
      service,
      ids,
      consultation,
      sourceAssetId,
    );
    expect(
      await service.execute({
        operation: "share.create",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        shareId: ids.next("share"),
        capabilityId: ids.next("capability"),
        variantIds: [variant.id],
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });
    const share = await createShare(service, ids, consultation, variant);
    const shareActor: Actor = {
      kind: "private_share",
      tenantId: tenantA,
      consultationId: consultation.id,
      shareId: share.id,
      capabilityId: share.capabilityId,
      expiresAt: share.expiresAt,
      revokedAt: null,
    };

    const sharedBrief = valueOf(
      await service.query({
        operation: "share.resolve",
        context: queryContext(shareActor, ids),
        shareId: share.id,
      }),
    ) as SharedConsultationBrief;
    expect(sharedBrief).toEqual({
      selectedVariant: {
        variantId: variant.id,
        outputAssetId,
        specification,
      },
      agreement: {
        feasibility: "feasible-now",
        serviceNotes: "Keep the perimeter balanced.",
        maintenanceNotes: "Review the shape in eight weeks.",
      },
      expiresAt: share.expiresAt,
      disclosure:
        "AI visualization only. The preview is not a guaranteed service outcome or exact chemical color prediction.",
    });
    expect(Object.keys(sharedBrief)).toEqual([
      "selectedVariant",
      "agreement",
      "expiresAt",
      "disclosure",
    ]);
    expect(Object.keys(sharedBrief.selectedVariant)).toEqual([
      "variantId",
      "outputAssetId",
      "specification",
    ]);
    expect(JSON.stringify(sharedBrief)).not.toMatch(
      /source|reference|client|tenant|capability|attempt|idempotency|prompt|filename|url/i,
    );

    expect(
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(shareActor, ids),
          consultationId: consultation.id,
          assetId: outputAssetId,
        }),
      ),
    ).toMatchObject({ assetId: outputAssetId, cachePolicy: "private_no_store" });

    expectGenericDenial(
      await service.query({
        operation: "media.authorize",
        context: queryContext(shareActor, ids),
        consultationId: consultation.id,
        assetId: sourceAssetId,
      }),
    );
    expectGenericDenial(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(shareActor, ids),
        consultationId: consultation.id,
        deletionRequestId: ids.next("deletionRequest"),
        statusCapabilityId: ids.next("capability"),
        reason: "user_request",
      }),
    );
    expect(service.snapshot().deletionReceipts).toBe(0);

    valueOf(
      await service.execute({
        operation: "share.revoke",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        shareId: share.id,
      }),
    );
    expectGenericDenial(
      await service.query({
        operation: "share.resolve",
        context: queryContext(shareActor, ids),
        shareId: share.id,
      }),
    );
  });

  it("binds private shares to the agreed service brief and revokes stale plans", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const running = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId,
        referenceAssetId: null,
        specification,
        promptVersion: "hair-v1",
        previewCount: 2,
      }),
    ) as readonly Variant[];
    const ready: Variant[] = [];
    for (const variant of running) {
      ready.push(
        valueOf(
          await service.execute({
            operation: "variant.publish",
            context: commandContext(generationWorker, ids),
            consultationId: consultation.id,
            variantId: variant.id,
            callback: {
              attemptId: variant.attemptId,
              outcome: "ready",
              outputAssetId: ids.next("asset"),
            },
          }),
        ) as Variant,
      );
    }
    const first = ready[0];
    const second = ready[1];
    if (first === undefined || second === undefined) {
      throw new Error("Expected two simulated variants.");
    }

    valueOf(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: first.id,
        feasibility: "feasible-now",
        serviceNotes: "Use the first direction.",
        maintenanceNotes: "Review in eight weeks.",
      }),
    );
    expect(
      await service.execute({
        operation: "share.create",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        shareId: ids.next("share"),
        capabilityId: ids.next("capability"),
        variantIds: [second.id],
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });

    const firstShare = valueOf(
      await service.execute({
        operation: "share.create",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        shareId: ids.next("share"),
        capabilityId: ids.next("capability"),
        variantIds: [first.id],
      }),
    ) as PrivateShare;
    valueOf(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: second.id,
        feasibility: "needs-preparation",
        serviceNotes: "Use the second direction after preparation.",
        maintenanceNotes: "Confirm timing before service.",
      }),
    );
    const staleShareActor: Actor = {
      kind: "private_share",
      tenantId: tenantA,
      consultationId: consultation.id,
      shareId: firstShare.id,
      capabilityId: firstShare.capabilityId,
      expiresAt: firstShare.expiresAt,
      revokedAt: null,
    };
    expectGenericDenial(
      await service.query({
        operation: "share.resolve",
        context: queryContext(staleShareActor, ids),
        shareId: firstShare.id,
      }),
    );

    const secondShare = valueOf(
      await service.execute({
        operation: "share.create",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        shareId: ids.next("share"),
        capabilityId: ids.next("capability"),
        variantIds: [second.id],
      }),
    ) as PrivateShare;
    const revisedSpecification = {
      ...specification,
      silhouette: "short textured crop",
    };
    const revised = valueOf(
      await service.execute({
        operation: "consultation.update",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        specification: revisedSpecification,
      }),
    ) as ConsultationRecord;
    expect(revised).toMatchObject({ status: "ready", agreement: null });
    const secondShareActor: Actor = {
      kind: "private_share",
      tenantId: tenantA,
      consultationId: consultation.id,
      shareId: secondShare.id,
      capabilityId: secondShare.capabilityId,
      expiresAt: secondShare.expiresAt,
      revokedAt: null,
    };
    expectGenericDenial(
      await service.query({
        operation: "share.resolve",
        context: queryContext(secondShareActor, ids),
        shareId: secondShare.id,
      }),
    );
    expect(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: second.id,
        feasibility: "feasible-now",
        serviceNotes: "This stale result must not be accepted.",
        maintenanceNotes: "",
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });

    const replacementSourceAssetId = ids.next("asset");
    valueOf(
      await service.execute({
        operation: "asset.accept",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        assetId: replacementSourceAssetId,
        assetClass: "source_portrait",
        parentAssetIds: [],
      }),
    );
    const [replacementRunning] = valueOf(
      await service.execute({
        operation: "generation.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        sourceAssetId: replacementSourceAssetId,
        referenceAssetId: null,
        specification: revisedSpecification,
        promptVersion: "hair-v2",
        previewCount: 1,
      }),
    ) as readonly Variant[];
    if (replacementRunning === undefined) {
      throw new Error("Expected one replacement variant.");
    }
    const replacement = valueOf(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: replacementRunning.id,
        callback: {
          attemptId: replacementRunning.attemptId,
          outcome: "ready",
          outputAssetId: ids.next("asset"),
        },
      }),
    ) as Variant;
    expect(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: second.id,
        feasibility: "feasible-now",
        serviceNotes: "The superseded result must remain unavailable.",
        maintenanceNotes: "",
      }),
    ).toEqual({ ok: false, code: "invalid_state", retryable: false });
    expect(
      valueOf(
        await service.execute({
          operation: "consultation.agree",
          context: commandContext(stylistA, ids),
          consultationId: consultation.id,
          variantId: replacement.id,
          feasibility: "feasible-now",
          serviceNotes: "Use the replacement direction.",
          maintenanceNotes: "Review in eight weeks.",
        }),
      ),
    ).toMatchObject({
      status: "agreed",
      agreement: { variantId: replacement.id },
    });
  });

  it("extends saved result retention without extending source portrait access", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const { variant, outputAssetId } = await generateReadyVariant(
      service,
      ids,
      consultation,
      sourceAssetId,
    );

    const agreed = valueOf(
      await service.execute({
        operation: "consultation.agree",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        variantId: variant.id,
        feasibility: "feasible-now",
        serviceNotes: "Keep the perimeter balanced.",
        maintenanceNotes: "Review the shape in eight weeks.",
      }),
    ) as ConsultationRecord;
    expect(agreed.agreement).toMatchObject({
      variantId: variant.id,
      feasibility: "feasible-now",
      serviceNotes: "Keep the perimeter balanced.",
      maintenanceNotes: "Review the shape in eight weeks.",
    });
    const saveInput = {
      operation: "consultation.save" as const,
      consultationId: consultation.id,
      receiptId: ids.next("saveReceipt"),
      disclosureVersion: currentSaveDisclosureVersion,
      saveChoice: "save_30_days" as const,
      acknowledgementMethod: "client_explicit_tap" as const,
    };
    for (const actor of [stylistA, unassignedAdminA]) {
      expectGenericDenial(
        await service.execute({
          ...saveInput,
          context: commandContext(actor, ids),
        }),
      );
    }
    expect(
      await service.execute({
        ...saveInput,
        context: commandContext(clientAuthorityFor(consultation), ids),
        disclosureVersion: "save-v0",
      }),
    ).toEqual({ ok: false, code: "invalid_request", retryable: false });
    expect(
      await service.execute({
        ...saveInput,
        context: commandContext(clientAuthorityFor(consultation), ids),
        acknowledgementMethod: "staff_checkbox" as never,
      }),
    ).toEqual({ ok: false, code: "invalid_request", retryable: false });
    expect(service.snapshot().saveReceipts).toBe(0);

    const saveCommand: ApplicationCommand = {
      ...saveInput,
      context: commandContext(clientAuthorityFor(consultation), ids),
    };
    const saveReceipt = valueOf(
      await service.execute(saveCommand),
    ) as SaveReceipt;
    expect(saveReceipt).toMatchObject({
      tenantId: consultation.tenantId,
      consultationId: consultation.id,
      disclosureVersion: currentSaveDisclosureVersion,
      saveChoice: "save_30_days",
      acknowledgementMethod: "client_explicit_tap",
      acknowledgedAt: "2026-09-28T12:00:00.000Z",
      accessExpiresAt: "2026-10-28T11:45:00.000Z",
    });
    expect(JSON.stringify(saveReceipt)).not.toMatch(
      /clientName|filename|notes|prompt|portrait|signedUrl/,
    );
    expect(service.snapshot().saveReceipts).toBe(1);

    clock.set("2026-09-28T13:00:00.000Z");
    expect(await service.execute(saveCommand)).toEqual({
      ok: true,
      value: saveReceipt,
    });
    const saved = valueOf(
      await service.query({
        operation: "consultation.read",
        context: queryContext(stylistA, ids),
        consultationId: consultation.id,
      }),
    ) as ConsultationRecord;
    expect(saved).toMatchObject({
      saveReceiptId: saveReceipt.id,
      retention: {
        basisAt: "2026-09-28T12:00:00.000Z",
        accessExpiresAt: saveReceipt.accessExpiresAt,
      },
    });

    clock.set("2026-09-29T13:00:00.000Z");
    expectGenericDenial(
      await service.query({
        operation: "media.authorize",
        context: queryContext(stylistA, ids),
        consultationId: consultation.id,
        assetId: sourceAssetId,
      }),
    );
    expect(
      valueOf(
        await service.query({
          operation: "media.authorize",
          context: queryContext(stylistA, ids),
          consultationId: consultation.id,
          assetId: outputAssetId,
        }),
      ),
    ).toMatchObject({ assetId: outputAssetId, cachePolicy: "private_no_store" });
  });

  it("revokes access immediately and verifies every simulated deletion component", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const { variant, outputAssetId } = await generateReadyVariant(
      service,
      ids,
      consultation,
      sourceAssetId,
    );
    const share = await createShare(service, ids, consultation, variant);
    valueOf(
      await service.query({
        operation: "media.authorize",
        context: queryContext(stylistA, ids),
        consultationId: consultation.id,
        assetId: outputAssetId,
      }),
    );

    const deletionRequestId = ids.next("deletionRequest");
    const statusCapabilityId = ids.next("capability");
    const receipt = valueOf(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        deletionRequestId,
        statusCapabilityId,
        reason: "user_request",
      }),
    );
    if (!("components" in receipt)) {
      throw new Error("Expected a deletion receipt.");
    }

    expect(receipt.state).toBe("verified");
    expect(receipt.components).toHaveLength(9);
    expect(
      receipt.components.every(
        (component) =>
          component.status === "verified_absent" && component.attempts === 1,
      ),
    ).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(
      /objectKey|signedUrl|filename|prompt|clientName|providerError/,
    );
    expect(service.snapshot()).toEqual({
      consultations: 1,
      consentReceipts: 1,
      saveReceipts: 0,
      assets: 0,
      variants: 0,
      activeShares: 0,
      mediaGrants: 0,
      specifications: 0,
      providerJobs: 0,
      workerTemporaryScopes: 0,
      indexEntries: 0,
      deletionReceipts: 1,
      backupSuppressions: 1,
      contentBearingIdempotencyResponses: 0,
    });

    expectGenericDenial(
      await service.query({
        operation: "consultation.read",
        context: queryContext(stylistA, ids),
        consultationId: consultation.id,
      }),
    );
    const shareActor: Actor = {
      kind: "private_share",
      tenantId: tenantA,
      consultationId: consultation.id,
      shareId: share.id,
      capabilityId: share.capabilityId,
      expiresAt: share.expiresAt,
      revokedAt: null,
    };
    expectGenericDenial(
      await service.query({
        operation: "share.resolve",
        context: queryContext(shareActor, ids),
        shareId: share.id,
      }),
    );
    expectGenericDenial(
      await service.execute({
        operation: "variant.publish",
        context: commandContext(generationWorker, ids),
        consultationId: consultation.id,
        variantId: variant.id,
        callback: {
          attemptId: variant.attemptId,
          outcome: "ready",
          outputAssetId: ids.next("asset"),
        },
      }),
    );
    expect(service.snapshot().assets).toBe(0);

    const statusActor: Actor = {
      kind: "deletion_status",
      tenantId: tenantA,
      deletionRequestId,
      capabilityId: statusCapabilityId,
      expiresAt: receipt.schedule.statusCapabilityExpiresAt,
    };
    expect(
      valueOf(
        await service.query({
          operation: "deletion.status.read",
          context: queryContext(statusActor, ids),
          deletionRequestId,
        }),
      ),
    ).toEqual(receipt);

    const repeated = valueOf(
      await service.execute({
        operation: "deletion.request",
        context: commandContext(stylistA, ids),
        consultationId: consultation.id,
        deletionRequestId: ids.next("deletionRequest"),
        statusCapabilityId: ids.next("capability"),
        reason: "user_request",
      }),
    );
    expect(repeated).toEqual(receipt);
    expect(service.snapshot().deletionReceipts).toBe(1);
  });

  it("revokes consultation and share access at expiry before cleanup runs", async () => {
    const ids = new SequentialOpaqueIds();
    const clock = new MutableClock("2026-09-28T12:00:00.000Z");
    const service = new InMemoryPrivateApplicationService(clock, ids);
    const consultation = await createConsultation(service, ids);
    const sourceAssetId = await consentAndAcceptSource(
      service,
      ids,
      consultation,
    );
    const { variant } = await generateReadyVariant(
      service,
      ids,
      consultation,
      sourceAssetId,
    );
    const share = await createShare(service, ids, consultation, variant);
    const shareActor: Actor = {
      kind: "private_share",
      tenantId: tenantA,
      consultationId: consultation.id,
      shareId: share.id,
      capabilityId: share.capabilityId,
      expiresAt: share.expiresAt,
      revokedAt: null,
    };

    clock.set("2026-09-29T12:00:00.000Z");
    const expiredConsultation = await service.query({
      operation: "consultation.read",
      context: queryContext(stylistA, ids),
      consultationId: consultation.id,
    });
    const expiredShare = await service.query({
      operation: "share.resolve",
      context: queryContext(shareActor, ids),
      shareId: share.id,
    });
    expectGenericDenial(expiredConsultation);
    expect(expiredShare).toEqual(expiredConsultation);

    const expiryReceipt = valueOf(
      await service.execute({
        operation: "retention.expire",
        context: commandContext(retentionWorker, ids),
        consultationId: consultation.id,
        deletionRequestId: ids.next("deletionRequest"),
        statusCapabilityId: ids.next("capability"),
      }),
    );
    if (!("reason" in expiryReceipt)) {
      throw new Error("Expected an expiry deletion receipt.");
    }
    expect(expiryReceipt).toMatchObject({ reason: "expiry", state: "verified" });
    expect(service.snapshot()).toMatchObject({
      assets: 0,
      variants: 0,
      activeShares: 0,
      backupSuppressions: 1,
    });
  });
});

