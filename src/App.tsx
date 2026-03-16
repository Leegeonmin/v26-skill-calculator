import { useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS } from "./data/uiColors";
import PlayerTypeToggle from "./components/PlayerTypeToggle";
import SkillSelect from "./components/SkillSelect";
import type { CardType, PitcherRole, PlayerType, SkillLevel } from "./types";
import { calculateSkillTotal } from "./utils/calculate";
import { judgeSkillResult } from "./utils/judge";

const DEFAULT_PLAYER_TYPE: PlayerType = "hitter";
const DEFAULT_PITCHER_ROLE: PitcherRole = "starter";
const DEFAULT_CARD_TYPE: CardType = "signature";
const DEFAULT_SKILL_1 = "hitter_precision_hit";
const DEFAULT_SKILL_2 = "hitter_big_game_hunter";
const DEFAULT_SKILL_3 = "hitter_batting_machine";
const DEFAULT_LEVEL_1: SkillLevel = 6;
const DEFAULT_LEVEL_2: SkillLevel = 5;
const DEFAULT_LEVEL_3: SkillLevel = 5;

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

function getEncouragementMessage(percent: number | null): string | null {
  if (percent === null) return null;
  if (percent <= 0.01) return "사기꾼";
  return null;
}

function getResultSummaryMessage(percent: number | null): string {
  if (percent === null) {
    return "기준표 최저점 미만 구간입니다. 실사용은 가능하지만 더 좋은 조합이 많이 남아 있어요.";
  }

  if (percent <= 0.5) {
    return "이 정도면 종결권입니다. 오래 써도 만족할 만한 고점 조합이에요.";
  }

  if (percent <= 1.5) {
    return "상당히 좋은 편입니다. 실사용 기준으로도 충분히 강한 조합이에요.";
  }

  if (percent <= 7) {
    return "실사용 가능한 상급 조합입니다. 당장 써도 체감이 괜찮은 편이에요.";
  }

  if (percent <= 12) {
    return "무난하게 굴릴 수 있는 조합입니다. 여유가 되면 한 단계 더 올려볼 만해요.";
  }

  return "입문용으로는 괜찮지만 흔한 조합에 가까워요. 업그레이드 여지가 큽니다.";
}

