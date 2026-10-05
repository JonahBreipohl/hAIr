import {
  lengthGoals,
  textureGoals,
  type HairSpecification,
} from "@hair/domain";

import {
  HairstyleProviderError,
  type EvaluationRunManifest,
  type HairstyleEditRequest,
  type HairstyleImageProvider,
} from "./provider";

const safeAssetId = /^(fixture|licensed|synthetic)-[a-z0-9][a-z0-9._-]{2,127}$/;
const safeOpaqueId = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
const safeOutputAssetId = /^[a-z0-9][a-z0-9_-]{2,127}$/i;
const safeIdempotencyKey = /^[a-z0-9][a-z0-9._:-]{2,191}$/i;
const safeSettingKey = /^[a-z][a-z0-9_.-]{0,63}$/i;
const safeSettingString = /^[a-z0-9][a-z0-9 ._:+#-]{0,79}$/i;
const safeProviderIdentifier = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const canonicalUtcInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const safeHairDescriptor = /^(?:[\p{L}\p{N}][\p{L}\p{N} ,.'’()+&-]{0,119})?$/u;
const unsafeManifestText =
  /(?:\b(?:https?:\/\/|www\.|data:|file:)|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|[A-Za-z]:[\\/]|[\\/]{2}|\b(?:system prompt|developer message|ignore (?:all|any|the|previous)|follow these instructions|execute code|call (?:a )?tool)\b)/i;
const specificationKeys = [
  "lengthGoal",
  "silhouette",
  "layers",
  "part",
  "fringe",
  "texture",
  "volume",
  "fadeOrTaper",
  "baseColor",
  "tone",
  "highlights",
  "finish",
  "maintenanceTolerance",
  "inspirationAttributes",
  "preserve",
] as const satisfies readonly (keyof HairSpecification)[];
const descriptorKeys = [
  "silhouette",
  "layers",
  "part",
  "fringe",
  "volume",
  "fadeOrTaper",
  "baseColor",
  "tone",
  "highlights",
  "finish",
  "inspirationAttributes",
] as const satisfies readonly (keyof HairSpecification)[];
const sensitiveSettingKey =
  /(?:^|[._-])(?:api[._-]?key|authorization|bearer|credential|password|secret|token|access[._-]?token|refresh[._-]?token)(?:$|[._-])/i;
const secretLikeSettingValue =
  /(?:\bBearer\s+\S+|\bsk-[a-z0-9_-]{16,}\b|\bgh[pousr]_[a-z0-9]{20,}\b|\bgithub_pat_[a-z0-9_]{20,}\b|\bxox[baprs]-[a-z0-9-]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

class UnsafeManifestValueError extends Error {}

export interface EvaluationRunInput {
  readonly runId: string;
  readonly caseId: string;
  readonly request: HairstyleEditRequest;
  readonly provider: HairstyleImageProvider;
  readonly providerModel: string;
  readonly providerSettings?: Readonly<
    Record<string, string | number | boolean>
  >;
  readonly startedAt?: string;
  readonly now?: () => number;
}

function assertSafeAssetIdentifier(label: string, value: string): void {
  if (!safeAssetId.test(value)) {
    throw new Error(
      `${label} must be an opaque fixture-, licensed-, or synthetic- identifier.`,
    );
  }
}

function assertSafeOpaqueIdentifier(
  label: string,
  value: string,
  pattern: RegExp = safeOpaqueId,
): void {
  if (!pattern.test(value) || value.includes("..")) {
    throw new UnsafeManifestValueError(
      `${label} must be a safe opaque identifier.`,
    );
  }
}

function assertSafeProviderIdentifier(label: string, value: string): void {
  if (
    !safeProviderIdentifier.test(value) ||
    value.includes("..") ||
    secretLikeSettingValue.test(value)
  ) {
    throw new UnsafeManifestValueError(
      `${label} must be a short, safe provider identifier.`,
    );
  }
}

function assertCanonicalInstant(label: string, value: string): void {
  const parsed = Date.parse(value);
  if (
    !canonicalUtcInstant.test(value) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    throw new UnsafeManifestValueError(
      `${label} must be a valid canonical UTC instant.`,
    );
  }
}

function assertFiniteNonNegative(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new UnsafeManifestValueError(
      `${label} must be a finite, non-negative number.`,
    );
  }
}

function assertSafeUsage(
  usage: Readonly<{
    imageInputUnits: number;
    imageOutputUnits: number;
    textInputUnits: number;
    estimatedCostUsd?: number;
  }>,
): void {
  assertFiniteNonNegative("Image input usage", usage.imageInputUnits);
  assertFiniteNonNegative("Image output usage", usage.imageOutputUnits);
  assertFiniteNonNegative("Text input usage", usage.textInputUnits);
  if (usage.estimatedCostUsd !== undefined) {
    assertFiniteNonNegative("Estimated cost", usage.estimatedCostUsd);
  }
}

function assertSafeHairDescriptor(
  label: string,
  value: unknown,
  allowEmpty: boolean,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    (!allowEmpty && value.length === 0) ||
    !safeHairDescriptor.test(value) ||
    unsafeManifestText.test(value) ||
    secretLikeSettingValue.test(value)
  ) {
    throw new UnsafeManifestValueError(
      `${label} must contain only bounded, neutral hair attributes safe for an evaluation manifest.`,
    );
  }
}

function safeSpecification(value: HairSpecification): HairSpecification {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UnsafeManifestValueError(
      "Hair specification must be a structured object.",
    );
  }

  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...specificationKeys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new UnsafeManifestValueError(
      "Hair specification must contain only the approved structured fields.",
    );
  }

  if (!lengthGoals.includes(value.lengthGoal)) {
    throw new UnsafeManifestValueError("Hair length goal is invalid.");
  }
  if (!textureGoals.includes(value.texture)) {
    throw new UnsafeManifestValueError("Hair texture goal is invalid.");
  }
  if (!["low", "medium", "high"].includes(value.maintenanceTolerance)) {
    throw new UnsafeManifestValueError(
      "Hair maintenance tolerance is invalid.",
    );
  }

  for (const key of descriptorKeys) {
    assertSafeHairDescriptor(`Hair specification ${key}`, value[key], true);
  }
  if (!Array.isArray(value.preserve) || value.preserve.length > 16) {
    throw new UnsafeManifestValueError(
      "Hair preserve constraints must contain at most 16 entries.",
    );
  }
  const preserve = value.preserve.map((entry, index) => {
    assertSafeHairDescriptor(`Hair preserve constraint ${index + 1}`, entry, false);
    return entry;
  });

  return {
    lengthGoal: value.lengthGoal,
    silhouette: value.silhouette,
    layers: value.layers,
    part: value.part,
    fringe: value.fringe,
    texture: value.texture,
    volume: value.volume,
    fadeOrTaper: value.fadeOrTaper,
    baseColor: value.baseColor,
    tone: value.tone,
    highlights: value.highlights,
    finish: value.finish,
    maintenanceTolerance: value.maintenanceTolerance,
    inspirationAttributes: value.inspirationAttributes,
    preserve,
  };
}

function normalizedSettingKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2");
}

function assertSafeSetting(
  key: string,
  value: string | number | boolean,
): void {
  if (!safeSettingKey.test(key)) {
    throw new Error("Provider setting keys must be short opaque names.");
  }

  if (sensitiveSettingKey.test(normalizedSettingKey(key))) {
    throw new Error(
      `Provider setting ${key} cannot be written to an evaluation manifest.`,
    );
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Provider setting ${key} must be a finite number.`);
    }
    return;
  }

  if (typeof value === "boolean") {
    return;
  }

  if (
    value.trim() !== value ||
    !safeSettingString.test(value) ||
    secretLikeSettingValue.test(value)
  ) {
    throw new Error(
      `Provider setting ${key} contains a value that is unsafe to record.`,
    );
  }
}

function safeSettings(
  settings: Readonly<Record<string, string | number | boolean>> | undefined,
): Readonly<Record<string, string | number | boolean>> {
  const entries = Object.entries(settings ?? {});
  if (entries.length > 32) {
    throw new Error("An evaluation manifest can record at most 32 provider settings.");
  }
  entries.forEach(([key, value]) => assertSafeSetting(key, value));
  return Object.fromEntries(entries);
}

function manifestBase(
  input: EvaluationRunInput,
  specification: HairSpecification,
  providerSettings: Readonly<Record<string, string | number | boolean>>,
  startedAt: string,
) {
  return {
    runId: input.runId,
    caseId: input.caseId,
    sourceAssetId: input.request.sourceAssetId,
    ...(input.request.referenceAssetId
      ? { referenceAssetId: input.request.referenceAssetId }
      : {}),
    specification,
    provider: input.provider.name,
    model: input.providerModel,
    promptVersion: input.request.promptVersion,
    strategy: input.request.strategy,
    quality: input.request.quality,
    providerSettings,
    idempotencyKey: input.request.idempotencyKey,
    startedAt,
  } as const;
}

export async function runEvaluation(
  input: EvaluationRunInput,
): Promise<EvaluationRunManifest> {
  assertSafeOpaqueIdentifier("Run ID", input.runId);
  assertSafeOpaqueIdentifier("Case ID", input.caseId);
  assertSafeOpaqueIdentifier("Request ID", input.request.requestId);
  assertSafeOpaqueIdentifier(
    "Idempotency key",
    input.request.idempotencyKey,
    safeIdempotencyKey,
  );
  assertSafeAssetIdentifier("Source asset ID", input.request.sourceAssetId);
  if (input.request.referenceAssetId) {
    assertSafeAssetIdentifier("Reference asset ID", input.request.referenceAssetId);
  }
  if (input.request.maskAssetId) {
    assertSafeAssetIdentifier("Mask asset ID", input.request.maskAssetId);
  }
  assertSafeProviderIdentifier("Provider name", input.provider.name);
  assertSafeProviderIdentifier("Provider model", input.providerModel);
  assertSafeOpaqueIdentifier("Prompt version", input.request.promptVersion);

  const specification = safeSpecification(input.request.specification);
  const providerSettings = safeSettings(input.providerSettings);
  const startedAt = input.startedAt ?? new Date().toISOString();
  assertCanonicalInstant("Start time", startedAt);
  const now = input.now ?? (() => performance.now());
  const start = now();
  assertFiniteNonNegative("Monotonic start time", start);
  const base = manifestBase(input, specification, providerSettings, startedAt);

  try {
    const result = await input.provider.edit(input.request);
    assertSafeOpaqueIdentifier(
      "Output asset ID",
      result.outputAssetId,
      safeOutputAssetId,
    );
    assertSafeProviderIdentifier("Result provider", result.provider);
    assertSafeProviderIdentifier("Result model", result.model);
    if (result.requestId !== input.request.requestId) {
      throw new UnsafeManifestValueError(
        "Provider result request ID does not match the requested evaluation.",
      );
    }
    if (result.provider !== input.provider.name) {
      throw new UnsafeManifestValueError(
        "Provider result identity does not match the invoked provider.",
      );
    }
    if (result.model !== input.providerModel) {
      throw new UnsafeManifestValueError(
        "Provider result model does not match the locked evaluation model.",
      );
    }
    assertFiniteNonNegative("Provider duration", result.durationMs);
    assertSafeUsage(result.usage);
    return {
      ...base,
      model: result.model,
      durationMs: result.durationMs,
      outcome: "succeeded",
      outputAssetId: result.outputAssetId,
      usage: result.usage,
    };
  } catch (error) {
    if (error instanceof UnsafeManifestValueError) {
      throw error;
    }
    const end = now();
    assertFiniteNonNegative("Monotonic end time", end);
    const elapsed = end - start;
    assertFiniteNonNegative("Measured duration", elapsed);
    const durationMs = Math.round(elapsed);
    if (error instanceof HairstyleProviderError) {
      const outcome =
        error.code === "policy_rejection"
          ? "rejected"
          : error.code === "timeout"
            ? "timed_out"
            : "failed";
      return {
        ...base,
        durationMs,
        outcome,
        errorCode: error.code,
      };
    }
    return {
      ...base,
      durationMs,
      outcome: "failed",
      errorCode: "unexpected_error",
    };
  }
}

export async function runEvaluationBatch(
  inputs: readonly EvaluationRunInput[],
): Promise<readonly EvaluationRunManifest[]> {
  return Promise.all(inputs.map(runEvaluation));
}
