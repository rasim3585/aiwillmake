# AI Will Make

AI destekli metin üretme platformu. Kullanıcılar kategori ve dil seçerek sosyal medya, sağlık, hukuk, kariyer veya eğitim alanlarında 5 farklı metin taslağı üretebilir. Arka planda Claude Haiku modeli kullanılır.

## Özellikler

| Kategori | Açıklama |
|---|---|
| **Social Media** | Instagram, Twitter, LinkedIn için ton ve platforma göre caption üretimi |
| **Health** | Doktora anlatmak için semptom bazlı anamnez metinleri |
| **Legal** | Avukata veya resmi makama sunulacak hukuki metin taslakları |
| **Career** | İş başvurusu için pozisyon ve şirkete özel kapak mektubu taslakları |
| **Education** | Okul başvurusu için program ve motivasyona dayalı niyet mektubu taslakları |

## Kurulum

**Gereksinimler:** Node.js 18+

```bash
# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
```

`.env` dosyasına Anthropic API anahtarını ekle:

```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# Sunucuyu başlat
node server.js
```

Tarayıcıda `http://localhost:3000` adresini aç.

## API

`POST /api/generate` — Seçili kategoriye göre 5 metin taslağı döndürür.

Rate limit: dakikada 10 istek.
