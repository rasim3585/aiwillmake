/* Unit tests for app_stats.js — pure Node, no deps, no secrets.
   Run: node stats_engine_test.js  (exit 0 = all pass) */
'use strict';
const ChatStats = require('./app_stats.js');

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log('  ✓', label); }
  else { fail++; console.log('  ✗', label, '| got:', JSON.stringify(got), '| want:', JSON.stringify(want)); }
}
function ok(label, cond) { cond ? (pass++, console.log('  ✓', label)) : (fail++, console.log('  ✗', label)); }

// ── 1. Parser: three export formats ─────────────────────────────────────
console.log('1) parser formats');
const trAndroid = `16.07.2026 22:41 - Ras: selam kanka
16.07.2026 22:43 - Burak: naber raşko ✌
devamı ikinci satır
16.07.2026 22:44 - Ras: <Medya dahil edilmedi>`;
let p = ChatStats.parse(trAndroid);
eq('TR android count', p.length, 3);
eq('continuation merged', p[1].text, 'naber raşko ✌\ndevamı ikinci satır');
ok('media flagged', p[2].isMedia === true);
ok('date parsed d.m.y', p[0].ts.getDate() === 16 && p[0].ts.getMonth() === 6);

const ios = `[16.07.2026 22:41:33] Ras: merhaba
[16.07.2026 22:45:10] Burak: hoş geldin`;
p = ChatStats.parse(ios);
eq('iOS bracket count', p.length, 2);
ok('iOS seconds ignored, minutes kept', p[1].ts.getMinutes() === 45);

const us = `7/16/26, 10:41 PM - Ras: hi there
7/16/26, 10:52 PM - Burak: hey!`;
p = ChatStats.parse(us);
eq('US count', p.length, 2);
ok('PM converted (22h)', p[0].ts.getHours() === 22);
ok('m/d disambiguated by >12 rule not needed but month=7', p[0].ts.getMonth() === 6);

// system lines (no "Sender: ") must be dropped
const withSystem = `16.07.2026 22:40 - Messages and calls are end-to-end encrypted.
16.07.2026 22:41 - Ras: gerçek mesaj`;
p = ChatStats.parse(withSystem);
eq('system line dropped', p.length, 1);

// ── 2. Metrics on a crafted chat with known answers ─────────────────────
console.log('2) metrics');
// Timeline (all 15.07.2026 unless noted). Ras: 4 msgs, Burak: 3 msgs.
// - 10:00 Ras starts (initiation #1 Ras)
// - 10:05 Burak replies (gap 5m → Burak reply sample 300000ms, day bucket)
// - 10:06 Ras replies (gap 1m → Ras reply 60000ms, day)
// - 10:30 Ras again (gap 24m same sender ≥10m → Ras doubleText)
// - 21:00 Burak (gap 10.5h: <12h → Burak reply sample (evening) AND ≥6h → initiation #1 Burak)
// - next day 09:00 Ras (gap 12h: ≥6h → initiation #2 Ras; NOT a reply — 12h hits the < cap)
// - next day 09:20 Burak (gap 20m → Burak reply, day)
const chat = [
  '15.07.2026 10:00 - Ras: günaydın kanka bugün plan ne',
  '15.07.2026 10:05 - Burak: kanka günaydın toplantım var',
  '15.07.2026 10:06 - Ras: tamam kanka sonra konuşalım',
  '15.07.2026 10:30 - Ras: unutma akşam maç var kanka',
  '15.07.2026 21:00 - Burak: maç 😂😂 tabii kanka oradayım',
  '16.07.2026 09:00 - Ras: kalktın mı kanka 😂',
  '16.07.2026 09:20 - Burak: kalktım kalktım kanka',
].join('\n');
const m = ChatStats.compute(ChatStats.parse(chat));
ok('ok=true', m.ok === true);
eq('total', m.totalMessages, 7);
eq('senders by volume', m.senders, ['Ras', 'Burak']);
eq('Ras count', m.perSender.Ras.count, 4);
eq('Burak count', m.perSender.Burak.count, 3);
eq('Ras share %', m.perSender.Ras.share, 57);
eq('initiations Ras', m.perSender.Ras.initiations, 2);
eq('initiations Burak (10.5h re-open counts)', m.perSender.Burak.initiations, 1);
eq('initiationShare Ras %', m.perSender.Ras.initiationShare, 67);
eq('Ras doubleTexts', m.perSender.Ras.doubleTexts, 1);
eq('Ras reply median ms', m.perSender.Ras.replyMedianMs, 60000);
// Burak replies: 300000 (10:05, day), 37800000 (21:00, evening — 10.5h), 1200000 (09:20, day)
eq('Burak reply median ms', m.perSender.Burak.replyMedianMs, 1200000);
eq('Burak evening median ms', m.perSender.Burak.replyMedianEveningMs, 37800000);
eq('Burak day median ms', m.perSender.Burak.replyMedianDayMs, Math.round((300000 + 1200000) / 2));
eq('record day', m.recordDays[0], { date: '2026-07-15', count: 5 });
ok('longest silence ≈ 0.5d broken by Ras', m.longestSilence.brokenBy === 'Ras' && m.longestSilence.days === 0.5);
// "kanka" said ≥5x by Ras? Ras: 4x (one per msg) → NOT shared (needs ≥5 both). Expect no shared 'kanka'.
ok('sharedWords respects ≥5 threshold', !m.sharedWords.some(w => w.value === 'kanka'));
eq('Burak top emoji', m.perSender.Burak.topEmojis[0], { value: '😂', count: 2 });
// heat: 15.07.2026 is a Wednesday → index 2; 10:00 msgs in bucket 1 (sabah)
ok('heat Wed morning ≥ 4', m.heat[2][1] >= 4);

// ── 3. Guards ────────────────────────────────────────────────────────────
console.log('3) guards');
ok('single sender → ok:false', ChatStats.compute(ChatStats.parse('16.07.2026 10:00 - Ras: selam')).ok === false);
ok('empty → ok:false', ChatStats.compute([]).ok === false);
// deleted messages excluded
const withDeleted = [
  '15.07.2026 10:00 - Ras: selam',
  '15.07.2026 10:01 - Burak: Bu mesaj silindi',
  '15.07.2026 10:02 - Burak: buradayım',
].join('\n');
eq('deleted excluded from totals', ChatStats.compute(ChatStats.parse(withDeleted)).totalMessages, 2);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
