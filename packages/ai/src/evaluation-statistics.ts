import { types } from "node:util";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import { serializeEvaluationMetricReport, type EvaluationMetricInput, type EvaluationMetricResult, type DeclaredOutputMetric } from "./evaluation-metrics";
import { ratingScoreFields } from "./evaluation-ratings";

export const evaluationStatisticsVersion="hair-evaluation-statistics-v1";
export const statisticsMethods=Object.freeze({method_id:"subject_case_percentile_ordinal_alpha_v1",seed_stream:"sha256_xorshift32_rejection_v1",replicates:10000,lower_rank:250,upper_rank:9750,nominal_confidence:"95_percent",endpoint_convention:"inverse_empirical_cdf_nearest_rank"} as const);
export const statisticsBounds=Object.freeze({configurations:3,outputs:1024,required_tuple_frame:10000,unit_draws:10000000,input_nodes:7000000,report_nodes:14000000,depth:64,array_length:10000,string_length:128});
export const statisticsFunctionals=Object.freeze([...ratingScoreFields.map(field=>`median:${field}`),...ratingScoreFields.map(field=>`score_4_5:${field}`),"displayable_rate","usable_rate","critical_rate","t1_severe_rate","p1_major_rate"] as const);
type MetricReport={readonly input:EvaluationMetricInput;readonly result:EvaluationMetricResult};
export interface EvaluationAnalysisManifest {
  readonly schema_version:"1.0.0";readonly statistics_version:typeof evaluationStatisticsVersion;readonly method_id:typeof statisticsMethods.method_id;
  readonly protocol_id:"hair-eval-v1";readonly run_id:string;readonly plan_sha256:string;readonly frozen_at_utc:string;readonly seed:number;
  readonly seed_stream:typeof statisticsMethods.seed_stream;readonly replicates:10000;readonly lower_rank:250;readonly upper_rank:9750;
  readonly nominal_confidence:"95_percent";readonly endpoint_convention:typeof statisticsMethods.endpoint_convention;
}
export interface EvaluationStatisticInput {
  readonly schema_version:"1.0.0";readonly statistics_version:typeof evaluationStatisticsVersion;readonly locked_at_utc:string;
  readonly metric_report:MetricReport;readonly metric_report_sha256:string;readonly analysis_manifest:EvaluationAnalysisManifest;readonly analysis_manifest_sha256:string;
}
export interface StatisticFraction {readonly numerator:string;readonly denominator:string;}
interface StatisticalObservation {
  readonly functional:string;readonly point:StatisticFraction|null;readonly component_a_point:StatisticFraction|null;readonly component_b_point:StatisticFraction|null;readonly component_a_rate_counts:{readonly numerator:number;readonly denominator:number}|null;readonly component_b_rate_counts:{readonly numerator:number;readonly denominator:number}|null;readonly interval:{readonly lower:number;readonly upper:number}|null;
  readonly status:"INFORMATIVE_DECLARED_INTERVAL"|"INCOMPLETE"|"INSUFFICIENT_POPULATION"|"NON_INFORMATIVE";
  readonly findings:readonly string[];readonly interval_arithmetic:"IEEE754_FLOAT64";readonly defined_replicates:number;
}
interface StatisticalPopulation {
  readonly configuration_id:string;readonly population:"primary_all_generated"|"primary_declared_gate_passed";readonly unit:"subject";
  readonly output_count:number;readonly contributing_subject_count:number;readonly unknown_membership_count:number;readonly incomplete_classification_count:number;
  readonly seed_sha256:string;readonly observations:readonly StatisticalObservation[];
}
interface StatisticalComparison {
  readonly configuration_a_id:string;readonly configuration_b_id:string;readonly direction:"A_minus_B";
  readonly population:"primary_all_generated"|"primary_declared_gate_passed";readonly unit:"paired_case"|"paired_subject"|"paired_subject_sensitivity";
  readonly complete_tuple_coverage:boolean;readonly expected_tuple_count_a:number;readonly expected_tuple_count_b:number;readonly declared_tuple_count_a:number;readonly declared_tuple_count_b:number;readonly matched_case_count:number;readonly jointly_contributing_case_count:number;
  readonly contributing_subject_count_a:number;readonly contributing_subject_count_b:number;readonly output_count_a:number;readonly output_count_b:number;
  readonly seed_sha256:string;readonly observations:readonly StatisticalObservation[];
}
interface RawAgreementObservation {
  readonly configuration_id:string;readonly dimension:typeof ratingScoreFields[number];readonly population:"primary_all_retained_generated_raw_triples";
  readonly output_count:number;readonly complete_triple_count:number;readonly unknown_triple_count:number;readonly raw_rating_sha256s:readonly string[];
  readonly category_frequencies:readonly number[];readonly pair_denominator:number;readonly known_exact_pair_count:number;readonly known_within_one_pair_count:number;
  readonly exact_agreement:StatisticFraction|null;readonly within_one_agreement:StatisticFraction|null;readonly ordinal_alpha:StatisticFraction|null;
  readonly observed_disagreement:StatisticFraction|null;readonly expected_disagreement:StatisticFraction|null;
  readonly status:"COMPLETE_DECLARED_RAW_AGREEMENT"|"INCOMPLETE"|"UNDEFINED_ALPHA";readonly findings:readonly string[];
}
export interface EvaluationStatisticResult {
  readonly statistics_version:typeof evaluationStatisticsVersion;readonly scope:"declared_primary_statistical_metadata";readonly input_sha256:string;readonly metric_report_sha256:string;readonly analysis_manifest_sha256:string;
  readonly status:"COMPLETE_DECLARED_STATISTICAL_INPUTS"|"INCOMPLETE";readonly findings:readonly string[];readonly source_metric_findings:readonly string[];
  readonly planned_unit_draws:number;readonly resampling_executed:boolean;readonly populations:readonly StatisticalPopulation[];readonly comparisons:readonly StatisticalComparison[];readonly raw_agreement:readonly RawAgreementObservation[];
  readonly preregistration_authenticity:"NOT_EVALUATED";readonly sampling_authority:"NOT_EVALUATED";readonly reviewer_qualification:"NOT_EVALUATED";readonly blinding:"NOT_EVALUATED";readonly media_authorization:"NOT_EVALUATED";
  readonly cohort_intervals:"NOT_EVALUATED";readonly cost_intervals:"NOT_EVALUATED";readonly latency_intervals:"NOT_EVALUATED";readonly agreement_intervals:"NOT_EVALUATED";
  readonly nominal_coverage_calibration:"NOT_EVALUATED";readonly equivalence_conclusions:"NOT_EVALUATED";readonly multiplicity_control:"NOT_EVALUATED";readonly full_protocol_inference:"NOT_EVALUATED";
  readonly actual_display:"NOT_EVALUATED";readonly t1_quality_gate:"NOT_EVALUATED";readonly p1_quality_gate:"NOT_EVALUATED";readonly release_gate:"NOT_EVALUATED";readonly provider_selection:"NOT_EVALUATED";
}
const denial="Evaluation statistics rejected.";
function ensure(value:unknown):asserts value {if(!value)throw new TypeError(denial);}
function safe<T>(action:()=>T):T {try{return action();}catch{throw new TypeError(denial);}}
function preflight(value:unknown,limit:number=statisticsBounds.input_nodes):void {
  let nodes=0;const parents=new Set<object>();const visit=(value:unknown,depth:number):void=>{
    ensure(++nodes<=limit&&depth<=64&&!types.isProxy(value));if(typeof value==="string"){ensure(value.length<=128);return;}if(value===null||typeof value==="boolean")return;if(typeof value==="number"){ensure(Number.isFinite(value));return;}
    ensure(typeof value==="object"&&!parents.has(value));const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);ensure(prototype===(array?Array.prototype:Object.prototype)||(!array&&prototype===null));const keys=Reflect.ownKeys(value);ensure(keys.every(key=>typeof key==="string"&&key.length<=64));
    if(array){const length=Object.getOwnPropertyDescriptor(value,"length")!.value as number;ensure(length<=10000&&keys.length===length+1);for(let i=0;i<length;i++)ensure(Object.getOwnPropertyDescriptor(value,String(i))?.enumerable===true);}else ensure(keys.length<=64);
    parents.add(value);for(const key of keys){if(array&&key==="length")continue;const descriptor=Object.getOwnPropertyDescriptor(value,key);ensure(descriptor?.enumerable===true&&"value" in descriptor);visit(descriptor.value,depth+1);}parents.delete(value);
  };visit(value,0);
}
function object(value:unknown,fields:readonly string[]):Record<string,unknown>{ensure(value!==null&&typeof value==="object"&&!Array.isArray(value));const keys=Object.keys(value);ensure(keys.length===fields.length&&keys.every(key=>fields.includes(key)));return value as Record<string,unknown>;}
function instant(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);}
function exact(actual:unknown,reference:unknown):void {if(Array.isArray(reference)){ensure(Array.isArray(actual)&&actual.length===reference.length);actual.forEach((value,index)=>exact(value,reference[index]));}else if(reference!==null&&typeof reference==="object"){const ref=reference as Record<string,unknown>,obj=object(actual,Object.keys(ref));Object.keys(ref).forEach(key=>exact(obj[key],ref[key]));}else ensure(actual===reference);}
function ordered(a:string,b:string):number{return a<b?-1:a>b?1:0;}
export function validateEvaluationStatisticInput(value:unknown):EvaluationStatisticInput {
  return safe(()=>{
    preflight(value);const raw=object(value,["schema_version","statistics_version","locked_at_utc","metric_report","metric_report_sha256","analysis_manifest","analysis_manifest_sha256"]);ensure(raw.schema_version==="1.0.0"&&raw.statistics_version===evaluationStatisticsVersion);instant(raw.locked_at_utc);
    const metric=JSON.parse(serializeEvaluationMetricReport(raw.metric_report)) as MetricReport;ensure(raw.metric_report_sha256===sha256EvaluationManifest(metric));const plan=metric.input.cost_report.input.bundle.plan;
    ensure(plan.configurations.length<=3&&metric.result.outputs.length<=1024);
    const manifest=object(raw.analysis_manifest,["schema_version","statistics_version","method_id","protocol_id","run_id","plan_sha256","frozen_at_utc","seed","seed_stream","replicates","lower_rank","upper_rank","nominal_confidence","endpoint_convention"]);
    ensure(manifest.schema_version==="1.0.0"&&manifest.statistics_version===evaluationStatisticsVersion&&manifest.method_id===statisticsMethods.method_id&&manifest.protocol_id===plan.protocol_id&&manifest.run_id===plan.run_id&&manifest.plan_sha256===metric.result.plan_sha256);
    ensure(typeof manifest.seed==="number"&&Number.isSafeInteger(manifest.seed)&&manifest.seed>=0&&manifest.seed<=4294967295);instant(manifest.frozen_at_utc);
    for(const field of ["seed_stream","replicates","lower_rank","upper_rank","nominal_confidence","endpoint_convention"] as const)ensure(manifest[field]===statisticsMethods[field]);
    const first=Math.min(...metric.input.cost_report.input.bundle.attempts.map(attempt=>Date.parse(attempt.started_at_utc)));ensure(Date.parse(manifest.frozen_at_utc)>=Date.parse(plan.created_at_utc)&&Date.parse(manifest.frozen_at_utc)<first);ensure(raw.analysis_manifest_sha256===sha256EvaluationManifest(manifest));
    const cutoff=(value:unknown):void=>{if(Array.isArray(value)){value.forEach(cutoff);return;}if(value===null||typeof value!=="object")return;for(const [key,entry] of Object.entries(value)){if(key.endsWith("_at_utc")){instant(entry);ensure(entry<=raw.locked_at_utc!);}cutoff(entry);}};cutoff(metric);cutoff(manifest);
    return JSON.parse(canonicalEvaluationJson({...raw,metric_report:metric,analysis_manifest:manifest})) as EvaluationStatisticInput;
  });
}
function fraction(numerator:bigint|number,denominator:bigint|number):StatisticFraction {let n=BigInt(numerator),d=BigInt(denominator);ensure(d>BigInt(0));let a=n<BigInt(0)?-n:n,b=d;while(b!==BigInt(0)){const remainder=a%b;a=b;b=remainder;}if(a!==BigInt(0)){n/=a;d/=a;}return {numerator:n.toString(),denominator:d.toString()};}
function subtract(b:StatisticFraction,a:StatisticFraction):StatisticFraction {return fraction(BigInt(b.numerator)*BigInt(a.denominator)-BigInt(a.numerator)*BigInt(b.denominator),BigInt(a.denominator)*BigInt(b.denominator));}
function floating(value:StatisticFraction):number{return Number(value.numerator)/Number(value.denominator);}
function stream(seedHash:string):(n:number)=>number {let state=Number.parseInt(seedHash.slice(0,8),16)||0x6d2b79f5;return n=>{const range=4294967295,limit=Math.floor(range/n)*n;while(true){state^=state<<13;state^=state>>>17;state^=state<<5;const candidate=(state>>>0)-1;if(candidate<limit)return candidate%n;}};}
/** Histogram vector: count, seven six-bin medians, seven score-pass counts,
 * displayable/usable/critical/T1-severe/P1-major counts. */
