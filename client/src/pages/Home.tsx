import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { AwardBadgeModal, PageContainer, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { BadgeType, CurrentVisitor, ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { badges, currentVisitors, hasInteractiveParams, isAdmin, visitorInventory } = useContext(GlobalStateContext);

  const [searchParams] = useSearchParams();
  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-badges" | "award">("my-badges");

  // Admin-only state
  const [selectedVisitors, setSelectedVisitors] = useState<CurrentVisitor[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [badgeSearchTerm, setBadgeSearchTerm] = useState("");
  const [awardSuccess, setAwardSuccess] = useState<{ badgeName: string; displayNames: string } | null>(null);

  const fetchGameState = useCallback(() => {
    backendAPI
      .get("/game-state", { params: { forceRefreshInventory } })
      .then((response) => {
        setGameState(dispatch, response.data);
      })
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsLoading(false));
  }, [dispatch, forceRefreshInventory]);

  useEffect(() => {
    if (hasInteractiveParams) {
      fetchGameState();
    }
  }, [hasInteractiveParams]);

  const filteredVisitors = useMemo(() => {
    if (!currentVisitors) return [];
    if (!searchTerm.trim()) return currentVisitors;
    const term = searchTerm.toLowerCase();
    return currentVisitors.filter((v) => v.displayName.toLowerCase().includes(term));
  }, [currentVisitors, searchTerm]);

  const toggleVisitor = (visitor: CurrentVisitor) => {
    setSelectedVisitors((prev) =>
      prev.some((v) => v.visitorId === visitor.visitorId)
        ? prev.filter((v) => v.visitorId !== visitor.visitorId)
        : [...prev, visitor],
    );
  };

  const handleAwardClick = () => {
    if (selectedVisitors.length > 0 && selectedBadge) {
      setShowAwardModal(true);
    }
  };

  const handleConfirmAward = async (comment: string) => {
    if (selectedVisitors.length === 0 || !selectedBadge) return;

    try {
      const response = await backendAPI.post("/award-badge", {
        recipients: selectedVisitors.map((v) => ({
          recipientVisitorId: v.visitorId,
          recipientProfileId: v.profileId,
          recipientDisplayName: v.displayName,
        })),
        badgeName: selectedBadge,
        comment,
      });

      const { awarded = [] } = response.data;
      if (awarded.length > 0) {
        setAwardSuccess({ badgeName: selectedBadge, displayNames: awarded.join(", ") });
        setTimeout(() => setAwardSuccess(null), 3000);
      }

      // Refresh game state to get updated inventory
      const refreshResponse = await backendAPI.get("/game-state");
      setGameState(dispatch, refreshResponse.data);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setShowAwardModal(false);
      setSelectedBadge(null);
      setSelectedVisitors([]);
    }
  };

  const badgeList = useMemo(() => (badges ? Object.values(badges) : []), [badges]);

  const filteredBadges = useMemo(() => {
    if (!badgeSearchTerm.trim()) return badgeList;
    const term = badgeSearchTerm.toLowerCase();
    return badgeList.filter((b) => b.name.toLowerCase().includes(term));
  }, [badgeList, badgeSearchTerm]);

  const badgesGrid = (selectable: boolean) => {
    const list = selectable ? filteredBadges : badgeList;

    if (list.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="p2 text-muted">No badges available yet.</p>
        </div>
      );
    }

    return (
      <div className="grid badge-grid">
        {list.map((badge: BadgeType) => {
          const hasBadge = visitorInventory?.badges && badge.name in visitorInventory.badges;
          const isSelected = selectable && selectedBadge === badge.name;

          return (
            <div
              key={badge.name}
              className={`tooltip ${selectable ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => selectable && setSelectedBadge(badge.name)}
            >
              <span className="tooltip-content">{badge.description || badge.name}</span>
              <img src={badge.icon} alt={badge.name} className={hasBadge ? "" : "badge-img-grayscale"} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer isLoading={isLoading} headerText="Badges">
      {/* Award success animation */}
      {awardSuccess && (
        <div className="award-success-banner award-success">
          <p className="p1 text-success">
            Awarded {awardSuccess.badgeName} to {awardSuccess.displayNames}!
          </p>
        </div>
      )}

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="tab-container mb-4">
          <button
            className={activeTab === "my-badges" ? "btn" : "btn btn-text"}
            onClick={() => setActiveTab("my-badges")}
          >
            My Badges
          </button>
          <button
            className={activeTab === "award" ? "btn" : "btn btn-text"}
            onClick={() => setActiveTab("award")}
          >
            Award Badges
          </button>
        </div>
      )}

      {/* My Badges Tab (or non-admin default view) */}
      {(!isAdmin || activeTab === "my-badges") && badgesGrid(false)}

      {/* Award Badges Tab (admin only) */}
      {isAdmin && activeTab === "award" && (
        <>
          {/* Visitor List */}
          <div className="mb-6">
            <div className="flex items-center justify-between py-3">
              <h3 className="h3">Current Visitors</h3>
              <button className="btn btn-icon" onClick={fetchGameState} title="Refresh visitors">
                &#x21bb;
              </button>
            </div>
            <div className="input-group mb-2">
              <input
                className="input"
                type="text"
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {filteredVisitors.length === 0 ? (
                <p className="p3 text-muted text-center">No visitors found.</p>
              ) : (
                <table className="table">
                  <tbody>
                    {filteredVisitors.map((visitor) => (
                      <tr
                        key={visitor.visitorId}
                        className={`visitor-item ${selectedVisitors.some((v) => v.visitorId === visitor.visitorId) ? "selected" : ""}`}
                        onClick={() => toggleVisitor(visitor)}
                      >
                        <td className="p2">
                          {visitor.displayName} {visitor.isAdmin ? "⭐️" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Badge Selection */}
          <h3 className="h3 py-3">Select a Badge to Award</h3>
          <div className="input-group mb-2">
            <input
              className="input"
              type="text"
              placeholder="Search badges..."
              value={badgeSearchTerm}
              onChange={(e) => setBadgeSearchTerm(e.target.value)}
            />
          </div>
          {badgesGrid(true)}

          {/* Award Button */}
          <PageFooter>
            <button
              className="btn mt-4"
              disabled={selectedVisitors.length === 0 || !selectedBadge}
              onClick={handleAwardClick}
            >
              Award Badge{selectedVisitors.length > 1 ? ` (${selectedVisitors.length})` : ""}
            </button>
          </PageFooter>
        </>
      )}

      {/* Award Confirmation Modal */}
      {showAwardModal && selectedVisitors.length > 0 && selectedBadge && (
        <AwardBadgeModal
          badgeName={selectedBadge}
          displayNames={selectedVisitors.map((v) => v.displayName)}
          onConfirm={handleConfirmAward}
          onCancel={() => setShowAwardModal(false)}
        />
      )}
    </PageContainer>
  );
};

export default Home;
