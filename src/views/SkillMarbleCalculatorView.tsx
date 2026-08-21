import { useEffect, useMemo, useState } from "react";
import SkillSelect from "../components/SkillSelect";
import { KakaoAdFitMobileMidBanner } from "../components/KakaoAdFitFixedBanner";
import type {
  CalculatorMode,
  HitterBattingSide,
  HitterPositionGroup,
  PitcherStaminaRange,
  SkillLevel,
  SkillMeta,
  StarterHand,
} from "../types";
import type { GameDataSet } from "../data/gameData";
import {
  isPitcherStaminaSkillEligible,
  PITCHER_STAMINA_RANGE_OPTIONS,
} from "../utils/pitcherSkillFilters";
import {
  calculateSkillMarbleOdds,
  type SkillMarbleMode,
  type SkillMarbleOutcome,
} from "../utils/skillMarbleOdds";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";
import {
  HITTER_FIVE_TOOL_RANGE_OPTIONS,
  HITTER_TABLE_SETTER_RUN_OPTIONS,
  isHitterConditionalSkillEligible,
  type HitterFiveToolRange,
  type HitterTableSetterRunRange,
} from "../utils/hitterSkillFilters";

interface SkillMarbleCalculatorViewProps {
  mode: CalculatorMode;
  hitterPositionGroup: HitterPositionGroup;
  hitterBattingSide: HitterBattingSide;
  starterHand: StarterHand;
  pitcherStaminaRange: PitcherStaminaRange;
  gameData: GameDataSet;
  selectedSkillMeta: {
    skill1: SkillMeta | undefined;
    skill2: SkillMeta | undefined;
    skill3: SkillMeta | undefined;
  };
  filteredSkills: SkillMeta[];
  resolvedSkill1: string;
  resolvedSkill2: string;
  resolvedSkill3: string;
  level2: SkillLevel;
  level3: SkillLevel;
  marbleMode: SkillMarbleMode;
  setSkill1: (skillId: string) => void;
  setSkill2: (skillId: string) => void;
  setSkill3: (skillId: string) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  onModeChange: (nextMode: CalculatorMode) => void;
  onHitterBattingSideChange: (nextSide: HitterBattingSide) => void;
  onStarterHandChange: (nextHand: StarterHand) => void;
  onPitcherStaminaRangeChange: (nextRange: PitcherStaminaRange) => void;
  onMarbleModeChange: (nextMode: SkillMarbleMode) => void;
}

function formatProbability(probability: number) {
  return `${(probability * 100).toLocaleString("ko-KR", {
    minimumFractionDigits: probability > 0 && probability < 0.001 ? 4 : 2,
    maximumFractionDigits: probability > 0 && probability < 0.001 ? 4 : 2,
  })}%`;
}

