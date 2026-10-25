# Architecture (replica-architect)

The clone runs as a static web app (no build step) so it works three ways from one codebase: as a Claude artifact, on GitHub Pages, and inside the Expo app (`mobile/`, WebView).

| layer | choice | why |
|---|---|---|
| UI | vanilla ES modules (`clone/`), hash routes | same stack as the main app; no build; runs anywhere |
| styling | `css/tokens.css` + `clone/clone.css`, roles in `replica/design/tokens.json` | one place to rebrand |
| AI | shared `src/services/ai.js`: artifact `sample` capability, or `server/worker.js` (Anthropic API proxy) | key never in the page |
| data | `localStorage` key `clone.state.v1` (device only); JSON export | private by default; a server DB is the next step for sync/push |
| speech | browser SpeechSynthesis / SpeechRecognition | free; a hosted voice is a later upgrade |
| mobile | Expo WebView (`mobile/`) | install on a phone without a store listing |
| push (planned) | Expo Notifications + a scheduled worker | needed for "texts first" when the app is closed |

## Data model (as stored)

- `user` { name, pronouns, age, goals[] }
- `comp` { status, traits[], interests[], backstory ≤500, voice, outfit, room, decor[] }
- `chat[]` { id, from me|them|system, type text|photo|gift|remember, text, img, vote ±1, reaction, offline, ts }
- `memories[]` { id, cat about|goals|people|likes|dates|other, text, name?, rel?, ts }
- `diary[]` { id, day YYYY-MM-DD, text, vote, offline, deleted?, ts }
- `moods[]` { id, day, mood, emoji, ts } · `ratings[]` { id, kind, stars, ts }
- `bond` { xp, coins, gems, streak, best, lastDay, quests{day, progress, claimed}, owned[] }
- `settings` { textsFirst, quietStart, quietEnd, personaVersion }

If this moves to a server (Postgres): one row per user for `user/comp/bond/settings`, and tables for `messages`, `memories`, `diary_entries`, `moods`, `ratings`, each with `user_id` (row-level security: owner only), `created_at timestamptz`, indexes on `(user_id, created_at)`.

## Build order (done)

Vertical slice: onboarding → room chat → reply (S01–S07). Then profile/memory (S09–S11), diary (S10), store/customize (S12–S13), activities/quests (S14), call (S08), settings (S16).
