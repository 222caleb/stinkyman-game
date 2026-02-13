import { useState, useCallback, useEffect, useRef } from "react";
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

export default function useMultiplayerGameEngine(roomCode, playerId) {
  const [gameState, setGameState] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [message, setMessage] = useState("");
  const updateTimeoutRef = useRef(null);
  const { socket } = useSocket();

  // Subscribe to game state updates via socket
  useEffect(() => {
    if (!socket || !roomCode) return;

    console.log('🎮 Setting up game engine for room:', roomCode);

    // Load initial game state
    socket.emit('loadGameState', { roomCode }, (response) => {
      if (response.success && response.gameState) {
        console.log('📥 Loaded initial game state:', response.gameState);
        setGameState(response.gameState);
        updateLocalMessage(response.gameState, playerId);
      }
    });

    // Listen for game state updates
    const handleGameStateUpdate = ({ gameState: newState }) => {
      console.log('🔄 Game state updated:', newState);
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

  const initializeGame = async (room, currentPlayerId) => {
    const deck = createDeck();
    let idx = 0;
    
    const playerStates = {};
    room.players.forEach(player => {
      playerStates[player.playerId] = {
        name: player.playerName,
        hand: deck.slice(idx, idx + 3),
        faceUp: deck.slice(idx + 3, idx + 6),
        faceDown: deck.slice(idx + 6, idx + 9),
      };
      idx += 9;
    });

    const initialState = {
      phase: "swap",
      deck: deck.slice(idx),
      pile: [],
      players: playerStates,
      currentTurn: room.players[0].playerId,
      isReversed: false,
      winner: null,
      customMessage: null,
    };

    await base44.entities.GameRoom.update(roomId, {
      gameState: initialState
    });
  };

  const updateGameState = useCallback(async (updater) => {
    if (!gameState || !roomCode || !socket) return;
    
    const newState = typeof updater === 'function' ? updater(gameState) : updater;
    
    // Optimistically update local state for immediate UI feedback
    setGameState(newState);
    updateLocalMessage(newState, playerId);
    
    // Emit to server so other clients see the change
    try {
      socket.emit('gameStateUpdate', {
        roomCode,
        gameState: newState
      });
    } catch (error) {
      console.error("Failed to update game state:", error);
    }
  }, [gameState, roomCode, playerId, socket]);

  const selectCard = useCallback((card) => {
    if (!gameState) return;
    
    const playerState = gameState.players[playerId];
    if (!playerState) return;

    if (gameState.phase === "swap") {
      // During swap phase, don't check for turn - anyone can swap
      if (playerState.swapReady) return; // If already ready, can't swap anymore
      // Swap phase logic
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
      // Playing phase logic - check for turn
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

      // Can only select cards of the same rank
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
        // Auto-play all cards of this rank
        setSelectedCardIds(newSelectedIds);
        setTimeout(() => playCards(newSelectedIds), 100);
      } else {
        setSelectedCardIds(newSelectedIds);
      }
    }
  }, [gameState, playerId, selectedCardIds]);

  const playFaceDownCard = useCallback((card) => {
    if (!gameState) return;
    
    const playerState = gameState.players[playerId];
    const newFaceDown = playerState.faceDown.filter(c => c.id !== card.id);
    const newPile = [...gameState.pile, card];

    if (!canPlayOnPile(card, gameState.pile, gameState.isReversed)) {
      // Failed blind play
      updateGameState({
        ...gameState,
        pile: newPile,
        players: {
          ...gameState.players,
          [playerId]: { ...playerState, faceDown: newFaceDown }
        },
        customMessage: `Revealed: ${card.rank}...`
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
          customMessage: "Blind play failed! Took the pile."
        });
      }, 1200);
    } else {
      // Success
      processAfterPlay({
        ...gameState,
        pile: newPile,
        players: {
          ...gameState.players,
          [playerId]: { ...playerState, faceDown: newFaceDown }
        }
      }, card, playerId);
    }
    
    setSelectedCardIds([]);
  }, [gameState, playerId]);

  const playCards = useCallback((cardsToPlay = selectedCardIds) => {
    if (!gameState || gameState.currentTurn !== playerId) return;
    
    // Ensure cardsToPlay is an array
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

  const processAfterPlay = useCallback((newState, playedCard, who) => {
    let updatedState = { ...newState, customMessage: null };

    // Check for burn
    let burned = false;
    if (playedCard.rank === 10 || checkFourOfAKind(updatedState.pile)) {
      burned = true;
      updatedState.customMessage = playedCard.rank === 10 ? "🔥 10 played! Burning pile..." : "🔥 Four of a kind! Burning pile...";
      
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

    // Check for reverse or wild
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
    if (!burned) {
      const nextPlayer = getNextPlayer(who, updatedState.players);
      updatedState.currentTurn = nextPlayer;
    }

    updateGameState(updatedState);
  }, [updateGameState]);

  const confirmSwap = useCallback(async () => {
    if (!gameState || gameState.phase !== "swap") return;

    const playerState = gameState.players[playerId];
    if (playerState?.swapReady) return; // Already ready
    
    // Mark this player as ready for swap
    const updatedPlayers = {
      ...gameState.players,
      [playerId]: { ...playerState, swapReady: true }
    };

    // Check if all players are ready
    const allReady = Object.values(updatedPlayers).every(p => p.swapReady);

    if (allReady) {
      // Determine who goes first - player with lowest non-special card
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
      
      // All players ready - start the game
      await updateGameState({
        ...gameState,
        players: updatedPlayers,
        phase: "playing",
        currentTurn: lowestPlayer,
        customMessage: null
      });
    } else {
      // Just mark this player as ready
      await updateGameState({
        ...gameState,
        players: updatedPlayers
      });
    }
    
    setSelectedCardIds([]);
  }, [gameState, playerId, updateGameState]);

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

  const canPlay = gameState?.phase === "playing" &&
    gameState?.currentTurn === playerId &&
    selectedCardIds.length > 0;

  const canTakePile = gameState?.phase === "playing" &&
    gameState?.currentTurn === playerId &&
    gameState?.pile?.length > 0;

  return {
    gameState,
    myState: gameState?.players?.[playerId],
    selectedCardIds,
    message,
    selectCard,
    confirmSwap,
    playCards,
    takePile,
    canPlay,
    canTakePile,
  };
}