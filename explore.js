/* 데이트핏 · 경상권 탐색
   소상공인시장진흥공단 상가(상권)정보(2026-09-30 기준)로 경상권 75개 시군구의 도보 데이트 코스를 자동으로 짭니다.
   - 영업시간은 공공데이터에 없어요. 팀이 확인한 가게(data/verified.json)만 "확인됨" 배지를 붙이고, 나머지는 "영업시간 확인!"을 표시해요.
   - 카카오·네이버 지도는 검색 링크로만 연결하고 응답을 저장하지 않아요.
   - 휴대폰 위치(GPS)는 쓰지 않아요. 지역은 직접 고릅니다. */
const XR = 'data/sbiz/';
const XV = '20261128d'; // 데이터나 이 파일을 바꾸면 값도 바꿔 주세요(브라우저 캐시 갱신)
const REPORT_URL = ''; // 휴무 신고용 구글폼 주소를 넣으면 신고 버튼이 그 폼을 엽니다. 비어 있으면 신고 내용을 복사합니다.
const X = {idx: null, files: {}, V: null, sido: '경상남도', sgg: '경상남도_진주시.json', loading: false, err: null};
const XG = ['식사', '카페', '디저트', '술', '놀거리', '체험', '소품·서점', '꽃집', '숙박'];
const XGC = {'식사': '#FFD9B8', '카페': '#E9DCC9', '디저트': '#FBD3DF', '술': '#D9D3F5', '놀거리': '#CDEBDD', '체험': '#CDEBDD', '소품·서점': '#F6E7B0', '꽃집': '#FBD3DF', '숙박': '#E2E2E2'};
const XGI = {'식사': 'food', '카페': 'cafe', '디저트': 'cafe', '술': 'bar', '놀거리': 'game', '체험': 'craft', '소품·서점': 'bag', '꽃집': 'star', '숙박': 'home'};
const XT = {lunch: ['점심', [['식사'], ['카페', '디저트'], ['놀거리', '체험', '소품·서점', '-']]],
            afternoon: ['오후', [['놀거리', '체험', '소품·서점'], ['카페', '디저트'], ['식사']]],
            evening: ['저녁', [['식사'], ['놀거리', '체험', '-'], ['술', '디저트']]]};
const XLOW = new Set(['백반/한정식', '김밥/만두/분식', '치킨', '국/탕/찌개류', '중국집', '피자', '버거', '떡/한과', '복권 발행/판매업', 'PC방', '노래방']);
const XSIDO = ['부산광역시', '대구광역시', '울산광역시', '경상북도', '경상남도'];
const xshort = s => s.replace('광역시', '').replace('경상북도', '경북').replace('경상남도', '경남');

(function () {
  const st = document.createElement('style');
  st.textContent = `.xspot{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border-radius:22px;background:var(--card);box-shadow:var(--shadow);text-align:left}
  .xspot b{display:block;font-size:16px}.xspot small{display:block;margin-top:3px;font-size:12px;color:var(--sub)}
  .xstop{position:relative;padding:14px 16px;border-radius:22px;background:var(--card);box-shadow:var(--shadow)}
  .xstop .num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:13px;font-size:13px;font-weight:700}
  .xstop h3{margin:8px 0 2px;font-size:17px}.xstop p{margin:2px 0;font-size:13px;color:var(--sub)}
  .xwalk{margin:6px 0 6px 28px;font-size:12px;color:var(--sub)}
  .xbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}`;
  document.head.appendChild(st);
})();

