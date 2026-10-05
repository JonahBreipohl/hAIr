# Six-hour supervisor contract

The `hAIr project steward` heartbeat is attached to the active project task and runs every six hours. It helps work continue across execution windows without widening authority.

## Run procedure

1. Read `ops/STATUS.md`, `ops/TASKS.yaml`, relevant decisions, repository state, current goal state, and active/recent delegated work.
2. Reconcile claims against files, test output, benchmark reports, or other inspectable evidence.
3. Collect completed delegated work and integrate it only after targeted acceptance checks pass.
4. Resume work that stopped because of a transient execution or normal usage limit when capacity is available and a clear checkpoint exists.
5. Retry a transient failure once. After two repeats of the same blocker, mark the task blocked and report the exact evidence and unlock condition.
6. If a delegated task has made no meaningful progress for 12 hours and is not waiting on an expected external event, preserve its useful state, stop it, and reassign the same bounded work once.
7. Archive or close completed, superseded, or stale auxiliary tasks only after useful results are integrated or recorded.
8. Select the highest-priority dependency-ready task. Keep at most three child agents active and never dispatch duplicate work.
9. Run targeted verification for new work. Run the full suite only after integration changes or when the last full run is older than 24 hours and useful.
10. Update status, task state, decisions, and this log only when something materially changes.
11. If the current milestone gate passes, begin the next approved milestone. If the roadmap is complete or the user pauses it, stop dispatching work and pause the heartbeat.

## Allowed autonomous decisions

The supervisor may:

- choose among dependency-ready tasks;
- make reversible implementation choices inside accepted decisions;
- reduce concurrency, create bounded local branches/worktrees, and reassign stale work;
- repair tests and integrate verified work;
- update documentation and task state;
- use synthetic/permitted fixtures and the fake provider;
- run already-authorized live-provider checks within configured spend limits once credentials and approved assets exist.

## Requires explicit user authority

The supervisor must not:

- deploy or publish publicly;
- create a new paid commitment, change billing, or exceed an agreed spend cap;
- redeem or purchase a usage-reset credit;
- rotate credentials or weaken sandbox/security settings;
- contact salons, customers, vendors, or other people;
- use unapproved real-person images or customer data;
- change consent, privacy, retention, adult-only, or reference-image policy;
- delete customer data outside the documented retention/deletion path;
- merge unreviewed work into a protected release branch;
- expand the product beyond the accepted roadmap.

Normal scheduled usage recovery may allow an interrupted task to resume. A credit redemption always requires separate confirmation.

## Notification policy

Report a concise check-in when there is a material change, including:

- what changed and where;
- evidence or checks;
- current milestone and gate state;
- blockers and their unlock condition;
- next action.

Notify immediately for a milestone completion, repeated failure, failed gate, privacy/security concern, unexpected cost, destructive recovery need, or unavoidable user decision. Avoid “still running” log entries when nothing changed.

## Steward checkpoint — 2026-10-02, 21:34 UTC trigger

Inspected the goal, repository, task graph, protocol, decisions, and delegated
work. No other hAIr chat was advancing this work. Integrated and independently
reviewed PROTO-009 with a separate math check of proof limits; repaired the
fake-runner array-order gap through version 2 scheduled execution. Completed
375 tests in 15 files, domain/AI/service/web TypeScript checks, and the repository
safety scan. Recorded D-020, reproducible synthetic goldens, and the scoped
review checkpoint. Delegated work finished with useful results preserved.

Milestone remains the technical prototype; live image quality is blocked by
provider/org access, permitted adult portraits, spend authority, and remaining
restricted registry/evaluation gates. PROTO-010 is the next dependency-ready
cost-accounting task. No paid call, image transfer, deployment, external contact,
or usage-credit action occurred. The goal record remains usage-limited; this
heartbeat did not alter its budget or claim overall completion.

## Steward checkpoint — 2026-10-03, 03:35 UTC trigger

