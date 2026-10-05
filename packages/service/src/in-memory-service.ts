import {
  acceptOpaqueAsset,
  attachConsentReceipt,
  attachSaveReceipt,
  authorizeOperation,
  clockNow,
  createConsentReceipt,
  createConsultationAgreement,
  createConsultationRecord,
  createDeletionReceipt,
  createPrivateShare,
  createSaveReceipt,
  createVariant,
  decideIdempotency,
  decideVariantCallback,
  defaultRetentionPolicy,
  deletionComponentNames,
  deriveConsultationRetention,
  deriveMediaGrantExpiry,
  effectiveShareState,
  hasReached,
  sharedConsultationDisclosure,
  validateHairSpecification,
  type Actor,
  type ApplicationCommand,
  type ApplicationOperation,
  type ApplicationQuery,
  type AssetId,
  type AuthorizationResource,
  type Clock,
  type CommandResult,
  type ConsultationId,
  type ConsultationRecord,
  type ConsentReceipt,
  type DeletionComponentName,
  type DeletionInitiatorRole,
  type DeletionReceipt,
  type IdempotencyRecord,
  type IdempotencyRequest,
  type MediaAuthorization,
  type OpaqueAsset,
  type PrivateApplicationService,
  type PrivateShare,
  type QueryResult,
  type RetentionPolicy,
  type SaveReceipt,
  type ServiceResponse,
  type SharedConsultationBrief,
  type ShareId,
  type TenantId,
  type Variant,
  type VariantId,
} from "@hair/domain";

import type { OpaqueIdFactory } from "./id-factory";

interface StoredIdempotency {
  record: IdempotencyRecord;
  response: ServiceResponse<CommandResult> | null;
  consultationId: ConsultationId | null;
  contentBearing: boolean;
}

interface DeletionManifest {
  readonly assetIds: readonly AssetId[];
  readonly variantIds: readonly VariantId[];
}

interface GenerationInputs {
  readonly sourceAssetId: AssetId;
  readonly referenceAssetId: AssetId | null;
}

export interface SimulatorSnapshot {
  readonly consultations: number;
  readonly consentReceipts: number;
  readonly saveReceipts: number;
  readonly assets: number;
  readonly variants: number;
  readonly activeShares: number;
  readonly mediaGrants: number;
  readonly specifications: number;
  readonly providerJobs: number;
  readonly workerTemporaryScopes: number;
  readonly indexEntries: number;
  readonly deletionReceipts: number;
  readonly backupSuppressions: number;
  readonly contentBearingIdempotencyResponses: number;
}

export interface AssetExpirySweepResult {
  readonly assetsPurged: number;
  readonly mediaGrantsPurged: number;
}

/**
 * Deterministic server-side simulator. It stores metadata only; image bytes,
 * filenames, locators, raw capability tokens, and provider payloads are absent.
 */
