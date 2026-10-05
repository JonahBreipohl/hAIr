import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  assetFreshnessPolicyVersion,
  evaluateAssetTransferEligibility,
  type AssetTechnicalVerification,
  type AssetTransferAuthorizationRequest,
  type BenchmarkAssetManifest,
} from "./asset-eligibility";

const source: BenchmarkAssetManifest = {
  schema_version: "1.0.0",
  asset_id: "ast_00000001",
  subject_id: "sub_00000001",
  asset_role: "source_portrait",
  provenance_class: "synthetic",
  collection_id: "dataset-v1",
  content_sha256: "a".repeat(64),
  restricted_locator_id: "loc_00000001",
  mime_type: "image/png",
  width_px: 1024,
  height_px: 1280,
  metadata_stripped_at: "2026-09-30T20:00:00Z",
  subject_count: 1,
  adult_status: "synthetic_adult",
  adult_verification_method: "synthetic_provenance_review",
  license_record_id: "lic_00000001",
  license_version: "synthetic-license-v1",
  license_verified_at: "2026-09-30T20:00:00Z",
  license_expires_at: "2027-10-01T00:00:00Z",
  synthetic_generator_id: "generator-v1",
  synthetic_generator_version: "model-v1",
  synthetic_created_at: "2026-09-29T20:00:00Z",
  terms_snapshot_id: "terms-v1",
  prompt_origin_attestation_id: "att_00000001",
  real_person_likeness_review_status: "passed",
  source_origin_attestation: "purpose_synthetic_benchmark",
  prohibited_source_review_status: "passed",
  permitted_uses: [
    "provider_evaluation",
    "mask_evaluation",
    "human_quality_rating",
    "internal_aggregate_reporting",
  ],
  permitted_providers: ["provider-a:us"],
  commercial_research_allowed: true,
  human_rating_allowed: true,
  derivative_generation_allowed: true,
  provider_training_allowed: false,
  offline_face_similarity_allowed: false,
  territories: ["US"],
  retention_expires_at: "2027-10-01T00:00:00Z",
  withdrawal_status: "not_applicable",
  deletion_status: "present",
  derived_from_asset_ids: [],
  preprocessing_version: "normalize-v1",
  quality_eligibility: "eligible",
  reviewed_by: "steward_0001",
  reviewed_at: "2026-09-30T21:00:00Z",
};

const {
  subject_id: _subjectId,
  adult_status: _adultStatus,
  adult_verification_method: _adultVerificationMethod,
  ...sourceWithoutPersonFields
} = source;

const mask: BenchmarkAssetManifest = {
  ...sourceWithoutPersonFields,
  asset_id: "ast_00000002",
  asset_role: "mask",
  content_sha256: "b".repeat(64),
  restricted_locator_id: "loc_00000002",
  subject_count: 0,
  license_record_id: "lic_00000002",
  prompt_origin_attestation_id: "att_00000002",
  derived_from_asset_ids: [source.asset_id],
  preprocessing_version: "hair-mask-v1",
};

function verification(manifest: BenchmarkAssetManifest): AssetTechnicalVerification {
  return {
    asset_id: manifest.asset_id,
    verifier_id: "verifier_0001",
    verified_at: "2026-10-01T00:00:00Z",
    decoded: true,
    content_sha256: manifest.content_sha256,
    mime_type: manifest.mime_type,
    width_px: manifest.width_px,
    height_px: manifest.height_px,
    metadata_stripped: true,
    observed_subject_count: manifest.subject_count,
    duplicate_status: "clear",
    malware_status: "clear",
    content_safety_status: "clear",
    source_consistency_status: "clear",
  };
}

