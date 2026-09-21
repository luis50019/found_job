import { convert } from "html-to-text";
import { fetchJson } from "../http.js";
import type { Job, JobProvider } from "../types.js";

interface ArbeitnowResponse {
  data: Array<{
    slug: string;
    company_name: string;
    title: string;
    description?: string;
    remote: boolean;
    url: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    created_at?: number;
  }>;
}

export class ArbeitnowProvider implements JobProvider {
  readonly name = "arbeitnow" as const;

  async fetchJobs(): Promise<Job[]> {
    const response = await fetchJson<ArbeitnowResponse>("https://www.arbeitnow.com/api/job-board-api");

    return response.data.map((job) => ({
      externalId: `${this.name}:${job.slug}`,
      source: this.name,
      title: job.title,
      company: job.company_name,
      location: job.location ?? (job.remote ? "Remote" : "No indicada"),
      remote: job.remote,
      url: job.url,
      description: convert(job.description ?? "", { wordwrap: false }),
      tags: [...(job.tags ?? []), ...(job.job_types ?? [])],
      publishedAt: job.created_at ? new Date(job.created_at * 1000) : null
    }));
  }
}
