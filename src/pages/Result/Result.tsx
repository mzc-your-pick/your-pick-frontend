import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Result.scss";

/* ======================
   Types (API 스펙 반영)
====================== */

type ApiResultResponse = {
  success: boolean;
  data: {
    topic_id: number;
    topic_title: string;
    vote_type: number; // 1=합/불, 2=2명, 3=3명 이상(다인원)
    actual_result: number | null; // type1: 1=합격 2=불합격 / type2~: 1=1번 참가자...
    public_votes: {
      total: number;
      results: Record<
        string, // "1","2","3"... vote_choice(1-based)
        {
          count: number;
          percent: number; // 0~100 (정수/실수 가능)
        }
      >;
    };
    participants: string[];
    match: boolean;
  } | null;
  error: any;
  message: string | null;
};

type ApiCommentListResponse = {
  success: boolean;
  data: ApiComment[];
  total: number;
};

type ApiComment = {
  id: number;
  vote_id: number;
  content: string;
  comment_user_name: string;
  created_at: string; // ISO
};

type ResultItem = {
  label: string;
  votes: number;
  percent?: number;
};

type ResultDetail = {
  title: string;
  public_result: ResultItem[];
  total_public: number;

  vote_type: number;
  participants: string[];
  actual_result: number | null;
  match: boolean;
};

type Comment = {
  id: number;
  vote_id: number;
  author: string;
  content: string;
  created_at: string;
};

