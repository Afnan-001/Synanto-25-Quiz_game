import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EnterName from "./enterName";
import GamePage from "./GamePage";
import AdminToggle from "./AdminToggle";
import Leaderboard from "./Leaderboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnterName />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/admin" element={<AdminToggle />} />
        <Route path="/leaderboard" element={<Leaderboard/>} />
      </Routes>
    </BrowserRouter>
  );
}
