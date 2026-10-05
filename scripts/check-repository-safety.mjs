import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const rasterExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const secretPatterns = [
  {
    label: "private-key material",
    pattern: new RegExp(
      ["-----BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY-----"].join(""),
    ),
  },
  { label: "OpenAI-style secret", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: "GitHub personal access token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

function repositoryFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "buffer" },
  );

  if (result.status !== 0) {
    const detail = result.stderr.toString("utf8").trim();
    throw new Error(`Unable to enumerate repository files${detail ? `: ${detail}` : "."}`);
  }

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function isBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8_192));
  return sample.includes(0);
}

const violations = [];

for (const path of repositoryFiles()) {
  if (rasterExtensions.has(extname(path).toLowerCase())) {
    violations.push(`${path}: raster media must stay outside source control`);
    continue;
  }

  const contents = readFileSync(path);
  if (isBinary(contents)) {
    continue;
  }

  const text = contents.toString("utf8");
  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(text)) {
      violations.push(`${path}: possible ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Repository safety check failed:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log("Repository safety check passed: no raster media or high-confidence secrets found.");
}