const request: AssetTransferAuthorizationRequest = {
  decision_id: "decision-001",
  run_id: "run-001",
  stage: "T0",
  check: "pre_transfer",
  evaluated_at_utc: "2026-10-01T00:00:00Z",
  planned_run_at_utc: "2026-10-01T00:04:00Z",
  adjudication_complete_by_utc: "2026-10-05T00:00:00Z",
  dataset_version: "dataset-v1",
  root_asset_ids: [source.asset_id, mask.asset_id],
  requested_uses: ["provider_evaluation", "mask_evaluation", "human_quality_rating"],
  provider_id: "provider-a",
  processing_region: "us",
  provider_terms_snapshot_id: "provider-terms-v1",
  provider_training_enabled: false,
  provider_retention_expires_at: "2026-10-02T00:00:00Z",
  requested_identity_processing: "none",
};

function decide(
  manifests: readonly BenchmarkAssetManifest[] = [source, mask],
  technicalVerifications: readonly AssetTechnicalVerification[] = [
    verification(source),
    verification(mask),
  ],
  requestOverride: Partial<AssetTransferAuthorizationRequest> = {},
) {
  return evaluateAssetTransferEligibility({
    request: { ...request, ...requestOverride },
    trusted_time: {
      policy_version: assetFreshnessPolicyVersion,
      clock_source: "trusted_server_clock",
      evaluated_at_utc: requestOverride.evaluated_at_utc ?? request.evaluated_at_utc,
    },
    manifests,
    technical_verifications: technicalVerifications,
  });
}

function codes(result: ReturnType<typeof decide>): readonly string[] {
  return result.findings.map((finding) => finding.code);
}

