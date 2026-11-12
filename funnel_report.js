// Funnel report from app_events (aggregates only — never reads chat content).
// Usage: node -r dotenv/config funnel_report.js [days=14]
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in .env.
const days = parseInt(process.argv[2] || '14', 10);
const BASE = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) { console.error('Missing SUPABASE_URL / service key'); process.exit(1); }
const since = new Date(Date.now() - days * 86400e3).toISOString();

const STEPS = [
  ['landing_view', 'Landing'], ['wrapped_view', 'Stats page'], ['guide_view', 'Guide'],
  ['wrapped_done', 'Stats computed'], ['wrapped_share', 'Stats shared'], ['wrapped_bridge', 'Stats → twin'],
  ['app_view', 'App opened'], ['describe_start', 'Describe started'], ['describe_done', 'Twin built'],
  ['twin_first_reply', 'Twin spoke'], ['practice_first_msg', 'User replied'], ['twin_feedback', 'Rated likeness'],
  ['guest_save_click', 'Save clicked'], ['signin_done', 'Signed in'], ['guest_twin_saved', 'Guest twin saved'],
  ['letter_sent', 'Letter sent'], ['import_file_selected', 'Chat file picked'],
];

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${BASE}/rest/v1/app_events?select=event,props,sid,ts&ts=gte.${since}&order=ts.asc`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: `${from}-${from + 999}` } });
    if (!r.ok) { console.error('query failed', r.status, await r.text()); process.exit(1); }
    const page = await r.json(); rows.push(...page); if (page.length < 1000) break;
  }
  const visitorOf = e => (e.props && e.props.did) || ('sid:' + e.sid);
  const byStep = {}, bySrc = {};
  for (const e of rows) {
    (byStep[e.event] = byStep[e.event] || new Set()).add(visitorOf(e));
    const src = (e.props && e.props.src) || 'unknown';
    const s = (bySrc[src] = bySrc[src] || { visitors: new Set(), twin: new Set(), stats: new Set() });
    s.visitors.add(visitorOf(e));
    if (e.event === 'twin_first_reply') s.twin.add(visitorOf(e));
    if (e.event === 'wrapped_done') s.stats.add(visitorOf(e));
  }
  console.log(`\nFunnel — last ${days} days (${rows.length} events, unique visitors by device id)\n`);
  for (const [ev, label] of STEPS) console.log('  ' + label.padEnd(20) + String((byStep[ev] || new Set()).size).padStart(6));
  console.log('\nBy first-touch source (visitors / used stats / heard the twin):\n');
  Object.entries(bySrc).sort((a, b) => b[1].visitors.size - a[1].visitors.size).slice(0, 15)
    .forEach(([src, s]) => console.log('  ' + src.slice(0, 32).padEnd(34) + String(s.visitors.size).padStart(5) + String(s.stats.size).padStart(6) + String(s.twin.size).padStart(6)));
  const fb = rows.filter(e => e.event === 'twin_feedback');
  if (fb.length) console.log(`\nLikeness feedback: ${fb.filter(e => e.props?.v === 'up').length} 👍 / ${fb.filter(e => e.props?.v === 'fix').length} ✏️`);
  const back = rows.filter(e => (e.event === 'landing_view' || e.event === 'app_view') && e.props && e.props.back >= 1);
  console.log(`Returning visits (came back after ≥1 day): ${new Set(back.map(visitorOf)).size}`);
})();
