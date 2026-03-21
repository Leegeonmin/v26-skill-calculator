import type { Dispatch, SetStateAction } from "react";
import CalculatorView from "./CalculatorView";
import AdvancedSimulatorView from "./AdvancedSimulatorView";
import ImpactSimulatorView from "./ImpactSimulatorView";
import { IconGlyph } from "../components/AppChrome";
import type { GameDataSet } from "../data/gameData";
import { RESULT_GRADE_COLORS } from "../data/uiColors";
import type { ResultGrade } from "../utils/judge";
import type { CalculatorMode, CardType, HitterPositionGroup, SkillLevel, SkillMeta, ToolView } from "../types";

type ToolboxStageProps = {
  toolView: Exclude<ToolView, "ranking">;
  mode: CalculatorMode;
  hitterPositionGroup: HitterPositionGroup;
  cardType: CardType;
  activeCardType: CardType;
  gameData: GameDataSet | null;
  pitcherRole: string;
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
  matchedPercentLabel: string;
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
  simBestScore: number | null;
  simLastMessage: string;
  targetGrade: ResultGrade;
  targetGradeOptions: Array<{ value: ResultGrade; label: string }>;
  impactSessionRollCount: number;
  impactLastSuccessRollCount: number | null;
  impactLastMessage: string;
  encouragementMessage: string | null;
  summaryMessage: string;
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
  onToolViewChange: (nextView: Exclude<ToolView, "ranking">) => void;
  onRollOnce: () => void;
  onAutoRoll: () => void;
  onImpactRoll: () => void;
  resetImpactChangeSession: () => void;
};

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
  matchedPercentLabel,
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
  simBestScore,
  simLastMessage,
  targetGrade,
  targetGradeOptions,
  impactSessionRollCount,
  impactLastSuccessRollCount,
  impactLastMessage,
  encouragementMessage,
  summaryMessage,
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
  onToolViewChange,
  onRollOnce,
  onAutoRoll,
  onImpactRoll,
  resetImpactChangeSession,
}: ToolboxStageProps) {
  return (
    <div className="main-stage">
      <div className="tool-tabs-bar">
        <div className="tool-tabs" role="tablist" aria-label="도구 선택">
          <button
            type="button"
            className={`tool-tab ${toolView === "calculator" ? "active" : ""}`}
            onClick={() => onToolViewChange("calculator")}
          >
            <IconGlyph name="calculator" className="ui-icon" />
            <span>스킬점수 계산기</span>
          </button>
          <button
            type="button"
            className={`tool-tab ${toolView === "simulator" ? "active" : ""}`}
            onClick={() => onToolViewChange("simulator")}
          >
            <IconGlyph name="sparkles" className="ui-icon" />
            <span>고스변 시뮬</span>
          </button>
          <button
            type="button"
            className={`tool-tab ${toolView === "impactChange" ? "active" : ""}`}
            onClick={() => onToolViewChange("impactChange")}
          >
            <IconGlyph name="flame" className="ui-icon" />
            <span>임팩트 스변 시뮬</span>
          </button>
        </div>
      </div>

      <main className="layout-grid">
        <section className={toolView === "calculator" ? "calculator-shell" : "panel panel-main"}>
          {toolView === "calculator" ? (
            <>
              <div className="input-config-card">
                <div className="panel-head">
                  <h2>입력</h2>
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
                        타자
                      </button>
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
                        마무리
                      </button>
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
                    초기화
                  </button>
                </div>
              </div>

              {!gameData ? (
                <div className="panel panel-main">
                  <div className="empty-box">
                    {mode === "hitter"
                      ? "데이터를 불러오지 못했습니다."
                      : `${pitcherRole} 데이터는 아직 연결 전입니다.`}
                  </div>
                </div>
              ) : (
                <CalculatorView
                  gameData={gameData}
                  activeCardType={activeCardType}
                  resultGradeColor={resultGradeColor}
                  judgeGrade={judgeGrade}
                  totalScore={Number(totalScore)}
                  matchedPercentLabel={matchedPercentLabel}
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
              <div className="panel-head">
                <h2>{toolView === "simulator" ? "시뮬 설정" : "임팩트 스변 설정"}</h2>
              </div>

              <div className="input-config-card input-config-card-compact">
                <div className="control-row">
                  <div className="control-section">
                    <label>계산 대상</label>
                    <div className="toggle-row toggle-row-modes">
                      <button
                        type="button"
                        className={`toggle-btn ${mode === "hitter" ? "active" : ""}`}
                        onClick={() => onModeChange("hitter")}
                      >
                        타자
                      </button>
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
                        마무리
                      </button>
                    </div>
                  </div>

                  {mode === "hitter" && (
                    <div className="control-section">
                      <label>타자 포지션</label>
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

                  {toolView !== "impactChange" ? (
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
                  ) : (
                    <div className="control-section">
                      <label>카드 타입</label>
                      <div className="impact-card-lock">
                        <span className="impact-card-pill">임팩트 고정</span>
                      </div>
                    </div>
                  )}
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
                    초기화
                  </button>
                </div>
              </div>

              {!gameData ? (
                <div className="empty-box">
                  {mode === "hitter"
                    ? "데이터를 불러오지 못했습니다."
                    : `${pitcherRole} 데이터는 아직 연결 전입니다.`}
                </div>
              ) : toolView === "simulator" ? (
                <AdvancedSimulatorView
                  activeCardType={activeCardType}
                  resultGradeColor={resultGradeColor}
                  judgeGrade={judgeGrade}
                  totalScore={totalScore}
                  matchedPercentLabel={matchedPercentLabel}
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
                  simRollCount={simRollCount}
                  simBestScore={simBestScore}
                  simLastMessage={simLastMessage}
                  targetGrade={targetGrade}
                  targetGradeOptions={targetGradeOptions}
                  setTargetGrade={setTargetGrade}
                  setSkill1={setSkill1}
                  setLevel1={setLevel1}
                  setLevel2={setLevel2}
                  setLevel3={setLevel3}
                  onRollOnce={onRollOnce}
                  onAutoRoll={onAutoRoll}
                  getSkillScoreLabel={getSkillScoreLabel}
                />
              ) : (
                <ImpactSimulatorView
                  resultGradeColor={resultGradeColor}
                  judgeGrade={judgeGrade}
                  totalScore={totalScore}
                  matchedPercentLabel={matchedPercentLabel}
                  selectedSkillMeta={selectedSkillMeta}
                  rolledSkillColors={rolledSkillColors}
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

          <div className="result-stat">
            <span>총 스킬 점수</span>
            <strong>{gameData ? totalScore : "-"}</strong>
          </div>

          <div className="result-stat">
            <span>판정 등급</span>
            <strong style={{ color: resultGradeColor }}>{judgeGrade}</strong>
          </div>

          <div className="result-stat">
            <span>기준 확률</span>
            <strong>{matchedPercentLabel}</strong>
          </div>

          <p className="result-summary">{summaryMessage}</p>

          {encouragementMessage && <div className="result-badge">{encouragementMessage}</div>}

          <div className="result-grade-guide">
            <div className="result-grade-guide-title">판정등급 기준</div>
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
            <p className="tool-note">현재 버전은 앱에 등록된 스킬 데이터를 기준으로 1회 롤을 재현합니다.</p>
          )}

          {toolView === "impactChange" && (
            <p className="tool-note">
              일반 스킬변경권 확률표 기준으로 임팩트 카드의 2, 3번 슬롯을 메이저 2개가 나올 때까지 자동으로 돌립니다.
            </p>
          )}

          {activeCardType === "impact" && (
            <p className="impact-note">임팩트 카드는 1스킬 고정 + 2, 3스킬만 합산합니다.</p>
          )}
        </aside>
      </main>
    </div>
  );
}
