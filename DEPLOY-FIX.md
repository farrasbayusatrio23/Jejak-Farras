# Jejak Farras - Deploy Fix

Paket ini dibuat dari source Vercel + Supabase yang sama dengan deploy sebelumnya, tetapi memastikan semua modul UI yang dipakai editor benar-benar ada di repository.

## Akar error dari log Vercel

Build sebelumnya berhenti pada `Module not found` untuk file di `components/ui`, terutama:

- `alert-dialog.tsx`
- `attachment.tsx`
- `button.tsx`
- `input.tsx`
- `progress.tsx`
- `skeleton.tsx`
- `sonner.tsx`
- `switch.tsx`
- `tabs.tsx`
- `textarea.tsx`

Semua file tersebut ada di paket ini.

## Cara mengganti repository GitHub

1. Ekstrak ZIP penuh.
2. Salin ISI folder hasil ekstrak ke root repository `Jejak-Farras`.
3. Pastikan GitHub menampilkan folder `components/ui/` dan file `components/ui/button.tsx`.
4. Commit dan push semua perubahan.
5. Redeploy di Vercel.

Jangan hanya mengganti `app/` atau `package.json`; folder `components/ui/` wajib ikut ter-commit.

## Verifikasi sebelum push

Jalankan:

```bash
npm run verify:repo
```

Build juga otomatis menjalankan pemeriksaan ini sebelum `next build`.

## Environment Vercel

Gunakan salah satu pasangan key Supabase berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_STORAGE_BUCKET=journal-media
EDITOR_EMAIL=email-anda@example.com
```

atau key legacy:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=journal-media
EDITOR_EMAIL=email-anda@example.com
```

Jalankan `supabase/setup.sql` satu kali di Supabase SQL Editor.
