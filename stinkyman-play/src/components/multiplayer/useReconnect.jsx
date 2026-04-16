import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function useReconnect() {
  const navigate = useNavigate();
  const [reconnectData, setReconnectData] = useState(null);

  useEffect(() => {
    const savedRoomId = localStorage.getItem("multiplayer_roomId");
    const savedPlayerId = localStorage.getItem("multiplayer_playerId");
    const savedPlayerName = localStorage.getItem("multiplayer_playerName");
    const savedRoomCode = localStorage.getItem("multiplayer_roomCode");
    const savedTimestamp = localStorage.getItem("multiplayer_timestamp");

    if (savedRoomId && savedPlayerId && savedPlayerName && savedRoomCode && savedTimestamp) {
      const age = Date.now() - parseInt(savedTimestamp);
      if (age < 10 * 60 * 1000) {
        setReconnectData({
          roomId: savedRoomId,
          playerId: savedPlayerId,
          playerName: savedPlayerName,
          roomCode: savedRoomCode
        });
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

  const clearReconnectData = () => {
    localStorage.removeItem("multiplayer_roomId");
    localStorage.removeItem("multiplayer_playerId");
    localStorage.removeItem("multiplayer_playerName");
    localStorage.removeItem("multiplayer_roomCode");
    localStorage.removeItem("multiplayer_timestamp");
  };

  const reconnect = () => {
    if (reconnectData) {
      navigate(createPageUrl("MultiplayerGame"), {
        state: reconnectData
      });
      setReconnectData(null);
    }
  };

  return {
    reconnectData,
    saveReconnectData,
    clearReconnectData,
    reconnect
  };
}
