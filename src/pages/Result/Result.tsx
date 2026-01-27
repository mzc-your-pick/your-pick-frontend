import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Result.scss";

type ResultItem = {
  label: string;
  votes: number;
};

type ResultDetail = {
  title: string;
  public_result: ResultItem[];
  broadcast_result: ResultItem[] | null;
};

type Comment = {
  id: string; // 서버가 발급하는 댓글 ID (수정/삭제에 필요)
  author: string; // 사용자가 입력한 id(닉네임)
  content: string;
  created_at: string;
};

/* ======================
   API (나중에 실제 엔드포인트로 교체)
====================== */
async function fetchResult(topicId: string): Promise<ResultDetail> {
  console.log("topicId:", topicId);
  await new Promise((r) => setTimeout(r, 100));
  return {
    title: "최강록 vs 요리괴물",
    public_result: [
      { label: "최강록", votes: 62 },
      { label: "요리괴물", votes: 38 },
    ],
    broadcast_result: [
      { label: "최강록", votes: 2 },
      { label: "요리괴물", votes: 0 },
    ],
  };
}

async function fetchComments(topicId: string): Promise<Comment[]> {
  console.log("topicId:", topicId);
  await new Promise((r) => setTimeout(r, 100));
  return [
    {
      id: "1",
      author: "user01",
      content: "최강록 최고!!!",
      created_at: "2026-01-27",
    },
    {
      id: "2",
      author: "user02",
      content: "민심과 방송 결과 모두 최강록을 선택했네~",
      created_at: "2026-01-27",
    },
  ];
}

// ✅ 댓글 생성: author(id) + password + content를 서버로 보냄
async function createComment(
  topicId: string,
  payload: { author: string; password: string; content: string },
) {
  console.log("topicId:", topicId);

  // TODO: 실제 API로 교체
  // return fetch(`/api/topics/${topicId}/comments`, { method:"POST", headers:{...}, body: JSON.stringify(payload)})
  await new Promise((r) => setTimeout(r, 150));

  // 서버가 생성한 댓글을 반환한다고 가정
  const now = new Date().toISOString();
  return {
    id: `c_${Date.now()}`,
    author: payload.author,
    content: payload.content,
    created_at: now.slice(0, 10),
  } satisfies Comment;
}

// ✅ 댓글 수정: password 검증 포함
async function updateComment(
  commentId: string,
  payload: { password: string; content: string },
) {
  console.log("commentId:", commentId);

  // TODO: 실제 API로 교체
  await new Promise((r) => setTimeout(r, 150));

  // 틀린 비번 시 서버에서 401/403을 내린다고 가정
  // 여기서는 예시로 password가 "1234"가 아니면 실패
  if (payload.password !== "1234") {
    const err: any = new Error("wrong_password");
    err.status = 403;
    throw err;
  }

  return true;
}

