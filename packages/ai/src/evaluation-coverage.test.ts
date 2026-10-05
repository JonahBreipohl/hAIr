import { describe, expect, it } from "vitest";
import golden from "../../../tests/evals/evaluation-coverage.golden.json";
import { sha256EvaluationManifest } from "./benchmark";
import { evaluateEvaluationCoverage, serializeEvaluationCoverageReport, validateEvaluationCoverageInput, coverageTransformations, coverageSecondaryTags, type EvaluationCoverageInput, type EvaluationCoverageReason } from "./evaluation-coverage";
import { buildCoverageFixture, relockCoverageFixture } from "./evaluation-coverage.test-fixtures";
import type { LockedEvaluationPlan } from "./evaluation-records";

type Mutable<T> = T extends readonly (infer R)[] ? Mutable<R>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
const stages = ["H0", "T0", "T1", "R0", "P1"] as const;
const fixtures = new Map(stages.map((stage) => [stage, buildCoverageFixture(stage)]));
const fixture = (stage: LockedEvaluationPlan["stage"]): Mutable<EvaluationCoverageInput> => JSON.parse(JSON.stringify(fixtures.get(stage))) as Mutable<EvaluationCoverageInput>;
function incomplete(input: EvaluationCoverageInput, reason: EvaluationCoverageReason): void {
  relockCoverageFixture(input); const report = evaluateEvaluationCoverage(input);
  expect(report.result.coverage_status).toBe("INCOMPLETE"); expect(report.result.findings).toContain(reason);
  expect(() => serializeEvaluationCoverageReport(report)).not.toThrow();
}
function denied(input: unknown): void { expect(() => evaluateEvaluationCoverage(input)).toThrow(/^Evaluation coverage rejected\.$/); }
function maskComparison(recipeChanged: boolean, masksChanged: boolean): Mutable<EvaluationCoverageInput> {
  const input = fixture("T1"); const configurations = input.plan.configurations;
  configurations[1]!.provider_id = configurations[0]!.provider_id;
  configurations.push({ ...configurations[1]!, record_id: "record-0000000000090000", configuration_id: "config-0000000000000003" });
  for (const slot of [...input.plan.slots]) if (slot.configuration_id === configurations[1]!.configuration_id) input.plan.slots.push({ ...slot, slot_id: `slot-${(1000 + input.plan.slots.length).toString(16).padStart(16, "0")}`, configuration_id: configurations[2]!.configuration_id });
  for (const config of configurations.slice(1)) { config.mask_strategy = "hair_mask"; config.segmentation = { artifact_id: "artifact-0000000000050000", content_sha256: "b".repeat(64) }; }
  if (recipeChanged) configurations[2]!.segmentation = { artifact_id: "artifact-0000000000050001", content_sha256: "c".repeat(64) };
  const masks = new Map<string, [string, string]>();
  for (const source of [...input.plan.assets].filter((asset) => asset.role === "source_portrait")) {
    const index = masks.size;
    const ids: [string, string] = [`ast_${(5000 + index).toString(16).padStart(16, "0")}`, `ast_${(6000 + index).toString(16).padStart(16, "0")}`]; masks.set(source.asset_id, ids);
    for (let variant = 0; variant < (masksChanged ? 2 : 1); variant++) input.plan.assets.push({ ...source, record_id: `record-${(95000 + index * 2 + variant).toString(16).padStart(16, "0")}`, asset_id: ids[variant]!, role: "mask", subject_id: null, content_sha256: sha256EvaluationManifest({ fixture_mask: source.asset_id, variant }), parent_asset_ids: [source.asset_id] });
  }
  for (const item of input.plan.cases) {
    const ids = masks.get(item.source_asset_id)!;
    item.mask_inputs[1]!.mask_asset_id = ids[0];
    item.mask_inputs.push({ configuration_id: configurations[2]!.configuration_id, mask_asset_id: ids[masksChanged ? 1 : 0], protected_region_asset_id: null });
  }
  input.preregistration.changed_factor = "mask_strategy"; relockCoverageFixture(input); return input;
}

