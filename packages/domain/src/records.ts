import {
  feasibilityStates,
  type ConsultationStatus,
  type FeasibilityState,
  type HairSpecification,
} from "./consultation";
import {
  clockNow,
  deriveAssetRetention,
  deriveConsultationRetention,
  deriveDeletionSchedule,
  deriveShareExpiry,
  hasReached,
  type AssetRetentionSchedule,
  type Clock,
  type DeletionSchedule,
  type IsoInstant,
  type RetentionPolicy,
  type RetentionSchedule,
} from "./clock";
import type {
  ActorId,
  AssetId,
  AttemptId,
  CapabilityId,
  ConsentReceiptId,
  ConsultationId,
  DeletionRequestId,
  IdempotencyKey,
  SaveReceiptId,
  SessionId,
  ShareId,
  TenantId,
  VariantId,
} from "./identifiers";

export const consentScopes = [
  "portrait_processing",
  "ai_hairstyle_generation",
  "reference_image_processing",
  "private_result_sharing",
] as const;

export type ConsentScope = (typeof consentScopes)[number];

export const currentConsentContractVersions = Object.freeze({
  policy: "consent-v1",
  retentionNotice: "retention-v1",
  providerDisclosure: "provider-v1",
} as const);

export const currentSaveDisclosureVersion = "save-v1" as const;
export type ClientAcknowledgementMethod = "client_explicit_tap";

export interface ConsentReceipt {
  readonly id: ConsentReceiptId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly sessionId: SessionId;
  readonly acknowledgedAt: IsoInstant;
  readonly purpose: "salon_hairstyle_consultation";
  readonly policyVersion: string;
  readonly retentionNoticeVersion: string;
  readonly providerDisclosureVersion: string;
  readonly acknowledgementMethod: ClientAcknowledgementMethod;
  readonly adultConfirmed: true;
  readonly referenceRightsConfirmed: boolean;
  readonly scopes: readonly ConsentScope[];
}

/** Content-free proof that the client explicitly selected 30-day retention. */
export interface SaveReceipt {
  readonly id: SaveReceiptId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly disclosureVersion: string;
  readonly saveChoice: "save_30_days";
  readonly acknowledgedAt: IsoInstant;
  readonly accessExpiresAt: IsoInstant;
  readonly acknowledgementMethod: ClientAcknowledgementMethod;
}

export interface ConsultationAgreement {
  readonly variantId: VariantId;
  readonly feasibility: FeasibilityState;
  readonly serviceNotes: string;
  readonly maintenanceNotes: string;
  readonly agreedAt: IsoInstant;
}

export interface ConsultationRecord {
  readonly id: ConsultationId;
  readonly tenantId: TenantId;
  readonly createdByActorId: ActorId;
  readonly status: ConsultationStatus;
  readonly createdAt: IsoInstant;
  readonly consentReceiptId: ConsentReceiptId | null;
  readonly saveReceiptId: SaveReceiptId | null;
  readonly agreement: ConsultationAgreement | null;
  readonly retention: RetentionSchedule;
  readonly deletionRequestId: DeletionRequestId | null;
  readonly version: number;
}

export const assetClasses = [
  "source_portrait",
  "inspiration_reference",
  "normalized_source",
  "hair_mask",
  "generated_preview",
  "thumbnail",
  "share_render",
] as const;

export type AssetClass = (typeof assetClasses)[number];

export const assetStates = [
  "accepted",
  "available",
  "inaccessible",
  "deletion_requested",
  "purging",
  "verified_deleted",
  "expired",
] as const;

export type AssetState = (typeof assetStates)[number];

/** Metadata-only handle. Storage keys, filenames, URLs, and bytes are excluded. */
export interface OpaqueAsset {
  readonly id: AssetId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly consentReceiptId: ConsentReceiptId;
  readonly assetClass: AssetClass;
  readonly state: AssetState;
  readonly parentAssetIds: readonly AssetId[];
  readonly retention: AssetRetentionSchedule;
}

