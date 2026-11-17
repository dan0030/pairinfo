/* 스티커: 이동 · 크기 · 회전 */
(function () {
  const { h, $ } = PF;

  PF.renderStickers = function (behind) {
    const layer = h('div', { class: 'pf-stickers ' + (behind ? 'behind' : 'front') + (PF.ui.stickerLock ? ' locked' : '') });
    (PF.project.stickers || []).forEach((s) => {
      if (!!s.behind !== behind) return;
      const isText = s.type === 'text';
      const src = !isText && PF.assets[s.src];
      if (!isText && !src) return;
      const el = h('div', { class: 'pf-sticker' + (isText ? ' text' : '') + (PF.ui.selSticker === s.id ? ' selected' : ''), 'data-id': s.id });
      Object.assign(el.style, { left: s.x + 'px', top: s.y + 'px', opacity: s.opacity ?? 1, transform: `translate(-50%,-50%) rotate(${s.rot || 0}deg)` });
      if (isText) {
        const t = PF.ed(s, 'html', { cls: 'pf-tsticker', ph: '글자를 입력하세요' });
        t.contentEditable = 'false'; // 두 번 누르거나 “글자 고치기”로 편집
        Object.assign(t.style, PF.textStickerStyle(s));
        el.append(t);
      } else {
        el.style.width = s.w + 'px';
        const img = h('img', { src, draggable: 'false', alt: '' });
        if (s.flip) img.style.transform = 'scaleX(-1)';
        el.append(img);
      }
      if (!PF.ui.preview)
        el.append(
          h('div', { class: 'pf-chrome st-ui' },
            h('i', { class: 'st-h st-rot', title: '회전 (Shift: 15° 단위)' }),
            h('i', { class: 'st-h st-scale', title: '크기' }),
            h('i', { class: 'st-h st-del', title: '삭제' }, '✕')));
      layer.append(el);
    });
    return layer;
  };

  PF.addSticker = function (assetId) {
    const p = PF.project;
    const img = new Image();
    img.onload = () => {
      const w = Math.min(260, img.naturalWidth);
      const stage = $('#stage');
      // 지금 보이는 화면 가운데쯤에 붙이기
      const fr = PF.frameEl.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const cx = ((sr.left + sr.width / 2 - fr.left) / PF.zoomScale) | 0;
      const cy = ((sr.top + sr.height / 2 - fr.top) / PF.zoomScale) | 0;
      const s = { id: 's' + PF.uid(), src: assetId, x: PF.clamp(cx, 40, p.settings.width - 40), y: PF.clamp(cy, 40, PF.frameEl.offsetHeight - 40), w, rot: 0, flip: false, opacity: 1, behind: false };
      p.stickers.push(s);
      PF.ui.selSticker = s.id;
      PF.ui.selected = null;
      PF.commit();
      PF.render();
    };
    img.src = PF.assets[assetId];
  };

  /* ---------- 글자 스티커 ---------- */
  const fam = (f) => (/^(serif|sans-serif|monospace|cursive)$/.test(f) ? f : `'${f}'`);
  PF.textStickerStyle = function (s) {
    const st = {
      fontFamily: `${fam(s.font || 'Paperlogy')}, 'Pretendard', sans-serif`,
      fontSize: (s.size || 40) + 'px',
      fontWeight: String(s.weight || 700),
      color: s.color || '#16181D',
      lineHeight: String(s.lh ?? 1.25),
      letterSpacing: (s.ls ?? 0) + 'em',
      textAlign: s.align || 'center',
      whiteSpace: 'pre',
      background: 'transparent',
      padding: '0px',
      borderRadius: '0px',
      textShadow: s.shadow ? `0 ${Math.round((s.size || 40) * 0.06)}px ${Math.round((s.size || 40) * 0.18)}px ${PF.rgba(s.shadowColor || '#000000', 0.35)}` : 'none',
      webkitTextStroke: s.stroke ? `${s.stroke}px ${s.strokeColor || '#FFFFFF'}` : '0px transparent',
      paintOrder: 'stroke fill',
    };
    if (s.bgType === 'solid' || s.bgType === 'grad') {
      st.background = s.bgType === 'grad' && s.bgGrad ? PF.cssGrad(s.bgGrad) : s.bgColor || '#FFFFFF';
      st.padding = `${Math.round((s.pad ?? 12) * 0.6)}px ${s.pad ?? 12}px`;
      st.borderRadius = (s.radius ?? 12) + 'px';
    }
    return st;
  };
  PF.TEXT_PRESETS = (t, f) => [
    { name: '기본 글자', html: '글자 스티커', size: 48, weight: 800, color: t.title, font: f.title },
    { name: '라벨', html: 'LABEL', size: 26, weight: 700, color: '#FFFFFF', font: f.body, bgType: 'solid', bgColor: t.accentA, pad: 16, radius: 999, ls: 0.08 },
    { name: '외곽선', html: '반짝!', size: 64, weight: 900, color: t.accentB, font: f.title, stroke: 8, strokeColor: '#FFFFFF' },
    { name: '메모', html: '메모를 적어요', size: 24, weight: 600, color: t.text, font: f.body, bgType: 'solid', bgColor: t.tagBg, pad: 16, radius: 14 },
    { name: '그림자', html: 'TITLE', size: 64, weight: 900, color: t.accentA, font: f.title, shadow: true, ls: 0.04 },
    { name: '형광펜', html: '형광펜 강조', size: 30, weight: 800, color: t.title, font: f.body, bgType: 'solid', bgColor: t.highlight, pad: 10, radius: 4 },
  ];
  PF.addTextSticker = function (preset) {
    const p = PF.project;
    const stage = $('#stage');
    const fr = PF.frameEl.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const cx = ((sr.left + sr.width / 2 - fr.left) / PF.zoomScale) | 0;
    const cy = ((sr.top + sr.height / 2 - fr.top) / PF.zoomScale) | 0;
    const s = Object.assign({ id: 's' + PF.uid(), type: 'text', x: PF.clamp(cx, 60, p.settings.width - 60), y: PF.clamp(cy, 60, PF.frameEl.offsetHeight - 60), rot: 0, opacity: 1, behind: false,
      html: '글자', size: 40, weight: 700, color: '#16181D', font: 'Paperlogy', align: 'center', lh: 1.25, ls: 0, stroke: 0, strokeColor: '#FFFFFF', shadow: false, shadowColor: '#000000',
      bgType: 'none', bgColor: '#FFFFFF', pad: 12, radius: 12 }, JSON.parse(JSON.stringify(preset)));
    delete s.name;
    p.stickers.push(s);
    PF.ui.selSticker = s.id;
    PF.ui.selected = null;
    PF.commit();
    PF.render();
  };
  /* 글자 스티커 글 고치기: PC는 그 자리에서, 휴대폰은 글 편집 창 */
  PF.editTextSticker = function (id) {
    const t = PF.frameEl.querySelector(`.pf-sticker[data-id="${id}"] .pf-tsticker`);
    if (!t) return;
    if (PF.isMobile()) return PF.openTextSheet(t);
    t.contentEditable = 'true';
    t.spellcheck = false;
    t.focus();
    const r = document.createRange();
    r.selectNodeContents(t);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    t.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== t && !PF.$('#rt-bar').contains(document.activeElement)) t.contentEditable = 'false'; }, 0); });
  };

  PF.selectSticker = function (id) {
    PF.ui.selSticker = id;
    PF.ui.selected = null;
    PF.$$('.pf-block.selected,.pf-sticker.selected', PF.frameEl).forEach((x) => x.classList.remove('selected'));
    const el = id && PF.frameEl.querySelector(`.pf-sticker[data-id="${id}"]`);
    if (el) el.classList.add('selected');
    PF.renderInspector();
  };

  PF.initStickers = function () {
    const frame = PF.frameEl;
    let op = null;
    const getS = (id) => PF.project.stickers.find((s) => s.id === id);
    const pt = (e) => {
      const r = frame.getBoundingClientRect();
      return { x: (e.clientX - r.left) / PF.zoomScale, y: (e.clientY - r.top) / PF.zoomScale };
    };

    frame.addEventListener('pointerdown', (e) => {
      if (PF.ui.preview) return;
      const el = e.target.closest('.pf-sticker');
      if (!el) return;
      if (e.target.closest('.pf-ed[contenteditable="true"]')) return; // 글자 고치는 중: 커서 놓기 · 드래그 선택 허용
      e.preventDefault();
      e.stopPropagation();
      const s = getS(el.dataset.id);
      if (!s) return;
      if (e.target.classList.contains('st-del')) {
        PF.project.stickers = PF.project.stickers.filter((x) => x !== s);
        PF.ui.selSticker = null;
        PF.commit();
        PF.render();
        return;
      }
      if (PF.ui.selSticker !== s.id) PF.selectSticker(s.id);
      const p = pt(e);
      const kind = e.target.classList.contains('st-rot') ? 'rot' : e.target.classList.contains('st-scale') ? 'scale' : 'move';
      op = { s, el, kind, p0: p, x0: s.x, y0: s.y, w0: s.w, size0: s.size, rot0: s.rot || 0, d0: Math.hypot(p.x - s.x, p.y - s.y) || 1, a0: Math.atan2(p.y - s.y, p.x - s.x) };
      el.setPointerCapture(e.pointerId);
    }, true);

    frame.addEventListener('pointermove', (e) => {
      if (!op) return;
      const p = pt(e), s = op.s;
      if (op.kind === 'move') {
        s.x = Math.round(op.x0 + p.x - op.p0.x);
        s.y = Math.round(op.y0 + p.y - op.p0.y);
      } else if (op.kind === 'scale') {
        const k = Math.hypot(p.x - s.x, p.y - s.y) / op.d0;
        if (s.type === 'text') {
          s.size = Math.round(PF.clamp(op.size0 * k, 6, 800));
          Object.assign(op.el.querySelector('.pf-tsticker').style, PF.textStickerStyle(s));
        } else s.w = Math.round(PF.clamp(op.w0 * k, 16, 3000));
      } else {
        let r = op.rot0 + ((Math.atan2(p.y - s.y, p.x - s.x) - op.a0) * 180) / Math.PI;
        r = ((r % 360) + 540) % 360 - 180;
        if (e.shiftKey) r = Math.round(r / 15) * 15;
        s.rot = Math.round(r);
      }
      Object.assign(op.el.style, { left: s.x + 'px', top: s.y + 'px', transform: `translate(-50%,-50%) rotate(${s.rot}deg)` });
      if (s.type !== 'text') op.el.style.width = s.w + 'px';
    });
    const end = () => {
      if (!op) return;
      op = null;
      PF.commit();
      PF.renderInspector();
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    // 글자 스티커를 두 번 누르면 글 고치기
    frame.addEventListener('dblclick', (e) => {
      const el = !PF.ui.preview && e.target.closest('.pf-sticker.text');
      if (el) PF.editTextSticker(el.dataset.id);
    });

    // 키보드: 선택한 스티커 미세 이동 / 삭제
    document.addEventListener('keydown', (e) => {
      const s = PF.ui.selSticker && getS(PF.ui.selSticker);
      if (!s || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
      const step = e.shiftKey ? 10 : 1;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (mv) { e.preventDefault(); s.x += mv[0]; s.y += mv[1]; PF.render(); PF.commitSoon(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        PF.project.stickers = PF.project.stickers.filter((x) => x !== s);
        PF.ui.selSticker = null;
        PF.commit();
        PF.render();
      }
    });

    // 스티커 보관함
    $('#sticker-upload').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        const id = await PF.addImageFile(f, 1200);
        if (!PF.project.stickerLib.includes(id)) PF.project.stickerLib.push(id);
      }
      e.target.value = '';
      PF.commit();
      PF.renderStickerLib();
    });
    $('#sticker-lock').addEventListener('change', (e) => {
      PF.ui.stickerLock = e.target.checked;
      PF.render();
    });
  };

  PF.renderStickerLib = function () {
    const tp = $('#text-presets');
    if (tp) {
      const t = PF.project.settings.theme, f = PF.project.settings.fonts;
      tp.replaceChildren(...PF.TEXT_PRESETS(t, f).map((pr) => {
        const prev = h('span', { class: 'tp-sample' }, pr.name);
        Object.assign(prev.style, PF.textStickerStyle(Object.assign({}, pr, { size: 15 })));
        if (pr.stroke) prev.style.webkitTextStroke = '1.5px ' + pr.strokeColor;
        if (pr.bgType) prev.style.padding = '3px 9px';
        return h('button', { class: 'tp-item', title: pr.name + ' 붙이기', onclick: () => { PF.addTextSticker(pr); PF.closeSheets && PF.closeSheets(); } }, prev);
      }));
    }
    const box = $('#sticker-lib');
    box.replaceChildren();
    const lib = PF.project.stickerLib || [];
    if (!lib.length) box.append(h('p', { class: 'hint center' }, '아직 올린 스티커가 없어요.'));
    lib.forEach((id) => {
      if (!PF.assets[id]) return;
      box.append(
        h('div', { class: 'lib-item' },
          h('button', { class: 'lib-thumb', title: '페어틀에 붙이기', onclick: () => PF.addSticker(id) }, h('img', { src: PF.assets[id], alt: '' })),
          h('button', { class: 'lib-del', title: '보관함에서 빼기', onclick: () => { PF.project.stickerLib = lib.filter((x) => x !== id); PF.commit(); PF.renderStickerLib(); } }, '✕')));
    });
  };
})();
