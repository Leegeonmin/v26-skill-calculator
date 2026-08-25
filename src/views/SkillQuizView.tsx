import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  KakaoAdFitMobileMidBanner,
  KakaoAdFitPcSideBanner,
} from "../components/KakaoAdFitFixedBanner";
import { getGameDataSet, type GameDataSet } from "../data/gameData";
import { getDefaultLevels } from "../lib/toolboxHelpers";
import {
  getSkillQuizMyRank,
  getSkillQuizTop10,
  submitSkillQuizScore,
  type SkillQuizRankSummary,
  type SkillQuizTopRank,
} from "../lib/skillQuiz";
import type { CalculatorMode, CardType, SkillLevel, SkillMeta, StarterHand } from "../types";
import { calculateSkillTotal } from "../utils/calculate";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

type SkillQuizViewProps = {
  themeAction?: ReactNode;
  onGoHome: () => void;
  authSession: Session | null;
  supabaseReady: boolean;
};

type QuizPhase = "start" | "playing" | "review" | "result";
type QuizSide = "left" | "right";

type SeasonRule = {
  id: string;
  title: string;
  mode: CalculatorMode;
  cardType: CardType;
  starterHand?: StarterHand;
  roleLabel: string;
};

type QuizSkill = {
  id: string;
  name: string;
  grade: SkillMeta["grade"];
  level: SkillLevel;
  score: number;
};

type QuizSet = {
  skills: QuizSkill[];
  total: number;
};

type QuizQuestion = {
  id: string;
  left: QuizSet;
  right: QuizSet;
  answer: QuizSide;
  diff: number;
};

type QuizRecord = {
  score: number;
  correct: number;
  bestCombo: number;
  averageMs: number;
  completedAt: string;
};

const QUESTION_COUNT = 10;
const QUESTION_SECONDS = 8;
const MIN_SCORE_DIFF = 0.5;
const MAX_SCORE_DIFF = 3;
const REVIEW_DELAY_MS = 850;
const SEASON_RECORD_KEY_PREFIX = "v26-skill-quiz-season-record:";
const ALL_TIME_RECORD_KEY = "v26-skill-quiz-all-time-record";

const SEASON_RULES: SeasonRule[] = [
  {
    id: "hitter-signature",
    title: "타자 시그니처",
    mode: "hitter",
    cardType: "signature",
    roleLabel: "타자 · 시그니처",
  },
  {
    id: "starter-signature-right",
    title: "우투 선발 시그니처",
    mode: "starter",
    cardType: "signature",
    starterHand: "right",
    roleLabel: "선발 · 시그니처 · 우투",
  },
  {
    id: "middle-signature",
    title: "중계 시그니처",
    mode: "middle",
    cardType: "signature",
    roleLabel: "중계 · 시그니처",
  },
  {
    id: "closer-golden-glove",
    title: "마무리 골든글러브",
    mode: "closer",
    cardType: "goldenGlove",
    roleLabel: "마무리 · 골든글러브",
  },
  {
    id: "hitter-golden-glove",
    title: "타자 골든글러브",
    mode: "hitter",
    cardType: "goldenGlove",
    roleLabel: "타자 · 골든글러브",
  },
];

function getKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
  };
}

function getSeasonInfo(date = new Date()) {
  const { year, month, day } = getKstDateParts(date);
  const kstMidday = Date.UTC(year, month - 1, day, 12);
  const dayOfWeek = new Date(kstMidday).getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kstMidday + mondayOffset * 86_400_000);
  const firstMondayBase = Date.UTC(monday.getUTCFullYear(), 0, 4, 12);
  const firstMondayDay = new Date(firstMondayBase).getUTCDay();
  const firstMondayOffset = firstMondayDay === 0 ? -6 : 1 - firstMondayDay;
  const firstMonday = firstMondayBase + firstMondayOffset * 86_400_000;
  const weekIndex = Math.floor((monday.getTime() - firstMonday) / (7 * 86_400_000)) + 1;
  const seasonKey = `${monday.getUTCFullYear()}-W${String(weekIndex).padStart(2, "0")}`;
  const rule = SEASON_RULES[Math.abs(weekIndex - 1) % SEASON_RULES.length];

  return {
    key: seasonKey,
    label: `${monday.getUTCFullYear()}년 ${weekIndex}주차`,
    rule,
  };
}

