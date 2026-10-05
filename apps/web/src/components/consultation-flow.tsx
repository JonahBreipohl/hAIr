"use client";

import {
  FakeHairstyleImageProvider,
  HairstyleProviderError,
  type FakeProviderScenario,
  type HairstyleEditResult,
} from "@hair/ai";
import {
  defaultHairSpecification,
  makeGenerationIdempotencyKey,
  validateHairSpecification,
  type HairSpecification,
} from "@hair/domain";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type VariantStatus = "queued" | "running" | "ready" | "failed" | "canceled";

interface Variant {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly tone: "copper" | "espresso" | "honey";
  readonly status: VariantStatus;
  readonly result?: HairstyleEditResult;
  readonly error?: string;
}

const steps = ["Consent", "Photo", "Look", "Generate", "Compare", "Plan"] as const;

const baseVariants: readonly Variant[] = [
  {
    id: 0,
    name: "Closest match",
    description: "Follows the confirmed direction closely.",
    tone: "copper",
    status: "queued",
  },
  {
    id: 1,
    name: "Softer shape",
    description: "Keeps the direction with a gentler silhouette.",
    tone: "espresso",
    status: "queued",
  },
  {
    id: 2,
    name: "Bolder option",
    description: "Explores more movement while preserving the brief.",
    tone: "honey",
    status: "queued",
  },
];

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const normalize = (value: string) => value.trim().replaceAll(/\s+/g, " ");

function stableFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hairOnlyInspiration(value: string): string {
  const input = normalize(value);
  if (!input) return "";

  const attributes = [
    [/pixie/i, "short pixie silhouette"],
    [/\bbob\b/i, "bob silhouette"],
    [/shag/i, "layered shag silhouette"],
    [/fade/i, "graduated fade"],
    [/taper/i, "clean taper"],
    [/curtain/i, "curtain fringe"],
    [/\b(?:bangs?|fringe)\b/i, "fringe"],
    [/\b(?:curls?|curly|coils?|coily)\b/i, "defined curly or coily finish"],
    [/\b(?:waves?|wavy)\b/i, "soft wavy finish"],
    [/\b(?:braids?|braided)\b/i, "braided style"],
    [/\b(?:locs?|dreadlocks?)\b/i, "loc style"],
    [/\b(?:twists?|twisted)\b/i, "twisted style"],
    [/blond/i, "blonde color family"],
    [/copper/i, "copper color family"],
    [/silver|gr[ae]y/i, "gray or silver color family"],
    [/warm/i, "warm tone"],
    [/cool/i, "cool tone"],
    [/chin/i, "chin length"],
    [/shoulder/i, "shoulder length"],
    [/\b(?:short|shorter)\b/i, "shorter length"],
    [/\b(?:long|longer)\b/i, "longer length"],
    [/center.{0,6}part/i, "center part"],
    [/side.{0,6}part/i, "side part"],
  ]
    .filter(([pattern]) => (pattern as RegExp).test(input))
    .map(([, description]) => description as string)
    .filter((description, index, values) => values.indexOf(description) === index);

  return attributes.length
    ? `${attributes.join(", ")}. Use these visible hair attributes only; preserve the client’s identity.`
    : "";
}

