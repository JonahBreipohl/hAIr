import base from "../../../tests/evals/evaluation-records.fixture.json";
import { sha256EvaluationManifest } from "./benchmark";
import { coverageTransformations, evaluationCoverageVersion, type CoverageMetadata, type EvaluationCoverageInput } from "./evaluation-coverage";
import { hashEvaluationPlan, type LockedEvaluationPlan } from "./evaluation-records";

const uid = (prefix: string, value: number): string => `${prefix}${value.toString(16).padStart(16, "0")}`;
const digest = (value: unknown): string => sha256EvaluationManifest(value);
const artifact = (value: number): { artifact_id: string; content_sha256: string } => ({ artifact_id: uid("artifact-", value), content_sha256: digest({ synthetic_artifact: value }) });
const time = "2026-10-02T00:00:00.000Z";
const envelope = (run: string, value: number): { schema_version: "1.0.0"; protocol_id: "hair-eval-v1"; run_id: string; record_id: string; created_at_utc: string } => ({ schema_version: "1.0.0", protocol_id: "hair-eval-v1", run_id: run, record_id: uid("record-", value), created_at_utc: time });
type Subject = { tone: number; texture: number; sample: number };

/** Independently verified seeded quota allocation; no actual persons or media. */
function allocate(stage: "T1" | "P1"): { subjects: Subject[]; classes: number[]; references: Set<number>; reruns: Set<number> } {
  const subjects: Subject[] = [];
  for (let tone = 0; tone < 6; tone++) for (let texture = 0; texture < 4; texture++) for (let sample = 0; sample < (stage === "P1" ? 5 : 1); sample++) subjects.push({ tone, texture, sample });
  if (stage === "T1") for (let tone = 0; tone < 6; tone++) for (let j = 0; j < 2; j++) subjects.push({ tone, texture: (tone + 2 * j) % 4, sample: 1 });
  const quotas = stage === "T1" ? [9, 9, 9, 8, 8, 9, 9, 11] : [30, 30, 30, 24, 24, 30, 30, 42];
  const classes = quotas.flatMap((count, type) => Array<number>(count).fill(type));
  let seed = stage === "T1" ? 711 : 712;
  const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = classes.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [classes[i], classes[j]] = [classes[j]!, classes[i]!]; }
  const penalty = (): number => {
    let score = subjects.filter((_, index) => classes[index * 2] === classes[index * 2 + 1]).length * 5;
    for (const dimension of ["tone", "texture"] as const) for (let cohort = 0; cohort < (dimension === "tone" ? 6 : 4); cohort++) {
      const found = new Set<number>(); subjects.forEach((subject, i) => { if (subject[dimension] === cohort) { found.add(classes[i * 2]!); found.add(classes[i * 2 + 1]!); } }); score += 8 - found.size;
    }
    return score;
  };
  let score = penalty();
  for (let iteration = 0; score > 0 && iteration < 2000000; iteration++) {
    const i = Math.floor(random() * classes.length), j = Math.floor(random() * classes.length);
    [classes[i], classes[j]] = [classes[j]!, classes[i]!]; const candidate = penalty();
    const temperature = 0.25 + 0.75 * (1 - iteration / 2000000);
    if (candidate < score || random() < Math.exp((score - candidate) / temperature)) score = candidate;
    else [classes[i], classes[j]] = [classes[j]!, classes[i]!];
  }
  if (score !== 0) throw new TypeError("Synthetic allocation failed.");
  const select = (bucket: (index: number) => number, capacities: number[], perCell: number): Set<number> => {
    interface Edge { to: number; capacity: number; reverse: number }
    const caseOffset = 1 + capacities.length, cellOffset = caseOffset + classes.length, sink = cellOffset + 24;
    const edges: Edge[][] = Array.from({ length: sink + 1 }, () => []);
    const add = (from: number, to: number, capacity: number): Edge => {
      const edge = { to, capacity, reverse: edges[to]!.length };
      edges[from]!.push(edge); edges[to]!.push({ to: from, capacity: 0, reverse: edges[from]!.length - 1 }); return edge;
    };
    capacities.forEach((capacity, index) => add(0, index + 1, capacity));
    const selected: Edge[] = [];
    classes.forEach((_, index) => { add(bucket(index) + 1, caseOffset + index, 1); const subject = subjects[Math.floor(index / 2)]!; selected.push(add(caseOffset + index, cellOffset + subject.tone * 4 + subject.texture, 1)); });
    for (let cell = 0; cell < 24; cell++) add(cellOffset + cell, sink, perCell);
    let flow = 0;
    while (true) {
      const parents: ({ from: number; index: number } | undefined)[] = Array(edges.length); const queue = [0]; parents[0] = { from: -1, index: -1 };
      for (let head = 0; head < queue.length && !parents[sink]; head++) {
        const from = queue[head]!; edges[from]!.forEach((edge, index) => { if (edge.capacity > 0 && !parents[edge.to]) { parents[edge.to] = { from, index }; queue.push(edge.to); } });
      }
      if (!parents[sink]) break;
      for (let node = sink; node !== 0;) { const parent = parents[node]!; const edge = edges[parent.from]![parent.index]!; edge.capacity--; edges[node]![edge.reverse]!.capacity++; node = parent.from; } flow++;
    }
    if (flow !== perCell * 24) throw new TypeError("Synthetic allocation failed.");
    return new Set(selected.flatMap((edge, index) => edge.capacity === 0 ? [index] : []));
  };
  const references = select((index) => classes[index]!, Array(8).fill(stage === "T1" ? 3 : 9) as number[], stage === "T1" ? 1 : 3);
  const reruns = stage === "P1" ? select((index) => classes[index]! * 2 + (references.has(index) ? 0 : 1), Array.from({ length: 16 }, (_, bucket) => bucket < 8 ? (bucket % 2 === 0 ? 2 : 1) : (bucket % 2 === 0 ? 1 : 2)), 1) : new Set<number>();
  return { subjects, classes, references, reruns };
}