export class InMemoryPrivateApplicationService
  implements PrivateApplicationService
{
  private readonly consultations = new Map<ConsultationId, ConsultationRecord>();
  private readonly consentReceipts = new Map<
    ConsentReceipt["id"],
    ConsentReceipt
  >();
  private readonly saveReceipts = new Map<SaveReceipt["id"], SaveReceipt>();
  private readonly assets = new Map<AssetId, OpaqueAsset>();
  private readonly variants = new Map<VariantId, Variant>();
  private readonly shares = new Map<ShareId, PrivateShare>();
  private readonly deletionReceipts = new Map<
    DeletionReceipt["id"],
    DeletionReceipt
  >();
  private readonly controlCapabilities = new Map<
    ConsultationId,
    PrivateShare["capabilityId"]
  >();
  private readonly specifications = new Map<
    ConsultationId,
    Variant["specification"]
  >();
  private readonly mediaGrants = new Map<AssetId, MediaAuthorization>();
  private readonly providerJobs = new Set<VariantId>();
  private readonly workerTemporaryScopes = new Set<ConsultationId>();
  private readonly consultationIndex = new Set<ConsultationId>();
  private readonly backupSuppressions = new Set<ConsultationId>();
  private readonly idempotency = new Map<string, StoredIdempotency>();
  private readonly generationInputs = new Map<VariantId, GenerationInputs>();

  public constructor(
    private readonly clock: Clock,
    private readonly ids: OpaqueIdFactory,
    private readonly retentionPolicy: RetentionPolicy = defaultRetentionPolicy,
  ) {}

  public async execute(
    command: ApplicationCommand,
  ): Promise<ServiceResponse<CommandResult>> {
    try {
      this.sweepExpiredAssets();
      const resource = this.authorizeCommand(command);
      if (resource === null) {
        return failure("not_found_or_unauthorized");
      }

      const decision = authorizeOperation(
        command.context.actor,
        command.operation,
        this.bindPrivacyRequest(resource, command.context.actor),
        this.clock,
      );
      if (!decision.allowed) {
        return failure(decision.reason);
      }

      return this.executeIdempotently(command, resource.tenantId);
    } catch {
      return failure("invalid_request");
    }
  }

  public async query(
    query: ApplicationQuery,
  ): Promise<ServiceResponse<QueryResult>> {
    try {
      this.sweepExpiredAssets();
      switch (query.operation) {
        case "consultation.read":
          return this.readConsultation(query);
        case "share.resolve":
          return this.resolveShare(query);
        case "media.authorize":
          return this.authorizeMedia(query);
        case "deletion.status.read":
          return this.readDeletionStatus(query);
      }
    } catch {
      return failure("invalid_request");
    }
  }

  /** Content-free counts for deterministic test and local diagnostics. */
  public snapshot(): SimulatorSnapshot {
    return {
      consultations: this.consultations.size,
      consentReceipts: this.consentReceipts.size,
      saveReceipts: this.saveReceipts.size,
      assets: this.assets.size,
      variants: this.variants.size,
      activeShares: [...this.shares.values()].filter(
        (share) => effectiveShareState(share, this.clock) === "active",
      ).length,
      mediaGrants: this.mediaGrants.size,
      specifications: this.specifications.size,
      providerJobs: this.providerJobs.size,
      workerTemporaryScopes: this.workerTemporaryScopes.size,
      indexEntries: this.consultationIndex.size,
      deletionReceipts: this.deletionReceipts.size,
      backupSuppressions: this.backupSuppressions.size,
      contentBearingIdempotencyResponses: [...this.idempotency.values()].filter(
        (stored) => stored.contentBearing && stored.response !== null,
      ).length,
    };
  }

  /** Content-free retention sweep for a scheduler; it requires no product request. */
  public sweepExpiredAssets(): AssetExpirySweepResult {
    const assetsBefore = this.assets.size;
    const mediaGrantsBefore = this.mediaGrants.size;
    const consultationsToSettle = new Set<ConsultationId>();

    const expiredAssetIds = [...this.assets.values()]
      .filter((asset) => hasReached(this.clock, asset.retention.deleteDueAt))
      .map((asset) => asset.id);
    for (const assetId of expiredAssetIds) {
      this.purgeAsset(assetId, consultationsToSettle);
    }
    for (const consultationId of consultationsToSettle) {
      this.settleConsultationAfterInputPurge(consultationId);
    }

    for (const [assetId, grant] of this.mediaGrants) {
      if (
        !this.assets.has(assetId) ||
        hasReached(this.clock, grant.expiresAt)
      ) {
        this.mediaGrants.delete(assetId);
      }
    }

    return {
      assetsPurged: assetsBefore - this.assets.size,
      mediaGrantsPurged: mediaGrantsBefore - this.mediaGrants.size,
    };
  }

  private authorizeCommand(
    command: ApplicationCommand,
  ): AuthorizationResource | null {
    if (command.operation === "consultation.create") {
      return {
        tenantId: command.tenantId,
        assignedActorIds: [],
        inaccessible: false,
      };
    }

    if (command.operation === "deletion.component.update") {
      const receipt = this.deletionReceipts.get(command.deletionRequestId);
      return receipt === undefined
        ? null
        : {
            tenantId: receipt.tenantId,
            consultationId: receipt.consultationId,
            assignedActorIds: [],
            deletionRequestId: receipt.id,
            deletionStatusCapabilityId: receipt.statusCapabilityId,
            inaccessible: true,
          };
    }

    const consultation = this.consultations.get(command.consultationId);
    if (consultation === undefined) {
      return null;
    }

    if (
      (command.operation === "variant.publish" ||
        command.operation === "variant.retry") &&
      !this.variants.has(command.variantId)
    ) {
      return null;
    }

    if (command.operation === "share.revoke") {
      const share = this.shares.get(command.shareId);
      if (
        share === undefined ||
        share.consultationId !== consultation.id ||
        share.tenantId !== consultation.tenantId
      ) {
        return null;
      }
    }

    return this.consultationResource(consultation);
  }

  private consultationResource(
    consultation: ConsultationRecord,
  ): AuthorizationResource {
    const capabilityId = this.controlCapabilities.get(consultation.id);
    const base: AuthorizationResource = {
      tenantId: consultation.tenantId,
      consultationId: consultation.id,
      assignedActorIds: [consultation.createdByActorId],
      accessExpiresAt: consultation.retention.accessExpiresAt,
      inaccessible:
        consultation.deletionRequestId !== null ||
        consultation.status === "deleted" ||
        consultation.status === "expired",
    };

    return capabilityId === undefined
      ? base
      : { ...base, controlCapabilityId: capabilityId };
  }

  private bindPrivacyRequest(
    resource: AuthorizationResource,
    actor: Actor,
  ): AuthorizationResource {
    return actor.kind === "privacy_operator"
      ? { ...resource, privacyRequestId: actor.privacyRequestId }
      : resource;
  }

  private executeIdempotently(
    command: ApplicationCommand,
    tenantId: TenantId,
  ): ServiceResponse<CommandResult> {
    const request: IdempotencyRequest = {
      tenantId,
      operation: command.operation,
      key: command.context.idempotencyKey,
      fingerprint: command.context.fingerprint,
    };
    const lookupKey = idempotencyLookupKey(request);
    const stored = this.idempotency.get(lookupKey);
    const decision = decideIdempotency(request, stored?.record ?? null);

    if (decision.action === "conflict") {
      return failure("idempotency_conflict");
    }
    if (decision.action === "wait") {
      return failure("temporarily_unavailable", true);
    }
    if (decision.action === "replay") {
      return stored?.response ?? failure("temporarily_unavailable", true);
    }

    const createdAt = clockNow(this.clock);
    const expiresAt = deriveConsultationRetention(
      this.clock,
      "consultation_saved",
      this.retentionPolicy,
    ).deleteDueAt;
    this.idempotency.set(lookupKey, {
      record: {
        ...request,
        state: "in_progress",
        resultId: null,
        createdAt,
        expiresAt,
      },
      response: null,
      consultationId: consultationIdForCommand(command),
      contentBearing: false,
    });

    let response: ServiceResponse<CommandResult>;
    try {
      response = this.applyCommand(command);
    } catch {
      response = failure("invalid_request");
    }
    if (!response.ok && response.retryable) {
      this.idempotency.delete(lookupKey);
      return response;
    }

    const resultId = this.ids.next("result");
    this.idempotency.set(lookupKey, {
      record: {
        ...request,
        state: "completed",
        resultId,
        createdAt,
        expiresAt,
      },
      response,
      consultationId: consultationIdForCommand(command, response),
      contentBearing: commandResponseContainsConsultationContent(command),
    });
    return response;
  }

  private applyCommand(
    command: ApplicationCommand,
  ): ServiceResponse<CommandResult> {
    switch (command.operation) {
      case "consultation.create":
        return this.createConsultation(command);
      case "consent.record":
        return this.recordConsent(command);
      case "asset.accept":
        return this.acceptAsset(command);
      case "consultation.update":
        return this.updateConsultation(command);
      case "generation.request":
        return this.requestGeneration(command);
      case "generation.cancel":
        return this.cancelGeneration(command);
      case "variant.publish":
        return this.publishVariant(command);
      case "variant.retry":
        return this.retryVariant(command);
      case "consultation.agree":
        return this.agreeConsultation(command);
      case "consultation.save":
        return this.saveConsultation(command);
      case "share.create":
        return this.createShare(command);
      case "share.revoke":
        return this.revokeShare(command);
      case "deletion.request":
        return this.requestDeletion(
          command.consultationId,
          command.deletionRequestId,
          command.statusCapabilityId,
          command.reason,
          deletionInitiator(command.context.actor),
        );
      case "retention.expire":
        return this.expireConsultation(command);
      case "deletion.component.update":
        return this.updateDeletionComponent(command);
    }
  }

  private createConsultation(
    command: Extract<ApplicationCommand, { operation: "consultation.create" }>,
  ): ServiceResponse<ConsultationRecord> {
    if (command.context.actor.kind !== "tenant_member") {
      return failure("not_found_or_unauthorized");
    }

    const consultation = createConsultationRecord(
      {
        id: this.ids.next("consultation"),
        tenantId: command.tenantId,
        createdByActorId: command.context.actor.actorId,
      },
      this.clock,
      this.retentionPolicy,
    );
    this.consultations.set(consultation.id, consultation);
    this.controlCapabilities.set(
      consultation.id,
      this.ids.next("capability"),
    );
    this.consultationIndex.add(consultation.id);
    return success(consultation);
  }

  private recordConsent(
    command: Extract<ApplicationCommand, { operation: "consent.record" }>,
  ): ServiceResponse<ConsentReceipt> {
    const consultation = this.consultations.get(command.consultationId);
    if (consultation === undefined || consultation.consentReceiptId !== null) {
      return failure("invalid_state");
    }

    const receipt = createConsentReceipt(
      {
        id: command.receiptId,
        tenantId: consultation.tenantId,
        consultationId: consultation.id,
        sessionId: command.sessionId,
        policyVersion: command.policyVersion,
        retentionNoticeVersion: command.retentionNoticeVersion,
        providerDisclosureVersion: command.providerDisclosureVersion,
        acknowledgementMethod: command.acknowledgementMethod,
        adultConfirmed: command.adultConfirmed,
        referenceRightsConfirmed: command.referenceRightsConfirmed,
        scopes: command.scopes,
      },
      consultation,
      this.clock,
    );
    this.consentReceipts.set(receipt.id, receipt);
    this.consultations.set(
      consultation.id,
      attachConsentReceipt(consultation, receipt),
    );
    return success(receipt);
  }

  private acceptAsset(
    command: Extract<ApplicationCommand, { operation: "asset.accept" }>,
  ): ServiceResponse<OpaqueAsset> {
    const consultation = this.consultations.get(command.consultationId);
    if (consultation === undefined || consultation.consentReceiptId === null) {
      return failure("invalid_state");
    }
    const receipt = this.consentReceipts.get(consultation.consentReceiptId);
    if (receipt === undefined || this.assets.has(command.assetId)) {
      return failure("invalid_state");
    }

    const accepted = acceptOpaqueAsset(
      {
        id: command.assetId,
        tenantId: consultation.tenantId,
        consultationId: consultation.id,
        assetClass: command.assetClass,
        parentAssetIds: command.parentAssetIds,
      },
      consultation,
      receipt,
      this.clock,
      this.retentionPolicy,
    );
    const asset: OpaqueAsset = { ...accepted, state: "available" };
    this.assets.set(asset.id, asset);

    if (
      asset.assetClass === "source_portrait" &&
      consultation.status === "consented"
    ) {
      this.consultations.set(consultation.id, {
        ...consultation,
        status: "ready",
        version: consultation.version + 1,
      });
    }

    return success(asset);
  }

  private updateConsultation(
    command: Extract<
      ApplicationCommand,
      { operation: "consultation.update" }
    >,
  ): ServiceResponse<ConsultationRecord> {
    const consultation = this.consultations.get(command.consultationId);
    if (
      consultation === undefined ||
      !["consented", "ready", "reviewing", "agreed"].includes(
        consultation.status,
      ) ||
      validateHairSpecification(command.specification).length > 0
    ) {
      return failure("invalid_state");
    }

    this.specifications.set(consultation.id, command.specification);
    const invalidatesDecision = ["reviewing", "agreed"].includes(
      consultation.status,
    );
    if (invalidatesDecision) {
      this.revokeConsultationShares(consultation.id);
      this.expireConsultationVariants(consultation.id);
    }
    const updated: ConsultationRecord = {
      ...consultation,
      ...(invalidatesDecision ? { status: "ready" as const } : {}),
      agreement: invalidatesDecision ? null : consultation.agreement,
      version: consultation.version + 1,
    };
    this.consultations.set(updated.id, updated);
    return success(updated);
  }

  private requestGeneration(
    command: Extract<ApplicationCommand, { operation: "generation.request" }>,
  ): ServiceResponse<readonly Variant[]> {
    const consultation = this.consultations.get(command.consultationId);

    if (
      consultation === undefined ||
      !["ready", "reviewing"].includes(consultation.status) ||
      !this.generationInputsAreUsable(
        consultation.id,
        command.sourceAssetId,
        command.referenceAssetId,
      ) ||
      !Number.isInteger(command.previewCount) ||
      command.previewCount < 1 ||
      command.previewCount > 4 ||
      command.promptVersion.trim().length === 0 ||
      validateHairSpecification(command.specification).length > 0
    ) {
      return failure("invalid_state");
    }

    const variants = Array.from({ length: command.previewCount }, (_, index) => {
      const queued = createVariant(
        {
          id: this.ids.next("variant"),
          tenantId: consultation.tenantId,
          consultationId: consultation.id,
          index,
          specification: command.specification,
          promptVersion: command.promptVersion,
          attemptId: this.ids.next("attempt"),
          idempotencyKey: this.ids.next("idempotency"),
        },
        consultation,
      );
      const running: Variant = { ...queued, state: "running" };
      this.variants.set(running.id, running);
      this.generationInputs.set(running.id, {
        sourceAssetId: command.sourceAssetId,
        referenceAssetId: command.referenceAssetId,
      });
      this.providerJobs.add(running.id);
      return running;
    });

    this.specifications.set(consultation.id, command.specification);
    this.workerTemporaryScopes.add(consultation.id);
    this.consultations.set(consultation.id, {
      ...consultation,
      status: "generating",
      version: consultation.version + 1,
    });
    return success(variants);
  }

  private cancelGeneration(
    command: Extract<ApplicationCommand, { operation: "generation.cancel" }>,
  ): ServiceResponse<readonly Variant[]> {
    const consultation = this.consultations.get(command.consultationId);
    const variants = [...this.variants.values()].filter(
      (variant) => variant.consultationId === command.consultationId,
    );
    if (consultation === undefined || variants.length === 0) {
      return failure("invalid_state");
    }
    let changed = false;
    for (const variant of variants) {
      if (variant.state !== "queued" && variant.state !== "running") continue;
      this.variants.set(variant.id, {
        ...variant,
        state: "canceled",
        outputAssetId: null,
        safeFailureCode: null,
      });
      this.providerJobs.delete(variant.id);
      changed = true;
    }
    if (changed) {
      this.consultations.set(consultation.id, {
        ...consultation,
        status: "reviewing",
        version: consultation.version + 1,
      });
    }
    // Cancellation ends access to the whole transient source package, even
    // when an earlier failed sibling could otherwise have been retried.
    this.workerTemporaryScopes.delete(consultation.id);
    for (const variant of variants) this.generationInputs.delete(variant.id);
    for (const asset of [...this.assets.values()]) {
      if (asset.consultationId === consultation.id && [
        "source_portrait", "inspiration_reference", "normalized_source", "hair_mask",
      ].includes(asset.assetClass)) this.purgeAsset(asset.id);
    }
    return success(variants.map((variant) => this.variants.get(variant.id)!));
  }

  private publishVariant(
    command: Extract<ApplicationCommand, { operation: "variant.publish" }>,
  ): ServiceResponse<Variant> {
    const current = this.variants.get(command.variantId);
    const consultation = this.consultations.get(command.consultationId);
    if (
      current === undefined ||
      consultation === undefined ||
      current.consultationId !== consultation.id
    ) {
      return failure("not_found_or_unauthorized");
    }

    const decision = decideVariantCallback(current, command.callback);
    if (decision.action !== "apply") {
      return success(current);
    }

    const inputs = this.generationInputs.get(current.id);
    if (inputs === undefined) {
      return failure("invalid_state");
    }

    if (decision.next.state === "ready") {
      const receipt =
        consultation.consentReceiptId === null
          ? undefined
          : this.consentReceipts.get(consultation.consentReceiptId);
      const source = this.assets.get(inputs.sourceAssetId);
      if (
        receipt === undefined ||
        source === undefined ||
        !this.generationInputsAreUsable(
          consultation.id,
          inputs.sourceAssetId,
          inputs.referenceAssetId,
        ) ||
        decision.next.outputAssetId === null ||
        this.assets.has(decision.next.outputAssetId)
      ) {
        return failure("invalid_state");
      }
      const output = acceptOpaqueAsset(
        {
          id: decision.next.outputAssetId,
          tenantId: consultation.tenantId,
          consultationId: consultation.id,
          assetClass: "generated_preview",
          parentAssetIds:
            inputs.referenceAssetId === null
              ? [source.id]
              : [source.id, inputs.referenceAssetId],
        },
        consultation,
        receipt,
        this.clock,
        this.retentionPolicy,
      );
      this.assets.set(output.id, { ...output, state: "available" });
    }

    this.variants.set(decision.next.id, decision.next);
    this.providerJobs.delete(decision.next.id);
    if (this.allVariantsSettled(consultation.id)) {
      this.workerTemporaryScopes.delete(consultation.id);
      this.consultations.set(consultation.id, {
        ...consultation,
        status: "reviewing",
        version: consultation.version + 1,
      });
      this.purgeSettledGenerationInputs(consultation.id);
    }
    return success(decision.next);
  }

  private retryVariant(
    command: Extract<ApplicationCommand, { operation: "variant.retry" }>,
  ): ServiceResponse<Variant> {
    const current = this.variants.get(command.variantId);
    const inputs = this.generationInputs.get(command.variantId);
    if (
      current === undefined ||
      current.consultationId !== command.consultationId ||
      current.state !== "failed" ||
      inputs === undefined ||
      !this.generationInputsAreUsable(
        current.consultationId,
        inputs.sourceAssetId,
        inputs.referenceAssetId,
      )
    ) {
      return failure("invalid_state");
    }

    const next: Variant = {
      ...current,
      state: "running",
      attemptId: command.nextAttemptId,
      attemptNumber: current.attemptNumber + 1,
      outputAssetId: null,
      safeFailureCode: null,
    };
    this.variants.set(next.id, next);
    this.providerJobs.add(next.id);
    this.workerTemporaryScopes.add(next.consultationId);
    return success(next);
  }

  private agreeConsultation(
    command: Extract<ApplicationCommand, { operation: "consultation.agree" }>,
  ): ServiceResponse<ConsultationRecord> {
    const consultation = this.consultations.get(command.consultationId);
    const variant = this.variants.get(command.variantId);
    const currentSpecification = this.specifications.get(command.consultationId);
    if (
      consultation === undefined ||
      !["reviewing", "agreed"].includes(consultation.status) ||
      variant === undefined ||
      variant.consultationId !== consultation.id ||
      variant.state !== "ready" ||
      currentSpecification === undefined ||
      JSON.stringify(currentSpecification) !== JSON.stringify(variant.specification)
    ) {
      return failure("invalid_state");
    }
    const updated: ConsultationRecord = {
      ...consultation,
      status: "agreed",
      agreement: createConsultationAgreement(
        {
          variantId: variant.id,
          feasibility: command.feasibility,
          serviceNotes: command.serviceNotes,
          maintenanceNotes: command.maintenanceNotes,
        },
        consultation,
        this.clock,
      ),
      version: consultation.version + 1,
    };
    this.revokeConsultationShares(consultation.id);
    this.consultations.set(updated.id, updated);
    return success(updated);
  }

  private saveConsultation(
    command: Extract<ApplicationCommand, { operation: "consultation.save" }>,
  ): ServiceResponse<SaveReceipt> {
    const consultation = this.consultations.get(command.consultationId);
    if (consultation === undefined || consultation.status !== "agreed") {
      return failure("invalid_state");
    }
    if (consultation.saveReceiptId !== null) {
      const existing = this.saveReceipts.get(consultation.saveReceiptId);
      return existing === undefined
        ? failure("temporarily_unavailable", true)
        : success(existing);
    }
    const savedRetention = deriveConsultationRetention(
      this.clock,
      "consultation_saved",
      this.retentionPolicy,
    );
    const receipt = createSaveReceipt(
      {
        id: command.receiptId,
        tenantId: consultation.tenantId,
        consultationId: consultation.id,
        disclosureVersion: command.disclosureVersion,
        saveChoice: command.saveChoice,
        acknowledgementMethod: command.acknowledgementMethod,
      },
      consultation,
      savedRetention,
    );
    const updated = attachSaveReceipt(
      consultation,
      receipt,
      savedRetention,
    );
    this.saveReceipts.set(receipt.id, receipt);
    this.consultations.set(updated.id, updated);

    for (const variant of this.variants.values()) {
      if (variant.consultationId === updated.id) {
        this.variants.set(variant.id, {
          ...variant,
          retention: updated.retention,
        });
      }
    }

    for (const asset of this.assets.values()) {
      if (
        asset.consultationId === updated.id &&
        ["generated_preview", "thumbnail", "share_render"].includes(
          asset.assetClass,
        )
      ) {
        this.assets.set(asset.id, {
          ...asset,
          retention: {
            policyVersion: updated.retention.policyVersion,
            acceptedAt: asset.retention.acceptedAt,
            accessExpiresAt: updated.retention.accessExpiresAt,
            purgeStartsAt: updated.retention.purgeStartsAt,
            deleteDueAt: updated.retention.deleteDueAt,
          },
        });
      }
    }
    return success(receipt);
  }

  private createShare(
    command: Extract<ApplicationCommand, { operation: "share.create" }>,
  ): ServiceResponse<PrivateShare> {
    const consultation = this.consultations.get(command.consultationId);
    const receipt =
      consultation?.consentReceiptId === null || consultation === undefined
        ? undefined
        : this.consentReceipts.get(consultation.consentReceiptId);
    const variants = command.variantIds.map((id) => this.variants.get(id));
    if (
      consultation === undefined ||
      consultation.status !== "agreed" ||
      consultation.agreement === null ||
      receipt === undefined ||
      !receipt.scopes.includes("private_result_sharing") ||
      this.shares.has(command.shareId) ||
      variants.length === 0 ||
      variants.some(
        (variant) =>
          variant === undefined ||
          variant.consultationId !== consultation.id ||
          variant.state !== "ready",
      ) ||
      command.variantIds.length !== 1 ||
      command.variantIds[0] !== consultation.agreement.variantId
    ) {
      return failure("invalid_state");
    }
    const share = createPrivateShare(
      {
        id: command.shareId,
        tenantId: consultation.tenantId,
        consultationId: consultation.id,
        capabilityId: command.capabilityId,
        variantIds: command.variantIds,
      },
      consultation,
      this.clock,
      this.retentionPolicy,
    );
    this.shares.set(share.id, share);
    return success(share);
  }

  private revokeShare(
    command: Extract<ApplicationCommand, { operation: "share.revoke" }>,
  ): ServiceResponse<PrivateShare> {
    const share = this.shares.get(command.shareId);
    if (
      share === undefined ||
      share.consultationId !== command.consultationId
    ) {
      return failure("not_found_or_unauthorized");
    }
    if (share.state === "revoked") {
      return success(share);
    }
    const revoked: PrivateShare = {
      ...share,
      state: "revoked",
      revokedAt: clockNow(this.clock),
    };
    this.shares.set(revoked.id, revoked);
    return success(revoked);
  }

  private expireConsultation(
    command: Extract<ApplicationCommand, { operation: "retention.expire" }>,
  ): ServiceResponse<DeletionReceipt> {
    const consultation = this.consultations.get(command.consultationId);
    if (
      consultation === undefined ||
      !hasReached(this.clock, consultation.retention.accessExpiresAt)
    ) {
      return failure("invalid_state");
    }
    return this.requestDeletion(
      consultation.id,
      command.deletionRequestId,
      command.statusCapabilityId,
      "expiry",
      "retention_worker",
    );
  }

  private requestDeletion(
    consultationId: ConsultationId,
    deletionRequestId: DeletionReceipt["id"],
    statusCapabilityId: DeletionReceipt["statusCapabilityId"],
    reason: DeletionReceipt["reason"],
    initiatedByRole: DeletionInitiatorRole,
  ): ServiceResponse<DeletionReceipt> {
    const consultation = this.consultations.get(consultationId);
    if (consultation === undefined) {
      return failure("not_found_or_unauthorized");
    }
    if (consultation.deletionRequestId !== null) {
      const existing = this.deletionReceipts.get(
        consultation.deletionRequestId,
      );
      return existing === undefined
        ? failure("temporarily_unavailable", true)
        : success(existing);
    }

    let receipt = createDeletionReceipt(
      {
        id: deletionRequestId,
        tenantId: consultation.tenantId,
        consultationId: consultation.id,
        deletionGeneration: 1,
        reason,
        initiatedByRole,
        statusCapabilityId,
      },
      this.clock,
      this.retentionPolicy,
    );

    const variantIds = [...this.variants.values()]
      .filter((variant) => variant.consultationId === consultation.id)
      .map((variant) => variant.id);
    const assetIds = [...this.assets.values()]
      .filter((asset) => asset.consultationId === consultation.id)
      .map((asset) => asset.id);
    const manifest: DeletionManifest = { assetIds, variantIds };

    this.consultations.set(consultation.id, {
      ...consultation,
      status: "deleted",
      agreement: null,
      deletionRequestId: receipt.id,
      version: consultation.version + 1,
    });
    this.controlCapabilities.delete(consultation.id);
    this.revokeConsultationShares(consultation.id);

    for (const [key, stored] of this.idempotency) {
      if (stored.consultationId === consultation.id) {
        this.idempotency.delete(key);
      }
    }

    for (const variantId of variantIds) {
      this.providerJobs.delete(variantId);
      this.generationInputs.delete(variantId);
      this.variants.delete(variantId);
    }
    for (const assetId of assetIds) {
      this.mediaGrants.delete(assetId);
      this.assets.delete(assetId);
    }
    this.specifications.delete(consultation.id);
    this.consultationIndex.delete(consultation.id);
    this.workerTemporaryScopes.delete(consultation.id);
    this.backupSuppressions.add(consultation.id);

    receipt = this.verifyDeletion(receipt, manifest);
    this.deletionReceipts.set(receipt.id, receipt);
    return success(receipt);
  }

  private updateDeletionComponent(
    command: Extract<
      ApplicationCommand,
      { operation: "deletion.component.update" }
    >,
  ): ServiceResponse<DeletionReceipt> {
    const receipt = this.deletionReceipts.get(command.deletionRequestId);
    if (receipt === undefined) {
      return failure("not_found_or_unauthorized");
    }
    if (["verified", "provider_exception"].includes(receipt.state)) {
      return success(receipt);
    }

    const verifiedAt =
      command.status === "verified_absent" ||
      command.status === "provider_exception"
        ? clockNow(this.clock)
        : null;
    const components = receipt.components.map((component) =>
      component.name === command.component
        ? {
            ...component,
            attempts: component.attempts + 1,
            status: command.status,
            verifiedAt,
          }
        : component,
    );
    const hasException = components.some(
      (component) => component.status === "provider_exception",
    );
    const allVerified = components.every(
      (component) => component.status === "verified_absent",
    );
    const state = hasException
      ? "provider_exception"
      : allVerified
        ? "verified"
        : command.status === "retrying"
          ? "purge_delayed"
          : "purging";
    const updated: DeletionReceipt = {
      ...receipt,
      state,
      components,
      verifiedAt: state === "verified" ? clockNow(this.clock) : null,
    };
    this.deletionReceipts.set(updated.id, updated);
    return success(updated);
  }

  private readConsultation(
    query: Extract<ApplicationQuery, { operation: "consultation.read" }>,
  ): ServiceResponse<ConsultationRecord> {
    const consultation = this.consultations.get(query.consultationId);
    if (consultation === undefined) {
      return failure("not_found_or_unauthorized");
    }
    const decision = authorizeOperation(
      query.context.actor,
      query.operation,
      this.consultationResource(consultation),
      this.clock,
    );
    return decision.allowed
      ? success(consultation)
      : failure(decision.reason);
  }

  private resolveShare(
    query: Extract<ApplicationQuery, { operation: "share.resolve" }>,
  ): ServiceResponse<SharedConsultationBrief> {
    const share = this.shares.get(query.shareId);
    const consultation =
      share === undefined
        ? undefined
        : this.consultations.get(share.consultationId);
    if (share === undefined || consultation === undefined) {
      return failure("not_found_or_unauthorized");
    }
    const resource: AuthorizationResource = {
      tenantId: share.tenantId,
      consultationId: share.consultationId,
      assignedActorIds: [consultation.createdByActorId],
      shareId: share.id,
      shareCapabilityId: share.capabilityId,
      accessExpiresAt: share.expiresAt,
      inaccessible:
        effectiveShareState(share, this.clock) !== "active" ||
        consultation.deletionRequestId !== null ||
        consultation.status === "deleted" ||
        consultation.status === "expired",
    };
    const decision = authorizeOperation(
      query.context.actor,
      query.operation,
      this.bindPrivacyRequest(resource, query.context.actor),
      this.clock,
    );
    if (!decision.allowed) {
      return failure(decision.reason);
    }

    const agreement = consultation.agreement;
    const variantId = share.variantIds[0];
    const variant =
      variantId === undefined ? undefined : this.variants.get(variantId);
    const outputAsset =
      variant?.outputAssetId === null || variant === undefined
        ? undefined
        : this.assets.get(variant.outputAssetId);
    if (
      consultation.status !== "agreed" ||
      agreement === null ||
      share.variantIds.length !== 1 ||
      variant === undefined ||
      variant.id !== agreement.variantId ||
      variant.state !== "ready" ||
      variant.outputAssetId === null ||
      outputAsset === undefined ||
      outputAsset.assetClass !== "generated_preview" ||
      outputAsset.state !== "available" ||
      hasReached(this.clock, outputAsset.retention.accessExpiresAt)
    ) {
      return failure("not_found_or_unauthorized");
    }

    return success({
      selectedVariant: {
        variantId: variant.id,
        outputAssetId: variant.outputAssetId,
        specification: variant.specification,
      },
      agreement: {
        feasibility: agreement.feasibility,
        serviceNotes: agreement.serviceNotes,
        maintenanceNotes: agreement.maintenanceNotes,
      },
      expiresAt: share.expiresAt,
      disclosure: sharedConsultationDisclosure,
    });
  }

  private authorizeMedia(
    query: Extract<ApplicationQuery, { operation: "media.authorize" }>,
  ): ServiceResponse<MediaAuthorization> {
    const consultation = this.consultations.get(query.consultationId);
    const asset = this.assets.get(query.assetId);
    if (
      consultation === undefined ||
      asset === undefined ||
      asset.consultationId !== consultation.id ||
      asset.state !== "available" ||
      hasReached(this.clock, asset.retention.accessExpiresAt)
    ) {
      return failure("not_found_or_unauthorized");
    }

    let resource = this.consultationResource(consultation);
    if (query.context.actor.kind === "private_share") {
      const share = this.shares.get(query.context.actor.shareId);
      if (
        share === undefined ||
        !this.shareContainsAsset(share, asset.id) ||
        effectiveShareState(share, this.clock) !== "active"
      ) {
        return failure("not_found_or_unauthorized");
      }
      resource = {
        ...resource,
        shareId: share.id,
        shareCapabilityId: share.capabilityId,
        accessExpiresAt: share.expiresAt,
      };
    }

    const decision = authorizeOperation(
      query.context.actor,
      query.operation,
      this.bindPrivacyRequest(resource, query.context.actor),
      this.clock,
    );
    if (!decision.allowed) {
      return failure(decision.reason);
    }

    const authorization: MediaAuthorization = {
      assetId: asset.id,
      issuedToActorId: actorHandle(query.context.actor),
      expiresAt: deriveMediaGrantExpiry(
        this.clock,
        earlierInstant(
          resource.accessExpiresAt ?? asset.retention.accessExpiresAt,
          asset.retention.accessExpiresAt,
        ),
        this.retentionPolicy,
      ),
      cachePolicy: "private_no_store",
    };
    this.mediaGrants.set(asset.id, authorization);
    return success(authorization);
  }

  private readDeletionStatus(
    query: Extract<
      ApplicationQuery,
      { operation: "deletion.status.read" }
    >,
  ): ServiceResponse<DeletionReceipt> {
    const receipt = this.deletionReceipts.get(query.deletionRequestId);
    if (receipt === undefined) {
      return failure("not_found_or_unauthorized");
    }
    const consultation = this.consultations.get(receipt.consultationId);
    const baseResource: AuthorizationResource = {
      tenantId: receipt.tenantId,
      consultationId: receipt.consultationId,
      assignedActorIds:
        consultation === undefined ? [] : [consultation.createdByActorId],
      deletionRequestId: receipt.id,
      deletionStatusCapabilityId: receipt.statusCapabilityId,
      inaccessible: true,
    };
    const controlCapabilityId =
      consultation === undefined
        ? undefined
        : this.controlCapabilities.get(consultation.id);
    const resource =
      controlCapabilityId === undefined
        ? baseResource
        : { ...baseResource, controlCapabilityId };
    const decision = authorizeOperation(
      query.context.actor,
      query.operation,
      this.bindPrivacyRequest(resource, query.context.actor),
      this.clock,
    );
    return decision.allowed ? success(receipt) : failure(decision.reason);
  }

  private revokeConsultationShares(consultationId: ConsultationId): void {
    const revokedAt = clockNow(this.clock);
    for (const share of this.shares.values()) {
      if (share.consultationId === consultationId && share.state === "active") {
        this.shares.set(share.id, {
          ...share,
          state: "revoked",
          revokedAt,
        });
      }
    }
  }

  private verifyDeletion(
    receipt: DeletionReceipt,
    manifest: DeletionManifest,
  ): DeletionReceipt {
    const consultation = this.consultations.get(receipt.consultationId);
    const checks: Readonly<Record<DeletionComponentName, boolean>> = {
      authorization:
        consultation?.deletionRequestId === receipt.id &&
        !this.controlCapabilities.has(receipt.consultationId) &&
        [...this.shares.values()].every(
          (share) =>
            share.consultationId !== receipt.consultationId ||
            share.state !== "active",
        ),
      jobs: manifest.variantIds.every(
        (id) => !this.variants.has(id) && !this.providerJobs.has(id),
      ),
      media_grants: manifest.assetIds.every(
        (id) => !this.mediaGrants.has(id),
      ),
      object_storage: manifest.assetIds.every((id) => !this.assets.has(id)),
      provider: manifest.variantIds.every((id) => !this.providerJobs.has(id)),
      database_content:
        consultation?.agreement === null &&
        !this.specifications.has(receipt.consultationId) &&
        manifest.variantIds.every(
          (id) => !this.variants.has(id) && !this.generationInputs.has(id),
        ) &&
        manifest.assetIds.every((id) => !this.assets.has(id)) &&
        [...this.idempotency.values()].every(
          (stored) =>
            stored.consultationId !== receipt.consultationId ||
            !stored.contentBearing,
        ),
      indexes: !this.consultationIndex.has(receipt.consultationId),
      worker_temporary_storage: !this.workerTemporaryScopes.has(
        receipt.consultationId,
      ),
      backup_suppression: this.backupSuppressions.has(receipt.consultationId),
    };
    const verifiedAt = clockNow(this.clock);
    const components = deletionComponentNames.map((name) => ({
      name,
      attempts: 1,
      status: checks[name] ? ("verified_absent" as const) : ("retrying" as const),
      verifiedAt: checks[name] ? verifiedAt : null,
    }));
    const allVerified = components.every(
      (component) => component.status === "verified_absent",
    );

    return {
      ...receipt,
      state: allVerified ? "verified" : "purge_delayed",
      components,
      verifiedAt: allVerified ? verifiedAt : null,
    };
  }

  private allVariantsSettled(consultationId: ConsultationId): boolean {
    const variants = [...this.variants.values()].filter(
      (variant) => variant.consultationId === consultationId,
    );
    return (
      variants.length > 0 &&
      variants.every(
        (variant) =>
          variant.state !== "queued" && variant.state !== "running",
      )
    );
  }

  private generationInputsAreUsable(
    consultationId: ConsultationId,
    sourceAssetId: AssetId,
    referenceAssetId: AssetId | null,
  ): boolean {
    const source = this.assets.get(sourceAssetId);
    if (
      source === undefined ||
      source.consultationId !== consultationId ||
      source.assetClass !== "source_portrait" ||
      source.state !== "available" ||
      hasReached(this.clock, source.retention.accessExpiresAt)
    ) {
      return false;
    }

    if (referenceAssetId === null) {
      return true;
    }

    const reference = this.assets.get(referenceAssetId);
    return (
      reference !== undefined &&
      reference.consultationId === consultationId &&
      reference.assetClass === "inspiration_reference" &&
      reference.state === "available" &&
      !hasReached(this.clock, reference.retention.accessExpiresAt)
    );
  }

  private purgeSettledGenerationInputs(consultationId: ConsultationId): void {
    const variants = [...this.variants.values()].filter(
      (variant) => variant.consultationId === consultationId,
    );
    if (
      variants.length === 0 ||
      variants.some(
        (variant) =>
          variant.state === "queued" ||
          variant.state === "running" ||
          // A failed attempt remains retryable under the variant contract.
          variant.state === "failed",
      )
    ) {
      return;
    }

    for (const asset of [...this.assets.values()]) {
      if (
        asset.consultationId === consultationId &&
        [
          "source_portrait",
          "inspiration_reference",
          "normalized_source",
          "hair_mask",
        ].includes(asset.assetClass)
      ) {
        this.purgeAsset(asset.id);
      }
    }
  }

  private expireConsultationVariants(consultationId: ConsultationId): void {
    for (const [variantId, variant] of this.variants) {
      if (variant.consultationId !== consultationId) {
        continue;
      }
      if (variant.outputAssetId !== null) {
        this.purgeAsset(variant.outputAssetId);
      }
      this.providerJobs.delete(variantId);
      this.generationInputs.delete(variantId);
      this.variants.set(variantId, {
        ...variant,
        state: "expired",
        outputAssetId: null,
      });
    }
  }

  private purgeAsset(
    assetId: AssetId,
    deferredConsultations?: Set<ConsultationId>,
  ): void {
    const affectedConsultations = new Set<ConsultationId>();
    for (const [variantId, inputs] of this.generationInputs) {
      if (
        inputs.sourceAssetId === assetId ||
        inputs.referenceAssetId === assetId
      ) {
        const variant = this.variants.get(variantId);
        if (
          variant !== undefined &&
          ["queued", "running", "failed"].includes(variant.state)
        ) {
          this.providerJobs.delete(variantId);
          this.variants.set(variantId, {
            ...variant,
            state: "expired",
            outputAssetId: null,
          });
          affectedConsultations.add(variant.consultationId);
        }
        this.generationInputs.delete(variantId);
      }
    }
    for (const [childId, child] of this.assets) {
      if (child.parentAssetIds.includes(assetId)) {
        this.assets.set(childId, {
          ...child,
          parentAssetIds: child.parentAssetIds.filter((id) => id !== assetId),
        });
      }
    }
    this.mediaGrants.delete(assetId);
    this.assets.delete(assetId);

    for (const consultationId of affectedConsultations) {
      if (deferredConsultations === undefined) {
        this.settleConsultationAfterInputPurge(consultationId);
      } else {
        deferredConsultations.add(consultationId);
      }
    }
  }

  private settleConsultationAfterInputPurge(
    consultationId: ConsultationId,
  ): void {
    if (!this.allVariantsSettled(consultationId)) {
      return;
    }

    this.workerTemporaryScopes.delete(consultationId);
    const consultation = this.consultations.get(consultationId);
    if (consultation === undefined || consultation.status !== "generating") {
      return;
    }

    const hasUsableReadyResult = [...this.variants.values()].some((variant) => {
      if (
        variant.consultationId !== consultationId ||
        variant.state !== "ready" ||
        variant.outputAssetId === null
      ) {
        return false;
      }
      const output = this.assets.get(variant.outputAssetId);
      return (
        output !== undefined &&
        output.state === "available" &&
        !hasReached(this.clock, output.retention.accessExpiresAt)
      );
    });
    this.consultations.set(consultationId, {
      ...consultation,
      status: hasUsableReadyResult ? "reviewing" : "ready",
      version: consultation.version + 1,
    });
  }

  private shareContainsAsset(share: PrivateShare, assetId: AssetId): boolean {
    return share.variantIds.some(
      (variantId) => this.variants.get(variantId)?.outputAssetId === assetId,
    );
  }
}

