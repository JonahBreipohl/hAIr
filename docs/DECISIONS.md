# Decision log

Use this file for product, data, architecture, and operating decisions that affect more than one task. “Accepted” means the team should build against it until evidence triggers a revision. “Provisional” means discovery must validate it before the relevant release.

| ID | Date | Status | Decision | Why | Revisit when |
|---|---|---|---|---|---|
| D-001 | 2026-09-25 | Accepted | Position hAIr as a professional salon consultation workflow, with image generation as a component. | The professional feasibility decision and agreed service brief provide a clearer wedge than generic consumer hairstyle generation. | Pilot users use images but ignore feasibility/plan, or a stronger buyer/use case emerges. |
| D-002 | 2026-09-25 | Accepted | Start with a responsive installable PWA. | Fast link/QR entry, one codebase, phone/tablet/desktop reach, and no app-store friction while image quality is uncertain. | Measured camera, backgrounding, offline, kiosk, or distribution problems materially reduce adoption. |
| D-003 | 2026-09-25 | Accepted | Keep the MVP and pilot adult-only. | Portrait generation and consent are materially simpler; minors require dedicated guardian consent, age assurance, child-safety, and legal controls. | Those controls are explicitly designed, reviewed, and approved. |
| D-004 | 2026-09-25 | Accepted | Keep image generation server-side behind a provider interface. | Protects credentials, centralizes safety/usage controls, and allows benchmark-driven model changes. | No expected reversal; interface may evolve. |
| D-005 | 2026-09-25 | Provisional | Start the benchmark with GPT Image 2.5 Sunburst; compare Flare and at least one serious challenger. | Current official guidance positions Sunburst for precise editing and preservation and Flare for speed. Product quality, cost, and latency still require direct measurement. | Benchmark result, provider terms, availability, or pricing changes. |
| D-006 | 2026-09-25 | Accepted | Benchmark prompt-only, masked, and masked-plus-protected-region strategies before choosing segmentation complexity. | Generative masks are not pixel-exact; masking may help locality but harm hairlines, long-hair growth, or consultation speed. | Prototype gate selects a strategy. |
| D-007 | 2026-09-25 | Accepted | Translate celebrity/character requests into visible hair attributes and preserve the client's identity. | Supports natural user language without face copying, impersonation, or an unlicensed image catalog. | Licensed partnerships or policy/legal review support a broader reference experience. |
| D-008 | 2026-09-25 | Provisional | Delete originals after successful generation with a 24-hour hard maximum for retry; expire unsaved outputs in 24 hours and explicitly saved consultations in 30 days. | Minimizes sensitive portrait retention while allowing transient recovery and a useful consultation artifact. | User research, legal review, provider contracts, or salon record needs justify a different policy. |
| D-009 | 2026-09-25 | Accepted | Use asynchronous, idempotent generation jobs with per-variant states and partial-result recovery. | Image editing is slow and fallible; salon users must not lose completed results or create duplicate paid work. | No expected reversal; implementation can simplify if benchmarks prove calls consistently fast. |
| D-010 | 2026-09-25 | Accepted | Treat image-quality benchmark clearance as a prerequisite for the full MVP build. | Identity drift or weak cohort performance would invalidate the product regardless of software polish. | Only after a recorded product pivot changes the core value proposition. |
| D-011 | 2026-09-25 | Provisional | Default to three previews per consultation, feature-flagged to test four. | Three limits cost and wait time while providing choice; the pilot should measure whether a fourth improves acceptance enough to justify it. | Prototype and pilot conversion/cost evidence. |
| D-012 | 2026-09-25 | Accepted | Do not build booking, POS, billing, native apps, live AR, 3D, or long-term client history before core validation. | These increase scope without resolving the central uncertainty: trustworthy, useful hair edits in a real consultation. | Core quality and pilot-use gates pass. |
| D-013 | 2026-09-26 | Accepted | Build the consultation walking skeleton against a deterministic fake provider while live generation remains quality-gated. | This validates consent, copy, state recovery, comparison, feasibility, deletion, and responsive use without transmitting portraits or implying that image quality has passed. Production storage, live-provider integration, and pilot deployment remain blocked by the technical image gate. | The fake slice reveals a workflow flaw, or the image benchmark selects a production configuration. |
| D-014 | 2026-09-28 | Accepted | Keep the private application-service boundary vendor-neutral and use an in-memory simulator as its executable reference before selecting hosting, identity, storage, or queue adapters. | Opaque identifiers, deny-by-default tenant and capability authorization, one clock, idempotent commands and callbacks, short-lived media grants, and verified deletion can be tested without portrait bytes, secrets, or vendor coupling. | Restricted staging reveals a missing boundary, or a selected adapter requires a contract change that preserves these guarantees. |
| D-015 | 2026-09-30 | Accepted | Use explicit consultation assignment for salon access, require the client-control capability for consent and longer retention, and resolve private shares to a bounded agreed-service brief. | Tenant membership or administrator status alone must not expose portraits; a stylist cannot substitute for the client’s consent or save choice; and a share viewer needs the agreed plan without access to the consultation record, source image, or unrelated results. Content-free consent/save receipts and scoped share payloads make those boundaries inspectable. | Pilot authentication or chair-side research shows the capability handoff is confusing, or a reviewed privacy design provides an equally strong and simpler proof of client choice. |
| D-016 | 2026-10-01 | Accepted | Reconcile credential-free evaluation checks in a versioned ledger produced by a trusted local test runner, with exact observation schemas and recomputable hashes binding each result to its run, fixture, scope, time, and versions. Keep live-provider, image-quality, registry enforcement, and spend gates explicitly unevaluated. | A reproducible aggregate makes executable evidence inspectable; runtime validation prevents missing checks or rejected private content from entering reports. Hashes prove content integrity, while the executing test runner supplies evidence provenance. They do not prove external execution or authorize portrait transfer. | Restricted staging introduces signed registry snapshots, live adapters, or externally supplied evidence; those require separate provenance and release-gate enforcement. |
| D-017 | 2026-10-01 | Accepted | Keep locked benchmark records as metadata sidecars. Bind specifications, prompt inputs, model/settings and policy artifacts through opaque IDs and canonical content hashes; retain every terminal attempt and permit only append-only usage corrections that preserve invocation identity and outcome. | Exact schemas and generic denials keep rejected private content out of exports. Locked slots and retry histories prevent failures from disappearing from later accounting. Restricted artifact resolution, execution provenance, eligibility and live quality remain separate gates; hashes alone prove none of them. | A restricted runner requires a reviewed artifact-resolution or correction policy beyond these contracts; version the schema before changing its meaning. |
| D-018 | 2026-10-02 | Accepted | Validate declared stage coverage with separately versioned, controlled benchmark annotations locked to source records, preregistration, and any parent corpus. Keep P1 reliability reruns outside the primary denominator and require both reference and attribute input modes. Only synthetic metadata can receive a complete coverage label until trusted annotation authority exists; unresolved capability or physical restrictions remain incomplete. | The existing transfer-permission vocabulary does not cover every benchmark condition. A separate annotation projection supports the protocol without expanding transfer rights or inferring traits. Exact subject, cohort, transformation, comparison, and slot checks prevent totals from hiding missing populations; hashes establish integrity, not subject identity or external authority. | A trusted restricted registry can attest canonical subject issuance, permitted annotations, exclusions, and preregistration time; revise the coverage boundary before accepting real evidence or resolving waivers. |

