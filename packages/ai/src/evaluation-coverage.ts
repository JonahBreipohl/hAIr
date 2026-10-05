import { canonicalEvaluationJson, evaluationProtocolId, sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationPlan, validateEvaluationPlan, type LockedEvaluationPlan } from "./evaluation-records";

export const evaluationCoverageVersion = "hair-evaluation-coverage-v1";
export const coverageTransformations = Object.freeze(["color", "shorter", "longer", "fringe_part", "fade_taper", "layers_volume", "multitone", "protective_texture"] as const);
export const coverageSecondaryTags = Object.freeze(["gray_or_white", "low_density_or_thinning", "very_short_shaved_or_bald", "protective_style", "long_below_shoulders", "glasses_or_accessories", "head_covering_or_partial_occlusion", "mixed_or_nonstudio_lighting", "side_or_three_quarter"] as const);
type Transformation = typeof coverageTransformations[number];
type SecondaryTag = typeof coverageSecondaryTags[number];
type Tone = "ST1" | "ST2" | "ST3" | "ST4" | "ST5" | "ST6";
type Texture = "HT1" | "HT2" | "HT3" | "HT4";
interface Artifact { readonly artifact_id: string; readonly content_sha256: string }
interface CoverageEnvelope {
  readonly schema_version: "1.0.0";
  readonly protocol_id: typeof evaluationProtocolId;
  readonly run_id: string;
  readonly record_id: string;
  readonly created_at_utc: string;
}
export interface CoverageMetadata extends CoverageEnvelope {
  readonly asset_id: string;
  readonly subject_id: string;
  readonly content_sha256: string;
  readonly registry_manifest_sha256: string;
  readonly annotation_artifact: Artifact;
  readonly authority: "synthetic_fixture" | "unverified_registry_projection";
  readonly provenance: "synthetic" | "licensed" | "explicitly_consented_adult";
  readonly adult_status: "synthetic_adult" | "verified_adult" | "unknown";
  readonly scheme: "hair-tone-texture-v1";
  readonly tone_band: Tone | null;
  readonly texture_group: Texture | null;
  readonly tone_assignment: "synthetic_fixture" | "participant_confirmed" | "trained_steward" | "missing";
  readonly texture_assignment: "synthetic_fixture" | "participant_confirmed" | "trained_steward" | "missing";
  readonly texture_obscured: boolean;
  readonly visible_consented_edit: boolean;
  readonly secondary_tags: readonly SecondaryTag[];
}
export interface EvaluationCoveragePreregistration extends CoverageEnvelope {
  readonly coverage_version: typeof evaluationCoverageVersion;
  readonly stage: LockedEvaluationPlan["stage"];
  readonly plan_sha256: string;
  readonly metadata_sha256: string;
  readonly parent_plan_sha256: string | null;
  readonly dataset_id: string;
  readonly assignment_seed: number;
  readonly h0_repetitions: number | null;
  readonly primary_case_ids: readonly string[];
  readonly reliability_rerun_case_ids: readonly string[];
  readonly unsupported_blocks: readonly {
    readonly configuration_id: string;
    readonly case_ids: readonly string[];
    readonly reason: "provider_strategy_unsupported" | "provider_input_mode_unsupported";
    readonly evidence: Artifact;
  }[];
  readonly physical_inapplicability: readonly {
    readonly dimension: "tone_band" | "texture_group";
    readonly cohort: Tone | Texture;
    readonly transformation: Transformation;
    readonly evidence: Artifact;
  }[];
  readonly finalist_limit_override: { readonly maximum: number; readonly evidence: Artifact } | null;
  readonly comparison: "single_factor" | "bundled_configuration";
  readonly changed_factor: "none" | "provider_model" | "prompt" | "mask_strategy" | "generation_parameters" | "output_quality" | "moderation";
}
export interface EvaluationCoverageInput {
  readonly plan: LockedEvaluationPlan;
  readonly preregistration: EvaluationCoveragePreregistration;
  readonly metadata: readonly CoverageMetadata[];
  readonly parent_plan: LockedEvaluationPlan | null;
}
const reasonCodes = [
  "STAGE_SUBJECT_COUNT", "STAGE_CASE_COUNT", "STAGE_CONFIGURATION_COUNT", "STAGE_PREVIEW_COUNT", "REPETITION_OR_SLOT_COVERAGE", "PRIMARY_SLOT_COUNT", "RERUN_COVERAGE", "PARENT_CORPUS_MISSING", "PARENT_CORPUS_INVALID", "PARENT_CASE_MISMATCH", "METADATA_MISSING", "METADATA_BINDING_MISMATCH", "METADATA_AUTHORITY_UNVERIFIED", "ADULT_OR_SYNTHETIC_STATUS", "COHORT_LABELS_MISSING", "SUBJECT_LABEL_CONFLICT", "DUPLICATE_SUBJECT_CONTENT", "COHORT_CELL_ALLOCATION", "SUBJECT_CASE_ALLOCATION", "TRANSFORMATION_ALLOCATION", "TRANSFORMATION_COHORT_COVERAGE", "REFERENCE_ALLOCATION", "REFERENCE_DISTRIBUTION", "SECONDARY_COVERAGE", "SECONDARY_DISTRIBUTION", "OBSCURED_TEXTURE_UNCONFIRMED", "COMPARISON_POPULATION", "COMPARISON_INPUTS", "COMPARISON_FACTOR", "UNSUPPORTED_DECLARED", "PHYSICAL_RESTRICTION_CONFLICT", "PHYSICAL_RESTRICTION_UNRESOLVED",
] as const;
export type EvaluationCoverageReason = typeof reasonCodes[number];
export interface EvaluationCoverageResult {
  readonly coverage_version: typeof evaluationCoverageVersion;
  readonly scope: "declared_metadata_coverage";
  readonly run_id: string;
  readonly plan_sha256: string;
  readonly input_sha256: string;
  readonly stage: LockedEvaluationPlan["stage"];
  readonly declared_counts_status: "COMPLETE" | "INCOMPLETE";
  readonly coverage_status: "COMPLETE_SYNTHETIC_METADATA" | "INCOMPLETE";
  readonly media_authorization: "NOT_EVALUATED";
  readonly image_quality_gate: "NOT_EVALUATED";
  readonly live_evidence_present: false;
  readonly comparison_status: "IDENTICAL_POPULATION" | "DECLARED_UNSUPPORTED" | "INCOMPLETE";
  readonly primary_subject_count: number;
  readonly primary_case_count: number;
  readonly reference_case_count: number;
  readonly primary_slot_count: number;
  readonly reliability_rerun_case_count: number;
  readonly reliability_rerun_slot_count: number;
  readonly transformation_counts: Readonly<Record<Transformation, number>>;
  readonly cohort_cell_subject_counts: readonly { readonly tone_band: Tone; readonly texture_group: Texture; readonly subject_count: number }[];
  readonly secondary_subject_counts: Readonly<Record<SecondaryTag, number>>;
  readonly findings: readonly EvaluationCoverageReason[];
}
export interface EvaluationCoverageReport { readonly input: EvaluationCoverageInput; readonly result: EvaluationCoverageResult }

