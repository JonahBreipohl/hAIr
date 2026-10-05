declare const opaqueIdBrand: unique symbol;

export const opaqueIdKinds = [
  "actor",
  "asset",
  "attempt",
  "capability",
  "consentReceipt",
  "consultation",
  "deletionRequest",
  "fingerprint",
  "idempotency",
  "privacyRequest",
  "request",
  "result",
  "saveReceipt",
  "session",
  "share",
  "tenant",
  "variant",
] as const;

export type OpaqueIdKind = (typeof opaqueIdKinds)[number];

export type OpaqueId<Kind extends OpaqueIdKind> = string & {
  readonly [opaqueIdBrand]: Kind;
};

const prefixes = {
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

const opaqueBodyPattern = /^[A-Za-z0-9_-]{16,96}$/;

/**
 * Validates a server-issued opaque handle. IDs cannot contain names, paths,
 * email addresses, or other user-entered material.
 */
export function parseOpaqueId<Kind extends OpaqueIdKind>(
  kind: Kind,
  value: string,
): OpaqueId<Kind> {
  const prefix = `${prefixes[kind]}_`;
  const body = value.slice(prefix.length);

  if (!value.startsWith(prefix) || !opaqueBodyPattern.test(body)) {
    throw new Error(`Invalid opaque ${kind} identifier.`);
  }

  return value as OpaqueId<Kind>;
}

export type ActorId = OpaqueId<"actor">;
export type AssetId = OpaqueId<"asset">;
export type AttemptId = OpaqueId<"attempt">;
export type CapabilityId = OpaqueId<"capability">;
export type ConsentReceiptId = OpaqueId<"consentReceipt">;
export type ConsultationId = OpaqueId<"consultation">;
export type DeletionRequestId = OpaqueId<"deletionRequest">;
export type RequestFingerprint = OpaqueId<"fingerprint">;
export type IdempotencyKey = OpaqueId<"idempotency">;
export type PrivacyRequestId = OpaqueId<"privacyRequest">;
export type RequestId = OpaqueId<"request">;
export type ResultId = OpaqueId<"result">;
export type SaveReceiptId = OpaqueId<"saveReceipt">;
export type SessionId = OpaqueId<"session">;
export type ShareId = OpaqueId<"share">;
export type TenantId = OpaqueId<"tenant">;
export type VariantId = OpaqueId<"variant">;

