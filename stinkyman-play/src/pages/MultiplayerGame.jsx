import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { createPageUrl } from "@/utils";
import PlayerArea from "@/components/game/PlayerArea";
import PileArea from "@/components/game/PileArea";
import ActionBar from "@/components/game/ActionBar";
import GameMessage from "@/components/game/GameMessage";
import useMultiplayerGameEngine from "@/components/multiplayer/useMultiplayerGameEngine";
import useReconnect from "@/components/multiplayer/useReconnect";
import ChatPanel from "@/components/multiplayer/ChatPanel";

function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const cards = [];
  let id = 0;
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      cards.push({ id: id++, suit, rank });
    }
  }
  return shuffle(cards);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MultiplayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerId, playerName } = location.state || {};
  const { saveReconnectData, clearReconnectData } = useReconnect();

  const {
    gameState,
    myState,
    selectedCardIds,
    message,
    selectCard,
    confirmSwap,
    playCards,
    takePile,
    canPlay,
    canTakePile,
  } = useMultiplayerGameEngine(roomCode, playerId);

  useEffect(() => {
    if (!roomCode) return;

    // Save reconnect data when entering game
    saveReconnectData(roomCode, playerId, playerName, roomCode);

    return () => {
      // Clear reconnect data when game ends
      if (gameState?.phase === "gameOver") {
        clearReconnectData();
      }
    };
  }, [roomCode, gameState?.phase]);

  if (!gameState || !myState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-lg mb-2">Initializing game...</div>
          <div className="text-sm text-white/60">Room: {roomCode}</div>
        </div>
      </div>
    );
  }

  const opponentIds = Object.keys(gameState.players).filter(id => id !== playerId);
  const opponents = opponentIds.map(id => ({
    id,
    ...gameState.players[id]
  }));

  const isMyTurn = gameState.currentTurn === playerId;
  const isSwapPhaseAndReady = gameState.phase === "swap" && myState?.swapReady;
  const disabled = isSwapPhaseAndReady || (gameState.phase === "playing" && !isMyTurn) || gameState.phase === "gameOver";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 relative overflow-hidden">
      {/* Home Button */}
      <Button
        onClick={() => navigate(createPageUrl("MainMenu"))}
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-white hover:bg-white/10 z-50"
      >
        <Home className="w-5 h-5" />
      </Button>

      {/* Room Code */}
      <div className="absolute top-4 right-4 bg-black/20 rounded-lg px-3 py-1.5 z-10">
        <p className="text-white/80 text-xs">Room: <span className="font-bold text-yellow-400">{roomCode}</span></p>
      </div>

      {/* Reverse Indicator */}
      {gameState.isReversed && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-blue-500/20 border-2 border-blue-400 rounded-lg px-4 py-2 z-10">
          <p className="text-blue-300 font-bold text-sm">⬇ REVERSE MODE</p>
        </div>
      )}

      {/* Main Game Area */}
      <div className="w-full h-screen flex flex-col items-center justify-between py-6 px-4">
        {/* Opponents Area */}
        {opponents.length > 0 && (
          <div className="w-full max-w-6xl">
            <div className={`grid gap-4 ${opponents.length <= 2 ? 'grid-cols-2' : opponents.length <= 3 ? 'grid-cols-3' : 'grid-cols-3'}`}>
              {opponents.map((opp) => (
                <div key={opp.id} className="flex justify-center">
                  <div className="scale-75">
                    <PlayerArea
                      isOpponent
                      name={opp.name}
                      hand={opp.hand}
                      faceUp={opp.faceUp}
                      faceDown={opp.faceDown}
                      selectedIds={[]}
                      onCardClick={() => {}}
                      disabled={true}
                      hideHand={true}
                      isCurrentTurn={gameState.currentTurn === opp.id}
                      isReady={opp.swapReady}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center Pile Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <GameMessage message={message} />
          <PileArea
            pile={gameState.pile}
            deckCount={gameState.deck?.length || 0}
            deckClickable={false}
            pileClickable={canTakePile}
            onPileClick={takePile}
          />
        </div>

        {/* Player Area */}
        <div className="w-full max-w-6xl">
          <PlayerArea
            isOpponent={false}
            name={playerName}
            hand={myState.hand}
            faceUp={myState.faceUp}
            faceDown={myState.faceDown}
            selectedIds={selectedCardIds}
            onCardClick={selectCard}
            disabled={disabled}
            hideHand={false}
            isCurrentTurn={isMyTurn}
            isReady={myState.swapReady}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <ActionBar
          phase={gameState.phase}
          onDeal={() => {}}
          onMultiplayer={() => {}}
          onConfirmSwap={confirmSwap}
          onPlay={playCards}
          canPlay={canPlay}
          selectedCount={selectedCardIds.length}
          isReady={myState?.swapReady}
        />
      </div>

      {/* Chat Panel */}
      <ChatPanel roomCode={roomCode} playerName={playerName} />

      {/* Game Over Overlay */}
      {gameState.phase === "gameOver" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border-2 border-white/20">
            <h2 className="text-4xl font-bold text-white mb-4">
              {gameState.winner === playerId ? "🎉 You Win!" : "😞 You Lose"}
            </h2>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Rematch logic - reset game state
                  const deck = createDeck();
                  let idx = 0;
                  const playerStates = {};
                  Object.keys(gameState.players).forEach(pid => {
                    playerStates[pid] = {
                      name: gameState.players[pid].name,
                      hand: deck.slice(idx, idx + 3),
                      faceUp: deck.slice(idx + 3, idx + 6),
                      faceDown: deck.slice(idx + 6, idx + 9),
                      swapReady: false,
                    };
                    idx += 9;
                  });

                  const newGameState = {
                    phase: "swap",
                    deck: deck.slice(idx),
                    pile: [],
                    players: playerStates,
                    currentTurn: Object.keys(gameState.players)[0],
                    isReversed: false,
                    winner: null,
                    customMessage: null,
                  };

                  base44.entities.GameRoom.update(roomId, {
                    status: "playing",
                    gameState: newGameState
                  });
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold"
              >
                Rematch
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("MainMenu"))}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Back to Menu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}