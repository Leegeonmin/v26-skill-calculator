import { useMemo, useRef, useState } from "react";
import { getGameDataSet, type GameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import { recognizeSkillChangeImage } from "../lib/skillOcr";
import { logToolUsageEvent } from "../lib/toolUsage";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  SkillLevel,
  SkillMeta,
  StarterHand,
} from "../types";
import type { SkillChangeResponse, SkillChangeSkill } from "../types/ocr";
import { calculateAdvancedSkillOdds, type SkillOddsResult } from "../utils/advancedSkillOdds";
import { calculateSkillTotal } from "../utils/calculate";
import { formatTopPercent } from "../utils/formatOdds";
import { judgeSkillResultByProbability, type JudgeResult } from "../utils/judge";

type SkillCompareBetaViewProps = {
  onGoHome: () => void;
  themeAction?: React.ReactNode;
  toolUsageSessionId: string | null;
};

type ComparedSkill = SkillChangeSkill & {
  skillId: string;
  displayName: string;
  score: number;
  matched: boolean;
  candidateSkillIds: string[];
  needsSelection: boolean;
};

const MODE_OPTIONS: Array<{ value: CalculatorMode; label: string }> = [
  { value: "hitter", label: "타자" },
  { value: "starter", label: "선발" },
  { value: "middle", label: "중계" },
  { value: "closer", label: "마무리" },
];

const CARD_TYPE_OPTIONS: Array<{ value: CardType; label: string }> = [
  { value: "impact", label: "임팩트" },
  { value: "signature", label: "시그니처" },
  { value: "goldenGlove", label: "골든글러브" },
  { value: "national", label: "국가대표" },
];

const STARTER_HAND_OPTIONS: Array<{ value: StarterHand; label: string }> = [
  { value: "right", label: "우투" },
  { value: "left", label: "좌투" },
];
const HITTER_POSITION_GROUP_OPTIONS: Array<{ value: HitterPositionGroup; label: string }> = [
  { value: "fielder", label: "야수" },
  { value: "catcher", label: "포수" },
];
const SKILL_LEVEL_OPTIONS: SkillLevel[] = [5, 6, 7, 8];

function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[★☆]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getDataSet(mode: CalculatorMode, starterHand: StarterHand): GameDataSet | null {
  if (mode === "hitter") {
    return getGameDataSet({ playerType: "hitter" });
  }

  if (mode === "starter") {
    return getGameDataSet({ playerType: "pitcher", pitcherRole: "starter", starterHand });
  }

  return getGameDataSet({ playerType: "pitcher", pitcherRole: mode });
}

type SkillMetaMatch = {
  meta: SkillMeta | null;
  candidates: SkillMeta[];
  needsSelection: boolean;
};

function findSkillMeta(
  skill: SkillChangeSkill,
  dataSet: GameDataSet,
  cardType: CardType,
  selectedSkillId: string | null
): SkillMetaMatch {
  const requested = normalizeName(skill.name);
  if (!requested) {
    return { meta: null, candidates: [], needsSelection: false };
  }

  const candidates = dataSet.skills.filter((meta) => meta.availableCardTypes.includes(cardType));
  const selected = selectedSkillId
    ? candidates.find((meta) => meta.id === selectedSkillId) ?? null
    : null;

  const exact = candidates.find((meta) => normalizeName(meta.name) === requested);
  if (exact) {
    return { meta: exact, candidates: [exact], needsSelection: false };
  }

  const familyMatches = candidates.filter((meta) => {
    const metaName = normalizeName(meta.name);
    return metaName === requested || metaName.startsWith(`${requested}(`);
  });

  if (familyMatches.length === 0) {
    return { meta: null, candidates: [], needsSelection: false };
  }

  if (familyMatches.length === 1) {
    return { meta: familyMatches[0], candidates: familyMatches, needsSelection: false };
  }

  if (selected && familyMatches.some((meta) => meta.id === selected.id)) {
    return { meta: selected, candidates: familyMatches, needsSelection: false };
  }

  const level = normalizeLevel(skill.level);
  const defaultMeta = [...familyMatches].sort((first, second) => {
    const firstScore = dataSet.scoreTable[first.id]?.[level] ?? 0;
    const secondScore = dataSet.scoreTable[second.id]?.[level] ?? 0;
    return secondScore - firstScore;
  })[0];

  return { meta: defaultMeta, candidates: familyMatches, needsSelection: true };
}

