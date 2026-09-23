import type { Bot } from "grammy";
import { config } from "./config.js";
import {
  getActiveSubscribers,
  getSelectedAreas,
  markNotified,
  wasNotified
} from "./db.js";
import { getJobAreas, getSearchQueries } from "./profile.js";
import { scoreJob } from "./scoring.js";
import { formatJobMessage } from "./telegram.js";
import type { Job, JobProvider, ScanSummary, ScoreResult, SubscriberPreferences } from "./types.js";

let scanning = false;

interface ScanOptions {
  targetChatId?: number;
}

interface EvaluatedJob {
  job: Job;
  recipients: Array<{ preferences: SubscriberPreferences; score: ScoreResult }>;
  bestScore: ScoreResult;
}

function emptySummary(): ScanSummary {
  return {
    fetched: 0,
    areaMatches: 0,
    eligible: 0,
    newMatches: 0,
    notified: 0,
    shown: 0,
    providerErrors: []
  };
}

async function getRecipients(targetChatId?: number): Promise<SubscriberPreferences[]> {
  if (targetChatId !== undefined) {
    return [{ chatId: targetChatId, selectedAreas: await getSelectedAreas(targetChatId) }];
  }
  return getActiveSubscribers();
}

async function sendJob(
  bot: Bot,
  chatId: number,
  job: Job,
  score: ScoreResult
): Promise<boolean> {
  try {
    await bot.api.sendMessage(chatId, formatJobMessage(job, score), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true }
    });
    return true;
  } catch (error) {
    console.error(`No se pudo notificar al chat ${chatId}`, error);
    return false;
  }
}

export async function scanAndNotify(
  bot: Bot,
  providers: JobProvider[],
  options: ScanOptions = {}
): Promise<ScanSummary> {
  if (scanning) {
    return { ...emptySummary(), providerErrors: ["Ya hay una busqueda en curso"] };
  }

  scanning = true;
  const summary = emptySummary();

  try {
    const recipients = await getRecipients(options.targetChatId);
    if (recipients.length === 0) return summary;

    const requestedAreas = [...new Set(recipients.flatMap((recipient) => recipient.selectedAreas))];
    const searchQueries = getSearchQueries(requestedAreas);
    const results = await Promise.allSettled(
      providers.map((provider) => provider.fetchJobs(searchQueries))
    );
    const jobs = results.flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const providerName = providers[index]?.name ?? "desconocido";
      summary.providerErrors.push(`${providerName}: ${String(result.reason)}`);
      return [];
    });

    summary.fetched = jobs.length;
    const uniqueJobs = [...new Map(jobs.map((job) => [job.url, job])).values()];
    const jobsInSelectedAreas = uniqueJobs.filter((job) =>
      getJobAreas(job).some((area) => requestedAreas.includes(area))
    );
    summary.areaMatches = jobsInSelectedAreas.length;

    if (options.targetChatId !== undefined) {
      const preferences = recipients[0];
      if (!preferences) return summary;

      const matches = jobsInSelectedAreas
        .filter((job) => getJobAreas(job).some((area) => preferences.selectedAreas.includes(area)))
        .map((job) => ({ job, score: scoreJob(job, preferences.selectedAreas) }))
        .sort((a, b) => b.score.score - a.score.score);

      summary.eligible = matches.filter(
        ({ score }) => score.eligible && score.score >= config.matchThreshold
      ).length;

      for (const match of matches.slice(0, config.maxNotificationsPerRun)) {
        if (await sendJob(bot, preferences.chatId, match.job, match.score)) summary.shown += 1;
      }

      return summary;
    }

    const evaluatedJobs: EvaluatedJob[] = jobsInSelectedAreas
      .map((job) => {
        const matchingRecipients = recipients.flatMap((preferences) => {
          const matchesArea = getJobAreas(job).some((area) => preferences.selectedAreas.includes(area));
          if (!matchesArea) return [];
          const score = scoreJob(job, preferences.selectedAreas);
          if (!score.eligible || score.score < config.matchThreshold) return [];
          return [{ preferences, score }];
        });
        const bestScore = matchingRecipients
          .map(({ score }) => score)
          .sort((a, b) => b.score - a.score)[0];
        return bestScore ? { job, recipients: matchingRecipients, bestScore } : null;
      })
      .filter((match): match is EvaluatedJob => match !== null)
      .sort((a, b) => b.bestScore.score - a.bestScore.score);

    summary.eligible = evaluatedJobs.length;
    const newMatches: EvaluatedJob[] = [];
    for (const match of evaluatedJobs) {
      if (!(await wasNotified(match.job.externalId))) newMatches.push(match);
    }
    summary.newMatches = newMatches.length;

    for (const match of newMatches.slice(0, config.maxNotificationsPerRun)) {
      let delivered = false;
      for (const recipient of match.recipients) {
        if (await sendJob(bot, recipient.preferences.chatId, match.job, recipient.score)) {
          delivered = true;
        }
      }

      if (delivered) {
        await markNotified(match.job, match.bestScore);
        summary.notified += 1;
      }
    }

    return summary;
  } finally {
    scanning = false;
  }
}

export function formatScanSummary(summary: ScanSummary, manual = false): string {
  const errors = summary.providerErrors.length > 0 ? `\n⚠️ ${summary.providerErrors.join(" | ")}` : "";

  if (manual) {
    return (
      `✅ Busqueda terminada\n` +
      `Vacantes revisadas: ${summary.fetched}\n` +
      `Encontradas en tus areas: ${summary.areaMatches}\n` +
      `Con ${config.matchThreshold}% o mas: ${summary.eligible}\n` +
      `Resultados mostrados: ${summary.shown}${errors}`
    );
  }

  return (
    `✅ Busqueda programada terminada\n` +
    `Vacantes revisadas: ${summary.fetched}\n` +
    `Encontradas en tus areas: ${summary.areaMatches}\n` +
    `Compatibles: ${summary.eligible}\n` +
    `Nuevas: ${summary.newMatches}\n` +
    `Notificadas: ${summary.notified}${errors}`
  );
}
