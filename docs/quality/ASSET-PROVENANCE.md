# Benchmark asset provenance and consent

**Policy ID:** `hair-benchmark-assets-v1`\
**Status:** required intake contract for every evaluation run\
**Scope:** source portraits, hairstyle references, masks, crops, and generated derivatives used in technical or pilot evaluation

The metadata-only machine validator and its current integration boundary are documented in [`HARNESS-IMPLEMENTATION.md`](HARNESS-IMPLEMENTATION.md). A passing decision must be recalculated immediately before provider transfer; a prior label or run-plan decision is not sufficient.

## Rule

An asset is ineligible unless hAIr can prove where it came from, that every depicted person is an adult or synthetic, that the required evaluation and provider-processing rights exist, and when the asset and its derivatives must be deleted. Uncertain provenance fails closed.

A normal client consultation upload never becomes a benchmark asset. Separate, explicit evaluation consent is required even if the client consented to receive an AI hairstyle preview. A stylist, salon, employee, model, or stock-photo buyer cannot consent on behalf of a depicted adult unless the documented agreement grants that authority.

Benchmark media stays in restricted storage. It must never enter source control, routine CI, preview deployments, issue trackers, chat transcripts, error reports, analytics, or general support tools. Repository fixtures must be purpose-made non-person test graphics or synthetic assets separately approved for source distribution; inclusion in the benchmark still does not authorize source-control storage.

## Allowed provenance classes

| Class | Required proof | Typical use | Additional conditions |
|---|---|---|---|
| `synthetic` | Generator/model and version, creation date, terms/license snapshot, prompt-origin attestation, and review that it does not intentionally depict a real person | H0, early T0, deterministic viewer and report tests | Source inputs used to create it must also be permitted; no celebrity/lookalike prompt or recovered private image |
| `licensed` | Executed license or authoritative license record tied to the asset; grant must cover AI editing, model/provider transfer, human evaluation, derivatives, and intended commercial R&D | T0/T1 and, if representation is adequate, P1 | “Royalty-free” or purchase receipt alone is insufficient; restrictions and expiry must be machine-readable |
| `explicitly_consented_adult` | Separate evaluation consent receipt plus adult-status verification, rights to capture/use the image, provider disclosure, human-rating disclosure, retention/deletion terms, and withdrawal route | T0/T1/P1 | Consent must be freely given, specific, recorded, and current; product-service consent alone is insufficient |

More than one class may apply, but at least one must independently authorize every planned use. Public availability is not a provenance class.

## Prohibited sources

Do not use:

- customer or salon consultation images repurposed from product use;
- minors, people of unknown adult status, or age-ambiguous synthetic depictions intended to represent minors;
- scraped search results, social media, portfolio sites, news/editorial imagery, screenshots, or “found online” images;
- celebrity, public-figure, influencer, or fictional-character image catalogs;
- stock or dataset assets whose license omits generative editing, provider processing, derivatives, or commercial evaluation;
- images with multiple people unless every person independently meets the same consent/license requirements and the case specifically tests multi-person rejection;
- images obtained through coercion, an employment requirement without a voluntary alternative, deceptive collection, or consent bundled with unrelated services;
- images with intimate, medical, identity-document, or otherwise unnecessary sensitive context;
- assets whose deletion obligation conflicts with the planned run or provider retention;
- assets a provider may use for training when the applicable consent/license does not explicitly authorize that use;
- references selected only because the subject resembles the client or because copying the reference person's face is desired.

The presence of a Creative Commons label is not enough. Record the exact license version, attribution obligations, modification and commercial-use permissions, source record, and verification date.

## Consent requirements

The consent experience for an explicitly consented benchmark participant must state, in plain language:

1. the evaluation purpose: testing AI hairstyle visualization rather than providing a guaranteed service result;
2. what is collected: source portrait(s), hairstyle requests/references, generated images, quality ratings, and non-content run metadata;
3. that hAIr and named provider classes or named providers will process the images, including the processing region when known;
4. that trained hAIr reviewers, including licensed stylists and general raters under confidentiality obligations, will view the source and generated images;
5. whether derivative generations may be retained and for how long;
6. that hAIr will not use the images to train a model and will select providers/settings consistent with the stated terms;
7. that participation is voluntary and separate from receiving salon services or employment;
8. how to withdraw and request deletion, what can still be deleted, and whether already published aggregate statistics can remain;
9. the storage deadline, deletion process, and contact route for concerns;
10. that the benchmark is adult-only;
11. whether the asset may be transferred to a replacement/challenger provider; and
12. a separate, optional choice for offline facial-similarity evaluation if such processing is ever proposed.

