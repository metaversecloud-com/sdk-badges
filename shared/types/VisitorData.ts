/**
 * Shared types between client and server for visitor data.
 * Stored on the admin's visitor data object to track badge awards.
 */

export interface VisitorDataObject {
  awardHistory?: {
    [badgeName: string]: string[];
  };
}
