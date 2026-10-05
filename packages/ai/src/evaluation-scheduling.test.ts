import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCoverageFixture } from "./evaluation-coverage.test-fixtures";
import { sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationPlan, validateEvaluationRecordBundle } from "./evaluation-records";
import {
  scheduleEvaluationInvocations, scheduleEvaluationRatings, serializeEvaluationInvocationSchedule, serializeEvaluationRatingSchedule,
} from "./evaluation-scheduling";
import { buildSchedulingFixture, buildSchedulingInputFromPlan, schedulingFixtureId, type SchedulingTuple } from "./evaluation-scheduling.test-fixtures";

const key=(parts:readonly (string|number)[]):string=>createHash("sha256").update(parts.join("|")).digest("hex");
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const grid=(cases:number,configs:number,reps:number):SchedulingTuple[]=>Array.from({length:cases},(_,c)=>Array.from({length:configs},(_,f)=>Array.from({length:reps},(_,r)=>[c,f,r] as const))).flat(2);
const invInput=()=>{const data=buildSchedulingFixture(grid(3,3,2));return {plan:data.bundle.plan,plan_sha256:data.bundle.plan_sha256};};
const exhaustiveTuples:SchedulingTuple[]=[[1,0,1],[2,0,1],[3,0,0],[0,0,1],[1,2,0],[2,1,0],[3,1,1],[0,2,1]];
const unresolvedTuples:SchedulingTuple[]=[[3,1,1],[0,0,0],[1,2,0],[2,2,1],[1,1,0],[2,0,0],[3,2,1],[0,2,0],[1,0,1],[3,0,0]];
function relock(input:ReturnType<typeof buildSchedulingFixture>):void {input.bundle_sha256=sha256EvaluationManifest(input.bundle);}
describe("declared evaluation scheduling",()=>{
  it("orders invocations by exact protocol hash within whole case blocks",()=>{
    const input=invInput();const report=scheduleEvaluationInvocations(input);expect(report.result.blocks.map(b=>b.case_id)).toEqual([...input.plan.cases.map(c=>c.case_id)].sort());
    for(const block of report.result.blocks){expect(block.slots).toHaveLength(6);expect(block.slots.every(s=>s.case_id===block.case_id)).toBe(true);expect(block.slots.map(s=>s.ordering_key)).toEqual([...block.slots.map(s=>s.ordering_key)].sort());for(const slot of block.slots)expect(slot.ordering_key).toBe(key([input.plan.protocol_id,input.plan.run_id,slot.case_id,slot.configuration_id,slot.repetition]));}
    expect(new Set(report.result.blocks.flatMap(b=>b.slots.map(s=>s.slot_id))).size).toBe(input.plan.slots.length);expect(report.result.adjacency).toBe("NOT_APPLICABLE_CASE_BLOCKS");expect(report.result.execution).toBe("NOT_EVALUATED");
    expect(serializeEvaluationInvocationSchedule(report)).toBe(serializeEvaluationInvocationSchedule(scheduleEvaluationInvocations(clone(input))));
  });
  it("uses numeric preview indices as deterministic ties without splitting invocation groups",()=>{
    const input=buildCoverageFixture("H0");const report=scheduleEvaluationInvocations({plan:input.plan,plan_sha256:hashEvaluationPlan(input.plan)});for(const block of report.result.blocks)for(let i=0;i<block.slots.length;i+=3){const group=block.slots.slice(i,i+3);expect(group.map(s=>s.variant_index)).toEqual([0,1,2]);expect(new Set(group.map(s=>s.ordering_key)).size).toBe(1);}
  });
  it("gives stable reviewer-specific hash priorities while preserving every candidate once",()=>{
    const input=buildSchedulingFixture(grid(3,3,2));const report=scheduleEvaluationRatings(input);expect(report.result.status).toBe("COMPLETE_CERTIFIED_ORDER");expect(report.result.proof).toBe("ZERO_COLLISIONS");expect(report.result.collisions.total).toBe(0);expect([...report.result.order.map(i=>i.output_id)].sort()).toEqual([...input.selected_output_ids].sort());for(const item of report.result.order)expect(item.ordering_key).toBe(key([input.bundle.plan.run_id,input.rater_id,item.output_id]));
    const other=clone(input);other.rater_id=schedulingFixtureId("rater",2);expect(scheduleEvaluationRatings(other).result.order).not.toEqual(report.result.order);
    expect(serializeEvaluationRatingSchedule(report)).toBe(serializeEvaluationRatingSchedule(scheduleEvaluationRatings(clone(input))));
  });
  it("interprets repetition globally as the literal numeric index",()=>{
    const input=buildSchedulingFixture([[0,0,0],[1,1,0],[2,2,0]]);const report=scheduleEvaluationRatings(input);expect(report.result.collisions).toEqual({case:0,configuration:0,repetition:2,total:2,any_collision_edges:2});expect(report.result.proof).toBe("ANALYTIC_LOWER_BOUND_MATCHED");
  });
  it("certifies unavoidable single-configuration and single-repetition collisions honestly",()=>{
    const report=scheduleEvaluationRatings(buildSchedulingFixture([[0,0,0],[1,0,0],[2,0,0],[3,0,0]]));expect(report.result.collisions.total).toBe(6);expect(report.result.lower_bounds.frequency_sum).toBe(6);expect(report.result.lower_bounds.spanning_tree).toBe(6);expect(report.result.status).toBe("COMPLETE_CERTIFIED_ORDER");expect(report.result.proof).toBe("ANALYTIC_LOWER_BOUND_MATCHED");
  });
  it("uses a joint spanning-tree lower bound when balanced labels cannot all alternate",()=>{
    const report=scheduleEvaluationRatings(buildSchedulingFixture(grid(2,2,2)));expect(report.result.lower_bounds.frequency_sum).toBe(0);expect(report.result.lower_bounds.spanning_tree).toBe(3);expect(report.result.collisions.total).toBe(3);expect(report.result.proof).toBe("ANALYTIC_LOWER_BOUND_MATCHED");
  });
  it("does not call a greedy dead end globally unavoidable",()=>{
    const tuples:SchedulingTuple[]=[[1,0,0],[0,2,1],[0,1,0],[1,2,1],[2,1,0],[0,1,1],[1,2,0]];const report=scheduleEvaluationRatings(buildSchedulingFixture(tuples));expect(report.result.collisions.total).toBe(0);expect(report.result.proof).toBe("ZERO_COLLISIONS");
  });
  it("certifies a tiny exhaustive minimum when analytic bounds are not tight",()=>{
    const report=scheduleEvaluationRatings(buildSchedulingFixture(exhaustiveTuples));expect(report.result.lower_bounds.combined).toBe(1);expect(report.result.collisions.total).toBe(2);expect(report.result.proof).toBe("EXHAUSTIVE_MINIMUM");expect(report.result.status).toBe("COMPLETE_CERTIFIED_ORDER");
  });
  it("returns INCOMPLETE for an unresolved larger population despite preserving every candidate",()=>{
    const input=buildSchedulingFixture(unresolvedTuples);const report=scheduleEvaluationRatings(input);expect(report.result.lower_bounds.combined).toBe(1);expect(report.result.collisions.total).toBeGreaterThan(report.result.lower_bounds.combined);expect(report.result.proof).toBe("UNRESOLVED_BOUNDED_SEARCH");expect(report.result.status).toBe("INCOMPLETE");expect([...report.result.order.map(item=>item.output_id)].sort()).toEqual([...input.selected_output_ids].sort());expect(serializeEvaluationRatingSchedule(report)).toBe(serializeEvaluationRatingSchedule(scheduleEvaluationRatings(input)));
    const fake=clone(report);Object.assign(fake.result,{proof:"ANALYTIC_LOWER_BOUND_MATCHED",status:"COMPLETE_CERTIFIED_ORDER"});expect(()=>serializeEvaluationRatingSchedule(fake)).toThrow(/^Evaluation scheduling rejected\.$/);
  });
  it("uses complete candidate pool and retains rejected and failed accounting in locked input",()=>{
    const input=buildSchedulingFixture([[0,0,0],[1,1,1],[2,2,0]],["candidate","rejected","failed"]);const report=scheduleEvaluationRatings(input);expect(report.result.order).toHaveLength(1);expect(report.input.bundle.attempts).toHaveLength(3);expect(report.input.bundle.outputs).toHaveLength(2);expect(report.result.media_authorization).toBe("NOT_EVALUATED");expect(report.result.blinding).toBe("NOT_EVALUATED");
    const missing=clone(input);missing.selected_output_ids=[];expect(()=>scheduleEvaluationRatings(missing)).toThrow(/^Evaluation scheduling rejected\.$/);const rejected=clone(input);rejected.selected_output_ids=[input.bundle.outputs[1]!.output_id];expect(()=>scheduleEvaluationRatings(rejected)).toThrow(/^Evaluation scheduling rejected\.$/);
  });
  it("handles no successful candidate outputs without claiming a quality or display gate",()=>{
    const input=buildSchedulingFixture([[0,0,0]],["failed"]);const report=scheduleEvaluationRatings(input);expect(report.result.order).toEqual([]);expect(report.result.collisions.total).toBe(0);expect(report.result.proof).toBe("ZERO_COLLISIONS");expect(report.result.quality_gate).toBe("NOT_EVALUATED");
  });
  for(const stage of ["T1","P1"] as const)it(`preserves representative full ${stage} population and reaches a sound bound`,()=>{
    const coverage=buildCoverageFixture(stage);const input=buildSchedulingInputFromPlan(coverage.plan);validateEvaluationRecordBundle(input.bundle);const report=scheduleEvaluationRatings(input);expect(report.result.order).toHaveLength(stage==="P1"?792:288);expect(report.result.collisions.total).toBe(report.result.lower_bounds.combined);expect(report.result.status).toBe("COMPLETE_CERTIFIED_ORDER");expect(report.result.collisions.case).toBe(0);if(stage==="P1"){expect(report.result.collisions.configuration).toBe(791);expect(report.result.collisions.repetition).toBe(647);}else expect(report.result.collisions.total).toBe(1);
  });
  it("schedules a three-finalist T1 slot shape with zero collisions",()=>{
    const input=buildSchedulingFixture(grid(72,3,2));const report=scheduleEvaluationRatings(input);expect(report.result.order).toHaveLength(432);expect(report.result.proof).toBe("ZERO_COLLISIONS");expect(report.result.collisions.total).toBe(0);expect(report.result.lower_bounds.combined).toBe(0);
  });
  it("is independent of input object/array order after re-locking equivalent records",()=>{
    const input=buildSchedulingFixture(grid(2,3,2));const expected=scheduleEvaluationRatings(input).result.order;input.bundle.outputs.reverse();input.selected_output_ids.reverse();relock(input);expect(scheduleEvaluationRatings(input).result.order).toEqual(expected);
    const invocation=invInput();invocation.plan.cases.reverse();invocation.plan.slots.reverse();invocation.plan_sha256=hashEvaluationPlan(invocation.plan);expect(scheduleEvaluationInvocations(invocation).result.blocks).toEqual(scheduleEvaluationInvocations(invInput()).result.blocks);
  });
  it("returns detached validated inputs",()=>{
    const input=buildSchedulingFixture(grid(2,2,2));const report=scheduleEvaluationRatings(input);input.selected_output_ids.length=0;expect(report.input.selected_output_ids).toHaveLength(8);expect(report.result.order).toHaveLength(8);
  });
  it("enforces fixed solver population bounds before inspecting a supplied bundle",()=>{
    let reads=0;const excessive={bundle_sha256:"0".repeat(64),rater_id:schedulingFixtureId("rater",1),selected_output_ids:Array.from({length:1025},(_,index)=>schedulingFixtureId("output",index+1))};Object.defineProperty(excessive,"bundle",{enumerable:true,get(){reads++;return "private";}});expect(()=>scheduleEvaluationRatings(excessive)).toThrow(/^Evaluation scheduling rejected\.$/);expect(reads).toBe(0);
  });
  it("reproduces the metadata-only scheduling golden",()=>{
    const invocation=scheduleEvaluationInvocations(invInput());
    const fixtures={zero:buildSchedulingFixture(grid(3,3,2)),joint:buildSchedulingFixture(grid(2,2,2)),single:buildSchedulingFixture([[0,0,0],[1,0,0],[2,0,0],[3,0,0]]),exhaustive:buildSchedulingFixture(exhaustiveTuples),unresolved:buildSchedulingFixture(unresolvedTuples),T1:buildSchedulingInputFromPlan(buildCoverageFixture("T1").plan),P1:buildSchedulingInputFromPlan(buildCoverageFixture("P1").plan)};
    const expected={version:"hair-evaluation-scheduling-v1",scope:"synthetic_metadata_only",invocation:{input_sha256:invocation.result.input_sha256,report_sha256:sha256EvaluationManifest(invocation),ordered_slot_ids:invocation.result.blocks.flatMap(block=>block.slots.map(slot=>slot.slot_id))},ratings:Object.fromEntries(Object.entries(fixtures).map(([name,input])=>{const report=scheduleEvaluationRatings(input);return [name,{input_sha256:report.result.input_sha256,report_sha256:sha256EvaluationManifest(report),population:report.result.order.length,status:report.result.status,proof:report.result.proof,lower_bounds:report.result.lower_bounds,collisions:report.result.collisions,order_sha256:sha256EvaluationManifest(report.result.order.map(item=>item.output_id))}];})),media_authorization:"NOT_EVALUATED",quality_gate:"NOT_EVALUATED"};
    const path=new URL("../../../tests/evals/evaluation-scheduling.golden.json",import.meta.url);
    expect(JSON.parse(readFileSync(path,"utf8"))).toEqual(expected);
  });
  it("rejects missing/duplicate candidates, stale locks, opaque-ID violations and extra private fields",()=>{
    const original=buildSchedulingFixture(grid(2,2,2));const mutations:((input:typeof original)=>void)[]=[i=>{i.selected_output_ids.pop();},i=>{i.selected_output_ids[1]=i.selected_output_ids[0]!;},i=>{i.rater_id="Alice";},i=>{i.rater_id="rater-0000000000000001|private";},i=>{i.bundle_sha256="0".repeat(64);},i=>{Object.assign(i,{raw_prompt:"private"});},i=>{Object.assign(i.bundle.outputs[0]!,{signed_url:"private"});}];for(const mutate of mutations){const input=clone(original);mutate(input);expect(()=>scheduleEvaluationRatings(input)).toThrow(/^Evaluation scheduling rejected\.$/);}
    const invocation=invInput();invocation.plan_sha256="0".repeat(64);expect(()=>scheduleEvaluationInvocations(invocation)).toThrow(/^Evaluation scheduling rejected\.$/);
  });
  it("rejects accessor, sparse, hidden, prototype and coercible fields without reading their values",()=>{
    const input=buildSchedulingFixture(grid(2,2,2));let reads=0;Object.defineProperty(input,"rater_id",{enumerable:true,get(){reads++;return "private";}});expect(()=>scheduleEvaluationRatings(input)).toThrow(/^Evaluation scheduling rejected\.$/);expect(reads).toBe(0);
    const sparse=buildSchedulingFixture(grid(2,2,2));delete sparse.selected_output_ids[0];expect(()=>scheduleEvaluationRatings(sparse)).toThrow(/^Evaluation scheduling rejected\.$/);
    const hidden=buildSchedulingFixture(grid(2,2,2));Object.defineProperty(hidden,"private",{value:"secret",enumerable:false});expect(()=>scheduleEvaluationRatings(hidden)).toThrow(/^Evaluation scheduling rejected\.$/);
    const proto=buildSchedulingFixture(grid(2,2,2));Object.setPrototypeOf(proto,{private:true});expect(()=>scheduleEvaluationRatings(proto)).toThrow(/^Evaluation scheduling rejected\.$/);
    const coercion=buildSchedulingFixture(grid(2,2,2));Object.assign(coercion,{rater_id:{toString(){reads++;return "private";}}});expect(()=>scheduleEvaluationRatings(coercion)).toThrow(/^Evaluation scheduling rejected\.$/);expect(reads).toBe(0);
  });
  it("recomputes exact reports and rejects fabricated proofs/counts/orders or exported private fields",()=>{
    const report=scheduleEvaluationRatings(buildSchedulingFixture(grid(2,2,2)));for(const mutate of [(r:typeof report)=>{Object.assign(r.result,{media_authorization:"PASSED"});},(r:typeof report)=>{Object.assign(r.result,{collisions:{...r.result.collisions,total:0}});},(r:typeof report)=>{Object.assign(r.result,{proof:"ZERO_COLLISIONS"});},(r:typeof report)=>{(r.result.order as unknown[]).reverse();},(r:typeof report)=>{Object.assign(r.result,{name:"private"});}]){const fake=clone(report);mutate(fake);expect(()=>serializeEvaluationRatingSchedule(fake)).toThrow(/^Evaluation scheduling rejected\.$/);}
    const invocation=scheduleEvaluationInvocations(invInput());Object.assign(invocation.result,{execution:"PASSED"});expect(()=>serializeEvaluationInvocationSchedule(invocation)).toThrow(/^Evaluation scheduling rejected\.$/);
    const accessor=clone(report);let reads=0;Object.defineProperty(accessor.result,"proof",{enumerable:true,get(){reads++;return "private";}});expect(()=>serializeEvaluationRatingSchedule(accessor)).toThrow(/^Evaluation scheduling rejected\.$/);expect(reads).toBe(0);
  });
});
