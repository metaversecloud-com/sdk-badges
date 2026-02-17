import { Credentials, VisitorDataObject } from "../types/index.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { getVisitorBadges } from "./getVisitorBadges.js";
import { User, Visitor } from "./topiaInit.js";
import { standardizeError } from "./standardizeError.js";
import { initializeVisitorDataObject } from "./initializeVisitorDataObject.js";

/**
 * Award a badge to a visitor if they don't already have it.
 * Fires toast and particle effects on the recipient.
 * Tracks the award in the admin's visitor data object.
 */
export const awardBadge = async ({
  credentials,
  recipientVisitorId,
  recipientProfileId,
  badgeName,
  comment,
}: {
  credentials: Credentials;
  recipientVisitorId: number;
  recipientProfileId: string;
  badgeName: string;
  comment?: string;
}) => {
  try {
    const { urlSlug, visitorId: adminVisitorId } = credentials;

    // Find the badge in ecosystem inventory
    const inventoryItems = await getCachedInventoryItems({ credentials });
    const inventoryItem = inventoryItems?.find((item) => item.name === badgeName && item.type === "BADGE");
    if (!inventoryItem) throw new Error(`Badge "${badgeName}" not found in ecosystem inventory`);

    try {
      const recipientUser = await User.create({ credentials: { ...credentials, profileId: recipientProfileId } });
      const recipientVisitor = await Visitor.create(recipientVisitorId, urlSlug, { credentials });

      // Grant the badge
      await recipientUser.grantInventoryItem(inventoryItem, 1);

      // Fire toast to recipient
      recipientVisitor
        .fireToast({
          groupId: "badges",
          title: `You unlocked the ${badgeName} badge!`,
          text: comment || "",
        })
        .catch(() => console.error(`Failed to fire toast for ${badgeName} badge`));

      // Trigger particle effects on recipient
      recipientVisitor
        .triggerParticle({ name: "confetti_1", duration: 4 })
        .catch(() => console.error(`Failed to trigger particles for ${badgeName} badge`));
    } catch (error) {
      console.error(standardizeError(error));
    }

    // Track award in admin's visitor data object
    const admin = await Visitor.create(adminVisitorId, urlSlug, { credentials });
    await initializeVisitorDataObject(admin);

    const lockId = `award-${adminVisitorId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
    const data: VisitorDataObject = admin.dataObject!;
    const existingAwards: string[] = data?.awardHistory?.[badgeName] || [];
    if (!existingAwards.includes(recipientProfileId)) {
      await admin.updateDataObject(
        { [`awardHistory.${badgeName}`]: [...existingAwards, recipientProfileId] },
        { lock: { lockId, releaseLock: true } },
      );
    }

    return { success: true };
  } catch (error: any) {
    throw standardizeError(error);
  }
};
