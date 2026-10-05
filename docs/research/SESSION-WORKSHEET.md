# Usability session worksheet

Copy this blank template into the approved restricted research location. Never commit a completed copy. Use categorical observations and short interface-focused paraphrases only. Do not record names, contact details, salons, photos, filenames, raw hairstyle prompts, demographics, protected traits, diagnoses, audio, video, transcripts, or inferred attributes.

## Canonical pair-level record

Use these exact field keys and allowed values. This table is the sole pair-level schema.

| Field key | Fillable value |
|---|---|
| `session_code` | `{{LF-S## / PWA-S##; random}}` |
| `round` | `{{low_fidelity / interactive_pwa}}` |
| `surface_version` | `{{opaque revision}}` |
| `scenario_code` | `{{LF-1..LF-5 / PWA-1..PWA-5}}` |
| `date_month` | `{{YYYY-MM}}` |
| `viewport_class` | `{{phone / tablet}}` |
| `css_viewport` | `{{width x height}}` |
| `primary_input_method` | `{{touch / keyboard / mixed}}` |
| `fresh_private_state` | `{{yes / no}}` |
| `synthetic_only_setup` | `{{yes / no}}` |
| `research_disclosure_given` | `{{yes / no}}` |
| `research_consent_pair` | `{{yes / no}}` |
| `client_adult_attested` | `{{yes / no}}` |
| `professional_capability_tags` | `{{barbering; coloring; general_styling; curly_coily_or_protective; other_relevant}}` |
| `client_prior_ai_tool_use` | `{{none / some / frequent}}` |
| `professional_prior_ai_tool_use` | `{{none / some / frequent}}` |
| `client_device_familiarity` | `{{phone / tablet / both / neither}}` |
| `professional_device_familiarity` | `{{phone / tablet / both / neither}}` |
| `client_prior_other_round` | `{{yes / no / unknown}}` |
| `professional_prior_other_round` | `{{yes / no / unknown}}` |
| `accommodation_categories` | `{{semicolon-separated: none / zoom / external_keyboard / device_stand / reader_at_participant_direction / break / extra_time / other_nonidentifying}}` |
| `accommodation_changed_method` | `{{yes / no}}` |
| `coverage_limitation_code` | `{{none / setup_could_not_support / access_method_untested / other_nonidentifying}}` |
| `eligible_pair` | `{{yes / no}}` |
| `operationally_valid_session` | `{{yes / no}}` |
| `invalid_reason_code` | `{{none / research_consent_missing / adult_attestation_missing / setup_failure / prohibited_content / other_nonidentifying}}` |
| `consent_before_photo` | `{{yes / no / not_observed}}` |
| `core_completed` | `{{yes / no}}` |
| `core_completed_without_coaching` | `{{yes / no}}` |
| `recovery_without_restart` | `{{yes / no / not_applicable}}` |
| `deletion_probe_uncoached` | `{{yes / no}}` |
| `delete_found` | `{{yes / no}}` |
| `deletion_state_understood` | `{{yes / no}}` |
| `ai_label_noticed_before_question` | `{{yes / no / not_observed}}` |
| `wrong_turn_count` | `{{integer >= 0}}` |
| `core_coaching_count` | `{{integer >= 0}}` |
| `deletion_coaching_count` | `{{integer >= 0}}` |
| `brief_to_core_wall_seconds` | `{{integer >= 0 / not_completed}}` |
| `brief_to_core_generation_pause_seconds` | `{{integer >= 0}}` |
| `brief_to_core_setup_break_pause_seconds` | `{{integer >= 0}}` |
| `brief_to_core_active_seconds` | `{{wall - generation - setup_break / not_completed}}` |
| `photo_to_comparison_wall_seconds` | `{{integer >= 0 / not_completed}}` |
| `photo_to_comparison_discussion_pause_seconds` | `{{integer >= 0}}` |
| `photo_to_comparison_generation_pause_seconds` | `{{integer >= 0}}` |
| `photo_to_comparison_setup_break_pause_seconds` | `{{integer >= 0}}` |
| `photo_to_comparison_active_seconds` | `{{wall - discussion - generation - setup_break / not_completed}}` |
| `ai_limit_pair_pass` | `{{yes / no}}` |
| `identity_copy_pair_pass` | `{{yes / no}}` |
| `exact_result_pair_pass` | `{{yes / no}}` |
| `open_s0_count` | `{{integer >= 0}}` |
| `open_s1_count` | `{{integer >= 0}}` |
| `incident_occurred` | `{{yes / no}}` |
| `include_in_five_session_denominator` | `{{yes / no}}` |

