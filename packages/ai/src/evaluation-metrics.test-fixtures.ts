import base from "../../../tests/evals/evaluation-records.fixture.json";
import { sha256EvaluationManifest } from "./benchmark";
import { validateEvaluationRecordBundle, type EvaluationRecordBundle } from "./evaluation-records";
import { evaluateEvaluationCoverage, evaluationCoverageVersion, type EvaluationCoverageInput } from "./evaluation-coverage";
import { buildCoverageFixture, relockCoverageFixture } from "./evaluation-coverage.test-fixtures";
import { evaluateEvaluationCosts } from "./evaluation-costs";
import { buildCostFixture, relockCostFixture } from "./evaluation-costs.test-fixtures";
import { evaluateEvaluationRatings } from "./evaluation-ratings";
import { buildRatingFixture, relockRatingFixture, ratingFixtureId, type MutableRatingFixture } from "./evaluation-ratings.test-fixtures";
import { evaluationMetricsVersion, type EvaluationMetricInput } from "./evaluation-metrics";
export type MutableMetricFixture=MutableRatingFixture<EvaluationMetricInput>;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const id=ratingFixtureId;
const time=(plan:EvaluationRecordBundle["plan"],ms:number)=>new Date(Date.parse(plan.created_at_utc)+ms).toISOString();
/** Every field is invented metadata, with no decoded media, people, credentials,
 * provider execution, authentic charges, or sampling evidence. */