export function buildCoverageFixture(stage: LockedEvaluationPlan["stage"]): EvaluationCoverageInput {
  const allocation = stage === "P1" ? allocate("P1") : stage === "H0" ? null : allocate("T1");
  const subjects = allocation?.subjects ?? Array.from({ length: 8 }, (_, index) => ({ tone: Math.floor(index / 4), texture: index % 4, sample: 0 }));
  const classes = allocation?.classes ?? Array.from({ length: 32 }, (_, index) => index % 8);
  const run = uid("run-", stage === "P1" ? 5 : stage === "T1" ? 3 : stage === "T0" ? 2 : stage === "R0" ? 4 : 1);
  const configurationCount = stage === "P1" || stage === "H0" ? 1 : 2;
  const configurations = Array.from({ length: configurationCount }, (_, index) => ({ ...base.plan.configurations[0]!, ...envelope(run, 100 + index), configuration_id: uid("config-", index + 1), provider_id: uid("provider-", index + 1), preview_count: stage === "P1" || stage === "H0" ? 3 : 1, mask_strategy: "prompt_only" as const, segmentation: null, dilation_px: 0, feather_px: 0, manual_mask_edit: false, protected_region_definition: null })) as LockedEvaluationPlan["configurations"];
  const selectedIndices = classes.map((_, index) => index).filter((index) => stage === "T0" ? index < 24 : stage === "R0" ? index < 12 : true);
  const usedSubjects = new Set(selectedIndices.map((index) => stage === "H0" ? Math.floor(index / 4) : Math.floor(index / 2)));
  const referenceIndices = new Set(selectedIndices.filter((index) => allocation?.references.has(index)));
  const assets: LockedEvaluationPlan["assets"][number][] = [];
  for (const subjectIndex of usedSubjects) assets.push({ ...envelope(run, 1000 + subjectIndex), asset_id: uid("ast_", subjectIndex + 1), role: "source_portrait", subject_id: uid("sub_", subjectIndex + 1), content_sha256: digest({ synthetic_source: subjectIndex }), registry_manifest_sha256: digest({ synthetic_registry: subjectIndex }), parent_asset_ids: [] });
  for (const index of referenceIndices) assets.push({ ...envelope(run, 2000 + index), asset_id: uid("ast_", 1000 + index), role: "style_reference", subject_id: null, content_sha256: digest({ synthetic_reference: index }), registry_manifest_sha256: digest({ synthetic_reference_registry: index }), parent_asset_ids: [] });
  const cases = selectedIndices.map((index) => {
    const subjectIndex = stage === "H0" ? Math.floor(index / 4) : Math.floor(index / 2);
    return { ...envelope(run, 3000 + index), case_id: uid("case-", index + 1), subject_id: uid("sub_", subjectIndex + 1), source_asset_id: uid("ast_", subjectIndex + 1), reference_asset_id: referenceIndices.has(index) ? uid("ast_", 1000 + index) : null, specification: artifact(10000 + index), prompt_inputs: artifact(20000 + index), transformation: coverageTransformations[classes[index]!]!, mask_inputs: configurations.map((configuration) => ({ configuration_id: configuration.configuration_id, mask_asset_id: null, protected_region_asset_id: null })) };
  });
  const rerunIndices = stage === "P1" ? allocation!.reruns : new Set<number>();
  const slots: LockedEvaluationPlan["slots"][number][] = [];
  for (const item of cases) for (const config of configurations) {
    const index = selectedIndices[cases.indexOf(item)]!;
    for (let repetition = 0; repetition < (stage === "T1" || stage === "H0" || rerunIndices.has(index) ? 2 : 1); repetition++) for (let variant = 0; variant < config.preview_count; variant++) slots.push({ slot_id: uid("slot-", slots.length + 1), case_id: item.case_id, configuration_id: config.configuration_id, repetition, variant_index: variant });
  }
  const plan: LockedEvaluationPlan = { ...envelope(run, 1), records_version: "hair-evaluation-records-v1", stage, code_revision_sha256: digest({ synthetic_coverage_revision: 1 }), assets, cases, configurations, slots };
  const metadata: CoverageMetadata[] = assets.filter((item) => item.role === "source_portrait").map((asset) => {
    const subjectIndex = [...usedSubjects].find((index) => uid("sub_", index + 1) === asset.subject_id)!; const subject = subjects[subjectIndex]!;
    const tags: CoverageMetadata["secondary_tags"][number][] = [];
    if (subjectIndex % 3 === 0) tags.push("gray_or_white");
    if (subjectIndex % 5 === 0) tags.push("low_density_or_thinning", "very_short_shaved_or_bald");
    if (subjectIndex % 4 === 0) tags.push("protective_style");
    if (subjectIndex % 5 !== 0 && subjectIndex % 3 === 0) tags.push("long_below_shoulders");
    if (subjectIndex % 3 === 1) tags.push("glasses_or_accessories");
    if (subjectIndex % 7 === 0) tags.push("head_covering_or_partial_occlusion");
    tags.push(subjectIndex % 2 === 0 ? "mixed_or_nonstudio_lighting" : "side_or_three_quarter");
    const payload = { ...envelope(run, 5000 + subjectIndex), asset_id: asset.asset_id, subject_id: asset.subject_id!, content_sha256: asset.content_sha256, registry_manifest_sha256: asset.registry_manifest_sha256, authority: "synthetic_fixture" as const, provenance: "synthetic" as const, adult_status: "synthetic_adult" as const, scheme: "hair-tone-texture-v1" as const, tone_band: stage === "H0" ? null : `ST${subject.tone + 1}` as CoverageMetadata["tone_band"], texture_group: stage === "H0" ? null : `HT${subject.texture + 1}` as CoverageMetadata["texture_group"], tone_assignment: stage === "H0" ? "missing" as const : "synthetic_fixture" as const, texture_assignment: stage === "H0" ? "missing" as const : "synthetic_fixture" as const, texture_obscured: tags.some((tag) => ["very_short_shaved_or_bald", "protective_style", "head_covering_or_partial_occlusion"].includes(tag)), visible_consented_edit: true, secondary_tags: tags };
    return { ...payload, annotation_artifact: { artifact_id: uid("artifact-", 30000 + subjectIndex), content_sha256: digest(payload) } };
  });
  const parent = stage === "T0" || stage === "R0" ? buildCoverageFixture("T1").plan : null;
  return {
    plan, metadata, parent_plan: parent,
    preregistration: { ...envelope(run, 2), coverage_version: evaluationCoverageVersion, stage, plan_sha256: hashEvaluationPlan(plan), metadata_sha256: digest(metadata), parent_plan_sha256: parent === null ? null : hashEvaluationPlan(parent), dataset_id: uid("dataset-", 1), assignment_seed: stage === "P1" ? 712 : 711, h0_repetitions: stage === "H0" ? 2 : null, primary_case_ids: cases.map((item) => item.case_id), reliability_rerun_case_ids: cases.filter((_, index) => rerunIndices.has(selectedIndices[index]!)).map((item) => item.case_id), unsupported_blocks: [], physical_inapplicability: [], finalist_limit_override: null, comparison: "single_factor", changed_factor: configurationCount > 1 ? "provider_model" : "none" },
  };
}

/** Tests intentionally rehash malicious semantic mutations to exercise logic, not stale locks. */
export function relockCoverageFixture(input: EvaluationCoverageInput): void {
  for (const item of input.metadata) {
    const { annotation_artifact: annotation, ...payload } = item;
    (annotation as { content_sha256: string }).content_sha256 = digest(payload);
  }
  const pre = input.preregistration as { plan_sha256: string; metadata_sha256: string; parent_plan_sha256: string | null };
  pre.plan_sha256 = hashEvaluationPlan(input.plan); pre.metadata_sha256 = digest(input.metadata); pre.parent_plan_sha256 = input.parent_plan === null ? null : hashEvaluationPlan(input.parent_plan);
}
