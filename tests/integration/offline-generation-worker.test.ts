import { describe, expect, it } from "vitest";
import { OfflineGenerationWorker } from "../../packages/service/src/offline-generation-worker";
import type { OfflineOutputScenario } from "../../packages/service/src/offline-output-fixtures";
async function setup(count = 1): Promise<OfflineGenerationWorker> {
    const worker = new OfflineGenerationWorker();
    expect(await worker.open()).toBe(true);
    expect(await worker.request(count)).toBe(true);
    return worker;
}
async function decoded(worker: OfflineGenerationWorker, index = 0, scenario: OfflineOutputScenario = "valid"): Promise<boolean> {
    expect(await worker.invoke(index, scenario)).toBe(true);
    expect(await worker.receive(index)).toBe(true);
    expect(await worker.beginDecode(index)).toBe(true);
    return worker.finishDecode(index);
}
async function completed(worker: OfflineGenerationWorker, index = 0): Promise<void> {
    expect(await decoded(worker, index)).toBe(true);
    expect(await worker.publish(index)).toBe(true);
}
function expectNoOutput(worker: OfflineGenerationWorker): void {
    const report = worker.report();
    expect(report.outputs).toEqual([]);
    expect(report.storage.output).toBe(0);
    expect(report.storage.transient).toBe(0);
    expect(report.service.providerJobs).toBe(0);
}
describe("closed offline generation worker", () => {
    it("executes actual fake invocations and bounded decode before three service publications", async () => {
        const worker = await setup(3);
        for (let index = 0; index < 3; index++)
            await completed(worker, index);
        const report = worker.report();
        expect(report.outputs).toHaveLength(3);
        expect(report.outputs.every(o => o.widthPx === 64 && o.heightPx === 64 && o.byteLength > 0 && /^[a-f0-9]{64}$/.test(o.contentSha256))).toBe(true);
        expect(report.events.filter(e => e.kind === "invoked")).toHaveLength(3);
        expect(report.events.filter(e => e.kind === "decoded")).toHaveLength(3);
        expect(report.events.filter(e => e.kind === "published")).toHaveLength(3);
        expect(report.storage).toEqual({ source: 0, transient: 0, output: 3, pendingCleanup: 0 });
        expect(report.service.assets).toBe(3);
        expect(report.service.providerJobs).toBe(0);
        expect(report.service.workerTemporaryScopes).toBe(0);
        for (const key of ["liveAuthorization", "moderation", "subjectCount", "imageQuality", "releaseGate"] as const)
            expect(report[key]).toBe("NOT_EVALUATED");
    });
    it("requires service consent before generating or retaining synthetic source media", async () => {
        const worker = new OfflineGenerationWorker();
        expect(await worker.open(false)).toBe(false);
        expect(await worker.request()).toBe(false);
        expect(worker.report().service.consentReceipts).toBe(0);
        expect(worker.report().storage).toEqual({ source: 0, transient: 0, output: 0, pendingCleanup: 0 });
        expect(worker.report().events.some(e => e.kind === "invoked")).toBe(false);
    });
    it("denies unbound source handles before invocation", async () => {
        const worker = new OfflineGenerationWorker();
        await worker.open();
        expect(await worker.request(1, "unknown_source")).toBe(false);
        expect(worker.report().attempts).toEqual([]);
        expect(worker.report().service.variants).toBe(0);
    });
    it("cannot publish through duplicate callback before decode and acceptance", async () => {
        const worker = await setup();
        expect(await worker.duplicateCallback(0)).toBe(false);
        await worker.invoke(0, "corrupt");
        await worker.receive(0);
        expect(await worker.duplicateCallback(0)).toBe(false);
        expect(worker.report().service.providerJobs).toBe(1);
        expect(worker.report().service.assets).toBe(1);
        expect(worker.report().outputs).toEqual([]);
        const valid = await setup();
        await decoded(valid);
        expect(await valid.duplicateCallback(0)).toBe(false);
        expect(valid.report().outputs).toEqual([]);
        expect(valid.report().service.providerJobs).toBe(1);
    });
    it("deduplicates invocation, publication, and freshly contextualized service callbacks", async () => {
        const worker = await setup();
        await worker.invoke(0);
        expect(await worker.invoke(0)).toBe(false);
        await worker.receive(0);
        expect(await worker.receive(0)).toBe(false);
        await worker.beginDecode(0);
        await worker.finishDecode(0);
        await worker.publish(0);
        expect(await worker.publish(0)).toBe(false);
        expect(await worker.duplicateCallback(0)).toBe(true);
        expect(await worker.duplicateCallback(0)).toBe(true);
        expect(worker.report().outputs).toHaveLength(1);
        expect(worker.report().service.assets).toBe(1);
        expect(worker.report().events.filter(e => e.kind === "invoked")).toHaveLength(1);
    });
    it("claims publication synchronously before authorization awaits", async () => {
        const worker = await setup();
        await decoded(worker);
        expect(await Promise.all([worker.publish(0), worker.publish(0)])).toEqual([true, false]);
        expect(worker.report().outputs).toHaveLength(1);
        expect(worker.report().events.filter(e => e.kind === "published")).toHaveLength(1);
    });
    it("claims decode finishing once and timeout wins before publication", async () => {
        const worker = await setup();
        await worker.invoke(0);
        await worker.receive(0);
        await worker.beginDecode(0);
        const finishing = worker.finishDecode(0);
        const duplicate = worker.finishDecode(0);
        await worker.timeout(0);
        expect(await finishing).toBe(false);
        expect(await duplicate).toBe(false);
        expect(await worker.publish(0)).toBe(false);
        expectNoOutput(worker);
    });
    it("reports pending provider and decoder drain obligations after deletion", async () => {
        const invoked = await setup();
        await invoked.invoke(0);
        await invoked.remove();
        expect(invoked.report().cleanup).toEqual({ pendingProvider: 1, pendingDecode: 0, verification: "pending" });
        await invoked.receive(0);
        expect(invoked.report().cleanup).toEqual({ pendingProvider: 0, pendingDecode: 0, verification: "no_pending_offline_obligations" });
        const worker = await setup();
        await worker.invoke(0);
        await worker.receive(0);
        await worker.beginDecode(0);
        await worker.remove();
        expect(worker.report().storage.transient).toBe(0);
        expect(worker.report().cleanup).toEqual({ pendingProvider: 0, pendingDecode: 1, verification: "pending" });
        await worker.finishDecode(0);
        expect(worker.report().cleanup).toEqual({ pendingProvider: 0, pendingDecode: 0, verification: "no_pending_offline_obligations" });
    });
    for (const action of ["cancel", "remove", "expire", "timeout"] as const) {
        it(`prevents publication and drains late resolve after ${action} during invocation`, async () => {
            const worker = await setup();
            await worker.invoke(0);
            if (action === "timeout")
                await worker.timeout(0);
            else
                await worker[action]();
            expect(await worker.receive(0)).toBe(false);
            expect(await worker.beginDecode(0)).toBe(false);
            expect(await worker.publish(0)).toBe(false);
            expectNoOutput(worker);
            expect(worker.report().events.some(e => e.kind === "late_ignored")).toBe(true);
            expect(worker.report().events.filter(e => e.kind === "decode_started")).toHaveLength(0);
        });
        it(`prevents publication and purges buffers after ${action} during native decode`, async () => {
            const worker = await setup();
            await worker.invoke(0);
            await worker.receive(0);
            await worker.beginDecode(0);
            if (action === "timeout")
                await worker.timeout(0);
            else
                await worker[action]();
            expect(await worker.finishDecode(0)).toBe(false);
            expect(await worker.publish(0)).toBe(false);
            expectNoOutput(worker);
            expect(worker.report().cleanup).toEqual({ pendingProvider: 0, pendingDecode: 0, verification: "no_pending_offline_obligations" });
        });
        it(`prevents publication after ${action} at decoded publication barrier`, async () => {
            const worker = await setup();
            expect(await decoded(worker)).toBe(true);
            if (action === "timeout")
                await worker.timeout(0);
            else
                await worker[action]();
            expect(await worker.publish(0)).toBe(false);
            expectNoOutput(worker);
        });
    }
    it("retains completed siblings while cancellation purges unfinished media and source package", async () => {
        const worker = await setup(3);
        await completed(worker, 0);
        await worker.invoke(1);
        await worker.invoke(2);
        await worker.receive(2);
        await worker.beginDecode(2);
        await worker.cancel();
        expect(await worker.receive(1)).toBe(false);
        expect(await worker.finishDecode(2)).toBe(false);
        const report = worker.report();
        expect(report.attempts.map(a => a.lastObservedState)).toEqual(["ready", "canceled", "canceled"]);
        expect(report.outputs).toHaveLength(1);
        expect(report.outputs[0]?.state).toBe("available");
        expect(report.storage).toEqual({ source: 0, transient: 0, output: 1, pendingCleanup: 0 });
        expect(report.service.assets).toBe(1);
    });
    it("drains late failed invocation without raw provider errors after deletion", async () => {
        const worker = await setup();
        await worker.invoke(0, "valid", "provider_error");
        await worker.remove();
        expect(await worker.receive(0)).toBe(false);
        expectNoOutput(worker);
        expect(worker.report().events.some(e => e.kind === "late_ignored")).toBe(true);
        expect(JSON.stringify(worker.report())).not.toContain("Deterministic fake-provider");
    });
    for (const scenario of ["truncated", "corrupt", "wrong_format", "dimension_mismatch", "oversize_dimensions", "oversize_bytes"] as const) {
        it(`rejects ${scenario} without publishing output sidecars`, async () => {
            const worker = await setup();
            expect(await decoded(worker, 0, scenario)).toBe(false);
            expect(await worker.publish(0)).toBe(false);
            expectNoOutput(worker);
            expect(worker.report().events.some(e => e.kind === "failed" && e.failureCode === "invalid_output")).toBe(true);
            expect(worker.report().attempts[0]?.lastObservedState).toBe("failed");
        });
    }
    it("retains failed and retried attempts and cannot retry twice or replace completed siblings", async () => {
        const worker = await setup(2);
        await completed(worker, 0);
        await worker.invoke(1, "valid", "provider_error");
        expect(await worker.receive(1)).toBe(false);
        const retry = await worker.retry(1);
        expect(retry).toBe(2);
        expect(await worker.retry(1)).toBe(null);
        expect(await worker.retry(0)).toBe(null);
        await completed(worker, 2);
        const report = worker.report();
        expect(report.attempts.map(a => a.attemptNumber)).toEqual([1, 1, 2]);
        expect(report.attempts.map(a => a.lastObservedState)).toEqual(["ready", "failed", "ready"]);
        expect(report.outputs).toHaveLength(2);
        expect(report.events.some(e => e.kind === "failed" && e.failureCode === "provider_unavailable")).toBe(true);
        expect(report.storage).toEqual({ source: 0, transient: 0, output: 2, pendingCleanup: 0 });
    });
    it("records explicit simulated provider timeout and retry recovery", async () => {
        const worker = await setup();
        await worker.invoke(0, "valid", "timeout");
        expect(await worker.receive(0)).toBe(false);
        expect(worker.report().events.some(e => e.failureCode === "provider_timeout")).toBe(true);
        const retry = await worker.retry(0);
        expect(retry).toBe(1);
        await completed(worker, 1);
        expect(worker.report().outputs).toHaveLength(1);
    });
    it("preserves failed attempt identity and state when a newer retry is canceled", async () => {
        const worker = await setup();
        await worker.invoke(0);
        await worker.timeout(0);
        const original = worker.report().attempts[0];
        expect(await worker.retry(0)).toBe(1);
        await worker.cancel();
        expect(worker.report().attempts[0]).toEqual(original);
        expect(worker.report().attempts[1]?.lastObservedState).toBe("canceled");
        expect(await worker.receive(0)).toBe(false);
        expect(worker.report().attempts[0]).toEqual(original);
        expectNoOutput(worker);
    });
    it("makes failed byte cleanup visible independently of simulated service deletion metadata", async () => {
        const worker = await setup(2);
        await completed(worker, 0);
        worker.simulateCleanupFailureOnce();
        await worker.remove();
        const pending = worker.report();
        expect(pending.storage.pendingCleanup).toBe(1);
        expect(pending.events.some(e => e.kind === "cleanup_pending")).toBe(true);
        expect(pending.storage.output).toBe(0);
        await worker.retryCleanup();
        expect(worker.report().storage).toEqual({ source: 0, transient: 0, output: 0, pendingCleanup: 0 });
        expect(worker.report().outputs[0]?.state).toBe("purged");
        expect(worker.report().events.some(e => e.kind === "cleanup_pending")).toBe(true);
    });
    it("purges accepted output bytes on deletion and cannot revive them via duplicate callback", async () => {
        const worker = await setup();
        await completed(worker);
        await worker.remove();
        expect(await worker.duplicateCallback(0)).toBe(false);
        expect(worker.report().storage.output).toBe(0);
        expect(worker.report().outputs[0]?.state).toBe("purged");
        expect(worker.report().service.assets).toBe(0);
    });
    it("returns detached safe content-free metadata and rejects raw or coercible arguments", async () => {
        const worker = await setup();
        const report = worker.report();
        (report.events as unknown as Array<{
            kind: string;
        }>)[0]!.kind = "invalid";
        expect(worker.report().events[0]?.kind).toBe("requested");
        for (const index of ["0", -1, 0.5, NaN, {}])
            await expect(worker.invoke(index as number)).rejects.toThrow("Offline worker rejected.");
        await expect(worker.request(1, "https://private.invalid" as "bound")).rejects.toThrow("Offline worker rejected.");
        await expect(worker.invoke(0, "customer.png" as OfflineOutputScenario)).rejects.toThrow("Offline worker rejected.");
        expect(JSON.stringify(worker.report())).not.toMatch(/(?:bytes|locator|silhouette|promptVersion|capabilityId|estimatedCostUsd|durationMs)/);
    });
});
