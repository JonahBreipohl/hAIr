import { hasReached, type Clock, type IsoInstant } from "./clock";
import type {
  ActorId,
  CapabilityId,
  ConsultationId,
  DeletionRequestId,
  PrivacyRequestId,
  ShareId,
  TenantId,
} from "./identifiers";

export const applicationOperations = [
  "consultation.create",
  "consent.record",
  "asset.accept",
  "consultation.read",
  "consultation.update",
  "generation.request",
  "generation.cancel",
  "variant.publish",
  "variant.retry",
  "consultation.agree",
  "consultation.save",
  "share.create",
  "share.resolve",
  "share.revoke",
  "media.authorize",
  "deletion.request",
  "deletion.status.read",
  "retention.expire",
  "deletion.component.update",
] as const;

export type ApplicationOperation = (typeof applicationOperations)[number];

export type ActorKind =
  | "tenant_member"
  | "consultation_control"
  | "private_share"
  | "deletion_status"
  | "privacy_operator"
  | "service";

export type TenantRole = "stylist" | "salon_admin";

export type Actor =
  | {
      readonly kind: "tenant_member";
      readonly actorId: ActorId;
      readonly tenantId: TenantId;
      readonly role: TenantRole;
      readonly membership: "active" | "removed";
    }
  | {
      readonly kind: "consultation_control";
      readonly tenantId: TenantId;
      readonly consultationId: ConsultationId;
      readonly capabilityId: CapabilityId;
      readonly expiresAt: IsoInstant;
      readonly revokedAt: IsoInstant | null;
    }
  | {
      readonly kind: "private_share";
      readonly tenantId: TenantId;
      readonly consultationId: ConsultationId;
      readonly shareId: ShareId;
      readonly capabilityId: CapabilityId;
      readonly expiresAt: IsoInstant;
      readonly revokedAt: IsoInstant | null;
    }
  | {
      readonly kind: "deletion_status";
      readonly tenantId: TenantId;
      readonly deletionRequestId: DeletionRequestId;
      readonly capabilityId: CapabilityId;
      readonly expiresAt: IsoInstant;
    }
  | {
      readonly kind: "privacy_operator";
      readonly actorId: ActorId;
      readonly tenantId: TenantId;
      readonly privacyRequestId: PrivacyRequestId;
      readonly targetConsultationId: ConsultationId;
      readonly targetDeletionRequestId?: DeletionRequestId;
      readonly requestVerified: boolean;
    }
  | {
      readonly kind: "service";
      readonly actorId: ActorId;
      readonly role:
        | "generation_worker"
        | "retention_worker"
        | "deletion_worker";
    };

export interface AuthorizationResource {
  readonly tenantId: TenantId;
  readonly consultationId?: ConsultationId;
  readonly assignedActorIds: readonly ActorId[];
  readonly controlCapabilityId?: CapabilityId;
  readonly shareId?: ShareId;
  readonly shareCapabilityId?: CapabilityId;
  readonly deletionRequestId?: DeletionRequestId;
  readonly deletionStatusCapabilityId?: CapabilityId;
  readonly privacyRequestId?: PrivacyRequestId;
  readonly accessExpiresAt?: IsoInstant;
  readonly inaccessible: boolean;
}

export interface OperationAuthorizationRequirement {
  readonly allowedActorKinds: readonly ActorKind[];
  readonly requirement: string;
}