function App() {
  const [playerType, setPlayerType] = useState<PlayerType>(DEFAULT_PLAYER_TYPE);
  const [pitcherRole, setPitcherRole] = useState<PitcherRole>(DEFAULT_PITCHER_ROLE);

  const [cardType, setCardType] = useState<CardType>(DEFAULT_CARD_TYPE);
  const [skill1, setSkill1] = useState(DEFAULT_SKILL_1);
  const [skill2, setSkill2] = useState(DEFAULT_SKILL_2);
  const [skill3, setSkill3] = useState(DEFAULT_SKILL_3);

  const [level1, setLevel1] = useState<SkillLevel>(DEFAULT_LEVEL_1);
  const [level2, setLevel2] = useState<SkillLevel>(DEFAULT_LEVEL_2);
  const [level3, setLevel3] = useState<SkillLevel>(DEFAULT_LEVEL_3);

  const gameData = useMemo(
    () => getGameDataSet({ playerType, pitcherRole }),
    [playerType, pitcherRole]
  );

  const filteredSkills = useMemo(() => {
    if (!gameData) return [];
    return gameData.skills.filter((skill) => skill.availableCardTypes.includes(cardType));
  }, [gameData, cardType]);

  const filteredSkillIds = useMemo(
    () => filteredSkills.map((skill) => skill.id),
    [filteredSkills]
  );

  const resolvedSkill1 = pickValidSkill(skill1, filteredSkillIds);
  const resolvedSkill2 = pickValidSkill(skill2, filteredSkillIds, [resolvedSkill1]);
  const resolvedSkill3 = pickValidSkill(skill3, filteredSkillIds, [resolvedSkill1, resolvedSkill2]);

  const handleReset = () => {
    if (!gameData) return;

    setCardType(DEFAULT_CARD_TYPE);

    const resetSkills = gameData.skills
      .filter((skill) => skill.availableCardTypes.includes(DEFAULT_CARD_TYPE))
      .map((skill) => skill.id);

    setSkill1(resetSkills[0] ?? "");
    setSkill2(resetSkills[1] ?? resetSkills[0] ?? "");
    setSkill3(resetSkills[2] ?? resetSkills[0] ?? "");

    setLevel1(DEFAULT_LEVEL_1);
    setLevel2(DEFAULT_LEVEL_2);
    setLevel3(DEFAULT_LEVEL_3);
  };

  const totalScore = gameData
    ? calculateSkillTotal({
        cardType,
        skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
        skillLevels: [level1, level2, level3],
        scoreTable: gameData.scoreTable,
      })
    : 0;

  const judgeResult = gameData
    ? judgeSkillResult(gameData.thresholds, cardType, totalScore)
    : null;

  const resultGradeColor = judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#b7bfd2";
  const encouragementMessage = getEncouragementMessage(judgeResult?.matchedPercent ?? null);
  const summaryMessage = getResultSummaryMessage(judgeResult?.matchedPercent ?? null);

  return (
    <div className="app-bg">
      <div className="app-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">V26 Toolbox</p>
            <h1>스킬 계산기</h1>
          </div>
        </header>

        <main className="layout-grid">
          <section className="panel panel-main">
            <div className="panel-head">
              <h2>입력</h2>
            </div>

            <div className="control-row">
              <div className="control-block">
                <PlayerTypeToggle value={playerType} onChange={setPlayerType} />
              </div>

              {playerType === "pitcher" && (
                <div className="control-block">
                  <label htmlFor="pitcher-role">보직</label>
                  <select
                    id="pitcher-role"
                    value={pitcherRole}
                    onChange={(e) => setPitcherRole(e.target.value as PitcherRole)}
                  >
                    <option value="starter">선발</option>
                    <option value="middle">중계</option>
                    <option value="closer">마무리</option>
                  </select>
                </div>
              )}

              <div className="control-block">
                <label htmlFor="card-type">카드 종류</label>
                <div className="inline-actions">
                  <select
                    id="card-type"
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as CardType)}
                  >
                    {Object.entries(CARD_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="ghost-btn" onClick={handleReset}>
                    초기화
                  </button>
                </div>
              </div>
            </div>

            {!gameData ? (
              <div className="empty-box">
                {playerType === "hitter"
                  ? "데이터를 불러오지 못했습니다."
                  : `${pitcherRole} 데이터는 아직 연결 전입니다.`}
              </div>
            ) : (
              <div className="skill-grid">
                <div className="skill-col">
                  <SkillSelect
                    label={cardType === "impact" ? "스킬 1 (고정)" : "스킬 1"}
                    value={resolvedSkill1}
                    options={filteredSkills}
                    excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
                    onChange={setSkill1}
                    disabled={cardType === "impact"}
                  />
                  <select
                    value={level1}
                    onChange={(e) => setLevel1(Number(e.target.value) as SkillLevel)}
                    disabled={cardType === "impact"}
                  >
                    {[5, 6, 7, 8].map((level) => (
                      <option key={level} value={level}>
                        {level} 레벨
                      </option>
                    ))}
                  </select>
                </div>

                <div className="skill-col">
                  <SkillSelect
                    label="스킬 2"
                    value={resolvedSkill2}
                    options={filteredSkills}
                    excludedSkillIds={[resolvedSkill1, resolvedSkill3]}
                    onChange={setSkill2}
                  />
                  <select
                    value={level2}
                    onChange={(e) => setLevel2(Number(e.target.value) as SkillLevel)}
                  >
                    {[5, 6, 7, 8].map((level) => (
                      <option key={level} value={level}>
                        {level} 레벨
                      </option>
                    ))}
                  </select>
                </div>

                <div className="skill-col">
                  <SkillSelect
                    label="스킬 3"
                    value={resolvedSkill3}
                    options={filteredSkills}
                    excludedSkillIds={[resolvedSkill1, resolvedSkill2]}
                    onChange={setSkill3}
                  />
                  <select
                    value={level3}
                    onChange={(e) => setLevel3(Number(e.target.value) as SkillLevel)}
                  >
                    {[5, 6, 7, 8].map((level) => (
                      <option key={level} value={level}>
                        {level} 레벨
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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

            {cardType === "impact" && (
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