function idempotencyLookupKey(request: IdempotencyRequest): string {
  return `${request.tenantId}:${request.operation}:${request.key}`;
}

function earlierInstant<Instant extends string>(left: Instant, right: Instant): Instant {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function consultationIdForCommand(
  command: ApplicationCommand,
  response?: ServiceResponse<CommandResult>,
): ConsultationId | null {
  if ("consultationId" in command) {
    return command.consultationId;
  }
  if (
    command.operation === "consultation.create" &&
    response?.ok &&
    !Array.isArray(response.value) &&
    "id" in response.value
  ) {
    return response.value.id as ConsultationId;
  }
  return null;
}

function commandResponseContainsConsultationContent(
  command: ApplicationCommand,
): boolean {
  return [
    "generation.request",
    "generation.cancel",
    "variant.publish",
    "variant.retry",
    "consultation.update",
    "consultation.agree",
    "consultation.save",
  ].includes(command.operation);
}

function deletionInitiator(actor: Actor): DeletionInitiatorRole {
  switch (actor.kind) {
    case "tenant_member":
      return actor.role;
    case "consultation_control":
      return "client_control";
    case "privacy_operator":
      return "privacy_operator";
    case "service":
      return actor.role === "retention_worker"
        ? "retention_worker"
        : "privacy_operator";
    case "private_share":
    case "deletion_status":
      return "client_control";
  }
}

function actorHandle(
  actor: Actor,
): MediaAuthorization["issuedToActorId"] {
  switch (actor.kind) {
    case "tenant_member":
    case "privacy_operator":
    case "service":
      return actor.actorId;
    case "consultation_control":
    case "private_share":
    case "deletion_status":
      return actor.capabilityId;
  }
}

function success<Value>(value: Value): ServiceResponse<Value> {
  return { ok: true, value };
}

function failure(
  code: Exclude<ServiceResponse<never>, { ok: true }>["code"],
  retryable = false,
): Exclude<ServiceResponse<never>, { ok: true }> {
  return { ok: false, code, retryable };
}

