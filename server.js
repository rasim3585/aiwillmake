const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' }
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in environment. Please set it in .env.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/generate', limiter, async (req, res) => {
  console.log('API KEY CHECK:', process.env.ANTHROPIC_API_KEY ? 'LOADED' : 'MISSING');
  try {
    const { accountType, language, description, country } = req.body;
    
    let prompt = '';
    
    if (accountType === 'write') {
      const { platform, tone } = req.body;
      prompt = `Generate exactly 5 social media captions in ${language} for ${platform}. Tone: ${tone}. About: ${description}. Context: ${country}. Return only a numbered list, nothing else.`;
    } else if (accountType === 'health') {
      const { symptoms, duration, doctor } = req.body;
      prompt = `Sen bir tıbbi yazı asistanısın. Hastanın doktora söyleyeceği 5 farklı anamnez cümlesi veya paragrafı ${language} dilinde yaz. Birinci şahıs (ben...) kullan. Hashtag kullanma. Semptomlar: ${symptoms}, Süre: ${duration}, Doktor: ${doctor}, Ülke: ${country}. Sadece numaralı listeyi döndür, başka hiçbir şey yazma.`;
    } else if (accountType === 'official') {
      const { type, status } = req.body;
      prompt = `Sen bir hukuki yazı asistanısın. Kişinin avukata veya resmi makama sunacağı 5 farklı resmi metin taslağı ${language} dilinde yaz. Resmi dil kullan, hashtag kullanma. Belge Türü: ${type}, Durum: ${status}, Ülke: ${country}. Sadece numaralı listeyi döndür.`;
    } else if (accountType === 'career') {
      const { position, company, experience } = req.body;
      prompt = `Sen bir kariyer koçusun. Kişinin iş başvurusu için 5 farklı profesyonel metin taslağı ${language} dilinde yaz. Pozisyon: ${position}, Şirket: ${company}, Deneyim: ${experience}, Ülke: ${country}. Sadece numaralı listeyi döndür, başka hiçbir şey yazma.`;
    } else if (accountType === 'education') {
      const { program, school, motivation } = req.body;
      prompt = `Sen bir eğitim danışmanısın. Kişinin okul başvurusu için 5 farklı motivasyon mektubu taslağı ${language} dilinde yaz. Program: ${program}, Okul: ${school}, Motivasyon: ${motivation}, Ülke: ${country}. Sadece numaralı listeyi döndür, başka hiçbir şey yazma.`;
    } else {
      throw new Error('Invalid category');
    }
    
    console.log(`[${accountType}] Sending prompt to Anthropic API`);
    console.log(`[${accountType}] PROMPT:`, prompt);

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
      console.log(`[${accountType}] Attempt ${attempt} status:`, response.status);

      if (response.status === 429) {
        console.warn(`[${accountType}] Rate limited by Anthropic, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${RETRY_DELAY_MS}ms...`);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
      }
      break;
    }

    console.log(`[${accountType}] FULL RESPONSE:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} - ${data.error?.message || data.message || 'Unknown error'}`);
    }

    const text = data.content[0].text;
    console.log(`[${accountType}] RAW TEXT (${text.length} chars):`, text);

    const captions = text.split('\n')
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 5);

    console.log(`[${accountType}] PARSED CAPTIONS (${captions.length} items):`, captions);
    res.json({ captions });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

process.stdin.resume();
app.listen(3000, () => console.log('Server running on 3000'));
