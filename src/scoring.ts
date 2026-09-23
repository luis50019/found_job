import { allSearchAreas, candidateProfile, getJobAreas } from "./profile.js";
import { normalizeText } from "./text.js";
import type { Job, ScoreResult, SearchArea } from "./types.js";

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function locationIsEligible(job: Job): boolean {
  const location = normalizeText(job.location);

  if (!job.remote) {
    return includesAny(location, ["mexico", "méxico", "oaxaca"]);
  }

  if (!location) return true;
  return includesAny(location, candidateProfile.allowedLocations);
}

export function scoreJob(job: Job, selectedAreas: readonly SearchArea[] = allSearchAreas): ScoreResult {
  const title = normalizeText(job.title);
  const content = normalizeText(`${job.title} ${job.description} ${job.tags.join(" ")}`);

  const jobAreas = getJobAreas(job);
  const roleMatch = selectedAreas.some((area) => jobAreas.includes(area));
  const preferredLevel = includesAny(content, candidateProfile.preferredLevels);
  const excludedLevel = includesAny(title, candidateProfile.excludedLevels);
  const eligibleLocation = locationIsEligible(job);

  const matchedSkills = candidateProfile.skills
    .filter((skill) => includesAny(content, skill.aliases))
    .map((skill) => skill.name);

  const missingHighlightedSkills = candidateProfile.highlightedSkills.filter(
    (skill) => !matchedSkills.includes(skill)
  );

  const rolePoints = roleMatch ? 35 : 0;
  const skillsPoints = Math.min(40, matchedSkills.length * 5);
  const levelPoints = preferredLevel ? 15 : excludedLevel ? 0 : 8;
  const locationPoints = eligibleLocation ? 10 : 0;
  const score = Math.max(0, Math.min(100, rolePoints + skillsPoints + levelPoints + locationPoints));

  const reasons: string[] = [];
  if (roleMatch) reasons.push("El puesto coincide con tus roles objetivo");
  if (preferredLevel) reasons.push("Indica nivel Junior, Intern o equivalente");
  if (job.remote) reasons.push("Modalidad remota");
  if (eligibleLocation) reasons.push("Ubicacion compatible con Mexico o trabajo global");
  if (excludedLevel) reasons.push("El titulo pide un nivel Senior/Lead");

  return {
    score,
    eligible: roleMatch && eligibleLocation && !excludedLevel,
    matchedSkills,
    missingHighlightedSkills,
    reasons
  };
}
