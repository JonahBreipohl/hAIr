import { defaultHairSpecification } from "@hair/domain";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../tests/evals/locked-fake-runner.fixture.json";
import golden from "../../../tests/evals/locked-fake-runner.golden.json";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import { FakeHairstyleImageProvider } from "./fake-provider";
import { HairstyleProviderError } from "./provider";
import { runLockedFakeEvaluation, serializeLockedFakeRunReport, validateLockedFakeRunInput, validateLockedFakeRunReport } from "./locked-fake-runner";

const clone = (): typeof fixture => JSON.parse(JSON.stringify(fixture)) as typeof fixture;
function relock(input: typeof fixture): void { input.plan_sha256 = sha256EvaluationManifest(input.plan); }
function relockRegistry(input: typeof fixture, artifactId: string): void {
  const entry = input.registry.find((entry) => entry.artifact_id === artifactId)!;
  const contentHash = sha256EvaluationManifest(entry.content);
  for (const item of [...input.plan.cases, ...input.plan.configurations]) for (const value of Object.values(item)) {
    if (value && typeof value === "object" && "artifact_id" in value && value.artifact_id === artifactId && "content_sha256" in value) value.content_sha256 = contentHash;
  }
  relock(input);
}
afterEach(() => vi.restoreAllMocks());

