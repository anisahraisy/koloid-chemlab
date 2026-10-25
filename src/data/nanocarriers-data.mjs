/**
 * @file nanocarriers-data.mjs
 * Authoritative scientific dataset for Nanocolloidal Drug Delivery Systems & Surface Chemistry.
 * Solid Nanoparticles (NP/SLN) vs Nanoemulsions (NE) vs Nanostructured Lipid Carriers (NLC)
 * and Surfactant Interface Mechanisms (Tween 80 vs CTAB).
 */

export const NANOCARRIER_SYSTEMS = [
  {
    id: 'np',
    name: 'Nanopartikel Padat (Solid Nanoparticles / SLN)',
    shortName: 'NP / SLN',
    matrixType: 'Lipid Padat Murni (Kristal Sempurna)',
    coreState: 'Solid (Matriks Padat Kristalin β-Platelet)',
    crystallinity: 'Sangat Tinggi (Derajat Kristalinitas 85 - 95%)',
    entrapmentEfficiency: 58, // %
    particleSizeRange: '80 - 250 nm',
    drugReleaseProfile: 'Lambat di awal, rentan ekspulsi mendadak (Drug Expulsion)',
    instabilityPathway: 'Transformasi polimorfik α → β dan agregasi partikel padat',
    advantages: [
      'Stabilitas fisik dan proteksi zat aktif dari degradasi kimia sangat tinggi',
      'Matriks padat menahan mobilitas senyawa aktif pada suhu ruang',
      'Dapat disiapkan dari lipid fisiologis biokompatibel'
    ],
    limitations: [
      'Kapasitas muat zat aktif (Loading Capacity) rendah akibat kisi kristal yang sangat rapat',
      'Fenomena Drug Expulsion selama penyimpanan akibat merapatnya kisi kristal lipid padat',
      'Kandungan air dispersi relatif tinggi (hingga 99%)'
    ],
    colorTheme: '#38BDF8' // Cyan Crystal
  },
  {
    id: 'ne',
    name: 'Nanoemulsi Minyak-dalam-Air (Nanoemulsion - NE)',
    shortName: 'Nanoemulsi (O/W)',
    matrixType: 'Lipid Cair / Minyak Murni (Liquid Lipid Core)',
    coreState: 'Liquid (Tetesan Minyak Fluida Homogen)',
    crystallinity: '0% (Fase Cair Isotropik Tanpa Kisi Kristal)',
    entrapmentEfficiency: 78, // %
    particleSizeRange: '20 - 150 nm',
    drugReleaseProfile: 'Pelepasan sangat cepat (Burst Release) akibat difusi fluida',
    instabilityPathway: 'Koalesensi (Coalescence), Pematangan Ostwald (Ostwald Ripening), & Creaming',
    advantages: [
      'Kelarutan senyawa aktif lipofilik sangat tinggi di dalam inti minyak cair',
      'Transparansi optik tinggi dan kinetika penyerapan biologis sangat cepat',
      'Mudah diformulasikan dengan metode energi tinggi maupun rendah'
    ],
    limitations: [
      'Tidak stabil secara termodinamika (hanya stabil secara kinetika)',
      'Rentan mengalami penggabungan droplet (Coalescence) bila surfaktan berkurang',
      'Kurang mampu menahan pelepasan zat aktif untuk durasi panjang (Burst Release)'
    ],
    colorTheme: '#F59E0B' // Golden Amber
  },
  {
    id: 'nlc',
    name: 'Nanostructured Lipid Carrier (NLC - Generasi Ke-2)',
    shortName: 'NLC (Lipid Amorf)',
    matrixType: 'Campuran Terkontrol Lipid Padat + Lipid Cair (Rasio 70:30)',
    coreState: 'Semicrystalline / Amorphous (Struktur Kristal Cacat dengan Kantong Nano Minyak)',
    crystallinity: 'Rendah - Sedang (Matriks Cacat Kristal Polimorfik α/β\')',
    entrapmentEfficiency: 94, // %
    particleSizeRange: '50 - 200 nm',
    drugReleaseProfile: 'Pelepasan terkontrol & berkelanjutan (Sustained Release)',
    instabilityPathway: 'Jauh lebih resisten; stabilitas penyimpanan superior (No Drug Expulsion)',
    advantages: [
      'Kapasitas muat senyawa aktif tertinggi berkat kantong-kantong nano minyak cair di sela kristal padat',
      'Tidak terjadi Drug Expulsion selama masa simpan karena tidak membentuk kisi kristal sempurna',
      'Pelepasan zat aktif dapat dikontrol secara presisi (biphasic release profile)'
    ],
    limitations: [
      'Optimasi rasio lipid padat terhadap lipid cair memerlukan parameter kelarutan Hansen yang cermat',
      'Penentuan jenis surfaktan harus kompatibel dengan kedua fase lipid'
    ],
    colorTheme: '#10B981' // Emerald Advanced Matrix
  }
];

