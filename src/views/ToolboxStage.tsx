import { useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import CalculatorView from "./CalculatorView";
import AdvancedSimulatorView from "./AdvancedSimulatorView";
import ImpactSimulatorView from "./ImpactSimulatorView";
import type { GameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import type { ResultGrade } from "../utils/judge";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  SkillLevel,
  SkillMeta,
  ToolView,
} from "../types";
import type { SkillOddsResult } from "../utils/advancedSkillOdds";

type ToolboxStageProps = {
  toolView: Exclude<ToolView, "home" | "ranking" | "notice">;
  mode: CalculatorMode;
  hitterPositionGroup: HitterPositionGroup;
  cardType: CardType;
  activeCardType: CardType;
  gameData: GameDataSet | null;
  pitcherRole: string;
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
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
  onCardTypeChange: (nextCardType: CardType) => void;
  onReset: () => void;
  onGoHome: () => void;
  themeAction?: ReactNode;
  onRollOnce: () => void;
  onAutoRoll: () => void;
  onImpactRoll: () => void;
  resetImpactChangeSession: () => void;
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

export default function ToolboxStage({
  toolView,
  mode,
  hitterPositionGroup,
  cardType,
  activeCardType,
  gameData,
  pitcherRole,
  resultGradeColor,
  judgeGrade,
  totalScore,
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
  onCardTypeChange,
  onReset,
  onGoHome,
  themeAction,
  onRollOnce,
  onAutoRoll,
  onImpactRoll,
  resetImpactChangeSession,
}: ToolboxStageProps) {
  const [simulatorSetupState, setSimulatorSetupState] = useState({
    toolView,
    complete: false,
  });
  const simulatorSetupComplete =
    toolView === "simulator" &&
    simulatorSetupState.toolView === "simulator" &&
    simulatorSetupState.complete;

  const modeLabel = getModeLabel(mode);
  const hitterPositionLabel =
    mode === "hitter" ? (hitterPositionGroup === "fielder" ? "야수" : "포수") : null;
  const cardTypeLabel =
    cardTypeOptions.find((option) => option.value === cardType)?.label ?? cardType;
  const pageTitle =
    toolView === "calculator"
      ? "스킬 점수 계산기"
      : toolView === "simulator"
        ? "고스변 시뮬"
        : "임팩트 변경 시뮬";
  const pageKicker =
    toolView === "calculator"
      ? "Skill Score"
      : toolView === "simulator"
        ? "Advanced Roll"
        : "Impact Roll";
  const pageDescription =
    toolView === "calculator"
      ? "카드 타입과 포지션을 고른 뒤 세 개의 스킬 점수를 빠르게 계산합니다."
      : toolView === "simulator"
        ? "인게임 고급스킬변경권처럼 굴리고, 원하는 등급까지 자동 롤을 실행합니다."
        : "일반 스킬 변경권 기준으로 2, 3번 메이저 조합까지 필요한 횟수를 시뮬레이션합니다.";
  const pageClassName =
    toolView === "calculator"
      ? "calculator-page"
      : toolView === "simulator"
        ? "simulator-page"
        : "impact-page";
  const scoreAtLeastPercentLabel = skillOdds
    ? `${(skillOdds.scoreAtLeastProbability * 100).toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })}%`
    : "-";
  const expectedRollsLabel =
    skillOdds?.expectedRollsForScoreAtLeast != null
      ? `${skillOdds.expectedRollsForScoreAtLeast.toLocaleString("ko-KR", {
          minimumFractionDigits: skillOdds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
          maximumFractionDigits: skillOdds.expectedRollsForScoreAtLeast < 10 ? 1 : 0,
        })}회`
      : "-";

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

      <main className={`layout-grid ${toolView === "calculator" ? "calculator-layout" : "simulator-layout"}`}>
        <section
          className={
            toolView === "calculator"
              ? "calculator-shell"
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
                  {!simulatorSetupComplete ? simulatorSetupCard : null}
                </div>
              ) : toolView === "impactChange" ? (
                <div className="simulator-content-shell">{impactControlCard}</div>
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
                      filteredSkills={filteredSkills}
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

        <aside className="panel panel-result" style={{ borderColor: resultGradeColor }}>
          <div className="panel-head">
            <h2>결과</h2>
          </div>

          <div className="result-hero-card" style={{ borderColor: resultGradeColor }}>
            <div className="result-hero-eyebrow">총 스킬 점수</div>
            <div className="result-hero-score">{gameData ? totalScore : "-"}</div>
            {/* <div className="result-hero-meta">
              <div className="result-hero-pill">
                <span>등급</span>
                <strong style={{ color: resultGradeColor }}>{judgeGrade}</strong>
              </div>
            </div> */}
          </div>

          <div className="result-stat">
            <span>등급</span>
            <strong style={{ color: resultGradeColor }}>{judgeGrade}</strong>
          </div>

          <div className="result-odds-card">
            <div className="result-odds-head">
              <span>확률</span>
              <strong>현재 점수 이상</strong>
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

          {activeCardType === "impact" && (
            <p className="impact-note">임팩트 카드는 1번 스킬 고정 + 2, 3번 스킬만 계산합니다.</p>
          )}
        </aside>
      </main>
    </div>
  );
}







