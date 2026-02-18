import {
  createRoom,
  getRoom,
  updateGameState,
  addChatMessage,
  updatePlayers,
  deactivateRoom,
  cleanupOldRooms
} from './db.js';

// In-memory tracking for active connections
const rooms = new Map(); // roomCode -> { sockets: Set, players: Map }
const playerSockets = new Map(); // socketId -> { roomCode, playerId }

// Generate random 6-character room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper to create and shuffle deck
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

export function setupSocketHandlers(io) {
  // Cleanup old rooms every hour
  setInterval(() => {
    cleanupOldRooms(1);
  }, 60 * 60 * 1000);

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Create a new game room
    socket.on('createRoom', async ({ playerId, playerName }, callback) => {
      try {
        const roomCode = generateRoomCode();

        const players = [{
          id: playerId,
          name: playerName,
          socketId: socket.id,
          connected: true
        }];

        // Save to database
        await createRoom(roomCode, players);

        // Track in memory
        rooms.set(roomCode, {
          sockets: new Set([socket.id]),
          players: new Map([[playerId, { name: playerName, socketId: socket.id }]])
        });

        playerSockets.set(socket.id, { roomCode, playerId, isSpectator: false });

        // Join socket.io room
        socket.join(roomCode);

        console.log(`✅ Room ${roomCode} created by ${playerName}`);

        if (callback) {
          callback({ success: true, roomCode, playerId });
        } else {
          socket.emit('roomCreated', { roomCode, playerId });
        }
      } catch (error) {
        console.error('Error creating room:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('error', { message: 'Failed to create room' });
        }
      }
    });

    // Join an existing room
    socket.on('joinRoom', async ({ roomCode, playerId, playerName }, callback) => {
      try {
        const room = await getRoom(roomCode);

        if (!room) {
          const error = { message: 'Room not found' };
          if (callback) {
            callback({ success: false, error: error.message });
          } else {
            socket.emit('error', error);
          }
          return;
        }

        const players = room.players || [];
        const gameState = room.game_state;
        const isGameInProgress = gameState && gameState.phase !== 'idle';

        // Check if joining as spectator
        if (isGameInProgress || players.length >= 2) {
          // Join as spectator
          socket.join(roomCode);
          playerSockets.set(socket.id, { roomCode, playerId, isSpectator: true });

          // Track in memory
          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { sockets: new Set(), players: new Map() });
          }
          rooms.get(roomCode).sockets.add(socket.id);

          console.log(`👁️ ${playerName} joined ${roomCode} as spectator`);

          if (callback) {
            callback({ success: true, roomCode, gameState, isSpectator: true });
          } else {
            socket.emit('joinedAsSpectator', { roomCode, gameState });
          }

          io.to(roomCode).emit('spectatorJoined', { playerName });
        } else {
          // Join as player
          const newPlayer = {
            id: playerId,
            name: playerName,
            socketId: socket.id,
            connected: true
          };

          players.push(newPlayer);
          await updatePlayers(roomCode, players);

          // Track in memory
          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { sockets: new Set(), players: new Map() });
          }
          const roomData = rooms.get(roomCode);
          roomData.sockets.add(socket.id);
          roomData.players.set(playerId, { name: playerName, socketId: socket.id });

          playerSockets.set(socket.id, { roomCode, playerId, isSpectator: false });
          socket.join(roomCode);

          console.log(`✅ ${playerName} joined ${roomCode} as player`);

          if (callback) {
            callback({ success: true, roomCode, playerId, players });
          } else {
            socket.emit('joinedRoom', { roomCode, playerId, players });
          }

          io.to(roomCode).emit('playerJoined', { player: newPlayer });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('error', { message: 'Failed to join room' });
        }
      }
    });

    // Toggle ready status
    socket.on('toggleReady', async ({ roomCode, playerId, isReady }) => {
      try {
        const room = await getRoom(roomCode);

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const players = room.players || [];
        const playerIndex = players.findIndex(p => p.id === playerId);

        if (playerIndex !== -1) {
          // Update player's ready status
          players[playerIndex].isReady = isReady;
          await updatePlayers(roomCode, players);

          // Broadcast to all players in room
          io.to(roomCode).emit('playerReadyChanged', { playerId, isReady });

          console.log(`🎯 ${players[playerIndex].name} is ${isReady ? 'ready' : 'not ready'} in ${roomCode}`);

          // Check if all players are ready
          const allReady = players.every(p => p.isReady) && players.length >= 2;

          if (allReady) {
            console.log(`🎮 All players ready in ${roomCode}, starting game...`);

            // Create initial game state
            const deck = createDeck();
            let idx = 0;

            const playerStates = {};
            players.forEach(player => {
              playerStates[player.id] = {
                name: player.name,
                hand: deck.slice(idx, idx + 3),
                faceUp: deck.slice(idx + 3, idx + 6),
                faceDown: deck.slice(idx + 6, idx + 9),
                swapReady: false,
              };
              idx += 9;
            });

            const initialState = {
              phase: "swap",
              deck: deck.slice(idx),
              pile: [],
              players: playerStates,
              currentTurn: players[0].id,
              isReversed: false,
              winner: null,
              customMessage: null,
            };

            await updateGameState(roomCode, initialState);
            io.to(roomCode).emit('gameStateUpdated', { gameState: initialState });
          }
        }
      } catch (error) {
        console.error('Error toggling ready:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Update game state
    socket.on('gameStateUpdate', async ({ roomCode, gameState }) => {
      try {
        // Save to database
        await updateGameState(roomCode, gameState);

        // Broadcast to all other players in room
        socket.to(roomCode).emit('gameStateUpdated', { gameState });

        console.log(`🎮 Game state updated in ${roomCode}`);
      } catch (error) {
        console.error('Error updating game state:', error);
        socket.emit('error', { message: 'Failed to update game state' });
      }
    });

    // Chat message
    socket.on('chatMessage', async ({ roomCode, message }) => {
      try {
        const timestamp = Date.now();
        const chatMessage = { ...message, timestamp };

        // Save to database
        const allMessages = await addChatMessage(roomCode, chatMessage);

        // Broadcast to all in room (including sender)
        io.to(roomCode).emit('newChatMessage', { message: chatMessage, allMessages });

        console.log(`💬 Chat message in ${roomCode}: ${message.text}`);
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Load initial game state (for reconnects)
    socket.on('loadGameState', async ({ roomCode }, callback) => {
      try {
        const room = await getRoom(roomCode);

        if (callback) {
          callback({
            success: true,
            gameState: room?.game_state,
            chatMessages: room?.chat_messages || [],
            players: room?.players || []
          });
        }
      } catch (error) {
        console.error('Error loading game state:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Reconnect to existing game
    socket.on('reconnect', async ({ roomCode, playerId }) => {
      try {
        const room = await getRoom(roomCode);

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const players = room.players || [];
        const playerIndex = players.findIndex(p => p.id === playerId);

        if (playerIndex !== -1) {
          // Update player's connection status
          players[playerIndex].connected = true;
          players[playerIndex].socketId = socket.id;
          delete players[playerIndex].disconnectedAt;
          delete players[playerIndex].replacedByAI;

          await updatePlayers(roomCode, players);

          // Update in-memory tracking
          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { sockets: new Set(), players: new Map() });
          }
          const roomData = rooms.get(roomCode);
          roomData.sockets.add(socket.id);
          roomData.players.set(playerId, {
            name: players[playerIndex].name,
            socketId: socket.id
          });

          playerSockets.set(socket.id, { roomCode, playerId, isSpectator: false });
          socket.join(roomCode);

          // Send current state to reconnected player
          socket.emit('reconnected', {
            gameState: room.game_state,
            chatMessages: room.chat_messages || [],
            players
          });

          // Notify others
          socket.to(roomCode).emit('playerReconnected', {
            playerId,
            playerName: players[playerIndex].name
          });

          console.log(`🔄 ${players[playerIndex].name} reconnected to ${roomCode}`);
        }
      } catch (error) {
        console.error('Error reconnecting:', error);
        socket.emit('error', { message: 'Failed to reconnect' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      const playerData = playerSockets.get(socket.id);

      if (playerData && !playerData.isSpectator) {
        const { roomCode, playerId } = playerData;

        try {
          const room = await getRoom(roomCode);

          if (room) {
            const players = room.players || [];
            const playerIndex = players.findIndex(p => p.id === playerId);

            if (playerIndex !== -1) {
              // Mark as disconnected
              players[playerIndex].connected = false;
              players[playerIndex].disconnectedAt = Date.now();

              await updatePlayers(roomCode, players);

              // Update in-memory tracking
              if (rooms.has(roomCode)) {
                rooms.get(roomCode).sockets.delete(socket.id);
              }

              // Notify other players
              io.to(roomCode).emit('playerDisconnected', {
                playerId,
                playerName: players[playerIndex].name
              });

              // Set 30-second timeout for AI replacement
              setTimeout(async () => {
                try {
                  const currentRoom = await getRoom(roomCode);
                  if (!currentRoom) return;

                  const currentPlayers = currentRoom.players || [];
                  const currentPlayer = currentPlayers.find(p => p.id === playerId);

                  if (currentPlayer && !currentPlayer.connected) {
                    currentPlayer.replacedByAI = true;
                    await updatePlayers(roomCode, currentPlayers);

                    io.to(roomCode).emit('playerReplacedByAI', { playerId });
                    console.log(`🤖 Player ${playerId} replaced by AI in ${roomCode}`);
                  }
                } catch (error) {
                  console.error('Error handling AI replacement:', error);
                }
              }, 30000);

              console.log(`⚠️ ${players[playerIndex].name} disconnected from ${roomCode}`);
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }

      playerSockets.delete(socket.id);
    });
  });

  console.log('✅ Socket handlers registered');
}