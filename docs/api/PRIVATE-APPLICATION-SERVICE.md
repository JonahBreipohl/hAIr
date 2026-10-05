# Private application-service contract

**Status:** MVP-001 contract baseline  
**Scope:** server-side consultation service; no live storage, queue, provider, or HTTP implementation  
**Source types:** `packages/domain/src/application-service.ts`

This contract is the boundary between authenticated transport adapters and the
domain. HTTP handlers, object storage, queues, image providers, and persistence
must call this service rather than implement authorization or retention rules
independently.

## Invariants

1. All identifiers are random server-issued opaque handles validated by
   `parseOpaqueId`. They contain no names, filenames, contact details, paths, or
   tenant-readable sequence.
2. A portrait or reference is represented in the domain by `OpaqueAsset`.
   Storage keys, bytes, signed URLs, filenames, and image hashes are outside this
   contract and must not appear in logs or receipts.
3. Only a verified consultation-control capability acting as the client
   authority can acknowledge consent or choose 30-day retention. Consent uses
   the currently configured policy, retention-notice, and provider-disclosure
   versions plus a `client_explicit_tap`; assigned salon staff cannot
   acknowledge for the client. The service accepts an asset only after that
   receipt is attached to an accessible consultation. A reference additionally
   requires reference rights and the reference-processing scope.
4. The service checks authorization and authoritative expiry/tombstone state on
   every call. An earlier authorization decision is never cached as permission
   for a later write, callback, retry, media grant, or share resolution.
5. Cross-tenant, unknown, removed-member, expired-capability, and revoked-
   capability failures return the same `not_found_or_unauthorized` result. They
   do not disclose whether a foreign resource exists.
6. Every mutation is idempotent. The stored fingerprint is a digest of a
   canonical command, never its raw body.
7. One injected `Clock` and one `RetentionPolicy` produce all access, purge,
   share, media-grant, deletion, receipt, and backup deadlines. Service code must
   not call a platform clock directly.
8. Receipt, audit, metric, and idempotency records are content-free. They may
   contain opaque IDs, enums, versions, times, counts, and safe error codes only.

## Records

| Record | Required content | Explicit exclusions |
|---|---|---|
| `ConsentReceipt` | tenant, consultation, session, current policy/disclosure versions, UTC time, `client_explicit_tap`, adult confirmation, scopes, reference-rights confirmation | portrait, client identity, signature image, prompt, filename |
| `SaveReceipt` | opaque receipt, tenant and consultation handles, current save-disclosure version, explicit 30-day choice, UTC acknowledgement, server-computed access expiry, `client_explicit_tap` | portrait, client identity, notes, prompt, filename |
| `OpaqueAsset` | tenant, consultation, receipt, class, state, opaque parents, retention schedule | bytes, object key, URL, filename, image hash |
| `ConsultationRecord` | tenant, creator, state, consent/save receipt handles, selected variant, feasibility, private service/maintenance notes, agreement time, retention schedule, deletion handle, version | client name, contact data, portrait, or raw generation prompt |
| `Variant` | consultation, index, structured spec, prompt version, attempt, state, output handle, safe failure code, inherited deadline | provider response text, raw prompt, output bytes |
| `PrivateShare` | consultation, one agreed variant ID, capability handle, state, creation/expiry/revocation times | raw share token, source/reference handles, consultation content |
| `SharedConsultationBrief` | selected ready variant ID, generated-output handle and hair specification; agreed feasibility and service/maintenance notes; share expiry and fixed AI-visualization disclosure | tenant/member data, client identity, source/reference handles, capability, provider/job fields, unrelated variants, mutation controls |
| `DeletionReceipt` | request/generation, tenant, consultation, reason category, initiator role, component results, policy deadlines | object locators, URLs, prompts, notes, provider error text, client identity |

`CapabilityId` is a non-secret handle for a separately verified one-way token
record. Raw control, share, media, and deletion-status secrets are transport
credentials and never enter the domain record or routine telemetry.

## Actor and tenant authorization

The authentication adapter converts a verified credential to one `Actor`:

- `tenant_member`: active stylist or salon administrator bound to one tenant;
- `consultation_control`: scoped client-control capability for one consultation;
- `private_share`: read-only capability for one share and consultation;
- `deletion_status`: deletion-progress-only capability for one request;
- `privacy_operator`: staff actor bound to a verified privacy-request handle, its target consultation, and the target deletion request for status access; or
- `service`: generation, retention, or deletion worker identity.

Every service operation has an explicit rule. “Same tenant” is always required
even when it is not repeated in a cell. Creating a consultation is tenant
scoped; every later salon-member operation also requires an explicit assignment
to that consultation. Administrator role alone grants no portrait access.

| Operation | Kind | Authorized caller and preconditions | Idempotency and terminal behavior |
|---|---|---|---|
| `consultation.create` | command | Active stylist/admin in target tenant | Replay returns the original consultation; changed fingerprint conflicts |
| `consent.record` | command | Matching live consultation-control capability acting as client authority; current contract versions and explicit client tap required | Receipt is immutable; replay returns the same receipt; salon staff are denied |
| `asset.accept` | command | Explicitly assigned active stylist/admin or live control capability; attached consent covers asset class | Same handle/request replays; inaccessible consultation rejects before storage commit |
| `consultation.read` | query | Explicitly assigned active stylist/admin or live control capability | Expired, deleted, or purging consultation is non-disclosing denial |
| `consultation.update` | command | Explicitly assigned active stylist/admin or live control capability | A changed hair brief invalidates an agreement, revokes its shares, and cannot reuse a stale variant |
| `generation.request` | command | Explicitly assigned active stylist/admin or live control capability; consent, recorded inputs, and deadlines valid | Logical request is unique; replay cannot enqueue or charge twice |
| `generation.cancel` | command | Explicitly assigned active stylist/admin or live control capability; consultation still accessible | Cancels unfinished variants, preserves completed results, and removes the entire transient source package, including failed-source retry authorization; late callbacks cannot restore it |
| `variant.publish` | command | Generation worker; current attempt and final tombstone check | Duplicate outcome replays; stale or terminal callback is ignored and bytes are discarded |
| `variant.retry` | command | Explicitly assigned active stylist/admin or live control capability; retryable failure and time remain | New attempt ID; repeated command returns that attempt and cannot enqueue twice |
| `consultation.agree` | command | Explicitly assigned active stylist/admin records the selected ready variant, feasibility, required service direction, and optional maintenance notes | Repeated identical agreement replays; replacing a decision revokes its existing shares |
| `consultation.save` | command | Matching live consultation-control capability after professional agreement; current save disclosure, explicit 30-day choice, and explicit client tap required | First save stores and links a content-free receipt and fixes the saved schedule; replay returns that receipt without extending retention; salon staff are denied |
| `share.create` | command | Explicitly assigned active stylist/admin after agreement; the requested ready variant is the agreed service direction | Returns one share/capability handle; replay does not mint another grant |
| `share.resolve` | query | Matching live, unrevoked private-share capability; share still matches the consultation's current agreement and a ready, accessible generated result | Returns one bounded `SharedConsultationBrief`; never returns the `PrivateShare` record, source/reference handles, identity, unrelated variants, provider/job fields, or mutation access |
| `share.revoke` | command | Explicitly assigned active stylist/admin or live consultation-control capability | Already revoked is successful replay; cannot reactivate |
| `media.authorize` | query | Authorized consultation reader; share is restricted to selected result assets | Grant expires in at most five minutes and never after resource access expiry |
| `deletion.request` | command | Explicitly assigned active stylist/admin, live control capability, or verified privacy operator bound to this consultation | One request per `(tenant, consultation, deletion generation)`; all keys return stable status |
| `deletion.status.read` | query | Explicitly assigned salon authority, matching live status capability, or verified privacy operator bound to this consultation and deletion request | Returns content-free progress only; verified receipt remains terminal |
| `retention.expire` | command | Retention worker | Calls the same deletion path; redelivery finds the stable request |
| `deletion.component.update` | command | Deletion worker | Component updates are monotonic; terminal receipt cannot reopen |

