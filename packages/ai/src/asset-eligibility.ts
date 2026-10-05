import { evaluationProtocolId, sha256EvaluationManifest } from "./benchmark";

export const assetManifestSchemaVersion = "1.0.0";
export const assetEligibilityVersion = "hair-asset-eligibility-v1";
export const assetFreshnessPolicyVersion = "hair-asset-freshness-v1";
export const preTransferMaximumLeadMs = 5 * 60 * 1000;
export const runPlanMaximumLeadMs = 7 * 24 * 60 * 60 * 1000;
export const technicalVerificationMaximumAgeMs = 24 * 60 * 60 * 1000;

export const permittedBenchmarkUses = [
  "harness_validation",
  "provider_evaluation",
  "prompt_evaluation",
  "mask_evaluation",
  "human_quality_rating",
  "internal_aggregate_reporting",
  "pilot_release_evaluation",
  "source_distribution",
] as const;
export type BenchmarkUse = (typeof permittedBenchmarkUses)[number];

export type EvaluationStage = "T0" | "T1" | "R0" | "P1";
export type AssetRole =
  | "source_portrait"
  | "style_reference"
  | "mask"
  | "protected_region"
  | "synthetic_test_fixture";
export type ProvenanceClass = "synthetic" | "licensed" | "explicitly_consented_adult";

export interface BenchmarkAssetManifest {
  readonly schema_version: "1.0.0";
  readonly asset_id: string;
  readonly subject_id?: string;
  readonly asset_role: AssetRole;
  readonly provenance_class: ProvenanceClass;
  readonly collection_id: string;
  readonly content_sha256: string;
  readonly restricted_locator_id: string;
  readonly mime_type: "image/jpeg" | "image/png" | "image/webp";
  readonly width_px: number;
  readonly height_px: number;
  readonly metadata_stripped_at: string;
  readonly subject_count: number;
  readonly adult_status?: "verified_adult" | "synthetic_adult" | "ineligible";
  readonly adult_verification_method?:
    | "government_id_seen_not_copied"
    | "verified_recruitment_record"
    | "license_record_adult_attestation"
    | "synthetic_provenance_review";
  readonly consent_receipt_id?: string;
  readonly consent_policy_version?: string;
  readonly consented_at?: string;
  readonly consent_expires_at?: string;
  readonly license_record_id?: string;
  readonly license_version?: string;
  readonly license_verified_at?: string;
  readonly license_expires_at?: string;
  readonly synthetic_generator_id?: string;
  readonly synthetic_generator_version?: string;
  readonly synthetic_created_at?: string;
  readonly terms_snapshot_id?: string;
  readonly prompt_origin_attestation_id?: string;
  readonly real_person_likeness_review_status?: "passed" | "pending" | "failed";
  readonly source_origin_attestation:
    | "purpose_synthetic_benchmark"
    | "purpose_licensed_benchmark"
    | "purpose_collected_benchmark";
  readonly prohibited_source_review_status: "passed" | "pending" | "failed";
  readonly permitted_uses: readonly BenchmarkUse[];
  readonly permitted_providers: readonly string[];
  readonly broad_provider_grant_attestation_id?: string;
  readonly commercial_research_allowed: boolean;
  readonly human_rating_allowed: boolean;
  readonly derivative_generation_allowed: boolean;
  readonly provider_training_allowed: boolean;
  readonly offline_face_similarity_allowed: boolean;
  readonly territories: readonly string[];
  readonly retention_expires_at: string;
  readonly withdrawal_status:
    | "active"
    | "withdrawal_pending"
    | "withdrawn"
    | "not_applicable";
  readonly deletion_status:
    | "present"
    | "deletion_pending"
    | "verified_deleted"
    | "not_created";
  readonly derived_from_asset_ids: readonly string[];
  readonly preprocessing_version: string;
  readonly coverage_scheme_version?: string;
  readonly tone_band?: "ST1" | "ST2" | "ST3" | "ST4" | "ST5" | "ST6";
  readonly tone_assignment_method?: "participant_confirmed" | "trained_steward";
  readonly texture_group?: "HT1" | "HT2" | "HT3" | "HT4";
  readonly texture_assignment_method?: "participant_confirmed" | "trained_steward";
  readonly secondary_coverage_tags?: readonly string[];
  readonly quality_eligibility: "pending" | "eligible" | "suspended" | "ineligible";
  readonly quality_eligibility_reason_code?: string;
  readonly reviewed_by: string;
  readonly reviewed_at: string;
  readonly second_reviewed_by?: string;
  readonly second_reviewed_at?: string;
}

export interface AssetTechnicalVerification {
  readonly asset_id: string;
  readonly verifier_id: string;
  readonly verified_at: string;
  readonly decoded: boolean;
  readonly content_sha256: string;
  readonly mime_type: string;
  readonly width_px: number;
  readonly height_px: number;
  readonly metadata_stripped: boolean;
  readonly observed_subject_count: number;
  readonly duplicate_status: "clear" | "unresolved";
  readonly malware_status: "clear" | "unresolved" | "detected";
  readonly content_safety_status: "clear" | "unresolved" | "rejected";
  readonly source_consistency_status: "clear" | "unresolved" | "mismatch";
}

