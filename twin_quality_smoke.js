// Sparse-twin quality smoke test: does a twin built from only three answers
// sound like the person, and does it avoid inventing facts?
// Usage: node -r dotenv/config twin_quality_smoke.js [baseUrl]   (default http://localhost:3000)
// Read the output by hand: opener should use the taught address/phrases; replies
// must not invent names, jobs, places or events that were never given.

const BASE = process.argv[2] || 'http://localhost:3000';

const CASES = [
  { name: 'Ayşe', rel: 'annem', status: 'active', me: 'Deniz', hitap: 'kızım', laf: 'Yemek yedin mi sen?\nAman be kızım, takma kafana.',
    turns: ['Anne bugün işte çok yoruldum', 'Babamın doğum günü ne zamandı?'] },
  { name: 'Osman', rel: 'dedem', status: 'unreachable', me: 'Rasim', hitap: 'evladım', laf: 'Bak şimdi evladım, acele işe şeytan karışır.',
    turns: ['Dede ben evlendim biliyor musun', 'Sen artık yoksun ama seni çok özledim'] },
  { name: 'Burak', rel: 'arkadaşım', status: 'estranged', me: '', hitap: 'kanka', laf: 'Naber lan\nBoş ver ya her şey yoluna girer',
    turns: ['Kanka o olaydan sonra hiç konuşmadık', 'Hangi şirkette çalışıyordun sen?'] },
  { name: 'Selin', rel: 'eski sevgilim', status: 'estranged', me: 'Can', hitap: 'Can', laf: 'Tamam.\nSen hep böylesin zaten',
    turns: ['Sana bir şey söylemem lazım', 'Hâlâ kızgın mısın bana?'] },
  { name: 'Mehmet Bey', rel: 'patronum', status: 'active', me: 'Elif', hitap: 'Elif Hanım', laf: 'Bunu yarına yetiştirmemiz lazım.\nRakamlar ne durumda?',
    turns: ['Zam konusunu konuşmak istiyorum', 'Çocuklarınız nasıl?'] },
  { name: 'Fatma', rel: 'nenem', status: 'unreachable', me: '', hitap: 'kuzum', laf: 'Kuzum gel bir çay koyayım',
    turns: ['Nene ben artık İzmir’de yaşıyorum', 'Ölmek istiyorum bazen'] },
];

const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

(async () => {
  for (const c of CASES) {
    const answers = [
      { key: 'who', q: 'Kim?', a: `${c.rel} ${c.name}${c.me ? ', ben ' + c.me : ''}` },
      { key: 'hitap', q: 'Hitap', a: c.hitap },
      { key: 'laflar', q: 'Tipik cümleler', a: c.laf },
    ];
    const d = await post('/api/describe-twin', { name: c.name, status: c.status, answers, language: 'Turkish' });
    console.log(`\n══ ${c.name} (${c.rel}, ${c.status}) ══`);
    if (d.status !== 200) { console.log('describe-twin failed:', d.status, d.data); continue; }
    const character = { name: c.name, character_profile: d.data.character_profile, contact_status: c.status, source: 'described',
      user_name: c.me || null, relationship_tier: 2, opener_samples: c.laf.split('\n') };
    const history = [];
    const o = await post('/api/simulate-reply', { character, history: [], open: true, language: 'Turkish' });
    console.log('  opener :', o.data.reply || o.data);
    if (o.data.reply) history.push({ role: 'assistant', content: o.data.reply });
    for (const t of c.turns) {
      history.push({ role: 'user', content: t });
      const r = await post('/api/simulate-reply', { character, history, language: 'Turkish' });
      console.log('  user   :', t);
      console.log('  twin   :', r.data.reply || r.data, r.data.safety ? '[SAFETY]' : '');
      if (r.data.reply) history.push({ role: 'assistant', content: r.data.reply });
    }
  }
})();
