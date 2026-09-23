import { normalizeText } from "./text.js";
import type { Job, SearchArea } from "./types.js";

export const searchAreaDefinitions: Record<
  SearchArea,
  {
    label: string;
    queries: readonly string[];
    titleTerms: readonly string[];
    contentTerms: readonly string[];
  }
> = {
  devops: {
    label: "DevOps / Cloud / SRE",
    queries: [
      "devops junior",
      "ingeniero devops junior",
      "cloud engineer junior",
      "ingeniero cloud junior",
      "sre junior",
      "platform engineer junior",
      "infrastructure engineer junior"
    ],
    titleTerms: [
      "devops",
      "dev ops",
      "cloud engineer",
      "platform engineer",
      "site reliability",
      "sre",
      "infrastructure engineer",
      "ingeniero de infraestructura",
      "release engineer",
      "build engineer"
    ],
    contentTerms: ["docker", "kubernetes", "ci/cd", "terraform", "aws", "azure", "linux"]
  },
  backend: {
    label: "Backend Node / TypeScript",
    queries: [
      "backend developer junior",
      "desarrollador backend junior",
      "backend node typescript",
      "node.js developer junior",
      "programador node junior",
      "api developer junior"
    ],
    titleTerms: [
      "backend",
      "back end",
      "back-end",
      "desarrollador backend",
      "desarrollador de backend",
      "node.js developer",
      "node developer",
      "api developer",
      "server side",
      "server-side"
    ],
    contentTerms: ["node.js", "nodejs", "express", "nestjs", "rest api", "postgresql", "mongodb", "microservices"]
  },
  web: {
    label: "Desarrollo Web / Frontend",
    queries: [
      "web developer junior",
      "desarrollador web junior",
      "frontend react junior",
      "desarrollador frontend react",
      "full stack junior",
      "javascript developer junior"
    ],
    titleTerms: [
      "frontend",
      "front end",
      "front-end",
      "web developer",
      "web development",
      "desarrollador web",
      "desarrollador frontend",
      "desarrollador front end",
      "full stack",
      "fullstack",
      "react developer",
      "javascript developer"
    ],
    contentTerms: ["react", "next.js", "frontend", "html", "css", "tailwind", "web application"]
  }
};

export const allSearchAreas: SearchArea[] = ["devops", "backend", "web"];

function includesTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  if (normalizedTerm.length <= 3) return text.split(" ").includes(normalizedTerm);
  return text.includes(normalizedTerm);
}

export function getSearchQueries(areas: readonly SearchArea[]): string[] {
  return [...new Set(areas.flatMap((area) => searchAreaDefinitions[area].queries))];
}

export function getJobAreas(job: Job): SearchArea[] {
  const title = normalizeText(job.title);
  const content = normalizeText(`${job.title} ${job.description} ${job.tags.join(" ")}`);
  const genericSoftwareRole = ["software engineer", "software developer", "programmer", "programador"].some(
    (term) => includesTerm(title, term)
  );

  return allSearchAreas.filter((area) => {
    const definition = searchAreaDefinitions[area];
    if (definition.titleTerms.some((term) => includesTerm(title, term))) return true;
    return genericSoftwareRole && definition.contentTerms.some((term) => includesTerm(content, term));
  });
}

export function getAreaLabels(areas: readonly SearchArea[]): string[] {
  return areas.map((area) => searchAreaDefinitions[area].label);
}

export const candidateProfile = {
  name: "Luis Angel Diaz Diaz",
  targetRoles: [
    "devops",
    "cloud engineer",
    "platform engineer",
    "site reliability",
    "sre",
    "backend",
    "node.js",
    "typescript",
    "frontend",
    "react",
    "full stack",
    "fullstack",
    "web developer",
    "infrastructure engineer",
    "software engineer",
    "software developer"
  ],
  preferredLevels: [
    "junior",
    "jr",
    "entry level",
    "entry-level",
    "intern",
    "internship",
    "trainee",
    "graduate",
    "becario",
    "practicante"
  ],
  excludedLevels: [
    "senior",
    "sr.",
    "sr ",
    "lead",
    "principal",
    "staff",
    "director",
    "head of",
    "staff engineer",
    "manager",
    "architect"
  ],
  allowedLocations: [
    "mexico",
    "méxico",
    "oaxaca",
    "latin america",
    "latam",
    "americas",
    "worldwide",
    "anywhere",
    "global",
    "remote"
  ],
  skills: [
    { name: "Docker", aliases: ["docker", "containerization", "containers"] },
    { name: "Docker Compose", aliases: ["docker compose", "docker-compose"] },
    { name: "Kubernetes", aliases: ["kubernetes", "k8s", "k3s", "kubebuilder"] },
    { name: "CI/CD", aliases: ["ci/cd", "continuous integration", "github actions", "jenkins"] },
    { name: "Linux", aliases: ["linux", "fedora", "debian", "ubuntu"] },
    { name: "Node.js", aliases: ["node.js", "nodejs", "node js", "express"] },
    { name: "TypeScript", aliases: ["typescript"] },
    { name: "JavaScript", aliases: ["javascript"] },
    { name: "React", aliases: ["react", "react.js", "reactjs", "next.js", "nextjs"] },
    { name: "PostgreSQL", aliases: ["postgresql", "postgres", "sql"] },
    { name: "MongoDB", aliases: ["mongodb", "mongo"] },
    { name: "Git", aliases: ["git", "github", "gitlab"] },
    { name: "Cloudflare", aliases: ["cloudflare", "cloudflare tunnel"] },
    { name: "RabbitMQ", aliases: ["rabbitmq", "message broker", "amqp"] },
    { name: "MinIO", aliases: ["minio", "s3 compatible", "object storage"] },
    { name: "REST APIs", aliases: ["rest api", "restful", "api development"] }
  ],
  highlightedSkills: ["Docker", "Kubernetes", "CI/CD", "Linux", "Node.js", "TypeScript", "React"],
  searchQueries: getSearchQueries(allSearchAreas)
} as const;
