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
    PF.normalizeSettings(p.settings);
    if (PF.ui.selected && !PF.findBlock(PF.ui.selected)) PF.ui.selected = null;
    if (PF.ui.selSticker && !p.stickers.some((s) => s.id === PF.ui.selSticker)) PF.ui.selSticker = null;
    PF.applyCustomFonts();
    PF.render();
    PF.renderDesign();
    PF.renderStickerLib();
    PF.refreshRichBar();
    PF.saveSoon();
  };

  async function loadTemplate(key, keep) {
    const old = PF.project;
    const p = PF.TEMPLATES[key].make();
    if (keep && old) {
      const w = p.settings.width;
      p.settings = JSON.parse(JSON.stringify(old.settings));
      p.settings.width = w;
      p.chars = JSON.parse(JSON.stringify(old.chars));
      p.stickerLib = (old.stickerLib || []).slice();
    }
    if (PF.meta) await PF.makeThumb();
    await PF.newProject(p);
    PF.toast('새 페어틀을 만들었어요. 이전 작업은 “내 페어틀”에 저장돼 있어요');
  }

  /* ---------- 모달 ---------- */
  function modal(content, cls) {
    const m = $('#modal'), c = $('#modal-card');
    c.className = 'modal-card ' + (cls || '');
    c.replaceChildren(...[].concat(content));
    m.classList.remove('hidden');
  }
  const closeModal = () => $('#modal').classList.add('hidden');
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal' && PF.meta) closeModal(); });

  function templateModal(first) {
    const keep = h('input', { type: 'checkbox' });
    const card = (key) => {
      const t = PF.TEMPLATES[key];
      return h('button', { class: 'tpl-card', onclick: async () => { closeModal(); await loadTemplate(key, keep.checked); } },
        h('div', { class: 'tpl-thumb tpl-' + key }, ...(key === 'simple' ? ['t', 'r', 's'] : ['t', 'c', 'c', 'r', 'i', 'l', 'm', 'q']).map((x) => h('i', { class: 'x-' + x }))),
        h('b', {}, t.name), h('span', {}, t.desc));
    };
    modal([
      h('h2', {}, first ? '어떤 페어틀을 만들까요?' : '새 페어틀 만들기'),
      h('p', { class: 'muted' }, '템플릿은 출발점일 뿐이에요. 블록을 자유롭게 더하고, 빼고, 옮길 수 있어요.' + (first ? '' : ' 지금 작업은 “내 페어틀”에 그대로 남아요.')),
      h('div', { class: 'tpl-grid' }, card('simple'), card('detail')),
      first ? null : h('label', { class: 'check' }, keep, ' 지금의 색 · 글꼴 · 캐릭터(이름·두상) · 스티커 보관함 가져오기'),
      first ? null : h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: closeModal }, '취소')),
    ]);
  }

  /* ---------- 내 페어틀 (여러 개 저장) ---------- */
  const fmtTime = (t) => {
    const d = new Date(t), now = new Date();
    const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.toDateString() === now.toDateString() ? '오늘 ' + hm : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${hm}`;
  };
  async function libraryModal() {
    modal([h('h2', {}, '내 페어틀'), h('p', { class: 'muted' }, '불러오는 중…')], 'wide');
    await PF.makeThumb();
    const list = await PF.listProjects();
    const grid = h('div', { class: 'lib-grid' });
    grid.append(h('button', { class: 'proj-card new', onclick: () => templateModal(false) }, h('div', { class: 'proj-thumb' }, h('b', {}, '+')), h('b', {}, '새 페어틀')));
    list.forEach((r) => {
      const cur = PF.meta && r.id === PF.meta.id;
      const open = async () => { if (!cur) { await PF.openProject(r.id); PF.toast('“' + r.name + '” 을(를) 열었어요'); } closeModal(); };
      grid.append(h('div', { class: 'proj-card' + (cur ? ' cur' : '') },
        h('button', { class: 'proj-thumb', title: '열기', onclick: open }, r.thumb ? h('img', { src: r.thumb, alt: '' }) : h('span', { class: 'muted' }, '미리보기 없음')),
        h('div', { class: 'proj-info' },
          h('b', { class: 'proj-name', title: r.name }, r.name || '이름 없는 페어틀'),
          h('span', { class: 'muted sm' }, (cur ? '편집 중 · ' : '') + fmtTime(r.updated))),
        h('div', { class: 'proj-acts' },
          h('button', { class: 'mini', onclick: open }, cur ? '계속 편집' : '열기'),
          h('button', { class: 'mini', onclick: async () => {
            const n = prompt('페어틀 이름 (비워두면 페어명을 따라가요)', r.nameAuto ? '' : r.name);
            if (n === null) return;
            const nm = n.trim();
            if (cur) { PF.meta.nameAuto = !nm; PF.meta.name = nm; await PF.saveNow(); }
            else { r.nameAuto = !nm; r.name = nm || '이름 없는 페어틀'; await PF.idb.put('projects', r.id, r); }
            libraryModal();
          } }, '이름'),
          h('button', { class: 'mini', onclick: async () => {
            if (cur) await PF.saveNow();
            const src = cur ? Object.assign({}, PF.meta, { data: JSON.stringify(PF.project) }) : r;
            const id = 'p' + PF.uid();
            await PF.idb.put('projects', id, Object.assign({}, src, { id, name: (cur ? PF.projectName() : r.name) + ' 복사본', nameAuto: false, created: Date.now(), updated: Date.now() }));
            libraryModal();
          } }, '복제'),
          h('button', { class: 'mini danger', onclick: async () => {
            if (!confirm('“' + r.name + '” 을(를) 지울까요? 되돌릴 수 없어요.')) return;
            await PF.idb.del('projects', r.id);
            if (cur) {
              PF.meta = null;
              const rest = await PF.listProjects();
              if (rest.length) await PF.openProject(rest[0].id);
              else { closeModal(); templateModal(true); return; }
            }
            await PF.cleanupAssets();
            libraryModal();
          } }, '삭제'))));
    });
    modal([
      h('h2', {}, '내 페어틀'),
      h('p', { class: 'muted' }, `이 브라우저에 자동 저장된 페어틀 ${list.length}개. 다른 기기·브라우저로 옮기거나 백업하려면 “저장 파일”을 쓰세요.`),
      grid,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: closeModal }, '닫기')),
    ], 'wide');
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
      for (const k in data.assets || {}) if (/^data:(image|font|application|binary)\//.test(data.assets[k])) { PF.assets[k] = data.assets[k]; await PF.idb.put('assets', k, data.assets[k]); }
      if (PF.meta) await PF.makeThumb();
      await PF.newProject(PF.deepSanitize(data.project));
      PF.toast('불러온 페어틀을 “내 페어틀”에 추가했어요');
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
        g.append(h('button', { class: 'pal-item', title: d.desc, onclick: () => { PF.addBlock(t); PF.closeSheets(); if (PF.isMobile()) PF.toast('“' + d.name + '” 블록을 추가했어요'); } }, h('span', { class: 'pal-ico' }, d.icon), h('b', {}, d.name), h('small', {}, d.desc)));
      });
      box.append(g);
    });
  }

  /* ---------- 모바일 시트 ---------- */
  const SHEET_TITLE = { blocks: '블록 추가', design: '디자인', stickers: '스티커' };
  function setTab(name) {
    $$('.tab').forEach((x) => x.classList.toggle('on', x.dataset.tab === name));
    $$('.tab-body').forEach((b) => b.classList.toggle('hidden', b.dataset.body !== name));
  }
  PF.openSheet = function (name) {
    const left = $('#panel-left'), right = $('#panel-right');
    const isOpen = (name === 'props' ? right : left).classList.contains('open') && PF.ui.sheet === name;
    PF.closeSheets();
    if (isOpen) return; // 같은 탭을 다시 누르면 닫기
    if (name === 'props') right.classList.add('open');
    else { setTab(name); $('#sheet-title-left').textContent = SHEET_TITLE[name]; left.classList.add('open'); left.scrollTop = 0; }
    PF.ui.sheet = name;
    $('#sheet-backdrop').classList.remove('hidden');
    $$('#mtabs [data-sheet]').forEach((b) => b.classList.toggle('on', b.dataset.sheet === name));
  };
  PF.closeSheets = function () {
    $('#panel-left').classList.remove('open');
    $('#panel-right').classList.remove('open');
    $('#sheet-backdrop').classList.add('hidden');
    $$('#mtabs [data-sheet]').forEach((b) => b.classList.remove('on'));
    PF.ui.sheet = null;
  };
  $$('#mtabs [data-sheet]').forEach((b) => b.addEventListener('click', () => PF.openSheet(b.dataset.sheet)));
  function setPreview(on) {
    PF.ui.preview = on;
    $('#preview-toggle').checked = on;
    $('#m-preview').classList.toggle('on', on);
    PF.ui.selected = PF.ui.selSticker = null;
    document.body.classList.toggle('previewing', on);
    PF.closeSheets();
    PF.render();
  }

  /* ---------- 상단 ---------- */
  const fileMenu = $('#file-menu');
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.menu-wrap')) fileMenu.classList.add('hidden'); });
  const actions = {
    'menu-file': () => fileMenu.classList.toggle('hidden'),
    'close-sheets': () => PF.closeSheets(),
    'toggle-preview': () => setPreview(!PF.ui.preview),
    'close-text': () => PF.closeTextSheet && PF.closeTextSheet(),
    new: () => templateModal(false),
    library: libraryModal,
    undo: PF.undo,
    redo: PF.redo,
    'zoom-in': () => { PF.ui.zoom = Math.min(3, Math.round((PF.zoomScale + 0.1) * 10) / 10); PF.applyZoom(); },
    'zoom-out': () => { PF.ui.zoom = Math.max(0.1, Math.round((PF.zoomScale - 0.1) * 10) / 10); PF.applyZoom(); },
    'zoom-fit': () => { PF.ui.zoom = 'fit'; PF.applyZoom(); },
    import: importJson,
    'export-json': exportJson,
    'export-png': exportModal,
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !actions[b.dataset.act]) return;
    if (b.closest('.menu')) fileMenu.classList.add('hidden');
    actions[b.dataset.act]();
  });
  $$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
  $('#preview-toggle').addEventListener('change', (e) => setPreview(e.target.checked));
  document.addEventListener('keydown', (e) => {
    const inEd = document.activeElement && (document.activeElement.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !inEd && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? PF.redo() : PF.undo(); }
    else if (mod && !inEd && e.key.toLowerCase() === 'y') { e.preventDefault(); PF.redo(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); PF.saveNow(); PF.toast('이 브라우저에 저장했어요'); }
    else if (e.key === 'Escape' && !inEd) { closeModal(); PF.closeSheets(); fileMenu.classList.add('hidden'); PF.select(null); }
  });
  addEventListener('beforeunload', () => PF.saveNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) PF.saveNow(); });

  /* ---------- 시작 ---------- */
  async function start() {
    PF.fillIcons();
    PF.onMobileChange(() => { PF.closeSheets(); PF.closeTextSheet && PF.closeTextSheet(); if (PF.project) PF.render(); });
    PF.initCanvas();
    PF.initRichText(PF.frameEl);
    PF.initStickers();
    renderPalette();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    await PF.migrateOld();
    for (const { key, value } of await PF.idb.all('assets')) PF.assets[key] = value;
    const cur = await PF.dbGet('current');
    const list = await PF.listProjects();
    const id = list.some((r) => r.id === cur) ? cur : list[0] && list[0].id;
    // 도구막대는 프로젝트가 있어야 색을 그릴 수 있어서 임시 프로젝트로 먼저 준비
    PF.project = PF.TEMPLATES.detail.make();
    PF.buildRichBar();
    if (id && (await PF.openProject(id))) return;
    PF.afterLoad();
    PF.resetHistory();
    templateModal(true);
  }
  start();
})();
