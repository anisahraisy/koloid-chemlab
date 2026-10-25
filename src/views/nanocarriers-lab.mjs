/**
 * @file nanocarriers-lab.mjs
 * Modul Baru: Nanokoloid & Rekayasa Antarmuka
 * Solid Nanoparticles (NP/SLN) vs Nanoemulsi (NE) vs NLC (Nanostructured Lipid Carrier)
 * Mekanisme Kimia Permukaan: Tween 80 (Sterik) vs CTAB (Elektrostatik / DLVO)
 * Standard S1 Kimia Murni / Kimia Fisika & Nanoteknologi
 */

import { createElement, clampNumber, formatScientific } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager, drawScientificGrid } from '../core/canvas-utils.mjs';
import { 
  NANOCARRIER_SYSTEMS, 
  SURFACTANT_MECHANISMS, 
  COMPARISON_TABLE_1, 
  COMPARISON_TABLE_2 
} from '../data/nanocarriers-data.mjs';

export function createNanocarriersView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;
  let hudContainer = null;
  let deckContainer = null;

  // Aging UI References for live DOM updates
  let agingBtnRef = null;
  let agingProgressBarRef = null;
  let agingTimelineLabelRef = null;
  let agingDynamicDescRef = null;

  // State
  let activeTab = 'simulation'; // 'simulation' | 'theory-carriers' | 'theory-surfactants'
  let activeViewMode = 'micro'; // 'micro' (Cross-Section) | 'macro' (Multi-Particle) | 'compare3' (3-in-1)
  let selectedSystemId = 'nlc'; // 'np' | 'ne' | 'nlc'
  let selectedSurfactantId = 'tween80'; // 'tween80' | 'ctab' | 'mixed'

  // Physical Sliders
  let solidLiquidRatio = 70; // 100:0 (NP) -> 70:30 (NLC) -> 0:100 (NE)
  let surfactantConcPct = 2.5; // 0.5% - 5.0% w/v
  let saltConcMm = 10; // 0 - 500 mM NaCl

  // Aging Simulation (6-Month Accelerated Test)
  let isAgingActive = false;
  let agingProgress = 0; // 0.0 to 1.0 (Bulan ke-0 s/d Bulan ke-6)

  // Macro particles
  let macroParticles = [];
  const MACRO_COUNT = 55;

  function initMacroParticles(width, height) {
    macroParticles = [];
    const minX = 35;
    const maxX = width - 35;
    const minY = 35;
    const maxY = height - 35;

    for (let i = 0; i < MACRO_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.8;
      macroParticles.push({
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseR: 5.0 + Math.random() * 2.5,
        currentR: 5.0 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        clusterId: i % 5,
        isOstwaldGrower: (i % 3 === 0)
      });
    }
  }

  // Calculate Real-Time Physics & Surface Metrics
  function calculateMetrics() {
    const sys = NANOCARRIER_SYSTEMS.find(s => s.id === selectedSystemId) || NANOCARRIER_SYSTEMS[2];
    const surf = SURFACTANT_MECHANISMS[selectedSurfactantId] || SURFACTANT_MECHANISMS['tween80'];

    // Interfacial tension gamma (mN/m) decreases with surfactant concentration (Szyszkowski)
    const baseGamma = selectedSystemId === 'ne' ? 32.0 : 42.0;
    const gamma = Math.max(1.8, baseGamma - Math.log(1 + surfactantConcPct * 4.0) * 8.5);

    // Particle diameter (nm) via Laplace pressure & surfactant coverage
    const baseDiameter = selectedSystemId === 'ne' ? 85 : selectedSystemId === 'nlc' ? 120 : 160;
    const agingSizeFactor = (selectedSystemId === 'ne' && isAgingActive) ? (1 + agingProgress * 1.4) : 1.0;
    const diameterNm = Math.max(35, Math.round(baseDiameter * (1.8 / Math.sqrt(surfactantConcPct)) * agingSizeFactor));

    // Zeta Potential (mV) depends on surfactant and salt compression
    let zetaBase = 0;
    if (selectedSurfactantId === 'ctab') {
      zetaBase = +52.0;
    } else if (selectedSurfactantId === 'tween80') {
      zetaBase = -11.0;
    } else {
      zetaBase = +30.0; // mixed
    }

    // Salt compression on zeta potential: zeta = zeta0 * exp(-0.005 * saltConc)
    const saltCompressionFactor = Math.exp(-0.006 * saltConcMm);
    const zetaMv = selectedSurfactantId === 'ctab' 
      ? +(zetaBase * saltCompressionFactor).toFixed(1)
      : selectedSurfactantId === 'mixed'
      ? +(zetaBase * Math.max(0.4, saltCompressionFactor)).toFixed(1)
      : -11.0; // Tween 80 steric charge is independent of salt

    // Entrapment Efficiency (EE%)
    let eePct = sys.entrapmentEfficiency;
    if (isAgingActive) {
      if (selectedSystemId === 'np') {
        // Severe drug expulsion in NP
        eePct = Math.max(22, Math.round(sys.entrapmentEfficiency * (1 - agingProgress * 0.62)));
      } else if (selectedSystemId === 'ne') {
        // Burst release / leakage
        eePct = Math.max(48, Math.round(sys.entrapmentEfficiency * (1 - agingProgress * 0.38)));
      } else {
        // NLC maintains high entrapment
        eePct = Math.max(91, Math.round(sys.entrapmentEfficiency * (1 - agingProgress * 0.03)));
      }
    }

    // Polydispersity Index (PDI)
    const agingPdiBoost = isAgingActive 
      ? (selectedSystemId === 'ne' ? agingProgress * 0.28 : selectedSystemId === 'np' ? agingProgress * 0.20 : agingProgress * 0.04) 
      : 0;
    const pdi = (0.12 + (0.05 / surfactantConcPct) + agingPdiBoost).toFixed(2);

    // Colloid Stability Status
    let stabilityStatus = 'Stabil Terdispersi';
    let statusColor = '#10B981';

    if (selectedSurfactantId === 'ctab' && saltConcMm > 150) {
      stabilityStatus = 'Koagulasi Cepat (Kompresi Debye / DLVO Runtuh)';
      statusColor = '#EF4444';
    } else if (isAgingActive) {
      if (selectedSystemId === 'np') {
        stabilityStatus = agingProgress > 0.3 ? 'Drug Expulsion (Transisi Polimorfik β)' : 'Merapat Polimorfik α→β';
        statusColor = '#EF4444';
      } else if (selectedSystemId === 'ne') {
        stabilityStatus = agingProgress > 0.3 ? 'Koalesensi & Ostwald Ripening (Droplet Membesar)' : 'Pertumbuhan Droplet Minyak';
        statusColor = '#F59E0B';
      } else {
        stabilityStatus = 'Sangat Stabil (Matriks Amorf Menahan Zat Aktif)';
        statusColor = '#10B981';
      }
    } else if (selectedSurfactantId === 'tween80') {
      stabilityStatus = 'Stabil Sterik (Tahan Garam & Netral)';
      statusColor = '#10B981';
    } else {
      stabilityStatus = 'Stabil Elektrosterik Unggul';
      statusColor = '#8B5CF6';
    }

    return {
      gamma: gamma.toFixed(1),
      diameterNm,
      zetaMv,
      eePct,
      pdi,
      stabilityStatus,
      statusColor,
      sys,
      surf
    };
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    // Progress aging animation if active
    if (isAgingActive) {
      if (agingProgress < 1.0) {
        agingProgress = Math.min(1.0, agingProgress + dt * 0.25);
      }

      // Live update DOM control deck elements
      if (agingProgressBarRef) {
        agingProgressBarRef.style.width = `${(agingProgress * 100).toFixed(1)}%`;
      }
      if (agingTimelineLabelRef) {
        const month = (agingProgress * 6).toFixed(1);
        agingTimelineLabelRef.textContent = `Status Penyimpanan: Bulan ke-${month} / 6.0 Bulan (${Math.round(agingProgress * 100)}%)`;
      }
      if (agingDynamicDescRef) {
        const month = (agingProgress * 6).toFixed(1);
        if (selectedSystemId === 'np') {
          agingDynamicDescRef.textContent = `Bulan ke-${month}: Kisi kristal padat β merapat secara rapat. Cacat kisi menyempit dan memicu fenomena Drug Expulsion (pelepasan zat aktif ke luar partikel).`;
          agingDynamicDescRef.style.color = '#EF4444';
        } else if (selectedSystemId === 'ne') {
          agingDynamicDescRef.textContent = `Bulan ke-${month}: Tetesan minyak cair mengalami pematangan Ostwald & koalesensi (droplet membesar), disertai kebocoran zat aktif (burst release).`;
          agingDynamicDescRef.style.color = '#F59E0B';
        } else {
          agingDynamicDescRef.textContent = `Bulan ke-${month}: Matriks amorf NLC dan kantong nano minyak berhasil mempertahankan integritas dan mengunci zat aktif (No Drug Expulsion).`;
          agingDynamicDescRef.style.color = '#10B981';
        }
      }
      if (agingProgress >= 1.0 && agingBtnRef) {
        agingBtnRef.textContent = 'Ulangi Uji Penyimpanan 6 Bulan';
        agingBtnRef.className = 'btn btn-secondary';
      }

      // Live update HUD metrics
      if (hudContainer) {
        updateHUD(hudContainer);
      }
    }

    // Clear Deep Graphite
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    if (activeViewMode === 'micro') {
      renderMicroCrossSection(ctx, width, height, time, dt);
    } else if (activeViewMode === 'macro') {
      renderMacroMultiParticle(ctx, width, height, time, dt);
    } else {
      renderCompare3In1(ctx, width, height, time, dt);
    }

    // Draw Aging Timeline Banner if aging active
    if (isAgingActive) {
      drawAgingBanner(ctx, width, height);
    }
  }

  // Draw High-Contrast In-Canvas Aging Timeline Banner
  function drawAgingBanner(ctx, width, height) {
    ctx.save();
    const bannerW = Math.min(width - 50, 470);
    const bannerH = 32;
    const bx = (width - bannerW) / 2;
    const by = 30;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = agingProgress >= 1.0 
      ? (selectedSystemId === 'nlc' ? '#10B981' : '#F59E0B') 
      : '#38BDF8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bannerW, bannerH, 6) : ctx.rect(bx, by, bannerW, bannerH);
    ctx.fill();
    ctx.stroke();

    // Progress bar inside banner
    const pad = 3;
    const innerW = bannerW - pad * 2;
    const innerH = bannerH - pad * 2;
    ctx.fillStyle = agingProgress >= 1.0 
      ? (selectedSystemId === 'nlc' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)') 
      : 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(bx + pad, by + pad, innerW * agingProgress, innerH);

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FBF9F5';
    ctx.textAlign = 'center';
    const month = (agingProgress * 6).toFixed(1);
    const pct = Math.round(agingProgress * 100);
    ctx.fillText(`UJI PENYIMPANAN 6 BULAN: BULAN KE-${month} (${pct}%) • T=25°C`, width / 2, by + 20);

    ctx.restore();
  }

  // =========================================================================
  // MODE 1: MIKRO-STRUKTUR INTI (CROSS-SECTION 2.5D VIEW)
  // =========================================================================
  function renderMicroCrossSection(ctx, width, height, time, dt) {
    ctx.save();
    const metrics = calculateMetrics();
    const cx = width / 2;
    const cy = height / 2 - 8;
    const coreR = Math.min(width * 0.26, height * 0.32, 105);

    // Vessel / Stage Border
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(25, 25, width - 50, height - 50);

    // Water Phase Background Glow
    const bgGrad = ctx.createRadialGradient(cx, cy, coreR * 0.8, cx, cy, coreR * 2.2);
    bgGrad.addColorStop(0, 'rgba(29, 78, 216, 0.08)');
    bgGrad.addColorStop(1, 'rgba(20, 20, 19, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(25, 25, width - 50, height - 50);

    // 1. Draw Core Matrix Based on Colloid Carrier System
    if (selectedSystemId === 'np') {
      // Nanopartikel Padat (SLN): Highly ordered crystalline brick-wall lattice
      drawSolidNanoparticleCore(ctx, cx, cy, coreR, time);
    } else if (selectedSystemId === 'ne') {
      // Nanoemulsi: Fluid liquid lipid oil droplet
      drawNanoemulsionCore(ctx, cx, cy, coreR, time);
    } else {
      // NLC: Imperfect crystal lattice with embedded liquid oil nano-compartments
      drawNLCCore(ctx, cx, cy, coreR, time);
    }

    // 2. Draw Surfactant Interfacial Layer (Tween 80 vs CTAB)
    drawSurfactantInterface(ctx, cx, cy, coreR, time);

    // 3. Drug Molecules & Expulsion Animation
    drawEncapsulatedDrugMolecules(ctx, cx, cy, coreR, time);

    // 4. In-Canvas Scientific Title & Status
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 13px "Newsreader", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${metrics.sys.name.toUpperCase()}`, cx, height - 42);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = metrics.statusColor;
    ctx.fillText(`STATUS: ${metrics.stabilityStatus.toUpperCase()}`, cx, height - 26);

    ctx.restore();
  }

  // Draw Core: Nanopartikel Padat (SLN)
  function drawSolidNanoparticleCore(ctx, cx, cy, r, time) {
    ctx.save();

    // Solid Crystal Outer Boundary
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.clip(); // Clip to core circle

    // Highly ordered crystalline lattice lines (brick-wall)
    ctx.fillStyle = isAgingActive 
      ? `rgba(239, 68, 68, ${0.12 + agingProgress * 0.18})` 
      : 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Dynamic brick compression during polymorphic transition
    const brickH = isAgingActive ? Math.max(9, 14 * (1 - agingProgress * 0.35)) : 14;
    const brickW = isAgingActive ? Math.max(18, 28 * (1 - agingProgress * 0.35)) : 28;
    ctx.strokeStyle = (isAgingActive && agingProgress > 0.3) ? '#F43F5E' : '#38BDF8';
    ctx.lineWidth = 1.3;

    for (let y = cy - r; y <= cy + r; y += brickH) {
      const rowIndex = Math.floor((y - (cy - r)) / brickH);
      const shiftX = (rowIndex % 2 === 0) ? 0 : brickW / 2;

      ctx.beginPath();
      ctx.moveTo(cx - r, y);
      ctx.lineTo(cx + r, y);
      ctx.stroke();

      for (let x = cx - r + shiftX; x <= cx + r; x += brickW) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + brickH);
        ctx.stroke();
      }
    }

    // Aging tightening animation (lattice compresses)
    if (isAgingActive && agingProgress > 0.25) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    ctx.restore();

    // Outer Core Border
    ctx.strokeStyle = (isAgingActive && agingProgress > 0.3) ? '#F43F5E' : '#38BDF8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // In-canvas status text during aging
    if (isAgingActive && agingProgress > 0.25) {
      ctx.save();
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText('TRANSISI POLIMORFIK α → β (KISI MERAPAT)', cx, cy + r * 0.85);
      ctx.restore();
    }
  }

  // Draw Core: Nanoemulsi (NE)
  function drawNanoemulsionCore(ctx, cx, cy, r, time) {
    ctx.save();

    // In aging, droplet swells due to Ostwald ripening & coalescence
    const effectiveR = (isAgingActive ? r * (1 + agingProgress * 0.32) : r);

    // Fluid Liquid Oil Core (Golden Amber)
    const fluidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, effectiveR);
    fluidGrad.addColorStop(0, '#FEF3C7');
    fluidGrad.addColorStop(0.6, '#F59E0B');
    fluidGrad.addColorStop(1, '#B45309');

    ctx.fillStyle = fluidGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, effectiveR, 0, Math.PI * 2);
    ctx.fill();

    // Swirling fluid convection lines (viskositas rendah)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const cr = (effectiveR / 4) * i;
      const speed = isAgingActive ? 0.003 : 0.0015;
      const angleOffset = time * speed * (i % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.arc(cx, cy, cr, angleOffset, angleOffset + Math.PI * 1.3);
      ctx.stroke();
    }

    // Outer Meniscus
    ctx.strokeStyle = (isAgingActive && agingProgress > 0.3) ? '#F59E0B' : '#D97706';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, effectiveR, 0, Math.PI * 2);
    ctx.stroke();

    // In-canvas status text during aging
    if (isAgingActive && agingProgress > 0.25) {
      ctx.save();
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'center';
      ctx.fillText('KOALESENSI & OSTWALD RIPENING (DROPLET MEMBESAR)', cx, cy + effectiveR * 0.82);
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Core: NLC (Nanostructured Lipid Carrier)
  function drawNLCCore(ctx, cx, cy, r, time) {
    ctx.save();

    // Base Solid Lipid Matrix (Cyan semi-crystalline)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#064E3B';
    ctx.fill();
    ctx.clip();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Imperfect crystal lattice lines with disordered orientation
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.2;
    for (let ang = 0; ang < Math.PI; ang += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * -r, cy + Math.sin(ang) * -r);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.stroke();
    }

    // Embedded Nano-Compartments of Liquid Oil (Kantong Nano Minyak)
    const compartments = [
      { x: -r * 0.35, y: -r * 0.30, rad: r * 0.24 },
      { x: r * 0.38, y: -r * 0.25, rad: r * 0.22 },
      { x: -r * 0.25, y: r * 0.40, rad: r * 0.26 },
      { x: r * 0.35, y: r * 0.32, rad: r * 0.20 },
      { x: 0, y: 0, rad: r * 0.28 }
    ];

    compartments.forEach(comp => {
      const gx = cx + comp.x;
      const gy = cy + comp.y;

      const oilGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, comp.rad);
      oilGrad.addColorStop(0, '#FDE68A');
      oilGrad.addColorStop(0.7, '#F59E0B');
      oilGrad.addColorStop(1, '#D97706');

      ctx.fillStyle = oilGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, comp.rad, 0, Math.PI * 2);
      ctx.fill();

      // Protective boundary on nano-compartments
      ctx.strokeStyle = isAgingActive ? '#34D399' : '#FCD34D';
      ctx.lineWidth = isAgingActive ? 1.8 : 1.2;
      ctx.stroke();
    });

    ctx.restore();

    // Outer NLC Border
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // In-canvas status text during aging
    if (isAgingActive) {
      ctx.save();
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10B981';
      ctx.textAlign = 'center';
      ctx.fillText('STABIL: KANTONG NANO MINYAK MENGUNCI ZAT AKTIF (NO EXPULSION)', cx, cy + r * 0.85);
      ctx.restore();
    }
  }

  // Draw Surfactant Interfacial Layer (Tween 80 vs CTAB vs Mixed)
  function drawSurfactantInterface(ctx, cx, cy, coreR, time) {
    ctx.save();
    const numSurfactants = Math.max(24, Math.min(48, Math.round(surfactantConcPct * 10)));

    if (selectedSurfactantId === 'tween80') {
      // =========================================================================
      // TWEEN 80: NON-IONIK / SIKAT POLIMER STERIK (POLYMERIC BRUSH POE)
      // Hydrophobic oleate tail inside lipid, long waving POE polymer chain outside
      // =========================================================================
      const brushLength = 26;

      for (let i = 0; i < numSurfactants; i++) {
        const ang = (i / numSurfactants) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * coreR;
        const sy = cy + Math.sin(ang) * coreR;

        // Hydrophobic Oleate Tail (inward into lipid)
        const inX = cx + Math.cos(ang) * (coreR - 10);
        const inY = cy + Math.sin(ang) * (coreR - 10);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(inX, inY);
        ctx.stroke();

        // Polymeric POE Brush Chain (waving outward into aqueous phase)
        const waveOffset = Math.sin(time * 0.003 + i * 0.8) * 6;
        const midX = cx + Math.cos(ang) * (coreR + brushLength * 0.5) - Math.sin(ang) * waveOffset;
        const midY = cy + Math.sin(ang) * (coreR + brushLength * 0.5) + Math.cos(ang) * waveOffset;
        const outX = cx + Math.cos(ang) * (coreR + brushLength);
        const outY = cy + Math.sin(ang) * (coreR + brushLength);

        ctx.strokeStyle = '#10B981'; // Polymeric POE green
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(midX, midY, outX, outY);
        ctx.stroke();

        // Terminal Ethoxylate Bead
        ctx.fillStyle = '#6EE7B7';
        ctx.beginPath();
        ctx.arc(outX, outY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (selectedSurfactantId === 'ctab') {
      // =========================================================================
      // CTAB: KATIONIK / LAPISAN GANDA LISTRIK (EDL & STERN LAYER)
      // Positive quaternary ammonium heads + Br- counter-ions in Stern & diffuse layer
      // =========================================================================
      const edlThickness = Math.max(6, Math.min(30, 28 * Math.exp(-0.006 * saltConcMm)));

      // Diffuse Layer Glowing Halo
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + edlThickness + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < numSurfactants; i++) {
        const ang = (i / numSurfactants) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * coreR;
        const sy = cy + Math.sin(ang) * coreR;

        // Tail inside lipid
        const inX = cx + Math.cos(ang) * (coreR - 12);
        const inY = cy + Math.sin(ang) * (coreR - 12);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(inX, inY);
        ctx.stroke();

        // Cationic Head (+)
        const hx = cx + Math.cos(ang) * (coreR + 4);
        const hy = cy + Math.sin(ang) * (coreR + 4);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+', hx, hy + 2.5);

        // Counter-ion Br- in Stern Layer
        if (i % 2 === 0) {
          const bx = cx + Math.cos(ang) * (coreR + edlThickness * 0.7);
          const by = cy + Math.sin(ang) * (coreR + edlThickness * 0.7);
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 6px "JetBrains Mono", monospace';
          ctx.fillText('−', bx, by + 2);
        }
      }

    } else {
      // =========================================================================
      // MIXED: TWEEN 80 + CTAB (STABILISASI ELEKTROSTERIK)
      // Alternating POE polymeric brush & cationic (+) heads
      // =========================================================================
      for (let i = 0; i < numSurfactants; i++) {
        const ang = (i / numSurfactants) * Math.PI * 2;
        const sx = cx + Math.cos(ang) * coreR;
        const sy = cy + Math.sin(ang) * coreR;

        if (i % 2 === 0) {
          // Tween 80 Polymer brush
          const outX = cx + Math.cos(ang) * (coreR + 22);
          const outY = cy + Math.sin(ang) * (coreR + 22);
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(outX, outY);
          ctx.stroke();

          ctx.fillStyle = '#6EE7B7';
          ctx.beginPath();
          ctx.arc(outX, outY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // CTAB Cationic head (+)
          const hx = cx + Math.cos(ang) * (coreR + 4);
          const hy = cy + Math.sin(ang) * (coreR + 4);
          ctx.fillStyle = '#8B5CF6';
          ctx.beginPath();
          ctx.arc(hx, hy, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 7px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+', hx, hy + 2.5);
        }
      }
    }

    ctx.restore();
  }

  // Draw Encapsulated Drug Molecules & Drug Expulsion Animation
  function drawEncapsulatedDrugMolecules(ctx, cx, cy, coreR, time) {
    ctx.save();
    const actualR = (selectedSystemId === 'ne' && isAgingActive) ? coreR * (1 + agingProgress * 0.32) : coreR;

    // 16 Drug payload molecules (Glowing Magenta)
    const numDrugs = 16;
    for (let i = 0; i < numDrugs; i++) {
      let mx = 0;
      let my = 0;
      let isExpelled = false;

      if (selectedSystemId === 'np') {
        // In NP: tightly squeezed in grain boundaries
        const rPos = (coreR * 0.65) * (0.3 + (i / numDrugs) * 0.65);
        const ang = (i / numDrugs) * Math.PI * 2;

        if (isAgingActive) {
          // Drug expulsion pushes molecules outside core!
          const expelDist = rPos + (coreR * 0.85) * agingProgress;
          mx = cx + Math.cos(ang) * expelDist;
          my = cy + Math.sin(ang) * expelDist;
          isExpelled = expelDist > coreR;
        } else {
          mx = cx + Math.cos(ang) * rPos;
          my = cy + Math.sin(ang) * rPos;
        }

      } else if (selectedSystemId === 'ne') {
        // In NE: freely floating inside liquid oil
        const jitter = Math.sin(time * 0.002 + i) * 6;
        const ang = (i / numDrugs) * Math.PI * 2 + time * 0.0008;
        const rPos = (actualR * 0.55);

        if (isAgingActive && (i % 2 === 0)) {
          // Burst release: 50% of drug molecules diffuse out into water!
          const leakDist = rPos + (actualR * 0.75) * agingProgress;
          mx = cx + Math.cos(ang) * leakDist + jitter;
          my = cy + Math.sin(ang) * leakDist + jitter;
          isExpelled = leakDist > actualR;
        } else {
          mx = cx + Math.cos(ang) * rPos + jitter;
          my = cy + Math.sin(ang) * rPos + jitter;
        }

      } else {
        // In NLC: locked safely inside nano oil compartments (NO EXPULSION)
        const pocketAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
        const pAng = pocketAngles[i % pocketAngles.length];
        const pRad = (coreR * 0.45);
        const localJitterX = Math.sin(time * 0.002 + i) * 3;
        const localJitterY = Math.cos(time * 0.002 + i) * 3;
        mx = cx + Math.cos(pAng) * pRad + localJitterX;
        my = cy + Math.sin(pAng) * pRad + localJitterY;
      }

      // Draw Glowing Drug Molecule
      ctx.fillStyle = isExpelled ? '#FB7185' : '#EC4899'; // Magenta Active / Expelled Rose
      ctx.beginPath();
      ctx.arc(mx, my, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FDF2F8';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Trailing expulsion vector lines
      if (isExpelled) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const originDist = coreR * 0.6;
        const ang = Math.atan2(my - cy, mx - cx);
        ctx.moveTo(cx + Math.cos(ang) * originDist, cy + Math.sin(ang) * originDist);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }

      // Expulsion label if escaping NP
      if (selectedSystemId === 'np' && isAgingActive && agingProgress > 0.35 && i === 0) {
        ctx.fillStyle = '#F43F5E';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DRUG EXPULSION (EKSPULSI)', mx + 8, my - 6);
      } else if (selectedSystemId === 'ne' && isAgingActive && agingProgress > 0.35 && i === 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('BURST RELEASE (KEBOCORAN)', mx + 8, my - 6);
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // MODE 2: MAKRO-KOLOID & UJI GANGGUAN ELEKTROLIT (MULTI-PARTICLE VIEW)
  // =========================================================================
  function renderMacroMultiParticle(ctx, width, height, time, dt) {
    ctx.save();
    const bounds = { minX: 30, maxX: width - 30, minY: 30, maxY: height - 30 };

    ctx.strokeStyle = 'rgba(220, 215, 205, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

    const isSaltCoagulated = (selectedSurfactantId === 'ctab' && saltConcMm > 150);
    const edlRadius = selectedSurfactantId === 'ctab' 
      ? Math.max(2, 9 * Math.exp(-0.006 * saltConcMm)) 
      : 7;

    // Background tint
    ctx.fillStyle = isSaltCoagulated 
      ? 'rgba(239, 68, 68, 0.08)' 
      : (isAgingActive && selectedSystemId === 'np')
      ? 'rgba(239, 68, 68, 0.05)'
      : (isAgingActive && selectedSystemId === 'ne')
      ? 'rgba(245, 158, 11, 0.05)'
      : 'rgba(29, 78, 216, 0.04)';
    ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

    // Update macro particles
    for (let i = 0; i < macroParticles.length; i++) {
      const p = macroParticles[i];

      // Physical size adjustments under aging (Ostwald ripening in NE)
      if (isAgingActive) {
        if (selectedSystemId === 'ne') {
          if (p.isOstwaldGrower) {
            p.currentR = p.baseR * (1 + agingProgress * 1.6);
          } else {
            p.currentR = Math.max(1.2, p.baseR * (1 - agingProgress * 0.85));
          }
        } else {
          p.currentR = p.baseR;
        }
      } else {
        p.currentR = p.baseR;
      }

      if (isSaltCoagulated) {
        // Coagulate into aggregates towards cluster centers
        const target = macroParticles[p.clusterId % 6];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        p.vx += dx * 0.015;
        p.vy += dy * 0.015;
        p.vx *= 0.88;
        p.vy *= 0.88;
      } else if (isAgingActive && selectedSystemId === 'np') {
        // NP Recrystallization-induced agglomeration / flocculation during aging
        const target = macroParticles[p.clusterId % 4];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        p.vx += dx * (0.008 * agingProgress);
        p.vy += dy * (0.008 * agingProgress);
        p.vx *= 0.90;
        p.vy *= 0.90;
      } else {
        // Brownian motion Stokes-Einstein
        p.vx += (Math.random() - 0.5) * 0.7;
        p.vy += (Math.random() - 0.5) * 0.7;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wall bounce
      if (p.x < bounds.minX + p.currentR) { p.x = bounds.minX + p.currentR; p.vx *= -1; }
      if (p.x > bounds.maxX - p.currentR) { p.x = bounds.maxX - p.currentR; p.vx *= -1; }
      if (p.y < bounds.minY + p.currentR) { p.y = bounds.minY + p.currentR; p.vy *= -1; }
      if (p.y > bounds.maxY - p.currentR) { p.y = bounds.maxY - p.currentR; p.vy *= -1; }
    }

    // Inter-particle interactions
    if (!isSaltCoagulated && !(isAgingActive && selectedSystemId === 'np' && agingProgress > 0.5)) {
      for (let i = 0; i < macroParticles.length; i++) {
        for (let j = i + 1; j < macroParticles.length; j++) {
          const pA = macroParticles[i];
          const pB = macroParticles[j];
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const threshold = pA.currentR + pB.currentR + edlRadius;

          if (dist > 0.01 && dist < threshold) {
            const overlap = (threshold - dist) / threshold;
            const force = Math.pow(overlap, 1.4) * 1.5;
            const nx = dx / dist;
            const ny = dy / dist;

            // Repulsion: Tween 80 steric bounce or CTAB electrostatic repulsion
            pA.vx -= nx * force;
            pA.vy -= ny * force;
            pB.vx += nx * force;
            pB.vy += ny * force;
          }
        }
      }
    }

    // Render particles
    for (let i = 0; i < macroParticles.length; i++) {
      const p = macroParticles[i];

      // Outer EDL Halo / Steric Brush representation
      if (!isSaltCoagulated) {
        ctx.strokeStyle = selectedSurfactantId === 'tween80' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentR + edlRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particle Core
      ctx.fillStyle = isSaltCoagulated 
        ? '#DC2626' 
        : selectedSystemId === 'np' 
        ? (isAgingActive && agingProgress > 0.4 ? '#F43F5E' : '#38BDF8') 
        : selectedSystemId === 'ne' 
        ? '#F59E0B' 
        : '#10B981';

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.currentR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Watermark & live aging status
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    if (isAgingActive) {
      const modeDesc = selectedSystemId === 'np' 
        ? 'AGING: AGREGASI PARTIKEL PADAT (REKRISTALISASI β)'
        : selectedSystemId === 'ne'
        ? 'AGING: PEMATANGAN OSTWALD (DROPLET MEMBESAR/MENYUSUT)'
        : 'AGING: DISPERSI NLC TETAP HOMOGEN & STABIL';
      ctx.fillStyle = selectedSystemId === 'np' ? '#EF4444' : selectedSystemId === 'ne' ? '#F59E0B' : '#10B981';
      ctx.fillText(modeDesc, width - 40, height - 52);
    }
    ctx.fillStyle = '#A1A1AA';
    ctx.fillText(`SIMULASI MULTI-PARTIKEL (GERAK BROWN & UJI NaCl)`, width - 40, height - 38);
    ctx.fillText(`GARAM: ${saltConcMm} mM NaCl | SURFAKTAN: ${selectedSurfactantId.toUpperCase()}`, width - 40, height - 24);

    ctx.restore();
  }

  // Draw Mini Drug Molecules in Compare 3-in-1 Mode
  function drawMiniDrugMolecules(ctx, cx, cy, coreR, time, sysId) {
    const numDrugs = 8;
    for (let i = 0; i < numDrugs; i++) {
      let mx = 0;
      let my = 0;
      let isExpelled = false;

      if (sysId === 'np') {
        const rPos = coreR * 0.6;
        const ang = (i / numDrugs) * Math.PI * 2;
        const dist = isAgingActive ? rPos + (coreR * 0.8) * agingProgress : rPos;
        mx = cx + Math.cos(ang) * dist;
        my = cy + Math.sin(ang) * dist;
        isExpelled = dist > coreR;
      } else if (sysId === 'ne') {
        const ang = (i / numDrugs) * Math.PI * 2 + time * 0.001;
        const rPos = coreR * 0.5;
        const dist = (isAgingActive && i % 2 === 0) ? rPos + (coreR * 0.7) * agingProgress : rPos;
        mx = cx + Math.cos(ang) * dist;
        my = cy + Math.sin(ang) * dist;
        isExpelled = dist > coreR;
      } else {
        const pAng = (i / numDrugs) * Math.PI * 2;
        const pRad = coreR * 0.45;
        mx = cx + Math.cos(pAng) * pRad;
        my = cy + Math.sin(pAng) * pRad;
      }

      ctx.fillStyle = isExpelled ? '#FB7185' : '#EC4899';
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // MODE 3: KOMPARASI 3-IN-1 (SIDE-BY-SIDE VIEW)
  // =========================================================================
  function renderCompare3In1(ctx, width, height, time, dt) {
    ctx.save();
    const colW = (width - 40) / 3;
    const cy = height / 2 - 10;
    const r = Math.min(colW * 0.32, height * 0.22, 60);

    const systems = ['np', 'ne', 'nlc'];
    const titles = ['NP / SLN (Kristal)', 'Nanoemulsi (Cair)', 'NLC (Lipid Amorf)'];

    for (let idx = 0; idx < 3; idx++) {
      const colX = 20 + idx * colW;
      const midX = colX + colW / 2;
      const sysId = systems[idx];

      // Column Border
      ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
      ctx.strokeRect(colX, 25, colW - 8, height - 50);

      // Draw Mini Cross-Section
      ctx.save();
      const colR = (sysId === 'ne' && isAgingActive) ? r * (1 + agingProgress * 0.32) : r;
      if (idx === 0) {
        drawSolidNanoparticleCore(ctx, midX, cy, r, time);
      } else if (idx === 1) {
        drawNanoemulsionCore(ctx, midX, cy, colR, time);
      } else {
        drawNLCCore(ctx, midX, cy, r, time);
      }
      drawSurfactantInterface(ctx, midX, cy, colR, time);

      // Draw Mini Drug Molecules
      drawMiniDrugMolecules(ctx, midX, cy, colR, time, sysId);
      ctx.restore();

      // Column Header & Summary
      ctx.fillStyle = '#FBF9F5';
      ctx.font = '600 12px "Newsreader", serif';
      ctx.textAlign = 'center';
      ctx.fillText(titles[idx], midX, 45);

      const sysData = NANOCARRIER_SYSTEMS[idx];
      let liveEE = sysData.entrapmentEfficiency;
      let liveSize = sysData.particleSizeRange;
      let liveStatus = idx === 0 ? 'Ekspulsi: Tinggi' : idx === 1 ? 'Koalesensi: Rentan' : 'No Drug Expulsion';

      if (isAgingActive) {
        if (idx === 0) {
          liveEE = Math.max(22, Math.round(58 * (1 - agingProgress * 0.62)));
          liveStatus = agingProgress > 0.3 ? '🚨 Drug Expulsion' : 'Merapat Polimorfik';
        } else if (idx === 1) {
          liveEE = Math.max(48, Math.round(78 * (1 - agingProgress * 0.38)));
          liveSize = `${Math.round(85 * (1 + agingProgress * 1.4))} nm (Swell)`;
          liveStatus = agingProgress > 0.3 ? '⚠️ Koalesensi / Leak' : 'Ostwald Ripening';
        } else {
          liveEE = Math.max(91, Math.round(94 * (1 - agingProgress * 0.03)));
          liveStatus = '✅ No Drug Expulsion';
        }
      }

      ctx.font = '9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = sysData.colorTheme;
      ctx.fillText(`EE: ${liveEE}% | ${liveSize}`, midX, height - 42);
      ctx.fillStyle = isAgingActive && idx === 0 ? '#EF4444' : isAgingActive && idx === 1 ? '#F59E0B' : sysData.colorTheme;
      ctx.fillText(liveStatus, midX, height - 28);
    }

    ctx.restore();
  }

  function updateHUD(hudContainer) {
    if (!hudContainer) return;
    hudContainer.innerHTML = '';
    const metrics = calculateMetrics();

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Sistem: '),
      createElement('span', { className: 'val' }, metrics.sys.shortName)
    ]));

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Surfaktan: '),
      createElement('span', { className: 'val' }, metrics.surf.name.split(' ')[0])
    ]));

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Ukuran (d): '),
      createElement('span', { className: 'val' }, `${metrics.diameterNm} nm`)
    ]));

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Zeta (ζ): '),
      createElement('span', { className: 'val' }, `${metrics.zetaMv > 0 ? '+' : ''}${metrics.zetaMv} mV`)
    ]));

    hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
      createElement('span', { className: 'label' }, 'Entrapment (EE): '),
      createElement('span', { className: 'val' }, `${metrics.eePct}%`)
    ]));
  }

  function renderControlDeck(deckContainer, hudContainer) {
    deckContainer.innerHTML = '';

    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul Khusus • Riset Nanoteknologi'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Nanokoloid: NP vs Nanoemulsi vs NLC'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Perbandingan sistem pembawa skala nano dan rekayasa kimia permukaan: stabilisasi sterik Tween 80 vs stabilisasi elektrostatik CTAB, transisi polimorfik, dan ketahanan terhadap elektrolit.'
    ));

    // Tab Navigation
    const tabs = [
      { id: 'simulation', label: 'Simulasi & Kontrol' },
      { id: 'theory-carriers', label: 'Tabel 1: Sistem Koloid' },
      { id: 'theory-surfactants', label: 'Tabel 2: Kimia Permukaan' }
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

    if (activeTab === 'simulation') {
      renderSimulationControls(deckContainer, hudContainer);
    } else if (activeTab === 'theory-carriers') {
      renderCarriersTheory(deckContainer);
    } else {
      renderSurfactantsTheory(deckContainer);
    }
  }

  function renderSimulationControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });

    // 1. View Mode Toggle (Micro Cross-Section vs Macro Multi-Particle vs 3-in-1)
    const viewGroup = createElement('div', { className: 'control-group' });
    viewGroup.appendChild(createElement('label', { className: 'control-label' }, 'Mode Tampilan Kanvas (View Mode):'));

    const viewSeg = createElement('div', { className: 'segmented-control' });
    [
      { id: 'micro', label: 'Mikro (Cross-Section)' },
      { id: 'macro', label: 'Makro (Multi-Partikel)' },
      { id: 'compare3', label: 'Komparasi 3-in-1' }
    ].forEach(vm => {
      const btn = createElement('button', {
        className: `segmented-btn ${activeViewMode === vm.id ? 'active' : ''}`,
        onClick: () => {
          activeViewMode = vm.id;
          renderControlDeck(deckContainer, hudContainer);
        }
      }, vm.label);
      viewSeg.appendChild(btn);
    });
    viewGroup.appendChild(viewSeg);
    card.appendChild(viewGroup);

    // 2. Colloid Carrier Selector
    const sysGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    sysGroup.appendChild(createElement('label', { className: 'control-label' }, 'Pilih Sistem Nanokoloid:'));

    const sysSeg = createElement('div', { className: 'segmented-control' });
    NANOCARRIER_SYSTEMS.forEach(s => {
      const btn = createElement('button', {
        className: `segmented-btn ${selectedSystemId === s.id ? 'active' : ''}`,
        onClick: () => {
          selectedSystemId = s.id;
          if (s.id === 'np') solidLiquidRatio = 100;
          else if (s.id === 'nlc') solidLiquidRatio = 70;
          else solidLiquidRatio = 0;
          isAgingActive = false;
          agingProgress = 0;
          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, s.shortName);
      sysSeg.appendChild(btn);
    });
    sysGroup.appendChild(sysSeg);
    card.appendChild(sysGroup);

    // 3. Surfactant Selector Toggle (Tween 80 vs CTAB vs Mixed)
    const surfGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    surfGroup.appendChild(createElement('label', { className: 'control-label' }, 'Pilih Surfaktan & Mekanisme Antarmuka:'));

    const surfSeg = createElement('div', { className: 'segmented-control' });
    [
      { id: 'tween80', label: 'Tween 80 (Sterik)' },
      { id: 'ctab', label: 'CTAB (Elektrostatik)' },
      { id: 'mixed', label: 'Tween + CTAB (Sinergi)' }
    ].forEach(sf => {
      const btn = createElement('button', {
        className: `segmented-btn ${selectedSurfactantId === sf.id ? 'active' : ''}`,
        onClick: () => {
          selectedSurfactantId = sf.id;
          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, sf.label);
      surfSeg.appendChild(btn);
    });
    surfGroup.appendChild(surfSeg);
    card.appendChild(surfGroup);

    // 4. Lipid Ratio Slider (Solid : Liquid)
    const ratioGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    ratioGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Rasio Lipid Padat : Lipid Cair'),
      createElement('span', { className: 'control-value-readout' }, `${solidLiquidRatio} : ${100 - solidLiquidRatio}`)
    ]));

    const ratioSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0',
      max: '100',
      step: '5',
      value: String(solidLiquidRatio),
      onInput: (e) => {
        solidLiquidRatio = clampNumber(e.target.value, 0, 100, 70);
        if (solidLiquidRatio >= 85) selectedSystemId = 'np';
        else if (solidLiquidRatio <= 20) selectedSystemId = 'ne';
        else selectedSystemId = 'nlc';

        ratioGroup.querySelector('.control-value-readout').textContent = `${solidLiquidRatio} : ${100 - solidLiquidRatio}`;
        updateHUD(hudContainer);
      }
    });
    ratioGroup.appendChild(ratioSlider);
    ratioGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '0:100 (Nanoemulsi Cair)'),
      createElement('span', {}, '70:30 (NLC Amorf)'),
      createElement('span', {}, '100:0 (NP Padat Kristal)')
    ]));
    card.appendChild(ratioGroup);

    // 5. Surfactant Concentration Slider (% w/v)
    const cGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    cGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Konsentrasi Surfaktan (% w/v)'),
      createElement('span', { className: 'control-value-readout' }, `${surfactantConcPct.toFixed(1)}%`)
    ]));
    const cSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.5',
      max: '5.0',
      step: '0.2',
      value: String(surfactantConcPct),
      onInput: (e) => {
        surfactantConcPct = clampNumber(e.target.value, 0.5, 5.0, 2.5);
        cGroup.querySelector('.control-value-readout').textContent = `${surfactantConcPct.toFixed(1)}%`;
        updateHUD(hudContainer);
      }
    });
    cGroup.appendChild(cSlider);
    card.appendChild(cGroup);

    // 6. Electrolyte / Salt Concentration Slider (NaCl)
    const saltGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    saltGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Uji Gangguan Garam / Kekuatan Ionik (NaCl)'),
      createElement('span', { className: 'control-value-readout' }, `${saltConcMm} mM NaCl`)
    ]));
    const saltSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0',
      max: '400',
      step: '10',
      value: String(saltConcMm),
      onInput: (e) => {
        saltConcMm = clampNumber(e.target.value, 0, 400, 10);
        saltGroup.querySelector('.control-value-readout').textContent = `${saltConcMm} mM NaCl`;
        updateHUD(hudContainer);
      }
    });
    saltGroup.appendChild(saltSlider);
    saltGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '0 mM (Akuades)'),
      createElement('span', {}, '150 mM (Salin Fisiologis)'),
      createElement('span', {}, '400 mM (Pekat)')
    ]));
    card.appendChild(saltGroup);

    // 7. Aging Storage Simulation Card (Accelerated 6-Month Test)
    const agingCard = createElement('div', { 
      className: 'editorial-card',
      style: { marginTop: '14px', border: '1px solid var(--border-default)', background: 'var(--bg-surface-elevated)' }
    });

    agingCard.appendChild(createElement('div', { className: 'card-header' }, [
      createElement('h4', { className: 'card-title' }, 'Uji Stabilitas Penyimpanan 6 Bulan (Aging Test)'),
      createElement('span', { className: 'card-tag' }, 'Akselerasi Kinetika')
    ]));

    agingBtnRef = createElement('button', {
      className: `btn ${isAgingActive ? 'btn-secondary' : 'btn-primary'}`,
      style: { width: '100%', marginTop: '8px' },
      onClick: () => {
        if (isAgingActive && agingProgress >= 1.0) {
          // Restart aging test
          agingProgress = 0;
          isAgingActive = true;
          agingBtnRef.textContent = 'Hentikan / Reset Uji Penyimpanan';
          agingBtnRef.className = 'btn btn-secondary';
        } else {
          isAgingActive = !isAgingActive;
          if (!isAgingActive) agingProgress = 0;
          agingBtnRef.textContent = isAgingActive 
            ? 'Hentikan / Reset Uji Penyimpanan' 
            : 'Simulasikan Penyimpanan 6 Bulan (Aging Test)';
          agingBtnRef.className = isAgingActive ? 'btn btn-secondary' : 'btn btn-primary';
        }
        if (hudContainer) updateHUD(hudContainer);
      }
    }, isAgingActive ? (agingProgress >= 1.0 ? 'Ulangi Uji Penyimpanan 6 Bulan' : 'Hentikan / Reset Uji Penyimpanan') : 'Simulasikan Penyimpanan 6 Bulan (Aging Test)');
    agingCard.appendChild(agingBtnRef);

    // Timeline bar & progress
    const timelineWrap = createElement('div', {
      style: { marginTop: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '10px', border: '1px solid var(--border-subtle)' }
    });

    const monthLabel = (agingProgress * 6).toFixed(1);
    agingTimelineLabelRef = createElement('div', {
      style: { fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '6px' }
    }, `Status Penyimpanan: Bulan ke-${monthLabel} / 6.0 Bulan (${Math.round(agingProgress * 100)}%)`);
    timelineWrap.appendChild(agingTimelineLabelRef);

    const track = createElement('div', {
      style: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }
    });
    agingProgressBarRef = createElement('div', {
      style: { 
        width: `${(agingProgress * 100).toFixed(1)}%`, 
        height: '100%', 
        background: selectedSystemId === 'np' ? '#EF4444' : selectedSystemId === 'ne' ? '#F59E0B' : '#10B981', 
        transition: 'width 0.1s linear' 
      }
    });
    track.appendChild(agingProgressBarRef);
    timelineWrap.appendChild(track);

    agingDynamicDescRef = createElement('div', {
      style: { marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }
    }, isAgingActive 
      ? 'Simulasi sedang berjalan...' 
      : 'Klik tombol di atas untuk melihat perubahan kristalinitas, ukuran partikel, dan pelepasan zat aktif secara nyata selama 6 bulan penyimpanan.');
    timelineWrap.appendChild(agingDynamicDescRef);

    agingCard.appendChild(timelineWrap);
    card.appendChild(agingCard);

    // 8. Scientific Summary Callout
    const metrics = calculateMetrics();
    const infoCard = createElement('div', { 
      className: `editorial-card ${selectedSystemId === 'nlc' ? 'accent-teal' : selectedSystemId === 'ne' ? 'accent-amber' : 'accent-cobalt'}`,
      style: { marginTop: '12px' }
    });

    infoCard.appendChild(createElement('div', { className: 'card-header' }, [
      createElement('h4', { className: 'card-title' }, `Karakteristik ${metrics.sys.shortName}`),
      createElement('span', { className: 'card-tag' }, metrics.surf.mechanismName.split(' ')[0])
    ]));

    infoCard.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, metrics.surf.theoryDescription));

    card.appendChild(infoCard);
    deckContainer.appendChild(card);
  }

  function renderCarriersTheory(deckContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Tabel 1: Perbandingan Sistem Koloid Nanopartikel'));
    card.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
      'Perbandingan komprehensif antara Nanopartikel Padat (SLN), Nanoemulsi (NE), dan Nanostructured Lipid Carriers (NLC) berdasarkan struktur matriks, kristalinitas, dan stabilitas termodinamika.'
    ));

    const tableWrap = createElement('div', { className: 'editorial-table-wrap', style: { marginTop: '12px' } });
    const table = createElement('table', { className: 'editorial-table' });

    const thead = createElement('thead');
    thead.appendChild(createElement('tr', {}, [
      createElement('th', {}, 'Parameter Fisikokimia'),
      createElement('th', {}, 'NP Padat (SLN)'),
      createElement('th', {}, 'Nanoemulsi (NE)'),
      createElement('th', {}, 'NLC (Generasi Ke-2)')
    ]));
    table.appendChild(thead);

    const tbody = createElement('tbody');
    COMPARISON_TABLE_1.forEach(row => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { style: { fontWeight: '600', color: 'var(--text-primary)' } }, row.parameter));
      tr.appendChild(createElement('td', { style: { color: '#0284C7' } }, row.np));
      tr.appendChild(createElement('td', { style: { color: '#D97706' } }, row.ne));
      tr.appendChild(createElement('td', { style: { color: '#059669', fontWeight: '600' } }, row.nlc));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);

    deckContainer.appendChild(card);
  }

  function renderSurfactantsTheory(deckContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Tabel 2: Perbandingan Kimia Permukaan Surfaktan'));
    card.appendChild(createElement('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' } }, 
      'Analisis mekanisme kimia antarmuka antara surfaktan non-ionik (Tween 80 - stabilisasi sterik) dan surfaktan kationik (CTAB - stabilisasi elektrostatik lapisan ganda DLVO).'
    ));

    const tableWrap = createElement('div', { className: 'editorial-table-wrap', style: { marginTop: '12px' } });
    const table = createElement('table', { className: 'editorial-table' });

    const thead = createElement('thead');
    thead.appendChild(createElement('tr', {}, [
      createElement('th', {}, 'Parameter Antarmuka'),
      createElement('th', {}, 'Tween 80 (Non-Ionik / Sterik)'),
      createElement('th', {}, 'CTAB (Kationik / DLVO)')
    ]));
    table.appendChild(thead);

    const tbody = createElement('tbody');
    COMPARISON_TABLE_2.forEach(row => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { style: { fontWeight: '600', color: 'var(--text-primary)' } }, row.parameter));
      tr.appendChild(createElement('td', { style: { color: '#059669' } }, row.tween80));
      tr.appendChild(createElement('td', { style: { color: '#DC2626' } }, row.ctab));
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

      const stage = createElement('div', { className: 'studio-canvas-stage' });
      canvas = createElement('canvas', { className: 'canvas-element' });
      stage.appendChild(canvas);

      const hud = createElement('div', { className: 'canvas-hud' });
      stage.appendChild(hud);
      hudContainer = hud;

      const deck = createElement('div', { className: 'studio-control-deck' });
      deckContainer = deck;

      container.appendChild(stage);
      container.appendChild(deck);
      parent.appendChild(container);

      const setup = setupHighDPICanvas(canvas);
      ctx = setup.ctx;
      initMacroParticles(setup.width, setup.height);

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
