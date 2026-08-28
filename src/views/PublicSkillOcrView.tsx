import { useEffect, useMemo, useRef, useState } from "react";
import { KakaoAdFitMobileMidBanner } from "../components/KakaoAdFitFixedBanner";
import { getSkillOcrPlayerOdds } from "../lib/skillOcrOdds";
import { getSkillOcrSkillOptions } from "../lib/skillOcrTransform";
import { useSkillOcrPlayerOdds } from "../lib/useSkillOcrPlayerOdds";
import type { CardType, SkillLevel, StarterHand } from "../types";
import type {
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
} from "../types/ocr";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

type PublicSkillOcrViewProps = {
  authenticated: boolean;
  displayName: string | null;
  uploads: SkillOcrSavedUpload[];
  uploadsLoading: boolean;
  uploadsError: string | null;
  uploadError: string | null;
  savedUpload: SkillOcrSavedUpload | null;
  draftPlayers: SkillOcrSelectedPlayer[];
  draftTotalScore: number;
  draftAverageScore: number;
  saving: boolean;
  themeAction?: React.ReactNode;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onAddManualPlayer: (role: SkillOcrRole) => void;
  onCreateManualDeck: (role: SkillOcrRole) => void;
  onPlayerSelectedChange: (playerIndex: number, selected: boolean) => void;
  onPlayerNameChange: (playerIndex: number, playerName: string) => void;
  onPlayerCardTypeChange: (playerIndex: number, cardType: CardType) => void;
  onPlayerPositionChange: (playerIndex: number, position: string) => void;
  onPlayerStarterHandChange: (playerIndex: number, starterHand: StarterHand) => void;
  onSkillChange: (
    playerIndex: number,
    slot: number,
    skillId: string,
    skillName: string
  ) => void;
  onSkillLevelChange: (playerIndex: number, slot: number, level: SkillLevel) => void;
  onSaveDraft: () => void;
  onSelectSnapshot: (upload: SkillOcrSavedUpload) => void;
  onDeleteSnapshot: (uploadId: string) => void;
  onGoHome: () => void;
};

const CARD_TYPE_OPTIONS: Array<{ value: CardType; label: string }> = [
  { value: "impact", label: "임팩트" },
  { value: "signature", label: "시그니처" },
  { value: "goldenGlove", label: "골든글러브" },
  { value: "national", label: "국가대표" },
];

const CARD_TYPE_LABELS: Record<CardType, string> = {
  impact: "임팩트",
  signature: "시그니처",
  goldenGlove: "골글",
  national: "국대",
  allStar: "올스타",
};

const PITCHER_POSITION_OPTIONS = ["SP", "RP", "CP"];
const PITCHER_HAND_OPTIONS: Array<{ value: StarterHand; label: string }> = [
  { value: "right", label: "우투" },
  { value: "left", label: "좌투" },
];
const SKILL_LEVEL_OPTIONS: SkillLevel[] = [5, 6, 7, 8];

type SkillSearchOption = {
  skillId: string;
  skillName: string;
  grade: SkillOcrSelectedPlayer["skills"][number]["grade"];
};

function formatRole(role: SkillOcrRole): string {
  return role === "hitter" ? "타자" : "투수";
}

function formatDeckName(role: SkillOcrRole): string {
  return `${formatRole(role)} 라인업`;
}

