import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS, SKILL_GRADE_COLORS } from "./data/uiColors";
import {
  ensureProfile,
} from "./lib/auth";
import {
  adminGetToolUsageSummary,
  adminLogin,
  adminLogout,
  adminValidateSession,
  type AdminUsageSummary,
} from "./lib/admin";
import {
  recognizeSkillImage,
  skillOcrListUploads,
  skillOcrLogin,
  skillOcrLogout,
  skillOcrSaveUpload,
  skillOcrValidateSession,
} from "./lib/skillOcr";
import {
  calculateSkillOcrSummary,
  getPitcherModeFromPosition,
  recalculateSkillOcrPlayer,
  transformSkillOcrResponse,
} from "./lib/skillOcrTransform";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import {
  formatMatchedPercent,
  getDefaultLevels,
  getOrCreateToolUsageSessionId,
  getSkillScoreLabel,
  gradeRank,
  pickValidSkill,
} from "./lib/toolboxHelpers";
import AppChrome from "./components/AppChrome";
import HomeView from "./views/HomeView";
import RankingView from "./views/RankingView";
import AdminView from "./views/AdminView";
import SkillOcrView from "./views/SkillOcrView";
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
import type {
  SkillOcrApiResponse,
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
  SkillOcrSession,
} from "./types/ocr";
import { calculateSkillTotal } from "./utils/calculate";
import { judgeSkillResult, type ResultGrade } from "./utils/judge";
import { simulateAdvancedSkillChange } from "./utils/simulateAdvancedSkillChange";
import { simulateImpactSkillChangeUntilDoubleMajor } from "./utils/simulateImpactSkillChange";
import { logToolUsageEvent } from "./lib/toolUsage";

const DEFAULT_MODE: CalculatorMode = "hitter";
const DEFAULT_VIEW: ToolView = "home";
const DEFAULT_HITTER_POSITION_GROUP: HitterPositionGroup = "fielder";
const DEFAULT_CARD_TYPE: CardType = "signature";
const DEFAULT_LEVEL_1: SkillLevel = 6;
const DEFAULT_LEVEL_2: SkillLevel = 5;
const DEFAULT_LEVEL_3: SkillLevel = 5;
const AUTO_ROLL_LIMIT = 5000;
const IMPACT_CHANGE_LIMIT = 100000;
const ADMIN_PATH = "/admin";
const ADMIN_SESSION_KEY = "v26-admin-session";
const OCR_PATH = "/tyrant";
const OCR_SESSION_KEY = "v26-skill-ocr-session";
const OCR_FIXED_USERNAME = "tyrant";
const OCR_FIXED_PASSWORD = "tttt1199";

type ServiceView = "home" | "toolbox" | "ranking";
type ThemePreference = "light" | "dark";

const TARGET_GRADE_OPTIONS: Array<{ value: ResultGrade; label: string }> = [
  { value: "C", label: "C 이상" },
  { value: "A", label: "A 이상" },
  { value: "S", label: "S 이상" },
  { value: "SSR+", label: "SSR+ 이상" },
];

const RESULT_GRADE_GUIDE: Array<{ grade: ResultGrade; title: string; description: string }> = [
  { grade: "F", title: "F", description: "일스변도 이렇게는 안나오겠다" },
  { grade: "C", title: "C", description: "카드가 제성능을 발휘하기엔 모자람" },
  { grade: "A", title: "A", description: "타협" },
  { grade: "S", title: "S", description: "사장님 아니면 스탑" },
  { grade: "SSR+", title: "SSR+", description: "종결" },
];

const CARD_TYPE_OPTIONS = (Object.entries(CARD_TYPE_LABELS) as Array<[CardType, string]>).map(
  ([value, label]) => ({
    value,
    label,
  })
);

