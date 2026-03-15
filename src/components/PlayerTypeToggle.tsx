import type { PlayerType } from "../types";

interface PlayerTypeToggleProps {
  value: PlayerType;
  onChange: (value: PlayerType) => void;
}

function PlayerTypeToggle({ value, onChange }: PlayerTypeToggleProps) {
  return (
    <div className="toggle-root">
      <div className="toggle-label">선수 유형</div>
      <div className="toggle-row">
        <button
          type="button"
          className={`toggle-btn ${value === "hitter" ? "active" : ""}`}
          onClick={() => onChange("hitter")}
        >
          타자
        </button>
        <button
          type="button"
          className={`toggle-btn ${value === "pitcher" ? "active" : ""}`}
          onClick={() => onChange("pitcher")}
        >
          투수
        </button>
      </div>
    </div>
  );
}

export default PlayerTypeToggle;
