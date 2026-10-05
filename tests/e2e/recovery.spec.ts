import { expect, test, type Page } from "@playwright/test";

async function beginConsultation(page: Page, scenario = "") {
  await page.goto(`/${scenario ? `?scenario=${scenario}` : ""}`);
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByRole("checkbox", { name: /I am the person pictured/ }).check();
  await page.getByRole("checkbox", { name: /I understand this is an AI preview/ }).check();
  await page.getByRole("checkbox", { name: /I will only add reference images/ }).check();
  await page.getByRole("button", { name: "Continue to photo" }).click();
  await page.getByRole("button", { name: "Use synthetic demo portrait" }).click();
  await page.getByRole("button", { name: "Describe the look" }).click();
  await page.getByLabel("Shape or cut").selectOption("collarbone layers");
}

async function reachComparison(page: Page, scenario = "") {
  await beginConsultation(page, scenario);
  await page.getByRole("button", { name: "Generate three previews" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Choose a direction, then let the stylist assess it.",
    }),
  ).toBeVisible({ timeout: 10_000 });
}

async function createPrivateShare(page: Page) {
  await reachComparison(page);
  await page.getByRole("button", { name: "Stylist review" }).click();
  await page.getByRole("radio", { name: /Feasible now/ }).check();
  await page
    .getByLabel("Service notes")
    .fill("Collarbone layers with a conservative perimeter.");
  await page.getByRole("checkbox", { name: /client and stylist agree/i }).check();
  await page.getByRole("button", { name: "Create private 24-hour link" }).click();
  await expect(page.getByText("Private demo link created", { exact: true })).toBeVisible();
}

function variantCard(page: Page, name: string) {
  return page.locator("article.variant-card").filter({ hasText: name });
}

test("keeps a completed sibling when unfinished previews are canceled and retried", async ({
  page,
}) => {
  await beginConsultation(page, "cancel");
  await page.getByRole("button", { name: "Generate three previews" }).click();

  await expect(variantCard(page, "Closest match").getByText("Ready", { exact: true })).toBeVisible({
    timeout: 3_000,
  });
  await page
    .getByRole("button", { name: "Cancel unfinished previews" })
    .evaluate((button: HTMLButtonElement) => button.click());

  await expect(
    page.getByRole("heading", {
      name: "Choose a direction, then let the stylist assess it.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Closest match simulated AI hairstyle preview" })).toBeVisible();
  await expect(variantCard(page, "Softer shape").getByText("Preview canceled")).toBeVisible();
  await expect(variantCard(page, "Bolder option").getByText("Preview canceled")).toBeVisible();

  await page.getByRole("button", { name: "Retry Softer shape preview" }).click();
  await expect(page.getByRole("button", { name: "Retry Softer shape preview" })).toBeDisabled();
  await expect(page.getByRole("img", { name: "Softer shape simulated AI hairstyle preview" })).toBeVisible({
    timeout: 3_000,
  });
  await expect(page.getByRole("img", { name: "Closest match simulated AI hairstyle preview" })).toBeVisible();
  await expect(variantCard(page, "Bolder option").getByText("Preview canceled")).toBeVisible();
});

test("does not publish late results after all unfinished previews are canceled", async ({ page }) => {
  await beginConsultation(page, "cancel");
  await page.getByRole("button", { name: "Generate three previews" }).click();
  await page
    .getByRole("button", { name: "Cancel unfinished previews" })
    .evaluate((button: HTMLButtonElement) => button.click());

  await expect(page.getByText("Preview canceled", { exact: true })).toHaveCount(3);
  await page.waitForTimeout(1_700);
  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(0);
  await expect(page.getByText("Preview canceled", { exact: true })).toHaveCount(3);
});

test("keeps successful siblings when one preview times out and retries only that preview", async ({
  page,
}) => {
  await reachComparison(page, "timeout");

  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(2);
  const timedOut = variantCard(page, "Softer shape");
  await expect(timedOut.getByText("No result arrived in time.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Retry Softer shape preview" }).click();
  await expect(page.getByRole("img", { name: /simulated AI hairstyle preview/ })).toHaveCount(3, {
    timeout: 3_000,
  });
  await expect(timedOut.getByText("No result arrived in time.", { exact: false })).toHaveCount(0);
});

test("revokes a created private share when the consultation is deleted", async ({ page }) => {
  await createPrivateShare(page);
  await page.getByRole("button", { name: "Delete this consultation" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Consultation deleted" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("hair-share:local-demo")))
    .toBeNull();

  await page.goto("/?share=local-demo");
  await page.locator('[data-app-ready="true"]').waitFor();
  await expect(page.getByRole("heading", { name: "This private link has expired" })).toBeVisible();
  await expect(page.locator('.photo-frame img, [role="img"]')).toHaveCount(0);
});
