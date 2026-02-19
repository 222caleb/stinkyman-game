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
      if (player.id === playerId) {
        console.log('Ignoring self join event.')
        return;
      }
      setRoomPlayers(prev => [...prev, {
        id: player.id,
        name: player.name,
        isReady: false
      }]);
      toast.success(`${player.name} joined!`);
    });

    // Player ready status changed
    socket.on('playerReadyChanged', ({ playerId: changedPlayerId, isReady }) => {
      console.log('🎯 Player ready changed:', changedPlayerId, isReady);
      setRoomPlayers(prev => prev.map(p =>
        p.id === changedPlayerId ? { ...p, isReady } : p
      ));
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
      socket.off('playerReadyChanged');
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

  const handleToggleReady = () => {
    if (roomPlayers.length < 2) {
      toast.error("Need at least 2 players!");
      return;
    }

    const currentPlayer = roomPlayers.find(p => p.id === playerId);
    const newReadyState = !currentPlayer?.isReady;

    console.log('🎯 Toggling ready:', playerId, newReadyState);
    socket.emit('toggleReady', { roomCode, playerId, isReady: newReadyState });
  };

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
                    {player.isReady ? (
                      <span className="text-green-400 text-sm font-semibold">✓ Ready</span>
                    ) : (
                      <span className="text-white/40 text-sm">Not Ready</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleToggleReady}
              disabled={roomPlayers.length < 2}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold disabled:opacity-50 mb-2"
            >
              {roomPlayers.find(p => p.id === playerId)?.isReady ? "Unready" : "Ready Up!"}
            </Button>

            <Button
              onClick={() => {
                navigate(createPageUrl("MainMenu"));
              }}
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
            >
              Leave Room
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}