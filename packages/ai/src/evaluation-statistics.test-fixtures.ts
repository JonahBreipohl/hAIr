import { sha256EvaluationManifest } from "./benchmark";
import { evaluateEvaluationMetrics } from "./evaluation-metrics";
import { buildMetricFixture, relockMetricFixture, type MutableMetricFixture } from "./evaluation-metrics.test-fixtures";
import { ratingScoreFields } from "./evaluation-ratings";
import { type MutableRatingFixture } from "./evaluation-ratings.test-fixtures";
import { evaluationStatisticsVersion, statisticsMethods, type EvaluationStatisticInput } from "./evaluation-statistics";
export type MutableStatisticFixture=MutableRatingFixture<EvaluationStatisticInput>;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
/** Synthetic declarations only; these are not real sampling, preregistration,
 * rater credentials, live execution, permission or interval-coverage evidence. */
export function buildStatisticFixture(options:Parameters<typeof buildMetricFixture>[0]={stage:"T1"}):MutableStatisticFixture {
  const metric=buildMetricFixture(options),plan=metric.cost_report.input.bundle.plan;
  for(const row of metric.rating_report.input.ratings){const item=plan.cases.find(item=>item.case_id===row.case_id)!,subjectIndex=plan.assets.filter(asset=>asset.role==="source_portrait").findIndex(asset=>asset.subject_id===item.subject_id),score=subjectIndex%2===0?0:4;ratingScoreFields.forEach(field=>{row[field]=score;});}
  relockMetricFixture(metric);const report=evaluateEvaluationMetrics(metric),manifest={schema_version:"1.0.0" as const,statistics_version:evaluationStatisticsVersion,protocol_id:plan.protocol_id,run_id:plan.run_id,plan_sha256:report.result.plan_sha256,frozen_at_utc:plan.created_at_utc,seed:20261003,...statisticsMethods};
  return clone({schema_version:"1.0.0",statistics_version:evaluationStatisticsVersion,locked_at_utc:new Date(Date.parse(metric.locked_at_utc)+60000).toISOString(),metric_report:report,metric_report_sha256:sha256EvaluationManifest(report),analysis_manifest:manifest,analysis_manifest_sha256:sha256EvaluationManifest(manifest)}) as MutableStatisticFixture;
}
export function relockStatisticFixture(input:MutableStatisticFixture):void {
  const metric=input.metric_report.input as MutableMetricFixture;relockMetricFixture(metric);input.metric_report=clone(evaluateEvaluationMetrics(metric)) as typeof input.metric_report;input.metric_report_sha256=sha256EvaluationManifest(input.metric_report);input.analysis_manifest.run_id=input.metric_report.result.run_id;input.analysis_manifest.plan_sha256=input.metric_report.result.plan_sha256;input.analysis_manifest_sha256=sha256EvaluationManifest(input.analysis_manifest);
}