The optional facial-similarity scope defaults to false. Refusal must not prevent participation in the rest of the benchmark. It cannot authorize production face recognition, identity search, authentication, or persistent embeddings.

Store the signed/acknowledged consent record in a restricted consent registry. The evaluation manifest stores only its opaque receipt ID, version, relevant scopes, and validity dates. Do not store participant name, email, signature, birth date, or the consent document itself in the run bundle.

Adult verification records only the method and result needed to prove eligibility. Prefer `government_id_seen_not_copied`, verified recruitment records, or another reviewed method. Do not copy identity documents into the benchmark store.

## Style-reference rules

A hairstyle reference must have its own asset record and a right to be used for generative transformation. One of the following must be true:

- it is synthetic under an eligible license and does not intentionally depict a real person;
- it is licensed for the planned editing/provider use; or
- it was supplied by an adult who is authorized to use it and the benchmark's reference-use terms cover the planned provider transfer.

Crop or preprocess references to emphasize hair where that does not violate the license and does not remove evidence needed for realistic style interpretation. The prompt and rating viewer instruct the model and rater that the reference supplies hair attributes only. The client/source identity must remain controlling.

A public-figure or character name is handled as text input that is converted into visible hair attributes and confirmed before generation. Do not automatically retrieve a picture, store a celebrity catalog, score facial resemblance to the named person, or accept output that adopts the reference face.

## Asset manifest

The harness must validate a schema equivalent to the following. Fields marked “restricted” may appear in the restricted registry but not in a repository report.

| Field | Required | Meaning and validation |
|---|---|---|
| `schema_version` | Yes | Exact manifest schema version. |
| `asset_id` | Yes | Random opaque ID; contains no name, filename, salon, or demographic label. |
| `subject_id` | Portraits | Opaque ID shared by assets of one person; synthetic subjects use a separate namespace. |
| `asset_role` | Yes | `source_portrait`, `style_reference`, `mask`, `protected_region`, or `synthetic_test_fixture`. |
| `provenance_class` | Yes | `synthetic`, `licensed`, or `explicitly_consented_adult`. |
| `collection_id` | Yes | Versioned corpus/intake batch identifier. |
| `content_sha256` | Yes | Hash of the normalized, metadata-stripped bytes used by the run. |
| `restricted_locator_id` | Yes | Indirection into restricted storage; never a path, original filename, or signed URL. |
| `mime_type`, `width_px`, `height_px` | Yes | Decoded properties after normalization. |
| `metadata_stripped_at` | Yes | Verification timestamp and preprocessing version. |
| `subject_count` | Yes | Expected visible-person count; normally one. |
| `adult_status` | Person assets | `verified_adult`, `synthetic_adult`, or `ineligible`; unknown fails validation. |
| `adult_verification_method` | Person assets | Approved method; no birth date or ID number. |
| `consent_receipt_id` | Consented assets | Restricted registry pointer. |
| `consent_policy_version`, `consented_at`, `consent_expires_at` | Consented assets | Version and validity window. |
| `license_record_id`, `license_version`, `license_verified_at` | Licensed/synthetic assets | Restricted rights-registry pointer and verification facts. |
| `permitted_uses` | Yes | Enumerated scopes; see below. |
| `permitted_providers` | Yes | Provider IDs/classes and regions; wildcard requires an explicit broad grant. |
| `commercial_research_allowed` | Yes | Boolean. T1/P1 require true. |
| `human_rating_allowed` | Yes | Boolean. T1/P1 require true. |
| `derivative_generation_allowed` | Yes | Boolean. All live image-edit runs require true. |
| `provider_training_allowed` | Yes | Expected false; if false, provider settings/terms must enforce it. |
| `offline_face_similarity_allowed` | Yes | Defaults false and requires separate explicit consent to become true. |
| `territories` | Yes | Permitted processing/use regions. |
| `retention_expires_at` | Yes | Hard asset deadline, never indefinite. |
| `withdrawal_status` | Yes | `active`, `withdrawal_pending`, `withdrawn`, or `not_applicable`. Only active/not-applicable synthetic assets are eligible. |
| `deletion_status` | Yes | `present`, `deletion_pending`, `verified_deleted`, or `not_created`. |
| `derived_from_asset_ids` | Derived assets | Full parent chain for mask, crop, normalized source, and generated derivative. |
| `preprocessing_version` | Derived assets | Exact transformation version and parameters hash. |
| `coverage_scheme_version` | Core portraits | Versioned tone/texture/tag scheme. |
| `tone_band`, `tone_assignment_method` | Core portraits | `ST1`–`ST6`; participant-supplied or trained-steward assignment. |
| `texture_group`, `texture_assignment_method` | Core portraits | `HT1`–`HT4`; participant-supplied is required when hair is obscured. |
| `secondary_coverage_tags` | Optional | Controlled visible-condition tags used in the evaluation matrix. |
| `quality_eligibility` | Yes | `pending`, `eligible`, `suspended`, or `ineligible`, with reason code. |
| `reviewed_by`, `reviewed_at` | Yes | Pseudonymous steward ID and review time. |

