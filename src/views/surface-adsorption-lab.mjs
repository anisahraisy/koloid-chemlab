/**
 * @file surface-adsorption-lab.mjs
 * Modul 4: Kimia Permukaan, Termodinamika Miselisasi & Isoterm Adsorpsi
 * Standard S1 Kimia Murni
 */

import { createElement, clampNumber, formatScientific } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager, getPointerPos, drawScientificGrid } from '../core/canvas-utils.mjs';

export function createSurfaceAdsorptionView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;

  // Active view tab
  let activeTab = 'gibbs-cmc'; // 'gibbs-cmc' | 'israelachvili' | 'isotherms'

  // Physical Chemistry Constants
  const R = 8.3145; // J/(mol.K)
  const T = 298.15; // 25°C in K
  const AVOGADRO = 6.02214e23;

  // 1. Gibbs & CMC State
  let surfactantConcMm = 4.0; // mM (0.1 - 25.0 mM)
  const CMC_MM = 8.2; // Critical Micelle Concentration (e.g. SDS in water)
  const GAMMA_0 = 72.8; // mN/m (pure water)
  const GAMMA_CMC = 35.0; // mN/m (at CMC)

  // 2. Israelachvili Packing State
  let tailVolumeV = 0.45; // nm^3 (0.2 - 0.9)
  let headAreaA0 = 0.55; // nm^2 (0.3 - 1.2)
  let tailLengthLc = 1.60; // nm (1.0 - 2.5)

  // 3. Adsorption Isotherm State
  let isothermModel = 'langmuir'; // 'langmuir' | 'freundlich' | 'bet'
  let isLinearPlot = false;
  let equilibriumPressureX = 0.25; // P/P_0 or relative C_e (0.01 - 0.95)
  let langmuirKL = 15.0;
  let freundlichKF = 2.8;
  let freundlichN = 2.4;
  let betC = 50.0;

  // Surfactant Monomers & Micelles for Canvas Rendering
  let freeMonomers = [];
  const NUM_MONOMERS = 40;

  function initMonomers(w, h) {
    freeMonomers = [];
    for (let i = 0; i < NUM_MONOMERS; i++) {
      freeMonomers.push({
        x: 20 + Math.random() * (w - 40),
        y: 60 + Math.random() * (h - 90),
        angle: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2
      });
    }
  }

  // Calculate Surface Tension based on Gibbs Isotherm
  function calculateSurfaceTension(cMm) {
    if (cMm >= CMC_MM) {
      return GAMMA_CMC;
    }
    // Langmuir-Szyszkowski relation: gamma = gamma_0 - n*R*T*Gamma_max * ln(1 + K*C)
    const factor = Math.log(1 + (cMm / CMC_MM) * 8.0) / Math.log(9.0);
    return Math.max(GAMMA_CMC, GAMMA_0 - factor * (GAMMA_0 - GAMMA_CMC));
  }

  // Calculate Critical Packing Parameter (P_c)
  function calculateIsraelachviliPC() {
    return tailVolumeV / (headAreaA0 * tailLengthLc);
  }

  function getAggregateMorphology(pc) {
    if (pc < 0.333) {
      return {
        name: 'Misel Sferis (Spherical Micelle)',
        desc: 'Kepala polar besar dominan. Kelengkungan antarmuka tinggi cembung.',
        color: '#0F766E'
      };
    } else if (pc < 0.500) {
      return {
        name: 'Misel Silindris / Cacing (Wormlike / Rod-like)',
        desc: 'Kelengkungan silindris unidireksional. Menghasilkan larutan viskoelastik.',
        color: '#D97706'
      };
    } else if (pc <= 1.000) {
      return {
        name: 'Vesikel Bilayer / Liposom Datar',
        desc: 'Kelengkungan mendekati nol. Struktur membran bilayer dua lapis.',
        color: '#1D4ED8'
      };
    } else {
      return {
        name: 'Misel Terbalik (Inverted / Reverse Micelle)',
        desc: 'Kepala polar di dalam mengurung air, ekor hidrofobik menghadap pelarut minyak.',
        color: '#B91C1C'
      };
    }
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    if (activeTab === 'gibbs-cmc') {
      renderGibbsCMCCanvas(ctx, width, height, time, dt);
    } else if (activeTab === 'israelachvili') {
      renderIsraelachviliCanvas(ctx, width, height, time);
    } else {
      renderIsothermsCanvas(ctx, width, height, time);
    }
  }

  function renderGibbsCMCCanvas(ctx, width, height, time, dt) {
    ctx.save();
    const currentGamma = calculateSurfaceTension(surfactantConcMm);
    const isAboveCMC = surfactantConcMm >= CMC_MM;

    // Split Canvas: Left 50% Air-Water Interface & Micelles, Right 50% gamma vs ln C Plot
    const stageW = Math.max(160, Math.floor(width * 0.50));
    const plotX = stageW + 20;
    const plotW = width - plotX - 20;
    const plotY = 35;
    const plotH = height - 65;

    // 1. Air-Water Interfacial Cell
    const interfaceY = 70;
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(15, 25, stageW - 20, height - 50);

    // Air Phase (Top)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(15, 25, stageW - 20, interfaceY - 25);

    // Water Phase (Bottom)
    ctx.fillStyle = 'rgba(29, 78, 216, 0.07)';
    ctx.fillRect(15, interfaceY, stageW - 20, height - 25 - interfaceY);

    // Interface Line
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(15, interfaceY);
    ctx.lineTo(stageW - 5, interfaceY);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FASE UDARA (HIDROFOBIK)', 22, 40);
    ctx.fillText('FASE AIR RUAH (BULK HYDROPHILIC)', 22, interfaceY + 16);

    // Surface monolayer saturation density depends on concentration
    const monolayerCoverage = Math.min(1.0, surfactantConcMm / CMC_MM);
    const numMonolayerMolecules = Math.floor(18 * monolayerCoverage);

    // Draw Monolayer Surfactant molecules at the interface
    for (let k = 0; k < numMonolayerMolecules; k++) {
      const mx = 25 + (k / 17) * (stageW - 55);
      
      // Polar Head (Teal circle in water)
      ctx.fillStyle = '#0F766E';
      ctx.beginPath();
      ctx.arc(mx, interfaceY + 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Hydrophobic Tail (Wiggle upwards into air)
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(mx, interfaceY + 2);
      ctx.lineTo(mx - 2, interfaceY - 8);
      ctx.lineTo(mx + 2, interfaceY - 16);
      ctx.lineTo(mx, interfaceY - 22);
      ctx.stroke();
    }

    // Bulk Phase: Draw Micelles if C >= CMC, or random free monomers if C < CMC
    if (isAboveCMC) {
      // Draw 1-2 assembled spherical micelles in bulk water
      const micelleCenterX = stageW / 2;
      const micelleCenterY = interfaceY + (height - 25 - interfaceY) / 2;
      const micelleCoreR = 14;

      // Hydrophobic Core (Orange hydrocarbon center)
      ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.beginPath();
      ctx.arc(micelleCenterX, micelleCenterY, micelleCoreR + 10, 0, Math.PI * 2);
      ctx.fill();

      // Surfactant molecules arranged radially
      const numRays = 16;
      for (let r = 0; r < numRays; r++) {
        const angle = (r / numRays) * Math.PI * 2 + time * 0.001;
        const headX = micelleCenterX + Math.cos(angle) * (micelleCoreR + 14);
        const headY = micelleCenterY + Math.sin(angle) * (micelleCoreR + 14);
        const tailX = micelleCenterX + Math.cos(angle) * 4;
        const tailY = micelleCenterY + Math.sin(angle) * 4;

        // Tail
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Polar Head
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(headX, headY, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#34D399';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISEL SFERIS (C ≥ CMC)', micelleCenterX, micelleCenterY + micelleCoreR + 32);
    } else {
      // Free dissolved monomers diffusing in water
      for (let i = 0; i < 15; i++) {
        const m = freeMonomers[i];
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < 25 || m.x > stageW - 25) m.vx *= -1;
        if (m.y < interfaceY + 15 || m.y > height - 35) m.vy *= -1;

        // Draw small floating monomer
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + Math.cos(m.angle) * 10, m.y + Math.sin(m.angle) * 10);
        ctx.stroke();
      }
    }

    // 2. Gibbs Isotherm Curve Plot: gamma vs ln C
    if (plotW > 80) {
      drawScientificGrid(ctx, {
        x: plotX,
        y: plotY,
        width: plotW,
        height: plotH,
        xTicks: 4,
        yTicks: 4,
        xLabel: 'ln C (mM)',
        yLabel: 'Tegangan Permukaan γ (mN/m)'
      });

      // Axis bounds: gamma from 25 to 75 mN/m
      const minGamma = 25;
      const maxGamma = 75;
      const lnCMin = -2.0; // ln(0.13)
      const lnCMax = 3.3;  // ln(27)

      // Draw theoretical curve
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let first = true;

      for (let cVal = 0.15; cVal <= 25; cVal += 0.25) {
        const lnC = Math.log(cVal);
        const gam = calculateSurfaceTension(cVal);
        const px = plotX + ((lnC - lnCMin) / (lnCMax - lnCMin)) * plotW;
        const py = plotY + plotH - ((gam - minGamma) / (maxGamma - minGamma)) * plotH;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // CMC Vertical Dash Line
      const cmcX = plotX + ((Math.log(CMC_MM) - lnCMin) / (lnCMax - lnCMin)) * plotW;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cmcX, plotY);
      ctx.lineTo(cmcX, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#EF4444';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CMC = 8.2 mM', cmcX, plotY + 12);

      // Current Operating Point marker
      const curLnC = Math.log(surfactantConcMm);
      const curX = plotX + ((curLnC - lnCMin) / (lnCMax - lnCMin)) * plotW;
      const curY = plotY + plotH - ((currentGamma - minGamma) / (maxGamma - minGamma)) * plotH;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curX, curY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`γ = ${currentGamma.toFixed(1)} mN/m`, curX + 8, curY - 4);
    }

    ctx.restore();
  }

  function renderIsraelachviliCanvas(ctx, width, height, time) {
    ctx.save();
    const pc = calculateIsraelachviliPC();
    const morph = getAggregateMorphology(pc);

    // Central geometric aggregate visualizer
    const cx = width / 2;
    const cy = height / 2 - 10;

    // Background container
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 25, width - 60, height - 50);

    // Visual morphology depiction
    if (pc < 0.333) {
      // Spherical Micelle
      ctx.fillStyle = 'rgba(15, 118, 110, 0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const hx = cx + Math.cos(ang) * 55;
        const hy = cy + Math.sin(ang) * 55;
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(cx + Math.cos(ang) * 12, cy + Math.sin(ang) * 12);
        ctx.stroke();

        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pc < 0.500) {
      // Cylindrical / Rod-like Micelle
      const rodLen = Math.min(width * 0.45, 180);
      ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
      ctx.fillRect(cx - rodLen / 2, cy - 25, rodLen, 50);

      // Top and bottom surfactant layers
      for (let x = cx - rodLen / 2; x <= cx + rodLen / 2; x += 18) {
        // Top
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, cy - 25);
        ctx.lineTo(x, cy);
        ctx.stroke();
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(x, cy - 25, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Bottom
        ctx.beginPath();
        ctx.moveTo(x, cy + 25);
        ctx.lineTo(x, cy);
        ctx.stroke();
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(x, cy + 25, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pc <= 1.000) {
      // Planar Bilayer Sheet / Vesicle
      const biW = Math.min(width * 0.5, 200);
      for (let x = cx - biW / 2; x <= cx + biW / 2; x += 16) {
        // Outer Leaflet
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, cy - 30);
        ctx.lineTo(x, cy - 5);
        ctx.stroke();
        ctx.fillStyle = '#1D4ED8';
        ctx.beginPath();
        ctx.arc(x, cy - 30, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner Leaflet
        ctx.beginPath();
        ctx.moveTo(x, cy + 30);
        ctx.lineTo(x, cy + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, cy + 30, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Inverted Micelle (Water in oil core)
      ctx.fillStyle = 'rgba(29, 78, 216, 0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2;
        const hx = cx + Math.cos(ang) * 28;
        const hy = cy + Math.sin(ang) * 28;
        const tx = cx + Math.cos(ang) * 65;
        const ty = cy + Math.sin(ang) * 65;

        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.fillStyle = '#1D4ED8';
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Morphology Title Card
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 15px "Newsreader", serif';
    ctx.textAlign = 'center';
    ctx.fillText(morph.name, cx, height - 55);

    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#A1A1AA';
    ctx.fillText(`Parameter Pengemasan Kritis: P_c = ${pc.toFixed(3)} | ${morph.desc}`, cx, height - 38);

    ctx.restore();
  }

  function renderIsothermsCanvas(ctx, width, height, time) {
    ctx.save();
    // Split: Left 45% 2D Active Sites Lattice, Right 55% Isotherm Curve (Linear or Non-Linear)
    const stageW = Math.max(160, Math.floor(width * 0.45));
    const plotX = stageW + 20;
    const plotW = width - plotX - 20;
    const plotY = 35;
    const plotH = height - 65;

    // 1. 2D Adsorbent Surface Lattice
    const surfaceY = height - 60;
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(15, 25, stageW - 20, height - 50);

    // Solid Adsorbent Bulk
    ctx.fillStyle = '#27272A';
    ctx.fillRect(15, surfaceY, stageW - 20, height - 25 - surfaceY);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KISI ADSORBEN (ACTIVE SITES)', 22, 40);

    // Calculate site occupancy theta based on chosen model
    let theta = 0;
    if (isothermModel === 'langmuir') {
      theta = (langmuirKL * equilibriumPressureX) / (1 + langmuirKL * equilibriumPressureX);
    } else if (isothermModel === 'freundlich') {
      theta = Math.min(1.0, (freundlichKF * Math.pow(equilibriumPressureX, 1 / freundlichN)) / 5.0);
    } else {
      // BET
      const x = equilibriumPressureX;
      theta = (betC * x) / ((1 - x) * (1 + (betC - 1) * x));
    }

    const numSites = 14;
    for (let s = 0; s < numSites; s++) {
      const sx = 25 + (s / (numSites - 1)) * (stageW - 55);

      // Active site cleft
      ctx.fillStyle = '#52525B';
      ctx.fillRect(sx - 4, surfaceY - 2, 8, 4);

      // Monolayer Adsorbate
      const isOccupied = (s / numSites) <= Math.min(1.0, theta);
      if (isOccupied) {
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(sx, surfaceY - 9, 6, 0, Math.PI * 2);
        ctx.fill();

        // If BET multilayer and theta > 1.0, draw stacked 2nd and 3rd layer
        if (isothermModel === 'bet' && theta > 1.2 && (s % 2 === 0)) {
          ctx.fillStyle = 'rgba(217, 119, 6, 0.7)';
          ctx.beginPath();
          ctx.arc(sx, surfaceY - 23, 5.5, 0, Math.PI * 2);
          ctx.fill();

          if (theta > 2.0) {
            ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
            ctx.beginPath();
            ctx.arc(sx, surfaceY - 36, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 2. Isotherm Curve Plot
    if (plotW > 80) {
      const xLab = isLinearPlot 
        ? (isothermModel === 'langmuir' ? 'P (atau Ce)' : isothermModel === 'freundlich' ? 'ln Ce' : 'P/P₀') 
        : (isothermModel === 'bet' ? 'P / P₀' : 'Tekanan Relatif P / P₀');
      const yLab = isLinearPlot 
        ? (isothermModel === 'langmuir' ? 'P/v' : isothermModel === 'freundlich' ? 'ln qe' : '[P/P₀] / [v(1 - P/P₀)]') 
        : 'Fraksi Okupansi / Kapasitas q_e';

      drawScientificGrid(ctx, {
        x: plotX,
        y: plotY,
        width: plotW,
        height: plotH,
        xTicks: 4,
        yTicks: 4,
        xLabel: xLab,
        yLabel: yLab
      });

      // Draw Curve
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let started = false;

      for (let pxVal = 0.02; pxVal <= 0.90; pxVal += 0.02) {
        let plotPointX = 0;
        let plotPointY = 0;

        if (!isLinearPlot) {
          // Standard Non-linear Isotherm Curve
          let yVal = 0;
          if (isothermModel === 'langmuir') {
            yVal = (langmuirKL * pxVal) / (1 + langmuirKL * pxVal); // 0 to 1
          } else if (isothermModel === 'freundlich') {
            yVal = Math.min(1.2, (freundlichKF * Math.pow(pxVal, 1 / freundlichN)) / 4.0);
          } else {
            // BET
            yVal = Math.min(2.5, (betC * pxVal) / ((1 - pxVal) * (1 + (betC - 1) * pxVal))) / 2.5;
          }

          plotPointX = plotX + (pxVal / 0.95) * plotW;
          plotPointY = plotY + plotH - yVal * (plotH * 0.85);
        } else {
          // Linearized Transform
          if (isothermModel === 'langmuir') {
            // P/v = 1/(vm * KL) + (1/vm) * P  -> straight line
            const slope = 1.0;
            const intercept = 0.15;
            const yLin = intercept + slope * pxVal;
            plotPointX = plotX + (pxVal / 0.95) * plotW;
            plotPointY = plotY + plotH - (yLin / 1.2) * (plotH * 0.85);
          } else if (isothermModel === 'freundlich') {
            // ln qe = ln KF + (1/n) * ln Ce
            const lnC = Math.log(pxVal);
            const yLin = Math.log(freundlichKF) + (1 / freundlichN) * lnC;
            plotPointX = plotX + ((lnC + 3.9) / 4.0) * plotW;
            plotPointY = plotY + plotH - ((yLin + 2.0) / 4.0) * (plotH * 0.85);
          } else {
            // BET linearized: x / [v(1-x)] = 1/(vm*c) + (c-1)/(vm*c) * x
            const yLin = 0.05 + 0.9 * pxVal;
            plotPointX = plotX + (pxVal / 0.95) * plotW;
            plotPointY = plotY + plotH - (yLin / 1.0) * (plotH * 0.85);
          }
        }

        if (plotPointX >= plotX && plotPointX <= plotX + plotW && plotPointY >= plotY && plotPointY <= plotY + plotH) {
          if (!started) {
            ctx.moveTo(plotPointX, plotPointY);
            started = true;
          } else {
            ctx.lineTo(plotPointX, plotPointY);
          }
        }
      }
      ctx.stroke();

      // Operating marker on plot
      const markerX = plotX + (equilibriumPressureX / 0.95) * plotW;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(markerX, plotY + plotH - Math.min(1.0, theta) * (plotH * 0.85), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHUD(hudContainer) {
    if (!hudContainer) return;
    hudContainer.innerHTML = '';

    if (activeTab === 'gibbs-cmc') {
      const gam = calculateSurfaceTension(surfactantConcMm);
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Konsentrasi (C): '),
        createElement('span', { className: 'val' }, `${surfactantConcMm.toFixed(2)} mM`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Tegangan Permukaan (γ): '),
        createElement('span', { className: 'val' }, `${gam.toFixed(1)} mN/m`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Fase: '),
        createElement('span', { className: 'val' }, surfactantConcMm >= CMC_MM ? 'Misel Stabil (≥ CMC)' : 'Monomer Bebas (< CMC)')
      ]));
    } else if (activeTab === 'israelachvili') {
      const pc = calculateIsraelachviliPC();
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Parameter Pengemasan (Pc): '),
        createElement('span', { className: 'val' }, `${pc.toFixed(3)}`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Morfologi: '),
        createElement('span', { className: 'val' }, getAggregateMorphology(pc).name.split(' ')[0])
      ]));
    } else {
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Model Isoterm: '),
        createElement('span', { className: 'val' }, isothermModel.toUpperCase())
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Tekanan Relatif (P/P₀): '),
        createElement('span', { className: 'val' }, `${equilibriumPressureX.toFixed(2)}`)
      ]));
    }
  }

  function renderControlDeck(deckContainer, hudContainer) {
    deckContainer.innerHTML = '';

    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul 04 • Kimia Permukaan'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Miselisasi & Isoterm Adsorpsi'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Termodinamika adsorpsi Gibbs, perakitan mandiri surfaktan pada konsentrasi misel kritis (CMC), geometri agregat Israelachvili, serta komparasi isoterm Langmuir, Freundlich, dan BET.'
    ));

    const tabs = [
      { id: 'gibbs-cmc', label: 'Gibbs & CMC' },
      { id: 'israelachvili', label: 'Parameter Israelachvili (Pc)' },
      { id: 'isotherms', label: 'Isoterm Langmuir / BET' }
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

    if (activeTab === 'gibbs-cmc') {
      renderGibbsControls(deckContainer, hudContainer);
    } else if (activeTab === 'israelachvili') {
      renderIsraelachviliControls(deckContainer, hudContainer);
    } else {
      renderIsothermsControls(deckContainer, hudContainer);
    }
  }

  function renderGibbsControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Isoterm Adsorpsi Gibbs & Pembentukan Misel'));

    // Formula Box
    const formulaBox = createElement('div', { className: 'formula-block' }, [
      createElement('div', { className: 'formula-tex' }, 'Γ = - [1 / (n R T)] · (∂γ / ∂ln C)_T   |   A_min = 1 / (N_A · Γ_max)'),
      createElement('div', { className: 'formula-caption' }, 
        'Kemiringan kurva γ vs ln C menentukan kelebihan konsentrasi permukaan Γ. Tepat saat C mencapai CMC, antarmuka jenuh monolayer dan kemiringan mendatar (∂γ/∂ln C ≈ 0).'
      )
    ]);
    card.appendChild(formulaBox);

    // Surfactant Concentration Slider
    const cGroup = createElement('div', { className: 'control-group' });
    cGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Konsentrasi Surfaktan (C)'),
      createElement('span', { className: 'control-value-readout' }, `${surfactantConcMm.toFixed(2)} mM`)
    ]));

    const cSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.2',
      max: '20.0',
      step: '0.2',
      value: String(surfactantConcMm),
      onInput: (e) => {
        surfactantConcMm = clampNumber(e.target.value, 0.2, 20.0, 4.0);
        cGroup.querySelector('.control-value-readout').textContent = `${surfactantConcMm.toFixed(2)} mM`;
        updateHUD(hudContainer);
      }
    });
    cGroup.appendChild(cSlider);
    cGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '0.2 mM (Encer)'),
      createElement('span', {}, 'CMC (8.2 mM)'),
      createElement('span', {}, '20.0 mM (Misel Pekat)')
    ]));
    card.appendChild(cGroup);

    deckContainer.appendChild(card);
  }

  function renderIsraelachviliControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Parameter Pengemasan Kritis Israelachvili (Pc)'));

    // Formula Box
    const formulaBox = createElement('div', { className: 'formula-block' }, [
      createElement('div', { className: 'formula-tex' }, 'P_c = v / (a₀ · l_c)'),
      createElement('div', { className: 'formula-caption' }, 
        'Keseimbangan geometris antara volume rantai hidrofobik v, luas kepala polar optimal a₀, dan panjang rantai kritis l_c menentukan kelengkungan agregat.'
      )
    ]);
    card.appendChild(formulaBox);

    // Tail Volume v Slider
    const vGroup = createElement('div', { className: 'control-group' });
    vGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Volume Rantai Hidrofobik (v)'),
      createElement('span', { className: 'control-value-readout' }, `${tailVolumeV.toFixed(2)} nm³`)
    ]));
    const vSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.2',
      max: '0.85',
      step: '0.02',
      value: String(tailVolumeV),
      onInput: (e) => {
        tailVolumeV = clampNumber(e.target.value, 0.2, 0.85, 0.45);
        vGroup.querySelector('.control-value-readout').textContent = `${tailVolumeV.toFixed(2)} nm³`;
        updateHUD(hudContainer);
      }
    });
    vGroup.appendChild(vSlider);
    card.appendChild(vGroup);

    // Head Area a0 Slider
    const aGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    aGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Luas Kepala Polar Optimal (a₀)'),
      createElement('span', { className: 'control-value-readout' }, `${headAreaA0.toFixed(2)} nm²`)
    ]));
    const aSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.3',
      max: '1.2',
      step: '0.02',
      value: String(headAreaA0),
      onInput: (e) => {
        headAreaA0 = clampNumber(e.target.value, 0.3, 1.2, 0.55);
        aGroup.querySelector('.control-value-readout').textContent = `${headAreaA0.toFixed(2)} nm²`;
        updateHUD(hudContainer);
      }
    });
    aGroup.appendChild(aSlider);
    card.appendChild(aGroup);

    // Tail Length lc Slider
    const lGroup = createElement('div', { className: 'control-group', style: { marginTop: '10px' } });
    lGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Panjang Rantai Hidrokarbon Kritis (l_c)'),
      createElement('span', { className: 'control-value-readout' }, `${tailLengthLc.toFixed(2)} nm`)
    ]));
    const lSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '1.0',
      max: '2.5',
      step: '0.05',
      value: String(tailLengthLc),
      onInput: (e) => {
        tailLengthLc = clampNumber(e.target.value, 1.0, 2.5, 1.6);
        lGroup.querySelector('.control-value-readout').textContent = `${tailLengthLc.toFixed(2)} nm`;
        updateHUD(hudContainer);
      }
    });
    lGroup.appendChild(lSlider);
    card.appendChild(lGroup);

    deckContainer.appendChild(card);
  }

  function renderIsothermsControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Laboratorium Isoterm Adsorpsi Permukaan'));

    // Model Selector
    const modelGroup = createElement('div', { className: 'control-group' });
    modelGroup.appendChild(createElement('label', { className: 'control-label' }, 'Pilih Model Isoterm:'));
    
    const models = [
      { id: 'langmuir', label: 'Langmuir (Monolayer)' },
      { id: 'freundlich', label: 'Freundlich (Heterogen)' },
      { id: 'bet', label: 'BET (Multilayer Gas)' }
    ];

    const segControl = createElement('div', { className: 'segmented-control' });
    models.forEach(m => {
      const btn = createElement('button', {
        className: `segmented-btn ${isothermModel === m.id ? 'active' : ''}`,
        onClick: () => {
          isothermModel = m.id;
          renderControlDeck(deckContainer, hudContainer);
          updateHUD(hudContainer);
        }
      }, m.label);
      segControl.appendChild(btn);
    });
    modelGroup.appendChild(segControl);
    card.appendChild(modelGroup);

    // Linearization Toggle
    const toggleGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    toggleGroup.appendChild(createElement('label', { className: 'control-label' }, 'Tampilan Plot:'));
    
    const plotToggle = createElement('div', { className: 'segmented-control' });
    const nonLinBtn = createElement('button', {
      className: `segmented-btn ${!isLinearPlot ? 'active' : ''}`,
      onClick: () => {
        isLinearPlot = false;
        renderControlDeck(deckContainer, hudContainer);
      }
    }, 'Plot Asli Non-Linear');

    const linBtn = createElement('button', {
      className: `segmented-btn ${isLinearPlot ? 'active' : ''}`,
      onClick: () => {
        isLinearPlot = true;
        renderControlDeck(deckContainer, hudContainer);
      }
    }, 'Plot Linearisasi Regresi');

    plotToggle.appendChild(nonLinBtn);
    plotToggle.appendChild(linBtn);
    toggleGroup.appendChild(plotToggle);
    card.appendChild(toggleGroup);

    // Relative Pressure Slider
    const pGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    pGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Tekanan Relatif (P/P₀) / Konsentrasi Relatif'),
      createElement('span', { className: 'control-value-readout' }, `${equilibriumPressureX.toFixed(2)}`)
    ]));

    const pSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.02',
      max: '0.90',
      step: '0.02',
      value: String(equilibriumPressureX),
      onInput: (e) => {
        equilibriumPressureX = clampNumber(e.target.value, 0.02, 0.90, 0.25);
        pGroup.querySelector('.control-value-readout').textContent = `${equilibriumPressureX.toFixed(2)}`;
        updateHUD(hudContainer);
      }
    });
    pGroup.appendChild(pSlider);
    card.appendChild(pGroup);

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
      initMonomers(setup.width, setup.height);

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
