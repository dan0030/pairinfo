/* 블록 종류 정의 + 템플릿 */
(function () {
  const { h, uid } = PF;
  const B = (PF.BLOCKS = {});
  const chars = () => PF.project.chars;
  const ed = (...a) => PF.ed(...a);
  const charName = (who, cls) => ed(chars()[who], 'name', { cls: cls || 'pf-name', ph: '이름', shared: true });
  const who = (w) => (w === 'B' ? 'B' : 'A');

  const WHO_CHOICES = [['A', '캐릭터 A'], ['B', '캐릭터 B']];
  const RATIOS = [['auto', '원본 비율'], ['1/1', '1:1'], ['4/3', '4:3'], ['3/4', '3:4'], ['6/5', '6:5'], ['16/9', '16:9'], ['9/16', '9:16'], ['3/1', '3:1 (와이드)']];

  function heading(d, opts = {}) {
    const wrap = h('div', { class: 'pf-head' + (opts.cls ? ' ' + opts.cls : '') });
    wrap.append(ed(d, 'title', { cls: 'pf-h2', ph: opts.ph || '제목' }));
    if (d.sub !== undefined) wrap.append(ed(d, 'sub', { cls: 'pf-label inline', ph: 'SUB TITLE' }));
    return wrap;
  }

  function tagList(arr, opts = {}) {
    const box = h('div', { class: 'pf-tags' + (opts.hash ? ' hash' : '') + (opts.cls ? ' ' + opts.cls : '') });
    arr.forEach((t, i) => {
      const holder = { v: t };
      const el = ed(holder, 'v', { cls: 'pf-tag', ph: '키워드', tag: 'span' });
      el._set = (v) => (arr[i] = v);
      el.addEventListener('blur', () => {
        if (!el.textContent.trim() && arr.length > 0) {
          arr.splice(i, 1);
          PF.commit();
          PF.render();
        }
      });
      box.append(el);
    });
    box.append(
      PF.chromeBtn('+ 태그', () => {
        arr.push('새 키워드');
        PF.commit();
        PF.render();
      })
    );
    return box;
  }

  function addItemBtn(arr, make, label) {
    return PF.chromeBtn(label || '+ 항목 추가', () => {
      arr.push(make());
      PF.commit();
      PF.render();
    }, 'pf-add-item');
  }

  /* ===== 공통 ===== */
  B.title = {
    name: '페어명', icon: '𝐓', desc: '페어 이름 · 캐치프레이즈 · 페어 키워드',
    create: () => ({ label: 'PAIR NAME', title: '페어 이름', sub: '', align: 'left', showTags: true, hash: true, tags: ['키워드', '키워드', '키워드'] }),
    options: [
      { key: 'align', label: '정렬', type: 'select', choices: [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] },
      { key: 'showTags', label: '페어 키워드(해시태그)', type: 'check' },
      { key: 'hash', label: '# 자동으로 붙이기', type: 'check' },
    ],
    render(b) {
      const d = b.data;
      if (d.showTags && !Array.isArray(d.tags)) d.tags = [];
      return h('div', { class: 'pf-title-block', style: { textAlign: d.align } },
        ed(d, 'label', { cls: 'pf-label', ph: 'LABEL' }),
        ed(d, 'title', { cls: 'pf-title-xl', ph: '페어 이름' }),
        ed(d, 'sub', { cls: 'pf-sub', ph: '부제 / 한 줄 소개 (비워두면 안 보여요)' }),
        d.showTags ? tagList(d.tags, { hash: d.hash, cls: 'pill align-' + d.align }) : null);
    },
  };

  B.character = {
    name: '캐릭터 프로필', icon: '☺', desc: '두상 · 이름 · 키워드 · 간략 프로필',
    create: (w = 'A') => ({
      who: w, label: 'CHARACTER ' + w, ratio: '6/5', showImg: true, showTags: true, showProfile: true, showFields: true,
      tags: ['#키워드', '#키워드'],
      profile: '',
      fields: [{ k: '소속', v: '' }, { k: '상징', v: '' }],
    }),
    defStyle: 'accent',
    options: [
      { key: 'who', label: '캐릭터', type: 'select', choices: WHO_CHOICES },
      { key: 'ratio', label: '두상 비율', type: 'select', choices: RATIOS },
      { key: 'showImg', label: '두상 이미지', type: 'check' },
      { key: 'showTags', label: '프로필 키워드', type: 'check' },
      { key: 'showProfile', label: '간략 프로필 글', type: 'check' },
      { key: 'showFields', label: '항목 표 (소속/상징 등)', type: 'check' },
    ],
    list: { key: 'fields', label: '항목 표', make: () => ({ k: '항목', v: '' }), title: (it) => it.k },
    images: (b) => [{ label: '캐릭터 ' + who(b.data.who) + ' 두상', get: () => chars()[who(b.data.who)].img, set: (r) => (chars()[who(b.data.who)].img = r) }],
    render(b) {
      const d = b.data, w = who(d.who);
      const el = h('div', { class: 'pf-char who-' + w });
      if (d.showImg) el.append(PF.imgSlot(chars()[w].img, (r) => (chars()[w].img = r), { cls: 'pf-char-img', ratio: d.ratio, ph: '두상 이미지' }));
      el.append(ed(d, 'label', { cls: 'pf-label acc', ph: 'CHARACTER' }), charName(w, 'pf-name'));
      if (d.showTags) el.append(tagList(d.tags, { cls: 'pill' }));
      if (d.showProfile) el.append(ed(d, 'profile', { cls: 'pf-body pf-profile', ph: '간략 프로필 (나이, 소속, 성격 등)' }));
      if (d.showFields) {
        const t = h('div', { class: 'pf-fields' });
        d.fields.forEach((f) => t.append(h('div', { class: 'pf-field' }, ed(f, 'k', { cls: 'pf-field-k', ph: '항목' }), ed(f, 'v', { cls: 'pf-field-v', ph: '내용' }))));
        t.append(addItemBtn(d.fields, () => ({ k: '항목', v: '' }), '+ 항목'));
        el.append(t);
      }
      return el;
    },
  };

  B.relation = {
    name: '관계도 화살표', icon: '⇄', desc: '두 사람의 두상과 서로를 향한 인상 · 호칭',
    create: () => ({
      showImg: true, avatar: 150, subA: '', subB: '', dashed: false, shape: 'circle', noImg: 'initial', noImgFill: 'tint', symA: '☾', symB: '☆',
      aTop: 'A가 B에게 느끼는 인상', aBottom: '“호칭”', bTop: 'B가 A에게 느끼는 인상', bBottom: '“호칭”',
    }),
    options: [
      { key: 'showImg', label: '두상 이미지', type: 'check' },
      { key: 'shape', label: '두상 모양', type: 'select', choices: [['circle', '원형'], ['rounded', '둥근 사각'], ['square', '사각']] },
      { key: 'avatar', label: '두상 크기', type: 'range', min: 60, max: 280, step: 2 },
      { key: 'noImg', label: '두상이 없을 때', type: 'select', choices: [['initial', '이름 첫 글자'], ['symbol', '직접 쓴 글자·기호'], ['blank', '빈 원만'], ['hide', '원 숨기고 이름만']] },
      { key: 'noImgFill', label: '빈 원 색', type: 'select', choices: [['tint', '연한 캐릭터 색'], ['solid', '캐릭터 색 (흰 글자)'], ['line', '테두리만']] },
      { key: 'dashed', label: '점선 화살표', type: 'check' },
    ],
    images: () => ['A', 'B'].map((w) => ({ label: '캐릭터 ' + w + ' 두상', get: () => chars()[w].img, set: (r) => (chars()[w].img = r) })),
    render(b) {
      const d = b.data;
      const person = (w) =>
        h('div', { class: 'pf-rel-person who-' + w },
          d.showImg ? avatarSlot(d, w) : null,
          charName(w, 'pf-name sm'),
          ed(d, 'sub' + w, { cls: 'pf-small muted', ph: '한 줄 설명' }));
      const arrow = (dir, top, bottom, w) =>
        h('div', { class: 'pf-arrow ' + dir + ' who-' + w + (d.dashed ? ' dashed' : '') },
          ed(d, top, { cls: 'pf-arrow-text top', ph: '화살표 위 글' }),
          h('div', { class: 'pf-arrow-line' }, h('i')),
          ed(d, bottom, { cls: 'pf-arrow-text bottom', ph: '화살표 아래 글' }));
      return h('div', { class: 'pf-rel' }, person('A'),
        h('div', { class: 'pf-rel-arrows' }, arrow('to-right', 'aTop', 'aBottom', 'A'), arrow('to-left', 'bTop', 'bBottom', 'B')),
        person('B'));
    },
  };

  /* 관계도 두상: 이미지가 없을 때 대신 보여줄 것 */
  function avatarSlot(d, w) {
    const ref = chars()[w].img;
    const has = ref && PF.assets[ref.id];
    const mode = d.noImg || 'initial';
    const o = { cls: 'pf-avatar shape-' + d.shape + ' fill-' + (d.noImgFill || 'tint'), ratio: '1/1', ph: '두상', style: { width: d.avatar + 'px' } };
    if (!has) {
      if (mode === 'hide') o.cls += ' edit-only';
      if (mode === 'initial') {
        const tmp = document.createElement('div');
        tmp.innerHTML = chars()[w].name || '';
        const ch = Array.from(tmp.textContent.trim())[0] || '?';
        o.empty = h('span', { class: 'pf-avatar-text', 'data-init': w, style: { fontSize: Math.round(d.avatar * 0.42) + 'px' } }, ch);
      } else if (mode === 'symbol') {
        o.empty = ed(d, 'sym' + w, { cls: 'pf-avatar-text', ph: '글자', tag: 'span' });
        o.empty.style.fontSize = Math.round(d.avatar * 0.36) + 'px';
      }
    }
    return PF.imgSlot(ref, (r) => (chars()[w].img = r), o);
  }

  B.summary = {
    name: '페어 요약', icon: '❝', desc: '굵은 글씨 요약 + 작은 글씨 세부 설명',
    create: () => ({ label: 'PAIR MOOD', showLabel: true, lead: '두 사람을 한 줄로 소개해 주세요.', detail: '세부 설명을 작은 글씨로 적어 주세요.' }),
    options: [{ key: 'showLabel', label: '라벨 보이기', type: 'check' }],
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-summary' },
        d.showLabel ? ed(d, 'label', { cls: 'pf-label', ph: 'LABEL' }) : null,
        ed(d, 'lead', { cls: 'pf-lead', ph: '굵은 글씨 요약' }),
        ed(d, 'detail', { cls: 'pf-body muted', ph: '세부 설명' }));
    },
  };

  B.hashtags = {
    name: '페어 키워드', icon: '#', desc: '해시태그 형식 키워드',
    create: () => ({ label: 'KEYWORD', showLabel: true, auto: true, tags: ['키워드', '키워드', '키워드'], size: 'md', align: 'left' }),
    options: [
      { key: 'showLabel', label: '라벨 보이기', type: 'check' },
      { key: 'auto', label: '# 자동으로 붙이기', type: 'check' },
      { key: 'size', label: '크기', type: 'select', choices: [['sm', '작게'], ['md', '보통'], ['lg', '크게']] },
      { key: 'align', label: '정렬', type: 'select', choices: [['left', '왼쪽'], ['center', '가운데']] },
    ],
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-hashtags size-' + d.size, style: { textAlign: d.align } },
        d.showLabel ? ed(d, 'label', { cls: 'pf-label', ph: 'LABEL' }) : null,
        tagList(d.tags, { hash: d.auto, cls: 'pill align-' + d.align }));
    },
  };

  /* ===== 상세용 ===== */
  B.heading = {
    name: '소제목', icon: 'H', desc: '서사 제목 · 섹션 제목',
    create: () => ({ title: '서사 제목', sub: 'STORY', align: 'left', big: false }),
    options: [
      { key: 'align', label: '정렬', type: 'select', choices: [['left', '왼쪽'], ['center', '가운데']] },
      { key: 'big', label: '크게', type: 'check' },
    ],
    defStyle: 'plain',
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-heading' + (d.big ? ' big' : ''), style: { justifyContent: d.align === 'center' ? 'center' : 'flex-start', textAlign: d.align } },
        ed(d, 'title', { cls: d.big ? 'pf-title-xl' : 'pf-h2', ph: '제목' }), ed(d, 'sub', { cls: 'pf-label inline', ph: 'SUB' }));
    },
  };

  B.text = {
    name: '글 상자', icon: '¶', desc: '세계관 설명 등 자유로운 글',
    create: (title = '세계관', sub = 'WORLD', body = '두 사람이 살아가는 세계에 대해 간단히 적어 주세요.') => ({ title, sub, body, showHead: true }),
    options: [{ key: 'showHead', label: '제목 보이기', type: 'check' }],
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-text' }, d.showHead ? heading(d) : null, ed(d, 'body', { cls: 'pf-body', ph: '내용' }));
    },
  };

  B.image = {
    name: '페어 이미지', icon: '▣', desc: '두 사람이 함께 있는 이미지',
    create: () => ({ img: null, ratio: '4/3', caption: '', showCaption: true }),
    options: [
      { key: 'ratio', label: '비율', type: 'select', choices: RATIOS },
      { key: 'showCaption', label: '캡션', type: 'check' },
    ],
    images: (b) => [{ label: '이미지', get: () => b.data.img, set: (r) => (b.data.img = r) }],
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-image' },
        PF.imgSlot(d.img, (r) => (d.img = r), { cls: 'pf-pic', ratio: d.ratio, ph: '페어 이미지' }),
        d.showCaption ? ed(d, 'caption', { cls: 'pf-caption', ph: '캡션' }) : null);
    },
  };

  B.gallery = {
    name: '이미지 모음', icon: '▦', desc: '상징물·분위기 이미지 여러 장',
    create: () => ({ title: '상징물과 분위기', sub: 'SYMBOL & MOOD', showHead: true, ratio: '16/9', note: '', items: [0, 1, 2].map(() => ({ img: null, caption: '캡션' })) }),
    options: [
      { key: 'showHead', label: '제목 보이기', type: 'check' },
      { key: 'ratio', label: '비율', type: 'select', choices: RATIOS.filter((r) => r[0] !== 'auto') },
    ],
    list: { key: 'items', label: '이미지', make: () => ({ img: null, caption: '캡션' }), title: (it, i) => '이미지 ' + (i + 1) },
    images: (b) => b.data.items.map((it, i) => ({ label: '이미지 ' + (i + 1), get: () => it.img, set: (r) => (it.img = r) })),
    render(b) {
      const d = b.data;
      const grid = h('div', { class: 'pf-gallery', style: { gridTemplateColumns: `repeat(${Math.max(1, d.items.length)}, 1fr)` } });
      d.items.forEach((it) => grid.append(h('figure', {}, PF.imgSlot(it.img, (r) => (it.img = r), { cls: 'pf-pic', ratio: d.ratio, ph: '이미지' }), ed(it, 'caption', { cls: 'pf-caption strong', ph: '캡션' }))));
      return h('div', {}, d.showHead ? heading(d) : null, grid, ed(d, 'note', { cls: 'pf-caption center muted', ph: '설명 한 줄 (비워두면 안 보여요)' }), addItemBtn(d.items, () => ({ img: null, caption: '캡션' }), '+ 이미지 칸'));
    },
  };

  B.timeline = {
    name: '서사 타임라인', icon: '⋮', desc: '서사 제목 + 시간 순서대로 정리',
    create: () => ({
      title: '서사 제목', sub: 'STORY', showHead: true, intro: '', style: 'line',
      items: [
        { when: '과거', title: '첫 만남', body: '두 사람이 처음 만난 순간.', who: 'both' },
        { when: '현재', title: '엇갈림', body: '서로를 바라보지만 어긋나는 시간.', who: 'A' },
        { when: '미래', title: '그리고', body: '이제라도 확신을 주고자 한다.', who: 'B' },
      ],
    }),
    options: [
      { key: 'showHead', label: '제목 보이기', type: 'check' },
      { key: 'style', label: '모양', type: 'select', choices: [['line', '세로선 타임라인'], ['cards', '번호 카드'], ['steps', '가로 단계']] },
    ],
    list: { key: 'items', label: '서사 항목', make: () => ({ when: '시점', title: '사건', body: '', who: 'both' }), title: (it) => it.title.replace(/<[^>]+>/g, ''), who: true },
    render(b) {
      const d = b.data;
      const list = h('div', { class: 'pf-timeline style-' + d.style });
      d.items.forEach((it, i) => {
        const tag = d.style === 'cards' ? h('div', { class: 'pf-badge' }, String(i + 1).padStart(2, '0')) : null;
        list.append(
          h('div', { class: 'pf-tl-item who-' + (it.who || 'both') },
            d.style === 'cards' ? tag : ed(it, 'when', { cls: 'pf-tl-when', ph: '시점' }),
            h('div', { class: 'pf-tl-dot' }, h('i')),
            h('div', { class: 'pf-tl-body' },
              h('div', { class: 'pf-tl-head' }, ed(it, 'title', { cls: 'pf-h3', ph: '사건 제목' }), d.style === 'cards' ? ed(it, 'when', { cls: 'pf-small muted', ph: '부제' }) : null),
              ed(it, 'body', { cls: 'pf-body', ph: '내용' }))));
      });
      return h('div', {}, d.showHead ? heading(d, { ph: '서사 제목' }) : null, ed(d, 'intro', { cls: 'pf-body muted pf-intro', ph: '서사 도입부 (비워두면 안 보여요)' }), list, addItemBtn(d.items, () => ({ when: '시점', title: '사건', body: '', who: 'both' })));
    },
  };

  B.music = {
    name: '테마곡', icon: '♪', desc: '앨범 커버 · 곡 정보 · 가사',
    create: () => ({ label: 'THEME SONG', cover: null, song: '곡 제목', artist: '아티스트', lyrics: '인상 깊은 가사를 적어 주세요.', layout: 'side', showPlayer: true }),
    options: [
      { key: 'layout', label: '배치', type: 'select', choices: [['side', '커버 옆에 가사'], ['stack', '가사를 아래로']] },
      { key: 'showPlayer', label: '재생바 장식', type: 'check' },
    ],
    images: (b) => [{ label: '앨범 커버', get: () => b.data.cover, set: (r) => (b.data.cover = r) }],
    render(b) {
      const d = b.data;
      const info = h('div', { class: 'pf-music-info' },
        ed(d, 'label', { cls: 'pf-label', ph: 'LABEL' }),
        ed(d, 'song', { cls: 'pf-h2', ph: '곡 제목' }),
        ed(d, 'artist', { cls: 'pf-body muted', ph: '아티스트' }),
        d.showPlayer ? h('div', { class: 'pf-player' }, h('span', { class: 'pf-ico' }, '◀◀'), h('span', { class: 'pf-ico play' }, '❚❚'), h('span', { class: 'pf-ico' }, '▶▶'), h('div', { class: 'pf-bar' }, h('i'))) : null);
      const lyr = ed(d, 'lyrics', { cls: 'pf-lyrics', ph: '가사' });
      return h('div', { class: 'pf-music layout-' + d.layout },
        PF.imgSlot(d.cover, (r) => (d.cover = r), { cls: 'pf-cover', ratio: '1/1', ph: '앨범 커버' }),
        h('div', { class: 'pf-music-main' }, info, d.layout === 'side' ? lyr : null),
        d.layout === 'stack' ? lyr : null);
    },
  };

  B.quotes = {
    name: '대표 대사', icon: '💬', desc: '말풍선 형식의 대사',
    create: () => ({ showAvatar: true, showName: true, items: [{ who: 'A', text: '대사를 적어 주세요.' }, { who: 'B', text: '대사를 적어 주세요.' }] }),
    options: [
      { key: 'showAvatar', label: '두상 보이기', type: 'check' },
      { key: 'showName', label: '이름 보이기', type: 'check' },
    ],
    list: { key: 'items', label: '대사', make: () => ({ who: 'A', text: '' }), title: (it) => it.text.replace(/<[^>]+>/g, '').slice(0, 14) || '(빈 대사)', who: true, whoBoth: false },
    render(b) {
      const d = b.data;
      const box = h('div', { class: 'pf-quotes' });
      d.items.forEach((it) => {
        const w = who(it.who);
        box.append(
          h('div', { class: 'pf-quote who-' + w + (w === 'B' ? ' right' : '') },
            d.showAvatar ? PF.imgSlot(chars()[w].img, (r) => (chars()[w].img = r), { cls: 'pf-avatar sm shape-circle', ratio: '1/1', ph: '' }) : null,
            h('div', { class: 'pf-quote-main' },
              d.showName ? charName(w, 'pf-small strong acc') : null,
              ed(it, 'text', { cls: 'pf-bubble', ph: '대사' }))));
      });
      box.append(addItemBtn(d.items, () => ({ who: d.items.length && d.items[d.items.length - 1].who === 'A' ? 'B' : 'A', text: '' }), '+ 대사 추가'));
      return box;
    },
  };

  B.yesno = {
    name: '선호 / 기피', icon: '±', desc: '좋아하는 요소와 피하는 요소',
    create: () => ({ yesT: 'YES: 선호하는 요소', yes: '선호하는 요소를 적어 주세요.', noT: 'NO: 기피하는 요소', no: '기피하는 요소를 적어 주세요.' }),
    defStyle: 'plain',
    render(b) {
      const d = b.data;
      return h('div', { class: 'pf-yesno' },
        h('div', { class: 'pf-yn who-A' }, ed(d, 'yesT', { cls: 'pf-h3 acc', ph: 'YES' }), ed(d, 'yes', { cls: 'pf-body', ph: '내용' })),
        h('div', { class: 'pf-yn who-B' }, ed(d, 'noT', { cls: 'pf-h3 acc', ph: 'NO' }), ed(d, 'no', { cls: 'pf-body', ph: '내용' })));
    },
  };

  B.spacer = {
    name: '여백 / 구분선', icon: '—', desc: '빈 공간 또는 선',
    create: () => ({ height: 24, line: false }),
    defStyle: 'plain',
    options: [
      { key: 'height', label: '높이', type: 'range', min: 0, max: 200, step: 2 },
      { key: 'line', label: '구분선', type: 'check' },
    ],
    render(b) {
      return h('div', { class: 'pf-spacer' + (b.data.line ? ' line' : ''), style: { height: b.data.height + 'px' } });
    },
  };

  PF.PALETTE = [
    ['간략·상세 공통', ['title', 'relation', 'summary', 'character', 'hashtags']],
    ['상세', ['heading', 'text', 'image', 'timeline', 'music', 'quotes']],
    ['꾸미기', ['gallery', 'yesno', 'spacer']],
  ];

  /* ===== 블록 · 줄 만들기 ===== */
  PF.makeBlock = function (type, ...args) {
    const def = B[type];
    return { id: 'b' + uid(), type, style: def.defStyle || 'card', data: def.create(...args) };
  };
  PF.makeRow = (cols, widths) => ({ id: 'r' + uid(), fill: true, cols: cols.map((blocks, i) => ({ id: 'c' + uid(), w: (widths && widths[i]) || 1, blocks: blocks.filter(Boolean) })) });

  /* ===== 템플릿 ===== */
  PF.TEMPLATES = {
    simple: {
      name: '간략 페어틀',
      desc: '페어명 · 관계도 · 두상 · 요약 · 키워드',
      make() {
        const s = PF.defaultSettings(1100);
        const t = PF.makeBlock('title');
        t.data.align = 'center';
        t.data.label = 'PAIR';
        const rel = PF.makeBlock('relation');
        const sum = PF.makeBlock('summary');
        return {
          settings: s,
          chars: { A: { name: '캐릭터 A', img: null }, B: { name: '캐릭터 B', img: null } },
          rows: [PF.makeRow([[t]]), PF.makeRow([[rel]]), PF.makeRow([[sum]])],
          stickers: [],
          stickerLib: [],
        };
      },
    },
    detail: {
      name: '상세 페어틀',
      desc: '프로필 · 관계도 · 세계관 · 서사 타임라인 · 테마곡 · 대사',
      make() {
        const s = PF.defaultSettings(1600);
        const t = PF.makeBlock('title');
        t.data.label = 'PAIR CATCHPHRASE';
        const rel = PF.makeBlock('relation');
        rel.data.avatar = 130;
        const world = PF.makeBlock('text');
        const img = PF.makeBlock('image');
        const sum = PF.makeBlock('summary');
        const tl = PF.makeBlock('timeline');
        const mus = PF.makeBlock('music');
        const q = PF.makeBlock('quotes');
        return {
          settings: s,
          chars: { A: { name: '캐릭터 A', img: null }, B: { name: '캐릭터 B', img: null } },
          rows: [
            PF.makeRow([[t]]),
            PF.makeRow([[PF.makeBlock('character', 'A')], [PF.makeBlock('character', 'B')], [rel, world]], [1, 1, 1.6]),
            PF.makeRow([[img, sum], [tl]], [1, 1.5]),
            PF.makeRow([[mus], [q]], [1.2, 1]),
          ],
          stickers: [],
          stickerLib: [],
        };
      },
    },
  };
})();
