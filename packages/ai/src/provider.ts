import type { HairSpecification } from "@hair/domain";

export type EditStrategy = "prompt-only" | "hair-mask" | "protected-composite";
export type OutputQuality = "low" | "medium" | "high";

export interface HairstyleEditRequest {
  readonly requestId: string;
  readonly sourceAssetId: string;
  readonly referenceAssetId?: string;
  readonly maskAssetId?: string;
  readonly specification: HairSpecification;
  readonly strategy: EditStrategy;
  readonly quality: OutputQuality;
  readonly promptVersion: string;
  readonly idempotencyKey: string;
}

export interface ProviderUsage {
  readonly imageInputUnits: number;
  readonly imageOutputUnits: number;
  readonly textInputUnits: number;
  readonly estimatedCostUsd?: number;
}

export interface HairstyleEditResult {
  readonly requestId: string;
  readonly outputAssetId: string;
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly usage: ProviderUsage;
  readonly provenance: "provider" | "product" | "none";
}

export class HairstyleProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "policy_rejection"
      | "timeout"
      | "rate_limited"
      | "provider_error",
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "HairstyleProviderError";
  }
}

export interface HairstyleImageProvider {
  readonly name: string;
  edit(request: HairstyleEditRequest): Promise<HairstyleEditResult>;
}

export interface EvaluationRunManifest {
  readonly runId: string;
  readonly caseId: string;
  readonly sourceAssetId: string;
  readonly referenceAssetId?: string;
  readonly specification: HairSpecification;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly strategy: EditStrategy;
  readonly quality: OutputQuality;
  readonly providerSettings: Readonly<
    Record<string, string | number | boolean>
  >;
  readonly idempotencyKey: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly outcome: "succeeded" | "failed" | "rejected" | "timed_out";
  readonly outputAssetId?: string;
  readonly usage?: ProviderUsage;
  readonly errorCode?: string;
}
