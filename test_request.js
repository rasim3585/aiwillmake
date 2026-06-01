(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountType: 'restaurant',
        platform: 'instagram',
        tone: 'energetic',
        language: 'english',
        description: 'Smash burgers with a special smoky sauce and hand-cut fries.'
      })
    });

    const text = await res.text();
    console.log('HTTP', res.status);
    console.log(text);
  } catch (e) {
    console.error('Request error:', e);
  }
})();
