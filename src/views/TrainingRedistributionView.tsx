import { useMemo, useState, type ReactNode } from "react";
import {
  calculateTrainingRedistributionOdds,
  TRAINING_CARD_RULES,
  type TrainingCardType,
  type TrainingPlayerType,
  type TrainingStatKey,
} from "../utils/trainingRedistributionOdds";

type TrainingRedistributionViewProps = {
  themeAction: ReactNode;
  onGoHome: () => void;
};

const CARD_TYPE_OPTIONS: TrainingCardType[] = [
  "impact",
  "national",
  "signature",
  "goldenGlove",
  "allStarLive",
];

const DEFAULT_LOW_STATS: Record<TrainingPlayerType, Record<1 | 2, TrainingStatKey[]>> = {
  hitter: {
    1: ["speed"],
    2: ["speed", "defense"],
  },
  pitcher: {
    1: ["stamina"],
    2: ["defense", "stamina"],
  },
};

function formatPercent(value: number) {
  const percent = value * 100;

  if (percent === 0) {
    return "0%";
  }

  if (percent < 0.01) {
    return "<0.01%";
  }

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: percent < 1 ? 3 : 2,
  }).format(percent)}%`;
}

function formatAttempts(value: number | null) {
  if (!value || !Number.isFinite(value)) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)}회`;
}

function parseScore(value: string) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.max(0, Math.floor(nextValue)) : 0;
}

function handleScoreFocus(event: React.FocusEvent<HTMLInputElement>) {
  if (event.currentTarget.value === "0") {
    event.currentTarget.select();
  }
}

function normalizeScoreValue(value: string) {
  const normalizedValue = value.replace(/^0+(?=\d)/, "");
  return normalizedValue === "" ? "0" : normalizedValue;
}

export default function TrainingRedistributionView({
  themeAction,
  onGoHome,
}: TrainingRedistributionViewProps) {
  const [cardType, setCardType] = useState<TrainingCardType>("signature");
  const [playerType, setPlayerType] = useState<TrainingPlayerType>("hitter");
  const [hitterScores, setHitterScores] = useState({
    power: "0",
    contact: "0",
    discipline: "0",
  });
  const [pitcherScores, setPitcherScores] = useState({
    breaking: "0",
    stuff: "0",
  });

  const rule = TRAINING_CARD_RULES[cardType];
  const lowPickCount = rule.lowPickCount;
  const lowStats = DEFAULT_LOW_STATS[playerType][lowPickCount];
  const targetSum =
    playerType === "hitter"
      ? parseScore(hitterScores.power) +
        parseScore(hitterScores.contact) +
        parseScore(hitterScores.discipline)
      : parseScore(pitcherScores.breaking) + parseScore(pitcherScores.stuff);
  const odds = useMemo(
    () =>
      calculateTrainingRedistributionOdds({
        cardType,
        playerType,
        lowStats,
        targetSum,
      }),
    [cardType, lowStats, playerType, targetSum]
  );

  const handleCardTypeChange = (nextCardType: TrainingCardType) => {
    setCardType(nextCardType);
  };

  const handlePlayerTypeChange = (nextPlayerType: TrainingPlayerType) => {
    setPlayerType(nextPlayerType);
  };

  return (
    <main className="training-redistribution-page tool-page">
      <header className="training-hero">
        <div>
          <span className="page-kicker">Training Odds</span>
          <h1>훈련 재분배 확률 계산기</h1>
          <p>
            카드 타입과 낮게 받을 능력치를 정한 뒤, 타자는 파정선 합계, 투수는 변구 합계가
            어느 정도 확률인지 계산합니다.
          </p>
        </div>
        <div className="page-toolbar-actions training-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </header>

      <section className="training-layout" aria-label="훈련 재분배 계산">
        <div className="training-config-panel">
          <section className="training-card-section">
            <div className="training-section-head">
              <h2>카드 타입</h2>
              <span>{rule.trainingCount}회 훈련</span>
            </div>
            <div className="training-choice-grid">
              {CARD_TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`training-choice ${cardType === option ? "is-active" : ""}`}
                  onClick={() => handleCardTypeChange(option)}
                >
                  <strong>{TRAINING_CARD_RULES[option].label}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="training-card-section">
            <div className="training-section-head">
              <h2>계산 기준</h2>
              <span>{playerType === "hitter" ? "파워+정확+선구" : "변화+구위"}</span>
            </div>
            <div className="training-segment">
              <button
                type="button"
                className={playerType === "hitter" ? "is-active" : ""}
                onClick={() => handlePlayerTypeChange("hitter")}
              >
                타자
              </button>
              <button
                type="button"
                className={playerType === "pitcher" ? "is-active" : ""}
                onClick={() => handlePlayerTypeChange("pitcher")}
              >
                투수
              </button>
            </div>
            <p className="training-helper">
              타자에서 파워+정확 2개만 보고 싶으면 투수 기준처럼 2스탯 합 계산으로 참고하세요.
              현재 타자 모드는 파워+정확+선구 3스탯 합 기준입니다.
            </p>
          </section>

          <section className="training-card-section">
            <div className="training-section-head">
              <h2>결과 능력치 입력</h2>
              <span>합계 {targetSum}</span>
            </div>
            <div className="training-score-grid">
              {playerType === "hitter" ? (
                <>
                  <label>
                    <span>파워</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={hitterScores.power}
                      onFocus={handleScoreFocus}
                      onChange={(event) =>
                        setHitterScores((scores) => ({
                          ...scores,
                          power: normalizeScoreValue(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>정확</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={hitterScores.contact}
                      onFocus={handleScoreFocus}
                      onChange={(event) =>
                        setHitterScores((scores) => ({
                          ...scores,
                          contact: normalizeScoreValue(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>선구</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={hitterScores.discipline}
                      onFocus={handleScoreFocus}
                      onChange={(event) =>
                        setHitterScores((scores) => ({
                          ...scores,
                          discipline: normalizeScoreValue(event.target.value),
                        }))
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>변화</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={pitcherScores.breaking}
                      onFocus={handleScoreFocus}
                      onChange={(event) =>
                        setPitcherScores((scores) => ({
                          ...scores,
                          breaking: normalizeScoreValue(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>구위</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={pitcherScores.stuff}
                      onFocus={handleScoreFocus}
                      onChange={(event) =>
                        setPitcherScores((scores) => ({
                          ...scores,
                          stuff: normalizeScoreValue(event.target.value),
                        }))
                      }
                    />
                  </label>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="training-result-panel">
          <div className="training-result-card">
            <span className="page-kicker">Result</span>
            <h2>{playerType === "hitter" ? "파정선" : "변구"} 합계 확률</h2>
            <strong className="training-result-score">{targetSum}</strong>
            <dl className="training-result-list">
              <div>
                <dt>상위 확률</dt>
                <dd>{formatPercent(odds.atLeastProbability)}</dd>
              </div>
              <div>
                <dt>기대 횟수</dt>
                <dd>{formatAttempts(odds.expectedAttempts)}</dd>
              </div>
            </dl>
          </div>

          <div className="training-note-card">
            <h2>계산 기준</h2>
            <p>
              훈련 1회당 총 3포인트가 6개 능력치에 동일 확률로 분배된 뒤, 선택한 낮은
              능력치는 목표 능력치가 아닌 쪽으로 잡는다고 보고 계산합니다.
            </p>
            <p>
              이전 결과와 완전히 같은 6스탯 결과가 제외되는 세부 규칙은 지금 버전에서는
              입력 단순화를 위해 별도 보정하지 않았습니다.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