describe("benchmark asset transfer eligibility", () => {
  it("authorizes a complete synthetic source and derivative chain deterministically", () => {
    const first = decide();
    const second = decide([mask, source], [verification(mask), verification(source)]);
    const golden = JSON.parse(
      readFileSync(
        new URL("../../../tests/evals/asset-eligibility.golden.json", import.meta.url),
        "utf8",
      ),
    ) as unknown;

    expect(first.findings).toEqual([]);
    expect(first.eligible).toBe(true);
    expect(first.evaluated_asset_ids).toEqual([source.asset_id, mask.asset_id]);
    expect(first.manifest_graph_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toEqual(first);
    expect(first).toEqual(golden);
  });

  it.each([
    ["expired retention", { retention_expires_at: "2026-10-04T00:00:00Z" }, "RETENTION_EXPIRES_BEFORE_COMPLETION"],
    ["expired license", { license_expires_at: "2026-10-04T00:00:00Z" }, "RIGHTS_EXPIRE_BEFORE_COMPLETION"],
    ["pending withdrawal", { withdrawal_status: "withdrawal_pending" }, "WITHDRAWN_OR_PENDING"],
    ["pending deletion", { deletion_status: "deletion_pending" }, "ASSET_NOT_PRESENT"],
    ["suspended quality", { quality_eligibility: "suspended" }, "QUALITY_INELIGIBLE"],
  ] as const)("rejects %s", (_label, override, expected) => {
    const changed = { ...source, ...override } as BenchmarkAssetManifest;
    const result = decide([changed, mask], [verification(changed), verification(mask)]);
    expect(result.eligible).toBe(false);
    expect(codes(result)).toContain(expected);
  });

  it("rejects an unapproved provider, territory, or requested scope", () => {
    const destination = decide(undefined, undefined, {
      provider_id: "provider-b",
      processing_region: "ca",
    });
    const scope = decide(undefined, undefined, {
      requested_uses: [
        "provider_evaluation",
        "prompt_evaluation",
        "human_quality_rating",
      ],
    });

    expect(codes(destination)).toEqual(
      expect.arrayContaining([
        "PROCESSING_TERRITORY_NOT_PERMITTED",
        "PROVIDER_DESTINATION_NOT_PERMITTED",
      ]),
    );
    expect(codes(scope)).toContain("REQUESTED_USE_NOT_PERMITTED");
  });

  it("requires an explicit attestation for a broad provider grant", () => {
    const ambiguous = { ...source, permitted_providers: ["*:us"] };
    const approved = {
      ...ambiguous,
      broad_provider_grant_attestation_id: "att_00000003",
    };

    expect(
      codes(
        decide([ambiguous], [verification(ambiguous)], {
          root_asset_ids: [ambiguous.asset_id],
        }),
      ),
    ).toContain("AMBIGUOUS_PROVIDER_GRANT");
    expect(
      decide([approved], [verification(approved)], {
        root_asset_ids: [approved.asset_id],
      }).eligible,
    ).toBe(true);
  });

  it.each([
    "identity_search",
    "celebrity_matching",
    "demographic_inference",
    "attractiveness_scoring",
    "diagnosis",
    "offline_face_similarity",
  ] as const)("rejects the %s identity purpose", (requested_identity_processing) => {
    expect(
      codes(decide(undefined, undefined, { requested_identity_processing })),
    ).toContain("DISALLOWED_IDENTITY_PURPOSE");
  });

  it("rejects missing or ineligible adult evidence", () => {
    const changed = {
      ...source,
      adult_status: "ineligible",
      adult_verification_method: undefined,
    } as unknown as BenchmarkAssetManifest;
    expect(codes(decide([changed, mask], [verification(changed), verification(mask)]))).toContain(
      "ADULT_STATUS_NOT_VERIFIED",
    );
  });

  it("rejects missing parents, derivation cycles, and broadened child rights", () => {
    const missingParent = { ...mask, derived_from_asset_ids: ["ast_99999999"] };
    const sourceCycle = { ...source, derived_from_asset_ids: [mask.asset_id] };
    const broadChild = {
      ...mask,
      permitted_providers: [...mask.permitted_providers, "provider-b:us"],
    };

    expect(codes(decide([source, missingParent], [verification(source), verification(missingParent)]))).toContain(
      "MANIFEST_MISSING",
    );
    expect(codes(decide([sourceCycle, mask], [verification(sourceCycle), verification(mask)]))).toContain(
      "DERIVATION_CYCLE",
    );
    expect(codes(decide([source, broadChild], [verification(source), verification(broadChild)]))).toContain(
      "DERIVATIVE_RIGHTS_BROADER_THAN_PARENT",
    );
  });

  it("rejects unsafe identifiers, paths, content, and unknown fields", () => {
    const unsafe = {
      ...source,
      asset_id: "client-jane.jpg",
      restricted_locator_id: "C:/portraits/client.jpg",
      contact_email: "person@example.com",
    } as unknown as BenchmarkAssetManifest;
    const result = decide(
      [unsafe],
      [{ ...verification(source), asset_id: unsafe.asset_id }],
      { root_asset_ids: [unsafe.asset_id] },
    );

    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "MANIFEST_SCHEMA_INVALID",
        "UNSAFE_MANIFEST_CONTENT",
        "UNSAFE_OPAQUE_IDENTIFIER",
        "UNSAFE_ROOT_ASSET_ID",
      ]),
    );
  });

  it("returns a denial rather than throwing when required arrays are missing", () => {
    const malformed = {
      ...source,
      permitted_uses: undefined,
      permitted_providers: undefined,
      territories: undefined,
      derived_from_asset_ids: undefined,
    } as unknown as BenchmarkAssetManifest;

    expect(() =>
      decide([malformed], [verification(malformed)], {
        root_asset_ids: [malformed.asset_id],
      }),
    ).not.toThrow();
    expect(
      codes(
        decide([malformed], [verification(malformed)], {
          root_asset_ids: [malformed.asset_id],
        }),
      ),
    ).toContain("MANIFEST_SCHEMA_INVALID");
  });

  it("runtime-validates missing, unknown, mistyped, and invalid request fields", () => {
    const malformed = {
      ...request,
      stage: "T9",
      check: "send_now",
      provider_training_enabled: "false",
      unexpected_private_field: "hidden",
    };
    const result = evaluateAssetTransferEligibility({
      request: malformed,
      trusted_time: {
        policy_version: assetFreshnessPolicyVersion,
        clock_source: "trusted_server_clock",
        evaluated_at_utc: request.evaluated_at_utc,
      },
      manifests: [source],
      technical_verifications: [verification(source)],
    });
    const { provider_id: _missingProvider, ...missingField } = request;
    const missingResult = evaluateAssetTransferEligibility({
      request: missingField,
      trusted_time: {
        policy_version: assetFreshnessPolicyVersion,
        clock_source: "trusted_server_clock",
        evaluated_at_utc: request.evaluated_at_utc,
      },
      manifests: [source],
      technical_verifications: [verification(source)],
    });

    expect(result.eligible).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["REQUEST_ENUM_OR_TYPE_INVALID", "REQUEST_SCHEMA_INVALID"]),
    );
    expect(missingResult.findings.map((finding) => finding.code)).toContain(
      "REQUEST_SCHEMA_INVALID",
    );
  });

  it("redacts unsafe request and asset identifiers from all returned evidence", () => {
    const unsafeDecision = "client-jane@example.com";
    const unsafeRun = "C:/private/run";
    const unsafeAsset = "ast_client01";
    const result = evaluateAssetTransferEligibility({
      request: {
        ...request,
        decision_id: unsafeDecision,
        run_id: unsafeRun,
        root_asset_ids: [unsafeAsset],
      },
      trusted_time: {
        policy_version: assetFreshnessPolicyVersion,
        clock_source: "trusted_server_clock",
        evaluated_at_utc: request.evaluated_at_utc,
      },
      manifests: [],
      technical_verifications: [],
    });
    const serialized = JSON.stringify(result);

    expect(result.decision_id).toMatch(/^redacted_[a-f0-9]{16}$/);
    expect(result.run_id).toMatch(/^redacted_[a-f0-9]{16}$/);
    expect(result.evaluated_asset_ids).toEqual([
      expect.stringMatching(/^redacted_[a-f0-9]{16}$/),
    ]);
    expect(serialized).not.toContain(unsafeDecision);
    expect(serialized).not.toContain(unsafeRun);
    expect(serialized).not.toContain(unsafeAsset);
  });

  it("rejects invalid tone, texture, and assignment enumerations at runtime", () => {
    const invalidCoverage = {
      ...source,
      second_reviewed_by: "steward_0002",
      second_reviewed_at: "2026-09-30T22:00:00Z",
      coverage_scheme_version: "coverage-v1",
      tone_band: "ST7",
      tone_assignment_method: "model_inferred",
      texture_group: "HT9",
      texture_assignment_method: "guessed",
    } as unknown as BenchmarkAssetManifest;

    expect(
      codes(
        decide([invalidCoverage], [verification(invalidCoverage)], {
          stage: "T1",
          root_asset_ids: [invalidCoverage.asset_id],
        }),
      ),
    ).toContain("COVERAGE_ENUM_INVALID");
  });

  it("enforces trusted pre-transfer and technical-verification freshness windows", () => {
    const staleDecision = decide(undefined, undefined, {
      planned_run_at_utc: "2026-10-01T00:06:00Z",
    });
    const staleVerification = {
      ...verification(source),
      verified_at: "2026-09-29T23:59:59Z",
    };
    const staleTechnical = decide(undefined, [staleVerification, verification(mask)]);
    const mismatchedTime = evaluateAssetTransferEligibility({
      request,
      trusted_time: {
        policy_version: assetFreshnessPolicyVersion,
        clock_source: "trusted_server_clock",
        evaluated_at_utc: "2026-10-01T00:01:00Z",
      },
      manifests: [source, mask],
      technical_verifications: [verification(source), verification(mask)],
    });
    const untrustedClock = evaluateAssetTransferEligibility({
      request,
      trusted_time: {
        policy_version: "caller-selected-policy",
        clock_source: "browser_clock",
        evaluated_at_utc: request.evaluated_at_utc,
      },
      manifests: [source, mask],
      technical_verifications: [verification(source), verification(mask)],
    });

    expect(codes(staleDecision)).toContain("ELIGIBILITY_DECISION_STALE_BEFORE_RUN");
    expect(codes(staleTechnical)).toContain("TECHNICAL_VERIFICATION_STALE");
    expect(mismatchedTime.findings.map((finding) => finding.code)).toContain(
      "UNTRUSTED_EVALUATED_TIME",
    );
    expect(untrustedClock.findings.map((finding) => finding.code)).toContain(
      "TRUSTED_TIME_CONTRACT_INVALID",
    );
    expect(untrustedClock.clock_source).toBe("invalid");
  });

  it("treats provider-training permission as inherited and no broader than parents", () => {
    const broaderMask = { ...mask, provider_training_allowed: true };
    expect(
      codes(decide([source, broaderMask], [verification(source), verification(broaderMask)])),
    ).toContain("DERIVATIVE_RIGHTS_BROADER_THAN_PARENT");
  });

  it.each([
    [{ content_sha256: "c".repeat(64) }, "NORMALIZED_BYTES_MISMATCH"],
    [{ observed_subject_count: 2 }, "SUBJECT_COUNT_MISMATCH"],
    [{ duplicate_status: "unresolved" }, "DUPLICATE_CHECK_UNRESOLVED"],
    [{ malware_status: "detected" }, "MALWARE_CHECK_UNRESOLVED"],
    [{ content_safety_status: "unresolved" }, "CONTENT_SAFETY_UNRESOLVED"],
    [{ source_consistency_status: "mismatch" }, "SOURCE_CONSISTENCY_UNRESOLVED"],
  ] as const)("rejects unresolved or mismatched technical evidence %#", (override, expected) => {
    const changed = { ...verification(source), ...override } as AssetTechnicalVerification;
    expect(codes(decide(undefined, [changed, verification(mask)]))).toContain(expected);
  });

  it("requires class-specific consent, license, and synthetic provenance proofs", () => {
    const consented = {
      ...source,
      provenance_class: "explicitly_consented_adult",
      source_origin_attestation: "purpose_collected_benchmark",
      adult_status: "verified_adult",
      adult_verification_method: "verified_recruitment_record",
      withdrawal_status: "active",
      consent_receipt_id: undefined,
    } as unknown as BenchmarkAssetManifest;
    const licensed = {
      ...source,
      provenance_class: "licensed",
      source_origin_attestation: "purpose_licensed_benchmark",
      adult_status: "verified_adult",
      adult_verification_method: "license_record_adult_attestation",
      withdrawal_status: "active",
      license_record_id: undefined,
    } as unknown as BenchmarkAssetManifest;
    const synthetic = {
      ...source,
      prompt_origin_attestation_id: undefined,
    } as unknown as BenchmarkAssetManifest;

    expect(codes(decide([consented], [verification(consented)], { root_asset_ids: [consented.asset_id] }))).toContain("CONSENT_PROOF_INVALID");
    expect(codes(decide([licensed], [verification(licensed)], { root_asset_ids: [licensed.asset_id] }))).toContain("LICENSE_PROOF_INVALID");
    expect(codes(decide([synthetic], [verification(synthetic)], { root_asset_ids: [synthetic.asset_id] }))).toContain("SYNTHETIC_PROVENANCE_PROOF_INVALID");
  });

  it("requires second-person and core coverage evidence at T1", () => {
    const result = decide(undefined, undefined, { stage: "T1" });
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "CORE_COVERAGE_EVIDENCE_MISSING",
        "SECOND_PERSON_REVIEW_REQUIRED",
      ]),
    );
  });

  it("fails closed when provider training is enabled or retention exceeds rights", () => {
    expect(codes(decide(undefined, undefined, { provider_training_enabled: true }))).toContain(
      "PROVIDER_TRAINING_ENABLED",
    );
    expect(
      codes(
        decide(undefined, undefined, {
          provider_retention_expires_at: "2028-01-01T00:00:00Z",
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "PROVIDER_RETENTION_EXCEEDS_ASSET_RIGHTS",
      ]),
    );
  });
});
