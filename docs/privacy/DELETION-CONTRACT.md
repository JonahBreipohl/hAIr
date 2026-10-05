# Deletion and retention enforcement contract

**Status:** normative behavior for application, jobs, providers, shares, telemetry linkage, and backups  
**Principle:** deletion is a durable, monotonic workflow with component-level verification; hiding a record or enqueueing a cleanup job is not deletion

This contract implements the lifecycles in [`DATA-MAP.md`](DATA-MAP.md). The same mechanism handles a client's **Delete consultation** action, consent withdrawal, salon/admin deletion, automatic expiry, account closure, and privacy-request fulfillment.

## User promise and service objectives

When an authorized user requests deletion:

1. **Access ends immediately.** In the same committed control-plane operation, the consultation becomes unavailable, new signed URLs stop, share/control tokens are revoked, and new/retry generation is forbidden. Target and p99: within 5 seconds of a successful request.
2. **Active-system purge is verified.** Primary database content, object storage, derivatives, caches, queue work, and any deletable provider state are normally purged within 15 minutes. The hard maximum is 24 hours.
3. **Failure is visible and retried.** A component outage never restores access. The deletion remains pending/delayed, retries automatically, and pages an operator before the 24-hour deadline.
4. **Backups age out.** Encrypted, isolated backups may contain an inaccessible copy for at most 35 days. A restore cannot serve traffic until deletion tombstones newer than that backup have been replayed and verified.
5. **Minimal accountability remains.** The consent receipt and deletion/verification receipt may remain for 24 months, without photos, hairstyle text, client name, original object key, or reusable access token, subject to launch-region review and any valid erasure requirement.

The UI says **Deletion started — access has been removed** after step 1. It says **Deleted** only after active-system verification completes. Provider safety/legal retention exceptions and user-controlled downloads are disclosed separately; hAIr does not claim to recall them.

## Retention deadlines

The server, never the browser, computes and stores `delete_due_at`. A salon may select a shorter value, but cannot lengthen these defaults without a reviewed decision and updated disclosure.

| Scope | Start of clock | Access deadline | Active-system purge deadline |
|---|---|---|---|
| Source portrait, inspiration image, mask/crop/temp derivative | Upload accepted | As soon as the last live generation/validation finishes; immediately on delete/cancel | Target 15 minutes after no longer needed; never later than 24 hours after upload |
| Failed/retryable source package | Upload accepted | On user delete/cancel, or at 24 hours | No later than 24 hours after upload |
| Unsaved consultation, generated previews, look spec, plan | Consultation created | No later than 24 hours after consultation creation | No later than 24 hours after consultation creation; a later-created preview inherits this existing deadline |
| Explicitly saved previews and service plan | Save action | No later than 30 days, or shorter salon setting | No later than 30 days from save |
| Share | Share creation | 24 hours, revoke request, or consultation deadline—whichever is earliest | Token revoked immediately; record/object removed with consultation or within 24 hours |
| Capture QR | Token creation | 15 minutes or first successful use | Revoke/delete immediately on expiry/use |
| Detailed logs/traces | Event | 30 days | Vendor/system TTL, checked daily |
| Security audit | Event | 90 days | Scheduled expiry |
| Pseudonymous telemetry/feedback | Event | 90 days | Link removed on consultation deletion; row expires by 90 days |
| Consent and deletion receipts | Consultation deletion/expiry or verified deletion | 24 months, provisional | Scheduled erasure/detachment at deadline |
| Backup | Backup creation | Never available through product | Age out within 35 days |

`delete_due_at` is the outer destruction deadline. The server also computes an earlier `purge_start_at` from the observed purge SLO so retries can finish before that outer limit; therefore an unsaved consultation may become unavailable shortly before 24 hours and a saved one shortly before 30 days. The UI displays the actual access-expiry time and describes retention as “up to” the outer limit. Authorization denies access as soon as purge starts or, at the latest, at `delete_due_at`. A user-triggered deletion uses the request time and its stricter immediate-access/24-hour purge promises.

## State model and invariants

```text
active | expired
      -> deletion_requested
      -> purging
      -> verified
           ^
           |
      purge_delayed  --retry-->
```

`expired` is an authorization condition computed at the exact deadline and then enters the same deletion workflow. `verified` is terminal. `purge_delayed` is inaccessible and may transition only toward `verified`; it never returns to `active`.

