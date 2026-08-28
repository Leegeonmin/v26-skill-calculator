import { IconGlyph } from "../components/AppChrome";
import { KakaoAdFitPcTopTripleBanner } from "../components/KakaoAdFitFixedBanner";
import { useEffect, useState, type CSSProperties } from "react";
import { getGameDataSet } from "../data/gameData";
import { SKILL_GRADE_COLORS, SKILL_GRADE_DARK_COLORS } from "../data/uiColors";
import { getCurrentSeason, getMobileHomeTopRankings } from "../lib/ranking";
import type { ToolView } from "../types";
import type { RankingCategory, RankingRow } from "../types/ranking";

type HomeViewProps = {
  onSelectView: (view: Exclude<ToolView, "home">) => void;
  homeChangeMessage: string;
  currentUserId?: string | null;
};

type HomeWidget = {
  view: Exclude<ToolView, "home">;
  icon: "trophy" | "calculator" | "sparkles" | "compare" | "zap" | "users" | "flame" | "scan" | "notice" | "chart" | "userScan" | "quiz";
  title: string;
  description: string;
  meta: string;
};

type HomeWidgetSection = {
  id: string;
  title: string;
  description: string;
  grouped: boolean;
  widgets: HomeWidget[];
};

const HOME_WIDGET_SECTIONS: HomeWidgetSection[] = [
  {
    id: "calculator",
    title: "계산기",
    description: "직접 계산하거나 고스변 화면을 비교합니다.",
    grouped: true,
    widgets: [
      {
        view: "calculator",
        icon: "calculator",
        title: "스킬 점수 계산기",
        description: "카드의 스킬 점수 계산",
        meta: "Skill Score",
      },
      {
        view: "skillCompareBeta",
        icon: "compare",
        title: "고스변 점수 비교",
        description: "고스변 화면의 기존/변경 후보 스킬을 좌우로 비교합니다.",
        meta: "SKILL CHANGE DIFF",
      },
      {
        view: "lineupSkill",
        icon: "userScan",
        title: "라인업 스킬",
        description: "타자/투수 라인업 9명의 스킬을 저장하고, 이후 필요한 선수만 열어서 수정합니다.",
        meta: "DECK SKILL",
      },
      {
        view: "skillQuiz",
        icon: "quiz",
        title: "스잘알 챌린지",
        description: "3점차 스킬 조합 중 더 높은 쪽을 8초 안에 맞힙니다.",
        meta: "SKILL QUIZ",
      },
      {
        view: "trainingRedistribution",
        icon: "sparkles",
        title: "훈련 재분배 확률",
        description: "파정선/변구 합계의 상위 확률과 기대 횟수를 계산합니다.",
        meta: "TRAINING ODDS",
      },
    ],
  },
  {
    id: "simulators",
    title: "시뮬레이터",
    description: "스킬 변경권 결과를 돌려보고 목표까지 걸리는 횟수를 확인합니다.",
    grouped: true,
    widgets: [
      {
        view: "simulator",
        icon: "chart",
        title: "고스변 시뮬",
        description: "인게임 내 고급스킬변경권과 같은 기능 + 원하는 등급까지 자동 롤",
        meta: "Advanced Roll",
      },
      {
        view: "impactChange",
        icon: "zap",
        title: "임팩트 변경 시뮬",
        description: "나는 일반 스킬 변경권으로 몇번을 돌려야 2메가 뜰까?",
        meta: "Impact Roll",
      },
      {
        view: "skillMarble",
        icon: "calculator",
        title: "임팩트 스킬 마블 계산기",
        description: "임팩트 1옵 고정 후 기존 2,3옵보다 높거나 낮을 확률을 계산합니다.",
        meta: "Impact Marble",
      },
      {
        view: "majorSkillMarble",
        icon: "calculator",
        title: "메이저 스킬 마블 계산기",
        description: "메이저 스킬 하나를 바꿀 때 더 높거나 낮은 후보를 점수순으로 봅니다.",
        meta: "Major Marble",
      },
    ],
  },
  {
    id: "challenge",
    title: "랭킹 챌린지",
    description: "하루 한 번 기록하고 이번 주 최고 점수를 경쟁합니다.",
    grouped: false,
    widgets: [
      {
        view: "ranking",
        icon: "trophy",
        title: "고스변 랭킹챌린지",
        description: "하루 한 번 기록하고 이번 주 최고 점수 경쟁",
        meta: "Leaderboard",
      },
    ],
  },
];

const RANKING_CATEGORY_LABELS: Record<RankingCategory, string> = {
  hitter: "타자",
  pitcher_starter: "투수",
};

