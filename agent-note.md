# ROLE & PERSONA
Bertindaklah sebagai **Senior Frontend Developer (Spesialis Simulasi Fisika-Kimia HTML5 Canvas / WebGL)** sekaligus **Ahli Kimia Fisik & Nanoteknologi (Sistem Koloid & Kimia Permukaan)**. 

# KONTEKS PROYEK
Saya sedang mengembangkan dan merevisi web edukasi interaktif bernama **"WEB COLLOID-CHEMLAB"** yang membahas materi **"Sistem Kimia Koloid & Permukaan"**. Web ini sudah di-deploy, dan saat ini saya ingin menambahkan **Modul Baru (Ekspansi Materi & Simulasi Interaktif)** yang berfokus pada perbandingan sistem koloid skala nano berbasis riset pengembangan karier saya di bidang Kimia Fisik:
1. **Nanopartikel Padat (Solid Nanoparticles - NP)** (misal: Nanopartikel anorganik/polimerik atau *Solid Lipid Nanoparticles* / SLN dengan matriks padat kristal sempurna).
2. **Nanoemulsi (Nanoemulsion - NE)** (sistem dispersi koloid *oil-in-water* O/W atau W/O dengan inti *liquid lipid* / minyak cair).
3. **Nanostructured Lipid Carrier (NLC)** (sistem penghantaran generasi kedua yang terdiri dari campuran *solid lipid* dan *liquid lipid* yang membentuk matriks amorf/kristal tidak sempurna).

# TUJUAN UTAMA (DELIVERABLES)
Buat dan integrasikan sebuah modul halaman/komponen baru yang berisi **Materi Edukasi Terstruktur**, **Simulasi Visual Kanvas Interaktif (Real-time Canvas)**, dan **Dashboard Parameter Kimia Permukaan** yang membandingkan ketiganya secara berdampingan (*side-by-side* atau *interactive switcher*) berdasarkan teori Kimia Koloid & Permukaan yang akurat.

---

# SPESIFIKASI SAINTIFIK & VISUALISASI KANVAS (WAJIB AKURAT SECARA TEORI)

Buat simulasi interaktif menggunakan **HTML5 Canvas API (60 FPS)** dengan dua mode tampilan (*View Toggle*): **Mode Makro-Koloid (Multi-Partikel)** dan **Mode Mikro-Struktur Inti (Cross-Section Satu Partikel + Antarmuka Surfaktan)**.

### 1. Mode Mikro-Struktur Inti & Kimia Permukaan (Cross-Section View)
Visualisasikan potongan melintang (2D/2.5D) dari satu partikel koloid lengkap dengan lapisan antarmuka permukaan (*surface interface*):
* **Nanopartikel Padat (NP / SLN):**
  * **Inti (Core):** Gambarkan kisi kristal padat yang sangat teratur dan rapat (*highly ordered crystalline lattice* / bentuk *brick-wall*).
  * **Enkapsulasi Senyawa Aktif (*Drug/Active Loading*):** Karena kisi kristal terlalu rapat, tunjukkan ruang muatan (*loading capacity*) yang sempit dan animasikan fenomena **Drug Expulsion** (terdorongnya molekul aktif keluar dari kisi kristal saat terjadi transisi polimorfik selama penyimpanan).
  * **Permukaan:** Dikelilingi oleh lapisan penstabil (surfaktan/polimer atau lapisan muatan permukaan).
* **Nanoemulsi (NE):**
  * **Inti (Core):** Gambarkan fase *liquid lipid* (tetesan minyak cair homogen) dengan molekul di dalamnya yang bergerak bebas secara dinamis (viskositas rendah, difusi cepat).
  * **Antarmuka (Interface):** Dikelilingi oleh **monolayer surfaktan** dan **ko-surfaktan** (visualisasikan kepala hidrofilik menghadap fase air luar dan ekor hidrofobik masuk ke fase minyak dalam).
  * **Enkapsulasi Senyawa Aktif:** Kelarutan senyawa lipofilik tinggi di dalam minyak cair, namun tunjukkan laju pelepasan (*release rate*) yang cepat karena difusi cairan yang mudah.