function formatPlayerPosition(player: SkillOcrSelectedPlayer, role: SkillOcrRole): string {
  if (role === "hitter") {
    return player.position?.trim() || "타자";
  }

  const handLabel = player.starterHand === "left" ? "좌투" : "우투";
  return `${player.position ?? "SP"} / ${handLabel}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSkillToneClass(skill: SkillOcrSelectedPlayer["skills"][number]): string {
  return skill.grade ? `ocr-skill-grade-${skill.grade}` : `ocr-skill-level-${skill.level}`;
}

function normalizeSkillSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[★☆]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getDuplicateSkillFamilies(player: SkillOcrSelectedPlayer): string[] {
  const familyCounts = new Map<string, number>();

  player.skills.forEach((skill) => {
    if (!skill.skillId || !skill.skillName) {
      return;
    }

    const familyName = normalizeSkillBaseName(skill.skillName);
    familyCounts.set(familyName, (familyCounts.get(familyName) ?? 0) + 1);
  });

  return [...familyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([familyName]) => familyName);
}

function getTopPercentProgressWidth(probability: number | null | undefined): string {
  if (probability == null || !Number.isFinite(probability)) {
    return "0%";
  }

  const topPercent = Math.min(Math.max(probability * 100, 0), 100);
  return `${100 - topPercent}%`;
}

const CARD_SHARE_COLORS: Record<CardType, { accent: string; soft: string; border: string; text: string }> = {
  impact: { accent: "#0f5138", soft: "#e8f3ee", border: "#b7d4c6", text: "#0f5138" },
  signature: { accent: "#ec70a0", soft: "#fff0f6", border: "#f5bfd4", text: "#b42363" },
  goldenGlove: { accent: "#ca8a04", soft: "#fff5dc", border: "#efd28b", text: "#9a6700" },
  national: { accent: "#3872dc", soft: "#edf4ff", border: "#bdd2ff", text: "#2456b8" },
  allStar: { accent: "#7c3aed", soft: "#f3edff", border: "#d8c6ff", text: "#6d28d9" },
};

const SKILL_SHARE_COLORS: Record<string, { background: string; border: string; text: string }> = {
  amateur: { background: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
  rookie: { background: "#ecfdf3", border: "#bbf7d0", text: "#15803d" },
  minor: { background: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  major: { background: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  nationalOnly: { background: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
};

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawTextEllipsis(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let trimmed = text;
  while (trimmed.length > 0 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  context.fillText(`${trimmed}...`, x, y);
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string
) {
  drawRoundRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 1;
    context.stroke();
  }
}

async function createDeckSharePngBlob(
  upload: SkillOcrSavedUpload,
  players: SkillOcrSelectedPlayer[]
): Promise<Blob> {
  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const padding = 28;
  const headerHeight = 112;
  const gap = 12;
  const columns = 3;
  const cardWidth = 328;
  const cardHeight = 210;
  const rows = Math.max(1, Math.ceil(players.length / columns));
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = padding * 2 + headerHeight + rows * cardHeight + (rows - 1) * gap;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("카드 이미지를 만들지 못했습니다.");
  }

  context.scale(scale, scale);
  context.fillStyle = "#f8f7f3";
  context.fillRect(0, 0, width, height);
  context.textBaseline = "alphabetic";

  const roleLabel = formatDeckName(upload.role);
  context.fillStyle = "#8b928e";
  context.font = "900 11px Arial, sans-serif";
  context.fillText("LINEUP SKILL", padding, padding + 16);

  context.fillStyle = "#182331";
  context.font = "950 34px Arial, sans-serif";
  context.fillText(`${roleLabel} 상세`, padding, padding + 56);

  context.fillStyle = "#737c7b";
  context.font = "800 13px Arial, sans-serif";
  context.fillText(`${formatDate(upload.updated_at)} 수정 · ${players.length}명 표시`, padding, padding + 83);

  const statItems = [
    { label: "TOTAL", value: upload.total_score.toFixed(2) },
    { label: "AVG", value: upload.average_score.toFixed(2) },
    { label: "PLAYERS", value: `${upload.player_count}` },
  ];
  const statWidth = 112;
  statItems.forEach((item, index) => {
    const statX = width - padding - statItems.length * statWidth + index * statWidth;
    fillRoundRect(context, statX, padding + 6, statWidth - 8, 68, 12, "#fffefa", "#deddd8");
    context.fillStyle = "#8b928e";
    context.font = "900 10px Arial, sans-serif";
    context.fillText(item.label, statX + 14, padding + 29);
    context.fillStyle = index === 1 ? "#d97861" : "#182331";
    context.font = "950 22px Arial, sans-serif";
    context.fillText(item.value, statX + 14, padding + 57);
  });

  players.forEach((player, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = padding + column * (cardWidth + gap);
    const y = padding + headerHeight + row * (cardHeight + gap);
    const colors = CARD_SHARE_COLORS[player.cardType] ?? CARD_SHARE_COLORS.signature;
    const odds = getSkillOcrPlayerOdds(player);
    const progressPercent = Number.parseFloat(getTopPercentProgressWidth(odds?.scoreAtLeastProbability));

    fillRoundRect(context, x, y, cardWidth, cardHeight, 16, "#fffefa", colors.border);
    const gradient = context.createLinearGradient(x, y, x + cardWidth, y + cardHeight);
    gradient.addColorStop(0, colors.soft);
    gradient.addColorStop(0.5, "rgba(255, 254, 250, 0.94)");
    gradient.addColorStop(1, "#fffefa");
    drawRoundRect(context, x, y, cardWidth, cardHeight, 16);
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = colors.border;
    context.stroke();

    context.fillStyle = colors.accent;
    context.fillRect(x, y, 4, cardHeight);

    context.fillStyle = "#a1a6a2";
    context.font = "900 12px Arial, sans-serif";
    context.fillText(String(index + 1).padStart(2, "0"), x + 18, y + 29);

    context.fillStyle = "#182331";
    context.font = "950 21px Arial, sans-serif";
    drawTextEllipsis(context, player.playerName || "-", x + 54, y + 31, 132);

    const cardLabel = CARD_TYPE_LABELS[player.cardType] ?? player.cardType;
    context.font = "900 11px Arial, sans-serif";
    const cardLabelWidth = Math.min(context.measureText(cardLabel).width + 18, 72);
    fillRoundRect(context, x + 192, y + 13, cardLabelWidth, 23, 999, colors.soft, colors.border);
    context.fillStyle = colors.text;
    drawTextEllipsis(context, cardLabel, x + 201, y + 29, cardLabelWidth - 18);

    if (odds) {
      context.font = "950 13px Arial, sans-serif";
      const tierWidth = Math.max(38, context.measureText(odds.grade).width + 18);
      fillRoundRect(context, x + cardWidth - tierWidth - 18, y + 12, tierWidth, 27, 8, colors.soft, colors.border);
      context.fillStyle = odds.gradeColor;
      context.fillText(odds.grade, x + cardWidth - tierWidth - 9, y + 30);
    }

    context.fillStyle = "#182331";
    context.font = "950 36px Arial, sans-serif";
    context.fillText(player.totalScore.toFixed(2), x + 18, y + 92);

    if (odds) {
      context.fillStyle = colors.text;
      context.font = "900 12px Arial, sans-serif";
      context.fillText(odds.topPercentLabel, x + 18, y + 113);
    }

    fillRoundRect(context, x + 145, y + 87, 160, 6, 999, "#e7e8e4");
    fillRoundRect(context, x + 145, y + 87, 160 * Math.max(0, Math.min(progressPercent, 100)) / 100, 6, 999, colors.accent);

    let chipX = x + 18;
    let chipY = y + 150;
    player.skills.forEach((skill) => {
      const skillText = `${skill.skillName ?? "스킬 미선택"} Lv.${skill.level}`;
      const skillColors = skill.grade ? SKILL_SHARE_COLORS[skill.grade] : null;
      context.font = "800 12px Arial, sans-serif";
      const chipWidth = Math.min(context.measureText(skillText).width + 18, cardWidth - 36);
      if (chipX + chipWidth > x + cardWidth - 18) {
        chipX = x + 18;
        chipY += 33;
      }
      fillRoundRect(
        context,
        chipX,
        chipY,
        chipWidth,
        27,
        7,
        skillColors?.background ?? "#f0f1ed",
        skillColors?.border ?? "#d7ddd8"
      );
      context.fillStyle = skillColors?.text ?? "#65706b";
      drawTextEllipsis(context, skillText, chipX + 9, chipY + 18, chipWidth - 18);
      chipX += chipWidth + 7;
    });
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("카드 이미지를 만들지 못했습니다."));
    }, "image/png");
  });
}

async function copyDeckShareImageToClipboard(
  upload: SkillOcrSavedUpload,
  players: SkillOcrSelectedPlayer[]
): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("이 브라우저에서는 이미지 클립보드 복사를 지원하지 않습니다.");
  }

  const pngBlobPromise = createDeckSharePngBlob(upload, players);

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": pngBlobPromise,
    }),
  ]);
}

function getSkillOptionsForSlot(
  player: SkillOcrSelectedPlayer,
  slot: number,
  options: SkillSearchOption[]
): SkillSearchOption[] {
  const currentSkillId = player.skills.find((skill) => skill.slot === slot)?.skillId ?? null;
  const selectedFamilies = new Set(
    player.skills
      .filter((skill) => skill.slot !== slot && skill.skillId && skill.skillName)
      .map((skill) => normalizeSkillBaseName(skill.skillName ?? ""))
  );

  return options.filter((option) => {
    if (option.skillId === currentSkillId) {
      return true;
    }

    return !selectedFamilies.has(normalizeSkillBaseName(option.skillName));
  });
}

function getPitcherScoreItems(player: SkillOcrSelectedPlayer): Array<{
  key: string;
  label: string;
  value: number;
  active: boolean;
}> {
  const scores = player.pitcherScores;
  if (!scores) {
    return [];
  }

  const position = player.position ?? "SP";
  const hand = player.starterHand ?? "right";

  return [
    {
      key: "starterRight",
      label: "선발 우투",
      value: scores.starterRight,
      active: position === "SP" && hand === "right",
    },
    {
      key: "starterLeft",
      label: "선발 좌투",
      value: scores.starterLeft,
      active: position === "SP" && hand === "left",
    },
    {
      key: "middle",
      label: "중계",
      value: scores.middle,
      active: position === "RP",
    },
    {
      key: "closer",
      label: "마무리",
      value: scores.closer,
      active: position === "CP",
    },
  ];
}

function PublicSkillOcrOddsBadge({ player }: { player: SkillOcrSelectedPlayer }) {
  const { odds, loading } = useSkillOcrPlayerOdds(player);

  if (loading) {
    return (
      <div
        className="ocr-player-odds-badge public-ocr-player-odds-badge ocr-player-odds-badge-loading"
        aria-label="확률 계산 중"
      >
        <span />
        <span />
      </div>
    );
  }

  if (!odds) {
    return null;
  }

  return (
    <div className="ocr-player-odds-badge public-ocr-player-odds-badge">
      <span>
        등급 <strong style={{ color: odds.gradeColor }}>{odds.grade}</strong>
      </span>
      <span>
        {odds.basisLabel} <strong>{odds.topPercentLabel}</strong>
      </span>
    </div>
  );
}

function buildCopyText(params: {
  username: string;
  role: SkillOcrRole | null;
  averageScore: number;
  players: SkillOcrSelectedPlayer[];
}) {
  const roleLabel = params.role ? formatDeckName(params.role) : "라인업";
  const includePosition = params.role === "pitcher";
  const lines = params.players.map((player) => {
    const odds = getSkillOcrPlayerOdds(player);
    const position = player.position?.trim();
    const handLabel = player.starterHand === "left" ? "좌투" : "우투";
    const name =
      includePosition && position
        ? `${player.playerName}(${position}/${handLabel})`
        : player.playerName;
    const resultLabel = odds ? ` / 등급 ${odds.grade} / ${odds.basisLabel} ${odds.topPercentLabel}` : "";
    return `${name} : ${player.totalScore.toFixed(2)}점${resultLabel}`;
  });

  return [
    `[${params.username}]님의 ${roleLabel} 스킬 기록`,
    `평균 : ${params.averageScore.toFixed(2)} 점`,
    "-----------",
    ...lines,
  ].join("\n");
}

function PublicOcrIcon({ name }: { name: "add" | "upload" | "check" | "clipboard" | "close" | "login" }) {
  const paths = {
    add: "M12 5v14M5 12h14",
    upload: "M12 16V4m0 0 5 5m-5-5-5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
    check: "m5 12 4 4L19 6",
    clipboard: "M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5a2.5 2.5 0 0 0-5 0H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z",
    close: "M6 6l12 12M18 6 6 18",
    login: "M10 17l5-5-5-5m5 5H3m13-8h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3",
  };

  return (
    <svg className="ocr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function PublicOcrRosterCard({
  player,
  index,
}: {
  player: SkillOcrSelectedPlayer;
  index: number;
}) {
  const odds = getSkillOcrPlayerOdds(player);
  const progressWidth = getTopPercentProgressWidth(odds?.scoreAtLeastProbability);

  return (
    <article className={`public-ocr-roster-card public-ocr-card-row-${player.cardType}`}>
      <div className="public-ocr-roster-card-top">
        <span className="public-ocr-roster-number">{String(index + 1).padStart(2, "0")}</span>
        <div className="public-ocr-roster-identity">
          <div>
            <strong>{player.playerName}</strong>
            <span>{CARD_TYPE_LABELS[player.cardType] ?? player.cardType}</span>
          </div>
        </div>
        {odds && (
          <span className="public-ocr-roster-tier" style={{ color: odds.gradeColor }}>
            {odds.grade}
          </span>
        )}
      </div>

      <div className="public-ocr-roster-score">
        <div>
          <strong>{player.totalScore.toFixed(2)}</strong>
          {odds && <small>{odds.topPercentLabel}</small>}
        </div>
        <div className="public-ocr-roster-score-bar">
          <i style={{ width: progressWidth }} />
        </div>
      </div>

      <div className="public-ocr-roster-skills">
        {player.skills.map((skill) => (
          <span key={`${player.sourceRow}-${skill.slot}`} className={getSkillToneClass(skill)}>
            {skill.skillName ?? "스킬 미선택"} Lv.{skill.level}
          </span>
        ))}
      </div>
    </article>
  );
}

function PublicOcrSkillSearchSelect({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: SkillSearchOption[];
  value: string;
  onChange: (skillId: string, skillName: string) => void;
}) {
  const selectedOption = options.find((option) => option.skillId === value) ?? null;
  const [query, setQuery] = useState(selectedOption?.skillName ?? "");
  const [open, setOpen] = useState(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (open || lastValueRef.current === value) {
      return;
    }

    lastValueRef.current = value;
    setQuery(selectedOption?.skillName ?? "");
  }, [open, selectedOption?.skillName, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSkillSearchText(query);
    if (!normalizedQuery) {
      return options.slice(0, 24);
    }

    return options
      .filter((option) => normalizeSkillSearchText(option.skillName).includes(normalizedQuery))
      .slice(0, 24);
  }, [options, query]);

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setOpen(true);

    const exactOption = options.find(
      (option) => normalizeSkillSearchText(option.skillName) === normalizeSkillSearchText(nextQuery)
    );
    onChange(exactOption?.skillId ?? "", exactOption?.skillName ?? "");
  };

  const selectOption = (option: SkillSearchOption) => {
    setQuery(option.skillName);
    setOpen(false);
    lastValueRef.current = option.skillId;
    onChange(option.skillId, option.skillName);
  };

  return (
    <div className="public-ocr-skill-search-select">
      <input
        type="text"
        className={selectedOption?.grade ? `ocr-skill-grade-${selectedOption.grade}` : undefined}
        aria-label={ariaLabel}
        value={query}
        placeholder="스킬 검색"
        autoComplete="off"
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredOptions[0]) {
            event.preventDefault();
            selectOption(filteredOptions[0]);
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="public-ocr-skill-search-list" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.skillId}
                type="button"
                role="option"
                aria-selected={option.skillId === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {option.skillName}
              </button>
            ))
          ) : (
            <span>검색 결과 없음</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function PublicSkillOcrView({
  authenticated,
  displayName,
  uploads,
  uploadsLoading,
  uploadsError,
  uploadError,
  savedUpload,
  draftPlayers,
  draftTotalScore,
  draftAverageScore,
  saving,
  themeAction,
  onGoogleLogin,
  onGoogleLogout,
  onAddManualPlayer,
  onCreateManualDeck,
  onPlayerSelectedChange,
  onPlayerNameChange,
  onPlayerCardTypeChange,
  onPlayerPositionChange,
  onPlayerStarterHandChange,
  onSkillChange,
  onSkillLevelChange,
  onSaveDraft,
  onSelectSnapshot,
  onDeleteSnapshot,
  onGoHome,
}: PublicSkillOcrViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "manual">("summary");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deckFilter, setDeckFilter] = useState<SkillOcrRole>("pitcher");
  const [deckQuery, setDeckQuery] = useState("");

  useEffect(() => {
    if (!savedUpload) {
      return;
    }

    setSaveMessage(`${formatDeckName(savedUpload.role)} 기록이 저장되었습니다.`);
    const timerId = window.setTimeout(() => setSaveMessage(null), 2200);

    return () => window.clearTimeout(timerId);
  }, [savedUpload]);

  const savedUploads = uploads.filter((upload) => upload.is_saved);
  const pendingUploads = uploads.filter((upload) => !upload.is_saved);
  const hitterUploads = savedUploads.filter((upload) => upload.role === "hitter");
  const pitcherUploads = savedUploads.filter((upload) => upload.role === "pitcher");
  const latestHitterUpload = hitterUploads[0] ?? null;
  const latestPitcherUpload = pitcherUploads[0] ?? null;
  const latestDecks = [
    { role: "pitcher" as const, upload: latestPitcherUpload },
    { role: "hitter" as const, upload: latestHitterUpload },
  ];
  const activeDeckUpload = deckFilter === "pitcher" ? latestPitcherUpload : latestHitterUpload;
  const activeDeckLabel = formatDeckName(deckFilter);
  const normalizedDeckQuery = normalizeSkillSearchText(deckQuery);
  const visibleDecks = latestDecks
    .filter(({ role, upload }) => upload && deckFilter === role)
    .map(({ role, upload }) => ({
      role,
      upload: upload as SkillOcrSavedUpload,
      players: (upload as SkillOcrSavedUpload).selected_players.filter((player) => {
        if (!normalizedDeckQuery) {
          return true;
        }

        return (
          normalizeSkillSearchText(player.playerName).includes(normalizedDeckQuery) ||
          normalizeSkillSearchText(formatPlayerPosition(player, role)).includes(normalizedDeckQuery) ||
          player.skills.some((skill) =>
            normalizeSkillSearchText(skill.skillName).includes(normalizedDeckQuery)
          )
        );
      }),
    }));
  const selectedPlayers = draftPlayers.filter((player) => player.selected);
  const draftRole = selectedPlayers.some((player) => player.calculatorMode === "hitter")
    ? "hitter"
    : selectedPlayers.length > 0
      ? "pitcher"
      : null;

  const validateDraft = () => {
    if (selectedPlayers.length !== 9) {
      setValidationMessage("라인업은 무조건 9명을 모두 선택해야 저장할 수 있습니다.");
      return false;
    }

    if (selectedPlayers.some((player) => !player.playerName.trim())) {
      setValidationMessage("선수 이름을 입력해주세요.");
      return false;
    }

    if (selectedPlayers.some((player) => player.skills.some((skill) => !skill.skillId))) {
      setValidationMessage("비어 있는 스킬을 먼저 선택해주세요.");
      return false;
    }

    const duplicatedPlayer = selectedPlayers.find((player) => getDuplicateSkillFamilies(player).length > 0);
    if (duplicatedPlayer) {
      setValidationMessage(
        `${duplicatedPlayer.playerName}의 ${getDuplicateSkillFamilies(duplicatedPlayer).join(", ")} 계열 스킬은 중복 등록할 수 없습니다.`
      );
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const copyDraft = async () => {
    if (!validateDraft()) return;

    await navigator.clipboard.writeText(
      buildCopyText({
        username: displayName ?? "Google 사용자",
        role: draftRole,
        averageScore: draftAverageScore,
        players: selectedPlayers,
      })
    );
    setCopiedId("draft");
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const copyVisibleDeck = async (
    upload: SkillOcrSavedUpload,
    players: SkillOcrSelectedPlayer[]
  ) => {
    const averageScore =
      players.length > 0
        ? players.reduce((sum, player) => sum + player.totalScore, 0) / players.length
        : upload.average_score;

    await navigator.clipboard.writeText(
      buildCopyText({
        username: displayName ?? "Google 사용자",
        role: upload.role,
        averageScore,
        players,
      })
    );
    setCopiedId(`detail-${upload.id}`);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const copyVisibleDeckImage = async (
    upload: SkillOcrSavedUpload,
    players: SkillOcrSelectedPlayer[]
  ) => {
    try {
      await copyDeckShareImageToClipboard(upload, players);
      setValidationMessage(null);
      setCopiedId(`image-${upload.id}`);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : "카드 이미지를 클립보드에 복사하지 못했습니다."
      );
    }
  };

  const editUpload = (upload: SkillOcrSavedUpload) => {
    onSelectSnapshot(upload);
    setActiveTab("manual");
  };

  return (
    <main className="public-ocr-view">
      <header className="public-ocr-header">
        <div>
          <p className="ocr-eyebrow">Lineup Skill</p>
          <h1>라인업 스킬</h1>
        </div>
        <div className="public-ocr-top-actions">
          {themeAction}
          <button type="button" className="ghost-btn" onClick={onGoHome}>
            <span>홈으로</span>
          </button>
          <div className="home-auth-card">
            <span>{authenticated ? displayName ?? "Google 사용자" : "브라우저 저장 중"}</span>
            {authenticated ? (
              <button type="button" className="ghost-btn" onClick={onGoogleLogout}>
                로그아웃
              </button>
            ) : (
              <button type="button" className="ghost-btn" onClick={onGoogleLogin}>
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="ocr-tabs public-ocr-tabs" aria-label="라인업 스킬 화면">
        <button
          type="button"
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => setActiveTab("summary")}
        >
          <PublicOcrIcon name="clipboard" />
          라인업
        </button>
        <button
          type="button"
          className={activeTab === "manual" ? "active" : ""}
          onClick={() => setActiveTab("manual")}
        >
          <PublicOcrIcon name="upload" />
          라인업 새로 추가
        </button>
      </nav>

      <KakaoAdFitMobileMidBanner enabled />

      <p className="public-ocr-storage-note">
        {authenticated
          ? "Google 계정에 투수/타자 최신 라인업 1개씩 저장됩니다."
          : "로그인하지 않으면 이 브라우저에만 투수/타자 최신 라인업 1개씩 저장됩니다."}
      </p>

      {uploadsLoading && <p className="skill-compare-status">라인업 기록을 불러오는 중입니다.</p>}
      {uploadsError && <p className="modal-error">{uploadsError}</p>}
      {uploadError && <p className="modal-error">{uploadError}</p>}
      {validationMessage && activeTab === "summary" && <p className="modal-error">{validationMessage}</p>}
      {saveMessage && (
        <p className="public-ocr-save-success" role="status">
          <PublicOcrIcon name="check" />
          {saveMessage}
        </p>
      )}

      {activeTab === "summary" ? (
        <>
          <section className="public-ocr-roster-hero">
            <div>
              <p className="ocr-eyebrow">DECK SKILL RECORD</p>
              <h2>
                {activeDeckLabel}
              </h2>
            </div>
            <div className="public-ocr-roster-hero-score">
              <span>DECK SCORE</span>
              <strong>{activeDeckUpload ? activeDeckUpload.total_score.toFixed(2) : "-"}</strong>
              <small>
                평균 <b>{activeDeckUpload ? activeDeckUpload.average_score.toFixed(2) : "-"}</b>
              </small>
            </div>
          </section>

          <section className="public-ocr-summary-grid">
            {[
              { role: "pitcher" as const, upload: latestPitcherUpload },
              { role: "hitter" as const, upload: latestHitterUpload },
            ].map(({ role, upload }) => (
              <article key={role} className={`public-ocr-latest-card ${role}`}>
                <div className="public-ocr-latest-head">
                  <div>
                    <strong>{formatDeckName(role)} 기록</strong>
                    {upload ? <span>{formatDate(upload.updated_at)} 수정</span> : <span>처음 등록이 필요합니다</span>}
                  </div>
                </div>
                {upload ? (
                  <>
                    <div className="public-ocr-latest-stats">
                      <span>
                        전체점수 <strong>{upload.total_score.toFixed(2)}</strong>
                      </span>
                      <span>
                        평균점수 <strong>{upload.average_score.toFixed(2)}</strong>
                      </span>
                      <span>
                        등록 인원 <strong>{upload.player_count}명</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{formatDeckName(role)} 9명을 먼저 등록한 뒤, 이후 필요한 선수만 수정해서 관리하세요.</p>
                    <button
                      type="button"
                      className="primary-btn public-ocr-deck-edit-btn"
                      onClick={() => {
                        onCreateManualDeck(role);
                        setActiveTab("manual");
                      }}
                    >
                      9명 등록 시작
                    </button>
                  </>
                )}
              </article>
            ))}
          </section>
          {savedUploads.length > 0 && (
            <nav className="public-ocr-roster-nav" aria-label="덱 상세 필터">
              <div className="public-ocr-roster-filters">
                {[
                  { value: "pitcher" as const, label: "투수", count: latestPitcherUpload?.player_count ?? 0 },
                  { value: "hitter" as const, label: "타자", count: latestHitterUpload?.player_count ?? 0 },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={deckFilter === item.value ? "selected" : ""}
                    onClick={() => setDeckFilter(item.value)}
                  >
                    {item.label}
                    <small>{item.count}</small>
                  </button>
                ))}
              </div>
              <label className="public-ocr-roster-search">
                <span>⌕</span>
                <input
                  type="search"
                  value={deckQuery}
                  onChange={(event) => setDeckQuery(event.target.value)}
                  placeholder="선수/스킬 검색"
                />
              </label>
            </nav>
          )}
          <div className="public-ocr-summary-results">
            {visibleDecks.map(({ role, upload, players }) => (
              <section key={upload.id} className="public-ocr-panel">
                <div className="ocr-section-head">
                  <div>
                    <h2>{formatDeckName(role)} 상세</h2>
                    <span>{formatDate(upload.updated_at)} 수정</span>
                  </div>
                  <div className="public-ocr-detail-head-actions">
                    <div className="ocr-review-totals">
                      <strong>{upload.total_score.toFixed(2)}</strong>
                      <span>평균 {upload.average_score.toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn public-ocr-detail-action-btn"
                      onClick={() => editUpload(upload)}
                    >
                      기록 수정
                    </button>
                    <div className="public-ocr-detail-share">
                      <button
                        type="button"
                        className="ghost-btn public-ocr-detail-action-btn"
                        disabled={players.length === 0}
                        onClick={() => void copyVisibleDeck(upload, players)}
                      >
                        <PublicOcrIcon name={copiedId === `detail-${upload.id}` ? "check" : "clipboard"} />
                        점수 복사
                      </button>
                      {copiedId === `detail-${upload.id}` && (
                        <span className="public-ocr-copy-toast" role="status">
                          복사되었습니다
                        </span>
                      )}
                    </div>
                    <div className="public-ocr-detail-share">
                      <button
                        type="button"
                        className="primary-btn public-ocr-detail-action-btn"
                        disabled={players.length === 0}
                        onClick={() => void copyVisibleDeckImage(upload, players)}
                      >
                        <PublicOcrIcon name={copiedId === `image-${upload.id}` ? "check" : "clipboard"} />
                        공유
                      </button>
                      {copiedId === `image-${upload.id}` && (
                        <span className="public-ocr-copy-toast" role="status">
                          복사되었습니다
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {players.length > 0 ? (
                  <div className="public-ocr-roster-grid">
                    {players.map((player, index) => (
                      <PublicOcrRosterCard
                        key={`${upload.id}-${player.sourceRow}`}
                        player={player}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="public-ocr-roster-empty">검색 결과가 없습니다.</p>
                )}
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="public-ocr-guide-card public-ocr-manual-notice">
            <PublicOcrIcon name="clipboard" />
            <div>
              <strong>업로드 없이 직접 입력합니다.</strong>
              <span>처음에는 9명 라인업을 만들고, 이후에는 저장된 라인업을 열어 이름, 보직, 스킬, 레벨만 수정하세요.</span>
            </div>
          </section>

          <section className="public-ocr-upload-panel public-ocr-manual-actions">
            <button
              type="button"
              className="public-ocr-upload-btn"
              onClick={() => onCreateManualDeck("pitcher")}
            >
              <PublicOcrIcon name="add" />
              <strong>투수 라인업 9명 만들기</strong>
              <small>SP 5명, RP 3명, CP 1명 순서로 생성됩니다</small>
            </button>
            <button
              type="button"
              className="public-ocr-upload-btn"
              onClick={() => onCreateManualDeck("hitter")}
            >
              <PublicOcrIcon name="add" />
              <strong>타자 라인업 9명 만들기</strong>
              <small>1번부터 9번까지 순서대로 생성됩니다</small>
            </button>
          </section>

          {pendingUploads.length > 0 && (
            <section className="public-ocr-panel">
              <div className="ocr-section-head">
                <div>
                  <h2>저장되지 않은 라인업 기록</h2>
                  <span>기존 OCR에서 넘어온 임시 기록입니다. 열어서 라인업 기록으로 저장하세요.</span>
                </div>
              </div>
              <div className="public-ocr-saved-list">
                {pendingUploads.map((upload) => (
                  <div key={upload.id} className="public-ocr-snapshot-row">
                    <button
                      type="button"
                      className="public-ocr-saved-row public-ocr-review-row"
                      onClick={() => {
                        onSelectSnapshot(upload);
                        setActiveTab("manual");
                      }}
                    >
                      <strong>{formatDeckName(upload.role)} 임시 기록</strong>
                      <span>{formatDate(upload.created_at)}</span>
                      <em>편집하기</em>
                    </button>
                    <button
                      type="button"
                      className="public-ocr-snapshot-delete"
                      aria-label={`${formatRole(upload.role)} 스냅샷 삭제`}
                      onClick={() => {
                        if (window.confirm("이 임시 기록을 삭제할까요?")) {
                          onDeleteSnapshot(upload.id);
                        }
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {draftPlayers.length > 0 && (
            <section className="public-ocr-panel">
              <div className="ocr-section-head">
                <div>
                  <h2>{draftRole ? `${formatDeckName(draftRole)} 편집` : "라인업 편집"}</h2>
                  <span>선수 이름, 카드 타입, 보직, 스킬, 레벨을 수정하세요.</span>
                </div>
                <div className="ocr-review-head-actions">
                  {draftRole && draftPlayers.length < 9 && (
                    <button type="button" className="ghost-btn" onClick={() => onAddManualPlayer(draftRole)}>
                      <PublicOcrIcon name="add" />
                      1명 추가
                    </button>
                  )}
                  <button type="button" className="ghost-btn" onClick={() => void copyDraft()}>
                    <PublicOcrIcon name={copiedId === "draft" ? "check" : "clipboard"} />
                    {copiedId === "draft" ? "복사됨" : "복사"}
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={saving}
                    onClick={() => {
                      if (validateDraft()) onSaveDraft();
                    }}
                  >
                    {saving ? "저장 중" : "저장"}
                  </button>
                </div>
                <div className="ocr-review-totals">
                  <strong>{draftTotalScore.toFixed(2)}</strong>
                  <span>평균 {draftAverageScore.toFixed(2)}</span>
                </div>
              </div>

              <div className="public-ocr-player-list">
                {draftPlayers.map((player, playerIndex) => {
                  const skillOptions = getSkillOcrSkillOptions(player);
                  const duplicateFamilies = getDuplicateSkillFamilies(player);

                  return (
                    <article
                      key={`${player.sourceRow}-${player.playerName}`}
                      className={`public-ocr-player-row public-ocr-card-row-${player.cardType}${
                        player.selected ? "" : " muted"
                      }`}
                    >
                      <div className="public-ocr-player-main">
                        <label className="public-ocr-player-check">
                          <input
                            type="checkbox"
                            checked={player.selected}
                            onChange={(event) => onPlayerSelectedChange(playerIndex, event.target.checked)}
                          />
                          <input
                            className="public-ocr-player-name-input"
                            type="text"
                            value={player.playerName}
                            onChange={(event) => onPlayerNameChange(playerIndex, event.target.value)}
                            aria-label="선수 이름"
                          />
                        </label>
                        <div
                          className={`public-ocr-player-controls public-ocr-player-controls-${
                            player.calculatorMode === "hitter" ? "hitter" : "pitcher"
                          }`}
                        >
                        <label className={`public-ocr-card-control public-ocr-card-control-${player.cardType}`}>
                          <span>카드</span>
                          <select
                            value={player.cardType}
                            onChange={(event) =>
                              onPlayerCardTypeChange(playerIndex, event.target.value as CardType)
                            }
                          >
                            {CARD_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {player.calculatorMode !== "hitter" && (
                          <>
                            <label>
                              <span>포지션</span>
                              <select
                                value={player.position ?? "SP"}
                                onChange={(event) => onPlayerPositionChange(playerIndex, event.target.value)}
                              >
                                {PITCHER_POSITION_OPTIONS.map((position) => (
                                  <option key={position} value={position}>
                                    {position}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>투구</span>
                              <select
                                value={player.starterHand ?? "right"}
                                onChange={(event) =>
                                  onPlayerStarterHandChange(playerIndex, event.target.value as StarterHand)
                                }
                              >
                                {PITCHER_HAND_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </>
                        )}
                        </div>
                        <strong className="public-ocr-player-score">{player.totalScore.toFixed(2)}</strong>
                        <PublicSkillOcrOddsBadge player={player} />
                      </div>

                      {player.calculatorMode !== "hitter" && (
                        <div className="public-ocr-pitcher-score-grid">
                          {getPitcherScoreItems(player).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              className={`public-ocr-pitcher-score-chip${item.active ? " active" : ""}`}
                              onClick={() => {
                                if (item.key === "starterRight" || item.key === "starterLeft") {
                                  onPlayerPositionChange(playerIndex, "SP");
                                  onPlayerStarterHandChange(
                                    playerIndex,
                                    item.key === "starterLeft" ? "left" : "right"
                                  );
                                  return;
                                }

                                onPlayerPositionChange(playerIndex, item.key === "middle" ? "RP" : "CP");
                              }}
                            >
                              <span>{item.label}</span>
                              <strong>{item.value.toFixed(2)}</strong>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="public-ocr-player-skills">
                        {player.skills.map((skill) => (
                          <div
                            key={`${player.sourceRow}-${skill.slot}`}
                            className={`public-ocr-skill-edit-row ${getSkillToneClass(skill)} ${
                              skill.skillId ? "" : "public-ocr-skill-edit-row-unmatched"
                            }`}
                          >
                            {!skill.skillId && <span className="public-ocr-match-fail-badge">스킬 선택</span>}
                            <PublicOcrSkillSearchSelect
                              ariaLabel={`${player.playerName} ${skill.slot}번 스킬 선택`}
                              options={getSkillOptionsForSlot(player, skill.slot, skillOptions)}
                              value={skill.skillId ?? ""}
                              onChange={(skillId, skillName) => {
                                onSkillChange(
                                  playerIndex,
                                  skill.slot,
                                  skillId,
                                  skillName
                                );
                              }}
                            />
                            <select
                              className={`public-ocr-skill-level-select ${getSkillToneClass(skill)}`}
                              value={skill.level}
                              onChange={(event) =>
                                onSkillLevelChange(
                                  playerIndex,
                                  skill.slot,
                                  Number(event.target.value) as SkillLevel
                                )
                              }
                            >
                              {SKILL_LEVEL_OPTIONS.map((level) => (
                                <option key={level} value={level}>
                                  Lv.{level}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      {duplicateFamilies.length > 0 && (
                        <p className="public-ocr-skill-family-warning">
                          {duplicateFamilies.join(", ")} 계열 스킬은 한 선수에게 같이 등록할 수 없습니다.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>

              {validationMessage && <p className="modal-error">{validationMessage}</p>}
            </section>
          )}

        </>
      )}
    </main>
  );
}
