import { useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import PlayerTypeToggle from "./components/PlayerTypeToggle";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS, SKILL_GRADE_COLORS } from "./data/uiColors";
import CalculatorView from "./views/CalculatorView";
import AdvancedSimulatorView from "./views/AdvancedSimulatorView";
import ImpactSimulatorView from "./views/ImpactSimulatorView";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  PitcherRole,
  PlayerType,
  SkillLevel,
  ToolView,
} from "./types";
import { calculateSkillTotal } from "./utils/calculate";
import { judgeSkillResult, type ResultGrade } from "./utils/judge";
import { simulateAdvancedSkillChange } from "./utils/simulateAdvancedSkillChange";
import { simulateImpactSkillChangeUntilDoubleMajor } from "./utils/simulateImpactSkillChange";

const DEFAULT_MODE: CalculatorMode = "hitter";
const DEFAULT_VIEW: ToolView = "calculator";
const DEFAULT_HITTER_POSITION_GROUP: HitterPositionGroup = "fielder";
const DEFAULT_CARD_TYPE: CardType = "signature";
const DEFAULT_SKILL_1 = "hitter_precision_hit";
const DEFAULT_SKILL_2 = "hitter_big_game_hunter";
const DEFAULT_SKILL_3 = "hitter_batting_machine";
const DEFAULT_LEVEL_1: SkillLevel = 6;
const DEFAULT_LEVEL_2: SkillLevel = 5;
const DEFAULT_LEVEL_3: SkillLevel = 5;
const AUTO_ROLL_LIMIT = 5000;
const IMPACT_CHANGE_LIMIT = 100000;

const TOOL_VIEW_LABELS: Record<ToolView, string> = {
  calculator: "스킬점수 계산기",
  simulator: "고스변 시뮬",
  impactChange: "임팩트 스변 시뮬",
};

const TARGET_GRADE_OPTIONS: Array<{ value: ResultGrade; label: string }> = [
  { value: "C", label: "C 이상" },
  { value: "A", label: "A 이상" },
  { value: "S", label: "S 이상" },
  { value: "SSR+", label: "SSR+ 이상" },
];

const GRADE_RANK: Record<ResultGrade, number> = {
  F: 0,
  C: 1,
  A: 2,
  S: 3,
  "SSR+": 4,
};

const RESULT_GRADE_GUIDE: Array<{ grade: ResultGrade; title: string; description: string }> = [
  { grade: "F", title: "F", description: "기준표 최저점 미만이거나 흔한 구간" },
  { grade: "C", title: "C", description: "무난하게는 쓸 수 있는 구간" },
  { grade: "A", title: "A", description: "실사용 가능한 상급 조합" },
  { grade: "S", title: "S", description: "준종결권으로 볼 만한 고점 조합" },
  { grade: "SSR+", title: "SSR+", description: "사실상 종결권으로 보는 최상위 구간" },
];

const CARD_TYPE_OPTIONS = (Object.entries(CARD_TYPE_LABELS) as Array<[CardType, string]>).map(
  ([value, label]) => ({
    value,
    label,
  })
);

function getDefaultLevels(cardType: CardType): [SkillLevel, SkillLevel, SkillLevel] {
  if (cardType === "goldenGlove") {
    return [6, 6, 6];
  }

  return [DEFAULT_LEVEL_1, DEFAULT_LEVEL_2, DEFAULT_LEVEL_3];
}

function pickValidSkill(
  desired: string,
  candidates: string[],
  excluded: string[] = []
): string {
  if (desired && candidates.includes(desired) && !excluded.includes(desired)) {
    return desired;
  }

  const fallback = candidates.find((id) => !excluded.includes(id));
  return fallback ?? "";
}

function formatMatchedPercent(percent: number | null): string {
  if (percent === null) return "기준표 최저점 미만";
  if (percent <= 0) return "0% 미만";
  if (percent < 0.01) return "< 0.01%";
  return `${percent}%`;
}

function getSkillScoreLabel(score: number | undefined): string {
  if (score === undefined) return "점수 -";
  return `점수 ${score}`;
}

function getEncouragementMessage(percent: number | null): string | null {
  if (percent === null) return null;
  if (percent <= 0.01) return "사기꾼";
  return null;
}

