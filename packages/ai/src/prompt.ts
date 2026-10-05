import type { HairSpecification } from "@hair/domain";

const preservedSubjectDetails = [
  "face and facial geometry",
  "skin tone and skin texture",
  "expression and gaze",
  "age appearance",
  "body, neck, and pose",
  "clothing and accessories",
  "background, camera angle, and lighting",
] as const;

function clean(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function buildHairstyleEditPrompt(
  specification: HairSpecification,
  hasReferenceImage: boolean,
): string {
  const fieldEntries: readonly (readonly [string, string])[] = [
    ["length goal", specification.lengthGoal],
    ["silhouette", specification.silhouette],
    ["layers", specification.layers],
    ["part", specification.part],
    ["fringe", specification.fringe],
    ["texture", specification.texture],
    ["volume", specification.volume],
    ["fade or taper", specification.fadeOrTaper],
    ["base color", specification.baseColor],
    ["tone", specification.tone],
    ["highlights", specification.highlights],
    ["finish", specification.finish],
    ["maintenance tolerance", specification.maintenanceTolerance],
    ["inspiration attributes", specification.inspirationAttributes],
  ];
  const fields = fieldEntries
    .map(([label, value]) => [label, clean(value)] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");

  const extraPreservation = specification.preserve
    .map(clean)
    .filter(Boolean)
    .join(", ");

  return [
    "Edit only the hair of the person in the source portrait.",
    `Desired hair: ${fields}.`,
    `Preserve exactly: ${preservedSubjectDetails.join(", ")}${
      extraPreservation ? `, ${extraPreservation}` : ""
    }.`,
    hasReferenceImage
      ? "Use the reference image only for its hairstyle cut, color, texture, and silhouette. Never copy its face, identity, pose, clothing, or background."
      : "Use only the structured hairstyle description as visual direction.",
    "Do not beautify, retouch skin, change perceived ethnicity or gender presentation, change body shape, or add makeup, jewelry, text, logos, or watermarks.",
    "Return a realistic consultation preview with the original person's identity unchanged.",
  ].join(" ");
}
