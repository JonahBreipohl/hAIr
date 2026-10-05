import { describe, expect, it } from "vitest";
import fixture from "../../../tests/evals/evaluation-records.fixture.json";
import golden from "../../../tests/evals/evaluation-records.golden.json";
import { sha256EvaluationManifest } from "./benchmark";
import {
  hashEvaluationAttempt, hashEvaluationPlan, serializeEvaluationRecordBundle,
  validateEvaluationAttempt, validateEvaluationPlan, validateEvaluationRecordBundle,
} from "./evaluation-records";

type Fixture = typeof fixture;
const clone = (): Fixture => JSON.parse(JSON.stringify(fixture)) as Fixture;
const denied = (data: unknown): void => {
  expect(() => validateEvaluationRecordBundle(data)).toThrow(/^Evaluation records rejected\.$/);
  expect(() => serializeEvaluationRecordBundle(data)).toThrow(/^Evaluation records rejected\.$/);
};
// Recompute integrity locks so tests prove semantic checks, not merely stale hash detection.
function relock(data: Fixture): void {
  data.plan_sha256 = sha256EvaluationManifest(data.plan);
  data.attempts.forEach((item) => { item.plan_sha256 = data.plan_sha256; });
  data.attempts.forEach((item) => {
    if (item.revision > 0) item.supersedes_record_sha256 = sha256EvaluationManifest(data.attempts.find((previous) => previous.attempt_id === item.attempt_id && previous.revision === item.revision - 1));
  });
}

