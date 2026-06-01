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

---

## 🔄 Rencana Fitur 3: Validasi Pembaruan Data Berkala (Rework Dataset Update Behavior)

Fitur ini bertujuan untuk mengoptimalkan integritas data pada portal dengan melacak keaslian pembaruan dataset. Sistem akan dapat membedakan secara cerdas antara pembaruan informasi umum (metadata) dan pembaruan isi tabel data riil, guna mencegah praktik "compliance hacking" (produsen hanya memperbarui karakter kosong/kecil pada teks deskripsi agar indikator kedaluwarsa menjadi hijau).

Fitur ini menggunakan pendekatan **Proposal 3: Pemberdayaan Walidata (Admin Review Diff)** dengan pelacakan cerdas berbasis database.

### A. Alur Kerja Deteksi Perubahan (Change Detection Workflow)

1. **Pemisahan Tanda Waktu (Separated Timestamps)**:
   * Menambahkan kolom `metadata_updated_at` (berubah saat form metadata disimpan) dan `data_updated_at` (berubah **hanya** ketika baris baru di-insert/update ke dalam `data_points` atau `data_indicators` melalui trigger database).
2. **Visualisasi pada Dashboard Tinjauan Walidata (Review Diff)**:
   * Saat dataset masuk ke status `PENDING_REVIEW`, Walidata (Admin/Diskominfo) akan melihat rangkuman jenis perubahan:
     * 📝 **Hanya Informasi (Metadata)**: Jika `metadata_updated_at` > `last_published_at` sedangkan `data_updated_at` ≤ `last_published_at`.
     * 📊 **Pembaruan Data Riil**: Jika `data_updated_at` > `last_published_at` (menampilkan jumlah data poin baru yang dimasukkan).

---

### ⚠️ Potensi Masalah (Concerns) & Solusi Teknis (Mitigations)

Implementasi fitur ini memiliki beberapa tantangan operasional dan teknis yang perlu diantisipasi:

#### 1. Hambatan Alur Birokrasi (Administrative Bottleneck)
* **Masalah**: Jika setiap perbaikan teks kecil (misal: membetulkan salah ketik di deskripsi, mengubah email kontak, atau memperbaiki tag) harus masuk antrean `PENDING_REVIEW` dan disetujui manual oleh Walidata, produsen akan merasa frustrasi karena proses publikasi yang lambat, dan Walidata akan kelelahan akibat beban kerja admin trivial.
* **Solusi (Mitigation)**: **Auto-Approve untuk Perubahan Non-Kritis**.
  * Buat kebijakan otomatisasi: Jika sistem mendeteksi *hanya* teks non-kritis yang diubah (misalnya `tags`, `contact_email`, `description`) sedangkan data tabel tidak disentuh, status dataset tetap `PUBLISHED` secara langsung (Auto-Approve). 
  * Persetujuan manual `PENDING_REVIEW` hanya diwajibkan untuk:
    * Publikasi dataset baru pertama kali.
    * Perubahan tingkat klasifikasi (misal dari TERBATAS menjadi PUBLIC).
    * Penambahan/modifikasi data tabel utama (`data_points`).

#### 2. Kebocoran Data Sebelum Persetujuan (Staging vs Production Desync)
* **Masalah**: Saat ini, `catalog_metadata` dan `data_points` bersifat single-row langsung live. Jika produsen mengunggah data baru untuk tahun 2025 tetapi status dataset berubah menjadi `PENDING_REVIEW` (belum disetujui Walidata), maka data poin 2025 tersebut secara teknis sudah masuk ke database. Grafik di halaman publik detail bisa langsung membaca data 2025 tersebut padahal status metadata resminya belum disetujui/di-publish.
* **Solusi (Mitigation)**: 
  * **Draft Flag pada Data**: Menambahkan kolom `status` (`DRAFT`/`PUBLISHED`) pada level `data_points` dan `data_indicators`. Ketika produsen mengunggah data baru, statusnya adalah `DRAFT`. Halaman visualisasi publik hanya akan me-load data points yang berstatus `PUBLISHED`. Begitu Walidata menekan tombol "Setujui/Publish", sistem menjalankan transaksi untuk mengubah status seluruh data points baru tersebut menjadi `PUBLISHED`.

