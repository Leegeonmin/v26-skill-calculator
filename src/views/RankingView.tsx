import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getGameDataSet } from "../data/gameData";
import {
  getCurrentSeason,
  getMySeasonEntry,
  getSeasonRankings,
  getTodayRollLog,
  joinSeason,
  submitDailyRankRoll,
} from "../lib/ranking";
import type {
  RankingCategory,
  RankingRow,
  Season,
  SeasonEntry,
  StoredSkillSet,
} from "../types/ranking";
import type { SkillLevel } from "../types";
import { calculateSkillTotal } from "../utils/calculate";
import { simulateAdvancedSkillChange } from "../utils/simulateAdvancedSkillChange";

type RankingViewProps = {
  authSession: Session | null;
  supabaseReady: boolean;
};

const CATEGORY_LABELS: Record<RankingCategory, string> = {
  hitter: "타자",
  pitcher_starter: "투수(선발)",
};

function buildInitialSkillSet(category: RankingCategory): {
  skillSet: StoredSkillSet;
  score: number;
} {
  const gameData = getGameDataSet({
    playerType: category === "hitter" ? "hitter" : "pitcher",
    pitcherRole: "starter",
  });

  if (!gameData) {
    throw new Error("초기 스킬 데이터를 불러오지 못했습니다.");
  }

  const cardType = "signature";
  const skillIds = gameData.skills
    .filter((skill) => skill.availableCardTypes.includes(cardType))
    .slice(0, 3)
    .map((skill) => skill.id) as [string, string, string];

  const skillLevels: [SkillLevel, SkillLevel, SkillLevel] = [6, 5, 5];
  const score = calculateSkillTotal({
    cardType,
    skillIds,
    skillLevels,
    scoreTable: gameData.scoreTable,
  });

  return {
    skillSet: {
      mode: category === "hitter" ? "hitter" : "starter",
      cardType,
      skillIds,
      skillLevels,
    },
    score,
  };
}

function formatSeasonRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const inclusiveEnd = new Date(endsAt);
  inclusiveEnd.setMilliseconds(inclusiveEnd.getMilliseconds() - 1);

  const startLabel = start.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
  const endLabel = inclusiveEnd.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  });

  return `${startLabel} - ${endLabel}`;
}

