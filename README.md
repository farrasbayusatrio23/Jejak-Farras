# Jejak Farras — Vercel + Supabase

Project ini adalah versi **Next.js untuk Vercel + Supabase** dari source Jejak Farras. Layout publik dan editor dipertahankan; backend Cloudflare diganti ke Supabase.

## Penting sebelum deploy

- `package.json` pada paket ZIP terbaru berada **langsung di root ZIP**. Jangan masukkan project ke folder tambahan saat membuat repository.
- Vercel dikunci ke **Node.js 22.x**.
- Project memakai **Next.js 16.3.3** (security-patched release).
- `vercel.json` sudah menentukan framework `nextjs`, install command, dan build command.

## 1. Siapkan Supabase

1. Buat project Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase/setup.sql` **satu kali**.
4. Buka **Authentication → Users** dan buat user editor menggunakan email/password.
5. Email user tersebut harus sama persis dengan `EDITOR_EMAIL` di Vercel.

Snapshot 4 artikel dari ekspor lama sudah dimasukkan oleh `supabase/setup.sql`.

> Foto profil lama tidak tersedia di ekspor, jadi upload kembali melalui `/admin` setelah login.

## 2. Environment Variables Vercel

Buka **Vercel → Project → Settings → Environment Variables** lalu isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_STORAGE_BUCKET=journal-media
EDITOR_EMAIL=email-editor-anda@example.com
```

Jika project Supabase Anda masih memakai key legacy, project ini juga menerima:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Cukup gunakan **salah satu pasangan** key publik + server. Jangan pernah memberi prefix `NEXT_PUBLIC_` pada secret/service-role key.

## 3. Deploy

Cara yang paling aman:

1. Ekstrak ZIP.
2. Pastikan file berikut terlihat di folder paling atas:
   - `package.json`
   - `vercel.json`
   - `app/`
   - `lib/`
   - `supabase/`
3. Push isi folder tersebut ke repository GitHub/GitLab/Bitbucket.
4. Import repository ke Vercel.
5. Vercel akan memakai:
   - Framework: `nextjs`
   - Install: `npm install --no-audit --no-fund`
   - Build: `npm run build`
   - Node: `22.x`
6. Tambahkan environment variables di atas.
7. Redeploy.

Setelah deploy:

- Homepage: `/`
- Editor: `/admin`

## Fitur

- Homepage jurnal dan layout asli.
- Detail artikel `/catatan/[slug]`.
- CRUD artikel dari `/admin`.
- Draft/published.
- Edit konten homepage/profil.
- Upload cover dan foto profil.
- Upload musik sampai 30 MB dengan rentang waktu playback.
- Supabase PostgreSQL, Storage, dan Auth.

## Jika deploy masih gagal

Salin **Build Logs Vercel mulai dari baris error pertama sampai sekitar 20 baris setelahnya**. Jangan hanya kirim screenshot status `Failed`; error pertama adalah bagian yang dibutuhkan untuk diagnosis berikutnya.
