# Review brief — Luna & Alex Companion

Please review this AI companion app MVP. Files in this package:
- `docs/screens/` — screenshots of every screen in a 390×844 phone emulator, most shown side-by-side with the design reference they were built from (`*-compare.png`).
- the repo root — complete source (vanilla JS ES modules, no build). Start with `README.md`, then `src/services/ai.js` (conversation engine) and `src/screens/chat.js`.
- `reference/` — the original design boards.

Product goal: a customizable fictional virtual human (Alex or Luna) with a simulated daily life, natural texting, a personal apartment, shared activities (study, coffee, movie…), voice/video-style calls, user-controlled memories, and goals. Runs as a Claude artifact; chat replies come from Claude via the artifact runtime, with a labeled offline fallback.

What I'd like feedback on:
1. Visual fidelity vs. the reference boards (compare images).
2. Does the chat feel like texting a real person? See `screens/chat-realism.png` and the prompt in `src/services/ai.js` (`buildPrompt`).
3. UX gaps, confusing flows, missing states.
4. Code quality, architecture and anything risky.
5. Highest-impact next features vs. Replika, Kindroid, Nomi, Character.AI.

Known limits (by design, labeled in the app): video call is an animated photo (no lip-sync); no user camera/mic recording; notifications are in-app only; appearance colour changes don't re-render photos; some Luna scenes are low-resolution crops.
