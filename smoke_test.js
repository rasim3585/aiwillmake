// No-AI smoke test: run after every deploy. Works with a dead or live AI key.
// Usage: node smoke_test.js [baseUrl]   (default https://www.aiwillmake.com)
const BASE = (process.argv[2] || 'https://www.aiwillmake.com').replace(/\/$/, '');
let pass = 0, fail = 0;
const check = (name, ok, info) => { (ok ? pass++ : fail++); console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info && !ok ? '  → ' + info : '')); };
const get = async (p) => { const r = await fetch(BASE + p, { redirect: 'manual' }); return { status: r.status, text: await r.text().catch(() => '') }; };
const post = async (p, body) => { const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => ({})) }; };

(async () => {
  console.log('smoke test →', BASE);
  // pages
  for (const [p, needle] of [['/', 'Say the things you never said'], ['/app.html', 'qdForm'], ['/guides', 'Guides'], ['/guides/letter-to-someone-who-died', 'FAQPage'],
    ['/guides/save-text-messages-from-someone-who-died', 'Voicemails'], ['/aydinlatma-metni', 'Aydınlatma'], ['/terms.html', 'Terms'],
    ['/privacy.html', 'Privacy'], ['/sitemap.xml', '/guides/'], ['/og-image.png', '']]) {
    const r = await get(p);
    check('GET ' + p, r.status === 200 && (!needle || r.text.includes(needle)), r.status);
  }
  // static lock-down: source files must never be served
  for (const [p, code] of [['/whatsapp-sohbet-analizi', 301], ['/sohbet-analizi.html', 301], ['/rehber/zam-isteme-konusmasi', 301], ['/rehber', 301], ['/rehber/kaybettigin-birine-mektup', 301]]) {
    const r = await get(p);
    check('retired ' + p + ' → ' + code, r.status === code, r.status);
  }
  for (const p of ['/server.js', '/guides.js', '/package.json', '/.env', '/e2e_test.js', '/guides/does-not-exist']) {
    const r = await get(p);
    check('blocked ' + p, r.status === 404, r.status);
  }
  // health + config
  const h = await get('/health'); check('/health', h.status === 200, h.status);
  const cfg = await get('/api/config'); let c = {}; try { c = JSON.parse(cfg.text); } catch (_) {}
  check('/api/config has ai flag', typeof c.ai === 'boolean', cfg.text.slice(0, 80));
  console.log('    (AI available: ' + c.ai + ', paywall: ' + c.paywall + ')');
  // analytics accepts whitelisted events
  const ev = await post('/api/e', { e: 'guide_view', p: { g: 'smoke' }, sid: 'smoke' });
  check('/api/e accepts events', ev.status === 200, ev.status);
  // safety + guest limits (no model call needed)
  const crisis = await post('/api/simulate-reply', { character: { name: 'Dede', contact_status: 'unreachable' }, history: [{ role: 'user', content: 'artık yaşamak istemiyorum' }], language: 'Turkish' });
  check('crisis line intercepted before the model (TR)', crisis.status === 200 && crisis.json.safety === true, JSON.stringify(crisis.json).slice(0, 80));
  const crisisEn = await post('/api/simulate-reply', { character: { name: 'Mom' }, history: [{ role: 'user', content: 'I just want to be with you again' }], language: 'English' });
  check('crisis line intercepted (EN) with 988', crisisEn.status === 200 && crisisEn.json.safety === true && /988/.test(crisisEn.json.reply || ''), JSON.stringify(crisisEn.json).slice(0, 80));
  const crisisTrUi = await post('/api/simulate-reply', { character: { name: 'Annem' }, history: [{ role: 'user', content: 'artık yaşamak istemiyorum' }], language: 'English' });
  check('crisis reply in Turkish when user writes Turkish (EN site)', crisisTrUi.json.safety === true && /112/.test(crisisTrUi.json.reply || ''), JSON.stringify(crisisTrUi.json).slice(0, 80));
  const hist = []; for (let i = 1; i <= 11; i++) { hist.push({ role: 'user', content: 'mesaj ' + i }); if (i < 11) hist.push({ role: 'assistant', content: 'cevap ' + i }); }
  const cap = await post('/api/simulate-reply', { character: { name: 'A' }, history: hist, language: 'Turkish' });
  check('guest message cap → 401 signin_required', cap.status === 401 && cap.json.error === 'signin_required', cap.status);
  const dt = await post('/api/describe-twin', { name: 'X', answers: [{ key: 'hitap', q: 'h', a: 'kızım' }] });
  check('describe-twin open to guests (not 401)', dt.status !== 401, dt.status);
  if (c.ai) check('describe-twin works when AI is up', dt.status === 200 && !!dt.json.character_profile, dt.status);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('smoke test crashed:', e.message); process.exit(2); });
