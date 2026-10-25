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

  // Physical simulation parameters per dispersion medium
  let particles = [];
  let currentMedium = 'Cair'; // 'Gas' | 'Cair' | 'Padat'
  let coagulatedEvents = []; // visual ripple effects on aerosol collision

  // Physics constants per medium
  const MEDIUM_PHYSICS = {
    'Gas': {
      label: 'Medium Gas (Aerosol)',
      viscosity: 'η ≈ 0.018 mPa·s (Mendekati Nol)',
      kinetics: 'Kinetika Gas Inersial (Mean Free Path Panjang, Cepat)',
      surfaceForce: 'Koagulasi Spontan van der Waals (Tanpa Lapisan Ganda Listrik)',
      speedScale: 3.2,
      particleCount: 42
    },
    'Cair': {
      label: 'Medium Cair (Sol / Emulsi / Buih)',
      viscosity: 'η ≈ 1.00 mPa·s (Redaman Viskositas Stokes)',
      kinetics: 'Gerak Brown Murni (Fluktuasi Termal Pelarut Zig-Zag)',
      surfaceForce: 'Tolakan Elektrostatik DLVO / Lapisan Ganda Listrik (Stabil Terdispersi)',
      speedScale: 1.0,
      particleCount: 52
    },
    'Padat': {
      label: 'Medium Padat (Buih Padat / Gel / Sol Padat)',
      viscosity: 'η → ∞ (Matriks Kaku / Rigid Solid Network)',
      kinetics: 'Translasi Terkunci (v_x = 0, v_y = 0)',
      surfaceForce: 'Vibrasi Termal Kisi Lokal Frekuensi Tinggi (Amplitudo Sangat Kecil)',
      speedScale: 0.0,
      particleCount: 45
    }
  };

  let solidNetworkBonds = []; // structural matrix scaffold bonds for solid medium

  function initParticlesForMedium(medium, width, height) {
    currentMedium = medium;
    particles = [];
    solidNetworkBonds = [];
    coagulatedEvents = [];

    const bounds = {
      minX: 45,
      maxX: width - 45,
      minY: 40,
      maxY: height - 40
    };

    const count = MEDIUM_PHYSICS[medium].particleCount;

    if (medium === 'Gas') {
      // Medium Gas: High speed, straight paths, spontaneous coagulation on contact
      for (let i = 0; i < count; i++) {
        const speed = 2.2 + Math.random() * 2.0;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
          y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          baseR: 3.5,
          currentR: 3.5,
          mass: 1.0,
          clusterCount: 1,
          color: '#D97706'
        });
      }
    } else if (medium === 'Cair') {
      // Medium Cair: Damped Brownian motion, DLVO electrostatic repulsion halo
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 0.8;
        particles.push({
          x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
          y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          baseR: 4.0 + Math.random() * 2.5,
          currentR: 4.0 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          edlHaloRadius: 7.5 // Gouy-Chapman diffuse layer thickness
        });
      }
    } else {
      // Medium Padat: Rigid matrix, zero translation, local high-frequency lattice vibration
      const cols = 9;
      const rows = 5;
      const stepX = (bounds.maxX - bounds.minX) / (cols - 1);
      const stepY = (bounds.maxY - bounds.minY) / (rows - 1);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jitterX = (Math.random() - 0.5) * stepX * 0.45;
          const jitterY = (Math.random() - 0.5) * stepY * 0.45;
          const ox = bounds.minX + c * stepX + jitterX;
          const oy = bounds.minY + r * stepY + jitterY;

          particles.push({
            originX: ox,
            originY: oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            baseR: 3.8 + Math.random() * 2.2,
            currentR: 3.8 + Math.random() * 2.2,
            vibeFreq: 22.0 + Math.random() * 8.0, // high frequency
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2
          });
        }
      }

      // Generate structural matrix skeleton bonds between neighboring solid sites
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].originX - particles[j].originX;
          const dy = particles[i].originY - particles[j].originY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < stepX * 1.35) {
            solidNetworkBonds.push([i, j]);
          }
        }
      }
    }
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    // Clear Deep Graphite
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

    // Ensure particle medium matches current selected system
    if (sys.dispersionMedium !== currentMedium) {
      initParticlesForMedium(sys.dispersionMedium, width, height);
    }

    ctx.save();

    // 1. Vessel Boundary Box
    const bounds = {
      minX: 35,
      maxX: width - 35,
      minY: 30,
      maxY: height - 30
    };

    ctx.strokeStyle = 'rgba(220, 215, 205, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

    // Medium background styling
    if (currentMedium === 'Gas') {
      // Transparent / subtle convection lines for air
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    } else if (currentMedium === 'Cair') {
      // Fluid blue tinted aqueous matrix
      ctx.fillStyle = 'rgba(29, 78, 216, 0.06)';
      ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    } else {
      // Solid grey/stone rigid scaffold
      ctx.fillStyle = 'rgba(113, 113, 122, 0.10)';
      ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

      // Draw rigid solid network skeleton
      ctx.strokeStyle = 'rgba(220, 215, 205, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      for (const [idxA, idxB] of solidNetworkBonds) {
        const pA = particles[idxA];
        const pB = particles[idxB];
        if (pA && pB) {
          ctx.moveTo(pA.originX, pA.originY);
          ctx.lineTo(pB.originX, pB.originY);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Physics Update According to Dispersion Medium
    if (currentMedium === 'Gas') {
      // =========================================================================
      // REGIME 1: MEDIUM GAS (AEROSOL CAIR / AEROSOL PADAT)
      // Fast straight trajectories, mean free path, spontaneous van der Waals coagulation
      // =========================================================================
      const safeDt = Math.min(0.04, dt);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Inertial straight-line translation (viscosity ~ 0)
        p.x += p.vx * 60 * safeDt;
        p.y += p.vy * 60 * safeDt;

        // Weak gravity drift (sedimentation tendency of aerosols)
        p.vy += 0.008;

        // Wall collisions (elastic bounce)
        if (p.x - p.currentR < bounds.minX) {
          p.x = bounds.minX + p.currentR;
          p.vx = Math.abs(p.vx);
        } else if (p.x + p.currentR > bounds.maxX) {
          p.x = bounds.maxX - p.currentR;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y - p.currentR < bounds.minY) {
          p.y = bounds.minY + p.currentR;
          p.vy = Math.abs(p.vy);
        } else if (p.y + p.currentR > bounds.maxY) {
          p.y = bounds.maxY - p.currentR;
          p.vy = -Math.abs(p.vy) * 0.95;
        }
      }

      // Spontaneous van der Waals Coagulation / Aggregation in Gas
      // (No Electric Double Layer in air to prevent contact)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pA = particles[i];
          const pB = particles[j];
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const collisionDist = pA.currentR + pB.currentR;

          if (dist < collisionDist && pA.clusterCount < 5 && pB.clusterCount < 5) {
            // Aggregate: mass and volume conservation (V ~ R^3)
            const newMass = pA.mass + pB.mass;
            pA.vx = (pA.mass * pA.vx + pB.mass * pB.vx) / newMass;
            pA.vy = (pA.mass * pA.vy + pB.mass * pB.vy) / newMass;
            pA.mass = newMass;
            pA.clusterCount += pB.clusterCount;
            pA.currentR = Math.min(14, Math.pow(Math.pow(pA.currentR, 3) + Math.pow(pB.currentR, 3), 1 / 3));

            // Record ripple effect
            coagulatedEvents.push({
              x: (pA.x + pB.x) / 2,
              y: (pA.y + pB.y) / 2,
              radius: collisionDist,
              life: 1.0
            });

            // Respawn particle B at border as tiny new aerosol condensation droplet
            pB.currentR = 3.2;
            pB.mass = 1.0;
            pB.clusterCount = 1;
            pB.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            pB.y = bounds.minY + 6;
            pB.vx = (Math.random() - 0.5) * 3.0;
            pB.vy = 1.0 + Math.random() * 2.0;
          }
        }
      }

    } else if (currentMedium === 'Cair') {
      // =========================================================================
      // REGIME 2: MEDIUM CAIR (SOL, EMULSI, BUIH)
      // Damped Stokes Brownian motion + DLVO Electric Double Layer Repulsion
      // =========================================================================
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Continuous stochastic thermal Brownian kicks from solvent molecules
        p.vx += (Math.random() - 0.5) * 0.9;
        p.vy += (Math.random() - 0.5) * 0.9;

        // Stokes viscous drag damping
        p.vx *= 0.94;
        p.vy *= 0.94;

        // Position update
        p.x += p.vx;
        p.y += p.vy;

        // Wall boundary softly repels particles
        if (p.x - p.currentR < bounds.minX) {
          p.x = bounds.minX + p.currentR;
          p.vx = Math.abs(p.vx);
        } else if (p.x + p.currentR > bounds.maxX) {
          p.x = bounds.maxX - p.currentR;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y - p.currentR < bounds.minY) {
          p.y = bounds.minY + p.currentR;
          p.vy = Math.abs(p.vy);
        } else if (p.y + p.currentR > bounds.maxY) {
          p.y = bounds.maxY - p.currentR;
          p.vy = -Math.abs(p.vy);
        }
      }

      // DLVO Electric Double Layer (EDL) Repulsion between colloidal particles
      // Prevents coagulation; particles soft-bounce when diffuse layers overlap!
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pA = particles[i];
          const pB = particles[j];
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const edlThreshold = pA.currentR + pB.currentR + (pA.edlHaloRadius || 7.0);

          if (dist > 0.01 && dist < edlThreshold) {
            // Overlapping Gouy-Chapman diffuse layer creates exponential repulsion force:
            // F_DLVO ~ exp(-kappa * h)
            const overlap = (edlThreshold - dist) / edlThreshold;
            const force = Math.pow(overlap, 1.6) * 1.6;
            const nx = dx / dist;
            const ny = dy / dist;

            // Soft electrostatic repulsion
            pA.vx -= nx * force;
            pA.vy -= ny * force;
            pB.vx += nx * force;
            pB.vy += ny * force;
          }
        }
      }

    } else {
      // =========================================================================
      // REGIME 3: MEDIUM PADAT (BUIH PADAT, GEL, SOL PADAT)
      // Rigid solid scaffold: translation locked (v=0), local high-freq thermal vibration
      // =========================================================================
      const vibeAmp = 1.1; // small amplitude in pixels

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vx = 0;
        p.vy = 0;

        // Local harmonic thermal vibration about fixed lattice coordinates
        const thetaX = (time * 0.001) * p.vibeFreq + p.phaseX;
        const thetaY = (time * 0.001) * (p.vibeFreq * 1.15) + p.phaseY;
        p.x = p.originX + Math.sin(thetaX) * vibeAmp;
        p.y = p.originY + Math.cos(thetaY) * vibeAmp;
      }
    }

    // 3. Render Particles & Visual Interfacial Effects
    // Render coagulation flashes for aerosol medium
    if (currentMedium === 'Gas') {
      for (let k = coagulatedEvents.length - 1; k >= 0; k--) {
        const ev = coagulatedEvents[k];
        ev.life -= dt * 2.5;
        if (ev.life <= 0) {
          coagulatedEvents.splice(k, 1);
        } else {
          ctx.strokeStyle = `rgba(239, 68, 68, ${ev.life * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ev.x, ev.y, ev.radius + (1.0 - ev.life) * 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Render individual particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.save();

      if (currentMedium === 'Cair') {
        // Draw Gouy-Chapman Diffuse Electric Double Layer (EDL) Halo
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentR + (p.edlHaloRadius || 7.0), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (sys.id === 'foam' || sys.id === 'solid-foam') {
        // Gas bubbles with thin surfactant / liquid border
        ctx.strokeStyle = '#0F766E';
        ctx.lineWidth = 1.6;
        ctx.fillStyle = 'rgba(15, 118, 110, 0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentR * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (sys.id === 'emulsion' || sys.id === 'gel') {
        // Droplets with polar head markers
        ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F2EFE9';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        // Sol or Aerosol solid core
        ctx.fillStyle = p.clusterCount > 1 ? '#B91C1C' : '#D97706';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentR, 0, Math.PI * 2);
        ctx.fill();

        if (currentMedium === 'Padat') {
          // Rigid anchor marker in solid crystal
          ctx.strokeStyle = 'rgba(242, 239, 233, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.originX, p.originY, 1.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Physical Status Tag in Canvas Watermark
    ctx.fillStyle = '#8E8A82';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    const physInfo = MEDIUM_PHYSICS[currentMedium];
    ctx.fillText(`${sys.name.toUpperCase()} [MEDIUM: ${currentMedium.toUpperCase()}]`, width - 40, height - 38);
    ctx.fillText(`${physInfo.surfaceForce}`, width - 40, height - 24);

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
      const phys = MEDIUM_PHYSICS[sys.dispersionMedium] || MEDIUM_PHYSICS['Cair'];

      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Sistem: '),
        createElement('span', { className: 'val' }, sys.name)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Medium: '),
        createElement('span', { className: 'val' }, `${sys.dispersionMedium.toUpperCase()}`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Viskositas: '),
        createElement('span', { className: 'val' }, phys.viscosity.split(' ')[0] + ' ' + (phys.viscosity.split(' ')[1] || ''))
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Gaya Antarmuka: '),
        createElement('span', { className: 'val' }, sys.dispersionMedium === 'Gas' ? 'Koagulasi van der Waals' : sys.dispersionMedium === 'Cair' ? 'Tolakan DLVO (Stabil)' : 'Kisi Kaku (v=0)')
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
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  initParticlesForMedium(sys.dispersionMedium, rect.width || 600, rect.height || 400);
                }
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

      // Physical Kinetics & Surface Thermodynamics Card
      const physCard = createElement('div', { 
        className: `editorial-card ${sys.dispersionMedium === 'Gas' ? 'accent-amber' : sys.dispersionMedium === 'Cair' ? 'accent-cobalt' : 'accent-teal'}`,
        style: { marginTop: '8px', padding: '10px 12px' }
      });

      physCard.appendChild(createElement('div', { className: 'card-header' }, [
        createElement('h4', { className: 'card-title', style: { fontSize: '12.5px' } }, `Kinetika & Interaksi Medium ${sys.dispersionMedium.toUpperCase()}`),
        createElement('span', { className: 'card-tag' }, MEDIUM_PHYSICS[sys.dispersionMedium].viscosity)
      ]));

      let physDetail = '';
      if (sys.dispersionMedium === 'Gas') {
        physDetail = '• Viskositas medium mendekati nol (η ≈ 0.018 mPa·s): Partikel terdispersi meluncur cepat dengan mean free path panjang.\n• Tanpa Lapisan Ganda Listrik (EDL): Karena udara berkonstanta dielektrik rendah (ε_r ≈ 1), gaya tarik van der Waals mendominasi secara mutlak saat tumbukan, memicu koagulasi/agregasi spontan membentuk klaster yang lebih besar (tampak kilatan merah pada kanvas).';
      } else if (sys.dispersionMedium === 'Cair') {
        physDetail = '• Viskositas fluida (η ≈ 1.00 mPa·s): Meredam translasi inersial menjadi Gerak Brown murni (fluktuasi tumbukan molekul pelarut termal berkelanjutan).\n• Teori DLVO & Lapisan Ganda Listrik: Terbentuk lapisan Stern dan difus Gouy-Chapman (lingkaran halo putus-putus). Partikel saling tolak halus ketika lapisan ganda bertumpang tindih, mempertahankan kestabilan dispersi.';
      } else {
        physDetail = '• Matriks Padat Kaku (Rigid Solid Network, η → ∞): Seluruh gerak translasi terkunci mutlak (v_x = 0, v_y = 0).\n• Partikel fase terdispersi terperangkap di dalam kisi/pori padatan dan hanya menampilkan vibrasi termal lokal berfrekuensi tinggi dengan amplitudo sangat kecil (A ≈ 1.1 px) di sekitar koordinat jangkar asalnya.';
      }

      physCard.appendChild(createElement('div', { 
        style: { fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-line', marginTop: '4px', lineHeight: '1.5' } 
      }, physDetail));
      detailCard.appendChild(physCard);

      // Formula block
      detailCard.appendChild(createElement('div', { className: 'formula-block', style: { marginTop: '8px' } }, [
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
      const initialSys = COLLOID_SYSTEMS.find(s => s.id === selectedSystemId) || COLLOID_SYSTEMS[4];
      initParticlesForMedium(initialSys.dispersionMedium, setup.width, setup.height);

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
