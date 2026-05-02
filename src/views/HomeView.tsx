import { IconGlyph } from "../components/AppChrome";
import { submitNoticeInquiry } from "../lib/notice";
import { type FormEvent, type ReactNode, useState } from "react";
import type { ToolView } from "../types";

type HomeViewProps = {
  onSelectView: (view: Exclude<ToolView, "home">) => void;
  themeAction?: ReactNode;
};

type HomeWidget = {
  view: Exclude<ToolView, "home">;
  icon: "trophy" | "calculator" | "sparkles" | "flame" | "scan";
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
        icon: "scan",
        title: "고스변 점수 비교",
        description: "고스변 화면의 기존/변경 후보 스킬을 좌우로 비교합니다.",
        meta: "Beta",
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
        icon: "flame",
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

const NOTICE_ITEMS = [
  {
    date: "2026.05.02",
    title: "홈 화면 위젯 그룹 정리",
    body: "계산기와 시뮬레이터 위젯을 용도별로 묶고, PC와 모바일 화면에서 각 도구를 더 쉽게 구분할 수 있게 정리했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 OCR 사용량 통계 추가",
    body: "관리자 대시보드에서 라인업 OCR, 투수/타자 OCR, 고스변 점수 비교 OCR 호출량과 저장 횟수를 확인할 수 있게 했습니다.",
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

export default function HomeView({ onSelectView, themeAction }: HomeViewProps) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryContact, setInquiryContact] = useState("");
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState("");

  async function handleInquirySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inquiryMessage.trim()) {
      setInquiryStatus("error");
      setInquiryError("문의 내용을 입력해주세요.");
      return;
    }

    setInquiryStatus("sending");
    setInquiryError("");

    try {
      await submitNoticeInquiry({
        message: inquiryMessage,
        contact: inquiryContact,
      });
      setInquiryMessage("");
      setInquiryContact("");
      setInquiryStatus("sent");
    } catch (error) {
      setInquiryStatus("error");
      setInquiryError(error instanceof Error ? error.message : "문의 저장에 실패했습니다.");
    }
  }

  return (
    <main className="home-stage" aria-labelledby="home-title">
      <div className="home-gradient-aura" aria-hidden="true" />
      <section className="home-hero">
        {themeAction && <div className="home-hero-action">{themeAction}</div>}
        <div className="home-hero-copy">
          <h1 id="home-title">v26-lab</h1>
          <p>계산기, 시뮬레이터, 랭킹챌린지를 한 화면에서 바로 선택하세요.</p>
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
                        widget.view === "skillCompareBeta" ? " home-widget-beta" : ""
                      }`}
                    >
                      {widget.meta}
                    </span>
                    <strong>
                      {widget.title}
                      {widget.view === "skillCompareBeta" && <em>베타</em>}
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
              onClick={() => setNoticeOpen(true)}
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

      {noticeOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setNoticeOpen(false)}>
          <section
            className="modal-card notice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notice-modal-head">
              <div>
                <p className="modal-eyebrow">Notice</p>
                <h2 id="notice-modal-title">공지사항</h2>
              </div>
              <button type="button" className="notice-modal-close" onClick={() => setNoticeOpen(false)}>
                닫기
              </button>
            </div>

            <div className="notice-list">
              {NOTICE_ITEMS.map((item) => (
                <article key={`${item.date}-${item.title}`} className="notice-item">
                  <span>{item.date}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>

            <form className="notice-inquiry-form" onSubmit={handleInquirySubmit}>
              <div className="notice-inquiry-copy">
                <strong>문의하기</strong>
                <span>버그나 필요한 기능이 있으면 아래에 남겨주세요.</span>
              </div>
              <label>
                <span>연락처 선택 입력</span>
                <input
                  value={inquiryContact}
                  onChange={(event) => setInquiryContact(event.target.value)}
                  placeholder="이메일 또는 닉네임"
                  maxLength={120}
                />
              </label>
              <label>
                <span>문의 내용</span>
                <textarea
                  value={inquiryMessage}
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  placeholder="버그 상황이나 필요한 기능을 적어주세요."
                  rows={5}
                  maxLength={2000}
                />
              </label>
              {inquiryStatus === "sent" && <p className="notice-form-success">문의가 저장됐습니다.</p>}
              {inquiryStatus === "error" && <p className="modal-error">{inquiryError}</p>}
              <button type="submit" className="primary-btn notice-submit-btn" disabled={inquiryStatus === "sending"}>
                {inquiryStatus === "sending" ? "저장 중..." : "문의 저장"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
