# Mobile consultation wireframe

**Task:** DISC-004  
**Artifact:** `prototypes/consultation-wireframe/`  
**Status:** ready for five representative moderated usability sessions  
**Fidelity:** interactive low-fidelity prototype; no network, storage, model, camera API, authentication, or real deletion

## Purpose

This wireframe tests whether a stylist and adult client can complete a private, two-to-three-minute consultation together on a phone or shared tablet. It covers the entire decision flow: client consent, guided photo, structured hair direction, hair-only reference interpretation, asynchronous previews, comparison and refinement, stylist feasibility, an agreed service brief, sharing, expiry, and deletion.

The prototype uses CSS-drawn synthetic portrait placeholders. It must never be used to collect research participants’ real photos. File pickers test discoverability only: the prototype checks basic file metadata in the browser, does not read or display the file, and cannot upload it.

## Run it

Open `prototypes/consultation-wireframe/index.html` in a current browser. No install or build step is required. A local static server may also serve the directory.

Use **Prototype test states** above the product surface before each session. The selected condition takes effect after **Apply condition** and starting a new consultation. The control is a researcher aid and is excluded from the intended product UI.

Available conditions:

- one of three previews fails, then succeeds on targeted retry;
- all three previews succeed;
- camera unavailable while device upload remains available;
- the first photo needs a retake;
- the first photo contains multiple faces and must be replaced;
- a hair request is rejected for asking for a non-hair or identity-copying edit;
- one preview times out while siblings succeed;
- deletion access is blocked while verification retries;
- direct review of an expired consultation and an expired private link.

## Product decisions represented

- The surface is a responsive PWA flow for a stylist-operated phone or shared tablet.
- A client account is not required. A nonfunctional QR placeholder represents optional device handoff.
- The client personally acknowledges adult status and purpose-specific consent before the photo picker becomes available.
- A public-figure, celebrity, fictional-character, era, or look reference is translated into editable visible hair attributes. The reference identity never becomes an edit target.
- Three generation variants have independent states. A successful result survives sibling failure, timeout, retry, or cancellation.
- The original remains visible beside an AI result during selection.
- The stylist must record feasibility and a service direction before a brief can be shared.
- Unsaved assets expire within 24 hours. Explicit saving extends the consultation to no more than 30 days in this provisional design. A private share link expires after 24 hours independently.
- Immediate deletion remains available after consent and removes the photo, variants, notes, pending work, and active links.
- Every result and shared brief says **AI hairstyle visualization — actual results vary**.

The prototype deliberately excludes booking, payment, diagnosis, attractiveness or face-shape judgments, exact color formulation, live AR, a public gallery, long-term history, and a celebrity image catalog.

## Primary flow and state model

```text
home
  -> optional client handoff
  -> consent
  -> guided photo
  -> describe hair direction
  -> confirm hair-only request
  -> queued/running variants
  -> compare/favorite/refine
  -> stylist feasibility and notes
  -> share/download/delete

consultation: draft -> consented -> ready -> generating -> reviewing -> agreed
                                                          -> deleted
                                                          -> expired

variant: queued -> running -> succeeded
                           -> failed -> retry -> running
                           -> timed_out -> retry -> running
                           -> canceled -> retry -> running
```

Consultation state and variant state remain separate. This prevents one failed model call from erasing completed previews or reopening consent. Cancel acts only on unfinished variants. A late result from canceled work must be ignored by the production client and server state machine.

## Screen and copy contract

The table gives required meaning and minimum user-facing copy. Wording can be improved after research, but it may not remove the stated fact or soften an action’s consequence.