function formatScore(score: number) {
  return score.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OutcomeList({ title, outcomes }: { title: string; outcomes: SkillMarbleOutcome[] }) {
  return (
    <section className="skill-marble-outcome-section">
      <h3>{title}</h3>
      <div className="skill-marble-outcome-list">
        {outcomes.map((outcome) => (
          <div key={`${outcome.skill2.id}-${outcome.skill3.id}`} className="skill-marble-outcome-row">
            <span>
              {outcome.skill2.name} / {outcome.skill3.name}
            </span>
            <strong>{formatScore(outcome.score)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function getSkillsForPlayerSide(
  skills: SkillMeta[],
  mode: CalculatorMode,
  battingSide: HitterBattingSide,
  starterHand: StarterHand,
  staminaRange: PitcherStaminaRange,
  tableSetterRunRange: HitterTableSetterRunRange,
  fiveToolRange: HitterFiveToolRange
) {
  const impactOnlySkills = skills.filter(
    (skill) => skill.name !== "도전정신(5성)" && !skill.name.replace(/\s+/g, "").startsWith("포수리드")
  );

  if (mode !== "hitter") {
    return impactOnlySkills.filter((skill) => {
      if (mode === "starter" && skill.name.replace(/\s+/g, "").startsWith("마당쇠")) {
        return false;
      }
      if (!isPitcherStaminaSkillEligible(skill, mode, staminaRange)) {
        return false;
      }
      if (skill.name.includes("(좌투)")) {
        return starterHand === "left";
      }
      if (skill.name.includes("(우투)")) {
        return starterHand === "right";
      }

      return true;
    });
  }

  return impactOnlySkills.filter((skill) => {
    if (
      !isHitterConditionalSkillEligible(skill, {
        tableSetterRunRange,
        fiveToolRange,
      })
    ) {
      return false;
    }
    if (skill.name.includes("(좌타)")) {
      return battingSide === "left";
    }
    if (skill.name.includes("(우타)")) {
      return battingSide === "right";
    }
    if (skill.name.includes("(양타)")) {
      return battingSide === "switch";
    }

    return true;
  });
}

function getFilteredSkillReplacement(skill: SkillMeta | undefined, skillPool: SkillMeta[]) {
  if (!skill) {
    return "";
  }

  if (skillPool.some((candidate) => candidate.id === skill.id)) {
    return skill.id;
  }

  const baseName = normalizeSkillBaseName(skill.name);
  return skillPool.find((candidate) => normalizeSkillBaseName(candidate.name) === baseName)?.id ?? "";
}

export default function SkillMarbleCalculatorView({
  mode,
  hitterPositionGroup,
  hitterBattingSide,
  starterHand,
  pitcherStaminaRange,
  gameData,
  selectedSkillMeta,
  filteredSkills,
  resolvedSkill1,
  resolvedSkill2,
  resolvedSkill3,
  level2,
  level3,
  marbleMode,
  setSkill1,
  setSkill2,
  setSkill3,
  setLevel2,
  setLevel3,
  onModeChange,
  onHitterBattingSideChange,
  onStarterHandChange,
  onPitcherStaminaRangeChange,
  onMarbleModeChange,
}: SkillMarbleCalculatorViewProps) {
  const [tableSetterRunRange, setTableSetterRunRange] =
    useState<HitterTableSetterRunRange>("142-plus");
  const [fiveToolRange, setFiveToolRange] = useState<HitterFiveToolRange>("275-299");
  const marbleSkillPool = useMemo(
    () =>
      getSkillsForPlayerSide(
        filteredSkills,
        mode,
        hitterBattingSide,
        starterHand,
        pitcherStaminaRange,
        tableSetterRunRange,
        fiveToolRange
      ),
    [
      filteredSkills,
      fiveToolRange,
      hitterBattingSide,
      mode,
      pitcherStaminaRange,
      starterHand,
      tableSetterRunRange,
    ]
  );
  const marbleCalculationSkills = useMemo(
    () =>
      getSkillsForPlayerSide(
        gameData.skills,
        mode,
        hitterBattingSide,
        starterHand,
        pitcherStaminaRange,
        tableSetterRunRange,
        fiveToolRange
      ),
    [
      fiveToolRange,
      gameData.skills,
      hitterBattingSide,
      mode,
      pitcherStaminaRange,
      starterHand,
      tableSetterRunRange,
    ]
  );

  useEffect(() => {
    const nextSkill1 = getFilteredSkillReplacement(selectedSkillMeta.skill1, marbleSkillPool);
    const nextSkill2 = getFilteredSkillReplacement(selectedSkillMeta.skill2, marbleSkillPool);
    const nextSkill3 = getFilteredSkillReplacement(selectedSkillMeta.skill3, marbleSkillPool);

    if (resolvedSkill1 !== nextSkill1) {
      setSkill1(nextSkill1);
    }
    if (resolvedSkill2 !== nextSkill2) {
      setSkill2(nextSkill2);
    }
    if (resolvedSkill3 !== nextSkill3) {
      setSkill3(nextSkill3);
    }
  }, [
    marbleSkillPool,
    resolvedSkill1,
    resolvedSkill2,
    resolvedSkill3,
    selectedSkillMeta.skill1,
    selectedSkillMeta.skill2,
    selectedSkillMeta.skill3,
    setSkill1,
    setSkill2,
    setSkill3,
  ]);

  const result = calculateSkillMarbleOdds({
    skills: marbleCalculationSkills,
    scoreTable: gameData.scoreTable,
    calculatorMode: mode,
    fixedSkillId: resolvedSkill1,
    currentSkill2Id: resolvedSkill2,
    currentSkill3Id: resolvedSkill3,
    level2,
    level3,
    hitterPositionGroup,
    mode: marbleMode,
  });
  const handLabel = mode === "hitter" ? "타석" : "투구손";
  const battingSideLabel =
    hitterBattingSide === "switch" ? "양타" : hitterBattingSide === "left" ? "좌타" : "우타";
  const leftLabel = mode === "hitter" ? "좌타" : "좌투";
  const rightLabel = mode === "hitter" ? "우타" : "우투";
  const marbleModeLabel = marbleMode === "oneMajor" ? "1메 확정" : "2메 확정";

  return (
    <div className="skill-marble-shell skill-marble-simple">
      <section className="skill-marble-hero-card">
        <div className="skill-marble-hero-copy">
          <span>Skill Marble</span>
          <h2>{marbleModeLabel}</h2>
          <p>{selectedSkillMeta.skill1?.name ?? "1번 스킬"} 고정</p>
        </div>

        <div className="skill-marble-mode-cards" aria-label="마블 적용">
          <button
            type="button"
            className={`skill-marble-mode-card ${marbleMode === "oneMajor" ? "active" : ""}`}
            onClick={() => onMarbleModeChange("oneMajor")}
          >
            <strong>1메 확정</strong>
            <span>2번 메이저</span>
          </button>
          <button
            type="button"
            className={`skill-marble-mode-card ${marbleMode === "twoMajor" ? "active" : ""}`}
            onClick={() => onMarbleModeChange("twoMajor")}
          >
            <strong>2메 확정</strong>
            <span>2번 + 3번 메이저</span>
          </button>
        </div>
      </section>

      <section className="skill-marble-result-panel">
        {!result ? (
          <div className="skill-marble-empty-state">
            고정 1번 스킬과 기존 2, 3번 스킬을 입력하면 확률이 표시됩니다.
          </div>
        ) : (
          <>
            <div className="skill-marble-score-strip">
              <div>
                <span>현재 2,3옵 점수</span>
                <strong>{formatScore(result.currentScore)}</strong>
              </div>
              <div>
                <span>마블 평균 점수</span>
                <strong>{formatScore(result.expectedScore)}</strong>
              </div>
            </div>

            <div className="skill-marble-probability-grid">
              <div className="skill-marble-probability-card better">
                <span>높아질 확률</span>
                <strong>{formatProbability(result.betterProbability)}</strong>
              </div>
              <div className="skill-marble-probability-card equal">
                <span>비슷</span>
                <strong>{formatProbability(result.similarProbability)}</strong>
                <small>{result.similarScoreRangeLabel}</small>
              </div>
              <div className="skill-marble-probability-card worse">
                <span>낮아질 확률</span>
                <strong>{formatProbability(result.worseProbability)}</strong>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="skill-marble-setup-panel">
        <div className="skill-marble-setup-head">
          <h3>조건</h3>
          <span>임팩트 전용</span>
        </div>

        <div className="skill-marble-compact-controls">
          <div className="control-section">
            <label>대상</label>
            <div className="toggle-row toggle-row-modes">
              {[
                ["hitter", "타자"],
                ["starter", "선발"],
                ["middle", "중계"],
                ["closer", "마무리"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`toggle-btn ${mode === value ? "active" : ""}`}
                  onClick={() => onModeChange(value as CalculatorMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <label>{handLabel}</label>
            {mode === "hitter" ? (
              <div className="toggle-row skill-marble-hand-row">
                <button
                  type="button"
                  className={`toggle-btn ${hitterBattingSide === "left" ? "active" : ""}`}
                  onClick={() => onHitterBattingSideChange("left")}
                >
                  좌타
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${hitterBattingSide === "right" ? "active" : ""}`}
                  onClick={() => onHitterBattingSideChange("right")}
                >
                  우타
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${hitterBattingSide === "switch" ? "active" : ""}`}
                  onClick={() => onHitterBattingSideChange("switch")}
                >
                  양타
                </button>
              </div>
            ) : (
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${starterHand === "left" ? "active" : ""}`}
                  onClick={() => onStarterHandChange("left")}
                >
                  {leftLabel}
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${starterHand === "right" ? "active" : ""}`}
                  onClick={() => onStarterHandChange("right")}
                >
                  {rightLabel}
                </button>
              </div>
            )}
          </div>

          {mode !== "hitter" && (
            <div className="control-section">
              <label>지구력 구간</label>
              <select
                className="skill-marble-filter-select"
                value={pitcherStaminaRange}
                onChange={(event) => onPitcherStaminaRangeChange(event.target.value as PitcherStaminaRange)}
              >
                {PITCHER_STAMINA_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "hitter" && (
            <>
              <div className="control-section">
                <label>선봉장 주루</label>
                <select
                  className="skill-marble-filter-select"
                  value={tableSetterRunRange}
                  onChange={(event) =>
                    setTableSetterRunRange(event.target.value as HitterTableSetterRunRange)
                  }
                >
                  {HITTER_TABLE_SETTER_RUN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-section">
                <label>5툴 주수</label>
                <select
                  className="skill-marble-filter-select"
                  value={fiveToolRange}
                  onChange={(event) => setFiveToolRange(event.target.value as HitterFiveToolRange)}
                >
                  {HITTER_FIVE_TOOL_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </section>
      <KakaoAdFitMobileMidBanner enabled />

      <section className="skill-marble-skill-panel">
        <div className="skill-marble-setup-head">
          <h3>기존 스킬셋</h3>
          <span>1옵 잠금</span>
        </div>
        <div className="skill-marble-skill-grid">
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="1번 스킬"
              value={resolvedSkill1}
              options={marbleSkillPool}
              excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
              onChange={setSkill1}
              metaText="1옵 잠금"
              slotNumber={1}
              collapseOnMobileAfterSelect
            />
          </div>
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="2번 스킬"
              value={resolvedSkill2}
              options={marbleSkillPool}
              excludedSkillIds={[resolvedSkill1, resolvedSkill3]}
              onChange={setSkill2}
              metaText={`현재 Lv.${level2}`}
              slotNumber={2}
              collapseOnMobileAfterSelect
            />
            <label className="skill-marble-inline-level">
              기존 2번 레벨
              <select value={level2} onChange={(event) => setLevel2(Number(event.target.value) as SkillLevel)}>
                {[5, 6, 7, 8].map((level) => (
                  <option key={level} value={level}>
                    Lv.{level}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="3번 스킬"
              value={resolvedSkill3}
              options={marbleSkillPool}
              excludedSkillIds={[resolvedSkill1, resolvedSkill2]}
              onChange={setSkill3}
              metaText={`현재 Lv.${level3}`}
              slotNumber={3}
              collapseOnMobileAfterSelect
            />
            <label className="skill-marble-inline-level">
              기존 3번 레벨
              <select value={level3} onChange={(event) => setLevel3(Number(event.target.value) as SkillLevel)}>
                {[5, 6, 7, 8].map((level) => (
                  <option key={level} value={level}>
                    Lv.{level}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {result && (
        <section className="skill-marble-outcomes">
          <OutcomeList title="높아질 때 예시" outcomes={result.betterExamples} />
          <OutcomeList title="낮아질 때 예시" outcomes={result.worseExamples} />
        </section>
      )}

      <p className="impact-note">
        {marbleMode === "oneMajor"
          ? "1메 확정은 2번 슬롯을 메이저 확정으로 보고 계산합니다."
          : "2메 확정은 2번과 3번 슬롯을 모두 메이저 확정으로 보고 계산합니다."}{" "}
        결과 점수는 {result?.marbleLevelLabel ?? "Lv.5 + Lv.5"} 기준이며, 현재 선택은 {battingSideLabel} 스킬풀을 사용합니다.
      </p>
    </div>
  );
}