function readRecord(key: string): QuizRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const rawRecord = window.localStorage.getItem(key);
    return rawRecord ? (JSON.parse(rawRecord) as QuizRecord) : null;
  } catch {
    return null;
  }
}

function writeRecord(key: string, record: QuizRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(record));
}

function getTier(score: number) {
  if (score >= 2800) return { name: "마스터", icon: "M", next: null, color: "#7c3aed" };
  if (score >= 2500) return { name: "다이아", icon: "D", next: { name: "마스터", score: 2800 }, color: "#2563eb" };
  if (score >= 2200) return { name: "플래티넘", icon: "P", next: { name: "다이아", score: 2500 }, color: "#0891b2" };
  if (score >= 1900) return { name: "골드", icon: "G", next: { name: "플래티넘", score: 2200 }, color: "#d97706" };
  if (score >= 1500) return { name: "실버", icon: "S", next: { name: "골드", score: 1900 }, color: "#64748b" };
  if (score >= 1000) return { name: "브론즈", icon: "B", next: { name: "실버", score: 1500 }, color: "#a16207" };
  return { name: "루키", icon: "R", next: { name: "브론즈", score: 1000 }, color: "#475569" };
}

function getSkillGradeOrder(grade: SkillMeta["grade"]) {
  switch (grade) {
    case "major":
      return 0;
    case "nationalOnly":
      return 1;
    case "minor":
      return 2;
    case "rookie":
      return 3;
    case "amateur":
      return 4;
    default:
      return 5;
  }
}

function shuffle<T>(items: T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function hasSameSkillFamily(skills: SkillMeta[], candidate: SkillMeta) {
  const candidateBaseName = normalizeSkillBaseName(candidate.name);
  return skills.some((skill) => normalizeSkillBaseName(skill.name) === candidateBaseName);
}

function getCandidateSkills(dataSet: GameDataSet, cardType: CardType, levels: SkillLevel[]) {
  return dataSet.skills.filter((skill) => {
    if (!skill.availableCardTypes.includes(cardType)) return false;
    return levels.every((level) => typeof dataSet.scoreTable[skill.id]?.[level] === "number");
  });
}

function buildQuizSet(dataSet: GameDataSet, candidates: SkillMeta[], levels: SkillLevel[], cardType: CardType): QuizSet | null {
  const selected: SkillMeta[] = [];

  for (const skill of shuffle(candidates)) {
    if (selected.length >= 3) break;
    if (hasSameSkillFamily(selected, skill)) continue;
    selected.push(skill);
  }

  if (selected.length < 3) return null;

  const skillIds = selected.map((skill) => skill.id);
  const total = calculateSkillTotal({
    cardType,
    skillIds,
    skillLevels: levels,
    scoreTable: dataSet.scoreTable,
  });

  return {
    skills: selected.map((skill, index) => ({
      id: skill.id,
      name: skill.name,
      grade: skill.grade,
      level: levels[index],
      score: dataSet.scoreTable[skill.id]?.[levels[index]] ?? 0,
    })),
    total,
  };
}

function buildQuestion(dataSet: GameDataSet, rule: SeasonRule, index: number): QuizQuestion {
  const levels = getDefaultLevels(rule.cardType);
  const candidates = getCandidateSkills(dataSet, rule.cardType, levels);

  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const left = buildQuizSet(dataSet, candidates, levels, rule.cardType);
    const right = buildQuizSet(dataSet, candidates, levels, rule.cardType);

    if (!left || !right) break;
    const leftIds = left.skills.map((skill) => skill.id).join(",");
    const rightIds = right.skills.map((skill) => skill.id).join(",");
    const diff = Number(Math.abs(left.total - right.total).toFixed(2));

    if (leftIds !== rightIds && diff >= MIN_SCORE_DIFF && diff <= MAX_SCORE_DIFF) {
      return {
        id: `${rule.id}-${Date.now()}-${index}-${attempt}`,
        left,
        right,
        answer: left.total > right.total ? "left" : "right",
        diff,
      };
    }
  }

  const left = buildQuizSet(dataSet, candidates, levels, rule.cardType);
  const right = buildQuizSet(dataSet, candidates, levels, rule.cardType);

  if (!left || !right) {
    throw new Error("스킬 문제를 만들 수 없습니다.");
  }

  return {
    id: `${rule.id}-${Date.now()}-${index}-fallback`,
    left,
    right,
    answer: left.total >= right.total ? "left" : "right",
    diff: Number(Math.abs(left.total - right.total).toFixed(2)),
  };
}

