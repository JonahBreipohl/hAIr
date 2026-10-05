(function () {
  "use strict";

  const app = document.querySelector("#app");
  const stepper = document.querySelector("#stepper");
  const headerDelete = document.querySelector("#header-delete");
  const routeStatus = document.querySelector("#route-status");
  const toastNode = document.querySelector("#toast");
  const deleteDialog = document.querySelector("#delete-dialog");
  const scenarioSelect = document.querySelector("#scenario-select");

  const STEPS = ["Consent", "Photo", "Describe", "Confirm", "Previews", "Compare", "Plan"];
  const STEP_FOR_SCREEN = {
    consent: 0,
    capture: 1,
    describe: 2,
    confirm: 3,
    generate: 4,
    compare: 5,
    plan: 6,
    share: 6,
  };

  const SPEC_OPTIONS = {
    length: [
      ["shorter", "Shorter"],
      ["keep", "Keep length"],
      ["longer", "Longer"],
    ],
    shape: [
      ["keep", "Keep shape"],
      ["layers", "Layers"],
      ["blunt", "Blunt shape"],
      ["bob", "Bob"],
      ["pixie", "Pixie"],
      ["fade", "Fade or taper"],
    ],
    texture: [
      ["keep", "Keep natural pattern"],
      ["smooth", "Smoother"],
      ["wavy", "Wavy"],
      ["curly", "Curly or coily"],
      ["protective", "Braids, locs, or twists"],
    ],
    volume: [
      ["less", "Less"],
      ["keep", "Keep volume"],
      ["more", "More"],
    ],
    fringe: [
      ["keep", "Keep current"],
      ["none", "No fringe"],
      ["curtain", "Curtain fringe"],
      ["full", "Full fringe"],
    ],
    part: [
      ["keep", "Keep current"],
      ["center", "Center"],
      ["side", "Side"],
      ["none", "No visible part"],
    ],
    color: [
      ["none", "No color change"],
      ["black", "Natural black"],
      ["brunette", "Brunette"],
      ["blonde", "Blonde"],
      ["copper", "Copper"],
      ["red", "Red"],
      ["gray", "Gray or silver"],
      ["vivid", "Vivid color"],
    ],
    tone: [
      ["none", "No tone change"],
      ["cool", "Cool"],
      ["neutral", "Neutral"],
      ["warm", "Warm"],
    ],
    finish: [
      ["natural", "Natural"],
      ["polished", "Polished"],
      ["tousled", "Tousled"],
      ["defined", "Defined"],
    ],
    maintenance: [
      ["low", "Low"],
      ["medium", "Moderate"],
      ["high", "High"],
    ],
  };

  const jobTimers = new Map();
  let toastTimer = null;

  function freshState(scenario) {
    return {
      screen: "home",
      scenario: scenario || "partial",
      consent: { adult: false, purpose: false, receipt: false },
      photoStatus: "empty",
      captureAttempts: 0,
      referenceType: "description",
      referenceInput: "",
      referenceHairAttributes: "",
      referenceImageAdded: false,
      additionalNotes: "",
      spec: {
        length: "",
        shape: "",
        texture: "",
        volume: "",
        fringe: "",
        part: "",
        color: "none",
        tone: "none",
        finish: "",
        maintenance: "",
      },
      variants: [],
      activeVariantIds: [],
      generationMode: "initial",
      batchRejected: false,
      selectedVariantId: "",
      favoriteIds: [],
      chosenVariantId: "",
      refinement: "",
      feasibility: "",
      serviceNotes: "",
      maintenanceNotes: "",
      planAgreed: false,
      saveFor30Days: false,
      shareCreated: false,
      errors: {},
    };
  }

  let state = freshState(scenarioSelect.value);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function labelFor(group, value) {
    const match = (SPEC_OPTIONS[group] || []).find(([key]) => key === value);
    return match ? match[1] : "Not specified";
  }

  function portrait(kind, label) {
    return `
      <div class="portrait portrait--${escapeHtml(kind)}" role="img" aria-label="${escapeHtml(label)}">
        <span class="portrait__bust" aria-hidden="true"></span>
        <span class="portrait__neck" aria-hidden="true"></span>
        <span class="portrait__face" aria-hidden="true"></span>
        <span class="portrait__hair" aria-hidden="true"></span>
        <span class="portrait__label">Synthetic placeholder</span>
      </div>`;
  }

  function privacyStrip() {
    return `
      <div class="privacy-strip">
        <span class="privacy-strip__icon" aria-hidden="true">⌁</span>
        <span><strong>Private consultation.</strong> The source photo and unsaved previews are scheduled for deletion within 24 hours. Delete sooner at any time.</span>
      </div>`;
  }

  function notice(type, title, body, icon) {
    const modifier = type ? ` notice--${type}` : "";
    return `
      <div class="notice${modifier}" role="${type === "danger" ? "alert" : "status"}">
        <span class="notice__icon" aria-hidden="true">${escapeHtml(icon || "i")}</span>
        <div class="notice__body"><h3>${escapeHtml(title)}</h3><p>${body}</p></div>
      </div>`;
  }

  function errorSummary(message, id) {
    if (!message) return "";
    return `
      <div id="${escapeHtml(id || "error-summary")}" class="error-summary" tabindex="-1" role="alert">
        <h2>Check this step</h2>
        <p>${escapeHtml(message)}</p>
      </div>`;
  }

  function stickyActions(backAction, backLabel, nextAction, nextLabel, nextDisabled) {
    return `
      <div class="sticky-actions">
        <div class="sticky-actions__inner">
          <button class="button button--secondary" type="button" data-action="${escapeHtml(backAction)}">${escapeHtml(backLabel)}</button>
          <button class="button" type="button" data-action="${escapeHtml(nextAction)}" ${nextDisabled ? "disabled" : ""}>${escapeHtml(nextLabel)}</button>
        </div>
      </div>`;
  }

  function radioField(group, legend, help) {
    const options = SPEC_OPTIONS[group];
    return `
      <fieldset class="field-card">
        <legend>${escapeHtml(legend)}</legend>
        ${help ? `<p class="field-help">${escapeHtml(help)}</p>` : ""}
        <div class="chip-group">
          ${options
            .map(
              ([value, label]) => `
                <label class="chip">
                  <input type="radio" name="${escapeHtml(group)}" value="${escapeHtml(value)}" data-spec="${escapeHtml(group)}" ${state.spec[group] === value ? "checked" : ""}>
                  <span>${escapeHtml(label)}</span>
                </label>`,
            )
            .join("")}
        </div>
      </fieldset>`;
  }

  function renderHome() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="screen__intro">
          <p class="eyebrow">Salon consultation</p>
          <h1 id="screen-title" tabindex="-1">Turn inspiration into a shared hair plan</h1>
          <p class="lede">Create clearly labeled AI hairstyle visualizations, compare directions, and record what the stylist says is achievable.</p>
        </div>
        <div class="card card--hero">
          ${portrait("preview-1", "Abstract synthetic hairstyle preview; no real person")}
          <div class="card--hero__body">
            <ul class="check-list">
              <li>Adult client consent comes before any photo</li>
              <li>Three private previews show up as each one finishes</li>
              <li>The stylist records feasibility before sharing</li>
            </ul>
            <div class="notice notice--warning">
              <span class="notice__icon" aria-hidden="true">AI</span>
              <div class="notice__body"><strong>Visualization, not a promise.</strong> Hair condition, starting color, technique, lighting, and maintenance affect real results.</div>
            </div>
          </div>
        </div>
        ${stickyActions("client-handoff", "Use client’s phone", "new-consultation", "New consultation")}
      </section>`;
  }

  function renderHandoff() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="screen__intro">
          <p class="eyebrow">Optional handoff</p>
          <h1 id="screen-title" tabindex="-1">Let the client use their phone</h1>
          <p class="lede">In the product, a private handoff lets the client review consent and choose a photo on their own device. No client account is needed.</p>
        </div>
        <div class="card">
          <div class="qr-placeholder" role="img" aria-label="Non-scannable placeholder for a client handoff code"></div>
          <h2>Demo handoff code</h2>
          <p>This placeholder is intentionally not scannable. A live code would expire after 10 minutes and open on the consent screen before any upload.</p>
          <p class="help">The stylist’s screen would show when consent is completed, without displaying the client’s photo in a notification.</p>
        </div>
        ${stickyActions("home-screen", "Back", "continue-here", "Continue on this device")}
      </section>`;
  }

  function renderConsent() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="screen__intro">
          <p class="eyebrow">Client review</p>
          <h1 id="screen-title" tabindex="-1">Before we use your photo</h1>
          <p class="lede">Please read this yourself. The stylist can answer questions, but the choice is yours.</p>
        </div>
        ${errorSummary(state.errors.consent, "consent-error")}
        <div class="card">
          <h2>What happens</h2>
          <ul class="plain-list">
            <li><strong>Purpose:</strong> This salon uses your photo with its approved AI image processor to create hairstyle visualizations for this consultation.</li>
            <li><strong>Limits:</strong> The AI can be wrong or unrealistic. It does not predict an exact haircut, color, or chemical result.</li>
            <li><strong>Training:</strong> hAIr does not use your photo to train AI models or place it in a public gallery.</li>
            <li><strong>Retention:</strong> The source photo is removed after processing, with a 24-hour hard maximum. Unsaved previews expire within 24 hours. A plan you explicitly save expires within 30 days.</li>
            <li><strong>Control:</strong> You can delete the photo, previews, notes, and active links immediately from any later step.</li>
            <li><strong>Adults only:</strong> This pilot is for people aged 18 or older.</li>
          </ul>
          <div class="consent-list">
            <label class="check-row">
              <input type="checkbox" data-field="consent-adult" ${state.consent.adult ? "checked" : ""}>
              <span>I am 18 or older, and I am the person who will appear in the photo.<small>Do not continue with a photo of someone else or anyone under 18.</small></span>
            </label>
            <label class="check-row">
              <input type="checkbox" data-field="consent-purpose" ${state.consent.purpose ? "checked" : ""}>
              <span>I agree to my photo being processed to create private AI hairstyle visualizations for this consultation.<small>I understand that I can stop and delete the consultation.</small></span>
            </label>
          </div>
          <button class="button button--text button--danger" type="button" data-action="decline-consent">I do not agree — end here</button>
        </div>
        ${stickyActions("home-screen", "Back", "continue-consent", "Agree and continue")}
      </section>`;
  }

  function photoStatusMarkup() {
    if (state.photoStatus === "good") {
      return `
        ${portrait("source", "Abstract synthetic source-photo placeholder; no real person")}
        ${notice("success", "Photo ready", "One adult subject, visible hairline, usable lighting, and a clear front or slight three-quarter view.", "✓")}`;
    }
    if (state.photoStatus === "camera-unavailable") {
      return notice("warning", "Camera is unavailable", "Camera permission may be blocked or this browser may not support capture. Choose a photo from this device instead.", "!");
    }
    if (state.photoStatus === "needs-retake") {
      return notice("warning", "Please retake this photo", "The face or hairline is too dark to check. Move toward even light, keep the full hair outline in frame, and try again.", "!");
    }
    if (state.photoStatus === "multiple-faces") {
      return notice("warning", "Use a photo with one person", "More than one face is visible. Crop or retake so only the consenting client appears.", "!");
    }
    if (state.photoStatus === "invalid-file") {
      return notice("danger", "That file cannot be used", "Choose a JPEG, PNG, or WebP image up to 10 MB. Nothing was uploaded.", "×");
    }
    return `
      <div class="camera-frame" aria-label="Guided capture area">
        <div class="camera-frame__prompt">Center the full head and shoulders inside the guide</div>
      </div>`;
  }

  function renderCapture() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Guided photo</p>
          <h1 id="screen-title" tabindex="-1">Show the whole hair outline</h1>
          <p class="lede">Use an evenly lit front or slight three-quarter photo. Keep the face, hairline, ears, neck, and shoulders visible.</p>
        </div>
        ${errorSummary(state.errors.photo, "photo-error")}
        <div class="capture-layout">
          <div>${photoStatusMarkup()}</div>
          <div>
            <div class="card">
              <h2>Quick photo check</h2>
              <ul class="guidance-list">
                <li>One consenting adult only</li>
                <li>Even light; no strong backlight</li>
                <li>No hat, filter, or hair covering the face</li>
                <li>Camera near eye level; no severe angle or blur</li>
              </ul>
              <div class="capture-actions">
                <button class="button" type="button" data-action="take-photo">Take photo</button>
                <button class="button button--secondary" type="button" data-action="upload-photo">Choose from device</button>
                <button class="button button--ghost" type="button" data-action="use-synthetic">Use synthetic demo photo</button>
              </div>
              <input id="camera-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="user" data-photo-input="camera" tabindex="-1">
              <input id="upload-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" data-photo-input="upload" tabindex="-1">
              <p class="help">Prototype: selected files stay in this browser and are never displayed or uploaded. The live product will re-encode accepted images to remove metadata before upload.</p>
            </div>
          </div>
        </div>
        ${stickyActions("back-consent", "Back", "continue-photo", "Use this photo", state.photoStatus !== "good")}
      </section>`;
  }

  function referenceMarkup() {
    if (state.referenceType === "image") {
      return `
        <div class="file-drop">
          ${state.referenceImageAdded ? `<div><p><strong>Hair inspiration added</strong></p><p class="help">The prototype does not retain or display the selected file.</p><button class="button button--small button--secondary" type="button" data-action="remove-reference">Remove reference</button></div>` : `<div><p><strong>Add an image for hair inspiration</strong></p><p class="help">Use only an image you are allowed to share. The face in a reference is never copied.</p><button class="button button--small button--secondary" type="button" data-action="add-reference-image">Choose image</button></div>`}
          <input id="reference-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" data-reference-input tabindex="-1">
        </div>`;
    }
    return `
      <div class="form-group">
        <label for="reference-name">Person, character, era, or look</label>
        <input id="reference-name" type="text" data-field="reference-input" value="${escapeHtml(state.referenceInput)}" placeholder="Example: a shoulder-length 1970s shag">
        <p class="help">A name is treated only as shorthand for visible hair attributes. It will not copy another person’s face or identity.</p>
      </div>
      <button class="button button--secondary button--small" type="button" data-action="translate-reference">Turn into hair attributes</button>
      ${state.referenceHairAttributes ? `
        <div class="form-group" style="margin-top: 1rem">
          <label for="hair-attributes">Hair-only description to confirm</label>
          <textarea id="hair-attributes" data-field="reference-hair-attributes">${escapeHtml(state.referenceHairAttributes)}</textarea>
          <p class="help">Edit anything that is wrong. Only this hair description moves forward.</p>
        </div>` : ""}`;
  }

  function renderDescribe() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Hair goals</p>
          <h1 id="screen-title" tabindex="-1">What should change?</h1>
          <p class="lede">Choose only what matters. “Keep current” tells the generator what not to change, and the stylist can correct any assumption.</p>
        </div>
        ${errorSummary(state.errors.describe, "describe-error")}
        <div class="field-grid">
          ${radioField("length", "Length", "Choose the intended direction, not a precise measurement.")}
          ${radioField("shape", "Shape or cut", "Select the clearest overall silhouette.")}
          ${radioField("texture", "Texture or style family", "This is the desired finish; it does not infer the client’s identity.")}
          ${radioField("volume", "Volume")}
          ${radioField("fringe", "Fringe")}
          ${radioField("part", "Part")}
          ${radioField("color", "Color family", "A family is more honest than an exact swatch on a screen.")}
          ${radioField("tone", "Color tone")}
          ${radioField("finish", "Finish")}
          ${radioField("maintenance", "Maintenance comfort", "The stylist uses this in the service plan; it does not change the photo by itself.")}
        </div>

        <div class="card" style="margin-top: 1rem">
          <h2>Add inspiration <span class="help">(optional)</span></h2>
          <div class="tab-list" role="tablist" aria-label="Inspiration type">
            <button id="reference-description-tab" type="button" role="tab" aria-selected="${state.referenceType === "description"}" aria-controls="reference-panel" data-action="reference-type" data-value="description">Name or description</button>
            <button id="reference-image-tab" type="button" role="tab" aria-selected="${state.referenceType === "image"}" aria-controls="reference-panel" data-action="reference-type" data-value="image">Reference image</button>
          </div>
          <div id="reference-panel" role="tabpanel" aria-labelledby="reference-${state.referenceType}-tab">
            ${referenceMarkup()}
          </div>
        </div>

        <div class="card">
          <div class="form-group">
            <label for="additional-notes">Anything else? <span class="help">(optional)</span></label>
            <textarea id="additional-notes" data-field="additional-notes" placeholder="Example: keep natural curl definition; no bangs; preserve gray at the temples">${escapeHtml(state.additionalNotes)}</textarea>
            <p class="help">Describe hair only. Do not add a client name, health information, or a request to change the face or body.</p>
          </div>
        </div>
        ${stickyActions("back-photo", "Back", "continue-describe", "Review the look")}
      </section>`;
  }

  function requestedSummary() {
    const rows = [];
    ["length", "shape", "texture", "volume", "fringe", "part", "color", "tone", "finish", "maintenance"].forEach((key) => {
      const value = state.spec[key];
      if (value && value !== "none") rows.push([key === "maintenance" ? "Maintenance" : key[0].toUpperCase() + key.slice(1), labelFor(key, value)]);
    });
    if (state.referenceHairAttributes) rows.push(["Inspiration", state.referenceHairAttributes]);
    else if (state.referenceImageAdded) rows.push(["Inspiration", "User-supplied image; hair attributes only"]);
    if (state.additionalNotes.trim()) rows.push(["Details", state.additionalNotes.trim()]);
    return rows;
  }

  function summaryList(rows) {
    return `<dl class="summary-list">${rows.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
  }

  function renderConfirm() {
    const rows = requestedSummary();
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Confirm request</p>
          <h1 id="screen-title" tabindex="-1">Check the hair-only direction</h1>
          <p class="lede">Correct any assumption before generating. This is the request the image service will receive.</p>
        </div>
        <div class="summary-card">
          <h2>Requested hair changes</h2>
          ${summaryList(rows)}
        </div>
        <div class="summary-card" style="margin-top: 0.85rem">
          <h2>Keep fixed</h2>
          <p>Face shape and features, skin tone, age appearance, expression, body, clothing, pose, background, lighting, and camera view.</p>
          <p class="help">A reference contributes cut, length, color, texture, silhouette, and finish only. It never contributes the reference person’s face or identity.</p>
        </div>
        ${notice("warning", "AI hairstyle visualization", "The previews may be inaccurate or physically unachievable. Starting hair, condition, texture, color history, technique, lighting, and maintenance affect the real service. The stylist will assess feasibility before anything is shared.", "AI")}
        ${stickyActions("back-describe", "Edit request", "start-generation", "Generate 3 previews")}
      </section>`;
  }

  function resultStatus(variant) {
    if (variant.status === "succeeded") {
      return `
        <div class="result-card__visual">${portrait(variant.visual, `${variant.label}, abstract AI hairstyle visualization placeholder`)}</div>
        <div class="result-card__body">
          <div class="result-card__topline"><h3>${escapeHtml(variant.label)}</h3><span class="status-pill status-pill--success">✓ Ready</span></div>
          <p class="help">AI visualization — actual results vary.</p>
        </div>`;
    }
    if (variant.status === "failed") {
      return `
        <div class="result-card__visual skeleton" aria-hidden="true">No preview</div>
        <div class="result-card__body">
          <div class="result-card__topline"><h3>${escapeHtml(variant.label)}</h3><span class="status-pill status-pill--danger">× Failed</span></div>
          <p>This preview couldn’t be created. Completed previews are safe.</p>
          <button class="button button--small button--secondary" type="button" data-action="retry-variant" data-id="${escapeHtml(variant.id)}">Retry only this preview</button>
        </div>`;
    }
    if (variant.status === "timed-out") {
      return `
        <div class="result-card__visual skeleton" aria-hidden="true">Timed out</div>
        <div class="result-card__body">
          <div class="result-card__topline"><h3>${escapeHtml(variant.label)}</h3><span class="status-pill status-pill--warning">! Took too long</span></div>
          <p>No result arrived in time. Completed previews are safe.</p>
          <button class="button button--small button--secondary" type="button" data-action="retry-variant" data-id="${escapeHtml(variant.id)}">Retry only this preview</button>
        </div>`;
    }
    if (variant.status === "canceled") {
      return `
        <div class="result-card__visual skeleton" aria-hidden="true">Canceled</div>
        <div class="result-card__body">
          <div class="result-card__topline"><h3>${escapeHtml(variant.label)}</h3><span class="status-pill">Canceled</span></div>
          <p>This preview was stopped. Completed previews were kept.</p>
          <button class="button button--small button--secondary" type="button" data-action="retry-variant" data-id="${escapeHtml(variant.id)}">Start this preview again</button>
        </div>`;
    }
    const statusText = variant.status === "queued" ? "Queued" : "Creating";
    return `
      <div class="result-card__visual skeleton"><span>${statusText}…</span></div>
      <div class="result-card__body">
        <div class="result-card__topline"><h3>${escapeHtml(variant.label)}</h3><span class="status-pill">${statusText}</span></div>
        <div class="progress" data-progress-id="${escapeHtml(variant.id)}" role="progressbar" aria-label="${escapeHtml(variant.label)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${variant.progress}">
          <div class="progress__bar" style="width: ${variant.progress}%"></div>
        </div>
        <p class="help">You can leave this screen; finished previews will be kept.</p>
      </div>`;
  }

  function renderGenerate() {
    if (state.batchRejected) {
      return `
        <section class="screen" aria-labelledby="screen-title">
          ${privacyStrip()}
          <div class="screen__intro">
            <p class="eyebrow">Request check</p>
            <h1 id="screen-title" tabindex="-1">This request needs revision</h1>
            <p class="lede">No preview was created. The request appears to ask for more than a hairstyle change or to copy another person’s identity.</p>
          </div>
          ${notice("danger", "Keep the request hair-only", "Remove face, body, age, skin, identity-copying, or exact-outcome instructions. A public figure or character can be described using visible hair attributes.", "×")}
          <div class="button-row button-row--wrap">
            <button class="button" type="button" data-action="edit-rejected-request">Edit request</button>
            <button class="button button--secondary" type="button" data-action="back-confirm">Review structured look</button>
          </div>
        </section>`;
    }

    const visibleVariants = state.activeVariantIds.map((id) => state.variants.find((variant) => variant.id === id)).filter(Boolean);
    const anyPending = visibleVariants.some((variant) => ["queued", "running"].includes(variant.status));
    const successes = state.variants.filter((variant) => variant.status === "succeeded");
    const heading = state.generationMode === "refinement" ? "Creating one controlled refinement" : "Creating three previews";
    const lede = state.generationMode === "refinement" ? "Only the selected attribute changes. Your earlier previews stay available." : "Each preview completes independently. You can compare ready results while another finishes or retry only the one that fails.";
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Private generation</p>
          <h1 id="screen-title" tabindex="-1">${heading}</h1>
          <p class="lede">${lede}</p>
        </div>
        <div class="result-grid">
          ${visibleVariants.map((variant) => `<article class="result-card">${resultStatus(variant)}</article>`).join("")}
        </div>
        <div class="button-row button-row--wrap" style="margin-top: 1rem">
          ${anyPending ? `<button class="button button--secondary" type="button" data-action="cancel-remaining">Cancel unfinished previews</button>` : ""}
          ${successes.length ? `<button class="button" type="button" data-action="continue-results">${state.generationMode === "refinement" ? "Compare refinement" : `Compare ${successes.length} ready preview${successes.length === 1 ? "" : "s"}`}</button>` : ""}
        </div>
        <p class="help" style="margin-top: 1rem">Canceling stops unfinished work and keeps every completed preview. A late result from canceled work will not be displayed.</p>
      </section>`;
  }

  function variantById(id) {
    return state.variants.find((variant) => variant.id === id);
  }

  function renderCompare() {
    const successes = state.variants.filter((variant) => variant.status === "succeeded");
    let selected = variantById(state.selectedVariantId);
    if (!selected || selected.status !== "succeeded") selected = successes[0];
    if (!selected) {
      return `
        <section class="screen" aria-labelledby="screen-title">
          <h1 id="screen-title" tabindex="-1">No preview is ready yet</h1>
          <p>Return to generation to retry or wait for a result.</p>
          <button class="button" type="button" data-action="back-generate">Return to previews</button>
        </section>`;
    }
    state.selectedVariantId = selected.id;
    const isFavorite = state.favoriteIds.includes(selected.id);
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Compare</p>
          <h1 id="screen-title" tabindex="-1">Keep the original in view</h1>
          <p class="lede">Compare hair direction without treating the visualization as a guaranteed result.</p>
        </div>
        <div class="comparison-grid">
          <div class="comparison-panel">
            <div class="comparison-label"><span>Original</span></div>
            ${portrait("source", "Abstract synthetic original-photo placeholder")}
          </div>
          <div class="comparison-panel">
            <div class="comparison-label"><span>${escapeHtml(selected.label)}</span><span class="ai-label">AI visualization</span></div>
            ${portrait(selected.visual, `${selected.label}, abstract AI hairstyle visualization placeholder`)}
          </div>
        </div>
        <div class="variant-tabs" aria-label="Ready previews">
          ${successes.map((variant) => `<button class="variant-tab" type="button" data-action="select-variant" data-id="${escapeHtml(variant.id)}" aria-pressed="${variant.id === selected.id}">${escapeHtml(variant.label)} ${state.favoriteIds.includes(variant.id) ? "★" : ""}</button>`).join("")}
        </div>
        <div class="button-row button-row--wrap">
          <button class="button button--secondary" type="button" data-action="toggle-favorite" aria-pressed="${isFavorite}"><span class="favorite-icon" aria-hidden="true">${isFavorite ? "★" : "☆"}</span>${isFavorite ? "Favorited" : "Favorite this"}</button>
          <button class="button" type="button" data-action="choose-plan">Use this preview for the plan</button>
        </div>
        ${notice("warning", "Check more than the hair", "If the face, skin tone, age appearance, expression, body, clothing, or background changed, do not use this preview. Report it and choose another.", "!")}
        <fieldset class="field-card" style="margin-top: 1rem">
          <legend>Refine one thing</legend>
          <p class="field-help">One change at a time makes the result easier to compare. Everything else stays fixed.</p>
          <div class="chip-group">
            ${[
              ["shorter", "A little shorter"],
              ["warmer", "Warmer color"],
              ["less-volume", "Less volume"],
              ["add-fringe", "Add fringe"],
              ["raise-fade", "Raise fade"],
            ].map(([value, label]) => `<label class="chip"><input type="radio" name="refinement" value="${value}" data-field="refinement" ${state.refinement === value ? "checked" : ""}><span>${label}</span></label>`).join("")}
          </div>
          <button class="button button--secondary" style="margin-top: 0.8rem" type="button" data-action="start-refinement" ${state.refinement ? "" : "disabled"}>Create one refined preview</button>
        </fieldset>
        <p class="help">Up to two favorites can be marked for discussion. The plan uses the preview you explicitly choose.</p>
      </section>`;
  }

  function renderPlan() {
    const chosen = variantById(state.chosenVariantId) || variantById(state.selectedVariantId);
    return `
      <section class="screen" aria-labelledby="screen-title">
        ${privacyStrip()}
        <div class="screen__intro">
          <p class="eyebrow">Stylist review</p>
          <h1 id="screen-title" tabindex="-1">Can this direction be achieved?</h1>
          <p class="lede">The stylist’s professional judgment is part of the plan. The image alone is not an approval or service promise.</p>
        </div>
        ${errorSummary(state.errors.plan, "plan-error")}
        <div class="plan-preview">
          <div>
            ${portrait(chosen ? chosen.visual : "preview-1", "Chosen abstract AI hairstyle visualization placeholder")}
            <p class="ai-label" style="margin-top: 0.5rem">AI hairstyle visualization — actual results vary</p>
          </div>
          <div>
            <fieldset class="field-card">
              <legend>Stylist feasibility</legend>
              <div class="consent-list">
                ${[
                  ["now", "Feasible now", "The direction is reasonable for the client’s current hair and agreed service."],
                  ["prepare", "Needs preparation or grow-out", "A staged plan, strand test, repair, color correction, or more length may be needed."],
                  ["inspiration", "Inspiration only", "Use the image to discuss direction; do not present it as currently achievable."],
                ].map(([value, label, help]) => `<label class="check-row"><input type="radio" name="feasibility" value="${value}" data-field="feasibility" ${state.feasibility === value ? "checked" : ""}><span>${label}<small>${help}</small></span></label>`).join("")}
              </div>
            </fieldset>
            <div class="field-card">
              <div class="form-group">
                <label for="service-notes">Service direction</label>
                <textarea id="service-notes" data-field="service-notes" placeholder="Example: consultation cut; preserve curl pattern; remove about 4 cm; soft long layers">${escapeHtml(state.serviceNotes)}</textarea>
                <p class="help">Describe the agreed direction. Do not record a diagnosis or guarantee an exact chemical formula or result.</p>
              </div>
              <div class="form-group">
                <label for="maintenance-notes">Maintenance notes <span class="help">(optional)</span></label>
                <textarea id="maintenance-notes" data-field="maintenance-notes" placeholder="Example: diffuse on low heat; refresh tone in 6–8 weeks">${escapeHtml(state.maintenanceNotes)}</textarea>
              </div>
              <label class="check-row">
                <input type="checkbox" data-field="plan-agreed" ${state.planAgreed ? "checked" : ""}>
                <span>The client and stylist agree that this is a visual direction for the service.<small>It remains subject to the stylist’s assessment during the appointment.</small></span>
              </label>
            </div>
          </div>
        </div>
        ${stickyActions("back-compare", "Back", "continue-plan", "Review service brief")}
      </section>`;
  }

  function feasibilityLabel() {
    return { now: "Feasible now", prepare: "Needs preparation or grow-out", inspiration: "Inspiration only" }[state.feasibility] || "Not recorded";
  }

  function renderBrief() {
    const chosen = variantById(state.chosenVariantId) || variantById(state.selectedVariantId);
    return `
      <article class="brief" aria-label="Consultation brief preview">
        <header class="brief__header">
          <div><strong>hAIr consultation</strong><br><span class="help">Private service direction</span></div>
          <span class="ai-label">AI visualization</span>
        </header>
        <div class="brief__body">
          <div>${portrait(chosen ? chosen.visual : "preview-1", "Chosen abstract AI hairstyle visualization placeholder")}</div>
          <div>
            <h2>Agreed direction</h2>
            ${summaryList(requestedSummary())}
            <h3 style="margin-top: 1rem">Stylist feasibility</h3>
            <p>${escapeHtml(feasibilityLabel())}</p>
            <h3>Service direction</h3>
            <p>${escapeHtml(state.serviceNotes.trim() || "No service note recorded")}</p>
            ${state.maintenanceNotes.trim() ? `<h3>Maintenance</h3><p>${escapeHtml(state.maintenanceNotes.trim())}</p>` : ""}
          </div>
        </div>
        <footer class="brief__footer"><strong>AI hairstyle visualization — actual results vary.</strong> Starting hair, condition, texture, color history, technique, lighting, and maintenance affect the real service. Follow the stylist’s professional advice.</footer>
      </article>`;
  }

  function renderShare() {
    const expiry = state.saveFor30Days ? "30 days after this consultation" : "within 24 hours";
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="screen__intro">
          <p class="eyebrow">Agreed plan</p>
          <h1 id="screen-title" tabindex="-1">Review, share, or delete</h1>
          <p class="lede">The AI label and uncertainty note stay on every shared or downloaded brief.</p>
        </div>
        ${renderBrief()}
        <div class="card" style="margin-top: 1rem">
          <h2>Retention and sharing</h2>
          <label class="check-row">
            <input type="checkbox" data-field="save-30-days" ${state.saveFor30Days ? "checked" : ""}>
            <span>Explicitly save this consultation for up to 30 days.<small>If unchecked, the photo and previews expire within 24 hours. A shorter salon setting still applies.</small></span>
          </label>
          <p><strong>Scheduled deletion:</strong> ${escapeHtml(expiry)}. Delete immediately at any time.</p>
          <div class="button-row button-row--wrap">
            <button class="button" type="button" data-action="create-share">Create private 24-hour link</button>
            <button class="button button--secondary" type="button" data-action="download-brief">Download labeled brief</button>
            <button class="button button--secondary" type="button" data-action="print-brief">Print or save as PDF</button>
          </div>
          ${state.shareCreated ? `
            <div class="share-link" style="margin-top: 1rem">
              <div><code>https://example.invalid/hair/demo-7h2k</code><br><small>Private prototype link • expires in 24 hours</small></div>
              <button class="button button--small button--secondary" type="button" data-action="copy-link">Copy link</button>
            </div>` : ""}
        </div>
        <div class="card">
          <h2>Client control</h2>
          <p>Immediate deletion removes the client photo, previews, notes, pending work, and active share links.</p>
          <button class="button button--danger-solid" type="button" data-action="ask-delete">Delete consultation now</button>
        </div>
        ${stickyActions("back-plan", "Edit plan", "finish-consultation", "Finish")}
      </section>`;
  }

  function renderFinished() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">✓</div>
          <p class="eyebrow">Consultation complete</p>
          <h1 id="screen-title" tabindex="-1">The shared direction is ready</h1>
          <p>${state.saveFor30Days ? "This consultation is scheduled for deletion within 30 days." : "This unsaved consultation is scheduled for deletion within 24 hours."}</p>
          <p class="help">A private link expires independently after 24 hours. The client or salon can delete sooner.</p>
          <div class="button-row button-row--wrap" style="justify-content: center">
            <button class="button button--secondary" type="button" data-action="return-share">View brief</button>
            <button class="button button--danger-solid" type="button" data-action="ask-delete">Delete now</button>
          </div>
        </div>
      </section>`;
  }

  function renderDeleted() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">✓</div>
          <p class="eyebrow">Deletion complete</p>
          <h1 id="screen-title" tabindex="-1">Consultation deleted</h1>
          <p>The photo, previews, notes, pending work, and active share links are no longer available.</p>
          <p class="help">Deletion reference: DEMO-7H2K. It contains no client name or photo.</p>
          <button class="button" type="button" data-action="reset">Start another consultation</button>
        </div>
      </section>`;
  }

  function renderDeletionPending() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">!</div>
          <p class="eyebrow">Access blocked</p>
          <h1 id="screen-title" tabindex="-1">We’re still verifying deletion</h1>
          <p>The consultation is no longer viewable or shareable, but one deletion step has not confirmed yet. The salon has been alerted.</p>
          <p class="help">Do not recreate or restore the consultation. Verification should retry until every stored copy and link is removed.</p>
          <button class="button" type="button" data-action="retry-deletion">Retry deletion verification</button>
        </div>
      </section>`;
  }

  function renderExpired(kind) {
    const isLink = kind === "expired-share";
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">⌛</div>
          <p class="eyebrow">Expired</p>
          <h1 id="screen-title" tabindex="-1">${isLink ? "This private link has expired" : "This consultation has expired"}</h1>
          <p>${isLink ? "The link no longer provides access. Ask the salon for a new link only if the consultation is still within its retention period." : "The photo, previews, notes, and active links were removed at the scheduled deletion time."}</p>
          <p class="help">${isLink ? "If the consultation was deleted, it cannot be restored." : "Expired consultations cannot be restored."}</p>
          <button class="button" type="button" data-action="reset">Start a new consultation</button>
        </div>
      </section>`;
  }

  function renderEnded() {
    return `
      <section class="screen" aria-labelledby="screen-title">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">✓</div>
          <p class="eyebrow">No photo collected</p>
          <h1 id="screen-title" tabindex="-1">Consultation ended</h1>
          <p>You did not agree, so no photo was selected or sent for processing.</p>
          <button class="button" type="button" data-action="reset">Return home</button>
        </div>
      </section>`;
  }

  const renderers = {
    home: renderHome,
    handoff: renderHandoff,
    consent: renderConsent,
    capture: renderCapture,
    describe: renderDescribe,
    confirm: renderConfirm,
    generate: renderGenerate,
    compare: renderCompare,
    plan: renderPlan,
    share: renderShare,
    finished: renderFinished,
    deleted: renderDeleted,
    "deletion-pending": renderDeletionPending,
    "expired-consultation": () => renderExpired("expired-consultation"),
    "expired-share": () => renderExpired("expired-share"),
    ended: renderEnded,
  };

  function render(options) {
    const settings = options || {};
    const renderer = renderers[state.screen] || renderHome;
    app.innerHTML = renderer();
    updateChrome();
    if (settings.focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      const heading = app.querySelector("h1");
      if (heading) heading.focus();
    }
    if (settings.announce) routeStatus.textContent = settings.announce;
  }

  function renderPreservingFocus(options) {
    const active = document.activeElement;
    let selector = "";
    if (active && app.contains(active)) {
      if (active.id) selector = `#${active.id}`;
      else if (active.dataset && active.dataset.action) {
        selector = `[data-action="${active.dataset.action}"]${active.dataset.id ? `[data-id="${active.dataset.id}"]` : ""}`;
      }
    }
    render(options || { focus: false });
    if (selector) {
      const replacement = app.querySelector(selector);
      if (replacement) replacement.focus();
    }
  }

  function updateChrome() {
    const stepIndex = STEP_FOR_SCREEN[state.screen];
    if (Number.isInteger(stepIndex)) {
      stepper.hidden = false;
      stepper.innerHTML = `
        <ol class="stepper">
          ${STEPS.map((label, index) => `<li class="stepper__item" ${index === stepIndex ? 'aria-current="step"' : ""}><span>${escapeHtml(label)}</span>${index === stepIndex ? `<span class="stepper__count">Step ${index + 1} of ${STEPS.length}</span>` : ""}</li>`).join("")}
        </ol>`;
    } else {
      stepper.hidden = true;
      stepper.innerHTML = "";
    }
    const terminalScreens = ["home", "handoff", "consent", "ended", "deleted", "deletion-pending", "expired-consultation", "expired-share"];
    headerDelete.hidden = !state.consent.receipt || terminalScreens.includes(state.screen);
  }

  function go(screen, announcement) {
    state.screen = screen;
    state.errors = {};
    render({ focus: true, announce: announcement || `${screen.replaceAll("-", " ")} screen` });
  }

  function showToast(message) {
    toastNode.textContent = message;
    toastNode.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastNode.hidden = true;
      toastNode.textContent = "";
    }, 3200);
  }

  function focusError(id) {
    window.setTimeout(() => {
      const node = document.querySelector(`#${id}`);
      if (node) node.focus();
    }, 0);
  }

  function clearAllJobs() {
    jobTimers.forEach((timers) => {
      window.clearTimeout(timers.start);
      window.clearTimeout(timers.finish);
      window.clearInterval(timers.progress);
    });
    jobTimers.clear();
  }

  function clearJob(id) {
    const timers = jobTimers.get(id);
    if (!timers) return;
    window.clearTimeout(timers.start);
    window.clearTimeout(timers.finish);
    window.clearInterval(timers.progress);
    jobTimers.delete(id);
  }

  function beginJob(variant, outcome, duration) {
    clearJob(variant.id);
    variant.status = "queued";
    variant.progress = 6;
    const timers = {};
    const startAt = Date.now();
    timers.start = window.setTimeout(() => {
      if (variant.status !== "queued") return;
      variant.status = "running";
      renderPreservingFocus({ focus: false });
    }, 250);
    timers.progress = window.setInterval(() => {
      if (!["queued", "running"].includes(variant.status)) return;
      const elapsed = Date.now() - startAt;
      variant.progress = Math.min(94, Math.max(8, Math.round((elapsed / duration) * 94)));
      if (state.screen === "generate") {
        const progressNode = app.querySelector(`[data-progress-id="${variant.id}"]`);
        if (progressNode) {
          progressNode.setAttribute("aria-valuenow", String(variant.progress));
          const bar = progressNode.querySelector(".progress__bar");
          if (bar) bar.style.width = `${variant.progress}%`;
        }
      }
    }, 240);
    timers.finish = window.setTimeout(() => {
      if (!["queued", "running"].includes(variant.status)) return;
      window.clearInterval(timers.progress);
      jobTimers.delete(variant.id);
      variant.progress = outcome === "success" ? 100 : variant.progress;
      variant.status = outcome === "success" ? "succeeded" : outcome === "timeout" ? "timed-out" : "failed";
      if (variant.status === "succeeded" && !state.selectedVariantId) state.selectedVariantId = variant.id;
      if (state.screen === "generate") {
        renderPreservingFocus({ focus: false });
        routeStatus.textContent = `${variant.label} ${variant.status === "succeeded" ? "is ready" : variant.status.replaceAll("-", " ")}`;
      }
    }, duration);
    jobTimers.set(variant.id, timers);
  }

  function startInitialGeneration() {
    state.batchRejected = state.scenario === "request-rejection";
    state.generationMode = "initial";
    state.variants = [];
    state.favoriteIds = [];
    state.selectedVariantId = "";
    state.chosenVariantId = "";
    if (state.batchRejected) {
      go("generate", "Request needs revision; no preview was created");
      return;
    }
    const outcomes = state.scenario === "success"
      ? ["success", "success", "success"]
      : state.scenario === "timeout"
        ? ["success", "timeout", "success"]
        : ["success", "success", "failure"];
    state.variants = [
      { id: "preview-a", label: "Preview A", visual: "preview-1", status: "queued", progress: 0 },
      { id: "preview-b", label: "Preview B", visual: "preview-2", status: "queued", progress: 0 },
      { id: "preview-c", label: "Preview C", visual: "preview-3", status: "queued", progress: 0 },
    ];
    state.activeVariantIds = state.variants.map((variant) => variant.id);
    go("generate", "Three private preview jobs started");
    state.variants.forEach((variant, index) => beginJob(variant, outcomes[index], 1750 + index * 650));
  }

  function startRefinement() {
    if (!state.refinement) return;
    const source = variantById(state.selectedVariantId);
    const id = `refined-${state.variants.length + 1}`;
    const refinementLabel = {
      shorter: "A little shorter",
      warmer: "Warmer color",
      "less-volume": "Less volume",
      "add-fringe": "Add fringe",
      "raise-fade": "Raise fade",
    }[state.refinement];
    const variant = {
      id,
      label: `Refined: ${refinementLabel}`,
      visual: "refined",
      status: "queued",
      progress: 0,
      sourceId: source ? source.id : "",
    };
    state.variants.push(variant);
    state.activeVariantIds = [id];
    state.generationMode = "refinement";
    state.refinement = "";
    go("generate", `Creating one refinement: ${refinementLabel}`);
    beginJob(variant, "success", 1850);
  }

  function retryVariant(id) {
    const variant = variantById(id);
    if (!variant) return;
    state.activeVariantIds = [id];
    beginJob(variant, "success", 1500);
    renderPreservingFocus({ focus: false, announce: `${variant.label} retry started` });
  }

  function cancelRemaining() {
    state.activeVariantIds.forEach((id) => {
      const variant = variantById(id);
      if (variant && ["queued", "running"].includes(variant.status)) {
        clearJob(id);
        variant.status = "canceled";
      }
    });
    renderPreservingFocus({ focus: false, announce: "Unfinished previews canceled; completed previews kept" });
  }

  function requestHasChange() {
    const changedSpec = Object.entries(state.spec).some(([key, value]) => {
      if (key === "maintenance") return false;
      return value && value !== "keep" && value !== "none" && value !== "natural";
    });
    return changedSpec || Boolean(state.referenceHairAttributes.trim()) || state.referenceImageAdded || Boolean(state.additionalNotes.trim());
  }

  function translateReference(text) {
    const lower = text.toLowerCase();
    const attributes = [];
    const rules = [
      [/pixie/, "short pixie silhouette"],
      [/bob/, "bob silhouette"],
      [/shag/, "layered shag silhouette"],
      [/fade/, "graduated fade"],
      [/taper/, "clean taper"],
      [/curtain/, "curtain fringe"],
      [/bang|fringe/, "fringe"],
      [/curl|coil/, "defined curly or coily finish"],
      [/wave/, "soft wavy finish"],
      [/braid/, "braided style"],
      [/loc/, "loc style"],
      [/twist/, "twisted style"],
      [/blond/, "blonde color family"],
      [/copper/, "copper color family"],
      [/silver|gray|grey/, "gray or silver color family"],
      [/red/, "red color family"],
      [/warm/, "warm tone"],
      [/cool/, "cool tone"],
      [/short/, "shorter length"],
      [/long/, "longer length"],
    ];
    rules.forEach(([pattern, description]) => {
      if (pattern.test(lower) && !attributes.includes(description)) attributes.push(description);
    });
    if (!attributes.length) {
      return "Confirm the reference’s visible hair length, silhouette, layers, texture, fringe or part, color family, tone, and finish. Do not copy the reference person’s face or identity.";
    }
    return `${attributes.join(", ")}. Use the reference for these hair attributes only; preserve the client’s identity.`;
  }

  function handlePhotoFile(file) {
    if (!file) return;
    state.captureAttempts += 1;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 10 * 1024 * 1024) {
      state.photoStatus = "invalid-file";
    } else if (state.scenario === "photo-retake" && state.captureAttempts === 1) {
      state.photoStatus = "needs-retake";
    } else if (state.scenario === "photo-multiple-faces" && state.captureAttempts === 1) {
      state.photoStatus = "multiple-faces";
    } else {
      state.photoStatus = "good";
    }
    state.errors.photo = "";
    render({ focus: false, announce: state.photoStatus === "good" ? "Photo passed the quality check" : "Photo needs attention" });
  }

  function deleteConsultation() {
    clearAllJobs();
    if (deleteDialog.open) deleteDialog.close();
    if (state.scenario === "deletion-failure") go("deletion-pending", "Consultation access blocked while deletion verification retries");
    else go("deleted", "Consultation deleted");
  }

  function resetPrototype() {
    clearAllJobs();
    const scenario = scenarioSelect.value || "partial";
    state = freshState(scenario);
    render({ focus: true, announce: "Prototype reset" });
  }

  function downloadBrief() {
    const content = [
      "hAIr consultation brief",
      "AI HAIRSTYLE VISUALIZATION — ACTUAL RESULTS VARY",
      "",
      `Stylist feasibility: ${feasibilityLabel()}`,
      `Service direction: ${state.serviceNotes.trim() || "No service note recorded"}`,
      `Maintenance: ${state.maintenanceNotes.trim() || "No maintenance note recorded"}`,
      "",
      "Starting hair, condition, texture, color history, technique, lighting, and maintenance affect the real service. Follow the stylist’s professional advice.",
      "",
      `Retention: ${state.saveFor30Days ? "scheduled for deletion within 30 days" : "scheduled for deletion within 24 hours"}.`,
      "Synthetic low-fidelity prototype; no client photo is included.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hair-consultation-brief-demo.txt";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Labeled prototype brief downloaded");
  }

  async function copyDemoLink() {
    const link = "https://example.invalid/hair/demo-7h2k";
    try {
      await navigator.clipboard.writeText(link);
      showToast("Private prototype link copied");
    } catch (_error) {
      showToast("Copy is unavailable here; the prototype link is shown on screen");
    }
  }

  function handleAction(action, button) {
    switch (action) {
      case "home":
        if (state.consent.receipt && !["deleted", "ended", "expired-consultation", "expired-share"].includes(state.screen)) showToast("Finish or delete this consultation before starting another");
        else go("home", "Home");
        break;
      case "home-screen":
        go("home", "Home");
        break;
      case "client-handoff":
        go("handoff", "Client phone handoff");
        break;
      case "continue-here":
      case "new-consultation":
        state = freshState(state.scenario);
        go("consent", "Client consent step");
        break;
      case "continue-consent":
        if (!state.consent.adult || !state.consent.purpose) {
          state.errors.consent = "Both acknowledgements are required before any photo can be selected.";
          render({ focus: false });
          focusError("consent-error");
        } else {
          state.consent.receipt = true;
          go("capture", "Consent recorded; guided photo step");
        }
        break;
      case "decline-consent":
        state.consent = { adult: false, purpose: false, receipt: false };
        go("ended", "Consultation ended without collecting a photo");
        break;
      case "back-consent":
        go("consent", "Consent step");
        break;
      case "take-photo":
        if (state.scenario === "camera-unavailable") {
          state.photoStatus = "camera-unavailable";
          render({ focus: false, announce: "Camera unavailable; choose a photo instead" });
        } else {
          document.querySelector("#camera-input").click();
        }
        break;
      case "upload-photo":
        document.querySelector("#upload-input").click();
        break;
      case "use-synthetic":
        state.captureAttempts += 1;
        if (state.scenario === "photo-retake" && state.captureAttempts === 1) state.photoStatus = "needs-retake";
        else if (state.scenario === "photo-multiple-faces" && state.captureAttempts === 1) state.photoStatus = "multiple-faces";
        else state.photoStatus = "good";
        state.errors.photo = "";
        render({ focus: false, announce: state.photoStatus === "good" ? "Synthetic photo passed the quality check" : "Photo needs a retake" });
        break;
      case "continue-photo":
        if (state.photoStatus !== "good") {
          state.errors.photo = "Take, choose, or use a synthetic photo that passes the quality check.";
          render({ focus: false });
          focusError("photo-error");
        } else go("describe", "Hair goals step");
        break;
      case "back-photo":
        go("capture", "Guided photo step");
        break;
      case "reference-type":
        state.referenceType = button.dataset.value;
        render({ focus: false, announce: `${state.referenceType} inspiration selected` });
        document.querySelector(`#reference-${state.referenceType}-tab`)?.focus();
        break;
      case "add-reference-image":
        document.querySelector("#reference-input").click();
        break;
      case "remove-reference":
        state.referenceImageAdded = false;
        render({ focus: false, announce: "Reference image removed" });
        break;
      case "translate-reference":
        if (!state.referenceInput.trim()) {
          showToast("Enter a look, era, person, or character first");
        } else {
          state.referenceHairAttributes = translateReference(state.referenceInput.trim());
          render({ focus: false, announce: "Hair-only attributes ready to review" });
          const field = document.querySelector("#hair-attributes");
          if (field) field.focus();
        }
        break;
      case "continue-describe":
        if (!requestHasChange()) {
          state.errors.describe = "Choose at least one hair change, add hair-only details, or add inspiration.";
          render({ focus: false });
          focusError("describe-error");
        } else go("confirm", "Confirm the structured hair-only request");
        break;
      case "back-describe":
      case "edit-rejected-request":
        state.batchRejected = false;
        go("describe", "Hair goals step");
        break;
      case "back-confirm":
        go("confirm", "Confirm request step");
        break;
      case "start-generation":
        startInitialGeneration();
        break;
      case "retry-variant":
        retryVariant(button.dataset.id);
        break;
      case "cancel-remaining":
        cancelRemaining();
        break;
      case "continue-results": {
        const ready = state.variants.filter((variant) => variant.status === "succeeded");
        if (ready.length) {
          const newestActive = [...state.activeVariantIds].reverse().map(variantById).find((variant) => variant && variant.status === "succeeded");
          state.selectedVariantId = newestActive ? newestActive.id : state.selectedVariantId || ready[0].id;
          go("compare", "Compare the original and ready previews");
        }
        break;
      }
      case "back-generate":
        go("generate", "Preview progress");
        break;
      case "select-variant":
        state.selectedVariantId = button.dataset.id;
        renderPreservingFocus({ focus: false, announce: `${variantById(state.selectedVariantId).label} selected` });
        break;
      case "toggle-favorite": {
        const id = state.selectedVariantId;
        if (state.favoriteIds.includes(id)) state.favoriteIds = state.favoriteIds.filter((favoriteId) => favoriteId !== id);
        else if (state.favoriteIds.length >= 2) {
          showToast("Choose up to two favorites; remove one before adding another");
          return;
        } else state.favoriteIds.push(id);
        renderPreservingFocus({ focus: false, announce: state.favoriteIds.includes(id) ? "Preview favorited" : "Favorite removed" });
        break;
      }
      case "start-refinement":
        startRefinement();
        break;
      case "choose-plan":
        state.chosenVariantId = state.selectedVariantId;
        go("plan", "Stylist feasibility step");
        break;
      case "back-compare":
        go("compare", "Compare previews");
        break;
      case "continue-plan":
        if (!state.feasibility || !state.serviceNotes.trim() || !state.planAgreed) {
          state.errors.plan = "Choose a feasibility status, add a service direction, and confirm client–stylist agreement.";
          render({ focus: false });
          focusError("plan-error");
        } else go("share", "Review, share, download, or delete the service brief");
        break;
      case "back-plan":
        go("plan", "Stylist feasibility step");
        break;
      case "create-share":
        state.shareCreated = true;
        renderPreservingFocus({ focus: false, announce: "Private 24-hour prototype link created" });
        showToast("Private link created; expires in 24 hours");
        break;
      case "copy-link":
        copyDemoLink();
        break;
      case "download-brief":
        downloadBrief();
        break;
      case "print-brief":
        window.print();
        break;
      case "finish-consultation":
        go("finished", "Consultation complete");
        break;
      case "return-share":
        go("share", "Consultation brief");
        break;
      case "ask-delete":
        if (typeof deleteDialog.showModal === "function") deleteDialog.showModal();
        else if (window.confirm("Delete the photo, previews, notes, pending work, and active share links?")) deleteConsultation();
        break;
      case "confirm-delete":
        deleteConsultation();
        break;
      case "retry-deletion":
        state.scenario = "success";
        scenarioSelect.value = "success";
        go("deleted", "Deletion verified; consultation deleted");
        break;
      case "apply-scenario":
        clearAllJobs();
        state = freshState(scenarioSelect.value);
        render({ focus: true, announce: "Prototype condition applied" });
        showToast("Test condition applied; begin a new consultation");
        break;
      case "show-expired-consultation":
        clearAllJobs();
        state = freshState(scenarioSelect.value);
        go("expired-consultation", "Expired consultation state");
        break;
      case "show-expired-share":
        clearAllJobs();
        state = freshState(scenarioSelect.value);
        go("expired-share", "Expired private link state");
        break;
      case "reset":
        resetPrototype();
        break;
      default:
        break;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.disabled) return;
    handleAction(button.dataset.action, button);
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-spec]")) {
      state.spec[target.dataset.spec] = target.value;
      state.errors.describe = "";
      return;
    }
    if (target.matches('[data-field="consent-adult"]')) state.consent.adult = target.checked;
    if (target.matches('[data-field="consent-purpose"]')) state.consent.purpose = target.checked;
    if (target.matches('[data-field="refinement"]')) {
      state.refinement = target.value;
      const refineButton = app.querySelector('[data-action="start-refinement"]');
      if (refineButton) refineButton.disabled = false;
    }
    if (target.matches('[data-field="feasibility"]')) state.feasibility = target.value;
    if (target.matches('[data-field="plan-agreed"]')) state.planAgreed = target.checked;
    if (target.matches('[data-field="save-30-days"]')) {
      state.saveFor30Days = target.checked;
      renderPreservingFocus({ focus: false, announce: target.checked ? "Consultation set to expire within 30 days" : "Consultation set to expire within 24 hours" });
    }
    if (target.matches("[data-photo-input]")) {
      handlePhotoFile(target.files && target.files[0]);
      target.value = "";
    }
    if (target.matches("[data-reference-input]")) {
      const file = target.files && target.files[0];
      if (file && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024) {
        state.referenceImageAdded = true;
        render({ focus: false, announce: "Hair inspiration image added" });
      } else if (file) showToast("Choose a JPEG, PNG, or WebP image up to 10 MB");
      target.value = "";
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    const field = target.dataset.field;
    if (!field) return;
    if (field === "reference-input") state.referenceInput = target.value;
    if (field === "reference-hair-attributes") state.referenceHairAttributes = target.value;
    if (field === "additional-notes") state.additionalNotes = target.value;
    if (field === "service-notes") state.serviceNotes = target.value;
    if (field === "maintenance-notes") state.maintenanceNotes = target.value;
  });

  deleteDialog.addEventListener("close", () => {
    if (deleteDialog.returnValue !== "confirm") {
      const trigger = document.querySelector('[data-action="ask-delete"]');
      if (trigger) trigger.focus();
    }
  });

  render({ focus: false });
})();
