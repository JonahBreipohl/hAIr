# Quality, safety, privacy, and testing plan

**Status:** baseline release contract; thresholds will be calibrated with real benchmark evidence  
**Principle:** a beautiful image is a failure if it changes the client's identity, ignores the request, hides a cohort weakness, or cannot be handled privately

## Allowed product use

The adult MVP supports consensual hair-only visualization: cut, length, silhouette, layers, fringe, part, styling texture, volume, fades/tapers, color families and tones, highlights, braids, locs, and other protective styles.

It does not support:

- face swap, impersonation, or changing a client into another real person;
- non-consensual, intimate, humiliating, violent, harassing, or deceptive edits;
- minors during the MVP/pilot;
- changes to facial features, body, skin tone, perceived ethnicity, age appearance, disability, or gender characteristics;
- attractiveness ranking, face-shape destiny, emotion or personality inference;
- medical/scalp diagnosis or hair-loss treatment claims;
- exact chemical-color or service-outcome promises;
- political persuasion, identity-document edits, fraud, or deceptive before/after advertising;
- automated retrieval or scraping of celebrity and copyrighted character imagery.

Public-figure and character names are treated as shorthand for visible hair attributes. The user confirms the resulting description before generation.

## Consent and privacy gate

Before an image leaves the device, the client must see and acknowledge:

- what will be created and that it is an AI visualization;
- which salon and service providers process the image;
- the default deletion time and the effect of explicitly saving;
- that the image is not used by hAIr to train a model;
- how to delete immediately and where to raise a concern;
- that the product is adult-only during the pilot.

Store a consent receipt with time, purpose, policy version, salon, and session ID. Do not embed the portrait or sensitive prompt text in the receipt.

Treat every portrait, mask, and generated likeness as sensitive personal data even where it does not meet a jurisdiction's definition of biometric data. Do not implement identification, authentication, face search, or persistent face embeddings. Obtain privacy/legal review and a documented retention/destruction policy before a public pilot. Under GDPR, photographs are personal data and become special-category biometric data when processed through specific techniques for unique identification; hAIr avoids that purpose and still applies strong controls. [GDPR text](https://eur-lex.europa.eu/eli/reg/2016/679)

Shared and downloaded previews carry a visible AI label. Preserve supported machine-readable provenance and review applicable transparency requirements before each region launches. [European Commission AI transparency guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations)

## Image benchmark

### Dataset stages

- **Technical spike set:** 30–50 synthetic, licensed, or explicitly consented adult portraits for fast provider/prompt/mask iteration.
- **Pilot release set:** target 120 adults with documented provenance and consent, balanced enough to measure meaningful gaps across six skin-tone groups and four broad hair-texture groups.
- Include varied age appearance, gender presentation, density, gray hair, shaved/bald looks, glasses, ears, head shape, lighting, hair length, and protective styles.
- Keep real customer and benchmark assets in restricted storage, outside source control and routine CI. Record consent, license, permitted use, and deletion date separately.

For each subject, cover representative transformations such as color-only, shorter, longer, fringe, fade/taper, layers/volume, highlights/balayage, high-texture/protective style, and reference-driven editing. Use identical source, reference, mask, structured request, resolution, and comparison procedure across candidates.

### Blinded human rubric

At least two licensed stylists and one general rater score each output from 0–5 on separate dimensions:

1. identity and face preservation;
2. requested hairstyle adherence;
3. locality outside the intended hair region;
4. hairline, ear, forehead, neck, and shoulder boundary quality;
5. physical and lighting realism;
6. color plausibility;
7. usefulness in a real consultation.

Do not collapse these into one average. A critical identity or locality failure cannot be offset by attractive hair. OpenAI's current virtual try-on evaluation guidance likewise treats wearer preservation, reference fidelity, edit locality, and physical plausibility as separate requirements. [OpenAI image editing evals](https://developers.openai.com/cookbook/examples/multimodal/image_evals)

### Automated regression signals

Use automated checks to find likely failures, not to declare a result safe:

- output decodes, dimensions, alpha/format, and corruption;
- exactly one expected subject remains present;
- protected-region perceptual/structural difference after alignment;
- change outside the hair/growth mask;
- controlled color difference for color tasks;
- background, clothing, and pose change signals;
- moderation and policy state;
- failure, retry, partial-success, latency, and usage/cost;
- variation across repeated generations of the same case.