## D-019 — Closed offline worker and cancellation — 2026-10-02 — Accepted

Add an explicit, assigned-salon/client-authorized `generation.cancel` operation.
It preserves ready siblings and historical failed metadata while ending all
transient source access, including failed-source retry authorization, as the
existing deletion contract requires. Do not represent cancellation as a provider
failure or allow an ignored callback to count as publication.

Validate these lifecycles in a closed worker with internally constructed fake
provider calls and generated synthetic color tiles. Promote the already installed
Sharp 0.35.4 to a pinned service dependency for full pixel decoding; keep domain
records free of image bytes and decoder/vendor details. Worker reports separately
track pending byte purge and provider/decoder drains. They cannot turn a simulator
deletion receipt into proof of native-memory erasure, production cleanup, or a
release gate.

Revisit when restricted adapters, durable workers, or allowed real media exist.
Those require enforced authorization, input processing, moderation/subject
checks, bounded process isolation, and provider cleanup evidence before this
offline profile can inform a live H0 gate. This decision does not change retention,
consent, provider selection, model/prompt/mask quality settings, or release policy.

## D-020 — Deterministic scheduling proof scope — 2026-10-02 — Accepted

Keep invocation ordering inside fixed case blocks, using the protocol hash for
configuration/repetition groups and numeric preview-index ties. Apply adjacency
constraints to the rating pool, where equality means the literal case ID,
configuration ID, or numeric repetition index. Do not silently reinterpret
repetition as a compound case/configuration key.

