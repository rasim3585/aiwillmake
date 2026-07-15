# CLAUDE.md — aiwillmake

AI conversation navigator + "digital twin" rehearsal app. Turkish-first UI, English codebase/prompts.
User imports a WhatsApp chat (.txt / .zip / screenshot / paste) → server builds a character profile of the
contact with Claude → user practices hard conversations against that contact's AI twin, generates messages,
and analyzes replies. Auth via Supabase (Google OAuth + email/pw). Payments via LemonSqueezy.

## Stack & layout
- **Backend:** single file `server.js` (~2940 lines), Node + Express 5. Serves `/api/*` and static files.
- **Frontend:** no build step. `index.html` (marketing landing) + `app.html` (~8900-line SPA, hand-rolled
  `App.navigateTo(screen)` state machine). `privacy.html` is static.
- **AI:** Anthropic Messages API, called with raw `fetch` (no SDK). `claude-sonnet-4-6` for analysis/simulation,
  `claude-haiku-4-5-20251001` for lighter tasks (detect-category, goal-context, likely-responses, rehearse, OCR).
- **DB/Auth:** Supabase. Server talks to it over the **PostgREST REST API** (not the JS client for data) using the
  caller's JWT, so Row-Level Security is the real access-control boundary. `supabase-js` is used only for
  `auth.getUser(token)` verification.
- **Hosting:** Railway (`railway.toml`, healthcheck `/health`). `ecosystem.config.js` is a leftover PM2 config.

## Run / test
```bash
npm start                       # node server.js  (server.js does NOT load dotenv itself)
node -r dotenv/config server.js # local run WITH env loaded — use this locally
node -r dotenv/config e2e_test.js   # e2e suite (gitignored). Needs SUPABASE_SERVICE_ROLE_KEY.
```
There is no unit-test runner (`npm test` is a stub). `e2e_test.js` / `playwright_test.js` are gitignored.