/* ======================
   API Helpers
====================== */

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패 (${res.status})${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

async function fetchResult(topicId: number): Promise<ResultDetail> {
  const r = await fetchJson<ApiResultResponse>(
    `/api/v1/topics/${topicId}/results`,
  );
  if (!r.success || !r.data) throw new Error("failed_result");

  const d = r.data;

  // public_votes.results: { "1": {count, percent}, ... }
  // 참가자 전체를 기준으로 results가 빠진 항목도 0표로 채워서 UI 안정화
  const resultsMap = d.public_votes?.results ?? {};
  const participants = Array.isArray(d.participants) ? d.participants : [];

  const public_result: ResultItem[] = participants.map((name, idx) => {
    const key = String(idx + 1); // vote_choice is 1-based
    const r = resultsMap[key];
    return {
      label: name,
      votes: Number(r?.count ?? 0) || 0,
      percent: r?.percent,
    };
  });

  // 득표순 정렬(원하면 원래 순서 유지로 바꿔도 됨)
  public_result.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  return {
    title: d.topic_title,
    public_result,
    total_public: Number(d.public_votes?.total) || 0,

    vote_type: d.vote_type,
    participants,
    actual_result: d.actual_result ?? null,
    match: !!d.match,
  };
}

async function fetchComments(topicId: number): Promise<Comment[]> {
  const r = await fetchJson<ApiCommentListResponse>(
    `/api/v1/topics/${topicId}/comments`,
  );
  if (!r.success) throw new Error("failed_comments");

  return (Array.isArray(r.data) ? r.data : []).map((c) => ({
    id: c.id,
    vote_id: c.vote_id,
    author: c.comment_user_name,
    content: c.content,
    created_at: c.created_at,
  }));
}

// POST /api/v1/votes/{vote_id}/comments
async function createComment(
  voteId: number,
  payload: {
    comment_user_name: string;
    comment_password: string;
    content: string;
  },
): Promise<Comment> {
  const created = await fetchJson<ApiComment>(
    `/api/v1/votes/${voteId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  return {
    id: created.id,
    vote_id: created.vote_id,
    author: created.comment_user_name,
    content: created.content,
    created_at: created.created_at,
  };
}

// DELETE /api/v1/comments/{comment_id}
async function deleteComment(
  commentId: number,
  payload: { comment_password: string },
) {
  await fetchJson<{ success?: boolean }>(`/api/v1/comments/${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return true;
}

/* ======================
   Utils
====================== */

function prettyLabel(label: string) {
  if (label === "PASS") return "합격";
  if (label === "FAIL") return "불합격";
  return label;
}

function calcTotal(items: ResultItem[]) {
  return (items ?? []).reduce((sum, it) => sum + (Number(it.votes) || 0), 0);
}

function calcPercent(votes: number, total: number) {
  if (!total) return 0;
  return Math.round((votes / total) * 1000) / 10; // 소수 1자리
}

// "몇초 전/몇분 전/몇시간 전", 24시간 넘으면 날짜
function formatRelativeOrDate(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;

  const now = Date.now();
  const diffMs = now - t;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return new Date(iso).toLocaleString("ko-KR");

  if (diffSec < 60) return `${diffSec}초 전`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;

  return new Date(iso).toLocaleDateString("ko-KR");
}

function getWinnerLabel(result: ResultDetail): string {
  const ar = result.actual_result;
  if (!ar) return "정보 없음";

  // type1: 1=합격 2=불합격
  if (result.vote_type === 1) {
    return ar === 1 ? "합격" : "불합격";
  }

  // type2~: 1-based index
  const idx = ar - 1;
  return result.participants?.[idx] ?? "승자";
}

/* ======================
   Page
====================== */

type ModalState = {
  open: boolean;
  target: Comment | null;
  password: string;
  error: string | null;
  busy: boolean;
};

export default function Result() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const topicId = Number(params.get("topic_id") ?? "");
  const voteId = Number(params.get("vote_id") ?? params.get("voteId") ?? "");

  const hasValidTopicId = Number.isFinite(topicId) && topicId > 0;
  const hasValidVoteId = Number.isFinite(voteId) && voteId > 0;

  const [result, setResult] = useState<ResultDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 댓글 작성 폼
  const [author, setAuthor] = useState("");
  const [pw, setPw] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);

  // 삭제 모달
  const [modal, setModal] = useState<ModalState>({
    open: false,
    target: null,
    password: "",
    error: null,
    busy: false,
  });

  useEffect(() => {
    if (!hasValidTopicId) return;

    setError(null);
    setResult(null);

    Promise.all([fetchResult(topicId), fetchComments(topicId)])
      .then(([r, cs]) => {
        setResult(r);
        setComments(cs);
      })
      .catch(() => setError("failed"));
  }, [hasValidTopicId, topicId]);

  const totalPublic = useMemo(() => {
    if (!result) return 0;
    // API total 우선
    if (Number.isFinite(result.total_public)) return result.total_public;
    return calcTotal(result.public_result);
  }, [result]);

  const canSubmit =
    author.trim() && pw.trim() && commentText.trim() && hasValidVoteId;

  const onSubmitComment = async () => {
    if (!canSubmit || submitBusy) return;

    setSubmitError(null);
    setSubmitBusy(true);

    try {
      const created = await createComment(voteId, {
        comment_user_name: author.trim(),
        comment_password: pw.trim(),
        content: commentText.trim(),
      });

      setComments((prev) => [created, ...prev]);
      setAuthor("");
      setPw("");
      setCommentText("");
    } catch (e: any) {
      setSubmitError(e?.message ?? "댓글 등록에 실패했어요.");
    } finally {
      setSubmitBusy(false);
    }
  };

  const openDelete = (c: Comment) => {
    setModal({
      open: true,
      target: c,
      password: "",
      error: null,
      busy: false,
    });
  };

  const closeModal = () => {
    setModal((m) => ({
      ...m,
      open: false,
      target: null,
      error: null,
      busy: false,
      password: "",
    }));
  };

  const confirmDelete = async () => {
    if (!modal.target || modal.busy) return;

    const password = modal.password.trim();
    if (!password) {
      setModal((m) => ({ ...m, error: "비밀번호를 입력해줘." }));
      return;
    }

    setModal((m) => ({ ...m, busy: true, error: null }));

    try {
      await deleteComment(modal.target.id, { comment_password: password });
      setComments((prev) => prev.filter((c) => c.id !== modal.target!.id));
      closeModal();
    } catch {
      setModal((m) => ({
        ...m,
        busy: false,
        error: "비밀번호가 틀렸거나 권한이 없어요.",
      }));
    }
  };

  if (!hasValidTopicId) {
    return (
      <div className="result">
        <header className="result__header">
          <button onClick={() => navigate(-1)} type="button">
            ← 뒤로
          </button>
          <h1>결과</h1>
        </header>
        <main className="result__main">
          <div className="result__message">topic_id가 없어요.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="result">
      <header className="result__header">
        <button onClick={() => navigate(-1)} type="button">
          ← 뒤로
        </button>
        <h1>{result?.title ?? "결과"}</h1>
        <div className="vote__brand" onClick={() => navigate("/")}>
          Your Pick
        </div>
      </header>

      <main className="result__main">
        {!result && !error && (
          <div className="result__message">결과를 불러오는 중…</div>
        )}
        {error && <div className="result__message">불러오기에 실패했어요.</div>}

        {result && (
          <>
            {/* 민심 결과 */}
            <section className="result__section">
              <div className="result__sectionHead">
                <h2>🧑‍🤝‍🧑 민심 결과</h2>
                <span className="result__metaText">
                  총 {totalPublic.toLocaleString()}명 참여
                </span>
              </div>

              <div className="result__bars">
                {result.public_result.map((r) => (
                  <Bar
                    key={r.label}
                    label={prettyLabel(r.label)}
                    votes={r.votes}
                    total={totalPublic}
                  />
                ))}
              </div>
            </section>

            {/* 방송 결과: 승자만 표시 */}
            {result.actual_result ? (
              <section className="result__section">
                <div className="result__sectionHead">
                  <h2>📺 방송 결과</h2>
                  <span className="result__metaText">
                    {result.match ? "민심과 일치" : "민심과 불일치"}
                  </span>
                </div>

                <div className="result__winnerRow">
                  <div className="result__winner">
                    <span
                      className={`result__winnerChip ${
                        result.match
                          ? "result__winnerChip--match"
                          : "result__winnerChip--mismatch"
                      }`}
                    >
                      승자: {getWinnerLabel(result)}
                    </span>
                  </div>
                  <span className="result__winnerNote">
                    득표수 상세는 제공되지 않아요
                  </span>
                </div>
              </section>
            ) : null}

            {/* 댓글 */}
            <section className="result__section">
              <div className="result__sectionHead">
                <h2>💬 댓글</h2>
                <span className="result__metaText">id/pw로 삭제</span>
              </div>

              <div className="comment__form">
                <div className="comment__row">
                  <input
                    className="comment__input"
                    placeholder="id(닉네임)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                  <input
                    className="comment__input"
                    type="password"
                    placeholder="pw"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                </div>

                <textarea
                  className="comment__textarea"
                  placeholder={
                    hasValidVoteId
                      ? "의견을 남겨보세요"
                      : "투표 후에 댓글을 작성할 수 있어요."
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!hasValidVoteId}
                />

                {!hasValidVoteId ? (
                  <div className="comment__error">
                    vote_id가 없어요. 투표 완료 후 Result로 이동할 때 vote_id를
                    쿼리에 포함시켜줘야 댓글 작성이 가능해요.
                  </div>
                ) : null}

                {submitError && (
                  <div className="comment__error">{submitError}</div>
                )}

                <button
                  className={`comment__submit ${
                    canSubmit && !submitBusy ? "" : "is-disabled"
                  }`}
                  type="button"
                  onClick={onSubmitComment}
                  disabled={!canSubmit || submitBusy}
                >
                  {submitBusy ? "등록 중…" : "댓글 등록"}
                </button>
              </div>

              <ul className="comment__list">
                {comments.map((c) => (
                  <li className="comment__item" key={c.id}>
                    <div className="comment__meta">
                      <strong>{c.author}</strong>
                      <span>{formatRelativeOrDate(c.created_at)}</span>
                    </div>

                    <p className="comment__content">{c.content}</p>

                    <div className="comment__actions">
                      <button
                        type="button"
                        className="comment__btn comment__btn--danger"
                        onClick={() => openDelete(c)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>

      {/* 삭제 모달 */}
      {modal.open && modal.target && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__overlay" onClick={closeModal} />
          <div className="modal__panel">
            <div className="modal__title">댓글 삭제</div>

            <div className="modal__desc">
              작성자: {modal.target.author} · 비밀번호 확인 후 삭제할 수 있어요.
            </div>

            <input
              className="modal__input"
              type="password"
              placeholder="비밀번호 입력"
              value={modal.password}
              onChange={(e) =>
                setModal((m) => ({ ...m, password: e.target.value }))
              }
            />

            {modal.error && <div className="modal__error">{modal.error}</div>}

            <div className="modal__actions">
              <button
                type="button"
                className="modal__btn"
                onClick={closeModal}
                disabled={modal.busy}
              >
                취소
              </button>
              <button
                type="button"
                className="modal__btn modal__btn--danger"
                onClick={confirmDelete}
                disabled={modal.busy}
              >
                {modal.busy ? "처리 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({
  label,
  votes,
  total,
}: {
  label: string;
  votes: number;
  total: number;
}) {
  const pct = calcPercent(Number(votes) || 0, total);
  return (
    <div className="bar">
      <div className="bar__row">
        <span className="bar__label">{label}</span>
        <span className="bar__nums">
          {Number(votes || 0).toLocaleString()}표 · {pct}%
        </span>
      </div>

      <div className="bar__track" aria-hidden="true">
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