| Surface/state | Required content and minimum copy |
|---|---|
| Home | The job is to create a shared direction and stylist-reviewed plan. Show: **Visualization, not a promise.** Starting hair, condition, technique, lighting, and maintenance affect real results. |
| Client handoff | No account is needed. A handoff code expires after 10 minutes and opens consent before upload. Do not put a portrait or client name in a handoff notification. |
| Consent — purpose | Explain that the salon and its named, approved image processor use the photo only to create private hairstyle visualizations for this consultation. Exact salon, controller, provider, concern contact, policy version, and jurisdiction-specific text are release configuration, not hidden boilerplate. |
| Consent — uncertainty | **The AI can be wrong or unrealistic. It does not predict an exact haircut, color, or chemical result.** |
| Consent — training/public use | **hAIr does not use your photo to train AI models or place it in a public gallery.** Provider-specific terms must be verified and named before pilot; the product may not imply stronger provider controls than the contract provides. |
| Consent — retention | Source deleted after processing, 24-hour hard maximum; unsaved previews within 24 hours; an explicitly saved plan within 30 days or a shorter salon setting. Explain immediate deletion. |
| Consent — adult | **I am 18 or older, and I am the person who will appear in the photo.** The second acknowledgement grants purpose-specific processing. Both are required. Decline ends with **No photo collected**. |
| Guided photo — empty | Ask for one consenting adult, even light, a front or slight three-quarter view, visible hairline/ears/neck/shoulders, and no filter, hat, severe blur, or severe angle. Present **Take photo**, **Choose from device**, and an obvious fallback. |
| Camera unavailable | **Camera is unavailable. Camera permission may be blocked or this browser may not support capture. Choose a photo from this device instead.** Never make camera permission the only path. |
| File invalid | Accept JPEG, PNG, or WebP up to the configured size (10 MB in the wireframe). Say **Nothing was uploaded**. Do not display or log the original filename. |
| Photo quality failure | Give one actionable primary reason: poor light/blur, multiple faces, severe angle, obstruction, or hairline outside frame. Keep **Retake** and **Choose from device** available. Never infer age, ethnicity, attractiveness, health, or identity. |
| Photo ready | Confirm one adult subject, visible hairline, usable light, and a clear allowed view. Production must decode and re-encode accepted media to strip EXIF and unexpected payloads before private upload. |
| Structured direction | Expose length, shape/cut, desired texture/style family, volume, fringe, part, color family, tone, finish, and maintenance tolerance. Let the stylist select **Keep current** instead of relying on inference. Require at least one requested change, hair-only note, or reference. |
| Reference by name | A person or character name is shorthand only. Show an editable hair-only description and: **Only this hair description moves forward.** Unknown references require the stylist to supply visible attributes rather than guessing identity traits. |
| Reference image | Require authority to share it. Say: **Use the reference for hair attributes only. The face in a reference is never copied.** It receives the same private handling and deletion policy as the source photo. |
| Free text | Ask for hair-only details; prohibit client names, health information, face/body changes, impersonation, diagnoses, and outcome guarantees. Server-side validation and moderation remain required. |
| Confirmation | Separate **Requested hair changes** from **Keep fixed**: face geometry/features, skin tone, age appearance, expression, body, clothing, pose, background, lighting, and camera view. Repeat the visualization caveat before cost-bearing generation. |
| Batch rejection | **This request needs revision. No preview was created.** Explain how to make it hair-only without exposing moderation internals. Provide **Edit request**, review, and delete. A rejection never silently rewrites intent. |
| Variant queued | Name the individual preview and say **Queued**. Progress must not imply a precise provider percentage if none exists; production may use coarse stages instead. |
| Variant running | Say **Creating** and identify the preview independently. Announce state changes without repeatedly reading every visual progress update. |
| Variant succeeded | Say **Ready** and label the image **AI visualization — actual results vary**. Make it immediately reviewable while siblings continue. |
| Partial failure | **This preview couldn’t be created. Completed previews are safe.** Offer **Retry only this preview** and preserve successful siblings. Do not imply a charge outcome until billing rules exist. |
| Timeout | **No result arrived in time. Completed previews are safe.** Offer targeted retry. Do not display a late callback from a terminal or canceled attempt. |
| Cancel | **Cancel unfinished previews** affects only queued/running variants. Confirm in-place: **Unfinished previews canceled; completed previews kept.** A canceled variant may be restarted explicitly. |
| Compare | Keep original and one selected result visible together. Each result retains its AI label. Provide result switching, up to two favorites, and an explicit **Use this preview for the plan** action. |
| Quality concern | Say: **If the face, skin tone, age appearance, expression, body, clothing, or background changed, do not use this preview. Report it and choose another.** A later build needs a reporting action and output suppression path. |
| Refinement | Change one named attribute at a time and state that everything else stays fixed. The new preview is another async variant; older results survive failure or cancel. |
| Feasibility | Require one of **Feasible now**, **Needs preparation or grow-out**, or **Inspiration only**. Require a service-direction note. Maintenance notes are optional. Do not solicit diagnosis or promise a chemical formula/result. |
| Agreement | Require: **The client and stylist agree that this is a visual direction for the service.** Clarify that it remains subject to assessment during the appointment. |
| Brief | Include chosen preview, structured direction, feasibility, service/maintenance notes, visible AI label, and the uncertainty statement. A screenshot should still carry the label. No client name is required. |
| Share | Create a private, revocable, short-lived link. Show its exact expiry. Link possession is not adequate protection for sensitive data in the production implementation; authorization design remains part of the MVP architecture. |
| Download/print | The AI label and caveat are part of the exported artifact, not browser chrome. The wireframe downloads a text-only synthetic brief and exposes print/PDF for layout review. |
| Automatic expiry | Consultation: **The photo, previews, notes, and active links were removed at the scheduled deletion time. Expired consultations cannot be restored.** Link: **This private link has expired.** Do not imply that a deleted consultation can be re-shared. |
| Delete confirmation | Name the full scope: photo, every preview and derivative, notes, pending work, and active share links. Say **It cannot be undone.** Default focus should not land on the destructive action. |
| Delete success | **Consultation deleted. The photo, previews, notes, pending work, and active share links are no longer available.** A content-free receipt/reference may support the user without retaining the portrait. |
| Delete verification delay | Immediately block viewing/sharing, say deletion is still being verified, retry automatically, and alert operations. Never report deletion complete until database rows, objects, thumbnails, masks, queued work, provider-held deletions where supported, and links are verified. |

