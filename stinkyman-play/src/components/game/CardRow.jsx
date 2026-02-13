import React from "react";
import { motion } from "framer-motion";
import Card from "./Card";

export default function CardRow({ cards, faceDown, selectedIds, onCardClick, small, disabled, overlap = true, stagger = false, compressed = false, expandLow = false, expandHigh = false, theme = "classic" }) {
  let overlapPx = overlap ? (small ? -20 : -28) : 4;
  
  // Compress hand when there are many cards
  if (compressed && cards.length > 6) {
    overlapPx = small ? -32 : -44;
  }

  return (
    <div className="flex justify-center items-center">
      {cards.map((card, i) => {
        // Expand specific cards based on side
        let marginLeft = i === 0 ? 0 : overlapPx;
        
        if (compressed && cards.length > 6) {
          const midpoint = Math.floor(cards.length / 2);
          // Left side expansion (low-value cards)
          if (expandLow && i < midpoint) {
            marginLeft = i === 0 ? 0 : -16;
          }
          // Right side expansion (high-value cards)
          if (expandHigh && i >= midpoint) {
            marginLeft = -16;
          }
        }

        return (
          <motion.div
            key={card.id}
            initial={stagger ? { opacity: 0, y: -20 } : false}
            animate={stagger ? { opacity: 1, y: 0 } : {}}
            transition={stagger ? { delay: i * 0.05 } : {}}
            style={{ marginLeft, zIndex: i }}
            layout
          >
            <Card
              card={card}
              faceDown={faceDown}
              selected={selectedIds?.includes(card.id)}
              onClick={() => onCardClick?.(card)}
              small={small}
              disabled={disabled}
              theme={theme}
            />
          </motion.div>
        );
      })}
    </div>
  );
}