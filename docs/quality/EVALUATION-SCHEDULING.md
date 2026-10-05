# Declared invocation and rating schedules

**Version:** `hair-evaluation-scheduling-v1`  
**Scope:** deterministic, locked metadata schedules. Candidate outputs do not have permission to enter a rating viewer merely because they have a schedule.

The implementation is [evaluation-scheduling.ts](../../packages/ai/src/evaluation-scheduling.ts). It takes no provider, clock, callback, portrait, URL, raw prompt, or free-text rater name. Existing exact record validators reject malformed plans, incomplete attempt accounting, private fields, inconsistent links, and unsupported fields. Additional scheduling schemas accept only the fields below. Errors always say `Evaluation scheduling rejected.` and never reproduce supplied content.

## Invocation order

`scheduleEvaluationInvocations({plan, plan_sha256})` validates and binds the entire locked plan. It preserves every declared slot exactly once. Cases form contiguous blocks, sorted by their opaque case IDs. This explicit block ordering is a deterministic implementation choice; the protocol specifies randomization *within* each block.

Within a case, configurations and numeric repetition indices have priority:

```text
SHA-256(protocol_id | run_id | case_id | configuration_id | repetition)
```

The concatenation uses literal `|` separators and the decimal numeric repetition. Exact opaque identifiers cannot contain that separator. All requested previews in a configuration/repetition group share this key. Ties use configuration ID, numeric repetition, numeric preview index, and slot ID, preserving group contiguity even under an equal digest. No configuration population, repetition, unsupported strategy, or preview is added or removed.

Invocation adjacency is `NOT_APPLICABLE_CASE_BLOCKS`: the protocol deliberately calls for adjacent invocations of the same case. Viewer adjacency restrictions are applied by the separate rating scheduler. A declared invocation order is not proof that calls occurred in that order. The executable locked fake runner consumes this order and provides separately scoped fake-execution evidence.

## Candidate rating population

`scheduleEvaluationRatings({bundle, bundle_sha256, selected_output_ids, rater_id})` validates the complete locked record bundle and its canonical digest. `selected_output_ids` must contain **every candidate-disposition output exactly once**. An arbitrary smaller subset, missing output, rejected output, duplicate, or foreign ID fails closed. Selection-list order has no meaning and is normalized before hashing the input. Failed attempts, rejected outputs, retries, and usage corrections remain in the bound bundle.

`rater_id` is exactly `rater-` plus sixteen lowercase hexadecimal characters. It is a pseudonymous identifier, not a qualification, calibration, authenticated-person, or independence attestation. Each output has the protocol priority:

```text
SHA-256(run_id | rater_id | output_id)
```

This is the stable base priority and tie-break order for deterministic constraint optimization. The final schedule may differ from a strict digest sort. Different raters get different priorities, but the scheduler cannot promise different final orders when constraints leave only one useful arrangement.

The v1 population is the complete candidate pool; it does not implement a downstream display-permission selection or a stratified rejected-output audit. Those require their own locked authority and accounting. In particular, `candidate` does not attest decoding, moderation, subject count, consent, rights, or display safety.

## Adjacency objective and proof

For each adjacent pair, the scheduler checks literal equality of its case ID, configuration ID, and **numeric repetition index**. Repetition zero is equal across different cases and configurations; it is not redefined as a compound case/configuration key. Each repeated field contributes one collision. The objective minimizes the sum of those field collisions. `any_collision_edges` is also reported for inspection but is a different objective and is not claimed to be minimized.

The deterministic search uses at most eight starts in base-priority order. Each greedy choice first minimizes its immediate collision count, then prioritizes the greatest sum of remaining case/configuration/repetition frequencies, then uses the base priority. At most four passes choose the best strictly improving pair swap. A greedy dead end is never proof that a collision is globally unavoidable.

Two sound global lower bounds apply to that additive objective:

