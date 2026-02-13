import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Leaderboard() {
  const navigate = useNavigate();

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const allStats = await base44.entities.GameStats.list("-winRate", 100);
      return allStats.filter(s => s.gamesPlayed > 0);
    }
  });

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-white/60 font-bold">{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate(createPageUrl("MainMenu"))}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        </div>

        {isLoading ? (
          <div className="text-center text-white/60 py-12">Loading...</div>
        ) : stats.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
            <p className="text-white/60 text-center">No stats yet. Play some games!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {stats.map((stat, index) => (
              <Card
                key={stat.id}
                className={`bg-white/10 backdrop-blur-sm border-white/20 p-4 ${
                  index < 3 ? 'border-2 border-yellow-400/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {stat.playerName || "Unknown"}
                      </p>
                      <p className="text-white/60 text-sm">
                        {stat.gamesPlayed} games played
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">
                      {Math.round(stat.winRate)}%
                    </p>
                    <p className="text-white/60 text-sm">
                      {stat.gamesWon}W / {stat.gamesLost}L
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}