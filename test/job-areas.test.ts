import { describe, expect, it } from "vitest";
import { getJobAreas, getSearchQueries } from "../src/profile.js";
import { scoreJob } from "../src/scoring.js";
import type { Job } from "../src/types.js";

function job(title: string, description = ""): Job {
  return {
    externalId: `test:${title}`,
    source: "remotive",
    title,
    company: "Example",
    location: "Mexico",
    remote: false,
    url: `https://example.com/${encodeURIComponent(title)}`,
    description,
    tags: [],
    publishedAt: new Date()
  };
}

describe("job areas", () => {
  it("clasifica vacantes por el titulo", () => {
    expect(getJobAreas(job("Junior DevOps Engineer"))).toContain("devops");
    expect(getJobAreas(job("Backend Node.js Developer"))).toContain("backend");
    expect(getJobAreas(job("Frontend React Developer"))).toContain("web");
  });

  it("usa el contenido para clasificar roles de software genericos", () => {
    const areas = getJobAreas(job("Junior Software Engineer", "React, TypeScript, HTML and CSS"));
    expect(areas).toContain("web");
  });

  it("solo considera las areas seleccionadas al puntuar", () => {
    const backendJob = job("Junior Backend Developer", "Node.js, TypeScript, PostgreSQL and REST API");
    expect(scoreJob(backendJob, ["backend"]).eligible).toBe(true);
    expect(scoreJob(backendJob, ["devops"]).eligible).toBe(false);
  });

  it("genera consultas unicamente para las areas seleccionadas", () => {
    const queries = getSearchQueries(["backend"]);
    expect(queries.some((query) => query.includes("backend"))).toBe(true);
    expect(queries.some((query) => query.includes("devops"))).toBe(false);
    expect(queries.some((query) => query.includes("frontend"))).toBe(false);
  });
});
