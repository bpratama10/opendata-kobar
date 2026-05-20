# Rencana Pengembangan Masa Depan: Integrasi Asisten AI untuk Metadata Dataset

Dokumen ini menjelaskan rancangan arsitektur, alur kerja (workflow), dan detail teknis untuk mengimplementasikan fitur asisten kecerdasan buatan (AI) pada pengelolaan metadata dataset di portal Open Data Kabupaten Kotawaringin Barat. 

Fitur ini bertujuan untuk mengotomatisasi pengisian **Deskripsi** dan **Abstraksi** guna meningkatkan efisiensi dan kualitas data katalog.

---

## 📌 Gambaran Umum Arsitektur AI

Integrasi ini dirancang menggunakan pendekatan **Human-in-the-Loop**, di mana AI bertindak sebagai asisten pengisi formulir (autofill). Pengguna (Admin/Produsen) memiliki kendali penuh untuk meninjau, mengedit, atau menolak hasil generasi AI sebelum menyimpannya ke database.

```
+------------------+           Panggil REST API           +---------------------------+
|  Portal Admin    | -----------------------------------> |   Supabase Edge Function  |
|  (React/Vite UI) | <----------------------------------- |   (Deno & Gemini SDK)     |
+------------------+          Teks Hasil Generate         +---------------------------+
                                                                        |
                                                                        | Teruskan Prompt
                                                                        v
                                                          +---------------------------+
                                                          |   Google Gemini API       |
                                                          |   (gemini-2.5-flash)      |
                                                          +---------------------------+
```

---

## 🛠️ Fitur 1: Asisten AI Deskripsi Dataset (AI Description Assistant)

Fitur ini membantu memformulasikan kalimat deskripsi yang terstruktur dan mudah dipahami berdasarkan metadata dasar yang sudah dimasukkan oleh pengguna.

### A. Syarat & Ketentuan Pemicu (Trigger Condition)
Tombol **`✨ Generate Deskripsi dengan AI`** hanya akan aktif jika pengguna telah memasukkan metadata wajib berikut pada formulir:
1. **Judul Dataset (Title)** (Wajib)
2. **Organisasi Penerbit (Publisher Org)** (Wajib)
3. **Tema/Sektoral (Themes)** (Minimal memilih 1)
4. **Kata Kunci (Keywords/Tag)** (Minimal memasukkan 1)

Jika kondisi di atas belum terpenuhi, tombol akan berstatus *Disabled* disertai tooltip informatif: *"Lengkapi Judul, Organisasi, Tema, dan Kata Kunci untuk menggunakan asisten AI."*

### B. Alur UI/UX (Formulir Add & Edit)
* Tersedia tombol premium **`✨ Generate Deskripsi`** di pojok kanan atas kolom textarea **Deskripsi**.
* Ketika diklik, frontend akan mengirim data metadata dasar tersebut ke Edge Function `/functions/generate-description`.
* Spinner pemuatan (loading state) ditampilkan pada input textarea selama proses berlangsung.
* Hasil teks deskripsi otomatis terisi pada input textarea `description`.

### C. Logika Prompt AI (Prompt Engineering)
```text
Anda adalah asisten penulisan katalog data profesional untuk Pemerintah Kabupaten Kotawaringin Barat.
Tugas Anda adalah membuat deskripsi singkat sepanjang 1 hingga 2 kalimat yang merangkum tujuan dari dataset ini berdasarkan metadata berikut:

- Judul Dataset: {title}
- Organisasi Penerbit: {organization_name}
- Sektoral/Tema: {themes_list}
- Kata Kunci: {keywords_list}

ATURAN FORMULASI:
1. Gunakan Bahasa Indonesia yang formal, informatif, dan baku.
2. Deskripsi harus secara jelas menerangkan APA yang diukur dan SIAPA instansi yang bertanggung jawab atas data tersebut.
3. Contoh pola kalimat: "Dataset ini menyajikan informasi mengenai [variabel] di Kabupaten Kotawaringin Barat yang dikelola oleh [nama dinas] untuk memantau [tujuan sektoral]."
4. DILARANG menggunakan format markdown atau tanda kutip pembungkus pada output akhir.
```

---

## 📊 Fitur 2: Asisten AI Abstraksi Dataset (AI Abstraction Assistant)

Fitur ini menghasilkan ringkasan eksekutif dan analisis tren perbandingan data secara mendalam dengan membaca data tabel riil yang telah diunggah.

