import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Programs from "./pages/Programs/Programs";
import Topics from "./pages/Topics/Topics";
import Vote from "./pages/Vote/Vote";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/programs" element={<Programs />} />
      <Route path="/topics" element={<Topics />} />
      <Route path="/vote" element={<Vote />} />

      {/* 다음 단계에서 구현 */}
      <Route
        path="/result"
        element={<div style={{ padding: 24 }}>결과 + 댓글 페이지 (준비중)</div>}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