## Environment variables
Defined in `.env` (gitignored — verified not tracked). `.env.example` is **stale/incomplete** (missing the
Supabase and LemonSqueezy vars the code actually reads, and still lists Stripe).
Actual vars the code reads:
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env` — **but see BUG below: the webhook reads `SUPABASE_SERVICE_KEY`.**
- `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`,
  `LEMONSQUEEZY_PRO_VARIANT_ID`, `LEMONSQUEEZY_UNLIMITED_VARIANT_ID`
- `PORT` (default 3000)
- Stripe vars in `.env` are dead — Stripe is not used anywhere except leftover column names
  (`stripe_customer_id`, `stripe_subscription_id`) that actually hold LemonSqueezy ids.

## Data model (Supabase tables + RLS status)
All are user-scoped and expected to be protected by RLS policy `USING (auth.uid() = user_id)`.
Live probe (2026-07-15) — anon key can read a table = RLS gap:

| Table | Holds | RLS (anon read) |
|---|---|---|
| `contacts` | contact profile, `character_profile`, `observed_patterns`, `relationship_tier` | OK (blocked) |
| `conversations` / `conversation_messages` | saved threads + outcomes | OK (blocked) |
| **`conversation_chunks`** | **raw WhatsApp text chunks for RAG (`chunk_text`, `embedding`)** | **❌ WORLD-READABLE — see C1** |
| `user_credits` | `credits_used` per user | OK (blocked) |
| `user_subscriptions` | plan/status (LemonSqueezy) | OK (blocked) |
| `user_profile` | prose self-profile of the chat owner | OK (blocked) |
| `micro_feedback`, `passive_signals`, `prediction_ledger`, `user_behavior_snapshots` | telemetry / learning loop | OK (blocked) |

`conversation_chunks` has an `embedding` column (pgvector intended) but RAG is currently **keyword-based**
(see `/api/simulate-reply`), not vector similarity.

## API surface (all in server.js)
Auth middleware: `requireAuth` (401 if no valid JWT), `optionalAuth` (attaches user if token present, else continues).
- **Public/no-auth:** `GET /api/config` (returns supabaseUrl + anon key — expected), `GET /api/categories`,
  `GET /api/sandbox-challenges`, `POST /api/sandbox-simulate`, `GET /health`, `GET /api/debug` (⚠ see M2).
- **optionalAuth (guests allowed):** `/api/generate`, `/api/analyze-conversation`, `/api/next-reply`
  (self-403s if no user), `/api/likely-responses`, `/api/goal-context`, `/api/extract-screenshot`,
  `/api/simulate-reply`, `/api/simulate-debrief`. `/api/detect-category`, `/api/analyze-reply`,
  `/api/next-steps`, `/api/rehearse`, `/api/review-message` take no auth at all.
- **requireAuth:** all `/api/contacts*`, `/api/conversations*`, `/api/user-profile`, `/api/build-user-profile`,
  `/api/subscription`, `/api/create-checkout`, `/api/credits` (partial), telemetry endpoints, `/api/setup-chunks-table`.
- **Webhook:** `POST /api/lemonsqueezy-webhook` (raw body, HMAC-verified, registered before `express.json`).

Rate limiting: single `express-rate-limit` limiter, **10 req/min/IP**, applied per-route (not global).

## Monetization model (as intended)
- **Guest:** 3 free generations, counted in `localStorage.guest_uses` (client-only).
- **Free (signed in):** 5 generations (`user_credits.credits_used`, limit 5); **1 contact/twin max**
  (server-enforced 402 on 2nd contact and on analyzing a 2nd contact — `server.js:1201`, `2041`).
- **Paid (pro/unlimited):** unlimited. Plan comes from `user_subscriptions` via `GET /api/subscription`,
  surfaced to the SPA as `window._userPlan`.

---

## Infrastructure & free-tier operational risks (roadmap)
The app runs on TWO free tiers, and **has real paying subscribers** — so pausing/sleeping is a real reliability problem, not just a nuisance.

- **Supabase (free) — 7-day inactivity PAUSE. HIGH RISK.** Free projects pause after 7 days with no API
  requests; a paused project = TOTAL outage (auth + data + everything) until manually restored from the dashboard.
  Data survives a pause (90-day restore window) but is eventually deleted if left paused. As of 2026-07-15 the
  project (dssgxmdcpeoifogiwqyw) was ACTIVE and Supabase had already emailed a freeze warning (hit the inactivity
  threshold ~twice). Data volume is tiny (~128 chunks), nowhere near the 500 MB cap.
  - **Mitigation shipped:** `GET /api/keepalive` (touches Supabase) + `.github/workflows/keepalive.yml` (daily cron).
    Any request resets the 7-day timer. Add a free external uptime monitor (cron-job.org / UptimeRobot) hitting
    `/api/keepalive` as a backup — GitHub scheduled workflows auto-disable after 60 days of no commits and can lag.
- **Railway (free) — forced Serverless (scale-to-zero).** Site sleeps on inactivity; first request cold-starts
  (Railway QUEUES it, no 502). Free plan also has a monthly usage/resource cap. Tolerable (no data loss), but the
  keepalive cron also keeps it warm.
- **Railway (free) — DEPLOYS BLOCKED DURING PEAK HOURS.** The service region is **sfo (US West)**, and free-tier
  deploys to sfo are refused during **08:00–20:00 America/Los_Angeles** ("Failed to trigger deployment … not
  available during peak hours"). This is why `git push` (and manual "Deploy Latest Commit") FAIL mid-day — Build
  succeeds, Deploy = "Not started". Off-peak deploy window in **Istanbul time ≈ 06:00–18:00** (LA is 10h behind
  TRT; LA off-peak 20:00–08:00 = TRT 06:00–18:00). Options: deploy in that window, move the service to a non-sfo
  region (Settings → Regions), or upgrade. Committed-but-undeployed code waits for the window.

**Roadmap / recommendation:**
1. **Now (free):** keepalive endpoint + cron (shipped) + external monitor backup. Deploy the pending commits.
2. **The honest call for a paid product:** **Supabase Pro ($25/mo) removes the pause** and adds daily backups —
   it's the load-bearing dependency; free-tier pausing is fundamentally incompatible with paying customers who
   can't afford an outage. Railway can stay free (serverless) since cold-starts annoy but don't lose data (or
   Railway Hobby $5/mo to remove sleep). If subscription revenue > ~$25/mo, upgrading Supabase is a no-brainer;
   the free keepalive is a fragile stopgap (one missed ping window / CI hiccup → pause → outage → manual restore).

## Twin analysis pipeline — quality diagnosis + fixes (2026-07-15)
Empirically tested with synthetic Turkish WhatsApp chats carrying known ground-truth facts, quizzing the twin
(`simulate-reply`) for recall vs hallucination. Findings & fixes:

**Root causes found (measured, not guessed):**
- **PERSON_A/PERSON_B misidentification** — the analysis prompt guessed the owner as "who asks for help", so when the
  contact was the help-seeker the model labeled the CONTACT as PERSON_A → `user_profile` got built about the wrong
  person → the user's own facts were lost/confused. (Swapped in every synthetic test.)
- **`conversation_chunks` saved only for >175 KB** → normal-sized chats had NO RAG memory; the twin relied solely on
  the compressed prose profile.
- **Profile-extraction race** — character-profile extraction is fire-and-forget and scales with size (~60-90 s for a
  120 KB chat). If the user starts practising right after upload, the profile isn't written yet → twin has no memory →
  hallucinates / says "don't know". This is the main driver of "sometimes it knows, sometimes it doesn't".
- **Keyword-only RAG** (embedding column unused) broke on Turkish morphology: query "köpeğinin" ≠ chunk "köpeğime" by
  substring.
- **`message_count` regex** only matched `DD.MM.YYYY` → 0 for many export locales (2-digit year, US, brackets).
- **Bulk chunk insert corruption** — fixed-length slicing cuts emoji (UTF-16 surrogate pairs) in half → invalid
  Unicode → Postgres rejects the insert.

**Fixes shipped (server.js, this session):**
- PERSON_A/PERSON_B now ANCHORED on `contact_name` (the user = the sender who is NOT the contact) in both the main
  analysis prompt and the user-profile extraction. → user-fact recall restored in tests.
- `saveConversationChunks()` runs for ALL sizes (bulk insert, one request), fire-and-forget but lands in seconds
  (well before the slow profile) → the twin has verbatim memory even right after upload. Strips lone surrogates.
- RAG is now Turkish-stem aware (diacritic-folded 5-char stems) → inflected forms match. Pure-RAG recall on
  depth-planted facts went 2/6 → 4/6 with zero hallucination (misses were honest "don't know").
- `message_count` regex broadened across export locales.

**Measured after fixes:** small chat 6/6 recall + correct false-bait denial; mid-size (120 KB) person_a correct +
user-facts recalled; pure-RAG (worst-case, profile not ready) 4/6 no hallucination.

**Remaining levers (roadmap, not yet done):**
1. **Embeddings RAG** (biggest quality lever) — use the `embedding` column with pgvector + an embedding provider
   (Voyage/OpenAI/Cohere) for semantic retrieval; catches consonant mutation (k↔ğ), synonyms, paraphrase that the
   stem matcher still misses (e.g. "ortak"↔"ortağ"). Needs a provider decision + backfill.
2. **Profile-readiness UX** — frontend should poll `contact.character_profile` and show "twin still learning…" /
   gate practice until it's populated, so the race never surfaces. (Chunks-for-all-sizes already softens it.)
3. **role_names ownership** — currently a flat owner-less map (mixes both people's relatives); split into
   user_roles vs contact_roles.
4. **relationship_summary** is null in the analyze RESPONSE for the small path (saved to the contacts row async but
   not returned) — add it to the main analysis output.
5. **Cost consolidation** — analyze-conversation fires 3 Sonnet calls that each re-read the full conversation
   (main analysis + character profile + user profile); simulate-debrief fires 4 parallel Sonnet calls. Combining
   extractions into fewer calls / using Haiku for the cheap ones would cut cost with no quality loss.

## ⚠ KNOWN ISSUES / SECURITY FINDINGS (audit 2026-07-15)
Ordered by severity. Line numbers are approximate — grep before trusting.

### CRITICAL
- **C1 — `conversation_chunks` was world-readable — RESOLVED (2026-07-15).** The public anon key could `SELECT`
  every row (live probe: all 128 chunks across 2 users, i.e. other users' raw private WhatsApp content). Root cause:
  the table had RLS OFF *and* a hidden permissive "public read" policy (created via a different path than the other
  tables — likely the `/api/setup-chunks-table` SQL at `server.js:1134` which OMITS RLS, or a manual `USING(true)`
  policy). Simply enabling RLS did NOT fix it (a permissive policy ORs back in) — the fix required dropping ALL
  existing policies then creating a single owner-only one:
  ```sql
  DO $$ DECLARE p record; BEGIN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='conversation_chunks'
    LOOP EXECUTE format('DROP POLICY %I ON public.conversation_chunks', p.policyname); END LOOP; END $$;
  ALTER TABLE public.conversation_chunks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "chunks_owner" ON public.conversation_chunks FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```
  Verified closed: anon now reads 0 rows, all 11 tables clean, data intact. **Latent regression risk:** the
  `/api/setup-chunks-table` endpoint still creates the table without RLS — never run it against a fresh DB without
  adding the policy above, or the leak returns. (`privacy.html` §3's RLS promise is now actually true.)
- **C2 — Env-var name mismatch on the payment webhook: LATENT footgun (not currently broken).** The LemonSqueezy
  webhook writes `user_subscriptions` with `process.env.SUPABASE_SERVICE_KEY` (`server.js:67,87`), but the code has
  ALWAYS read that name (since commit 104bdb7, 2026-06-26) while `.env`/`.env.example` use `SUPABASE_SERVICE_ROLE_KEY`.
  If `SUPABASE_SERVICE_KEY` is unset it **falls back to the anon key**, and RLS blocks anon writes (live probe: HTTP
  401 `42501`), so the subscription never gets written → the payer stays `free`.
  **CONFIRMED RESOLVED IN PROD (2026-07-15):** Railway's Variables tab shows the env var IS named exactly
  `SUPABASE_SERVICE_KEY` (verified from a screenshot) → the webhook path works, payments activate correctly. This also
  matches the forensic (3-way adversarially verified): `user_subscriptions` holds 2 rows with genuine LemonSqueezy
  webhook fingerprints, owned by real Google accounts, written while RLS was on (only possible with a working
  service_role key under that exact name). **BUT the footgun stays live:** local `.env`/`.env.example` use the DIFFERENT
  name `SUPABASE_SERVICE_ROLE_KEY`, so any future re-provision/rotation that follows the repo's own naming convention
  silently breaks all payment activation. **Hygiene fix (not urgent):** make the code read
  `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY`, and align `.env.example`. Also: Railway still holds 3 dead
  `STRIPE_*` vars — unused by code, safe to delete.
- **C3 — Production was down, now RESOLVED (2026-07-15).** Cause: Railway trial ended → downgraded to free plan,
  which FORCES "Serverless" mode (scale-to-zero; can't disable without paying). The service had serverless off → deploy
  rejected → site down. Fix: enabled Serverless in Railway service Settings → Deploy, redeployed latest commit. Now
  `www.aiwillmake.com/health` → 200, `/api/config` confirms same Supabase project (dssgxmdcpeoifogiwqyw), `/api/debug`
  shows `node_env=production` + ANTHROPIC key set → env vars survived the downgrade. **Operational note:** the app now
  cold-starts after ~inactivity; Railway QUEUES requests during wake (no 502), so webhooks/first-hit are just slower,
  not dropped. Hosting is now free but sleeps. (Render free is the drop-in alternative if ever needed; Vercel/Netlify
  are NOT — their 10s function timeout kills `/api/analyze-conversation` and post-response background tasks.)
- **C4 — Apex domain `aiwillmake.com` does not resolve; only `www` works.** `https://aiwillmake.com` → connection
  failure; `https://www.aiwillmake.com` → 200. Users typing the bare domain fail to reach the site. Also `sitemap.xml`,
  `robots.txt`, and index.html `og:url`/canonical all use the non-`www` apex → those URLs 404. Fix DNS to route apex
  → www (or to Railway) and align the canonical host.