const SEO_FAQ = [
  {
    question: "V26 스킬 계산기는 무엇을 계산하나요?",
    answer:
      "타자와 투수 카드의 스킬 조합 점수, 기준표 확률, 등급을 계산합니다. 카드 타입별 점수 차이와 등급 기준도 함께 확인할 수 있습니다.",
  },
  {
    question: "고스변 시뮬은 어떤 용도인가요?",
    answer:
      "고급 스킬 변경권 사용 결과를 빠르게 확인하는 시뮬레이터입니다. 1회 사용 결과와 목표 등급까지 자동 롤 결과를 함께 볼 수 있습니다.",
  },
  {
    question: "임팩트 변경 시뮬은 무엇을 확인하나요?",
    answer:
      "임팩트 카드에서 1번 스킬을 고정한 상태로 2번과 3번 스킬이 원하는 조건에 도달하는지 시뮬레이션합니다.",
  },
  {
    question: "타자와 투수 계산 기준은 같은가요?",
    answer:
      "기본 계산 방식은 같지만 사용되는 스킬 데이터와 기준표는 타자, 선발, 중계, 마무리마다 다르게 적용됩니다.",
  },
] as const;

function App() {
  const isAdminRoute =
    typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === ADMIN_PATH;
  const isOcrRoute =
    typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === OCR_PATH;
  const [toolView, setToolView] = useState<ToolView>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }

    const requestedView = new URL(window.location.href).searchParams.get("view");
    const validViews: ToolView[] = ["home", "calculator", "simulator", "impactChange", "ranking"];

    return requestedView && validViews.includes(requestedView as ToolView)
      ? (requestedView as ToolView)
      : DEFAULT_VIEW;
  });
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem("v26-theme");
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [mode, setMode] = useState<CalculatorMode>(DEFAULT_MODE);
  const [hitterPositionGroup, setHitterPositionGroup] =
    useState<HitterPositionGroup>(DEFAULT_HITTER_POSITION_GROUP);

  const [cardType, setCardType] = useState<CardType>(DEFAULT_CARD_TYPE);
  const [skill1, setSkill1] = useState("");
  const [skill2, setSkill2] = useState("");
  const [skill3, setSkill3] = useState("");

  const [level1, setLevel1] = useState<SkillLevel>(DEFAULT_LEVEL_1);
  const [level2, setLevel2] = useState<SkillLevel>(DEFAULT_LEVEL_2);
  const [level3, setLevel3] = useState<SkillLevel>(DEFAULT_LEVEL_3);

  const [simRollCount, setSimRollCount] = useState(0);
  const [simBestScore, setSimBestScore] = useState<number | null>(null);
  const [simAutoRollOccurrenceCount, setSimAutoRollOccurrenceCount] = useState<number | null>(null);
  const [targetGrade, setTargetGrade] = useState<ResultGrade>("S");
  const [impactSessionRollCount, setImpactSessionRollCount] = useState(0);
  const [impactLastSuccessRollCount, setImpactLastSuccessRollCount] = useState<number | null>(null);
  const [impactLastMessage, setImpactLastMessage] = useState(
    "버튼을 누르면 2, 3번 스킬이 둘 다 메이저가 나올 때까지 자동으로 돌립니다."
  );
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
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
  const [ocrPasswordInput, setOcrPasswordInput] = useState("");
  const [ocrAuthError, setOcrAuthError] = useState<string | null>(null);
  const [ocrCheckingSession, setOcrCheckingSession] = useState(isOcrRoute);
  const [ocrSession, setOcrSession] = useState<SkillOcrSession | null>(null);
  const [ocrUploads, setOcrUploads] = useState<SkillOcrSavedUpload[]>([]);
  const [ocrUploadsLoading, setOcrUploadsLoading] = useState(false);
  const [ocrUploadsError, setOcrUploadsError] = useState<string | null>(null);
  const [ocrUploadBusyRole, setOcrUploadBusyRole] = useState<SkillOcrRole | null>(null);
  const [ocrUploadError, setOcrUploadError] = useState<string | null>(null);
  const [ocrDraftPlayers, setOcrDraftPlayers] = useState<SkillOcrSelectedPlayer[]>([]);
  const [ocrDraftImageName, setOcrDraftImageName] = useState<string | null>(null);
  const [ocrDraftRole, setOcrDraftRole] = useState<SkillOcrRole | null>(null);
  const [ocrDraftRawResponse, setOcrDraftRawResponse] = useState<SkillOcrApiResponse | null>(null);
  const [ocrDraftTotalScore, setOcrDraftTotalScore] = useState(0);
  const [ocrDraftAverageScore, setOcrDraftAverageScore] = useState(0);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrSavedUpload, setOcrSavedUpload] = useState<SkillOcrSavedUpload | null>(null);
  const [toolUsageSessionId] = useState(() => getOrCreateToolUsageSessionId());
  const loggedToolViewsRef = useRef<Set<string>>(new Set());
  const lastProfileSyncKeyRef = useRef<string | null>(null);
  const applyingPopStateRef = useRef(false);

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

  const hasAnySkillSelection = Boolean(resolvedSkill1 || resolvedSkill2 || resolvedSkill3);

  const totalScore =
    gameData && hasAnySkillSelection
      ? calculateSkillTotal({
          cardType: activeCardType,
          skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
          skillLevels: [level1, level2, level3],
          scoreTable: gameData.scoreTable,
        })
      : null;

  const judgeResult =
    gameData && totalScore !== null
      ? judgeSkillResult(gameData.thresholds, activeCardType, totalScore)
      : null;

  const resultGradeColor = judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#b7bfd2";
  const judgeGrade = judgeResult?.grade ?? "-";
  const matchedPercentLabel = hasAnySkillSelection
    ? formatMatchedPercent(judgeResult?.matchedPercent ?? null)
    : "-";
  const totalScoreDisplay = totalScore ?? "-";
  const supabaseReady = isSupabaseConfigured();
  const activeService: ServiceView =
    toolView === "home" ? "home" : toolView === "ranking" ? "ranking" : "toolbox";
  const toolboxToolView: Exclude<ToolView, "home" | "ranking"> =
    toolView === "home" || toolView === "ranking" ? "calculator" : toolView;
  const faqStructuredData = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: SEO_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }),
    []
  );

  useEffect(() => {
    window.localStorage.setItem("v26-theme", theme);
  }, [theme]);

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
    if (!isOcrRoute) {
      return;
    }

    const storedSessionToken = window.localStorage.getItem(OCR_SESSION_KEY);

    if (!storedSessionToken) {
      setOcrCheckingSession(false);
      setOcrSession(null);
      return;
    }

    void (async () => {
      try {
        const session = await skillOcrValidateSession(storedSessionToken);

        if (!session) {
          window.localStorage.removeItem(OCR_SESSION_KEY);
          setOcrSession(null);
          setOcrCheckingSession(false);
          return;
        }

        setOcrSession(session);
      } catch {
        window.localStorage.removeItem(OCR_SESSION_KEY);
        setOcrSession(null);
      } finally {
        setOcrCheckingSession(false);
      }
    })();
  }, [isOcrRoute]);

  useEffect(() => {
    if (!isOcrRoute || !ocrSession) {
      return;
    }

    void (async () => {
      try {
        setOcrUploadsLoading(true);
        setOcrUploadsError(null);
        const uploads = await skillOcrListUploads(ocrSession.session_token, 20);
        setOcrUploads(uploads);
      } catch (error) {
        setOcrUploadsError(
          error instanceof Error ? error.message : "OCR 저장 기록을 불러오지 못했습니다."
        );
      } finally {
        setOcrUploadsLoading(false);
      }
    })();
  }, [isOcrRoute, ocrSession]);

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
    if (isAdminRoute || isOcrRoute) {
      return;
    }

    const handlePopState = () => {
      const requestedView = new URL(window.location.href).searchParams.get("view");
      const validViews: ToolView[] = ["home", "calculator", "simulator", "impactChange", "ranking"];
      applyingPopStateRef.current = true;
      setToolView(
        requestedView && validViews.includes(requestedView as ToolView)
          ? (requestedView as ToolView)
          : DEFAULT_VIEW
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAdminRoute, isOcrRoute]);

  useEffect(() => {
    if (isAdminRoute || isOcrRoute) {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get("view") === toolView) {
      applyingPopStateRef.current = false;
      return;
    }

    url.searchParams.set("view", toolView);
    if (applyingPopStateRef.current) {
      window.history.replaceState({}, "", url.toString());
      applyingPopStateRef.current = false;
      return;
    }

    window.history.pushState({}, "", url.toString());
  }, [isAdminRoute, isOcrRoute, toolView]);

  useEffect(() => {
    if (
      isAdminRoute ||
      isOcrRoute ||
      toolView === "ranking" ||
      !supabaseReady ||
      !toolUsageSessionId
    ) {
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
  }, [activeCardType, isAdminRoute, isOcrRoute, mode, supabaseReady, toolUsageSessionId, toolView]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;
    const syncProfileForSession = async (session: Session | null) => {
      if (!session) {
        lastProfileSyncKeyRef.current = null;
        return;
      }

      const syncKey = `${session.user.id}:${session.access_token}`;
      if (lastProfileSyncKeyRef.current === syncKey) {
        return;
      }

      lastProfileSyncKeyRef.current = syncKey;

      try {
        await ensureProfile(session);
        if (!isMounted) return;
        setAuthError(null);
      } catch (profileError) {
        if (!isMounted) return;
        lastProfileSyncKeyRef.current = null;
        setAuthError(
          profileError instanceof Error
            ? profileError.message
            : "프로필 정보를 저장하지 못했습니다."
        );
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthSession(data.session);
      void syncProfileForSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setAuthSession(session);
      void syncProfileForSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const resetSimulationSession = () => {
    setSimRollCount(0);
    setSimBestScore(null);
    setSimAutoRollOccurrenceCount(null);
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

    setSkill1("");
    setSkill2("");
    setSkill3("");

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
    setSimAutoRollOccurrenceCount(null);

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

      if (gradeRank(nextJudgeResult.grade) >= gradeRank(targetGrade)) {
        break;
      }
    }

    setSkill1(finalSkillIds[0]);
    setSkill2(finalSkillIds[1]);
    setSkill3(finalSkillIds[2]);
    setSimRollCount((count) => count + tryCount);
    setSimBestScore(bestScoreInRun);
    setSimAutoRollOccurrenceCount(tryCount);

    const autoRollSuccess =
      finalJudgeResult && gradeRank(finalJudgeResult.grade) >= gradeRank(targetGrade);

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
    if (nextToolView === "home" || nextToolView === "ranking") {
      setToolView(nextToolView);
      return;
    }

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

  const handleOcrLogin = async () => {
    if (!ocrPasswordInput.trim()) {
      setOcrAuthError("비밀번호를 입력해주세요.");
      return;
    }

    if (ocrPasswordInput !== OCR_FIXED_PASSWORD) {
      setOcrAuthError("비밀번호가 올바르지 않습니다.");
      return;
    }

    try {
      const session = await skillOcrLogin(OCR_FIXED_USERNAME, ocrPasswordInput);
      setOcrAuthError(null);
      setOcrSession(session);
      window.localStorage.setItem(OCR_SESSION_KEY, session.session_token);
    } catch (error) {
      setOcrAuthError(error instanceof Error ? error.message : "OCR 로그인에 실패했습니다.");
    }
  };

  const handleOcrLogout = async () => {
    const sessionToken = ocrSession?.session_token ?? window.localStorage.getItem(OCR_SESSION_KEY);

    if (sessionToken) {
      try {
        await skillOcrLogout(sessionToken);
      } catch {
        // Clear the client session even if the server-side token is already invalid.
      }
    }

    setOcrSession(null);
    setOcrPasswordInput("");
    setOcrAuthError(null);
    setOcrUploads([]);
    setOcrUploadError(null);
    setOcrDraftPlayers([]);
    setOcrDraftImageName(null);
    setOcrDraftRole(null);
    setOcrDraftRawResponse(null);
    setOcrDraftTotalScore(0);
    setOcrDraftAverageScore(0);
    setOcrSaving(false);
    setOcrSavedUpload(null);
    window.localStorage.removeItem(OCR_SESSION_KEY);
  };

  const handleOcrUploadImage = async (role: SkillOcrRole, file: File) => {
    setOcrUploadBusyRole(role);
    setOcrUploadError(null);
    setOcrDraftPlayers([]);
    setOcrDraftImageName(file.name);
    setOcrDraftRole(role);
    setOcrDraftRawResponse(null);
    setOcrDraftTotalScore(0);
    setOcrDraftAverageScore(0);
    setOcrSavedUpload(null);

    try {
      const response = await recognizeSkillImage({ role, file });
      const transformed = transformSkillOcrResponse(response, role);

      setOcrDraftRawResponse(response);
      setOcrDraftPlayers(transformed.players);
      setOcrDraftTotalScore(transformed.totalScore);
      setOcrDraftAverageScore(transformed.averageScore);
    } catch (error) {
      setOcrUploadError(
        error instanceof Error ? error.message : "이미지를 인식하지 못했습니다."
      );
    } finally {
      setOcrUploadBusyRole(null);
    }
  };

  const handleOcrSaveDraft = async () => {
    if (!ocrSession || !ocrDraftRole || !ocrDraftRawResponse) {
      setOcrUploadError("저장할 OCR 결과가 없습니다.");
      return;
    }

    const selectedPlayers = ocrDraftPlayers.filter((player) => player.selected);

    if (selectedPlayers.length === 0) {
      setOcrUploadError("최소 1명 이상 선택해야 저장할 수 있습니다.");
      return;
    }

    try {
      setOcrSaving(true);
      setOcrUploadError(null);
      const savedUpload = await skillOcrSaveUpload({
        sessionToken: ocrSession.session_token,
        role: ocrDraftRole,
        imageName: ocrDraftImageName,
        requestId: ocrDraftRawResponse.request_id,
        rawResponse: ocrDraftRawResponse,
        selectedPlayers,
        totalScore: ocrDraftTotalScore,
        averageScore: ocrDraftAverageScore,
      });
      const uploads = await skillOcrListUploads(ocrSession.session_token, 20);

      setOcrSavedUpload(savedUpload);
      setOcrUploads(uploads);
      setOcrDraftPlayers([]);
      setOcrDraftImageName(null);
      setOcrDraftRole(null);
      setOcrDraftRawResponse(null);
      setOcrDraftTotalScore(0);
      setOcrDraftAverageScore(0);
    } catch (error) {
      setOcrUploadError(error instanceof Error ? error.message : "OCR 결과 저장에 실패했습니다.");
    } finally {
      setOcrSaving(false);
    }
  };

  const updateOcrDraftPlayers = (
    updater: (players: SkillOcrSelectedPlayer[]) => SkillOcrSelectedPlayer[]
  ) => {
    setOcrDraftPlayers((currentPlayers) => {
      const nextPlayers = updater(currentPlayers);
      const summary = calculateSkillOcrSummary(nextPlayers);
      setOcrDraftTotalScore(summary.totalScore);
      setOcrDraftAverageScore(summary.averageScore);
      return nextPlayers;
    });
  };

  const handleOcrPlayerSelectedChange = (playerIndex: number, selected: boolean) => {
    updateOcrDraftPlayers((players) => {
      const selectedCount = players.filter((player) => player.selected).length;

      if (selected && selectedCount >= 9 && !players[playerIndex]?.selected) {
        setOcrUploadError("최대 9명까지만 선택할 수 있습니다.");
        return players;
      }

      setOcrUploadError(null);
      return players.map((player, index) =>
        index === playerIndex ? { ...player, selected } : player
      );
    });
  };

  const handleOcrPlayerCardTypeChange = (playerIndex: number, nextCardType: CardType) => {
    updateOcrDraftPlayers((players) =>
      players.map((player, index) =>
        index === playerIndex
          ? recalculateSkillOcrPlayer({ ...player, cardType: nextCardType })
          : player
      )
    );
  };

  const handleOcrPlayerPositionChange = (playerIndex: number, nextPosition: string) => {
    updateOcrDraftPlayers((players) =>
      players.map((player, index) =>
        index === playerIndex
          ? recalculateSkillOcrPlayer({
              ...player,
              position: nextPosition,
              calculatorMode: getPitcherModeFromPosition(nextPosition),
            })
          : player
      )
    );
  };

  const handleOcrSkillChange = (
    playerIndex: number,
    slot: number,
    skillId: string,
    skillName: string
  ) => {
    updateOcrDraftPlayers((players) =>
      players.map((player, index) => {
        if (index !== playerIndex) {
          return player;
        }

        return recalculateSkillOcrPlayer({
          ...player,
          skills: player.skills.map((skill) =>
            skill.slot === slot
              ? {
                  ...skill,
                  skillId: skillId || null,
                  skillName: skillName || null,
                  matched: Boolean(skillId),
                }
              : skill
          ),
        });
      })
    );
  };

  const handleOcrSkillLevelChange = (
    playerIndex: number,
    slot: number,
    level: SkillLevel
  ) => {
    updateOcrDraftPlayers((players) =>
      players.map((player, index) => {
        if (index !== playerIndex) {
          return player;
        }

        return recalculateSkillOcrPlayer({
          ...player,
          skills: player.skills.map((skill) =>
            skill.slot === slot ? { ...skill, level } : skill
          ),
        });
      })
    );
  };

  const handleGoHome = () => {
    window.location.href = `${window.location.origin}/?view=home`;
  };

  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "라이트 테마로 변경" : "다크 테마로 변경"}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" className="ui-icon">
            <path
              d="M12 4V2h2v2h-2Zm0 18v-2h2v2h-2ZM4.22 5.64 5.64 4.22l1.41 1.42-1.41 1.41-1.42-1.41Zm12.73 12.72 1.41-1.41 1.42 1.41-1.42 1.42-1.41-1.42ZM2 14v-2h2v2H2Zm18 0v-2h2v2h-2ZM4.22 18.36l1.42-1.41 1.41 1.41-1.41 1.42-1.42-1.42ZM16.95 5.64l1.41-1.42 1.42 1.42-1.42 1.41-1.41-1.41ZM13 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="ui-icon">
            <path
              d="M20.2 15.6A8.2 8.2 0 0 1 8.4 3.8 8.2 8.2 0 1 0 20.2 15.6Z"
              fill="currentColor"
            />
          </svg>
        )}
      </span>
      <span>{theme === "dark" ? "라이트" : "다크"}</span>
    </button>
  );

  if (isAdminRoute) {
    return (
      <div className="app-bg" data-theme={theme}>
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

  if (isOcrRoute) {
    return (
      <div className="app-bg" data-theme={theme}>
        <div className="app-shell">
          <SkillOcrView
            session={ocrSession}
            checkingSession={ocrCheckingSession}
            passwordInput={ocrPasswordInput}
            authError={ocrAuthError}
            uploads={ocrUploads}
            uploadsLoading={ocrUploadsLoading}
            uploadsError={ocrUploadsError}
            uploadBusyRole={ocrUploadBusyRole}
            uploadError={ocrUploadError}
            draftPlayers={ocrDraftPlayers}
            draftTotalScore={ocrDraftTotalScore}
            draftAverageScore={ocrDraftAverageScore}
            saving={ocrSaving}
            savedUpload={ocrSavedUpload}
            onPasswordChange={(value) => {
              setOcrPasswordInput(value);
              if (ocrAuthError) {
                setOcrAuthError(null);
              }
            }}
            onLogin={() => void handleOcrLogin()}
            onLogout={() => void handleOcrLogout()}
            onUploadImage={(role, file) => void handleOcrUploadImage(role, file)}
            onPlayerSelectedChange={handleOcrPlayerSelectedChange}
            onPlayerCardTypeChange={handleOcrPlayerCardTypeChange}
            onPlayerPositionChange={handleOcrPlayerPositionChange}
            onSkillChange={handleOcrSkillChange}
            onSkillLevelChange={handleOcrSkillLevelChange}
            onSaveDraft={() => void handleOcrSaveDraft()}
            onSelectSavedUpload={setOcrSavedUpload}
            onClearSavedUpload={() => setOcrSavedUpload(null)}
            onGoHome={handleGoHome}
          />
          <Analytics />
          <SpeedInsights />
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg" data-theme={theme}>
      <div className="app-shell">
        <AppChrome>
          {authError && <p className="auth-error">{authError}</p>}

          {toolView === "home" ? (
            <HomeView onSelectView={handleToolViewChange} themeAction={themeToggle} />
          ) : toolView === "ranking" ? (
            <div className="main-stage tool-page ranking-page">
              <div className="page-toolbar tool-page-hero ranking-page-hero">
                <div className="page-title-block">
                  <span className="page-kicker">Leaderboard</span>
                  <h1>고스변 랭킹챌린지</h1>
                  <p>하루 한 번 기록하고 이번 주 최고 점수를 경쟁합니다.</p>
                </div>
                <div className="page-toolbar-actions">
                  {themeToggle}
                  <button type="button" className="ghost-btn page-home-btn" onClick={() => setToolView("home")}>
                    홈으로
                  </button>
                </div>
              </div>
              <main className="ranking-page-layout">
                <section className="ranking-stage">
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
              judgeGrade={judgeGrade}
              totalScore={gameData ? totalScoreDisplay : "-"}
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
              simAutoRollOccurrenceCount={simAutoRollOccurrenceCount}
              targetGrade={targetGrade}
              targetGradeOptions={TARGET_GRADE_OPTIONS}
              impactSessionRollCount={impactSessionRollCount}
              impactLastSuccessRollCount={impactLastSuccessRollCount}
              impactLastMessage={impactLastMessage}
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
              onGoHome={() => setToolView("home")}
              themeAction={themeToggle}
              onRollOnce={handleAdvancedSkillChangeRoll}
              onAutoRoll={handleAutoRollToTarget}
              onImpactRoll={handleImpactChangeRoll}
              resetImpactChangeSession={resetImpactChangeSession}
            />
          )}
        </AppChrome>

        {activeService === "toolbox" && (
          <section className="panel panel-main panel-wide seo-panel seo-panel-deferred" aria-labelledby="seo-guide-title">
            <div className="seo-copy">
              <h2 id="seo-guide-title">V26 스킬 계산기 안내</h2>
              <p>
                V26 스킬 계산기는 타자와 투수 카드의 스킬 점수, 기준표 확률, 등급을 빠르게
                확인하기 위한 계산기다. 시그니처, 골든글러브, 국가대표, 임팩트 카드 기준을
                함께 비교할 수 있다.
              </p>
              <p>
                고스변 시뮬에서는 고급 스킬 변경권 결과를 1회 사용 또는 목표 등급까지 자동 롤로
                확인할 수 있고, 임팩트 변경 시뮬에서는 1번 고정 스킬 기준으로 2번과 3번
                스킬 조합을 확인할 수 있다.
              </p>
            </div>

            <div className="seo-faq">
              <h3>자주 묻는 질문</h3>
              <div className="seo-faq-list">
                {SEO_FAQ.map((item) => (
                  <article key={item.question} className="seo-faq-item">
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>

            </div>

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: faqStructuredData }}
            />
          </section>
        )}

        <footer className="app-footer">made by 우주</footer>
        <Analytics />
        <SpeedInsights  />
      </div>
    </div>
  );
}

export default App;
