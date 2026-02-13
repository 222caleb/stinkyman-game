import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useSocket } from "@/components/multiplayer/SocketContext";
import { toast } from "sonner";

export default function MultiplayerLobby() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [mode, setMode] = useState("menu"); // menu, create, join, waiting
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerId] = useState(() => `player_${Math.random().toString(36).substr(2, 9)}`);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room created successfully
    socket.on('roomCreated', ({ roomCode: code }) => {
      console.log('✅ Room created:', code);
      setRoomCode(code);
      setIsHost(true);
      setRoomPlayers([{ id: playerId, name: playerName, isReady: false }]);
      setMode("waiting");
      toast.success(`Room created! Code: ${code}`);
    });

    // Joined room successfully
    socket.on('joinedRoom', ({ roomCode: code, players }) => {
      console.log('✅ Joined room:', code, players);
      setRoomCode(code);
      setIsHost(false);
      setRoomPlayers(players.map(p => ({ 
        id: p.id, 
        name: p.name, 
        isReady: false 
      })));
      setMode("waiting");
      toast.success("Joined room!");
    });

    // Another player joined
    socket.on('playerJoined', ({ player }) => {
      console.log('👥 Player joined:', player);
      setRoomPlayers(prev => [...prev, { 
        id: player.id, 
        name: player.name, 
        isReady: false 
      }]);
      toast.success(`${player.name} joined!`);
    });

    // Game state updated
    socket.on('gameStateUpdated', ({ gameState }) => {
      console.log('🎮 Game state updated:', gameState);
      if (gameState.phase === 'swap' || gameState.phase === 'playing') {
        // Game started, navigate to game
        navigate(createPageUrl("MultiplayerGame"), {
          state: { roomCode, playerId, playerName }
        });
      }
    });

    // Player disconnected
    socket.on('playerDisconnected', ({ playerName: disconnectedName }) => {
      toast.error(`${disconnectedName} disconnected`);
      setRoomPlayers(prev => prev.filter(p => p.name !== disconnectedName));
    });

    // Error handling
    socket.on('error', ({ message }) => {
      console.error('❌ Socket error:', message);
      toast.error(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
      socket.off('playerJoined');
      socket.off('gameStateUpdated');
      socket.off('playerDisconnected');
      socket.off('error');
    };
  }, [socket, playerId, playerName, roomCode, navigate]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    console.log('🎯 Creating room...', { playerId, playerName });
    socket.emit('createRoom', { playerId, playerName: playerName.trim() });
    setMode("waiting");
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) {
      toast.error("Please enter your name and room code");
      return;
    }

    console.log('🎯 Joining room...', { roomCode: joinCode, playerId, playerName });
    socket.emit('joinRoom', { 
      roomCode: joinCode.trim().toUpperCase(), 
      playerId, 
      playerName: playerName.trim() 
    });
  };

  const handleStartGame = () => {
    if (roomPlayers.length < 2) {
      toast.error("Need at least 2 players!");
      return;
    }

    if (!isHost) {
      toast.error("Only the host can start the game");
      return;
    }

    console.log('🎯 Starting game...');

    // Create initial game state
    const deck = createDeck();
    let idx = 0;
    
    const playerStates = {};
    roomPlayers.forEach(player => {
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
      currentTurn: roomPlayers[0].id,
      isReversed: false,
      winner: null,
      customMessage: null,
    };

    socket.emit('gameStateUpdate', { roomCode, gameState: initialState });
    
    // Navigate immediately for host
    navigate(createPageUrl("MultiplayerGame"), {
      state: { roomCode, playerId, playerName }
    });
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        {mode === "menu" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => navigate(createPageUrl("MainMenu"))}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-white">Multiplayer</h1>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />

              <Button
                onClick={() => setMode("create")}
                disabled={!connected || !playerName.trim()}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Game
              </Button>

              <Button
                onClick={() => setMode("join")}
                disabled={!connected || !playerName.trim()}
                variant="outline"
                className="w-full border-2 border-white/30 text-white hover:bg-white/10 bg-transparent gap-2"
              >
                <Users className="w-5 h-5" />
                Join Game
              </Button>

              {!connected && (
                <p className="text-center text-white/60 text-sm">Connecting to server...</p>
              )}
            </div>
          </Card>
        )}

        {mode === "create" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => setMode("menu")}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-white">Create Game</h2>
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={!connected}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold"
            >
              Create Room
            </Button>
          </Card>
        )}

        {mode === "join" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => setMode("menu")}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-white">Join Game</h2>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-2xl font-bold tracking-widest"
                maxLength={6}
              />

              <Button
                onClick={handleJoinRoom}
                disabled={!connected}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold"
              >
                Join Room
              </Button>
            </div>
          </Card>
        )}

        {mode === "waiting" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
            <h2 className="text-xl font-bold text-white mb-4">Room Code</h2>
            <div className="bg-black/20 rounded-lg p-6 mb-6 text-center">
              <p className="text-4xl font-bold text-yellow-400 tracking-widest">
                {roomCode}
              </p>
              <p className="text-white/60 text-sm mt-2">Share this code with your opponent</p>
            </div>

            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Players ({roomPlayers.length}/6)</h3>
              <div className="space-y-2">
                {roomPlayers.map((player, idx) => (
                  <div key={idx} className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white font-medium">
                      {player.name}
                      {player.id === playerId && " (You)"}
                      {idx === 0 && " 👑"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isHost && (
              <Button
                onClick={handleStartGame}
                disabled={roomPlayers.length < 2}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold disabled:opacity-50 mb-2"
              >
                Start Game
              </Button>
            )}

            {!isHost && (
              <p className="text-center text-white/60 text-sm mb-2">
                Waiting for host to start the game...
              </p>
            )}

            <Button
              onClick={() => {
                navigate(createPageUrl("MainMenu"));
              }}
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}