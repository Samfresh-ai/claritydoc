import { expect, test } from "@playwright/test";

test("loads the sample contract and renders a risky verdict with required issues", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await page.getByTestId("load-sample-button").click();
  await expect(page.getByLabel("Contract or document text")).toHaveValue(
    /FREELANCE SERVICE AGREEMENT/,
  );

  await page.getByTestId("analyze-button").click();

  await expect(page.getByTestId("verdict-card")).toContainText(
    "Overall verdict: Risky",
  );
  const highRisks = page.getByTestId("risk-group-high");
  await expect(highRisks).toContainText("24-month global non-compete");
  await expect(highRisks).toContainText("Unlimited revisions for 12 months");
  await expect(highRisks).toContainText(
    "Termination causes forfeiture of unpaid compensation",
  );
  await expect(highRisks).toContainText(
    "Payment delayed until completion and review",
  );
  await expect(page.getByTestId("results-view")).toContainText(
    "Moral rights waiver and IP transfer concerns",
  );
  await expect(page.getByTestId("actions-list")).toContainText(
    "milestone payments",
  );
  await expect(page.getByTestId("actions-list")).toContainText(
    "revision rounds",
  );
  await expect(page.getByTestId("actions-list")).toContainText(
    "Remove the global non-compete",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/claritydoc-analysis-.+\.json/);

  await page.getByRole("button", { name: /New Analysis|New/ }).click();
  await expect(page.getByLabel("Contract or document text")).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Analyze a Document" }),
  ).toBeVisible();
});

test("main sample flow works from keyboard-focused controls", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await page.getByTestId("load-sample-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Contract or document text")).toHaveValue(
    /FREELANCE SERVICE AGREEMENT/,
  );

  await page.getByTestId("analyze-button").focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("verdict-card")).toContainText(
    "Overall verdict: Risky",
  );
});

test("login and try it free route to the login page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("load-sample-button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(
    page.getByRole("link", { name: "Analyze a document" }),
  ).toHaveAttribute("href", "/login");
  await expect(
    page.getByRole("link", { name: "Try sample contract" }),
  ).toHaveAttribute("href", "/login");
  await page.getByRole("link", { name: "Try it free" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByRole("link", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Analyze a Document" }),
  ).toBeVisible();
});
