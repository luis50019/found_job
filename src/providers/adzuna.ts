import { fetchJson } from "../http.js";
import { candidateProfile } from "../profile.js";
import type { Job, JobProvider } from "../types.js";

interface AdzunaResponse {
  results: Array<{
    id: string;
    title: string;
    description?: string;
    created?: string;
    redirect_url: string;
    company?: { display_name?: string };
    location?: { display_name?: string };
    category?: { label?: string };
  }>;
}

export class AdzunaProvider implements JobProvider {
  readonly name = "adzuna" as const;

  constructor(
    private readonly appId: string,
    private readonly appKey: string
  ) {}

  async fetchJobs(searchQueries: readonly string[] = candidateProfile.searchQueries): Promise<Job[]> {
    const batches = await Promise.all(
      searchQueries.map(async (query) => {
        const params = new URLSearchParams({
          app_id: this.appId,
          app_key: this.appKey,
          results_per_page: "50",
          what: query,
          sort_by: "date",
          content_type: "application/json"
        });
        const url = `https://api.adzuna.com/v1/api/jobs/mx/search/1?${params.toString()}`;
        return fetchJson<AdzunaResponse>(url);
      })
    );

    const unique = new Map<string, Job>();
    for (const response of batches) {
      for (const job of response.results) {
        unique.set(job.id, {
          externalId: `${this.name}:${job.id}`,
          source: this.name,
          title: job.title,
          company: job.company?.display_name ?? "Empresa no indicada",
          location: job.location?.display_name ?? "Mexico",
          remote: /remote|remoto|home office/i.test(`${job.title} ${job.description ?? ""}`),
          url: job.redirect_url,
          description: job.description ?? "",
          tags: [job.category?.label ?? ""].filter(Boolean),
          publishedAt: job.created ? new Date(job.created) : null
        });
      }
    }

    return [...unique.values()];
  }
}