Vision-model graders may triage results only after calibration against human ratings. If an offline evaluation uses facial-similarity embeddings, obtain explicit evaluation consent, isolate processing, never use the embedding in production, and delete it after scoring.

## Quality gates

### Technical prototype gate

At least one provider/prompt/mask configuration must achieve:

- median human identity and requested-style scores of at least 4/5;
- severe identity, anatomy, or background artifacts in no more than 10% of outputs;
- p95 end-to-end result time no more than 120 seconds;
- measured cost below a provisional cap approved before the run;
- no single known cohort with obviously unusable behavior.

If no configuration clears this gate, stop the full product build and iterate on capture, masks, prompts, models, or scope.

### Pilot release gate

- At least 95% of displayed outputs score 4–5 for identity, with no known severe identity failures escaping the output gate.
- At least 85% score 4–5 for major hairstyle adherence.
- At least 90% score 4–5 for realism and edit locality.
- Fewer than 1% show major hairline, anatomy, or background artifacts after automatic rejection/retry.
- No sufficiently sampled cohort trails overall pass rate by more than five percentage points, and no cohort pass rate is below 85%.
- At least 80% of pilot stylists say the accepted result is useful in a real consultation.
- p95 generation latency is below 90 seconds, with a stretch target of 60 seconds.
- Cost is below $0.20 per usable result, including failed attempts and retries, or a revised cap supported by unit economics.
- Consent, immediate deletion, expiry, tenant isolation, and moderation tests pass completely.

Thresholds may change only through a recorded decision backed by user research, technical evidence, and product economics. They may not be weakened merely to ship.

## Software test strategy

### Unit

- structured hair-spec validation and public-figure descriptor conversion;
- prompt-template invariants and negative constraints;
- consultation/job state transitions and idempotency;
- retention/deletion calculations and consent-policy versioning;
- authorization rules, cost accounting, and log redaction.

### Component and integration

- camera/upload fallback and file validation;
- signed-upload scope, database tenant policies, and cross-tenant denial;
- queue retries, duplicate delivery, timeout, cancellation, and worker crash recovery;
- provider adapter success, policy rejection, malformed output, and rate limiting;
- partial results, expired links, deletion cascade, and orphan cleanup;
- telemetry contains allowed metadata and never customer content.

### End to end

Use a deterministic fake image provider in normal CI for:

- consent -> capture/upload -> describe -> generate -> compare -> agree -> delete;
- failed variant with successful siblings and a targeted retry;
- user cancellation and late callback;
- session expiry and revoked share link;
- keyboard/screen-reader flow and responsive phone/tablet layouts.

Run a small controlled live-provider smoke test only after provider, model, prompt, mask, or quality-setting changes. Do not send live customer data from CI.

### Non-functional and adversarial

- accessibility against WCAG 2.2 AA, including target size, focus, contrast, labels, reduced motion, and non-color status;
- current iOS Safari, Android Chrome, and representative salon tablets;
- poor connectivity, background/foreground transitions, duplicate taps, and browser refresh during jobs;
- file bombs, malformed media, unsupported formats, prompt injection in user text, and malicious metadata;
- authorization, secret scanning, dependency review, rate limits, and tenant isolation;
- provider outage, queue backlog, storage deletion failure, and emergency generation kill switch;
- load and cost tests at pilot concurrency, plus backup/restore and rollback rehearsal before general availability.

## Release gates

A change reaches the pilot only when:

- required software checks and the relevant image-quality delta pass;
- no unresolved critical or high privacy/security issue remains;
- database changes are compatible with the running version;
- consent, retention, deletion, output labeling, and access boundaries are demonstrably working;
- monitoring, spend/concurrency limits, rollback, and provider-failure behavior exist;
- product copy does not imply a guaranteed service outcome.

General availability additionally requires independent security/privacy review, support ownership, incident and deletion runbooks, dependency/secret scanning, load testing, backup/restore evidence, regional legal review, and four weeks of meeting the agreed service-level objective.

## Residual risks to keep visible

- identity drift that automated checks miss;
- weaker results for coily hair, protective styles, gray/thinning hair, and very short cuts;
- plausible but physically or chemically unachievable looks;
- masks that fail when new hair extends beyond the source silhouette;
- color differences from lighting, camera processing, display, and starting hair condition;
- provider policy, quality, price, or retention changes;
- screenshots that remove product UI labels;
- users uploading images without the subject's authority.

These risks require product controls, professional judgment, monitoring, and regression tests. Prompt wording alone is not an adequate mitigation.
