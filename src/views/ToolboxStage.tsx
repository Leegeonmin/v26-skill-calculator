import { useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  KakaoAdFitMobileMidBanner,
  KakaoAdFitPcTopTripleBanner,
} from "../components/KakaoAdFitFixedBanner";
import CalculatorView from "./CalculatorView";
import AdvancedSimulatorView from "./AdvancedSimulatorView";
import ImpactSimulatorView from "./ImpactSimulatorView";
import SkillMarbleCalculatorView from "./SkillMarbleCalculatorView";
import MajorSkillMarbleCalculatorView from "./MajorSkillMarbleCalculatorView";
import type { GameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import type { ResultGrade } from "../utils/judge";
import type { SkillMarbleMode } from "../utils/skillMarbleOdds";
import type {
  CalculatorMode,
  CardType,
  HitterBattingSide,
  HitterPositionGroup,
  PitcherStaminaRange,
  SkillLevel,
  SkillMeta,
  StarterHand,
  ToolView,
} from "../types";
import type { SkillOddsResult } from "../utils/advancedSkillOdds";
import { formatTopPercent } from "../utils/formatOdds";
import { getAdvancedSkillChangeSkillPool } from "../utils/skillChangeRollCore";

type ToolboxStageProps = {
  toolView: Exclude<ToolView, "home" | "ranking" | "notice">;
  mode: CalculatorMode;
  hitterPositionGroup: HitterPositionGroup;
  hitterBattingSide: HitterBattingSide;
  starterHand: StarterHand;
  pitcherStaminaRange: PitcherStaminaRange;
  skillMarbleMode: SkillMarbleMode;
  cardType: CardType;
  activeCardType: CardType;
  gameData: GameDataSet | null;
  pitcherRole: string;
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
  impactTotalScoreWithFirst: number | string;
  skillOdds: SkillOddsResult | null;
  selectedSkillMeta: {
    skill1: SkillMeta | undefined;
    skill2: SkillMeta | undefined;
    skill3: SkillMeta | undefined;
  };
  rolledSkillColors: {
    skill1: string;
    skill2: string;
    skill3: string;
  };
  skillScores: {
    skill1: number | undefined;
    skill2: number | undefined;
    skill3: number | undefined;
  };
  filteredSkills: GameDataSet["skills"];
  resolvedSkill1: string;
  resolvedSkill2: string;
  resolvedSkill3: string;
  level1: SkillLevel;
  level2: SkillLevel;
  level3: SkillLevel;
  simRollCount: number;
  simAutoRollOccurrenceCount: number | null;
  targetGrade: ResultGrade;
  targetGradeOptions: Array<{ value: ResultGrade; label: string }>;
  impactSessionRollCount: number;
  impactLastSuccessRollCount: number | null;
  impactLastMessage: string;
  cardTypeOptions: Array<{ value: CardType; label: string }>;
  resultGradeGuide: Array<{ grade: ResultGrade; title: string; description: string }>;
  getSkillScoreLabel: (score: number | undefined) => string;
  setSkill1: Dispatch<SetStateAction<string>>;
  setSkill2: Dispatch<SetStateAction<string>>;
  setSkill3: Dispatch<SetStateAction<string>>;
  setLevel1: Dispatch<SetStateAction<SkillLevel>>;
  setLevel2: Dispatch<SetStateAction<SkillLevel>>;
  setLevel3: Dispatch<SetStateAction<SkillLevel>>;
  setTargetGrade: Dispatch<SetStateAction<ResultGrade>>;
  onModeChange: (nextMode: CalculatorMode) => void;
  onHitterPositionGroupChange: (nextGroup: HitterPositionGroup) => void;
  onHitterBattingSideChange: (nextSide: HitterBattingSide) => void;
  onStarterHandChange: (nextHand: StarterHand) => void;
  onPitcherStaminaRangeChange: (nextRange: PitcherStaminaRange) => void;
  onSkillMarbleModeChange: (nextMode: SkillMarbleMode) => void;
  onCardTypeChange: (nextCardType: CardType) => void;
  onReset: () => void;
  onGoHome: () => void;
  themeAction?: ReactNode;
  onRollOnce: () => void;
  onAutoRoll: () => void;
  onImpactRoll: () => void;
  resetImpactChangeSession: () => void;
  guideContent?: ReactNode;
};

function getModeLabel(mode: CalculatorMode): string {
  switch (mode) {
    case "hitter":
      return "타자";
    case "starter":
      return "선발";
    case "middle":
      return "중계";
    case "closer":
      return "마무리";
    default:
      return mode;
  }
}

function getResultInterpretation(input: {
  toolView: ToolboxStageProps["toolView"];
  grade: string;
  topPercentLabel: string;
  activeCardType: CardType;
}) {
  if (input.toolView !== "calculator") {
    return null;
  }

  const basis =
    input.activeCardType === "impact"
      ? "임팩트 카드는 1옵 제외 점수와 함께 봐야 합니다."
      : "카드 타입별 기준표에서 같은 점수 이상이 나올 확률을 기준으로 봅니다.";

  switch (input.grade) {
    case "SR+":
      return {
        title: "거의 종결권 조합입니다",
        body: `${input.topPercentLabel} 수준이면 쉽게 다시 보기 어려운 구간입니다. ${basis}`,
      };
    case "SS":
      return {
        title: "멈춰도 되는 상위권 조합입니다",
        body: `${input.topPercentLabel} 수준이라면 대부분의 카드에서 충분히 강한 결과입니다. ${basis}`,
      };
    case "S":
      return {
        title: "좋은 조합이지만 목표에 따라 갈립니다",
        body: `${input.topPercentLabel} 구간입니다. 오래 쓸 핵심 카드라면 한 단계 위를 노릴지 시뮬로 확인해보는 편이 좋습니다.`,
      };
    case "A":
      return {
        title: "실사용은 가능하지만 욕심낼 여지가 있습니다",
        body: `${input.topPercentLabel} 구간입니다. 변경권 여유가 있으면 S 이상 목표까지 필요한 횟수를 비교해보세요.`,
      };
    case "B":
    case "C":
      return {
        title: "임시 사용 또는 재시도 후보입니다",
        body: `${input.topPercentLabel} 구간이라 장기 카드라면 재시도를 고려할 수 있습니다. 다만 곧 교체할 카드라면 타협해도 됩니다.`,
      };
    default:
      return {
        title: "스킬을 입력하면 해석이 표시됩니다",
        body: "결과 점수, 등급, 상위 확률을 기준으로 멈춤 여부와 다음 액션을 함께 확인할 수 있습니다.",
      };
  }
}

export default function ToolboxStage({
  toolView,
  mode,
  hitterPositionGroup,
  hitterBattingSide,
  starterHand,
  pitcherStaminaRange,
  skillMarbleMode,
  cardType,
  activeCardType,
  gameData,
  pitcherRole,
  resultGradeColor,
  judgeGrade,
  totalScore,
  impactTotalScoreWithFirst,
  skillOdds,
  selectedSkillMeta,
  rolledSkillColors,
  skillScores,
  filteredSkills,
  resolvedSkill1,
  resolvedSkill2,
  resolvedSkill3,
  level1,
  level2,
  level3,
  simRollCount,
  simAutoRollOccurrenceCount,
  targetGrade,
  targetGradeOptions,
  impactSessionRollCount,
  impactLastSuccessRollCount,
  impactLastMessage,
  cardTypeOptions,
  resultGradeGuide,
  getSkillScoreLabel,
  setSkill1,
  setSkill2,
  setSkill3,
  setLevel1,
  setLevel2,
  setLevel3,
  setTargetGrade,
  onModeChange,
  onHitterPositionGroupChange,
  onHitterBattingSideChange,
  onStarterHandChange,
  onPitcherStaminaRangeChange,
  onSkillMarbleModeChange,
  onCardTypeChange,
  onReset,
  onGoHome,
  themeAction,
  onRollOnce,
  onAutoRoll,
  onImpactRoll,
  resetImpactChangeSession,
  guideContent,
}: ToolboxStageProps) {
  const [simulatorSetupState, setSimulatorSetupState] = useState({
    toolView,
    complete: false,
  });
  const advancedSimulatorSkills = getAdvancedSkillChangeSkillPool(filteredSkills, activeCardType);
  const simulatorSetupComplete =
    toolView === "simulator" &&
    simulatorSetupState.toolView === "simulator" &&
    simulatorSetupState.complete;
  const standardCardTypeOptions = useMemo(
    () => cardTypeOptions.filter((option) => option.value !== "allStar"),
    [cardTypeOptions]
  );
  const simulatorCardTypeOptions = toolView === "simulator" ? standardCardTypeOptions : cardTypeOptions;
  const majorMarbleCardTypeOptions =
    toolView === "majorSkillMarble" ? standardCardTypeOptions : cardTypeOptions;
  const visibleCardType = cardType === "allStar" ? activeCardType : cardType;

  const modeLabel = getModeLabel(mode);
  const hitterPositionLabel =
    mode === "hitter" ? (hitterPositionGroup === "fielder" ? "야수" : "포수") : null;
  const cardTypeLabel =
    cardTypeOptions.find((option) => option.value === activeCardType)?.label ?? activeCardType;
  const pageTitle =
    toolView === "calculator"
      ? "스킬 점수 계산기"
      : toolView === "simulator"
        ? "고스변 시뮬"
        : toolView === "skillMarble"
          ? "임팩트 스킬 마블 계산기"
          : toolView === "majorSkillMarble"
            ? "메이저 스킬 마블 계산기"
          : "임팩트 변경 시뮬";
  const pageKicker =
    toolView === "calculator"
      ? "Skill Score"
      : toolView === "simulator"
        ? "Advanced Roll"
        : toolView === "skillMarble"
          ? "Impact Marble"
          : toolView === "majorSkillMarble"
            ? "Major Marble"
          : "Impact Roll";
  const pageDescription =
    toolView === "calculator"
      ? "카드 타입과 포지션을 고른 뒤 세 개의 스킬 점수를 빠르게 계산합니다."
      : toolView === "simulator"
        ? "인게임 고급스킬변경권처럼 굴리고, 원하는 등급까지 자동 롤을 실행합니다."
        : toolView === "skillMarble"
          ? "임팩트 1옵을 고정하고 스킬 마블 결과가 기존 2,3옵보다 높거나 낮을 확률을 계산합니다."
          : toolView === "majorSkillMarble"
            ? "메이저 스킬 하나가 다른 메이저 스킬로 바뀔 때 더 높거나 낮은 후보를 점수순으로 확인합니다."
          : "일반 스킬 변경권 기준으로 2, 3번 메이저 조합까지 필요한 횟수를 시뮬레이션합니다.";
  const pageClassName =
    toolView === "calculator"
      ? "calculator-page"
      : toolView === "simulator"
        ? "simulator-page"
        : toolView === "skillMarble"
          ? "skill-marble-page"
          : toolView === "majorSkillMarble"
            ? "major-skill-marble-page"
          : "impact-page";
  const scoreAtLeastPercentLabel = formatTopPercent(skillOdds?.scoreAtLeastProbability);
  const expectedRollsLabel =
    skillOdds?.expectedRollsForScoreAtLeast != null
      ? `${skillOdds.expectedRollsForScoreAtLeast.toLocaleString("ko-KR", {
          minimumFractionDigits: skillOdds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
          maximumFractionDigits: skillOdds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
        })}회`
      : "-";
  const resultInterpretation = getResultInterpretation({
    toolView,
    grade: judgeGrade,
    topPercentLabel: scoreAtLeastPercentLabel,
    activeCardType,
  });

  const simulatorSetupCard = (
    <>
      <div className="panel-head">
        <h2>고스변 시뮬 설정</h2>
      </div>

      <div className="input-config-card input-config-card-compact simulation-setup-card">
        <p className="simulation-setup-intro">
          먼저 조건을 고른 뒤 시뮬 화면으로 들어가요.
        </p>

        <div className="control-row">
          <div className="control-section">
            <label>계산 대상</label>
            <div className="toggle-row toggle-row-modes">
              <button
                type="button"
                className={`toggle-btn ${mode === "hitter" ? "active" : ""}`}
                onClick={() => onModeChange("hitter")}
              >
                타자              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "starter" ? "active" : ""}`}
                onClick={() => onModeChange("starter")}
              >
                선발
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "middle" ? "active" : ""}`}
                onClick={() => onModeChange("middle")}
              >
                중계
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "closer" ? "active" : ""}`}
                onClick={() => onModeChange("closer")}
              >
                마무리              </button>
            </div>
          </div>

          {mode === "hitter" && (
            <div className="control-section">
              <label>타자 구분</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${hitterPositionGroup === "fielder" ? "active" : ""}`}
                  onClick={() => onHitterPositionGroupChange("fielder")}
                >
                  야수
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${hitterPositionGroup === "catcher" ? "active" : ""}`}
                  onClick={() => onHitterPositionGroupChange("catcher")}
                >
                  포수
                </button>
              </div>
            </div>
          )}

          <div className="control-section">
            <label>카드 타입</label>
            <div className="toggle-row toggle-row-cards">
              {simulatorCardTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`toggle-btn ${visibleCardType === option.value ? "active" : ""}`}
                  onClick={() => onCardTypeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="control-section simulation-setup-action-section">
            <label aria-hidden="true">&nbsp;</label>
            <div className="simulation-setup-inline-action">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSimulatorSetupState({ toolView: "simulator", complete: true })}
              >
                시뮬 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const impactControlCard = (
    <>
      <div className="panel-head">
        <h2>임팩트 스킬 변경 설정</h2>
      </div>

      <div className="input-config-card input-config-card-compact simulation-setup-card">
        <p className="simulation-setup-intro">
          먼저 조건을 정한 뒤 고정 스킬을 선택해서 임팩트 변경 시뮬을 진행해요.
        </p>

        <div className="control-row">
          <div className="control-section">
            <label>계산 대상</label>
            <div className="toggle-row toggle-row-modes">
              <button
                type="button"
                className={`toggle-btn ${mode === "hitter" ? "active" : ""}`}
                onClick={() => onModeChange("hitter")}
              >
                타자              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "starter" ? "active" : ""}`}
                onClick={() => onModeChange("starter")}
              >
                선발
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "middle" ? "active" : ""}`}
                onClick={() => onModeChange("middle")}
              >
                중계
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "closer" ? "active" : ""}`}
                onClick={() => onModeChange("closer")}
              >
                마무리              </button>
            </div>
          </div>

          {mode === "hitter" && (
            <div className="control-section">
              <label>타자 구분</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${hitterPositionGroup === "fielder" ? "active" : ""}`}
                  onClick={() => onHitterPositionGroupChange("fielder")}
                >
                  야수
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${hitterPositionGroup === "catcher" ? "active" : ""}`}
                  onClick={() => onHitterPositionGroupChange("catcher")}
                >
                  포수
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );

  return (
    <div className={`main-stage tool-page ${pageClassName}`}>
      <KakaoAdFitPcTopTripleBanner enabled />
      <div className="page-toolbar tool-page-hero">
        <div className="page-title-block">
          <span className="page-kicker">{pageKicker}</span>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>

      <main
        className={`layout-grid ${
          toolView === "calculator"
            ? "calculator-layout"
            : toolView === "majorSkillMarble"
            ? "major-marble-layout"
            : "simulator-layout"
        }`}
      >
        <section
          className={
            toolView === "calculator"
              ? "calculator-shell"
              : toolView === "skillMarble" || toolView === "majorSkillMarble"
              ? "marble-stage-shell"
              : `panel panel-main ${toolView === "simulator" ? "simulator-stage-shell" : ""}`
          }
        >
          {toolView === "calculator" ? (
            <>
              <div className="input-config-card calculator-config-card">
                <div className="panel-head">
                  <h2>계산 조건</h2>
                </div>

                <div className="control-row">
                  <div className="control-section">
                    <label>계산 대상</label>
                    <div className="toggle-row toggle-row-modes">
                      <button
                        type="button"
                        className={`toggle-btn ${mode === "hitter" ? "active" : ""}`}
                        onClick={() => onModeChange("hitter")}
                      >
                        타자                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${mode === "starter" ? "active" : ""}`}
                        onClick={() => onModeChange("starter")}
                      >
                        선발
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${mode === "middle" ? "active" : ""}`}
                        onClick={() => onModeChange("middle")}
                      >
                        중계
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${mode === "closer" ? "active" : ""}`}
                        onClick={() => onModeChange("closer")}
                      >
                        마무리                      </button>
                    </div>
                  </div>

                  <div className="control-section">
                    <label>카드 타입</label>
                    <div className="toggle-row toggle-row-cards">
                      {cardTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`toggle-btn ${cardType === option.value ? "active" : ""}`}
                          onClick={() => onCardTypeChange(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="control-reset-row">
                  <button type="button" className="ghost-btn control-reset-btn" onClick={onReset}>
                    <span className="control-reset-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="ui-icon">
                        <path
                          d="M12 5a7 7 0 1 1-6.56 9.47 1 1 0 1 1 1.88-.68A5 5 0 1 0 12 7h-1.59l1.3 1.29a1 1 0 1 1-1.42 1.42L6.59 6l3.7-3.71a1 1 0 0 1 1.42 1.42L10.41 5H12Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    초기화                  </button>
                </div>
              </div>
              <KakaoAdFitMobileMidBanner enabled />

              {!gameData ? (
                <div className="panel panel-main">
                  <div className="empty-box">
                    {mode === "hitter"
                      ? "데이터를 불러오지 못했습니다."
                      : `${pitcherRole} 데이터는 아직 연결 준비 중입니다.`}
                  </div>
                </div>
              ) : (
                <CalculatorView
                  gameData={gameData}
                  activeCardType={activeCardType}
                  resultGradeColor={resultGradeColor}
                  judgeGrade={judgeGrade}
                  totalScore={totalScore}
                  impactTotalScoreWithFirst={impactTotalScoreWithFirst}
                  selectedSkillMeta={selectedSkillMeta}
                  rolledSkillColors={rolledSkillColors}
                  skillScores={skillScores}
                  filteredSkills={filteredSkills}
                  resolvedSkill1={resolvedSkill1}
                  resolvedSkill2={resolvedSkill2}
                  resolvedSkill3={resolvedSkill3}
                  level1={level1}
                  level2={level2}
                  level3={level3}
                  setSkill1={setSkill1}
                  setSkill2={setSkill2}
                  setSkill3={setSkill3}
                  setLevel1={setLevel1}
                  setLevel2={setLevel2}
                  setLevel3={setLevel3}
                  getSkillScoreLabel={getSkillScoreLabel}
                />
              )}
            </>
          ) : (
            <>
              {toolView === "simulator" ? (
                <div className="simulator-content-shell">
                  {!simulatorSetupComplete ? (
                    <>
                      {simulatorSetupCard}
                      <KakaoAdFitMobileMidBanner enabled />
                    </>
                  ) : null}
                </div>
              ) : toolView === "impactChange" ? (
                <div className="simulator-content-shell">
                  {impactControlCard}
                  <KakaoAdFitMobileMidBanner enabled />
                </div>
              ) : null}

              {!gameData ? (
                <div className="empty-box">
                  {mode === "hitter"
                    ? "데이터를 불러오지 못했습니다."
                    : `${pitcherRole} 데이터는 아직 연결 준비 중입니다.`}
                </div>
              ) : toolView === "simulator" ? (
                simulatorSetupComplete ? (
                  <div className="simulator-content-shell">
                    <AdvancedSimulatorView
                      modeLabel={modeLabel}
                      cardTypeLabel={cardTypeLabel}
                      hitterPositionLabel={hitterPositionLabel}
                      activeCardType={activeCardType}
                      resultGradeColor={resultGradeColor}
                      judgeGrade={judgeGrade}
                      totalScore={totalScore}
                      selectedSkillMeta={selectedSkillMeta}
                      skillScores={skillScores}
                      filteredSkills={advancedSimulatorSkills}
                      resolvedSkill1={resolvedSkill1}
                      resolvedSkill2={resolvedSkill2}
                      resolvedSkill3={resolvedSkill3}
                      level1={level1}
                      level2={level2}
                      level3={level3}
                      simRollCount={simRollCount}
                      simAutoRollOccurrenceCount={simAutoRollOccurrenceCount}
                      targetGrade={targetGrade}
                      targetGradeOptions={targetGradeOptions}
                      setTargetGrade={setTargetGrade}
                      setSkill1={setSkill1}
                      setLevel1={setLevel1}
                      setLevel2={setLevel2}
                      setLevel3={setLevel3}
                      onBackToSetup={() => setSimulatorSetupState({ toolView: "simulator", complete: false })}
                      onRollOnce={onRollOnce}
                      onAutoRoll={onAutoRoll}
                      getSkillScoreLabel={getSkillScoreLabel}
                    />
                  </div>
                ) : null
              ) : toolView === "skillMarble" ? (
                <SkillMarbleCalculatorView
                  mode={mode}
                  hitterPositionGroup={hitterPositionGroup}
                  hitterBattingSide={hitterBattingSide}
                  starterHand={starterHand}
                  pitcherStaminaRange={pitcherStaminaRange}
                  gameData={gameData}
                  selectedSkillMeta={selectedSkillMeta}
                  filteredSkills={filteredSkills}
                  resolvedSkill1={resolvedSkill1}
                  resolvedSkill2={resolvedSkill2}
                  resolvedSkill3={resolvedSkill3}
                  level2={level2}
                  level3={level3}
                  marbleMode={skillMarbleMode}
                  setSkill1={setSkill1}
                  setSkill2={setSkill2}
                  setSkill3={setSkill3}
                  setLevel2={setLevel2}
                  setLevel3={setLevel3}
                  onModeChange={onModeChange}
                  onHitterBattingSideChange={onHitterBattingSideChange}
                  onStarterHandChange={onStarterHandChange}
                  onPitcherStaminaRangeChange={onPitcherStaminaRangeChange}
                  onMarbleModeChange={onSkillMarbleModeChange}
                />
              ) : toolView === "majorSkillMarble" ? (
                <MajorSkillMarbleCalculatorView
                  mode={mode}
                  cardType={visibleCardType}
                  cardTypeOptions={majorMarbleCardTypeOptions}
                  hitterPositionGroup={hitterPositionGroup}
                  hitterBattingSide={hitterBattingSide}
                  starterHand={starterHand}
                  pitcherStaminaRange={pitcherStaminaRange}
                  gameData={gameData}
                  filteredSkills={filteredSkills}
                  selectedSkillMeta={selectedSkillMeta}
                  resolvedSkill1={resolvedSkill1}
                  resolvedSkill2={resolvedSkill2}
                  resolvedSkill3={resolvedSkill3}
                  level1={level1}
                  level2={level2}
                  level3={level3}
                  setSkill1={setSkill1}
                  setSkill2={setSkill2}
                  setSkill3={setSkill3}
                  setLevel1={setLevel1}
                  setLevel2={setLevel2}
                  setLevel3={setLevel3}
                  onModeChange={onModeChange}
                  onHitterBattingSideChange={onHitterBattingSideChange}
                  onStarterHandChange={onStarterHandChange}
                  onPitcherStaminaRangeChange={onPitcherStaminaRangeChange}
                  onCardTypeChange={onCardTypeChange}
                />
              ) : (
                <ImpactSimulatorView
                  resultGradeColor={resultGradeColor}
                  judgeGrade={judgeGrade}
                  totalScore={totalScore}
                  selectedSkillMeta={selectedSkillMeta}
                  skillScores={skillScores}
                  filteredSkills={filteredSkills}
                  resolvedSkill1={resolvedSkill1}
                  resolvedSkill2={resolvedSkill2}
                  resolvedSkill3={resolvedSkill3}
                  impactSessionRollCount={impactSessionRollCount}
                  impactLastSuccessRollCount={impactLastSuccessRollCount}
                  impactLastMessage={impactLastMessage}
                  level2={level2}
                  level3={level3}
                  setSkill1={setSkill1}
                  setLevel2={setLevel2}
                  setLevel3={setLevel3}
                  resetImpactChangeSession={resetImpactChangeSession}
                  onImpactRoll={onImpactRoll}
                  getSkillScoreLabel={getSkillScoreLabel}
                />
              )}
            </>
          )}

        </section>

        {toolView !== "majorSkillMarble" && (
          <aside className="panel panel-result" style={{ borderColor: resultGradeColor }}>
          <div className="panel-head">
            <h2>결과</h2>
          </div>

          <div className="result-hero-card" style={{ borderColor: resultGradeColor }}>
            <div className="result-hero-eyebrow">
              {toolView === "skillMarble"
                ? "기존 2,3번 점수"
                : toolView === "calculator" && activeCardType === "impact"
                ? "총 스킬 점수 · 1옵 포함"
                : "총 스킬 점수"}
            </div>
            <div className="result-hero-score">
              {gameData
                ? toolView === "calculator" && activeCardType === "impact"
                  ? impactTotalScoreWithFirst
                  : totalScore
                : "-"}
            </div>
            {/* <div className="result-hero-meta">
              <div className="result-hero-pill">
                <span>등급</span>
                <strong style={{ color: resultGradeColor }}>{judgeGrade}</strong>
              </div>
            </div> */}
          </div>

          {toolView === "calculator" && activeCardType === "impact" && (
            <div className="result-stat">
              <span>1옵 제외 점수</span>
              <strong>{gameData ? totalScore : "-"}</strong>
            </div>
          )}

          <div className="result-stat">
            <span>{toolView === "calculator" && activeCardType === "impact" ? "등급 · 1옵 제외" : "등급"}</span>
            <strong style={{ color: resultGradeColor }}>{judgeGrade}</strong>
          </div>

          <div className="result-odds-card">
            <div className="result-odds-head">
              <span>확률</span>

            </div>
            <div className="result-odds-grid">
              <div>
                <span>상위 확률</span>
                <strong>{scoreAtLeastPercentLabel}</strong>
              </div>
              <div>
                <span>기대 횟수</span>
                <strong>{expectedRollsLabel}</strong>
              </div>
            </div>
            <p>
              {toolView === "calculator" && activeCardType === "impact"
                ? "상위 확률과 기대 횟수는 1옵 제외 점수 기준입니다."
              : "상위 확률은 카드 타입별 기본 레벨 분포에서 같은 점수 이상이 나올 확률입니다."}
            </p>
          </div>

          <div className="result-grade-guide">
            <div className="result-grade-guide-title">등급 기준</div>
            <div className="result-grade-guide-list">
              {resultGradeGuide.map((item) => (
                <div key={item.grade} className="result-grade-guide-item">
                  <strong style={{ color: RESULT_GRADE_COLORS[item.grade] }}>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>
          </div>

          {toolView === "calculator" && resultInterpretation && (
            <div className="result-context-flow" aria-label="점수 해석과 다음 행동">
              <section className="result-context-card result-interpret-card">
                <span className="result-context-kicker">점수 해석</span>
                <h3>{resultInterpretation.title}</h3>
                <p>{resultInterpretation.body}</p>
              </section>

              <section className="result-context-card">
                <span className="result-context-kicker">다음에 확인할 것</span>
                <div className="result-action-list">
                  <div>
                    <strong>고스변 시뮬로 목표까지 보기</strong>
                    <span>현재 등급보다 한 단계 위를 노릴 때 필요한 기대 횟수를 비교합니다.</span>
                  </div>
                  <div>
                    <strong>비슷한 점수대 기준표 보기</strong>
                    <span>같은 카드 타입에서 이 점수가 어느 정도 희귀한지 확인합니다.</span>
                  </div>
                </div>
              </section>

              <section className="result-context-card">
                <span className="result-context-kicker">자주 하는 실수</span>
                <ul className="result-check-list">
                  <li>카드 타입을 실제 카드와 다르게 설정</li>
                  <li>임팩트 카드에서 1옵 포함/제외 점수를 혼동</li>
                  <li>총점만 보고 상위 확률과 기대 횟수를 보지 않음</li>
                </ul>
              </section>

              <section className="result-context-card">
                <span className="result-context-kicker">관련 도구</span>
                <div className="result-related-tools">
                  <span>고스변 점수 비교</span>
                  <span>라인업 스킬 인식</span>
                  <span>훈련 재분배 확률</span>
                </div>
              </section>
            </div>
          )}

          {toolView === "simulator" && (
            <p className="tool-note">
              설정 화면에서 조건을 정한 뒤 시뮬 화면으로 들어가면 고스변 결과를 바로 확인할 수 있습니다.
            </p>
          )}

          {toolView === "impactChange" && (
            <p className="tool-note">
              일반 스킬 변경 확률을 기준으로 임팩트 카드의 2, 3번 슬롯이 모두 메이저가 나올 때까지 자동으로 굴립니다.
            </p>
          )}

          {toolView === "skillMarble" && (
            <p className="tool-note">
              1번 스킬을 고정하고 1메 확정 또는 2메 확정 결과를 기존 점수와 비교합니다.
            </p>
          )}

          {toolView === "calculator" && activeCardType === "impact" && (
            <p className="impact-note">임팩트 계산기는 1옵 포함 점수와 1옵 제외 점수를 함께 표시합니다.</p>
          )}

          {toolView === "impactChange" && (
            <p className="impact-note">임팩트 변경 시뮬은 1번 스킬 고정 + 2, 3번 스킬만 계산합니다.</p>
          )}

          {toolView === "skillMarble" && (
            <p className="impact-note">현재 버전은 임팩트 카드 전용입니다.</p>
          )}
          </aside>
        )}
      </main>

      {guideContent}
    </div>
  );
}







