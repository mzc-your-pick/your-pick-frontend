import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Programs from "./pages/Programs/Programs";
import Topics from "./pages/Topics/Topics";
import Vote from "./pages/Vote/Vote";
import Result from "./pages/Result/Result";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/programs" element={<Programs />} />
      <Route path="/topics" element={<Topics />} />
      <Route path="/vote" element={<Vote />} />
      <Route path="/result" element={<Result />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