export const SURFACTANT_MECHANISMS = {
  'tween80': {
    id: 'tween80',
    name: 'Tween 80 (Polysorbate 80)',
    type: 'Surfaktan Non-Ionik',
    mechanismName: 'Stabilisasi Sterik (Steric Hindrance)',
    hlb: 15.0,
    headGroup: 'Polioksietilen (POE) etoksilat hidrofilik panjang bercabang (~20 unit OE)',
    tailGroup: 'Asam oleat hidrofobik tak jenuh (C17H33-COO-)',
    surfaceCharge: 'Mendekati Netral (Zeta Potential: -8 mV s/d -15 mV)',
    saltTolerance: 'Sangat Tinggi (Resisten terhadap elektrolit NaCl & CaCl2)',
    stericBarrierThickness: '5 - 12 nm (Ketebalan sikat polimer terhidrasi)',
    theoryDescription: 'Rantai polioksietilen yang panjang dan sangat terhidrasi membentuk sikat polimer (polymeric brush) yang menjulur ke fase air. Ketika dua partikel saling mendekat, kompresi rantai polimer menurunkan entropi konformasi (ΔS < 0) dan meningkatkan konsentrasi lokal segmen polimer (efek osmotik), menghasilkan tekanan osmotik balik yang menolak partikel secara lentur.',
    color: '#10B981' // Emerald Green
  },
  'ctab': {
    id: 'ctab',
    name: 'CTAB (Cetyltrimethylammonium Bromide)',
    type: 'Surfaktan Kationik',
    mechanismName: 'Stabilisasi Elektrostatik (Teori DLVO)',
    hlb: 21.4,
    headGroup: 'Gugus Amonium Kuarterner Bermuatan Positif [-N+(CH3)3]',
    tailGroup: 'Rantai alkil lurus heksadesil (C16H33-)',
    surfaceCharge: 'Sangat Positif (Zeta Potential: +40 mV s/d +60 mV)',
    saltTolerance: 'Sangat Rendah (Rentan kompresi lapisan ganda listrik & koagulasi)',
    stericBarrierThickness: '1 - 2 nm (Lapisan Stern kompak tipis)',
    theoryDescription: 'Kepala kationik bermuatan positif terorientasi rapat pada antarmuka lipid-air, menarik ion lawan Br- membentuk Lapisan Stern dan Lapisan Difus Gouy-Chapman. Kestabilan dispersi bergantung pada gaya tolak elektrostatik Coulombic (V_R). Bila konsentrasi elektrolit dinaikkan, kekuatan ionik mengkompresi panjang Debye (κ^-1 ∝ I^-1/2), meruntuhkan potensial zeta menuju 0 mV dan memicu koagulasi cepat.',
    color: '#EF4444' // Crimson / Cationic Red
  },
  'mixed': {
    id: 'mixed',
    name: 'Campuran Tween 80 + CTAB (Sistem Sinergis)',
    type: 'Kombinasi Non-Ionik & Kationik',
    mechanismName: 'Stabilisasi Elektrosterik (Electrosteric Stabilization)',
    hlb: 17.2,
    headGroup: 'Kepala kationik amonium (+) diselingi rantai polimer POE panjang',
    tailGroup: 'Campuran rantai oleat & setil tertanam di inti lipid',
    surfaceCharge: 'Positif Moderat (Zeta Potential: +25 mV s/d +35 mV)',
    saltTolerance: 'Tinggi (Dilindungi sikat sterik saat lapisan ganda listrik terkompresi)',
    stericBarrierThickness: '6 - 10 nm',
    theoryDescription: 'Sinergi tercanggih dalam rekayasa antarmuka nanokoloid: menggabungkan tolakan elektrostatik muatan positif pada jarak jauh dengan penghalang sterik rantai polimer pada jarak dekat, mencegah koagulasi bahkan di bawah konsentrasi garam fisiologis (0.9% NaCl).',
    color: '#8B5CF6' // Purple Synergy
  }
};

