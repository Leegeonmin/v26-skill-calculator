import { IconGlyph } from "../components/AppChrome";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ToolView } from "../types";

type HomeViewProps = {
  onSelectView: (view: Exclude<ToolView, "home">) => void;
  themeAction?: ReactNode;
  authSession: Session | null;
  authDisplayName: string | null;
  supabaseReady: boolean;
  homeChangeMessage: string;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
};

const HOME_CHANGE_DISMISSED_KEY = "v26-home-change-dismissed";

function getCanDismissHomeChangeMessage() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
}

function getDismissedHomeChangeMessage() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(HOME_CHANGE_DISMISSED_KEY) ?? "";
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M12 4a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 4Zm0 10.4c4.05 0 7.2 2.15 7.2 4.9V21H4.8v-1.7c0-2.75 3.15-4.9 7.2-4.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

type HomeWidget = {
  view: Exclude<ToolView, "home">;
  icon: "trophy" | "calculator" | "sparkles" | "compare" | "zap" | "users" | "flame" | "scan";
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
        view: "lineupSkillOcr",
        icon: "users",
        title: "라인업 스킬 인식",
        description: "Google 로그인 후 주 1회씩 타자/투수 라인업 스킬 점수를 인식합니다.",
        meta: "LINEUP SKILL",
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
        icon: "sparkles",
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

const HOME_CONTENT_SECTIONS = [
  {
    title: "보직부터 맞춰 계산합니다",
    body:
      "타자, 선발, 중계, 마무리는 스킬 종류, 점수가 다릅니다. 같은 스킬이어도 역할을 잘못 고르면 점수가 엉뚱하게 보일 수 있어서, 먼저 보직과 카드 타입을 나눈 뒤 계산합니다.",
  },
  {
    title: "총점 옆에 희귀도를 붙였습니다",
    body:
      "총점만 높다고 끝은 아닙니다. 이 조합이 고스변에서 어느 정도 보기 힘든지 같이 봐야 판단이 쉬워서, 상위 확률과 기대 시도 횟수를 같이 보여줍니다.",
  },
  {
    title: "변경권 쓰기 전에 먼저 테스트",
    body:
      "시뮬레이터가 실제 결과를 맞혀주는 건 아닙니다. 대신 목표 등급이나 2메이저 조합을 노릴 때 어느 정도 각오해야 하는지 미리 감을 잡는 용도로 씁니다.",
  },
];

const HOME_EXAMPLE_STEPS = [
  "카드 타입, 보직, 스킬 3개와 레벨을 그대로 넣습니다.",
  "총점만 보지 말고 등급, 상위 확률, 기대 횟수를 같이 봅니다.",
  "목표 등급이 있으면 고스변 시뮬에서 자동 롤로 난이도를 확인합니다.",
  "이미지 인식 결과는 저장 전에 카드 타입과 포지션이 맞는지 한 번 더 봅니다.",
];

// Shared with NoticeView; keep this colocated with the home announcement source.
// eslint-disable-next-line react-refresh/only-export-components
export const NOTICE_ITEMS = [
  {
    date: "2026.05.20",
    title: "국대에이스 점수 분리",
    body: "국대에이스 스킬을 버프 적용/미적용 항목으로 나누고, 라인업 인식과 계산기에서 두 점수를 구분해 선택할 수 있게 했습니다.",
  },
  {
    date: "2026.05.13",
    title: "라인업 스킬 인식 확률 표시와 복사 개선",
    body: "라인업 스킬 인식 결과의 상위 확률을 소수점 3자리까지만 표시하고, 복사 내용에 선수별 등급과 확률도 함께 포함되도록 개선했습니다.",
  },
  {
    date: "2026.05.05",
    title: "고스변 확률 계산과 라인업 스킬 인식 등급 표시 개선",
    body: "스킬 점수 계산기, 고스변 점수 비교, 라인업 스킬 인식에 상위 확률과 등급 정보를 추가하고 자동롤 및 호버 UI를 다듬었습니다.",
  },
  {
    date: "2026.05.02",
    title: "라인업 스킬 인식 공개 베타 추가",
    body: "Google 로그인 사용자에게 주 1회 타자/투수 라인업 스킬 인식을 제공하고, 미저장 스냅샷 복구와 최근 기록 복사 기능을 추가했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 이미지 인식 통계 세분화",
    body: "관리자 대시보드에서 공개 라인업 스킬 인식, tyrant 라인업 스킬 인식, 스킬 화면 인식, 공개 스냅샷 저장/미저장 현황을 나눠 확인할 수 있게 했습니다.",
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
    title: "관리자 이미지 인식 사용량 통계 추가",
    body: "관리자 대시보드에서 라인업 스킬 인식, 투수/타자 라인업 인식, 고스변 점수 비교 인식 호출량과 저장 횟수를 확인할 수 있게 했습니다.",
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
  themeAction,
  authSession,
  authDisplayName,
  supabaseReady,
  homeChangeMessage,
  onGoogleLogin,
  onGoogleLogout,
}: HomeViewProps) {
  const visibleHomeChangeMessage = homeChangeMessage.trim();
  const [canDismissHomeChangeMessage, setCanDismissHomeChangeMessage] = useState(getCanDismissHomeChangeMessage);
  const [dismissedHomeChangeMessage, setDismissedHomeChangeMessage] = useState(getDismissedHomeChangeMessage);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncCanDismiss = () => setCanDismissHomeChangeMessage(mediaQuery.matches);

    mediaQuery.addEventListener("change", syncCanDismiss);

    return () => mediaQuery.removeEventListener("change", syncCanDismiss);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const showHomeChangeMessage =
    visibleHomeChangeMessage &&
    (!canDismissHomeChangeMessage || visibleHomeChangeMessage !== dismissedHomeChangeMessage);

  function handleDismissHomeChangeMessage() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(HOME_CHANGE_DISMISSED_KEY, visibleHomeChangeMessage);
    }

    setDismissedHomeChangeMessage(visibleHomeChangeMessage);
  }

  return (
    <main className="home-stage" aria-labelledby="home-title">
      <div className="home-gradient-aura" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ "--particle-index": index } as CSSProperties} />
        ))}
      </div>
      {showHomeChangeMessage && (
        <aside className="home-change-note" aria-label="공지사항">
          <div className="home-change-note-head">
            <span>공지사항</span>
            {canDismissHomeChangeMessage && (
              <button
                type="button"
                className="home-change-note-close"
                aria-label="공지사항 닫기"
                onClick={handleDismissHomeChangeMessage}
              >
                닫기
              </button>
            )}
          </div>
          <strong>{visibleHomeChangeMessage}</strong>
        </aside>
      )}
      <section className="home-hero">
        <div className="home-hero-action">
          {themeAction}
          <div className="home-auth-card" ref={accountMenuRef}>
            {authSession ? (
              <button
                type="button"
                className="home-auth-button home-auth-button-user"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-label="계정 메뉴"
                aria-expanded={accountMenuOpen}
              >
                <UserIcon />
                <span>{authDisplayName ?? "Google 사용자"}</span>
              </button>
            ) : (
              <button
                type="button"
                className="home-auth-button"
                disabled={!supabaseReady}
                onClick={() => {
                  setAccountMenuOpen(false);
                  onGoogleLogin();
                }}
                aria-label="로그인"
              >
                <UserIcon />
                <span>로그인</span>
              </button>
            )}
            {authSession && accountMenuOpen && (
              <div className="home-account-menu" role="menu">
                <div className="home-account-menu-user">
                  <span>로그인 중</span>
                  <strong>{authDisplayName ?? "Google 사용자"}</strong>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSelectView("lineupSkillOcr");
                  }}
                >
                  라인업 스킬 인식
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onGoogleLogout();
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="home-hero-copy">
          <h1 id="home-title">v26-lab</h1>
        </div>
      </section>

      <section className="home-widget-sections" aria-label="도구 선택">
        {HOME_WIDGET_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`home-widget-section home-widget-section-${section.id}${
              section.grouped ? " home-widget-section-grouped" : ""
            }`}
          >
            <div className="home-widget-section-head">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <div className="home-widget-grid">
              {section.widgets.map((widget) => (
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
                    <span
                      className={`home-widget-meta${
                        widget.view === "skillCompareBeta" || widget.view === "lineupSkillOcr"
                          ? " home-widget-beta"
                          : ""
                      }`}
                    >
                      {widget.meta}
                    </span>
                    <strong>
                      {widget.title}

                    </strong>
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
          </section>
        ))}

        <section className="home-widget-section home-widget-section-notice">
          <div className="home-widget-section-head">
            <h2>공지사항</h2>
            <p>업데이트 내역과 문의를 확인합니다.</p>
          </div>
          <div className="home-widget-grid">
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
                <span>업데이트 내역 확인과 버그/기능 문의를 보낼 수 있습니다.</span>
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
      </section>

      <section className="home-content-guide" aria-labelledby="home-content-guide-title">
        <div className="home-content-guide-head">
          <span>How it works</span>
          <h2 id="home-content-guide-title">계산할 때 체크리스트</h2>
          <p>
            스킬 이름만 보고 고르면 헷갈리는 경우가 많습니다. 역할, 카드 타입, 레벨을 맞춘 뒤
            총점과 희귀도를 같이 보는 쪽으로 정리했습니다.
          </p>
        </div>

        <div className="home-content-grid">
          {HOME_CONTENT_SECTIONS.map((section) => (
            <article key={section.title} className="home-content-card">
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>

        <div className="home-example-panel">
          <div>
            <span>Example workflow</span>
            <h3>사용법</h3>
          </div>
          <ol>
            {HOME_EXAMPLE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <nav className="home-site-links" aria-label="사이트 정보">
        <a href="/about">소개</a>
        <a href="/skill-score-method">스킬 점수 기준</a>
        <a href="/simulator-guide">시뮬레이터 안내</a>
        <a href="/ocr-guide">라인업 인식 안내</a>
        <a href="/faq">FAQ</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/terms">이용약관</a>
        <a href="/contact">문의</a>
      </nav>
    </main>
  );
}
