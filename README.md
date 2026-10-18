# SkyQuiz 3D - Game Edukasi Pesawat Terbang Interaktif ✈️

Game edukasi 3D berbasis web di mana siswa mengemudikan pesawat melintasi ring/gerbang jawaban yang benar di udara dengan grafis Three.js yang imersif dan kontrol kemudi analog virtual yang ramah perangkat mobile.

Dibuat oleh: **M. Nur Ali Abidin, S.Pd.**  
- Instagram: [@aliabidin988](https://instagram.com/aliabidin988)  
- TikTok: [@aliabidin98](https://tiktok.com/@aliabidin98)

---

## 🚀 Panduan Deploy Langsung ke GitHub Pages (GitHub Website)

Aplikasi ini sudah dikonfigurasi secara lengkap untuk dapat di-deploy langsung ke **GitHub Pages** menggunakan **GitHub Actions** secara otomatis tanpa perlu setup rumit.

### Langkah-langkah Deploy:

1. **Push / Upload Kode ke GitHub**:
   - Buat repositori baru di GitHub (misal: `skyquiz-3d`).
   - Push atau upload seluruh isi project ini ke branch `main` atau `master`:
     ```bash
     git init
     git add .
     git commit -m "Initial commit SkyQuiz 3D"
     git branch -M main
     git remote add origin https://github.com/<USERNAME-ANDA>/<NAMA-REPO>.git
     git push -u origin main
     ```

2. **Aktifkan GitHub Pages via GitHub Actions**:
   - Di halaman repositori GitHub Anda, klik tab **Settings** (Pengaturan).
   - Pada sidebar sebelah kiri, pilih menu **Pages**.
   - Pada bagian **Build and deployment** -> **Source**, ubah pilihan dari *Deploy from a branch* menjadi **GitHub Actions**.

3. **Deploy Otomatis Berjalan**:
   - File workflow `.github/workflows/deploy.yml` yang sudah kami sertakan akan langsung terpicu otomatis.
   - Buka tab **Actions** di repositori Anda untuk melihat proses build dan deploy (biasanya selesai dalam 1-2 menit).
   - Setelah selesai, link website GitHub Pages Anda akan muncul di tab **Actions** atau di bagian **Settings -> Pages** (contoh: `https://<username>.github.io/<nama-repo>/`).

---

## 🛠️ Fitur Utama Aplikasi

### 1. Mode Siswa (Student Flight Mode)
- **Kontrol Kemudi Analog 360° Touch**: Didesain khusus untuk perangkat mobile/smartphone layar sentuh agar tombol kontrol tidak menutupi HUD dan mudah dikendalikan.
- **Model Wahana Otomatis Disembunyikan Saat Menjawab**: Saat siswa mencapai ring soal dan modal pertanyaan muncul, model pesawat disembunyikan agar siswa dapat fokus penuh membaca soal dan pilihan jawaban.
- **Sinkronisasi Kode Ujian Guru**: Kolom kode ujian langsung tersinkronisasi otomatis dengan kode yang digenerate oleh guru.
- **Evaluasi Pilihan Jawaban Tersembunyi**: Pilihan jawaban siswa dievaluasi di akhir secara rapi tanpa membocorkan kunci jawaban saat proses pengerjaan.

### 2. Mode Guru & Evaluasi (Teacher Mode)
- **Generate Kode Ujian Otomatis**: Guru cukup menekan satu tombol untuk membuat kode ujian unik (misal: `EXAM-ABCD-123`) yang dapat langsung disalin atau dibagikan ke siswa.
- **Pengaturan Acak Soal**: Pilihan untuk mengacak urutan soal secara acak per sesi siswa.
- **Pengaturan Skor & Bobot**: Konfigurasi nilai dasar per soal (misal 20 poin/soal) serta opsi mengaktifkan atau menonaktifkan bonus combo kecepatan.
- **Bank Soal Kustom**: Guru dapat menambah, mengedit, atau menghapus soal langsung dari antarmuka dashboard guru.
- **Export Nilai ke Excel (.xlsx)**: Unduh seluruh rekap nilai, waktu selesai, dan rincian jawaban siswa ke dalam file spreadsheet Excel dengan satu klik.

---

## 💻 Menjalankan di Komputer Lokal (Local Development)

Jika ingin menjalankan atau mengembangkan aplikasi di laptop/komputer secara offline:

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server lokal
npm run dev

# Buka browser di http://localhost:3000
```

Untuk melakukan build static production secara manual:
```bash
npm run build
```
File hasil build akan berada di direktori `dist/` dan siap di-hosting di server web static mana pun (GitHub Pages, Vercel, Netlify, Cloudflare Pages, cPanel, dll.).

---

## 📄 Lisensi & Hak Cipta
Dibuat untuk tujuan pendidikan dan pembelajaran interaktif.  
© 2026 **M. Nur Ali Abidin, S.Pd.**
