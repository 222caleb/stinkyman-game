import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CARD_THEMES } from "./CardThemes";

const SUITS = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
const RANK_DISPLAY = { 1: "A", 11: "J", 12: "Q", 13: "K", 14: "A" };

export default function Card({ card, faceDown, selected, onClick, small, disabled, style, animate = true, theme = "classic" }) {
  const rankLabel = RANK_DISPLAY[card?.rank] || card?.rank;
  const suitSymbol = SUITS[card?.suit];
  const cardTheme = CARD_THEMES[theme] || CARD_THEMES.classic;
  const suitColor = cardTheme.suitColors[card?.suit];

  if (faceDown) {
    return (
      <motion.div
        layout={animate}
        onClick={disabled ? undefined : onClick}
        style={style}
        className={cn(
          "relative rounded-lg border-2 border-white/20 shadow-lg cursor-pointer select-none",
          "bg-gradient-to-br from-red-800 via-red-900 to-red-950",
          small ? "w-11 h-16" : "w-14 h-20 sm:w-16 sm:h-[5.5rem]",
          disabled && "cursor-default"
        )}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <div className="absolute inset-1 rounded border border-white/10 flex items-center justify-center">
          <div className="text-white/20 text-lg font-bold">✦</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout={animate}
      onClick={disabled ? undefined : onClick}
      style={style}
      className={cn(
      "relative rounded-lg border shadow-lg cursor-pointer select-none transition-all",
      cardTheme.background,
      small ? "w-11 h-16" : "w-14 h-20 sm:w-16 sm:h-[5.5rem]",
      selected 
        ? `${cardTheme.selectedBorder} ring-2 ${cardTheme.selectedRing} -translate-y-3 shadow-${theme}-400/40` 
        : cardTheme.border,
      disabled && "cursor-default opacity-100"
      )}
      whileHover={!disabled && !selected ? { y: -8, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={selected ? { y: -12 } : { y: 0 }}
    >
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={cn("font-bold", suitColor, small ? "text-[10px]" : "text-xs")}>{rankLabel}</span>
        <span className={cn(suitColor, small ? "text-[10px]" : "text-xs")}>{suitSymbol}</span>
      </div>
      <div className={cn("absolute inset-0 flex items-center justify-center", suitColor)}>
        <span className={cn(small ? "text-lg" : "text-2xl")}>{suitSymbol}</span>
      </div>
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span className={cn("font-bold", suitColor, small ? "text-[10px]" : "text-xs")}>{rankLabel}</span>
        <span className={cn(suitColor, small ? "text-[10px]" : "text-xs")}>{suitSymbol}</span>
      </div>
    </motion.div>
  );
}