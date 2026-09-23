import cron from "node-cron";
import pino from "pino";
import { config } from "./config.js";
import { closeDatabase, migrate } from "./db.js";
import { formatScanSummary, scanAndNotify } from "./job-service.js";
import { createProviders } from "./providers/index.js";
import { bot, configureBot, registerScanHandler, setCommands } from "./telegram.js";

const logger = pino({ level: config.logLevel });
const providers = createProviders();

async function runScan(chatId?: number): Promise<string> {
  logger.info({ providers: providers.map((provider) => provider.name), chatId }, "Iniciando busqueda");
  const summary = await scanAndNotify(bot, providers, { targetChatId: chatId });
  logger.info(summary, "Busqueda terminada");
  return formatScanSummary(summary, chatId !== undefined);
}

async function main(): Promise<void> {
  if (providers.length === 0) throw new Error("No hay fuentes de empleo habilitadas");
  if (config.allowedTelegramUserIds.size === 0) {
    logger.warn("ALLOWED_TELEGRAM_USER_IDS esta vacio; cualquier usuario podra activar el bot");
  }

  await migrate();
  configureBot();
  registerScanHandler(runScan);
  await setCommands();

  cron.schedule(config.checkCron, () => {
    void runScan().catch((error) => logger.error(error, "Fallo la busqueda programada"));
  });

  if (config.runOnStartup) {
    void runScan().catch((error) => logger.error(error, "Fallo la busqueda inicial"));
  }

  logger.info({ cron: config.checkCron, threshold: config.matchThreshold }, "Bot iniciado");
  await bot.start({
    onStart: (info) => logger.info({ username: info.username }, "Telegram polling activo")
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Cerrando bot");
  bot.stop();
  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  logger.fatal(error, "No se pudo iniciar el bot");
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
