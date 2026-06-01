(async () => {
  try {
    const fs = require('fs');
    const p = '.env';
    if (!fs.existsSync(p)) {
      console.error('.env not found');
      process.exit(1);
    }
    const s = fs.readFileSync(p, 'utf8');
    const m = s.match(/ANTHROPIC_API_KEY=(.*)/);
    if (!m) {
      console.error('ANTHROPIC_API_KEY not found in .env');
      process.exit(1);
    }
    const key = m[1].trim();
    console.log('Using API key starting with:', key.slice(0, 10));

    const prompt = 'Generate exactly 5 unique captions for: Smash burgers with a special smoky sauce and hand-cut fries.';
    const url = 'https://api.anthropic.com/v1/messages';
    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': key,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    console.log('Status', res.status, res.statusText);
    const txt = await res.text();
    console.log('Body length', txt.length);
    console.log('Body preview:', txt.slice(0,1000));
  } catch (e) {
    console.error('Error calling Anthropic:', e);
  }
})();
