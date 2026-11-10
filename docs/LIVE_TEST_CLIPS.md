# Adding clips to the "See live test" page (`/test`)

The page plays an audio file through a speaker button while the transcript, warning marks and a **HANG UP** banner appear as the call is heard. Every transcript line and alert comes from a real run of the pipeline (Gnani Prisma + the frozen rules engine); nothing is typed in.

Two modes on the page:
- **Recorded run** (default, 0 credits for visitors): replays the events captured when you built the clip.
- **Run it live now** (optional): the visitor's browser streams the clip through your backend `/ws/live`. This spends speech credits per click and is limited by your daily caps; if the server is unreachable or capped, the page says so and the recorded run still works. To remove the option, pass `allowLive={false}` in `web/src/app/test/page.tsx`.

## 1. Where to put the audio
Put downloaded files anywhere **outside git**, e.g. `data/private_audio/` (already git-ignored). Only the short clip you publish ends up in the repo.

## 2. Build a clip (spends credits: about 1 credit-second per audio second, so a 90 s clip is roughly 90 s; STT is at most ~0.057 credits/s, check your dashboard)
Start the backend (needs `GNANI_API_KEY` in `.env` and ffmpeg), then:

```bash
cd api && uvicorn app.main:app --port 8000        # terminal 1
python scripts/make_live_test_clip.py \            # terminal 2, repo root
  --id da_real_01 --audio data/private_audio/call1.mp3 \
  --start 12 --duration 90 --lang hi-IN --kind real \
  --title "Digital arrest call (real recording)" \
  --title-hi "डिजिटल अरेस्ट कॉल (असली रिकॉर्डिंग)" \
  --credit "Source: <uploader / channel>. Used with the owner's permission for educational purposes."
```
- Pick the most telling 60-120 s (max 150 s; the live session limit is 180 s). Pick `--lang` to match the speech (`hi-IN` or `en-IN`).
- It asks for confirmation before spending credits. Use `--log eval/results/live_logs/<id>.json` to rebuild without calling Gnani.
- Output: `web/public/live-tests/<id>/{call.mp3,fixture.json}` and an updated `web/public/live-tests/manifest.json`.

## 3. Review before publishing (do not skip)
1. Open `fixture.json` and read every transcript line. **Delete the clip if it contains real phone numbers, account numbers, full names of private people, or addresses.** (Trim with `--start/--duration` so those parts are not in the clip, then rebuild.)
2. Check `meta.first_appeared_s` and what the engine concluded. If a real clip ends `safe` or `suspicious`, that is the honest result; publish it only if you are fine showing that, or leave it out. Do not tune the engine to a clip.
3. Keep written permission from the owner. The credit line is shown under the player.
4. Keep mp3s small (48 kbps mono, about 0.35 MB per minute).

## 4. Preview and publish
```bash
cd web && npm run dev     # open http://localhost:3000/test?clip=da_real_01
git add web/public/live-tests && git commit -m "Add live test clip da_real_01" && git push
```
Vercel redeploys; the clip appears as a tab on `/test`.

## Timing numbers shown on the page
All times are seconds since the first audio frame was sent (the audio clock). "Appeared 14.1s into the call" means the line/alert showed up 14.1 s into the call, including the speech-to-text delay. A line is never shown before it arrived, even though its audio started earlier.

## Testing without credits
`python scripts/fake_live_server.py --fixture web/public/live-tests/da_hi_002/fixture.json --port 8000` plays the part of `/ws/live` so the "Run it live now" button can be tested without spending credits.
