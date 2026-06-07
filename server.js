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
app.use(express.json());
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
  if (!supabase) return next();
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
  console.log('[credits] GET', url);
  const res = await fetch(url, { headers: sbHeaders(token) });
  console.log('[credits] GET status:', res.status);
  const rows = await res.json();
  console.log('[credits] GET rows:', JSON.stringify(rows));
  return Array.isArray(rows) ? (rows[0]?.credits_used ?? 0) : 0;
}

async function incrementCredits(token, userId) {
  console.log('[credits] increment start — userId:', userId);
  try {
    // Step 1: SELECT current value
    const getUrl = `${SUPABASE_REST}/user_credits?user_id=eq.${userId}&select=credits_used`;
    const getRes = await fetch(getUrl, { headers: sbHeaders(token) });
    const rows = await getRes.json();
    console.log('[credits] SELECT rows:', JSON.stringify(rows));

    if (!Array.isArray(rows) || rows.length === 0) {
      // Step 2: No row — INSERT with credits_used = 1
      console.log('[credits] no existing row — INSERT credits_used=1');
      const insRes = await fetch(`${SUPABASE_REST}/user_credits`, {
        method: 'POST',
        headers: sbHeaders(token),
        body: JSON.stringify({ user_id: userId, credits_used: 1 })
      });
      const insText = await insRes.text();
      console.log('[credits] INSERT status:', insRes.status, '| body:', insText || '(empty)');
      if (insRes.status >= 400) console.error('[credits] INSERT FAILED:', insText);
      else console.log('[credits] INSERT SUCCESS — credits_used now: 1');
    } else {
      // Step 3: Row exists — UPDATE credits_used + 1
      const current = rows[0]?.credits_used ?? 0;
      const next = current + 1;
      console.log('[credits] existing row — current:', current, '→ UPDATE to', next);
      const updRes = await fetch(`${SUPABASE_REST}/user_credits?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: sbHeaders(token),
        body: JSON.stringify({ credits_used: next })
      });
      const updText = await updRes.text();
      console.log('[credits] UPDATE status:', updRes.status, '| body:', updText || '(empty)');
      if (updRes.status >= 400) console.error('[credits] UPDATE FAILED:', updText);
      else console.log('[credits] UPDATE SUCCESS — credits_used now:', next);
    }
  } catch (e) {
    console.error('[credits] increment EXCEPTION:', e.message);
  }
}

app.get('/api/credits', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  console.log('[/api/credits] token present:', !!token, '| supabase:', !!supabase);
  if (!supabase || !token) return res.json({ credits_used: 0, limit: 5, guest: !token });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('[/api/credits] user:', user?.id, '| error:', error?.message);
    if (!user) return res.json({ credits_used: 0, limit: 5, guest: true });
    const credits_used = await getCredits(token, user.id);
    console.log('[/api/credits] returning credits_used:', credits_used);
    res.json({ credits_used, limit: 5, guest: false });
  } catch (e) {
    console.error('[/api/credits] catch:', e.message);
    res.json({ credits_used: 0, limit: 5, guest: true });
  }
});

app.post('/api/generate', optionalAuth, limiter, async (req, res) => {
  try {
    const { categoryId, subcategoryId, fields, variation } = req.body;
    const variationPrompts = {
      different: 'Generate 6 NEW outputs that are DIFFERENT from a previous attempt. Use different sentence structures, vocabulary and emotional angles.',
      completely_new: 'IGNORE everything about the previous outputs. Use a completely different tone, style and creative approach. Be bold and unexpected.'
    };
    const modifier = variationPrompts[variation] || null;

    let creditsUsed = 0;
    if (req.user) {
      console.log('[generate] auth user:', req.user.id);
      creditsUsed = await getCredits(req.token, req.user.id);
      console.log('[generate] creditsUsed:', creditsUsed);
      if (creditsUsed >= 5) {
        console.log('[generate] limit reached, blocking');
        return res.status(403).json({ error: 'Free limit reached', credits_used: creditsUsed });
      }
    } else {
      console.log('[generate] no auth user (guest)');
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
Rules: use specific details provided, no clichés, each message sounds like a real human, plain numbered text only, write in ${language}. If country context is relevant to format or formality, apply it subtly. Never make broad cultural generalizations or claim cultural authority. IMPORTANT: Never ask the user for more information. Never output questions. Always generate the 6 messages directly using whatever information is provided. If some context is missing, make reasonable assumptions and still write the messages.`;

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

    console.log(`[${categoryId}/${subcategoryId}] Prompt:`, prompt);

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

    console.log(`[parse] raw text length=${text.length} | blocks found=${('\n'+text).split(/\n\d+[\.\)]\s*/).length - 1}`);
    console.log(`[parse] text preview: ${text.slice(0, 300).replace(/\n/g,'\\n')}`);

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
        } else {
          console.log(`[parse] block #${blockIdx} OK | WHY=${why?.slice(0,40)} | BARRIER=${reply_barrier}`);
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

    if (req.user) {
      console.log('[generate] incrementing credits for user:', req.user.id);
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
    if (!valid[result.categoryId]?.includes(result.subcategoryId)) {
      throw new Error('AI returned an invalid category/subcategory pair');
    }

    console.log('[detect-category] result:', JSON.stringify(result));
    res.json(result);
  } catch (e) {
    console.error('[detect-category] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze-reply', limiter, async (req, res) => {
  try {
    const { reply, categoryId, situation, language } = req.body;
    if (!reply?.trim()) return res.status(400).json({ error: 'reply is required' });

    const lang = language || 'English';
    const systemPrompt = `You are a communication analyst. Analyze the reply someone received and extract signals. Return ONLY this exact format:
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

    const userPrompt = `Category: ${categoryId || 'general'}
Situation: ${situation || 'Not provided'}
Reply to analyze: ${reply}`;

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

    res.json({
      interest_level:      extract('INTEREST_LEVEL'),
      emotional_warmth:    extract('EMOTIONAL_WARMTH'),
      openness:            extract('OPENNESS'),
      tone:                extract('TONE'),
      hidden_signal:       extract('HIDDEN_SIGNAL'),
      what_they_said:      extract('WHAT_THEY_SAID'),
      what_they_might_mean: extract('WHAT_THEY_MIGHT_MEAN'),
      risk:                extract('RISK'),
      suggested_move:      extract('SUGGESTED_MOVE'),
      reply_timing:        extract('REPLY_TIMING'),
      reply_timing_reason: extract('REPLY_TIMING_REASON')
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
    console.log('[disengagement-check] answer:', answer, '| text snippet:', text.slice(0, 60));
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
    if (!req.user) return res.status(403).json({ error: 'Sign in required to use this feature.' });
    const { categoryId, situation, originalMessage, theirReply, language } = req.body;
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

Rules: Be specific to their actual reply. No generic responses. Write in ${lang}.`;

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

    console.log('[next-reply] options:', options.length);
    res.json({ options });
  } catch (e) {
    console.error('[next-reply]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/likely-responses', limiter, async (req, res) => {
  try {
    const { categoryId, situation, selectedMessage, language } = req.body;
    if (!selectedMessage?.trim()) return res.status(400).json({ error: 'selectedMessage is required' });

    const lang = language || 'English';
    const systemPrompt = `Based on this message being sent, predict 5 most likely responses the recipient might give. Be realistic and varied — include both positive and negative possibilities. Write in ${lang}.

Format exactly (no extra text):
RESPONSE_1_TYPE: [one word: e.g. Warm, Curious, Neutral, Brief, Cold, Positive, Hesitant, Enthusiastic, Distant, Confused]
RESPONSE_1_EXAMPLE: [one short realistic example reply, 1-2 sentences max]

RESPONSE_2_TYPE: ...
RESPONSE_2_EXAMPLE: ...

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
      type:    extract(`RESPONSE_${n}_TYPE`),
      example: extract(`RESPONSE_${n}_EXAMPLE`)
    })).filter(r => r.type && r.example);

    console.log('[likely-responses] count:', responses.length);
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
    console.log('[next-steps] scenarios:', scenarios.length, '| timing:', !!timing);
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

    console.log('[review-message] tone:', extract('TONE'), '| risk:', extract('RISK_LEVEL'));
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

app.post('/api/analyze-conversation', limiter, async (req, res) => {
  try {
    const { conversationText, language } = req.body;
    if (!conversationText?.trim()) return res.status(400).json({ error: 'conversationText is required' });

    const lang = language || 'English';
    // Use the last 8000 chars — most recent messages are most relevant
    const snippet = conversationText.length > 8000
      ? conversationText.slice(-8000)
      : conversationText;

    const systemPrompt = `Analyze this exported chat conversation. Extract:
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
RECOMMENDED_NEXT: [what to do next based on the conversation — one sentence]
BIGGEST_RISK: [main risk in this relationship dynamic — one sentence]

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Language context: ${lang}\n\nConversation:\n${snippet}` }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.content[0].text;
    const extract = key => {
      const m = text.match(new RegExp(`^${key}:\\s*(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    console.log('[analyze-conversation] done | interest:', extract('INTEREST_LEVEL'));
    res.json({
      person_a:          extract('PERSON_A'),
      person_b:          extract('PERSON_B'),
      total_messages:    extract('TOTAL_MESSAGES'),
      person_a_messages: extract('PERSON_A_MESSAGES'),
      person_b_messages: extract('PERSON_B_MESSAGES'),
      power_balance:     extract('POWER_BALANCE'),
      interest_level:    extract('INTEREST_LEVEL'),
      emotional_tone:    extract('EMOTIONAL_TONE'),
      key_moment:        extract('KEY_MOMENT'),
      last_message_by:   extract('LAST_MESSAGE_BY'),
      days_since_last:   extract('DAYS_SINCE_LAST'),
      recommended_next:  extract('RECOMMENDED_NEXT'),
      biggest_risk:      extract('BIGGEST_RISK')
    });
  } catch (e) {
    console.error('[analyze-conversation]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Conversations ──────────────────────────────────────────────
app.post('/api/conversations', requireAuth, async (req, res) => {
  try {
    const { categoryId, subcategoryId, situation, fields } = req.body;
    const r = await fetch(`${SUPABASE_REST}/conversations`, {
      method: 'POST',
      headers: { ...sbHeaders(req.token), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: req.user.id,
        category_id: categoryId || '',
        subcategory_id: subcategoryId || '',
        situation: (situation || '').slice(0, 600),
        fields: fields || null
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.json(Array.isArray(data) ? data[0] : data);
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
    const r = await fetch(`${SUPABASE_REST}/conversations?user_id=eq.${req.user.id}&order=updated_at.desc&select=id,category_id,subcategory_id,situation,created_at,updated_at,conversation_messages(id,role,content,outcome)`, {
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
      `${SUPABASE_REST}/conversations?id=eq.${req.params.id}&user_id=eq.${req.user.id}&select=id,category_id,subcategory_id,situation,fields,created_at,conversation_messages(id,role,content,strategy,created_at,outcome)`,
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
    console.log('[outcome PATCH] msgId:', req.params.msgId, '| outcome:', outcome);
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    console.error('[outcome PATCH]', e.message);
    res.status(500).json({ error: e.message });
  }
});

process.stdin.resume();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