For this scheduler version, minimize the sum of adjacent equalities across those
three fields. Report the per-field counts and conflicting-pair count separately.
A global minimum of that sum does not make every individual collision
unavoidable or prove a minimum for a different objective. A complete certificate
requires a zero-cost construction, a matched mathematical global lower bound,
or completed bounded exhaustive search. Otherwise retain all candidates and
report scheduling evidence as incomplete.

Version 1 rating inputs must contain the entire candidate-disposition population
of a validated locked bundle. Candidate status grants no display/media access;
rejected-output audit sampling, rater qualification, actual blinding, and viewer
authorization remain separate gates. A schedule cannot authorize a live call or
substitute for stage coverage, quality, pricing, or release evidence.

Connect the declared invocation schedule to actual calls in the closed fake
runner, including retries attached to their logical slot. Bump that runner to
version 2 and regenerate its simulation fingerprint, locked fixture, and golden
digests so older array-order evidence cannot pass as the current execution.

Revisit the objective and population contract when measured rating fatigue or a
reviewed audit/display-selection workflow requires a new schedule version. This
interpretation changes no image model, prompt, masking, privacy, retention, or
quality threshold.

## D-021 — Declared benchmark cost evidence — 2026-10-03 — Accepted

Add a closed USD-only cost metadata profile for the locked benchmark bundle.
Bind a separately frozen pricing manifest to complete configuration hashes,
provider/model/terms locks, and the declared pricing IDs. Version 1 supports
only an additive per-attempt fee plus the three existing usage-unit rates,
with a shared bounded denominator and exact rational micro-USD arithmetic.
Export bounded decimal-string numerators; do not use floating-point arithmetic
or round components, attempts, or run totals. Actual invoice rounding and
unsupported pricing formulas require a new reviewed profile.

Count the latest usage revision once for each logical attempt while retaining
the entire input history and every failure/retry. Formula estimates remain
estimates even when usage is labeled billed. Keep current declared charge
observations and invoice-reconciliation assertions separate; their hashes and
artifact references establish linkage, not provider or invoice authenticity.
This profile is not a complete append-only invoice ledger.

Keep invoice artifact roles separate from all locked plan artifacts. Multiple
attempts may refer to the same invoice ID and hash, but one invoice ID cannot
resolve to conflicting contents. These guards establish metadata consistency,
not that an artifact contains a genuine invoice.

Missing rates, usage, or charge observations leave their respective complete
totals unavailable. Report known subtotals and missing counts separately.
Compare formula and declared-charge channels independently with a declared
pre-run cap; incomplete evidence cannot establish that a run is within that
cap. No record or budget observation authorizes a paid call.

