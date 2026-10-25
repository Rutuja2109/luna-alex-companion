# Build log: structural clone (clone.html)

Pipeline: replica-recon → (architect/design folded into the existing app's tokens and data layer) → replica-build → replica-test. Clean room: no code, art, copy, logo or colours from the original. Layout and flows follow `recon.md`.

| ID | screen | status | notes |
|---|---|---|---|
| S01–S06 | Onboarding (12 steps) | done | Adults-only gate; no paywall; companion fixed to Luna / Alex |
| S07 | Main room + chat | done | Level bar, wallet, quests pill, side actions, votes, reactions, mood card, remember cards, retry on failure |
| S08 | Voice call + rating | done | Device speech; typed fallback when speech input is unavailable |
| S09 | Profile | done | Status, traits, interests, backstory, voice, mood week, promise card |
| S10 | Diary | done | Written per past day; edit / rate / forget; forgotten entries never rewritten |
| S11 | Memory | done | Categories, add / edit / delete |
| S12 | Customize | done | Clothes + apartment style |
| S13 | Store | done | Gifts (used in chat) and room decor (owned); earned currency only |
| S14 | Activities + quests | done | 7 activities, 3 daily quests, streak |
| S15 | Mood | done | In-chat check-in, weekly view on profile |
| S16 | Settings | done | Texts-first + quiet hours, notifications, export, delete |

Harder than expected: the source photos are small and landscape, so full-screen layouts went soft; fixed by showing each photo at its natural ratio over a blurred copy. Tests caught two real bugs (goal ids sent to the AI instead of words; a forgotten diary entry being rewritten) and one prompt-fence gap (new data tags weren't stripped from user text).

Tests: `tests/bond.test.js` (5) and `tests/browser/test_clone.py` (38), all passing.
