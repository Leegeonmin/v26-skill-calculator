import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { CARD_TYPE_LABELS } from "./data/cardTypes";
import { getGameDataSet } from "./data/gameData";
import { RESULT_GRADE_COLORS, SKILL_GRADE_COLORS } from "./data/uiColors";
import {
  ensureProfile,
  getMyProfile,
  signInWithGoogle,
  signOut,
  updateMyProfileDisplayName,
} from "./lib/auth";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase";
import CalculatorView from "./views/CalculatorView";
import AdvancedSimulatorView from "./views/AdvancedSimulatorView";
import ImpactSimulatorView from "./views/ImpactSimulatorView";
import RankingView from "./views/RankingView";
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

const TOOL_VIEW_LABELS: Record<Exclude<ToolView, "ranking">, string> = {
  calculator: "스킬점수 계산기",
  simulator: "고스변 시뮬",
  impactChange: "임팩트 스변 시뮬",
};

type IconName = "trophy" | "calculator" | "sparkles" | "flame" | "google";

function IconGlyph({ name, className = "" }: { name: IconName; className?: string }) {
  if (name === "trophy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M8 4h8v2h3v2a5 5 0 0 1-5 5h-.35A6 6 0 0 1 13 15.92V18h3v2H8v-2h3v-2.08A6 6 0 0 1 10.35 13H10a5 5 0 0 1-5-5V6h3V4Zm-1 4a3 3 0 0 0 3 3V8H7Zm10 3a3 3 0 0 0 3-3h-3v3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4v3h10V7H7Zm2 6H7v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2ZM9 17H7v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="m12 3 1.75 4.25L18 9l-4.25 1.75L12 15l-1.75-4.25L6 9l4.25-1.75L12 3Zm6 10 1 2.5L21.5 16 19 17l-1 2.5L17 17l-2.5-1 2.5-.5 1-2.5ZM6 14l.8 1.7L8.5 16l-1.7.8L6 18.5l-.8-1.7L3.5 16l1.7-.3L6 14Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "flame") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M13.5 2s.5 2.5-1 4.5C11 8.5 8 9.5 8 14a4 4 0 0 0 8 0c0-2.5-1.5-4-2.5-5.5C12 6.5 13.5 2 13.5 2Zm-1 8.5c1 1 2.5 2.2 2.5 4.5a3 3 0 1 1-6 0c0-2.77 1.86-3.84 3.5-4.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isNicknameBusy, setIsNicknameBusy] = useState(false);

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
  const shouldRequireNickname = Boolean(authSession && supabaseReady && !profileDisplayName);
  const serviceInfo = SERVICE_INFO[activeService];

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
            setNicknameInput(profile?.display_name?.trim() || "");
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
        setNicknameInput("");
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
            setNicknameInput(profile?.display_name?.trim() || "");
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
        setNicknameInput("");
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

    const autoRollSuccess =
      finalJudgeResult && GRADE_RANK[finalJudgeResult.grade] >= GRADE_RANK[targetGrade];

    if (autoRollSuccess) {
      setSimLastMessage(`${tryCount}번 만에 ${targetGrade} 이상 달성`);
      return;
    }

    setSimLastMessage(`${AUTO_ROLL_LIMIT}번 안에 ${targetGrade} 이상이 나오지 않았음`);
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
      await signInWithGoogle();
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

  const handleNicknameSubmit = async () => {
    setNicknameError(null);
    setIsNicknameBusy(true);

    try {
      const profile = await updateMyProfileDisplayName(nicknameInput);
      setProfileDisplayName(profile.display_name?.trim() || null);
      setNicknameInput(profile.display_name?.trim() || "");
    } catch (error) {
      setNicknameError(
        error instanceof Error ? error.message : "닉네임을 저장하지 못했습니다."
      );
    } finally {
      setIsNicknameBusy(false);
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
      return;
    }

    setImpactLastMessage(`${IMPACT_CHANGE_LIMIT}번 안에 2, 3번 메이저가 나오지 않았음`);
  };

  return (
    <div className="app-bg">
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-header-brand">
              <button
                type="button"
                className="app-mobile-nav-trigger"
                onClick={() => setMobileNavOpen(true)}
                aria-label="메뉴 열기"
              >
                <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
                  <path
                    d="M4 7h16v2H4V7Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <div className="app-header-badge" aria-hidden="true">
                <IconGlyph
                  name={activeService === "ranking" ? "trophy" : "calculator"}
                  className="ui-icon"
                />
              </div>
              <div className="app-header-copy">
                <h1>{serviceInfo.title}</h1>
                <p>{serviceInfo.subtitle}</p>
              </div>
            </div>

            {activeService === "ranking" && (
              <div className="auth-panel app-header-action">
                {!supabaseReady && <span className="auth-hint">Supabase 설정 필요</span>}

                {supabaseReady && authDisplayName && (
                  <>
                    <span className="auth-user">{authDisplayName}</span>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={handleSignOut}
                      disabled={isAuthBusy}
                    >
                      {isAuthBusy ? "처리 중..." : "로그아웃"}
                    </button>
                  </>
                )}

                {supabaseReady && !authDisplayName && (
                  <button
                    type="button"
                    className="ghost-btn app-header-login"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthBusy}
                  >
                    <IconGlyph name="google" className="ui-icon" />
                    <span>{isAuthBusy ? "처리 중..." : "Google 로그인"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {mobileNavOpen && (
          <button
            type="button"
            className="mobile-nav-overlay"
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside className={`mobile-nav-drawer ${mobileNavOpen ? "open" : ""}`} aria-label="모바일 메뉴">
          <div className="mobile-nav-head">
            <strong>메뉴</strong>
            <button
              type="button"
              className="app-mobile-nav-close"
              onClick={() => setMobileNavOpen(false)}
              aria-label="메뉴 닫기"
            >
              <svg viewBox="0 0 24 24" className="ui-icon" aria-hidden="true">
                <path
                  d="m6.7 5.3 5.3 5.3 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <div className="mobile-nav-content">
            {/* <div className="side-section">
              <p className="side-section-title">고스변 랭킹챌린지</p>
              <button
                type="button"
                className={`side-button ${activeService === "ranking" ? "active" : ""}`}
                onClick={() => {
                  handleServiceChange("ranking");
                  setMobileNavOpen(false);
                }}
              >
                <span className="side-button-icon" aria-hidden="true">
                  <IconGlyph name="trophy" className="ui-icon" />
                </span>
                <span className="side-button-label">주간 시즌 리더보드</span>
                <span className="side-button-tail" aria-hidden="true">
                  <IconGlyph name="sparkles" className="ui-icon ui-icon-xs" />
                </span>
              </button>
            </div> */}

            <div className="side-section">
              <p className="side-section-title">v26 스킬 계산</p>
              <button
                type="button"
                className={`side-button ${activeService === "toolbox" ? "active" : ""}`}
                onClick={() => {
                  handleServiceChange("toolbox");
                  setMobileNavOpen(false);
                }}
              >
                <span className="side-button-icon" aria-hidden="true">
                  <IconGlyph name="calculator" className="ui-icon" />
                </span>
                <span className="side-button-label">계산기 / 시뮬레이터</span>
                <span className="side-button-tail" aria-hidden="true">
                  <IconGlyph name="sparkles" className="ui-icon ui-icon-xs" />
                </span>
              </button>
            </div>
          </div>
        </aside>

        <div className="app-body">
          <aside className="side-dock" aria-label="서비스 선택">
            <div className="side-nav">
              {/* <div className="side-section">
                <p className="side-section-title">고스변 랭킹챌린지</p>
                <button
                  type="button"
                  className={`side-button ${activeService === "ranking" ? "active" : ""}`}
                  onClick={() => handleServiceChange("ranking")}
                >
                  <span className="side-button-icon" aria-hidden="true">
                    <IconGlyph name="trophy" className="ui-icon" />
                  </span>
                  <span className="side-button-label">주간 시즌 리더보드</span>
                  <span className="side-button-tail" aria-hidden="true">
                    <IconGlyph name="sparkles" className="ui-icon ui-icon-xs" />
                  </span>
                </button>
              </div> */}

              <div className="side-section">
                <p className="side-section-title">v26 스킬 계산</p>
                <button
                  type="button"
                  className={`side-button ${activeService === "toolbox" ? "active" : ""}`}
                  onClick={() => handleServiceChange("toolbox")}
                >
                  <span className="side-button-icon" aria-hidden="true">
                    <IconGlyph name="calculator" className="ui-icon" />
                  </span>
                  <span className="side-button-label">계산기 / 시뮬레이터</span>
                  <span className="side-button-tail" aria-hidden="true">
                    <IconGlyph name="sparkles" className="ui-icon ui-icon-xs" />
                  </span>
                </button>
              </div>
            </div>
          </aside>

          <div className="main-stage">
            {authError && <p className="auth-error">{authError}</p>}

            {activeService === "toolbox" && (
              <div className="tool-tabs-bar">
                <div className="tool-tabs" role="tablist" aria-label="도구 선택">
                  <button
                    type="button"
                    className={`tool-tab ${toolboxToolView === "calculator" ? "active" : ""}`}
                    onClick={() => handleToolViewChange("calculator")}
                  >
                    <IconGlyph name="calculator" className="ui-icon" />
                    <span>{TOOL_VIEW_LABELS.calculator}</span>
                  </button>
                  <button
                    type="button"
                    className={`tool-tab ${toolboxToolView === "simulator" ? "active" : ""}`}
                    onClick={() => handleToolViewChange("simulator")}
                  >
                    <IconGlyph name="sparkles" className="ui-icon" />
                    <span>{TOOL_VIEW_LABELS.simulator}</span>
                  </button>
                  <button
                    type="button"
                    className={`tool-tab ${toolboxToolView === "impactChange" ? "active" : ""}`}
                    onClick={() => handleToolViewChange("impactChange")}
                  >
                    <IconGlyph name="flame" className="ui-icon" />
                    <span>{TOOL_VIEW_LABELS.impactChange}</span>
                  </button>
                </div>
              </div>
            )}

            <main className="layout-grid">
          {toolView === "ranking" ? (
            <section className="panel panel-main panel-wide">
              <RankingView
                authSession={authSession}
                supabaseReady={supabaseReady}
              />
            </section>
          ) : (
            <>
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
                          onClick={() => handleModeChange("hitter")}
                        >
                          타자
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "starter" ? "active" : ""}`}
                          onClick={() => handleModeChange("starter")}
                        >
                          선발
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "middle" ? "active" : ""}`}
                          onClick={() => handleModeChange("middle")}
                        >
                          중계
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "closer" ? "active" : ""}`}
                          onClick={() => handleModeChange("closer")}
                        >
                          마무리
                        </button>
                      </div>
                    </div>

                    <div className="control-section">
                      <label>카드 타입</label>
                      <div className="toggle-row toggle-row-cards">
                        {CARD_TYPE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`toggle-btn ${cardType === option.value ? "active" : ""}`}
                            onClick={() => handleCardTypeChange(option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="control-reset-row">
                    <button type="button" className="ghost-btn control-reset-btn" onClick={handleReset}>
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
                          onClick={() => handleModeChange("hitter")}
                        >
                          타자
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "starter" ? "active" : ""}`}
                          onClick={() => handleModeChange("starter")}
                        >
                          선발
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "middle" ? "active" : ""}`}
                          onClick={() => handleModeChange("middle")}
                        >
                          중계
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${mode === "closer" ? "active" : ""}`}
                          onClick={() => handleModeChange("closer")}
                        >
                          마무리
                        </button>
                      </div>
                    </div>

                    {(toolView === "simulator" || toolView === "impactChange") &&
                      mode === "hitter" && (
                        <div className="control-section">
                          <label>타자 포지션</label>
                          <div className="toggle-row">
                            <button
                              type="button"
                              className={`toggle-btn ${
                                hitterPositionGroup === "fielder" ? "active" : ""
                              }`}
                              onClick={() => handleHitterPositionGroupChange("fielder")}
                            >
                              야수
                            </button>
                            <button
                              type="button"
                              className={`toggle-btn ${
                                hitterPositionGroup === "catcher" ? "active" : ""
                              }`}
                              onClick={() => handleHitterPositionGroupChange("catcher")}
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
                          {CARD_TYPE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`toggle-btn ${cardType === option.value ? "active" : ""}`}
                              onClick={() => handleCardTypeChange(option.value)}
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
                    <button type="button" className="ghost-btn control-reset-btn" onClick={handleReset}>
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
            </>
          )}
            </main>
          </div>
        </div>

        <footer className="app-footer">made by 우주</footer>
        {shouldRequireNickname && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="nickname-modal-title"
            >
              <p className="modal-eyebrow">첫 로그인 설정</p>
              <h2 id="nickname-modal-title">사용할 닉네임을 입력해주세요</h2>
              <p className="modal-copy">
                구글 이름 대신 랭킹과 화면에 표시할 닉네임으로 저장됩니다.
              </p>
              <input
                type="text"
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                placeholder="2자 이상 12자 이하"
                maxLength={12}
                autoFocus
              />
              {nicknameError && <p className="modal-error">{nicknameError}</p>}
              <button
                type="button"
                className="primary-btn"
                onClick={() => void handleNicknameSubmit()}
                disabled={isNicknameBusy}
              >
                {isNicknameBusy ? "저장 중..." : "닉네임 저장"}
              </button>
            </div>
          </div>
        )}
        <Analytics />
      </div>
    </div>
  );
}

export default App;
