/**
 * @file dlvo-coagulation-lab.mjs
 * Modul 3: Teori DLVO, Lapisan Ganda Listrik (EDL) & Kinetika Koagulasi Schulze-Hardy
 * Standard S1 Kimia Murni
 */

import { createElement, clampNumber, formatScientific } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager, getPointerPos, drawScientificGrid } from '../core/canvas-utils.mjs';

export function createDLVOCoagulationView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;

  // Active view tab
  let activeTab = 'dlvo'; // 'dlvo' | 'edl-structure'

  // Physical Chemistry Constants
  const KB = 1.380649e-23; // J/K
  const EPSILON_0 = 8.8541878e-12; // F/m
  const EPSILON_R = 78.5; // Water dielectric at 25°C
  const ELEM_CHARGE = 1.602176e-19; // C
  const AVOGADRO = 6.02214e23;
  const T = 298.15; // 25°C in K
  const HAMAKER_A = 1.5e-20; // Joules (Sol AgI / As2S3 in water)

  // Simulation State
  let particleRadiusNm = 40; // nm
  let surfacePotentialMv = -40; // mV (zeta / psi_0)
  let cationValence = 1; // 1 (Na+), 2 (Ca2+), 3 (Al3+)
  let electrolyteConcMm = 15; // mM (millimolar)

  // Particles for coagulation visualizer
  let particles = [];
  const NUM_PARTICLES = 45;

  function initParticles(w, h) {
    particles = [];
    const stageW = Math.max(160, Math.floor(w * 0.52));
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: 20 + Math.random() * (stageW - 40),
        y: 20 + Math.random() * (h - 40),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 4.5,
        clusterId: i // initially unaggregated
      });
    }
  }

  // Calculate Debye length kappa^-1 in nm
  function calculateDebyeLength() {
    // Ionic strength I = 0.5 * sum(c_i * z_i^2)
    // For 1:1 salt (NaCl), I = C; for 2:1 salt (CaCl2), I = 3*C; for 3:1 salt (AlCl3), I = 6*C
    const saltMultiplier = cationValence === 1 ? 1 : cationValence === 2 ? 3 : 6;
    const ionicStrengthMolM3 = (electrolyteConcMm * saltMultiplier) * 1.0; // mol/m^3
    const numDensity = ionicStrengthMolM3 * AVOGADRO; // ions/m^3

    // kappa^2 = (2 * e^2 * N_A * I) / (eps_0 * eps_r * k_B * T)
    const numerator = 2 * Math.pow(ELEM_CHARGE, 2) * numDensity;
    const denominator = EPSILON_0 * EPSILON_R * KB * T;
    const kappaM = Math.sqrt(numerator / Math.max(1e-15, denominator)); // 1/m

    const debyeLengthNm = (1 / Math.max(1e-10, kappaM)) * 1e9;
    return { kappaM, debyeLengthNm, ionicStrengthMolM3 };
  }

  // Calculate DLVO potential curve: V_T(h) = V_R(h) + V_A(h) in units of k_B * T
  function calculateDLVOPoint(hNm, kappaM) {
    const hM = Math.max(0.1e-9, hNm * 1e-9);
    const rM = particleRadiusNm * 1e-9;
    const psi0V = Math.abs(surfacePotentialMv) * 1e-3;

    // Repulsion V_R: 2 * pi * eps_0 * eps_r * r * psi_0^2 * ln(1 + exp(-kappa * h))
    const VR_J = 2 * Math.PI * EPSILON_0 * EPSILON_R * rM * Math.pow(psi0V, 2) * Math.log(1 + Math.exp(-kappaM * hM));

    // Attraction V_A: - (A_H * r) / (12 * h)
    const VA_J = - (HAMAKER_A * rM) / (12 * hM);

    const VT_J = VR_J + VA_J;
    const kBT = KB * T;

    return {
      VT_kBT: VT_J / kBT,
      VR_kBT: VR_J / kBT,
      VA_kBT: VA_J / kBT
    };
  }

  // Calculate Critical Coagulation Concentration (CCC) according to Schulze-Hardy
  function calculateCCC() {
    // CCC is proportional to z^-6
    // Reference: For Na+ (z=1), typical CCC is ~50 mM
    const baseCcc = 50.0;
    return baseCcc / Math.pow(cationValence, 6);
  }

  // Determine current maximum barrier V_max
  function findEnergyBarrier(kappaM) {
    let maxV = -Infinity;
    let maxH = 0;
    let secMin = 0;

    for (let h = 0.5; h <= 25; h += 0.2) {
      const { VT_kBT } = calculateDLVOPoint(h, kappaM);
      if (VT_kBT > maxV) {
        maxV = VT_kBT;
        maxH = h;
      }
      if (h > maxH && VT_kBT < secMin) {
        secMin = VT_kBT;
      }
    }
    return { maxV, maxH, secMin };
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    // Clear background
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    if (activeTab === 'edl-structure') {
      renderEDLStructure(ctx, width, height);
    } else {
      renderDLVOCurveAndParticles(ctx, width, height, time, dt);
    }
  }

  function renderDLVOCurveAndParticles(ctx, width, height, time, dt) {
    ctx.save();
    const { kappaM, debyeLengthNm } = calculateDebyeLength();
    const { maxV } = findEnergyBarrier(kappaM);
    const ccc = calculateCCC();
    const isCoagulated = electrolyteConcMm >= ccc || maxV < 0.5;

    // Stage split: Left 48% Particle Aggregation Box, Right 52% DLVO Potential Curve
    const chamberW = Math.max(160, Math.floor(width * 0.48));
    const plotX = chamberW + 20;
    const plotW = width - plotX - 20;
    const plotY = 35;
    const plotH = height - 65;

    // 1. Particle Chamber
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(15, 25, chamberW - 20, height - 50);

    ctx.fillStyle = isCoagulated ? 'rgba(185, 28, 28, 0.08)' : 'rgba(29, 78, 216, 0.04)';
    ctx.fillRect(15, 25, chamberW - 20, height - 50);

    // Header tag in chamber
    ctx.fillStyle = isCoagulated ? '#EF4444' : '#60A5FA';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isCoagulated ? 'STATUS: KOAGULASI CEPAT (V_max ≤ 0)' : 'STATUS: KOLOID STABIL (V_max > 15 k_BT)', 20, 18);

    // Update Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (isCoagulated) {
        // Particles attract and merge into clusters
        const target = particles[p.clusterId % 6];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        p.vx += dx * 0.02;
        p.vy += dy * 0.02;
        p.vx *= 0.85;
        p.vy *= 0.85;
      } else {
        // Dispersed Brownian random motion
        p.vx += (Math.random() - 0.5) * 0.5;
        p.vy += (Math.random() - 0.5) * 0.5;
        p.vx = Math.max(-1.5, Math.min(1.5, p.vx));
        p.vy = Math.max(-1.5, Math.min(1.5, p.vy));
      }

      p.x += p.vx;
      p.y += p.vy;

      // Boundaries
      if (p.x < 22) { p.x = 22; p.vx *= -1; }
      if (p.x > chamberW - 12) { p.x = chamberW - 12; p.vx *= -1; }
      if (p.y < 32) { p.y = 32; p.vy *= -1; }
      if (p.y > height - 32) { p.y = height - 32; p.vy *= -1; }

      // Draw particle
      ctx.fillStyle = isCoagulated ? '#DC2626' : '#D97706';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // EDL diffuse halo around stable particles
      if (!isCoagulated) {
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + Math.min(12, debyeLengthNm * 1.5), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 2. DLVO Potential Curve Plot V_T(h)
    if (plotW > 80) {
      drawScientificGrid(ctx, {
        x: plotX,
        y: plotY,
        width: plotW,
        height: plotH,
        xTicks: 5,
        yTicks: 5,
        xLabel: 'Jarak Pemisahan h (nm)',
        yLabel: 'Energi Potensial V_T (k_B·T)'
      });

      // Horizontal Zero-Line (V = 0)
      const zeroY = plotY + plotH * 0.65;
      ctx.strokeStyle = '#DCD7CD';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(plotX, zeroY);
      ctx.lineTo(plotX + plotW, zeroY);
      ctx.stroke();

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('0 k_BT', plotX - 4, zeroY + 3);

      // Plot VT(h) Curve
      const maxHPlot = 18; // nm
      const energyScale = (plotH * 0.5) / 35; // 35 kBT scale

      // Draw Attractive V_A(h) curve (dashed red)
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let h = 0.5; h <= maxHPlot; h += 0.2) {
        const { VA_kBT } = calculateDLVOPoint(h, kappaM);
        const px = plotX + (h / maxHPlot) * plotW;
        const py = zeroY - VA_kBT * energyScale;
        if (py > plotY + plotH) continue;
        if (h === 0.5) ctx.moveTo(px, Math.min(plotY + plotH, py));
        else ctx.lineTo(px, Math.min(plotY + plotH, py));
      }
      ctx.stroke();

      // Draw Repulsive V_R(h) curve (dashed blue)
      ctx.strokeStyle = 'rgba(29, 78, 216, 0.45)';
      ctx.beginPath();
      for (let h = 0.5; h <= maxHPlot; h += 0.2) {
        const { VR_kBT } = calculateDLVOPoint(h, kappaM);
        const px = plotX + (h / maxHPlot) * plotW;
        const py = zeroY - VR_kBT * energyScale;
        if (py < plotY) continue;
        if (h === 0.5) ctx.moveTo(px, Math.max(plotY, py));
        else ctx.lineTo(px, Math.max(plotY, py));
      }
      ctx.stroke();
      ctx.setLineDash([]); // reset dash

      // Draw Total V_T(h) Curve (Solid High-Contrast Line)
      ctx.strokeStyle = isCoagulated ? '#EF4444' : '#F59E0B';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let started = false;

      for (let h = 0.4; h <= maxHPlot; h += 0.15) {
        const { VT_kBT } = calculateDLVOPoint(h, kappaM);
        const px = plotX + (h / maxHPlot) * plotW;
        const py = zeroY - VT_kBT * energyScale;

        if (py >= plotY - 10 && py <= plotY + plotH + 10) {
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();

      // Annotate Barrier V_max
      if (maxV > 0 && !isCoagulated) {
        const barrierH = 1.8;
        const bx = plotX + (barrierH / maxHPlot) * plotW;
        const by = zeroY - maxV * energyScale;

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`V_max = ${maxV.toFixed(1)} k_BT`, bx + 6, by - 6);
      } else {
        ctx.fillStyle = '#EF4444';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PENJAGA ENERGI RUNTUH (V_max ≤ 0)', plotX + plotW / 2, plotY + 25);
      }
    }

    ctx.restore();
  }

  function renderEDLStructure(ctx, width, height) {
    ctx.save();
    // Microscopic cross-section of Stern Layer and Gouy-Chapman Diffuse Layer
    const surfaceX = 70;
    const sternX = 140;
    const slipX = 190;
    const diffuseEnd = width - 40;

    // 1. Colloid Particle Surface (Solid Black/Charcoal)
    ctx.fillStyle = '#27272A';
    ctx.fillRect(0, 0, surfaceX, height);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(surfaceX, 0);
    ctx.lineTo(surfaceX, height);
    ctx.stroke();

    // Negative Surface Charges (As2S3 / AgI surface)
    for (let y = 30; y < height - 30; y += 30) {
      ctx.fillStyle = '#B91C1C';
      ctx.beginPath();
      ctx.arc(surfaceX - 12, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('−', surfaceX - 12, y + 4);
    }

    // 2. Stern Layer (Tightly bound counter-ions)
    ctx.fillStyle = 'rgba(29, 78, 216, 0.08)';
    ctx.fillRect(surfaceX, 0, sternX - surfaceX, height);

    ctx.strokeStyle = 'rgba(29, 78, 216, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sternX, 0);
    ctx.lineTo(sternX, height);
    ctx.stroke();

    for (let y = 45; y < height - 30; y += 40) {
      ctx.fillStyle = '#1D4ED8';
      ctx.beginPath();
      ctx.arc((surfaceX + sternX) / 2, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('+', (surfaceX + sternX) / 2, y + 3);
    }

    // 3. Slipping Plane (Bidang Geser - Zeta Potential)
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(slipX, 0);
    ctx.lineTo(slipX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Gouy-Chapman Diffuse Layer
    for (let i = 0; i < 40; i++) {
      const ix = slipX + 15 + Math.random() * (diffuseEnd - slipX - 30);
      const iy = 25 + Math.random() * (height - 50);
      const isPositive = Math.random() > 0.3; // Excess counter-ions

      ctx.fillStyle = isPositive ? '#1D4ED8' : '#B91C1C';
      ctx.beginPath();
      ctx.arc(ix, iy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(isPositive ? '+' : '−', ix, iy + 3);
    }

    // 5. Electric Potential Curve Overlay: psi(x)
    const curveY0 = height - 120;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(surfaceX, curveY0 - 80); // psi_0
    ctx.lineTo(sternX, curveY0 - 45); // linear drop to psi_d
    ctx.lineTo(slipX, curveY0 - 35); // Zeta Potential

    // Exponential decay in diffuse layer: psi(x) = zeta * exp(-kappa * x)
    for (let x = slipX; x <= diffuseEnd; x += 5) {
      const dist = (x - slipX) / 45;
      const py = curveY0 - 35 * Math.exp(-dist);
      ctx.lineTo(x, py);
    }
    ctx.stroke();

    // Labels & Text Markings
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Permukaan Koloid', surfaceX / 2, 20);
    ctx.fillText('Lapisan Stern', (surfaceX + sternX) / 2, 20);
    ctx.fillText('Bidang Geser (ζ)', slipX, height - 15);
    ctx.fillText('Lapisan Difus Gouy-Chapman (κ⁻¹)', (slipX + diffuseEnd) / 2, 20);

    ctx.fillStyle = '#F59E0B';
    ctx.textAlign = 'left';
    ctx.fillText('Potensial Permukaan (ψ₀)', surfaceX + 8, curveY0 - 85);
    ctx.fillText('Potensial Zeta (ζ)', slipX + 6, curveY0 - 38);

    ctx.restore();
  }

  function updateHUD(hudContainer) {
    if (!hudContainer) return;
    hudContainer.innerHTML = '';

    const { debyeLengthNm } = calculateDebyeLength();
    const ccc = calculateCCC();

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Kation: '),
      createElement('span', { className: 'val' }, cationValence === 1 ? 'Na⁺ (z=1)' : cationValence === 2 ? 'Ca²⁺ (z=2)' : 'Al³⁺ (z=3)')
    ]));
    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Panjang Debye (κ⁻¹): '),
      createElement('span', { className: 'val' }, `${debyeLengthNm.toFixed(2)} nm`)
    ]));
    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'CCC Teoritis: '),
      createElement('span', { className: 'val' }, `${ccc < 0.1 ? (ccc * 1000).toFixed(1) + ' µM' : ccc.toFixed(2) + ' mM'}`)
    ]));
  }

  function renderControlDeck(deckContainer, hudContainer) {
    deckContainer.innerHTML = '';

    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul 03 • Stabilitas & Elektrokimia'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Teori DLVO & Aturan Schulze-Hardy'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Keseimbangan gaya tolak elektrostatik lapisan ganda (EDL) dan gaya tarik van der Waals, keruntuhan penghalang energi V_max, serta aturan Schulze-Hardy (CCC ∝ z⁻⁶).'
    ));

    // Tab Navigation
    const tabs = [
      { id: 'dlvo', label: 'Kurva DLVO & Uji Elektrolit' },
      { id: 'edl-structure', label: 'Struktur Lapisan Stern & Zeta' }
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

    if (activeTab === 'dlvo') {
      renderDLVOControls(deckContainer, hudContainer);
    } else {
      renderEDLControls(deckContainer);
    }
  }

  function renderDLVOControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Eksperimen Tetes Elektrolit & Valensi Ion'));

    // Formula Box
    const formulaBox = createElement('div', { className: 'formula-block' }, [
      createElement('div', { className: 'formula-tex' }, 'V_T(h) = V_R(h) + V_A(h)  |  CCC ∝ z⁻⁶'),
      createElement('div', { className: 'formula-caption' }, 
        'Kation bermuatan tinggi (Al³⁺ vs Na⁺) mengkompresi lapisan difus Gouy-Chapman secara drastis (panjang Debye κ⁻¹ memendek), meruntuhkan penghalang energi tolak V_max.'
      )
    ]);
    card.appendChild(formulaBox);

    // Cation Valence Selector
    const cationGroup = createElement('div', { className: 'control-group' });
    cationGroup.appendChild(createElement('label', { className: 'control-label' }, 'Pilih Kation Koagulan (Valensi z):'));
    
    const valences = [
      { z: 1, label: 'Na⁺ (Monovalen, z=1)' },
      { z: 2, label: 'Ca²⁺ (Divalen, z=2)' },
      { z: 3, label: 'Al³⁺ (Trivalen, z=3)' }
    ];

    const segControl = createElement('div', { className: 'segmented-control' });
    valences.forEach(v => {
      const btn = createElement('button', {
        className: `segmented-btn ${cationValence === v.z ? 'active' : ''}`,
        onClick: () => {
          cationValence = v.z;
          // Set sensible starting concentration depending on valence
          if (v.z === 1) electrolyteConcMm = 20;
          else if (v.z === 2) electrolyteConcMm = 0.9;
          else electrolyteConcMm = 0.08;

          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, v.label);
      segControl.appendChild(btn);
    });
    cationGroup.appendChild(segControl);
    card.appendChild(cationGroup);

    // Concentration Slider
    const maxRange = cationValence === 1 ? 100 : cationValence === 2 ? 3.0 : 0.25;
    const stepRange = cationValence === 1 ? 1 : cationValence === 2 ? 0.05 : 0.005;

    const cGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    cGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Konsentrasi Elektrolit (C)'),
      createElement('span', { className: 'control-value-readout' }, 
        cationValence === 3 ? `${(electrolyteConcMm * 1000).toFixed(0)} µM` : `${electrolyteConcMm.toFixed(2)} mM`
      )
    ]));

    const cSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.001',
      max: String(maxRange),
      step: String(stepRange),
      value: String(electrolyteConcMm),
      onInput: (e) => {
        electrolyteConcMm = clampNumber(e.target.value, 0.001, maxRange, 1.0);
        const textVal = cationValence === 3 ? `${(electrolyteConcMm * 1000).toFixed(0)} µM` : `${electrolyteConcMm.toFixed(2)} mM`;
        cGroup.querySelector('.control-value-readout').textContent = textVal;
        updateHUD(hudContainer);
      }
    });
    cGroup.appendChild(cSlider);
    cGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, 'Encer (Stabil)'),
      createElement('span', {}, `Ambang CCC (~${calculateCCC() < 0.1 ? (calculateCCC()*1000).toFixed(0)+'µM' : calculateCCC().toFixed(2)+'mM'})`),
      createElement('span', {}, 'Pekat (Koagulasi Cepat)')
    ]));
    card.appendChild(cGroup);

    // Surface Potential (Zeta) Slider
    const zetaGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    zetaGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Potensial Permukaan / Zeta (ψ₀)'),
      createElement('span', { className: 'control-value-readout' }, `${surfacePotentialMv} mV`)
    ]));

    const zetaSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '-80',
      max: '-5',
      step: '1',
      value: String(surfacePotentialMv),
      onInput: (e) => {
        surfacePotentialMv = clampNumber(e.target.value, -80, -5, -40);
        zetaGroup.querySelector('.control-value-readout').textContent = `${surfacePotentialMv} mV`;
        updateHUD(hudContainer);
      }
    });
    zetaGroup.appendChild(zetaSlider);
    zetaGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '-80 mV (Muatan Tinggi)'),
      createElement('span', {}, '-40 mV'),
      createElement('span', {}, '-5 mV (Mendekati Titik Nol)')
    ]));
    card.appendChild(zetaGroup);

    deckContainer.appendChild(card);
  }

  function renderEDLControls(deckContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Konsep Teori Lapisan Ganda Listrik (Electric Double Layer)'));
    card.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
      'Pada sistem sol koloid bermuatan (seperti sol As₂S₃ atau AgI), partikel dikelilingi oleh distribusi ion lawan yang tersusun dalam lapisan terstruktur:'
    ));

    const list = createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' } }, [
      createElement('div', { className: 'editorial-card accent-crimson' }, [
        createElement('strong', { style: { fontSize: '13px', color: 'var(--text-primary)' } }, '1. Lapisan Permukaan Primer (ψ₀):'),
        createElement('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)' } }, 'Muatan bawaan kristal akibat disosiasi gugus atau adsorpsi spesifik ion penentu potensial (PDI seperti I⁻ pada sol AgI).')
      ]),
      createElement('div', { className: 'editorial-card accent-cobalt' }, [
        createElement('strong', { style: { fontSize: '13px', color: 'var(--text-primary)' } }, '2. Lapisan Stern (Helmholtz Dalam & Luar):'),
        createElement('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)' } }, 'Lapisan ion lawan yang terikat kuat dan terdehidrasi sebagian pada permukaan. Penurunan potensial elektrostatik berlangsung curam secara linear.')
      ]),
      createElement('div', { className: 'editorial-card accent-amber' }, [
        createElement('strong', { style: { fontSize: '13px', color: 'var(--text-primary)' } }, '3. Bidang Geser & Potensial Zeta (ζ):'),
        createElement('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)' } }, 'Batas hidrodinamik di mana cairan ikut bergerak bersama partikel saat elektroforesis. Potensial pada bidang ini adalah Potensial Zeta (|ζ| > 30 mV menandakan koloid stabil secara elektrostatik).')
      ]),
      createElement('div', { className: 'editorial-card accent-teal' }, [
        createElement('strong', { style: { fontSize: '13px', color: 'var(--text-primary)' } }, '4. Lapisan Difus Gouy-Chapman:'),
        createElement('span', { style: { fontSize: '12.5px', color: 'var(--text-secondary)' } }, 'Ion lawan tersebar akibat kompetisi gaya elektrostatik dan agitasi termal Boltzmann. Ketebalan lapisan difus ditentukan oleh panjang Debye κ⁻¹.')
      ])
    ]);
    card.appendChild(list);

    deckContainer.appendChild(card);
  }

  return {
    mount(parent) {
      container = createElement('div', { className: 'scientific-studio' });

      const stage = createElement('div', { className: 'studio-canvas-stage' });
      canvas = createElement('canvas', { className: 'canvas-element' });
      stage.appendChild(canvas);

      const hud = createElement('div', { className: 'canvas-hud' });
      stage.appendChild(hud);

      const deck = createElement('div', { className: 'studio-control-deck' });

      container.appendChild(stage);
      container.appendChild(deck);
      parent.appendChild(container);

      const setup = setupHighDPICanvas(canvas);
      ctx = setup.ctx;
      initParticles(setup.width, setup.height);

      const resizeObserver = new ResizeObserver(() => {
        const s = setupHighDPICanvas(canvas);
        ctx = s.ctx;
      });
      resizeObserver.observe(canvas);

      loopManager = createLoopManager(canvas, render);
      loopManager.start();

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
