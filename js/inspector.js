/* 오른쪽 속성 패널 + 왼쪽 디자인 탭 */
(function () {
  const { h, $ } = PF;

  /* ---------- 작은 입력 부품 ---------- */
  const live = () => { PF.render(true); PF.commitSoon(); };
  const full = () => { PF.commit(); PF.render(); };

  function row(label, ...ctrl) {
    return h('div', { class: 'f-row' }, h('label', { class: 'f-lbl' }, label), h('div', { class: 'f-ctrl' }, ...ctrl));
  }
  /* 슬라이드 바 + 숫자 직접 입력 칸
     fmt(v) 가 '30px' · '50%' · '15°' · '1.20×' 같은 문자열이면 그 단위를 숫자 칸 옆에 붙임.
     0~1 값을 %로 보여주는 경우(투명도 등)는 숫자 칸에 0~100으로 보여줌 */
  function range(obj, key, min, max, step, onChange, fmt) {
    step = step || 1;
    const unit = fmt ? String(fmt(max)).replace(/[-\d.,\s]/g, '') : '';
    const k = unit === '%' && max <= 1 ? 100 : 1;
    const dec = Math.max(0, (String(step * k).split('.')[1] || '').length);
    const show = (v) => (Number(v) * k).toFixed(dec).replace(/\.0+$/, '');
    if (obj[key] == null || isNaN(obj[key])) obj[key] = min;
    const inp = h('input', { type: 'range', min, max, step, value: obj[key] });
    const num = h('input', { type: 'number', class: 'f-num-in', min: min * k, max: max * k, step: step * k, value: show(obj[key]), inputmode: dec ? 'decimal' : 'numeric' });
    const apply = (v, commit) => {
      obj[key] = v;
      inp.value = v;
      (onChange || live)();
      if (commit) PF.commit();
    };
    inp.addEventListener('input', () => { num.value = show(inp.value); apply(+inp.value); });
    inp.addEventListener('change', () => PF.commit());
    num.addEventListener('input', () => {
      const v = parseFloat(num.value);
      if (!isNaN(v) && v * 1 >= min * k && v <= max * k) apply(v / k);
    });
    const fix = () => {
      let v = parseFloat(num.value);
      if (isNaN(v)) v = obj[key] * k;
      v = PF.clamp(v / k, min, max);
      num.value = show(v);
      apply(v, true);
    };
    num.addEventListener('change', fix);
    num.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fix(); num.blur(); } });
    num.addEventListener('focus', () => num.select());
    return h('div', { class: 'f-range' }, inp, h('label', { class: 'f-num-wrap' }, num, unit ? h('span', { class: 'f-unit' }, unit) : null));
  }
  function check(obj, key, label, onChange) {
    const inp = h('input', { type: 'checkbox' });
    inp.checked = !!obj[key];
    inp.addEventListener('change', () => { obj[key] = inp.checked; (onChange || full)(); });
    return h('label', { class: 'check' }, inp, ' ' + label);
  }
  function select(obj, key, choices, onChange) {
    const s = h('select', { class: 'f-sel' }, ...choices.map(([v, l]) => h('option', { value: v }, l)));
    s.value = String(obj[key]);
    s.addEventListener('change', () => { const c = choices.find((x) => String(x[0]) === s.value); obj[key] = c ? c[0] : s.value; (onChange || full)(); });
    return s;
  }
  function color(obj, key, onChange, allowReset) {
    const wrap = h('div', { class: 'f-color' });
    const inp = h('input', { type: 'color', value: toHex6(obj[key]) || '#ffffff' });
    const txt = h('input', { type: 'text', class: 'f-hex', value: obj[key] || '', placeholder: allowReset ? '기본값' : '#000000', spellcheck: 'false' });
    inp.addEventListener('input', () => { obj[key] = inp.value.toUpperCase(); txt.value = obj[key]; (onChange || live)(); });
    inp.addEventListener('change', () => PF.commit());
    txt.addEventListener('change', () => {
      const v = txt.value.trim();
      if (!v && allowReset) { delete obj[key]; full(); return; }
      if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) { obj[key] = v.toUpperCase(); inp.value = toHex6(v); full(); }
      else txt.value = obj[key] || '';
    });
    wrap.append(inp, txt);
    if (allowReset) wrap.append(h('button', { class: 'mini', title: '기본값으로', onclick: () => { delete obj[key]; full(); } }, '↺'));
    return wrap;
  }
  function toHex6(v) {
    if (!v) return '';
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map((c) => c + c).join('');
    return v.slice(0, 7);
  }
  const section = (title, ...kids) => h('section', { class: 'insp-sec' }, h('h4', {}, title), ...kids);
  const btn = (label, fn, cls) => h('button', { class: 'btn sm ' + (cls || ''), onclick: fn }, label);

  /* ---------- 이미지 조정 ---------- */
  function imageControls(img) {
    const ref = img.get();
    const has = ref && PF.assets[ref.id];
    const pick = async () => {
      const [f] = await PF.pickFile('image/*');
      if (!f) return;
      const id = await PF.addImageFile(f);
      img.set({ id, x: 50, y: 50, zoom: 1 });
      full();
    };
    const box = h('div', { class: 'img-ctl' },
      h('div', { class: 'img-ctl-top' },
        h('div', { class: 'img-thumb' + (has ? '' : ' empty') }, has ? h('img', { src: PF.assets[ref.id], alt: '' }) : '없음'),
        h('div', {}, h('div', { class: 'f-lbl' }, img.label), h('div', { class: 'btns' }, btn(has ? '교체' : '올리기', pick), has ? btn('삭제', () => { img.set(null); full(); }, 'danger') : null))));
    if (has) {
      ref.x ??= 50; ref.y ??= 50; ref.zoom ??= 1;
      box.append(row('가로 위치', range(ref, 'x', 0, 100, 1)), row('세로 위치', range(ref, 'y', 0, 100, 1)), row('확대', range(ref, 'zoom', 1, 4, 0.05, null, (v) => v.toFixed(2) + '×')));
    }
    return box;
  }

  /* ---------- 목록(항목) 관리 ---------- */
  function listControls(b, L) {
    const arr = b.data[L.key];
    const box = h('div', { class: 'list-ctl' });
    arr.forEach((it, i) => {
      const r = h('div', { class: 'list-row' }, h('span', { class: 'list-title' }, (L.title ? L.title(it, i) : '항목 ' + (i + 1)) || '항목 ' + (i + 1)));
      if (L.who) r.append(select(it, 'who', L.whoBoth === false ? [['A', 'A'], ['B', 'B']] : [['A', 'A'], ['B', 'B'], ['both', '둘']]));
      r.append(
        h('button', { class: 'mini', title: '위로', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; full(); } }, '↑'),
        h('button', { class: 'mini', title: '아래로', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; full(); } }, '↓'),
        h('button', { class: 'mini danger', title: '삭제', onclick: () => { arr.splice(i, 1); full(); } }, '✕'));
      box.append(r);
    });
    box.append(btn('+ ' + L.label + ' 추가', () => { arr.push(L.make()); full(); }, 'wide'));
    return box;
  }

  /* ---------- 줄(가로 칸) 설정 ---------- */
  function rowControls(f) {
    const p = PF.project, r = f.row;
    const cols = h('div', { class: 'cols-ctl' });
    r.cols.forEach((c, i) => {
      const w = h('input', { type: 'number', min: 0.2, max: 10, step: 0.1, value: c.w, class: 'f-num' });
      w.addEventListener('change', () => { c.w = PF.clamp(+w.value || 1, 0.2, 10); full(); });
      cols.append(h('div', { class: 'col-item' + (c === f.col ? ' cur' : '') },
        h('span', {}, `${i + 1}번 칸` + (c === f.col ? ' (선택)' : '')), w, h('span', { class: 'muted' }, '비율'),
        r.cols.length > 1 ? h('button', { class: 'mini danger', title: '칸 지우기 (안의 블록은 옆 칸으로)', onclick: () => {
          const to = r.cols[i === 0 ? 1 : i - 1];
          to.blocks.push(...c.blocks);
          r.cols.splice(i, 1);
          full();
        } }, '✕') : null));
    });
    const ri = p.rows.indexOf(r);
    return section('이 블록이 있는 줄',
      h('p', { class: 'hint' }, '한 줄을 여러 칸으로 나눌 수 있어요. 숫자는 칸 너비 비율이에요.'),
      cols,
      h('div', { class: 'btns' },
        r.cols.length < 5 ? btn('+ 칸 추가', () => { r.cols.push({ id: 'c' + PF.uid(), w: 1, blocks: [] }); full(); }) : null,
        btn('칸 너비 똑같이', () => { r.cols.forEach((c) => (c.w = 1)); full(); })),
      check(r, 'fill', '칸 높이 맞추기 (마지막 블록을 늘림)'),
      row('세로 정렬', select(r, 'align', [['', '위'], ['center', '가운데'], ['end', '아래']])),
      h('div', { class: 'btns' },
        btn('줄 ↑', () => { if (ri > 0) { [p.rows[ri - 1], p.rows[ri]] = [p.rows[ri], p.rows[ri - 1]]; full(); } }),
        btn('줄 ↓', () => { if (ri < p.rows.length - 1) { [p.rows[ri + 1], p.rows[ri]] = [p.rows[ri], p.rows[ri + 1]]; full(); } }),
        btn('줄 복제', () => {
          const c = JSON.parse(JSON.stringify(r));
          c.id = 'r' + PF.uid();
          c.cols.forEach((cc) => { cc.id = 'c' + PF.uid(); cc.blocks.forEach((bb) => (bb.id = 'b' + PF.uid())); });
          p.rows.splice(ri + 1, 0, c); full();
        }),
        btn('줄 삭제', () => { if (confirm('이 줄과 안의 블록을 모두 지울까요?')) { p.rows.splice(ri, 1); PF.ui.selected = null; full(); } }, 'danger')));
  }

  /* ---------- 속성 패널 ---------- */
  /* ---------- 모바일: 선택한 블록 · 스티커 조작 막대 ---------- */
  const ibtn = (icon, title, fn, cls, disabled) => {
    const b = h('button', { title, class: cls || '', disabled: disabled || null, onclick: fn });
    b.innerHTML = PF.icon(icon);
    return b;
  };
  PF.updateSelbar = function () {
    const bar = $('#selbar');
    if (!bar) return;
    const st = PF.ui.selSticker && PF.project.stickers.find((s) => s.id === PF.ui.selSticker);
    const f = !st && PF.ui.selected && PF.findBlock(PF.ui.selected);
    if (!PF.isMobile() || PF.ui.preview || (!st && !f)) return bar.classList.add('hidden');
    const props = h('button', { class: 'props', onclick: () => PF.openSheet('props') });
    props.innerHTML = PF.icon('sliders') + '<span>속성</span>';
    if (st) {
      const arr = PF.project.stickers;
      bar.replaceChildren(h('span', { class: 'sel-name' }, '스티커'),
        ibtn('copy', '복제', () => { const c = Object.assign({}, st, { id: 's' + PF.uid(), x: st.x + 30, y: st.y + 30 }); arr.push(c); PF.ui.selSticker = c.id; full(); }),
        ibtn('trash', '삭제', () => { arr.splice(arr.indexOf(st), 1); PF.ui.selSticker = null; full(); }, 'danger'),
        props);
    } else {
      const b = f.block;
      bar.replaceChildren(h('span', { class: 'sel-name' }, PF.BLOCKS[b.type].name),
        ibtn('up', '위로', () => PF.moveBlock(b.id, -1)),
        ibtn('down', '아래로', () => PF.moveBlock(b.id, 1)),
        ibtn('left', '왼쪽 칸으로', () => PF.moveBlockCol(b.id, -1), '', f.ci === 0),
        ibtn('right', '오른쪽 칸으로', () => PF.moveBlockCol(b.id, 1), '', f.ci === f.row.cols.length - 1),
        ibtn('copy', '복제', () => PF.duplicateBlock(b.id)),
        ibtn('trash', '삭제', () => PF.deleteBlock(b.id), 'danger'),
        props);
    }
    bar.classList.remove('hidden');
  };

  /* 키워드(해시태그) 목록 */
  function tagControls(arr) {
    const box = h('div', { class: 'list-ctl' });
    arr.forEach((t, i) => {
      const txt = String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      box.append(h('div', { class: 'list-row' }, h('span', { class: 'list-title' }, txt || '(빈 키워드)'),
        h('button', { class: 'mini', title: '앞으로', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; full(); } }, '↑'),
        h('button', { class: 'mini', title: '뒤로', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; full(); } }, '↓'),
        h('button', { class: 'mini danger', title: '삭제', onclick: () => { arr.splice(i, 1); full(); } }, '✕')));
    });
    box.append(btn('+ 키워드 추가', () => { arr.push('새 키워드'); full(); }, 'wide'));
    return box;
  }

  PF.renderInspector = function () {
    const box = $('#inspector');
    box.replaceChildren();
    PF.updateSelbar();
    if (PF.ui.preview) {
      box.append(section('미리보기 중', h('p', { class: 'hint' }, '편집하려면 위쪽의 “미리보기”를 끄세요.')));
      return;
    }
    const st = PF.ui.selSticker && PF.project.stickers.find((s) => s.id === PF.ui.selSticker);
    if (st) return stickerInspector(box, st);
    const f = PF.ui.selected && PF.findBlock(PF.ui.selected);
    if (!f) return emptyInspector(box);

    const b = f.block, def = PF.BLOCKS[b.type];
    box.append(h('div', { class: 'insp-head' }, h('span', { class: 'insp-ico' }, def.icon), h('div', {}, h('b', {}, def.name), h('div', { class: 'muted sm' }, def.desc))));

    const D = b.data;
    // 새로 생긴 옵션의 기본값 채우기 (예전에 만든 블록 호환)
    (def.options || []).forEach((o) => { if (o.def !== undefined && D[o.key] === undefined) D[o.key] = o.def; });
    const pickCustom = (o) => () => {
      // “직접 정하기”를 처음 고르면 지금 보이는 높이에서 시작
      if (o.custom && D[o.key] === 'custom' && !D[o.custom]) {
        const el = PF.frameEl.querySelector(`.pf-block[data-id="${b.id}"] .pf-img`);
        D[o.custom] = el ? Math.round(el.offsetHeight) || 300 : 300;
      }
      full();
    };
    const opts = (def.options || []).filter((o) => !o.when || o.when(D)).map((o) =>
      o.type === 'check' ? check(D, o.key, o.label)
        : o.type === 'color' ? row(o.label, color(D, o.key, null, true))
        : o.type === 'select' ? row(o.label, select(D, o.key, o.choices, pickCustom(o)))
          : row(o.label, range(D, o.key, o.min, o.max, o.step, null, o.unit ? (v) => v + o.unit : null)));
    if (opts.length) box.append(section('블록 옵션', ...opts));

    const imgs = def.images ? def.images(b) : [];
    if (imgs.length) box.append(section('이미지', h('p', { class: 'hint' }, '빈 이미지 칸을 누르거나 파일을 끌어다 놓아도 돼요.'), ...imgs.map(imageControls)));

    if (def.tags && Array.isArray(b.data[def.tags]) && (def.tagsWhen ? def.tagsWhen(b) : true))
      box.append(section('키워드', h('p', { class: 'hint' }, '키워드 글자는 캔버스에서 눌러 고쳐요.'), tagControls(b.data[def.tags])));
    if (def.list) box.append(section(def.list.label, listControls(b, def.list)));

    box.append(section('카드 모양',
      row('스타일', select(b, 'style', Object.entries(PF.STYLE_LABEL))),
      row('면 색', color(b, 'bg', null, true)),
      row('테두리 색', color(b, 'border', null, true)),
      row('글자 색', color(b, 'color', null, true)),
      row('안쪽 여백', (() => { const hd = { pad: b.pad ?? PF.project.settings.cardPad }; return range(hd, 'pad', 0, 80, 1, () => { b.pad = hd.pad; live(); }); })())));

    box.append(section('블록', h('div', { class: 'btns' },
      btn('↑ 위로', () => PF.moveBlock(b.id, -1)), btn('↓ 아래로', () => PF.moveBlock(b.id, 1)),
      f.row.cols.length > 1 ? btn('← 왼쪽 칸', () => PF.moveBlockCol(b.id, -1)) : null,
      f.row.cols.length > 1 ? btn('오른쪽 칸 →', () => PF.moveBlockCol(b.id, 1)) : null,
      btn('복제', () => PF.duplicateBlock(b.id)), btn('삭제', () => PF.deleteBlock(b.id), 'danger'))));

    box.append(rowControls(f));
  };

  function emptyInspector(box) {
    const c = PF.project.chars;
    const em = h('div', { class: 'insp-empty' });
    em.innerHTML = PF.icon('sliders') + (PF.isMobile() ? '블록을 누르면 여기서 옵션·색·배치를 바꿀 수 있어요.' : '블록이나 스티커를 선택하면<br>여기서 옵션·색·배치를 바꿀 수 있어요.');
    box.append(em);
    box.append(section('캐릭터 두상',
      h('p', { class: 'hint' }, '두상은 관계도 · 프로필 · 대사 블록에서 함께 쓰여요. 이름은 캔버스에서 직접 고치면 모든 곳에 반영됩니다.'),
      ...['A', 'B'].map((w) => imageControls({ label: '캐릭터 ' + w + ' — ' + (c[w].name || '').replace(/<[^>]+>/g, ''), get: () => c[w].img, set: (r) => (c[w].img = r) }))));
    box.append(section('사용법', h('ul', { class: 'howto' },
      ...(PF.isMobile() ? [
        h('li', {}, '캔버스의 글자를 누르면 아래에 글 편집 창이 열려요. 꾸밈 막대로 글꼴·색·크기를 바꿀 수 있어요.'),
        h('li', {}, '블록을 누르면 아래 막대에서 위·아래·옆 칸으로 옮기거나 복제·삭제할 수 있어요.'),
        h('li', {}, '두 손가락으로 벌리거나 메뉴의 “화면에 맞추기”로 크기를 바꿔 보세요.'),
      ] : [
        h('li', {}, '캔버스의 글자를 눌러 바로 고치고, 드래그해서 선택하면 글자 꾸밈 막대가 나와요.'),
        h('li', {}, '블록을 누르면 이 패널에서 옵션 · 색 · 줄 나누기를 바꿀 수 있어요.'),
        h('li', {}, '⠿ 손잡이를 끌면 다른 칸이나 줄 사이로 옮겨져요.'),
      ]),
      h('li', {}, '작업은 이 브라우저에 자동 저장돼요. 다른 기기로 옮기려면 “저장 파일”을 쓰세요.'))));
  }

  function stickerInspector(box, s) {
    const arr = PF.project.stickers;
    const i = arr.indexOf(s);
    box.append(h('div', { class: 'insp-head' }, h('span', { class: 'insp-ico' }, '★'), h('div', {}, h('b', {}, '스티커'), h('div', { class: 'muted sm' }, '드래그로 이동 · 모서리로 크기 · 위 손잡이로 회전'))));
    box.append(section('조절',
      row('크기', range(s, 'w', 16, Math.max(1200, s.w), 1, null, (v) => v + 'px')),
      row('회전', range(s, 'rot', -180, 180, 1, null, (v) => v + '°')),
      row('투명도', range(s, 'opacity', 0.1, 1, 0.05, null, (v) => Math.round(v * 100) + '%')),
      row('가로 위치', range(s, 'x', -200, PF.project.settings.width + 200, 1)),
      check(s, 'flip', '좌우 뒤집기'),
      check(s, 'behind', '블록 뒤로 보내기')));
    box.append(section('순서 · 정리', h('div', { class: 'btns' },
      btn('맨 앞으로', () => { arr.splice(i, 1); arr.push(s); full(); }),
      btn('맨 뒤로', () => { arr.splice(i, 1); arr.unshift(s); full(); }),
      btn('복제', () => { const c = Object.assign({}, s, { id: 's' + PF.uid(), x: s.x + 30, y: s.y + 30 }); arr.push(c); PF.ui.selSticker = c.id; full(); }),
      btn('삭제', () => { arr.splice(i, 1); PF.ui.selSticker = null; full(); }, 'danger'))));
  }

  /* ---------- 디자인 탭 ---------- */
  PF.renderDesign = function () {
    const box = $('#design-body');
    box.replaceChildren();
    const s = PF.project.settings, t = s.theme;
    const themeChange = () => { PF.render(true); PF.refreshRichBar(); PF.commitSoon(); };

    box.append(section('색 조합 프리셋', h('div', { class: 'presets' }, ...Object.entries(PF.PRESETS).map(([name, pr]) =>
      h('button', { class: 'preset', title: name, onclick: () => { Object.assign(t, pr); full(); PF.renderDesign(); PF.refreshRichBar(); } },
        h('span', { class: 'preset-sw' }, ...['bg', 'card', 'accentA', 'accentB', 'highlight'].map((k) => h('i', { style: { background: pr[k] } }))), name)))));

    box.append(section('색 직접 고르기', ...PF.THEME_KEYS.map(([k, label]) => row(label, color(t, k, themeChange)))));

    box.append(section('크기 · 모양',
      row('가로 폭', (() => {
        const n = h('input', { type: 'number', class: 'f-num wide', min: 480, max: 4000, step: 10, value: s.width });
        n.addEventListener('change', () => { s.width = PF.clamp(+n.value || 1200, 480, 4000); n.value = s.width; full(); });
        return h('div', { class: 'f-inline' }, n, h('span', { class: 'muted' }, 'px'), ...[1000, 1200, 1600, 2000].map((w) => h('button', { class: 'mini', onclick: () => { s.width = w; n.value = w; full(); } }, w)));
      })()),
      row(s.borderMode === 'page' || s.borderMode === 'both' ? '테두리 안 여백' : '바깥 여백', range(s, 'pad', 0, 160, 2, null, (v) => v + 'px')),
      row('블록 간격', range(s, 'gap', 0, 80, 1, null, (v) => v + 'px')),
      row('카드 안쪽 여백', range(s, 'cardPad', 0, 80, 1, () => {
        PF.project.rows.forEach((r) => r.cols.forEach((c) => c.blocks.forEach((b) => delete b.pad)));
        live();
      }, (v) => v + 'px')),
      row('모서리 둥글기', range(s, 'radius', 0, 60, 1, null, (v) => v + 'px')),
      row('블록 테두리', range(s, 'borderWidth', 0, 8, 0.5, null, (v) => v + 'px'))));

    /* 테두리 방식 */
    const redo = () => { full(); PF.renderDesign(); };
    const pg = s.page, hasPage = s.borderMode === 'page' || s.borderMode === 'both';
    const borderSec = section('테두리',
      row('테두리 방식', select(s, 'borderMode', [['block', '블록마다 테두리'], ['page', '페이지 전체를 감싸기'], ['both', '둘 다'], ['none', '테두리 없음']], redo)),
      check(s, 'clearBlocks', '블록 면 색 없애기 (배경이 비쳐 보이게)', redo));
    if (hasPage)
      borderSec.append(
        row('두께', range(pg, 'width', 0.5, 16, 0.5, null, (v) => v + 'px')),
        row('색', color(pg, 'color', null, true)),
        row('둥글기', range(pg, 'radius', 0, 120, 1, null, (v) => v + 'px')),
        row('바깥 간격', range(pg, 'inset', 0, 160, 2, null, (v) => v + 'px')),
        row('안쪽 면', select(pg, 'fill', [['none', '비움 (배경 그대로)'], ['card', '카드 면 색'], ['bg', '바탕 색']])),
        h('p', { class: 'hint' }, '“바깥 간격”은 페이지 끝에서 테두리까지, “테두리 안 여백”(위 크기 · 모양)은 테두리에서 블록까지의 거리예요.'));
    box.append(borderSec);

    /* 배경 */
    const bg = s.bg;
    const bgSec = section('배경', row('종류', select(bg, 'type', [['solid', '단색 (바탕 색)'], ['gradient', '그라데이션'], ['image', '이미지']], redo)));
    const POS = [['center', '가운데'], ['top', '위'], ['bottom', '아래'], ['left', '왼쪽'], ['right', '오른쪽'], ['top left', '왼쪽 위'], ['top right', '오른쪽 위'], ['bottom left', '왼쪽 아래'], ['bottom right', '오른쪽 아래']];
    if (bg.type === 'solid') bgSec.append(h('p', { class: 'hint' }, '“색 직접 고르기”의 바탕 색이 쓰여요.'));
    if (bg.type === 'gradient') {
      bgSec.append(
        row('모양', select(bg, 'kind', [['linear', '직선'], ['radial', '원형']], redo)),
        row('색 1', color(bg, 'g1')),
        row('색 2', color(bg, 'g2')),
        check(bg, 'useG3', '색 하나 더 쓰기', redo));
      if (bg.useG3) bgSec.append(row('색 3', color(bg, 'g3')));
      bgSec.append(bg.kind === 'radial' ? row('중심', select(bg, 'pos', POS)) : row('각도', range(bg, 'angle', 0, 360, 1, null, (v) => v + '°')));
      bgSec.append(h('div', { class: 'btns' }, btn('색 1 ↔ 색 2', () => { [bg.g1, bg.g2] = [bg.g2, bg.g1]; redo(); }), btn('테마 색으로', () => { Object.assign(bg, { g1: t.bg, g2: t.tagBg, g3: t.card }); redo(); })));
    }
    if (bg.type === 'image') {
      const has = bg.img && PF.assets[bg.img];
      bgSec.append(
        h('div', { class: 'img-ctl-top' },
          h('div', { class: 'img-thumb' + (has ? '' : ' empty') }, has ? h('img', { src: PF.assets[bg.img], alt: '' }) : '없음'),
          h('div', { class: 'btns' },
            btn(has ? '교체' : '이미지 올리기', async () => {
              const [f] = await PF.pickFile('image/*');
              if (!f) return;
              bg.img = await PF.addImageFile(f, 3200);
              redo();
            }),
            has ? btn('삭제', () => { bg.img = null; redo(); }, 'danger') : null)));
      if (has)
        bgSec.append(
          row('채우기', select(bg, 'fit', [['cover', '꽉 채우기'], ['contain', '전체 보이기'], ['tile', '바둑판 반복']], redo)),
          bg.fit === 'tile' ? row('반복 크기', range(bg, 'tile', 40, 1600, 10, null, (v) => v + 'px')) : null,
          row('위치', select(bg, 'pos', POS)),
          row('진하기', range(bg, 'opacity', 0.05, 1, 0.05, null, (v) => Math.round(v * 100) + '%')),
          h('p', { class: 'hint' }, '진하기를 낮추면 “바탕 색”이 비쳐서 이미지가 연해져요.'));
    }
    box.append(bgSec);

    const fonts = PF.fontList().map((f) => [f.family, f.label]);
    const fontsSec = section('글꼴',
      row('제목 글꼴', select(s.fonts, 'title', fonts)),
      row('본문 글꼴', select(s.fonts, 'body', fonts)),
      h('p', { class: 'hint' }, '글자 일부만 바꾸고 싶다면 캔버스에서 글자를 선택한 뒤 꾸밈 막대의 “글꼴”을 쓰세요.'));
    const customList = h('div', { class: 'font-list' });
    (s.fonts.custom || []).forEach((c, i) =>
      customList.append(h('div', { class: 'list-row' }, h('span', { class: 'list-title', style: { fontFamily: `'${c.name}'` } }, c.name + ' 가나다 Abc'),
        h('button', { class: 'mini danger', onclick: () => { s.fonts.custom.splice(i, 1); PF.applyCustomFonts(); full(); PF.renderDesign(); PF.refreshRichBar(); } }, '✕'))));
    const cssArea = h('textarea', { class: 'f-area', rows: 4, placeholder: "@font-face {\n  font-family: 'MyFont';\n  src: url('https://...woff2') format('woff2');\n}" });
    fontsSec.append(
      h('h5', {}, '내 글꼴 추가'),
      customList,
      h('label', { class: 'btn sm wide file-btn' }, '글꼴 파일 올리기 (ttf · otf · woff · woff2)',
        h('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2', hidden: true, onchange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 12e6) return PF.toast('12MB 이하의 글꼴 파일만 넣을 수 있어요');
          const url = await PF.readFile(file);
          const name = (prompt('글꼴 이름을 정해 주세요', file.name.replace(/\.[^.]+$/, '')) || '').trim().replace(/['"]/g, '');
          if (!name) return;
          s.fonts.custom.push({ name, kind: 'file', asset: PF.addAsset(url) });
          PF.applyCustomFonts(); full(); PF.renderDesign(); PF.refreshRichBar();
          PF.toast('“' + name + '” 글꼴을 추가했어요');
        } })),
      h('p', { class: 'hint' }, '또는 눈누 등에서 복사한 웹폰트 CSS(@font-face)를 붙여 넣으세요.'),
      cssArea,
      btn('CSS로 글꼴 추가', () => {
        const css = cssArea.value.replace(/<\/?style[^>]*>/gi, '').trim();
        const names = [...css.matchAll(/font-family\s*:\s*['"]?([^;'"}]+)['"]?/gi)].map((m) => m[1].trim());
        if (!names.length) return PF.toast('font-family 이름을 찾지 못했어요');
        const uniq = [...new Set(names)];
        uniq.forEach((name, i) => s.fonts.custom.push(i === 0 ? { name, kind: 'css', css } : { name, kind: 'css', css: '' }));
        PF.applyCustomFonts(); full(); PF.renderDesign(); PF.refreshRichBar();
        PF.toast(uniq.join(', ') + ' 글꼴을 추가했어요');
      }, 'wide'));
    box.append(fontsSec);
  };
})();
