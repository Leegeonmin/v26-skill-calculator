import type { PlayerType } from "../types";

interface PlayerTypeToggleProps {
  value: PlayerType;
  onChange: (value: PlayerType) => void;
  pitcherEnabled?: boolean;
}

function PlayerTypeToggle({
  value,
  onChange,
  pitcherEnabled = false,
}: PlayerTypeToggleProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>선수 유형</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange("hitter")}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: value === "hitter" ? "2px solid #111827" : "1px solid #d1d5db",
            background: value === "hitter" ? "#111827" : "white",
            color: value === "hitter" ? "white" : "#111827",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          타자
        </button>

        <button
          type="button"
          onClick={() => {
            if (pitcherEnabled) onChange("pitcher");
          }}
          disabled={!pitcherEnabled}
          title={!pitcherEnabled ? "투수는 아직 준비 중입니다." : undefined}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: value === "pitcher" ? "2px solid #111827" : "1px solid #d1d5db",
            background: value === "pitcher" ? "#111827" : "#f3f4f6",
            color: value === "pitcher" ? "white" : "#6b7280",
            cursor: pitcherEnabled ? "pointer" : "not-allowed",
            fontWeight: 700,
            opacity: pitcherEnabled ? 1 : 0.7,
          }}
        >
          투수 (준비중)
        </button>
      </div>
    </div>
  );
}

export default PlayerTypeToggle;