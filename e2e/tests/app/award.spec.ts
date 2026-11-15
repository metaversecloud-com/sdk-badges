// The admin's Award Badges tab: pick visitors and a badge, confirm, and the recipients get the badge,
// a toast and confetti.
import type { Page } from "@playwright/test";
import { VISITOR_ID, expect, test } from "../../fixtures";

const ALICE = { id: 7, profileId: "profile-alice", displayName: "Alice" };
const BOB = { id: 8, profileId: "profile-bob", displayName: "Bob" };
const otherVisitors = {
  [ALICE.id]: { profileId: ALICE.profileId, displayName: ALICE.displayName },
  [BOB.id]: { profileId: BOB.profileId, displayName: BOB.displayName, isAdmin: true },
};

const openAwardTab = async (page: Page, url: string) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Award Badges" }).click();
  await expect(page.getByRole("heading", { name: "Current Visitors" })).toBeVisible();
};

const visitorRow = (page: Page, name: string) => page.locator("tr.visitor-item", { hasText: name });
const badgeTile = (page: Page, name: string) => page.getByRole("img", { name, exact: true });
// The footer's button; the confirmation modal has its own.
const awardButton = (page: Page) => page.locator("div.fixed").getByRole("button");

test("lists everyone in the world, admins starred, and filters by name", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await expect(page.locator("tr.visitor-item")).toHaveCount(3);
  await expect(visitorRow(page, "Bob")).toContainText("⭐️");
  await expect(visitorRow(page, "Alice")).not.toContainText("⭐️");

  await page.getByPlaceholder("Search visitors...").fill("ali");
  await expect(page.locator("tr.visitor-item")).toHaveCount(1);
  await expect(visitorRow(page, "Alice")).toBeVisible();

  await page.getByPlaceholder("Search visitors...").fill("nobody");
  await expect(page.getByText("No visitors found.")).toBeVisible();
});

test("filters badges by name", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await page.getByPlaceholder("Search badges...").fill("round");
  await expect(page.locator(".badge-grid img")).toHaveCount(1);
  await expect(badgeTile(page, "Lightning Round")).toBeVisible();
});

test("awarding needs at least one visitor and a badge", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await expect(awardButton(page)).toBeDisabled();
  await visitorRow(page, "Alice").click();
  await expect(awardButton(page)).toBeDisabled();
  await badgeTile(page, "Perfect Score").click();
  await expect(awardButton(page)).toBeEnabled();
  await visitorRow(page, "Alice").click();
  await expect(awardButton(page)).toBeDisabled();
});

test("awards the badge with a toast, confetti and the admin's award history", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await visitorRow(page, "Alice").click();
  await badgeTile(page, "Perfect Score").click();
  await awardButton(page).click();
  await expect(page.getByRole("heading", { name: "Award Perfect Score to Alice?" })).toBeVisible();
  await page.getByPlaceholder("Add a message...").fill("Great job!");
  await page.locator(".modal").getByRole("button", { name: "Award Badge" }).click();

  await expect(page.getByText("Awarded Perfect Score to Alice!")).toBeVisible();
  expect(await world.events("grant-user-item")).toEqual([
    expect.objectContaining({ profileId: ALICE.profileId, name: "Perfect Score", quantity: 1 }),
  ]);
  // Toast and confetti aren't awaited by the server, so they may land after the response.
  await expect.poll(async () => world.events("fire-toast")).toEqual([
    expect.objectContaining({
      visitorId: String(ALICE.id),
      groupId: "badges",
      title: "You unlocked the Perfect Score badge!",
      text: "Great job!",
    }),
  ]);
  await expect
    .poll(async () => world.events("particles"))
    .toEqual([expect.objectContaining({ particleName: "confetti_1", followPlayerId: ALICE.id })]);
  expect(await world.visitorData()).toEqual({ awardHistory: { "Perfect Score": [ALICE.profileId] } });
  // The selection is cleared for the next award.
  await expect(visitorRow(page, "Alice")).not.toHaveClass(/selected/);
  await expect(awardButton(page)).toBeDisabled();
});

