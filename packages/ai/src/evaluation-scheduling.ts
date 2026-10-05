import { createHash } from "node:crypto";
import { canonicalEvaluationJson, sha256EvaluationManifest } from "./benchmark";
import {
  hashEvaluationPlan, validateEvaluationPlan, validateEvaluationRecordBundle,
  type EvaluationRecordBundle, type EvaluationSlot, type LockedEvaluationPlan,
} from "./evaluation-records";

export const evaluationSchedulingVersion = "hair-evaluation-scheduling-v1";
export const evaluationSchedulingBounds = Object.freeze({ rating_population: 1024, exact_population: 9, greedy_starts: 8, swap_passes: 4 });
const denial = "Evaluation scheduling rejected.";
function ensure(condition: unknown): asserts condition { if (!condition) throw new TypeError(denial); }
function safe<T>(operation: () => T): T { try { return operation(); } catch { throw new TypeError(denial); } }
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  ensure(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const keys = Reflect.ownKeys(value);
  ensure(keys.length === fields.length && keys.every(key => typeof key === "string" && fields.includes(key)));
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(value, key); ensure(descriptor?.enumerable === true && "value" in descriptor); }
  return value as Record<string, unknown>;
}
function list(value: unknown, maximum = 10000): unknown[] {
  ensure(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length <= maximum);
  ensure(Reflect.ownKeys(value).length === value.length + 1);
  for (let index = 0; index < value.length; index++) { const descriptor = Object.getOwnPropertyDescriptor(value, String(index)); ensure(descriptor?.enumerable === true && "value" in descriptor); }
  return value;
}
function digest(value: unknown): asserts value is string { ensure(typeof value === "string" && /^[a-f0-9]{64}$/.test(value)); }
function opaque(value: unknown, namespace: string): asserts value is string { ensure(typeof value === "string" && new RegExp(`^${namespace}-[a-f0-9]{16}$`).test(value)); }
function hashKey(parts: readonly (string | number)[]): string { return createHash("sha256").update(parts.join("|")).digest("hex"); }
function lexical(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export interface InvocationSchedulingInput { readonly plan: LockedEvaluationPlan; readonly plan_sha256: string; }
export interface InvocationSchedulingResult {
  readonly scheduling_version: typeof evaluationSchedulingVersion;
  readonly scope: "declared_invocation_order";
  readonly input_sha256: string;
  readonly plan_sha256: string;
  readonly status: "COMPLETE_DECLARED_ORDER";
  readonly adjacency: "NOT_APPLICABLE_CASE_BLOCKS";
  readonly execution: "NOT_EVALUATED";
  readonly media_authorization: "NOT_EVALUATED";
  readonly quality_gate: "NOT_EVALUATED";
  readonly blocks: readonly { readonly case_id: string; readonly slots: readonly (EvaluationSlot & { readonly ordering_key: string })[] }[];
}
export function scheduleEvaluationInvocations(value: unknown): { input: InvocationSchedulingInput; result: InvocationSchedulingResult } {
  return safe(() => {
    const raw = object(value, ["plan", "plan_sha256"]);
    const plan = validateEvaluationPlan(raw.plan); digest(raw.plan_sha256); ensure(hashEvaluationPlan(plan) === raw.plan_sha256);
    const input = { plan, plan_sha256: raw.plan_sha256 };
    const blocks = [...plan.cases].sort((a,b) => lexical(a.case_id,b.case_id)).map(item => ({
      case_id: item.case_id,
      slots: plan.slots.filter(slot => slot.case_id === item.case_id).map(slot => ({ ...slot, ordering_key: hashKey([plan.protocol_id,plan.run_id,slot.case_id,slot.configuration_id,slot.repetition]) })).sort((a,b) => lexical(a.ordering_key,b.ordering_key) || lexical(a.configuration_id,b.configuration_id) || a.repetition-b.repetition || a.variant_index-b.variant_index || lexical(a.slot_id,b.slot_id)),
    }));
    return { input, result: { scheduling_version: evaluationSchedulingVersion, scope: "declared_invocation_order", input_sha256: sha256EvaluationManifest(input), plan_sha256: input.plan_sha256, status: "COMPLETE_DECLARED_ORDER", adjacency: "NOT_APPLICABLE_CASE_BLOCKS", execution: "NOT_EVALUATED", media_authorization: "NOT_EVALUATED", quality_gate: "NOT_EVALUATED", blocks } };
  });
}
export interface RatingSchedulingInput {
  readonly bundle: EvaluationRecordBundle;
  readonly bundle_sha256: string;
  readonly selected_output_ids: readonly string[];
  readonly rater_id: string;
}
interface RatingItem { readonly output_id: string; readonly case_id: string; readonly configuration_id: string; readonly repetition: number; readonly ordering_key: string; }
interface CollisionCounts { readonly case: number; readonly configuration: number; readonly repetition: number; readonly total: number; readonly any_collision_edges: number; }
export interface RatingSchedulingResult {
  readonly scheduling_version: typeof evaluationSchedulingVersion;
  readonly scope: "declared_candidate_rating_order";
  readonly input_sha256: string;
  readonly bundle_sha256: string;
  readonly rater_id: string;
  readonly status: "COMPLETE_CERTIFIED_ORDER" | "INCOMPLETE";
  readonly proof: "ZERO_COLLISIONS" | "ANALYTIC_LOWER_BOUND_MATCHED" | "EXHAUSTIVE_MINIMUM" | "UNRESOLVED_BOUNDED_SEARCH";
  readonly objective: "sum_of_adjacent_equal_field_counts";
  readonly population: "all_declared_candidate_outputs";
  readonly lower_bounds: { readonly case: number; readonly configuration: number; readonly repetition: number; readonly frequency_sum: number; readonly spanning_tree: number; readonly combined: number };
  readonly collisions: CollisionCounts;
  readonly order: readonly RatingItem[];
  readonly media_authorization: "NOT_EVALUATED";
  readonly rater_qualification: "NOT_EVALUATED";
  readonly blinding: "NOT_EVALUATED";
  readonly execution: "NOT_EVALUATED";
  readonly quality_gate: "NOT_EVALUATED";
}
function edge(a: RatingItem, b: RatingItem): number { return Number(a.case_id === b.case_id) + Number(a.configuration_id === b.configuration_id) + Number(a.repetition === b.repetition); }
function collisions(order: readonly RatingItem[]): CollisionCounts {
  let cases=0, configurations=0, repetitions=0, any=0;
  for(let i=1;i<order.length;i++) { const a=order[i-1]!,b=order[i]!; const c=Number(a.case_id===b.case_id),f=Number(a.configuration_id===b.configuration_id),r=Number(a.repetition===b.repetition); cases+=c;configurations+=f;repetitions+=r;any+=Number(c+f+r>0); }
  return {case:cases,configuration:configurations,repetition:repetitions,total:cases+configurations+repetitions,any_collision_edges:any};
}
function frequencyBound(items: readonly RatingItem[], field: "case_id"|"configuration_id"|"repetition"): number {
  const counts=new Map<string|number,number>(); for(const item of items) counts.set(item[field],(counts.get(item[field])??0)+1);
  return Math.max(0,2*Math.max(0,...counts.values())-items.length-1);
}
/** A Hamiltonian path is a spanning tree. For integer edge costs 0..3,
 * MST cost=sum_{t=0..2}(components(edges<=t)-1), an independent global bound. */
function spanningTreeBound(items: readonly RatingItem[]):number {
  if(items.length<2)return 0;
  const parent=items.map((_,i)=>i);const rank=items.map(()=>0);let components=items.length,total=0;
  const find=(value:number):number=>{let root=value;while(parent[root]!==root)root=parent[root]!;while(parent[value]!==value){const next=parent[value]!;parent[value]=root;value=next;}return root;};
  const union=(a:number,b:number):void=>{let x=find(a),y=find(b);if(x===y)return;if(rank[x]!<rank[y]!) [x,y]=[y,x];parent[y]=x;if(rank[x]===rank[y])rank[x]=rank[x]!+1;components--;};
  for(let threshold=0;threshold<=2;threshold++){for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++)if(edge(items[a]!,items[b]!)<=threshold)union(a,b);total+=components-1;}
  return total;
}
function lexOrder(a: readonly RatingItem[], b: readonly RatingItem[]):number {
  for(let i=0;i<a.length;i++){const comparison=lexical(a[i]!.ordering_key,b[i]!.ordering_key)||lexical(a[i]!.output_id,b[i]!.output_id);if(comparison)return comparison;}return 0;
}
function heuristic(items: readonly RatingItem[]): RatingItem[] {
  let best=[...items],bestCost=collisions(best).total;
  for(let start=0;start<Math.min(items.length,evaluationSchedulingBounds.greedy_starts);start++) {
    const remaining=[...items],order=[remaining.splice(start,1)[0]!];
    const caseCounts=new Map<string,number>(),configCounts=new Map<string,number>(),repCounts=new Map<number,number>();
    for(const item of remaining){caseCounts.set(item.case_id,(caseCounts.get(item.case_id)??0)+1);configCounts.set(item.configuration_id,(configCounts.get(item.configuration_id)??0)+1);repCounts.set(item.repetition,(repCounts.get(item.repetition)??0)+1);}
    while(remaining.length){let chosen=0,cost=4,scarcity=-1;for(let i=0;i<remaining.length;i++){const item=remaining[i]!,candidate=edge(order[order.length-1]!,item),pressure=caseCounts.get(item.case_id)!+configCounts.get(item.configuration_id)!+repCounts.get(item.repetition)!;if(candidate<cost||(candidate===cost&&pressure>scarcity)){cost=candidate;scarcity=pressure;chosen=i;}}const item=remaining.splice(chosen,1)[0]!;order.push(item);caseCounts.set(item.case_id,caseCounts.get(item.case_id)!-1);configCounts.set(item.configuration_id,configCounts.get(item.configuration_id)!-1);repCounts.set(item.repetition,repCounts.get(item.repetition)!-1);}
    const cost=collisions(order).total;if(cost<bestCost || (cost===bestCost&&lexOrder(order,best)<0)){best=order;bestCost=cost;}
  }
  for(let pass=0;pass<evaluationSchedulingBounds.swap_passes;pass++) {
    let delta=0,first=-1,second=-1;
    for(let i=0;i<best.length;i++)for(let j=i+1;j<best.length;j++) {
      const affected=[...new Set([i-1,i,j-1,j].filter(index=>index>=0&&index<best.length-1))];
      let before=0,after=0;const at=(index:number):RatingItem=>best[index===i?j:index===j?i:index]!;
      for(const index of affected){before+=edge(best[index]!,best[index+1]!);after+=edge(at(index),at(index+1));}
      if(after-before<delta){delta=after-before;first=i;second=j;}
    }
    if(first<0)break;[best[first],best[second]]=[best[second]!,best[first]!];bestCost+=delta;
  }
  return best;
}
function exhaustive(items: readonly RatingItem[], incumbent: RatingItem[]):RatingItem[] {
  let best=incumbent,bestCost=collisions(best).total;const used=items.map(()=>false),path:RatingItem[]=[];
  const visit=(cost:number):void=>{
    if(cost>bestCost)return;
    if(path.length===items.length){if(cost<bestCost||(cost===bestCost&&lexOrder(path,best)<0)){best=[...path];bestCost=cost;}return;}
    for(let i=0;i<items.length;i++)if(!used[i]){const item=items[i]!;const nextCost=cost+(path.length?edge(path[path.length-1]!,item):0);used[i]=true;path.push(item);visit(nextCost);path.pop();used[i]=false;}
  };visit(0);return best;
}
export function scheduleEvaluationRatings(value: unknown): { input: RatingSchedulingInput; result: RatingSchedulingResult } {
  return safe(() => {
    const raw=object(value,["bundle","bundle_sha256","selected_output_ids","rater_id"]);
    const selected=list(raw.selected_output_ids,evaluationSchedulingBounds.rating_population);selected.forEach(value=>opaque(value,"output"));ensure(new Set(selected).size===selected.length);
    const bundle=validateEvaluationRecordBundle(raw.bundle);digest(raw.bundle_sha256);ensure(sha256EvaluationManifest(bundle)===raw.bundle_sha256);opaque(raw.rater_id,"rater");
    const candidates=bundle.outputs.filter(output=>output.disposition==="candidate");ensure(candidates.length===selected.length&&candidates.every(output=>selected.includes(output.output_id)));
    const input:RatingSchedulingInput={bundle,bundle_sha256:raw.bundle_sha256,selected_output_ids:[...selected as string[]].sort(lexical),rater_id:raw.rater_id};
    const slots=new Map(bundle.plan.slots.map(slot=>[slot.slot_id,slot]));
    const items=candidates.map(output=>{const slot=slots.get(output.slot_id)!;return {output_id:output.output_id,case_id:slot.case_id,configuration_id:slot.configuration_id,repetition:slot.repetition,ordering_key:hashKey([bundle.plan.run_id,input.rater_id,output.output_id])};}).sort((a,b)=>lexical(a.ordering_key,b.ordering_key)||lexical(a.output_id,b.output_id));
    const cases=frequencyBound(items,"case_id"),configuration=frequencyBound(items,"configuration_id"),repetition=frequencyBound(items,"repetition");const frequency_sum=cases+configuration+repetition,spanning_tree=spanningTreeBound(items),combined=Math.max(frequency_sum,spanning_tree);
    let order=heuristic(items),counts=collisions(order);let proof:RatingSchedulingResult["proof"]="UNRESOLVED_BOUNDED_SEARCH";
    if(counts.total===0)proof="ZERO_COLLISIONS";
    else if(counts.total===combined)proof="ANALYTIC_LOWER_BOUND_MATCHED";
    else if(items.length<=evaluationSchedulingBounds.exact_population){order=exhaustive(items,order);counts=collisions(order);proof=counts.total===0?"ZERO_COLLISIONS":counts.total===combined?"ANALYTIC_LOWER_BOUND_MATCHED":"EXHAUSTIVE_MINIMUM";}
    ensure(order.length===selected.length&&new Set(order.map(item=>item.output_id)).size===selected.length&&counts.total>=combined);
    return {input,result:{scheduling_version:evaluationSchedulingVersion,scope:"declared_candidate_rating_order",input_sha256:sha256EvaluationManifest(input),bundle_sha256:input.bundle_sha256,rater_id:input.rater_id,status:proof==="UNRESOLVED_BOUNDED_SEARCH"?"INCOMPLETE":"COMPLETE_CERTIFIED_ORDER",proof,objective:"sum_of_adjacent_equal_field_counts",population:"all_declared_candidate_outputs",lower_bounds:{case:cases,configuration,repetition,frequency_sum,spanning_tree,combined},collisions:counts,order,media_authorization:"NOT_EVALUATED",rater_qualification:"NOT_EVALUATED",blinding:"NOT_EVALUATED",execution:"NOT_EVALUATED",quality_gate:"NOT_EVALUATED"}};
  });
}
function exact(actual:unknown,reference:unknown):void {
  if(Array.isArray(reference)){const items=list(actual);ensure(items.length===reference.length);items.forEach((value,index)=>exact(value,reference[index]));}
  else if(reference!==null&&typeof reference==="object"){const ref=reference as Record<string,unknown>;const item=object(actual,Object.keys(ref));Object.keys(ref).forEach(key=>exact(item[key],ref[key]));}
  else ensure(actual===reference);
}
export function serializeEvaluationInvocationSchedule(value:unknown):string {
  return safe(()=>{const report=object(value,["input","result"]);const rebuilt=scheduleEvaluationInvocations(report.input);exact(report.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});
}
export function serializeEvaluationRatingSchedule(value:unknown):string {
  return safe(()=>{const report=object(value,["input","result"]);const rebuilt=scheduleEvaluationRatings(report.input);exact(report.result,rebuilt.result);return canonicalEvaluationJson(rebuilt);});
}