const vectorLength=55;
function vector(outputs:readonly DeclaredOutputMetric[]):Float64Array {const value=new Float64Array(vectorLength);value[0]=outputs.length;for(const output of outputs){ratingScoreFields.forEach((field,index)=>{const score=output.declared_raw_medians![field];value[1+index*6+score]!++;if(score>=4)value[43+index]!++;});[output.declared_displayable_pass,output.declared_usable_pass,output.critical_fail_codes!.length>0,output.declared_t1_severe,output.declared_p1_major].forEach((flag,index)=>{if(flag)value[50+index]!++;});}return value;}
function add(target:Float64Array,source:Float64Array):void {for(let i=0;i<vectorLength;i++)target[i]!+=source[i]!;}
function points(v:Float64Array):readonly StatisticFraction[]|null {
  const n=v[0]!;if(n===0)return null;const result:StatisticFraction[]=[];
  for(let field=0;field<7;field++){let cumulative=0,low=-1,high=-1;const lowRank=Math.floor((n+1)/2),highRank=Math.floor(n/2)+1;for(let category=0;category<6;category++){cumulative+=v[1+field*6+category]!;if(low===-1&&cumulative>=lowRank)low=category;if(cumulative>=highRank){high=category;break;}}result.push(fraction(low+high,2));}
  for(let index=43;index<55;index++)result.push(fraction(v[index]!,n));return result;
}
interface Block {id:string;a:Float64Array;b:Float64Array|null;}
interface Analysis {blocks:Block[];pointA:readonly StatisticFraction[]|null;pointB:readonly StatisticFraction[]|null;point:readonly StatisticFraction[]|null;seed:string;findings:string[];paired:boolean;countA:number;countB:number|null;}
function observations(analysis:Analysis,workAllowed:boolean):StatisticalObservation[] {
  const draws=analysis.blocks.length,baseFindings=[...analysis.findings];if(!workAllowed)baseFindings.push("WORKLOAD_BOUND_EXCEEDED");
  const samples=statisticsFunctionals.map(()=>[] as number[]);let defined=0;
  if(baseFindings.length===0&&analysis.point){const next=stream(analysis.seed);for(let replicate=0;replicate<10000;replicate++){const a=new Float64Array(vectorLength),b=analysis.paired?new Float64Array(vectorLength):null;for(let draw=0;draw<draws;draw++){const block=analysis.blocks[next(draws)]!;add(a,block.a);if(b)add(b,block.b!);}const pa=points(a),pb=b?points(b):null;if(pa===null||(b&&pb===null))continue;defined++;for(let index=0;index<statisticsFunctionals.length;index++)samples[index]!.push(analysis.paired?floating(subtract(pa[index]!,pb![index]!)):floating(pa[index]!));}}
  return statisticsFunctionals.map((functional,index)=>{
    const findings=[...baseFindings],point=analysis.point?.[index]??null;let interval:StatisticalObservation["interval"]=null;
    if(baseFindings.length===0&&point){const values=samples[index]!;if(defined!==10000)findings.push("UNDEFINED_REPLICATE");const rate=index>=7,componentA=analysis.pointA?.[index],componentB=analysis.pointB?.[index];if(rate&&[componentA,componentB].some(value=>value&&(value.numerator==="0"||value.numerator===value.denominator)))findings.push("BOUNDARY_BINARY_COMPONENT");if(defined===10000){values.sort((a,b)=>a-b);const lower=values[249]!,upper=values[9749]!;if(values[0]===values[9999]||lower===upper)findings.push("DEGENERATE_BOOTSTRAP");if(findings.length===0)interval={lower,upper};}}
    const incomplete=findings.some(value=>["INCOMPLETE_CLASSIFICATION","UNKNOWN_PROJECTION_MEMBERSHIP","INCOMPLETE_PAIRED_TUPLES","WORKLOAD_BOUND_EXCEEDED","UNSUPPORTED_COMPARISON_STAGE","INCOMPLETE_PRIMARY_FRAME"].includes(value)),insufficient=findings.some(value=>["TOO_FEW_SUBJECTS","TOO_FEW_OUTPUTS","TOO_FEW_PAIRED_CASES","EMPTY_POPULATION"].includes(value));
    const rateCounts=(value:StatisticFraction|null|undefined,n:number|null)=>index>=7&&value&&n!==null?{numerator:Number(BigInt(value.numerator)*BigInt(n)/BigInt(value.denominator)),denominator:n}:null;return {functional,point,component_a_point:analysis.pointA?.[index]??null,component_b_point:analysis.pointB?.[index]??null,component_a_rate_counts:rateCounts(analysis.pointA?.[index],analysis.countA),component_b_rate_counts:rateCounts(analysis.pointB?.[index],analysis.countB),interval,status:incomplete?"INCOMPLETE":insufficient?"INSUFFICIENT_POPULATION":interval?"INFORMATIVE_DECLARED_INTERVAL":"NON_INFORMATIVE",findings,interval_arithmetic:"IEEE754_FLOAT64",defined_replicates:defined};
  });
}
function rawAgreement(input:EvaluationStatisticInput,configurationId:string):RawAgreementObservation[] {
  const outputs=input.metric_report.result.outputs.filter(output=>output.partition==="primary"&&output.configuration_id===configurationId),rows=input.metric_report.input.rating_report.input.ratings;
  return ratingScoreFields.map(dimension=>{
    const frequencies=Array<number>(6).fill(0),triples:number[][]=[],hashes:string[]=[];let exactCount=0,withinCount=0;
    for(const output of outputs){const raw=rows.filter(row=>row.output_id===output.output_id);hashes.push(...raw.map(sha256EvaluationManifest));if(raw.length!==3||raw.some(row=>!row.rating_valid||row[dimension]===null))continue;const triple=raw.map(row=>row[dimension]!);triples.push(triple);triple.forEach(score=>{frequencies[score]!++;});for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){if(triple[a]===triple[b])exactCount++;if(Math.abs(triple[a]!-triple[b]!)<=1)withinCount++;}}
    const complete=triples.length===outputs.length&&outputs.length>0,pairs=outputs.length*3,n=triples.length*3;
    let observed:StatisticFraction|null=null,expected:StatisticFraction|null=null,alpha:StatisticFraction|null=null;
    if(complete){const distances=Array.from({length:6},()=>Array<bigint>(6).fill(BigInt(0)));for(let a=0;a<6;a++)for(let b=a+1;b<6;b++){let sum=0;for(let category=a;category<=b;category++)sum+=frequencies[category]!;const doubled=BigInt(2*sum-frequencies[a]!-frequencies[b]!);distances[a]![b]=doubled*doubled;distances[b]![a]=distances[a]![b]!;}
      let observedSum=BigInt(0),expectedSum=BigInt(0);for(const triple of triples)for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)observedSum+=distances[triple[a]!]![triple[b]!]!;for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)expectedSum+=BigInt(frequencies[a]!)*BigInt(frequencies[b]!)*distances[a]![b]!;
      observed=fraction(observedSum,BigInt(4)*BigInt(n));expected=fraction(BigInt(2)*expectedSum,BigInt(4)*BigInt(n)*BigInt(n-1));if(expectedSum!==BigInt(0))alpha=fraction(BigInt(2)*expectedSum-BigInt(n-1)*observedSum,BigInt(2)*expectedSum);
    }
    const findings=!complete?[outputs.length===0?"EMPTY_POPULATION":"INCOMPLETE_RAW_TRIPLES"]:alpha===null?["EXPECTED_DISAGREEMENT_ZERO"]:[];
    return {configuration_id:configurationId,dimension,population:"primary_all_retained_generated_raw_triples",output_count:outputs.length,complete_triple_count:triples.length,unknown_triple_count:outputs.length-triples.length,raw_rating_sha256s:hashes.sort(ordered),category_frequencies:frequencies,pair_denominator:pairs,known_exact_pair_count:exactCount,known_within_one_pair_count:withinCount,exact_agreement:complete?fraction(exactCount,pairs):null,within_one_agreement:complete?fraction(withinCount,pairs):null,ordinal_alpha:alpha,observed_disagreement:observed,expected_disagreement:expected,status:!complete?"INCOMPLETE":alpha===null?"UNDEFINED_ALPHA":"COMPLETE_DECLARED_RAW_AGREEMENT",findings};
  });
}
export function evaluateEvaluationStatistics(value:unknown):{input:EvaluationStatisticInput;result:EvaluationStatisticResult} {
  return safe(()=>{
    const input=validateEvaluationStatisticInput(value),metric=input.metric_report,bundle=metric.input.cost_report.input.bundle,plan=bundle.plan,configurationIds=plan.configurations.map(config=>config.configuration_id).sort(ordered),allOutputs=metric.result.outputs.filter(output=>output.partition==="primary");
    const seed=(configurationA:string,configurationB:string|null,population:string,unit:string)=>sha256EvaluationManifest({statistics_version:evaluationStatisticsVersion,seed_stream:statisticsMethods.seed_stream,seed:input.analysis_manifest.seed,plan_sha256:metric.result.plan_sha256,run_id:plan.run_id,configuration_a_id:configurationA,configuration_b_id:configurationB,population,unit});
    const declaredPrimary=new Set(metric.input.coverage_report.input.preregistration.primary_case_ids),primaryFrameOkay=declaredPrimary.size===plan.cases.length&&plan.cases.every(item=>declaredPrimary.has(item.case_id))&&!metric.input.coverage_report.result.findings.some(finding=>["STAGE_CASE_COUNT","REPETITION_OR_SLOT_COVERAGE","PRIMARY_SLOT_COUNT","STAGE_PREVIEW_COUNT","UNSUPPORTED_DECLARED"].includes(finding));
    const analyses:Analysis[]=[],populationRecords:Omit<StatisticalPopulation,"observations">[]=[],comparisonRecords:Omit<StatisticalComparison,"observations">[]=[];
    const populationKeys=["primary_all_generated","primary_declared_gate_passed"] as const;
    const selected=(outputs:readonly DeclaredOutputMetric[],projected:boolean)=>projected?outputs.filter(output=>output.declared_gate_passed===true):[...outputs];
    const complete=(output:DeclaredOutputMetric)=>output.status==="COMPLETE_DECLARED_CLASSIFICATION"&&output.declared_raw_medians!==null&&output.critical_fail_codes!==null;
    const subjectIds=(outputs:readonly DeclaredOutputMetric[])=>[...new Set(outputs.map(output=>output.subject_id))].sort(ordered);
    for(const configurationId of configurationIds)for(const population of populationKeys){
      const projected=population==="primary_declared_gate_passed",full=allOutputs.filter(output=>output.configuration_id===configurationId),chosen=selected(full,projected),subjects=subjectIds(chosen),unknown=projected?full.filter(output=>output.declared_gate_passed===null).length:0,incomplete=chosen.filter(output=>!complete(output)).length,findings:string[]=[];
      if(["T1","P1"].includes(plan.stage)&&!primaryFrameOkay)findings.push("INCOMPLETE_PRIMARY_FRAME");if(unknown)findings.push("UNKNOWN_PROJECTION_MEMBERSHIP");if(incomplete)findings.push("INCOMPLETE_CLASSIFICATION");if(subjects.length<10)findings.push("TOO_FEW_SUBJECTS");if(chosen.length<20)findings.push("TOO_FEW_OUTPUTS");if(chosen.length===0)findings.push("EMPTY_POPULATION");
      const valid=chosen.filter(complete),blocks=subjects.map(id=>({id,a:vector(valid.filter(output=>output.subject_id===id)),b:null})),pa=unknown||incomplete?null:points(vector(valid)),hash=seed(configurationId,null,population,"subject");
      analyses.push({blocks,pointA:pa,pointB:null,point:pa,seed:hash,findings,paired:false,countA:chosen.length,countB:null});populationRecords.push({configuration_id:configurationId,population,unit:"subject",output_count:chosen.length,contributing_subject_count:subjects.length,unknown_membership_count:unknown,incomplete_classification_count:incomplete,seed_sha256:hash});
    }
    const primaryCaseIds=new Set(metric.input.coverage_report.input.preregistration.primary_case_ids),planCaseIds=new Set(plan.cases.map(item=>item.case_id)),caseFrameComplete=primaryCaseIds.size===planCaseIds.size&&[...planCaseIds].every(id=>primaryCaseIds.has(id))&&!metric.input.coverage_report.result.findings.includes("STAGE_CASE_COUNT"),primarySlots=plan.slots.filter(slot=>planCaseIds.has(slot.case_id)&&(plan.stage!=="P1"||slot.repetition===0)),outputBySlot=new Map(allOutputs.map(output=>[output.slot_id,output]));
    const tuple=(slot:typeof plan.slots[number])=>`${slot.case_id}|${slot.repetition}|${slot.variant_index}`;
    for(let aIndex=0;aIndex<configurationIds.length;aIndex++)for(let bIndex=aIndex+1;bIndex<configurationIds.length;bIndex++){
      const aId=configurationIds[aIndex]!,bId=configurationIds[bIndex]!,slotsA=primarySlots.filter(slot=>slot.configuration_id===aId),slotsB=primarySlots.filter(slot=>slot.configuration_id===bId),tuplesA=new Set(slotsA.map(tuple)),tuplesB=new Set(slotsB.map(tuple)),caseIds=[...new Set([...planCaseIds,...primaryCaseIds,...slotsA.map(slot=>slot.case_id),...slotsB.map(slot=>slot.case_id)])].sort(ordered);const required=(configurationId:string)=>{const config=plan.configurations.find(config=>config.configuration_id===configurationId)!,reps=plan.stage==="T1"?2:plan.stage==="P1"?1:metric.input.coverage_report.input.preregistration.h0_repetitions??1,previews=plan.stage==="T1"?1:plan.stage==="P1"?3:config.preview_count;ensure(planCaseIds.size*reps*previews<=statisticsBounds.required_tuple_frame);const keys=new Set<string>();for(const id of planCaseIds)for(let repetition=0;repetition<reps;repetition++)for(let variant=0;variant<previews;variant++)keys.add(`${id}|${repetition}|${variant}`);return keys;};const requiredA=required(aId),requiredB=required(bId);
      const tupleCoverage=caseFrameComplete&&requiredA.size>0&&slotsA.length===requiredA.size&&slotsB.length===requiredB.size&&requiredA.size===requiredB.size&&[...requiredA].every(key=>requiredB.has(key)&&tuplesA.has(key)&&tuplesB.has(key))&&[...slotsA,...slotsB].every(slot=>outputBySlot.has(slot.slot_id)),fullA=allOutputs.filter(output=>output.configuration_id===aId),fullB=allOutputs.filter(output=>output.configuration_id===bId);
      const matchedCases=caseIds.filter(id=>{const ca=slotsA.filter(slot=>slot.case_id===id),cb=slotsB.filter(slot=>slot.case_id===id);const expected=[...requiredA].filter(key=>key.startsWith(`${id}|`));return expected.length>0&&ca.length===expected.length&&cb.length===expected.length&&expected.every(key=>tuplesA.has(key)&&tuplesB.has(key))&&[...ca,...cb].every(slot=>outputBySlot.has(slot.slot_id));}).length;
      for(const population of populationKeys){const projected=population==="primary_declared_gate_passed",chosenA=selected(fullA,projected),chosenB=selected(fullB,projected),subjectsA=subjectIds(chosenA),subjectsB=subjectIds(chosenB),jointCases=caseIds.filter(id=>chosenA.some(output=>output.case_id===id)&&chosenB.some(output=>output.case_id===id)).length,unknown=projected&&[...fullA,...fullB].some(output=>output.declared_gate_passed===null),incomplete=[...chosenA,...chosenB].some(output=>!complete(output));
        const pa=unknown||chosenA.some(output=>!complete(output))?null:points(vector(chosenA)),pb=unknown||chosenB.some(output=>!complete(output))?null:points(vector(chosenB));
        const units:StatisticalComparison["unit"][]=plan.stage==="T1"?["paired_case","paired_subject_sensitivity"]:["paired_subject"];
        for(const unit of units){const findings:string[]=[];if(!tupleCoverage)findings.push("INCOMPLETE_PAIRED_TUPLES");if(unknown)findings.push("UNKNOWN_PROJECTION_MEMBERSHIP");if(incomplete)findings.push("INCOMPLETE_CLASSIFICATION");if(!["T1","P1"].includes(plan.stage))findings.push("UNSUPPORTED_COMPARISON_STAGE");if(subjectsA.length<10||subjectsB.length<10)findings.push("TOO_FEW_SUBJECTS");if(chosenA.length<20||chosenB.length<20)findings.push("TOO_FEW_OUTPUTS");if(unit==="paired_case"&&jointCases<20)findings.push("TOO_FEW_PAIRED_CASES");
          const validA=chosenA.filter(complete),validB=chosenB.filter(complete),caseMap=new Map(plan.cases.map(item=>[item.case_id,item.subject_id])),ids=unit==="paired_case"?caseIds:[...new Set(caseIds.map(id=>caseMap.get(id)).filter((id):id is string=>id!==undefined))].sort(ordered),blocks=ids.map(id=>({id,a:vector(validA.filter(output=>(unit==="paired_case"?output.case_id:output.subject_id)===id)),b:vector(validB.filter(output=>(unit==="paired_case"?output.case_id:output.subject_id)===id))})),hash=seed(aId,bId,population,unit),point=tupleCoverage&&pa&&pb&&!unknown&&!incomplete?pa.map((value,index)=>subtract(value,pb[index]!)):null;
          analyses.push({blocks,pointA:pa,pointB:pb,point,seed:hash,findings,paired:true,countA:chosenA.length,countB:chosenB.length});comparisonRecords.push({configuration_a_id:aId,configuration_b_id:bId,direction:"A_minus_B",population,unit,complete_tuple_coverage:tupleCoverage,expected_tuple_count_a:requiredA.size,expected_tuple_count_b:requiredB.size,declared_tuple_count_a:slotsA.length,declared_tuple_count_b:slotsB.length,matched_case_count:matchedCases,jointly_contributing_case_count:jointCases,contributing_subject_count_a:subjectsA.length,contributing_subject_count_b:subjectsB.length,output_count_a:chosenA.length,output_count_b:chosenB.length,seed_sha256:hash});
        }
      }
    }
    const planned=analyses.reduce((sum,analysis)=>sum+analysis.blocks.length*10000,0),allowed=planned<=statisticsBounds.unit_draws,results=analyses.map(analysis=>observations(analysis,allowed)),populations=populationRecords.map((record,index)=>({...record,observations:results[index]!})),comparisons=comparisonRecords.map((record,index)=>({...record,observations:results[populationRecords.length+index]!})),agreement=configurationIds.flatMap(id=>rawAgreement(input,id));
    const findings:string[]=[];if(!allowed)findings.push("WORKLOAD_BOUND_EXCEEDED");if(results.some(values=>values.some(value=>value.status==="INCOMPLETE")))findings.push("STATISTICAL_POPULATION_INCOMPLETE");if(agreement.some(value=>value.status==="INCOMPLETE"))findings.push("RAW_AGREEMENT_INCOMPLETE");
    return {input,result:{statistics_version:evaluationStatisticsVersion,scope:"declared_primary_statistical_metadata",input_sha256:sha256EvaluationManifest(input),metric_report_sha256:input.metric_report_sha256,analysis_manifest_sha256:input.analysis_manifest_sha256,status:findings.length?"INCOMPLETE":"COMPLETE_DECLARED_STATISTICAL_INPUTS",findings,source_metric_findings:metric.result.findings,planned_unit_draws:planned,resampling_executed:allowed&&analyses.some(analysis=>analysis.findings.length===0&&analysis.point!==null),populations,comparisons,raw_agreement:agreement,preregistration_authenticity:"NOT_EVALUATED",sampling_authority:"NOT_EVALUATED",reviewer_qualification:"NOT_EVALUATED",blinding:"NOT_EVALUATED",media_authorization:"NOT_EVALUATED",cohort_intervals:"NOT_EVALUATED",cost_intervals:"NOT_EVALUATED",latency_intervals:"NOT_EVALUATED",agreement_intervals:"NOT_EVALUATED",nominal_coverage_calibration:"NOT_EVALUATED",equivalence_conclusions:"NOT_EVALUATED",multiplicity_control:"NOT_EVALUATED",full_protocol_inference:"NOT_EVALUATED",actual_display:"NOT_EVALUATED",t1_quality_gate:"NOT_EVALUATED",p1_quality_gate:"NOT_EVALUATED",release_gate:"NOT_EVALUATED",provider_selection:"NOT_EVALUATED"}};
  });
}
export function serializeEvaluationStatisticReport(value:unknown):string {return safe(()=>{preflight(value,statisticsBounds.report_nodes);const report=object(value,["input","result"]),rebuilt=evaluateEvaluationStatistics(report.input);exact(report.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});}





