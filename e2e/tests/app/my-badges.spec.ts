// What every player sees: the ecosystem's badge catalog, with the badges they own in color.
import { expect, test } from "../../fixtures";

const badge = (page: import("@playwright/test").Page, name: string) => page.getByRole("img", { name, exact: true });

test("lists the active badges, in color only when the player owns them", async ({ page, world }) => {
  await world.seed({ badges: ["Quiz Master"] });
  await page.goto(world.url("/"));

  await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
  for (const name of ["Perfect Score", "Lightning Round", "Quiz Master", "Top 3 Finisher", "Level 2.0"]) {
    await expect(badge(page, name)).toBeVisible();
  }
  await expect(badge(page, "Quiz Master")).not.toHaveClass(/badge-img-grayscale/);
  await expect(badge(page, "Perfect Score")).toHaveClass(/badge-img-grayscale/);
  await expect(badge(page, "Perfect Score")).toHaveAttribute("src", "https://example.invalid/badges/1.png");
});

test("hides retired badges and inventory items that aren't badges", async ({ page, world }) => {
  await world.seed();
  await page.goto(world.url("/"));
  await expect(badge(page, "Perfect Score")).toBeVisible();

  await expect(badge(page, "Retired Badge")).toHaveCount(0);
  await expect(badge(page, "Gold Coin")).toHaveCount(0);
  await expect(page.locator(".badge-grid img")).toHaveCount(5);
});

test("players get no award tab and no list of who is in the world", async ({ page, request, world }) => {
  await world.seed({ otherVisitors: { 7: { profileId: "profile-other", displayName: "Other Player" } } });
  await page.goto(world.url("/"));
  await expect(badge(page, "Perfect Score")).toBeVisible();

  await expect(page.getByRole("button", { name: "Award Badges" })).toHaveCount(0);
  const state = await (await request.get(world.api("/game-state"))).json();
  expect(state).toMatchObject({ success: true, isAdmin: false });
  expect(state.currentVisitors).toBeUndefined();
});

test("shows an error when the player can't be loaded", async ({ page, world }) => {
  await world.seed({ failures: { "GET /api/v1/world/": 500 } });
  await page.goto(world.url("/"));

  await expect(page.locator(".text-error")).toContainText("Error");
});

test("asks to open the app inside a Topia world when credentials are missing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Missing Interactive Parameters" })).toBeVisible();
});