`permitted_uses` is an allowlist drawn from:

- `harness_validation`;
- `provider_evaluation`;
- `prompt_evaluation`;
- `mask_evaluation`;
- `human_quality_rating`;
- `internal_aggregate_reporting`;
- `pilot_release_evaluation`;
- `source_distribution` (rare; never implied by another scope).

Absence means denial. `provider_evaluation` does not imply every provider; `permitted_providers` must also match.

### Example redacted manifest record

```json
{
  "schema_version": "1.0.0",
  "asset_id": "ast_01JXXXXXXX",
  "subject_id": "sub_01JXXXXXXX",
  "asset_role": "source_portrait",
  "provenance_class": "explicitly_consented_adult",
  "collection_id": "pilot-core-v1",
  "content_sha256": "<64-lowercase-hex>",
  "restricted_locator_id": "loc_01JXXXXXXX",
  "mime_type": "image/png",
  "width_px": 1536,
  "height_px": 2048,
  "metadata_stripped_at": "2026-09-25T20:00:00Z",
  "subject_count": 1,
  "adult_status": "verified_adult",
  "adult_verification_method": "government_id_seen_not_copied",
  "consent_receipt_id": "cns_01JXXXXXXX",
  "consent_policy_version": "benchmark-consent-v1",
  "consented_at": "2026-09-25T19:00:00Z",
  "consent_expires_at": "2027-03-25T19:00:00Z",
  "permitted_uses": [
    "provider_evaluation",
    "prompt_evaluation",
    "mask_evaluation",
    "human_quality_rating",
    "internal_aggregate_reporting",
    "pilot_release_evaluation"
  ],
  "permitted_providers": ["provider-a:us", "provider-b:us"],
  "commercial_research_allowed": true,
  "human_rating_allowed": true,
  "derivative_generation_allowed": true,
  "provider_training_allowed": false,
  "offline_face_similarity_allowed": false,
  "territories": ["US"],
  "retention_expires_at": "2027-03-25T19:00:00Z",
  "withdrawal_status": "active",
  "deletion_status": "present",
  "derived_from_asset_ids": [],
  "preprocessing_version": "normalize-v1",
  "coverage_scheme_version": "coverage-v1",
  "tone_band": "ST4",
  "tone_assignment_method": "participant_confirmed",
  "texture_group": "HT3",
  "texture_assignment_method": "participant_confirmed",
  "secondary_coverage_tags": ["glasses", "mixed_indoor_light"],
  "quality_eligibility": "eligible",
  "reviewed_by": "steward_07",
  "reviewed_at": "2026-09-25T20:05:00Z"
}
```

This is a schema illustration, not a real asset. The future machine schema should use enums, timestamps with UTC offsets, hash patterns, and conditional validation so a licensed asset cannot omit its license record and a consented asset cannot omit its consent receipt.

## Eligibility predicate

At run-plan time and again immediately before provider transfer, the harness must calculate asset eligibility from the manifest rather than trust a prior `eligible` label. An asset is eligible only if all of these are true:

- provenance class and required proof fields are present;
- adult status is verified or synthetic adult;
- consent/license is active at the planned run time;
- every requested use is in `permitted_uses`;
- provider and processing region are explicitly permitted;
- human review, derivative generation, and commercial research flags match the stage;
- provider training is disabled when the asset disallows it;
- retention will remain valid through the planned run and adjudication window;
- neither the asset nor any parent in its derivation chain is withdrawn, suspended, ineligible, expired, or deletion-pending;
- normalized bytes match the recorded hash and decode properties;
- no unresolved duplicate, malware, content-safety, or subject-count flag exists;
- the asset belongs to the locked dataset version.

The run plan records an eligibility result and reason codes. The live adapter rechecks authorization and rejects the request if state changed after planning.

## Intake workflow

