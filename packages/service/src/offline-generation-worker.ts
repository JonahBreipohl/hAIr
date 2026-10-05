import { createHash } from "node:crypto";
import { currentConsentContractVersions, defaultHairSpecification, parseOpaqueId, type Actor, type AssetId, type Clock, type CommandContext, type ConsultationRecord, type OpaqueId, type OpaqueIdKind, type Variant, } from "@hair/domain";
import { FakeHairstyleImageProvider, type FakeProviderScenario } from "@hair/ai";
import { InMemoryPrivateApplicationService } from "./in-memory-service";
import type { OpaqueIdFactory } from "./id-factory";
import { decodeOfflineSyntheticOutput, type DecodedOfflineSyntheticOutput } from "./offline-output-decoder";
import { generateOfflineOutput, OFFLINE_OUTPUT_SCENARIOS, type OfflineOutputScenario } from "./offline-output-fixtures";
const prefixes = { actor: "act", asset: "ast", attempt: "atm", capability: "cap", consentReceipt: "csr", consultation: "con", deletionRequest: "del", fingerprint: "fpr", idempotency: "key", privacyRequest: "prq", request: "req", result: "res", saveReceipt: "svr", session: "ses", share: "shr", tenant: "ten", variant: "var" } as const;
class OfflineIds implements OpaqueIdFactory {
    private sequence = 0;
    public latestCapability = parseOpaqueId("capability", "cap_OFFLINE000000000000");
    next<K extends OpaqueIdKind>(kind: K): OpaqueId<K> {
        const id = parseOpaqueId(kind, `${prefixes[kind]}_OFFLINE${String(++this.sequence).padStart(16, "0")}`);
        if (kind === "capability")
            this.latestCapability = id as OpaqueId<"capability">;
        return id;
    }
}
class OfflineClock implements Clock {
    private instant = "2026-10-02T00:00:00.000Z";
    now(): Date { return new Date(this.instant); }
    expire(): void { this.instant = "2026-10-04T00:00:00.000Z"; }
}
type Phase = "queued" | "invoking" | "received" | "decoding" | "finishing_decode" | "decoded" | "publishing" | "settled";
type Failure = "provider_unavailable" | "provider_timeout" | "invalid_output";
type EventKind = "requested" | "denied" | "invoked" | "received" | "decode_started" | "decoded" | "failed" | "published" | "duplicate_ignored" | "late_ignored" | "canceled" | "deleted" | "expired" | "retried" | "cleanup_pending" | "purged";
interface Attempt {
    variant: Variant;
    phase: Phase;
    readonly outputId: AssetId;
    readonly scenario: OfflineOutputScenario;
    providerPromise?: Promise<boolean>;
    decodePromise?: Promise<DecodedOfflineSyntheticOutput | null>;
    decoded?: DecodedOfflineSyntheticOutput;
    promised?: {
        contentSha256: string;
        byteLength: number;
    };
    providerFailure?: Failure;
    drained?: boolean;
    receiving?: boolean;
    decodeDrained?: boolean;
    decodeFinishing?: boolean;
    canceled: boolean;
}
interface StoredBytes {
    readonly bytes: Uint8Array;
    readonly kind: "source" | "transient" | "output";
}
export interface OfflineWorkerEvent {
    readonly sequence: number;
    readonly kind: EventKind;
    readonly attemptId: OpaqueId<"attempt"> | null;
    readonly variantId: OpaqueId<"variant"> | null;
    readonly assetId: AssetId | null;
    readonly failureCode: Failure | null;
}
export interface OfflineWorkerReport {
    readonly version: "hair-offline-worker-v1";
    readonly scope: "closed_synthetic_worker";
    readonly evidence: "new_offline_execution_only";
    readonly liveAuthorization: "NOT_EVALUATED";
    readonly moderation: "NOT_EVALUATED";
    readonly subjectCount: "NOT_EVALUATED";
    readonly imageQuality: "NOT_EVALUATED";
    readonly releaseGate: "NOT_EVALUATED";
    readonly events: readonly OfflineWorkerEvent[];
    readonly outputs: readonly {
        assetId: AssetId;
        attemptId: OpaqueId<"attempt">;
        contentSha256: string;
        widthPx: number;
        heightPx: number;
        format: "png";
        byteLength: number;
        state: "available" | "purged";
    }[];
    readonly attempts: readonly {
        attemptId: OpaqueId<"attempt">;
        variantId: OpaqueId<"variant">;
        attemptNumber: number;
        phase: Phase;
        lastObservedState: Variant["state"];
    }[];
    readonly storage: {
        source: number;
        transient: number;
        output: number;
        pendingCleanup: number;
    };
    readonly cleanup: {
        pendingProvider: number;
        pendingDecode: number;
        verification: "pending" | "no_pending_offline_obligations";
    };
    readonly service: ReturnType<InMemoryPrivateApplicationService["snapshot"]>;
}
/** A closed, credential-free executable profile. No media, provider, clock, actor,
 * URL, prompt or caller-controlled identifier can enter this boundary. Each method
 * is a deterministic barrier, not a timing or historical-provenance attestation. */