* **Nanostructured Lipid Carrier (NLC):**
  * **Inti (Core):** Gambarkan matriks campuran **Solid Lipid + Liquid Lipid (Minyak)**. Buat visualisasi struktur kristal yang tidak sempurna (*imperfect crystal / amorphous matrix*) di mana terdapat kantong-kantong nano *liquid lipid* di sela-sela matriks *solid lipid*.
  * **Enkapsulasi Senyawa Aktif:** Tunjukkan molekul senyawa aktif yang tersimpan stabil di dalam celah/kantong *liquid lipid* dan ketidakteraturan matriks kristal. Berikan indikator visual bahwa **tidak terjadi ekspulsi senyawa aktif (No Drug Expulsion)** dan kapasitas muat (*entrapment efficiency*) jauh lebih tinggi.
  * **Antarmuka:** Dikelilingi oleh monolayer surfaktan pengemulsi pada antarmuka lipid-air.

### 2. Mode Makro-Koloid & Stabilitas Termodinamika/Kinetika (Multi-Particle View)
Visualisasikan ratusan partikel nano (ukuran $20 - 200\text{ nm}$) yang bergerak di dalam medium pendispersi air:
* **Gerak Brown (Brownian Motion):** Terapkan pergerakan stokastik berbasis persamaan **Stokes-Einstein** ($D = \frac{k_B T}{6\pi \eta r}$), di mana kecepatan getaran partikel merespons perubahan Suhu ($T$) dan ukuran jari-jari hidrodinamik ($r$).
* **Lapisan Ganda Listrik (Electrical Double Layer / EDL) & Potensial Zeta ($\zeta$):** Berikan visualisasi cincin halo gradien di sekitar tiap partikel yang merepresentasikan *Stern Layer* dan *Diffuse Layer*. Ketebalan cincin ini berubah sesuai nilai Potensial Zeta ($\text{mV}$) dan kekuatan ionik larutan.
* **Mekanisme Ketidakstabilan Koloid (Simulasi Interaktif):**
  * Pada **Nanoemulsi**: Jika surfaktan kurang atau suhu dinaikkan ekstrem, simulasikan fenomena **Ostwald Ripening** (partikel kecil menyusut dan berdifusi ke partikel besar) dan **Coalescence** (dua tetesan cair menyatu menjadi satu tetesan besar secara ireversibel).
  * Pada **Nanopartikel Padat & NLC**: Jika Potensial Zeta mendekati $0\text{ mV}$ (titik isoelektrik / penambahan elektrolit sesuai teori **DLVO**), simulasikan **Flokulasi/Agregasi** (partikel padat menempel membentuk kluster tanpa melebur menjadi satu tetesan bulat karena intinya memiliki komponen matriks padat).

---

# FITUR INTERAKTIF & PANEL KONTROL (UI/UX)

Sediakan **Control Panel** di samping atau bawah kanvas dengan *slider* dan *button* yang langsung memicu perubahan *real-time* pada kanvas dan metrik data:

1. **System Selector Tabs:** Tombol perpindahan cepat antara `[Nanopartikel Padat]`, `[Nanoemulsi]`, `[NLC (Nanostructured Lipid Carrier)]`, dan `[Mode Komparasi 3-in-1]`.
2. **Slider Rasio Lipid Padat : Lipid Cair (Khusus Eksplorasi Transisi):** 
   * $100:0$ = Nanopartikel Lipid Padat (Kristal Rapat, *Drug Expulsion* tinggi).
   * $70:30$ = **NLC Optimal** (Matriks Imperfect/Amorf, *Drug Loading* maksimal, stabil).
   * $0:100$ = **Nanoemulsi** (Tetesan Cair, rawan *Coalescence* & *Ostwald Ripening*).
