# aiwillmake — Strategy (updated Nov 25, 2026)

## The product, in one line
**Talk again with someone you've lost.** Describe them in three answers (or bring your messages with them);
their AI twin writes back the way they used to — a space for the words left unsaid: news, thanks, apologies,
a letter, a goodbye. Founder decision (Nov 25, 2026): the product serves **only** this purpose.

## Market
- **Global, US-weighted**, English first (TR/ES translations kept). Unknown browser languages open in English.
- In the US, iMessage dominates and WhatsApp is secondary → the **3-answer describe path is the main door**;
  WhatsApp export and screenshots are the "make it closer" option.
- Turkey remains a secondary market (Turkish guides under /rehber).

## What the research says (Nov 2026 sweeps)
- The emotional hit comes from **text built from the person's real words** (Project December, Replika's origin,
  people pasting a parent's texts into ChatGPT). Video-avatar / interview-before-death models are expensive and
  have struggled (StoryFile bankrupt, Eternos pivoted, HereAfter's site 404).
- **Pricing that fits grief:** one-time / per-person or small packs, not long subscriptions (zero renewals past a
  year at NewZia). Never interrupt a conversation with a paywall; never sell in the person's voice.
- **Backlash risk is real** (2wai: ~40M views, called "demonic"). Framing must stay: a reflection of *your*
  memories, not them; no "bring them back", no afterlife, no contact-with-the-dead claims.
- **Regulation:** California SB 243 (companion chatbots, in force since 2026-01-01; applies to any operator
  serving California users; private right of action): clear AI disclosure, a suicide/self-harm protocol with
  crisis referral, protections for minors. KVKK/GDPR for TR/EU data.

## What the product does (shipped)
- Every twin runs in **lost-person mode** (server forces `contact_status = 'unreachable'`): frozen present at the
  date of loss, warm non-denial if the user names the death, no afterlife/reunion claims, honest answer to a
  sincere "are you real?", knowledge boundary (asks instead of inventing), memory of previous conversations.
- **3-answer quick form** (relationship, what they called you, 1–2 of their sentences) + optional "how they saw
  you" and "when did you lose them?". Guests reach the first message without sign-in; saving needs Google.
- **💌 Letter** (one reply that answers what you wrote) and **🕊 Goodbye** (a dignified farewell reply).
- **"Did that sound like them?"** fix loop after the first message (USER CORRECTIONS).
- **Safety:** crisis interception before the model (EN → 988, TR → 112, ES → 988/local), values guardrail,
  gentle pause note after a long session, 18+ consent, simulation disclaimer at the start of every chat,
  full deletion. The closing note after a conversation is warm and never coaches.
- Rehearsal-era UI (before-you-send, strategy cards, accuracy stars, archetype/mirror, demo personas) is hidden;
  the code stays dormant. The living-relationship stats page and guides are retired (301 → home / guides index).
- **Content:** /guides (EN): save texts from someone who died · letter to someone who died · AI and a lost
  loved one (honest explainer). /rehber (TR): mektup · mesajları saklamak · yapay zekâ açıklaması.
- **Ops:** graceful AI-down mode, `node smoke_test.js [url]` (29 checks), `node -r dotenv/config
  funnel_report.js [days]`, first-touch attribution on every event.

## Pricing recommendation (paywall stays off until ~30–50 strangers reach a first message)
Free: one person, the first conversation. Then a one-time unlock per person (test $9–19) and/or a small
message pack. No long subscriptions. Never gate a letter or a goodbye mid-flow.

## Distribution (US-first, cheap)
1. **SEO on practical grief needs:** "how to save text messages from someone who died", "letter to someone
   who died", "talk to a deceased loved one AI". Add guides over time (guides.js).
2. **Founder-told short video:** an honest story ("I never got to tell my grandfather…"), the first message
   on screen, the disclaimer visible. Never targeted at the freshly bereaved, never ad-heavy.
3. **Grief communities** (respectfully, disclosed): r/GriefSupport-style forums only where self-promotion is
   allowed; grief writers, hospice/bereavement newsletters.
4. **Calendar:** Mother's Day, Father's Day, holidays, anniversaries — "write them a letter" framing.

## Open items for the founder
- Replace `ANTHROPIC_API_KEY` in Railway (everything AI is off until then); then run twin_quality_smoke.js.
- Re-enable the GitHub keepalive workflow if disabled; add an UptimeRobot alert on /api/keepalive.
- Legal review before marketing: SB 243 compliance check (minors, disclosures), KVKK cross-border transfer
  notification, a US privacy policy pass.
- Supabase Pro once real users arrive (backups).
