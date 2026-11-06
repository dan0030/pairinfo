/* 공용 상태 · 유틸 · 저장 · 되돌리기 */
(function () {
  const PF = (window.PF = {});

  PF.uid = () => Math.random().toString(36).slice(2, 10);
  PF.$ = (s, r = document) => r.querySelector(s);
  PF.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  PF.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  PF.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  PF.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 색 / 테마 ---------- */
  PF.THEME_KEYS = [
    ['bg', '바탕(전체 배경)'],
    ['card', '카드 면'],
    ['border', '카드 테두리'],
    ['title', '제목 글자'],
    ['text', '본문 글자'],
    ['muted', '보조 글자'],
    ['accentA', '캐릭터 A 색'],
    ['accentB', '캐릭터 B 색'],
    ['tagBg', '태그·채움 면'],
    ['tagText', '태그 글자'],
    ['highlight', '형광펜'],
    ['line', '구분선·타임라인 선'],
  ];

  PF.PRESETS = {
    '기본 (네이비·머스터드)': { bg: '#F3F4F6', card: '#FAFAFB', border: '#E2E4E9', title: '#16181D', text: '#33373F', muted: '#7B818D', accentA: '#1F2A5A', accentB: '#D2AE45', tagBg: '#ECEEF2', tagText: '#33373F', highlight: '#FBE38A', line: '#E4E6EB' },
    '로즈·세이지': { bg: '#F6F2F0', card: '#FFFCFA', border: '#EADFDA', title: '#2B1F1D', text: '#4A3B38', muted: '#9A8A85', accentA: '#B8566B', accentB: '#6E8F72', tagBg: '#F1E7E3', tagText: '#4A3B38', highlight: '#F8D4DC', line: '#EADFDA' },
    '밤하늘': { bg: '#14161F', card: '#1D2030', border: '#2C3046', title: '#F2F3F8', text: '#D5D8E5', muted: '#8C91A8', accentA: '#8FA7FF', accentB: '#F2C86B', tagBg: '#272B3F', tagText: '#D5D8E5', highlight: '#5A4A1E', line: '#2C3046' },
    '레몬·코발트': { bg: '#FFFBEA', card: '#FFFFFF', border: '#F0E6B8', title: '#14213D', text: '#2B3550', muted: '#8A8F9E', accentA: '#2747C9', accentB: '#E9B500', tagBg: '#FFF4C2', tagText: '#2B3550', highlight: '#FFE16B', line: '#F0E6B8' },
    '모노': { bg: '#EFEFEF', card: '#FFFFFF', border: '#DADADA', title: '#111111', text: '#2A2A2A', muted: '#8A8A8A', accentA: '#111111', accentB: '#8A8A8A', tagBg: '#EFEFEF', tagText: '#2A2A2A', highlight: '#E6E6E6', line: '#DADADA' },
  };

  PF.defaultSettings = (width) => ({
    width: width || 1600,
    pad: 48, // 바깥 여백
    gap: 22, // 블록 사이 간격
    radius: 26,
    borderWidth: 2,
    cardPad: 30,
    fonts: { title: 'Paperlogy', body: 'KoPubWorld Dotum', custom: [] },
    theme: Object.assign({}, PF.PRESETS['기본 (네이비·머스터드)']),
  });

  /* ---------- 상태 ---------- */
  PF.project = null; // 되돌리기 대상
  PF.assets = {}; // id -> dataURL (되돌리기 대상 아님)
  PF.ui = { selected: null, selSticker: null, preview: false, zoom: 'fit', stickerLock: false };

  PF.findBlock = function (id, p = PF.project) {
    for (let ri = 0; ri < p.rows.length; ri++) {
      const row = p.rows[ri];
      for (let ci = 0; ci < row.cols.length; ci++) {
        const col = row.cols[ci];
        const bi = col.blocks.findIndex((b) => b.id === id);
        if (bi > -1) return { row, col, block: col.blocks[bi], ri, ci, bi };
      }
    }
    return null;
  };

  /* ---------- 이미지 자산 ---------- */
  PF.readFile = (file, as = 'dataURL') =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      as === 'text' ? r.readAsText(file) : r.readAsDataURL(file);
    });

  PF.addImageFile = async function (file, maxSide = 1800) {
    const url = await PF.readFile(file);
    if (/gif|svg/.test(file.type)) return PF.addAsset(url);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (s === 1 && file.size < 1.5e6) return PF.addAsset(url);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const keepAlpha = /png|webp/.test(file.type);
    return PF.addAsset(keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));
  };

  PF.addAsset = function (dataURL) {
    for (const k in PF.assets) if (PF.assets[k] === dataURL) return k;
    const id = 'a' + PF.uid();
    PF.assets[id] = dataURL;
    PF.idb.put('assets', id, dataURL).catch(() => PF.toast('이미지를 저장할 공간이 부족해요'));
    return id;
  };

  PF.pickFile = function (accept, multiple) {
    return new Promise((res) => {
      const inp = PF.$('#file-any');
      inp.value = '';
      inp.accept = accept || '';
      inp.multiple = !!multiple;
      inp.onchange = () => res(Array.from(inp.files || []));
      inp.click();
    });
  };

  /* ---------- HTML 정리 (불러온 파일 보호) ---------- */
  PF.sanitize = function (html) {
    if (typeof html !== 'string' || html.indexOf('<') < 0) return html;
    const t = document.createElement('template');
    t.innerHTML = html;
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,textarea,button,svg,math').forEach((n) => n.remove());
    t.content.querySelectorAll('*').forEach((n) => {
      for (const a of Array.from(n.attributes)) {
        const nm = a.name.toLowerCase();
        if (nm.startsWith('on') || /javascript:/i.test(a.value) || !['style', 'color', 'face', 'size', 'align', 'class'].includes(nm)) n.removeAttribute(a.name);
      }
    });
    return t.innerHTML;
  };

  PF.deepSanitize = function (o) {
    if (Array.isArray(o)) return o.map(PF.deepSanitize);
    if (o && typeof o === 'object') {
      const r = {};
      for (const k in o) r[k] = k === 'css' ? String(o[k]).replace(/<\/?style/gi, '') : PF.deepSanitize(o[k]);
      return r;
    }
    return PF.sanitize(o);
  };

  /* ---------- 되돌리기 ---------- */
  const hist = { undo: [], redo: [], last: null };
  PF.commit = function () {
    const snap = JSON.stringify(PF.project);
    if (snap === hist.last) return;
    if (hist.last != null) hist.undo.push(hist.last);
    if (hist.undo.length > 80) hist.undo.shift();
    hist.redo.length = 0;
    hist.last = snap;
    PF.saveSoon();
  };
  let commitTimer = 0;
  PF.commitSoon = () => {
    clearTimeout(commitTimer);
    commitTimer = setTimeout(PF.commit, 500);
  };
  PF.resetHistory = () => {
    hist.undo.length = hist.redo.length = 0;
    hist.last = JSON.stringify(PF.project);
  };
  PF.undo = function () {
    clearTimeout(commitTimer);
    PF.commit();
    if (!hist.undo.length) return;
    hist.redo.push(hist.last);
    hist.last = hist.undo.pop();
    PF.project = JSON.parse(hist.last);
    PF.afterLoad();
  };
  PF.redo = function () {
    if (!hist.redo.length) return;
    hist.undo.push(hist.last);
    hist.last = hist.redo.pop();
    PF.project = JSON.parse(hist.last);
    PF.afterLoad();
  };

  /* ---------- IndexedDB: 여러 페어틀 자동 저장 ----------
     kv       : 'current' → 지금 열린 페어틀 id
     projects : id → { id, name, nameAuto, created, updated, thumb, data(JSON) }
     assets   : id → dataURL (모든 페어틀이 함께 씀) */
  let dbp = null;
  function db() {
    if (!dbp)
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('pairframe', 2);
        r.onupgradeneeded = () => {
          const d = r.result;
          for (const n of ['kv', 'projects', 'assets']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n);
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    return dbp;
  }
  const req = (q) => new Promise((res, rej) => { q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  PF.idb = {
    async get(store, k) { try { return await req((await db()).transaction(store).objectStore(store).get(k)); } catch (e) { return undefined; } },
    async put(store, k, v) { try { return await req((await db()).transaction(store, 'readwrite').objectStore(store).put(v, k)); } catch (e) { console.warn('저장 실패', e); throw e; } },
    async del(store, k) { try { return await req((await db()).transaction(store, 'readwrite').objectStore(store).delete(k)); } catch (e) {} },
    async all(store) {
      try {
        const st = (await db()).transaction(store).objectStore(store);
        const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
        return keys.map((k, i) => ({ key: k, value: vals[i] }));
      } catch (e) { return []; }
    },
  };
  PF.dbGet = (k) => PF.idb.get('kv', k);
  PF.dbSet = (k, v) => PF.idb.put('kv', k, v);

  PF.meta = null; // 지금 열린 페어틀의 { id, name, nameAuto, created, thumb }

  PF.titleText = function (p = PF.project) {
    for (const r of p.rows) for (const c of r.cols) for (const b of c.blocks)
      if (b.type === 'title') return (b.data.title || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    return '';
  };
  PF.projectName = () => (PF.meta && !PF.meta.nameAuto && PF.meta.name) || PF.titleText() || '이름 없는 페어틀';

  function setStatus(t, cls) {
    const el = document.getElementById('save-status');
    if (!el) return;
    el.textContent = t;
    el.className = 'save-status ' + (cls || '');
  }
  let saveTimer = 0;
  PF.saveSoon = () => {
    if (!PF.meta) return;
    setStatus('저장 중…', 'busy');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(PF.saveNow, 700);
  };
  PF.saveNow = async () => {
    clearTimeout(saveTimer);
    if (!PF.project || !PF.meta) return;
    const m = PF.meta;
    m.name = PF.projectName();
    const pn = document.getElementById('proj-name');
    if (pn) pn.textContent = m.name;
    m.updated = Date.now();
    try {
      await PF.idb.put('projects', m.id, Object.assign({}, m, { data: JSON.stringify(PF.project) }));
      await PF.dbSet('current', m.id);
      const d = new Date(m.updated);
      setStatus('자동 저장됨 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), 'ok');
    } catch (e) {
      setStatus('저장 실패 — 저장 공간을 확인하세요', 'err');
    }
  };

  /* 지금 페어틀 썸네일 (목록용, 작게) */
  PF.makeThumb = async function () {
    if (!PF.meta || !window.htmlToImage || !PF.frameEl) return;
    try {
      const f = PF.frameEl;
      PF.meta.thumb = await htmlToImage.toJpeg(f, {
        pixelRatio: 420 / f.offsetWidth, quality: 0.72, skipFonts: true, backgroundColor: PF.project.settings.theme.bg,
        height: Math.min(f.offsetHeight, f.offsetWidth * 1.25),
        filter: (n) => !(n.classList && n.classList.contains('pf-chrome')),
      });
      await PF.saveNow();
    } catch (e) { console.warn('썸네일 실패', e); }
  };

  /* 새 페어틀을 목록에 추가하고 열기 */
  PF.newProject = async function (project, name) {
    if (PF.meta) await PF.saveNow();
    PF.project = project;
    PF.meta = { id: 'p' + PF.uid(), name: name || '', nameAuto: !name, created: Date.now(), thumb: null };
    PF.ui.selected = PF.ui.selSticker = null;
    PF.ui.zoom = 'fit';
    PF.afterLoad();
    PF.resetHistory();
    await PF.saveNow();
  };
  PF.openProject = async function (id) {
    const rec = await PF.idb.get('projects', id);
    if (!rec) return false;
    if (PF.meta && PF.meta.id !== id) await PF.saveNow();
    const { data, ...meta } = rec;
    PF.project = JSON.parse(data);
    PF.meta = meta;
    PF.ui.selected = PF.ui.selSticker = null;
    PF.ui.zoom = 'fit';
    PF.afterLoad();
    PF.resetHistory();
    await PF.dbSet('current', id);
    return true;
  };
  PF.listProjects = async () => (await PF.idb.all('projects')).map((x) => x.value).sort((a, b) => b.updated - a.updated);

  /* 어떤 페어틀도 쓰지 않는 이미지 · 글꼴 정리 */
  PF.cleanupAssets = async function () {
    const recs = await PF.idb.all('projects');
    const all = recs.map((r) => r.value.data).join('\n') + JSON.stringify(PF.project || {});
    for (const k of Object.keys(PF.assets)) {
      if (!all.includes('"' + k + '"')) {
        delete PF.assets[k];
        PF.idb.del('assets', k);
      }
    }
  };

  /* 예전(한 개만 저장하던) 데이터 옮기기 */
  PF.migrateOld = async function () {
    const old = await PF.dbGet('project');
    if (!old) return;
    const oldAssets = (await PF.dbGet('assets')) || {};
    for (const k in oldAssets) await PF.idb.put('assets', k, oldAssets[k]);
    const id = 'p' + PF.uid();
    let name = '';
    try { const p = JSON.parse(old); PF.project = p; name = PF.titleText(p); } catch (e) {}
    await PF.idb.put('projects', id, { id, name: name || '이전 페어틀', nameAuto: true, created: Date.now(), updated: Date.now(), thumb: null, data: old });
    await PF.dbSet('current', id);
    await PF.idb.del('kv', 'project');
    await PF.idb.del('kv', 'assets');
    PF.project = null;
  };

  /* 실제로 쓰이는 이미지만 골라내기 (스티커 보관함 포함) */
  PF.usedAssets = function (includeLibrary) {
    const s = JSON.stringify(PF.project);
    const out = {};
    for (const k in PF.assets) if (s.includes('"' + k + '"')) out[k] = PF.assets[k];
    if (includeLibrary) for (const k of PF.project.stickerLib || []) if (PF.assets[k]) out[k] = PF.assets[k];
    return out;
  };

  PF.toast = function (msg, ms = 2200) {
    const t = PF.$('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add('hidden'), ms);
  };
  /* ---------- 아이콘 (선 아이콘, 24×24) ---------- */
  const ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    download: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
    upload: '<path d="M12 16V5"/><path d="M7.5 9.5 12 5l4.5 4.5"/><path d="M5 20h14"/>',
    save: '<path d="M5 4h11l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.3-4-7.7-9-7.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  };
  PF.icon = (name) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  PF.iconEl = (name) => { const s = document.createElement('i'); s.className = 'i'; s.innerHTML = PF.icon(name); return s; };
  PF.fillIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstChild) el.innerHTML = PF.icon(el.dataset.icon); });

  /* 모바일(좁은 화면) 여부 */
  const mq = matchMedia('(max-width: 860px)');
  PF.isMobile = () => mq.matches;
  PF.onMobileChange = (fn) => mq.addEventListener('change', fn);
})();
