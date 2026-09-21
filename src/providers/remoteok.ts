import { convert } from "html-to-text";
import { fetchJson } from "../http.js";
import type { Job, JobProvider } from "../types.js";

interface RemoteOkJob {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  tags?: string[];
  url?: string;
  date?: string;
}

export class RemoteOkProvider implements JobProvider {
  readonly name = "remoteok" as const;

  async fetchJobs(): Promise<Job[]> {
    const response = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api");

    return response
      .filter((job) => job.id && job.position && job.url)
      .map((job) => ({
        externalId: `${this.name}:${job.id}`,
        source: this.name,
        title: job.position ?? "Sin titulo",
        company: job.company ?? "Empresa no indicada",
        location: job.location ?? "Remote",
        remote: true,
        url: job.url ?? "https://remoteok.com",
        description: convert(job.description ?? "", { wordwrap: false }),
        tags: job.tags ?? [],
        publishedAt: job.date ? new Date(job.date) : null
      }));
  }
}
