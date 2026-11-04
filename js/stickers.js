/* 스티커: 이동 · 크기 · 회전 */
(function () {
  const { h, $ } = PF;

  PF.renderStickers = function (behind) {
    const layer = h('div', { class: 'pf-stickers ' + (behind ? 'behind' : 'front') + (PF.ui.stickerLock ? ' locked' : '') });
    (PF.project.stickers || []).forEach((s) => {
      if (!!s.behind !== behind) return;
      const src = PF.assets[s.src];
      if (!src) return;
      const el = h('div', { class: 'pf-sticker' + (PF.ui.selSticker === s.id ? ' selected' : ''), 'data-id': s.id });
      Object.assign(el.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', opacity: s.opacity ?? 1, transform: `translate(-50%,-50%) rotate(${s.rot || 0}deg)` });
      const img = h('img', { src, draggable: 'false', alt: '' });
      if (s.flip) img.style.transform = 'scaleX(-1)';
      el.append(img);
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
      op = { s, el, kind, p0: p, x0: s.x, y0: s.y, w0: s.w, rot0: s.rot || 0, d0: Math.hypot(p.x - s.x, p.y - s.y) || 1, a0: Math.atan2(p.y - s.y, p.x - s.x) };
      el.setPointerCapture(e.pointerId);
    }, true);

    frame.addEventListener('pointermove', (e) => {
      if (!op) return;
      const p = pt(e), s = op.s;
      if (op.kind === 'move') {
        s.x = Math.round(op.x0 + p.x - op.p0.x);
        s.y = Math.round(op.y0 + p.y - op.p0.y);
      } else if (op.kind === 'scale') {
        s.w = Math.round(PF.clamp((op.w0 * Math.hypot(p.x - s.x, p.y - s.y)) / op.d0, 16, 3000));
      } else {
        let r = op.rot0 + ((Math.atan2(p.y - s.y, p.x - s.x) - op.a0) * 180) / Math.PI;
        r = ((r % 360) + 540) % 360 - 180;
        if (e.shiftKey) r = Math.round(r / 15) * 15;
        s.rot = Math.round(r);
      }
      Object.assign(op.el.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', transform: `translate(-50%,-50%) rotate(${s.rot}deg)` });
    });
    const end = () => {
      if (!op) return;
      op = null;
      PF.commit();
      PF.renderInspector();
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);

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
