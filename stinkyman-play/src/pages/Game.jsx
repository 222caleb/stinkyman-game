import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameBoard from "@/components/game/GameBoard";

export default function Game() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main menu on first load
    const hasVisited = sessionStorage.getItem("hasVisitedGame");
    if (!hasVisited) {
      sessionStorage.setItem("hasVisitedGame", "true");
      navigate(createPageUrl("MainMenu"));
    }
  }, [navigate]);

  return (
    <div className="w-full h-screen">
      <GameBoard />
    </div>
  );
}