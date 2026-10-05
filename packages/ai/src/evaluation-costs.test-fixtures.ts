import base from "../../../tests/evals/evaluation-records.fixture.json";
import { sha256EvaluationManifest } from "./benchmark";
import { hashEvaluationAttempt, validateEvaluationRecordBundle, type EvaluationRecordBundle } from "./evaluation-records";
import { evaluationCostsVersion, type EvaluationCostInput } from "./evaluation-costs";
export type MutableCostFixture<T> = T extends readonly (infer V)[] ? MutableCostFixture<V>[] : T extends object ? {-readonly [P in keyof T]:MutableCostFixture<T[P]>} : T;
/** Deliberately invented prices/charges. These are arithmetic fixtures, never a
 * provider quote, payable bill, approved spend budget, or invoice attestation. */
export function buildCostFixture(value:unknown=base):MutableCostFixture<EvaluationCostInput> {
  const bundle=validateEvaluationRecordBundle(value);
  const pricing={schema_version:"1.0.0" as const,costs_version:evaluationCostsVersion,protocol_id:bundle.plan.protocol_id,run_id:bundle.plan.run_id,frozen_at_utc:bundle.plan.created_at_utc,currency:"USD" as const,micro_usd_denominator:7,formula:"additive_four_rates" as const,rounding:"none" as const,usage_basis:"locked_attempt_usage_units" as const,schedules:bundle.plan.configurations.map(config=>({configuration_id:config.configuration_id,configuration_sha256:sha256EvaluationManifest(config),pricing_schedule_id:config.pricing_schedule_id,provider_id:config.provider_id,model_snapshot:{...config.model_snapshot},terms_snapshot:{...config.terms_snapshot},availability:"available" as const,rates:{per_attempt:1,image_input_unit:3,image_output_unit:13,text_input_unit:19}}))};
  const latest=new Map<string,EvaluationRecordBundle["attempts"][number]>();bundle.attempts.forEach(attempt=>latest.set(attempt.attempt_id,attempt));
  const charges=[...latest.values()].map((attempt,index)=>({attempt_id:attempt.attempt_id,latest_attempt_sha256:hashEvaluationAttempt(attempt),status:"reported" as const,amount_micro_usd:(index+1)*10,invoice_state:"declared_reconciled" as const,invoice_artifact:{artifact_id:`artifact-${(900000+index).toString(16).padStart(16,"0")}`,content_sha256:sha256EvaluationManifest({synthetic_invoice:index})}}));
  return {bundle,bundle_sha256:sha256EvaluationManifest(bundle),pricing,pricing_sha256:sha256EvaluationManifest(pricing),charges,budget:{currency:"USD",cap_micro_usd:1000,declared_at_utc:bundle.plan.created_at_utc}} as MutableCostFixture<EvaluationCostInput>;
}
/** Rebind changed synthetic evidence; does not repair bad identities/schema. */
export function relockCostFixture(input:MutableCostFixture<EvaluationCostInput>):void {
  for(const attempt of input.bundle.attempts)if(attempt.revision>0){const previous=input.bundle.attempts.find(record=>record.attempt_id===attempt.attempt_id&&record.revision===attempt.revision-1);attempt.supersedes_record_sha256=hashEvaluationAttempt(previous);}
  input.bundle_sha256=sha256EvaluationManifest(input.bundle);
  const latest=new Map<string,EvaluationRecordBundle["attempts"][number]>();input.bundle.attempts.forEach(attempt=>latest.set(attempt.attempt_id,attempt));
  input.charges.forEach(charge=>{const attempt=latest.get(charge.attempt_id);if(attempt)charge.latest_attempt_sha256=hashEvaluationAttempt(attempt);});
  input.pricing_sha256=sha256EvaluationManifest(input.pricing);
}
