export type SourceName = "remotive" | "remoteok" | "arbeitnow" | "adzuna";

export interface Job {
  externalId: string;
  source: SourceName;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  tags: string[];
  publishedAt: Date | null;
}

export interface ScoreResult {
  score: number;
  eligible: boolean;
  matchedSkills: string[];
  missingHighlightedSkills: string[];
  reasons: string[];
}

export interface JobProvider {
  name: SourceName;
  fetchJobs(): Promise<Job[]>;
}

export interface ScanSummary {
  fetched: number;
  eligible: number;
  newMatches: number;
  notified: number;
  providerErrors: string[];
}
