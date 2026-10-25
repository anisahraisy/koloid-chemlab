/**
 * @file colloids-data.mjs
 * Authoritative scientific dataset for Colloid & Surface Chemistry (S1 Kimia Murni).
 */

export const COLLOID_SYSTEMS = [
  {
    id: 'liquid-aerosol',
    dispersedPhase: 'Cair',
    dispersionMedium: 'Gas',
    name: 'Aerosol Cair',
    examples: ['Kabut (fog)', 'Awan (clouds)', 'Semprotan insektisida aerosol', 'Uap rokok elektrik'],
    characteristics: 'Tetesan cairan terdispersi dalam fase gas. Tidak stabil secara gravitasi (cenderung mengalami sedimentasi dan koalesensi). Memiliki rasio luas permukaan terhadap volume yang sangat tinggi.',
    thermodynamics: 'ΔG_permukaan > 0 karena tegangan permukaan cairan-gas (γ_LG ~ 72.8 mN/m untuk air pada 20°C). Stabil secara kinetika akibat hambatan viskositas udara dan pelambatan laju tumbukan Brownian.',
    accent: 'var(--accent-amber)'
  },
  {
    id: 'solid-aerosol',
    dispersedPhase: 'Padat',
    dispersionMedium: 'Gas',
    name: 'Aerosol Padat',
    examples: ['Asap pembakaran (smoke/soot)', 'Debu halus vulkanik', 'Partikel PM2.5 atmosferik'],
    characteristics: 'Partikel padat tersuspensi dalam medium gas. Partikel sering bermuatan elektrostatik akibat gesekan (triboelektrik) dan mengalami agregasi menjadi struktur fraktal agregat.',
    thermodynamics: 'Energi bebas permukaan padatan sangat tinggi (γ_SG ~ 100-1000 mJ/m²). Agregasi spontan menurunkan luas antarmuka.',
    accent: 'var(--accent-amber)'
  },
  {
    id: 'foam',
    dispersedPhase: 'Gas',
    dispersionMedium: 'Cair',
    name: 'Buih Cair (Foam)',
    examples: ['Busa sabun', 'Busa bir/kopi', 'Busa pemadam kebakaran (AFFF)'],
    characteristics: 'Gelembung gas terperangkap dalam film cairan tipis (lamellae). Dibatasi oleh batas Plateau (Plateau borders). Memerlukan surfaktan untuk mencegah penipisan film dan ruptur antarmuka.',
    thermodynamics: 'Stabilitas ditentukan oleh elastisitas film Gibbs-Marangoni (E = 2A · dγ/dA) dan tekanan disjoining (disjoining pressure Π(h)).',
    accent: 'var(--accent-teal)'
  },
  {
    id: 'emulsion',
    dispersedPhase: 'Cair',
    dispersionMedium: 'Cair',
    name: 'Emulsi Cair (O/W atau W/O)',
    examples: ['Susu (lemak dalam air)', 'Mayones (minyak dalam air)', 'Minyak mentah berair (W/O)'],
    characteristics: 'Dua cairan tak saling campur (immiscible) di mana satu fase terdispersi sebagai globul mikron/submikron. Memerlukan emulgator/surfaktan.',
    thermodynamics: 'Tegangan antarmuka minyak-air (γ_OW ~ 30-50 mN/m tanpa surfaktan). Penambahan surfaktan menurunkan γ_OW hingga < 1-5 mN/m, menstabilkan kinetika emulsi.',
    accent: 'var(--accent-cobalt)'
  },
  {
    id: 'sol',
    dispersedPhase: 'Padat',
    dispersionMedium: 'Cair',
    name: 'Sol (Suspensi Koloidal)',
    examples: ['Sol emas Faraday (Au sol)', 'Sol Fe(OH)3 positif', 'Sol As2S3 negatif', 'Cat emulsi berbasis air'],
    characteristics: 'Partikel padat mikroskopis terdispersi dalam cairan. Menunjukkan gerak Brown aktif dan efek Tyndall yang nyata.',
    thermodynamics: 'Stabilitas dijelaskan oleh Teori DLVO (keseimbangan gaya tolak elektrostatik EDL dan gaya tarik van der Waals). Penambahan elektrolit menyebabkan koagulasi cepat.',
    accent: 'var(--accent-crimson)'
  },
  {
    id: 'solid-foam',
    dispersedPhase: 'Gas',
    dispersionMedium: 'Padat',
    name: 'Buih Padat (Solid Foam)',
    examples: ['Batu apung (pumice)', 'Busa poliuretan kaku', 'Aerogel silika', 'Marshmallow kering'],
    characteristics: 'Matriks berpori padat dengan sel gas tertutup (closed-cell) atau terbuka (open-cell). Sangat ringan dengan konduktivitas termal sangat rendah.',
    thermodynamics: 'Stabilitas termodinamika tercapai karena matriks padat membeku (viskositas η → ∞), mencegah drainase cairan atau penggabungan gelembung.',
    accent: 'var(--accent-teal)'
  },
  {
    id: 'gel',
    dispersedPhase: 'Cair',
    dispersionMedium: 'Padat',
    name: 'Emulsi Padat / Gel',
    examples: ['Gel agar-agar', 'Gelatin', 'Mentega/margarin', 'Gel silika desikan', 'Opal (batu mulia)'],
    characteristics: 'Jaringan polimer padat kontinu yang mengurung fase cair dalam ruang tiga dimensi. Memiliki sifat viskoelastik (bukan zat padat murni atau cairan murni).',
    thermodynamics: 'Keseimbangan antara interaksi polimer-polimer (ikatan silang/cross-link hidrogen atau kovalen) dan interaksi polimer-pelarut (tekanan osmotik pembengkakan/swelling).',
    accent: 'var(--accent-cobalt)'
  },
  {
    id: 'solid-sol',
    dispersedPhase: 'Padat',
    dispersionMedium: 'Padat',
    name: 'Sol Padat (Solid Sol)',
    examples: ['Kaca rubi emas (cranberry glass)', 'Batu permata bertabur warna (ruby, sapphire)', 'Paduan logam amorf tertentu'],
    characteristics: 'Partikel nano padat terdispersi homogen di dalam matriks padat lain. Resonansi Plasmon Permukaan (SPR) partikel nano memberikan warna spektakuler.',
    thermodynamics: 'Sangat stabil secara kinetika karena laju difusi partikel dalam padatan mendekati nol pada suhu ruang (D_padat < 10^-20 m²/s).',
    accent: 'var(--accent-crimson)'
  }
];

