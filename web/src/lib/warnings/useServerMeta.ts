"use client";

import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api/backend";

export interface ServerMeta {
  reviewed_warning_languages: string[];
  maintenance: boolean;
  live_sessions_available: boolean;
}

export interface ServerMetaState {
  meta: ServerMeta;
  loaded: boolean;
  backendReachable: boolean;
}

const DEFAULT_META: ServerMeta = {
  reviewed_warning_languages: [],
  maintenance: false,
  live_sessions_available: false,
};

/**
 * Checks `/api/meta` once when a backend URL is configured (explicit NEXT_PUBLIC_API_URL
 * or local development on localhost). When no backend is configured (e.g. Vercel static deploy)
 * or `/api/meta` cannot be reached, `backendReachable` settles to `false` cleanly without
 * making mixed-content localhost requests in production.
 */
export function useServerMeta(): ServerMetaState {
  const [meta, setMeta] = useState<ServerMeta>(DEFAULT_META);
  const [loaded, setLoaded] = useState(false);
  const [backendReachable, setBackendReachable] = useState(false);

  useEffect(() => {
    const apiUrl = resolveApiBaseUrl();
    if (!apiUrl) {
      const timer = setTimeout(() => {
        setMeta(DEFAULT_META);
        setBackendReachable(false);
        setLoaded(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    fetch(`${apiUrl}/api/meta`, { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== "object") {
          setMeta(DEFAULT_META);
          setBackendReachable(false);
          return;
        }
        setMeta({
          reviewed_warning_languages: Array.isArray(data.reviewed_warning_languages)
            ? data.reviewed_warning_languages
            : [],
          maintenance: Boolean(data.maintenance),
          live_sessions_available: data.live_sessions_available !== false,
        });
        setBackendReachable(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMeta(DEFAULT_META);
        setBackendReachable(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return { meta, loaded, backendReachable };
}