Inspected repository state, current goal, roadmap/quality gates, task and decision
records, and completed delegated evidence. Resumed bounded PROTO-010 implementation
with independent arithmetic and adversarial reviews; no duplicate active hAIr
work was found. Integrated exact declared cost metadata and retained all failure,
retry, and correction accounting. Repaired invoice artifact identity/role checks
and a shared-package BigInt compilation incompatibility. Recorded D-021 and safe
synthetic golden evidence; all delegated work finished with useful results kept.

Verified 397 tests in 16 files, domain/AI/service/web/end-to-end TypeScript,
repository safety, production build, and one built-app desktop-Chromium synthetic
consultation/deletion smoke at a 390-pixel viewport. Smoke assertions passed;
Windows preview teardown stalled, so the server PID and start time were verified
against this run before stopping that owned server. The browser command exited
zero. No unrelated process or task was closed.

Milestone remains technical prototype validation. Live image quality requires
provider access, permitted adult portraits, an explicit spend limit, and remaining
registry/evaluation controls. PROTO-011 rating/adjudication metadata is the next
ready task. The goal record remains usage-limited without any budget/reset action.
No paid call, real portrait transfer, public deployment, outside contact, or credit
redemption occurred.

## Steward checkpoint — 2026-10-03, 09:35 UTC trigger

Inspected repository state, goal, recent project chat state, roadmap/quality
gates, decisions and completed delegated work. Advanced the ready PROTO-011
rating boundary through implementation, independent policy/code review and
separate documentation work. Retained all rejected outputs, immutable raw
scores and append-only observation/adjudication history. Fixed mutable policy
tuples, late bundle evidence beyond the report cutoff, stale sensitivity
observations and contradictory final classifications. Recorded D-022 and
synthetic golden evidence; no outstanding P1/P2 remains in this scoped review.

Verified 29 focused tests, 426 integrated tests in 17 files, all five TypeScript
projects and a fresh production build. An independent root enumeration checked
1,512 score-triplet evaluations across all dimensions. No browser behavior
changed; prior browser evidence was preserved and not rerun. Repository safety
and the task graph pass: 20 tasks, 16 complete, existing evidence and no cycle.

The milestone remains technical prototype validation. Live image quality still
needs provider/org access, permitted adult portraits, a spend limit and remaining
registry/evaluation controls. PROTO-012 declared metric calculations are next.
Delegated results are preserved; no duplicate active project work or stale
auxiliary chat required closure. The goal remains usage-limited without a
budget or reset action. No paid call, real portrait transfer, public deployment,
outside contact or credit redemption occurred.

## Steward checkpoint — 2026-10-03, 15:35 UTC trigger

Inspected the repository, goal, recent project chat state, task graph, roadmap,
quality protocol, decisions and delegated work. Advanced PROTO-012 with bounded
implementation, independent adversarial review and separate documentation work.
One transient model-capacity failure was resumed once from its saved checkpoint,
without changing models, budget or usage credits. No duplicate active hAIr work
was found. Completed agent results remain preserved; no stale auxiliary chat
required closure.

Recomputed source reports now bind exact quality metrics and denominator scopes.
Retained outputs and primary/reliability partitions stay separate; full provider
accounting includes failures and retries. Repaired historical false-zero counts
when later clear decisions followed unresolved reviews or unknown gate states.
Confirmed history uses each resolved critical round's own reviewed prefix.
Runtime-frozen shared coverage policies and read-only golden checks prevent
caller mutation and accidental evidence replacement. Recorded D-023 and safe
synthetic golden evidence; independent review has no outstanding P1/P2 in scope.

Verified 28 focused metrics tests, 31 coverage tests, 455 integrated tests in
18 files, all five TypeScript projects, a fresh production build, repository
safety and an acyclic task graph with 21 tasks and 17 complete. A separate root
calculation checked median-of-output-medians and inclusion of every requested
attempt in cost per declared usable primary result. Prior browser checks were
preserved and not rerun for this metadata-only change.

