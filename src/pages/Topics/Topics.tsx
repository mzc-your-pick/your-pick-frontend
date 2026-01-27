import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Topics.scss";

type ProgramStatus = "ONGOING" | "ENDED" | "UPCOMING";

type ProgramItem = {
  id: string;
  title: string;
  subtitle: string;
  status: ProgramStatus;
  img_url: string;
};

type TopicItem = {
  id: string;
  program_id: string;
  episode: number; // 회차
  round: string; // 라운드/대결명 (ex: 파이널, 1차예선, 두부지옥)
  title: string; // 주제 타이틀 (ex: 최강록 vs 요리괴물)
  participants: string[]; // 참가자/팀명
  created_at: string; // ISO string
  vote_type: number; // 1=합/불, 2=1:1, 3=3지선다... (API 나오면 맞춤)
};

// ✅ Programs: 백엔드 형태와 동일 (현재는 더미)
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

// ✅ Topics: 임시 더미 (나중에 program_id로 API 호출)
const TOPICS: TopicItem[] = [
  {
    id: "1",
    program_id: "1",
    episode: 1,
    round: "1차 경연",
    title: "최강록 vs 요리괴물",
    participants: ["최강록", "요리괴물"],
    created_at: "2026-01-20T10:00:00.000Z",
    vote_type: 2,
  },
  {
    id: "2",
    program_id: "1",
    episode: 1,
    round: "1차 경연",
    title: "두부지옥: A팀 vs B팀",
    participants: ["A팀", "B팀"],
    created_at: "2026-01-21T10:00:00.000Z",
    vote_type: 2,
  },
  {
    id: "3",
    program_id: "1",
    episode: 2,
    round: "파이널",
    title: "우승자는 누구?",
    participants: ["최강록", "요리괴물", "다크호스"],
    created_at: "2026-01-25T10:00:00.000Z",
    vote_type: 3,
  },
  {
    id: "41",
    program_id: "2",
    episode: 1,
    round: "1차 예선",
    title: "김하온 합격 여부",
    participants: ["합격", "불합격"],
    created_at: "2026-01-18T10:00:00.000Z",
    vote_type: 1,
  },
  {
    id: "5",
    program_id: "3",
    episode: 3,
    round: "배틀 미션",
    title: "크루 A vs 크루 B",
    participants: ["크루 A", "크루 B"],
    created_at: "2025-12-10T10:00:00.000Z",
    vote_type: 2,
  },
];

type SortKey = "NEW" | "OLD";

function statusLabel(s: ProgramStatus) {
  if (s === "ONGOING") return "방영중";
  if (s === "UPCOMING") return "예정";
  return "종영";
}

