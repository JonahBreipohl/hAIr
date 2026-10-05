# Consent, disclosure, adult-only, and reference-image contract

**Status:** implementation-ready copy and behavior; vendor names, region, and privacy contact must be populated before a live pilot  
**Audience:** product, design, engineering, support, privacy reviewer, and salon operators

The goal is a short, voluntary decision beside the chair, followed by detail for anyone who wants it. Consent must be a real precondition enforced by the server, not only a screen in the PWA.

## Consent interaction contract

1. The photo may be opened in the camera/file picker and previewed locally before consent, but no source or reference image bytes may leave the device.
2. The pictured client must be able to read the notice and personally activate the acknowledgements. A stylist may help navigate or read it aloud at the client's direction, but cannot silently consent for the client.
3. The acknowledgements are off by default, visually separate from marketing or general terms, keyboard/screen-reader operable, and available in the supported language of the session.
4. **Agree and continue** remains disabled until the required acknowledgements are active. **Not now** clears local previews and returns to a non-image workflow; declining must not prevent the salon from offering its ordinary service outside hAIr.
5. The upload API rejects a request unless it can atomically validate an unexpired consent receipt for the same tenant, consultation, purpose, and disclosure version.
6. A receipt never contains an image, client name, raw text, filename, IP address, or device fingerprint. Its schema is specified below.
7. Fresh acknowledgement is required if the purpose changes, a new category of recipient receives content, retention increases, hAIr proposes training use, the adult/reference rules change materially, or the disclosure is otherwise materially revised. Cosmetic copy or accessibility fixes do not invalidate an existing receipt.
8. Withdrawal is implemented through **Delete consultation**. It blocks access immediately and starts the verified deletion cascade. It cannot recall a file the client or stylist already downloaded, and that limitation is disclosed before download.

## Primary client screen — exact copy

Tokens in square brackets are deployment configuration. The product must fail closed in live mode if any token is unresolved.

### Title

**Before we use your photo**

### Body

> hAIr will use your photo, hair choices, and any inspiration image to create AI hairstyle previews for this consultation with **[Salon name]**. **[Hosting/storage provider]** and **[AI provider]** process the information to run the service.
>
> The previews can be inaccurate and are not a promise of the result you can achieve. Your stylist will assess what is realistic for your hair.
>
> Your original and inspiration images are deleted after generation, and no later than 24 hours. Unsaved previews expire within 24 hours. If you choose **Save for 30 days**, the selected previews and service plan remain for up to 30 days or the salon's shorter setting.
>
> hAIr does not use your consultation content to train or fine-tune AI models and requires the AI provider not to use it for training. The provider may scan uploads for safety and retain a flagged upload when required for abuse review. [How your data is handled]

### Required acknowledgements

- [ ] **I am 18 or older, I am the person in the client photo, and I choose to use it for this consultation.**
- [ ] **I understand these are AI previews, actual results vary, and I can delete this consultation at any time.**

When a reference image has been selected, add this required acknowledgement:

- [ ] **Every person visible in my inspiration image is an adult, and I have permission or another lawful right to provide the image for this consultation.**

### Actions

- Primary: **Agree and continue**
- Secondary: **Not now**
- Link: **How your data is handled**

The link opens the layered detail below without losing locally selected media. Closing or declining revokes any object URL and discards the local selection.

## Layered detail — client-facing copy

### What hAIr uses

> We use one client photo, your hairstyle choices and text, and any optional inspiration image to create and compare hairstyle previews. The salon may add a feasibility choice and service or maintenance notes. You do not need a client account, and hAIr does not ask for your name, phone number, email address, birthday, or medical history.

### Who can access it

> You and authorized staff at **[Salon name]** can access this consultation while it is active. **[Hosting/storage provider]** hosts the private service, and **[AI provider]** processes the minimum information needed to create the previews. hAIr support sees operational details by default, not your photos. A strictly controlled, logged support-access process may be used only for a serious incident.

### How long it stays

> The original client photo, inspiration images, and temporary editing files are deleted after the last generation attempt finishes, or within 24 hours at the latest. An unsaved consultation and its previews expire within 24 hours. If you explicitly save it, selected previews and the service plan expire after 30 days or sooner if the salon selected a shorter period. Share links expire after 24 hours and never outlive the consultation.
>
> Choosing **Delete consultation** removes access immediately. Active systems normally finish permanent deletion within 15 minutes and must do so within 24 hours. Encrypted, isolated backup copies can remain for up to 35 days; they are not available in the product, and deletion records are reapplied before a backup can be restored. Minimal consent and deletion receipts, without photos or hairstyle text, may remain for up to 24 months for accountability.

