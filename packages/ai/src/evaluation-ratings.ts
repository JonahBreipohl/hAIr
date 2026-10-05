import { types } from "node:util";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import { validateEvaluationRecordBundle, type EvaluationRecordBundle } from "./evaluation-records";

export const evaluationRatingsVersion="hair-evaluation-ratings-v1";
export const ratingScoreFields=Object.freeze(["identity_score","adherence_score","locality_score","boundary_score","realism_score","color_score","consultation_usefulness_score"] as const);
export const ratingCriticalCodes=Object.freeze(["CF_IDENTITY","CF_LOCALITY","CF_ANATOMY","CF_SUBJECT","CF_REQUEST","CF_SAFETY","CF_PRIVACY","CF_CORRUPT"] as const);
export const ratingMajorCodes=Object.freeze(["MA_IDENTITY","MA_ANATOMY","MA_HAIRLINE","MA_BACKGROUND"] as const);
export const ratingArtifactTags=Object.freeze(["face_drift","skin_tone_shift","age_shift","expression_shift","hairline","scalp_or_part","ear","forehead_or_brow","glasses","accessory","neck","shoulder","clothing","background","pose","extra_or_missing_subject","reference_face_transfer","halo_or_seam","melt_or_fusion","duplicate_feature","strand_or_texture","braid_loc_twist_structure","density","gravity_or_geometry","lighting_or_shadow","color_spill","color_mismatch","request_miss","watermark_or_text","other"] as const);
export const ratingTriggerCodes=Object.freeze(["CRITICAL_FAIL","CRITICAL_RANGE","BOUNDARY_LOW_SCORE","INVALID_OBSERVATION","VALIDITY_DISAGREEMENT","AUTOMATED_GATE_ESCAPE","CONFIGURATION_DECISION_CHANGED"] as const);
const invalidReasons=Object.freeze(["viewer_failure","source_corrupt","reference_mismatch","manifest_mismatch","other_review_required"] as const);
type ScoreField=typeof ratingScoreFields[number];type CriticalCode=typeof ratingCriticalCodes[number];type MajorCode=typeof ratingMajorCodes[number];type Trigger=typeof ratingTriggerCodes[number];type InvalidReason=typeof invalidReasons[number];
interface Lock {readonly artifact_id:string;readonly content_sha256:string;}
interface Assignment {readonly assignment_id:string;readonly output_id:string;readonly rater_id:string;readonly rater_role:"licensed_stylist"|"general";readonly assignment_position:number;}
export interface RatingAssignmentManifest {
  readonly schema_version:"1.0.0";readonly ratings_version:typeof evaluationRatingsVersion;readonly protocol_id:"hair-eval-v1";readonly scorecard_id:"hair-scorecard-v1";readonly run_id:string;
  readonly frozen_at_utc:string;readonly population_output_ids:readonly string[];readonly assignments:readonly Assignment[];
}
export type DeclaredRawRating={
  readonly record_id:string;readonly rating_id:string;readonly protocol_id:"hair-eval-v1";readonly scorecard_id:"hair-scorecard-v1";readonly run_id:string;
  readonly assignment_id:string;readonly output_id:string;readonly case_id:string;readonly rater_id:string;
  readonly viewer_artifact:Lock;readonly started_at_utc:string;readonly completed_at_utc:string;readonly submitted_at_utc:string;
  readonly rating_valid:boolean;readonly invalid_reason:InvalidReason|null;
  readonly critical_fail_codes:readonly CriticalCode[];readonly major_artifact_codes:readonly MajorCode[];readonly artifact_tags:readonly typeof ratingArtifactTags[number][];
  readonly confidence:"high"|"medium"|"low";readonly rationale_artifact:Lock|null;
}&Readonly<Record<ScoreField,number|null>>;
export interface RatingControlObservation {
  readonly record_id:string;readonly output_id:string;readonly revision:number;readonly previous_record_sha256:string|null;readonly recorded_at_utc:string;
  readonly automated_display_gate:"passed"|"rejected"|"unknown";readonly configuration_decision_sensitivity:"changed"|"unchanged"|"unknown";
}
export interface AdjudicatorVote {
  readonly reviewer_id:string;readonly reviewer_role:"licensed_stylist"|"evaluation_safety_lead"|"independent_resolver";
  readonly started_at_utc:string;readonly completed_at_utc:string;readonly input_valid:boolean;readonly invalid_reason:InvalidReason|null;
  readonly critical_fail_codes:readonly CriticalCode[];readonly major_artifact_codes:readonly MajorCode[];
  readonly production_displayable:boolean;readonly rationale_artifact:Lock;
}
export interface DeclaredAdjudication {
  readonly record_id:string;readonly adjudication_id:string;readonly protocol_id:"hair-eval-v1";readonly scorecard_id:"hair-scorecard-v1";
  readonly run_id:string;readonly output_id:string;readonly revision:number;readonly previous_record_sha256:string|null;
  readonly reviewed_rating_sha256s:readonly string[];readonly observation_record_sha256:string;readonly trigger_codes:readonly Trigger[];
  readonly started_at_utc:string;readonly completed_at_utc:string;readonly votes:readonly AdjudicatorVote[];
}
export interface EvaluationRatingInput {
  readonly bundle:EvaluationRecordBundle;readonly bundle_sha256:string;readonly locked_at_utc:string;
  readonly scorecard_lock:Lock&{readonly scorecard_id:"hair-scorecard-v1"};readonly assignments:RatingAssignmentManifest;readonly assignments_sha256:string;
  readonly ratings:readonly DeclaredRawRating[];readonly observations:readonly RatingControlObservation[];readonly observations_sha256:string;readonly adjudications:readonly DeclaredAdjudication[];
}
const denial="Evaluation ratings rejected.";
function ensure(value:unknown):asserts value {if(!value)throw new TypeError(denial);}
function safe<T>(operation:()=>T):T {try{return operation();}catch{throw new TypeError(denial);}}
/** Descriptor-only JSON preflight protects inherited validators from nested
 * proxies/accessors and bounds depth, cycles and whole-input traversal. */