function getResultSummaryMessage(percent: number | null): string {
  if (percent === null) {
    return "애매하다. 조금 더 돌려보는 걸 추천";
  }

  if (percent <= 0.5) {
    return "극극종결. 사장님 아니면 안돌려도됨";
  }

  if (percent <= 1.5) {
    return "매우 잘 뜬 편. 웬만하면 만족하고 써도 됨";
  }

  if (percent <= 7) {
    return "실사용 가능";
  }

  if (percent <= 12) {
    return "쓰다가 여유 생기면 돌리길 추천";
  }

  return "흔한 편. 임시로 쓰고 갈아타는 쪽 추천";
}

function App() {
  const [toolView, setToolView] = useState<ToolView>(DEFAULT_VIEW);
  const [mode, setMode] = useState<CalculatorMode>(DEFAULT_MODE);
  const [hitterPositionGroup, setHitterPositionGroup] =
    useState<HitterPositionGroup>(DEFAULT_HITTER_POSITION_GROUP);

  const [cardType, setCardType] = useState<CardType>(DEFAULT_CARD_TYPE);
  const [skill1, setSkill1] = useState(DEFAULT_SKILL_1);
  const [skill2, setSkill2] = useState(DEFAULT_SKILL_2);
  const [skill3, setSkill3] = useState(DEFAULT_SKILL_3);

  const [level1, setLevel1] = useState<SkillLevel>(DEFAULT_LEVEL_1);
  const [level2, setLevel2] = useState<SkillLevel>(DEFAULT_LEVEL_2);
  const [level3, setLevel3] = useState<SkillLevel>(DEFAULT_LEVEL_3);

  const [simRollCount, setSimRollCount] = useState(0);
  const [simBestScore, setSimBestScore] = useState<number | null>(null);
  const [simLastMessage, setSimLastMessage] = useState(
    "버튼을 누르면 1회 사용 결과가 바로 나옵니다."
  );
  const [targetGrade, setTargetGrade] = useState<ResultGrade>("S");
  const [impactSessionRollCount, setImpactSessionRollCount] = useState(0);
  const [impactLastSuccessRollCount, setImpactLastSuccessRollCount] = useState<number | null>(null);
  const [impactLastMessage, setImpactLastMessage] = useState(
    "버튼을 누르면 2, 3번 스킬이 둘 다 메이저가 나올 때까지 자동으로 돌립니다."
  );

  const playerType: PlayerType = mode === "hitter" ? "hitter" : "pitcher";
  const pitcherRole: PitcherRole = mode === "hitter" ? "starter" : mode;
  const activeCardType: CardType = toolView === "impactChange" ? "impact" : cardType;

  const gameData = useMemo(
    () => getGameDataSet({ playerType, pitcherRole }),
    [playerType, pitcherRole]
  );

  const filteredSkills = useMemo(() => {
    if (!gameData) return [];
    return gameData.skills.filter((skill) => skill.availableCardTypes.includes(activeCardType));
  }, [gameData, activeCardType]);

  const filteredSkillIds = useMemo(
    () => filteredSkills.map((skill) => skill.id),
    [filteredSkills]
  );

  const resolvedSkill1 = pickValidSkill(skill1, filteredSkillIds);
  const resolvedSkill2 = pickValidSkill(skill2, filteredSkillIds, [resolvedSkill1]);
  const resolvedSkill3 = pickValidSkill(skill3, filteredSkillIds, [resolvedSkill1, resolvedSkill2]);

  const selectedSkillMeta = useMemo(() => {
    const skillMap = new Map(filteredSkills.map((skill) => [skill.id, skill]));

    return {
      skill1: skillMap.get(resolvedSkill1),
      skill2: skillMap.get(resolvedSkill2),
      skill3: skillMap.get(resolvedSkill3),
    };
  }, [filteredSkills, resolvedSkill1, resolvedSkill2, resolvedSkill3]);

  const rolledSkillColors = {
    skill1: selectedSkillMeta.skill1 ? SKILL_GRADE_COLORS[selectedSkillMeta.skill1.grade] : "#111827",
    skill2: selectedSkillMeta.skill2 ? SKILL_GRADE_COLORS[selectedSkillMeta.skill2.grade] : "#111827",
    skill3: selectedSkillMeta.skill3 ? SKILL_GRADE_COLORS[selectedSkillMeta.skill3.grade] : "#111827",
  };

  const skillScores = {
    skill1: gameData?.scoreTable[resolvedSkill1]?.[level1],
    skill2: gameData?.scoreTable[resolvedSkill2]?.[level2],
    skill3: gameData?.scoreTable[resolvedSkill3]?.[level3],
  };

  const totalScore = gameData
    ? calculateSkillTotal({
        cardType: activeCardType,
        skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
        skillLevels: [level1, level2, level3],
        scoreTable: gameData.scoreTable,
      })
    : 0;

  const judgeResult = gameData
    ? judgeSkillResult(gameData.thresholds, activeCardType, totalScore)
    : null;

  const resultGradeColor = judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#b7bfd2";
  const encouragementMessage = getEncouragementMessage(judgeResult?.matchedPercent ?? null);
  const summaryMessage = getResultSummaryMessage(judgeResult?.matchedPercent ?? null);

  const resetSimulationSession = () => {
    setSimRollCount(0);
    setSimBestScore(null);
    setSimLastMessage("버튼을 누르면 1회 사용 결과가 바로 나옵니다.");
  };

  const resetImpactChangeSession = () => {
    setImpactSessionRollCount(0);
    setImpactLastSuccessRollCount(null);
    setImpactLastMessage("버튼을 누르면 2, 3번 스킬이 둘 다 메이저가 나올 때까지 자동으로 돌립니다.");
  };

  const handleReset = () => {
    if (!gameData) return;

    const resetCardType = toolView === "impactChange" ? "impact" : DEFAULT_CARD_TYPE;

    if (toolView !== "impactChange") {
      setCardType(DEFAULT_CARD_TYPE);
    }

    const [defaultLevel1, defaultLevel2, defaultLevel3] = getDefaultLevels(resetCardType);

    const resetSkills = gameData.skills
      .filter((skill) => skill.availableCardTypes.includes(resetCardType))
      .map((skill) => skill.id);

    setSkill1(resetSkills[0] ?? "");
    setSkill2(resetSkills[1] ?? resetSkills[0] ?? "");
    setSkill3(resetSkills[2] ?? resetSkills[0] ?? "");

    setLevel1(defaultLevel1);
    setLevel2(defaultLevel2);
    setLevel3(defaultLevel3);
    resetSimulationSession();
    resetImpactChangeSession();
  };

  const handleAdvancedSkillChangeRoll = () => {
    if (!gameData) return;

    const nextRoll = simulateAdvancedSkillChange({
      mode,
      cardType: activeCardType,
      skills: gameData.skills,
      hitterPositionGroup,
      fixedSkillId: activeCardType === "impact" ? resolvedSkill1 : undefined,
    });

    const [nextSkill1, nextSkill2, nextSkill3] = nextRoll.skillIds;

    setSkill1(nextSkill1);
    setSkill2(nextSkill2);
    setSkill3(nextSkill3);

    const nextTotalScore = calculateSkillTotal({
      cardType: activeCardType,
      skillIds: [nextSkill1, nextSkill2, nextSkill3],
      skillLevels: [level1, level2, level3],
      scoreTable: gameData.scoreTable,
    });

    setSimRollCount((count) => count + 1);
    setSimBestScore((bestScore) =>
      bestScore === null ? nextTotalScore : Math.max(bestScore, nextTotalScore)
    );
    setSimLastMessage(`${simRollCount + 1}회차 결과 반영 완료`);
  };

  const handleAutoRollToTarget = () => {
    if (!gameData) return;

    let tryCount = 0;
    let bestScoreInRun = simBestScore;
    let finalSkillIds: [string, string, string] = [resolvedSkill1, resolvedSkill2, resolvedSkill3];
    let finalJudgeResult = judgeResult;

    while (tryCount < AUTO_ROLL_LIMIT) {
      const nextRoll = simulateAdvancedSkillChange({
        mode,
        cardType: activeCardType,
        skills: gameData.skills,
        hitterPositionGroup,
        fixedSkillId: activeCardType === "impact" ? resolvedSkill1 : undefined,
      });

      const nextTotalScore = calculateSkillTotal({
        cardType: activeCardType,
        skillIds: nextRoll.skillIds,
        skillLevels: [level1, level2, level3],
        scoreTable: gameData.scoreTable,
      });

      const nextJudgeResult = judgeSkillResult(gameData.thresholds, activeCardType, nextTotalScore);

      tryCount += 1;
      finalSkillIds = nextRoll.skillIds;
      finalJudgeResult = nextJudgeResult;
      bestScoreInRun =
        bestScoreInRun === null ? nextTotalScore : Math.max(bestScoreInRun, nextTotalScore);

      if (GRADE_RANK[nextJudgeResult.grade] >= GRADE_RANK[targetGrade]) {
        break;
      }
    }

    setSkill1(finalSkillIds[0]);
    setSkill2(finalSkillIds[1]);
    setSkill3(finalSkillIds[2]);
    setSimRollCount((count) => count + tryCount);
    setSimBestScore(bestScoreInRun);

    if (finalJudgeResult && GRADE_RANK[finalJudgeResult.grade] >= GRADE_RANK[targetGrade]) {
      setSimLastMessage(`${tryCount}번 만에 ${targetGrade} 이상 달성`);
      return;
    }

    setSimLastMessage(`${AUTO_ROLL_LIMIT}번 안에 ${targetGrade} 이상이 나오지 않았음`);
  };

  const handleImpactChangeRoll = () => {
    if (!gameData) return;

    const result = simulateImpactSkillChangeUntilDoubleMajor({
      mode,
      skills: gameData.skills,
      hitterPositionGroup,
      fixedSkillId: resolvedSkill1,
      maxRolls: IMPACT_CHANGE_LIMIT,
    });

    setSkill1(result.skillIds[0]);
    setSkill2(result.skillIds[1]);
    setSkill3(result.skillIds[2]);
    setImpactSessionRollCount((count) => count + result.rollCount);
    setImpactLastSuccessRollCount(result.success ? result.rollCount : null);

    if (result.success) {
      setImpactLastMessage(`${result.rollCount}번 만에 2, 3번 메이저 달성`);
      return;
    }

    setImpactLastMessage(`${IMPACT_CHANGE_LIMIT}번 안에 2, 3번 메이저가 나오지 않았음`);
  };

  return (
    <div className="app-bg">
      <div className="app-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">V26 Toolbox</p>
            <h1>{TOOL_VIEW_LABELS[toolView]}</h1>
          </div>
        </header>

        <div className="tool-tabs" role="tablist" aria-label="도구 선택">
          <button
            type="button"
            className={`tool-tab ${toolView === "calculator" ? "active" : ""}`}
            onClick={() => setToolView("calculator")}
          >
            스킬점수 계산기
          </button>
          <button
            type="button"
            className={`tool-tab ${toolView === "simulator" ? "active" : ""}`}
            onClick={() => setToolView("simulator")}
          >
            고스변 시뮬
          </button>
          <button
            type="button"
            className={`tool-tab ${toolView === "impactChange" ? "active" : ""}`}
            onClick={() => {
              const [impactLevel1, impactLevel2, impactLevel3] = getDefaultLevels("impact");
              setToolView("impactChange");
              setLevel1(impactLevel1);
              setLevel2(impactLevel2);
              setLevel3(impactLevel3);
              resetImpactChangeSession();
            }}
          >
            임팩트 스변 시뮬
          </button>
        </div>

        <main className="layout-grid">
          <section className="panel panel-main">
            <div className="panel-head">
              <h2>
                {toolView === "calculator"
                  ? "입력"
                  : toolView === "simulator"
                    ? "시뮬 설정"
                    : "임팩트 스변 설정"}
              </h2>
            </div>

            <div className="control-row">
              <div className="control-block control-block-mode">
                <PlayerTypeToggle
                  value={mode}
                  onChange={(nextMode) => {
                    setMode(nextMode);
                    resetSimulationSession();
                    resetImpactChangeSession();
                  }}
                />
              </div>

              {(toolView === "simulator" || toolView === "impactChange") && mode === "hitter" && (
                <div className="control-block">
                  <label>타자 포지션</label>
                  <div className="toggle-row">
                    <button
                      type="button"
                      className={`toggle-btn ${hitterPositionGroup === "fielder" ? "active" : ""}`}
                      onClick={() => {
                        setHitterPositionGroup("fielder");
                        resetSimulationSession();
                        resetImpactChangeSession();
                      }}
                    >
                      야수
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${hitterPositionGroup === "catcher" ? "active" : ""}`}
                      onClick={() => {
                        setHitterPositionGroup("catcher");
                        resetSimulationSession();
                        resetImpactChangeSession();
                      }}
                    >
                      포수
                    </button>
                  </div>
                </div>
              )}

              {toolView !== "impactChange" ? (
                <div className="control-block">
                  <label>카드 타입</label>
                  <div className="inline-actions inline-actions-card">
                    <div className="toggle-row toggle-row-cards">
                      {CARD_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`toggle-btn ${cardType === option.value ? "active" : ""}`}
                          onClick={() => {
                            const nextCardType = option.value;
                            const [defaultLevel1, defaultLevel2, defaultLevel3] =
                              getDefaultLevels(nextCardType);

                            setCardType(nextCardType);
                            setLevel1(defaultLevel1);
                            setLevel2(defaultLevel2);
                            setLevel3(defaultLevel3);
                            resetSimulationSession();
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="ghost-btn" onClick={handleReset}>
                      초기화
                    </button>
                  </div>
                </div>
              ) : (
                <div className="control-block">
                  <label>카드 타입</label>
                  <div className="impact-card-lock">
                    <span className="impact-card-pill">임팩트 고정</span>
                    <button type="button" className="ghost-btn" onClick={handleReset}>
                      초기화
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!gameData ? (
              <div className="empty-box">
                {mode === "hitter"
                  ? "데이터를 불러오지 못했습니다."
                  : `${pitcherRole} 데이터는 아직 연결 전입니다.`}
              </div>
            ) : toolView === "calculator" ? (
              <CalculatorView
                gameData={gameData}
                activeCardType={activeCardType}
                resultGradeColor={resultGradeColor}
                judgeGrade={judgeResult?.grade ?? "-"}
                totalScore={totalScore}
                matchedPercentLabel={formatMatchedPercent(judgeResult?.matchedPercent ?? null)}
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
            ) : toolView === "simulator" ? (
              <AdvancedSimulatorView
                activeCardType={activeCardType}
                resultGradeColor={resultGradeColor}
                judgeGrade={judgeResult?.grade ?? "-"}
                totalScore={gameData ? totalScore : "-"}
                matchedPercentLabel={formatMatchedPercent(judgeResult?.matchedPercent ?? null)}
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
                targetGradeOptions={TARGET_GRADE_OPTIONS}
                setTargetGrade={setTargetGrade}
                setSkill1={setSkill1}
                setLevel1={setLevel1}
                setLevel2={setLevel2}
                setLevel3={setLevel3}
                onRollOnce={handleAdvancedSkillChangeRoll}
                onAutoRoll={handleAutoRollToTarget}
                getSkillScoreLabel={getSkillScoreLabel}
              />
            ) : (
              <ImpactSimulatorView
                resultGradeColor={resultGradeColor}
                judgeGrade={judgeResult?.grade ?? "-"}
                totalScore={gameData ? totalScore : "-"}
                matchedPercentLabel={formatMatchedPercent(judgeResult?.matchedPercent ?? null)}
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
                onImpactRoll={handleImpactChangeRoll}
                getSkillScoreLabel={getSkillScoreLabel}
              />
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
              <strong style={{ color: resultGradeColor }}>{judgeResult?.grade ?? "-"}</strong>
            </div>

            <div className="result-stat">
              <span>기준 확률</span>
              <strong>{formatMatchedPercent(judgeResult?.matchedPercent ?? null)}</strong>
            </div>

            <p className="result-summary">{summaryMessage}</p>

            {encouragementMessage && <div className="result-badge">{encouragementMessage}</div>}

            <div className="result-grade-guide">
              <div className="result-grade-guide-title">판정등급 기준</div>
              <div className="result-grade-guide-list">
                {RESULT_GRADE_GUIDE.map((item) => (
                  <div key={item.grade} className="result-grade-guide-item">
                    <strong style={{ color: RESULT_GRADE_COLORS[item.grade] }}>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {toolView === "simulator" && (
              <p className="tool-note">
                현재 버전은 앱에 등록된 스킬 데이터를 기준으로 1회 롤을 재현합니다.
              </p>
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

        <footer className="app-footer">made by 우주</footer>
        <Analytics />
      </div>
    </div>
  );
}

export default App;
