import { describe, expect, it } from "vitest";

import {
  applicationOperations,
  authorizeOperation,
  operationAuthorizationRequirements,
  type Actor,
  type AuthorizationResource,
} from "./authorization";
import { applicationContractCoversEveryOperation } from "./application-service";
import {
  deriveConsultationRetention,
  type Clock,
  type IsoInstant,
} from "./clock";
import { defaultHairSpecification } from "./consultation";
import { decideIdempotency, type IdempotencyRecord } from "./idempotency";
import { parseOpaqueId } from "./identifiers";
import {
  acceptOpaqueAsset,
  attachConsentReceipt,
  canTransitionDeletion,
  createConsultationAgreement,
  createConsentReceipt,
  createConsultationRecord,
  createDeletionReceipt,
  createPrivateShare,
  createSaveReceipt,
  currentConsentContractVersions,
  currentSaveDisclosureVersion,
  createVariant,
  decideVariantCallback,
  sharedConsultationDisclosure,
  type SharedConsultationBrief,
} from "./records";

class FixedClock implements Clock {
  public constructor(private instant: string) {}

  public now(): Date {
    return new Date(this.instant);
  }

  public set(instant: string): void {
    this.instant = instant;
  }
}

const ids = {
  actor: parseOpaqueId("actor", "act_01JTESTACTOR00001"),
  otherActor: parseOpaqueId("actor", "act_01JTESTACTOR00002"),
  asset: parseOpaqueId("asset", "ast_01JTESTASSET00001"),
  attempt: parseOpaqueId("attempt", "atm_01JTESTATTEMPT001"),
  capability: parseOpaqueId("capability", "cap_01JTESTCAPABILITY1"),
  consent: parseOpaqueId("consentReceipt", "csr_01JTESTCONSENT001"),
  saveReceipt: parseOpaqueId("saveReceipt", "svr_01JTESTSAVE000001"),
  consultation: parseOpaqueId("consultation", "con_01JTESTCONSULT001"),
  otherConsultation: parseOpaqueId(
    "consultation",
    "con_01JTESTCONSULT002",
  ),
  deletion: parseOpaqueId("deletionRequest", "del_01JTESTDELETE0001"),
  otherDeletion: parseOpaqueId(
    "deletionRequest",
    "del_01JTESTDELETE0002",
  ),
  fingerprint: parseOpaqueId("fingerprint", "fpr_01JTESTFINGERPRNT1"),
  idempotency: parseOpaqueId("idempotency", "key_01JTESTIDEMPOTENT1"),
  result: parseOpaqueId("result", "res_01JTESTRESULT0001"),
  privacyRequest: parseOpaqueId(
    "privacyRequest",
    "prq_01JTESTPRIVACY001",
  ),
  otherPrivacyRequest: parseOpaqueId(
    "privacyRequest",
    "prq_01JTESTPRIVACY002",
  ),
  session: parseOpaqueId("session", "ses_01JTESTSESSION001"),
  share: parseOpaqueId("share", "shr_01JTESTSHARE00001"),
  tenant: parseOpaqueId("tenant", "ten_01JTESTTENANT0001"),
  otherTenant: parseOpaqueId("tenant", "ten_01JTESTTENANT0002"),
  variant: parseOpaqueId("variant", "var_01JTESTVARIANT001"),
};

function createConsentedConsultation(clock: Clock) {
  const draft = createConsultationRecord(
    {
      id: ids.consultation,
      tenantId: ids.tenant,
      createdByActorId: ids.actor,
    },
    clock,
  );
  const receipt = createConsentReceipt(
    {
      id: ids.consent,
      tenantId: ids.tenant,
      consultationId: ids.consultation,
      sessionId: ids.session,
      policyVersion: currentConsentContractVersions.policy,
      retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
      providerDisclosureVersion:
        currentConsentContractVersions.providerDisclosure,
      acknowledgementMethod: "client_explicit_tap",
      adultConfirmed: true,
      referenceRightsConfirmed: false,
      scopes: ["portrait_processing", "ai_hairstyle_generation"],
    },
    draft,
    clock,
  );

  return { consultation: attachConsentReceipt(draft, receipt), receipt };
}

