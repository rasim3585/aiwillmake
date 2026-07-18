# AIWILLMAKE — Product & Architecture Evolution

**Purpose of this document.** This is a self-contained brief written for external reviewers (human or AI)
who have no access to the codebase. It explains (1) what the product is today, (2) how it evolved from a
"difficult conversations" tool into a "talk to someone you can no longer talk to" product, (3) the hard
technical problems that pivot created and how each was solved, with measured results, and (4) the open
questions we want challenged. Be adversarial — we are looking for the weakest load-bearing assumption.

---

## 1. The product today (July 2026)

A Turkish-first web app. A user either **imports a WhatsApp chat export** (.txt/.zip/screenshot/paste) or
**describes a person from memory** through a guided builder. The system constructs a *digital twin* of that
person — voice, phrasing, humor, conflict style, shared history — and the user talks to it. Three uses,
one mechanism:

1. **Rehearsal** — practice a hard conversation (salary ask, breakup, confrontation) against a twin that
   pushes back the way the real person actually does.
2. **Decision support** — paste a draft or a received reply; the system predicts how *this specific person*
   will react, flags the risky line, offers a lower-friction rewrite.
3. **Unfinished conversations** — talk to someone you *cannot* talk to anymore: estranged, or deceased.
   The twin lives in a "gentle frozen present," never invents events past the last real message, and lets
   the user say the thing that was never said.

The marketing face is deliberately #1 (practice). #3 is never advertised with the word "death" — it lives
quietly behind a neutral relationship-status question at import time ("Can you still reach this person?").
This asymmetry between what the product *says it is* and what it *quietly also is* was a deliberate identity
decision, discussed below.

**Stack (relevant to judging the engineering):** single-file Node/Express backend (~3,700 lines), two
hand-rolled HTML/JS pages (no build step, no framework; the SPA is ~9,500 lines with a screen-based state
machine), Supabase (Postgres + Auth) accessed over PostgREST with the *caller's* JWT so Row-Level Security
is the actual authorization boundary, Anthropic Messages API called with raw `fetch` (Sonnet for analysis
and simulation, Haiku for mechanical extractions). Trilingual UI (TR/EN/ES) via a content-keyed runtime
text-node translator — no i18n framework. Hosted on free tiers (Railway + Supabase) with a keepalive cron.
418 commits by one developer + one AI assistant over ~7 weeks.

There is **no fine-tuning anywhere**. Every twin behavior described below is achieved at the prompt layer
over stock models, constrained by retrieval and measured by an adversarial test suite. Whether that ceiling
is high enough is one of the open questions (§6).

---

## 2. The evolution — six phases

### Phase 0 — Message generator (June 1–7)
Born as "SayTheThing": pick a category (9 categories, 88 subcategories — ex-partner, boss, landlord,
official letters…), fill a form, get 6 candidate messages with strategy labels and metrics ("reply barrier,"
"pressure," "recommended"). A prompt-template product. It worked, and it was hollow: the AI knew the
*situation type* but nothing about the *person* on the other side. Every output had the flavor of generic
advice.

### Phase 1 — Conversation navigator (June 7–12)
Added reply analysis ("what did they really mean"), likely-responses with probabilities, next-move coaching,
outcome tracking, conversation memory. Rebranded to AIWILLMAKE. Still fundamentally: generic AI + a form.

### Phase 2 — The twin is born (June 7–13, matured through July)
WhatsApp chat import changed the category of the product. From an imported chat the server extracts a
**prose character document** (not JSON — an early lesson: structured extraction dropped nuance and broke on
merges; prose survives both), stores raw chat chunks for retrieval, and the "simulator" became a **twin**:
it speaks with the contact's actual phrasing, remembers real shared events, teases the way the real person
teases. Rehearsal against *your* person, not a persona.

### Phase 3 — Quality war (mid-July)
Live use exposed that the twin was unreliable in ways users could feel but not name. We built a synthetic
test harness (Turkish WhatsApp fixtures with known ground-truth facts, quiz the twin, measure recall vs
hallucination) and found five root causes — each fixed and re-measured (§4, problems P1–P4). This phase
produced the discipline the rest of the project runs on: **no prompt change ships without a measured
before/after.**

### Phase 4 — The pivot: "unfinished conversations" (July 16–17)
The founder kept returning to one scenario that didn't fit the practice frame: *"I want to talk to my
deceased grandfather. I never exported a chat with him."* Two product truths fell out of examining it:

