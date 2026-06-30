# Test Recipe — aiwillmake

## Seçilen yöntem: Playwright (yerel sunucu + gerçek Supabase/Anthropic)

Playwright testi zaten `playwright_test.js` dosyasında mevcut.
Supabase ve Anthropic erişimi `.env` dosyasından gelir (gerçek API'lar, mock yok).
Auth bypass yok — tarayıcı otomasyonu Google OAuth'u simüle edemez, bu yüzden
kimlik doğrulama gerektirmeyen akışlar test edilir, auth gerektiren adımlar
`page.evaluate` ile token enjeksiyonu yapılarak atlatılır.

---

## Ön koşullar

```
node >= 18
npm install
npx playwright install chromium   # ilk kurulumda bir kez
```

`.env` dosyası (proje kökünde, zaten mevcut):
```
ANTHROPIC_API_KEY=<mevcut>
SUPABASE_URL=https://<proje>.supabase.co/rest/v1/
SUPABASE_ANON_KEY=<mevcut>

# Opsiyonel — ödeme testleri için (olmasa da akış testleri çalışır)
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_PRO_VARIANT_ID=
LEMONSQUEEZY_UNLIMITED_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=

PORT=3000
```

---

## Test başlatma reçetesi (tam uçtan uca)

### 1. Sunucuyu ayağa kaldır

```bash
cd C:\Users\rasim\OneDrive\Desktop\projelerim\aiwillmake
node server.js
```

Çıktıda `Listening on port 3000` görünmeli.

### 2. Playwright testini çalıştır (ayrı terminal)

```bash
node playwright_test.js
```

URL: `http://localhost:3000/app.html`

### 3. Sadece UI'yı hızlı kontrol etmek için

Tarayıcıda `http://localhost:3000/app.html` aç.
Google ile giriş yap (gerçek hesap — Supabase Auth gerçek OAuth'u kullanır).

---

## Kritik test senaryoları (manuel)

### A. First-import-free + paywall akışı

1. Yeni/temiz bir hesapla giriş yap (veya mevcut hesabın tüm contact'larını sil)
2. Import ekranına yönlendirildiğini doğrula
3. Sahte WhatsApp verisi yapıştır (aşağıda)
4. Analyze → processing → WOW ekranı görünmeli (ödeme yok)
5. "Just talk" → upgrade modal açılmalı
6. "I have something to say" → upgrade modal açılmalı  
7. "view full profile" → profil sayfası açılmalı (ödeme yok)
8. "+ New person" → upgrade modal açılmalı (import paywall)

### B. Wow ekranı içerik testi

WOW ekranında şunlar görünmeli:
- Mirror kartı (👁 We saw you too) — yıldız kart, accent border
- Twin kartı (kişi adı)
- Relationship loop (varsa) — chip'ler arası → okları
- DNA bar (confidence_areas doluysa)
- 3 CTA: "Just talk", "I have something to say", "view full profile"
- Free plan: mirror listede "🔒 3 more insights locked" satırı

### C. Goal screen back button

1. Person sayfasından → "I have something to say" → goal ekranı
2. ← Back → person sayfasına dönmeli
3. WOW ekranından → "I have something to say" → goal ekranı  
4. ← Back → WOW ekranına dönmeli

---

## Sahte WhatsApp verisi

Şu içeriği bir `.txt` dosyasına kopyala, import ekranına yükle:

```
01.01.2025, 10:00 - Elif: Günaydın
01.01.2025, 10:01 - Rasim: Günaydın :)
01.01.2025, 10:05 - Elif: Bugün ne yapıyorsun?
01.01.2025, 10:06 - Rasim: Çalışıyorum, akşam müsaitim
01.01.2025, 10:10 - Elif: Tamam, akşam konuşuruz
01.01.2025, 20:00 - Elif: Nasıl geçti günün?
01.01.2025, 20:15 - Rasim: İyi geçti, yorgunum ama. Sen?
01.01.2025, 20:16 - Elif: Ben de. Seninle konuşmak istedim aslında
01.01.2025, 20:20 - Rasim: Neden beklettirdin o zaman?
01.01.2025, 20:21 - Elif: Bilmiyorum, cesareti bulamadım
02.01.2025, 09:00 - Rasim: Sabah mesajın geldi, konuşalım mı?
02.01.2025, 09:30 - Elif: Evet, sana bir şey söylemem lazım
02.01.2025, 09:31 - Rasim: Dinliyorum
02.01.2025, 09:35 - Elif: Biraz daha ciddi olmamı istiyorum ilişkimizde
02.01.2025, 09:40 - Rasim: Ne demek istiyorsun tam olarak?
02.01.2025, 09:45 - Elif: Daha fazla zaman geçirmek, planlar yapmak
02.01.2025, 09:50 - Rasim: Haklısın, benim de eksikliğimdi
02.01.2025, 09:51 - Elif: Teşekkür ederim, bu çok önemli benim için
```

---

## Env eksikliği olduğunda ne olur?

| Eksik env | Etki |
|---|---|
| `ANTHROPIC_API_KEY` | `/api/analyze-conversation` → 500, WOW ekranı görünmez |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth çalışmaz, import engellenir |
| `LEMONSQUEEZY_*` | Checkout başlatılamaz (503), ama upgrade modal görünür |
| `PORT` | Default 3000 kullanılır |

---

## Playwright testi çalıştırma notu

`playwright_test.js` headless Chromium açar ve auth gerektirmeyen testleri çalıştırır.
Auth gerektiren testler için Supabase service role key ile doğrudan DB'ye test user
oluşturulabilir ve `accessToken` `page.evaluate` ile inject edilebilir.
Bu konfigürasyon şu an mevcut değil — auth testleri manuel yapılır.
