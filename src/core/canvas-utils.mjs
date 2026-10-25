/**
 * @file canvas-utils.mjs
 * High-DPI Canvas scaling, touch pointer event normalization, and lifecycle loop manager.
 */

/**
 * Configure Canvas for High-DPI (Retina/AMOLED) displays.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number }}
 */
export function setupHighDPICanvas(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 400;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  return { ctx, width, height, dpr };
}

/**
 * Normalize pointer coordinates relative to canvas internal CSS space.
 * @param {HTMLCanvasElement} canvas
 * @param {PointerEvent|MouseEvent|TouchEvent} evt
 * @returns {{ x: number, y: number, inside: boolean }}
 */
export function getPointerPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  let clientX = evt.clientX;
  let clientY = evt.clientY;

  if (evt.touches && evt.touches.length > 0) {
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

  return { x, y, inside };
}

/**
 * Create a battery-efficient render loop that automatically pauses when canvas is invisible or tab inactive.
 * @param {HTMLCanvasElement} canvas
 * @param {(timestamp: number, dt: number) => void} renderFn
 * @returns {{ start: () => void, stop: () => void, isRunning: () => boolean }}
 */
export function createLoopManager(canvas, renderFn) {
  let animId = null;
  let lastTime = 0;
  let running = false;
  let isIntersecting = true;
  let isTabVisible = document.visibilityState === 'visible';

  function loop(now) {
    if (!running) return;

    if (isIntersecting && isTabVisible) {
      const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0.016;
      lastTime = now;
      renderFn(now, dt);
    }

    animId = requestAnimationFrame(loop);
  }

  // Intersection Observer to stop loop when scrolled out of view
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && running && !animId) {
        lastTime = performance.now();
        animId = requestAnimationFrame(loop);
      }
    }
  }, { threshold: 0.05 });

  if (canvas) observer.observe(canvas);

  // Visibility change listener
  const onVisibilityChange = () => {
    isTabVisible = document.visibilityState === 'visible';
    if (isTabVisible && running && !animId) {
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    },
    destroy() {
      this.stop();
      if (canvas) observer.unobserve(canvas);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
    isRunning() {
      return running;
    }
  };
}

/**
 * Draw scientific chart grid and coordinate axes on a canvas
 */
export function drawScientificGrid(ctx, { x, y, width, height, xTicks = 5, yTicks = 5, xLabel = '', yLabel = '' }) {
  ctx.save();
  ctx.strokeStyle = 'rgba(220, 215, 205, 0.2)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8E8A82';
  ctx.font = '10px "JetBrains Mono", monospace';

  // Vertical grid lines
  for (let i = 0; i <= xTicks; i++) {
    const gx = x + (width * i) / xTicks;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + height);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let j = 0; j <= yTicks; j++) {
    const gy = y + (height * j) / yTicks;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }

  // Axes lines
  ctx.strokeStyle = '#52525B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.stroke();

  // Axis Labels
  if (xLabel) {
    ctx.textAlign = 'right';
    ctx.fillText(xLabel, x + width, y + height + 16);
  }
  if (yLabel) {
    ctx.textAlign = 'left';
    ctx.fillText(yLabel, x + 4, y - 6);
  }

  ctx.restore();
}