## Validation behavior

Validation is local and actionable. It never spends a generation call for a clearly unusable input.

| Trigger | User experience | Recovery |
|---|---|---|
| Consent acknowledgement missing | Error summary receives focus; no photo control exists yet | Check both acknowledgements or decline |
| Camera denied/unavailable | Inline warning; chosen photo state remains empty | Upload from device or retry permission outside the flow |
| Unsupported/oversized file | No thumbnail or filename; state says nothing was uploaded | Choose supported file |
| Decode/corruption/pixel bomb in production | Generic unusable-file message; security detail stays out of UI/log content | Choose or retake photo |
| Zero or multiple subjects | State why exactly one subject is required | Crop/retake; do not identify subjects |
| Poor light, blur, severe angle, obstruction, hairline out of frame | Show the single most useful correction | Retake or upload another photo |
| No requested hair change | Error summary at the start of the describe surface | Choose an attribute, add a hair-only note, or add a reference |
| Reference name not converted/confirmed | Do not send a name as identity transfer instruction | Confirm/edit visible hair attributes |
| Non-hair or identity-copying request | Reject before generation with no partial silent rewrite | Edit request or delete |
| No preview succeeds | Stay on generation and show per-variant retry/cancel states | Retry one, edit request, or delete |
| Feasibility/service direction/agreement missing | Error summary receives focus; share stays unavailable | Complete the three required decisions |
| Share creation fails in production | Keep agreed plan locally visible; say no link was created | Retry or download labeled brief |
| Deletion verification fails | Revoke UI/link access, retain minimal deletion work record | Automatic retry, operations alert, explicit verified completion |

## Usability-session tasks

Use five representative sessions before visual polish. Include at least one barber, one colorist, one general stylist, and one professional experienced with curly/coily hair or protective styles. The client participant should read their own consent. Do not reuse these participants as the only image-quality graders.

### Session 1 — first-use happy path

Condition: **All three previews succeed**.

Ask the pair to create a direction for a collarbone-length layered cut with warmer copper tone and moderate maintenance. They must use the synthetic photo, choose a preview, mark feasibility, add a service note, and create a private link.

Observe whether they understand who acts at consent, whether the controls are faster than free text, whether the AI limitation is noticed, and whether “feasible now” is interpreted as professional judgment rather than a guarantee.

### Session 2 — camera fallback and retake

Condition: run once with **Camera unavailable; upload works**, then **First photo needs a retake**.

Ask the client to find a path forward without coaching. Success means they can locate device upload, understand the corrective photo guidance, and never bypass consent. Do not select a real file; use the synthetic demo photo.

### Session 3 — public figure or character inspiration

Condition: **All three previews succeed**.

