# Moderated consultation usability session kit

**Task:** `UX-001`  
**Rounds:** five low-fidelity pair sessions, then five interactive-PWA pair sessions  
**Session unit:** one adult client and one salon professional using the product together  
**Research rule:** synthetic portraits and researcher-supplied task wording only  
**Readiness:** protocol-ready; participant work remains blocked until the project owner authorizes recruitment and external coordination

## Purpose and gate

Test whether a client and professional can complete a private consultation, understand the limits of an AI visualization, recover from a supported problem, agree on a feasible service direction, and delete the consultation.

Run the rounds separately:

1. five sessions using `prototypes/consultation-wireframe/`;
2. five sessions using `apps/web/` after low-fidelity findings are fixed or explicitly accepted.

Each round has five valid session pairs. Prefer different people in round two. If either person returns, assign a new round-specific code and record only the applicable role-specific prior-round field; familiarity may improve performance.

The wireframe research criteria allow four of five uncoached core completions. `ops/TASKS.yaml` and `docs/ROADMAP.md` require all five representative users to complete without coaching before `UX-001` closes. Report both thresholds. Do not close `UX-001` unless each round reaches 5/5 uncoached core completion and every other gate below passes.

## Research-data governance

Blank instruments may live in this repository. Completed worksheets, screener results, event rows, incident rows, and session-level synthesis must **never** be committed to source control, attached to a software issue, placed in product telemetry, or stored with application data.

Before recruitment, the authorized study lead must provision an encrypted, access-controlled research location outside the repository and name the people filling these roles:

| Role | Minimum access |
|---|---|
| Recruiting coordinator | Scheduling system already approved for recruitment; keeps contact data out of hAIr artifacts; may hold the temporary code linkage |
| Facilitator/notetaker | Assigned session worksheet only; may create categorical findings and incident code |
| Study lead | All pseudonymous worksheets, access log, dispositions, and aggregate synthesis |
| Product/accessibility reviewer | Pseudonymous findings and component scores; no recruitment contact data or linkage |
| Privacy/security responder | Content-free incident record only when escalation is required |

Use least privilege, named accounts, multifactor authentication where available, and an access log. Do not grant salon managers, model providers, analytics vendors, or general engineering staff access merely because of their role.

The recruiting coordinator may map a random session code to an existing scheduling record only to manage attendance, withdrawal, or approved compensation. Keep that linkage separate from session notes. Destroy it within seven days after attendance/compensation reconciliation and no later than 30 days after the session. Record only the destruction date and coordinator role. After linkage destruction, a worksheet cannot be connected back to a participant; disclose that later withdrawal of that pseudonymous record will no longer be possible.

Delete session-level worksheets, screening categories, event rows, and code-bearing synthesis no later than 90 days after the round decision. A content-free incident record follows the project incident-retention rule. A repository decision/status record may retain only aggregate thresholds, issue decisions, and product changes with no session codes, quotes, small-cell participant description, or linkage.

Read this disclosure before screening:

> This study uses a synthetic portrait and does not record audio, video, your screen, your name, contact details, salon, photo, hairstyle request, or demographic information. We record coded task outcomes and short notes about the interface. Authorized research, product, and accessibility reviewers can see those coded notes. Session-level notes are kept in a restricted research location for no more than 90 days after the round decision. A recruiting coordinator may temporarily link your random session code to its scheduling record, then destroys that link within seven days after reconciliation and no later than 30 days after the session. Before that link is destroyed you may ask the coordinator to withdraw your study record; afterward we cannot identify which coded record is yours. Participation is voluntary and does not affect salon service. You may stop at any time.

Record `research_disclosure_given: yes` and `research_consent_pair: yes` only after both people agree. No participant session may start otherwise.

## Participant mix, screening, and accommodations

Recruit five pairs per round. The five professional participants collectively must cover:

| Self-reported professional capability | Minimum per round |
|---|---:|
| Barbering | 1 |
| Hair coloring | 1 |
| General styling | 1 |
| Curly/coily hair or protective styles | 1 |
| Any relevant salon practice; fill the largest remaining gap | 1 |

One professional may carry multiple tags, but use five professional participants and cover every row. Each client participant must personally attest that they are 18 or older and agree to read the product-consent screen in the client role. Do not infer capability or any client characteristic from appearance.

