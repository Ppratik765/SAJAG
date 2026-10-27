# Production Deployment Guide (docs/DEPLOY.md)

Step-by-step, honest guide to deploying Sajag to public production environments.

---

## 1. Architecture Overview

Sajag is split into two specialized hosting layers:

```
[ Mobile Phone / Laptop Browser ]
        │                    │
   HTTPS (Pages/Assets)     WSS (PCM16 Audio Relay)
        │                    │
        ▼                    ▼
[ Vercel Edge / CDN ]    [ Persistent WebSocket Backend ]
  (Next.js 15 Client)     (FastAPI, Python 3.13, ffmpeg)
                             (Render / Fly.io / Railway)
                                     │
                                     ▼
                            [ Gnani.ai Cloud APIs ]
                            (Prisma STT + Timbre TTS)
```

### Why Hosting is Split
- **Frontend (Vercel)**: Fast global CDN edge delivery for Next.js 15 pages, pre-rendered static content, and dynamic OpenGraph image generation.
- **Backend (Render / Fly.io / Railway)**: Standard serverless functions (e.g. AWS Lambda, Vercel Serverless) **cannot** maintain long-lived stateful WebSockets or execute long streaming ffmpeg processes. A persistent Linux container is strictly required for `/ws/live`.

---

## 2. Honest Hosting Realities & Sleeping Tiers

> [!WARNING]
> **Free Tier Sleep Behavior**:
> - **Render Free Tier**: Web services spin down after 15 minutes of inactivity. Cold start wake-up takes **50 to 90 seconds**. If a judge or user opens `/live` while the backend is asleep, the initial WebSocket connection **will fail or time out**.
> - **Recommendation**: For public submission and demo evaluation, run on a non-sleeping tier (e.g. Render Starter at $7/mo, or Fly.io with `min_machines_running = 1`), or explicitly ping `/healthz` before beginning live tests.

---

## 3. Backend Deployment (FastAPI on Render / Fly.io)

