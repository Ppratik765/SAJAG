"use client";

import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api/backend";

type Health = "checking" | "ok" | "down" | "unconfigured";

export function ApiHealth() {
  const [health, setHealth] = useState<Health>("checking");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = resolveApiBaseUrl();
    if (!apiUrl) {
      const timer = setTimeout(() => {
        setResolvedUrl(null);
        setHealth("unconfigured");
      }, 0);
      return () => clearTimeout(timer);
    }

    const controller = new AbortController();
    fetch(`${apiUrl}/healthz`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        setResolvedUrl(apiUrl);
        const body: unknown = await res.json();
        const ok = res.ok && typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
        setHealth(ok ? "ok" : "down");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResolvedUrl(apiUrl);
        setHealth("down");
      });
    return () => controller.abort();
  }, []);

  const label =
    health === "checking"
      ? "Checking the API..."
      : health === "ok"
      ? "API is reachable"
      : health === "unconfigured"
      ? "API not configured (static prototype mode)"
      : "API is not reachable";

  return (
    <p role="status" aria-live="polite" data-health={health}>
      {label} {resolvedUrl ? <span>({resolvedUrl}/healthz)</span> : null}
    </p>
  );
}