function normalizeLevel(level: number | null): SkillLevel {
  return level === 5 || level === 6 || level === 7 || level === 8 ? level : 5;
}

function compareSkills(
  skills: SkillChangeSkill[],
  dataSet: GameDataSet | null,
  cardType: CardType,
  selectedSkillIds: Record<string, string>,
  side: "left" | "right"
): { skills: ComparedSkill[]; total: number } {
  if (!dataSet) {
    return {
      skills: skills.map((skill) => ({
        ...skill,
        skillId: "",
        displayName: skill.name ?? "인식 실패",
        score: 0,
        matched: false,
        candidateSkillIds: [],
        needsSelection: false,
      })),
      total: 0,
    };
  }

  const comparedSkills = skills.slice(0, 3).map<ComparedSkill>((skill) => {
    const level = normalizeLevel(skill.level);
    const match = findSkillMeta(skill, dataSet, cardType, selectedSkillIds[`${side}-${skill.slot}`] ?? null);
    const meta = match.meta;

    return {
      ...skill,
      level,
      skillId: meta?.id ?? "",
      displayName: meta?.name ?? skill.name ?? "인식 실패",
      score: meta ? dataSet.scoreTable[meta.id]?.[level] ?? 0 : 0,
      matched: Boolean(meta),
      candidateSkillIds: match.candidates.map((candidate) => candidate.id),
      needsSelection: match.needsSelection,
    };
  });

  const total = calculateSkillTotal({
    cardType,
    skillIds: comparedSkills.map((skill) => skill.skillId),
    skillLevels: comparedSkills.map((skill) => normalizeLevel(skill.level)),
    scoreTable: dataSet.scoreTable,
  });

  return { skills: comparedSkills, total };
}

function calculateCompareOdds(
  compared: { skills: ComparedSkill[]; total: number },
  dataSet: GameDataSet | null,
  mode: CalculatorMode,
  cardType: CardType,
  hitterPositionGroup: HitterPositionGroup
): SkillOddsResult | null {
  if (!dataSet || compared.skills.length < 3 || compared.skills.some((skill) => !skill.skillId)) {
    return null;
  }

  const [skill1, skill2, skill3] = compared.skills;

  return calculateAdvancedSkillOdds({
    mode,
    cardType,
    hitterPositionGroup,
    skills: dataSet.skills,
    scoreTable: dataSet.scoreTable,
    skillIds: [skill1.skillId, skill2.skillId, skill3.skillId],
    skillLevels: [
      normalizeLevel(skill1.level),
      normalizeLevel(skill2.level),
      normalizeLevel(skill3.level),
    ],
    targetScore: compared.total,
  });
}

function formatOddsPercent(odds: SkillOddsResult | null): string {
  return formatTopPercent(odds?.scoreAtLeastProbability);
}

function formatExpectedRolls(odds: SkillOddsResult | null): string {
  return odds?.expectedRollsForScoreAtLeast != null
    ? `${odds.expectedRollsForScoreAtLeast.toLocaleString("ko-KR", {
        minimumFractionDigits: odds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
        maximumFractionDigits: odds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
      })}회`
    : "-";
}

function getJudgeGrade(judgeResult: JudgeResult | null): string {
  return judgeResult?.grade ?? "-";
}

function getJudgeGradeColor(judgeResult: JudgeResult | null): string {
  return judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#94a3b8";
}

