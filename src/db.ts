import pg from "pg";
import { config } from "./config.js";
import type { Job, ScoreResult } from "./types.js";

const { Pool } = pg;
export const pool = new Pool({ connectionString: config.databaseUrl });

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      chat_id BIGINT PRIMARY KEY,
      telegram_user_id BIGINT NOT NULL,
      username TEXT,
      first_name TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notified_jobs (
      external_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT NOT NULL,
      score INTEGER NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
    CREATE INDEX IF NOT EXISTS idx_notified_jobs_notified_at ON notified_jobs(notified_at DESC);
  `);
}

export async function subscribe(input: {
  chatId: number;
  telegramUserId: number;
  username?: string;
  firstName?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO subscribers(chat_id, telegram_user_id, username, first_name, active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT(chat_id) DO UPDATE SET
       telegram_user_id = EXCLUDED.telegram_user_id,
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       active = TRUE,
       updated_at = NOW()`,
    [input.chatId, input.telegramUserId, input.username ?? null, input.firstName ?? null]
  );
}

export async function unsubscribe(chatId: number): Promise<void> {
  await pool.query("UPDATE subscribers SET active = FALSE, updated_at = NOW() WHERE chat_id = $1", [chatId]);
}

export async function getActiveChatIds(): Promise<number[]> {
  const result = await pool.query<{ chat_id: string }>("SELECT chat_id FROM subscribers WHERE active = TRUE");
  return result.rows.map((row) => Number(row.chat_id));
}

export async function wasNotified(externalId: string): Promise<boolean> {
  const result = await pool.query("SELECT 1 FROM notified_jobs WHERE external_id = $1", [externalId]);
  return (result.rowCount ?? 0) > 0;
}

export async function markNotified(job: Job, score: ScoreResult): Promise<void> {
  await pool.query(
    `INSERT INTO notified_jobs(external_id, source, title, company, url, score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(external_id) DO NOTHING`,
    [job.externalId, job.source, job.title, job.company, job.url, score.score]
  );
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
