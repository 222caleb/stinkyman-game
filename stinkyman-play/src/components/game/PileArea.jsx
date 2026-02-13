import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";

export default function PileArea({ pile, deckCount, onDeckClick, deckClickable, onPileClick, pileClickable }) {
  const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
  const secondCard = pile.length > 1 ? pile[pile.length - 2] : null;

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Deck */}
      <div className="relative">
        {deckCount > 0 ? (
          <div
            id="deck-area"
            onClick={deckClickable ? onDeckClick : undefined}
            className={deckClickable ? "cursor-pointer" : ""}
          >
            <Card card={{}} faceDown />
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-gray-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {deckCount}
            </div>
          </div>
        ) : (
          <div className="w-14 h-20 sm:w-16 sm:h-[5.5rem] rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
            <span className="text-white/30 text-xs">Empty</span>
          </div>
        )}
      </div>



      {/* Pile */}
      <div className="flex flex-col items-center gap-1">
        <div 
          id="pile-area"
          onClick={pileClickable ? onPileClick : undefined}
          className={`relative w-14 h-20 sm:w-16 sm:h-[5.5rem] ${pileClickable ? 'cursor-pointer' : ''}`}
        >
          {secondCard && (
            <div className="absolute top-0.5 left-0.5 opacity-50">
              <Card card={secondCard} small={false} disabled />
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {topCard ? (
              <motion.div
                key={topCard.id}
                initial={{ scale: 0.5, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute inset-0"
              >
                <Card card={topCard} disabled />
              </motion.div>
            ) : (
              <div className="w-14 h-20 sm:w-16 sm:h-[5.5rem] rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className="text-white/30 text-xs">Pile</span>
              </div>
            )}
          </AnimatePresence>
          {pile.length > 0 && (
            <div className="absolute -bottom-2 -right-2 bg-white/20 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {pile.length}
            </div>
          )}
          {pileClickable && pile.length > 0 && (
            <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-lg animate-pulse pointer-events-none" />
          )}
        </div>
        <span className="text-white/50 text-[10px] font-medium">
          {pile.length > 0 ? `${pile.length} cards` : 'Pile'}
          {pileClickable && pile.length > 0 && ' • Tap to take'}
        </span>
      </div>
    </div>
  );
}