/**
 * Backend URL resolution for client-side API and WebSocket calls.
 *
 * On public static hosts (e.g. sajag-alpha.vercel.app) where NEXT_PUBLIC_API_URL
 * is unset, returns null so the frontend never attempts localhost fetches or
 * triggers mixed-content errors.
 *
 * Written in type-strippable syntax only so `node --test` can import it directly.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolveApiBaseUrl(
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
  hostname: string | undefined = typeof window !== "undefined" ? window.location.hostname : undefined
): string | null {
  const configured = (configuredUrl || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (hostname && LOCAL_HOSTNAMES.has(hostname)) {
    return "http://localhost:8000";
  }
  return null;
}

export function resolveWsBaseUrl(
  configuredWsUrl: string | undefined = process.env.NEXT_PUBLIC_API_WS_URL,
  configuredApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
  locationLike: { hostname: string; protocol: string } | undefined =
    typeof window !== "undefined" ? window.location : undefined
): string | null {
  const configured = (configuredWsUrl || "").trim().replace(/\/$/, "");
  if (configured) return configured.replace(/^http/, "ws");

  const apiBase = resolveApiBaseUrl(configuredApiUrl, locationLike?.hostname);
  if (apiBase) return apiBase.replace(/^http/, "ws");

  return null;
}

