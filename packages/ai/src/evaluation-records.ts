import { canonicalEvaluationJson, evaluationProtocolId, sha256EvaluationManifest } from "./benchmark";

export const evaluationRecordsVersion = "hair-evaluation-records-v1";

interface Envelope {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly run_id: string;
  readonly record_id: string;
  readonly created_at_utc: string;
}
interface ArtifactLock {
  readonly artifact_id: string;
  readonly content_sha256: string;
}
export interface EvaluationAssetLock extends Envelope {
  readonly asset_id: string;
  readonly role: "source_portrait" | "style_reference" | "mask" | "protected_region";
  readonly subject_id: string | null;
  readonly content_sha256: string;
  readonly registry_manifest_sha256: string;
  readonly parent_asset_ids: readonly string[];
}
export interface LockedEvaluationCase extends Envelope {
  readonly case_id: string;
  readonly subject_id: string;
  readonly source_asset_id: string;
  readonly reference_asset_id: string | null;
  readonly specification: ArtifactLock;
  readonly prompt_inputs: ArtifactLock;
  readonly transformation: "color" | "shorter" | "longer" | "fringe_part" | "fade_taper" | "layers_volume" | "multitone" | "protective_texture";
  readonly mask_inputs: readonly {
    readonly configuration_id: string;
    readonly mask_asset_id: string | null;
    readonly protected_region_asset_id: string | null;
  }[];
}
export interface LockedEvaluationConfiguration extends Envelope {
  readonly configuration_id: string;
  readonly provider_id: string;
  readonly api_region: "local" | "us" | "eu" | "uk" | "ca" | "au" | "jp";
  readonly model_snapshot: ArtifactLock;
  readonly moderation_policy: ArtifactLock;
  readonly prompt_template: ArtifactLock;
  readonly descriptor_conversion: ArtifactLock;
  readonly preprocessing: ArtifactLock;
  readonly generation_parameters: ArtifactLock;
  readonly mask_strategy: "prompt_only" | "hair_mask" | "hair_mask_plus_protected_region";
  readonly segmentation: ArtifactLock | null;
  readonly dilation_px: number;
  readonly feather_px: number;
  readonly manual_mask_edit: boolean;
  readonly protected_region_definition: ArtifactLock | null;
  readonly output: {
    readonly width_px: number;
    readonly height_px: number;
    readonly format: "png" | "jpeg" | "webp";
    readonly quality: "low" | "medium" | "high";
    readonly background: "opaque" | "transparent";
    readonly compression_percent: number;
  };
  readonly preview_count: number;
  readonly timeout_ms: number;
  readonly retry_policy: "none" | "transient_only";
  readonly max_attempts: number;
  readonly concurrency: number;
  readonly idempotency: "one_key_per_attempt";
  readonly seed: number | null;
  readonly seed_unsupported: boolean;
  readonly pricing_schedule_id: string;
  readonly terms_snapshot: ArtifactLock;
  readonly terms_snapshot_at_utc: string;
}
export interface EvaluationSlot {
  readonly slot_id: string;
  readonly case_id: string;
  readonly configuration_id: string;
  readonly repetition: number;
  readonly variant_index: number;
}
export interface LockedEvaluationPlan extends Envelope {
  readonly records_version: typeof evaluationRecordsVersion;
  readonly stage: "H0" | "T0" | "T1" | "R0" | "P1";
  readonly code_revision_sha256: string;
  readonly assets: readonly EvaluationAssetLock[];
  readonly cases: readonly LockedEvaluationCase[];
  readonly configurations: readonly LockedEvaluationConfiguration[];
  readonly slots: readonly EvaluationSlot[];
}
export type EvaluationAttemptOutcome = "succeeded" | "failed" | "rejected" | "timed_out" | "canceled" | "malformed_output" | "output_rejected";
export interface EvaluationAttemptRecord extends Envelope {
  readonly attempt_id: string;
  readonly slot_id: string;
  readonly case_id: string;
  readonly configuration_id: string;
  readonly plan_sha256: string;
  readonly attempt_index: number;
  readonly retry_of_attempt_id: string | null;
  readonly idempotency_id: string;
  readonly started_at_utc: string;
  readonly finished_at_utc: string;
  readonly duration_ms: number;
  readonly outcome: EvaluationAttemptOutcome;
  readonly failure_code: "none" | "provider_failure" | "rate_limit" | "policy_rejection" | "timeout" | "canceled" | "decode_failure" | "display_rejection";
  readonly output_id: string | null;
  readonly usage: {
    readonly status: "unavailable" | "estimated" | "billed";
    readonly image_input_units: number | null;
    readonly image_output_units: number | null;
    readonly text_input_units: number | null;
  };
  readonly revision: number;
  readonly supersedes_record_sha256: string | null;
  readonly correction_reason: "none" | "usage_reconciliation";
}
export interface EvaluationOutputRecord extends Envelope {
  readonly output_id: string;
  readonly attempt_id: string;
  readonly slot_id: string;
  readonly content_sha256: string;
  readonly width_px: number;
  readonly height_px: number;
  readonly format: "png" | "jpeg" | "webp";
  readonly disposition: "candidate" | "rejected";
}
export interface EvaluationRecordBundle {
  readonly plan: LockedEvaluationPlan;
  readonly plan_sha256: string;
  readonly attempts: readonly EvaluationAttemptRecord[];
  readonly outputs: readonly EvaluationOutputRecord[];
}

