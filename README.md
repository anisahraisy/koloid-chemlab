# Kimia Koloid & Kimia Permukaan (Standard S1 Kimia Murni)

Aplikasi Web Edukatif Interaktif (*Progressive Web App* / Static Single Page Application) untuk perkuliahan **Kimia Koloid dan Kimia Permukaan** tingkat Sarjana (S1) Kimia Murni. Dibangun menggunakan arsitektur Vanilla ES Modules murni tanpa ketergantungan framework pihak ketiga (*zero build step*), siap di-deploy langsung ke **GitHub Pages**.

---

## 1. Konsep & Landasan Teori Ilmiah

Aplikasi ini mencakup 5 modul utama dengan perhitungan matematis dan fisika kimia asli:

### Modul 1: Matriks Fase & Termodinamika Antarmuka (`src/views/matrix-explorer.mjs`)
- **Matriks 8 Sistem Koloid**: Sol, Sol Padat, Aerosol Cair, Aerosol Padat, Emulsi, Emulsi Padat (Gel), Buih, dan Buih Padat.
- **Termodinamika Campuran Gas-Gas**: Pembuktian termodinamika bahwa campuran gas selalu homogen ($\Delta H_{\text{mix}} \approx 0, \Delta S_{\text{mix}} > 0, \Delta G_{\text{mix}} < 0$, tidak ada tegangan antarmuka $\gamma = 0$).
- **Termodinamika Dispersi ($\Delta G = \gamma \Delta A$)**: Hubungan reduksi ukuran jari-jari $r$ terhadap peningkatan luas permukaan spesifik ($A_s = 3 / (\rho r)$) dan energi bebas Gibbs antarmuka.
- **Komparasi Liofilik vs Liofobik**: Afinitas solven, lapisan solvasi, viskositas, dan reversibilitas.

### Modul 2: Laboratorium Optik Rayleigh-Mie & Dinamika Brown (`src/views/brownian-tyndall-lab.mjs`)
- **Hamburan Rayleigh & Efek Tyndall**:
  $$I(\theta) = I_0 \frac{1 + \cos^2\theta}{2 R^2} \left(\frac{2\pi}{\lambda}\right)^4 \left(\frac{n^2 - 1}{n^2 + 2}\right)^2 \left(\frac{d}{2}\right)^6$$
  Eksperimen 3 kuvet komparatif: Larutan Sejati ($d < 1\text{ nm}$), Sistem Koloid ($1\text{ nm} \le d \le 1000\text{ nm}$), dan Suspensi Kasar ($d > 1000\text{ nm}$).
- **Difusi Stokes-Einstein & Gerak Brown**:
  $$D = \frac{k_B T}{6 \pi \eta r}$$
  Plot linier *Mean Squared Displacement* (MSD) terhadap waktu: $\langle r^2 \rangle = 4 D t$ dengan pelacakan lintasan partikel secara *real-time*.

### Modul 3: Teori DLVO & Aturan Schulze-Hardy (`src/views/dlvo-coagulation-lab.mjs`)
- **Potensial Interaksi DLVO**:
  $$V_T(h) = V_R(h) + V_A(h)$$
  - Gaya tolak lapisan ganda listrik: $V_R(h) = 2\pi \varepsilon_0 \varepsilon_r r \psi_0^2 \ln(1 + e^{-\kappa h})$
  - Gaya tarik van der Waals: $V_A(h) = -\frac{A_H r}{12 h}$
  - Panjang Debye: $\kappa = \sqrt{\frac{2 N_A e^2 I}{\varepsilon_0 \varepsilon_r k_B T}}$
- **Uji Elektrolit & Aturan Schulze-Hardy**:
  $$CCC \propto z^{-6}$$
  Simulasi keruntuhan penghalang energi $V_{\text{max}} \le 0$ dan kinetika koagulasi cepat Smoluchowski pada kation $\text{Na}^+$ ($z=1$), $\text{Ca}^{2+}$ ($z=2$), dan $\text{Al}^{3+}$ ($z=3$).
- **Struktur Lapisan Ganda Listrik (EDL)**: Lapisan permukaan kristal, Lapisan Stern, bidang geser (*slipping plane* / Potensial Zeta $\zeta$), dan Lapisan Difus Gouy-Chapman.

### Modul 4: Kimia Permukaan, CMC & Isoterm Adsorpsi (`src/views/surface-adsorption-lab.mjs`)
- **Isoterm Adsorpsi Gibbs & Miselisasi**:
  $$\Gamma = -\frac{1}{nRT} \left(\frac{\partial \gamma}{\partial \ln C}\right)_T, \quad A_{\text{min}} = \frac{1}{N_A \Gamma_{\text{max}}}$$
  Penentuan konsentrasi misel kritis (*Critical Micelle Concentration* / CMC) dan visualisasi pembentukan misel sferis.
