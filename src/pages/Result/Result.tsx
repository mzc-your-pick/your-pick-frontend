import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Result.scss";

type ResultItem = {
  label: string;
  percent: number;
};

type ResultDetail = {
  title: string;
  public_result: ResultItem[];
  broadcast_result: ResultItem[] | null;
};

type Comment = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

async function fetchResult(topicId: string): Promise<ResultDetail> {
  // TODO: API 생기면 교체
  console.log("topicId:", topicId);
  await new Promise((r) => setTimeout(r, 150));

  return {
    title: "최강록 vs 요리괴물",
    public_result: [
      { label: "최강록", percent: 62 },
      {
        label: "요리괴물",
        percent: 38,
      },
    ],
    // 방송 결과 아직 안 나왔으면 null
    broadcast_result: [
      {
        label: "최강록",
        percent: 100,
      },
      {
        label: "요리괴물",
        percent: 0,
      },
    ],
  };
}

async function fetchComments(topicId: string): Promise<Comment[]> {
  console.log("topicId:", topicId);
  await new Promise((r) => setTimeout(r, 100));
  return [
    {
      id: "1",
      author: "익명1",
      content: "민심이 더 정확한 듯",
      created_at: "2026-01-27",
    },
    {
      id: "2",
      author: "익명2",
      content: "민심이 더 정확한 듯2222",
      created_at: "2026-01-27",
    },
    {
      id: "3",
      author: "익명3",
      content: "민심이 더 정확한 듯2222",
      created_at: "2026-01-27",
    },
    {
      id: "4",
      author: "익명4",
      content: "민심이 더 정확한 듯2222",
      created_at: "2026-01-27",
    },
  ];
}

export default function Result() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topicId = params.get("topic_id") ?? "";

  const [result, setResult] = useState<ResultDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [author, setAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");

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

  const canSubmit = author.trim() && password.trim() && content.trim();

  const submitComment = () => {
    if (!canSubmit) return;

    // TODO: API 생기면 POST로 교체 + 성공 시 목록 refetch
    setComments((prev) => [
      {
        id: Date.now().toString(),
        author: author.trim(),
        content: content.trim(),
        created_at: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);

    setAuthor("");
    setPassword("");
    setContent("");
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
      </header>

      <main className="result__main">
        {!result && !error && (
          <div className="result__message">결과를 불러오는 중…</div>
        )}

        {error && <div className="result__message">불러오기에 실패했어요.</div>}

        {result && (
          <>
            <section className="result__section">
              <h2>🧑‍🤝‍🧑 민심 결과</h2>
              {result.public_result.map((r) => (
                <Bar key={r.label} label={r.label} percent={r.percent} />
              ))}
            </section>

            {result.broadcast_result && (
              <section className="result__section">
                <h2>📺 방송 결과</h2>
                {result.broadcast_result.map((r) => (
                  <Bar key={r.label} label={r.label} percent={r.percent} />
                ))}
              </section>
            )}

            <section className="result__section">
              <h2>💬 댓글</h2>

              <div className="comment__form">
                <div className="comment__row">
                  <input
                    className="comment__input"
                    placeholder="닉네임"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                  <input
                    className="comment__input"
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <textarea
                  className="comment__textarea"
                  placeholder="의견을 남겨보세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                <button
                  className={`comment__submit ${canSubmit ? "" : "is-disabled"}`}
                  type="button"
                  onClick={submitComment}
                  disabled={!canSubmit}
                >
                  댓글 등록
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
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Bar({ label, percent }: ResultItem) {
  return (
    <div className="bar">
      <span className="bar__label">{label}</span>
      <div className="bar__track">
        <div className="bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="bar__percent">{percent}%</span>
    </div>
  );
}
