const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const categories = require('./categories.json');

const app = express();

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

app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.post('/api/generate', limiter, async (req, res) => {
  try {
    const { categoryId, subcategoryId, fields } = req.body;

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

    const prompt = `You are an expert ${category.name} / ${subcategory.name} writer. A user has shared their situation with you.

Your job:
1. Analyze the situation and identify the key emotional/contextual details
2. Ignore irrelevant information
3. Write 5 distinct messages that feel human and authentic
4. Each message should have a different approach (e.g. direct, subtle, emotional, practical, humorous)
5. Use the person's name if provided
6. Write in ${fields.language}, considering ${fields.country} cultural context

User's situation:
${situationLines}

IMPORTANT: Return only plain text messages. No markdown, no bold, no headers, no asterisks, no hashtags. Just numbered plain text like:
1. [message]
2. [message]
...`;

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
          max_tokens: 1024,
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
    const captions = text.split('\n')
      .map(l => l
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/#+\s?/g, '')
        .replace(/\*/g, '')
        .trim()
      )
      .filter(l => l.length > 5)
      .slice(0, 5);

    res.json({ captions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

process.stdin.resume();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
