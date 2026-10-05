import { expect, test, type Locator, type Page } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64",
);

type PrivacyBoundaryProbe = {
  storageMutations: string[];
  outboundCalls: string[];
  revokedObjectUrls: string[];
};

async function installPrivacyBoundaryProbe(page: Page) {
  await page.addInitScript(() => {
    const browserWindow = window as Window & {
      hairPrivacyBoundaryProbe?: PrivacyBoundaryProbe;
    };
    const probe: PrivacyBoundaryProbe = {
      storageMutations: [],
      outboundCalls: [],
      revokedObjectUrls: [],
    };
    browserWindow.hairPrivacyBoundaryProbe = probe;

    const storageArea = (storage: Storage) =>
      storage === window.localStorage ? "localStorage" : "sessionStorage";
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      probe.storageMutations.push(`${storageArea(this)}.setItem:${key}:${value.length}`);
      return originalSetItem.call(this, key, value);
    };
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function removeItem(key: string) {
      probe.storageMutations.push(`${storageArea(this)}.removeItem:${key}`);
      return originalRemoveItem.call(this, key);
    };
    const originalClear = Storage.prototype.clear;
    Storage.prototype.clear = function clear() {
      probe.storageMutations.push(`${storageArea(this)}.clear`);
      return originalClear.call(this);
    };

    const originalIndexedDbOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((name: string, version?: number) => {
      probe.storageMutations.push(`indexedDB.open:${name}`);
      return version === undefined
        ? originalIndexedDbOpen(name)
        : originalIndexedDbOpen(name, version);
    }) as typeof indexedDB.open;
    const originalDeleteDatabase = indexedDB.deleteDatabase.bind(indexedDB);
    indexedDB.deleteDatabase = ((name: string) => {
      probe.storageMutations.push(`indexedDB.deleteDatabase:${name}`);
      return originalDeleteDatabase(name);
    }) as typeof indexedDB.deleteDatabase;

    if ("caches" in window) {
      const originalCacheOpen = window.caches.open.bind(window.caches);
      window.caches.open = (async (name: string) => {
        probe.storageMutations.push(`caches.open:${name}`);
        return originalCacheOpen(name);
      }) as typeof window.caches.open;
      const originalCacheDelete = window.caches.delete.bind(window.caches);
      window.caches.delete = (async (name: string) => {
        probe.storageMutations.push(`caches.delete:${name}`);
        return originalCacheDelete(name);
      }) as typeof window.caches.delete;
    }

    if ("serviceWorker" in navigator) {
      const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
      navigator.serviceWorker.register = ((scriptURL: string | URL) => {
        probe.storageMutations.push(`serviceWorker.register:${String(scriptURL)}`);
        return originalRegister(scriptURL);
      }) as typeof navigator.serviceWorker.register;
    }

    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (cookie?.get && cookie.set) {
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookie.get?.call(document) ?? "",
        set: (value: string) => {
          probe.storageMutations.push(`document.cookie:${value.length}`);
          cookie.set?.call(document, value);
        },
      });
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      probe.outboundCalls.push(`fetch:${init?.method ?? "GET"}:${url}`);
      return originalFetch(input, init);
    }) as typeof window.fetch;

    const requestUrls = new WeakMap<XMLHttpRequest, string>();
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function open(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      requestUrls.set(this, `${method}:${String(url)}`);
      Reflect.apply(originalOpen, this, [method, url, ...rest]);
    } as typeof XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function send(body?: Document | XMLHttpRequestBodyInit | null) {
      probe.outboundCalls.push(`xhr:${requestUrls.get(this) ?? "unknown"}:${body ? "body" : "empty"}`);
      return originalSend.call(this, body);
    };

    const originalBeacon = navigator.sendBeacon?.bind(navigator);
    if (originalBeacon) {
      navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) => {
        probe.outboundCalls.push(`beacon:${String(url)}:${data ? "body" : "empty"}`);
        return originalBeacon(url, data);
      }) as typeof navigator.sendBeacon;
    }

    const originalRevoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url: string) => {
      probe.revokedObjectUrls.push(url);
      originalRevoke(url);
    };
  });
}

async function readPrivacyBoundaryProbe(page: Page) {
  return page.evaluate(() => {
    const probe = (window as Window & {
      hairPrivacyBoundaryProbe?: PrivacyBoundaryProbe;
    }).hairPrivacyBoundaryProbe;
    if (!probe) throw new Error("Privacy boundary probe was not installed");
    return {
      ...probe,
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
    };
  });
}

