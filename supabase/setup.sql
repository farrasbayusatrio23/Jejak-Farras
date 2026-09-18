-- Jejak Farras - Supabase setup
-- Jalankan SATU KALI pada Supabase SQL Editor sebelum deploy pertama.

create table if not exists public.posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  location text not null default '',
  trip_date date not null,
  read_time integer not null default 5 check (read_time between 1 and 60),
  status text not null default 'draft' check (status in ('draft', 'published')),
  cover_key text,
  cover_alt text not null default '',
  author_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_status_trip_date
  on public.posts (status, trip_date desc);
create index if not exists idx_posts_updated_at
  on public.posts (updated_at desc);

create table if not exists public.site_settings (
  id text primary key,
  site_name text not null default 'Jejak Farras',
  owner_name text not null default 'Farras Bayu',
  hero_eyebrow text not null default 'Jurnal perjalanan pribadi',
  hero_title text not null default E'Pergi untuk melihat.\nPulang untuk',
  hero_accent text not null default 'mengerti.',
  hero_description text not null default 'Catatan Farras Bayu tentang tempat, rasa, dan orang-orang yang membuat perjalanan layak diingat.',
  opening_quote text not null default 'Saya percaya perjalanan terbaik tidak selalu yang paling jauh, tetapi yang membuat kita pulang dengan cara pandang yang baru.',
  about_bio text not null default 'Saya berjalan untuk mengenal tempat baru, lalu menulis agar detail-detail kecilnya tidak hilang. Jurnal ini adalah rumah bagi foto, rute, dan cerita yang saya bawa pulang.',
  base_location text not null default 'Berbasis di Indonesia',
  journey_status text not null default 'Selalu mencari jalan berikutnya',
  profile_image_key text,
  profile_image_alt text not null default '',
  music_enabled boolean not null default false,
  music_key text,
  music_title text not null default 'Musik perjalanan',
  music_start integer not null default 0,
  music_end integer,
  updated_at timestamptz not null default now()
);

-- Semua akses tabel aplikasi dilakukan oleh server Vercel menggunakan service role.
alter table public.posts enable row level security;
alter table public.site_settings enable row level security;
grant usage on schema public to service_role;
grant all on table public.posts, public.site_settings to service_role;

-- Bucket dibuat public agar gambar/media yang dipublikasikan dapat dibaca oleh halaman jurnal.
insert into storage.buckets (id, name, public, file_size_limit)
values ('journal-media', 'journal-media', true, 33554432)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Snapshot 4 artikel dari ekspor asli.
insert into public.posts
(id, slug, title, excerpt, content, location, trip_date, read_time, status, cover_key, cover_alt, author_id, created_at, updated_at)
values
(
  '9605401f-3398-4a38-8971-3970065d8108',
  'nandur-pari-960540',
  'Nandur Pari',
  'Beras Adalah Inti',
  'Kadang Nandur tidak harus, tapi harus, piye jal',
  'Gendolan, Kutub Selatan',
  '2026-09-05',
  3,
  'published',
  null,
  'Hamparan Sawah di pagi Hari',
  'xHsHLNbLFBy4rl2mjzZPjIxnSSgrUymi2ZCYRPXpfjEZMzPzeh6Nf4',
  '2026-09-05T03:06:54.034Z',
  '2026-09-05T03:06:54.034Z'
),
(
  'starter-bromo',
  'pagi-datang-pelan-di-bromo',
  'Pagi datang pelan di Bromo',
  'Udara sebelum fajar, secangkir kopi yang lekas dingin, dan satu pengingat untuk tidak terburu-buru.',
  E'Pukul empat pagi, udara menusuk sampai ke sela sarung tangan. Di kejauhan, garis tipis berwarna jingga mulai muncul di balik punggung gunung.\n\nTak ada aba-aba ketika langit berubah. Semua orang mendadak diam, seolah tahu bahwa beberapa pemandangan memang lebih baik disimpan tanpa banyak kata.\n\nSaya turun membawa sepatu penuh debu dan satu pengingat sederhana: terburu-buru sering membuat kita melewatkan bagian terbaik.',
  'Gunung Bromo, Jawa Timur',
  '2026-08-18',
  6,
  'published',
  null,
  'Gunung Bromo dan lautan kabut saat matahari terbit',
  'starter',
  '2026-08-18T04:30:00.000Z',
  '2026-08-18T04:30:00.000Z'
),
(
  'starter-penida',
  'tebing-angin-dan-jalan-nusa-penida',
  'Tebing, angin, dan jalan yang tak ada di peta',
  'Sehari di Nusa Penida mengajarkan bahwa jalan memutar sering menyimpan pemandangan terbaik.',
  E'Pagi di pulau dimulai dengan suara motor dan angin asin. Saya mengikuti jalan yang makin kecil hingga peta berhenti memberi petunjuk.\n\nDi ujungnya, laut terbuka lebar dan semua rasa lelah mendadak masuk akal.',
  'Nusa Penida, Bali',
  '2026-08-04',
  5,
  'published',
  null,
  '',
  'starter',
  '2026-08-04T08:00:00.000Z',
  '2026-08-04T08:00:00.000Z'
),
(
  'starter-yogyakarta',
  'sore-panjang-di-prawirotaman',
  'Sore yang panjang di gang-gang Prawirotaman',
  'Tentang kota yang tidak meminta kita bergegas, percakapan singkat, dan aroma kopi setelah hujan.',
  E'Hujan baru berhenti ketika saya keluar tanpa tujuan yang pasti. Aspal masih gelap dan lampu-lampu warung mulai menyala satu per satu.\n\nBeberapa kota terasa akrab bahkan sebelum kita mengenalnya. Yogyakarta adalah salah satunya.',
  'Yogyakarta',
  '2026-07-21',
  4,
  'published',
  null,
  '',
  'starter',
  '2026-07-21T16:00:00.000Z',
  '2026-07-21T16:00:00.000Z'
)
on conflict (id) do nothing;

-- Foto profil lama memang tidak ada di paket ekspor, jadi profile_image_key sengaja null.
insert into public.site_settings
(id, site_name, owner_name, hero_eyebrow, hero_title, hero_accent, hero_description, opening_quote, about_bio, base_location, journey_status, profile_image_key, profile_image_alt, music_enabled, music_key, music_title, music_start, music_end, updated_at)
values
(
  'site',
  'Jejak Farras',
  'Farras Bayu',
  'Jurnal perjalanan pribadi',
  E'Pergi untuk melihat.\nPulang untuk',
  'mengerti.',
  'Catatan Farras Bayu tentang tempat, rasa, dan orang-orang yang membuat perjalanan layak diingat.',
  'Saya percaya perjalanan terbaik tidak selalu yang paling jauh, tetapi yang membuat kita pulang dengan cara pandang yang baru.',
  'Saya berjalan untuk mengenal tempat baru, lalu menulis agar detail-detail kecilnya tidak hilang. Jurnal ini adalah rumah bagi foto, rute, dan cerita yang saya bawa pulang.',
  'Berbasis di Indonesia',
  'Selalu mencari jalan berikutnya',
  null,
  '',
  false,
  null,
  'Musik perjalanan',
  0,
  null,
  '2026-09-05T03:48:14.281Z'
)
on conflict (id) do nothing;
