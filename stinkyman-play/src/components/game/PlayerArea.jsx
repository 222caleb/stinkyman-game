import React from "react";
import CardRow from "./CardRow";
import HandArea from "./HandArea";
import { User, Bot, CheckCircle } from "lucide-react";

export default function PlayerArea({
  name,
  isOpponent,
  hand,
  faceUp,
  faceDown,
  selectedIds,
  onCardClick,
  isCurrentTurn,
  disabled,
  hideHand,
  isReady,
  theme = "classic"
}) {
  const avatar = isOpponent ? (
    <div className="flex items-center gap-2">
      {isReady && <CheckCircle className="w-5 h-5 text-green-400" />}
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
        <Bot className="w-4 h-4 text-white/80" />
      </div>
      <span className={`text-sm font-semibold ${isCurrentTurn ? "text-yellow-300" : "text-white/70"}`}>{name}</span>
      {isCurrentTurn && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {isReady && <CheckCircle className="w-5 h-5 text-green-400" />}
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
        <User className="w-4 h-4 text-white/80" />
      </div>
      <span className={`text-sm font-semibold ${isCurrentTurn ? "text-yellow-300" : "text-white/70"}`}>{name}</span>
      {isCurrentTurn && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
    </div>
  );

  if (isOpponent) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div id="opponent-hand-area" className="mt-2">
          <CardRow cards={hand} faceDown={hideHand} small disabled stagger theme={theme} />
        </div>
        {/* Overlaid face-up and face-down */}
        <div className="relative mt-4">
          <CardRow cards={faceDown} faceDown small disabled overlap={false} stagger theme={theme} />
          <div className="absolute -top-6 z-10">
            <CardRow cards={faceUp} selectedIds={[]} small disabled overlap={false} stagger theme={theme} />
          </div>
        </div>
        {avatar}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {avatar}
      {/* Overlaid face-down and face-up cards */}
      <div className="relative">
        <CardRow cards={faceDown} faceDown disabled={disabled} overlap={false} onCardClick={onCardClick} stagger theme={theme} />
        <div className="absolute -bottom-6">
          <CardRow cards={faceUp} selectedIds={selectedIds} disabled={disabled} overlap={false} onCardClick={onCardClick} stagger theme={theme} />
        </div>
      </div>
      {/* Hand with proper spacing and expansion controls */}
      <div id="player-hand-area" className="mt-6">
        <HandArea cards={hand} selectedIds={selectedIds} onCardClick={onCardClick} disabled={disabled} theme={theme} />
      </div>
    </div>
  );
}