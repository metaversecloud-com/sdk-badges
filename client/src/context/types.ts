import { DroppedAssetInterface } from "@rtsdk/topia";
import { VisitorDataObject } from "@shared/types/VisitorData";

export const SET_HAS_INTERACTIVE_PARAMS = "SET_HAS_INTERACTIVE_PARAMS";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
};

export type BadgeType = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export type VisitorInventoryType = {
  badges: { [name: string]: { id: string; name: string; icon: string } };
};

export type CurrentVisitor = {
  visitorId: number;
  profileId: string;
  displayName: string;
  username: string;
  isAdmin: boolean;
};

export interface InitialState {
  isAdmin?: boolean;
  error?: string;
  hasInteractiveParams?: boolean;
  visitorData?: VisitorDataObject;
  droppedAsset?: DroppedAssetInterface;
  badges?: { [name: string]: BadgeType };
  visitorInventory?: VisitorInventoryType;
  currentVisitors?: CurrentVisitor[];
}

export type ActionType = {
  type: string;
  payload: Partial<InitialState>;
};

export type ErrorType =
  | string
  | {
      message?: string;
      response?: { data?: { error?: { message?: string }; message?: string } };
    };