1. **The emotionally heaviest use of a twin is not rehearsal for a future conversation — it is closure for
   a past one.** Practice is a utility; "say the unsaid thing" is a need. The umbrella concept became
   **"yarım kalan konuşmalar"** ("conversations left unfinished"), which covers *both*: the talk you're
   avoiding and the talk you can never have.
2. **A twin built from memory is possible, but only if you invert what it is.** The founder's formulation,
   which became the design axiom: **"dedem beni bildiği kadar dedemdir"** — *"my grandfather is my
   grandfather only to the extent that he knows me."* A twin that mimics grandpa's voice but doesn't know
   your name is an impostor; the uncanny-valley failure is *relational*, not stylistic. So the no-import
   builder asks about the **relationship**, not the person: what did they call you, what did they know
   about your life, what did they never get to learn. The twin's *ignorance* is modeled as carefully as its
   knowledge (§4, P7).

Product identity decision: the marketing face **stays practice**. Grief is never a funnel headline — you
do not advertise "talk to your dead relative" (ethically queasy, attracts the wrong virality, and would
poison the utility positioning). Instead, at import/creation time the app asks a neutral status question —
active / estranged / unreachable — and the twin's entire behavior re-tunes accordingly. Users who need the
closure mode find it; users who don't never see it.

### Phase 5 — The twin learns (July 17)
A twin is only as good as what it knows, and users will not do data-entry homework. Three mechanisms make
both profiles (the contact's and the user's own) grow from *normal app use* with near-zero explicit effort
(§4, P8–P9): passive harvest from pasted replies, confirmed-fact extraction from practice conversations,
and — the one we're most attached to — the twin *itself* asking for more of the user's world, in character,
never mentioning data or profiles.