Use only this privacy-safe screener:

1. Client: “Are you 18 or older?” (`yes` required)
2. Both: “Are you willing to test a salon consultation flow using only a synthetic portrait and researcher-provided wording?” (`yes` required)
3. Professional: “Which describe work you currently perform: barbering, coloring, general styling, or curly/coily hair or protective styles?” (select self-reported capabilities)
4. Ask each separately: “Have you used an AI hairstyle visualization before?” (`none`, `some`, or `frequent`)
5. Ask each separately: “Which shared devices are you comfortable operating?” (`phone`, `tablet`, `both`, or `neither`)
6. Ask each separately: “Have you participated in the other hAIr usability round?” (`yes`, `no`, or `unknown`)
7. Both: “What setup adjustment, if any, would help you use this device today?” Record only an accommodation category, never a diagnosis or reason.

Supported accommodation categories are `none`, `zoom`, `external_keyboard`, `device_stand`, `reader_at_participant_direction`, `break`, `extra_time`, and `other_nonidentifying`. Provide reasonable setup changes without coaching the task. Pause timing only for setup or a break; normal use of an accommodation and task-related discussion remain measured. Record whether the accommodation materially changed the test method.

If the product itself prevents an eligible, consenting pair from continuing with an accommodation, record the affected component as `fail`; do not erase it as an exclusion. Stop safely if needed and count core completion as failed. If the research setup—not the product—cannot provide the requested accommodation, do not run the session, record a nonidentifying coverage limitation, and recruit a replacement after authorization. In synthesis, state untested access methods and do not generalize findings to them.

Do not collect names, new contact details, salon names, photos, filenames, raw hairstyle requests, exact ages, demographic fields, protected traits, health information, or inferred attributes. Route scheduling through the separately authorized coordinator.

## Facilitator setup

1. Create a random code such as `LF-S03` or `PWA-S03`. Never derive it from a person, salon, email, birth date, or appointment.
2. Open a fresh private browser session. Clear site data and confirm no prior consultation or share state.
3. Load the assigned surface locally. Do not record the screen, audio, video, keystrokes, or session replay.
4. Configure only a condition listed for that surface below. Hide low-fidelity researcher controls from the product area.
5. Use only the built-in synthetic portrait. Never ask for a personal image. A file chooser may be opened to test discoverability only when the assigned low-fidelity fallback requires it; configure the research browser/device with an empty dedicated folder, cancel the chooser, and continue with **Use synthetic demo photo**. On all other paths, disable or cover real camera/gallery entry points.
6. Use a 360–430 CSS-pixel phone or a 768–1024 CSS-pixel shared tablet according to the coverage plan. Both classes must exercise every required component during the round.
7. Copy `SESSION-WORKSHEET.md` into the restricted research location and complete its canonical schema.
8. Prepare two timers. Do not use product telemetry as the authoritative research time.
9. Read the data disclosure, obtain research agreement, then read:

> We are testing the consultation flow, not you. Please work together as you normally would and say what you expect to happen. Use only the synthetic portrait and the task wording I provide. I will stay quiet unless privacy, safety, or the session rules require me to step in. You may stop at any time.

10. Before the product-consent step, say:

> This is a simulation. Selecting the product acknowledgement means you understand what the pictured client would be asked to confirm in real use. It does not mean you are the person in the synthetic portrait, and no real portrait will be processed.

This avoids a false attestation while preserving observation of whether the client role reads and activates consent before photo controls.

## Common core task

Every primary scenario must reach first comparison and then the agreed-plan/share state. Give this common brief plus the scenario-specific sentence:

> Using only the synthetic portrait, work together to create the direction on the task card. Compare the first available previews, choose a direction, record the professional feasibility and service direction, confirm the pair’s agreement, and create the private link. If a problem appears, continue in the way you think is best.

The default task card is researcher-supplied: `collarbone layers; warmer copper direction; moderate maintenance`. Session 3 uses: `the copper bob from a favorite detective character`. Participants must not substitute a personal or real-client prompt.

Core success requires, without coaching: product consent, accepted synthetic portrait, structured request, first comparison, selected ready preview, feasibility, service note, pair agreement, and private-link confirmation. A scenario-specific recovery may occur before core success. Run the standardized deletion probe only after core success or after recording core failure.

