import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PlayerArea from "./PlayerArea";
import PileArea from "./PileArea";
import ActionBar from "./ActionBar";
import GameMessage from "./GameMessage";
import useGameEngine from "./useGameEngine";
import useCardAnimations from "./useCardAnimations";
import FloatingCard from "./FloatingCard";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function GameBoard() {
  const navigate = useNavigate();
  const [cardTheme, setCardTheme] = React.useState("classic");
  const [isBurning, setIsBurning] = React.useState(false);
  const prevPileLength = React.useRef(0);
  const prevPhase = React.useRef("idle");

  React.useEffect(() => {
    const loadTheme = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.cardTheme) {
          setCardTheme(user.cardTheme);
        }
      } catch (error) {
        // no-op
      }
    };
    loadTheme();
  }, []);

  const {
    state,
    deal,
    selectCard,
    confirmSwap,
    playCards,
    takePile,
    sortHand,
    drawFromDeck,
    setDifficulty,
    canPlay,
    canTakePile,
  } = useGameEngine();

  const { animatingCards, animateDeal } = useCardAnimations();

  const { phase, pile, deck, player, opponent, currentTurn, selectedCardIds, message, isReversed, winner, difficulty } = state;

  // Trigger deal animation when phase transitions from idle → swap
  React.useEffect(() => {
    if (prevPhase.current === "idle" && phase === "swap") {
      setTimeout(() => {
        animateDeal(player.hand, "#player-hand-area", 0.08);
        animateDeal(player.faceUp, "#player-hand-area", 0.08);
        animateDeal(opponent.hand, "#opponent-hand-area", 0.06);
      }, 50);
    }
    prevPhase.current = phase;
  }, [phase]);

  // Trigger burn flash when pile clears after animatingBurn
  React.useEffect(() => {
    if (prevPileLength.current > 0 && pile.length === 0 && phase === "playing") {
      setIsBurning(true);
      setTimeout(() => setIsBurning(false), 600);
    }
    prevPileLength.current = pile.length;
  }, [pile.length, phase]);

  const handleBackToMenu = () => {
    navigate(createPageUrl("MainMenu"));
  };

  const handleMultiplayer = () => {
    navigate(createPageUrl("MultiplayerLobby"));
  };

  const playerCards = [...player.hand, ...player.faceUp, ...player.faceDown];
  const selectedCards = selectedCardIds.map(id => playerCards.find(c => c?.id === id)).filter(Boolean);
  const multiPlayCount = selectedCards.length > 1 ? selectedCards.length : null;

  const playerDisabled = phase !== "playing" || currentTurn !== "player";

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 overflow-hidden">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.3)_100%)]" />

      {/* Burn flash overlay */}
      <AnimatePresence>
        {isBurning && (
          <motion.div
            key="burn-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
            className="absolute inset-0 z-40 bg-orange-500 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Floating card animations */}
      {animatingCards.map((anim) => (
        <FloatingCard
          key={anim.id}
          card={anim.card}
          from={anim.from}
          to={anim.to}
          delay={anim.delay}
          type={anim.type}
        />
      ))}

      {/* Back to Menu button */}
      <button
        onClick={handleBackToMenu}
        className="absolute top-24 left-2 z-50 bg-black/20 hover:bg-black/40 text-white rounded-md p-2 transition-colors flex items-center justify-center"
      >
        <Home className="w-5 h-5 pointer-events-none" />
      </button>

      {/* Difficulty selector — only visible on idle screen */}
      {phase === "idle" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-black/20 rounded-lg p-1">
          {["easy", "medium", "hard"].map(level => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                difficulty === level
                  ? "bg-yellow-500 text-gray-900"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {/* Reverse indicator */}
      <AnimatePresence>
        {isReversed && phase === "playing" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-2 right-2 z-20 bg-red-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full"
          >
            ⬇ REVERSE
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {phase === "gameOver" && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/60 flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20"
            >
              <h2 className="text-3xl font-bold text-white mb-2">
                {winner === "player" ? "🎉 You Win!" : "😞 You Lose"}
              </h2>
              <p className="text-white/70 mb-6">
                {winner === "player" ? "Congratulations!" : "Better luck next time!"}
              </p>
              <Button
                onClick={deal}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold px-8 py-3 rounded-xl h-auto gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main game layout */}
      <div className="relative z-10 flex flex-col flex-1 justify-between py-3 px-2 pb-28 max-w-lg mx-auto w-full">
        {/* Opponent Area */}
        <PlayerArea
          name="Opponent"
          isOpponent
          hand={opponent.hand}
          faceUp={opponent.faceUp}
          faceDown={opponent.faceDown}
          isCurrentTurn={currentTurn === "opponent" && phase === "playing"}
          disabled
          hideHand
          theme={cardTheme}
        />

        {/* Center: Message + Pile */}
        <div className="flex flex-col items-center gap-2 my-2">
          <GameMessage message={message} />
          <div className="relative">
            <PileArea
              pile={pile}
              deckCount={deck.length}
              onDeckClick={drawFromDeck}
              deckClickable={phase === "playing" && currentTurn === "player" && deck.length > 0}
              onPileClick={takePile}
              pileClickable={phase === "playing" && currentTurn === "player" && pile.length > 0 && !canPlay}
            />
            {/* Multi-play indicator */}
            {multiPlayCount && phase === "playing" && currentTurn === "player" && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                ×{multiPlayCount}
              </div>
            )}
          </div>
        </div>

        {/* Player Area */}
        <PlayerArea
          name="You"
          isOpponent={false}
          hand={player.hand}
          faceUp={player.faceUp}
          faceDown={player.faceDown}
          selectedIds={selectedCardIds}
          onCardClick={selectCard}
          isCurrentTurn={currentTurn === "player" && phase === "playing"}
          disabled={phase === "swap" ? false : playerDisabled}
          theme={cardTheme}
        />
      </div>

      {/* Action Bar - Fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-emerald-950 via-emerald-900/95 to-transparent pb-safe">
        <ActionBar
          phase={phase}
          canPlay={canPlay}
          selectedCount={selectedCardIds.length}
          onPlay={playCards}
          onConfirmSwap={confirmSwap}
          onDeal={deal}
          onMultiplayer={handleMultiplayer}
        />
      </div>
    </div>
  );
}