### AI processing and safety review

> hAIr does not use consultation content to train or fine-tune a model and does not allow the AI provider to use it for model training. The provider may automatically scan images for safety. If an upload is flagged for suspected abuse, the provider may retain it for manual review under its safety and legal obligations even when a no-retention setting is enabled. Current provider details and a contact for questions are available at **[Privacy notice URL]**.

### Your choices

> You can decline and continue the salon service without hAIr. During the consultation, you can cancel generation or delete the consultation. You choose separately whether to save, create a share link, or download a copy. A downloaded file is controlled by the person who downloads it and cannot be deleted by hAIr. For access, deletion, or privacy questions, use **[privacy contact and URL]** and include the consultation code shown in the app; do not email a photo.

### What hAIr does not do

> hAIr does not identify you, search for your face, create a reusable face template, infer demographic or health traits, judge attractiveness, diagnose hair or scalp conditions, or change you into a celebrity or character. The pilot is for adults only.

## Required copy at later decisions

### Camera or upload helper

> Use a clear photo of one consenting adult. Keep the hairline visible where possible. Avoid other people, mirrors showing another person, ID cards, and private details in the background.

### Reference helper

> An inspiration image guides hair only—cut, length, color, texture, volume, and silhouette. It does not replace your face with the reference person's face. Upload only an adult image you have permission or another lawful right to provide. If you only know a celebrity or character name, enter the name instead; hAIr will convert it into hair attributes for you to confirm and will not retrieve or copy that person's image.

### Structured public-figure/character confirmation

> We translated **[name entered]** into these visible hair attributes:
>
> **[neutral attribute summary]**
>
> Confirm or edit the description. The name will be discarded after confirmation, and the preview will keep your identity.

Actions: **Use these hair attributes** / **Edit** / **Remove inspiration**

### Persistent preview label

Use on every preview screen:

> **AI hairstyle preview · Actual results vary**

The label must remain visible during compare/full-screen views and cannot rely on color alone.

### Selection and stylist review

> This preview is inspiration, not an exact haircut or color prediction. Starting color, texture, condition, lighting, products, technique, and maintenance affect the real result. Ask your stylist to mark whether this look is **feasible now**, **needs preparation or grow-out**, or is **inspiration only**.

### Shared/downloaded artifact label

Place a durable visible label on the rendered artifact, not only in surrounding HTML:

> **AI hairstyle visualization — actual service results vary**

Include salon name, creation date, stylist feasibility choice, and expiration date when space permits. Do not place a client's name on the artifact.

### Share confirmation

> Anyone with this link can view the selected preview and plan until **[date/time]**. The link expires in 24 hours or sooner if the consultation expires. You can revoke it at any time. Do not post it publicly.

Actions: **Create private link** / **Cancel**

### Download confirmation

> The downloaded copy will be stored on this device and may be backed up or shared by its owner. Deleting the hAIr consultation cannot recall downloaded or screenshot copies.

Actions: **Download labeled copy** / **Cancel**

### Save choice

Saving is separate from initial consent and is never preselected:

> **Save selected previews and the service plan for 30 days?**
>
> Your original photo and inspiration images will still be deleted within 24 hours. The selected AI previews and stylist plan will remain available to this salon until **[date/time]**, unless you delete them sooner.

Actions: **Save for 30 days** / **Keep until tomorrow**

### Delete confirmation

> **Delete this consultation?**
>
> Access to the photos, previews, plan, and share links will stop immediately. Permanent deletion from active systems normally completes within 15 minutes and must complete within 24 hours. Downloaded or screenshot copies cannot be recalled.

Actions: destructive **Delete consultation** / **Keep consultation**

After acceptance:

> **Deletion started**
>
> Access has been removed. We are verifying deletion across storage, jobs, and shares. Keep this deletion code if you want to check status: **[deletion code]**.

After verification:

> **Deleted**
>
> Deletion from active systems was verified at **[date/time]**. Isolated backups expire within 35 days and cannot be served without reapplying this deletion.

On a retryable delay:

> **Access is removed; deletion is still finishing**
>
> One of our systems is temporarily unavailable. Your consultation remains inaccessible while we retry. We have alerted support. Check again with deletion code **[deletion code]** or contact **[privacy contact]**.