1. **Quarantine:** place the upload in a restricted intake area with a random locator; do not preserve the client filename in downstream systems.
2. **Rights check:** link consent or license evidence, verify adult status, planned providers/regions, human review, derivatives, commercial evaluation, and expiry.
3. **Technical validation:** decode safely, enforce type/pixel/size limits, scan for malformed content, verify subject count, and reject unnecessary sensitive context.
4. **Normalize:** correct orientation, strip EXIF/XMP/IPTC and embedded thumbnails, convert through the approved pipeline, then hash the normalized bytes.
5. **Provenance review:** check for duplicate/near-duplicate assets, possible public-figure likeness, source inconsistency, and parent-asset authorization.
6. **Coverage tagging:** assign only the approved evaluation fields and assignment method. Do not infer demographic identity, attractiveness, health, or diagnosis.
7. **Second-person review:** a separate steward confirms the manifest and eligibility for T1/P1.
8. **Promote:** move the normalized asset into the restricted versioned collection, create an access record, and delete quarantine copies.

Rejected intake media is deleted under the intake policy and never used to improve the benchmark.

## Storage and access

- Encrypt media in transit and at rest and keep it private behind short-lived, single-purpose authorization.
- Separate media storage, consent/license evidence, and pseudonymous evaluation manifests. No single routine evaluator view should expose identity/contact information.
- Grant least-privilege roles for intake steward, run worker, human rater, adjudicator, privacy operator, and auditor.
- A rater can see only assigned source/reference/output media during the rating window. They cannot download originals by default.
- Provider-facing URLs are short-lived, audience-scoped, and never logged.
- Access logs contain opaque IDs, actor role, purpose, time, and result; they contain no image, filename, prompt, or signed URL.
- Copying benchmark media to laptops, shared drives, notebooks, or personal accounts is prohibited.
- Backups must inherit expiry and deletion behavior. A deletion is incomplete while a routinely restorable copy remains beyond the documented backup-erasure window.

Benchmark retention is set per consent/license and must be no longer than needed for the declared evaluation program. It is separate from the product consultation defaults in D-008; evaluation consent cannot silently broaden product retention, and product consent cannot silently authorize benchmark retention.

## Derivatives and chain of custody

Masks, crops, normalized images, embeddings, and outputs inherit the most restrictive parent authorization and deletion deadline. Each derivative records every direct parent and its preprocessing/generation version. A style reference and source portrait are both parents of a reference-driven output.

Generated outputs remain sensitive likeness data even when the provider labels them synthetic. They do not become shareable test fixtures. Screenshots, thumbnails, reviewer exports, and failure examples are derivatives and require the same controls.

Aggregate reports may remain after media deletion only when the consent/license allows internal aggregate reporting and the report cannot reasonably identify a subject. Small-cell comments, free text, and visual examples require separate review. Suppress or generalize any aggregate cell with fewer than five subjects in broadly distributed reports.

## Withdrawal, expiry, and deletion

Withdrawal and expiry stop new use immediately:

1. set the subject and every linked asset to `withdrawal_pending` or expired;
2. invalidate run-plan authorization and short-lived links;
3. cancel queued work where safe and prevent new provider calls;
4. identify all normalized sources, references, masks, crops, generated outputs, thumbnails, temporary files, reviewer caches, embeddings, and backups through the derivation graph;
5. delete or cryptographically expire each copy and submit any contractually supported provider deletion request;
6. verify absence from active storage, queues, caches, reviewer tools, and the next eligible backup lifecycle;
7. mark records `verified_deleted` with an opaque deletion-receipt ID, timestamp, scope, and verifier;
8. remove or de-identify row-level ratings if consent does not permit their retention; retain only the minimum non-identifying tombstone needed to prevent reuse.

If deletion fails, retry with bounded backoff, alert the privacy operator, block the affected collection from new runs, and record the unresolved location without exposing content. A run report relying on a withdrawn asset is marked historically valid only if its prior use was authorized; it cannot provide visual examples or support a new decision.

## Audit before each run

The data steward signs a machine-generated audit containing:

- dataset version and manifest hash;
- counts by provenance class, consent/license version, provider permission, and expiry window;
- 6 × 4 core coverage and secondary-condition counts;
- missing, conflicting, expired, withdrawn, or deletion-pending records (must be zero in the run set);
- duplicate and derivation-chain checks;
- metadata-stripping and content-hash verification results;
- requested providers/regions versus permitted providers/regions;
- retention deadline versus expected rating/adjudication completion;
- confirmation that no benchmark media is in source control or routine logs;
- reviewer IDs and approval timestamps.

No provider run begins until this audit passes. The aggregate audit result belongs in the evaluation report; consent documents, storage locators, and asset-level sensitive metadata do not.