// ✅ 댓글 삭제: password 검증 포함
async function deleteComment(commentId: string, payload: { password: string }) {
  console.log("commentId:", commentId);
  // TODO: 실제 API로 교체
  await new Promise((r) => setTimeout(r, 150));

  if (payload.password !== "1234") {
    const err: any = new Error("wrong_password");
    err.status = 403;
    throw err;
  }

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

/* ======================
   Page
====================== */
type ModalMode = "edit" | "delete";
type ModalState = {
  open: boolean;
  mode: ModalMode;
  target: Comment | null;
  password: string;
  content: string; // edit용
  error: string | null;
  busy: boolean;
};

export default function Result() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topicId = params.get("topic_id") ?? "";

  const [result, setResult] = useState<ResultDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 댓글 작성 폼
  const [author, setAuthor] = useState("");
  const [pw, setPw] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);

  // 수정/삭제 모달
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "edit",
    target: null,
    password: "",
    content: "",
    error: null,
    busy: false,
  });

  useEffect(() => {
    if (!topicId) return;

    setError(null);
    setResult(null);

    Promise.all([fetchResult(topicId), fetchComments(topicId)])
      .then(([r, cs]) => {
        setResult(r);
        setComments(cs);
      })
      .catch(() => setError("failed"));
  }, [topicId]);

  const totalPublic = useMemo(
    () => (result ? calcTotal(result.public_result) : 0),
    [result],
  );

  const canSubmit = author.trim() && pw.trim() && commentText.trim();

  const onSubmitComment = async () => {
    if (!canSubmit || submitBusy) return;

    setSubmitError(null);
    setSubmitBusy(true);

    try {
      const created = await createComment(topicId, {
        author: author.trim(),
        password: pw.trim(),
        content: commentText.trim(),
      });

      setComments((prev) => [created, ...prev]);
      setAuthor("");
      setPw("");
      setCommentText("");
    } catch {
      setSubmitError("댓글 등록에 실패했어요.");
    } finally {
      setSubmitBusy(false);
    }
  };

  const openEdit = (c: Comment) => {
    setModal({
      open: true,
      mode: "edit",
      target: c,
      password: "",
      content: c.content,
      error: null,
      busy: false,
    });
  };

  const openDelete = (c: Comment) => {
    setModal({
      open: true,
      mode: "delete",
      target: c,
      password: "",
      content: "",
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

  const confirmModal = async () => {
    if (!modal.target || modal.busy) return;
    const password = modal.password.trim();
    if (!password) {
      setModal((m) => ({ ...m, error: "비밀번호를 입력해줘." }));
      return;
    }

    setModal((m) => ({ ...m, busy: true, error: null }));

    try {
      if (modal.mode === "edit") {
        const nextContent = modal.content.trim();
        if (!nextContent) {
          setModal((m) => ({
            ...m,
            busy: false,
            error: "수정할 내용을 입력해줘.",
          }));
          return;
        }

        await updateComment(modal.target.id, {
          password,
          content: nextContent,
        });

        setComments((prev) =>
          prev.map((c) =>
            c.id === modal.target!.id ? { ...c, content: nextContent } : c,
          ),
        );
        closeModal();
      } else {
        await deleteComment(modal.target.id, { password });
        setComments((prev) => prev.filter((c) => c.id !== modal.target!.id));
        closeModal();
      }
    } catch (e: any) {
      // 서버에서 401/403이면 비밀번호 오류로 처리
      setModal((m) => ({
        ...m,
        busy: false,
        error: "비밀번호가 틀렸거나 권한이 없어요.",
      }));
      return;
    }
  };

  if (!topicId) {
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

            {result.broadcast_result && (
              <section className="result__section">
                <div className="result__sectionHead">
                  <h2>📺 방송 결과</h2>
                  <span className="result__metaText">방송 기준 결과</span>
                </div>

                <div className="result__bars">
                  {(() => {
                    const total = calcTotal(result.broadcast_result!);
                    return result.broadcast_result!.map((r) => (
                      <Bar
                        key={r.label}
                        label={prettyLabel(r.label)}
                        votes={r.votes}
                        total={total}
                      />
                    ));
                  })()}
                </div>
              </section>
            )}

            <section className="result__section">
              <div className="result__sectionHead">
                <h2>💬 댓글</h2>
                <span className="result__metaText">id/pw로 수정·삭제</span>
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
                  placeholder="의견을 남겨보세요"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />

                {submitError && (
                  <div className="comment__error">{submitError}</div>
                )}

                <button
                  className={`comment__submit ${canSubmit && !submitBusy ? "" : "is-disabled"}`}
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
                      <span>{c.created_at}</span>
                    </div>

                    <p className="comment__content">{c.content}</p>

                    <div className="comment__actions">
                      <button
                        type="button"
                        className="comment__btn"
                        onClick={() => openEdit(c)}
                      >
                        수정
                      </button>
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

      {/* 수정/삭제 모달 */}
      {modal.open && modal.target && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__overlay" onClick={closeModal} />
          <div className="modal__panel">
            <div className="modal__title">
              {modal.mode === "edit" ? "댓글 수정" : "댓글 삭제"}
            </div>

            <div className="modal__desc">
              {modal.mode === "edit"
                ? `작성자: ${modal.target.author} · 비밀번호 확인 후 수정할 수 있어요.`
                : `작성자: ${modal.target.author} · 비밀번호 확인 후 삭제할 수 있어요.`}
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

            {modal.mode === "edit" && (
              <textarea
                className="modal__textarea"
                placeholder="수정할 내용"
                value={modal.content}
                onChange={(e) =>
                  setModal((m) => ({ ...m, content: e.target.value }))
                }
              />
            )}

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
                className={`modal__btn ${modal.mode === "delete" ? "modal__btn--danger" : ""}`}
                onClick={confirmModal}
                disabled={modal.busy}
              >
                {modal.busy
                  ? "처리 중…"
                  : modal.mode === "edit"
                    ? "수정"
                    : "삭제"}
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
