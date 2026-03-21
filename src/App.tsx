import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS, SKILL_GRADE_COLORS } from "./data/uiColors";
import {
  ensureProfile,
  getMyProfile,
  signInWithGoogle,
  signOut,
} from "./lib/auth";
import {
  adminGetToolUsageSummary,
  adminLogin,
  adminLogout,
  adminValidateSession,
  type AdminUsageSummary,
} from "./lib/admin";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import AppChrome from "./components/AppChrome";
import RankingView from "./views/RankingView";
import AdminView from "./views/AdminView";
import ToolboxStage from "./views/ToolboxStage";
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
import { logToolUsageEvent } from "./lib/toolUsage";

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
const ADMIN_PATH = "/admin";
const ADMIN_SESSION_KEY = "v26-admin-session";
const TOOL_USAGE_SESSION_KEY = "v26-tool-usage-session";

type ServiceView = "toolbox" | "ranking";

const SERVICE_INFO: Record<ServiceView, { title: string; subtitle: string }> = {
  ranking: {
    title: "고스변 랭킹챌린지",
    subtitle: "하루 한 번, 이번 주 최고 점수를 겨루는 챌린지",
  },
  toolbox: {
    title: "v26 스킬 계산",
    subtitle: "스킬 계산기와 시뮬레이터를 한 곳에서 확인",
  },
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

function getOrCreateToolUsageSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const stored = window.sessionStorage.getItem(TOOL_USAGE_SESSION_KEY);
  if (stored) {
    return stored;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `tool-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.sessionStorage.setItem(TOOL_USAGE_SESSION_KEY, nextId);
  return nextId;
}

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
  const isAdminRoute =
    typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === ADMIN_PATH;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toolView, setToolView] = useState<ToolView>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }

    const requestedView = new URL(window.location.href).searchParams.get("view");
    const validViews: ToolView[] = ["calculator", "simulator", "impactChange", "ranking"];

    return requestedView && validViews.includes(requestedView as ToolView)
      ? (requestedView as ToolView)
      : DEFAULT_VIEW;
  });
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
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [adminCheckingSession, setAdminCheckingSession] = useState(isAdminRoute);
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.sessionStorage.getItem(ADMIN_SESSION_KEY));
  });
  const [adminStats, setAdminStats] = useState<AdminUsageSummary | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminStatsError, setAdminStatsError] = useState<string | null>(null);
  const [toolUsageSessionId] = useState(() => getOrCreateToolUsageSessionId());
  const loggedToolViewsRef = useRef<Set<string>>(new Set());

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
  const authDisplayName = profileDisplayName;
  const supabaseReady = isSupabaseConfigured();
  const activeService: ServiceView = toolView === "ranking" ? "ranking" : "toolbox";
  const toolboxToolView: Exclude<ToolView, "ranking"> =
    toolView === "ranking" ? "calculator" : toolView;
  const serviceInfo = SERVICE_INFO[activeService];

  useEffect(() => {
    if (!isAdminRoute) {
      return;
    }

    const storedSessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (!storedSessionToken) {
      setAdminCheckingSession(false);
      setAdminUnlocked(false);
      return;
    }

    void (async () => {
      try {
        const session = await adminValidateSession(storedSessionToken);

        if (!session) {
          window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
          setAdminUnlocked(false);
          setAdminCheckingSession(false);
          return;
        }

        setAdminUnlocked(true);
      } catch {
        window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setAdminUnlocked(false);
      } finally {
        setAdminCheckingSession(false);
      }
    })();
  }, [isAdminRoute]);

  useEffect(() => {
    if (!isAdminRoute || !adminUnlocked) {
      return;
    }

    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionToken) {
      return;
    }

    void (async () => {
      try {
        setAdminStatsLoading(true);
        setAdminStatsError(null);
        const summary = await adminGetToolUsageSummary(sessionToken);
        setAdminStats(summary);
      } catch (error) {
        setAdminStatsError(
          error instanceof Error ? error.message : "통계 정보를 불러오지 못했습니다."
        );
      } finally {
        setAdminStatsLoading(false);
      }
    })();
  }, [adminUnlocked, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("view", toolView);
    window.history.replaceState({}, "", url.toString());
  }, [isAdminRoute, toolView]);

  useEffect(() => {
    if (isAdminRoute || toolView === "ranking" || !supabaseReady || !toolUsageSessionId) {
      return;
    }

    const viewKey = `${toolUsageSessionId}:${toolView}`;
    if (loggedToolViewsRef.current.has(viewKey)) {
      return;
    }

    loggedToolViewsRef.current.add(viewKey);

    void logToolUsageEvent({
      tool: "tool_view",
      mode,
      cardType: activeCardType,
      metadata: {
        session_id: toolUsageSessionId,
        view: toolView,
      },
    }).catch(() => {
      loggedToolViewsRef.current.delete(viewKey);
    });
  }, [activeCardType, isAdminRoute, mode, supabaseReady, toolUsageSessionId, toolView]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthSession(data.session);

      if (data.session) {
        void (async () => {
          try {
            await ensureProfile(data.session);
            const profile = await getMyProfile();
            if (!isMounted) return;
            setProfileDisplayName(profile?.display_name?.trim() || null);
          } catch (profileError) {
            if (!isMounted) return;
            setAuthError(
              profileError instanceof Error
                ? profileError.message
                : "프로필 정보를 저장하지 못했습니다."
            );
          }
        })();
      } else {
        setProfileDisplayName(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setAuthSession(session);

      if (session) {
        void (async () => {
          try {
            await ensureProfile(session);
            const profile = await getMyProfile();
            if (!isMounted) return;
            setProfileDisplayName(profile?.display_name?.trim() || null);
          } catch (profileError) {
            if (!isMounted) return;
            setAuthError(
              profileError instanceof Error
                ? profileError.message
                : "프로필 정보를 저장하지 못했습니다."
            );
          }
        })();
      } else {
        setProfileDisplayName(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


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
    const nextJudgeResult = judgeSkillResult(gameData.thresholds, activeCardType, nextTotalScore);

    setSimRollCount((count) => count + 1);
    setSimBestScore((bestScore) =>
      bestScore === null ? nextTotalScore : Math.max(bestScore, nextTotalScore)
    );
    setSimLastMessage(`${simRollCount + 1}회차 결과 반영 완료`);

    void logToolUsageEvent({
      tool: "advanced_manual_roll",
      mode,
      cardType: activeCardType,
      rollCount: 1,
      resultScore: nextTotalScore,
      resultGrade: nextJudgeResult.grade,
      metadata: {
        session_id: toolUsageSessionId,
      },
    }).catch(() => {});
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

    const autoRollSuccess =
      finalJudgeResult && GRADE_RANK[finalJudgeResult.grade] >= GRADE_RANK[targetGrade];

    if (autoRollSuccess) {
      setSimLastMessage(`${tryCount}번 만에 ${targetGrade} 이상 달성`);
    } else {
      setSimLastMessage(`${AUTO_ROLL_LIMIT}번 안에 ${targetGrade} 이상이 나오지 않았음`);
    }

    void logToolUsageEvent({
      tool: "advanced_auto_roll",
      mode,
      cardType: activeCardType,
      targetGrade,
      rollCount: tryCount,
      resultScore:
        finalJudgeResult && finalSkillIds.every(Boolean)
          ? calculateSkillTotal({
              cardType: activeCardType,
              skillIds: finalSkillIds,
              skillLevels: [level1, level2, level3],
              scoreTable: gameData.scoreTable,
            })
          : null,
      resultGrade: finalJudgeResult?.grade ?? null,
      metadata: {
        session_id: toolUsageSessionId,
        success: Boolean(autoRollSuccess),
      },
    }).catch(() => {});
  };

  const handleToolViewChange = (nextToolView: ToolView) => {
    if (nextToolView === "impactChange") {
      const [impactLevel1, impactLevel2, impactLevel3] = getDefaultLevels("impact");
      setToolView("impactChange");
      setLevel1(impactLevel1);
      setLevel2(impactLevel2);
      setLevel3(impactLevel3);
      resetImpactChangeSession();
      return;
    }

    setToolView(nextToolView);
  };

  const handleServiceChange = (nextService: ServiceView) => {
    if (nextService === "ranking") {
      setToolView("ranking");
      return;
    }

    if (toolView === "ranking") {
      setToolView("calculator");
      return;
    }
  };

  const handleModeChange = (nextMode: CalculatorMode) => {
    setMode(nextMode);
    resetSimulationSession();
    resetImpactChangeSession();
  };

  const handleHitterPositionGroupChange = (nextGroup: HitterPositionGroup) => {
    setHitterPositionGroup(nextGroup);
    resetSimulationSession();
    resetImpactChangeSession();
  };

  const handleCardTypeChange = (nextCardType: CardType) => {
    const [defaultLevel1, defaultLevel2, defaultLevel3] = getDefaultLevels(nextCardType);

    setCardType(nextCardType);
    setLevel1(defaultLevel1);
    setLevel2(defaultLevel2);
    setLevel3(defaultLevel3);
    resetSimulationSession();
  };
  const handleGoogleSignIn = async () => {
    setIsAuthBusy(true);
    setAuthError(null);

    try {
      const redirectTo =
        `${window.location.origin}?view=${toolView}`;
      await signInWithGoogle(redirectTo);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Google ??? ? ??? ??????."
      );
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthBusy(true);
    setAuthError(null);

    try {
      await signOut();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "???? ? ??? ??????.");
    } finally {
      setIsAuthBusy(false);
    }
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
    } else {
      setImpactLastMessage(`${IMPACT_CHANGE_LIMIT}번 안에 2, 3번 메이저가 나오지 않았음`);
    }

    void logToolUsageEvent({
      tool: "impact_auto_roll",
      mode,
      cardType: "impact",
      targetGrade: "DOUBLE_MAJOR",
      rollCount: result.rollCount,
      resultGrade: result.success ? "DOUBLE_MAJOR" : null,
      metadata: {
        session_id: toolUsageSessionId,
        success: result.success,
        fixedSkillId: resolvedSkill1,
      },
    }).catch(() => {});
  };

  const handleAdminUnlock = async () => {
    if (!adminUsernameInput.trim() || !adminPasswordInput.trim()) {
      setAdminPasswordError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      const session = await adminLogin(adminUsernameInput.trim(), adminPasswordInput);
      setAdminPasswordError(null);
      setAdminUnlocked(true);
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, session.session_token);
    } catch (error) {
      setAdminPasswordError(
        error instanceof Error ? error.message : "관리자 로그인에 실패했습니다."
      );
    }
  };

  const handleAdminLock = async () => {
    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (sessionToken) {
      try {
        await adminLogout(sessionToken);
      } catch {
        // Ignore logout RPC failures and clear client session anyway.
      }
    }

    setAdminUnlocked(false);
    setAdminUsernameInput("");
    setAdminPasswordInput("");
    setAdminPasswordError(null);
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  };

  const handleGoHome = () => {
    window.location.href = `${window.location.origin}/?view=ranking`;
  };

  if (isAdminRoute) {
    return (
      <div className="app-bg">
        <div className="app-shell">
          <AdminView
            unlocked={adminUnlocked}
            checkingSession={adminCheckingSession}
            usernameInput={adminUsernameInput}
            passwordInput={adminPasswordInput}
            passwordError={adminPasswordError}
            stats={adminStats}
            statsLoading={adminStatsLoading}
            statsError={adminStatsError}
            onUsernameChange={(value) => {
              setAdminUsernameInput(value);
              if (adminPasswordError) {
                setAdminPasswordError(null);
              }
            }}
            onPasswordChange={(value) => {
              setAdminPasswordInput(value);
              if (adminPasswordError) {
                setAdminPasswordError(null);
              }
            }}
            onUnlock={() => void handleAdminUnlock()}
            onLock={() => void handleAdminLock()}
            onGoHome={handleGoHome}
          />
          <Analytics />
          <SpeedInsights  />
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      <div className="app-shell">
        <AppChrome
          activeService={activeService}
          serviceTitle={serviceInfo.title}
          serviceSubtitle={serviceInfo.subtitle}
          mobileNavOpen={mobileNavOpen}
          supabaseReady={supabaseReady}
          authDisplayName={authDisplayName}
          isAuthBusy={isAuthBusy}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onCloseMobileNav={() => setMobileNavOpen(false)}
          onSelectService={handleServiceChange}
          onGoogleSignIn={() => void handleGoogleSignIn()}
          onSignOut={() => void handleSignOut()}
        >
          {authError && <p className="auth-error">{authError}</p>}

          {toolView === "ranking" ? (
            <div className="main-stage">
              <main className="layout-grid">
                <section className="panel panel-main panel-wide">
                  <RankingView authSession={authSession} supabaseReady={supabaseReady} />
                </section>
              </main>
            </div>
          ) : (
            <ToolboxStage
              toolView={toolboxToolView}
              mode={mode}
              hitterPositionGroup={hitterPositionGroup}
              cardType={cardType}
              activeCardType={activeCardType}
              gameData={gameData}
              pitcherRole={pitcherRole}
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
              impactSessionRollCount={impactSessionRollCount}
              impactLastSuccessRollCount={impactLastSuccessRollCount}
              impactLastMessage={impactLastMessage}
              encouragementMessage={encouragementMessage}
              summaryMessage={summaryMessage}
              cardTypeOptions={CARD_TYPE_OPTIONS}
              resultGradeGuide={RESULT_GRADE_GUIDE}
              getSkillScoreLabel={getSkillScoreLabel}
              setSkill1={setSkill1}
              setSkill2={setSkill2}
              setSkill3={setSkill3}
              setLevel1={setLevel1}
              setLevel2={setLevel2}
              setLevel3={setLevel3}
              setTargetGrade={setTargetGrade}
              onModeChange={handleModeChange}
              onHitterPositionGroupChange={handleHitterPositionGroupChange}
              onCardTypeChange={handleCardTypeChange}
              onReset={handleReset}
              onToolViewChange={handleToolViewChange}
              onRollOnce={handleAdvancedSkillChangeRoll}
              onAutoRoll={handleAutoRollToTarget}
              onImpactRoll={handleImpactChangeRoll}
              resetImpactChangeSession={resetImpactChangeSession}
            />
          )}
        </AppChrome>

        <div className="support-contact-banner">
          버그나 필요한 기능이 있으면 <a href="mailto:leeqwezxcasd@gmail.com">leeqwezxcasd@gmail.com</a>
          로 보내주세요.
        </div>
        <footer className="app-footer">made by 우주</footer>
        <Analytics />
        <SpeedInsights  />
      </div>
    </div>
  );
}

export default App;