Mandatory invariants:

- `deletion_requested_at` and the tombstone are committed before the API acknowledges the request.
- The state ordering is monotonic under concurrent requests, queue redelivery, restore, and late callback.
- Every read, signed-URL issue, share resolve, job claim, retry, callback, and result publish checks deletion/expiry authoritatively.
- No job starts or retries at/after the source content deadline.
- A late provider response for a tombstoned consultation is not decoded/persisted for display; any received bytes are destroyed and a purge attempt is recorded.
- Repeated delete calls reuse one logical deletion and cannot reset attempt counters, deadlines, or audit evidence.
- Partial deletion is never represented as success.

## Request and authorization semantics

The implementation may choose route names, but must preserve these semantics:

```http
DELETE /consultations/{consultation_id}
Idempotency-Key: <opaque client request key>
```

Authorized callers are:

- a stylist or salon admin whose active membership grants delete for the owning tenant;
- the client holding a separate consultation-control capability (never an ordinary view-share token); or
- a verified privacy operator acting from a recorded request with least privilege.

The API transaction:

1. resolves the object within the caller's tenant/capability scope without revealing foreign existence;
2. creates or finds a stable `deletion_request_id` for the consultation and deletion generation;
3. writes the monotonic tombstone, request time, reason category, initiator role, policy version, and hard deadline;
4. revokes control/share sessions and marks every job/result inaccessible;
5. emits a transactional-outbox deletion command; and
6. returns `202 Accepted` with the same status resource for an initial or repeated valid request.

Unauthorized and out-of-scope requests return a generic not-found/unauthorized response that does not reveal whether a foreign consultation exists. An already verified consultation returns the stable receipt/status where the caller still has the deletion code, without reconstructing the deleted record.

Conceptual response:

```json
{
  "deletion_request_id": "opaque_uuid",
  "status": "deletion_requested",
  "access_revoked_at": "UTC timestamp",
  "target_complete_by": "UTC timestamp",
  "status_token": "one-time-or-scoped-secret"
}
```

The status token is one-way stored, shows only deletion progress/timestamps, expires after 30 days, and cannot view consultation content or initiate any other action.

## Purge manifest

At deletion request time, the service snapshots a content-free purge manifest of component classes and opaque internal locators. Locators are encrypted and removed from the long-lived receipt after verification; the receipt retains component name, attempt count, result, and verification time.

The worker must process all applicable components even if one fails:

| Order | Component | Required action | Verification |
|---:|---|---|---|
| 1 | Authorization/control plane | Deny consultation reads/writes; revoke guest control/capture and share-token digests; stop signed-URL minting | Read/share/control requests fail; tombstone query is authoritative |
| 2 | Jobs and queue | Mark variants canceled; remove scheduled/retry messages where supported; make remaining deliveries no-op; stop provider retry | Queue inspection plus job-state query; duplicate delivery returns tombstone outcome |
| 3 | CDN/cache/media grants | Purge any edge key; invalidate application media authorization; let <=5-minute storage grants expire | Purge receipt and authenticated/direct fetch failure after grant expiry |
| 4 | Primary object storage | Delete source, reference, normalized image, mask, crop, thumbnail, generated result, share render, failed upload, and multipart residue listed in object manifest | Exact object `HEAD`/metadata lookup returns absent; prefix/manifest reconciliation has zero live object/version |
| 5 | Provider | Cancel when supported; delete provider object/state ID when one exists; otherwise record contract/endpoint evidence of stateless/no-application-state processing; discard late response | Provider deletion receipt/status or approved endpoint-control evidence; no hAIr retry/reference remains |
| 6 | Primary database content | Erase look spec, raw text, service notes, feedback link, result/object records, provider refs, and content-bearing validation fields; replace consultation with minimal tombstone/receipt | Transactional query asserts forbidden fields/child rows absent and no foreign-key survivor |
| 7 | Search/index/analytics linkage | Remove any index entry and consultation-level analytics/feedback key; retain only permitted aggregate | Queries by consultation ID return zero outside deletion/consent receipts |
| 8 | Temp/worker storage | Purge per-job directories/buffers where controllable; orphan sweep checks crashed-worker volume | Temp inventory/orphan scan; worker termination cleanup result |
| 9 | Backup suppression | Append tombstone to restore ledger independent of affected backup | Ledger durability/quorum check; next restore rehearsal confirms replay |

