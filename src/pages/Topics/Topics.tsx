import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Topics.scss";

type ProgramItem = {
  id: number;
  title: string;
  description: string;
  status: string; // "방영중" / "종영" / "예정" 등 한글로 옴
  image_url: string | null;
  created_at: string;
};

type ParticipantImage = {
  id: number;
  participant_name: string;
  image_url: string;
};

type TopicItem = {
  id: number;
  program_id: number;
  episode: number;
  match_type: string;
  topic_title: string;
  participants: string[];
  video_url: string | null;
  vote_type: number;
  actual_result: number | null;
  created_at: string; // "2026-01-27T07:42:38" (TZ 없을 수 있음)
  participant_images: ParticipantImage[];
};

type SortKey = "NEW" | "OLD";

// status가 이미 한글로 오므로 그대로 표시하되, 혹시 다른 값이면 방어
function statusLabel(s: string) {
  if (!s) return "상태";
  // 이미 "방영중/예정/종영"이면 그대로
  if (s === "방영중" || s === "예정" || s === "종영") return s;
  return s; // 기타 문자열도 그대로 노출
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    headers: { Accept: "application/json" },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패 (${res.status})${text ? `: ${text}` : ""}`);
  }

  return (await res.json()) as T;
}

// created_at이 TZ 없는 문자열일 수 있어 정렬 안정성을 위해 Date 파싱 보조
function toTime(value: string) {
  // "2026-01-27T07:42:38" 는 JS Date가 로컬로 파싱하는데, 환경 따라 다를 수 있어
  // 가장 단순 방어: Date로 파싱 실패하면 0
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function Topics() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const programIdParam = params.get("program_id") ?? "";
  const programId = Number(programIdParam);

  const hasValidProgramId = Number.isFinite(programId) && programId > 0;

  // program 조회 상태
  const [program, setProgram] = useState<ProgramItem | null>(null);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);

  // topics 조회 상태
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  // 필터 상태
  const [q, setQ] = useState("");
  const [episode, setEpisode] = useState<string>("ALL");
  const [match_type, setMatch_type] = useState<string>("ALL");
  const [participant, setParticipant] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("NEW");

  // ✅ 프로그램 정보 로드: /api/v1/programs/{program_id}
  useEffect(() => {
    let alive = true;

    async function loadProgram() {
      if (!hasValidProgramId) {
        setProgram(null);
        setProgramError(null);
        setProgramLoading(false);
        return;
      }

      try {
        setProgramLoading(true);
        setProgramError(null);

        const data = await fetchJson<ProgramItem>(
          `/api/v1/programs/${programId}`,
        );

        if (!alive) return;
        setProgram(data);
      } catch (e: any) {
        if (!alive) return;
        setProgram(null);
        setProgramError(e?.message ?? "프로그램 정보를 불러오지 못했어요.");
      } finally {
        if (!alive) return;
        setProgramLoading(false);
      }
    }

    loadProgram();
    return () => {
      alive = false;
    };
  }, [hasValidProgramId, programId]);

  // ✅ 토픽 리스트 로드: /api/v1/topics?program_id={program_id}
  useEffect(() => {
    let alive = true;

    async function loadTopics() {
      if (!hasValidProgramId) {
        setTopics([]);
        setTopicsError(null);
        setTopicsLoading(false);
        return;
      }

      try {
        setTopicsLoading(true);
        setTopicsError(null);

        const sp = new URLSearchParams({ program_id: String(programId) });
        const list = await fetchJson<TopicItem[]>(
          `/api/v1/topics?${sp.toString()}`,
        );

        if (!alive) return;

        const cleaned = (Array.isArray(list) ? list : []).map((t) => ({
          ...t,
          participants: Array.isArray(t.participants) ? t.participants : [],
          participant_images: Array.isArray(t.participant_images)
            ? t.participant_images
            : [],
          video_url: t.video_url ?? null,
          actual_result:
            t.actual_result === undefined || t.actual_result === null
              ? null
              : Number(t.actual_result),
        }));

        setTopics(cleaned);
      } catch (e: any) {
        if (!alive) return;
        setTopics([]);
        setTopicsError(e?.message ?? "투표 주제 목록을 불러오지 못했어요.");
      } finally {
        if (!alive) return;
        setTopicsLoading(false);
      }
    }

    loadTopics();
    return () => {
      alive = false;
    };
  }, [hasValidProgramId, programId]);

  const source = useMemo(() => topics, [topics]);

  // 필터 옵션 생성
  const episodeOptions = useMemo(() => {
    const set = new Set<number>();
    source.forEach((t) => set.add(t.episode));
    return Array.from(set).sort((a, b) => a - b);
  }, [source]);

  const match_typeOptions = useMemo(() => {
    const set = new Set<string>();
    source.forEach((t) => set.add(t.match_type));
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
      if (match_type !== "ALL" && t.match_type !== match_type) return false;
      if (participant !== "ALL" && !t.participants.includes(participant))
        return false;

      if (!keyword) return true;

      const hay = [
        t.topic_title,
        t.match_type,
        String(t.episode),
        ...t.participants,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(keyword);
    });

    list.sort((a, b) => {
      const da = toTime(a.created_at);
      const db = toTime(b.created_at);
      return sort === "NEW" ? db - da : da - db;
    });

    return list;
  }, [source, q, episode, match_type, participant, sort]);

  const resetFilters = () => {
    setQ("");
    setEpisode("ALL");
    setMatch_type("ALL");
    setParticipant("ALL");
    setSort("NEW");
  };

  const goVote = (topicId: number) => {
    const sp = new URLSearchParams({ topic_id: String(topicId) });
    navigate(`/vote?${sp.toString()}`);
  };

  const isLoading = programLoading || topicsLoading;

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
            Your Pick
          </div>
        </div>

        {hasValidProgramId ? (
          programLoading ? (
            <div className="topics__program topics__program--missing">
              <h1 className="topics__title">불러오는 중…</h1>
              <p className="topics__desc">프로그램 정보를 가져오고 있어요.</p>
            </div>
          ) : programError ? (
            <div className="topics__program topics__program--missing">
              <h1 className="topics__title">투표 주제 선택</h1>
              <p className="topics__desc">{programError}</p>
            </div>
          ) : program ? (
            <div className="topics__program">
              <div className="topics__programThumb">
                {program.image_url ? (
                  <img
                    src={program.image_url}
                    alt={`${program.title} 썸네일`}
                    className="topics__programImg"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                      e.currentTarget.parentElement?.classList.add(
                        "topics__programThumb--fallback",
                      );
                    }}
                  />
                ) : null}
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
                <p className="topics__desc">{program.description}</p>
              </div>
            </div>
          ) : (
            <div className="topics__program topics__program--missing">
              <h1 className="topics__title">투표 주제 선택</h1>
              <p className="topics__desc">프로그램 정보를 찾을 수 없어요.</p>
            </div>
          )
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
            disabled={!hasValidProgramId || isLoading}
          />

          <div className="topics__filterRow">
            <label className="topics__field">
              <span className="topics__label">회차</span>
              <select
                className="topics__select"
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                disabled={!hasValidProgramId || isLoading}
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
                value={match_type}
                onChange={(e) => setMatch_type(e.target.value)}
                disabled={!hasValidProgramId || isLoading}
              >
                <option value="ALL">전체</option>
                {match_typeOptions.map((r) => (
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
                disabled={!hasValidProgramId || isLoading}
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
                disabled={!hasValidProgramId || isLoading}
              >
                <option value="NEW">최신순</option>
                <option value="OLD">오래된순</option>
              </select>
            </label>

            <button
              className="topics__reset"
              type="button"
              onClick={resetFilters}
              disabled={!hasValidProgramId || isLoading}
            >
              초기화
            </button>
          </div>
        </div>
      </header>

      <main className="topics__main">
        {!hasValidProgramId ? (
          <div className="topics__empty">프로그램을 먼저 선택해주세요.</div>
        ) : topicsLoading ? (
          <div className="topics__empty">투표 주제 불러오는 중…</div>
        ) : topicsError ? (
          <div className="topics__empty">{topicsError}</div>
        ) : filtered.length === 0 ? (
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
                    <span className="topic-card__chip">{t.match_type}</span>
                  </div>

                  <div className="topic-card__title">{t.topic_title}</div>

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
