import { Server } from "npm:socket.io@4.7.5";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const rooms = new Map(); // roomCode -> { players, gameState, spectators }
const playerSockets = new Map(); // socketId -> { roomCode, playerId, isSpectator }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    const io = new Server();
    io.attach(socket);
    
    io.on("connection", (clientSocket) => {
      console.log("Client connected:", clientSocket.id);
      
      clientSocket.on("createRoom", ({ playerId, playerName }) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
          players: [{ id: playerId, name: playerName, socketId: clientSocket.id, connected: true }],
          gameState: null,
          spectators: [],
          createdAt: Date.now(),
        });
        
        playerSockets.set(clientSocket.id, { roomCode, playerId, isSpectator: false });
        clientSocket.join(roomCode);
        
        clientSocket.emit("roomCreated", { roomCode, playerId });
        console.log(`Room ${roomCode} created by ${playerName}`);
      });
      
      clientSocket.on("joinRoom", ({ roomCode, playerId, playerName }) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
          clientSocket.emit("error", { message: "Room not found" });
          return;
        }
        
        // Check if game already in progress
        const isGameInProgress = room.gameState && room.gameState.phase !== "idle";
        
        if (isGameInProgress) {
          // Join as spectator
          room.spectators.push({ id: playerId, name: playerName, socketId: clientSocket.id });
          playerSockets.set(clientSocket.id, { roomCode, playerId, isSpectator: true });
          clientSocket.join(roomCode);
          clientSocket.emit("joinedAsSpectator", { roomCode, gameState: room.gameState });
          io.to(roomCode).emit("spectatorJoined", { playerName });
        } else if (room.players.length < 2) {
          // Join as player
          room.players.push({ id: playerId, name: playerName, socketId: clientSocket.id, connected: true });
          playerSockets.set(clientSocket.id, { roomCode, playerId, isSpectator: false });
          clientSocket.join(roomCode);
          clientSocket.emit("joinedRoom", { roomCode, playerId, players: room.players });
          io.to(roomCode).emit("playerJoined", { player: { id: playerId, name: playerName } });
        } else {
          clientSocket.emit("error", { message: "Room is full" });
        }
      });
      
      clientSocket.on("gameStateUpdate", ({ roomCode, gameState }) => {
        const room = rooms.get(roomCode);
        if (room) {
          room.gameState = gameState;
          clientSocket.to(roomCode).emit("gameStateUpdated", { gameState });
        }
      });
      
      clientSocket.on("disconnect", () => {
        console.log("Client disconnected:", clientSocket.id);
        const playerData = playerSockets.get(clientSocket.id);
        
        if (playerData && !playerData.isSpectator) {
          const room = rooms.get(playerData.roomCode);
          if (room) {
            const player = room.players.find(p => p.id === playerData.playerId);
            if (player) {
              player.connected = false;
              player.disconnectedAt = Date.now();
              
              // Notify other players
              io.to(playerData.roomCode).emit("playerDisconnected", { 
                playerId: playerData.playerId,
                playerName: player.name 
              });
              
              // Set 30 second timeout for AI replacement
              setTimeout(() => {
                const currentRoom = rooms.get(playerData.roomCode);
                const currentPlayer = currentRoom?.players.find(p => p.id === playerData.playerId);
                
                if (currentPlayer && !currentPlayer.connected) {
                  currentPlayer.replacedByAI = true;
                  io.to(playerData.roomCode).emit("playerReplacedByAI", { 
                    playerId: playerData.playerId 
                  });
                }
              }, 30000);
            }
          }
        }
        
        playerSockets.delete(clientSocket.id);
      });
      
      clientSocket.on("reconnect", ({ roomCode, playerId }) => {
        const room = rooms.get(roomCode);
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.connected = true;
            player.replacedByAI = false;
            player.socketId = clientSocket.id;
            delete player.disconnectedAt;
            
            playerSockets.set(clientSocket.id, { roomCode, playerId, isSpectator: false });
            clientSocket.join(roomCode);
            
            clientSocket.emit("reconnected", { gameState: room.gameState });
            io.to(roomCode).emit("playerReconnected", { playerId, playerName: player.name });
          }
        }
      });
    });
    
    return response;
  }
  
  return new Response("WebSocket upgrade required", { status: 426 });
});