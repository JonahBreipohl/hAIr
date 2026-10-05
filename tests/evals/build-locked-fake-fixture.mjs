// Synthetic metadata fixture builder. This never invokes an image or live provider.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const hash = (value) => createHash("sha256").update(canonical(value)).digest("hex");
const id = (prefix, number) => `${prefix}${number.toString(16).padStart(16, "0")}`;
const time = "2026-10-02T00:00:00.000Z";
const envelope = (number) => ({ schema_version: "1.0.0", protocol_id: "hair-eval-v1", run_id: id("run-", 1), record_id: id("record-", number), created_at_utc: time });
const registry = [];
const lock = (number, content) => { const artifact_id = id("artifact-", number); registry.push({ artifact_id, content }); return { artifact_id, content_sha256: hash(content) }; };
const fixed = { model_snapshot: "deterministic-v1", moderation_policy: "synthetic_no_media_v1", prompt_template: "synthetic_hair_v1", descriptor_conversion: "compiled_attributes_v1", preprocessing: "synthetic_metadata_only_v1", terms_snapshot: "synthetic_no_transfer_no_spend_v1" };
const fixedLocks = Object.fromEntries(Object.entries(fixed).map(([kind, value], index) => [kind, lock(100 + index, { kind, value })]));
const assets = [];
for (let index = 1; index <= 9; index++) {
  const content = { kind: "synthetic_asset", recipe: "opaque_metadata_v1", asset_id: id("ast_", index), role: index === 9 ? "style_reference" : "source_portrait", subject_id: index === 9 ? null : id("sub_", index), parent_asset_ids: [] };
  registry.push({ artifact_id: `artifact-${hash({ asset_id: content.asset_id }).slice(0, 16)}`, content });
  assets.push({ ...envelope(10 + index), asset_id: content.asset_id, role: content.role, subject_id: content.subject_id, content_sha256: hash(content), registry_manifest_sha256: hash({ kind: "synthetic_registry_manifest", content }), parent_asset_ids: [] });
}
const edits = { color: { baseColor: "brunette", tone: "cool" }, shorter: { lengthGoal: "shorter", silhouette: "chin-length bob" }, longer: { lengthGoal: "longer", silhouette: "shoulder length" }, fringe_part: { fringe: "soft fringe", part: "side" }, fade_taper: { lengthGoal: "shorter", fadeOrTaper: "low taper" }, layers_volume: { layers: "soft layers", volume: "moderate" }, multitone: { highlights: "subtle highlights" }, protective_texture: { texture: "protective", silhouette: "twists" } };
const scenarios = ["success", "partial", "policy_rejection", "timeout", "rate_limited", "provider_error", "timeout_then_success", "rate_limit_then_success"];
const configurations = scenarios.map((scenario, index) => ({
  ...envelope(30 + index), configuration_id: id("config-", index + 1), provider_id: id("provider-", 1), api_region: "local", ...fixedLocks,
  generation_parameters: lock(200 + index, { kind: "generation_parameters", scenario }), mask_strategy: "prompt_only", segmentation: null, dilation_px: 0, feather_px: 0, manual_mask_edit: false, protected_region_definition: null,
  output: { width_px: 512, height_px: 512, format: "png", quality: "medium", background: "opaque", compression_percent: 100 }, preview_count: 3, timeout_ms: 100, retry_policy: "transient_only", max_attempts: 2, concurrency: 1, idempotency: "one_key_per_attempt", seed: null, seed_unsupported: true, pricing_schedule_id: id("pricing-", 1), terms_snapshot_at_utc: time,
}));
const cases = Object.keys(edits).map((transformation, index) => {
  const specification = { lengthGoal: "same", silhouette: "", layers: "", part: "", fringe: "", texture: "same", volume: "", fadeOrTaper: "", baseColor: "", tone: "", highlights: "", finish: "", maintenanceTolerance: "medium", inspirationAttributes: "", ...edits[transformation], preserve: ["face", "skin", "background"] };
  const specification_sha256 = hash(specification); const source_asset_id = id("ast_", index + 1); const reference_asset_id = index % 2 === 0 ? id("ast_", 9) : null;
  return { ...envelope(50 + index), case_id: id("case-", index + 1), subject_id: id("sub_", index + 1), source_asset_id, reference_asset_id,
    specification: lock(300 + index, { kind: "specification", transformation, specification_sha256 }),
    prompt_inputs: lock(400 + index, { kind: "prompt_inputs", specification_sha256, source_asset_id, reference_asset_id, prompt_version: "synthetic_hair_v1", strategy: "prompt-only", quality: "medium" }), transformation,
    mask_inputs: [{ configuration_id: id("config-", index + 1), mask_asset_id: null, protected_region_asset_id: null }],
  };
});
const slots = cases.flatMap((item, index) => [0, 1, 2].map((variant_index) => ({ slot_id: id("slot-", index * 3 + variant_index + 1), case_id: item.case_id, configuration_id: id("config-", index + 1), repetition: 0, variant_index })));
const plan = { ...envelope(1), records_version: "hair-evaluation-records-v1", stage: "H0", code_revision_sha256: hash({ runner: "hair-locked-fake-runner-v2", provider: "deterministic-v1" }), assets, cases, configurations, slots };
writeFileSync(new URL("locked-fake-runner.fixture.json", import.meta.url), `${JSON.stringify({ plan, plan_sha256: hash(plan), registry }, null, 2)}\n`);
