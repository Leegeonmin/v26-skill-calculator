import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS, SKILL_GRADE_COLORS } from "./data/uiColors";
import {
  ensureProfile,
  getDisplayNameFromSession,
  signInWithGoogle,
  signOut,
} from "./lib/auth";
import {
  adminGetToolUsageSummary,
  adminGetIdleGameRankings,
  adminLogin,
  adminLogout,
  adminUpdateIdleGameRankingEntry,
  adminValidateSession,
  type AdminIdleGameRankingEntry,
  type AdminUsageSummary,
} from "./lib/admin";
import {
  recognizeSkillImage,
  skillOcrClaimPublicWeeklyUsage,
  skillOcrCreatePublicSnapshot,
  skillOcrDeletePublicUpload,
  skillOcrFinalizePublicUpload,
  skillOcrGetPublicWeeklyQuota,
  skillOcrListUploads,
  skillOcrListPublicUploads,
  skillOcrLogin,
  skillOcrLogout,
  skillOcrSavePublicUpload,
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
  getDefaultLevels,
  getSkillScoreLabel,
  gradeRank,
  pickValidSkill,
} from "./lib/toolboxHelpers";
import AppChrome from "./components/AppChrome";
import SiteHeader from "./components/SiteHeader";
import ToolSeoPanel from "./components/ToolSeoPanel";
import KakaoAdFitFixedBanner, {
  KakaoAdFitPcTopTripleBanner,
  KakaoAdFitMobileTopBanner,
} from "./components/KakaoAdFitFixedBanner";
import type {
  CalculatorMode,
  CardType,
  HitterPositionGroup,
  HitterBattingSide,
  PitcherStaminaRange,
  PitcherRole,
  PlayerType,
  SkillLevel,
  StarterHand,
  ToolView,
} from "./types";
import type {
  SkillOcrApiResponse,
  SkillOcrPublicQuota,
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
  SkillOcrSession,
} from "./types/ocr";
import { calculateSkillTotal } from "./utils/calculate";
import { calculateAdvancedSkillOdds } from "./utils/advancedSkillOdds";
import {
  judgeSkillResultByProbability,
  type ResultGrade,
} from "./utils/judge";
import { simulateAdvancedSkillChange } from "./utils/simulateAdvancedSkillChange";
import { simulateImpactSkillChangeUntilDoubleMajor } from "./utils/simulateImpactSkillChange";
import type { SkillMarbleMode } from "./utils/skillMarbleOdds";
import { getOrCreateRevenueSessionId, logRevenueEvent } from "./lib/revenueAnalytics";
import {
  adminGetHomeChangeMessage,
  adminGetIdleDevGameSetting,
  adminUpdateHomeChangeMessage,
  adminUpdateIdleDevGameSetting,
  getHomeChangeMessage,
  getIdleDevGameSetting,
} from "./lib/siteSettings";
import HomeView from "./views/HomeView";
import InfoPageView, { type InfoPageKey } from "./views/InfoPageView";

const NoticeView = lazy(() => import("./views/NoticeView"));
const SkillCompareBetaView = lazy(() => import("./views/SkillCompareBetaView"));
const RankingView = lazy(() => import("./views/RankingView"));
const SkillQuizView = lazy(() => import("./views/SkillQuizView"));
const AdminView = lazy(() => import("./views/AdminView"));
const SkillOcrView = lazy(() => import("./views/SkillOcrView"));
const PublicSkillOcrView = lazy(() => import("./views/PublicSkillOcrView"));
const TrainingRedistributionView = lazy(() => import("./views/TrainingRedistributionView"));
const ToolboxStage = lazy(() => import("./views/ToolboxStage"));

function ViewFallback() {
  return (
    <main className="main-stage" aria-busy="true">
      <p className="ocr-copy">로딩 중...</p>
    </main>
  );
}

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
const OCR_FIXED_USERNAME = import.meta.env.VITE_OCR_USERNAME ?? "";
const INFO_PAGE_PATHS: Record<string, InfoPageKey> = {
  "/about": "about",
  "/guide": "skillScoreMethod",
  "/methodology": "skillScoreMethod",
  "/skill-score-method": "skillScoreMethod",
  "/calculator-guide": "skillScoreMethod",
  "/simulator-guide": "simulatorGuide",
  "/ocr-guide": "ocrGuide",
  "/beginner-guides": "beginnerGuides",
  "/beginner-guides/skill-score-stop": "beginnerSkillScoreStop",
  "/beginner-guides/skill-reroll-stop": "beginnerSkillRerollStop",
  "/beginner-guides/hitter-skill-guide": "beginnerHitterSkillGuide",
  "/beginner-guides/pitcher-skill-guide": "beginnerPitcherSkillGuide",
  "/beginner-guides/impact-skill-guide": "beginnerImpactSkillGuide",
  "/beginner-guides/two-skill-keep": "beginnerTwoSkillKeep",
  "/beginner-guides/golden-glove-target": "beginnerGoldenGloveTarget",
  "/beginner-guides/lineup-weak-point": "beginnerLineupWeakPoint",
  "/beginner-guides/conditional-skills": "beginnerConditionalSkills",
  "/beginner-guides/before-reroll-checklist": "beginnerBeforeRerollChecklist",
  "/faq": "faq",
  "/privacy": "privacy",
  "/terms": "terms",
  "/contact": "contact",
};
const TOOL_VIEW_PATHS: Partial<Record<string, ToolView>> = {
  "/calculator": "calculator",
  "/simulator": "simulator",
  "/impact-change": "impactChange",
  "/skill-marble": "skillMarble",
  "/major-skill-marble": "majorSkillMarble",
  "/ranking": "ranking",
  "/skill-quiz": "skillQuiz",
  "/notice": "notice",
  "/skill-compare": "skillCompareBeta",
  "/lineup-skill-ocr": "lineupSkillOcr",
  "/training-redistribution": "trainingRedistribution",
};
const TOOL_VIEW_URLS: Partial<Record<ToolView, string>> = {
  home: "/",
  calculator: "/calculator/",
  simulator: "/simulator/",
  impactChange: "/impact-change/",
  skillMarble: "/skill-marble/",
  majorSkillMarble: "/major-skill-marble/",
  ranking: "/ranking/",
  skillQuiz: "/skill-quiz/",
  notice: "/notice/",
  skillCompareBeta: "/skill-compare/",
  lineupSkillOcr: "/lineup-skill-ocr/",
  trainingRedistribution: "/training-redistribution/",
};
const VALID_TOOL_VIEWS: ToolView[] = [
  "home",
  "calculator",
  "simulator",
  "impactChange",
  "skillMarble",
  "majorSkillMarble",
  "ranking",
  "skillQuiz",
  "notice",
  "skillCompareBeta",
  "lineupSkillOcr",
  "trainingRedistribution",
];
type ThemePreference = "light" | "dark";

