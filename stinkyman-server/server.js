import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socketHandlers.js';
import { initDatabase } from './db.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize database
console.log('🔄 Initializing database...');
await initDatabase();
console.log('✅ Database initialized');

// Setup socket handlers
console.log('🔄 Setting up socket handlers...');
setupSocketHandlers(io);
console.log('✅ Socket handlers ready');

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('📍 Health check endpoint hit!');
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  console.log('📍 Root endpoint hit!');
  res.json({ status: 'ok', message: 'Socket.io server running' });
});

// Get active rooms endpoint
app.get('/api/rooms', async (req, res) => {
  console.log('📍 Rooms endpoint hit!');
  try {
    const { getActiveRooms } = await import('./db.js');
    const rooms = await getActiveRooms();
    res.json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

const PORT = process.env.PORT || 3001;

console.log(`🔄 Starting HTTP server on port ${PORT}...`);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Socket.io server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Allowed origins:`, allowedOrigins);
  console.log(`🎯 Server is ready to accept connections on 0.0.0.0:${PORT}`);
});

// Log any server errors
httpServer.on('error', (error) => {
  console.error('❌ HTTP Server Error:', error);
});

// Graceful shutdown - but don't exit immediately
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: starting graceful shutdown');
  
  // Close server but give time for existing connections
  httpServer.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    console.log('HTTP server closed gracefully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});

console.log('🚀 Server initialization complete');