describe("opaque identifiers", () => {
  it("accepts only a server-shaped handle for the requested kind", () => {
    expect(ids.tenant).toBe("ten_01JTESTTENANT0001");
    expect(() =>
      parseOpaqueId("tenant", "con_01JTESTTENANT0001"),
    ).toThrow("Invalid opaque tenant identifier");
  });
});

describe("one clock and retention policy", () => {
  it("accepts only current client-acknowledged consent contract versions", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const draft = createConsultationRecord(
      {
        id: ids.consultation,
        tenantId: ids.tenant,
        createdByActorId: ids.actor,
      },
      clock,
    );
    const valid = {
      id: ids.consent,
      tenantId: ids.tenant,
      consultationId: ids.consultation,
      sessionId: ids.session,
      policyVersion: currentConsentContractVersions.policy,
      retentionNoticeVersion: currentConsentContractVersions.retentionNotice,
      providerDisclosureVersion:
        currentConsentContractVersions.providerDisclosure,
      acknowledgementMethod: "client_explicit_tap" as const,
      adultConfirmed: true,
      referenceRightsConfirmed: false,
      scopes: ["portrait_processing", "ai_hairstyle_generation"] as const,
    };

    expect(createConsentReceipt(valid, draft, clock)).toMatchObject({
      acknowledgementMethod: "client_explicit_tap",
      acknowledgedAt: "2026-09-26T12:00:00.000Z",
    });
    expect(() =>
      createConsentReceipt(
        { ...valid, providerDisclosureVersion: "provider-v0" },
        draft,
        clock,
      ),
    ).toThrow("Consent contract version is not current");
    expect(() =>
      createConsentReceipt(
        { ...valid, acknowledgementMethod: "staff_checkbox" as never },
        draft,
        clock,
      ),
    ).toThrow("explicit tap acknowledgement");
  });

  it("derives access, purge, and destruction from one policy schedule", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const retention = deriveConsultationRetention(
      clock,
      "consultation_created",
    );

    expect(retention).toMatchObject({
      basisAt: "2026-09-26T12:00:00.000Z",
      accessExpiresAt: "2026-09-27T11:45:00.000Z",
      purgeStartsAt: "2026-09-27T11:45:00.000Z",
      deleteDueAt: "2026-09-27T12:00:00.000Z",
      policyVersion: "retention-v1",
    });
  });

  it("makes a later asset inherit the earlier consultation deadline", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const { consultation, receipt } = createConsentedConsultation(clock);
    clock.set("2026-09-27T10:00:00.000Z");

    const asset = acceptOpaqueAsset(
      {
        id: ids.asset,
        tenantId: ids.tenant,
        consultationId: ids.consultation,
        assetClass: "source_portrait",
        parentAssetIds: [],
      },
      consultation,
      receipt,
      clock,
    );

    expect(asset.retention.deleteDueAt).toBe(
      consultation.retention.deleteDueAt,
    );
  });

  it("does not accept a reference without recorded rights and scope", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const { consultation, receipt } = createConsentedConsultation(clock);

    expect(() =>
      acceptOpaqueAsset(
        {
          id: ids.asset,
          tenantId: ids.tenant,
          consultationId: ids.consultation,
          assetClass: "inspiration_reference",
          parentAssetIds: [],
        },
        consultation,
        receipt,
        clock,
      ),
    ).toThrow("Reference-image authorization is required");
  });

  it("creates a content-free save receipt from the current disclosure and computed deadline", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const { consultation } = createConsentedConsultation(clock);
    const reviewing = { ...consultation, status: "reviewing" as const };
    const agreed = {
      ...reviewing,
      status: "agreed" as const,
      agreement: createConsultationAgreement(
        {
          variantId: ids.variant,
          feasibility: "feasible-now",
          serviceNotes: "Keep the agreed shape.",
          maintenanceNotes: "Review in eight weeks.",
        },
        reviewing,
        clock,
      ),
    };
    const savedRetention = deriveConsultationRetention(
      clock,
      "consultation_saved",
    );
    const valid = {
      id: ids.saveReceipt,
      tenantId: ids.tenant,
      consultationId: ids.consultation,
      disclosureVersion: currentSaveDisclosureVersion,
      saveChoice: "save_30_days" as const,
      acknowledgementMethod: "client_explicit_tap" as const,
    };

    expect(createSaveReceipt(valid, agreed, savedRetention)).toEqual({
      ...valid,
      acknowledgedAt: savedRetention.basisAt,
      accessExpiresAt: savedRetention.accessExpiresAt,
    });
    expect(() =>
      createSaveReceipt(
        { ...valid, disclosureVersion: "save-v0" as never },
        agreed,
        savedRetention,
      ),
    ).toThrow("Save receipt is invalid");
    expect(() =>
      createSaveReceipt(
        { ...valid, acknowledgementMethod: "staff_checkbox" as never },
        agreed,
        savedRetention,
      ),
    ).toThrow("Save receipt is invalid");
  });
});

