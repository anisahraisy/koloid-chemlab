/**
 * @file brownian-tyndall-lab.mjs
 * Modul 2: Laboratorium Optik Rayleigh-Mie & Dinamika Brown (Stokes-Einstein)
 * Standard S1 Kimia Murni
 */

import { createElement, clampNumber, formatScientific } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager, getPointerPos, drawScientificGrid } from '../core/canvas-utils.mjs';

export function createBrownianTyndallView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;

  // Active sub-mode
  let activeTab = 'tyndall'; // 'tyndall' | 'brownian'

  // Optics / Tyndall parameters
  let laserWavelengthNm = 532; // Green laser default (400 - 700 nm)
  let particleDiameterNm = 80; // 5 - 1000 nm
  let laserY = 0.5; // normalized height (0.2 - 0.8)
  let isDraggingLaser = false;

  // Brownian / Diffusion parameters
  let tempKelvin = 298.15; // 273.15 - 373.15 K
  let viscosityMilliPaS = 1.00; // 0.3 - 8.0 mPa.s (0.001 Pa.s for water)
  let hydroRadiusNm = 50; // 5 - 500 nm

  // Brownian simulation state
  const KB = 1.380649e-23; // J/K
  let brownianParticles = [];
  let trackedParticle = null;
  let trajectoryHistory = [];
  let msdDataPoints = [];
  let simTimeElapsed = 0;
  const NUM_BROWNIAN_PARTICLES = 50;

  // Convert wavelength (nm) to RGB string
  function wavelengthToRGB(wavelength) {
    let r = 0, g = 0, b = 0;
    if (wavelength >= 380 && wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      b = 1.0;
    } else if (wavelength >= 440 && wavelength < 490) {
      g = (wavelength - 440) / (490 - 440);
      b = 1.0;
    } else if (wavelength >= 490 && wavelength < 510) {
      g = 1.0;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1.0;
    } else if (wavelength >= 580 && wavelength < 645) {
      r = 1.0;
      g = -(wavelength - 645) / (645 - 580);
    } else if (wavelength >= 645 && wavelength <= 780) {
      r = 1.0;
    }

    // Factor for intensity drop-off near eye limits
    let factor = 1.0;
    if (wavelength >= 380 && wavelength < 420) {
      factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    } else if (wavelength >= 700 && wavelength <= 780) {
      factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    }

    const R = Math.round(255 * Math.pow(r * factor, 0.8));
    const G = Math.round(255 * Math.pow(g * factor, 0.8));
    const B = Math.round(255 * Math.pow(b * factor, 0.8));
    return `rgb(${R}, ${G}, ${B})`;
  }

  function initBrownianParticles(w, h) {
    brownianParticles = [];
    trajectoryHistory = [];
    msdDataPoints = [];
    simTimeElapsed = 0;

    const bounds = { x: 20, y: 20, w: Math.min(w * 0.6, w - 40), h: h - 40 };

    for (let i = 0; i < NUM_BROWNIAN_PARTICLES; i++) {
      const p = {
        x: bounds.x + Math.random() * bounds.w,
        y: bounds.y + Math.random() * bounds.h,
        originX: 0,
        originY: 0,
        r: 3.5,
        isTracked: i === 0
      };
      p.originX = p.x;
      p.originY = p.y;
      brownianParticles.push(p);
    }
    trackedParticle = brownianParticles[0];
  }

  function calculateDiffusionCoeff() {
    // D = k_B * T / (6 * pi * eta * r)
    const eta = viscosityMilliPaS * 1e-3; // Pa.s
    const r = hydroRadiusNm * 1e-9; // m
    return KB * tempKelvin / (6 * Math.PI * eta * r); // m^2 / s
  }

  function render(time, dt) {
    if (!ctx || !canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    // Clear Deep Graphite
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    if (activeTab === 'tyndall') {
      renderTyndallOptics(ctx, width, height, time);
    } else {
      renderBrownianDynamics(ctx, width, height, time, dt);
    }
  }

  function renderTyndallOptics(ctx, width, height, time) {
    ctx.save();

    // Cuvette layout: 3 cuvettes side by side
    const margin = 20;
    const cuvetteGap = 15;
    const cuvY = 35;
    const cuvHeight = height - 70;
    const totalAvailW = width - (margin * 2) - 60; // 60px for laser emitter
    const cuvWidth = Math.max(70, Math.floor((totalAvailW - (cuvetteGap * 2)) / 3));

    const cuvettes = [
      {
        id: 'solution',
        name: 'Larutan Sejati',
        sub: 'd < 1 nm (NaCl / Glukosa)',
        x: margin + 60,
        scatterFactor: 0.02
      },
      {
        id: 'colloid',
        name: 'Sistem Koloid',
        sub: '1 nm ≤ d ≤ 1 µm (Sol Au)',
        x: margin + 60 + cuvWidth + cuvetteGap,
        scatterFactor: 1.0
      },
      {
        id: 'suspension',
        name: 'Suspensi Kasar',
        sub: 'd > 1 µm (Debu / Tepung)',
        x: margin + 60 + (cuvWidth + cuvetteGap) * 2,
        scatterFactor: 4.5
      }
    ];

    const currentLaserY = cuvY + laserY * cuvHeight;
    const beamColor = wavelengthToRGB(laserWavelengthNm);

    // 1. Draw Laser Emitter Block
    ctx.fillStyle = '#27272A';
    ctx.strokeStyle = '#71717A';
    ctx.lineWidth = 1.5;
    ctx.fillRect(margin, currentLaserY - 14, 50, 28);
    ctx.strokeRect(margin, currentLaserY - 14, 50, 28);

    ctx.fillStyle = beamColor;
    ctx.beginPath();
    ctx.arc(margin + 50, currentLaserY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${laserWavelengthNm}nm`, margin + 25, currentLaserY + 4);

    // 2. Draw Cuvettes
    cuvettes.forEach((cuv) => {
      // Glass walls
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(cuv.x, cuvY, cuvWidth, cuvHeight);

      ctx.strokeStyle = 'rgba(220, 215, 205, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cuv.x, cuvY, cuvWidth, cuvHeight);

      // Glass meniscus tick marks
      ctx.fillStyle = '#52525B';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cuv.name, cuv.x + cuvWidth / 2, cuvY - 12);
      ctx.fillText(cuv.sub, cuv.x + cuvWidth / 2, cuvY + cuvHeight + 18);
    });

    // 3. Laser Beam Propagation and Rayleigh Scattering Cone
    // Rayleigh scattering intensity formula: I ~ (1 / lambda^4) * d^6
    const lambdaFactor = Math.pow(550 / laserWavelengthNm, 4);
    const diameterFactor = Math.pow(particleDiameterNm / 100, 3); // normalized display factor
    const rayleighIntensity = Math.min(1.0, 0.15 * lambdaFactor * diameterFactor);

    // Draw continuous laser beam across all cuvettes
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(margin + 50, currentLaserY);
    ctx.lineTo(width - margin, currentLaserY);
    ctx.stroke();

    // Core beam bright laser line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(margin + 50, currentLaserY);
    ctx.lineTo(width - margin, currentLaserY);
    ctx.stroke();

    // 4. Render Tyndall Light Scattering in each cuvette
    cuvettes.forEach((cuv) => {
      if (cuv.id === 'solution') {
        // Virtually invisible beam: true solution molecules are too small compared to lambda
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(cuv.x, currentLaserY - 4, cuvWidth, 8);
      } else if (cuv.id === 'colloid') {
        // Classic Tyndall Cone with Rayleigh glow
        const coneAlpha = Math.max(0.12, Math.min(0.85, rayleighIntensity * 0.8));
        const coneGrad = ctx.createLinearGradient(cuv.x, currentLaserY - 24, cuv.x, currentLaserY + 24);
        coneGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        coneGrad.addColorStop(0.5, beamColor.replace('rgb', 'rgba').replace(')', `, ${coneAlpha})`));
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(cuv.x, currentLaserY - 8);
        ctx.lineTo(cuv.x + cuvWidth, currentLaserY - 22);
        ctx.lineTo(cuv.x + cuvWidth, currentLaserY + 22);
        ctx.lineTo(cuv.x, currentLaserY + 8);
        ctx.closePath();
        ctx.fill();

        // Scattering nanoparticles in colloid
        for (let i = 0; i < 28; i++) {
          const px = cuv.x + (i * 29 + time * 0.03) % cuvWidth;
          const py = cuvY + (i * 37) % cuvHeight;
          const distToBeam = Math.abs(py - currentLaserY);
          if (distToBeam < 25) {
            // Glitter when hit by laser beam
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (cuv.id === 'suspension') {
        // Turbid Mie scattering & strong beam attenuation
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(cuv.x, cuvY + 4, cuvWidth, cuvHeight - 8);

        ctx.fillStyle = beamColor.replace('rgb', 'rgba').replace(')', ', 0.6)');
        ctx.beginPath();
        ctx.arc(cuv.x + 10, currentLaserY, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Touch clue on laser
    ctx.fillStyle = '#71717A';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Geser emitter laser secara vertikal untuk mengubah posisi berkas', margin, height - 10);

    ctx.restore();
  }

  function renderBrownianDynamics(ctx, width, height, time, dt) {
    ctx.save();
    const D = calculateDiffusionCoeff(); // m^2 / s

    // Split stage: Left 55% Particle chamber, Right 45% Real-Time MSD Plot
    const chamberW = Math.max(180, Math.floor(width * 0.55));
    const plotX = chamberW + 20;
    const plotW = width - plotX - 20;
    const plotY = 40;
    const plotH = height - 70;

    // 1. Draw Particle Chamber
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(15, 25, chamberW - 20, height - 50);

    ctx.fillStyle = 'rgba(29, 78, 216, 0.04)';
    ctx.fillRect(15, 25, chamberW - 20, height - 50);

    // Chamber title
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KAMAR DISPERSI BROWNIAN (2D STOKASTIK)', 20, 18);

    // Calculate step scaling based on Einstein relation: deltaX ~ sqrt(2 * D * dt)
    // Scale up for visual observation in nanometer-to-pixel ratio
    const visualSpeedScale = Math.sqrt(tempKelvin / (viscosityMilliPaS * hydroRadiusNm)) * 14.0;

    // Update particles
    simTimeElapsed += dt;
    for (let i = 0; i < brownianParticles.length; i++) {
      const p = brownianParticles[i];
      // Random walk Gaussian-like displacement
      const randAngle = Math.random() * Math.PI * 2;
      const step = (Math.random() + Math.random()) * visualSpeedScale * dt * 25;

      p.x += Math.cos(randAngle) * step;
      p.y += Math.sin(randAngle) * step;

      // Bounce in chamber
      const minX = 22;
      const maxX = chamberW - 12;
      const minY = 32;
      const maxY = height - 32;

      if (p.x < minX) p.x = minX;
      if (p.x > maxX) p.x = maxX;
      if (p.y < minY) p.y = minY;
      if (p.y > maxY) p.y = maxY;

      if (p.isTracked) {
        trajectoryHistory.push({ x: p.x, y: p.y });
        if (trajectoryHistory.length > 250) {
          trajectoryHistory.shift();
        }

        // Record Mean Squared Displacement data
        const dx = (p.x - p.originX) * 1e-9; // scaled
        const dy = (p.y - p.originY) * 1e-9;
        const r2 = (dx * dx + dy * dy);
        if (msdDataPoints.length === 0 || simTimeElapsed - msdDataPoints[msdDataPoints.length - 1].t > 0.1) {
          msdDataPoints.push({ t: simTimeElapsed, r2: r2 * 1e18 }); // nm^2
          if (msdDataPoints.length > 80) msdDataPoints.shift();
        }
      }
    }

    // Draw Trajectory Trail of Tracked Particle
    if (trajectoryHistory.length > 1) {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(trajectoryHistory[0].x, trajectoryHistory[0].y);
      for (let k = 1; k < trajectoryHistory.length; k++) {
        ctx.lineTo(trajectoryHistory[k].x, trajectoryHistory[k].y);
      }
      ctx.stroke();
    }

    // Draw particles
    for (let i = 0; i < brownianParticles.length; i++) {
      const p = brownianParticles[i];
      if (p.isTracked) {
        // Tracked particle: Glowing Amber
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Regular background colloid particles
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Live Real-Time MSD Plot <r^2> vs t
    if (plotW > 80) {
      drawScientificGrid(ctx, {
        x: plotX,
        y: plotY,
        width: plotW,
        height: plotH,
        xTicks: 4,
        yTicks: 4,
        xLabel: 'Waktu t (s)',
        yLabel: 'MSD <r²> (nm²)'
      });

      // Theoretical linear slope line: <r^2> = 4 * D * t
      ctx.strokeStyle = 'rgba(29, 78, 216, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH);
      ctx.lineTo(plotX + plotW, plotY + 10);
      ctx.stroke();

      // Theoretical label
      ctx.fillStyle = '#60A5FA';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Teori: <r²> = 4Dt', plotX + plotW, plotY + 8);

      // Plot experimental stochastic MSD trajectory points
      if (msdDataPoints.length > 2) {
        const maxT = Math.max(5, msdDataPoints[msdDataPoints.length - 1].t);
        const maxR2 = Math.max(100, Math.max(...msdDataPoints.map(d => d.r2)) * 1.2);

        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let idx = 0; idx < msdDataPoints.length; idx++) {
          const pt = msdDataPoints[idx];
          const px = plotX + (pt.t / maxT) * plotW;
          const py = plotY + plotH - (pt.r2 / maxR2) * plotH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function updateHUD(hudContainer) {
    if (!hudContainer) return;
    hudContainer.innerHTML = '';

    if (activeTab === 'tyndall') {
      const lambdaRel = Math.pow(550 / laserWavelengthNm, 4);
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Panjang Gelombang (λ): '),
        createElement('span', { className: 'val' }, `${laserWavelengthNm} nm`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Diameter Partikel (d): '),
        createElement('span', { className: 'val' }, `${particleDiameterNm} nm`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Faktor Hamburan Rayleigh (λ⁻⁴): '),
        createElement('span', { className: 'val' }, `${lambdaRel.toFixed(2)}×`)
      ]));
    } else {
      const D = calculateDiffusionCoeff();
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Suhu (T): '),
        createElement('span', { className: 'val' }, `${tempKelvin.toFixed(1)} K`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Viskositas (η): '),
        createElement('span', { className: 'val' }, `${viscosityMilliPaS.toFixed(2)} mPa·s`)
      ]));
      hudContainer.appendChild(createElement('div', { className: 'hud-pill' }, [
        createElement('span', { className: 'label' }, 'Koef. Difusi (D): '),
        createElement('span', { className: 'val' }, `${formatScientific(D, 2)} m²/s`)
      ]));
    }
  }

  function renderControlDeck(deckContainer, hudContainer) {
    deckContainer.innerHTML = '';

    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul 02 • Optik & Dinamika'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Rayleigh-Mie & Gerak Brown'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Simulasi optik hamburan Rayleigh-Tyndall melintasi 3 kuvet pembanding, serta dinamika Brown stokastik berdasarkan persamaan difusi Stokes-Einstein dan Mean Squared Displacement (MSD).'
    ));

    // Tab Switcher
    const tabs = [
      { id: 'tyndall', label: 'Optik Rayleigh-Tyndall' },
      { id: 'brownian', label: 'Gerak Brown & Difusi Stokes-Einstein' }
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

    if (activeTab === 'tyndall') {
      renderTyndallControls(deckContainer, hudContainer);
    } else {
      renderBrownianControls(deckContainer, hudContainer);
    }
  }

  function renderTyndallControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Parameter Berkas Laser & Hamburan Rayleigh'));

    // Formula Box
    const formulaBox = createElement('div', { className: 'formula-block' }, [
      createElement('div', { className: 'formula-tex' }, 'I(θ) = I₀ · [(1 + cos²θ)/(2R²)] · (2π/λ)⁴ · [(n² - 1)/(n² + 2)]² · (d/2)⁶'),
      createElement('div', { className: 'formula-caption' }, 
        'Intensitas hamburan Rayleigh berbanding terbalik dengan panjang gelombang pangkat empat (I ∝ λ⁻⁴) dan berbanding lurus dengan diameter partikel pangkat enam (I ∝ d⁶).'
      )
    ]);
    card.appendChild(formulaBox);

    // Wavelength Slider
    const lambdaGroup = createElement('div', { className: 'control-group' });
    lambdaGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Panjang Gelombang Laser (λ)'),
      createElement('span', { className: 'control-value-readout' }, `${laserWavelengthNm} nm`)
    ]));

    const lambdaSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '400',
      max: '700',
      step: '5',
      value: String(laserWavelengthNm),
      onInput: (e) => {
        laserWavelengthNm = clampNumber(e.target.value, 400, 700, 532);
        lambdaGroup.querySelector('.control-value-readout').textContent = `${laserWavelengthNm} nm`;
        updateHUD(hudContainer);
      }
    });
    lambdaGroup.appendChild(lambdaSlider);
    lambdaGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '400 nm (Ungu/Biru)'),
      createElement('span', {}, '532 nm (Hijau)'),
      createElement('span', {}, '700 nm (Merah)')
    ]));
    card.appendChild(lambdaGroup);

    // Particle Diameter Slider
    const dGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    dGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Diameter Partikel Koloid (d)'),
      createElement('span', { className: 'control-value-readout' }, `${particleDiameterNm} nm`)
    ]));

    const dSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '5',
      max: '300',
      step: '5',
      value: String(particleDiameterNm),
      onInput: (e) => {
        particleDiameterNm = clampNumber(e.target.value, 5, 300, 80);
        dGroup.querySelector('.control-value-readout').textContent = `${particleDiameterNm} nm`;
        updateHUD(hudContainer);
      }
    });
    dGroup.appendChild(dSlider);
    dGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '5 nm (Sangat Halus)'),
      createElement('span', {}, '100 nm'),
      createElement('span', {}, '300 nm (Hamburan Kuat)')
    ]));
    card.appendChild(dGroup);

    // Explanatory note
    card.appendChild(createElement('div', { style: { marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' } }, [
      createElement('p', {}, 'Perhatikan 3 kuvet pada kanvas simulasi:'),
      createElement('ul', { style: { paddingLeft: '18px', marginTop: '4px' } }, [
        createElement('li', {}, 'Kuvet 1 (Larutan Sejati): d < 1 nm, berkas laser tembus tanpa hamburan yang terlihat.'),
        createElement('li', {}, 'Kuvet 2 (Sistem Koloid): 1 nm ≤ d ≤ 1000 nm, kerucut Tyndall tampak jelas berkilau.'),
        createElement('li', {}, 'Kuvet 3 (Suspensi Kasar): d > 1000 nm, cahaya mengalami hamburan Mie turbid keruh.')
      ])
    ]));

    deckContainer.appendChild(card);
  }

  function renderBrownianControls(deckContainer, hudContainer) {
    const card = createElement('div', { className: 'editorial-card' });
    card.appendChild(createElement('h3', { className: 'card-title' }, 'Parameter Difusi Stokes-Einstein & Gerak Brown'));

    // Formula Box
    const formulaBox = createElement('div', { className: 'formula-block' }, [
      createElement('div', { className: 'formula-tex' }, 'D = (k_B · T) / (6 π η r)   dan   ⟨r²⟩ = 4 D t'),
      createElement('div', { className: 'formula-caption' }, 
        'Gerak Brown timbul dari fluktuasi tumbukan molekul pelarut termal. Laju difusi D meningkat seiring kenaikan suhu T, namun melambat bila viskositas medium η atau jari-jari r membesar.'
      )
    ]);
    card.appendChild(formulaBox);

    // Temperature Slider
    const tGroup = createElement('div', { className: 'control-group' });
    tGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Suhu Sistem (T)'),
      createElement('span', { className: 'control-value-readout' }, `${tempKelvin.toFixed(1)} K (${(tempKelvin - 273.15).toFixed(1)} °C)`)
    ]));

    const tSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '273.15',
      max: '363.15',
      step: '1',
      value: String(tempKelvin),
      onInput: (e) => {
        tempKelvin = clampNumber(e.target.value, 273.15, 363.15, 298.15);
        tGroup.querySelector('.control-value-readout').textContent = `${tempKelvin.toFixed(1)} K (${(tempKelvin - 273.15).toFixed(1)} °C)`;
        updateHUD(hudContainer);
      }
    });
    tGroup.appendChild(tSlider);
    tGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '0 °C (Es)'),
      createElement('span', {}, '25 °C (Ruang)'),
      createElement('span', {}, '90 °C (Panas)')
    ]));
    card.appendChild(tGroup);

    // Medium Viscosity Slider
    const etaGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    etaGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Viskositas Medium (η)'),
      createElement('span', { className: 'control-value-readout' }, `${viscosityMilliPaS.toFixed(2)} mPa·s`)
    ]));

    const etaSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '0.3',
      max: '6.0',
      step: '0.1',
      value: String(viscosityMilliPaS),
      onInput: (e) => {
        viscosityMilliPaS = clampNumber(e.target.value, 0.3, 6.0, 1.0);
        etaGroup.querySelector('.control-value-readout').textContent = `${viscosityMilliPaS.toFixed(2)} mPa·s`;
        updateHUD(hudContainer);
      }
    });
    etaGroup.appendChild(etaSlider);
    etaGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '0.3 (Aseton)'),
      createElement('span', {}, '1.0 (Air 20°C)'),
      createElement('span', {}, '6.0 (Gliserol/Sukrosa)')
    ]));
    card.appendChild(etaGroup);

    // Hydrodynamic Radius Slider
    const rGroup = createElement('div', { className: 'control-group', style: { marginTop: '12px' } });
    rGroup.appendChild(createElement('div', { className: 'control-label-row' }, [
      createElement('span', { className: 'control-label' }, 'Jari-Jari Hidrodinamik (r)'),
      createElement('span', { className: 'control-value-readout' }, `${hydroRadiusNm} nm`)
    ]));

    const rSlider = createElement('input', {
      type: 'range',
      className: 'tactile-slider',
      min: '5',
      max: '250',
      step: '5',
      value: String(hydroRadiusNm),
      onInput: (e) => {
        hydroRadiusNm = clampNumber(e.target.value, 5, 250, 50);
        rGroup.querySelector('.control-value-readout').textContent = `${hydroRadiusNm} nm`;
        updateHUD(hudContainer);
      }
    });
    rGroup.appendChild(rSlider);
    rGroup.appendChild(createElement('div', { className: 'slider-scale-ticks' }, [
      createElement('span', {}, '5 nm (Lincah)'),
      createElement('span', {}, '50 nm'),
      createElement('span', {}, '250 nm (Lambat)')
    ]));
    card.appendChild(rGroup);

    // Reset Tracking Trail Button
    const resetBtn = createElement('button', {
      className: 'btn btn-secondary btn-sm',
      style: { marginTop: '14px', width: '100%' },
      onClick: () => {
        trajectoryHistory = [];
        msdDataPoints = [];
        simTimeElapsed = 0;
      }
    }, 'Reset Jejak Lintasan Partikel & Plot MSD');
    card.appendChild(resetBtn);

    deckContainer.appendChild(card);
  }

  // Pointer interaction for moving laser
  function setupPointerInteraction(canvasEl) {
    canvasEl.addEventListener('pointerdown', (e) => {
      if (activeTab !== 'tyndall') return;
      const pos = getPointerPos(canvasEl, e);
      if (pos.inside && pos.x < 120) {
        isDraggingLaser = true;
        canvasEl.setPointerCapture(e.pointerId);
      }
    });

    canvasEl.addEventListener('pointermove', (e) => {
      if (!isDraggingLaser || activeTab !== 'tyndall') return;
      const pos = getPointerPos(canvasEl, e);
      const { height } = canvasEl.getBoundingClientRect();
      laserY = Math.max(0.15, Math.min(0.85, (pos.y - 35) / (height - 70)));
    });

    const stopDrag = (e) => {
      if (isDraggingLaser) {
        isDraggingLaser = false;
        try { canvasEl.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    canvasEl.addEventListener('pointerup', stopDrag);
    canvasEl.addEventListener('pointercancel', stopDrag);
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
      initBrownianParticles(setup.width, setup.height);

      const resizeObserver = new ResizeObserver(() => {
        const s = setupHighDPICanvas(canvas);
        ctx = s.ctx;
      });
      resizeObserver.observe(canvas);

      setupPointerInteraction(canvas);

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
