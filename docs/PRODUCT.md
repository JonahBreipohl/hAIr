# Product brief

**Status:** working baseline for discovery  
**Working name:** hAIr  
**Primary product:** mobile-first, installable web app for professional salon consultations

## The decision

hAIr should be a professional consultation workflow with AI preview generation inside it, rather than a consumer novelty generator. Its value is helping a stylist and client turn inspiration into a shared visual direction, record whether that direction is feasible, and leave with an agreed service brief.

Working positioning:

> Turn a client's inspiration into a look you can both agree on and a service the stylist can actually deliver.

This choice creates a clearer reason to pay than “generate many hairstyles.” Existing tools already offer broad consumer try-on and color experimentation. L'Oréal Professionnel, for example, describes an in-salon flow combining inspiration, virtual try-on, professional diagnosis, and product recommendations. That validates the consultation use case while leaving room for a vendor-neutral workflow that covers cut and color, records feasibility, protects client photos, and can later connect to salon systems. [L'Oréal My Hair iD](https://www.lorealprofessionnel.co.uk/my-hair-id-for-pros)

## Problem hypothesis

Clients often bring a name, a celebrity or character, a screenshot, or an imprecise description. The stylist must translate that reference into concrete hair attributes, explain what is possible given the client's current hair, and align expectations before starting. Static references show the style on someone else; generic AI apps produce attractive experiments but do not capture the professional decision or service implications.

hAIr succeeds if it reduces ambiguity without creating false certainty.

## Initial users

### Primary operator and buyer

An independent stylist or colorist handling meaningful transformations. They value a fast consultation, clearer expectation-setting, a professional artifact to share, and less rework or dissatisfaction.

### Participating user

The client, normally beside the stylist. A client account is not required. A QR/link handoff may let the client capture their own image or view an agreed board.

### Initial wedge

Start with higher-consideration cut and color changes where uncertainty and service value are highest. Include barbers during discovery and pilot, then add a dedicated barber template after the core workflow passes. The later template can expose fade height, taper, guard, line-up, blend, and top-length controls without complicating the first experience.

## Core workflow

1. The stylist taps **New consultation**. The client does not need an account.
2. The client reviews a concise consent and retention notice.
3. The stylist takes a guided front photo, uploads one, or offers a QR code so the client can capture it.
4. On-device or server checks flag poor lighting, obstruction, multiple faces, severe angle, and an obscured hairline before a paid generation begins.
5. The stylist or client chooses simple goals: shorter/same/longer, color family and tone, texture, volume, fringe, part, and maintenance tolerance. Optional free text and one or more inspiration images are available.
6. A celebrity or character name is translated into neutral hair attributes for confirmation. The product never replaces the client's face with the referenced person's face.
7. The app generates several labeled previews asynchronously. Each result appears as it succeeds; one failure does not erase the others.
8. Client and stylist compare the original and results, favorite one or two, and refine one dimension at a time with large controls such as **shorter**, **warmer**, **less volume**, **add fringe**, or **raise fade**.
9. The stylist marks the choice **feasible now**, **needs preparation/grow-out**, or **inspiration only**, then adds concise service and maintenance notes.
10. The client may receive a branded consultation board by QR/link/download. The app always offers deletion, and unsaved assets expire automatically.

```mermaid
flowchart LR
    A[Consent] --> B[Guided photo]
    B --> C[Hair goals and reference]
    C --> D[Confirm structured look]
    D --> E[Generate previews]
    E --> F[Compare and refine]
    F --> G[Stylist feasibility]
    G --> H[Agree, share, or delete]
```

## MVP scope

### Included

- Stylist account and a lightweight salon profile
- Guest client consultations
- Explicit consent, capture/upload, and photo-quality guidance
- Structured controls for length, color, texture, volume, fringe, part, and finish
- Optional text and user-supplied reference images
- Three or four previews with progress, partial success, retry, and cancel states
- Original/result comparison, favorites, and single-attribute refinement
- Stylist feasibility status plus service and maintenance notes
- Branded consultation board with controlled sharing/download
- Immediate deletion and automatic expiry
- Basic feedback, quality, latency, failure, and cost measurement
- Accessible responsive layouts for current iOS Safari, Android Chrome, and common salon tablets

### Explicitly excluded

- Live video AR, 3D simulation, or multi-angle consistency
- Exact chemical formulation, shade guarantee, or outcome prediction
- Medical or scalp diagnosis
- Automated attractiveness or “best style for your face” judgments
- Booking, point-of-sale, payment, inventory, or marketplace features
- A scraped or licensed celebrity image catalog
- Long-term client records by default
- Social feeds or public galleries

## Experience principles

- **Professional first.** The stylist's feasibility judgment is part of the product, not a disclaimer at the end.
- **Fast beside the chair.** Target a two-to-three-minute core flow. Prefer chips and visual controls over typing.
- **One-handed and interruption-safe.** Use generous targets, persist every completed result, and let generation continue when the user changes screens.
- **Original always visible.** Make comparison easy and keep AI output clearly labeled.
- **Controlled change.** Encourage one refinement at a time and say exactly what remains fixed.
- **Inclusive by construction.** Let the stylist correct inferred texture, density, color, and length. Evaluate cohorts separately.
- **Honest uncertainty.** At selection and sharing, explain that starting hair, texture, condition, technique, lighting, and maintenance affect the real result.
- **Quiet, professional design.** Use warm neutral surfaces, high contrast, large photography, plain language, and minimal “AI” decoration. The client photo and shared decision should dominate the screen.

## Initial information architecture

- **Home:** new consultation, recent explicitly saved consultations, salon settings
- **Capture:** consent, camera/upload, quality guidance, retake
- **Describe:** structured hair controls, reference, free text, structured summary
- **Generate:** progress per variant, cancel/retry, privacy reminder
- **Compare:** original toggle/slider, grid/full screen, favorite, refine
- **Plan:** feasibility, service notes, maintenance notes, share/download/delete
- **Admin:** branding, retention, team, usage/cost, data deletion requests

## Success measures and release hypotheses

The north-star measure is the percentage of consultations that end with a mutually approved look, a stylist feasibility classification, and a saved or shared service brief.

Initial pilot gates are hypotheses to validate, not promises:

| Measure | Initial gate |
|---|---:|
| Median capture-to-first-comparison | Under 3 minutes |
| First preview latency | p50 under 30 seconds; p95 under 90 seconds |
| Sessions completed without help | At least 85% |
| Batches with at least one stylist-rated usable preview | At least 75% |
| Displayed outputs without severe face, skin, age, or beauty alteration | At least 98% |
| Major length/color/style instruction adherence | At least 85% |
| Largest cohort gap in usable-output rate | No more than 10 percentage points |
| Completed sessions that save/share an agreed look | At least 60% |
| Pilot professionals still using weekly after four weeks | At least 50% |
| Deletion and scheduled expiry correctness | 100% in verification |

## Validation plan

1. Observe 20–30 real consultations and interview 10–15 professionals across colorists, textured-hair specialists, general stylists, and barbers.
2. Test the workflow with a clickable mobile prototype before polishing visuals.
3. Run a concierge technical benchmark on a consented, licensed, or synthetic dataset before building accounts and administration.
4. Pilot with roughly 10–15 professionals and at least 100 consultations after privacy and quality gates pass.
5. Invest in custom inference, native apps, or deep integrations only if measured quality, control, camera behavior, distribution, or economics justify it.

## Main product risks

| Risk | Product response |
|---|---|
| Preview creates unrealistic expectations | Stylist feasibility status, persistent AI label, no exact-outcome language |
| Face or skin changes destroy trust | Identity preservation is a blocking release gate; compare original and output |
| Uneven results across hair and skin cohorts | Stratified benchmark, per-cohort reporting, professional overrides |
| Color looks exact despite lighting and hair condition | Use color families/tones, show uncertainty, require professional advice |
| Client photo privacy or consent failure | Consent before upload, minimal collection, short retention, immediate deletion |
| Public-figure reference becomes impersonation | Translate to hair attributes; preserve client identity; no celebrity library |
| Salon flow is too slow | Guided capture, defaults, resumable async jobs, partial results |
| Generic competitors commoditize generation | Focus on the professional decision, feasibility record, service brief, privacy, and later integrations |

## Evidence to revisit

- Professional virtual consultation is an established category: [L'Oréal My Hair iD](https://www.lorealprofessionnel.co.uk/my-hair-id-for-pros).
- Web camera access is broadly available in secure contexts with explicit user permission: [MDN `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- Current OpenAI image models support image editing and reference-based preservation, but results must be measured: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting).
- OpenAI's own virtual try-on evaluation guidance emphasizes identity preservation, reference adherence, local edits, and physical plausibility: [OpenAI image editing evals](https://developers.openai.com/cookbook/examples/multimodal/image_evals).
