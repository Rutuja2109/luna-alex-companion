# Luna & Alex Companion — MVP

A mobile-first web app for chatting, calling and spending simulated time with two fictional adult AI companions, **Luna** and **Alex**. Built screen by screen from the reference boards in `reference/`.

## Run it locally

```bash
python3 tools/serve.py 8765        # then open http://127.0.0.1:8765 on a phone-sized window
```

No build step. Plain ES modules, one stylesheet pair, no dependencies.

Useful local-only URL options:
- `?demo=luna` or `?demo=alex` — skip onboarding with a finished companion and example data
- `?t=17:40` — preview the simulated routine at another time of day
- `#chat`, `#call`, `#study`, … — open any screen directly

## QA tools

| Command | What it does |
|---|---|
| `python3 tools/extract_assets.py` | Re-cuts every character/scene/room asset from the boards (coordinates documented in the file) |
| `python3 tools/screenshot.py home --demo luna` | Renders one screen at 390×844 @2x and writes `qa/<name>-compare.png` next to its reference region |
| `python3 tools/e2e.py` | Fresh install → onboarding → every screen; asserts persistence and restart (34 steps) |

## Structure

```
index.html            app shell (phone frame on desktop, full-bleed on phones)
css/tokens.css        design tokens sampled from the boards
css/app.css           components and per-screen styles
src/main.js           boot, navigation wiring, in-app activity alerts
src/router.js         one route per screen (24 screens)
src/screens/*.js      individual screens
src/ui/               components (Header, Seg, BottomNav, sheets, toasts, waveform) + icons
src/data/             characters, activities (stable IDs, identity assets)
src/state/            store (persistence), actions, QA demo seed
src/engine/routine.js simulated daily life (deterministic, time-based)
src/services/ai.js    conversation service (Claude via artifact `sample`, offline fallback)
src/services/voice.js speech synthesis wrapper
assets/               crops of the boards: characters/, scenes/, rooms/, activities/, gallery/, wallpapers/
reference/            the four source boards (board-a … board-d)
```

## Integrations: what's real and what's mocked

| Feature | Status |
|---|---|
| Chat replies (structured: multi-bubble, reactions, selfies, memory suggestions) | **Live** when opened as the published Claude artifact (Claude via the `sample` capability, viewer's own account, no API key in the page). Elsewhere: **offline replies**, short rule-based responses, always labeled "Offline replies" in the chat. |
| Persistence | **Live**: localStorage on the device; mirrored to the signed-in viewer's private `db` document (`data/users/<id>/state`) when published. Uploaded images stay on the device. |
| Voice (samples, voice notes, call audio) | **Live** via the browser's speech synthesis. Quality depends on the device's voices. |
| Speech input in calls | Uses the browser's speech recognition where allowed; typing is always available. |
| Video call | **Animated photo** (breathing/talking motion), clearly labeled. No real-time facial animation or lip-sync. |
| User camera / microphone recording | **Not available.** Camera tile shows "Camera off"; voice notes are typed and spoken back. |
| Simulated routine, timeline, activity alerts | **Live**, computed from the clock; alerts are in-app only while the app is open. |
| Push notifications | **Not available**; preferences are saved. |
| Appearance re-rendering (hair/eye/skin) | **Preference only** + hair-color preview tint. Generating new images needs an image service. |
| Gallery characters other than Alex & Luna | Shown as "Soon". |

### To use your own backend instead
Replace `reply()` in `src/services/ai.js` with a call to your server (keep keys server-side). Suggested environment variables on that server: `ANTHROPIC_API_KEY` (chat), `TTS_PROVIDER_KEY` (hosted voices), `IMAGE_PROVIDER_KEY` (appearance renders).

## Deviations from the references
- Status bars (9:41, battery) aren't drawn; the real device status bar is used.
- Gallery uses board-A names (Leo, Kai, Zoe, Ella) instead of board-C's Lucas/Arjun/Zara/Elena, per the brief.
- Picture-in-picture in calls shows "Camera off"/"You" instead of a selfie view.
- Some Luna scenes (working, coffee, reading) come from tiny board thumbnails and look soft when large. Board D gave sharp Alex shots; a similar Luna board would fix the rest.
- Extra controls the brief required but the boards don't show: personality filter, texting style, decor/lighting, readability dimmer, session goal, "Leave activity", memory search.

## Chat realism (v2)
- Reply scheduler: waits ~1.5–2s for follow-up messages and answers several in one go; marks read, then shows typing for a time matched to each bubble's length; never drops a message sent while she's replying.
- Context sent to Claude: fictional backstory (Luna: UX student with cat Mochi; Alex: architecture student with dog Biscuit), chosen traits and texting style, current simulated activity and earlier today, last 30 messages with time gaps, approved memories, a running summary of older chat (auto-condensed every 40 messages), the user's name, and a list of her recent lines so she doesn't repeat herself.
- Her reply is JSON: 1–3 bubbles, an optional emoji reaction on your message, an optional selfie (from her current scene), and an optional "remember this?" suggestion that you approve or dismiss.
- She texts first when you return after 3+ hours. Header shows "Online · studying" etc. from the routine; replies are slower while she's asleep or busy.
- You can react to her messages (tap a bubble, or double-tap for ❤️).
- Photos you send are passed to Claude so she can actually see them (when the viewer allows images).
- Tests: `python3 tools/chat_realism_test.py` (stubs the runtime to exercise the live pipeline), `python3 tools/e2e.py`.
