"use client";

import { useEffect, useState } from "react";

type Health = "checking" | "ok" | "down";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ApiHealth() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/healthz`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body: unknown = await res.json();
        const ok = res.ok && typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
        setHealth(ok ? "ok" : "down");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHealth("down");
      });
    return () => controller.abort();
  }, []);

  const label =
    health === "checking" ? "Checking the API..." : health === "ok" ? "API is reachable" : "API is not reachable";

  return (
    <p role="status" aria-live="polite" data-health={health}>
      {label} <span>({API_URL}/healthz)</span>
    </p>
  );
}
