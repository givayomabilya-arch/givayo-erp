# GİVAYO ERP — Kurulum Rehberi
 
## Adım 1: Supabase

1. **supabase.com** → "Start your project" → GitHub ile giriş
2. "New project" → proje adı: `givayo-erp` → şifre belirle → bölge: EU (Frankfurt)
3. Proje açıldıktan sonra: **SQL Editor** → `supabase_schema.sql` dosyasının tüm içeriğini yapıştır → Run
4. **Project Settings → API** sayfasından 2 değeri kopyala: 
   - Project URL → `.env.local` içindeki `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 
## Adım 2: GitHub

1. **github.com** → "New repository" → repo adı: `givayo-erp` → Public → Create
2. Bu klasörün içindeki tüm dosyaları yükle:
   - "uploading an existing file" linkine tıkla
   - Tüm dosyaları sürükle → "Commit changes"

## Adım 3: Vercel

1. **vercel.com** → GitHub ile giriş → "New Project"
2. `givayo-erp` reposunu seç → Import
3. **Environment Variables** bölümüne ekle:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
4. "Deploy" → birkaç dakika bekle → uygulamanız hazır!

## Kullanım

- **Katalog**: Ürünlerinizi ekleyin, kesim listesi ve delik projesi yükleyin
- **Siparişler**: Excel yükleyin (Trendyol/sipariş listesi formatı) veya manuel ekleyin
- **Üretim**: Bekleyen siparişleri seçin, istasyonlara atayın, iş emri oluşturun
- **Tablet**: Her eleman kendi istasyonunu seçer, işleri tamamlandı işaretler

## Ürün Yükleme

Katalog sayfasında ürünleri tek tek ekleyebilir ya da Supabase'in
Table Editor'ünden CSV ile toplu içe aktarabilirsiniz.