Requested-slot ratios include all locked slots and explicitly include P1
reliability reruns. Displayed and usable-result denominators remain unevaluated
until separately validated display and rating evidence exists. Synthetic fixtures
test arithmetic and integrity; they introduce no actual provider price, live
billing, image-quality verdict, or pilot clearance.

Revisit when trusted pricing/invoice ingestion, credits/refunds/taxes, live
spend enforcement, a different currency/formula, or adjudicated denominator
evidence requires a new contract. This decision changes no provider, model,
prompt, masking, consent, retention, or quality threshold.

## D-022 — Declared human rating evidence profile — 2026-10-03 — Accepted

Keep the offline rating boundary metadata-only and bind the complete retained
output population, including rejected outputs, to the locked run bundle and
scorecard. Version 1 declares exactly three primary assignments per output:
two licensed-stylist roles and one general role, with distinct opaque reviewer
IDs. This matches the protocol's median-of-three calculation without inventing
an aggregation rule for additional raters. Role declarations cannot verify
credentials, independent people, calibration, media permission, or blinding.

Valid rows contain all seven integer scores from zero through five; invalid
inspection/input rows retain their controlled reason separately. Raw rows are
immutable. This first profile rejects duplicate or changed-score replacements
and leaves missing or invalid primary coverage incomplete. A trusted correction
and replacement workflow requires a separately reviewed version rather than
silently editing history or granting authority from metadata.

Retain all critical flags and require the documented disagreement triggers,
including a critical-dimension median of four with a score of zero through two.
Independent adjudication declares two non-rater reviewers with stylist and
evaluation/safety roles; a split requires a third independent reviewer whose
declared process role is `independent_resolver`. This states the role in that
round, not the reviewer's real credentials. Append
later adjudication rounds with complete raw-history locks and prior-record
lineage. Decisions never replace the seven raw scores. Unknown trigger
observations or unresolved validity cannot be treated as an absence of defects.

Automated-display and decision-sensitivity observations are separately locked
analytical declarations with append-only revisions. An adjudication binds the
reviewed observation history as well as raw ratings. Later benign declarations
cannot silently erase an earlier disputed decision or declared display escape;
any such trigger lineage still requires current resolution. These observations
do not attest a detector, authorize display, or prove an actual configuration
decision was made.

A current known decision-sensitivity declaration must cover the latest raw
submission time; an earlier observation cannot clear later evidence. Retain
contradictory final votes as incomplete: a declared major identity or anatomy
failure needs the corresponding critical code. This coherence check does not
force raw raters to agree or infer extra hairline/background rules.

Source-controlled evidence contains controlled codes and opaque rationale
artifact locks, not factual comments, images, personal details, or locators.
Generated-output corruption remains a critical/operational failure; it cannot
become a corrupt-source exclusion. Restricted rationale resolution and genuine
input-exclusion authority remain separate controls.

This profile checks declared consistency only. It cannot establish live usable
denominators, authentic human judgment, a provider winner, image quality, or a
release verdict. Revisit when a restricted viewer, authenticated qualification,
replacement policy, P1 rejected-output sampling, or trusted adjudication requires
an extension. It changes no model, prompt, masking strategy, retention, consent,
quality threshold, or accepted product scope.

## D-023 — Declared quality metric populations — 2026-10-03 — Accepted

Derive offline metrics only from recomputed, hash-bound coverage, cost and rating
reports that share the complete locked plan, bundle and run. Bound all supplied
evidence to a metric-report cutoff. Digests establish consistency, not authentic
execution, billing, annotations, people or viewing permission.

Freeze the shared coverage vocabularies at runtime so callers cannot widen the
annotation policy while reports are recomputed. Coverage tests always compare
their existing golden; an environment switch must not overwrite evidence during
verification. This hardening changes no annotation category or fixture digest.