Derived-field checks:

- `core_completed_without_coaching = yes` only when `core_completed = yes` and `core_coaching_count = 0`.
- `deletion_probe_uncoached = yes` only when deletion reaches the shown final state and `deletion_coaching_count = 0`.
- Active time cannot be negative and must equal the stated subtraction.
- `include_in_five_session_denominator = no` only for an ineligible pair or operationally invalid setup. Product-caused failure remains included.

## Event rows

Child rows use only `session_code` and an opaque event code.

| `session_code` | `event_code` | `step` | `event_type` | `interface_paraphrase` |
|---|---|---|---|---|
| `{{}}` | `{{E-01}}` | `{{consent/photo/look/generation/compare/plan/share/delete}}` | `{{wrong_turn / coaching / diagnostic}}` | `{{No quote or participant content}}` |

## Comprehension rows

Ask client and professional separately. Use `correct`, `partial`, or `incorrect` under the rubric in the kit.

| `question_code` | `client_result` | `professional_result` | `interface_paraphrase` |
|---|---|---|---|
| `ai_variability` | `{{}}` | `{{}}` | `{{}}` |
| `professional_feasibility` | `{{}}` | `{{}}` | `{{}}` |
| `hair_only_no_identity_copy` | `{{}}` | `{{}}` | `{{}}` |
| `exact_result_guarantee` | `{{}}` | `{{}}` | `{{}}` |
| `deletion_state` | `{{}}` | `{{}}` | `{{}}` |
| `source_unsaved_retention` | `{{}}` | `{{}}` | `{{}}` |
| `private_link_limits` | `{{}}` | `{{}}` | `{{}}` |

Pair derivation:

- `ai_limit_pair_pass = yes` only when both roles are correct on `ai_variability` and `professional_feasibility`.
- `identity_copy_pair_pass = yes` only when both are correct on `hair_only_no_identity_copy`.
- `exact_result_pair_pass = yes` only when both are correct on `exact_result_guarantee`.
- `deletion_state_understood = yes` only when both are correct on `deletion_state`.

## Accessibility component rows

Enter `pass`, `fail`, or `not_observed`. `not_observed` is missing evidence, not a pass. Record observations from this session; add separately labeled dry-run rows when reconciling the round.

| `component` | `phone_reach_legibility` | `tablet_shared_reflow` | `keyboard_focus` | `labels_semantics_noncolor` | `errors_status_recovery` | `issue_codes` |
|---|---|---|---|---|---|---|
| `consent` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `photo` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `look_request` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `generation_status` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `compare_refine` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `plan_agreement` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `share_expiry` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `delete_confirmation` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |

Participant-reported interaction issue, without diagnosis or personal attribute:

`{{Interface-focused paraphrase or none}}`

## Finding rows

| `session_code` | `issue_code` | `component` | `category` | `severity` | `viewport_input` | `interface_paraphrase` | `disposition` | `rerun_evidence` |
|---|---|---|---|---|---|---|---|---|
| `{{}}` | `{{I-01}}` | `{{}}` | `{{navigation / comprehension / recovery / privacy / accessibility / trust / other}}` | `{{S0 / S1 / S2 / S3}}` | `{{}}` | `{{}}` | `{{open / fixed_pending_rerun / verified_fixed / accepted_with_decision / deferred_S2_S3}}` | `{{}}` |

## Content-free incident row

Leave blank when `incident_occurred = no`. Never include the prohibited content.

| Field key | Fillable value |
|---|---|
| `incident_code` | `{{opaque code}}` |
| `time_bucket` | `{{YYYY-MM-DD HH:00 timezone}}` |
| `incident_category` | `{{real_media / prohibited_note_content / preconsent_transfer / consent_failure / underage / participant_stop / cross_consultation / other}}` |
| `surface_round` | `{{}}` |
| `content_left_device` | `{{yes / no / unknown}}` |
| `containment_status` | `{{contained / escalated / unresolved}}` |
| `escalation_owner_role` | `{{privacy / security / product / none}}` |

---

# Round synthesis template

Complete once per round in restricted storage. Do not combine rounds or commit session-level evidence.

## Governance and coverage