function formatSkill(skill: ComparedSkill): string {
  if (skill.needsSelection) {
    return `${skill.displayName} 기본 선택`;
  }

  return skill.displayName;
}

function formatSkillOptionPlaceholder(skill: ComparedSkill): string {
  return `${skill.name ?? skill.displayName} 옵션 선택`;
}

export default function SkillCompareBetaView({
  onGoHome,
  themeAction,
  toolUsageSessionId,
}: SkillCompareBetaViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SkillChangeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CalculatorMode>("hitter");
  const [hitterPositionGroup, setHitterPositionGroup] =
    useState<HitterPositionGroup>("fielder");
  const [starterHand, setStarterHand] = useState<StarterHand>("right");
  const [cardType, setCardType] = useState<CardType>("signature");
  const [exampleOpen, setExampleOpen] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Record<string, string>>({});

  const dataSet = useMemo(() => getDataSet(mode, starterHand), [mode, starterHand]);
  const comparedLeft = useMemo(
    () => compareSkills(result?.left ?? [], dataSet, cardType, selectedSkillIds, "left"),
    [cardType, dataSet, result?.left, selectedSkillIds]
  );
  const comparedRight = useMemo(
    () => compareSkills(result?.right ?? [], dataSet, cardType, selectedSkillIds, "right"),
    [cardType, dataSet, result?.right, selectedSkillIds]
  );
  const leftOdds = useMemo(
    () => calculateCompareOdds(comparedLeft, dataSet, mode, cardType, hitterPositionGroup),
    [cardType, comparedLeft, dataSet, hitterPositionGroup, mode]
  );
  const rightOdds = useMemo(
    () => calculateCompareOdds(comparedRight, dataSet, mode, cardType, hitterPositionGroup),
    [cardType, comparedRight, dataSet, hitterPositionGroup, mode]
  );
  const leftJudgeResult = judgeSkillResultByProbability(leftOdds?.scoreAtLeastProbability);
  const rightJudgeResult = judgeSkillResultByProbability(rightOdds?.scoreAtLeastProbability);
  const scoreDiff = Number((comparedRight.total - comparedLeft.total).toFixed(2));

  async function upload(file: File) {
    try {
      setBusy(true);
      setResult(null);
      setError(null);
      setSelectedSkillIds({});
      const response = await recognizeSkillChangeImage(file);

      void logToolUsageEvent({
        tool: "ocr_skill_compare_recognize",
        mode,
        cardType,
        rollCount: 1,
        metadata: {
          session_id: toolUsageSessionId,
          request_id: response.request_id,
          success: true,
        },
      }).catch(() => {});

      setResult(response);
    } catch (uploadError) {
      void logToolUsageEvent({
        tool: "ocr_skill_compare_recognize",
        mode,
        cardType,
        rollCount: 1,
        metadata: {
          session_id: toolUsageSessionId,
          success: false,
        },
      }).catch(() => {});

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "스킬 변경 화면을 분석하지 못했습니다."
      );
    } finally {
      setBusy(false);
    }
  }

  function updateSkillLevel(side: "left" | "right", slot: number, level: SkillLevel) {
    setResult((currentResult) => {
      if (!currentResult) {
        return currentResult;
      }

      return {
        ...currentResult,
        [side]: currentResult[side].map((skill) =>
          skill.slot === slot ? { ...skill, level } : skill
        ),
      };
    });
  }

  function updateSkillMeta(side: "left" | "right", slot: number, skillId: string) {
    setSelectedSkillIds((current) => ({
      ...current,
      [`${side}-${slot}`]: skillId,
    }));
  }

  function getCandidateOptions(skill: ComparedSkill) {
    if (!dataSet) {
      return [];
    }

    return skill.candidateSkillIds
      .map((skillId) => dataSet.skills.find((meta) => meta.id === skillId))
      .filter((meta): meta is SkillMeta => Boolean(meta));
  }

  return (
    <main className="skill-compare-page" aria-labelledby="skill-compare-title">
      <div className="page-toolbar tool-page-hero">
        <div className="page-title-block">
          <span className="page-kicker">Beta</span>
          <h1 id="skill-compare-title">고급 스킬 변경권 점수 비교</h1>
          <p>고스변 화면을 업로드하면 왼쪽 기존 스킬과 오른쪽 변경 후보의 점수를 비교합니다.</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>

      <section className="skill-compare-controls" aria-label="점수 기준 선택">
        <div className="skill-compare-control-group">
          <span>선수 구분</span>
          <div className="toggle-row">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`toggle-btn ${mode === option.value ? "active" : ""}`}
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "hitter" && (
          <div className="skill-compare-control-group">
            <span>타자 구분</span>
            <div className="toggle-row">
              {HITTER_POSITION_GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`toggle-btn ${hitterPositionGroup === option.value ? "active" : ""}`}
                  onClick={() => setHitterPositionGroup(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "starter" && (
          <div className="skill-compare-control-group">
            <span>투구 손</span>
            <div className="toggle-row">
              {STARTER_HAND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`toggle-btn ${starterHand === option.value ? "active" : ""}`}
                  onClick={() => setStarterHand(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="skill-compare-card-select">
          <span>카드 타입</span>
          <select value={cardType} onChange={(event) => setCardType(event.target.value as CardType)}>
            {CARD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="skill-compare-upload-panel">
        <div className="skill-compare-guide-card">
          <div>
            <strong>고스변 화면 캡처 가이드</strong>
            <ul>
              <li>기존 스킬과 변경 후보 스킬 3개가 모두 보이는 화면을 업로드하세요.</li>
              <li>스킬명과 레벨 숫자가 잘리지 않게 모바일에서 세로로 캡처하는 것을 권장합니다.</li>
              <li>OCR 결과는 부정확할 수 있으니 선수 구분, 카드 타입, 스킬 레벨을 확인하세요.</li>
            </ul>
          </div>
          <button
            type="button"
            className="skill-compare-example-link"
            onClick={() => setExampleOpen(true)}
          >
            예시 이미지
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="skill-compare-upload-card"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <span className="skill-compare-upload-copy">
            <strong>{busy ? "분석 중" : "고스변 화면 업로드"}</strong>
            <span>화면을 터치하거나 이미지를 끌어다 놓으세요</span>
          </span>
          <span className="skill-compare-upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 16V4m0 0 5 5m-5-5-5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>

          </span>
          <span className="skill-compare-upload-label">터치하여 업로드</span>
        </button>
      </section>

      {exampleOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setExampleOpen(false)}
        >
          <section
            className="modal-card skill-compare-example-modal"
            role="dialog"
            aria-modal="true"
            aria-label="고스변 화면 캡처 예시"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ocr-example-modal-head">
              <div>
                <p className="modal-eyebrow">Example</p>
                <h2>고스변 화면 예시</h2>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setExampleOpen(false)}>
                닫기
              </button>
            </div>
            <img src="/skill-change-example.png" alt="고스변 화면 캡처 예시" />
          </section>
        </div>
      )}

      {error && <p className="modal-error">{error}</p>}
      {busy && <p className="skill-compare-status">스킬 변경 화면을 분석하고 있습니다.</p>}

      {result && (
        <>
          <section className="skill-compare-score-summary">
            <div>
              <span>현재</span>
              <strong>{comparedLeft.total.toFixed(2)}</strong>
            </div>
            <div>
              <span>변경 후보</span>
              <strong>{comparedRight.total.toFixed(2)}</strong>
            </div>
            <div className={scoreDiff >= 0 ? "positive" : "negative"}>
              <span>차이</span>
              <strong>
                {scoreDiff > 0 ? "+" : ""}
                {scoreDiff.toFixed(2)}
              </strong>
            </div>
          </section>

          <section className="skill-compare-odds-summary" aria-label="고급 스킬 변경권 확률 비교">
            <div className="skill-compare-odds-card">
              <div className="skill-compare-odds-card-head">
                <span>현재</span>
                <strong style={{ color: getJudgeGradeColor(leftJudgeResult) }}>
                  {getJudgeGrade(leftJudgeResult)}
                </strong>
              </div>
              <div className="skill-compare-odds-grid">
                <div>
                  <span>상위 확률</span>
                  <strong>{formatOddsPercent(leftOdds)}</strong>
                </div>
                <div>
                  <span>기대 횟수</span>
                  <strong>{formatExpectedRolls(leftOdds)}</strong>
                </div>
              </div>
            </div>

            <div className="skill-compare-odds-card skill-compare-odds-card-next">
              <div className="skill-compare-odds-card-head">
                <span>변경 후보</span>
                <strong style={{ color: getJudgeGradeColor(rightJudgeResult) }}>
                  {getJudgeGrade(rightJudgeResult)}
                </strong>
              </div>
              <div className="skill-compare-odds-grid">
                <div>
                  <span>상위 확률</span>
                  <strong>{formatOddsPercent(rightOdds)}</strong>
                </div>
                <div>
                  <span>기대 횟수</span>
                  <strong>{formatExpectedRolls(rightOdds)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="skill-compare-results">
            <div className="skill-compare-panel">
              <div className="skill-compare-panel-head">
                <span>Left</span>
                <h2>현재 스킬</h2>
              </div>
              <div className="skill-compare-list">
                {comparedLeft.skills.map((skill) => (
                  <div
                    key={`left-${skill.slot}`}
                    className={`skill-compare-row ${skill.matched ? "" : "unmatched"}`}
                  >
                    <span>{skill.slot}</span>
                    {skill.candidateSkillIds.length > 1 ? (
                      <select
                        className="skill-compare-skill-select"
                        aria-label={`${skill.displayName} 옵션`}
                        value={skill.skillId}
                        onChange={(event) => updateSkillMeta("left", skill.slot, event.target.value)}
                      >
                        <option value="">{formatSkillOptionPlaceholder(skill)}</option>
                        {getCandidateOptions(skill).map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <strong>{formatSkill(skill)}</strong>
                    )}
                    <select
                      aria-label={`${skill.displayName} 레벨`}
                      value={normalizeLevel(skill.level)}
                      onChange={(event) =>
                        updateSkillLevel("left", skill.slot, Number(event.target.value) as SkillLevel)
                      }
                    >
                      {SKILL_LEVEL_OPTIONS.map((level) => (
                        <option key={level} value={level}>
                          Lv.{level}
                        </option>
                      ))}
                    </select>
                    <em>{skill.score.toFixed(2)}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="skill-compare-panel skill-compare-panel-next">
              <div className="skill-compare-panel-head">
                <span>Right</span>
                <h2>변경 후보</h2>
              </div>
              <div className="skill-compare-list">
                {comparedRight.skills.map((skill) => (
                  <div
                    key={`right-${skill.slot}`}
                    className={`skill-compare-row ${skill.matched ? "" : "unmatched"}`}
                  >
                    <span>{skill.slot}</span>
                    {skill.candidateSkillIds.length > 1 ? (
                      <select
                        className="skill-compare-skill-select"
                        aria-label={`${skill.displayName} 옵션`}
                        value={skill.skillId}
                        onChange={(event) => updateSkillMeta("right", skill.slot, event.target.value)}
                      >
                        <option value="">{formatSkillOptionPlaceholder(skill)}</option>
                        {getCandidateOptions(skill).map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <strong>{formatSkill(skill)}</strong>
                    )}
                    <select
                      aria-label={`${skill.displayName} 레벨`}
                      value={normalizeLevel(skill.level)}
                      onChange={(event) =>
                        updateSkillLevel(
                          "right",
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
                    <em>{skill.score.toFixed(2)}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