const denial = "Evaluation records rejected.";
function ensure(condition: unknown): asserts condition {
  if (!condition) throw new TypeError(denial);
}
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const prototype = Object.getPrototypeOf(value) as unknown;
  ensure(prototype === Object.prototype || prototype === null);
  const keys = Reflect.ownKeys(value);
  ensure(keys.length === fields.length && keys.every((key) => typeof key === "string" && fields.includes(key)));
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    ensure(descriptor?.enumerable === true && "value" in descriptor);
  }
  return value as Record<string, unknown>;
}
function list(value: unknown, minimum = 0): unknown[] {
  ensure(Array.isArray(value) && value.length >= minimum && value.length <= 10000);
  ensure(Object.getPrototypeOf(value) === Array.prototype);
  ensure(Reflect.ownKeys(value).length === value.length + 1);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    ensure(descriptor?.enumerable === true && "value" in descriptor);
  }
  return value;
}
function id(value: unknown, prefix: string): void {
  const namespace = prefix === "asset" ? "ast_" : prefix === "subject" ? "sub_" : `${prefix}-`;
  ensure(typeof value === "string" && new RegExp(`^${namespace}[a-f0-9]{16}$`).test(value));
}
function hash(value: unknown): void {
  ensure(typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
}
function instant(value: unknown): void {
  ensure(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  const parsed = Date.parse(value);
  ensure(Number.isFinite(parsed) && new Date(parsed).toISOString() === value);
}
function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): void {
  ensure(typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum);
}
function choice(value: unknown, choices: readonly unknown[]): void { ensure(choices.includes(value)); }
function artifact(value: unknown): void {
  const item = object(value, ["artifact_id", "content_sha256"]);
  id(item.artifact_id, "artifact"); hash(item.content_sha256);
}
const envelopeFields = ["schema_version", "protocol_id", "run_id", "record_id", "created_at_utc"];
function envelope(item: Record<string, unknown>): void {
  ensure(item.schema_version === "1.0.0" && item.protocol_id === evaluationProtocolId);
  id(item.run_id, "run"); id(item.record_id, "record"); instant(item.created_at_utc);
}
function asset(value: unknown): void {
  const item = object(value, [...envelopeFields, "asset_id", "role", "subject_id", "content_sha256", "registry_manifest_sha256", "parent_asset_ids"]);
  envelope(item); id(item.asset_id, "asset"); hash(item.content_sha256); hash(item.registry_manifest_sha256);
  choice(item.role, ["source_portrait", "style_reference", "mask", "protected_region"]);
  if (item.subject_id !== null) id(item.subject_id, "subject");
  if (item.role === "source_portrait") ensure(item.subject_id !== null);
  list(item.parent_asset_ids).forEach((parent) => id(parent, "asset"));
  unique(item.parent_asset_ids as string[]);
}
function evaluationCase(value: unknown): void {
  const item = object(value, [...envelopeFields, "case_id", "subject_id", "source_asset_id", "reference_asset_id", "specification", "prompt_inputs", "transformation", "mask_inputs"]);
  envelope(item); id(item.case_id, "case"); id(item.subject_id, "subject"); id(item.source_asset_id, "asset");
  if (item.reference_asset_id !== null) id(item.reference_asset_id, "asset");
  artifact(item.specification); artifact(item.prompt_inputs);
  choice(item.transformation, ["color", "shorter", "longer", "fringe_part", "fade_taper", "layers_volume", "multitone", "protective_texture"]);
  list(item.mask_inputs, 1).forEach((input) => {
    const mask = object(input, ["configuration_id", "mask_asset_id", "protected_region_asset_id"]);
    id(mask.configuration_id, "config");
    if (mask.mask_asset_id !== null) id(mask.mask_asset_id, "asset");
    if (mask.protected_region_asset_id !== null) id(mask.protected_region_asset_id, "asset");
  });
}
function configuration(value: unknown): void {
  const item = object(value, [...envelopeFields, "configuration_id", "provider_id", "api_region", "model_snapshot", "moderation_policy", "prompt_template", "descriptor_conversion", "preprocessing", "generation_parameters", "mask_strategy", "segmentation", "dilation_px", "feather_px", "manual_mask_edit", "protected_region_definition", "output", "preview_count", "timeout_ms", "retry_policy", "max_attempts", "concurrency", "idempotency", "seed", "seed_unsupported", "pricing_schedule_id", "terms_snapshot", "terms_snapshot_at_utc"]);
  envelope(item); id(item.configuration_id, "config"); id(item.provider_id, "provider"); id(item.pricing_schedule_id, "pricing");
  choice(item.api_region, ["local", "us", "eu", "uk", "ca", "au", "jp"]);
  [item.model_snapshot, item.moderation_policy, item.prompt_template, item.descriptor_conversion, item.preprocessing, item.generation_parameters, item.terms_snapshot].forEach(artifact);
  instant(item.terms_snapshot_at_utc);
  ensure(String(item.terms_snapshot_at_utc) <= String(item.created_at_utc));
  choice(item.mask_strategy, ["prompt_only", "hair_mask", "hair_mask_plus_protected_region"]);
  integer(item.dilation_px, 0, 4096); integer(item.feather_px, 0, 4096);
  choice(item.manual_mask_edit, [true, false]);
  if (item.mask_strategy === "prompt_only") {
    ensure(item.segmentation === null && item.protected_region_definition === null && item.dilation_px === 0 && item.feather_px === 0 && item.manual_mask_edit === false);
  } else {
    artifact(item.segmentation);
    if (item.mask_strategy === "hair_mask_plus_protected_region") artifact(item.protected_region_definition);
    else ensure(item.protected_region_definition === null);
  }
  const output = object(item.output, ["width_px", "height_px", "format", "quality", "background", "compression_percent"]);
  integer(output.width_px, 1, 16384); integer(output.height_px, 1, 16384);
  choice(output.format, ["png", "jpeg", "webp"]); choice(output.quality, ["low", "medium", "high"]);
  choice(output.background, ["opaque", "transparent"]); integer(output.compression_percent, 0, 100);
  ensure(output.format !== "jpeg" || output.background === "opaque");
  integer(item.preview_count, 1, 3); integer(item.timeout_ms, 1, 3600000); integer(item.max_attempts, 1, 10); integer(item.concurrency, 1, 100);
  choice(item.retry_policy, ["none", "transient_only"]); ensure(item.retry_policy !== "none" || item.max_attempts === 1);
  ensure(item.idempotency === "one_key_per_attempt"); choice(item.seed_unsupported, [true, false]);
  if (item.seed_unsupported) ensure(item.seed === null); else integer(item.seed, 0, 4294967295);
}
function slot(value: unknown): void {
  const item = object(value, ["slot_id", "case_id", "configuration_id", "repetition", "variant_index"]);
  id(item.slot_id, "slot"); id(item.case_id, "case"); id(item.configuration_id, "config");
  integer(item.repetition, 0, 1000); integer(item.variant_index, 0, 2);
}
function unique(values: readonly string[]): void { ensure(new Set(values).size === values.length); }
function attempt(value: unknown): void {
  const item = object(value, [...envelopeFields, "attempt_id", "slot_id", "case_id", "configuration_id", "plan_sha256", "attempt_index", "retry_of_attempt_id", "idempotency_id", "started_at_utc", "finished_at_utc", "duration_ms", "outcome", "failure_code", "output_id", "usage", "revision", "supersedes_record_sha256", "correction_reason"]);
  envelope(item); id(item.attempt_id, "attempt"); id(item.slot_id, "slot"); id(item.case_id, "case"); id(item.configuration_id, "config"); id(item.idempotency_id, "idempotency"); hash(item.plan_sha256);
  integer(item.attempt_index, 1, 10); integer(item.revision); integer(item.duration_ms, 0, 3600000);
  instant(item.started_at_utc); instant(item.finished_at_utc);
  ensure(String(item.started_at_utc) <= String(item.finished_at_utc) && String(item.finished_at_utc) <= String(item.created_at_utc));
  if (item.retry_of_attempt_id !== null) id(item.retry_of_attempt_id, "attempt");
  ensure((item.attempt_index === 1) === (item.retry_of_attempt_id === null));
  const codes: Record<EvaluationAttemptOutcome, readonly string[]> = {
    succeeded: ["none"], failed: ["provider_failure", "rate_limit"], rejected: ["policy_rejection"], timed_out: ["timeout"], canceled: ["canceled"], malformed_output: ["decode_failure"], output_rejected: ["display_rejection"],
  };
  choice(item.outcome, Object.keys(codes)); choice(item.failure_code, codes[item.outcome as EvaluationAttemptOutcome]);
  if (item.outcome === "succeeded" || item.outcome === "output_rejected") id(item.output_id, "output"); else ensure(item.output_id === null);
  const usage = object(item.usage, ["status", "image_input_units", "image_output_units", "text_input_units"]);
  choice(usage.status, ["unavailable", "estimated", "billed"]);
  for (const field of ["image_input_units", "image_output_units", "text_input_units"]) {
    if (usage.status === "unavailable") ensure(usage[field] === null); else integer(usage[field]);
  }
  if (item.revision === 0) ensure(item.supersedes_record_sha256 === null && item.correction_reason === "none");
  else { hash(item.supersedes_record_sha256); ensure(item.correction_reason === "usage_reconciliation"); }
}
function outputRecord(value: unknown): void {
  const item = object(value, [...envelopeFields, "output_id", "attempt_id", "slot_id", "content_sha256", "width_px", "height_px", "format", "disposition"]);
  envelope(item); id(item.output_id, "output"); id(item.attempt_id, "attempt"); id(item.slot_id, "slot"); hash(item.content_sha256);
  integer(item.width_px, 1, 16384); integer(item.height_px, 1, 16384); choice(item.format, ["png", "jpeg", "webp"]); choice(item.disposition, ["candidate", "rejected"]);
}
function safeBoundary<T>(action: () => T): T {
  try { return action(); } catch { throw new TypeError(denial); }
}
function copy<T>(value: T): T { return JSON.parse(canonicalEvaluationJson(value)) as T; }

/** Validates exact metadata contracts and all internal locked-plan references. */
export function validateEvaluationPlan(value: unknown): LockedEvaluationPlan {
  return safeBoundary(() => {
    const raw = object(value, [...envelopeFields, "records_version", "stage", "code_revision_sha256", "assets", "cases", "configurations", "slots"]);
    envelope(raw); ensure(raw.records_version === evaluationRecordsVersion); choice(raw.stage, ["H0", "T0", "T1", "R0", "P1"]); hash(raw.code_revision_sha256);
    list(raw.assets, 1).forEach(asset); list(raw.cases, 1).forEach(evaluationCase); list(raw.configurations, 1).forEach(configuration); list(raw.slots, 1).forEach(slot);
    const plan = raw as unknown as LockedEvaluationPlan;
    const records = [...plan.assets, ...plan.cases, ...plan.configurations];
    unique([plan.record_id, ...records.map((item) => item.record_id)]);
    ensure(records.every((item) => item.run_id === plan.run_id && item.created_at_utc <= plan.created_at_utc));
    unique(plan.assets.map((item) => item.asset_id)); unique(plan.cases.map((item) => item.case_id)); unique(plan.configurations.map((item) => item.configuration_id)); unique(plan.slots.map((item) => item.slot_id));
    const assets = new Map(plan.assets.map((item) => [item.asset_id, item]));
    const cases = new Map(plan.cases.map((item) => [item.case_id, item]));
    const configs = new Map(plan.configurations.map((item) => [item.configuration_id, item]));
    const usedAssets = new Set<string>();
    const verifiedAssets = new Set<string>();
    const visit = (assetId: string, ancestors: Set<string>): void => {
      const item = assets.get(assetId); ensure(item && !ancestors.has(assetId)); usedAssets.add(assetId);
      if (verifiedAssets.has(assetId)) return;
      const next = new Set(ancestors).add(assetId); item.parent_asset_ids.forEach((parent) => visit(parent, next));
      verifiedAssets.add(assetId);
    };
    const role = (assetId: string, expected: EvaluationAssetLock["role"]): EvaluationAssetLock => {
      const item = assets.get(assetId); ensure(item?.role === expected); visit(assetId, new Set()); return item;
    };
    const tuples: string[] = [];
    const groups = new Map<string, Set<number>>();
    for (const item of plan.cases) {
      ensure(role(item.source_asset_id, "source_portrait").subject_id === item.subject_id);
      if (item.reference_asset_id !== null) role(item.reference_asset_id, "style_reference");
      unique(item.mask_inputs.map((input) => input.configuration_id));
      const selected = new Set(plan.slots.filter((entry) => entry.case_id === item.case_id).map((entry) => entry.configuration_id));
      ensure(selected.size > 0 && item.mask_inputs.length === selected.size);
      for (const mask of item.mask_inputs) {
        const config = configs.get(mask.configuration_id); ensure(config && selected.has(mask.configuration_id));
        if (config.mask_strategy === "prompt_only") ensure(mask.mask_asset_id === null && mask.protected_region_asset_id === null);
        else {
          ensure(mask.mask_asset_id !== null); const lockedMask = role(mask.mask_asset_id, "mask");
          ensure(lockedMask.parent_asset_ids.includes(item.source_asset_id));
          if (config.mask_strategy === "hair_mask_plus_protected_region") {
            ensure(mask.protected_region_asset_id !== null); const protectedAsset = role(mask.protected_region_asset_id, "protected_region"); ensure(protectedAsset.parent_asset_ids.includes(item.source_asset_id));
          } else ensure(mask.protected_region_asset_id === null);
        }
      }
    }
    for (const item of plan.slots) {
      const config = configs.get(item.configuration_id); ensure(config && cases.has(item.case_id) && item.variant_index < config.preview_count);
      const group = `${item.case_id}|${item.configuration_id}|${item.repetition}`;
      tuples.push(`${group}|${item.variant_index}`);
      const variants = groups.get(group) ?? new Set<number>(); variants.add(item.variant_index); groups.set(group, variants);
    }
    unique(tuples); ensure(usedAssets.size === assets.size);
    ensure(new Set(plan.slots.map((item) => item.configuration_id)).size === configs.size);
    for (const [group, variants] of groups) ensure(variants.size === configs.get(group.split("|")[1]!)!.preview_count);
    // Same opaque artifact ID must never resolve to two different contents.
    const artifacts = new Map<string, string>();
    const lock = (item: ArtifactLock | null): void => {
      if (!item) return;
      ensure(!artifacts.has(item.artifact_id) || artifacts.get(item.artifact_id) === item.content_sha256);
      artifacts.set(item.artifact_id, item.content_sha256);
    };
    plan.cases.forEach((item) => { lock(item.specification); lock(item.prompt_inputs); });
    plan.configurations.forEach((item) => [item.model_snapshot, item.moderation_policy, item.prompt_template, item.descriptor_conversion, item.preprocessing, item.generation_parameters, item.segmentation, item.protected_region_definition, item.terms_snapshot].forEach(lock));
    return copy(plan);
  });
}
export function hashEvaluationPlan(value: unknown): string {
  return sha256EvaluationManifest(validateEvaluationPlan(value));
}
export function validateEvaluationAttempt(value: unknown): EvaluationAttemptRecord {
  return safeBoundary(() => { attempt(value); return copy(value as EvaluationAttemptRecord); });
}
export function hashEvaluationAttempt(value: unknown): string {
  return sha256EvaluationManifest(validateEvaluationAttempt(value));
}

/** Requires every requested slot and retained attempt, including failures/retries. */
export function validateEvaluationRecordBundle(value: unknown): EvaluationRecordBundle {
  return safeBoundary(() => {
    const raw = object(value, ["plan", "plan_sha256", "attempts", "outputs"]);
    const plan = validateEvaluationPlan(raw.plan); hash(raw.plan_sha256); ensure(raw.plan_sha256 === sha256EvaluationManifest(plan));
    list(raw.attempts, 1).forEach(attempt); list(raw.outputs).forEach(outputRecord);
    const attempts = raw.attempts as EvaluationAttemptRecord[]; const outputs = raw.outputs as EvaluationOutputRecord[];
    const allRecords = [...plan.assets, ...plan.cases, ...plan.configurations, ...attempts, ...outputs];
    unique([plan.record_id, ...allRecords.map((item) => item.record_id)]);
    ensure(allRecords.every((item) => item.run_id === plan.run_id));
    const slots = new Map(plan.slots.map((item) => [item.slot_id, item]));
    const configs = new Map(plan.configurations.map((item) => [item.configuration_id, item]));
    const current = new Map<string, EvaluationAttemptRecord>();
    const originals = new Map<string, EvaluationAttemptRecord>();
    const identityFields = ["run_id", "attempt_id", "slot_id", "case_id", "configuration_id", "plan_sha256", "attempt_index", "retry_of_attempt_id", "idempotency_id", "started_at_utc", "finished_at_utc", "duration_ms", "outcome", "failure_code", "output_id"] as const;
    for (const item of attempts) {
      const slot = slots.get(item.slot_id); const config = configs.get(item.configuration_id);
      ensure(slot && config && slot.case_id === item.case_id && slot.configuration_id === item.configuration_id && item.plan_sha256 === raw.plan_sha256);
      ensure(item.started_at_utc >= plan.created_at_utc && item.attempt_index <= config.max_attempts && item.duration_ms <= config.timeout_ms);
      if (item.outcome === "timed_out") ensure(item.duration_ms === config.timeout_ms);
      const previous = current.get(item.attempt_id);
      if (previous) {
        ensure(item.revision === previous.revision + 1 && item.supersedes_record_sha256 === sha256EvaluationManifest(previous) && item.created_at_utc >= previous.created_at_utc);
        ensure(identityFields.every((key) => item[key] === previous[key]));
        ensure(canonicalEvaluationJson(item.usage) !== canonicalEvaluationJson(previous.usage));
        const statuses = ["unavailable", "estimated", "billed"];
        ensure(statuses.indexOf(item.usage.status) >= statuses.indexOf(previous.usage.status));
      } else {
        ensure(item.revision === 0);
        if (item.retry_of_attempt_id !== null) {
          const predecessor = originals.get(item.retry_of_attempt_id);
          ensure(predecessor && predecessor.created_at_utc <= item.started_at_utc);
        }
        originals.set(item.attempt_id, item);
      }
      current.set(item.attempt_id, item);
    }
    const logical = [...current.values()]; unique(logical.map((item) => item.idempotency_id));
    for (const slot of plan.slots) {
      const chain = logical.filter((item) => item.slot_id === slot.slot_id).sort((a, b) => a.attempt_index - b.attempt_index);
      ensure(chain.length > 0); const config = configs.get(slot.configuration_id)!;
      for (let index = 0; index < chain.length; index += 1) {
        const item = chain[index]!; ensure(item.attempt_index === index + 1);
        if (index > 0) {
          const previous = chain[index - 1]!;
          ensure(config.retry_policy === "transient_only" && ["failed", "timed_out"].includes(previous.outcome));
          ensure(item.retry_of_attempt_id === previous.attempt_id && item.started_at_utc >= previous.finished_at_utc);
        }
      }
    }
    unique(outputs.map((item) => item.output_id)); unique(outputs.map((item) => item.attempt_id));
    ensure(outputs.length === logical.filter((item) => item.output_id !== null).length);
    for (const item of outputs) {
      const invocation = current.get(item.attempt_id); ensure(invocation && invocation.output_id === item.output_id && invocation.slot_id === item.slot_id);
      const config = configs.get(invocation.configuration_id)!;
      ensure(item.created_at_utc >= invocation.finished_at_utc && item.width_px === config.output.width_px && item.height_px === config.output.height_px && item.format === config.output.format);
      ensure(item.disposition === (invocation.outcome === "succeeded" ? "candidate" : "rejected"));
    }
    unique(logical.filter((item) => item.output_id !== null).map((item) => item.output_id!));
    return copy({ plan, plan_sha256: raw.plan_sha256 as string, attempts, outputs });
  });
}
/** Revalidates deserialized evidence before exporting. No permissive raw serializer. */
export function serializeEvaluationRecordBundle(value: unknown): string {
  return canonicalEvaluationJson(validateEvaluationRecordBundle(value));
}
