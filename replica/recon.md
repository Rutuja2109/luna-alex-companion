# Recon: Replika (mobile app) → Luna & Alex

Method: `replica-recon` from [replica-skill](https://github.com/Jakeschincariol/replica-skill). Clean-room: public sources only. We rebuild **what the app does and how a user moves through it**, never what it owns (name, logo, 3D avatars, copy, colours, sounds). Every feature below is rebuilt with Luna & Alex's own art, theme and wording.

**Scope:** the core loop: a companion you talk to every day, who gets to know you (levels, memory, diary), and who you dress, house and spend time with. **For:** the ICP in `fixes.md`, 18–30-year-old students and remote early-career workers who study or work alone.

## Sources

| source | what it gave | url |
|---|---|---|
| Help center: XP | XP from chatting, no daily cap, what levels mean (10–30 explores topics, ~50 well established) | https://help.replika.com/hc/en-us/articles/360055809432-What-is-XP-and-how-does-it-work |
| Help center: Memory section | memory, levels, chat history articles (titles only were readable) | https://help.replika.com/hc/en-us/sections/4411154952077-Memory |
| ScreensDesign teardown (90 screens) | onboarding order, paywall, profile (status, diary, memory, backstory, voice), store and currencies, call rating | https://screensdesign.com/apps/replika-ai-friend/ |
| eesel overview | tiers (Free / Pro / Ultra / Platinum / Lifetime), up/down votes, diary, quests, mood tracking, meditations, AR/VR | https://www.eesel.ai/blog/replika-ai |
| AI Companion Pick tips | memory tab editable, traits, interests, levels unlock cosmetics | https://aicompanionpick.com/best-replika-tips-for-new-users |
| Google Play listing | pitch, rating, installs | https://play.google.com/store/apps/details?id=ai.replika.app&hl=en_US |
| Reviews (91, see `reviews.csv`) | what users hate and miss | `replica/feedback.md` |

## Screen inventory

| ID | screen | how you get there | purpose | key components | states |
|---|---|---|---|---|---|
| S01 | Welcome / sign-up | first launch | account | auth buttons | — |
| S02 | About you (name, pronouns, age range) | onboarding | personalise | text input, chips | empty, filled |
| S03 | Companion role + gender | onboarding | friend / partner / mentor | chips | — |
| S04 | Style + name your companion | onboarding | look | carousel, input | — |
| S05 | Goals (primary, wellbeing, activity) | onboarding | intent | multi-select lists | — |
| S06 | Building companion → paywall → meet | onboarding | convert | checklist, plans | — |
| S07 | Chat (avatar + conversation) | home | core loop | bubbles, input, up/down votes, reactions | typing, empty |
| S08 | Voice call → star rating | chat | talk | avatar, captions, controls, rating modal | connecting, live, rated |
| S09 | Companion profile | tap companion | who they are | level + XP, relationship status, traits, interests, backstory (500 chars), voice | locked statuses (paid) |
| S10 | Diary | profile | companion's entries about your days | dated list, edit, feedback | empty |
| S11 | Memory | profile | facts it knows, by category | category list, add fact form | empty |
| S12 | Customize: clothes / appearance / room | profile | dress up, decorate | grid, currency prices, preview | insufficient funds |
| S13 | Store + currency (coins, gems) | customize | spend | balances, cart, top-up | not enough coins |
| S14 | Activities / quests | nav | things to do together, earn currency | cards | done |
| S15 | Mood tracking / meditations | activities | wellbeing | mood picker, history | — |
| S16 | Settings / account | menu | prefs, delete account, version history | toggles | — |

## Flows

- **F01 Onboard:** S01 → S02 → S03 → S04 → S05 → S06 → S07 (Replika: ~20 screens, paywall before first chat). **Ours:** 10 screens, no paywall, 18+ confirmation, goals.
- **F02 Daily loop:** open → companion texts / greets → chat (XP) → vote on replies → level up → reward.
- **F03 Know me:** chat → fact saved to memory → visible in S11 → diary entry that night (S10).
- **F04 Dress up:** S12 → item → price in coins → buy → applied.
- **F05 Mood:** S15 check-in → companion responds in chat.
- **F06 Call:** S07 → S08 → rating.

## Inferred data model (guesses marked)

- `Companion`: name, gender, status (friend | partner | mentor), traits[], interests[], backstory (≤500), voice, level, xp. Evidence: S09. Confidence: high.
- `Memory`: id, category, text. Evidence: S11 add form. High.
- `DiaryEntry`: id, date, text, feedback. Evidence: S10. High.
- `Message`: id, from, text, vote (up | down), reaction. Evidence: S07, help "upvotes and reactions". High.
- `Wallet`: coins, gems. `Item`: id, category, price, owned. Evidence: S12–S13. High.
- `Quest`: id, reward, done. Evidence: eesel. Medium (exact quests unknown).
- `Mood`: date, value. Evidence: eesel. Medium.

## What cannot be cloned (skip)

- Replika's name, logo, 3D avatar models, outfits art, voices, copy, colours: owned. We use Luna & Alex's art and theme.
- AR / VR (Meta Quest): hardware-specific, out of scope.
- Real-money purchases (Pro / Ultra / Platinum, coin packs): deliberately **not** cloned. Reviews rank "pay to chat, no trial" #3. Ours: chat, calls and every relationship status are free; coins are earned only.
- "Advanced AI mode" as a paid tier: our replies always use the best available model.

## Size

16 screens, 6 flows, 7 entities. Hard parts: memory that stays consistent (done, Phase 1–5), proactive messages when the app is closed (needs push + a server), real-time voice (needs a speech provider). Size: **M**.
