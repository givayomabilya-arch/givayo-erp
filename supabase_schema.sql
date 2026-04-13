-- GİVAYO ERP - Veritabanı Şeması
-- Supabase SQL Editor'e yapıştırın ve çalıştırın

-- 1. ÜRÜNLER (Katalog)
create table if not exists urunler (
  id uuid default gen_random_uuid() primary key,
  stok_kodu text unique not null,
  model_kodu text,
  urun_adi text not null,
  renk text,
  kategori text,
  barkod text,
  fiyat numeric(10,2) default 0,
  not text,
  kesim_listesi_url text,
  delik_projesi_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. SİPARİŞLER
create table if not exists siparisler (
  id uuid default gen_random_uuid() primary key,
  siparis_no text unique not null,
  platform text default 'Manuel',
  musteri_adi text not null,
  musteri_telefon text,
  teslimat_adresi text,
  urun_stok_kodu text not null,
  adet integer default 1,
  birim_fiyat numeric(10,2) default 0,
  durum text default 'beklemede',
  not text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. İŞ EMİRLERİ
create table if not exists is_emirleri (
  id uuid default gen_random_uuid() primary key,
  is_emri_no text unique not null,
  siparis_idler uuid[],
  urun_listesi jsonb,
  toplam_adet integer default 0,
  atamalar jsonb,
  durum text default 'aktif',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. İŞ TAMAMLAMA (Eleman tablet kaydı)
create table if not exists is_tamamlama (
  id uuid default gen_random_uuid() primary key,
  is_emri_id uuid references is_emirleri(id) on delete cascade,
  istasyon text not null,
  tip text not null,
  tamamlandi_at timestamptz default now(),
  unique(is_emri_id, istasyon, tip)
);

-- Row Level Security (herkese okuma/yazma - basit kurulum)
alter table urunler enable row level security;
alter table siparisler enable row level security;
alter table is_emirleri enable row level security;
alter table is_tamamlama enable row level security;

create policy "Herkese açık" on urunler for all using (true) with check (true);
create policy "Herkese açık" on siparisler for all using (true) with check (true);
create policy "Herkese açık" on is_emirleri for all using (true) with check (true);
create policy "Herkese açık" on is_tamamlama for all using (true) with check (true);