Milestone remains technical prototype validation. PROTO-013 uncertainty and raw
agreement evidence is ready next; trusted live registry/viewer controls remain
separate. Live image quality still needs provider/org access, permitted adult
portraits and an explicit spend limit. Usability needs participants and external
coordination authority. The goal remains usage-limited without any budget/reset
action or overall completion claim. No paid call, real portrait transfer, public
deployment, outside contact or credit redemption occurred.

## 2026-10-03 21:35 UTC heartbeat checkpoint

Inspected the goal, recent project chat state, repository, status, task graph,
roadmap, quality protocol, decisions and delegated work. No duplicate active
hAIr work or stale auxiliary chat required closure. Reused three bounded agents
for implementation, independent review and methods documentation; all completed
and their useful results are preserved in the repository. No transient capacity
failure or retry occurred in this checkpoint.

Completed PROTO-013 under accepted D-024. Primary method sources informed whole
subject resampling, paired case dependence, ordinal alpha and conservative
boundary handling. The locked profile fixes method, seed stream, 10,000 draws
and nearest-rank endpoints before declared invocation. It distinguishes exact
diagnostic points from nominal pointwise intervals and leaves omitted inference
and authority explicit. No model, prompt, masking, retention or quality threshold
changed.

Independent review reproduced and repaired two P2 false-completeness paths:
equal shortened repetition sets and an omitted preregistered primary case.
Required tuple frames now derive independently from the full plan and stage
requirements. Unknown classifications, deficient primary frames, insufficient
units, boundary rates, degenerate distributions and any undefined replicate
cannot produce a usable interval. Reviewed the guide, all five ordinal reference
examples and actual fixed-seed empty-draw handling with no outstanding P1/P2.
An additional preview-count concern was ruled out by executable inherited plan
validation and required-frame mismatch.

Verified 27 focused statistical tests, 482 integrated tests in 19 files, all five
TypeScript projects, a fresh production build and repository safety. A separate
root check matched independently derived clustered rate and median intervals.
Goldens remain invented metadata, read-only during verification. Prior browser
evidence was preserved without rerunning it for this metadata-only change.
Updated status, harness coverage, method documentation and task evidence. The
acyclic graph has 22 tasks and 18 complete; PROTO-014 stable metadata report export
is dependency-ready next. Missing evidence must remain incomplete in that export.

Milestone remains technical prototype validation. Cohort, cost, latency and
agreement intervals, equivalence, multiplicity, calibrated coverage and full
protocol inference remain work. Trusted live registry/viewer controls, provider
access, permitted adult portraits and an explicit spend limit still block live
image quality. Usability needs participants and external coordination authority.
The goal remains usage-limited without any budget/reset action or overall
completion claim. No paid call, real portrait transfer, public deployment,
outside contact, credit redemption or Git commit occurred.

## 2026-10-04 user-authorized repository publication

The user supplied https://github.com/JonahBreipohl/hAIr.git and explicitly asked
to push to main. Read-only connector evidence confirmed an empty public
repository, default branch main and authenticated push permission. The safe
initial snapshot contained 146 UTF-8 text files (13,691,889 bytes) before adding
the publication script and this record. Repository safety and the 22-task graph
checks passed; the latest product verification remains the prior 501-test,
five-TypeScript-project and production-build checkpoint. Local Git cannot create
index.lock because .git is read-only; shell network access cannot reach GitHub.
The connector's first write was rejected because it requires approval while the
session's approval policy is never. No remote mutation completed. Prepared
scripts/Publish-Main.ps1 for the user's ordinary PowerShell session, with safety,
empty-history checks, no force push, per-commit fallback author identity and
remote SHA verification. Actual publication remains pending user execution.

## 2026-10-04 09:35 UTC heartbeat checkpoint

