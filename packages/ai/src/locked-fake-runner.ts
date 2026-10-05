import { defaultHairSpecification, type HairSpecification } from "@hair/domain";
import { canonicalEvaluationJson, evaluationProtocolId, sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationPlan, validateEvaluationPlan, validateEvaluationRecordBundle, type EvaluationAttemptRecord, type EvaluationOutputRecord, type EvaluationRecordBundle, type LockedEvaluationPlan } from "./evaluation-records";
import { FakeHairstyleImageProvider, type FakeProviderScenario } from "./fake-provider";
import { HairstyleProviderError, type HairstyleEditRequest } from "./provider";
import { scheduleEvaluationInvocations } from "./evaluation-scheduling";

export const lockedFakeRunnerVersion = "hair-locked-fake-runner-v2";
/** A simulation-version lock, not a Git revision or verified checkout. */
export const lockedFakeSimulationRevision = sha256EvaluationManifest({ runner: lockedFakeRunnerVersion, provider: "deterministic-v1" });
export const lockedFakeProviderId = "provider-0000000000000001";
export const lockedFakePricingId = "pricing-0000000000000001";
export const lockedFakeTermsDate = "2026-10-02T00:00:00.000Z";
const denial = "Locked fake run rejected.";
function ensure(value: unknown): asserts value { if (!value) throw new TypeError(denial); }
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  ensure(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const own = Reflect.ownKeys(value);
  ensure(own.length === keys.length && own.every((key) => typeof key === "string" && keys.includes(key)));
  for (const key of own) { const property = Object.getOwnPropertyDescriptor(value, key); ensure(property?.enumerable === true && "value" in property); }
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  ensure(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length <= 10000);
  ensure(Reflect.ownKeys(value).length === value.length + 1);
  for (let index = 0; index < value.length; index++) { const property = Object.getOwnPropertyDescriptor(value, String(index)); ensure(property?.enumerable === true && "value" in property); }
  return value;
}
function identifier(value: unknown, prefix: string): void { ensure(typeof value === "string" && new RegExp(`^${prefix}[a-f0-9]{16}$`).test(value)); }
function hash(value: unknown): void { ensure(typeof value === "string" && /^[a-f0-9]{64}$/.test(value)); }
function copy<T>(value: T): T { return JSON.parse(canonicalEvaluationJson(value)) as T; }
function exact(value: unknown, expected: unknown): void {
  if (Array.isArray(expected)) { const actual = list(value); ensure(actual.length === expected.length); actual.forEach((item, index) => exact(item, expected[index])); }
  else if (expected !== null && typeof expected === "object") { const actual = object(value, Object.keys(expected)); for (const [key, item] of Object.entries(expected)) exact(actual[key], item); }
  else ensure(value === expected);
}
const scenarios = ["success", "partial", "policy_rejection", "timeout", "rate_limited", "provider_error", "timeout_then_success", "rate_limit_then_success"] as const;
type Scenario = typeof scenarios[number];
type Transformation = LockedEvaluationPlan["cases"][number]["transformation"];
interface SyntheticAsset {
  readonly kind: "synthetic_asset";
  readonly recipe: "opaque_metadata_v1";
  readonly asset_id: string;
  readonly role: "source_portrait" | "style_reference";
  readonly subject_id: string | null;
  readonly parent_asset_ids: readonly string[];
}
type ArtifactContent = SyntheticAsset | { readonly kind: "specification"; readonly transformation: Transformation; readonly specification_sha256: string } |
  { readonly kind: "prompt_inputs"; readonly specification_sha256: string; readonly source_asset_id: string; readonly reference_asset_id: string | null; readonly prompt_version: "synthetic_hair_v1"; readonly strategy: "prompt-only"; readonly quality: "medium" } |
  { readonly kind: "generation_parameters"; readonly scenario: Scenario } |
  { readonly kind: "model_snapshot" | "moderation_policy" | "prompt_template" | "descriptor_conversion" | "preprocessing" | "terms_snapshot"; readonly value: string };
