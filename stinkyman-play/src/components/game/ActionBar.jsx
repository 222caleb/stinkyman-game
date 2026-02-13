import React from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function ActionBar({
  phase,
  canPlay,
  selectedCount,
  onPlay,
  onConfirmSwap,
  onDeal,
  onMultiplayer,
  isReady
}) {
  if (phase === "idle") {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-4">
        <Button
          onClick={onDeal}
          className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold text-lg px-10 py-4 rounded-xl shadow-lg shadow-yellow-500/30 h-auto"
        >
          DEAL
        </Button>
        <Button
          onClick={onMultiplayer}
          variant="outline"
          className="border-white/30 text-white/80 hover:bg-white/10 hover:text-white rounded-xl px-8 py-4 h-auto bg-transparent"
        >
          Multiplayer
        </Button>
      </div>
    );
  }

  if (phase === "swap" && !isReady) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-4">
        <Button
          onClick={onConfirmSwap}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold px-6 py-2 rounded-xl shadow-lg h-auto text-sm"
        >
          Ready!
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={onPlay}
        disabled={!canPlay}
        className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold px-6 py-2 rounded-lg shadow-lg disabled:opacity-40 h-auto gap-2 text-sm"
      >
        <Play className="w-3 h-3" />
        Play{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </Button>
    </div>
  );
}