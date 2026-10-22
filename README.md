# Cryptography — toolkit kriptografi modern

Kumpulan 11 alat kriptografi yang berjalan **100% di browser** dengan [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API).
Tidak ada data yang dikirim ke server: semua hashing, enkripsi, dan pembuatan kunci terjadi di perangkat pengguna.

Dibangun dengan Next.js 16 (App Router), React 19, dan Tailwind CSS 4.

## Fitur

| Kategori     | Alat                     | Isi                                                                                   |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------- |
| Hashing      | **Generator Hash**       | MD5, SHA-1, SHA-256/384/512 untuk teks atau berkas, plus verifikasi checksum          |
|              | **HMAC**                 | Buat & verifikasi HMAC-SHA-1/256/384/512, kunci dalam teks/hex/Base64                 |
| Enkripsi     | **Enkripsi Teks**        | AES-256-GCM + PBKDF2-SHA256 (bawaan 600.000 iterasi)                                  |
|              | **Enkripsi Berkas**      | Seret-lepas berkas, nama & tipe asli tersegel di dalam berkas `.enc`                  |
| Kunci publik | **Generator Kunci**      | Ed25519, ECDSA P-256/P-384, RSA-PSS, RSA-OAEP, X25519, ECDH → PEM / JWK + sidik jari  |
|              | **Tanda Tangan Digital** | Tanda tangani & verifikasi; algoritma terdeteksi otomatis dari kunci PEM              |
| Utilitas     | **Debugger JWT**         | Decode, cek kedaluwarsa, verifikasi HS/RS/PS/ES/EdDSA, dan buat token HS256/384/512   |
|              | **Generator Kata Sandi** | CSPRNG tanpa bias + pemeriksa kekuatan (entropi, pola umum, estimasi waktu retas)     |
|              | **Acak & UUID**          | UUID v4, UUID v7 (terurut waktu), byte acak hex/Base64/Base64URL, token alfanumerik   |
|              | **Encoder / Decoder**    | Base64, Base64URL, Hex, biner, URL — aman untuk UTF-8 dan emoji                       |
| Belajar      | **Sandi Klasik**         | Caesar, ROT13, Vigenère, Atbash + pemecah Caesar berbasis frekuensi huruf (EN & ID)   |

Fitur antarmuka:

- **Dwibahasa** Indonesia / English dengan URL per bahasa (`/id/...`, `/en/...`). Bahasa dipilih otomatis dari
  `Accept-Language` dan pilihan manual diingat lewat cookie.
- **Tema terang / gelap / sistem** tanpa kedipan saat memuat (skrip inline sebelum render pertama).
- **Palet perintah** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> atau <kbd>/</kbd>) untuk lompat ke alat atau mengganti tema/bahasa.
- Pintasan <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> untuk enkripsi/dekripsi, salin sekali klik dengan notifikasi.
- Responsif (sidebar menjadi drawer di ponsel), dapat dipasang sebagai PWA (manifest + ikon), dan halaman statis (SSG).
- Header keamanan: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP.

## Format data terenkripsi

Teks dan berkas memakai wadah biner yang sama (teks ditampilkan sebagai Base64):

```
"CRY" (3) | versi (1) | jenis (1) | iterasi PBKDF2 (4, big-endian) | salt (16) | IV (12) | ciphertext + tag GCM (16)
```

Seluruh header 37 byte ikut diautentikasi sebagai _additional data_ AES-GCM, jadi perubahan jumlah iterasi, salt,
atau jenis data akan terdeteksi. Berkas menyimpan `{ name, type }` dalam bentuk JSON di dalam bagian yang terenkripsi.

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — Anda akan diarahkan ke `/id` atau `/en`.

| Perintah            | Fungsi                                                          |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Server pengembangan                                             |
| `npm run build`     | Build produksi (semua halaman alat di-prerender)                |
| `npm start`         | Menjalankan hasil build                                         |
| `npm test`          | Tes unit library kripto (test runner bawaan Node, tanpa dependensi) |
| `npm run typecheck` | Pemeriksaan TypeScript                                          |
| `npm run lint`      | ESLint                                                          |

## Struktur

```
app/
  [lang]/layout.tsx        root layout: font, skrip tema, provider i18n, shell
  [lang]/page.tsx          beranda
  [lang]/[tool]/page.tsx   halaman setiap alat (SSG via generateStaticParams)
  manifest.ts, icon.svg    PWA
proxy.ts                   pengalihan `/` → `/id` atau `/en`
components/
  shell/                   sidebar, header, palet perintah
  tools/                   satu komponen per alat
  ui.tsx                   komponen dasar (Button, Field, Output, FileDrop, …)
lib/
  crypto/                  logika kripto murni + crypto.test.ts
  i18n/                    konfigurasi bahasa dan kamus id/en
  tools.ts                 daftar alat dan kategorinya
```

## Catatan keamanan

- MD5 dan SHA-1 hanya untuk mencocokkan checksum lama; keduanya tidak aman terhadap collision.
- Kekuatan enkripsi berbasis kata sandi bergantung pada kata sandinya. Gunakan frasa sandi yang panjang dan unik.
- Estimasi waktu retas kata sandi adalah perkiraan, bukan jaminan.
- Sandi klasik hanya untuk pembelajaran.
