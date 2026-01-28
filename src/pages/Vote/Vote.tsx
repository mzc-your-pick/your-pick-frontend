import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Vote.scss";

type ParticipantImage = {
  id: number;
  participant_name: string;
  image_url: string;
};

type TopicDetailApi = {
  id: number;
  program_id: number;
  topic_title: string;
  episode: number;
  match_type: string;
  participants: string[];
  video_url: string | null;
  vote_type: number; // 1=합/불, 2=2명, 3=3명 이상 다인원
  actual_result: number | null;
  created_at: string;
  participant_images: ParticipantImage[];
};

type VoteOption = {
  key: string; // 화면/디버그용 키 (PASS/FAIL 또는 "0","1"...)
  label: string;
  sub?: string;
  img?: string;
  vote_choice: number; // ✅ 서버로 보낼 값 (전부 1-based 규칙)
};

type VoteResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    topic_id: number;
    vote_choice: number;
    voted_at: string;
  };
};

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

function getImageForName(
  participant_images: ParticipantImage[] | undefined,
  name: string,
) {
  const list = Array.isArray(participant_images) ? participant_images : [];
  const found = list.find((x) => x.participant_name === name);
  return found?.image_url ?? "";
}

function buildOptions(detail: TopicDetailApi): VoteOption[] {
  const participants = Array.isArray(detail.participants)
    ? detail.participants
    : [];
  const imgs = Array.isArray(detail.participant_images)
    ? detail.participant_images
    : [];

  // ✅ vote_type=1: 1=합격, 2=불합격
  if (detail.vote_type === 1) {
    const targetName = participants[0] ?? "참가자";
    const targetImg = getImageForName(imgs, targetName);

    return [
      {
        key: "PASS",
        label: "합격",
        sub: targetName,
        img: targetImg,
        vote_choice: 1,
      },
      {
        key: "FAIL",
        label: "불합격",
        sub: targetName,
        img: targetImg,
        vote_choice: 2,
      },
    ];
  }

  // ✅ vote_type=2 또는 vote_type=3(다인원): 1=1번 참가자, 2=2번 참가자, ...
  return participants.map((name, idx) => ({
    key: String(idx),
    label: name,
    img: getImageForName(imgs, name),
    vote_choice: idx + 1, // ✅ 1-based
  }));
}

export default function Vote() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topicIdParam = params.get("topic_id") ?? "";
  const topicId = Number(topicIdParam);

  const hasValidTopicId = Number.isFinite(topicId) && topicId > 0;

  const [detail, setDetail] = useState<TopicDetailApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<number | null>(null);

  // 투표 제출 상태
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasValidTopicId) return;
    let alive = true;

    // topicId 바뀌면 초기화
    setDetail(null);
    setError(null);
    setSelected(null);
    setSubmitting(false);
    setSubmitError(null);

    fetchJson<TopicDetailApi>(`/api/v1/topics/${topicId}`)
      .then((data) => {
        if (!alive) return;

        // 최소 방어: null 가능 필드/배열
        const cleaned: TopicDetailApi = {
          ...data,
          participants: Array.isArray(data.participants)
            ? data.participants
            : [],
          participant_images: Array.isArray(data.participant_images)
            ? data.participant_images
            : [],
          video_url: data.video_url ?? null,
          actual_result:
            data.actual_result === undefined || data.actual_result === null
              ? null
              : Number(data.actual_result),
        };

        setDetail(cleaned);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "failed");
      });

    return () => {
      alive = false;
    };
  }, [hasValidTopicId, topicId]);

  const loading = hasValidTopicId && !detail && !error;

  const embedUrl = useMemo(() => {
    if (!detail?.video_url) return "";
    return toEmbedUrl(detail.video_url);
  }, [detail?.video_url]);

  const options = useMemo(() => {
    if (!detail) return [];
    return buildOptions(detail);
  }, [detail]);

  const gridColsClass = useMemo(() => {
    const n = options.length;
    if (n <= 1) return "vote__grid--1";
    if (n === 2) return "vote__grid--2";
    return "vote__grid--3";
  }, [options.length]);

  const canSubmit = !submitting && selected !== null && !!options[selected];

  const onSubmit = async () => {
    if (!detail || selected === null) return;
    const choice = options[selected];
    if (!choice) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const body = { vote_choice: choice.vote_choice };

      const res = await fetchJson<VoteResponse>(
        `/api/v1/topics/${detail.id}/votes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.success) {
        throw new Error(res.message || "투표에 실패했어요.");
      }

      // ✅ 투표 성공 후 Result로 이동
      const sp = new URLSearchParams({
        topic_id: String(detail.id),
        vote_id: String(res.data.id), // ✅ 추가 (이게 vote_id)
      });

      navigate(`/result?${sp.toString()}`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "투표에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasValidTopicId) {
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
                <span className="vote__chip">{detail.match_type}</span>
              </div>

              <h1 className="vote__topic_title">{detail.topic_title}</h1>
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
                <h2 className="vote__paneltopic_Title">투표하기</h2>
                <span className="vote__panelHint">한 가지만 선택 가능</span>
              </div>

              <div className={`vote__grid ${gridColsClass}`}>
                {options.map((opt, idx) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`pick-card ${selected === idx ? "is-selected" : ""}`}
                    onClick={() => setSelected(idx)}
                    disabled={submitting}
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
                  {submitting ? "투표 제출 중…" : "투표하기"}
                </button>

                {submitError ? (
                  <div className="vote__notice">{submitError}</div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
