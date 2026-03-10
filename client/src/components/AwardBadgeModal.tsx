import { useState } from "react";

interface AwardBadgeModalProps {
  badgeName: string;
  displayNames: string[];
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export const AwardBadgeModal = ({ badgeName, displayNames, onConfirm, onCancel }: AwardBadgeModalProps) => {
  const [comment, setComment] = useState("");
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);

  const handleConfirm = () => {
    setAreButtonsDisabled(true);
    onConfirm(comment);
  };

  return (
    <div className="modal-container">
      <div className="modal">
        <h4 className="h4">
          Award {badgeName} to {displayNames.length === 1 ? displayNames[0] : `${displayNames.length} visitors`}?
        </h4>
        <div className="input-group">
          <label className="label">Comment (optional)</label>
          <input
            className="input"
            type="text"
            placeholder="Add a message..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={120}
          />
          <span className="input-char-count">{comment.length}/120</span>
        </div>
        <div className="actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={areButtonsDisabled}>
            Cancel
          </button>
          <button className="btn" onClick={handleConfirm} disabled={areButtonsDisabled}>
            Award Badge
          </button>
        </div>
      </div>
    </div>
  );
};

export default AwardBadgeModal;