#### 3. Kompleksitas Penghitungan Rentang Waktu (Frequency vs Real-world Gaps)
* **Masalah**: Penghitungan jatuh tempo pembaruan yang terlalu kaku bisa memicu alarm "Kadaluarsa" palsu. Sebagai contoh, data PDRB tahunan daerah seringkali baru selesai diaudit oleh BPS/Inspektorat pada pertengahan tahun berikutnya. Jika sistem langsung menganggap data kedaluwarsa pada 1 Januari, hal itu tidak adil bagi produsen.
* **Solusi (Mitigation)**: **Tolerance Grace Period (Masa Tenggang)**.
  * Tambahkan konfigurasi toleransi keterlambatan pada jenis frekuensi pembaruan. Contoh: Frekuensi Tahunan (`TAH`) diberikan masa tenggang 6 bulan. Sistem baru akan menandai dataset "Kadaluarsa" jika data tahun baru belum diunggah setelah melewati tanggal 1 Juli di tahun berikutnya.

---

## 📐 Rencana Rencana Redesign: Tabel Data Polimorfik (Polymorphic / Configuration-Driven Data Tables)

Fitur ini bertujuan untuk mendukung penyajian data non-temporal/tabulasi silang (*cross-tabulation*) di portal satu data. Saat ini, tabel pratinjau data dinamis terkunci pada dimensi waktu karena adanya batasan data berjenis `DATE` pada database (`period_start`). 

Dengan rencana redesign ini, platform dapat menyajikan berbagai jenis data (seperti demografi Agama vs Kelompok Umur, Jenis Kelamin vs Kecamatan) secara dinamis menggunakan pendekatan berbasis konfigurasi (*configuration-driven*).

### A. Konseptual Polimorfik via `schema_json` (JSONB)
Untuk menghindari pembuatan tabel database baru yang rumit, kita memanfaatkan kolom `schema_json` berjenis `JSONB` pada tabel `catalog_resources`. Kolom ini akan menyimpan template rendering dan aturan visualisasi yang disetujui saat Admin membuat tabel data.

#### 📈 Templat 1: Deret Waktu (`TEMPORAL` / Time-Series)
Digunakan untuk data berkala tahunan/bulanan. Fitur analisis otomatis seperti grafik garis (*Line Chart*) dan statistik YoY (*Year-over-Year*) akan aktif secara otomatis.
```json
{
  "table_type": "TEMPORAL",
  "features": {
    "yoy_calculation": true,
    "trend_chart": "line",
    "expected_update_check": true
  },
  "dimensions": {
    "row_header": "Indikator",
    "column_type": "DATE",
    "column_header": "Tahun"
  }
}
```

#### 📊 Templat 2: Matriks Kustom (`CUSTOM_MATRIX` / Cross-Tabulation)
Digunakan untuk perbandingan kategori statis atau tabulasi silang (seperti Kelompok Umur vs Agama). Fitur YoY akan dinonaktifkan, dan visualisasi akan dialihkan ke grafik batang (*Bar Chart*) per kelompok data.
```json
{
  "table_type": "CUSTOM_MATRIX",
  "features": {
    "yoy_calculation": false,
    "trend_chart": "bar",
    "expected_update_check": false
  },
  "dimensions": {
    "row_header": "Agama",
    "column_type": "TEXT",
    "column_header": "Kelompok Umur"
  }
}
```

---

### B. Usulan Redesign Skema Database (SQL)
Agar tabel data di database bersifat dinamis dan dapat menampung kolom berbasis teks (misalnya kolom `"1-5 tahun"`, `"6-10 tahun"`), kita perlu melakukan restrukturisasi relasi SQL yang semula terikat pada tipe data `DATE`.

```sql
-- 1. Mengubah kolom period_start di tabel kolom agar bisa bernilai NULL (karena tipe non-temporal tidak memiliki tanggal mulai),
--    dan menambahkan kolom column_key untuk menyimpan kode teks unik
ALTER TABLE public.data_table_view_columns 
  ALTER COLUMN period_start DROP NOT NULL,
  ADD COLUMN column_key VARCHAR(50);

-- 2. Menambahkan column_id di tabel data_points agar sel data dinilai berdasarkan relasi 
--    Baris (Indicator ID) dan Kolom (Column ID) secara generik, bukan berdasarkan tanggal.
ALTER TABLE public.data_points
  ADD COLUMN column_id UUID REFERENCES public.data_table_view_columns(id) ON DELETE CASCADE;
```