`LF-1` and `PWA-1` intentionally have no assigned failure; record `recovery_without_restart: not_applicable`. The other four scenarios must record `yes` or `no`, producing the existing threshold of at least four recoveries across five sessions without treating the planned success scenario as missing evidence.

## Low-fidelity condition matrix

These conditions are supported by the **Prototype test states** controls in `prototypes/consultation-wireframe/`. Apply a condition before a new consultation.

| Code | Supported setup | Scenario-specific sentence and recovery | Evidence |
|---|---|---|---|
| `LF-1` | `All three previews succeed` | “Create the default direction.” After the private link is created, the core is complete. | First-use comprehension and full path |
| `LF-2` | Primary run: `Camera unavailable; upload works` | “Find a way forward when the camera route is unavailable.” Continue through first comparison and the full core. Afterward, run `First photo needs a retake` as a diagnostic second consultation and again continue through first comparison. Only the primary run supplies gate timing/core fields; record the diagnostic as an issue/event row. | Fallback and corrective guidance without bypassing consent |
| `LF-3` | `Request needs revision` | Use the detective-character task card. Revise the rejected identity/non-hair request into visible hair attributes, generate, reach first comparison, and complete the core. | Hair-only translation and rejection recovery |
| `LF-4` | `One of three previews fails` | Compare a ready sibling, retry only the failed preview, favorite no more than two, apply one refinement, then complete the core. | Partial-result preservation and targeted retry |
| `LF-5` | `Deletion verification is delayed` | Mark `Needs preparation or grow-out`, document a staged service direction, and complete the core before deletion. The delayed state occurs during the standardized deletion probe. | Professional-plan meaning and honest deletion state |

The `LF-2` diagnostic run is not a sixth participant and is not pooled into the gate denominator. It still reaches first comparison so no tested scenario stops at capture.

## Interactive-PWA condition matrix

The PWA does not implement the low-fidelity camera-unavailable, retake, request-revision, or delayed-deletion fixtures. Do not claim or simulate those states in the PWA round. Use only the supported routes and behavior below.

| Code | Supported setup | Scenario-specific sentence and recovery | Evidence |
|---|---|---|---|
| `PWA-1` | Default route `/` | “Create the default direction.” Complete the common core. | First-use full path |
| `PWA-2` | `/?scenario=timeout` | “Continue when one preview does not finish.” Compare a ready sibling, retry the timed-out preview, then complete the core. | Timeout and targeted retry |
| `PWA-3` | `/?scenario=policy` | Use the detective-character task card. Review the hair-only interpretation; when one option is rejected, use a ready sibling and complete the core. | Hair-only interpretation plus usable sibling after rejection |
| `PWA-4` | `/?scenario=partial` | Compare a ready sibling, retry only the failed preview, favorite no more than two, apply one refinement, regenerate, and complete the core. | Partial recovery, favorite cap, and refinement |
| `PWA-5` | Default route `/` | Choose `Needs preparation or grow-out`, complete the core, then change a maintenance detail. Observe that agreement/share is revoked, re-agree, and create the link again. | Plan-change invalidation and share lifecycle |

All PWA scenarios reach first comparison. `policy` is a per-variant fake-provider rejection; do not describe it as a batch request-revision state.

## Standardized uncoached deletion probe

Run this exact probe in all five sessions in both rounds, after scenario evidence:

> The client now wants this consultation removed. Continue until you believe the consultation has reached the deletion state shown.

Give no navigation or confirmation help. Pass `deletion_probe_uncoached` only if the pair finds delete, recognizes the destructive confirmation, and reaches the surface’s final shown state with zero coaching. Pass `delete_found` only when they locate the action without coaching. Pass `deletion_state_understood` only when both separately explain the final state correctly:

- normal deleted state: access/content shown by the prototype is gone, while the live product would still require verified backend deletion;
- low-fidelity delayed state: access is blocked but deletion is not verified until retry succeeds.

For `LF-5`, let the pair use the visible verification retry without coaching. For every PWA session, the supported result is the local `Consultation deleted` state; do not claim backend verification. After the PWA deletion, an optional researcher-only check may open `/?share=local-demo` to verify that no active local share content appears. Do not count that check as participant performance.