function formatRankScore(score: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(score);
}

function getHomeRankSkillItems(row: RankingRow) {
  const gameData = getGameDataSet({
    playerType: row.category === "hitter" ? "hitter" : "pitcher",
    pitcherRole: "starter",
  });

  return row.current_skills.skillIds.map((skillId, index) => {
    const skill = gameData?.skills.find((item) => item.id === skillId);
    return {
      key: `${row.entry_id}-${skillId}-${index}`,
      name: skill?.name ?? skillId ?? "-",
      color: skill ? SKILL_GRADE_COLORS[skill.grade] : "var(--text)",
      darkColor: skill ? SKILL_GRADE_DARK_COLORS[skill.grade] : "var(--text)",
    };
  });
}

// Shared with NoticeView; keep this colocated with the home announcement source.
// eslint-disable-next-line react-refresh/only-export-components
export const NOTICE_ITEMS = [
  {
    date: "2026.08.24",
    title: "올스타 카드 스킬 점수 지원",
    body: "스킬 점수 계산기와 고스변 점수 비교에 올스타 카드 타입을 추가했습니다. 올스타 선택 시 기본 8/7/7 레벨과 9, 10레벨 점수 기준을 확인할 수 있습니다.",
  },
  {
    date: "2026.08.21",
    title: "스킬 마블 계산기 사용성 개선",
    body: "임팩트 스킬 마블 계산기와 메이저 스킬 마블 계산기의 모바일 선택 화면을 정리하고, 스킬 선택 후 목록 접기와 다시 선택 기능을 추가했습니다. 선봉장, 5툴플레이어, 철완처럼 조건별로 나뉘는 스킬도 실제 계산 기준에 맞게 후보와 예시에 반영되도록 조정했습니다.",
  },
  {
    date: "2026.08.20",
    title: "스킬 마블 계산기 2종 추가",
    body: "임팩트 스킬 마블 계산기와 메이저 스킬 마블 계산기를 추가했습니다. 임팩트 1옵 고정 기준 확률과 메이저 스킬 교체 후보를 선수 타입, 카드 타입, 스킬 레벨 기준으로 확인할 수 있습니다.",
  },
  {
    date: "2026.08.12",
    title: "타자 스위치히터 스킬 추가",
    body: "타자 스킬 점수표에 스위치히터(양타), 스위치히터(좌타), 스위치히터(우타)를 추가하고 계산기, 시뮬레이터, 랭킹, 수동 입력에서 같은 기준으로 사용할 수 있게 했습니다.",
  },
  {
    date: "2026.07.18",
    title: "임팩트 스킬 점수 계산 방식 개선",
    body: "임팩트 카드 계산기에서 1번 스킬과 레벨을 직접 바꿀 수 있게 하고, 1옵 포함 점수와 1옵 제외 점수를 함께 확인할 수 있도록 개선했습니다.",
  },
  {
    date: "2026.07.17",
    title: "국가대표 고스변 시뮬 스킬 풀 조정",
    body: "국가대표 카드 고스변 시뮬레이션에서 국대에이스(버프o)가 결과와 기대횟수 계산에 포함되지 않도록 제외했습니다.",
  },
  {
    date: "2026.07.17",
    title: "메인 화면 UI 개편",
    body: "대표 도구, 최근 업데이트, 고스변 랭킹 TOP3 배치를 정리하고 모바일 홈 구성을 간결하게 개선했습니다.",
  },
  {
    date: "2026.05.20",
    title: "국대에이스 점수 분리",
    body: "국대에이스 스킬을 버프 적용/미적용 항목으로 나누고, 라인업 스킬과 계산기에서 두 점수를 구분해 선택할 수 있게 했습니다.",
  },
  {
    date: "2026.05.13",
    title: "라인업 스킬 확률 표시와 복사 개선",
    body: "라인업 스킬 결과의 상위 확률을 소수점 3자리까지만 표시하고, 복사 내용에 선수별 등급과 확률도 함께 포함되도록 개선했습니다.",
  },
  {
    date: "2026.05.05",
    title: "고스변 확률 계산과 라인업 스킬 등급 표시 개선",
    body: "스킬 점수 계산기, 고스변 점수 비교, 라인업 스킬에 상위 확률과 등급 정보를 추가하고 자동롤 및 호버 UI를 다듬었습니다.",
  },
  {
    date: "2026.05.02",
    title: "라인업 스킬 공개 베타 추가",
    body: "Google 로그인 사용자에게 주 1회 타자/투수 라인업 스킬을 제공하고, 미저장 스냅샷 복구와 최근 기록 복사 기능을 추가했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 수동 입력 통계 세분화",
    body: "관리자 대시보드에서 공개 라인업 스킬, 스킬 수동 입력, 공개 스냅샷 저장/미저장 현황을 나눠 확인할 수 있게 했습니다.",
  },
  {
    date: "2026.05.02",
    title: "메인 화면 디자인 리뉴얼",
    body: "홈 화면 위젯 배치, 글래스모피즘 카드, 애니메이션 배경, 그라데이션 타이틀과 호버 효과를 적용했습니다.",
  },
  {
    date: "2026.05.02",
    title: "홈 화면 위젯 그룹 정리",
    body: "계산기와 시뮬레이터 위젯을 용도별로 묶고, PC와 모바일 화면에서 각 도구를 더 쉽게 구분할 수 있게 정리했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 수동 입력 사용량 통계 추가",
    body: "관리자 대시보드에서 라인업 스킬, 투수/타자 라인업 스킬, 고스변 점수 비교 인식 호출량과 저장 횟수를 확인할 수 있게 했습니다.",
  },
  {
    date: "2026.04.30",
    title: "스킬 점수표 업데이트",
    body: "타자 점수표를 최신 기준으로 개편하고, 투수 보직별 누락 스킬을 0점 항목까지 포함해 보강했습니다.",
  },
  {
    date: "2026.04.30",
    title: "공지사항 메뉴 추가",
    body: "업데이트 내역과 문의 저장 기능을 메인 화면에서 바로 확인할 수 있게 했습니다.",
  },
];