async function resetPrivacyBoundaryProbe(page: Page) {
  await page.evaluate(() => {
    const probe = (window as Window & {
      hairPrivacyBoundaryProbe?: PrivacyBoundaryProbe;
    }).hairPrivacyBoundaryProbe;
    if (!probe) throw new Error("Privacy boundary probe was not installed");
    probe.storageMutations.length = 0;
    probe.outboundCalls.length = 0;
    probe.revokedObjectUrls.length = 0;
  });
}

async function beginConsultation(page: Page, scenario = "") {
  await page.goto(`/${scenario ? `?scenario=${scenario}` : ""}`);
  await page.locator('[data-app-ready="true"]').waitFor();

  await page.getByRole("checkbox", { name: /I am the person pictured/ }).check();
  await page.getByRole("checkbox", { name: /I understand this is an AI preview/ }).check();
  await page.getByRole("checkbox", { name: /I will only add reference images/ }).check();
  await page.getByRole("button", { name: "Continue to photo" }).click();
}

async function reachLook(page: Page, scenario = "") {
  await beginConsultation(page, scenario);
  await page.getByRole("button", { name: "Use synthetic demo portrait" }).click();
  await page.getByRole("button", { name: "Describe the look" }).click();
}

async function reachComparison(page: Page, scenario = "") {
  await reachLook(page, scenario);
  await page.getByLabel("Shape or cut").selectOption("collarbone layers");
  await page.getByRole("button", { name: "Generate three previews" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Choose a direction, then let the stylist assess it.",
    }),
  ).toBeVisible({ timeout: 10_000 });
}

async function reachPlan(page: Page, scenario = "") {
  await reachComparison(page, scenario);
  await page.getByRole("button", { name: "Stylist review" }).click();
  await expect(
    page.getByRole("heading", { name: "Can this direction work for the client?" }),
  ).toBeVisible();
}