## Neutral prompts, coaching, and wrong turns

Allowed neutral prompts reveal no answer:

- “What are you looking for?”
- “What do you expect that to do?”
- “What would you do next?”
- “What does that message mean to you?”
- “How would you decide between these?”
- “You can keep working with what you see.”

A **coaching event** is any unplanned instruction that identifies a control, location, order, required content, system meaning, or recovery choice. Any coaching before core success makes `core_completed_without_coaching: no`. Any coaching during the deletion probe makes `deletion_probe_uncoached: no`. Continue for diagnostic value unless a stop rule applies.

A **wrong turn** moves away from the task and requires backtracking, triggers avoidable validation, repeats an action because state is unclear, or opens the wrong recovery path. Self-correction does not itself count as coaching. Consecutive taps on one unresponsive target count as one wrong turn plus a finding.

## Timing definitions

Record both metrics for every primary session:

### Brief to core

- **Start:** facilitator finishes the last word of the common/scenario brief.
- **Stop:** private-link confirmation appears after an agreed plan.
- `brief_to_core_wall_seconds` includes all use and task-related discussion.
- `brief_to_core_active_seconds = wall - researcher_generation_pause - setup_or_break_pause`.

### Photo to first comparison

- **Start:** synthetic photo is accepted and the request screen becomes actionable.
- **Stop:** original and at least one ready AI preview are simultaneously visible and available for comparison.
- Per the wireframe criterion, pause participant discussion and the fixed researcher-controlled simulated generation wait.
- `photo_to_comparison_active_seconds = wall - participant_discussion_pause - researcher_generation_pause - setup_or_break_pause`.

Do not pause reading, navigation, validation, hesitation, recovery, or normal use of an accommodation. Pause only accommodation setup or an actual break. If either endpoint is not reached, record `not_completed`; never substitute a timeout. The timing gate is incomplete unless all five primary sessions have valid photo-to-comparison active times.

The two-to-three-minute criterion applies only to the median photo-to-comparison active time: sort five values and use the third; it must be under 180 seconds. Brief-to-core is reported as both median wall and active time without a pre-set threshold in this round.

## Comprehension questions and rubrics

Ask each person separately before discussing answers. Record `correct`, `partial`, or `incorrect` plus a short interface-focused paraphrase.

1. “What is this image, and how certain is it to match the finished service?”  
   **Correct:** AI hairstyle visualization; actual results may vary. **Partial:** recognizes AI but omits uncertainty. **Incorrect:** treats it as a prediction or exact result.
2. “Who decides whether this direction is feasible now?”  
   **Correct:** the professional after assessing the client’s hair and service needs. **Partial:** mentions the professional but also treats the image as authoritative. **Incorrect:** AI/product decides.
3. “If the inspiration mentions a celebrity or character, what can be copied?”  
   **Correct:** visible hair attributes only; face/identity is not copied. **Partial:** says hair only but expects close identity resemblance. **Incorrect:** expects face/identity copying.
4. **Direct guarantee check:** “Does marking `Feasible now` guarantee the exact haircut or color shown? Why or why not?”  
   **Correct:** no, and identifies professional assessment or at least one real-service factor such as starting hair, condition, color history, technique, lighting, or maintenance. **Partial:** says no without explaining, or still expects a nearly exact outcome. **Incorrect:** says yes or treats the label as a guarantee.
5. “What does the deletion state you reached mean?”  
   **Correct:** matches the supported state rubric in the deletion probe. **Partial:** understands access is blocked but is unsure about verification. **Incorrect:** claims verified backend deletion from the PWA or from a pending low-fidelity state.
6. “How long can original/inspiration images and an unsaved preview remain?”  
   **Correct:** originals/references removed after generation and no later than 24 hours; unsaved previews within 24 hours. Accept a clearly shorter interpretation.
7. “What can a private-link recipient rely on?”  
   **Correct:** temporary, revocable, labeled service direction; not a guaranteed outcome; a recipient’s local copy cannot be recalled.

For pair-level gates, both people must be `correct`; `partial` does not pass. `ai_limit_pair_pass` requires questions 1 and 2 correct for both. `identity_copy_pair_pass` requires question 3 correct for both. `exact_result_pair_pass` requires the direct question 4 correct for both. `deletion_state_understood` requires question 5 correct for both.