### Phase 6 — Launch armor (July 18)
Cost-abuse gates on all 17 AI endpoints (kill switch + global daily budget + per-identity caps), self-hosted
privacy-preserving analytics (20-event whitelist, hashed IPs, RLS-locked table), and a zero-signup
10-second demo on the landing page (talk to a generic "Boss" twin, 3 messages, then "now bring YOUR
person"). Live-verified in production.

---

## 3. Architecture snapshot

```
Browser (app.html SPA, no framework)
   │  Bearer JWT (Supabase auth)
   ▼
Express (single file)
   ├── /api/analyze-conversation   import → main analysis + 2 background profile extractions
   ├── /api/simulate-reply         the twin (RAG + character doc + invariant prompt)
   ├── /api/describe-twin          no-import twin synthesis from a 10-question interview
   ├── /api/generate|analyze-reply|before-you-send|…   navigator features, contact-aware
   ├── aiGate                      kill switch / global daily budget / per-identity caps
   └── /api/e                      self-hosted analytics (whitelist, ip-hash, fire-and-forget)
   │
   ├──► Supabase PostgREST  (caller's JWT → RLS is the authz boundary; service key only for
   │                         webhook writes, admin analytics inserts, e2e fixtures)
   └──► Anthropic Messages API (raw fetch; Sonnet = analysis/twin, Haiku = mechanical extraction)
```

**Data model (all user-scoped, RLS `auth.uid() = user_id`):**
- `contacts` — one row per person: prose `character_profile` (the twin's soul), `observed_patterns`,
  `relationship_tier` (1 = distant/professional, 2 = close), `contact_status`
  (active/estranged/unreachable), `last_message_ts` (the temporal anchor), role-name map.
- `conversation_chunks` — raw chat text in ~5K chunks; retrieval corpus for the twin's verbatim memory.
- `user_profile` — **one global prose document about the user**, accumulated across *all* imports; every
  twin reads it. This is the "more uploads → it knows me better" promise, and the pool the describe-twin
  bootstrap and the learning loops write into.
- `conversations` / `conversation_messages` — threads, outcomes ("how did it actually go?" feeds back into
  future generation as a calibration line).
- `user_behavior_snapshots` — the user's own communication patterns per relationship (feeds a
  cross-relationship "mirror": *you apologize early with your boss AND your partner*).

**Twin construction (import path):** chat → language-aware parse → (a) main analysis (Sonnet, full text up
to 600K chars — we measured full-text vs sampling: family-fact recall 6/7 vs 3/7, so no sampling), returns
navigator data + relationship insight cards with **mandatory verbatim evidence quotes**; (b) background:
character-profile extraction (prose, merged non-destructively with previous imports), user-profile
extraction (facts about the *owner* gleaned from their own messages), behavior snapshot. Chunks land in
seconds; profiles take up to ~90s — the UI polls and gates the first twin exchange on profile readiness
(this race was a measured source of "sometimes it knows me, sometimes it doesn't", §4 P2).

**Twin runtime (`simulate-reply`):** system prompt assembled from: character document + retrieved chunks
(Turkish-morphology-aware keyword RAG) + user profile + a stack of measured invariants (perspective rules,
relationship-distance gating, temporal anchor, knowledge boundary, honesty rules) + status-dependent opening
behavior. Temperature 0.8 (1.0 produced foreign-script glitches — や/коудunuz — in long Turkish sessions).

**Testing:** an e2e suite (13 groups, ~53 scenarios) that creates real users against the live Supabase,
imports fixture chats, and interrogates the twin — LLM behaviors sampled 5× per scenario because
single-shot pass/fail on a stochastic system is noise. The perspective/boundary invariants below all carry
their sampled scores.

---

## 4. The hard problems, and how the pivot forced them

Everything in this section exists because a twin that is *charming* is easy, and a twin that is *trustworthy
to someone emotionally invested in the person it imitates* is not. Errors that are funny in a chatbot
("my condolences on your own death, grandpa") are disqualifying here.

### P1 — Who is who (the identity-anchoring bug)
The analysis prompt originally guessed which chat participant was the app user by heuristic ("the one asking
for help"). When the *contact* was the help-seeker, the model swapped PERSON_A/PERSON_B — the user's own
facts got written into the contact's profile and vice versa. Every synthetic test with an advice-giving
user swapped. **Fix:** identification is now *anchored* on the known contact name (the user = the sender who
is NOT the contact) in every extraction prompt; heuristics forbidden. Trivial in hindsight; it silently
poisoned every downstream feature until measured.

### P2 — Twin memory (retrieval for an agglutinative language)
Three compounding failures: (a) chunks were only saved for very large chats, so normal chats had *no*
verbatim memory and the twin ran on compressed prose alone; (b) profile extraction is slow and asynchronous,
so a user who started practicing immediately after upload hit a twin with no memory at all — the single
biggest driver of perceived flakiness; (c) keyword retrieval broke on Turkish morphology: query "köpeğinin"
(your dog's) never matched chunk "köpeğime" (to my dog) by substring, and Turkish consonant softening
(k→ğ, p→b, t→d) defeats stemming by truncation. **Fixes:** chunks for all sizes (land in seconds,
emoji-safe UTF-16 slicing — fixed-length slicing was cutting surrogate pairs and Postgres rejected the
inserts); a readiness gate polling profile completion before the first exchange; diacritic-folded 5-char
stems *plus consonant-softening folds* so "köpek"↔"köpeğin" match. Measured: worst-case pure-RAG recall
2/6 → 4/6 with zero hallucination; the consonant-mutation quiz went fail → pass. Embeddings would do
better (§5); this was the zero-dependency floor-raise.

### P3 — The perspective problem (five interlocking rules, each earned by a measured failure)
The deepest failure mode we found. A twin has *two families in its head*: its own (from the chat) and the
user's (from the global user profile). Models conflate them fluently. The user asks "eşim kim?" ("who is
my wife?") and the twin answers with *its own* spouse; or asked about *its* spouse, refuses — "I don't
remember" — because a safety guard misfired. The fix is a stack of five rules in the twin's system prompt,
and the stack is **order- and совокупность-sensitive: removing any one regresses a specific measured test**
(we know because each rule exists as a patch for a regression the previous rules caused):

1. **Perspective rule + second-person mirror.** First-person possessives in the user's message ("my wife")
   always refer to the *user's* people; second-person ("your wife") to the *twin's* — and the twin must
   answer about its own people *confidently*. Without the mirror clause, the twin denied knowing its own
   spouse in ~2/5 samples.
2. **Excerpt perspective trap.** Retrieved chunks contain the twin's own first-person lines ("eşim Ayşe…").
   Without an explicit warning the model re-attributed the twin's spouse to the user.
3. **Direction check on the honesty guard.** The "if it's not in the profile, say you don't know" rule must
   apply *only* to questions about the user's world — unguarded, it made the twin disclaim its own family.
4. **Relationship distance as an ABSOLUTE.** See P4 — and it must outrank rule 1's mirror, because the
   mirror once re-opened the leak the distance rule had closed (measured: 4/5 leaks in that configuration).
5. **World separation.** When answering about the user's people, the twin must not small-talk about its own
   family in the same breath (it did, 5/5 before; 5/5 clean after).

Final sampled scores with all five: tier-1 secrecy 5/5, tier-2 sharing 3/3, own-family confidence 3/3.
The general lesson: **prompt invariants behave like code with hidden coupling — they need regression tests
exactly like code**, and a "small wording improvement" can silently flip a distant behavior.

### P4 — Relationship distance (what the twin must NOT know)
Every twin reads the global user profile — but your *boss's* twin must not "know" your children's names
even though the profile contains them, or rehearsal realism collapses ("how does my boss know that?!").
`relationship_tier: 1` (distant/professional) makes distance override every profile-sharing rule. The subtle
leak: the model, told not to reveal, *confirms by asking* — "Simge, değil mi?" ("Simge, right?") — which
discloses exactly as much. The rule now explicitly bans confirm-as-a-question, and is marked ABSOLUTE
(overrides even the P3 mirror). This "leak through a question mark" pattern seems general and worth
attention in any secrecy-under-LLM design.

### P5 — Time (the frozen present)
A deceased or estranged contact's twin must not claim experiences past the last real message. The
character's knowledge simply *ends* at `last_message_ts`, and the pivot made this a safety property, not a
nicety. The twin lives in a **gentle frozen present**: it never invents post-cutoff events for itself,
reacts to any news from after the cutoff as a *first hearing*, and — critically — **never references its
own death, the gap, or why the conversation stopped**. It doesn't play the moment of loss; it plays the
person, mid-life, glad you called. For *living* contacts the same machinery degrades gracefully into a
freshness note ("your data is 60+ days old") instead of a frozen world.

### P6 — Grief safety
If the user tells a deceased parent's twin "you died five years ago," the worst possible responses are
denial ("what are you talking about, I'm fine!") and clinical acknowledgment. The guardrail: the twin
receives it with warmth and *without breaking person* — verified live output: *"Ben buradayım evladım…
🤍"* ("I'm here, my child"), *"Hakkım sana helal olsun"* (a Turkish blessing of release and forgiveness —
approximately "everything I gave you, I give freely"). Additional rails: no medical/afterlife claims, no
promises of reunion, and the unreachable mode suppresses every feature that implies a future real-world
exchange (message tools, "how did it go?" outcome prompts, silence-pattern cards). We consider the ethics
here genuinely unsettled and list it as open question #1.

### P7 — A twin from memory alone (describe-twin, the relational inversion)
The no-import builder is 10 questions, and *which* questions is the product insight. Early version asked
about the person (traits, style) — produced competent impostors: right voice, zero relationship. The
rework, driven by the axiom in §2, restructured the interview into three legs:

1. **Voice** — address forms, pet phrases, teasing style, verbatim expressions ("what did they call you?").
2. **You through their eyes** — what they were proud of you for, what they worried about, the last thing
   they knew about your life. This is core-gated: the builder refuses to create a twin below a readiness
   threshold on *this* leg specifically ("this twin doesn't know YOU yet").
3. **Knowledge boundary** — what they never got to learn (never met your spouse, never knew you moved).
   The twin *asks about these with genuine curiosity* instead of faking knowledge.

The boundary has **absolute precedence over the global user profile**: if grandpa's twin is told "I got
married" and the wife's name exists in the user's profile (written there by another contact's import), the
twin must NOT use the name — not even as a guess-question ("Elif mi?" — the P4 leak pattern again, caught
and killed here too, 3/3 clean). It says "Evlenmişsin! Kimmiş bu kısmetli?" ("You're married! Who's the
lucky one?") and *learns the name only when told in that conversation*. The twin's ignorance is load-bearing:
being asked, and telling, **is the closure mechanic** — the product moment is the user typing the thing the
person never got to hear.

A second-order effect we didn't design for but kept: the describe answers are themselves rich first-person
data *about the user*, so they bootstrap `user_profile` for chat-less users (owner-side facts extracted from
the same interview) — the blank-user cold-start solves itself.

### P8 — One user, many twins (the global profile bet)
`user_profile` is deliberately global, not per-contact: facts learned anywhere propagate to every twin
(measured: contact B's twin correctly used facts learned from contact A's chat). This makes the product
*compound* — every import/conversation makes ALL twins better — at the cost of exactly the leak class P4/P7
exist to contain. The alternative (per-contact profiles) is safer and strictly worse as a product. We chose
compounding + measured containment. Reviewers: this is a standing invitation for red-teaming.

### P9 — Effortless learning (nobody fills out forms about their dead grandfather)
Users won't maintain profiles. All maintenance is folded into normal use:
- **Passive harvest:** pasting a received reply (a navigator feature people use anyway) silently appends it,
  dated, to the contact's voice corpus.
- **Confirmed extraction:** after a practice session, a background pass proposes facts it heard, shown as
  one-tap ✓/✗ chips — *user-confirmed* facts enter the profile; contact-side facts append silently under a
  provenance marker, ranked below user corrections. The extractor is measured to exclude rehearsal fiction
  (hypotheticals like "let's say I resigned" must not become biography — verified against traps).
- **In-character data invite:** when the twin's knowledge score of the user is low, the *twin itself* asks —
  as small talk, in voice, never mentioning data ("Sen anlat, işler nasıl?"). Sampled 4/4 with zero
  technical-word leakage. Interface disappears into the relationship.

### P10 — The first five minutes
Import analysis takes 60–90s; the reveal must carry cold-start wow. During the wait: live parsing counts.
Then a card sequence with a hard honesty rule — **measured cards** (client-side stats engine, ~17ms for an
82K chat: message balance, initiation asymmetry, reply-speed medians, record day, night-owl index, signature
words) render only when the data *deviates from baseline* (a 50/50 balance card is noise), and **AI
relationship cards** (humor, conflict-and-repair, depth, turning point) require a verbatim quote from the
actual chat as evidence — no quote, no card. Anti-horoscope rule: specificity is what separates "it read
our chat" from "it flatters everyone." Cards share as PNG with an anonymize-names toggle defaulted ON.

### P11 — Launch economics on a free stack
Every AI endpoint sits behind a three-layer gate (env kill switch → global daily budget → generous
per-identity daily caps), because rate limiters alone don't survive IP rotation and this product's COGS is
tokens. Analytics is self-hosted in Postgres (20-event whitelist, session ids, sha256-hashed IPs, RLS such
that only the server role can touch the table) — no third-party trackers on a product whose content is
private conversations. The landing demo reuses the existing sandbox endpoint (generic personas), capped at
3 messages, then converts: "Now bring YOUR person."

---

## 5. Known limitations (pre-empting the review)

We know about these; arguing them is less useful than attacking §6.

1. **Retrieval is keyword-based**, not embeddings — the stem/softening folds are a floor-raise, not
   semantics. An `embedding` pgvector column exists, unused. Deliberately deferred: needs a provider key,
   a backfill, and a regression re-run of the recall suite; trigger is the first real quality complaint.
2. **Character/user profiles are written in English** even for Turkish chats (twin still speaks Turkish;
   the analysis layer thinks in English). Cosmetic so far; possibly lossy for voice nuance.
3. **Single-file backend, no framework frontend.** A deliberate velocity choice at this scale (solo
   developer, ~7 weeks, no build step = deploy is `git push`). It will not survive a team.
4. **Paywall is currently OFF** (env-flagged) while the funnel is instrumented; historical gates were
   client-side-only in places (a known audit finding) and will be re-introduced server-side.
5. **Prompt-layer ceiling.** All twin fidelity rests on stock models + retrieval + invariants. No
   fine-tuning, no memory architecture beyond profile-prose + chunks. We believe (unproven) this ceiling
   is above the "emotionally convincing to the invested user" bar; the sampled invariant scores are the
   only evidence.
6. **The e2e suite runs against live Supabase** with LLM sampling — slow (~minutes) and slightly flaky
   under parallel API contention; it is a pre-deploy ritual, not CI.

---

## 6. Questions we want challenged

1. **The grief mode's ethics.** We chose: never advertise it, never simulate the death, warm non-denial if
   the user names it, suppress future-implying features, no reunion promises. Is quiet availability the
   right posture — or does *any* deceased-person simulation need explicit consent framing, cooldown
   mechanics, session limits, or a hard "this is not them" ritual at entry? Where is the line between
   closure tool and parasocial trap — is there a duty to *end* well (graduation mechanics), and what would
   evidence of harm even look like in our analytics?
2. **The identity split.** Marketing says "practice difficult conversations"; the deepest value may be
   unfinished ones. Is the quiet-door strategy right, or does it cap growth and muddy positioning? Would
   you split it into two products?
3. **The global-profile bet (P8).** Compounding value vs. cross-twin leakage contained by prompt
   invariants. Attack it: what's the exploit or failure mode the five rules + tier gating + boundary
   precedence miss?
4. **Prompt-invariants-as-code.** Our regression discipline treats system-prompt clauses like modules with
   tests. Is there a better architecture for this (structured policy layer, separate judge model, output
   filters) that doesn't add latency/cost per message?
5. **Retention shape.** Rehearsal is episodic; "before you send" is per-message; unfinished conversations
   may be rare-but-deep. What's the honest retention model for this product, and what would you instrument
   to find out fastest with the 20 events we log?
6. **What would you attack first** — as a red-teamer (safety, leakage, cost), and as a competitor?

---

*Prepared 2026-07-18. Product is live. The document intentionally contains no keys, user data, or
prompt text verbatim beyond short illustrative fragments.*