export default function Topics() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const programId = params.get("program_id") ?? "";

  const program = useMemo(
    () => PROGRAMS.find((p) => p.id === programId),
    [programId],
  );

  // 필터 상태
  const [q, setQ] = useState("");
  const [episode, setEpisode] = useState<string>("ALL");
  const [round, setRound] = useState<string>("ALL");
  const [participant, setParticipant] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("NEW");

  const source = useMemo(() => {
    // program_id 없으면 일단 전체를 보여주되, UX상 programs로 보내도 됨
    const base = programId
      ? TOPICS.filter((t) => t.program_id === programId)
      : TOPICS;
    return base;
  }, [programId]);

  // 필터 옵션 생성
  const episodeOptions = useMemo(() => {
    const set = new Set<number>();
    source.forEach((t) => set.add(t.episode));
    return Array.from(set).sort((a, b) => a - b);
  }, [source]);

  const roundOptions = useMemo(() => {
    const set = new Set<string>();
    source.forEach((t) => set.add(t.round));
    return Array.from(set).sort();
  }, [source]);

  const participantOptions = useMemo(() => {
    const set = new Set<string>();
    source.forEach((t) => t.participants.forEach((x) => set.add(x)));
    return Array.from(set).sort();
  }, [source]);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    const list = source.filter((t) => {
      if (episode !== "ALL" && String(t.episode) !== episode) return false;
      if (round !== "ALL" && t.round !== round) return false;
      if (participant !== "ALL" && !t.participants.includes(participant))
        return false;

      if (!keyword) return true;

      const hay = [t.title, t.round, String(t.episode), ...t.participants]
        .join(" ")
        .toLowerCase();

      return hay.includes(keyword);
    });

    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "NEW" ? db - da : da - db;
    });

    return list;
  }, [source, q, episode, round, participant, sort]);

  const resetFilters = () => {
    setQ("");
    setEpisode("ALL");
    setRound("ALL");
    setParticipant("ALL");
    setSort("NEW");
  };

  const goVote = (topicId: string) => {
    const sp = new URLSearchParams({ topic_id: topicId });
    navigate(`/vote?${sp.toString()}`);
  };

  return (
    <div className="topics">
      <header className="topics__header">
        <div className="topics__top">
          <button
            className="topics__back"
            onClick={() => navigate("/programs")}
            type="button"
          >
            ← 프로그램
          </button>
          <div className="topics__brand" onClick={() => navigate("/")}>
            your pick
          </div>
        </div>

        {program ? (
          <div className="topics__program">
            <div className="topics__programThumb">
              <img
                src={program.img_url}
                alt={`${program.title} 썸네일`}
                className="topics__programImg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  e.currentTarget.parentElement?.classList.add(
                    "topics__programThumb--fallback",
                  );
                }}
              />
              <div className="topics__programOverlay" />
            </div>

            <div className="topics__programMeta">
              <div className="topics__programTitleRow">
                <h1 className="topics__title">{program.title}</h1>
                <span
                  className={`topics__badge topics__badge--${program.status}`}
                >
                  {statusLabel(program.status)}
                </span>
              </div>
              <p className="topics__desc">{program.subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="topics__program topics__program--missing">
            <h1 className="topics__title">투표 주제 선택</h1>
            <p className="topics__desc">프로그램을 먼저 선택해주세요.</p>
          </div>
        )}

        {/* 필터 바 */}
        <div className="topics__filters">
          <input
            className="topics__search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주제 검색 (참가자, 라운드, 회차 등)"
            aria-label="주제 검색"
          />

          <div className="topics__filterRow">
            <label className="topics__field">
              <span className="topics__label">회차</span>
              <select
                className="topics__select"
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
              >
                <option value="ALL">전체</option>
                {episodeOptions.map((ep) => (
                  <option key={ep} value={String(ep)}>
                    {ep}회차
                  </option>
                ))}
              </select>
            </label>

            <label className="topics__field">
              <span className="topics__label">라운드</span>
              <select
                className="topics__select"
                value={round}
                onChange={(e) => setRound(e.target.value)}
              >
                <option value="ALL">전체</option>
                {roundOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="topics__field">
              <span className="topics__label">참가자</span>
              <select
                className="topics__select"
                value={participant}
                onChange={(e) => setParticipant(e.target.value)}
              >
                <option value="ALL">전체</option>
                {participantOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="topics__field">
              <span className="topics__label">정렬</span>
              <select
                className="topics__select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="NEW">최신순</option>
                <option value="OLD">오래된순</option>
              </select>
            </label>

            <button
              className="topics__reset"
              type="button"
              onClick={resetFilters}
            >
              초기화
            </button>
          </div>
        </div>
      </header>

      <main className="topics__main">
        {filtered.length === 0 ? (
          <div className="topics__empty">
            조건에 맞는 투표 주제가 없어요. 필터를 바꿔볼까요?
          </div>
        ) : (
          <div className="topics__grid">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className="topic-card"
                onClick={() => goVote(t.id)}
              >
                <div className="topic-card__body">
                  <div className="topic-card__meta">
                    <span className="topic-card__chip">{t.episode}회차</span>
                    <span className="topic-card__chip">{t.round}</span>
                    <span className="topic-card__chip">type {t.vote_type}</span>
                  </div>

                  <div className="topic-card__title">{t.title}</div>

                  <div className="topic-card__participants">
                    {t.participants.map((p, idx) => (
                      <span
                        key={`${t.id}-${p}-${idx}`}
                        className="topic-card__p"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="topic-card__footer">
                    <span className="topic-card__date">
                      {new Date(t.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="topic-card__go" aria-hidden="true">
                      투표하기 →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="topics__footer">
        <span>
          API 연결 후에는 프로그램별/회차별 주제가 자동으로 로드됩니다.
        </span>
      </footer>
    </div>
  );
}
