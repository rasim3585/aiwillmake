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

Son çalıştırma: **31 PASS, 0 FAIL, 7 SKIP** ✅

---

## Test kapsamı

| # | Test | Strateji |
|---|---|---|
| 1 | Auth setup | Admin API createUser + signInWithPassword |
| 2a | İlk contact POST → 200 | REST API call with token |
| 2b | İkinci contact POST → 402 | free plan paywall gate |
| 2c | analyze-conversation için 402 (farklı contact) | defense gate |
| 3 | Import → WOW ekranı routing | browser + injectSession |
| 3 | WOW DOM: mirror card, twin, loop, CTA butonları | Playwright evaluate |
| 3 | Free plan locked row (`🔒 3 more insights locked`) | DOM check |
| 4a | "Just talk" → upgrade modal | button click |
| 4b | "I have something to say" → upgrade modal | button click |
| 4c | "+ New person" → import paywall modal | openNewConversation() |
| 4d | Feature list (≥5 item) | DOM query |
| 4e | Modal title değişimi (import vs practice) | showUpgradeModal() |
| 4f | Goal back button → wow ekranına dönüş | goalBack() |
| 5 | Telemetri (passive_signals, user_behavior_snapshots) | SKIP — fire-and-forget |
| 6 | Entity mapping (role_names) | SKIP — kısa chat tetiklemiyor |
| 7 | Ölü kod yok (screen-ready, showReadyScreen) | HTML içerik arama |

---

## SKIP neden oluşuyor?

| SKIP | Sebep |
|---|---|
| `wow_dna_section` | `confidence_areas` async olarak doldurulur, ilk response'da null gelir |
| `telemetry_*` | `simulate-reply` 400 dönüyor — endpoint conversation_id bekliyor (burada yok) |
| `entity_role_names_exist` | 20 mesajlık kısa sahte chat entity extraction için yetersiz |
| `entity_role_name_in_reply` | Canlı simülasyon session gerektirir — manuel test kapsamında |

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
