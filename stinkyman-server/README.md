# Stinkyman Socket.io Server

Backend server for the Stinkyman multiplayer card game using Socket.io and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)
- Your Stinkyman frontend app

### 1. Set Up Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to **SQL Editor** and run this:

```sql
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    game_state JSONB,
    chat_messages JSONB DEFAULT '[]'::jsonb,
    players JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_room_code ON game_rooms(room_code);
CREATE INDEX idx_active_rooms ON game_rooms(is_active) WHERE is_active = true;
```

3. Copy your connection string from **Settings → Database → Connection String**

### 2. Install Dependencies

```bash
cd stinkyman-server
npm install
```

### 3. Configure Environment

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 4. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Database connected successfully
✅ Database tables ready
✅ Socket handlers registered
✅ Socket.io server running on port 3001
```

## 🌐 Frontend Configuration

In your Stinkyman frontend app, create/update `.env`:

```env
VITE_SOCKET_URL=http://localhost:3001
```

Then restart your frontend dev server.

## 📡 Socket Events

### Client → Server

- `createRoom` - Create a new game room
  - Payload: `{ playerId, playerName }`
  - Response: `{ roomCode, playerId }`

- `joinRoom` - Join existing room
  - Payload: `{ roomCode, playerId, playerName }`
  - Response: `{ roomCode, playerId, players }` or spectator status

- `gameStateUpdate` - Update game state
  - Payload: `{ roomCode, gameState }`

- `chatMessage` - Send chat message
  - Payload: `{ roomCode, message: { sender, text } }`

- `loadGameState` - Load current game state (for reconnects)
  - Payload: `{ roomCode }`
  - Response: `{ gameState, chatMessages, players }`

- `reconnect` - Reconnect after disconnect
  - Payload: `{ roomCode, playerId }`

### Server → Client

- `roomCreated` - Room successfully created
- `joinedRoom` - Successfully joined as player
- `joinedAsSpectator` - Joined as spectator (game in progress)
- `playerJoined` - Another player joined
- `spectatorJoined` - A spectator joined
- `gameStateUpdated` - Game state changed
- `newChatMessage` - New chat message received
- `playerDisconnected` - Player disconnected
- `playerReconnected` - Player reconnected
- `playerReplacedByAI` - Disconnected player replaced by AI (after 30s)
- `reconnected` - Successfully reconnected with current state
- `error` - Error occurred

## 🚢 Deployment

### Railway (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard:
   - `DATABASE_URL` (from Supabase)
   - `PORT` (Railway sets this automatically)
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app`

4. Your server will be live at: `https://your-app.railway.app`

### Render

1. Connect your GitHub repo
2. Create new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

### Docker (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t stinkyman-server .
docker run -p 3001:3001 --env-file .env stinkyman-server
```

## 🔧 Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Check Supabase project is not paused (free tier auto-pauses after 7 days inactivity)
- Ensure connection pooling is enabled in Supabase

### CORS Errors
- Add your frontend URL to `ALLOWED_ORIGINS` in `.env`
- Restart the server after changing `.env`

### Socket Not Connecting
- Verify server is running on the correct port
- Check `VITE_SOCKET_URL` matches your server URL
- Open browser console to see connection errors

### Port Already in Use
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

## 📊 API Endpoints

- `GET /health` - Health check
  - Response: `{ status: 'ok', timestamp: '...' }`

- `GET /api/rooms` - Get all active rooms
  - Response: `{ rooms: [...] }`

## 🧹 Maintenance

The server automatically:
- Cleans up inactive rooms older than 24 hours (every hour)
- Replaces disconnected players with AI after 30 seconds
- Handles reconnections within grace period

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` or `production` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:5173,https://app.com` |

## 🐛 Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## 📄 License

Same as your main Stinkyman project.