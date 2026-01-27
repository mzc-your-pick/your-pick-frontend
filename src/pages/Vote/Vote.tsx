import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Vote.scss";

type TopicDetail = {
  id: string;
  program_id: string;
  episode: number;
  round: string;
  title: string;
  participants: string[]; // type1이면 1명, type2면 2명, ...
  participants_imgs: string[]; // participants와 인덱스 매칭
  created_at: string;
  vote_type: number; // 1=합/불, 2=2명, 3=3명, 4~n=n명
  youtube_url: string;
};

type VoteOption = {
  key: string; // 제출용 키 (type1: PASS/FAIL, type2~: "0","1"...)
  label: string; // 화면 표시
  sub?: string; // type1에서 참가자명 같은 보조 텍스트
  img?: string; // 카드 이미지
};

async function fetchTopicDetail(topicId: string): Promise<TopicDetail> {
  // ✅ API 붙일 때 여기만 바꾸면 됨
  // const res = await fetch(`/api/topics/${topicId}`);
  // if (!res.ok) throw new Error("failed to fetch topic detail");
  // return res.json();

  // ---- 더미 ----
  await new Promise((r) => setTimeout(r, 200));

  if (topicId === "1") {
    return {
      id: "1",
      program_id: "1",
      episode: 1,
      round: "1차 경연",
      title: "최강록 합격 여부",
      participants: ["최강록"],
      participants_imgs: ["/images/participants/chk.jpg"],
      created_at: "2026-01-20T10:00:00.000Z",
      vote_type: 1,
      youtube_url: "https://www.youtube.com/watch?v=YUoquCDRSvE&t=1s",
    };
  }

  if (topicId === "2") {
    return {
      id: "2",
      program_id: "1",
      episode: 1,
      round: "1차 경연",
      title: "최강록 vs 요리괴물",
      participants: ["최강록", "요리괴물"],
      participants_imgs: [
        "/images/participants/chk.jpg",
        "/images/participants/monster.jpg",
      ],
      created_at: "2026-01-21T10:00:00.000Z",
      vote_type: 2,
      youtube_url: "https://www.youtube.com/watch?v=YUoquCDRSvE&t=1s",
    };
  }

  return {
    id: topicId,
    program_id: "1",
    episode: 2,
    round: "파이널",
    title: "우승자는 누구?",
    participants: ["최강록", "요리괴물", "술빚는 윤주모", "후덕죽"],
    participants_imgs: [
      "/images/participants/chk.jpg",
      "/images/participants/monster.jpg",
      "/images/participants/yjm.jpg",
      "/images/participants/hdj.jpg",
    ],
    created_at: "2026-01-25T10:00:00.000Z",
    vote_type: 4,
    youtube_url: "https://www.youtube.com/watch?v=YUoquCDRSvE&t=1s",
  };
}

function toEmbedUrl(youtubeUrl: string) {
  try {
    const u = new URL(youtubeUrl);

    if (u.pathname.startsWith("/embed/")) return youtubeUrl;

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }

    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;

    return youtubeUrl;
  } catch {
    return youtubeUrl;
  }
}

function buildOptions(detail: TopicDetail): VoteOption[] {
  // ✅ type1: 참가자 1명에 대한 합격/불합격
  if (detail.vote_type === 1) {
    const targetName = detail.participants?.[0] ?? "참가자";
    const targetImg = detail.participants_imgs?.[0] ?? "";

    return [
      { key: "PASS", label: "합격", sub: targetName, img: targetImg },
      { key: "FAIL", label: "불합격", sub: targetName, img: targetImg },
    ];
  }

  // ✅ type2~n: 참가자 n명 중 1명 선택
  return (detail.participants ?? []).map((name, idx) => ({
    key: String(idx),
    label: name,
    img: detail.participants_imgs?.[idx] ?? "",
  }));
}