export class OfflineGenerationWorker {
    private readonly ids = new OfflineIds();
    private readonly clock = new OfflineClock();
    private readonly service = new InMemoryPrivateApplicationService(this.clock, this.ids);
    private readonly tenant = this.ids.next("tenant");
    private readonly stylist: Actor = { kind: "tenant_member", actorId: this.ids.next("actor"), tenantId: this.tenant, role: "stylist", membership: "active" };
    private readonly generationActor: Actor = { kind: "service", actorId: this.ids.next("actor"), role: "generation_worker" };
    private readonly retentionActor: Actor = { kind: "service", actorId: this.ids.next("actor"), role: "retention_worker" };
    private consultation: ConsultationRecord | null = null;
    private client: Actor | null = null;
    private sourceId: AssetId | null = null;
    private readonly attempts: Attempt[] = [];
    private readonly store = new Map<AssetId, StoredBytes>();
    private readonly cleanup = new Set<AssetId>();
    private readonly events: OfflineWorkerEvent[] = [];
    private readonly outputs: Array<OfflineWorkerReport["outputs"][number]> = [];
    private failCleanupOnce = false;
    private deleted = false;
    private busy = false;
    private context(actor: Actor): CommandContext {
        return { actor, requestId: this.ids.next("request"), idempotencyKey: this.ids.next("idempotency"), fingerprint: this.ids.next("fingerprint") };
    }
    private event(kind: EventKind, attempt?: Attempt, assetId: AssetId | null = null, failureCode: Failure | null = null): void {
        this.events.push({ sequence: this.events.length + 1, kind, attemptId: attempt?.variant.attemptId ?? null, variantId: attempt?.variant.id ?? null, assetId, failureCode });
    }
    private get(index: number): Attempt {
        if (!Number.isInteger(index) || index < 0 || index >= this.attempts.length)
            throw new Error("Offline worker rejected.");
        return this.attempts[index]!;
    }
    private purge(id: AssetId): void {
        const item = this.store.get(id);
        if (item === undefined) {
            this.cleanup.delete(id);
            return;
        }
        if (this.failCleanupOnce) {
            this.failCleanupOnce = false;
            this.cleanup.add(id);
            this.event("cleanup_pending", undefined, id);
            return;
        }
        item.bytes.fill(0);
        this.store.delete(id);
        this.cleanup.delete(id);
        this.event("purged", undefined, id);
        const output = this.outputs.find(o => o.assetId === id);
        if (output)
            this.outputs[this.outputs.indexOf(output)] = { ...output, state: "purged" };
    }
    private async accessible(): Promise<boolean> {
        if (this.consultation === null || this.deleted)
            return false;
        return (await this.service.query({ operation: "consultation.read", context: { actor: this.stylist, requestId: this.ids.next("request") }, consultationId: this.consultation.id })).ok;
    }
    private async reconcile(): Promise<void> {
        for (const id of [...this.cleanup])
            this.purge(id);
        const alive = await this.accessible();
        for (const [id, item] of this.store) {
            if (!alive || (item.kind !== "transient" && !(await this.service.query({ operation: "media.authorize", context: { actor: this.stylist, requestId: this.ids.next("request") }, consultationId: this.consultation!.id, assetId: id })).ok))
                this.purge(id);
        }
    }
    private async active(a: Attempt): Promise<boolean> {
        if (a.canceled || a.phase === "settled" || !(await this.accessible()) || this.sourceId === null)
            return false;
        return (await this.service.query({ operation: "media.authorize", context: { actor: this.stylist, requestId: this.ids.next("request") }, consultationId: this.consultation!.id, assetId: this.sourceId })).ok;
    }
    public async open(consent: boolean = true): Promise<boolean> {
        if (typeof consent !== "boolean" || this.consultation !== null || this.busy)
            throw new Error("Offline worker rejected.");
        this.busy = true;
        try {
            const created = await this.service.execute({ operation: "consultation.create", context: this.context(this.stylist), tenantId: this.tenant });
            if (!created.ok)
                return false;
            this.consultation = created.value as ConsultationRecord;
            this.client = { kind: "consultation_control", tenantId: this.tenant, consultationId: this.consultation.id, capabilityId: this.ids.latestCapability, expiresAt: this.consultation.retention.accessExpiresAt, revokedAt: null };
            if (consent) {
                const recorded = await this.service.execute({ operation: "consent.record", context: this.context(this.client), consultationId: this.consultation.id, receiptId: this.ids.next("consentReceipt"), sessionId: this.ids.next("session"), policyVersion: currentConsentContractVersions.policy, retentionNoticeVersion: currentConsentContractVersions.retentionNotice, providerDisclosureVersion: currentConsentContractVersions.providerDisclosure, acknowledgementMethod: "client_explicit_tap", adultConfirmed: true, referenceRightsConfirmed: false, scopes: ["portrait_processing", "ai_hairstyle_generation"] });
                if (!recorded.ok)
                    return false;
            }
            this.sourceId = this.ids.next("asset");
            const accepted = await this.service.execute({ operation: "asset.accept", context: this.context(this.stylist), consultationId: this.consultation.id, assetId: this.sourceId, assetClass: "source_portrait", parentAssetIds: [] });
            if (!accepted.ok) {
                this.event("denied");
                return false;
            }
            const bytes = await generateOfflineOutput("valid");
            await decodeOfflineSyntheticOutput(bytes);
            this.store.set(this.sourceId, { bytes, kind: "source" });
            await this.reconcile();
            return true;
        }
        finally {
            this.busy = false;
        }
    }
    public async request(count: number = 3, binding: "bound" | "unknown_source" = "bound"): Promise<boolean> {
        if (!Number.isInteger(count) || count < 1 || count > 3 || !["bound", "unknown_source"].includes(binding) || this.busy)
            throw new Error("Offline worker rejected.");
        if (this.consultation === null || this.sourceId === null) {
            this.event("denied");
            return false;
        }
        this.busy = true;
        try {
            const response = await this.service.execute({ operation: "generation.request", context: this.context(this.stylist), consultationId: this.consultation.id, sourceAssetId: binding === "bound" ? this.sourceId : this.ids.next("asset"), referenceAssetId: null, specification: { ...defaultHairSpecification, silhouette: "synthetic layered shape", preserve: [...defaultHairSpecification.preserve] }, promptVersion: "hair-offline-v1", previewCount: count });
            if (!response.ok) {
                this.event("denied");
                return false;
            }
            for (const variant of response.value as readonly Variant[]) {
                const a: Attempt = { variant, phase: "queued", outputId: this.ids.next("asset"), scenario: "valid", canceled: false };
                this.attempts.push(a);
                this.event("requested", a);
            }
            await this.reconcile();
            return true;
        }
        finally {
            this.busy = false;
        }
    }
    public async invoke(index: number, scenario: OfflineOutputScenario = "valid", provider: "success" | "provider_error" | "timeout" = "success"): Promise<boolean> {
        if (!OFFLINE_OUTPUT_SCENARIOS.includes(scenario) || !["success", "provider_error", "timeout"].includes(provider))
            throw new Error("Offline worker rejected.");
        const a = this.get(index);
        if (a.phase !== "queued") {
            this.event("duplicate_ignored", a);
            return false;
        }
        a.phase = "invoking";
        if (!(await this.active(a))) {
            a.phase = "settled";
            this.event("late_ignored", a);
            await this.reconcile();
            return false;
        }
        // Neither caller buffers nor a provider adapter can be injected here.
        const next = { ...a, scenario };
        this.attempts[index] = next;
        const fake = new FakeHairstyleImageProvider(provider as FakeProviderScenario, 0);
        const request = Object.freeze({ requestId: this.ids.next("request"), sourceAssetId: this.sourceId!, specification: Object.freeze({ ...a.variant.specification, preserve: Object.freeze([...a.variant.specification.preserve]) }), strategy: "prompt-only" as const, quality: "medium" as const, promptVersion: "hair-offline-v1", idempotencyKey: a.variant.attemptId });
        next.providerPromise = fake.edit(request).then(result => result.requestId === request.requestId && result.provider === "fake" && result.model === "deterministic-v1", () => false);
        this.event("invoked", next);
        // Failure category is fixed from this controlled profile, never raw Error.
        if (provider !== "success")
            next.providerFailure = provider === "timeout" ? "provider_timeout" : "provider_unavailable";
        return true;
    }
    public async receive(index: number): Promise<boolean> {
        const a = this.get(index);
        if (a.drained || a.receiving || a.providerPromise === undefined) {
            this.event("duplicate_ignored", a);
            return false;
        }
        a.receiving = true;
        try {
            if (a.phase !== "settled")
                a.phase = "received";
            const success = await a.providerPromise;
            if (!success) {
                if (a.phase === "settled" || a.canceled || !(await this.accessible())) {
                    this.event("late_ignored", a);
                    await this.reconcile();
                    return false;
                }
                await this.fail(a, a.providerFailure ?? "provider_unavailable");
                return false;
            }
            const bytes = await generateOfflineOutput(a.scenario);
            a.promised = { contentSha256: createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length };
            this.store.set(a.outputId, { bytes, kind: "transient" });
            this.event("received", a, a.outputId);
            if (!(await this.active(a))) {
                this.purge(a.outputId);
                a.phase = "settled";
                this.event("late_ignored", a);
                await this.reconcile();
                return false;
            }
            return true;
        }
        finally {
            a.drained = true;
            a.receiving = false;
        }
    }
    public async beginDecode(index: number): Promise<boolean> {
        const a = this.get(index);
        if (a.phase !== "received") {
            this.event("duplicate_ignored", a);
            return false;
        }
        a.phase = "decoding";
        if (!(await this.active(a))) {
            this.purge(a.outputId);
            a.phase = "settled";
            this.event("late_ignored", a);
            await this.reconcile();
            return false;
        }
        const bytes = this.store.get(a.outputId)?.bytes;
        if (bytes === undefined) {
            await this.fail(a, "invalid_output");
            return false;
        }
        a.decodePromise = decodeOfflineSyntheticOutput(bytes).then(result => result, () => null);
        this.event("decode_started", a, a.outputId);
        return true;
    }
    public async finishDecode(index: number): Promise<boolean> {
        const a = this.get(index);
        if (a.decodeDrained || a.decodeFinishing || a.decodePromise === undefined) {
            this.event("duplicate_ignored", a);
            return false;
        }
        a.decodeFinishing = true;
        a.phase = "finishing_decode";
        const result = await a.decodePromise;
        a.decodeDrained = true;
        if (!(await this.active(a))) {
            this.purge(a.outputId);
            a.phase = "settled";
            this.event("late_ignored", a);
            await this.reconcile();
            return false;
        }
        if (result === null || result.widthPx !== 64 || result.heightPx !== 64 || result.format !== "png" || result.contentSha256 !== a.promised?.contentSha256 || result.byteLength !== a.promised?.byteLength || result.byteLength !== this.store.get(a.outputId)?.bytes.length) {
            await this.fail(a, "invalid_output");
            return false;
        }
        a.decoded = result;
        a.phase = "decoded";
        this.event("decoded", a, a.outputId);
        return true;
    }
    private async fail(a: Attempt, code: Failure): Promise<void> {
        const response = await this.service.execute({ operation: "variant.publish", context: this.context(this.generationActor), consultationId: this.consultation!.id, variantId: a.variant.id, callback: { attemptId: a.variant.attemptId, outcome: "failed", safeFailureCode: code } });
        const returned = response.ok ? response.value as Variant : null;
        if (returned?.attemptId === a.variant.attemptId)
            a.variant = returned;
        a.phase = "settled";
        this.purge(a.outputId);
        this.event(returned?.attemptId === a.variant.attemptId && returned.state === "failed" ? "failed" : "late_ignored", a, null, code);
        await this.reconcile();
    }
    public async publish(index: number): Promise<boolean> {
        const a = this.get(index);
        if (a.phase !== "decoded" || a.decoded === undefined) {
            this.event("duplicate_ignored", a);
            return false;
        }
        a.phase = "publishing";
        if (!(await this.active(a))) {
            this.purge(a.outputId);
            a.phase = "settled";
            this.event("late_ignored", a);
            await this.reconcile();
            return false;
        }
        a.phase = "settled";
        const response = await this.service.execute({ operation: "variant.publish", context: this.context(this.generationActor), consultationId: this.consultation!.id, variantId: a.variant.id, callback: { attemptId: a.variant.attemptId, outcome: "ready", outputAssetId: a.outputId } });
        const variant = response.ok ? response.value as Variant : null;
        if (variant?.state !== "ready" || variant.outputAssetId !== a.outputId || variant.attemptId !== a.variant.attemptId) {
            this.purge(a.outputId);
            this.event("late_ignored", a);
            await this.reconcile();
            return false;
        }
        a.variant = variant;
        const bytes = this.store.get(a.outputId)?.bytes;
        if (bytes === undefined)
            throw new Error("Offline worker rejected.");
        this.store.set(a.outputId, { bytes, kind: "output" });
        this.outputs.push({ assetId: a.outputId, attemptId: a.variant.attemptId, ...a.decoded, state: "available" });
        this.event("published", a, a.outputId);
        await this.reconcile();
        return true;
    }
    public async duplicateCallback(index: number): Promise<boolean> {
        const a = this.get(index);
        if (this.consultation === null || a.variant.state !== "ready" || a.variant.outputAssetId !== a.outputId || !this.outputs.some(o => o.assetId === a.outputId) || a.decoded === undefined) {
            this.event("denied", a);
            return false;
        }
        const response = await this.service.execute({ operation: "variant.publish", context: this.context(this.generationActor), consultationId: this.consultation.id, variantId: a.variant.id, callback: { attemptId: a.variant.attemptId, outcome: "ready", outputAssetId: a.outputId } });
        this.event("duplicate_ignored", a);
        await this.reconcile();
        return response.ok;
    }
    public async timeout(index: number): Promise<void> { const a = this.get(index); if (a.phase === "settled") {
        this.event("duplicate_ignored", a);
        return;
    } a.canceled = true; await this.fail(a, "provider_timeout"); }
    public async cancel(): Promise<void> {
        if (this.consultation === null)
            return;
        const response = await this.service.execute({ operation: "generation.cancel", context: this.context(this.stylist), consultationId: this.consultation.id });
        if (!response.ok) {
            this.event("denied");
            return;
        }
        for (const a of this.attempts) {
            const updated = (response.value as readonly Variant[]).find(v => v.id === a.variant.id && v.attemptId === a.variant.attemptId);
            if (updated?.state !== "canceled" || a.phase === "settled")
                continue;
            a.canceled = true;
            a.variant = updated;
            this.purge(a.outputId);
            this.event("canceled", a);
        }
        await this.reconcile();
    }
    public async remove(): Promise<void> {
        if (this.consultation === null)
            return;
        const response = await this.service.execute({ operation: "deletion.request", context: this.context(this.stylist), consultationId: this.consultation.id, deletionRequestId: this.ids.next("deletionRequest"), statusCapabilityId: this.ids.next("capability"), reason: "user_request" });
        if (!response.ok) {
            this.event("denied");
            return;
        }
        this.deleted = true;
        this.event("deleted");
        await this.reconcile();
    }
    public async expire(): Promise<void> {
        this.clock.expire();
        if (this.consultation !== null)
            await this.service.execute({ operation: "retention.expire", context: this.context(this.retentionActor), consultationId: this.consultation.id, deletionRequestId: this.ids.next("deletionRequest"), statusCapabilityId: this.ids.next("capability") });
        this.event("expired");
        await this.reconcile();
    }
    public async retry(index: number): Promise<number | null> {
        const a = this.get(index);
        if (this.consultation === null)
            return null;
        const response = await this.service.execute({ operation: "variant.retry", context: this.context(this.stylist), consultationId: this.consultation.id, variantId: a.variant.id, nextAttemptId: this.ids.next("attempt") });
        if (!response.ok) {
            this.event("denied", a);
            return null;
        }
        const variant = response.value as Variant;
        const next: Attempt = { variant, phase: "queued", outputId: this.ids.next("asset"), scenario: "valid", canceled: false };
        this.attempts.push(next);
        this.event("retried", next);
        await this.reconcile();
        return this.attempts.length - 1;
    }
    /** One deterministic simulated object-store outage, without injected handlers. */
    public simulateCleanupFailureOnce(): void { this.failCleanupOnce = true; }
    public async retryCleanup(): Promise<void> { await this.reconcile(); }
    public report(): OfflineWorkerReport {
        const pendingProvider = this.attempts.filter(a => a.providerPromise !== undefined && !a.drained).length;
        const pendingDecode = this.attempts.filter(a => a.decodePromise !== undefined && !a.decodeDrained).length;
        return { version: "hair-offline-worker-v1", scope: "closed_synthetic_worker", evidence: "new_offline_execution_only", liveAuthorization: "NOT_EVALUATED", moderation: "NOT_EVALUATED", subjectCount: "NOT_EVALUATED", imageQuality: "NOT_EVALUATED", releaseGate: "NOT_EVALUATED", events: this.events.map(e => ({ ...e })), outputs: this.outputs.map(o => ({ ...o })), attempts: this.attempts.map(a => ({ attemptId: a.variant.attemptId, variantId: a.variant.id, attemptNumber: a.variant.attemptNumber, phase: a.phase, lastObservedState: a.variant.state })), storage: { source: [...this.store.values()].filter(s => s.kind === "source").length, transient: [...this.store.values()].filter(s => s.kind === "transient").length, output: [...this.store.values()].filter(s => s.kind === "output").length, pendingCleanup: this.cleanup.size }, cleanup: { pendingProvider, pendingDecode, verification: pendingProvider + pendingDecode + this.cleanup.size === 0 && ![...this.store.values()].some(s => s.kind === "transient") ? "no_pending_offline_obligations" : "pending" }, service: this.service.snapshot() };
    }
}