- **Parameter Pengemasan Kritis Israelachvili ($P_c$)**:
  $$P_c = \frac{v}{a_0 l_c}$$
  Prediksi morfologi perakitan diri surfaktan: Misel Sferis ($P_c < 1/3$), Misel Silindris ($1/3 < P_c < 1/2$), Vesikel Bilayer ($1/2 < P_c \le 1$), atau Misel Terbalik ($P_c > 1$).
- **Komparasi Isoterm Adsorpsi**:
  - Langmuir: $\theta = \frac{K_L P}{1 + K_L P}$ (Monolayer homogen)
  - Freundlich: $q_e = K_F C_e^{1/n}$ (Permukaan heterogen)
  - BET: $\frac{v}{v_m} = \frac{c \cdot x}{(1 - x)(1 + (c - 1)x)}$ (Multilayer gas)
  - Fitur alih tampilan grafik non-linier dan linearisasi regresi.

### Modul 5: Diagnostik Kasus Kimia Fisika (`src/views/case-diagnostics.mjs`)
- 6 skenario komputasi kuantitatif tingkat universitas:
  1. Penentuan luas permukaan spesifik BET katalis zeolit ZSM-5.
  2. Perhitungan rasio CCC sol $\text{As}_2\text{S}_3$ dengan aturan Schulze-Hardy.
  3. Penentuan luas molekul $A_{\text{min}}$ surfaktan SDS dari data tensiometri.
  4. Penentuan diameter hidrodinamik DLS nanoemulsi via Stokes-Einstein.
  5. Waktu paruh koagulasi cepat Smoluchowski sol emas koloidal.
  6. Analisis morfologi agregat surfaktan via parameter Israelachvili.
- Dilengkapi pembahasan analitik langkah demi langkah, grafik radar kompetensi, dan penyimpanan skor otomatis di `localStorage`.

### Modul 6: Nanokoloid & Rekayasa Antarmuka (`src/views/nanocarriers-lab.mjs`)
- **Komparasi 3 Matriks Pembawa Lipofilik**:
  - **Nanopartikel Padat (NP / SLN)**: Matriks kristal rapat ($\beta$-platelet), derajat kristalinitas $85-95\%$, kapasitas muat rendah, dan fenomena *Drug Expulsion* akibat transformasi polimorfik $\alpha \to \beta$.
  - **Nanoemulsi (NE)**: Inti minyak cair isotropik tanpa kisi kristal, difusi cepat fluida (*burst release*), rawan koalesensi dan pematangan Ostwald (*Ostwald ripening*).
  - **Nanostructured Lipid Carrier (NLC)**: Campuran rasio terstruktur solid lipid : liquid lipid ($70:30$), kisi kristal amorf tidak sempurna dengan kantong-kantong nano minyak, efisiensi penjeratan ($EE\%$) tertinggi, dan stabilitas tanpa ekspulsi zat aktif (*No Drug Expulsion*).
- **Mekanisme Kimia Permukaan & Surfaktan**:
  - **Tween 80 (Non-ionik)**: Stabilisasi sterik (*steric hindrance*) dengan sikat polimer rantai polioksietilen (POE), potensial zeta netral, dan resistensi tinggi terhadap penambahan garam elektrolit.
  - **CTAB (Kationik)**: Stabilisasi elektrostatik lapisan ganda listrik (DLVO) melalui gugus amonium kuarterner bermuatan positif ($\zeta = +40 \text{ s/d } +60\text{ mV}$), sangat peka terhadap kompresi panjang Debye dan koagulasi cepat oleh garam.
  - **Sistem Sinergis Tween 80 + CTAB**: Stabilisasi elektrosterik hibrid yang tangguh pada konsentrasi garam fisiologis.
