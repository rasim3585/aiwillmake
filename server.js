console.log('SERVER VERSION: 4.0 - STRATEGIES');

const STRATEGIES = {
  personal:     ['Vulnerable & honest','Mature & composed','Direct & confident','Warm & hopeful','Light & casual','Strategic'],
  email:        ['Formal','Assertive','Diplomatic','Concise','Detailed','Persuasive'],
  business:     ['Professional','Confident','Collaborative','Strategic','Firm','Relationship-focused'],
  official:     ['Formal','Assertive','Evidence-based','Diplomatic','Urgent','Rights-focused'],
  medical:      ['Detailed & Clinical','Simple & Clear','Concerned','Chronological','Question-focused','Advocacy'],
  academic:     ['Respectful','Confident','Detailed','Concise','Personal','Formal'],
  social_media: ['Authentic','Engaging','Inspirational','Playful','Informative','Conversational'],
  listings:     ['Descriptive','Benefit-focused','Emotional','Factual','Urgent','Story-based'],
  creative:     ['Emotional','Poetic','Humorous','Minimalist','Bold','Classical']
};

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const categories = require('./categories.json');

const app = express();
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────────────────────
// TEST BYPASS - REMOVE BEFORE LAUNCH
// Accounts in this list: unlimited credits + all PRO features unlocked
const DEV_BYPASS_EMAILS = ['rasimkurum@gmail.com'];
const isDevBypass = req => !!(req.user?.email && DEV_BYPASS_EMAILS.includes(req.user.email));
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabase = supabaseUrl && process.env.SUPABASE_ANON_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY)
  : null;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' }
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // screenshots arrive as base64 (~1MB+)
app.use(express.static(__dirname));

app.get('/api/debug', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || '';
  res.json({
    version: 'SERVER VERSION: 4.0 - STRATEGIES',
    api_key_prefix: key ? key.slice(0, 10) + '...' : 'NOT SET',
    api_key_length: key.length,
    node_env: process.env.NODE_ENV || 'not set'
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

app.get('/api/categories', (req, res) => {
  res.json(categories);
});

async function requireAuth(req, res, next) {
  if (!supabase) {
    console.error('[requireAuth] Supabase not configured — rejecting request to', req.path);
    return res.status(503).json({ error: 'Auth not configured' });
  }
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  req.user = user;
  req.token = token;
  next();
}

async function optionalAuth(req, res, next) {
  if (!supabase) return next();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return next();
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) { req.user = user; req.token = token; }
  } catch (_) {}
  next();
}

const SUPABASE_REST = `${supabaseUrl}/rest/v1`;
const sbHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'apikey': process.env.SUPABASE_ANON_KEY || '',
  'Content-Type': 'application/json'
});

async function getCredits(token, userId) {
  const url = `${SUPABASE_REST}/user_credits?user_id=eq.${userId}&select=credits_used`;
  const res = await fetch(url, { headers: sbHeaders(token) });
  const rows = await res.json();
  return Array.isArray(rows) ? (rows[0]?.credits_used ?? 0) : 0;
}