describe("preregistered benchmark coverage", () => {
  it("keeps exported policy vocabularies immutable and rejects unsupported tags", () => {
    for (const policy of [coverageTransformations, coverageSecondaryTags]) {
      const before = [...policy];
      expect(Object.isFrozen(policy)).toBe(true);
      expect(() => (policy as unknown as string[]).push("unsupported")).toThrow(TypeError);
      expect(() => (policy as unknown as string[]).splice(0, 1)).toThrow(TypeError);
      expect(policy).toEqual(before);
    }
    const input = fixture("T1");
    (input.metadata[0]!.secondary_tags as string[]).push("unsupported");
    relockCoverageFixture(input);
    denied(input);
  });
  it.each(stages)("validates a complete synthetic %s shape without authorizing media", (stage) => {
    const report = evaluateEvaluationCoverage(fixtures.get(stage));
    expect(report.result.findings).toEqual([]);
    expect(report.result.coverage_status).toBe("COMPLETE_SYNTHETIC_METADATA");
    expect(report.result.declared_counts_status).toBe("COMPLETE");
    expect(report.result.media_authorization).toBe("NOT_EVALUATED");
    expect(report.result.image_quality_gate).toBe("NOT_EVALUATED");
    expect(JSON.parse(serializeEvaluationCoverageReport(report))).toEqual(report);
  });
  it("records deterministic fixture summary", () => {
    const evidence = { coverage_version: "hair-evaluation-coverage-v1", scope: "synthetic_fixture_count_evidence", image_quality_gate: "NOT_EVALUATED", stages: stages.map((stage) => { const report = evaluateEvaluationCoverage(fixtures.get(stage)); return { stage, input_sha256: report.result.input_sha256, result_sha256: sha256EvaluationManifest(report.result), subjects: report.result.primary_subject_count, cases: report.result.primary_case_count, slots: report.result.primary_slot_count, rerun_slots: report.result.reliability_rerun_slot_count, findings: report.result.findings }; }) };
    expect(evidence).toEqual(golden);
  });
  it("counts H0 cases independently from declared previews and repetitions", () => {
    const report = evaluateEvaluationCoverage(fixture("H0"));
    expect(report.result.primary_case_count).toBe(32); expect(report.result.primary_slot_count).toBe(192);
    const input = fixture("H0"); input.preregistration.h0_repetitions = 1;
    input.plan.slots = input.plan.slots.filter((s) => s.repetition === 0);
    relockCoverageFixture(input); expect(evaluateEvaluationCoverage(input).result.primary_slot_count).toBe(96);
    expect(evaluateEvaluationCoverage(input).result.findings).toEqual([]);
  });
  it("keeps the P1 primary denominator separate from the 24 reliability reruns", () => {
    const report = evaluateEvaluationCoverage(fixture("P1"));
    expect(report.result.primary_slot_count).toBe(720); expect(report.result.reliability_rerun_case_count).toBe(24); expect(report.result.reliability_rerun_slot_count).toBe(72);
    const input = fixture("P1"); input.plan.slots = input.plan.slots.filter((slot) => slot.repetition === 0);
    incomplete(input, "RERUN_COVERAGE");
  });
  it("detects a missing configuration repetition without dropping the other population", () => {
    const input = fixture("T1"); input.plan.slots = input.plan.slots.filter((slot) => !(slot.configuration_id === input.plan.configurations[1]!.configuration_id && slot.repetition === 1));
    incomplete(input, "REPETITION_OR_SLOT_COVERAGE");
  });
  it("explicit unsupported blocks reconcile but cannot waive required primary outputs", () => {
    const input = fixture("T1"); const first = input.plan.cases[0]!; const second = input.plan.configurations[1]!;
    input.plan.slots = input.plan.slots.filter((slot) => !(slot.case_id === first.case_id && slot.configuration_id === second.configuration_id));
    first.mask_inputs = first.mask_inputs.filter((m) => m.configuration_id !== second.configuration_id);
    input.preregistration.unsupported_blocks.push({ configuration_id: second.configuration_id, case_ids: [first.case_id], reason: "provider_strategy_unsupported", evidence: { artifact_id: "artifact-0000000000050000", content_sha256: "b".repeat(64) } });
    relockCoverageFixture(input); const result = evaluateEvaluationCoverage(input).result;
    expect(result.comparison_status).toBe("DECLARED_UNSUPPORTED"); expect(result.coverage_status).toBe("INCOMPLETE"); expect(result.findings).toContain("PRIMARY_SLOT_COUNT");
    expect(result.findings).not.toContain("COMPARISON_POPULATION");
  });
  it("does not accept a self-asserted physical waiver as resolved evidence", () => {
    const input = fixture("T1"); input.preregistration.physical_inapplicability.push({ dimension: "tone_band", cohort: "ST1", transformation: "color", evidence: { artifact_id: "artifact-0000000000050000", content_sha256: "a".repeat(64) } });
    incomplete(input, "PHYSICAL_RESTRICTION_UNRESOLVED");
  });
  it("requires T0 parent membership and bound case content", () => {
    const noParent = fixture("T0"); noParent.parent_plan = null; incomplete(noParent, "PARENT_CORPUS_MISSING");
    const changed = fixture("T0"); changed.plan.cases[0]!.specification = { artifact_id: "artifact-0000000000050000", content_sha256: "a".repeat(64) }; incomplete(changed, "PARENT_CASE_MISMATCH");
    const raw = fixture("T0"); raw.plan.assets[0]!.content_sha256 = "a".repeat(64); raw.metadata[0]!.content_sha256 = "a".repeat(64); incomplete(raw, "PARENT_CASE_MISMATCH");
  });
  it("requires R0 sentinel parent reference and prompt content, not IDs alone", () => {
    const input = fixture("R0"); input.plan.cases[0]!.prompt_inputs = { artifact_id: "artifact-0000000000050000", content_sha256: "a".repeat(64) }; incomplete(input, "PARENT_CASE_MISMATCH");
    const reference = fixture("R0"); const id = reference.plan.cases.find((c) => c.reference_asset_id !== null)!.reference_asset_id!;
    reference.plan.assets.find((a) => a.asset_id === id)!.content_sha256 = "a".repeat(64); incomplete(reference, "PARENT_CASE_MISMATCH");
  });
  it("locks annotations and parent manifests into the preregistration", () => {
    const changed = fixture("T1"); changed.metadata[0]!.tone_band = "ST6"; denied(changed);
    const relabeled = fixture("T1"); relabeled.metadata[0]!.tone_band = "ST6"; const { annotation_artifact: annotation, ...payload } = relabeled.metadata[0]!; annotation.content_sha256 = sha256EvaluationManifest(payload); denied(relabeled);
    const parent = fixture("T0"); parent.parent_plan!.cases[0]!.specification.content_sha256 = "b".repeat(64); denied(parent);
  });
  it("denies duplicate portrait bytes inflating distinct subjects after all locks are rebuilt", () => {
    const input = fixture("T1"); input.plan.assets[1]!.content_sha256 = input.plan.assets[0]!.content_sha256; input.metadata[1]!.content_sha256 = input.metadata[0]!.content_sha256;
    incomplete(input, "DUPLICATE_SUBJECT_CONTENT");
  });
  it("requires distinct two-spec classes for T0 too", () => {
    const input = fixture("T0"); input.plan.cases[1]!.transformation = input.plan.cases[0]!.transformation;
    incomplete(input, "SUBJECT_CASE_ALLOCATION");
  });
  it("keeps real unverified metadata INCOMPLETE even with complete declared counts", () => {
    const input = fixture("T1"); input.metadata.forEach((m) => { m.authority = "unverified_registry_projection"; m.provenance = "explicitly_consented_adult"; m.adult_status = "verified_adult"; m.tone_assignment = "participant_confirmed"; m.texture_assignment = "participant_confirmed"; });
    relockCoverageFixture(input); const result = evaluateEvaluationCoverage(input).result;
    expect(result.declared_counts_status).toBe("COMPLETE"); expect(result.coverage_status).toBe("INCOMPLETE"); expect(result.findings).toEqual(["METADATA_AUTHORITY_UNVERIFIED"]);
  });
  it("does not accept synthetic assignment methods for real core projections", () => {
    const input = fixture("T1"); input.metadata.forEach((m) => { m.authority = "unverified_registry_projection"; m.provenance = "explicitly_consented_adult"; m.adult_status = "verified_adult"; });
    incomplete(input, "COHORT_LABELS_MISSING");
  });
  it("rejects missing labels, missing/broken source binding, and obscured texture guessing", () => {
    const absent = fixture("T1"); absent.metadata.shift(); incomplete(absent, "METADATA_MISSING");
    const invalid = fixture("T1"); invalid.metadata[0]!.registry_manifest_sha256 = "a".repeat(64); incomplete(invalid, "METADATA_BINDING_MISMATCH");
    const missing = fixture("T1"); missing.metadata[0]!.tone_band = null; incomplete(missing, "COHORT_LABELS_MISSING");
    const guessed = fixture("P1"); guessed.metadata[0]!.texture_assignment = "trained_steward"; incomplete(guessed, "OBSCURED_TEXTURE_UNCONFIRMED");
  });
  it("does not triple-count overlapping lighting annotations or repeated source assets", () => {
    const input = fixture("P1"); const report = evaluateEvaluationCoverage(input);
    expect(report.result.secondary_subject_counts.mixed_or_nonstudio_lighting).toBe(60);
    input.metadata[0]!.secondary_tags.push("mixed_or_nonstudio_lighting"); denied(input);
    expect(report.result.primary_subject_count).toBe(120);
  });
  it("cannot hide absent transformation/reference or secondary coverage under totals", () => {
    const classChange = fixture("T1"); classChange.plan.cases[0]!.transformation = "protective_texture"; incomplete(classChange, "TRANSFORMATION_ALLOCATION");
    const labels = fixture("P1"); labels.metadata.forEach((m) => { m.secondary_tags = m.secondary_tags.filter((tag) => tag !== "gray_or_white"); }); incomplete(labels, "SECONDARY_COVERAGE");
    const cell = fixture("T1"); cell.metadata.forEach((m) => { if (m.tone_band === "ST6") m.tone_band = "ST5"; }); incomplete(cell, "COHORT_CELL_ALLOCATION");
  });
  it("requires stratified reruns, rather than arbitrary 24-case duplicates", () => {
    const input = fixture("P1"); const earlier = new Set(input.preregistration.reliability_rerun_case_ids);
    input.preregistration.reliability_rerun_case_ids = input.plan.cases.slice(0, 24).map((c) => c.case_id);
    input.plan.slots = input.plan.slots.filter((slot) => slot.repetition === 0);
    for (const slot of [...input.plan.slots]) if (input.preregistration.reliability_rerun_case_ids.includes(slot.case_id)) input.plan.slots.push({ ...slot, slot_id: `slot-${(10000 + input.plan.slots.length).toString(16).padStart(16, "0")}`, repetition: 1 });
    expect(earlier.size).toBe(24); incomplete(input, "RERUN_COVERAGE");
  });
  it("checks named-factor confounding, preprocessing, output resolution and masks", () => {
    const confounded = fixture("T1"); confounded.plan.configurations[1]!.output.quality = "high"; incomplete(confounded, "COMPARISON_FACTOR");
    const pre = fixture("T1"); pre.preregistration.comparison = "bundled_configuration"; pre.plan.configurations[1]!.preprocessing = { artifact_id: "artifact-0000000000050000", content_sha256: "a".repeat(64) }; incomplete(pre, "COMPARISON_INPUTS");
    const size = fixture("T1"); size.preregistration.comparison = "bundled_configuration"; size.plan.configurations[1]!.output.width_px = 512; incomplete(size, "COMPARISON_INPUTS");
  });
  it("bounds declared H0 expansion before generating impossible slot tuples", () => {
    const input = fixture("H0"); input.preregistration.h0_repetitions = 1000;
    incomplete(input, "REPETITION_OR_SLOT_COVERAGE");
  });
  it("does not deduct nonexistent unsupported case tuples to evade the expansion bound", () => {
    const input = fixture("H0"); input.preregistration.h0_repetitions = 1000;
    const invented = Array.from({ length: 32 }, (_, index) => `case-${(1000 + index).toString(16).padStart(16, "0")}`);
    input.preregistration.primary_case_ids.push(...invented);
    input.preregistration.unsupported_blocks.push({ configuration_id: input.plan.configurations[0]!.configuration_id, case_ids: invented, reason: "provider_strategy_unsupported", evidence: { artifact_id: "artifact-0000000000050000", content_sha256: "a".repeat(64) } });
    incomplete(input, "REPETITION_OR_SLOT_COVERAGE");
  });
  it("requires both input modes in the stratified P1 reliability rerun sample", () => {
    const input = fixture("P1"); const candidates = input.plan.cases.filter((item) => item.reference_asset_id !== null);
    const metadata = new Map(input.metadata.map((item) => [item.subject_id, item]));
    const cellOf = (item: typeof candidates[number]): string => { const labels = metadata.get(item.subject_id)!; return `${labels.tone_band}|${labels.texture_group}`; };
    const selected = [...new Set(candidates.map(cellOf))].map((cell) => candidates.find((item) => cellOf(item) === cell)!);
    for (const type of new Set(input.plan.cases.map((item) => item.transformation))) if (!selected.some((item) => item.transformation === type)) {
      const replacement = candidates.find((candidate) => candidate.transformation === type && selected.filter((item) => item.transformation === selected.find((item) => cellOf(item) === cellOf(candidate))!.transformation).length > 1)!;
      expect(replacement).toBeDefined(); selected[selected.findIndex((item) => cellOf(item) === cellOf(replacement))] = replacement;
    }
    expect(new Set(selected.map((item) => item.transformation)).size).toBe(8);
    input.preregistration.reliability_rerun_case_ids = selected.map((item) => item.case_id);
    input.plan.slots = input.plan.slots.filter((slot) => slot.repetition === 0);
    for (const slot of [...input.plan.slots]) if (input.preregistration.reliability_rerun_case_ids.includes(slot.case_id)) input.plan.slots.push({ ...slot, slot_id: `slot-${(10000 + input.plan.slots.length).toString(16).padStart(16, "0")}`, repetition: 1 });
    relockCoverageFixture(input); const result = evaluateEvaluationCoverage(input).result;
    expect(result.findings).toEqual(["RERUN_COVERAGE"]); expect(result.coverage_status).toBe("INCOMPLETE");
  });
  it("checks all same-recipe mask peers, including B/C after a prompt-only A", () => {
    incomplete(maskComparison(false, true), "COMPARISON_INPUTS");
  });
  it("allows a declared mask recipe/version change to use its separately derived mask", () => {
    const result = evaluateEvaluationCoverage(maskComparison(true, true)).result;
    expect(result.findings).toEqual([]); expect(result.coverage_status).toBe("COMPLETE_SYNTHETIC_METADATA");
    expect(evaluateEvaluationCoverage(maskComparison(false, false)).result.findings).toEqual([]);
  });
  it("revalidates reports, rejecting invented count/gate results", () => {
    const report = evaluateEvaluationCoverage(fixture("P1"));
    Object.assign(report.result, { image_quality_gate: "PASS" }); expect(() => serializeEvaluationCoverageReport(report)).toThrow("Evaluation coverage rejected.");
    const changed = evaluateEvaluationCoverage(fixture("T1")); Object.assign(changed.result, { primary_subject_count: 120 }); expect(() => serializeEvaluationCoverageReport(changed)).toThrow("Evaluation coverage rejected.");
  });
  it("uses generic denials for exact schemas, private text, getters and inherited/sparse fields", () => {
    for (const privateValue of ["Client Name", "photo.png", "https://private.example/photo", ["sk", "abcdefghijklmnopqrstuv"].join("-")]) {
      const input = fixture("T1"); Object.assign(input.metadata[0]!, { raw_prompt: privateValue }); denied(input);
      try { validateEvaluationCoverageInput(input); } catch (error) { expect(String(error)).not.toContain(privateValue); }
    }
    const sparse = fixture("T1"); Reflect.deleteProperty(sparse.metadata, "0"); denied(sparse);
    const secret = fixture("T1"); Object.defineProperty(secret.preregistration, "private", { value: "private" }); denied(secret);
    const getter = fixture("T1"); let reads = 0; Object.defineProperty(getter.metadata[0]!, "tone_band", { enumerable: true, get: () => { reads++; return "ST1"; } }); denied(getter); expect(reads).toBe(0);
    const prototype = fixture("T1"); Object.setPrototypeOf(prototype.preregistration, { private: "private" }); denied(prototype);
    const coerced = fixture("T1"); Object.assign(coerced.metadata[0]!, { texture_obscured: "false" }); denied(coerced);
    const future = fixture("T1"); future.preregistration.created_at_utc = "2026-10-03T00:00:00.000Z"; denied(future);
  });
});
