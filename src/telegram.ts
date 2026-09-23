import { Bot, InlineKeyboard, type Context } from "grammy";
import { config } from "./config.js";
import { getSelectedAreas, setSelectedAreas, subscribe, unsubscribe } from "./db.js";
import {
  allSearchAreas,
  candidateProfile,
  getAreaLabels,
  getJobAreas,
  searchAreaDefinitions
} from "./profile.js";
import { escapeHtml, truncate } from "./text.js";
import type { Job, ScoreResult, SearchArea } from "./types.js";

export const bot = new Bot(config.telegramToken);

let triggerScan: ((chatId: number) => Promise<string>) | undefined;

export function registerScanHandler(handler: (chatId: number) => Promise<string>): void {
  triggerScan = handler;
}

function areaSelectionText(selectedAreas: readonly SearchArea[]): string {
  return [
    "🎯 Selecciona las areas que quieres buscar:",
    "",
    ...allSearchAreas.map((area) =>
      `${selectedAreas.includes(area) ? "✅" : "⬜"} ${searchAreaDefinitions[area].label}`
    ),
    "",
    "Puedes activar una o varias. /buscar usara solamente las seleccionadas."
  ].join("\n");
}

function areaKeyboard(selectedAreas: readonly SearchArea[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const area of allSearchAreas) {
    keyboard
      .text(
        `${selectedAreas.includes(area) ? "✅" : "⬜"} ${searchAreaDefinitions[area].label}`,
        `area:${area}`
      )
      .row();
  }
  return keyboard;
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
        "Usa /areas para elegir Backend, DevOps o Desarrollo Web.\n" +
        "Comandos: /areas /buscar /estado /perfil /prueba /stop"
    );
  });

  bot.command("areas", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    const sender = ctx.from;
    if (!sender) return;
    await subscribe({
      chatId: ctx.chat.id,
      telegramUserId: sender.id,
      username: sender.username,
      firstName: sender.first_name
    });
    const selectedAreas = await getSelectedAreas(ctx.chat.id);
    await ctx.reply(areaSelectionText(selectedAreas), {
      reply_markup: areaKeyboard(selectedAreas)
    });
  });

  bot.callbackQuery(/^area:(devops|backend|web)$/, async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.answerCallbackQuery({ text: "No pude identificar el chat." });
      return;
    }

    const area = ctx.match[1] as SearchArea;
    const selectedAreas = await getSelectedAreas(chatId);
    const nextAreas = selectedAreas.includes(area)
      ? selectedAreas.filter((selected) => selected !== area)
      : [...selectedAreas, area];

    if (nextAreas.length === 0) {
      await ctx.answerCallbackQuery({
        text: "Debes mantener al menos un area activa.",
        show_alert: true
      });
      return;
    }

    await setSelectedAreas(chatId, nextAreas);
    await ctx.editMessageText(areaSelectionText(nextAreas), {
      reply_markup: areaKeyboard(nextAreas)
    });
    await ctx.answerCallbackQuery({ text: "Preferencias guardadas" });
  });

  bot.command("stop", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    await unsubscribe(ctx.chat.id);
    await ctx.reply("🔕 Notificaciones desactivadas. Usa /start para activarlas otra vez.");
  });

  bot.command("estado", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    const selectedAreas = await getSelectedAreas(ctx.chat.id);
    await ctx.reply(
      `🟢 Bot activo\nPuntaje minimo: ${config.matchThreshold}%\nRevision programada: ${config.checkCron}\n` +
        `Areas: ${getAreaLabels(selectedAreas).join(", ")}\n` +
        `Fuentes: Remotive${config.enableRemoteOk ? ", Remote OK" : ""}${config.enableArbeitnow ? ", Arbeitnow" : ""}${config.enableJooble && config.joobleApiKey ? ", Jooble" : ""}${config.adzunaAppId ? ", Adzuna Mexico" : ""}`
    );
  });

  bot.command("perfil", async (ctx) => {
    if (!(await requireAllowed(ctx))) return;
    const selectedAreas = await getSelectedAreas(ctx.chat.id);
    await ctx.reply(
      `🎯 Areas activas: ${getAreaLabels(selectedAreas).join(", ")}\n` +
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
    const selectedAreas = await getSelectedAreas(ctx.chat.id);
    await ctx.reply(`🔎 Buscando: ${getAreaLabels(selectedAreas).join(", ")}...`);
    await ctx.reply(await triggerScan(ctx.chat.id));
  });

  bot.catch((error) => {
    console.error("Error procesando actualizacion de Telegram", error.error);
  });
}

export async function setCommands(): Promise<void> {
  await bot.api.setMyCommands([
    { command: "areas", description: "Elegir areas de trabajo" },
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
  const areas = getAreaLabels(getJobAreas(job)).join(", ") || "Sin clasificar";

  return [
    `🚀 <b>${escapeHtml(truncate(job.title, 120))}</b>`,
    `🏢 ${escapeHtml(job.company)}`,
    `📍 ${escapeHtml(job.location || (job.remote ? "Remoto" : "No indicada"))}`,
    `📊 <b>Compatibilidad: ${score.score}%</b>`,
    `🎯 Area: ${escapeHtml(areas)}`,
    `✅ Coincide: ${escapeHtml(matched)}`,
    `📚 Podrias reforzar: ${escapeHtml(missing)}`,
    `🔎 Fuente: ${escapeHtml(job.source)}`,
    "",
    `<a href="${escapeHtml(job.url)}">Ver vacante y postularme</a>`
  ].join("\n");
}
