/* ═══════════════════════════════════════════════════════════════════════
   app_stats.js — client-side WhatsApp chat statistics engine.
   Parses a raw WhatsApp export and computes every deterministic metric the
   reveal-screen cards need — on the device, before/while the AI analysis
   runs. No network, no AI, ~milliseconds even for large chats.

   window.ChatStats.parse(rawText)      -> [{ts, sender, text, isMedia, isDeleted}]
   window.ChatStats.compute(messages)   -> metrics object (see bottom)

   Also loadable in Node (module.exports) for unit tests: stats_engine_test.js.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── Parsing ────────────────────────────────────────────────────────────
  // WhatsApp export line formats across locales/platforms:
  //   TR/EU Android : "16.07.2026 22:41 - Burak: mesaj"
  //   iOS           : "[16.07.2026 22:41:33] Burak: mesaj"
  //   US            : "7/16/26, 10:41 PM - Burak: msg"
  //   Some locales  : "2026-07-16 22:41 - Burak: msg"
  // Continuation lines (no timestamp) belong to the previous message.
  var LINE_RE = new RegExp(
    '^\\[?' +
    '(\\d{1,4})[./-](\\d{1,2})[./-](\\d{2,4})' +      // date: d.m.y | m/d/y | y-m-d
    '[,\\s]+' +
    '(\\d{1,2}):(\\d{2})(?::\\d{2})?' +                // time h:mm[:ss]
    '\\s*([AaPp][Mm])?' +                              // optional AM/PM
    '\\]?\\s*[-–—]?\\s*' +
    '([^:]{1,64}):\\s' +                               // sender (no colon), then ": "
    '([\\s\\S]*)$'                                     // first text chunk
  );

  var MEDIA_RE = /^<?\s*(media omitted|medya dahil edilmedi|görüntü dahil edilmedi|image omitted|video omitted|audio omitted|voice message omitted|sticker omitted|gif omitted|document omitted|belge dahil edilmedi|çıkartma dahil edilmedi|ses dahil edilmedi|video dahil edilmedi|resim dahil edilmedi)\s*>?$/i;
  var DELETED_RE = /^(this message was deleted|you deleted this message|bu mesaj silindi|bu mesajı sildiniz)\.?$/i;
  var EDITED_SUFFIX_RE = /\s*<this message was edited>\s*$|\s*<bu mesaj düzenlendi>\s*$/i;

  function buildDate(a, b, c, hh, mm, ampm) {
    a = parseInt(a, 10); b = parseInt(b, 10); c = parseInt(c, 10);
    var day, month, year;
    if (a >= 1000) { year = a; month = b; day = c; }            // y-m-d
    else {
      year = c < 100 ? 2000 + c : c;
      if (a > 12) { day = a; month = b; }                        // d.m.y (day>12 disambiguates)
      else if (b > 12) { month = a; day = b; }                   // m/d/y
      else { day = a; month = b; }                               // ambiguous → assume d.m.y (TR/EU default)
    }
    var h = parseInt(hh, 10);
    if (ampm) { var pm = /p/i.test(ampm); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    var d = new Date(year, month - 1, day, h, parseInt(mm, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function parse(rawText) {
    var messages = [];
    var lines = String(rawText || '').split(/\r?\n/);
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = LINE_RE.exec(line);
      if (m) {
        var ts = buildDate(m[1], m[2], m[3], m[4], m[5], m[6]);
        if (!ts) { if (cur) cur.text += '\n' + line; continue; }
        var text = (m[8] || '').replace(EDITED_SUFFIX_RE, '').trim();
        cur = {
          ts: ts,
          sender: m[7].trim(),
          text: text,
          isMedia: MEDIA_RE.test(text),
          isDeleted: DELETED_RE.test(text)
        };
        messages.push(cur);
      } else if (cur && line.trim()) {
        cur.text += '\n' + line.trim();                          // continuation line
      }
      // lines before the first timestamp (system header) are dropped
    }
    return messages;
  }

  // ── Metrics ────────────────────────────────────────────────────────────
  var STOPWORDS = {};
  ('ve veya ama ki de da bir bu şu o ben sen biz siz onlar ne mi mı mu mü değil için gibi daha çok az en ya hem ile sadece yani zaten çünkü ancak eğer diye kadar sonra önce şey evet hayır tamam ok okey peki ise bana sana bende sende beni seni benim senin bizim sizin onun var yok olan oldu olur oluyor olarak the a an and or but if of to in on at for with is are was were be been it its this that i you he she we they not no yes do does did will would can could my your me him her them so just too very').split(' ')
    .forEach(function (w) { STOPWORDS[w] = 1; });

  var EMOJI_RE = /\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/gu;

  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }
  function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var GAP_NEW_CONVO_MS = 6 * 3600e3;   // ≥6h silence → next message "initiates" a conversation
  var GAP_REPLY_CAP_MS = 12 * 3600e3;  // sender-switch gaps beyond 12h don't count as "reply time"
  var GAP_SESSION_MS   = 15 * 60e3;    // ≤15min between messages → same sitting
  var GAP_DOUBLETEXT_MS = 10 * 60e3;   // same sender again after ≥10min unanswered → a "nudge"

  function compute(messages) {
    var msgs = messages.filter(function (m) { return m.ts && m.sender && !m.isDeleted; });
    if (msgs.length < 2) return { ok: false, reason: 'not_enough_messages', totalMessages: msgs.length };
    msgs.sort(function (a, b) { return a.ts - b.ts; });

    // Two principal senders (1:1 assumption; extra senders in group exports are ignored)
    var counts = {};
    msgs.forEach(function (m) { counts[m.sender] = (counts[m.sender] || 0) + 1; });
    var senders = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 2);
    if (senders.length < 2) return { ok: false, reason: 'single_sender', totalMessages: msgs.length };
    var core = msgs.filter(function (m) { return senders.indexOf(m.sender) !== -1; });

    var S = {};
    senders.forEach(function (s) {
      S[s] = { count: counts[s], media: 0, chars: 0, textMsgs: 0, initiations: 0, doubleTexts: 0,
               night: 0, replies: [], repliesDay: [], repliesEvening: [], words: {}, emojis: {},
               openers: [] };  // this sender's actual conversation-opening lines
    });

    var heat = []; for (var d7 = 0; d7 < 7; d7++) { heat.push([0, 0, 0, 0]); } // [gece 0-6, sabah 6-12, öğlen 12-18, akşam 18-24]
    var perDay = {};
    var longestSilence = { ms: 0, from: null, to: null, brokenBy: null };
    var sessions = []; var curSession = null;
    var nightTotal = 0;

    for (var i = 0; i < core.length; i++) {
      var m = core[i], prev = core[i - 1] || null;
      var st = S[m.sender];
      var hour = m.ts.getHours();
      var dow = (m.ts.getDay() + 6) % 7;                       // 0 = Monday
      heat[dow][hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3]++;
      var dk = dayKey(m.ts);
      perDay[dk] = (perDay[dk] || 0) + 1;
      if (hour < 6) { st.night++; nightTotal++; }
      if (m.isMedia) st.media++; else { st.chars += m.text.length; st.textMsgs++; }

      var isInitiation = !prev || (m.ts - prev.ts) >= GAP_NEW_CONVO_MS;
      if (isInitiation && !m.isMedia && m.text.length >= 2 && m.text.length <= 120) {
        st.openers.push(m.text.split('\n')[0]);          // how this person actually opens chats
        if (st.openers.length > 6) st.openers.shift();   // keep the most recent
      }
      if (!prev) { st.initiations++; }
      else {
        var gap = m.ts - prev.ts;
        if (gap >= GAP_NEW_CONVO_MS) st.initiations++;
        if (gap > longestSilence.ms) longestSilence = { ms: gap, from: prev.ts, to: m.ts, brokenBy: m.sender };
        if (prev.sender !== m.sender && gap > 0 && gap < GAP_REPLY_CAP_MS) {
          st.replies.push(gap);
          if (hour >= 18) st.repliesEvening.push(gap);
          else if (hour >= 8) st.repliesDay.push(gap);
        }
        if (prev.sender === m.sender && gap >= GAP_DOUBLETEXT_MS && gap < GAP_NEW_CONVO_MS) st.doubleTexts++;
      }

      // sessions
      if (!curSession || (prev && m.ts - prev.ts > GAP_SESSION_MS)) {
        curSession = { start: m.ts, end: m.ts, count: 1 };
        sessions.push(curSession);
      } else { curSession.end = m.ts; curSession.count++; }

      // words + emojis (skip media)
      if (!m.isMedia) {
        var lower = m.text.toLocaleLowerCase('tr');
        var tokens = lower.replace(EMOJI_RE, ' ').split(/[^a-zçğıöşüâîû0-9']+/i);
        for (var t = 0; t < tokens.length; t++) {
          var w = tokens[t];
          if (w.length >= 3 && !STOPWORDS[w] && !/^\d+$/.test(w)) st.words[w] = (st.words[w] || 0) + 1;
        }
        var em; EMOJI_RE.lastIndex = 0;
        while ((em = EMOJI_RE.exec(m.text)) !== null) st.emojis[em[0]] = (st.emojis[em[0]] || 0) + 1;
      }
    }

    function topN(obj, n) {
      return Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, n)
        .map(function (k) { return { value: k, count: obj[k] }; });
    }

    // shared vocabulary: words both senders use ≥5 times (inside-joke candidates)
    var shared = [];
    Object.keys(S[senders[0]].words).forEach(function (w) {
      var c0 = S[senders[0]].words[w], c1 = S[senders[1]].words[w] || 0;
      if (c0 >= 5 && c1 >= 5) shared.push({ value: w, count: c0 + c1 });
    });
    shared.sort(function (a, b) { return b.count - a.count; });

    var recordDays = Object.keys(perDay).sort(function (a, b) { return perDay[b] - perDay[a]; }).slice(0, 3)
      .map(function (k) { return { date: k, count: perDay[k] }; });
    var longestSession = sessions.slice().sort(function (a, b) { return b.count - a.count; })[0] || null;
    var totalInit = S[senders[0]].initiations + S[senders[1]].initiations;

    var perSender = {};
    senders.forEach(function (s) {
      var st = S[s];
      perSender[s] = {
        count: st.count,
        share: pct(st.count, core.length),
        media: st.media,
        avgLen: st.textMsgs ? Math.round(st.chars / st.textMsgs) : 0,
        initiations: st.initiations,
        initiationShare: pct(st.initiations, totalInit),
        doubleTexts: st.doubleTexts,
        nightPct: pct(st.night, st.count),
        replyMedianMs: median(st.replies),
        replyMedianDayMs: median(st.repliesDay),
        replyMedianEveningMs: median(st.repliesEvening),
        topWords: topN(st.words, 5),
        topEmojis: topN(st.emojis, 3),
        openers: st.openers.slice(-3)
      };
    });

    return {
      ok: true,
      totalMessages: core.length,
      senders: senders,
      firstTs: core[0].ts,
      lastTs: core[core.length - 1].ts,
      spanDays: Math.max(1, Math.round((core[core.length - 1].ts - core[0].ts) / 86400e3)),
      activeDays: Object.keys(perDay).length,
      perSender: perSender,
      heat: heat,                       // 7 (Mon..Sun) × 4 (gece/sabah/öğlen/akşam)
      recordDays: recordDays,
      nightPct: pct(nightTotal, core.length),
      longestSilence: longestSilence.ms ? {
        days: Math.round(longestSilence.ms / 86400e3 * 10) / 10,
        from: longestSilence.from, to: longestSilence.to, brokenBy: longestSilence.brokenBy
      } : null,
      longestSession: longestSession ? {
        count: longestSession.count,
        minutes: Math.max(1, Math.round((longestSession.end - longestSession.start) / 60e3)),
        start: longestSession.start
      } : null,
      sharedWords: shared.slice(0, 5)
    };
  }

  var api = { parse: parse, compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ChatStats = api;
})(typeof window !== 'undefined' ? window : null);