export function buildMetricFixture(options?:{stage?:"H0"|"T1"|"P1";outputCount?:number;subjectCount?:number}):MutableMetricFixture {
  let bundle:EvaluationRecordBundle,coverage:EvaluationCoverageInput;
  if(options){
    coverage=buildCoverageFixture(options.stage??"H0");const plan=coverage.plan;
    if(plan.stage==="H0")for(const row of coverage.metadata){Object.assign(row,{tone_band:"ST1",texture_group:"HT1",tone_assignment:"synthetic_fixture",texture_assignment:"synthetic_fixture"});}
    relockCoverageFixture(coverage);
    const subjectIds=[...new Set(plan.cases.map(item=>item.subject_id))].slice(0,options.subjectCount??Infinity),chosen=plan.slots.filter(slot=>subjectIds.includes(plan.cases.find(item=>item.case_id===slot.case_id)!.subject_id));
    const buckets=subjectIds.map(subject=>chosen.filter(slot=>plan.cases.find(item=>item.case_id===slot.case_id)!.subject_id===subject));
    const ordered=[] as typeof chosen;for(let i=0;buckets.some(bucket=>i<bucket.length);i++)for(const bucket of buckets)if(bucket[i])ordered.push(bucket[i]!);
    const retained=new Set(ordered.slice(0,options.outputCount??Infinity).map(slot=>slot.slot_id)),digest=sha256EvaluationManifest(plan);
    const attempts=plan.slots.map((slot,index)=>({schema_version:"1.0.0" as const,protocol_id:plan.protocol_id,run_id:plan.run_id,record_id:id("record",100000+index),created_at_utc:time(plan,2000),attempt_id:id("attempt",100000+index),slot_id:slot.slot_id,case_id:slot.case_id,configuration_id:slot.configuration_id,plan_sha256:digest,attempt_index:1,retry_of_attempt_id:null,idempotency_id:id("idempotency",100000+index),started_at_utc:time(plan,1000),finished_at_utc:time(plan,2000),duration_ms:1000,outcome:retained.has(slot.slot_id)?"succeeded" as const:"failed" as const,failure_code:retained.has(slot.slot_id)?"none" as const:"provider_failure" as const,output_id:retained.has(slot.slot_id)?id("output",100000+index):null,usage:{status:"estimated" as const,image_input_units:1,image_output_units:1,text_input_units:1},revision:0,supersedes_record_sha256:null,correction_reason:"none" as const}));
    const outputs=attempts.filter(attempt=>attempt.output_id!==null).map((attempt,index)=>{const config=plan.configurations.find(config=>config.configuration_id===attempt.configuration_id)!;return {schema_version:"1.0.0" as const,protocol_id:plan.protocol_id,run_id:plan.run_id,record_id:id("record",200000+index),created_at_utc:time(plan,2000),output_id:attempt.output_id!,attempt_id:attempt.attempt_id,slot_id:attempt.slot_id,content_sha256:sha256EvaluationManifest({invented_output:index}),width_px:config.output.width_px,height_px:config.output.height_px,format:config.output.format,disposition:"candidate" as const};});
    bundle=validateEvaluationRecordBundle({plan,plan_sha256:digest,attempts,outputs});
  }else{
    bundle=validateEvaluationRecordBundle(base);const plan=bundle.plan;
    const metadata=plan.assets.filter(asset=>asset.role==="source_portrait").map((asset,index)=>{const row={schema_version:"1.0.0" as const,protocol_id:plan.protocol_id,run_id:plan.run_id,record_id:id("record",400000+index),created_at_utc:plan.created_at_utc,asset_id:asset.asset_id,subject_id:asset.subject_id!,content_sha256:asset.content_sha256,registry_manifest_sha256:asset.registry_manifest_sha256,authority:"synthetic_fixture" as const,provenance:"synthetic" as const,adult_status:"synthetic_adult" as const,scheme:"hair-tone-texture-v1" as const,tone_band:"ST1" as const,texture_group:"HT1" as const,tone_assignment:"synthetic_fixture" as const,texture_assignment:"synthetic_fixture" as const,texture_obscured:false,visible_consented_edit:true,secondary_tags:[]};return {...row,annotation_artifact:{artifact_id:id("artifact",930000+index),content_sha256:sha256EvaluationManifest(row)}};});
    coverage={plan,parent_plan:null,metadata,preregistration:{schema_version:"1.0.0",protocol_id:plan.protocol_id,run_id:plan.run_id,record_id:id("record",410000),created_at_utc:plan.created_at_utc,coverage_version:evaluationCoverageVersion,stage:plan.stage,plan_sha256:bundle.plan_sha256,metadata_sha256:sha256EvaluationManifest(metadata),parent_plan_sha256:null,dataset_id:id("dataset",410000),assignment_seed:711,h0_repetitions:1,primary_case_ids:plan.cases.map(item=>item.case_id),reliability_rerun_case_ids:[],unsupported_blocks:[],physical_inapplicability:[],finalist_limit_override:null,comparison:"single_factor",changed_factor:"none"}};
  }
  const costs=buildCostFixture(bundle);costs.charges.forEach((charge,index)=>{charge.invoice_artifact!.artifact_id=id("artifact",920000+index);});relockCostFixture(costs);
  const ratings=buildRatingFixture(bundle),offset=Date.parse(bundle.plan.created_at_utc)-Date.parse("2026-10-01T00:00:00.000Z");
  const shift=(date:string)=>new Date(Date.parse(date)+offset).toISOString();ratings.assignments.frozen_at_utc=shift(ratings.assignments.frozen_at_utc);ratings.locked_at_utc=shift(ratings.locked_at_utc);
  ratings.ratings.forEach(row=>{row.started_at_utc=shift(row.started_at_utc);row.completed_at_utc=shift(row.completed_at_utc);row.submitted_at_utc=shift(row.submitted_at_utc);});ratings.observations.forEach(row=>{row.recorded_at_utc=shift(row.recorded_at_utc);row.automated_display_gate="passed";});relockRatingFixture(ratings);
  const coverageReport=evaluateEvaluationCoverage(coverage),costReport=evaluateEvaluationCosts(costs),ratingReport=evaluateEvaluationRatings(ratings);
  return clone({schema_version:"1.0.0",metrics_version:evaluationMetricsVersion,locked_at_utc:time(bundle.plan,120000),coverage_report:coverageReport,coverage_report_sha256:sha256EvaluationManifest(coverageReport),cost_report:costReport,cost_report_sha256:sha256EvaluationManifest(costReport),rating_report:ratingReport,rating_report_sha256:sha256EvaluationManifest(ratingReport)}) as MutableMetricFixture;
}
/** Recompute supplied synthetic reports after deliberately editing their inputs;
 * production metrics has no such mutation or assertion-acceptance API. */
export function relockMetricFixture(input:MutableMetricFixture):void {
  relockCostFixture(input.cost_report.input);input.rating_report.input.bundle=clone(input.cost_report.input.bundle);relockRatingFixture(input.rating_report.input);
  input.coverage_report.input.plan=clone(input.cost_report.input.bundle.plan);relockCoverageFixture(input.coverage_report.input);
  input.coverage_report=clone(evaluateEvaluationCoverage(input.coverage_report.input)) as typeof input.coverage_report;
  input.cost_report=clone(evaluateEvaluationCosts(input.cost_report.input)) as typeof input.cost_report;
  input.rating_report=clone(evaluateEvaluationRatings(input.rating_report.input)) as typeof input.rating_report;
  input.coverage_report_sha256=sha256EvaluationManifest(input.coverage_report);input.cost_report_sha256=sha256EvaluationManifest(input.cost_report);input.rating_report_sha256=sha256EvaluationManifest(input.rating_report);
}
