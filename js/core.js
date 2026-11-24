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

  /* ---------- 그라데이션 색 ----------
     { c: [색1, 색2, 색3?], three: bool, kind: 'linear'|'radial', a: 각도 } */
  /* 예전 형식 { c:[..], three } → 새 형식 { stops:[{ c, p, o }] } */
  PF.gradStops = function (g) {
    if (Array.isArray(g.stops) && g.stops.length) return g.stops;
    const cs = (g.three ? (g.c || []).slice(0, 3) : (g.c || []).slice(0, 2)).filter(Boolean);
    if (!cs.length) cs.push('#FFFFFF', '#E6E8EE');
    if (cs.length === 1) cs.push(cs[0]);
    return cs.map((c, i) => ({ c, p: Math.round((i / (cs.length - 1)) * 100), o: 1 }));
  };
  PF.rgba = function (hex, o = 1) {
    let h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    const a = h.length === 8 ? (parseInt(h.slice(6, 8), 16) / 255) * o : o;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(a * 1000) / 1000})`;
  };
  /* 그라데이션 → CSS
     { stops:[{ c:색, p:위치%, o:불투명도 }], kind:'linear'|'radial'|'conic', a:각도, x/y:중심%, shape:'circle'|'ellipse' } */
  PF.cssGrad = function (g) {
    if (!g) return '';
    const st = PF.gradStops(g).slice().sort((a, b) => (a.p ?? 0) - (b.p ?? 0));
    const stops = st.map((s) => `${PF.rgba(s.c, s.o ?? 1)} ${PF.clamp(s.p ?? 0, 0, 100)}%`).join(', ');
    const at = `${g.x ?? 50}% ${g.y ?? 50}%`;
    if (g.kind === 'radial') return `radial-gradient(${g.shape === 'ellipse' ? 'ellipse' : 'circle'} at ${at}, ${stops})`;
    if (g.kind === 'conic') return `conic-gradient(from ${g.a ?? 0}deg at ${at}, ${stops})`;
    return `linear-gradient(${g.a ?? 135}deg, ${stops})`;
  };

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
    let img;
    try {
      img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
    } catch (e) {
      PF.toast('이 이미지 형식은 열 수 없어요. JPG · PNG · WEBP로 바꿔서 올려 주세요', 4000);
      throw e;
    }
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (s === 1 && file.size < 700e3) return PF.addAsset(url);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    // 투명한 부분이 실제로 있을 때만 PNG 유지
    let alpha = false;
    if (/png|webp|gif|avif/.test(file.type)) {
      try {
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const step = Math.max(4, Math.floor(d.length / 4 / 400000) * 4);
        for (let k = 3; k < d.length; k += step) if (d[k] < 250) { alpha = true; break; }
      } catch (e) { alpha = true; }
    }
    return PF.addAsset(alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));
  };

  PF.addAsset = function (dataURL) {
    for (const k in PF.assets) if (PF.assets[k] === dataURL) return k;
    const id = 'a' + PF.uid();
    PF.assets[id] = dataURL;
    PF.storeAsset(id, dataURL);
    flushNext = true;
    return id;
  };

  /* ---------- 이미지 저장소 ----------
     값: { b: Blob, t: 저장 시각 }  (예전 값: 글자 그대로의 dataURL, 또는 { s: dataURL }) */
  function dataURLToBlob(u) {
    const i = u.indexOf(',');
    const head = u.slice(5, i), b64 = /;base64/.test(head);
    const mime = head.split(';')[0] || 'application/octet-stream';
    const raw = b64 ? atob(u.slice(i + 1)) : decodeURIComponent(u.slice(i + 1));
    const arr = new Uint8Array(raw.length);
    for (let k = 0; k < raw.length; k++) arr[k] = raw.charCodeAt(k);
    return new Blob([arr], { type: mime });
  }
  const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
  const pendingAssets = new Set();
  PF.storeAsset = function (id, dataURL) {
    const job = (async () => {
      let ok = false;
      try { await PF.idb.put('assets', id, { b: dataURLToBlob(dataURL), t: Date.now() }); ok = await PF.idb.has('assets', id); } catch (e) { console.warn('이미지 저장(바이너리) 실패 → 글자로 다시', e); }
      if (!ok) { try { await PF.idb.put('assets', id, { s: dataURL, t: Date.now() }); ok = await PF.idb.has('assets', id); } catch (e) { console.warn('이미지 저장 실패', e); } }
      if (!ok) {
        PF.assetError = true;
        PF.toast('이미지를 브라우저에 저장하지 못했어요. 저장 공간이 부족하거나 저장이 막힌 브라우저예요. “저장 파일”로 꼭 백업해 주세요', 8000);
        if (PF.setStatus) PF.setStatus('이미지 저장 실패 — 저장 파일로 백업하세요', 'err');
      }
      return ok;
    })();
    pendingAssets.add(job);
    job.finally(() => pendingAssets.delete(job));
    return job;
  };
  PF.waitAssets = () => Promise.all(Array.from(pendingAssets));
  async function readAsset(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (v.s) return v.s;
    if (v.b) return blobToDataURL(v.b);
    return null;
  }
  /* 페어틀이 쓰는 이미지 번호 모으기 */
  PF.assetRefs = function (p) {
    const s = JSON.stringify(p || {});
    const ids = new Set();
    for (const m of s.matchAll(/"(?:id|src|img|asset)":"(a[0-9a-z]{4,12})"/g)) ids.add(m[1]);
    ((p && p.stickerLib) || []).forEach((x) => typeof x === 'string' && ids.add(x));
    return ids;
  };
  /* 필요한 이미지만 하나씩 불러오기 (한꺼번에 읽다 실패하면 전부 비던 문제 방지) */
  PF.loadAssetsFor = async function (p) {
    const missing = [];
    for (const id of PF.assetRefs(p)) {
      if (PF.assets[id]) continue;
      let v;
      for (let tries = 0; tries < 2 && v === undefined; tries++) v = await PF.idb.get('assets', id);
      try {
        const d = await readAsset(v);
        if (d) PF.assets[id] = d; else missing.push(id);
      } catch (e) { missing.push(id); }
    }
    return missing;
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
  const HIST_MAX = 150;
  let commitTimer = 0, pending = false;
  /* 되돌리기 · 다시하기 버튼 상태 */
  PF.updateHistBtns = function () {
    const u = hist.undo.length > 0 || pending, r = hist.redo.length > 0 && !pending;
    document.querySelectorAll('[data-act="undo"]').forEach((b) => { b.disabled = !u; b.title = u ? '되돌리기 (Ctrl+Z) · ' + (hist.undo.length + (pending ? 1 : 0)) + '단계' : '되돌릴 작업이 없어요'; });
    document.querySelectorAll('[data-act="redo"]').forEach((b) => { b.disabled = !r; b.title = r ? '다시하기 (Ctrl+Shift+Z) · ' + hist.redo.length + '단계' : '다시 할 작업이 없어요'; });
  };
  PF.commit = function () {
    clearTimeout(commitTimer);
    pending = false;
    const snap = JSON.stringify(PF.project);
    if (snap === hist.last) return PF.updateHistBtns();
    if (hist.last != null) hist.undo.push(hist.last);
    if (hist.undo.length > HIST_MAX) hist.undo.shift();
    hist.redo.length = 0;
    hist.last = snap;
    PF.saveSoon();
    PF.updateHistBtns();
  };
  PF.commitSoon = () => {
    clearTimeout(commitTimer);
    pending = true;
    commitTimer = setTimeout(PF.commit, 500);
    PF.updateHistBtns();
  };
  PF.resetHistory = () => {
    clearTimeout(commitTimer);
    pending = false;
    hist.undo.length = hist.redo.length = 0;
    hist.last = JSON.stringify(PF.project);
    PF.updateHistBtns();
  };
  function restoreSnap(snap, msg) {
    // 글 편집 창 · 선택은 옛 화면을 가리키므로 닫고 다시 그림
    if (PF.closeTextSheet) PF.closeTextSheet(true);
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    PF.project = JSON.parse(snap);
    PF.afterLoad();
    PF.saveSoon();
    PF.updateHistBtns();
    PF.toast(msg, 1100);
  }
  PF.undo = function () {
    PF.commit();
    if (!hist.undo.length) return PF.toast('더 되돌릴 작업이 없어요', 1200);
    hist.redo.push(hist.last);
    hist.last = hist.undo.pop();
    restoreSnap(hist.last, '↶ 되돌렸어요');
  };
  PF.redo = function () {
    if (pending) PF.commit();
    if (!hist.redo.length) return PF.toast('다시 할 작업이 없어요', 1200);
    hist.undo.push(hist.last);
    hist.last = hist.redo.pop();
    restoreSnap(hist.last, '↷ 다시 했어요');
  };

  /* ---------- 뒤로가기: 열린 창(패널 · 글 편집 · 목록 · 메뉴)부터 닫기 ----------
     창을 열 때 브라우저 기록에 한 칸을 넣어 두고, 뒤로가기를 누르면 사이트를 떠나지 않고 창만 닫음 */
  let backPushed = false, backSilent = false;
  PF.backPush = function () {
    if (backPushed) return;
    backPushed = true;
    try { history.pushState({ pf: 'overlay' }, ''); } catch (e) {}
  };
  // 창을 버튼으로 닫았을 때: 다른 창이 남아 있지 않으면 넣어 둔 기록 한 칸을 정리
  PF.backPop = function () {
    if (!backPushed || backSilent) return;
    setTimeout(() => {
      if (!backPushed || (PF.anyOverlayOpen && PF.anyOverlayOpen())) return;
      backPushed = false;
      backSilent = true;
      history.back();
    }, 0);
  };
  addEventListener('popstate', () => {
    if (backSilent) { backSilent = false; return; }
    if (!backPushed) return;
    backPushed = false;
    backSilent = true; // 아래에서 창을 닫으며 다시 backPop 이 불리지 않게
    try { PF.closeAllOverlays && PF.closeAllOverlays(); } finally { backSilent = false; }
  });

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
    async keys(store) { try { return await req((await db()).transaction(store).objectStore(store).getAllKeys()); } catch (e) { return []; } },
    async has(store, k) { try { return (await req((await db()).transaction(store).objectStore(store).count(k))) > 0; } catch (e) { return false; } },
    async ping() { try { await db(); return true; } catch (e) { return false; } },
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
  PF.setStatus = setStatus;
  let saveTimer = 0;
  let flushNext = false;
  let dirty = false; // 이 창에서 고친 내용이 아직 저장 안 됨
  // 타이핑 중이라 아직 되돌리기 기록에 안 들어간 변경(pending)도 ‘고친 내용’으로 봄
  const hasEdits = () => dirty || pending;
  PF.isDirty = hasEdits;
  PF.saveSoon = () => {
    if (!PF.meta) return;
    dirty = true;
    setStatus('저장 중…', 'busy');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(PF.saveNow, flushNext ? 30 : 700);
    flushNext = false;
  };

  /* 같은 페어틀을 다른 창(탭)이 그 사이 저장했으면 덮어쓰지 않음 */
  function txSave(rec, baseRev) {
    return db().then((d) => new Promise((res, rej) => {
      const tx = d.transaction(['projects', 'kv'], 'readwrite');
      const st = tx.objectStore('projects');
      let out = null;
      const g = st.get(rec.id);
      g.onsuccess = () => {
        const cur = g.result;
        const curRev = cur ? cur.rev || 0 : 0;
        if (cur && curRev > baseRev) { out = { conflict: true, cur }; return; }
        rec.rev = curRev + 1;
        st.put(rec, rec.id);
        tx.objectStore('kv').put(rec.id, 'current');
        out = { ok: true, rev: rec.rev };
      };
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('저장 취소됨'));
    }));
  }
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pairframe') : null;
  const tabId = PF.uid();
  let saving = null;

  /* metaOnly: 썸네일 · 이름처럼 내용이 아닌 것만 바뀐 저장 */
  PF.saveNow = async (opts = {}) => {
    clearTimeout(saveTimer);
    if (!PF.project || !PF.meta) return;
    if (pending) PF.commit(); // 방금 친 글자까지 포함
    if (!dirty && !opts.force && !opts.metaOnly) return; // 고친 게 없으면 저장하지 않음 (옛 화면이 새 내용을 덮는 일 방지)
    if (saving) { await saving; if (!dirty && !opts.force && !opts.metaOnly) return; }
    saving = (async () => {
      await PF.waitAssets(); // 이미지가 먼저 저장된 다음에 페어틀 저장
      const m = PF.meta;
      m.name = PF.projectName();
      const pn = document.getElementById('proj-name');
      if (pn) pn.textContent = m.name;
      const wasDirty = dirty;
      dirty = false;
      const { data: _d, ...metaNoData } = m;
      const rec = Object.assign({}, metaNoData, { updated: Date.now(), data: JSON.stringify(PF.project) });
      try {
        const r = await txSave(rec, m.rev || 0);
        if (r.conflict) {
          if (!wasDirty) { await PF.reloadCurrent(r.cur); return; } // 이 창엔 고친 게 없으니 새 내용을 받아 옴
          // 두 창에서 모두 고쳤으면: 저쪽 내용을 지키고, 이 창 내용은 따로 저장
          m.id = 'p' + PF.uid();
          m.rev = 0;
          m.nameAuto = false;
          m.name = PF.projectName().replace(/ \(이 창에서 고친 버전\)$/, '') + ' (이 창에서 고친 버전)';
          dirty = true;
          saving = null;
          await PF.saveNow({ force: true });
          PF.toast('다른 창에서도 이 페어틀을 고쳐서, 이 창의 내용은 “' + m.name + '”로 따로 저장했어요', 7000);
          return;
        }
        m.rev = r.rev;
        m.updated = rec.updated;
        if (bc) bc.postMessage({ type: 'saved', id: m.id, rev: m.rev, from: tabId });
        const d = new Date(m.updated);
        if (!PF.assetError) setStatus('자동 저장됨 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), 'ok');
      } catch (e) {
        console.error('저장 실패', e);
        dirty = dirty || wasDirty;
        setStatus('저장 실패 — 저장 공간을 확인하세요', 'err');
      }
    })();
    try { await saving; } finally { saving = null; }
  };

  /* 다른 창이 저장한 새 내용으로 바꾸기 (이 창에 안 저장된 내용이 없을 때만) */
  PF.reloadCurrent = async function (rec) {
    if (!PF.meta) return false;
    rec = rec || (await PF.idb.get('projects', PF.meta.id));
    if (!rec || (rec.rev || 0) <= (PF.meta.rev || 0) || hasEdits()) return false;
    const { data, ...meta } = rec;
    const project = JSON.parse(data);
    await PF.loadAssetsFor(project);
    const zoom = PF.ui.zoom;
    PF.project = project;
    PF.meta = meta;
    if (PF.closeTextSheet) PF.closeTextSheet(true);
    PF.afterLoad();
    PF.resetHistory();
    PF.ui.zoom = zoom;
    PF.applyZoom && PF.applyZoom();
    PF.toast('다른 창에서 고친 최신 내용으로 바꿨어요', 3000);
    return true;
  };
  /* 창으로 돌아왔을 때 · 다른 창이 저장했을 때 최신 내용 확인 */
  PF.checkNewer = async function () {
    if (!PF.meta || hasEdits()) return;
    const rec = await PF.idb.get('projects', PF.meta.id);
    if (rec && (rec.rev || 0) > (PF.meta.rev || 0)) await PF.reloadCurrent(rec);
  };
  if (bc) bc.onmessage = (e) => {
    const m = e.data || {};
    if (m.from === tabId || !PF.meta || m.id !== PF.meta.id) return;
    if (m.type === 'saved' && (m.rev || 0) > (PF.meta.rev || 0)) {
      if (!hasEdits()) PF.reloadCurrent();
      else PF.toast('다른 창에서도 이 페어틀을 고치고 있어요. 한 창에서만 고쳐 주세요', 5000);
    }
  };

  /* 지금 페어틀 썸네일 (목록용, 작게) */
  PF.makeThumb = async function () {
    if (!PF.meta || !window.htmlToImage || !PF.frameEl) return;
    try {
      const f = PF.frameEl;
      const ratio = 420 / f.offsetWidth;
      if (PF.prepareForCapture) await PF.prepareForCapture(f, ratio);
      PF.meta.thumb = await htmlToImage.toJpeg(f, {
        pixelRatio: 420 / f.offsetWidth, quality: 0.72, skipFonts: true, backgroundColor: PF.project.settings.theme.bg,
        height: Math.min(f.offsetHeight, f.offsetWidth * 1.25),
        filter: (n) => !(n.classList && n.classList.contains('pf-chrome')),
      });
      await PF.saveNow({ metaOnly: true });
    } catch (e) { console.warn('썸네일 실패', e); }
    PF.render(true); // 줄여 끼운 이미지를 원래대로
  };

  /* 새 페어틀을 목록에 추가하고 열기 */
  PF.newProject = async function (project, name) {
    if (PF.meta) await PF.saveNow();
    await PF.loadAssetsFor(project);
    PF.project = project;
    PF.meta = { id: 'p' + PF.uid(), name: name || '', nameAuto: !name, created: Date.now(), thumb: null, rev: 0 };
    PF.ui.selected = PF.ui.selSticker = null;
    PF.ui.zoom = 'fit';
    PF.afterLoad();
    PF.resetHistory();
    await PF.saveNow({ force: true });
  };
  PF.openProject = async function (id) {
    const rec = await PF.idb.get('projects', id);
    if (!rec) return false;
    if (PF.meta && PF.meta.id !== id) await PF.saveNow();
    const { data, ...meta } = rec;
    const project = JSON.parse(data);
    const missing = await PF.loadAssetsFor(project);
    dirty = false;
    PF.project = project;
    PF.meta = meta;
    if (missing.length) setTimeout(() => PF.toast(`이미지 ${missing.length}개를 이 브라우저 저장소에서 찾지 못했어요. 저장 파일(.json)이 있으면 “불러오기”로 되살릴 수 있어요`, 8000), 600);
    PF.ui.selected = PF.ui.selSticker = null;
    PF.ui.zoom = 'fit';
    PF.afterLoad();
    PF.resetHistory();
    await PF.dbSet('current', id);
    return true;
  };
  PF.listProjects = async () => (await PF.idb.all('projects')).map((x) => x.value).sort((a, b) => b.updated - a.updated);

  /* 어떤 페어틀도 쓰지 않는 이미지 · 글꼴 정리 */
  /* 어떤 페어틀에도 연결되지 않은 이미지 (예전에 덮어써져 연결이 끊긴 이미지 포함) */
  PF.findOrphanAssets = async function () {
    const recs = await PF.idb.all('projects');
    const used = new Set();
    for (const r of recs) { try { PF.assetRefs(JSON.parse(r.value.data)).forEach((x) => used.add(x)); } catch (e) {} }
    PF.assetRefs(PF.project).forEach((x) => used.add(x));
    // 사용자 글꼴은 이미지가 아니므로 제외
    const out = [];
    for (const k of await PF.idb.keys('assets')) {
      if (used.has(k)) continue;
      let d = PF.assets[k];
      if (!d) { const v = await PF.idb.get('assets', k); try { d = await readAsset(v); } catch (e) { d = null; } }
      if (d && /^data:image\//.test(d)) { PF.assets[k] = d; out.push(k); }
    }
    return out;
  };
  /* 직접 지울 때만 사용 */
  PF.cleanupAssets = async function () {
    const recs = await PF.idb.all('projects');
    const all = recs.map((r) => r.value.data).join('\n') + JSON.stringify(PF.project || {});
    const keys = new Set([...(await PF.idb.keys('assets')), ...Object.keys(PF.assets)]);
    for (const k of keys) {
      if (all.includes('"' + k + '"')) continue;
      const v = await PF.idb.get('assets', k);
      if (v && v.t && Date.now() - v.t < 60 * 60 * 1000) continue; // 한 시간 안에 넣은 이미지는 남김
      delete PF.assets[k];
      PF.idb.del('assets', k);
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