function formatReachedAt(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

function getSkillNameMap(category: RankingCategory): Map<string, string> {
  const gameData = getGameDataSet({
    playerType: category === "hitter" ? "hitter" : "pitcher",
    pitcherRole: "starter",
  });

  return new Map((gameData?.skills ?? []).map((skill) => [skill.id, skill.name]));
}

function formatSkillNames(category: RankingCategory, skillSet: StoredSkillSet): string {
  const skillNameMap = getSkillNameMap(category);
  return skillSet.skillIds
    .map((skillId) => skillNameMap.get(skillId) ?? skillId)
    .join(" / ");
}

export default function RankingView({ authSession, supabaseReady }: RankingViewProps) {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [entry, setEntry] = useState<SeasonEntry | null>(null);
  const [todayRollLogId, setTodayRollLogId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>("pitcher_starter");
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolledSkillSet, setRolledSkillSet] = useState<StoredSkillSet | null>(null);
  const [rolledScore, setRolledScore] = useState<number | null>(null);

  const userId = authSession?.user.id ?? null;
  const myRankingRow = useMemo(
    () => rankings.find((row) => row.user_id === userId) ?? null,
    [rankings, userId]
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!supabaseReady) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const season = await getCurrentSeason();
        if (!isMounted) return;

        setCurrentSeason(season);

        if (!season) {
          setEntry(null);
          setRankings([]);
          setTodayRollLogId(null);
          return;
        }

        const [nextEntry, nextRankings] = await Promise.all([
          authSession ? getMySeasonEntry(season.id) : Promise.resolve(null),
          getSeasonRankings(season.id, selectedCategory),
        ]);

        if (!isMounted) return;

        setEntry(nextEntry);
        setRankings(nextRankings);
        setTodayRollLogId(nextEntry ? (await getTodayRollLog(nextEntry.id))?.id ?? null : null);

        if (nextEntry) {
          setSelectedCategory(nextEntry.category);
        }
      } catch (nextError) {
        if (!isMounted) return;
        setError(nextError instanceof Error ? nextError.message : "랭킹 정보를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [authSession, selectedCategory, supabaseReady]);

  const handleJoinSeason = async () => {
    if (!currentSeason) return;

    setIsJoining(true);
    setError(null);

    try {
      const { skillSet, score } = buildInitialSkillSet(selectedCategory);
      const nextEntry = await joinSeason(selectedCategory, skillSet, score);
      const nextRankings = await getSeasonRankings(currentSeason.id, selectedCategory);

      setEntry(nextEntry);
      setRankings(nextRankings);
      setTodayRollLogId(null);
      setRolledSkillSet(null);
      setRolledScore(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "시즌 참가에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleRoll = async () => {
    if (!entry) return;

    setIsRolling(true);
    setError(null);

    try {
      const gameData = getGameDataSet({
        playerType: entry.category === "hitter" ? "hitter" : "pitcher",
        pitcherRole: "starter",
      });

      if (!gameData) {
        throw new Error("고스변 시뮬 데이터가 준비되지 않았습니다.");
      }

      const nextRoll = simulateAdvancedSkillChange({
        mode: entry.category === "hitter" ? "hitter" : "starter",
        cardType: entry.current_skills.cardType,
        skills: gameData.skills,
        hitterPositionGroup: "fielder",
      });

      const nextSkillSet: StoredSkillSet = {
        ...entry.current_skills,
        skillIds: nextRoll.skillIds,
      };

      const nextScore = calculateSkillTotal({
        cardType: nextSkillSet.cardType,
        skillIds: nextSkillSet.skillIds,
        skillLevels: nextSkillSet.skillLevels as [SkillLevel, SkillLevel, SkillLevel],
        scoreTable: gameData.scoreTable,
      });

      setRolledSkillSet(nextSkillSet);
      setRolledScore(nextScore);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "고스변 실행에 실패했습니다.");
    } finally {
      setIsRolling(false);
    }
  };

  const handleSelectResult = async (selectedResult: "keep" | "replace") => {
    if (!entry || !rolledSkillSet || rolledScore === null || !currentSeason) return;

    setIsChoosing(true);
    setError(null);

    try {
      const finalSkills = selectedResult === "replace" ? rolledSkillSet : entry.current_skills;
      const finalScore = selectedResult === "replace" ? rolledScore : entry.current_score;

      const nextEntry = await submitDailyRankRoll({
        entryId: entry.id,
        beforeSkills: entry.current_skills,
        rolledSkills: rolledSkillSet,
        selectedResult,
        finalSkills,
        finalScore,
      });

      const [nextRankings, nextTodayRollLog] = await Promise.all([
        getSeasonRankings(currentSeason.id, entry.category),
        getTodayRollLog(entry.id),
      ]);

      setEntry(nextEntry);
      setRankings(nextRankings);
      setTodayRollLogId(nextTodayRollLog?.id ?? null);
      setRolledSkillSet(null);
      setRolledScore(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "결과 확정에 실패했습니다.");
    } finally {
      setIsChoosing(false);
    }
  };

  return (
    <div className="ranking-view">
      <div className="ranking-page-head">
        <div className="ranking-page-kicker">V26 BASEBALL TOOLKIT</div>
        <h1>고스변 랭킹챌린지</h1>
        <p>하루 한 번, 이번 주 최고 점수를 겨루는 챌린지</p>
      </div>

      <section className="ranking-card ranking-season-card">
        <div className="ranking-section-head">
          <div className="ranking-section-icon">C</div>
          <div>
            <h2>현재 시즌</h2>
          </div>
        </div>

        {!supabaseReady && <p className="tool-note">Supabase 설정이 필요합니다.</p>}
        {supabaseReady && !isLoading && !currentSeason && (
          <p className="tool-note">현재 진행 중인 시즌이 없습니다.</p>
        )}

        {currentSeason && (
          <div className="ranking-season-meta ranking-season-meta-horizontal">
            <div>
              <span>시즌명</span>
              <strong>{currentSeason.name}</strong>
            </div>
            <div>
              <span>기간</span>
              <strong>{formatSeasonRange(currentSeason.starts_at, currentSeason.ends_at)}</strong>
            </div>
            <div>
              <span>진행 방식</span>
              <strong>매주 월요일 시작 / 일요일 종료</strong>
            </div>
          </div>
        )}
      </section>

      <div className="ranking-grid">
        <section className="ranking-card">
          <div className="ranking-section-head">
            <div className="ranking-section-icon ranking-section-icon-warm">T</div>
            <div>
              <h2>참여 현황</h2>
            </div>
          </div>

          <div className="ranking-toggle-row">
            {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                className={`ranking-toggle-btn ${selectedCategory === category ? "active" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {!authSession && (
            <>
              <p className="ranking-support-copy">
                참가 카테고리는 이번 주 동안 고정되고, 매일 1번만 고스변을 시도할 수 있습니다.
              </p>

              <div className="ranking-cta-card">
                <span>{CATEGORY_LABELS[selectedCategory]} 참가하기</span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </div>

              <div className="ranking-status-card">
                <span className="ranking-status-icon" aria-hidden="true">
                  ◔
                </span>
                <span>
                  오늘 참가 가능 횟수: <strong>1회</strong>
                </span>
              </div>
            </>
          )}

          {authSession && currentSeason && !entry && (
            <>
              <p className="ranking-support-copy">
                참가 카테고리는 이번 주 동안 고정되고, 매일 1번만 고스변을 시도할 수 있습니다.
              </p>

              <button
                type="button"
                className="ranking-cta-card ranking-cta-button"
                onClick={() => void handleJoinSeason()}
                disabled={isJoining}
              >
                <span>{isJoining ? "참가 처리 중..." : `${CATEGORY_LABELS[selectedCategory]} 참가하기`}</span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </button>

              <div className="ranking-status-card">
                <span className="ranking-status-icon" aria-hidden="true">
                  ◔
                </span>
                <span>
                  오늘 참가 가능 횟수: <strong>1회</strong>
                </span>
              </div>
            </>
          )}

          {authSession && entry && (
            <div className="ranking-entry-box">
              <div className="ranking-entry-row">
                <span>참가 카테고리</span>
                <strong>{CATEGORY_LABELS[entry.category]}</strong>
              </div>
              <div className="ranking-entry-row">
                <span>현재 점수</span>
                <strong>{entry.current_score}</strong>
              </div>
              <div className="ranking-entry-row">
                <span>오늘 사용 여부</span>
                <strong>{todayRollLogId ? "사용 완료" : "사용 가능"}</strong>
              </div>
              <div className="ranking-entry-row">
                <span>현재 스킬</span>
                <strong>{formatSkillNames(entry.category, entry.current_skills)}</strong>
              </div>
            </div>
          )}

          {authSession && entry && !todayRollLogId && !rolledSkillSet && (
            <div className="ranking-roll-box">
              <p className="ranking-support-copy">
                오늘의 고스변을 1회 실행한 뒤 기존 결과와 변경 결과 중 하나를 선택합니다.
              </p>

              <button
                type="button"
                className="ranking-cta-card ranking-cta-button"
                onClick={() => void handleRoll()}
                disabled={isRolling}
              >
                <span>{isRolling ? "고스변 실행 중..." : "오늘의 고스변 실행"}</span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            </div>
          )}

          {authSession && entry && rolledSkillSet && rolledScore !== null && (
            <div className="ranking-compare-box">
              <div className="ranking-compare-grid">
                <div className="ranking-compare-card">
                  <span>기존 결과</span>
                  <strong>{entry.current_score}점</strong>
                  <p>{formatSkillNames(entry.category, entry.current_skills)}</p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => void handleSelectResult("keep")}
                    disabled={isChoosing}
                  >
                    {isChoosing ? "처리 중..." : "기존 결과 유지"}
                  </button>
                </div>

                <div className="ranking-compare-card">
                  <span>변경 결과</span>
                  <strong>{rolledScore}점</strong>
                  <p>{formatSkillNames(entry.category, rolledSkillSet)}</p>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => void handleSelectResult("replace")}
                    disabled={isChoosing}
                  >
                    {isChoosing ? "처리 중..." : "변경 결과 채택"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
        </section>

        <section className="ranking-card">
          <div className="ranking-section-head">
            <div className="ranking-section-icon">R</div>
            <div>
              <h2>리더보드</h2>
            </div>
          </div>

          <div className="ranking-toggle-row">
            {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                className={`ranking-toggle-btn ${selectedCategory === category ? "active" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {myRankingRow && (
            <div className="ranking-my-card">
              <span>내 순위</span>
              <strong>
                {myRankingRow.rank_position}위 / {myRankingRow.current_score}점
              </strong>
            </div>
          )}

          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>닉네임</th>
                  <th>점수</th>
                  <th>도달 시각</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ranking-empty">
                      아직 집계된 참가자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rankings.map((row) => (
                    <tr key={row.entry_id}>
                      <td>{row.rank_position}</td>
                      <td>{row.display_name ?? "닉네임 미설정"}</td>
                      <td>{row.current_score}</td>
                      <td>{formatReachedAt(row.score_reached_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