- **Fitur Simulasi Visual Interaktif**:
  - **Mode Mikro-Struktur Inti (Cross-Section 2.5D)**: Potongan melintang resolusi tinggi menampilkan kisi kristal, tetesan minyak, kantong nano amorf, orientasi kepala/ekor surfaktan, dan pelepasan/ekspulsi senyawa aktif.
  - **Mode Makro-Koloid (Multi-Particle Brownian)**: Difusi termal Stokes-Einstein, halo lapisan difus Gouy-Chapman, kompresi Debye oleh penambahan NaCl, dan pemodelan koagulasi/koalesensi interaktif.
  - **Mode Komparasi 3-in-1**: Tampilan simultan ketiga sistem dalam satu kanvas untuk analisis langsung.
  - **Uji Stabilitas Penyimpanan 6 Bulan (*Aging Test*)**: Percepatan waktu untuk menguji retensi zat aktif, pertumbuhan droplet, dan integritas dispersi koloid.
  - **Tabel Komparasi Lengkap 1 & 2**: Matriks perbandingan sifat fisikokimia pembawa dan mekanisme kimia permukaan surfaktan.

---

## 2. Struktur Proyek

```text
/
├── index.html                        # App Shell, Meta CSP, Font imports, Layout Container
├── manifest.json                     # Konfigurasi PWA lengkap
├── sw.js                             # Service Worker (Offline-first caching v3)
├── README.md                         # Dokumentasi ilmiah & panduan deploy
├── assets/
│   ├── css/
│   │   ├── tokens.css                # Palet High-Contrast Lab Paper & tipografi
│   │   ├── layout.css                # Mobile Sticky Viewport + Tablet Split-View
│   │   └── components.css            # Tactile sliders, tabel, kartu editorial, formula block
│   └── icons/
│       └── icon.svg                  # Monoline laboratory technical blueprint icon
└── src/
    ├── main.mjs                      # Bootstrap aplikasi & registrasi Service Worker
    ├── core/
    │   ├── router.mjs                # Hash router SPA (#/matrix, #/optics-brownian, #/dlvo, ...)
    │   ├── store.mjs                 # Reactive state store & persistensi nilai
    │   ├── security.mjs              # Anti-XSS DOM builder & parameter clamping
    │   └── canvas-utils.mjs          # High-DPI scaling, pointer normalization, RAF loop manager
    ├── data/
    │   ├── colloids-data.mjs         # Dataset 8 sistem koloid & parameter termodinamika
    │   ├── cases-data.mjs            # 6 studi kasus kuantitatif & rubrik penilaian
    │   └── nanocarriers-data.mjs     # Dataset komparasi NP vs NE vs NLC & Tween 80 vs CTAB
    └── views/
        ├── matrix-explorer.mjs       # Modul 1: Matriks Fase & Gibbs Antarmuka
        ├── brownian-tyndall-lab.mjs  # Modul 2: Rayleigh-Tyndall & Gerak Brown
        ├── dlvo-coagulation-lab.mjs  # Modul 3: Kurva DLVO, Potensial Zeta & Schulze-Hardy
        ├── surface-adsorption-lab.mjs# Modul 4: Gibbs Adsorpsi, CMC & Isoterm BET
        ├── nanocarriers-lab.mjs      # Modul 6: Nanokoloid & Rekayasa Antarmuka
        └── case-diagnostics.mjs      # Modul 5: Evaluasi Kasus & Radar Chart
```

---

## 3. Menjalankan Secara Lokal

Cukup jalankan web server statis sederhana pada direktori proyek:

```bash
# Menggunakan Python
python -m http.server 8085

# Atau menggunakan Node / npx
npx serve -l 8085 .
```

Buka peramban pada `http://localhost:8085`.

---

## 4. Panduan Deploy ke GitHub Pages

Aplikasi ini menggunakan modul JavaScript standar (*Vanilla ES Modules*) dengan jalur relatif (`./`), sehingga tidak membutuhkan proses kompilasi atau bundler seperti Webpack atau Vite.

1. Repositori GitHub: [`anisahraisy/koloid-chemlab`](https://github.com/anisahraisy/koloid-chemlab).
2. *Push* seluruh berkas ke repositori:
   ```bash
   git add .
   git commit -m "feat: konfigurasi berkas GitHub Pages & PWA"
   git push -u origin main
   ```
3. Buka **Settings** repositori di GitHub $\to$ **Pages** (`https://github.com/anisahraisy/koloid-chemlab/settings/pages`).
4. Pada bagian **Build and deployment**, pilih salah satu opsi:
   - **Opsi A (Rekomendasi - Otomatis via GitHub Actions)**:
     - Source: `GitHub Actions`
     - Workflow `.github/workflows/deploy.yml` akan otomatis aktif mendeploy web pada setiap push ke branch `main`.
   - **Opsi B (Klasik via Branch)**:
     - Source: `Deploy from a branch`
     - Branch: `main` / `/(root)`
     - Klik **Save**.
5. Situs web interaktif dapat diakses pada:
   **`https://anisahraisy.github.io/koloid-chemlab/`**