async function completePlanApproval(page: Page) {
  await page.getByRole("radio", { name: /Feasible now/ }).check();
  await page
    .getByLabel("Service notes")
    .fill("Collarbone layers with a conservative perimeter.");
  await page
    .getByRole("checkbox", { name: /client and stylist agree/i })
    .check();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

async function tabTo(page: Page, target: Locator, limit = 60) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach ${await target.getAttribute("aria-label") ?? await target.textContent() ?? "target"} with the keyboard`);
}

test("keeps photo controls behind consent without network or persistent storage activity", async ({
  page,
}) => {
  await installPrivacyBoundaryProbe(page);
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();
  await resetPrivacyBoundaryProbe(page);

  const browserRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) {
      browserRequests.push(`${request.method()}:${request.resourceType()}:${request.url()}`);
    }
  });

  const photoInput = page.locator('input[type="file"]');
  const demoPortrait = page.getByRole("button", { name: "Use synthetic demo portrait" });
  const continueButton = page.getByRole("button", { name: "Continue to photo" });

  await expect(photoInput).toHaveCount(0);
  await expect(demoPortrait).toHaveCount(0);
  await expect(continueButton).toBeDisabled();

  await page.getByRole("checkbox", { name: /I am the person pictured/ }).check();
  await page.getByRole("checkbox", { name: /I understand this is an AI preview/ }).check();
  await expect(photoInput).toHaveCount(0);
  await expect(demoPortrait).toHaveCount(0);
  await expect(continueButton).toBeDisabled();

  await page.getByRole("checkbox", { name: /I will only add reference images/ }).check();
  await expect(photoInput).toHaveCount(0);
  await expect(demoPortrait).toHaveCount(0);
  await expect(continueButton).toBeEnabled();

  await continueButton.click();
  await expect(photoInput).toHaveCount(1);
  await expect(demoPortrait).toBeVisible();

  const probe = await readPrivacyBoundaryProbe(page);
  expect(probe.storageMutations).toEqual([]);
  expect(probe.outboundCalls).toEqual([]);
  expect(probe.localStorageKeys).toEqual([]);
  expect(probe.sessionStorageKeys).toEqual([]);
  expect(browserRequests).toEqual([]);
});

test("declining after a local synthetic capture releases it without upload or persistence", async ({
  page,
}) => {
  await installPrivacyBoundaryProbe(page);
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();
  await resetPrivacyBoundaryProbe(page);

  const canaryFilename = "synthetic-boundary-canary.png";
  const browserRequests: { url: string; method: string; postData: string | null }[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) {
      browserRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
      });
    }
  });

  await page.getByRole("checkbox", { name: /I am the person pictured/ }).check();
  await page.getByRole("checkbox", { name: /I understand this is an AI preview/ }).check();
  await page.getByRole("checkbox", { name: /I will only add reference images/ }).check();
  await page.getByRole("button", { name: "Continue to photo" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: canaryFilename,
    mimeType: "image/png",
    buffer: onePixelPng,
  });

  const localPortrait = page.getByRole("img", { name: "Selected consultation portrait" });
  await expect(localPortrait).toBeVisible();
  const blobUrl = await localPortrait.getAttribute("src");
  expect(blobUrl).toMatch(/^blob:/);

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "I do not agree — end here" }).click();
  await expect(page.getByRole("heading", { name: "No photo collected" })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Selected consultation portrait" })).toHaveCount(0);

  const probe = await readPrivacyBoundaryProbe(page);
  expect(probe.revokedObjectUrls).toContain(blobUrl);
  expect(probe.storageMutations).toEqual([]);
  expect(probe.outboundCalls).toEqual([]);
  expect(probe.localStorageKeys).toEqual([]);
  expect(probe.sessionStorageKeys).toEqual([]);
  expect(browserRequests).toEqual([]);
  expect(JSON.stringify(browserRequests)).not.toContain(canaryFilename);
});

test("requires a stylist assessment, service notes, and explicit agreement before completion", async ({
  page,
}) => {
  await reachPlan(page);

  const share = page.getByRole("button", { name: "Create private 24-hour link" });
  const print = page.getByRole("button", { name: "Print or save board" });
  const agreement = page.getByRole("checkbox", { name: /client and stylist agree/i });

  await expect(share).toBeDisabled();
  await expect(print).toBeDisabled();

  await page.getByRole("radio", { name: /Feasible now/ }).check();
  await expect(share).toBeDisabled();

  await page.getByLabel("Service notes").fill("   ");
  await agreement.check();
  await expect(share).toBeDisabled();

  await page
    .getByLabel("Service notes")
    .fill("Collarbone layers with a conservative perimeter.");
  await expect(agreement).not.toBeChecked();
  await agreement.check();
  await expect(share).toBeEnabled();
  await expect(print).toBeEnabled();

  await share.click();
  await expect(page.getByText("Private demo link created", { exact: true })).toBeVisible();

  await agreement.uncheck();
  await expect(agreement).not.toBeChecked();
  await expect(share).toBeDisabled();
  await expect(print).toBeDisabled();
  await expect(page.getByText("Private demo link created", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("hair-share:local-demo")),
  ).toBeNull();

  await agreement.check();
  await share.click();
  await expect(page.getByText("Private demo link created", { exact: true })).toBeVisible();
  await page.getByLabel("Maintenance notes").fill("Review upkeep in eight weeks.");
  await expect(agreement).not.toBeChecked();
  await expect(share).toBeDisabled();
  await expect(print).toBeDisabled();
  await expect(page.getByText("Private demo link created", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem("hair-share:local-demo")),
  ).toBeNull();
});

test("translates public-figure inspiration into hair attributes without carrying the name", async ({
  page,
}) => {
  await reachLook(page);

  const inspiration = page.getByLabel(/Celebrity, character, or plain-language inspiration/);
  const translation = page.locator(".translation-preview");
  const generate = page.getByRole("button", { name: "Generate three previews" });

  await inspiration.fill("Zendaya red carpet waves");
  await expect(translation).toContainText("soft wavy finish");
  await expect(translation).not.toContainText(/Zendaya/i);
  await expect(generate).toBeEnabled();

  await inspiration.fill("Zendaya");
  await expect(translation).toContainText(/No visible hair attributes recognized/i);
  await expect(translation).not.toContainText(/Zendaya/i);
  await expect(generate).toBeDisabled();
});

test("rejects an unsupported local upload without accepting a portrait", async ({ page }) => {
  await beginConsultation(page);

  const photoInput = page.locator('input[type="file"]').first();
  await photoInput.setInputFiles({
    name: "synthetic-invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("synthetic test data", "utf8"),
  });

  await expect(page.locator(".field-error")).toHaveText(
    "Choose a JPEG, PNG, or WebP image no larger than 10 MB. Nothing was added.",
  );
  await expect(photoInput).toHaveAttribute("aria-describedby", "photo-file-error");
  await expect(page.locator("#photo-file-error")).toHaveAttribute("role", "alert");
  await expect(page.getByText("No photo selected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Describe the look" })).toBeDisabled();
});

test("supports the critical consultation path with a keyboard and announces generated state", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();

  for (const acknowledgement of [
    /I am the person pictured/,
    /I understand this is an AI preview/,
    /I will only add reference images/,
  ]) {
    const checkbox = page.getByRole("checkbox", { name: acknowledgement });
    await tabTo(page, checkbox);
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
  }

  const continueButton = page.getByRole("button", { name: "Continue to photo" });
  await tabTo(page, continueButton);
  await expect
    .poll(() =>
      continueButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 3;
      }),
    )
    .toBe(true);
  await page.keyboard.press("Enter");

  const demoPortrait = page.getByRole("button", { name: "Use synthetic demo portrait" });
  await tabTo(page, demoPortrait);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Synthetic placeholder selected");

  const describe = page.getByRole("button", { name: "Describe the look" });
  await tabTo(page, describe);
  await page.keyboard.press("Enter");

  const shape = page.getByLabel("Shape or cut");
  await tabTo(page, shape);
  await page.keyboard.press("ArrowDown");
  await expect(shape).toHaveValue("chin-length blunt bob");

  const generate = page.getByRole("button", { name: "Generate three previews" });
  await tabTo(page, generate);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(/Generating .* preview/)).toHaveCount(3);
  await expect(
    page.getByRole("heading", {
      name: "Choose a direction, then let the stylist assess it.",
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(3);

  const stylistReview = page.getByRole("button", { name: "Stylist review" });
  await tabTo(page, stylistReview);
  await page.keyboard.press("Enter");

  const feasible = page.getByRole("radio", { name: /Feasible now/ });
  await tabTo(page, feasible);
  await page.keyboard.press("Space");

  const serviceNotes = page.getByLabel("Service notes");
  await tabTo(page, serviceNotes);
  await page.keyboard.type("Conservative perimeter and soft layers.");

  const agreement = page.getByRole("checkbox", { name: /client and stylist agree/i });
  await tabTo(page, agreement);
  await page.keyboard.press("Space");

  const share = page.getByRole("button", { name: "Create private 24-hour link" });
  await tabTo(page, share);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Private demo link created",
  );
  await expect(page.getByRole("img", { name: /simulated AI preview/ })).toHaveCount(2);
});

test("opens deletion on the safe action, supports Escape, and restores trigger focus", async ({
  page,
}) => {
  await reachLook(page);
  const deleteTrigger = page.getByRole("button", { name: "Delete", exact: true });
  await deleteTrigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("alertdialog", { name: "Delete this consultation?" });
  const keep = page.getByRole("button", { name: "Keep consultation" });
  await expect(dialog).toBeVisible();
  await expect(keep).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(deleteTrigger).toBeFocused();
  await expect(page.getByRole("heading", { name: "What should change?" })).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(keep).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(deleteTrigger).toBeFocused();
});

test("reflows at 320 CSS pixels with 200 percent text sizing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });
  await expectNoHorizontalOverflow(page);

  await page.getByRole("checkbox", { name: /I am the person pictured/ }).check();
  await page.getByRole("checkbox", { name: /I understand this is an AI preview/ }).check();
  await page.getByRole("checkbox", { name: /I will only add reference images/ }).check();
  await page.getByRole("button", { name: "Continue to photo" }).click();
  await page.getByRole("button", { name: "Use synthetic demo portrait" }).click();
  await page.getByRole("button", { name: "Describe the look" }).click();
  await page.getByLabel("Shape or cut").selectOption("collarbone layers");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Generate three previews" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Choose a direction, then let the stylist assess it.",
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Stylist review" }).click();
  await expectNoHorizontalOverflow(page);
});

test("removes material motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();

  const durationSeconds = await page.locator(".screen").evaluate((element) =>
    Math.max(
      ...getComputedStyle(element)
        .animationDuration.split(",")
        .map((duration) => Number.parseFloat(duration) || 0),
    ),
  );
  expect(durationSeconds).toBeLessThanOrEqual(0.001);
  await expect
    .poll(() => page.locator("html").evaluate((element) => getComputedStyle(element).scrollBehavior))
    .toBe("auto");
});

test("keeps successful siblings and recovers a failed preview on retry", async ({ page }) => {
  await reachComparison(page, "partial");

  await expect(page.getByText("Preview unavailable")).toBeVisible();
  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(2);
  const failedCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Bolder option" }),
  });
  await failedCard.getByRole("button", { name: /Retry/ }).click();
  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(3, {
    timeout: 10_000,
  });
  await expect(page.getByText("Preview unavailable")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stylist review" })).toBeEnabled();
});

test("caps favorites at two and applies a quick refinement to the next brief", async ({ page }) => {
  await reachComparison(page);

  const firstFavorite = page.getByRole("button", { name: "Add Closest match favorite" });
  const secondFavorite = page.getByRole("button", { name: "Add Softer shape favorite" });
  const thirdFavorite = page.getByRole("button", { name: "Add Bolder option favorite" });
  await firstFavorite.click();
  await secondFavorite.click();
  await thirdFavorite.click();

  await expect(
    page.getByRole("button", { name: "Remove Closest match favorite" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Remove Softer shape favorite" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(thirdFavorite).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".announcement")).toContainText("Choose up to two favorites");

  await page.getByRole("button", { name: "Less volume" }).click();
  await expect(page.getByRole("heading", { name: "What should change?" })).toBeVisible();
  await expect(page.locator(".look-summary")).toContainText("reduced volume");
});

test("revokes a locally created photo Blob URL when the consultation is deleted", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const browserWindow = window as Window & { revokedHairBlobUrls?: string[] };
    const originalRevoke = URL.revokeObjectURL.bind(URL);
    browserWindow.revokedHairBlobUrls = [];
    URL.revokeObjectURL = (url: string) => {
      browserWindow.revokedHairBlobUrls?.push(url);
      originalRevoke(url);
    };
  });
  await beginConsultation(page);

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "synthetic-portrait.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  const localPortrait = page.getByRole("img", { name: "Selected consultation portrait" });
  await expect(localPortrait).toBeVisible();
  const blobUrl = await localPortrait.getAttribute("src");
  expect(blobUrl).toMatch(/^blob:/);

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Consultation deleted" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected consultation portrait" })).toHaveCount(0);

  const revokedUrls = await page.evaluate(
    () => (window as Window & { revokedHairBlobUrls?: string[] }).revokedHairBlobUrls ?? [],
  );
  expect(revokedUrls).toContain(blobUrl);
});

test("expires a private link created by an approved consultation without exposing content", async ({
  page,
}) => {
  await reachPlan(page);
  await completePlanApproval(page);
  await page.getByRole("button", { name: "Create private 24-hour link" }).click();
  await expect(page.getByText("Private demo link created", { exact: true })).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = window.sessionStorage.getItem("hair-share:local-demo");
        if (!stored) return false;
        const record = JSON.parse(stored) as { expiresAt?: number };
        return typeof record.expiresAt === "number" && record.expiresAt > Date.now();
      }),
    )
    .toBe(true);

  await page.evaluate(() => {
    const stored = window.sessionStorage.getItem("hair-share:local-demo");
    if (!stored) throw new Error("Expected created share lifecycle record");
    const record = JSON.parse(stored) as Record<string, unknown>;
    window.sessionStorage.setItem(
      "hair-share:local-demo",
      JSON.stringify({ ...record, expiresAt: Date.now() - 1 }),
    );
  });
  await page.goto("/?share=local-demo");
  await page.locator('[data-app-ready="true"]').waitFor();

  await expect(page.getByRole("heading", { name: "This private link has expired" })).toBeVisible();
  await expect(page.locator('.photo-frame img, [role="img"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
});

test("completes and deletes a synthetic consultation on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachPlan(page);
  await completePlanApproval(page);
  await page.getByLabel("Maintenance notes").fill("Shape refresh in eight weeks.");
  await page.getByRole("checkbox", { name: /client and stylist agree/i }).check();
  await page.getByRole("button", { name: "Create private 24-hour link" }).click();
  await expect(page.getByText("Private demo link created", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Delete this consultation" }).click();
  await expect(page.getByRole("heading", { name: "Delete this consultation?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Consultation deleted" })).toBeVisible();
});

test("selects a usable sibling when the first preview is rejected on a tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await reachComparison(page, "policy");

  await expect(page.getByText("Softer shape · AI preview", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stylist review" })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});