export default function Vote() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topicId = params.get("topic_id") ?? "";

  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!topicId) return;
    let alive = true;

    // topicId 바뀌면 초기화 (UX 깔끔하게)
    setDetail(null);
    setError(null);
    setSelected(null);

    fetchTopicDetail(topicId)
      .then((data) => {
        if (!alive) return;
        setDetail(data);
      })
      .catch(() => {
        if (!alive) return;
        setError("failed");
      });

    return () => {
      alive = false;
    };
  }, [topicId]);

  const loading = !!topicId && !detail && !error;
  const embedUrl = detail ? toEmbedUrl(detail.youtube_url) : "";

  const options = useMemo(() => {
    if (!detail) return [];
    return buildOptions(detail);
  }, [detail]);

  const gridColsClass = useMemo(() => {
    // 모바일은 1열 고정, 태블릿부터 옵션 수에 따라 2~3열
    // 클래스는 SCSS에서 처리
    const n = options.length;
    if (n <= 1) return "vote__grid--1";
    if (n === 2) return "vote__grid--2";
    return "vote__grid--3";
  }, [options.length]);

  const canSubmit = selected !== null && options[selected];

  const onSubmit = () => {
    if (!detail || selected === null) return;
    const choice = options[selected];
    if (!choice) return;

    // ✅ 나중에 여기서 POST 투표 요청
    // 지금은 결과 페이지로 이동만
    const sp = new URLSearchParams({
      topic_id: detail.id,
      choice_key: choice.key, // PASS/FAIL 또는 "0","1","2"...
    });
    navigate(`/result?${sp.toString()}`);
  };

  if (!topicId) {
    return (
      <div className="vote">
        <header className="vote__header">
          <button
            className="vote__back"
            onClick={() => navigate(-1)}
            type="button"
          >
            ← 뒤로
          </button>
          <div className="vote__brand" onClick={() => navigate("/")}>
            your pick
          </div>
        </header>

        <main className="vote__main">
          <div className="vote__message">
            topic_id가 없어요. 주제 선택에서 투표로 들어와주세요.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="vote">
      <header className="vote__header">
        <button
          className="vote__back"
          onClick={() => navigate(-1)}
          type="button"
        >
          ← 뒤로
        </button>
        <div className="vote__brand" onClick={() => navigate("/")}>
          Your Pick
        </div>
      </header>

      <main className="vote__main">
        {loading && (
          <div className="vote__message">주제 정보를 불러오는 중…</div>
        )}

        {error && (
          <div className="vote__message">
            주제 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </div>
        )}

        {detail && (
          <>
            <section className="vote__meta">
              <div className="vote__chips">
                <span className="vote__chip">{detail.episode}회차</span>
                <span className="vote__chip">{detail.round}</span>
                {/* <span className="vote__chip">type {detail.vote_type}</span> */}
              </div>

              <h1 className="vote__title">{detail.title}</h1>
              <p className="vote__desc">
                영상 확인 후 아래에서 하나를 선택해 투표하세요.
              </p>
            </section>

            <section className="vote__video">
              {embedUrl ? (
                <div className="vote__videoFrame">
                  <iframe
                    src={embedUrl}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="vote__message">유튜브 링크가 없어요.</div>
              )}
            </section>

            <section className="vote__panel">
              <div className="vote__panelHead">
                <h2 className="vote__panelTitle">투표하기</h2>
                <span className="vote__panelHint">한 가지만 선택 가능</span>
              </div>

              <div className={`vote__grid ${gridColsClass}`}>
                {options.map((opt, idx) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`pick-card ${selected === idx ? "is-selected" : ""}`}
                    onClick={() => setSelected(idx)}
                  >
                    <div className="pick-card__thumb">
                      {opt.img ? (
                        <img
                          src={opt.img}
                          alt={`${opt.label} 이미지`}
                          className="pick-card__img"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                            e.currentTarget.parentElement?.classList.add(
                              "pick-card__thumb--fallback",
                            );
                          }}
                        />
                      ) : null}
                      <div className="pick-card__overlay" />
                    </div>

                    <div className="pick-card__body">
                      <div className="pick-card__name">{opt.label}</div>
                      {opt.sub ? (
                        <div className="pick-card__sub">{opt.sub}</div>
                      ) : null}
                      <div className="pick-card__select">
                        {selected === idx ? "선택됨" : "선택하기"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="vote__actions">
                <button
                  type="button"
                  className={`vote__submit ${canSubmit ? "" : "is-disabled"}`}
                  onClick={onSubmit}
                  disabled={!canSubmit}
                >
                  투표하기
                </button>

                <div className="vote__notice">
                  * 실제 투표 제출 API 연결 전이라 결과 페이지로 이동만 합니다.
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
