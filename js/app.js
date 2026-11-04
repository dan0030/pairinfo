/* 시작 · 상단 버튼 · 불러오기/내보내기 */
(function () {
  const { h, $, $$ } = PF;
  const FORMAT = 'pairframe';

  PF.afterLoad = function () {
    const p = PF.project;
    p.stickers ||= [];
    p.stickerLib ||= [];
    p.chars ||= { A: { name: '캐릭터 A', img: null }, B: { name: '캐릭터 B', img: null } };
    p.settings.fonts.custom ||= [];
    if (PF.ui.selected && !PF.findBlock(PF.ui.selected)) PF.ui.selected = null;
    if (PF.ui.selSticker && !p.stickers.some((s) => s.id === PF.ui.selSticker)) PF.ui.selSticker = null;
    PF.applyCustomFonts();
    PF.render();
    PF.renderDesign();
    PF.renderStickerLib();
    PF.refreshRichBar();
    PF.saveSoon();
  };

  function loadTemplate(key, keep) {
    const old = PF.project;
    const p = PF.TEMPLATES[key].make();
    if (keep && old) {
      const w = p.settings.width;
      p.settings = JSON.parse(JSON.stringify(old.settings));
      p.settings.width = w;
      p.chars = JSON.parse(JSON.stringify(old.chars));
      p.stickerLib = (old.stickerLib || []).slice();
    }
    PF.project = p;
    PF.ui.selected = PF.ui.selSticker = null;
    PF.ui.zoom = 'fit';
    PF.afterLoad();
    PF.commit();
  }

  /* ---------- 모달 ---------- */
  function modal(content) {
    const m = $('#modal'), c = $('#modal-card');
    c.replaceChildren(...[].concat(content));
    m.classList.remove('hidden');
  }
  const closeModal = () => $('#modal').classList.add('hidden');
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal' && PF.project) closeModal(); });

  function templateModal(first) {
    const keep = h('input', { type: 'checkbox' });
    const card = (key) => {
      const t = PF.TEMPLATES[key];
      return h('button', { class: 'tpl-card', onclick: () => { if (!first && !confirm('지금 작업 중인 페어틀이 바뀌어요. 계속할까요?\n(필요하면 먼저 “저장 파일”로 백업하세요)')) return; loadTemplate(key, keep.checked); closeModal(); } },
        h('div', { class: 'tpl-thumb tpl-' + key }, ...(key === 'simple' ? ['t', 'r', 's', 'k'] : ['t', 'c', 'c', 'r', 'i', 'l', 'm', 'q']).map((x) => h('i', { class: 'x-' + x }))),
        h('b', {}, t.name), h('span', {}, t.desc));
    };
    modal([
      h('h2', {}, first ? '어떤 페어틀을 만들까요?' : '새로 만들기'),
      h('p', { class: 'muted' }, '템플릿은 출발점일 뿐이에요. 블록을 자유롭게 더하고, 빼고, 옮길 수 있어요.'),
      h('div', { class: 'tpl-grid' }, card('simple'), card('detail')),
      first ? null : h('label', { class: 'check' }, keep, ' 지금의 색 · 글꼴 · 캐릭터(이름·두상) · 스티커 보관함 유지하기'),
      first ? null : h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: closeModal }, '취소')),
    ]);
  }

  /* ---------- PNG 내보내기 ---------- */
  function exportModal() {
    let scale = 2;
    const opts = h('div', { class: 'seg' }, ...[1, 2, 3].map((s) => {
      const b = h('button', { class: 'seg-btn' + (s === scale ? ' on' : ''), onclick: () => { scale = s; $$('.seg-btn', opts).forEach((x) => x.classList.toggle('on', x === b)); } }, s + '배');
      return b;
    }));
    const W = PF.project.settings.width;
    modal([
      h('h2', {}, 'PNG로 내보내기'),
      h('p', { class: 'muted' }, `가로 ${W}px 페어틀을 몇 배 해상도로 저장할까요? (2배 = ${W * 2}px 권장)`),
      opts,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: closeModal }, '취소'), h('button', { class: 'btn primary', onclick: () => { closeModal(); exportPng(scale); } }, '저장하기')),
    ]);
  }

  async function exportPng(scale) {
    const f = PF.frameEl;
    const prev = { preview: PF.ui.preview, sel: PF.ui.selected, st: PF.ui.selSticker };
    PF.ui.preview = true;
    PF.ui.selected = PF.ui.selSticker = null;
    PF.render(true);
    f.classList.add('exporting');
    PF.toast('이미지를 만드는 중… 글꼴을 포함하느라 몇 초 걸릴 수 있어요', 8000);
    const opts = { pixelRatio: scale, backgroundColor: PF.project.settings.theme.bg, cacheBust: false, filter: (n) => !(n.classList && n.classList.contains('pf-chrome')) };
    let url = null;
    try {
      await document.fonts.ready;
      url = await htmlToImage.toPng(f, opts);
    } catch (e) {
      console.warn('글꼴 포함 실패, 글꼴 없이 다시 시도', e);
      try {
        url = await htmlToImage.toPng(f, Object.assign({ skipFonts: true }, opts));
        PF.toast('웹 글꼴을 포함하지 못해 기본 글꼴로 저장했을 수 있어요', 4000);
      } catch (e2) {
        console.error(e2);
        PF.toast('이미지 저장에 실패했어요. 이미지 수를 줄이거나 배율을 낮춰 보세요.', 5000);
      }
    }
    f.classList.remove('exporting');
    PF.ui.preview = prev.preview;
    PF.ui.selected = prev.sel;
    PF.ui.selSticker = prev.st;
    PF.render();
    if (url) {
      const blobUrl = URL.createObjectURL(await (await fetch(url)).blob());
      download(blobUrl, fileName('png'));
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      PF.toast('PNG를 저장했어요');
    }
  }

  function fileName(ext) {
    const t = (PF.project.rows.flatMap((r) => r.cols.flatMap((c) => c.blocks)).find((b) => b.type === 'title')?.data.title || 'pairframe').replace(/<[^>]+>/g, '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
    return (t || 'pairframe') + '.' + ext;
  }
  function download(url, name) {
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
  }

  /* ---------- 저장 파일 ---------- */
  function exportJson() {
    const data = { format: FORMAT, version: 1, project: PF.project, assets: PF.usedAssets(true) };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    download(url, fileName('pairframe.json'));
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    PF.toast('저장 파일을 내려받았어요. “불러오기”로 언제든 다시 열 수 있어요');
  }
  async function importJson() {
    const [file] = await PF.pickFile('.json,application/json');
    if (!file) return;
    try {
      const data = JSON.parse(await PF.readFile(file, 'text'));
      if (data.format !== FORMAT || !data.project || !Array.isArray(data.project.rows)) throw new Error('형식 아님');
      if (!confirm('불러온 페어틀로 바꿀까요? 지금 작업은 사라져요.')) return;
      for (const k in data.assets || {}) if (/^data:(image|font|application|binary)\//.test(data.assets[k])) PF.assets[k] = data.assets[k];
      PF.project = PF.deepSanitize(data.project);
      PF.ui.selected = PF.ui.selSticker = null;
      PF.afterLoad();
      PF.commit();
      PF.toast('불러왔어요');
    } catch (e) {
      console.error(e);
      PF.toast('페어틀 저장 파일(.json)이 아니에요');
    }
  }

  /* ---------- 왼쪽 블록 목록 ---------- */
  function renderPalette() {
    const box = $('#block-palette');
    PF.PALETTE.forEach(([group, types]) => {
      box.append(h('h5', {}, group));
      const g = h('div', { class: 'pal-grid' });
      types.forEach((t) => {
        const d = PF.BLOCKS[t];
        g.append(h('button', { class: 'pal-item', title: d.desc, onclick: () => { PF.addBlock(t); closeDrawers(); } }, h('span', { class: 'pal-ico' }, d.icon), h('b', {}, d.name), h('small', {}, d.desc)));
      });
      box.append(g);
    });
  }

  /* ---------- 상단 ---------- */
  const closeDrawers = () => { $('#panel-left').classList.remove('open'); $('#panel-right').classList.remove('open'); };
  const actions = {
    new: () => templateModal(false),
    undo: PF.undo,
    redo: PF.redo,
    'zoom-in': () => { PF.ui.zoom = Math.min(3, Math.round((PF.zoomScale + 0.1) * 10) / 10); PF.applyZoom(); },
    'zoom-out': () => { PF.ui.zoom = Math.max(0.1, Math.round((PF.zoomScale - 0.1) * 10) / 10); PF.applyZoom(); },
    'zoom-fit': () => { PF.ui.zoom = 'fit'; PF.applyZoom(); },
    import: importJson,
    'export-json': exportJson,
    'export-png': exportModal,
    'toggle-left': () => { $('#panel-right').classList.remove('open'); $('#panel-left').classList.toggle('open'); },
    'toggle-right': () => { $('#panel-left').classList.remove('open'); $('#panel-right').classList.toggle('open'); },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && actions[b.dataset.act]) actions[b.dataset.act]();
  });
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
    $$('.tab-body').forEach((b) => b.classList.toggle('hidden', b.dataset.body !== t.dataset.tab));
  }));
  $('#preview-toggle').addEventListener('change', (e) => {
    PF.ui.preview = e.target.checked;
    PF.ui.selected = PF.ui.selSticker = null;
    document.body.classList.toggle('previewing', PF.ui.preview);
    PF.render();
  });
  document.addEventListener('keydown', (e) => {
    const inEd = document.activeElement && (document.activeElement.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !inEd && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? PF.redo() : PF.undo(); }
    else if (mod && !inEd && e.key.toLowerCase() === 'y') { e.preventDefault(); PF.redo(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); PF.saveNow(); PF.toast('이 브라우저에 저장했어요'); }
    else if (e.key === 'Escape' && !inEd) { closeModal(); PF.select(null); }
  });
  addEventListener('beforeunload', () => PF.saveNow());

  /* ---------- 시작 ---------- */
  async function start() {
    PF.initCanvas();
    PF.initRichText(PF.frameEl);
    PF.initStickers();
    renderPalette();
    const saved = await PF.dbGet('project');
    const assets = await PF.dbGet('assets');
    if (assets) Object.assign(PF.assets, assets);
    let first = false;
    try {
      PF.project = saved ? JSON.parse(saved) : null;
    } catch (e) {
      PF.project = null;
    }
    if (!PF.project) {
      PF.project = PF.TEMPLATES.detail.make();
      first = true;
    }
    PF.buildRichBar();
    PF.afterLoad();
    PF.resetHistory();
    if (first) templateModal(true);
  }
  start();
})();