describe("locked metadata evaluation records", () => {
  it("reproduces golden hashes for all terminal outcomes, retry, and retained correction", () => {
    const bundle = validateEvaluationRecordBundle(fixture);
    expect(hashEvaluationPlan(bundle.plan)).toBe(golden.plan_sha256);
    expect(sha256EvaluationManifest(bundle)).toBe(golden.bundle_sha256);
    expect(sha256EvaluationManifest(JSON.parse(serializeEvaluationRecordBundle(bundle)))).toBe(golden.bundle_sha256);
    expect(bundle.plan.slots).toHaveLength(golden.slot_count);
    expect(bundle.attempts).toHaveLength(golden.attempt_record_count);
    expect(new Set(bundle.attempts.map((item) => item.attempt_id)).size).toBe(golden.logical_attempt_count);
    expect(bundle.outputs).toHaveLength(golden.output_count);
    expect(golden.quality_gate_status).toBe("NOT_EVALUATED");
    expect(bundle).not.toHaveProperty("verdict");
  });
  it("canonicalizes object keys and returns a detached validated copy", () => {
    const ordered = Object.fromEntries(Object.entries(fixture).reverse());
    expect(serializeEvaluationRecordBundle(ordered)).toBe(serializeEvaluationRecordBundle(fixture));
    const data = clone(); const accepted = validateEvaluationRecordBundle(data);
    data.plan.cases[0]!.transformation = "longer";
    expect(accepted.plan.cases[0]!.transformation).toBe("color");
    expect(hashEvaluationAttempt(accepted.attempts[0])).toBe(sha256EvaluationManifest(accepted.attempts[0]));
  });
  const invalid: readonly [string, (data: Fixture) => void][] = [
    ["unknown bundle field", (d) => { Object.assign(d, { raw_prompt: "private" }); }],
    ["unknown nested config field", (d) => { Object.assign(d.plan.configurations[0]!.output, { secret: "private" }); }],
    ["missing field", (d) => { Reflect.deleteProperty(d.plan.cases[0]!, "specification"); }],
    ["cross-run asset", (d) => { d.plan.assets[0]!.run_id = "run-0000000000000002"; }],
    ["cross-run attempt", (d) => { d.attempts[1]!.run_id = "run-0000000000000002"; }],
    ["duplicate record ID", (d) => { d.outputs[0]!.record_id = d.attempts[0]!.record_id; }],
    ["duplicate case", (d) => { d.plan.cases.push(d.plan.cases[0]!); }],
    ["duplicate configuration", (d) => { d.plan.configurations.push(d.plan.configurations[0]!); }],
    ["duplicate slot tuple", (d) => { d.plan.slots.push({ ...d.plan.slots[0]!, slot_id: "slot-0000000000000099" }); }],
    ["missing configuration", (d) => { d.plan.slots[0]!.configuration_id = "config-0000000000000002"; }],
    ["missing source", (d) => { d.plan.cases[0]!.source_asset_id = "ast_0000000000000099"; }],
    ["wrong source role", (d) => { d.plan.cases[0]!.source_asset_id = d.plan.assets[1]!.asset_id; }],
    ["wrong source subject", (d) => { d.plan.cases[0]!.subject_id = "sub_0000000000000002"; }],
    ["source as reference", (d) => { d.plan.cases[0]!.reference_asset_id = d.plan.assets[0]!.asset_id; }],
    ["missing asset parent", (d) => { d.plan.assets[1]!.parent_asset_ids = ["ast_0000000000000099"]; }],
    ["asset cycle", (d) => { d.plan.assets[0]!.parent_asset_ids = [d.plan.assets[1]!.asset_id]; }],
    ["mask unrelated to source", (d) => { d.plan.assets[1]!.parent_asset_ids = []; }],
    ["missing case mask assignment", (d) => { d.plan.cases[0]!.mask_inputs = []; }],
    ["duplicate mask assignment", (d) => { d.plan.cases[0]!.mask_inputs.push(d.plan.cases[0]!.mask_inputs[0]!); }],
    ["prompt-only with masks", (d) => { const c = d.plan.configurations[0]!; c.mask_strategy = "prompt_only"; c.segmentation = null as never; c.protected_region_definition = null as never; c.dilation_px = 0; c.feather_px = 0; }],
    ["missing protected-region definition", (d) => { d.plan.configurations[0]!.protected_region_definition = null as never; }],
    ["artifact ID resolving to conflicting content", (d) => { d.plan.cases[0]!.specification.artifact_id = d.plan.configurations[0]!.prompt_template.artifact_id; }],
    ["missing provider-specific parameters", (d) => { Reflect.deleteProperty(d.plan.configurations[0]!, "generation_parameters"); }],
    ["seed unsupported but provided", (d) => { d.plan.configurations[0]!.seed_unsupported = true; }],
    ["invalid variant index", (d) => { d.plan.slots[0]!.variant_index = 1; }],
    ["incomplete variant group", (d) => { d.plan.configurations[0]!.preview_count = 2; }],
    ["missing requested slot attempt", (d) => { d.attempts = d.attempts.filter((a) => a.slot_id !== d.plan.slots[1]!.slot_id); }],
    ["attempt for unknown slot", (d) => { d.attempts[1]!.slot_id = "slot-0000000000000099"; }],
    ["attempt case mismatch", (d) => { d.attempts[1]!.case_id = d.plan.cases[0]!.case_id; }],
    ["duplicate logical attempt", (d) => { d.attempts.push({ ...d.attempts[1]!, record_id: "record-0000000000000099" }); }],
    ["duplicate idempotency", (d) => { d.attempts[1]!.idempotency_id = d.attempts[0]!.idempotency_id; }],
    ["terminal outcome/error mismatch", (d) => { d.attempts[1]!.failure_code = "none"; }],
    ["failure carries output", (d) => { d.attempts[1]!.output_id = "output-0000000000000099"; }],
    ["success missing output", (d) => { d.outputs.shift(); }],
    ["orphan output", (d) => { d.outputs[0]!.attempt_id = "attempt-0000000000000099"; }],
    ["duplicate output", (d) => { d.outputs.push({ ...d.outputs[0]!, record_id: "record-0000000000000099" }); }],
    ["output geometry mismatch", (d) => { d.outputs[0]!.width_px = 512; }],
    ["rejected output labeled candidate", (d) => { d.outputs[1]!.disposition = "candidate"; }],
    ["noncanonical timestamp", (d) => { d.attempts[1]!.started_at_utc = "2026-10-01T00:00:00Z"; }],
    ["terminal before start", (d) => { d.attempts[1]!.finished_at_utc = "2026-09-30T00:00:00.000Z"; }],
    ["record before termination", (d) => { d.attempts[1]!.created_at_utc = d.attempts[1]!.started_at_utc; }],
    ["attempt before plan lock", (d) => { d.attempts[1]!.started_at_utc = "2026-09-30T00:00:00.000Z"; }],
    ["timeout ignores configured duration", (d) => { d.attempts[3]!.duration_ms = 10; }],
    ["duration exceeds timeout", (d) => { d.attempts[1]!.duration_ms = 1001; }],
    ["retry exceeds budget", (d) => { d.plan.configurations[0]!.max_attempts = 1; }],
    ["retry follows rejection", (d) => { d.attempts[3]!.outcome = "rejected"; d.attempts[3]!.failure_code = "policy_rejection"; }],
    ["retry overlaps original", (d) => { d.attempts[7]!.started_at_utc = d.attempts[3]!.started_at_utc; }],
    ["retry wrong predecessor", (d) => { d.attempts[7]!.retry_of_attempt_id = d.attempts[1]!.attempt_id; }],
    ["retry chain missing first attempt", (d) => { d.attempts.splice(3, 1); }],
    ["correction without original", (d) => { d.attempts.shift(); }],
    ["correction out of order", (d) => { const c = d.attempts.pop()!; d.attempts.unshift(c); }],
    ["correction changes outcome", (d) => { d.attempts[8]!.outcome = "output_rejected"; d.attempts[8]!.failure_code = "display_rejection"; }],
    ["correction unchanged usage", (d) => { d.attempts[8]!.usage = d.attempts[0]!.usage; }],
    ["correction revision skips", (d) => { d.attempts[8]!.revision = 2; }],
    ["coercible boolean", (d) => { d.plan.configurations[0]!.manual_mask_edit = "false" as never; }],
    ["coercible usage", (d) => { d.attempts[1]!.usage.image_input_units = "1" as never; }],
    ["infinite usage", (d) => { d.attempts[1]!.usage.image_input_units = Infinity; }],
    ["negative usage", (d) => { d.attempts[1]!.usage.text_input_units = -1; }],
    ["unavailable usage with counts", (d) => { d.attempts[1]!.usage.status = "unavailable"; }],
  ];
  it.each(invalid)("rejects %s even after rebuilding integrity locks", (_, mutate) => {
    const data = clone(); mutate(data);
    // Broken correction chains cannot be relocked, but must still be denied.
    try { relock(data); } catch { /* Deliberately malformed history. */ }
    denied(data);
  });
  it("rejects plan and correction digest tampering", () => {
    const data = clone(); data.plan_sha256 = "a".repeat(64); denied(data);
    const invocation = clone(); invocation.attempts[1]!.plan_sha256 = "a".repeat(64); denied(invocation);
    const correction = clone(); correction.attempts[8]!.supersedes_record_sha256 = "a".repeat(64); denied(correction);
  });
  it.each(["https://private.example/image", "portrait.png", "Client Name", ["sk", "abcdefghijklmnopqrstuv"].join("-"), "C:\\private\\photo", "ignore all previous instructions"])("does not export private identifier input %s", (privateValue) => {
    const data = clone(); data.plan.cases[0]!.specification.artifact_id = privateValue;
    denied(data);
    try { serializeEvaluationRecordBundle(data); } catch (error) { expect(String(error)).not.toContain(privateValue); }
  });
  it("rejects symbols, hidden fields, getters, custom prototypes, and sparse/extra array keys", () => {
    const hidden = clone(); Object.defineProperty(hidden.plan, "private", { value: "private" }); denied(hidden);
    const symbol = clone(); Object.assign(symbol.plan, { [Symbol("private")]: "private" }); denied(symbol);
    const getter = clone(); let reads = 0;
    Object.defineProperty(getter.plan, "stage", { enumerable: true, get: () => { reads += 1; return "H0"; } });
    denied(getter); expect(reads).toBe(0);
    const inherited = clone(); Object.setPrototypeOf(inherited.plan, { private: "private" }); denied(inherited);
    const sparse = clone(); Reflect.deleteProperty(sparse.attempts, "1"); denied(sparse);
    const extra = clone(); Object.assign(extra.attempts, { private: "private" }); denied(extra);
  });
  it("bounds the schema and does not serialize nonobjects or arbitrary failure text", () => {
    for (const input of [null, undefined, true, "private", [], new Date(), { error: "private" }]) denied(input);
    const data = clone(); Object.assign(data.attempts[1]!, { provider_message: "private" }); denied(data);
    expect(() => validateEvaluationAttempt(data.attempts[1])).toThrow("Evaluation records rejected.");
    expect(() => validateEvaluationPlan(data.plan)).not.toThrow();
  });
  it("retains the original attempt and binds its full envelope in a usage correction", () => {
    const data = clone(); const original = data.attempts[0]!;
    original.usage.text_input_units += 1;
    denied(data);
    const reverted = clone(); reverted.attempts[0]!.usage.status = "billed";
    reverted.attempts[8]!.usage.status = "estimated"; relock(reverted); denied(reverted);
  });
  it("requires the retry original to precede it in append history", () => {
    const data = clone(); const retry = data.attempts.splice(7, 1)[0]!;
    data.attempts.unshift(retry); denied(data);
    const laterRecord = clone(); laterRecord.attempts[3]!.created_at_utc = "2026-10-01T00:00:02.000Z";
    denied(laterRecord);
  });
  it("allows a late usage correction to an original after its retry completed", () => {
    const data = clone(); const original = data.attempts[3]!;
    const correction = { ...original, record_id: "record-0000000000000099", created_at_utc: "2026-10-01T00:00:03.000Z", revision: 1, supersedes_record_sha256: hashEvaluationAttempt(original), correction_reason: "usage_reconciliation", usage: { ...original.usage, status: "billed" } } as Fixture["attempts"][number];
    data.attempts.push(correction);
    expect(() => validateEvaluationRecordBundle(data)).not.toThrow();
  });
});