export function ConsultationFlow() {
  const [hydrated, setHydrated] = useState(false);
  const [expiredShare, setExpiredShare] = useState(false);
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [referenceRights, setReferenceRights] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("");
  const [fileError, setFileError] = useState("");
  const [specification, setSpecification] = useState<HairSpecification>({
    ...defaultHairSpecification,
  });
  const [inspiration, setInspiration] = useState("");
  const [variants, setVariants] = useState<readonly Variant[]>(baseVariants);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [favorites, setFavorites] = useState<readonly number[]>([]);
  const [feasibility, setFeasibility] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [agreementConfirmed, setAgreementConfirmed] = useState(false);
  const [shareCreated, setShareCreated] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "Consent step. No image leaves this device before consent.",
  );
  const runToken = useRef(0);
  const attempts = useRef(new Map<number, number>());
  const deleteTrigger = useRef<"header" | "plan" | null>(null);
  const headerDeleteButton = useRef<HTMLButtonElement | null>(null);
  const planDeleteButton = useRef<HTMLButtonElement | null>(null);
  const keepConsultationButton = useRef<HTMLButtonElement | null>(null);

  const hasSource = Boolean(sourcePreview || sourceName === "Synthetic demo portrait");
  const readyVariants = variants.filter((variant) => variant.status === "ready");
  const selected = variants.find((variant) => variant.id === selectedVariant);
  const inspirationAttributes = hairOnlyInspiration(inspiration);
  const planReady = Boolean(
    feasibility && serviceNotes.trim() && agreementConfirmed,
  );
  const generationSpecification = {
    ...specification,
    inspirationAttributes,
  };
  const canGenerate = validateHairSpecification(generationSpecification).length === 0;

  const summary = useMemo(() => {
    const values = [
      specification.lengthGoal === "same" ? "" : `${specification.lengthGoal} length`,
      specification.silhouette,
      specification.texture === "same" ? "" : specification.texture,
      specification.baseColor,
      specification.tone,
      specification.fringe,
      specification.part,
      specification.volume,
      inspirationAttributes,
    ]
      .map(normalize)
      .filter(Boolean);
    return values.join(" · ") || "Choose at least one change";
  }, [inspirationAttributes, specification]);

  useEffect(() => {
    return () => {
      if (sourcePreview) URL.revokeObjectURL(sourcePreview);
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [sourcePreview, referencePreview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const shareToken = new URLSearchParams(window.location.search).get("share");
      if (shareToken) {
        const stored = window.sessionStorage.getItem(`hair-share:${shareToken}`);
        try {
          const record = stored ? (JSON.parse(stored) as { expiresAt?: number }) : null;
          setExpiredShare(!record?.expiresAt || Date.now() >= record.expiresAt);
        } catch {
          setExpiredShare(true);
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    const frame = window.requestAnimationFrame(() => {
      keepConsultationButton.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirmDelete]);

  function go(next: number, message: string) {
    setStep(next);
    setAnnouncement(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function invalidateAgreement() {
    if (shareCreated) window.sessionStorage.removeItem("hair-share:local-demo");
    setAgreementConfirmed(false);
    setShareCreated(false);
  }

  function openDeleteConfirmation(trigger: "header" | "plan") {
    deleteTrigger.current = trigger;
    setConfirmDelete(true);
  }

  function keepConsultation() {
    setConfirmDelete(false);
    window.requestAnimationFrame(() => {
      const trigger = deleteTrigger.current === "plan"
        ? planDeleteButton.current
        : headerDeleteButton.current;
      trigger?.focus();
    });
  }

  function updateSpec<K extends keyof HairSpecification>(
    key: K,
    value: HairSpecification[K],
  ) {
    setSpecification((current) => ({ ...current, [key]: value }));
    invalidateAgreement();
  }

  function chooseImage(
    event: ChangeEvent<HTMLInputElement>,
    kind: "source" | "reference",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      setFileError("Choose a JPEG, PNG, or WebP image no larger than 10 MB. Nothing was added.");
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setFileError("");

    if (kind === "source") {
      if (sourcePreview) URL.revokeObjectURL(sourcePreview);
      setSourcePreview(url);
      setSourceName(file.name);
      setAnnouncement("Photo held locally. Nothing was uploaded in this prototype.");
    } else {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
      setReferencePreview(url);
      setReferenceName(file.name);
      setAnnouncement("Reference held locally. Only its hair direction will be used.");
    }
    invalidateAgreement();
  }

  function useDemoPortrait() {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourcePreview(null);
    setSourceName("Synthetic demo portrait");
    setFileError("");
    invalidateAgreement();
    setAnnouncement("Using a synthetic placeholder. No personal image is involved.");
  }

  function scenarioFor(variantId: number, attempt: number): FakeProviderScenario {
    const scenario = new URLSearchParams(window.location.search).get("scenario");
    if (scenario === "partial" && variantId === 2 && attempt === 1) {
      return "provider_error";
    }
    if (scenario === "policy" && variantId === 0) return "policy_rejection";
    if (scenario === "timeout" && variantId === 1 && attempt === 1) return "timeout";
    return "success";
  }

  function generationDelayFor(variantId: number): number {
    const scenario = new URLSearchParams(window.location.search).get("scenario");
    if (scenario === "cancel") return [250, 1_000, 1_500][variantId] ?? 1_500;
    return 650 + variantId * 400;
  }

  async function generateOne(variant: Variant, token: number): Promise<boolean> {
    setVariants((current) =>
      current.map((item) =>
        item.id === variant.id ? { ...item, status: "running" } : item,
      ),
    );
    await wait(generationDelayFor(variant.id));
    if (runToken.current !== token) return false;

    try {
      const attempt = (attempts.current.get(variant.id) ?? 0) + 1;
      attempts.current.set(variant.id, attempt);
      const provider = new FakeHairstyleImageProvider(
        scenarioFor(variant.id, attempt),
      );
      const result = await provider.edit({
        requestId: `local-demo-${variant.id}`,
        sourceAssetId:
          sourceName === "Synthetic demo portrait" ? "synthetic-demo" : "local-photo",
        ...(referenceName ? { referenceAssetId: "local-reference" } : {}),
        specification: generationSpecification,
        strategy: "prompt-only",
        quality: "medium",
        promptVersion: "hair-v1",
        idempotencyKey: makeGenerationIdempotencyKey({
          consultationId: "local-demo",
          variantIndex: variant.id,
          promptVersion: "hair-v1",
          requestFingerprint: stableFingerprint(
            JSON.stringify(generationSpecification),
          ),
        }),
      });
      if (runToken.current !== token) return false;
      setVariants((current) =>
        current.map((item) =>
          item.id === variant.id ? { ...item, status: "ready", result } : item,
        ),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof HairstyleProviderError && error.code === "policy_rejection"
          ? "This request needs review before generation."
          : error instanceof HairstyleProviderError && error.code === "timeout"
            ? "No result arrived in time. Completed options remain available."
          : "This preview did not finish. Completed options remain available.";
      setVariants((current) =>
        current.map((item) =>
          item.id === variant.id ? { ...item, status: "failed", error: message } : item,
        ),
      );
      return false;
    }
  }

  async function generate(variantId?: number) {
    const token = runToken.current + 1;
    runToken.current = token;
    invalidateAgreement();
    const targets =
      variantId === undefined
        ? baseVariants
        : variants.filter((variant) => variant.id === variantId);

    if (variantId === undefined) {
      attempts.current.clear();
      setVariants(baseVariants);
      go(3, "Generating three simulated previews.");
    } else {
      setAnnouncement(`Retrying preview ${variantId + 1}.`);
    }

    const outcomes = await Promise.all(
      targets.map((variant) => generateOne(variant, token)),
    );
    if (runToken.current !== token) return;
    const firstReady = targets.find((_, index) => outcomes[index]);
    if (firstReady) setSelectedVariant(firstReady.id);
    go(4, "Preview simulation finished. Choose a direction or retry a failed result.");
  }

  function cancelGeneration() {
    runToken.current += 1;
    setVariants((current) =>
      current.map((variant) =>
        variant.status === "running" || variant.status === "queued"
          ? {
              ...variant,
              status: "canceled",
              error: "Canceled before completion. Completed options were kept.",
            }
          : variant,
      ),
    );
    const firstReady = variants.find((variant) => variant.status === "ready");
    if (firstReady) setSelectedVariant(firstReady.id);
    go(4, "Unfinished previews canceled. Completed previews were kept.");
  }

  function toggleFavorite(variantId: number) {
    setFavorites((current) => {
      if (current.includes(variantId)) {
        return current.filter((id) => id !== variantId);
      }
      if (current.length >= 2) {
        setAnnouncement("Choose up to two favorites. Remove one before adding another.");
        return current;
      }
      return [...current, variantId];
    });
  }

  function applyRefinement(label: string) {
    const updates: Readonly<Record<string, Partial<HairSpecification>>> = {
      "A little shorter": { lengthGoal: "shorter" },
      "Less volume": { volume: "reduced volume" },
      Warmer: { tone: "warm" },
      "Softer fringe": { fringe: "soft curtain fringe" },
    };
    setSpecification((current) => ({ ...current, ...updates[label] }));
    invalidateAgreement();
    go(2, `${label} added to the brief. Review it before generating new previews.`);
  }

  function createPrivateShare() {
    if (!planReady) return;
    window.sessionStorage.setItem(
      "hair-share:local-demo",
      JSON.stringify({
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
    );
    setShareCreated(true);
    setAnnouncement("Private demo link created. It expires within 24 hours.");
  }

  function deleteEverything() {
    runToken.current += 1;
    attempts.current.clear();
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    window.sessionStorage.removeItem("hair-share:local-demo");
    setSourcePreview(null);
    setSourceName("");
    setReferencePreview(null);
    setReferenceName("");
    setFileError("");
    setAdult(false);
    setProcessing(false);
    setReferenceRights(false);
    setSpecification({ ...defaultHairSpecification });
    setInspiration("");
    setVariants(baseVariants);
    setSelectedVariant(0);
    setFavorites([]);
    setFeasibility("");
    setServiceNotes("");
    setMaintenanceNotes("");
    setAgreementConfirmed(false);
    setShareCreated(false);
    setConfirmDelete(false);
    setDeleted(true);
    setAnnouncement("Consultation deleted and local image references released.");
  }

  function reset() {
    runToken.current += 1;
    attempts.current.clear();
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    window.sessionStorage.removeItem("hair-share:local-demo");
    window.history.replaceState(null, "", window.location.pathname);
    setStep(0);
    setAdult(false);
    setProcessing(false);
    setReferenceRights(false);
    setSourcePreview(null);
    setSourceName("");
    setReferencePreview(null);
    setReferenceName("");
    setFileError("");
    setSpecification({
      ...defaultHairSpecification,
    });
    setInspiration("");
    setVariants(baseVariants);
    setSelectedVariant(0);
    setFavorites([]);
    setFeasibility("");
    setServiceNotes("");
    setMaintenanceNotes("");
    setAgreementConfirmed(false);
    setShareCreated(false);
    setConfirmDelete(false);
    setDeleted(false);
    setDeclined(false);
    setExpiredShare(false);
    setAnnouncement("New consultation. No image has been uploaded.");
  }

  function declineConsent() {
    runToken.current += 1;
    attempts.current.clear();
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setAdult(false);
    setProcessing(false);
    setReferenceRights(false);
    setSourcePreview(null);
    setSourceName("");
    setReferencePreview(null);
    setReferenceName("");
    setFileError("");
    setDeclined(true);
    setAnnouncement("Consent declined. No photo was collected or uploaded.");
  }

  function portrait(label: string, tone?: Variant["tone"]) {
    if (sourcePreview) {
      return (
        <div className={`photo-frame ${tone ? `photo-frame--${tone}` : ""}`}>
          {/* Local blob URL; the prototype performs no upload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sourcePreview} alt={label} />
          {tone ? <span className="simulation-wash" aria-hidden="true" /> : null}
        </div>
      );
    }

    return (
      <div
        className={`demo-portrait ${tone ? `demo-portrait--${tone}` : ""}`}
        role="img"
        aria-label={label}
      >
        <span aria-hidden="true">h</span>
        <small>Synthetic demo portrait</small>
      </div>
    );
  }

  if (declined) {
    return (
      <main className="app-shell" data-app-ready={hydrated}>
        <header className="site-header">
          <button className="brand" type="button" onClick={reset}>
            <span>h</span>AIr
          </button>
        </header>
        <section className="screen screen--narrow empty-state">
          <span className="empty-state__icon" aria-hidden="true">✓</span>
          <h1>No photo collected</h1>
          <p>
            The client declined this AI consultation. The salon service can continue without
            hAIr, and no photo or consultation details were uploaded.
          </p>
          <button className="button button--primary button--wide" type="button" onClick={reset}>
            Start a new consultation
          </button>
        </section>
      </main>
    );
  }

  if (expiredShare) {
    return (
      <main className="app-shell" data-app-ready={hydrated}>
        <header className="site-header">
          <button className="brand" type="button" onClick={reset}>
            <span>h</span>AIr
          </button>
        </header>
        <section className="screen screen--narrow empty-state">
          <span className="empty-state__icon" aria-hidden="true">×</span>
          <h1>This private link has expired</h1>
          <p>
            The consultation is no longer available from this link. No portrait, preview, or
            client details are shown after expiry.
          </p>
          <button className="button button--primary button--wide" type="button" onClick={reset}>
            Start a new consultation
          </button>
        </section>
      </main>
    );
  }

  if (deleted) {
    return (
      <main className="app-shell" data-app-ready={hydrated}>
        <header className="site-header">
          <button className="brand" type="button" onClick={reset}>
            <span>h</span>AIr
          </button>
        </header>
        <section className="screen screen--narrow empty-state">
          <span className="empty-state__icon" aria-hidden="true">✓</span>
          <h1>Consultation deleted</h1>
          <p>
            Local image references and the simulated session were released. The live product
            will verify every storage and provider deletion before closing the request.
          </p>
          <button className="button button--primary button--wide" type="button" onClick={reset}>
            Start a new consultation
          </button>
        </section>
      </main>
    );
  }

  if (confirmDelete) {
    return (
      <main className="app-shell" data-app-ready={hydrated}>
        <section
          className="screen screen--narrow"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          aria-describedby="delete-description"
          onKeyDown={(event) => {
            if (event.key === "Escape") keepConsultation();
          }}
        >
          <p className="eyebrow eyebrow--danger">Permanent action</p>
          <h1 id="delete-title">Delete this consultation?</h1>
          <p id="delete-description">
            This removes the portrait, reference, previews, notes, and active share links.
            Downloaded copies on another device cannot be recalled.
          </p>
          <div className="danger-card">
            <strong>This cannot be undone.</strong>
            <span>The live product will issue a content-free deletion receipt.</span>
          </div>
          <div className="stacked-actions">
            <button
              className="button button--danger button--wide"
              type="button"
              onClick={deleteEverything}
            >
              Delete everything
            </button>
            <button
              ref={keepConsultationButton}
              className="button button--secondary button--wide"
              type="button"
              onClick={keepConsultation}
            >
              Keep consultation
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell" data-app-ready={hydrated}>
      <header className="site-header">
        <button className="brand" type="button" onClick={reset} aria-label="Start a new hAIr consultation">
          <span>h</span>AIr
        </button>
        <div className="header-copy">
          <strong>Consultation preview</strong>
          <small>Private by design</small>
        </div>
        {step > 0 ? (
          <button ref={headerDeleteButton} className="text-button text-button--danger" type="button" onClick={() => openDeleteConfirmation("header")}>
            Delete
          </button>
        ) : null}
      </header>

      <nav className="progress-nav" aria-label="Consultation progress">
        {steps.map((label, index) => (
          <div
            className={`${index === step ? "is-current" : ""} ${index < step ? "is-complete" : ""}`}
            key={label}
            aria-current={index === step ? "step" : undefined}
          >
            <span>{index < step ? "✓" : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </nav>
      <div className="announcement" aria-live="polite">{announcement}</div>

      {step === 0 ? (
        <section className="screen screen--narrow" aria-labelledby="consent-title">
          <p className="eyebrow">Private consultation</p>
          <h1 id="consent-title">First, the client stays in control.</h1>
          <p className="lede">
            hAIr creates hairstyle visualizations for a conversation with a stylist. It does
            not predict an exact haircut or chemical color result.
          </p>
          <div className="privacy-card">
            <strong>No photo leaves this device yet.</strong>
            <p>
              The live product encrypts photos, uses approved providers, and deletes originals
              after generation or within 24 hours. Saved consultation previews expire after 30
              days.
            </p>
          </div>
          <fieldset className="consent-list">
            <legend>Client acknowledgements</legend>
            <CheckRow checked={adult} onChange={setAdult}>
              I am the person pictured, I am 18 or older, and I choose to continue.
            </CheckRow>
            <CheckRow checked={processing} onChange={setProcessing}>
              I understand this is an AI preview and approve the photo processing described
              above.
            </CheckRow>
            <CheckRow checked={referenceRights} onChange={setReferenceRights}>
              I will only add reference images I am allowed to use.
            </CheckRow>
          </fieldset>
          <button
            className="button button--primary button--wide"
            type="button"
            disabled={!(adult && processing && referenceRights)}
            onClick={() => go(1, "Consent complete. Choose or take a photo.")}
          >
            Continue to photo
          </button>
          <button
            className="button text-button text-button--danger button--wide"
            type="button"
            onClick={declineConsent}
          >
            I do not agree — end here
          </button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="screen" aria-labelledby="photo-title">
          <ScreenHeading
            eyebrow="Photo"
            title="Keep the face straight and the hairline visible."
            description="Use even light, one person, and a neutral background. Avoid hats and heavy filters."
          />
          <div className="capture-grid">
            <div>
              {hasSource ? portrait("Selected consultation portrait") : (
                <div className="capture-empty">
                  <span aria-hidden="true">+</span>
                  <strong>No photo selected</strong>
                  <small>The image stays in this browser during the prototype.</small>
                </div>
              )}
            </div>
            <div className="capture-controls">
              <label className="button button--primary file-button">
                Take or choose photo
                <input
                  aria-describedby={fileError ? "photo-file-error" : undefined}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="user"
                  onChange={(event) => chooseImage(event, "source")}
                />
              </label>
              <button className="button button--secondary" type="button" onClick={useDemoPortrait}>
                Use synthetic demo portrait
              </button>
              {fileError ? <p id="photo-file-error" className="field-error" role="alert">{fileError}</p> : null}
              {hasSource ? (
                <div className="quality-list" role="status">
                  <span>✓ {sourceName === "Synthetic demo portrait" ? "Synthetic placeholder selected" : "Accepted image format"}</span>
                  <span>✓ Held only in this browser</span>
                  <span>Review the subject and hairline before continuing</span>
                </div>
              ) : null}
              <p className="microcopy">
                JPEG, PNG, or WebP. This prototype makes no network upload.
              </p>
            </div>
          </div>
          <ActionBar back={() => go(0, "Returned to consent.")} next={() => go(2, "Photo ready. Describe the desired look.")} nextDisabled={!hasSource} nextLabel="Describe the look" />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="screen" aria-labelledby="look-title">
          <ScreenHeading
            eyebrow="Look direction"
            title="What should change?"
            description="Choose the important details. The stylist can correct anything before generation."
          />
          <div className="form-layout">
            <div className="form-stack">
              <fieldset className="field-card">
                <legend>Length</legend>
                <div className="segmented-control">
                  {(["shorter", "same", "longer"] as const).map((value) => (
                    <label key={value}>
                      <input type="radio" name="length" checked={specification.lengthGoal === value} onChange={() => updateSpec("lengthGoal", value)} />
                      <span>{value[0]?.toUpperCase()}{value.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field-grid">
                <SelectField label="Shape or cut" value={specification.silhouette} onChange={(value) => updateSpec("silhouette", value)} options={[["", "Choose a direction"], ["chin-length blunt bob", "Chin-length blunt bob"], ["collarbone layers", "Collarbone layers"], ["textured crop", "Textured crop"], ["long rounded layers", "Long rounded layers"], ["clean high fade with textured top", "High fade + textured top"]]} />
                <SelectField label="Texture" value={specification.texture} onChange={(value) => updateSpec("texture", value as HairSpecification["texture"])} options={[["same", "Keep current texture"], ["straight", "Straight"], ["wavy", "Wavy"], ["curly", "Curly"], ["coily", "Coily"], ["protective", "Protective style"]]} />
                <SelectField label="Color family" value={specification.baseColor} onChange={(value) => updateSpec("baseColor", value)} options={[["", "Keep current color"], ["deep brunette", "Deep brunette"], ["soft black", "Soft black"], ["warm copper", "Warm copper"], ["golden blonde", "Golden blonde"], ["silver gray", "Silver gray"]]} />
                <SelectField label="Tone" value={specification.tone} onChange={(value) => updateSpec("tone", value)} options={[["", "Natural / unchanged"], ["cool", "Cool"], ["neutral", "Neutral"], ["warm", "Warm"], ["vivid", "Vivid"]]} />
                <SelectField label="Fringe" value={specification.fringe} onChange={(value) => updateSpec("fringe", value)} options={[["", "No fringe change"], ["soft curtain fringe", "Soft curtain fringe"], ["full blunt fringe", "Full blunt fringe"], ["side-swept fringe", "Side-swept fringe"], ["short textured fringe", "Short textured fringe"]]} />
                <SelectField label="Part" value={specification.part} onChange={(value) => updateSpec("part", value)} options={[["", "Keep current part"], ["center part", "Center"], ["soft side part", "Soft side"], ["deep side part", "Deep side"], ["no defined part", "No defined part"]]} />
              </div>
              <label>
                Celebrity, character, or plain-language inspiration
                <input value={inspiration} onChange={(event) => { setInspiration(event.target.value); invalidateAgreement(); }} placeholder="Example: Wednesday Addams hair, but shoulder length" />
                <small>We translate a name into hair attributes. We never copy that person’s face.</small>
              </label>
              {inspiration ? <div className="translation-preview"><strong>Hair-only interpretation</strong><p>{inspirationAttributes || "No visible hair attributes recognized. Add length, shape, texture, fringe, part, or color details."}</p></div> : null}
              <label className="button button--secondary file-button">
                {referenceName ? "Replace reference image" : "Add optional reference image"}
                <input aria-describedby={fileError ? "reference-file-error" : undefined} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseImage(event, "reference")} />
              </label>
              {fileError ? <p id="reference-file-error" className="field-error" role="alert">{fileError}</p> : null}
              {referenceName ? <p className="microcopy">Reference ready: {referenceName}. Only its hair direction will be used.</p> : null}
            </div>
            <aside className="look-summary">
              <p className="eyebrow">Current brief</p>
              <h2>{specification.silhouette || "Choose a cut or shape"}</h2>
              <p>{summary}</p>
              <div className="mini-preview">{portrait("Original consultation portrait")}</div>
              <p className="microcopy">The face, skin, expression, body, clothing, lighting, and background must stay unchanged.</p>
            </aside>
          </div>
          <ActionBar back={() => go(1, "Returned to photo.")} next={() => void generate()} nextDisabled={!canGenerate} nextLabel="Generate three previews" />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="screen">
          <ScreenHeading eyebrow="Private preview" title="Building three controlled variations." description="Completed results stay available if another option fails." />
          <div className="variant-grid" aria-live="polite">
            {variants.map((variant) => <article className="variant-card" key={variant.id}><div className={`result-placeholder result-placeholder--${variant.tone}`}>{variant.status === "running" ? <span className="spinner" aria-label={`Generating ${variant.name} preview`} /> : variant.id + 1}</div><div><strong>{variant.name}</strong><p>{variant.status === "ready" ? "Ready" : variant.status === "running" ? "Generating…" : "Waiting securely"}</p></div></article>)}
          </div>
          <button className="button button--secondary" type="button" onClick={cancelGeneration}>Cancel unfinished previews</button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="screen">
          <ScreenHeading eyebrow="Compare" title="Choose a direction, then let the stylist assess it." description="These cards use a deterministic fake provider; no live AI image call was made." />
          <div className="variant-grid">
            {variants.map((variant) => <article className={`variant-card ${selectedVariant === variant.id ? "is-selected" : ""}`} key={variant.id}>{variant.status === "ready" ? portrait(`${variant.name} simulated AI hairstyle preview`, variant.tone) : <div className="result-error"><strong>{variant.status === "running" ? "Generating preview" : variant.status === "canceled" ? "Preview canceled" : "Preview unavailable"}</strong><p>{variant.status === "running" ? "This option is being retried. Completed options remain available." : variant.error ?? "This option did not complete."}</p></div>}<div className="variant-card__body"><div className="variant-title-row"><div><span className="ai-badge">AI preview</span><h2>{variant.name}</h2></div><button className="favorite-button" type="button" aria-pressed={favorites.includes(variant.id)} aria-label={`${favorites.includes(variant.id) ? "Remove" : "Add"} ${variant.name} favorite`} onClick={() => toggleFavorite(variant.id)}>♥</button></div><p>{variant.description}</p>{variant.status === "ready" ? <button className="button button--secondary button--wide" type="button" onClick={() => { if (selectedVariant !== variant.id) { setSelectedVariant(variant.id); invalidateAgreement(); } }}>{selectedVariant === variant.id ? "Selected" : "Compare this option"}</button> : <button aria-label={`Retry ${variant.name} preview — Retry this preview`} className="button button--secondary button--wide" type="button" disabled={variant.status === "running"} onClick={() => void generate(variant.id)}>{variant.status === "running" ? "Retrying…" : "Retry this preview"}</button>}</div></article>)}
          </div>
          {readyVariants.length ? <div className="comparison-card"><div><span className="comparison-label">Original</span>{portrait("Original portrait")}</div><div><span className="comparison-label">{selected?.name} · AI preview</span>{portrait(`${selected?.name} simulated AI result`, selected?.tone)}</div></div> : null}
          <div className="refinement-row"><span>Quick refinement:</span>{["A little shorter", "Less volume", "Warmer", "Softer fringe"].map((label) => <button type="button" key={label} onClick={() => applyRefinement(label)}>{label}</button>)}</div>
          <ExpectationNote />
          <ActionBar back={() => go(2, "Returned to look details.")} next={() => go(5, "Preview chosen. Add the stylist’s feasibility assessment.")} nextDisabled={!readyVariants.length} nextLabel="Stylist review" />
        </section>
      ) : null}

      {step === 5 ? (
        <section className="screen">
          <ScreenHeading eyebrow="Professional review" title="Can this direction work for the client?" description="The stylist’s assessment turns an image into a useful consultation plan." />
          <div className="plan-grid">
            <div className="selected-result">{portrait(`${selected?.name ?? "Selected"} simulated AI preview`, selected?.tone)}<span className="ai-badge">AI preview · actual results vary</span></div>
            <div className="form-stack">
              <fieldset className="field-card"><legend>Feasibility</legend>{[["feasible-now", "Feasible now", "Realistic with the planned service."], ["needs-preparation", "Needs preparation or grow-out", "Explain steps or timing first."], ["inspiration-only", "Inspiration only", "Useful direction, but not achievable as shown."]].map(([value, label, help]) => <label className="radio-card" key={value}><input type="radio" name="feasibility" checked={feasibility === value} onChange={() => { setFeasibility(value ?? "feasible-now"); invalidateAgreement(); }} /><span><strong>{label}</strong><small>{help}</small></span></label>)}</fieldset>
              <label>Service notes<textarea value={serviceNotes} onChange={(event) => { setServiceNotes(event.target.value); invalidateAgreement(); }} placeholder="Preserve density at the temples; soften weight through the ends." /></label>
              <label>Maintenance notes<textarea value={maintenanceNotes} onChange={(event) => { setMaintenanceNotes(event.target.value); invalidateAgreement(); }} placeholder="Shape refresh in 6–8 weeks; use heat protection." /></label>
              <CheckRow
                checked={agreementConfirmed}
                onChange={(checked) => {
                  if (checked) {
                    setAgreementConfirmed(true);
                  } else {
                    invalidateAgreement();
                  }
                }}
              >
                The client and stylist agree this is the direction to discuss for the service.
              </CheckRow>
              {!planReady ? <p className="microcopy">Choose a feasibility assessment, add service notes, and confirm agreement before sharing or printing the plan.</p> : null}
            </div>
          </div>
          <article className="consultation-board"><div className="board-visual">{portrait(`${selected?.name ?? "Selected"} simulated AI preview`, selected?.tone)}<span className="ai-badge">AI hairstyle preview</span></div><div className="board-content"><span className={`feasibility feasibility--${feasibility || "pending"}`}>{feasibility === "feasible-now" ? "Feasible now" : feasibility === "needs-preparation" ? "Needs preparation or grow-out" : feasibility === "inspiration-only" ? "Inspiration only" : "Stylist assessment pending"}</span><h2>{selected?.name ?? "Selected direction"}</h2><p>{summary}</p><dl><dt>Service direction</dt><dd>{serviceNotes || "Discuss and confirm service steps with the stylist."}</dd><dt>Maintenance</dt><dd>{maintenanceNotes || "Stylist to confirm upkeep and timing."}</dd></dl><ExpectationNote /></div></article>
          {shareCreated ? <div className="share-confirmation" role="status"><strong>Private demo link created</strong><span>No image was uploaded. A live link would expire within 24 hours.</span></div> : null}
          <div className="completion-actions"><button className="button button--primary" type="button" disabled={!planReady} onClick={createPrivateShare}>Create private 24-hour link</button><button className="button button--secondary" type="button" disabled={!planReady} onClick={() => window.print()}>Print or save board</button><button className="button button--secondary" type="button" onClick={() => go(4, "Returned to comparison.")}>Back to compare</button><button ref={planDeleteButton} className="text-button text-button--danger" type="button" onClick={() => openDeleteConfirmation("plan")}>Delete this consultation</button></div>
        </section>
      ) : null}

      <footer className="site-footer"><span>hAIr · working prototype</span><span>No live AI or cloud upload in this build</span></footer>
    </main>
  );
}

function CheckRow({ children, checked, onChange }: Readonly<{ children: React.ReactNode; checked: boolean; onChange: (checked: boolean) => void }>) {
  return <label className="check-row"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{children}</span></label>;
}

function ScreenHeading({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return <div className="screen-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>;
}

function SelectField({ label, value, options, onChange }: Readonly<{ label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }>) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={`${label}-${optionValue}`}>{optionLabel}</option>)}</select></label>;
}

function ActionBar({ back, next, nextDisabled, nextLabel }: Readonly<{ back: () => void; next: () => void; nextDisabled: boolean; nextLabel: string }>) {
  return <div className="action-bar"><button className="button button--secondary" type="button" onClick={back}>Back</button><button className="button button--primary" type="button" disabled={nextDisabled} onClick={next}>{nextLabel}</button></div>;
}

function ExpectationNote() {
  return <div className="expectation-note"><strong>Visualization, not a promise.</strong><span>Starting hair, condition, technique, lighting, and maintenance affect the real result.</span></div>;
}
