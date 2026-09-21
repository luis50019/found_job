import { describe, expect, it } from "vitest";
import { scoreJob } from "../src/scoring.js";
import type { Job } from "../src/types.js";

function job(overrides: Partial<Job> = {}): Job {
  return {
    externalId: "test:1",
    source: "remotive",
    title: "Junior DevOps Engineer",
    company: "Example",
    location: "Latin America",
    remote: true,
    url: "https://example.com/job",
    description: "Docker, Kubernetes, Linux, GitHub Actions, PostgreSQL and Node.js",
    tags: ["CI/CD"],
    publishedAt: new Date(),
    ...overrides
  };
}

describe("scoreJob", () => {
  it("da un puntaje alto a una vacante junior alineada", () => {
    const result = scoreJob(job());
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.matchedSkills).toContain("Docker");
  });

  it("descarta puestos senior", () => {
    const result = scoreJob(job({ title: "Senior DevOps Engineer" }));
    expect(result.eligible).toBe(false);
  });

  it("descarta trabajo presencial fuera de Mexico", () => {
    const result = scoreJob(job({ location: "Berlin", remote: false }));
    expect(result.eligible).toBe(false);
  });

  it("acepta trabajo presencial en Mexico", () => {
    const result = scoreJob(job({ location: "Ciudad de Mexico", remote: false }));
    expect(result.eligible).toBe(true);
  });
});
