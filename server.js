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

    let prompt = subcategory.prompt_template;

    for (const field of [...categories.common_fields, ...subcategory.required_fields]) {
      prompt = prompt.split(`{{${field.key}}}`).join(fields[field.key] || '');
    }

    for (const field of subcategory.optional_fields) {
      const value = fields[field.key]?.trim() || '';
      const cleanLabel = field.label.replace(/ \(opsiyonel\)| \(optional\)/gi, '');
      const replacement = value ? `${cleanLabel}: ${value}. ` : '';
      prompt = prompt.split(`{{${field.key}}}`).join(replacement);
    }

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
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
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
