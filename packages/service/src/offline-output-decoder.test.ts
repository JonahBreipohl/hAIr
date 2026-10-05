import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { decodeOfflineSyntheticOutput, OFFLINE_OUTPUT_LIMITS } from "./offline-output-decoder";
import { generateOfflineOutput } from "./offline-output-fixtures";

function crc32(data: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(type, 4, 4, "ascii");
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, result.length - 4)), result.length - 4);
  return result;
}

function replaceHeader(bytes: Buffer, change: (header: Buffer) => void): Buffer {
  const header = Buffer.from(bytes.subarray(16, 29));
  change(header);
  return Buffer.concat([bytes.subarray(0, 8), chunk("IHDR", header), bytes.subarray(33)]);
}

async function valid(): Promise<Buffer> {
  return Buffer.from(await generateOfflineOutput("valid"));
}

describe("bounded offline synthetic PNG full decode", () => {
  it("fully decodes a generated tile and returns only frozen safe facts", async () => {
    const bytes = await valid();
    const original = Buffer.from(bytes);
    const result = await decodeOfflineSyntheticOutput(bytes);
    expect(result).toEqual({
      contentSha256: createHash("sha256").update(bytes).digest("hex"),
      widthPx: 64, heightPx: 64, format: "png", byteLength: bytes.length,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(bytes.equals(original)).toBe(true);
    expect(await decodeOfflineSyntheticOutput(await valid())).toEqual(result);
  });

  it("takes a private snapshot before asynchronous native decoding", async () => {
    const bytes = await valid();
    const hash = createHash("sha256").update(bytes).digest("hex");
    const pending = decodeOfflineSyntheticOutput(bytes);
    bytes.fill(0);
    expect((await pending).contentSha256).toBe(hash);
  });

  it("accepts an offset Uint8Array and hashes only its selected range", async () => {
    const bytes = await valid();
    const container = new Uint8Array(bytes.length + 24);
    container.set(bytes, 11);
    const slice = container.subarray(11, 11 + bytes.length);
    expect(await decodeOfflineSyntheticOutput(slice)).toEqual(await decodeOfflineSyntheticOutput(bytes));
  });

  it.each(["truncated", "corrupt", "wrong_format", "oversize_dimensions", "oversize_bytes"] as const)(
    "rejects generated %s output with a generic content-free error", async (scenario) => {
      await expect(decodeOfflineSyntheticOutput(await generateOfflineOutput(scenario))).rejects.toThrow(/^Offline output rejected\.$/);
    },
  );

  it("returns actual mismatched dimensions for worker comparison instead of trusting declarations", async () => {
    const result = await decodeOfflineSyntheticOutput(await generateOfflineOutput("dimension_mismatch"));
    expect(result.widthPx).toBe(32);
    expect(result.heightPx).toBe(64);
  });

  it("rejects valid CRC/framing with incomplete pixel rows even though metadata parsing succeeds", async () => {
    const bytes = await valid();
    const header = bytes.subarray(8, 33);
    const broken = Buffer.concat([
      bytes.subarray(0, 8), header,
      chunk("IDAT", deflateSync(Buffer.alloc(64 * 3 + 1))),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    expect((await sharp(broken).metadata()).width).toBe(64);
    await expect(decodeOfflineSyntheticOutput(broken)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it("rejects invalid row filters with valid compression and container CRC", async () => {
    const bytes = await valid();
    const pixels = Buffer.alloc((64 * 3 + 1) * 64);
    pixels[0] = 255;
    const broken = Buffer.concat([
      bytes.subarray(0, 33), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0)),
    ]);
    expect((await sharp(broken).metadata()).height).toBe(64);
    await expect(decodeOfflineSyntheticOutput(broken)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it.each(["trailing_payload", "concatenated_stream", "excess_rows"])("rejects %s inside CRC-valid compressed data", async (scenario) => {
    const bytes = await valid();
    const length = bytes.readUInt32BE(33);
    const compressed = bytes.subarray(41, 41 + length);
    const data = scenario === "excess_rows" ? deflateSync(Buffer.alloc((64 * 3 + 1) * 65)) :
      Buffer.concat([compressed, scenario === "concatenated_stream" ? deflateSync(Buffer.from([1, 2, 3])) : Buffer.from([1, 2, 3])]);
    const broken = Buffer.concat([bytes.subarray(0, 33), chunk("IDAT", data), chunk("IEND", Buffer.alloc(0))]);
    await expect(decodeOfflineSyntheticOutput(broken)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it("fully decodes static RGBA and contiguous split IDAT chunks", async () => {
    const pixels = Buffer.alloc(16 * 16 * 4, 128);
    const encoded = await sharp(pixels, { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer();
    let offset = 8;
    const payloads: Buffer[] = [];
    while (offset < encoded.length) {
      const length = encoded.readUInt32BE(offset);
      if (encoded.toString("ascii", offset + 4, offset + 8) === "IDAT") payloads.push(encoded.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    const data = Buffer.concat(payloads);
    const split = Math.floor(data.length / 2);
    const bytes = Buffer.concat([encoded.subarray(0, 33), chunk("IDAT", data.subarray(0, split)), chunk("IDAT", data.subarray(split)), chunk("IEND", Buffer.alloc(0))]);
    expect(await decodeOfflineSyntheticOutput(bytes)).toMatchObject({ widthPx: 16, heightPx: 16, format: "png" });
  });

  it("allows a fully decoded RGB tile at the maximum edge and pixel bound", async () => {
    const encoded = await sharp({ create: {
      width: OFFLINE_OUTPUT_LIMITS.edgePx, height: OFFLINE_OUTPUT_LIMITS.edgePx,
      channels: 3, background: { r: 20, g: 40, b: 60 },
    } }).png().toBuffer();
    const chunks: Buffer[] = [encoded.subarray(0, 8)];
    let offset = 8;
    while (offset < encoded.length) {
      const length = encoded.readUInt32BE(offset);
      const type = encoded.toString("ascii", offset + 4, offset + 8);
      if (type === "IHDR" || type === "IDAT" || type === "IEND") chunks.push(encoded.subarray(offset, offset + length + 12));
      offset += length + 12;
    }
    expect(await decodeOfflineSyntheticOutput(Buffer.concat(chunks))).toMatchObject({
      widthPx: OFFLINE_OUTPUT_LIMITS.edgePx, heightPx: OFFLINE_OUTPUT_LIMITS.edgePx,
    });
  });

  it.each([0, OFFLINE_OUTPUT_LIMITS.edgePx + 1, 0xffffffff])("rejects header width %s without trusting pixels", async (width) => {
    const bytes = replaceHeader(await valid(), (header) => header.writeUInt32BE(width, 0));
    await expect(decodeOfflineSyntheticOutput(bytes)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it.each(["metadata", "animation", "duplicate_header", "trailing_bytes", "missing_end", "no_pixels"])(
    "rejects closed-profile violation %s", async (scenario) => {
      const bytes = await valid();
      let broken: Buffer;
      switch (scenario) {
        case "metadata": broken = Buffer.concat([bytes.subarray(0, 33), chunk("tEXt", Buffer.from("note\0hidden")), bytes.subarray(33)]); break;
        case "animation": broken = Buffer.concat([bytes.subarray(0, 33), chunk("acTL", Buffer.alloc(8)), bytes.subarray(33)]); break;
        case "duplicate_header": broken = Buffer.concat([bytes.subarray(0, 33), bytes.subarray(8, 33), bytes.subarray(33)]); break;
        case "trailing_bytes": broken = Buffer.concat([bytes, Buffer.from([1, 2, 3])]); break;
        case "missing_end": broken = bytes.subarray(0, bytes.length - 12); break;
        default: broken = Buffer.concat([bytes.subarray(0, 33), chunk("IEND", Buffer.alloc(0))]);
      }
      await expect(decodeOfflineSyntheticOutput(broken)).rejects.toThrow(/^Offline output rejected\.$/);
    },
  );

  it("bounds chunk-count work even for CRC-valid tiny fragments", async () => {
    const bytes = await valid();
    const broken = Buffer.concat([bytes.subarray(0, 33), ...Array.from({ length: OFFLINE_OUTPUT_LIMITS.chunks }, () => chunk("IDAT", Buffer.from([0]))), chunk("IEND", Buffer.alloc(0))]);
    await expect(decodeOfflineSyntheticOutput(broken)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it.each(["bit_depth", "palette", "interlace"])("rejects unsupported %s profile", async (setting) => {
    const bytes = replaceHeader(await valid(), (header) => {
      if (setting === "bit_depth") header[8] = 16;
      if (setting === "palette") header[9] = 3;
      if (setting === "interlace") header[12] = 1;
    });
    await expect(decodeOfflineSyntheticOutput(bytes)).rejects.toThrow(/^Offline output rejected\.$/);
  });

  it("rejects strings, coercion, empty and shared backing without invoking getters", async () => {
    let getterCalls = 0;
    const object = { get byteLength() { getterCalls++; return 2; } };
    for (const input of ["private locator", object, new Uint8Array(), new Uint8Array(new SharedArrayBuffer(32))]) {
      await expect(decodeOfflineSyntheticOutput(input as Uint8Array)).rejects.toThrow(/^Offline output rejected\.$/);
    }
    expect(getterCalls).toBe(0);
  });

  it("rejects accessor overrides, subclasses and proxies without reading user code", async () => {
    let calls = 0;
    const bytes = await valid();
    Object.defineProperty(bytes, "byteLength", { get() { calls++; return 123; } });
    class ByteSubclass extends Uint8Array {}
    const proxy = new Proxy(new Uint8Array(32), {
      get() { calls++; throw new Error("private"); },
      getPrototypeOf() { calls++; throw new Error("private"); },
    });
    for (const input of [bytes, new ByteSubclass(32), proxy]) {
      await expect(decodeOfflineSyntheticOutput(input)).rejects.toThrow(/^Offline output rejected\.$/);
    }
    expect(calls).toBe(0);
  });
});
