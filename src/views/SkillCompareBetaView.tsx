import { useEffect, useMemo, useRef, useState } from "react";
import { KakaoAdFitMobileMidBanner } from "../components/KakaoAdFitFixedBanner";
import { getGameDataSet, type GameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import { getDefaultLevels, getSkillLevelOptions } from "../lib/toolboxHelpers";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  SkillLevel,
  SkillMeta,
  StarterHand,
} from "../types";
import type { SkillChangeResponse, SkillChangeSkill } from "../types/skillChange";
import { calculateAdvancedSkillOdds, type SkillOddsResult } from "../utils/advancedSkillOdds";
import { calculateSkillTotal } from "../utils/calculate";
import { formatTopPercent } from "../utils/formatOdds";
import { judgeSkillResultByProbability, type JudgeResult } from "../utils/judge";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

type SkillCompareBetaViewProps = {
  onGoHome: () => void;
  themeAction?: React.ReactNode;
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
  { value: "allStar", label: "올스타" },
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
type CompareInputMode = "manual";

function createBlankSkillChangeResponse(cardType: CardType = "signature"): SkillChangeResponse {
  const defaultLevels = getDefaultLevels(cardType);
  const blankSkills = [1, 2, 3].map((slot) => ({
    slot,
    name: null,
    level: defaultLevels[slot - 1],
  }));

  return {
    ok: true,
    request_id: null,
    image: {
      path: "",
      width: 0,
      height: 0,
    },
    left: blankSkills,
    right: blankSkills,
  };
}

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
  const candidates = dataSet.skills.filter((meta) => meta.availableCardTypes.includes(cardType));
  const selected = selectedSkillId
    ? candidates.find((meta) => meta.id === selectedSkillId) ?? null
    : null;
  if (selected) {
    return { meta: selected, candidates: [selected], needsSelection: false };
  }

  const requested = normalizeName(skill.name);
  if (!requested) {
    return { meta: null, candidates: [], needsSelection: false };
  }

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

  const level = normalizeLevel(skill.level);
  const defaultMeta = [...familyMatches].sort((first, second) => {
    const firstScore = dataSet.scoreTable[first.id]?.[level] ?? 0;
    const secondScore = dataSet.scoreTable[second.id]?.[level] ?? 0;
    return secondScore - firstScore;
  })[0];

  return { meta: defaultMeta, candidates: familyMatches, needsSelection: true };
}

function normalizeLevel(level: number | null): SkillLevel {
  return level === 5 || level === 6 || level === 7 || level === 8 || level === 9 || level === 10
    ? level
    : 5;
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
        displayName: skill.name ?? "미선택",
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
      displayName: meta?.name ?? skill.name ?? "미선택",
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

  if (getDuplicateSkillFamilies(compared.skills, dataSet).length > 0) {
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

function formatRecognizedSkillName(skill: ComparedSkill): string {
  return skill.name?.trim() ? skill.name : "미선택";
}

function getDuplicateSkillFamilies(
  skills: ComparedSkill[],
  dataSet: GameDataSet | null
): string[] {
  if (!dataSet) {
    return [];
  }

  const familyCounts = new Map<string, number>();

  skills.forEach((skill) => {
    if (!skill.skillId) {
      return;
    }

    const meta = dataSet.skills.find((candidate) => candidate.id === skill.skillId);
    if (!meta) {
      return;
    }

    const familyName = normalizeSkillBaseName(meta.name);
    familyCounts.set(familyName, (familyCounts.get(familyName) ?? 0) + 1);
  });

  return [...familyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([familyName]) => familyName);
}

function formatCombinationStatus(
  compared: { skills: ComparedSkill[]; total: number },
  duplicateFamilies: string[]
): string {
  if (duplicateFamilies.length > 0) {
    return `${duplicateFamilies.join(", ")} 계열은 한 번에 같이 나올 수 없습니다.`;
  }

  if (compared.skills.some((skill) => !skill.skillId)) {
    return "스킬 3개를 모두 선택하면 확률이 표시됩니다.";
  }

  return "";
}

function SearchableSkillSelect({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: SkillMeta[];
  value: string;
  onChange: (skillId: string) => void;
}) {
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const [query, setQuery] = useState(selectedOption?.name ?? "");
  const [open, setOpen] = useState(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (open || lastValueRef.current === value) {
      return;
    }

    lastValueRef.current = value;
    setQuery(selectedOption?.name ?? "");
  }, [open, selectedOption?.name, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) {
      return options.slice(0, 24);
    }

    return options
      .filter((option) => normalizeName(option.name).includes(normalizedQuery))
      .slice(0, 24);
  }, [options, query]);

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setOpen(true);

    const exactOption = options.find((option) => normalizeName(option.name) === normalizeName(nextQuery));
    onChange(exactOption?.id ?? "");
  };

  const selectOption = (skillId: string) => {
    const nextOption = options.find((option) => option.id === skillId) ?? null;
    setQuery(nextOption?.name ?? "");
    setOpen(false);
    lastValueRef.current = skillId;
    onChange(skillId);
  };

  return (
    <div className="skill-compare-search-select">
      <input
        type="text"
        className={selectedOption ? `lineup-skill-grade-${selectedOption.grade}` : undefined}
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
            selectOption(filteredOptions[0].id);
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="skill-compare-search-list" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.id)}
              >
                {option.name}
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

