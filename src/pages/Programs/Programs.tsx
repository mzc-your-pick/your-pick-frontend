import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Programs.scss";

type ProgramItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  image_url: string;
  created_at: string;
};

// ✅ 백엔드 응답이 약간 달라도 이 형태로 맞춰서 사용
function normalizeProgram(raw: any): ProgramItem {
  const id = String(
    raw?.id ?? raw?.program_id ?? raw?.programId ?? raw?._id ?? "",
  );
  const title = String(raw?.title ?? raw?.name ?? "");
  const description = String(raw?.description ?? raw?.description ?? "");
  const status = String(raw?.status ?? raw?.state ?? "UNKNOWN");

  // 이미지 필드 여러 케이스 대응
  const image_url = String(
    raw?.image_url ?? raw?.imgUrl ?? raw?.image_url ?? "",
  );
  const created_at = String(raw?.created_at ?? raw?.createdAt ?? "");

  return { id, title, description, status, image_url, created_at };
}

function extractPrograms(payload: any): any[] {
  // 케이스1: 배열이 바로 옴
  if (Array.isArray(payload)) return payload;

  // 케이스2: { data: [...] }
  if (payload && Array.isArray(payload.data)) return payload.data;

  // 케이스3: { programs: [...] }
  if (payload && Array.isArray(payload.programs)) return payload.programs;

  return [];
}

export default function Programs() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadPrograms() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/v1/programs", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          // 에러 바디가 JSON일 수도 있고 아닐 수도 있어서 방어적으로 처리
          const text = await res.text().catch(() => "");
          throw new Error(
            `프로그램 목록 조회 실패 (${res.status})${text ? `: ${text}` : ""}`,
          );
        }

        const json = await res.json();
        const items = extractPrograms(json).map(normalizeProgram);

        // id/title이 비어있으면 화면에서 문제나서 최소 필터
        const cleaned = items.filter((p: ProgramItem) => p.id && p.title);

        if (!alive) return;
        setPrograms(cleaned);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "프로그램 목록을 불러오지 못했어요.");
        setPrograms([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadPrograms();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return programs;
    return programs.filter((p) => p.title.toLowerCase().includes(keyword));
  }, [q, programs]);

  const goTopics = (programId: string) => {
    const params = new URLSearchParams({ program_id: programId });
    navigate(`/topics?${params.toString()}`);
  };

  return (
    <div className="programs">
      <header className="programs__header">
        <div className="programs__top">
          <div className="programs__brand" onClick={() => navigate("/")}>
            Your Pick
          </div>
        </div>

        <h1 className="programs__title">프로그램 선택</h1>
        <p className="programs__desc">
          어떤 서바이벌 프로그램의 민심을 확인할까요?
        </p>

        <div className="programs__search">
          <input
            className="programs__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="프로그램 검색 (예: 흑백요리사)"
            aria-label="프로그램 검색"
            disabled={loading}
          />
        </div>
      </header>

      <main className="programs__main">
        {loading ? (
          <div className="programs__empty">프로그램 목록 불러오는 중…</div>
        ) : error ? (
          <div className="programs__empty">
            {error}
            <br />
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              새로고침
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="programs__empty">
            검색 결과가 없어요. 다른 키워드로 찾아볼까요?
          </div>
        ) : (
          <div className="programs__grid">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="program-card"
                onClick={() => goTopics(p.id)}
              >
                <div className="program-card__thumb">
                  <img
                    className="program-card__img"
                    src={p.image_url}
                    alt={`${p.title} 썸네일`}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                      e.currentTarget.parentElement?.classList.add(
                        "program-card__thumb--fallback",
                      );
                    }}
                  />
                  <div className="program-card__thumbOverlay">
                    <div className="program-card__thumbTitle">{p.title}</div>
                    <div className="program-card__thumbTag">YOUR PICK</div>
                  </div>
                </div>

                <div className="program-card__body">
                  <div className="program-card__head">
                    <div className="program-card__title">{p.title}</div>
                    <span
                      className={`program-card__badge program-card__badge--${p.status}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="program-card__description">
                    {p.description}
                  </div>

                  <div className="program-card__cta">
                    <span>투표 주제 보러가기</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="programs__footer">
        <span>선택 후, 회차/라운드/참가자 필터로 주제를 고를 수 있어요.</span>
      </footer>
    </div>
  );
}
