/**
 * @file case-diagnostics.mjs
 * Modul 5: Diagnostik Kasus Kimia Fisika & Evaluasi
 * Standard S1 Kimia Murni
 */

import { createElement } from '../core/security.mjs';
import { setupHighDPICanvas, createLoopManager } from '../core/canvas-utils.mjs';
import { CASES_DATA } from '../data/cases-data.mjs';
import { store } from '../core/store.mjs';

export function createCaseDiagnosticsView() {
  let container = null;
  let canvas = null;
  let ctx = null;
  let loopManager = null;

  // State
  let activeCaseIndex = 0;
  let selectedOption = null;
  let hasSubmitted = false;
  let unsubscribeStore = null;

  function renderRadarCanvas(ctx, width, height, time) {
    ctx.save();
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, width, height);

    const completed = store.get('completedCases') || {};
    const scores = store.get('caseScores') || {};
    const totalScore = store.get('totalScore') || 0;

    const completedCount = Object.values(completed).filter(Boolean).length;
    const progressPercent = Math.round((completedCount / CASES_DATA.length) * 100);

    const cx = width / 2;
    const cy = height / 2 - 10;
    const maxRadius = Math.min(width * 0.35, height * 0.35, 110);

    // Categories
    const categories = [
      { name: 'Adsorpsi BET', score: scores['case-bet-zeolite'] || 0 },
      { name: 'Teori DLVO', score: scores['case-dlvo-schulze-hardy'] || 0 },
      { name: 'Gibbs & SDS', score: scores['case-gibbs-sds'] || 0 },
      { name: 'DLS & Stokes', score: scores['case-dls-stokes-einstein'] || 0 },
      { name: 'Kinetika Au', score: scores['case-smoluchowski-coagulation'] || 0 },
      { name: 'Israelachvili', score: scores['case-israelachvili-cpp'] || 0 }
    ];

    const numAxes = categories.length;

    // Draw Polygonal Radar Grid
    ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
    ctx.lineWidth = 1;

    for (let level = 1; level <= 4; level++) {
      const r = (level / 4) * maxRadius;
      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const ang = (i / numAxes) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw Spokes
    for (let i = 0; i < numAxes; i++) {
      const ang = (i / numAxes) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(ang) * maxRadius;
      const y = cy + Math.sin(ang) * maxRadius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Axis label
      const lx = cx + Math.cos(ang) * (maxRadius + 18);
      const ly = cy + Math.sin(ang) * (maxRadius + 18);
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(categories[i].name, lx, ly + 3);
    }

    // Draw User Mastery Polygon
    ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.beginPath();

    categories.forEach((cat, idx) => {
      const ang = (idx / numAxes) * Math.PI * 2 - Math.PI / 2;
      const valRatio = cat.score > 0 ? 1.0 : 0.15;
      const r = valRatio * maxRadius;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Status Banner
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 13px "Newsreader", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Skor Kumulatif: ${totalScore} / 600 Poin (${progressPercent}% Selesai)`, cx, height - 35);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = progressPercent === 100 ? '#10B981' : '#F59E0B';
    const rank = progressPercent === 100 
      ? 'KUALIFIKASI: AHLI KIMIA FISIKA INTERMUKA' 
      : progressPercent >= 50 
      ? 'KUALIFIKASI: KIMIAWAN FISIKA MADYA' 
      : 'KUALIFIKASI: MAHASISWA PRAKTIKAN';
    ctx.fillText(rank, cx, height - 20);

    ctx.restore();
  }

  function renderControlDeck(deckContainer) {
    deckContainer.innerHTML = '';

    deckContainer.appendChild(createElement('div', { className: 'section-kicker' }, 'Modul 05 • Evaluasi Kuantitatif'));
    deckContainer.appendChild(createElement('h1', { className: 'section-title' }, 'Diagnostik Kasus Kimia Fisika'));
    deckContainer.appendChild(createElement('p', { className: 'section-lead' }, 
      'Pemecahan masalah kuantitatif tingkat universitas: BET zeolit, aturan Schulze-Hardy, adsorpsi Gibbs SDS, DLS Stokes-Einstein, koagulasi Smoluchowski, dan packing misel Israelachvili.'
    ));

    // Case Selector Pill Carousel
    const completed = store.get('completedCases') || {};
    const selectorRow = createElement('div', { 
      style: { display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' } 
    });

    CASES_DATA.forEach((c, idx) => {
      const isDone = completed[c.id];
      const isActive = idx === activeCaseIndex;
      const pill = createElement('button', {
        className: `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`,
        style: { 
          whiteSpace: 'nowrap',
          fontSize: '11px',
          borderColor: isDone ? 'var(--accent-teal)' : undefined
        },
        onClick: () => {
          activeCaseIndex = idx;
          selectedOption = null;
          hasSubmitted = false;
          renderControlDeck(deckContainer);
        }
      }, [
        createElement('span', {}, `Kasus ${idx + 1}`),
        isDone ? createElement('span', { style: { color: 'var(--accent-teal)', marginLeft: '4px' } }, '✓') : null
      ]);
      selectorRow.appendChild(pill);
    });
    deckContainer.appendChild(selectorRow);

    // Active Case Scenario Card
    const currentCase = CASES_DATA[activeCaseIndex];
    const isAlreadyDone = completed[currentCase.id];

    const card = createElement('div', { className: 'editorial-card', style: { marginTop: '12px' } });
    card.appendChild(createElement('div', { className: 'card-header' }, [
      createElement('h3', { className: 'card-title' }, currentCase.title),
      createElement('span', { className: 'badge badge-cobalt' }, currentCase.category)
    ]));

    // Scenario Text with formatted linebreaks
    const scenarioBox = createElement('div', { 
      style: { 
        backgroundColor: '#FFFFFF', 
        border: 'var(--border-hairline)', 
        padding: '12px', 
        borderRadius: 'var(--radius-xs)',
        fontSize: '13px',
        lineHeight: '1.6',
        color: 'var(--text-primary)',
        whiteSpace: 'pre-line'
      } 
    }, currentCase.scenario);
    card.appendChild(scenarioBox);

    // Question
    card.appendChild(createElement('div', { 
      style: { fontWeight: '700', fontSize: '13.5px', marginTop: '6px', color: 'var(--text-primary)' } 
    }, currentCase.question));

    // Multiple Choice Options
    const optionsGroup = createElement('div', { 
      style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' } 
    });

    currentCase.options.forEach(opt => {
      const isSelected = selectedOption === opt.id;
      let optStyle = {
        padding: '10px 14px',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-xs)',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        transition: 'all var(--transition-fast)'
      };

      if (hasSubmitted || isAlreadyDone) {
        if (opt.isCorrect) {
          optStyle.border = '2px solid #059669';
          optStyle.backgroundColor = 'rgba(16, 185, 129, 0.08)';
        } else if (isSelected && !opt.isCorrect) {
          optStyle.border = '2px solid #DC2626';
          optStyle.backgroundColor = 'rgba(220, 38, 38, 0.08)';
        }
      } else if (isSelected) {
        optStyle.border = '2px solid var(--text-primary)';
        optStyle.backgroundColor = 'var(--bg-surface)';
      }

      const optBtn = createElement('div', {
        style: optStyle,
        onClick: () => {
          if (!hasSubmitted && !isAlreadyDone) {
            selectedOption = opt.id;
            renderControlDeck(deckContainer);
          }
        }
      }, [
        createElement('span', { 
          style: { 
            fontFamily: 'var(--font-mono)', 
            fontWeight: '700', 
            width: '24px', 
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: isSelected ? 'var(--text-primary)' : '#E4DFD7',
            color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
            fontSize: '11px'
          } 
        }, opt.id),
        createElement('span', {}, opt.text)
      ]);
      optionsGroup.appendChild(optBtn);
    });
    card.appendChild(optionsGroup);

    // Submit / Action Button
    if (!hasSubmitted && !isAlreadyDone) {
      const submitBtn = createElement('button', {
        className: 'btn btn-primary',
        style: { marginTop: '12px' },
        disabled: !selectedOption,
        onClick: () => {
          if (!selectedOption) return;
          hasSubmitted = true;
          const chosen = currentCase.options.find(o => o.id === selectedOption);
          const isPassed = Boolean(chosen && chosen.isCorrect);
          const score = isPassed ? 100 : 0;
          store.saveCaseResult(currentCase.id, score, isPassed);
          renderControlDeck(deckContainer);
        }
      }, 'Verifikasi & Periksa Jawaban');
      card.appendChild(submitBtn);
    }

    // Step-by-Step Mathematical Explanation
    if (hasSubmitted || isAlreadyDone) {
      const chosen = currentCase.options.find(o => o.id === selectedOption);
      const isPassed = isAlreadyDone || (chosen && chosen.isCorrect);

      const explCard = createElement('div', { 
        className: `editorial-card ${isPassed ? 'accent-teal' : 'accent-crimson'}`,
        style: { marginTop: '14px' }
      });

      explCard.appendChild(createElement('div', { className: 'card-header' }, [
        createElement('h4', { className: 'card-title' }, isPassed ? 'Pembahasan Solusi Ilmiah (Benar)' : 'Pembahasan Solusi Ilmiah (Belum Tepat)'),
        createElement('span', { className: `badge ${isPassed ? 'badge-teal' : 'badge-crimson'}` }, isPassed ? '+100 Poin' : '0 Poin')
      ]));

      const stepsList = createElement('div', { 
        style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' } 
      });

      currentCase.explanationStepByStep.forEach(st => {
        stepsList.appendChild(createElement('div', { className: 'formula-block' }, [
          createElement('strong', { style: { fontSize: '12.5px', color: 'var(--text-primary)' } }, st.step),
          createElement('div', { 
            style: { 
              fontSize: '12px', 
              color: 'var(--text-secondary)', 
              marginTop: '4px', 
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-line'
            } 
          }, st.detail)
        ]));
      });
      explCard.appendChild(stepsList);

      // Next Case or Retry Button
      const nextRow = createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } });
      if (activeCaseIndex < CASES_DATA.length - 1) {
        nextRow.appendChild(createElement('button', {
          className: 'btn btn-primary btn-sm',
          onClick: () => {
            activeCaseIndex++;
            selectedOption = null;
            hasSubmitted = false;
            renderControlDeck(deckContainer);
          }
        }, 'Lanjut ke Kasus Berikutnya →'));
      }
      explCard.appendChild(nextRow);

      card.appendChild(explCard);
    }

    // Reset Progress Button
    const resetWrap = createElement('div', { style: { marginTop: '16px', borderTop: 'var(--border-hairline)', paddingTop: '12px' } });
    resetWrap.appendChild(createElement('button', {
      className: 'btn btn-secondary btn-sm',
      style: { color: 'var(--text-muted)' },
      onClick: () => {
        if (confirm('Apakah Anda yakin ingin mengatur ulang progres nilai evaluasi kasus?')) {
          store.resetProgress();
          selectedOption = null;
          hasSubmitted = false;
          renderControlDeck(deckContainer);
        }
      }
    }, 'Reset Seluruh Progres Evaluasi'));
    card.appendChild(resetWrap);

    deckContainer.appendChild(card);
  }

  return {
    mount(parent) {
      container = createElement('div', { className: 'scientific-studio' });

      const stage = createElement('div', { className: 'studio-canvas-stage' });
      canvas = createElement('canvas', { className: 'canvas-element' });
      stage.appendChild(canvas);

      const deck = createElement('div', { className: 'studio-control-deck' });

      container.appendChild(stage);
      container.appendChild(deck);
      parent.appendChild(container);

      const setup = setupHighDPICanvas(canvas);
      ctx = setup.ctx;

      const resizeObserver = new ResizeObserver(() => {
        const s = setupHighDPICanvas(canvas);
        ctx = s.ctx;
      });
      resizeObserver.observe(canvas);

      loopManager = createLoopManager(canvas, (time) => {
        renderRadarCanvas(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1), time);
      });
      loopManager.start();

      renderControlDeck(deck);

      unsubscribeStore = store.on('cases_updated', () => {
        // will re-render radar in loop
      });
    },
    unmount() {
      if (unsubscribeStore) {
        unsubscribeStore();
        unsubscribeStore = null;
      }
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