---

### C. Alur Kerja Implementasi Sistem (Workflow)

#### 1. Panel Admin (Pengisian Data)
* Saat Admin/Produsen menambahkan data tabel, sistem menyediakan pilihan **Template Tabel**:
  * `[ ] Deret Waktu (Time-Series)` -> Kolom dibatasi hanya berupa tanggal/tahun.
  * `[ ] Matriks Kustom (Custom Matrix)` -> Admin dibebaskan menginput teks kustom untuk nama kolom.
* Data konfigurasi ini otomatis disimpan ke `catalog_resources.schema_json`.

#### 2. Portal Publik (Halaman Detail Dataset)
* Komponen React (`DatasetTable.tsx` dan `DatasetDetail.tsx`) akan membaca properti `table_type` dari `schema_json`.
* **Jika `TEMPORAL`**:
  * Menghitung nilai YoY dari waktu ke waktu.
  * Menampilkan kartu ringkasan YoY (YoY Summary Card).
  * Merender grafik garis (*Line Chart*) untuk tren berkala.
* **Jika `CUSTOM_MATRIX`**:
  * Menyembunyikan komponen analisis YoY.
  * Menampilkan statistik kategori tertinggi (misalnya: *"Agama mayoritas pada umur 1-5 tahun adalah Islam"*).
  * Merender grafik batang (*Bar Chart* / *Stacked Bar Chart*) yang lebih cocok untuk data komparatif.

---

### D. Pemilih Periode Kondisional & Optimasi Label YoY (Conditional Period Picker & YoY Label Optimization)

Rancangan ini bertujuan untuk mempermudah operator saat mendefinisikan kolom waktu (*Time Periods*) dan menjamin keakuratan visual kartu ringkasan YoY di halaman detail pada format data non-tahunan.

#### 1. Input Pemilih Periode Kondisional (Conditional Picker UI)
Di dalam modal tambah periode (`PeriodsManager.tsx`), input tanggal kalender lengkap (`type="date"`) akan digantikan oleh dropdown kondisional berdasarkan pilihan `Time Grain` guna menghilangkan keharusan mencari tanggal manual di kalender:
*   **Jika Grain = `YEAR` (Tahunan)**:
    *   **UI**: Dropdown pilihan Tahun (misal: `2026`).
    *   **Ke Database (`period_start`)**: Otomatis disimpan sebagai `${Year}-01-01`.
    *   **Label Kolom**: `"2026"`.
*   **Jika Grain = `MONTH` (Bulanan)**:
    *   **UI**: Dropdown pilihan Bulan (Jan - Des) + dropdown Tahun.
    *   **Ke Database (`period_start`)**: Otomatis disimpan sebagai `${Year}-${Month}-01`.
    *   **Label Kolom**: `"May 2026"` atau `"Mei 2026"`.
*   **Jika Grain = `QUARTER` (Kuartalan)**:
    *   **UI**: Dropdown pilihan Kuartal (Q1 - Q4) + dropdown Tahun.
    *   **Ke Database (`period_start`)**: Dipetakan otomatis ke awal bulan kuartal tersebut (Q1: `01-01`, Q2: `04-01`, Q3: `07-01`, Q4: `10-01`).
    *   **Label Kolom**: `"Q2 2026"`.
*   **Jika Grain = `SEMESTER` (Semesteran)**:
    *   **UI**: Dropdown pilihan Semester (S1 - S2) + dropdown Tahun.
    *   **Ke Database (`period_start`)**: Dipetakan ke (S1: `01-01`, S2: `07-01`).
    *   **Label Kolom**: `"S1 2026"`.