describe("locked executable synthetic fake runner", () => {
  it("executes case blocks in protocol priority order after valid plan arrays are reordered", async () => {
    const input = clone();
    const firstCase = input.plan.cases[0]!; const secondConfig = input.plan.configurations[1]!;
    firstCase.mask_inputs.push({configuration_id:secondConfig.configuration_id,mask_asset_id:null,protected_region_asset_id:null});
    input.plan.slots.push(...[0,1,2].map(variant_index => ({slot_id:`slot-${(100 + variant_index).toString(16).padStart(16,"0")}`,case_id:firstCase.case_id,configuration_id:secondConfig.configuration_id,repetition:1,variant_index})));
    input.plan.cases.reverse(); input.plan.configurations.reverse(); input.plan.slots.reverse(); relock(input);
    const priority = (slot: typeof input.plan.slots[number]) => createHash("sha256")
      .update([input.plan.protocol_id, input.plan.run_id, slot.case_id, slot.configuration_id, slot.repetition].join("|")).digest("hex");
    const expectedSlots = [...input.plan.slots].sort((a,b) => a.case_id.localeCompare(b.case_id) || priority(a).localeCompare(priority(b)) || a.configuration_id.localeCompare(b.configuration_id) || a.repetition - b.repetition || a.variant_index - b.variant_index || a.slot_id.localeCompare(b.slot_id));
    const spy = vi.spyOn(FakeHairstyleImageProvider.prototype, "edit");
    const report = await runLockedFakeEvaluation(input);
    expect(report.bundle.attempts.filter(attempt => attempt.attempt_index === 1).map(attempt => attempt.slot_id)).toEqual(expectedSlots.map(slot => slot.slot_id));
    expect(spy.mock.calls.map(([request]) => request.requestId)).toEqual(report.bundle.attempts.map(attempt => attempt.attempt_id));
    expect(report.bundle.attempts.every(attempt => attempt.plan_sha256 === input.plan_sha256)).toBe(true);
    for (let index = 1; index < report.bundle.attempts.length; index++) {
      const attempt = report.bundle.attempts[index]!;
      if (attempt.attempt_index > 1) expect(report.bundle.attempts[index - 1]!.slot_id).toBe(attempt.slot_id);
    }
  });
  it("rejects obsolete runner versions and simulation locks before executing them", async () => {
    const input = clone();
    input.plan.code_revision_sha256 = sha256EvaluationManifest({runner: "hair-locked-fake-runner-v1", provider: "deterministic-v1"}); relock(input);
    const spy = vi.spyOn(FakeHairstyleImageProvider.prototype, "edit");
    await expect(runLockedFakeEvaluation(input)).rejects.toThrow(/^Locked fake run rejected\.$/);
    expect(spy).not.toHaveBeenCalled();
  });
  it("executes every locked slot and retains all failed/retried calls reproducibly", async () => {
    const spy = vi.spyOn(FakeHairstyleImageProvider.prototype, "edit");
    const report = await runLockedFakeEvaluation(fixture);
    expect(report.bundle.plan.slots).toHaveLength(24);
    expect(report.bundle.attempts).toHaveLength(40);
    expect(report.bundle.outputs).toHaveLength(11);
    expect(report.invocations).toHaveLength(40);
    expect(spy).toHaveBeenCalledTimes(40);
    expect(report.bundle.attempts.filter((item) => item.attempt_index === 2)).toHaveLength(16);
    expect(new Set(report.bundle.attempts.map((item) => item.slot_id)).size).toBe(24);
    expect(new Set(report.bundle.attempts.map((item) => item.idempotency_id)).size).toBe(40);
    expect(report.bundle.attempts.map((item) => item.outcome)).toContain("timed_out");
    expect(report.bundle.attempts.map((item) => item.outcome)).toContain("rejected");
    expect(await runLockedFakeEvaluation(fixture)).toEqual(report);
    expect(await validateLockedFakeRunReport(report)).toEqual(report);
    expect(await serializeLockedFakeRunReport(report)).toBe(canonicalEvaluationJson(report));
    expect(report.technical_image_gate_status).toBe("NOT_EVALUATED");
    expect(report.timing).toBe("virtual_serial");
    expect(report.output_hash_basis).toBe("synthetic_metadata_not_image_bytes");
    expect(report).not.toHaveProperty("verdict");
    expect(sha256EvaluationManifest(report.input)).toBe(golden.input_sha256);
    expect(report.bundle.plan_sha256).toBe(golden.plan_sha256);
    expect(sha256EvaluationManifest(report.bundle)).toBe(golden.bundle_sha256);
    expect(sha256EvaluationManifest(report)).toBe(golden.report_sha256);
    expect(Object.fromEntries(Object.keys(golden.outcomes).map((outcome) => [outcome, report.bundle.attempts.filter((item) => item.outcome === outcome).length]))).toEqual(golden.outcomes);
  });
  const invalid: readonly [string, (input: typeof fixture) => void][] = [
    ["missing registry artifact", (input) => { input.registry.pop(); }],
    ["duplicate registry artifact", (input) => { input.registry.push(input.registry[0]!); }],
    ["unused registry artifact", (input) => { input.registry.push({ ...input.registry[0]!, artifact_id: "artifact-eeeeeeeeeeeeeeee" }); }],
    ["artifact hash drift", (input) => { input.plan.cases[0]!.specification.content_sha256 = "e".repeat(64); relock(input); }],
    ["registry content drift", (input) => { Object.assign(input.registry.find((item) => item.content.kind === "specification")!.content, { transformation: "longer" }); }],
    ["unknown top-level field", (input) => { Object.assign(input, { provider: () => undefined }); }],
    ["unknown private content field", (input) => { Object.assign(input.registry[0]!.content, { raw_prompt: "private" }); }],
    ["real-media recipe", (input) => { Object.assign(input.registry.find((item) => item.content.kind === "synthetic_asset")!.content, { recipe: "portrait_bytes_v1" }); }],
    ["non-H0 stage", (input) => { input.plan.stage = "T1"; relock(input); }],
    ["unverified code revision", (input) => { input.plan.code_revision_sha256 = "e".repeat(64); relock(input); }],
    ["unsupported region", (input) => { input.plan.configurations[0]!.api_region = "us"; relock(input); }],
    ["unsupported provider", (input) => { input.plan.configurations[0]!.provider_id = "provider-eeeeeeeeeeeeeeee"; relock(input); }],
    ["unsupported pricing identity", (input) => { input.plan.configurations[0]!.pricing_schedule_id = "pricing-eeeeeeeeeeeeeeee"; relock(input); }],
    ["unsupported geometry", (input) => { input.plan.configurations[0]!.output.width_px = 1024; relock(input); }],
    ["unsupported format", (input) => { input.plan.configurations[0]!.output.format = "webp"; relock(input); }],
    ["unsupported quality", (input) => { input.plan.configurations[0]!.output.quality = "high"; relock(input); }],
    ["unsupported background", (input) => { input.plan.configurations[0]!.output.background = "transparent"; relock(input); }],
    ["unsupported compression", (input) => { input.plan.configurations[0]!.output.compression_percent = 90; relock(input); }],
    ["unsupported concurrency", (input) => { input.plan.configurations[0]!.concurrency = 2; relock(input); }],
    ["unsupported seed", (input) => { input.plan.configurations[0]!.seed_unsupported = false; Object.assign(input.plan.configurations[0]!, { seed: 1 }); relock(input); }],
    ["unsupported timeout", (input) => { input.plan.configurations[0]!.timeout_ms = 200; relock(input); }],
    ["unsupported retry budget", (input) => { input.plan.configurations[0]!.max_attempts = 3; relock(input); }],
    ["unsupported terms date", (input) => { input.plan.configurations[0]!.terms_snapshot_at_utc = "2026-10-01T00:00:00.000Z"; relock(input); }],
    ["compiled specification hash mismatch with fresh lock", (input) => { const entry = input.registry.find((item) => item.content.kind === "specification")!; Object.assign(entry.content, { specification_sha256: "e".repeat(64) }); relockRegistry(input, entry.artifact_id); }],
    ["wrong prompt source with fresh lock", (input) => { const entry = input.registry.find((item) => item.content.kind === "prompt_inputs")!; Object.assign(entry.content, { source_asset_id: "ast_0000000000000002" }); relockRegistry(input, entry.artifact_id); }],
    ["arbitrary model with fresh lock", (input) => { const entry = input.registry.find((item) => item.content.kind === "model_snapshot")!; Object.assign(entry.content, { value: "another-model" }); relockRegistry(input, entry.artifact_id); }],
    ["unsupported scenario with fresh lock", (input) => { const entry = input.registry.find((item) => item.content.kind === "generation_parameters")!; Object.assign(entry.content, { scenario: "live" }); relockRegistry(input, entry.artifact_id); }],
    ["wrong registry manifest", (input) => { input.plan.assets[0]!.registry_manifest_sha256 = "e".repeat(64); relock(input); }],
  ];
  it.each(invalid)("denies %s before any fake call", async (_name, mutate) => {
    const input = clone(); mutate(input); const spy = vi.spyOn(FakeHairstyleImageProvider.prototype, "edit");
    expect(() => validateLockedFakeRunInput(input)).toThrow(/^Locked fake run rejected\.$/);
    await expect(runLockedFakeEvaluation(input)).rejects.toThrow(/^Locked fake run rejected\.$/);
    expect(spy).not.toHaveBeenCalled();
  });
  it("does not read input getters or coerce artifact enum objects", async () => {
    const input = clone(); let reads = 0;
    Object.defineProperty(input.registry[0]!, "content", { enumerable: true, get: () => { reads++; return {}; } });
    await expect(runLockedFakeEvaluation(input)).rejects.toThrow(/^Locked fake run rejected\.$/); expect(reads).toBe(0);
    const other = clone(); let coercions = 0;
    Object.assign(other.registry.find((item) => item.content.kind === "specification")!.content, { transformation: { toString: () => { coercions++; return "color"; } } });
    await expect(runLockedFakeEvaluation(other)).rejects.toThrow(/^Locked fake run rejected\.$/); expect(coercions).toBe(0);
  });
  it("rejects hidden fields, symbols, custom prototypes, sparse and extra-key arrays", async () => {
    const malformed: unknown[] = [null, [], new Date(), Object.assign(Object.create({}), fixture)];
    const symbol = clone(); Object.assign(symbol, { [Symbol("private")]: true }); malformed.push(symbol);
    const hidden = clone(); Object.defineProperty(hidden, "private", { value: "private" }); malformed.push(hidden);
    const sparse = clone(); Reflect.deleteProperty(sparse.registry, "0"); malformed.push(sparse);
    const extra = clone(); Object.assign(extra.registry, { private: "private" }); malformed.push(extra);
    for (const input of malformed) await expect(runLockedFakeEvaluation(input)).rejects.toThrow(/^Locked fake run rejected\.$/);
  });
  it("pins compiled inputs despite domain defaults changing between calls", async () => {
    const baseline = await runLockedFakeEvaluation(fixture); const original = FakeHairstyleImageProvider.prototype.edit; const defaults = defaultHairSpecification as unknown as { finish: string }; const prior = defaults.finish;
    try {
      let calls = 0;
      vi.spyOn(FakeHairstyleImageProvider.prototype, "edit").mockImplementation(async function (this: FakeHairstyleImageProvider, request) { calls++; if (calls === 1) defaults.finish = "changed externally"; expect(request.specification.finish).toBe(prior); expect(Object.isFrozen(request)).toBe(true); expect(Object.isFrozen(request.specification.preserve)).toBe(true); return original.call(this, request); });
      expect(await runLockedFakeEvaluation(fixture)).toEqual(baseline);
    } finally { defaults.finish = prior; }
  });
  it("prevents provider-side request mutation across the await boundary", async () => {
    const baseline = await runLockedFakeEvaluation(fixture); const original = FakeHairstyleImageProvider.prototype.edit;
    vi.spyOn(FakeHairstyleImageProvider.prototype, "edit").mockImplementation(async function (this: FakeHairstyleImageProvider, request) {
      expect(Reflect.set(request, "sourceAssetId", "ast_eeeeeeeeeeeeeeee")).toBe(false);
      expect(Reflect.set(request.specification, "finish", "changed")).toBe(false);
      expect(Reflect.set(request.specification.preserve, "0", "changed")).toBe(false);
      return original.call(this, request);
    });
    expect(await runLockedFakeEvaluation(fixture)).toEqual(baseline);
  });
  it.each(["extra", "correlation", "provider", "model", "duration", "usage", "provenance", "output", "wrong_scenario"])("denies malformed internal response %s without exporting it", async (kind) => {
    const original = FakeHairstyleImageProvider.prototype.edit;
    vi.spyOn(FakeHairstyleImageProvider.prototype, "edit").mockImplementation(async function (this: FakeHairstyleImageProvider, request) {
      const result = await original.call(this, request);
      const changes: Record<string, unknown> = { extra: { raw_prompt: "private" }, correlation: { requestId: "private" }, provider: { provider: "live" }, model: { model: "other" }, duration: { durationMs: 50 }, usage: { usage: { ...result.usage, imageInputUnits: 99 } }, provenance: { provenance: "provider" }, output: { outputAssetId: "private" } };
      if (kind === "wrong_scenario") throw new HairstyleProviderError("private", "provider_error", true);
      return Object.assign({}, result, changes[kind]);
    });
    await expect(runLockedFakeEvaluation(fixture)).rejects.toThrow(/^Locked fake run rejected\.$/);
  });
  it("denies nonprovider errors, malformed failure codes and failure getters", async () => {
    const errors: unknown[] = [new Error("private"), new HairstyleProviderError("private", "policy_rejection", false)];
    const getter = new HairstyleProviderError("private", "timeout", true); let reads = 0; Object.defineProperty(getter, "code", { get: () => { reads++; return "timeout"; } }); errors.push(getter);
    for (const error of errors) { vi.spyOn(FakeHairstyleImageProvider.prototype, "edit").mockRejectedValue(error); await expect(runLockedFakeEvaluation(fixture)).rejects.toThrow(/^Locked fake run rejected\.$/); vi.restoreAllMocks(); }
    expect(reads).toBe(0);
  });
  it.each(["attempt", "output", "receipt", "flag", "private", "input"])("rejects modified or static report %s through replay before serialization", async (kind) => {
    const report = await runLockedFakeEvaluation(fixture);
    if (kind === "attempt") Object.assign(report.bundle.attempts[0]!, { duration_ms: 24 });
    if (kind === "output") Object.assign(report.bundle.outputs[0]!, { content_sha256: "e".repeat(64) });
    if (kind === "receipt") Object.assign(report.invocations[0]!, { request_sha256: "e".repeat(64) });
    if (kind === "flag") Object.assign(report, { live_evidence_present: true });
    if (kind === "private") Object.assign(report.bundle.attempts[0]!, { raw_prompt: "private" });
    if (kind === "input") Object.assign(report.input, { credential: "private" });
    await expect(validateLockedFakeRunReport(report)).rejects.toThrow(/^Locked fake run rejected\.$/);
    await expect(serializeLockedFakeRunReport(report)).rejects.toThrow(/^Locked fake run rejected\.$/);
  });
});
