"use client";

import { useEffect, useState } from "react";

export interface ServerMeta {
  reviewed_warning_languages: string[];
  maintenance: boolean;
  live_sessions_available: boolean;
}

/**
 * Reads `/api/meta` once. `loaded` stays false until the request settles; on network
 * failure we treat no language as reviewed (spoken warnings off, with a visible note).
 */
export function useServerMeta(): { meta: ServerMeta; loaded: boolean } {
  const [meta, setMeta] = useState<ServerMeta>({
    reviewed_warning_languages: [],
    maintenance: false,
    live_sessions_available: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let cancelled = false;
    fetch(`${apiUrl}/api/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMeta({
          reviewed_warning_languages: Array.isArray(data.reviewed_warning_languages)
            ? data.reviewed_warning_languages
            : [],
          maintenance: Boolean(data.maintenance),
          live_sessions_available: data.live_sessions_available !== false,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { meta, loaded };
}