export const operationAuthorizationRequirements = {
  "consultation.create": {
    allowedActorKinds: ["tenant_member"],
    requirement: "Active stylist or salon admin in the target tenant.",
  },
  "consent.record": {
    allowedActorKinds: ["consultation_control"],
    requirement: "Matching unexpired consultation-control capability acting as the client authority; salon staff cannot acknowledge for the client.",
  },
  "asset.accept": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or control capability, plus valid consent receipt.",
  },
  "consultation.read": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or matching unexpired control capability.",
  },
  "consultation.update": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or matching unexpired control capability.",
  },
  "generation.request": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or control capability; consent and retention remain valid.",
  },
  "generation.cancel": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or matching unexpired control capability; cancellation preserves completed variants.",
  },
  "variant.publish": {
    allowedActorKinds: ["service"],
    requirement: "Generation worker only; current attempt, retention, and tombstone checks still apply.",
  },
  "variant.retry": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or control capability; retryable state and deadline required.",
  },
  "consultation.agree": {
    allowedActorKinds: ["tenant_member"],
    requirement: "Explicitly assigned same-tenant active stylist or salon admin records the professional feasibility decision.",
  },
  "consultation.save": {
    allowedActorKinds: ["consultation_control"],
    requirement: "Matching unexpired consultation-control capability explicitly chooses 30-day retention after agreement; salon staff cannot acknowledge for the client.",
  },
  "share.create": {
    allowedActorKinds: ["tenant_member"],
    requirement: "Explicitly assigned same-tenant active stylist or salon admin; selected ready variants only.",
  },
  "share.resolve": {
    allowedActorKinds: ["private_share"],
    requirement: "Matching unexpired, unrevoked read-only share capability.",
  },
  "share.revoke": {
    allowedActorKinds: ["tenant_member", "consultation_control"],
    requirement: "Explicitly assigned same-tenant active member or matching consultation-control capability.",
  },
  "media.authorize": {
    allowedActorKinds: [
      "tenant_member",
      "consultation_control",
      "private_share",
    ],
    requirement: "Explicitly assigned same-tenant consultation reader or scoped capability; share access is limited to shared result assets.",
  },
  "deletion.request": {
    allowedActorKinds: [
      "tenant_member",
      "consultation_control",
      "privacy_operator",
    ],
    requirement: "Explicitly assigned same-tenant active member, control capability, or verified privacy request bound to the consultation.",
  },
  "deletion.status.read": {
    allowedActorKinds: [
      "tenant_member",
      "consultation_control",
      "deletion_status",
      "privacy_operator",
    ],
    requirement: "Explicitly assigned same-tenant member, matching deletion-status capability, or verified privacy request bound to both the consultation and deletion request.",
  },
  "retention.expire": {
    allowedActorKinds: ["service"],
    requirement: "Retention worker only; invokes the same idempotent deletion path.",
  },
  "deletion.component.update": {
    allowedActorKinds: ["service"],
    requirement: "Deletion worker only; monotonic component and receipt updates.",
  },
} as const satisfies Readonly<
  Record<ApplicationOperation, OperationAuthorizationRequirement>
>;

export type AuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "not_found_or_unauthorized" };

const contentOperations = new Set<ApplicationOperation>([
  "consent.record",
  "asset.accept",
  "consultation.read",
  "consultation.update",
  "generation.request",
  "generation.cancel",
  "variant.publish",
  "variant.retry",
  "consultation.agree",
  "consultation.save",
  "share.create",
  "share.resolve",
  "share.revoke",
  "media.authorize",
]);

export function authorizeOperation(
  actor: Actor,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
  clock: Clock,
): AuthorizationDecision {
  if (
    contentOperations.has(operation) &&
    (resource.inaccessible ||
      (resource.accessExpiresAt !== undefined &&
        hasReached(clock, resource.accessExpiresAt)))
  ) {
    return denied();
  }

  switch (actor.kind) {
    case "tenant_member":
      return authorizeTenantMember(actor, operation, resource);
    case "consultation_control":
      return authorizeConsultationControl(actor, operation, resource, clock);
    case "private_share":
      return authorizePrivateShare(actor, operation, resource, clock);
    case "deletion_status":
      return authorizeDeletionStatus(actor, operation, resource, clock);
    case "privacy_operator":
      return authorizePrivacyOperator(actor, operation, resource);
    case "service":
      return authorizeService(actor, operation);
  }
}

