/* 캔버스(페어틀) 그리기 · 블록 이동 · 확대/축소 */
(function () {
  const { h, $, $$ } = PF;

  PF.chromeBtn = (label, fn, cls, title) => {
    const b = h('button', { class: 'pf-chrome pf-chip ' + (cls || ''), type: 'button', contenteditable: 'false', title: title || null, onmousedown: (e) => e.preventDefault(), onclick: (e) => { e.stopPropagation(); fn(e); } });
    if (label && label.startsWith('@')) b.innerHTML = PF.icon(label.slice(1));
    else b.textContent = label;
    return b;
  };

  /* ---------- 글꼴 ---------- */
  PF.fontList = function () {
    const base = [
      { family: 'Paperlogy', label: '페이퍼로지' },
      { family: 'KoPubWorld Dotum', label: '코펍월드 돋움' },
      { family: 'Pretendard', label: '프리텐다드' },
    ];
    const custom = (PF.project.settings.fonts.custom || []).map((c) => ({ family: c.name, label: c.name + ' (추가)' }));
    return base.concat(custom, [{ family: 'serif', label: '명조 계열 (기기 기본)' }, { family: 'monospace', label: '고정폭 (기기 기본)' }]);
  };
  const fam = (f) => (/^(serif|sans-serif|monospace|cursive)$/.test(f) ? f : `'${f}'`);

  PF.applyCustomFonts = function () {
    const css = (PF.project.settings.fonts.custom || [])
      .map((c) => (c.kind === 'css' ? c.css : PF.assets[c.asset] ? `@font-face{font-family:'${c.name.replace(/'/g, '')}';src:url(${PF.assets[c.asset]});font-display:swap;}` : ''))
      .join('\n');
    $('#custom-fonts').textContent = css;
  };

  function applyVars() {
    const s = PF.project.settings, t = s.theme, f = PF.frameEl;
    const map = { bg: t.bg, card: t.card, border: t.border, title: t.title, text: t.text, muted: t.muted, a: t.accentA, b: t.accentB, tag: t.tagBg, tagtext: t.tagText, hl: t.highlight, line: t.line };
    for (const k in map) f.style.setProperty('--c-' + k, map[k]);
    f.style.setProperty('--radius', s.radius + 'px');
    f.style.setProperty('--bw', s.borderWidth + 'px');
    f.style.setProperty('--gap', s.gap + 'px');
    f.style.setProperty('--pad', s.cardPad + 'px');
    f.style.setProperty('--outer', s.pad + 'px');
    f.style.setProperty('--f-title', `${fam(s.fonts.title)}, 'Paperlogy', 'Pretendard', sans-serif`);
    f.style.setProperty('--f-body', `${fam(s.fonts.body)}, 'KoPubWorld Dotum', 'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`);
    f.style.width = s.width + 'px';
    // 테두리 방식: block(블록마다) · page(페이지 전체) · both(둘 다) · none(없음)
    const pg = s.page, mode = s.borderMode;
    const hasPage = mode === 'page' || mode === 'both';
    f.classList.toggle('has-page', hasPage);
    f.classList.toggle('no-block-border', mode === 'page' || mode === 'none');
    f.classList.toggle('blocks-clear', !!s.clearBlocks);
    f.style.setProperty('--page-bw', pg.width + 'px');
    f.style.setProperty('--page-color', pg.color || t.border);
    f.style.setProperty('--page-radius', pg.radius + 'px');
    f.style.setProperty('--page-inset', pg.inset + 'px');
    f.style.setProperty('--page-fill', pg.fill === 'card' ? t.card : pg.fill === 'bg' ? t.bg : 'transparent');
  }
  PF.applyVars = applyVars;

  /* 배경 레이어: 단색 · 그라데이션 · 이미지 */
  function bgLayer() {
    const bg = PF.project.settings.bg;
    if (!bg || bg.type === 'solid') return null;
    const el = h('div', { class: 'pf-bg' });
    if (bg.type === 'gradient') {
      const stops = [bg.g1, bg.g2].concat(bg.useG3 ? [bg.g3] : []).join(', ');
      el.style.background = bg.kind === 'radial' ? `radial-gradient(circle at ${bg.pos || 'center'}, ${stops})` : `linear-gradient(${bg.angle}deg, ${stops})`;
    } else if (bg.type === 'image') {
      const src = bg.img && PF.assets[bg.img];
      if (!src) return null;
      Object.assign(el.style, {
        backgroundImage: `url("${src}")`,
        backgroundSize: bg.fit === 'tile' ? bg.tile + 'px auto' : bg.fit,
        backgroundRepeat: bg.fit === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: bg.pos || 'center',
        opacity: bg.opacity,
      });
    }
    return el;
  }

  PF.normalizeSettings = function (s) {
    s.borderMode ||= 'block';
    s.page = Object.assign({ width: 3, color: '', radius: 32, inset: 28, fill: 'none' }, s.page || {});
    s.bg = Object.assign({ type: 'solid', kind: 'linear', angle: 160, g1: s.theme.bg, g2: s.theme.tagBg, g3: s.theme.card, useG3: false, pos: 'center', img: null, fit: 'cover', tile: 320, opacity: 1 }, s.bg || {});
  };

  /* ---------- 이미지 칸 ---------- */
  PF.imgSlot = function (ref, set, o = {}) {
    const el = h('div', { class: 'pf-img ' + (o.cls || '') });
    if (o.style) Object.assign(el.style, o.style);
    const src = ref && PF.assets[ref.id];
    // 비율: 직접 높이 · 정해진 비율 · 원본 비율(이미지가 없을 땐 4:3 자리만)
    if (o.ratio === 'custom') { el.style.height = (o.h || 300) + 'px'; el.classList.add('custom-h'); }
    else if (o.ratio && o.ratio !== 'auto') el.style.aspectRatio = o.ratio;
    else if (!src) el.style.aspectRatio = '4/3';
    // 너비 · 정렬
    if (o.w != null && o.w < 100) {
      el.style.width = o.w + '%';
      el.style.marginLeft = o.align === 'left' ? '0' : 'auto';
      el.style.marginRight = o.align === 'right' ? '0' : 'auto';
    }
    if (src) {
      const x = ref.x ?? 50, y = ref.y ?? 50, z = ref.zoom ?? 1;
      const img = h('img', { src, draggable: 'false', alt: '' });
      if (o.ratio === 'auto') img.className = 'natural';
      img.style.objectPosition = `${x}% ${y}%`;
      img.style.transformOrigin = `${x}% ${y}%`;
      if (z !== 1) img.style.transform = `scale(${z})`;
      el.append(img);
    } else {
      el.classList.add('empty');
      if (o.empty) { el.classList.add('has-alt'); el.append(o.empty); }
      else if (o.ph !== '') el.append(h('span', { class: 'pf-img-ph' }, h('b', {}, '+'), o.ph || '이미지'));
    }
    const upload = async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      const id = await PF.addImageFile(file);
      set({ id, x: 50, y: 50, zoom: 1 });
      PF.commit();
      PF.render();
    };
    if (!PF.ui.preview) {
      el.addEventListener('click', async (e) => {
        if (src) return; // 채워진 이미지는 블록 선택 → 오른쪽 패널에서 교체/조정
        if (e.target.closest('.pf-ed')) return; // 원 안의 글자를 고치는 중
        e.stopPropagation();
        const b = el.closest('.pf-block');
        if (b) PF.select(b.dataset.id);
        const [f] = await PF.pickFile('image/*');
        upload(f);
      });
      if (src) el.append(PF.chromeBtn('교체', async () => { const [f] = await PF.pickFile('image/*'); upload(f); }, 'pf-img-swap'));
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); upload(e.dataTransfer.files[0]); });
    }
    return el;
  };

  /* ---------- 블록 ---------- */
  const STYLE_LABEL = { card: '기본 카드', accent: '캐릭터 색 테두리', a: 'A색 테두리', b: 'B색 테두리', fill: '면 채움', solidA: 'A색 면', solidB: 'B색 면', plain: '투명 (카드 없음)' };
  PF.STYLE_LABEL = STYLE_LABEL;

  function renderBlock(b) {
    const def = PF.BLOCKS[b.type];
    if (!def) return h('div', { class: 'pf-block' }, '알 수 없는 블록');
    const w = b.data.who === 'B' ? 'B' : 'A';
    const el = h('div', { class: `pf-block t-${b.type} st-${b.style} who-${w}` + (PF.ui.selected === b.id ? ' selected' : ''), 'data-id': b.id });
    if (b.bg) el.style.setProperty('--blk-bg', b.bg);
    if (b.border) { el.style.setProperty('--blk-border', b.border); el.style.setProperty('--blk-bw', 'var(--bw)'); }
    if (b.color) el.style.setProperty('--blk-text', b.color);
    if (b.pad != null && b.pad !== '') el.style.setProperty('--blk-pad', b.pad + 'px');
    try {
      el.append(def.render(b));
    } catch (err) {
      console.error(err);
      el.append(h('div', { class: 'pf-small muted' }, '이 블록을 그리지 못했어요.'));
    }
    if (!PF.ui.preview) {
      el.append(
        h('div', { class: 'pf-chrome pf-blk-tools', contenteditable: 'false' },
          h('span', { class: 'pf-handle', title: '끌어서 옮기기' }, '⠿'),
          h('span', { class: 'pf-blk-name' }, def.name),
          PF.chromeBtn('@up', () => PF.moveBlock(b.id, -1), '', '위로'),
          PF.chromeBtn('@down', () => PF.moveBlock(b.id, 1), '', '아래로'),
          PF.chromeBtn('@copy', () => PF.duplicateBlock(b.id), '', '복제'),
          PF.chromeBtn('@trash', () => PF.deleteBlock(b.id), 'danger', '삭제')));
    }
    return el;
  }

  PF.render = function (skipInspector) {
    const p = PF.project, f = PF.frameEl;
    applyVars();
    f.classList.toggle('editing', !PF.ui.preview);
    f.replaceChildren();
    const bgl = bgLayer();
    if (bgl) f.append(bgl);
    f.append(PF.renderStickers(true));
    const sheet = h('div', { class: 'pf-sheet' });
    const rows = h('div', { class: 'pf-rows' });
    p.rows.forEach((row, ri) => {
      const rEl = h('div', { class: 'pf-row' + (row.fill ? ' fill' : '') + (row.align ? ' align-' + row.align : ''), 'data-id': row.id, style: { gridTemplateColumns: row.cols.map((c) => `minmax(0, ${c.w}fr)`).join(' ') } });
      row.cols.forEach((col) => {
        const cEl = h('div', { class: 'pf-col' + (PF.ui.targetCol === col.id ? ' target' : ''), 'data-id': col.id });
        col.blocks.forEach((b) => cEl.append(renderBlock(b)));
        if (!col.blocks.length && !PF.ui.preview)
          cEl.append(h('div', { class: 'pf-chrome pf-empty-col', onclick: () => { PF.ui.targetCol = col.id; PF.ui.selected = null; PF.render(); PF.toast('왼쪽 패널에서 블록을 고르면 이 칸에 들어가요'); } },
            h('b', {}, '빈 칸'), h('span', {}, '블록을 끌어오거나, 누른 뒤 왼쪽에서 블록을 고르세요'),
            row.cols.length > 1 ? PF.chromeBtn('이 칸 지우기', () => { row.cols = row.cols.filter((c) => c !== col); PF.commit(); PF.render(); }) : PF.chromeBtn('이 줄 지우기', () => { p.rows.splice(ri, 1); PF.commit(); PF.render(); })));
        rEl.append(cEl);
      });
      rows.append(rEl);
    });
    sheet.append(rows);
    f.append(sheet);
    f.append(PF.renderStickers(false));
    if (!skipInspector) PF.renderInspector();
    PF.applyZoom();
  };

  PF.select = function (id) {
    PF.ui.selected = id;
    PF.ui.selSticker = null;
    PF.ui.targetCol = null;
    $$('.pf-block.selected,.pf-sticker.selected,.pf-col.target', PF.frameEl).forEach((x) => x.classList.remove('selected', 'target'));
    if (id) {
      const el = PF.frameEl.querySelector(`.pf-block[data-id="${id}"]`);
      if (el) el.classList.add('selected');
    }
    PF.renderInspector();
  };

  /* ---------- 블록 조작 ---------- */
  function cleanup() {
    const p = PF.project;
    p.rows = p.rows.filter((r) => r.cols.some((c) => c.blocks.length) || r.cols.length > 1);
  }
  PF.moveBlock = function (id, dir) {
    const f = PF.findBlock(id);
    if (!f) return;
    const { col, bi, ri } = f;
    const p = PF.project;
    if (dir < 0 && bi > 0) [col.blocks[bi - 1], col.blocks[bi]] = [col.blocks[bi], col.blocks[bi - 1]];
    else if (dir > 0 && bi < col.blocks.length - 1) [col.blocks[bi + 1], col.blocks[bi]] = [col.blocks[bi], col.blocks[bi + 1]];
    else {
      // 칸의 끝 → 줄 단위로 위/아래 이동
      const single = f.row.cols.length === 1 && col.blocks.length === 1;
      const ni = ri + dir;
      if (ni < 0 || ni >= p.rows.length) return;
      if (single) [p.rows[ri], p.rows[ni]] = [p.rows[ni], p.rows[ri]];
      else {
        col.blocks.splice(bi, 1);
        p.rows.splice(dir > 0 ? ri + 1 : ri, 0, PF.makeRow([[f.block]]));
        cleanup();
      }
    }
    PF.commit();
    PF.render();
  };
  PF.moveBlockCol = function (id, dir) {
    const f = PF.findBlock(id);
    if (!f) return;
    const to = f.row.cols[f.ci + dir];
    if (!to) return PF.toast(dir < 0 ? '왼쪽에 칸이 없어요. 속성 → “칸 추가”로 칸을 나눠 보세요' : '오른쪽에 칸이 없어요. 속성 → “칸 추가”로 칸을 나눠 보세요');
    f.col.blocks.splice(f.bi, 1);
    to.blocks.push(f.block);
    PF.commit();
    PF.render();
  };
  PF.duplicateBlock = function (id) {
    const f = PF.findBlock(id);
    if (!f) return;
    const copy = JSON.parse(JSON.stringify(f.block));
    copy.id = 'b' + PF.uid();
    f.col.blocks.splice(f.bi + 1, 0, copy);
    PF.ui.selected = copy.id;
    PF.commit();
    PF.render();
  };
  PF.deleteBlock = function (id) {
    const f = PF.findBlock(id);
    if (!f) return;
    f.col.blocks.splice(f.bi, 1);
    cleanup();
    if (PF.ui.selected === id) PF.ui.selected = null;
    PF.commit();
    PF.render();
  };
  PF.addBlock = function (type) {
    const p = PF.project;
    const b = PF.makeBlock(type);
    const sel = PF.ui.selected && PF.findBlock(PF.ui.selected);
    let targetCol = null;
    if (PF.ui.targetCol) for (const r of p.rows) for (const c of r.cols) if (c.id === PF.ui.targetCol) targetCol = c;
    if (targetCol) targetCol.blocks.push(b);
    else if (sel) sel.col.blocks.splice(sel.bi + 1, 0, b);
    else p.rows.push(PF.makeRow([[b]]));
    PF.ui.selected = b.id;
    PF.ui.targetCol = null;
    PF.commit();
    PF.render();
    requestAnimationFrame(() => {
      const el = PF.frameEl.querySelector(`.pf-block[data-id="${b.id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  /* ---------- 끌어서 옮기기 ---------- */
  function initDrag(frame) {
    let drag = null;
    const ind = h('div', { class: 'drop-ind hidden' });
    document.body.append(ind);

    frame.addEventListener('pointerdown', (e) => {
      const hd = e.target.closest('.pf-handle');
      if (!hd) return;
      e.preventDefault();
      const bEl = hd.closest('.pf-block');
      drag = { id: bEl.dataset.id, el: bEl, target: null };
      bEl.classList.add('dragging');
      document.body.classList.add('is-dragging');
      hd.setPointerCapture(e.pointerId);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.target = findTarget(e.clientX, e.clientY);
      const t = drag.target;
      if (!t) return ind.classList.add('hidden');
      ind.classList.remove('hidden');
      Object.assign(ind.style, { left: t.x + 'px', top: t.y - 2 + 'px', width: t.w + 'px' });
      ind.classList.toggle('row', t.kind === 'row');
    });
    const end = () => {
      if (!drag) return;
      const t = drag.target;
      drag.el.classList.remove('dragging');
      document.body.classList.remove('is-dragging');
      ind.classList.add('hidden');
      if (t) dropTo(drag.id, t);
      drag = null;
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);

    function findTarget(x, y) {
      const els = document.elementsFromPoint(x, y);
      const colEl = els.map((n) => n.closest && n.closest('.pf-col')).find((n) => n && frame.contains(n));
      const fr = frame.getBoundingClientRect();
      const gap = PF.project.settings.gap * PF.zoomScale;
      if (colEl) {
        const cr = colEl.getBoundingClientRect();
        const blocks = $$(':scope > .pf-block', colEl).filter((b) => b !== drag.el);
        let idx = blocks.length;
        for (let i = 0; i < blocks.length; i++) {
          const r = blocks[i].getBoundingClientRect();
          if (y < r.top + r.height / 2) { idx = i; break; }
        }
        let ly;
        if (!blocks.length) ly = cr.top + 20;
        else if (idx < blocks.length) ly = blocks[idx].getBoundingClientRect().top - gap / 2;
        else ly = blocks[blocks.length - 1].getBoundingClientRect().bottom + gap / 2;
        // 다른 블록 기준 인덱스 → 실제 배열 인덱스로
        const real = idx < blocks.length ? blocks[idx].dataset.id : null;
        return { kind: 'col', colId: colEl.dataset.id, before: real, x: cr.left, y: ly, w: cr.width };
      }
      if (x < fr.left || x > fr.right || y < fr.top - 40 || y > fr.bottom + 40) return null;
      const rows = $$('.pf-row', frame);
      let ri = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) { ri = i; break; }
      }
      let ly = ri < rows.length ? rows[ri].getBoundingClientRect().top - gap / 2 : rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom + gap / 2 : fr.top + 30;
      const pad = PF.project.settings.pad * PF.zoomScale;
      return { kind: 'row', index: ri, x: fr.left + pad, y: ly, w: fr.width - pad * 2 };
    }

    function dropTo(id, t) {
      const p = PF.project;
      const f = PF.findBlock(id);
      if (!f) return;
      const rowBefore = t.kind === 'row' ? p.rows[t.index] : null;
      f.col.blocks.splice(f.bi, 1);
      if (t.kind === 'col') {
        let col = null;
        for (const r of p.rows) for (const c of r.cols) if (c.id === t.colId) col = c;
        if (!col) return;
        const at = t.before ? col.blocks.findIndex((b) => b.id === t.before) : -1;
        col.blocks.splice(at < 0 ? col.blocks.length : at, 0, f.block);
      } else {
        const idx = rowBefore ? p.rows.indexOf(rowBefore) : p.rows.length;
        p.rows.splice(idx, 0, PF.makeRow([[f.block]]));
      }
      cleanup();
      PF.commit();
      PF.render();
    }
  }

  /* ---------- 확대 / 축소 ---------- */
  PF.zoomScale = 1;
  PF.applyZoom = function () {
    if (!PF.project) return;
    const stage = $('#stage'), wrap = $('#zoom-wrap'), inner = $('#zoom-inner'), f = PF.frameEl;
    const W = PF.project.settings.width;
    let z = PF.ui.zoom;
    if (z === 'fit') z = Math.min(1, (stage.clientWidth - 48) / W);
    z = PF.clamp(z, 0.1, 3);
    PF.zoomScale = z;
    f.style.setProperty('--inv', String(1 / z));
    inner.style.transform = `scale(${z})`;
    wrap.style.width = W * z + 'px';
    wrap.style.height = f.offsetHeight * z + 'px';
    $('#zoom-label').textContent = PF.ui.zoom === 'fit' ? `맞춤 ${Math.round(z * 100)}%` : Math.round(z * 100) + '%';
    PF.placeRichBar && PF.placeRichBar();
  };

  PF.initCanvas = function () {
    PF.frameEl = $('#frame');
    initDrag(PF.frameEl);
    new ResizeObserver(() => PF.applyZoom()).observe(PF.frameEl);
    new ResizeObserver(() => PF.ui.zoom === 'fit' && PF.applyZoom()).observe($('#stage'));
    PF.frameEl.addEventListener('click', (e) => {
      if (PF.ui.preview) return;
      if (e.target.closest('.pf-chrome') || e.target.closest('.pf-sticker')) return;
      const b = e.target.closest('.pf-block');
      if (b) { if (PF.ui.selected !== b.dataset.id) PF.select(b.dataset.id); }
      else PF.select(null);
    });
    $('#stage').addEventListener('click', (e) => {
      if (e.target.id === 'stage' || e.target.id === 'zoom-wrap') PF.select(null);
    });
  };
})();
