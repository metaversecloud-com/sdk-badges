import { Credentials } from "../types/index.js";
import { Ecosystem } from "./topiaInit.js";
import { standardizeError } from "./standardizeError.js";
import { InventoryItemInterface } from "@rtsdk/topia";

interface CachedInventory {
  items: InventoryItemInterface[];
  timestamp: number;
}

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

// In-memory cache
let inventoryCache: CachedInventory | null = null;

/**
 * Get ecosystem inventory items with caching
 * - Fetches from cache if available and not expired
 * - Refreshes cache if expired or missing
 * - Can force refresh by passing forceRefresh: true
 */
export const getCachedInventoryItems = async ({
  credentials,
  forceRefresh = false,
}: {
  credentials: Credentials;
  forceRefresh?: boolean;
}): Promise<InventoryItemInterface[]> => {
  try {
    const now = Date.now();

    const isCacheValid = inventoryCache !== null && !forceRefresh && now - inventoryCache.timestamp < CACHE_DURATION_MS;

    if (isCacheValid) {
      return inventoryCache!.items;
    }

    console.log("Fetching fresh inventory items from ecosystem");
    const ecosystem = Ecosystem.create({ credentials });
    await ecosystem.fetchInventoryItems();

    inventoryCache = {
      items: (ecosystem.inventoryItems as InventoryItemInterface[])
        .map((item) => ({
          ...item,
          metadata: {
            ...(item.metadata || {}),
            sortOrder: typeof item.metadata?.sortOrder === "number" ? item.metadata.sortOrder : 0,
          },
        }))
        .sort((a, b) => {
          const aOrder = a.metadata?.sortOrder ?? 0;
          const bOrder = b.metadata?.sortOrder ?? 0;
          return aOrder - bOrder;
        }),
      timestamp: now,
    };

    return inventoryCache.items;
  } catch (error) {
    if (inventoryCache !== null) {
      console.warn("Failed to fetch fresh inventory, using stale cache", error);
      return inventoryCache.items;
    }

    throw standardizeError(error);
  }
};

export const clearInventoryCache = (): void => {
  inventoryCache = null;
  console.log("Inventory cache cleared");
};
