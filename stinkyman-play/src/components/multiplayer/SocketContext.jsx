import React, { createContext, useContext, useState, useEffect } from "react";
import socket from './SocketClientWrapper';

const MultiplayerContext = createContext(null);

export function useSocket() {
  return useContext(MultiplayerContext);
}

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <MultiplayerContext.Provider value={{ socket, connected }}>
      {children}
    </MultiplayerContext.Provider>
  );
}