`operationAuthorizationRequirements` is an exhaustive TypeScript record keyed by
these names. `authorizeOperation` implements the generic denial, tenant match,
capability match, expiry, revocation, inaccessible-state, and service-role
checks. Adapters may add stronger checks, but may not weaken these rules.

## Command and query boundary

`PrivateApplicationService` exposes two methods:

```ts
execute(command: ApplicationCommand): Promise<ServiceResponse<CommandResult>>
query(query: ApplicationQuery): Promise<ServiceResponse<QueryResult>>
```

Each command carries an authenticated actor, opaque request ID, opaque
idempotency key, and canonical request fingerprint. Each query carries an actor
and request ID. The tagged unions cover every operation in the authorization
table; adding an operation without adding its command/query type fails the
compile-time coverage assertion.

The service returns stable machine codes only:

```text
not_found_or_unauthorized | invalid_state | invalid_request |
idempotency_conflict | retention_expired | temporarily_unavailable
```

Human-readable copy belongs in the UI. Provider/storage error bodies do not
cross this boundary.

## Idempotency

The unique lookup scope is `(tenant_id, operation, idempotency_key)`.

```text
no record                 -> execute once
same fingerprint, running -> wait for/retrieve the existing operation
same fingerprint, done    -> replay the stable result reference
different fingerprint     -> idempotency_conflict; never execute
```

Persist an in-progress record and a transactional outbox event in the same
transaction as the authoritative state change. Keep the entry at least until
the resource can no longer be retried or charged. Deletion has an additional
uniqueness constraint on `(tenant_id, consultation_id, deletion_generation)` so
a new client key cannot create a second deletion or reset its deadline.

Generation attempts have new opaque attempt IDs. A callback must match the
current attempt. Queue redelivery and provider callback replay use the command
idempotency contract. A retry creates a new attempt under the existing logical
variant; it does not overwrite a ready result or accept a late prior response.

Whole-generation cancellation marks queued/running variants `canceled`, clears
provider work, and ends access to sources, references, normalized images, and
masks immediately. Ready siblings remain available under their existing expiry;
failed sibling metadata remains for accounting but its source cannot be retried
after cancellation. A new generation requires a newly accepted source. Cancel
responses are content-bearing and are removed with consultation deletion, just
like cached generation or variant responses. The simulator proves metadata
cleanup; the closed offline worker separately accounts for its owned buffers and
unresolved provider/decoder continuations.

Before content deletion is verified, cached idempotency responses tied to the
consultation are purged as well. Only the new content-free deletion response may
remain replayable; a cached `Variant` or agreed plan cannot survive the purge.

## State and terminal behavior

### Consultation

```text
draft -> consented -> ready -> generating -> reviewing -> agreed
  \         \          \          \            \          \
   +---------+----------+----------+------------+-----------> deleted | expired
```

`expired` and `deleted` are inaccessible. Expiry enters the deletion workflow;
it never extends a deadline. A consultation with a deletion request is
inaccessible even before physical purge completes.

Changing the hair specification after review or agreement returns the
consultation to `ready`, clears the agreed plan, revokes existing shares, and
prevents an older variant from being agreed against the revised brief.

### Variant

```text
queued -> running -> ready
                  -> failed
                  -> policy_rejected
queued|running -> canceled|expired|deleted
ready|failed|policy_rejected -> expired|deleted
```

`ready`, `failed`, `policy_rejected`, `canceled`, `expired`, and `deleted` are
terminal for the current provider callback. An identical callback is a
duplicate. A different, stale, or late callback is ignored. `failed` may create
a new attempt through `variant.retry`; the completed attempt itself never
reopens. `expired` and `deleted` never become accessible again.

### Share

```text
active -> revoked | expired
```

Revocation and expiry are terminal. A share never authorizes a mutation,
original/reference access, a wider set of variants, or deletion. Resolution
re-checks the current agreement, selected ready variant, generated output, and
their deadlines before assembling the read-only brief. A stale share fails with
the same generic denial as an unknown, revoked, expired, or deleted share.

