import { convert } from "html-to-text";
import { candidateProfile } from "../profile.js";
import type { Job, JobProvider } from "../types.js";

interface JoobleResponse {
  jobs?: Array<{
    id: string | number;
    title: string;
    location?: string;
    snippet?: string;
    salary?: string;
    source?: string;
    type?: string;
    link: string;
    company?: string;
    updated?: string;
  }>;
}

export class JoobleProvider implements JobProvider {
  readonly name = "jooble" as const;

  constructor(private readonly apiKey: string) {}

  private async search(keywords: string): Promise<JoobleResponse> {
    const response = await fetch(`https://jooble.org/api/${encodeURIComponent(this.apiKey)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": "telegram-job-radar/1.0"
      },
      body: JSON.stringify({
        keywords,
        location: "Mexico",
        page: "1",
        companysearch: "false"
      }),
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al consultar Jooble`);
    }

    return (await response.json()) as JoobleResponse;
  }

  async fetchJobs(searchQueries: readonly string[] = candidateProfile.searchQueries): Promise<Job[]> {
    const responses = await Promise.all(
      searchQueries.map((query) => this.search(query))
    );

    const unique = new Map<string, Job>();

    for (const response of responses) {
      for (const job of response.jobs ?? []) {
        const searchableText = `${job.title} ${job.location ?? ""} ${job.snippet ?? ""}`;
        const remote = /remote|remoto|home\s*office|desde casa/i.test(searchableText);
        const description = convert(job.snippet ?? "", { wordwrap: false });
        const id = String(job.id || job.link);

        unique.set(id, {
          externalId: `${this.name}:${id}`,
          source: this.name,
          title: job.title,
          company: job.company ?? "Empresa no indicada",
          location: job.location ?? (remote ? "Remote" : "Mexico"),
          remote,
          url: job.link,
          description,
          tags: [job.type ?? "", job.salary ?? "", job.source ?? ""].filter(Boolean),
          publishedAt: job.updated ? new Date(job.updated) : null
        });
      }
    }

    return [...unique.values()];
  }
}