### A. Syarat & Ketentuan Pemicu (Trigger Condition)
Karena abstraksi memerlukan analisis isi data, fitur ini **hanya dapat digunakan pada Halaman Edit Dataset** (setelah dataset terbuat dan file data/resource tabel berhasil diunggah/diisi).
* **Halaman Tambah (`/admin/datasets/add`):** Input Abstraksi tetap ada untuk pengisian manual, namun tombol AI disembunyikan/dinonaktifkan dengan catatan: *"Fitur asisten AI Abstraksi akan aktif setelah Anda mengunggah data tabel pada dataset ini."*
* **Halaman Edit (`/admin/datasets/edit/:id`):** Tombol **`✨ Generate dengan AI`** aktif penuh jika resource data bertipe `TABLE` telah terhubung ke dataset.

### B. Logika Filter Tahun Spesifik (Aturan Logika Bisnis)
Dalam menyusun ringkasan data berkala, terdapat aturan ketat mengenai rentang waktu:
1. Sistem backend akan mendeteksi tahun terkecil ($T_{min}$) dan tahun terbaru ($T_{max}$ atau tahun $n$) di dalam dataset.
2. AI diinstruksikan untuk melakukan **analisis perbandingan tren hanya dari tahun $T_{min}$ sampai dengan $T_{max} - 1$ (n-1)**.
3. Data pada **tahun terbaru ($n$) harus diabaikan** dari analisis perbandingan karena datanya seringkali belum final/diaudit, namun dapat dicantumkan sebagai catatan kaki dinamis.

### C. Logika Prompt AI (Prompt Engineering)
```text
Anda adalah analis data pemerintah profesional untuk Open Data Kabupaten Kotawaringin Barat. 
Tugas Anda adalah membuat Abstraksi (ringkasan eksekutif) resmi berbasis data tabel riil.

### DATA METADATA:
- Judul: {title}
- Deskripsi: {description}

### DATA TABEL (SAMPEL 10 BARIS PERTAMA):
{data_sample_json}

### ATURAN LOGIKA ANALISIS (WAJIB DIPATUHI):
1. Cari tahu tahun terkecil (T_min) dan tahun terbaru (T_max / tahun 'n') dari data tabel di atas.
2. Buat analisis perbandingan perkembangan data HANYA untuk rentang tahun T_min hingga tahun T_max - 1 (n-1).
3. PENTING: DILARANG KERAS menarik kesimpulan tren atau membandingkan nilai untuk tahun terbaru (T_max). Jangan sebutkan angka perbandingannya karena datanya belum final/lengkap.
4. Tulis hasil abstraksi maksimal 150-200 kata dalam Bahasa Indonesia formal.
5. Struktur Output:
   - Paragraf 1: Penjelasan umum tentang ruang lingkup data dan kegunaannya.
   - Paragraf 2: Rangkuman perbandingan tren dari tahun [T_min] hingga [T_max - 1] (misalnya persentase kenaikan/penurunan).
   - Catatan Kaki: Keterangan bahwa data tahun [T_max] sengaja belum dimasukkan dalam analisis perbandingan karena masih bersifat berjalan/sementara.
```

---

## 🔒 Skema Keamanan & Pengolahan Data

1. **API Key Security:**
   `GEMINI_API_KEY` disimpan dengan aman sebagai *Environment Variable* di dalam dashboard Google Cloud / Supabase Edge Functions. Kunci ini **tidak pernah dibocorkan** ke sisi frontend/browser.
2. **Keterbatasan Token & Payload:**
   Untuk dataset yang sangat besar, kita tidak mengirimkan seluruh isi tabel database ke AI (guna menghindari pembengkakan biaya dan waktu respon lambat). Sistem hanya akan mengambil skema kolom serta **maksimal 10 baris data pertama** sebagai sampel representasi data.

---

## 📈 Rencana Tahapan Eksekusi (Implementation Milestones)

* [ ] **Fase 1: Kredensial & Edge Function**
  * Membuat akun di Google AI Studio dan menyalin API Key gratis.
  * Menerapkan Edge Function `/functions/generate-description` dan `/functions/generate-abstract` di proyek Supabase.
* [ ] **Fase 2: Integrasi UI Deskripsi (Form Tambah & Edit)**
  * Menambahkan validasi state pada frontend untuk mendeteksi kelengkapan metadata dasar.
  * Membuat komponen tombol `✨ Generate Deskripsi` yang dinamis di samping label input Deskripsi.
* [ ] **Fase 3: Integrasi UI Abstraksi (Form Edit)**
  * Menambahkan tombol `✨ Generate dengan AI` khusus pada halaman `AdminDatasetEdit.tsx`.
  * Menyesuaikan query Edge Function untuk memuat data tabel secara dinamis sebelum dilempar ke AI.
* [ ] **Fase 4: Pengujian & Refinement Prompt**
  * Menguji respons AI terhadap berbagai format tabel dataset daerah (keuangan, demografi, lingkungan).
  * Menyetel prompt lebih presisi agar kepatuhan terhadap aturan batasan tahun $n-1$ konsisten 100%.
