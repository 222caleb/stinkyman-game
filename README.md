# 🃏 Stinkyman

A real-time multiplayer card game built with React and Socket.io. Play strategic card battles with friends in this fast-paced web adaptation of the classic game Palace.

**[Play Live →](https://www.stinky-man-play.com)**

## Overview

Stinkyman demonstrates modern full-stack development with real-time multiplayer features, state management, and scalable architecture. Players compete to be the first to discard all their cards using special abilities and tactical card plays.

### Key Features

- Real-time multiplayer with Socket.io
- Room-based matchmaking (2-6 players)
- In-game chat system
- Auto-reconnect on disconnect
- Responsive design with smooth animations
- PostgreSQL state persistence

## Tech Stack

**Frontend:** React • Vite • Tailwind CSS • Framer Motion • Socket.io Client

**Backend:** Node.js • Express • Socket.io • PostgreSQL

**Deployment:** Vercel (Frontend) • Railway (Backend)

## How to Play

1. **Setup:** Each player gets 3 hand cards, 3 face-up cards, and 3 face-down cards
2. **Swap Phase:** Arrange your cards strategically
3. **Play:** Cards must be equal or higher than the pile's top card
4. **Special Cards:**
   - **2:** Wild card, resets pile
   - **5:** Reverses play direction
   - **10:** Burns the pile
5. **Win:** First player to discard all cards wins

## Architecture Highlights

- WebSocket-based real-time state synchronization
- Optimistic UI updates for responsive gameplay
- Room-based game state management
- Automatic reconnection with grace period
- CORS-configured for production deployment

**Live Demo:** [www.stinky-man-play.com](https://www.stinky-man-play.com)