export default function HomeView({
  onSelectView,
  homeChangeMessage,
  currentUserId,
}: HomeViewProps) {
  void homeChangeMessage;
  const [mobileRankingState, setMobileRankingState] = useState<{
    category: RankingCategory;
    rankings: RankingRow[];
    status: "loading" | "idle" | "error";
  }>({
    category: "hitter",
    rankings: [],
    status: "loading",
  });

  const primaryWidgets: HomeWidget[] = [
    HOME_WIDGET_SECTIONS[0].widgets[0],
    HOME_WIDGET_SECTIONS[1].widgets[0],
    HOME_WIDGET_SECTIONS[0].widgets[2],
    HOME_WIDGET_SECTIONS[0].widgets[3],
  ];

  useEffect(() => {
    let mounted = true;

    async function loadMobileRankings() {
      let selectedCategory: RankingCategory = "pitcher_starter";

      try {
        const season = await getCurrentSeason();
        selectedCategory = season?.competition_category ?? selectedCategory;
        const rankings = await getMobileHomeTopRankings(selectedCategory, 3);

        if (!mounted) {
          return;
        }

        setMobileRankingState({
          category: selectedCategory,
          rankings,
          status: "idle",
        });
      } catch {
        if (!mounted) {
          return;
        }

        setMobileRankingState({
          category: selectedCategory,
          rankings: [],
          status: "error",
        });
      }
    }

    void loadMobileRankings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="home-stage" aria-label="v26-lab 홈">
      <div className="home-gradient-aura" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ "--particle-index": index } as CSSProperties} />
        ))}
      </div>
      <button
        type="button"
        className="home-skill-quiz-cta"
        onClick={() => onSelectView("skillQuiz")}
      >
        <span className="home-skill-quiz-cta-kicker">이번 주 시즌 도전</span>
        <strong>스잘알 챌린지</strong>
        <span>3점차 스킬 조합을 8초 안에 맞히기</span>
        <em>바로 도전</em>
      </button>
      <section className="home-dashboard" aria-label="주요 도구">
        <div className="home-primary-panel">
          <KakaoAdFitPcTopTripleBanner enabled />
          <div className="home-primary-grid">
            {primaryWidgets.map((widget) => (
              <button
                key={widget.view}
                type="button"
                className={`home-widget home-widget-${widget.view}`}
                onClick={() => onSelectView(widget.view)}
              >
                <span className="home-widget-icon" aria-hidden="true">
                  <IconGlyph name={widget.icon} className="ui-icon" />
                </span>
                <span className="home-widget-copy">
                  <strong>{widget.title}</strong>
                  <span>{widget.description}</span>
                </span>
                <span className="home-widget-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="ui-icon">
                    <path
                      d="M9.29 6.71 13.59 11H4v2h9.59l-4.3 4.29 1.42 1.42L17.41 12l-6.7-6.71-1.42 1.42Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="home-feed-grid">
        <section className="home-mobile-rank-dashboard" aria-labelledby="home-mobile-rank-title">
          <div className="home-mobile-rank-head">
            <div>
              <span>랭킹 챌린지</span>
              <h2 id="home-mobile-rank-title">
                고스변 {RANKING_CATEGORY_LABELS[mobileRankingState.category]} TOP 3
              </h2>
            </div>
            <button type="button" onClick={() => onSelectView("ranking")}>
              참여하기
            </button>
          </div>
          <div className="home-mobile-rank-list">
            {mobileRankingState.status === "loading" ? (
              <p className="home-mobile-rank-empty">랭킹을 불러오는 중입니다.</p>
            ) : mobileRankingState.status === "error" || mobileRankingState.rankings.length === 0 ? (
              <p className="home-mobile-rank-empty">아직 표시할 랭킹이 없습니다.</p>
            ) : (
              mobileRankingState.rankings.map((row) => (
                <button
                  key={row.entry_id}
                  type="button"
                  className={`home-mobile-rank-card ${
                    row.user_id === currentUserId ? "is-current-user" : ""
                  }`}
                  onClick={() => onSelectView("ranking")}
                >
                  <span className="home-mobile-rank-position">{row.rank_position}</span>
                  {row.user_id === currentUserId && (
                    <span className="home-mobile-rank-me-badge">MY</span>
                  )}
                  <span className="home-mobile-rank-user">
                    <strong>{row.display_name ?? "자동 닉네임"}</strong>
                  </span>
                  <span className="home-mobile-rank-score">{formatRankScore(row.current_score)}</span>
                  <span className="home-mobile-rank-skills">
                    {getHomeRankSkillItems(row).map((skill) => (
                      <span key={skill.key}>
                        <strong
                          className="skill-grade-text"
                          style={
                            {
                              "--skill-grade-color": skill.color,
                              "--skill-grade-dark-color": skill.darkColor,
                            } as CSSProperties
                          }
                        >
                          {skill.name}
                        </strong>
                      </span>
                    ))}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="home-updates" aria-labelledby="home-updates-title">
          <div className="home-section-title-row">
            <h2 id="home-updates-title">최근 업데이트</h2>
            <button type="button" onClick={() => onSelectView("notice")}>
              더보기
            </button>
          </div>
          <div className="home-update-list">
            {NOTICE_ITEMS.slice(0, 3).map((item, index) => (
              <button
                key={`${item.date}-${item.title}`}
                type="button"
                className="home-update-item"
                onClick={() => onSelectView("notice")}
              >
                <span className="home-update-dot" aria-hidden="true" />
                <strong>{item.title}</strong>
                <em>{index === 1 ? "이벤트" : "업데이트"}</em>
                <time>{item.date.replace("2026.", "")}</time>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="home-all-tools" aria-labelledby="home-all-tools-title">
        <div className="home-section-title-row">
          <h2 id="home-all-tools-title">전체 도구</h2>
        </div>
        <div className="home-widget-grid">
          {HOME_WIDGET_SECTIONS.flatMap((section) => section.widgets).map((widget) => (
            <button
              key={widget.view}
              type="button"
              className={`home-widget home-widget-${widget.view}`}
              onClick={() => onSelectView(widget.view)}
            >
              <span className="home-widget-icon" aria-hidden="true">
                <IconGlyph name={widget.icon} className="ui-icon" />
              </span>
              <span className="home-widget-copy">
                <span className="home-widget-meta">{widget.meta}</span>
                <strong>{widget.title}</strong>
                <span>{widget.description}</span>
              </span>
              <span className="home-widget-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="ui-icon">
                  <path
                    d="M9.29 6.71 13.59 11H4v2h9.59l-4.3 4.29 1.42 1.42L17.41 12l-6.7-6.71-1.42 1.42Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </button>
          ))}
          <button
            type="button"
            className="home-widget home-widget-notice"
            onClick={() => onSelectView("notice")}
          >
            <span className="home-widget-icon" aria-hidden="true">
              <IconGlyph name="notice" className="ui-icon" />
            </span>
            <span className="home-widget-copy">
              <span className="home-widget-meta">Notice</span>
              <strong>공지사항</strong>
              <span>업데이트 내역과 문의를 확인합니다.</span>
            </span>
            <span className="home-widget-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="ui-icon">
                <path
                  d="M9.29 6.71 13.59 11H4v2h9.59l-4.3 4.29 1.42 1.42L17.41 12l-6.7-6.71-1.42 1.42Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
          </div>
      </section>

      <nav className="home-site-links" aria-label="사이트 정보">
        <a href="/about">소개</a>
        <a href="/skill-score-method">스킬 점수 기준</a>
        <a href="/faq">FAQ</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/terms">이용약관</a>
        <a href="/contact">문의</a>
      </nav>
    </main>
  );
}
