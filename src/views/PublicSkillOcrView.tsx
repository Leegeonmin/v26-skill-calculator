import { useRef, useState } from "react";
import { getSkillOcrSkillOptions } from "../lib/skillOcrTransform";
import type { CardType, SkillLevel, StarterHand } from "../types";
import type {
  SkillOcrPublicQuota,
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
} from "../types/ocr";

type PublicSkillOcrViewProps = {
  authenticated: boolean;
  displayName: string | null;
  quota: SkillOcrPublicQuota[];
  uploads: SkillOcrSavedUpload[];
  uploadsLoading: boolean;
  uploadsError: string | null;
  uploadBusyRole: SkillOcrRole | null;
  uploadError: string | null;
  draftPlayers: SkillOcrSelectedPlayer[];
  draftTotalScore: number;
  draftAverageScore: number;
  saving: boolean;
  themeAction?: React.ReactNode;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
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
  onSelectSnapshot: (upload: SkillOcrSavedUpload) => void;
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

function formatRole(role: SkillOcrRole): string {
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

function getQuota(quota: SkillOcrPublicQuota[], role: SkillOcrRole) {
  return quota.find((item) => item.role === role) ?? null;
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

function buildCopyText(params: {
  username: string;
  role: SkillOcrRole | null;
  averageScore: number;
  players: SkillOcrSelectedPlayer[];
}) {
  const roleLabel = params.role ? formatRole(params.role) : "선수";
  const includePosition = params.role === "pitcher";
  const lines = params.players.map((player) => {
    const position = player.position?.trim();
    const handLabel = player.starterHand === "left" ? "좌투" : "우투";
    const name =
      includePosition && position
        ? `${player.playerName}(${position}/${handLabel})`
        : player.playerName;
    return `${name} : ${player.totalScore.toFixed(2)}점`;
  });

  return [
    `[${params.username}]님의 ${roleLabel} 스킬 분석`,
    `평균 : ${params.averageScore.toFixed(2)} 점`,
    "-----------",
    ...lines,
  ].join("\n");
}

function PublicOcrIcon({ name }: { name: "upload" | "check" | "clipboard" | "close" | "login" }) {
  const paths = {
    upload: "M12 16V4m0 0 5 5m-5-5-5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
    check: "m5 12 4 4L19 6",
    clipboard: "M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5a2.5 2.5 0 0 0-5 0H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z",
    close: "M6 6l12 12M18 6 6 18",
    login: "M10 17l5-5-5-5m5 5H3m13-8h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3",
  };

  return (
    <svg className="ocr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default function PublicSkillOcrView({
  authenticated,
  displayName,
  quota,
  uploads,
  uploadsLoading,
  uploadsError,
  uploadBusyRole,
  uploadError,
  draftPlayers,
  draftTotalScore,
  draftAverageScore,
  saving,
  themeAction,
  onGoogleLogin,
  onGoogleLogout,
  onUploadImage,
  onPlayerSelectedChange,
  onPlayerCardTypeChange,
  onPlayerPositionChange,
  onPlayerStarterHandChange,
  onSkillChange,
  onSkillLevelChange,
  onSaveDraft,
  onSelectSnapshot,
  onGoHome,
}: PublicSkillOcrViewProps) {
  const pitcherInputRef = useRef<HTMLInputElement | null>(null);
  const hitterInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "upload">("summary");
  const [exampleOpen, setExampleOpen] = useState(false);

  if (!authenticated) {
    return (
      <main className="public-ocr-view">
        <section className="public-ocr-auth">
          <p className="ocr-eyebrow">Lineup OCR Beta</p>
          <h1>라인업 스킬 인식</h1>
          <p>Google 로그인 후 주 1회씩 타자와 투수 라인업 스킬 점수를 인식할 수 있습니다.</p>
          {uploadsError && <p className="modal-error">{uploadsError}</p>}
          <div className="ocr-actions">
            <button type="button" className="ghost-btn" onClick={onGoHome}>
              <span>홈으로</span>
            </button>
            <button type="button" className="primary-btn" onClick={onGoogleLogin}>
              <span>Google 로그인</span>
              <PublicOcrIcon name="login" />
            </button>
          </div>
        </section>
      </main>
    );
  }

  const hitterQuota = getQuota(quota, "hitter");
  const pitcherQuota = getQuota(quota, "pitcher");
  const savedUploads = uploads.filter((upload) => upload.is_saved);
  const pendingUploads = uploads.filter((upload) => !upload.is_saved);
  const hitterUploads = savedUploads.filter((upload) => upload.role === "hitter");
  const pitcherUploads = savedUploads.filter((upload) => upload.role === "pitcher");
  const latestHitterUpload = hitterUploads[0] ?? null;
  const latestPitcherUpload = pitcherUploads[0] ?? null;
  const selectedPlayers = draftPlayers.filter((player) => player.selected);
  const draftRole = selectedPlayers.some((player) => player.calculatorMode === "hitter")
    ? "hitter"
    : selectedPlayers.length > 0
      ? "pitcher"
      : null;

  const validateDraft = () => {
    if (selectedPlayers.length === 0) {
      setValidationMessage("복사하거나 저장할 선수를 최소 1명 이상 선택해주세요.");
      return false;
    }

    if (selectedPlayers.some((player) => player.skills.some((skill) => !skill.skillId))) {
      setValidationMessage("매칭실패 스킬을 먼저 선택해주세요.");
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const copyDraft = async () => {
    if (!validateDraft()) return;

    await navigator.clipboard.writeText(
      buildCopyText({
        username: displayName ?? "Google 사용자",
        role: draftRole,
        averageScore: draftAverageScore,
        players: selectedPlayers,
      })
    );
    setCopiedId("draft");
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const copyUpload = async (upload: SkillOcrSavedUpload) => {
    await navigator.clipboard.writeText(
      buildCopyText({
        username: displayName ?? "Google 사용자",
        role: upload.role,
        averageScore: upload.average_score,
        players: upload.selected_players,
      })
    );
    setCopiedId(`upload-${upload.id}`);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  return (
    <main className="public-ocr-view">
      <header className="public-ocr-header">
        <div>
          <p className="ocr-eyebrow">Lineup OCR Beta</p>
          <h1>라인업 스킬 인식</h1>
        </div>
        <div className="public-ocr-top-actions">
          {themeAction}
          <button type="button" className="ghost-btn" onClick={onGoHome}>
            <span>홈으로</span>
          </button>
          <div className="home-auth-card">
            <span>{displayName ?? "Google 사용자"}</span>
            <button type="button" className="ghost-btn" onClick={onGoogleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <nav className="ocr-tabs public-ocr-tabs" aria-label="라인업 OCR 화면">
        <button
          type="button"
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => setActiveTab("summary")}
        >
          <PublicOcrIcon name="clipboard" />
          요약
        </button>
        <button
          type="button"
          className={activeTab === "upload" ? "active" : ""}
          onClick={() => setActiveTab("upload")}
        >
          <PublicOcrIcon name="upload" />
          업로드
        </button>
      </nav>

      <section className="public-ocr-quota">
        <strong>이번 주 사용 가능 횟수</strong>
        <span className={hitterQuota?.used ? "used" : "available"}>
          <b>타자</b>
          <em>{hitterQuota?.used ? "이번 주 사용 완료" : "1회 가능"}</em>
        </span>
        <span className={pitcherQuota?.used ? "used" : "available"}>
          <b>투수</b>
          <em>{pitcherQuota?.used ? "이번 주 사용 완료" : "1회 가능"}</em>
        </span>
      </section>

      {uploadsLoading && <p className="skill-compare-status">사용 기록을 불러오는 중입니다.</p>}
      {uploadsError && <p className="modal-error">{uploadsError}</p>}
      {uploadError && <p className="modal-error">{uploadError}</p>}

      {activeTab === "summary" ? (
        <>
          <section className="public-ocr-summary-grid">
            {[
              { role: "pitcher" as const, upload: latestPitcherUpload },
              { role: "hitter" as const, upload: latestHitterUpload },
            ].map(({ role, upload }) => (
              <article key={role} className={`public-ocr-latest-card ${role}`}>
                <div className="public-ocr-latest-head">
                  <div>
                    <strong>최근 {formatRole(role)} 기록</strong>
                    {upload ? <span>{formatDate(upload.created_at)} 갱신</span> : <span>저장된 기록 없음</span>}
                  </div>
                  <button
                    type="button"
                    className="public-ocr-copy-icon"
                    disabled={!upload}
                    onClick={() => upload && void copyUpload(upload)}
                    aria-label={`최근 ${formatRole(role)} 기록 복사`}
                  >
                    <PublicOcrIcon name={upload && copiedId === `upload-${upload.id}` ? "check" : "clipboard"} />
                  </button>
                  {upload && copiedId === `upload-${upload.id}` && (
                    <span className="public-ocr-copy-toast" role="status">
                      복사되었습니다
                    </span>
                  )}
                </div>
                {upload ? (
                  <div className="public-ocr-latest-stats">
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
                  <p>업로드 탭에서 {formatRole(role)} 라인업을 먼저 인식하세요.</p>
                )}
              </article>
            ))}
          </section>
          <div className="public-ocr-summary-results">
            {([latestPitcherUpload, latestHitterUpload].filter(
              (upload): upload is SkillOcrSavedUpload => Boolean(upload)
            )).map((upload) => (
              <section key={upload.id} className="public-ocr-panel">
                <div className="ocr-section-head">
                  <div>
                    <h2>최근 {formatRole(upload.role)} 결과</h2>
                    <span>{formatDate(upload.created_at)}</span>
                  </div>
                  <div className="ocr-review-totals">
                    <strong>{upload.total_score.toFixed(2)}</strong>
                    <span>평균 {upload.average_score.toFixed(2)}</span>
                  </div>
                </div>
                <div className="public-ocr-saved-list">
                  {upload.selected_players.map((player) => (
                    <article key={`${upload.id}-${player.sourceRow}`} className="public-ocr-saved-row">
                      <strong>{player.playerName}</strong>
                      <span>{player.totalScore.toFixed(2)}</span>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="public-ocr-upload-panel">
            <div className="public-ocr-guide-card">
              <PublicOcrIcon name="check" />
              <div>
                <strong>모바일 캡처 권장</strong>
                <ul className="ocr-guide-list">
                  <li>PC 캡처보다 모바일에서 세로로 캡처한 라인업 화면이 더 정확합니다.</li>
                  <li>
                    게임 환경설정 &gt; 해상도에서 <strong>최고</strong> 또는 <strong>높음</strong>으로 설정하세요.
                  </li>
                  <li>OCR 결과는 부정확할 수 있으니 카드 타입, 스킬, 레벨을 꼭 확인하세요.</li>
                  <li>투수/타자는 각각 최대 9명만 선택해 저장하세요.</li>
                </ul>
              </div>
              <button type="button" className="ocr-example-link" onClick={() => setExampleOpen(true)}>
                예시 이미지
              </button>
            </div>
            <input
              ref={pitcherInputRef}
              className="ocr-file-input"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadImage("pitcher", file);
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
                if (file) onUploadImage("hitter", file);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              className="public-ocr-upload-btn"
              disabled={Boolean(uploadBusyRole) || Boolean(pitcherQuota?.used)}
              onClick={() => pitcherInputRef.current?.click()}
            >
              <PublicOcrIcon name="upload" />
              <strong>{uploadBusyRole === "pitcher" ? "투수 인식 중" : "투수"}</strong>
              <small>{pitcherQuota?.used ? "이번 주 사용 완료" : "Pitcher"}</small>
            </button>
            <button
              type="button"
              className="public-ocr-upload-btn"
              disabled={Boolean(uploadBusyRole) || Boolean(hitterQuota?.used)}
              onClick={() => hitterInputRef.current?.click()}
            >
              <PublicOcrIcon name="upload" />
              <strong>{uploadBusyRole === "hitter" ? "타자 인식 중" : "타자"}</strong>
              <small>{hitterQuota?.used ? "이번 주 사용 완료" : "Batter"}</small>
            </button>
          </section>

          {uploadBusyRole && (
            <section className="ocr-processing-panel">
              <div className="ocr-progress-bar">
                <span />
              </div>
              <strong>{formatRole(uploadBusyRole)} 이미지를 분석하고 있습니다.</strong>
              <p>OCR 처리와 스냅샷 저장이 끝나면 검수 카드가 표시됩니다.</p>
            </section>
          )}

          {pendingUploads.length > 0 && (
            <section className="public-ocr-panel">
              <div className="ocr-section-head">
                <div>
                  <h2>저장되지 않은 기록</h2>
                  <span>업로드 후 최종 저장하지 않은 스냅샷입니다.</span>
                </div>
              </div>
              <div className="public-ocr-saved-list">
                {pendingUploads.map((upload) => (
                  <button
                    key={upload.id}
                    type="button"
                    className="public-ocr-saved-row"
                    onClick={() => {
                      onSelectSnapshot(upload);
                      setActiveTab("upload");
                    }}
                  >
                    <strong>{formatRole(upload.role)} 스냅샷</strong>
                    <span>{formatDate(upload.created_at)}</span>
                    <em>검수하기</em>
                  </button>
                ))}
              </div>
            </section>
          )}

          {draftPlayers.length > 0 && (
            <section className="public-ocr-panel">
              <div className="ocr-section-head">
                <div>
                  <h2>인식 결과 검수</h2>
                  <span>카드 타입, 포지션, 스킬, 레벨을 확인하세요.</span>
                </div>
                <div className="ocr-review-head-actions">
                  <button type="button" className="ghost-btn" onClick={() => void copyDraft()}>
                    <PublicOcrIcon name={copiedId === "draft" ? "check" : "clipboard"} />
                    {copiedId === "draft" ? "복사됨" : "복사"}
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={saving}
                    onClick={() => {
                      if (validateDraft()) onSaveDraft();
                    }}
                  >
                    저장
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
                            onChange={(event) => onPlayerSelectedChange(playerIndex, event.target.checked)}
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
                                onChange={(event) => onPlayerPositionChange(playerIndex, event.target.value)}
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
                                  onPlayerStarterHandChange(playerIndex, event.target.value as StarterHand)
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

                                onPlayerPositionChange(playerIndex, item.key === "middle" ? "RP" : "CP");
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
                            {!skill.skillId && <span className="public-ocr-match-fail-badge">매칭실패</span>}
                            <select
                              className={`public-ocr-skill-name-select ${getSkillToneClass(skill)}`}
                              value={skill.skillId ?? ""}
                              onChange={(event) => {
                                const option = skillOptions.find(
                                  (candidate) => candidate.skillId === event.target.value
                                );
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
                                <option key={option.skillId} value={option.skillId}>
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

              {validationMessage && <p className="modal-error">{validationMessage}</p>}
            </section>
          )}

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
                    닫기
                  </button>
                </div>
                <img src="/ocr-lineup-example.png" alt="모바일 라인업 캡처 예시" />
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}
