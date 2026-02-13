import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_code VARCHAR(10) UNIQUE NOT NULL,
        game_state JSONB,
        chat_messages JSONB DEFAULT '[]'::jsonb,
        players JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE INDEX IF NOT EXISTS idx_room_code ON game_rooms(room_code);
      CREATE INDEX IF NOT EXISTS idx_active_rooms ON game_rooms(is_active) WHERE is_active = true;
    `);
    
    console.log('✅ Database tables ready');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Create a new game room
export async function createRoom(roomCode, players) {
  const query = `
    INSERT INTO game_rooms (room_code, players, is_active)
    VALUES ($1, $2, true)
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [roomCode, JSON.stringify(players)]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

// Get room by code
export async function getRoom(roomCode) {
  const query = `
    SELECT * FROM game_rooms
    WHERE room_code = $1 AND is_active = true;
  `;
  
  try {
    const result = await pool.query(query, [roomCode]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

// Update game state
export async function updateGameState(roomCode, gameState) {
  const query = `
    UPDATE game_rooms
    SET game_state = $1, updated_at = NOW()
    WHERE room_code = $2 AND is_active = true
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [JSON.stringify(gameState), roomCode]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
}

// Add chat message
export async function addChatMessage(roomCode, message) {
  const query = `
    UPDATE game_rooms
    SET chat_messages = chat_messages || $1::jsonb,
        updated_at = NOW()
    WHERE room_code = $2 AND is_active = true
    RETURNING chat_messages;
  `;
  
  try {
    const result = await pool.query(query, [JSON.stringify([message]), roomCode]);
    return result.rows[0]?.chat_messages || [];
  } catch (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }
}

// Update players
export async function updatePlayers(roomCode, players) {
  const query = `
    UPDATE game_rooms
    SET players = $1, updated_at = NOW()
    WHERE room_code = $2 AND is_active = true
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [JSON.stringify(players), roomCode]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating players:', error);
    throw error;
  }
}

// Deactivate room
export async function deactivateRoom(roomCode) {
  const query = `
    UPDATE game_rooms
    SET is_active = false, updated_at = NOW()
    WHERE room_code = $1
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [roomCode]);
    return result.rows[0];
  } catch (error) {
    console.error('Error deactivating room:', error);
    throw error;
  }
}

// Get all active rooms
export async function getActiveRooms() {
  const query = `
    SELECT room_code, players, game_state, created_at
    FROM game_rooms
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 50;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting active rooms:', error);
    throw error;
  }
}

// Cleanup old inactive rooms (run periodically)
export async function cleanupOldRooms(hoursOld = 24) {
  const query = `
    DELETE FROM game_rooms
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '${hoursOld} hours'
    RETURNING room_code;
  `;
  
  try {
    const result = await pool.query(query);
    if (result.rows.length > 0) {
      console.log(`🧹 Cleaned up ${result.rows.length} old rooms`);
    }
    return result.rows;
  } catch (error) {
    console.error('Error cleaning up rooms:', error);
    throw error;
  }
}

// Export pool for direct queries if needed
export { pool };