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
import type { RankingCategory, RankingRow, Season, SeasonEntry, StoredSkillSet } from "../types/ranking";
import type { SkillLevel } from "../types";
import { calculateSkillTotal } from "../utils/calculate";
import { simulateAdvancedSkillChange } from "../utils/simulateAdvancedSkillChange";

type RankingViewProps = {
  authSession: Session | null;
  supabaseReady: boolean;
  isAuthBusy: boolean;
  onGoogleSignIn: () => Promise<void>;
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

export default function RankingView({
  authSession,
  supabaseReady,
  isAuthBusy,
  onGoogleSignIn,
}: RankingViewProps) {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [entry, setEntry] = useState<SeasonEntry | null>(null);
  const [todayRollLogId, setTodayRollLogId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>("hitter");
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
        throw new Error("롤에 필요한 데이터를 불러오지 못했습니다.");
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
      <div className="ranking-grid">
        <section className="ranking-card">
          <div className="panel-head">
            <h2>현재 시즌</h2>
          </div>

          {!supabaseReady && <p className="tool-note">Supabase 환경변수 설정이 필요합니다.</p>}

          {supabaseReady && isLoading && <p className="tool-note">시즌 정보를 불러오는 중입니다.</p>}

          {supabaseReady && !isLoading && !currentSeason && (
            <p className="tool-note">현재 활성 시즌이 없습니다. 첫 시즌을 생성하면 7일 기준으로 진행됩니다.</p>
          )}

          {currentSeason && (
            <div className="ranking-season-meta">
              <div>
                <span>시즌명</span>
                <strong>{currentSeason.name}</strong>
              </div>
              <div>
                <span>기간</span>
                <strong>
                  {new Date(currentSeason.starts_at).toLocaleString("ko-KR")} -{" "}
                  {new Date(currentSeason.ends_at).toLocaleString("ko-KR")}
                </strong>
              </div>
              <div>
                <span>상태</span>
                <strong>{currentSeason.status}</strong>
              </div>
            </div>
          )}

          {supabaseReady && !authSession && (
            <div className="ranking-login-box">
              <p>랭킹 참여는 Google 로그인 후 가능합니다.</p>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => void onGoogleSignIn()}
                disabled={isAuthBusy}
              >
                {isAuthBusy ? "처리 중..." : "Google 로그인"}
              </button>
            </div>
          )}

          {authSession && currentSeason && !entry && (
            <div className="ranking-join-box">
              <div className="toggle-row">
                {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`toggle-btn ${selectedCategory === category ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>

              <p className="tool-note">
                시즌 참가 시 카테고리는 7일 동안 잠기고, 오늘 기준 하루 1회 고스변만 사용할 수 있습니다.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() => void handleJoinSeason()}
                disabled={isJoining}
              >
                {isJoining ? "참가 처리 중..." : `${CATEGORY_LABELS[selectedCategory]} 시즌 참가`}
              </button>
            </div>
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
                <span>현재 저장 스킬</span>
                <strong>{entry.current_skills.skillIds.join(" / ")}</strong>
              </div>
            </div>
          )}

          {authSession && entry && !todayRollLogId && !rolledSkillSet && (
            <div className="ranking-roll-box">
              <p className="tool-note">오늘의 고스변을 1회 실행하고, 기존/변경 결과 중 하나를 최종 저장합니다.</p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => void handleRoll()}
                disabled={isRolling}
              >
                {isRolling ? "고스변 실행 중..." : "오늘의 고스변 실행"}
              </button>
            </div>
          )}

          {authSession && entry && rolledSkillSet && rolledScore !== null && (
            <div className="ranking-compare-box">
              <div className="panel-head">
                <h2>결과 비교</h2>
              </div>

              <div className="ranking-compare-grid">
                <div className="ranking-compare-card">
                  <span>기존 세트</span>
                  <strong>{entry.current_score}점</strong>
                  <p>{entry.current_skills.skillIds.join(" / ")}</p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => void handleSelectResult("keep")}
                    disabled={isChoosing}
                  >
                    {isChoosing ? "저장 중..." : "기존 결과 유지"}
                  </button>
                </div>

                <div className="ranking-compare-card">
                  <span>변경 세트</span>
                  <strong>{rolledScore}점</strong>
                  <p>{rolledSkillSet.skillIds.join(" / ")}</p>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => void handleSelectResult("replace")}
                    disabled={isChoosing}
                  >
                    {isChoosing ? "저장 중..." : "변경 결과 채택"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
        </section>

        <section className="ranking-card">
          <div className="panel-head">
            <h2>카테고리 랭킹</h2>
          </div>

          <div className="toggle-row">
            {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                className={`toggle-btn ${selectedCategory === category ? "active" : ""}`}
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
                  <th>이름</th>
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
                      <td>{row.display_name ?? "익명 유저"}</td>
                      <td>{row.current_score}</td>
                      <td>{new Date(row.score_reached_at).toLocaleString("ko-KR")}</td>
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
