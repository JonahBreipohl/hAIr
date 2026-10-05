import type { Actor, ApplicationOperation } from "./authorization";
import type { IsoInstant } from "./clock";
import type { FeasibilityState, HairSpecification } from "./consultation";
import type {
  ActorId,
  AssetId,
  AttemptId,
  CapabilityId,
  ConsentReceiptId,
  ConsultationId,
  DeletionRequestId,
  IdempotencyKey,
  RequestFingerprint,
  RequestId,
  SaveReceiptId,
  SessionId,
  ShareId,
  TenantId,
  VariantId,
} from "./identifiers";
import type {
  AssetClass,
  ClientAcknowledgementMethod,
  ConsentReceipt,
  ConsentScope,
  ConsultationRecord,
  DeletionComponentName,
  DeletionComponentStatus,
  DeletionReason,
  DeletionReceipt,
  OpaqueAsset,
  PrivateShare,
  SaveReceipt,
  SharedConsultationBrief,
  Variant,
  VariantCallback,
} from "./records";

export interface CommandContext {
  readonly actor: Actor;
  readonly requestId: RequestId;
  readonly idempotencyKey: IdempotencyKey;
  /** Digest of canonical fields; request content itself is never an idempotency record. */
  readonly fingerprint: RequestFingerprint;
}

export interface QueryContext {
  readonly actor: Actor;
  readonly requestId: RequestId;
}

export type ApplicationCommand =
  | {
      readonly operation: "consultation.create";
      readonly context: CommandContext;
      readonly tenantId: TenantId;
    }
  | {
      readonly operation: "consent.record";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly receiptId: ConsentReceiptId;
      readonly sessionId: SessionId;
      readonly policyVersion: string;
      readonly retentionNoticeVersion: string;
      readonly providerDisclosureVersion: string;
      readonly acknowledgementMethod: ClientAcknowledgementMethod;
      readonly adultConfirmed: boolean;
      readonly referenceRightsConfirmed: boolean;
      readonly scopes: readonly ConsentScope[];
    }
  | {
      readonly operation: "asset.accept";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly assetId: AssetId;
      readonly assetClass: AssetClass;
      readonly parentAssetIds: readonly AssetId[];
    }
  | {
      readonly operation: "consultation.update";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly specification: HairSpecification;
    }
  | {
      readonly operation: "generation.request";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly sourceAssetId: AssetId;
      readonly referenceAssetId: AssetId | null;
      readonly specification: HairSpecification;
      readonly promptVersion: string;
      readonly previewCount: number;
    }
  | {
      readonly operation: "generation.cancel";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
    }
  | {
      readonly operation: "variant.publish";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly variantId: VariantId;
      readonly callback: VariantCallback;
    }
  | {
      readonly operation: "variant.retry";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly variantId: VariantId;
      readonly nextAttemptId: AttemptId;
    }
  | {
      readonly operation: "consultation.agree";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly variantId: VariantId;
      readonly feasibility: FeasibilityState;
      readonly serviceNotes: string;
      readonly maintenanceNotes: string;
    }
  | {
      readonly operation: "consultation.save";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly receiptId: SaveReceiptId;
      readonly disclosureVersion: string;
      readonly saveChoice: "save_30_days";
      readonly acknowledgementMethod: ClientAcknowledgementMethod;
    }
  | {
      readonly operation: "share.create";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly shareId: ShareId;
      readonly capabilityId: CapabilityId;
      readonly variantIds: readonly VariantId[];
    }
  | {
      readonly operation: "share.revoke";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly shareId: ShareId;
    }
  | {
      readonly operation: "deletion.request";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly deletionRequestId: DeletionRequestId;
      readonly statusCapabilityId: CapabilityId;
      readonly reason: DeletionReason;
    }
  | {
      readonly operation: "retention.expire";
      readonly context: CommandContext;
      readonly consultationId: ConsultationId;
      readonly deletionRequestId: DeletionRequestId;
      readonly statusCapabilityId: CapabilityId;
    }
  | {
      readonly operation: "deletion.component.update";
      readonly context: CommandContext;
      readonly deletionRequestId: DeletionRequestId;
      readonly component: DeletionComponentName;
      readonly status: DeletionComponentStatus;
    };

export type ApplicationQuery =
  | {
      readonly operation: "consultation.read";
      readonly context: QueryContext;
      readonly consultationId: ConsultationId;
    }
  | {
      readonly operation: "share.resolve";
      readonly context: QueryContext;
      readonly shareId: ShareId;
    }
  | {
      readonly operation: "media.authorize";
      readonly context: QueryContext;
      readonly consultationId: ConsultationId;
      readonly assetId: AssetId;
    }
  | {
      readonly operation: "deletion.status.read";
      readonly context: QueryContext;
      readonly deletionRequestId: DeletionRequestId;
    };

export type CommandOperation = ApplicationCommand["operation"];
export type QueryOperation = ApplicationQuery["operation"];

type ContractOperationCoverage =
  Exclude<ApplicationOperation, CommandOperation | QueryOperation> extends never
    ? true
    : never;

export const applicationContractCoversEveryOperation: ContractOperationCoverage =
  true;

export type CommandResult =
  | ConsultationRecord
  | ConsentReceipt
  | OpaqueAsset
  | readonly Variant[]
  | Variant
  | PrivateShare
  | SaveReceipt
  | DeletionReceipt;

export type QueryResult =
  | ConsultationRecord
  | SharedConsultationBrief
  | DeletionReceipt
  | MediaAuthorization;

export interface MediaAuthorization {
  readonly assetId: AssetId;
  readonly issuedToActorId: ActorId | CapabilityId;
  readonly expiresAt: IsoInstant;
  readonly cachePolicy: "private_no_store";
}

export type ServiceFailureCode =
  | "not_found_or_unauthorized"
  | "invalid_state"
  | "invalid_request"
  | "idempotency_conflict"
  | "retention_expired"
  | "temporarily_unavailable";

export type ServiceResponse<Value> =
  | { readonly ok: true; readonly value: Value }
  | {
      readonly ok: false;
      readonly code: ServiceFailureCode;
      readonly retryable: boolean;
    };

/**
 * Private server-side boundary. Authentication, storage, queues, providers,
 * and HTTP are adapters around this contract rather than domain dependencies.
 */
export interface PrivateApplicationService {
  execute(command: ApplicationCommand): Promise<ServiceResponse<CommandResult>>;
  query(query: ApplicationQuery): Promise<ServiceResponse<QueryResult>>;
}

