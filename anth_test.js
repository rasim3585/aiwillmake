(async () => {
  try {
    const prompt = 'Test prompt for captions';
    const url = 'https://api.anthropic.com/v1/messages';
    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.ANTHROPIC_API_KEY,
        'Anthropic-Version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    console.log('Status', res.status, res.statusText);
    const txt = await res.text();
    console.log('Body length', txt.length);
    console.log('Preview:', txt.slice(0, 400));
  } catch (e) {
    console.error('Error calling Anthropic:', e);
  }
})();