#### 2. Optimasi Label Deskripsi YoY (`DatasetDetail.tsx`)
*   **Masalah Saat Ini**: Kode kalkulasi YoY pada halaman publik mengambil tahun secara paksa dari format tanggal database menggunakan `format(..., "yyyy")`. Ini memicu *visual glitch* pada data kuartalan/bulanan di mana label deskripsinya memunculkan tulisan `"from 2024 to 2024"`.
*   **Solusi Redesign**: Mengubah kode agar memuat teks label dari properti `column_label` secara langsung pada koleksi `columns` (misal: `columns[columns.length - 2].column_label`), bukan melakukan kalkulasi tanggal ulang.
*   **Hasil Akhir**: Teks deskripsi kartu YoY/PoP otomatis tampil dinamis dan presisi sempurna untuk kategori waktu apa pun, seperti:
    *   *"from Q1 2024 to Q2 2024"* (Kuartalan)
    *   *"from Jan 2024 to Feb 2024"* (Bulanan)
    *   *"from S1 2024 to S2 2024"* (Semesteran)

---

## 📊 Rencana Redesign: Visualisasi Data Lanjut & Dashboard Analitik Premium (Advanced Data Visualization & Premium Analytical Dashboard)

Rencana ini bertujuan untuk meningkatkan kelas portal dari sekadar penyedia file unduhan menjadi **Dashboard Keputusan Kebijakan Daerah (Policy Decision Dashboard)** melalui implementasi metrik analitis tingkat lanjut dan visualisasi data yang kaya (*rich data visualizations*) tanpa bergantung pada sistem kecerdasan buatan (AI).

### 1. Metrik Kontrol Utama & Wawasan Jangka Pendek (Analytical KPIs)
Menyajikan kartu ringkasan eksekutif instan di atas visualisasi data untuk memberikan gambaran kesehatan dataset:
*   **Laju Pertumbuhan Jangka Panjang (CAGR)**: Menghitung laju pertumbuhan geometris rata-rata tahunan sejak periode awal hingga akhir (menghindari anomali fluktuasi jangka pendek).
*   **Pencapaian Ekstrim (Peak & Trough Years)**: Menyorot tahun dan nilai tertinggi (*Max*) serta terendah (*Min*) sepanjang riwayat dataset secara otomatis.
*   **Baseline & Volatilitas (Median & Standar Deviasi)**: Memberikan info nilai tengah data untuk menyaring pengaruh pencilan (*outliers*) serta tingkat kestabilan data (volatilitas).

### 2. Garis Tren Prediktif & Proyeksi 2026–2027 (Predictive Trendline)
*   **Konsep**: Menambahkan perpanjangan garis tren putus-putus (*dashed line*) di ujung grafik garis historis untuk memvisualisasikan proyeksi statistik 1–2 tahun ke depan secara otomatis menggunakan pemodelan matematika regresi linear sederhana pada sisi frontend.
*   **Manfaat**: Membantu kepala dinas dan analis perencanaan daerah dalam memprediksi arah tren sosial-ekonomi Kobar (misalnya memproyeksikan laju pengangguran atau populasi) sebelum data riil tahun berjalan dipublikasikan.

### 3. Glassmorphism Stacked Area Chart (Kontribusi Indikator)
*   **Konsep**: Mengintegrasikan visualisasi `AreaChart` bertumpuk yang memiliki gradien warna semi-transparan dengan gaya estetik *glassmorphism* modern.
*   **Manfaat**: Menghilangkan masalah grafik garis yang ruwet dan saling bersilangan (*spaghetti chart*) ketika menampilkan banyak indikator sektoral (misalnya: data kontribusi sektor perikanan per kecamatan terhadap total kabupaten seiring waktu).

### 4. Small Multiples / Trellis Chart (Multi-Skala Indikator)
*   **Konsep**: Seri baris grafik mini terpisah yang sejajar untuk masing-masing indikator.
*   **Manfaat**: Menghilangkan distorsi visual ketika menampilkan beberapa indikator yang memiliki skala sumbu Y yang berbeda jauh di dalam satu chart tunggal (contoh: menggabungkan indikator PDRB dalam skala Triliun Rupiah dengan tingkat Inflasi dalam skala Persen, di mana garis persen akan terlihat benar-benar rata di dasar sumbu jika digabungkan).

### 5. Peta Spasial Tematik Kobar (Thematic Choropleth Map)
*   **Konsep**: Widget peta tematik interaktif Kabupaten Kotawaringin Barat yang terbagi atas batas wilayah administrasi kecamatan.
*   **Manfaat**: Memvisualisasikan data yang memiliki atribut regional secara geografis (contoh: memetakan tingkat kemiskinan atau pengangguran per kecamatan tahun 2025 menggunakan gradien saturasi warna dinamis dari terang ke gelap).



