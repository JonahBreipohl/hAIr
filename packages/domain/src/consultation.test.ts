import { describe, expect, it } from "vitest";

import {
  canTransitionConsultation,
  defaultHairSpecification,
  transitionConsultation,
  validateHairSpecification,
} from "./consultation";
import { makeGenerationIdempotencyKey } from "./job";

describe("consultation state", () => {
  it("allows the verified happy-path transitions", () => {
    expect(canTransitionConsultation("draft", "consented")).toBe(true);
    expect(canTransitionConsultation("consented", "ready")).toBe(true);
    expect(canTransitionConsultation("reviewing", "agreed")).toBe(true);
  });

  it("rejects skipping consent", () => {
    expect(() => transitionConsultation("draft", "generating")).toThrow(
      "Invalid consultation transition",
    );
  });
});

describe("hair specification", () => {
  it("requires a meaningful requested change", () => {
    expect(validateHairSpecification(defaultHairSpecification)).toEqual([
      "Choose at least one hair change before generating previews.",
    ]);
  });

  it("accepts a structured change", () => {
    expect(
      validateHairSpecification({
        ...defaultHairSpecification,
        fringe: "soft curtain fringe",
      }),
    ).toEqual([]);
  });

  it("accepts length-only and texture-only changes", () => {
    expect(
      validateHairSpecification({
        ...defaultHairSpecification,
        lengthGoal: "longer",
      }),
    ).toEqual([]);
    expect(
      validateHairSpecification({
        ...defaultHairSpecification,
        texture: "curly",
      }),
    ).toEqual([]);
  });
});

describe("generation idempotency", () => {
  it("is stable for the same logical variant", () => {
    expect(
      makeGenerationIdempotencyKey({
        consultationId: "consultation-1",
        variantIndex: 2,
        promptVersion: "hair-v1",
        requestFingerprint: "8f14e45f",
      }),
    ).toBe("consultation-1:2:hair-v1:8f14e45f");
  });

  it("separates requests when the hairstyle specification changes", () => {
    const base = {
      consultationId: "consultation-1",
      variantIndex: 2,
      promptVersion: "hair-v1",
    };

    expect(
      makeGenerationIdempotencyKey({ ...base, requestFingerprint: "8f14e45f" }),
    ).not.toBe(
      makeGenerationIdempotencyKey({ ...base, requestFingerprint: "45c48f14" }),
    );
  });

  it("rejects an unsafe or missing request fingerprint", () => {
    expect(() =>
      makeGenerationIdempotencyKey({
        consultationId: "consultation-1",
        variantIndex: 2,
        promptVersion: "hair-v1",
        requestFingerprint: "../photo.jpg",
      }),
    ).toThrow("invalid generation input");
  });
});
