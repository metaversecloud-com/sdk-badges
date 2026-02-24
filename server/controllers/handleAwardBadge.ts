import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, awardBadge, Visitor } from "../utils/index.js";

export const handleAwardBadge = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { recipients, badgeName, comment } = req.body;

    // Admin check
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !badgeName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const awarded: string[] = [];

    for (const recipient of recipients) {
      const { recipientVisitorId, recipientProfileId, recipientDisplayName } = recipient;
      if (!recipientVisitorId || !recipientProfileId) continue;

      await awardBadge({
        credentials,
        recipientVisitorId: Number(recipientVisitorId),
        recipientProfileId,
        badgeName,
        comment: comment || "",
      });

      awarded.push(recipientDisplayName || recipientProfileId);
    }

    return res.json({ success: true, awarded });
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
