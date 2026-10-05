import { types } from "node:util";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationAttempt, validateEvaluationRecordBundle, type EvaluationAttemptRecord, type EvaluationRecordBundle } from "./evaluation-records";

export const evaluationCostsVersion = "hair-evaluation-costs-v1";
export const evaluationCostBounds = Object.freeze({ rates: 1_000_000_000, formula_denominator: 1_000_000, charge_micro_usd: 1_000_000_000_000, rational_denominator: 10_000_000_000, numerator_max_exclusive: "100000000000000000000000000000000" });
const denial="Evaluation costs rejected.";
function ensure(condition:unknown):asserts condition {if(!condition)throw new TypeError(denial);}
function safe<T>(operation:()=>T):T {try{return operation();}catch{throw new TypeError(denial);}}
function object(value:unknown,fields:readonly string[]):Record<string,unknown> {
  ensure(!types.isProxy(value)&&value!==null&&typeof value==="object"&&!Array.isArray(value));
  ensure(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
  const keys=Reflect.ownKeys(value);ensure(keys.length===fields.length&&keys.every(key=>typeof key==="string"&&fields.includes(key)));
  for(const key of keys){const property=Object.getOwnPropertyDescriptor(value,key);ensure(property?.enumerable===true&&"value" in property);}return value as Record<string,unknown>;
}
function list(value:unknown):unknown[] {
  ensure(!types.isProxy(value)&&Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&value.length<=10000&&Reflect.ownKeys(value).length===value.length+1);
  for(let index=0;index<value.length;index++){const property=Object.getOwnPropertyDescriptor(value,String(index));ensure(property?.enumerable===true&&"value" in property);}return value;
}
function integer(value:unknown,max=Number.MAX_SAFE_INTEGER,min=0):asserts value is number {ensure(typeof value==="number"&&Number.isSafeInteger(value)&&value>=min&&value<=max);}
function hash(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^[a-f0-9]{64}$/.test(value));}
function id(value:unknown,namespace:string):asserts value is string {ensure(typeof value==="string"&&new RegExp(`^${namespace}-[a-f0-9]{16}$`).test(value));}
function instant(value:unknown):asserts value is string {ensure(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);}
interface ArtifactLock {readonly artifact_id:string;readonly content_sha256:string;}
function artifact(value:unknown):void {const item=object(value,["artifact_id","content_sha256"]);id(item.artifact_id,"artifact");hash(item.content_sha256);}
interface Rates {readonly per_attempt:number;readonly image_input_unit:number;readonly image_output_unit:number;readonly text_input_unit:number;}
export interface EvaluationPriceSchedule {
  readonly configuration_id:string;readonly configuration_sha256:string;readonly pricing_schedule_id:string;readonly provider_id:string;
  readonly model_snapshot:ArtifactLock;readonly terms_snapshot:ArtifactLock;
  readonly availability:"available"|"unavailable";readonly rates:Rates|null;
}
export interface EvaluationPricingManifest {
  readonly schema_version:"1.0.0";readonly costs_version:typeof evaluationCostsVersion;readonly protocol_id:"hair-eval-v1";readonly run_id:string;
  readonly frozen_at_utc:string;readonly currency:"USD";readonly micro_usd_denominator:number;
  readonly formula:"additive_four_rates";readonly rounding:"none";readonly usage_basis:"locked_attempt_usage_units";
  readonly schedules:readonly EvaluationPriceSchedule[];
}
export interface EvaluationDeclaredCharge {
  readonly attempt_id:string;readonly latest_attempt_sha256:string;readonly status:"reported"|"unavailable";
  readonly amount_micro_usd:number|null;readonly invoice_state:"not_provided"|"pending"|"declared_reconciled";readonly invoice_artifact:ArtifactLock|null;
}
export interface EvaluationDeclaredBudget {readonly currency:"USD";readonly cap_micro_usd:number;readonly declared_at_utc:string;}
export interface EvaluationCostInput {
  readonly bundle:EvaluationRecordBundle;readonly bundle_sha256:string;readonly pricing:EvaluationPricingManifest;readonly pricing_sha256:string;
  readonly charges:readonly EvaluationDeclaredCharge[];readonly budget:EvaluationDeclaredBudget|null;
}
/** Exact micro-USD amounts. Numerator strings avoid IEEE-754 monetary loss.
 * Values are deliberately not rounded or reduced: denominator retains basis. */