export const variantStates = [
  "queued",
  "running",
  "ready",
  "failed",
  "policy_rejected",
  "canceled",
  "expired",
  "deleted",
] as const;

export type VariantState = (typeof variantStates)[number];

export const variantCallbackTerminalStates: readonly VariantState[] = [
  "ready",
  "failed",
  "policy_rejected",
  "canceled",
  "expired",
  "deleted",
];

export interface Variant {
  readonly id: VariantId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly index: number;
  readonly specification: HairSpecification;
  readonly promptVersion: string;
  readonly state: VariantState;
  readonly attemptId: AttemptId;
  readonly attemptNumber: number;
  readonly idempotencyKey: IdempotencyKey;
  readonly outputAssetId: AssetId | null;
  readonly safeFailureCode:
    | "provider_unavailable"
    | "provider_timeout"
    | "invalid_output"
    | "policy_rejected"
    | null;
  readonly retention: RetentionSchedule;
}

export type VariantCallback =
  | {
      readonly attemptId: AttemptId;
      readonly outcome: "ready";
      readonly outputAssetId: AssetId;
    }
  | {
      readonly attemptId: AttemptId;
      readonly outcome: "failed";
      readonly safeFailureCode:
        | "provider_unavailable"
        | "provider_timeout"
        | "invalid_output";
    }
  | {
      readonly attemptId: AttemptId;
      readonly outcome: "policy_rejected";
      readonly safeFailureCode: "policy_rejected";
    };

export type VariantCallbackDecision =
  | { readonly action: "apply"; readonly next: Variant }
  | {
      readonly action: "ignore";
      readonly reason: "stale_attempt" | "not_running" | "terminal_state";
    }
  | { readonly action: "duplicate"; readonly current: Variant };

export const shareStates = ["active", "revoked", "expired"] as const;
export type ShareState = (typeof shareStates)[number];

/** A private share stores only the verified capability handle, never its secret. */
export interface PrivateShare {
  readonly id: ShareId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly capabilityId: CapabilityId;
  readonly variantIds: readonly VariantId[];
  readonly state: ShareState;
  readonly createdAt: IsoInstant;
  readonly expiresAt: IsoInstant;
  readonly revokedAt: IsoInstant | null;
}

/** Public-safe metadata for the one generated result selected for a share. */
export interface SharedGeneratedVariantMetadata {
  readonly variantId: VariantId;
  readonly outputAssetId: AssetId;
  readonly specification: HairSpecification;
}

/**
 * The complete read-only payload returned to a private-share viewer.
 *
 * It deliberately excludes tenant membership, client identity, source/reference
 * assets, provider/job fields, capabilities, and every unselected variant.
 */
export interface SharedConsultationBrief {
  readonly selectedVariant: SharedGeneratedVariantMetadata;
  readonly agreement: Readonly<
    Pick<
      ConsultationAgreement,
      "feasibility" | "serviceNotes" | "maintenanceNotes"
    >
  >;
  readonly expiresAt: IsoInstant;
  readonly disclosure: typeof sharedConsultationDisclosure;
}

export const sharedConsultationDisclosure =
  "AI visualization only. The preview is not a guaranteed service outcome or exact chemical color prediction." as const;

export const deletionComponentNames = [
  "authorization",
  "jobs",
  "media_grants",
  "object_storage",
  "provider",
  "database_content",
  "indexes",
  "worker_temporary_storage",
  "backup_suppression",
] as const;

export type DeletionComponentName = (typeof deletionComponentNames)[number];

export type DeletionComponentStatus =
  | "pending"
  | "retrying"
  | "verified_absent"
  | "provider_exception";

export interface DeletionComponentReceipt {
  readonly name: DeletionComponentName;
  readonly attempts: number;
  readonly status: DeletionComponentStatus;
  readonly verifiedAt: IsoInstant | null;
}

export const deletionStates = [
  "deletion_requested",
  "purging",
  "purge_delayed",
  "verified",
  "provider_exception",
] as const;

export type DeletionState = (typeof deletionStates)[number];