## Accessibility component scoring

Score these required components: `consent`, `photo`, `look_request`, `generation_status`, `compare_refine`, `plan_agreement`, `share_expiry`, and `delete_confirmation`.

For each component, the worksheet records five dimensions:

1. `phone_reach_legibility` at 360–430 CSS px;
2. `tablet_shared_reflow` at 768–1024 CSS px;
3. `keyboard_focus` including visible focus, logical order, no trap, and operable destructive confirmation;
4. `labels_semantics_noncolor` including understandable labels/state and no color-only meaning;
5. `errors_status_recovery` including announced errors/progress and clear recovery.

Allowed scores are `pass`, `fail`, and `not_observed`. **`not_observed` is missing evidence, never a pass.** A touch session will naturally leave keyboard cells unobserved; a complete keyboard-only synthetic dry run must fill that evidence. Aggregate across the round by component and dimension:

- `fail` if any unresolved observed failure exists;
- `pass` if at least one applicable observation passes and no unresolved failure exists;
- `missing` if all observations are `not_observed`.

Every one of the 40 component/dimension cells must aggregate to `pass` for the accessibility gate. Schedule phone, tablet, keyboard, scenario, and dry-run coverage accordingly. Record a product-interaction issue only; never record a diagnosis or participant attribute.

## Severity and disposition

| Severity | Definition | Exit treatment |
|---|---|---|
| S0 — stop | Privacy, consent, safety, cross-consultation, or destructive-state failure | Stop, contain, fix, and rerun. Cannot be accepted for gate passage. |
| S1 — material | Blocks core/deletion, causes coaching, creates a false guarantee, or makes required access/recovery unavailable | Fix and rerun, or obtain an explicit root product decision that states rationale, mitigation, bounded scope, and a reconsideration trigger. |
| S2 — moderate | Recoverable wrong turn or notable friction without coaching | Track and disposition. Same S2 in two or more sessions is reviewed as candidate S1. |
| S3 — minor | Cosmetic/low-frequency friction with no task, comprehension, privacy, or access impact | Record for polish; does not block. |

Material friction means S0 or S1. S0 must be fixed and rerun. An S1 is resolved only by `verified_fixed` evidence or a recorded `accepted_with_decision` disposition containing rationale, mitigation, bounded scope, and a reconsideration trigger. Any S1 lacking one of those dispositions remains open and blocks the gate.

## Stop and incident rules

Stop immediately when:

- anyone tries to select, capture, paste, or describe a real person’s photo;
- real image bytes, filename, raw request, identity, contact detail, or prohibited content appears in notes, telemetry, logs, storage, or a network request;
- product consent is bypassed or preselected;
- a participant discloses they are under 18, withdraws, or shows distress;
- another consultation appears;
- the facilitator cannot confirm a clean synthetic state.

Close the surface, clear local state, and preserve no prohibited content. Record only the canonical content-free incident fields. Do not copy the content. Escalate under the project privacy/security process before sessions resume.

## Canonical record and notes

`SESSION-WORKSHEET.md` is the sole canonical pair-level schema. Do not create parallel field names in a spreadsheet or form. Its event, comprehension, accessibility, finding, and incident tables are child rows keyed by `session_code`. Round dry-run accessibility evidence uses a separate `DRY-LF-##` or `DRY-PWA-##` source code and never appears as a participant pair.

Short paraphrases describe interface behavior, such as “Both expected retry to replace ready results.” Never include a quote, hairstyle request, photo description, identity, demographic fact, contact detail, or salon detail.

## Exact exit calculations

Calculate each round independently over exactly five valid primary session pairs. Operationally invalid sessions are replaced. Product-caused inability to continue remains a failed valid session; do not replace it to improve the denominator.

