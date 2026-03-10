export const fireToast = jest.fn().mockResolvedValue({ success: true });
export const triggerParticle = jest.fn().mockResolvedValue({ success: true });
export const grantInventoryItem = jest.fn().mockResolvedValue({ success: true });
export const fetchInventoryItems = jest.fn().mockResolvedValue([]);
export const fetchDataObject = jest.fn().mockResolvedValue({});
export const setDataObject = jest.fn().mockResolvedValue({});
export const updateDataObject = jest.fn().mockResolvedValue({});
export const currentVisitors = jest.fn().mockResolvedValue({});

export class Topia {
  constructor(_opts: any) {}
}

export class AssetFactory {
  constructor(_topia: any) {}
}

export class DroppedAssetFactory {
  constructor(_topia: any) {}
}

export class EcosystemFactory {
  constructor(_topia: any) {}
  create(_opts: any) {
    return { fetchInventoryItems, inventoryItems: [] };
  }
}

export class UserFactory {
  constructor(_topia: any) {}
}

export class VisitorFactory {
  constructor(_topia: any) {}
}

export class WorldActivityFactory {
  constructor(_topia: any) {}
  create(_slug: string, _opts: any) {
    return { currentVisitors };
  }
}

export class WorldFactory {
  constructor(_topia: any) {}
  create(slug: string, opts: any) {
    (__mock as any).lastWorldCreateArgs = { slug, opts };
    return { fireToast };
  }
}

export const __mock = {
  fireToast,
  triggerParticle,
  grantInventoryItem,
  fetchInventoryItems,
  fetchDataObject,
  setDataObject,
  updateDataObject,
  currentVisitors,
  lastWorldCreateArgs: null as any,
  reset() {
    fireToast.mockClear();
    triggerParticle.mockClear();
    grantInventoryItem.mockClear();
    fetchInventoryItems.mockClear();
    fetchDataObject.mockClear();
    setDataObject.mockClear();
    updateDataObject.mockClear();
    currentVisitors.mockClear();
    this.lastWorldCreateArgs = null;
  },
};
