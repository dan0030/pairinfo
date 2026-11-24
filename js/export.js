/* PNG 만들기 — 큰 이미지 · 글꼴 때문에 휴대폰에서 이미지가 빠지던 문제를 막기 위한 준비 단계 포함
   1) 이미지는 실제로 보이는 크기 × 배율만큼만 줄여서 넣음 (원본을 칸마다 통째로 넣지 않음)
   2) 글꼴은 페어틀에 실제로 쓰인 글꼴 · 굵기만 넣음
   3) 모든 이미지가 다 그려질 때까지 기다림, 사파리(아이폰)는 두 번 그려서 빠짐 방지
   4) 휴대폰 캔버스 크기 한도 안으로 배율을 맞춤 */
(function () {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = isIOS || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(ua));
  PF.isIOS = isIOS;
  // iOS 사파리 캔버스 최대 넓이 ≈ 16.7M 픽셀. 넉넉히 아래로.
  const maxArea = () => (isIOS ? 16000000 : PF.isMobile() ? 24000000 : 80000000);

  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  /* ---------- 이미지 줄이기 ---------- */
  const shrinkCache = new Map();
  async function shrink(src, tw, th) {
    const key = src.length + ':' + src.slice(-48) + ':' + tw + 'x' + th;
    if (shrinkCache.has(key)) return shrinkCache.get(key);
    const img = await loadImg(src);
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    // 많이 줄일 땐 반씩 나눠 줄여서 뭉개짐 방지
    let cur = img, cw = img.naturalWidth, ch = img.naturalHeight;
    while (cw / 2 > tw && ch / 2 > th) {
      const t = document.createElement('canvas');
      t.width = Math.round(cw / 2);
      t.height = Math.round(ch / 2);
      const tg = t.getContext('2d');
      tg.imageSmoothingQuality = 'high';
      tg.drawImage(cur, 0, 0, t.width, t.height);
      cur = t; cw = t.width; ch = t.height;
    }
    g.drawImage(cur, 0, 0, tw, th);
    const alpha = /^data:image\/(png|webp|gif|svg)/.test(src);
    const out = alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
    if (shrinkCache.size > 60) shrinkCache.clear();
    shrinkCache.set(key, out);
    return out;
  }
  const scaleOf = (el) => { const m = (el.style.transform || '').match(/scale\(([\d.]+)/); return m ? parseFloat(m[1]) || 1 : 1; };

  /* 캡처 직전: 화면에 붙은 이미지들을 필요한 해상도로 바꿔 끼움 (다음 PF.render() 로 원래대로 돌아옴) */
  PF.prepareForCapture = async function (f, ratio) {
    const imgs = Array.from(f.querySelectorAll('img'));
    await Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? null : i.decode().catch(() => {}))));
    for (const img of imgs) {
      const nw = img.naturalWidth, nh = img.naturalHeight;
      if (!nw || !nh || !/^data:image\//.test(img.src)) continue;
      const bw = img.offsetWidth, bh = img.offsetHeight;
      if (!bw || !bh) continue;
      let need;
      if (img.closest('.pf-sticker') || img.classList.contains('natural')) need = bw / nw;
      else need = Math.max(bw / nw, bh / nh); // object-fit: cover
      need *= scaleOf(img) * ratio * 1.1;
      if (need >= 0.8) continue; // 거의 원본 크기면 그대로
      try { img.src = await shrink(img.src, Math.max(1, Math.round(nw * need)), Math.max(1, Math.round(nh * need))); } catch (e) {}
    }
    // 배경 이미지 레이어
    const bgEl = f.querySelector('.pf-bg');
    const bg = PF.project.settings.bg;
    const m = bgEl && bgEl.style.backgroundImage.match(/^url\("?(data:[^")]+)"?\)$/);
    if (m) {
      try {
        const i = await loadImg(m[1]);
        const W = f.offsetWidth, H = f.offsetHeight;
        let need = bg.fit === 'tile' ? (bg.tile || 320) / i.naturalWidth : bg.fit === 'contain' ? Math.min(W / i.naturalWidth, H / i.naturalHeight) : Math.max(W / i.naturalWidth, H / i.naturalHeight);
        need *= ratio * 1.1;
        if (need < 0.8) bgEl.style.backgroundImage = `url("${await shrink(m[1], Math.round(i.naturalWidth * need), Math.round(i.naturalHeight * need))}")`;
      } catch (e) {}
    }
    await Promise.all(Array.from(f.querySelectorAll('img')).map((i) => i.decode().catch(() => {})));
  };

  /* ---------- 실제로 쓰인 글꼴만 넣기 ---------- */
  const fontCache = new Map();
  const wNum = (w) => (w === 'bold' ? 700 : w === 'normal' || !w ? 400 : parseInt(w, 10) || 400);
  function collectRules() {
    const rules = [];
    const walk = (sheet) => {
      let list;
      try { list = sheet.cssRules; } catch (e) { return; } // 다른 사이트 CSS
      for (const r of Array.from(list || [])) {
        if (r.type === 3 && r.styleSheet) walk(r.styleSheet); // @import
        if (r.type !== 5) continue; // @font-face
        const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        const wr = (r.style.getPropertyValue('font-weight') || '400').trim().split(/\s+/).map(wNum);
        const srcText = r.style.getPropertyValue('src');
        const um = srcText.match(/url\(\s*["']?([^"')]+)["']?\s*\)\s*(format\(\s*["']?([\w-]+)["']?\s*\))?/);
        if (!fam || !um) continue;
        let url = um[1];
        if (!/^data:/.test(url)) { try { url = new URL(url, sheet.href || location.href).href; } catch (e) { continue; } }
        rules.push({ fam, lo: wr[0], hi: wr[1] ?? wr[0], style: r.style.getPropertyValue('font-style') || 'normal', url, format: um[3] || '', weightText: r.style.getPropertyValue('font-weight') || '400' });
      }
    };
    Array.from(document.styleSheets).forEach(walk);
    return rules;
  }
  async function toDataURL(url) {
    if (/^data:/.test(url)) return url;
    if (fontCache.has(url)) return fontCache.get(url);
    const blob = await (await fetch(url, { mode: 'cors' })).blob();
    const d = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    fontCache.set(url, d);
    return d;
  }
  PF.fontEmbedCSS = async function (f) {
    const rules = collectRules();
    const known = new Set(rules.map((r) => r.fam.toLowerCase()));
    const used = new Map(); // family → Set(weights)
    const add = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      const fam = cs.fontFamily.split(',').map((x) => x.replace(/["']/g, '').trim()).find((x) => known.has(x.toLowerCase()));
      if (!fam) return;
      if (!used.has(fam.toLowerCase())) used.set(fam.toLowerCase(), new Set());
      used.get(fam.toLowerCase()).add(wNum(cs.fontWeight));
    };
    const tw = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (tw.nextNode()) {
      const el = tw.currentNode.parentElement;
      if (!el || seen.has(el) || !tw.currentNode.nodeValue.trim()) continue;
      seen.add(el);
      add(el);
    }
    f.querySelectorAll('.pf-tags.hash .pf-tag').forEach(add); // ‘#’ 글자는 ::before
    const pick = new Set();
    for (const [fam, ws] of used) {
      const rs = rules.filter((r) => r.fam.toLowerCase() === fam);
      for (const w of ws) {
        let best = null, bd = 1e9;
        for (const r of rs) { const d = w < r.lo ? r.lo - w : w > r.hi ? w - r.hi : 0; if (d < bd) { bd = d; best = r; } }
        if (best) pick.add(best);
      }
    }
    const parts = await Promise.all(Array.from(pick).map(async (r) => {
      try {
        const d = await toDataURL(r.url);
        return `@font-face{font-family:'${r.fam}';font-style:${r.style};font-weight:${r.weightText};src:url(${d})${r.format ? ` format('${r.format}')` : ''};}`;
      } catch (e) { return ''; } // 못 받으면 기본 글꼴로
    }));
    return parts.join('\n');
  };

  /* ---------- PNG 만들기 ---------- */
  PF.renderPng = async function (f, scale, onStep) {
    const W = f.offsetWidth, H = f.offsetHeight;
    let ratio = scale;
    if (W * H * ratio * ratio > maxArea()) ratio = Math.max(0.5, Math.floor(Math.sqrt(maxArea() / (W * H)) * 100) / 100);
    ratio = Math.min(ratio, 16000 / Math.max(W, H)); // 한 변 최대 길이
    onStep && onStep('이미지 정리 중…');
    await PF.prepareForCapture(f, ratio);
    onStep && onStep('글꼴 넣는 중…');
    let fontCSS = '';
    try { await document.fonts.ready; fontCSS = await PF.fontEmbedCSS(f); } catch (e) { console.warn('글꼴 준비 실패', e); }
    const opts = {
      pixelRatio: ratio, backgroundColor: PF.project.settings.theme.bg, cacheBust: false,
      fontEmbedCSS: fontCSS, skipFonts: !fontCSS,
      filter: (n) => !(n.classList && n.classList.contains('pf-chrome')),
    };
    onStep && onStep('그리는 중…');
    let canvas = await htmlToImage.toCanvas(f, opts);
    // 사파리는 SVG 안의 이미지를 첫 번에 못 그리는 일이 있어 한 번 더 그림
    if (isSafari) { await new Promise((r) => setTimeout(r, 120)); canvas = await htmlToImage.toCanvas(f, opts); }
    const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG 변환 실패'))), 'image/png'));
    return { blob, ratio, width: canvas.width, height: canvas.height };
  };
})();
