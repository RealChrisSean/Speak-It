import mysql from "mysql2/promise";
import fs from "fs";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const sslCa = process.env.TIDB_SSL_CA;

    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: parseInt(process.env.TIDB_PORT || "4000"),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl: sslCa && fs.existsSync(sslCa) ? { ca: fs.readFileSync(sslCa) } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

// Initialize tables on first run
export async function initTables() {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voice_usage (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(36),
      duration_seconds INT NOT NULL,
      word_count INT NOT NULL,
      language VARCHAR(20) DEFAULT 'en-US',
      engine VARCHAR(20) DEFAULT 'web-speech',
      ip_hash VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session_id (session_id),
      INDEX idx_created_at (created_at)
    )
  `);

  console.log("TiDB tables initialized");
}

// Track voice usage
export async function trackUsage(
  sessionId: string | null,
  durationSeconds: number,
  wordCount: number,
  language: string,
  engine: string,
  ipHash: string | null
) {
  const db = getPool();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO voice_usage (id, session_id, duration_seconds, word_count, language, engine, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, durationSeconds, wordCount, language, engine, ipHash]
  );

  return id;
}

// Get usage stats
export async function getUsageStats(sessionId?: string, days: number = 30) {
  const db = getPool();

  const query = sessionId
    ? `SELECT COUNT(*) as sessions, SUM(duration_seconds) as total_seconds, SUM(word_count) as total_words
       FROM voice_usage
       WHERE session_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)`
    : `SELECT COUNT(*) as sessions, SUM(duration_seconds) as total_seconds, SUM(word_count) as total_words
       FROM voice_usage
       WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)`;

  const params = sessionId ? [sessionId, days] : [days];
  const [rows] = await db.execute(query, params);

  return (rows as any[])[0];
}
