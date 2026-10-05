# hAIr project instructions

## Objective

Build and validate a polished salon consultation product that turns a client photo plus simple hair preferences or references into useful AI hairstyle visualizations and a stylist-approved service brief.

## Start here

Before substantive work, read `README.md`, `ops/STATUS.md`, `ops/TASKS.yaml`, and any decision or quality document relevant to the task. Treat repository evidence as the source of truth. Update status and task state when work materially changes them.

## Product constraints

- Build a responsive PWA first. Native apps and external salon connectors require pilot evidence or a new accepted decision.
- Optimize for a two-to-three-minute, side-by-side stylist/client consultation on a phone or tablet.
- Keep the professional workflow central: inspiration, preview, stylist feasibility check, agreed plan.
- Describe public-figure or fictional-character inspiration as hair attributes. Do not copy the reference person's face or create an unlicensed celebrity catalog.
- Treat all generated results as visualizations, not guaranteed service outcomes or exact chemical color predictions.
- Do not add booking, payments, social feeds, live AR, diagnosis, or face-shape/attractiveness judgments to the MVP.

## Privacy and safety constraints

- Obtain explicit client consent before any image leaves the device.
- Default to short, configurable retention and support immediate deletion.
- Do not implement face recognition, identity search, persistent face embeddings, or demographic inference.
- Strip metadata from uploads and keep assets private behind short-lived authorization.
- Do not log photos, raw prompts, client names, filenames, signed URLs, or secrets.
- Never use real customer images in source control, tests, preview deployments, error reports, or model training.
- Work involving minors requires an accepted policy and legal review before pilot use.

## Engineering constraints

- Keep model access server-side behind a provider interface.
- Use an asynchronous, idempotent generation job with explicit state transitions and partial-result recovery.
- Use a deterministic fake image provider for routine automated tests. Live-provider checks belong in a small controlled benchmark or staging smoke test.
- Measure instruction adherence, identity preservation, edit locality, realism, latency, failure rate, and cost per accepted result. Re-run the representative benchmark before changing provider, model, prompt version, masking strategy, or quality settings.
- Keep domain logic independent of hosting, authentication, storage, and model vendors.
- Add dependencies only when their value is clear for the current milestone.

## Agentic workflow

The root task owns scope, dependency order, integration, and release gates. Delegate independent work with a bounded objective, owned paths, dependencies, and acceptance checks. Avoid duplicate work and keep no more than three child agents active unless the plan explicitly changes.

At prototype, MVP, and pilot gates, use an independent review pass to challenge image quality, privacy, cost, security, accessibility, and failure handling. Integrate delegated work only after its evidence and targeted checks pass.

Agents may make routine reversible choices within accepted decisions. Record meaningful product, data, architecture, or policy changes in `docs/DECISIONS.md`. Do not deploy to production, create a paid commitment, alter billing, redeem usage credits, contact outside people, or broaden retention without explicit authorization.

## Definition of done

An item is complete only when its acceptance criteria are met and inspectable evidence is recorded. A draft, plausible output, or passing happy path alone is not completion. Report blockers precisely and preserve useful partial work.
