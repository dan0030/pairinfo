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
    fonts: { title: 'Paperlogy', body: 'Pretendard', custom: [] },
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
    PF.saveSoon();
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

  /* ---------- IndexedDB 자동 저장 ---------- */
  let dbp = null;
  function db() {
    if (!dbp)
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('pairframe', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    return dbp;
  }
  PF.dbGet = async (k) => {
    try {
      const d = await db();
      return await new Promise((res) => {
        const q = d.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = () => res(q.result);
        q.onerror = () => res(undefined);
      });
    } catch (e) {
      return undefined;
    }
  };
  PF.dbSet = async (k, v) => {
    try {
      const d = await db();
      d.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
    } catch (e) {}
  };
  let saveTimer = 0;
  PF.saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(PF.saveNow, 700);
  };
  PF.saveNow = () => {
    if (!PF.project) return;
    PF.dbSet('project', JSON.stringify(PF.project));
    PF.dbSet('assets', PF.usedAssets(true));
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
})();
