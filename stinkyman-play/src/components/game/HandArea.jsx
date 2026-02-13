import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CardRow from "./CardRow";

export default function HandArea({ cards, selectedIds, onCardClick, disabled, theme = "classic" }) {
  const [expandSide, setExpandSide] = useState(null); // null, 'low', 'high'

  const needsCompression = cards.length > 6;

  const toggleExpand = (side) => {
    setExpandSide(prev => prev === side ? null : side);
  };

  return (
    <div className="relative flex items-center justify-center gap-2 min-h-[100px]">
      {needsCompression && (
        <button
          onClick={() => toggleExpand('low')}
          className={`flex-shrink-0 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border transition-all ${
            expandSide === 'low' ? 'border-yellow-400 bg-white/20' : 'border-white/20'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      
      <div className="overflow-visible flex-grow flex justify-center">
        <CardRow
          cards={cards}
          selectedIds={selectedIds}
          onCardClick={onCardClick}
          disabled={disabled}
          compressed={needsCompression}
          expandLow={expandSide === 'low'}
          expandHigh={expandSide === 'high'}
          stagger
          theme={theme}
        />
      </div>

      {needsCompression && (
        <button
          onClick={() => toggleExpand('high')}
          className={`flex-shrink-0 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border transition-all ${
            expandSide === 'high' ? 'border-yellow-400 bg-white/20' : 'border-white/20'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}