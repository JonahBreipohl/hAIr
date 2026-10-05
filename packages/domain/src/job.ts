export const generationJobStatuses = [
  "uploading",
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
  "expired",
] as const;

export type GenerationJobStatus = (typeof generationJobStatuses)[number];

const transitions: Readonly<Record<GenerationJobStatus, readonly GenerationJobStatus[]>> = {
  uploading: ["queued", "failed", "canceled", "expired"],
  queued: ["running", "failed", "canceled", "expired"],
  running: ["succeeded", "failed", "canceled", "expired"],
  succeeded: ["expired"],
  failed: ["queued", "expired"],
  canceled: ["queued", "expired"],
  expired: [],
};

export function canTransitionGenerationJob(
  from: GenerationJobStatus,
  to: GenerationJobStatus,
): boolean {
  return transitions[from].includes(to);
}

export function makeGenerationIdempotencyKey(input: {
  consultationId: string;
  variantIndex: number;
  promptVersion: string;
  requestFingerprint: string;
}): string {
  const consultationId = input.consultationId.trim();
  const promptVersion = input.promptVersion.trim();
  const requestFingerprint = input.requestFingerprint.trim();

  if (
    !consultationId ||
    !promptVersion ||
    !/^[a-z0-9][a-z0-9_-]{5,63}$/i.test(requestFingerprint) ||
    input.variantIndex < 0
  ) {
    throw new Error("Cannot create an idempotency key from invalid generation input.");
  }

  return `${consultationId}:${input.variantIndex}:${promptVersion}:${requestFingerprint}`;
}
