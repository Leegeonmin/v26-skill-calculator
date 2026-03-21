import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getGameDataSet } from "../data/gameData";
import { SKILL_GRADE_COLORS } from "../data/uiColors";
import {
  createInitialSeason,
  getSeasonWithFallback,
  getMySeasonEntry,
  getSeasonRankings,
  getTodayRollLog,
  joinSeason,
  submitDailyRankRoll,
} from "../lib/ranking";
import { signInWithGoogle } from "../lib/auth";
import type {
  RankingCategory,
  RankingRow,
  Season,
  SeasonEntry,
  StoredSkillSet,
} from "../types/ranking";
import type { SkillLevel, SkillScoreTable } from "../types";
import { calculateSkillTotal } from "../utils/calculate";
import { simulateAdvancedSkillChange } from "../utils/simulateAdvancedSkillChange";

type RankingViewProps = {
  authSession: Session | null;
  supabaseReady: boolean;
};

type PendingRollSnapshot = {
  entryId: string;
  seasonId: string;
  rollDateKst: string;
  beforeSkills: StoredSkillSet;
  beforeScore: number;
  rolledSkills: StoredSkillSet;
  rolledScore: number;
};

const PENDING_ROLL_STORAGE_KEY = "ranking-pending-roll";

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
  const nextRoll = simulateAdvancedSkillChange({
    mode: category === "hitter" ? "hitter" : "starter",
    cardType,
    skills: gameData.skills,
    hitterPositionGroup: "fielder",
  });
  const skillIds = nextRoll.skillIds;

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

function getSkillDisplayItems(category: RankingCategory, skillSet: StoredSkillSet) {
  const gameData = getGameDataSet({
    playerType: category === "hitter" ? "hitter" : "pitcher",
    pitcherRole: "starter",
  });

  if (!gameData) {
    return skillSet.skillIds.map((skillId, index) => ({
      key: `${skillId}-${index}`,
      label: `스킬 ${index + 1}`,
      name: skillId || "-",
      scoreLabel: "점수 -",
      color: "#172033",
    }));
  }

  return skillSet.skillIds.map((skillId, index) => {
    const skill = gameData.skills.find((item) => item.id === skillId);
    const level = skillSet.skillLevels[index] as SkillLevel;
    const score = scoreTableValue(gameData.scoreTable, skillId, level);

    return {
      key: `${skillId}-${index}`,
      label: `스킬 ${index + 1}`,
      name: skill?.name ?? skillId ?? "-",
      scoreLabel: score !== null ? `점수 ${score}` : "점수 -",
      color: skill ? SKILL_GRADE_COLORS[skill.grade] : "#172033",
    };
  });
}

function scoreTableValue(
  scoreTable: SkillScoreTable,
  skillId: string,
  level: SkillLevel
) {
  const score = scoreTable?.[skillId]?.[level];
  return typeof score === "number" ? score : null;
}

function SkillSetPreview({
  category,
  skillSet,
}: {
  category: RankingCategory;
  skillSet: StoredSkillSet;
}) {
  const items = getSkillDisplayItems(category, skillSet);

  return (
    <div className="ranking-skill-preview">
      {items.map((item) => (
        <div key={item.key} className="rolled-skill-card">
          <div className="rolled-skill-label">{item.label}</div>
          <strong style={{ color: item.color }}>{item.name}</strong>
          <div className="rolled-skill-score">{item.scoreLabel}</div>
        </div>
      ))}
    </div>
  );
}

function SkillSetList({
  category,
  skillSet,
}: {
  category: RankingCategory;
  skillSet: StoredSkillSet;
}) {
  const items = getSkillDisplayItems(category, skillSet);

  return (
    <div className="ranking-skill-list">
      {items.map((item) => (
        <div key={item.key} className="ranking-skill-list-item">
          <strong style={{ color: item.color }}>{item.name}</strong>
          <span>{item.scoreLabel}</span>
        </div>
      ))}
    </div>
  );
}

function isSettlementWindowKst(now = new Date()): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

  return weekday === "Mon" && hour < 2;
}

function getCurrentKstDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function readPendingRollSnapshot(): PendingRollSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_ROLL_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingRollSnapshot;
  } catch {
    window.sessionStorage.removeItem(PENDING_ROLL_STORAGE_KEY);
    return null;
  }
}