test("awards one badge to several visitors at once", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await visitorRow(page, "Alice").click();
  await visitorRow(page, "Bob").click();
  await badgeTile(page, "Quiz Master").click();
  await expect(awardButton(page)).toHaveText("Award Badge (2)");
  await awardButton(page).click();
  await expect(page.getByRole("heading", { name: "Award Quiz Master to 2 visitors?" })).toBeVisible();
  await page.locator(".modal").getByRole("button", { name: "Award Badge" }).click();

  await expect(page.getByText("Awarded Quiz Master to Alice, Bob!")).toBeVisible();
  const granted = (await world.events("grant-user-item")).map((e) => e.profileId).sort();
  expect(granted).toEqual([ALICE.profileId, BOB.profileId]);
  expect((await world.visitorData()).awardHistory["Quiz Master"].sort()).toEqual([ALICE.profileId, BOB.profileId]);
});

test("an admin who awards themselves sees the badge in color under My Badges", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await openAwardTab(page, world.url("/"));

  await visitorRow(page, world.displayName).click();
  await badgeTile(page, "Top 3 Finisher").click();
  await awardButton(page).click();
  await page.locator(".modal").getByRole("button", { name: "Award Badge" }).click();
  await expect(page.getByText(`Awarded Top 3 Finisher to ${world.displayName}!`)).toBeVisible();

  await page.getByRole("button", { name: "My Badges" }).click();
  await expect(badgeTile(page, "Top 3 Finisher")).not.toHaveClass(/badge-img-grayscale/);
  await expect(badgeTile(page, "Perfect Score")).toHaveClass(/badge-img-grayscale/);
});

test("cancelling the confirmation awards nothing", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });
  await openAwardTab(page, world.url("/"));

  await visitorRow(page, "Alice").click();
  await badgeTile(page, "Perfect Score").click();
  await awardButton(page).click();
  await page.locator(".modal").getByRole("button", { name: "Cancel" }).click();

  await expect(page.locator(".modal")).toHaveCount(0);
  expect(await world.events("grant-user-item")).toEqual([]);
});

test("a double click on confirm sends one award", async ({ page, world }) => {
  // Slow Topia, so the second click lands while the first award is still running.
  await world.seed({ isAdmin: true, otherVisitors, latencyMs: 100 });
  await openAwardTab(page, world.url("/"));
  let posts = 0;
  page.on("request", (r) => r.url().includes("/api/award-badge") && posts++);

  await visitorRow(page, "Alice").click();
  await badgeTile(page, "Perfect Score").click();
  await awardButton(page).click();
  await page.locator(".modal").getByRole("button", { name: "Award Badge" }).dblclick();

  await expect(page.getByText("Awarded Perfect Score to Alice!")).toBeVisible();
  expect(posts).toBe(1);
  expect(await world.events("grant-user-item")).toHaveLength(1);
});

test("shows the error when the award fails", async ({ page, world }) => {
  await world.seed({ isAdmin: true, otherVisitors, failures: { [`/visitors/${VISITOR_ID}/update-data-object`]: 500 } });
  await openAwardTab(page, world.url("/"));

  await visitorRow(page, "Alice").click();
  await badgeTile(page, "Perfect Score").click();
  await awardButton(page).click();
  await page.locator(".modal").getByRole("button", { name: "Award Badge" }).click();

  await expect(page.locator(".text-error")).toContainText("Error");
  await expect(page.getByText(/^Awarded /)).toHaveCount(0);
});

test("the refresh button reloads who is in the world", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await openAwardTab(page, world.url("/"));
  await expect(page.locator("tr.visitor-item")).toHaveCount(1);

  await world.seed({ isAdmin: true, otherVisitors });
  await page.getByTitle("Refresh visitors").click();

  await expect(page.locator("tr.visitor-item")).toHaveCount(3);
});
