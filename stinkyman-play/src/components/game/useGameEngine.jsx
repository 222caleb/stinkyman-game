import { useState, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

async function saveGameStats(playerWon) {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    const existing = await base44.entities.GameStats.filter({ playerEmail: user.email });

    if (existing.length > 0) {
      const stats = existing[0];
      const newGamesPlayed = stats.gamesPlayed + 1;
      const newGamesWon = playerWon ? stats.gamesWon + 1 : stats.gamesWon;
      const newGamesLost = playerWon ? stats.gamesLost : stats.gamesLost + 1;
      const newWinRate = (newGamesWon / newGamesPlayed) * 100;

      await base44.entities.GameStats.update(stats.id, {
        gamesPlayed: newGamesPlayed,
        gamesWon: newGamesWon,
        gamesLost: newGamesLost,
        winRate: newWinRate,
        playerName: user.displayName || user.full_name || user.email
      });
    } else {
      await base44.entities.GameStats.create({
        playerEmail: user.email,
        playerName: user.displayName || user.full_name || user.email,
        gamesPlayed: 1,
        gamesWon: playerWon ? 1 : 0,
        gamesLost: playerWon ? 0 : 1,
        winRate: playerWon ? 100 : 0
      });
    }
  } catch (error) {
    console.error("Failed to save game stats:", error);
  }
}

// ─── Deck Creation ───
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

function canPlayOnPile(card, pile, isReversed) {
  if (card.rank === 2 || card.rank === 5 || card.rank === 10) return true;
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  if (isReversed) {
    return card.rank <= topCard.rank;
  }
  return card.rank >= topCard.rank;
}

function checkFourOfAKind(pile) {
  if (pile.length < 4) return false;
  const top4 = pile.slice(-4);
  return top4.every(c => c.rank === top4[0].rank);
}

// ─── Initial State ───
const INITIAL_STATE = {
  phase: "idle",
  deck: [],
  pile: [],
  player: { hand: [], faceUp: [], faceDown: [] },
  opponent: { hand: [], faceUp: [], faceDown: [] },
  currentTurn: "player",
  selectedCardIds: [],
  message: "Tap DEAL to start a new game",
  isReversed: false,
  winner: null,
  animatingBurn: false,
  difficulty: "medium", // easy | medium | hard
};

