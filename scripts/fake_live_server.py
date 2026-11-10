#!/usr/bin/env python3
"""Fake `/ws/live` server for testing the website's "Run it live now" button WITHOUT Gnani credits.

It speaks the same server->client messages as api/app/routes/live.py (ready / speech / transcript / risk / end)
but the transcripts are replayed from a recorded fixture: an event is released once the number of audio frames
received implies the stream clock has reached that event's `appear_s`. It also checks every frame is exactly
1,024 bytes and prints a summary when the client disconnects.

    python scripts/fake_live_server.py --fixture web/public/live-tests/da_hi_002/fixture.json --port 8000

Testing aid only. It never calls Gnani and its output must never be presented as a real result.
"""
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

import websockets

FRAME_S = 0.032


def load_events(fixture_path: Path) -> list[tuple[float, dict]]:
    fx = json.loads(fixture_path.read_text(encoding="utf-8"))
    evs: list[tuple[float, dict]] = []
    for s in fx["segments"]:
        evs.append((s["appear_s"], {"type": "transcript", "index": s["index"], "text": s["text"],
                                    "audio_duration_ms": (s["audio_end_s"] - s["audio_start_s"]) * 1000.0}))
    for r in fx["risk_events"]:
        new = [x for x in fx["signals"] if abs(x["appear_s"] - r["appear_s"]) < 1e-6]
        evs.append((r["appear_s"], {"type": "risk", "level": r["level"], "score": r["score"],
                                    "primary_type": r["primary_type"], "new_signals": new}))
    evs.sort(key=lambda e: e[0])
    return evs


async def handler(ws, events: list[tuple[float, dict]], fail: bool):
    if fail:
        await ws.send(json.dumps({"type": "error", "code": "upstream_quota", "message": "fake quota error"}))
        await ws.close()
        return
    await ws.send(json.dumps({"type": "ready"}))
    frames = bad = nxt = 0
    try:
        async for msg in ws:
            if not isinstance(msg, (bytes, bytearray)) or len(msg) != 1024:
                bad += 1
                continue
            frames += 1
            clock = frames * FRAME_S
            while nxt < len(events) and events[nxt][0] <= clock:
                await ws.send(json.dumps(events[nxt][1], ensure_ascii=False))
                nxt += 1
    except websockets.ConnectionClosed:
        pass
    print(f"session ended: frames={frames} ({frames * FRAME_S:.1f}s of audio) bad_frames={bad} events_sent={nxt}/{len(events)}", flush=True)


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--fixture", required=True, type=Path)
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--fail", action="store_true", help="answer every session with an upstream_quota error")
    a = p.parse_args()
    events = load_events(a.fixture)

    async def h(ws):
        await handler(ws, events, a.fail)

    async with websockets.serve(h, "127.0.0.1", a.port):
        print(f"fake /ws/live on ws://127.0.0.1:{a.port} (replaying {len(events)} events)", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
