declare const isoInstantBrand: unique symbol;

export type IsoInstant = string & { readonly [isoInstantBrand]: true };

export interface Clock {
  now(): Date;
}

export interface RetentionPolicy {
  readonly version: string;
  readonly unsavedConsultationMs: number;
  readonly savedConsultationMs: number;
  readonly sourceAssetMaximumMs: number;
  readonly shareMaximumMs: number;
  readonly purgeLeadTimeMs: number;
  readonly deletionCompletionMaximumMs: number;
  readonly deletionStatusCapabilityMs: number;
  readonly receiptRetentionMonths: number;
  readonly backupMaximumMs: number;
  readonly mediaGrantMaximumMs: number;
}

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export const defaultRetentionPolicy: RetentionPolicy = Object.freeze({
  version: "retention-v1",
  unsavedConsultationMs: 24 * hour,
  savedConsultationMs: 30 * day,
  sourceAssetMaximumMs: 24 * hour,
  shareMaximumMs: 24 * hour,
  purgeLeadTimeMs: 15 * minute,
  deletionCompletionMaximumMs: 24 * hour,
  deletionStatusCapabilityMs: 30 * day,
  receiptRetentionMonths: 24,
  backupMaximumMs: 35 * day,
  mediaGrantMaximumMs: 5 * minute,
});

export interface RetentionSchedule {
  readonly policyVersion: string;
  readonly basis: "consultation_created" | "consultation_saved";
  readonly basisAt: IsoInstant;
  readonly accessExpiresAt: IsoInstant;
  readonly purgeStartsAt: IsoInstant;
  readonly deleteDueAt: IsoInstant;
}

export interface AssetRetentionSchedule {
  readonly policyVersion: string;
  readonly acceptedAt: IsoInstant;
  readonly accessExpiresAt: IsoInstant;
  readonly purgeStartsAt: IsoInstant;
  readonly deleteDueAt: IsoInstant;
}

export interface DeletionSchedule {
  readonly policyVersion: string;
  readonly requestedAt: IsoInstant;
  readonly accessRevokedAt: IsoInstant;
  readonly targetCompleteBy: IsoInstant;
  readonly statusCapabilityExpiresAt: IsoInstant;
  readonly receiptExpiresAt: IsoInstant;
  readonly backupAgesOutBy: IsoInstant;
}

export function clockNow(clock: Clock): IsoInstant {
  const current = clock.now();

  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error("Clock returned an invalid instant.");
  }

  return current.toISOString() as IsoInstant;
}

export function deriveConsultationRetention(
  clock: Clock,
  basis: RetentionSchedule["basis"],
  policy: RetentionPolicy = defaultRetentionPolicy,
): RetentionSchedule {
  const basisAt = clockNow(clock);
  const duration =
    basis === "consultation_saved"
      ? policy.savedConsultationMs
      : policy.unsavedConsultationMs;
  const deleteDueAt = addMilliseconds(basisAt, duration);
  const purgeStartsAt = addMilliseconds(deleteDueAt, -policy.purgeLeadTimeMs);

  return {
    policyVersion: policy.version,
    basis,
    basisAt,
    accessExpiresAt: purgeStartsAt,
    purgeStartsAt,
    deleteDueAt,
  };
}

export function deriveAssetRetention(
  clock: Clock,
  consultationDeleteDueAt: IsoInstant,
  policy: RetentionPolicy = defaultRetentionPolicy,
): AssetRetentionSchedule {
  const acceptedAt = clockNow(clock);
  const ownDeleteDueAt = addMilliseconds(
    acceptedAt,
    policy.sourceAssetMaximumMs,
  );
  const deleteDueAt = earlierOf(ownDeleteDueAt, consultationDeleteDueAt);
  const purgeStartsAt = addMilliseconds(deleteDueAt, -policy.purgeLeadTimeMs);

  return {
    policyVersion: policy.version,
    acceptedAt,
    accessExpiresAt: purgeStartsAt,
    purgeStartsAt,
    deleteDueAt,
  };
}

export function deriveShareExpiry(
  clock: Clock,
  consultationAccessExpiresAt: IsoInstant,
  policy: RetentionPolicy = defaultRetentionPolicy,
): IsoInstant {
  return earlierOf(
    addMilliseconds(clockNow(clock), policy.shareMaximumMs),
    consultationAccessExpiresAt,
  );
}

export function deriveMediaGrantExpiry(
  clock: Clock,
  resourceAccessExpiresAt: IsoInstant,
  policy: RetentionPolicy = defaultRetentionPolicy,
): IsoInstant {
  return earlierOf(
    addMilliseconds(clockNow(clock), policy.mediaGrantMaximumMs),
    resourceAccessExpiresAt,
  );
}

export function deriveDeletionSchedule(
  clock: Clock,
  policy: RetentionPolicy = defaultRetentionPolicy,
): DeletionSchedule {
  const requestedAt = clockNow(clock);

  return {
    policyVersion: policy.version,
    requestedAt,
    accessRevokedAt: requestedAt,
    targetCompleteBy: addMilliseconds(
      requestedAt,
      policy.deletionCompletionMaximumMs,
    ),
    statusCapabilityExpiresAt: addMilliseconds(
      requestedAt,
      policy.deletionStatusCapabilityMs,
    ),
    receiptExpiresAt: addUtcMonths(requestedAt, policy.receiptRetentionMonths),
    backupAgesOutBy: addMilliseconds(requestedAt, policy.backupMaximumMs),
  };
}

export function hasReached(clock: Clock, instant: IsoInstant): boolean {
  return Date.parse(clockNow(clock)) >= Date.parse(instant);
}

function addMilliseconds(instant: IsoInstant, milliseconds: number): IsoInstant {
  return new Date(Date.parse(instant) + milliseconds).toISOString() as IsoInstant;
}

function addUtcMonths(instant: IsoInstant, months: number): IsoInstant {
  const result = new Date(Date.parse(instant));
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.toISOString() as IsoInstant;
}

function earlierOf(left: IsoInstant, right: IsoInstant): IsoInstant {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