Ask for “the copper bob from a favorite detective character” or another fictional prompt supplied by the researcher. The pair must convert it to visible hair attributes, edit the description, and state in their own words whether the face or identity will be copied.

Success means they treat the name as shorthand, can correct the structured description, and recognize that reference fidelity applies only to hair.

### Session 4 — partial result, cancellation, and refinement

Condition: **One of three previews fails**.

Ask the stylist to begin comparing a ready result, return to retry only the failed variant, favorite no more than two directions, and create a one-attribute refinement. On a second pass, cancel unfinished work and explain what was kept.

Success means a failed sibling does not feel like total loss, the targeted retry is discoverable, cancel scope is understood, and refinement does not imply that all attributes will change again.

### Session 5 — professional plan and privacy control

Condition: **Deletion verification is delayed**.

Ask the stylist to mark **Needs preparation or grow-out**, document a staged direction, save the brief, then delete the consultation. After the delayed-verification screen, retry verification. Finally show both expiry states from the researcher controls.

Success means the feasibility distinction is meaningful, the brief remains a direction rather than an outcome promise, immediate deletion is easy to find, and nobody interprets “access blocked” as verified deletion.

## Research success criteria

For the discovery exit review, capture evidence for:

- five of five clients encounter consent before any photo control;
- at least four of five pairs complete their assigned core flow without coaching;
- median synthetic-photo-to-first-comparison time is under three minutes, excluding discussion and simulated generation wait;
- five of five participants can explain that the image is an AI visualization and the stylist decides feasibility;
- at least four of five can recover from their assigned failure state without restarting the consultation;
- five of five can find immediate deletion from a post-consent screen;
- no participant believes a celebrity/character face will be copied;
- no participant believes **Feasible now** guarantees an exact color or service outcome;
- controls are reachable and legible at arm’s length on a 360–430 px phone and a 768–1024 px shared tablet;
- keyboard-only completion has no trap, lost required control, or inaccessible destructive confirmation.

Record task completion, time, wrong turns, coaching, noticed/missed caveats, terms participants repeat, and severity of each issue. Do not record a participant photo, name, raw hairstyle prompt, or any other sensitive client content in research notes.

## Responsive and one-handed behavior

- Phone is the default layout. The primary and back actions sit in a safe-area-aware bottom bar with at least 48 px targets.
- The most likely forward action is on the lower right; destructive deletion remains visually distinct and is never the primary bottom action.
- Long option sets wrap into thumb-sized chips; there is no horizontal dependency except optional preview tabs, which also have full text labels.
- On tablet, capture guidance and photo, option groups, results, and the final brief use two or three columns to support side-by-side conversation.
- The original/result pair never becomes a swipe-only or drag-only interaction. Both remain visible, including at narrow phone widths.
- Completed results persist through navigation. Production must also persist them through refresh, backgrounding, weak connectivity, and duplicate taps.

## Accessibility contract

- Target WCAG 2.2 AA. Use native buttons, checkboxes, radios, selects, file inputs, progress semantics, and the native dialog before custom widgets.
- Every screen has one focused `h1` after navigation. Validation summaries receive focus and describe the required correction.
- The stepper uses `aria-current="step"`; route and async state changes use polite live regions. Repeated percentage updates should not flood announcements.
- Choice chips retain native radio semantics. Color never carries status alone; status text and symbols accompany it.
- Touch targets are at least 44 by 44 CSS px and generally 48 px. Focus rings have strong contrast and are never clipped by sticky chrome.
- The delete dialog has an accessible name/description, opens only on an explicit action, preserves a safe cancel path, and returns focus when canceled.
- Reduced-motion preference disables entrance and shimmer motion. The flow does not rely on animation, hover, or pointer precision.
- Synthetic portraits use role/labels that say they are abstract placeholders. Generated-image alternative text in production should identify the selected variant and AI status without asserting unsupported appearance details.
- At 200% zoom and 320 CSS px, controls reflow rather than overlap. At 400% zoom, linear reading and operation must remain possible even if side-by-side comparison stacks in the implementation build.

## Build handoff requirements

The clickable wireframe demonstrates interaction intent, not production safeguards. The MVP vertical slice must add:

