export const consultationStatuses = [
  "draft",
  "consented",
  "ready",
  "generating",
  "reviewing",
  "agreed",
  "deleted",
  "expired",
] as const;

export type ConsultationStatus = (typeof consultationStatuses)[number];

const transitions: Readonly<Record<ConsultationStatus, readonly ConsultationStatus[]>> = {
  draft: ["consented", "deleted", "expired"],
  consented: ["ready", "deleted", "expired"],
  ready: ["generating", "deleted", "expired"],
  generating: ["reviewing", "ready", "deleted", "expired"],
  reviewing: ["generating", "agreed", "deleted", "expired"],
  agreed: ["ready", "reviewing", "deleted", "expired"],
  deleted: [],
  expired: ["deleted"],
};

export function canTransitionConsultation(
  from: ConsultationStatus,
  to: ConsultationStatus,
): boolean {
  return transitions[from].includes(to);
}

export function transitionConsultation(
  from: ConsultationStatus,
  to: ConsultationStatus,
): ConsultationStatus {
  if (!canTransitionConsultation(from, to)) {
    throw new Error(`Invalid consultation transition: ${from} -> ${to}`);
  }

  return to;
}

export const lengthGoals = ["shorter", "same", "longer"] as const;
export const textureGoals = [
  "same",
  "straight",
  "wavy",
  "curly",
  "coily",
  "protective",
] as const;
export const feasibilityStates = [
  "feasible-now",
  "needs-preparation",
  "inspiration-only",
] as const;

export type FeasibilityState = (typeof feasibilityStates)[number];

export interface HairSpecification {
  readonly lengthGoal: (typeof lengthGoals)[number];
  readonly silhouette: string;
  readonly layers: string;
  readonly part: string;
  readonly fringe: string;
  readonly texture: (typeof textureGoals)[number];
  readonly volume: string;
  readonly fadeOrTaper: string;
  readonly baseColor: string;
  readonly tone: string;
  readonly highlights: string;
  readonly finish: string;
  readonly maintenanceTolerance: "low" | "medium" | "high";
  readonly inspirationAttributes: string;
  readonly preserve: readonly string[];
}

export const defaultHairSpecification: HairSpecification = {
  lengthGoal: "same",
  silhouette: "",
  layers: "",
  part: "",
  fringe: "",
  texture: "same",
  volume: "",
  fadeOrTaper: "",
  baseColor: "",
  tone: "",
  highlights: "",
  finish: "",
  maintenanceTolerance: "medium",
  inspirationAttributes: "",
  preserve: [],
};

export function validateHairSpecification(
  specification: HairSpecification,
): readonly string[] {
  const errors: string[] = [];
  const requestedChange = [
    specification.silhouette,
    specification.layers,
    specification.part,
    specification.fringe,
    specification.volume,
    specification.fadeOrTaper,
    specification.baseColor,
    specification.tone,
    specification.highlights,
    specification.finish,
    specification.inspirationAttributes,
  ].some((value) => value.trim().length > 0) || specification.texture !== "same";

  if (!requestedChange && specification.lengthGoal === "same") {
    errors.push("Choose at least one hair change before generating previews.");
  }

  if (specification.preserve.some((value) => value.trim().length === 0)) {
    errors.push("Preserve instructions cannot be blank.");
  }

  return errors;
}
