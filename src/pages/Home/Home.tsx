import { useNavigate } from "react-router-dom";
import "./Home.scss";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__logo">YP</div>
      </header>

      <main className="home__main">
        <h1 className="home__title">
          서바이벌 프로그램의 민심을 확인해보세요!
        </h1>

        <p className="home__desc">
          패널의 선택과 대중의 선택을 비교하고, 투표와 토론을 통해 결과를
          확인해보세요.
        </p>

        <div className="home__cta">
          <button
            className="home__button"
            onClick={() => navigate("/programs")}
          >
            투표하러가기
          </button>

          <span className="home__hint">PC · 모바일 모두 지원</span>
        </div>
      </main>

      <footer className="home__footer">
        © {new Date().getFullYear()} your pick
      </footer>
    </div>
  );
}
