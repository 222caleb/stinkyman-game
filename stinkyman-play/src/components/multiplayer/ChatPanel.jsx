import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "./SocketContext";

const QUICK_MESSAGES = [
  { emoji: "👋", text: "Hello!" },
  { emoji: "👍", text: "Nice move!" },
  { emoji: "😅", text: "Oops!" },
  { emoji: "🎉", text: "Good game!" },
  { emoji: "⏰", text: "Hurry up!" },
  { emoji: "🤔", text: "Thinking..." },
];

export default function ChatPanel({ roomCode, playerName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [lastReadCount, setLastReadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  
  const hasUnread = messages.length > lastReadCount;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    // Load initial messages
    socket.emit('loadGameState', { roomCode }, (response) => {
      if (response.success && response.chatMessages) {
        setMessages(response.chatMessages);
      }
    });

    // Listen for new chat messages
    const handleNewMessage = ({ message, allMessages }) => {
      if (allMessages) {
        setMessages(allMessages);
      } else if (message) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('newChatMessage', handleNewMessage);

    return () => {
      socket.off('newChatMessage', handleNewMessage);
    };
  }, [socket, roomCode]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || !roomCode || !socket) return;

    const newMessage = {
      sender: playerName,
      text: messageText,
    };

    socket.emit('chatMessage', {
      roomCode,
      message: newMessage
    });

    setInputText("");
  };

  const handleQuickMessage = (msg) => {
    sendMessage(`${msg.emoji} ${msg.text}`);
  };

  const handleSendText = () => {
    sendMessage(inputText);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setLastReadCount(messages.length);
          }
        }}
        size="icon"
        className="fixed bottom-24 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {messages.length - lastReadCount}
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-44 right-6 z-40 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
              <h3 className="font-bold text-lg">Game Chat</h3>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-2 bg-white/50">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No messages yet. Say hi! 👋
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === playerName ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 max-w-[80%] ${
                        msg.sender === playerName
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-xs font-semibold opacity-70 mb-0.5">
                        {msg.sender}
                      </p>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Messages */}
            <div className="px-3 py-2 bg-white/80 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-1">
                {QUICK_MESSAGES.map((msg, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleQuickMessage(msg)}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-2"
                  >
                    {msg.emoji}
                  </Button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleSendText}
                disabled={!inputText.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}