export default function SkillCompareBetaView({
  onGoHome,
  themeAction,
}: SkillCompareBetaViewProps) {
  const [result, setResult] = useState<SkillChangeResponse | null>(() =>
    createBlankSkillChangeResponse()
  );
  const [mode, setMode] = useState<CalculatorMode>("hitter");
  const [hitterPositionGroup, setHitterPositionGroup] =
    useState<HitterPositionGroup>("fielder");
  const [starterHand, setStarterHand] = useState<StarterHand>("right");
  const [cardType, setCardType] = useState<CardType>("signature");
  const [selectedSkillIds, setSelectedSkillIds] = useState<Record<string, string>>({});
  const compareInputMode: CompareInputMode = "manual";
  const skillLevelOptions = useMemo(() => getSkillLevelOptions(cardType), [cardType]);

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
  const leftDuplicateFamilies = useMemo(
    () => getDuplicateSkillFamilies(comparedLeft.skills, dataSet),
    [comparedLeft.skills, dataSet]
  );
  const rightDuplicateFamilies = useMemo(
    () => getDuplicateSkillFamilies(comparedRight.skills, dataSet),
    [comparedRight.skills, dataSet]
  );
  const leftCombinationStatus = formatCombinationStatus(comparedLeft, leftDuplicateFamilies);
  const rightCombinationStatus = formatCombinationStatus(comparedRight, rightDuplicateFamilies);
  const leftJudgeResult = judgeSkillResultByProbability(leftOdds?.scoreAtLeastProbability);
  const rightJudgeResult = judgeSkillResultByProbability(rightOdds?.scoreAtLeastProbability);
  const scoreDiff = Number((comparedRight.total - comparedLeft.total).toFixed(2));

  useEffect(() => {
    setResult((currentResult) => currentResult ?? createBlankSkillChangeResponse(cardType));
  }, [cardType]);

  function handleCardTypeChange(nextCardType: CardType) {
    const nextLevelOptions = getSkillLevelOptions(nextCardType);
    const nextDefaultLevels = getDefaultLevels(nextCardType);

    setCardType(nextCardType);
    setSelectedSkillIds({});
    setResult((currentResult) => {
      if (!currentResult) {
        return currentResult;
      }

      const normalizeSkills = (skills: SkillChangeSkill[]) =>
        skills.map((skill, index) => {
          const level = normalizeLevel(skill.level);
          return {
            ...skill,
            level: nextLevelOptions.includes(level) ? level : nextDefaultLevels[index] ?? 5,
          };
        });

      return {
        ...currentResult,
        left: normalizeSkills(currentResult.left),
        right: normalizeSkills(currentResult.right),
      };
    });
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

  function getSelectableSkillOptions() {
    if (!dataSet) {
      return [];
    }

    return dataSet.skills.filter((meta) => meta.availableCardTypes.includes(cardType));
  }

  const selectableSkillOptions = getSelectableSkillOptions();

  function getSelectableSkillOptionsForSide(side: "left" | "right", slot: number) {
    if (!dataSet) {
      return [];
    }

    const selectedSameSideIds = [1, 2, 3]
      .filter((targetSlot) => targetSlot !== slot)
      .map((targetSlot) => selectedSkillIds[`${side}-${targetSlot}`])
      .filter(Boolean);
    const selectedFamilies = new Set(
      selectedSameSideIds
        .map((skillId) => dataSet.skills.find((candidate) => candidate.id === skillId))
        .filter((skill): skill is SkillMeta => Boolean(skill))
        .map((skill) => normalizeSkillBaseName(skill.name))
    );

    return selectableSkillOptions.filter((option) => {
      const currentValue = selectedSkillIds[`${side}-${slot}`];
      return option.id === currentValue || !selectedFamilies.has(normalizeSkillBaseName(option.name));
    });
  }

  return (
    <main
      className={`skill-compare-page skill-compare-page-${compareInputMode}`}
      aria-labelledby="skill-compare-title"
    >
      <div className="page-toolbar tool-page-hero">
        <div className="page-title-block">
          <span className="page-kicker">Beta</span>
          <h1 id="skill-compare-title">고급 스킬 변경권 점수 비교</h1>
          <p>스킬과 레벨을 직접 입력해서 기존 스킬과 변경 후보를 비교합니다.</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>
      <KakaoAdFitMobileMidBanner enabled />

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
          <select value={cardType} onChange={(event) => handleCardTypeChange(event.target.value as CardType)}>
            {CARD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="skill-compare-manual-panel">
        <strong>직접 입력 방식으로 전환됐습니다.</strong>
        <p>현재 스킬과 변경 후보 스킬, 레벨을 직접 입력해 바로 비교합니다.</p>
      </section>

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
              {leftCombinationStatus && (
                <p className="skill-compare-combination-status">{leftCombinationStatus}</p>
              )}
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
              {rightCombinationStatus && (
                <p className="skill-compare-combination-status">{rightCombinationStatus}</p>
              )}
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
                    className="skill-compare-row"
                  >
                    <span>{skill.slot}</span>
                    <div className="skill-compare-skill-field">
                      <SearchableSkillSelect
                        ariaLabel={`${formatRecognizedSkillName(skill)} 스킬 선택`}
                        value={skill.skillId}
                        options={getSelectableSkillOptionsForSide("left", skill.slot)}
                        onChange={(skillId) => updateSkillMeta("left", skill.slot, skillId)}
                      />
                      <small>같은 계열 스킬은 후보에서 제외됩니다.</small>
                    </div>
                    <select
                      aria-label={`${skill.displayName} 레벨`}
                      value={normalizeLevel(skill.level)}
                      onChange={(event) =>
                        updateSkillLevel("left", skill.slot, Number(event.target.value) as SkillLevel)
                      }
                    >
                      {skillLevelOptions.map((level) => (
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
                    className="skill-compare-row"
                  >
                    <span>{skill.slot}</span>
                    <div className="skill-compare-skill-field">
                      <SearchableSkillSelect
                        ariaLabel={`${formatRecognizedSkillName(skill)} 스킬 선택`}
                        value={skill.skillId}
                        options={getSelectableSkillOptionsForSide("right", skill.slot)}
                        onChange={(skillId) => updateSkillMeta("right", skill.slot, skillId)}
                      />
                      <small>같은 계열 스킬은 후보에서 제외됩니다.</small>
                    </div>
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
                      {skillLevelOptions.map((level) => (
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
