// POST /api/award-badge called directly: who may award, what may be awarded, and what the recipient
// is told when something goes wrong.
import { VISITOR_ID, expect, test } from "../../fixtures";

const ALICE = { id: 7, profileId: "profile-alice", displayName: "Alice" };
const otherVisitors = { [ALICE.id]: { profileId: ALICE.profileId, displayName: ALICE.displayName } };
const toAlice = { recipientVisitorId: ALICE.id, recipientProfileId: ALICE.profileId, recipientDisplayName: "Alice" };

// Toasts and confetti aren't awaited by the server; give stray ones time to land before asserting none came.
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

test("players can't award badges", async ({ request, world }) => {
  await world.seed({ isAdmin: false, otherVisitors });

  const response = await request.post(world.api("/award-badge"), {
    data: { badgeName: "Perfect Score", recipients: [{ ...toAlice, recipientVisitorId: VISITOR_ID, recipientProfileId: world.profileId }] },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ success: false, message: "Admin access required" });
  await settle();
  expect(await world.events("grant-user-item")).toEqual([]);
  expect(await world.events("fire-toast")).toEqual([]);
});

test("rejects an award without recipients or badge", async ({ request, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });

  for (const data of [{ badgeName: "Perfect Score", recipients: [] }, { recipients: [toAlice] }, { badgeName: "Perfect Score" }]) {
    const response = await request.post(world.api("/award-badge"), { data });
    expect(response.status(), JSON.stringify(data)).toBe(400);
  }
  expect(await world.events("grant-user-item")).toEqual([]);
});

test("rejects a badge that isn't in the catalog, or an item that isn't a badge", async ({ request, world }) => {
  await world.seed({ isAdmin: true, otherVisitors });

  for (const badgeName of ["No Such Badge", "Gold Coin"]) {
    const response = await request.post(world.api("/award-badge"), { data: { badgeName, recipients: [toAlice] } });
    expect(response.ok(), badgeName).toBe(false);
    expect((await response.json()).success).toBe(false);
  }
  await settle();
  expect(await world.events("grant-user-item")).toEqual([]);
  expect(await world.events("fire-toast")).toEqual([]);
});

test("rejects a retired badge", async ({ request, world }) => {
  test.fail(true, "EXP-450: retired (INACTIVE) badges can still be awarded through the API");
  await world.seed({ isAdmin: true, otherVisitors });

  const response = await request.post(world.api("/award-badge"), { data: { badgeName: "Retired Badge", recipients: [toAlice] } });

  expect(response.ok()).toBe(false);
  await settle();
  expect(await world.events("grant-user-item")).toEqual([]);
  expect(await world.events("fire-toast")).toEqual([]);
});

test("doesn't tell the recipient they unlocked a badge the grant failed to give them", async ({ request, world }) => {
  test.fail(true, "EXP-450: a failed grant is swallowed; the recipient still gets the toast and the admin a success");
  await world.seed({ isAdmin: true, otherVisitors, failures: { "grant-user-inventory-item": 500 } });

  const response = await request.post(world.api("/award-badge"), { data: { badgeName: "Perfect Score", recipients: [toAlice] } });

  expect((await world.events("injected-failure")).length).toBeGreaterThan(0);
  const body = await response.json();
  expect(body.success && body.awarded.includes("Alice"), "reported as awarded").toBe(false);
  await settle();
  expect(await world.events("fire-toast")).toEqual([]);
});

test("re-awarding a badge the recipient already owns doesn't grant or announce it again", async ({ request, world }) => {
  test.fail(true, "EXP-450: an owned badge is granted again (quantity 2) and the 'You unlocked' toast fires again");
  await world.seed({ isAdmin: true, otherVisitors: { [ALICE.id]: { ...otherVisitors[ALICE.id], badges: ["Perfect Score"] } } });

  const response = await request.post(world.api("/award-badge"), { data: { badgeName: "Perfect Score", recipients: [toAlice] } });

  expect(response.ok()).toBe(true);
  await settle();
  expect(await world.events("grant-user-item")).toEqual([]);
  expect(await world.events("fire-toast")).toEqual([]);
});

test("two awards at the same time both land in the award history", async ({ request, world }) => {
  test.fail(true, "EXP-450: concurrent awards overwrite each other's award history (read-modify-write)");
  await world.seed({
    isAdmin: true,
    visitorData: { awardHistory: {} },
    otherVisitors: { ...otherVisitors, 8: { profileId: "profile-bob", displayName: "Bob" } },
    latencyMs: 50,
  });

  const responses = await Promise.all([
    request.post(world.api("/award-badge"), { data: { badgeName: "Perfect Score", recipients: [toAlice] } }),
    request.post(world.api("/award-badge"), {
      data: { badgeName: "Perfect Score", recipients: [{ recipientVisitorId: 8, recipientProfileId: "profile-bob" }] },
    }),
  ]);

  for (const response of responses) expect(response.ok()).toBe(true);
  expect((await world.visitorData()).awardHistory["Perfect Score"].sort()).toEqual([ALICE.profileId, "profile-bob"]);
});

test("records a badge whose name contains a dot under its own name", async ({ request, world }) => {
  test.fail(true, "EXP-450: badge names are used as data-object paths; 'Level 2.0' is stored as awardHistory.Level 2 → '0'");
  await world.seed({ isAdmin: true, otherVisitors });

  const response = await request.post(world.api("/award-badge"), { data: { badgeName: "Level 2.0", recipients: [toAlice] } });

  expect(response.ok()).toBe(true);
  expect((await world.visitorData()).awardHistory).toEqual({ "Level 2.0": [ALICE.profileId] });
});