### HIGH
- **H1 — Paid gating is client-side only.** The paid AI endpoints (`/api/simulate-reply`, `/api/rehearse`,
  `/api/generate`, `/api/next-steps`, `/api/likely-responses`, strategy cards) apply no plan check — only the
  rate limiter. `window._userPlan` is trivially overridable in devtools, or the endpoints can be called directly.
  The only server-enforced gate is the 1-contact free limit.
- **H2 — Free/guest generation limits not enforced server-side.** `/api/generate` reads `credits_used` but never
  returns 402 at the limit; the "5 free"/"3 guest" ceilings live only in the UI (`localStorage.guest_uses`).
- **H3 — "Locked" paywalled insights are sent to the client in full.** The wow screen shows
  `mirror_insights.slice(0,2)` behind a "🔒 3 more locked" overlay, but the server returns all insights
  (`confidence_areas`, `unexpected_findings`, all mirror insights) unconditionally — readable in the network tab.
- **H4 — API-cost abuse.** All AI endpoints are reachable unauthenticated behind only a 10/min/IP limit. The vision
  OCR (`/api/extract-screenshot`, 10 MB base64 body, Haiku vision) and `/api/analyze-conversation` (fires several
  background Sonnet calls per request) are the most expensive — an attacker rotating IPs can burn the Anthropic budget.