const TARGET_GRADE_OPTIONS: Array<{ value: ResultGrade; label: string }> = [
  { value: "C", label: "C 이상" },
  { value: "B", label: "B 이상" },
  { value: "A", label: "A 이상" },
  { value: "S", label: "S 이상" },
  { value: "SS", label: "SS 이상" },
  { value: "SR+", label: "SR+ 이상" },
];

const RESULT_GRADE_GUIDE: Array<{ grade: ResultGrade; title: string; description: string }> = [
  { grade: "C", title: "C", description: "상위 12% 초과 / 기대 9회 미만" },
  { grade: "B", title: "B", description: "상위 12% 이내 / 기대 9회 이상" },
  { grade: "A", title: "A", description: "상위 5% 이내 / 기대 20회 이상" },
  { grade: "S", title: "S", description: "상위 1.5% 이내 / 기대 67회 이상" },
  { grade: "SS", title: "SS", description: "상위 0.5% 이내 / 기대 200회 이상" },
  { grade: "SR+", title: "SR+", description: "상위 0.1% 이내 / 기대 1,000회 이상" },
];

const CARD_TYPE_OPTIONS = (Object.entries(CARD_TYPE_LABELS) as Array<[CardType, string]>).map(
  ([value, label]) => ({
    value,
    label,
  })
);

