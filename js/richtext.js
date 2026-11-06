/* 편집 가능한 글자 + 글자 꾸밈 도구막대 */
(function () {
  const { h, $ } = PF;
  let saved = null; // { range, el }
  let current = null; // 포커스된 편집 칸

  const isEmptyHTML = (el) => !el.textContent.replace(/​/g, '').trim() && !el.querySelector('img');

  PF.ed = function (obj, key, opts = {}) {
    const el = h(opts.tag || 'div', { class: 'pf-ed ' + (opts.cls || ''), 'data-ph': opts.ph || '' });
    el.innerHTML = obj[key] || '';
    el._obj = obj;
    el._key = key;
    el._set = (v) => (obj[key] = v);
    el._shared = !!opts.shared;
    // 모바일은 캔버스가 작게 보이므로 직접 입력 대신 글 편집 창을 띄움
    if (!PF.ui.preview && !PF.isMobile()) {
      el.contentEditable = 'true';
      el.spellcheck = false;
    }
    if (isEmptyHTML(el)) el.classList.add('is-empty');
    return el;
  };

  function sync(el) {
    if (!el) return;
    let html = el.innerHTML;
    if (isEmptyHTML(el)) {
      html = '';
      if (el.innerHTML !== '' && !el.querySelector('br + br')) el.innerHTML = '';
    }
    el.classList.toggle('is-empty', html === '');
    el._set(html);
    if (el._shared && el._key === 'name') {
      const c = PF.project.chars, w = el._obj === c.A ? 'A' : el._obj === c.B ? 'B' : null;
      if (w) PF.$$(`.pf-avatar-text[data-init="${w}"]`, PF.frameEl).forEach((x) => (x.textContent = Array.from(el.textContent.trim())[0] || '?'));
    }
    if (el._shared) {
      PF.$$('.pf-ed', PF.frameEl).forEach((x) => {
        if (x !== el && x._obj === el._obj && x._key === el._key) {
          x.innerHTML = html;
          x.classList.toggle('is-empty', html === '');
        }
      });
    }
    PF.commitSoon();
  }
  PF.syncEd = sync;

  /* ---------- 도구막대 ---------- */
  const SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72, 88, 104];
  const bar = $('#rt-bar');

  function btn(label, title, fn, cls) {
    return h('button', { class: 'rt-btn ' + (cls || ''), title, type: 'button', onmousedown: (e) => e.preventDefault(), onclick: fn }, label);
  }
  function exec(cmd, val) {
    restore();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, val);
    after();
  }
  function after() {
    const sel = getSelection();
    if (current && sel.rangeCount && current.contains(sel.anchorNode)) saved = { range: sel.getRangeAt(0).cloneRange(), el: current };
    if (current) sync(current);
    refreshState();
  }
  function restore() {
    if (!saved || !document.contains(saved.el)) return;
    saved.el.focus({ preventScroll: true });
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(saved.range);
  }

  function setSize(px) {
    restore();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontSize', false, '7');
    const root = current;
    if (root) {
      root.querySelectorAll('font[size="7"]').forEach((f) => {
        const s = document.createElement('span');
        s.style.fontSize = px + 'px';
        s.innerHTML = f.innerHTML;
        f.replaceWith(s);
      });
      root.querySelectorAll('span[style]').forEach((s) => {
        if (/xxx-large|-webkit-xxx-large/.test(s.style.fontSize)) s.style.fontSize = px + 'px';
      });
      // 안쪽에 남은 옛 크기 지정 정리
      root.querySelectorAll('span[style] span[style]').forEach((s) => {
        const p = s.parentElement.closest('span[style]');
        if (p && p.style.fontSize === px + 'px' && s.style.fontSize && s.style.fontSize !== px + 'px' && p.textContent === s.textContent) s.style.fontSize = '';
      });
    }
    after();
  }

  let fontSel, sizeSel, colorInp, hlInp, swA, swH;
  PF.buildRichBar = function () {
    bar.innerHTML = '';
    fontSel = h('select', { class: 'rt-sel', title: '글꼴', onchange: () => { if (fontSel.value) exec('fontName', fontSel.value); fontSel.value = ''; } });
    sizeSel = h('select', { class: 'rt-sel sm', title: '글자 크기', onchange: () => { if (sizeSel.value) setSize(+sizeSel.value); sizeSel.value = ''; } });
    sizeSel.append(h('option', { value: '' }, '크기'), ...SIZES.map((s) => h('option', { value: s }, s + 'px')));
    colorInp = h('input', { type: 'color', class: 'rt-color', title: '글자색 직접 고르기', onchange: () => exec('foreColor', colorInp.value) });
    hlInp = h('input', { type: 'color', class: 'rt-color', title: '형광펜 색 직접 고르기', onchange: () => exec('hiliteColor', hlInp.value) });
    swA = h('div', { class: 'rt-sw-group', title: '글자색' });
    swH = h('div', { class: 'rt-sw-group', title: '형광펜' });
    bar.append(
      fontSel, sizeSel, h('span', { class: 'rt-sep' }),
      btn('B', '굵게 (Ctrl+B)', () => exec('bold'), 'b'),
      btn('I', '기울임 (Ctrl+I)', () => exec('italic'), 'i'),
      btn('U', '밑줄 (Ctrl+U)', () => exec('underline'), 'u'),
      btn('S', '취소선', () => exec('strikeThrough'), 's'),
      h('span', { class: 'rt-sep' }),
      h('span', { class: 'rt-lbl' }, '글자'), swA, colorInp,
      h('span', { class: 'rt-sep' }),
      h('span', { class: 'rt-lbl' }, '형광'), swH, hlInp, btn('⊘', '형광펜 지우기', () => exec('hiliteColor', 'transparent')),
      h('span', { class: 'rt-sep' }),
      btn('⇤', '왼쪽 정렬', () => exec('justifyLeft')),
      btn('↔', '가운데 정렬', () => exec('justifyCenter')),
      btn('⇥', '오른쪽 정렬', () => exec('justifyRight')),
      h('span', { class: 'rt-sep' }),
      btn('지우기', '꾸밈 모두 지우기', () => { exec('removeFormat'); exec('hiliteColor', 'transparent'); }, 'txt')
    );
    PF.refreshRichBar();
  };

  PF.refreshRichBar = function () {
    if (!fontSel) return;
    fontSel.innerHTML = '';
    fontSel.append(h('option', { value: '' }, '글꼴'), ...PF.fontList().map((f) => h('option', { value: f.family, style: `font-family:'${f.family}'` }, f.label)));
    const t = PF.project.settings.theme;
    const sw = (c, fn) => h('button', { class: 'rt-sw', type: 'button', style: { background: c }, title: c, onmousedown: (e) => e.preventDefault(), onclick: () => fn(c) });
    swA.replaceChildren(...[t.title, t.text, t.muted, t.accentA, t.accentB].map((c) => sw(c, (v) => exec('foreColor', v))));
    swH.replaceChildren(...[t.highlight, t.tagBg, t.accentA + '33', t.accentB + '55'].map((c) => sw(c, (v) => exec('hiliteColor', v))));
  };

  function refreshState() {
    PF.$$('.rt-btn.b,.rt-btn.i,.rt-btn.u,.rt-btn.s', bar).forEach((b) => {
      const cmd = { b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough' }[b.classList[1]];
      let on = false;
      try { on = document.queryCommandState(cmd); } catch (e) {}
      b.classList.toggle('on', on);
    });
  }

  PF.placeRichBar = function () {
    if (tsTarget) return; // 모바일 글 편집 창 안에 고정
    if (!current || !document.contains(current) || PF.ui.preview) return bar.classList.add('hidden');
    bar.classList.remove('hidden');
    const r = current.getBoundingClientRect();
    const bw = bar.offsetWidth, bh = bar.offsetHeight;
    let top = r.top - bh - 10;
    if (top < 64) top = r.bottom + 10;
    if (top + bh > innerHeight - 8) top = Math.max(64, innerHeight - bh - 8);
    const left = PF.clamp(r.left + r.width / 2 - bw / 2, 8, innerWidth - bw - 8);
    bar.style.top = top + 'px';
    bar.style.left = left + 'px';
  };

  /* ---------- 이벤트 ---------- */
  /* ---------- 모바일 글 편집 창 ---------- */
  let tsTarget = null;
  const sheet = $('#text-sheet'), tsEd = $('#ts-editor'), tsBar = $('#ts-bar');
  PF.openTextSheet = function (target) {
    if (tsTarget) PF.closeTextSheet();
    tsTarget = target;
    tsEd.innerHTML = target.innerHTML;
    tsEd._obj = target._obj;
    tsEd._key = target._key;
    tsEd._set = target._set;
    tsEd._shared = true; // 캔버스의 같은 칸들에 바로 반영
    tsEd.dataset.ph = target.dataset.ph || '';
    tsEd.classList.toggle('is-empty', isEmptyHTML(tsEd));
    const cs = getComputedStyle(target);
    const blk = target.closest('.pf-block');
    const bcs = blk ? getComputedStyle(blk) : null;
    const bgc = bcs && bcs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bcs.backgroundColor : PF.project.settings.theme.card;
    Object.assign(tsEd.style, {
      fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, color: cs.color, textAlign: cs.textAlign,
      letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, background: bgc,
      fontSize: PF.clamp(parseFloat(cs.fontSize) || 16, 15, 26) + 'px',
    });
    const bname = blk ? PF.BLOCKS[(PF.findBlock(blk.dataset.id) || {}).block?.type]?.name : '';
    $('#ts-title').textContent = (bname ? bname + ' · ' : '') + (target.dataset.ph || '글 편집');
    target.classList.add('ed-active');
    tsBar.append(bar);
    bar.classList.remove('hidden');
    sheet.classList.remove('hidden');
    PF.closeSheets && PF.closeSheets();
    current = tsEd;
    fitSheet();
    tsEd.focus({ preventScroll: true });
    const r = document.createRange();
    r.selectNodeContents(tsEd);
    r.collapse(false);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    saved = { range: r.cloneRange(), el: tsEd };
    setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
  };
  PF.closeTextSheet = function () {
    if (!tsTarget) return;
    const t = tsTarget;
    tsTarget = null;
    t.classList.remove('ed-active');
    sheet.classList.add('hidden');
    document.body.append(bar);
    bar.classList.add('hidden');
    current = null;
    saved = null;
    tsEd.blur();
    if (document.contains(t)) t.dispatchEvent(new Event('blur')); // 빈 키워드 정리 등
    PF.commit();
  };
  // 화면 키보드가 올라오면 편집 창을 그 위로
  function fitSheet() {
    const vv = window.visualViewport;
    if (!vv) return;
    sheet.style.bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px';
    sheet.style.maxHeight = Math.max(220, vv.height - 70) + 'px';
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', fitSheet); visualViewport.addEventListener('scroll', fitSheet); }

  PF.initRichText = function (frame0) {
    // 캔버스에서: 모바일이면 글자를 눌렀을 때 편집 창 열기
    frame0.addEventListener('click', (e) => {
      if (!PF.isMobile() || PF.ui.preview) return;
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (el && frame0.contains(el)) PF.openTextSheet(el);
    });
    for (const frame of [frame0, sheet]) initOn(frame, frame0);
    document.addEventListener('selectionchange', () => {
      const s = getSelection();
      if (!s.rangeCount) return;
      const n = s.anchorNode;
      const el = n && (n.nodeType === 1 ? n : n.parentElement)?.closest('.pf-ed');
      if (el && (frame0.contains(el) || el === tsEd)) {
        saved = { range: s.getRangeAt(0).cloneRange(), el };
        refreshState();
      }
    });
    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') e.preventDefault();
    });
    document.addEventListener('mousedown', (e) => {
      if (tsTarget) return;
      if (!bar.contains(e.target) && !(e.target.closest && e.target.closest('.pf-ed'))) {
        current = null;
        bar.classList.add('hidden');
      }
    });
    addEventListener('resize', PF.placeRichBar);
    PF.$('#stage').addEventListener('scroll', PF.placeRichBar, { passive: true });
  };

  function initOn(frame) {
    frame.addEventListener('input', (e) => {
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (el) sync(el);
    });
    frame.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (!el) return;
      current = el;
      PF.placeRichBar();
      refreshState();
    });
    frame.addEventListener('focusout', (e) => {
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (!el || el === tsEd) return;
      setTimeout(() => {
        if (document.activeElement === el) return;
        if (bar.contains(document.activeElement)) return;
        if (current === el) { current = null; bar.classList.add('hidden'); }
        PF.commit();
      }, 0);
    });
    frame.addEventListener('keydown', (e) => {
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (!el) return;
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
        sync(el);
      } else if (e.key === 'Escape') {
        el.blur();
      }
    });
    frame.addEventListener('paste', (e) => {
      const el = e.target.closest && e.target.closest('.pf-ed');
      if (!el) return;
      e.preventDefault();
      const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, txt);
    });
  }
})();
