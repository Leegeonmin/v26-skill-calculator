import { type FormEvent, type ReactNode, useState } from "react";
import { submitNoticeInquiry } from "../lib/notice";
import { NOTICE_ITEMS } from "./HomeView";

type NoticeViewProps = {
  themeAction?: ReactNode;
  onGoHome: () => void;
};

export default function NoticeView({ themeAction, onGoHome }: NoticeViewProps) {
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
    <div className="main-stage tool-page notice-page">
      <div className="page-toolbar tool-page-hero notice-page-hero">
        <div className="page-title-block">
          <span className="page-kicker">Notice</span>
          <h1>공지사항</h1>
          <p>업데이트 내역과 안내사항을 한 번에 확인합니다.</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>

      <main className="notice-page-layout">
        <section className="notice-page-list-card" aria-labelledby="notice-list-title">
          <div className="panel-head">
            <h2 id="notice-list-title">전체 공지</h2>
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
        </section>

        <aside className="notice-page-inquiry-card" aria-labelledby="notice-inquiry-title">
          <form className="notice-inquiry-form" onSubmit={handleInquirySubmit}>
            <div className="notice-inquiry-copy">
              <strong id="notice-inquiry-title">문의하기</strong>
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
                rows={7}
                maxLength={2000}
              />
            </label>
            {inquiryStatus === "sent" && <p className="notice-form-success">문의가 저장됐습니다.</p>}
            {inquiryStatus === "error" && <p className="modal-error">{inquiryError}</p>}
            <button type="submit" className="primary-btn notice-submit-btn" disabled={inquiryStatus === "sending"}>
              {inquiryStatus === "sending" ? "저장 중..." : "문의 저장"}
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
