import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Wifi, WifiOff } from "lucide-react";
import { createPageUrl } from "@/utils";
import PlayerArea from "@/components/game/PlayerArea";
import PileArea from "@/components/game/PileArea";
import ActionBar from "@/components/game/ActionBar";
import GameMessage from "@/components/game/GameMessage";
import useMultiplayerGameEngine from "@/components/multiplayer/useMultiplayerGameEngine";
import useReconnect from "@/components/multiplayer/useReconnect";
import ChatPanel from "@/components/multiplayer/ChatPanel";
import { useSocket } from "@/components/multiplayer/SocketContext";

const DISCONNECT_TIMEOUT = 30;

export default function MultiplayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerId, playerName, isSpectator } = location.state || {};
  const { saveReconnectData, clearReconnectData } = useReconnect();
  const { socket, connected } = useSocket();

  const [disconnectedPlayer, setDisconnectedPlayer] = useState(null);
  const [disconnectTimer, setDisconnectTimer] = useState(DISCONNECT_TIMEOUT);
  const timerRef = useRef(null);

  const {
    gameState,
    myState,
    selectedCardIds,
    message,
    selectCard,
    confirmSwap,
    playCards,
    takePile,
    drawFromDeck,
    requestRematch,
    canPlay,
    canTakePile,
    canDrawFromDeck,
    myRematchRequested,
  } = useMultiplayerGameEngine(roomCode, isSpectator ? null : playerId);

  // Redirect to lobby if no room state (hard refresh)
  useEffect(() => {
    if (!roomCode) {
      navigate(createPageUrl("MultiplayerLobby"), { replace: true });
    }
  }, [roomCode, navigate]);

  // Save reconnect data (non-spectators only)
  useEffect(() => {
    if (!roomCode || isSpectator) return;
    saveReconnectData(roomCode, playerId, playerName, roomCode);
    return () => {
      if (gameState?.phase === "gameOver") clearReconnectData();
    };
  }, [roomCode, gameState?.phase]);

  // Listen for disconnect / reconnect / AI replacement events
  useEffect(() => {
    if (!socket || !roomCode) return;

    const handleDisconnected = ({ playerId: dcId, playerName: dcName }) => {
      if (dcId === playerId) return; // my own disconnect
      setDisconnectedPlayer({ id: dcId, name: dcName });
      setDisconnectTimer(DISCONNECT_TIMEOUT);
    };

    const handleReconnected = ({ playerId: rcId }) => {
      if (rcId !== playerId) {
        setDisconnectedPlayer(null);
        clearInterval(timerRef.current);
      }
    };

    const handleReplacedByAI = () => {
      setDisconnectedPlayer(null);
      clearInterval(timerRef.current);
    };

    socket.on('playerDisconnected', handleDisconnected);
    socket.on('playerReconnected', handleReconnected);
    socket.on('playerReplacedByAI', handleReplacedByAI);

    return () => {
      socket.off('playerDisconnected', handleDisconnected);
      socket.off('playerReconnected', handleReconnected);
      socket.off('playerReplacedByAI', handleReplacedByAI);
    };
  }, [socket, roomCode, playerId]);

  // Disconnect countdown timer
  useEffect(() => {
    if (!disconnectedPlayer) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setDisconnectTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [disconnectedPlayer]);

  if (!roomCode || !gameState || (!myState && !isSpectator)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-lg mb-2">{isSpectator ? "Loading game..." : "Initializing game..."}</div>
          {roomCode && <div className="text-sm text-white/60">Room: {roomCode}</div>}
        </div>
      </div>
    );
  }

  const allPlayerIds = gameState ? Object.keys(gameState.players) : [];
  const opponentIds = allPlayerIds.filter(id => id !== playerId);
  const opponents = opponentIds.map(id => ({ id, ...gameState.players[id] }));

  const isMyTurn = gameState.currentTurn === playerId;
  const isSwapPhaseAndReady = gameState.phase === "swap" && myState?.swapReady;
  const disabled = isSpectator || isSwapPhaseAndReady || (gameState.phase === "playing" && !isMyTurn) || gameState.phase === "gameOver";

  // For spectator: show all players
  const spectatorPlayers = isSpectator ? allPlayerIds.map(id => ({ id, ...gameState.players[id] })) : null;

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

      {/* Room Code + Connection Status */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {isSpectator && (
          <span className="bg-purple-600/80 text-white text-xs font-bold px-2 py-1 rounded-lg">
            Spectating
          </span>
        )}
        <div className="bg-black/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <p className="text-white/80 text-xs">
            Room: <span className="font-bold text-yellow-400">{roomCode}</span>
          </p>
          {connected
            ? <Wifi className="w-3 h-3 text-green-400" />
            : <WifiOff className="w-3 h-3 text-red-400 animate-pulse" />
          }
        </div>
      </div>

      {/* Disconnect Banner */}
      {disconnectedPlayer && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/20 border border-yellow-400/40 rounded-xl px-4 py-2 text-center">
          <p className="text-yellow-300 text-sm font-semibold">
            {disconnectedPlayer.name} disconnected
          </p>
          <p className="text-white/60 text-xs">
            {disconnectTimer > 0
              ? `Waiting for reconnect... ${disconnectTimer}s`
              : "Player removed from game"}
          </p>
        </div>
      )}

      {/* Reverse Indicator */}
      {gameState.isReversed && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-blue-500/20 border-2 border-blue-400 rounded-lg px-4 py-2 z-10">
          <p className="text-blue-300 font-bold text-sm">⬇ REVERSE MODE</p>
        </div>
      )}

      {/* Main Game Area */}
      <div className="w-full h-screen flex flex-col items-center justify-between py-6 px-4">
        {/* Opponents / Spectator all-players view */}
        {isSpectator ? (
          <div className="w-full max-w-6xl">
            <div className={`grid gap-4 ${spectatorPlayers.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {spectatorPlayers.map((p) => (
                <div key={p.id} className="flex justify-center">
                  <div className="scale-75">
                    <PlayerArea
                      isOpponent
                      name={p.name}
                      hand={p.hand}
                      faceUp={p.faceUp}
                      faceDown={p.faceDown}
                      selectedIds={[]}
                      onCardClick={() => {}}
                      disabled={true}
                      hideHand={true}
                      isCurrentTurn={gameState.currentTurn === p.id}
                      isReady={p.swapReady}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          opponents.length > 0 && (
            <div className="w-full max-w-6xl">
              <div className={`grid gap-4 ${opponents.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
          )
        )}

        {/* Center Pile Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <GameMessage message={message} />
          <PileArea
            pile={gameState.pile}
            deckCount={gameState.deck?.length || 0}
            onDeckClick={drawFromDeck}
            deckClickable={!isSpectator && canDrawFromDeck}
            pileClickable={!isSpectator && canTakePile}
            onPileClick={takePile}
          />
        </div>

        {/* Player Area (non-spectators only) */}
        {!isSpectator && myState && (
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
        )}
      </div>

      {/* Action Bar (non-spectators only) */}
      {!isSpectator && (
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
      )}

      {/* Chat Panel */}
      <ChatPanel roomCode={roomCode} playerName={playerName} />

      {/* Game Over Overlay */}
      {gameState.phase === "gameOver" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border-2 border-white/20">
            <h2 className="text-4xl font-bold text-white mb-2">
              {isSpectator
                ? `${gameState.players[gameState.winner]?.name || "Someone"} Wins!`
                : gameState.winner === playerId ? "🎉 You Win!" : "😞 You Lose"}
            </h2>

            {!isSpectator && (
              <p className="text-white/60 text-sm mb-6">
                {myRematchRequested
                  ? "Waiting for opponent to rematch..."
                  : "Want to play again?"}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {!isSpectator && (
                <Button
                  onClick={requestRematch}
                  disabled={myRematchRequested}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold disabled:opacity-60"
                >
                  {myRematchRequested ? "⏳ Waiting for rematch..." : "🔄 Rematch"}
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("MultiplayerLobby"))}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold"
              >
                New Game
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("MainMenu"))}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold"
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