The UI must never tell the client “Deleted” merely because the row was hidden or a job was queued.

## Adult-only policy

- The production pilot accepts only a client who self-attests that they are at least 18 and is the sole subject of the source portrait.
- Do not infer age from a face, request government ID, store date of birth, or create an age score. This gate is an explicit attestation plus the salon operator's duty not to proceed when they know or reasonably believe the subject is a minor.
- If the client does not attest, says they are under 18, the stylist identifies them as under 18, or staff cannot resolve credible doubt, stop before upload and clear the local media. There is no staff override.
- Reject a source photo with more than one visible person. If another person or a child is visible in the background, instruct the user to retake or crop locally before consent/upload.
- General model moderation does not prove adulthood and is not the age gate.
- Do not retain a “suspected minor” image or create an internal age label. Record only a non-content rejection category when the server must reject an already submitted request, then invoke deletion.
- Adding minors is a new product/policy decision requiring guardian-consent design, age assurance, child-safety and legal review, provider controls, updated notices, and a separately approved release gate.

## Reference-image and inspiration rules

1. MVP input is a direct user upload; hAIr does not fetch an image URL, scrape a search engine, or offer a celebrity/character catalog.
2. The user must attest that visible people are adults and that they own, are licensed to use, have permission to provide, or otherwise have a lawful right to use the reference for this private consultation. If unsure, they should use text attributes instead.
3. Disallow a reference containing a minor, intimate/private setting, harassment, humiliation, violence, identity document, or an apparent non-consensual context. Delete a rejected upload under the same cascade.
4. A real-person, public-figure, or character name is shorthand for hair attributes. Convert it to length, shape, layers, fringe, part, texture, volume, color, highlight placement, finish, and maintenance cues; display the summary for confirmation; discard the name after confirmation.
5. Provider instructions must say the reference is for hair attributes only; preserve the client's face, age appearance, skin tone, body, clothing, pose, background, and identity. Never ask for impersonation or face transfer.
6. Crop or mask unnecessary reference face/background content before provider transfer when benchmark evidence shows it does not harm hair fidelity. The unmodified reference still follows the 24-hour hard maximum.
7. Do not publish the reference, use it as a search key, compare identities, add it to a catalog, or reuse it for another consultation or benchmark.

## Consent receipt schema

```json
{
  "receipt_id": "opaque_uuid",
  "tenant_id": "opaque_uuid",
  "consultation_id": "opaque_uuid",
  "purpose": "hair_visualization_consultation_v1",
  "consent_version": "semver_or_content_hash",
  "disclosure_version": "semver_or_content_hash",
  "accepted_at": "UTC timestamp",
  "acknowledgement_method": "client_device_tap | assisted_client_directed_tap",
  "adult_self_attested": true,
  "reference_attested": true
}
```

`reference_attested` is absent when no reference is supplied. Saving has a separate receipt/event with consultation ID, choice, timestamp, computed expiry, and disclosure version. The server computes the deadline; the client cannot choose an arbitrary duration.

## Product and QA acceptance checks

- A network-level browser test proves capture/selection, notice expansion, decline, and retake send zero media bytes before acceptance.
- The API rejects missing, expired, wrong-tenant, wrong-purpose, or outdated consent receipts.
- All checkboxes begin unchecked and the primary action has a useful accessible name, focus order, error message, and large touch target.
- Decline and every adult/reference rejection clear local object URLs and any pre-authorized upload.
- Consent and save copy render with the real salon/provider/contact tokens in restricted staging; unresolved tokens fail deployment.
- Public-figure text is converted to neutral hair attributes, displayed, confirmed, and discarded; provider payload and logs contain no reference identity request.
- Every preview route and exported artifact carries the required AI/variability label.
- Save, share, download, and delete are separate choices with the copy above.
- Deletion states reflect verification truth from [`DELETION-CONTRACT.md`](DELETION-CONTRACT.md).

The provider disclosure must be rechecked against current primary documentation and the signed contract before launch. For example, OpenAI's endpoint-level data controls distinguish default abuse-monitoring retention, approved Zero Data Retention, and flagged-image safety review: [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data). The official GDPR text supplies a baseline for transparent, specific, and demonstrable consent and for withdrawal/erasure analysis, but regional review must determine what legal basis and wording apply in each launch market: [Regulation (EU) 2016/679, Articles 4, 7, 13, and 17](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
