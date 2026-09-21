export async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "telegram-job-radar/1.0",
      accept: "application/json",
      ...headers
    },
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al consultar ${new URL(url).hostname}`);
  }

  return (await response.json()) as T;
}
