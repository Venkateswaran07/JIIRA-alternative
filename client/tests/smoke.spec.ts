import { test, expect } from "@playwright/test";

test.describe("I-TRACK browser smoke coverage", () => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to run browser coverage against a deployed or local app");

  test("landing page has accessible auth actions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start free/i })).toBeVisible();
  });

  test("login form exposes labeled fields and responsive layout", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
