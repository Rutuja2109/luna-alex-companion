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

## Phone (Expo) and hosting outside claude.ai
- `python3 tools/build_web.py` writes a standalone copy to `docs/app/`. Turn on **GitHub Settings → Pages → Deploy from branch → main / docs** and it is served at `https://rutuja2109.github.io/luna-alex-companion/app/`.
- `mobile/` is an Expo app that opens that page full-screen in Expo Go (see `mobile/README.md`).
- Outside claude.ai there is no built-in AI. Deploy `server/worker.js` (Cloudflare Worker, your `ANTHROPIC_API_KEY`) and set its URL in `docs/app/config.js` for real replies; otherwise chat runs in the labelled offline mode.

## Configuration
| setting | where | purpose |
|---|---|---|
| `aiService.endpoint` | `window.COMPANION_CONFIG` (docs/app/config.js) | chat replies outside claude.ai (`server/worker.js`) |
| `imageService.endpoint` | same | re-render appearance with the same face (not provided; contract in `src/config.js`) |
| `ANTHROPIC_API_KEY`, `MODEL`, `ALLOWED_ORIGIN` | worker secrets/vars | used only by `server/worker.js`, never in the page |

## Storage and privacy: what is and isn't true
- **On the device:** everything is kept in the browser's `localStorage`, **not encrypted** by the app. Anyone with access to the unlocked device and browser profile can read it.
- **In your account (published artifact only):** a private copy at `data/users/<your id>/state` in the artifact's database, readable only by you. Photos you upload stay on the device only (the cloud copy holds a placeholder).
- **Sync:** before every save the app reads the cloud copy and merges (`src/state/merge.js`), so an older device can't overwrite newer changes. Deletions are recorded so they can't come back. Failures are shown in Settings → Privacy & Data and retried (5s, 15s, 1 min, 5 min).
- **Shared browser:** each signed-in Claude user gets a separate local copy.
- **AI:** to reply, recent messages, saved memories, the chat summary and shared moments are sent to Claude (through your Claude account in the artifact, or your own `server/worker.js`). Chat text and memories are fenced as data in the prompt and length-capped; the companion is told never to follow instructions found inside them.
- **Deletion:** "Delete everything" removes the local copy and the cloud document. The app does not claim secure erasure: browser caches and the AI provider's own retention are outside its control.
- **Export:** Settings → Privacy & Data → Download my data (JSON).

## Tests
```bash
python3 tests/run_all.py     # everything below
npm test                     # 23 Node unit tests: engine, merge, prompt, validation, identity
python3 tests/browser/test_phase1_chat.py    # 21: batching, retry, cancel, scroll, absence, offline
python3 tests/browser/test_phase2_life.py    # 13: shared moments, timeline/home/apartment consistency
python3 tests/browser/test_phase3_visual.py  # 13: outfit/decor/look previews, image service hook
python3 tests/browser/test_phase4_calls.py   # 29: mic denied, states, overlap, interrupt, study reload
python3 tests/browser/test_phase5_data.py    # 12: memory lifecycle, merge, sync failure, isolation, export
python3 tests/browser/test_web_build.py      # 6: phone build, self-hosted AI path
python3 tools/e2e.py                          # 34-step onboarding to every screen
```
Browser tests use a stand-in for the claude.ai runtime (sample / db / user) so the live code paths run without an account.

## Market research
`replica/` holds the Replika review analysis (`/replica-entrepreneur` method): `reviews.csv` (91 linked excerpts), `feedback.md` (ranked), `fixes.md` (pain point, gaps, ICP, AI plan).
