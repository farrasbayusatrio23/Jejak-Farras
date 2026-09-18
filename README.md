# Jejak Farras — Vercel + Supabase

Versi ini dipindahkan dari paket ekspor Jejak Farras ke stack **Next.js + Vercel + Supabase** dengan layout publik dan editor yang dipertahankan dari source asli.

## Fitur yang dipertahankan

- Homepage jurnal dengan hero, catatan terbaru, arsip, profil penulis, dan desain asli.
- Halaman detail `/catatan/[slug]`.
- Editor `/admin` untuk membuat, mengedit, menerbitkan, dan menghapus artikel.
- Pengaturan nama situs, hero, bio, lokasi, status perjalanan, dan foto profil.
- Upload cover artikel dan foto profil.
- Upload musik sampai 30 MB, pemilihan rentang mulai/selesai, serta player pada halaman publik.
- Snapshot 4 artikel asli sudah tersedia di `supabase/setup.sql`.

## 1. Siapkan Supabase

1. Buat project Supabase baru.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase/setup.sql` sekali.
4. Buka **Authentication > Users** lalu buat user editor dengan email/password.
5. Pastikan email user tersebut sama persis dengan nilai `EDITOR_EMAIL` yang nanti dipasang di Vercel.

Catatan: foto profil lama tidak tersedia pada paket ekspor, sehingga setelah login Anda perlu mengunggah ulang foto profil dari halaman Editor.

## 2. Environment Variables

Di Vercel Project Settings > Environment Variables, tambahkan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=journal-media
EDITOR_EMAIL=your-editor-email@example.com
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipasang sebagai server-side environment variable di Vercel. Jangan pernah menambahkan prefix `NEXT_PUBLIC_` pada key tersebut.

## 3. Deploy ke Vercel

Upload project ini ke GitHub/GitLab/Bitbucket lalu import repository tersebut ke Vercel, atau gunakan Vercel CLI.

Build command:

```bash
npm run build
```

Output framework akan terdeteksi otomatis sebagai Next.js.

Setelah deploy:

- Homepage: `/`
- Editor: `/admin`

Login editor menggunakan user yang Anda buat pada Supabase Authentication.

## Data ekspor

Salinan JSON asli juga disertakan di:

- `data/posts-export.json`
- `data/site-settings-export.json`

## Struktur backend

- PostgreSQL Supabase: `posts`, `site_settings`
- Supabase Storage bucket: `journal-media`
- Supabase Auth: login editor email/password
- Vercel Route Handlers: validasi editor, upload media, dan media streaming

## Keamanan

Tabel aplikasi mengaktifkan RLS tanpa policy publik. CRUD dilakukan dari route server menggunakan service role, setelah bearer token Supabase diverifikasi dan email cocok dengan `EDITOR_EMAIL`.