export const COMPARISON_TABLE_1 = [
  {
    parameter: 'Komposisi Fase Inti (Core)',
    np: '100% Lipid Padat pada suhu ruang (asam stearat, setil palmitat, tripalmitin)',
    ne: '100% Lipid Cair / Minyak (trigliserida rantai sedang MCT, minyak zaitun/jagung)',
    nlc: 'Campuran terstruktur Solid Lipid + Liquid Lipid (misal 70% Precirol + 30% Miglyol)'
  },
  {
    parameter: 'Struktur Kristalinitas',
    np: 'Sangat teratur, kristal sempurna (polimorfik β)',
    ne: 'Tidak ada (amorf cairan isotropik)',
    nlc: 'Kristal tidak sempurna / amorf terganggu (polimorfik α atau β\')'
  },
  {
    parameter: 'Kapasitas Muat Zat Aktif (LC)',
    np: 'Rendah (terbatas pada cacat kristal yang sempit)',
    ne: 'Tinggi (zat aktif larut baik dalam inti minyak cair)',
    nlc: 'Sangat Tinggi (kombinasi kantong nano minyak & matriks amorf)'
  },
  {
    parameter: 'Risiko Drug Expulsion (Aging)',
    np: 'Sangat Tinggi (merapatnya kisi kristal mendorong zat aktif keluar)',
    ne: 'Tidak ada (namun rentan kebocoran difusi cepat / burst release)',
    nlc: 'Sangat Rendah / Nihil (zat aktif tetap terkunci di kantong nano minyak)'
  },
  {
    parameter: 'Profil Pelepasan (Drug Release)',
    np: 'Pelepasan awal lambat lalu tidak stabil',
    ne: 'Pelepasan cepat (Burst Release tak terkontrol)',
    nlc: 'Pelepasan terkontrol & berkelanjutan (Sustained Biphasic Release)'
  },
  {
    parameter: 'Mekanisme Kerusakan Utama',
    np: 'Agregasi partikel padat & kristalisasi ulang',
    ne: 'Koalesensi (Coalescence) & Pematangan Ostwald (Ostwald Ripening)',
    nlc: 'Sangat stabil; tahan terhadap koalesensi dan sedimentasi'
  }
];

export const COMPARISON_TABLE_2 = [
  {
    parameter: 'Nama Surfaktan & Tipe',
    tween80: 'Tween 80 (Polysorbate 80) • Non-Ionik',
    ctab: 'CTAB (Cetyltrimethylammonium Bromide) • Kationik'
  },
  {
    parameter: 'Gugus Kepala Hidrofilik',
    tween80: 'Polioksietilen (POE) panjang hidrofilik bercabang',
    ctab: 'Amonium kuarterner [-N+(CH3)3] bermuatan positif'
  },
  {
    parameter: 'Mekanisme Stabilisasi Koloid',
    tween80: 'Stabilisasi Sterik (Efek osmotik & restriksi entropik rantai polimer)',
    ctab: 'Stabilisasi Elektrostatik (Tolakan Coulombic Lapisan Ganda / Teori DLVO)'
  },
  {
    parameter: 'Potensial Zeta Permukaan (ζ)',
    tween80: 'Mendekati Netral / Sedikit Negatif (-8 hingga -15 mV)',
    ctab: 'Sangat Positif (+40 hingga +60 mV)'
  },
  {
    parameter: 'Resistensi Terhadap Garam (NaCl)',
    tween80: 'Sangat Tinggi (Sikat polimer sterik tidak terpengaruh kekuatan ionik)',
    ctab: 'Sangat Rendah (Lapisan difus terkompresi, memicu koagulasi cepat)'
  },
  {
    parameter: 'Nilai HLB & Biokompatibilitas',
    tween80: 'HLB = 15.0 • Biokompatibilitas tinggi, standar sediaan farmasi/injeksi',
    ctab: 'HLB = 21.4 • Memiliki aktivitas sitotoksik / antibakteri membran'
  }
];