describe("authorization", () => {
  const clock = new FixedClock("2026-09-26T12:00:00.000Z");
  const resource: AuthorizationResource = {
    tenantId: ids.tenant,
    consultationId: ids.consultation,
    assignedActorIds: [ids.actor],
    controlCapabilityId: ids.capability,
    accessExpiresAt: "2026-09-27T11:45:00.000Z" as IsoInstant,
    inaccessible: false,
  };

  it("allows active own-tenant members to create a consultation without an existing assignment", () => {
    const creator: Actor = {
      kind: "tenant_member",
      actorId: ids.otherActor,
      tenantId: ids.tenant,
      role: "salon_admin",
      membership: "active",
    };

    expect(
      authorizeOperation(
        creator,
        "consultation.create",
        {
          tenantId: ids.tenant,
          assignedActorIds: [],
          inaccessible: false,
        },
        clock,
      ),
    ).toEqual({ allowed: true });
  });

  it("requires explicit assignment for every tenant-member consultation operation", () => {
    const assigned: Actor = {
      kind: "tenant_member",
      actorId: ids.actor,
      tenantId: ids.tenant,
      role: "stylist",
      membership: "active",
    };
    const unassignedStylist: Actor = {
      ...assigned,
      actorId: ids.otherActor,
    };
    const unassignedAdmin: Actor = {
      ...unassignedStylist,
      role: "salon_admin",
    };
    const consultationOperations = [
      "asset.accept",
      "consultation.read",
      "consultation.update",
      "generation.request",
      "variant.retry",
      "consultation.agree",
      "share.create",
      "share.revoke",
      "media.authorize",
      "deletion.request",
      "deletion.status.read",
    ] as const;

    for (const operation of consultationOperations) {
      expect(authorizeOperation(assigned, operation, resource, clock)).toEqual({
        allowed: true,
      });
      expect(
        authorizeOperation(unassignedStylist, operation, resource, clock),
      ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
      expect(
        authorizeOperation(unassignedAdmin, operation, resource, clock),
      ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
    }
  });

  it("reserves consent and saved-retention acknowledgement for the client authority", () => {
    const staff: Actor = {
      kind: "tenant_member",
      actorId: ids.actor,
      tenantId: ids.tenant,
      role: "stylist",
      membership: "active",
    };
    const admin: Actor = { ...staff, role: "salon_admin" };
    const clientAuthority: Actor = {
      kind: "consultation_control",
      tenantId: ids.tenant,
      consultationId: ids.consultation,
      capabilityId: ids.capability,
      expiresAt: "2026-09-27T11:45:00.000Z" as IsoInstant,
      revokedAt: null,
    };

    for (const operation of ["consent.record", "consultation.save"] as const) {
      expect(authorizeOperation(staff, operation, resource, clock)).toEqual({
        allowed: false,
        reason: "not_found_or_unauthorized",
      });
      expect(authorizeOperation(admin, operation, resource, clock)).toEqual({
        allowed: false,
        reason: "not_found_or_unauthorized",
      });
      expect(
        authorizeOperation(clientAuthority, operation, resource, clock),
      ).toEqual({ allowed: true });
    }
  });

  it("denies cross-tenant and removed members with one non-disclosing result", () => {
    const crossTenant: Actor = {
      kind: "tenant_member",
      actorId: ids.actor,
      tenantId: ids.otherTenant,
      role: "stylist",
      membership: "active",
    };
    const removed: Actor = {
      ...crossTenant,
      tenantId: ids.tenant,
      membership: "removed",
    };

    expect(
      authorizeOperation(crossTenant, "consultation.read", resource, clock),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
    expect(
      authorizeOperation(removed, "consultation.read", resource, clock),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
  });

  it("keeps a private share read-only", () => {
    const shareActor: Actor = {
      kind: "private_share",
      tenantId: ids.tenant,
      consultationId: ids.consultation,
      shareId: ids.share,
      capabilityId: ids.capability,
      expiresAt: "2026-09-27T11:45:00.000Z" as IsoInstant,
      revokedAt: null,
    };
    const shareResource: AuthorizationResource = {
      ...resource,
      shareId: ids.share,
      shareCapabilityId: ids.capability,
    };

    expect(
      authorizeOperation(shareActor, "share.resolve", shareResource, clock),
    ).toEqual({ allowed: true });
    expect(
      authorizeOperation(shareActor, "deletion.request", shareResource, clock),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
  });

  it("binds a verified privacy request to one consultation in its tenant", () => {
    const privacyOperator: Actor = {
      kind: "privacy_operator",
      actorId: ids.actor,
      tenantId: ids.tenant,
      privacyRequestId: ids.privacyRequest,
      targetConsultationId: ids.consultation,
      requestVerified: true,
    };
    const intendedResource: AuthorizationResource = {
      ...resource,
      privacyRequestId: ids.privacyRequest,
    };
    const otherConsultationResource: AuthorizationResource = {
      ...intendedResource,
      consultationId: ids.otherConsultation,
    };

    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.request",
        intendedResource,
        clock,
      ),
    ).toEqual({ allowed: true });
    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.request",
        otherConsultationResource,
        clock,
      ),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.request",
        {
          ...intendedResource,
          privacyRequestId: ids.otherPrivacyRequest,
        },
        clock,
      ),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
  });

  it("binds privacy deletion-status access to the intended deletion request", () => {
    const privacyOperator: Actor = {
      kind: "privacy_operator",
      actorId: ids.actor,
      tenantId: ids.tenant,
      privacyRequestId: ids.privacyRequest,
      targetConsultationId: ids.consultation,
      targetDeletionRequestId: ids.deletion,
      requestVerified: true,
    };
    const intendedResource: AuthorizationResource = {
      ...resource,
      privacyRequestId: ids.privacyRequest,
      deletionRequestId: ids.deletion,
    };

    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.status.read",
        intendedResource,
        clock,
      ),
    ).toEqual({ allowed: true });
    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.status.read",
        { ...intendedResource, deletionRequestId: ids.otherDeletion },
        clock,
      ),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
    expect(
      authorizeOperation(
        privacyOperator,
        "deletion.status.read",
        { ...intendedResource, consultationId: ids.otherConsultation },
        clock,
      ),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
    expect(
      authorizeOperation(
        {
          kind: "privacy_operator",
          actorId: ids.actor,
          tenantId: ids.tenant,
          privacyRequestId: ids.privacyRequest,
          targetConsultationId: ids.consultation,
          requestVerified: true,
        },
        "deletion.status.read",
        intendedResource,
        clock,
      ),
    ).toEqual({ allowed: false, reason: "not_found_or_unauthorized" });
  });

  it("has an explicit authorization rule for every contract operation", () => {
    expect(applicationContractCoversEveryOperation).toBe(true);
    expect(Object.keys(operationAuthorizationRequirements).sort()).toEqual([...applicationOperations].sort());
  });
});

