import { standardizeError } from "./standardizeError.js";

/**
 * Initialize the admin's visitor data object for award tracking.
 * Sets default shape { awardHistory: {} } if not already present.
 * Uses locking to prevent race conditions.
 */
export const initializeVisitorDataObject = async (visitor: any) => {
  try {
    await visitor.fetchDataObject();

    if (!visitor.dataObject || !visitor.dataObject.awardHistory) {
      const lockId = `${visitor.visitorId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
      await visitor
        .setDataObject({ awardHistory: {} }, { lock: { lockId, releaseLock: true } })
        .catch(() => console.warn("Unable to acquire lock for visitor data object initialization"));
    }

    return;
  } catch (error: any) {
    throw standardizeError(error);
  }
};
