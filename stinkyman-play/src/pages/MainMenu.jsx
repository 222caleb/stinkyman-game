import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Users, BookOpen, User, Trophy } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function MainMenu() {
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = React.useState(null);

  const handleSinglePlayer = () => {
    navigate(createPageUrl("Game"));
  };

  const handleMultiplayer = () => {
    navigate(createPageUrl("MultiplayerLobby"));
  };

  const handleRules = () => {
    navigate(createPageUrl("Rules"));
  };

  const handleProfile = () => {
    navigate(createPageUrl("Profile"));
  };

  const handleLeaderboard = () => {
    navigate(createPageUrl("Leaderboard"));
  };

  const getFooterMessage = () => {
    switch (hoveredButton) {
      case "singleplayer":
        return "Play against an AI opponent";
      case "multiplayer":
        return "Challenge a friend";
      case "rules":
        return "Read the full game rules";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-6">
      {/* Leaderboard Icon */}
      <Button
        onClick={handleLeaderboard}
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-white hover:bg-white/10 w-12 h-12"
      >
        <Trophy className="w-6 h-6" />
      </Button>

      {/* Profile Icon */}
      <Button
        onClick={handleProfile}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10 w-12 h-12"
      >
        <User className="w-6 h-6" />
      </Button>

      {/* Logo */}
      <div className="mb-8 text-center">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a96bb063ed915c9165ce7/aaefd084c_stinkymanlogo.png"
          alt="Stinky Man Logo"
          className="w-48 h-48 mx-auto object-cover drop-shadow-2xl"
        />
      </div>

      {/* Menu Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button
          onClick={handleSinglePlayer}
          onMouseEnter={() => setHoveredButton("singleplayer")}
          onMouseLeave={() => setHoveredButton(null)}
          className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold text-lg px-8 py-6 rounded-xl shadow-lg shadow-yellow-500/30 h-auto gap-3"
        >
          <Play className="w-6 h-6" />
          Single Player
        </Button>

        <Button
          onClick={handleMultiplayer}
          onMouseEnter={() => setHoveredButton("multiplayer")}
          onMouseLeave={() => setHoveredButton(null)}
          variant="outline"
          className="border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50 font-semibold text-lg px-8 py-6 rounded-xl h-auto bg-transparent gap-3"
        >
          <Users className="w-6 h-6" />
          Multiplayer
        </Button>

        <Button
          onClick={handleRules}
          onMouseEnter={() => setHoveredButton("rules")}
          onMouseLeave={() => setHoveredButton(null)}
          variant="outline"
          className="border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50 font-semibold text-lg px-8 py-6 rounded-xl h-auto bg-transparent gap-3"
        >
          <BookOpen className="w-6 h-6" />
          How to Play
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-16 text-white/40 text-xs text-center min-h-[16px]">
        {getFooterMessage() && <p>{getFooterMessage()}</p>}
      </div>
    </div>
  );
}