export const GAS_GAS_THERMODYNAMICS = {
  title: 'Mengapa Campuran Gas-Gas Tidak Pernah Membentuk Koloid?',
  enthalpy: 'ΔH_mix ≈ 0 (Gas ideal tidak memiliki gaya intermolekul netto yang signifikan pada tekanan rendah/sedang)',
  entropy: 'ΔS_mix = -R ∑ (n_i · ln x_i) > 0 (Peningkatan keacakan mikrostaste Boltzmann)',
  gibbs: 'ΔG_mix = ΔH_mix - T·ΔS_mix < 0 (Spontan pada semua suhu, T > 0 K)',
  conclusion: 'Karena ΔG_mix selalu bernilai negatif dan tidak ada energi kohesi yang membatasi pemisahan fase, molekul gas saling berdifusi sempurna secara spontan membentuk larutan sejati satu fase (homogen). Tidak ada bidang batas fase (antarmuka / interface) yang terbentuk (γ = 0), sehingga keberadaan sistem heterogen dua fase gas-gas secara termodinamika mustahil terjadi.'
};

export const LYOPHILIC_VS_LYOPHOBIC = [
  {
    parameter: 'Afinitas Antarmuka',
    lyophilic: 'Sangat tinggi (gaya tarik solven-partikel kuat, solvasi spontan)',
    lyophobic: 'Rendah/tidak ada (solven menolak partikel, tidak ada afinitas kimiawi)'
  },
  {
    parameter: 'Kestabilan Termodinamika',
    lyophilic: 'Stabil secara termodinamika (ΔG pembentukan < 0)',
    lyophobic: 'Tidak stabil secara termodinamika (ΔG pembentukan > 0, hanya stabil kinetik)'
  },
  {
    parameter: 'Viskositas Sistem',
    lyophilic: 'Jauh lebih tinggi daripada viskositas medium pendispersi murni',
    lyophobic: 'Hampir sama dengan viskositas medium pendispersi'
  },
  {
    parameter: 'Reversibilitas Sol',
    lyophilic: 'Reversibel (dapat dilarutkan kembali setelah diuapkan)',
    lyophobic: 'Ireversibel (bila terkoagulasi tidak dapat didispersikan kembali)'
  },
  {
    parameter: 'Pengaruh Elektrolit',
    lyophilic: 'Sangat stabil; butuh konsentrasi garam sangat pekat untuk "salting-out"',
    lyophobic: 'Sangat rentan terhadap koagulasi; mengikuti Aturan Schulze-Hardy (CCC ∝ z⁻⁶)'
  },
  {
    parameter: 'Contoh Nyata',
    lyophilic: 'Gelatin dalam air, larutan protein albumin, pati kanji, sol karet dalam benzena',
    lyophobic: 'Sol emas (Au), sol Fe(OH)3, sol As2S3, sol perak halida (AgI)'
  }
];

export const LIQUID_SURFACE_TENSIONS_20C = [
  { name: 'Air Murni (H₂O)', gamma: 72.8, unit: 'mN/m', rho: 998 },
  { name: 'Gliserol', gamma: 63.4, unit: 'mN/m', rho: 1261 },
  { name: 'Benzena', gamma: 28.9, unit: 'mN/m', rho: 876 },
  { name: 'Etanol Murni', gamma: 22.3, unit: 'mN/m', rho: 789 },
  { name: 'n-Heksana', gamma: 18.4, unit: 'mN/m', rho: 655 },
  { name: 'Raksa (Mercury, Hg)', gamma: 485.0, unit: 'mN/m', rho: 13546 }
];