export const deletionTerminalStates: readonly DeletionState[] = [
  "verified",
  "provider_exception",
];

export type DeletionReason =
  | "user_request"
  | "consent_withdrawal"
  | "expiry"
  | "account_closure"
  | "privacy_request";

export type DeletionInitiatorRole =
  | "stylist"
  | "salon_admin"
  | "client_control"
  | "privacy_operator"
  | "retention_worker";

/** Long-lived and deliberately content-free. */
export interface DeletionReceipt {
  readonly id: DeletionRequestId;
  readonly tenantId: TenantId;
  readonly consultationId: ConsultationId;
  readonly deletionGeneration: number;
  readonly reason: DeletionReason;
  readonly initiatedByRole: DeletionInitiatorRole;
  readonly statusCapabilityId: CapabilityId;
  readonly state: DeletionState;
  readonly schedule: DeletionSchedule;
  readonly components: readonly DeletionComponentReceipt[];
  readonly verifiedAt: IsoInstant | null;
}

export function createConsultationRecord(
  input: Pick<ConsultationRecord, "id" | "tenantId" | "createdByActorId">,
  clock: Clock,
  policy?: RetentionPolicy,
): ConsultationRecord {
  const retention = deriveConsultationRetention(
    clock,
    "consultation_created",
    policy,
  );

  return {
    ...input,
    status: "draft",
    createdAt: retention.basisAt,
    consentReceiptId: null,
    saveReceiptId: null,
    agreement: null,
    retention,
    deletionRequestId: null,
    version: 1,
  };
}

export function createConsultationAgreement(
  input: Omit<ConsultationAgreement, "agreedAt">,
  consultation: ConsultationRecord,
  clock: Clock,
): ConsultationAgreement {
  const serviceNotes = input.serviceNotes.trim();
  const maintenanceNotes = input.maintenanceNotes.trim();
  if (
    !["reviewing", "agreed"].includes(consultation.status) ||
    !feasibilityStates.includes(input.feasibility) ||
    serviceNotes.length === 0 ||
    serviceNotes.length > 2_000 ||
    maintenanceNotes.length > 2_000
  ) {
    throw new Error("Consultation agreement is invalid.");
  }

  return {
    ...input,
    serviceNotes,
    maintenanceNotes,
    agreedAt: clockNow(clock),
  };
}

export function createConsentReceipt(
  input: Omit<ConsentReceipt, "acknowledgedAt" | "purpose" | "adultConfirmed"> & {
    readonly adultConfirmed: boolean;
  },
  consultation: ConsultationRecord,
  clock: Clock,
): ConsentReceipt {
  if (
    consultation.id !== input.consultationId ||
    consultation.tenantId !== input.tenantId ||
    consultation.status !== "draft"
  ) {
    throw new Error("Consent receipt does not match an eligible consultation.");
  }

  if (!input.adultConfirmed) {
    throw new Error("Adult confirmation is required for the MVP.");
  }

  if (input.acknowledgementMethod !== "client_explicit_tap") {
    throw new Error("Client consent requires an explicit tap acknowledgement.");
  }

  if (
    !input.scopes.includes("portrait_processing") ||
    !input.scopes.includes("ai_hairstyle_generation")
  ) {
    throw new Error("Required consultation consent scopes are missing.");
  }

  if (
    input.policyVersion !== currentConsentContractVersions.policy ||
    input.retentionNoticeVersion !==
      currentConsentContractVersions.retentionNotice ||
    input.providerDisclosureVersion !==
      currentConsentContractVersions.providerDisclosure
  ) {
    throw new Error("Consent contract version is not current.");
  }

  return {
    ...input,
    acknowledgedAt: clockNow(clock),
    purpose: "salon_hairstyle_consultation",
    adultConfirmed: true,
  };
}

