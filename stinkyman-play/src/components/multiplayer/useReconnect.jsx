import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSocket } from "./SocketContext";

export default function useReconnect() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [reconnectData, setReconnectData] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  // Load saved session from localStorage on mount
  useEffect(() => {
    const savedPlayerId = localStorage.getItem("multiplayer_playerId");
    const savedPlayerName = localStorage.getItem("multiplayer_playerName");
    const savedRoomCode = localStorage.getItem("multiplayer_roomCode");
    const savedTimestamp = localStorage.getItem("multiplayer_timestamp");

    if (savedPlayerId && savedPlayerName && savedRoomCode && savedTimestamp) {
      const age = Date.now() - parseInt(savedTimestamp);
      if (age < 10 * 60 * 1000) {
        setReconnectData({ playerId: savedPlayerId, playerName: savedPlayerName, roomCode: savedRoomCode });
      } else {
        clearReconnectData();
      }
    }
  }, []);

  const saveReconnectData = (roomId, playerId, playerName, roomCode) => {
    localStorage.setItem("multiplayer_roomId", roomId);
    localStorage.setItem("multiplayer_playerId", playerId);
    localStorage.setItem("multiplayer_playerName", playerName);
    localStorage.setItem("multiplayer_roomCode", roomCode);
    localStorage.setItem("multiplayer_timestamp", Date.now().toString());
  };

  const clearReconnectData = useCallback(() => {
    localStorage.removeItem("multiplayer_roomId");
    localStorage.removeItem("multiplayer_playerId");
    localStorage.removeItem("multiplayer_playerName");
    localStorage.removeItem("multiplayer_roomCode");
    localStorage.removeItem("multiplayer_timestamp");
    setReconnectData(null);
  }, []);

  const attemptReconnect = useCallback(() => {
    if (!reconnectData || !socket || !connected) return;

    setIsReconnecting(true);

    socket.emit('reconnect', {
      roomCode: reconnectData.roomCode,
      playerId: reconnectData.playerId,
    });

    const handleReconnected = ({ gameState }) => {
      clearTimeout(reconnectTimeoutRef.current);
      setIsReconnecting(false);

      if (gameState && gameState.phase !== 'gameOver' && gameState.phase !== 'idle') {
        navigate(createPageUrl("MultiplayerGame"), {
          state: {
            roomCode: reconnectData.roomCode,
            playerId: reconnectData.playerId,
            playerName: reconnectData.playerName,
          }
        });
      } else {
        clearReconnectData();
      }
    };

    const handleError = () => {
      clearTimeout(reconnectTimeoutRef.current);
      setIsReconnecting(false);
      clearReconnectData();
    };

    socket.once('reconnected', handleReconnected);
    socket.once('error', handleError);

    // 5s timeout if server doesn't respond
    reconnectTimeoutRef.current = setTimeout(() => {
      socket.off('reconnected', handleReconnected);
      socket.off('error', handleError);
      setIsReconnecting(false);
      clearReconnectData();
    }, 5000);
  }, [reconnectData, socket, connected, navigate, clearReconnectData]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return {
    reconnectData,
    isReconnecting,
    saveReconnectData,
    clearReconnectData,
    attemptReconnect,
  };
}