export interface AssetTransferAuthorizationRequest {
  readonly decision_id: string;
  readonly run_id: string;
  readonly stage: EvaluationStage;
  readonly check: "run_plan" | "pre_transfer";
  readonly evaluated_at_utc: string;
  readonly planned_run_at_utc: string;
  readonly adjudication_complete_by_utc: string;
  readonly dataset_version: string;
  readonly root_asset_ids: readonly string[];
  readonly requested_uses: readonly BenchmarkUse[];
  readonly provider_id: string;
  readonly processing_region: string;
  readonly provider_terms_snapshot_id: string;
  readonly provider_training_enabled: boolean;
  readonly provider_retention_expires_at: string;
  readonly requested_identity_processing:
    | "none"
    | "offline_face_similarity"
    | "identity_search"
    | "celebrity_matching"
    | "demographic_inference"
    | "attractiveness_scoring"
    | "diagnosis";
}

export interface AssetEligibilityTimeContract {
  readonly policy_version: typeof assetFreshnessPolicyVersion;
  readonly clock_source: "trusted_server_clock";
  readonly evaluated_at_utc: string;
}

export interface AssetEligibilityFinding {
  readonly asset_id: string | null;
  readonly code: string;
}

export interface AssetEligibilityDecision {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly eligibility_version: typeof assetEligibilityVersion;
  readonly decision_id: string;
  readonly run_id: string;
  readonly check: "run_plan" | "pre_transfer";
  readonly evaluated_at_utc: string;
  readonly freshness_policy_version: typeof assetFreshnessPolicyVersion;
  readonly clock_source: "trusted_server_clock" | "invalid";
  readonly eligible: boolean;
  readonly evaluated_asset_ids: readonly string[];
  readonly manifest_graph_sha256: string;
  readonly findings: readonly AssetEligibilityFinding[];
}

const manifestKeys = new Set([
  "schema_version", "asset_id", "subject_id", "asset_role", "provenance_class",
  "collection_id", "content_sha256", "restricted_locator_id", "mime_type", "width_px",
  "height_px", "metadata_stripped_at", "subject_count", "adult_status",
  "adult_verification_method", "consent_receipt_id", "consent_policy_version", "consented_at",
  "consent_expires_at", "license_record_id", "license_version", "license_verified_at",
  "license_expires_at", "synthetic_generator_id", "synthetic_generator_version",
  "synthetic_created_at", "terms_snapshot_id", "prompt_origin_attestation_id",
  "real_person_likeness_review_status", "source_origin_attestation",
  "prohibited_source_review_status", "permitted_uses", "permitted_providers",
  "broad_provider_grant_attestation_id",
  "commercial_research_allowed", "human_rating_allowed", "derivative_generation_allowed",
  "provider_training_allowed", "offline_face_similarity_allowed", "territories",
  "retention_expires_at", "withdrawal_status", "deletion_status", "derived_from_asset_ids",
  "preprocessing_version", "coverage_scheme_version", "tone_band", "tone_assignment_method",
  "texture_group", "texture_assignment_method", "secondary_coverage_tags",
  "quality_eligibility", "quality_eligibility_reason_code", "reviewed_by", "reviewed_at",
  "second_reviewed_by", "second_reviewed_at",
]);
const technicalKeys = new Set([
  "asset_id", "verifier_id", "verified_at", "decoded", "content_sha256", "mime_type",
  "width_px", "height_px", "metadata_stripped", "observed_subject_count", "duplicate_status",
  "malware_status", "content_safety_status", "source_consistency_status",
]);
const requestKeys = new Set([
  "decision_id", "run_id", "stage", "check", "evaluated_at_utc", "planned_run_at_utc",
  "adjudication_complete_by_utc", "dataset_version", "root_asset_ids", "requested_uses",
  "provider_id", "processing_region", "provider_terms_snapshot_id", "provider_training_enabled",
  "provider_retention_expires_at", "requested_identity_processing",
]);
const timeContractKeys = new Set(["policy_version", "clock_source", "evaluated_at_utc"]);
const opaqueSuffix = "(?:[a-f0-9]{8,64}|[0-9A-HJKMNP-TV-Z]{26})";
const assetIdPattern = new RegExp(`^ast_${opaqueSuffix}$`, "i");
const subjectIdPattern = new RegExp(`^sub_${opaqueSuffix}$`, "i");
const locatorIdPattern = new RegExp(`^loc_${opaqueSuffix}$`, "i");
const consentIdPattern = new RegExp(`^cns_${opaqueSuffix}$`, "i");
const licenseIdPattern = new RegExp(`^lic_${opaqueSuffix}$`, "i");
const attestationIdPattern = new RegExp(`^att_${opaqueSuffix}$`, "i");
const reviewerIdPattern = /^(?:steward|reviewer|verifier)_[a-z0-9]{4,32}$/i;
const safeSlug = /^[a-z0-9][a-z0-9._-]{2,79}$/i;
const safeVersion = /^[a-z0-9][a-z0-9._-]{1,79}$/i;
const sha256Pattern = /^[a-f0-9]{64}$/;
const regionPattern = /^[a-z]{2}(?:-[a-z0-9]{2,12})?$/;
const territoryPattern = /^[A-Z]{2}$/;
const utcOffsetInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const unsafeText = /(?:https?:\/\/|www\.|data:|file:|[A-Za-z]:[\\/]|[\\/]{2}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|-----BEGIN|(?:^|[^a-z0-9])(?:client|customer|celebrity|public[- _]?figure|social[- _]?media|scraped|found[- _]?online|birth[- _]?date|passport|driver.?s[- _]?license)(?:$|[^a-z0-9]))/i;
const secondaryTags = new Set([
  "glasses", "facial_hair", "jewelry_or_hair_accessories", "gray_or_white_hair",
  "thinning_or_receding", "very_short_shaved_or_bald", "head_covering_or_partial_occlusion",
  "mixed_indoor_light", "backlight", "uneven_light",
]);
const allUses = new Set<string>(permittedBenchmarkUses);
const assetRoles = new Set<string>([
  "source_portrait", "style_reference", "mask", "protected_region", "synthetic_test_fixture",
]);
const provenanceClasses = new Set<string>([
  "synthetic", "licensed", "explicitly_consented_adult",
]);
const mimeTypes = new Set<string>(["image/jpeg", "image/png", "image/webp"]);
const toneBands = new Set<string>(["ST1", "ST2", "ST3", "ST4", "ST5", "ST6"]);
const textureGroups = new Set<string>(["HT1", "HT2", "HT3", "HT4"]);
const assignmentMethods = new Set<string>(["participant_confirmed", "trained_steward"]);
const identityPurposes = new Set<string>([
  "none", "offline_face_similarity", "identity_search", "celebrity_matching",
  "demographic_inference", "attractiveness_scoring", "diagnosis",
]);