| Requirement | Evidence | Status |
|---|---|---|
| Recruitment explicitly authorized | `{{authorization reference}}` | `{{pass/fail}}` |
| Restricted storage and named roles active | `{{content-free reference}}` | `{{pass/fail}}` |
| Linkage destruction due/completed | `{{date and role only}}` | `{{pass/fail/pending}}` |
| Session-level deletion due | `{{date <= 90 days after decision}}` | `{{pass/fail}}` |
| Five valid session pairs | `{{codes}}` | `{{pass/fail}}` |
| Barbering represented | `{{codes}}` | `{{pass/fail}}` |
| Coloring represented | `{{codes}}` | `{{pass/fail}}` |
| General styling represented | `{{codes}}` | `{{pass/fail}}` |
| Curly/coily or protective-style experience represented | `{{codes}}` | `{{pass/fail}}` |
| Phone 360–430 px represented across components | `{{evidence}}` | `{{pass/fail}}` |
| Tablet 768–1024 px represented across components | `{{evidence}}` | `{{pass/fail}}` |
| Complete keyboard-only synthetic path | `{{evidence}}` | `{{pass/fail}}` |
| Returning pair count | `{{0–5}}` | `{{reported}}` |
| Accommodation categories used | `{{categories only}}` | `{{reported}}` |
| Setup/access coverage limitations | `{{category-only summary or none}}` | `{{reported}}` |
| Untested access methods and generalization limit | `{{content-free statement}}` | `{{reported}}` |

## Exit calculations

| Criterion | Numerator / denominator or value | Threshold | Result |
|---|---:|---:|---|
| Consent before photo | `{{n/5}}` | `5/5` | `{{}}` |
| Wireframe discovery uncoached completion | `{{n/5}}` | `>=4/5` | `{{}}` |
| `UX-001` uncoached completion | `{{n/5}}` | `5/5` | `{{}}` |
| Photo-to-comparison active times, sorted | `{{s, s, s, s, s}}` | five valid | `{{}}` |
| Median photo-to-comparison active time | `{{third value}}` | `<180 s` | `{{}}` |
| Brief-to-core wall times, sorted | `{{s, s, s, s, s}}` | report median | `{{}}` |
| Brief-to-core active times, sorted | `{{s, s, s, s, s}}` | report median | `{{}}` |
| AI visualization + professional feasibility | `{{n/5}}` | `5/5` | `{{}}` |
| Recovery without restart | `{{n/5}}` | `>=4/5` | `{{}}` |
| Uncoached deletion probe | `{{n/5}}` | `5/5` | `{{}}` |
| Immediate deletion found | `{{n/5}}` | `5/5` | `{{}}` |
| Deletion state understood | `{{n/5}}` | `5/5` | `{{}}` |
| No identity-copy belief | `{{n/5}}` | `5/5` | `{{}}` |
| No exact-result guarantee belief | `{{n/5}}` | `5/5` | `{{}}` |
| Accessibility component cells | `{{passed/40; missing count}}` | `40/40; 0 missing` | `{{}}` |
| Open S0/S1 | `{{count}}` | `0` | `{{}}` |

## Round accessibility aggregation

For each cell: `pass` requires at least one observed pass and no unresolved fail; `fail` means an unresolved observed failure; `missing` means all source rows were `not_observed`. Participant rows use `session_code`; nonparticipant dry runs use `DRY-LF-##` or `DRY-PWA-##`. Keep evidence-source codes in the cell or an adjacent restricted note.

| `component` | `phone_reach_legibility` | `tablet_shared_reflow` | `keyboard_focus` | `labels_semantics_noncolor` | `errors_status_recovery` |
|---|---|---|---|---|---|
| `consent` | `{{pass/fail/missing}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `photo` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `look_request` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `generation_status` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `compare_refine` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `plan_agreement` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `share_expiry` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |
| `delete_confirmation` | `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{}}` |

## Finding synthesis

| `issue_code` | `session_codes` | `highest_severity` | `pattern_evidence` | `decision` | `rerun_evidence` |
|---|---|---|---|---|---|
| `{{}}` | `{{}}` | `{{}}` | `{{}}` | `{{fix / accept_S1_with_decision / defer_S2_S3}}` | `{{}}` |

## Round decision

| Field | Entry |
|---|---|
| `round` | `{{low_fidelity / interactive_pwa}}` |
| `result` | `{{PASS / DESIGN-CRITERIA-ONLY / FAIL / INCOMPLETE}}` |
| `evidence_reviewed_by_role` | `{{role only}}` |
| `decision_rationale` | `{{No participant identity or content}}` |
| `next_action` | `{{}}` |