function App() {
  const isAdminRoute =
    typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === ADMIN_PATH;
  const isOcrRoute =
    typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === OCR_PATH;
  const infoPageKey =
    typeof window !== "undefined"
      ? INFO_PAGE_PATHS[window.location.pathname.replace(/\/+$/, "") || "/"] ?? null
      : null;
  const [toolView, setToolView] = useState<ToolView>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }

    const url = new URL(window.location.href);
    const pathView = TOOL_VIEW_PATHS[url.pathname.replace(/\/+$/, "") || "/"];
    if (pathView) {
      return pathView;
    }

    const requestedView = url.searchParams.get("view");
    return requestedView && VALID_TOOL_VIEWS.includes(requestedView as ToolView)
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
  const [hitterBattingSide, setHitterBattingSide] = useState<HitterBattingSide>("right");
  const [starterHand, setStarterHand] = useState<StarterHand>("right");
  const [pitcherStaminaRange, setPitcherStaminaRange] = useState<PitcherStaminaRange>("134-139");
  const [skillMarbleMode, setSkillMarbleMode] = useState<SkillMarbleMode>("twoMajor");

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
  const [adminIdleRankings, setAdminIdleRankings] = useState<AdminIdleGameRankingEntry[]>([]);
  const [adminIdleRankingsLoading, setAdminIdleRankingsLoading] = useState(false);
  const [adminIdleRankingsError, setAdminIdleRankingsError] = useState<string | null>(null);
  const [adminIdleRankingBusyId, setAdminIdleRankingBusyId] = useState<string | null>(null);
  const [homeChangeMessage, setHomeChangeMessage] = useState("");
  const [idleDevGameEnabled, setIdleDevGameEnabled] = useState(false);

  const [adminHomeChangeDraft, setAdminHomeChangeDraft] = useState("");
  const [adminHomeChangeSaving, setAdminHomeChangeSaving] = useState(false);
  const [adminHomeChangeStatus, setAdminHomeChangeStatus] = useState<"idle" | "saved" | "error">("idle");
  const [adminHomeChangeError, setAdminHomeChangeError] = useState<string | null>(null);
  const [adminIdleDevGameEnabled, setAdminIdleDevGameEnabled] = useState(false);
  const [adminIdleDevGameSaving, setAdminIdleDevGameSaving] = useState(false);
  const [adminIdleDevGameStatus, setAdminIdleDevGameStatus] = useState<"idle" | "saved" | "error">("idle");
  const [adminIdleDevGameError, setAdminIdleDevGameError] = useState<string | null>(null);
  const [ocrPasswordInput, setOcrPasswordInput] = useState("");
  const [ocrAuthError, setOcrAuthError] = useState<string | null>(null);
  const [ocrCheckingSession, setOcrCheckingSession] = useState(isOcrRoute);
  const [ocrSession, setOcrSession] = useState<SkillOcrSession | null>(null);
  const [ocrUploads, setOcrUploads] = useState<SkillOcrSavedUpload[]>([]);
  const [ocrPublicQuota, setOcrPublicQuota] = useState<SkillOcrPublicQuota[]>([]);
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
  const [ocrDraftPublicUploadId, setOcrDraftPublicUploadId] = useState<string | null>(null);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrSavedUpload, setOcrSavedUpload] = useState<SkillOcrSavedUpload | null>(null);
  const [revenueSessionId] = useState(() => getOrCreateRevenueSessionId());
  const lastProfileSyncKeyRef = useRef<string | null>(null);
  const applyingPopStateRef = useRef(false);

  const playerType: PlayerType = mode === "hitter" ? "hitter" : "pitcher";
  const pitcherRole: PitcherRole = mode === "hitter" ? "starter" : mode;
  const activeCardType: CardType =
    toolView === "impactChange" || toolView === "skillMarble"
      ? "impact"
      : (toolView === "simulator" || toolView === "majorSkillMarble") && cardType === "allStar"
        ? "signature"
        : cardType;

  const gameData = useMemo(
    () => getGameDataSet({ playerType, pitcherRole, starterHand }),
    [playerType, pitcherRole, starterHand]
  );

  const filteredSkills = useMemo(() => {
    if (!gameData) return [];
    return gameData.skills.filter((skill) => skill.availableCardTypes.includes(activeCardType));
  }, [gameData, activeCardType]);

  const filteredSkillIds = useMemo(
    () => filteredSkills.map((skill) => skill.id),
    [filteredSkills]
  );
  const filteredSkillMap = useMemo(
    () => new Map(filteredSkills.map((skill) => [skill.id, skill])),
    [filteredSkills]
  );

  const resolvedSkill1 = pickValidSkill(skill1, filteredSkillIds, [], filteredSkillMap);
  const resolvedSkill2 = pickValidSkill(
    skill2,
    filteredSkillIds,
    [resolvedSkill1],
    filteredSkillMap
  );
  const resolvedSkill3 = pickValidSkill(
    skill3,
    filteredSkillIds,
    [resolvedSkill1, resolvedSkill2],
    filteredSkillMap
  );

  const selectedSkillMeta = useMemo(() => {
    return {
      skill1: filteredSkillMap.get(resolvedSkill1),
      skill2: filteredSkillMap.get(resolvedSkill2),
      skill3: filteredSkillMap.get(resolvedSkill3),
    };
  }, [filteredSkillMap, resolvedSkill1, resolvedSkill2, resolvedSkill3]);

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
  const impactTotalScoreWithFirst =
    gameData && hasAnySkillSelection && activeCardType === "impact"
      ? calculateSkillTotal({
          cardType: activeCardType,
          skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
          skillLevels: [level1, level2, level3],
          scoreTable: gameData.scoreTable,
          includeImpactFixedSkill: true,
        })
      : null;

  const totalScoreDisplay = totalScore ?? "-";
  const impactTotalScoreWithFirstDisplay = impactTotalScoreWithFirst ?? "-";
  const skillOdds = useMemo(
    () =>
      gameData && totalScore !== null
        ? calculateAdvancedSkillOdds({
            mode,
            cardType: activeCardType,
            hitterPositionGroup,
            skills: gameData.skills,
            scoreTable: gameData.scoreTable,
            skillIds: [resolvedSkill1, resolvedSkill2, resolvedSkill3],
            skillLevels: [level1, level2, level3],
            targetScore: totalScore,
          })
        : null,
    [
      activeCardType,
      gameData,
      hitterPositionGroup,
      level1,
      level2,
      level3,
      mode,
      resolvedSkill1,
      resolvedSkill2,
      resolvedSkill3,
      totalScore,
    ]
  );
  const judgeResult = judgeSkillResultByProbability(skillOdds?.scoreAtLeastProbability);
  const resultGradeColor = judgeResult ? RESULT_GRADE_COLORS[judgeResult.grade] : "#b7bfd2";
  const judgeGrade = judgeResult?.grade ?? "-";
  const supabaseReady = isSupabaseConfigured();
  const toolboxToolView: Exclude<ToolView, "home" | "ranking" | "skillQuiz" | "notice"> =
    toolView === "home" ||
    toolView === "ranking" ||
    toolView === "skillQuiz" ||
    toolView === "notice" ||
    toolView === "skillCompareBeta" ||
    toolView === "lineupSkillOcr" ||
    toolView === "trainingRedistribution"
      ? "calculator"
      : toolView;
  const shouldShowKakaoAdFit = !isAdminRoute;
  const authDisplayName = getDisplayNameFromSession(authSession);
  const publicOcrSession: SkillOcrSession | null = authSession
    ? {
        session_token: "public",
        username: authDisplayName ?? "Google 사용자",
        display_name: authDisplayName,
        expires_at: authSession.expires_at
          ? new Date(authSession.expires_at * 1000).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    : null;

  const loadAdminIdleGameRankings = async (sessionToken: string) => {
    try {
      setAdminIdleRankingsLoading(true);
      setAdminIdleRankingsError(null);
      setAdminIdleRankings(await adminGetIdleGameRankings(sessionToken));
    } catch (error) {
      setAdminIdleRankingsError(
        error instanceof Error ? error.message : "타자 키우기 랭킹을 불러오지 못했습니다."
      );
    } finally {
      setAdminIdleRankingsLoading(false);
    }
  };

  useEffect(() => {
    window.localStorage.setItem("v26-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabaseReady) {
      setHomeChangeMessage("");
      return;
    }

    void (async () => {
      try {
        const setting = await getHomeChangeMessage();
        setHomeChangeMessage(setting.message);
      } catch {
        setHomeChangeMessage("");
      }
    })();
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) {
      setIdleDevGameEnabled(false);
      return;
    }

    void (async () => {
      const setting = await getIdleDevGameSetting();
      setIdleDevGameEnabled(setting.enabled);
    })();
  }, [supabaseReady]);

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
          error instanceof Error ? error.message : "이미지 인식 저장 기록을 불러오지 못했습니다."
        );
      } finally {
        setOcrUploadsLoading(false);
      }
    })();
  }, [isOcrRoute, ocrSession]);

  useEffect(() => {
    if (toolView !== "lineupSkillOcr") {
      return;
    }

    if (!authSession) {
      setOcrUploads([]);
      setOcrPublicQuota([]);
      setOcrDraftPublicUploadId(null);
      return;
    }

    void (async () => {
      try {
        setOcrUploadsLoading(true);
        setOcrUploadsError(null);
        const [uploads, quota] = await Promise.all([
          skillOcrListPublicUploads(20),
          skillOcrGetPublicWeeklyQuota(),
        ]);
        setOcrUploads(uploads);
        setOcrPublicQuota(quota);
      } catch (error) {
        setOcrUploadsError(
          error instanceof Error ? error.message : "이미지 인식 정보를 불러오지 못했습니다."
        );
      } finally {
        setOcrUploadsLoading(false);
      }
    })();
  }, [authSession, toolView]);

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
    if (!isAdminRoute || !adminUnlocked) {
      return;
    }

    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionToken) {
      return;
    }

    void loadAdminIdleGameRankings(sessionToken);
  }, [adminUnlocked, isAdminRoute]);

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
        setAdminIdleDevGameError(null);
        const setting = await adminGetIdleDevGameSetting(sessionToken);
        setAdminIdleDevGameEnabled(setting.enabled);
        setIdleDevGameEnabled(setting.enabled);
      } catch (error) {
        setAdminIdleDevGameError(
          error instanceof Error ? error.message : "타자 키우기 운영 상태를 불러오지 못했습니다."
        );
      }
    })();
  }, [adminUnlocked, isAdminRoute]);

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
        setAdminHomeChangeError(null);
        const setting = await adminGetHomeChangeMessage(sessionToken);
        setAdminHomeChangeDraft(setting.message);
        setHomeChangeMessage(setting.message);
      } catch (error) {
        setAdminHomeChangeError(
          error instanceof Error ? error.message : "메인 변경사항 메시지를 불러오지 못했습니다."
        );
      }
    })();
  }, [adminUnlocked, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute || isOcrRoute || infoPageKey) {
      return;
    }

    const handlePopState = () => {
      const url = new URL(window.location.href);
      const pathView = TOOL_VIEW_PATHS[url.pathname.replace(/\/+$/, "") || "/"];
      const requestedView = url.searchParams.get("view");
      applyingPopStateRef.current = true;
      setToolView(
        pathView ??
          (requestedView && VALID_TOOL_VIEWS.includes(requestedView as ToolView)
          ? (requestedView as ToolView)
          : DEFAULT_VIEW)
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [infoPageKey, isAdminRoute, isOcrRoute]);

  useEffect(() => {
    if (isAdminRoute || isOcrRoute || infoPageKey) {
      return;
    }

    const url = new URL(window.location.href);
    const currentPath = url.pathname.replace(/\/+$/, "") || "/";
    const pathView = TOOL_VIEW_PATHS[currentPath];
    const toolPath = TOOL_VIEW_URLS[toolView] ?? "/";
    if (pathView === toolView || currentPath === toolPath) {
      applyingPopStateRef.current = false;
      return;
    }

    url.pathname = toolPath;
    url.search = "";
    if (applyingPopStateRef.current) {
      window.history.replaceState({}, "", url.toString());
      applyingPopStateRef.current = false;
      return;
    }

    window.history.pushState({}, "", url.toString());
  }, [infoPageKey, isAdminRoute, isOcrRoute, toolView]);

  useEffect(() => {
    if (isAdminRoute || isOcrRoute || infoPageKey) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [infoPageKey, isAdminRoute, isOcrRoute, toolView]);

  useEffect(() => {
    if (isAdminRoute || isOcrRoute || infoPageKey) {
      return;
    }

    void logRevenueEvent({
      eventType: "page_view",
      sessionId: revenueSessionId,
      pagePath: window.location.pathname,
      pageView: toolView,
      metadata: {
        search: window.location.search,
      },
    }).catch(() => {});
  }, [infoPageKey, isAdminRoute, isOcrRoute, revenueSessionId, toolView]);

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

    const resetCardType =
      toolView === "impactChange" || toolView === "skillMarble" ? "impact" : DEFAULT_CARD_TYPE;

    if (toolView !== "impactChange" && toolView !== "skillMarble") {
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

    setSimRollCount((count) => count + 1);
    setSimBestScore((bestScore) =>
      bestScore === null ? nextTotalScore : Math.max(bestScore, nextTotalScore)
    );
    setSimAutoRollOccurrenceCount(null);

  };

  const handleAutoRollToTarget = () => {
    if (!gameData) return;

    let tryCount = 0;
    let bestScoreInRun = simBestScore;
    let finalSkillIds: [string, string, string] = [resolvedSkill1, resolvedSkill2, resolvedSkill3];
    const judgeCache = new Map<string, ReturnType<typeof judgeSkillResultByProbability>>();

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

      const scoreCacheKey = nextTotalScore.toFixed(2);
      let nextJudgeResult = judgeCache.get(scoreCacheKey);

      if (nextJudgeResult === undefined) {
        const nextOdds = calculateAdvancedSkillOdds({
          mode,
          cardType: activeCardType,
          hitterPositionGroup,
          skills: gameData.skills,
          scoreTable: gameData.scoreTable,
          skillIds: nextRoll.skillIds,
          skillLevels: [level1, level2, level3],
          targetScore: nextTotalScore,
        });
        nextJudgeResult = judgeSkillResultByProbability(nextOdds?.scoreAtLeastProbability);
        judgeCache.set(scoreCacheKey, nextJudgeResult);
      }

      tryCount += 1;
      finalSkillIds = nextRoll.skillIds;
      bestScoreInRun =
        bestScoreInRun === null ? nextTotalScore : Math.max(bestScoreInRun, nextTotalScore);

      if (nextJudgeResult && gradeRank(nextJudgeResult.grade) >= gradeRank(targetGrade)) {
        break;
      }
    }

    setSkill1(finalSkillIds[0]);
    setSkill2(finalSkillIds[1]);
    setSkill3(finalSkillIds[2]);
    setSimRollCount((count) => count + tryCount);
    setSimBestScore(bestScoreInRun);
    setSimAutoRollOccurrenceCount(tryCount);

  };

  const handleToolViewChange = (nextToolView: ToolView) => {
    const nextPath = TOOL_VIEW_URLS[nextToolView] ?? "/";
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    if (currentPath !== nextPath) {
      window.location.href = `${window.location.origin}${nextPath}`;
      return;
    }

    if (
      nextToolView === "home" ||
      nextToolView === "ranking" ||
      nextToolView === "skillQuiz" ||
      nextToolView === "notice" ||
      nextToolView === "skillCompareBeta" ||
      nextToolView === "trainingRedistribution"
    ) {
      setToolView(nextToolView);
      return;
    }

    if (nextToolView === "impactChange" || nextToolView === "skillMarble") {
      const [impactLevel1, impactLevel2, impactLevel3] = getDefaultLevels("impact");
      setToolView(nextToolView);
      setLevel1(impactLevel1);
      setLevel2(impactLevel2);
      setLevel3(impactLevel3);
      resetImpactChangeSession();
      return;
    }

    setToolView(nextToolView);
  };

  const handleSaveHomeChangeMessage = async () => {
    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (!sessionToken) {
      setAdminHomeChangeStatus("error");
      setAdminHomeChangeError("관리자 세션이 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      setAdminHomeChangeSaving(true);
      setAdminHomeChangeStatus("idle");
      setAdminHomeChangeError(null);
      const setting = await adminUpdateHomeChangeMessage(sessionToken, adminHomeChangeDraft);
      setAdminHomeChangeDraft(setting.message);
      setHomeChangeMessage(setting.message);
      setAdminHomeChangeStatus("saved");
    } catch (error) {
      setAdminHomeChangeStatus("error");
      setAdminHomeChangeError(
        error instanceof Error ? error.message : "메인 변경사항 메시지를 저장하지 못했습니다."
      );
    } finally {
      setAdminHomeChangeSaving(false);
    }
  };

  const handleSaveIdleDevGameSetting = async () => {
    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (!sessionToken) {
      setAdminIdleDevGameStatus("error");
      setAdminIdleDevGameError("관리자 세션이 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      setAdminIdleDevGameSaving(true);
      setAdminIdleDevGameStatus("idle");
      setAdminIdleDevGameError(null);
      const setting = await adminUpdateIdleDevGameSetting(
        sessionToken,
        adminIdleDevGameEnabled
      );
      setAdminIdleDevGameEnabled(setting.enabled);
      setIdleDevGameEnabled(setting.enabled);
      setAdminIdleDevGameStatus("saved");
    } catch (error) {
      setAdminIdleDevGameStatus("error");
      setAdminIdleDevGameError(
        error instanceof Error ? error.message : "타자 키우기 운영 상태를 저장하지 못했습니다."
      );
    } finally {
      setAdminIdleDevGameSaving(false);
    }
  };

  const handleUpdateIdleGameRanking = async (
    entry: AdminIdleGameRankingEntry,
    moderationStatus: AdminIdleGameRankingEntry["moderation_status"]
  ) => {
    const sessionToken = window.sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (!sessionToken) {
      setAdminIdleRankingsError("관리자 세션이 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      setAdminIdleRankingBusyId(entry.entry_id);
      setAdminIdleRankingsError(null);
      await adminUpdateIdleGameRankingEntry({
        sessionToken,
        entryId: entry.entry_id,
        moderationStatus,
        displayName: moderationStatus === "hidden" ? "익명타자" : entry.display_name,
        note:
          moderationStatus === "visible"
            ? null
            : moderationStatus === "hidden"
              ? "관리자 닉네임 숨김"
              : "관리자 랭킹 제외",
      });
      await loadAdminIdleGameRankings(sessionToken);
    } catch (error) {
      setAdminIdleRankingsError(
        error instanceof Error ? error.message : "타자 키우기 랭킹 상태를 저장하지 못했습니다."
      );
    } finally {
      setAdminIdleRankingBusyId(null);
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

  const handleStarterHandChange = (nextHand: StarterHand) => {
    setStarterHand(nextHand);
    setSkill1("");
    setSkill2("");
    setSkill3("");
    resetSimulationSession();
    resetImpactChangeSession();
  };

  const handlePitcherStaminaRangeChange = (nextRange: PitcherStaminaRange) => {
    setPitcherStaminaRange(nextRange);
    setSkill1("");
    setSkill2("");
    setSkill3("");
    resetSimulationSession();
    resetImpactChangeSession();
  };

  const handleHitterBattingSideChange = (nextSide: HitterBattingSide) => {
    setHitterBattingSide(nextSide);
    setSkill1("");
    setSkill2("");
    setSkill3("");
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

  const handleGoogleLogin = async (nextView: ToolView = toolView) => {
    try {
      const redirectUrl =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}${window.location.pathname}?view=${nextView}`;
      await signInWithGoogle(redirectUrl);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google 로그인에 실패했습니다.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await signOut();
      setAuthError(null);
      setOcrUploads([]);
      setOcrPublicQuota([]);
      setOcrDraftPublicUploadId(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그아웃에 실패했습니다.");
    }
  };

  const handleOcrLogin = async () => {
    if (!OCR_FIXED_USERNAME) {
      setOcrAuthError("이미지 인식 접속 설정이 필요합니다.");
      return;
    }

    if (!ocrPasswordInput.trim()) {
      setOcrAuthError("비밀번호를 입력해주세요.");
      return;
    }

    try {
      const session = await skillOcrLogin(OCR_FIXED_USERNAME, ocrPasswordInput);
      setOcrAuthError(null);
      setOcrSession(session);
      window.localStorage.setItem(OCR_SESSION_KEY, session.session_token);
    } catch (error) {
      setOcrAuthError(error instanceof Error ? error.message : "이미지 인식 로그인에 실패했습니다.");
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
    setOcrDraftPublicUploadId(null);
    setOcrSaving(false);
    setOcrSavedUpload(null);
    window.localStorage.removeItem(OCR_SESSION_KEY);
  };

  const handleOcrUploadImage = async (role: SkillOcrRole, file: File) => {
    const isPublicLineupOcr = toolView === "lineupSkillOcr";

    if (isPublicLineupOcr && !authSession) {
      setOcrUploadError("Google 로그인 후 사용할 수 있습니다.");
      return;
    }

    setOcrUploadBusyRole(role);
    setOcrUploadError(null);
    setOcrDraftPlayers([]);
    setOcrDraftImageName(file.name);
    setOcrDraftRole(role);
    setOcrDraftRawResponse(null);
    setOcrDraftTotalScore(0);
    setOcrDraftAverageScore(0);
    setOcrDraftPublicUploadId(null);
    setOcrSavedUpload(null);

    try {
      if (isPublicLineupOcr) {
        const quota = await skillOcrClaimPublicWeeklyUsage(role);
        setOcrPublicQuota(quota);
      }

      const response = await recognizeSkillImage({ role, file });
      const transformed = transformSkillOcrResponse(response, role);

      setOcrDraftRawResponse(response);
      setOcrDraftPlayers(transformed.players);
      setOcrDraftTotalScore(transformed.totalScore);
      setOcrDraftAverageScore(transformed.averageScore);

      if (isPublicLineupOcr) {
        const snapshot = await skillOcrCreatePublicSnapshot({
          role,
          imageName: file.name,
          requestId: response.request_id,
          rawResponse: response,
          selectedPlayers: transformed.players,
          totalScore: transformed.totalScore,
          averageScore: transformed.averageScore,
        });
        setOcrDraftPublicUploadId(snapshot.id);
        setOcrSavedUpload(snapshot);
        setOcrUploads(await skillOcrListPublicUploads(20));
      }
    } catch (error) {
      setOcrUploadError(
        error instanceof Error ? error.message : "이미지를 인식하지 못했습니다."
      );
    } finally {
      setOcrUploadBusyRole(null);
    }
  };

  const handleOcrSaveDraft = async () => {
    const isPublicLineupOcr = toolView === "lineupSkillOcr";

    if ((!ocrSession && !isPublicLineupOcr) || !ocrDraftRole || !ocrDraftRawResponse) {
      setOcrUploadError("저장할 이미지 인식 결과가 없습니다.");
      return;
    }

    if (isPublicLineupOcr && !authSession) {
      setOcrUploadError("Google 로그인 후 저장할 수 있습니다.");
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
      const saveInput = {
        role: ocrDraftRole,
        imageName: ocrDraftImageName,
        requestId: ocrDraftRawResponse.request_id,
        rawResponse: ocrDraftRawResponse,
        selectedPlayers,
        totalScore: ocrDraftTotalScore,
        averageScore: ocrDraftAverageScore,
      };
      const savedUpload = isPublicLineupOcr
        ? ocrDraftPublicUploadId
          ? await skillOcrFinalizePublicUpload({
              uploadId: ocrDraftPublicUploadId,
              ...saveInput,
            })
          : await skillOcrSavePublicUpload(saveInput)
        : await skillOcrSaveUpload({
            sessionToken: ocrSession?.session_token ?? "",
            ...saveInput,
          });
      const uploads = isPublicLineupOcr
        ? await skillOcrListPublicUploads(20)
        : await skillOcrListUploads(ocrSession?.session_token ?? "", 20);

      setOcrSavedUpload(savedUpload);
      setOcrUploads(uploads);
      setOcrDraftPlayers([]);
      setOcrDraftImageName(null);
      setOcrDraftRole(null);
      setOcrDraftRawResponse(null);
      setOcrDraftTotalScore(0);
      setOcrDraftAverageScore(0);
      setOcrDraftPublicUploadId(null);
    } catch (error) {
      setOcrUploadError(error instanceof Error ? error.message : "이미지 인식 결과 저장에 실패했습니다.");
    } finally {
      setOcrSaving(false);
    }
  };

  const handleOpenPublicOcrSnapshot = (upload: SkillOcrSavedUpload) => {
    const summary = calculateSkillOcrSummary(upload.selected_players);
    setOcrUploadError(null);
    setOcrSavedUpload(upload);
    setOcrDraftPublicUploadId(upload.id);
    setOcrDraftPlayers(upload.selected_players);
    setOcrDraftImageName(upload.image_name);
    setOcrDraftRole(upload.role);
    setOcrDraftRawResponse(upload.raw_response ?? null);
    setOcrDraftTotalScore(summary.totalScore);
    setOcrDraftAverageScore(summary.averageScore);
  };

  const handleDeletePublicOcrSnapshot = async (uploadId: string) => {
    try {
      setOcrUploadError(null);
      await skillOcrDeletePublicUpload(uploadId);
      setOcrUploads(await skillOcrListPublicUploads(20));

      if (ocrDraftPublicUploadId === uploadId || ocrSavedUpload?.id === uploadId) {
        setOcrSavedUpload(null);
        setOcrDraftPublicUploadId(null);
        setOcrDraftPlayers([]);
        setOcrDraftImageName(null);
        setOcrDraftRole(null);
        setOcrDraftRawResponse(null);
        setOcrDraftTotalScore(0);
        setOcrDraftAverageScore(0);
      }
    } catch (error) {
      setOcrUploadError(error instanceof Error ? error.message : "이미지 인식 스냅샷을 삭제하지 못했습니다.");
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

  const handleOcrPlayerStarterHandChange = (playerIndex: number, starterHand: StarterHand) => {
    updateOcrDraftPlayers((players) =>
      players.map((player, index) =>
        index === playerIndex ? recalculateSkillOcrPlayer({ ...player, starterHand }) : player
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
    window.location.href = `${window.location.origin}/`;
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
          <Suspense fallback={<ViewFallback />}>
            <AdminView
              unlocked={adminUnlocked}
              checkingSession={adminCheckingSession}
              usernameInput={adminUsernameInput}
              passwordInput={adminPasswordInput}
              passwordError={adminPasswordError}
              stats={adminStats}
              statsLoading={adminStatsLoading}
              statsError={adminStatsError}
              homeChangeMessage={adminHomeChangeDraft}
              homeChangeSaving={adminHomeChangeSaving}
              homeChangeStatus={adminHomeChangeStatus}
              homeChangeError={adminHomeChangeError}
              idleDevGameEnabled={adminIdleDevGameEnabled}
              idleDevGameSaving={adminIdleDevGameSaving}
              idleDevGameStatus={adminIdleDevGameStatus}
              idleDevGameError={adminIdleDevGameError}
              idleGameRankings={adminIdleRankings}
              idleGameRankingsLoading={adminIdleRankingsLoading}
              idleGameRankingsError={adminIdleRankingsError}
              idleGameRankingBusyId={adminIdleRankingBusyId}
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
              onHomeChangeMessageChange={(value) => {
                setAdminHomeChangeDraft(value);
                setAdminHomeChangeStatus("idle");
                setAdminHomeChangeError(null);
              }}
              onSaveHomeChangeMessage={() => void handleSaveHomeChangeMessage()}
              onIdleDevGameEnabledChange={(value) => {
                setAdminIdleDevGameEnabled(value);
                setAdminIdleDevGameStatus("idle");
                setAdminIdleDevGameError(null);
              }}
              onSaveIdleDevGameSetting={() => void handleSaveIdleDevGameSetting()}
              onUpdateIdleGameRanking={(entry, moderationStatus) =>
                void handleUpdateIdleGameRanking(entry, moderationStatus)
              }
            />
          </Suspense>
          <Analytics />
        </div>
      </div>
    );
  }

  if (isOcrRoute) {
    return (
      <div className="app-bg" data-theme={theme}>
        <div className="app-shell">
          <Suspense fallback={<ViewFallback />}>
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
              onPlayerStarterHandChange={handleOcrPlayerStarterHandChange}
              onSkillChange={handleOcrSkillChange}
              onSkillLevelChange={handleOcrSkillLevelChange}
              onSaveDraft={() => void handleOcrSaveDraft()}
              onSelectSavedUpload={setOcrSavedUpload}
              onClearSavedUpload={() => setOcrSavedUpload(null)}
              onGoHome={handleGoHome}
            />
          </Suspense>
          <Analytics />
        </div>
      </div>
    );
  }

  if (infoPageKey) {
    return (
      <div className="app-bg" data-theme={theme}>
        <div className="app-shell">
          <SiteHeader
            authDisplayName={authDisplayName}
            authSession={authSession}
            currentView={toolView}
            onGoogleLogin={() => void handleGoogleLogin(toolView)}
            onGoogleLogout={() => void handleGoogleLogout()}
            onSelectView={handleToolViewChange}
            supabaseReady={supabaseReady}
            idleDevGameEnabled={idleDevGameEnabled}
            themeAction={themeToggle}
          />
          <AppChrome>
            <KakaoAdFitMobileTopBanner enabled={shouldShowKakaoAdFit} />
            <InfoPageView page={infoPageKey} themeAction={themeToggle} onGoHome={handleGoHome} />
          </AppChrome>
          <footer className="app-footer">
            <nav className="footer-links" aria-label="사이트 정보">
              <a href="/about">소개</a>
              <a href="/skill-score-method">스킬 점수 기준</a>
              <a href="/simulator-guide">시뮬레이터 안내</a>
              <a href="/ocr-guide">라인업 인식 안내</a>
              <a href="/faq">FAQ</a>
              <a href="/privacy">개인정보처리방침</a>
              <a href="/terms">이용약관</a>
              <a href="/contact">문의</a>
            </nav>
            <span>made by 우주</span>
          </footer>
          <KakaoAdFitFixedBanner enabled={shouldShowKakaoAdFit} />
          <Analytics />
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg" data-theme={theme}>
      <div className="app-shell">
        <SiteHeader
          authDisplayName={authDisplayName}
          authSession={authSession}
          currentView={toolView}
          onGoogleLogin={() => void handleGoogleLogin(toolView)}
          onGoogleLogout={() => void handleGoogleLogout()}
          onSelectView={handleToolViewChange}
          supabaseReady={supabaseReady}
          idleDevGameEnabled={idleDevGameEnabled}
          themeAction={themeToggle}
        />
        <AppChrome>
          <KakaoAdFitMobileTopBanner enabled={shouldShowKakaoAdFit} />
          {authError && <p className="auth-error">{authError}</p>}

          <Suspense fallback={<ViewFallback />}>
          {toolView === "home" ? (
            <HomeView
              onSelectView={handleToolViewChange}
              homeChangeMessage={homeChangeMessage}
              currentUserId={authSession?.user.id ?? null}
            />
          ) : toolView === "notice" ? (
            <NoticeView themeAction={themeToggle} onGoHome={handleGoHome} />
          ) : toolView === "skillCompareBeta" ? (
            <SkillCompareBetaView
              themeAction={themeToggle}
              onGoHome={handleGoHome}
            />
          ) : toolView === "lineupSkillOcr" ? (
            <PublicSkillOcrView
              authenticated={Boolean(publicOcrSession)}
              displayName={authDisplayName}
              uploads={ocrUploads}
              uploadsLoading={ocrUploadsLoading}
              uploadsError={ocrUploadsError}
              uploadBusyRole={ocrUploadBusyRole}
              uploadError={ocrUploadError}
              draftPlayers={ocrDraftPlayers}
              draftTotalScore={ocrDraftTotalScore}
              draftAverageScore={ocrDraftAverageScore}
              saving={ocrSaving}
              quota={ocrPublicQuota}
              themeAction={themeToggle}
              onGoogleLogin={() => void handleGoogleLogin("lineupSkillOcr")}
              onGoogleLogout={() => void handleGoogleLogout()}
              onUploadImage={(role, file) => void handleOcrUploadImage(role, file)}
              onPlayerSelectedChange={handleOcrPlayerSelectedChange}
              onPlayerCardTypeChange={handleOcrPlayerCardTypeChange}
              onPlayerPositionChange={handleOcrPlayerPositionChange}
              onPlayerStarterHandChange={handleOcrPlayerStarterHandChange}
              onSkillChange={handleOcrSkillChange}
              onSkillLevelChange={handleOcrSkillLevelChange}
              onSaveDraft={() => void handleOcrSaveDraft()}
              onSelectSnapshot={handleOpenPublicOcrSnapshot}
              onDeleteSnapshot={(uploadId) => void handleDeletePublicOcrSnapshot(uploadId)}
              onGoHome={handleGoHome}
            />
          ) : toolView === "trainingRedistribution" ? (
            <TrainingRedistributionView
              themeAction={themeToggle}
              onGoHome={handleGoHome}
            />
          ) : toolView === "ranking" ? (
            <div className="main-stage tool-page ranking-page">
              <KakaoAdFitPcTopTripleBanner enabled={shouldShowKakaoAdFit} />
              <div className="page-toolbar tool-page-hero ranking-page-hero">
                <div className="page-title-block">
                  <span className="page-kicker">Leaderboard</span>
                  <h1>고스변 랭킹챌린지</h1>
                  <p>하루 한 번 기록하고 이번 주 최고 점수를 경쟁합니다.</p>
                </div>
                <div className="page-toolbar-actions">
                  {themeToggle}
                  <button type="button" className="ghost-btn page-home-btn" onClick={handleGoHome}>
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
          ) : toolView === "skillQuiz" ? (
            <SkillQuizView
              authSession={authSession}
              supabaseReady={supabaseReady}
              themeAction={themeToggle}
              onGoHome={handleGoHome}
            />
          ) : (
            <ToolboxStage
              toolView={toolboxToolView}
              mode={mode}
              hitterPositionGroup={hitterPositionGroup}
              hitterBattingSide={hitterBattingSide}
              starterHand={starterHand}
              pitcherStaminaRange={pitcherStaminaRange}
              skillMarbleMode={skillMarbleMode}
              cardType={cardType}
              activeCardType={activeCardType}
              gameData={gameData}
              pitcherRole={pitcherRole}
              resultGradeColor={resultGradeColor}
              judgeGrade={judgeGrade}
              totalScore={gameData ? totalScoreDisplay : "-"}
              impactTotalScoreWithFirst={gameData ? impactTotalScoreWithFirstDisplay : "-"}
              skillOdds={skillOdds}
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
              onHitterBattingSideChange={handleHitterBattingSideChange}
              onStarterHandChange={handleStarterHandChange}
              onPitcherStaminaRangeChange={handlePitcherStaminaRangeChange}
              onSkillMarbleModeChange={setSkillMarbleMode}
              onCardTypeChange={handleCardTypeChange}
              onReset={handleReset}
              onGoHome={handleGoHome}
              themeAction={themeToggle}
              onRollOnce={handleAdvancedSkillChangeRoll}
              onAutoRoll={handleAutoRollToTarget}
              onImpactRoll={handleImpactChangeRoll}
              resetImpactChangeSession={resetImpactChangeSession}
              guideContent={<ToolSeoPanel toolView={toolboxToolView} />}
            />
          )}
          </Suspense>

          {(toolView === "skillCompareBeta" ||
            toolView === "lineupSkillOcr" ||
            toolView === "trainingRedistribution") && (
            <ToolSeoPanel
              toolView={
                toolView === "skillCompareBeta" ||
                toolView === "lineupSkillOcr" ||
                toolView === "trainingRedistribution"
                  ? toolView
                  : toolboxToolView
              }
            />
          )}
        </AppChrome>

        <KakaoAdFitFixedBanner
          enabled={shouldShowKakaoAdFit}
          showSide={toolView !== "skillQuiz"}
        />
        <Analytics />
      </div>
    </div>
  );
}

export default App;
