import {
  HairstyleProviderError,
  type HairstyleEditRequest,
  type HairstyleEditResult,
  type HairstyleImageProvider,
} from "./provider";

export type FakeProviderScenario =
  | "success"
  | "partial"
  | "policy_rejection"
  | "timeout"
  | "rate_limited"
  | "provider_error";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export class FakeHairstyleImageProvider implements HairstyleImageProvider {
  readonly name = "fake";

  constructor(
    private readonly scenario: FakeProviderScenario = "success",
    private readonly durationMs = 25,
  ) {}

  async edit(request: HairstyleEditRequest): Promise<HairstyleEditResult> {
    const outcome =
      this.scenario === "partial"
        ? /:2(?=:|$)/.test(request.idempotencyKey)
          ? "provider_error"
          : "success"
        : this.scenario;

    if (outcome !== "success") {
      const retryable = outcome !== "policy_rejection";
      throw new HairstyleProviderError(
        `Deterministic fake-provider outcome: ${outcome}`,
        outcome,
        retryable,
      );
    }

    const fingerprint = stableHash(
      [
        request.idempotencyKey,
        request.sourceAssetId,
        request.referenceAssetId ?? "none",
        request.strategy,
        request.quality,
        request.promptVersion,
        JSON.stringify(request.specification),
      ].join("|"),
    );

    return {
      requestId: request.requestId,
      outputAssetId: `fake-output-${fingerprint}`,
      provider: this.name,
      model: "deterministic-v1",
      durationMs: this.durationMs,
      usage: {
        imageInputUnits: request.referenceAssetId ? 2 : 1,
        imageOutputUnits: 1,
        textInputUnits: 1,
        estimatedCostUsd: 0,
      },
      provenance: "product",
    };
  }
}
