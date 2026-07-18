# Test Guide — aiwillmake

## Otomatik test (e2e_test.js)

Supabase Admin API ile ephemeral test kullanıcısı oluşturur, gerçek access token alır, Playwright'a enjekte eder — Google OAuth gerekmez.

### Ön koşullar

```
node >= 18
npm install
npx playwright install chromium   # ilk kurulumda bir kez
```

`.env` (proje kökünde, asla commit etme):
```
ANTHROPIC_API_KEY=...
SUPABASE_URL=https://<proje>.supabase.co/rest/v1/
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase dashboard → Project Settings → API → service_role
PORT=3000
```

### Çalıştırma

**Terminal 1 — server:**
```bash
node -r dotenv/config server.js
```

**Terminal 2 — testler:**
```bash
node -r dotenv/config e2e_test.js
```

> ⚠️ `node server.js` değil, `node -r dotenv/config server.js` — sunucunun kendi dotenv yüklemesi yok.

Son çalıştırma: **TBD** (yeni kapsamlı suite — ilk çalıştırma bekleniyor)

---

## Test kapsamı (13 grup, ~53 senaryo)

| Grup | Alan | Senaryo sayısı | Strateji |
|---|---|---|---|
| **A** | Auth state matrix | 5 | Browser + API: new user→import, 1 contact→home, invalid token, no token→401, cross-user access blocked |
| **B** | Paywall | 5 | free+0→200, free+1→402, analyze foreign→402, paid DB→unlock, paid "Just talk"→no modal |
| **C** | Twin quality (LLM, 5×) | 6 | Entity isim (Burak), role_names 3'lü, tier=1 gizler, tier=2 paylaşır, hallucination kontrol, kısa veri |
| **D** | WOW data + DNA bar | 4+1 | mirror_insights, relationship_loop, evidence fields, confidence_areas DB poll + DOM render |
| **E** | Parallel extraction | 1 | paid user, Promise.all(analyze A, analyze B), BOTH confidence_areas populated |
| **F** | Telemetri | 4 | micro_feedback, passive_signals, prediction_ledger, user_behavior_snapshots — DB row verify |
| **G** | Error/boundary | 4 | empty text→400, missing character→400, webhook wrong sig→400, nonexistent contact→404 |
| **H** | Screen flows | 2 | wow/goal geçişi, goal back→wow (dead screen-ready yok) |
| **I** | Mirror/Debrief | 4 | debrief Türkçe, mirror non-null, early_apology snapshot, cross_mirror (3 contact seed) |
| **J** | Conversation CRUD | 7 | POST, add message, GET list (user-scoped), GET single, PATCH outcome, DELETE own+cross, simulations |
| **K** | User profile | 4 | GET, PATCH+verify, build-user-profile, profile in simulate (Simge vs Burak confusion) |
| **L** | Sandbox | 2 | GET challenges (6 archetypes), POST simulate boss (5×) |
| **M** | Other endpoints | 8 | from-text, extract-screenshot→400, subscription→free, create-checkout, likely-responses, next-reply, review-message, goal-context |

### LLM kuralı
LLM çıktısına bağlı testler 5× çalışır, "N/5 PASS" raporlanır. FAIL = BULGU — assertion gevşetilmez.

### CANNOT_TEST listesi
- user_profile table yoksa K2–K4 ve C3–C4 → 🚫 CANNOT_TEST (migration eksik)
- LEMONSQUEEZY_WEBHOOK_SECRET yoksa G3 → 🚫 CANNOT_TEST

### Manuel gerekli (otomatik edilemez)
- Gerçek Google OAuth UI
- Dosya yükleme UI
- Twin öznel kalite
- Gerçek ödeme (Lemon Squeezy)
- Voice simulator
- Mobil/responsive görünüm
- Görsel/CSS doğruluğu

---

## Manuel test senaryoları

### A. First-import-free + paywall akışı

1. Yeni/temiz hesapla giriş yap (ya da mevcut contact'ları sil)
2. Import ekranına yönlendirilmeli
3. Sahte WhatsApp verisi yapıştır (aşağıda)
4. Analyze → processing → WOW ekranı görünmeli (ödeme yok)
5. "Just talk" → upgrade modal
6. "I have something to say" → upgrade modal
7. "view full profile" → profil sayfası (ödeme yok)
8. "+ New person" → upgrade modal (import paywall)

### B. WOW ekranı kontrol listesi

- ✅ Mirror kartı (👁 We saw you too) — accent border, yıldız kart
- ✅ Twin kartı (kişi adı)
- ✅ Relationship loop (chip → chip → chip)
- ✅ DNA bar (`confidence_areas` doluysa)
- ✅ 3 CTA: "Just talk", "I have something to say", "view full profile"
- ✅ Free plan: "🔒 3 more insights locked" satırı

### C. Goal screen back button

1. WOW ekranından → "I have something to say" → goal ekranı → ← Back → WOW ekranına dönmeli
2. Person sayfasından → "I have something to say" → goal ekranı → ← Back → person sayfasına dönmeli

---

## Sahte WhatsApp verisi

```
01.01.2025, 09:00 - Elif: Günaydın
01.01.2025, 09:02 - Rasim: Günaydın :) nasılsın?
01.01.2025, 09:05 - Elif: İyiyim, bugün ne yapıyorsun?
01.01.2025, 09:06 - Rasim: Çalışıyorum, akşam çıkabilir miyiz?
01.01.2025, 09:10 - Elif: Tabii, saat kaçta?
01.01.2025, 09:11 - Rasim: 19:00 olur mu?
01.01.2025, 09:12 - Elif: Harika
01.01.2025, 20:05 - Elif: Neredesin?
01.01.2025, 20:07 - Rasim: 5 dakika geçiyorum, özür dilerim
01.01.2025, 20:09 - Elif: Tamam ama bu sık oluyor artık
01.01.2025, 20:15 - Rasim: Haklısın, söz bu sefer son
01.01.2025, 20:17 - Elif: Bunu daha önce de söyledin
01.01.2025, 20:30 - Elif: Güzel bir yer burası
01.01.2025, 20:31 - Rasim: Evet, seninle olmak her yeri güzel yapıyor
01.01.2025, 20:33 - Elif: 😊
02.01.2025, 10:00 - Rasim: Dün güzeldi, tekrar yapalım
02.01.2025, 10:05 - Elif: Ben de öyle düşünüyorum
02.01.2025, 10:10 - Rasim: Bu hafta sonu müsait misin?
02.01.2025, 10:12 - Elif: Cumartesi iyi olur
02.01.2025, 10:13 - Rasim: Süper, yer ayarlayayım
```

---

## Env eksikliği etkileri

| Eksik | Etki |
|---|---|
| `ANTHROPIC_API_KEY` | `/api/analyze-conversation` → 500 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth çalışmaz → 503 |
| `SUPABASE_SERVICE_ROLE_KEY` | `e2e_test.js` başlamaz — Admin API yok |
| `PORT` | Default 3000 |