export function createSaveReceipt(
  input: Pick<
    SaveReceipt,
    | "id"
    | "tenantId"
    | "consultationId"
    | "disclosureVersion"
    | "saveChoice"
    | "acknowledgementMethod"
  >,
  consultation: ConsultationRecord,
  savedRetention: RetentionSchedule,
): SaveReceipt {
  if (
    consultation.id !== input.consultationId ||
    consultation.tenantId !== input.tenantId ||
    consultation.status !== "agreed" ||
    consultation.saveReceiptId !== null ||
    savedRetention.basis !== "consultation_saved" ||
    input.disclosureVersion !== currentSaveDisclosureVersion ||
    input.saveChoice !== "save_30_days" ||
    input.acknowledgementMethod !== "client_explicit_tap"
  ) {
    throw new Error("Save receipt is invalid for this consultation.");
  }

  return {
    ...input,
    acknowledgedAt: savedRetention.basisAt,
    accessExpiresAt: savedRetention.accessExpiresAt,
  };
}

export function attachSaveReceipt(
  consultation: ConsultationRecord,
  receipt: SaveReceipt,
  savedRetention: RetentionSchedule,
): ConsultationRecord {
  if (
    consultation.id !== receipt.consultationId ||
    consultation.tenantId !== receipt.tenantId ||
    consultation.status !== "agreed" ||
    consultation.saveReceiptId !== null ||
    savedRetention.basis !== "consultation_saved" ||
    receipt.acknowledgedAt !== savedRetention.basisAt ||
    receipt.accessExpiresAt !== savedRetention.accessExpiresAt
  ) {
    throw new Error("Save receipt cannot be attached to this consultation.");
  }

  return {
    ...consultation,
    saveReceiptId: receipt.id,
    retention: savedRetention,
    version: consultation.version + 1,
  };
}

export function attachConsentReceipt(
  consultation: ConsultationRecord,
  receipt: ConsentReceipt,
): ConsultationRecord {
  if (
    consultation.id !== receipt.consultationId ||
    consultation.tenantId !== receipt.tenantId ||
    consultation.status !== "draft"
  ) {
    throw new Error("Consent receipt cannot be attached to this consultation.");
  }

  return {
    ...consultation,
    status: "consented",
    consentReceiptId: receipt.id,
    version: consultation.version + 1,
  };
}

export function acceptOpaqueAsset(
  input: Pick<
    OpaqueAsset,
    "id" | "tenantId" | "consultationId" | "assetClass" | "parentAssetIds"
  >,
  consultation: ConsultationRecord,
  receipt: ConsentReceipt,
  clock: Clock,
  policy?: RetentionPolicy,
): OpaqueAsset {
  if (
    consultation.id !== input.consultationId ||
    consultation.tenantId !== input.tenantId ||
    receipt.id !== consultation.consentReceiptId ||
    receipt.consultationId !== consultation.id ||
    receipt.tenantId !== consultation.tenantId ||
    !isConsultationAccessible(consultation, clock)
  ) {
    throw new Error("Asset cannot be accepted for this consultation.");
  }

  if (
    input.assetClass === "inspiration_reference" &&
    (!receipt.referenceRightsConfirmed ||
      !receipt.scopes.includes("reference_image_processing"))
  ) {
    throw new Error("Reference-image authorization is required.");
  }

  if (
    ["generated_preview", "thumbnail", "share_render"].includes(
      input.assetClass,
    ) &&
    input.parentAssetIds.length === 0
  ) {
    throw new Error("Derived assets require at least one opaque parent handle.");
  }

  return {
    ...input,
    consentReceiptId: receipt.id,
    state: "accepted",
    retention: deriveAssetRetention(
      clock,
      consultation.retention.deleteDueAt,
      policy,
    ),
  };
}

export function createVariant(
  input: Omit<
    Variant,
    | "state"
    | "attemptNumber"
    | "outputAssetId"
    | "safeFailureCode"
    | "retention"
  >,
  consultation: ConsultationRecord,
): Variant {
  if (
    input.tenantId !== consultation.tenantId ||
    input.consultationId !== consultation.id ||
    input.index < 0 ||
    !Number.isInteger(input.index) ||
    input.promptVersion.trim().length === 0
  ) {
    throw new Error("Variant input is invalid for this consultation.");
  }

  return {
    ...input,
    state: "queued",
    attemptNumber: 1,
    outputAssetId: null,
    safeFailureCode: null,
    retention: consultation.retention,
  };
}