function authorizeTenantMember(
  actor: Extract<Actor, { kind: "tenant_member" }>,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
): AuthorizationDecision {
  const allowed = new Set<ApplicationOperation>([
    "consultation.create",
    "asset.accept",
    "consultation.read",
    "consultation.update",
    "generation.request",
    "generation.cancel",
    "variant.retry",
    "consultation.agree",
    "share.create",
    "share.revoke",
    "media.authorize",
    "deletion.request",
    "deletion.status.read",
  ]);

  if (
    actor.membership !== "active" ||
    actor.tenantId !== resource.tenantId ||
    !allowed.has(operation)
  ) {
    return denied();
  }

  if (operation === "consultation.create") {
    return permitted();
  }

  return resource.consultationId !== undefined &&
    resource.assignedActorIds.includes(actor.actorId)
    ? permitted()
    : denied();
}

function authorizeConsultationControl(
  actor: Extract<Actor, { kind: "consultation_control" }>,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
  clock: Clock,
): AuthorizationDecision {
  const allowed = new Set<ApplicationOperation>([
    "consent.record",
    "asset.accept",
    "consultation.read",
    "consultation.update",
    "generation.request",
    "generation.cancel",
    "variant.retry",
    "consultation.save",
    "share.revoke",
    "media.authorize",
    "deletion.request",
    "deletion.status.read",
  ]);

  return actor.tenantId === resource.tenantId &&
    actor.consultationId === resource.consultationId &&
    actor.capabilityId === resource.controlCapabilityId &&
    actor.revokedAt === null &&
    !hasReached(clock, actor.expiresAt) &&
    allowed.has(operation)
    ? permitted()
    : denied();
}

function authorizePrivateShare(
  actor: Extract<Actor, { kind: "private_share" }>,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
  clock: Clock,
): AuthorizationDecision {
  return actor.tenantId === resource.tenantId &&
    actor.consultationId === resource.consultationId &&
    actor.shareId === resource.shareId &&
    actor.capabilityId === resource.shareCapabilityId &&
    actor.revokedAt === null &&
    !hasReached(clock, actor.expiresAt) &&
    (operation === "share.resolve" || operation === "media.authorize")
    ? permitted()
    : denied();
}

function authorizeDeletionStatus(
  actor: Extract<Actor, { kind: "deletion_status" }>,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
  clock: Clock,
): AuthorizationDecision {
  return operation === "deletion.status.read" &&
    actor.tenantId === resource.tenantId &&
    actor.deletionRequestId === resource.deletionRequestId &&
    actor.capabilityId === resource.deletionStatusCapabilityId &&
    !hasReached(clock, actor.expiresAt)
    ? permitted()
    : denied();
}

function authorizePrivacyOperator(
  actor: Extract<Actor, { kind: "privacy_operator" }>,
  operation: ApplicationOperation,
  resource: AuthorizationResource,
): AuthorizationDecision {
  const requestTargetsConsultation =
    actor.requestVerified &&
    actor.tenantId === resource.tenantId &&
    actor.privacyRequestId === resource.privacyRequestId &&
    actor.targetConsultationId === resource.consultationId;

  if (operation === "deletion.request") {
    return requestTargetsConsultation ? permitted() : denied();
  }

  if (operation === "deletion.status.read") {
    return requestTargetsConsultation &&
      actor.targetDeletionRequestId !== undefined &&
      actor.targetDeletionRequestId === resource.deletionRequestId
      ? permitted()
      : denied();
  }

  return denied();
}

function authorizeService(
  actor: Extract<Actor, { kind: "service" }>,
  operation: ApplicationOperation,
): AuthorizationDecision {
  const allowedByRole: Readonly<
    Record<Extract<Actor, { kind: "service" }>["role"], ApplicationOperation>
  > = {
    generation_worker: "variant.publish",
    retention_worker: "retention.expire",
    deletion_worker: "deletion.component.update",
  };

  return allowedByRole[actor.role] === operation ? permitted() : denied();
}

function permitted(): AuthorizationDecision {
  return { allowed: true };
}

function denied(): AuthorizationDecision {
  return { allowed: false, reason: "not_found_or_unauthorized" };
}