const denial = "Evaluation coverage rejected.";
function ensure(condition: unknown): asserts condition { if (!condition) throw new TypeError(denial); }
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  ensure(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const keys = Reflect.ownKeys(value); ensure(keys.length === fields.length && keys.every((key) => typeof key === "string" && fields.includes(key)));
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(value, key); ensure(descriptor?.enumerable === true && "value" in descriptor); }
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  ensure(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length <= 10000);
  ensure(Reflect.ownKeys(value).length === value.length + 1);
  for (let index = 0; index < value.length; index++) { const descriptor = Object.getOwnPropertyDescriptor(value, String(index)); ensure(descriptor?.enumerable === true && "value" in descriptor); }
  return value;
}
function id(value: unknown, prefix: string): void { ensure(typeof value === "string" && new RegExp(`^${prefix}[a-f0-9]{16}$`).test(value)); }
function hash(value: unknown): void { ensure(typeof value === "string" && /^[a-f0-9]{64}$/.test(value)); }
function integer(value: unknown, maximum = Number.MAX_SAFE_INTEGER): void { ensure(typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum); }
function choice(value: unknown, allowed: readonly unknown[]): void { ensure(allowed.includes(value)); }
function instant(value: unknown): void {
  ensure(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  const parsed = Date.parse(value); ensure(Number.isFinite(parsed) && new Date(parsed).toISOString() === value);
}
const envelopeKeys = ["schema_version", "protocol_id", "run_id", "record_id", "created_at_utc"];
function envelope(value: Record<string, unknown>): void {
  ensure(value.schema_version === "1.0.0" && value.protocol_id === evaluationProtocolId);
  id(value.run_id, "run-"); id(value.record_id, "record-"); instant(value.created_at_utc);
}
function artifact(value: unknown): void { const item = object(value, ["artifact_id", "content_sha256"]); id(item.artifact_id, "artifact-"); hash(item.content_sha256); }
const tones: readonly Tone[] = ["ST1", "ST2", "ST3", "ST4", "ST5", "ST6"];
const textures: readonly Texture[] = ["HT1", "HT2", "HT3", "HT4"];
function unique(values: readonly string[]): void { ensure(new Set(values).size === values.length); }
function safe<T>(action: () => T): T { try { return action(); } catch { throw new TypeError(denial); } }
function copy<T>(value: T): T { return JSON.parse(canonicalEvaluationJson(value)) as T; }

export function validateEvaluationCoverageInput(value: unknown): EvaluationCoverageInput {
  return safe(() => {
    const raw = object(value, ["plan", "preregistration", "metadata", "parent_plan"]);
    const plan = validateEvaluationPlan(raw.plan);
    const pre = object(raw.preregistration, [...envelopeKeys, "coverage_version", "stage", "plan_sha256", "metadata_sha256", "parent_plan_sha256", "dataset_id", "assignment_seed", "h0_repetitions", "primary_case_ids", "reliability_rerun_case_ids", "unsupported_blocks", "physical_inapplicability", "finalist_limit_override", "comparison", "changed_factor"]);
    envelope(pre); ensure(pre.coverage_version === evaluationCoverageVersion && pre.stage === plan.stage && pre.run_id === plan.run_id);
    hash(pre.plan_sha256); ensure(pre.plan_sha256 === hashEvaluationPlan(plan) && String(pre.created_at_utc) <= plan.created_at_utc);
    ensure([...plan.assets, ...plan.cases, ...plan.configurations].every((record) => record.created_at_utc <= String(pre.created_at_utc)));
    hash(pre.metadata_sha256); if (pre.parent_plan_sha256 !== null) hash(pre.parent_plan_sha256);
    id(pre.dataset_id, "dataset-"); integer(pre.assignment_seed, 4294967295);
    if (plan.stage === "H0") { integer(pre.h0_repetitions, 1000); ensure(Number(pre.h0_repetitions) >= 1); } else ensure(pre.h0_repetitions === null);
    list(pre.primary_case_ids).forEach((item) => id(item, "case-")); unique(pre.primary_case_ids as string[]);
    list(pre.reliability_rerun_case_ids).forEach((item) => id(item, "case-")); unique(pre.reliability_rerun_case_ids as string[]);
    list(pre.unsupported_blocks).forEach((value) => {
      const item = object(value, ["configuration_id", "case_ids", "reason", "evidence"]);
      id(item.configuration_id, "config-"); list(item.case_ids).forEach((entry) => id(entry, "case-")); unique(item.case_ids as string[]); ensure((item.case_ids as string[]).length > 0);
      choice(item.reason, ["provider_strategy_unsupported", "provider_input_mode_unsupported"]); artifact(item.evidence);
    });
    list(pre.physical_inapplicability).forEach((value) => {
      const item = object(value, ["dimension", "cohort", "transformation", "evidence"]);
      choice(item.dimension, ["tone_band", "texture_group"]); choice(item.cohort, item.dimension === "tone_band" ? tones : textures); choice(item.transformation, coverageTransformations); artifact(item.evidence);
    });
    if (pre.finalist_limit_override !== null) { const item = object(pre.finalist_limit_override, ["maximum", "evidence"]); integer(item.maximum, 100); ensure(Number(item.maximum) > 3); artifact(item.evidence); }
    choice(pre.comparison, ["single_factor", "bundled_configuration"]); choice(pre.changed_factor, ["none", "provider_model", "prompt", "mask_strategy", "generation_parameters", "output_quality", "moderation"]);
    list(raw.metadata).forEach((value) => {
      const item = object(value, [...envelopeKeys, "asset_id", "subject_id", "content_sha256", "registry_manifest_sha256", "annotation_artifact", "authority", "provenance", "adult_status", "scheme", "tone_band", "texture_group", "tone_assignment", "texture_assignment", "texture_obscured", "visible_consented_edit", "secondary_tags"]);
      envelope(item); id(item.asset_id, "ast_"); id(item.subject_id, "sub_"); hash(item.content_sha256); hash(item.registry_manifest_sha256); artifact(item.annotation_artifact);
      choice(item.authority, ["synthetic_fixture", "unverified_registry_projection"]); choice(item.provenance, ["synthetic", "licensed", "explicitly_consented_adult"]); choice(item.adult_status, ["synthetic_adult", "verified_adult", "unknown"]);
      ensure(item.scheme === "hair-tone-texture-v1"); choice(item.tone_band, [...tones, null]); choice(item.texture_group, [...textures, null]);
      choice(item.tone_assignment, ["synthetic_fixture", "participant_confirmed", "trained_steward", "missing"]); choice(item.texture_assignment, ["synthetic_fixture", "participant_confirmed", "trained_steward", "missing"]);
      choice(item.texture_obscured, [true, false]); choice(item.visible_consented_edit, [true, false]);
      list(item.secondary_tags).forEach((tag) => choice(tag, coverageSecondaryTags)); unique(item.secondary_tags as string[]);
      const { annotation_artifact: annotation, ...payload } = item;
      ensure((annotation as Artifact).content_sha256 === sha256EvaluationManifest(payload));
    });
    const parent = raw.parent_plan === null ? null : validateEvaluationPlan(raw.parent_plan);
    ensure(pre.metadata_sha256 === sha256EvaluationManifest(raw.metadata));
    ensure(parent === null ? pre.parent_plan_sha256 === null : pre.parent_plan_sha256 === hashEvaluationPlan(parent));
    const input = { plan, preregistration: pre as unknown as EvaluationCoveragePreregistration, metadata: raw.metadata as CoverageMetadata[], parent_plan: parent };
    const recordIds = [plan.record_id, ...plan.assets.map((r) => r.record_id), ...plan.cases.map((r) => r.record_id), ...plan.configurations.map((r) => r.record_id), input.preregistration.record_id, ...input.metadata.map((r) => r.record_id)]; unique(recordIds);
    unique(input.metadata.map((r) => r.asset_id));
    ensure(input.metadata.every((r) => r.run_id === plan.run_id && r.created_at_utc <= input.preregistration.created_at_utc));
    unique(input.preregistration.physical_inapplicability.map((r) => `${r.dimension}|${r.cohort}|${r.transformation}`));
    const unsupported = input.preregistration.unsupported_blocks.flatMap((b) => b.case_ids.map((caseId) => `${b.configuration_id}|${caseId}`)); unique(unsupported);
    // Every artifact ID throughout both coverage and plan must have one content hash.
    const locks = new Map<string, string>();
    const visitLocks = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach(visitLocks); return; }
      const item = value as Record<string, unknown>;
      if (typeof item.artifact_id === "string" && typeof item.content_sha256 === "string") { ensure(!locks.has(item.artifact_id) || locks.get(item.artifact_id) === item.content_sha256); locks.set(item.artifact_id, item.content_sha256); }
      Object.values(item).forEach(visitLocks);
    }; visitLocks(input);
    return copy(input);
  });
}

