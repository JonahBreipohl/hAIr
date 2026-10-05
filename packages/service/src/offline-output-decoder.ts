import { createHash } from "node:crypto";
import { types } from "node:util";
import { inflateSync } from "node:zlib";

import sharp, { type Sharp } from "sharp";

/** Closed, offline synthetic profile. This is not a customer-upload validator. */
export const OFFLINE_OUTPUT_LIMITS = Object.freeze({
  encodedBytes: 1_048_576,
  edgePx: 1_024,
  pixels: 1_048_576,
  chunks: 128,
  processingSeconds: 2,
});

export interface DecodedOfflineSyntheticOutput {
  contentSha256: string;
  widthPx: number;
  heightPx: number;
  format: "png";
  byteLength: number;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype) as object;
const byteLengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength")!.get!;
const bufferGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, "buffer")!.get!;

function reject(): never {
  throw new Error("Offline output rejected.");
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of data) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Envelope allowlist only: no compression or pixel decoding is implemented here.
 * Reject ancillary metadata/APNG, bad CRCs, incomplete chunks and trailing bytes
 * before invoking libpng. This intentionally accepts only IHDR/IDAT/IEND.
 */
function inspectClosedPng(bytes: Buffer): { width: number; height: number; channels: 3 | 4; compressed: Buffer } {
  if (!bytes.subarray(0, 8).equals(signature)) reject();
  let offset = 8;
  let chunks = 0;
  let sawHeader = false;
  let sawData = false;
  let width = 0;
  let height = 0;
  let channels: 3 | 4 = 3;
  const dataChunks: Buffer[] = [];
  while (offset < bytes.length) {
    if (++chunks > OFFLINE_OUTPUT_LIMITS.chunks || bytes.length - offset < 12) reject();
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) reject();
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) reject();
    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) reject();
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      if (width < 1 || height < 1 || width > OFFLINE_OUTPUT_LIMITS.edgePx ||
          height > OFFLINE_OUTPUT_LIMITS.edgePx || width * height > OFFLINE_OUTPUT_LIMITS.pixels) reject();
      if (payload[8] !== 8 || (payload[9] !== 2 && payload[9] !== 6) ||
          payload[10] !== 0 || payload[11] !== 0 || payload[12] !== 0) reject();
      channels = payload[9] === 2 ? 3 : 4;
      sawHeader = true;
    } else if (type === "IDAT") {
      if (length === 0) reject();
      sawData = true;
      dataChunks.push(payload);
    } else if (type === "IEND") {
      if (length !== 0 || !sawData || end !== bytes.length) reject();
      return { width, height, channels, compressed: Buffer.concat(dataChunks) };
    } else {
      reject();
    }
    offset = end;
  }
  return reject();
}

/**
 * Takes a private snapshot before the first await; hashes the exact fully decoded
 * encoding. The returned facts prove decoding only. They grant no media/display
 * permission and make no subject-count, moderation, image-quality or live claim.
 * Native timeout is a processing bound, not an OS sandbox or wall-clock deadline.
 */
export async function decodeOfflineSyntheticOutput(bytes: Uint8Array): Promise<DecodedOfflineSyntheticOutput> {
  let snapshot: Buffer | undefined;
  let pixels: Buffer | undefined;
  let compressed: Buffer | undefined;
  let scanlines: Buffer | undefined;
  let pipeline: Sharp | undefined;
  try {
    if (types.isProxy(bytes) || !(bytes instanceof Uint8Array) ||
        (Object.getPrototypeOf(bytes) !== Uint8Array.prototype && Object.getPrototypeOf(bytes) !== Buffer.prototype)) reject();
    for (const key of ["byteLength", "buffer", "byteOffset", "length"]) {
      if (Object.getOwnPropertyDescriptor(bytes, key)) reject();
    }
    const length = byteLengthGetter.call(bytes) as number;
    const backing = bufferGetter.call(bytes) as unknown;
    if (!(backing instanceof ArrayBuffer) || length < 1 || length > OFFLINE_OUTPUT_LIMITS.encodedBytes) reject();
    snapshot = Buffer.alloc(length);
    Uint8Array.prototype.set.call(snapshot, bytes);
    const expected = inspectClosedPng(snapshot);
    compressed = expected.compressed;
    const expectedScanlineBytes = (expected.width * expected.channels + 1) * expected.height;
    // libpng can tolerate unused bytes after a complete compressed stream. Verify
    // exact consumption with Node's native bounded zlib decoder first; sharp still
    // performs the actual pixel/filter decode below. No custom decompressor exists.
    const inflated = inflateSync(compressed, { info: true, maxOutputLength: expectedScanlineBytes }) as unknown as {
      buffer: Buffer; engine: { bytesWritten: number };
    };
    scanlines = inflated.buffer;
    if (scanlines.length !== expectedScanlineBytes || inflated.engine.bytesWritten !== compressed.length) reject();
    pipeline = sharp(snapshot, {
      failOn: "warning",
      limitInputPixels: OFFLINE_OUTPUT_LIMITS.pixels,
      limitInputChannels: 4,
      unlimited: false,
      sequentialRead: true,
    }).timeout({ seconds: OFFLINE_OUTPUT_LIMITS.processingSeconds });
    const decoded = await pipeline.raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
    const decodedPixels = decoded.data;
    pixels = decodedPixels;
    if (decoded.info.width !== expected.width || decoded.info.height !== expected.height ||
        decoded.info.channels !== expected.channels || decoded.info.format !== "raw" ||
        decodedPixels.length !== expected.width * expected.height * expected.channels) reject();
    return Object.freeze({
      contentSha256: createHash("sha256").update(snapshot).digest("hex"),
      widthPx: expected.width,
      heightPx: expected.height,
      format: "png" as const,
      byteLength: length,
    });
  } catch {
    return reject();
  } finally {
    pixels?.fill(0);
    scanlines?.fill(0);
    compressed?.fill(0);
    snapshot?.fill(0);
    pipeline?.destroy();
  }
}
