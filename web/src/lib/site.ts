/**
 * The public URL of this deployment, used in share links.
 * Set NEXT_PUBLIC_SITE_URL at deploy time (e.g. https://sajag.vercel.app). On the client we fall back to the
 * origin the user is actually on, so a share link can never point at a domain we do not control.
 */
export function siteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
