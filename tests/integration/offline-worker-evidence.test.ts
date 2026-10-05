import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import golden from "../evals/offline-worker.golden.json";
import { buildOfflineWorkerEvidence } from "../evals/offline-worker-evidence";

it("reproduces closed offline worker control evidence without claiming image quality", async () => {
  const evidence = await buildOfflineWorkerEvidence();
  if (process.env.HAIR_UPDATE_WORKER_GOLDEN === "1") writeFileSync(new URL("../evals/offline-worker.golden.json", import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
  else expect(evidence).toEqual(golden);
  expect(evidence.scenarios.every(scenario => scenario.cleanup.verification === "no_pending_offline_obligations")).toBe(true);
  expect(evidence.live_authorization).toBe("NOT_EVALUATED");
  expect(evidence.image_quality).toBe("NOT_EVALUATED");
  expect(evidence.release_gate).toBe("NOT_EVALUATED");
});
