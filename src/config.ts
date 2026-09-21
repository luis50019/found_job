import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20, "Falta TELEGRAM_BOT_TOKEN"),
  ALLOWED_TELEGRAM_USER_IDS: z.string().default(""),
  DATABASE_URL: z.string().url(),
  CHECK_CRON: z.string().default("0 */6 * * *"),
  MATCH_THRESHOLD: z.coerce.number().int().min(1).max(100).default(75),
  RUN_ON_STARTUP: booleanString,
  MAX_NOTIFICATIONS_PER_RUN: z.coerce.number().int().min(1).max(50).default(10),
  ENABLE_REMOTIVE: booleanString,
  ENABLE_REMOTEOK: booleanString,
  ENABLE_ARBEITNOW: booleanString,
  ADZUNA_APP_ID: z.string().default(""),
  ADZUNA_APP_KEY: z.string().default(""),
  LOG_LEVEL: z.string().default("info")
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuracion invalida:", z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  telegramToken: env.TELEGRAM_BOT_TOKEN,
  allowedTelegramUserIds: new Set(
    env.ALLOWED_TELEGRAM_USER_IDS.split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  ),
  databaseUrl: env.DATABASE_URL,
  checkCron: env.CHECK_CRON,
  matchThreshold: env.MATCH_THRESHOLD,
  runOnStartup: env.RUN_ON_STARTUP,
  maxNotificationsPerRun: env.MAX_NOTIFICATIONS_PER_RUN,
  enableRemotive: env.ENABLE_REMOTIVE,
  enableRemoteOk: env.ENABLE_REMOTEOK,
  enableArbeitnow: env.ENABLE_ARBEITNOW,
  adzunaAppId: env.ADZUNA_APP_ID,
  adzunaAppKey: env.ADZUNA_APP_KEY,
  logLevel: env.LOG_LEVEL
};
