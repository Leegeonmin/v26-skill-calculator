import type { CalculatorMode } from "../types";

interface PlayerTypeToggleProps {
  value: CalculatorMode;
  onChange: (value: CalculatorMode) => void;
}

function PlayerTypeToggle({ value, onChange }: PlayerTypeToggleProps) {
  return (
    <div className="toggle-root">
      <div className="toggle-label">계산 대상</div>
      <div className="toggle-row toggle-row-modes">
        <button
          type="button"
          className={`toggle-btn ${value === "hitter" ? "active" : ""}`}
          onClick={() => onChange("hitter")}
        >
          타자
        </button>
        <button
          type="button"
          className={`toggle-btn ${value === "starter" ? "active" : ""}`}
          onClick={() => onChange("starter")}
        >
          선발
        </button>
        <button
          type="button"
          className={`toggle-btn ${value === "middle" ? "active" : ""}`}
          onClick={() => onChange("middle")}
        >
          중계
        </button>
        <button
          type="button"
          className={`toggle-btn ${value === "closer" ? "active" : ""}`}
          onClick={() => onChange("closer")}
        >
          마무리
        </button>
      </div>
    </div>
  );
}

export default PlayerTypeToggle;