Database erasure must not remove the tombstone required to defeat a concurrent or late write. Use a separate deletion ledger keyed by a non-reversible internal deletion identity or preserve a minimal tombstoned consultation row until every possible source and backup has aged out. It must contain no client-facing content.

## Idempotency and concurrency

- Uniqueness: one active deletion request per `(tenant_id, consultation_id, deletion_generation)`.
- The initial transaction and transactional outbox prevent “hidden but no cleanup job” and “cleanup job but still accessible” splits.
- Workers acquire component leases and use compare-and-set state; a crashed lease can be reclaimed safely.
- Every component delete treats “already absent” as success after verification. “Permission denied,” timeout, unavailable, or ambiguous response is retryable/failing, never success.
- New objects cannot be attached to a tombstoned consultation. Storage writes use a server authorization that checks the tombstone immediately before commit.
- Provider calls have a job/request correlation. On return, the worker checks tombstone and expiry before persisting. It deletes/discards content when the check fails.
- A restore carries the latest deletion ledger into the isolated environment first; application traffic and outbound jobs remain disabled until replay and verification finish.

## Retry, escalation, and failure handling

Component attempts are independent. A failure in provider cancellation must not postpone storage/database/share revocation.

Recommended retry schedule from first failure: about 1 minute, 5 minutes, 15 minutes, 1 hour, 6 hours, 12 hours, and a final attempt before 24 hours, with bounded jitter. A success is rechecked once by the verifier rather than repeatedly deleting. Provider/storage rate limits honor their retry guidance only inside the hard deadline.

Alerts:

- immediate high-severity alert for authorization/share revocation failure, a late result becoming accessible, cross-tenant symptom, or any resurrection;
- warning at 15 minutes for any active component outstanding;
- page the privacy/on-call owner no later than 6 hours;
- critical incident at 20 hours with manual vendor escalation and generation/share kill-switch readiness;
- breach of the 24-hour hard maximum is a privacy incident requiring root cause, affected-scope query, client/controller communication assessment, and durable corrective action.

If verification cannot complete:

- keep the consultation inaccessible and the tombstone durable;
- show **Access is removed; deletion is still finishing**, never “Deleted”;
- retain a content-free error class and component status in the receipt;
- prohibit support from restoring content, re-running generation, extending TTL, or closing the request merely to clear an alert; and
- retry until verified or a documented legal/provider exception takes ownership of the remaining copy.

## Provider requirements and exceptions

The selected provider must supply endpoint/model-specific evidence for content use, default retention, contracted Zero Data Retention or equivalent, application state, deletion, region, and safety/legal exceptions. A generic enterprise or “API data is not trained on” statement is insufficient.

Preferred deployment is a stateless image-edit request under approved no-training and Zero Data Retention/equivalent controls, so hAIr does not need to address a persistent provider object. If the provider creates a file, conversation, batch, or other stored object, the adapter must register its ID in the purge manifest, configure the shortest expiry, and expose a verifiable delete operation. A route with indefinite or unbounded content retention is ineligible for client portraits.

Some providers may retain an image flagged for suspected child sexual abuse or other legally required safety review even under a no-retention setting. The consent disclosure must name this possibility. The deletion receipt records **provider safety/legal exception** without storing the content or sensitive classifier detail. Privacy/security owns follow-up under the provider contract; application access remains revoked. Current OpenAI endpoint documentation illustrates why this must be verified per route and model: [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data).

## Backups, legal restrictions, and user-held copies

- Consultation-media object versioning is disabled for the pilot unless every version is isolated and guaranteed to age out within 35 days.
- Backups cannot be queried for routine product/support use and are never restored in place. Restore occurs in an isolated environment with outbound jobs and user traffic disabled.
- The deletion ledger is stored or replicated so that it is at least as durable and current as the newest restorable backup. Replay, cascade, verify, then rotate sessions/share tokens before traffic.
- If law requires preservation of a specific record, privacy/legal must document the authority, exact scope, start/end, access restriction, and whether notice is prohibited. Do not silently convert a failed deletion into a “legal hold.” Preserve the minimum and delete the remainder.
- hAIr cannot erase a recipient's download, screenshot, device backup, or onward share. The UI warns before share/download and renders a durable AI label into the exported artifact.

