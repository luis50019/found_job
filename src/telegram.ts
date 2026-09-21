import { Bot, type Context } from "grammy";
import { config } from "./config.js";
import { subscribe, unsubscribe } from "./db.js";
import { candidateProfile } from "./profile.js";
import { escapeHtml, truncate } from "./text.js";
import type { Job, ScoreResult } from "./types.js";

export const bot = new Bot(config.telegramToken);

let triggerScan: (() => Promise<string>) | undefined;

export function registerScanHandler(handler: () => Promise<string>): void {
  triggerScan = handler;
}

function isAllowed(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId) return false;
  return config.allowedTelegramUserIds.size === 0 || config.allowedTelegramUserIds.has(String(userId));
}

async function requireAllowed(ctx: Context): Promise<boolean> {
  if (isAllowed(ctx)) return true;
  await ctx.reply(`Este bot es privado. Tu ID de Telegram es: ${ctx.from?.id ?? "desconocido"}`);
  return false;
}

export function configureBot(): void {
  bot.command("start", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    const sender = ctx.from;
    if (!sender) {
      await ctx.reply("No pude identificar tu usuario de Telegram.");
      return;
    }
    await subscribe({
      chatId: ctx.chat.id,
      telegramUserId: sender.id,
      username: sender.username,
      firstName: sender.first_name
    });
    await ctx.reply(
      "✅ Radar activado. Te avisare cuando encuentre una vacante nueva con suficiente compatibilidad.\n\n" +
        "Comandos: /buscar /estado /perfil /prueba /stop"
    );
  });

  bot.command("stop", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    await unsubscribe(ctx.chat.id);
    await ctx.reply("🔕 Notificaciones desactivadas. Usa /start para activarlas otra vez.");
  });

  bot.command("estado", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    await ctx.reply(
      `🟢 Bot activo\nPuntaje minimo: ${config.matchThreshold}%\nRevision programada: ${config.checkCron}\n` +
        `Fuentes: Remotive${config.enableRemoteOk ? ", Remote OK" : ""}${config.enableArbeitnow ? ", Arbeitnow" : ""}${config.adzunaAppId ? ", Adzuna Mexico" : ""}`
    );
  });

  bot.command("perfil", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    await ctx.reply(
      `🎯 Roles: DevOps, Cloud, SRE, Backend Node/TypeScript y Frontend React\n` +
        `🧰 Tecnologias: ${candidateProfile.highlightedSkills.join(", ")}\n` +
        "📍 Mexico o remoto global\n📊 Nivel: Junior, Intern, Trainee o Entry Level"
    );
  });

  bot.command("prueba", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    await ctx.reply("✅ Las notificaciones funcionan correctamente.");
  });

  bot.command("buscar", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    if (!triggerScan) {
      await ctx.reply("El buscador aun se esta iniciando.");
      return;
    }
    await ctx.reply("🔎 Buscando vacantes nuevas...");
    await ctx.reply(await triggerScan());
  });

  bot.catch((error) => {
    console.error("Error procesando actualizacion de Telegram", error.error);
  });
}

export async function setCommands(): Promise<void> {
  await bot.api.setMyCommands([
    { command: "buscar", description: "Buscar vacantes ahora" },
    { command: "estado", description: "Ver configuracion del radar" },
    { command: "perfil", description: "Ver el perfil de busqueda" },
    { command: "prueba", description: "Probar las notificaciones" },
    { command: "stop", description: "Detener notificaciones" }
  ]);
}

export function formatJobMessage(job: Job, score: ScoreResult): string {
  const matched = score.matchedSkills.length > 0 ? score.matchedSkills.join(", ") : "Sin coincidencias detectadas";
  const missing = score.missingHighlightedSkills.slice(0, 4).join(", ") || "Ninguna destacada";

  return [
    `🚀 <b>${escapeHtml(truncate(job.title, 120))}</b>`,
    `🏢 ${escapeHtml(job.company)}`,
    `📍 ${escapeHtml(job.location || (job.remote ? "Remoto" : "No indicada"))}`,
    `📊 <b>Compatibilidad: ${score.score}%</b>`,
    `✅ Coincide: ${escapeHtml(matched)}`,
    `📚 Podrias reforzar: ${escapeHtml(missing)}`,
    `🔎 Fuente: ${escapeHtml(job.source)}`,
    "",
    `<a href="${escapeHtml(job.url)}">Ver vacante y postularme</a>`
  ].join("\n");
}
