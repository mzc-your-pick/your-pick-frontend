import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Programs.scss";

type ProgramStatus = "ONGOING" | "ENDED" | "UPCOMING";

type ProgramItem = {
  id: string;
  title: string;
  subtitle: string;
  status: ProgramStatus;
  img_url: string; // ✅ 백엔드가 내려주는 필드
};

// ✅ API 붙기 전까지는 더미 데이터 (형태는 백엔드와 동일)
const PROGRAMS: ProgramItem[] = [
  {
    id: "1",
    title: "흑백요리사2",
    subtitle: "셰프들의 승부, 민심은 누구 편?",
    status: "ONGOING",
    img_url: "/images/programs/bwc2.jpg",
  },
  {
    id: "2",
    title: "쇼미더머니12",
    subtitle: "무대의 판정 vs 시청자 선택",
    status: "UPCOMING",
    img_url: "/images/programs/smtm12.jpg",
  },
  {
    id: "3",
    title: "스트릿우먼파이터",
    subtitle: "댄스 배틀, 진짜 민심은?",
    status: "ENDED",
    img_url: "/images/programs/swf.jpg",
  },
];

export default function Programs() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return PROGRAMS;
    return PROGRAMS.filter((p) => p.title.toLowerCase().includes(keyword));
  }, [q]);

  const goTopics = (programId: string) => {
    // ✅ 다음 페이지에서 program_id로 조회할 가능성이 높으니 id를 쿼리로 전달
    const params = new URLSearchParams({ program_id: programId });
    navigate(`/topics?${params.toString()}`);
  };

  const statusLabel = (s: ProgramStatus) => {
    if (s === "ONGOING") return "방영중";
    if (s === "UPCOMING") return "예정";
    return "종영";
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
          />
        </div>
      </header>

      <main className="programs__main">
        {filtered.length === 0 ? (
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
                    src={p.img_url}
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

                {/* ✅ 이 래퍼 추가 */}
                <div className="program-card__body">
                  <div className="program-card__head">
                    <div className="program-card__title">{p.title}</div>
                    <span
                      className={`program-card__badge program-card__badge--${p.status}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  <div className="program-card__subtitle">{p.subtitle}</div>

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