function writePendingRollSnapshot(snapshot: PendingRollSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_ROLL_STORAGE_KEY, JSON.stringify(snapshot));
}

function clearPendingRollSnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_ROLL_STORAGE_KEY);
}

function SectionIcon({ kind }: { kind: "season" | "participation" | "leaderboard" }) {
  if (kind === "season") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path
          d="M7 2h2v3H7V2Zm8 0h2v3h-2V2ZM5 6h14a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2Zm0 5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8H5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "participation") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
        <path
          d="M12 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 13c5.52 0 10 2.24 10 5v1H2v-1c0-2.76 4.48-5 10-5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
      <path
        d="M8 4h8v2h3v2a5 5 0 0 1-5 5h-.35A6 6 0 0 1 13 15.92V18h3v2H8v-2h3v-2.08A6 6 0 0 1 10.35 13H10a5 5 0 0 1-5-5V6h3V4Zm-1 4a3 3 0 0 0 3 3V8H7Zm10 3a3 3 0 0 0 3-3h-3v3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function RankingView({ authSession, supabaseReady }: RankingViewProps) {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [entry, setEntry] = useState<SeasonEntry | null>(null);
  const [todayRollLogId, setTodayRollLogId] = useState<string | null>(null);
  const [participationCategory, setParticipationCategory] =
    useState<RankingCategory>("pitcher_starter");
  const [leaderboardCategory, setLeaderboardCategory] =
    useState<RankingCategory>("pitcher_starter");
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolledSkillSet, setRolledSkillSet] = useState<StoredSkillSet | null>(null);
  const [rolledScore, setRolledScore] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const userId = authSession?.user.id ?? null;
  const myRankingRow = useMemo(
    () => rankings.find((row) => row.user_id === userId) ?? null,
    [rankings, userId]
  );
  const activeParticipationCategory = entry?.category ?? participationCategory;
  const showSettlementNotice = useMemo(() => isSettlementWindowKst(), []);
  const participationLabel = CATEGORY_LABELS[participationCategory];
  const rollScoreDelta =
    entry && rolledScore !== null ? Number((rolledScore - entry.current_score).toFixed(2)) : null;
  const isRolledResultBetter = rollScoreDelta !== null && rollScoreDelta > 0;

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
        let season = await getSeasonWithFallback();
        if (!isMounted) return;

        if (!season && authSession) {
          season = await createInitialSeason();
          if (!isMounted) return;
        }

        setCurrentSeason(season);

        if (!season) {
          setEntry(null);
          setRankings([]);
          setTodayRollLogId(null);
          return;
        }

        const [nextEntry, nextRankings] = await Promise.all([
          authSession ? getMySeasonEntry(season.id) : Promise.resolve(null),
          getSeasonRankings(season.id, leaderboardCategory),
        ]);

        if (!isMounted) return;

        setEntry(nextEntry);
        setRankings(nextRankings);
        setTodayRollLogId(nextEntry ? (await getTodayRollLog(nextEntry.id))?.id ?? null : null);

        if (nextEntry) {
          setParticipationCategory(nextEntry.category);
        }
      } catch (nextError) {
        if (!isMounted) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "시즌 정보를 불러오지 못했습니다."
        );
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
  }, [authSession, leaderboardCategory, supabaseReady]);

  useEffect(() => {
    const pendingRoll = readPendingRollSnapshot();

    if (
      !pendingRoll ||
      !authSession ||
      !currentSeason ||
      !entry ||
      todayRollLogId ||
      rolledSkillSet ||
      pendingRoll.entryId !== entry.id ||
      pendingRoll.seasonId !== currentSeason.id ||
      pendingRoll.rollDateKst !== getCurrentKstDateKey()
    ) {
      return;
    }

    void (async () => {
      try {
        const nextEntry = await submitDailyRankRoll({
          entryId: entry.id,
          beforeSkills: pendingRoll.beforeSkills,
          rolledSkills: pendingRoll.rolledSkills,
          selectedResult: "keep",
          finalSkills: pendingRoll.beforeSkills,
          finalScore: pendingRoll.beforeScore,
        });

        const [nextRankings, nextTodayRollLog] = await Promise.all([
          getSeasonRankings(currentSeason.id, leaderboardCategory),
          getTodayRollLog(entry.id),
        ]);

        setEntry(nextEntry);
        setRankings(nextRankings);
        setTodayRollLogId(nextTodayRollLog?.id ?? null);
        setRolledSkillSet(null);
        setRolledScore(null);
        clearPendingRollSnapshot();
        setError("새로고침되어 기존 스킬 유지로 처리되었습니다.");
      } catch (nextError) {
        clearPendingRollSnapshot();
        setError(
          nextError instanceof Error
            ? nextError.message
            : "새로고침 후 기존 스킬 유지 처리에 실패했습니다."
        );
      }
    })();
  }, [authSession, currentSeason, entry, leaderboardCategory, rolledSkillSet, todayRollLogId]);

  const handleJoinSeason = async () => {
    if (!currentSeason) return;

    setIsJoining(true);
    setError(null);

    try {
      const { skillSet, score } = buildInitialSkillSet(participationCategory);
      const nextEntry = await joinSeason(participationCategory, skillSet, score);
      const nextRankings = await getSeasonRankings(currentSeason.id, leaderboardCategory);

      setEntry(nextEntry);
      setParticipationCategory(nextEntry.category);
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

      writePendingRollSnapshot({
        entryId: entry.id,
        seasonId: entry.season_id,
        rollDateKst: getCurrentKstDateKey(),
        beforeSkills: entry.current_skills,
        beforeScore: entry.current_score,
        rolledSkills: nextSkillSet,
        rolledScore: nextScore,
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
        getSeasonRankings(currentSeason.id, leaderboardCategory),
        getTodayRollLog(entry.id),
      ]);

      setEntry(nextEntry);
      setRankings(nextRankings);
      setTodayRollLogId(nextTodayRollLog?.id ?? null);
      setRolledSkillSet(null);
      setRolledScore(null);
      clearPendingRollSnapshot();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "결과 확정에 실패했습니다.");
    } finally {
      setIsChoosing(false);
    }
  };

  const handleOpenLoginPrompt = () => {
    setShowLoginPrompt(true);
  };

  const handleOpenJoinConfirm = () => {
    setShowJoinConfirm(true);
  };

  const handleGoogleLoginFromPrompt = async () => {
    try {
      await signInWithGoogle(
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}${window.location.pathname}?view=ranking`
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Google 로그인에 실패했습니다.");
      setShowLoginPrompt(false);
    }
  };

  return (
    <div className="ranking-view">
      <div className="ranking-page-head">
        <div className="ranking-page-title">
          <h1>고스변 랭킹챌린지</h1>
          <span className="ranking-page-badge">BETA</span>
        </div>
        <p>하루 한 번, 이번 주 최고 점수를 겨루는 챌린지</p>
      </div>

      {showSettlementNotice && (
        <section className="ranking-card ranking-alert-card">
          <p className="ranking-alert-copy">
            매주 월요일 00:00 ~ 02:00(KST)는 주간 집계 중입니다. 집계가 끝나면 새 시즌 기준으로
            참가와 리더보드가 갱신됩니다.
          </p>
        </section>
      )}

      <section className="ranking-card ranking-season-card">
        <div className="ranking-section-head">
          <div className="ranking-section-icon">
            <SectionIcon kind="season" />
          </div>
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
            <div className="ranking-season-meta-item">
              <span>시즌명</span>
              <strong>{currentSeason.name}</strong>
            </div>
            <div className="ranking-season-meta-item">
              <span>기간</span>
              <strong>{formatSeasonRange(currentSeason.starts_at, currentSeason.ends_at)}</strong>
            </div>
            <div className="ranking-season-meta-item">
              <span>진행 방식</span>
              <strong>매주 월요일 시작 / 일요일 종료</strong>
            </div>
          </div>
        )}
      </section>

      <section className="ranking-card ranking-guide-card">
        <div className="ranking-section-head">
          <div className="ranking-section-icon">i</div>
          <div>
            <h2>이용 가이드</h2>
          </div>
        </div>

        <div className="ranking-guide-list">
          <p>1. Google 로그인 후 타자와 투수 중 하나를 선택하고 시즌에 참가합니다.</p>
          <p>2. 참가 후 매일 무료 1회 고급스킬변경권 기능을 사용하고, 기존 결과와 변경 결과 중 하나를 고릅니다.</p>
          <p>3. 확정된 최종 점수가 리더보드에 반영되며, 어떤 스킬 조합인지도 함께 확인할 수 있습니다.</p>
        </div>
      </section>

      <div className="ranking-grid">
        <section className="ranking-card">
          <div className="ranking-section-head">
            <div className="ranking-section-icon ranking-section-icon-warm">
              <SectionIcon kind="participation" />
            </div>
            <div>
              <h2>참여 현황</h2>
            </div>
          </div>

          <div className="ranking-toggle-row">
            {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                className={`ranking-toggle-btn ${
                  activeParticipationCategory === category ? "active" : ""
                }`}
                onClick={() => setParticipationCategory(category)}
                disabled={Boolean(entry)}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {!authSession && (
            <>
              <p className="ranking-support-copy">
                Google 로그인 후 타자 또는 투수 중 하나를 선택해서 참여할 수 있습니다.
              </p>

              <button
                type="button"
                className="ranking-cta-card ranking-cta-button"
                onClick={handleOpenLoginPrompt}
              >
                <span>{participationLabel} 참가 준비</span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </button>

              <div className="ranking-status-card">
                <span className="ranking-status-icon" aria-hidden="true">
                  ⏱
                </span>
                <span>
                  하루 참여 가능 횟수: <strong>1회</strong>
                </span>
              </div>
            </>
          )}

          {authSession && currentSeason && !entry && (
            <>
              <p className="ranking-support-copy ranking-support-copy-strong">
                이번 시즌은 {participationLabel}로 참가합니다.
              </p>
              <p className="ranking-support-copy">
                선택한 종목은 이번 주 동안 유지되며, 매일 무료 1회 고급스킬변경권 기능을 사용할 수 있습니다.
              </p>

              <button
                type="button"
                className="ranking-cta-card ranking-cta-button"
                onClick={handleOpenJoinConfirm}
                disabled={isJoining || showSettlementNotice}
              >
                <span>
                  {showSettlementNotice
                    ? "집계 중에는 참가할 수 없습니다"
                    : isJoining
                    ? "참가 처리 중..."
                    : `이번 시즌은 ${participationLabel}로 참가합니다`}
                </span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </button>

              <div className="ranking-status-card">
                <span className="ranking-status-icon" aria-hidden="true">
                  ⏱
                </span>
                <span>
                  하루 참여 가능 횟수: <strong>1회</strong>
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
              <div className="ranking-entry-row ranking-entry-row-skill">
                <span>현재 스킬</span>
                <SkillSetPreview category={entry.category} skillSet={entry.current_skills} />
              </div>
            </div>
          )}

          {authSession && entry && !todayRollLogId && !rolledSkillSet && (
            <div className="ranking-roll-box">
              <p className="ranking-support-copy">
                {showSettlementNotice
                  ? "집계 중에는 무료 고급스킬변경권을 사용할 수 없습니다."
                  : "오늘의 무료 고급스킬변경권 1회를 사용한 뒤 기존 결과와 변경 결과 중 하나를 선택합니다."}
              </p>

              <button
                type="button"
                className="ranking-cta-card ranking-cta-button"
                onClick={() => void handleRoll()}
                disabled={isRolling || showSettlementNotice}
              >
                <span>
                  {showSettlementNotice
                    ? "집계 중에는 실행할 수 없습니다"
                    : isRolling
                    ? "고급스킬변경권 실행 중..."
                    : "오늘의 무료 고급스킬변경권 실행"}
                </span>
                <span className="ranking-cta-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
        </section>

        <section className="ranking-card">
          <div className="ranking-section-head">
            <div className="ranking-section-icon">
              <SectionIcon kind="leaderboard" />
            </div>
            <div>
              <h2>리더보드</h2>
            </div>
          </div>

          <div className="ranking-toggle-row">
            {(["hitter", "pitcher_starter"] as RankingCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                className={`ranking-toggle-btn ${leaderboardCategory === category ? "active" : ""}`}
                onClick={() => setLeaderboardCategory(category)}
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
                  <th>스킬</th>
                  <th>도달 시각</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ranking-empty">
                      아직 집계된 참가자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rankings.map((row) => (
                    <tr key={row.entry_id}>
                      <td>{row.rank_position}</td>
                      <td>{row.display_name ?? "자동 닉네임"}</td>
                      <td>{row.current_score}</td>
                      <td className="ranking-skill-cell">
                        <SkillSetList category={row.category} skillSet={row.current_skills} />
                      </td>
                      <td>{formatReachedAt(row.score_reached_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showLoginPrompt && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowLoginPrompt(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ranking-login-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal-eyebrow">Ranking Challenge</p>
            <h2 id="ranking-login-prompt-title">로그인 후 참여할 수 있습니다</h2>
            <p className="modal-copy">
              고스변 랭킹챌린지는 Google 로그인 후 참여할 수 있습니다. 로그인하면 이번 시즌에{" "}
              {participationLabel} 카테고리로 참가를 진행할 수 있습니다.
            </p>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowLoginPrompt(false)}>
                닫기
              </button>
              <button
                type="button"
                className="primary-btn modal-google-btn"
                onClick={() => void handleGoogleLoginFromPrompt()}
              >
                Google 로그인
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinConfirm && authSession && currentSeason && !entry && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowJoinConfirm(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ranking-join-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal-eyebrow">Season Entry</p>
            <h2 id="ranking-join-confirm-title">이번 시즌 참가를 확정할까요?</h2>
            <p className="modal-copy">
              이번 시즌은 <strong>{participationLabel}</strong>로 참가합니다. 참가 후에는 이번 시즌 동안
              카테고리를 변경할 수 없습니다.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn modal-choice-btn"
                onClick={() => setShowJoinConfirm(false)}
                disabled={isJoining}
              >
                다시 선택
              </button>
              <button
                type="button"
                className="primary-btn modal-choice-btn"
                onClick={() => {
                  setShowJoinConfirm(false);
                  void handleJoinSeason();
                }}
                disabled={isJoining}
              >
                {isJoining ? "참가 처리 중..." : `${participationLabel}로 참가하기`}
              </button>
            </div>
          </div>
        </div>
      )}

      {authSession && entry && rolledSkillSet && rolledScore !== null && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card ranking-roll-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ranking-roll-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal-eyebrow">Advanced Skill Change</p>
            <h2 id="ranking-roll-modal-title">고급스킬변경권 결과 비교</h2>
            <p className="modal-copy">
              이전 스킬과 변경 스킬을 비교한 뒤, 이번 시즌에 반영할 결과를 선택하세요.
            </p>
            <p className="modal-copy ranking-roll-modal-note">
              새로고침하면 변경 결과는 취소되고 기존 스킬 유지로 처리됩니다.
            </p>

            <div className="ranking-roll-modal-stack">
              <section className="ranking-roll-modal-section">
                <div className="ranking-roll-modal-head">
                  <span>이전 스킬</span>
                  <strong>{entry.current_score}점</strong>
                </div>
                <SkillSetPreview category={entry.category} skillSet={entry.current_skills} />
                <button
                  type="button"
                  className="ghost-btn ranking-roll-modal-action modal-choice-btn"
                  onClick={() => void handleSelectResult("keep")}
                  disabled={isChoosing || showSettlementNotice}
                >
                  {showSettlementNotice
                    ? "집계 중"
                    : isChoosing
                    ? "처리 중..."
                    : "이전 스킬 유지"}
                </button>
              </section>

              <section className="ranking-roll-modal-section">
                <div className="ranking-roll-modal-head">
                  <span>변경 스킬</span>
                  <div className="ranking-roll-modal-score-wrap">
                    <strong>{rolledScore}점</strong>
                    {rollScoreDelta !== null && (
                      <span
                        className={`ranking-roll-delta ${
                          isRolledResultBetter
                            ? "better"
                            : rollScoreDelta < 0
                            ? "worse"
                            : "same"
                        }`}
                      >
                        {rollScoreDelta > 0 ? `+${rollScoreDelta}` : rollScoreDelta}
                      </span>
                    )}
                  </div>
                </div>
                <SkillSetPreview category={entry.category} skillSet={rolledSkillSet} />
                <button
                  type="button"
                  className="primary-btn ranking-roll-modal-action modal-choice-btn"
                  onClick={() => void handleSelectResult("replace")}
                  disabled={isChoosing || showSettlementNotice}
                >
                  {showSettlementNotice
                    ? "집계 중"
                    : isChoosing
                    ? "처리 중..."
                    : "변경 스킬 채택"}
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