function preflight(value:unknown,maxNodes=1000000):void {
  let nodes=0;const ancestors=new Set<object>();
  const visit=(value:unknown,depth:number):void=>{
    ensure(++nodes<=maxNodes&&depth<=64&&!types.isProxy(value));
    if(typeof value==="string"){ensure(value.length<=128);return;}if(value===null||typeof value==="boolean")return;
    if(typeof value==="number"){ensure(Number.isFinite(value));return;}
    ensure(typeof value==="object"&&value!==null&&!ancestors.has(value));
    const array=Array.isArray(value);ensure(Object.getPrototypeOf(value)===(array?Array.prototype:Object.prototype)||(!array&&Object.getPrototypeOf(value)===null));
    const keys=Reflect.ownKeys(value);ensure(keys.every(key=>typeof key==="string"&&key.length<=64));
    if(array){const length=Object.getOwnPropertyDescriptor(value,"length")!.value as number;ensure(length<=10000&&keys.length===length+1);for(let i=0;i<length;i++)ensure(Object.getOwnPropertyDescriptor(value,String(i))?.enumerable===true);}
    else ensure(keys.length<=64);
    ancestors.add(value);for(const key of keys){if(array&&key==="length")continue;const descriptor=Object.getOwnPropertyDescriptor(value,key);ensure(descriptor?.enumerable===true&&"value" in descriptor);visit(descriptor.value,depth+1);}ancestors.delete(value);
  };visit(value,0);
}
function object(value:unknown,fields:readonly string[]):Record<string,unknown>{ensure(value!==null&&typeof value==="object"&&!Array.isArray(value));const keys=Object.keys(value);ensure(keys.length===fields.length&&keys.every(key=>fields.includes(key)));return value as Record<string,unknown>;}
function list(value:unknown,max=8192):unknown[]{ensure(Array.isArray(value)&&value.length<=max);return value;}
function integer(value:unknown,max=Number.MAX_SAFE_INTEGER,min=0):asserts value is number {ensure(typeof value==="number"&&Number.isSafeInteger(value)&&value>=min&&value<=max);}
function id(value:unknown,prefix:string):asserts value is string {ensure(typeof value==="string"&&new RegExp(`^${prefix}-[a-f0-9]{16}$`).test(value));}
function hash(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^[a-f0-9]{64}$/.test(value));}
function instant(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);}
function codes(value:unknown,allowed:readonly string[]):void {const items=list(value,allowed.length);ensure(items.every(item=>typeof item==="string"&&allowed.includes(item))&&new Set(items).size===items.length);}
function sameSet(a:readonly string[],b:readonly string[]):boolean {return a.length===b.length&&a.every(value=>b.includes(value));}
function decision(vote:AdjudicatorVote):unknown {return {input_valid:vote.input_valid,invalid_reason:vote.invalid_reason,critical_fail_codes:[...vote.critical_fail_codes].sort(),major_artifact_codes:[...vote.major_artifact_codes].sort(),production_displayable:vote.production_displayable};}
function split(votes:readonly AdjudicatorVote[]):boolean{return canonicalEvaluationJson(decision(votes[0]!))!==canonicalEvaluationJson(decision(votes[1]!));}
function finalVote(round:DeclaredAdjudication):AdjudicatorVote|null{return round.votes[split(round.votes)?2:0]??null;}
function triggers(rows:readonly DeclaredRawRating[],observation:RatingControlObservation,history:readonly RatingControlObservation[]=[observation]):Trigger[] {
  const flags=new Set<Trigger>(),valid=rows.filter(row=>row.rating_valid);
  if(rows.some(row=>row.critical_fail_codes.length>0))flags.add("CRITICAL_FAIL");
  if(rows.some(row=>!row.rating_valid))flags.add("INVALID_OBSERVATION");
  if(new Set(rows.map(row=>`${row.rating_valid}|${row.invalid_reason??"none"}`)).size>1)flags.add("VALIDITY_DISAGREEMENT");
  for(const field of ["identity_score","adherence_score","locality_score"] as const){const scores=valid.map(row=>row[field]!).sort((a,b)=>a-b);if(scores.length>=2&&scores[scores.length-1]!-scores[0]!>=3)flags.add("CRITICAL_RANGE");if(scores.length===3&&scores[1]===4&&scores.some(score=>score<=2))flags.add("BOUNDARY_LOW_SCORE");}
  if(history.some(record=>record.automated_display_gate==="passed")&&rows.some(row=>row.major_artifact_codes.length>0||row.critical_fail_codes.some(code=>["CF_IDENTITY","CF_ANATOMY"].includes(code))))flags.add("AUTOMATED_GATE_ESCAPE");
  if(history.some(record=>record.configuration_decision_sensitivity==="changed"))flags.add("CONFIGURATION_DECISION_CHANGED");
  return ratingTriggerCodes.filter(code=>flags.has(code));
}
export function validateEvaluationRatingInput(value:unknown):EvaluationRatingInput {
  return safe(()=>{
    preflight(value);const raw=object(value,["bundle","bundle_sha256","locked_at_utc","scorecard_lock","assignments","assignments_sha256","ratings","observations","observations_sha256","adjudications"]);
    const bundle=validateEvaluationRecordBundle(raw.bundle);hash(raw.bundle_sha256);ensure(sha256EvaluationManifest(bundle)===raw.bundle_sha256);instant(raw.locked_at_utc);ensure(raw.locked_at_utc>=bundle.plan.created_at_utc&&bundle.outputs.length<=1024);ensure([...bundle.plan.assets,...bundle.plan.cases,...bundle.plan.configurations,...bundle.attempts,...bundle.outputs].every(record=>record.created_at_utc<=raw.locked_at_utc!));
    const artifactHashes=new Map<string,string>(),artifactRoles=new Map<string,string>();
    const register=(value:unknown,role:string,withScorecard=false):void=>{const lock=object(value,withScorecard?["scorecard_id","artifact_id","content_sha256"]:["artifact_id","content_sha256"]);id(lock.artifact_id,"artifact");hash(lock.content_sha256);if(withScorecard)ensure(lock.scorecard_id==="hair-scorecard-v1");const prior=artifactHashes.get(lock.artifact_id);ensure(prior===undefined||prior===lock.content_sha256);const priorRole=artifactRoles.get(lock.artifact_id);ensure(priorRole===undefined||priorRole===role);artifactHashes.set(lock.artifact_id,lock.content_sha256);artifactRoles.set(lock.artifact_id,role);};
    bundle.plan.cases.forEach(item=>[item.specification,item.prompt_inputs].forEach(lock=>register(lock,"bundle")));
    bundle.plan.configurations.forEach(config=>[config.model_snapshot,config.moderation_policy,config.prompt_template,config.descriptor_conversion,config.preprocessing,config.generation_parameters,config.segmentation,config.protected_region_definition,config.terms_snapshot].forEach(lock=>{if(lock)register(lock,"bundle");}));
    register(raw.scorecard_lock,"scorecard",true);
    const manifest=object(raw.assignments,["schema_version","ratings_version","protocol_id","scorecard_id","run_id","frozen_at_utc","population_output_ids","assignments"]);
    ensure(manifest.schema_version==="1.0.0"&&manifest.ratings_version===evaluationRatingsVersion&&manifest.protocol_id===bundle.plan.protocol_id&&manifest.scorecard_id==="hair-scorecard-v1"&&manifest.run_id===bundle.plan.run_id);
    instant(manifest.frozen_at_utc);ensure(manifest.frozen_at_utc>=bundle.plan.created_at_utc&&manifest.frozen_at_utc<=raw.locked_at_utc);
    const outputs=new Map(bundle.outputs.map(output=>[output.output_id,output]));const slots=new Map(bundle.plan.slots.map(slot=>[slot.slot_id,slot]));
    const population=list(manifest.population_output_ids,1024);population.forEach(value=>id(value,"output"));ensure(new Set(population).size===population.length&&population.length===outputs.size&&population.every(value=>outputs.has(value as string)));
    ensure(bundle.outputs.every(output=>output.created_at_utc<=manifest.frozen_at_utc!));
    const assignments=list(manifest.assignments),byAssignment=new Map<string,Assignment>(),actorRoles=new Map<string,string>(),assignmentPairs=new Set<string>(),positions=new Set<string>();ensure(assignments.length===outputs.size*3);
    for(const value of assignments){const assignment=object(value,["assignment_id","output_id","rater_id","rater_role","assignment_position"]);id(assignment.assignment_id,"assignment");id(assignment.output_id,"output");id(assignment.rater_id,"rater");ensure(outputs.has(assignment.output_id)&&["licensed_stylist","general"].includes(assignment.rater_role as string));integer(assignment.assignment_position,1023);ensure(!byAssignment.has(assignment.assignment_id));const pair=`${assignment.output_id}|${assignment.rater_id}`,position=`${assignment.rater_id}|${assignment.assignment_position}`;ensure(!assignmentPairs.has(pair)&&!positions.has(position));assignmentPairs.add(pair);positions.add(position);const priorRole=actorRoles.get(assignment.rater_id);ensure(priorRole===undefined||priorRole===assignment.rater_role);actorRoles.set(assignment.rater_id,assignment.rater_role as string);byAssignment.set(assignment.assignment_id,assignment as unknown as Assignment);}
    for(const output of outputs.values()){const item=[...byAssignment.values()].filter(assignment=>assignment.output_id===output.output_id);ensure(item.length===3&&item.filter(a=>a.rater_role==="licensed_stylist").length===2&&item.filter(a=>a.rater_role==="general").length===1);}
    hash(raw.assignments_sha256);ensure(sha256EvaluationManifest(manifest)===raw.assignments_sha256);
    const recordIds=new Set([bundle.plan.record_id,...bundle.plan.assets.map(x=>x.record_id),...bundle.plan.cases.map(x=>x.record_id),...bundle.plan.configurations.map(x=>x.record_id),...bundle.attempts.map(x=>x.record_id),...bundle.outputs.map(x=>x.record_id)]);
    const recordId=(value:unknown):void=>{id(value,"record");ensure(!recordIds.has(value));recordIds.add(value);};
    const rows=list(raw.ratings),ratings:DeclaredRawRating[]=[],ratedAssignments=new Set<string>(),ratingIds=new Set<string>();let priorSubmission="";
    for(const value of rows){const row=object(value,["record_id","rating_id","protocol_id","scorecard_id","run_id","assignment_id","output_id","case_id","rater_id","viewer_artifact","started_at_utc","completed_at_utc","submitted_at_utc","rating_valid","invalid_reason","critical_fail_codes","major_artifact_codes","artifact_tags","confidence","rationale_artifact",...ratingScoreFields]);recordId(row.record_id);id(row.rating_id,"rating");ensure(!ratingIds.has(row.rating_id));ratingIds.add(row.rating_id);ensure(row.protocol_id===bundle.plan.protocol_id&&row.scorecard_id==="hair-scorecard-v1"&&row.run_id===bundle.plan.run_id);id(row.assignment_id,"assignment");id(row.output_id,"output");id(row.case_id,"case");id(row.rater_id,"rater");const assignment=byAssignment.get(row.assignment_id),output=outputs.get(row.output_id);ensure(assignment&&output&&!ratedAssignments.has(row.assignment_id)&&assignment.output_id===row.output_id&&assignment.rater_id===row.rater_id&&slots.get(output.slot_id)!.case_id===row.case_id);ratedAssignments.add(row.assignment_id);
      register(row.viewer_artifact,"viewer");instant(row.started_at_utc);instant(row.completed_at_utc);instant(row.submitted_at_utc);ensure(manifest.frozen_at_utc<=row.started_at_utc&&row.started_at_utc<=row.completed_at_utc&&row.completed_at_utc<=row.submitted_at_utc&&row.submitted_at_utc<=raw.locked_at_utc);
      ensure(row.submitted_at_utc>=priorSubmission);priorSubmission=row.submitted_at_utc;
      ensure(typeof row.rating_valid==="boolean"&&["high","medium","low"].includes(row.confidence as string));codes(row.critical_fail_codes,ratingCriticalCodes);codes(row.major_artifact_codes,ratingMajorCodes);codes(row.artifact_tags,ratingArtifactTags);
      if(row.rating_valid){ensure(row.invalid_reason===null);ratingScoreFields.forEach(field=>integer(row[field],5));}else{ensure(invalidReasons.includes(row.invalid_reason as InvalidReason));ratingScoreFields.forEach(field=>ensure(row[field]===null));}
      if(row.rationale_artifact!==null)register(row.rationale_artifact,"rationale");ensure(!(row.critical_fail_codes as unknown[]).length||row.rationale_artifact!==null);ensure(!(row.major_artifact_codes as unknown[]).length||row.rationale_artifact!==null);ensure(!(row.artifact_tags as string[]).includes("other")||row.rationale_artifact!==null);
      ratings.push(row as unknown as DeclaredRawRating);
    }
    const observationValues=list(raw.observations),observationByHash=new Map<string,RatingControlObservation>(),latestObservations=new Map<string,RatingControlObservation>();
    for(const value of observationValues){const observation=object(value,["record_id","output_id","revision","previous_record_sha256","recorded_at_utc","automated_display_gate","configuration_decision_sensitivity"]);recordId(observation.record_id);id(observation.output_id,"output");ensure(outputs.has(observation.output_id));integer(observation.revision,1023);instant(observation.recorded_at_utc);ensure(observation.recorded_at_utc>=outputs.get(observation.output_id)!.created_at_utc&&observation.recorded_at_utc<=raw.locked_at_utc);ensure(["passed","rejected","unknown"].includes(observation.automated_display_gate as string)&&["changed","unchanged","unknown"].includes(observation.configuration_decision_sensitivity as string));const previous=latestObservations.get(observation.output_id);if(previous){ensure(observation.revision===previous.revision+1&&observation.previous_record_sha256===sha256EvaluationManifest(previous)&&observation.recorded_at_utc>=previous.recorded_at_utc);}else ensure(observation.revision===0&&observation.previous_record_sha256===null);const record=observation as unknown as RatingControlObservation;latestObservations.set(record.output_id,record);observationByHash.set(sha256EvaluationManifest(record),record);}
    ensure(latestObservations.size===outputs.size);hash(raw.observations_sha256);ensure(sha256EvaluationManifest(observationValues)===raw.observations_sha256);
    const rounds=list(raw.adjudications,1024),latestRounds=new Map<string,DeclaredAdjudication>(),roundOutputs=new Map<string,string>();
    for(const value of rounds){const round=object(value,["record_id","adjudication_id","protocol_id","scorecard_id","run_id","output_id","revision","previous_record_sha256","reviewed_rating_sha256s","observation_record_sha256","trigger_codes","started_at_utc","completed_at_utc","votes"]);recordId(round.record_id);id(round.adjudication_id,"adjudication");id(round.output_id,"output");ensure(outputs.has(round.output_id)&&round.protocol_id===bundle.plan.protocol_id&&round.scorecard_id==="hair-scorecard-v1"&&round.run_id===bundle.plan.run_id);integer(round.revision,1023);instant(round.started_at_utc);instant(round.completed_at_utc);ensure(round.started_at_utc<=round.completed_at_utc&&round.completed_at_utc<=raw.locked_at_utc);const previous=latestRounds.get(round.output_id);if(previous)ensure(round.adjudication_id===previous.adjudication_id&&round.revision===previous.revision+1&&round.previous_record_sha256===sha256EvaluationManifest(previous)&&round.started_at_utc>=previous.completed_at_utc);else ensure(round.revision===0&&round.previous_record_sha256===null);const priorOutput=roundOutputs.get(round.adjudication_id);ensure(priorOutput===undefined||priorOutput===round.output_id);roundOutputs.set(round.adjudication_id,round.output_id);
      const reviewed=list(round.reviewed_rating_sha256s,3);reviewed.forEach(hash);ensure(new Set(reviewed).size===reviewed.length);hash(round.observation_record_sha256);const observation=observationByHash.get(round.observation_record_sha256);ensure(observation&&observation.output_id===round.output_id&&observation.recorded_at_utc<=round.started_at_utc);
      ensure(round.started_at_utc>=manifest.frozen_at_utc!);
      const reviewedRows=ratings.filter(row=>row.output_id===round.output_id&&row.submitted_at_utc<=round.started_at_utc!);ensure(sameSet(reviewed as string[],reviewedRows.map(row=>sha256EvaluationManifest(row))));codes(round.trigger_codes,ratingTriggerCodes);const observationHistory=[...observationByHash.values()].filter(record=>record.output_id===round.output_id&&record.revision<=observation.revision);ensure(sameSet(round.trigger_codes as string[],triggers(reviewedRows,observation,observationHistory)));
      const votes=list(round.votes,3);ensure(votes.length>=2);const voteIds=new Set<string>(),primary=[...byAssignment.values()].filter(assignment=>assignment.output_id===round.output_id).map(assignment=>assignment.rater_id);
      for(const value of votes){const vote=object(value,["reviewer_id","reviewer_role","started_at_utc","completed_at_utc","input_valid","invalid_reason","critical_fail_codes","major_artifact_codes","production_displayable","rationale_artifact"]);id(vote.reviewer_id,"rater");ensure(!primary.includes(vote.reviewer_id)&&!voteIds.has(vote.reviewer_id));voteIds.add(vote.reviewer_id);ensure(["licensed_stylist","evaluation_safety_lead","independent_resolver"].includes(vote.reviewer_role as string));instant(vote.started_at_utc);instant(vote.completed_at_utc);ensure(vote.started_at_utc>=round.started_at_utc&&vote.completed_at_utc>=vote.started_at_utc&&vote.completed_at_utc<=round.completed_at_utc);ensure(typeof vote.input_valid==="boolean"&&typeof vote.production_displayable==="boolean");ensure(vote.input_valid?vote.invalid_reason===null:invalidReasons.includes(vote.invalid_reason as InvalidReason));codes(vote.critical_fail_codes,ratingCriticalCodes);codes(vote.major_artifact_codes,ratingMajorCodes);ensure(!vote.production_displayable||vote.input_valid&&(vote.critical_fail_codes as unknown[]).length===0);register(vote.rationale_artifact,"rationale");}
      const typedVotes=votes as unknown as AdjudicatorVote[];ensure(typedVotes.slice(0,2).some(vote=>vote.reviewer_role==="licensed_stylist")&&typedVotes.slice(0,2).some(vote=>vote.reviewer_role==="evaluation_safety_lead"));const hasSplit=split(typedVotes);ensure(hasSplit||typedVotes.length===2);if(hasSplit&&typedVotes.length===3)ensure(typedVotes[2]!.reviewer_role==="independent_resolver"&&typedVotes[2]!.started_at_utc>=typedVotes[0]!.completed_at_utc&&typedVotes[2]!.started_at_utc>=typedVotes[1]!.completed_at_utc);
      latestRounds.set(round.output_id,round as unknown as DeclaredAdjudication);
    }
    return JSON.parse(canonicalEvaluationJson({bundle,bundle_sha256:raw.bundle_sha256,locked_at_utc:raw.locked_at_utc,scorecard_lock:raw.scorecard_lock,assignments:manifest,assignments_sha256:raw.assignments_sha256,ratings,observations:observationValues,observations_sha256:raw.observations_sha256,adjudications:rounds})) as EvaluationRatingInput;
  });
}
interface OutputRatingResult {
  readonly output_id:string;readonly status:"COMPLETE_DECLARED_RATINGS"|"INCOMPLETE";readonly findings:readonly string[];
  readonly primary_rating_count:number;readonly valid_primary_rating_count:number;readonly raw_critical_fail_codes:readonly CriticalCode[];readonly raw_major_artifact_codes:readonly MajorCode[];
  readonly triggers:readonly Trigger[];readonly raw_rating_sha256s:readonly string[];readonly latest_observation_sha256:string;
  readonly declared_raw_medians:Readonly<Record<ScoreField,number>>|null;readonly latest_adjudication_sha256:string|null;
  readonly declared_classification:ReturnType<typeof decision>|null;readonly raw_flags_cleared_by_declaration:readonly CriticalCode[];
}
export interface EvaluationRatingResult {
  readonly ratings_version:typeof evaluationRatingsVersion;readonly scope:"all_retained_output_rating_metadata";readonly input_sha256:string;readonly bundle_sha256:string;
  readonly status:"COMPLETE_DECLARED_RATINGS"|"INCOMPLETE";readonly empty_population:boolean;readonly outputs:readonly OutputRatingResult[];
  readonly raw_rating_count:number;readonly observation_record_count:number;readonly adjudication_record_count:number;
  readonly media_authorization:"NOT_EVALUATED";readonly reviewer_qualification:"NOT_EVALUATED";readonly reviewer_identity:"NOT_EVALUATED";readonly calibration:"NOT_EVALUATED";
  readonly blinding:"NOT_EVALUATED";readonly assignment_order:"NOT_EVALUATED";readonly full_stage_coverage:"NOT_EVALUATED";readonly usable_result_denominator:"NOT_EVALUATED";readonly quality_gate:"NOT_EVALUATED";readonly release_gate:"NOT_EVALUATED";
}
export function evaluateEvaluationRatings(value:unknown):{input:EvaluationRatingInput;result:EvaluationRatingResult} {
  return safe(()=>{
    const input=validateEvaluationRatingInput(value),latestObservations=new Map<string,RatingControlObservation>(),latestRounds=new Map<string,DeclaredAdjudication>();input.observations.forEach(row=>latestObservations.set(row.output_id,row));input.adjudications.forEach(row=>latestRounds.set(row.output_id,row));
    const outputs=[...input.bundle.outputs].sort((a,b)=>a.output_id<b.output_id?-1:a.output_id>b.output_id?1:0).map(output=>{
      const rows=input.ratings.filter(row=>row.output_id===output.output_id),valid=rows.filter(row=>row.rating_valid),observation=latestObservations.get(output.output_id)!,round=latestRounds.get(output.output_id);const observationHistory=input.observations.filter(record=>record.output_id===output.output_id);const actualTriggers=triggers(rows,observation,observationHistory),rawHashes=rows.map(row=>sha256EvaluationManifest(row)).sort(),observationHash=sha256EvaluationManifest(observation),findings:string[]=[];
      if(rows.length!==3)findings.push("MISSING_PRIMARY_RATING");if(valid.length!==rows.length)findings.push("INVALID_PRIMARY_RATING");if(observation.automated_display_gate==="unknown"||observation.configuration_decision_sensitivity==="unknown")findings.push("OBSERVATION_UNAVAILABLE");
      if(observation.configuration_decision_sensitivity!=="unknown"&&rows.some(row=>row.submitted_at_utc>observation.recorded_at_utc))findings.push("OBSERVATION_STALE");
      const current=round!==undefined&&sameSet(round.reviewed_rating_sha256s,rawHashes)&&round.observation_record_sha256===observationHash&&sameSet(round.trigger_codes,actualTriggers);
      if(actualTriggers.length>0&&!round)findings.push("ADJUDICATION_REQUIRED");if(round&&!current)findings.push("ADJUDICATION_STALE");
      const vote=current?finalVote(round!):null;
      if(current&&vote===null)findings.push("ADJUDICATION_SPLIT_UNRESOLVED");
      if(vote&&((vote.major_artifact_codes.includes("MA_IDENTITY")&&!vote.critical_fail_codes.includes("CF_IDENTITY"))||(vote.major_artifact_codes.includes("MA_ANATOMY")&&!vote.critical_fail_codes.includes("CF_ANATOMY"))))findings.push("ADJUDICATION_CLASSIFICATION_CONFLICT");
      if(vote&&!vote.input_valid){findings.push(vote.invalid_reason==="other_review_required"?"ADJUDICATION_UNRESOLVED":"DECLARED_INPUT_EXCLUSION_UNAPPLIED");if(rows.some(row=>row.critical_fail_codes.includes("CF_CORRUPT")))findings.push("GENERATED_CORRUPTION_EXCLUSION_CONFLICT");}
      const rawCritical=ratingCriticalCodes.filter(code=>rows.some(row=>row.critical_fail_codes.includes(code))),rawMajor=ratingMajorCodes.filter(code=>rows.some(row=>row.major_artifact_codes.includes(code)));
      let medians:Record<ScoreField,number>|null=null;if(valid.length===3&&(!vote||vote.input_valid)){medians={} as Record<ScoreField,number>;for(const field of ratingScoreFields)medians[field]=valid.map(row=>row[field]!).sort((a,b)=>a-b)[1]!;}
      return {output_id:output.output_id,status:findings.length?"INCOMPLETE" as const:"COMPLETE_DECLARED_RATINGS" as const,findings,primary_rating_count:rows.length,valid_primary_rating_count:valid.length,raw_critical_fail_codes:rawCritical,raw_major_artifact_codes:rawMajor,triggers:actualTriggers,raw_rating_sha256s:rawHashes,latest_observation_sha256:observationHash,declared_raw_medians:medians,latest_adjudication_sha256:round?sha256EvaluationManifest(round):null,declared_classification:vote?decision(vote):null,raw_flags_cleared_by_declaration:vote?rawCritical.filter(code=>!vote.critical_fail_codes.includes(code)):[]};
    });
    return {input,result:{ratings_version:evaluationRatingsVersion,scope:"all_retained_output_rating_metadata",input_sha256:sha256EvaluationManifest(input),bundle_sha256:input.bundle_sha256,status:outputs.every(output=>output.status==="COMPLETE_DECLARED_RATINGS")?"COMPLETE_DECLARED_RATINGS":"INCOMPLETE",empty_population:outputs.length===0,outputs,raw_rating_count:input.ratings.length,observation_record_count:input.observations.length,adjudication_record_count:input.adjudications.length,media_authorization:"NOT_EVALUATED",reviewer_qualification:"NOT_EVALUATED",reviewer_identity:"NOT_EVALUATED",calibration:"NOT_EVALUATED",blinding:"NOT_EVALUATED",assignment_order:"NOT_EVALUATED",full_stage_coverage:"NOT_EVALUATED",usable_result_denominator:"NOT_EVALUATED",quality_gate:"NOT_EVALUATED",release_gate:"NOT_EVALUATED"}};
  });
}
function exact(actual:unknown,reference:unknown):void {if(Array.isArray(reference)){const arr=list(actual,10000);ensure(arr.length===reference.length);arr.forEach((value,index)=>exact(value,reference[index]));}else if(reference!==null&&typeof reference==="object"){const ref=reference as Record<string,unknown>,obj=object(actual,Object.keys(ref));Object.keys(ref).forEach(key=>exact(obj[key],ref[key]));}else ensure(actual===reference);}
export function serializeEvaluationRatingReport(value:unknown):string {return safe(()=>{preflight(value,2000000);const report=object(value,["input","result"]),rebuilt=evaluateEvaluationRatings(report.input);exact(report.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});}