## Automatic expiry and orphan reconciliation

A retention scheduler runs at least every five minutes and also uses a durable due-work mechanism. It claims consultations at `purge_start_at` using a lease and invokes the same idempotent deletion command as the user path. `purge_start_at` includes operational margin before `delete_due_at`; scheduler delay never authorizes access past the deadline or changes the outer 24-hour/30-day destruction limit. A storage lifecycle rule set to the outer deadline provides defense in depth but does not replace application verification.

At least hourly, an orphan reconciler compares:

- live content rows to object manifests;
- object manifests to object storage, versions, and incomplete multipart uploads;
- active jobs to consultation tombstones/deadlines;
- live shares to consultation/result existence and expiry; and
- deletion receipts to component verification status.

Unknown consultation media is quarantined from access immediately, then deleted unless a live owning record is proven. The reconciler emits counts and age only, never object keys containing customer data. Any orphan older than two hours is an alert; any content beyond its 24-hour/30-day applicable deadline is a release/incident failure.

## Verification receipt

The verifier writes a content-free record like:

```json
{
  "deletion_request_id": "opaque_uuid",
  "tenant_id": "opaque_uuid",
  "policy_version": "deletion-v1",
  "reason": "user_request | consent_withdrawal | expiry | account_closure | privacy_request",
  "requested_at": "UTC timestamp",
  "access_revoked_at": "UTC timestamp",
  "verified_at": "UTC timestamp or null",
  "status": "purging | purge_delayed | verified | provider_exception",
  "components": [
    {"name": "shares", "attempts": 1, "status": "verified_absent", "verified_at": "UTC timestamp"},
    {"name": "objects", "attempts": 1, "status": "verified_absent", "verified_at": "UTC timestamp"}
  ],
  "backup_ages_out_by": "UTC timestamp"
}
```

Do not store object keys, URLs, image hashes, raw provider errors, prompts, notes, or client identity in the long-lived receipt. A short-lived encrypted locator used during purge is removed after verification.

## Required automated and operational tests

### Component and integration

- Initial and repeated delete with the same/different idempotency key return one logical request and do not reset its deadline.
- Already-absent objects count as verified; timeout/403/ambiguous storage or provider responses do not.
- All image classes, derivatives, failed uploads, multipart parts, records, shares, and indexes are included.
- Wrong-tenant stylist, ordinary share bearer, expired guest token, and removed member cannot delete or read status.
- Delete while queued, running, retrying, partially succeeded, writing output, and receiving a late callback never creates an accessible result or further provider charge.
- A share opened before deletion cannot refresh or fetch media afterward; old signed URLs fail no later than their five-minute limit.
- The UI reports requested/delayed/verified accurately and remains usable if a component is down.
- Consent/deletion receipt remains content-free and expires on policy.

### Fault and recovery

- Inject DB, queue, storage, cache, telemetry-index, and provider failures independently; accessible content is revoked and successful components finish while the failed component retries.
- Kill the purge worker after every step; a new worker resumes without reviving or skipping a component.
- Pause the scheduler past `purge_start_at`; access fails by the deadline, the fault alerts before the hard limit, and catch-up purge completes without extending retention.
- Seed an orphan thumbnail, object version, failed multipart upload, and stale share; reconciliation finds and removes each.
- Restore a backup containing a subsequently deleted consultation; tombstone replay removes it before any user/network traffic.
- Verify vendor-configured TTLs and compare a sample of receipts with direct component queries.

### Release evidence

Pilot release requires:

- 100% pass for immediate access revocation, cross-tenant denial, user delete cascade, automatic expiry, share revoke, late callback, and restore tests;
- no deletion older than 24 hours in a controlled fault run;
- an inspected provider data-control record and deletion/exception behavior;
- an hourly orphan/deletion dashboard containing no customer content;
- named alert ownership and a completed delayed-deletion exercise; and
- independent privacy/security review of the implementation against this contract.

This contract uses the official GDPR storage-limitation and erasure provisions as a conservative design baseline; exact legal exceptions and receipt retention require launch-region review: [Regulation (EU) 2016/679, Articles 5 and 17](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
