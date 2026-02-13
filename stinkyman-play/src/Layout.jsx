import React from "react";
import { SocketProvider } from "@/components/multiplayer/SocketContext";

export default function Layout({ children, currentPageName }) {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}