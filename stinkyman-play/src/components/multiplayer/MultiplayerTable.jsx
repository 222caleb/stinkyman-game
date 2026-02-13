import React from "react";
import { User } from "lucide-react";
import CardRow from "../game/CardRow";

export default function MultiplayerTable({ players, currentPlayerId, gameState }) {
  const playerCount = players.length;
  
  // Position players around the table
  const getPlayerPosition = (index, isCurrentPlayer) => {
    if (isCurrentPlayer) {
      return "bottom-8 left-1/2 -translate-x-1/2"; // Bottom center
    }
    
    if (playerCount === 2) {
      return "top-8 left-1/2 -translate-x-1/2"; // Top center for 2 players
    }
    
    // Additional positions for 3-6 players
    const positions = [
      "top-8 left-1/4 -translate-x-1/2",
      "top-8 right-1/4 translate-x-1/2",
      "left-8 top-1/2 -translate-y-1/2",
      "right-8 top-1/2 -translate-y-1/2",
    ];
    return positions[(index - 1) % positions.length];
  };

  const renderPlayer = (player, index) => {
    const isCurrentPlayer = player.playerId === currentPlayerId;
    const position = getPlayerPosition(index, isCurrentPlayer);
    
    // Mock data - replace with actual game state later
    const hand = Array(3).fill(null).map((_, i) => ({ id: `hand-${i}`, rank: 10, suit: "♥" }));
    const faceUp = Array(3).fill(null).map((_, i) => ({ id: `up-${i}`, rank: 8, suit: "♠" }));
    const faceDown = Array(3).fill(null).map((_, i) => ({ id: `down-${i}` }));

    return (
      <div key={player.playerId} className={`absolute ${position}`}>
        <div className="flex flex-col items-center gap-2">
          {!isCurrentPlayer ? (
            <>
              {/* Opponent name tag */}
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1 border border-white/20">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-white/80" />
                </div>
                <span className="text-sm font-semibold text-white">{player.playerName}</span>
              </div>
              
              {/* Opponent hand (face down) */}
              <div className="mt-2">
                <CardRow cards={hand} faceDown small disabled stagger />
              </div>
              
              {/* Opponent face-up and face-down cards */}
              <div className="relative mt-4">
                <CardRow cards={faceDown} faceDown small disabled overlap={false} stagger />
                <div className="absolute -top-6 z-10">
                  <CardRow cards={faceUp} selectedIds={[]} small disabled overlap={false} stagger />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Current player face-down and face-up cards */}
              <div className="relative">
                <CardRow cards={faceDown} faceDown disabled={false} overlap={false} stagger />
                <div className="absolute -bottom-6">
                  <CardRow cards={faceUp} selectedIds={[]} disabled={false} overlap={false} stagger />
                </div>
              </div>
              
              {/* Current player hand */}
              <div className="mt-6">
                <CardRow cards={hand} selectedIds={[]} disabled={false} overlap={false} stagger />
              </div>
              
              {/* Current player name tag */}
              <div className="flex items-center gap-2 bg-yellow-500/20 rounded-lg px-3 py-1 border-2 border-yellow-500/40 mt-2">
                <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center">
                  <User className="w-3 h-3 text-yellow-300" />
                </div>
                <span className="text-sm font-semibold text-yellow-300">{player.playerName} (You)</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Central pile area */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex gap-8 items-center">
          {/* Deck */}
          <div className="relative">
            <div className="w-24 h-36 rounded-xl border-2 border-white/20 bg-red-900/40 flex items-center justify-center">
              <span className="text-white/60 text-xs">DECK</span>
            </div>
          </div>
          
          {/* Discard Pile */}
          <div className="relative">
            <div className="w-24 h-36 rounded-xl border-2 border-white/20 bg-white/10 flex items-center justify-center">
              <span className="text-white/60 text-xs">PILE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Players around the table */}
      {players.map((player, index) => renderPlayer(player, index))}
    </div>
  );
}