function buildQuestions(rule: SeasonRule) {
  const dataSet = getGameDataSet({
    playerType: rule.mode === "hitter" ? "hitter" : "pitcher",
    pitcherRole: rule.mode === "hitter" ? "starter" : rule.mode,
    starterHand: rule.starterHand ?? "right",
  });

  if (!dataSet) {
    throw new Error("시즌 조건에 맞는 스킬 데이터를 불러올 수 없습니다.");
  }

  return Array.from({ length: QUESTION_COUNT }, (_, index) => buildQuestion(dataSet, rule, index));
}

function formatScore(score: number) {
  return Math.round(score).toLocaleString("ko-KR");
}

function formatSeconds(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  return `${(ms / 1000).toFixed(1)}초`;
}

type SkillQuizSharePayload = {
  score: number;
  correctCount: number;
  bestCombo: number;
  averageMs: number;
  tierName: string;
  tierColor: string;
  seasonLabel: string;
  roleLabel: string;
  rankLabel: string;
  url: string;
};

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

async function copySkillQuizResultImage(payload: SkillQuizSharePayload) {
  if (typeof document === "undefined") {
    throw new Error("이미지를 만들 수 없습니다.");
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof ClipboardItem === "undefined"
  ) {
    throw new Error("이미지 클립보드를 사용할 수 없습니다.");
  }

  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1350;
  const scale = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지를 만들 수 없습니다.");
  }

  context.scale(scale, scale);
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1d4ed8");
  gradient.addColorStop(0.5, "#0f172a");
  gradient.addColorStop(1, "#111827");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  drawRoundedRect(context, 70, 70, width - 140, height - 140, 34);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText("CPBV LAB", 118, 145);

  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.font = "700 36px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText("스잘알 챌린지 결과", 118, 218);

  context.fillStyle = "#ffffff";
  context.font = "900 150px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText(`${formatScore(payload.score)}점`, 112, 380);

  context.fillStyle = payload.tierColor;
  drawRoundedRect(context, 118, 425, 260, 92, 46);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 42px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText(payload.tierName, 168, 486);

  const statCards = [
    ["정답", `${payload.correctCount}/${QUESTION_COUNT}`],
    ["최고 콤보", `${payload.bestCombo}`],
    ["평균 응답", formatSeconds(payload.averageMs)],
    ["시즌 순위", payload.rankLabel],
  ];

  statCards.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardX = 118 + column * 430;
    const cardY = 575 + row * 190;

    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    drawRoundedRect(context, cardX, cardY, 390, 145, 22);
    context.fill();
    context.fillStyle = "#64748b";
    context.font = "800 28px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    context.fillText(label, cardX + 34, cardY + 54);
    context.fillStyle = "#0f172a";
    context.font = "900 42px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    context.fillText(value, cardX + 34, cardY + 108, 320);
  });

  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  drawRoundedRect(context, 118, 982, 844, 174, 24);
  context.fill();
  context.fillStyle = "#475569";
  context.font = "800 30px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText(payload.seasonLabel, 154, 1042);
  context.fillStyle = "#0f172a";
  context.font = "900 42px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText(payload.roleLabel, 154, 1100);

  context.fillStyle = "rgba(255, 255, 255, 0.74)";
  context.font = "700 28px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.fillText(payload.url, 118, 1240);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  if (!blob) {
    throw new Error("이미지를 복사할 수 없습니다.");
  }

  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