### Option A: Render (Web Service)
1. Link your GitHub repository in the [Render Dashboard](https://dashboard.render.com).
2. Choose **Web Service** with **Docker** runtime.
3. Configure settings:
   - **Root Directory**: `api`
   - **Dockerfile Path**: `Dockerfile`
   - **Instance Type**: Starter (persistent, recommended) or Free.
   - **Health Check Path**: `/healthz`
4. Set **Environment Variables** (see table below).

### Option B: Fly.io
Deploy from terminal with the included Dockerfile:
```bash
cd api
fly launch --dockerfile Dockerfile --port 8000
```
In `fly.toml`, ensure `min_machines_running = 1` so the container does not suspend during active testing.

### Option C: Local Docker Compose
To run full-stack locally before cloud deployment:
```bash
# Ensure .env contains GNANI_API_KEY and ADMIN_TOKEN
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Health: `http://localhost:8000/healthz`

---

## 4. Production Environment Variables Reference

Configure these variables in your backend service dashboard:

| Variable | Recommended Production Value | Description |
|---|---|---|
| `ENV` | `production` | Enables production security defaults (e.g., origin enforcement). |
| `ALLOWED_ORIGINS` | `https://your-domain.vercel.app` | Comma-separated allowed CORS and WebSocket origins. |
| `ALLOW_NO_ORIGIN` | `false` | Rejects WebSockets that do not send an Origin header. |
| `TRUST_PROXY` | `true` | Reads real client IP from `X-Forwarded-For` behind reverse proxy. |
| `GNANI_API_KEY` | *(Secret from Gnani dashboard)* | Cloud API key for Prisma STT and Timbre TTS. |
| `ADMIN_TOKEN` | *(Generate a strong secret string)* | Protects `/api/usage` metrics with 403 Forbidden by default. |
| `BUILD_COMMIT` | *(Short git commit hash, e.g. `34454df`)* | Exposed on `/api/meta` to verify active deployed commit. |
| `DAILY_STT_SECONDS_CAP`| `1800` | Hard cap: 30 minutes of speech-to-text per calendar day. |
| `DAILY_TTS_CHARS_CAP` | `20000` | Hard cap: 20,000 text-to-speech characters per calendar day. |
| `DAILY_LIVE_SESSIONS_CAP` | `50` | Maximum live call streaming sessions per calendar day. |
| `MAX_LIVE_SESSIONS` | `3` | Maximum concurrent live sessions globally across the backend. |
| `MAX_LIVE_SESSIONS_PER_IP`| `2` | Maximum concurrent live sessions from any single IP address. |
| `MAX_LIVE_SESSION_SECONDS`| `180` | Hard cutoff after 3 minutes for any single live call. |
| `MAINTENANCE_MODE` | `false` | Instant circuit-breaker: returns 503 on speech APIs if set to `true`. |

---

## 5. Frontend Deployment (Vercel)

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set configuration:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: Automatically detected (`.next`)
3. Set **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://your-api.onrender.com` (Your backend HTTP URL)
   - `NEXT_PUBLIC_API_WS_URL`: `wss://your-api.onrender.com` (Your backend WebSocket URL, use `wss://`)
   - `NEXT_PUBLIC_SITE_URL`: `https://your-site.vercel.app` (Canonical public site URL for OpenGraph cards)
4. Click **Deploy**.

---

## 6. Credit Protection for Launch

To prevent unexpected viral traffic from burning through remaining Gnani account credits:

1. **Daily Caps**: When `DAILY_STT_SECONDS_CAP` or `DAILY_LIVE_SESSIONS_CAP` is reached, the backend safely returns `budget_exhausted` (HTTP 503 / WebSocket close).
2. **Text Analysis Stays Operational**: The deterministic text engine (`/api/analyze/text`) and the pre-recorded `/demo` replay consume **zero speech credits** and remain 100% active even when speech caps are hit or during maintenance mode.
3. **Emergency Circuit Breaker**: If you need to halt speech API spend instantly, set `MAINTENANCE_MODE=true` in your backend environment variables. The UI will display a clean maintenance banner and direct visitors to text analysis.

---

## 7. 10-Minute Post-Deployment Verification Checklist

Complete these 7 checks immediately after deploying:

- [ ] **Check 1: Healthcheck Endpoint**
  Open `https://<your-backend-url>/healthz` in browser. Must return HTTP 200 with `{"status": "ok"}`.
- [ ] **Check 2: Deployed Commit & Status**
  Open `https://<your-backend-url>/api/meta`. Verify `"build_commit"` matches your git commit hash, `"maintenance": false`, and `"live_sessions_available": true`.
- [ ] **Check 3: Usage Protection**
  Open `https://<your-backend-url>/api/usage` without headers. Must return **HTTP 403 Forbidden**.
  Query with `curl -H "X-Admin-Token: <your-token>" https://<your-backend-url>/api/usage`. Must return current day credit counters.
- [ ] **Check 4: Mobile Browser Walkthrough**
  Open `https://<your-site-url>` on a physical mobile phone (Android Chrome / iOS Safari). Verify layout scales to 360 px width without horizontal scrolling.
- [ ] **Check 5: Offline Text Analysis**
  Go to `/paste`, paste a test message, and click "Analyze Message". Result card should land instantly with zero network delay to speech APIs.
- [ ] **Check 6: Demo Replay Page**
  Open `/demo`, press Play. Verify audio plays, the synthetic demo banner is visible, transcript segments land in sync, and risk escalates from suspicious to likely scam.
- [ ] **Check 7: Live Microphone Streaming**
  Open `/live` or `/parent` on a mobile device, start live listening over speakerphone. Confirm WebSocket connects (`wss://`), speech indicators illuminate when speaking, and microphone permission is granted under the site's CSP policy.
