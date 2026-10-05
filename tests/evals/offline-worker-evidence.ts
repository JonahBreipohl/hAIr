import { sha256EvaluationManifest } from "../../packages/ai/src/benchmark";
import { OfflineGenerationWorker, type OfflineWorkerReport } from "../../packages/service/src/offline-generation-worker";
async function decode(worker: OfflineGenerationWorker, index: number): Promise<void> {
    if (!await worker.invoke(index) || !await worker.receive(index) || !await worker.beginDecode(index) || !await worker.finishDecode(index))
        throw new Error("Offline evidence failed.");
}
async function complete(worker: OfflineGenerationWorker, index: number): Promise<void> {
    await decode(worker, index);
    if (!await worker.publish(index))
        throw new Error("Offline evidence failed.");
}
async function open(count: number): Promise<OfflineGenerationWorker> {
    const worker = new OfflineGenerationWorker();
    if (!await worker.open() || !await worker.request(count))
        throw new Error("Offline evidence failed.");
    return worker;
}
function summarize(scenario: string, report: OfflineWorkerReport) {
    // Native encoder bytes can differ across supported platforms. Lock control
    // evidence, not an image-byte hash or encoded-size claim, in this golden.
    const { outputs, ...control } = report;
    const outputControl = outputs.map(({ contentSha256: _hash, byteLength: _length, ...output }) => output);
    if (outputs.some(output => !/^[a-f0-9]{64}$/.test(output.contentSha256) || output.byteLength < 1))
        throw new Error("Offline evidence failed.");
    return {
        scenario,
        control_sha256: sha256EvaluationManifest({ ...control, outputs: outputControl }),
        attempts: report.attempts.length,
        invoked: report.events.filter(event => event.kind === "invoked").length,
        failed: report.events.filter(event => event.kind === "failed").length,
        published: report.events.filter(event => event.kind === "published").length,
        retained_outputs: outputs.filter(output => output.state === "available").length,
        storage: report.storage,
        cleanup: report.cleanup,
    };
}
/** Executes only the closed local profile. No media or locator enters evidence. */
export async function buildOfflineWorkerEvidence() {
    const success = await open(3);
    for (let index = 0; index < 3; index++)
        await complete(success, index);
    const canceled = await open(3);
    await complete(canceled, 0);
    await canceled.invoke(1);
    await canceled.invoke(2);
    await canceled.receive(2);
    await canceled.beginDecode(2);
    await canceled.cancel();
    await canceled.receive(1);
    await canceled.finishDecode(2);
    const deleted = await open(1);
    await deleted.invoke(0);
    await deleted.receive(0);
    await deleted.beginDecode(0);
    await deleted.remove();
    await deleted.finishDecode(0);
    const retry = await open(1);
    await retry.invoke(0, "valid", "timeout");
    await retry.receive(0);
    const next = await retry.retry(0);
    if (next === null)
        throw new Error("Offline evidence failed.");
    await complete(retry, next);
    const malformed = await open(1);
    await malformed.invoke(0, "corrupt");
    await malformed.receive(0);
    await malformed.beginDecode(0);
    if (await malformed.finishDecode(0))
        throw new Error("Offline evidence failed.");
    await malformed.expire();
    const outage = await open(1);
    await complete(outage, 0);
    outage.simulateCleanupFailureOnce();
    await outage.remove();
    const pending = outage.report();
    if (pending.storage.pendingCleanup !== 1)
        throw new Error("Offline evidence failed.");
    await outage.retryCleanup();
    return {
        version: "hair-offline-worker-evidence-v1",
        scope: "closed_synthetic_worker_control_evidence",
        hash_basis: "safe_control_metadata_excludes_native_encoding",
        live_authorization: "NOT_EVALUATED", image_quality: "NOT_EVALUATED", release_gate: "NOT_EVALUATED",
        scenarios: [summarize("three_previews", success.report()), summarize("partial_cancel", canceled.report()), summarize("delete_during_decode", deleted.report()), summarize("timeout_retry", retry.report()), summarize("malformed_then_expiry", malformed.report()), summarize("cleanup_outage_then_retry", outage.report())],
        outage_pending_storage: pending.storage,
        outage_pending_verification: pending.cleanup.verification,
    };
}