### Deletion

```text
deletion_requested -> purging -> verified
                   -> purge_delayed -> purging|verified
                   -> provider_exception
```

`verified` and `provider_exception` are terminal receipt states. Every state is
inaccessible to product reads. `purge_delayed` can move only toward completion;
it cannot restore content. “Already absent” verifies a component. Timeout,
permission denial, or an ambiguous response is retryable and never counts as
verified.

## Clock and retention contract

All values below come from `defaultRetentionPolicy`. A reviewed decision and
updated disclosure are required to lengthen them.

| Scope | Clock basis | Access/purge behavior | Outer deadline |
|---|---|---|---|
| Unsaved consultation and generated content | Consultation creation | Access ends at purge start, currently 15 minutes before outer deadline | 24 hours |
| Explicitly saved consultation | First save | First save computes schedule once; replay cannot extend it | 30 days from save |
| Source/reference/transient derivative | Asset acceptance | Purged with grants and generation bindings after the final non-retryable generation settles; retained only for a retryable failure and never extended when a result is saved | 24 hours from acceptance at most |
| Generated result in a saved consultation | First save | Result and variant deadlines move once to the saved-consultation schedule; source/reference deadlines do not move | 30 days from save |
| Private share | Share creation | Expires at the earliest of its limit or consultation access expiry | 24 hours at most |
| Media authorization | Grant issue | Private, no-store, exact asset/purpose scope | 5 minutes at most |
| User/expiry deletion | Deletion request | Access revoked at the exact request time | Verified purge within 24 hours |
| Deletion-status capability | Deletion request | Progress only | 30 days |
| Consent/save/deletion receipts | Acknowledgement or deletion policy basis | Content-free and access restricted | Provisional 24 months |
| Backup suppression horizon | Deletion request | Never product-accessible; tombstone replay before restore traffic | 35 days at most |

`deriveConsultationRetention`, `deriveAssetRetention`, `deriveShareExpiry`,
`deriveMediaGrantExpiry`, and `deriveDeletionSchedule` all accept the same
injected `Clock` and `RetentionPolicy`. Tests use a fixed clock. Production uses
a UTC system clock adapter. Database comparisons remain authoritative if a
worker or browser clock differs.

The simulator exposes a content-free `sweepExpiredAssets()` entrypoint for the
retention scheduler and also runs the sweep at every service entry. A quiet
consultation therefore has an explicit background cleanup path; user traffic is
not the only trigger for the hard deletion deadline.

## Persistence and adapter requirements

- Store tenant ID on every consultation, consent/save/deletion receipt, asset, variant, share,
  idempotency row, outbox event, and deletion row. Repository methods require a
  tenant scope and consultation assignment rather than accepting either as an
  optional filter.
- Verify a capability digest before constructing a capability actor. Never log
  or persist a raw capability after initial delivery.
- Commit the deletion tombstone, access revocation, stable receipt, and outbox
  command before acknowledging deletion.
- Check the tombstone immediately before every storage commit and result
  publish. Late bytes are destroyed without decoding for display.
- A media adapter may translate `MediaAuthorization` to a short-lived signed
  response. The domain response itself contains no URL or storage locator.
- Log only request ID, opaque actor/resource IDs, operation, decision, safe code,
  duration, and policy version. Do not log the command body.

## Contract evidence

`packages/domain/src/service-contract.test.ts` verifies opaque-handle validation,
client-authority-only consent/save acknowledgement, current contract versions,
content-free save receipts, consent-gated assets, inherited deadlines,
operation coverage, cross-tenant and
removed-member denial, privacy-request target binding, agreed-plan share scope,
idempotent replay/conflict, stale and duplicate callbacks, monotonic deletion,
content-free receipts, and share deadline capping using synthetic opaque IDs
only. `tests/integration/service-simulator.test.ts` executes the same boundaries
against the in-memory service, including deletion of cached content responses
and idempotent saved-result versus source retention without deadline extension.

