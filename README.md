# hAIr

hAIr is a mobile-first salon consultation product. A stylist takes or uploads a client photo, captures a few hair preferences or a reference, and generates AI previews that help the stylist and client agree on a direction before the service begins.

The product is a consultation aid. It does not promise an exact haircut or chemical color outcome. The stylist remains responsible for feasibility, service planning, and professional advice.

## Product decision

The first product will be an installable progressive web app (PWA) for phones, tablets, and desktop browsers. It will support a fast guest consultation, structured hair controls, optional inspiration images, several generated previews, comparison and refinement, a stylist feasibility note, sharing, and immediate deletion. A native app or salon-software connector will follow only if pilot evidence shows a clear need.

The first technical gate is image quality: the system must preserve the client's identity, change only the requested hair attributes, and work across a diverse range of hair textures, lengths, colors, skin tones, lighting, and head shapes. We will prove that before building billing, booking integrations, or deep administration.

## Current phase

Discovery contracts are complete. The project is now in **technical prototype validation**: a deterministic fake-provider PWA, a state-complete research wireframe, and a provider-neutral private application-service simulator are working. The simulator exercises consent, scoped access, asynchronous generation, agreement, sharing, retention, and verified deletion without storing live portraits. Live image quality remains the release-defining gate, and no live portrait leaves the browser in the current app.

## Project documents

- [Open and try the local prototype](docs/TRY-PROTOTYPE.md)
- [Product brief](docs/PRODUCT.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [Quality, safety, and privacy gates](docs/QUALITY.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Decision log](docs/DECISIONS.md)
- [Current status](ops/STATUS.md)
- [Task graph](ops/TASKS.yaml)
- [Six-hour supervisor contract](ops/SUPERVISOR.md)
- [Interactive research wireframe](prototypes/consultation-wireframe/index.html)
- [Moderated usability session kit](docs/research/USABILITY-SESSION-KIT.md)
- [Usability session worksheet](docs/research/SESSION-WORKSHEET.md)
- [Benchmark protocol](docs/quality/EVAL-PROTOCOL.md)
- [Evaluation harness implementation coverage](docs/quality/HARNESS-IMPLEMENTATION.md)
- [Locked evaluation record contracts](docs/quality/EVALUATION-RECORDS.md)
- [Executable locked fake evaluation runner](docs/quality/LOCKED-FAKE-RUNNER.md)
- [Declared benchmark coverage contracts](docs/quality/EVALUATION-COVERAGE.md)
- [Closed offline worker preflight](docs/quality/OFFLINE-WORKER.md)
- [Deterministic evaluation scheduling](docs/quality/EVALUATION-SCHEDULING.md)
- [Declared pricing and attempt-cost evidence](docs/quality/EVALUATION-COSTS.md)
- [Declared human rating and adjudication evidence](docs/quality/EVALUATION-RATINGS.md)
- [Declared quality metrics and denominator scopes](docs/quality/EVALUATION-METRICS.md)
- [Declared uncertainty and raw rating agreement](docs/quality/EVALUATION-STATISTICS.md)
- [Stable declared benchmark report export](docs/quality/EVALUATION-REPORT-BUNDLE.md)
- [Privacy and deletion contract](docs/privacy/DELETION-CONTRACT.md)
- [Private application-service contract](docs/api/PRIVATE-APPLICATION-SERVICE.md)

## Non-negotiables

- Consent comes before photo upload or generation.
- Customer photos stay private, use short default retention, and can be deleted immediately.
- Real customer images, signed URLs, credentials, and raw prompts never enter source control, logs, analytics, or test artifacts.
- Output is labeled as an AI visualization and reviewed by a stylist for feasibility.
- The app does not identify people, rank attractiveness, infer protected traits, diagnose hair/scalp conditions, or turn a client into a celebrity or character.
- Quality is measured by cohort; a good overall average cannot hide poor results for textured, gray, thinning, very short, or covered hair.

## Working title

**hAIr** is a working name. Branding and trademark checks are later release work and should not delay validation of the consultation workflow.
