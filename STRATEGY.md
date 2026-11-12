# aiwillmake — Strategy (Nov 2026)

Built from four research sweeps (grief-tech, conversation rehearsal / texting AI, WhatsApp chat
analyzers, Turkish market & distribution) plus the 8-analyst product audit. Revenue figures for
competitors are mostly third-party estimates; treat them as directional.

## Where we stand
- 4 real accounts (all June 2026), no stranger has ever paid, the funnel has never been run on
  strangers. Site was down Aug 11 → Nov 12. The Anthropic key is invalid: every AI feature is off
  until it is replaced. **Distribution, not features, is the bottleneck.**

## What the market says
1. **Nobody owns "a twin of one specific real person from real chat history."** Closest attempts
   are tiny (Unsaid on Product Hunt: 1 upvote), dead (Talkers), delisted ("talk to your ex" apps
   after backlash), or developer-only GitHub projects. Free ChatGPT is the real substitute — a
   Turkish post in April 2025 showed exactly this hack going viral.
2. **Money in adjacent categories:** dating reply helpers (Rizz, Plug: weekly subs $3.99–9.99,
   screenshot → reply in seconds, no signup wall) and B2B roleplay (Yoodli ~$300M valuation).
   Consumer "practice a hard conversation" apps are tiny.
3. **Grief-tech:** the emotional hit comes from text built from the person's real messages. Long
   subscriptions don't hold (zero renewals past a year at NewZia); one-time / per-person pricing
   works. Viral ads aimed at the bereaved backfire (2wai: 40M views, mostly hostile).
4. **WhatsApp "Wrapped" analyzers** spread through comparison/drama cards (who writes more, who
   starts, who ghosts) as 9:16 story images, seasonally late Nov → Jan. Stats alone earn little;
   money sits behind the AI interpretation. Turkey has WhatsScope + a few iOS clones; none offers
   evidence quotes, a twin, or a good free web share flow.
5. **Turkey:** Diyanet treats spirit-summoning (ruh çağırma) as superstition → never say "talk to
   the dead / bring back / ruh". "Mektup yaz, içini dök", "yarım kalan sözler", "prova" are safe.
   Lead with living hard conversations; grief stays a gentle, secondary door. Grok was blocked in
   Turkey partly over insulting religious values → hard guardrail in the twin prompt.
6. **Payments in Turkey:** PayPal and Papara are gone; weekly plans are 45.7% of new AI subs;
   USD web checkout likely hurts conversion. LemonSqueezy accepts Turkish buyers but is being
   folded into Stripe Managed Payments (Turkey support unclear).

## Decisions taken (shipped)
- **Free on-device "WhatsApp Sohbet Analizi"** at `/whatsapp-sohbet-analizi`: no signup, no AI,
  nothing leaves the device; 6 share cards (who writes more, who starts, reply duel, night owl,
  record day + longest silence, shared words) + a locked 7th card that bridges to the twin; the
  chat is handed to the app via IndexedDB (no second upload). SEO content + FAQ schema in Turkish.
- **Guest-first twin in 3 answers**, autosave, cross-session memory (previous commit).
- **Letter mode** for unreachable contacts ("💌 Ona mektup yaz" → one warm reply that answers what
  was written) — the safe Turkish framing and the Cambridge "dignified closure" recommendation.
- **Hard practice mode** ("🎚 Zorlaştır") for living contacts.
- **Safety:** crisis interception (TR/EN/ES incl. "sana kavuşmak istiyorum"), grief rails keyed on
  status, honest answer to a sincere "are you real?" in unreachable mode, no religious / national /
  group insults, no upsell in a deceased person's voice.
- **KVKK:** Turkish `kvkk.html` (aydınlatma metni, foreign processors named) + one-tap consent
  (18+, right to share, AI processing incl. abroad), remembered on the device.
- **Measurement:** first-touch attribution (`ref` / `utm` / referrer) + persistent device id on
  every event; `?ref=` links on every share card.
- **Turkish link preview:** new 1200×630 OG image and Turkish og/twitter tags.

## Pricing — recommendation (paywall stays OFF until ~30–50 strangers reach a twin reply)
- Free: the stats tool, one twin, the first full conversation.
- Then a **one-time per-person unlock in TRY** (test ~₺99–149) plus a small weekly option
  (~₺49–79). Avoid long monthly/annual subscriptions for this use pattern.
- Payment rail: verify LemonSqueezy for Turkish cards on a real test purchase; plan iyzico if not.
- Never interrupt an unreachable-mode conversation with a paywall; never upsell in the twin's voice.

## Distribution plan (cheap, founder-doable)
1. **Season now:** push the free WhatsApp analysis before December; year-end is when Turkish press
   covers "WhatsApp Wrapped" (ShiftDelete, Webrazzi).
2. **Faceless short videos** (TikTok/Reels): "babama hiç söyleyemediğim cümle…" typed into a
   3-answer twin; comic rehearsals ("patrondan zam isterken"). Pin "yapay zekâ, o değil".
3. **Long-tail Turkish SEO:** "whatsapp sohbet analizi", "chatgpt whatsapp sohbet analizi",
   "babama ___ nasıl söylerim", "zam isteme konuşması", "ölen anneme mektup" (letter framing).
4. **Honest answers** on Kızlarsoruyor / Ekşi where the question is literally ours.
5. **Calendar:** Jan raise season, 14 Feb, bayram reconciliations, Anneler/Babalar Günü letters.

## Open items for the founder
- Replace `ANTHROPIC_API_KEY` (Railway Variables + local `.env`) — nothing AI works until then;
  then run `node -r dotenv/config twin_quality_smoke.js <url>`.
- External uptime alert (UptimeRobot → `/api/keepalive`); the GitHub keepalive self-disables.
- KVKK: foreign transfers need the standard contract notified to the Authority (Law 7499, since
  June 2024) — consent alone is no longer a sustainable basis. Get a lawyer's eye on this before
  any marketing push.
- Supabase Pro once real users arrive (no backups on free).