3. **Slider Konsentrasi Surfaktan (% w/v):** Menunjukkan penurunan **Tegangan Antarmuka ($\gamma$)** (Laplace Pressure $\Delta P = \frac{2\gamma}{r}$), pengecilan ukuran droplet/partikel, dan pembentukan lapisan pelindung sterik/elektrostatik.
4. **Slider Potensial Zeta / Kekuatan Ionik ($\text{mV}$):** Rentang $-60\text{ mV}$ hingga $0\text{ mV}$. Tampilkan indikator zona stabil ($|\zeta| > 30\text{ mV}$) vs zona koagulasi/flokulasi ($|\zeta| < 15\text{ mV}$) lengkap dengan mini-grafik kurva energi potensial **DLVO** ($V_{total} = V_{vdW} + V_{elec}$).
5. **Simulasi Uji Penyimpanan (Storage Stability / Aging Test Button):** Tombol *"Simulasikan Penyimpanan 6 Bulan"* yang mempercepat waktu untuk memperlihatkan:
   * NP Padat/SLN mengalami kristalisasi ulang & mengeluarkan zat aktif (*expulsion*).
   * Nanoemulsi mengalami pembesaran ukuran droplet (*Ostwald ripening/coalescence*) & pelepasan cepat.
   * NLC tetap mempertahankan zat aktif di dalam matriksnya dengan ukuran partikel yang stabil.

---

# KONTEN MATERI & TABEL KOMPARASI (KOMPONEN EDUKASI)

Sertakan bagian kartu informasi interaktif (*Interactive Accordion / Cards*) dan **Tabel Perbandingan Komprehensif** yang memuat parameter Kimia Koloid & Permukaan berikut:
* **Fase Terdispersi (Inti):** Padatan kristal/polimer (NP) vs Cairan minyak/lipid cair (NE) vs Campuran lipid padat & cair tak beraturan (NLC).
* **Sifat Kimia Permukaan & Antarmuka:** Peran tegangan antarmuka ($\gamma$), surfaktan/ko-surfaktan, nilai HLB (*Hydrophilic-Lipophilic Balance*), dan stabilisasi elektrostatik (Potensial Zeta) vs sterik.
* **Derajat Kristalinitas & Polimorfisme:** Tinggi/Kristal $\beta$ (NP/SLN) vs Tidak ada/Cair (NE) vs Rendah/Matriks amorf $\alpha/\beta'$ (NLC).
* **Kapasitas Muat (*Loading Capacity*) & Retensi Zat Aktif:** Rendah & rawan ekspulsi (NP/SLN) vs Tinggi tapi *burst release*/bocor cepat (NE) vs Sangat Tinggi & pelepasan terkontrol/*sustained release* (NLC).
* **Jalur Ketidakstabilan Utama:** Agregasi/Sedimentasi & transisi polimorfik (NP) vs *Ostwald Ripening*, *Coalescence*, & *Creaming* (NE) vs Jauh lebih stabil terhadap *coalescence* dan ekspulsi (NLC).

---

# INSTRUKSI TEKNIS & DESAIN KODE
1. **Desain Visual:** Gunakan tema **Modern Scientific Dark/Glassmorphism UI** (selaras dengan dashboard laboratorium kimia modern) dengan palet warna kontras tinggi untuk membedakan komponen:
   * Fase Air (Medium Pendispersi): Biru tua transparan.
   * Lipid Padat / Matriks Kristal: Cyan / Biru Kristal tegas berbentuk geometris/heksagonal.
   * Lipid Cair (Minyak): Kuning keemasan / Amber cair.
   * Surfaktan: Kepala hidrofilik (bulat putih/hijau neon) + ekor hidrofobik (garis bergelombang masuk ke fase lipid).
   * Molekul Zat Aktif (*Active Compound*): Titik berpendar (*glowing magenta/emerald*).
2. **Kualitas Kode:** 
   * Tulis kode yang modular, bersih, terdokumentasi dengan komentar fisika/kimia yang jelas pada fungsi kalkulasi (misal: fungsi `updateBrownianMotion()`, `calculateDLVOPotential()`, `drawCoreMatrix()`).
   * Pastikan kanvas bersifat **Responsive** (menyesuaikan `devicePixelRatio` agar tajam di layar Retina/HD dan tidak pecah).
   * Sertakan *legend* (keterangan warna/simbol) langsung di sudut kanvas dan *tooltip* saat kursor diarahkan ke komponen partikel.

Tolong periksa struktur kode project yang sudah ada di workspace terlebih dahulu, lalu buatkan implementasi lengkap (HTML/CSS/JS atau komponen framework yang sesuai dengan project ini) tanpa menggunakan placeholder kosong.