import { Fragment, useRef, useState } from "react";
import { getSkillOcrPlayerOdds } from "../lib/skillOcrOdds";
import { getSkillOcrSkillOptions } from "../lib/skillOcrTransform";
import { useSkillOcrPlayerOdds } from "../lib/useSkillOcrPlayerOdds";
import type { CardType, SkillLevel, StarterHand } from "../types";
import type {
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
  SkillOcrSession,
} from "../types/ocr";

type SkillOcrViewProps = {
  session: SkillOcrSession | null;
  checkingSession: boolean;
  passwordInput: string;
  authError: string | null;
  uploads: SkillOcrSavedUpload[];
  uploadsLoading: boolean;
  uploadsError: string | null;
  uploadBusyRole: SkillOcrRole | null;
  uploadError: string | null;
  draftPlayers: SkillOcrSelectedPlayer[];
  draftTotalScore: number;
  draftAverageScore: number;
  saving: boolean;
  savedUpload: SkillOcrSavedUpload | null;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onUploadImage: (role: SkillOcrRole, file: File) => void;
  onPlayerSelectedChange: (playerIndex: number, selected: boolean) => void;
  onPlayerCardTypeChange: (playerIndex: number, cardType: CardType) => void;
  onPlayerPositionChange: (playerIndex: number, position: string) => void;
  onPlayerStarterHandChange: (playerIndex: number, starterHand: StarterHand) => void;
  onSkillChange: (
    playerIndex: number,
    slot: number,
    skillId: string,
    skillName: string
  ) => void;
  onSkillLevelChange: (playerIndex: number, slot: number, level: SkillLevel) => void;
  onSaveDraft: () => void;
  onSelectSavedUpload: (upload: SkillOcrSavedUpload) => void;
  onClearSavedUpload: () => void;
  onGoHome: () => void;
};

const CARD_TYPE_OPTIONS: Array<{ value: CardType; label: string }> = [
  { value: "impact", label: "임팩트" },
  { value: "signature", label: "시그니처" },
  { value: "goldenGlove", label: "골든글러브" },
  { value: "national", label: "국가대표" },
];

const PITCHER_POSITION_OPTIONS = ["SP", "RP", "CP"];
const PITCHER_HAND_OPTIONS: Array<{ value: StarterHand; label: string }> = [
  { value: "right", label: "우투" },
  { value: "left", label: "좌투" },
];
const SKILL_LEVEL_OPTIONS: SkillLevel[] = [5, 6, 7, 8];
const SHOW_UPLOAD_SAVED_PANEL = true;
type OcrPanelTab = "summary" | "upload" | "stats";
type OcrIconName =
  | "chart"
  | "check"
  | "clipboard"
  | "close"
  | "eye"
  | "login"
  | "logout"
  | "save"
  | "upload"
  | "user"
  | "warning";