export function decideVariantCallback(
  current: Variant,
  callback: VariantCallback,
): VariantCallbackDecision {
  if (callback.attemptId !== current.attemptId) {
    return { action: "ignore", reason: "stale_attempt" };
  }

  if (current.state === callback.outcome) {
    return { action: "duplicate", current };
  }

  if (variantCallbackTerminalStates.includes(current.state)) {
    return { action: "ignore", reason: "terminal_state" };
  }

  if (current.state !== "running") {
    return { action: "ignore", reason: "not_running" };
  }

  if (callback.outcome === "ready") {
    return {
      action: "apply",
      next: {
        ...current,
        state: "ready",
        outputAssetId: callback.outputAssetId,
        safeFailureCode: null,
      },
    };
  }

  return {
    action: "apply",
    next: {
      ...current,
      state: callback.outcome,
      outputAssetId: null,
      safeFailureCode: callback.safeFailureCode,
    },
  };
}

export function createPrivateShare(
  input: Pick<
    PrivateShare,
    "id" | "tenantId" | "consultationId" | "capabilityId" | "variantIds"
  >,
  consultation: ConsultationRecord,
  clock: Clock,
  policy?: RetentionPolicy,
): PrivateShare {
  if (
    input.tenantId !== consultation.tenantId ||
    input.consultationId !== consultation.id ||
    consultation.status !== "agreed" ||
    consultation.agreement === null ||
    input.variantIds.length !== 1 ||
    input.variantIds[0] !== consultation.agreement.variantId ||
    !isConsultationAccessible(consultation, clock)
  ) {
    throw new Error("Private share input is invalid for this consultation.");
  }

  return {
    ...input,
    state: "active",
    createdAt: clockNow(clock),
    expiresAt: deriveShareExpiry(
      clock,
      consultation.retention.accessExpiresAt,
      policy,
    ),
    revokedAt: null,
  };
}

export function effectiveShareState(
  share: PrivateShare,
  clock: Clock,
): ShareState {
  if (share.state === "revoked") {
    return "revoked";
  }

  return hasReached(clock, share.expiresAt) ? "expired" : share.state;
}

export function createDeletionReceipt(
  input: Pick<
    DeletionReceipt,
    | "id"
    | "tenantId"
    | "consultationId"
    | "deletionGeneration"
    | "reason"
    | "initiatedByRole"
    | "statusCapabilityId"
  >,
  clock: Clock,
  policy?: RetentionPolicy,
): DeletionReceipt {
  if (input.deletionGeneration < 1 || !Number.isInteger(input.deletionGeneration)) {
    throw new Error("Deletion generation must be a positive integer.");
  }

  return {
    ...input,
    state: "deletion_requested",
    schedule: deriveDeletionSchedule(clock, policy),
    components: deletionComponentNames.map((name) => ({
      name,
      attempts: 0,
      status: "pending",
      verifiedAt: null,
    })),
    verifiedAt: null,
  };
}

export function canTransitionDeletion(
  from: DeletionState,
  to: DeletionState,
): boolean {
  const transitions: Readonly<Record<DeletionState, readonly DeletionState[]>> = {
    deletion_requested: [
      "purging",
      "purge_delayed",
      "verified",
      "provider_exception",
    ],
    purging: ["purge_delayed", "verified", "provider_exception"],
    purge_delayed: ["purging", "verified", "provider_exception"],
    verified: [],
    provider_exception: [],
  };

  return transitions[from].includes(to);
}

export function isConsultationAccessible(
  consultation: ConsultationRecord,
  clock: Clock,
): boolean {
  return (
    consultation.status !== "deleted" &&
    consultation.status !== "expired" &&
    consultation.deletionRequestId === null &&
    !hasReached(clock, consultation.retention.accessExpiresAt)
  );
}

