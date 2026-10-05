import type { IsoInstant } from "./clock";
import type { ApplicationOperation } from "./authorization";
import type {
  IdempotencyKey,
  RequestFingerprint,
  ResultId,
  TenantId,
} from "./identifiers";

export interface IdempotencyRequest {
  readonly tenantId: TenantId;
  readonly operation: ApplicationOperation;
  readonly key: IdempotencyKey;
  /** Digest of the normalized command; never the raw request body. */
  readonly fingerprint: RequestFingerprint;
}

export type IdempotencyRecord = IdempotencyRequest &
  (
    | {
        readonly state: "in_progress";
        readonly resultId: null;
        readonly createdAt: IsoInstant;
        readonly expiresAt: IsoInstant;
      }
    | {
        readonly state: "completed";
        readonly resultId: ResultId;
        readonly createdAt: IsoInstant;
        readonly expiresAt: IsoInstant;
      }
  );

export type IdempotencyDecision =
  | { readonly action: "execute" }
  | { readonly action: "wait" }
  | { readonly action: "replay"; readonly resultId: ResultId }
  | { readonly action: "conflict" };

/**
 * Resolves a lookup from the unique scope `(tenant, operation, key)`.
 * A reused key with a different normalized command never executes.
 */
export function decideIdempotency(
  request: IdempotencyRequest,
  existing: IdempotencyRecord | null,
): IdempotencyDecision {
  if (existing === null) {
    return { action: "execute" };
  }

  if (
    existing.tenantId !== request.tenantId ||
    existing.operation !== request.operation ||
    existing.key !== request.key ||
    existing.fingerprint !== request.fingerprint
  ) {
    return { action: "conflict" };
  }

  return existing.state === "completed"
    ? { action: "replay", resultId: existing.resultId }
    : { action: "wait" };
}

