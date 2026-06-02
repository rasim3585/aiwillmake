console.log('SERVER VERSION: 2.0 - NEW CODE');
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

async function incrementCredits(token, userId, current) {
  const body = { user_id: userId, credits_used: current + 1 };
  console.log('[credits] UPSERT body:', JSON.stringify(body));
  const res = await fetch(`${SUPABASE_REST}/user_credits`, {
    method: 'POST',
    headers: { ...sbHeaders(token), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log('[credits] UPSERT status:', res.status, '| body:', text || '(empty)');
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

    const requiredKeys = [
      ...categories.common_fields.map(f => f.key),
      ...subcategory.required_fields.map(f => f.key)
    ];
    const missing = requiredKeys.filter(key => !fields[key]?.trim());
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const situationLines = [...subcategory.required_fields, ...subcategory.optional_fields]
      .map(f => {
        const value = fields[f.key]?.trim();
        const cleanLabel = f.label.replace(/ \(opsiyonel\)| \(optional\)/gi, '');
        return value ? `${cleanLabel}: ${value}` : null;
      })
      .filter(Boolean)
      .join('\n');

    const systemPrompts = {
      Turkish: `Sen deneyimli bir ${category.name} / ${subcategory.name} yazarısın. Bir kullanıcı sana durumunu anlattı.

Görevin:
1. Kullanıcının durumunu analiz et, duygusal ve bağlamsal detayları belirle
2. Alakasız bilgileri görmezden gel
3. İnsan gibi hissettiren, özgün 6 farklı metin yaz
4. Her metin farklı bir yaklaşım kullansın (örn. doğrudan, dolaylı, duygusal, pratik, mizahi)
5. İsim verilmişse doğal şekilde kullan
6. Dilbilgisi kurallarına tam uy, özne-yüklem uyumuna dikkat et
7. Klişe ifadeler kullanma, kısa ve güçlü cümleler yaz
8. Türkiye / ${fields.country} kültür bağlamını yansıt

Kullanıcının durumu:
${situationLines}

ÖNEMLİ: Sadece düz metin döndür. Markdown, kalın yazı, başlık, yıldız işareti veya hashtag kullanma. Sadece numaralı liste:
1. [metin]
2. [metin]
...`,

      English: `You are an expert ${category.name} / ${subcategory.name} writer. A user has shared their situation with you.

Your job:
1. Analyze the situation and identify the key emotional/contextual details
2. Ignore irrelevant information
3. Write 6 distinct messages that feel human and authentic
4. Each message should have a different approach (e.g. direct, subtle, emotional, practical, humorous)
5. Use the person's name if provided
6. Use proper grammar and punctuation throughout
7. Avoid clichés — write concise, powerful sentences that feel genuine
8. Reflect ${fields.country} cultural context where appropriate

User's situation:
${situationLines}

IMPORTANT: Return only plain text. No markdown, no bold, no headers, no asterisks, no hashtags. Just numbered plain text:
1. [message]
2. [message]
...`,

      Arabic: `أنت كاتب محترف متخصص في ${category.name} / ${subcategory.name}. شارك معك المستخدم وضعه.

مهمتك:
1. حلّل الوضع وحدّد التفاصيل العاطفية والسياقية المهمة
2. تجاهل المعلومات غير ذات الصلة
3. اكتب 6 رسائل مختلفة تبدو إنسانية وأصيلة
4. لكل رسالة أسلوب مختلف (مثل: مباشر، دبلوماسي، عاطفي، عملي، خفيف الظل)
5. استخدم الاسم بشكل طبيعي إن وُجد
6. التزم بقواعد النحو والإملاء العربي الصحيح
7. تجنب العبارات المبتذلة، واكتب جملاً موجزة وقوية
8. راعِ السياق الثقافي لـ${fields.country}

وضع المستخدم:
${situationLines}

مهم: أعد نصاً عادياً فقط. لا تستخدم markdown أو خطاً عريضاً أو عناوين أو نجوماً أو هاشتاغ. فقط قائمة مرقّمة:
1. [الرسالة]
2. [الرسالة]
...`,

      German: `Du bist ein erfahrener ${category.name} / ${subcategory.name} Texter. Ein Nutzer hat dir seine Situation geschildert.

Deine Aufgabe:
1. Analysiere die Situation und identifiziere die emotionalen und kontextuellen Details
2. Ignoriere irrelevante Informationen
3. Schreibe 6 verschiedene Texte, die menschlich und authentisch wirken
4. Jeder Text soll einen anderen Ansatz haben (z. B. direkt, subtil, emotional, sachlich, humorvoll)
5. Verwende den Namen natürlich, falls angegeben
6. Achte auf korrekte Grammatik und Rechtschreibung
7. Vermeide Klischees — schreibe prägnante, kraftvolle Sätze
8. Berücksichtige den kulturellen Kontext von ${fields.country}

Situation des Nutzers:
${situationLines}

WICHTIG: Gib nur einfachen Text zurück. Kein Markdown, keine Fettschrift, keine Überschriften, keine Sternchen, keine Hashtags. Nur nummerierte Liste:
1. [Text]
2. [Text]
...`,

      French: `Tu es un expert en rédaction ${category.name} / ${subcategory.name}. Un utilisateur t'a partagé sa situation.

Ta mission :
1. Analyser la situation et identifier les détails émotionnels et contextuels clés
2. Ignorer les informations non pertinentes
3. Rédiger 6 messages distincts qui semblent humains et authentiques
4. Chaque message doit avoir une approche différente (ex. direct, subtil, émotionnel, pratique, humoristique)
5. Utiliser le prénom naturellement s'il est fourni
6. Respecter les règles grammaticales et orthographiques du français
7. Éviter les clichés — écrire des phrases courtes et percutantes
8. Tenir compte du contexte culturel de ${fields.country}

Situation de l'utilisateur :
${situationLines}

IMPORTANT : Retourner uniquement du texte brut. Pas de markdown, pas de gras, pas de titres, pas d'astérisques, pas de hashtags. Juste une liste numérotée :
1. [message]
2. [message]
...`,

      Spanish: `Eres un experto en redacción de ${category.name} / ${subcategory.name}. Un usuario te ha compartido su situación.

Tu tarea:
1. Analizar la situación e identificar los detalles emocionales y contextuales clave
2. Ignorar información irrelevante
3. Escribir 6 mensajes distintos que se sientan humanos y auténticos
4. Cada mensaje debe tener un enfoque diferente (ej. directo, sutil, emocional, práctico, humorístico)
5. Usar el nombre de forma natural si se proporciona
6. Respetar las reglas gramaticales y ortográficas del español
7. Evitar clichés — escribir frases cortas y poderosas
8. Considerar el contexto cultural de ${fields.country}

Situación del usuario:
${situationLines}

IMPORTANTE: Devuelve solo texto plano. Sin markdown, sin negrita, sin títulos, sin asteriscos, sin hashtags. Solo lista numerada:
1. [mensaje]
2. [mensaje]
...`,

      Italian: `Sei un esperto redattore di ${category.name} / ${subcategory.name}. Un utente ti ha condiviso la sua situazione.

Il tuo compito:
1. Analizzare la situazione e identificare i dettagli emotivi e contestuali chiave
2. Ignorare le informazioni irrilevanti
3. Scrivere 6 messaggi distinti che sembrino umani e autentici
4. Ogni messaggio deve avere un approccio diverso (es. diretto, sottile, emotivo, pratico, umoristico)
5. Usare il nome in modo naturale se fornito
6. Rispettare le regole grammaticali e ortografiche dell'italiano
7. Evitare i cliché — scrivere frasi brevi e incisive
8. Considerare il contesto culturale di ${fields.country}

Situazione dell'utente:
${situationLines}

IMPORTANTE: Restituisci solo testo normale. Niente markdown, grassetto, intestazioni, asterischi o hashtag. Solo lista numerata:
1. [messaggio]
2. [messaggio]
...`
    };

    const basePrompt = systemPrompts[fields.language] || systemPrompts['English'];
    const prompt = modifier ? `${basePrompt}\n\n${modifier}` : basePrompt;

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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: categoryId === 'official_legal' ? 5120 : 1280,
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

    let captions;

    if (categoryId === 'official_legal') {
      const rawBlocks = ('\n' + text).split(/\n\d+[\.\)]\s*/);
      captions = rawBlocks.slice(1)
        .map(block => {
          const trimmed = block.trim();
          if (trimmed.length < 20) return null;
          const lines = trimmed.split('\n');
          const firstLine = lines[0].trim();
          const isTitle = firstLine.length < 60
            && !firstLine.startsWith('Sayın')
            && !firstLine.startsWith('Dear')
            && !/^Konu:/i.test(firstLine)
            && lines.length > 1;
          if (isTitle) {
            return { badge: clean(firstLine), text: clean(lines.slice(1).join('\n').trim()) };
          }
          return { badge: null, text: clean(trimmed) };
        })
        .filter(Boolean)
        .slice(0, 6);
    } else {
      captions = text.split('\n')
        .map(l => clean(l).replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(l => l.length > 5)
        .slice(0, 6);
    }

    if (req.user) {
      console.log('[generate] incrementing credits for user:', req.user.id, 'from', creditsUsed, 'to', creditsUsed + 1);
      await incrementCredits(req.token, req.user.id, creditsUsed);
    }

    res.json({ captions, credits_used: req.user ? creditsUsed + 1 : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

process.stdin.resume();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