Publish all seven dimensions separately. First take the median of the three
valid primary raw ratings per output, then the median of output-level medians
for a named population. Even-sized aggregate medians are exact rationals.
Never pool raw raters, configurations or reliability outputs to make a primary
configuration appear to clear a threshold. Missing or unresolved applicable
ratings preserve known counts but leave complete numerators, rates or medians
unavailable; they do not become zeros or quality-dependent exclusions.

Keep requested slots, primary outputs and preregistered P1 reliability reruns
explicit. For each configuration, report all retained generated outputs,
including rejected outputs, separately from the latest declared automated-gate
passed projection. The latter is an analytical population, not evidence of
actual display. T1 score and severe-artifact observations use all retained
generated outputs; P1 displayed analogs use the primary declared-passed
projection. Candidate disposition cannot substitute for display evidence.

Join each output to its exact case source asset for cohort annotations; subject
IDs deduplicate people, not photo-specific lighting, glasses or occlusion tags.
The T1 severe-artifact observation includes identity, anatomy, hairline and
background major codes plus critical identity/anatomy codes. Counting a major
hairline defect here does not invent a corresponding raw critical code.

Compute exact count/threshold observations with integer cross-products, retaining
strict versus inclusive operators. Cohort sufficiency needs at least five
distinct contributing subjects and twenty outputs in the same named projection.
Unknown labels or gate observations cannot silently remove difficult outputs.
Retain raw flags, current adjudication and historical escape lineage separately;
cleared raw flags are not automatically final known critical failures, and later
rejection cannot erase a historical declared escape.

An adjudicated review-escape observation joins a critical round to its own
reviewed automated-observation prefix. An earlier rejected critical diagnosis,
followed by a cleared diagnosis and only then a gate-passed declaration, must
not become an invented historical severe escape. Raw flagged observations stay
separate. This temporal scope is not complete delivery telemetry or proof that
no real escape occurred.

Report suspected raw identity passage and adjudicated review-escape counts for
each retained partition. Keep the current primary projected identity count
separate from a zero historical adjudicated review-escape observation over all
requested outputs, including reliability reruns. Unresolved applicable review
evidence cannot establish zero historical escape; preserve known positives and
leave the complete count unavailable.
Historical completeness is independent of current classification. An unresolved
past review with a possible gate passage, or an identity-critical review whose
own prefix contains an unknown gate state, leaves absence unknown even after a
later clear decision. A conflicting historical identity classification remains
unresolved for this purpose. Raw identity suspicion likewise stays unknown when its
retained gate history has unknown membership and no confirmed passage. Unknown
history cannot invent a positive; a supported historical positive remains true.

The declared displayable formula preserves the protocol's separate score and
critical-fail requirements. A current adjudicator's negative displayability
decision may veto that classification, with the veto reported explicitly.
No positive vote compensates for a low score or critical failure.

A theoretical provider-cost ratio per declared usable primary result uses every
run or matching configuration charge, including failed attempts, retries and reliability reruns,
over the complete primary declared-passed usable population. Preserve estimates
and declared charges separately. Missing costs or a missing/zero denominator
cannot establish a ratio. Partition spend may be reported as a diagnostic, but
cannot quietly exclude rerun spend from the primary usable-result ratio.
This is complete recorded provider accounting within the closed source profile,
not authenticated fully loaded economics or cost-cap authority; unmodeled fees,
taxes, credits and infrastructure costs remain outside its scope.

This bounded profile supplies numerical declarations, not T1/P1 verdicts or a
provider winner. Confidence intervals, ordinal agreement, qualified human review,
real cohort sampling, actual pilot stylist yes/no acceptance, calibrated display,
genuine billing and live quality remain separate controls. Revisit when those
controls or trusted correction/exclusion workflows require integration. No
provider, prompt, mask, consent, retention or quality threshold changes here.

## D-024 — Reproducible declared statistical profile — 2026-10-03 — Accepted

Add a bounded, metadata-only statistical profile bound to a recomputed metric
report and a separate locked analysis manifest. The manifest binds the run and
generation-plan hash, method version, seed and fixed conventions before the first
declared invocation. A consistent timestamp or digest cannot authenticate actual
preregistration, sampling, people or execution.