Reconciled overall status to blocked on external inputs. Inspected recent chat
history, repository status, roadmap, decisions, task evidence and completed
delegated work. No new human input, unfinished delegation, duplicate active hAIr
chat or dependency-ready task was found. Fresh task-graph and repository-safety
checks passed: 22 tasks, 19 complete, three blocked, evidence present and no
dependency cycle. The prior 501-test, five-TypeScript-project and production-build
checkpoint remains the last full verification; no product code changed in this
audit and that suite was not rerun. The pending benchmark input request remains
open. Milestone remains technical prototype validation, and goal usage-limited
status is unchanged. No live call, deployment, outside contact, paid commitment,
credit redemption or Git commit occurred.

## 2026-10-04 03:35 UTC heartbeat checkpoint

Inspected the goal, project chat state, repository, progress, decisions, task
graph, roadmap, quality contract and recent delegated results. No duplicate
active hAIr work or stale auxiliary chat required closure. Reused three bounded
agents for implementation, independent review and contract documentation; all
completed and useful results are preserved. No transient capacity failure or
retry occurred.

Completed PROTO-014 under accepted D-025. A recomputed transitive statistical
report produces all twelve benchmark files with fixed CSV schemas, exact counts
and fractions, explicit source/interval joins and exact UTF-8 byte hashes. The
outer ordered hash manifest avoids summary self-reference. Template headings,
inherited P1 tables, gate IDs and required criteria remain intact. Every template
gate and verdict stays incomplete; decision is none and selected configuration
is null. No new statistical method, model, prompt, mask, retention policy or
quality threshold was introduced.

Review repaired data-dependent headers, replaced requirements, unrelated gate
diagnostics, interval traceability, empty rates and historical identity-escape
links. A tentative missing calibration pointer was ruled out by the actual
source schema. Independently verified the later-clear/reject counterexample:
the historical escape remains 1/2 instead of being replaced with the current
zero. Both stages keep all 1,520 tested zero-denominator values and intervals
null. Independent review reran 19 focused tests with no outstanding P1/P2.

Verified 501 integrated tests in 20 files, all five TypeScript projects, a fresh
production build, repository safety and task evidence. Separate root checks
verified both stages' twelve file hashes/byte counts, 23 T1 and 16 P1 literal
subsection headings, ten T1 and 36 P1 stable gate IDs and a populated 10/20
clustered interval with exact source binding. Materialized synthetic examples
under ignored tmp/report-bundle-T1 and tmp/report-bundle-P1. Goldens are read-only
in normal verification. Prior browser evidence was preserved and not rerun for
this metadata-only change.

Updated status, task evidence, decisions, README, harness coverage and the report
guide. The acyclic graph has 22 tasks and 19 complete; its remaining PROTO-002,
UX-001 and GATE-001 tasks are blocked, with no dependency-ready task. Milestone
remains technical prototype validation. Next inputs are restricted provider
access, permitted adult portraits, an explicit spend limit, and representative
participants with external coordination authority. Trusted registry/viewer,
execution, full inference and the remaining live controls must still pass before
a live call or verdict. The exporter cannot supply that missing authority.

The goal remains usage-limited without any budget/reset action or overall
completion claim. No paid call, real portrait transfer, public deployment,
outside contact, credit redemption or Git commit occurred.

## 2026-10-04 repository publication verified

The user restored filesystem and network access and instructed continuation of
publication to main. Native Git read the empty remote, reran repository safety,
committed 147 source/documentation/synthetic-evidence files and pushed without
force. Verified refs/heads/main equals local commit
9688253781f69c9d7ac5c6892a0b99036640d4f6 and main tracks origin/main. The commit
used the verified GitHub account's standard no-reply address because no local
author was configured; global Git identity was unchanged. Ignored dependencies,
build output, media, secrets and temporary artifacts were excluded. Fresh
repository safety and task-graph checks passed. Updated STATUS to resolve the
publication blocker; live image quality and participant inputs remain blocked.
The initial-publication script is no longer needed for this initialized checkout
and intentionally refuses to rerun against existing history. No hosted app or
production deployment was created. The prior 501-test/five-TypeScript/build
checkpoint remains the last full software verification.