### MEDIUM
- **M1 — Whole project root is statically served.** `app.use(express.static(__dirname))` (`server.js:105`) exposes
  `server.js`, `package.json`, `categories.json`, `e2e_test.js`, etc. at their paths (`.env` is protected by the
  dotfiles default). No secrets are baked into those files, but full backend source + prompts are downloadable.
  Fix: move public assets to a `public/` dir and serve only that.
- **M2 — `/api/debug` leaks unauthenticated.** Returns Anthropic key prefix (first 10 chars) + length + `NODE_ENV`.
  Remove or auth-gate.
- **M3 — DOM XSS in goal-context render.** `fetchGoalContext` (`app.html:5554-5563`) injects LLM-returned
  `label`/`field`/`placeholder` into `innerHTML` with **no escaping**. The seeding `goal` is user-controlled, so a
  prompt-injected goal can emit `<img onerror>` or break out of the `placeholder="…"` attribute. Only render path
  that skips the escaper.
- **M4 — Shared HTML escaper omits quotes.** Every local `escH`/`esc` escapes only `& < >`, never `"`/`'`. Several
  sinks place escaped values inside double-quoted attributes / inline `onclick` (contact name at `app.html:4048`,
  input `value` at `6716`). Contact names come from LLM extraction of imported chats → attacker-influenceable stored
  XSS. Fix: add `"`→`&quot;`, `'`→`&#39;` to the escaper.