async function incrementCredits(token, userId) {
  try {
    const getUrl = `${SUPABASE_REST}/user_credits?user_id=eq.${userId}&select=credits_used`;
    const getRes = await fetch(getUrl, { headers: sbHeaders(token) });
    const rows = await getRes.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      const insRes = await fetch(`${SUPABASE_REST}/user_credits`, {
        method: 'POST',
        headers: sbHeaders(token),
        body: JSON.stringify({ user_id: userId, credits_used: 1 })
      });
      const insText = await insRes.text();
      if (insRes.status >= 400) console.error('[credits] INSERT FAILED:', insText);
    } else {
      const current = rows[0]?.credits_used ?? 0;
      const updRes = await fetch(`${SUPABASE_REST}/user_credits?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: sbHeaders(token),
        body: JSON.stringify({ credits_used: current + 1 })
      });
      const updText = await updRes.text();
      if (updRes.status >= 400) console.error('[credits] UPDATE FAILED:', updText);
    }
  } catch (e) {
    console.error('[credits] increment EXCEPTION:', e.message);
  }
}

app.get('/api/credits', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!supabase || !token) return res.json({ credits_used: 0, limit: 5, guest: !token });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!user) return res.json({ credits_used: 0, limit: 5, guest: true });
    if (DEV_BYPASS_EMAILS.includes(user.email)) // TEST BYPASS - REMOVE BEFORE LAUNCH
      return res.json({ credits_used: 0, limit: 999, guest: false }); // TEST BYPASS - REMOVE BEFORE LAUNCH
    const credits_used = await getCredits(token, user.id);
    res.json({ credits_used, limit: 5, guest: false });
  } catch (e) {
    console.error('[/api/credits] catch:', e.message);
    res.json({ credits_used: 0, limit: 5, guest: true });
  }
});

function buildContactContext(contactContext) {
  if (!contactContext?.name) return '';
  const allPatterns = Array.isArray(contactContext.observed_patterns) && contactContext.observed_patterns.length
    ? contactContext.observed_patterns : [];
  const addressPattern = allPatterns.find(p => p.startsWith("User naturally addresses them as"));
  const addressTerm = addressPattern ? (addressPattern.match(/'([^']+)'/) || [])[1] : null;
  const patterns = allPatterns.length ? allPatterns.join('; ') : null;
  const summary = contactContext.relationship_summary || null;
  return `\n\nCONTEXT about the recipient (${contactContext.name}): Based on past conversations, here's what we've observed: ${patterns || 'No specific patterns yet'}. Current relationship state: ${contactContext.relationship_state || 'Unknown'}.${summary ? ` Latest recommended action: ${summary}` : ''}${addressTerm ? `\nADDRESS STYLE: The user naturally calls this person "${addressTerm}" — use this exact term when addressing them in messages, not their formal name.` : ''}
Use these observations to make your strategies, predictions, and analysis more accurate and personal.
STRICT RULES: Do not diagnose personality traits. Do not assume intent or label them psychologically. Use these observed tendencies only as soft probabilistic signals, never as certainties.`;
}

app.post('/api/generate', optionalAuth, limiter, async (req, res) => {
  try {
    const { categoryId, subcategoryId, fields, variation, contactContext } = req.body;
    const variationPrompts = {
      different: 'Generate 6 NEW outputs that are DIFFERENT from a previous attempt. Use different sentence structures, vocabulary and emotional angles.',
      completely_new: 'IGNORE everything about the previous outputs. Use a completely different tone, style and creative approach. Be bold and unexpected.'
    };
    const modifier = variationPrompts[variation] || null;

    let creditsUsed = 0;
    if (req.user) {
      if (!isDevBypass(req)) {
        creditsUsed = await getCredits(req.token, req.user.id);
        if (creditsUsed >= 5) {
          return res.status(403).json({ error: 'Free limit reached', credits_used: creditsUsed });
        }
      }
    }

    const category = categories.categories.find(c => c.id === categoryId);
    if (!category) return res.status(400).json({ error: 'Invalid category' });

    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (!subcategory) return res.status(400).json({ error: 'Invalid subcategory' });

    const language = fields.language || 'English';
    const country  = fields.country  || '';
    const strategies = STRATEGIES[categoryId] || STRATEGIES.personal;
    const systemPrompt = `You are a communication strategist and expert writer. Analyze the situation silently, then write 6 messages using these exact strategies: ${strategies.map((s, i) => `${i + 1}. ${s}`).join(', ')}. After each message, add exactly these lines:
WHY: [one sentence explaining why this approach works]
BARRIER: Easy to reply / Some thought required / Emotionally demanding
PRESSURE: Low/Medium/High
BEST_WHEN: [one short sentence about when to use this]
RISK: [one short sentence about what could go wrong]
EMOTIONAL_STATE: [one of: Nostalgic / Cautious / Defensive / Curious / Indifferent / Hopeful / Hurt / Neutral] — a possible interpretation of how the recipient might feel when reading this message, not a certainty
REPLY_YES: [one sentence why the recipient would reply to this message]
REPLY_NO: [one sentence why they might not reply]
RECOMMENDED: yes or no
RECOMMENDED_REASONS: ✓ [specific reason 1 for THIS situation] | ✓ [specific reason 2] | ✓ [specific reason 3] (only include this line if RECOMMENDED is yes)

FORMAT REQUIREMENT: Every message block MUST end with WHY, BARRIER, PRESSURE, BEST_WHEN, RISK, EMOTIONAL_STATE, REPLY_YES, REPLY_NO, RECOMMENDED in that order. If RECOMMENDED is yes, also add RECOMMENDED_REASONS on the next line. Never skip any line.
CRITICAL: Mark ONLY ONE message as RECOMMENDED: yes. The other 5 MUST be RECOMMENDED: no. If you mark more than one as yes, your output is invalid.
When choosing which message to recommend, consider: which strategy is most likely to achieve the user's specific goal given their exact situation? Choose based on the goal, emotional context, and risk level - not just order.

CRITICAL: Write ALL 6 messages entirely in ${language}. Do not mix languages. Every single word must be in ${language}.
CRITICAL: Do NOT use markdown. No headers (#), no bold (**), no dividers (---), no bullet points. Plain numbered list ONLY: 1. 2. 3. 4. 5. 6.
AVOID these AI-sounding openings: "I've been trying to make sense of...", "I've had time to think clearly...", "I wasn't going to reach out...", "I've been doing a lot of thinking...". Instead write like a real person: sometimes short and direct, sometimes warm and specific, always authentic. Vary the sentence structure. Some messages can start mid-thought.
Rules: use specific details provided, no clichés, each message sounds like a real human, plain numbered text only, write in ${language}. If country context is relevant to format or formality, apply it subtly. Never make broad cultural generalizations or claim cultural authority. IMPORTANT: Never ask the user for more information. Never output questions. Always generate the 6 messages directly using whatever information is provided. If some context is missing, make reasonable assumptions and still write the messages.${buildContactContext(contactContext)}`;

    const fieldLines = [...subcategory.required_fields, ...(subcategory.optional_fields || [])]
      .map(f => { const v = (fields[f.key] || '').trim(); return v ? `${f.label}: ${v}` : null; })
      .filter(Boolean);
    if (country) fieldLines.push(`Country context: ${country}`);
    const basePrompt = fieldLines.join('\n');
    let extraInstruction = '';
    if (categoryId === 'personal' && subcategoryId === 'ex_partner') {
      const goalTone = {
        'Reconnect romantically': 'GOAL TONE: Messages must feel hopeful, leave the door open, hint at wanting more — without being pushy or desperate.',
        'Seek closure':           'GOAL TONE: Messages must be clear, emotionally mature, and bring a sense of finality — not cold, but clearly closing the chapter.',
        'Apologize sincerely':    'GOAL TONE: Messages must take full accountability with genuine remorse — no excuses, no deflecting.',
        'Rebuild friendship':     'GOAL TONE: Messages must be warm but clearly non-romantic — reference shared history, make it about friendship only.',
        'Just check in':          'GOAL TONE: Messages must feel completely light and pressure-free — casual, like checking in on any old friend.'
      };
      if (fields.goal && goalTone[fields.goal]) {
        extraInstruction += `\n\n${goalTone[fields.goal]}`;
      }
      if (!fields.message_length) {
        extraInstruction += '\n\nGenerate messages in VARIED lengths: 2 should be ultra-short (1-2 sentences, text message style), 2 medium (3-4 sentences), 2 longer (5-6 sentences). Label each with its length style at the start (e.g. "[Short]", "[Medium]", "[Detailed]").';
      }
    }
    const lengthMap = {
      'Ultra Short':    'ULTRA SHORT: 1-2 sentences maximum.',
      'Medium':         'MEDIUM: 3-4 sentences.',
      'Detailed':       'DETAILED: 5-6 sentences.',
      'WhatsApp style': 'WHATSAPP STYLE: casual, conversational, brief like a real text message.'
    };
    if (fields.message_length && fields.message_length !== 'Auto' && lengthMap[fields.message_length]) {
      extraInstruction += `\n\nLENGTH REQUIREMENT: All 6 messages must follow this format — ${fields.message_length}. ${lengthMap[fields.message_length]}`;
    }
    const prompt = modifier
      ? `${basePrompt}${extraInstruction}\n\n${modifier}`
      : `${basePrompt}${extraInstruction}`;

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let data, response;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: categoryId === 'official' ? 5120 : 3072,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      data = await response.json();
      if (response.status === 429 && attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      break;
    }

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    const text = data.content[0].text;
    const clean = s => s.replace(/\*\*/g, '').replace(/#+\s?/g, '').replace(/\*/g, '');

    const meta = (block, key) => {
      const m = block.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? clean(m[1].trim()) : null;
    };

    const rawBlocks = ('\n' + text).split(/\n\*{0,2}\d+[\.\)]\*{0,2}\s*/);
    const captions = rawBlocks.slice(1)
      .map(block => {
        const trimmed = block.trim();
        if (trimmed.length < 10) return null;

        const metaIdx = trimmed.search(/^WHY:/im);
        const msgText  = metaIdx > 0 ? trimmed.slice(0, metaIdx).trim() : trimmed;
        const metaBlock = metaIdx > 0 ? trimmed.slice(metaIdx) : '';

        const why                = meta(metaBlock, 'WHY');
        const reply_barrier      = meta(metaBlock, 'BARRIER');
        const emotional_pressure = meta(metaBlock, 'PRESSURE');
        const best_used_when     = meta(metaBlock, 'BEST_WHEN');
        const what_could_go_wrong = meta(metaBlock, 'RISK');
        const emotional_state     = meta(metaBlock, 'EMOTIONAL_STATE');
        const reply_yes           = meta(metaBlock, 'REPLY_YES');
        const reply_no            = meta(metaBlock, 'REPLY_NO');
        const recRaw              = meta(metaBlock, 'RECOMMENDED') || '';
        const recommended         = recRaw.toLowerCase().startsWith('yes');
        const reasonsRaw          = recommended ? meta(metaBlock, 'RECOMMENDED_REASONS') : null;
        const recommended_reasons = reasonsRaw
          ? reasonsRaw.split('|').map(r => r.trim()).filter(Boolean)
          : null;

        const blockIdx = rawBlocks.indexOf(block);
        const missing = [
          !why && 'WHY', !reply_barrier && 'BARRIER', !emotional_pressure && 'PRESSURE',
          !best_used_when && 'BEST_WHEN', !what_could_go_wrong && 'RISK', !recRaw && 'RECOMMENDED'
        ].filter(Boolean);
        if (missing.length) {
          console.warn(`[parse] block #${blockIdx} missing: ${missing.join(', ')} | metaIdx=${metaIdx} | metaBlock snippet: ${metaBlock.slice(0,120).replace(/\n/g,'\\n')}`);
        }

        if (categoryId === 'official') {
          const lines = msgText.split('\n');
          const firstLine = lines[0].trim();
          const isTitle = firstLine.length < 60
            && !firstLine.startsWith('Sayın')
            && !firstLine.startsWith('Dear')
            && !/^Konu:/i.test(firstLine)
            && lines.length > 1;
          if (isTitle) {
            return { badge: clean(firstLine), text: clean(lines.slice(1).join('\n').trim()), why, reply_barrier, emotional_pressure, best_used_when, what_could_go_wrong, emotional_state, reply_yes, reply_no, recommended, recommended_reasons };
          }
        }

        return { badge: null, text: clean(msgText), why, reply_barrier, emotional_pressure, best_used_when, what_could_go_wrong, emotional_state, reply_yes, reply_no, recommended, recommended_reasons };
      })
      .filter(Boolean)
      .slice(0, 6);

    // Ensure only one recommended:true — prefer low-pressure + easy-reply
    const recItems = captions.filter(c => c.recommended);
    if (recItems.length > 1) {
      const preferred = recItems.find(c =>
        ['Easy to reply', 'Some thought required'].includes(c.reply_barrier) &&
        c.emotional_pressure === 'Low'
      ) || recItems[0];
      captions.forEach(c => {
        if (c.recommended && c !== preferred) {
          c.recommended = false;
          c.recommended_reasons = null;
        }
      });
    }

    if (req.user && !isDevBypass(req)) {
      await incrementCredits(req.token, req.user.id);
    }

    res.json({ captions, credits_used: req.user ? creditsUsed + 1 : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/detect-category', limiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const prompt = `You are a text classification assistant. A user described what they want to write. Identify the best matching category and subcategory from the list below.

Available options:
personal/romantic_partner – message to a romantic partner
personal/ex_partner – message to an ex
personal/crush – first message to someone you like
personal/friend – message to a friend
personal/family – message to a family member
personal/apology – apology message
personal/difficult_news – breaking bad news or a difficult message
personal/congratulations – congratulations message
personal/gratitude – thank you message to someone
personal/checking_in – casual check-in or hello
social_media/personal_photo – photo caption
social_media/lifestyle – lifestyle or daily life post
social_media/business_page – business account post
social_media/product_showcase – product or service showcase post
social_media/sports_club – sports team or club post
social_media/motivation – motivational content
social_media/event_announcement – event announcement post
social_media/behind_the_scenes – behind the scenes content
social_media/testimonial – customer review or testimonial post
social_media/campaign – promotion or sale campaign post
email/professional – professional workplace email
email/boss – email to a manager or boss
email/colleague – email to a coworker
email/client – email to a client or customer
email/cold_outreach – cold email to a new contact
email/follow_up – follow-up email
email/apology_email – apology via email
email/complaint_email – complaint email to a company
email/thank_you_email – thank you email
email/introduction – introduction email
business/cover_letter – job application cover letter
business/cv_summary – CV or resume summary
business/linkedin_message – LinkedIn outreach message
business/job_application – job application email
business/promotion_request – raise or promotion request
business/resignation – resignation letter
business/business_proposal – business pitch or proposal
business/client_proposal – proposal to a potential client
business/payment_reminder – payment or invoice reminder
business/contract_summary – contract or agreement summary
business/partnership_request – collaboration or partnership proposal
business/reference_letter – recommendation or reference letter
academic/motivation_letter – university motivation letter
academic/scholarship_application – scholarship application
academic/professor_email – email to a professor
academic/extension_request – deadline extension request
academic/university_appeal – university appeal letter
academic/internship_application – internship application
academic/study_group – study group message
academic/research_inquiry – research inquiry email
academic/course_feedback – course feedback
academic/student_complaint – formal student complaint
official/government_petition – petition to a government body
official/consumer_complaint – consumer complaint
official/legal_objection – legal objection letter
official/visa_application – visa application support letter
official/insurance_claim – insurance claim letter
official/landlord_tenant – landlord or tenant letter
official/neighborhood_complaint – neighborhood complaint
official/official_request – formal request to an institution
official/appeal_letter – appeal against an official decision
official/freedom_of_information – freedom of information request
medical/doctor_visit – doctor appointment request
medical/specialist_referral – specialist referral request
medical/second_opinion – second medical opinion request
medical/prescription_query – medication or prescription query
medical/hospital_complaint – hospital complaint
medical/insurance_medical – medical insurance claim
medical/caregiver_update – caregiver update message
medical/mental_health – mental health communication
listings/property_sale – property for sale listing
listings/property_rent – rental property listing
listings/car_sale – car for sale listing
listings/item_sale – item for sale listing
listings/wanted_ad – wanted / looking for ad
listings/business_for_sale – business for sale listing
listings/service_listing – service advertisement
listings/roommate_search – roommate or flatmate search
creative/song_lyrics – song lyrics
creative/poem – poem
creative/biography – biography or about me text
creative/slogan – slogan or tagline
creative/speech – wedding, graduation, or event speech
creative/story_opening – story or novel opening paragraph
creative/toast – toast or tribute speech
creative/brand_voice – brand voice statement
creative/caption_creative – artistic or creative caption
creative/eulogy – eulogy

User input: "${text.replace(/"/g, '\\"')}"

Reply with ONLY a valid JSON object — no markdown, no explanation:
{"categoryId":"…","subcategoryId":"…","confidence":"high|medium|low","explanation":"…"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const apiData = await response.json();
    if (!response.ok) throw new Error(apiData.error?.message || 'API error');

    const raw = apiData.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');

    const result = JSON.parse(match[0]);

    const valid = {
      personal:     ['romantic_partner','ex_partner','crush','friend','family','apology','difficult_news','congratulations','gratitude','checking_in'],
      social_media: ['personal_photo','lifestyle','business_page','product_showcase','sports_club','motivation','event_announcement','behind_the_scenes','testimonial','campaign'],
      email:        ['professional','boss','colleague','client','cold_outreach','follow_up','apology_email','complaint_email','thank_you_email','introduction'],
      business:     ['cover_letter','cv_summary','linkedin_message','job_application','promotion_request','resignation','business_proposal','client_proposal','payment_reminder','contract_summary','partnership_request','reference_letter'],
      academic:     ['motivation_letter','scholarship_application','professor_email','extension_request','university_appeal','internship_application','study_group','research_inquiry','course_feedback','student_complaint'],
      official:     ['government_petition','consumer_complaint','legal_objection','visa_application','insurance_claim','landlord_tenant','neighborhood_complaint','official_request','appeal_letter','freedom_of_information'],
      medical:      ['doctor_visit','specialist_referral','second_opinion','prescription_query','hospital_complaint','insurance_medical','caregiver_update','mental_health'],
      listings:     ['property_sale','property_rent','car_sale','item_sale','wanted_ad','business_for_sale','service_listing','roommate_search'],
      creative:     ['song_lyrics','poem','biography','slogan','speech','story_opening','toast','brand_voice','caption_creative','eulogy']
    };

    // Graceful fallback: never throw for an invalid pair — recover instead of erroring
    if (!valid[result.categoryId]?.includes(result.subcategoryId)) {
      console.warn('[detect-category] invalid pair:', result.categoryId, '/', result.subcategoryId, '— applying fallback');
      if (valid[result.categoryId]) {
        // Category is valid but subcategory is off — use its first (most general) subcategory
        result.subcategoryId = valid[result.categoryId][0];
      } else {
        // Unknown category entirely — safe neutral default
        result.categoryId    = 'personal';
        result.subcategoryId = 'checking_in';
      }
      result.explanation = (result.explanation || '') + ' (subcategory adjusted to nearest valid option)';
    }

    res.json(result);
  } catch (e) {
    console.error('[detect-category] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze-reply', limiter, async (req, res) => {
  try {
    const { reply, categoryId, situation, language, contactContext, previousMessage, senderType } = req.body;
    if (!reply?.trim()) return res.status(400).json({ error: 'reply is required' });

    const lang = language || 'English';

    let systemPrompt;
    if (senderType === 'review') {
      systemPrompt = `You are reviewing a DRAFT the user is about to send. The message was written BY the user — do NOT treat it as something received from someone else. Refer to the writer as "you" and the recipient as "they".
Return ONLY this exact format:
TONE: [one word — e.g. Assertive, Warm, Cold, Needy, Confident, Playful, Formal]
EMOTIONAL_RISK: [exactly one of: High / Medium / Low]
LANDING: [one sentence — how the recipient will likely feel or react upon reading this]
WHAT_YOU_SENT: [one sentence — what you are literally communicating]
HOW_THEY_READ_IT: [one sentence — how the recipient might actually interpret this, including any unintended signals]
STRENGTHS: [2-3 things working well in this message, separated by |]
WATCH_OUT: [2-3 things to be careful about, separated by |]
VERDICT: [exactly one of: "Send as is" / "Soften it" / "Rethink"]
VERDICT_REASON: [one sentence explaining the verdict]
No other text. No markdown. Write in ${lang}.`;
    } else {
      const contextNote = previousMessage?.trim()
        ? `The received message is a reply to what you said: "${previousMessage}". Analyze this as a two-message exchange — use that context to sharpen your analysis.`
        : `No prior message was provided. Be appropriately cautious and acknowledge when conclusions are uncertain due to limited context — do NOT be overconfident.`;
      systemPrompt = `You are analyzing a message the user RECEIVED from the other person. Refer to the other person as "they" and the user as "you". ${contextNote}
Return ONLY this exact format:
INTEREST_LEVEL: High/Medium/Low
EMOTIONAL_WARMTH: High/Medium/Low
OPENNESS: High/Medium/Low
TONE: [one word - e.g. Friendly, Cautious, Distant, Enthusiastic]
HIDDEN_SIGNAL: [one sentence about what they really mean]
WHAT_THEY_SAID: [one sentence — the literal surface meaning of their reply]
WHAT_THEY_MIGHT_MEAN: [one sentence — a possible underlying meaning; frame cautiously with "might", not as certainty]
RISK: [one sentence about the main risk going forward]
SUGGESTED_MOVE: [one concrete sentence about what to do next]
REPLY_TIMING: [exactly one of: "Reply now" / "Wait a few hours" / "Wait until tomorrow" / "Take your time" / "Don't reply yet"]
REPLY_TIMING_REASON: [one short sentence explaining why]
No other text. No markdown. Write in ${lang}.`;
    }

    const userPrompt = `Category: ${categoryId || 'general'}
Situation: ${situation || 'Not provided'}
${senderType === 'review' ? 'Draft to review' : 'Reply to analyze'}: ${reply}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt + buildContactContext(contactContext),
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => {
      const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const splitPipe = raw => raw ? raw.split('|').map(s => s.trim()).filter(Boolean) : [];
    res.json({
      // shared / non-review fields
      interest_level:       extract('INTEREST_LEVEL'),
      emotional_warmth:     extract('EMOTIONAL_WARMTH'),
      openness:             extract('OPENNESS'),
      tone:                 extract('TONE'),
      hidden_signal:        extract('HIDDEN_SIGNAL'),
      what_they_said:       extract('WHAT_THEY_SAID'),
      what_they_might_mean: extract('WHAT_THEY_MIGHT_MEAN'),
      risk:                 extract('RISK'),
      suggested_move:       extract('SUGGESTED_MOVE'),
      reply_timing:         extract('REPLY_TIMING'),
      reply_timing_reason:  extract('REPLY_TIMING_REASON'),
      // review-mode structured fields
      emotional_risk:       extract('EMOTIONAL_RISK'),
      landing:              extract('LANDING'),
      what_you_sent:        extract('WHAT_YOU_SENT'),
      how_they_read_it:     extract('HOW_THEY_READ_IT'),
      strengths:            splitPipe(extract('STRENGTHS')),
      watch_out:            splitPipe(extract('WATCH_OUT')),
      verdict:              extract('VERDICT'),
      verdict_reason:       extract('VERDICT_REASON')
    });
  } catch (e) {
    console.error('[analyze-reply]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Disengagement detection ────────────────────────────────────
async function checkDisengagement(text) {
  if (!text?.trim()) return false;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: `Does this message indicate clear disengagement, rejection, or a request to stop contact? Reply with only YES or NO.\nMessage: ${text}`
        }]
      })
    });
    const data = await response.json();
    const answer = (data.content?.[0]?.text || '').trim().toUpperCase();
    return answer === 'YES';
  } catch (e) {
    console.error('[disengagement-check] error:', e.message);
    return false;
  }
}

const DISENGAGEMENT_NEXT_STEPS = {
  scenarios: [
    {
      label: 'Respect their boundary',
      action: "They have clearly communicated they don't want contact. The most respectful response is to stop reaching out. Give them space and focus on your own wellbeing."
    },
    {
      label: 'Why pushing further is harmful',
      action: 'Continuing to reach out after someone has asked you to stop can feel threatening to them and damaging to you. It prevents both of you from healing.'
    },
    {
      label: 'What to do instead',
      action: 'Talk to someone you trust, consider speaking with a therapist, and redirect your energy toward your own life.'
    }
  ],
  timing: 'Do not send another message. Their boundary deserves to be respected.',
  disengaged: true
};

const DISENGAGEMENT_NEXT_REPLY = {
  options: [
    {
      strategy: 'Respect their boundary',
      message: "They have clearly communicated they don't want contact. The most respectful response is to stop reaching out. Give them space and focus on your own wellbeing.",
      why: "Respecting an explicit request to stop contact is the right thing to do for both of you.",
      recommended: true
    },
    {
      strategy: 'Why pushing further is harmful',
      message: 'Continuing to reach out after someone has asked you to stop can feel threatening to them and damaging to you. It prevents both of you from healing.',
      why: 'Repeated contact after rejection causes harm and delays recovery for both sides.',
      recommended: false
    },
    {
      strategy: 'What to do instead',
      message: 'Talk to someone you trust, consider speaking with a therapist, and redirect your energy toward your own life.',
      why: 'Taking care of your own wellbeing is the most constructive step forward.',
      recommended: false
    }
  ],
  disengaged: true
};
// ────────────────────────────────────────────────────────────────

app.post('/api/next-reply', optionalAuth, limiter, async (req, res) => {
  try {
    if (!req.user && !isDevBypass(req)) return res.status(403).json({ error: 'Sign in required to use this feature.' });
    const { categoryId, situation, originalMessage, theirReply, language, contactContext } = req.body;
    if (!theirReply?.trim()) return res.status(400).json({ error: 'theirReply is required' });

    if (await checkDisengagement(theirReply)) {
      return res.json(DISENGAGEMENT_NEXT_REPLY);
    }

    const lang = language || 'English';
    const systemPrompt = `You are a communication strategist. The user sent a message and received a reply. Generate 3 possible next messages they could send, each with a different strategy.

Format exactly:
OPTION_1_STRATEGY: [strategy name]
OPTION_1_MESSAGE: [the actual message to send]
OPTION_1_WHY: [one sentence why this works]

OPTION_2_STRATEGY: [strategy name]
OPTION_2_MESSAGE: [the actual message]
OPTION_2_WHY: [one sentence]

OPTION_3_STRATEGY: [strategy name]
OPTION_3_MESSAGE: [the actual message]
OPTION_3_WHY: [one sentence]

RECOMMENDED: 1/2/3

Rules: Be specific to their actual reply. No generic responses. Write in ${lang}.${buildContactContext(contactContext)}`;

    const userPrompt = `Category: ${categoryId || 'general'}
Situation: ${situation || 'Not provided'}
Message I sent: ${originalMessage || 'Not provided'}
Their reply: ${theirReply}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = (t, key) => {
      const m = t.match(new RegExp(`^${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Z_0-9]+:|\\s*$)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const recommended = parseInt(extract(text, 'RECOMMENDED') || '1', 10);
    const options = [1, 2, 3].map(n => ({
      strategy:    extract(text, `OPTION_${n}_STRATEGY`),
      message:     extract(text, `OPTION_${n}_MESSAGE`),
      why:         extract(text, `OPTION_${n}_WHY`),
      recommended: n === recommended
    })).filter(o => o.strategy && o.message);

    res.json({ options });
  } catch (e) {
    console.error('[next-reply]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/likely-responses', limiter, async (req, res) => {
  try {
    const { categoryId, situation, selectedMessage, language, contactContext } = req.body;
    if (!selectedMessage?.trim()) return res.status(400).json({ error: 'selectedMessage is required' });

    const lang = language || 'English';
    const systemPrompt = `Based on this message being sent, predict 5 most likely responses the recipient might give. Be realistic and varied — include both positive and negative possibilities. If you have context about the recipient, use it to calibrate the probabilities. Write in ${lang}.${buildContactContext(contactContext)}

Format exactly (no extra text):
RESPONSE_1_TYPE: [one word: e.g. Warm, Curious, Neutral, Brief, Cold, Positive, Hesitant, Enthusiastic, Distant, Confused]
RESPONSE_1_PROBABILITY: [integer 0-100. All 5 must sum to roughly 100]
RESPONSE_1_EXAMPLE: [one short realistic example reply, 1-2 sentences max]
RESPONSE_1_NEXT_MOVE: [if they respond this way, one concrete sentence on what the sender should do next]

RESPONSE_2_TYPE: ...
RESPONSE_2_PROBABILITY: ...
RESPONSE_2_EXAMPLE: ...
RESPONSE_2_NEXT_MOVE: ...

(repeat for all 5)`;

    const userPrompt = `Category: ${categoryId || 'general'}\nSituation: ${situation || 'Not provided'}\nMessage sent: ${selectedMessage}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => { const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im')); return m ? m[1].trim() : null; };

    const responses = [1,2,3,4,5].map(n => ({
      type:        extract(`RESPONSE_${n}_TYPE`),
      probability: parseInt(extract(`RESPONSE_${n}_PROBABILITY`) || '0', 10),
      example:     extract(`RESPONSE_${n}_EXAMPLE`),
      next_move:   extract(`RESPONSE_${n}_NEXT_MOVE`)
    })).filter(r => r.type && r.example);

    res.json({ responses });
  } catch (e) {
    console.error('[likely-responses]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/next-steps', limiter, async (req, res) => {
  try {
    const { categoryId, situation, selectedMessage, language, scenario, theirMessage } = req.body;
    if (!selectedMessage?.trim()) return res.status(400).json({ error: 'selectedMessage is required' });

    if (theirMessage?.trim() && await checkDisengagement(theirMessage)) {
      return res.json(DISENGAGEMENT_NEXT_STEPS);
    }

    const lang = language || 'English';
    const scenarioCtx = scenario ? `\n\nThe user's situation fell into this scenario: ${scenario}. Generate advice specifically for this outcome.${theirMessage ? ` They actually said: "${theirMessage}"` : ''}` : '';
    const systemPrompt = `You are a communication strategist. Based on the message sent and the situation, predict 3 possible responses and what to do next. Be specific and practical.${scenarioCtx}

Format exactly like this:
SCENARIO_1_LABEL: [e.g. They respond positively]
SCENARIO_1_ACTION: [What to do/say next - 2-3 sentences max]

SCENARIO_2_LABEL: [e.g. They respond neutrally or briefly]
SCENARIO_2_ACTION: [What to do/say next]

SCENARIO_3_LABEL: [e.g. No response after X days]
SCENARIO_3_ACTION: [What to do/say next]

TIMING: [When to expect a response / how long to wait]

Be realistic, not optimistic. Write in ${lang}.`;

    const userPrompt = `Category: ${categoryId || 'general'}\nSituation: ${situation || 'Not provided'}\nMessage sent:\n${selectedMessage}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => {
      const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const scenarios = [
      { label: extract('SCENARIO_1_LABEL'), action: extract('SCENARIO_1_ACTION'), type: 'positive' },
      { label: extract('SCENARIO_2_LABEL'), action: extract('SCENARIO_2_ACTION'), type: 'neutral'  },
      { label: extract('SCENARIO_3_LABEL'), action: extract('SCENARIO_3_ACTION'), type: 'negative' }
    ].filter(s => s.label && s.action);

    const timing = extract('TIMING');
    res.json({ scenarios, timing });
  } catch (e) {
    console.error('[next-steps]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/review-message', limiter, async (req, res) => {
  try {
    const { message, context, language } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

    const lang = language || 'English';
    const systemPrompt = `You are a communication expert. Review this message before it's sent.

Return ONLY this exact format — no markdown, no extra text:
TONE: [one or two words]
CLARITY: High/Medium/Low
CLARITY_NOTE: [one sentence]
RISK_LEVEL: High/Medium/Low
RISK_NOTE: [one sentence about the main risk]
REACTION_1: [likely reaction — format: "Type: example"]
REACTION_2: [another likely reaction]
REACTION_3: [another likely reaction]
SUGGESTION: [one concrete improvement, or "None needed" if the message is strong]
VERDICT: [one sentence — is this ready to send or does it need changes?]

Write in ${lang}.`;

    const userPrompt = context?.trim()
      ? `Context: ${context}\n\nMessage to review:\n${message}`
      : `Message to review:\n${message}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => {
      const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    res.json({
      tone:         extract('TONE'),
      clarity:      extract('CLARITY'),
      clarity_note: extract('CLARITY_NOTE'),
      risk_level:   extract('RISK_LEVEL'),
      risk_note:    extract('RISK_NOTE'),
      reactions:    [1, 2, 3].map(n => extract(`REACTION_${n}`)).filter(Boolean),
      suggestion:   extract('SUGGESTION'),
      verdict:      extract('VERDICT')
    });
  } catch (e) {
    console.error('[review-message]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/setup-chunks-table', requireAuth, async (req, res) => {
  const sql = `CREATE TABLE IF NOT EXISTS conversation_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  date_range text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_contact ON conversation_chunks(contact_id);`;
  try {
    const r = await fetch(`${SUPABASE_REST}/conversation_chunks?select=id&limit=0`, {
      headers: sbHeaders(req.token)
    });
    if (r.ok || r.status === 406) return res.json({ ok: true, message: 'Table ready' });
    res.status(503).json({ ok: false, message: 'Table not found — run the SQL below in your Supabase SQL Editor', sql });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function parseJsonSafe(text) {
  if (!text) return null;
  let s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  // First try: clean parse
  try { return JSON.parse(s); } catch {}
  // Second try: repair truncated JSON (e.g. max_tokens cut mid-string)
  try {
    const src = start !== -1
      ? text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim().slice(start)
      : s;
    // Remove trailing dangling key (comma + partial "key" without value)
    let r = src.replace(/,\s*"[^"]*$/, '').replace(/,\s*$/, '');
    // Walk to track open structures and string state
    const stack = [];
    let inStr = false, esc = false;
    for (const c of r) {
      if (esc)        { esc = false; continue; }
      if (c === '\\') { if (inStr) { esc = true; } continue; }
      if (c === '"')  { inStr = !inStr; continue; }
      if (!inStr) {
        if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
        else if ((c === '}' || c === ']') && stack.length) stack.pop();
      }
    }
    if (inStr) r += '"';           // close open string value
    r += stack.reverse().join(''); // close open arrays/objects
    return JSON.parse(r);
  } catch {}
  return null;
}

app.post('/api/analyze-conversation', limiter, optionalAuth, async (req, res) => {
  try {
    const { conversationText, language, previousContext, contact_id, contact_name } = req.body;
    if (!conversationText?.trim()) return res.status(400).json({ error: 'conversationText is required' });

    const lang = language || 'English';
    // Head (identity/context) + tail (recent dynamics) preserves both ends
    const FULL_THRESHOLD = 175000;
    let snippet;
    let chunkDerivedPatterns             = null;
    let chunkDerivedRelationshipSummary  = null;
    let chunkDerivedPersonBName          = null;

    if (conversationText.length <= FULL_THRESHOLD) {
      snippet = conversationText;
      // Fire-and-forget: extract character profile (small file — direct Sonnet on full text)
      if (contact_id && req.user?.id && req.token) {
        (async () => {
          try {
            console.log('[profile-extract] STARTED (small)', contact_id, 'len:', conversationText.length);
            const pr_r = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1000,
                system: `You are reading a WhatsApp conversation and writing a prose character profile of the CONTACT (${contact_name ? `"${contact_name}"` : 'the non-owner person'}).
WhatsApp lines look like: "DD/MM/YYYY HH:MM - SenderName: message text". There are TWO senders: the chat OWNER (USER) and the CONTACT.

OWNERSHIP RULE: Possessive language tells you who owns the relationship. "Benim oğlum Kemal" said by the USER means Kemal is the USER's son — not the contact's. Do NOT assign the user's family members to the contact. Be precise about whose family/friends each person is.

NAME COLLISION RULE: The same first name may belong to TWO DIFFERENT people (Turkish tradition: a grandson is often named after his grandfather). CRITICAL — look for this specifically: in this conversation there are likely TWO people named Kemal: (a) the CONTACT's father Kemal — older generation, health/land contexts; (b) the USER's son Kemal — a child, the contact is his uncle figure. EXPLICITLY add a "NAME COLLISION" note: "There are two people named Kemal: [contact]'s father Kemal ([context]) and [user]'s son Kemal ([context]). Never conflate them." Apply to ANY repeated name you detect.

Write 3-5 paragraphs describing the CONTACT as if briefing someone who will roleplay as them. Cover:
- Who they are: personality, values, energy, what they care about
- Their relationship with the chat owner: dynamic, tone, history
- How they communicate: message length, style, slang, emoji, what they avoid
- ALL people mentioned — note whose family/friend each person is. If a name appears for two different people, name both explicitly with their distinct contexts.
- How they address the chat owner; recurring phrases they use

Write in plain prose — no bullet points, no JSON, no headers. Refer to the CONTACT in third person. Be specific and concrete. Do not invent details.`,
                messages: [{ role: 'user', content: conversationText }]
              })
            });
            if (!pr_r.ok) { console.error('[profile-extract] API fail (small):', pr_r.status); return; }
            const pr_d = await pr_r.json();
            const prose = pr_d.content?.[0]?.text?.trim() || '';
            if (!prose) { console.warn('[profile-extract] empty prose (small)'); return; }
            console.log('[profile-extract] prose (small):', prose.slice(0, 200));
            const relSummarySmall = (() => {
              const para = prose.split(/\n\n/)[0].trim();
              if (para.length <= 300) return para;
              const sents = para.match(/[^.!?]+[.!?]+/g) || [];
              return sents.slice(0, 2).join(' ').trim() || para.slice(0, 300);
            })();
            const patchR = await fetch(`${SUPABASE_REST}/contacts?id=eq.${contact_id}&user_id=eq.${req.user.id}`, {
              method: 'PATCH',
              headers: { ...sbHeaders(req.token), 'Prefer': 'return=minimal' },
              body: JSON.stringify({ character_profile: prose, relationship_summary: relSummarySmall, updated_at: new Date().toISOString() })
            });
            if (!patchR.ok) console.error('[profile-extract] PATCH FAILED (small):', patchR.status, await patchR.text());
            else console.log('[profile-extract] SAVED (small)', contact_id, prose.length, 'chars | rel_summary:', relSummarySmall.slice(0, 80));
          } catch (e) { console.error('[profile-extract-error]', e.message); }
        })();
      }
    } else {
      const HEAD = 3000, MID = 5000, TAIL = 6000;
      const midStart = Math.floor((conversationText.length - MID) / 2);
      snippet = (
        conversationText.slice(0, HEAD) + '\n[...]\n' +
        conversationText.slice(midStart, midStart + MID) + '\n[...]\n' +
        conversationText.slice(-TAIL)
      );

      // Split full conversation into fixed-size chunks with overlap
      const CHUNK_SIZE = 5000;
      const OVERLAP = 200;
      const chunks = [];
      let start = 0;
      while (start < conversationText.length) {
        chunks.push(conversationText.slice(start, start + CHUNK_SIZE));
        start += CHUNK_SIZE - OVERLAP;
      }
      console.log(`[chunk-analyze] Large file: ${conversationText.length}chars, ${chunks.length} chunks → single Sonnet synthesis`);

      // Best-effort: save chunks to Supabase for RAG
      console.log('[chunk-save] contact_id:', contact_id, 'user:', req.user?.id);
      if (contact_id) {
        (async () => {
          try {
            await fetch(`${SUPABASE_REST}/conversation_chunks?contact_id=eq.${contact_id}`, {
              method: 'DELETE',
              headers: sbHeaders(req.token)
            });
            for (let i = 0; i < chunks.length; i++) {
              await fetch(`${SUPABASE_REST}/conversation_chunks`, {
                method: 'POST',
                headers: { ...sbHeaders(req.token), 'Prefer': 'return=minimal' },
                body: JSON.stringify({ contact_id, user_id: req.user?.id, chunk_text: chunks[i], chunk_index: i })
              });
            }
            console.log(`[chunk-save] Saved ${chunks.length} chunks for contact_id ${contact_id}`);
          } catch (e) { console.error('[chunk-save-error]', e.message); }
        })();
      }

      // Take first 1500 chars of each chunk — covers ~30% of each, names distributed throughout
      const chunkSamples = chunks.map(c => c.slice(0, 1500));
      const combinedSamples = chunkSamples.join('\n===\n');

      let synthesisText = null;
      try {
        const sr = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: `You are analyzing a long WhatsApp conversation exported as text. Your job is to build a behavioral profile of the CONTACT (${contact_name ? `the person named "${contact_name}"` : 'the non-owner person'}).

OWNERSHIP RULE: There are exactly TWO senders. The CONTACT and the USER (chat owner). When someone uses possessive language ("benim oğlum" = my son, "karım" = my wife, "babam" = my father), that person belongs to WHOEVER IS SPEAKING. Read carefully: if the USER says "oğlum Kemal", Kemal is the USER's son — NOT the contact's. Do not assign the user's family members to the contact.

CRITICAL: Do not use markdown. No bold (**), no headers. Plain text only. Start each field directly: OBSERVED_PATTERNS: ...

Extract:
OBSERVED_PATTERNS: 4-5 behavioral patterns separated by | — focus on communication style, emotional tone, recurring habits, how they address the user, relationship dynamics. When mentioning people, note whose family/friend they are (e.g. "user's son Kemal"). Write patterns in the same language as the conversation.
RELATIONSHIP_SUMMARY: 2-3 sentences on who this person is and the relationship dynamic. Same language as conversation.
PERSON_B_NAME: The contact's actual name or what the user calls them (not a label like 'kardeşim' — look for how they address each other directly)`,
            messages: [{ role: 'user', content: `Conversation samples from ${chunks.length} time periods:\n${combinedSamples}` }]
          })
        });
        const sd = await sr.json();
        if (sr.ok && sd.content?.[0]?.text) {
          synthesisText = sd.content[0].text;
          console.log('[synthesis-raw]', JSON.stringify(synthesisText.slice(0, 500)));
          console.log('[chunk-synthesis]', synthesisText);
          const extractSynth = key => {
            const clean = synthesisText.replace(/\*\*/g, '').replace(/\*/g, '');
            const lines = clean.split('\n');
            const startIdx = lines.findIndex(l => l.trim().toUpperCase().indexOf(key + ':') !== -1);
            if (startIdx === -1) return null;
            const firstLine = lines[startIdx].replace(new RegExp(`.*${key}:\\s*`, 'i'), '').trim();
            const subsequent = [];
            for (let i = startIdx + 1; i < lines.length; i++) {
              if (lines[i].match(/^[A-Z_]{3,}:/)) break;
              subsequent.push(lines[i]);
            }
            return [firstLine, ...subsequent].join('\n').trim() || null;
          };
          const rp = extractSynth('OBSERVED_PATTERNS');
          if (rp) chunkDerivedPatterns = rp.split('|').map(p => p.trim()).filter(p => p.length > 4).slice(0, 5);
          chunkDerivedRelationshipSummary = extractSynth('RELATIONSHIP_SUMMARY');
          chunkDerivedPersonBName = extractSynth('PERSON_B_NAME');
          console.log('[chunk-patterns]', chunkDerivedPatterns);
        }
      } catch { /* synthesis failed — snippet-based patterns used as fallback */ }

      // Fire-and-forget: extract character profile from synthesis output + conversation samples
      if (contact_id && req.user?.id && req.token) {
        (async () => {
          try {
            const _kemalCount = (conversationText.match(/kemal/gi) || []).length;
            const _keremCount = (conversationText.match(/kerem/gi) || []).length;
            console.log('[profile-extract] STARTED (large)', contact_id, 'full conv len:', conversationText.length, '| kemal hits:', _kemalCount, 'kerem hits:', _keremCount);
            const profileInput = [
              synthesisText ? `BEHAVIORAL ANALYSIS:\n${synthesisText}` : '',
              `FULL CONVERSATION:\n${conversationText.slice(0, 180000)}`
            ].filter(Boolean).join('\n\n');
            const pr_r = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 2000,
                system: `You are reading the FULL WhatsApp conversation and writing a prose character profile of the CONTACT (${contact_name ? `"${contact_name}"` : 'the non-owner person'}).

You have access to the complete conversation. Use the ENTIRE context to infer relationships and ownership — even when ownership is never explicitly stated, patterns across the full conversation will reveal it (e.g. whose children are whose, whose spouse, who is mentioned by which sender).

OWNERSHIP RULE: There are TWO senders — the CONTACT and the USER (chat owner). Do NOT assume everyone mentioned belongs to the contact. Infer from context: if the USER consistently refers to Kemal and Kerem in the context of their own family, they are the USER's children. Be precise: "Ras's sons Kemal and Kerem" vs "Mert's wife Yağmur."

NAME COLLISION RULE: The same first name may belong to TWO DIFFERENT people (Turkish tradition: a grandson is often named after his grandfather). CRITICAL — look for this specifically: in this conversation there are likely TWO people named Kemal: (a) the CONTACT's father Kemal — older generation, health issues, e-devlet/land/property contexts; (b) the USER's son Kemal — a child, school/photos context, the contact is his uncle figure. EXPLICITLY add a "NAME COLLISION" note in the document: "There are two people named Kemal: [contact]'s father Kemal ([context]) and [user]'s son Kemal ([context]). Never conflate them." Apply this logic to ANY repeated name you detect, not just Kemal.

Write 4-6 paragraphs describing the CONTACT as if briefing someone who will roleplay as them. Cover:
- Who they are: personality, values, energy, what they care about
- Their relationship with the chat owner: dynamic, tone, history
- How they communicate: message length, style, slang, emoji, what they avoid
- ALL people mentioned — note WHOSE family/friend each person is. If a name appears for two different people, name both explicitly. Include the chat owner's children if mentioned.
- How they address the chat owner; recurring phrases they use

Write in plain prose — no bullet points, no JSON, no headers. Refer to the CONTACT in third person. Be specific and concrete. Do not invent details.`,
                messages: [{ role: 'user', content: profileInput }]
              })
            });
            if (!pr_r.ok) { console.error('[profile-extract] API fail (large):', pr_r.status); return; }
            const pr_d = await pr_r.json();
            const prose = pr_d.content?.[0]?.text?.trim() || '';
            if (!prose) { console.warn('[profile-extract] empty prose (large)'); return; }
            console.log('[profile-extract] prose (large):', prose.slice(0, 200));
            const relSummaryLarge = (() => {
              const para = prose.split(/\n\n/)[0].trim();
              if (para.length <= 300) return para;
              const sents = para.match(/[^.!?]+[.!?]+/g) || [];
              return sents.slice(0, 2).join(' ').trim() || para.slice(0, 300);
            })();
            const patchR = await fetch(`${SUPABASE_REST}/contacts?id=eq.${contact_id}&user_id=eq.${req.user.id}`, {
              method: 'PATCH',
              headers: { ...sbHeaders(req.token), 'Prefer': 'return=minimal' },
              body: JSON.stringify({ character_profile: prose, relationship_summary: relSummaryLarge, updated_at: new Date().toISOString() })
            });
            if (!patchR.ok) console.error('[profile-extract] PATCH FAILED (large):', patchR.status, await patchR.text());
            else console.log('[profile-extract] SAVED (large)', contact_id, prose.length, 'chars | rel_summary:', relSummaryLarge.slice(0, 80));
          } catch (e) { console.error('[profile-extract-error]', e.message); }
        })();
      }
    }

    const prevBlock = previousContext
      ? `PREVIOUS CONTEXT (from analysis on ${previousContext.date}):\n- Interest: ${previousContext.interest_level || '?'} · Tone: ${previousContext.emotional_tone || '?'} · State: ${previousContext.relationship_state || '?'}${previousContext.patterns?.length ? `\n- Patterns observed then: ${previousContext.patterns.join(' | ')}` : ''}\n\n`
      : '';

    const whatChangedLine = previousContext
      ? `\nWHAT_CHANGED: [2-3 sentences on concrete behavioral differences since the previous analysis. Compare: who initiates contact, response speed, engagement level, tone shifts. Observable changes only — no diagnoses, no labels. Example: "Previously initiated most conversations; now rarely starts contact. Response times have increased noticeably." Omit this line entirely if differences are minimal or unclear.]`
      : '';

    const systemPrompt = `${prevBlock}CRITICAL: Detect the language of this conversation. Write ALL values in that exact same language — labels (POWER_BALANCE:, KEY_MOMENT:, etc.) stay in English for parsing, but every value after the colon must be in the conversation's language. Turkish conversation → all values in Turkish. English → English. This rule overrides everything else.

Analyze this exported chat conversation. Extract:
PERSON_A: [who seems to be the user - the one asking for help]
PERSON_B: [the other person's name if visible]
TOTAL_MESSAGES: [count]
PERSON_A_MESSAGES: [count]
PERSON_B_MESSAGES: [count]
POWER_BALANCE: [who initiates more, who responds faster — one sentence]
INTEREST_LEVEL: High/Medium/Low
EMOTIONAL_TONE: [overall tone — one or two words]
KEY_MOMENT: [most significant moment in the conversation — one sentence]
LAST_MESSAGE_BY: [A or B]
DAYS_SINCE_LAST: [number of days if timestamps visible, otherwise omit]
ACTION_TYPE: [exactly one of: SEND_MESSAGE / WAIT / CALL / DO_NOTHING / SET_BOUNDARY — the best move RIGHT NOW. The best move is NOT always sending a message. If they need space, choose WAIT. If a real conversation is needed, choose CALL. If reaching out would hurt the dynamic, choose DO_NOTHING. Be honest, not optimistic.]
ACTION_DETAIL: [one sentence — what to do and why, in the conversation's language]
BIGGEST_RISK: [main risk in this relationship dynamic — one sentence]
AVOID: [what NOT to do right now — one sentence]
SIGNAL_STRENGTH: [exactly one of: Strong / Moderate / Weak — confidence in this analysis. Weak if very few messages or context is unclear.]
OBSERVED_PATTERNS: [3-5 behavioral patterns separated by | — these must be OBSERVATIONS only, never diagnoses or clinical labels. GOOD examples: "Responds slower after emotional topics" | "Rarely initiates after a disagreement" | "Engages more with practical questions" | "Replies get shorter when the topic turns personal". BAD (never use): attachment styles, percentages, clinical labels, personality types]
ADDRESS_STYLE: [How Person A (user) addresses Person B — a pet name, term of endearment, or just their name. Examples: "aşkım", "canım", "abi", "hocam", or the actual name. One word or short phrase. Omit this line if unclear.]${whatChangedLine}

Reply with ONLY these labeled lines. No markdown, no extra commentary.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2200,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Conversation:\n${snippet}` }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => {
      const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const patternsRaw = extract('OBSERVED_PATTERNS');
    const snippetPatterns = patternsRaw
      ? patternsRaw.split('|').map(p => p.trim()).filter(p => p.length > 4).slice(0, 5)
      : [];
    const observed_patterns = chunkDerivedPatterns ?? snippetPatterns;
    const what_changed = previousContext ? (extract('WHAT_CHANGED') || null) : null;

    const action_detail = extract('ACTION_DETAIL') || null;
    res.json({
      person_a:             extract('PERSON_A'),
      person_b:             chunkDerivedPersonBName || extract('PERSON_B'),
      total_messages:       extract('TOTAL_MESSAGES'),
      person_a_messages:    extract('PERSON_A_MESSAGES'),
      person_b_messages:    extract('PERSON_B_MESSAGES'),
      power_balance:        extract('POWER_BALANCE'),
      interest_level:       extract('INTEREST_LEVEL'),
      emotional_tone:       extract('EMOTIONAL_TONE'),
      key_moment:           extract('KEY_MOMENT'),
      last_message_by:      extract('LAST_MESSAGE_BY'),
      days_since_last:      extract('DAYS_SINCE_LAST'),
      action_type:          extract('ACTION_TYPE') || 'SEND_MESSAGE',
      action_detail,
      recommended_next:     action_detail, // backward-compat: contact screen + generateFromContext
      biggest_risk:         extract('BIGGEST_RISK'),
      avoid:                extract('AVOID') || null,
      signal_strength:      extract('SIGNAL_STRENGTH') || null,
      observed_patterns,
      relationship_summary: chunkDerivedRelationshipSummary || null,
      what_changed,
      how_user_addresses:   extract('ADDRESS_STYLE') || null
    });
  } catch (e) {
    console.error('[analyze-conversation]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Conversations ──────────────────────────────────────────────
app.post('/api/conversations', requireAuth, async (req, res) => {
  try {
    const { categoryId, subcategoryId, situation, fields, contact_id } = req.body;
    const r = await fetch(`${SUPABASE_REST}/conversations`, {
      method: 'POST',
      headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: req.user.id,
        category_id: categoryId || '',
        subcategory_id: subcategoryId || '',
        situation: (situation || '').slice(0, 600),
        fields: fields || null,
        contact_id: contact_id || null
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);

    // Keep at most 20 conversations per contact (fire-and-forget)
    if (contact_id) {
      const userId = req.user.id;
      const token  = req.token;
      setImmediate(async () => {
        try {
          const listRes = await fetch(
            `${SUPABASE_REST}/conversations?contact_id=eq.${contact_id}&user_id=eq.${userId}&order=created_at.asc&select=id`,
            { headers: sbHeaders(token) }
          );
          if (!listRes.ok) return;
          const list = await listRes.json();
          if (Array.isArray(list) && list.length > 20) {
            const ids = list.slice(0, list.length - 20).map(c => c.id).join(',');
            await fetch(
              `${SUPABASE_REST}/conversations?id=in.(${ids})&user_id=eq.${userId}`,
              { method: 'DELETE', headers: sbHeaders(token) }
            );
          }
        } catch { /* best-effort, ignore */ }
      });
    }
  } catch (e) {
    console.error('[conv POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { role, content, strategy } = req.body;
    const r = await fetch(`${SUPABASE_REST}/conversation_messages`, {
      method: 'POST',
      headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        conversation_id: req.params.id,
        role: role || 'sent',
        content: (content || '').slice(0, 2000),
        strategy: strategy || ''
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    console.error('[conv msg POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/conversations', requireAuth, async (req, res) => {
  try {
    const r = await fetch(`${SUPABASE_REST}/conversations?user_id=eq.${req.user.id}&order=updated_at.desc&select=id,category_id,subcategory_id,situation,created_at,updated_at,contact_id,contacts(id,name),conversation_messages(id,role,content,outcome)`, {
      headers: sbHeaders(req.token)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(data);
  } catch (e) {
    console.error('[conv GET list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/conversations/:id', requireAuth, async (req, res) => {
  try {
    const r = await fetch(
      `${SUPABASE_REST}/conversations?id=eq.${req.params.id}&user_id=eq.${req.user.id}&select=id,category_id,subcategory_id,situation,fields,created_at,contact_id,contacts(id,name,type,relationship_state,relationship_summary,observed_patterns,character_profile),conversation_messages(id,role,content,strategy,created_at,outcome)`,
      { headers: sbHeaders(req.token) }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    if (!data.length) return res.status(404).json({ error: 'Not found' });
    res.json(data[0]);
  } catch (e) {
    console.error('[conv GET detail]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/conversations/:convId/messages/:msgId/outcome', requireAuth, async (req, res) => {
  try {
    const { outcome, outcome_note } = req.body;
    // Verify the conversation belongs to this user
    const cr = await fetch(`${SUPABASE_REST}/conversations?id=eq.${req.params.convId}&user_id=eq.${req.user.id}&select=id`, {
      headers: sbHeaders(req.token)
    });
    const cd = await cr.json();
    if (!Array.isArray(cd) || !cd.length) return res.status(404).json({ error: 'Not found' });

    const r = await fetch(
      `${SUPABASE_REST}/conversation_messages?id=eq.${req.params.msgId}&conversation_id=eq.${req.params.convId}`,
      {
        method: 'PATCH',
        headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
        body: JSON.stringify({ outcome: outcome || null, outcome_note: outcome_note || null })
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    console.error('[outcome PATCH]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
  try {
    const cr = await fetch(`${SUPABASE_REST}/conversations?id=eq.${req.params.id}&user_id=eq.${req.user.id}&select=id`,
      { headers: sbHeaders(req.token) });
    const cd = await cr.json();
    if (!Array.isArray(cd) || !cd.length) return res.status(404).json({ error: 'Not found' });
    // Delete messages first (safe even if CASCADE already handles it)
    await fetch(`${SUPABASE_REST}/conversation_messages?conversation_id=eq.${req.params.id}`,
      { method: 'DELETE', headers: sbHeaders(req.token) });
    const r = await fetch(`${SUPABASE_REST}/conversations?id=eq.${req.params.id}&user_id=eq.${req.user.id}`,
      { method: 'DELETE', headers: sbHeaders(req.token) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(JSON.stringify(d)); }
    res.json({ deleted: true });
  } catch (e) { console.error('[conv DELETE]', e.message); res.status(500).json({ error: e.message }); }
});

// ── Contacts ───────────────────────────────────────────────────
// SQL to run in Supabase SQL Editor before using these endpoints:
//   CREATE TABLE IF NOT EXISTS contacts (
//     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//     name text NOT NULL, type text, relationship_summary text,
//     relationship_state text, observed_patterns jsonb DEFAULT NULL,
//     character_profile jsonb DEFAULT NULL,
//     source text DEFAULT 'manual',
//     created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "contacts_owner" ON contacts FOR ALL USING (auth.uid() = user_id);
//   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
//   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS character_profile jsonb DEFAULT NULL;

app.post('/api/contacts/from-text', requireAuth, limiter, async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const lang = language || 'English';
    const snippet = text.length > 6000 ? text.slice(-6000) : text;

    const systemPrompt = `You are analyzing text about a person. The text may be a WhatsApp/chat export, a free-text description, or a mix.

Extract:
NAME: [the other person's name if identifiable, otherwise "Unknown"]
TYPE: [one of: Partner, Ex, Crush, Friend, Family, Boss, Colleague, Client — best fit, or leave blank]
RELATIONSHIP_STATE: [one of: Warm, Neutral, Cold, Tense, Distant, Flirty — best fit, or leave blank]
OBSERVED_PATTERNS: [2-4 behavioral observations separated by | — OBSERVATIONS only, never diagnoses, percentages, or clinical labels. GOOD: "Prefers short messages" | "Gets direct when stressed". BAD: attachment styles, personality types]

Reply with ONLY these labeled lines. No markdown, no extra commentary. Language context: ${lang}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: snippet }]
      })
    });

    const apiData = await response.json();
    if (!response.ok) throw new Error(apiData.error?.message || 'API error');

    const rawText = apiData.content[0].text;
    const extract = key => {
      const m = rawText.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const patternsRaw = extract('OBSERVED_PATTERNS');
    const observed_patterns = patternsRaw
      ? patternsRaw.split('|').map(p => p.trim()).filter(p => p.length > 3).slice(0, 4)
      : [];

    const name = extract('NAME');
    res.json({
      name: (name && name.toLowerCase() !== 'unknown') ? name : null,
      type: extract('TYPE'),
      relationship_state: extract('RELATIONSHIP_STATE'),
      observed_patterns
    });
  } catch (e) {
    console.error('[contacts from-text]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contacts', requireAuth, async (req, res) => {
  try {
    const { name, type, relationship_summary, relationship_state, observed_patterns, source } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const insertBody = {
      user_id: req.user.id, name: name.trim(),
      type: type || null, relationship_summary: relationship_summary || null,
      relationship_state: relationship_state || null,
      source: source || 'manual'
    };
    if (Array.isArray(observed_patterns) && observed_patterns.length) {
      insertBody.observed_patterns = observed_patterns;
    }
    const r = await fetch(`${SUPABASE_REST}/contacts`, {
      method: 'POST',
      headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
      body: JSON.stringify(insertBody)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) { console.error('[contacts POST]', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/api/contacts', requireAuth, async (req, res) => {
  try {
    const r = await fetch(
      `${SUPABASE_REST}/contacts?user_id=eq.${req.user.id}&order=updated_at.desc&select=id,name,type,relationship_state,relationship_summary,source,created_at,updated_at`,
      { headers: sbHeaders(req.token) }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(data);
  } catch (e) { console.error('[contacts GET list]', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/api/contacts/:id', requireAuth, async (req, res) => {
  try {
    const [cr, convr] = await Promise.all([
      fetch(`${SUPABASE_REST}/contacts?id=eq.${req.params.id}&user_id=eq.${req.user.id}&select=id,name,type,relationship_state,relationship_summary,observed_patterns,character_profile,source,created_at,updated_at`,
        { headers: sbHeaders(req.token) }),
      fetch(`${SUPABASE_REST}/conversations?contact_id=eq.${req.params.id}&user_id=eq.${req.user.id}&order=updated_at.desc&select=id,category_id,subcategory_id,situation,fields,created_at`,
        { headers: sbHeaders(req.token) })
    ]);
    const [contacts, convs] = await Promise.all([cr.json(), convr.json()]);
    if (!cr.ok) throw new Error(JSON.stringify(contacts));
    if (!contacts.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ...contacts[0], conversations: Array.isArray(convs) ? convs : [] });
  } catch (e) { console.error('[contacts GET :id]', e.message); res.status(500).json({ error: e.message }); }
});

app.patch('/api/contacts/:id', requireAuth, async (req, res) => {
  try {
    const { name, type, relationship_summary, relationship_state, observed_patterns, character_profile } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (relationship_summary !== undefined) updates.relationship_summary = relationship_summary;
    if (relationship_state !== undefined) updates.relationship_state = relationship_state;
    if (observed_patterns !== undefined) updates.observed_patterns = observed_patterns;
    if (character_profile !== undefined) updates.character_profile = character_profile;
    const r = await fetch(`${SUPABASE_REST}/contacts?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
      body: JSON.stringify(updates)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) { console.error('[contacts PATCH]', e.message); res.status(500).json({ error: e.message }); }
});

app.delete('/api/contacts/:id', requireAuth, async (req, res) => {
  try {
    const r = await fetch(`${SUPABASE_REST}/contacts?id=eq.${req.params.id}&user_id=eq.${req.user.id}`,
      { method: 'DELETE', headers: sbHeaders(req.token) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(JSON.stringify(d)); }
    res.json({ deleted: true });
  } catch (e) { console.error('[contacts DELETE]', e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/extract-screenshot', optionalAuth, limiter, async (req, res) => {
  const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  try {
    const { images } = req.body; // array of { media_type, data }
    if (!Array.isArray(images) || !images.length) {
      return res.status(400).json({ error: 'images array required' });
    }
    const texts = [];
    for (const img of images) {
      const { media_type, data } = img;
      if (!media_type || !data) continue;
      if (!SUPPORTED_TYPES.includes(media_type)) {
        throw new Error(`Unsupported image format (${media_type}). Please save the screenshot as JPG or PNG.`);
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type, data } },
              { type: 'text', text: 'Extract the visible conversation text from this screenshot. Output only the conversation as text — who said what, in order. No commentary.' }
            ]
          }]
        })
      });
      const apiData = await response.json();
      if (!response.ok) {
        console.error('[extract-screenshot] Anthropic error', response.status, JSON.stringify(apiData.error));
        throw new Error(apiData.error?.message || `OCR API error (status ${response.status})`);
      }
      texts.push(apiData.content[0].text);
    }
    res.json({ text: texts.join('\n\n') });
  } catch (e) {
    console.error('[extract-screenshot]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/simulate-debrief', limiter, async (req, res) => {
  try {
    const { character, history, language } = req.body;
    if (!character || !Array.isArray(history) || history.length < 2) {
      return res.status(400).json({ error: 'character and history are required' });
    }
    const lang = language || 'English';
    const name = character.name || 'the other person';
    const transcript = history.map(m =>
      `[${m.role === 'user' ? 'You' : name}]: ${m.content}`
    ).join('\n');

    const systemPrompt = `You are a communication coach reviewing a practice conversation. Analyse the transcript and write a short observational debrief of 3-4 sentences in ${lang}.

Rules:
- NO scores, percentages, or ratings (no "7/10", no "65%", no grades).
- Observation-only language: describe what happened, not what the user "should" have done.
- Cover: how the user's approach came across (e.g. warm, direct, hesitant), how ${name} responded (opened up, stayed guarded, warmed slightly), one concrete observation about what worked or felt off, and one gentle forward-looking suggestion.
- Keep it conversational and kind — like a coach talking after a rehearsal, not an evaluation report.
- Write entirely in ${lang}.`;

    const userPrompt = `Practice transcript:\n${transcript}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');
    res.json({ debrief: data.content?.[0]?.text?.trim() || '' });
  } catch (e) {
    console.error('[simulate-debrief]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/simulate-reply', limiter, optionalAuth, async (req, res) => {
  try {
    const { character, history, language } = req.body;
    if (!character || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: 'character and history are required' });
    }
    const lang = language || 'English';
    const name = character.name || 'the other person';
    const userLabel = character.user_name || character.character_profile?.user_name || 'the user';
    const patternLines = Array.isArray(character.observed_patterns) && character.observed_patterns.length
      ? character.observed_patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : null;
    const relationshipLine = [character.type, character.relationship_state].filter(Boolean).join(', ');

    console.log('[simulate-reply] called — contact_id:', character.contact_id, 'has_token:', !!req.token, 'profile:', !!character.character_profile, 'profile_len:', typeof character.character_profile === 'string' ? character.character_profile.length : (character.character_profile ? 'object' : 0));
    // RAG: retrieve relevant chunks from past conversations
    let ragContext = '';
    let recentContext = '';
    if (character.contact_id && req.token) {
      console.log('[rag] contact_id:', character.contact_id, 'has_token:', !!req.token, 'has_auth_header:', !!req.headers.authorization);
      try {
        const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
        const words = lastUserMsg.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
          const chunksR = await fetch(
            `${SUPABASE_REST}/conversation_chunks?contact_id=eq.${character.contact_id}&select=chunk_text,chunk_index&order=chunk_index`,
            { headers: sbHeaders(req.token) }
          );
          if (chunksR.ok) {
            const allChunks = await chunksR.json();
            console.log('[rag] contact_id:', character.contact_id, 'has_token:', !!req.token, 'chunks_found:', allChunks?.length);
            if (Array.isArray(allChunks) && allChunks.length > 0) {
              const isJunkLine = (l) => {
                const t = l.trim();
                if (!t || t.length < 5) return true;
                if (/media omitted/i.test(t)) return true;
                // Single message blocks >1500 chars (video prompts, copy-paste)
                if (t.length > 1500) return true;
                // Long English-heavy lines (cinematic/AI prompts)
                if (t.length > 80 && /cinematic|volumetric|ultra.?realistic|lighting|prompt|render/i.test(t)) return true;
                // Lines that are mostly English in a Turkish conversation
                if (t.length > 150 && /^[a-zA-Z0-9\s.,!?'"()\-:;#@]+$/.test(t)) return true;
                return false;
              };
              // Last 2 chunks = most recent messages, junk filtered
              const recentSnippet = allChunks.slice(-2)
                .map(c => c.chunk_text.slice(-1500).split('\n').filter(l => !isJunkLine(l)).join('\n'))
                .join('\n');
              if (recentSnippet.trim()) recentContext = `\nRECENT EXCHANGES (tone/context examples, in these "${name}" = you):\n${recentSnippet}`;
              const extractRelevantLines = (text) => {
                const lines = text.split('\n');
                const kept = new Set();
                lines.forEach((line, i) => {
                  if (!isJunkLine(line) && words.some(w => line.toLowerCase().includes(w.toLowerCase()))) {
                    for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) kept.add(j);
                  }
                });
                return [...kept].sort((a, b) => a - b).map(i => lines[i]).filter(l => !isJunkLine(l)).join('\n');
              };
              const scored = allChunks
                .map(c => ({ snippet: extractRelevantLines(c.chunk_text), score: words.filter(w => c.chunk_text.toLowerCase().includes(w.toLowerCase())).length }))
                .filter(c => c.score > 0 && c.snippet)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6);
              console.log('[rag-matched]', scored.length, 'chunks for words:', words.slice(0, 5), '| snippets:', scored.map(c => c.snippet.length));
              if (scored.length > 0) {
                ragContext = `\nRELEVANT EXCERPTS (tone/context examples, in these "${name}" = you, "${userLabel}" = the person messaging you now):\n${scored.map(c => c.snippet).join('\n---\n')}`;
                console.log('[rag-context] total ragContext len:', ragContext.length);
              } else {
                console.log('[rag-context] ragContext EMPTY — all snippets filtered or no matches');
              }
            }
          }
        }
      } catch { /* RAG is best-effort */ }
    } else {
      console.log('[rag] skipped — contact_id:', character.contact_id, 'has_token:', !!req.token);
    }

    // Prose character document — handles string (new) and old JSON profiles
    const charDoc = (() => {
      const cp = character.character_profile;
      if (!cp) return '';
      if (typeof cp === 'string') return cp.trim();
      // Backward compat: old JSON profile → flatten to prose
      const parts = [];
      if (cp.personality) parts.push(cp.personality);
      if (cp.style) parts.push(cp.style);
      if (cp.people?.length) parts.push(`People mentioned: ${cp.people.map(p => `${p.name} (${p.relation})`).join(', ')}.`);
      if (cp.typical_phrases?.length) parts.push(`Typical phrases: ${cp.typical_phrases.join(', ')}.`);
      return parts.join(' ');
    })();

    const systemPrompt = `You ARE ${name}. Respond ONLY as ${name} would — never break character, never reveal you are an AI.
The person messaging you is ${userLabel}. You are talking DIRECTLY TO them — address them as 'you', NEVER refer to them in third person by name.
${charDoc ? `WHO YOU ARE — this is the authoritative description of you, your life, and the people in it. Treat it as true:\n${charDoc}\n\n` : ''}${ragContext ? ragContext + '\n\n' : ''}${recentContext ? recentContext + '\n\n' : ''}RELATIONSHIP CONTEXT:
${relationshipLine ? `- Relationship: ${relationshipLine}` : ''}${character.relationship_summary ? `\n- Background: ${character.relationship_summary}` : ''}

${patternLines ? `HOW ${name.toUpperCase()} COMMUNICATES (apply every one of these):\n${patternLines}` : `You have no recorded patterns for ${name} — respond as a realistic person of their relationship type.`}

RULES:
- Match ${name}'s energy level, word choice, and sentence length exactly as their patterns describe
- React naturally to what was just said — in character, with ${name}'s typical emotional tone
- For who people are and your background, trust the description above. Message excerpts are just examples of past chats — tone reference, not authority.
- If a USER CORRECTIONS section exists in your character description above, treat it as the most authoritative truth — it overrides everything else, including the rest of the character description.
- If a name in the description refers to two different people (e.g. two people named Kemal), use context from the current conversation to determine which one is meant.
- Only reference people, events, or details present in your character description or excerpts above. Do not invent specific facts.
- 1–3 sentences. No stage directions, no parentheses, no quotation marks around your reply
- Never explain yourself or add commentary outside the reply itself
- Respond entirely in ${lang}`;
    console.log('[sim-prompt]', systemPrompt.slice(0, 3000));
    console.log('[sim-chardoc]', charDoc.slice(0, 200));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, system: systemPrompt, messages: history })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');
    res.json({ reply: data.content?.[0]?.text?.trim() || '' });
  } catch (e) {
    console.error('[simulate-reply]', e.message);
    res.status(500).json({ error: e.message });
  }
});

process.stdin.resume();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
