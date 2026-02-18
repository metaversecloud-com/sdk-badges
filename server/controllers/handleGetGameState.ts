import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, getBadges, getVisitorBadges, Visitor, WorldActivity } from "../utils/index.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;
    const forceRefresh = req.query.forceRefreshInventory === "true";

    // Fetch visitor for admin status
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor;

    // Fetch badges and visitor inventory in parallel
    const [badges] = await Promise.all([getBadges(credentials, forceRefresh), visitor.fetchInventoryItems()]);
    const visitorInventory = getVisitorBadges(visitor.inventoryItems);

    const responseData: Record<string, any> = {
      success: true,
      isAdmin,
      badges,
      visitorInventory,
    };

    // Admin-only: fetch current visitors in the world
    if (isAdmin) {
      try {
        const worldActivity = await WorldActivity.create(urlSlug, { credentials });
        const currentVisitors = await worldActivity.currentVisitors(true);
        responseData.currentVisitors = Object.values(currentVisitors || {})
          .filter((v: any) => !v.isAdmin)
          .map((v: any) => ({
            visitorId: v.visitorId,
            profileId: v.profileId,
            displayName: v.displayName || v.username,
          }));
      } catch (error) {
        errorHandler({
          error,
          functionName: "handleGetGameState",
          message: "Error fetching current visitors",
        });
        responseData.currentVisitors = [];
      }
    }

    return res.json(responseData);
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error loading game state",
      req,
      res,
    });
  }
};