export interface EvaluationRationalAmount {readonly numerator:string;readonly denominator:number;}
interface CostChannel {
  readonly status:"COMPLETE_DECLARED_ESTIMATE"|"COMPLETE_DECLARED_CHARGES"|"INCOMPLETE";
  readonly known_subtotal:EvaluationRationalAmount;readonly total:EvaluationRationalAmount|null;
  readonly unknown_attempt_ids:readonly string[];readonly cost_per_all_declared_requested_slot:EvaluationRationalAmount|null;
}
interface AttemptCost {
  readonly attempt_id:string;readonly slot_id:string;readonly configuration_id:string;readonly attempt_index:number;
  readonly outcome:EvaluationAttemptRecord["outcome"];readonly latest_usage_revision:number;readonly latest_attempt_sha256:string;
  readonly usage_status:EvaluationAttemptRecord["usage"]["status"];readonly pricing_availability:EvaluationPriceSchedule["availability"];
  readonly formula_estimate:EvaluationRationalAmount|null;readonly declared_charge:EvaluationRationalAmount|null;
  readonly invoice_state:EvaluationDeclaredCharge["invoice_state"];
}
interface CostAggregation {
  readonly denominator_scope:"all_declared_requested_slots_including_reruns";readonly requested_slot_count:number;readonly logical_attempt_count:number;
  readonly attempt_record_count:number;readonly usage_revision_count:number;readonly formula_estimate:CostChannel;readonly declared_charges:CostChannel;
  readonly invoice_reconciliation_status:"COMPLETE_DECLARED_RECONCILIATION"|"INCOMPLETE";
}
type BudgetObservation="NOT_DECLARED"|"DECLARED_WITHIN_CAP"|"DECLARED_EXCEEDS_CAP"|"INDETERMINATE";
export interface EvaluationCostResult {
  readonly costs_version:typeof evaluationCostsVersion;readonly scope:"declared_attempt_cost_metadata";readonly input_sha256:string;readonly bundle_sha256:string;readonly pricing_sha256:string;
  readonly currency:"USD";readonly amount_unit:"micro_usd";readonly formula_rounding:"none";readonly charge_scope:"current_declared_observations";
  readonly attempts:readonly AttemptCost[];readonly run:CostAggregation;readonly configurations:readonly (CostAggregation&{readonly configuration_id:string})[];
  readonly budget_observation:{readonly formula_estimate:BudgetObservation;readonly declared_charges:BudgetObservation};
  readonly cost_per_displayed_output:null;readonly cost_per_usable_result:null;
  readonly displayed_output_evidence:"NOT_EVALUATED";readonly usable_result_evidence:"NOT_EVALUATED";readonly invoice_authenticity:"NOT_EVALUATED";
  readonly pricing_authority:"NOT_EVALUATED";readonly spending_authorization:"NOT_EVALUATED";readonly quality_gate:"NOT_EVALUATED";
}
function compare(a:string,b:string):number {return a<b?-1:a>b?1:0;}
function amount(numerator:bigint,denominator:number):EvaluationRationalAmount {
  ensure(numerator>=BigInt(0)&&numerator<BigInt(evaluationCostBounds.numerator_max_exclusive));integer(denominator,evaluationCostBounds.rational_denominator,1);
  return {numerator:numerator.toString(),denominator};
}
function latestAttempts(bundle:EvaluationRecordBundle):EvaluationAttemptRecord[] {
  const latest=new Map<string,EvaluationAttemptRecord>();for(const attempt of bundle.attempts)latest.set(attempt.attempt_id,attempt);return [...latest.values()].sort((a,b)=>compare(a.attempt_id,b.attempt_id));
}
export function validateEvaluationCostInput(value:unknown):EvaluationCostInput {
  return safe(()=>{
    const raw=object(value,["bundle","bundle_sha256","pricing","pricing_sha256","charges","budget"]);
    const bundle=validateEvaluationRecordBundle(raw.bundle);hash(raw.bundle_sha256);ensure(sha256EvaluationManifest(bundle)===raw.bundle_sha256);hash(raw.pricing_sha256);
    const pricing=object(raw.pricing,["schema_version","costs_version","protocol_id","run_id","frozen_at_utc","currency","micro_usd_denominator","formula","rounding","usage_basis","schedules"]);
    ensure(pricing.schema_version==="1.0.0"&&pricing.costs_version===evaluationCostsVersion&&pricing.protocol_id===bundle.plan.protocol_id&&pricing.run_id===bundle.plan.run_id);
    ensure(pricing.currency==="USD"&&pricing.formula==="additive_four_rates"&&pricing.rounding==="none"&&pricing.usage_basis==="locked_attempt_usage_units");
    integer(pricing.micro_usd_denominator,evaluationCostBounds.formula_denominator,1);instant(pricing.frozen_at_utc);ensure(pricing.frozen_at_utc<=bundle.plan.created_at_utc);
    const schedules=list(pricing.schedules);ensure(schedules.length===bundle.plan.configurations.length);
    const configurations=new Map(bundle.plan.configurations.map(config=>[config.configuration_id,config]));const seen=new Set<string>();
    for(const value of schedules){const schedule=object(value,["configuration_id","configuration_sha256","pricing_schedule_id","provider_id","model_snapshot","terms_snapshot","availability","rates"]);
      id(schedule.configuration_id,"config");hash(schedule.configuration_sha256);id(schedule.pricing_schedule_id,"pricing");id(schedule.provider_id,"provider");artifact(schedule.model_snapshot);artifact(schedule.terms_snapshot);
      const config=configurations.get(schedule.configuration_id);ensure(config&&!seen.has(config.configuration_id));seen.add(config.configuration_id);
      ensure(schedule.configuration_sha256===sha256EvaluationManifest(config)&&schedule.pricing_schedule_id===config.pricing_schedule_id&&schedule.provider_id===config.provider_id&&canonicalEvaluationJson(schedule.model_snapshot)===canonicalEvaluationJson(config.model_snapshot)&&canonicalEvaluationJson(schedule.terms_snapshot)===canonicalEvaluationJson(config.terms_snapshot));
      ensure(pricing.frozen_at_utc>=config.created_at_utc&&pricing.frozen_at_utc>=config.terms_snapshot_at_utc);
      ensure(schedule.availability==="available"||schedule.availability==="unavailable");
      if(schedule.availability==="unavailable")ensure(schedule.rates===null);else{const rates=object(schedule.rates,["per_attempt","image_input_unit","image_output_unit","text_input_unit"]);Object.values(rates).forEach(rate=>integer(rate,evaluationCostBounds.rates));}
    }
    ensure(sha256EvaluationManifest(pricing)===raw.pricing_sha256);
    const planArtifacts=new Set<string>();
    bundle.plan.cases.forEach(item=>[item.specification,item.prompt_inputs].forEach(lock=>planArtifacts.add(lock.artifact_id)));
    bundle.plan.configurations.forEach(config=>[config.model_snapshot,config.moderation_policy,config.prompt_template,config.descriptor_conversion,config.preprocessing,config.generation_parameters,config.segmentation,config.protected_region_definition,config.terms_snapshot].forEach(lock=>{if(lock)planArtifacts.add(lock.artifact_id);}));
    const invoiceHashes=new Map<string,string>();
    const latest=latestAttempts(bundle),latestById=new Map(latest.map(attempt=>[attempt.attempt_id,attempt]));const charges=list(raw.charges);ensure(charges.length===latest.length);const charged=new Set<string>();
    for(const value of charges){const charge=object(value,["attempt_id","latest_attempt_sha256","status","amount_micro_usd","invoice_state","invoice_artifact"]);id(charge.attempt_id,"attempt");hash(charge.latest_attempt_sha256);
      const attempt=latestById.get(charge.attempt_id);ensure(attempt&&!charged.has(attempt.attempt_id)&&charge.latest_attempt_sha256===hashEvaluationAttempt(attempt));charged.add(attempt.attempt_id);
      ensure(charge.status==="reported"||charge.status==="unavailable");ensure(["not_provided","pending","declared_reconciled"].includes(charge.invoice_state as string));
      if(charge.invoice_artifact!==null){artifact(charge.invoice_artifact);const invoice=charge.invoice_artifact as ArtifactLock;ensure(!planArtifacts.has(invoice.artifact_id));const previous=invoiceHashes.get(invoice.artifact_id);ensure(previous===undefined||previous===invoice.content_sha256);invoiceHashes.set(invoice.artifact_id,invoice.content_sha256);}
      if(charge.status==="unavailable")ensure(charge.amount_micro_usd===null&&charge.invoice_state==="not_provided"&&charge.invoice_artifact===null);else integer(charge.amount_micro_usd,evaluationCostBounds.charge_micro_usd);
      if(charge.invoice_state==="not_provided")ensure(charge.invoice_artifact===null);if(charge.invoice_state==="declared_reconciled")ensure(charge.status==="reported"&&charge.invoice_artifact!==null);
    }
    if(raw.budget!==null){const budget=object(raw.budget,["currency","cap_micro_usd","declared_at_utc"]);ensure(budget.currency==="USD");integer(budget.cap_micro_usd,evaluationCostBounds.charge_micro_usd);instant(budget.declared_at_utc);ensure(budget.declared_at_utc<=bundle.plan.created_at_utc);}
    return JSON.parse(canonicalEvaluationJson({bundle,bundle_sha256:raw.bundle_sha256,pricing,pricing_sha256:raw.pricing_sha256,charges,budget:raw.budget})) as EvaluationCostInput;
  });
}
function formula(attempt:EvaluationAttemptRecord,schedule:EvaluationPriceSchedule,denominator:number):EvaluationRationalAmount|null {
  if(attempt.usage.status==="unavailable"||schedule.availability==="unavailable"||schedule.rates===null)return null;
  const rates=schedule.rates,usage=attempt.usage;
  return amount(BigInt(rates.per_attempt)+BigInt(usage.image_input_units!)*BigInt(rates.image_input_unit)+BigInt(usage.image_output_units!)*BigInt(rates.image_output_unit)+BigInt(usage.text_input_units!)*BigInt(rates.text_input_unit),denominator);
}
function channel(attempts:readonly AttemptCost[],field:"formula_estimate"|"declared_charge",denominator:number,slots:number):CostChannel {
  let sum=BigInt(0);const unknown:string[]=[];for(const attempt of attempts){const cost=attempt[field];if(cost===null)unknown.push(attempt.attempt_id);else{ensure(cost.denominator===denominator);sum+=BigInt(cost.numerator);}}
  const known_subtotal=amount(sum,denominator),complete=unknown.length===0;
  return {status:complete?(field==="formula_estimate"?"COMPLETE_DECLARED_ESTIMATE":"COMPLETE_DECLARED_CHARGES"):"INCOMPLETE",known_subtotal,total:complete?known_subtotal:null,unknown_attempt_ids:unknown,cost_per_all_declared_requested_slot:complete&&slots>0?amount(sum,denominator*slots):null};
}
function aggregate(attempts:readonly AttemptCost[],records:readonly EvaluationAttemptRecord[],slots:number,denominator:number):CostAggregation {
  return {denominator_scope:"all_declared_requested_slots_including_reruns",requested_slot_count:slots,logical_attempt_count:attempts.length,attempt_record_count:records.length,usage_revision_count:records.length-attempts.length,formula_estimate:channel(attempts,"formula_estimate",denominator,slots),declared_charges:channel(attempts,"declared_charge",1,slots),invoice_reconciliation_status:attempts.every(attempt=>attempt.declared_charge!==null&&attempt.invoice_state==="declared_reconciled")?"COMPLETE_DECLARED_RECONCILIATION":"INCOMPLETE"};
}
function budgetObservation(cost:CostChannel,budget:EvaluationDeclaredBudget|null):BudgetObservation {
  if(budget===null)return "NOT_DECLARED";
  if(BigInt(cost.known_subtotal.numerator)>BigInt(budget.cap_micro_usd)*BigInt(cost.known_subtotal.denominator))return "DECLARED_EXCEEDS_CAP";
  return cost.total===null?"INDETERMINATE":"DECLARED_WITHIN_CAP";
}
export function evaluateEvaluationCosts(value:unknown):{input:EvaluationCostInput;result:EvaluationCostResult} {
  return safe(()=>{
    const input=validateEvaluationCostInput(value),denominator=input.pricing.micro_usd_denominator;
    const schedules=new Map(input.pricing.schedules.map(schedule=>[schedule.configuration_id,schedule])),charges=new Map(input.charges.map(charge=>[charge.attempt_id,charge]));
    const attempts=latestAttempts(input.bundle).map(attempt=>{const schedule=schedules.get(attempt.configuration_id)!,charge=charges.get(attempt.attempt_id)!;
      return {attempt_id:attempt.attempt_id,slot_id:attempt.slot_id,configuration_id:attempt.configuration_id,attempt_index:attempt.attempt_index,outcome:attempt.outcome,latest_usage_revision:attempt.revision,latest_attempt_sha256:hashEvaluationAttempt(attempt),usage_status:attempt.usage.status,pricing_availability:schedule.availability,formula_estimate:formula(attempt,schedule,denominator),declared_charge:charge.status==="reported"?amount(BigInt(charge.amount_micro_usd!),1):null,invoice_state:charge.invoice_state};
    });
    const run=aggregate(attempts,input.bundle.attempts,input.bundle.plan.slots.length,denominator);
    const configurations=[...input.bundle.plan.configurations].sort((a,b)=>compare(a.configuration_id,b.configuration_id)).map(config=>({configuration_id:config.configuration_id,...aggregate(attempts.filter(attempt=>attempt.configuration_id===config.configuration_id),input.bundle.attempts.filter(attempt=>attempt.configuration_id===config.configuration_id),input.bundle.plan.slots.filter(slot=>slot.configuration_id===config.configuration_id).length,denominator)}));
    return {input,result:{costs_version:evaluationCostsVersion,scope:"declared_attempt_cost_metadata",input_sha256:sha256EvaluationManifest(input),bundle_sha256:input.bundle_sha256,pricing_sha256:input.pricing_sha256,currency:"USD",amount_unit:"micro_usd",formula_rounding:"none",charge_scope:"current_declared_observations",attempts,run,configurations,budget_observation:{formula_estimate:budgetObservation(run.formula_estimate,input.budget),declared_charges:budgetObservation(run.declared_charges,input.budget)},cost_per_displayed_output:null,cost_per_usable_result:null,displayed_output_evidence:"NOT_EVALUATED",usable_result_evidence:"NOT_EVALUATED",invoice_authenticity:"NOT_EVALUATED",pricing_authority:"NOT_EVALUATED",spending_authorization:"NOT_EVALUATED",quality_gate:"NOT_EVALUATED"}};
  });
}
function exact(actual:unknown,reference:unknown):void {
  if(Array.isArray(reference)){const items=list(actual);ensure(items.length===reference.length);items.forEach((value,index)=>exact(value,reference[index]));}
  else if(reference!==null&&typeof reference==="object"){const ref=reference as Record<string,unknown>,item=object(actual,Object.keys(ref));Object.keys(ref).forEach(key=>exact(item[key],ref[key]));}
  else ensure(actual===reference);
}
export function serializeEvaluationCostReport(value:unknown):string {
  return safe(()=>{const report=object(value,["input","result"]),rebuilt=evaluateEvaluationCosts(report.input);exact(report.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});
}