const stageRequirements = {
  H0: { subjects: 8, cases: 32, repetitions: 1, previews: 1 },
  T0: { subjects: 12, cases: 24, repetitions: 1, previews: 1 },
  T1: { subjects: 36, cases: 72, repetitions: 2, previews: 1 },
  R0: { subjects: null, cases: 12, repetitions: 1, previews: 1 },
  P1: { subjects: 120, cases: 240, repetitions: 1, previews: 3 },
} as const;
const transformAllocation: Record<"T1" | "P1", readonly number[]> = { T1: [9, 9, 9, 8, 8, 9, 9, 11], P1: [30, 30, 30, 24, 24, 30, 30, 42] };
const secondaryMinimums = [18, 12, 12, 20, 18, 18, 8, 24, 24] as const;
const countsFor = <T extends string>(keys: readonly T[]): Record<T, number> => Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
function casePopulation(item: LockedEvaluationPlan["cases"][number], plan: LockedEvaluationPlan): unknown {
  const asset = (id: string | null): unknown => {
    if (id === null) return null;
    const entry = plan.assets.find((a) => a.asset_id === id);
    return entry ? { asset_id: entry.asset_id, subject_id: entry.subject_id, content_sha256: entry.content_sha256, registry_manifest_sha256: entry.registry_manifest_sha256 } : null;
  };
  return { subject_id: item.subject_id, source: asset(item.source_asset_id), reference: asset(item.reference_asset_id), specification: item.specification, prompt_inputs: item.prompt_inputs, transformation: item.transformation };
}
/** Computes planned count/annotation coverage; never authorizes an asset or a live call. */
export function evaluateEvaluationCoverage(value: unknown): EvaluationCoverageReport {
  return safe(() => {
    const input = validateEvaluationCoverageInput(value); const { plan, preregistration: pre } = input;
    const findings = new Set<EvaluationCoverageReason>(); const add = (code: EvaluationCoverageReason, okay: boolean): void => { if (!okay) findings.add(code); };
    add("PHYSICAL_RESTRICTION_UNRESOLVED", pre.physical_inapplicability.length === 0);
    const requirements = stageRequirements[plan.stage]; const primaryIds = new Set(pre.primary_case_ids); const rerunIds = new Set(pre.reliability_rerun_case_ids);
    const primary = plan.cases.filter((item) => primaryIds.has(item.case_id)); const actualPrimaryIds = new Set(primary.map((item) => item.case_id)); const subjects = new Set(primary.map((item) => item.subject_id));
    add("STAGE_CASE_COUNT", primary.length === requirements.cases && primary.length === primaryIds.size && plan.cases.length === primary.length);
    add("STAGE_SUBJECT_COUNT", requirements.subjects === null || subjects.size === requirements.subjects);
    add("RERUN_COVERAGE", [...rerunIds].every((caseId) => primaryIds.has(caseId)) && (plan.stage === "P1" ? rerunIds.size === 24 : rerunIds.size === 0));
    add("STAGE_CONFIGURATION_COUNT", plan.stage !== "P1" || plan.configurations.length === 1);
    add("STAGE_CONFIGURATION_COUNT", plan.stage !== "T1" || plan.configurations.length <= (pre.finalist_limit_override?.maximum ?? 3));
    add("STAGE_CONFIGURATION_COUNT", pre.finalist_limit_override === null || plan.stage === "T1");
    add("STAGE_PREVIEW_COUNT", plan.stage === "H0" || plan.configurations.every((config) => config.preview_count === requirements.previews));
    const expected = new Set<string>(); const unsupported = new Set(pre.unsupported_blocks.flatMap((b) => b.case_ids.map((caseId) => `${caseId}|${b.configuration_id}`)));
    add("UNSUPPORTED_DECLARED", unsupported.size === 0);
    add("COMPARISON_POPULATION", pre.unsupported_blocks.every((b) => plan.configurations.some((c) => c.configuration_id === b.configuration_id) && b.case_ids.every((id) => primaryIds.has(id))));
    const baseRepetitions = plan.stage === "H0" ? pre.h0_repetitions! : requirements.repetitions;
    let expectedCardinality = (primary.length * baseRepetitions + (plan.stage === "P1" ? [...rerunIds].filter((id) => actualPrimaryIds.has(id)).length : 0)) * plan.configurations.reduce((sum, config) => sum + (plan.stage === "H0" ? config.preview_count : requirements.previews), 0);
    for (const block of pre.unsupported_blocks) {
      const config = plan.configurations.find((c) => c.configuration_id === block.configuration_id);
      if (config) for (const id of block.case_ids) if (actualPrimaryIds.has(id)) expectedCardinality -= (baseRepetitions + (plan.stage === "P1" && rerunIds.has(id) ? 1 : 0)) * (plan.stage === "H0" ? config.preview_count : requirements.previews);
    }
    add("REPETITION_OR_SLOT_COVERAGE", expectedCardinality <= 10000);
    if (expectedCardinality <= 10000) for (const item of primary) for (const config of plan.configurations) {
      if (unsupported.has(`${item.case_id}|${config.configuration_id}`)) continue;
      const repetitions = plan.stage === "H0" ? pre.h0_repetitions! : plan.stage === "P1" && rerunIds.has(item.case_id) ? 2 : requirements.repetitions;
      const previews = plan.stage === "H0" ? config.preview_count : requirements.previews;
      for (let repetition = 0; repetition < repetitions; repetition++) for (let variant = 0; variant < previews; variant++) { ensure(expected.size < 10000); expected.add(`${item.case_id}|${config.configuration_id}|${repetition}|${variant}`); }
    }
    const actual = new Set(plan.slots.map((s) => `${s.case_id}|${s.configuration_id}|${s.repetition}|${s.variant_index}`));
    add("REPETITION_OR_SLOT_COVERAGE", actual.size === expected.size && [...expected].every((key) => actual.has(key)));
    add("COMPARISON_POPULATION", [...actual].every((key) => { const parts = key.split("|"); return !unsupported.has(`${parts[0]}|${parts[1]}`); }) && actual.size === expected.size && [...expected].every((key) => actual.has(key)));
    const rerunSlots = plan.stage === "P1" ? plan.slots.filter((slot) => slot.repetition === 1) : [];
    const primarySlots = plan.slots.length - rerunSlots.length;
    const expectedPrimarySlots = requirements.cases * (plan.stage === "H0" ? pre.h0_repetitions! : requirements.repetitions) * plan.configurations.reduce((sum, config) => sum + (plan.stage === "H0" ? config.preview_count : requirements.previews), 0);
    add("PRIMARY_SLOT_COUNT", primarySlots === expectedPrimarySlots);
    if (plan.stage === "P1") add("RERUN_COVERAGE", rerunSlots.length === 72);

    const metadata = new Map(input.metadata.map((item) => [item.asset_id, item]));
    const sourceIds = new Set(primary.map((item) => item.source_asset_id));
    const contentSubjects = new Map<string, string | null>();
    for (const sourceId of sourceIds) {
      const asset = plan.assets.find((a) => a.asset_id === sourceId)!;
      add("DUPLICATE_SUBJECT_CONTENT", !contentSubjects.has(asset.content_sha256) || contentSubjects.get(asset.content_sha256) === asset.subject_id);
      contentSubjects.set(asset.content_sha256, asset.subject_id);
    }
    add("METADATA_BINDING_MISMATCH", input.metadata.every((item) => sourceIds.has(item.asset_id)));
    const bySubject = new Map<string, CoverageMetadata>();
    for (const sourceId of sourceIds) {
      const item = metadata.get(sourceId); const asset = plan.assets.find((a) => a.asset_id === sourceId)!;
      if (!item) { findings.add("METADATA_MISSING"); continue; }
      add("METADATA_BINDING_MISMATCH", item.subject_id === asset.subject_id && item.content_sha256 === asset.content_sha256 && item.registry_manifest_sha256 === asset.registry_manifest_sha256);
      add("METADATA_AUTHORITY_UNVERIFIED", item.authority === "synthetic_fixture");
      add("ADULT_OR_SYNTHETIC_STATUS", item.authority === "synthetic_fixture" ? item.provenance === "synthetic" && item.adult_status === "synthetic_adult" : item.adult_status === "verified_adult" && item.provenance !== "synthetic");
      if (plan.stage === "H0") add("ADULT_OR_SYNTHETIC_STATUS", item.provenance === "synthetic" && item.authority === "synthetic_fixture");
      const previous = bySubject.get(item.subject_id);
      add("SUBJECT_LABEL_CONFLICT", !previous || canonicalEvaluationJson({ tone: previous.tone_band, texture: previous.texture_group }) === canonicalEvaluationJson({ tone: item.tone_band, texture: item.texture_group }));
      if (!previous) bySubject.set(item.subject_id, item);
      if (plan.stage === "T1" || plan.stage === "P1") {
        add("COHORT_LABELS_MISSING", item.tone_band !== null && item.texture_group !== null && item.tone_assignment !== "missing" && item.texture_assignment !== "missing");
        const obscure = item.texture_obscured || item.secondary_tags.some((tag) => ["very_short_shaved_or_bald", "protective_style", "head_covering_or_partial_occlusion"].includes(tag));
        add("OBSCURED_TEXTURE_UNCONFIRMED", !obscure || (item.authority === "synthetic_fixture" ? item.texture_assignment === "synthetic_fixture" : item.texture_assignment === "participant_confirmed"));
        add("OBSCURED_TEXTURE_UNCONFIRMED", !item.secondary_tags.includes("head_covering_or_partial_occlusion") || item.visible_consented_edit);
        add("COHORT_LABELS_MISSING", item.authority !== "synthetic_fixture" || (item.tone_assignment === "synthetic_fixture" && item.texture_assignment === "synthetic_fixture"));
        add("COHORT_LABELS_MISSING", item.authority !== "unverified_registry_projection" || (["participant_confirmed", "trained_steward"].includes(item.tone_assignment) && ["participant_confirmed", "trained_steward"].includes(item.texture_assignment)));
      }
    }
    const cells = tones.flatMap((tone) => textures.map((texture) => ({ tone_band: tone, texture_group: texture, subject_count: [...subjects].filter((subject) => bySubject.get(subject)?.tone_band === tone && bySubject.get(subject)?.texture_group === texture).length })));
    const transformationCounts = countsFor(coverageTransformations); primary.forEach((item) => transformationCounts[item.transformation]++);
    const reference = primary.filter((item) => item.reference_asset_id !== null);
    const secondarySubjects = new Map(coverageSecondaryTags.map((tag) => [tag, new Set<string>()]));
    input.metadata.filter((item) => sourceIds.has(item.asset_id)).forEach((item) => item.secondary_tags.forEach((tag) => secondarySubjects.get(tag)!.add(item.subject_id)));
    const secondaryCounts = countsFor(coverageSecondaryTags); coverageSecondaryTags.forEach((tag) => { secondaryCounts[tag] = secondarySubjects.get(tag)!.size; });
    if (plan.stage === "T0" || plan.stage === "T1" || plan.stage === "P1") {
      for (const subject of subjects) {
        const cases = primary.filter((item) => item.subject_id === subject);
        add("SUBJECT_CASE_ALLOCATION", cases.length === 2 && new Set(cases.map((item) => item.transformation)).size === 2);
      }
    }
    if (plan.stage === "T1" || plan.stage === "P1") {
      add("COHORT_CELL_ALLOCATION", cells.every((cell) => plan.stage === "P1" ? cell.subject_count === 5 : cell.subject_count >= 1));
      add("TRANSFORMATION_ALLOCATION", coverageTransformations.every((transform, index) => transformationCounts[transform] === transformAllocation[plan.stage as "T1" | "P1"][index]));
      add("REFERENCE_ALLOCATION", reference.length === (plan.stage === "T1" ? 24 : 72));
      const casesFor = (dimension: "tone_band" | "texture_group", cohort: Tone | Texture, cases: typeof primary): typeof primary => cases.filter((item) => bySubject.get(item.subject_id)?.[dimension] === cohort);
      for (const [dimension, cohorts] of [["tone_band", tones], ["texture_group", textures]] as const) for (const cohort of cohorts) for (const transform of coverageTransformations) {
        const has = casesFor(dimension, cohort, primary).some((item) => item.transformation === transform);
        const restriction = pre.physical_inapplicability.some((r) => r.dimension === dimension && r.cohort === cohort && r.transformation === transform);
        add("PHYSICAL_RESTRICTION_CONFLICT", !restriction || !has); add("TRANSFORMATION_COHORT_COVERAGE", has || restriction);
      }
      add("REFERENCE_DISTRIBUTION", coverageTransformations.every((transform) => reference.some((item) => item.transformation === transform)) && tones.every((tone) => casesFor("tone_band", tone, reference).length > 0) && textures.every((texture) => casesFor("texture_group", texture, reference).length > 0));
      // Reference mode is independent of primary transforms; every core cell is represented.
      add("REFERENCE_DISTRIBUTION", cells.every((cell) => reference.some((item) => { const m = bySubject.get(item.subject_id); return m?.tone_band === cell.tone_band && m.texture_group === cell.texture_group; })));
      if (plan.stage === "T1") add("SECONDARY_COVERAGE", [...subjects].filter((subject) => input.metadata.some((m) => m.subject_id === subject && m.secondary_tags.length > 0)).length >= 12);
      if (plan.stage === "P1") add("SECONDARY_COVERAGE", coverageSecondaryTags.every((tag, index) => secondaryCounts[tag] >= secondaryMinimums[index]!));
      for (const tag of coverageSecondaryTags) {
        const members = secondarySubjects.get(tag)!;
        if (members.size === 0 && plan.stage === "T1") continue;
        const taggedCases = primary.filter((item) => members.has(item.subject_id));
        add("SECONDARY_DISTRIBUTION", new Set(taggedCases.map((item) => item.transformation)).size >= 2 && new Set([...members].map((id) => bySubject.get(id)?.tone_band)).size >= 2 && new Set([...members].map((id) => bySubject.get(id)?.texture_group)).size >= 2);
      }
      if (plan.stage === "P1") {
        const reruns = primary.filter((item) => rerunIds.has(item.case_id));
        add("RERUN_COVERAGE", cells.every((cell) => reruns.filter((item) => { const m = bySubject.get(item.subject_id); return m?.tone_band === cell.tone_band && m.texture_group === cell.texture_group; }).length === 1));
        add("RERUN_COVERAGE", coverageTransformations.every((transform) => reruns.some((item) => item.transformation === transform)));
        add("RERUN_COVERAGE", reruns.some((item) => item.reference_asset_id === null) && reruns.some((item) => item.reference_asset_id !== null));
      }
    } else add("PHYSICAL_RESTRICTION_CONFLICT", pre.physical_inapplicability.length === 0);

    if (plan.stage === "T0" || plan.stage === "R0") {
      const parent = input.parent_plan;
      add("PARENT_CORPUS_MISSING", parent !== null);
      if (parent) {
        add("PARENT_CORPUS_INVALID", parent.stage === "T1" && parent.cases.length === 72 && new Set(parent.cases.map((item) => item.subject_id)).size === 36 && parent.created_at_utc <= pre.created_at_utc);
        for (const item of primary) {
          const original = parent.cases.find((p) => p.case_id === item.case_id);
          add("PARENT_CASE_MISMATCH", original !== undefined && canonicalEvaluationJson(casePopulation(item, plan)) === canonicalEvaluationJson(casePopulation(original, parent)));
        }
        add("COMPARISON_INPUTS", plan.configurations.every((config) => parent.configurations.some((p) => canonicalEvaluationJson(p.preprocessing) === canonicalEvaluationJson(config.preprocessing))));
      }
    } else add("PARENT_CORPUS_INVALID", input.parent_plan === null);

    const baseline = plan.configurations[0]!;
    const commonFields = ["preprocessing", "timeout_ms", "retry_policy", "max_attempts", "concurrency", "preview_count", "idempotency"] as const;
    const factorFields = {
      provider_model: ["provider_id", "api_region", "model_snapshot", "terms_snapshot", "terms_snapshot_at_utc", "pricing_schedule_id"],
      prompt: ["prompt_template", "descriptor_conversion"], mask_strategy: ["mask_strategy", "segmentation", "dilation_px", "feather_px", "manual_mask_edit", "protected_region_definition"],
      generation_parameters: ["generation_parameters", "seed", "seed_unsupported"], output_quality: ["output"], moderation: ["moderation_policy"], none: [],
    } as const;
    const variableFields = [...new Set(Object.values(factorFields).flat())];
    for (const config of plan.configurations.slice(1)) {
      add("COMPARISON_INPUTS", commonFields.every((key) => canonicalEvaluationJson(config[key]) === canonicalEvaluationJson(baseline[key])) && config.output.width_px === baseline.output.width_px && config.output.height_px === baseline.output.height_px && config.output.format === baseline.output.format);
      if (pre.comparison === "single_factor") {
        const allowed: readonly string[] = factorFields[pre.changed_factor];
        add("COMPARISON_FACTOR", variableFields.every((key) => allowed.includes(key) || canonicalEvaluationJson(config[key]) === canonicalEvaluationJson(baseline[key])));
      }
    }
    for (const item of primary) {
      const recipes = new Map<string, typeof item.mask_inputs[number]>();
      for (const mask of item.mask_inputs) {
        const config = plan.configurations.find((c) => c.configuration_id === mask.configuration_id)!;
        const recipe = sha256EvaluationManifest(Object.fromEntries(factorFields.mask_strategy.map((key) => [key, config[key]])));
        const previous = recipes.get(recipe);
        if (previous) add("COMPARISON_INPUTS", mask.mask_asset_id === previous.mask_asset_id && mask.protected_region_asset_id === previous.protected_region_asset_id);
        else recipes.set(recipe, mask);
      }
    }
    const reasons = reasonCodes.filter((reason) => findings.has(reason));
    const countReasons = reasons.filter((reason) => reason !== "METADATA_AUTHORITY_UNVERIFIED");
    const result: EvaluationCoverageResult = {
      coverage_version: evaluationCoverageVersion, scope: "declared_metadata_coverage", run_id: plan.run_id, plan_sha256: pre.plan_sha256, input_sha256: sha256EvaluationManifest(input), stage: plan.stage,
      declared_counts_status: countReasons.length === 0 ? "COMPLETE" : "INCOMPLETE", coverage_status: reasons.length === 0 ? "COMPLETE_SYNTHETIC_METADATA" : "INCOMPLETE",
      media_authorization: "NOT_EVALUATED", image_quality_gate: "NOT_EVALUATED", live_evidence_present: false,
      comparison_status: findings.has("COMPARISON_POPULATION") || findings.has("COMPARISON_INPUTS") || findings.has("COMPARISON_FACTOR") ? "INCOMPLETE" : unsupported.size > 0 ? "DECLARED_UNSUPPORTED" : "IDENTICAL_POPULATION",
      primary_subject_count: subjects.size, primary_case_count: primary.length, reference_case_count: reference.length, primary_slot_count: primarySlots, reliability_rerun_case_count: rerunIds.size, reliability_rerun_slot_count: rerunSlots.length,
      transformation_counts: transformationCounts, cohort_cell_subject_counts: cells, secondary_subject_counts: secondaryCounts, findings: reasons,
    };
    return { input, result };
  });
}
/** Rebuilds calculations from exact safe input before exporting any report fields. */
export function serializeEvaluationCoverageReport(value: unknown): string {
  return safe(() => {
    const report = object(value, ["input", "result"]); const rebuilt = evaluateEvaluationCoverage(report.input);
    // Never inspect/stringify caller report values before checking their exact safe shape.
    const expected = rebuilt.result as unknown as Record<string, unknown>;
    const validateExact = (actual: unknown, reference: unknown): void => {
      if (Array.isArray(reference)) { const arr = list(actual); ensure(arr.length === reference.length); arr.forEach((v, index) => validateExact(v, reference[index])); }
      else if (reference && typeof reference === "object") { const ref = reference as Record<string, unknown>; const obj = object(actual, Object.keys(ref)); Object.keys(ref).forEach((key) => validateExact(obj[key], ref[key])); }
      else ensure(actual === reference);
    }; validateExact(report.result, expected);
    return canonicalEvaluationJson(rebuilt);
  });
}
