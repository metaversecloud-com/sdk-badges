import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import { AwardBadgeModal, PageContainer } from "@/components";

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

  // Admin-only state
  const [selectedVisitor, setSelectedVisitor] = useState<CurrentVisitor | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [badgeSearchTerm, setBadgeSearchTerm] = useState("");
  const [awardSuccess, setAwardSuccess] = useState<{ badgeName: string; displayName: string } | null>(null);

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  const filteredVisitors = useMemo(() => {
    if (!currentVisitors) return [];
    if (!searchTerm.trim()) return currentVisitors;
    const term = searchTerm.toLowerCase();
    return currentVisitors.filter((v) => v.displayName.toLowerCase().includes(term));
  }, [currentVisitors, searchTerm]);

  const handleAwardClick = () => {
    if (selectedVisitor && selectedBadge) {
      setShowAwardModal(true);
    }
  };

  const handleConfirmAward = async (comment: string) => {
    if (!selectedVisitor || !selectedBadge) return;

    try {
      const response = await backendAPI.post("/award-badge", {
        recipientVisitorId: selectedVisitor.visitorId,
        recipientProfileId: selectedVisitor.profileId,
        recipientDisplayName: selectedVisitor.displayName,
        badgeName: selectedBadge,
        comment,
      });

      if (response.data.alreadyOwned) {
        setErrorMessage(dispatch, `${selectedVisitor.displayName} already has the ${selectedBadge} badge.`);
      } else {
        setAwardSuccess({ badgeName: selectedBadge, displayName: selectedVisitor.displayName });
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
      setSelectedVisitor(null);
    }
  };

  const badgeList = useMemo(() => (badges ? Object.values(badges) : []), [badges]);

  const filteredBadges = useMemo(() => {
    if (!isAdmin || !badgeSearchTerm.trim()) return badgeList;
    const term = badgeSearchTerm.toLowerCase();
    return badgeList.filter((b) => b.name.toLowerCase().includes(term));
  }, [badgeList, badgeSearchTerm, isAdmin]);

  return (
    <PageContainer isLoading={isLoading} headerText="Badges">
      {/* Award success animation */}
      {awardSuccess && (
        <div className="award-success-banner award-success">
          <p className="p1 text-success">
            Awarded {awardSuccess.badgeName} to {awardSuccess.displayName}!
          </p>
        </div>
      )}

      {/* Admin Section: Visitor List */}
      {isAdmin && (
        <div className="mb-6">
          <h3 className="h3 py-3">Current Visitors</h3>
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
                      className={`visitor-item ${selectedVisitor?.visitorId === visitor.visitorId ? "selected" : ""}`}
                      onClick={() => setSelectedVisitor(visitor)}
                    >
                      <td className="p2">{visitor.displayName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Badges Grid */}
      <h3 className="h3 py-3">{isAdmin ? "Select a Badge to Award" : ""}</h3>
      {isAdmin && (
        <div className="input-group mb-2">
          <input
            className="input"
            type="text"
            placeholder="Search badges..."
            value={badgeSearchTerm}
            onChange={(e) => setBadgeSearchTerm(e.target.value)}
          />
        </div>
      )}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-4">
          <p className="p2 text-muted">No badges available yet.</p>
        </div>
      ) : (
        <div className="grid badge-grid">
          {filteredBadges.map((badge: BadgeType) => {
            const hasBadge = visitorInventory?.badges && badge.name in visitorInventory.badges;
            const isSelected = isAdmin && selectedBadge === badge.name;

            return (
              <div
                key={badge.name}
                className={`tooltip ${isAdmin ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => isAdmin && setSelectedBadge(badge.name)}
              >
                <span className="tooltip-content">{badge.description || badge.name}</span>
                <img src={badge.icon} alt={badge.name} className={hasBadge || isAdmin ? "" : "badge-img-grayscale"} />
              </div>
            );
          })}
        </div>
      )}

      {/* Admin: Award Button */}
      {isAdmin && (
        <button className="btn mt-4" disabled={!selectedVisitor || !selectedBadge} onClick={handleAwardClick}>
          Award Badge
        </button>
      )}

      {/* Award Confirmation Modal */}
      {showAwardModal && selectedVisitor && selectedBadge && (
        <AwardBadgeModal
          badgeName={selectedBadge}
          displayName={selectedVisitor.displayName}
          onConfirm={handleConfirmAward}
          onCancel={() => setShowAwardModal(false)}
        />
      )}
    </PageContainer>
  );
};

export default Home;
