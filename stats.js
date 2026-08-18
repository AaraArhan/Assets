/* ═══════════════════════════════════════════════════════════════════
   STATS.JS — Statistics, Charts, Heatmap rendering
   Pure Canvas / DOM rendering, no external deps
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const Stats = (() => {

  /* ── COLORS ────────────────────────────────────────────────────── */
  const C = {
    again:   '#ff3d5a',
    hard:    '#ff9f40',
    good:    '#00cc6a',
    easy:    '#00cfff',
    bg:      '#0d1424',
    grid:    'rgba(255,255,255,0.05)',
    text:    '#6b8cad',
    accent:  '#00ff88',
    bar:     'rgba(0,255,136,0.15)',
    barHov:  'rgba(0,255,136,0.35)',
  };

  /* ── HEATMAP ───────────────────────────────────────────────────── */
  function renderHeatmap(container, heatmapData) {
    container.innerHTML = '';

    const WEEKS  = 53;
    const DAYS   = 7;
    const SIZE   = 13;
    const GAP    = 3;
    const LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const svg   = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const total = WEEKS * DAYS;
    const W     = WEEKS * (SIZE + GAP) + 40;
    const H     = DAYS  * (SIZE + GAP) + 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.style.overflow = 'visible';

    // Day labels
    LABELS.forEach((l, i) => {
      if (i % 2 !== 0) return;
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.textContent = l;
      t.setAttribute('x', 0);
      t.setAttribute('y', 20 + i * (SIZE + GAP));
      t.setAttribute('font-size', '9');
      t.setAttribute('fill', C.text);
      t.setAttribute('font-family', 'monospace');
      svg.appendChild(t);
    });

    // Month labels
    const monthsSeen = {};
    const now    = new Date();
    const endDay = new Date(now);
    endDay.setHours(0,0,0,0);

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const idx    = total - 1 - (w * DAYS + d);
        const date   = new Date(endDay);
        date.setDate(date.getDate() - idx);
        const key    = date.toISOString().slice(0, 10);
        const count  = heatmapData[key] || 0;
        const month  = date.toLocaleString('default', { month: 'short' });

        // Month label
        if (!monthsSeen[month] && d === 0) {
          monthsSeen[month] = true;
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.textContent = month;
          t.setAttribute('x', 36 + w * (SIZE + GAP));
          t.setAttribute('y', 10);
          t.setAttribute('font-size', '9');
          t.setAttribute('fill', C.text);
          t.setAttribute('font-family', 'monospace');
          svg.appendChild(t);
        }

        // Cell
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 36 + w * (SIZE + GAP));
        rect.setAttribute('y', 14 + d * (SIZE + GAP));
        rect.setAttribute('width',  SIZE);
        rect.setAttribute('height', SIZE);
        rect.setAttribute('rx', 3);
        rect.setAttribute('fill', getHeatColor(count));

        // Tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${key}: ${count} cards`;
        rect.appendChild(title);
        rect.style.cursor = 'pointer';

        svg.appendChild(rect);
      }
    }

    container.appendChild(svg);
  }

  function getHeatColor(count) {
    if (count === 0)   return '#1a2535';
    if (count < 5)     return '#004d2a';
    if (count < 15)    return '#00803f';
    if (count < 30)    return '#00b356';
    if (count < 60)    return '#00cc6a';
    return '#00ff88';
  }

  /* ── BAR CHART (forecast / daily reviews) ──────────────────────── */
  function renderBarChart(canvas, labels, datasets, opts = {}) {
    const ctx  = canvas.getContext('2d');
    const W    = canvas.width;
    const H    = canvas.height;
    const PAD  = { top: 20, right: 20, bottom: 36, left: 44 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Find max
    const allVals = datasets.flatMap(d => d.data);
    const maxVal  = Math.max(...allVals, 1);
    const step    = niceStep(maxVal);
    const gridMax = Math.ceil(maxVal / step) * step;

    // Grid lines
    for (let v = 0; v <= gridMax; v += step) {
      const y = PAD.top + chartH - (v / gridMax) * chartH;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();

      ctx.fillStyle   = C.text;
      ctx.font        = '10px monospace';
      ctx.textAlign   = 'right';
      ctx.fillText(v, PAD.left - 6, y + 4);
    }

    // Bars
    const n        = labels.length;
    const groupW   = chartW / n;
    const barW     = Math.max(4, groupW / datasets.length - 4);

    datasets.forEach((ds, di) => {
      ds.data.forEach((val, i) => {
        const x  = PAD.left + i * groupW + di * (barW + 2) + 4;
        const bH = (val / gridMax) * chartH;
        const y  = PAD.top + chartH - bH;

        // Bar
        ctx.fillStyle = ds.color || C.accent;
        ctx.beginPath();
        roundRectPath(ctx, x, y, barW, bH, 3);
        ctx.fill();
      });
    });

    // X Labels
    ctx.fillStyle  = C.text;
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    
    // Auto-skip logic to prevent overlap (allow ~45px per label)
    const skip = Math.ceil(labels.length / Math.max(1, Math.floor(chartW / 45)));
    
    labels.forEach((label, i) => {
      if (i % skip !== 0) return; // Skip labels that would overlap
      const x = PAD.left + i * groupW + groupW / 2;
      ctx.fillText(label, x, PAD.top + chartH + 18);
    });

    // Axis lines
    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, PAD.top + chartH);
    ctx.lineTo(PAD.left + chartW, PAD.top + chartH);
    ctx.stroke();
  }

  /* ── LINE CHART ────────────────────────────────────────────────── */
  function renderLineChart(canvas, labels, datasets, opts = {}) {
    const ctx  = canvas.getContext('2d');
    const W    = canvas.width;
    const H    = canvas.height;
    const PAD  = { top: 20, right: 20, bottom: 36, left: 44 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal  = Math.max(...allVals, 1);
    const step    = niceStep(maxVal);
    const gridMax = Math.ceil(maxVal / step) * step;

    // Grid
    for (let v = 0; v <= gridMax; v += step) {
      const y = PAD.top + chartH - (v / gridMax) * chartH;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText(v, PAD.left - 6, y + 4);
    }

    // Lines
    datasets.forEach(ds => {
      if (!ds.data.length) return;
      ctx.strokeStyle = ds.color || C.accent;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';

      // Fill area
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const x = PAD.left + (i / (labels.length - 1)) * chartW;
        const y = PAD.top + chartH - (val / gridMax) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      const lastX = PAD.left + chartW;
      const baseY = PAD.top + chartH;
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(PAD.left, baseY);
      ctx.closePath();
      ctx.fillStyle = `${ds.color || C.accent}22`;
      ctx.fill();

      // Line
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * chartW;
        const y = PAD.top + chartH - (val / gridMax) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      ctx.fillStyle = ds.color || C.accent;
      ds.data.forEach((val, i) => {
        const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * chartW;
        const y = PAD.top + chartH - (val / gridMax) * chartH;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      });
    });

    // X Labels
    ctx.fillStyle = C.text; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    
    // Auto-skip logic to prevent overlap
    const skipLine = Math.ceil(labels.length / Math.max(1, Math.floor(chartW / 45)));
    
    labels.forEach((label, i) => {
      if (i % skipLine !== 0) return; // Skip labels that would overlap
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * chartW;
      ctx.fillText(label, x, PAD.top + chartH + 18);
    });

    // Axes
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + chartH);
    ctx.lineTo(PAD.left + chartW, PAD.top + chartH); ctx.stroke();
  }

  /* ── DONUT CHART ───────────────────────────────────────────────── */
  function renderDonut(canvas, segments, opts = {}) {
    const ctx   = canvas.getContext('2d');
    const W     = canvas.width;
    const H     = canvas.height;
    const cx    = W / 2;
    const cy    = H / 2;
    const R     = Math.min(W, H) / 2 - 16;
    const inner = R * 0.55;

    ctx.clearRect(0, 0, W, H);

    const total  = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    let startAng = -Math.PI / 2;

    segments.forEach(seg => {
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAng, startAng + angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAng += angle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = C.bg;
    ctx.fill();

    // Center text
    if (opts.centerLabel) {
      ctx.fillStyle  = '#e8f4ff';
      ctx.font       = `bold ${opts.centerSize || 22}px monospace`;
      ctx.textAlign  = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.centerLabel, cx, cy - 8);
      ctx.font      = '11px sans-serif';
      ctx.fillStyle = C.text;
      ctx.fillText(opts.centerSub || '', cx, cy + 14);
    }
  }

  /* ── MINI SPARKLINE ────────────────────────────────────────────── */
  function renderSparkline(canvas, data, color = C.accent) {
    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!data.length) return;
    const max = Math.max(...data, 1);
    const min = 0;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((val - min) / (max - min)) * H * 0.85 - 4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill
    const lastX = W;
    ctx.lineTo(lastX, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = `${color}18`;
    ctx.fill();
  }

  /* ── UTILS ─────────────────────────────────────────────────────── */
  function niceStep(max) {
    if (max <= 5)   return 1;
    if (max <= 20)  return 5;
    if (max <= 50)  return 10;
    if (max <= 200) return 25;
    if (max <= 500) return 50;
    return 100;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    r = Math.min(r, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function gradeLabel(g) {
    return ['Again','Hard','Good','Easy'][g] || '';
  }

  function gradeColor(g) {
    return [C.again, C.hard, C.good, C.easy][g] || C.accent;
  }

  function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  }

  /* ── PUBLIC ────────────────────────────────────────────────────── */
  return {
    renderHeatmap,
    renderBarChart,
    renderLineChart,
    renderDonut,
    renderSparkline,
    gradeLabel,
    gradeColor,
    formatDuration,
    getHeatColor,
    C,
  };

})();