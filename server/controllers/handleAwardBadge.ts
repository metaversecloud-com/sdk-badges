import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, awardBadge, Visitor } from "../utils/index.js";

export const handleAwardBadge = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Admin check
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { recipientVisitorId, recipientProfileId, badgeName, comment } = req.body;

    if (!recipientVisitorId || !recipientProfileId || !badgeName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const result = await awardBadge({
      credentials,
      recipientVisitorId: Number(recipientVisitorId),
      recipientProfileId,
      badgeName,
      comment: comment || "",
    });

    return res.json(result);
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAwardBadge",
      message: "Error awarding badge",
      req,
      res,
    });
  }
};
