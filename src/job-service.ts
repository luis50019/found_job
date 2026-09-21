import type { Bot } from "grammy";
import { config } from "./config.js";
import { getActiveChatIds, markNotified, wasNotified } from "./db.js";
import { scoreJob } from "./scoring.js";
import { formatJobMessage } from "./telegram.js";
import type { JobProvider, ScanSummary } from "./types.js";

let scanning = false;

export async function scanAndNotify(bot: Bot, providers: JobProvider[]): Promise<ScanSummary> {
  if (scanning) {
    return { fetched: 0, eligible: 0, newMatches: 0, notified: 0, providerErrors: ["Ya hay una busqueda en curso"] };
  }

  scanning = true;
  const summary: ScanSummary = { fetched: 0, eligible: 0, newMatches: 0, notified: 0, providerErrors: [] };

  try {
    const results = await Promise.allSettled(providers.map((provider) => provider.fetchJobs()));
    const jobs = results.flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const providerName = providers[index]?.name ?? "desconocido";
      summary.providerErrors.push(`${providerName}: ${String(result.reason)}`);
      return [];
    });

    summary.fetched = jobs.length;
    const uniqueJobs = [...new Map(jobs.map((job) => [job.url, job])).values()];
    const matches = uniqueJobs
      .map((job) => ({ job, score: scoreJob(job) }))
      .filter(({ score }) => score.eligible && score.score >= config.matchThreshold)
      .sort((a, b) => b.score.score - a.score.score);

    summary.eligible = matches.length;
    const newMatches = [];
    for (const match of matches) {
      if (!(await wasNotified(match.job.externalId))) newMatches.push(match);
    }
    summary.newMatches = newMatches.length;

    const chatIds = await getActiveChatIds();
    for (const match of newMatches.slice(0, config.maxNotificationsPerRun)) {
      let delivered = false;
      for (const chatId of chatIds) {
        try {
          await bot.api.sendMessage(chatId, formatJobMessage(match.job, match.score), {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true }
          });
          delivered = true;
        } catch (error) {
          console.error(`No se pudo notificar al chat ${chatId}`, error);
        }
      }

      if (delivered) {
        await markNotified(match.job, match.score);
        summary.notified += 1;
      }
    }

    return summary;
  } finally {
    scanning = false;
  }
}

export function formatScanSummary(summary: ScanSummary): string {
  const errors = summary.providerErrors.length > 0 ? `\n⚠️ ${summary.providerErrors.join(" | ")}` : "";
  return (
    `✅ Busqueda terminada\n` +
    `Vacantes revisadas: ${summary.fetched}\n` +
    `Compatibles: ${summary.eligible}\n` +
    `Nuevas: ${summary.newMatches}\n` +
    `Notificadas: ${summary.notified}${errors}`
  );
}