function instant(value: unknown): number | null {
  if (typeof value !== "string" || !utcOffsetInstant.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function containsUnsafeText(value: unknown, seen = new WeakSet<object>()): boolean {
  if (typeof value === "string") return unsafeText.test(value);
  if (typeof value !== "object" || value === null) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsUnsafeText(item, seen));
  return plainRecord(value) && Object.values(value).some((item) => containsUnsafeText(item, seen));
}

function safeEvidenceIdentifier(value: unknown, pattern: RegExp): string {
  if (typeof value === "string" && pattern.test(value) && !unsafeText.test(value)) return value;
  const fingerprintSource = typeof value === "string" ? value : `invalid-${typeof value}`;
  return `redacted_${sha256EvaluationManifest(fingerprintSource).slice(0, 16)}`;
}

function subset(child: readonly string[], parent: readonly string[]): boolean {
  const parentSet = new Set(parent);
  return child.every((value) => parentSet.has(value));
}

function providerGrantMatches(grant: string, destination: string): boolean {
  const [grantProvider, grantRegion] = grant.split(":");
  const [destinationProvider, destinationRegion] = destination.split(":");
  return (
    (grantProvider === "*" || grantProvider === destinationProvider) &&
    (grantRegion === "*" || grantRegion === destinationRegion)
  );
}

function providerGrantsCover(child: readonly string[], parent: readonly string[]): boolean {
  return child.every((childGrant) => parent.some((parentGrant) => providerGrantMatches(parentGrant, childGrant)));
}

export function evaluateAssetTransferEligibility(input: {
  readonly request: unknown;
  readonly trusted_time: unknown;
  readonly manifests: readonly unknown[];
  readonly technical_verifications: readonly unknown[];
}): AssetEligibilityDecision {
  const findings: AssetEligibilityFinding[] = [];
  const add = (assetId: unknown, code: string) => findings.push({
    asset_id: assetId === null ? null : safeEvidenceIdentifier(assetId, assetIdPattern),
    code,
  });
  const rawRequest = plainRecord(input.request) ? input.request : {};
  const rawTime = plainRecord(input.trusted_time) ? input.trusted_time : {};
  const requestShapeValid =
    plainRecord(input.request) &&
    Reflect.ownKeys(input.request).every((key) => typeof key === "string" && requestKeys.has(key)) &&
    Reflect.ownKeys(input.request).length === requestKeys.size &&
    typeof rawRequest.decision_id === "string" &&
    typeof rawRequest.run_id === "string" &&
    typeof rawRequest.stage === "string" &&
    typeof rawRequest.check === "string" &&
    typeof rawRequest.evaluated_at_utc === "string" &&
    typeof rawRequest.planned_run_at_utc === "string" &&
    typeof rawRequest.adjudication_complete_by_utc === "string" &&
    typeof rawRequest.dataset_version === "string" &&
    Array.isArray(rawRequest.root_asset_ids) && rawRequest.root_asset_ids.every((item) => typeof item === "string") &&
    Array.isArray(rawRequest.requested_uses) && rawRequest.requested_uses.every((item) => typeof item === "string") &&
    typeof rawRequest.provider_id === "string" &&
    typeof rawRequest.processing_region === "string" &&
    typeof rawRequest.provider_terms_snapshot_id === "string" &&
    typeof rawRequest.provider_training_enabled === "boolean" &&
    typeof rawRequest.provider_retention_expires_at === "string" &&
    typeof rawRequest.requested_identity_processing === "string";
  const timeShapeValid =
    plainRecord(input.trusted_time) &&
    Reflect.ownKeys(input.trusted_time).every((key) => typeof key === "string" && timeContractKeys.has(key)) &&
    Reflect.ownKeys(input.trusted_time).length === timeContractKeys.size &&
    rawTime.policy_version === assetFreshnessPolicyVersion &&
    rawTime.clock_source === "trusted_server_clock" &&
    typeof rawTime.evaluated_at_utc === "string";
  if (!requestShapeValid) add(null, "REQUEST_SCHEMA_INVALID");
  if (!timeShapeValid) add(null, "TRUSTED_TIME_CONTRACT_INVALID");
  const request: AssetTransferAuthorizationRequest = {
    decision_id: typeof rawRequest.decision_id === "string" ? rawRequest.decision_id : "invalid",
    run_id: typeof rawRequest.run_id === "string" ? rawRequest.run_id : "invalid",
    stage: (["T0", "T1", "R0", "P1"] as const).includes(rawRequest.stage as EvaluationStage) ? rawRequest.stage as EvaluationStage : "T0",
    check: rawRequest.check === "run_plan" || rawRequest.check === "pre_transfer" ? rawRequest.check : "run_plan",
    evaluated_at_utc: typeof rawRequest.evaluated_at_utc === "string" ? rawRequest.evaluated_at_utc : "invalid",
    planned_run_at_utc: typeof rawRequest.planned_run_at_utc === "string" ? rawRequest.planned_run_at_utc : "invalid",
    adjudication_complete_by_utc: typeof rawRequest.adjudication_complete_by_utc === "string" ? rawRequest.adjudication_complete_by_utc : "invalid",
    dataset_version: typeof rawRequest.dataset_version === "string" ? rawRequest.dataset_version : "invalid",
    root_asset_ids: Array.isArray(rawRequest.root_asset_ids) ? rawRequest.root_asset_ids.filter((item): item is string => typeof item === "string") : [],
    requested_uses: Array.isArray(rawRequest.requested_uses) ? rawRequest.requested_uses.filter((item): item is BenchmarkUse => typeof item === "string" && allUses.has(item)) : [],
    provider_id: typeof rawRequest.provider_id === "string" ? rawRequest.provider_id : "invalid",
    processing_region: typeof rawRequest.processing_region === "string" ? rawRequest.processing_region : "invalid",
    provider_terms_snapshot_id: typeof rawRequest.provider_terms_snapshot_id === "string" ? rawRequest.provider_terms_snapshot_id : "invalid",
    provider_training_enabled: rawRequest.provider_training_enabled === true,
    provider_retention_expires_at: typeof rawRequest.provider_retention_expires_at === "string" ? rawRequest.provider_retention_expires_at : "invalid",
    requested_identity_processing: typeof rawRequest.requested_identity_processing === "string" ? rawRequest.requested_identity_processing as AssetTransferAuthorizationRequest["requested_identity_processing"] : "identity_search",
  };
  const trustedEvaluatedAtText = timeShapeValid ? rawTime.evaluated_at_utc as string : "invalid";
  const evaluatedAt = instant(trustedEvaluatedAtText);
  const plannedAt = instant(request.planned_run_at_utc);
  const adjudicationAt = instant(request.adjudication_complete_by_utc);
  const providerRetentionAt = instant(request.provider_retention_expires_at);

  if (!safeSlug.test(request.decision_id) || !safeSlug.test(request.run_id) || unsafeText.test(request.decision_id) || unsafeText.test(request.run_id)) add(null, "UNSAFE_REQUEST_ID");
  if (!safeSlug.test(request.dataset_version) || !safeSlug.test(request.provider_terms_snapshot_id)) add(null, "UNSAFE_REQUEST_METADATA");
  if (!safeSlug.test(request.provider_id) || !regionPattern.test(request.processing_region)) add(null, "UNSAFE_PROVIDER_DESTINATION");
  if (containsUnsafeText(request)) add(null, "UNSAFE_REQUEST_CONTENT");
  if (!["T0", "T1", "R0", "P1"].includes(rawRequest.stage as string) || !["run_plan", "pre_transfer"].includes(rawRequest.check as string) || typeof rawRequest.provider_training_enabled !== "boolean" || !identityPurposes.has(rawRequest.requested_identity_processing as string)) add(null, "REQUEST_ENUM_OR_TYPE_INVALID");
  if (request.evaluated_at_utc !== trustedEvaluatedAtText) add(null, "UNTRUSTED_EVALUATED_TIME");
  if (evaluatedAt === null || plannedAt === null || adjudicationAt === null || providerRetentionAt === null) add(null, "INVALID_REQUEST_TIME");
  if (evaluatedAt !== null && plannedAt !== null && evaluatedAt > plannedAt) add(null, "RUN_TIME_PRECEDES_ELIGIBILITY_CHECK");
  if (evaluatedAt !== null && plannedAt !== null) {
    const maximumLead = request.check === "pre_transfer" ? preTransferMaximumLeadMs : runPlanMaximumLeadMs;
    if (plannedAt - evaluatedAt > maximumLead) add(null, "ELIGIBILITY_DECISION_STALE_BEFORE_RUN");
  }
  if (plannedAt !== null && adjudicationAt !== null && plannedAt > adjudicationAt) add(null, "INVALID_ADJUDICATION_WINDOW");
  if (providerRetentionAt !== null && plannedAt !== null && providerRetentionAt < plannedAt) add(null, "PROVIDER_RETENTION_INVALID");
  if (request.provider_training_enabled) add(null, "PROVIDER_TRAINING_ENABLED");
  if (request.requested_identity_processing !== "none") add(null, "DISALLOWED_IDENTITY_PURPOSE");
  if (request.root_asset_ids.length === 0 || new Set(request.root_asset_ids).size !== request.root_asset_ids.length) add(null, "INVALID_ROOT_ASSET_SET");
  const rawRequestedUses = Array.isArray(rawRequest.requested_uses) ? rawRequest.requested_uses : [];
  if (request.requested_uses.length === 0 || new Set(rawRequestedUses).size !== rawRequestedUses.length || rawRequestedUses.some((use) => typeof use !== "string" || !allUses.has(use))) add(null, "INVALID_REQUESTED_USE_SET");
  if (!request.requested_uses.includes("provider_evaluation")) add(null, "PROVIDER_EVALUATION_SCOPE_REQUIRED");
  if (!request.requested_uses.includes("human_quality_rating")) add(null, "HUMAN_RATING_SCOPE_REQUIRED");
  if (request.stage === "P1" && !request.requested_uses.includes("pilot_release_evaluation")) add(null, "PILOT_SCOPE_REQUIRED");

  const manifestById = new Map<string, BenchmarkAssetManifest>();
  for (const value of input.manifests) {
    if (!plainRecord(value) || typeof value.asset_id !== "string") {
      add(null, "MANIFEST_SCHEMA_INVALID");
      continue;
    }
    const manifest = value as unknown as BenchmarkAssetManifest;
    if (manifestById.has(manifest.asset_id)) add(manifest.asset_id, "DUPLICATE_MANIFEST_RECORD");
    else manifestById.set(manifest.asset_id, manifest);
  }
  const verificationById = new Map<string, AssetTechnicalVerification>();
  for (const value of input.technical_verifications) {
    if (!plainRecord(value) || typeof value.asset_id !== "string") {
      add(null, "TECHNICAL_VERIFICATION_INVALID");
      continue;
    }
    const verification = value as unknown as AssetTechnicalVerification;
    if (verificationById.has(verification.asset_id)) add(verification.asset_id, "DUPLICATE_TECHNICAL_VERIFICATION");
    else verificationById.set(verification.asset_id, verification);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const relevantIds = new Set<string>();

  const validateManifest = (manifest: BenchmarkAssetManifest) => {
    const id = manifest.asset_id;
    const record = manifest as unknown as Record<string, unknown>;
    const permittedUses = Array.isArray(manifest.permitted_uses) && manifest.permitted_uses.every((item) => typeof item === "string") ? manifest.permitted_uses : [];
    const permittedProviders = Array.isArray(manifest.permitted_providers) && manifest.permitted_providers.every((item) => typeof item === "string") ? manifest.permitted_providers : [];
    const territories = Array.isArray(manifest.territories) && manifest.territories.every((item) => typeof item === "string") ? manifest.territories : [];
    const parentIds = Array.isArray(manifest.derived_from_asset_ids) && manifest.derived_from_asset_ids.every((item) => typeof item === "string") ? manifest.derived_from_asset_ids : [];
    const tags = manifest.secondary_coverage_tags === undefined
      ? undefined
      : Array.isArray(manifest.secondary_coverage_tags) && manifest.secondary_coverage_tags.every((item) => typeof item === "string")
        ? manifest.secondary_coverage_tags
        : [];
    const scalarShapeValid =
      typeof manifest.collection_id === "string" &&
      typeof manifest.content_sha256 === "string" &&
      typeof manifest.restricted_locator_id === "string" &&
      typeof manifest.mime_type === "string" &&
      typeof manifest.width_px === "number" &&
      typeof manifest.height_px === "number" &&
      typeof manifest.metadata_stripped_at === "string" &&
      typeof manifest.subject_count === "number" &&
      typeof manifest.source_origin_attestation === "string" &&
      typeof manifest.prohibited_source_review_status === "string" &&
      typeof manifest.commercial_research_allowed === "boolean" &&
      typeof manifest.human_rating_allowed === "boolean" &&
      typeof manifest.derivative_generation_allowed === "boolean" &&
      typeof manifest.provider_training_allowed === "boolean" &&
      typeof manifest.offline_face_similarity_allowed === "boolean" &&
      typeof manifest.retention_expires_at === "string" &&
      typeof manifest.withdrawal_status === "string" &&
      typeof manifest.deletion_status === "string" &&
      typeof manifest.preprocessing_version === "string" &&
      typeof manifest.quality_eligibility === "string" &&
      typeof manifest.reviewed_by === "string" &&
      typeof manifest.reviewed_at === "string";
    if (!plainRecord(record) || Object.keys(record).some((key) => !manifestKeys.has(key)) || !scalarShapeValid || permittedUses.length !== manifest.permitted_uses?.length || permittedProviders.length !== manifest.permitted_providers?.length || territories.length !== manifest.territories?.length || parentIds.length !== manifest.derived_from_asset_ids?.length || (tags !== undefined && tags.length !== manifest.secondary_coverage_tags?.length)) add(id, "MANIFEST_SCHEMA_INVALID");
    if (manifest.schema_version !== assetManifestSchemaVersion) add(id, "MANIFEST_SCHEMA_VERSION_UNSUPPORTED");
    if (!assetRoles.has(manifest.asset_role) || !provenanceClasses.has(manifest.provenance_class) || !mimeTypes.has(manifest.mime_type)) add(id, "MANIFEST_SCHEMA_INVALID");
    if (!assetIdPattern.test(id) || !locatorIdPattern.test(manifest.restricted_locator_id)) add(id, "UNSAFE_OPAQUE_IDENTIFIER");
    if (containsUnsafeText(manifest)) add(id, "UNSAFE_MANIFEST_CONTENT");
    if (!safeSlug.test(manifest.collection_id) || manifest.collection_id !== request.dataset_version) add(id, "DATASET_VERSION_MISMATCH");
    if (!sha256Pattern.test(manifest.content_sha256)) add(id, "INVALID_CONTENT_HASH");
    if (!Number.isInteger(manifest.width_px) || manifest.width_px < 1 || manifest.width_px > 16384 || !Number.isInteger(manifest.height_px) || manifest.height_px < 1 || manifest.height_px > 16384) add(id, "INVALID_DECODE_PROPERTIES");
    if (!Number.isInteger(manifest.subject_count) || manifest.subject_count < 0) add(id, "INVALID_SUBJECT_COUNT");
    const strippedAt = instant(manifest.metadata_stripped_at);
    if (!safeVersion.test(manifest.preprocessing_version) || strippedAt === null || (evaluatedAt !== null && strippedAt > evaluatedAt)) add(id, "INVALID_PREPROCESSING_EVIDENCE");
    if (manifest.prohibited_source_review_status !== "passed") add(id, "PROHIBITED_SOURCE_REVIEW_NOT_PASSED");
    if (manifest.quality_eligibility !== "eligible") add(id, "QUALITY_INELIGIBLE");
    if (manifest.withdrawal_status !== "active" && !(manifest.provenance_class === "synthetic" && manifest.withdrawal_status === "not_applicable")) add(id, "WITHDRAWN_OR_PENDING");
    if (manifest.deletion_status !== "present") add(id, "ASSET_NOT_PRESENT");
    if (!reviewerIdPattern.test(manifest.reviewed_by) || instant(manifest.reviewed_at) === null) add(id, "INVALID_REVIEW_EVIDENCE");
    if (evaluatedAt !== null && instant(manifest.reviewed_at)! > evaluatedAt) add(id, "REVIEW_AFTER_ELIGIBILITY_CHECK");
    if (new Set(permittedUses).size !== permittedUses.length || permittedUses.some((use) => !allUses.has(use))) add(id, "INVALID_PERMITTED_USE_SET");
    if (!subset(request.requested_uses, permittedUses)) add(id, "REQUESTED_USE_NOT_PERMITTED");
    if (!manifest.derivative_generation_allowed) add(id, "DERIVATIVE_GENERATION_NOT_PERMITTED");
    if (!manifest.human_rating_allowed) add(id, "HUMAN_RATING_NOT_PERMITTED");
    if ((request.stage === "T1" || request.stage === "P1") && !manifest.commercial_research_allowed) add(id, "COMMERCIAL_RESEARCH_NOT_PERMITTED");
    const destination = `${request.provider_id}:${request.processing_region}`;
    const wildcardGrant = permittedProviders.some((provider) => provider.includes("*"));
    const validProviderGrant = /^(?:\*|[a-z0-9][a-z0-9.-]{1,63}):(?:\*|[a-z]{2}(?:-[a-z0-9]{2,12})?)$/;
    if (new Set(permittedProviders).size !== permittedProviders.length || permittedProviders.some((provider) => !validProviderGrant.test(provider)) || (wildcardGrant && !attestationIdPattern.test(manifest.broad_provider_grant_attestation_id ?? ""))) add(id, "AMBIGUOUS_PROVIDER_GRANT");
    if (!permittedProviders.some((grant) => providerGrantMatches(grant, destination))) add(id, "PROVIDER_DESTINATION_NOT_PERMITTED");
    const territory = request.processing_region.slice(0, 2).toUpperCase();
    if (!territories.includes(territory) || new Set(territories).size !== territories.length || territories.some((item) => !territoryPattern.test(item))) add(id, "PROCESSING_TERRITORY_NOT_PERMITTED");
    const retentionAt = instant(manifest.retention_expires_at);
    if (retentionAt === null || adjudicationAt === null || retentionAt <= adjudicationAt) add(id, "RETENTION_EXPIRES_BEFORE_COMPLETION");
    if (retentionAt !== null && providerRetentionAt !== null && providerRetentionAt > retentionAt) add(id, "PROVIDER_RETENTION_EXCEEDS_ASSET_RIGHTS");
    if (parentIds.length !== new Set(parentIds).size || parentIds.includes(id) || parentIds.some((parentId) => !assetIdPattern.test(parentId))) add(id, "INVALID_PARENT_SET");

    const personAsset = manifest.asset_role === "source_portrait" || manifest.asset_role === "style_reference";
    if (personAsset) {
      if (!manifest.subject_id || !subjectIdPattern.test(manifest.subject_id) || manifest.subject_count !== 1) add(id, "PERSON_ASSET_IDENTITY_EVIDENCE_INVALID");
      const expectedAdultStatus = manifest.provenance_class === "synthetic" ? "synthetic_adult" : "verified_adult";
      if (manifest.adult_status !== expectedAdultStatus || !manifest.adult_verification_method) add(id, "ADULT_STATUS_NOT_VERIFIED");
      if (manifest.provenance_class === "synthetic" && manifest.adult_verification_method !== "synthetic_provenance_review") add(id, "ADULT_STATUS_NOT_VERIFIED");
      if (manifest.provenance_class === "licensed" && manifest.adult_verification_method !== "license_record_adult_attestation") add(id, "ADULT_STATUS_NOT_VERIFIED");
      if (manifest.provenance_class === "explicitly_consented_adult" && manifest.adult_verification_method !== "government_id_seen_not_copied" && manifest.adult_verification_method !== "verified_recruitment_record") add(id, "ADULT_STATUS_NOT_VERIFIED");
    }
    if ((manifest.asset_role === "mask" || manifest.asset_role === "protected_region") && parentIds.length === 0) add(id, "DERIVED_ASSET_MISSING_PARENT");

    if (manifest.provenance_class === "synthetic") {
      if (manifest.source_origin_attestation !== "purpose_synthetic_benchmark" || !licenseIdPattern.test(manifest.license_record_id ?? "") || !safeVersion.test(manifest.license_version ?? "") || instant(manifest.license_verified_at) === null || instant(manifest.license_expires_at) === null || !safeSlug.test(manifest.synthetic_generator_id ?? "") || !safeVersion.test(manifest.synthetic_generator_version ?? "") || instant(manifest.synthetic_created_at) === null || !safeSlug.test(manifest.terms_snapshot_id ?? "") || !attestationIdPattern.test(manifest.prompt_origin_attestation_id ?? "") || manifest.real_person_likeness_review_status !== "passed") add(id, "SYNTHETIC_PROVENANCE_PROOF_INVALID");
      if (adjudicationAt !== null && instant(manifest.license_expires_at)! <= adjudicationAt) add(id, "RIGHTS_EXPIRE_BEFORE_COMPLETION");
      if (evaluatedAt !== null && [manifest.license_verified_at, manifest.synthetic_created_at].some((value) => instant(value) === null || instant(value)! > evaluatedAt)) add(id, "PROVENANCE_TIME_INVALID");
    } else if (manifest.provenance_class === "licensed") {
      if (manifest.source_origin_attestation !== "purpose_licensed_benchmark" || !licenseIdPattern.test(manifest.license_record_id ?? "") || !safeVersion.test(manifest.license_version ?? "") || instant(manifest.license_verified_at) === null || instant(manifest.license_expires_at) === null) add(id, "LICENSE_PROOF_INVALID");
      if (adjudicationAt !== null && instant(manifest.license_expires_at)! <= adjudicationAt) add(id, "RIGHTS_EXPIRE_BEFORE_COMPLETION");
      if (evaluatedAt !== null && (instant(manifest.license_verified_at) === null || instant(manifest.license_verified_at)! > evaluatedAt)) add(id, "PROVENANCE_TIME_INVALID");
    } else {
      if (manifest.source_origin_attestation !== "purpose_collected_benchmark" || !consentIdPattern.test(manifest.consent_receipt_id ?? "") || !safeVersion.test(manifest.consent_policy_version ?? "") || instant(manifest.consented_at) === null || instant(manifest.consent_expires_at) === null) add(id, "CONSENT_PROOF_INVALID");
      if (adjudicationAt !== null && instant(manifest.consent_expires_at)! <= adjudicationAt) add(id, "RIGHTS_EXPIRE_BEFORE_COMPLETION");
      if (evaluatedAt !== null && (instant(manifest.consented_at) === null || instant(manifest.consented_at)! > evaluatedAt)) add(id, "PROVENANCE_TIME_INVALID");
    }

    if (request.stage === "T1" || request.stage === "P1") {
      if (!manifest.second_reviewed_by || !reviewerIdPattern.test(manifest.second_reviewed_by) || manifest.second_reviewed_by === manifest.reviewed_by || instant(manifest.second_reviewed_at) === null || (evaluatedAt !== null && instant(manifest.second_reviewed_at)! > evaluatedAt)) add(id, "SECOND_PERSON_REVIEW_REQUIRED");
      if (personAsset && (!safeVersion.test(manifest.coverage_scheme_version ?? "") || !manifest.tone_band || !manifest.tone_assignment_method || !manifest.texture_group || !manifest.texture_assignment_method)) add(id, "CORE_COVERAGE_EVIDENCE_MISSING");
      if (tags?.some((tag) => !secondaryTags.has(tag))) add(id, "UNCONTROLLED_COVERAGE_TAG");
      if (tags?.includes("head_covering_or_partial_occlusion") && manifest.texture_assignment_method !== "participant_confirmed") add(id, "OBSCURED_TEXTURE_NOT_PARTICIPANT_CONFIRMED");
    }
    if ((manifest.tone_band !== undefined && !toneBands.has(manifest.tone_band)) || (manifest.texture_group !== undefined && !textureGroups.has(manifest.texture_group)) || (manifest.tone_assignment_method !== undefined && !assignmentMethods.has(manifest.tone_assignment_method)) || (manifest.texture_assignment_method !== undefined && !assignmentMethods.has(manifest.texture_assignment_method))) add(id, "COVERAGE_ENUM_INVALID");

    const verification = verificationById.get(id);
    if (!verification) {
      add(id, "TECHNICAL_VERIFICATION_MISSING");
    } else {
      const technicalRecord = verification as unknown as Record<string, unknown>;
      if (!plainRecord(technicalRecord) || Object.keys(technicalRecord).some((key) => !technicalKeys.has(key)) || containsUnsafeText(verification)) add(id, "TECHNICAL_VERIFICATION_INVALID");
      const verifiedAt = instant(verification.verified_at);
      if (!reviewerIdPattern.test(verification.verifier_id) || verifiedAt === null || (evaluatedAt !== null && verifiedAt > evaluatedAt)) add(id, "TECHNICAL_VERIFICATION_INVALID");
      if (evaluatedAt !== null && verifiedAt !== null && evaluatedAt - verifiedAt > technicalVerificationMaximumAgeMs) add(id, "TECHNICAL_VERIFICATION_STALE");
      if (!verification.decoded || !verification.metadata_stripped || verification.content_sha256 !== manifest.content_sha256 || verification.mime_type !== manifest.mime_type || verification.width_px !== manifest.width_px || verification.height_px !== manifest.height_px) add(id, "NORMALIZED_BYTES_MISMATCH");
      if (verification.observed_subject_count !== manifest.subject_count) add(id, "SUBJECT_COUNT_MISMATCH");
      if (verification.duplicate_status !== "clear") add(id, "DUPLICATE_CHECK_UNRESOLVED");
      if (verification.malware_status !== "clear") add(id, "MALWARE_CHECK_UNRESOLVED");
      if (verification.content_safety_status !== "clear") add(id, "CONTENT_SAFETY_UNRESOLVED");
      if (verification.source_consistency_status !== "clear") add(id, "SOURCE_CONSISTENCY_UNRESOLVED");
    }
  };

  const walk = (id: string) => {
    relevantIds.add(id);
    if (visiting.has(id)) { add(id, "DERIVATION_CYCLE"); return; }
    if (visited.has(id)) return;
    const manifest = manifestById.get(id);
    if (!manifest) { add(id, "MANIFEST_MISSING"); return; }
    visiting.add(id);
    validateManifest(manifest);
    const parentIds = Array.isArray(manifest.derived_from_asset_ids)
      ? manifest.derived_from_asset_ids.filter((item): item is string => typeof item === "string")
      : [];
    for (const parentId of parentIds) {
      walk(parentId);
      const parent = manifestById.get(parentId);
      if (!parent) continue;
      const childUses = Array.isArray(manifest.permitted_uses) ? manifest.permitted_uses : [];
      const parentUses = Array.isArray(parent.permitted_uses) ? parent.permitted_uses : [];
      const childProviders = Array.isArray(manifest.permitted_providers) ? manifest.permitted_providers : [];
      const parentProviders = Array.isArray(parent.permitted_providers) ? parent.permitted_providers : [];
      const childTerritories = Array.isArray(manifest.territories) ? manifest.territories : [];
      const parentTerritories = Array.isArray(parent.territories) ? parent.territories : [];
      if (!subset(childUses, parentUses) || !providerGrantsCover(childProviders, parentProviders) || !subset(childTerritories, parentTerritories) || (manifest.commercial_research_allowed && !parent.commercial_research_allowed) || (manifest.human_rating_allowed && !parent.human_rating_allowed) || (manifest.derivative_generation_allowed && !parent.derivative_generation_allowed) || (manifest.provider_training_allowed && !parent.provider_training_allowed) || (manifest.offline_face_similarity_allowed && !parent.offline_face_similarity_allowed)) add(id, "DERIVATIVE_RIGHTS_BROADER_THAN_PARENT");
      const childExpiry = instant(manifest.retention_expires_at);
      const parentExpiry = instant(parent.retention_expires_at);
      if (childExpiry !== null && parentExpiry !== null && childExpiry > parentExpiry) add(id, "DERIVATIVE_RETENTION_BROADER_THAN_PARENT");
    }
    visiting.delete(id);
    visited.add(id);
  };
  request.root_asset_ids.forEach((id) => {
    if (!assetIdPattern.test(id)) add(id, "UNSAFE_ROOT_ASSET_ID");
    walk(id);
  });

  const internalAssetIds = [...relevantIds].sort();
  const evaluatedAssetIds = internalAssetIds
    .map((id) => safeEvidenceIdentifier(id, assetIdPattern))
    .sort();
  let manifestGraphSha256 = "0".repeat(64);
  try {
    manifestGraphSha256 = sha256EvaluationManifest({
      manifests: internalAssetIds.map((id) => manifestById.get(id) ?? { asset_id: id, missing: true }),
      technical_verifications: internalAssetIds.map((id) => verificationById.get(id) ?? { asset_id: id, missing: true }),
    });
  } catch {
    add(null, "MANIFEST_GRAPH_NOT_CANONICAL_JSON");
  }
  const orderedFindings = findings
    .filter((item, index, all) => all.findIndex((candidate) => candidate.asset_id === item.asset_id && candidate.code === item.code) === index)
    .sort((left, right) => {
      const leftKey = `${left.asset_id ?? ""}|${left.code}`;
      const rightKey = `${right.asset_id ?? ""}|${right.code}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  return {
    schema_version: "1.0.0",
    protocol_id: evaluationProtocolId,
    eligibility_version: assetEligibilityVersion,
    decision_id: safeEvidenceIdentifier(request.decision_id, safeSlug),
    run_id: safeEvidenceIdentifier(request.run_id, safeSlug),
    check: request.check,
    evaluated_at_utc: evaluatedAt === null ? "invalid" : trustedEvaluatedAtText,
    freshness_policy_version: assetFreshnessPolicyVersion,
    clock_source: timeShapeValid ? "trusted_server_clock" : "invalid",
    eligible: orderedFindings.length === 0,
    evaluated_asset_ids: evaluatedAssetIds,
    manifest_graph_sha256: manifestGraphSha256,
    findings: orderedFindings,
  };
}