function xrng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function xdist(a, b) { const R = 6371000, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
function xtrack(ev, data) { // 가입 없는 익명 사용 기록. 서버를 붙이기 전까지는 이 브라우저에만 쌓여요.
  try { const k = 'datefit-x-events', a = JSON.parse(localStorage.getItem(k) || '[]'); a.push(Object.assign({ev, t: Date.now()}, data || {})); localStorage.setItem(k, JSON.stringify(a.slice(-500))); } catch (e) {}
}
async function xload() {
  if (X.idx || X.loading) return;
  X.loading = true;
  try {
    X.idx = await fetch(XR + 'index.json?v=' + XV).then(r => r.json());
    try { X.V = await fetch('data/verified.json?v=' + XV).then(r => r.ok ? r.json() : {}); } catch (e) { X.V = {}; }
  } catch (e) { X.err = '지역 목록을 불러오지 못했어요'; }
  X.loading = false; render(true);
  if (typeof S !== 'undefined' && S.sheet && S.sheet.kind === 'region') paintLayer();
}
async function xfile(fn) {
  if (X.files[fn]) return X.files[fn];
  if (X.files[fn] === undefined) {
    X.files[fn] = null;
    fetch(XR + encodeURIComponent(fn) + '?v=' + XV).then(r => r.json()).then(d => { X.files[fn] = d; render(true); }).catch(() => { delete X.files[fn]; toast('가게 정보를 불러오지 못했어요'); });
  }
  return null;
}
function xregion(fn) { return X.idx && X.idx.regions.find(r => r.file === fn); }
function xplace(d, p) { return {id: p[0], name: p[1], g: d.groups[p[2]], sub: d.subs[p[3]], dong: d.dongs[p[4]], addr: p[5], floor: p[6], ll: [p[7], p[8]], fr: !!p[9]}; }

/* 코스 짜기: 상권 중심 반경 안에서 시간대 틀에 맞춰, 앞 장소와 가까운 곳을 고름. 확인된 가게를 먼저. */
function xcourse(d, spot, time, seed, keepFr, noAlc) {
  const rnd = xrng(seed * 7919 + time.length), c = [spot.lat, spot.lon];
  let pool = d.p.map(p => xplace(d, p)).filter(p => p.g !== '숙박' && p.g !== '꽃집' && xdist(c, p.ll) <= 450);
  if (!keepFr) { const nf = pool.filter(p => !p.fr); if (nf.length >= 6) pool = nf; }
  const used = new Set(), stops = [];
  for (const slot of XT[time][1]) {
    const opt = slot.includes('-'), groups = slot.filter(g => g !== '-' && !(noAlc && g === '술'));
    if (!groups.length) continue;
    const prev = stops.length ? stops[stops.length - 1].ll : c;
    let cand = pool.filter(p => groups.includes(p.g) && !used.has(p.id));
    const near = cand.filter(p => xdist(prev, p.ll) <= (stops.length ? 350 : 250));
    if (near.length >= 2) cand = near;
    const nice = cand.filter(p => !XLOW.has(p.sub));
    if (nice.length >= 2 || (nice.length && rnd() < 0.8)) cand = nice;
    if (!cand.length) continue;
    if (opt && rnd() < 0.35) continue;
    const ver = cand.filter(p => X.V && X.V[p.id]);
    const pickFrom = ver.length && rnd() < 0.7 ? ver : cand;
    const p = pickFrom[Math.floor(rnd() * pickFrom.length)];
    used.add(p.id); stops.push(p);
  }
  return stops;
}
function xflowers(d, stops, max) {
  if (!stops.length) return [];
  return d.p.map(p => xplace(d, p)).filter(p => p.g === '꽃집')
    .map(p => Object.assign(p, {near: Math.min(...stops.map(s => xdist(s.ll, p.ll)))}))
    .filter(p => p.near <= 500).sort((a, b) => a.near - b.near).slice(0, max || 3);
}
function xbadge(p) {
  const v = X.V && X.V[p.id];
  if (v) return `<span class="tag ok">${ic('check', 13)}확인됨 ${esc((v.checked || '').slice(5).replace('-', '/'))}</span>`;
  return `<span class="tag warn">영업시간 확인!</span>`;
}
function xmaps(p) {
  const q = encodeURIComponent(p.name + ' ' + p.dong);
  return `<a class="chip sm" href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener" data-xact="out" data-v="kakao">${ic('pin', 15)}지도에서 보기</a><a class="textbtn" href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener" data-xact="out" data-v="naver">네이버지도</a>`;
}

/* 화면 1: 지역 고르기 */
function vExplore() {
  xload();
  if (!X.synced && typeof S !== 'undefined' && S.region) { X.sgg = S.region; X.sido = S.region.split('_')[0]; X.synced = true; }
  const sel = X.idx ? X.idx.regions.filter(r => r.sido === X.sido) : [];
  const cur = sel.find(r => r.file === X.sgg) || sel.find(r => /진주|김해|부산진|중구|포항|구미/.test(r.sgg)) || sel[0];
  if (cur) X.sgg = cur.file;
  return `<div class="pad">
  <header class="top"><span class="wordmark">경상권 코스</span><button class="iconbtn" data-xact="info" aria-label="데이터 안내">${ic('info', 20)}</button></header>
  <section class="hero" style="margin-top:8px"><h1 class="display" style="font-size:30px">어느 동네에서<br>만나요?</h1><p class="sub">경상권 ${X.idx ? X.idx.regions.length + '개 시군구, ' + X.idx.regions.reduce((a, r) => a + r.n, 0).toLocaleString() + '곳' : ''}에서 걸어서 이어지는 코스를 짜 드려요</p></section>
  <div class="scrollx" style="margin-top:14px">${XSIDO.map(s => `<button class="chip sm" data-xact="sido" data-v="${s}" aria-pressed="${X.sido === s}">${xshort(s)}</button>`).join('')}</div>
  ${X.err ? `<div class="empty">${esc(X.err)}</div>` : !X.idx ? `<div class="empty">지역 목록을 불러오는 중이에요</div>` : `
  <div class="scrollx" style="margin-top:8px">${sel.map(r => `<button class="chip sm" data-xact="sgg" data-v="${esc(r.file)}" aria-pressed="${cur && cur.file === r.file}">${esc(r.sgg)}</button>`).join('')}</div>
  <section class="sect"><h2>${esc(cur.sgg)} 데이트 상권</h2><p class="hint">카페·식당·놀거리가 걸어서 모여 있는 곳 순서예요</p>
  <div class="list">${cur.spots.map((s, i) => `<button class="xspot" data-go="x/${esc(cur.file)}/${i}/afternoon/1"><span class="grow"><b>${esc(s.nick || s.dong)}</b><small>${s.nick ? esc(s.dong) + ' · ' : ''}카페 ${s.cnt['카페']} · 식사 ${s.cnt['식사']} · 놀거리·체험 ${s.cnt['놀거리'] + s.cnt['체험']} · 술 ${s.cnt['술']}</small></span>${ic('arrow', 18)}</button>`).join('')}</div></section>`}
  <p class="note">가게 목록은 소상공인시장진흥공단 상가(상권)정보(2026년 9월 30일 기준)예요. 영업시간은 들어 있지 않아서, 팀이 직접 확인한 가게에만 "확인됨" 표시를 붙여요. 진주·김해 팀 추천 코스는 <a href="#courses" style="font-weight:700">코스</a> 탭에 있어요.</p>
  </div>${nav('explore')}`;
}

/* 화면 2: 자동 코스 */
function vXCourse(h) {
  xload();
  const [fn, si, time0, seed0, fl] = h.split('/').slice(1).map(decodeURIComponent);
  const noAlc = fl === 'na', sfx = noAlc ? '/na' : '';
  const time = XT[time0] ? time0 : 'afternoon', seed = Math.max(1, parseInt(seed0) || 1);
  const reg = xregion(fn);
  if (!X.idx) return `<div class="pad"><div class="empty">불러오는 중이에요</div></div>`;
  if (!reg || !reg.spots[+si]) return `<div class="pad"><header class="top"><a class="iconbtn" href="#explore">${ic('back', 20)}</a></header><div class="empty">이 코스를 찾지 못했어요</div></div>`;
  const spot = reg.spots[+si], d = X.files[fn] || null;
  if (!d) { xfile(fn); return `<div class="pad"><header class="top"><a class="iconbtn" href="#explore" aria-label="뒤로">${ic('back', 20)}</a></header><div class="empty">${esc(reg.sgg)} 가게 정보를 불러오는 중이에요</div></div>`; }
  const stops = xcourse(d, spot, time, seed, false, noAlc);
  const base = `x/${encodeURIComponent(fn)}/${si}`;
  const unchecked = stops.filter(p => !(X.V && X.V[p.id])).length;
  X.last = {reg, spot, time, seed, stops, hash: '#' + base + '/' + time + '/' + seed + sfx};
  if (X.lastTracked !== X.last.hash) { X.lastTracked = X.last.hash; xtrack('course', {fn, si: +si, time, seed, n: stops.length}); }
  let prev = null;
  return `<div class="pad">
  <header class="top"><a class="iconbtn" href="#explore" aria-label="지역 고르기로">${ic('back', 20)}</a><span class="tag plain">${esc(xshort(reg.sido))} ${esc(reg.sgg)}</span></header>
  <h1 class="display" style="font-size:28px;margin-top:14px">${esc(spot.nick || spot.dong)}에서<br>${XT[time][0]} 데이트</h1>${noAlc ? '<p class="sub" style="margin-top:6px">술 없이 짠 코스예요</p>' : ''}
  <div class="chips" style="margin-top:12px">${Object.entries(XT).map(([k, v]) => `<a class="chip sm" href="#${base}/${k}/${seed}${sfx}" aria-pressed="${k === time}">${v[0]}</a>`).join('')}</div>
  ${unchecked ? `<div class="box warn"><b>영업시간 확인!</b> 이 코스의 ${unchecked}곳은 팀이 아직 영업시간을 확인하지 못했어요. 가기 전에 카카오맵이나 네이버지도에서 꼭 확인해 주세요.</div>` : ''}
  ${stops.length < 2 ? `<div class="empty">이 동네에서는 ${XT[time][0]} 코스를 짜기 어려워요. 다른 시간대나 상권을 골라 보세요.</div>` : `<div class="list">${stops.map((p, i) => {
    const w = prev ? Math.round(xdist(prev.ll, p.ll)) : null; prev = p;
    return `${w !== null ? `<p class="xwalk">${ic('foot', 14)} 직선 ${w}m · 걸어서 약 ${Math.max(1, Math.round(w * 1.3 / 67))}분</p>` : ''}<article class="xstop">
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="num" style="background:${XGC[p.g]}">${i + 1}</span><span class="tag" style="background:${XGC[p.g]}">${ic(XGI[p.g], 13)}${esc(p.g)}</span>${xbadge(p)}${p.fr ? '<span class="tag plain">체인점 추정</span>' : ''}</div>
      <h3>${esc(p.name)}</h3><p>${esc(p.sub)} · ${esc(p.dong)}${p.floor ? ' · ' + esc(p.floor) + '층' : ''}</p><p>${esc(p.addr)}</p>
      ${X.V && X.V[p.id] && X.V[p.id].hours ? `<p style="color:var(--ink)">${esc(X.V[p.id].hours)}</p>` : ''}
      <div class="xbtns" style="align-items:center">${xmaps(p)}<button class="textbtn" style="margin-left:auto" data-xact="report" data-v="${esc(p.id)}" data-n="${esc(p.name)}">문 닫았어요</button></div></article>`;
  }).join('')}</div>`}
  ${(() => { const fl = xflowers(d, stops, 5); if (!fl.length) return ''; const open = (S.folds || {}).xfl;
    return `<div style="margin-top:14px">${open ? `<section class="box info" style="margin-top:0"><b>꽃·선물</b> 코스 장소에서 가까운 꽃집이에요
      <div style="margin-top:8px">${fl.map(p => `<div class="row" style="gap:8px;padding:8px 0;border-top:1px solid var(--line)"><span class="grow" style="min-width:0"><b style="font-size:14px">${esc(p.name)}</b><br><small style="color:var(--sub)">${esc(p.dong)} · 코스에서 약 ${Math.round(p.near)}m</small></span><a class="textbtn" href="https://map.kakao.com/?q=${encodeURIComponent(p.name + ' ' + p.dong)}" target="_blank" rel="noopener" data-xact="out" data-v="kakao-flower">지도</a></div>`).join('')}</div>
      <button class="textbtn" data-act="fold" data-k="xfl">접기</button></section>` : `<button class="textbtn" data-act="fold" data-k="xfl">${ic('star', 14)}근처 꽃·선물 가게 찾기 (${fl.length}곳)</button>`}</div>`; })()}
  <div class="row" style="gap:8px;margin-top:16px"><a class="cta ghost" href="#${base}/${time}/${seed + 1}${sfx}" style="flex:1">다른 코스</a><button class="cta" data-xact="share" style="flex:1.4">${ic('share', 18)}애인에게 보내기</button></div>
  <p class="note">거리는 직선거리로 잰 어림값이에요. 가게 정보는 공공데이터(2026년 9월 30일 기준)라 폐업·이전한 곳이 섞여 있을 수 있어요. 발견하면 "문 닫았어요"를 눌러 알려 주세요.</p>
  </div>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-xact]'); if (!b) return;
  const a = b.dataset.xact, v = b.dataset.v;
  if (a === 'sido') { X.sido = v; X.sgg = null; render(true); return; }
  if (a === 'sgg') { X.sgg = v; xsetRegion(v); render(true); xtrack('sgg', {fn: v}); return; }
  if (a === 'region') { xload(); X.pickSido = (S.region || '').split('_')[0] || '경상남도'; S.sheet = {kind: 'region'}; paintLayer(); return; }
  if (a === 'rsido') { X.pickSido = v; paintLayer(); return; }
  if (a === 'rpick') { xsetRegion(v); X.sgg = v; X.sido = v.split('_')[0]; S.sheet = null; paintLayer(); render(true); toast(S.city + '(으)로 바꿨어요'); xtrack('region', {fn: v}); return; }
  if (a === 'out') { xtrack('map', {to: v, h: location.hash}); return; }
  if (a === 'info') { S.sheet = {kind: 'xinfo'}; xsheet(); return; }
  if (a === 'report') {
    xtrack('report', {id: v});
    const text = `[데이트핏 휴무 신고] ${b.dataset.n} (${v}) · ${new Date().toLocaleDateString('ko-KR')}`;
    if (REPORT_URL) { window.open(REPORT_URL, '_blank', 'noopener'); }
    try { navigator.clipboard.writeText(text).then(() => toast('신고 내용을 복사했어요. 팀 인스타 DM으로 보내 주세요'), () => toast('고마워요! 팀 인스타 DM으로 가게 이름을 알려 주세요')); } catch (err) { toast('고마워요! 팀 인스타 DM으로 가게 이름을 알려 주세요'); }
    return;
  }
  if (a === 'share') {
    const L = X.last; if (!L) return;
    const url = location.origin + location.pathname + L.hash;
    const text = `${L.spot.nick || L.spot.dong}에서 ${XT[L.time][0]} 데이트 어때?\n` + L.stops.map((p, i) => `${i + 1}. ${p.name} (${p.g})`).join('\n') + `\n\n코스 보기: ${url}`;
    xtrack('share', {h: L.hash});
    if (navigator.share) { navigator.share({title: '데이트핏 코스', text}).catch(() => {}); return; }
    try { navigator.clipboard.writeText(text).then(() => toast('코스를 복사했어요. 카톡에 붙여 넣으면 돼요'), () => toast('복사하지 못했어요')); } catch (err) { toast('복사하지 못했어요'); }
    return;
  }
});
function xsheet() {
  const lay = document.getElementById('layer');
  lay.innerHTML = `<div class="scrim" data-act="close-scrim"><div class="sheet" role="dialog" aria-modal="true"><h2>경상권 코스 데이터 안내</h2><ul>
  <li>가게 목록: 소상공인시장진흥공단 상가(상권)정보, 2026년 9월 30일 기준(공공데이터포털). 영업 중인 가게의 이름·업종·주소·좌표만 있어요.</li>
  <li>영업시간은 공공데이터에 없어요. 팀이 전화·방문으로 확인한 가게만 "확인됨 날짜"를 붙이고, 나머지는 "영업시간 확인!"을 표시해요.</li>
  <li>체인점으로 보이는 곳(경상권에 같은 이름이 15곳 이상)은 되도록 빼고 코스를 짜요.</li>
  <li>휴대폰 위치는 쓰지 않아요. 지도는 카카오맵·네이버지도 검색으로 연결해요.</li>
  <li>가게에서 돈을 받지 않아요. 추천 순서는 광고로 바뀌지 않아요.</li></ul>
  <div style="margin-top:18px"><button class="cta" data-act="close">알겠어요</button></div></div></div>`;
}


/* ---------- 앱 전체 지역(경상권 75개 시군구) ---------- */
function xsetRegion(fn) {
  const r = xregion(fn) || {sgg: fn.replace('.json', '').split('_').slice(1).join(' ')};
  S.region = fn;
  S.city = r.sgg === '진주시' ? '진주' : r.sgg === '김해시' ? '김해' : r.sgg;
  S.type = 'all'; save();
}
function xRegionSheet() {
  const sido = X.pickSido || '경상남도';
  const list = X.idx ? X.idx.regions.filter(r => r.sido === sido) : [];
  return `<div class="scrim" data-act="close-scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="지역 고르기"><h2>어느 지역이에요?</h2>
  <div class="scrollx" style="margin-top:6px">${XSIDO.map(x => `<button class="chip sm" data-xact="rsido" data-v="${x}" aria-pressed="${x === sido}">${xshort(x)}</button>`).join('')}</div>
  ${!X.idx ? '<p class="sub" style="margin-top:14px">지역 목록을 불러오는 중이에요</p>' : `<div class="chips" style="margin-top:12px;max-height:46vh;overflow:auto">${list.map(r => `<button class="chip sm" data-xact="rpick" data-v="${esc(r.file)}" aria-pressed="${S.region === r.file}">${esc(r.sgg)}${/진주시|김해시/.test(r.sgg) ? ' ★' : ''}</button>`).join('')}</div>`}
  <p class="hint" style="margin-top:10px">★ 팀이 직접 고른 코스도 있는 지역이에요</p>
  <div style="margin-top:14px"><button class="cta quiet" data-act="close">닫기</button></div></div></div>`;
}
function xTimeKey() { const t = S.cond.time; return t === 'lunch' ? 'lunch' : t === 'evening' ? 'evening' : 'afternoon'; }
function xAutoSection(max) {
  xload();
  const reg = X.idx && xregion(S.region);
  if (!X.idx) return `<section class="sect"><h2>상권 코스</h2><div class="empty">불러오는 중이에요</div></section>`;
  if (!reg) return '';
  const d = X.files[reg.file] || null; if (!d) xfile(reg.file);
  const time = xTimeKey(), noAlc = S.cond.alc === 'none', sfx = noAlc ? '/na' : '';
  const cards = reg.spots.slice(0, max).map((sp, i) => {
    const prev = d ? xcourse(d, sp, time, 1, false, noAlc) : null;
    return `<a class="xspot" href="#x/${encodeURIComponent(reg.file)}/${i}/${time}/1${sfx}" style="text-decoration:none;color:inherit"><span class="grow"><b>${esc(sp.nick || sp.dong)}</b><small>${prev ? prev.map(p => esc(p.name)).join(' → ') : `카페 ${sp.cnt['카페']} · 식사 ${sp.cnt['식사']} · 놀거리·체험 ${sp.cnt['놀거리'] + sp.cnt['체험']}`}</small></span>${ic('arrow', 18)}</a>`;
  }).join('');
  return `<section class="sect"><h2>${esc(reg.sgg)} 상권 코스</h2><p class="hint">${XT[time][0]}${noAlc ? ' · 술 없이' : ''} · 공공데이터로 자동으로 짠 도보 코스예요. 영업시간은 가기 전에 확인해 주세요</p><div class="list">${cards}</div></section>`;
}