function formatRole(role: SkillOcrSavedUpload["role"]): string {
  return role === "hitter" ? "타자" : "투수";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getUploadRole(upload: SkillOcrSavedUpload | null): SkillOcrRole | null {
  return upload?.role ?? null;
}

function getDraftRole(players: SkillOcrSelectedPlayer[]): SkillOcrRole | null {
  if (players.length === 0) {
    return null;
  }

  return players.some((player) => player.calculatorMode === "hitter") ? "hitter" : "pitcher";
}

function getLatestUpload(uploads: SkillOcrSavedUpload[]): SkillOcrSavedUpload | null {
  return uploads.reduce<SkillOcrSavedUpload | null>((latestUpload, upload) => {
    if (!latestUpload) {
      return upload;
    }

    return new Date(upload.created_at).getTime() > new Date(latestUpload.created_at).getTime()
      ? upload
      : latestUpload;
  }, null);
}

function buildCopyText(params: {
  username: string;
  role: SkillOcrRole | null;
  averageScore: number;
  players: SkillOcrSelectedPlayer[];
}): string {
  const roleLabel = params.role ? formatRole(params.role) : "선수";
  const includePosition = params.role === "pitcher";
  const playerLines = params.players.map((player) => {
    const odds = getSkillOcrPlayerOdds(player);
    const position = player.position?.trim();
    const handLabel = player.starterHand === "left" ? "좌투" : "우투";
    const name =
      includePosition && position
        ? `${player.playerName}(${position}/${handLabel})`
        : player.playerName;
    const resultLabel = odds ? ` / 등급 ${odds.grade} / ${odds.basisLabel} ${odds.topPercentLabel}` : "";
    return `${name} : ${player.totalScore.toFixed(2)}점${resultLabel}`;
  });

  return [
    `[${params.username}]님의 ${roleLabel} 스킬 분석`,
    `평균 : ${params.averageScore.toFixed(2)} 점`,
    "-----------",
    ...playerLines,
  ].join("\n");
}

function getSkillToneClass(skill: SkillOcrSelectedPlayer["skills"][number]): string {
  return skill.grade ? `ocr-skill-grade-${skill.grade}` : `ocr-skill-level-${skill.level}`;
}

function getPitcherScoreItems(player: SkillOcrSelectedPlayer): Array<{
  key: string;
  label: string;
  value: number;
  active: boolean;
}> {
  const scores = player.pitcherScores;
  if (!scores) {
    return [];
  }

  const position = player.position ?? "SP";
  const hand = player.starterHand ?? "right";

  return [
    {
      key: "starterRight",
      label: "선발 우투",
      value: scores.starterRight,
      active: position === "SP" && hand === "right",
    },
    {
      key: "starterLeft",
      label: "선발 좌투",
      value: scores.starterLeft,
      active: position === "SP" && hand === "left",
    },
    {
      key: "middle",
      label: "중계",
      value: scores.middle,
      active: position === "RP",
    },
    {
      key: "closer",
      label: "마무리",
      value: scores.closer,
      active: position === "CP",
    },
  ];
}

function SkillOcrOddsBadge({ player }: { player: SkillOcrSelectedPlayer }) {
  const { odds, loading } = useSkillOcrPlayerOdds(player);

  if (loading) {
    return (
      <div className="ocr-player-odds-badge ocr-player-odds-badge-loading" aria-label="확률 계산 중">
        <span />
        <span />
      </div>
    );
  }

  if (!odds) {
    return null;
  }

  return (
    <div className="ocr-player-odds-badge public-ocr-player-odds-badge">
      <span>
        등급 <strong style={{ color: odds.gradeColor }}>{odds.grade}</strong>
      </span>
      <span>
        {odds.basisLabel} <strong>{odds.topPercentLabel}</strong>
      </span>
    </div>
  );
}

function OcrIcon({ name }: { name: OcrIconName }) {
  const paths: Record<OcrIconName, string> = {
    chart: "M4 19V5m5 14V9m5 10V3m5 16v-7",
    check: "m5 12 4 4L19 6",
    clipboard: "M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5a2.5 2.5 0 0 0-5 0H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z",
    close: "M6 6l12 12M18 6 6 18",
    eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    login: "M10 17l5-5-5-5m5 5H3m13-8h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3",
    logout: "M14 17l5-5-5-5m5 5H8m2-8H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5",
    save: "M5 3h12l2 2v16H5V3Zm3 0v6h8V3M8 17h8",
    upload: "M12 16V4m0 0 5 5m-5-5-5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
    user: "M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    warning: "M12 3 2 21h20L12 3Zm1 13h-2v2h2v-2Zm0-7h-2v5h2V9Z",
  };

  return (
    <svg className="ocr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default function SkillOcrView({
  session,
  checkingSession,
  passwordInput,
  authError,
  uploads,
  uploadsLoading,
  uploadsError,
  uploadBusyRole,
  uploadError,
  draftPlayers,
  draftTotalScore,
  draftAverageScore,
  saving,
  savedUpload,
  onPasswordChange,
  onLogin,
  onLogout,
  onUploadImage,
  onPlayerSelectedChange,
  onPlayerCardTypeChange,
  onPlayerPositionChange,
  onPlayerStarterHandChange,
  onSkillChange,
  onSkillLevelChange,
  onSaveDraft,
  onSelectSavedUpload,
  onClearSavedUpload,
  onGoHome,
}: SkillOcrViewProps) {
  const pitcherInputRef = useRef<HTMLInputElement | null>(null);
  const hitterInputRef = useRef<HTMLInputElement | null>(null);
  const savedUploadPanelRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<OcrPanelTab>("summary");
  const [showSummarySavedDetail, setShowSummarySavedDetail] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  if (checkingSession) {
    return (
      <div className="ocr-view">
        <section className="ocr-auth-card">
          <p className="ocr-eyebrow">Skill OCR</p>
          <h1>세션 확인 중</h1>
          <p className="ocr-copy">저장된 접속 정보를 확인하고 있습니다.</p>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="ocr-view">
        <section className="ocr-auth-card">
          <p className="ocr-eyebrow">Skill OCR</p>
          <h1>tyrant 접속</h1>
          <p className="ocr-copy">공유받은 비밀번호를 입력하면 이미지 업로드 기능을 사용할 수 있습니다.</p>

          <label className="ocr-field">
            <span>비밀번호</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onLogin();
                }
              }}
            />
          </label>

          {authError && <p className="modal-error">{authError}</p>}

          <div className="ocr-actions">
            <button type="button" className="ghost-btn" onClick={onGoHome}>
              <OcrIcon name="close" />
              홈으로
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={onLogin}
            >
              <OcrIcon name="login" />
              로그인
            </button>
          </div>
        </section>
      </div>
    );
  }

  const selectedDraftPlayers = draftPlayers.filter((player) => player.selected);
  const draftRole = getDraftRole(selectedDraftPlayers);
  const hitterUploads = uploads.filter((upload) => upload.role === "hitter");
  const pitcherUploads = uploads.filter((upload) => upload.role === "pitcher");
  const totalSavedCount = uploads.length;
  const bestSavedScore =
    uploads.length > 0 ? Math.max(...uploads.map((upload) => upload.total_score)) : null;
  const savedAverageScore =
    uploads.length > 0
      ? uploads.reduce((sum, upload) => sum + upload.average_score, 0) / uploads.length
      : null;
  const hitterSavedCount = hitterUploads.length;
  const pitcherSavedCount = pitcherUploads.length;
  const latestHitterUpload = getLatestUpload(hitterUploads);
  const latestPitcherUpload = getLatestUpload(pitcherUploads);

  const scrollToReviewPanel = () => {
    document
      .querySelector<HTMLElement>(".ocr-review-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToRequiredSkill = (playerIndex: number, slot: number) => {
    const element = document.querySelector<HTMLElement>(
      `[data-ocr-required-skill="${playerIndex}-${slot}"]`
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus();
  };

  const validateDraftPlayers = () => {
    if (selectedDraftPlayers.length === 0) {
      setValidationMessage("저장하거나 복사할 선수를 최소 1명 이상 선택해주세요.");
      window.setTimeout(scrollToReviewPanel, 0);
      return false;
    }

    const playerIndex = draftPlayers.findIndex(
      (player) => player.selected && player.skills.some((skill) => !skill.skillId)
    );
    const missingSkill =
      playerIndex >= 0 ? draftPlayers[playerIndex].skills.find((skill) => !skill.skillId) : null;

    if (playerIndex >= 0 && missingSkill) {
      setValidationMessage("필수값을 채워주세요. 매칭실패 스킬을 선택해야 저장/복사할 수 있습니다.");
      window.setTimeout(() => scrollToRequiredSkill(playerIndex, missingSkill.slot), 0);
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const copyAnalysisText = async (params: {
    id: string;
    role: SkillOcrRole | null;
    averageScore: number;
    players: SkillOcrSelectedPlayer[];
  }) => {
    const text = buildCopyText({
      username: session.username,
      role: params.role,
      averageScore: params.averageScore,
      players: params.players,
    });

    await navigator.clipboard.writeText(text);
    setCopiedId(params.id);
    window.setTimeout(() => setCopiedId((currentId) => (currentId === params.id ? null : currentId)), 1400);
  };

  const copyDraftAnalysisText = async () => {
    if (!validateDraftPlayers()) {
      return;
    }

    await copyAnalysisText({
      id: "draft",
      role: draftRole,
      averageScore: draftAverageScore,
      players: selectedDraftPlayers,
    });
  };

  const saveDraft = () => {
    if (!validateDraftPlayers()) {
      return;
    }

    onSaveDraft();
    setShowSummarySavedDetail(false);
  };

  const openSummarySavedDetail = (upload: SkillOcrSavedUpload) => {
    setShowSummarySavedDetail(true);
    onSelectSavedUpload(upload);
    window.setTimeout(() => {
      savedUploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const savedUploadPanel = savedUpload ? (
    <section className="ocr-saved-panel public-ocr-panel" ref={savedUploadPanelRef}>
      <div className="ocr-section-head">
        <div>
          <h2>저장된 결과</h2>
          <span>
            {formatDate(savedUpload.created_at)} · {formatRole(savedUpload.role)}
          </span>
        </div>
        <div className="ocr-review-totals">
          <strong>{savedUpload.total_score.toFixed(2)}</strong>
          <span>평균 {savedUpload.average_score.toFixed(2)}</span>
        </div>
      </div>

      <div className="public-ocr-saved-list">
        {savedUpload.selected_players.map((player) => (
          <article
            key={`${savedUpload.id}-${player.sourceRow}`}
            className={`public-ocr-saved-row public-ocr-card-row-${player.cardType}`}
          >
            <strong>{player.playerName}</strong>
            <span>{player.totalScore.toFixed(2)}</span>
            <SkillOcrOddsBadge player={player} />
          </article>
        ))}
      </div>

      <div className="ocr-save-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={() =>
            void copyAnalysisText({
              id: `saved-${savedUpload.id}`,
              role: getUploadRole(savedUpload),
              averageScore: savedUpload.average_score,
              players: savedUpload.selected_players,
            })
          }
        >
          <OcrIcon name={copiedId === `saved-${savedUpload.id}` ? "check" : "clipboard"} />
          {copiedId === `saved-${savedUpload.id}` ? "복사됨" : "복사"}
        </button>
        <button type="button" className="ghost-btn" onClick={onClearSavedUpload}>
          <OcrIcon name="close" />
          닫기
        </button>
      </div>
    </section>
  ) : null;

  return (
    <div className="ocr-view public-ocr-view">
      <header className="ocr-header">
        <div className="ocr-brand">
          <span className="ocr-avatar">{session.username.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>{session.username}</h1>
          </div>
        </div>
        <div className="ocr-header-actions">
          <button type="button" className="ghost-btn" onClick={onGoHome}>
            <OcrIcon name="close" />
            <span>홈으로</span>
          </button>
          <button type="button" className="ghost-btn" onClick={onLogout}>
            <OcrIcon name="logout" />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      <nav className="ocr-tabs ocr-bottom-tabs" aria-label="OCR 화면">
        <button
          type="button"
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => {
            setActiveTab("summary");
            setShowSummarySavedDetail(false);
          }}
        >
          <OcrIcon name="clipboard" />
          요약
        </button>
        <button
          type="button"
          className={activeTab === "upload" ? "active" : ""}
          onClick={() => {
            setActiveTab("upload");
            setShowSummarySavedDetail(false);
          }}
        >
          <OcrIcon name="upload" />
          업로드
        </button>
        <button
          type="button"
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => {
            setActiveTab("stats");
            setShowSummarySavedDetail(false);
          }}
        >
          <OcrIcon name="chart" />
          통계
        </button>
      </nav>

      {activeTab === "summary" ? (
        <>
          <section className="ocr-latest-panel">
            <div className="ocr-section-head">
              <div>
                <h2>최근 기록 요약</h2>
                <span>마지막으로 저장한 투수와 타자 결과만 빠르게 확인합니다.</span>
              </div>
              {uploadsLoading && <span>불러오는 중</span>}
            </div>

            {uploadsError && <p className="modal-error">{uploadsError}</p>}

            <div className="ocr-latest-grid">
              {[
                { role: "pitcher" as const, upload: latestPitcherUpload },
                { role: "hitter" as const, upload: latestHitterUpload },
              ].map(({ role, upload }) => (
                <article key={role} className={`ocr-latest-card ${role}`}>
                  <div>
                    <strong>최근 {formatRole(role)} 기록</strong>
                    {upload ? (
                      <span>{formatDate(upload.created_at)} 갱신</span>
                    ) : (
                      <span>저장된 기록 없음</span>
                    )}
                  </div>

                  {upload ? (
                    <div className="ocr-latest-stats">
                      <span>
                        전체점수 <strong>{upload.total_score.toFixed(2)}</strong>
                      </span>
                      <span>
                        평균점수 <strong>{upload.average_score.toFixed(2)}</strong>
                      </span>
                      <span>
                        인원 <strong>{upload.player_count}명</strong>
                      </span>
                    </div>
                  ) : (
                    <p>업로드 탭에서 먼저 {formatRole(role)} 스킬을 분석하고 저장하세요.</p>
                  )}

                  <button
                    type="button"
                    className="ocr-row-link"
                    disabled={!upload}
                    onClick={() => upload && openSummarySavedDetail(upload)}
                  >
                    <OcrIcon name="eye" />
                    상세 보기
                  </button>
                </article>
              ))}
            </div>
          </section>
          {showSummarySavedDetail && savedUploadPanel}
        </>
      ) : activeTab === "stats" ? (
        <>
          <section className="ocr-summary-grid">
            <article className="ocr-summary-card">
              <span className="ocr-summary-icon">
                <OcrIcon name="clipboard" />
              </span>
              <span>저장 횟수</span>
              <strong>{totalSavedCount}</strong>
            </article>
            <article className="ocr-summary-card">
              <span className="ocr-summary-icon">
                <OcrIcon name="chart" />
              </span>
              <span>최고 총점</span>
              <strong>{bestSavedScore === null ? "-" : bestSavedScore.toFixed(2)}</strong>
            </article>
            <article className="ocr-summary-card">
              <span className="ocr-summary-icon">
                <OcrIcon name="check" />
              </span>
              <span>기록 평균</span>
              <strong>{savedAverageScore === null ? "-" : savedAverageScore.toFixed(2)}</strong>
            </article>
          </section>

          <section className="ocr-role-summary-grid">
            <article className="ocr-role-summary-card pitcher">
              <span>투</span>
              <div>
                <strong>투수 기록</strong>
                <p>{pitcherSavedCount}건</p>
              </div>
            </article>
            <article className="ocr-role-summary-card hitter">
              <span>타</span>
              <div>
                <strong>타자 기록</strong>
                <p>{hitterSavedCount}건</p>
              </div>
            </article>
          </section>

          <section className="ocr-history-panel">
            <div className="ocr-section-head">
              <div>
                <h2>전체 기록</h2>
                <span>
                  타자 {hitterSavedCount}건 · 투수 {pitcherSavedCount}건
                </span>
              </div>
              {uploadsLoading && <span>불러오는 중</span>}
            </div>

            {uploadsError && <p className="modal-error">{uploadsError}</p>}

            {!uploadsLoading && uploads.length === 0 && (
              <p className="ocr-empty">아직 저장된 OCR 결과가 없습니다.</p>
            )}

            <div className="ocr-stats-table-wrap">
              <table className="ocr-stats-table">
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>구분</th>
                    <th>인원</th>
                    <th>총점</th>
                    <th>평균</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "pitcher" as const, items: pitcherUploads },
                    { role: "hitter" as const, items: hitterUploads },
                  ].map((group) => (
                    <Fragment key={group.role}>
                      <tr className="ocr-stats-group-row">
                        <td colSpan={6}>{formatRole(group.role)} 기록</td>
                      </tr>
                      {group.items.length === 0 ? (
                        <tr>
                          <td colSpan={6}>{formatRole(group.role)} 저장 기록이 없습니다.</td>
                        </tr>
                      ) : (
                        group.items.map((upload) => (
                          <tr key={upload.id}>
                            <td>{formatDate(upload.created_at)}</td>
                            <td>{formatRole(upload.role)}</td>
                            <td>{upload.player_count}</td>
                            <td>{upload.total_score.toFixed(2)}</td>
                            <td>{upload.average_score.toFixed(2)}</td>
                            <td>
                              <div className="ocr-table-actions">
                                <button
                                  type="button"
                                  className="ocr-table-link"
                                  onClick={() => {
                                    openSummarySavedDetail(upload);
                                  }}
                                >
                                  <OcrIcon name="eye" />
                                  보기
                                </button>
                                <button
                                  type="button"
                                  className="ocr-table-link"
                                  onClick={() =>
                                    void copyAnalysisText({
                                      id: `stats-${upload.id}`,
                                      role: upload.role,
                                      averageScore: upload.average_score,
                                      players: upload.selected_players,
                                    })
                                  }
                                >
                                  <OcrIcon
                                    name={copiedId === `stats-${upload.id}` ? "check" : "clipboard"}
                                  />
                                  {copiedId === `stats-${upload.id}` ? "복사됨" : "복사"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {savedUploadPanel}
        </>
      ) : (
        <>

      <section className="ocr-page-title">
        <h2>스킬 검수하기</h2>
        <p>스크린샷을 업로드하면 AI가 스킬을 인식합니다</p>
        <div className="ocr-guide-card">
          <OcrIcon name="check" />
          <div>
            <strong>모바일 캡처 권장</strong>
            <ul className="ocr-guide-list">
              <li>PC 캡처보다 모바일에서 세로로 캡처한 라인업 화면이 더 정확합니다.</li>
              <li>
                게임 환경설정 &gt; 해상도에서 <strong>최고</strong> 또는 <strong>높음</strong>으로
                설정하세요.
              </li>
              <li>OCR 결과는 부정확할 수 있으니 카드 타입, 스킬, 레벨을 꼭 확인하세요.</li>
              <li>투수/타자는 각각 최대 9명만 선택해 저장하세요.</li>
            </ul>
          </div>
          <button type="button" className="ocr-example-link" onClick={() => setExampleOpen(true)}>
            예시 이미지
          </button>
        </div>
      </section>

      {exampleOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setExampleOpen(false)}>
          <section
            className="modal-card ocr-example-modal"
            role="dialog"
            aria-modal="true"
            aria-label="모바일 라인업 캡처 예시"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ocr-example-modal-head">
              <div>
                <p className="modal-eyebrow">Example</p>
                <h2>모바일 캡처 예시</h2>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setExampleOpen(false)}>
                <OcrIcon name="close" />
                닫기
              </button>
            </div>
            <img src="/ocr-lineup-example.png" alt="모바일 라인업 캡처 예시" />
          </section>
        </div>
      )}

      <section className="ocr-upload-panel public-ocr-upload-panel">
        <input
          ref={pitcherInputRef}
          className="ocr-file-input"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUploadImage("pitcher", file);
            }
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={hitterInputRef}
          className="ocr-file-input"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUploadImage("hitter", file);
            }
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="ocr-upload-btn public-ocr-upload-btn"
          disabled={Boolean(uploadBusyRole)}
          onClick={() => pitcherInputRef.current?.click()}
        >
          <OcrIcon name="upload" />
          <strong>{uploadBusyRole === "pitcher" ? "투수 인식 중" : "투수"}</strong>
          <small>Pitcher</small>
        </button>
        <button
          type="button"
          className="ocr-upload-btn public-ocr-upload-btn"
          disabled={Boolean(uploadBusyRole)}
          onClick={() => hitterInputRef.current?.click()}
        >
          <OcrIcon name="upload" />
          <strong>{uploadBusyRole === "hitter" ? "타자 인식 중" : "타자"}</strong>
          <small>Batter</small>
        </button>
      </section>

      {uploadBusyRole && (
        <section className="ocr-processing-panel">
          <div className="ocr-progress-bar">
            <span />
          </div>
          <strong>{formatRole(uploadBusyRole)} 이미지를 분석하고 있습니다.</strong>
          <p>OCR 요청은 시간이 걸릴 수 있습니다. 결과가 오면 자동으로 검수 목록이 표시됩니다.</p>
        </section>
      )}

      {uploadError && <p className="modal-error">{uploadError}</p>}

      {savedUpload && SHOW_UPLOAD_SAVED_PANEL && (
        <section className="ocr-saved-panel public-ocr-panel">
          <div className="ocr-section-head">
            <div>
              <h2>저장된 결과</h2>
              <span>{formatDate(savedUpload.created_at)} · {formatRole(savedUpload.role)}</span>
            </div>
            <div className="ocr-review-totals">
              <strong>{savedUpload.total_score.toFixed(2)}</strong>
              <span>평균 {savedUpload.average_score.toFixed(2)}</span>
            </div>
          </div>

          <div className="public-ocr-saved-list">
            {savedUpload.selected_players.map((player) => (
              <article
                key={`${savedUpload.id}-${player.sourceRow}`}
                className={`public-ocr-saved-row public-ocr-card-row-${player.cardType}`}
              >
                <strong>{player.playerName}</strong>
                <span>{player.totalScore.toFixed(2)}</span>
                <SkillOcrOddsBadge player={player} />
              </article>
            ))}
          </div>

          <div className="ocr-save-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() =>
                void copyAnalysisText({
                  id: `saved-${savedUpload.id}`,
                  role: getUploadRole(savedUpload),
                  averageScore: savedUpload.average_score,
                  players: savedUpload.selected_players,
                })
              }
            >
              <OcrIcon name={copiedId === `saved-${savedUpload.id}` ? "check" : "clipboard"} />
              {copiedId === `saved-${savedUpload.id}` ? "복사됨" : "복사"}
            </button>
            <button type="button" className="ghost-btn" onClick={onClearSavedUpload}>
              <OcrIcon name="close" />
              닫기
            </button>
          </div>
        </section>
      )}

      {draftPlayers.length > 0 && (
        <section className="ocr-review-panel public-ocr-panel">
          <div className="ocr-section-head">
            <div>
              <h2>인식 결과 검수</h2>
              <span>카드 타입, 스킬, 레벨을 확인하고 저장할 9명만 선택하세요.</span>
            </div>
            <div className="ocr-review-head-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => void copyDraftAnalysisText()}
              >
                <OcrIcon name={copiedId === "draft" ? "check" : "clipboard"} />
                {copiedId === "draft" ? "복사됨" : "복사"}
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={saving}
                onClick={saveDraft}
              >
                <OcrIcon name="save" />
                {saving ? "저장 중" : "저장"}
              </button>
            </div>
            <div className="ocr-review-totals">
              <strong>{draftTotalScore.toFixed(2)}</strong>
              <span>평균 {draftAverageScore.toFixed(2)}</span>
            </div>
          </div>

          <div className="public-ocr-player-list">
            {draftPlayers.map((player, playerIndex) => {
              const skillOptions = getSkillOcrSkillOptions(player);

              return (
              <article
                key={`${player.sourceRow}-${player.playerName}`}
                className={`public-ocr-player-row public-ocr-card-row-${player.cardType}${
                  player.selected ? "" : " muted"
                }`}
              >
                <div className="public-ocr-player-main">
                  <label className="public-ocr-player-check">
                    <input
                      type="checkbox"
                      checked={player.selected}
                      onChange={(event) => {
                        setValidationMessage(null);
                        onPlayerSelectedChange(playerIndex, event.target.checked);
                      }}
                    />
                    <strong>{player.playerName}</strong>
                  </label>
                  <div
                    className={`public-ocr-player-controls public-ocr-player-controls-${
                      player.calculatorMode === "hitter" ? "hitter" : "pitcher"
                    }`}
                  >
                    <label className={`public-ocr-card-control public-ocr-card-control-${player.cardType}`}>
                      <span>카드</span>
                      <select
                        value={player.cardType}
                        onChange={(event) =>
                          onPlayerCardTypeChange(playerIndex, event.target.value as CardType)
                        }
                      >
                        {CARD_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {player.calculatorMode !== "hitter" && (
                      <>
                        <label>
                          <span>포지션</span>
                          <select
                            value={player.position ?? "SP"}
                            onChange={(event) =>
                              onPlayerPositionChange(playerIndex, event.target.value)
                            }
                          >
                            {PITCHER_POSITION_OPTIONS.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>투구</span>
                          <select
                            value={player.starterHand ?? "right"}
                            onChange={(event) =>
                              onPlayerStarterHandChange(
                                playerIndex,
                                event.target.value as StarterHand
                              )
                            }
                          >
                            {PITCHER_HAND_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                  <strong className="public-ocr-player-score">{player.totalScore.toFixed(2)}</strong>
                  <SkillOcrOddsBadge player={player} />
                </div>
                {player.calculatorMode !== "hitter" && (
                  <div className="public-ocr-pitcher-score-grid">
                    {getPitcherScoreItems(player).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`public-ocr-pitcher-score-chip${item.active ? " active" : ""}`}
                        onClick={() => {
                          if (item.key === "starterRight" || item.key === "starterLeft") {
                            onPlayerPositionChange(playerIndex, "SP");
                            onPlayerStarterHandChange(
                              playerIndex,
                              item.key === "starterLeft" ? "left" : "right"
                            );
                            return;
                          }

                          onPlayerPositionChange(
                            playerIndex,
                            item.key === "middle" ? "RP" : "CP"
                          );
                        }}
                      >
                        <span>{item.label}</span>
                        <strong>{item.value.toFixed(2)}</strong>
                      </button>
                    ))}
                  </div>
                )}
                <div className="public-ocr-player-skills">
                  {player.skills.map((skill) => (
                    <div
                      key={`${player.sourceRow}-${skill.slot}`}
                      className={`public-ocr-skill-edit-row ${getSkillToneClass(skill)} ${
                        skill.skillId ? "" : "public-ocr-skill-edit-row-unmatched"
                      }`}
                    >
                      {!skill.skillId && (
                        <span className="public-ocr-match-fail-badge">매칭실패</span>
                      )}
                      <select
                        className={`public-ocr-skill-name-select ${getSkillToneClass(skill)}`}
                        data-ocr-required-skill={`${playerIndex}-${skill.slot}`}
                        value={skill.skillId ?? ""}
                        onChange={(event) => {
                          const option = skillOptions.find(
                            (candidate) => candidate.skillId === event.target.value
                          );
                          setValidationMessage(null);
                          onSkillChange(
                            playerIndex,
                            skill.slot,
                            event.target.value,
                            option?.skillName ?? ""
                          );
                        }}
                      >
                        <option value="">매칭실패</option>
                        {skillOptions.map((option) => (
                          <option
                            key={option.skillId}
                            value={option.skillId}
                            className={`ocr-skill-grade-${option.grade}`}
                          >
                            {option.skillName}
                          </option>
                        ))}
                      </select>
                      <select
                        className={`public-ocr-skill-level-select ${getSkillToneClass(skill)}`}
                        value={skill.level}
                        onChange={(event) =>
                          onSkillLevelChange(
                            playerIndex,
                            skill.slot,
                            Number(event.target.value) as SkillLevel
                          )
                        }
                      >
                        {SKILL_LEVEL_OPTIONS.map((level) => (
                          <option key={level} value={level}>
                            Lv.{level}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </article>
              );
            })}
          </div>

          <p className="ocr-empty">
            현재 {selectedDraftPlayers.length}명이 선택되어 있습니다. 최대 9명까지 저장할 수 있습니다.
          </p>

          {validationMessage && <p className="modal-error ocr-validation-error">{validationMessage}</p>}

        </section>
      )}

        </>
      )}
    </div>
  );
}
