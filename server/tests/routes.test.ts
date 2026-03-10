const topiaMock = require("../mocks/@rtsdk/topia").__mock;

import express from "express";
import request from "supertest";

import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
};

// Mock the utils
jest.mock("../utils/index.js", () => ({
  errorHandler: jest.fn(),
  getCredentials: jest.fn(),
  getBadges: jest.fn(),
  getVisitorBadges: jest.fn(),
  awardBadge: jest.fn(),
  Visitor: {
    get: jest.fn(),
    create: jest.fn(),
  },
  WorldActivity: {
    create: jest.fn(),
  },
}));

const mockUtils = jest.mocked(require("../utils/index.js"));

const mockBadges = {
  "Hard Worker": { id: "badge-1", name: "Hard Worker", icon: "https://example.com/hw.png", description: "Works hard" },
  Explorer: { id: "badge-2", name: "Explorer", icon: "https://example.com/ex.png", description: "Explores things" },
};

const mockVisitorInventory = {
  badges: {
    "Hard Worker": { id: "badge-1", name: "Hard Worker", icon: "https://example.com/hw.png" },
  },
};

describe("routes", () => {
  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();
  });

  test("GET /system/health returns status OK and env keys", async () => {
    const app = makeApp();
    const res = await request(app).get("/api/system/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
    expect(res.body).toHaveProperty("envs");
    expect(res.body.envs).toHaveProperty("NODE_ENV");
  });

  describe("GET /game-state", () => {
    test("returns badges and visitor inventory for non-admin", async () => {
      const mockVisitor = {
        isAdmin: false,
        inventoryItems: [{ id: "badge-1", name: "Hard Worker", type: "BADGE", status: "ACTIVE" }],
        fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.getBadges.mockResolvedValue(mockBadges);
      mockUtils.getVisitorBadges.mockReturnValue(mockVisitorInventory);

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        isAdmin: false,
        badges: mockBadges,
        visitorInventory: mockVisitorInventory,
      });

      expect(mockUtils.Visitor.get).toHaveBeenCalledWith(baseCreds.visitorId, baseCreds.urlSlug, { credentials: baseCreds });
      expect(mockUtils.getBadges).toHaveBeenCalledWith(baseCreds);
      expect(mockVisitor.fetchInventoryItems).toHaveBeenCalled();
      expect(mockUtils.getVisitorBadges).toHaveBeenCalledWith(mockVisitor.inventoryItems);
      expect(mockUtils.WorldActivity.create).not.toHaveBeenCalled();
    });

    test("returns currentVisitors for admin", async () => {
      const mockVisitor = {
        isAdmin: true,
        inventoryItems: [],
        fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      };

      const mockCurrentVisitors = {
        v1: { visitorId: 10, profileId: "p10", displayName: "Alice", isAdmin: false },
        v2: { visitorId: 20, profileId: "p20", displayName: "Bob", isAdmin: false },
      };

      const mockWorldActivity = {
        currentVisitors: jest.fn().mockResolvedValue(mockCurrentVisitors),
      };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.getBadges.mockResolvedValue(mockBadges);
      mockUtils.getVisitorBadges.mockReturnValue({ badges: {} });
      mockUtils.WorldActivity.create.mockResolvedValue(mockWorldActivity);

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isAdmin).toBe(true);
      expect(res.body.currentVisitors).toEqual([
        { visitorId: 10, profileId: "p10", displayName: "Alice" },
        { visitorId: 20, profileId: "p20", displayName: "Bob" },
      ]);

      expect(mockUtils.WorldActivity.create).toHaveBeenCalledWith(baseCreds.urlSlug, { credentials: baseCreds });
      expect(mockWorldActivity.currentVisitors).toHaveBeenCalledWith(true);
    });

    test("filters out admin visitors from currentVisitors", async () => {
      const mockVisitor = {
        isAdmin: true,
        inventoryItems: [],
        fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      };

      const mockCurrentVisitors = {
        v1: { visitorId: 10, profileId: "p10", displayName: "Alice", isAdmin: false },
        v2: { visitorId: 20, profileId: "p20", displayName: "AdminUser", isAdmin: true },
        v3: { visitorId: 30, profileId: "p30", displayName: "Charlie", isAdmin: false },
      };

      const mockWorldActivity = {
        currentVisitors: jest.fn().mockResolvedValue(mockCurrentVisitors),
      };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.getBadges.mockResolvedValue(mockBadges);
      mockUtils.getVisitorBadges.mockReturnValue({ badges: {} });
      mockUtils.WorldActivity.create.mockResolvedValue(mockWorldActivity);

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.body.currentVisitors).toHaveLength(2);
      expect(res.body.currentVisitors.map((v: any) => v.displayName)).toEqual(["Alice", "Charlie"]);
    });

    test("falls back to username when displayName is missing", async () => {
      const mockVisitor = {
        isAdmin: true,
        inventoryItems: [],
        fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      };

      const mockCurrentVisitors = {
        v1: { visitorId: 10, profileId: "p10", displayName: "", username: "alice99", isAdmin: false },
        v2: { visitorId: 20, profileId: "p20", username: "bob42", isAdmin: false },
      };

      const mockWorldActivity = {
        currentVisitors: jest.fn().mockResolvedValue(mockCurrentVisitors),
      };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.getBadges.mockResolvedValue(mockBadges);
      mockUtils.getVisitorBadges.mockReturnValue({ badges: {} });
      mockUtils.WorldActivity.create.mockResolvedValue(mockWorldActivity);

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.body.currentVisitors).toEqual([
        { visitorId: 10, profileId: "p10", displayName: "alice99" },
        { visitorId: 20, profileId: "p20", displayName: "bob42" },
      ]);
    });

    test("returns empty currentVisitors when WorldActivity fails", async () => {
      const mockVisitor = {
        isAdmin: true,
        inventoryItems: [],
        fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.getBadges.mockResolvedValue(mockBadges);
      mockUtils.getVisitorBadges.mockReturnValue({ badges: {} });
      mockUtils.WorldActivity.create.mockRejectedValue(new Error("WorldActivity error"));

      const app = makeApp();
      const res = await request(app).get("/api/game-state").query(baseCreds);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentVisitors).toEqual([]);
    });

    test("calls errorHandler when credentials fail", async () => {
      const mockError = new Error("Missing credentials");

      mockUtils.getCredentials.mockImplementation(() => {
        throw mockError;
      });
      mockUtils.errorHandler.mockImplementation(({ res }: any) => {
        if (res) return res.status(500).json({ error: "Internal server error" });
      });

      const app = makeApp();
      await request(app).get("/api/game-state").query(baseCreds);

      expect(mockUtils.errorHandler).toHaveBeenCalledWith({
        error: mockError,
        functionName: "handleGetGameState",
        message: "Error loading game state",
        req: expect.any(Object),
        res: expect.any(Object),
      });
    });
  });

  describe("POST /award-badge", () => {
    const awardBody = {
      recipientVisitorId: 10,
      recipientProfileId: "profile-10",
      badgeName: "Hard Worker",
      comment: "Great job!",
    };

    test("awards badge successfully for admin", async () => {
      const mockVisitor = { isAdmin: true };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.awardBadge.mockResolvedValue({ success: true });

      const app = makeApp();
      const res = await request(app).post("/api/award-badge").query(baseCreds).send(awardBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      expect(mockUtils.awardBadge).toHaveBeenCalledWith({
        credentials: baseCreds,
        recipientVisitorId: 10,
        recipientProfileId: "profile-10",
        badgeName: "Hard Worker",
        comment: "Great job!",
      });
    });

    test("returns 403 when visitor is not admin", async () => {
      const mockVisitor = { isAdmin: false };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);

      const app = makeApp();
      const res = await request(app).post("/api/award-badge").query(baseCreds).send(awardBody);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, message: "Admin access required" });
      expect(mockUtils.awardBadge).not.toHaveBeenCalled();
    });

    test("returns 400 when required fields are missing", async () => {
      const mockVisitor = { isAdmin: true };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);

      const app = makeApp();

      const res = await request(app)
        .post("/api/award-badge")
        .query(baseCreds)
        .send({ recipientVisitorId: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, message: "Missing required fields" });
      expect(mockUtils.awardBadge).not.toHaveBeenCalled();
    });

    test("defaults comment to empty string", async () => {
      const mockVisitor = { isAdmin: true };

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.awardBadge.mockResolvedValue({ success: true });

      const app = makeApp();
      const res = await request(app)
        .post("/api/award-badge")
        .query(baseCreds)
        .send({ recipientVisitorId: 10, recipientProfileId: "p10", badgeName: "Explorer" });

      expect(res.status).toBe(200);
      expect(mockUtils.awardBadge).toHaveBeenCalledWith(
        expect.objectContaining({ comment: "" }),
      );
    });

    test("calls errorHandler when awardBadge throws", async () => {
      const mockVisitor = { isAdmin: true };
      const mockError = new Error("Award failed");

      mockUtils.getCredentials.mockReturnValue(baseCreds);
      mockUtils.Visitor.get.mockResolvedValue(mockVisitor);
      mockUtils.awardBadge.mockRejectedValue(mockError);
      mockUtils.errorHandler.mockImplementation(({ res }: any) => {
        if (res) return res.status(500).json({ error: "Internal server error" });
      });

      const app = makeApp();
      await request(app).post("/api/award-badge").query(baseCreds).send(awardBody);

      expect(mockUtils.errorHandler).toHaveBeenCalledWith({
        error: mockError,
        functionName: "handleAwardBadge",
        message: "Error awarding badge",
        req: expect.any(Object),
        res: expect.any(Object),
      });
    });
  });
});
