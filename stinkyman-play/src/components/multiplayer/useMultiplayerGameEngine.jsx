import { useState, useCallback, useEffect } from "react";
import { useSocket } from "./SocketContext";

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

function getNextPlayer(currentPlayerId, players) {
  const playerIds = Object.keys(players);
  const currentIndex = playerIds.indexOf(currentPlayerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  return playerIds[nextIndex];
}

function getPlayerCards(playerState) {
  if (playerState.hand.length > 0) return playerState.hand;
  if (playerState.faceUp.length > 0) return playerState.faceUp;
  return playerState.faceDown;
}

function getPlayableCards(playerState, pile, isReversed) {
  const cards = getPlayerCards(playerState);
  if (playerState.hand.length === 0 && playerState.faceUp.length === 0) {
    return cards; // Face-down: always "playable" to attempt
  }
  return cards.filter(c => canPlayOnPile(c, pile, isReversed));
}

function getRankName(rank) {
  if (rank === 14) return 'Ace';
  if (rank === 13) return 'King';
  if (rank === 12) return 'Queen';
  if (rank === 11) return 'Jack';
  return rank.toString();
}

export default function useMultiplayerGameEngine(roomCode, playerId) {
  const [gameState, setGameState] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [message, setMessage] = useState("");
  const { socket } = useSocket();

  // Subscribe to game state updates via socket
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Load initial game state
    socket.emit('loadGameState', { roomCode }, (response) => {
      if (response.success && response.gameState) {
        setGameState(response.gameState);
        updateLocalMessage(response.gameState, playerId);
      }
    });

    // Listen for game state updates
    const handleGameStateUpdate = ({ gameState: newState }) => {
      setGameState(newState);
      updateLocalMessage(newState, playerId);
    };

    socket.on('gameStateUpdated', handleGameStateUpdate);

    return () => {
      socket.off('gameStateUpdated', handleGameStateUpdate);
    };
  }, [socket, roomCode, playerId]);

  const updateLocalMessage = (state, currentPlayerId) => {
    if (!state) return;

    if (state.phase === "swap") {
      const myPlayer = state.players[currentPlayerId];
      if (myPlayer?.swapReady) {
        setMessage("Waiting for other players to ready up...");
      } else {
        setMessage("Swap cards between hand & face-up, then tap Ready!");
      }
    } else if (state.phase === "playing") {
      if (state.winner) {
        const winnerPlayer = state.players[state.winner];
        setMessage(state.winner === currentPlayerId ? "🎉 You win!" : `😞 ${winnerPlayer?.name || "Opponent"} wins!`);
      } else if (state.currentTurn === currentPlayerId) {
        setMessage(state.customMessage || "Your turn — select cards to play");
      } else {
        const otherPlayer = state.players[state.currentTurn];
        setMessage(`${otherPlayer?.name || "Opponent"}'s turn...`);
      }
    } else if (state.phase === "gameOver") {
      const winnerPlayer = state.players[state.winner];
      setMessage(state.winner === currentPlayerId ? "🎉 You win!" : `😞 ${winnerPlayer?.name || "Opponent"} wins!`);
    }
  };

  const updateGameState = useCallback(async (updater) => {
    if (!gameState || !roomCode || !socket) return;

    const newState = typeof updater === 'function' ? updater(gameState) : updater;

    setGameState(newState);
    updateLocalMessage(newState, playerId);

    try {
      socket.emit('gameStateUpdate', {
        roomCode,
        gameState: newState
      });
    } catch (error) {
      console.error("Failed to update game state:", error);
    }
  }, [gameState, roomCode, playerId, socket]);

  const processAfterPlay = useCallback((newState, playedCard, who) => {
    let updatedState = { ...newState, customMessage: null };

    // Check for burn
    if (playedCard.rank === 10 || checkFourOfAKind(updatedState.pile)) {
      updatedState.customMessage = playedCard.rank === 10
        ? "🔥 10 played! Burning pile..."
        : "🔥 Four of a kind! Burning pile...";

      updateGameState(updatedState);

      setTimeout(() => {
        const playerState = updatedState.players[who];
        let finalState = {
          ...updatedState,
          pile: [],
          isReversed: false,
          currentTurn: who,
          customMessage: "🔥 Pile burned! Play again."
        };

        if (playerState.hand.length < 3 && updatedState.deck.length > 0) {
          const { hand, deck } = drawToThree(playerState.hand, updatedState.deck);
          finalState.players = {
            ...finalState.players,
            [who]: { ...playerState, hand }
          };
          finalState.deck = deck;
        }

        updateGameState(finalState);
      }, 1000);
      return;
    }

    // Handle special cards
    if (playedCard.rank === 5) {
      updatedState.isReversed = true;
      updatedState.customMessage = "⬇ Reverse! Next play must be equal or lower.";
    } else if (playedCard.rank === 2) {
      updatedState.isReversed = false;
      updatedState.customMessage = "Wild 2 — pile reset!";
    } else {
      updatedState.isReversed = false;
    }

    // Draw to 3
    const playerState = updatedState.players[who];
    if (playerState.hand.length < 3 && updatedState.deck.length > 0) {
      const { hand, deck } = drawToThree(playerState.hand, updatedState.deck);
      updatedState.players = {
        ...updatedState.players,
        [who]: { ...playerState, hand }
      };
      updatedState.deck = deck;
    }

    // Check win
    if (checkWin(updatedState.players[who])) {
      updatedState.winner = who;
      updatedState.phase = "gameOver";
      updateGameState(updatedState);
      return;
    }

    // Switch turn
    const nextPlayer = getNextPlayer(who, updatedState.players);
    updatedState.currentTurn = nextPlayer;

    updateGameState(updatedState);
  }, [updateGameState]);

  const selectCard = useCallback((card) => {
    if (!gameState) return;

    const playerState = gameState.players[playerId];
    if (!playerState) return;

    if (gameState.phase === "swap") {
      if (playerState.swapReady) return;
      const inHand = playerState.hand.find(c => c.id === card.id);
      const inFaceUp = playerState.faceUp.find(c => c.id === card.id);
      if (!inHand && !inFaceUp) return;

      const sel = selectedCardIds;
      if (sel.includes(card.id)) {
        setSelectedCardIds(sel.filter(id => id !== card.id));
        return;
      }

      if (sel.length === 1) {
        const firstId = sel[0];
        const firstInHand = playerState.hand.find(c => c.id === firstId);
        const firstInFaceUp = playerState.faceUp.find(c => c.id === firstId);

        if ((firstInHand && inFaceUp) || (firstInFaceUp && inHand)) {
          const handCard = firstInHand || inHand;
          const faceUpCard = firstInFaceUp || inFaceUp;

          const newHand = playerState.hand.map(c => c.id === handCard.id ? faceUpCard : c);
          const newFaceUp = playerState.faceUp.map(c => c.id === faceUpCard.id ? handCard : c);

          updateGameState({
            ...gameState,
            players: {
              ...gameState.players,
              [playerId]: { ...playerState, hand: newHand, faceUp: newFaceUp }
            },
            customMessage: "Swapped! Keep swapping or tap Ready!"
          });
          setSelectedCardIds([]);
          return;
        }
      }

      setSelectedCardIds([...sel, card.id]);
    } else if (gameState.phase === "playing") {
      if (gameState.currentTurn !== playerId) return;
      const playerCards = getPlayerCards(playerState);
      if (!playerCards.find(c => c.id === card.id)) return;

      // Face-down cards auto-play
      const playingFaceDown = playerState.hand.length === 0 && playerState.faceUp.length === 0;
      if (playingFaceDown) {
        playFaceDownCard(card);
        return;
      }

      const sel = selectedCardIds;
      if (sel.includes(card.id)) {
        setSelectedCardIds(sel.filter(id => id !== card.id));
        return;
      }

      if (sel.length > 0) {
        const firstCard = playerCards.find(c => c.id === sel[0]);
        if (firstCard && firstCard.rank !== card.rank) {
          setSelectedCardIds([card.id]);
          return;
        }
      }

      const newSelectedIds = [...sel, card.id];
      const playableCards = getPlayableCards(playerState, gameState.pile, gameState.isReversed);
      const sameRankCards = playableCards.filter(c => c.rank === card.rank);

      if (sameRankCards.length === newSelectedIds.length) {
        setSelectedCardIds(newSelectedIds);
        setTimeout(() => playCards(newSelectedIds), 100);
      } else {
        setSelectedCardIds(newSelectedIds);
      }
    }
  }, [gameState, playerId, selectedCardIds]);

  const playFaceDownCard = useCallback((card) => {
    if (!gameState || gameState.currentTurn !== playerId) return;

    const playerState = gameState.players[playerId];
    if (!playerState) return;

    const newFaceDown = playerState.faceDown.filter(c => c.id !== card.id);
    const newPile = [...gameState.pile, card];
    const isValid = canPlayOnPile(card, gameState.pile, gameState.isReversed);

    if (!isValid) {
      updateGameState({
        ...gameState,
        pile: newPile,
        players: {
          ...gameState.players,
          [playerId]: { ...playerState, faceDown: newFaceDown }
        },
        customMessage: `Revealed: ${getRankName(card.rank)}... Invalid!`
      });

      setTimeout(() => {
        const takenCards = newPile;
        const newHand = [...playerState.hand, ...takenCards].sort((a, b) => a.rank - b.rank);
        const nextPlayer = getNextPlayer(playerId, gameState.players);

        updateGameState({
          ...gameState,
          pile: [],
          players: {
            ...gameState.players,
            [playerId]: { ...playerState, hand: newHand, faceDown: newFaceDown }
          },
          currentTurn: nextPlayer,
          isReversed: false,
          customMessage: "Chance failed! Took the pile."
        });
      }, 1200);
    } else {
      const stateAfterPlay = {
        ...gameState,
        pile: newPile,
        players: {
          ...gameState.players,
          [playerId]: { ...playerState, faceDown: newFaceDown }
        }
      };

      updateGameState({
        ...stateAfterPlay,
        customMessage: `Revealed: ${getRankName(card.rank)}! Valid play.`
      });

      setTimeout(() => {
        processAfterPlay(stateAfterPlay, card, playerId);
      }, 600);
    }

    setSelectedCardIds([]);
  }, [gameState, playerId, updateGameState, processAfterPlay]);

  const playCards = useCallback((cardsToPlay = selectedCardIds) => {
    if (!gameState || gameState.currentTurn !== playerId) return;

    const cardsArray = Array.isArray(cardsToPlay) ? cardsToPlay : selectedCardIds;
    if (cardsArray.length === 0) return;

    const playerState = gameState.players[playerId];
    const playerCards = getPlayerCards(playerState);
    const selected = cardsArray.map(id => playerCards.find(c => c.id === id)).filter(Boolean);

    if (selected.length === 0) return;
    if (!selected.every(c => c.rank === selected[0].rank)) return;

    if (!canPlayOnPile(selected[0], gameState.pile, gameState.isReversed)) {
      setMessage("Can't play that card!");
      setSelectedCardIds([]);
      return;
    }

    const newPile = [...gameState.pile, ...selected];
    const selectedIds = new Set(selected.map(c => c.id));

    let newPlayerState = { ...playerState };
    if (playerState.hand.length > 0) {
      newPlayerState.hand = playerState.hand.filter(c => !selectedIds.has(c.id));
    } else {
      newPlayerState.faceUp = playerState.faceUp.filter(c => !selectedIds.has(c.id));
    }

    processAfterPlay({
      ...gameState,
      pile: newPile,
      players: {
        ...gameState.players,
        [playerId]: newPlayerState
      }
    }, selected[0], playerId);

    setSelectedCardIds([]);
  }, [gameState, playerId, selectedCardIds]);

  // ─── Draw from deck (chance mechanic) ───
  const drawFromDeck = useCallback(() => {
    if (!gameState || gameState.currentTurn !== playerId) return;
    if (gameState.deck.length === 0) return;

    const playerState = gameState.players[playerId];
    const newDeck = [...gameState.deck];
    const drawnCard = newDeck.pop();

    if (canPlayOnPile(drawnCard, gameState.pile, gameState.isReversed)) {
      // Auto-play the drawn card
      const newPile = [...gameState.pile, drawnCard];
      processAfterPlay({
        ...gameState,
        deck: newDeck,
        pile: newPile,
      }, drawnCard, playerId);
    } else {
      // Show card on pile briefly, then take the whole pile
      const newPile = [...gameState.pile, drawnCard];
      updateGameState({
        ...gameState,
        deck: newDeck,
        pile: newPile,
        customMessage: `Drew ${getRankName(drawnCard.rank)}... can't play it!`
      });

      setTimeout(() => {
        const newHand = [...playerState.hand, ...newPile].sort((a, b) => a.rank - b.rank);
        const nextPlayer = getNextPlayer(playerId, gameState.players);
        updateGameState({
          ...gameState,
          deck: newDeck,
          pile: [],
          players: {
            ...gameState.players,
            [playerId]: { ...playerState, hand: newHand }
          },
          currentTurn: nextPlayer,
          isReversed: false,
          customMessage: "Took the pile."
        });
      }, 800);
    }

    setSelectedCardIds([]);
  }, [gameState, playerId, updateGameState, processAfterPlay]);

  const confirmSwap = useCallback(async () => {
    if (!gameState || gameState.phase !== "swap") return;

    const playerState = gameState.players[playerId];
    if (playerState?.swapReady) return;

    const updatedPlayers = {
      ...gameState.players,
      [playerId]: { ...playerState, swapReady: true }
    };

    const allReady = Object.values(updatedPlayers).every(p => p.swapReady);

    if (allReady) {
      const playerIds = Object.keys(updatedPlayers);
      let lowestPlayer = playerIds[0];
      let lowestRank = Infinity;

      for (const pid of playerIds) {
        const player = updatedPlayers[pid];
        const allCards = [...player.hand, ...player.faceUp, ...player.faceDown];
        const nonSpecial = allCards.filter(c => c.rank !== 2 && c.rank !== 5 && c.rank !== 10);
        if (nonSpecial.length > 0) {
          const minRank = Math.min(...nonSpecial.map(c => c.rank));
          if (minRank < lowestRank) {
            lowestRank = minRank;
            lowestPlayer = pid;
          }
        }
      }

      await updateGameState({
        ...gameState,
        players: updatedPlayers,
        phase: "playing",
        currentTurn: lowestPlayer,
        customMessage: null
      });
    } else {
      await updateGameState({
        ...gameState,
        players: updatedPlayers
      });
    }

    setSelectedCardIds([]);
  }, [gameState, playerId, updateGameState]);

  const requestRematch = useCallback(() => {
    if (!socket || !roomCode || !playerId) return;
    socket.emit('requestRematch', { roomCode, playerId });
  }, [socket, roomCode, playerId]);

  const takePile = useCallback(() => {
    if (!gameState || gameState.currentTurn !== playerId || gameState.pile.length === 0) return;

    const playerState = gameState.players[playerId];
    const newHand = [...playerState.hand, ...gameState.pile].sort((a, b) => a.rank - b.rank);
    const nextPlayer = getNextPlayer(playerId, gameState.players);

    updateGameState({
      ...gameState,
      pile: [],
      players: {
        ...gameState.players,
        [playerId]: { ...playerState, hand: newHand }
      },
      currentTurn: nextPlayer,
      isReversed: false,
      customMessage: "Took the pile."
    });
    setSelectedCardIds([]);
  }, [gameState, playerId, updateGameState]);

  // Compute whether the current player has any valid cards to play
  const myPlayerState = gameState?.players?.[playerId];
  const hasPlayableCards = myPlayerState && gameState
    ? getPlayableCards(myPlayerState, gameState.pile, gameState.isReversed).length > 0
    : false;

  const canPlay = gameState?.phase === "playing" &&
    gameState?.currentTurn === playerId &&
    selectedCardIds.length > 0;

  const canTakePile = gameState?.phase === "playing" &&
    gameState?.currentTurn === playerId &&
    (gameState?.pile?.length ?? 0) > 0 &&
    !hasPlayableCards;

  const canDrawFromDeck = gameState?.phase === "playing" &&
    gameState?.currentTurn === playerId &&
    (gameState?.deck?.length ?? 0) > 0 &&
    !hasPlayableCards;

  const myRematchRequested = (gameState?.rematchRequests || []).includes(playerId);

  return {
    gameState,
    myState: gameState?.players?.[playerId],
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
  };
}
