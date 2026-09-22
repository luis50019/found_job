import { config } from "../config.js";
import type { JobProvider } from "../types.js";
import { AdzunaProvider } from "./adzuna.js";
import { ArbeitnowProvider } from "./arbeitnow.js";
import { JoobleProvider } from "./jooble.js";
import { RemoteOkProvider } from "./remoteok.js";
import { RemotiveProvider } from "./remotive.js";

export function createProviders(): JobProvider[] {
  const providers: JobProvider[] = [];

  if (config.enableRemotive) providers.push(new RemotiveProvider());
  if (config.enableRemoteOk) providers.push(new RemoteOkProvider());
  if (config.enableArbeitnow) providers.push(new ArbeitnowProvider());
  if (config.enableJooble && config.joobleApiKey) {
    providers.push(new JoobleProvider(config.joobleApiKey));
  }
  if (config.adzunaAppId && config.adzunaAppKey) {
    providers.push(new AdzunaProvider(config.adzunaAppId, config.adzunaAppKey));
  }

  return providers;
}
