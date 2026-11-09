(() => {
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), movesEl = $('moves'), timeEl = $('time'), bestEl = $('best');
  const winEl = $('win'), winText = $('win-text'), sizeSel = $('size');

  /* ---------- Ilustração neon (SVG gerado no código, fatiada em peças) ---------- */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 500 500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1633"/><stop offset="1" stop-color="#14123a"/></linearGradient></defs>
  <rect width="500" height="500" fill="url(#g)"/>
  <g fill="none" stroke="#1d3a7a" stroke-width="2">
    <path d="M0 120H90L130 160H260"/><path d="M500 300H410L370 340H300"/><path d="M60 500V420L100 380"/><path d="M250 0V70L290 110"/>
  </g>
  <rect x="100" y="-20" width="110" height="150" rx="30" fill="#1f2f6b"/>
  <rect x="190" y="150" width="130" height="190" rx="34" fill="#1f2f6b"/>
  <rect x="-20" y="270" width="120" height="130" rx="30" fill="#1f2f6b"/>
  <rect x="300" y="380" width="120" height="140" rx="30" fill="#1f2f6b"/>
  <g fill="none" stroke="#2de2e6" stroke-width="7" stroke-linecap="round" opacity=".85">
    <path d="M150 -10 Q130 40 160 80"/><path d="M225 250 Q250 300 215 345 T230 440"/>
    <path d="M390 210 Q340 190 330 230"/><path d="M300 440 Q330 400 350 380 T330 330"/>
  </g>
  <circle cx="410" cy="60" r="90" fill="#ff2e88"/><path d="M330 120 Q400 150 500 30 L500 140Z" fill="#ffd400"/>
  <path d="M390 40 Q420 20 450 30" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"/>
  <circle cx="120" cy="215" r="48" fill="#ffd400"/><path d="M95 265 L145 265 L130 315 L110 315Z" fill="#ff8a1f"/>
  <circle cx="300" cy="60" r="34" fill="#00e5ff"/>
  <circle cx="385" cy="325" r="62" fill="#00e5ff"/><path d="M370 385 L400 385 L392 420 L378 420Z" fill="#00a8c8"/>
  <path d="M365 300 Q385 280 410 290" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round"/>
  <path d="M185 125 L245 125 L225 180 L205 180Z" fill="#ff2e88"/>
  <circle cx="55" cy="95" r="30" fill="#8b5cff"/><circle cx="270" cy="400" r="44" fill="#ff2e88"/>
  <circle cx="75" cy="440" r="70" fill="#ffd400"/><circle cx="180" cy="465" r="42" fill="#00e5ff"/>
  <circle cx="455" cy="470" r="52" fill="#8b5cff"/><circle cx="450" cy="285" r="26" fill="none" stroke="#ff2e88" stroke-width="12"/>
  <rect x="280" y="210" width="16" height="44" rx="8" fill="#ffd400"/><rect x="60" y="170" width="14" height="40" rx="7" fill="#00e5ff"/>
  </svg>`;
  const img = new Image();   // a ilustração é decodificada UMA vez e fatiada em canvas pequenos

  /* ---------- Estado ---------- */
  let N = 5, tiles = [], els = {}, moves = 0, secs = 0, timer = null, playing = false;

  const key = () => 'organizando-pecas-best-' + N;
  const loadBest = () => { try { return JSON.parse(localStorage.getItem(key())); } catch { return null; } };
  const saveBest = b => { try { localStorage.setItem(key(), JSON.stringify(b)); } catch {} };
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const showBest = () => { const b = loadBest(); bestEl.textContent = b ? b.moves + ' mov.' : '--'; };

  /* ---------- Construção ---------- */
  function build() {
    boardEl.innerHTML = ''; els = {};
    boardEl.style.setProperty('--n', N);
    const total = N * N;
    for (let v = 1; v <= total; v++) {
      const hx = (v - 1) % N, hy = Math.floor((v - 1) / N);
      const t = document.createElement('div');
      t.className = 'tile' + (v === total ? ' ghost' : '');
      t.style.setProperty('--hx', hx); t.style.setProperty('--hy', hy);
      const i = document.createElement('i');
      const c = document.createElement('canvas'), S = Math.round(960 / N);
      c.width = c.height = S;
      c.getContext('2d').drawImage(img, hx * 1000 / N, hy * 1000 / N, 1000 / N, 1000 / N, 0, 0, S, S);
      const b = document.createElement('b'); b.textContent = v;
      i.appendChild(c); t.appendChild(i); t.appendChild(b);
      t.addEventListener('pointerdown', e => { e.preventDefault(); clickValue(v); });
      boardEl.appendChild(t); els[v] = t;
    }
  }

  function render() {
    tiles.forEach((v, idx) => {
      if (!v) return;
      els[v].style.setProperty('--cx', idx % N);
      els[v].style.setProperty('--cy', Math.floor(idx / N));
    });
  }

  /* ---------- Lógica ---------- */
  const solved = () => tiles.every((v, i) => i === tiles.length - 1 ? v === 0 : v === i + 1);

  // desliza as peças da posição idx em direção ao espaço vazio (mesma linha/coluna)
  function slide(idx) {
    const e = tiles.indexOf(0), r = Math.floor(idx / N), c = idx % N, er = Math.floor(e / N), ec = e % N;
    if (idx === e || (r !== er && c !== ec)) return false;
    const step = r === er ? (c < ec ? 1 : -1) : (r < er ? N : -N);
    for (let p = e; p !== idx; p -= step) tiles[p] = tiles[p - step];
    tiles[idx] = 0;
    return true;
  }

  function clickValue(v) {
    if (!winEl.hidden) return;
    if (slide(tiles.indexOf(v))) afterMove();
  }

  function afterMove() {
    moves++; movesEl.textContent = moves;
    if (!playing) { playing = true; timer = setInterval(() => { secs++; timeEl.textContent = fmt(secs); }, 1000); }
    render();
    if (solved()) win();
  }

  function win() {
    clearInterval(timer); playing = false;
    const last = els[N * N];
    last.style.setProperty('--cx', N - 1); last.style.setProperty('--cy', N - 1);
    last.classList.remove('ghost');
    const b = loadBest(); let msg = `${moves} movimentos em ${fmt(secs)}.`;
    if (!b || moves < b.moves) { saveBest({ moves, secs }); msg += ' Novo recorde! 🏆'; showBest(); }
    setTimeout(() => { winText.textContent = msg; winEl.hidden = false; }, 700);
  }

  function shuffle() {
    clearInterval(timer); playing = false; moves = 0; secs = 0;
    movesEl.textContent = 0; timeEl.textContent = '00:00'; winEl.hidden = true;
    const total = N * N;
    tiles = Array.from({ length: total }, (_, i) => (i + 1) % total);
    els[total].classList.add('ghost');
    let prev = -1;
    do {
      for (let k = 0; k < 150 * N; k++) {            // só movimentos válidos => sempre tem solução
        const e = tiles.indexOf(0), r = Math.floor(e / N), c = e % N, opts = [];
        if (r > 0) opts.push(e - N); if (r < N - 1) opts.push(e + N);
        if (c > 0) opts.push(e - 1); if (c < N - 1) opts.push(e + 1);
        const pool = opts.filter(o => o !== prev), pick = pool[Math.floor(Math.random() * pool.length)];
        prev = e; tiles[e] = tiles[pick]; tiles[pick] = 0;
      }
    } while (solved());
    render(); showBest();
  }

  /* ---------- Controles ---------- */
  document.addEventListener('keydown', e => {
    const m = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 }[e.key];
    if (!m || !winEl.hidden) return;
    const em = tiles.indexOf(0), idx = em + m;
    if (idx < 0 || idx >= N * N || (Math.abs(m) === 1 && Math.floor(idx / N) !== Math.floor(em / N))) return;
    e.preventDefault(); if (slide(idx)) afterMove();
  });
  $('shuffle').onclick = $('again').onclick = shuffle;
  sizeSel.onchange = () => { N = +sizeSel.value; build(); shuffle(); };

  // "Ver imagem": mostra a figura montada enquanto o botão é mantido pressionado
  const peekBtn = $('peek');
  peekBtn.addEventListener('pointerdown', () => boardEl.classList.add('peek'));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => peekBtn.addEventListener(ev, () => boardEl.classList.remove('peek')));

  img.onload = () => { build(); shuffle(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
})();