interface RegistryEntry { readonly artifact_id: string; readonly content: ArtifactContent }
export interface LockedFakeRunInput { readonly plan: LockedEvaluationPlan; readonly plan_sha256: string; readonly registry: readonly RegistryEntry[] }
interface InvocationReceipt {
  readonly attempt_id: string;
  readonly request_sha256: string;
  readonly configuration_sha256: string;
  readonly synthetic_output_sha256: string | null;
  readonly provider: "fake";
  readonly model: "deterministic-v1";
  readonly scenario: FakeProviderScenario;
  readonly timing: "virtual";
}
export interface LockedFakeRunReport {
  readonly runner_version: typeof lockedFakeRunnerVersion;
  readonly scope: "synthetic_locked_fake_execution";
  readonly timing: "virtual_serial";
  readonly output_hash_basis: "synthetic_metadata_not_image_bytes";
  readonly technical_image_gate_status: "NOT_EVALUATED";
  readonly live_evidence_present: false;
  readonly excluded_evidence: readonly ["image_decoding", "image_quality", "live_authority", "registry_authorization", "pricing", "release_gate"];
  readonly input: LockedFakeRunInput;
  readonly bundle: EvaluationRecordBundle;
  readonly invocations: readonly InvocationReceipt[];
}
const fixedArtifacts = {
  model_snapshot: "deterministic-v1", moderation_policy: "synthetic_no_media_v1", prompt_template: "synthetic_hair_v1",
  descriptor_conversion: "compiled_attributes_v1", preprocessing: "synthetic_metadata_only_v1", terms_snapshot: "synthetic_no_transfer_no_spend_v1",
} as const;
// Detach imported defaults once; external domain-object mutation cannot change
// later requests across the provider's asynchronous boundary.
const compiledDefaults: HairSpecification = Object.freeze({ ...defaultHairSpecification, preserve: Object.freeze([] as string[]) });
function validateContent(value: unknown): ArtifactContent {
  // Read only a plain own data property before choosing the exact schema.
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind"); ensure(kindDescriptor && "value" in kindDescriptor);
  const kind = kindDescriptor.value as unknown;
  if (kind === "synthetic_asset") {
    const item = object(value, ["kind", "recipe", "asset_id", "role", "subject_id", "parent_asset_ids"]);
    ensure(item.recipe === "opaque_metadata_v1"); identifier(item.asset_id, "ast_"); ensure(item.role === "source_portrait" || item.role === "style_reference");
    if (item.subject_id !== null) identifier(item.subject_id, "sub_");
    ensure((item.role === "source_portrait") === (item.subject_id !== null)); ensure(list(item.parent_asset_ids).length === 0);
  } else if (kind === "specification") {
    const item = object(value, ["kind", "transformation", "specification_sha256"]); ensure(typeof item.transformation === "string" && ["color", "shorter", "longer", "fringe_part", "fade_taper", "layers_volume", "multitone", "protective_texture"].includes(item.transformation)); hash(item.specification_sha256);
  } else if (kind === "prompt_inputs") {
    const item = object(value, ["kind", "specification_sha256", "source_asset_id", "reference_asset_id", "prompt_version", "strategy", "quality"]);
    hash(item.specification_sha256); identifier(item.source_asset_id, "ast_"); if (item.reference_asset_id !== null) identifier(item.reference_asset_id, "ast_");
    ensure(item.prompt_version === "synthetic_hair_v1" && item.strategy === "prompt-only" && item.quality === "medium");
  }
  else if (kind === "generation_parameters") { const item = object(value, ["kind", "scenario"]); ensure(scenarios.includes(item.scenario as Scenario)); }
  else { ensure(typeof kind === "string" && Object.hasOwn(fixedArtifacts, kind)); const item = object(value, ["kind", "value"]); ensure(item.value === fixedArtifacts[kind as keyof typeof fixedArtifacts]); }
  return copy(value as ArtifactContent);
}
/** Entire registry and profile are validated before the first internal fake call. */
export function validateLockedFakeRunInput(value: unknown): LockedFakeRunInput {
  try {
    const raw = object(value, ["plan", "plan_sha256", "registry"]); const plan = validateEvaluationPlan(raw.plan);
    hash(raw.plan_sha256); ensure(raw.plan_sha256 === hashEvaluationPlan(plan)); ensure(plan.stage === "H0" && plan.code_revision_sha256 === lockedFakeSimulationRevision);
    const registry = list(raw.registry).map((value) => { const entry = object(value, ["artifact_id", "content"]); identifier(entry.artifact_id, "artifact-"); return { artifact_id: entry.artifact_id as string, content: validateContent(entry.content) }; });
    const entries = new Map(registry.map((item) => [item.artifact_id, item.content])); ensure(entries.size === registry.length);
    const used = new Set<string>();
    const resolve = (lock: { artifact_id: string; content_sha256: string }, kind: ArtifactContent["kind"]): ArtifactContent => {
      const item = entries.get(lock.artifact_id); ensure(item && item.kind === kind && sha256EvaluationManifest(item) === lock.content_sha256); used.add(lock.artifact_id); return item;
    };
    for (const asset of plan.assets) {
      // Asset recipe IDs are deterministic, distinct from the case/configuration registry namespace.
      const artifactId = `artifact-${sha256EvaluationManifest({ asset_id: asset.asset_id }).slice(0, 16)}`;
      const content = resolve({ artifact_id: artifactId, content_sha256: asset.content_sha256 }, "synthetic_asset") as SyntheticAsset;
      exact(content, { kind: "synthetic_asset", recipe: "opaque_metadata_v1", asset_id: asset.asset_id, role: asset.role, subject_id: asset.subject_id, parent_asset_ids: asset.parent_asset_ids });
      ensure(asset.registry_manifest_sha256 === sha256EvaluationManifest({ kind: "synthetic_registry_manifest", content }));
    }
    for (const item of plan.cases) {
      const specificationHash = sha256EvaluationManifest(specification(item.transformation));
      exact(resolve(item.specification, "specification"), { kind: "specification", transformation: item.transformation, specification_sha256: specificationHash });
      exact(resolve(item.prompt_inputs, "prompt_inputs"), { kind: "prompt_inputs", specification_sha256: specificationHash, source_asset_id: item.source_asset_id, reference_asset_id: item.reference_asset_id, prompt_version: "synthetic_hair_v1", strategy: "prompt-only", quality: "medium" });
    }
    for (const config of plan.configurations) {
      for (const kind of Object.keys(fixedArtifacts) as (keyof typeof fixedArtifacts)[]) resolve(config[kind], kind);
      resolve(config.generation_parameters, "generation_parameters");
      ensure(config.provider_id === lockedFakeProviderId && config.pricing_schedule_id === lockedFakePricingId && config.api_region === "local");
      ensure(config.mask_strategy === "prompt_only" && config.segmentation === null && config.protected_region_definition === null);
      ensure(config.dilation_px === 0 && config.feather_px === 0 && !config.manual_mask_edit);
      exact(config.output, { width_px: 512, height_px: 512, format: "png", quality: "medium", background: "opaque", compression_percent: 100 });
      ensure(config.preview_count === 3 && config.timeout_ms === 100 && config.retry_policy === "transient_only" && config.max_attempts === 2 && config.concurrency === 1);
      ensure(config.idempotency === "one_key_per_attempt" && config.seed === null && config.seed_unsupported && config.terms_snapshot_at_utc === lockedFakeTermsDate);
    }
    ensure(used.size === entries.size); return copy({ plan, plan_sha256: raw.plan_sha256 as string, registry });
  } catch { throw new TypeError(denial); }
}
function specification(transformation: Transformation): HairSpecification {
  const edits: Record<Transformation, Partial<HairSpecification>> = {
    color: { baseColor: "brunette", tone: "cool" }, shorter: { lengthGoal: "shorter", silhouette: "chin-length bob" }, longer: { lengthGoal: "longer", silhouette: "shoulder length" },
    fringe_part: { fringe: "soft fringe", part: "side" }, fade_taper: { lengthGoal: "shorter", fadeOrTaper: "low taper" }, layers_volume: { layers: "soft layers", volume: "moderate" },
    multitone: { highlights: "subtle highlights" }, protective_texture: { texture: "protective", silhouette: "twists" },
  };
  return Object.freeze({ ...compiledDefaults, ...edits[transformation], preserve: Object.freeze(["face", "skin", "background"]) });
}
function stableId(prefix: string, value: unknown): string { return `${prefix}-${sha256EvaluationManifest(value).slice(0, 16)}`; }
function scenarioFor(scenario: Scenario, index: number): FakeProviderScenario {
  if (scenario === "timeout_then_success") return index === 1 ? "timeout" : "success";
  if (scenario === "rate_limit_then_success") return index === 1 ? "rate_limited" : "success";
  return scenario;
}
async function execute(input: LockedFakeRunInput): Promise<LockedFakeRunReport> {
  const { plan, plan_sha256 } = input; const attempts: EvaluationAttemptRecord[] = []; const outputs: EvaluationOutputRecord[] = []; const invocations: InvocationReceipt[] = [];
  let virtualMs = Date.parse(plan.created_at_utc);
  const envelope = (recordId: string, time: number) => ({ schema_version: "1.0.0", protocol_id: evaluationProtocolId, run_id: plan.run_id, record_id: recordId, created_at_utc: new Date(time).toISOString() } as const);
  const scheduledSlots = scheduleEvaluationInvocations({ plan, plan_sha256 }).result.blocks.flatMap(block => block.slots);
  for (const slot of scheduledSlots) {
    const item = plan.cases.find((item) => item.case_id === slot.case_id)!; const config = plan.configurations.find((item) => item.configuration_id === slot.configuration_id)!;
    const params = input.registry.find((entry) => entry.artifact_id === config.generation_parameters.artifact_id)!.content as Extract<ArtifactContent, { kind: "generation_parameters" }>;
    let previousId: string | null = null;
    for (let index = 1; index <= config.max_attempts; index++) {
      const identity = { plan_sha256, slot_id: slot.slot_id, attempt_index: index };
      const attemptId = stableId("attempt", identity); const idempotencyId = stableId("idempotency", identity);
      const request: HairstyleEditRequest = Object.freeze({ requestId: attemptId, sourceAssetId: item.source_asset_id, ...(item.reference_asset_id ? { referenceAssetId: item.reference_asset_id } : {}), specification: specification(item.transformation), strategy: "prompt-only", quality: "medium", promptVersion: "synthetic_hair_v1", idempotencyKey: `${idempotencyId}:${slot.variant_index}:synthetic_hair_v1` });
      const requestHash = sha256EvaluationManifest(request);
      const scenario = scenarioFor(params.scenario, index); const started = virtualMs;
      const expectedScenario = scenario === "partial" ? (slot.variant_index === 2 ? "provider_error" : "success") : scenario;
      let outcome: EvaluationAttemptRecord["outcome"]; let failure: EvaluationAttemptRecord["failure_code"]; let duration = 25;
      let outputId: string | null = null; let outputHash: string | null = null;
      let usage: EvaluationAttemptRecord["usage"] = { status: "unavailable", image_input_units: null, image_output_units: null, text_input_units: null };
      try {
        const result = await new FakeHairstyleImageProvider(scenario, 25).edit(request);
        ensure(expectedScenario === "success");
        // Exact response check also rejects accidental drift in the internal implementation.
        const raw = object(result, ["requestId", "outputAssetId", "provider", "model", "durationMs", "usage", "provenance"]);
        ensure(raw.requestId === attemptId && raw.provider === "fake" && raw.model === "deterministic-v1" && raw.durationMs === 25 && raw.provenance === "product");
        ensure(typeof raw.outputAssetId === "string" && /^fake-output-[a-f0-9]{8}$/.test(raw.outputAssetId));
        exact(raw.usage, { imageInputUnits: item.reference_asset_id ? 2 : 1, imageOutputUnits: 1, textInputUnits: 1, estimatedCostUsd: 0 });
        outputId = stableId("output", identity); outputHash = sha256EvaluationManifest({ kind: "synthetic_output_metadata", fake_handle: raw.outputAssetId, request_sha256: requestHash, configuration_sha256: sha256EvaluationManifest(config) });
        outcome = "succeeded"; failure = "none";
        usage = { status: "estimated", image_input_units: item.reference_asset_id ? 2 : 1, image_output_units: 1, text_input_units: 1 };
      } catch (error) {
        if (!(error instanceof HairstyleProviderError)) throw new TypeError(denial);
        // No error message or provider exception object enters exported records.
        ensure(Object.getPrototypeOf(error) === HairstyleProviderError.prototype);
        const codeProperty = Object.getOwnPropertyDescriptor(error, "code"); const retryProperty = Object.getOwnPropertyDescriptor(error, "retryable");
        ensure(codeProperty && "value" in codeProperty && retryProperty && "value" in retryProperty);
        const code = codeProperty.value as unknown; const retryable = retryProperty.value as unknown;
        ensure(code === expectedScenario && retryable === (code !== "policy_rejection"));
        switch (code) {
          case "timeout": outcome = "timed_out"; failure = "timeout"; duration = config.timeout_ms; break;
          case "policy_rejection": outcome = "rejected"; failure = "policy_rejection"; break;
          case "rate_limited": outcome = "failed"; failure = "rate_limit"; break;
          case "provider_error": outcome = "failed"; failure = "provider_failure"; break;
          default: throw new TypeError(denial);
        }
      }
      virtualMs += duration;
      const attempt: EvaluationAttemptRecord = { ...envelope(stableId("record", { ...identity, kind: "attempt" }), virtualMs), attempt_id: attemptId, slot_id: slot.slot_id, case_id: slot.case_id, configuration_id: slot.configuration_id, plan_sha256, attempt_index: index, retry_of_attempt_id: previousId, idempotency_id: idempotencyId, started_at_utc: new Date(started).toISOString(), finished_at_utc: new Date(virtualMs).toISOString(), duration_ms: duration, outcome, failure_code: failure, output_id: outputId, usage, revision: 0, supersedes_record_sha256: null, correction_reason: "none" };
      attempts.push(attempt);
      if (outputId && outputHash) outputs.push({ ...envelope(stableId("record", { ...identity, kind: "output" }), virtualMs), output_id: outputId, attempt_id: attemptId, slot_id: slot.slot_id, content_sha256: outputHash, width_px: 512, height_px: 512, format: "png", disposition: "candidate" });
      invocations.push({ attempt_id: attemptId, request_sha256: requestHash, configuration_sha256: sha256EvaluationManifest(config), synthetic_output_sha256: outputHash, provider: "fake", model: "deterministic-v1", scenario, timing: "virtual" });
      previousId = attemptId;
      if (outcome !== "failed" && outcome !== "timed_out") break;
    }
  }
  const bundle = validateEvaluationRecordBundle({ plan, plan_sha256, attempts, outputs });
  return { runner_version: lockedFakeRunnerVersion, scope: "synthetic_locked_fake_execution", timing: "virtual_serial", output_hash_basis: "synthetic_metadata_not_image_bytes", technical_image_gate_status: "NOT_EVALUATED", live_evidence_present: false, excluded_evidence: ["image_decoding", "image_quality", "live_authority", "registry_authorization", "pricing", "release_gate"], input, bundle, invocations };
}
/** No injected provider, clock, callback, file reader, URL, or credential is accepted. */
export async function runLockedFakeEvaluation(value: unknown): Promise<LockedFakeRunReport> {
  try { return await execute(validateLockedFakeRunInput(value)); } catch { throw new TypeError(denial); }
}
/** Replays the fixed local fake execution before accepting deserialized evidence. */
export async function validateLockedFakeRunReport(value: unknown): Promise<LockedFakeRunReport> {
  try {
    const raw = object(value, ["runner_version", "scope", "timing", "output_hash_basis", "technical_image_gate_status", "live_evidence_present", "excluded_evidence", "input", "bundle", "invocations"]);
    const expected = await runLockedFakeEvaluation(raw.input); exact(value, expected); return copy(expected);
  } catch { throw new TypeError(denial); }
}
export async function serializeLockedFakeRunReport(value: unknown): Promise<string> {
  return canonicalEvaluationJson(await validateLockedFakeRunReport(value));
}