describe("idempotency and terminal behavior", () => {
  it("replays a completed command and conflicts on changed input", () => {
    const request = {
      tenantId: ids.tenant,
      operation: "generation.request" as const,
      key: ids.idempotency,
      fingerprint: ids.fingerprint,
    };
    const record: IdempotencyRecord = {
      ...request,
      state: "completed",
      resultId: ids.result,
      createdAt: "2026-09-26T12:00:00.000Z" as IsoInstant,
      expiresAt: "2026-10-26T12:00:00.000Z" as IsoInstant,
    };

    expect(decideIdempotency(request, record)).toEqual({
      action: "replay",
      resultId: ids.result,
    });
    expect(
      decideIdempotency(
        {
          ...request,
          fingerprint: parseOpaqueId(
            "fingerprint",
            "fpr_01JTESTFINGERPRNT2",
          ),
        },
        record,
      ),
    ).toEqual({ action: "conflict" });
  });

  it("ignores stale callbacks and treats a repeated terminal callback as duplicate", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const { consultation } = createConsentedConsultation(clock);
    const queued = createVariant(
      {
        id: ids.variant,
        tenantId: ids.tenant,
        consultationId: ids.consultation,
        index: 0,
        specification: defaultHairSpecification,
        promptVersion: "hair-v1",
        attemptId: ids.attempt,
        idempotencyKey: ids.idempotency,
      },
      consultation,
    );
    const running = { ...queued, state: "running" as const };
    const readyCallback = {
      attemptId: ids.attempt,
      outcome: "ready" as const,
      outputAssetId: ids.asset,
    };
    const applied = decideVariantCallback(running, readyCallback);

    expect(applied.action).toBe("apply");
    if (applied.action !== "apply") {
      throw new Error("Expected callback to apply.");
    }
    expect(decideVariantCallback(applied.next, readyCallback).action).toBe(
      "duplicate",
    );
    expect(
      decideVariantCallback(running, {
        ...readyCallback,
        attemptId: parseOpaqueId("attempt", "atm_01JTESTATTEMPT002"),
      }),
    ).toEqual({ action: "ignore", reason: "stale_attempt" });
  });

  it("makes deletion schedules immediate and terminal states monotonic", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const receipt = createDeletionReceipt(
      {
        id: ids.deletion,
        tenantId: ids.tenant,
        consultationId: ids.consultation,
        deletionGeneration: 1,
        reason: "user_request",
        initiatedByRole: "stylist",
        statusCapabilityId: ids.capability,
      },
      clock,
    );

    expect(receipt.schedule.accessRevokedAt).toBe(
      receipt.schedule.requestedAt,
    );
    expect(receipt.schedule.targetCompleteBy).toBe(
      "2026-09-27T12:00:00.000Z",
    );
    expect(canTransitionDeletion("purge_delayed", "purging")).toBe(true);
    expect(canTransitionDeletion("verified", "purging")).toBe(false);
    expect(Object.keys(receipt)).not.toContain("objectKey");
    expect(Object.keys(receipt)).not.toContain("url");
    expect(Object.keys(receipt)).not.toContain("prompt");
  });

  it("caps a private share at the consultation access deadline", () => {
    const clock = new FixedClock("2026-09-26T12:00:00.000Z");
    const { consultation } = createConsentedConsultation(clock);
    const reviewing = { ...consultation, status: "reviewing" as const };
    const agreed = {
      ...reviewing,
      status: "agreed" as const,
      agreement: createConsultationAgreement(
        {
          variantId: ids.variant,
          feasibility: "feasible-now",
          serviceNotes: "Use the selected result as the consultation plan.",
          maintenanceNotes: "Review maintenance with the client.",
        },
        reviewing,
        clock,
      ),
    };
    clock.set("2026-09-27T10:00:00.000Z");

    const share = createPrivateShare(
      {
        id: ids.share,
        tenantId: ids.tenant,
        consultationId: ids.consultation,
        capabilityId: ids.capability,
        variantIds: [ids.variant],
      },
      agreed,
      clock,
    );

    expect(share.expiresAt).toBe(agreed.retention.accessExpiresAt);
  });

  it("defines a bounded shared brief without private-share or source metadata", () => {
    const brief = {
      selectedVariant: {
        variantId: ids.variant,
        outputAssetId: ids.asset,
        specification: defaultHairSpecification,
      },
      agreement: {
        feasibility: "feasible-now",
        serviceNotes: "Follow the agreed service direction.",
        maintenanceNotes: "Review upkeep together.",
      },
      expiresAt: "2026-09-27T11:45:00.000Z" as IsoInstant,
      disclosure: sharedConsultationDisclosure,
    } satisfies SharedConsultationBrief;

    expect(Object.keys(brief)).toEqual([
      "selectedVariant",
      "agreement",
      "expiresAt",
      "disclosure",
    ]);
    expect(Object.keys(brief.selectedVariant)).toEqual([
      "variantId",
      "outputAssetId",
      "specification",
    ]);
    expect(JSON.stringify(brief)).not.toMatch(
      /source|reference|client|tenant|capability|attempt|idempotency|prompt|filename|url/i,
    );
  });
});