- **M5 — CORS is fully open** (`app.use(cors())`, wildcard origin). Combined with bearer-token auth it's not a
  session-riding risk, but it lets any site call the API. Scope to the app origin.
- **M6 — privacy.html contradicts reality.** (a) §5 promises data deletion within 7 days but there is **no**
  account-deletion endpoint/UI (only per-contact/per-conversation delete). (b) §1 "we do not collect payment
  information" + no mention of LemonSqueezy as processor, though checkout + `user_subscriptions` exist. Also §1 says
  Google sign-in only, but email/password is supported too. See also C1: §3's RLS promise is currently false.

### LOW
- Webhook signature uses `digest !== signature` string compare (not `crypto.timingSafeEqual`) and logs signature
  bytes. `/api/setup-chunks-table` returns raw SQL. `og-image.png` is gitignored (may 404 in prod) and its declared
  1200×630 dims don't match the real 1706×926. `app.html` has TODO placeholders for OG/Twitter image. `robots.txt`
  + sitemap index the authed `app.html`. index.html ships a hidden `display:none` sandbox demo that still
  `fetch('/api/sandbox-challenges')` on every load, plus dead "REMOVED SECTIONS" markup. Many fire-and-forget
  `fetch(...).catch(()=>{})` telemetry calls swallow errors silently (intentional).

---

## Invariants — do not break
- **Twin perspective fix (3 layers, all required).** In the `/api/simulate-reply` system prompt, three rules keep
  the twin from confusing the contact's family with the *user's* family (e.g. answering "my wife's name?" with the
  twin's own spouse). All three must stay together — removing any one regresses the bug:
  1. `CRITICAL PERSPECTIVE RULE` (baseline possession rule).
  2. `EXCERPT PERSPECTIVE TRAP` (RAG excerpts contain the twin's own "eşim [name]" — not the user's spouse).
  3. `userProfileBlock` header separation + `noProfileGuard` (handles the no-RAG case; when no user profile exists,
     the twin must say "I don't recall" instead of substituting its own family).
  See memory `project-session-bug-fixes` for the full history.
- **`relationship_tier` gating.** `tier === 1` (distant/work) makes RELATIONSHIP DISTANCE override PROFILE PRIORITY:
  the twin must NOT reveal personal facts from the user profile even if present. `tier === 2` (default) shares freely.
- **`buildContactContext()`** carries the `STRICT RULES` (no diagnoses, no invented percentages, soft language). Keep
  those when editing any prompt that consumes contact context — the product promise is "observations, not clinical labels".
- **LemonSqueezy webhook must stay registered before `express.json()`** (`server.js:42`) — it needs the raw body for
  HMAC verification.
- The analysis prompts intentionally keep **label keys in English** (`OBSERVED_PATTERNS:` etc. for parsing) while
  forcing **values in the conversation's language**. Don't "translate" the labels.
