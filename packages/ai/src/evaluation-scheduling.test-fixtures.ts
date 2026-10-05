import base from "../../../tests/evals/evaluation-records.fixture.json";
import { sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationPlan, type EvaluationRecordBundle, type LockedEvaluationPlan } from "./evaluation-records";
import type { RatingSchedulingInput } from "./evaluation-scheduling";

export const schedulingFixtureId=(prefix:string,value:number):string=>`${prefix}-${value.toString(16).padStart(16,"0")}`;
const time="2026-10-02T00:00:00.000Z",finish="2026-10-02T00:00:00.001Z",run=schedulingFixtureId("run",1);
const envelope=(record:number,created=time)=>({schema_version:"1.0.0" as const,protocol_id:"hair-eval-v1" as const,run_id:run,record_id:schedulingFixtureId("record",record),created_at_utc:created});
export type SchedulingTuple=readonly [caseIndex:number,configurationIndex:number,repetition:number];
export type MutableSchedulingFixture<T> = T extends readonly (infer V)[] ? MutableSchedulingFixture<V>[] : T extends object ? {-readonly [P in keyof T]: MutableSchedulingFixture<T[P]>} : T;
/** Opaque synthetic records only; distinct tuple arguments represent complete
 * one-preview groups. Stage coverage and asset authority are not asserted. */
export function buildSchedulingFixture(tuples:readonly SchedulingTuple[],outcomes:readonly ("candidate"|"rejected"|"failed")[]=[]):MutableSchedulingFixture<RatingSchedulingInput> {
  const caseIndices=[...new Set(tuples.map(t=>t[0]))].sort((a,b)=>a-b),configs=[...new Set(tuples.map(t=>t[1]))].sort((a,b)=>a-b);
  const source=base.plan.assets.find(a=>a.role==="source_portrait")!;
  const assets=caseIndices.map(index=>({...source,...envelope(100000+index),asset_id:`ast_${(index+1).toString(16).padStart(16,"0")}`,subject_id:`sub_${(index+1).toString(16).padStart(16,"0")}`,parent_asset_ids:[],content_sha256:sha256EvaluationManifest({synthetic_source:index})}));
  const configurations=configs.map(index=>({...base.plan.configurations[0]!,...envelope(200000+index),configuration_id:schedulingFixtureId("config",index+1),mask_strategy:"prompt_only" as const,segmentation:null,dilation_px:0,feather_px:0,manual_mask_edit:false,protected_region_definition:null,preview_count:1}));
  const cases=caseIndices.map(index=>({...base.plan.cases[0]!,...envelope(300000+index),case_id:schedulingFixtureId("case",index+1),subject_id:`sub_${(index+1).toString(16).padStart(16,"0")}`,source_asset_id:`ast_${(index+1).toString(16).padStart(16,"0")}`,reference_asset_id:null,mask_inputs:configs.filter(c=>tuples.some(t=>t[0]===index&&t[1]===c)).map(c=>({configuration_id:schedulingFixtureId("config",c+1),mask_asset_id:null,protected_region_asset_id:null}))}));
  const slots=tuples.map((tuple,index)=>({slot_id:schedulingFixtureId("slot",index+1),case_id:schedulingFixtureId("case",tuple[0]+1),configuration_id:schedulingFixtureId("config",tuple[1]+1),repetition:tuple[2],variant_index:0}));
  const plan:LockedEvaluationPlan={...base.plan,...envelope(1),records_version:"hair-evaluation-records-v1",stage:"H0",assets:assets as LockedEvaluationPlan["assets"],configurations:configurations as LockedEvaluationPlan["configurations"],cases:cases as LockedEvaluationPlan["cases"],slots};
  return buildSchedulingInputFromPlan(plan,outcomes);
}
export function buildSchedulingInputFromPlan(plan:LockedEvaluationPlan,outcomes:readonly ("candidate"|"rejected"|"failed")[]=[]):MutableSchedulingFixture<RatingSchedulingInput> {
  const plan_sha256=hashEvaluationPlan(plan);
  const attempts=plan.slots.map((slot,index)=>({ ...envelope(400000+index,finish),run_id:plan.run_id,attempt_id:schedulingFixtureId("attempt",index+1),slot_id:slot.slot_id,case_id:slot.case_id,configuration_id:slot.configuration_id,plan_sha256,attempt_index:1,retry_of_attempt_id:null,idempotency_id:schedulingFixtureId("idempotency",index+1),started_at_utc:time,finished_at_utc:finish,duration_ms:1,outcome:outcomes[index]==="failed"?"failed" as const:outcomes[index]==="rejected"?"output_rejected" as const:"succeeded" as const,failure_code:outcomes[index]==="failed"?"provider_failure" as const:outcomes[index]==="rejected"?"display_rejection" as const:"none" as const,output_id:outcomes[index]==="failed"?null:schedulingFixtureId("output",index+1),usage:{status:"unavailable" as const,image_input_units:null,image_output_units:null,text_input_units:null},revision:0,supersedes_record_sha256:null,correction_reason:"none" as const}));
  const outputs=plan.slots.flatMap((slot,index)=>{if(outcomes[index]==="failed")return [];const config=plan.configurations.find(c=>c.configuration_id===slot.configuration_id)!;return [{...envelope(500000+index,finish),run_id:plan.run_id,output_id:schedulingFixtureId("output",index+1),attempt_id:schedulingFixtureId("attempt",index+1),slot_id:slot.slot_id,content_sha256:sha256EvaluationManifest({synthetic_output:index}),width_px:config.output.width_px,height_px:config.output.height_px,format:config.output.format,disposition:outcomes[index]==="rejected"?"rejected" as const:"candidate" as const}];});
  const bundle:EvaluationRecordBundle={plan,plan_sha256,attempts,outputs};
  return {bundle,bundle_sha256:sha256EvaluationManifest(bundle),selected_output_ids:outputs.filter(o=>o.disposition==="candidate").map(o=>o.output_id),rater_id:schedulingFixtureId("rater",1)} as MutableSchedulingFixture<RatingSchedulingInput>;
}
