import { convert } from "html-to-text";
import { fetchJson } from "../http.js";
import type { Job, JobProvider } from "../types.js";

interface RemotiveResponse {
  jobs: Array<{
    id: number;
    url: string;
    title: string;
    company_name: string;
    tags?: string[];
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    description?: string;
  }>;
}

export class RemotiveProvider implements JobProvider {
  readonly name = "remotive" as const;

  async fetchJobs(): Promise<Job[]> {
    const response = await fetchJson<RemotiveResponse>("https://remotive.com/api/remote-jobs?category=software-dev");

    return response.jobs.map((job) => ({
      externalId: `${this.name}:${job.id}`,
      source: this.name,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location ?? "Remote",
      remote: true,
      url: job.url,
      description: convert(job.description ?? "", { wordwrap: false }),
      tags: [...(job.tags ?? []), job.job_type ?? ""].filter(Boolean),
      publishedAt: job.publication_date ? new Date(job.publication_date) : null
    }));
  }
}
