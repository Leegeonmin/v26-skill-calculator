import type { SkillGrade, SkillMeta } from "../types";

type ToneConfig = {
  accent: string;
  border: string;
  background: string;
  badge: string;
  glow: string;
};

const TONE_BY_GRADE: Record<SkillGrade, ToneConfig> = {
  amateur: {
    accent: "#475569",
    border: "rgba(100, 116, 139, 0.72)",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    badge: "#334155",
    glow: "0 10px 24px rgba(148, 163, 184, 0.18)",
  },
  rookie: {
    accent: "#15803d",
    border: "rgba(22, 163, 74, 0.7)",
    background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
    badge: "#166534",
    glow: "0 12px 28px rgba(34, 197, 94, 0.2)",
  },
  minor: {
    accent: "#2563eb",
    border: "rgba(37, 99, 235, 0.7)",
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    badge: "#1d4ed8",
    glow: "0 12px 28px rgba(59, 130, 246, 0.18)",
  },
  major: {
    accent: "#7c3aed",
    border: "rgba(124, 58, 237, 0.72)",
    background: "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)",
    badge: "#6d28d9",
    glow: "0 14px 30px rgba(124, 58, 237, 0.18)",
  },
  nationalOnly: {
    accent: "#dc2626",
    border: "rgba(220, 38, 38, 0.72)",
    background: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
    badge: "#b91c1c",
    glow: "0 14px 30px rgba(239, 68, 68, 0.18)",
  },
};

function getTone(meta?: SkillMeta, fixed = false): ToneConfig {
  if (fixed) {
    return {
      accent: "#0f766e",
      border: "rgba(13, 148, 136, 0.68)",
      background: "linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%)",
      badge: "#0f766e",
      glow: "0 12px 28px rgba(13, 148, 136, 0.18)",
    };
  }

  if (!meta) {
    return {
      accent: "#64748b",
      border: "rgba(100, 116, 139, 0.56)",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      badge: "#475569",
      glow: "0 8px 18px rgba(148, 163, 184, 0.12)",
    };
  }

  return TONE_BY_GRADE[meta.grade];
}

interface SimulatorSkillCardProps {
  slot: number;
  label: string;
  meta?: SkillMeta;
  name: string;
  scoreLabel: string;
  levelLabel?: string;
  fixed?: boolean;
  hidden?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
}

export default function SimulatorSkillCard({
  slot,
  label,
  meta,
  name,
  scoreLabel,
  levelLabel,
  fixed = false,
  hidden = false,
  compact = false,
  hideLabel = false,
}: SimulatorSkillCardProps) {
  const tone = getTone(meta, fixed);

  return (
    <div
      className={`simulator-skill-card ${hidden ? "is-hidden" : ""} ${fixed ? "is-fixed" : ""} ${
        compact ? "is-compact" : ""
      }`}
      style={{
        borderColor: tone.border,
        background: tone.background,
        boxShadow: tone.glow,
      }}
    >
      <span className="simulator-skill-slot" style={{ backgroundColor: tone.badge }}>
        {slot}
      </span>
      {!hideLabel ? <div className="simulator-skill-label">{label}</div> : null}
      <strong className="simulator-skill-name" style={{ color: tone.accent }}>
        {name}
      </strong>
      <div className="simulator-skill-score-row">
        <span className="simulator-skill-score">{scoreLabel}</span>
        {levelLabel ? <span className="simulator-skill-level">{levelLabel}</span> : null}
      </div>
    </div>
  );
}
