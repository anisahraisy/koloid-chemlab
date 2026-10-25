/**
 * @file matrix-explorer.mjs
 * Modul 1: Termodinamika Sistem Disperse & Matriks Fase
 * Standard S1 Kimia Murni
 */

import { createElement, clampNumber, formatScientific } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager, getPointerPos } from '../core/canvas-utils.mjs';
import { COLLOID_SYSTEMS, GAS_GAS_THERMODYNAMICS, LYOPHILIC_VS_LYOPHOBIC, LIQUID_SURFACE_TENSIONS_20C } from '../data/colloids-data.mjs';

export function createMatrixExplorerView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;

  // State
  let activeTab = 'matrix'; // 'matrix' | 'thermo' | 'lyophilic'
  let selectedSystemId = 'sol';
  let isGasGas = false;

  // Thermodynamics calculation state
  let particleRadiusNm = 20; // 2 nm to 1000 nm
  let selectedLiquidIndex = 0; // Water (72.8 mN/m)
  let bulkMassGram = 1.0;

  // Simulation particles
  let particles = [];
  const PARTICLE_COUNT = 65;

  function initParticles(width, height) {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        baseR: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        color: '#D97706'
      });
    }
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    // Clear canvas
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    if (activeTab === 'thermo') {
      renderThermodynamicsCanvas(ctx, width, height, time);
      return;
    }

    if (isGasGas) {
      renderGasGasCanvas(ctx, width, height, time);
      return;
    }

    renderColloidSystemCanvas(ctx, width, height, time, dt);
  }

  function renderColloidSystemCanvas(ctx, width, height, time, dt) {
    const sys = COLLOID_SYSTEMS.find(s => s.id === selectedSystemId) || COLLOID_SYSTEMS[4];

    // Background container simulation
    ctx.save();

    // Cuvette / vessel boundary lines
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 25, width - 60, height - 50);

    // Grid coordinates
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 30; x < width - 60; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 25);
      ctx.lineTo(x, height - 25);
      ctx.stroke();
    }

    // Medium representation
    if (sys.dispersionMedium === 'Cair') {
      ctx.fillStyle = 'rgba(29, 78, 216, 0.05)';
      ctx.fillRect(30, 25, width - 60, height - 50);
    } else if (sys.dispersionMedium === 'Padat') {
      ctx.fillStyle = 'rgba(113, 113, 122, 0.08)';
      ctx.fillRect(30, 25, width - 60, height - 50);
    }

    // Render particles according to system type
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Update positions with Brownian drift
      p.x += p.vx + Math.sin(time * 0.002 + p.phase) * 0.4;
      p.y += p.vy + Math.cos(time * 0.002 + p.phase) * 0.4;

      // Wall bounce
      if (p.x < 35) { p.x = 35; p.vx *= -1; }
      if (p.x > width - 35) { p.x = width - 35; p.vx *= -1; }
      if (p.y < 30) { p.y = 30; p.vy *= -1; }
      if (p.y > height - 30) { p.y = height - 30; p.vy *= -1; }

      ctx.save();
      if (sys.id === 'foam' || sys.id === 'solid-foam') {
        // Gas bubbles with thin surfactant / liquid border
        ctx.strokeStyle = '#0F766E';
        ctx.lineWidth = 1.6;
        ctx.fillStyle = 'rgba(15, 118, 110, 0.15)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseR * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (sys.id === 'emulsion' || sys.id === 'gel') {
        // Droplets with polar head markers
        ctx.fillStyle = 'rgba(217, 119, 6, 0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseR * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F2EFE9';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Sol or Aerosol solid core
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseR, 0, Math.PI * 2);
        ctx.fill();

        // Solvation shell
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseR + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Watermark tag in canvas
    ctx.fillStyle = '#8E8A82';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${sys.name.toUpperCase()} [${sys.dispersedPhase} dalam ${sys.dispersionMedium}]`, width - 40, height - 35);

    ctx.restore();
  }

  function renderGasGasCanvas(ctx, width, height, time) {
    ctx.save();
    // Continuous homogeneous gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Fast moving gas molecules with no interfacial boundaries
    for (let i = 0; i < 70; i++) {
      const x = (i * 47 + time * 0.08) % width;
      const y = (i * 31 + Math.sin(time * 0.003 + i) * 80 + height * 0.5) % height;
      ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stamp: ΔG_mix < 0
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 16px "Newsreader", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sistem Homogen 1 Fase (Bukan Koloid)', width / 2, height / 2 - 25);

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText('ΔG_mix = ΔH_mix - T·ΔS_mix < 0 | γ_antarmuka = 0 mN/m', width / 2, height / 2 + 5);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Molekul gas saling campur spontan (entropi maksimum, tanpa bidang batas fase)', width / 2, height / 2 + 28);

    ctx.restore();
  }

  function renderThermodynamicsCanvas(ctx, width, height, time) {
    ctx.save();
    const liquid = LIQUID_SURFACE_TENSIONS_20C[selectedLiquidIndex] || LIQUID_SURFACE_TENSIONS_20C[0];
    
    // Calculations
    const rMeters = particleRadiusNm * 1e-9;
    const rho = liquid.rho; // kg/m^3
    const massKg = (bulkMassGram * 1e-3);
    const volumeTotal = massKg / rho;
    const volSingle = (4 / 3) * Math.PI * Math.pow(rMeters, 3);
    const numParticles = volumeTotal / volSingle;
    const areaSingle = 4 * Math.PI * Math.pow(rMeters, 2);
    const totalAreaM2 = numParticles * areaSingle; // = 3 * volumeTotal / rMeters
    const specificAreaM2g = totalAreaM2 / bulkMassGram;
    const deltaGJoules = (liquid.gamma * 1e-3) * totalAreaM2;

    // Split Canvas: Left side is Visual Fragmentation, Right side is Live Metric Gauge
    const splitX = Math.min(width * 0.45, 260);

    // Left pane: Particle fragmentation visual
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
    ctx.strokeRect(20, 20, splitX - 30, height - 40);

    // Draw center nanoparticle
    const cx = 20 + (splitX - 30) / 2;
    const cy = height / 2;
    const displayRadius = Math.max(4, Math.min(60, 4 + (particleRadiusNm / 1000) * 56));

    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(cx, cy, displayRadius, 0, Math.PI * 2);
    ctx.fill();

    // Radiating surface energy halo
    const glow = ctx.createRadialGradient(cx, cy, displayRadius, cx, cy, displayRadius + 18);
    glow.addColorStop(0, 'rgba(217, 119, 6, 0.4)');
    glow.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, displayRadius + 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FBF9F5';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${particleRadiusNm} nm`, cx, cy + displayRadius + 22);

    // Right pane: Thermodynamics Metrics HUD
    const rx = splitX + 10;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 14px "Newsreader", serif';
    ctx.fillText('Termodinamika Antarmuka (ΔG = γ·ΔA)', rx, 40);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#A1A1AA';
    ctx.fillText('CAIRAN: ' + liquid.name.toUpperCase(), rx, 65);
    ctx.fillText(`TEGANGAN PERMUKAAN (γ): ${liquid.gamma} mN/m`, rx, 85);
    ctx.fillText(`MASSA SAMPEL: ${bulkMassGram.toFixed(2)} g | MASSA JENIS: ${rho} kg/m³`, rx, 105);

    // Bar: Luas Permukaan Spesifik As
    ctx.fillStyle = '#D97706';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`Luas Spesifik (As): ${formatScientific(specificAreaM2g, 2)} m²/g`, rx, 140);
    
    // Bar: Energi Bebas Gibbs Antarmuka ΔG
    ctx.fillStyle = '#1D4ED8';
    ctx.fillText(`Energi Antarmuka (ΔG): +${formatScientific(deltaGJoules, 3)} Joule`, rx, 175);

    // Number of particles created
    ctx.fillStyle = '#0F766E';
    ctx.fillText(`Jumlah Partikel: ${formatScientific(numParticles, 2)} partikel`, rx, 210);

    // Conclusion banner
    ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
    ctx.fillRect(rx, height - 75, width - rx - 20, 50);
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.strokeRect(rx, height - 75, width - rx - 20, 50);

    ctx.fillStyle = '#F59E0B';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('KESIMPULAN TERMODINAMIKA S1 KIMIA FISIKA:', rx + 10, height - 55);
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#D4D4D8';
    ctx.fillText('ΔG > 0 membuktikan sistem koloid liofobik tidak stabil termodinamik,', rx + 10, height - 40);
    ctx.fillText('namun dapat dipertahankan melalui kestabilan kinetik (penghalang energi).', rx + 10, height - 28);

    ctx.restore();
  }

  function updateHUD(hudContainer) {
    if (!hudContainer) return;
    hudContainer.innerHTML = '';

    if (activeTab === 'thermo') {
      const liquid = LIQUID_SURFACE_TENSIONS_20C[selectedLiquidIndex] || LIQUID_SURFACE_TENSIONS_20C[0];
      const rM = particleRadiusNm * 1e-9;
      const vol = (bulkMassGram * 1e-3) / liquid.rho;
      const totalArea = (3 * vol) / rM;
      const specificArea = totalArea / bulkMassGram;
      const dG = (liquid.gamma * 1e-3) * totalArea;

      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Jari-Jari (r): '),
        createElement('span', { className: 'val' }, `${particleRadiusNm} nm`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Luas Spesifik: '),
        createElement('span', { className: 'val' }, `${formatScientific(specificArea, 2)} m²/g`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'ΔG: '),
        createElement('span', { className: 'val' }, `+${formatScientific(dG, 3)} J`)
      ]));
    } else if (isGasGas) {
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Fase: '),
        createElement('span', { className: 'val' }, 'Gas - Gas')
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Status: '),
        createElement('span', { className: 'val' }, '1 Fase Homogen')
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'ΔG_mix: '),
        createElement('span', { className: 'val' }, '< 0 (Spontan)')
      ]));
    } else {
      const sys = COLLOID_SYSTEMS.find(s => s.id === selectedSystemId) || COLLOID_SYSTEMS[4];
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Sistem: '),
        createElement('span', { className: 'val' }, sys.name)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Dispersi: '),
        createElement('span', { className: 'val' }, `${sys.dispersedPhase} / ${sys.dispersionMedium}`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Tipe: '),
        createElement('span', { className: 'val' }, 'Heterogen 2 Fase')
      ]));
    }
  }

  function renderControlDeck(deckContainer, hudContainer) {
    deckContainer.innerHTML = '';

    // Header Kicker & Title
    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul 01 • Kimia Koloid'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Sistem Disperse & Termodinamika'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Eksplorasi matriks 8 sistem koloid, analisis termodinamika mengapa fase gas-gas tidak pernah membentuk koloid, serta perhitungan peningkatan energi bebas permukaan Gibbs (ΔG = γΔA).'
    ));

    // Tab Navigation
    const tabs = [
      { id: 'matrix', label: '8 Sistem Koloid' },
      { id: 'thermo', label: 'Termodinamika (ΔG = γΔA)' },
      { id: 'lyophilic', label: 'Liofilik vs Liofobik' }
    ];

    const tabDeck = createElement('div', { className: 'tab-deck' });
    tabs.forEach(t => {
      const btn = createElement('button', {
        className: `tab-btn ${activeTab === t.id ? 'active' : ''}`,
        onClick: () => {
          activeTab = t.id;
          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, t.label);
      tabDeck.appendChild(btn);
    });
    deckContainer.appendChild(tabDeck);

    // Tab Contents
    if (activeTab === 'matrix') {
      renderMatrixTab(deckContainer, hudContainer);
    } else if (activeTab === 'thermo') {
      renderThermoTab(deckContainer, hudContainer);
    } else {
      renderLyophilicTab(deckContainer);
    }
  }

  function renderMatrixTab(deckContainer, hudContainer) {
    // 3x3 Phase Matrix Selector
    const matrixCard = createElement('div', { className: 'editorial-card' });
    matrixCard.appendChild(createElement('div', { className: 'card-header' }, [
      createElement('h3', { className: 'card-title' }, 'Matriks Fase Terdispersi vs Medium Pendispersi'),
      createElement('span', { className: 'card-tag' }, '8 Sistem')
    ]));

    // Matrix Table Grid
    const tableWrap = createElement('div', { className: 'editorial-table-wrap' });
    const table = createElement('table', { className: 'editorial-table' });
    
    // Header row
    const thead = createElement('thead');
    thead.appendChild(createElement('tr', {}, [
      createElement('th', {}, 'Terdispersi \\ Medium'),
      createElement('th', {}, 'Gas'),
      createElement('th', {}, 'Cair'),
      createElement('th', {}, 'Padat')
    ]));
    table.appendChild(thead);

    const tbody = createElement('tbody');
    const phases = ['Gas', 'Cair', 'Padat'];

    phases.forEach(disp => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { style: { fontWeight: '600' } }, disp));

      phases.forEach(med => {
        if (disp === 'Gas' && med === 'Gas') {
          // Gas-Gas button
          const btn = createElement('button', {
            className: `btn btn-sm ${isGasGas ? 'btn-primary' : 'btn-secondary'}`,
            style: { width: '100%', fontSize: '11px', borderColor: 'var(--accent-crimson)' },
            onClick: () => {
              isGasGas = true;
              selectedSystemId = null;
              renderControlDeck(deckContainer, hudContainer);
              updateHUD(hudContainer);
            }
          }, 'Gas-Gas (1 Fase)');
          tr.appendChild(createElement('td', {}, btn));
        } else {
          const sys = COLLOID_SYSTEMS.find(s => s.dispersedPhase === disp && s.dispersionMedium === med);
          if (sys) {
            const isSelected = !isGasGas && selectedSystemId === sys.id;
            const btn = createElement('button', {
              className: `btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`,
              style: { width: '100%', fontSize: '11px' },
              onClick: () => {
                isGasGas = false;
                selectedSystemId = sys.id;
                renderControlDeck(deckContainer, hudContainer);
                updateHUD(hudContainer);
              }
            }, sys.name);
            tr.appendChild(createElement('td', {}, btn));
          }
        }
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    matrixCard.appendChild(tableWrap);
    deckContainer.appendChild(matrixCard);

    // Selected Info Details Card
    if (isGasGas) {
      const gasCard = createElement('div', { className: 'editorial-card accent-crimson' });
      gasCard.appendChild(createElement('h3', { className: 'card-title' }, GAS_GAS_THERMODYNAMICS.title));
      
      const formula = createElement('div', { className: 'formula-block' }, [
        createElement('div', { className: 'formula-tex' }, 'ΔG_mix = ΔH_mix - T·ΔS_mix < 0'),
        createElement('div', { className: 'formula-caption' }, 'Karena ΔH_mix ≈ 0 dan ΔS_mix > 0, energi bebas Gibbs selalu negatif pada T > 0 K.')
      ]);
      gasCard.appendChild(formula);

      gasCard.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
        GAS_GAS_THERMODYNAMICS.conclusion
      ));
      deckContainer.appendChild(gasCard);
    } else {
      const sys = COLLOID_SYSTEMS.find(s => s.id === selectedSystemId) || COLLOID_SYSTEMS[4];
      const detailCard = createElement('div', { className: 'editorial-card accent-amber' });
      detailCard.appendChild(createElement('div', { className: 'card-header' }, [
        createElement('h3', { className: 'card-title' }, sys.name),
        createElement('span', { className: 'badge badge-amber' }, `${sys.dispersedPhase} dalam ${sys.dispersionMedium}`)
      ]));

      detailCard.appendChild(createElement('p', { style: { fontSize: '13.5px', color: 'var(--text-secondary)' } }, sys.characteristics));

      // Formula block
      detailCard.appendChild(createElement('div', { className: 'formula-block' }, [
        createElement('div', { className: 'formula-tex' }, 'ΔG = γ · ΔA  |  As = 3 / (ρ · r)'),
        createElement('div', { className: 'formula-caption' }, sys.thermodynamics)
      ]));

      // Examples list
      const exBlock = createElement('div', { style: { marginTop: '8px' } }, [
        createElement('div', { style: { fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }, children: 'Contoh Nyata Laboratorium & Alam:' }),
        createElement('ul', { style: { paddingLeft: '18px', marginTop: '4px', fontSize: '13px', color: 'var(--text-primary)' } }, 
          sys.examples.map(ex => createElement('li', {}, ex))
        )
      ]);
      detailCard.appendChild(exBlock);
      deckContainer.appendChild(detailCard);
    }
  }

  function renderThermoTab(deckContainer, hudContainer) {
    const calcCard = createElement('div', { className: 'editorial-card' });
    calcCard.appendChild(createElement('h3', { className: 'card-title' }, 'Kalkulator Termodinamika Antarmuka (ΔG = γ · ΔA)'));
    calcCard.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
      'Simulasikan bagaimana pemecahan fase ruah (bulk) menjadi jutaan partikel koloidal meningkatkan luas antarmuka secara eksponensial dan menaikkan energi bebas Gibbs permukaan.'
    ));

    // Liquid Selector
    const liquidGroup = createElement('div', { className: 'control-group' });
    liquidGroup.appendChild(createElement('label', { className: 'control-label' }, 'Pilih Cairan Pendispersi / Fase Terdispersi:'));
    
    const segControl = createElement('div', { className: 'segmented-control' });
    LIQUID_SURFACE_TENSIONS_20C.slice(0, 4).forEach((liq, idx) => {
      const btn = createElement('button', {
        className: `segmented-btn ${selectedLiquidIndex === idx ? 'active' : ''}`,
        onClick: () => {
          selectedLiquidIndex = idx;
          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, liq.name.split(' ')[0]);
      segControl.appendChild(btn);
    });
    liquidGroup.appendChild(segControl);
    calcCard.appendChild(liquidGroup);

    // Particle Radius Slider
    const rGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    rGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, [
        'Jari-Jari Partikel ',
        createElement('span', { className: 'control-symbol' }, '(r)')
      ]),
      createElement('span', { className: 'control-value-readout' }, `${particleRadiusNm} nm`)
    ]));

    const rSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '2',
      max: '500',
      value: String(particleRadiusNm),
      onInput: (e) => {
        particleRadiusNm = clampNumber(e.target.value, 2, 500, 20);
        const valEl = rGroup.querySelector('.control-value-readout');
        if (valEl) valEl.textContent = `${particleRadiusNm} nm`;
        updateHUD(hudContainer);
      }
    });
    rGroup.appendChild(rSlider);
    rGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '2 nm (Nanokoloid)'),
      createElement('span', {}, '100 nm'),
      createElement('span', {}, '500 nm (Batas Makro)')
    ]));
    calcCard.appendChild(rGroup);

    // Theoretical Explanation Box
    const theoryBox = createElement('div', { className: 'formula-block', style: { marginTop: '16px' } }, [
      createElement('div', { className: 'formula-tex' }, 'As = 3 / (ρ · r)   dan   ΔG = γ · As · m'),
      createElement('div', { className: 'formula-caption' }, 
        'Ketika r mengecil dari 1 µm ke 10 nm, luas permukaan spesifik As melonjak 100 kali lipat. Karena energi permukaan selalu positif (ΔG > 0), sistem secara termodinamika bersifat metastabil dan memiliki kecenderungan spontan untuk bergabung kembali (agregasi/koalesensi) demi meminimalkan luas antarmuka.'
      )
    ]);
    calcCard.appendChild(theoryBox);

    deckContainer.appendChild(calcCard);
  }

  function renderLyophilicTab(deckContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Perbandingan Sifat Fisikokimia: Koloid Liofilik vs Liofobik'));
    card.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
      'Pemahaman fundamental dalam S1 Kimia Koloid mengenai afinitas antarmuka, struktur lapisan solvasi, dan kestabilan terhadap elektrolit.'
    ));

    const tableWrap = createElement('div', { className: 'editorial-table-wrap', style: { marginTop: '12px' } });
    const table = createElement('table', { className: 'editorial-table' });
    
    const thead = createElement('thead');
    thead.appendChild(createElement('tr', {}, [
      createElement('th', {}, 'Parameter'),
      createElement('th', {}, 'Koloid Liofilik (Suka Pelarut)'),
      createElement('th', {}, 'Koloid Liofobik (Benci Pelarut)')
    ]));
    table.appendChild(thead);

    const tbody = createElement('tbody');
    LYOPHILIC_VS_LYOPHOBIC.forEach(row => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { style: { fontWeight: '600', color: 'var(--text-primary)' } }, row.parameter));
      tr.appendChild(createElement('td', { style: { color: 'var(--accent-teal)' } }, row.lyophilic));
      tr.appendChild(createElement('td', { style: { color: 'var(--accent-crimson)' } }, row.lyophobic));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);

    deckContainer.appendChild(card);
  }

  return {
    mount(parent) {
      container = createElement('div', { className: 'scientific-studio' });

      // Stage (Left/Top)
      const stage = createElement('div', { className: 'studio-canvas-stage' });
      canvas = createElement('canvas', { className: 'canvas-element' });
      stage.appendChild(canvas);

      // HUD Overlay
      const hud = createElement('div', { className: 'canvas-hud' });
      stage.appendChild(hud);

      // Control Deck (Right/Bottom)
      const deck = createElement('div', { className: 'studio-control-deck' });

      container.appendChild(stage);
      container.appendChild(deck);
      parent.appendChild(container);

      // Setup Canvas
      const setup = setupHighDPICanvas(canvas);
      ctx = setup.ctx;
      initParticles(setup.width, setup.height);

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        const s = setupHighDPICanvas(canvas);
        ctx = s.ctx;
      });
      resizeObserver.observe(canvas);

      // Loop manager
      loopManager = createLoopManager(canvas, render);
      loopManager.start();

      // Render Controls & HUD
      renderControlDeck(deck, hud);
      updateHUD(hud);
    },
    unmount() {
      if (loopManager) {
        loopManager.destroy();
        loopManager = null;
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