export default function useGameEngine() {
  const [state, setState] = useState(INITIAL_STATE);
  const aiTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);

  // ─── Deal ───
  const deal = useCallback(() => {
    const deck = createDeck();
    let idx = 0;
    const pFaceDown = deck.slice(idx, idx + 3); idx += 3;
    const pFaceUp = deck.slice(idx, idx + 3); idx += 3;
    const pHand = deck.slice(idx, idx + 3); idx += 3;
    const oFaceDown = deck.slice(idx, idx + 3); idx += 3;
    const oFaceUp = deck.slice(idx, idx + 3); idx += 3;
    const oHand = deck.slice(idx, idx + 3); idx += 3;
    const remaining = deck.slice(idx);

    setState(prev => ({
      phase: "swap",
      deck: remaining,
      pile: [],
      player: { hand: pHand, faceUp: pFaceUp, faceDown: pFaceDown },
      opponent: { hand: oHand, faceUp: oFaceUp, faceDown: oFaceDown },
      currentTurn: "player",
      selectedCardIds: [],
      message: "Swap cards between hand & face-up, then tap Ready!",
      isReversed: false,
      winner: null,
      animatingBurn: false,
      difficulty: prev.difficulty,
    }));
  }, []);

  // ─── Set Difficulty ───
  const setDifficulty = useCallback((level) => {
    setState(prev => ({ ...prev, difficulty: level }));
  }, []);

  // ─── Swap Phase ───
  const selectCard = useCallback((card) => {
    setState(prev => {
      if (prev.phase === "swap") {
        const inHand = prev.player.hand.find(c => c.id === card.id);
        const inFaceUp = prev.player.faceUp.find(c => c.id === card.id);
        if (!inHand && !inFaceUp) return prev;

        const sel = prev.selectedCardIds;
        if (sel.includes(card.id)) {
          return { ...prev, selectedCardIds: sel.filter(id => id !== card.id) };
        }

        if (sel.length === 1) {
          const firstId = sel[0];
          const firstInHand = prev.player.hand.find(c => c.id === firstId);
          const firstInFaceUp = prev.player.faceUp.find(c => c.id === firstId);
          const secondInHand = inHand;
          const secondInFaceUp = inFaceUp;

          if ((firstInHand && secondInFaceUp) || (firstInFaceUp && secondInHand)) {
            const handCard = firstInHand || secondInHand;
            const faceUpCard = firstInFaceUp || secondInFaceUp;

            const newHand = prev.player.hand.map(c => c.id === handCard.id ? faceUpCard : c);
            const newFaceUp = prev.player.faceUp.map(c => c.id === faceUpCard.id ? handCard : c);

            return {
              ...prev,
              player: { ...prev.player, hand: newHand, faceUp: newFaceUp },
              selectedCardIds: [],
              message: "Swapped! Keep swapping or tap Ready!",
            };
          }
        }

        return { ...prev, selectedCardIds: [...sel, card.id] };
      }

      if (prev.phase !== "playing" || prev.currentTurn !== "player") return prev;

      const playableCards = getPlayableCards(prev, "player");
      const playerCards = getPlayerCards(prev, "player");

      if (!playerCards.find(c => c.id === card.id)) return prev;

      // Face-down cards auto-play immediately when clicked
      const playingFaceDown = prev.player.hand.length === 0 && prev.player.faceUp.length === 0;
      if (playingFaceDown) {
        const newFaceDown = prev.player.faceDown.filter(c => c.id !== card.id);

        const revealedState = {
          ...prev,
          pile: [...prev.pile, card],
          player: { ...prev.player, faceDown: newFaceDown },
          message: `Revealed: ${card.rank === 14 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank}`,
        };

        if (!canPlayOnPile(card, prev.pile, prev.isReversed)) {
          setTimeout(() => {
            setState(prev2 => {
              const takenCards = [...prev2.pile];
              const newHand = [...prev2.player.hand, ...takenCards].sort((a, b) => a.rank - b.rank);
              return {
                ...prev2,
                pile: [],
                player: { ...prev2.player, hand: newHand },
                currentTurn: "opponent",
                selectedCardIds: [],
                isReversed: false,
                message: "Blind play failed! You took the pile. Opponent's turn.",
              };
            });
          }, 1200);
          return revealedState;
        }

        return processAfterPlay(revealedState, card, "player");
      }

      const sel = prev.selectedCardIds;
      if (sel.includes(card.id)) {
        return { ...prev, selectedCardIds: sel.filter(id => id !== card.id) };
      }

      if (sel.length > 0) {
        const firstCard = playerCards.find(c => c.id === sel[0]);
        if (firstCard && firstCard.rank !== card.rank) {
          return { ...prev, selectedCardIds: [card.id] };
        }
      }

      const newSelectedIds = [...sel, card.id];

      const sameRankCards = playableCards.filter(c => c.rank === card.rank);

      if (sameRankCards.length === newSelectedIds.length) {
        return autoPlaySelected({ ...prev, selectedCardIds: newSelectedIds });
      }

      return { ...prev, selectedCardIds: newSelectedIds };
    });
  }, []);

  const confirmSwap = useCallback(() => {
    setState(prev => {
      const aiSwappedOpponent = aiSwap(prev.opponent);

      return {
        ...prev,
        opponent: aiSwappedOpponent,
        phase: "playing",
        selectedCardIds: [],
        message: "Your turn — select cards to play",
      };
    });
  }, []);

  // AI swap logic - prioritize strong cards in face-up
  function aiSwap(opponent) {
    const hand = [...opponent.hand];
    const faceUp = [...opponent.faceUp];

    const cardStrength = (card) => {
      if (card.rank === 10) return 100;
      if (card.rank === 5) return 90;
      if (card.rank === 2) return 80;
      if (card.rank >= 11) return 70;
      if (card.rank >= 8) return 50;
      return card.rank;
    };

    const handWithStrength = hand.map(c => ({ card: c, strength: cardStrength(c) }));
    const faceUpWithStrength = faceUp.map(c => ({ card: c, strength: cardStrength(c) }));

    handWithStrength.sort((a, b) => b.strength - a.strength);
    faceUpWithStrength.sort((a, b) => a.strength - b.strength);

    for (let i = 0; i < Math.min(3, faceUpWithStrength.length); i++) {
      if (handWithStrength[i] && handWithStrength[i].strength > faceUpWithStrength[i].strength + 10) {
        const temp = handWithStrength[i].card;
        handWithStrength[i].card = faceUpWithStrength[i].card;
        faceUpWithStrength[i].card = temp;
      }
    }

    return {
      ...opponent,
      hand: handWithStrength.map(h => h.card),
      faceUp: faceUpWithStrength.map(f => f.card)
    };
  }

  function getPlayerCards(st, who) {
    const p = st[who];
    if (p.hand.length > 0) return p.hand;
    if (p.faceUp.length > 0) return p.faceUp;
    return p.faceDown;
  }

  function getPlayableCards(st, who) {
    const cards = getPlayerCards(st, who);
    if (st[who].hand.length === 0 && st[who].faceUp.length === 0) {
      return cards;
    }
    return cards.filter(c => canPlayOnPile(c, st.pile, st.isReversed));
  }

  function drawToThree(hand, deck) {
    const newHand = [...hand];
    const newDeck = [...deck];
    while (newHand.length < 3 && newDeck.length > 0) {
      newHand.push(newDeck.pop());
    }
    newHand.sort((a, b) => a.rank - b.rank);
    return { hand: newHand, deck: newDeck };
  }

  function checkWin(p) {
    return p.hand.length === 0 && p.faceUp.length === 0 && p.faceDown.length === 0;
  }

  function autoPlaySelected(st) {
    if (st.phase !== "playing" || st.currentTurn !== "player") return st;
    if (st.selectedCardIds.length === 0) return st;

    const playerCards = getPlayerCards(st, "player");
    const selected = st.selectedCardIds.map(id => playerCards.find(c => c.id === id)).filter(Boolean);

    if (selected.length === 0) return st;
    if (!selected.every(c => c.rank === selected[0].rank)) return st;

    const playingFaceDown = st.player.hand.length === 0 && st.player.faceUp.length === 0;
    if (playingFaceDown) {
      const card = selected[0];
      if (!canPlayOnPile(card, st.pile, st.isReversed)) {
        const newFaceDown = st.player.faceDown.filter(c => c.id !== card.id);
        const takenCards = [...st.pile, card];
        const newHand = [...st.player.hand, ...takenCards].sort((a, b) => a.rank - b.rank);
        return {
          ...st,
          pile: [],
          player: { ...st.player, hand: newHand, faceDown: newFaceDown },
          currentTurn: "opponent",
          selectedCardIds: [],
          isReversed: false,
          message: "Blind play failed! You took the pile. Opponent's turn.",
        };
      }
      const newPile = [...st.pile, card];
      const newFaceDown = st.player.faceDown.filter(c => c.id !== card.id);
      return processAfterPlay({ ...st, pile: newPile, player: { ...st.player, faceDown: newFaceDown } }, card, "player");
    }

    if (!canPlayOnPile(selected[0], st.pile, st.isReversed)) {
      return { ...st, message: "Can't play that card!", selectedCardIds: [] };
    }

    const newPile = [...st.pile, ...selected];
    const selectedIds = new Set(selected.map(c => c.id));

    let newPlayer = { ...st.player };
    if (st.player.hand.length > 0) {
      newPlayer.hand = st.player.hand.filter(c => !selectedIds.has(c.id));
    } else {
      newPlayer.faceUp = st.player.faceUp.filter(c => !selectedIds.has(c.id));
    }

    return processAfterPlay({ ...st, pile: newPile, player: newPlayer }, selected[0], "player");
  }

  // ─── Play selected cards ───
  const playCards = useCallback(() => {
    setState(prev => {
      if (prev.phase !== "playing" || prev.currentTurn !== "player") return prev;
      if (prev.selectedCardIds.length === 0) return prev;

      const playerCards = getPlayerCards(prev, "player");
      const selected = prev.selectedCardIds.map(id => playerCards.find(c => c.id === id)).filter(Boolean);

      if (selected.length === 0) return prev;

      if (!selected.every(c => c.rank === selected[0].rank)) return prev;

      const playingFaceDown = prev.player.hand.length === 0 && prev.player.faceUp.length === 0;
      if (playingFaceDown) {
        const card = selected[0];
        const newFaceDown = prev.player.faceDown.filter(c => c.id !== card.id);

        const revealedState = {
          ...prev,
          pile: [...prev.pile, card],
          player: { ...prev.player, faceDown: newFaceDown },
          message: `Revealed: ${card.rank === 14 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank}`,
        };

        if (!canPlayOnPile(card, prev.pile, prev.isReversed)) {
          setTimeout(() => {
            setState(prev2 => {
              const takenCards = [...prev2.pile];
              const newHand = [...prev2.player.hand, ...takenCards].sort((a, b) => a.rank - b.rank);
              return {
                ...prev2,
                pile: [],
                player: { ...prev2.player, hand: newHand },
                currentTurn: "opponent",
                selectedCardIds: [],
                isReversed: false,
                message: "Blind play failed! You took the pile. Opponent's turn.",
              };
            });
          }, 1200);
          return revealedState;
        }

        return processAfterPlay(revealedState, card, "player");
      }

      if (!canPlayOnPile(selected[0], prev.pile, prev.isReversed)) {
        return { ...prev, message: "Can't play that card!", selectedCardIds: [] };
      }

      const newPile = [...prev.pile, ...selected];
      const selectedIds = new Set(selected.map(c => c.id));

      let newPlayer = { ...prev.player };
      if (prev.player.hand.length > 0) {
        newPlayer.hand = prev.player.hand.filter(c => !selectedIds.has(c.id));
      } else {
        newPlayer.faceUp = prev.player.faceUp.filter(c => !selectedIds.has(c.id));
      }

      return processAfterPlay({ ...prev, pile: newPile, player: newPlayer }, selected[0], "player");
    });
  }, []);

  function processAfterPlay(st, playedCard, who) {
    let newState = { ...st, selectedCardIds: [] };
    const otherPlayer = who === "player" ? "opponent" : "player";

    let burned = false;
    if (playedCard.rank === 10 || checkFourOfAKind(newState.pile)) {
      burned = true;
      newState.message = playedCard.rank === 10
        ? "🔥 10 played! Burning pile..."
        : "🔥 Four of a kind! Burning pile...";
      newState.animatingBurn = true;

      setTimeout(() => {
        setState(prev => {
          let updatedState = {
            ...prev,
            pile: [],
            isReversed: false,
            currentTurn: who,
            animatingBurn: false,
          };

          if (who === "player" && prev.player.hand.length < 3 && prev.deck.length > 0) {
            const { hand, deck } = drawToThree(prev.player.hand, prev.deck);
            updatedState.player = { ...prev.player, hand };
            updatedState.deck = deck;
            updatedState.message = "🔥 Pile burned! Play again.";
          } else if (who === "player") {
            updatedState.message = "🔥 Pile burned! Play again.";
          }

          if (who === "opponent" && prev.opponent.hand.length < 3 && prev.deck.length > 0) {
            const { hand, deck } = drawToThree(prev.opponent.hand, prev.deck);
            updatedState.opponent = { ...prev.opponent, hand };
            updatedState.deck = deck;
            updatedState.message = "🔥 Opponent burned the pile! They play again...";
          } else if (who === "opponent") {
            updatedState.message = "🔥 Opponent burned the pile! They play again...";
          }

          return updatedState;
        });
      }, 1000);
      return newState;
    }

    if (playedCard.rank === 5 && !burned) {
      newState.isReversed = true;
      newState.message = "⬇ Reverse! Next play must be equal or lower.";
    } else if (playedCard.rank === 2 && !burned) {
      newState.isReversed = false;
      newState.message = "Wild 2 — pile reset!";
    } else if (!burned) {
      newState.isReversed = false;
    }

    if (who === "player" && newState.player.hand.length < 3) {
      const { hand, deck } = drawToThree(newState.player.hand, newState.deck);
      newState.player = { ...newState.player, hand };
      newState.deck = deck;
    }
    if (who === "opponent" && newState.opponent.hand.length < 3) {
      const { hand, deck } = drawToThree(newState.opponent.hand, newState.deck);
      newState.opponent = { ...newState.opponent, hand };
      newState.deck = deck;
    }

    if (checkWin(newState[who])) {
      newState.winner = who;
      newState.message = who === "player" ? "🎉 You win!" : "😞 Opponent wins!";
      setTimeout(() => {
        setState(prev => ({ ...prev, phase: "gameOver" }));
        saveGameStats(who === "player");
      }, 600);
      return newState;
    }

    if (!burned) {
      newState.currentTurn = otherPlayer;
      newState.message = otherPlayer === "opponent"
        ? "Opponent's turn..."
        : "Your turn — select cards to play";
    }

    return newState;
  }

  // ─── Take pile ───
  const takePile = useCallback(() => {
    setState(prev => {
      if (prev.phase !== "playing" || prev.currentTurn !== "player") return prev;
      if (prev.pile.length === 0) return prev;

      const newHand = [...prev.player.hand, ...prev.pile].sort((a, b) => a.rank - b.rank);
      return {
        ...prev,
        pile: [],
        player: { ...prev.player, hand: newHand },
        currentTurn: "opponent",
        selectedCardIds: [],
        isReversed: false,
        message: "You took the pile. Opponent's turn...",
      };
    });
  }, []);

  // ─── Sort hand ───
  const sortHand = useCallback(() => {
    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        hand: [...prev.player.hand].sort((a, b) => a.rank - b.rank),
      },
    }));
  }, []);

  // ─── Draw from deck (chance mechanic) ───
  const drawFromDeck = useCallback(() => {
    setState(prev => {
      if (prev.phase !== "playing" || prev.currentTurn !== "player") return prev;
      if (prev.deck.length === 0) return prev;

      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop();

      if (canPlayOnPile(drawnCard, prev.pile, prev.isReversed)) {
        const newPile = [...prev.pile, drawnCard];
        return processAfterPlay({ ...prev, deck: newDeck, pile: newPile }, drawnCard, "player");
      } else {
        const newPile = [...prev.pile, drawnCard];
        const newState = {
          ...prev,
          deck: newDeck,
          pile: newPile,
          message: `Drew unplayable card...`,
        };

        setTimeout(() => {
          setState(prev2 => {
            const newHand = [...prev2.player.hand, ...prev2.pile].sort((a, b) => a.rank - b.rank);
            return {
              ...prev2,
              pile: [],
              player: { ...prev2.player, hand: newHand },
              currentTurn: "opponent",
              isReversed: false,
              message: `Took the pile. Opponent's turn.`,
            };
          });
        }, 800);

        return newState;
      }
    });
  }, []);

  // ─── AI Turn ───
  useEffect(() => {
    if (state.phase !== "playing" || state.currentTurn !== "opponent" || state.animatingBurn) return;

    // Delay varies by difficulty
    const baseDelay = state.difficulty === "easy" ? 1200 : state.difficulty === "hard" ? 400 : 800;
    const jitter = state.difficulty === "hard" ? 200 : 600;

    aiTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.currentTurn !== "opponent" || prev.phase !== "playing" || prev.animatingBurn) return prev;
        return aiPlay(prev);
      });
    }, baseDelay + Math.random() * jitter);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [state.phase, state.currentTurn, state.pile.length, state.animatingBurn, state.difficulty]);

  function aiPlay(st) {
    const difficulty = st.difficulty || "medium";

    // Easy: mostly random with occasional mistakes
    if (difficulty === "easy") return aiPlayEasy(st);
    // Hard: optimal play
    if (difficulty === "hard") return aiPlayHard(st);
    // Medium: smart but not perfect
    return aiPlayMedium(st);
  }

  function aiPlayEasy(st) {
    const cards = getPlayerCards(st, "opponent");
    const playable = getPlayableCards(st, "opponent");

    // Playing face-down blind
    if (st.opponent.hand.length === 0 && st.opponent.faceUp.length === 0) {
      return aiPlayFaceDown(st, cards);
    }

    // 30% chance to make a random mistake (take pile unnecessarily)
    if (playable.length > 0 && Math.random() < 0.3) {
      if (st.pile.length > 0) {
        const newHand = [...st.opponent.hand, ...st.pile].sort((a, b) => a.rank - b.rank);
        return {
          ...st,
          pile: [],
          opponent: { ...st.opponent, hand: newHand },
          currentTurn: "player",
          isReversed: false,
          message: "Opponent took the pile! Your turn.",
        };
      }
    }

    if (playable.length === 0) {
      return aiHandleNoPlayable(st);
    }

    // Pick randomly from playable cards
    const chosen = playable[Math.floor(Math.random() * playable.length)];
    return aiPlayCard(st, [chosen]);
  }

  function aiPlayMedium(st) {
    const cards = getPlayerCards(st, "opponent");
    const playable = getPlayableCards(st, "opponent");

    if (st.opponent.hand.length === 0 && st.opponent.faceUp.length === 0) {
      return aiPlayFaceDown(st, cards);
    }

    if (playable.length === 0) {
      return aiHandleNoPlayable(st);
    }

    const evaluateCard = (card) => {
      // Burn (10) — high priority, scales with pile size
      if (card.rank === 10) return st.pile.length > 4 ? 1000 : 500;

      // Four-of-a-kind potential
      const sameRank = playable.filter(c => c.rank === card.rank);
      if (sameRank.length >= 3) return 900;

      // Reverse (5) — use strategically
      if (card.rank === 5) {
        const topCard = st.pile[st.pile.length - 1];
        // Don't reverse when pile is empty or has a low card already
        if (!topCard || topCard.rank <= 4) return 150;
        // Use when we have low cards to play next
        const hasLowCards = playable.some(c => c.rank <= 4 && c.rank !== 2);
        return hasLowCards ? 800 : 250;
      }

      // Wild (2) — save unless stuck
      if (card.rank === 2) {
        // Use freely when hand is small
        if (st.opponent.hand.length <= 2) return 600;
        // Save if we have other playable options
        return playable.length > 1 ? 100 : 700;
      }

      // High cards — prefer playing face cards when hand is large
      if (card.rank >= 11) {
        return st.opponent.hand.length > 4 ? 400 : 200;
      }

      // Low-mid cards — generally good to play early
      if (card.rank <= 7) return 500;

      return 200 + card.rank;
    };

    const sorted = [...playable].sort((a, b) => evaluateCard(b) - evaluateCard(a));
    const chosenRank = sorted[0].rank;
    const toPlay = playable.filter(c => c.rank === chosenRank);

    return aiPlayCard(st, toPlay);
  }

  function aiPlayHard(st) {
    const cards = getPlayerCards(st, "opponent");
    const playable = getPlayableCards(st, "opponent");

    if (st.opponent.hand.length === 0 && st.opponent.faceUp.length === 0) {
      return aiPlayFaceDown(st, cards);
    }

    if (playable.length === 0) {
      // Hard AI: try deck draw before taking pile
      if (st.deck.length > 0) {
        return aiDrawFromDeck(st);
      }
      return aiHandleNoPlayable(st);
    }

    // Hard AI scoring — full lookahead awareness
    const evaluateCard = (card) => {
      const topCard = st.pile[st.pile.length - 1];
      const opponentCards = st.opponent.hand.length > 0 ? st.opponent.hand : st.opponent.faceUp;

      // Always burn with 10
      if (card.rank === 10) return 10000;

      // Complete four-of-a-kind for free burn
      const sameRank = playable.filter(c => c.rank === card.rank);
      if (sameRank.length === 4) return 9000;
      if (sameRank.length === 3) return 8000;

      // Wild (2) — use when it lets us shed a card from a small hand
      if (card.rank === 2) {
        if (st.opponent.hand.length <= 2) return 7000;
        return playable.length === 1 ? 6000 : 200;
      }

      // Reverse (5) — only when tactically useful
      if (card.rank === 5) {
        if (!topCard) return 100;
        // Reverse is great when top card is high and we have low cards
        const hasLowFollowUp = opponentCards.some(c => c.rank <= 5 && c.rank !== 5);
        if (topCard.rank >= 9 && hasLowFollowUp) return 7500;
        return 150;
      }

      // Prefer playing highest valid non-special card to control pile
      // but not face cards if hand is already small
      if (st.opponent.hand.length <= 3 && card.rank >= 11) return 3000;
      if (card.rank >= 8 && card.rank <= 10) return 4000;

      // Play mid cards freely
      if (card.rank >= 6) return 3500;

      return card.rank * 100;
    };

    const sorted = [...playable].sort((a, b) => evaluateCard(b) - evaluateCard(a));
    const chosenRank = sorted[0].rank;
    const toPlay = playable.filter(c => c.rank === chosenRank);

    return aiPlayCard(st, toPlay);
  }

  // ─── AI helpers ───

  function aiPlayCard(st, toPlay) {
    const newPile = [...st.pile, ...toPlay];
    const playedIds = new Set(toPlay.map(c => c.id));

    let newOpponent = { ...st.opponent };
    if (st.opponent.hand.length > 0) {
      newOpponent.hand = st.opponent.hand.filter(c => !playedIds.has(c.id));
    } else {
      newOpponent.faceUp = st.opponent.faceUp.filter(c => !playedIds.has(c.id));
    }

    return processAfterPlay({ ...st, pile: newPile, opponent: newOpponent }, toPlay[0], "opponent");
  }

  function aiPlayFaceDown(st, cards) {
    if (cards.length === 0) return st;
    const card = cards[0];
    const newFaceDown = st.opponent.faceDown.filter(c => c.id !== card.id);

    const revealedState = {
      ...st,
      pile: [...st.pile, card],
      opponent: { ...st.opponent, faceDown: newFaceDown },
      message: `Opponent revealed a card...`,
    };

    if (!canPlayOnPile(card, st.pile, st.isReversed)) {
      setTimeout(() => {
        setState(prev2 => {
          const takenCards = [...prev2.pile];
          const newHand = [...prev2.opponent.hand, ...takenCards].sort((a, b) => a.rank - b.rank);
          return {
            ...prev2,
            pile: [],
            opponent: { ...prev2.opponent, hand: newHand },
            currentTurn: "player",
            isReversed: false,
            message: "Opponent's blind play failed! Your turn.",
          };
        });
      }, 1200);
      return revealedState;
    }

    return processAfterPlay(revealedState, card, "opponent");
  }

  function aiHandleNoPlayable(st) {
    // Medium AI: try deck draw before taking pile
    if (st.deck.length > 0 && st.difficulty !== "easy") {
      return aiDrawFromDeck(st);
    }

    if (st.pile.length === 0) {
      return { ...st, currentTurn: "player", message: "Your turn — select cards to play" };
    }

    const newHand = [...st.opponent.hand, ...st.pile].sort((a, b) => a.rank - b.rank);
    return {
      ...st,
      pile: [],
      opponent: { ...st.opponent, hand: newHand },
      currentTurn: "player",
      isReversed: false,
      message: "Opponent took the pile! Your turn.",
    };
  }

  function aiDrawFromDeck(st) {
    const newDeck = [...st.deck];
    const drawnCard = newDeck.pop();

    if (canPlayOnPile(drawnCard, st.pile, st.isReversed)) {
      const newPile = [...st.pile, drawnCard];
      return processAfterPlay({ ...st, deck: newDeck, pile: newPile }, drawnCard, "opponent");
    } else {
      // Can't play the drawn card — take the pile (drawn card goes to hand too)
      const newPile = [...st.pile, drawnCard];
      const newHand = [...st.opponent.hand, ...newPile].sort((a, b) => a.rank - b.rank);
      return {
        ...st,
        deck: newDeck,
        pile: [],
        opponent: { ...st.opponent, hand: newHand },
        currentTurn: "player",
        isReversed: false,
        message: "Opponent drew and took the pile! Your turn.",
      };
    }
  }

  const canPlay = state.phase === "playing" &&
    state.currentTurn === "player" &&
    state.selectedCardIds.length > 0;

  const canTakePile = state.phase === "playing" &&
    state.currentTurn === "player" &&
    state.pile.length > 0;

  return {
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
  };
}
