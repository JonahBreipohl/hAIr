import sharp from "sharp";

import { OFFLINE_OUTPUT_LIMITS } from "./offline-output-decoder";

export const OFFLINE_OUTPUT_SCENARIOS = [
  "valid", "truncated", "corrupt", "wrong_format", "dimension_mismatch",
  "oversize_dimensions", "oversize_bytes",
] as const;
export type OfflineOutputScenario = typeof OFFLINE_OUTPUT_SCENARIOS[number];

/** Generated color tiles only. Never reads files, locators or customer media. */
export async function generateOfflineOutput(scenario: OfflineOutputScenario): Promise<Uint8Array> {
  if (!OFFLINE_OUTPUT_SCENARIOS.includes(scenario)) throw new Error("Offline fixture rejected.");
  if (scenario === "oversize_bytes") return new Uint8Array(OFFLINE_OUTPUT_LIMITS.encodedBytes + 1);
  const width = scenario === "dimension_mismatch" ? 32 : scenario === "oversize_dimensions" ? 1025 : 64;
  const pipeline = sharp({ create: {
    width, height: 64, channels: 3, background: { r: 80, g: 100, b: 120 },
  } });
  let encoded: Buffer | undefined;
  try {
    if (scenario === "wrong_format") return await pipeline.jpeg().toBuffer();
    encoded = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
    // sharp emits a harmless pHYs chunk by default. The offline profile accepts no
    // ancillary metadata: retain only the encoder's IHDR/IDAT/IEND chunks.
    const parts: Buffer[] = [encoded.subarray(0, 8)];
    let offset = 8;
    while (offset < encoded.length) {
      const length = encoded.readUInt32BE(offset);
      const type = encoded.toString("ascii", offset + 4, offset + 8);
      const end = offset + length + 12;
      if (type === "IHDR" || type === "IDAT" || type === "IEND") parts.push(encoded.subarray(offset, end));
      offset = end;
    }
    const bytes = Buffer.concat(parts);
    if (scenario === "truncated") {
      const shortened = Buffer.from(bytes.subarray(0, bytes.length - 7));
      bytes.fill(0);
      return shortened;
    }
    if (scenario === "corrupt") bytes[48] = (bytes[48] ?? 0) ^ 0xff;
    return bytes;
  } finally {
    encoded?.fill(0);
    pipeline.destroy();
  }
}