- a versioned consent receipt with time, salon, purpose, policy version, and session ID, without portrait or raw prompt content;
- private, tenant-scoped uploads with decode/re-encode, size/pixel limits, short-lived authorization, and metadata stripping;
- a versioned structured look specification and hair-only reference conversion that can be reviewed before provider submission;
- idempotent consultation and per-variant job state machines, durable progress, targeted retries, cancel/late-callback handling, and partial-result recovery;
- protected, short-lived result delivery and output suppression/reporting for identity or locality failures;
- configurable expiry, verified deletion across all derived objects and queues, revoked links, retry/alert behavior, and a content-free deletion receipt;
- labeled, revocable exports and shares whose screenshots still communicate AI provenance and uncertainty;
- keyboard, screen-reader, contrast, target-size, zoom, reduced-motion, iOS Safari, Android Chrome, shared-tablet, poor-connectivity, refresh, and background/foreground tests;
- deterministic fake-provider end-to-end cases for success, partial failure, timeout, cancellation, rejection, late callback, expiry, share revocation, and deletion verification failure.

No provider, masking strategy, or quality setting should be inferred from this wireframe. The image benchmark and quality gates remain separate prerequisites for the full MVP build.

## Acceptance traceability

| DISC-004 acceptance item | Inspectable evidence |
|---|---|
| Complete consent-to-delete flow | Interactive screens from `consent` through `deleted`; deletion dialog and success state; flow/state section above |
| Loading, validation, partial failure, retry, cancel, expiry, delete states | Per-variant job simulation, capture/request validation, researcher conditions, both expiry screens, deletion-delay path, state/copy tables above |
| One-handed phone and shared tablet | Safe-area bottom actions, 48 px controls, phone-first CSS, 42/62 rem tablet breakpoints, explicit responsive contract |
| Visualization differs from achievable outcome | Persistent AI label, confirmation warning, compare warning, feasibility gate, labeled brief and export copy |
| Ready for five representative sessions | Five task scripts, condition setup, success criteria, capture guidance, and no-real-photo rule above |

## Validation evidence — 2026-09-26

File-level checks passed against the delivered artifacts:

- `app.js` passes the Node JavaScript syntax parser;
- the HTML shell has nine unique static IDs, all required shell nodes, and only two local resource references (`styles.css` and `app.js`);
- all 201 CSS blocks have balanced braces and an author-level `[hidden]` rule protects pre-consent controls from component display styles;
- no remote script, stylesheet, font, image, import, or URL-based asset is present;
- every researcher condition and required recovery action has a corresponding UI control and state branch;
- focus targets, live regions, current-step semantics, labeled native dialog, progress semantics, visible focus, reduced-motion handling, and a skip link are present;
- the prototype directory contains only `index.html`, `styles.css`, and `app.js`.

A local browser interaction pass verified:

- the home, client handoff, consent, validation-error, decline-with-no-photo, expired-consultation, and expired-link surfaces render with accessible headings and controls;
- pressing **Agree and continue** with no acknowledgements stays on consent, focuses the error summary, and exposes no photo screen;
- declining consent ends with **No photo collected**;
- the Delete control is absent from both visual and accessibility output before consent;
- at a 390 by 844 CSS-pixel phone viewport, document width equals viewport width (no horizontal overflow), the sticky action bar remains inside the viewport, and the two product actions measure 65 CSS pixels high;
- at a 768 by 1024 CSS-pixel tablet viewport, document width equals viewport width and the sticky action bar remains inside the viewport;
- the browser console reports no warnings or errors on the exercised surfaces.

The browser pass intentionally used only synthetic/no-photo paths. The five moderated task sessions and a complete vertical-slice run remain the next discovery validation; this wireframe evidence does not claim model, storage, queue, authorization, retention, or deletion correctness.

## Known prototype limitations

- The QR pattern and share URL are intentionally nonfunctional.
- File inputs exercise affordance only; no selected image is read, previewed, persisted, or transmitted.
- CSS portraits do not test model quality, inclusion, identity preservation, or realistic comparison behavior.
- Progress, failure, timeout, retry, and deletion are deterministic simulations. They do not prove server semantics.
- The downloadable artifact is a text-only synthetic brief. Production exports require visual QA, authorization, provenance, and deletion tests.
- The exact salon/controller/provider/concern contact and regional legal language must replace generic consent nouns before a pilot.
- The provisional 24-hour/30-day policy still requires the accepted privacy contract and legal review before pilot use.