function TierBadge({ tier }: { tier: ReturnType<typeof getTier> }) {
  return (
    <span className="skill-quiz-tier-badge" style={{ "--tier-color": tier.color } as CSSProperties}>
      {tier.icon}
    </span>
  );
}

function SkillSetButton({
  set,
  selected,
  correct,
  wrong,
  dimmed,
  disabled,
  onClick,
}: {
  set: QuizSet;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  dimmed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const className = [
    "skill-quiz-set",
    selected ? "is-selected" : "",
    correct ? "is-correct" : "",
    wrong ? "is-wrong" : "",
    dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {[...set.skills]
        .sort((left, right) => getSkillGradeOrder(left.grade) - getSkillGradeOrder(right.grade) || right.score - left.score)
        .map((skill) => (
        <span className="skill-quiz-skill" key={skill.id}>
          <strong>{skill.name}</strong>
          <em>Lv.{skill.level}</em>
        </span>
      ))}
    </button>
  );
}

export default function SkillQuizView({
  themeAction,
  onGoHome,
  authSession,
  supabaseReady,
}: SkillQuizViewProps) {
  const season = useMemo(() => getSeasonInfo(), []);
  const seasonRecordKey = `${SEASON_RECORD_KEY_PREFIX}${season.key}:${season.rule.id}`;
  const [phase, setPhase] = useState<QuizPhase>("start");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_SECONDS * 1000);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalAnswerMs, setTotalAnswerMs] = useState(0);
  const [selectedSide, setSelectedSide] = useState<QuizSide | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [seasonBest, setSeasonBest] = useState<QuizRecord | null>(() => readRecord(seasonRecordKey));
  const [allTimeBest, setAllTimeBest] = useState<QuizRecord | null>(() => readRecord(ALL_TIME_RECORD_KEY));
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [seasonRankSummary, setSeasonRankSummary] = useState<SkillQuizRankSummary | null>(null);
  const [seasonRankStatus, setSeasonRankStatus] = useState<"idle" | "loading" | "saving" | "saved" | "login" | "none" | "error">("idle");
  const [topRankings, setTopRankings] = useState<SkillQuizTopRank[]>([]);
  const [topRankingsStatus, setTopRankingsStatus] = useState<"loading" | "idle" | "empty" | "error">("loading");

  const currentQuestion = questions[questionIndex] ?? null;
  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / (QUESTION_SECONDS * 1000)) * 100));
  const seasonBestTier = getTier(seasonBest?.score ?? 0);
  const resultAverageMs = answeredCount > 0 ? totalAnswerMs / answeredCount : 0;
  const perfectBonus = correctCount === QUESTION_COUNT ? 300 : 0;
  const finalScore = score + perfectBonus;
  const resultRecord: QuizRecord = {
    score: finalScore,
    correct: correctCount,
    bestCombo,
    averageMs: resultAverageMs,
    completedAt: new Date().toISOString(),
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!authSession || !supabaseReady) {
        if (cancelled) return;
        setSeasonRankSummary(null);
        setSeasonRankStatus("login");
        return;
      }

      setSeasonRankStatus("loading");

      void getSkillQuizMyRank(season.key, season.rule.id)
        .then((rankSummary) => {
          if (cancelled) return;
          setSeasonRankSummary(rankSummary);
          setSeasonRankStatus(rankSummary ? "saved" : "none");
        })
        .catch(() => {
          if (cancelled) return;
          setSeasonRankSummary(null);
          setSeasonRankStatus("error");
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authSession, season.key, season.rule.id, supabaseReady]);

  const refreshTopRankings = useCallback(() => {
    if (!supabaseReady) {
      setTopRankings([]);
      setTopRankingsStatus("error");
      return;
    }

    setTopRankingsStatus("loading");

    void getSkillQuizTop10(season.key, season.rule.id)
      .then((rankings) => {
        setTopRankings(rankings);
        setTopRankingsStatus(rankings.length > 0 ? "idle" : "empty");
      })
      .catch(() => {
        setTopRankings([]);
        setTopRankingsStatus("error");
      });
  }, [season.key, season.rule.id, supabaseReady]);

  useEffect(() => {
    const timer = window.setTimeout(refreshTopRankings, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshTopRankings]);

  const finishGame = () => {
    setPhase("result");

    const isSeasonBest = !seasonBest || finalScore > seasonBest.score;
    const isAllTimeBest = !allTimeBest || finalScore > allTimeBest.score;

    if (isSeasonBest) {
      writeRecord(seasonRecordKey, resultRecord);
      setSeasonBest(resultRecord);

      if (authSession && supabaseReady) {
        setSeasonRankStatus("saving");
        void submitSkillQuizScore({
          seasonKey: season.key,
          seasonLabel: season.label,
          ruleId: season.rule.id,
          roleLabel: season.rule.roleLabel,
          score: resultRecord.score,
          correctCount: resultRecord.correct,
          bestCombo: resultRecord.bestCombo,
          averageMs: resultRecord.averageMs,
        })
          .then((rankSummary) => {
            setSeasonRankSummary(rankSummary);
            setSeasonRankStatus(rankSummary ? "saved" : "idle");
            refreshTopRankings();
          })
          .catch(() => {
            setSeasonRankStatus("error");
          });
      } else {
        setSeasonRankStatus("login");
        setSeasonRankSummary(null);
      }
    }

    if (isAllTimeBest) {
      writeRecord(ALL_TIME_RECORD_KEY, resultRecord);
      setAllTimeBest(resultRecord);
    }
  };

  const goNextQuestion = () => {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= QUESTION_COUNT) {
      finishGame();
      return;
    }

    setQuestionIndex(nextIndex);
    setSelectedSide(null);
    setLastCorrect(null);
    setTimeLeftMs(QUESTION_SECONDS * 1000);
    setQuestionStartedAt(Date.now());
    setPhase("playing");
  };

  const answerQuestion = (side: QuizSide | null) => {
    if (!currentQuestion || phase !== "playing") return;

    const elapsedMs = Math.max(0, Date.now() - questionStartedAt);
    const remainingSeconds = Math.max(0, (QUESTION_SECONDS * 1000 - elapsedMs) / 1000);
    const isCorrect = side === currentQuestion.answer;
    const nextCombo = isCorrect ? combo + 1 : 0;
    const answerScore = isCorrect
      ? 200 + Math.floor(remainingSeconds * 10) + (nextCombo >= 3 ? 30 : 0)
      : 0;

    setSelectedSide(side);
    setLastCorrect(isCorrect);
    setAnsweredCount((current) => current + 1);
    setTotalAnswerMs((current) => current + Math.min(QUESTION_SECONDS * 1000, elapsedMs));
    setScore((current) => current + answerScore);
    setCorrectCount((current) => current + (isCorrect ? 1 : 0));
    setCombo(nextCombo);
    setBestCombo((current) => Math.max(current, nextCombo));
    setPhase("review");
  };

  const startGame = () => {
    try {
      setQuestions(buildQuestions(season.rule));
      setQuestionIndex(0);
      setTimeLeftMs(QUESTION_SECONDS * 1000);
      setScore(0);
      setCorrectCount(0);
      setCombo(0);
      setBestCombo(0);
      setAnsweredCount(0);
      setTotalAnswerMs(0);
      setSelectedSide(null);
      setLastCorrect(null);
      setQuestionStartedAt(Date.now());
      setShareStatus("idle");
      setError(null);
      setPhase("playing");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "게임을 시작하지 못했습니다.");
    }
  };

  const getSeasonRankDisplay = () => {
    if (seasonRankSummary) {
      return {
        title: `${seasonRankSummary.total.toLocaleString("ko-KR")}명 중`,
        value: `${seasonRankSummary.rank.toLocaleString("ko-KR")}위`,
        copy: `${season.label} 현재 순위`,
      };
    }

    if (seasonRankStatus === "saving") {
      return {
        title: "시즌 순위",
        value: "저장 중",
        copy: "최고기록 저장 중",
      };
    }

    if (seasonRankStatus === "loading") {
      return {
        title: "시즌 순위",
        value: "확인 중",
        copy: "내 시즌 순위 조회 중",
      };
    }

    if (seasonRankStatus === "login") {
      return {
        title: "시즌 순위",
        value: "로그인 필요",
        copy: "로그인 후 최고기록 저장",
      };
    }

    if (seasonRankStatus === "error") {
      return {
        title: "시즌 순위",
        value: "확인 실패",
        copy: "랭킹 저장 또는 조회 실패",
      };
    }

    return {
      title: "시즌 순위",
      value: "기록 없음",
      copy: "이번 시즌 최고기록 대기",
    };
  };

  const shareResult = async () => {
    const displayedScore = finalScore;
    const displayedTier = getTier(displayedScore);
    const shareUrl =
      typeof window === "undefined" ? "https://www.cpbv-lab.com/skill-quiz/" : `${window.location.origin}/skill-quiz/`;
    const rankLabel = seasonRankSummary
      ? `${seasonRankSummary.total.toLocaleString("ko-KR")}명 중 ${seasonRankSummary.rank.toLocaleString("ko-KR")}위`
      : getSeasonRankDisplay().value;

    try {
      await copySkillQuizResultImage({
        score: displayedScore,
        correctCount,
        bestCombo,
        averageMs: resultAverageMs,
        tierName: displayedTier.name,
        tierColor: displayedTier.color,
        seasonLabel: season.label,
        roleLabel: season.rule.roleLabel,
        rankLabel,
        url: shareUrl,
      });
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  };

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = window.setInterval(() => {
      setTimeLeftMs((current) => {
        const nextTime = current - 100;
        if (nextTime <= 0) {
          window.clearInterval(timer);
          answerQuestion(null);
          return 0;
        }

        return nextTime;
      });
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase, questionStartedAt]);

  useEffect(() => {
    if (phase !== "review") return;

    const timer = window.setTimeout(() => {
      goNextQuestion();
    }, REVIEW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, questionIndex, questions.length]);

  const renderStartRanking = () => (
    <section className="skill-quiz-top-rank-card" aria-labelledby="skill-quiz-top-rank-title">
      <div className="skill-quiz-top-rank-head">
        <div>
          <span>Season Ranking</span>
          <h2 id="skill-quiz-top-rank-title">TOP 10</h2>
        </div>
        <button type="button" className="ghost-btn" onClick={refreshTopRankings}>
          새로고침
        </button>
      </div>

      {topRankingsStatus === "loading" ? (
        <p className="skill-quiz-rank-empty">랭킹 불러오는 중...</p>
      ) : topRankingsStatus === "error" ? (
        <p className="skill-quiz-rank-empty">랭킹을 불러오지 못했습니다.</p>
      ) : topRankingsStatus === "empty" ? (
        <p className="skill-quiz-rank-empty">아직 이번 시즌 기록이 없습니다.</p>
      ) : (
        <ol className="skill-quiz-top-rank-list">
          {topRankings.map((entry) => (
            <li key={`${entry.rank}-${entry.email}-${entry.score}`}>
              <span className="skill-quiz-top-rank-position">{entry.rank}</span>
              <div className="skill-quiz-top-rank-user">
                <strong>{entry.email}</strong>
                <em>{entry.correctCount}/{QUESTION_COUNT} 정답 · 콤보 {entry.bestCombo}</em>
              </div>
              <b>{formatScore(entry.score)}점</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  const renderStart = () => (
    <div className="skill-quiz-start">
      <section className="skill-quiz-hero">
        <span className="page-kicker">Skill Quiz</span>
        <h1>스잘알 챌린지</h1>
        <p>두 조합 중 총점이 더 높은 쪽을 8초 안에 고르세요.</p>
        <button type="button" className="primary-btn skill-quiz-start-btn" onClick={startGame}>
          시작하기
        </button>
        {error && <p className="skill-quiz-error">{error}</p>}
      </section>

      <section className="skill-quiz-season-card">
        <div>
          <span>이번 시즌</span>
          <h2>{season.rule.title}</h2>
          <p>{season.label} · {season.rule.roleLabel}</p>
        </div>
        <strong>문제당 {QUESTION_SECONDS}초</strong>
      </section>

      <section className="skill-quiz-record-grid" aria-label="내 기록">
        <article>
          <span>현재 최고점수</span>
          <strong>{seasonBest ? formatScore(seasonBest.score) : "0"}</strong>
          <em>{season.label} 기준</em>
        </article>
        <article className="skill-quiz-tier-card">
          <span>현재 티어</span>
          <div className="skill-quiz-tier-row">
            <TierBadge tier={seasonBestTier} />
            <strong style={{ color: seasonBestTier.color }}>{seasonBestTier.name}</strong>
          </div>
          <em>{seasonBest ? `${formatScore(seasonBest.score)}점 기준` : "첫 기록 대기"}</em>
        </article>
      </section>

      {renderStartRanking()}
    </div>
  );

  const renderPlaying = () => {
    if (!currentQuestion) return null;
    const isReview = phase === "review";

    return (
      <div className="skill-quiz-play">
        <section className="skill-quiz-role-banner" aria-label="이번 문제 조건">
          <span>이번 시즌 조건</span>
          <strong>{season.rule.roleLabel}</strong>
        </section>

        <section className="skill-quiz-status" aria-live="polite">
          <div>
            <span>문제 {questionIndex + 1} / {QUESTION_COUNT}</span>
            <strong>{formatScore(score)}점</strong>
          </div>
          <div>
            <span>콤보</span>
            <strong>{combo}</strong>
          </div>
          <div className="skill-quiz-timer">
            <strong>{(timeLeftMs / 1000).toFixed(1)}</strong>
            <span>초</span>
          </div>
          <div
            className="skill-quiz-timebar"
            role="progressbar"
            aria-label="남은 시간"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section className="skill-quiz-rule-strip">
          <strong>{season.rule.title}</strong>
          <span>점수 차이 {MIN_SCORE_DIFF}~{MAX_SCORE_DIFF}점 문제만 출제</span>
        </section>

        <section className="skill-quiz-versus" aria-label="스킬셋 선택">
          <SkillSetButton
            key={`${currentQuestion.id}-left`}
            set={currentQuestion.left}
            selected={selectedSide === "left"}
            correct={isReview && currentQuestion.answer === "left"}
            wrong={isReview && selectedSide === "left" && !lastCorrect}
            dimmed={isReview && currentQuestion.answer !== "left" && selectedSide !== "left"}
            disabled={isReview}
            onClick={() => answerQuestion("left")}
          />
          <SkillSetButton
            key={`${currentQuestion.id}-right`}
            set={currentQuestion.right}
            selected={selectedSide === "right"}
            correct={isReview && currentQuestion.answer === "right"}
            wrong={isReview && selectedSide === "right" && !lastCorrect}
            dimmed={isReview && currentQuestion.answer !== "right" && selectedSide !== "right"}
            disabled={isReview}
            onClick={() => answerQuestion("right")}
          />
        </section>

        {isReview && (
          <section className={`skill-quiz-review ${lastCorrect ? "is-correct" : "is-wrong"}`}>
            <strong>{lastCorrect ? "정답" : selectedSide ? "오답" : "시간 초과"}</strong>
            <span>
              {currentQuestion.left.total.toFixed(2)} vs {currentQuestion.right.total.toFixed(2)}
              {" · "}
              차이 {currentQuestion.diff.toFixed(2)}점
            </span>
          </section>
        )}
      </div>
    );
  };

  const renderResult = () => {
    const tier = getTier(score);
    const displayedScore = finalScore;
    const displayedTier = getTier(displayedScore);
    const nextTierCopy = displayedTier.next
      ? `${displayedTier.next.name}까지 ${formatScore(displayedTier.next.score - displayedScore)}점`
      : "최고 티어 달성";
    const seasonRankDisplay = getSeasonRankDisplay();

    return (
      <div className="skill-quiz-result">
        <section className="skill-quiz-result-hero">
          <span className="page-kicker">Result</span>
          <h1>{formatScore(displayedScore)}점</h1>
          <p>
            {correctCount}/{QUESTION_COUNT} 정답 · 최고 콤보 {bestCombo} · 평균 {formatSeconds(resultAverageMs)}
          </p>
        </section>

        <KakaoAdFitMobileMidBanner enabled />

        <section className="skill-quiz-record-grid" aria-label="결과 요약">
          <article>
            <span>이번 판 티어</span>
            <strong style={{ color: displayedTier.color }}>{displayedTier.name}</strong>
            <em>{nextTierCopy}</em>
          </article>
          <article>
            <span>이번 시즌 최고</span>
            <strong>{formatScore(Math.max(seasonBest?.score ?? 0, displayedScore))}</strong>
            <em>{season.rule.roleLabel}</em>
          </article>
          <article>
            <span>정답률</span>
            <strong>{Math.round((correctCount / QUESTION_COUNT) * 100)}%</strong>
            <em>{tier.name} 기준</em>
          </article>
          <article>
            <span>{seasonRankDisplay.title}</span>
            <strong>{seasonRankDisplay.value}</strong>
            <em>{seasonRankDisplay.copy}</em>
          </article>
        </section>

        <div className="skill-quiz-result-actions">
          <button type="button" className="primary-btn" onClick={startGame}>
            다시 도전
          </button>
          <button type="button" className="ghost-btn" onClick={() => setPhase("start")}>
            시작 화면
          </button>
          <button type="button" className="ghost-btn" onClick={shareResult}>
            결과 이미지 복사
          </button>
        </div>

        {shareStatus !== "idle" && (
          <p className={`skill-quiz-share-status is-${shareStatus}`}>
            {shareStatus === "copied" ? "결과 이미지가 클립보드에 복사되었습니다." : "이미지를 복사할 수 없습니다."}
          </p>
        )}
      </div>
    );
  };

  return (
    <main className="main-stage tool-page skill-quiz-page" aria-label="스잘알 챌린지">
      <div className="page-toolbar tool-page-hero skill-quiz-page-hero">
        <div className="page-title-block">
          <span className="page-kicker">Challenge</span>
          <h1>스잘알 챌린지</h1>
          <p>이번 시즌 조건 안에서 3점차 스킬 조합을 빠르게 판별합니다.</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>

      <div className="skill-quiz-ad-layout">
        <KakaoAdFitPcSideBanner enabled side="left" />
        <div className="skill-quiz-center-panel">
          {phase === "start" && renderStart()}
          {(phase === "playing" || phase === "review") && renderPlaying()}
          {phase === "result" && renderResult()}
        </div>
        <aside className="skill-quiz-sorry-rail" aria-label="광고 안내">
          <p>
            <span>광고</span>
            <span>많이 넣어서</span>
            <span>미안해</span>
          </p>
        </aside>
      </div>
    </main>
  );
}