The first profile computes global primary quality uncertainty and seven raw
agreement dimensions. Cohort, cost, latency and agreement confidence intervals,
equivalence-margin conclusions, multiple-comparison control and full protocol
inference remain explicitly unevaluated. This is a scoped foundation, not a
complete benchmark report or live gate. No provider or release winner is emitted.

Use 10,000 deterministic bootstrap replicates and two-sided nominal 95% percentile
intervals. Sort opaque unit IDs, freeze the versioned seed-stream algorithm, and
use inverse empirical-CDF nearest-rank endpoints: sorted replicate positions
250 and 9,750, counting from one. Retain exact point counts and median fractions;
floating interval arithmetic must be identified and must not round a gate pass.
The manifest declares an unsigned 32-bit seed and the versioned
`sha256_xorshift32_rejection_v1` stream. Domain-separated hashing initializes a
nonzero xorshift32 state; rejection sampling accounts for its nonzero state
range. This reproducible pseudo-random stream supplies no security or execution
authority. The guide records the exact stream construction and work limits.

Single-configuration primary populations resample whole subjects, keeping every
included output together. Rates remain ratios of summed output counts rather
than averages of subject percentages. Medians remain medians of output-level
raw-rating medians. The gate-passed population is a conditional declared
projection, not general generation performance or authenticated display.

T1 comparisons resample the same paired case blocks for both configurations and
all dimensions, retaining repetitions and siblings. Report differences of the
named dataset functionals, not a substituted mean of case-level differences.
Add paired subject-block sensitivity because multiple cases can belong to one
person. P1 comparisons use paired subject blocks. No intersection may silently
drop missing configurations or failed requested slots; incomplete paired output
coverage leaves the corresponding comparison incomplete. Reliability reruns
never enlarge primary quality populations.
Derive the required tuple frame independently of existing slot lists. For T1/P1,
the primary case declaration must match the full plan and protocol case count;
an equally truncated pair cannot certify completeness. A deficient primary
frame also blocks global intervals while retaining available diagnostic points.

Missing classifications or uncertain membership cannot become zero. Require
at least ten contributing subjects and twenty outputs for global intervals;
paired case intervals additionally require twenty cases. These are conservative
implementation guards, not proof of representative sampling or nominal coverage.
Retain known point evidence when an interval is unavailable. Boundary binary
rates, constant/degenerate bootstrap distributions, too few units, or any
undefined replicate leave the interval non-informative. Coincident percentile
endpoints leave the point value intact without a zero-width confidence claim.
These intervals are pointwise and nominal, with no simultaneous coverage or
calibrated-coverage claim. Zero observed failures cannot yield a zero-risk claim.
No binomial output-independence interval is substituted for clustered uncertainty.

Compute ordinal Krippendorff alpha using pooled category-frequency ordinal
distances from immutable valid raw triples. Use all three unordered rater pairs
per output for exact and within-one-point agreement. Reviewer IDs can vary by
output; no fixed-rater Cohen kappa assumption applies. Adjudication cannot replace
raw scores. Missing/invalid triples leave complete agreement unavailable.
Current adjudication uncertainty does not suppress agreement when all three raw
ratings are valid and present. Zero expected disagreement leaves alpha undefined,
and legitimate negative alpha is retained. Perfect raw agreement at one constant
score does not establish alpha.

