# Security Policy

## Privacy & Data Protection Guarantee

Sajag is designed with privacy-first and data-minimization architecture:

1. **Zero Audio Persistence**: Uploaded audio files processed via `/api/analyze/audio` are converted in isolated temporary directories and deleted in a guaranteed `finally` block immediately upon analysis completion.
2. **Zero Transcript Storage**: Transcripts and evidence quotes are processed in-memory only. No conversation text, caller transcripts, or extracted evidence are saved to database tables or permanent disk files.
3. **No Personal Data in Repository**: This repository contains synthetic datasets and benchmark corpora only. Real audio recordings, genuine private calls, citizen names, and personal identifiers are strictly forbidden from entering the repository or deployment bundles.
4. **Credential Protection**: Gnani API keys and admin secrets are read exclusively from process environment variables and are never logged, reflected in responses, or checked into version control.

## Reporting a Security Vulnerability

If you discover a potential security vulnerability, authentication flaw, or data leakage in Sajag, please report it responsibly:

- **Contact**: Reach out to the project maintainers via GitHub private security advisories or by emailing `security@sajag.ai`.
- **Response Target**: We acknowledge reports within 48 hours and provide a remediation plan within 5 business days.
- **Coordination**: Please allow reasonable time for a fix to be deployed before disclosing any details publicly.

## Security Controls Implemented

- **Authenticated Admin Usage**: `/api/usage` metrics require an explicit `X-Admin-Token` header and return 403 Forbidden by default.
- **Origin Validation**: WebSocket streaming (`/ws/live`) verifies the `Origin` header against `ALLOWED_ORIGINS` in production environments.
- **Sliding Window Rate Limiting**: Per-IP limits protect public endpoints against abuse (`/api/analyze/audio`: 10/min, `/api/analyze/text`: 30/min, `/api/tts/warning`: 5/min, max 2 concurrent live sessions per IP).
- **Maintenance Circuit Breaker**: `MAINTENANCE_MODE=true` immediately refuses billable speech endpoints with HTTP 503 while leaving client text analysis fully operational.
- **Content Security Policy (CSP)**: Strict security headers restrict framing, inline execution vectors, and limit microphone capture permissions strictly to the application origin (`microphone=(self)`).
