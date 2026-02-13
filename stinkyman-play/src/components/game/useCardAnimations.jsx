import { useState, useCallback } from "react";

export default function useCardAnimations() {
  const [animatingCards, setAnimatingCards] = useState([]);

  const animateCard = useCallback((card, fromSelector, toSelector, delay = 0, type = "default") => {
    const fromEl = document.querySelector(fromSelector);
    const toEl = document.querySelector(toSelector);

    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const animId = `${card.id}-${Date.now()}`;

    setAnimatingCards((prev) => [
      ...prev,
      {
        id: animId,
        card,
        from: { x: fromRect.left + fromRect.width / 2 - 28, y: fromRect.top + fromRect.height / 2 - 40 },
        to: { x: toRect.left + toRect.width / 2 - 28, y: toRect.top + toRect.height / 2 - 40 },
        delay,
        type,
      },
    ]);

    const duration = type === "play" ? 0.6 : type === "draw" ? 0.5 : type === "deal" ? 0.4 : 0.5;
    setTimeout(() => {
      setAnimatingCards((prev) => prev.filter((a) => a.id !== animId));
    }, (delay + duration) * 1000 + 100);
  }, []);

  const animateDeal = useCallback((cards, targetSelector, delayMultiplier = 0.08, fromDeck = true) => {
    const centerX = window.innerWidth / 2 - 28;
    const centerY = window.innerHeight / 2 - 40;

    cards.forEach((card, i) => {
      const animId = `deal-${card.id}-${Date.now()}`;
      const toEl = document.querySelector(targetSelector);
      
      if (!toEl) return;
      
      const toRect = toEl.getBoundingClientRect();
      
      let fromX = centerX;
      let fromY = centerY;
      
      if (fromDeck) {
        const deckEl = document.querySelector('#deck-area');
        if (deckEl) {
          const deckRect = deckEl.getBoundingClientRect();
          fromX = deckRect.left + deckRect.width / 2 - 28;
          fromY = deckRect.top + deckRect.height / 2 - 40;
        }
      }

      setAnimatingCards((prev) => [
        ...prev,
        {
          id: animId,
          card,
          from: { x: fromX, y: fromY },
          to: { x: toRect.left + toRect.width / 2 - 28, y: toRect.top + toRect.height / 2 - 40 },
          delay: i * delayMultiplier,
          type: "deal",
        },
      ]);

      setTimeout(() => {
        setAnimatingCards((prev) => prev.filter((a) => a.id !== animId));
      }, (i * delayMultiplier + 0.4) * 1000 + 100);
    });
  }, []);

  const animateDrawCards = useCallback((cards, fromSelector, toSelector, delayMultiplier = 0.1) => {
    cards.forEach((card, i) => {
      setTimeout(() => {
        animateCard(card, fromSelector, toSelector, 0, "draw");
      }, i * delayMultiplier * 1000);
    });
  }, [animateCard]);

  return { animatingCards, animateCard, animateDeal, animateDrawCards };
}