The statistical choices follow whole-cluster resampling in
[Field and Welsh (2007)](https://rss.onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9868.2007.00593.x),
unit-of-analysis guidance in the
[Cochrane Handbook](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-06),
and the author's
[ordinal alpha algorithm](https://www.asc.upenn.edu/sites/default/files/2021-03/Computing%20Krippendorff%27s%20Alpha-Reliability.pdf).
Boundary suppression responds to
[Wang (2013)](https://www.sciencedirect.com/science/article/pii/S0167715213002940).
The chosen percentile convention and conservative guards are project decisions;
they do not claim statistical optimality, calibrated coverage or population safety.

Bound outputs, configurations, traversal and bootstrap work without adding a
dependency. Export immutable policies; recompute source reports and derived
results before serialization. Test deterministic replay, independent reference
calculations, unequal clusters, paired cancellation, raw agreement, missing
evidence, degenerate populations and hostile input. Revisit the profile before
cohort/rare-event inference, practical-equivalence selection, trusted sampling
or a full live statistical report. Consent, retention, model, prompts, masking
and quality thresholds are unchanged.

## D-025 — Stable declared benchmark report export — 2026-10-04 — Accepted

Implement a bounded, metadata-only export for the twelve files in
`docs/quality/REPORT-TEMPLATE.md`. Accept a single recomputed statistical report
containing the locked metrics, coverage, cost, ratings and record bundle, plus
an exact opaque report ID, cutoff and optional declared Git revision. Restrict
the profile to T1 and P1. Require source identity, hashes, versions and timestamp
reconciliation before export; never accept caller-provided gate outcomes, free
text, paths, notes, file names or release decisions.

Preserve applicable template headings, table columns, gate IDs and meanings.
All template gates and the overall verdict remain `INCOMPLETE`: this profile has
no authenticated provenance, execution, viewer, detector, billing or release
authority. Decision is `none`; selected configuration is null. Complete declared
arithmetic remains diagnostic and cannot become a gate pass or provider winner.
An optional revision is a declaration, not proof of the code that executed or
the plan's revision commitment. Missing dependency-lock and execution evidence
remain explicit. A complete twelve-file export is not a complete benchmark.

Use fixed schemas, deterministic row IDs and ordering, explicit population,
source and calculation references, exact numerators and denominators, and null
for unavailable values. Preserve primary versus reliability partitions,
retained versus declared-passed quality, all failed/retried attempt accounting,
estimated versus declared charges and raw agreement versus adjudication.
Transformation/input-mode diagnostics must use exact validated case/output
membership; a pooled transformation projection cannot stand in for each mode.
No new interval method or inference is introduced. Preserve every declared
cohort, including insufficient slices.

Write explicit unavailable rows for absent detector, calibration, actual display,
latency, provenance, fully loaded economics and sign-off evidence. Empty declared
deviations mean only that no deviation records were supplied; they cannot prove
that no historical deviation occurred or that a waiver was authorized. Report
declared coverage exceptions and comparisons without inventing approval.

Hash the exact UTF-8 bytes of every file. Keep the ordered twelve-file hash
manifest in the returned envelope to avoid a summary self-hash cycle. Bind its
version, names, byte counts and hashes in a separate aggregate digest. The full
serializer recomputes source reports and every derived file before accepting
asserted contents or hashes. A consistent digest establishes integrity of
declarations, not their origin or truth.

CSV quoting is paired with closed typed cell grammars and explicit text
protection where needed; it cannot alone prevent spreadsheet formula injection.
Allow legitimate signed numeric agreement results without accepting formula
text. Fixed Markdown text and validated opaque identifiers prevent report-token
and markup injection. Export no restricted artifact locators, images, names,
raw prompts, notes or secrets. Bound traversal, rows, bytes and source work;
freeze policies and reject hostile object descriptors before execution.

Independent review and read-only synthetic golden checks must cover source/file
tampering, deterministic reproduction, cross-file references, missing evidence,
escaping, primary/rerun accounting and explicit incomplete gates. Revisit this
profile before adding trusted evidence, decisions, detector inputs, release
authority or new statistical methods. No retention, provider, prompt, masking,
quality threshold or deployment policy changes.

## Decision template

When adding a decision, capture:

- the exact choice and status;
- evidence and alternatives considered;
- consequences and constraints;
- the observable condition that should trigger review;
- any superseded decision ID.