| Criterion | Canonical calculation | Pass threshold |
|---|---|---:|
| Consent before photo | `count(consent_before_photo = yes) / 5` | `5/5` |
| Wireframe discovery completion | `count(core_completed_without_coaching = yes) / 5` | `>=4/5` |
| `UX-001` completion | `count(core_completed_without_coaching = yes) / 5` | `5/5` each round |
| Photo-to-comparison time | Sort five valid `photo_to_comparison_active_seconds`; third value | `<180 seconds` |
| Brief-to-core reporting | Median of five valid wall values and five valid active values | Report; no threshold |
| AI visualization + professional feasibility | `count(ai_limit_pair_pass = yes) / 5` | `5/5` |
| Assigned failure recovery | `count(recovery_without_restart = yes) / 5` | `>=4/5` |
| Uncoached deletion probe | `count(deletion_probe_uncoached = yes) / 5` | `5/5` |
| Immediate deletion found | `count(delete_found = yes) / 5` | `5/5` |
| Deletion state understood | `count(deletion_state_understood = yes) / 5` | `5/5` |
| No identity-copy belief | `count(identity_copy_pair_pass = yes) / 5` | `5/5` |
| No exact-result guarantee belief | `count(exact_result_pair_pass = yes) / 5` | `5/5` |
| Accessibility components | Aggregate all 8 components × 5 dimensions | `40/40 pass; 0 missing` |
| Material findings | Open S0/S1 after fixes, reruns, or permitted recorded S1 acceptance | `0` |
| Coverage disclosure | Every setup limitation and untested access method stated | Complete |

Use `yes` only when directly observed. Missing evidence fails that criterion or makes the round incomplete. Do not pool ten sessions to hide a failing round.

Round result:

- **PASS:** every row passes, including `UX-001` 5/5;
- **DESIGN-CRITERIA-ONLY:** low fidelity reaches 4/5 but not 5/5 uncoached completion and all other rows pass; `UX-001` remains blocked;
- **FAIL:** a threshold fails or S0/S1 remains open;
- **INCOMPLETE:** fewer than five valid sessions, invalid timing evidence, any accessibility cell is missing, governance evidence is missing, or coverage cannot be assessed.

## Synthetic dry-run checklist

Run before participants, after material changes, and before synthesis:

- [ ] Recruitment and external contact remain disabled unless explicitly authorized.
- [ ] Restricted non-repository storage, named roles, access log, deletion date, and linkage-destruction process are ready.
- [ ] Fresh private browser state has no prior consultation or share state.
- [ ] Only a synthetic portrait can be selected; the low-fidelity fallback may open an empty/canceled chooser solely to test discoverability.
- [ ] No image request occurs before product consent.
- [ ] Every listed low-fidelity condition works as described.
- [ ] PWA default, `partial`, `timeout`, and `policy` routes work; no unsupported condition is claimed.
- [ ] Every primary scenario reaches first comparison and agreed plan/share before deletion.
- [ ] Both timer definitions can be recorded and independently recalculated.
- [ ] The exact deletion probe works for all five sessions on each surface.
- [ ] Ready results survive sibling failure; targeted retry does not restart the consultation.
- [ ] Plan changes revoke stale PWA agreement/share state.
- [ ] AI/variability label survives plan/share presentation.
- [ ] Phone and tablet have no page-level horizontal overflow and retain reachable actions.
- [ ] Keyboard-only flow covers all eight components, visible focus, logical order, errors/status, and destructive confirmation.
- [ ] All 40 round accessibility cells have a planned evidence source; `not_observed` is treated as missing.
- [ ] Notes use only the canonical schema and contain no prohibited content.
- [ ] A second reviewer can reproduce every calculation from the five worksheets.

## Synthesis procedure

1. Validate governance and five eligible pair records for the round.
2. Reject prohibited note content without copying it and follow the incident rule.
3. Calculate every exit row from canonical field names.
4. Aggregate all 40 accessibility cells; list every missing or failed cell.
5. Merge issues by behavior/component, preserving highest severity and affected session codes.
6. Review repeated S2 findings as candidate S1.
7. Fix and rerun every S0; fix/rerun or explicitly accept each S1 under the disposition rule; document S2/S3 disposition.
8. State accommodations used, setup limitations, untested access methods, returning-pair count, and limits on generalization without identities or diagnoses.
9. Write only content-free aggregate outcomes to repository status/decisions. Keep session-level evidence in restricted storage until scheduled deletion.
10. Advance to the PWA round only after low-fidelity evidence is recorded. Close `UX-001` only after both rounds pass and recruitment was authorized.