- For each field with largest group size `m` in a population of `n`, at least `max(0, 2m - n - 1)` repeated-field adjacencies are necessary. Sum the three field bounds.
- Give each pair of items an edge cost equal to its number of repeated fields. Every schedule path is a spanning tree, so a minimum spanning tree is another lower bound. Because costs are integers from zero through three, its weight equals the sum, over thresholds zero, one, and two, of the threshold graph's component count minus one.

The combined bound is the **maximum**, not the sum, of those two bounds. The result has one of these proof states:

| Proof | Status | Meaning |
|---|---|---|
| `ZERO_COLLISIONS` | `COMPLETE_CERTIFIED_ORDER` | A complete permutation satisfies all three adjacency constraints. The empty candidate pool also has zero collisions; it supplies no quality evidence. |
| `ANALYTIC_LOWER_BOUND_MATCHED` | `COMPLETE_CERTIFIED_ORDER` | The full order attains a sound global lower bound on the additive objective. |
| `EXHAUSTIVE_MINIMUM` | `COMPLETE_CERTIFIED_ORDER` | A complete exhaustive search of a tiny population proves its additive minimum. |
| `UNRESOLVED_BOUNDED_SEARCH` | `INCOMPLETE` | The full population remains present, but the bounded search has not proved minimum collision count or infeasibility of a better order. |

Exact search applies only to populations of at most nine; all permutations are covered with sound partial-cost pruning, fewer than one million search-prefix visits before pruning. Rating input is capped at 1,024 candidates. These constants are internal and cannot be widened by caller fields. Larger rating populations are rejected rather than silently sampled. The representative P1 population of 792 fits the cap.

With one configuration, configuration collisions are necessarily `n-1`. With one numeric repetition, repetition collisions are likewise `n-1`. The P1 example has 720 primary previews at repetition zero plus 72 reliability previews at repetition one, all from one configuration: configuration and repetition contribute 791 and 647 unavoidable field collisions, respectively. Avoiding the same case can still be useful. A certificate proves the chosen additive objective; it does not claim that every dimension individually achieves its smallest possible count in all populations.

## Exports and evidence limits

Both schedule functions return `{input, result}` with detached validated input, locked hashes, and a fixed metadata result. `serializeEvaluationInvocationSchedule` and `serializeEvaluationRatingSchedule` rebuild the schedule and compare every report field against that result before serialization. Unknown fields, accessor properties, sparse arrays, custom prototypes, fabricated proofs, altered counts, reordered schedules, and claimed gate passes fail closed.

`media_authorization`, `rater_qualification`, `blinding`, `execution`, and `quality_gate` remain `NOT_EVALUATED` where applicable. These schedules do not render images, enforce a neutral viewer, hide provider identities, authenticate raters, freeze scores, prove human independence, or establish real execution. They provide no live image-quality or release gate.

Evidence is in [evaluation-scheduling.test.ts](../../packages/ai/src/evaluation-scheduling.test.ts), its synthetic fixture builder, and [evaluation-scheduling.golden.json](../../tests/evals/evaluation-scheduling.golden.json). Golden input/report/order hashes bind generated metadata, not customer media or historical run provenance.

## Reviewed checkpoint — 2026-10-02

Independent review passed all 21 scheduling tests and 51 locked-runner tests,
including actual execution across configuration/repetition groups after stored
plan-array reversal. A separate subset dynamic-programming calculation confirmed
that the eight- and ten-item adversarial populations both have additive minimum
two against analytic lower bound one. The former receives an exhaustive
certificate; the latter remains `INCOMPLETE` under the fixed nine-item exact
search cap, despite retaining every candidate.

The final integrated suite passed 375 tests in 15 files, domain/AI/service/web
TypeScript checks, and the repository safety scan. No material P1/P2 remains in
this reviewed scope. Tests read their goldens; they contain no refresh hook.
The existing browser checkpoint is unchanged because no browser code changed.
