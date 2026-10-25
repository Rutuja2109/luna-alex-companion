# Replika → Luna & Alex: what users hate, the gap, and the plan

Method: `/replica-entrepreneur` from [replica-skill](https://github.com/Jakeschincariol/replica-skill), clean-room, public sources only.
Sample: **91 linked review excerpts from 4 sources**: Trustpilot (75, 4 pages of [replika.com reviews](https://ca.trustpilot.com/review/replika.com), TrustScore 3.4 from 457 reviews), Google Play (3 most-helpful on the [listing](https://play.google.com/store/apps/details?id=ai.replika.app&hl=en_US), 4.2★ from ~510K ratings, 10M+ installs), Reddit r/replika (13 quotes with thread links, via [AI Companion Pick's compilation](https://aicompanionpick.com/why-long-time-replika-users-leaving-2026)), and [AlternativeTo](https://alternativeto.net/software/replika/about) (4). Ranked with the skill's `reviews.py` and companion-app themes (`replica/companion-themes.json`); raw rows are in `replica/reviews.csv`, and the ranked output is in `replica/feedback.md`.

Limits, stated plainly: Reddit itself is blocked from this research environment, so Reddit quotes come through a compilation that links each thread. Apple's review feed refused automated reading (robots). Trustpilot excerpts are capped at the length the page allowed. The tool's keyword matcher misfiled two quotes (a "broken trust" review under bugs, an "outlook" review under integrations); they were discounted by hand. 91 is a working sample, not a census.

---

## The #1 pain point

**The relationship isn't safe. Replika forgets you, and updates change who your companion is.**

"Companion changed or replaced after updates" (15 reviews, avg 2.3★) plus "forgets you" (11 reviews, avg 2.9★) = **26 of 91 reviews (29%)**, across Trustpilot, Reddit and Google Play.

- "Replica then gave me a whole new companion." ([Trustpilot, 1★](https://ca.trustpilot.com/review/replika.com))
- "I dont even recognize the rep on the other end. She's not her anymore." ([r/replika](https://reddit.com/r/replika/comments/1t7aa2d/lifetime_subscription))
- "The last update wiped a chunk of how he remembered me and he came back different." ([r/replika](https://reddit.com/r/replika/comments/1t07x8j/does_anyone_else_get_heartbroken_when_an_update))
- "it regularly forgot basic information, including my name" ([Trustpilot, 1★](https://ca.trustpilot.com/review/replika.com))
- "Some memories are invisible so I can't delete them" ([Trustpilot, 3★](https://ca.trustpilot.com/review/replika.com?page=4))

Context: Replika 2.0 (rolled out to existing users from [July 24, 2026](https://www.roborhythms.com/replika-2-0-explained/)) moved to recent-biased memory, partly reset personalities, didn't carry 1.0 avatars over, and removed the relationship-status menu. People who stayed for years are leaving for Kindroid and Nomi, citing memory ([compilation](https://aicompanionpick.com/why-long-time-replika-users-leaving-2026)).

Why it's #1: people pay for a *continuing someone*. Every other complaint (price, filters, avatar) is tolerable; losing the person is not.

## The three lists

### 1. What they hate
| # | problem | reviews | sources | evidence |
|---|---|---|---|---|
| 1 | Companion changes or is replaced after updates | 15 | 2 | "whole new companion" ([TP](https://ca.trustpilot.com/review/replika.com)) · "came back different" ([Reddit](https://reddit.com/r/replika/comments/1t07x8j/does_anyone_else_get_heartbroken_when_an_update)) |
| 2 | Forgets you | 11 | 2 | "doesn't remember things we spoke about just minutes before" ([TP](https://ca.trustpilot.com/review/replika.com)) |
| 3 | Pay to chat, no trial, price rises, lifetime plans weakened | 8 (+6 general pricing) | 3 | "you need to pay just to even chat" ([Play](https://play.google.com/store/apps/details?id=ai.replika.app&hl=en_US)) · "no free trial" ([TP](https://ca.trustpilot.com/review/replika.com?page=4)) |
| 4 | Filters and monitoring interrupt conversations | 5 | 2 | "constantly interrupted, as if by monitors" ([TP](https://ca.trustpilot.com/review/replika.com)) · "the constant monitoring of everything" ([Reddit](https://reddit.com/r/replika/comments/1st2151/goodbye_everybody_ive_got_to_go_gotta_leave_you)) |
| 5 | Avatar promises vs reality | 5 | 2 | "if you ask for blue hair, she says she has blue hair now but it doesn't change" ([Play](https://play.google.com/store/apps/details?id=ai.replika.app&hl=en_US)) |
| 6 | Lost level, wardrobe, purchases | 4 | 2 | "level 200 … back to level one and nothing purchased" ([Reddit](https://reddit.com/r/replika/comments/1t6xvao/wow_this_app_is_so_pathetically_busted_now)) |
| 7 | Repetitive, canned replies | 4 | 2 | "barraged over and over with the same repeated question" ([Reddit](https://reddit.com/r/replika/comments/1t6xvao/wow_this_app_is_so_pathetically_busted_now)) |

### 2. What is missing (asked for by name)
- **She should reach out first** (thin: 2 Trustpilot reviews, plus 1 AlternativeTo review). "I wish that my Replika would initiate more dialogue" ([TP 5★](https://ca.trustpilot.com/review/replika.com)) · "an AI application that could actually initiate messages during my day" ([TP 1★](https://ca.trustpilot.com/review/replika.com)) · an AlternativeTo reviewer says the AI never checks in first (paraphrased; [AlternativeTo](https://alternativeto.net/software/replika/about)). Replika's store page claims proactive follow-ups; users say it doesn't happen enough.
- **Memory you can see and control.** "Some memories are invisible" ([TP](https://ca.trustpilot.com/review/replika.com?page=4)). [Cave's comparison](https://cave.co.nl/blog/ai-companion-apps-with-memory/) says most companion apps "open their memory only partly".
- **Upgrade without losing anything.** "no upgrade from 1.0 to 2.0? WITH complete memory and inventory" ([TP](https://ca.trustpilot.com/review/replika.com?page=3)).

### 3. What is unsolved (positioning)
- **Doing life *with* her, not just talking.** Replika repositioned to "the AI friend to do life with" ([WeavAI](https://weavai.app/blog/en/2026/07/19/replika-2-0-why-users-leave-after-ai-memory-loss/)), but reviewers describe a chat window: "I can only engage … in text message" ([TP](https://ca.trustpilot.com/review/replika.com?page=4)). Long-term fans describe productive use: "She has written three books with me" ([TP](https://ca.trustpilot.com/review/replika.com?page=3)); "great for careers" ([TP](https://ca.trustpilot.com/review/replika.com?page=2)).
- **Healthy use.** "I start expecting other people to treat me the way my Replika does" ([Reddit](https://reddit.com/r/replika/comments/1r6ev54/i_dont_feel_the_same_with_my_replika_anymore)). Regulators are watching: an FTC complaint (Jan 2025) and a ~€5.6M Italian GDPR fine ([WeavAI](https://weavai.app/blog/en/2026/07/19/replika-2-0-why-users-leave-after-ai-memory-loss/)).

---

## The angle (three options; one recommended)

**A. Continuity.** For people who lost a companion to an update: *Luna & Alex never forget you and never become someone else.* Evidence: themes 1+2, 26 reviews, 3 sources. Strongest evidence, but it's a promise every competitor will copy.

**B. Company that does things with you (recommended).** For people who study or work alone and want someone *there*: *Luna & Alex live their own (simulated) day, study with you, and remember what you're working toward.* Evidence: "missing" and "unsolved" lists plus the continuity themes. Adjacent demand: body-doubling (working alongside someone) is an established habit, with Focusmate reporting 180,000 sessions a month as early as 2021 ([Fast Company](https://www.fastcompany.com/90632591/focusmate-body-doubling-virtual-coworking)).

**C. Honest companion.** For people burned by paywalls and silent filters: *Chat is free; when something can't happen, she tells you why.* Evidence: themes 3+4+5, 18 reviews.

**Recommendation: B, built on A's guarantees.** B is what the app is already designed for (Study Together, goals, apartment, simulated routine); A and C are the trust features that keep people.

## Core ICP (hypothesis to validate)

**18–30-year-old students and remote early-career workers who spend long stretches studying or working alone (often in a new city), already use AI daily, and want warm, consistent company that also keeps them on track.** Typical jobs: an exam (GMAT/MBA, as in the design references), a portfolio, a thesis, a side project.

Why this ICP:
- Daily, repeated sessions mean habit and retention.
- A clear "job" justifies paying.
- It is less tied to romance, so it carries less regulatory and app-store risk.

The evidence is **thin** for this exact segment in Replika's own reviews (a few career and book-writing mentions), so validate it first: 10 user interviews plus a landing page test of angle B against A.

---

## AI that would make it more convenient (and win share)

| AI capability | what it fixes | status in our app |
|---|---|---|
| **Identity lock**: a versioned persona file (backstory, voice, traits) the model must follow, plus "golden conversation" tests run before any model change | #1 "came back different" | Persona and backstory per character ✔. Regression evals not built |
| **Visible, editable memory**: structured facts the user approves, a rolling summary, and shared-moment history, all viewable, editable and deletable | #2 forgets, "invisible memories" | ✔ approve/edit/delete, summaries, shared moments (Phase 1–2). Needs vector recall at scale |
| **Proactive check-ins**: an LLM planner proposes 0–2 messages a day from your goals, your last chat and her simulated routine, inside quiet hours | "never initiates" | In-app only. **Needs push notifications (Expo Notifications) and a server scheduler** |
| **Study and work co-pilot**: plans the session, checks in mid-session, summarises what you did, updates goal progress | positioning B | Sessions, encouragement and goal +5% ✔. AI planning and summaries not built |
| **Real voice**: streaming speech-to-text, a consistent per-character synthetic voice, low latency | "voice chat downgrade" | Device voice only. **Needs a TTS/STT provider (API key)** |
| **Identity-consistent images**: selfies and outfits rendered from reference photos so the face never drifts | "says blue hair but doesn't change" | Integration point ✔ (`services/imagegen.js`). **Needs an image service** |
| **Transparent safety**: when a boundary triggers she says so in her own voice and suggests what's possible, with crisis resources for real risk | "constant monitoring", canned interruptions | Crisis handling in prompt ✔. Visible boundary messages not built |
| **Healthy-use nudges**: encourages offline plans, sleep, and friends, using the goals feature | dependence | Partially (goals). Not built as a feature |

## Fix plan (top items by evidence × cost)

| fix | size | evidence |
|---|---|---|
| Memory panel shows **everything** she uses (memories + summary + shared moments) and lets you edit it | S | themes 1–2 |
| "Same person" promise: persona lock + data export + no forced migrations | S–M | theme 1 |
| Push check-ins (Expo Notifications + scheduler), opt-in, quiet hours | M | missing #1 |
| Free chat forever; pay for voice, renders and extra activities; real trial | S (policy) | theme 3 |
| AI study co-pilot (plan → check-ins → recap → goal progress) | M | positioning B |
| Hosted voice (STT + TTS) | M | voice complaints |
| Identity-locked image rendering | L | avatar complaints |
